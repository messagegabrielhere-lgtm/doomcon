// Post text generation. Pure: state in, an ordered slate of posts out.
//
// There is no X API in v1. The operator pastes these by hand from his own
// account. That means the safety rails cannot be "the author remembers" — every
// rule below is enforced by a function that THROWS, and selfTest() proves each
// rejection actually fires. Run it: node collector/posts.mjs --test
//
// Two rules pay for themselves immediately:
//   1. No URL in the text of the API variant. X charges roughly 13x reach for
//      an outbound link ($0.200 vs $0.015 in the leaked ad-equivalent numbers).
//      The domain goes in the card image and is SPELLED in the text. Techmeme
//      has done exactly this for years. The surcharge does NOT apply to posting
//      by hand, which is how v1 ships — hence the second variant, below.
//   2. No future tense. This index measures observable tempo, never probability
//      of harm. The WHO Phase-6 collapse is the cautionary tale: a
//      spread-measuring scale read by the public as a severity forecast.

import {
  DEFAULT_BRAND, LEVELS, PILLAR_ORDER, spokenDomain, assertState, pillarsInOrder,
  darkPillars, isDegraded, resolveDelta, previousObservation, round1, fmt1, utcClock,
  isUnavailable, histTime, normaliseNews, topNewsItem, stripUrls, clampWords, sourceHealth,
} from './card.mjs';

export const X_CHAR_LIMIT = 280;

// Tunables, named so a future argument is about a number and not about code.
export const SLATE_SPACING_MS = 3 * 60 * 60 * 1000;   // gap between posts in one slate
export const FEED_LIFETIME_MS = 48 * 60 * 60 * 1000;  // For You expiry
export const CHANGE_WINDOW_MS = 90 * 60 * 1000;       // a level change is "news" this long
export const PILLAR_SPIKE_SCORE = 70;
export const PILLAR_SPIKE_PCTL = 0.90;
export const MIN_HISTORY_FOR_RECORD = 30;             // below this, "record" means nothing

// The news layer. An item carried by one outlet is that outlet's claim; an item
// two independent outlets both carried is a fact about the world, and that
// distinction is the whole value of the corroboration post.
//
// TWO, not three, and the reason is measured rather than chosen: on the live
// run of 2026-09-23 the maximum corroboration across 200 items was 2. Setting
// the bar at three would have meant a template that can never fire, which is
// worse than no template. docs/NEWS.md makes the same argument from the other
// end — with one source, "two independent outlets reported this" is not a
// computable quantity at all.
export const MIN_CORROBORATION = 2;
// Above this spread the copy switches from "within N minutes" (simultaneity)
// to "N hours apart" (lead time). Calling a 676-minute spread "within 676
// minutes" is true and useless.
export const CORROBORATION_TIGHT_MINUTES = 90;
export const NEWS_MAX_AGE_HOURS = 36;
// How many candidates we are willing to walk past before giving up. An item
// whose headline trips a guard is SKIPPED, never rewritten to get it through.
export const NEWS_CANDIDATES = 6;

// A prediction market that moved less than this in 24h is noise. Four points is
// roughly the width of the bid/ask on a thinly traded AI contract, and well
// above the venue-wide means the adapters record (Polymarket 3.1 points,
// Kalshi 1.8).
export const MARKET_MOVE_MIN_POINTS = 4;
export const MARKET_CANDIDATES = 6;

// Three venues, three currencies, and they must never be added together or
// printed with the wrong symbol. Used only when a row omits volume_unit.
export const VENUE_VOLUME_UNITS = Object.freeze({
  polymarket: 'usd',
  kalshi: 'contracts',
  manifold: 'mana',
});

export const PILLAR_PROSE = Object.freeze({
  capability: 'Capability',
  compute: 'Compute and capital',
  attention: 'Attention',
  governance: 'Governance',
  markets: 'Markets',
});

// --- the build (datacentres x drought) -------------------------------------
//
// The US Drought Monitor publishes, per county, the SHARE OF THAT COUNTY'S AREA
// in each category. Whether the API returns those shares cumulatively (D1 means
// "D1 or worse") or categorically (D1 means "exactly D1") is a `statisticsType`
// argument in collector/dc-sources/resources.mjs, and it has changed upstream
// before. So the test is "any of these keys is above zero", which is TRUE under
// both encodings — summing them would be wrong under one of them.
//
// If the design agent's drought card and this post ever disagree by a few
// hundred sites, it is because one of them counted D0. D0 is "abnormally dry",
// which is not drought; the line starts at D1 and the copy says D1 out loud.
export const DROUGHT_ANY_KEYS = Object.freeze(['d1', 'd2', 'd3', 'd4']);
export const DROUGHT_SEVERE_KEYS = Object.freeze(['d2', 'd3', 'd4']);
export const DROUGHT_CATEGORY_ORDER = Object.freeze(['d4', 'd3', 'd2', 'd1', 'd0']);

// --- the race (labs on live prediction-market odds) ------------------------
export const RACE_BOARD_MAX = 4;          // named on the leaderboard line
export const RACE_MIN_LIVE_LEGS = 3;      // below this it is not a leaderboard

// --- developing (a news cluster carrying incident language) ----------------
export const DEVELOPING_MIN_SOURCES = 2;
export const DEVELOPING_TERMS_MAX = 3;
export const DEVELOPING_CANDIDATES = 6;

// ---------------------------------------------------------------------------
// Pre-flight rule 1: no URL, in any form
// ---------------------------------------------------------------------------

// A deliberately broad TLD list. False positives are cheap — the generator
// throws, a human rewrites one line. A false negative costs 13x reach on a post
// that is already published.
//
// TRAP, and it has bitten: ".ai" is in this list, so the literal string "cs.AI"
// is rejected. Write arXiv categories without the dot ("arXiv AI categories").
// That is the correct trade; nobody reading a post needs the category slug.
export const URL_TLDS = [
  'com', 'net', 'org', 'io', 'ai', 'watch', 'co', 'xyz', 'app', 'dev', 'me', 'tv', 'us',
  'uk', 'eu', 'news', 'so', 'sh', 'to', 'ly', 'gg', 'fm', 'cc', 'gov', 'edu', 'info',
  'site', 'online', 'link', 'press', 'blog', 'page', 'wiki', 'tech', 'cloud', 'live',
  'media', 'social', 'club', 'space', 'fyi', 'lol', 'zip', 'mov', 'ru', 'de', 'fr', 'jp',
  'cn', 'in', 'au', 'ca', 'nl', 'it', 'es', 'se', 'no', 'fi', 'dk', 'pl', 'br', 'mx',
  'za', 'kr', 'ch', 'at', 'be', 'pt', 'gr', 'cz', 'il', 'ie', 'nz', 'sg', 'hk', 'tw',
  'tr', 'ua', 'ar', 'cl', 'ph', 'th', 'vn', 'id', 'my',
];

const URL_RULES = [
  { why: 'a URL scheme', re: /\b[a-z][a-z0-9+.-]*:\/\//i },
  { why: 'a "www." host', re: /(^|[^a-z0-9])www\./i },
  { why: 'a bare domain', re: new RegExp(`\\b[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.(?:${URL_TLDS.join('|')})\\b`, 'i') },
  { why: 'an @-handle that reads as a mailbox', re: /\b[a-z0-9._%+-]+@[a-z0-9.-]+\b/i },
];

export function findUrlViolation(textValue) {
  for (const rule of URL_RULES) {
    const m = rule.re.exec(String(textValue));
    if (m) return { why: rule.why, match: m[0], index: m.index };
  }
  return null;
}

export function assertNoUrl(textValue) {
  const v = findUrlViolation(textValue);
  if (v) {
    throw new Error(
      `POST REJECTED: contains ${v.why} ("${v.match}" at index ${v.index}). ` +
      `No post may carry a URL. Spell the domain instead, e.g. "doomcon dot watch".`,
    );
  }
  return textValue;
}

// ---------------------------------------------------------------------------
// Rule 1b: the two variants, and the address that actually resolves
// ---------------------------------------------------------------------------
//
// THE DEFECT THIS SECTION FIXES. Every post used to end "Arithmetic at doomcon
// dot watch", spelled from brand.domain — a domain this project DOES NOT OWN.
// A reader who typed it landed nowhere, and a dead address at the end of every
// post costs more credibility than the link surcharge ever saved. The address
// now comes from brand.canonicalUrl, which is where the site is actually
// served from, so the spelled form and the clickable form are derived from the
// same constant and cannot drift apart. Registering doomcon.watch stays the
// one-line change CONTRACT.md promises: change CANONICAL_URL, and both the
// spelled tail and the link follow it the same minute.
//
// Two variants, same body, different last sentence:
//
//   api     Link-free. The address is SPELLED. X charges $0.200 for a post
//           carrying a link against $0.015 without one, a 13.3x surcharge, so
//           the paid API path can never carry a link. assertNoUrl() still runs
//           over this variant and still throws.
//   manual  The real, clickable URL. v1 is posted BY HAND from the operator's
//           own account, where the surcharge does not exist. A hand-posted link
//           is free reach; a spelled domain there is friction for nothing.
//
// The BODY of both variants is byte-identical. It is assembled once, against
// whichever tail is longer, so the two can never select a different headline or
// clamp a market name to a different length — a bug that would be invisible
// until the day someone compared two screenshots. Only the final sentence
// differs, and post() asserts that before it swaps it.
export const POST_VARIANTS = Object.freeze(['api', 'manual']);

// "https://doomcon.watch"          -> "doomcon dot watch"
// "https://x-y.github.io/doomcon"  -> "x dash y dot github dot io slash doomcon"
//
// Hyphens and slashes are spoken, not dropped. The spelled address exists so a
// reader can TYPE it; an unspoken hyphen produces a different host, and a
// silent one is worse than a long one.
export function spokenUrl(url) {
  let u;
  try { u = new URL(String(url)); } catch { return null; }
  const say = (s) => s.replace(/\./g, ' dot ').replace(/-/g, ' dash ').replace(/_/g, ' underscore ');
  const parts = [say(u.host.replace(/^www\./i, ''))];
  for (const seg of u.pathname.split('/')) if (seg) parts.push('slash', say(seg));
  const spoken = parts.join(' ').replace(/\s+/g, ' ').trim();
  return spoken.length > 0 ? spoken : null;
}

// Origin plus path, no trailing slash, no query, no fragment. A trailing slash
// is one more character of an already long link and changes nothing.
export function canonicalLink(brand) {
  try {
    const u = new URL(String(brand?.canonicalUrl));
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    return `${u.origin}${u.pathname.replace(/\/+$/, '')}`;
  } catch { return null; }
}

export function attributionTails(brand) {
  const link = canonicalLink(brand);
  // Fallback only if brand.canonicalUrl is missing or unparsable. It keeps the
  // generator alive against a half-written brand module; it is not a path we
  // expect to take, and the CLI says so when it does.
  const spoken = link === null ? spokenDomain(brand.domain) : spokenUrl(link);
  return {
    link,
    spoken,
    api: `Arithmetic at ${spoken}.`,
    // No full stop after the URL. Some clients swallow a trailing dot into the
    // link and some leave it outside; a 404 from a stray "." is precisely the
    // failure this section exists to remove.
    manual: link === null ? `Arithmetic at ${spoken}.` : `Arithmetic at ${link}`,
  };
}

// The manual variant's URL rule. Not "no URLs" — exactly ONE, and it is ours.
// Headlines and market questions arrive stripped of links by safeExternalText,
// so this proves that stayed true rather than assuming it.
export function assertOnlyCanonicalUrl(textValue, link) {
  const s = String(textValue);
  if (typeof link !== 'string' || link.length === 0) return assertNoUrl(s);
  if (!s.includes(link)) {
    throw new Error(
      `POST REJECTED: the manual variant does not carry the canonical link (${link}). ` +
      'The manual variant exists to be clickable; without the link it is just a worse api variant.',
    );
  }
  const rest = s.split(link).join(' ');
  const v = findUrlViolation(rest);
  if (v) {
    throw new Error(
      `POST REJECTED: the manual variant carries ${v.why} ("${v.match}") that is not the ` +
      'canonical link. One link, ours, or none.',
    );
  }
  return s;
}

export function preflightManual(textValue, link, limit = X_CHAR_LIMIT) {
  if (typeof textValue !== 'string' || textValue.trim().length === 0) {
    throw new Error('POST REJECTED: empty text');
  }
  assertOnlyCanonicalUrl(textValue, link);
  assertNoFutureTense(textValue);
  assertHasUtcStamp(textValue);
  const n = charCount(textValue);
  if (n > limit) throw new Error(`POST REJECTED: ${n} chars, limit ${limit}`);
  return textValue;
}

// ---------------------------------------------------------------------------
// Three phrasings, chosen by the calendar
// ---------------------------------------------------------------------------
//
// An account that posts the same sentence with a different number every day
// reads as a bot, and a bot does not get quote-tweeted. Every template that
// fires daily carries three phrasings. Index 0 is the PREFERRED one and the
// cycle below spends half its days there; the other two exist so the reader
// notices the number rather than the format.
//
// Deterministic by construction — CONTRACT.md forbids Math.random and forbids
// unseeded time. The choice is a pure function of the UTC day in
// state.generated_at plus a per-template offset, so re-running a snapshot
// reproduces the same post, and two templates in one slate do not switch
// phrasing on the same morning.
export const PHRASING_CYCLE = Object.freeze([0, 1, 0, 2]);

export function phrasingIndex(kind, iso, count) {
  if (!Number.isFinite(count) || count <= 1) return 0;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return 0;
  const day = Math.floor(t / 86400000);
  let h = 0;
  for (const ch of String(kind)) h = (h * 31 + ch.charCodeAt(0)) % 100003;
  const cycle = PHRASING_CYCLE.filter((i) => i < count);
  if (cycle.length === 0) return 0;
  return cycle[(((day + h) % cycle.length) + cycle.length) % cycle.length];
}

// ---------------------------------------------------------------------------
// Pre-flight rule 2: no future tense
// ---------------------------------------------------------------------------

// CONTRACT.md lists these nine verbatim. This list is mandatory and must not
// shrink.
export const BANNED_FUTURE_WORDS = Object.freeze([
  'will', 'expect', 'predict', 'imminent', 'soon', 'coming', 'warns', 'forecast', 'likely',
]);

// Inflections and structural future markers the contract's nine obviously mean
// to catch. Extended deliberately, because "predicts" is no less a forecast than
// "predict".
//
// NOTE the omission: "prediction" / "predictions" are NOT banned. The markets
// pillar is literally built on prediction markets, and a noun naming a market
// type is not a claim about the future. Banning it would make the markets pillar
// unwritable. The verb forms stay banned.
export const BANNED_FUTURE_EXTENDED = Object.freeze([
  'expects', 'expected', 'expecting',
  'predicts', 'predicted', 'predicting',
  'forecasts', 'forecasted', 'forecasting',
  'warn', 'warned', 'warning', 'warnings',
  'unlikely', 'upcoming', 'shortly', 'impending', 'looming', 'anticipate', 'anticipates',
  'anticipated', 'poised', 'brace', 'bracing',
]);

export const BANNED_FUTURE_PHRASES = Object.freeze([
  'about to', 'going to', 'set to', 'on track to', 'any day now', 'in the coming',
]);

export function findFutureViolation(textValue) {
  const s = String(textValue);
  for (const w of [...BANNED_FUTURE_WORDS, ...BANNED_FUTURE_EXTENDED]) {
    const m = new RegExp(`\\b${w}\\b`, 'i').exec(s);
    if (m) return { kind: 'word', match: m[0], index: m.index };
  }
  // "we'll", "it'll" — a contraction is still "will".
  const contraction = /\b[a-z]+'ll\b/i.exec(s);
  if (contraction) return { kind: 'contraction', match: contraction[0], index: contraction.index };
  for (const p of BANNED_FUTURE_PHRASES) {
    const m = new RegExp(`\\b${p.replace(/ /g, '\\s+')}\\b`, 'i').exec(s);
    if (m) return { kind: 'phrase', match: m[0], index: m.index };
  }
  return null;
}

export function assertNoFutureTense(textValue) {
  const v = findFutureViolation(textValue);
  if (v) {
    throw new Error(
      `POST REJECTED: future tense ("${v.match}" at index ${v.index}). ` +
      `This index reports observed tempo, never a claim about what happens next.`,
    );
  }
  return textValue;
}

// ---------------------------------------------------------------------------
// Pre-flight rule 3: an exact UTC timestamp, and the length limit
// ---------------------------------------------------------------------------

const UTC_STAMP_RE = /\b\d{2}:\d{2} UTC\b/;

export function assertHasUtcStamp(textValue) {
  if (!UTC_STAMP_RE.test(String(textValue))) {
    throw new Error('POST REJECTED: no exact UTC timestamp (expected "HH:MM UTC"). Every post is timestamped.');
  }
  return textValue;
}

// X's weighted count: code points in these ranges cost 1, everything else costs
// 2. Our copy is ASCII, so this always equals the obvious answer — it is here so
// that the day someone pastes a non-ASCII model name, the number stays true.
const WEIGHT_1_RANGES = [[0, 4351], [8192, 8205], [8208, 8223], [8242, 8247]];

export function charCount(textValue) {
  let n = 0;
  for (const ch of String(textValue)) {
    const cp = ch.codePointAt(0);
    n += WEIGHT_1_RANGES.some(([lo, hi]) => cp >= lo && cp <= hi) ? 1 : 2;
  }
  return n;
}

export function preflight(textValue, limit = X_CHAR_LIMIT) {
  if (typeof textValue !== 'string' || textValue.trim().length === 0) {
    throw new Error('POST REJECTED: empty text');
  }
  assertNoUrl(textValue);
  assertNoFutureTense(textValue);
  assertHasUtcStamp(textValue);
  const n = charCount(textValue);
  if (n > limit) throw new Error(`POST REJECTED: ${n} chars, limit ${limit}`);
  return textValue;
}

// ---------------------------------------------------------------------------
// Small formatters
// ---------------------------------------------------------------------------

const DAYS_T = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON_T = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function prettyDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new TypeError(`prettyDate: unparsable date ${iso}`);
  return `${DAYS_T[d.getUTCDay()]} ${d.getUTCDate()} ${MON_T[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function prettyStamp(iso) {
  return `${utcClock(iso)} on ${prettyDate(iso)}`;
}

// Hand-rolled rather than Intl, so the output cannot change with the container's
// ICU build. Determinism is a contract requirement, not a preference.
export function fmtInt(n) {
  if (!Number.isFinite(n)) throw new TypeError(`fmtInt: expected finite number, got ${n}`);
  const neg = n < 0;
  const s = String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return neg ? `-${s}` : s;
}

export function ordinal(n) {
  const i = Math.round(n);
  const rem100 = i % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${i}th`;
  return `${i}${['th', 'st', 'nd', 'rd'][i % 10] || 'th'}`;
}

