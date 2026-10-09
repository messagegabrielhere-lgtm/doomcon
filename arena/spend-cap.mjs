// Hard daily ceilings on AI-provider spend for the arena.
//
// Visitors never hit these APIs — GitHub Actions does, once an hour per model.
// A stuck retry loop or a mis-set model id can still burn a bill overnight.
// This cap is the code-side brake; the provider console monthly budget is the
// second brake (see docs/LAUNCH.md §7).
//
// State lives next to the arena wallets (arena-data branch), keyed by UTC day.
// Env (all optional; defaults are cheap):
//   ARENA_DAILY_USD_CAP       dollars across every paid provider (default 5)
//   ARENA_DAILY_TOKENS_CAP    input+output tokens across every paid call (default 400000)
//   ARENA_DAILY_CALLS_CAP     successful model calls per UTC day (default 48)
// Set a cap to 0 to refuse every paid call (baselines / stand-ins still run).

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const DEFAULTS = {
  usd: 5,
  tokens: 400_000,
  calls: 48,
};

function todayUTC(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 10);
}

function readCap(env, name, fallback) {
  const raw = env[name];
  if (raw == null || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function readCaps(env = process.env) {
  return {
    usd: readCap(env, 'ARENA_DAILY_USD_CAP', DEFAULTS.usd),
    tokens: readCap(env, 'ARENA_DAILY_TOKENS_CAP', DEFAULTS.tokens),
    calls: readCap(env, 'ARENA_DAILY_CALLS_CAP', DEFAULTS.calls),
  };
}

function emptyDay(day) {
  return { day, usd: 0, tokens: 0, calls: 0, byProvider: {} };
}

export async function loadSpend(dir, now = Date.now()) {
  const file = path.join(dir, 'spend.json');
  const day = todayUTC(now);
  if (!existsSync(file)) return emptyDay(day);
  try {
    const raw = JSON.parse(await readFile(file, 'utf8'));
    if (!raw || raw.day !== day) return emptyDay(day);
    return {
      day,
      usd: Number(raw.usd) || 0,
      tokens: Number(raw.tokens) || 0,
      calls: Number(raw.calls) || 0,
      byProvider: raw.byProvider && typeof raw.byProvider === 'object' ? raw.byProvider : {},
    };
  } catch {
    return emptyDay(day);
  }
}

export async function saveSpend(dir, spend) {
  const file = path.join(dir, 'spend.json');
  await writeFile(file, `${JSON.stringify(spend)}\n`);
}

/** Rough USD from token usage when the provider does not return a cost. Conservative high-side. */
export function estimateUsd(provider, usage) {
  if (!usage) return 0.02;
  const inTok = Number(usage.input_tokens ?? usage.prompt_tokens ?? usage.promptTokenCount ?? 0) || 0;
  const outTok = Number(usage.output_tokens ?? usage.completion_tokens ?? usage.candidatesTokenCount ?? 0) || 0;
  // High-side cents-per-1k so the cap trips early, not late.
  const rates = {
    anthropic: { in: 0.015, out: 0.075 },
    openai: { in: 0.01, out: 0.03 },
    xai: { in: 0.005, out: 0.015 },
    gemini: { in: 0.0025, out: 0.01 },
    deepseek: { in: 0.001, out: 0.002 },
  };
  const r = rates[provider] || { in: 0.01, out: 0.03 };
  return (inTok / 1000) * r.in + (outTok / 1000) * r.out;
}

export function tokenCount(usage) {
  if (!usage) return 0;
  const inTok = Number(usage.input_tokens ?? usage.prompt_tokens ?? usage.promptTokenCount ?? 0) || 0;
  const outTok = Number(usage.output_tokens ?? usage.completion_tokens ?? usage.candidatesTokenCount ?? 0) || 0;
  const total = Number(usage.total_tokens ?? usage.totalTokenCount ?? 0) || 0;
  return total || inTok + outTok;
}

/**
 * Returns null if a paid call is allowed, or a short public reason to sleep.
 * Baselines and stand-ins never call this.
 */
export function refuseReason(spend, env = process.env) {
  const c = readCaps(env);
  if (c.calls === 0 || c.usd === 0 || c.tokens === 0) {
    return 'AI spend cap is zero — paid models paused (baselines still run)';
  }
  if (spend.calls >= c.calls) return `daily AI call cap reached (${c.calls})`;
  if (spend.usd >= c.usd) return `daily AI USD cap reached ($${c.usd})`;
  if (spend.tokens >= c.tokens) return `daily AI token cap reached (${c.tokens})`;
  return null;
}

/**
 * Synchronously reserve one call slot before an await. Returns a refuse
 * reason, or null if the slot was taken. Pair with settleCall after the
 * provider responds (or on failure — the slot stays consumed on purpose).
 */
export function reserveCall(spend, provider, env = process.env) {
  const why = refuseReason(spend, env);
  if (why) return why;
  spend.calls += 1;
  const p = spend.byProvider[provider] || { usd: 0, tokens: 0, calls: 0 };
  p.calls += 1;
  spend.byProvider[provider] = p;
  return null;
}

/** Add real USD/token usage for a previously reserved call. */
export function settleCall(spend, { provider, usage, usd }) {
  const cost = Number.isFinite(usd) ? usd : estimateUsd(provider, usage);
  const tokens = tokenCount(usage) || 1500;
  spend.usd = Math.round((spend.usd + cost) * 1e6) / 1e6;
  spend.tokens += tokens;
  const p = spend.byProvider[provider] || { usd: 0, tokens: 0, calls: 0 };
  p.usd = Math.round((p.usd + cost) * 1e6) / 1e6;
  p.tokens += tokens;
  spend.byProvider[provider] = p;
  return spend;
}

/** One-shot helper for sequential callers that reserve+settle together. */
export function recordCall(spend, { provider, usage, usd }, env = process.env) {
  const why = reserveCall(spend, provider, env);
  if (why) return why;
  settleCall(spend, { provider, usage, usd });
  return null;
}
