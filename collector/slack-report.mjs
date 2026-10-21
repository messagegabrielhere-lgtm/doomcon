#!/usr/bin/env node
// Hourly operator report to Slack: page views and the index, plus an alert
// line when the index changes shape.
//
// Runs in the full lane of collect.yml after the engine. Page views come from
// GoatCounter through collector/visitor-report.mjs (the site's existing
// counter; nothing new is loaded on any page). The index line reads
// data/state.json. Alerts are edges between the previous published state
// (`--prev`, the state.json at the commit this run started from) and this
// run's state: a level move, the index going degraded or recovering, a source
// failing or reporting again. A pillar that stays dark is carried in the index
// line every hour, not paged as a new incident.
//
//   SLACK_WEBHOOK_URL     Slack incoming webhook. Unset → print the report, exit 0.
//   GOATCOUNTER_API_KEY   optional; without it the views line says so.
//
//   node collector/slack-report.mjs --prev /tmp/prev-state.json
//   node collector/slack-report.mjs --dry-run
//
// CONTRACT.md: the POST goes through collector/fetch.mjs with retries: 0, so a
// webhook is never delivered twice, and any failure is replaced with a short
// message before it is logged, so the webhook URL never reaches the Actions log.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { fetchText, fetchJson } from './fetch.mjs';
import { collectReport } from './visitor-report.mjs';
import { CANONICAL_URL } from '../site/brand.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATE = path.join(ROOT, 'data', 'state.json');

export function statusFromState(state) {
  if (!state || typeof state !== 'object') return null;
  const list = (value) => (Array.isArray(value) ? value.filter((id) => typeof id === 'string' && id).sort() : []);
  return {
    level: Number.isFinite(state.level) ? state.level : null,
    level_name: typeof state.level_name === 'string' ? state.level_name : null,
    score: typeof state.score === 'number' && Number.isFinite(state.score) ? state.score : null,
    degraded: state.degraded === true,
    failed: list(state.failed_sources),
    dark: list(state.dark_pillars),
    generated_at: typeof state.generated_at === 'string' ? state.generated_at : null,
  };
}

/** Alerts are edges. A pillar that stays dark is said once, then carried as a
 *  line in the hourly digest, not as a new incident every hour. */
export function diffAlerts(prev, next) {
  if (!next) return [];
  const alerts = [];
  if (prev && prev.level != null && next.level != null && prev.level !== next.level) {
    alerts.push({ kind: 'level', from: prev.level, to: next.level, fromName: prev.level_name, toName: next.level_name });
  }
  if (next.degraded && !(prev && prev.degraded)) {
    alerts.push({ kind: 'degraded', dark: next.dark, failed: next.failed });
  }
  if (prev && prev.degraded && !next.degraded) {
    alerts.push({ kind: 'recovered' });
  }
  if (prev && prev.degraded === next.degraded) {
    const newlyFailed = next.failed.filter((id) => !prev.failed.includes(id));
    const recovered = prev.failed.filter((id) => !next.failed.includes(id));
    if (newlyFailed.length) alerts.push({ kind: 'source_failed', ids: newlyFailed });
    if (recovered.length) alerts.push({ kind: 'source_recovered', ids: recovered });
  }
  return alerts;
}

function fmtScore(score) {
  return typeof score === 'number' ? score.toFixed(1) : 'no score';
}

export function indexLine(status) {
  if (!status) return 'Index: no state.json to read.';
  const name = status.level_name ? ` ${status.level_name}` : '';
  let health = 'counted pillars reporting';
  if (status.degraded) {
    const dark = status.dark.length ? status.dark.join(', ') : 'a pillar';
    const failed = status.failed.length ? `; failed: ${status.failed.join(', ')}` : '';
    health = `degraded (${dark} dark${failed})`;
  }
  return `Index: ${fmtScore(status.score)}, level ${status.level ?? '-'}${name}, ${health}.`;
}

