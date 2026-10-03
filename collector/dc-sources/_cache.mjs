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

/**
 * WHY THE STAMP IS INSIDE THE FILE.
 *
 * Age used to come from the file's mtime, and on a GitHub Actions runner that
 * number is a lie: `actions/checkout` writes every tracked file at checkout
 * time, so a cache committed four days ago reads as zero days old and the
 * 7-day window never elapses. The evidence was in the output — data/datacenters.json
 * built by CI at 2026-09-28T02:22Z reported its osm-overpass source as
 * `origin: cache, age_days: 0` while that harvest's own `fetched_at` said
 * 2026-09-24T19:18:48Z. Nothing re-harvested, ever, as long as the files existed.
 *
 * So the fetch time travels with the value. Loaders that already stamp their
 * payload (`osm-overpass`, `tiger-counties`, `usgs-gauge-sites`) keep their own
 * stamp; the ones that did not (`ne-countries-50m`, `osm-datacenters-world`)
 * get one from writeCache. mtime stays as the fallback, and only as the
 * fallback, so a cache written before this change still ages — from the wrong
 * clock in CI, for exactly one refresh cycle, and then from its own stamp.
 */
function stampMs(doc) {
  const t = doc?.fetched_at;
  if (typeof t !== 'string') return null;
  const ms = Date.parse(t);
  return Number.isFinite(ms) ? ms : null;
}

/** Only plain objects can carry a stamp. Anything else ages by mtime. */
function stampable(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Age of a cache entry in days, or null when it does not exist.
 *
 * Reads the stamp embedded in the file, falling back to mtime for a legacy
 * file that has none. Pass `doc` when the caller has already read the file —
 * these are multi-megabyte documents and parsing one twice per run is waste.
 *
 * Clamped at zero: a stamp from the future is a clock disagreement, not a
 * negative age, and `age_days: -0.3` in published output would be nonsense.
 */
export function cacheAgeDays(key, nowMs, doc) {
  const p = pathFor(key);
  if (!existsSync(p)) return null;
  const stamp = stampMs(doc === undefined ? readCache(key) : doc);
  if (stamp !== null) return Math.max(0, (nowMs - stamp) / DAY_MS);
  try {
    return Math.max(0, (nowMs - statSync(p).mtimeMs) / DAY_MS);
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

/**
 * Write a cache entry, stamped with the moment it was fetched, and return what
 * was written. A loader's own `fetched_at` wins — it knows when the response
 * actually arrived, which is before a slow reduction finished — and anything
 * that is not a plain object is written through untouched.
 */
export function writeCache(key, value, nowMs = Date.now()) {
  const doc = stampable(value) ? { fetched_at: new Date(nowMs).toISOString(), ...value } : value;
  const p = pathFor(key);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, `${JSON.stringify(doc)}\n`);
  return doc;
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
  // One read, used for the age decision and, if it wins, as the value. A
  // corrupt file is null here and therefore a miss, exactly as before.
  const disk = readCache(key);
  const age = disk === null ? null : cacheAgeDays(key, nowMs, disk);
  if (age !== null && age < maxAgeDays) {
    return { value: disk, origin: 'cache', age_days: round1(age), error: null };
  }

  try {
    const value = writeCache(key, await load(), nowMs);
    return { value, origin: 'network', age_days: 0, error: null };
  } catch (err) {
    if (disk === null) throw err;
    return {
      value: disk,
      origin: 'stale-cache',
      age_days: round1(age ?? 0),
      error: String(err?.message ?? err),
    };
  }
}

function round1(n) {
  return Math.round(n * 10) / 10;
}
