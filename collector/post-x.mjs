// collector/post-x.mjs — one post to X through the v2 API, signed by hand.
//
// WHAT THIS IS. The X half of the daily poster. collector/post-daily.mjs picks
// the post and owns the double-post ledger; this module only knows how to turn
// one already-checked text and one PNG into two signed HTTPS requests:
//
//   1. POST https://api.x.com/2/media/upload   multipart, media_category=tweet_image
//   2. POST https://api.x.com/2/tweets         {"text", "media": {"media_ids": [id]}}
//
// Both read 2026-09-27 at docs.x.com/x-api/media/upload-media and
// docs.x.com/x-api/posts/create-post. Both accept OAuth 1.0a user context
// ("UserToken"); app-only Bearer cannot create a post.
//
// THE TEXT IS ALWAYS THE `api` VARIANT. X bills $0.015 for a link-free post and
// $0.200 for one carrying a URL (docs/X-STRATEGY.md §5.1), and its own ranker
// weights a link-open at 0.2 against a copy-link share at 20.0. So the text that
// reaches this module has the address SPELLED, and preflightX() re-runs
// posts.mjs's own URL and future-tense guards on it anyway. Discipline fails at
// 02:00; a thrown exception does not.
//
// CREDENTIALS come from four environment variables and nowhere else:
//   X_API_KEY  X_API_SECRET  X_ACCESS_TOKEN  X_ACCESS_SECRET
// They are never printed, never written to disk, and the object that carries
// them redacts itself under JSON.stringify and util.inspect. --dry-run does not
// read them at all: it signs with the sample credentials X publishes in its own
// "Creating a signature" guide, so the printed request is a real, checkable
// signature and not one of ours.
//
// SIGNING is RFC 5849 HMAC-SHA1 with node:crypto, no library. selfTest()
// reproduces two independently published vectors byte for byte — RFC 5849
// §1.2's photos request (MdpQcU8iPSUjWoN/UDMsK2sui9I=) and X's own guide
// (hCtSmYh+iHYCEqBWrE7C7hYmtUk=) — plus the RFC §3.4.1.1 base-string example.
// That is the only part of this file that can be proven without a live account.
//
// CONTRACT.md §1.5 says every network call goes through collector/fetch.mjs.
// This file is the one exception, for two reasons it cannot work around:
// fetch.mjs has no request-body option, and its retry policy (retry 5xx and
// transport failures twice) is exactly wrong for a paid, non-idempotent write —
// a timeout after X accepted the post, retried, is a double post and a double
// charge. sendOnce() below makes ONE attempt, uses fetch.mjs's User-Agent and
// FetchError so failures look like every other failure in the repo, and is
// replaceable the day fetch.mjs grows a `body`.

import { createHmac, createHash, randomBytes } from 'node:crypto';
import { inspect } from 'node:util';
import { USER_AGENT, FetchError } from './fetch.mjs';
import {
  preflight, findUrlViolation, findFutureViolation, charCount, X_CHAR_LIMIT,
} from './posts.mjs';

export const X_API = 'https://api.x.com';
export const X_TWEETS_URL = `${X_API}/2/tweets`;
export const X_MEDIA_URL = `${X_API}/2/media/upload`;
export const X_MEDIA_CATEGORY = 'tweet_image';
// docs.x.com lists images at 5 MB. Our cards are ~130 KB; the ceiling is here so
// a runaway render fails in this process rather than as a 413 we paid for.
export const X_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const X_ENV = Object.freeze(['X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_SECRET']);
export const HTTP_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// RFC 5849 — percent-encoding, parameter normalisation, base string, signature
// ---------------------------------------------------------------------------

