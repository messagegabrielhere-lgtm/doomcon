// Press COVERAGE and PROFILES for the leader wire (collector/leaders.mjs).
//
// ---------------------------------------------------------------------------
// COVERAGE IS NOT A STATEMENT, AND THE TWO ARE NEVER MIXED
// ---------------------------------------------------------------------------
//
// The wire's statement rule (leaders.mjs, THE ABSOLUTE RULE) is narrow on
// purpose: a line is a headline from our own corpus that names the person
// beside a speech cue, or an entry on their own / their organisation's
// official feed. Nothing in this file changes that rule or feeds into it.
//
// This file answers a different and simpler question — "how much is the press
// writing ABOUT this person this week?" — from one public, keyless source:
// the Google News RSS search endpoint. A coverage headline is a story that
// mentions the person. It is never counted as the person being on the record,
// never moves `state`, `count`, `lines` or `last_statement`, and is published
// under its own key (`coverage`) with its own wording on the page ("In the
// news"). Headlines are printed as the outlet titled them; the only edit is
// removing the " - Outlet" suffix Google News appends, and only when that
// suffix is exactly the <source> name it carries.
//
// ---------------------------------------------------------------------------
// POLITENESS AND MEMORY
// ---------------------------------------------------------------------------
//
// Each person's search is asked AT MOST once every 15 minutes, failure or
// success, gated on `attempted_at` in data/leaders-coverage.json. That file is
// the memory: every distinct story seen in the last 15 days is kept as a short
// hash and a publication minute, so the 24h / 7d counts and the 14-day daily
// series are counts of DISTINCT stories ever observed, not of one poll. Google
// News returns at most ~100 items per query, so a single poll saturates on a
// busy name; accumulating across polls is what lets the count pass 100, and a
// saturated poll is flagged (`saturated`) so the page can say "at least".
//
// The week-over-week trend is published only once a full previous week has
// actually been observed (`baseline_complete`). Before that the comparison
// would be "this week" against "the days before we started looking", which is
// a zero we did not measure.
//
// PROFILES come from the Wikipedia REST summary endpoint (CC BY-SA, attributed
// on the page with a link), refreshed at most once a day per person and cached
// in data/leaders-profiles.json. No images.
//
// FAILURE: every person is fetched independently, a failure is recorded on
// that person's row as an error string, the previous good data is kept and
// marked stale, and nothing here can fail the run. A person never fetched
// successfully reads `state: "dark"` with null counts — never zeros.

import { createHash } from 'node:crypto';
import { fetchText, fetchJson } from './fetch.mjs';
import { decodeEntities, assertXmlFeed } from './news-sources/_feed.mjs';

export const COVERAGE_SCHEMA = 1;
export const COVERAGE_MIN_INTERVAL_MS = 15 * 60_000;
export const PROFILE_MIN_INTERVAL_MS = 24 * 60 * 60_000;
export const COVERAGE_DAYS = 14;
// Memory keeps one day more than the series shows, so the oldest bucket is
// never cut in half by the retention edge.
const RETAIN_DAYS = COVERAGE_DAYS + 1;
export const HEADLINES_KEPT = 8;
const SEEN_CAP = 4000; // per person, a guard rather than a policy
const GN_SATURATION = 100;
const TIMEOUT_MS = 12_000;
const CONCURRENCY = 4;
const DAY_MS = 86_400_000;
const MIN_MS = 60_000;
const FUTURE_SKEW_MS = DAY_MS;

// ---------------------------------------------------------------------------
// URLs
// ---------------------------------------------------------------------------

/**
 * The Google News RSS search URL for one person. `phrase` is quoted (exact
 * match); `extra` is an unquoted disambiguator, e.g. "Mistral".
 */
export function googleNewsUrl({ phrase, extra = '' }, { days = 7 } = {}) {
  const q = `"${phrase}"${extra ? ` ${extra}` : ''} when:${days}d`;
  return `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
}

export function wikipediaUrl(title) {
  return `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(String(title).replace(/ /g, '_'))}`;
}

// ---------------------------------------------------------------------------
// Google News parser
// ---------------------------------------------------------------------------

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}(\\s[^>]*)?>([\\s\\S]*?)</${name}\\s*>`, 'i'));
  if (!m) return null;
  const inner = m[2].replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1');
  return { attrs: m[1] || '', text: decodeEntities(inner).replace(/\s+/g, ' ').trim() };
}

