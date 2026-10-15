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

test('collect.yml job budgets leave room for findability-tree builds (FINDABILITY #83/#86/#93)', () => {
  // Old ceilings (newsroom 10m / full 40m, then 45m / 90m) cancelled mid-Build
  // before Publish; rebuild alone hit ~44m under the 45m newsroom budget
  // (run 38662474296). Floors track the raised budgets.
  const yml = readFileSync(join(ROOT, '.github', 'workflows', 'collect.yml'), 'utf8');
  const news = yml.match(/name:\s*newsroom[\s\S]*?timeout-minutes:\s*(\d+)/);
  const full = yml.match(/name:\s*full index pass[\s\S]*?timeout-minutes:\s*(\d+)/);
  assert.ok(news, 'newsroom timeout-minutes missing');
  assert.ok(full, 'full index pass timeout-minutes missing');
  assert.ok(Number(news[1]) >= 75, `newsroom timeout ${news[1]}m < 75m`);
  assert.ok(Number(full[1]) >= 120, `full timeout ${full[1]}m < 120m`);
});

test('collect.yml newsroom rebuild prefers --only news (FINDABILITY #94)', () => {
  // Full wipe with no public/ on main was the 44m cancel; newsroom must seed
  // from gh-pages and patch with --only news (news-fast.yml already does).
  const yml = readFileSync(join(ROOT, '.github', 'workflows', 'collect.yml'), 'utf8');
  const newsroom = yml.match(/name:\s*newsroom[\s\S]*?(?=\n  [a-z-]+:|$)/);
  assert.ok(newsroom, 'newsroom job missing');
  assert.match(newsroom[0], /build\.mjs --only news/);
  assert.match(newsroom[0], /seeding public\/ from gh-pages/);
});

test('collect.yml newsroom skips cards on news-only and refuses full wipe fallback (FINDABILITY #100)', () => {
  // Historical news-only jobs finished in ~2m; run 38672483978 sat in Rebuild
  // past 15m while news-stale hit 8h — cards/posts belong on the hourly full
  // pass, and an unbounded full wipe fallback must not re-block Publish.
  const yml = readFileSync(join(ROOT, '.github', 'workflows', 'collect.yml'), 'utf8');
  const newsroom = yml.match(/name:\s*newsroom[\s\S]*?(?=\n  [a-z-]+:|$)/);
  assert.ok(newsroom, 'newsroom job missing');
  assert.match(newsroom[0], /timeout 900 node site\/build\.mjs --only news/);
  assert.match(newsroom[0], /skipping card\/posts/);
  assert.match(newsroom[0], /refusing full wipe fallback/);
  assert.doesNotMatch(newsroom[0], /falling back to full build/);
});

test('collect.yml compliance gates raise Node heap for seeded public/ (FINDABILITY #101)', () => {
  // Run 38672483978: audit.mjs OOM at ~4GB (exit 134) after news-only seed,
  // so Publish/IndexNow were skipped while main held fresh news.
  const yml = readFileSync(join(ROOT, '.github', 'workflows', 'collect.yml'), 'utf8');
  const heaps = [...yml.matchAll(/NODE_OPTIONS:\s*--max-old-space-size=(\d+)/g)].map((m) => Number(m[1]));
  assert.ok(heaps.length >= 2, `expected ≥2 compliance heap floors, got ${heaps.length}`);
  assert.ok(heaps.every((n) => n >= 8192), `heap floors too low: ${heaps}`);
});

test('collect.yml full-pass Build site raises Node heap (FINDABILITY #104)', () => {
  // Run 38676940859 sat in Build site ~75m+ on default heap while the full
  // tree (item-archive 5000 + facets) rewrote; raise the floor so hourly
  // Publish can finish inside the 120m job budget.
  const yml = readFileSync(join(ROOT, '.github', 'workflows', 'collect.yml'), 'utf8');
  const full = yml.match(/name:\s*full index pass[\s\S]*?(?=\n  [a-z-]+:|$)/);
  assert.ok(full, 'full index pass job missing');
  const build = full[0].match(/name:\s*Build site[\s\S]*?\n        run:/);
  assert.ok(build, 'Build site step missing');
  assert.match(build[0], /NODE_OPTIONS:\s*--max-old-space-size=8192/);
  assert.match(yml, /NODE_OPTIONS=--max-old-space-size=8192 timeout 900 node site\/build\.mjs --only news/);
});

