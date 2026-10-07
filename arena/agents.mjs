// The players. Each turn an agent sees the market and its own wallet and
// replies with up to MAX_ACTIONS proposals. Proposals are only proposals:
// run.mjs prices each one into a ticket and rules.mjs decides.

import { RULES, MAX_ACTIONS, START_CASH, FEE_RATE, STOCK_SPREAD_BPS, modelFor, isStock } from './config.mjs';
import { standin, hasStandin } from './standins.mjs';

export const KEYS = {
  anthropic: 'ANTHROPIC_API_KEY', openai: 'OPENAI_API_KEY', xai: 'XAI_API_KEY',
  gemini: 'GEMINI_API_KEY', deepseek: 'DEEPSEEK_API_KEY',
};
export const isBaseline = (a) => a.provider === 'hodl' || a.provider === 'rsi';
export const hasKey = (a, env = process.env) => isBaseline(a) || !!env[KEYS[a.provider]];
// No key: trade a labelled rule-based stand-in instead of sleeping, unless
// ARENA_STANDINS=off. The model takes over the turn its key is set.
export const usesStandin = (a, env = process.env) => !hasKey(a, env) && hasStandin(a.id) && env.ARENA_STANDINS !== 'off';

const num = { type: ['number', 'null'] };
export const SCHEMA = {
  type: 'object', additionalProperties: false, required: ['thoughts', 'actions'],
  properties: {
    thoughts: { type: 'string', description: 'Your read of the market this turn, two or three sentences.' },
    actions: {
      type: 'array', maxItems: MAX_ACTIONS,
      items: {
        type: 'object', additionalProperties: false,
        required: ['side', 'sym', 'usd', 'fraction', 'stop', 'tp', 'reason'],
        properties: {
          side: { type: 'string', enum: ['buy', 'sell', 'stop'] },
          sym: { type: 'string' },
          usd: { ...num, description: 'buy: dollars to spend, before fees' },
          fraction: { ...num, description: 'sell: share of the position to sell, 0-1' },
          stop: { ...num, description: 'buy: stop-loss price (required). stop: the new, higher stop price' },
          tp: { ...num, description: 'optional take-profit price' },
          reason: { type: 'string', description: 'why, in one or two sentences; shown publicly next to the trade' },
        },
      },
    },
  },
};

export const SYSTEM = `You are one of several AI models trading in a public paper-money competition across crypto and US stocks. You started with $${START_CASH}. Every trade you make and your reason for it are shown publicly the moment it executes.
- Crypto (symbols like BTC-USD): live Coinbase order books, fills simulated against the real book, ${FEE_RATE * 100}% fee per fill. Trades around the clock.
- US stocks and ETFs (symbols like NVDA, SPY): live Yahoo Finance prices, filled at the last price plus a ${STOCK_SPREAD_BPS / 2} bps half-spread, no commission. They trade only while the US market is open (9:30-16:00 New York, weekdays); the "open" column says whether it is open now. A stock's stop is still enforced at the next open, and a gap through it fills at the opening price.

You only propose. A server prices each proposal into a ticket and checks it against these rules before executing; a proposal that breaks any rule is rejected and the rejection is shown publicly too:
- Spot only, long only: buy, or sell what you hold. Symbols must come from the market table. Stocks only while the market is open.
- Every buy needs a stop-loss between ${RULES.minStopPct}% and ${RULES.maxStopPct}% below the fill price. A take-profit is optional.
- One position may not exceed ${RULES.maxPositionPct}% of equity after the buy. At most ${RULES.maxOpenPositions} open positions. Keep at least ${RULES.minCashPct}% of equity in cash.
- Minimum order $${RULES.minOrderUsd}. Slippage against mid at most ${RULES.maxSlippagePct}%. Buying the size and selling it straight back must return at least ${RULES.minSellbackPct}% after fees. The asset must have traded at least $${RULES.minVolumeUsd24h / 1e6}M in 24 hours (stocks: average daily dollar volume).
- At most ${RULES.maxTradesPerDay} trades per UTC day. No new buys once equity is ${RULES.dailyLossHaltPct}% below the day's open. No rebuying an asset within ${RULES.cooldownMin} minutes of closing it.
- "stop" actions move a stop or target on a position you hold. Stops can only be raised, never lowered.

The server checks stops and targets every few minutes against 1-minute candles, whether or not you are awake. You get a turn about once an hour.

Doing nothing is a valid turn: return an empty actions list when nothing is worth doing. Reply with JSON only, matching this shape:
{"thoughts": string, "actions": [{"side": "buy"|"sell"|"stop", "sym": string, "usd": number|null, "fraction": number|null, "stop": number|null, "tp": number|null, "reason": string}]}`;

