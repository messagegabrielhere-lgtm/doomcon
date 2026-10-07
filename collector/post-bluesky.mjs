// collector/post-bluesky.mjs — one post to Bluesky through the AT Protocol.
//
// The Bluesky half of the daily poster. collector/post-daily.mjs picks the post
// and owns the ledger; this module turns one checked text, one link and one PNG
// into four XRPC calls against the account's PDS:
//
//   1. com.atproto.server.createSession   handle + APP password -> accessJwt, did
//   2. com.atproto.repo.uploadBlob        the card PNG -> blob ref
//   3. com.atproto.repo.createRecord      app.bsky.feed.post, link facet, external embed
//   4. com.atproto.server.deleteSession   retire the refresh token (best effort)
//
// Shapes read 2026-09-27 from the lexicons in github.com/bluesky-social/atproto:
// app.bsky.feed.post (text maxGraphemes 300, maxLength 3000 bytes, key "tid"),
// app.bsky.richtext.facet (byteSlice over UTF-8 bytes), app.bsky.embed.external
// (uri, title, description, thumb blob maxSize 1,000,000).
//
// THE TEXT IS THE `manual` VARIANT. Bluesky does not charge for links and does
// not penalise them in ranking (Graber, 2024-11-19), so the clickable address
// goes in the text, is made clickable with a facet (Bluesky does NOT auto-link
// plain text — without the facet the URL is inert), and the card rides in an
// app.bsky.embed.external whose thumb is the same PNG X gets. One post carries
// the number, the image and a working link. The embed is a union: a post gets
// images OR a link card, never both; the link card is the one that carries both.
//
// CREDENTIALS: BSKY_HANDLE and BSKY_APP_PASSWORD from the environment, nothing
// else. An APP password (xxxx-xxxx-xxxx-xxxx, Settings > Privacy and security >
// App passwords) is required and the account password is refused on shape —
// an app password can be revoked alone and cannot change the account's email
// or password. BSKY_SERVICE optionally names a self-hosted PDS; it defaults to
// https://bsky.social. The session is NOT persisted between runs: the only
// place to persist it would be the repo, and a JWT in a public repo is a
// credential in a public repo. One createSession a day is far inside the
// documented 30-per-5-minutes / 300-per-day limit.
//
// IDEMPOTENCY. The record key is a deterministic TID derived from the index
// reading's generated_at and the text's hash, so a second createRecord for the
// same post collides with the first instead of publishing it twice. The ledger
// in post-daily.mjs is the primary guard; this is the one behind it.

import { createHash } from 'node:crypto';
import { inspect } from 'node:util';
import { FetchError } from './fetch.mjs';
import { preflightManual, findFutureViolation } from './posts.mjs';
import {
  sendOnce, findMention, findRegisterViolation, assertPng, sha256, printResults, FIXTURE_PNG,
} from './post-x.mjs';
import * as SITE_BRAND from '../site/brand.mjs';

