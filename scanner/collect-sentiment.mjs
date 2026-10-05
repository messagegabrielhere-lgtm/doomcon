// Sentiment snapshot for the scanner page's Sentiment tab (site/static/scanner.html).
//
// Runs in the scanner-stocks workflow after collect-stocks.mjs and writes
// sentiment.json next to the stock files on the scanner-data branch. Every
// source is optional: one that fails (rate limit, bot block) is recorded as
// null with its error and the rest still publish.
//
// Usage: node scanner/collect-sentiment.mjs <outdir>

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const OUT = process.argv[2] || 'scanner-out';
// Some of these hosts refuse obvious bots, so present as a browser.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const r1 = (x) => Math.round(x * 10) / 10;

// Symbols to sample on StockTwits besides the Reddit leaders.
const CORE = ['SPY', 'QQQ', 'NVDA', 'TSLA', 'AAPL', 'AMD', 'PLTR', 'MSFT', 'META', 'AMZN', 'GOOGL', 'MSTR', 'COIN', 'MU', 'SMCI'];

export async function build({ fetchImpl = fetch, gapMs = 400 } = {}) {
  const getJSON = async (url, headers = {}) => {
    const r = await fetchImpl(url, { headers: { 'User-Agent': UA, Accept: 'application/json', ...headers }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  };
  const errors = {};
  const attempt = async (name, fn) => {
    try { return await fn(); } catch (e) { errors[name] = e.message; return null; }
  };

  const cnn = await attempt('cnn', async () => {
    const j = await getJSON('https://production.dataviz.cnn.io/index/fearandgreed/graphdata', { Referer: 'https://www.cnn.com/', Origin: 'https://www.cnn.com' });
    const f = j.fear_and_greed;
    if (!Number.isFinite(f?.score)) throw new Error('no score');
    const part = (k) => (j[k] ? { score: r1(j[k].score), rating: j[k].rating } : null);
    return {
      score: r1(f.score), rating: f.rating, ts: f.timestamp,
      prev: { close: r1(f.previous_close), week: r1(f.previous_1_week), month: r1(f.previous_1_month), year: r1(f.previous_1_year) },
      parts: {
        'Market momentum': part('market_momentum_sp500'), 'Stock price strength': part('stock_price_strength'),
        'Stock price breadth': part('stock_price_breadth'), 'Put and call options': part('put_call_options'),
        'Market volatility': part('market_volatility_vix'), 'Safe haven demand': part('safe_haven_demand'),
        'Junk bond demand': part('junk_bond_demand'),
      },
      history: (j.fear_and_greed_historical?.data || []).slice(-180).map((p) => [Math.round(p.x), r1(p.y)]),
    };
  });

  const crypto = await attempt('crypto', async () => {
    const j = await getJSON('https://api.alternative.me/fng/?limit=90');
    const d = (j.data || []).map((x) => [Number(x.timestamp) * 1000, Number(x.value), x.value_classification]).reverse();
    if (!d.length) throw new Error('no data');
    return d;
  });

  const reddit = await attempt('reddit', async () => {
    const j = await getJSON('https://apewisdom.io/api/v1.0/filter/all-stocks/page/1');
    return (j.results || []).slice(0, 100).map((x) => ({ t: x.ticker, name: x.name, n: x.mentions, n0: x.mentions_24h_ago, r: x.rank, r0: x.rank_24h_ago, up: x.upvotes }));
  });

  const vix = await attempt('vix', async () => {
    const j = await getJSON('https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=1y');
    const res = j.chart?.result?.[0], q = res?.indicators?.quote?.[0];
    const t = [], c = [];
    (res?.timestamp || []).forEach((ts, i) => { if (Number.isFinite(q?.close?.[i])) { t.push(ts); c.push(Math.round(q.close[i] * 100) / 100); } });
    if (c.length < 60) throw new Error('too little VIX history');
    return { t, c };
  });

  const want = [...new Set([...(reddit || []).slice(0, 15).map((x) => x.t), ...CORE])].slice(0, 30);
  const stocktwits = {};
  let stFail = 0;
  for (const s of want) {
    if (stFail >= 3) { errors.stocktwits = errors.stocktwits || 'stopped after 3 failures'; break; }
    try {
      const j = await getJSON(`https://api.stocktwits.com/api/2/streams/symbol/${encodeURIComponent(s)}.json`);
      const m = j.messages || [];
      let bull = 0, bear = 0;
      for (const x of m) { const v = x.entities?.sentiment?.basic; if (v === 'Bullish') bull++; else if (v === 'Bearish') bear++; }
      const times = m.map((x) => Date.parse(x.created_at)).filter(Number.isFinite);
      const spanH = times.length > 1 ? (Math.max(...times) - Math.min(...times)) / 36e5 : null;
      stocktwits[s] = { bull, bear, n: m.length, spanH: spanH === null ? null : r1(spanH) };
    } catch (e) {
      stFail++; errors.stocktwits = e.message;
    }
    await sleep(gapMs);
  }

  return { generated: new Date().toISOString(), cnn, crypto, reddit, vix, stocktwits: Object.keys(stocktwits).length ? stocktwits : null, errors };
}

async function main() {
  const out = await build();
  for (const k of ['cnn', 'crypto', 'reddit', 'vix', 'stocktwits']) console.log(`${k}: ${out[k] ? 'ok' : 'missing'}${out.errors[k] ? ` (${out.errors[k]})` : ''}`);
  await mkdir(OUT, { recursive: true });
  await writeFile(path.join(OUT, 'sentiment.json'), JSON.stringify(out));
}

if (import.meta.url === `file://${process.argv[1]}`) main();