function attr(attrs, name) {
  const m = attrs.match(new RegExp(`\\s${name}\\s*=\\s*"([^"]*)"`, 'i')) || attrs.match(new RegExp(`\\s${name}\\s*=\\s*'([^']*)'`, 'i'));
  return m ? decodeEntities(m[1]).trim() : null;
}

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return null; }
}

/** Lowercased, punctuation-folded title: the dedupe key for one outlet's story. */
function titleKey(title) {
  return String(title).toLowerCase().replace(/[‘’'"“”]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function storyKey(item) {
  return createHash('sha1').update(`${titleKey(item.title)}|${String(item.outlet || '').toLowerCase()}`).digest('hex').slice(0, 10);
}

/**
 * Items of one Google News RSS response:
 *   { title, outlet, outlet_url, url, published_at }
 * Deduplicated by URL and by (title, outlet). Items with no usable title,
 * link or date are dropped, not guessed.
 */
export function parseGoogleNews(xml, { limit = 200 } = {}) {
  const out = [];
  const seenUrl = new Set();
  const seenKey = new Set();
  for (const m of String(xml).matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item\s*>/gi)) {
    if (out.length >= limit) break;
    const block = m[1];
    const t = tag(block, 'title');
    const l = tag(block, 'link');
    const d = tag(block, 'pubDate');
    const s = tag(block, 'source');
    if (!t || !t.text || !l || !/^https?:\/\//i.test(l.text)) continue;
    const ms = d ? Date.parse(d.text) : NaN;
    if (!Number.isFinite(ms)) continue;
    const outlet = s && s.text ? s.text : null;
    const outletUrl = s ? attr(s.attrs, 'url') : null;
    let title = t.text;
    // Google News appends " - Outlet" to every title. Remove it only when it is
    // exactly the outlet named in <source>, so a headline that genuinely ends in
    // a dash clause is never cut.
    if (outlet && title.endsWith(` - ${outlet}`) && title.length > outlet.length + 3) {
      title = title.slice(0, -(outlet.length + 3)).trimEnd();
    }
    const item = {
      title,
      outlet: outlet || hostOf(outletUrl) || null,
      outlet_url: outletUrl,
      url: l.text,
      published_at: new Date(ms).toISOString(),
    };
    const k = storyKey(item);
    if (seenUrl.has(item.url) || seenKey.has(k)) continue;
    seenUrl.add(item.url);
    seenKey.add(k);
    out.push(item);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Memory and counting
// ---------------------------------------------------------------------------

const utcDay = (ms) => new Date(ms).toISOString().slice(0, 10);
const dayStart = (ms) => Date.parse(`${utcDay(ms)}T00:00:00.000Z`);

/**
 * Fold one successful poll into a person's memory. PURE.
 *
 * prev  the person's previous entry in data/leaders-coverage.json, or null
 * items parseGoogleNews() output from this poll
 * Returns the new memory entry (without attempt/error bookkeeping).
 */
export function mergeCoverage(prev, items, nowMs) {
  const retainFrom = dayStart(nowMs) - (RETAIN_DAYS - 1) * DAY_MS;
  const seen = new Map();
  for (const pair of (prev && Array.isArray(prev.seen) ? prev.seen : [])) {
    if (!Array.isArray(pair) || typeof pair[0] !== 'string' || !Number.isFinite(pair[1])) continue;
    if (pair[1] * MIN_MS < retainFrom) continue;
    seen.set(pair[0], pair[1]);
  }
  const fresh = [];
  for (const it of items) {
    const ms = Date.parse(it.published_at);
    if (!Number.isFinite(ms) || ms > nowMs + FUTURE_SKEW_MS || ms < retainFrom) continue;
    const k = storyKey(it);
    if (!seen.has(k)) seen.set(k, Math.floor(ms / MIN_MS));
    fresh.push(it);
  }
  const seenOut = [...seen.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, SEEN_CAP);

  // Headlines: newest first across this poll and the remembered ones, deduped.
  const pool = [...fresh, ...(prev && Array.isArray(prev.headlines) ? prev.headlines : [])];
  const byKey = new Map();
  for (const h of pool) {
    if (!h || typeof h.title !== 'string' || typeof h.url !== 'string') continue;
    const ms = Date.parse(h.published_at);
    if (!Number.isFinite(ms) || ms < nowMs - 7 * DAY_MS || ms > nowMs + FUTURE_SKEW_MS) continue;
    const k = storyKey(h);
    if (!byKey.has(k)) byKey.set(k, { title: h.title, outlet: h.outlet ?? null, url: h.url, published_at: h.published_at });
  }
  const headlines = [...byKey.values()]
    .sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at) || a.url.localeCompare(b.url))
    .slice(0, HEADLINES_KEPT);

  const prevSince = prev && Number.isFinite(Date.parse(prev.tracking_since)) ? Date.parse(prev.tracking_since) : null;
  // The first poll looks back seven days (when:7d), so tracking effectively
  // begins a week before it.
  const firstCovered = nowMs - 7 * DAY_MS;
  const since = prevSince === null ? firstCovered : Math.min(prevSince, firstCovered);
  return {
    tracking_since: new Date(since).toISOString(),
    saturated: items.length >= GN_SATURATION,
    last_poll_items: items.length,
    seen: seenOut,
    headlines,
  };
}

/**
 * Counts, the 14-day series and the trend from a memory entry. PURE.
 *
 *   count_24h      distinct stories published in the 24h before `nowMs`
 *   count_7d       ... in the 7 days before `nowMs`
 *   count_prev_7d  ... in the 7 days before that, or null without a baseline
 *   daily          14 UTC days, oldest first, { day, n }; the last is today
 *                  so far. Days before tracking began carry n: null.
 *   trend          { dir: up|down|flat|null, delta, pct, baseline_complete }
 */
export function coverageStats(mem, nowMs) {
  const seenMs = (mem && Array.isArray(mem.seen) ? mem.seen : [])
    .map((p) => (Array.isArray(p) && Number.isFinite(p[1]) ? p[1] * MIN_MS : null))
    .filter((ms) => ms !== null && ms <= nowMs + FUTURE_SKEW_MS);
  const since = mem && Number.isFinite(Date.parse(mem.tracking_since)) ? Date.parse(mem.tracking_since) : nowMs;

  const inRange = (from, to) => seenMs.filter((ms) => ms > from && ms <= to).length;
  const count24 = inRange(nowMs - DAY_MS, nowMs + FUTURE_SKEW_MS);
  const count7 = inRange(nowMs - 7 * DAY_MS, nowMs + FUTURE_SKEW_MS);
  const baselineComplete = since <= nowMs - 14 * DAY_MS + MIN_MS;
  const prev7 = baselineComplete ? inRange(nowMs - 14 * DAY_MS, nowMs - 7 * DAY_MS) : null;

  const today = dayStart(nowMs);
  const daily = [];
  for (let i = COVERAGE_DAYS - 1; i >= 0; i -= 1) {
    const start = today - i * DAY_MS;
    const end = start + DAY_MS;
    const covered = end > since; // any part of the day was observed
    daily.push({
      day: utcDay(start),
      n: covered ? seenMs.filter((ms) => ms >= start && ms < end).length : null,
    });
  }

  return { count_24h: count24, count_7d: count7, count_prev_7d: prev7, daily, trend: trendOf(count7, prev7) };
}

/**
 * Week over week. `flat` inside ±10% (or ±2 stories, whichever is larger), so
 * a single extra story on a quiet name is not drawn as a surge.
 */
export function trendOf(cur, prev) {
  if (!Number.isFinite(cur) || !Number.isFinite(prev)) {
    return { dir: null, delta: null, pct: null, baseline_complete: false };
  }
  const delta = cur - prev;
  const pct = prev > 0 ? Math.round((delta / prev) * 100) : null;
  const band = Math.max(2, prev * 0.1);
  const dir = Math.abs(delta) <= band ? 'flat' : delta > 0 ? 'up' : 'down';
  return { dir, delta, pct, baseline_complete: true };
}

/** The published per-person `coverage` object, from memory + this run's status. */
export function coverageView(spec, mem, nowMs, { checked = true } = {}) {
  const url = googleNewsUrl(spec);
  const base = {
    source: 'Google News search (RSS)',
    query: `"${spec.phrase}"${spec.extra ? ` ${spec.extra}` : ''}`,
    url,
    attempted_at: mem ? mem.attempted_at ?? null : null,
    fetched_at: mem ? mem.fetched_at ?? null : null,
    error: mem ? mem.error ?? null : (checked ? null : 'not checked this run'),
  };
  if (!mem || !mem.fetched_at) {
    return {
      ...base,
      state: checked && mem && mem.attempted_at ? 'dark' : 'not_checked',
      headlines: [], count_24h: null, count_7d: null, count_prev_7d: null,
      daily: [], trend: trendOf(null, null), saturated: false, tracking_since: null,
    };
  }
  const stats = coverageStats(mem, nowMs);
  // Stale: this run's attempt failed, or the last good poll is over two hours
  // old (the hourly pass alone would have refreshed it twice by then).
  const stale = Boolean(mem.error) || nowMs - Date.parse(mem.fetched_at) > 2 * 60 * MIN_MS;
  return {
    ...base,
    state: stale ? 'stale' : 'ok',
    headlines: (mem.headlines || []).slice(0, HEADLINES_KEPT),
    ...stats,
    saturated: Boolean(mem.saturated),
    tracking_since: mem.tracking_since ?? null,
  };
}

// ---------------------------------------------------------------------------
// Network (injectable)
// ---------------------------------------------------------------------------

async function pool(list, worker) {
  const queue = [...list];
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    while (queue.length) await worker(queue.shift());
  }));
}