// §3.6: UTF-8, then encode everything outside ALPHA / DIGIT / - . _ ~ with
// upper-case hex. encodeURIComponent leaves ! ' ( ) * alone, so those five are
// finished by hand. Getting this wrong signs a different string from the one X
// rebuilds, and the only symptom is a 401 with no further detail.
export function percentEncode(value) {
  return encodeURIComponent(String(value))
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

// application/x-www-form-urlencoded decoding: '+' is a space, then %XX.
function formDecode(s) {
  return decodeURIComponent(String(s).replace(/\+/g, ' '));
}

// "a=1&b&c=%20" -> [['a','1'],['b',''],['c',' ']]. Order and duplicates kept:
// §3.4.1.3.2 sorts by name AND value, so a3=a and a3=2+q both survive.
export function parseFormPairs(str) {
  if (typeof str !== 'string' || str.length === 0) return [];
  return str.split('&').filter((p) => p.length > 0).map((p) => {
    const i = p.indexOf('=');
    return i === -1 ? [formDecode(p), ''] : [formDecode(p.slice(0, i)), formDecode(p.slice(i + 1))];
  });
}

// §3.4.1.2: lower-case scheme and host, default port dropped, no query, no
// fragment. The URL class already lower-cases the host and drops :80/:443.
export function baseStringUri(url) {
  const u = new URL(url);
  return `${u.protocol.toLowerCase()}//${u.host.toLowerCase()}${u.pathname}`;
}

// §3.4.1.3.2: encode each name and value, sort by encoded name then encoded
// value (plain code-unit order — every character left is ASCII), join.
export function normaliseParams(pairs) {
  return pairs
    .map(([k, v]) => [percentEncode(k), percentEncode(v)])
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
}

/**
 * The signature base string. `formBody` is the entity body ONLY when it is
 * application/x-www-form-urlencoded (§3.4.1.3.1). A JSON body — POST /2/tweets
 * — and a multipart body — POST /2/media/upload — are NOT part of the
 * signature, and including them is the classic way to earn a 401.
 */
export function signatureBaseString(method, url, oauthParams, formBody = '') {
  const query = new URL(url).search.replace(/^\?/, '');
  const pairs = [
    ...parseFormPairs(query),
    ...parseFormPairs(formBody),
    ...Object.entries(oauthParams).filter(([k]) => k !== 'oauth_signature' && k !== 'realm'),
  ];
  return `${String(method).toUpperCase()}&${percentEncode(baseStringUri(url))}&${percentEncode(normaliseParams(pairs))}`;
}

export function hmacSha1(baseString, consumerSecret, tokenSecret = '') {
  const key = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  return createHmac('sha1', key).update(baseString).digest('base64');
}

/**
 * Sign one request. nonce/timestamp are injectable so the test vectors can be
 * reproduced exactly; in production they come from crypto.randomBytes and the
 * wall clock (OAuth requires both — this is a request header, not index output,
 * so CONTRACT.md §4's determinism rule is not in play).
 */
export function oauthSign({
  method, url, creds, formBody = '', nonce, timestamp, version = true, realm,
}) {
  const oauth = {
    oauth_consumer_key: creds.consumerKey,
    oauth_nonce: nonce ?? randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(timestamp ?? Math.floor(Date.now() / 1000)),
    oauth_token: creds.token,
  };
  if (version) oauth.oauth_version = '1.0';
  const baseString = signatureBaseString(method, url, oauth, formBody);
  const signature = hmacSha1(baseString, creds.consumerSecret, creds.tokenSecret);
  const fields = Object.entries({ ...oauth, oauth_signature: signature })
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${percentEncode(k)}="${percentEncode(v)}"`);
  if (realm !== undefined) fields.unshift(`realm="${realm}"`);
  return { baseString, signature, header: `OAuth ${fields.join(', ')}`, oauth };
}

// The published vectors. `expect` is copied from the documents, never computed.
export const TEST_VECTORS = Object.freeze([
  {
    name: 'RFC 5849 §1.2 (photos.example.net, HMAC-SHA1)',
    method: 'GET',
    url: 'http://photos.example.net/photos?file=vacation.jpg&size=original',
    creds: {
      consumerKey: 'dpf43f3p2l4k3l03', consumerSecret: 'kd94hf93k423kf44',
      token: 'nnch734d00sl2jdk', tokenSecret: 'pfkkdhi9sl3r4s00',
    },
    nonce: 'chapoH', timestamp: '137131202', version: false,
    expect: 'MdpQcU8iPSUjWoN/UDMsK2sui9I=',
  },
  {
    name: 'X developer docs, "Creating a signature" (POST statuses/update)',
    method: 'POST',
    url: 'https://api.twitter.com/1.1/statuses/update.json?include_entities=true',
    formBody: 'status=Hello%20Ladies%20%2B%20Gentlemen%2C%20a%20signed%20OAuth%20request%21',
    creds: {
      consumerKey: 'xvz1evFS4wEEPTGEFPHBog', consumerSecret: 'kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw',
      token: '370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb',
      tokenSecret: 'LswwdoUaIvS8ltyTt5jkRh4J50vUPVVHtR2YPi5kE',
    },
    nonce: 'kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg', timestamp: '1318622958', version: true,
    expect: 'hCtSmYh+iHYCEqBWrE7C7hYmtUk=',
  },
]);

// RFC 5849 §3.4.1.1 prints the base string but not the secrets, so it can only
// test the base string. It is the hardest normalisation case in the RFC: a
// repeated name, an empty value, an '@' in a name, and '+' meaning space.
export const RFC_BASE_STRING_VECTOR = Object.freeze({
  method: 'POST',
  url: 'http://example.com/request?b5=%3D%253D&a3=a&c%40=&a2=r%20b',
  formBody: 'c2&a3=2+q',
  oauth: {
    oauth_consumer_key: '9djdj82h48djs9d2', oauth_token: 'kkk9d7dh3k39sjv7',
    oauth_signature_method: 'HMAC-SHA1', oauth_timestamp: '137131201', oauth_nonce: '7d8f3e4a',
  },
  expect: 'POST&http%3A%2F%2Fexample.com%2Frequest&a2%3Dr%2520b%26a3%3D2%2520q'
    + '%26a3%3Da%26b5%3D%253D%25253D%26c%2540%3D%26c2%3D%26oauth_consumer_'
    + 'key%3D9djdj82h48djs9d2%26oauth_nonce%3D7d8f3e4a%26oauth_signature_m'
    + 'ethod%3DHMAC-SHA1%26oauth_timestamp%3D137131201%26oauth_token%3Dkkk'
    + '9d7dh3k39sjv7',
});

// What --dry-run signs with. These are X's published sample values from the
// guide above, not credentials of any account we control.
export const DRY_RUN_CREDS = Object.freeze({ ...TEST_VECTORS[1].creds });
export const DRY_RUN_NONCE = TEST_VECTORS[1].nonce;
export const DRY_RUN_TIMESTAMP = TEST_VECTORS[1].timestamp;

// ---------------------------------------------------------------------------
// Credentials — read once, never shown
// ---------------------------------------------------------------------------

/**
 * Returns { ok: true, creds } or { ok: false, missing: [names] }. The names of
 * the missing variables are the only thing that ever leaves this function.
 */
export function readCredentials(env = process.env) {
  const missing = X_ENV.filter((k) => typeof env[k] !== 'string' || env[k].trim() === '');
  if (missing.length) return { ok: false, missing };
  const creds = {};
  const values = {
    consumerKey: env.X_API_KEY.trim(), consumerSecret: env.X_API_SECRET.trim(),
    token: env.X_ACCESS_TOKEN.trim(), tokenSecret: env.X_ACCESS_SECRET.trim(),
  };
  for (const [k, v] of Object.entries(values)) {
    Object.defineProperty(creds, k, { value: v, enumerable: false });
  }
  // A stray console.log(creds) or JSON.stringify(result) prints this, not keys.
  Object.defineProperty(creds, 'toJSON', { value: () => '[X credentials redacted]', enumerable: false });
  Object.defineProperty(creds, inspect.custom, { value: () => '[X credentials redacted]', enumerable: false });
  return { ok: true, creds };
}

// ---------------------------------------------------------------------------
// The text guard — posts.mjs's own pre-flight, plus the X-only rules
// ---------------------------------------------------------------------------

// An @ followed by a word character is a mention. Self-serve apps cannot
// @mention non-participants since 2026-02-23, and the Automation Rules forbid
// unsolicited mentions anyway (docs/X-STRATEGY.md §5.2). A mention would be
// rejected by X after we had already paid for the media upload.
const MENTION_RE = /(^|[^\w@])@[A-Za-z0-9_]{1,15}\b/;
// VOICE.md §4: no exclamation marks, no BREAKING, no emoji. Soft bans in the
// voice guide; hard ones here, because nobody reviews an unattended post.
const REGISTER_RULES = [
  { why: 'an exclamation mark', re: /!/ },
  { why: 'BREAKING', re: /\bBREAKING\b/i },
  { why: 'an emoji', re: /\p{Extended_Pictographic}/u },
];

export function findMention(text) {
  const m = MENTION_RE.exec(String(text));
  return m ? m[0].trim() : null;
}

export function findRegisterViolation(text) {
  for (const r of REGISTER_RULES) {
    const m = r.re.exec(String(text));
    if (m) return { why: r.why, match: m[0] };
  }
  return null;
}

/** Throws on anything X should not receive. Returns the text unchanged. */
export function preflightX(text) {
  preflight(text, X_CHAR_LIMIT); // no URL, no future tense, a UTC stamp, <=280 weighted
  const mention = findMention(text);
  if (mention) throw new Error(`POST REJECTED (x): carries an @mention ("${mention}"). This account mentions nobody.`);
  const reg = findRegisterViolation(text);
  if (reg) throw new Error(`POST REJECTED (x): carries ${reg.why} ("${reg.match}"). VOICE.md §4.`);
  return text;
}

// ---------------------------------------------------------------------------
// The image, and the multipart body it travels in
// ---------------------------------------------------------------------------

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function assertPng(bytes, maxBytes = X_IMAGE_MAX_BYTES) {
  if (!Buffer.isBuffer(bytes) || bytes.length < PNG_MAGIC.length) throw new Error('card is not a PNG buffer');
  if (!bytes.subarray(0, 8).equals(PNG_MAGIC)) throw new Error('card does not start with the PNG signature');
  if (bytes.length > maxBytes) throw new Error(`card is ${bytes.length} bytes; the limit is ${maxBytes}`);
  return bytes;
}

export function sha256(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

/**
 * multipart/form-data, built by hand so --dry-run can print exactly what is
 * sent. The boundary is derived from the image hash (deterministic, no
 * Math.random) and checked against the payload, per RFC 2046 §5.1.1.
 */
export function buildMultipart(fields, file) {
  let boundary = `----doomcon-${sha256(file.bytes).slice(7, 31)}`;
  for (let i = 0; file.bytes.includes(boundary) || Object.values(fields).some((v) => String(v).includes(boundary)); i++) {
    boundary = `----doomcon-${i}-${sha256(Buffer.concat([file.bytes, Buffer.from(String(i))])).slice(7, 31)}`;
  }
  const parts = [];
  for (const [name, value] of Object.entries(fields)) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`));
  }
  parts.push(Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="${file.field}"; filename="${file.filename}"\r\n`
    + `Content-Type: ${file.contentType}\r\n\r\n`,
  ));
  parts.push(file.bytes, Buffer.from(`\r\n--${boundary}--\r\n`));
  return { boundary, body: Buffer.concat(parts), contentType: `multipart/form-data; boundary=${boundary}` };
}

// ---------------------------------------------------------------------------
// The two requests
// ---------------------------------------------------------------------------

export function mediaUploadRequest(png, { creds, nonce, timestamp } = {}) {
  assertPng(png);
  const mp = buildMultipart(
    { media_category: X_MEDIA_CATEGORY },
    { field: 'media', filename: 'doomcon-card.png', contentType: 'image/png', bytes: png },
  );
  // Multipart is not form-urlencoded, so nothing from the body is signed.
  const signed = oauthSign({ method: 'POST', url: X_MEDIA_URL, creds, nonce, timestamp });
  return {
    method: 'POST',
    url: X_MEDIA_URL,
    headers: { authorization: signed.header, 'content-type': mp.contentType, 'content-length': String(mp.body.length) },
    body: mp.body,
    signed,
    describe: { multipart_boundary: mp.boundary, fields: { media_category: X_MEDIA_CATEGORY }, media: { bytes: png.length, sha256: sha256(png) } },
  };
}

export function createPostRequest(text, mediaIds, { creds, nonce, timestamp } = {}) {
  const payload = { text };
  if (Array.isArray(mediaIds) && mediaIds.length) payload.media = { media_ids: mediaIds.map(String) };
  const body = JSON.stringify(payload);
  const signed = oauthSign({ method: 'POST', url: X_TWEETS_URL, creds, nonce, timestamp });
  return {
    method: 'POST',
    url: X_TWEETS_URL,
    headers: { authorization: signed.header, 'content-type': 'application/json' },
    body,
    signed,
  };
}

// ---------------------------------------------------------------------------
// Transport — one attempt, no retry (see the header for why)
// ---------------------------------------------------------------------------

export async function sendOnce({ method, url, headers = {}, body }, { timeoutMs = HTTP_TIMEOUT_MS } = {}) {
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: { 'user-agent': USER_AGENT, ...headers },
      body,
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (cause) {
    const timedOut = cause?.name === 'TimeoutError' || cause?.name === 'AbortError';
    throw new FetchError(
      `${timedOut ? `timeout after ${timeoutMs}ms` : `network error: ${cause?.message ?? cause}`}: ${method} ${url} `
      + '(NOT retried: a paid write that may have landed is never sent twice)',
      { url, kind: timedOut ? 'timeout' : 'network', cause },
    );
  }
  const text = await res.text().catch(() => '');
  return { status: res.status, headers: Object.fromEntries(res.headers), text };
}

function excerpt(s, n = 300) {
  const flat = String(s || '').replace(/\s+/g, ' ').trim();
  return flat.length > n ? `${flat.slice(0, n)}…` : flat;
}

function parseJson(res, what) {
  try { return JSON.parse(res.text); } catch {
    throw new FetchError(`${what}: HTTP ${res.status} with a body that is not JSON — ${excerpt(res.text)}`, { status: res.status, kind: 'parse' });
  }
}

function expectOk(res, what, url) {
  if (res.status >= 200 && res.status < 300) return parseJson(res, what);
  const err = new FetchError(`${what}: HTTP ${res.status} — ${excerpt(res.text)}`, { url, status: res.status, kind: 'http', body: excerpt(res.text) });
  err.responseText = res.text;
  throw err;
}

// ---------------------------------------------------------------------------
// The whole post
// ---------------------------------------------------------------------------

/**
 * Upload the card, then create the post. Returns
 *   { outcome: 'posted', id, url, media_id }
 *   { outcome: 'duplicate', id: null, ... }   X refused identical text: it was
 *                                             already posted by a run the ledger
 *                                             never heard about.
 * Throws on anything else. `transport` is injectable so selfTest() can prove
 * the request sequence with no network.
 */
export async function postToX({ text, png, creds, transport = sendOnce }) {
  preflightX(text);
  if (!creds || typeof creds.consumerKey !== 'string') throw new Error('postToX: no credentials (read them with readCredentials())');
  let mediaId = null;
  if (png) {
    const up = mediaUploadRequest(png, { creds });
    const res = await transport({ method: up.method, url: up.url, headers: up.headers, body: up.body });
    const json = expectOk(res, 'X media upload', up.url);
    mediaId = json?.data?.id ?? json?.media_id_string ?? null;
    if (!mediaId) throw new Error(`X media upload returned no media id — ${excerpt(res.text)}`);
  }
  const req = createPostRequest(text, mediaId ? [mediaId] : [], { creds });
  const res = await transport({ method: req.method, url: req.url, headers: req.headers, body: req.body });
  if (res.status === 403 && /duplicate content/i.test(res.text)) {
    return { outcome: 'duplicate', id: null, url: null, media_id: mediaId, detail: excerpt(res.text) };
  }
  const json = expectOk(res, 'X create post', req.url);
  const id = json?.data?.id;
  if (!id) throw new Error(`X create post returned no id — ${excerpt(res.text)}`);
  return { outcome: 'posted', id: String(id), url: `https://x.com/i/status/${id}`, media_id: mediaId };
}

