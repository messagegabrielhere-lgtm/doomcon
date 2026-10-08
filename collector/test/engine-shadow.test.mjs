// The official index must not move by a byte because of the shadow or the
// health fields. Proved against a frozen copy of engine v1.0.0
// (fixtures/engine-baseline.mjs) on the repo's real reference, history and
// newest raw snapshot, plus a synthetic one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

import * as baseline from './fixtures/engine-baseline.mjs';
import { runEngine, weightShares, healthFor, hourlyCronMinute, mergeReference, addendaHash, levelFor, readSchedule } from '../engine.mjs';
import { canonicalJson } from '../receipts.mjs';
import { buildStockanalysisAddendum, dayRange, addendaHash as calibrateHash } from '../calibrate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const readJson = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

function realInputs() {
  const rawDir = join(ROOT, 'data', 'raw');
  const files = readdirSync(rawDir).filter((f) => f.endsWith('.json')).sort();
  const raw = JSON.parse(readFileSync(join(rawDir, files[files.length - 1]), 'utf8'));
  const reference = readJson('data/reference.json');
  const history = readFileSync(join(ROOT, 'data', 'history.ndjson'), 'utf8')
    .split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l))
    .filter((h) => h.t < raw.generated_at);
  const previousState = readJson('data/state.json');
  const prevReceipt = { hash: 'sha256:' + 'ab'.repeat(32) };
  return { raw, reference, history, previousState, prevReceipt, nowIso: raw.generated_at };
}

function syntheticInputs() {
  // compute pillar: sec-fts dark (calibrated), stockanalysis uncalibrated in v1.
  const reference = readJson('data/reference.json');
  const raw = {
    generated_at: '2026-10-08T03:15:00.000Z',
    readings: [
      { source: 'arxiv', pillar: 'capability', ok: true, value: 3000, unit: 'papers/7d' },
      { source: 'sec-fts', pillar: 'compute', ok: false, error: 'HTTP 403', value: null },
      { source: 'stockanalysis', pillar: 'compute', ok: true, value: 2.1, unit: 'mean_abs_percent_change' },
      { source: 'hn', pillar: 'attention', ok: true, value: 1200, unit: 'points/24h' },
      { source: 'wikipedia', pillar: 'attention', ok: true, value: 110000, unit: 'pageviews/day' },
      { source: 'federal-register', pillar: 'governance', ok: true, value: 30, unit: 'documents/30d' },
      { source: 'polymarket', pillar: 'markets', ok: true, value: 0.02, unit: 'prob_points/day' },
    ],
  };
  return { raw, reference, history: [], previousState: { level: 4, level_since: '2026-09-23T20:04:22.390Z' }, prevReceipt: null, nowIso: raw.generated_at };
}

// A synthetic addendum for stockanalysis: 2 years of deterministic closes.
function syntheticAddenda(reference) {
  const days = dayRange('2024-10-01', '2026-10-07');
  const bars = {};
  ['NVDA', 'AMD', 'TSM', 'AVGO'].forEach((t, k) => {
    let c = 100 + k * 10;
    bars[t] = [];
    days.forEach((d, i) => {
      const dow = new Date(`${d}T00:00:00Z`).getUTCDay();
      if (dow === 0 || dow === 6) return;
      c = c * (1 + (((i * 7 + k * 13) % 11) - 5) / 250);
      bars[t].push({ date: d, close: c });
    });
  });
  const window = dayRange('2025-10-08', '2026-10-07');
  const entry = buildStockanalysisAddendum(bars, window);
  const file = {
    schema: 1, kind: 'reference-addenda', shadow: true, addendum_version: '1.0.0', built_at: '2026-10-08T00:00:00.000Z',
    base_reference: { hash: 'sha256:' + createHash('sha256').update(canonicalJson(reference), 'utf8').digest('hex') },
    sources: { stockanalysis: { ...entry, addendum_version: '1.0.0', built_at: '2026-10-08T00:00:00.000Z' } },
    unavailable: [],
  };
  file.hash = calibrateHash(file);
  return file;
}

