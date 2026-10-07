// Stock snapshot for the Capitulation Scanner page (site/static/scanner.html).
//
// Browsers can't call Yahoo's chart API directly (no CORS), so this runs in a
// GitHub Action, fetches daily and hourly candles for a fixed universe, and
// writes compact JSON that the page reads from the scanner-data branch via
// raw.githubusercontent.com. It is separate from the SIREN pipeline: it touches
// nothing under collector/ or data/ and never commits to main.
//
// Usage: node scanner/collect-stocks.mjs <outdir>

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const OUT = process.argv[2] || 'scanner-out';

// [ticker, sector]. Large US names plus the ETFs people scan against.
export const UNIVERSE = [
  ['AAPL','Technology'],['MSFT','Technology'],['NVDA','Technology'],['AVGO','Technology'],['ORCL','Technology'],
  ['CRM','Technology'],['ADBE','Technology'],['AMD','Technology'],['INTC','Technology'],['CSCO','Technology'],
  ['QCOM','Technology'],['TXN','Technology'],['IBM','Technology'],['NOW','Technology'],['INTU','Technology'],
  ['AMAT','Technology'],['MU','Technology'],['PLTR','Technology'],['ANET','Technology'],['PANW','Technology'],
  ['GOOGL','Communication'],['META','Communication'],['NFLX','Communication'],['DIS','Communication'],
  ['TMUS','Communication'],['VZ','Communication'],['T','Communication'],['CMCSA','Communication'],
  ['AMZN','Consumer'],['TSLA','Consumer'],['HD','Consumer'],['MCD','Consumer'],['NKE','Consumer'],
  ['SBUX','Consumer'],['LOW','Consumer'],['BKNG','Consumer'],['TJX','Consumer'],
  ['WMT','Staples'],['COST','Staples'],['PG','Staples'],['KO','Staples'],['PEP','Staples'],['PM','Staples'],
  ['MDLZ','Staples'],['CL','Staples'],
  ['LLY','Health care'],['UNH','Health care'],['JNJ','Health care'],['ABBV','Health care'],['MRK','Health care'],
  ['PFE','Health care'],['TMO','Health care'],['ABT','Health care'],['DHR','Health care'],['AMGN','Health care'],
  ['ISRG','Health care'],['GILD','Health care'],
  ['JPM','Financials'],['BAC','Financials'],['WFC','Financials'],['GS','Financials'],['MS','Financials'],
  ['C','Financials'],['BLK','Financials'],['SCHW','Financials'],['AXP','Financials'],['V','Financials'],
  ['MA','Financials'],['PYPL','Financials'],['BRK-B','Financials'],
  ['CAT','Industrials'],['DE','Industrials'],['GE','Industrials'],['HON','Industrials'],['UPS','Industrials'],
  ['RTX','Industrials'],['LMT','Industrials'],['BA','Industrials'],['UNP','Industrials'],
  ['XOM','Energy'],['CVX','Energy'],['COP','Energy'],['SLB','Energy'],['OXY','Energy'],
  ['NEE','Utilities'],['DUK','Utilities'],['SO','Utilities'],
  ['PLD','Real estate'],['AMT','Real estate'],
  ['LIN','Materials'],['FCX','Materials'],['NEM','Materials'],
  ['COIN','Crypto-linked'],['MSTR','Crypto-linked'],['HOOD','Crypto-linked'],
  ['SPY','ETF'],['QQQ','ETF'],['IWM','ETF'],['DIA','ETF'],['XLK','ETF'],['XLF','ETF'],['XLE','ETF'],
  ['XLV','ETF'],['XLY','ETF'],['XLP','ETF'],['XLI','ETF'],['XLU','ETF'],['XLB','ETF'],['XLRE','ETF'],
  ['XLC','ETF'],['SMH','ETF'],['ARKK','ETF'],['TLT','ETF'],['GLD','ETF'],['SLV','ETF'],['USO','ETF'],
  ['HYG','ETF'],['EEM','ETF'],
  // AI names not covered above, for the page's AI stocks tab
  ['TSM','Technology'],['ASML','Technology'],['ARM','Technology'],['MRVL','Technology'],['LRCX','Technology'],
  ['KLAC','Technology'],['SNPS','Technology'],['CDNS','Technology'],['TER','Technology'],['SMCI','Technology'],
  ['DELL','Technology'],['HPE','Technology'],['SNOW','Technology'],['MDB','Technology'],['DDOG','Technology'],
  ['NET','Technology'],['CRWD','Technology'],['ZS','Technology'],['PATH','Technology'],['AI','Technology'],
  ['SOUN','Technology'],['IONQ','Technology'],['RGTI','Technology'],
  ['VRT','Industrials'],['ETN','Industrials'],['SYM','Industrials'],
  ['CEG','Utilities'],['VST','Utilities'],
  ['EQIX','Real estate'],['DLR','Real estate'],
  ['BOTZ','ETF'],['AIQ','ETF'],['IGV','ETF'],
];

