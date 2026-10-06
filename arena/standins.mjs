// Stand-in strategies: what an agent trades when its model has no API key.
//
// Without these, an agent with no key sleeps forever and the board has two
// players. With them, every slot trades from the first turn, under the same
// rule gate, on the same live prices. They are plain rules, not models: the
// board labels every stand-in trade as such, and an agent switches to its real
// model the turn its key is added. Each one has a different style so the race
// is worth watching.

import { RULES, MAX_ACTIONS } from './config.mjs';

const clamp = (x, lo, hi) => Math.min(Math.max(x, lo), hi);
const f1 = (x) => (x == null ? '?' : (+x).toFixed(1));

// A stop k ATRs below the price, kept inside the gate's allowed band.
const stopAt = (r, k) => r.last * (1 - clamp((r.atr14hPct || 2) * k, RULES.minStopPct + 0.3, RULES.maxStopPct - 0.3) / 100);

export const STYLES = {
  opus:     { label: 'Trend follower',  blurb: 'Buys coins above their 50-hour average with a rising day, rides them with a trailing stop, sells when the trend breaks.' },
  sonnet:   { label: 'Breakout chaser', blurb: 'Buys the strongest 24-hour movers that are still under overbought, takes profit at three ATRs.' },
  haiku:    { label: 'Scalper',         blurb: 'Quick in, quick out: buys short-term dips, targets a small bounce, tight stops.' },
  gpt:      { label: 'Steady majors',   blurb: 'Sticks to the deepest markets, buys pullbacks in an uptrend, sizes small.' },
  grok:     { label: 'Contrarian',      blurb: 'Buys the biggest 24-hour losers once selling looks exhausted, wide stops.' },
  gemini:   { label: 'Momentum rider',        blurb: 'Holds the best 7-day performers and rotates out of laggards.' },
  deepseek: { label: 'Value dip buyer', blurb: 'Buys large coins well below their 50-hour average on oversold readings.' },
};

// Each style: entry score (higher is better, null to skip), exit test, sizing and exits.
const PLAYS = {
  opus: {
    score: (r) => (r.vsSma50hPct > 0.5 && r.chg24h > 0 && r.rsi14h < 70 ? r.vsSma50hPct + r.chg24h / 2 : null),
    exit: (r) => r.vsSma50hPct < -0.5 && `price fell ${f1(-r.vsSma50hPct)}% under its 50-hour average; the trend is broken`,
    why: (r) => `${f1(r.vsSma50hPct)}% above its 50-hour average and up ${f1(r.chg24h)}% on the day. Riding the trend with a stop two ATRs down.`,
    size: 0.2, stopK: 2, tpK: null, trail: true,
  },
  sonnet: {
    score: (r) => (r.chg24h > 2 && r.rsi14h < 72 ? r.chg24h : null),
    exit: (r) => r.chg1h < -2 && `dropped ${f1(-r.chg1h)}% in an hour; the breakout failed`,
    why: (r) => `Up ${f1(r.chg24h)}% in 24 hours with RSI ${f1(r.rsi14h)}, not yet overbought. Breakout trade, target three ATRs.`,
    size: 0.2, stopK: 1.5, tpK: 3, trail: false,
  },
  haiku: {
    score: (r) => (r.chg1h < -0.6 && r.rsi14h < 45 && r.vol24hUsd > 2e7 ? -r.chg1h : null),
    exit: (r) => r.rsi14h > 62 && `RSI back to ${f1(r.rsi14h)}; bounce taken`,
    why: (r) => `Down ${f1(-r.chg1h)}% in the last hour on a liquid market. Scalping the bounce with a tight stop.`,
    size: 0.15, stopK: 1, tpK: 1.5, trail: false,
  },
  gpt: {
    score: (r) => (r.vol24hUsd > 1e8 && r.vsSma50hPct > 0 && r.vsSma20hPct < 0 ? r.vol24hUsd / 1e8 - r.vsSma20hPct : null),
    exit: (r) => r.vsSma50hPct < -2 && `slipped ${f1(-r.vsSma50hPct)}% under its 50-hour average`,
    why: (r) => `Deep market ($${(r.vol24hUsd / 1e6).toFixed(0)}M a day) pulling back ${f1(-r.vsSma20hPct)}% under its 20-hour average inside an uptrend. Small, patient position.`,
    size: 0.15, stopK: 2.5, tpK: null, trail: true,
  },
  grok: {
    score: (r) => (r.chg24h < -3 && r.rsi14h < 38 ? -r.chg24h : null),
    exit: (r) => r.rsi14h > 58 && `RSI recovered to ${f1(r.rsi14h)}; the snap-back is in`,
    why: (r) => `Everyone sold it: down ${f1(-r.chg24h)}% today, RSI ${f1(r.rsi14h)}. Fading the crowd with a wide stop.`,
    size: 0.2, stopK: 3, tpK: 4, trail: false,
  },
  gemini: {
    score: (r) => (r.chg7d > 3 && r.rsi14h < 75 ? r.chg7d : null),
    exit: (r) => r.chg7d < 0 && `7-day return turned negative (${f1(r.chg7d)}%); rotating out`,
    why: (r) => `One of the strongest coins this week, up ${f1(r.chg7d)}% over 7 days. Momentum position.`,
    size: 0.2, stopK: 2.5, tpK: null, trail: true,
  },
  deepseek: {
    score: (r) => (r.vol24hUsd > 3e7 && r.vsSma50hPct < -2 && r.rsi14h < 35 ? -r.vsSma50hPct : null),
    exit: (r) => r.vsSma50hPct > 1.5 && `back ${f1(r.vsSma50hPct)}% above its 50-hour average; value realized`,
    why: (r) => `${f1(-r.vsSma50hPct)}% under its 50-hour average with RSI ${f1(r.rsi14h)}. Buying the discount on a large coin.`,
    size: 0.2, stopK: 2.5, tpK: 3, trail: false,
  },
};

