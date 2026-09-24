// THROWAWAY. Exercises site/templates/_charts.mjs with realistic and
// degenerate inputs, asserts nothing throws and every chart produces real SVG,
// and writes a visual preview. Deleted after the run.
//
//   docker run --rm -v "$PWD":/app -w /app node:20-alpine node _charts-harness.mjs

import { writeFile } from 'node:fs/promises';
import {
  indexHistoryChart, pillarRanked, pillarRadar, sparkline, gauge,
  distributionStrip, PILLAR_GLYPH,
} from './site/templates/_charts.mjs';
import { css } from './site/styles.mjs';

let checks = 0;
let fails = 0;
function ok(name, cond, detail = '') {
  checks += 1;
  if (!cond) { fails += 1; console.error(`  FAIL  ${name}${detail ? ` -- ${detail}` : ''}`); }
}

function assertChart(name, html, { expectSvg = true } = {}) {
  ok(`${name}: returns a string`, typeof html === 'string');
  ok(`${name}: non-empty`, typeof html === 'string' && html.length > 120, `len=${html && html.length}`);
  if (expectSvg) {
    ok(`${name}: has <svg`, html.includes('<svg'));
    ok(`${name}: closes </svg>`, html.includes('</svg>'));
    ok(`${name}: has viewBox`, html.includes('viewBox='));
    ok(`${name}: has preserveAspectRatio`, html.includes('preserveAspectRatio='));
    ok(`${name}: preserveAspectRatio is not "none"`, !html.includes('preserveAspectRatio="none"'));
    ok(`${name}: has <title>`, /<title id="[^"]+">[^<]+<\/title>/.test(html));
    ok(`${name}: has <desc>`, /<desc id="[^"]+">[^<]+<\/desc>/.test(html));
    ok(`${name}: role=img`, html.includes('role="img"'));
    ok(`${name}: aria-labelledby`, html.includes('aria-labelledby='));
  }
  ok(`${name}: no NaN`, !/NaN/.test(html), (html.match(/.{0,40}NaN.{0,40}/) || [''])[0]);
  ok(`${name}: no undefined`, !/undefined/.test(html));
  ok(`${name}: no [object Object]`, !html.includes('[object Object]'));
  ok(`${name}: no unresolved placeholder`, !html.includes('__T__') && !html.includes('__D__'));
  return html;
}

// --- fixtures ---------------------------------------------------------------

// 48 realistic observations, engine-shaped (history.ndjson uses "t"), walking
// from ROUTINE up through ELEVATED and back, so the level-change marks fire.
const realHistory = [];
{
  const start = Date.parse('2026-09-21T00:00:00.000Z');
  const walk = [40.9, 41.3, 42.0, 41.6, 43.1, 44.8, 46.2, 45.9, 47.3, 49.0,
    50.4, 52.1, 53.8, 54.6, 55.9, 57.2, 58.8, 60.1, 61.4, 62.0,
    61.2, 63.5, 65.1, 66.4, 67.9, 69.2, 70.4, 71.1, 70.2, 68.8,
    67.1, 65.9, 64.2, 62.8, 61.1, 59.7, 58.2, 57.0, 56.1, 55.4,
    54.2, 53.1, 52.0, 51.3, 50.8, 49.9, 48.7, 47.6];
  walk.forEach((score, i) => {
    realHistory.push({
      t: new Date(start + i * 3600 * 1000).toISOString(),
      score,
      level: score >= 85 ? 1 : score >= 70 ? 2 : score >= 55 ? 3 : score >= 35 ? 4 : 5,
      pillars: {},
    });
  });
}

const realPillars = [
  { id: 'capability', score: 71.2, percentile: 0.93, sources_ok: 4, sources_total: 4, dark: false },
  { id: 'compute', score: 50.3, percentile: 0.5099, sources_ok: 1, sources_total: 3, dark: false },
  { id: 'attention', score: 41.2, percentile: 0.2622, sources_ok: 2, sources_total: 2, dark: false },
  { id: 'governance', score: 53.2, percentile: 0.6, sources_ok: 1, sources_total: 2, dark: false },
  { id: 'markets', score: null, percentile: null, sources_ok: 0, sources_total: 2, dark: false, uncalibrated: true },
];

