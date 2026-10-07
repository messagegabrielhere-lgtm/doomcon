// A small summary of the daily stock picks, for pages that only need the
// headline (the homepage band): today's picks, the pick of the day, where each
// stands since the open, and the track record in four numbers.
//
// It runs the exact picks engine the arena page runs: the block between
// /* picks:begin */ and /* picks:end */ in site/static/arena.html, so the two
// can never disagree. Reads stocks-1d.json and quotes.json from the scanner
// output directory and writes picks.json next to them.
//
//   node scanner/picks.mjs <dir>

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function loadEngine(file = new URL('../site/static/arena.html', import.meta.url)) {
  const html = await readFile(file, 'utf8');
  const a = html.indexOf('/* picks:begin'), b = html.indexOf('/* picks:end */');
  if (a < 0 || b < a) throw new Error('picks engine block not found in arena.html');
  return new Function(`${html.slice(a, b)}; return { PK, pkPrep, pkScore, pkPicksOn, pkOutcome, pkHistory, pkStats, pkLive, pkAppendToday };`)();
}

const nyKey = (ms) => new Date(ms).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
const nextWeekday = (ms) => { let d = ms + 86400e3; while ([0, 6].includes(new Date(d).getUTCDay())) d += 86400e3; return d; };
const r = (x, d = 2) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 10 ** d) / 10 ** d);

export function summarize(E, daily, quotes) {
  const raw = daily.symbols.filter((s) => s.c?.length >= E.PK.minBars);
  const prepped = raw.map(E.pkPrep);
  const spy = prepped.find((s) => s.s === 'SPY');
  if (!spy) throw new Error('no SPY series');
  const hist = E.pkHistory(prepped, spy);
  const last = hist.at(-1), lastMs = last.t * 1000, tradeDay = nextWeekday(lastMs);
  // Quotes count only for the session the picks are for.
  const qFor = (sym) => {
    const x = quotes?.quotes?.[sym];
    return x?.day && nyKey(x.day.t * 1000) === nyKey(tradeDay) ? { ...x, open: !!quotes.marketOpen && x.open } : null;
  };
  const picks = last.picks.map((p) => {
    const L = E.pkLive(p, qFor(p.S.s));
    return {
      s: p.S.s, n: p.S.n || '', sec: p.S.sec || '', close: r(p.close), rsi2: r(p.rsi2, 1), drop3: r(p.drop3), above100: r(p.above100, 1),
      targetPct: r(p.atr * E.PK.atrK / p.close * 100),
      live: { state: L.state, entry: r(L.entry), px: r(L.px), now: r(L.now), ret: r(L.ret) },
    };
  });
  const st = E.pkStats(hist);
  return {
    generated: new Date().toISOString(),
    data: daily.generated, quotesAt: quotes?.generated || null, marketOpen: !!quotes?.marketOpen,
    closeOf: nyKey(lastMs), tradeDay: nyKey(tradeDay), sellBy: nyKey(nextWeekday(tradeDay)),
    picks,
    stats: { sessions: st.sessions, trades: st.trades, winRate: r(st.winRate, 1), avgRet: r(st.avgRet, 3), avgBench: r(st.avgBench, 3), equity: r(st.equity, 0), bench: r(st.bench, 0) },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2] || 'scanner-out';
  const daily = JSON.parse(await readFile(path.join(dir, 'stocks-1d.json'), 'utf8'));
  let quotes = null;
  try { quotes = JSON.parse(await readFile(path.join(dir, 'quotes.json'), 'utf8')); } catch {}
  const out = summarize(await loadEngine(), daily, quotes);
  await writeFile(path.join(dir, 'picks.json'), JSON.stringify(out));
  console.log(`picks: ${out.picks.map((p) => p.s).join(', ') || 'none'} for ${out.tradeDay}`);
}