export const hasStandin = (id) => !!PLAYS[id];

export function standin(id, { w, eq, rows, now = Date.now() }) {
  const P = PLAYS[id];
  const bySym = Object.fromEntries(rows.map((r) => [r.sym, r]));
  const actions = [];
  const held = Object.entries(w.positions);
  // Know the daily trade cap: keep the last slot for an exit, never propose past it.
  let left = RULES.maxTradesPerDay - (w.day?.trades ?? 0);
  const can = (side) => (side === 'stop' ? true : side === 'sell' ? left > 0 : left > 1);
  const push = (x) => { if (actions.length < MAX_ACTIONS && can(x.side)) { actions.push(x); if (x.side !== 'stop') left--; } };

  // Exits first: a position whose reason to exist is gone gets sold.
  for (const [sym, p] of held) {
    const r = bySym[sym];
    if (!r || actions.length >= MAX_ACTIONS) continue;
    const why = P.exit(r);
    if (why) { push({ side: 'sell', sym, usd: null, fraction: 1, stop: null, tp: null, reason: `Stand-in: ${why[0].toUpperCase()}${why.slice(1)}.` }); continue; }
    // Trailing styles lift the stop once a position is two ATRs in profit.
    if (P.trail && p.stop) {
      const trail = stopAt(r, P.stopK);
      if (r.last > p.avg * (1 + (r.atr14hPct || 2) * 2 / 100) && trail > p.stop * 1.002) {
        push({ side: 'stop', sym, usd: null, fraction: null, stop: +trail.toPrecision(6), tp: null, reason: `Stand-in: up ${f1((r.last / p.avg - 1) * 100)}%, trailing the stop up to lock in gains.` });
      }
    }
  }

  // Entries: best-scoring coins not already held, while slots and cash allow.
  const open = held.length - actions.filter((a) => a.side === 'sell').length;
  const cashFree = w.cash - eq * RULES.minCashPct / 100;
  const usd = Math.floor(Math.min(eq * P.size, cashFree / 1.01));
  const cooling = (sym) => w.cooldowns?.[sym] && now - w.cooldowns[sym] < RULES.cooldownMin * 60e3;
  // Skip coins the liquidity rule would refuse anyway.
  const picks = rows.filter((r) => !w.positions[r.sym] && !cooling(r.sym) && r.vol24hUsd >= RULES.minVolumeUsd24h)
    .map((r) => ({ r, s: P.score(r) })).filter((x) => x.s != null && Number.isFinite(x.s))
    .sort((a, b) => b.s - a.s);
  for (const { r } of picks) {
    if (actions.length >= MAX_ACTIONS || open + actions.filter((a) => a.side === 'buy').length >= RULES.maxOpenPositions) break;
    if (usd < RULES.minOrderUsd * 2 || !can('buy')) break;
    push({
      side: 'buy', sym: r.sym, usd, fraction: null,
      stop: +stopAt(r, P.stopK).toPrecision(6),
      tp: P.tpK ? +(r.last * (1 + Math.max((r.atr14hPct || 2) * P.tpK, 1.5) / 100)).toPrecision(6) : null,
      reason: `Stand-in: ${P.why(r)}`,
    });
  }
  const style = STYLES[id];
  return { thoughts: `Stand-in strategy (${style.label.toLowerCase()}): ${style.blurb}`, actions };
}
