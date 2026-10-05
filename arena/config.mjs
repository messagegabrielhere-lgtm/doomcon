// AI battle: who plays, with how much, under which rules.
//
// Everything here is paper money. Prices and order books are real (Coinbase
// Exchange public API); fills, wallets and P&L are simulated. Nothing in
// arena/ holds a key that can move funds.

export const START_CASH = 1000;          // USD per agent
export const FEE_RATE = 0.006;           // per fill, Coinbase's taker fee at the lowest tier
export const MAX_ACTIONS = 3;            // proposals an agent may make per turn
export const LEDGER_KEEP = 500;          // trades kept in trades.json for the board

// Spot USD pairs. Long-only: an agent can buy, and sell what it holds.
export const UNIVERSE = [
  'BTC-USD', 'ETH-USD', 'SOL-USD', 'XRP-USD', 'DOGE-USD', 'ADA-USD', 'AVAX-USD', 'LINK-USD',
  'DOT-USD', 'LTC-USD', 'BCH-USD', 'NEAR-USD', 'SUI-USD', 'APT-USD', 'ARB-USD', 'OP-USD',
  'UNI-USD', 'AAVE-USD', 'HBAR-USD', 'XLM-USD', 'FET-USD', 'RENDER-USD', 'INJ-USD', 'PEPE-USD',
];

// The rules the server enforces on every proposal before it is "signed".
// An agent is told these rules, but telling it is not what enforces them.
export const RULES = {
  minOrderUsd: 10,
  maxPositionPct: 25,        // one position may not exceed this share of equity after the buy
  maxOpenPositions: 4,
  minCashPct: 5,             // a buy may not take cash below this share of equity
  stopRequired: true,
  minStopPct: 1,             // stop at least this far below the entry...
  maxStopPct: 15,            // ...and no further than this
  minSellbackPct: 95,        // round trip through the live book must return at least this share
  maxSlippagePct: 1,         // expected fill vs mid
  minVolumeUsd24h: 5e6,      // liquidity floor
  maxTradesPerDay: 8,        // buys and discretionary sells; stop and target exits don't count
  dailyLossHaltPct: 10,      // no new buys once equity is this far below the day's open
  cooldownMin: 60,           // no rebuy of a symbol this soon after closing it
  minReasonChars: 12,
  maxQuoteAgeSec: 120,       // the book used for a ticket must be this fresh
};

// The roster. `provider` picks the adapter in agents.mjs; `model` can be
// overridden per agent with ARENA_MODEL_<ID> (e.g. ARENA_MODEL_GPT=gpt-5.1).
// An LLM agent whose key is missing sleeps instead of trading.
export const AGENTS = [
  { id: 'opus',     name: 'Claude Opus',    provider: 'anthropic', model: 'claude-opus-5-5',   color: '#d97757' },
  { id: 'sonnet',   name: 'Claude Sonnet',  provider: 'anthropic', model: 'claude-sonnet-5-5', color: '#e0a07c' },
  { id: 'haiku',    name: 'Claude Haiku',   provider: 'anthropic', model: 'claude-haiku-4-5',  color: '#c9805e' },
  { id: 'gpt',      name: 'GPT',            provider: 'openai',    model: 'gpt-5',             color: '#10a37f' },
  { id: 'grok',     name: 'Grok',           provider: 'xai',       model: 'grok-4',            color: '#8b8b8b' },
  { id: 'gemini',   name: 'Gemini',         provider: 'gemini',    model: 'gemini-2.5-pro',    color: '#4285f4' },
  { id: 'deepseek', name: 'DeepSeek',       provider: 'deepseek',  model: 'deepseek-chat',     color: '#4d6bfe' },
  // Baselines: no model, no key. Any AI that can't beat these isn't adding much.
  { id: 'hodl',     name: 'Buy & hold',     provider: 'hodl',      model: 'baseline',          color: '#f7931a' },
  { id: 'rsi',      name: 'RSI dip bot',    provider: 'rsi',       model: 'baseline',          color: '#9c6ade' },
];

export const modelFor = (a, env = process.env) => env[`ARENA_MODEL_${a.id.toUpperCase()}`] || a.model;
