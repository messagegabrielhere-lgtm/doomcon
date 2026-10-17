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
import { execFileSync } from 'node:child_process';

import * as baseline from './fixtures/engine-baseline.mjs';
import { runEngine, weightShares, healthFor, hourlyCronMinute, mergeReference, addendaHash, levelFor, readSchedule } from '../engine.mjs';
import { canonicalJson } from '../receipts.mjs';
import { buildStockanalysisAddendum, dayRange, addendaHash as calibrateHash } from '../calibrate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const readJson = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
// FINDABILITY #190 — Loop body lives in news-fast-loop.sh so the workflow
// YAML stays under GitHub's 21k expression-length cap. Assertions that used
// to read only news-fast.yml must see the script too.
const newsFastSrc = () =>
  readFileSync(join(ROOT, '.github', 'workflows', 'news-fast.yml'), 'utf8') +
  '\n' +
  readFileSync(join(ROOT, '.github', 'scripts', 'news-fast-loop.sh'), 'utf8');

// FINDABILITY #192/#197 — collect Publish bodies live in
// collect-publish-{news,full}.sh (same 21k expression-cap extract). Restore
// assertions that used to read only collect.yml must see both scripts.
const collectPublishSrc = () =>
  readFileSync(join(ROOT, '.github', 'workflows', 'collect.yml'), 'utf8') +
  '\n' +
  readFileSync(join(ROOT, '.github', 'scripts', 'collect-publish-news.sh'), 'utf8') +
  '\n' +
  readFileSync(join(ROOT, '.github', 'scripts', 'collect-publish-full.sh'), 'utf8');

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
  const yml = newsFastSrc();
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
  const yml = newsFastSrc();
  assert.match(yml, /seeding public\/ from gh-pages for news-only builds/);
  assert.match(yml, /git clone --depth 1 --branch gh-pages/);
  assert.match(yml, /build\.mjs --only news/);
});

test('news-fast refuses full wipe fallback on news-only failure (FINDABILITY #99)', () => {
  // The old `trying full build` path is what burned 58m with zero publishes.
  const yml = newsFastSrc();
  assert.doesNotMatch(yml, /trying full build/);
  assert.match(yml, /timeout 900 node site\/build\.mjs --only news/);
  assert.match(yml, /skipping full wipe fallback/);
});

