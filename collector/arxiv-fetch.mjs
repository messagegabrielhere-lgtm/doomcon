// Shared arXiv fetch with long 429 backoff.
//
// Four adapters hit export.arxiv.org (index, newsroom, BLISS, backfill). A soft
// "Rate exceeded" often lasts longer than a minute on the shared Actions IP —
// short retries turn it into a multi-hour dark Capability pillar. Waits live
// here so every arXiv caller uses the same policy.

import { setTimeout as sleep } from 'node:timers/promises';

// Per attempt. Windowed submittedDate queries are range scans and regularly
// run past the shared 15s default (measured in sources/arxiv.mjs).
export const ARXIV_ATTEMPT_TIMEOUT_MS = 75_000;

// Three waits after the first 429. Empirically the ban often clears between
// one and three minutes; publishing DEGRADED for an hour over a soft throttle
// is worse than spending ~5 minutes waiting inside the collector.
export const ARXIV_RATE_LIMIT_WAITS_MS = Object.freeze([60_000, 120_000, 180_000]);

// Secondary callers (newsroom newest, BLISS science) use a shorter ladder so a
// stuck secondary cannot burn the whole job budget. The index adapter keeps
// the full ladder; the heal step in collect.yml covers what this misses.
export const ARXIV_SECONDARY_WAITS_MS = Object.freeze([45_000, 90_000]);

export function isArxivRateLimit(err) {
  if (!err) return false;
  if (err.status === 429) return true;
  return /\b429\b|rate exceeded|too many requests/i.test(String(err.message || err));
}

/**
 * GET an arXiv URL, waiting out 429s between attempts.
 *
 * `fetchText` is injected so tests can stub it and so callers keep using the
 * shared helper from fetch.mjs (timeout, UA, host gate). Options are forwarded
 * except `retries`, which is forced to 0 — a short retry inside fetch.mjs is
 * exactly what turns a soft throttle into a ban.
 */
export async function fetchArxivWindow(fetchText, url, {
  waits = ARXIV_RATE_LIMIT_WAITS_MS,
  sleepFn = sleep,
  timeoutMs = ARXIV_ATTEMPT_TIMEOUT_MS,
  withMeta = false,
} = {}) {
  const attempts = waits.length + 1;
  let lastErr;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fetchText(url, { timeoutMs, retries: 0, withMeta });
    } catch (err) {
      lastErr = err;
      const wait = waits[attempt];
      if (!isArxivRateLimit(err) || wait == null) throw err;
      await sleepFn(wait);
    }
  }
  throw lastErr;
}

/** Wall-clock budget for the index adapter's watchdog in collect.mjs. */
export function arxivAdapterBudgetMs(waits = ARXIV_RATE_LIMIT_WAITS_MS, attemptMs = ARXIV_ATTEMPT_TIMEOUT_MS) {
  const waitSum = waits.reduce((a, b) => a + b, 0);
  return attemptMs * (waits.length + 1) + waitSum;
}
