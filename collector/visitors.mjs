#!/usr/bin/env node
// Daily reader-location snapshot from the site's GoatCounter.
//
// The site already counts visits (site/monetize.mjs → GoatCounter). Country is
// derived from the IP at the edge and the IP is not stored. This module reads
// the aggregate country counts through GoatCounter's API and writes
// data/visitors.json so the homepage can draw a map of where readers are.
//
//   GOATCOUNTER_API_KEY   Bearer token from Settings → API (required to refresh)
//   GOATCOUNTER_CODE      site code, default messagegabriel
//
// Soft behaviour:
//   - no key            → exit 0, leave any existing data/visitors.json alone
//   - fresher than 20h  → exit 0 without calling the API (daily cadence)
//   - API failure       → exit 0, keep the last good file, print a warning
//   --force             → refresh even when the file is fresh
//
// CONTRACT.md: every network call goes through collector/fetch.mjs. No
// Math.random. Output is a pure function of the API response plus generated_at.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { fetchJson } from './fetch.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'data', 'visitors.json');
const CODE = process.env.GOATCOUNTER_CODE || 'messagegabriel';
const WINDOW_MS = 7 * 24 * 3600_000;
const FRESH_MS = 20 * 3600_000; // same band as digest's DAY_MIN_AGE_HOURS
const SCHEMA = 1;

function floorHour(ms) {
  const d = new Date(ms);
  d.setUTCMinutes(0, 0, 0);
  return d;
}

function stamp(d) {
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function asOfDate(iso) {
  return String(iso || '').slice(0, 10);
}

/**
 * Normalise GoatCounter /stats/locations rows into ranked country counts.
 * Unknown / empty codes are kept under iso2 "" so the page can say so.
 */
export function normaliseLocations(stats) {
  const by = new Map();
  for (const row of Array.isArray(stats) ? stats : []) {
    const rawId = String(row.id ?? row.name ?? '').trim();
    const iso2 = /^[A-Za-z]{2}$/.test(rawId) ? rawId.toUpperCase() : '';
    const name = String(row.name || (iso2 || 'Unknown')).trim() || 'Unknown';
    const count = Number(row.count ?? row.total);
    if (!Number.isFinite(count) || count <= 0) continue;
    const prev = by.get(iso2) || { iso2, name, count: 0 };
    prev.count += count;
    if (!prev.name || prev.name === 'Unknown') prev.name = name;
    by.set(iso2, prev);
  }
  return [...by.values()].sort((a, b) => b.count - a.count
    || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

/**
 * @param {{ fetchJson: Function, key: string, code?: string, now?: number, windowMs?: number }} opts
 */
export async function collectVisitors({
  fetchJson: get,
  key,
  code = CODE,
  now = Date.now(),
  windowMs = WINDOW_MS,
} = {}) {
  const token = String(key ?? '').trim();
  if (!token) {
    const err = new Error('GOATCOUNTER_API_KEY is not set');
    err.code = 'NO_KEY';
    throw err;
  }

  const end = floorHour(now);
  const start = new Date(end.getTime() - windowMs);
  const base = `https://${code}.goatcounter.com`;
  const headers = { authorization: `Bearer ${token}` };
  const range = { start: stamp(start), end: stamp(end) };
  const totalQs = new URLSearchParams(range);
  const locQs = new URLSearchParams({ ...range, limit: '100' });

  const [totalBody, locBody] = await Promise.all([
    get(`${base}/api/v0/stats/total?${totalQs}`, { headers, retries: 0 }),
    get(`${base}/api/v0/stats/locations?${locQs}`, { headers, retries: 0 }),
  ]);

  const total = Number(totalBody && totalBody.total);
  if (!Number.isFinite(total)) {
    throw new Error('GoatCounter total response had no numeric total');
  }
  const countries = normaliseLocations(locBody && locBody.stats);
  const known = countries.filter((c) => c.iso2);
  const unknown = countries.find((c) => !c.iso2);
  const visitorsKnown = known.reduce((a, c) => a + c.count, 0);

  return {
    schema: SCHEMA,
    generated_at: new Date(now).toISOString(),
    as_of_date: asOfDate(stamp(end)),
    window: {
      start: stamp(start),
      end: stamp(end),
      days: Math.round(windowMs / 86400_000),
    },
    source: {
      kind: 'goatcounter',
      code,
      endpoint: '/api/v0/stats/locations',
      note: 'Country from truncated IP at GoatCounter. IP is not stored. Aggregate counts only.',
    },
    totals: {
      pageviews: total,
      visitors_located: visitorsKnown,
      countries: known.length,
      unknown: unknown ? unknown.count : 0,
    },
    countries: known.map((c) => ({
      iso2: c.iso2,
      name: c.name,
      count: c.count,
      share: visitorsKnown > 0
        ? Math.round((c.count / visitorsKnown) * 10000) / 10000
        : 0,
    })),
  };
}

export function shouldRefresh(existing, { now = Date.now(), force = false, freshMs = FRESH_MS } = {}) {
  if (force) return true;
  if (!existing || !existing.generated_at) return true;
  const t = Date.parse(existing.generated_at);
  if (!Number.isFinite(t)) return true;
  return (now - t) >= freshMs;
}

async function readExisting(file = OUT) {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

async function main(argv = process.argv.slice(2)) {
  const force = argv.includes('--force');
  const existing = await readExisting(OUT);
  if (!shouldRefresh(existing, { force })) {
    process.stdout.write(`visitors: fresh (${existing.generated_at}); skip\n`);
    return;
  }

  const key = process.env.GOATCOUNTER_API_KEY;
  if (!String(key || '').trim()) {
    process.stdout.write('visitors: GOATCOUNTER_API_KEY not set; keeping existing file\n');
    return;
  }

  try {
    const doc = await collectVisitors({ fetchJson, key, code: CODE });
    await mkdir(path.dirname(OUT), { recursive: true });
    await writeFile(OUT, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
    process.stdout.write(
      `visitors: ${doc.totals.countries} countries, `
      + `${doc.totals.visitors_located} located visitors, `
      + `${doc.totals.pageviews} pageviews (${doc.window.days}d) → ${OUT}\n`,
    );
  } catch (err) {
    process.stderr.write(`visitors: ${err.message || err}; keeping existing file\n`);
    // Soft failure: a dark analytics read must not fail the collect lane.
    process.exitCode = 0;
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) await main();