test('news-fast throttles Pages publish cadence (FINDABILITY #112/#117)', () => {
  // 2026-10-15: after #106/#107 news-fast published every tick; GitHub Pages
  // returned duration:0 "Page build failed" for ~20 consecutive pushes and
  // froze the live CDN (last built 07:41Z) so overlays like #111 never served.
  const yml = newsFastSrc();
  assert.match(yml, /FINDABILITY #112/);
  assert.match(yml, /PUBLISH_MIN_GAP=600/);
  assert.match(yml, /PENDING_PUB/);
  assert.match(yml, /deferring Pages publish/);
});

test('news-fast seeds LAST_PAGES_PUB from gh-pages tip (FINDABILITY #118)', () => {
  // LAST_PAGES_PUB=0 made AGO ≈ epoch so every newly armed job published on
  // tick 1 and raced collect / prior tip (Pages errored again ~09:00Z).
  const yml = newsFastSrc();
  assert.match(yml, /FINDABILITY #118/);
  assert.match(yml, /refresh_last_pages_pub/);
  assert.match(yml, /LAST_PAGES_PUB seeded from gh-pages tip/);
  assert.match(yml, /commits\/gh-pages/);
  assert.match(yml, /log -1 --format=%ct/);
});

test('collect + news-fast pass Bing Webmaster verification secret (FINDABILITY #120)', () => {
  const collect = readFileSync(join(ROOT, '.github', 'workflows', 'collect.yml'), 'utf8');
  const newsFast = newsFastSrc();
  assert.match(collect, /BING_SITE_VERIFICATION: \$\{\{ secrets\.BING_SITE_VERIFICATION \}\}/);
  assert.match(newsFast, /BING_SITE_VERIFICATION: \$\{\{ secrets\.BING_SITE_VERIFICATION \}\}/);
  assert.match(newsFast, /FINDABILITY #120/);
});

test('collect re-arms news-fast when the minute-loop chain is dark (FINDABILITY #188)', () => {
  // After 2026-10-15T13:02Z news-fast self-Re-arm + hourly cron both went
  // quiet; Trends/news tip froze until agent overlays. Collect newsroom (15m)
  // must wake news-fast.yml when no schedule/dispatch finished in 90m.
  const collect = readFileSync(join(ROOT, '.github', 'workflows', 'collect.yml'), 'utf8');
  assert.match(collect, /FINDABILITY #188/);
  assert.match(collect, /Re-arm news-fast when dark/);
  assert.match(collect, /NEWS_FAST_STALE_MIN/);
  assert.match(collect, /gh workflow run news-fast\.yml/);
  assert.match(collect, /NEWS_FAST_CHAIN/);
  // Both lanes need actions:write to dispatch.
  const newsPerm = collect.match(/news:\s*\n\s*name: newsroom\s*\n\s*permissions:\s*\n([\s\S]*?)\n\s*if:/);
  assert.ok(newsPerm, 'newsroom permissions block missing');
  assert.match(newsPerm[1], /actions:\s*write/);
  const fullPerm = collect.match(/full:\s*\n\s*name: full index pass\s*\n\s*permissions:\s*\n([\s\S]*?)\n\s*if:/);
  assert.ok(fullPerm, 'full permissions block missing');
  assert.match(fullPerm[1], /actions:\s*write/);
  // Two re-arm steps (newsroom + full).
  const rearmCount = (collect.match(/name: Re-arm news-fast when dark/g) || []).length;
  assert.equal(rearmCount, 2, `expected 2 re-arm steps, got ${rearmCount}`);
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

test('news-fast Loop body lives in external script under 21k YAML cap (FINDABILITY #190)', () => {
  // 2026-10-15T22:52Z vs-alias-guard re-arm got HTTP 422: news-fast.yml
  // "Exceeded max expression length 21000" at the Loop `run: |` block (~61k).
  // Extract the loop to .github/scripts/news-fast-loop.sh so dispatch works.
  const yml = readFileSync(join(ROOT, '.github', 'workflows', 'news-fast.yml'), 'utf8');
  assert.match(yml, /FINDABILITY #190/);
  assert.match(yml, /run: bash \.github\/scripts\/news-fast-loop\.sh/);
  const loop = readFileSync(join(ROOT, '.github', 'scripts', 'news-fast-loop.sh'), 'utf8');
  assert.match(loop, /set -uo pipefail/);
  assert.match(loop, /PUBLISH_MIN_GAP/);
  assert.ok(yml.length < 21000, `news-fast.yml is ${yml.length} chars (want <21000)`);
  const runBlocks = [...yml.matchAll(/run:\s*\|\s*\n((?:[ \t]+.*\n)*)/g)];
  for (const m of runBlocks) {
    assert.ok(m[1].length < 21000, `run| block is ${m[1].length} chars`);
  }
});

test('collect Publish scripts parse under bash -n (FINDABILITY #196/#197)', () => {
  // 2026-10-16T00:02Z schedule newsroom Publish failed: collect-publish-news.sh
  // line 245 `syntax error near unexpected token done` after #194 glued `fi`
  // onto an echo. Keep extracted Publish scripts syntactically valid.
  const scripts = [
    'collect-publish-news.sh',
    'collect-publish-full.sh',
    'news-fast-loop.sh',
  ];
  for (const name of scripts) {
    const path = join(ROOT, '.github', 'scripts', name);
    assert.doesNotThrow(
      () => execFileSync('bash', ['-n', path], { encoding: 'utf8' }),
      `${name} failed bash -n`,
    );
  }
  const collectYml = readFileSync(join(ROOT, '.github', 'workflows', 'collect.yml'), 'utf8');
  assert.match(collectYml, /run: bash \.github\/scripts\/collect-publish-news\.sh/);
  assert.match(collectYml, /run: bash \.github\/scripts\/collect-publish-full\.sh/);
});

test('vs-alias-guard re-arms news-fast when the minute-loop chain is dark (FINDABILITY #189)', () => {
  // Collect schedules went quiet for hours after 2026-10-15T19:10Z while
  // vs-alias-guard kept firing every ~10m. Guard must wake news-fast.yml when
  // no schedule/dispatch finished in 90m (complements collect #188).
  const yml = readFileSync(join(ROOT, '.github', 'workflows', 'vs-alias-guard.yml'), 'utf8');
  assert.match(yml, /FINDABILITY #189/);
  assert.match(yml, /Re-arm news-fast when dark/);
  assert.match(yml, /NEWS_FAST_STALE_MIN/);
  assert.match(yml, /gh workflow run news-fast\.yml/);
  assert.match(yml, /NEWS_FAST_CHAIN/);
  assert.match(yml, /actions:\s*write/);
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
  const yml = newsFastSrc();
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
  const yml = newsFastSrc();
  assert.match(yml, /FINDABILITY #124/);
  assert.match(yml, /trends\.html/);
  assert.match(yml, /verify\/index\.html/);
  assert.match(yml, /free-tools\/index\.html/);
});

test('collect.yml Publish restores vs short aliases (FINDABILITY #115)', () => {
  // collect orphan Publish tars public/ the same way news-fast orphan did —
  // news-only rebuilds omit /vs/doom.html etc. and would wipe tip.
  // #192 moved Publish bodies into collect-publish-{news,full}.sh.
  const yml = collectPublishSrc();
  assert.match(yml, /FINDABILITY #115/);
  assert.match(yml, /vs\/skynet\.html/);
  assert.match(yml, /vs\/doom\.html/);
  assert.match(yml, /vs\/takeoff\.html/);
  const copies = yml.match(/cp -a \.pages\/vs\/skynet-countdown\.html \.pages\/vs\/skynet\.html/g) || [];
  assert.ok(copies.length >= 2, `expected restore on newsroom + full Publish, got ${copies.length}`);
});

test('collect.yml Publish restores /trends + Outrank dir indexes (FINDABILITY #124)', () => {
  const yml = collectPublishSrc();
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
  const newsFast = newsFastSrc();
  assert.match(newsFast, /FINDABILITY #129/);
  assert.match(newsFast, /pdoom\.html/);
  const collect = collectPublishSrc();
  const copies = collect.match(/cp -a \.pages\/p-doom\.html \.pages\/pdoom\.html/g) || [];
  assert.ok(copies.length >= 2, `expected pdoom restore on both Publish paths, got ${copies.length}`);
});

test('Publish restores tip agent maps when head-term needles missing (FINDABILITY #136)', () => {
  // Collect run 38730984750 (pre-#134 main) wiped tip agents.md/llms.txt
  // head-term shorts; #136 preserves tip maps across orphan/overlay Publish.
  // #192 moved Publish bodies into collect-publish-{news,full}.sh.
  const collect = collectPublishSrc();
  assert.match(collect, /FINDABILITY #136/);
  // Echo grew as later FAQ tips landed (#156…#185); keep the #136/#139 prefix.
  assert.match(collect, /restored \$map agent map \(#136\/#139/);
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
  const newsFast = newsFastSrc();
  assert.match(newsFast, /FINDABILITY #136/);
  assert.match(newsFast, /FINDABILITY #136\/#139/);
  assert.match(newsFast, /OpenAI \/ ChatGPT/);
  assert.match(newsFast, /restore_agent_maps/);
  assert.match(newsFast, /PRESERVE_MAPS/);
});

test('Publish restores tip lab/companies hub labels (FINDABILITY #141)', () => {
  // Pre-#140 collect/full orphan wiped hub rows back to bare lab names;
  // #141 stashes + restores /lab/ + companies when OpenAI / ChatGPT is missing.
  const collect = collectPublishSrc();
  assert.match(collect, /FINDABILITY #141/);
  assert.match(collect, /restored \$hub labAboutLabel \(#141\)/);
  assert.match(collect, /lab\/index\.html/);
  assert.match(collect, /companies\.html/);
  assert.match(collect, /companies\/index\.html/);
  const stash = collect.match(/lab\/index\.html companies\.html companies\/index\.html/g) || [];
  assert.ok(stash.length >= 2, `expected lab-hub stash on both collect Publish paths, got ${stash.length}`);
  const newsFast = newsFastSrc();
  assert.match(newsFast, /FINDABILITY #141/);
  assert.match(newsFast, /restore_lab_hub_labels/);
  assert.match(newsFast, /lab\/index\.html/);
});

test('Publish restores tip home knowsAbout labAboutLabel (FINDABILITY #143)', () => {
  // news-fast overlays index.html every tick; mid-merge tip < #142 would wipe
  // Organization knowsAbout labAboutLabel until #143 preserve lands.
  const collect = collectPublishSrc();
  assert.match(collect, /FINDABILITY #143/);
  assert.match(collect, /restored \$hub knowsAbout labAboutLabel \/ activity-index FAQ \(#143\/#254\/#264\/#284\/#296\/#308\/#312\/#314\/#316\/#423\/#425\/#429\)/);
  // FINDABILITY #318 — home needles apply to index.html only (classic is the panel).
  assert.match(collect, /for hub in index\.html/);
  assert.doesNotMatch(collect, /for hub in index\.html classic\.html/);
  assert.match(collect, /What is an AI activity index\?/);
  assert.match(collect, /What is the AI activity index today\?/);
  assert.match(collect, /AI activity level today ·/);
  assert.match(collect, /AI activity index today · AI activity level today · AI SIREN INDEX/);
  assert.match(collect, /SIREN vs DoomBench: which should you use\?/);
  assert.match(collect, /SIREN vs Skynet Countdown: which should you use\?/);
  assert.match(collect, /SIREN vs PizzINT: which should you use\?/);
  assert.match(collect, /SIREN vs Takeoff Tracker: which should you use\?/);
  const newsFast = newsFastSrc();
  assert.match(newsFast, /FINDABILITY #143/);
  assert.match(newsFast, /FINDABILITY #254/);
  assert.match(newsFast, /FINDABILITY #284/);
  assert.match(newsFast, /FINDABILITY #296/);
  assert.match(newsFast, /FINDABILITY #308/);
  assert.match(newsFast, /FINDABILITY #312\/#314/);
  assert.match(newsFast, /FINDABILITY #316/);
  assert.match(newsFast, /FINDABILITY #423/);
  assert.match(newsFast, /FINDABILITY #425\/#427/);
  assert.match(newsFast, /FINDABILITY #429/);
  assert.match(newsFast, /restore_home_knowsabout/);
  assert.match(newsFast, /for hub in index\.html/);
  assert.doesNotMatch(newsFast, /for hub in index\.html classic\.html/);
  assert.match(newsFast, /What is an AI activity index\?/);
  assert.match(newsFast, /What is the AI activity index today\?/);
  assert.match(newsFast, /AI activity level today ·/);
  assert.match(newsFast, /AI activity index today · AI activity level today · AI SIREN INDEX/);
  assert.match(newsFast, /SIREN vs DoomBench: which should you use\?/);
  assert.match(newsFast, /SIREN vs Skynet Countdown: which should you use\?/);
  assert.match(newsFast, /SIREN vs PizzINT: which should you use\?/);
  assert.match(newsFast, /SIREN vs Takeoff Tracker: which should you use\?/);
  assert.match(newsFast, /agents\.md llms\.txt index\.html classic\.html/);
});

test('Publish restores tip classic instrument panel (FINDABILITY #318)', () => {
  const collect = collectPublishSrc();
  assert.match(collect, /FINDABILITY #318/);
  assert.match(collect, /Where is the full SIREN instrument panel\?/);
  assert.match(collect, /rel="canonical" href="https:\/\/siren\.watch\/classic\.html"/);
  assert.match(collect, /restored classic\.html classic instrument panel \(#318\)/);
  const newsFast = newsFastSrc();
  assert.match(newsFast, /FINDABILITY #318/);
  assert.match(newsFast, /restore_classic_panel/);
  assert.match(newsFast, /Where is the full SIREN instrument panel\?/);
  assert.match(newsFast, /rel="canonical" href="https:\/\/siren\.watch\/classic\.html"/);
});

test('Publish reinjects classic.html into sitemap.xml (FINDABILITY #322)', () => {
  const collect = collectPublishSrc();
  assert.match(collect, /FINDABILITY #322/);
  assert.match(collect, /ensure-classic-sitemap\.mjs/);
  const newsFast = newsFastSrc();
  assert.match(newsFast, /FINDABILITY #322/);
  assert.match(newsFast, /ensure_classic_sitemap/);
  assert.match(newsFast, /ensure-classic-sitemap\.mjs/);
});

test('Publish restores tip agent maps when /classic.html missing (FINDABILITY #324)', () => {
  const collect = collectPublishSrc();
  assert.match(collect, /! grep -qF '\/classic\.html' "\.pages\/\$map"/);
  // Echo suffix grows as later FAQ tips land (#362/#366…); keep the #324 marker.
  assert.match(collect, /restored \$map agent map \(.*#324/);
  const newsFast = newsFastSrc();
  assert.match(newsFast, /! grep -qF '\/classic\.html' "\$root\/\$map"/);
  assert.match(newsFast, /restored \$map agent map \(.*#324/);
});

test('Publish restores tip skill.md when classic panel missing (FINDABILITY #326)', () => {
  const collect = collectPublishSrc();
  assert.match(collect, /FINDABILITY #326/);
  assert.match(collect, /skills\/siren-ai-index\/SKILL\.md/);
  assert.match(collect, /Where is the full SIREN instrument panel\?/);
  assert.match(collect, /restored \$skill classic instrument panel \/ level head term \(#326\/#435\)/);
  const newsFast = newsFastSrc();
  assert.match(newsFast, /FINDABILITY #326/);
  assert.match(newsFast, /restore_skill_classic/);
  assert.match(newsFast, /skills\/siren-ai-index\/SKILL\.md/);
  assert.match(newsFast, /restored \$skill classic instrument panel \/ level head term \(#326\/#435\)/);
});

test('Publish restores tip agents.html when dual head term missing (FINDABILITY #437)', () => {
  const collect = collectPublishSrc();
  assert.match(collect, /FINDABILITY #437/);
  assert.match(collect, /AI activity index today · AI activity level today/);
  assert.match(collect, /restored agents\.html dual head term \(#437\)/);
  assert.match(collect, /agents\.html agents\.txt/);
  const newsFast = newsFastSrc();
  assert.match(newsFast, /FINDABILITY #437/);
  assert.match(newsFast, /restore_agents_html_dual/);
  assert.match(newsFast, /AI activity index today · AI activity level today/);
  assert.match(newsFast, /restored agents\.html dual head term \(#437\)/);
});

test('Publish restores tip discovery surfaces when classic panel missing (FINDABILITY #328)', () => {
  const collect = collectPublishSrc();
  assert.match(collect, /FINDABILITY #328/);
  assert.match(collect, /for surf in agents\.txt ai\.txt/);
  assert.match(collect, /\.well-known\/api-catalog/);
  assert.match(collect, /restored \$surf classic instrument panel \/ dual head term \(#328\/#439\)/);
  const newsFast = newsFastSrc();
  assert.match(newsFast, /FINDABILITY #328/);
  assert.match(newsFast, /restore_discovery_classic/);
  assert.match(newsFast, /for surf in agents\.txt ai\.txt/);
  assert.match(newsFast, /restored \$surf classic instrument panel \/ dual head term \(#328\/#439\)/);
});

test('Publish restores tip discovery dual head term (FINDABILITY #439)', () => {
  const collect = collectPublishSrc();
  assert.match(collect, /FINDABILITY #328\/#439/);
  assert.match(collect, /AI activity index today · AI activity level today/);
  assert.match(collect, /restored \$surf classic instrument panel \/ dual head term \(#328\/#439\)/);
  const newsFast = newsFastSrc();
  assert.match(newsFast, /FINDABILITY #328\/#439/);
  assert.match(newsFast, /AI activity index today · AI activity level today/);
  assert.match(newsFast, /restored \$surf classic instrument panel \/ dual head term \(#328\/#439\)/);
});

test('Publish restores tip discovery JSON when classic panel missing (FINDABILITY #330)', () => {
  const collect = collectPublishSrc();
  assert.match(collect, /FINDABILITY #330/);
  assert.match(collect, /for surf in agents\.json openapi\.json api\/index\.json llms-full\.txt/);
  assert.match(collect, /\.well-known\/agent-skills\/index\.json/);
  assert.match(collect, /restored \$surf classic instrument panel \/ dual head term \(#330\/#441\)/);
  const newsFast = newsFastSrc();
  assert.match(newsFast, /FINDABILITY #330/);
  assert.match(newsFast, /restore_discovery_classic/);
  assert.match(newsFast, /for surf in agents\.json openapi\.json api\/index\.json llms-full\.txt/);
  assert.match(newsFast, /restored \$surf classic instrument panel \/ dual head term \(#330\/#441\)/);
});

test('Publish restores tip discovery JSON dual head term (FINDABILITY #441)', () => {
  const collect = collectPublishSrc();
  assert.match(collect, /FINDABILITY #330\/#441/);
  assert.match(collect, /AI activity index today · AI activity level today/);
  assert.match(collect, /restored \$surf classic instrument panel \/ dual head term \(#330\/#441\)/);
  assert.match(collect, /restored \$surf dual head term \(#441\)/);
  const newsFast = newsFastSrc();
  assert.match(newsFast, /FINDABILITY #330\/#441/);
  assert.match(newsFast, /AI activity index today · AI activity level today/);
  assert.match(newsFast, /restored \$surf classic instrument panel \/ dual head term \(#330\/#441\)/);
  assert.match(newsFast, /restored \$surf dual head term \(#441\)/);
});

test('Publish restores tip free-tools.html when classic panel missing (FINDABILITY #332)', () => {
  const collect = collectPublishSrc();
  assert.match(collect, /FINDABILITY #332/);
  assert.match(collect, /free-tools\.html/);
  assert.match(collect, /restored free-tools\.html classic instrument panel \/ dual head term \(#332\/#443\)/);
  const newsFast = newsFastSrc();
  assert.match(newsFast, /FINDABILITY #332/);
  assert.match(newsFast, /restore_discovery_classic/);
  assert.match(newsFast, /restored free-tools\.html classic instrument panel \/ dual head term \(#332\/#443\)/);
});

test('Publish restores tip free-tools dual head term (FINDABILITY #443)', () => {
  const collect = collectPublishSrc();
  assert.match(collect, /FINDABILITY #332\/#443/);
  assert.match(collect, /AI activity index today · AI activity level today/);
  assert.match(collect, /restored free-tools\.html classic instrument panel \/ dual head term \(#332\/#443\)/);
  const newsFast = newsFastSrc();
  assert.match(newsFast, /FINDABILITY #332\/#443/);
  assert.match(newsFast, /AI activity index today · AI activity level today/);
  assert.match(newsFast, /restored free-tools\.html classic instrument panel \/ dual head term \(#332\/#443\)/);
});

test('Publish restores tip verify.html dual head term (FINDABILITY #451)', () => {
  const collect = collectPublishSrc();
  assert.match(collect, /FINDABILITY #451/);
  assert.match(collect, /verify\.html/);
  assert.match(collect, /restored verify\.html dual head term \(#451\)/);
  const newsFast = newsFastSrc();
  assert.match(newsFast, /FINDABILITY #451/);
  assert.match(newsFast, /verify\.html/);
  assert.match(newsFast, /restored verify\.html dual head term \(#451\)/);
});

test('Publish in-place patches footer SECTIONS dual (FINDABILITY #485)', () => {
  // Orphan newsroom wiped most rooms back to index-only while press/games
  // whole-file restore stayed green; #485 patches every HTML in place.
  const collect = collectPublishSrc();
  assert.match(collect, /FINDABILITY #483\/#485/);
  assert.match(collect, /patched \$hub sections dual head term \(#485\)/);
  assert.match(collect, /AI activity index today · AI activity level today · SIREN/);
  const newsFast = newsFastSrc();
  assert.match(newsFast, /FINDABILITY #483\/#485/);
  assert.match(newsFast, /patched \$f sections dual head term \(#485\)/);
});

test('Publish restores tip compare/alternatives dual head term (FINDABILITY #453)', () => {
  const collect = collectPublishSrc();
  assert.match(collect, /FINDABILITY #453/);
  assert.match(collect, /compare\.html/);
  assert.match(collect, /alternatives\.html/);
  assert.match(collect, /restored compare\.html dual head term \(#453\)/);
  assert.match(collect, /restored alternatives\.html dual head term \(#453\)/);
  const newsFast = newsFastSrc();
  assert.match(newsFast, /FINDABILITY #453/);
  assert.match(newsFast, /compare\.html/);
  assert.match(newsFast, /alternatives\.html/);
  assert.match(newsFast, /restored compare\.html dual head term \(#453\)/);
  assert.match(newsFast, /restored alternatives\.html dual head term \(#453\)/);
});

test('Publish restores tip pdoom/ai-doomsday-clock dual head term (FINDABILITY #455)', () => {
  const collect = collectPublishSrc();
  assert.match(collect, /FINDABILITY #455/);
  assert.match(collect, /p-doom\.html/);
  assert.match(collect, /ai-doomsday-clock\.html/);
  assert.match(collect, /restored p-doom\.html dual head term \(#455\)/);
  assert.match(collect, /restored ai-doomsday-clock\.html dual head term \(#455\)/);
  const newsFast = newsFastSrc();
  assert.match(newsFast, /FINDABILITY #455/);
  assert.match(newsFast, /p-doom\.html/);
  assert.match(newsFast, /ai-doomsday-clock\.html/);
  assert.match(newsFast, /restored p-doom\.html dual head term \(#455\)/);
  assert.match(newsFast, /restored ai-doomsday-clock\.html dual head term \(#455\)/);
});

test('Publish restores tip home AI activity index FAQ (FINDABILITY #254)', () => {
  // Orphan/news-only Publish can wipe the exact head-term FAQ until tip ≥ #254;
  // restore fires on missing needle and re-syncs /ai-activity-index alias body.
  const collect = collectPublishSrc();
  assert.match(collect, /FINDABILITY #254/);
  assert.match(collect, /What is an AI activity index\?/);
  assert.match(collect, /ai-activity-index\.html/);
  const newsFast = newsFastSrc();
  assert.match(newsFast, /FINDABILITY #254/);
  assert.match(newsFast, /What is an AI activity index\?/);
  assert.match(newsFast, /ai-activity-index\.html/);
});

test('Publish restores tip home AI activity index today FAQ (FINDABILITY #284)', () => {
  // Orphan Publish can keep #254 while wiping the title-match today FAQ until tip ≥ #284.
  const collect = collectPublishSrc();
  assert.match(collect, /FINDABILITY #284/);
  assert.match(collect, /What is the AI activity index today\?/);
  assert.match(collect, /ai-activity-index\.html/);
  const newsFast = newsFastSrc();
  assert.match(newsFast, /FINDABILITY #284/);
  assert.match(newsFast, /What is the AI activity index today\?/);
  assert.match(newsFast, /ai-activity-index\.html/);
});

test('Publish restores tip home AI activity level FAQ alias prose (FINDABILITY #264)', () => {
  // Orphan Publish can keep #254 while wiping #262 tip FAQ prose until tip ≥ #264;
  // restore fires on missing needle and re-syncs /ai-activity-level alias body.
  const collect = collectPublishSrc();
  assert.match(collect, /FINDABILITY #264/);
  assert.match(collect, /\/ai-activity-level\.html is a short alias/);
  assert.match(collect, /ai-activity-level\.html/);
  const newsFast = newsFastSrc();
  assert.match(newsFast, /FINDABILITY #264/);
  assert.match(newsFast, /\/ai-activity-level\.html is a short alias/);
  assert.match(newsFast, /ai-activity-level\.html/);
});

test('Publish restores tip home AI activity level today title (FINDABILITY #296)', () => {
  // Orphan Publish can wipe dual head-term <title> middot form until tip ≥ #296.
  const collect = collectPublishSrc();
  assert.match(collect, /FINDABILITY #296/);
  assert.match(collect, /AI activity level today ·/);
  const newsFast = newsFastSrc();
  assert.match(newsFast, /FINDABILITY #296/);
  assert.match(newsFast, /AI activity level today ·/);
});

test('Publish restores tip home AI activity H1 head terms (FINDABILITY #308)', () => {
  // Orphan Publish can keep #296 title while wiping brand-only H1 .v2-sr until tip ≥ #308.
  const collect = collectPublishSrc();
  assert.match(collect, /FINDABILITY #308/);
  assert.match(collect, /AI activity index today · AI activity level today · AI SIREN INDEX/);
  const newsFast = newsFastSrc();
  assert.match(newsFast, /FINDABILITY #308/);
  assert.match(newsFast, /AI activity index today · AI activity level today · AI SIREN INDEX/);
});

test('Publish restores tip home title trim when level_name returns (FINDABILITY #312/#314)', () => {
  // Orphan newsroom can re-emit ROUTINE in <title> while tip stash is trimmed (#312).
  // Restore only when tip title is clean so post-#312 native builds are kept.
  const collect = collectPublishSrc();
  assert.match(collect, /FINDABILITY #312\/#314/);
  assert.match(collect, /DORMANT\|ROUTINE\|ELEVATED\|ACCELERATED\|UNPRECEDENTED\|UNAVAILABLE/);
  assert.match(collect, /restored \$hub knowsAbout labAboutLabel \/ activity-index FAQ \(#143\/#254\/#264\/#284\/#296\/#308\/#312\/#314\/#316\/#423\/#425\/#429\)/);
  const newsFast = newsFastSrc();
  assert.match(newsFast, /FINDABILITY #312\/#314/);
  assert.match(newsFast, /DORMANT\|ROUTINE\|ELEVATED\|ACCELERATED\|UNPRECEDENTED\|UNAVAILABLE/);
  assert.match(newsFast, /#143\/#254\/#264\/#284\/#296\/#308\/#312\/#314\/#316\/#423\/#425\/#429/);
});

test('Publish restores tip home title when decimal score returns (FINDABILITY #316)', () => {
  // Orphan Publish can re-emit `· 55.6` in <title> while tip stash is score-free (#316).
  const collect = collectPublishSrc();
  assert.match(collect, /FINDABILITY #316/);
  assert.match(collect, /\[0-9\]\+\\\.\[0-9\]\+/);
  const newsFast = newsFastSrc();
  assert.match(newsFast, /FINDABILITY #316/);
  assert.match(newsFast, /\[0-9\]\+\\\.\[0-9\]\+/);
});

test('Publish restores tip race labAboutLabel (FINDABILITY #145)', () => {
  // Orphan newsroom Publish force-pushed tip race.html without #144 labels;
  // #145 stashes + restores race.html when OpenAI / ChatGPT is missing.
  const collect = collectPublishSrc();
  assert.match(collect, /FINDABILITY #145/);
  assert.match(collect, /restored \$hub race labAboutLabel \(#145\)/);
  assert.match(collect, /race\.html/);
  assert.match(collect, /race\/index\.html/);
  const stash = collect.match(/race\.html race\/index\.html/g) || [];
  assert.ok(stash.length >= 2, `expected race stash on both collect Publish paths, got ${stash.length}`);
  const newsFast = newsFastSrc();
  assert.match(newsFast, /FINDABILITY #145/);
  assert.match(newsFast, /restore_race_lab_labels/);
  assert.match(newsFast, /race\.html/);
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
  const newsFast = newsFastSrc();
  assert.match(newsFast, /FINDABILITY #133/);
  assert.match(newsFast, /doomsday-clock\.html/);
  const collect = collectPublishSrc();
  const clocks = collect.match(/cp -a \.pages\/ai-doomsday-clock\.html \.pages\/doomsday-clock\.html/g) || [];
  assert.ok(clocks.length >= 2, `expected doomsday-clock restore on both Publish paths, got ${clocks.length}`);
  const indexnow = readFileSync(join(ROOT, 'collector', 'indexnow.mjs'), 'utf8');
  assert.match(indexnow, /\/doomsday-clock\.html/);
  assert.match(indexnow, /\/ai-doom\.html/);
});

test('ai-activity-index home typed-guess alias (FINDABILITY #252)', () => {
  const src = readFileSync(join(ROOT, 'site', 'build.mjs'), 'utf8');
  assert.match(src, /FINDABILITY #252/);
  assert.match(src, /ai-activity-index\.html/);
  assert.match(src, /'ai-activity-index'/);
  const guard = readFileSync(join(ROOT, '.github', 'workflows', 'vs-alias-guard.yml'), 'utf8');
  assert.match(guard, /FINDABILITY #252/);
  assert.match(guard, /restore_one index\.html ai-activity-index\.html/);
  assert.match(guard, /restore_dir index\.html ai-activity-index/);
  const newsFast = newsFastSrc();
  assert.match(newsFast, /FINDABILITY #252/);
  assert.match(newsFast, /ai-activity-index\.html/);
  const collect = collectPublishSrc();
  const copies = collect.match(/cp -a \.pages\/index\.html \.pages\/ai-activity-index\.html/g) || [];
  assert.ok(copies.length >= 2, `expected ai-activity-index restore on both Publish paths, got ${copies.length}`);
  assert.match(collect, /\/ai-activity-index\.html/);
  const indexnow = readFileSync(join(ROOT, 'collector', 'indexnow.mjs'), 'utf8');
  assert.match(indexnow, /\/ai-activity-index\.html/);
  assert.match(indexnow, /FINDABILITY #252/);
});

test('ai-activity-level home typed-guess alias (FINDABILITY #262)', () => {
  const src = readFileSync(join(ROOT, 'site', 'build.mjs'), 'utf8');
  assert.match(src, /FINDABILITY #262/);
  assert.match(src, /ai-activity-level\.html/);
  assert.match(src, /'ai-activity-level'/);
  const guard = readFileSync(join(ROOT, '.github', 'workflows', 'vs-alias-guard.yml'), 'utf8');
  assert.match(guard, /FINDABILITY #262/);
  assert.match(guard, /restore_one index\.html ai-activity-level\.html/);
  assert.match(guard, /restore_dir index\.html ai-activity-level/);
  const newsFast = newsFastSrc();
  assert.match(newsFast, /FINDABILITY #262/);
  assert.match(newsFast, /ai-activity-level\.html/);
  const collect = collectPublishSrc();
  const copies = collect.match(/cp -a \.pages\/index\.html \.pages\/ai-activity-level\.html/g) || [];
  assert.ok(copies.length >= 2, `expected ai-activity-level restore on both Publish paths, got ${copies.length}`);
  assert.match(collect, /\/ai-activity-level\.html/);
  const indexnow = readFileSync(join(ROOT, 'collector', 'indexnow.mjs'), 'utf8');
  assert.match(indexnow, /\/ai-activity-level\.html/);
  assert.match(indexnow, /FINDABILITY #262/);
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
  const newsFast = newsFastSrc();
  assert.match(newsFast, /FINDABILITY #131/);
  assert.match(newsFast, /doombench\.html/);
  const collect = collectPublishSrc();
  const copies = collect.match(/cp -a \.pages\/vs\/doombench\.html \.pages\/doombench\.html/g) || [];
  assert.ok(copies.length >= 2, `expected doombench root restore on both Publish paths, got ${copies.length}`);
  const indexnow = readFileSync(join(ROOT, 'collector', 'indexnow.mjs'), 'utf8');
  assert.match(indexnow, /FINDABILITY #131/);
  assert.match(indexnow, /\/doombench\.html/);
});

test('IndexNow ALWAYS covers TSMC + CoreWeave Trends labs (FINDABILITY #168)', () => {
  const indexnow = readFileSync(join(ROOT, 'collector', 'indexnow.mjs'), 'utf8');
  assert.match(indexnow, /FINDABILITY #168/);
  const alwaysMatch = indexnow.match(/const ALWAYS = Object\.freeze\(\[([\s\S]*?)\]\);/);
  assert.ok(alwaysMatch, 'ALWAYS list missing');
  const alwaysBlock = alwaysMatch[1];
  assert.match(alwaysBlock, /\/lab\/tsmc\.html/);
  assert.match(alwaysBlock, /\/lab\/coreweave\.html/);
  assert.match(alwaysBlock, /\/lab\/amazon\.html/);
  assert.match(alwaysBlock, /\/lab\/asml\.html/);
  const count = [...alwaysBlock.matchAll(/'([^']+)'/g)].length;
  assert.ok(count < 400, `ALWAYS must stay under 400, got ${count}`);
  assert.ok(count >= 298, `ALWAYS should include #168 labs, got ${count}`);
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
  const yml = newsFastSrc();
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

test('news-fast polls search-trends and news-only rewrites it (FINDABILITY #149)', () => {
  const yml = newsFastSrc();
  assert.match(yml, /FINDABILITY #149/);
  assert.match(yml, /timeout 45 node collector\/search-trends\.mjs/);
  assert.match(yml, /TBEFORE=\$\(TFP\)/);
  assert.match(yml, /\$TBEFORE" != "\$TAFTER/);
  const src = readFileSync(join(ROOT, 'site', 'build.mjs'), 'utf8');
  const start = src.indexOf('NEWS-ONLY FAST PATH');
  const end = src.indexOf('news-only build complete', start);
  assert.ok(start >= 0 && end > start, 'news-only block missing');
  const block = src.slice(start, end);
  assert.match(block, /FINDABILITY #149/);
  assert.match(block, /search-trends\.html/);
  assert.match(block, /api\/search-trends\.json/);
});

test('collect newsroom refreshes search-trends before --only news (FINDABILITY #150)', () => {
  const yml = readFileSync(join(ROOT, '.github', 'workflows', 'collect.yml'), 'utf8');
  const newsroom = yml.match(/name:\s*newsroom[\s\S]*?(?=\n  [a-z-]+:|$)/);
  assert.ok(newsroom, 'newsroom job missing');
  assert.match(newsroom[0], /FINDABILITY #150/);
  assert.match(newsroom[0], /Google Search Trends watch \(newsroom\)/);
  assert.match(newsroom[0], /timeout 45 node collector\/search-trends\.mjs/);
  assert.match(newsroom[0], /data\/search-trends\.json/);
  // Step must appear before Rebuild so --only news reads a fresh snapshot.
  const trendsAt = newsroom[0].indexOf('Google Search Trends watch (newsroom)');
  const rebuildAt = newsroom[0].indexOf('Rebuild the site');
  assert.ok(trendsAt >= 0 && rebuildAt > trendsAt, 'Trends watch must precede Rebuild');
});

test('Publish merges tip news:keywords probe needles (FINDABILITY #210)', () => {
  // Orphan collect on tip < #208 wiped Roadster; #210 stashes tip
  // news-sitemap.xml and merges NEWS_KEYWORD_PROBE_LABS into the rebuild.
  const collect = collectPublishSrc();
  assert.match(collect, /FINDABILITY #210/);
  assert.match(collect, /merge-news-keyword-tip\.mjs/);
  assert.match(collect, /news-sitemap\.xml/);
  const collectMerges = collect.match(/merge-news-keyword-tip\.mjs/g) || [];
  assert.ok(
    collectMerges.length >= 2,
    `expected merge on newsroom + full Publish, got ${collectMerges.length}`,
  );
  const stash = collect.match(/search-trends\.html news-sitemap\.xml/g) || [];
  assert.ok(
    stash.length >= 2,
    `expected news-sitemap stash on both collect Publish paths, got ${stash.length}`,
  );

  const newsFast = newsFastSrc();
  assert.match(newsFast, /FINDABILITY #210/);
  assert.match(newsFast, /merge-news-keyword-tip\.mjs/);
  const nfMerges = newsFast.match(/merge-news-keyword-tip\.mjs/g) || [];
  assert.ok(
    nfMerges.length >= 2,
    `expected merge on overlay + orphan news-fast paths, got ${nfMerges.length}`,
  );
});

test('Publish restores tip Muse Spark + Fable model hubs (FINDABILITY #248)', () => {
  // Orphan collect/newsroom Publish wiped tip /model/muse-spark.html +
  // /model/fable.html when rebuild story counts dipped below MODEL_INDEX_MIN;
  // #248 stashes + restores those hubs when FAQ needles are missing.
  const collect = collectPublishSrc();
  assert.match(collect, /FINDABILITY #248/);
  assert.match(collect, /model\/muse-spark\.html/);
  assert.match(collect, /model\/fable\.html/);
  assert.match(collect, /What has SIREN scored about Muse Spark\?/);
  assert.match(collect, /What has SIREN scored about Fable\?/);
  assert.match(collect, /restored model\/muse-spark\.html Muse Spark model hub \(#248\)/);
  assert.match(collect, /restored model\/fable\.html Fable model hub \(#248\)/);
  const stash = collect.match(/model\/muse-spark\.html model\/fable\.html/g) || [];
  assert.ok(
    stash.length >= 2,
    `expected model-hub stash on both collect Publish paths, got ${stash.length}`,
  );
  const newsFast = newsFastSrc();
  assert.match(newsFast, /FINDABILITY #248/);
  assert.match(newsFast, /restore_muse_spark_model_hub/);
  assert.match(newsFast, /restore_fable_model_hub/);
  assert.match(newsFast, /model\/muse-spark\.html/);
  assert.match(newsFast, /model\/fable\.html/);
});

test('Publish restores tip Anthropic AI safety bill FAQ + routes (FINDABILITY #366)', () => {
  // Newsroom Publish kept IPO FAQ while wiping #362 AI safety bill FAQ;
  // #366 extends #163 anthropic lab preserve (parallel to OpenAI #162/#181/#191).
  const collect = collectPublishSrc();
  assert.match(collect, /FINDABILITY #163\/#362\/#366/);
  assert.match(collect, /Why does SIREN watch Anthropic AI safety bill pitches\?/);
  assert.match(collect, /Anthropic IPO \/ FTC → \/lab\/anthropic\.html/);
  assert.match(collect, /Anthropic AI safety bill → \/lab\/anthropic\.html/);
  assert.match(collect, /! grep -qF 'AI safety bill'/);
  assert.match(
    collect,
    /restored lab\/anthropic\.html Anthropic IPO \/ FTC \+ AI safety bill \+ Canadian DC \+ METR \+ ECDSA \+ Opus \+ Blackstone \+ Replit \+ Mythos FAQ \(#163\/#362\/#366\/#368\/#392\/#397\/#402\/#408\/#412\/#420\)/,
  );
  const newsFast = newsFastSrc();
  assert.match(newsFast, /FINDABILITY #163\/#362\/#366/);
  assert.match(newsFast, /Why does SIREN watch Anthropic AI safety bill pitches\?/);
  assert.match(newsFast, /Anthropic AI safety bill → \/lab\/anthropic\.html/);
  assert.match(newsFast, /! grep -qF 'AI safety bill'/);
  assert.match(
    newsFast,
    /restored lab\/anthropic\.html Anthropic IPO \/ FTC \+ AI safety bill \+ Canadian DC \+ METR \+ ECDSA \+ Opus \+ Blackstone \+ Replit \+ Mythos FAQ \(#163\/#362\/#366\/#368\/#392\/#397\/#402\/#408\/#412\/#420\)/,
  );
});

test('Publish restores tip Anthropic Canadian data-centre FAQ + routes (FINDABILITY #368)', () => {
  const collect = collectPublishSrc();
  assert.match(collect, /FINDABILITY #163\/#362\/#366\/#368/);
  assert.match(collect, /Why does SIREN watch Anthropic Canadian data centres\?/);
  assert.match(collect, /Anthropic Canadian data centres → \/lab\/anthropic\.html/);
  assert.match(collect, /! grep -qF 'Canadian data'/);
  const newsFast = newsFastSrc();
  assert.match(newsFast, /Why does SIREN watch Anthropic Canadian data centres\?/);
  assert.match(newsFast, /Anthropic Canadian data centres → \/lab\/anthropic\.html/);
  assert.match(newsFast, /! grep -qF 'Canadian data'/);
});

test('Publish restores tip Anthropic METR evaluator FAQ + routes (FINDABILITY #392)', () => {
  const collect = collectPublishSrc();
  assert.match(collect, /FINDABILITY #163\/#362\/#366\/#368\/#392\/#397\/#402\/#408\/#412\/#420/);
  assert.match(collect, /Why does SIREN watch Anthropic METR evaluator access\?/);
  assert.match(collect, /Anthropic METR → \/lab\/anthropic\.html/);
  assert.match(collect, /Why does SIREN watch Anthropic ECDSA curve seeds\?/);
  assert.match(collect, /Anthropic ECDSA → \/lab\/anthropic\.html/);
  assert.match(collect, /Why does SIREN watch Claude Opus 5\.5\?/);
  assert.match(collect, /Claude Opus 5\.5 → \/lab\/anthropic\.html/);
  assert.match(collect, /Why does SIREN watch Blackstone Anthropic financing\?/);
  assert.match(collect, /Why does SIREN watch Replit Anthropic model switches\?/);
  assert.match(collect, /Why does SIREN watch Claude Mythos 5\?/);
  assert.match(collect, /Blackstone \/ Anthropic → \/lab\/anthropic\.html/);
  assert.match(collect, /Replit \/ Anthropic → \/lab\/anthropic\.html/);
  assert.match(collect, /Claude Mythos 5 → \/lab\/anthropic\.html/);
  assert.match(collect, /! grep -qF 'METR'/);
  assert.match(collect, /! grep -qF 'ECDSA'/);
  assert.match(collect, /! grep -qF 'Claude Opus 5\.5'/);
  assert.match(collect, /! grep -qF 'Blackstone'/);
  assert.match(collect, /! grep -qF 'Replit'/);
  assert.match(collect, /! grep -qF 'Claude Mythos 5'/);
  assert.match(
    collect,
    /restored lab\/anthropic\.html Anthropic IPO \/ FTC \+ AI safety bill \+ Canadian DC \+ METR \+ ECDSA \+ Opus \+ Blackstone \+ Replit \+ Mythos FAQ \(#163\/#362\/#366\/#368\/#392\/#397\/#402\/#408\/#412\/#420\)/,
  );
  const newsFast = newsFastSrc();
  assert.match(newsFast, /Why does SIREN watch Anthropic METR evaluator access\?/);
  assert.match(newsFast, /Anthropic METR → \/lab\/anthropic\.html/);
  assert.match(newsFast, /Why does SIREN watch Anthropic ECDSA curve seeds\?/);
  assert.match(newsFast, /Anthropic ECDSA → \/lab\/anthropic\.html/);
  assert.match(newsFast, /Why does SIREN watch Claude Opus 5\.5\?/);
  assert.match(newsFast, /Claude Opus 5\.5 → \/lab\/anthropic\.html/);
  assert.match(newsFast, /Why does SIREN watch Blackstone Anthropic financing\?/);
  assert.match(newsFast, /Why does SIREN watch Replit Anthropic model switches\?/);
  assert.match(newsFast, /Why does SIREN watch Claude Mythos 5\?/);
  assert.match(newsFast, /Blackstone \/ Anthropic → \/lab\/anthropic\.html/);
  assert.match(newsFast, /Replit \/ Anthropic → \/lab\/anthropic\.html/);
  assert.match(newsFast, /Claude Mythos 5 → \/lab\/anthropic\.html/);
  assert.match(newsFast, /! grep -qF 'METR'/);
  assert.match(newsFast, /! grep -qF 'ECDSA'/);
  assert.match(newsFast, /! grep -qF 'Claude Opus 5\.5'/);
  assert.match(newsFast, /! grep -qF 'Blackstone'/);
  assert.match(newsFast, /! grep -qF 'Replit'/);
  assert.match(newsFast, /! grep -qF 'Claude Mythos 5'/);
  assert.match(
    newsFast,
    /restored lab\/anthropic\.html Anthropic IPO \/ FTC \+ AI safety bill \+ Canadian DC \+ METR \+ ECDSA \+ Opus \+ Blackstone \+ Replit \+ Mythos FAQ \(#163\/#362\/#366\/#368\/#392\/#397\/#402\/#408\/#412\/#420\)/,
  );
});

test('Publish restores tip CERT-In FAQ + routes (FINDABILITY #410)', () => {
  const collect = collectPublishSrc();
  assert.match(collect, /FINDABILITY #410/);
  assert.match(collect, /Why does SIREN watch CERT-In and AI agent cyber incidents\?/);
  assert.match(collect, /CERT-In → \/tags\/agents\.html/);
  assert.match(collect, /! grep -qF 'CERT-In'/);
  assert.match(collect, /restored tags\/agents\.html CERT-In FAQ \(#410\)/);
  assert.match(collect, /tags\/agents\.html/);
  const newsFast = newsFastSrc();
  assert.match(newsFast, /FINDABILITY #410/);
  assert.match(newsFast, /Why does SIREN watch CERT-In and AI agent cyber incidents\?/);
  assert.match(newsFast, /CERT-In → \/tags\/agents\.html/);
  assert.match(newsFast, /! grep -qF 'CERT-In'/);
  assert.match(newsFast, /restore_cert_in_faq/);
  assert.match(newsFast, /restored tags\/agents\.html CERT-In FAQ \(#410\)/);
});

test('Publish restores tip Waymo Canada FAQ + routes (FINDABILITY #372)', () => {
  const collect = collectPublishSrc();
  assert.match(collect, /FINDABILITY #372/);
  assert.match(collect, /Why does SIREN watch Waymo Canada and Toronto robotaxis\?/);
  assert.match(collect, /Waymo Canada \/ Toronto robotaxi → \/lab\/waymo\.html/);
  assert.match(collect, /! grep -qF 'Waymo Canada'/);
  assert.match(collect, /restored lab\/waymo\.html Waymo Canada \/ Toronto FAQ \(#372\)/);
  const newsFast = newsFastSrc();
  assert.match(newsFast, /Why does SIREN watch Waymo Canada and Toronto robotaxis\?/);
  assert.match(newsFast, /Waymo Canada \/ Toronto robotaxi → \/lab\/waymo\.html/);
  assert.match(newsFast, /! grep -qF 'Waymo Canada'/);
  assert.match(newsFast, /restore_waymo_canada_faq/);
});

test('Publish restores tip SoftBank Allied FAQ + routes (FINDABILITY #374)', () => {
  const collect = collectPublishSrc();
  assert.match(collect, /FINDABILITY #374/);
  assert.match(collect, /Why does SIREN watch SoftBank Allied Universal talks\?/);
  assert.match(collect, /SoftBank \/ Allied Universal → \/lab\/softbank\.html/);
  assert.match(collect, /! grep -qF 'Allied Universal'/);
  assert.match(collect, /restored lab\/softbank\.html SoftBank Allied Universal FAQ \(#374\)/);
  const newsFast = newsFastSrc();
  assert.match(newsFast, /Why does SIREN watch SoftBank Allied Universal talks\?/);
  assert.match(newsFast, /SoftBank \/ Allied Universal → \/lab\/softbank\.html/);
  assert.match(newsFast, /! grep -qF 'Allied Universal'/);
  assert.match(newsFast, /restore_softbank_allied_faq/);
});

test('Publish restores tip SpaceX Starshield FAQ + routes (FINDABILITY #376)', () => {
  const collect = collectPublishSrc();
  assert.match(collect, /FINDABILITY #376/);
  assert.match(collect, /Why does SIREN watch SpaceX Starshield\?/);
  assert.match(collect, /SpaceX \/ Starshield → \/lab\/spacex\.html/);
  assert.match(collect, /! grep -qF 'Starshield'/);
  assert.match(collect, /restored lab\/spacex\.html SpaceX Starshield FAQ \(#376\)/);
  const newsFast = newsFastSrc();
  assert.match(newsFast, /Why does SIREN watch SpaceX Starshield\?/);
  assert.match(newsFast, /SpaceX \/ Starshield → \/lab\/spacex\.html/);
  assert.match(newsFast, /! grep -qF 'Starshield'/);
  assert.match(newsFast, /restore_spacex_starshield_faq/);
});

test('Publish restores tip Tesla Flying Roadster FAQ + routes (FINDABILITY #378)', () => {
  const collect = collectPublishSrc();
  assert.match(collect, /FINDABILITY #185\/#378/);
  assert.match(collect, /Why does SIREN watch Tesla Flying Roadster\?/);
  assert.match(collect, /Tesla Flying Roadster → \/lab\/tesla\.html/);
  assert.match(collect, /! grep -qF 'Flying Roadster'/);
  assert.match(
    collect,
    /restored lab\/tesla\.html Tesla \/ FSD \+ Flying Roadster FAQ \(#185\/#378\)/,
  );
  const newsFast = newsFastSrc();
  assert.match(newsFast, /Why does SIREN watch Tesla Flying Roadster\?/);
  assert.match(newsFast, /Tesla Flying Roadster → \/lab\/tesla\.html/);
  assert.match(newsFast, /! grep -qF 'Flying Roadster'/);
  assert.match(newsFast, /restore_tesla_faq/);
});

test('Publish restores tip Ondas-Palantir FAQ + routes (FINDABILITY #406)', () => {
  const collect = collectPublishSrc();
  assert.match(collect, /FINDABILITY #183\/#406/);
  assert.match(collect, /Why does SIREN watch Ondas-Palantir AI\?/);
  assert.match(collect, /Ondas \/ Palantir → \/lab\/palantir\.html/);
  assert.match(collect, /! grep -qF 'Ondas'/);
  assert.match(
    collect,
    /restored lab\/palantir\.html Palantir \/ AIP \+ Ondas FAQ \(#183\/#406\)/,
  );
  const newsFast = newsFastSrc();
  assert.match(newsFast, /Why does SIREN watch Ondas-Palantir AI\?/);
  assert.match(newsFast, /Ondas \/ Palantir → \/lab\/palantir\.html/);
  assert.match(newsFast, /! grep -qF 'Ondas'/);
  assert.match(newsFast, /restore_palantir_faq/);
});

test('Publish restores tip Surface Laptop Ultra FAQ + routes (FINDABILITY #414)', () => {
  const collect = collectPublishSrc();
  assert.match(collect, /FINDABILITY #171\/#220\/#414/);
  assert.match(collect, /Why does SIREN watch Surface Laptop Ultra\?/);
  assert.match(collect, /Surface Laptop Ultra → \/lab\/microsoft\.html/);
  assert.match(collect, /! grep -qF 'Surface Laptop Ultra'/);
  assert.match(
    collect,
    /restored lab\/microsoft\.html Microsoft Copilot \+ MAI-Base \+ Surface Laptop Ultra FAQ \(#171\/#220\/#414\)/,
  );
  const newsFast = newsFastSrc();
  assert.match(newsFast, /FINDABILITY #171\/#220\/#414/);
  assert.match(newsFast, /Why does SIREN watch Surface Laptop Ultra\?/);
  assert.match(newsFast, /Surface Laptop Ultra → \/lab\/microsoft\.html/);
  assert.match(newsFast, /! grep -qF 'Surface Laptop Ultra'/);
  assert.match(
    newsFast,
    /restored lab\/microsoft\.html Microsoft Copilot \+ MAI-Base \+ Surface Laptop Ultra FAQ \(#171\/#220\/#414\)/,
  );
});

test('Publish restores tip DeepSeek V4.1 Flash FAQ + routes (FINDABILITY #418)', () => {
  const collect = collectPublishSrc();
  assert.match(collect, /FINDABILITY #179\/#418/);
  assert.match(collect, /Why does SIREN watch DeepSeek V4\.1 Flash\?/);
  assert.match(collect, /DeepSeek V4\.1 Flash → \/lab\/deepseek\.html/);
  assert.match(collect, /! grep -qF 'DeepSeek V4\.1 Flash'/);
  assert.match(
    collect,
    /restored lab\/deepseek\.html DeepSeek outage \+ V4\.1 Flash FAQ \(#179\/#418\)/,
  );
  const newsFast = newsFastSrc();
  assert.match(newsFast, /FINDABILITY #179\/#418/);
  assert.match(newsFast, /Why does SIREN watch DeepSeek V4\.1 Flash\?/);
  assert.match(newsFast, /DeepSeek V4\.1 Flash → \/lab\/deepseek\.html/);
  assert.match(newsFast, /! grep -qF 'DeepSeek V4\.1 Flash'/);
  assert.match(
    newsFast,
    /restored lab\/deepseek\.html DeepSeek outage \+ V4\.1 Flash FAQ \(#179\/#418\)/,
  );
});

test('Publish restores tip Claude Mythos 5 FAQ + routes (FINDABILITY #420)', () => {
  const collect = collectPublishSrc();
  assert.match(collect, /FINDABILITY #163\/#362\/#366\/#368\/#392\/#397\/#402\/#408\/#412\/#420/);
  assert.match(collect, /Why does SIREN watch Claude Mythos 5\?/);
  assert.match(collect, /Claude Mythos 5 → \/lab\/anthropic\.html/);
  assert.match(collect, /! grep -qF 'Claude Mythos 5'/);
  assert.match(
    collect,
    /restored lab\/anthropic\.html Anthropic IPO \/ FTC \+ AI safety bill \+ Canadian DC \+ METR \+ ECDSA \+ Opus \+ Blackstone \+ Replit \+ Mythos FAQ \(#163\/#362\/#366\/#368\/#392\/#397\/#402\/#408\/#412\/#420\)/,
  );
  const newsFast = newsFastSrc();
  assert.match(newsFast, /FINDABILITY #163\/#362\/#366\/#368\/#392\/#397\/#402\/#408\/#412\/#420/);
  assert.match(newsFast, /Why does SIREN watch Claude Mythos 5\?/);
  assert.match(newsFast, /Claude Mythos 5 → \/lab\/anthropic\.html/);
  assert.match(newsFast, /! grep -qF 'Claude Mythos 5'/);
  assert.match(
    newsFast,
    /restored lab\/anthropic\.html Anthropic IPO \/ FTC \+ AI safety bill \+ Canadian DC \+ METR \+ ECDSA \+ Opus \+ Blackstone \+ Replit \+ Mythos FAQ \(#163\/#362\/#366\/#368\/#392\/#397\/#402\/#408\/#412\/#420\)/,
  );
});