const allDarkPillars = realPillars.map((p) => ({ ...p, score: null, dark: true, uncalibrated: false, sources_ok: 0 }));

const realSeries = realHistory.slice(-24).map((r) => r.score);

// --- realistic ---------------------------------------------------------------
const blocks = [];
const B = (h2, html) => blocks.push(`<h2>${h2}</h2>${html}`);

console.log('\nrealistic data');
B('indexHistoryChart · 48 observations', assertChart('history/48', indexHistoryChart(realHistory)));
B('gauge · 61.4', assertChart('gauge/61.4', gauge(61.4)));
B('gauge · 92.7 (UNPRECEDENTED)', assertChart('gauge/92.7', gauge(92.7)));
B('gauge · 12.0 (DORMANT)', assertChart('gauge/12', gauge(12)));
B('pillarRanked · four live, one awaiting baseline', assertChart('rank/real', pillarRanked(realPillars)));
B('distributionStrip · 93rd percentile', assertChart('dist/0.93', distributionStrip(0.93, { score: 71.2 })));
B('distributionStrip · 9th percentile', assertChart('dist/0.09', distributionStrip(0.0905, { score: 33.3 })));
B('distributionStrip · percentile only, score derived', assertChart('dist/derived', distributionStrip(0.5099)));
B('sparkline · 24 points', `<div style="max-width:300px">${assertChart('spark/24', sparkline(realSeries, { label: 'Capability score history' }))}</div>`);

// --- degenerate --------------------------------------------------------------
console.log('degenerate data');
B('indexHistoryChart · EMPTY', assertChart('history/empty', indexHistoryChart([])));
B('indexHistoryChart · ONE observation (cold start)', assertChart('history/one', indexHistoryChart([{ t: '2026-09-23T20:04:22.390Z', score: 40.8644, level: 4 }])));
B('indexHistoryChart · two identical scores', assertChart('history/flat', indexHistoryChart([
  { t: '2026-09-23T20:00:00.000Z', score: 40.9, level: 4 },
  { t: '2026-09-23T21:00:00.000Z', score: 40.9, level: 4 },
])));
B('indexHistoryChart · rows with no timestamps', assertChart('history/bare', indexHistoryChart([40, 45, 50, 55, 60])));
B('indexHistoryChart · all-null scores', assertChart('history/allnull', indexHistoryChart([
  { t: '2026-09-23T20:00:00.000Z', score: null }, { t: '2026-09-23T21:00:00.000Z', score: null },
])));
B('indexHistoryChart · identical timestamps', assertChart('history/sameTs', indexHistoryChart([
  { t: '2026-09-23T20:00:00.000Z', score: 40 }, { t: '2026-09-23T20:00:00.000Z', score: 44 },
])));
B('indexHistoryChart · garbage rows', assertChart('history/garbage', indexHistoryChart([
  null, undefined, 'x', {}, { score: 'no' }, { score: NaN }, { t: 'not-a-date', score: 50 },
])));
B('indexHistoryChart · not an array', assertChart('history/notarray', indexHistoryChart(undefined)));
B('indexHistoryChart · score out of range', assertChart('history/oob', indexHistoryChart([
  { t: '2026-09-23T20:00:00.000Z', score: -20 }, { t: '2026-09-23T21:00:00.000Z', score: 140 },
])));

B('gauge · null score', assertChart('gauge/null', gauge(null)));
B('gauge · 0', assertChart('gauge/0', gauge(0)));
B('gauge · 100', assertChart('gauge/100', gauge(100)));
B('gauge · NaN', assertChart('gauge/NaN', gauge(NaN)));

B('pillarRanked · every pillar dark', assertChart('rank/alldark', pillarRanked(allDarkPillars)));
B('pillarRanked · empty array', assertChart('rank/empty', pillarRanked([])));
B('pillarRanked · not an array', assertChart('rank/notarray', pillarRanked(null)));
B('pillarRanked · unknown pillar id', assertChart('rank/unknown', pillarRanked([{ id: 'weather', score: 55 }])));
B('pillarRadar alias · same output', assertChart('radar/alias', pillarRadar(realPillars)));