// "a and b" for two, "a, b and c" beyond. Five dark pillars joined with " and "
// four times reads like a ransom note.
export function joinList(items) {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

export function humanHours(hours) {
  if (!Number.isFinite(hours) || hours < 0) return null;
  if (hours < 48) {
    const h = Math.round(hours);
    return `${h} ${h === 1 ? 'hour' : 'hours'}`;
  }
  const d = Math.round(hours / 24);
  return `${d} days`;
}

// ---------------------------------------------------------------------------
// Line assembly
// ---------------------------------------------------------------------------

// Required lines carry the falsifiable claim; optional lines carry colour. Over
// budget, colour goes first, from the bottom up. If the required lines alone do
// not fit, that is a bug in a template and it throws — silently truncating a
// number would be the worst possible failure here.
function assemble(lines, limit) {
  const chosen = lines.filter((l) => l && l.text);
  const render = (ls) => ls.map((l) => l.text).join(' ');
  while (true) {
    const body = render(chosen);
    if (charCount(body) <= limit) return body;
    let idx = -1;
    for (let i = chosen.length - 1; i >= 0; i -= 1) if (!chosen[i].required) { idx = i; break; }
    if (idx === -1) {
      throw new Error(
        `Template overflows: ${charCount(body)} chars with required lines only (limit ${limit}).\n` + body,
      );
    }
    chosen.splice(idx, 1);
  }
}

const R = (text) => ({ text, required: true });
const O = (text) => ({ text, required: false });

// ---------------------------------------------------------------------------
// Derived facts used by more than one template
// ---------------------------------------------------------------------------

// CONTRACT.md's honesty rule, in the post copy as well as on the card: a DARK
// source is not reporting, an UNCALIBRATED one is reporting fine but has no
// frozen reference distribution to be scored against. Collapsing the two into
// "8 of 13 not reporting" was wrong in exactly the direction that makes an
// index untrustworthy — it overstated the outage.
function sourceTally(state) {
  const h = sourceHealth(state);
  if (!h) return null;
  return { ok: h.ok, total: h.total, down: h.down, uncalibrated: h.uncalibrated };
}

function loudestLivePillar(state) {
  const live = pillarsInOrder(state).filter((p) => !p.dark && !p.uncalibrated);
  if (live.length === 0) return null;
  // Ties break by PILLAR_ORDER, which is fixed — so the same state always names
  // the same pillar. No Math.max over an unstable sort.
  return live.reduce((best, p) => (p.score > best.score ? p : best), live[0]);
}

function levelChange(state, opts) {
  const prev = state.previous_level;
  if (!LEVELS[prev] || prev === state.level) return null;
  const since = Date.parse(state.level_since);
  const now = Date.parse(state.generated_at);
  if (!Number.isFinite(since) || !Number.isFinite(now)) return null;
  const windowMs = Number.isFinite(opts.changeWindowMs) ? opts.changeWindowMs : CHANGE_WINDOW_MS;
  if (now - since > windowMs) return null; // change is old news; the daily post covers it
  return { from: prev, to: state.level, escalation: prev > state.level, at: state.level_since };
}

// How long the previous level actually stood. Needs history; returns null
// without it rather than guessing, and the clause is simply omitted.
function previousLevelRunHours(state, history) {
  const since = Date.parse(state.level_since);
  if (!Number.isFinite(since) || !Array.isArray(history)) return null;
  const prior = history
    .filter((h) => h && Number.isFinite(Date.parse(h.generated_at)) && Date.parse(h.generated_at) < since)
    .sort((a, b) => Date.parse(b.generated_at) - Date.parse(a.generated_at));
  if (prior.length === 0 || prior[0].level !== state.previous_level) return null;
  let start = Date.parse(prior[0].generated_at);
  for (const h of prior) {
    if (h.level !== state.previous_level) break;
    start = Date.parse(h.generated_at);
  }
  return (since - start) / 3600000;
}

function deltaClause(delta) {
  if (delta === null) return '';
  if (delta === 0) return ', unchanged from the previous reading';
  return `, ${delta > 0 ? 'up' : 'down'} ${Math.abs(delta).toFixed(1)} from the previous reading`;
}

// ---------------------------------------------------------------------------
// External text: headlines, carrier names, market questions
// ---------------------------------------------------------------------------
//
// Everything in this section handles strings we did not write. The rule is the
// same for all of them and it is not negotiable:
//
//   We NEVER rewrite external text to get it past a guard. If a headline
//   contains "will", it is a claim about the future and this index does not
//   carry claims about the future — so the ITEM is skipped and the next
//   candidate is tried. Editing someone else's headline until our own rule
//   passes would be the worst of both worlds: a future-tense claim laundered
//   through a scale that promises it makes none.
//
// The skip is visible: buildPosts() returns the skipped ids and why.

export function safeExternalText(value) {
  if (typeof value !== 'string') return null;
  const s = stripUrls(value).replace(/\s+/g, ' ').trim();
  if (s.length === 0) return null;
  if (findUrlViolation(s)) return null;
  if (findFutureViolation(s)) return null;
  return s;
}

// Clamp to a character budget, then re-check. Truncation is normally harmless,
// but "willing" cut to four characters is the literal banned word "will", so
// the guards run again on the clamped string and a clamp that breaks them
// returns null rather than a post that throws in preflight.
export function clampSafe(value, budget) {
  const s = safeExternalText(value);
  if (s === null) return null;
  if (!Number.isFinite(budget) || budget < 16) return null;
  if (charCount(s) <= budget) return s;
  const cut = clampWords(s, budget);
  return safeExternalText(cut);
}

// Adds a full stop unless the text already ends in one.
function sentence(s) {
  return /[.!?]$/.test(s) ? s : `${s}.`;
}

// "polymarket" -> "Polymarket". A proper name that arrives as a source id
// should not be shouted or left lowercase mid-sentence.
function properName(s) {
  const t = String(s).trim();
  if (!t) return t;
  return t === t.toLowerCase() ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}

export function compactNumber(v) {
  if (!Number.isFinite(v) || v <= 0) return null;
  if (v >= 1e9) return `${round1(v / 1e9).toFixed(1)}bn`;
  if (v >= 1e6) return `${round1(v / 1e6).toFixed(1)}m`;
  if (v >= 1e3) return `${Math.round(v / 1e3)}k`;
  return fmtInt(v);
}

// Polymarket quotes dollars, Kalshi quotes contracts, Manifold quotes MANA —
// which is play money and has to say so wherever it is rendered, per the note
// in collector/sources/manifold.mjs. An unrecognised unit prints NOTHING: a
// bare "$1.2m" against a MANA figure would be a straightforwardly false claim
// about how much real money is behind a number.
export function fmtVolume(v, unit) {
  const n = compactNumber(v);
  if (n === null) return null;
  if (unit === 'usd') return `$${n}`;
  if (unit === 'contracts') return `${n} contracts`;
  if (unit === 'mana') return `${n} mana, which is play money`;
  return null;
}

function fmtPoints(d) {
  const r = Math.abs(round1(d));
  return `${r.toFixed(1)} ${r === 1 ? 'point' : 'points'}`;
}

// ---------------------------------------------------------------------------
// Resolving the news and market layers
// ---------------------------------------------------------------------------

// data/news.json is written by another module. It may not exist, it may arrive
// embedded in state.json instead, and the shape may drift. Every path is read;
// nothing is invented when none of them holds anything.
export function resolveNews(state, opts = {}) {
  const raw = opts.news ?? state?.news ?? state?.news_items ?? null;
  if (!raw) return { generated_at: null, items: [] };
  // normaliseNews is idempotent, so an already-normalised payload is safe to
  // pass through it again. Sniffing the shape instead would be one more thing
  // that can be wrong.
  return normaliseNews(raw);
}

// Market rows live in the collector's per-source `meta`, in TWO lists that
// have to be joined:
//
//   meta.top_markets      { question, url, probability (0..1), volume,
//                           volume_unit: 'usd'|'contracts'|'mana',
//                           close_time, source }      the display list
//   meta.top_contributors { question, move, volume }   the audit list
//
// The display list carries the price and the currency; the audit list carries
// the 24h move. Neither has both, so they are merged on `question`, which is
// the only key the two share.
//
// `move` is Math.abs() in every adapter — collector/sources/polymarket.mjs
// line 243 and kalshi.mjs line 505 — so a move read from that list has NO
// DIRECTION and the copy says "moved", never "up" or "down". A signed
// delta_24h, if an adapter ever emits one, is used as a signed value and the
// copy then says which way.
//
// Probability encoding: a value in [0,1] is read as a FRACTION and scaled to
// points; anything above 1 is read as already being in points. That is the one
// ambiguous case in the whole pipeline (a market genuinely at 1% and one at
// 100% both arrive as "1"), resolved in favour of the fraction because that is
// what all three venues emit.

function defined(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
  return out;
}

// Flattens one source's `meta` into merged market rows.
export function marketsFromMeta(meta, sourceId) {
  const byQuestion = new Map();
  const put = (question, patch) => {
    if (typeof question !== 'string' || !question.trim()) return;
    const key = question.trim();
    byQuestion.set(key, { question: key, venue: sourceId ?? null, ...(byQuestion.get(key) || {}), ...defined(patch) });
  };
  for (const m of Array.isArray(meta?.top_markets) ? meta.top_markets : []) {
    if (!m || typeof m !== 'object') continue;
    put(m.question, {
      probability_raw: Number.isFinite(m.probability) ? m.probability : undefined,
      volume: Number.isFinite(m.volume) ? m.volume : undefined,
      volume_unit: typeof m.volume_unit === 'string' ? m.volume_unit : undefined,
      venue: typeof m.source === 'string' && m.source ? m.source : undefined,
      close_time: typeof m.close_time === 'string' ? m.close_time : undefined,
    });
  }
  for (const m of Array.isArray(meta?.top_contributors) ? meta.top_contributors : []) {
    if (!m || typeof m !== 'object') continue;
    put(m.question, {
      move_abs_raw: Number.isFinite(m.move) ? m.move : undefined,
      volume: Number.isFinite(m.volume) ? m.volume : (Number.isFinite(m.volume_24h) ? m.volume_24h : undefined),
    });
  }
  return [...byQuestion.values()];
}

function toPoints(v) {
  if (!Number.isFinite(v)) return null;
  return Math.abs(v) <= 1 ? v * 100 : v;
}

export function normaliseMarkets(raw) {
  const rows = Array.isArray(raw) ? raw : [];
  const out = [];
  for (const m of rows) {
    if (!m || typeof m !== 'object') continue;

    const question = [m.question, m.title, m.name, m.label, m.subject]
      .find((v) => typeof v === 'string' && v.trim().length > 0) || null;
    if (!question) continue;

    const probRaw = [m.probability_raw, m.probability, m.prob, m.price, m.yes_price, m.last_price, m.mid]
      .find((v) => Number.isFinite(v));
    let probability = null;
    if (Number.isFinite(probRaw)) {
      probability = probRaw >= 0 && probRaw <= 1 ? probRaw * 100 : probRaw;
      if (probability < 0 || probability > 100) probability = null;
    }

    // Signed first — it says more — then the absolute audit figure.
    const signedRaw = [m.delta_24h, m.change_24h, m.move_24h, m.delta, m.change]
      .find((v) => Number.isFinite(v));
    let move = null;
    let signed = false;
    if (Number.isFinite(signedRaw)) {
      move = toPoints(signedRaw);
      signed = true;
    } else {
      const absRaw = [m.move_abs_raw, m.move_abs, m.move].find((v) => Number.isFinite(v));
      if (Number.isFinite(absRaw)) { move = Math.abs(toPoints(absRaw)); signed = false; }
    }
    if (move !== null && Math.abs(move) > 100) { move = null; signed = false; }

    const venue = [m.venue, m.platform, m.source, m.exchange].find((v) => typeof v === 'string' && v) || null;
    const volume_unit = typeof m.volume_unit === 'string' && m.volume_unit
      ? m.volume_unit
      : (venue ? VENUE_VOLUME_UNITS[venue] ?? null : null);

    out.push({
      id: typeof m.id === 'string' && m.id ? m.id : question.slice(0, 48),
      question,
      label: typeof m.label === 'string' && m.label ? m.label : null,
      probability,
      move,
      signed,
      volume: [m.volume, m.volume_usd, m.liquidity_usd].find((v) => Number.isFinite(v)) ?? null,
      volume_unit,
      venue,
      observed_at: [m.observed_at, m.updated_at, m.at].find((v) => typeof v === 'string' && !Number.isNaN(Date.parse(v))) || null,
    });
  }
  // Biggest move first; then the deepest book; then the id, so two identical
  // moves always order the same way. Volumes are NOT compared across venues —
  // the sort is within a merged list and the tie-break only has to be stable,
  // not meaningful.
  return out.sort((a, b) => {
    const am = a.move === null ? -1 : Math.abs(a.move);
    const bm = b.move === null ? -1 : Math.abs(b.move);
    if (am !== bm) return bm - am;
    const av = a.volume ?? -1;
    const bv = b.volume ?? -1;
    if (av !== bv) return bv - av;
    return a.id.localeCompare(b.id);
  });
}

// The rows can arrive from five places depending on how far the market work has
// landed. data/state.json does not carry per-source `meta` today, so the CLI
// reads the newest data/raw snapshot and passes its readings in — that is where
// top_markets and top_contributors actually live right now.
export function collectMarkets(state, opts = {}) {
  // RAW rows in, ONE normalisation pass at the end. Normalising twice would
  // rescale a genuine half-point move into a fifty-point move, because the
  // fraction-vs-points rule cannot tell 0.5 points from a 0.5 probability.
  const raws = [];
  if (Array.isArray(opts.markets)) raws.push(...opts.markets);
  if (Array.isArray(state?.top_markets)) raws.push(...state.top_markets);
  if (Array.isArray(state?.markets?.top_markets)) raws.push(...state.markets.top_markets);

  const withMeta = [
    ...(Array.isArray(state?.sources) ? state.sources : []),
    ...(Array.isArray(opts.readings) ? opts.readings : []),
    ...(Array.isArray(opts.raw?.readings) ? opts.raw.readings : []),
  ];
  for (const s2 of withMeta) {
    const id = s2?.id ?? s2?.source ?? null;
    if (!s2?.meta || typeof s2.meta !== 'object') continue;
    raws.push(...marketsFromMeta(s2.meta, id));
  }

  // De-duplicate on venue+question: the same reading can reach us through both
  // state.sources and a raw snapshot. The richer row wins — a price and a move
  // beats either alone.
  const seen = new Map();
  for (const row of normaliseMarkets(raws)) {
    const key = `${row.venue ?? ''}::${row.question}`;
    const prev = seen.get(key);
    const richness = (r) => (r.probability === null ? 0 : 1) + (r.move === null ? 0 : 1) + (r.volume === null ? 0 : 1);
    if (!prev || richness(row) > richness(prev)) seen.set(key, row);
  }
  // Already normalised; re-sort only, using the same comparator.
  return [...seen.values()].sort((a, b) => {
    const am = a.move === null ? -1 : Math.abs(a.move);
    const bm = b.move === null ? -1 : Math.abs(b.move);
    if (am !== bm) return bm - am;
    const av = a.volume ?? -1;
    const bv = b.volume ?? -1;
    if (av !== bv) return bv - av;
    return a.id.localeCompare(b.id);
  });
}

// A market question is written in the future tense by construction — "Will X
// happen by June". The leading auxiliary is dropped so what is left is a NAME,
// not a claim, and it is then quoted. If what remains still trips the guard the
// market is skipped; nothing is paraphrased into something it did not say.
// Returns { text, verbatim } or null. `verbatim` says whether the venue's own
// wording survived intact, which changes how the post introduces the quote:
// a whole statement is quoted directly, a fragment is introduced with "on" so
// the reader can see it is a market's subject and not our sentence.
export function marketLabel(m) {
  const raw = m?.label || m?.question;
  if (typeof raw !== 'string') return null;
  const base = stripUrls(raw).replace(/\s+/g, ' ').trim().replace(/\?+$/, '').trim();
  if (base.length < 6) return null;
  // Best case: the venue already phrased it as a statement ("US expands chip
  // controls in Q4"). Then it is quoted exactly and nothing is touched.
  const asIs = safeExternalText(base);
  if (asIs !== null) return { text: asIs, verbatim: true };
  // Otherwise drop the leading auxiliary, which leaves a fragment rather than a
  // claim. The fragment is quoted, so the awkward grammar is visibly the
  // market's phrasing and not ours.
  const stripped = base.replace(/^(will|would|shall|is|are|does|do|did|can|could|has|have|when)\s+/i, '').trim();
  if (stripped.length < 6 || stripped === base) return null;
  const safe = safeExternalText(stripped.charAt(0).toUpperCase() + stripped.slice(1));
  return safe === null ? null : { text: safe, verbatim: false };
}

// ---------------------------------------------------------------------------
// Templates a–k
// ---------------------------------------------------------------------------

// (a) Daily state post. Fires every single day, at every level, degraded or not.
// This is the whole credibility engine: @PenPizzaReport's most valuable posts
// are the ones saying nothing is happening. An index that only speaks when
// alarmed reads as a hype account.
//
// THREE PHRASINGS.
//   0 (preferred) Instrument first: level, name, composite, delta, stamp. It is
//                 preferred because it reads identically on the loudest day and
//                 the dullest one, and that sameness IS the credibility claim —
//                 an index whose format changes with its mood is a mood.
//   1            Number first. Lands harder as a standalone first line when the
//                 composite has actually moved, because the figure arrives
//                 before the jargon.
//   2            Log entry: date, clock, then the reading. The driest of the
//                 three, and the one that most looks like something copied off
//                 an instrument rather than written for an audience.
function dailyPost(c) {
  const { state, spoken, delta } = c;
  const lvl = LEVELS[state.level];
  const loud = loudestLivePillar(state);
  const tally = sourceTally(state);
  const score = fmt1(state.score);
  const d = deltaClause(delta);
  const lead = c.say('daily', [
    `DOOMCON ${state.level}, ${lvl.name}. Composite ${score} of 100${d}, as of ${prettyStamp(state.generated_at)}.`,
    `The AI tempo index reads ${score} of 100 as of ${prettyStamp(state.generated_at)}. DOOMCON ${state.level}, ${lvl.name}${d}.`,
    `${prettyDate(state.generated_at)}, ${utcClock(state.generated_at)}. Composite ${score} of 100${d}. DOOMCON ${state.level}, ${lvl.name}.`,
  ]);
  return post(c, {
    kind: 'daily',
    priority: 60,
    variant: 'landscape',
    rationale: 'Fires every day at every level. The calm days are what make the loud ones believable.',
    lines: [
      R(lead),
      loud ? O(`${PILLAR_PROSE[loud.id]} is the loudest of the five pillars at ${fmt1(loud.score)}.`) : null,
      tally ? O(`${tally.ok} of ${tally.total} sources reporting${tally.uncalibrated ? `, ${tally.uncalibrated} awaiting a frozen baseline` : ''}.`) : null,
      R(`Arithmetic at ${spoken}.`),
    ],
  });
}

// (b) Escalation.
function escalationPost(c, change) {
  const { state, spoken, history } = c;
  const lvl = LEVELS[state.level];
  const crossed = LEVELS[change.to].band[0];
  const stood = humanHours(previousLevelRunHours(state, history));
  const loud = loudestLivePillar(state);
  return post(c, {
    kind: 'escalation',
    priority: 10,
    variant: 'landscape',
    rationale: 'A threshold crossing is the single most screenshot-able thing this index produces.',
    lines: [
      R(`DOOMCON ${change.from} to ${change.to}. ${lvl.name}.`),
      R(`Composite ${fmt1(state.score)} of 100, past the ${crossed} line at ${prettyStamp(change.at)}.`),
      stood ? O(`DOOMCON ${change.from} stood for ${stood}.`) : null,
      loud ? O(`${PILLAR_PROSE[loud.id]} carried it at ${fmt1(loud.score)}.`) : null,
      R(`Arithmetic at ${spoken}.`),
    ],
  });
}

// (c) De-escalation. Posted with exactly the same prominence as an escalation.
// An index that announces every rise and mutters every fall is a ratchet, and a
// ratchet is not a measurement.
function deescalationPost(c, change) {
  const { state, spoken, history } = c;
  const lvl = LEVELS[state.level];
  const crossed = LEVELS[change.from].band[0];
  const stood = humanHours(previousLevelRunHours(state, history));
  return post(c, {
    kind: 'deescalation',
    priority: 30,
    variant: 'landscape',
    rationale: 'Stands down get the same billing as escalations, or the index is a ratchet.',
    lines: [
      R(`DOOMCON ${change.from} to ${change.to}. ${lvl.name}.`),
      R(`Composite ${fmt1(state.score)} of 100, back under the ${crossed} line at ${prettyStamp(change.at)}.`),
      stood ? O(`DOOMCON ${change.from} stood for ${stood}.`) : null,
      O('Standing down here takes four times longer than raising.'),
      R(`Arithmetic at ${spoken}.`),
    ],
  });
}

// (d) One pillar running hot while the composite does not move. This is the post
// that earns replies, because it invites the obvious argument: why does the
// headline number not reflect it? The answer is the weighting, and it is public.
function pillarSpikePost(c) {
  const { state, spoken } = c;
  const loud = loudestLivePillar(state);
  if (!loud) return null;
  if (loud.score < PILLAR_SPIKE_SCORE) return null;
  if (loud.percentile !== null && loud.percentile < PILLAR_SPIKE_PCTL) return null;
  const pctl = loud.percentile === null
    ? ''
    : `, its ${ordinal(loud.percentile * 100)} percentile against a frozen baseline`;
  return post(c, {
    kind: 'pillar-spike',
    priority: 40,
    variant: 'portrait',
    rationale: 'Invites the "why is the headline not moving" argument. The weighting is public, so the argument is winnable.',
    lines: [
      R(`${PILLAR_PROSE[loud.id]} is at ${fmt1(loud.score)} of 100${pctl}, the loudest of the five pillars as of ${prettyStamp(state.generated_at)}.`),
      loud.sources_ok !== null && loud.sources_total !== null
        ? O(`${loud.sources_ok} of ${loud.sources_total} sources in that pillar are reporting.`) : null,
      R(`Composite holds at ${fmt1(state.score)}, DOOMCON ${state.level}.`),
      R(`Arithmetic at ${spoken}.`),
    ],
  });
}

// (e) One named input, with its number. The specific beats the aggregate: a
// reader can go check "6,016 arXiv submissions" themselves, and a claim someone
// can check is a claim someone argues with.
function notablePosts(c) {
  const { state, spoken, notable } = c;
  const out = [];
  for (const item of notable.slice(0, 2)) {
    if (!item || typeof item.label !== 'string' || !Number.isFinite(item.value)) {
      throw new TypeError(
        'notable item must be { label: string, value: finite number, pillar, unit?, observed_at?, baseline?, percentile? } — got ' +
        JSON.stringify(item),
      );
    }
    const pillar = pillarsInOrder(state).find((p) => p.id === item.pillar);
    if (!pillar) throw new TypeError(`notable item pillar "${item.pillar}" is not one of ${PILLAR_ORDER.join(', ')}`);
    const when = item.observed_at || state.generated_at;
    const unit = item.unit ? ` ${item.unit}` : '';
    const context = Number.isFinite(item.baseline)
      ? O(`Frozen-baseline median is ${fmtInt(item.baseline)}.`)
      : (Number.isFinite(item.percentile) ? O(`That is its ${ordinal(item.percentile * 100)} percentile.`) : null);
    out.push(post(c, {
      kind: 'notable-input',
      priority: 50,
      variant: 'portrait',
      key: item.source || item.label,
      rationale: 'A specific checkable number. Checkable numbers get argued with, and replies weigh 5.0 against a like at 0.5.',
      lines: [
        R(`${item.label}: ${fmtInt(item.value)}${unit}, counted at ${prettyStamp(when)}.`),
        context,
        pillar.dark
          ? R(`Its pillar, ${PILLAR_PROSE[pillar.id].toLowerCase()}, is dark, so it is not in the composite.`)
          : R(`It feeds ${PILLAR_PROSE[pillar.id].toLowerCase()}, at ${fmt1(pillar.score)} of 100. Composite ${fmt1(state.score)}, DOOMCON ${state.level}.`),
        R(`Arithmetic at ${spoken}.`),
      ],
    }));
  }
  return out;
}

// (f) Weekly summary, Sundays. Needs seven days of history or it says nothing.
function weeklyPost(c) {
  const { state, spoken, history } = c;
  const now = Date.parse(state.generated_at);
  if (new Date(now).getUTCDay() !== 0) return null;
  const weekStart = now - 7 * 24 * 3600 * 1000;
  const week = history
    .filter((h) => h && Number.isFinite(h.score) && Date.parse(h.generated_at) >= weekStart && Date.parse(h.generated_at) <= now)
    .sort((a, b) => Date.parse(a.generated_at) - Date.parse(b.generated_at));
  if (week.length < 2) return null;
  const open = week[0];
  const close = { score: state.score, level: state.level };
  const hi = week.reduce((m, h) => (h.score > m.score ? h : m), week[0]);
  const lo = week.reduce((m, h) => (h.score < m.score ? h : m), week[0]);
  let changes = 0;
  for (let i = 1; i < week.length; i += 1) if (week[i].level !== week[i - 1].level) changes += 1;
  return post(c, {
    kind: 'weekly',
    priority: 55,
    variant: 'landscape',
    rationale: 'A week in one screenshot. Rides the Sunday-evening catch-up read.',
    lines: [
      R(`DOOMCON week to ${prettyStamp(state.generated_at)}.`),
      R(`Opened at ${open.level} ${LEVELS[open.level]?.name || ''}, closed at ${close.level} ${LEVELS[close.level].name}. Composite ${fmt1(open.score)} to ${fmt1(close.score)}.`),
      O(`High ${fmt1(hi.score)}, low ${fmt1(lo.score)}, across ${fmtInt(week.length)} readings.`),
      O(`${changes === 0 ? 'No' : fmtInt(changes)} level ${changes === 1 ? 'change' : 'changes'}.`),
      R(`Arithmetic at ${spoken}.`),
    ],
  });
}

// (g) Record. Only meaningful once there is enough history for "record" to mean
// something, hence MIN_HISTORY_FOR_RECORD.
function milestonePost(c) {
  const { state, spoken, history } = c;
  const prior = history.filter((h) => h && Number.isFinite(h.score) && Date.parse(h.generated_at) < Date.parse(state.generated_at));
  if (prior.length < MIN_HISTORY_FOR_RECORD) return null;
  const hi = prior.reduce((m, h) => (h.score > m.score ? h : m), prior[0]);
  const lo = prior.reduce((m, h) => (h.score < m.score ? h : m), prior[0]);
  const isHigh = state.score > hi.score;
  const isLow = state.score < lo.score;
  if (!isHigh && !isLow) return null;
  const prev = isHigh ? hi : lo;
  const first = prior.reduce((m, h) => (Date.parse(h.generated_at) < Date.parse(m.generated_at) ? h : m), prior[0]);
  return post(c, {
    kind: 'milestone',
    priority: 20,
    variant: 'portrait',
    rationale: 'A record is the one claim that needs no context to land, and the receipt chain makes it checkable.',
    lines: [
      R(`Composite ${fmt1(state.score)} of 100 is the ${isHigh ? 'highest' : 'lowest'} reading this index has recorded, as of ${prettyStamp(state.generated_at)}.`),
      R(`DOOMCON ${state.level}, ${LEVELS[state.level].name}.`),
      O(`Previous ${isHigh ? 'high' : 'low'} ${fmt1(prev.score)} on ${prettyDate(prev.generated_at)}, across ${fmtInt(prior.length)} readings since ${prettyDate(first.generated_at)}.`),
      R(`Arithmetic at ${spoken}.`),
    ],
  });
}

// (h) Degraded honesty post. pizzint's homepage prints DOUGHCON 5 while four of
// six inputs return null and its own status endpoint says "healthy" at a 12%
// scrape rate. Saying so out loud is the cheapest differentiator this project
// has, so the dead-pipe day gets a post of its own.
function degradedPost(c) {
  const { state, spoken } = c;
  const all = pillarsInOrder(state);
  // Two different failures, two different sentences. "Dark" means nothing is
  // arriving; "no frozen baseline" means readings arrive and cannot be scored
  // against history yet. Calling the second one dark overstates the outage, and
  // overstating an outage is the same class of error as hiding one.
  const trulyDark = all.filter((p) => p.dark);
  const uncal = all.filter((p) => p.uncalibrated && !p.dark);
  const dark = darkPillars(state);
  const tally = sourceTally(state);
  const darkNames = joinList(trulyDark.map((p) => PILLAR_PROSE[p.id].toLowerCase()));
  const uncalNames = joinList(uncal.map((p) => PILLAR_PROSE[p.id].toLowerCase()));
  const blank = isUnavailable(state);
  // With every pillar dark the engine publishes no score at all. Quoting a level
  // here would be the precise thing this index was built to not do.
  const holdLine = blank
    ? 'No level and no composite are published while every pillar is dark.'
    : `The level holds at ${state.level} and nothing is imputed for a pillar the index cannot score.`;
  return post(c, {
    kind: 'degraded',
    priority: 5,
    variant: 'landscape',
    rationale: 'The competitor prints a confident number over a dead pipe. Saying so is the differentiator.',
    lines: [
      R(`DOOMCON is degraded as of ${prettyStamp(state.generated_at)}.`),
      R(trulyDark.length > 0
        ? `${trulyDark.length} of 5 pillars dark: ${darkNames}.`
        : (uncal.length > 0
          ? `${uncal.length} of 5 pillars ${uncal.length === 1 ? 'has' : 'have'} no frozen baseline yet: ${uncalNames}.`
          : 'Inputs are stale.')),
      trulyDark.length > 0 && uncal.length > 0
        ? O(`${uncal.length} more ${uncal.length === 1 ? 'has' : 'have'} no frozen baseline yet: ${uncalNames}.`) : null,
      tally && tally.down > 0 ? O(`${tally.down} of ${tally.total} sources are not reporting.`) : null,
      tally && tally.uncalibrated > 0
        ? O(`${tally.uncalibrated} more report without a frozen baseline, so they are published and not scored.`) : null,
      R(holdLine),
      R(`Arithmetic at ${spoken}.`),
    ],
  });
}

// (i) The day's top corroborated item. This is the post that makes the account
// worth following on a day when the index does not move — pizzint's 997
// auto-generated /intel briefs are its actual traffic engine, and this is the
// same thing pointed at a feed instead of at a sitemap.
//
// The headline is quoted, not summarised, and it is clamped to whatever budget
// the fixed lines leave. An item whose headline trips a guard is skipped and the
// next candidate is tried, up to NEWS_CANDIDATES.
function topNewsPost(c) {
  const { state, spoken, news, skips } = c;
  if (isUnavailable(state)) return null;
  const items = news.items.slice(0, NEWS_CANDIDATES);
  for (const item of items) {
    const pillar = item.pillar ? pillarsInOrder(state).find((p) => p.id === item.pillar) : null;
    const when = item.published_at || state.generated_at;

    // THREE PHRASINGS of the carrier line.
    //   0 (preferred) names the count and the first sighting in one clause —
    //     the count is the claim, the timestamp is the receipt, and putting
    //     them together is what a reply cannot separate.
    //   1 leads with the verb, which reads less like a database row on a day
    //     when the headline itself is the whole story.
    //   2 is the terse one, for when the clamped headline needs the characters.
    const carriedLine = item.source_count > 1
      ? c.say('top-news', [
        `${fmtInt(item.source_count)} independent sources carried it, first at ${prettyStamp(when)}.`,
        `Carried by ${fmtInt(item.source_count)} independent sources. First at ${prettyStamp(when)}.`,
        `${fmtInt(item.source_count)} sources, one item, first at ${prettyStamp(when)}.`,
      ])
      : c.say('top-news', [
        `One source carried it, at ${prettyStamp(when)}.`,
        `One source so far, at ${prettyStamp(when)}.`,
        `Single-sourced as of ${prettyStamp(when)}.`,
      ]);
    const pillarLine = pillar && !pillar.dark && !pillar.uncalibrated
      ? `It feeds ${PILLAR_PROSE[pillar.id].toLowerCase()}, at ${fmt1(pillar.score)} of 100.`
      : (pillar ? `Its pillar, ${PILLAR_PROSE[pillar.id].toLowerCase()}, is not scored yet.` : null);
    const indexLine = `Composite ${fmt1(state.score)} of 100, DOOMCON ${state.level}.`;
    const tail = `Arithmetic at ${spoken}.`;

    // Budget the headline against the lines that must survive.
    const fixed = [carriedLine, indexLine, tail].join(' ');
    const budget = c.limit - charCount(fixed) - 2;
    const headline = clampSafe(item.headline, budget);
    if (headline === null) {
      skips.news.push({ id: item.id, why: 'headline trips a post guard or does not fit the budget' });
      continue;
    }
    c.usedNewsItemId = item.id;   // corroborationPost reads this
    return post(c, {
      kind: 'top-news',
      priority: 25,
      variant: 'portrait',
      preferredCard: 'news-portrait',
      key: item.id,
      rationale: 'The single most corroborated item of the day, quoted verbatim. A post carrying a fact outruns a post carrying a gauge.',
      lines: [
        R(sentence(headline)),
        R(carriedLine),
        pillarLine ? O(pillarLine) : null,
        R(indexLine),
        R(tail),
      ],
    });
  }
  return null;
}

// (j) Corroboration. Not "a thing happened" but "N independent sources carried
// the same thing inside M minutes" — which is a claim about the WORLD's tempo
// rather than about any one outlet, and it is the closest thing this index has
// to a falsifiable news measurement.
function corroborationPost(c, usedId) {
  const { state, spoken, news, skips } = c;
  if (isUnavailable(state)) return null;
  const eligible = news.items.filter((i) => (
    i.source_count >= MIN_CORROBORATION && Number.isFinite(i.window_minutes)
  ));
  if (eligible.length === 0) return null;

  // Never the item the top-news post already used: two posts carrying the same
  // headline three hours apart is the behaviour of a bot, not of an index.
  const pool = eligible.filter((i) => i.id !== usedId).slice(0, NEWS_CANDIDATES);
  if (pool.length === 0) return null;

  // Tightest window wins here, not the biggest count: this template is about
  // simultaneity.
  const ordered = pool.slice().sort((a, b) => (
    a.window_minutes - b.window_minutes
    || b.source_count - a.source_count
    || a.id.localeCompare(b.id)
  ));

  for (const item of ordered) {
    // Two framings, one threshold. Under 90 minutes the story is simultaneity
    // ("within eleven minutes"); above it the story is LEAD TIME, which is the
    // competitive claim docs/NEWS.md makes — this layer reads the primary
    // sources an X feed is downstream of, so a 676-minute spread is the point,
    // not an embarrassment. Calling that "within 676 minutes" is true and
    // useless.
    const tight = item.window_minutes <= CORROBORATION_TIGHT_MINUTES;
    const window = item.window_minutes === 0
      ? 'the same minute'
      : (tight
        ? `${fmtInt(item.window_minutes)} ${item.window_minutes === 1 ? 'minute' : 'minutes'}`
        : `${round1(item.window_minutes / 60).toFixed(1)} hours`);
    const lead = item.window_minutes === 0
      ? 'in the same minute'
      : (tight ? `within ${window}` : `${window} apart`);
    const firstIso = item.first_seen_at || item.published_at || state.generated_at;

    // Carrier names are external text too. "GOV.UK" reads as a bare domain to
    // the URL guard, so names are filtered individually rather than the whole
    // item being dropped for one awkward masthead.
    const names = item.sources.map((s) => safeExternalText(s.name)).filter(Boolean);
    const carriers = names.length >= 2 ? `Carriers: ${joinList(names.slice(0, 4))}.` : null;

    // THREE PHRASINGS. The claim is identical in all three; only the order of
    // count, window and quote moves.
    //   0 (preferred) puts the number of independent sources first, because
    //     that number is the measurement and it is the one thing in the post
    //     nobody else in this category computes at all.
    //   1 makes the ITEM the subject, which reads better when the window is a
    //     lead time ("4.1 hours apart") rather than a simultaneity.
    //   2 is the compressed one, and buys the headline about twenty characters.
    const leadIdx = phrasingIndex('corroboration', state.generated_at, 3);
    const leadLine = (h) => [
      `${fmtInt(item.source_count)} independent sources carried the same item ${lead}: ${h}`,
      `The same item reached ${fmtInt(item.source_count)} independent sources ${lead}: ${h}`,
      `${fmtInt(item.source_count)} outlets, ${lead}, one item: ${h}`,
    ][leadIdx];

    // The composite line is OUTSIDE this budget on purpose. It is colour on
    // this template — the measurement is the corroboration — so the quoted
    // headline gets its characters first and assemble() drops the composite if
    // the headline used them. A clamped-to-nothing quote is worth less than an
    // index number the tail already points at.
    const fixed = [
      leadLine('.'),
      `First at ${compactStamp(firstIso)}.`,
      `Arithmetic at ${spoken}.`,
    ].join(' ');
    const budget = c.limit - charCount(fixed) - 2;
    const headline = clampSafe(item.headline, budget);
    if (headline === null) {
      skips.news.push({ id: item.id, why: 'headline trips a post guard or does not fit the corroboration budget' });
      continue;
    }
    return post(c, {
      kind: 'corroboration',
      priority: 45,
      variant: 'portrait',
      preferredCard: 'news-portrait',
      key: item.id,
      rationale: 'Corroboration is the measurement, and it is the one number nobody else in the category can compute. Checkable claims get argued with.',
      lines: [
        R(leadLine(sentence(headline))),
        R(`First at ${compactStamp(firstIso)}.`),
        carriers ? O(carriers) : null,
        O(`Composite ${fmt1(state.score)} of 100, DOOMCON ${state.level}.`),
        R(`Arithmetic at ${spoken}.`),
      ],
    });
  }
  return null;
}

// (k) A prediction market that moved. The markets pillar is the one input a
// reader can go and trade against, which makes it the most argued-with number
// on the board.
//
// The market question is quoted as a NAME, with its leading auxiliary removed —
// see marketLabel(). A market whose name still reads as a claim about the future
// after that is skipped.
function marketMovePost(c) {
  const { state, spoken, markets, skips } = c;
  if (isUnavailable(state)) return null;
  const movers = markets.filter((m) => (
    Number.isFinite(m.move) && Math.abs(round1(m.move)) >= MARKET_MOVE_MIN_POINTS
  )).slice(0, MARKET_CANDIDATES);
  if (movers.length === 0) return null;

  const pillar = pillarsInOrder(state).find((p) => p.id === 'markets');

  for (const m of movers) {
    const named = marketLabel(m);
    const rawLabel = named === null ? null : named.text;
    if (rawLabel === null) {
      skips.markets.push({ id: m.id, why: 'market name reads as a claim about the future even with the auxiliary removed' });
      continue;
    }
    const venue = m.venue ? safeExternalText(properName(m.venue)) : null;
    const money = fmtVolume(m.volume, m.volume_unit);
    const when = m.observed_at || state.generated_at;
    // Every adapter records Math.abs(move), so unless a SIGNED delta arrived
    // there is no direction to report and the copy must not invent one.
    const priced = m.probability === null ? null : `${Math.round(m.probability)} percent`;
    const movePhrase = m.signed
      ? `${m.move > 0 ? 'up' : 'down'} ${fmtPoints(m.move)}`
      : `moved ${fmtPoints(m.move)}`;
    // A whole statement is quoted directly; a fragment is introduced with "on".
    const lede = named.verbatim ? 'Prediction market' : 'Prediction market on';
    const headLine = priced
      ? `${lede} "LABEL": ${priced}, ${movePhrase} over the past 24 hours.`
      : `${lede} "LABEL" ${movePhrase} over the past 24 hours.`;

    const pillarLine = pillar && !pillar.dark && !pillar.uncalibrated
      ? `Markets sits at ${fmt1(pillar.score)} of 100.`
      : 'Markets has no frozen baseline yet, so it is published and not scored.';
    // Budget against the REQUIRED lines only. assemble() drops the optional
    // ones under pressure, and counting them here starved the market name down
    // to "the US expand..." — a truncation that changed what the market asks.
    const readLine = `Read at ${prettyStamp(when)}${venue ? ` on ${venue}` : ''}.`;
    const fixed = [
      headLine.replace('LABEL', ''),
      readLine,
      `Composite ${fmt1(state.score)} of 100, DOOMCON ${state.level}. Arithmetic at ${spoken}.`,
    ].join(' ');
    const budget = c.limit - charCount(fixed) - 2;
    const label = clampSafe(rawLabel, budget);
    if (label === null) {
      skips.markets.push({ id: m.id, why: 'market name does not fit the budget once clamped' });
      continue;
    }

    return post(c, {
      kind: 'market-move',
      priority: 48,
      variant: 'portrait',
      preferredCard: 'news-portrait',
      key: m.id,
      rationale: 'A number the reader can go and trade against. The most argued-with input on the board.',
      lines: [
        R(headLine.replace('LABEL', label)),
        R(readLine),
        money ? O(`${money} on the book.`) : null,
        O(pillarLine),
        R(`Composite ${fmt1(state.score)} of 100, DOOMCON ${state.level}. Arithmetic at ${spoken}.`),
      ],
    });
  }
  return null;
}

// ---------------------------------------------------------------------------
// (l) THE BUILD — datacentres against the drought in their county
// ---------------------------------------------------------------------------
//
// The single most pasteable number this project owns, and the one most likely
// to be quote-tweeted by someone who thinks they have caught us. Three things
// keep it survivable, and all three are in the copy rather than in a footnote:
//
//   1. The denominator is "datacentres OpenStreetMap has MAPPED", never "US
//      datacentres". A site missing from OSM means nobody mapped it. The first
//      line says mapped, every time.
//   2. The Drought Monitor figure is the share of a COUNTY'S AREA in a
//      category. A county 20% in D3 does not say which 20%, and a pin in that
//      county is not necessarily in that 20%. Said out loud, in the post.
//   3. Nothing here measures a datacentre's water draw. No public feed
//      publishes it, for any site, at any cadence. This is a statement about
//      WHERE THE BUILDINGS ARE, which is a smaller claim and a true one.
//
// Returns null — and records why — when the county join is empty. On
// 2026-09-25 the usdm-county endpoint was failing outright, so the join was
// empty and this post correctly did not fire. That is the whole design: a dark
// source produces no post, never a remembered number.
export function resolveDatacenters(opts = {}) {
  const dc = opts.datacenters ?? null;
  if (!dc || typeof dc !== 'object') return null;
  const sites = Array.isArray(dc.sites) ? dc.sites : [];
  const byCounty = dc.resources_index?.drought_by_county;
  if (sites.length === 0 || !byCounty || typeof byCounty !== 'object') return null;

  const above = (row, keys) => keys.some((k) => Number.isFinite(row?.area_pct?.[k]) && row.area_pct[k] > 0);
  const rank = (row) => {
    const i = DROUGHT_CATEGORY_ORDER.findIndex((k) => Number.isFinite(row?.area_pct?.[k]) && row.area_pct[k] > 0);
    return i === -1 ? DROUGHT_CATEGORY_ORDER.length : i;
  };

  let joined = 0;
  let any = 0;
  let severe = 0;
  let worst = null;           // the single worst-hit county with a site in it
  const seenCounty = new Set();
  for (const s of sites) {
    const d = s?.resources?.drought;
    if (!d || d.granularity !== 'county') continue;
    const row = byCounty[d.county_fips];
    if (!row) continue;
    joined += 1;
    if (above(row, DROUGHT_ANY_KEYS)) any += 1;
    if (above(row, DROUGHT_SEVERE_KEYS)) severe += 1;
    if (seenCounty.has(d.county_fips)) continue;
    seenCounty.add(d.county_fips);
    const r = rank(row);
    // Worst category first, then the largest area share inside it, then the
    // FIPS code — which is unique and fixed, so the same data always names the
    // same county. No unstable tiebreak, per CONTRACT.md.
    const cand = { fips: d.county_fips, rank: r, row, share: row.area_pct?.[DROUGHT_CATEGORY_ORDER[r]] ?? 0 };
    if (!worst
      || cand.rank < worst.rank
      || (cand.rank === worst.rank && cand.share > worst.share)
      || (cand.rank === worst.rank && cand.share === worst.share && cand.fips < worst.fips)) worst = cand;
  }
  if (joined === 0) return null;
  return {
    total: sites.length,
    joined,
    any,
    severe,
    worst: worst && worst.rank < DROUGHT_CATEGORY_ORDER.length ? worst : null,
    map_date: typeof dc.resources_index?.usdm_map_date === 'string' ? dc.resources_index.usdm_map_date : null,
    generated_at: typeof dc.generated_at === 'string' ? dc.generated_at : null,
  };
}

// "2026-09-18" -> "18 Sep 2026". The Drought Monitor publishes a map DATE, not
// a map time, so this one figure is a date and says so rather than borrowing a
// clock it does not have.
function prettyDay(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd));
  if (!m) return null;
  const mon = MON_T[Number(m[2]) - 1];
  if (!mon) return null;
  return `${Number(m[3])} ${mon} ${m[1]}`;
}

