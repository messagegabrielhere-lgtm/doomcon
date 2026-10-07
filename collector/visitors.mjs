// Hourly operator report: page views, and an alert when the index changes shape.
//
// The site is static files on GitHub Pages, so nothing on the server sees a
// visit. Each page (not the embed, not the badge) sends one request per tab
// per hour to a public ntfy.sh topic carrying only the path. This module
// polls that topic, rolls the paths into hour buckets, and posts one Slack
// message. Slack is also told, in that same message, when the level moves or
// a pillar goes dark, and a separate workflow step posts immediately when the
// collect workflow itself fails.
//
// NOTHING HERE IS A PERSON. The ledger stores hour, path and count. It does
// not store an IP, a user agent or a cookie. The counter address is in the
// page source, so anyone can increment it; the report says "page views".
//
// WITHOUT SLACK_WEBHOOK_URL the job still updates the ledger and exits 0, and
// it prints the report it would have sent. Same rule as the posting workflow:
// a repo with no secret stays green.
//
//   node collector/visitors.mjs --selftest
//   node collector/visitors.mjs --ledger visits.json
//   node collector/visitors.mjs --ledger visits.json --dry-run
//   node collector/visitors.mjs --workflow-failure

import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { fetchText } from './fetch.mjs';
import { BASE_PATH, CANONICAL_URL } from '../site/brand.mjs';

export const VISIT_TOPIC = 'siren-pageviews-doomcon-7f3a';
export const VISIT_VERSION = 1;
export const RETAIN_HOURS = 24 * 14;
export const MAX_HITS_PER_RUN = 5000;
export const SEEN_CAP = 2000;

const STATE_URL = `${CANONICAL_URL.replace(/\/$/, '')}/api/state.json`;

export function emptyLedger() {
  return {
    schema: 1,
    cursor: 0,
    seen: [],
    hours: {},
    status: null,
    last_report_hour: null,
  };
}

/** Site path only. Query, hash, the project prefix and index.html come off.
 *  Anything else (a traversal, a space, a 200-character novel) is dropped. */
export function normalisePath(raw, basePath = '') {
  if (typeof raw !== 'string') return null;
  let p = raw.trim();
  if (!p.startsWith('/')) return null;
  p = p.split('?')[0].split('#')[0];
  p = stripBase(p, basePath);
  p = p.replace(/\/{2,}/g, '/');
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  if (p.endsWith('/index.html')) p = p.slice(0, -'/index.html'.length) || '/';
  if (!p.startsWith('/')) p = `/${p}`;
  if (p.includes('..')) return null;
  if (p.length > 180) return null;
  if (!/^\/[A-Za-z0-9._~/-]*$/.test(p)) return null;
  return p;
}

function stripBase(p, basePath) {
  if (!basePath) return p;
  if (p === basePath) return '/';
  if (p.startsWith(`${basePath}/`)) return p.slice(basePath.length) || '/';
  return p;
}

export function hourKeyFromUnix(unixSeconds) {
  if (!Number.isFinite(unixSeconds)) return null;
  const d = new Date(unixSeconds * 1000);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 13);
}

export function previousHourKey(now) {
  const d = new Date(now);
  if (Number.isNaN(d.getTime())) throw new TypeError('previousHourKey: invalid date');
  d.setUTCMinutes(0, 0, 0);
  d.setUTCHours(d.getUTCHours() - 1);
  return d.toISOString().slice(0, 13);
}

export function hourLabel(key) {
  const [date, hh] = key.split('T');
  const h = Number(hh);
  if (!date || !Number.isInteger(h)) return key;
  const endH = (h + 1) % 24;
  const endDate = endH === 0 ? nextUtcDate(date) : date;
  const pad = (n) => String(n).padStart(2, '0');
  return `${date} ${pad(h)}:00 to ${endDate} ${pad(endH)}:00 UTC`;
}

function nextUtcDate(isoDate) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function parseNtfy(text) {
  if (!text || !String(text).trim()) return [];
  const out = [];
  for (const line of String(text).split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const row = JSON.parse(trimmed);
      if (row && typeof row === 'object') out.push(row);
    } catch {
      // A partial line from a cut response is not a visit.
    }
  }
  return out;
}