const f = (x, d = 2) => (x == null ? '-' : (+x).toFixed(d));
const px = (x) => (x == null ? '-' : x >= 100 ? x.toFixed(2) : x >= 1 ? x.toFixed(4) : x.toPrecision(4));

export function turnPrompt({ w, eq, rows, prices, recent, now }) {
  const pos = Object.entries(w.positions).map(([sym, p]) => {
    const last = prices[sym] ?? p.avg;
    return `${sym} qty ${+p.qty.toPrecision(8)} avg ${px(p.avg)} last ${px(last)} value $${f(p.qty * last)} pnl ${f((last / p.avg - 1) * 100)}% stop ${px(p.stop)} target ${px(p.tp)}`;
  });
  const table = rows.map((r) => [r.sym, r.type || (isStock(r.sym) ? 'stock' : 'crypto'), r.open === false ? 'closed' : 'open', px(r.last), f(r.chg1h), f(r.chg24h), f(r.chg7d), f(r.rsi14h, 1), f(r.vsSma20hPct), f(r.vsSma50hPct), f(r.atr14hPct), (r.vol24hUsd / 1e6).toFixed(1)].join(','));
  const hist = recent.map((e) => `${new Date(e.at).toISOString().slice(5, 16)} ${e.outcome} ${e.side} ${e.sym}${e.usd != null ? ' $' + e.usd : ''}${e.pnl != null ? ' pnl $' + e.pnl : ''}${e.failed ? ' -- ' + e.failed.join('; ') : ''}`);
  return `Time: ${new Date(now).toISOString()}
Wallet: cash $${f(w.cash)}, equity $${f(eq)} (${f((eq / START_CASH - 1) * 100)}% since start), day open $${f(w.day.equity)}, trades today ${w.day.trades}/${RULES.maxTradesPerDay}.
Positions:
${pos.join('\n') || '(none)'}

Market (hourly candles, regular session only for stocks; chg in %, for stocks chg24h is since the previous close; rsi14 on 1h, vs SMA in %, atr14 as % of price, vol in $M over 24h):
sym,type,open,last,chg1h,chg24h,chg7d,rsi14h,vsSma20h,vsSma50h,atr14h,vol24h
${table.join('\n')}

Your recent activity:
${hist.join('\n') || '(none yet)'}`;
}

function parseJSON(text) {
  const s = String(text || '').trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error('no JSON object in the reply');
  return JSON.parse(s.slice(a, b + 1));
}

// Coerce whatever came back into proposals; anything malformed is dropped here
// and anything merely wrong is left for the rule gate to reject in public.
export function normalize(out) {
  const actions = Array.isArray(out?.actions) ? out.actions.filter((x) => x && typeof x === 'object').slice(0, MAX_ACTIONS) : [];
  return {
    thoughts: String(out?.thoughts || '').slice(0, 600),
    actions: actions.map((x) => ({
      side: String(x.side || '').toLowerCase(), sym: String(x.sym || '').toUpperCase().replace(/[^A-Z0-9-]/g, ''),
      usd: x.usd ?? null, fraction: x.fraction ?? null, stop: x.stop ?? null, tp: x.tp ?? null,
      reason: String(x.reason || '').slice(0, 400),
    })),
  };
}

const TIMEOUT = 180e3;

async function anthropic(a, model, user, env) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: TIMEOUT, maxRetries: 2 });
  // Haiku 4.5 takes neither effort nor server-side fallbacks.
  const modern = !/^claude-haiku-4/.test(model);
  const res = await client.beta.messages.create({
    model, max_tokens: 16000, system: SYSTEM,
    messages: [{ role: 'user', content: user }],
    output_config: { format: { type: 'json_schema', schema: SCHEMA }, ...(modern ? { effort: 'medium' } : {}) },
    ...(modern ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } : {}),
  });
  if (res.stop_reason === 'refusal') throw new Error(`refused${res.stop_details?.category ? ` (${res.stop_details.category})` : ''}`);
  const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  // With fallbacks on, another model may have answered; the board says so.
  return { out: parseJSON(text), servedBy: res.model, usage: res.usage };
}

