// Claude Fable brain: one turn of market context → structured trade proposals.
// Proposals are never executed here — agent.mjs prices them and rules.mjs gates them.
//
// Not investment advice. Paper trading only in this package.

import Anthropic from '@anthropic-ai/sdk';
import {
  RULES, MAX_ACTIONS, START_CASH, FEE_RATE, STOCK_SPREAD_BPS, modelFor, isStock,
} from './config.mjs';

const TIMEOUT = 180e3;

const num = { type: ['number', 'null'] };
export const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['thoughts', 'bias', 'actions', 'new_lessons'],
  properties: {
    thoughts: {
      type: 'string',
      description: 'Your read of the tape this turn: two to four sentences, present tense.',
    },
    bias: {
      type: 'string',
      enum: ['risk-on', 'neutral', 'risk-off'],
      description: 'Overall stance for new risk this turn.',
    },
    actions: {
      type: 'array',
      maxItems: MAX_ACTIONS,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['side', 'sym', 'usd', 'fraction', 'stop', 'tp', 'reason'],
        properties: {
          side: { type: 'string', enum: ['buy', 'sell', 'stop'] },
          sym: { type: 'string' },
          usd: { ...num, description: 'buy: dollars to spend, before fees' },
          fraction: { ...num, description: 'sell: share of the position to sell, 0-1' },
          stop: { ...num, description: 'buy: stop-loss price (required). stop: new higher stop' },
          tp: { ...num, description: 'optional take-profit price' },
          reason: { type: 'string', description: 'why, one or two sentences' },
        },
      },
    },
    new_lessons: {
      type: 'array',
      maxItems: 2,
      items: { type: 'string' },
      description: 'Optional durable playbook updates from this turn (empty if nothing new).',
    },
  },
};

export const SYSTEM = `You are Claude Fable, an autonomous paper trader running stocks and crypto for a public research project (SIREN / siren.watch). You started with $${START_CASH}. Every proposal is shown next to its fill or rejection.

Markets:
- Crypto (BTC-USD, ETH-USD, …): live Coinbase books, fills simulated against the book, ${FEE_RATE * 100}% fee per fill, 24/7.
- US stocks/ETFs (NVDA, SPY, …): Yahoo last + ${STOCK_SPREAD_BPS / 2} bps half-spread, no commission. Only while the US regular session is open (9:30–16:00 New York, weekdays). The "open" column says whether it is open now.

You only propose. A server prices each proposal into a ticket and enforces these rules; a broken proposal is rejected in public:
- Spot only, long only. Symbols must appear in the market table. Stocks only while open.
- Every buy needs a stop between ${RULES.minStopPct}% and ${RULES.maxStopPct}% below the fill. Take-profit optional.
- One position ≤ ${RULES.maxPositionPct}% of equity after the buy. At most ${RULES.maxOpenPositions} open positions. Keep ≥ ${RULES.minCashPct}% of equity in cash.
- Minimum order $${RULES.minOrderUsd}. Slippage vs mid ≤ ${RULES.maxSlippagePct}%. Round-trip sell-back ≥ ${RULES.minSellbackPct}% after fees. 24h dollar volume ≥ $${RULES.minVolumeUsd24h / 1e6}M.
- At most ${RULES.maxTradesPerDay} discretionary trades per UTC day. No new buys once equity is ${RULES.dailyLossHaltPct}% below the day's open. No rebuy within ${RULES.cooldownMin} minutes of a close.
- "stop" actions only raise a stop (never lower it) or set a target on a held name.

Style for Claude Fable:
- Prefer clean trends (price above short and medium averages, positive day change) over chasing one-hour spikes.
- Size smaller when bias is risk-off; do nothing when the tape is noisy or the book is thin.
- Always explain the trade in plain language. Doing nothing (empty actions) is a valid, often correct turn.

Self-improvement:
- You receive a memory block of lessons and adapt knobs from your own past paper trades. Obey them.
- Respect sizeScale and stopBiasPct when sizing buys and placing stops.
- When you notice a clear pattern this turn, put a short durable lesson in new_lessons (else []).
- Do not invent market forecasts; only revise how you trade.

Reply with JSON only matching the schema. Not investment advice.`;

const f = (x, d = 2) => (x == null ? '-' : (+x).toFixed(d));
const px = (x) => (x == null ? '-' : x >= 100 ? x.toFixed(2) : x >= 1 ? x.toFixed(4) : x.toPrecision(4));

