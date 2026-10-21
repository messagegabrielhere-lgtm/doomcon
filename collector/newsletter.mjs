// The SIREN email: a daily brief and alerts, sent through Buttondown.
//
// TWO MODES, ONE LIST. Subscribers sign up on the homepage and tick what they
// want; each tick is a Buttondown tag (site/monetize.mjs, newsletter.tags):
//   --daily   the daily brief, to subscribers tagged `daily`. One per UTC day.
//   --alert   to subscribers tagged `alerts`: a level change (always), or one
//             of the biggest breaking stories (rate-limited, see below).
//
// EVERY LINE IS A FIELD OF A FILE THE SITE ALREADY PUBLISHES. The reading comes
// from data/state.json, the trend from data/history.ndjson, the stories from
// data/digest.json and data/news.json, breaking from data/breaking.json. A
// headline is the publisher's own; the copy around it obeys docs/VOICE.md and
// is run through the same future-tense check as the X posts before it leaves.
//
// WITHOUT BUTTONDOWN_API_KEY IT DOES NOTHING, AND STAYS GREEN. --dry-run prints
// the exact email and sends nothing. The ledger data/emailed.ndjson (one line
// per email) is what stops a late or repeated cron run from sending twice.
//
// CONTRACT.md §1.5: this is the third paid-write exception next to post-x and
// post-bluesky. It sends with post-x.mjs's single-attempt sendOnce(): fetch.mjs
// cannot carry a request body, and a retry could mail every subscriber twice.
//
// CAN-SPAM: Buttondown appends the unsubscribe link and the postal address
// from the newsletter's settings to every email; the body also carries the
// {{ unsubscribe_url }} link so the footer never depends on a template.

import { readFile, appendFile } from 'node:fs/promises';
import { sendOnce } from './post-x.mjs';
import { findFutureViolation } from './posts.mjs';
import * as brand from '../site/brand.mjs';
import { MONETIZE } from '../site/monetize.mjs';

export const API_URL = 'https://api.buttondown.com/v1/emails';
export const API_VERSION = '2026-04-01';
export const LEDGER_PATH = 'data/emailed.ndjson';
export const MAX_READING_AGE_HOURS = 6;
export const LEVEL_ALERT_WINDOW_HOURS = 3;
// Breaking alerts are the noisy kind, so the bar is high and the rate is low:
// four or more independent outlets, qualified in the last two hours, at most
// one every four hours and three a UTC day. A level change ignores all of it.
export const BREAKING_MIN_OUTLETS = 4;
export const BREAKING_MAX_AGE_HOURS = 2;
export const BREAKING_GAP_HOURS = 4;
export const BREAKING_MAX_PER_DAY = 3;
export const DAILY_STORIES = 5;