const OFFICIAL_STATE_KEYS = [
  'schema', 'generated_at', 'score', 'level', 'level_name', 'previous_level', 'level_since',
  'delta_from_previous', 'degraded', 'dark_pillars', 'uncalibrated_pillars', 'uncalibrated_sources',
  'failed_sources', 'post_suppressed', 'genesis_under_degradation', 'rule_fired', 'sources',
  'engine_version', 'receipt_id', 'prev_receipt_hash',
];

function assertOfficialUnchanged(inputs, extra) {
  const a = baseline.runEngine(inputs);
  const b = runEngine({ ...inputs, ...extra });
  assert.equal(canonicalJson(b.receiptBody), canonicalJson(a.receiptBody), 'receipt body changed');
  assert.equal(JSON.stringify(b.historyLine), JSON.stringify(a.historyLine), 'history line changed');
  for (const k of OFFICIAL_STATE_KEYS) {
    assert.equal(JSON.stringify(b.state[k]), JSON.stringify(a.state[k]), `state.${k} changed`);
  }
  // Pillars: every original field identical; only additive fields appear.
  a.state.pillars.forEach((p, i) => {
    for (const [k, v] of Object.entries(p)) assert.deepEqual(b.state.pillars[i][k], v, `pillar ${p.id}.${k} changed`);
  });
  return { a, b };
}

test('without addenda: receipt, history line and official state are byte-identical to engine v1.0.0', () => {
  for (const inputs of [realInputs(), syntheticInputs()]) {
    const { b } = assertOfficialUnchanged(inputs, {});
    assert.equal(b.state.shadow, undefined, 'no shadow without an addenda file');
    assert.ok(b.state.health, 'health is present');
  }
});

test('with addenda: official fields still identical, shadow is computed alongside', () => {
  for (const inputs of [realInputs(), syntheticInputs()]) {
    const addenda = syntheticAddenda(inputs.reference);
    const before = canonicalJson(inputs.reference);
    const { b } = assertOfficialUnchanged(inputs, { addenda });
    assert.equal(canonicalJson(inputs.reference), before, 'v1 reference object was mutated');
    const sh = b.state.shadow;
    assert.equal(sh.reference, 'v1+addenda');
    assert.equal(sh.addenda_hash, addenda.hash);
    assert.deepEqual(sh.addenda_sources, ['stockanalysis']);
    assert.equal(sh.level_estimate, levelFor(sh.score));
    assert.equal(sh.pillars.length, 5);
    for (const p of sh.pillars) assert.deepEqual(Object.keys(p).slice(0, 3), ['id', 'score', 'dark']);
    assert.ok(typeof sh.note === 'string' && sh.note.includes('SHADOW'));
  }
});

test('synthetic: shadow lights the compute pillar the official index reports dark', () => {
  const inputs = syntheticInputs();
  const { b } = assertOfficialUnchanged(inputs, { addenda: syntheticAddenda(inputs.reference) });
  assert.ok(b.state.dark_pillars.includes('compute'));
  assert.equal(b.state.rule_fired, 'frozen_dark_pillar');
  const compute = b.state.shadow.pillars.find((p) => p.id === 'compute');
  assert.equal(compute.dark, false);
  assert.ok(Number.isFinite(compute.score));
  assert.ok(!b.state.shadow.dark_pillars.includes('compute'));
  assert.equal(b.state.shadow.series[0].t, inputs.nowIso);
  assert.ok(Number.isFinite(b.state.shadow.series[0].sources.stockanalysis));
});

