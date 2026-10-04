// collector/post-daily.mjs — the daily post, sent by the pipeline instead of by hand.
//
// Until this file the pipeline ended at /post-sheet.html, a console a human was
// meant to paste from. No human did, so the calm-day post — the one
// docs/POSTING.md §3 calls compulsory — never went out. This closes the loop:
//
//   1. Build today's slate with collector/posts.mjs's own buildPosts(). The
//      slate arrives already ranked and spaced by its internal schedule(); this
//      file does not re-rank, re-word or re-check anything posts.mjs decides.
//   2. Per channel, take the highest-ranked post that is cleared for unattended
//      posting (AUTO_KINDS), has not run on that channel inside the 48-hour
//      feed window (so the account does not say the same kind of thing two
//      days running), and passes that channel's pre-flight.
//   3. Refuse if the channel already posted on this UTC day or inside the last
//      MIN_GAP_HOURS, if the exact text or slate id was ever posted there, or
//      if the reading is stale.
//   4. X gets the `api` variant (link-free: $0.015 instead of $0.200, and a link
//      ranks at 0.2 against a copy-link share at 20.0). Bluesky gets the
//      `manual` variant with a clickable link facet and a link card.
//   5. Both carry the share card, rendered in this process by site/cardpng.mjs
//      from the same data/ files the text came from, so the image cannot show
//      a different number from the words above it.
//   6. Append one line per post to data/posted.ndjson: channel, remote id, the
//      text and its sha256, the UTC time, and the receipt id of the reading the
//      numbers came from. Append-only. The workflow commits it back to main.
//
// NOTHING POSTS WITHOUT CREDENTIALS. A channel whose environment variables are
// absent is skipped with its variable NAMES printed and exit code 0, so the
// repo, the selftests and CI all work before any account exists.
//
//   node collector/post-daily.mjs --selftest      all three modules, no network
//   node collector/post-daily.mjs --dry-run       today's pick and the exact requests
//   node collector/post-daily.mjs                 post (GitHub Actions only)
//   options: --channel=x|bluesky  --ledger=path  --now=ISO (dry-run only)
//            --live-local (post from a laptop; the ledger there is not CI's)

