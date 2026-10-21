// Self-improvement loop for Claude Fable.
//
// After each tick, closed trades and rejections update:
//   - stats (win rate, PnL, reject reasons, per-symbol)
//   - lessons (durable text the next turn must respect)
//   - adapt knobs (size scale, stop bias, stance) — clamped, deterministic
//
// Optional model reflection (when ANTHROPIC_API_KEY is set and new exits exist)
// can add/retire lessons. Rule extraction always runs.
//
// Not investment advice. Paper trading only. No Math.random().

import Anthropic from '@anthropic-ai/sdk';
import { createHash } from 'node:crypto';
import { RULES, modelFor } from './config.mjs';

export const MAX_LESSONS = 12;
export const MAX_REVIEWED = 400;

const clamp = (x, lo, hi) => Math.min(Math.max(x, lo), hi);
const r2 = (x) => Math.round(x * 100) / 100;
const r3 = (x) => Math.round(x * 1000) / 1000;

export function emptyMemory(now = Date.now()) {
  return {
    version: 1,
    updatedAt: now,
    stats: {
      closed: 0, wins: 0, losses: 0, stops: 0, targets: 0, sells: 0, rejects: 0, buys: 0,
      sumPnl: 0, winRate: null, avgWin: null, avgLoss: null,
      bySym: {},
      rejectReasons: {},
      streak: { kind: null, n: 0 },
    },
    lessons: [],
    adapt: {
      sizeScale: 1,
      stopBiasPct: 0,
      maxPositionPct: RULES.maxPositionPct,
      stance: 'neutral',
      preferCrypto: 0,
      preferStock: 0,
    },
    reviewedIds: [],
  };
}

function ensureMemory(raw, now) {
  const m = raw && typeof raw === 'object' ? raw : emptyMemory(now);
  m.stats ??= emptyMemory(now).stats;
  m.stats.bySym ??= {};
  m.stats.rejectReasons ??= {};
  m.stats.streak ??= { kind: null, n: 0 };
  m.lessons ??= [];
  m.adapt ??= emptyMemory(now).adapt;
  m.reviewedIds ??= [];
  return m;
}

function lessonId(text) {
  return createHash('sha256').update(String(text).trim().toLowerCase()).digest('hex').slice(0, 12);
}

export function upsertLesson(memory, text, { source = 'rule', at = Date.now(), weight = 1 } = {}) {
  const t = String(text || '').trim().slice(0, 280);
  if (t.length < 12) return null;
  const id = lessonId(t);
  const existing = memory.lessons.find((l) => l.id === id);
  if (existing) {
    existing.hits = (existing.hits || 0) + 1;
    existing.weight = clamp((existing.weight || 1) + 0.15, 0.5, 3);
    existing.at = at;
    return existing;
  }
  const lesson = { id, text: t, source, weight, hits: 1, at };
  memory.lessons.unshift(lesson);
  // Drop lowest-weight oldest when over cap.
  while (memory.lessons.length > MAX_LESSONS) {
    let worst = 0;
    for (let i = 1; i < memory.lessons.length; i++) {
      const a = memory.lessons[i];
      const b = memory.lessons[worst];
      if ((a.weight || 1) < (b.weight || 1) || ((a.weight || 1) === (b.weight || 1) && a.at < b.at)) worst = i;
    }
    memory.lessons.splice(worst, 1);
  }
  return lesson;
}

function bumpSym(stats, sym, pnl) {
  const s = stats.bySym[sym] || (stats.bySym[sym] = { n: 0, pnl: 0, wins: 0, losses: 0 });
  s.n++;
  s.pnl = r2(s.pnl + (pnl || 0));
  if (pnl > 0) s.wins++;
  else if (pnl < 0) s.losses++;
}

function setStreak(stats, kind) {
  if (stats.streak.kind === kind) stats.streak.n++;
  else stats.streak = { kind, n: 1 };
}

function recomputeAverages(stats) {
  stats.winRate = stats.closed ? r2((stats.wins / stats.closed) * 100) : null;
  const winsPnl = stats._winPnl || 0;
  const lossPnl = stats._lossPnl || 0;
  stats.avgWin = stats.wins ? r2(winsPnl / stats.wins) : null;
  stats.avgLoss = stats.losses ? r2(lossPnl / stats.losses) : null;
}