const H = 3600e3;
const site = (p) => `${brand.CANONICAL_URL}${p}`;
const n1 = (v) => (Number.isFinite(v) ? Number(v).toFixed(1) : '—');
const signed = (v) => (Number.isFinite(v) ? `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}` : '—');
const clock = (iso) => `${String(iso).slice(0, 10)} ${String(iso).slice(11, 16)} UTC`;
const tags = () => (MONETIZE.newsletter && MONETIZE.newsletter.tags) || { daily: 'daily', alerts: 'alerts' };
// Markdown-safe headline: publishers put brackets and asterisks in titles.
const md = (s) => String(s ?? '').replace(/\s+/g, ' ').trim().replace(/([\\`*_[\]<>#|])/g, '\\$1');

// Same rule as site/templates/itemPage.mjs slugFor(), kept here so the sender
// does not pull the page templates in. A test pins the two together.
export function itemPath(item) {
  const base = String(item.title || 'item').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64).replace(/-+$/, '') || 'item';
  return `/item/${base}-${item.id}.html`;
}

/** Our own copy only (headlines are quoted titles, VOICE.md §3.3 carve-out). */
export function assertVoice(...parts) {
  for (const p of parts) {
    const v = findFutureViolation(p);
    if (v) throw new Error(`EMAIL REJECTED: future tense ("${v.match}") in: ${String(p).slice(0, 120)}`);
  }
}

function footer() {
  const own = [
    `${brand.NAME} counts how loud AI is, every hour, from public data. ${brand.DISCLAIMER_SHORT} Not advice.`,
    `You get this because you subscribed at ${brand.DOMAIN}.`,
  ];
  assertVoice(...own);
  return `\n---\n\n${own[0]}\n\n${own[1]} [Unsubscribe]({{ unsubscribe_url }}) · [Alerts and RSS](${site('/alerts.html')}) · [Methodology](${site('/methodology.html')})\n`;
}

function scoreAt(history, tMs) {
  let best = null;
  for (const h of history) {
    const t = Date.parse(h && h.t);
    if (Number.isFinite(t) && t <= tMs && Number.isFinite(h.score)) best = h;
  }
  return best;
}

function storyLine(it) {
  const link = it.id ? site(itemPath(it)) : it.url;
  const src = String(it.source_label || it.source || '').split(' — ')[0];
  return `- [${md(it.title)}](${link}) — ${md(src)}${Number.isFinite(it.news_score ?? it.score) ? `, scored ${n1(it.news_score ?? it.score)}` : ''}`;
}

/** The daily brief. Pure: same inputs, same email. */
export function composeDaily({ state, history = [], digest, news, breaking }) {
  const now = Date.parse(state.generated_at);
  const day = String(state.generated_at).slice(0, 10);
  const ago = scoreAt(history, now - 24 * H);
  const d24 = ago ? state.score - ago.score : null;
  const fromDigest = (digest && digest.brief && Array.isArray(digest.brief.items)) ? digest.brief.items : [];
  const fromNews = ((news && news.items) || []).filter((i) => now - Date.parse(i.published_at) < 24 * H)
    .sort((a, b) => (b.score || 0) - (a.score || 0));
  const stories = (fromDigest.length ? fromDigest : fromNews).slice(0, DAILY_STORIES);
  const brk = ((breaking && breaking.clusters) || []).filter((c) => c && c.title && c.url
    && now - Date.parse(c.breaking_at || c.first_seen_at) < 24 * H)
    .sort((a, b) => (b.corroboration || 0) - (a.corroboration || 0)).slice(0, 3);
  const loud = (state.pillars || []).filter((p) => Number.isFinite(p.score) && !p.dark)
    .sort((a, b) => b.score - a.score)[0];

  const subject = `${brand.NAME} ${state.level} · ${n1(state.score)} of 100 · daily brief ${day}`;
  const lede = `${brand.NAME} reads level ${state.level} (${state.level_name}), ${n1(state.score)} of 100 at ${clock(state.generated_at)}`
    + `${d24 === null ? '.' : `, ${signed(d24)} on 24 hours earlier.`}`
    + `${loud ? ` The loudest pillar is ${loud.name.toLowerCase()} at ${n1(loud.score)}.` : ''}`;
  const h1 = 'The reading';
  const h2 = 'Top of the daily brief';
  const h3 = 'Breaking in the last 24 hours';
  const outro = `Every reading has a receipt you can recompute.`;
  assertVoice(subject, lede, h1, h2, h3, outro);

  const parts = [
    `## ${h1}\n\n${lede}\n\n[Open the live dial](${site('/')}) · [Today on the newsroom](${site(`/news/${day}.html`)})`,
  ];
  if (stories.length) parts.push(`## ${h2}\n\n${stories.map(storyLine).join('\n')}`);
  if (brk.length) {
    const byId = new Map(((news && news.items) || []).map((i) => [i.id, i]));
    const brkHref = (c) => { const ids = (c.item_ids || []).map((id) => byId.get(id)).filter(Boolean); const hit = ids.find((i) => i.url === c.url || i.title === c.title); return hit ? site(itemPath(hit)) : c.url; };
    parts.push(`## ${h3}\n\n${brk.map((c) => `- [${md(c.title)}](${brkHref(c)}) — ${c.corroboration ?? (c.outlets || []).length} independent outlets, first seen ${clock(c.first_seen_at)}`).join('\n')}`);
  }
  parts.push(`${outro} [Verify this one](${site('/verify.html')}).`);
  return { kind: 'daily', key: `daily:${day}`, tag: tags().daily, subject, body: `${parts.join('\n\n')}\n${footer()}` };
}

/** The level the index held before `state.level_since`, from history. */
export function previousLevel(state, history = []) {
  const since = Date.parse(state.level_since);
  let prev = null;
  for (const h of history) {
    const t = Date.parse(h && h.t);
    if (Number.isFinite(t) && t < since && Number.isFinite(h.level)) prev = h.level;
  }
  return prev !== null && prev !== state.level ? prev : null;
}

export function composeLevelAlert(state, prev) {
  const up = prev > state.level; // 5 is quietest, 1 is loudest
  const subject = `${brand.NAME} ${prev} → ${brand.NAME} ${state.level}: ${state.level_name}`;
  const lede = `The ${brand.NAME} level moved from ${prev} to ${state.level} (${state.level_name}) at ${clock(state.level_since)}. `
    + `The score reads ${n1(state.score)} of 100: ${up ? 'more' : 'less'} is happening in AI than at the last level, counted against the index's own frozen record. `
    + `It measures tempo, not danger.`;
  assertVoice(subject, lede);
  const body = `${lede}\n\n[What moved it](${site('/changelog.html')}) · [The live dial](${site('/')}) · [What each level means](${site('/history.html')})\n${footer()}`;
  return { kind: 'level', key: `level:${state.level_since}`, tag: tags().alerts, subject, body };
}

export function composeBreakingAlert(c, state) {
  const n = c.corroboration ?? (c.outlets || []).length;
  const label = `BREAKING · ${n} independent outlets`;
  const lede = `${n} independent outlets carried this story, first seen by ${brand.NAME} at ${clock(c.first_seen_at)}. The current reading is ${brand.NAME} ${state.level}, ${n1(state.score)} of 100.`;
  assertVoice(label, lede);
  const subject = `${label}: ${String(c.title).replace(/\s+/g, ' ').trim()}`.slice(0, 180);
  const outlets = (c.outlets || []).join(', ');
  const body = `**[${md(c.title)}](${c.url})**\n\n${lede}${outlets ? `\n\nOutlets: ${md(outlets)}.` : ''}\n\n[The newsroom](${site('/news.html')}) · [How breaking is defined](${site('/api/breaking.json')})\n${footer()}`;
  return { kind: 'breaking', key: `breaking:${c.id}`, tag: tags().alerts, subject, body };
}

/** What --alert would send now. A level change wins; else at most one breaking story. */
export function pickAlert({ state, history = [], breaking, ledger = [], now = new Date() }) {
  const t = now.getTime();
  const sent = new Set(ledger.map((l) => l.key));
  const since = Date.parse(state.level_since);
  if (Number.isFinite(since) && t - since < LEVEL_ALERT_WINDOW_HOURS * H && !sent.has(`level:${state.level_since}`)) {
    const prev = previousLevel(state, history);
    if (prev !== null) return composeLevelAlert(state, prev);
  }
  const alerts = ledger.filter((l) => l.kind === 'breaking' || l.kind === 'level');
  const last = Math.max(-Infinity, ...alerts.map((l) => Date.parse(l.sent_at)));
  if (t - last < BREAKING_GAP_HOURS * H) return null;
  const today = now.toISOString().slice(0, 10);
  if (alerts.filter((l) => l.kind === 'breaking' && String(l.sent_at).startsWith(today)).length >= BREAKING_MAX_PER_DAY) return null;
  const pick = ((breaking && breaking.clusters) || [])
    .filter((c) => c && c.live && c.id && c.title && c.url && !sent.has(`breaking:${c.id}`))
    .filter((c) => (c.corroboration ?? (c.outlets || []).length) >= BREAKING_MIN_OUTLETS)
    .filter((c) => t - Date.parse(c.breaking_at || c.first_seen_at) < BREAKING_MAX_AGE_HOURS * H)
    .sort((a, b) => (b.corroboration || 0) - (a.corroboration || 0))[0];
  return pick ? composeBreakingAlert(pick, state) : null;
}

/** The Buttondown request, built separately so a dry run prints exactly it. */
export function buildRequest(email, apiKey) {
  return {
    method: 'POST',
    url: API_URL,
    headers: {
      authorization: `Token ${apiKey}`,
      'content-type': 'application/json',
      'x-api-version': API_VERSION,
      // Buttondown asks for this once per key before an API send goes out.
      'x-buttondown-live-dangerously': 'true',
    },
    body: JSON.stringify({
      subject: email.subject,
      body: email.body,
      status: 'about_to_send',
      filters: { predicate: 'and', groups: [], filters: [{ field: 'subscriber.tags', operator: 'contains', value: email.tag }] },
    }),
  };
}

async function readJson(path) {
  try { return JSON.parse(await readFile(path, 'utf8')); } catch { return null; }
}
async function readNdjson(path) {
  try { return (await readFile(path, 'utf8')).split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l)); } catch { return []; }
}