function copyHours(hours) {
  const out = {};
  for (const [key, bucket] of Object.entries(hours || {})) {
    out[key] = {
      views: Number(bucket?.views) || 0,
      paths: { ...(bucket?.paths || {}) },
    };
  }
  return out;
}

function pruneHours(hours, nowUnix) {
  const cutoffMs = nowUnix * 1000 - RETAIN_HOURS * 3600 * 1000;
  const cutoff = new Date(cutoffMs).toISOString().slice(0, 13);
  const out = {};
  for (const key of Object.keys(hours).sort()) {
    if (key >= cutoff) out[key] = hours[key];
  }
  return out;
}

/**
 * Fold ntfy events into the ledger. Events already in `seen` are ignored, so
 * a poll that repeats the cursor message cannot double a page view. Returns
 * a new ledger; the input is not mutated. `status` and `last_report_hour`
 * are copied through unchanged so a failed Slack post can retry the alert.
 */
export function ingestEvents(ledger, events, { basePath = '', nowUnix = null } = {}) {
  const base = ledger && typeof ledger === 'object' ? ledger : emptyLedger();
  const seen = new Set(Array.isArray(base.seen) ? base.seen : []);
  let cursor = Number(base.cursor) || 0;
  const hours = copyHours(base.hours);
  let accepted = 0;
  let examined = 0;
  const sorted = [...(events || [])].sort((a, b) => (a.time || 0) - (b.time || 0));

  for (const ev of sorted) {
    examined += 1;
    if (accepted >= MAX_HITS_PER_RUN || examined > MAX_HITS_PER_RUN) break;
    if (!ev || ev.event !== 'message' || typeof ev.id !== 'string' || !ev.id) continue;
    if (!Number.isFinite(ev.time)) continue;
    if (ev.time > cursor) cursor = ev.time;
    if (seen.has(ev.id)) continue;
    seen.add(ev.id);
    let msg;
    try {
      msg = JSON.parse(ev.message);
    } catch {
      continue;
    }
    if (!msg || msg.v !== VISIT_VERSION || typeof msg.path !== 'string') continue;
    const visitPath = normalisePath(msg.path, basePath);
    const key = hourKeyFromUnix(ev.time);
    if (!visitPath || !key) continue;
    const bucket = hours[key] || { views: 0, paths: {} };
    bucket.views += 1;
    bucket.paths[visitPath] = (Number(bucket.paths[visitPath]) || 0) + 1;
    hours[key] = bucket;
    accepted += 1;
  }

  const now = Number.isFinite(nowUnix) ? nowUnix : cursor || Math.floor(Date.now() / 1000);
  return {
    ledger: {
      schema: 1,
      cursor,
      seen: [...seen].slice(-SEEN_CAP),
      hours: pruneHours(hours, now),
      status: base.status ?? null,
      last_report_hour: base.last_report_hour ?? null,
    },
    accepted,
  };
}

export function summarize(ledger, now) {
  const hour = previousHourKey(now);
  const day = new Date(now).toISOString().slice(0, 10);
  const bucket = ledger.hours?.[hour] || { views: 0, paths: {} };
  let today = 0;
  for (const [key, value] of Object.entries(ledger.hours || {})) {
    if (key.startsWith(day)) today += Number(value.views) || 0;
  }
  const top = Object.entries(bucket.paths || {})
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, 5);
  return { hour, hourViews: Number(bucket.views) || 0, top, today };
}

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
    alerts.push({
      kind: 'level',
      from: prev.level,
      to: next.level,
      fromName: prev.level_name,
      toName: next.level_name,
    });
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

function indexLine(status) {
  if (!status) return 'Index reading could not be fetched.';
  const name = status.level_name ? ` ${status.level_name}` : '';
  let health = 'counted pillars reporting';
  if (status.degraded) {
    const dark = status.dark.length ? status.dark.join(', ') : 'a pillar';
    const failed = status.failed.length ? `; failed: ${status.failed.join(', ')}` : '';
    health = `degraded (${dark} dark${failed})`;
  }
  return `Index: ${fmtScore(status.score)}, level ${status.level ?? '-'}${name}, ${health}.`;
}

