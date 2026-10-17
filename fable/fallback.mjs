// Rule-based stand-in when Anthropic is unavailable or FABLE_FALLBACK=1.
// Mirrors the house "Claude Trader" bias: clean uptrends, 12% stop, trail, half at +25%.
// Not investment advice.

import { RULES, MAX_ACTIONS } from './config.mjs';

const clamp = (x, lo, hi) => Math.min(Math.max(x, lo), hi);
const f1 = (x) => (x == null ? '?' : (+x).toFixed(1));
const stopPct = (pct) => clamp(pct, RULES.minStopPct + 0.3, RULES.maxStopPct - 0.3);
const stopBelow = (price, pct) => +(price * (1 - stopPct(pct) / 100)).toPrecision(6);

function score(r) {
  if (r.vsSma20hPct > 0 && r.vsSma50hPct > 0 && r.chg24h > 0 && r.chg1h <= 8 && r.rsi14h < 75) {
    return r.vsSma20hPct / Math.max(r.atr14hPct || 1, 0.05) + r.chg24h / 10;
  }
  return null;
}

export function fallbackThink({ w, eq, rows, now = Date.now() }) {
  const bySym = Object.fromEntries(rows.map((r) => [r.sym, r]));
  const actions = [];
  let left = RULES.maxTradesPerDay - (w.day?.trades ?? 0);
  const can = (side) => (side === 'stop' ? true : side === 'sell' ? left > 0 : left > 1);
  const push = (x) => {
    if (actions.length < MAX_ACTIONS && can(x.side)) {
      actions.push(x);
      if (x.side !== 'stop') left--;
    }
  };
  w.house = w.house || {};

  for (const [sym, p] of Object.entries(w.positions)) {
    const r = bySym[sym];
    if (!r || r.open === false) continue;
    const gain = (r.last / p.avg - 1) * 100;
    if (r.vsSma20hPct < 0 && r.chg1h < 0) {
      push({
        side: 'sell', sym, usd: null, fraction: 1, stop: null, tp: null,
        reason: `Fallback: under its 20-hour average and still dropping (${f1(gain)}%).`,
      });
      continue;
    }
    const memo = w.house[sym] || (w.house[sym] = { half: false, since: p.openedAt || now });
    if (!memo.half && gain >= 25) {
      push({
        side: 'sell', sym, usd: null, fraction: 0.5, stop: null, tp: null,
        reason: `Fallback: up ${f1(gain)}%, selling half to lock in the gain.`,
      });
      memo.half = true;
      continue;
    }
    if (p.stop) {
      const next = stopBelow(r.last, 10);
      if (next > p.stop * 1.002) {
        push({
          side: 'stop', sym, usd: null, fraction: null, stop: next, tp: null,
          reason: `Fallback: up ${f1(gain)}%, raising the stop to 10% under the price.`,
        });
      }
    }
  }
  for (const sym of Object.keys(w.house)) if (!w.positions[sym]) delete w.house[sym];

  const held = Object.keys(w.positions).length
    - actions.filter((a) => a.side === 'sell' && a.fraction === 1).length;
  const cashFree = w.cash - (eq * RULES.minCashPct) / 100;
  const usd = Math.floor(Math.min(eq * (RULES.maxPositionPct - 1) / 100, cashFree / 1.01));
  const cooling = (sym) => w.cooldowns?.[sym] && now - w.cooldowns[sym] < RULES.cooldownMin * 60e3;
  const picks = rows
    .filter((r) => !w.positions[r.sym] && !cooling(r.sym) && r.open !== false && r.vol24hUsd >= RULES.minVolumeUsd24h)
    .map((r) => ({ r, s: score(r) }))
    .filter((x) => x.s != null && Number.isFinite(x.s))
    .sort((a, b) => b.s - a.s);

  for (const { r } of picks) {
    if (actions.length >= MAX_ACTIONS) break;
    if (held + actions.filter((a) => a.side === 'buy').length >= Math.min(3, RULES.maxOpenPositions)) break;
    if (usd < RULES.minOrderUsd) break;
    push({
      side: 'buy',
      sym: r.sym,
      usd,
      fraction: null,
      stop: stopBelow(r.last, 12),
      tp: null,
      reason: `Fallback: clean uptrend, ${f1(r.vsSma20hPct)}% over its 20-hour average, up ${f1(r.chg24h)}% on the day. Stop 12% down.`,
    });
  }

  return {
    thoughts: 'Fallback rules: buy clean uptrends, 12% stop, trail to 10%, half off at +25%. Claude Fable model was not called.',
    bias: actions.some((a) => a.side === 'buy') ? 'risk-on' : 'neutral',
    actions,
    servedBy: 'fallback',
    usage: null,
    model: 'fallback',
  };
}

export function wantFallback(env = process.env) {
  if (env.FABLE_FALLBACK === '1' || env.FABLE_FALLBACK === 'on') return true;
  if (!env.ANTHROPIC_API_KEY) return true;
  return false;
}
