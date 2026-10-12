#!/usr/bin/env node
// Aircraft-feed health check for the World Monitor snapshot.
//
//   node monitor/check.mjs [path-or-url]
//
// Default path: monitor-out/monitor.json, else the live monitor-data URL.
// Exit 0 when ok (warnings only print as ::warning). Exit 1 on error-severity
// issues so CI / the watchdog can page. No network except when given a URL
// or when falling back to the live snapshot.
//
// CONTRACT.md: uses collector/fetch.mjs for any network read.

import { readFile } from 'node:fs/promises';
import { fetchJson } from '../collector/fetch.mjs';
import { assessAircraftHealth } from './core.mjs';

const LIVE = 'https://raw.githubusercontent.com/messagegabrielhere-lgtm/doomcon/monitor-data/monitor.json';
const arg = process.argv[2];

async function load(target) {
  if (!target) {
    try { return JSON.parse(await readFile('monitor-out/monitor.json', 'utf8')); }
    catch { /* fall through to live */ }
    return fetchJson(LIVE, { timeoutMs: 30000, retries: 1 });
  }
  if (/^https?:\/\//i.test(target)) return fetchJson(target, { timeoutMs: 30000, retries: 1 });
  return JSON.parse(await readFile(target, 'utf8'));
}

export async function main(target = arg) {
  const snap = await load(target);
  const health = assessAircraftHealth(snap);
  const lines = [
    `aircraft health: ${health.ok ? 'ok' : 'ISSUES'}`,
    `  age_min=${health.age_min ?? 'n/a'} mil=${health.mil} adsb=${health.adsb} emerg=${health.emerg}`,
    ...health.issues.map((i) => `  [${i.severity}] ${i.id}: ${i.msg}`),
  ];
  console.log(lines.join('\n'));

  if (typeof process.env.GITHUB_STEP_SUMMARY === 'string') {
    const { appendFileSync } = await import('node:fs');
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, [
      '### Aircraft feed health',
      `- ok: **${health.ok}**`,
      `- age: ${health.age_min ?? 'n/a'} min`,
      `- mil ${health.mil} · adsb ${health.adsb} · emerg ${health.emerg}`,
      ...(health.issues.length
        ? ['', ...health.issues.map((i) => `- **${i.severity}** \`${i.id}\`: ${i.msg}`)]
        : ['- no issues']),
      '',
    ].join('\n'));
  }

  for (const i of health.issues) {
    const title = i.severity === 'error' ? 'error' : 'warning';
    console.error(`::${title} title=Aircraft ${i.id}::${i.msg}`);
  }

  if (!health.ok) process.exitCode = 1;
  return health;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error(e); process.exit(2); });
}
