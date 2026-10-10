// House bots: the two strategies that trade the owner's real Robinhood money,
// entered here with $1,000 of paper like everyone else.
//
//   trader   "Claude Trader": the rules Claude follows on its 5-minute checks of the
//            Robinhood Agentic account (stocks and crypto): buy clean uptrends, a
//            12% stop on every buy, raise it to 10% under the price as it climbs,
//            sell half at +25%.
//   alwayson "Always-on bot": the server bot (trading-agent repo, agent/live.py) on
//            crypto: momentum entries, stops sized to each coin's volatility,
//            stricter in the quiet hours, half off at +12%, out when the trend breaks.
//
// They are rules, not models: no API key, and the board labels them "house bot".
// In real trading both also get an hourly Claude review of news and sentiment that
// can veto buys; that review is not run here. Same live prices, same rule gate,
// same $1,000 as every other player.

import { RULES, MAX_ACTIONS } from './config.mjs';

const clamp = (x, lo, hi) => Math.min(Math.max(x, lo), hi);
const f1 = (x) => (x == null ? '?' : (+x).toFixed(1));
// Keep every stop inside the gate's allowed band.
const stopPct = (pct) => clamp(pct, RULES.minStopPct + 0.3, RULES.maxStopPct - 0.3);
const stopBelow = (price, pct) => +(price * (1 - stopPct(pct) / 100)).toPrecision(6);

export const HOUSE = {
  trader: {
    label: 'Claude Trader',
    blurb: 'The rules Claude uses on the real Robinhood account: clean uptrends only, a 12% stop on every buy, trailed to 10% as it rises, half off at +25%.',
    markets: 'both',
    // Above its 20- and 50-hour averages, up on the day, not chasing an hour spike or an overbought RSI.
    score: (r) => (r.vsSma20hPct > 0 && r.vsSma50hPct > 0 && r.chg24h > 0 && r.chg1h <= 8 && r.rsi14h < 75
      ? r.vsSma20hPct / Math.max(r.atr14hPct || 1, 0.05) + r.chg24h / 10 : null),
    why: (r) => `Clean uptrend: ${f1(r.vsSma20hPct)}% over its 20-hour average, up ${f1(r.chg24h)}% on the day. Stop 12% down.`,
    stop: () => 12,
    trail: () => 10,
    trailFrom: 0,          // trail as soon as the price is above the entry
    halfAt: 25,
    exit: () => null,      // stops and the half-sale do the selling
  },
  alwayson: {
    label: 'Always-on bot',
    blurb: 'The always-on server bot: crypto momentum, stops sized to each coin’s volatility, twice the momentum needed in the quiet hours, half off at +12%, out when the trend breaks.',
    markets: 'crypto',
    score: (r, now) => {
      const need = 1.5 * (quietHour(now) ? 2 : 1);
      return r.vsSma20hPct >= need && r.vsSma50hPct > 0 && r.chg1h <= 8 && r.rsi14h < 78 ? r.vsSma20hPct : null;
    },
    why: (r, now) => `Momentum: ${f1(r.vsSma20hPct)}% over its 20-hour average${quietHour(now) ? ' (quiet hours: needed double)' : ''}. Stop sized to its volatility.`,
    // About 2.5x the typical 4-hour move (two hourly ATRs), between 5% and 12%.
    stop: (r) => clamp((r.atr14hPct || 2) * 5, 5, 12),
    trail: (r) => clamp((r.atr14hPct || 2) * 4, 5, 12),
    trailFrom: 4,
    halfAt: 12,
    exit: (r) => r.vsSma20hPct < 0 && r.chg1h < 0 && `fell under its 20-hour average and is still dropping; the trend broke`,
  },
};

// About 1-6am New York: spreads widen, so the always-on bot asks for more.
const quietHour = (now) => [5, 6, 7, 8, 9].includes(new Date(now).getUTCHours());

export const isHouse = (id) => !!HOUSE[id];

export function houseBot(id, { w, eq, rows, now = Date.now() }) {
  const P = HOUSE[id];
  const bySym = Object.fromEntries(rows.map((r) => [r.sym, r]));
  const actions = [];
  let left = RULES.maxTradesPerDay - (w.day?.trades ?? 0);
  const can = (side) => (side === 'stop' ? true : side === 'sell' ? left > 0 : left > 1);
  const push = (x) => { if (actions.length < MAX_ACTIONS && can(x.side)) { actions.push(x); if (x.side !== 'stop') left--; } };
  w.house = w.house || {};   // per-position memory: has the half been sold?

  for (const [sym, p] of Object.entries(w.positions)) {
    const r = bySym[sym];
    if (!r || r.open === false) continue;
    const gain = (r.last / p.avg - 1) * 100;
    const why = P.exit(r);
    if (why) { push({ side: 'sell', sym, usd: null, fraction: 1, stop: null, tp: null, reason: `House bot: ${why[0].toUpperCase()}${why.slice(1)} (${f1(gain)}%).` }); continue; }
    const memo = w.house[sym] || (w.house[sym] = { half: false, since: p.openedAt || now });
    if (!memo.half && gain >= P.halfAt) {
      push({ side: 'sell', sym, usd: null, fraction: 0.5, stop: null, tp: null, reason: `House bot: up ${f1(gain)}%, selling half to lock in the gain.` });
      memo.half = true;
      continue;
    }
    if (p.stop && gain >= P.trailFrom) {
      const next = stopBelow(r.last, P.trail(r));
      if (next > p.stop * 1.002) push({ side: 'stop', sym, usd: null, fraction: null, stop: next, tp: null, reason: `House bot: up ${f1(gain)}%, raising the stop to ${f1(stopPct(P.trail(r)))}% under the price. Stops never move down.` });
    }
  }
  for (const sym of Object.keys(w.house)) if (!w.positions[sym]) delete w.house[sym];

  const held = Object.keys(w.positions).length - actions.filter((a) => a.side === 'sell' && a.fraction === 1).length;
  const cashFree = w.cash - eq * RULES.minCashPct / 100;
  const usd = Math.floor(Math.min(eq * (RULES.maxPositionPct - 1) / 100, cashFree / 1.01));
  const cooling = (sym) => w.cooldowns?.[sym] && now - w.cooldowns[sym] < RULES.cooldownMin * 60e3;
  const fits = (r) => P.markets === 'both' || (P.markets === 'crypto' ? r.type !== 'stock' : r.type === 'stock');
  const picks = rows.filter((r) => fits(r) && !w.positions[r.sym] && !cooling(r.sym) && r.open !== false && r.vol24hUsd >= RULES.minVolumeUsd24h)
    .map((r) => ({ r, s: P.score(r, now) })).filter((x) => x.s != null && Number.isFinite(x.s))
    .sort((a, b) => b.s - a.s);
  for (const { r } of picks) {
    if (actions.length >= MAX_ACTIONS || held + actions.filter((a) => a.side === 'buy').length >= Math.min(2, RULES.maxOpenPositions)) break;
    if (usd < RULES.minOrderUsd * 2 || !can('buy')) break;
    push({ side: 'buy', sym: r.sym, usd, fraction: null, stop: stopBelow(r.last, P.stop(r)), tp: null, reason: `House bot: ${P.why(r, now)}` });
  }
  return { thoughts: `House bot (${P.label}): ${P.blurb}`, actions };
}