/**
 * The exact requests postToX() would send, signed with X's published sample
 * credentials and a fixed nonce and timestamp. Reads no environment variable
 * and opens no socket. Binary bodies are summarised by length and hash.
 */
export function dryRun({ text, png }) {
  preflightX(text);
  const opts = { creds: DRY_RUN_CREDS, nonce: DRY_RUN_NONCE, timestamp: DRY_RUN_TIMESTAMP };
  const out = [];
  let mediaId = null;
  if (png) {
    const up = mediaUploadRequest(png, opts);
    out.push({ step: 'media upload', method: up.method, url: up.url, headers: up.headers, body: up.describe, signature_base_string: up.signed.baseString });
    mediaId = '<data.id from the media upload>';
  }
  const req = createPostRequest(text, mediaId ? [mediaId] : [], opts);
  out.push({ step: 'create post', method: req.method, url: req.url, headers: req.headers, body: JSON.parse(req.body), signature_base_string: req.signed.baseString });
  return {
    note: 'DRY RUN. Signed with the sample credentials from X\'s "Creating a signature" guide, '
      + `nonce ${DRY_RUN_NONCE}, timestamp ${DRY_RUN_TIMESTAMP}. No environment variable was read and nothing was sent.`,
    chars: charCount(text),
    requests: out,
  };
}