async function openaiStyle(url, keyName, a, model, user, env, { strict = true } = {}) {
  const body = {
    model,
    messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: user }],
    response_format: strict ? { type: 'json_schema', json_schema: { name: 'turn', strict: true, schema: SCHEMA } } : { type: 'json_object' },
  };
  const r = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env[keyName]}` },
    body: JSON.stringify(body), signal: AbortSignal.timeout(TIMEOUT),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${j?.error?.message || 'request failed'}`);
  return { out: parseJSON(j.choices?.[0]?.message?.content), servedBy: j.model || model, usage: j.usage };
}

async function gemini(a, model, user, env) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${j?.error?.message || 'request failed'}`);
  const text = (j.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
  return { out: parseJSON(text), servedBy: j.modelVersion || model, usage: j.usageMetadata };
}

// Baselines play by the same rules through the same gate.
const clampStop = (last, atrPct, k) => last * (1 - Math.min(Math.max((atrPct || 2) * k, RULES.minStopPct + 0.5), RULES.maxStopPct - 0.5) / 100);

function hodl({ w, eq, rows }) {
  const want = ['BTC-USD', 'ETH-USD', 'SOL-USD', 'XRP-USD'];
  const actions = [];
  for (const sym of want) {
    const r = rows.find((x) => x.sym === sym);
    if (!r || w.positions[sym] || actions.length >= MAX_ACTIONS) continue;
    actions.push({ side: 'buy', sym, usd: Math.floor(eq * 0.22), fraction: null, stop: r.last * (1 - (RULES.maxStopPct - 1) / 100), tp: null,
      reason: 'Baseline: hold the four largest coins at equal weight, with the widest stop allowed.' });
  }
  return { thoughts: 'Baseline. Buys and holds; it never reads the market.', actions };
}

function rsiBot({ w, eq, rows }) {
  const actions = [];
  for (const sym of Object.keys(w.positions)) {
    const r = rows.find((x) => x.sym === sym);
    if (r && r.open !== false && r.rsi14h > 70 && actions.length < MAX_ACTIONS) actions.push({ side: 'sell', sym, usd: null, fraction: 1, stop: null, tp: null, reason: `Baseline: RSI ${r.rsi14h} is above 70, take the bounce.` });
  }
  const dips = rows.filter((r) => r.open !== false && r.rsi14h != null && r.rsi14h < 30 && !w.positions[r.sym]).sort((a, b) => a.rsi14h - b.rsi14h);
  for (const r of dips) {
    if (actions.length >= MAX_ACTIONS) break;
    actions.push({ side: 'buy', sym: r.sym, usd: Math.floor(eq * 0.2), fraction: null, stop: clampStop(r.last, r.atr14hPct, 2), tp: r.last * (1 + Math.max((r.atr14hPct || 2) * 3, 2) / 100),
      reason: `Baseline: hourly RSI ${r.rsi14h} is below 30. Stop two ATRs down, target three up.` });
  }
  return { thoughts: 'Baseline. Buys hourly RSI under 30, sells over 70.', actions };
}

export async function think(a, ctx, env = process.env) {
  const model = modelFor(a, env);
  if (a.provider === 'hodl') return { ...hodl(ctx), servedBy: 'baseline' };
  if (a.provider === 'rsi') return { ...rsiBot(ctx), servedBy: 'baseline' };
  if (usesStandin(a, env)) return { ...standin(a.id, ctx), servedBy: 'stand-in' };
  const user = turnPrompt(ctx);
  let res;
  if (a.provider === 'anthropic') res = await anthropic(a, model, user, env);
  else if (a.provider === 'openai') res = await openaiStyle('https://api.openai.com/v1/chat/completions', 'OPENAI_API_KEY', a, model, user, env);
  else if (a.provider === 'xai') res = await openaiStyle('https://api.x.ai/v1/chat/completions', 'XAI_API_KEY', a, model, user, env);
  else if (a.provider === 'deepseek') res = await openaiStyle('https://api.deepseek.com/chat/completions', 'DEEPSEEK_API_KEY', a, model, user, env, { strict: false });
  else if (a.provider === 'gemini') res = await gemini(a, model, user, env);
  else throw new Error(`unknown provider ${a.provider}`);
  return { ...normalize(res.out), servedBy: res.servedBy, usage: res.usage };
}