/**
 * Refresh coverage memory for every person whose last ATTEMPT is older than
 * COVERAGE_MIN_INTERVAL_MS (or all of them with `force`). NEVER throws.
 *
 * specs  [{ id, phrase, extra }]
 * cache  parsed data/leaders-coverage.json, or null
 * Returns { cache, polled: [ids], skipped: [ids] }.
 */
export async function refreshCoverage(specs, cache, { fetcher = fetchText, now = () => new Date(), force = false } = {}) {
  const prev = cache && cache.leaders && typeof cache.leaders === 'object' ? cache.leaders : {};
  const next = {};
  const polled = [];
  const skipped = [];
  const due = [];
  const nowMs0 = now().getTime();
  for (const spec of specs) {
    const p = prev[spec.id] || null;
    // A changed query is a different search: its memory does not carry over.
    const sameQuery = p && p.phrase === spec.phrase && (p.extra || '') === (spec.extra || '');
    const mem = sameQuery ? p : null;
    next[spec.id] = mem;
    const last = mem && Date.parse(mem.attempted_at);
    if (!force && Number.isFinite(last) && nowMs0 - last < COVERAGE_MIN_INTERVAL_MS) skipped.push(spec.id);
    else due.push(spec);
  }

  await pool(due, async (spec) => {
    const attemptedAt = now();
    const nowMs = attemptedAt.getTime();
    const mem = next[spec.id];
    try {
      const { data, headers } = await fetcher(googleNewsUrl(spec), { withMeta: true, retries: 0, timeoutMs: TIMEOUT_MS });
      assertXmlFeed(data, 'news.google.com', (headers && headers['content-type']) || '');
      const items = parseGoogleNews(data);
      next[spec.id] = {
        phrase: spec.phrase, extra: spec.extra || '',
        ...mergeCoverage(mem, items, nowMs),
        attempted_at: attemptedAt.toISOString(),
        fetched_at: attemptedAt.toISOString(),
        error: null,
      };
    } catch (err) {
      const msg = (err && err.message ? err.message : String(err)).replace(/\s+/g, ' ').slice(0, 200);
      next[spec.id] = {
        ...(mem || { phrase: spec.phrase, extra: spec.extra || '', seen: [], headlines: [], tracking_since: null, fetched_at: null }),
        phrase: spec.phrase, extra: spec.extra || '',
        attempted_at: attemptedAt.toISOString(),
        error: msg,
      };
    }
    polled.push(spec.id);
  });

  const leaders = {};
  for (const spec of specs) if (next[spec.id]) leaders[spec.id] = next[spec.id];
  return {
    cache: { schema: COVERAGE_SCHEMA, updated_at: now().toISOString(), min_interval_ms: COVERAGE_MIN_INTERVAL_MS, leaders },
    polled: polled.sort(),
    skipped,
  };
}

