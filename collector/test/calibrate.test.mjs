import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  quantileSorted, quantileGrid, dayRange, basketMovesByTradeDate, liveEquivalentSeries,
  buildStockanalysisAddendum, build, addendaHash, MIN_COVERAGE_DAYS,
} from '../calibrate.mjs';
import { addendaHash as engineAddendaHash } from '../engine.mjs';

test('type-7 quantiles match numpy/R on a hand-checked sample', () => {
  const s = [1, 2, 3, 4, 10];
  assert.equal(quantileSorted(s, 0), 1);
  assert.equal(quantileSorted(s, 0.5), 3);
  assert.ok(Math.abs(quantileSorted(s, 0.9) - 7.6) < 1e-12); // numpy.quantile([1,2,3,4,10], .9) == 7.6
  assert.equal(quantileSorted(s, 0.25), 2);
  const g = quantileGrid(s);
  assert.equal(g.length, 101);
  assert.equal(g[0], 1);
  assert.equal(g[100], 10);
});

function weekdayBars(days, closeFn) {
  return days.filter((d) => ![0, 6].includes(new Date(`${d}T00:00:00Z`).getUTCDay())).map((d, i) => ({ date: d, close: closeFn(i) }));
}

test('basket move per trade date needs all four tickers; weekends read the last session', () => {
  const days = dayRange('2026-10-01', '2026-10-06'); // Thu..Tue
  const bars = {
    NVDA: weekdayBars(days, (i) => 100 * (1.02 ** i)),
    AMD: weekdayBars(days, (i) => 100 * (0.98 ** i)),
    TSM: weekdayBars(days, () => 100),
    AVGO: weekdayBars(days, () => 100).filter((b) => b.date !== '2026-10-05'),
  };
  const moves = basketMovesByTradeDate(bars);
  assert.ok(Math.abs(moves['2026-10-02'] - 1) < 1e-9);   // (2 + 2 + 0 + 0) / 4
  assert.equal(moves['2026-10-05'], null);                // AVGO missing -> gap, never a 3-name basket
  assert.equal(moves['2026-10-06'], null);                // AVGO's Tue bar vs Fri would be a 2-session move -> gap
  const series = liveEquivalentSeries(moves, days);
  assert.equal(series['2026-10-03'], series['2026-10-02']); // Saturday reads Friday
  assert.equal(series['2026-10-04'], series['2026-10-02']); // Sunday reads Friday
  assert.equal(series['2026-10-05'], null);                // incomplete session -> gap, not Friday's value
  assert.equal(series['2026-10-06'], null);
  assert.equal(series['2026-10-01'], null);                // no previous close in the data
});

test('stale beyond MAX_STALE_DAYS becomes a gap', () => {
  const series = liveEquivalentSeries({ '2026-01-01': 1.5 }, dayRange('2026-01-01', '2026-01-12'));
  assert.equal(series['2026-01-06'], 1.5);
  assert.equal(series['2026-01-07'], 1.5);   // age 7.0 days at end of day: not > 7
  assert.equal(series['2026-01-08'], null);
});

function twoYears() {
  const days = dayRange('2024-10-01', '2026-10-07');
  const mk = (k) => weekdayBars(days, (i) => 100 + k + 10 * Math.sin(i / 7 + k));
  return { NVDA: mk(0), AMD: mk(1), TSM: mk(2), AVGO: mk(3) };
}

test('stockanalysis addendum has the v1 entry shape and >= 300 days coverage', () => {
  const entry = buildStockanalysisAddendum(twoYears(), dayRange('2025-10-08', '2026-10-07'));
  for (const k of ['label', 'pillar', 'aliases', 'unit', 'accepted_units', 'method', 'params', 'n', 'coverage', 'min', 'max', 'median', 'quantiles']) {
    assert.ok(k in entry, k);
  }
  assert.equal(entry.unit, 'mean_abs_percent_change');
  assert.equal(entry.pillar, 'compute');
  assert.equal(entry.quantiles.length, 101);
  assert.ok(entry.n >= MIN_COVERAGE_DAYS);
  assert.ok(entry.params.trade_dates_in_window > 240 && entry.params.trade_dates_in_window < 270);
});

test('build(): stubbed fetch -> addenda file with hash, govuk listed unavailable', async () => {
  const bars = twoYears();
  const fetchJson = async (url) => {
    assert.match(url, /range=2y&interval=1d/);
    const t = decodeURIComponent(url.split('/chart/')[1].split('?')[0]);
    const b = bars[t];
    return { chart: { result: [{ meta: { gmtoffset: 0 }, timestamp: b.map((x) => Date.parse(`${x.date}T14:30:00Z`) / 1000), indicators: { quote: [{ close: b.map((x) => x.close) }] } }], error: null } };
  };
  const file = await build({ fetchJson, yesterday: '2026-10-07', builtAt: '2026-10-08T00:00:00.000Z', v1: { sources: { hn: {} } }, log: () => {} });
  assert.deepEqual(Object.keys(file.sources), ['stockanalysis']);
  const e = file.sources.stockanalysis;
  assert.equal(e.addendum_version, '1.0.0');
  assert.equal(e.built_at, '2026-10-08T00:00:00.000Z');
  assert.ok(e.method.length > 20);
  assert.equal(file.hash, addendaHash(file));
  assert.equal(file.hash, engineAddendaHash(file), 'engine and calibrate hash identically');
  assert.ok(file.unavailable.some((u) => u.id === 'govuk'));
  assert.equal(file.reference_window.from, '2025-10-08');
});

test('build(): fetch failure -> source listed unavailable, not invented', async () => {
  const file = await build({ fetchJson: async () => { throw new Error('HTTP 429'); }, yesterday: '2026-10-07', builtAt: 'x', log: () => {} });
  assert.deepEqual(file.sources, {});
  assert.match(file.unavailable.find((u) => u.id === 'stockanalysis').reason, /backfill failed/);
});

test('build(): thin coverage -> unavailable with the count', async () => {
  const days = dayRange('2026-06-01', '2026-10-07');
  const mk = (k) => weekdayBars(days, (i) => 100 + k + i);
  const bars = { NVDA: mk(0), AMD: mk(1), TSM: mk(2), AVGO: mk(3) };
  const fetchJson = async (url) => {
    const t = decodeURIComponent(url.split('/chart/')[1].split('?')[0]);
    const b = bars[t];
    return { chart: { result: [{ meta: { gmtoffset: 0 }, timestamp: b.map((x) => Date.parse(`${x.date}T14:30:00Z`) / 1000), indicators: { quote: [{ close: b.map((x) => x.close) }] } }], error: null } };
  };
  const file = await build({ fetchJson, yesterday: '2026-10-07', builtAt: 'x', log: () => {} });
  assert.match(file.unavailable.find((u) => u.id === 'stockanalysis').reason, /usable days.*need 300/);
});
