// Paper broker for the AI battle: wallets, tickets, fills and stop exits.
//
// The flow mirrors a real signer: an agent's proposal becomes a ticket that
// spells out exactly what would happen (who pays, what fills at what price,
// fees, the wallet afterwards). The ticket is checked by rules.mjs, and only a
// ticket that passes every check is executed. Nothing is filled from the
// proposal directly.

import { FEE_RATE, START_CASH } from './config.mjs';
import { walk, qtyForUsd, mid } from './market.mjs';

const r = (x, d = 2) => Math.round(x * 10 ** d) / 10 ** d;
export const dayKey = (t) => new Date(t).toISOString().slice(0, 10);

export function newWallet(agent, now) {
  return {
    id: agent.id, cash: START_CASH, positions: {}, cooldowns: {},
    day: { date: dayKey(now), equity: START_CASH, trades: 0 },
    history: [[now, START_CASH]], startedAt: now,
    turns: 0, status: 'new', note: null, error: null, lastTurnAt: null,
  };
}

export function equity(w, prices) {
  let e = w.cash;
  for (const [sym, p] of Object.entries(w.positions)) e += p.qty * (prices[sym] ?? p.last ?? p.avg);
  return e;
}

// Roll the trading day over at UTC midnight; the loss halt and trade count reset.
export function rollDay(w, prices, now) {
  const d = dayKey(now);
  if (w.day.date !== d) w.day = { date: d, equity: r(equity(w, prices)), trades: 0 };
}

let seq = 0;
const ticketId = (agentId, now) => `${agentId}-${now.toString(36)}-${(seq++).toString(36)}`;

// proposal: { side: 'buy', sym, usd, stop, tp?, reason }
//         | { side: 'sell', sym, fraction (0-1], reason }
//         | { side: 'stop', sym, stop?, tp?, reason }  -- move a stop or target
export function preview(w, p, book, now) {
  const base = {
    id: ticketId(w.id, now), at: now, agent: w.id, side: p.side, sym: p.sym, reason: String(p.reason || '').trim(),
    payer: `${w.id} paper wallet`, venue: 'Coinbase order book, simulated fill',
    cashBefore: r(w.cash), quoteAgeSec: book ? Math.round((now - book.at) / 1000) : null,
  };
  const held = w.positions[p.sym];
  const m = book ? mid(book) : null;
  if (p.side === 'buy') {
    const usd = +p.usd;
    const q = book && usd > 0 ? qtyForUsd(book.asks, usd) : { qty: 0, full: false };
    const avg = q.qty > 0 ? usd / q.qty : null;
    const fee = usd * FEE_RATE;
    // What selling the same quantity straight back would return, fees both ways.
    const back = q.qty > 0 ? walk(book.bids, q.qty) : { avg: null, full: false };
    const sellback = back.avg ? (q.qty * back.avg * (1 - FEE_RATE)) / (usd + fee) * 100 : 0;
    return {
      ...base, qty: q.qty, avgPrice: avg, mid: m, notional: r(usd), fee: r(fee, 4),
      cashAfter: r(w.cash - usd - fee), depthOk: q.full, sellbackPct: r(sellback),
      slippagePct: avg && m ? r((avg / m - 1) * 100, 3) : null,
      stop: p.stop != null ? +p.stop : null, tp: p.tp != null ? +p.tp : null,
      positionAfter: { qty: (held?.qty || 0) + q.qty },
    };
  }
  if (p.side === 'sell') {
    const frac = Math.min(Math.max(+p.fraction || 1, 0), 1);
    const qty = held ? held.qty * frac : 0;
    const f = qty > 0 && book ? walk(book.bids, qty) : { avg: null, full: false };
    const proceeds = f.avg ? qty * f.avg : 0;
    const fee = proceeds * FEE_RATE;
    return {
      ...base, qty, fraction: frac, avgPrice: f.avg, mid: m, notional: r(proceeds), fee: r(fee, 4),
      cashAfter: r(w.cash + proceeds - fee), depthOk: f.full,
      slippagePct: f.avg && m ? r((1 - f.avg / m) * 100, 3) : null,
      pnl: held && f.avg ? r(qty * (f.avg - held.avg) - fee) : null,
      positionAfter: { qty: held ? held.qty - qty : 0 },
    };
  }
  if (p.side === 'stop') {
    return { ...base, mid: m, cashAfter: r(w.cash), stopBefore: held?.stop ?? null, tpBefore: held?.tp ?? null,
      stop: p.stop != null ? +p.stop : held?.stop ?? null, tp: p.tp != null ? +p.tp : held?.tp ?? null };
  }
  return { ...base, invalid: `unknown side "${p.side}"` };
}

