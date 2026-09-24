// Disk cache with an age policy measured in DAYS.
//
// Datacentres do not move. County boundaries move once a decade. River gauges
// stay where they were put. Re-fetching any of that every minute would be rude
// to three public services that owe this project nothing, and would buy exactly
// no information. Everything slow-moving goes through here.
//
// The cache is also the failure plan. When Overpass is busy — and it is busy
// often; this build was rate-limited into 429s and 504s inside four minutes of
// polite probing — the run falls back to the last good copy and SAYS SO in
// data/datacenters.json. An empty map published as though it were a finding is
// the single worst outcome available here.

import { mkdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

export const CACHE_DIR = 'data/dc-cache';

const DAY_MS = 86_400_000;

function pathFor(key) {
  return `${CACHE_DIR}/${key}.json`;
}

/** Age of a cache entry in days, or null when it does not exist. */
export function cacheAgeDays(key, nowMs) {
  const p = pathFor(key);
  if (!existsSync(p)) return null;
  try {
    return (nowMs - statSync(p).mtimeMs) / DAY_MS;
  } catch {
    return null;
  }
}

/** Read a cache entry, or null. A corrupt file is a miss, never a throw. */
export function readCache(key) {
  const p = pathFor(key);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

export function writeCache(key, value) {
  const p = pathFor(key);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, `${JSON.stringify(value)}\n`);
}

/**
 * Fetch through the cache.
 *
 *   maxAgeDays   refetch only when the copy on disk is older than this
 *   load()       does the network work; may throw
 *
 * Resolves to { value, origin, age_days, error }:
 *
 *   origin 'cache'         fresh enough, nothing was fetched
 *   origin 'network'       fetched and written
 *   origin 'stale-cache'   the fetch failed and this is the old copy, with the
 *                          reason in `error`. The caller MUST surface that.
 *
 * It rethrows only when the fetch fails and there is nothing on disk at all,
 * because at that point there is no honest thing left to publish.
 */
export async function cached(key, { maxAgeDays, nowMs, load }) {
  const age = cacheAgeDays(key, nowMs);
  if (age !== null && age < maxAgeDays) {
    const value = readCache(key);
    if (value !== null) return { value, origin: 'cache', age_days: round1(age), error: null };
  }

  try {
    const value = await load();
    writeCache(key, value);
    return { value, origin: 'network', age_days: 0, error: null };
  } catch (err) {
    const fallback = readCache(key);
    if (fallback === null) throw err;
    return {
      value: fallback,
      origin: 'stale-cache',
      age_days: round1(cacheAgeDays(key, nowMs) ?? 0),
      error: String(err?.message ?? err),
    };
  }
}

function round1(n) {
  return Math.round(n * 10) / 10;
}