// ---------------------------------------------------------------------------
// Self-test — no network, no credentials
// ---------------------------------------------------------------------------

// A real api-variant post from collector/posts.mjs on 2026-09-28.
export const FIXTURE_API_TEXT = 'SIREN 4, ROUTINE. Composite 39.6 of 100, up 0.4 from the previous reading, '
  + 'as of 02:22 UTC on Mon 28 Sep 2026. Governance is the loudest of the five pillars at 53.2. '
  + 'Arithmetic at messagegabrielhere dash lgtm dot github dot io slash doomcon.';

// Smallest valid PNG: 1x1, one grey pixel. Enough to exercise the upload path.
export const FIXTURE_PNG = Buffer.from(
  '89504e470d0a1a0a0000000d4948445200000001000000010800000000' + '3a7e9b55'
  + '0000000a49444154789c636000000002000148afa471' + '0000000049454e44ae426082', 'hex',
);

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

  for (const v of TEST_VECTORS) {
    await check(`signature matches published vector: ${v.name}`, () => {
      const s = oauthSign({ method: v.method, url: v.url, creds: v.creds, formBody: v.formBody || '', nonce: v.nonce, timestamp: v.timestamp, version: v.version });
      eq(s.signature, v.expect, 'signature');
    });
  }
  await check('base string matches RFC 5849 §3.4.1.1 (repeated name, empty value, "+" as space)', () => {
    const v = RFC_BASE_STRING_VECTOR;
    eq(signatureBaseString(v.method, v.url, v.oauth, v.formBody), v.expect, 'base string');
  });
  await check('percent-encoding follows RFC 3986 unreserved set', () => {
    eq(percentEncode('Ladies + Gentlemen'), 'Ladies%20%2B%20Gentlemen', 'space and plus');
    eq(percentEncode("!*'()"), '%21%2A%27%28%29', 'sub-delims encodeURIComponent leaves alone');
    eq(percentEncode('-._~AZaz09'), '-._~AZaz09', 'unreserved untouched');
    eq(percentEncode('☃'), '%E2%98%83', 'UTF-8 multi-byte, upper-case hex');
    eq(percentEncode('’'), '%E2%80%99', 'curly apostrophe (race posts carry it)');
  });
  await check('a JSON body is not part of the signature (POST /2/tweets)', () => {
    const o = { creds: DRY_RUN_CREDS, nonce: 'n', timestamp: '1' };
    eq(createPostRequest('one', [], o).signed.signature, createPostRequest('two', ['9'], o).signed.signature, 'signature');
  });
  await check('Authorization header carries all seven oauth fields, quoted and encoded', () => {
    const h = createPostRequest(FIXTURE_API_TEXT, [], { creds: DRY_RUN_CREDS, nonce: 'abc', timestamp: '1700000000' }).headers.authorization;
    if (!h.startsWith('OAuth ')) throw new Error('no OAuth scheme');
    for (const k of ['oauth_consumer_key', 'oauth_nonce', 'oauth_signature', 'oauth_signature_method="HMAC-SHA1"', 'oauth_timestamp="1700000000"', 'oauth_token', 'oauth_version="1.0"']) {
      if (!h.includes(k)) throw new Error(`header missing ${k}`);
    }
    if (/oauth_signature="[^"]*[+/=][^"]*"/.test(h)) throw new Error('signature was not percent-encoded inside the header');
  });
  await check('multipart body: boundary absent from payload, both fields present, closed', () => {
    const r = mediaUploadRequest(FIXTURE_PNG, { creds: DRY_RUN_CREDS, nonce: 'n', timestamp: '1' });
    const b = r.body.toString('latin1');
    const boundary = r.describe.multipart_boundary;
    eq(r.headers['content-type'], `multipart/form-data; boundary=${boundary}`, 'content-type');
    if (!b.includes('name="media_category"\r\n\r\ntweet_image\r\n')) throw new Error('media_category field missing');
    if (!b.includes('name="media"; filename="doomcon-card.png"\r\nContent-Type: image/png\r\n\r\n')) throw new Error('media part missing');
    if (!b.endsWith(`\r\n--${boundary}--\r\n`)) throw new Error('not closed');
    if (FIXTURE_PNG.includes(boundary)) throw new Error('boundary occurs in the image');
    eq(Number(r.headers['content-length']), r.body.length, 'content-length');
    eq(Buffer.compare(r.body.subarray(b.indexOf('image/png\r\n\r\n') + 13, b.indexOf('image/png\r\n\r\n') + 13 + FIXTURE_PNG.length), FIXTURE_PNG), 0, 'image bytes intact');
  });
  await check('the image guard rejects non-PNG bytes and anything over 5 MB', () => {
    throws(() => assertPng(Buffer.from('GIF89a......')), /PNG signature/, 'gif');
    throws(() => assertPng(Buffer.concat([FIXTURE_PNG, Buffer.alloc(X_IMAGE_MAX_BYTES)])), /limit/, 'oversize');
    assertPng(FIXTURE_PNG);
  });
  await check('preflightX accepts a real api-variant post', () => {
    preflightX(FIXTURE_API_TEXT);
    eq(findUrlViolation(FIXTURE_API_TEXT), null, 'url');
    eq(findFutureViolation(FIXTURE_API_TEXT), null, 'future');
  });
  await check('preflightX rejects a URL, future tense, a mention, 281 chars, "!" and BREAKING', () => {
    throws(() => preflightX(FIXTURE_API_TEXT.replace('messagegabrielhere dash lgtm dot github dot io slash doomcon', 'https://messagegabrielhere-lgtm.github.io/doomcon')), /URL/, 'url');
    throws(() => preflightX(`${FIXTURE_API_TEXT} It will rise.`), /future tense/, 'future');
    throws(() => preflightX(FIXTURE_API_TEXT.replace('Governance', '@OpenAI Governance')), /mention/, 'mention');
    throws(() => preflightX(`${'x'.repeat(260)} 12:00 UTC ${'y'.repeat(20)}`), /chars, limit 280/, 'length');
    throws(() => preflightX(FIXTURE_API_TEXT.replace('ROUTINE.', 'ROUTINE!')), /exclamation/, 'bang');
    throws(() => preflightX(`BREAKING ${FIXTURE_API_TEXT}`), /BREAKING/, 'breaking');
  });
  await check('readCredentials names what is missing and never echoes a value', () => {
    const r = readCredentials({ X_API_KEY: 'k-SENTINEL', X_API_SECRET: '' });
    eq(r.ok, false, 'ok');
    eq(r.missing.join(','), 'X_API_SECRET,X_ACCESS_TOKEN,X_ACCESS_SECRET', 'missing');
    if (JSON.stringify(r).includes('SENTINEL')) throw new Error('a value leaked into the result');
  });
  await check('a credentials object redacts itself under JSON.stringify and inspect', () => {
    const env = { X_API_KEY: 'k-SENTINEL', X_API_SECRET: 's-SENTINEL', X_ACCESS_TOKEN: 't-SENTINEL', X_ACCESS_SECRET: 'ts-SENTINEL' };
    const r = readCredentials(env);
    eq(r.ok, true, 'ok');
    if (JSON.stringify(r).includes('SENTINEL')) throw new Error('JSON.stringify leaked a credential');
    if (inspect(r, { depth: 5 }).includes('SENTINEL')) throw new Error('inspect leaked a credential');
    eq(r.creds.consumerKey, 'k-SENTINEL', 'value still usable');
  });
  await check('postToX sends media upload then create post, with media_ids, and nothing else', async () => {
    const calls = [];
    const fake = async (req) => {
      calls.push(req);
      if (req.url === X_MEDIA_URL) return { status: 200, text: JSON.stringify({ data: { id: '1880000000000000001', expires_after_secs: 86400 } }) };
      return { status: 201, text: JSON.stringify({ data: { id: '1880000000000000002', text: JSON.parse(req.body).text } }) };
    };
    const { creds } = readCredentials({ X_API_KEY: 'a', X_API_SECRET: 'b', X_ACCESS_TOKEN: 'c', X_ACCESS_SECRET: 'd' });
    const r = await postToX({ text: FIXTURE_API_TEXT, png: FIXTURE_PNG, creds, transport: fake });
    eq(calls.length, 2, 'call count');
    eq(calls[0].url, X_MEDIA_URL, 'first call');
    eq(calls[1].url, X_TWEETS_URL, 'second call');
    const body = JSON.parse(calls[1].body);
    eq(body.text, FIXTURE_API_TEXT, 'text');
    eq(body.media.media_ids[0], '1880000000000000001', 'media id');
    eq(r.outcome, 'posted', 'outcome');
    eq(r.id, '1880000000000000002', 'id');
    for (const c of calls) if (!c.headers.authorization.startsWith('OAuth ')) throw new Error('unsigned request');
  });
  await check('postToX reports X\'s duplicate-content refusal as "duplicate", not a crash', async () => {
    const fake = async (req) => (req.url === X_MEDIA_URL
      ? { status: 200, text: '{"data":{"id":"5"}}' }
      : { status: 403, text: '{"detail":"You are not allowed to create a Tweet with duplicate content.","status":403}' });
    const { creds } = readCredentials({ X_API_KEY: 'a', X_API_SECRET: 'b', X_ACCESS_TOKEN: 'c', X_ACCESS_SECRET: 'd' });
    eq((await postToX({ text: FIXTURE_API_TEXT, png: FIXTURE_PNG, creds, transport: fake })).outcome, 'duplicate', 'outcome');
  });
  await check('postToX refuses to send a failing text before any request', async () => {
    let n = 0;
    const { creds } = readCredentials({ X_API_KEY: 'a', X_API_SECRET: 'b', X_ACCESS_TOKEN: 'c', X_ACCESS_SECRET: 'd' });
    try { await postToX({ text: `${FIXTURE_API_TEXT} Soon.`, png: FIXTURE_PNG, creds, transport: async () => { n++; return { status: 200, text: '{}' }; } }); } catch { /* expected */ }
    eq(n, 0, 'requests sent');
  });
  await check('dryRun reads no environment variable and sends nothing', () => {
    const saved = {};
    for (const k of X_ENV) { saved[k] = process.env[k]; process.env[k] = `ENVSENTINEL-${k}`; }
    const realFetch = globalThis.fetch;
    let fetched = 0;
    globalThis.fetch = async () => { fetched++; throw new Error('network used'); };
    try {
      const out = JSON.stringify(dryRun({ text: FIXTURE_API_TEXT, png: FIXTURE_PNG }));
      if (out.includes('ENVSENTINEL')) throw new Error('dry run printed an environment credential');
      if (!out.includes(DRY_RUN_CREDS.consumerKey)) throw new Error('dry run did not sign with the published sample key');
      eq(fetched, 0, 'fetch calls');
    } finally {
      globalThis.fetch = realFetch;
      for (const k of X_ENV) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
    }
  });
  return results;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

