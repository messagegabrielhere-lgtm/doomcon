import { test } from 'node:test';
import assert from 'node:assert/strict';
import sa, { yahooBars, basketScalar, BASKET } from '../sources/stockanalysis.mjs';

const NOW = Date.parse('2026-10-08T15:00:00Z');
const T0 = Date.parse('2026-10-06T13:30:00Z') / 1000;

function yahooBody(closes, { gmtoffset = -14400, startTs = T0 } = {}) {
  return {
    chart: {
      result: [{
        meta: { gmtoffset },
        timestamp: closes.map((_, i) => startTs + i * 86400),
        indicators: { quote: [{ close: closes }] },
      }],
      error: null,
    },
  };
}

const SA_OK = { NVDA: 2, AMD: -4, TSM: 1, AVGO: -1 };

function router({ saFails = false, yahoo = {} } = {}) {
  const calls = [];
  const fn = async (url) => {
    calls.push(url);
    if (url.includes('stockanalysis.com')) {
      if (saFails) throw new Error('invalid JSON from https://stockanalysis.com (HTTP 200) — <!DOCTYPE html> Just a moment...');
      const t = url.split('/').pop();
      return { status: 200, data: { cp: SA_OK[t], p: 100, td: '2026-10-07', ms: 'open' } };
    }
    const t = decodeURIComponent(url.split('/chart/')[1].split('?')[0]);
    const r = yahoo[t];
    if (r instanceof Error) throw r;
    return r;
  };
  return { fn, calls };
}

test('primary provider: unchanged scalar and unit, provider recorded', async () => {
  const { fn } = router();
  const r = await sa.collect(fn, { now: NOW });
  assert.equal(r.value, 2);
  assert.equal(r.unit, 'mean_abs_percent_change');
  assert.equal(r.meta.provider, 'stockanalysis');
  assert.equal(r.meta.primary_error, undefined);
});

test('fallback to Yahoo chart computes the same scalar from the last two closes', async () => {
  const yahoo = {
    NVDA: yahooBody([100, 100, 102]),   // +2%
    AMD: yahooBody([50, 50, 48]),       // -4%
    TSM: yahooBody([200, 200, 202]),    // +1%
    AVGO: yahooBody([300, 300, 297]),   // -1%
  };
  const { fn, calls } = router({ saFails: true, yahoo });
  const r = await sa.collect(fn, { now: NOW });
  assert.ok(Math.abs(r.value - 2) < 1e-9);
  assert.equal(r.unit, 'mean_abs_percent_change');
  assert.equal(r.meta.provider, 'yahoo-chart');
  assert.match(r.meta.primary_error, /Cloudflare/);
  assert.ok(calls.some((u) => u.startsWith('https://query1.finance.yahoo.com/v8/finance/chart/NVDA?range=10d&interval=1d')));
  assert.equal(r.meta.quotes[0].trade_date, '2026-10-08');
});

test('Yahoo: null closes skipped, query2 tried when query1 fails', async () => {
  const yahoo = {
    NVDA: yahooBody([100, null, 102]),
    AMD: yahooBody([50, 50, 48]), TSM: yahooBody([200, 200, 202]), AVGO: yahooBody([300, 300, 297]),
  };
  let q1Failed = 0;
  const { fn: inner } = router({ saFails: true, yahoo });
  const fn = async (url, o) => {
    if (url.startsWith('https://query1') && url.includes('/AMD')) { q1Failed++; throw new Error('HTTP 429'); }
    return inner(url, o);
  };
  const r = await sa.collect(fn, { now: NOW });
  assert.equal(q1Failed, 1);
  assert.equal(r.meta.quotes[0].prev_close, 100);
  assert.ok(Math.abs(r.value - 2) < 1e-9);
});

test('both providers failing goes dark with both reasons', async () => {
  const yahoo = { NVDA: { chart: { result: null, error: { code: 'Not Found', description: 'No data' } } } };
  const { fn } = router({ saFails: true, yahoo });
  await assert.rejects(sa.collect(fn, { now: NOW }), (e) => /every provider failed/.test(e.message) && /stockanalysis:/.test(e.message) && /yahoo-chart:/.test(e.message));
});

test('stale Yahoo bars are refused, never read as a live move', async () => {
  const old = Date.parse('2026-09-01T13:30:00Z') / 1000;
  const yahoo = Object.fromEntries(BASKET.map((t) => [t, yahooBody([1, 2], { startTs: old })]));
  const { fn } = router({ saFails: true, yahoo });
  await assert.rejects(sa.collect(fn, { now: NOW }), /stale cache/);
});

test('yahooBars uses exchange-local dates and dedupes same-day bars', () => {
  const body = yahooBody([10, 11, 12]);
  body.chart.result[0].timestamp[2] = body.chart.result[0].timestamp[1] + 3600;
  const bars = yahooBars(body, 'X');
  assert.deepEqual(bars.map((b) => b.date), ['2026-10-06', '2026-10-07']);
  assert.equal(bars[1].close, 12);
});

test('basketScalar demands all four', () => {
  assert.throws(() => basketScalar([{ cp: 1 }]), /composition must be complete/);
});
