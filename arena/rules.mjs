// The rule gate: the only thing that decides whether a ticket is executed.
//
// An agent proposes; this checks the fully-priced ticket (not the proposal)
// against the rules in config.mjs and returns every check with its result, so
// a rejection on the board says exactly which rule stopped it.

import { RULES, UNIVERSE } from './config.mjs';
import { equity } from './broker.mjs';

const pct = (x) => `${Math.round(x * 100) / 100}%`;

export function gate(w, t, { prices, rows, now, rules = RULES, universe = UNIVERSE }) {
  const checks = [];
  const add = (rule, ok, detail) => checks.push({ rule, ok: !!ok, detail });
  if (t.invalid) { add('shape', false, t.invalid); return { ok: false, checks }; }

  const eq = equity(w, prices);
  const held = w.positions[t.sym];
  const row = rows.find((x) => x.sym === t.sym);

  add('universe', universe.includes(t.sym), universe.includes(t.sym) ? t.sym : `${t.sym} is not on the list`);
  add('reason', t.reason.length >= rules.minReasonChars, t.reason.length >= rules.minReasonChars ? 'given' : `explain the trade in at least ${rules.minReasonChars} characters`);

  if (t.side === 'stop') {
    add('position', !!held, held ? 'held' : `no ${t.sym} position to adjust`);
    if (held) {
      // Stops can be tightened, never loosened.
      add('stop only tightens', t.stop != null && t.stop >= (held.stop ?? 0), `from ${held.stop} to ${t.stop}`);
      add('stop below price', t.stop != null && t.mid != null && t.stop < t.mid, `stop ${t.stop}, price ${t.mid}`);
      if (t.tp != null) add('target above price', t.mid != null && t.tp > t.mid, `target ${t.tp}, price ${t.mid}`);
    }
    return { ok: checks.every((c) => c.ok), checks };
  }

  add('fresh quote', t.quoteAgeSec != null && t.quoteAgeSec <= rules.maxQuoteAgeSec, t.quoteAgeSec == null ? 'no order book' : `${t.quoteAgeSec}s old`);
  add('book depth', t.depthOk, t.depthOk ? 'fills in full' : 'the book is too thin to fill this size');
  add('trades today', w.day.trades < rules.maxTradesPerDay, `${w.day.trades} of ${rules.maxTradesPerDay} used`);

  if (t.side === 'sell') {
    add('position', !!held && t.qty > 0, held ? `${held.qty} held` : `no ${t.sym} to sell`);
    return { ok: checks.every((c) => c.ok), checks };
  }

  // buys
  add('minimum size', t.notional >= rules.minOrderUsd, `$${t.notional}`);
  add('slippage', t.slippagePct != null && t.slippagePct <= rules.maxSlippagePct, t.slippagePct == null ? 'unpriced' : `${pct(t.slippagePct)} vs mid`);
  // The honeypot rule: if you couldn't sell it straight back for most of what
  // you paid, you don't get to buy it.
  add('sell-back', t.sellbackPct >= rules.minSellbackPct, `round trip returns ${pct(t.sellbackPct)}, need ${rules.minSellbackPct}%`);
  add('liquidity', row && row.vol24hUsd >= rules.minVolumeUsd24h, row ? `$${(row.vol24hUsd / 1e6).toFixed(1)}M traded in 24h` : 'no market data');

  if (rules.stopRequired) {
    const dist = t.stop && t.avgPrice ? (1 - t.stop / t.avgPrice) * 100 : null;
    add('stop loss', dist != null && dist >= rules.minStopPct && dist <= rules.maxStopPct,
      dist == null ? 'every buy needs a stop' : `${pct(dist)} below entry, allowed ${rules.minStopPct}-${rules.maxStopPct}%`);
  }
  if (t.tp != null) add('target', t.avgPrice && t.tp > t.avgPrice, `target ${t.tp} vs entry ${t.avgPrice?.toPrecision(6)}`);

  add('cash reserve', t.cashAfter >= (eq * rules.minCashPct) / 100, `$${t.cashAfter} left, need $${((eq * rules.minCashPct) / 100).toFixed(2)}`);
  const posAfter = t.positionAfter.qty * (t.mid ?? t.avgPrice ?? 0);
  add('position size', posAfter <= (eq * rules.maxPositionPct) / 100 + 0.01, `${pct((posAfter / eq) * 100)} of equity, max ${rules.maxPositionPct}%`);
  const open = Object.keys(w.positions).length;
  add('open positions', held || open < rules.maxOpenPositions, `${open} of ${rules.maxOpenPositions}`);
  const drop = (1 - eq / w.day.equity) * 100;
  add('daily loss halt', drop < rules.dailyLossHaltPct, `${pct(Math.max(drop, 0))} down today, halt at ${rules.dailyLossHaltPct}%`);
  const since = w.cooldowns[t.sym] ? (now - w.cooldowns[t.sym]) / 60e3 : Infinity;
  add('cooldown', since >= rules.cooldownMin, since === Infinity ? 'none' : `closed ${Math.round(since)} min ago, wait ${rules.cooldownMin}`);

  return { ok: checks.every((c) => c.ok), checks };
}