export async function run({ mode, dryRun = false, now = new Date(), env = process.env, transport = sendOnce, ledgerPath = LEDGER_PATH, say = console.log } = {}) {
  const apiKey = env.BUTTONDOWN_API_KEY || '';
  if (!apiKey && !dryRun) { say('[newsletter] BUTTONDOWN_API_KEY is not set; nothing to send. Exiting green.'); return { sent: null }; }
  const state = await readJson('data/state.json');
  if (!state) throw new Error('data/state.json is missing; there is no reading to send');
  const age = now.getTime() - Date.parse(state.generated_at);
  if (!(age < MAX_READING_AGE_HOURS * H)) { say(`[newsletter] reading is ${(age / H).toFixed(1)} h old; refusing to send a stale reading`); return { sent: null }; }
  const history = await readNdjson('data/history.ndjson');
  const ledger = await readNdjson(ledgerPath);
  const breaking = await readJson('data/breaking.json');

  let email = null;
  if (mode === 'daily') {
    email = composeDaily({ state, history, digest: await readJson('data/digest.json'), news: await readJson('data/news.json'), breaking });
    if (ledger.some((l) => l.key === email.key)) { say(`[newsletter] ${email.key} already sent; nothing to do`); return { sent: null }; }
  } else if (mode === 'alert') {
    email = pickAlert({ state, history, breaking, ledger, now });
    if (!email) { say('[newsletter] alert: no fresh level change or qualifying breaking story'); return { sent: null }; }
  } else {
    throw new Error('mode must be daily or alert');
  }

  const req = buildRequest(email, dryRun ? 'DRY-RUN-KEY' : apiKey);
  if (dryRun) {
    say(`[newsletter] DRY RUN — would POST ${req.url} to tag "${email.tag}"\nSubject: ${email.subject}\n\n${email.body}`);
    return { sent: null, email };
  }
  const res = await transport(req);
  if (!(res.status >= 200 && res.status < 300)) {
    throw new Error(`Buttondown answered HTTP ${res.status}: ${String(res.text || '').slice(0, 300)}`);
  }
  let id = null;
  try { id = JSON.parse(res.text).id ?? null; } catch { /* id is a nicety */ }
  const line = { sent_at: now.toISOString(), kind: email.kind, key: email.key, tag: email.tag, subject: email.subject, reading: state.generated_at, buttondown_id: id };
  await appendFile(ledgerPath, `${JSON.stringify(line)}\n`);
  say(`[newsletter] sent ${email.kind} "${email.subject}" (${id ?? 'no id'})`);
  return { sent: line, email };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const mode = argv.includes('--alert') ? 'alert' : argv.includes('--daily') ? 'daily' : null;
  if (!mode) { console.error('usage: node collector/newsletter.mjs --daily|--alert [--dry-run]'); process.exit(2); }
  run({ mode, dryRun: argv.includes('--dry-run') }).catch((e) => { console.error(`::error::${e.message}`); process.exit(1); });
}
