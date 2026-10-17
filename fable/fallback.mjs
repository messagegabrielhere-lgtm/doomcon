// Rule-based stand-in when Anthropic is unavailable or FABLE_FALLBACK=1.
// Mirrors the house "Claude Trader" bias: clean uptrends, 12% stop, trail, half at +25%.
// Honours self-improvement adapt knobs (sizeScale, stopBiasPct, stance, market preference).
// Not investment advice.

import { RULES, MAX_ACTIONS } from './config.mjs';
import { emptyMemory } from './improve.mjs';

const clamp = (x, lo, hi) => Math.min(Math.max(x, lo), hi);
const f1 = (x) => (x == null ? '?' : (+x).toFixed(1));
const stopPct = (pct) => clamp(pct, RULES.minStopPct + 0.3, RULES.maxStopPct - 0.3);
const stopBelow = (price, pct) => +(price * (1 - stopPct(pct) / 100)).toPrecision(6);

function score(r, adapt) {
  if (!(r.vsSma20hPct > 0 && r.vsSma50hPct > 0 && r.chg24h > 0 && r.chg1h <= 8 && r.rsi14h < 75)) return null;
  let s = r.vsSma20hPct / Math.max(r.atr14hPct || 1, 0.05) + r.chg24h / 10;
  const crypto = String(r.sym).includes('-');
  s += crypto ? (adapt.preferCrypto || 0) : (adapt.preferStock || 0);
  return s;
}

export function fallbackThink({ w, eq, rows, now = Date.now(), memory } = {}) {
  const adapt = memory?.adapt || emptyMemory().adapt;
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

  const entryStop = clamp(12 + (adapt.stopBiasPct || 0), RULES.minStopPct + 0.5, RULES.maxStopPct - 0.5);
  const trailStop = clamp(10 + (adapt.stopBiasPct || 0) * 0.5, RULES.minStopPct + 0.5, RULES.maxStopPct - 0.5);
  const sizeScale = adapt.stance === 'risk-off' ? Math.min(adapt.sizeScale || 1, 0.7) : (adapt.sizeScale || 1);

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
      const next = stopBelow(r.last, trailStop);
      if (next > p.stop * 1.002) {
        push({
          side: 'stop', sym, usd: null, fraction: null, stop: next, tp: null,
          reason: `Fallback: up ${f1(gain)}%, raising the stop to ${f1(trailStop)}% under the price.`,
        });
      }
    }
  }
  for (const sym of Object.keys(w.house)) if (!w.positions[sym]) delete w.house[sym];

  // Risk-off stance: manage positions only, no new buys.
  if (adapt.stance === 'risk-off') {
    return {
      thoughts: `Fallback (self-improved, risk-off): sizeScale ${sizeScale}. Managing positions only.`,
      bias: 'risk-off',
      actions,
      new_lessons: [],
      servedBy: 'fallback',
      usage: null,
      model: 'fallback',
    };
  }

  const held = Object.keys(w.positions).length
    - actions.filter((a) => a.side === 'sell' && a.fraction === 1).length;
  const maxPos = clamp(adapt.maxPositionPct ?? RULES.maxPositionPct, 10, RULES.maxPositionPct);
  const cashFree = w.cash - (eq * RULES.minCashPct) / 100;
  const usd = Math.floor(Math.min(eq * (maxPos - 1) / 100, cashFree / 1.01) * sizeScale);
  const cooling = (sym) => w.cooldowns?.[sym] && now - w.cooldowns[sym] < RULES.cooldownMin * 60e3;
  const picks = rows
    .filter((r) => !w.positions[r.sym] && !cooling(r.sym) && r.open !== false && r.vol24hUsd >= RULES.minVolumeUsd24h)
    .map((r) => ({ r, s: score(r, adapt) }))
    .filter((x) => x.s != null && Number.isFinite(x.s))
    .sort((a, b) => b.s - a.s);

  const maxBuys = adapt.stance === 'risk-on' ? 3 : 2;
  for (const { r } of picks) {
    if (actions.length >= MAX_ACTIONS) break;
    if (held + actions.filter((a) => a.side === 'buy').length >= Math.min(maxBuys, RULES.maxOpenPositions)) break;
    if (usd < RULES.minOrderUsd) break;
    push({
      side: 'buy',
      sym: r.sym,
      usd,
      fraction: null,
      stop: stopBelow(r.last, entryStop),
      tp: null,
      reason: `Fallback: clean uptrend, ${f1(r.vsSma20hPct)}% over its 20-hour average, up ${f1(r.chg24h)}% on the day. Stop ${f1(entryStop)}% down (adapted).`,
    });
  }

  return {
    thoughts: `Fallback rules with self-improve adapt: sizeScale ${sizeScale}, stop ${f1(entryStop)}%, stance ${adapt.stance}.`,
    bias: actions.some((a) => a.side === 'buy') ? 'risk-on' : 'neutral',
    actions,
    new_lessons: [],
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
