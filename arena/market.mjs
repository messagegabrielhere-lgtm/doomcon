// Market data for the AI battle, no keys: crypto from the Coinbase Exchange
// public API, US stocks from Yahoo Finance's chart API.
//
// Coinbase is used rather than OKX or Binance because the runner is a GitHub
// Action on US infrastructure, and those two refuse US addresses.

import { isStock, STOCK_SPREAD_BPS } from './config.mjs';

const BASE = 'https://api.exchange.coinbase.com';
const UA = 'Mozilla/5.0 (compatible; siren-arena/1.0; +https://github.com/messagegabrielhere-lgtm/doomcon)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// One client for both markets: stock symbols (no "-USD") go to Yahoo.
export function makeClient(opts = {}) {
  const cb = coinbaseClient(opts), yh = yahooClient(opts);
  const pick = (sym) => (isStock(sym) ? yh : cb);
  return {
    candles: (sym, g, start) => pick(sym).candles(sym, g, start),
    stats: (sym) => pick(sym).stats(sym),
    book: (sym) => pick(sym).book(sym),
  };
}

export function coinbaseClient({ fetchImpl = fetch, gapMs = 150 } = {}) {
  let last = 0;
  // Public endpoints allow about 10 requests a second; stay well under it.
  async function get(path) {
    const wait = last + gapMs - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
    const r = await fetchImpl(BASE + path, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
    return r.json();
  }
  return {
    // [[time, low, high, open, close, volume], ...] newest first -> oldest-first objects
    async candles(sym, granularity, start) {
      const q = start ? `&start=${new Date(start).toISOString()}&end=${new Date().toISOString()}` : '';
      const rows = await get(`/products/${sym}/candles?granularity=${granularity}${q}`);
      return rows.map(([t, l, h, o, c, v]) => ({ t: t * 1000, o, h, l, c, v })).sort((a, b) => a.t - b.t);
    },
    stats: (sym) => get(`/products/${sym}/stats`),
    async book(sym) {
      const b = await get(`/products/${sym}/book?level=2`);
      const side = (rows) => (rows || []).map(([p, s]) => [+p, +s]);
      return { sym, at: Date.now(), bids: side(b.bids), asks: side(b.asks), open: true, venue: 'Coinbase order book, simulated fill' };
    },
  };
}

// Yahoo has no public order book. A stock "book" is the live last price with
// half of STOCK_SPREAD_BPS either side and depth no paper order can exhaust; its
// time is the quote's own time, so a closed market reads as a stale quote.
export function yahooClient({ fetchImpl = fetch, gapMs = 250 } = {}) {
  let last = 0;
  async function chart(sym, interval, range) {
    let err;
    for (const host of ['query1', 'query2']) {
      const wait = last + gapMs - Date.now();
      if (wait > 0) await sleep(wait);
      last = Date.now();
      try {
        const url = `https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=${interval}&range=${range}&includePrePost=false`;
        const r = await fetchImpl(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const res = (await r.json())?.chart?.result?.[0];
        if (!res) throw new Error('empty result');
        return res;
      } catch (e) { err = e; }
    }
    throw new Error(`${sym}: ${err.message}`);
  }
  const bars = (res) => {
    const q = res?.indicators?.quote?.[0] || {}, out = [];
    (res?.timestamp || []).forEach((t, i) => {
      const k = { t: t * 1000, o: q.open?.[i], h: q.high?.[i], l: q.low?.[i], c: q.close?.[i], v: q.volume?.[i] ?? 0 };
      if ([k.o, k.h, k.l, k.c].every(Number.isFinite)) out.push(k);
    });
    return out;
  };
  const isOpen = (meta, now = Date.now() / 1000) => {
    const p = meta?.currentTradingPeriod?.regular;
    return !!p && now >= p.start && now < p.end;
  };
  const hourly = new Map(); // one 60m fetch serves both candles(3600) and stats()
  const hourlyOf = (sym) => { if (!hourly.has(sym)) hourly.set(sym, chart(sym, '60m', '1mo')); return hourly.get(sym); };
  return {
    async candles(sym, granularity, start) {
      if (granularity === 3600) return bars(await hourlyOf(sym));
      const range = start && Date.now() - start > 20 * 3600e3 ? '5d' : '1d';
      return bars(await chart(sym, '1m', range));
    },
    async stats(sym) {
      const res = await hourlyOf(sym), m = res.meta || {}, b = bars(res);
      // Average daily dollar volume over the last five sessions stands in for 24h volume.
      const days = new Map();
      for (const k of b) { const d = new Date(k.t).toISOString().slice(0, 10); days.set(d, (days.get(d) || 0) + k.v * k.c); }
      const recent = [...days.values()].slice(-5);
      const dollars = recent.length ? recent.reduce((a, x) => a + x, 0) / recent.length : 0;
      const lastPx = m.regularMarketPrice ?? b.at(-1)?.c;
      return { last: lastPx, open: m.chartPreviousClose ?? m.previousClose, high: m.regularMarketDayHigh, low: m.regularMarketDayLow,
        volume: lastPx ? dollars / lastPx : 0, open_: isOpen(m) };
    },
    async book(sym) {
      const res = await chart(sym, '1m', '1d'), m = res.meta || {};
      const p = m.regularMarketPrice ?? bars(res).at(-1)?.c;
      const half = p * STOCK_SPREAD_BPS / 2 / 1e4;
      const open = isOpen(m);
      return { sym, at: m.regularMarketTime ? m.regularMarketTime * 1000 : 0, bids: p ? [[p - half, 1e12]] : [], asks: p ? [[p + half, 1e12]] : [],
        open, venue: `Yahoo Finance last price ±${STOCK_SPREAD_BPS / 2} bps, simulated fill` };
    },
  };
}

export function rsi(closes, n = 14) {
  if (closes.length <= n) return null;
  let g = 0, l = 0;
  for (let i = 1; i <= n; i++) { const d = closes[i] - closes[i - 1]; if (d > 0) g += d; else l -= d; }
  g /= n; l /= n;
  for (let i = n + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    g = (g * (n - 1) + Math.max(d, 0)) / n;
    l = (l * (n - 1) + Math.max(-d, 0)) / n;
  }
  return l === 0 ? 100 : 100 - 100 / (1 + g / l);
}
const sma = (xs, n) => (xs.length < n ? null : xs.slice(-n).reduce((a, b) => a + b, 0) / n);
function atr(c, n = 14) {
  if (c.length <= n) return null;
  const tr = c.slice(1).map((k, i) => Math.max(k.h - k.l, Math.abs(k.h - c[i].c), Math.abs(k.l - c[i].c)));
  return sma(tr, n);
}
const r2 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 100) / 100);