// Apply a ticket that passed the rules. Returns the ledger entry.
export function execute(w, t) {
  if (t.side === 'buy') {
    const h = w.positions[t.sym];
    const qty = (h?.qty || 0) + t.qty;
    const avg = h ? (h.qty * h.avg + t.qty * t.avgPrice) / qty : t.avgPrice;
    w.positions[t.sym] = { qty, avg, stop: t.stop, tp: t.tp, openedAt: h?.openedAt ?? t.at, last: t.mid };
    w.cash = t.cashAfter; w.day.trades++;
  } else if (t.side === 'sell') {
    const h = w.positions[t.sym];
    h.qty -= t.qty;
    // A dust remainder (under a dollar) closes the position rather than lingering.
    if (t.fraction >= 1 || h.qty * (t.mid || h.avg) < 1) { delete w.positions[t.sym]; w.cooldowns[t.sym] = t.at; }
    w.cash = t.cashAfter; w.day.trades++;
  } else if (t.side === 'stop') {
    const h = w.positions[t.sym];
    h.stop = t.stop; h.tp = t.tp;
  }
  return ledgerEntry(w, t, 'filled');
}

export function ledgerEntry(w, t, outcome, checks) {
  return {
    id: t.id, at: t.at, agent: w.id, outcome, side: t.side, sym: t.sym,
    qty: t.qty ?? null, price: t.avgPrice ? +t.avgPrice.toPrecision(8) : null,
    usd: t.notional ?? null, fee: t.fee ?? null, pnl: t.pnl ?? null,
    stop: t.stop ?? null, tp: t.tp ?? null, reason: t.reason,
    ...(checks ? { failed: checks.filter((c) => !c.ok).map((c) => `${c.rule}: ${c.detail}`) } : {}),
    ticket: { payer: t.payer, venue: t.venue, mid: t.mid, slippagePct: t.slippagePct, sellbackPct: t.sellbackPct, cashBefore: t.cashBefore, cashAfter: t.cashAfter, quoteAgeSec: t.quoteAgeSec },
  };
}

// The server-side guard. Runs on every tick whether or not the agent is awake,
// walking 1-minute candles since the last check so a wick between ticks still
// triggers. A candle that opens through the stop fills at the open (a gap), not
// at the stop. If one candle touches both stop and target, the stop wins.
const EXIT_SLIP = 0.001;
export function checkExits(w, sym, candles, since) {
  const h = w.positions[sym];
  if (!h) return null;
  for (const k of candles) {
    if (k.t + 60e3 <= since) continue;
    let kind = null, px = null;
    if (h.stop && k.l <= h.stop) { kind = 'stop'; px = Math.min(h.stop, k.o) * (1 - EXIT_SLIP); }
    else if (h.tp && k.h >= h.tp) { kind = 'target'; px = Math.max(h.tp, k.o) * (1 - EXIT_SLIP); }
    if (!kind) continue;
    const proceeds = h.qty * px, fee = proceeds * FEE_RATE;
    const t = {
      id: ticketId(w.id, k.t), at: Math.max(k.t, since), side: 'sell', sym, qty: h.qty, fraction: 1, avgPrice: px, mid: k.o,
      notional: r(proceeds), fee: r(fee, 4), pnl: r(h.qty * (px - h.avg) - fee),
      cashBefore: r(w.cash), cashAfter: r(w.cash + proceeds - fee),
      payer: `${w.id} paper wallet`, venue: 'server guard, 1-minute candles',
      reason: kind === 'stop' ? `Stop hit at ${h.stop}` : `Target hit at ${h.tp}`,
    };
    delete w.positions[sym]; w.cooldowns[sym] = t.at; w.cash = t.cashAfter;
    return { ...ledgerEntry(w, t, kind === 'stop' ? 'stopped' : 'target'), stop: h.stop, tp: h.tp };
  }
  return null;
}
