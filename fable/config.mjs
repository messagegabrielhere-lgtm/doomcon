// Claude Fable autonomous trader — knobs only. Paper money by default.
// Live mode is refused unless FABLE_LIVE=I_ACCEPT_RISK (see agent.mjs).
//
// Not investment advice. This package simulates fills against public prices;
// nothing here moves funds unless you deliberately wire a live broker later.

import {
  CRYPTO, STOCKS, UNIVERSE, RULES as ARENA_RULES, FEE_RATE, STOCK_SPREAD_BPS,
  STOCK_FEE_RATE, isStock, feeFor,
} from '../arena/config.mjs';

export const AGENT_ID = 'fable';
export const AGENT_NAME = 'Claude Fable';
export const DEFAULT_MODEL = 'claude-fable-5-1';
export const START_CASH = 10_000;
export const MAX_ACTIONS = 4;
export const LEDGER_KEEP = 500;
export const HISTORY_KEEP = 24 * 90;

// Reuse the arena universe and hard rules so one gate language covers both
// the battle board and this solo agent.
export { CRYPTO, STOCKS, UNIVERSE, FEE_RATE, STOCK_SPREAD_BPS, STOCK_FEE_RATE, isStock, feeFor };

// Solo-agent risk overlay on top of the shared arena gate.
export const RULES = {
  ...ARENA_RULES,
  maxOpenPositions: 5,
  maxPositionPct: 20,
  maxTradesPerDay: 10,
  dailyLossHaltPct: 8,
  minCashPct: 10,
};

export const modelFor = (env = process.env) =>
  env.FABLE_MODEL || env.ARENA_MODEL_FABLE || DEFAULT_MODEL;

export const LIVE_PHRASE = 'I_ACCEPT_RISK';

export function isLive(env = process.env) {
  return env.FABLE_LIVE === LIVE_PHRASE;
}

export function modeLabel(env = process.env) {
  return isLive(env) ? 'LIVE (refused — paper only in this build)' : 'paper';
}
