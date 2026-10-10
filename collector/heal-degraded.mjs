#!/usr/bin/env node
// Detect recoverable degradation so the pipeline can heal before visitors see it.
//
//   node collector/heal-degraded.mjs --check        → HEAL=true|false from state.json
//   node collector/heal-degraded.mjs --check-raw    → same, from newest data/raw
//   node collector/heal-degraded.mjs --json         → { heal, reason, sources }
//
// "Recoverable" means a calibrated source is dark because of a rate limit (HTTP
// 429 / "Rate exceeded"), not because the endpoint moved or our query broke.
// Imputation is still forbidden — this only decides whether to wait and ask
// again, which is what a human operator would do.

import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isArxivRateLimit } from './arxiv-fetch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const RATE = /\b429\b|rate exceeded|too many requests/i;

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function newestRaw() {
  const dir = join(ROOT, 'data/raw');
  const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  if (!files.length) return null;
  return readJson(join(dir, files[files.length - 1]));
}

function rateLimitedFromState(state) {
  const sources = Array.isArray(state?.sources) ? state.sources : [];
  return sources
    .filter((s) => s && !s.ok && !s.uncalibrated && RATE.test(String(s.error || '')))
    .map((s) => s.id);
}

function rateLimitedFromRaw(raw) {
  const readings = Array.isArray(raw?.readings) ? raw.readings : [];
  return readings
    .filter((r) => r && !r.ok && RATE.test(String(r.error || '')))
    .map((r) => r.source);
}

/**
 * @param {{ degraded?: boolean, sources?: object[] } | null} state
 * @param {{ readings?: object[] } | null} [raw]
 */
export function needsHeal(state = null, raw = null) {
  const sources = [...new Set([
    ...(state ? rateLimitedFromState(state) : []),
    ...(raw ? rateLimitedFromRaw(raw) : []),
  ])];

  if (sources.length === 0) {
    if (state?.degraded) {
      return { heal: false, reason: 'degraded but not from a rate limit', sources: [] };
    }
    return { heal: false, reason: 'not degraded', sources: [] };
  }

  return {
    heal: true,
    reason: `rate-limited: ${sources.join(',')}`,
    sources,
  };
}

export function isRecoverableError(err) {
  return isArxivRateLimit(err) || RATE.test(String(err?.message || err || ''));
}

function emitShell(result) {
  // Safe for `eval "$(node … --check)"` in the workflow.
  const reason = String(result.reason).replace(/[^a-zA-Z0-9 _:,./+-]/g, ' ').slice(0, 200);
  process.stdout.write(`HEAL=${result.heal ? 'true' : 'false'}\n`);
  process.stdout.write(`REASON='${reason}'\n`);
  process.stdout.write(`SOURCES='${result.sources.join(',').replace(/[^a-zA-Z0-9_,.-]/g, '')}'\n`);
}

function main(argv) {
  const asJson = argv.includes('--json');
  const useRaw = argv.includes('--check-raw');
  let state = null;
  let raw = null;

  if (useRaw) {
    raw = newestRaw();
    if (!raw) throw new Error('no data/raw snapshots to inspect');
  } else {
    state = readJson(join(ROOT, 'data/state.json'));
  }

  const result = needsHeal(state, raw);
  if (asJson) {
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }
  emitShell(result);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    main(process.argv.slice(2));
  } catch (err) {
    console.error(`heal-degraded: ${err.message}`);
    process.exitCode = 1;
  }
}