/** Apply one ledger entry into memory stats. Returns true if it was new. */
export function ingestEntry(memory, entry, now = Date.now()) {
  if (!entry?.id || memory.reviewedIds.includes(entry.id)) return false;
  memory.reviewedIds.push(entry.id);
  if (memory.reviewedIds.length > MAX_REVIEWED) {
    memory.reviewedIds.splice(0, memory.reviewedIds.length - MAX_REVIEWED);
  }

  const stats = memory.stats;
  if (entry.outcome === 'rejected') {
    stats.rejects++;
    for (const f of entry.failed || []) {
      const rule = String(f).split(':')[0].trim() || 'unknown';
      stats.rejectReasons[rule] = (stats.rejectReasons[rule] || 0) + 1;
    }
    return true;
  }
  if (entry.side === 'buy' && entry.outcome === 'filled') {
    stats.buys++;
    return true;
  }
  if (entry.side === 'sell' || entry.outcome === 'stopped' || entry.outcome === 'target') {
    const pnl = Number(entry.pnl) || 0;
    stats.closed++;
    stats.sumPnl = r2(stats.sumPnl + pnl);
    stats._winPnl = stats._winPnl || 0;
    stats._lossPnl = stats._lossPnl || 0;
    if (pnl > 0) { stats.wins++; stats._winPnl += pnl; setStreak(stats, 'win'); }
    else if (pnl < 0) { stats.losses++; stats._lossPnl += pnl; setStreak(stats, 'loss'); }
    else setStreak(stats, 'flat');
    if (entry.outcome === 'stopped') stats.stops++;
    else if (entry.outcome === 'target') stats.targets++;
    else stats.sells++;
    bumpSym(stats, entry.sym, pnl);
    recomputeAverages(stats);
    memory.updatedAt = now;
    return true;
  }
  return true;
}

/** Deterministic lessons + knobs from current stats. */
export function extractLessons(memory, now = Date.now()) {
  const { stats, adapt } = memory;
  const added = [];
  const add = (text) => {
    const l = upsertLesson(memory, text, { source: 'rule', at: now });
    if (l && l.hits === 1) added.push(l);
  };

  if (stats.streak.kind === 'loss' && stats.streak.n >= 3) {
    add(`After ${stats.streak.n} losing exits in a row, demand cleaner trends (price above both hourly averages) and cut size.`);
  }
  if (stats.streak.kind === 'win' && stats.streak.n >= 3) {
    add(`Winning streak of ${stats.streak.n}: trail stops earlier and take partial profits rather than giving back the whole move.`);
  }
  if (stats.stops >= 3 && stats.closed >= 5 && stats.stops / stats.closed >= 0.5) {
    add('Stops fire often: wait for pullbacks into the trend instead of buying extended hour spikes.');
  }
  if (stats.rejects >= 3) {
    const top = Object.entries(stats.rejectReasons).sort((a, b) => b[1] - a[1])[0];
    if (top) add(`Gate often rejects on "${top[0]}" (${top[1]}×). Size and stop proposals to clear that rule before sending.`);
  }
  for (const [sym, s] of Object.entries(stats.bySym)) {
    if (s.n >= 2 && s.losses >= 2 && s.pnl < 0) {
      add(`${sym} has lost money on ${s.losses} closed trades (net $${s.pnl}). Be slower to rebuy it.`);
    }
  }
  if (stats.closed >= 8 && stats.winRate != null && stats.winRate < 40) {
    add(`Win rate is ${stats.winRate}% over ${stats.closed} closes. Prefer holding cash until setups are obvious.`);
  }
  if (stats.closed >= 8 && stats.winRate != null && stats.winRate >= 60 && stats.sumPnl > 0) {
    add(`Win rate is ${stats.winRate}% with positive net PnL. Keep the same entry style; do not loosen stops.`);
  }

  // Bounded adaptation from recent sample (last closed count).
  if (stats.closed >= 5) {
    const wr = (stats.winRate ?? 50) / 100;
    // sizeScale: 0.55 .. 1.15
    adapt.sizeScale = r3(clamp(0.55 + wr * 0.7 + (stats.sumPnl > 0 ? 0.05 : -0.05), 0.55, 1.15));
    // stopBiasPct: widen stops a bit when many stop-outs, tighten when few
    const stopRate = stats.stops / stats.closed;
    adapt.stopBiasPct = r2(clamp((stopRate - 0.35) * 4, -2, 2));
    adapt.maxPositionPct = r2(clamp(RULES.maxPositionPct * adapt.sizeScale, 10, RULES.maxPositionPct));
    if (wr < 0.4 || stats.streak.kind === 'loss' && stats.streak.n >= 2) adapt.stance = 'risk-off';
    else if (wr >= 0.55 && stats.sumPnl > 0) adapt.stance = 'risk-on';
    else adapt.stance = 'neutral';

    let cryptoPnl = 0; let stockPnl = 0;
    for (const [sym, s] of Object.entries(stats.bySym)) {
      if (String(sym).includes('-')) cryptoPnl += s.pnl;
      else stockPnl += s.pnl;
    }
    adapt.preferCrypto = r2(clamp(cryptoPnl / 200, -2, 2));
    adapt.preferStock = r2(clamp(stockPnl / 200, -2, 2));
  }

  memory.updatedAt = now;
  return added;
}

export function effectiveRules(base = RULES, adapt = emptyMemory().adapt) {
  return {
    ...base,
    maxPositionPct: clamp(adapt.maxPositionPct ?? base.maxPositionPct, 10, base.maxPositionPct),
  };
}

