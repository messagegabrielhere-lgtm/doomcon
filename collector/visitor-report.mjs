#!/usr/bin/env node
// Hourly visitor report from the site's GoatCounter.
//
// The site already counts visits (site/monetize.mjs). Those numbers sit behind
// GoatCounter's login, so this reads them with an API token:
//
//   GOATCOUNTER_API_KEY   Bearer token from the site's Settings → API
//   GOATCOUNTER_CODE      site code, default messagegabriel
//
// Prints a short report on stdout. Exit 2 when the token is missing, so a
// scheduled run can tell "not configured" from "the API failed".

import { pathToFileURL } from 'node:url';
import { fetchJson } from './fetch.mjs';

const CODE = process.env.GOATCOUNTER_CODE || 'messagegabriel';

function floorHour(ms) {
  const d = new Date(ms);
  d.setUTCMinutes(0, 0, 0);
  return d;
}

function stamp(d) {
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function pageRows(body) {
  const rows = Array.isArray(body)
    ? body
    : (body && (body.stats || body.hits || body.pages)) || [];
  return rows.slice(0, 5).map((row) => ({
    name: String(row.name || row.path || row.title || '').trim(),
    count: Number(row.count ?? row.total),
  })).filter((row) => row.name && Number.isFinite(row.count));
}

/**
 * @param {{ fetchJson: Function, key: string, code?: string, now?: number }} opts
 */
export async function collectReport({ fetchJson: get, key, code = CODE, now = Date.now() }) {
  const token = String(key ?? '').trim();
  if (!token) {
    const err = new Error('GOATCOUNTER_API_KEY is not set');
    err.code = 'NO_KEY';
    throw err;
  }

  const end = new Date(floorHour(now).getTime() + 3600_000);
  const dayStart = new Date(end.getTime() - 24 * 3600_000);
  const weekStart = new Date(end.getTime() - 7 * 24 * 3600_000);
  const base = `https://${code}.goatcounter.com`;
  const headers = { authorization: `Bearer ${token}` };

  async function total(start) {
    const qs = new URLSearchParams({ start: stamp(start), end: stamp(end) });
    const body = await get(`${base}/api/v0/stats/total?${qs}`, { headers, retries: 0 });
    const n = Number(body && body.total);
    if (!Number.isFinite(n)) {
      throw new Error('GoatCounter total response had no numeric total');
    }
    return n;
  }

  const [day, week, hits] = await Promise.all([
    total(dayStart),
    total(weekStart),
    get(`${base}/api/v0/stats/hits?${new URLSearchParams({
      start: stamp(dayStart),
      end: stamp(end),
      limit: '5',
    })}`, { headers, retries: 0 }).catch(() => null),
  ]);

  return {
    code,
    day,
    week,
    pages: pageRows(hits),
    from: stamp(dayStart),
    to: stamp(end),
  };
}

export function formatReport(report) {
  const lines = [
    `Visitors on ${report.code}.goatcounter.com`,
    `Last 24 hours: ${report.day} pageviews`,
    `Last 7 days: ${report.week} pageviews`,
  ];
  if (report.pages.length) {
    lines.push('Top pages, last 24 hours:');
    for (const page of report.pages) lines.push(`- ${page.name}: ${page.count}`);
  }
  return lines.join('\n');
}

async function main() {
  try {
    const report = await collectReport({
      fetchJson,
      key: process.env.GOATCOUNTER_API_KEY,
      code: CODE,
    });
    process.stdout.write(`${formatReport(report)}\n`);
  } catch (err) {
    const code = err && err.code === 'NO_KEY' ? 2 : 1;
    process.stderr.write(`${err.message || err}\n`);
    process.exitCode = code;
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) await main();