// ---------------------------------------------------------------------------
// Profiles (Wikipedia REST summary)
// ---------------------------------------------------------------------------

/**
 * The first one or two sentences of a Wikipedia extract. Splits only after a
 * lowercase letter, digit or closing bracket, so "U.S." and an initial like
 * "J." do not end a sentence. Never adds an ellipsis; returns whole sentences.
 */
export function firstSentences(text, max = 2) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  // A period ends a sentence when the next word starts with a capital (or an
  // opening quote/bracket) AND the word before it is not a lone initial
  // ("H.") or a known abbreviation ("Dr.", "U.S.").
  const ABBR = new Set(['mr', 'mrs', 'ms', 'dr', 'st', 'jr', 'sr', 'prof', 'sir', 'inc', 'co', 'corp', 'ltd', 'vs', 'no', 'u.s', 'u.k', 'e.g', 'i.e']);
  const parts = [];
  let start = 0;
  const re = /([.!?])\s+(?=[\p{Lu}"“(])/gu;
  let m;
  while ((m = re.exec(t)) !== null) {
    const before = t.slice(start, m.index);
    const word = (before.match(/(\S+)$/) || ['', ''])[1].replace(/^[("“]+/, '');
    const lw = word.toLowerCase();
    if (m[1] === '.' && (/^\p{Lu}$/u.test(word) || ABBR.has(lw) || /^(\p{L}\.)+\p{L}$/u.test(word))) continue;
    parts.push(t.slice(start, m.index + 1));
    start = m.index + m[0].length;
  }
  parts.push(t.slice(start));
  // A first sentence alone that is already long enough is the summary.
  if (max > 1 && parts[0].length >= 220) return parts[0];
  return parts.slice(0, max).join(' ');
}

/** Validate one REST summary payload into the published profile shape. */
export function profileFrom(json, title) {
  if (!json || typeof json !== 'object') throw new Error('summary was not an object');
  if (json.type === 'disambiguation') throw new Error('title resolves to a disambiguation page');
  const extract = firstSentences(json.extract);
  if (!extract) throw new Error('summary carried no extract');
  const url = json.content_urls && json.content_urls.desktop && json.content_urls.desktop.page;
  return {
    title: json.title || title,
    description: typeof json.description === 'string' ? json.description : null,
    extract,
    url: typeof url === 'string' && /^https:\/\/en\.wikipedia\.org\//.test(url)
      ? url
      : `https://en.wikipedia.org/wiki/${encodeURIComponent(String(title).replace(/ /g, '_'))}`,
    license: 'CC BY-SA 4.0',
  };
}

/**
 * Refresh profiles older than a day. NEVER throws. Keeps the last good profile
 * through a failure (with the error recorded beside it).
 * specs [{ id, title }]
 */
export async function refreshProfiles(specs, cache, { fetcher = fetchJson, now = () => new Date(), force = false } = {}) {
  const prev = cache && cache.leaders && typeof cache.leaders === 'object' ? cache.leaders : {};
  const next = {};
  const due = [];
  const nowMs = now().getTime();
  for (const spec of specs) {
    const p = prev[spec.id] && prev[spec.id].title_requested === spec.title ? prev[spec.id] : null;
    next[spec.id] = p;
    const last = p && Date.parse(p.attempted_at);
    if (force || !Number.isFinite(last) || nowMs - last >= PROFILE_MIN_INTERVAL_MS) due.push(spec);
  }
  await pool(due, async (spec) => {
    const at = now().toISOString();
    const p = next[spec.id];
    try {
      const json = await fetcher(wikipediaUrl(spec.title), { retries: 0, timeoutMs: TIMEOUT_MS });
      next[spec.id] = { title_requested: spec.title, ...profileFrom(json, spec.title), attempted_at: at, fetched_at: at, error: null };
    } catch (err) {
      const msg = (err && err.message ? err.message : String(err)).replace(/\s+/g, ' ').slice(0, 200);
      next[spec.id] = { ...(p || { title_requested: spec.title, fetched_at: null }), attempted_at: at, error: msg };
    }
  });
  const leaders = {};
  for (const spec of specs) if (next[spec.id]) leaders[spec.id] = next[spec.id];
  return { schema: 1, updated_at: now().toISOString(), min_interval_ms: PROFILE_MIN_INTERVAL_MS, leaders };
}

/** The published per-person `profile` object. */
export function profileView(spec, p) {
  if (!p || !p.extract) {
    return {
      source: 'Wikipedia', title: spec.title, state: p && p.attempted_at ? 'dark' : 'not_checked',
      description: null, extract: null, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(spec.title.replace(/ /g, '_'))}`,
      license: 'CC BY-SA 4.0', fetched_at: null, error: p ? p.error ?? null : 'not checked this run',
    };
  }
  return {
    source: 'Wikipedia', title: p.title, state: p.error ? 'stale' : 'ok',
    description: p.description, extract: p.extract, url: p.url, license: p.license || 'CC BY-SA 4.0',
    fetched_at: p.fetched_at, error: p.error ?? null,
  };
}

// ---------------------------------------------------------------------------
// Adopting another lane's memory
// ---------------------------------------------------------------------------

const msOf = (v) => { const ms = Date.parse(v); return Number.isFinite(ms) ? ms : -Infinity; };

/**
 * Merge two copies of data/leaders-coverage.json, per person. PURE.
 *
 * The fast newsroom loop keeps its own working copy for up to fifty minutes
 * while the 15-minute lane commits a fresher one to main. Folding main's copy
 * in every tick is what makes the 15-minute gate hold ACROSS lanes: if the
 * other lane asked Google five minutes ago, the merged `attempted_at` says so
 * and this lane skips. Stories seen by either copy are kept (union of `seen`),
 * so neither lane's polls are lost.
 */
export function adoptCoverage(local, remote) {
  const a = local && local.leaders ? local.leaders : {};
  const b = remote && remote.leaders ? remote.leaders : {};
  if (!remote || !remote.leaders) return local;
  if (!local || !local.leaders) return remote;
  const leaders = {};
  for (const id of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
    const x = a[id]; const y = b[id];
    if (!x || !y) { leaders[id] = x || y; continue; }
    if (x.phrase !== y.phrase || (x.extra || '') !== (y.extra || '')) {
      leaders[id] = msOf(x.attempted_at) >= msOf(y.attempted_at) ? x : y;
      continue;
    }
    const newer = msOf(x.attempted_at) >= msOf(y.attempted_at) ? x : y;
    const seen = new Map();
    for (const p of [...(x.seen || []), ...(y.seen || [])]) {
      if (!Array.isArray(p) || typeof p[0] !== 'string' || !Number.isFinite(p[1])) continue;
      if (!seen.has(p[0]) || p[1] < seen.get(p[0])) seen.set(p[0], p[1]);
    }
    const heads = new Map();
    for (const h of [...(x.headlines || []), ...(y.headlines || [])]) {
      if (h && typeof h.url === 'string' && !heads.has(storyKey(h))) heads.set(storyKey(h), h);
    }
    const fetched = [x.fetched_at, y.fetched_at].filter((v) => Number.isFinite(Date.parse(v))).sort().pop() || null;
    const since = [x.tracking_since, y.tracking_since].filter((v) => Number.isFinite(Date.parse(v))).sort()[0] || null;
    leaders[id] = {
      ...newer,
      tracking_since: since,
      fetched_at: fetched,
      seen: [...seen.entries()].sort((p, q) => q[1] - p[1] || p[0].localeCompare(q[0])).slice(0, SEEN_CAP),
      headlines: [...heads.values()]
        .sort((p, q) => msOf(q.published_at) - msOf(p.published_at) || String(p.url).localeCompare(String(q.url)))
        .slice(0, HEADLINES_KEPT),
    };
  }
  const updated = [local.updated_at, remote.updated_at].filter((v) => Number.isFinite(Date.parse(v))).sort().pop() || null;
  return { ...local, updated_at: updated, leaders };
}

/** Profiles: per person, the copy with the later attempt wins. PURE. */
export function adoptProfiles(local, remote) {
  if (!remote || !remote.leaders) return local;
  if (!local || !local.leaders) return remote;
  const leaders = { ...local.leaders };
  for (const [id, p] of Object.entries(remote.leaders)) {
    const mine = leaders[id];
    if (!mine || msOf(p.attempted_at) > msOf(mine.attempted_at)) leaders[id] = p;
  }
  return { ...local, leaders };
}
