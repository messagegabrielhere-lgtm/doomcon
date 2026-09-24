// Post text generation. Pure: state in, an ordered slate of posts out.
//
// There is no X API in v1. The operator pastes these by hand from his own
// account. That means the safety rails cannot be "the author remembers" — every
// rule below is enforced by a function that THROWS, and selfTest() proves each
// rejection actually fires. Run it: node collector/posts.mjs --test
//
// Two rules pay for themselves immediately:
//   1. No URL in the text. X charges roughly 13x reach for an outbound link
//      ($0.200 vs $0.015 in the leaked ad-equivalent numbers). The domain goes
//      in the card image and is SPELLED in the text. Techmeme has done exactly
//      this for years.
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
function dailyPost(c) {
  const { state, spoken, delta } = c;
  const lvl = LEVELS[state.level];
  const loud = loudestLivePillar(state);
  const tally = sourceTally(state);
  return post(c, {
    kind: 'daily',
    priority: 60,
    variant: 'landscape',
    rationale: 'Fires every day at every level. The calm days are what make the loud ones believable.',
    lines: [
      R(`DOOMCON ${state.level}, ${lvl.name}. Composite ${fmt1(state.score)} of 100${deltaClause(delta)}, as of ${prettyStamp(state.generated_at)}.`),
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

    const carriedLine = item.source_count > 1
      ? `${fmtInt(item.source_count)} independent sources carried it, first at ${prettyStamp(when)}.`
      : `One source carried it, at ${prettyStamp(when)}.`;
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

    const fixed = [
      `${fmtInt(item.source_count)} independent sources carried the same item ${lead}: .`,
      `First at ${prettyStamp(firstIso)}.`,
      `Composite ${fmt1(state.score)} of 100, DOOMCON ${state.level}.`,
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
        R(`${fmtInt(item.source_count)} independent sources carried the same item ${lead}: ${sentence(headline)}`),
        R(`First at ${prettyStamp(firstIso)}.`),
        carriers ? O(carriers) : null,
        R(`Composite ${fmt1(state.score)} of 100, DOOMCON ${state.level}.`),
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
  const idStamp = c.state.generated_at.replace(/[:.]/g, '-');
  return {
    id: `${spec.kind}${spec.key ? `-${String(spec.key).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}` : ''}-${idStamp}`,
    kind: spec.kind,
    priority: spec.priority,
    text,
    chars: charCount(text),
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
  const skips = { news: [], markets: [] };
  const c = {
    state, brand, history, notable, limit, skips,
    usedNewsItemId: null,
    news: { generated_at: allNews.generated_at, items: freshItems },
    markets: collectMarkets(state, opts),
    spoken: spokenDomain(brand.domain),
    delta: resolveDelta(state, history),
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
  buildPosts, preflight, assertNoUrl, assertNoFutureTense, charCount,
  safeExternalText, clampSafe, normaliseMarkets, collectMarkets, marketLabel, resolveNews,
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
  const out = buildPosts(state, { brand, history, news, readings });
  if (out.suppressed) process.stderr.write(`[posts] SUPPRESSED: ${out.reason}\n`);
  process.stderr.write(
    `[posts] ${out.news_considered} fresh news item(s), ${out.markets_considered} market row(s)\n`,
  );
  for (const sk of [...out.skipped.news, ...out.skipped.markets]) {
    process.stderr.write(`[posts] skipped ${sk.id}: ${sk.why}\n`);
  }
  for (const p of out.posts) {
    process.stdout.write(`\n--- ${p.rank}. ${p.kind}  (${p.chars}/${p.char_limit} chars, card ${p.card_variant}`
      + `${p.card_preferred !== p.card_variant ? `, prefers ${p.card_preferred}` : ''})\n`);
    process.stdout.write(`    post at ${p.suggested_at_human} | ${p.reach_note}\n\n${p.text}\n`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2)).catch((err) => {
    process.stderr.write(`posts.mjs failed: ${err.stack || err.message}\n`);
    process.exit(1);
  });
}