const FRAMES = [
  { file: 'stocks-1d.json', interval: '1d', range: '2y', maxBars: 300, barSec: 86400 },
  { file: 'stocks-1h.json', interval: '60m', range: '60d', maxBars: 300, barSec: 3600 },
];

const UA = 'Mozilla/5.0 (compatible; capitulation-scanner/1.0; +https://github.com/messagegabrielhere-lgtm/doomcon)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function chart(sym, interval, range, fetchImpl = fetch) {
  let last;
  for (const host of ['query1', 'query2']) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const url = `https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=${interval}&range=${range}&includePrePost=false`;
        const r = await fetchImpl(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
        if (r.status === 429) { last = new Error('HTTP 429'); await sleep(2000 * (attempt + 1)); continue; }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        const res = j?.chart?.result?.[0];
        if (!res) throw new Error(j?.chart?.error?.description || 'empty result');
        return res;
      } catch (e) {
        last = e;
        await sleep(400);
      }
    }
  }
  throw last;
}

const round = (p) => {
  const a = Math.abs(p);
  const dp = a >= 100 ? 2 : a >= 1 ? 3 : 5;
  return Number(p.toFixed(dp));
};

// Keep complete bars only: drop rows with gaps, and the bar still forming.
export function pack(res, frame, nowSec = Date.now() / 1000) {
  const q = res?.indicators?.quote?.[0] || {};
  const ts = res?.timestamp || [];
  const rows = [];
  for (let i = 0; i < ts.length; i++) {
    const o = q.open?.[i], h = q.high?.[i], l = q.low?.[i], c = q.close?.[i], v = q.volume?.[i];
    if (![o, h, l, c, v].every(Number.isFinite)) continue;
    rows.push([ts[i], o, h, l, c, v]);
  }
  const sessionStart = res?.meta?.currentTradingPeriod?.regular?.start;
  const sessionEnd = res?.meta?.currentTradingPeriod?.regular?.end;
  const lastRow = rows[rows.length - 1];
  if (lastRow) {
    // A daily bar is forming only if it belongs to the current session. Before
    // the open, the current session is today's and yesterday's bar is complete;
    // the old "within 24 hours" test dropped it every morning until the open.
    const forming = frame.interval === '1d'
      ? Number.isFinite(sessionEnd) && nowSec < sessionEnd && (Number.isFinite(sessionStart) ? lastRow[0] >= sessionStart - 3600 : lastRow[0] > nowSec - 86400)
      : nowSec < lastRow[0] + frame.barSec && (!Number.isFinite(sessionEnd) || nowSec < sessionEnd);
    if (forming) rows.pop();
  }
  const keep = rows.slice(-frame.maxBars);
  return {
    t: keep.map((r) => r[0]),
    o: keep.map((r) => round(r[1])),
    h: keep.map((r) => round(r[2])),
    l: keep.map((r) => round(r[3])),
    c: keep.map((r) => round(r[4])),
    v: keep.map((r) => Math.round(r[5])),
  };
}

export async function collect({ fetchImpl = fetch, universe = UNIVERSE, gapMs = 150 } = {}) {
  const out = {};
  for (const frame of FRAMES) {
    const symbols = [];
    const failed = [];
    let next = 0;
    const worker = async () => {
      while (next < universe.length) {
        const [s, sec] = universe[next++];
        try {
          const res = await chart(s, frame.interval, frame.range, fetchImpl);
          const d = pack(res, frame);
          if (d.c.length < 60) throw new Error(`only ${d.c.length} bars`);
          symbols.push({ s, n: res.meta?.shortName || res.meta?.longName || s, sec, ...d });
        } catch (e) {
          failed.push(`${s}: ${e.message}`);
        }
        await sleep(gapMs);
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    symbols.sort((a, b) => universe.findIndex((u) => u[0] === a.s) - universe.findIndex((u) => u[0] === b.s));
    out[frame.file] = { generated: new Date().toISOString(), interval: frame.interval, source: 'Yahoo Finance chart API (delayed)', symbols, failed };
  }
  return out;
}

async function main() {
  const out = await collect();
  let ok = true;
  for (const [file, body] of Object.entries(out)) {
    console.log(`${file}: ${body.symbols.length} of ${UNIVERSE.length} symbols${body.failed.length ? `; failed: ${body.failed.slice(0, 8).join(', ')}` : ''}`);
    // Refuse to publish a mostly-empty snapshot; the branch keeps the last good one.
    if (body.symbols.length < UNIVERSE.length * 0.5) ok = false;
  }
  if (!ok) { console.error('Too many symbols failed; not writing a snapshot.'); process.exit(1); }
  await mkdir(OUT, { recursive: true });
  for (const [file, body] of Object.entries(out)) await writeFile(path.join(OUT, file), JSON.stringify(body));
  await writeFile(path.join(OUT, 'README.md'), `# scanner-data\n\nGenerated by scanner/collect-stocks.mjs on main. Force-pushed on every run; do not edit.\nLast run: ${new Date().toISOString()}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
