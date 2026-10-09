// AI battle runner. One invocation is one tick.
//
//   node arena/run.mjs --dir <state dir>              guard + every agent takes a turn
//   node arena/run.mjs --dir <state dir> --guard      guard only: stops and targets
//   node arena/run.mjs --dir <state dir> --only gpt,rsi
//
// The state dir holds state.json (wallets), ledger.ndjson (every fill and
// every rejection, append-only), trades.json (the newest LEDGER_KEEP entries,
// for the board) and market.json (what the agents saw on the last turn). The
// arena workflow keeps it on the arena-data branch.

import { readFile, writeFile, appendFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { AGENTS, UNIVERSE, RULES, LEDGER_KEEP, START_CASH, modelFor } from './config.mjs';
import { makeClient, snapshot } from './market.mjs';
import { newWallet, equity, rollDay, preview, execute, ledgerEntry, checkExits } from './broker.mjs';
import { gate } from './rules.mjs';
import { think, hasKey, usesStandin, isBaseline, KEYS } from './agents.mjs';
import { STYLES } from './standins.mjs';
import { loadSpend, saveSpend, reserveCall, settleCall } from './spend-cap.mjs';
import { publicError } from '../collector/safe-error.mjs';

const r2 = (x) => Math.round(x * 100) / 100;
const HISTORY_KEEP = 24 * 90; // about 90 days of hourly points

export async function tick({ dir, guardOnly = false, only = null, client = makeClient(), env = process.env, now = Date.now(), log = console.log }) {
  await mkdir(dir, { recursive: true });
  const statePath = path.join(dir, 'state.json');
  const state = existsSync(statePath) ? JSON.parse(await readFile(statePath, 'utf8')) : { version: 1, startedAt: now, wallets: {} };
  const ledger = [];
  const spend = await loadSpend(dir, now);
  for (const a of AGENTS) state.wallets[a.id] ??= newWallet(a, now);

  // 1. The guard. Stops and targets are enforced here for every wallet,
  //    including agents that are asleep, out of money, or erroring.
  const held = [...new Set(Object.values(state.wallets).flatMap((w) => Object.keys(w.positions)))];
  const since = state.lastGuardAt ?? now - 5 * 60e3;
  const prices = {};
  for (const sym of held) {
    try {
      // Coinbase returns at most 300 candles; a longer gap is clamped to the last 5 hours.
      const candles = await client.candles(sym, 60, Math.max(since - 60e3, now - 299 * 60e3));
      if (candles.length) prices[sym] = candles.at(-1).c;
      for (const w of Object.values(state.wallets)) {
        const e = checkExits(w, sym, candles, since);
        if (e) { ledger.push(e); log(`guard: ${w.id} ${e.outcome} ${sym} at ${e.price} (pnl ${e.pnl})`); }
        if (w.positions[sym] && prices[sym]) w.positions[sym].last = prices[sym];
      }
    } catch (e) { log(`guard: ${sym} unchecked (${e.message})`); }
  }
  state.lastGuardAt = now;

  // 2. Turns.
  let market = null;
  if (!guardOnly) {
    market = await snapshot(client, UNIVERSE, log);
    for (const r of market.rows) prices[r.sym] = r.last;
    const books = new Map();
    const bookFor = async (sym) => {
      if (!books.has(sym)) books.set(sym, client.book(sym).catch((e) => { log(`book: ${sym} (${e.message})`); return null; }));
      return books.get(sym);
    };
    const players = AGENTS.filter((a) => !only || only.includes(a.id));
    // Models think in parallel; tickets are priced and gated one at a time.
    // Paid-model calls share one daily spend ledger so a runaway loop cannot
    // burn the bill; baselines and stand-ins do not count against it.
    // Reservations are taken synchronously before any await so parallel turns
    // cannot all sneak under the same remaining quota.
    const thoughts = await Promise.all(players.map(async (a) => {
      const w = state.wallets[a.id];
      rollDay(w, prices, now);
      const eq = equity(w, prices);
      if (!hasKey(a, env) && !usesStandin(a, env)) return { a, sleep: `no ${KEYS[a.provider]} set` };
      if (eq < RULES.minOrderUsd && !Object.keys(w.positions).length) return { a, sleep: 'out of money' };
      const paid = hasKey(a, env) && !isBaseline(a) && !usesStandin(a, env);
      if (paid) {
        const why = reserveCall(spend, a.provider, env);
        if (why) return { a, sleep: why };
      }
      const recent = state.recent?.[a.id] || [];
      try {
        const res = await think(a, { w, eq, rows: market.rows, prices, recent, now }, env);
        return { a, res, paid };
      } catch (e) {
        return { a, err: publicError(e), paid };
      }
    }));
    for (const { a, res, sleep, err, paid } of thoughts) {
      const w = state.wallets[a.id];
      w.lastTurnAt = now; w.model = modelFor(a, env);
      w.standin = usesStandin(a, env);
      if (sleep) { w.status = 'asleep'; w.note = sleep; w.error = null; continue; }
      if (err) { w.status = 'error'; w.error = err; log(`${a.id}: ${err}`); continue; }
      if (paid) settleCall(spend, { provider: a.provider, usage: res.usage });
      w.turns++; w.status = 'awake'; w.error = null; w.note = res.thoughts; w.servedBy = res.servedBy;
      for (const p of res.actions) {
        const book = UNIVERSE.includes(p.sym) ? await bookFor(p.sym) : null;
        const t = preview(w, p, book, Date.now());
        const g = gate(w, t, { prices, rows: market.rows, now });
        const entry = g.ok ? execute(w, t) : ledgerEntry(w, t, 'rejected', g.checks);
        entry.model = res.servedBy;
        ledger.push(entry);
        log(`${a.id}: ${entry.outcome} ${p.side} ${p.sym}${entry.failed ? ' -- ' + entry.failed.join('; ') : ''}`);
      }
      if (!res.actions.length) log(`${a.id}: holds`);
    }
  }

  // 3. Marks, history, and what the board reads.
  for (const a of AGENTS) {
    const w = state.wallets[a.id];
    w.equity = r2(equity(w, prices));
    if (!guardOnly) { w.history.push([now, w.equity]); if (w.history.length > HISTORY_KEEP) w.history.splice(0, w.history.length - HISTORY_KEEP); }
    if (w.equity < RULES.minOrderUsd && !Object.keys(w.positions).length) { w.status = 'asleep'; w.note = 'out of money'; }
  }
  state.recent ??= {};
  for (const e of ledger) { const q = (state.recent[e.agent] ??= []); q.push(e); if (q.length > 8) q.shift(); }
  state.updatedAt = now;
  if (!guardOnly) state.lastTurnAt = now;
  state.roster = AGENTS.map((a) => ({ id: a.id, name: a.name, provider: a.provider, color: a.color, model: modelFor(a, env), ...(usesStandin(a, env) ? { standin: STYLES[a.id] } : {}) }));
  state.rules = RULES; state.startCash = START_CASH; state.universe = UNIVERSE;
  state.spend = { day: spend.day, usd: spend.usd, tokens: spend.tokens, calls: spend.calls };

  await writeFile(statePath, JSON.stringify(state) + '\n');
  await saveSpend(dir, spend);
  if (ledger.length) await appendFile(path.join(dir, 'ledger.ndjson'), ledger.map((e) => JSON.stringify(e)).join('\n') + '\n');
  const tradesPath = path.join(dir, 'trades.json');
  const prev = existsSync(tradesPath) ? JSON.parse(await readFile(tradesPath, 'utf8')) : [];
  await writeFile(tradesPath, JSON.stringify([...ledger.slice().reverse(), ...prev].slice(0, LEDGER_KEEP)) + '\n');
  if (market) await writeFile(path.join(dir, 'market.json'), JSON.stringify(market) + '\n');
  return { state, ledger, spend };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
  const dir = arg('--dir') || 'arena-out';
  const only = arg('--only')?.split(',');
  let guardOnly = process.argv.includes('--guard');
  // --auto (the scheduled workflow): a turn on the first tick of each UTC hour
  // at or after minute 5, a guard-only tick otherwise. Robust to late crons.
  if (process.argv.includes('--auto')) {
    const sp = path.join(dir, 'state.json');
    const last = existsSync(sp) ? JSON.parse(await readFile(sp, 'utf8')).lastTurnAt : null;
    const hour = (t) => Math.floor(t / 3600e3);
    guardOnly = !(new Date().getUTCMinutes() >= 5 && (!last || hour(last) < hour(Date.now())));
  }
  const { ledger, state } = await tick({ dir, guardOnly, only });
  console.log(`arena: ${guardOnly ? 'guard' : 'turn'}, ${ledger.length} ledger entries -> ${dir}`);
  // A quiet guard tick with nothing open has nothing worth publishing.
  const open = Object.values(state.wallets).some((w) => Object.keys(w.positions).length);
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `changed=${!guardOnly || ledger.length > 0 || open}\n`);
}
