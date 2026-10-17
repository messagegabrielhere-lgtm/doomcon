// Persist the solo Fable wallet, ledger, and last market snapshot.
// Not investment advice.

import { readFile, writeFile, appendFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { AGENT_ID, AGENT_NAME, START_CASH, LEDGER_KEEP, HISTORY_KEEP, RULES, UNIVERSE, modelFor } from './config.mjs';
import { dayKey } from '../arena/broker.mjs';
import { emptyMemory } from './improve.mjs';

export function newFableWallet(now) {
  return {
    id: AGENT_ID,
    cash: START_CASH,
    positions: {},
    cooldowns: {},
    day: { date: dayKey(now), equity: START_CASH, trades: 0 },
    history: [[now, START_CASH]],
    startedAt: now,
    turns: 0,
    status: 'new',
    note: null,
    error: null,
    lastTurnAt: null,
    house: {},
  };
}

export async function loadState(dir, now = Date.now()) {
  await mkdir(dir, { recursive: true });
  const statePath = path.join(dir, 'state.json');
  if (!existsSync(statePath)) {
    return {
      version: 1,
      agent: { id: AGENT_ID, name: AGENT_NAME },
      startedAt: now,
      wallet: newFableWallet(now),
      recent: [],
      memory: emptyMemory(now),
      disclaimer: 'Not investment advice. Paper trading only.',
    };
  }
  const state = JSON.parse(await readFile(statePath, 'utf8'));
  state.wallet ??= newFableWallet(now);
  state.recent ??= [];
  state.memory ??= emptyMemory(now);
  state.agent ??= { id: AGENT_ID, name: AGENT_NAME };
  return state;
}

export async function saveTick({ dir, state, ledger, market, env, now }) {
  const w = state.wallet;
  state.updatedAt = now;
  state.rules = RULES;
  state.startCash = START_CASH;
  state.universe = UNIVERSE;
  state.model = modelFor(env);
  state.disclaimer = 'Not investment advice. Paper trading only.';
  state.memory ??= emptyMemory(now);

  if (w.history.length > HISTORY_KEEP) w.history.splice(0, w.history.length - HISTORY_KEEP);

  await writeFile(path.join(dir, 'state.json'), JSON.stringify(state, null, 2) + '\n');
  // Compact playbook snapshot for operators / other tools.
  await writeFile(path.join(dir, 'memory.json'), JSON.stringify({
    updatedAt: state.memory.updatedAt,
    stats: state.memory.stats,
    adapt: state.memory.adapt,
    lessons: state.memory.lessons,
    lastReflect: state.memory.lastReflect || null,
    disclaimer: state.disclaimer,
  }, null, 2) + '\n');
  if (ledger.length) {
    await appendFile(path.join(dir, 'ledger.ndjson'), ledger.map((e) => JSON.stringify(e)).join('\n') + '\n');
  }
  const tradesPath = path.join(dir, 'trades.json');
  const prev = existsSync(tradesPath) ? JSON.parse(await readFile(tradesPath, 'utf8')) : [];
  await writeFile(tradesPath, JSON.stringify([...ledger.slice().reverse(), ...prev].slice(0, LEDGER_KEEP), null, 2) + '\n');
  if (market) await writeFile(path.join(dir, 'market.json'), JSON.stringify(market) + '\n');
}

export async function readStatus(dir) {
  const statePath = path.join(dir, 'state.json');
  if (!existsSync(statePath)) return null;
  return JSON.parse(await readFile(statePath, 'utf8'));
}