B('distributionStrip · null (awaiting baseline)', assertChart('dist/null', distributionStrip(null)));
B('distributionStrip · null, source dark', assertChart('dist/dark', distributionStrip(null, { missing: 'dark' })));
B('distributionStrip · p=0', assertChart('dist/0', distributionStrip(0)));
B('distributionStrip · p=1', assertChart('dist/1', distributionStrip(1)));
B('distributionStrip · NaN', assertChart('dist/NaN', distributionStrip(NaN)));

B('sparkline · empty', `<div style="max-width:300px">${assertChart('spark/empty', sparkline([], { label: 'Markets score history' }))}</div>`);
B('sparkline · all null', `<div style="max-width:300px">${assertChart('spark/allnull', sparkline([null, null, null], { label: 'Markets score history' }))}</div>`);
B('sparkline · single point', `<div style="max-width:300px">${assertChart('spark/one', sparkline([40.86], { label: 'Capability score history' }))}</div>`);
B('sparkline · flat series', `<div style="max-width:300px">${assertChart('spark/flat', sparkline([50, 50, 50, 50], { label: 'Flat' }))}</div>`);
B('sparkline · not an array', `<div style="max-width:300px">${assertChart('spark/notarray', sparkline(undefined))}</div>`);
B('sparkline · tiny wiggle (min-span floor)', `<div style="max-width:300px">${assertChart('spark/wiggle', sparkline([50.0, 50.1, 50.05, 50.2, 50.1], { label: 'Tiny' }))}</div>`);

// --- semantic assertions -----------------------------------------------------
console.log('semantics');
const cold = indexHistoryChart([{ t: '2026-09-23T20:04:22.390Z', score: 40.8644, level: 4 }]);
ok('cold start says "history begins here"', cold.includes('history begins here'));
ok('cold start does not claim a trend', !cold.includes('observations'));
ok('cold start names the band', cold.includes('ROUTINE'));

// Regression: null/''/false/[] must be GAPS, not measurements of zero.
for (const [name, v] of [['null', null], ['empty string', ''], ['false', false], ['empty array', []], ['undefined', undefined]]) {
  const h = indexHistoryChart([{ t: '2026-09-23T20:00:00.000Z', score: v }, { t: '2026-09-23T21:00:00.000Z', score: v }]);
  ok(`history: score ${name} is a gap, not zero`, !/now 0\.0|range 0\.0/.test(h), 'coerced to 0');
  ok(`history: score ${name} reports no observations`, /No scored observations/i.test(h));
}
ok('history: mixed null and real keeps only the real one', /1 observation/.test(
  indexHistoryChart([{ t: '2026-09-23T20:00:00.000Z', score: null }, { t: '2026-09-23T21:00:00.000Z', score: 62.5 }])));
ok('sparkline: all-null is not a zero line', /no history yet/.test(sparkline([null, null, null])));
ok('gauge: null is not a zero', !gauge(null).includes('DORMANT'));
ok('pillarRanked: null score is not a zero bar', !/>0\.0</.test(pillarRanked([{ id: 'markets', score: null, uncalibrated: true }])));