export function memoryPromptBlock(memory) {
  if (!memory) return '';
  const s = memory.stats || {};
  const a = memory.adapt || {};
  const lessons = (memory.lessons || [])
    .slice()
    .sort((x, y) => (y.weight || 1) - (x.weight || 1) || y.at - x.at)
    .slice(0, MAX_LESSONS)
    .map((l, i) => `${i + 1}. [${l.source}] ${l.text}`)
    .join('\n');
  return `Self-improvement memory (from your own paper trades — obey these lessons):
Stats: closed ${s.closed || 0}, win rate ${s.winRate ?? '-'}%, net pnl $${s.sumPnl ?? 0}, stops ${s.stops || 0}, rejects ${s.rejects || 0}, streak ${s.streak?.kind || '-'}×${s.streak?.n || 0}.
Adapt: sizeScale ${a.sizeScale ?? 1}, stopBiasPct ${a.stopBiasPct ?? 0}, maxPositionPct ${a.maxPositionPct ?? RULES.maxPositionPct}, stance ${a.stance || 'neutral'}, preferCrypto ${a.preferCrypto ?? 0}, preferStock ${a.preferStock ?? 0}.
Size new buys near sizeScale × your usual size. Shift stop distance by about stopBiasPct percentage points within the allowed band.
Lessons:
${lessons || '(none yet — trade carefully and learn)'}`;
}

const REFLECT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['lessons', 'retire', 'stance', 'note'],
  properties: {
    lessons: {
      type: 'array',
      maxItems: 3,
      items: { type: 'string', description: 'A durable rule deduced from the new outcomes' },
    },
    retire: {
      type: 'array',
      maxItems: 3,
      items: { type: 'string', description: 'Lesson id or substring of an outdated lesson to drop' },
    },
    stance: { type: 'string', enum: ['risk-on', 'neutral', 'risk-off'] },
    note: { type: 'string', description: 'One sentence on what changed in the playbook' },
  },
};

function parseJSON(text) {
  const s = String(text || '').trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error('no JSON object in the reply');
  return JSON.parse(s.slice(a, b + 1));
}

export async function reflectWithModel(memory, newExits, env = process.env) {
  if (!env.ANTHROPIC_API_KEY || !newExits.length) return null;
  if (env.FABLE_REFLECT === '0' || env.FABLE_REFLECT === 'off') return null;
  const model = modelFor(env);
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 120e3, maxRetries: 1 });
  const modern = !/^claude-haiku-4/.test(model);
  const exits = newExits.map((e) =>
    `${e.outcome} ${e.side} ${e.sym} pnl=${e.pnl} reason=${e.reason || ''}`).join('\n');
  const existing = (memory.lessons || []).map((l) => `${l.id}: ${l.text}`).join('\n');
  const user = `You are improving Claude Fable's paper-trading playbook. New closed outcomes:
${exits}

Current lessons:
${existing || '(none)'}

Stats: win rate ${memory.stats.winRate ?? '-'}%, net $${memory.stats.sumPnl}, closed ${memory.stats.closed}.

Propose at most 3 new durable lessons (present tense, specific, no forecasts of the market). Retire outdated lesson ids. Not investment advice.`;
  const res = await client.beta.messages.create({
    model,
    max_tokens: 4000,
    system: 'You revise a trading playbook from paper outcomes only. JSON only. Not investment advice.',
    messages: [{ role: 'user', content: user }],
    output_config: {
      format: { type: 'json_schema', schema: REFLECT_SCHEMA },
      ...(modern ? { effort: 'medium' } : {}),
    },
    ...(modern ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } : {}),
  });
  if (res.stop_reason === 'refusal') return null;
  const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  const out = parseJSON(text);
  const now = Date.now();
  for (const lesson of out.lessons || []) upsertLesson(memory, lesson, { source: 'model', at: now });
  for (const key of out.retire || []) {
    const k = String(key).toLowerCase();
    memory.lessons = memory.lessons.filter((l) => l.id !== key && !l.text.toLowerCase().includes(k));
  }
  if (['risk-on', 'neutral', 'risk-off'].includes(out.stance)) memory.adapt.stance = out.stance;
  memory.lastReflect = { at: now, note: String(out.note || '').slice(0, 240), servedBy: res.model };
  return out;
}

/**
 * Ingest new ledger rows, extract lessons, optionally reflect with the model.
 * Mutates and returns memory.
 */
export async function improve({
  memory: raw,
  ledger = [],
  now = Date.now(),
  env = process.env,
  reflect = reflectWithModel,
  log = () => {},
} = {}) {
  const memory = ensureMemory(raw, now);
  const fresh = [];
  const exits = [];
  for (const e of ledger) {
    if (ingestEntry(memory, e, now)) {
      fresh.push(e);
      if (e.outcome === 'stopped' || e.outcome === 'target'
        || (e.side === 'sell' && e.outcome === 'filled' && e.pnl != null)) {
        exits.push(e);
      }
    }
  }
  const added = extractLessons(memory, now);
  if (added.length) log(`improve: ${added.length} new rule lesson(s)`);
  if (exits.length && env.ANTHROPIC_API_KEY && env.FABLE_FALLBACK !== '1' && env.FABLE_FALLBACK !== 'on') {
    try {
      const out = await reflect(memory, exits, env);
      if (out) log(`improve: model reflect — ${out.note || 'ok'}`);
    } catch (err) {
      log(`improve: reflect skipped (${err.message})`);
    }
  }
  memory.updatedAt = now;
  return { memory, fresh, exits, added };
}