export const BSKY_DEFAULT_SERVICE = 'https://bsky.social';
export const BSKY_MAX_GRAPHEMES = 300;
export const BSKY_MAX_BYTES = 3000;
export const BSKY_THUMB_MAX_BYTES = 1_000_000;
export const BSKY_ENV = Object.freeze(['BSKY_HANDLE', 'BSKY_APP_PASSWORD']);
const APP_PASSWORD_RE = /^[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/i;

// ---------------------------------------------------------------------------
// Text measurement and the link facet
// ---------------------------------------------------------------------------

const SEGMENTER = typeof Intl?.Segmenter === 'function' ? new Intl.Segmenter('en', { granularity: 'grapheme' }) : null;

export function graphemeCount(text) {
  if (SEGMENTER) { let n = 0; for (const _ of SEGMENTER.segment(String(text))) n++; return n; }
  return [...String(text)].length;
}

export function utf8Length(text) {
  return Buffer.byteLength(String(text), 'utf8');
}

/** One link facet per occurrence of `link`, in UTF-8 byte offsets. */
export function linkFacets(text, link) {
  const facets = [];
  if (!link) return facets;
  let from = 0;
  for (;;) {
    const i = text.indexOf(link, from);
    if (i === -1) break;
    const byteStart = utf8Length(text.slice(0, i));
    facets.push({
      index: { byteStart, byteEnd: byteStart + utf8Length(link) },
      features: [{ $type: 'app.bsky.richtext.facet#link', uri: link }],
    });
    from = i + link.length;
  }
  return facets;
}

// ---------------------------------------------------------------------------
// TIDs — the record key format for app.bsky.feed.post
// ---------------------------------------------------------------------------
//
// 64 bits: a zero top bit, 53 bits of microseconds since the epoch, 10 bits of
// clock id; written in base32-sortable as 13 characters (atproto.com/specs/tid).

const S32 = '234567abcdefghijklmnopqrstuvwxyz';
export const TID_RE = /^[234567abcdefghij][234567abcdefghijklmnopqrstuvwxyz]{12}$/;

export function tidEncode(micros, clockId) {
  let v = (BigInt(micros) << 10n) | BigInt(clockId & 0x3ff);
  let s = '';
  for (let i = 0; i < 13; i++) { s = S32[Number(v & 31n)] + s; v >>= 5n; }
  return s;
}

export function tidDecode(tid) {
  if (!TID_RE.test(tid)) throw new Error(`not a TID: ${tid}`);
  let v = 0n;
  for (const ch of tid) v = (v << 5n) | BigInt(S32.indexOf(ch));
  return { micros: Number(v >> 10n), clockId: Number(v & 0x3ffn) };
}

/** Same reading + same text -> same rkey -> a repeat create collides. */
export function deterministicRkey(readingIso, text) {
  const ms = Date.parse(readingIso);
  if (!Number.isFinite(ms)) throw new Error(`deterministicRkey: unparsable time ${readingIso}`);
  const clockId = createHash('sha256').update(String(text)).digest().readUInt16BE(0) & 0x3ff;
  return tidEncode(ms * 1000, clockId);
}

// ---------------------------------------------------------------------------
// The guard
// ---------------------------------------------------------------------------

/** posts.mjs's manual-variant pre-flight, then Bluesky's own limits. */
export function preflightBluesky(text, link) {
  // Exactly one URL and it is ours; no future tense; a UTC stamp. X's weighted
  // 280 does not apply here, so the length check is handed a ceiling it cannot
  // reach and Bluesky's real limits are checked below.
  preflightManual(text, link, BSKY_MAX_BYTES);
  const g = graphemeCount(text);
  if (g > BSKY_MAX_GRAPHEMES) throw new Error(`POST REJECTED (bluesky): ${g} graphemes, limit ${BSKY_MAX_GRAPHEMES}`);
  const b = utf8Length(text);
  if (b > BSKY_MAX_BYTES) throw new Error(`POST REJECTED (bluesky): ${b} bytes, limit ${BSKY_MAX_BYTES}`);
  const mention = findMention(text);
  if (mention) throw new Error(`POST REJECTED (bluesky): carries an @mention ("${mention}"). This account mentions nobody.`);
  const reg = findRegisterViolation(text);
  if (reg) throw new Error(`POST REJECTED (bluesky): carries ${reg.why} ("${reg.match}"). VOICE.md §4.`);
  return text;
}

// The link card's words. TAGLINE and STRAPLINE only — the card title is post
// copy in everything but name, so it must clear the future-tense ban. (The old
// publication name contained "Warning" and tripped it; today's PUBLICATION is
// safe, but the card still stays on TAGLINE/STRAPLINE on purpose.)
export function linkCardMeta(brand = SITE_BRAND) {
  const title = `${brand.NAME} — ${brand.TAGLINE}`;
  const description = brand.STRAPLINE;
  for (const s of [title, description]) {
    const v = findFutureViolation(s);
    if (v) throw new Error(`link card copy trips the future-tense ban ("${v.match}"): ${s}`);
  }
  return { title, description };
}

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------

export function readCredentials(env = process.env) {
  const missing = BSKY_ENV.filter((k) => typeof env[k] !== 'string' || env[k].trim() === '');
  if (missing.length) return { ok: false, missing };
  const password = env.BSKY_APP_PASSWORD.trim();
  if (!APP_PASSWORD_RE.test(password)) {
    return {
      ok: false, missing: [],
      refused: 'BSKY_APP_PASSWORD is not shaped like an app password (xxxx-xxxx-xxxx-xxxx). '
        + 'Refusing to use what looks like the account password; create an app password and store that instead.',
    };
  }
  const service = (env.BSKY_SERVICE || BSKY_DEFAULT_SERVICE).trim().replace(/\/+$/, '');
  if (!/^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(service)) return { ok: false, missing: [], refused: 'BSKY_SERVICE must be an https:// origin with no path' };
  const creds = { service };
  Object.defineProperty(creds, 'identifier', { value: env.BSKY_HANDLE.trim().replace(/^@/, ''), enumerable: false });
  Object.defineProperty(creds, 'password', { value: password, enumerable: false });
  Object.defineProperty(creds, 'toJSON', { value: () => ({ service, credentials: '[redacted]' }), enumerable: false });
  Object.defineProperty(creds, inspect.custom, { value: () => `[Bluesky credentials for ${service} redacted]`, enumerable: false });
  return { ok: true, creds };
}

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

const xrpc = (service, nsid) => `${service}/xrpc/${nsid}`;

export function buildPostRecord({ text, link, createdAt, thumb, meta = linkCardMeta() }) {
  const record = {
    $type: 'app.bsky.feed.post',
    text,
    createdAt,
    langs: ['en'],
  };
  const facets = linkFacets(text, link);
  if (facets.length) record.facets = facets;
  if (link) {
    record.embed = {
      $type: 'app.bsky.embed.external',
      external: { uri: link, title: meta.title, description: meta.description, ...(thumb ? { thumb } : {}) },
    };
  }
  return record;
}

function excerpt(s, n = 300) {
  const flat = String(s || '').replace(/\s+/g, ' ').trim();
  return flat.length > n ? `${flat.slice(0, n)}…` : flat;
}

function expectOk(res, what, url) {
  if (res.status >= 200 && res.status < 300) {
    try { return JSON.parse(res.text || '{}'); } catch {
      throw new FetchError(`${what}: HTTP ${res.status} with a body that is not JSON — ${excerpt(res.text)}`, { url, status: res.status, kind: 'parse' });
    }
  }
  throw new FetchError(`${what}: HTTP ${res.status} — ${excerpt(res.text)}`, { url, status: res.status, kind: 'http', body: excerpt(res.text) });
}

const ALREADY_EXISTS_RE = /already exists|RecordAlreadyExists|duplicate/i;

/**
 * Post once. Returns { outcome: 'posted' | 'duplicate', uri, url, cid, rkey,
 * thumb: bool }. Throws on anything else. `transport` is injectable for tests.
 */
export async function postToBluesky({
  text, link, png, readingIso, creds, transport = sendOnce, now = () => new Date(),
}) {
  preflightBluesky(text, link);
  if (!creds || typeof creds.identifier !== 'string') throw new Error('postToBluesky: no credentials (read them with readCredentials())');
  const rkey = deterministicRkey(readingIso, text);
  const json = { 'content-type': 'application/json' };

  const sUrl = xrpc(creds.service, 'com.atproto.server.createSession');
  const session = expectOk(await transport({
    method: 'POST', url: sUrl, headers: json,
    body: JSON.stringify({ identifier: creds.identifier, password: creds.password }),
  }), 'Bluesky createSession', sUrl);
  if (!session.accessJwt || !session.did) throw new Error('Bluesky createSession returned no accessJwt/did');
  if (session.active === false) throw new Error(`Bluesky account is not active (status: ${session.status ?? 'unknown'})`);
  const auth = { authorization: `Bearer ${session.accessJwt}` };

  try {
    let thumb = null;
    let thumbNote = null;
    if (png) {
      assertPng(png);
      if (png.length > BSKY_THUMB_MAX_BYTES) {
        thumbNote = `card is ${png.length} bytes, over the ${BSKY_THUMB_MAX_BYTES}-byte thumb limit; posted without it`;
      } else {
        const bUrl = xrpc(creds.service, 'com.atproto.repo.uploadBlob');
        const up = expectOk(await transport({ method: 'POST', url: bUrl, headers: { ...auth, 'content-type': 'image/png' }, body: png }), 'Bluesky uploadBlob', bUrl);
        if (!up.blob) throw new Error('Bluesky uploadBlob returned no blob');
        thumb = up.blob;
      }
    }
    const record = buildPostRecord({ text, link, createdAt: now().toISOString(), thumb });
    const rUrl = xrpc(creds.service, 'com.atproto.repo.createRecord');
    const res = await transport({
      method: 'POST', url: rUrl, headers: { ...auth, ...json },
      body: JSON.stringify({ repo: session.did, collection: 'app.bsky.feed.post', rkey, record }),
    });
    const uri = `at://${session.did}/app.bsky.feed.post/${rkey}`;
    const url = `https://bsky.app/profile/${session.did}/post/${rkey}`;
    if (res.status >= 400 && res.status < 500 && ALREADY_EXISTS_RE.test(res.text)) {
      return { outcome: 'duplicate', uri, url, cid: null, rkey, thumb: Boolean(thumb), note: excerpt(res.text) };
    }
    const out = expectOk(res, 'Bluesky createRecord', rUrl);
    return { outcome: 'posted', uri: out.uri || uri, url, cid: out.cid ?? null, rkey, thumb: Boolean(thumb), note: thumbNote };
  } finally {
    // Retire the refresh token so nothing reusable outlives this process. A
    // failure here costs nothing: the access token expires in minutes anyway.
    if (session.refreshJwt) {
      const dUrl = xrpc(creds.service, 'com.atproto.server.deleteSession');
      await transport({ method: 'POST', url: dUrl, headers: { authorization: `Bearer ${session.refreshJwt}` } }).catch(() => {});
    }
  }
}

/** The requests postToBluesky() would send, with placeholders for every secret. */
export function dryRun({ text, link, png, readingIso, service = BSKY_DEFAULT_SERVICE, createdAt = readingIso }) {
  preflightBluesky(text, link);
  const rkey = deterministicRkey(readingIso, text);
  const thumbOk = png && assertPng(png) && png.length <= BSKY_THUMB_MAX_BYTES;
  const thumb = thumbOk
    ? { $type: 'blob', ref: { $link: '<cid returned by uploadBlob>' }, mimeType: 'image/png', size: png.length }
    : null;
  const record = buildPostRecord({ text, link, createdAt, thumb });
  const requests = [
    { step: 'createSession', method: 'POST', url: xrpc(service, 'com.atproto.server.createSession'), headers: { 'content-type': 'application/json' }, body: { identifier: '<BSKY_HANDLE>', password: '<BSKY_APP_PASSWORD>' } },
  ];
  if (png) {
    requests.push(thumbOk
      ? { step: 'uploadBlob', method: 'POST', url: xrpc(service, 'com.atproto.repo.uploadBlob'), headers: { authorization: 'Bearer <accessJwt from createSession>', 'content-type': 'image/png' }, body: { bytes: png.length, sha256: sha256(png) } }
      : { step: 'uploadBlob', skipped: `card is ${png.length} bytes, over the ${BSKY_THUMB_MAX_BYTES}-byte thumb limit` });
  }
  requests.push(
    { step: 'createRecord', method: 'POST', url: xrpc(service, 'com.atproto.repo.createRecord'), headers: { authorization: 'Bearer <accessJwt from createSession>', 'content-type': 'application/json' }, body: { repo: '<did from createSession>', collection: 'app.bsky.feed.post', rkey, record } },
    { step: 'deleteSession', method: 'POST', url: xrpc(service, 'com.atproto.server.deleteSession'), headers: { authorization: 'Bearer <refreshJwt from createSession>' } },
  );
  return {
    note: 'DRY RUN. No environment variable was read and nothing was sent. createdAt is the reading time here; a live post stamps the moment it is sent.',
    graphemes: graphemeCount(text), bytes: utf8Length(text), requests,
  };
}

// ---------------------------------------------------------------------------
// Self-test — no network, no credentials
// ---------------------------------------------------------------------------

export const FIXTURE_LINK = 'https://messagegabrielhere-lgtm.github.io/doomcon';
export const FIXTURE_MANUAL_TEXT = '$874k is posted on Polymarket’s “Which company has best AI model end of 2026”, 02:22 UTC, '
  + '28 Sep 2026: Dario Amodei’s Anthropic 75.0 percent, Demis Hassabis’ Google DeepMind 9.5, Sam Altman’s OpenAI 8.5. '
  + `Arithmetic at ${FIXTURE_LINK}`;
const FIXTURE_READING = '2026-09-28T02:22:31.000Z';

export async function selfTest() {
  const results = [];
  const check = async (name, fn) => {
    try { await fn(); results.push({ name, ok: true }); } catch (err) { results.push({ name, ok: false, error: err.message }); }
  };
  const eq = (a, b, what) => { if (a !== b) throw new Error(`${what}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
  const throws = (fn, re, what) => {
    try { fn(); } catch (err) { if (re && !re.test(err.message)) throw new Error(`${what}: threw the wrong error: ${err.message}`); return; }
    throw new Error(`${what}: did not throw`);
  };
  const env = { BSKY_HANDLE: 'doomcon.bsky.social', BSKY_APP_PASSWORD: 'abcd-efgh-ijkl-mnop' };

  await check('graphemes, not code units: one family emoji is one grapheme', () => {
    eq(graphemeCount('abc'), 3, 'ascii');
    eq(graphemeCount('👨‍👩‍👧'), 1, 'ZWJ family');
    eq(graphemeCount('é'), 1, 'combining accent');
  });
  await check('link facet offsets are UTF-8 bytes, past three-byte curly quotes', () => {
    const [f] = linkFacets(FIXTURE_MANUAL_TEXT, FIXTURE_LINK);
    const bytes = Buffer.from(FIXTURE_MANUAL_TEXT, 'utf8');
    eq(bytes.subarray(f.index.byteStart, f.index.byteEnd).toString('utf8'), FIXTURE_LINK, 'sliced bytes');
    if (f.index.byteStart === FIXTURE_MANUAL_TEXT.indexOf(FIXTURE_LINK)) throw new Error('used a UTF-16 index; the curly quotes should shift it');
    eq(f.features[0].$type, 'app.bsky.richtext.facet#link', 'feature type');
  });
  await check('TIDs: 13 chars, valid alphabet, round-trip, deterministic per text', () => {
    const t = tidEncode(1759026151000000, 42);
    if (!TID_RE.test(t)) throw new Error(`bad TID ${t}`);
    const d = tidDecode(t);
    eq(d.micros, 1759026151000000, 'micros');
    eq(d.clockId, 42, 'clock id');
    eq(deterministicRkey(FIXTURE_READING, 'a'), deterministicRkey(FIXTURE_READING, 'a'), 'same text, same key');
    if (deterministicRkey(FIXTURE_READING, 'a') === deterministicRkey(FIXTURE_READING, 'b')) throw new Error('different texts collided (possible, 1 in 1024, but not for these two)');
    eq(tidDecode(deterministicRkey(FIXTURE_READING, 'a')).micros, Date.parse(FIXTURE_READING) * 1000, 'key carries the reading time');
  });
  await check('the post record: $type, facet, external embed with thumb, langs', () => {
    const thumb = { $type: 'blob', ref: { $link: 'bafkrei' }, mimeType: 'image/png', size: 67 };
    const r = buildPostRecord({ text: FIXTURE_MANUAL_TEXT, link: FIXTURE_LINK, createdAt: FIXTURE_READING, thumb });
    eq(r.$type, 'app.bsky.feed.post', '$type');
    eq(r.facets.length, 1, 'facets');
    eq(r.embed.$type, 'app.bsky.embed.external', 'embed');
    eq(r.embed.external.uri, FIXTURE_LINK, 'uri');
    eq(r.embed.external.thumb, thumb, 'thumb');
    eq(r.langs[0], 'en', 'langs');
    if (!r.embed.external.title || !r.embed.external.description) throw new Error('card has no title/description');
  });
  await check('the link card copy passes the future-tense ban', () => {
    const meta = linkCardMeta();
    for (const s of [meta.title, meta.description, SITE_BRAND.PUBLICATION]) {
      const v = findFutureViolation(s);
      if (v) throw new Error(`"${s}" trips the ban on "${v.match}"`);
    }
  });
  await check('preflightBluesky accepts a real manual-variant post', () => { preflightBluesky(FIXTURE_MANUAL_TEXT, FIXTURE_LINK); });
  await check('preflightBluesky rejects 301 graphemes, a second URL, no link, future tense, a mention', () => {
    throws(() => preflightBluesky(`${'a'.repeat(240)} 12:00 UTC. Arithmetic at ${FIXTURE_LINK}`, FIXTURE_LINK), /graphemes/, 'length');
    throws(() => preflightBluesky(FIXTURE_MANUAL_TEXT.replace('Polymarket', 'polymarket.com'), FIXTURE_LINK), /not the canonical link/, 'second url');
    throws(() => preflightBluesky(FIXTURE_MANUAL_TEXT.replace(FIXTURE_LINK, 'the site'), FIXTURE_LINK), /does not carry the canonical link/, 'no link');
    throws(() => preflightBluesky(FIXTURE_MANUAL_TEXT.replace('is posted', 'will be posted'), FIXTURE_LINK), /future tense/, 'future');
    throws(() => preflightBluesky(FIXTURE_MANUAL_TEXT.replace('Dario', '@dario Dario'), FIXTURE_LINK), /mention/, 'mention');
  });
  await check('readCredentials: names missing vars, refuses an account password, never echoes', () => {
    const a = readCredentials({ BSKY_HANDLE: 'x' });
    eq(a.missing.join(), 'BSKY_APP_PASSWORD', 'missing');
    const b = readCredentials({ BSKY_HANDLE: 'x', BSKY_APP_PASSWORD: 'hunter2-SENTINEL' });
    eq(b.ok, false, 'account password refused');
    if (JSON.stringify(b).includes('SENTINEL')) throw new Error('the password leaked into the refusal');
    const c = readCredentials({ ...env, BSKY_APP_PASSWORD: 'SENT-INEL-abcd-efgh' });
    eq(c.ok, true, 'app password accepted');
    if (JSON.stringify(c).includes('SENT') || inspect(c, { depth: 5 }).includes('SENT')) throw new Error('credentials leaked through stringify/inspect');
    eq(readCredentials({ ...env, BSKY_SERVICE: 'http://evil.example' }).ok, false, 'plain-http PDS refused');
  });
  await check('postToBluesky: createSession, uploadBlob, createRecord(rkey), deleteSession — in that order', async () => {
    const calls = [];
    const fake = async (req) => {
      calls.push(req);
      if (req.url.endsWith('createSession')) return { status: 200, text: JSON.stringify({ accessJwt: 'ACC', refreshJwt: 'REF', did: 'did:plc:test123', handle: 'doomcon.bsky.social', active: true }) };
      if (req.url.endsWith('uploadBlob')) return { status: 200, text: JSON.stringify({ blob: { $type: 'blob', ref: { $link: 'bafkreitest' }, mimeType: 'image/png', size: FIXTURE_PNG.length } }) };
      if (req.url.endsWith('createRecord')) { const b = JSON.parse(req.body); return { status: 200, text: JSON.stringify({ uri: `at://${b.repo}/app.bsky.feed.post/${b.rkey}`, cid: 'bafyreitest' }) }; }
      return { status: 200, text: '' };
    };
    const { creds } = readCredentials(env);
    const r = await postToBluesky({ text: FIXTURE_MANUAL_TEXT, link: FIXTURE_LINK, png: FIXTURE_PNG, readingIso: FIXTURE_READING, creds, transport: fake, now: () => new Date('2026-09-28T14:41:00Z') });
    eq(calls.map((c) => c.url.split('/').pop()).join(' '), 'com.atproto.server.createSession com.atproto.repo.uploadBlob com.atproto.repo.createRecord com.atproto.server.deleteSession', 'sequence');
    eq(calls[1].headers['content-type'], 'image/png', 'blob content type');
    eq(calls[1].headers.authorization, 'Bearer ACC', 'blob auth');
    const body = JSON.parse(calls[2].body);
    eq(body.repo, 'did:plc:test123', 'repo');
    eq(body.rkey, deterministicRkey(FIXTURE_READING, FIXTURE_MANUAL_TEXT), 'rkey');
    eq(body.record.embed.external.thumb.ref.$link, 'bafkreitest', 'thumb');
    eq(body.record.createdAt, '2026-09-28T14:41:00.000Z', 'createdAt is the send time');
    eq(calls[3].headers.authorization, 'Bearer REF', 'session retired with the refresh token');
    eq(r.outcome, 'posted', 'outcome');
  });
  await check('an existing rkey comes back as "duplicate", and the session is still retired', async () => {
    const seen = [];
    const fake = async (req) => {
      seen.push(req.url.split('/').pop());
      if (req.url.endsWith('createSession')) return { status: 200, text: '{"accessJwt":"A","refreshJwt":"R","did":"did:plc:x"}' };
      if (req.url.endsWith('uploadBlob')) return { status: 200, text: '{"blob":{"$type":"blob","ref":{"$link":"b"},"mimeType":"image/png","size":1}}' };
      if (req.url.endsWith('createRecord')) return { status: 400, text: '{"error":"InvalidRequest","message":"Record already exists"}' };
      return { status: 200, text: '' };
    };
    const { creds } = readCredentials(env);
    const r = await postToBluesky({ text: FIXTURE_MANUAL_TEXT, link: FIXTURE_LINK, png: FIXTURE_PNG, readingIso: FIXTURE_READING, creds, transport: fake });
    eq(r.outcome, 'duplicate', 'outcome');
    eq(seen[seen.length - 1], 'com.atproto.server.deleteSession', 'last call');
  });
  await check('a card over 1,000,000 bytes posts without a thumb instead of failing', async () => {
    const big = Buffer.concat([FIXTURE_PNG, Buffer.alloc(BSKY_THUMB_MAX_BYTES)]);
    const urls = [];
    const fake = async (req) => {
      urls.push(req.url);
      if (req.url.endsWith('createSession')) return { status: 200, text: '{"accessJwt":"A","refreshJwt":"R","did":"did:plc:x"}' };
      if (req.url.endsWith('createRecord')) return { status: 200, text: '{"uri":"at://did:plc:x/app.bsky.feed.post/k","cid":"c"}' };
      return { status: 200, text: '' };
    };
    const { creds } = readCredentials(env);
    const r = await postToBluesky({ text: FIXTURE_MANUAL_TEXT, link: FIXTURE_LINK, png: big, readingIso: FIXTURE_READING, creds, transport: fake });
    if (urls.some((u) => u.endsWith('uploadBlob'))) throw new Error('uploaded an oversize blob');
    eq(r.thumb, false, 'thumb flag');
  });
  await check('dryRun reads no environment variable and sends nothing', () => {
    const saved = {};
    for (const k of BSKY_ENV) { saved[k] = process.env[k]; process.env[k] = `ENVSENTINEL-${k}`; }
    const realFetch = globalThis.fetch;
    let fetched = 0;
    globalThis.fetch = async () => { fetched++; throw new Error('network used'); };
    try {
      const out = JSON.stringify(dryRun({ text: FIXTURE_MANUAL_TEXT, link: FIXTURE_LINK, png: FIXTURE_PNG, readingIso: FIXTURE_READING }));
      if (out.includes('ENVSENTINEL')) throw new Error('dry run printed an environment credential');
      eq(fetched, 0, 'fetch calls');
    } finally {
      globalThis.fetch = realFetch;
      for (const k of BSKY_ENV) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
    }
  });
  return results;
}