function droughtPost(c) {
  const { state, spoken, skips } = c;
  const b = c.build;
  if (!b) {
    skips.data.push({
      id: 'drought',
      why: 'no county-level drought join in data/datacenters.json — nothing to count, and the share is not remembered from a previous run',
    });
    return null;
  }
  if (b.any === 0) {
    skips.data.push({ id: 'drought', why: `${b.joined} sites joined to a county and none of those counties is at D1 or worse` });
    return null;
  }
  const share = Math.round((b.any / b.joined) * 100);
  const mapDay = prettyDay(b.map_date);
  const readAt = b.generated_at && !Number.isNaN(Date.parse(b.generated_at)) ? b.generated_at : state.generated_at;

  // THREE PHRASINGS.
  //   0 (preferred) share first, denominator inside the same sentence. The
  //     denominator is the thing every reply attacks, so it goes where it
  //     cannot be cropped out of a screenshot.
  //   1 counts first, no percentage. Reads as a tally rather than a statistic,
  //     and a tally is harder to accuse of being massaged.
  //   2 severity first. Use this one when D2-or-worse is the larger number in
  //     the news that week; it is the sharpest of the three and the easiest to
  //     over-read, which is why it is not the default.
  const lead = c.say('drought', [
    `${share} percent of mapped US datacentres — ${fmtInt(b.any)} of ${fmtInt(b.joined)} — are in a county at D1 drought or worse.`,
    `${fmtInt(b.any)} of the ${fmtInt(b.joined)} mapped US datacentres sit in a county at D1 drought or worse.`,
    `${fmtInt(b.severe)} of ${fmtInt(b.joined)} mapped US datacentres are in a county at D2 drought or worse, ${fmtInt(b.any)} at D1 or worse.`,
  ]);
  const worstLine = b.worst && b.worst.row?.county
    ? (() => {
      const nm = safeExternalText(`${b.worst.row.county}${b.worst.row.state ? `, ${b.worst.row.state}` : ''}`);
      const cat = DROUGHT_CATEGORY_ORDER[b.worst.rank].toUpperCase();
      return nm ? O(`Worst county on the map with a site in it: ${nm}, ${Math.round(b.worst.share)} percent of its area at ${cat}.`) : null;
    })()
    : null;

  return post(c, {
    kind: 'drought',
    priority: 35,
    variant: 'landscape',
    preferredCard: 'drought',
    rationale: 'The most pasteable number this project owns. The denominator and the area caveat are in the copy, not in a footnote, so the obvious reply is already answered.',
    lines: [
      R(lead),
      // Phrasing 2 already carries the D2 figure in its first line; adding it
      // again would read as a stutter.
      c.say('drought', [
        O(`${fmtInt(b.severe)} of them are in a county at D2 or worse.`),
        O(`${fmtInt(b.severe)} of them are in a county at D2 or worse.`),
        null,
      ]),
      // The caveat and the clock are REQUIRED. A drought share without "county
      // area, not site draw" beside it is the sentence a hostile quote-tweet
      // is built out of, and it costs thirty-four characters to close.
      R('That is county area, not site draw.'),
      R(`US Drought Monitor, ${mapDay ? `${mapDay} map, ` : ''}joined at ${compactStamp(readAt)}.`),
      // Colour, in the order it should survive a squeeze.
      O('Pins are OpenStreetMap’s: a site missing from the map means nobody mapped it.'),
      O('Nothing public reports what any datacentre draws.'),
      worstLine,
      R(`Arithmetic at ${spoken}.`),
    ],
  });
}