const empty = indexHistoryChart([]);
ok('empty chart still draws all five bands', (empty.match(/class="ch-band/g) || []).length >= 10);
ok('empty chart says no observations', /No scored observations/i.test(empty));

const uncal = distributionStrip(null);
const darkStrip = distributionStrip(null, { missing: 'dark' });
ok('awaiting-baseline and dark are DIFFERENT states', uncal !== darkStrip);
ok('awaiting-baseline says so', /AWAITING BASELINE/.test(uncal));
ok('dark says so', /SOURCE DARK/.test(darkStrip));
ok('neither renders as a zero', !/>0<\/text>/.test(uncal.replace(/ch-d-ax[\s\S]*?<\/text>/g, '')));

const rank = pillarRanked(realPillars);
ok('ranked chart sorts capability (71.2) first', rank.indexOf('Capability') < rank.indexOf('Governance'));
ok('ranked chart sinks the unscored pillar last', rank.indexOf('Markets') > rank.indexOf('Attention'));
ok('unscored pillar is labelled, not zeroed', /AWAITING BASELINE/.test(rank));
ok('ranked chart carries pillar glyphs', Object.values(PILLAR_GLYPH).every((g) => rank.includes(g)));

const g = gauge(61.4);
ok('gauge names its band in text', g.includes('ELEVATED'));
ok('gauge prints the number', g.includes('61.4'));
ok('gauge marks the live segment with a class, not only a colour', g.includes('ch-g-seg--live'));

// Determinism: same input, byte-identical output, twice.
ok('indexHistoryChart deterministic', indexHistoryChart(realHistory) === indexHistoryChart(realHistory));
ok('pillarRanked deterministic', pillarRanked(realPillars) === pillarRanked(realPillars));
ok('gauge deterministic', gauge(61.4) === gauge(61.4));
ok('sparkline deterministic', sparkline(realSeries) === sparkline(realSeries));
ok('distributionStrip deterministic', distributionStrip(0.93) === distributionStrip(0.93));

// Style contract the feed/reel agent is writing markup against.
const sheet = css();
for (const hook of ['.feed', '.feed__row', '.reel', '.reel__card', '.pillar-tag', '.chip--x',
  '.chip--kalshi', '.chip--polymarket', '.layout-split', '.ch__svg', '.ch__cap',
  '.spark__line', '.ch-g-seg', '.ch-r-bar', '.ch-d-curve', 'prefers-reduced-motion',
  'tabular-nums', '--t-xs', '--s-4']) {
  ok(`stylesheet exports ${hook}`, sheet.includes(hook));
}
console.log(`  stylesheet ${(sheet.length / 1024).toFixed(1)} KB raw`);

// --- preview -----------------------------------------------------------------
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>DOOMCON chart harness</title><style>${sheet}
body{padding:24px 16px 80px}h2{font-family:var(--mono);font-size:11px;letter-spacing:.14em;
text-transform:uppercase;color:var(--ink-faint);margin:36px 0 10px;font-weight:500}
.panes{display:grid;gap:24px}@media(min-width:900px){.panes{grid-template-columns:1fr 1fr}}
.pane{padding:16px;border:1px solid var(--rule);border-radius:3px;background:var(--bg);color:var(--ink)}
.pane[data-theme="light"]{--bg:#faf9f6;--bg-raised:#fff;--bg-sunken:#f1efe9;--ink:#14161a;
--ink-dim:#545a62;--ink-faint:#838a93;--rule:#e0ddd5;--rule-soft:#eeebe4;--accent:#9a5a00;
--accent-ink:#fff;--ok:#17714a;--stale:#8a5a00;--dark-src:#b3261e;
--wash:rgba(20,22,26,.046);--wash-alt:rgba(20,22,26,.022);--wash-live:rgba(154,90,0,.105);--fill:rgba(154,90,0,.13)}
.pane[data-theme="dark"]{--bg:#0b0c0e;--bg-raised:#131519;--bg-sunken:#08090a;--ink:#e8eaee;
--ink-dim:#9aa2ad;--ink-faint:#6a717b;--rule:#23262c;--rule-soft:#191c21;--accent:#ffb020;
--accent-ink:#0b0c0e;--ok:#5fd08a;--stale:#ffb020;--dark-src:#ff6b6b;
--wash:rgba(232,234,238,.042);--wash-alt:rgba(232,234,238,.021);--wash-live:rgba(255,176,32,.115);--fill:rgba(255,176,32,.15)}
.pane>h1{font-family:var(--mono);font-size:12px;letter-spacing:.2em;margin:0 0 4px}</style></head>
<body><div class="panes">
<div class="pane" data-theme="dark"><h1>DARK</h1>${blocks.join('')}</div>
<div class="pane" data-theme="light"><h1>LIGHT</h1>${blocks.join('')}</div>
</div></body></html>`;
await writeFile('_charts-harness.html', html);

console.log(`\n${checks - fails}/${checks} checks passed.`);
console.log('preview: _charts-harness.html\n');
if (fails) process.exitCode = 1;