test('shadow series feeds the next run\'s NowCast for addenda sources', () => {
  const inputs = syntheticInputs();
  const addenda = syntheticAddenda(inputs.reference);
  const first = runEngine({ ...inputs, addenda });
  const hist = [first.historyLine];
  const raw2 = { ...inputs.raw, generated_at: '2026-10-08T04:15:00.000Z' };
  const second = runEngine({ ...inputs, raw: raw2, nowIso: raw2.generated_at, history: hist, previousState: first.state, addenda });
  assert.equal(second.state.shadow.series.length, 2);
  assert.equal(second.state.shadow.series[1].t, inputs.nowIso);
});

test('tampered addenda disables the shadow, never the index', () => {
  const inputs = syntheticInputs();
  const addenda = syntheticAddenda(inputs.reference);
  addenda.sources.stockanalysis.quantiles[50] += 1;
  const { b } = assertOfficialUnchanged(inputs, { addenda });
  assert.match(b.state.shadow.error, /addenda_hash_mismatch/);
  assert.equal(b.state.shadow.score, null);
});

test('addenda can never override a v1 source', () => {
  const reference = readJson('data/reference.json');
  const fake = { sources: { hn: { quantiles: [0, 1], n: 2 }, 'wikimedia': { quantiles: [0, 1], n: 2 }, newsrc: { quantiles: [0, 1], n: 2 } } };
  const { merged, added } = mergeReference(reference, fake);
  assert.deepEqual(added, ['newsrc']);
  assert.equal(merged.sources.hn, reference.sources.hn);
  assert.equal(addendaHash({ a: 1, hash: 'x' }), addendaHash({ a: 1 }));
});

test('weight shares mirror composite(): 0.7/k each plus 0.3 to the max, dark pillars carry nothing', () => {
  const pillars = [
    { id: 'a', score: 70, dark: false }, { id: 'b', score: null, dark: true },
    { id: 'c', score: 40, dark: false }, { id: 'd', score: 50, dark: false }, { id: 'e', score: null, dark: false, uncalibrated: true },
  ];
  const w = weightShares(pillars);
  assert.deepEqual(w.get('b'), { in_composite: false, weight_share: 0 });
  assert.equal(w.get('a').weight_share, 0.533333);
  assert.equal(w.get('c').weight_share, 0.233333);
  assert.equal(w.get('e').in_composite, false); // an unscored pillar is excluded (fixed 2026-10-08)
  const total = [...w.values()].reduce((s, x) => s + x.weight_share, 0);
  assert.ok(Math.abs(total - 1) < 1e-5);
  // Tie on the max splits the 0.3.
  const t = weightShares([{ id: 'x', score: 60, dark: false }, { id: 'y', score: 60, dark: false }]);
  assert.equal(t.get('x').weight_share, 0.5);
});

test('health: counts and next expected run from the hourly cron', () => {
  assert.equal(hourlyCronMinute('7 * * * *'), 7);
  assert.equal(hourlyCronMinute('*/15 * * * *'), null);
  assert.deepEqual(readSchedule(join(ROOT, '.github', 'workflows', 'collect.yml')), { cron: '7 * * * *' });
  const nowMs = Date.parse('2026-10-08T02:22:49Z');
  const history = ['2026-10-07T23:19:00Z', '2026-10-08T00:21:00Z', '2026-10-08T01:23:00Z'].map((t) => ({ t }));
  const h = healthFor({
    pillars: [{ score: 1, uncalibrated: false }, { score: null, uncalibrated: true }],
    sources: [{ ok: true }, { ok: false, uncalibrated: true, value: 3 }, { ok: false, uncalibrated: false, value: null }],
    darkPillars: [], history, nowMs, schedule: { cron: '7 * * * *' },
  });
  assert.equal(h.pillars_live, 1);
  assert.equal(h.sources_scored, 1);
  assert.equal(h.sources_reporting, 2);
  assert.equal(h.sources_failed, 1);
  assert.equal(h.sources_total, 3);
  assert.equal(h.typical_lag_minutes, 14.9); // median of 12, 14, 16, 15.82
  assert.equal(h.expected_next_run_utc, '2026-10-08T03:21:54.000Z');
});