export function alertLine(alert) {
  switch (alert.kind) {
    case 'level':
      return `SIREN alert: level moved from ${alert.from} ${alert.fromName || ''} to ${alert.to} ${alert.toName || ''}.`
        .replace(/\s+/g, ' ').replace(' .', '.');
    case 'degraded': {
      const dark = alert.dark.length ? alert.dark.join(', ') : 'none';
      const failed = alert.failed.length ? alert.failed.join(', ') : 'none';
      return `SIREN alert: the index went degraded. Dark: ${dark}. Failed: ${failed}.`;
    }
    case 'recovered':
      return 'SIREN alert: the index recovered. Counted pillars are reporting again.';
    case 'source_failed':
      return `SIREN alert: source failed: ${alert.ids.join(', ')}.`;
    case 'source_recovered':
      return `SIREN alert: source reporting again: ${alert.ids.join(', ')}.`;
    default:
      throw new Error(`unhandled alert kind: ${String(alert.kind)}`);
  }
}

/** GoatCounter report (visitor-report.mjs shape) → one or two lines. */
export function viewsLines(views) {
  if (!views) return ['Page views: GoatCounter not configured or unreachable.'];
  const lines = [`Page views: ${views.day} in the last 24 hours, ${views.week} in the last 7 days.`];
  if (views.pages && views.pages.length) {
    lines.push(`Top pages, 24h: ${views.pages.map((p) => `${p.name} (${p.count})`).join(', ')}`);
  }
  return lines;
}

export function formatReport({ status, alerts = [], views = null, siteUrl = CANONICAL_URL }) {
  const lines = [];
  for (const alert of alerts) lines.push(alertLine(alert));
  lines.push(`SIREN hourly${status?.generated_at ? `, reading stamped ${status.generated_at}` : ''}`);
  lines.push(indexLine(status));
  lines.push(...viewsLines(views));
  if (siteUrl) lines.push(siteUrl);
  return lines.join('\n');
}

/** One POST, no retry: a retried webhook is a duplicate message. The thrown
 *  error never carries the URL, which is the secret. */
export async function postSlack(webhook, text, { fetchText: send = fetchText } = {}) {
  if (!webhook) return { sent: false };
  try {
    await send(webhook, {
      method: 'POST',
      retries: 0,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
    });
  } catch (err) {
    const status = err && err.status ? ` HTTP ${err.status}` : '';
    throw new Error(`Slack webhook failed${status}`);
  }
  return { sent: true };
}

async function readJson(file) {
  if (!file) return null;
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

function argValue(argv, flag) {
  const i = argv.indexOf(flag);
  return i === -1 ? null : argv[i + 1];
}

async function main(argv = process.argv.slice(2), env = process.env) {
  const status = statusFromState(await readJson(STATE));
  const prev = statusFromState(await readJson(argValue(argv, '--prev')));
  const alerts = prev ? diffAlerts(prev, status) : [];

  let views = null;
  try {
    views = await collectReport({ fetchJson, key: env.GOATCOUNTER_API_KEY, code: env.GOATCOUNTER_CODE || undefined });
  } catch (err) {
    if (!(err && err.code === 'NO_KEY')) {
      process.stdout.write(`::warning title=Slack report::GoatCounter read failed (${err.message || err}); reporting the index only\n`);
    }
  }

  const text = formatReport({ status, alerts, views });
  process.stdout.write(`${text}\n`);

  if (argv.includes('--dry-run')) return;
  const webhook = String(env.SLACK_WEBHOOK_URL || '').trim();
  if (!webhook) {
    process.stdout.write('::notice::SLACK_WEBHOOK_URL is not set; report logged, not sent\n');
    return;
  }
  try {
    await postSlack(webhook, text);
    process.stdout.write('slack-report: sent\n');
  } catch (err) {
    // Soft: a Slack outage must not fail the index lane.
    process.stdout.write(`::warning title=Slack report::${err.message}\n`);
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) await main();