// ---------------------------------------------------------------------------
// (m) THE RACE — named people, live odds, one leaderboard
// ---------------------------------------------------------------------------
//
// data/race.json ranks labs on a live Polymarket event. This is the template
// most likely to be screenshotted into a group chat, because the subject is
// people rather than pillars, and it is the template most likely to be argued
// with, because the reader can go and take the other side of the trade.
//
// Two rigour rules, both easy to break by accident:
//   - A price belongs to the LAB, never to the person. "Dario Amodei 73.5
//     percent" attributes a company's market odds to a human being and is
//     false. It is always "<person>'s <lab>".
//   - The event's own title is quoted from the venue, never paraphrased into
//     something it did not ask. If the title trips a post guard, the post does
//     not ship.
export function resolveRace(opts = {}) {
  const r = opts.race ?? null;
  if (!r || typeof r !== 'object' || !Array.isArray(r.players)) return null;
  const legs = r.players
    .filter((p) => p && p.market && p.market.state === 'live' && Number.isFinite(p.market.probability))
    .map((p) => ({
      id: typeof p.id === 'string' ? p.id : String(p.name ?? ''),
      name: typeof p.name === 'string' ? p.name : null,
      principal: typeof p.principal === 'string' ? p.principal : null,
      probability: p.market.probability * 100,
      change_7d: Number.isFinite(p.market.change_7d) && p.market.change_7d_state === 'live'
        ? p.market.change_7d * 100 : null,
      volume_usd: Number.isFinite(p.market.volume_usd) ? p.market.volume_usd : null,
      rank: Number.isFinite(p.rank) ? p.rank : Number.MAX_SAFE_INTEGER,
    }))
    .filter((p) => p.name)
    .sort((a, b) => b.probability - a.probability || a.rank - b.rank || a.id.localeCompare(b.id));
  if (legs.length < RACE_MIN_LIVE_LEGS) return null;
  const horizon = r.markets?.polymarket?.horizon ?? null;
  const volume = legs.reduce((sum, p) => sum + (p.volume_usd ?? 0), 0);
  return {
    legs,
    venue: r.markets?.polymarket?.ok ? 'Polymarket' : null,
    title: typeof horizon?.title === 'string' ? horizon.title : null,
    volume_usd: volume > 0 ? volume : null,
    generated_at: typeof r.generated_at === 'string' ? r.generated_at : null,
  };
}