import { readFile, readdir, appendFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import {
  buildPosts, findFutureViolation, charCount, FEED_LIFETIME_MS, X_CHAR_LIMIT,
} from './posts.mjs';
import { loadBrand, loadNews } from './card.mjs';
import * as X from './post-x.mjs';
import * as BSKY from './post-bluesky.mjs';

export const LEDGER_PATH = 'data/posted.ndjson';
export const CHANNELS = Object.freeze(['x', 'bluesky']);

// "Never twice in 24 hours", implemented so that it survives GitHub's cron.
// A literal rolling 24-hour window cannot: scheduled runs start 5-20 minutes
// late and the delay varies day to day, so a run that is ten minutes less late
// than yesterday's lands at 23h50m and would be refused — the account would
// skip roughly every other day. So the rule is two rules: at most ONE post per
// channel per UTC calendar day, and never two inside MIN_GAP_HOURS. A daily
// cron at 14:41 UTC therefore posts every day, and nothing — a re-run, a manual
// dispatch, a doubled schedule — can put two posts on one day.
export const MIN_GAP_HOURS = 20;
// Older than this and the reading is a dead pipeline, not today's number. The
// full lane runs hourly; six hours is five missed runs.
export const MAX_STATE_AGE_HOURS = 6;

// Kinds that may go out with nobody reviewing them: each is a reading of this
// index's own computed data (the level, the composite, a pillar, a named
// input, the drought join, the market prices). The three news kinds quote a
// third-party headline and stay hand-posted from /post-sheet.html: they are
// the most judgement-laden copy in the slate, their card preference
// (news-portrait) would show the headline cardpng picks rather than the one
// the post quotes, and the X developer use-case this account is registered
// under (X_USE_CASE below) is binding and says "index reading".
export const AUTO_KINDS = Object.freeze([
  'escalation', 'deescalation', 'milestone', 'degraded', 'pillar-spike', 'drought', 'race',
  'market-move', 'notable-input', 'weekly', 'daily',
]);
export const HAND_ONLY_KINDS = Object.freeze(['top-news', 'corroboration', 'developing']);
// News about the index itself goes first even if the same kind ran yesterday.
export const LEAD_KINDS = Object.freeze(['escalation', 'deescalation', 'milestone']);

// The card each kind carries. Everything is the index card except the race,
// which has its own. NOT collector/cards/drought.png for the drought post: that
// design counts D0 ("abnormally dry") and printed 71.9% on 2026-09-28 while the
// post says 1,171 of 1,877 at D1 or worse — two numbers on one post that
// disagree (docs/POSTING.md §2.2). The index card cannot contradict anything.
export const CARD_FOR_KIND = Object.freeze({ race: 'race' });

// What the operator puts in each bio. docs/POSTING.md §6 quotes these verbatim
// and selfTest() checks it still does, so the doc and the code cannot drift.
export const BIO_GUIDANCE = Object.freeze({
  x: 'Automated account managed by @HUMAN_HANDLE. One reading a day of the SIREN AI tempo index, from public data. Not a prediction.',
  bluesky: 'Automated account managed by @HUMAN_HANDLE. One reading a day of the SIREN AI tempo index, from public data. Not a prediction. A human reads the replies.',
});
// The use-case text for console.x.com. X's Developer Policy makes it binding.
export const X_USE_CASE = 'Automated account that publishes one scheduled, informational post a day: a reading of the SIREN '
  + 'AI activity index and its share card, computed from the project\'s own published data. No replies, no mentions, '
  + 'no likes, follows, reposts or quote posts, and no reading of other accounts\' content.';

// ---------------------------------------------------------------------------
// Inputs — the same files posts.mjs's CLI reads, read the same way
// ---------------------------------------------------------------------------

async function readJson(path) {
  try { return JSON.parse(await readFile(path, 'utf8')); } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

/**
 * posts.mjs does not export its CLI loader, so this mirrors it: the file reads
 * only, no decisions. Every file but state.json is optional, exactly as there.
 */
export async function loadInputs() {
  const state = await readJson('data/state.json');
  if (!state) throw new Error('data/state.json is missing; there is no reading to post');
  let history = [];
  try {
    history = (await readFile('data/history.ndjson', 'utf8')).split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
  } catch (err) { if (err.code !== 'ENOENT') throw err; }
  let readings = [];
  try {
    const names = (await readdir('data/raw')).filter((n) => n.endsWith('.json')).sort();
    if (names.length) {
      const snap = JSON.parse(await readFile(`data/raw/${names[names.length - 1]}`, 'utf8'));
      if (Array.isArray(snap.readings)) readings = snap.readings;
    }
  } catch (err) { if (err.code !== 'ENOENT') throw err; }
  const { brand } = await loadBrand();
  const { news } = await loadNews('data/news.json');
  return {
    state, history, readings, brand, news,
    newsRaw: await readJson('data/news.json'),
    race: await readJson('data/race.json'),
    datacenters: await readJson('data/datacenters.json'),
  };
}

// ---------------------------------------------------------------------------
// The ledger
// ---------------------------------------------------------------------------

export function textHash(text) {
  return `sha256:${createHash('sha256').update(String(text), 'utf8').digest('hex')}`;
}

/** Parse data/posted.ndjson. A line that does not parse FAILS CLOSED: an
 * unreadable ledger is one that cannot prove we have not already posted. */
export function parseLedger(raw) {
  const out = [];
  String(raw || '').split('\n').forEach((line, i) => {
    if (!line.trim()) return;
    let row;
    try { row = JSON.parse(line); } catch { throw new Error(`${LEDGER_PATH} line ${i + 1} is not JSON; refusing to post until it is fixed by hand`); }
    if (!CHANNELS.includes(row.channel) || !Number.isFinite(Date.parse(row.posted_at)) || typeof row.text_sha256 !== 'string') {
      throw new Error(`${LEDGER_PATH} line ${i + 1} lacks channel/posted_at/text_sha256; refusing to post until it is fixed by hand`);
    }
    out.push(row);
  });
  return out;
}

export async function readLedger(path = LEDGER_PATH) {
  try { return parseLedger(await readFile(path, 'utf8')); } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

const utcDay = (iso) => new Date(iso).toISOString().slice(0, 10);

/** The time rule: one post per channel per UTC day, and a minimum gap. */
export function timeGuard(ledger, { channel, now, minGapHours = MIN_GAP_HOURS }) {
  const mine = ledger.filter((l) => l.channel === channel);
  if (mine.length === 0) return { ok: true };
  const last = mine.reduce((a, b) => (Date.parse(b.posted_at) > Date.parse(a.posted_at) ? b : a));
  const gapMs = now.getTime() - Date.parse(last.posted_at);
  if (gapMs < 0) return { ok: false, why: `the ledger holds a ${channel} post dated ${last.posted_at}, after now; refusing until the clock or the ledger is explained` };
  if (utcDay(last.posted_at) === utcDay(now.toISOString())) return { ok: false, why: `${channel} already posted on ${utcDay(now.toISOString())} UTC, at ${last.posted_at}` };
  if (gapMs < minGapHours * 3600000) return { ok: false, why: `${channel} posted ${(gapMs / 3600000).toFixed(1)} h ago (${last.posted_at}); the minimum gap is ${minGapHours} h` };
  return { ok: true, last };
}

/** The content rule: the same text, or the same slate item, never twice. */
export function contentGuard(ledger, { channel, textSha, postId }) {
  const hit = ledger.find((l) => l.channel === channel && (l.text_sha256 === textSha || l.post_id === postId));
  if (!hit) return { ok: true };
  return { ok: false, why: `${hit.text_sha256 === textSha ? 'this exact text' : `slate item ${postId}`} already went to ${channel} at ${hit.posted_at}` };
}

// ---------------------------------------------------------------------------
// Choosing the post
// ---------------------------------------------------------------------------

export function channelText(channel, post) {
  return channel === 'x'
    ? { text: post.text_api ?? post.text, link: null, variant: 'api' }
    : { text: post.text_manual, link: post.link, variant: 'manual' };
}

export function channelPreflight(channel, post) {
  const { text, link } = channelText(channel, post);
  if (channel === 'x') return X.preflightX(text);
  if (!link) throw new Error('no canonical link on this post; the Bluesky link card has nothing to point at');
  return BSKY.preflightBluesky(text, link);
}

/**
 * The first post, in the slate's own rank order, that may go to `channel` now.
 * Returns { post, skipped: [{ id, kind, why }], rotatedPast: [ids] }.
 */
export function pickPost(posts, { channel, ledger, now }) {
  const ranked = [...posts].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
  const skipped = [];
  const eligible = [];
  for (const p of ranked) {
    if (!AUTO_KINDS.includes(p.kind)) {
      skipped.push({ id: p.id, kind: p.kind, why: HAND_ONLY_KINDS.includes(p.kind) ? 'quotes a third-party headline; hand-post it from /post-sheet.html' : 'kind not cleared for unattended posting' });
      continue;
    }
    try { channelPreflight(channel, p); } catch (err) {
      skipped.push({ id: p.id, kind: p.kind, why: err.message });
      continue;
    }
    const content = contentGuard(ledger, { channel, textSha: textHash(channelText(channel, p).text), postId: p.id });
    if (!content.ok) { skipped.push({ id: p.id, kind: p.kind, why: content.why }); continue; }
    eligible.push(p);
  }
  if (eligible.length === 0) return { post: null, skipped, rotatedPast: [] };
  // Same kind inside the 48-hour For You window is the account repeating itself
  // to people who can still see yesterday's. Rotate past it — unless it is news
  // about the index, or unless nothing else is left (the daily floor holds).
  const recentKinds = new Set(ledger
    .filter((l) => l.channel === channel && now.getTime() - Date.parse(l.posted_at) < FEED_LIFETIME_MS)
    .map((l) => l.kind));
  const fresh = eligible.find((p) => LEAD_KINDS.includes(p.kind) || !recentKinds.has(p.kind));
  const post = fresh || eligible[0];
  const rotatedPast = eligible.slice(0, eligible.indexOf(post)).map((p) => p.id);
  for (const id of rotatedPast) {
    const p = eligible.find((e) => e.id === id);
    skipped.push({ id, kind: p.kind, why: `a ${p.kind} post already ran on ${channel} inside the 48 h feed window` });
  }
  return { post, skipped, rotatedPast };
}

export function freshness(state, now, maxHours = MAX_STATE_AGE_HOURS) {
  const t = Date.parse(state?.generated_at);
  if (!Number.isFinite(t)) return { ok: false, why: 'state.generated_at is missing or unparsable' };
  const ageH = (now.getTime() - t) / 3600000;
  if (ageH < -10 / 60) return { ok: false, why: `the reading is dated ${state.generated_at}, ${(-ageH * 60).toFixed(0)} min in the future` };
  if (ageH > maxHours) return { ok: false, why: `the reading is ${ageH.toFixed(1)} h old (${state.generated_at}); the limit is ${maxHours} h. The collect pipeline needs looking at before anything is posted.` };
  return { ok: true, ageHours: ageH };
}

// ---------------------------------------------------------------------------
// The card
// ---------------------------------------------------------------------------

/**
 * Render the post's card in this process from the same inputs as its text.
 * Falls back to the file site/cardpng.mjs wrote into public/cards/, and from
 * the race card to the index card. Returns null only if nothing at all exists.
 */
export async function cardFor(post, inputs, cache = new Map()) {
  const wanted = CARD_FOR_KIND[post.kind] || 'state';
  for (const name of wanted === 'state' ? ['state'] : [wanted, 'state']) {
    if (cache.has(name)) return cache.get(name);
    let bytes = null;
    let source = null;
    try {
      const cp = await import('../site/cardpng.mjs');
      bytes = name === 'race'
        ? (inputs.race ? cp.raceCard(inputs.race, { level: inputs.state.level, format: 'landscape' }) : null)
        : cp.stateCard(inputs.state, { format: 'landscape' });
      source = `rendered in-process by site/cardpng.mjs from data/${name === 'race' ? 'race' : 'state'}.json`;
    } catch (err) {
      try {
        bytes = await readFile(`public/cards/${name}.png`);
        source = `public/cards/${name}.png (in-process render failed: ${err.message}; this file may predate the reading)`;
      } catch { bytes = null; }
    }
    if (bytes && Buffer.isBuffer(bytes)) {
      X.assertPng(bytes);
      const card = { name, bytes, sha256: X.sha256(bytes), source };
      cache.set(name, card);
      return card;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// The receipt line
// ---------------------------------------------------------------------------

export function ledgerLine({ channel, post, result, card, state, now }) {
  const { text, variant } = channelText(channel, post);
  return {
    schema: 1,
    channel,
    outcome: result.outcome,
    posted_at: now.toISOString(),
    post_id: post.id,
    kind: post.kind,
    variant,
    text,
    text_sha256: textHash(text),
    length: channel === 'x' ? { x_weighted: charCount(text), limit: X_CHAR_LIMIT } : { graphemes: BSKY.graphemeCount(text), limit: BSKY.BSKY_MAX_GRAPHEMES },
    remote_id: result.id ?? result.uri ?? null,
    remote_url: result.url ?? null,
    card: card ? { name: card.name, sha256: card.sha256, bytes: card.bytes.length, attached: channel === 'x' ? true : result.thumb !== false } : null,
    reading: { generated_at: state.generated_at, receipt_id: state.receipt_id ?? null, level: state.level, score: state.score },
    ...(result.note ? { note: result.note } : {}),
  };
}

// ---------------------------------------------------------------------------
// Credentials, per channel
// ---------------------------------------------------------------------------

export function channelCredentials(channel, env = process.env) {
  return channel === 'x' ? X.readCredentials(env) : BSKY.readCredentials(env);
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const say = (s) => process.stdout.write(`${s}\n`);
const warn = (s) => process.stdout.write(`${process.env.GITHUB_ACTIONS === 'true' ? '::warning::' : 'WARNING '}${s}\n`);

export async function run({ dryRun, channels, ledgerPath = LEDGER_PATH, now = new Date(), env = process.env, liveLocal = false }) {
  const report = { posted: [], refused: [], failed: [], skipped_channels: [] };

  if (!dryRun && env.GITHUB_ACTIONS !== 'true' && !liveLocal) {
    throw new Error('live posting runs in GitHub Actions, where data/posted.ndjson is committed after every post. '
      + 'A laptop run writes a ledger CI never sees. Use --dry-run, or --live-local if you really mean it.');
  }

  // Which channels can post at all. Dry runs never read credentials.
  const active = [];
  for (const channel of channels) {
    if (dryRun) { active.push({ channel }); continue; }
    const c = channelCredentials(channel, env);
    if (c.ok) active.push({ channel, creds: c.creds });
    else {
      const why = c.refused || `${c.missing.join(', ')} not set`;
      report.skipped_channels.push({ channel, why });
      say(`[post-daily] ${channel}: skipped — ${why}`);
    }
  }
  if (active.length === 0) {
    say('[post-daily] no channel has credentials; nothing to post. The repo works without them by design.');
    return report;
  }

  const inputs = await loadInputs();
  const fresh = freshness(inputs.state, now);
  if (!fresh.ok) { warn(`[post-daily] not posting: ${fresh.why}`); report.refused.push({ channel: '*', why: fresh.why }); return report; }

  const slate = buildPosts(inputs.state, {
    brand: inputs.brand, history: inputs.history, news: inputs.news, newsRaw: inputs.newsRaw,
    race: inputs.race, datacenters: inputs.datacenters, readings: inputs.readings,
  });
  say(`[post-daily] reading ${inputs.state.generated_at} (receipt ${inputs.state.receipt_id ?? 'none'}), `
    + `${fresh.ageHours.toFixed(1)} h old; slate of ${slate.posts.length}${slate.suppressed ? ` (SUPPRESSED: ${slate.reason})` : ''}: `
    + slate.posts.map((p) => `${p.rank}.${p.kind}`).join(' '));

  const ledger = await readLedger(ledgerPath);
  const cards = new Map();

  for (const { channel, creds } of active) {
    const tg = timeGuard(ledger, { channel, now });
    if (!tg.ok) { say(`[post-daily] ${channel}: refused — ${tg.why}`); report.refused.push({ channel, why: tg.why }); continue; }

    const pick = pickPost(slate.posts, { channel, ledger, now });
    for (const s of pick.skipped) say(`[post-daily] ${channel}: passed over ${s.id} — ${s.why}`);
    if (!pick.post) {
      const why = 'no post in today\'s slate is eligible for this channel';
      say(`[post-daily] ${channel}: nothing to post — ${why}`);
      report.refused.push({ channel, why });
      continue;
    }
    const post = pick.post;
    const { text, link, variant } = channelText(channel, post);
    const card = await cardFor(post, inputs, cards);
    if (!card) warn(`[post-daily] ${channel}: no card could be rendered or found; posting text only`);
    say(`[post-daily] ${channel}: ${post.rank}.${post.kind} (${variant} variant, ${channel === 'x' ? `${charCount(text)}/${X_CHAR_LIMIT} chars` : `${BSKY.graphemeCount(text)}/${BSKY.BSKY_MAX_GRAPHEMES} graphemes`}), `
      + `card ${card ? `${card.name} ${card.bytes.length} B ${card.sha256.slice(0, 19)}… — ${card.source}` : 'none'}`);
    say(text.split('\n').map((l) => `    | ${l}`).join('\n'));

    if (dryRun) {
      const requests = channel === 'x'
        ? X.dryRun({ text, png: card?.bytes ?? null })
        : BSKY.dryRun({ text, link, png: card?.bytes ?? null, readingIso: inputs.state.generated_at });
      say(JSON.stringify(requests, null, 2));
      report.posted.push({ channel, post_id: post.id, dry_run: true });
      continue;
    }

    try {
      const result = channel === 'x'
        ? await X.postToX({ text, png: card?.bytes ?? null, creds })
        : await BSKY.postToBluesky({ text, link, png: card?.bytes ?? null, readingIso: inputs.state.generated_at, creds });
      const line = ledgerLine({ channel, post, result, card, state: inputs.state, now: new Date() });
      await appendFile(ledgerPath, `${JSON.stringify(line)}\n`, { flag: 'a' });
      ledger.push(line);
      report.posted.push({ channel, post_id: post.id, outcome: result.outcome, remote_url: result.url });
      if (result.outcome === 'duplicate') warn(`[post-daily] ${channel}: the service already holds this post (an earlier run the ledger missed); recorded, not re-sent`);
      else say(`[post-daily] ${channel}: POSTED ${result.url}`);
    } catch (err) {
      report.failed.push({ channel, post_id: post.id, error: err.message });
      process.stdout.write(`${process.env.GITHUB_ACTIONS === 'true' ? '::error::' : 'ERROR '}[post-daily] ${channel}: ${err.message}\n`);
    }
  }
  return report;
}

// ---------------------------------------------------------------------------
// Self-test — no network, no credentials, no writes
// ---------------------------------------------------------------------------

function fixtureState(over = {}) {
  return {
    schema: 1, generated_at: '2026-09-28T14:07:00.000Z', score: 39.6, level: 4, level_name: 'ROUTINE',
    previous_level: null, level_since: '2026-09-23T20:04:22.390Z', degraded: false, dark_pillars: [],
    receipt_id: '2026-09-28T14-07-00Z',
    pillars: [
      { id: 'capability', score: 30.7, percentile: 0.3, sources_ok: 3, sources_total: 3, dark: false },
      { id: 'compute', score: 48.6, percentile: 0.5, sources_ok: 3, sources_total: 3, dark: false },
      { id: 'attention', score: 41.0, percentile: 0.4, sources_ok: 2, sources_total: 2, dark: false },
      { id: 'governance', score: 53.2, percentile: 0.6, sources_ok: 2, sources_total: 2, dark: false },
      { id: 'markets', score: 40.0, percentile: 0.4, sources_ok: 3, sources_total: 3, dark: false },
    ],
    sources: Array.from({ length: 13 }, (_, i) => ({ id: `s${i}`, ok: true, age_seconds: 300, last_ok: '2026-09-28T14:07:00.000Z' })),
    ...over,
  };
}

const fakePost = (kind, rank, extra = {}) => ({
  id: `${kind}-2026-09-28T14-07-00-000Z`, kind, rank, priority: rank * 10,
  text_api: `${kind} reading, 14:07 UTC on Mon 28 Sep 2026. Arithmetic at messagegabrielhere dash lgtm dot github dot io slash doomcon.`,
  text_manual: `${kind} reading, 14:07 UTC on Mon 28 Sep 2026. Arithmetic at https://messagegabrielhere-lgtm.github.io/doomcon`,
  link: 'https://messagegabrielhere-lgtm.github.io/doomcon',
  ...extra,
});
const row = (channel, postedAt, extra = {}) => ({ schema: 1, channel, posted_at: postedAt, text_sha256: 'sha256:x', post_id: 'p', kind: 'daily', ...extra });

export async function selfTest() {
  const results = [];
  const check = async (name, fn) => {
    try { await fn(); results.push({ name, ok: true }); } catch (err) { results.push({ name, ok: false, error: err.message }); }
  };
  const eq = (a, b, what) => { if (a !== b) throw new Error(`${what}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
  const at = (iso) => new Date(iso);

  await check('double-post guard: a second post 3 h later is refused', () => {
    eq(timeGuard([row('x', '2026-09-28T14:41:00Z')], { channel: 'x', now: at('2026-09-28T17:41:00Z') }).ok, false, 'ok');
  });
  await check('double-post guard: anything later on the same UTC day is refused', () => {
    eq(timeGuard([row('x', '2026-09-28T00:30:00Z')], { channel: 'x', now: at('2026-09-28T23:59:00Z') }).ok, false, 'ok');
  });
  await check(`double-post guard: under ${MIN_GAP_HOURS} h is refused even across midnight`, () => {
    eq(timeGuard([row('x', '2026-09-28T23:00:00Z')], { channel: 'x', now: at('2026-09-29T01:00:00Z') }).ok, false, 'ok');
  });
  await check('double-post guard: tomorrow\'s cron, 10 min less late than today\'s, still posts', () => {
    eq(timeGuard([row('x', '2026-09-28T14:58:00Z')], { channel: 'x', now: at('2026-09-29T14:48:00Z') }).ok, true, 'ok');
  });
  await check('double-post guard: one channel does not block the other', () => {
    eq(timeGuard([row('x', '2026-09-28T14:41:00Z')], { channel: 'bluesky', now: at('2026-09-28T14:42:00Z') }).ok, true, 'ok');
  });
  await check('double-post guard: a ledger row from the future refuses', () => {
    eq(timeGuard([row('x', '2026-09-30T14:41:00Z')], { channel: 'x', now: at('2026-09-28T14:41:00Z') }).ok, false, 'ok');
  });
  await check('content guard: the same text or slate id never goes twice, however long ago', () => {
    const l = [row('x', '2026-09-01T14:41:00Z', { text_sha256: textHash('same'), post_id: 'daily-a' })];
    eq(contentGuard(l, { channel: 'x', textSha: textHash('same'), postId: 'other' }).ok, false, 'same text');
    eq(contentGuard(l, { channel: 'x', textSha: textHash('new'), postId: 'daily-a' }).ok, false, 'same id');
    eq(contentGuard(l, { channel: 'x', textSha: textHash('new'), postId: 'daily-b' }).ok, true, 'new');
  });
  await check('the ledger fails closed on a corrupt or incomplete line', () => {
    eq(parseLedger(`${JSON.stringify(row('x', '2026-09-28T14:41:00Z'))}\n\n`).length, 1, 'blank lines tolerated');
    let threw = 0;
    try { parseLedger('{"channel":"x"'); } catch { threw++; }
    try { parseLedger('{"channel":"x","posted_at":"nope","text_sha256":"a"}'); } catch { threw++; }
    try { parseLedger('{"channel":"mastodon","posted_at":"2026-09-28T00:00:00Z","text_sha256":"a"}'); } catch { threw++; }
    eq(threw, 3, 'rejections');
  });
  await check('pick: news kinds are hand-only; the top auto kind wins', () => {
    const r = pickPost([fakePost('top-news', 1), fakePost('degraded', 2), fakePost('daily', 3)], { channel: 'x', ledger: [], now: at('2026-09-28T14:41:00Z') });
    eq(r.post.kind, 'degraded', 'pick');
    eq(r.skipped[0].kind, 'top-news', 'skipped');
  });
  await check('pick: a kind that ran inside 48 h is rotated past; the daily floor still holds', () => {
    const ledger = [row('x', '2026-09-27T14:41:00Z', { kind: 'degraded' })];
    const now = at('2026-09-28T14:41:00Z');
    eq(pickPost([fakePost('degraded', 1), fakePost('drought', 2), fakePost('daily', 3)], { channel: 'x', ledger, now }).post.kind, 'drought', 'rotated');
    eq(pickPost([fakePost('degraded', 1)], { channel: 'x', ledger, now }).post.kind, 'degraded', 'only choice still posts');
    eq(pickPost([fakePost('escalation', 1), fakePost('daily', 2)], { channel: 'x', ledger: [row('x', '2026-09-27T14:41:00Z', { kind: 'escalation' })], now }).post.kind, 'escalation', 'lead kinds never rotate');
  });
  await check('pick: a candidate that fails the channel pre-flight is passed over, not posted', () => {
    const bad = fakePost('daily', 1, { text_api: 'daily reading, 14:07 UTC. It will rise. Arithmetic at example dot com.' });
    const r = pickPost([bad, fakePost('race', 2)], { channel: 'x', ledger: [], now: at('2026-09-28T14:41:00Z') });
    eq(r.post.kind, 'race', 'pick');
    if (!/future tense/.test(r.skipped[0].why)) throw new Error(`wrong reason: ${r.skipped[0].why}`);
  });
  await check('freshness: a reading over 6 h old, or from the future, is refused', () => {
    const s = fixtureState();
    eq(freshness(s, at('2026-09-28T14:41:00Z')).ok, true, '34 min');
    eq(freshness(s, at('2026-09-28T21:08:00Z')).ok, false, '7 h');
    eq(freshness(s, at('2026-09-28T13:00:00Z')).ok, false, 'future');
  });
  await check('end to end on a fixture reading: X gets a link-free text, Bluesky the link, both pass', () => {
    const out = buildPosts(fixtureState(), { brand: { name: 'SIREN', domain: 'messagegabrielhere-lgtm.github.io/doomcon', tagline: 't', canonicalUrl: 'https://messagegabrielhere-lgtm.github.io/doomcon' } });
    const now = at('2026-09-28T14:41:00Z');
    const x = pickPost(out.posts, { channel: 'x', ledger: [], now });
    const b = pickPost(out.posts, { channel: 'bluesky', ledger: [], now });
    if (!x.post || !b.post) throw new Error('nothing picked from a healthy fixture');
    const xt = channelText('x', x.post).text;
    const bt = channelText('bluesky', b.post);
    X.preflightX(xt);
    BSKY.preflightBluesky(bt.text, bt.link);
    if (/https?:\/\//.test(xt)) throw new Error('X text carries a URL');
    if (!bt.text.includes(bt.link)) throw new Error('Bluesky text lacks the link');
  });
  await check('the receipt line carries channel, remote id, text, its hash, UTC time and the reading\'s receipt', () => {
    const p = fakePost('daily', 1);
    const card = { name: 'state', bytes: X.FIXTURE_PNG, sha256: X.sha256(X.FIXTURE_PNG) };
    const line = ledgerLine({ channel: 'x', post: p, result: { outcome: 'posted', id: '188', url: 'https://x.com/i/status/188' }, card, state: fixtureState(), now: at('2026-09-28T14:41:07Z') });
    eq(line.remote_id, '188', 'remote id');
    eq(line.text_sha256, textHash(p.text_api), 'hash of the text actually sent');
    eq(line.posted_at, '2026-09-28T14:41:07.000Z', 'UTC time');
    eq(line.reading.receipt_id, '2026-09-28T14-07-00Z', 'receipt');
    eq(parseLedger(JSON.stringify(line)).length, 1, 'the line it writes is a line it can read back');
  });
  await check('no credentials means no channel, and the reason names variables, never values', () => {
    const x = channelCredentials('x', { X_API_KEY: 'k-SENTINEL' });
    const b = channelCredentials('bluesky', {});
    eq(x.ok || b.ok, false, 'ok');
    if (JSON.stringify([x, b]).includes('SENTINEL')) throw new Error('a value leaked');
  });
  await check('a live run outside GitHub Actions is refused before anything is read', async () => {
    let threw = false;
    try { await run({ dryRun: false, channels: ['x'], env: {} }); } catch (err) { threw = /GitHub Actions/.test(err.message); }
    eq(threw, true, 'refused');
  });
  await check('bio guidance says Automated, names a managing human, fits X\'s 160, passes the ban', () => {
    for (const [ch, bio] of Object.entries(BIO_GUIDANCE)) {
      if (!bio.startsWith('Automated account managed by @')) throw new Error(`${ch} bio lacks the disclosure`);
      const v = findFutureViolation(bio);
      if (v) throw new Error(`${ch} bio trips the ban on "${v.match}"`);
    }
    const longest = BIO_GUIDANCE.x.replace('HUMAN_HANDLE', 'x'.repeat(15));
    if (longest.length > 160) throw new Error(`X bio is ${longest.length} chars with a 15-char handle; X allows 160`);
    if (BSKY.graphemeCount(BIO_GUIDANCE.bluesky) > 256) throw new Error('Bluesky bio over 256 graphemes');
    if (findFutureViolation(X_USE_CASE)) throw new Error('use-case text trips the ban');
  });
  await check('docs/POSTING.md §6 quotes the bio guidance and use case verbatim', async () => {
    const doc = await readFile(new URL('../docs/POSTING.md', import.meta.url), 'utf8');
    const s6 = doc.slice(doc.indexOf('## 6. Automated posting'));
    if (!doc.includes('## 6. Automated posting')) throw new Error('no §6 in docs/POSTING.md');
    for (const s of [BIO_GUIDANCE.x, BIO_GUIDANCE.bluesky, X_USE_CASE]) if (!s6.includes(s)) throw new Error(`§6 does not quote: ${s.slice(0, 60)}…`);
    for (const k of [...X.X_ENV, ...BSKY.BSKY_ENV]) if (!s6.includes(k)) throw new Error(`§6 does not name the secret ${k}`);
  });
  return results;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main(argv) {
  if (argv.includes('--selftest') || argv.includes('--test')) {
    const ok = [
      X.printResults('post-x', await X.selfTest()),
      X.printResults('post-bluesky', await BSKY.selfTest()),
      X.printResults('post-daily', await selfTest()),
    ].every(Boolean);
    say(ok ? 'ALL SELFTESTS PASSED' : 'SELFTEST FAILURES');
    if (!ok) process.exit(1);
    return;
  }
  const dryRun = argv.includes('--dry-run');
  const chArg = argv.find((a) => a.startsWith('--channel='));
  const channels = chArg ? chArg.slice(10).split(',').map((s) => s.trim()).filter(Boolean) : [...CHANNELS];
  for (const c of channels) if (!CHANNELS.includes(c)) throw new Error(`unknown channel "${c}"; have ${CHANNELS.join(', ')}`);
  const nowArg = argv.find((a) => a.startsWith('--now='));
  if (nowArg && !dryRun) throw new Error('--now= is for --dry-run only; a live post is stamped with the real clock');
  const now = nowArg ? new Date(nowArg.slice(6)) : new Date();
  if (Number.isNaN(now.getTime())) throw new Error(`unparsable --now: ${nowArg}`);
  const ledgerArg = argv.find((a) => a.startsWith('--ledger='));

  const report = await run({
    dryRun, channels, now, ledgerPath: ledgerArg ? ledgerArg.slice(9) : LEDGER_PATH, liveLocal: argv.includes('--live-local'),
  });
  say(`[post-daily] ${dryRun ? 'DRY RUN — nothing sent, nothing written. ' : ''}`
    + `${report.posted.length} ${dryRun ? 'would post' : 'posted'}, ${report.refused.length} refused, ${report.failed.length} failed, `
    + `${report.skipped_channels.length} channel(s) without credentials`);
  if (report.failed.length) process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2)).catch((err) => {
    process.stderr.write(`post-daily.mjs failed: ${err.message}\n`);
    process.exit(1);
  });
}