function alertLine(alert) {
  switch (alert.kind) {
    case 'level':
      return `SIREN alert: level moved from ${alert.from} ${alert.fromName || ''} to ${alert.to} ${alert.toName || ''}.`.replace(/\s+/g, ' ').replace(' .', '.');
    case 'degraded': {
      const dark = alert.dark.length ? alert.dark.join(', ') : 'unknown';
      const failed = alert.failed.length ? alert.failed.join(', ') : 'none';
      return `SIREN alert: the index went degraded. Dark: ${dark}. Failed: ${failed}.`;
    }
    case 'recovered':
      return 'SIREN alert: the index recovered. Counted pillars are reporting again.';
    case 'source_failed':
      return `SIREN alert: source failed: ${alert.ids.join(', ')}.`;
    case 'source_recovered':
      return `SIREN alert: source reporting again: ${alert.ids.join(', ')}.`;
    default: {
      const never = alert.kind;
      throw new Error(`unhandled alert kind: ${String(never)}`);
    }
  }
}

function fmtTop(top) {
  if (!top.length) return 'none';
  return top.map(([visitPath, n]) => `${visitPath} (${n})`).join(', ');
}

export function formatReport({ summary, status, alerts, siteUrl, digest }) {
  const lines = [];
  if (digest) {
    lines.push(`SIREN hourly, ${hourLabel(summary.hour)}`);
    lines.push(indexLine(status));
    lines.push(`Page views that hour: ${summary.hourViews}. Today so far: ${summary.today}.`);
    lines.push(`Top pages: ${fmtTop(summary.top)}`);
  }
  for (const alert of alerts) lines.push(alertLine(alert));
  if (status?.generated_at) lines.push(`Reading stamped ${status.generated_at}.`);
  if (siteUrl) lines.push(siteUrl);
  return lines.join('\n');
}

export function formatWorkflowFailure({ name, conclusion, url }) {
  const how = conclusion === 'failure' || !conclusion ? 'failed' : conclusion;
  const lines = [
    `SIREN alert: the ${name || 'collect'} workflow ${how}.`,
    'The site may be serving a stale reading.',
  ];
  if (url) lines.push(url);
  return lines.join('\n');
}

export function planReport(ledger, { events = [], state = null, now = new Date(), force = false, basePath = '', siteUrl = CANONICAL_URL, nowUnix = null } = {}) {
  const { ledger: withHits, accepted } = ingestEvents(ledger, events, { basePath, nowUnix });
  const summary = summarize(withHits, now);
  const status = state ? statusFromState(state) : null;
  const alerts = status ? diffAlerts(withHits.status, status) : [];
  const digest = force || withHits.last_report_hour !== summary.hour;
  const text = digest || alerts.length
    ? formatReport({ summary, status: status || withHits.status, alerts, siteUrl, digest })
    : null;
  return { ledger: withHits, accepted, summary, status, alerts, digest, text };
}

/** Persist the report cursor only after Slack accepted it, so a failed post
 *  is retried next run. Hits are always persisted: they were already counted. */
export function commitReport(ledger, plan, { posted }) {
  const next = { ...plan.ledger };
  if (posted) {
    if (plan.status) next.status = plan.status;
    if (plan.digest) next.last_report_hour = plan.summary.hour;
  }
  return next;
}

export function serializeLedger(ledger) {
  const hours = {};
  for (const key of Object.keys(ledger.hours || {}).sort()) {
    const bucket = ledger.hours[key];
    const paths = {};
    for (const pathKey of Object.keys(bucket.paths || {}).sort()) paths[pathKey] = bucket.paths[pathKey];
    hours[key] = { views: bucket.views, paths };
  }
  return `${JSON.stringify({
    schema: 1,
    cursor: ledger.cursor || 0,
    seen: ledger.seen || [],
    hours,
    status: ledger.status ?? null,
    last_report_hour: ledger.last_report_hour ?? null,
  }, null, 2)}\n`;
}

/** Insert the beacon before the last </body>. Static pages and the homepage
 *  do not go through layout.page(), and the embed must not call this. */
export function injectBeacon(html, basePath = BASE_PATH) {
  const tag = `<script>${beaconScript({ basePath })}</script>`;
  const at = String(html).lastIndexOf('</body>');
  if (at === -1) return `${html}\n${tag}\n`;
  return `${html.slice(0, at)}${tag}\n${html.slice(at)}`;
}

