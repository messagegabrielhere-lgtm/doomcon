// One autonomous tick for Claude Fable: guard exits → think → price → gate → fill → improve.
// Paper trading only. Setting FABLE_LIVE does not enable real orders in this build.
// Not investment advice.

import { makeClient, snapshot } from '../arena/market.mjs';
import { equity, rollDay, preview, execute, ledgerEntry, checkExits } from '../arena/broker.mjs';
import { gate } from '../arena/rules.mjs';
import { publicError } from '../collector/safe-error.mjs';
import {
  AGENT_ID, UNIVERSE, RULES, START_CASH, LIVE_PHRASE, isLive, modelFor,
} from './config.mjs';
import { askFable } from './brain.mjs';
import { fallbackThink, wantFallback } from './fallback.mjs';
import { loadState, saveTick } from './journal.mjs';
import {
  emptyMemory, improve, memoryPromptBlock, effectiveRules, upsertLesson,
} from './improve.mjs';

const r2 = (x) => Math.round(x * 100) / 100;

async function decide(ctx, env) {
  if (wantFallback(env)) return fallbackThink(ctx);
  return askFable(ctx, env);
}

export async function tick({
  dir,
  guardOnly = false,
  client = makeClient(),
  env = process.env,
  now = Date.now(),
  log = console.log,
  think = decide,
  reflect,
} = {}) {
  if (isLive(env)) {
    throw new Error(
      `FABLE_LIVE=${LIVE_PHRASE} is set, but this package is paper-only. `
      + 'Unset FABLE_LIVE. Real brokerage wiring is intentionally not shipped.',
    );
  }

  const state = await loadState(dir, now);
  state.memory ??= emptyMemory(now);
  const w = state.wallet;
  const ledger = [];
  const prices = {};
  const rules = effectiveRules(RULES, state.memory.adapt);

  // 1. Guard: stops and targets on 1-minute candles.
  const held = Object.keys(w.positions);
  const since = state.lastGuardAt ?? now - 5 * 60e3;
  for (const sym of held) {
    try {
      const candles = await client.candles(sym, 60, Math.max(since - 60e3, now - 299 * 60e3));
      if (candles.length) prices[sym] = candles.at(-1).c;
      const e = checkExits(w, sym, candles, since);
      if (e) {
        ledger.push(e);
        log(`guard: ${e.outcome} ${sym} at ${e.price} (pnl ${e.pnl})`);
      }
      if (w.positions[sym] && prices[sym]) w.positions[sym].last = prices[sym];
    } catch (err) {
      log(`guard: ${sym} unchecked (${err.message})`);
    }
  }
  state.lastGuardAt = now;

  let market = null;
  if (!guardOnly) {
    market = await snapshot(client, UNIVERSE, log);
    for (const r of market.rows) prices[r.sym] = r.last;

    rollDay(w, prices, now);
    const eq = equity(w, prices);
    w.model = modelFor(env);

    if (eq < rules.minOrderUsd && !Object.keys(w.positions).length) {
      w.status = 'asleep';
      w.note = 'out of money';
      w.error = null;
    } else {
      const books = new Map();
      const bookFor = async (sym) => {
        if (!books.has(sym)) {
          books.set(sym, client.book(sym).catch((e) => {
            log(`book: ${sym} (${e.message})`);
            return null;
          }));
        }
        return books.get(sym);
      };

      try {
        const res = await think(
          {
            w, eq, rows: market.rows, prices, recent: state.recent || [], now,
            memory: state.memory,
            memoryBlock: memoryPromptBlock(state.memory),
          },
          env,
        );
        w.turns++;
        w.status = 'awake';
        w.error = null;
        w.note = res.thoughts;
        w.bias = res.bias;
        w.servedBy = res.servedBy;
        w.lastTurnAt = now;
        state.lastTurnAt = now;
        state.usage = res.usage || null;

        for (const lesson of res.new_lessons || []) {
          upsertLesson(state.memory, lesson, { source: 'model', at: now });
        }

        for (const p of res.actions) {
          const book = UNIVERSE.includes(p.sym) ? await bookFor(p.sym) : null;
          const t = preview(w, p, book, Date.now());
          const g = gate(w, t, { prices, rows: market.rows, now, rules, universe: UNIVERSE });
          const entry = g.ok ? execute(w, t) : ledgerEntry(w, t, 'rejected', g.checks);
          entry.model = res.servedBy;
          entry.agent = AGENT_ID;
          ledger.push(entry);
          log(`${entry.outcome} ${p.side} ${p.sym}${entry.failed ? ' -- ' + entry.failed.join('; ') : ''}`);
        }
        if (!res.actions.length) log('holds');
      } catch (err) {
        w.status = 'error';
        w.error = publicError(err);
        w.lastTurnAt = now;
        log(`error: ${w.error}`);
      }
    }
  }

  // 3. Self-improve from this tick's ledger (and any prior unreviewed if replaying).
  const { memory, added } = await improve({
    memory: state.memory,
    ledger,
    now,
    env,
    log,
    ...(reflect ? { reflect } : {}),
  });
  state.memory = memory;
  if (added.length) log(`improve: playbook now has ${memory.lessons.length} lesson(s), stance ${memory.adapt.stance}`);

  w.equity = r2(equity(w, prices));
  if (!guardOnly) w.history.push([now, w.equity]);
  for (const e of ledger) {
    state.recent.push(e);
    if (state.recent.length > 12) state.recent.shift();
  }
  if (w.equity < rules.minOrderUsd && !Object.keys(w.positions).length) {
    w.status = 'asleep';
    w.note = 'out of money';
  }

  await saveTick({ dir, state, ledger, market, env, now });
  return { state, ledger, market, startCash: START_CASH };
}