async function main(argv) {
  if (argv.includes('--selftest') || argv.includes('--test')) {
    if (!printResults('post-bluesky', await selfTest())) process.exit(1);
    return;
  }
  if (argv.includes('--dry-run')) {
    const { readFile } = await import('node:fs/promises');
    const textArg = argv.find((a) => a.startsWith('--text='));
    const linkArg = argv.find((a) => a.startsWith('--link='));
    const imageArg = argv.find((a) => a.startsWith('--image='));
    if (!textArg) process.stderr.write('[post-bluesky] no --text=… given; dry-running a fixture post. For today\'s slate: node collector/post-daily.mjs --dry-run\n');
    const out = dryRun({
      text: textArg ? textArg.slice(7) : FIXTURE_MANUAL_TEXT,
      link: linkArg ? linkArg.slice(7) : FIXTURE_LINK,
      png: imageArg ? await readFile(imageArg.slice(8)) : FIXTURE_PNG,
      readingIso: FIXTURE_READING,
    });
    process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
    return;
  }
  process.stderr.write(
    'post-bluesky.mjs does not post on its own. Real posts go through collector/post-daily.mjs, which owns the\n'
    + 'double-post ledger (data/posted.ndjson). Use --selftest or --dry-run [--text=…] [--link=…] [--image=path.png].\n',
  );
  process.exit(2);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2)).catch((err) => {
    process.stderr.write(`post-bluesky.mjs failed: ${err.message}\n`);
    process.exit(1);
  });
}