export function printResults(label, results) {
  const failed = results.filter((r) => !r.ok);
  for (const r of results) process.stdout.write(`${r.ok ? 'ok  ' : 'FAIL'}  ${label}  ${r.name}${r.ok ? '' : `\n        ${r.error}`}\n`);
  process.stdout.write(`${label}: ${results.length - failed.length}/${results.length} passed\n`);
  return failed.length === 0;
}

async function main(argv) {
  if (argv.includes('--selftest') || argv.includes('--test')) {
    if (!printResults('post-x', await selfTest())) process.exit(1);
    return;
  }
  if (argv.includes('--dry-run')) {
    const { readFile } = await import('node:fs/promises');
    const textArg = argv.find((a) => a.startsWith('--text='));
    const imageArg = argv.find((a) => a.startsWith('--image='));
    const text = textArg ? textArg.slice(7) : FIXTURE_API_TEXT;
    const png = imageArg ? await readFile(imageArg.slice(8)) : FIXTURE_PNG;
    if (!textArg) process.stderr.write('[post-x] no --text=… given; dry-running a fixture post. For today\'s slate: node collector/post-daily.mjs --dry-run\n');
    process.stdout.write(`${JSON.stringify(dryRun({ text, png }), null, 2)}\n`);
    return;
  }
  process.stderr.write(
    'post-x.mjs does not post on its own. Real posts go through collector/post-daily.mjs, which owns the\n'
    + 'double-post ledger (data/posted.ndjson). Use --selftest or --dry-run [--text=…] [--image=path.png].\n',
  );
  process.exit(2);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2)).catch((err) => {
    process.stderr.write(`post-x.mjs failed: ${err.message}\n`);
    process.exit(1);
  });
}