export function beaconScript({ basePath = BASE_PATH, topic = VISIT_TOPIC } = {}) {
  const cfg = JSON.stringify({ v: VISIT_VERSION, url: `https://ntfy.sh/${topic}`, base: basePath });
  return `!function(){try{
var c=${cfg};
if(location.protocol==="file:")return;
if(location.hostname==="localhost"||location.hostname==="127.0.0.1")return;
var p=location.pathname||"/";
if(c.base&&(p===c.base||p.indexOf(c.base+"/")===0))p=p.slice(c.base.length)||"/";
p=p.split("?")[0].split("#")[0];
if(p.length>1&&p.endsWith("/"))p=p.slice(0,-1);
if(p.endsWith("/index.html"))p=p.slice(0,-11)||"/";
if(p.charAt(0)!=="/")p="/"+p;
var mark=p+"@"+new Date().toISOString().slice(0,13);
try{if(sessionStorage.getItem("siren.hit.v1")===mark)return;sessionStorage.setItem("siren.hit.v1",mark);}catch(e){}
var body=JSON.stringify({v:c.v,path:p});
if(navigator.sendBeacon){navigator.sendBeacon(c.url,body);return;}
fetch(c.url,{method:"POST",body:body,keepalive:true,mode:"no-cors"}).catch(function(){});
}catch(e){}}();`;
}

export async function postSlack(webhook, text) {
  if (!webhook) return { sent: false };
  try {
    await fetchText(webhook, {
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

async function readLedger(file) {
  try {
    const text = await readFile(file, 'utf8');
    const data = JSON.parse(text);
    if (!data || typeof data !== 'object' || !data.hours) return emptyLedger();
    return { ...emptyLedger(), ...data };
  } catch (err) {
    if (err && err.code === 'ENOENT') return emptyLedger();
    throw err;
  }
}

async function loadEvents(ledger) {
  const since = ledger.cursor ? String(ledger.cursor) : '12h';
  const url = `https://ntfy.sh/${encodeURIComponent(VISIT_TOPIC)}/json?poll=1&since=${encodeURIComponent(since)}`;
  const text = await fetchText(url);
  return parseNtfy(text);
}

async function loadState() {
  return fetchText(STATE_URL, { headers: { accept: 'application/json' } }).then((body) => JSON.parse(body));
}

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1];
}

export async function main(env = process.env) {
  if (process.argv.includes('--selftest')) {
    const file = fileURLToPath(new URL('./visitors.test.mjs', import.meta.url));
    const run = spawnSync(process.execPath, ['--test', file], { stdio: 'inherit' });
    process.exit(run.status ?? 1);
  }

  if (process.argv.includes('--workflow-failure')) {
    const text = formatWorkflowFailure({
      name: env.WORKFLOW_NAME || 'collect',
      conclusion: env.WORKFLOW_CONCLUSION || 'failed',
      url: env.WORKFLOW_URL || '',
    });
    console.log(text);
    if (!env.SLACK_WEBHOOK_URL) {
      console.log('::notice::SLACK_WEBHOOK_URL is not set; alert logged, not sent');
      return;
    }
    await postSlack(env.SLACK_WEBHOOK_URL, text);
    return;
  }

  const ledgerPath = argValue('--ledger') || 'visits.json';
  const dry = process.argv.includes('--dry-run');
  const force = env.REPORT_FORCE === '1' || process.argv.includes('--force');
  const ledger = await readLedger(ledgerPath);

  let events = [];
  try {
    events = await loadEvents(ledger);
  } catch (err) {
    console.error(`::warning::visitor counter unreachable (${err.message}); reporting the index without new page views`);
  }

  let state = null;
  try {
    state = await loadState();
  } catch (err) {
    console.error(`::warning::index state unreachable (${err.message})`);
  }

  const plan = planReport(ledger, { events, state, now: new Date(), force, basePath: BASE_PATH, siteUrl: CANONICAL_URL });
  if (plan.text) console.log(plan.text);
  else console.log('No new hourly report and no index change.');

  if (dry) return;

  const webhook = env.SLACK_WEBHOOK_URL || '';
  let posted = !plan.text;
  if (plan.text && !webhook) {
    console.log('::notice::SLACK_WEBHOOK_URL is not set; report logged, not sent');
    posted = true;
  } else if (plan.text && webhook) {
    await postSlack(webhook, plan.text);
    posted = true;
  }

  const next = commitReport(ledger, plan, { posted });
  await writeFile(ledgerPath, serializeLedger(next));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((err) => {
    console.error(`::error::${err.message}`);
    process.exit(1);
  });
}