// One row per symbol: what an agent sees. Hourly candles drive the indicators.
export function summarize(sym, hourly, stats) {
  const closes = hourly.map((k) => k.c);
  const last = +stats?.last || closes.at(-1);
  // Look back by time, not bar count: stock hours have gaps, crypto hours don't.
  const tEnd = hourly.at(-1)?.t ?? 0;
  const at = (h) => { let v = null; for (const k of hourly) { if (k.t <= tEnd - h * 3600e3) v = k.c; else break; } return v; };
  const pct = (a, b) => (a && b ? (a / b - 1) * 100 : null);
  const s20 = sma(closes, 20), s50 = sma(closes, 50), a = atr(hourly);
  const stock = isStock(sym);
  return {
    sym, last, type: stock ? 'stock' : 'crypto', open: stock ? !!stats?.open_ : true,
    chg1h: r2(pct(last, at(1))), chg24h: r2(pct(last, +stats?.open || at(24))), chg7d: r2(pct(last, at(168))),
    rsi14h: r2(rsi(closes)),
    vsSma20hPct: r2(pct(last, s20)), vsSma50hPct: r2(pct(last, s50)),
    atr14hPct: r2(a && (a / last) * 100),
    hi24h: +stats?.high || null, lo24h: +stats?.low || null,
    vol24hUsd: Math.round((+stats?.volume || 0) * last),
  };
}

export async function snapshot(client, universe, log = () => {}) {
  const rows = [], errors = {};
  for (const sym of universe) {
    try {
      const [hourly, stats] = [await client.candles(sym, 3600), await client.stats(sym)];
      if (hourly.length < 60) throw new Error(`only ${hourly.length} hourly candles`);
      rows.push(summarize(sym, hourly, stats));
    } catch (e) { errors[sym] = String(e.message || e); log(`market: ${sym} skipped (${errors[sym]})`); }
  }
  return { at: Date.now(), rows, errors };
}

// Walk one side of the book for `qty` units. Returns the average price and
// whether the book was deep enough. For a buy that's the asks, for a sell the bids.
export function walk(levels, qty) {
  let left = qty, cost = 0;
  for (const [p, s] of levels) {
    const take = Math.min(left, s);
    cost += take * p; left -= take;
    if (left <= 1e-12) break;
  }
  const filled = qty - Math.max(left, 0);
  return { filled, avg: filled > 0 ? cost / filled : null, full: left <= 1e-12 };
}
// Units bought by spending `usd` on the asks.
export function qtyForUsd(asks, usd) {
  let left = usd, qty = 0;
  for (const [p, s] of asks) {
    const take = Math.min(left / p, s);
    qty += take; left -= take * p;
    if (left <= 1e-9) break;
  }
  return { qty, full: left <= 1e-9 };
}
export const mid = (book) => (book.bids[0] && book.asks[0] ? (book.bids[0][0] + book.asks[0][0]) / 2 : null);