test('collect.yml full-pass Build seeds public/ for incremental full build (FINDABILITY #105)', () => {
  // Without a seed, build.mjs wipes public/ and rewrites ~5000 archive item
  // pages every hour — run 38676940859 sat in Build ~85m and missed Publish.
  const yml = readFileSync(join(ROOT, '.github', 'workflows', 'collect.yml'), 'utf8');
  const full = yml.match(/name:\s*full index pass[\s\S]*?(?=\n  [a-z-]+:|$)/);
  assert.ok(full, 'full index pass job missing');
  assert.match(full[0], /seeding public\/ from gh-pages for incremental full build/);
  assert.match(full[0], /FINDABILITY #105/);
  const src = readFileSync(join(ROOT, 'site', 'build.mjs'), 'utf8');
  assert.match(src, /incremental full build \(keeping public\/; FINDABILITY #105\)/);
  assert.match(src, /archiveSkipped/);
});

test('news-fast overlay publishes news-sitemap + sitemap + robots (FINDABILITY #96)', () => {
  // Overlay path used to copy api/news.json + news.html but skip the crawl
  // surfaces --only news rewrites — Google News kept reading a stale
  // news-sitemap while the HTML room looked fresh.
  const yml = readFileSync(join(ROOT, '.github', 'workflows', 'news-fast.yml'), 'utf8');
  const overlay = yml.match(/for rel in ([^\n]+)/);
  assert.ok(overlay, 'news-fast overlay file list missing');
  const list = overlay[1];
  assert.match(list, /news-sitemap\.xml/);
  assert.match(list, /\bsitemap\.xml\b/);
  assert.match(list, /\brobots\.txt\b/);
  // FINDABILITY #116 — agent maps advertise conquest short aliases.
  assert.match(list, /\bllms\.txt\b/);
  assert.match(list, /\bagents\.md\b/);
  assert.match(list, /\bagents\.txt\b/);
});

test('news-fast seeds public/ from gh-pages before --only news (FINDABILITY #98)', () => {
  // Without a seed, build.mjs --only news falls through to a full wipe when
  // public/index.html is missing — measured ~58m cancel on tick 1 with zero
  // publishes (run 38666831944), leaving news-sitemap stale for hours.
  const yml = readFileSync(join(ROOT, '.github', 'workflows', 'news-fast.yml'), 'utf8');
  assert.match(yml, /seeding public\/ from gh-pages for news-only builds/);
  assert.match(yml, /git clone --depth 1 --branch gh-pages/);
  assert.match(yml, /build\.mjs --only news/);
});

test('news-fast refuses full wipe fallback on news-only failure (FINDABILITY #99)', () => {
  // The old `trying full build` path is what burned 58m with zero publishes.
  const yml = readFileSync(join(ROOT, '.github', 'workflows', 'news-fast.yml'), 'utf8');
  assert.doesNotMatch(yml, /trying full build/);
  assert.match(yml, /timeout 900 node site\/build\.mjs --only news/);
  assert.match(yml, /skipping full wipe fallback/);
});

test('news-fast throttles Pages publish cadence (FINDABILITY #112/#117)', () => {
  // 2026-10-15: after #106/#107 news-fast published every tick; GitHub Pages
  // returned duration:0 "Page build failed" for ~20 consecutive pushes and
  // froze the live CDN (last built 07:41Z) so overlays like #111 never served.
  const yml = readFileSync(join(ROOT, '.github', 'workflows', 'news-fast.yml'), 'utf8');
  assert.match(yml, /FINDABILITY #112/);
  assert.match(yml, /PUBLISH_MIN_GAP=600/);
  assert.match(yml, /PENDING_PUB/);
  assert.match(yml, /deferring Pages publish/);
});

test('news-fast seeds LAST_PAGES_PUB from gh-pages tip (FINDABILITY #118)', () => {
  // LAST_PAGES_PUB=0 made AGO ≈ epoch so every newly armed job published on
  // tick 1 and raced collect / prior tip (Pages errored again ~09:00Z).
  const yml = readFileSync(join(ROOT, '.github', 'workflows', 'news-fast.yml'), 'utf8');
  assert.match(yml, /FINDABILITY #118/);
  assert.match(yml, /refresh_last_pages_pub/);
  assert.match(yml, /LAST_PAGES_PUB seeded from gh-pages tip/);
  assert.match(yml, /commits\/gh-pages/);
  assert.match(yml, /log -1 --format=%ct/);
});

test('collect + news-fast pass Bing Webmaster verification secret (FINDABILITY #120)', () => {
  const collect = readFileSync(join(ROOT, '.github', 'workflows', 'collect.yml'), 'utf8');
  const newsFast = readFileSync(join(ROOT, '.github', 'workflows', 'news-fast.yml'), 'utf8');
  assert.match(collect, /BING_SITE_VERIFICATION: \$\{\{ secrets\.BING_SITE_VERIFICATION \}\}/);
  assert.match(newsFast, /BING_SITE_VERIFICATION: \$\{\{ secrets\.BING_SITE_VERIFICATION \}\}/);
  assert.match(newsFast, /FINDABILITY #120/);
});

test('vs-alias-guard workflow restores missing short aliases (FINDABILITY #117)', () => {
  const yml = readFileSync(join(ROOT, '.github', 'workflows', 'vs-alias-guard.yml'), 'utf8');
  assert.match(yml, /FINDABILITY #117/);
  assert.match(yml, /vs\/doom\.html/);
  assert.match(yml, /vs\/skynet\.html/);
  assert.match(yml, /vs\/takeoff\.html/);
  assert.match(yml, /cron:/);
  assert.match(yml, /contents: write/);
});

test('vs-alias-guard restores /trends + Outrank directory indexes (FINDABILITY #124)', () => {
  const yml = readFileSync(join(ROOT, '.github', 'workflows', 'vs-alias-guard.yml'), 'utf8');
  assert.match(yml, /FINDABILITY #124/);
  assert.match(yml, /trends\.html/);
  assert.match(yml, /restore_dir search-trends\.html trends/);
  assert.match(yml, /restore_dir verify\.html verify/);
  assert.match(yml, /restore_dir free-tools\.html free-tools/);
});

test('news-fast restores vs short aliases on publish (FINDABILITY #114)', () => {
  // Orphan newsroom publish wiped /vs/skynet.html (and #113 aliases) from tip
  // within minutes because --only news public/ lacks those files.
  const yml = readFileSync(join(ROOT, '.github', 'workflows', 'news-fast.yml'), 'utf8');
  assert.match(yml, /FINDABILITY #114/);
  assert.match(yml, /restore_vs_aliases/);
  assert.match(yml, /vs\/skynet\.html/);
  assert.match(yml, /vs\/doom\.html/);
  assert.match(yml, /vs\/takeoff\.html/);
  // Called on both overlay and orphan paths.
  const calls = yml.match(/restore_vs_aliases \.pages/g) || [];
  assert.ok(calls.length >= 2, `expected ≥2 restore_vs_aliases calls, got ${calls.length}`);
});

test('news-fast restores /trends + Outrank dir indexes (FINDABILITY #124)', () => {
  const yml = readFileSync(join(ROOT, '.github', 'workflows', 'news-fast.yml'), 'utf8');
  assert.match(yml, /FINDABILITY #124/);
  assert.match(yml, /trends\.html/);
  assert.match(yml, /verify\/index\.html/);
  assert.match(yml, /free-tools\/index\.html/);
});

test('collect.yml Publish restores vs short aliases (FINDABILITY #115)', () => {
  // collect orphan Publish tars public/ the same way news-fast orphan did —
  // news-only rebuilds omit /vs/doom.html etc. and would wipe tip.
  const yml = readFileSync(join(ROOT, '.github', 'workflows', 'collect.yml'), 'utf8');
  assert.match(yml, /FINDABILITY #115/);
  assert.match(yml, /vs\/skynet\.html/);
  assert.match(yml, /vs\/doom\.html/);
  assert.match(yml, /vs\/takeoff\.html/);
  const copies = yml.match(/cp -a \.pages\/vs\/skynet-countdown\.html \.pages\/vs\/skynet\.html/g) || [];
  assert.ok(copies.length >= 2, `expected restore on newsroom + full Publish, got ${copies.length}`);
});

test('collect.yml Publish restores /trends + Outrank dir indexes (FINDABILITY #124)', () => {
  const yml = readFileSync(join(ROOT, '.github', 'workflows', 'collect.yml'), 'utf8');
  assert.match(yml, /FINDABILITY #124/);
  const trends = yml.match(/cp -a \.pages\/search-trends\.html \.pages\/trends\.html/g) || [];
  assert.ok(trends.length >= 2, `expected trends restore on newsroom + full Publish, got ${trends.length}`);
  const verify = yml.match(/cp -a \.pages\/verify\.html \.pages\/verify\/index\.html/g) || [];
  assert.ok(verify.length >= 2, `expected verify/ restore on both Publish paths, got ${verify.length}`);
});

test('build emits /trends.html alias + directory indexes (FINDABILITY #124)', () => {
  const src = readFileSync(join(ROOT, 'site', 'build.mjs'), 'utf8');
  assert.match(src, /FINDABILITY #124/);
  assert.match(src, /trends\.html/);
  assert.match(src, /'verify', 'free-tools', 'search-trends', 'ai-prediction-markets', 'trends'/);
});

test('build emits /pdoom.html typed-guess alias (FINDABILITY #129)', () => {
  const src = readFileSync(join(ROOT, 'site', 'build.mjs'), 'utf8');
  assert.match(src, /FINDABILITY #129/);
  assert.match(src, /pdoom\.html/);
  assert.match(src, /'p-doom', 'pdoom'/);
  const guard = readFileSync(join(ROOT, '.github', 'workflows', 'vs-alias-guard.yml'), 'utf8');
  assert.match(guard, /FINDABILITY #129/);
  assert.match(guard, /restore_one p-doom\.html pdoom\.html/);
  const newsFast = readFileSync(join(ROOT, '.github', 'workflows', 'news-fast.yml'), 'utf8');
  assert.match(newsFast, /FINDABILITY #129/);
  assert.match(newsFast, /pdoom\.html/);
  const collect = readFileSync(join(ROOT, '.github', 'workflows', 'collect.yml'), 'utf8');
  const copies = collect.match(/cp -a \.pages\/p-doom\.html \.pages\/pdoom\.html/g) || [];
  assert.ok(copies.length >= 2, `expected pdoom restore on both Publish paths, got ${copies.length}`);
});

test('Publish restores tip agent maps when head-term needles missing (FINDABILITY #136)', () => {
  // Collect run 38730984750 (pre-#134 main) wiped tip agents.md/llms.txt
  // head-term shorts; #136 preserves tip maps across orphan/overlay Publish.
  const collect = readFileSync(join(ROOT, '.github', 'workflows', 'collect.yml'), 'utf8');
  assert.match(collect, /FINDABILITY #136/);
  assert.match(collect, /restored \$map agent map \(#136\/#139\)/);
  const stash = collect.match(/for hub in compare\.html alternatives\.html agents\.md llms\.txt/g) || [];
  assert.ok(stash.length >= 2, `expected agent-map stash on both collect Publish paths, got ${stash.length}`);
  const restores = collect.match(/for map in agents\.md llms\.txt/g) || [];
  assert.ok(restores.length >= 2, `expected agent-map restore on both collect Publish paths, got ${restores.length}`);
  assert.match(collect, /\/ai-doom\.html/);
  assert.match(collect, /\/doomsday-clock\.html/);
  assert.match(collect, /\/doom-index\.html/);
  assert.match(collect, /root https:\/\/siren\.watch\/doombench\.html/);
  // FINDABILITY #139 — also restore when #138 labAboutLabel is missing on lab lines.
  assert.match(collect, /FINDABILITY #136\/#139/);
  assert.match(collect, /OpenAI \/ ChatGPT/);
  assert.match(collect, /\/lab\/openai\.html/);
  const newsFast = readFileSync(join(ROOT, '.github', 'workflows', 'news-fast.yml'), 'utf8');
  assert.match(newsFast, /FINDABILITY #136/);
  assert.match(newsFast, /FINDABILITY #136\/#139/);
  assert.match(newsFast, /OpenAI \/ ChatGPT/);
  assert.match(newsFast, /restore_agent_maps/);
  assert.match(newsFast, /PRESERVE_MAPS/);
});

test('Publish restores tip lab/companies hub labels (FINDABILITY #141)', () => {
  // Pre-#140 collect/full orphan wiped hub rows back to bare lab names;
  // #141 stashes + restores /lab/ + companies when OpenAI / ChatGPT is missing.
  const collect = readFileSync(join(ROOT, '.github', 'workflows', 'collect.yml'), 'utf8');
  assert.match(collect, /FINDABILITY #141/);
  assert.match(collect, /restored \$hub labAboutLabel \(#141\)/);
  assert.match(collect, /lab\/index\.html/);
  assert.match(collect, /companies\.html/);
  assert.match(collect, /companies\/index\.html/);
  const stash = collect.match(/lab\/index\.html companies\.html companies\/index\.html/g) || [];
  assert.ok(stash.length >= 2, `expected lab-hub stash on both collect Publish paths, got ${stash.length}`);
  const newsFast = readFileSync(join(ROOT, '.github', 'workflows', 'news-fast.yml'), 'utf8');
  assert.match(newsFast, /FINDABILITY #141/);
  assert.match(newsFast, /restore_lab_hub_labels/);
  assert.match(newsFast, /lab\/index\.html/);
});

test('Publish restores tip home knowsAbout labAboutLabel (FINDABILITY #143)', () => {
  // news-fast overlays index.html every tick; mid-merge tip < #142 would wipe
  // Organization knowsAbout labAboutLabel until #143 preserve lands.
  const collect = readFileSync(join(ROOT, '.github', 'workflows', 'collect.yml'), 'utf8');
  assert.match(collect, /FINDABILITY #143/);
  assert.match(collect, /restored \$hub knowsAbout labAboutLabel \(#143\)/);
  assert.match(collect, /index\.html classic\.html/);
  const newsFast = readFileSync(join(ROOT, '.github', 'workflows', 'news-fast.yml'), 'utf8');
  assert.match(newsFast, /FINDABILITY #143/);
  assert.match(newsFast, /restore_home_knowsabout/);
  assert.match(newsFast, /agents\.md llms\.txt index\.html classic\.html/);
});

test('doomsday-clock / ai-doom / doom-index aliases (FINDABILITY #133)', () => {
  const src = readFileSync(join(ROOT, 'site', 'build.mjs'), 'utf8');
  assert.match(src, /FINDABILITY #133/);
  assert.match(src, /doomsday-clock\.html/);
  assert.match(src, /ai-doom\.html/);
  assert.match(src, /doom-index\.html/);
  const guard = readFileSync(join(ROOT, '.github', 'workflows', 'vs-alias-guard.yml'), 'utf8');
  assert.match(guard, /FINDABILITY #133/);
  assert.match(guard, /restore_one ai-doomsday-clock\.html doomsday-clock\.html/);
  assert.match(guard, /restore_one guide\.html ai-doom\.html/);
  assert.match(guard, /restore_one compare\.html doom-index\.html/);
  const newsFast = readFileSync(join(ROOT, '.github', 'workflows', 'news-fast.yml'), 'utf8');
  assert.match(newsFast, /FINDABILITY #133/);
  assert.match(newsFast, /doomsday-clock\.html/);
  const collect = readFileSync(join(ROOT, '.github', 'workflows', 'collect.yml'), 'utf8');
  const clocks = collect.match(/cp -a \.pages\/ai-doomsday-clock\.html \.pages\/doomsday-clock\.html/g) || [];
  assert.ok(clocks.length >= 2, `expected doomsday-clock restore on both Publish paths, got ${clocks.length}`);
  const indexnow = readFileSync(join(ROOT, 'collector', 'indexnow.mjs'), 'utf8');
  assert.match(indexnow, /\/doomsday-clock\.html/);
  assert.match(indexnow, /\/ai-doom\.html/);
});

test('root rival typed-guess aliases restored (FINDABILITY #131)', () => {
  const compare = readFileSync(join(ROOT, 'site', 'templates', 'comparePages.mjs'), 'utf8');
  assert.match(compare, /FINDABILITY #131/);
  assert.match(compare, /\/doombench\.html/);
  assert.match(compare, /\/pizzint\.html/);
  assert.match(compare, /\/takeofftracker\.html/);
  const guard = readFileSync(join(ROOT, '.github', 'workflows', 'vs-alias-guard.yml'), 'utf8');
  assert.match(guard, /FINDABILITY #131/);
  assert.match(guard, /restore_one vs\/doombench\.html doombench\.html/);
  assert.match(guard, /restore_one vs\/pizzint\.html pizzint\.html/);
  const newsFast = readFileSync(join(ROOT, '.github', 'workflows', 'news-fast.yml'), 'utf8');
  assert.match(newsFast, /FINDABILITY #131/);
  assert.match(newsFast, /doombench\.html/);
  const collect = readFileSync(join(ROOT, '.github', 'workflows', 'collect.yml'), 'utf8');
  const copies = collect.match(/cp -a \.pages\/vs\/doombench\.html \.pages\/doombench\.html/g) || [];
  assert.ok(copies.length >= 2, `expected doombench root restore on both Publish paths, got ${copies.length}`);
  const indexnow = readFileSync(join(ROOT, 'collector', 'indexnow.mjs'), 'utf8');
  assert.match(indexnow, /FINDABILITY #131/);
  assert.match(indexnow, /\/doombench\.html/);
});

test('news-only skips full sitemap and caps live day hubs (FINDABILITY #106)', () => {
  // tip c4993bcf still saw PUBLISHED=0: archive-backed day hubs + full sitemap
  // kept --only news over the news-fast budget even after #103.
  const src = readFileSync(join(ROOT, 'site', 'build.mjs'), 'utf8');
  const start = src.indexOf('NEWS-ONLY FAST PATH');
  const end = src.indexOf('news-only build complete', start);
  assert.ok(start >= 0 && end > start, 'news-only block missing');
  const block = src.slice(start, end);
  assert.match(block, /FINDABILITY #106/);
  assert.match(block, /liveDays/);
  assert.match(block, /\.slice\(0, 5\)/);
  assert.match(block, /news-sitemap\.xml/);
  assert.doesNotMatch(block, /write\(args\.out, 'sitemap\.xml'/);
  const yml = readFileSync(join(ROOT, '.github', 'workflows', 'news-fast.yml'), 'utf8');
  assert.match(yml, /FINDABILITY #106/);
  assert.match(yml, /timeout 900 node site\/build\.mjs --only news/);
});

test('news-only item fingerprint ignores recency churn (FINDABILITY #107)', () => {
  // tip c4993bcf: 6/6 ticks timed out at 480s rewriting ~800 briefs because
  // age_hours_at_score / score_components.recency / score moved every tick.
  const src = readFileSync(join(ROOT, 'site', 'build.mjs'), 'utf8');
  assert.match(src, /function newsOnlyItemFingerprint/);
  assert.match(src, /FINDABILITY #107/);
  const start = src.indexOf('NEWS-ONLY FAST PATH');
  const end = src.indexOf('news-only build complete', start);
  const block = src.slice(start, end);
  assert.match(block, /newsOnlyItemFingerprint\(it\)/);
  assert.match(block, /NEWS_ONLY_ITEM_REWRITE_CAP/);
  assert.doesNotMatch(
    block,
    /const itemChanged = !prev \|\| stableJson\(it\) !== stableJson\(prev\)/,
  );
});