// "Demis Hassabis" -> "Demis Hassabis'", "Sam Altman" -> "Sam Altman's".
function possessive(name) {
  const s = String(name).trim();
  if (!s) return s;
  return /s$/i.test(s) ? `${s}’` : `${s}’s`;
}

// The venue writes "Which company has best AI model end of 2026?". It is quoted
// VERBATIM, minus the question mark, because a leaderboard whose question has
// been reworded is a leaderboard of nothing. Paraphrasing it would be the exact
// thing marketLabel() refuses to do one screen up.
function raceSubject(title) {
  if (typeof title !== 'string') return null;
  const base = stripUrls(title).replace(/\s+/g, ' ').trim().replace(/\?+$/, '').trim();
  if (base.length < 8) return null;
  return safeExternalText(base);
}

// "12:26 UTC, 25 Sep 2026" — prettyStamp without the weekday. Used only where
// the line is already at its character ceiling; it still satisfies the exact-
// UTC-stamp rule, which is what the weekday was never doing.
function compactStamp(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new TypeError(`compactStamp: unparsable date ${iso}`);
  return `${utcClock(iso)}, ${d.getUTCDate()} ${MON_T[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// The two required lines, as [opener, leaderboard]. Split out because racePost
// has to COST a candidate board before it commits to one.
//
// THREE PHRASINGS. All three carry the venue's own question verbatim, because a
// leaderboard without its question is a leaderboard of nothing.
//   0 (preferred) question, clock, then the people and their prices. It is the
//     only one of the three a stranger can forward with no context, and the
//     people are what make it forwardable at all.
//   1 gap first. Sharpest when first and second are far apart — it is an
//     arithmetic fact about two prices and claims nothing beyond that.
//   2 money first, which answers "who cares what a betting site thinks" before
//     the reader has finished typing it.
//
// Note "<person>'s <lab>" throughout: the price belongs to the LAB. Writing
// "Dario Amodei 73.5 percent" would attribute a company's market odds to a
// human being, and would simply be false.
function raceLines(c, { named, subject, venue, stamp, gap, money }) {
  const withPeople = `${named[0].label} ${named[0].pct} percent, ${named.slice(1).map((x) => `${x.label} ${x.pct}`).join(', ')}.`;
  const plain = `${named[0].plain} ${named[0].pct} percent, ${named.slice(1).map((x) => `${x.plain} ${x.pct}`).join(', ')}.`;
  const opener = `${venue}, “${subject}”, ${stamp}:`;
  return c.say('race', [
    [opener, withPeople],
    gap === null
      ? [opener, plain]
      : [`${Math.abs(gap).toFixed(1)} points separate first and second on ${venue}’s “${subject}”, ${stamp}:`, plain],
    money === null ? [opener, withPeople] : [`${money} is posted on ${venue}’s “${subject}”, ${stamp}:`, withPeople],
  ]);
}

function racePost(c) {
  const { state, spoken, skips } = c;
  const r = c.race;
  if (!r) return null;
  const subject = raceSubject(r.title);
  if (subject === null) {
    skips.data.push({ id: 'race', why: 'the venue’s own event title trips a post guard, and it is quoted or not used' });
    return null;
  }
  const nameOf = (p) => {
    const nm = safeExternalText(p.name);
    const who = p.principal ? safeExternalText(p.principal) : null;
    if (!nm) return null;
    return { label: who ? `${possessive(who)} ${nm}` : nm, plain: nm, pct: round1(p.probability).toFixed(1) };
  };
  const readAt = r.generated_at && !Number.isNaN(Date.parse(r.generated_at)) ? r.generated_at : state.generated_at;
  const money = r.volume_usd === null ? null : fmtVolume(r.volume_usd, 'usd');
  const gap = r.legs.length >= 2 ? round1(r.legs[0].probability - r.legs[1].probability) : null;
  const venue = r.venue ?? 'The venue';
  const stamp = compactStamp(readAt);

  // BOTH lines of this template are required — a leaderboard cannot shed half
  // its names to fit and still be a leaderboard — so the board SHRINKS rather
  // than overflowing. Four names, then three, then two. A longer lab name or a
  // longer venue question next week costs a seat on the board, not a build.
  let named = null;
  let lines = null;
  for (let n = RACE_BOARD_MAX; n >= 2; n -= 1) {
    const slice = r.legs.slice(0, n).map(nameOf);
    if (slice.some((x) => x === null)) {
      skips.data.push({ id: 'race', why: 'a lab or principal name trips a post guard' });
      return null;
    }
    const trial = raceLines(c, { named: slice, subject, venue, stamp, gap, money });
    const cost = charCount(trial[0]) + charCount(trial[1]) + charCount(`Arithmetic at ${spoken}.`) + 2;
    if (cost <= c.limit) { named = slice; lines = trial; break; }
  }
  // Not even two names and the question fit. That is a real answer — a
  // leaderboard of one is not a leaderboard — so the post does not ship and
  // the reason is recorded rather than the board being silently truncated.
  if (lines === null) {
    skips.data.push({ id: 'race', why: 'the venue question plus two lab names does not fit one post at this character limit' });
    return null;
  }

  return post(c, {
    kind: 'race',
    priority: 38,
    variant: 'landscape',
    preferredCard: 'race',
    rationale: 'People, not pillars. The one template a reader can disagree with by placing a trade, which is the most argued-with kind of number there is.',
    lines: [
      R(lines[0]),
      R(lines[1]),
      money === null ? null : O(`${money} on the book across ${fmtInt(r.legs.length)} legs.`),
      O('Prices, not a ranking.'),
      R(`Arithmetic at ${spoken}.`),
    ],
  });
}

// ---------------------------------------------------------------------------
// (n) DEVELOPING — a cluster carrying incident language
// ---------------------------------------------------------------------------
//
// data/news.json groups items into stories and scores each on SEVERITY TERMS:
// literal words found in the title and summary, each with its tier and weight.
// This template reports those words as what they are — the sources' own
// vocabulary — and never as our assessment of anything.
//
// That distinction is the entire template. "Three outlets used the word breach"
// is a measurement of published language. "A serious breach" is a judgement
// this index does not make. The first is checkable in one click, which is why
// it travels.
export function resolveStories(state, opts = {}) {
  const raw = opts.stories ?? opts.newsRaw?.stories ?? state?.news?.stories ?? null;
  const stories = Array.isArray(raw) ? raw : [];
  const rawItems = Array.isArray(opts.newsRaw?.items) ? opts.newsRaw.items : [];
  const titles = new Map();
  for (const i of rawItems) {
    if (i && typeof i.id === 'string' && typeof i.title === 'string') titles.set(i.id, i.title);
  }
  return { stories, titles };
}

function developingPost(c) {
  const { state, spoken, skips } = c;
  if (isUnavailable(state)) return null;
  const { stories, titles } = c.storyLayer;
  const nowMs = Date.parse(state.generated_at);
  const maxAge = c.newsMaxAgeHours;

  const eligible = stories.filter((s) => {
    if (!s || !Array.isArray(s.members)) return false;
    if (!Number.isFinite(s.source_count) || s.source_count < DEVELOPING_MIN_SOURCES) return false;
    if (!Number.isFinite(s.severity) || s.severity <= 0) return false;
    const t = Date.parse(s.last_published_at);
    if (!Number.isFinite(t) || !Number.isFinite(nowMs)) return false;
    const age = (nowMs - t) / 3600000;
    return age >= -2 && age <= maxAge;
  }).sort((a, b) => (
    b.severity - a.severity
    || b.source_count - a.source_count
    || Date.parse(b.last_published_at) - Date.parse(a.last_published_at)
    || String(a.id).localeCompare(String(b.id))
  )).slice(0, DEVELOPING_CANDIDATES);

  if (eligible.length === 0) return null;

  for (const s of eligible) {
    // Terms are external text like everything else. A term that trips a guard —
    // "warning" is on the severity list and on the banned list — is dropped,
    // and the story is still posted with the terms that survive. Dropping the
    // whole story for one word would silently bias this template toward
    // quieter language.
    const byWeight = [...(Array.isArray(s.severity_terms) ? s.severity_terms : [])]
      .filter((t) => t && typeof t.term === 'string')
      .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0) || String(a.term).localeCompare(String(b.term)));
    const terms = [];
    for (const t of byWeight) {
      const safe = safeExternalText(t.term);
      if (safe === null) continue;
      const lower = safe.toLowerCase();
      if (!terms.includes(lower)) terms.push(lower);
      if (terms.length >= DEVELOPING_TERMS_MAX) break;
    }
    if (terms.length === 0) {
      skips.data.push({ id: String(s.id), why: 'every severity term in the cluster trips a post guard, and a term is quoted or omitted' });
      continue;
    }

    const firstIso = s.first_published_at || state.generated_at;
    const span = Number.isFinite(s.span_hours) ? s.span_hours : null;
    const spanPhrase = span === null
      ? null
      : (span < 1
        ? `${Math.max(1, Math.round(span * 60))} minutes`
        : `${round1(span).toFixed(1)} hours`);
    const n = fmtInt(s.source_count);

    // THREE PHRASINGS.
    //   0 (preferred) cluster first, quote second. The first line is a
    //     measurement — a count and a span — so it survives alone, and the
    //     quote arrives as evidence rather than as the headline.
    //   1 words first. The most arresting of the three and the one that most
    //     invites "those are just words", which is exactly the argument we
    //     want, because the answer is yes, that is what is being counted.
    //   2 quote first, count after. Use it when the headline is strong enough
    //     to carry itself; it reads least like an index and most like a wire.
    const idx = phrasingIndex('developing', state.generated_at, 3);
    const termList = joinList(terms);
    const skeleton = (h) => [
      `${n} outlets${spanPhrase ? ` over ${spanPhrase}` : ''}, one event, first at ${compactStamp(firstIso)}: ${h}`,
      `Their words, not ours: ${termList}. ${n} outlets on one event, first at ${compactStamp(firstIso)}: ${h}`,
      `${h} ${n} outlets${spanPhrase ? ` over ${spanPhrase}` : ''}, first at ${compactStamp(firstIso)}.`,
    ][idx];
    const termsLine = idx === 1 ? null : `Their words, not ours: ${termList}.`;

    const fixed = [skeleton('.'), termsLine, `Arithmetic at ${spoken}.`].filter(Boolean).join(' ');
    const budget = c.limit - charCount(fixed) - 2;
    const lead = titles.get(s.lead) ?? null;
    const headline = clampSafe(lead, budget);
    if (headline === null) {
      skips.data.push({ id: String(s.id), why: 'the cluster’s lead headline trips a post guard or does not fit the budget' });
      continue;
    }

    return post(c, {
      kind: 'developing',
      priority: 28,
      variant: 'portrait',
      preferredCard: 'developing',
      key: String(s.id),
      rationale: 'Counts published language rather than judging an event. "Three outlets used the word breach" is checkable in one click, which is why it travels.',
      lines: [
        R(skeleton(sentence(headline))),
        termsLine ? R(termsLine) : null,
        O(`Composite ${fmt1(state.score)} of 100, DOOMCON ${state.level}.`),
        R(`Arithmetic at ${spoken}.`),
      ],
    });
  }
  return null;
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

// card_variant must stay inside this set. site/post-sheet.mjs looks the preview
// up as CARDS[post.card_variant] and only ever holds the two gauge cards; a
// template returning "news-portrait" there would render a broken console with
// no error anywhere. The richer suggestion travels as card_preferred, which the
// console can adopt whenever it is ready to.
export const CARD_VARIANTS = Object.freeze(['landscape', 'portrait']);

function post(c, spec) {
  if (!CARD_VARIANTS.includes(spec.variant)) {
    throw new Error(`template "${spec.kind}" asked for card_variant "${spec.variant}"; only ${CARD_VARIANTS.join(' and ')} exist in the posting console`);
  }
  const text = assemble(spec.lines, c.limit);
  preflight(text, c.limit); // throws — nothing leaves this module unchecked

  // The attribution is the last sentence of every template without exception,
  // which is what makes a one-line swap safe. Asserting it here means a
  // template that forgets it fails at generation rather than shipping a post
  // that names no source for its own arithmetic.
  const { api, manual, link } = c.tails;
  if (!text.endsWith(api)) {
    throw new Error(
      `template "${spec.kind}" does not end with the attribution line ("${api}"). ` +
      'Every post names where its arithmetic is, and the two variants are swapped on that sentence.',
    );
  }
  const manualText = `${text.slice(0, text.length - api.length)}${manual}`;
  preflightManual(manualText, link, c.limit);

  const idStamp = c.state.generated_at.replace(/[:.]/g, '-');
  return {
    id: `${spec.kind}${spec.key ? `-${String(spec.key).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}` : ''}-${idStamp}`,
    kind: spec.kind,
    priority: spec.priority,
    // `text` stays the API variant so every existing consumer — site/post-sheet
    // .mjs among them — keeps its link-free guarantee without a change. The
    // clickable one is a new field beside it, and it is the one v1 posts.
    text,
    text_api: text,
    text_manual: manualText,
    link,
    chars: charCount(text),
    chars_api: charCount(text),
    chars_manual: charCount(manualText),
    variants: {
      api: { text, chars: charCount(text), link: null },
      manual: { text: manualText, chars: charCount(manualText), link },
    },
    char_limit: c.limit,
    card_variant: spec.variant,
    card_preferred: spec.preferredCard || spec.variant,
    rationale: spec.rationale,
  };
}

/**
 * state    — data/state.json, parsed
 * opts.brand    — from card.loadBrand(); defaults to DEFAULT_BRAND
 * opts.history  — data/history.ndjson parsed to [{generated_at, score, level}]
 * opts.notable  — [{ source, label, pillar, value, unit?, observed_at?, baseline?, percentile? }]
 * opts.charLimit, opts.changeWindowMs, opts.slateSpacingMs
 */
export function buildPosts(state, opts = {}) {
  assertState(state);
  const brand = opts.brand || DEFAULT_BRAND;
  const history = Array.isArray(opts.history) ? opts.history : [];
  const notable = Array.isArray(opts.notable) ? opts.notable : [];
  const limit = Number.isFinite(opts.charLimit) ? opts.charLimit : X_CHAR_LIMIT;
  const allNews = resolveNews(state, opts);
  // Only items fresh enough to be called "the day's". topNewsItem() applies the
  // same window, so the two templates cannot disagree about what today is.
  const nowIso = state.generated_at;
  const maxAge = Number.isFinite(opts.newsMaxAgeHours) ? opts.newsMaxAgeHours : NEWS_MAX_AGE_HOURS;
  const freshItems = allNews.items.filter((i) => {
    const t = Date.parse(i.published_at);
    if (!Number.isFinite(t)) return false;
    const age = (Date.parse(nowIso) - t) / 3600000;
    return age >= -2 && age <= maxAge;
  });
  const skips = { news: [], markets: [], data: [] };
  const tails = attributionTails(brand);
  // Both variants share one body, so the body is budgeted against whichever
  // tail is LONGER. Today the spelled Pages address is longer than the link;
  // the day doomcon.watch is registered the link becomes the longer of the two
  // and this line quietly reverses, with no template touched.
  const tailSlack = Math.max(0, charCount(tails.manual) - charCount(tails.api));
  const c = {
    state, brand, history, notable, skips, tails,
    limit: limit - tailSlack,
    usedNewsItemId: null,
    news: { generated_at: allNews.generated_at, items: freshItems },
    newsMaxAgeHours: maxAge,
    markets: collectMarkets(state, opts),
    build: resolveDatacenters(opts),
    race: resolveRace(opts),
    storyLayer: resolveStories(state, opts),
    spoken: tails.spoken,
    delta: resolveDelta(state, history),
    // Phrasing picker. Kept on the context so a template says which template it
    // is exactly once, and so the whole slate reads from one clock.
    say: (kind, options) => options[phrasingIndex(kind, state.generated_at, options.length)],
  };

  const dark = darkPillars(state);
  const posts = [];

  // CONTRACT.md: "post generation is suppressed entirely when two or more
  // pillars are dark". Read literally that would gag the index on exactly the
  // day it most needs to explain itself, so the suppression applies to the
  // INDEX posts and the honesty post still fires. Nothing that quotes a
  // composite score ships while half the inputs are missing.
  if (dark.length >= 2) {
    posts.push(degradedPost(c));
    const darkOnly = pillarsInOrder(state).filter((p) => p.dark).length;
    return {
      suppressed: true,
      reason: darkOnly === dark.length
        ? `${dark.length} pillars dark`
        : `${dark.length} pillars unusable (${darkOnly} dark, ${dark.length - darkOnly} awaiting a frozen baseline)`,
      delta: c.delta,
      news_considered: c.news.items.length, markets_considered: c.markets.length, skipped: skips,
      posts: schedule(posts, state, opts),
    };
  }

  const change = levelChange(state, opts);
  if (change) posts.push(change.escalation ? escalationPost(c, change) : deescalationPost(c, change));

  const milestone = milestonePost(c);
  if (milestone) posts.push(milestone);

  const spike = pillarSpikePost(c);
  if (spike) posts.push(spike);

  // News layer. topNewsPost goes first so corroborationPost knows which item is
  // already spoken for and does not post the same headline twice in one slate.
  const topNews = topNewsPost(c);
  if (topNews) posts.push(topNews);
  const corroboration = corroborationPost(c, c.usedNewsItemId ?? null);
  if (corroboration) posts.push(corroboration);

  const market = marketMovePost(c);
  if (market) posts.push(market);

  const developing = developingPost(c);
  if (developing) posts.push(developing);

  const race = racePost(c);
  if (race) posts.push(race);

  const drought = droughtPost(c);
  if (drought) posts.push(drought);

  posts.push(...notablePosts(c));

  const weekly = weeklyPost(c);
  if (weekly) posts.push(weekly);

  posts.push(dailyPost(c));

  if (isDegraded(state)) posts.push(degradedPost(c));

  return {
    suppressed: false, reason: null, delta: c.delta,
    news_considered: c.news.items.length, markets_considered: c.markets.length, skipped: skips,
    posts: schedule(posts, state, opts),
  };
}

// Best-first, then spaced. A second post inside one 48-hour window competes with
// the first for the same slot in For You, so the slate is deliberately thin and
// deliberately spread.
function schedule(posts, state, opts) {
  const spacing = Number.isFinite(opts.slateSpacingMs) ? opts.slateSpacingMs : SLATE_SPACING_MS;
  const base = Date.parse(state.generated_at);
  return posts
    .slice()
    .sort((a, b) => a.priority - b.priority || a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id))
    .map((p, i) => {
      const at = new Date(base + i * spacing);
      return {
        ...p,
        rank: i + 1,
        suggested_at: at.toISOString(),
        suggested_at_human: prettyStamp(at.toISOString()),
        expires_at: new Date(at.getTime() + FEED_LIFETIME_MS).toISOString(),
        reach_note: i === 0
          ? 'Post first. Full slate, nothing competing with it.'
          : `Hold ${Math.round((i * spacing) / 3600000)} hours. A second post in one window reaches about half as far.`,
      };
    });
}

export default {
  buildPosts, preflight, preflightManual, assertNoUrl, assertOnlyCanonicalUrl,
  assertNoFutureTense, charCount, spokenUrl, canonicalLink, attributionTails, phrasingIndex,
  safeExternalText, clampSafe, normaliseMarkets, collectMarkets, marketLabel, resolveNews,
  resolveStories, resolveRace, resolveDatacenters,
};

// ---------------------------------------------------------------------------
// Unit tests, in the module, because the module is the thing they protect.
//
// CONTRACT.md asks for a unit test on the banned-word rule. Keeping it here
// rather than in a test/ directory means it travels with the rule, runs with
// zero tooling, and cannot be deleted without deleting the rule it guards.
//   node collector/posts.mjs --test
// ---------------------------------------------------------------------------

function fixtureState(over = {}) {
  return {
    schema: 1,
    generated_at: '2026-09-23T02:00:00.000Z',
    score: 61.4,
    level: 3,
    level_name: 'ELEVATED',
    previous_level: 4,
    level_since: '2026-09-23T02:00:00.000Z',
    degraded: false,
    dark_pillars: [],
    pillars: [
      { id: 'capability', score: 71.2, percentile: 0.93, sources_ok: 4, sources_total: 4, dark: false },
      { id: 'compute', score: 58.1, percentile: 0.71, sources_ok: 3, sources_total: 3, dark: false },
      { id: 'attention', score: 49.6, percentile: 0.55, sources_ok: 2, sources_total: 3, dark: false },
      { id: 'governance', score: 64.0, percentile: 0.82, sources_ok: 2, sources_total: 2, dark: false },
      { id: 'markets', score: 44.3, percentile: 0.41, sources_ok: 2, sources_total: 2, dark: false },
      ...(over.extraPillars || []),
    ],
    sources: Array.from({ length: 14 }, (_, i) => ({ id: `s${i}`, ok: i < 13, age_seconds: 400, last_ok: '2026-09-23T02:00:00.000Z' })),
    ...over,
  };
}

export function selfTest() {
  const results = [];
  const check = (name, fn) => {
    try { fn(); results.push({ name, ok: true }); }
    catch (err) { results.push({ name, ok: false, error: err.message }); }
  };
  const throws = (fn, label) => {
    let threw = false;
    try { fn(); } catch { threw = true; }
    if (!threw) throw new Error(`expected a throw: ${label}`);
  };
  const eq = (a, b, label) => { if (a !== b) throw new Error(`${label}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };

  // --- Rule 1: URLs ---------------------------------------------------------
  check('rejects https scheme', () => throws(() => assertNoUrl('see https://doomcon.watch now at 02:00 UTC'), 'https'));
  check('rejects http scheme', () => throws(() => assertNoUrl('http://example.com'), 'http'));
  check('rejects www host', () => throws(() => assertNoUrl('www.doomcon.watch'), 'www'));
  check('rejects bare brand domain', () => throws(() => assertNoUrl('more at doomcon.watch'), 'bare domain'));
  check('rejects bare .com', () => throws(() => assertNoUrl('read pizzint.com for detail'), '.com'));
  check('rejects t.co short link', () => throws(() => assertNoUrl('via t.co/abc123'), 't.co'));
  check('rejects an email address', () => throws(() => assertNoUrl('mail ops@doomcon.watch'), 'email'));
  check('rejects arXiv category slug (documented trap)', () => throws(() => assertNoUrl('new cs.AI submissions'), 'cs.AI'));
  check('allows the spelled domain', () => { assertNoUrl('Arithmetic at doomcon dot watch.'); });
  check('allows decimals', () => { assertNoUrl('Composite 61.4 of 100, up 2.1'); });
  check('allows a version string', () => { assertNoUrl('engine 1.0.0'); });
  check('allows an X handle', () => { assertNoUrl('as @PenPizzaReport does'); });
  check('allows grouped integers', () => { assertNoUrl('6,016 submissions'); });

  // --- Rule 2: future tense -------------------------------------------------
  for (const w of BANNED_FUTURE_WORDS) {
    check(`rejects contract-banned "${w}"`, () => throws(() => assertNoFutureTense(`activity ${w} at 02:00 UTC`), w));
  }
  check('rejects "we\'ll" contraction', () => throws(() => assertNoFutureTense("we'll see at 02:00 UTC"), "we'll"));
  check('rejects "upcoming"', () => throws(() => assertNoFutureTense('upcoming release'), 'upcoming'));
  check('rejects "about to"', () => throws(() => assertNoFutureTense('about to cross'), 'about to'));
  check('rejects case-insensitively', () => throws(() => assertNoFutureTense('Activity WILL rise'), 'WILL'));
  check('allows "prediction markets" (documented exemption)', () => { assertNoFutureTense('prediction markets moved'); });
  check('does not false-positive on "willing"', () => { assertNoFutureTense('willing participants'); });
  check('does not false-positive on "incoming"', () => { assertNoFutureTense('incoming readings recorded'); });

  // --- Rule 3: timestamp and length ----------------------------------------
  check('rejects a post with no UTC stamp', () => throws(() => preflight('DOOMCON 3, ELEVATED.'), 'no stamp'));
  check('rejects an over-length post', () => throws(() => preflight(`x`.repeat(300) + ' 02:00 UTC'), 'too long'));
  check('charCount counts ASCII as 1', () => eq(charCount('abcde'), 5, 'charCount'));

  // --- Generated output -----------------------------------------------------
  const state = fixtureState();
  const history = Array.from({ length: 60 }, (_, i) => ({
    generated_at: new Date(Date.parse(state.generated_at) - (60 - i) * 3600 * 1000).toISOString(),
    score: 50 + (i % 11),
    level: 50 + (i % 11) >= 55 ? 3 : 4,
  }));

  check('daily post always exists', () => {
    const { posts } = buildPosts(state, { history });
    if (!posts.some((p) => p.kind === 'daily')) throw new Error('no daily post');
  });
  check('every generated post passes preflight', () => {
    const { posts } = buildPosts(state, {
      history,
      notable: [{ source: 'arxiv', label: 'arXiv AI submissions', pillar: 'capability', value: 6016, unit: 'in 24 hours', baseline: 4180 }],
    });
    if (posts.length === 0) throw new Error('no posts generated');
    for (const p of posts) preflight(p.text, p.char_limit);
  });
  check('every generated post is inside the limit', () => {
    const { posts } = buildPosts(state, { history });
    for (const p of posts) if (p.chars > X_CHAR_LIMIT) throw new Error(`${p.kind} is ${p.chars} chars`);
  });
  check('every generated post carries an exact UTC stamp', () => {
    const { posts } = buildPosts(state, { history });
    for (const p of posts) assertHasUtcStamp(p.text);
  });
  check('escalation fires on a fresh level change', () => {
    const { posts } = buildPosts(state, { history });
    if (!posts.some((p) => p.kind === 'escalation')) throw new Error('no escalation post');
  });
  check('a stale level change produces no change post', () => {
    const stale = fixtureState({ level_since: '2026-09-20T02:00:00.000Z' });
    const { posts } = buildPosts(stale, { history });
    if (posts.some((p) => p.kind === 'escalation' || p.kind === 'deescalation')) throw new Error('stale change posted');
  });
  check('de-escalation fires when the level rises numerically', () => {
    const down = fixtureState({ level: 4, previous_level: 3, score: 52.8 });
    const { posts } = buildPosts(down, { history });
    if (!posts.some((p) => p.kind === 'deescalation')) throw new Error('no de-escalation post');
  });
  check('two dark pillars suppress everything but the honesty post', () => {
    const degraded = fixtureState({
      degraded: true,
      dark_pillars: ['markets', 'governance'],
      pillars: fixtureState().pillars.map((p) => (
        p.id === 'markets' || p.id === 'governance'
          ? { ...p, dark: true, score: null, sources_ok: 0 }
          : p
      )),
    });
    const out = buildPosts(degraded, { history });
    eq(out.suppressed, true, 'suppressed flag');
    eq(out.posts.length, 1, 'post count');
    eq(out.posts[0].kind, 'degraded', 'post kind');
  });
  check('one dark pillar still produces a slate plus an honesty post', () => {
    const one = fixtureState({
      degraded: true,
      dark_pillars: ['markets'],
      pillars: fixtureState().pillars.map((p) => (p.id === 'markets' ? { ...p, dark: true, score: null } : p)),
    });
    const out = buildPosts(one, { history });
    eq(out.suppressed, false, 'suppressed flag');
    if (!out.posts.some((p) => p.kind === 'degraded')) throw new Error('no honesty post');
    if (!out.posts.some((p) => p.kind === 'daily')) throw new Error('no daily post');
  });
  check('output is deterministic', () => {
    const a = JSON.stringify(buildPosts(state, { history }));
    const b = JSON.stringify(buildPosts(state, { history }));
    eq(a, b, 'two runs');
  });
  check('slate is ordered best-first and spaced', () => {
    const { posts } = buildPosts(state, { history });
    for (let i = 1; i < posts.length; i += 1) {
      if (posts[i].priority < posts[i - 1].priority) throw new Error('out of priority order');
      const gap = Date.parse(posts[i].suggested_at) - Date.parse(posts[i - 1].suggested_at);
      eq(gap, SLATE_SPACING_MS, 'spacing');
    }
  });
  check('a notable item with a bad shape throws, it is not skipped', () => {
    throws(() => buildPosts(state, { history, notable: [{ label: 'x', pillar: 'capability' }] }), 'bad notable');
  });
  check('a missing pillar in state throws', () => {
    const broken = fixtureState({ pillars: fixtureState().pillars.filter((p) => p.id !== 'markets') });
    throws(() => buildPosts(broken, { history }), 'missing pillar');
  });
  check('all pillars dark: one honest post, no score quoted', () => {
    const blank = fixtureState({
      score: null, level: null, level_name: 'UNAVAILABLE', degraded: true,
      dark_pillars: [...PILLAR_ORDER],
      pillars: fixtureState().pillars.map((p) => ({ ...p, dark: true, score: null, percentile: null, sources_ok: 0 })),
      sources: fixtureState().sources.map((s2) => ({ ...s2, ok: false })),
    });
    const out = buildPosts(blank, { history });
    eq(out.suppressed, true, 'suppressed');
    eq(out.posts.length, 1, 'post count');
    eq(out.posts[0].kind, 'degraded', 'kind');
    if (/of 100/.test(out.posts[0].text)) throw new Error('quoted a composite with every pillar dark');
    if (/\bnull\b/.test(out.posts[0].text)) throw new Error('leaked a null into post copy');
    preflight(out.posts[0].text);
  });
  check('null score with live pillars is rejected, not rendered', () => {
    const bogus = fixtureState({ score: null, level: null });
    throws(() => buildPosts(bogus, { history }), 'inconsistent null score');
  });
  check('delta is null, never 0, with no history', () => {
    const { delta } = buildPosts(state, { history: [] });
    eq(delta, null, 'delta with no history');
  });

  // --- Rule 1b: the two variants ------------------------------------------
  //
  // The defect these guard: every post used to end at a domain the project does
  // not own. Both variants now derive from brand.canonicalUrl, and the api
  // variant is still forbidden a link.
  const PAGES = Object.freeze({
    name: 'DOOMCON', domain: 'doomcon.watch', tagline: 'x',
    canonicalUrl: 'https://messagegabrielhere-lgtm.github.io/doomcon',
  });

  check('spokenUrl speaks an apex domain', () => eq(spokenUrl('https://doomcon.watch'), 'doomcon dot watch', 'apex'));
  check('spokenUrl speaks hyphens and paths, so it can be typed', () => {
    eq(spokenUrl(PAGES.canonicalUrl), 'messagegabrielhere dash lgtm dot github dot io slash doomcon', 'pages url');
  });
  check('spokenUrl of the spelled form carries no URL', () => { assertNoUrl(spokenUrl(PAGES.canonicalUrl)); });
  check('canonicalLink drops a trailing slash and any query', () => {
    eq(canonicalLink({ canonicalUrl: 'https://doomcon.watch/?a=1' }), 'https://doomcon.watch', 'normalised');
  });
  check('canonicalLink returns null for an unparsable url', () => eq(canonicalLink({ canonicalUrl: 'not a url' }), null, 'null'));
  check('the tails come from canonicalUrl, not from the aspirational domain', () => {
    // THE DEFECT, as a test. brand.domain says doomcon.watch; the site is not
    // served there. Neither variant may name it.
    const t = attributionTails(PAGES);
    if (/doomcon dot watch/.test(t.api)) throw new Error('api variant spells a domain the project does not own');
    if (t.manual !== `Arithmetic at ${PAGES.canonicalUrl}`) throw new Error(`manual tail is ${t.manual}`);
  });

  check('every post carries both variants', () => {
    const { posts } = buildPosts(state, { brand: PAGES, history });
    if (posts.length === 0) throw new Error('no posts');
    for (const p of posts) {
      for (const v of POST_VARIANTS) {
        if (typeof p.variants?.[v]?.text !== 'string' || p.variants[v].text.length === 0) {
          throw new Error(`${p.kind} has no ${v} variant`);
        }
      }
      eq(p.text, p.variants.api.text, `${p.kind} text is the api variant`);
      eq(p.text_manual, p.variants.manual.text, `${p.kind} text_manual`);
    }
  });
  check('the api variant is still rejected if it carries a URL', () => {
    const { posts } = buildPosts(state, { brand: PAGES, history });
    for (const p of posts) {
      assertNoUrl(p.variants.api.text);
      throws(() => assertNoUrl(`${p.variants.api.text} https://doomcon.watch`), 'url smuggled into api variant');
    }
  });
  check('the manual variant carries the canonical link, once', () => {
    const { posts } = buildPosts(state, { brand: PAGES, history });
    for (const p of posts) {
      eq(p.link, PAGES.canonicalUrl, `${p.kind} link`);
      if (!p.variants.manual.text.includes(PAGES.canonicalUrl)) throw new Error(`${p.kind} manual variant has no link`);
      assertOnlyCanonicalUrl(p.variants.manual.text, PAGES.canonicalUrl);
    }
  });
  check('a manual variant carrying a FOREIGN url is rejected', () => {
    throws(
      () => assertOnlyCanonicalUrl(`Read at 02:00 UTC. ${PAGES.canonicalUrl} and also https://evil.com`, PAGES.canonicalUrl),
      'foreign url',
    );
  });
  check('a manual variant with no link at all is rejected', () => {
    throws(() => preflightManual('DOOMCON 4 at 02:00 UTC.', PAGES.canonicalUrl), 'missing link');
  });
  check('future tense is rejected in BOTH variants', () => {
    throws(() => preflight('activity will rise, 02:00 UTC'), 'api');
    throws(() => preflightManual(`activity will rise, 02:00 UTC ${PAGES.canonicalUrl}`, PAGES.canonicalUrl), 'manual');
    const { posts } = buildPosts(state, { brand: PAGES, history });
    for (const p of posts) for (const v of POST_VARIANTS) assertNoFutureTense(p.variants[v].text);
  });
  check('both variants carry an exact UTC stamp and fit the limit', () => {
    const { posts } = buildPosts(state, { brand: PAGES, history });
    for (const p of posts) {
      for (const v of POST_VARIANTS) {
        assertHasUtcStamp(p.variants[v].text);
        if (p.variants[v].chars > X_CHAR_LIMIT) throw new Error(`${p.kind} ${v} is ${p.variants[v].chars} chars`);
      }
    }
  });
  check('the two variants differ ONLY in the final sentence', () => {
    const { posts } = buildPosts(state, { brand: PAGES, history });
    const tails = attributionTails(PAGES);
    for (const p of posts) {
      const a = p.variants.api.text;
      const m = p.variants.manual.text;
      if (!a.endsWith(tails.api)) throw new Error(`${p.kind} api variant does not end with the attribution`);
      if (!m.endsWith(tails.manual)) throw new Error(`${p.kind} manual variant does not end with the link`);
      eq(a.slice(0, a.length - tails.api.length), m.slice(0, m.length - tails.manual.length), `${p.kind} body`);
    }
  });
  check('a short domain still fits: the body is budgeted against the longer tail', () => {
    // DEFAULT_BRAND is the apex domain, where the LINK is longer than the
    // spelled form — the reverse of today. Both variants must still fit.
    const { posts } = buildPosts(state, { history });
    for (const p of posts) {
      for (const v of POST_VARIANTS) if (p.variants[v].chars > X_CHAR_LIMIT) throw new Error(`${p.kind} ${v} over limit`);
      preflight(p.variants.api.text);
      preflightManual(p.variants.manual.text, p.link);
    }
  });

  // --- Phrasings ------------------------------------------------------------
  check('phrasingIndex is deterministic for one timestamp', () => {
    eq(phrasingIndex('daily', state.generated_at, 3), phrasingIndex('daily', state.generated_at, 3), 'same day');
  });
  check('phrasingIndex reaches all three phrasings across a fortnight', () => {
    const seen = new Set();
    for (let i = 0; i < 14; i += 1) {
      seen.add(phrasingIndex('daily', new Date(Date.parse(state.generated_at) + i * 86400000).toISOString(), 3));
    }
    eq(seen.size, 3, 'phrasings reached');
  });
  check('the preferred phrasing is used more than the others', () => {
    let pref = 0;
    for (let i = 0; i < 20; i += 1) {
      if (phrasingIndex('daily', new Date(Date.parse(state.generated_at) + i * 86400000).toISOString(), 3) === 0) pref += 1;
    }
    if (pref !== 10) throw new Error(`preferred phrasing used ${pref} of 20 days, expected 10`);
  });
  check('two templates do not switch phrasing on the same day', () => {
    // Not a guarantee for every pair on every day — an offset, not a lock. The
    // claim is only that the offsets differ, so the whole slate cannot rotate
    // in lockstep.
    const kinds = ['daily', 'drought', 'race', 'developing', 'corroboration', 'top-news'];
    const idx = kinds.map((k) => phrasingIndex(k, state.generated_at, 3));
    if (new Set(idx).size === 1) throw new Error('every template picked the same phrasing');
  });

  // --- The three new templates ---------------------------------------------
  const dcFixture = {
    generated_at: '2026-09-23T02:00:00.000Z',
    resources_index: {
      usdm_map_date: '2026-09-18',
      drought_by_county: {
        '01069': { county: 'Houston County', state: 'AL', map_date: '2026-09-18', area_pct: { none: 0, d0: 40, d1: 30, d2: 10, d3: 0, d4: 0 } },
        '48371': { county: 'Pecos County', state: 'TX', map_date: '2026-09-18', area_pct: { none: 0, d0: 10, d1: 20, d2: 30, d3: 40, d4: 0 } },
        '06037': { county: 'Los Angeles County', state: 'CA', map_date: '2026-09-18', area_pct: { none: 100, d0: 0, d1: 0, d2: 0, d3: 0, d4: 0 } },
      },
    },
    sites: [
      { id: 'a', resources: { drought: { granularity: 'county', county_fips: '01069' } } },
      { id: 'b', resources: { drought: { granularity: 'county', county_fips: '48371' } } },
      { id: 'c', resources: { drought: { granularity: 'county', county_fips: '06037' } } },
      { id: 'd', resources: { drought: { granularity: 'state', state: 'NV' } } },
    ],
  };

  check('drought post fires from a live county join', () => {
    const { posts } = buildPosts(state, { brand: PAGES, history, datacenters: dcFixture });
    const p = posts.find((x) => x.kind === 'drought');
    if (!p) throw new Error('no drought post');
    // 3 sites joined, 2 of them in a county at D1 or worse, 2 at D2 or worse.
    if (!/2 of 3/.test(p.text) && !/67 percent/.test(p.text)) throw new Error(`figures wrong: ${p.text}`);
    if (!/18 Sep 2026/.test(p.text)) throw new Error('no map date');
    preflight(p.variants.api.text);
    preflightManual(p.variants.manual.text, p.link);
  });
  check('drought post names county AREA, never a site', () => {
    const { posts } = buildPosts(state, { brand: PAGES, history, datacenters: dcFixture });
    const p = posts.find((x) => x.kind === 'drought');
    if (!/county area, not site draw/.test(p.text)) throw new Error('the area caveat was dropped as optional; it is required');
    for (const v of POST_VARIANTS) {
      if (!/county area, not site draw/.test(p.variants[v].text)) throw new Error(`the caveat is missing from the ${v} variant`);
    }
  });
  check('an empty drought join produces NO post and a recorded reason', () => {
    const empty = { ...dcFixture, resources_index: { ...dcFixture.resources_index, drought_by_county: {} } };
    const out = buildPosts(state, { brand: PAGES, history, datacenters: empty });
    if (out.posts.some((x) => x.kind === 'drought')) throw new Error('posted a drought share with no drought data');
    if (!out.skipped.data.some((s) => s.id === 'drought')) throw new Error('skipped without saying why');
  });
  check('no datacenters file at all produces no drought post', () => {
    const out = buildPosts(state, { brand: PAGES, history });
    if (out.posts.some((x) => x.kind === 'drought')) throw new Error('drought post with no data');
  });

  const raceFixture = {
    generated_at: '2026-09-23T02:00:00.000Z',
    markets: { polymarket: { ok: true, horizon: { title: 'Which company has best AI model end of 2026?' } } },
    players: [
      { id: 'anthropic', name: 'Anthropic', principal: 'Dario Amodei', rank: 1, market: { state: 'live', probability: 0.735, change_7d: 0.01, change_7d_state: 'live', volume_usd: 168734 } },
      { id: 'openai', name: 'OpenAI', principal: 'Sam Altman', rank: 2, market: { state: 'live', probability: 0.095, change_7d: -0.015, change_7d_state: 'live', volume_usd: 135064 } },
      { id: 'google-deepmind', name: 'Google DeepMind', principal: 'Demis Hassabis', rank: 3, market: { state: 'live', probability: 0.095, change_7d: -0.005, change_7d_state: 'live', volume_usd: 89797 } },
      { id: 'xai', name: 'xAI', principal: 'Elon Musk', rank: 4, market: { state: 'live', probability: 0.0275, change_7d: -0.0045, change_7d_state: 'live', volume_usd: 115916 } },
    ],
  };

  check('race post fires and names the people', () => {
    const { posts } = buildPosts(state, { brand: PAGES, history, race: raceFixture });
    const p = posts.find((x) => x.kind === 'race');
    if (!p) throw new Error('no race post');
    if (!/Elon Musk|Dario Amodei|Sam Altman/.test(p.text)) throw new Error('no named principal');
    preflight(p.variants.api.text);
    preflightManual(p.variants.manual.text, p.link);
  });
  check('race post prices the LAB, never the person', () => {
    const { posts } = buildPosts(state, { brand: PAGES, history, race: raceFixture });
    const p = posts.find((x) => x.kind === 'race');
    // "Dario Amodei 73.5" would attribute a company's odds to a human. The
    // possessive has to be there.
    if (/Dario Amodei \d/.test(p.text)) throw new Error('attributed a market price to a person');
  });
  check('race post quotes the venue question verbatim', () => {
    const { posts } = buildPosts(state, { brand: PAGES, history, race: raceFixture });
    const p = posts.find((x) => x.kind === 'race');
    if (!/Which company has best AI model end of 2026/.test(p.text)) throw new Error('the question was reworded or dropped');
  });
  check('race post shrinks the board rather than overflowing', () => {
    const long = {
      ...raceFixture,
      players: raceFixture.players.map((p) => ({ ...p, name: `${p.name} Research Incorporated` })),
    };
    const full = buildPosts(state, { brand: PAGES, history, race: raceFixture }).posts.find((x) => x.kind === 'race');
    const { posts } = buildPosts(state, { brand: PAGES, history, race: long });
    const p = posts.find((x) => x.kind === 'race');
    if (!p) throw new Error('race post vanished instead of shrinking');
    if (p.chars > X_CHAR_LIMIT) throw new Error(`${p.chars} chars`);
    const seats = (t) => (t.match(/percent|, /g) || []).length;
    if (seats(p.text) >= seats(full.text)) throw new Error('the board did not shrink');
  });
  check('a board that cannot fit at all does not ship a truncated one', () => {
    const absurd = {
      ...raceFixture,
      players: raceFixture.players.map((p) => ({ ...p, name: `${p.name} Superintelligence Research Laboratories International` })),
    };
    const out = buildPosts(state, { brand: PAGES, history, race: absurd });
    if (out.posts.some((x) => x.kind === 'race')) throw new Error('shipped a leaderboard that does not fit');
    if (!out.skipped.data.some((s) => s.id === 'race')) throw new Error('skipped without saying why');
  });
  check('too few live legs is not a leaderboard', () => {
    const thin = { ...raceFixture, players: raceFixture.players.slice(0, 2) };
    const { posts } = buildPosts(state, { brand: PAGES, history, race: thin });
    if (posts.some((x) => x.kind === 'race')) throw new Error('posted a two-horse leaderboard');
  });
  check('a dark market leg is never priced', () => {
    const dark = {
      ...raceFixture,
      players: raceFixture.players.map((p) => (p.id === 'xai' ? { ...p, market: { ...p.market, state: 'dark', probability: null } } : p)),
    };
    const { posts } = buildPosts(state, { brand: PAGES, history, race: dark });
    const p = posts.find((x) => x.kind === 'race');
    if (p && /xAI/.test(p.text)) throw new Error('priced a dark leg');
  });

  const storyFixture = {
    items: [
      { id: 'i1', title: 'OpenAI discovered the Australian breach in August and told the government on September 10' },
      { id: 'i2', title: 'Second outlet on the same disclosure' },
    ],
    stories: [{
      id: 'st1',
      members: ['i1', 'i2'],
      sources: ['arstechnica-ai', 'techmeme', 'verge-ai'],
      source_count: 3,
      severity: 1,
      severity_terms: [
        { term: 'breach', tier: 'a', weight: 1 },
        { term: 'warning', tier: 'c', weight: 0.9 },   // banned word: dropped, story kept
        { term: 'hacked', tier: 'a', weight: 0.8 },
      ],
      first_published_at: '2026-09-23T00:30:00.000Z',
      last_published_at: '2026-09-23T01:40:00.000Z',
      span_hours: 1.2,
      lead: 'i1',
    }],
  };

  check('developing post fires on a cluster carrying incident language', () => {
    const { posts } = buildPosts(state, { brand: PAGES, history, newsRaw: storyFixture });
    const p = posts.find((x) => x.kind === 'developing');
    if (!p) throw new Error('no developing post');
    if (!/breach/.test(p.text)) throw new Error('no severity term quoted');
    preflight(p.variants.api.text);
    preflightManual(p.variants.manual.text, p.link);
  });
  check('a banned severity term is dropped, the story is not', () => {
    const { posts } = buildPosts(state, { brand: PAGES, history, newsRaw: storyFixture });
    const p = posts.find((x) => x.kind === 'developing');
    if (/warning/i.test(p.text)) throw new Error('a banned term reached the post');
    if (!/hacked/.test(p.text)) throw new Error('the surviving terms were dropped with the banned one');
  });
  check('a cluster with no severity is not "developing"', () => {
    const calm = { ...storyFixture, stories: [{ ...storyFixture.stories[0], severity: 0, severity_terms: [] }] };
    const { posts } = buildPosts(state, { brand: PAGES, history, newsRaw: calm });
    if (posts.some((x) => x.kind === 'developing')) throw new Error('posted a calm cluster as developing');
  });
  check('a single-sourced cluster is not "developing"', () => {
    const one = { ...storyFixture, stories: [{ ...storyFixture.stories[0], source_count: 1 }] };
    const { posts } = buildPosts(state, { brand: PAGES, history, newsRaw: one });
    if (posts.some((x) => x.kind === 'developing')) throw new Error('one outlet is not a corroborated cluster');
  });
  check('a stale cluster is not today’s news', () => {
    const old = {
      ...storyFixture,
      stories: [{ ...storyFixture.stories[0], first_published_at: '2026-09-01T00:00:00.000Z', last_published_at: '2026-09-01T01:00:00.000Z' }],
    };
    const { posts } = buildPosts(state, { brand: PAGES, history, newsRaw: old });
    if (posts.some((x) => x.kind === 'developing')) throw new Error('posted a three-week-old cluster');
  });

  check('the new templates are suppressed with the rest when two pillars are dark', () => {
    const degraded = fixtureState({
      degraded: true,
      dark_pillars: ['markets', 'governance'],
      pillars: fixtureState().pillars.map((p) => (
        p.id === 'markets' || p.id === 'governance' ? { ...p, dark: true, score: null, sources_ok: 0 } : p
      )),
    });
    const out = buildPosts(degraded, { brand: PAGES, history, race: raceFixture, datacenters: dcFixture, newsRaw: storyFixture });
    eq(out.posts.length, 1, 'post count');
    eq(out.posts[0].kind, 'degraded', 'kind');
  });
  check('everything still deterministic with all three data layers present', () => {
    const opts = { brand: PAGES, history, race: raceFixture, datacenters: dcFixture, newsRaw: storyFixture };
    eq(JSON.stringify(buildPosts(state, opts)), JSON.stringify(buildPosts(state, opts)), 'two runs');
  });

  return results;
}