export function turnPrompt({ w, eq, rows, prices, recent, now, memoryBlock = '' }) {
  const pos = Object.entries(w.positions).map(([sym, p]) => {
    const last = prices[sym] ?? p.avg;
    return `${sym} qty ${+p.qty.toPrecision(8)} avg ${px(p.avg)} last ${px(last)} value $${f(p.qty * last)} pnl ${f((last / p.avg - 1) * 100)}% stop ${px(p.stop)} target ${px(p.tp)}`;
  });
  const table = rows.map((r) => [
    r.sym,
    r.type || (isStock(r.sym) ? 'stock' : 'crypto'),
    r.open === false ? 'closed' : 'open',
    px(r.last),
    f(r.chg1h),
    f(r.chg24h),
    f(r.chg7d),
    f(r.rsi14h, 1),
    f(r.vsSma20hPct),
    f(r.vsSma50hPct),
    f(r.atr14hPct),
    (r.vol24hUsd / 1e6).toFixed(1),
  ].join(','));
  const hist = recent.map((e) =>
    `${new Date(e.at).toISOString().slice(5, 16)} ${e.outcome} ${e.side} ${e.sym}`
    + `${e.usd != null ? ' $' + e.usd : ''}${e.pnl != null ? ' pnl $' + e.pnl : ''}`
    + `${e.failed ? ' -- ' + e.failed.join('; ') : ''}`);
  return `Time: ${new Date(now).toISOString()}
Wallet: cash $${f(w.cash)}, equity $${f(eq)} (${f((eq / START_CASH - 1) * 100)}% since start), day open $${f(w.day.equity)}, trades today ${w.day.trades}/${RULES.maxTradesPerDay}.
Positions:
${pos.join('\n') || '(none)'}

Market (hourly candles; stocks use regular session; chg in %; vol in $M over 24h):
sym,type,open,last,chg1h,chg24h,chg7d,rsi14h,vsSma20h,vsSma50h,atr14h,vol24h
${table.join('\n')}

Your recent activity:
${hist.join('\n') || '(none yet)'}

${memoryBlock}`.trim();
}

function parseJSON(text) {
  const s = String(text || '').trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error('no JSON object in the reply');
  return JSON.parse(s.slice(a, b + 1));
}

export function normalize(out) {
  const actions = Array.isArray(out?.actions)
    ? out.actions.filter((x) => x && typeof x === 'object').slice(0, MAX_ACTIONS)
    : [];
  const bias = ['risk-on', 'neutral', 'risk-off'].includes(out?.bias) ? out.bias : 'neutral';
  const new_lessons = Array.isArray(out?.new_lessons)
    ? out.new_lessons.map((x) => String(x || '').trim().slice(0, 280)).filter((x) => x.length >= 12).slice(0, 2)
    : [];
  return {
    thoughts: String(out?.thoughts || '').slice(0, 800),
    bias,
    actions: actions.map((x) => ({
      side: String(x.side || '').toLowerCase(),
      sym: String(x.sym || '').toUpperCase().replace(/[^A-Z0-9-]/g, ''),
      usd: x.usd ?? null,
      fraction: x.fraction ?? null,
      stop: x.stop ?? null,
      tp: x.tp ?? null,
      reason: String(x.reason || '').slice(0, 400),
    })),
    new_lessons,
  };
}

export async function askFable(ctx, env = process.env) {
  const key = env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set');
  const model = modelFor(env);
  const client = new Anthropic({ apiKey: key, timeout: TIMEOUT, maxRetries: 2 });
  const user = turnPrompt({ ...ctx, memoryBlock: ctx.memoryBlock || '' });
  const modern = !/^claude-haiku-4/.test(model);
  const res = await client.beta.messages.create({
    model,
    max_tokens: 16000,
    system: SYSTEM,
    messages: [{ role: 'user', content: user }],
    output_config: {
      format: { type: 'json_schema', schema: SCHEMA },
      ...(modern ? { effort: 'high' } : {}),
    },
    ...(modern ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } : {}),
  });
  if (res.stop_reason === 'refusal') {
    throw new Error(`refused${res.stop_details?.category ? ` (${res.stop_details.category})` : ''}`);
  }
  const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  return {
    ...normalize(parseJSON(text)),
    servedBy: res.model,
    usage: res.usage,
    model,
  };
}