// ---------------------------------------------------------------------------
// CLI:  node collector/posts.mjs --test
//       node collector/posts.mjs [state.json] [history.ndjson]
// ---------------------------------------------------------------------------

async function main(argv) {
  if (argv.includes('--test')) {
    const results = selfTest();
    const failed = results.filter((r) => !r.ok);
    for (const r of results) {
      process.stdout.write(`${r.ok ? 'ok  ' : 'FAIL'}  ${r.name}${r.ok ? '' : `\n        ${r.error}`}\n`);
    }
    process.stdout.write(`\n${results.length - failed.length}/${results.length} passed\n`);
    if (failed.length) process.exit(1);
    return;
  }

  const { readFile, readdir } = await import('node:fs/promises');
  const { loadBrand, loadNews } = await import('./card.mjs');
  const statePath = argv[0] || 'data/state.json';
  const historyPath = argv[1] || 'data/history.ndjson';
  const newsPath = argv[2] || 'data/news.json';
  const state = JSON.parse(await readFile(statePath, 'utf8'));
  let history = [];
  try {
    const raw = await readFile(historyPath, 'utf8');
    history = raw.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    process.stderr.write(`[posts] no ${historyPath} yet — delta and weekly/record posts are omitted, not faked.\n`);
  }

  // The market rows live in the per-source `meta` of the newest raw snapshot.
  // data/state.json does not carry `meta`, so reading the snapshot is the only
  // way to reach top_markets / top_contributors without inventing them.
  let readings = [];
  try {
    const dir = 'data/raw';
    const names = (await readdir(dir)).filter((n) => n.endsWith('.json')).sort();
    if (names.length) {
      const snap = JSON.parse(await readFile(`${dir}/${names[names.length - 1]}`, 'utf8'));
      if (Array.isArray(snap.readings)) readings = snap.readings;
    }
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    process.stderr.write('[posts] no data/raw snapshot — the market-move post is omitted, not faked.\n');
  }

  const { brand } = await loadBrand();
  const { news } = await loadNews(newsPath);

  // The story clusters and the two sibling indices. Each is optional: a missing
  // file removes its template from the slate and says so, and never leaves a
  // remembered number behind.
  const optional = async (path, label) => {
    try {
      return JSON.parse(await readFile(path, 'utf8'));
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
      process.stderr.write(`[posts] no ${path} — the ${label} post is omitted, not faked.\n`);
      return null;
    }
  };
  const newsRaw = await optional(newsPath, 'developing');
  const race = await optional('data/race.json', 'race');
  const datacenters = await optional('data/datacenters.json', 'drought');

  const out = buildPosts(state, { brand, history, news, newsRaw, race, datacenters, readings });
  if (out.suppressed) process.stderr.write(`[posts] SUPPRESSED: ${out.reason}\n`);
  process.stderr.write(
    `[posts] ${out.news_considered} fresh news item(s), ${out.markets_considered} market row(s)\n`,
  );
  const tails = attributionTails(brand);
  process.stderr.write(`[posts] api tail: "${tails.api}"\n[posts] manual tail: "${tails.manual}"\n`);
  if (tails.link === null) {
    process.stderr.write('[posts] WARNING: brand.canonicalUrl is missing or unparsable — both variants fell back to the spelled brand domain.\n');
  }
  for (const sk of [...out.skipped.news, ...out.skipped.markets, ...out.skipped.data]) {
    process.stderr.write(`[posts] skipped ${sk.id}: ${sk.why}\n`);
  }
  const only = (argv.find((a) => a.startsWith('--variant=')) || '').slice('--variant='.length) || null;
  for (const p of out.posts) {
    process.stdout.write(`\n--- ${p.rank}. ${p.kind}  (card ${p.card_variant}`
      + `${p.card_preferred !== p.card_variant ? `, prefers ${p.card_preferred}` : ''})\n`);
    process.stdout.write(`    post at ${p.suggested_at_human} | ${p.reach_note}\n`);
    for (const v of POST_VARIANTS) {
      if (only && only !== v) continue;
      process.stdout.write(`\n    [${v}] ${p.variants[v].chars}/${p.char_limit} chars\n${p.variants[v].text}\n`);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2)).catch((err) => {
    process.stderr.write(`posts.mjs failed: ${err.stack || err.message}\n`);
    process.exit(1);
  });
}
