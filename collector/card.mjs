// Share cards as SVG. No rasteriser, no font files, no dependencies.
//
// SVG and not PNG because a PNG needs a rasteriser, and every rasteriser is an
// npm dependency. The browser already owns one: post-sheet.mjs draws this SVG
// into a <canvas> and hands the operator a PNG. Server stays at zero deps.
//
// This module is the LOW layer: brand resolution, state-derived scalars, pixels.
// posts.mjs (the narrative layer) imports from here. The dependency runs one
// way only — never import posts.mjs from this file.
//
// Six variants ship:
//   landscape      1600x900   the X timeline aspect
//   portrait       1080x1350  outperforms landscape on mobile feeds
//   square         1080x1080  the safe aspect for a quote-tweet and for IG
//   news-*         the same three, headlining the day's top corroborated item
//
// The news variants exist only when a usable item arrives from data/news.json.
// A card that says "no news" is not a card, and inventing one would be the exact
// failure this project was built to call out.

import { readFile, access } from 'node:fs/promises';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

// ---------------------------------------------------------------------------
// Brand
// ---------------------------------------------------------------------------

// site/brand.mjs is owned by the site agent and may not exist yet. Pure render
// functions therefore take `brand` as a value and never touch the filesystem;
// loadBrand() is the single impure edge that goes looking for the real one.
export const DEFAULT_BRAND = Object.freeze({
  name: 'DOOMCON',
  domain: 'doomcon.watch',
  tagline: "We don't know anything. We just count.",
  canonicalUrl: 'https://doomcon.watch',
});

// The spelled domain exists so a post can name the site without X charging the
// link surcharge ($0.200 with a link vs $0.015 without). Derived, never stored,
// so swapping `domain` stays the one-line change CONTRACT.md promises.
export function spokenDomain(domain) {
  if (typeof domain !== 'string' || domain.length === 0) {
    throw new TypeError('spokenDomain: brand.domain must be a non-empty string');
  }
  return domain.replace(/\./g, ' dot ');
}

// site/brand.mjs ships SCREAMING_CASE named exports (NAME, DOMAIN, TAGLINE,
// CANONICAL_URL). An earlier version of this function only looked for camelCase
// and silently fell through to DEFAULT_BRAND — which happened to hold the same
// domain, so the bug was invisible until the day someone changed DOMAIN and the
// cards kept printing the old one. Hence: read both conventions, and assert we
// actually found something rather than trusting a coincidence.
const BRAND_ALIASES = {
  name: ['name', 'NAME'],
  domain: ['domain', 'DOMAIN'],
  tagline: ['tagline', 'TAGLINE'],
  canonicalUrl: ['canonicalUrl', 'CANONICAL_URL', 'canonical_url'],
};

function normaliseBrand(raw, { strict = false } = {}) {
  const src = raw && typeof raw === 'object' && raw.default && typeof raw.default === 'object'
    ? { ...raw, ...raw.default }
    : raw;
  const out = {};
  for (const [key, aliases] of Object.entries(BRAND_ALIASES)) {
    const hit = aliases.map((a) => src?.[a]).find((v) => typeof v === 'string' && v.length > 0);
    if (hit === undefined && strict) {
      throw new Error(
        `site/brand.mjs exports none of [${aliases.join(', ')}]. Cards and posts read the ` +
        `domain from there; refusing to fall back silently and print a stale brand.`,
      );
    }
    out[key] = hit === undefined ? DEFAULT_BRAND[key] : hit;
  }
  return Object.freeze(out);
}

// Returns { brand, source } where source is 'site/brand.mjs' or 'default'.
// A MISSING sibling file is an expected state during parallel build-out and is
// reported on stderr, loudly, rather than hidden. Any OTHER import failure
// (syntax error, throwing module) rethrows — we do not paper over broken code.
export async function loadBrand() {
  const url = new URL('../site/brand.mjs', import.meta.url);
  try {
    await access(url);
  } catch {
    process.stderr.write(
      '[card] site/brand.mjs not found — using DEFAULT_BRAND (domain ' +
      DEFAULT_BRAND.domain + '). This is expected only until the site agent lands it.\n',
    );
    return { brand: DEFAULT_BRAND, source: 'default' };
  }
  const mod = await import(url.href);
  // strict: if the file exists, it must actually carry the fields. A present
  // but unreadable brand module is a wiring bug, not a reason to guess.
  return { brand: normaliseBrand(mod, { strict: true }), source: 'site/brand.mjs' };
}

// ---------------------------------------------------------------------------
// Levels and the fixed pillar order
// ---------------------------------------------------------------------------

// Level 5 is calmest. The ramp is DEFCON's, so nobody needs the legend read to
// them: cool at 5, hot at 1.
export const LEVELS = Object.freeze({
  5: { name: 'DORMANT', color: '#2f81f7', band: [0, 34] },
  4: { name: 'ROUTINE', color: '#2ea043', band: [35, 54] },
  3: { name: 'ELEVATED', color: '#d29922', band: [55, 69] },
  2: { name: 'ACCELERATED', color: '#db6d28', band: [70, 84] },
  1: { name: 'UNPRECEDENTED', color: '#f85149', band: [85, 100] },
});

// Left-to-right on the level ramp: calm first, loud last, so the ramp reads the
// same direction as the 0-100 score underneath it.
export const LEVEL_RAMP_ORDER = Object.freeze([5, 4, 3, 2, 1]);

// The score at which each level starts. Drawn as hairlines on the sparkline so
// a reader can see how close a wiggle came to a threshold.
export const BAND_EDGES = Object.freeze([35, 55, 70, 85]);

// CONTRACT.md: fixed ids, fixed order, never renamed, never reordered. The card
// renders from THIS array, not from the order state.json happens to arrive in,
// so a pillar reshuffle upstream cannot silently reorder the bars.
export const PILLAR_ORDER = Object.freeze(['capability', 'compute', 'attention', 'governance', 'markets']);
export const PILLAR_LABELS = Object.freeze({
  capability: 'CAPABILITY',
  compute: 'COMPUTE',
  attention: 'ATTENTION',
  governance: 'GOVERNANCE',
  markets: 'MARKETS',
});

const INK = '#e6edf3';
const INK_DIM = '#8b949e';
const INK_FAINT = '#6e7681';
const BG = '#07080a';
const PANEL = '#0d1117';
const TRACK = '#161b22';
const RULE = '#21262d';
const ON_CHIP = '#06070a';
const DEGRADED_COLOR = '#d29922';
const CALM_COLOR = '#2ea043';

// Nothing on a card may be drawn below this. A card is read as a 400px-wide
// thumbnail in a phone timeline; below ~20px at render size the glyph is a
// smudge. auditCard() enforces it, and selfTest() runs auditCard on every
// variant, so a layout tweak that shrinks a label fails the build.
export const MIN_FONT = 20;
// And the load-bearing numbers — the level digit and the composite — are held
// far above the floor, because they are the entire point of the image.
export const MIN_HERO_FONT = 140;

// collector/engine.mjs emits score:null / level:null / level_name:'UNAVAILABLE'
// when every pillar is dark. That is the one state where printing a confident
// number would be the exact failure this project exists to call out, so it gets
// a first-class rendering rather than a crash or a zero.
export const UNAVAILABLE_LEVEL = Object.freeze({ name: 'UNAVAILABLE', color: '#8b949e', band: null });

export function levelMeta(level) {
  return LEVELS[level] || UNAVAILABLE_LEVEL;
}

export function isUnavailable(state) {
  return state.score === null || state.score === undefined || state.level === null || state.level === undefined;
}

export function levelForScore(score) {
  if (!Number.isFinite(score)) throw new TypeError(`levelForScore: score must be finite, got ${score}`);
  if (score >= 85) return 1;
  if (score >= 70) return 2;
  if (score >= 55) return 3;
  if (score >= 35) return 4;
  return 5;
}

export function colorForScore(score) {
  return LEVELS[levelForScore(score)].color;
}

// ---------------------------------------------------------------------------
// Colour arithmetic — gradients without a colour library
// ---------------------------------------------------------------------------

function hex2rgb(h) {
  const s = String(h).replace('#', '');
  const full = s.length === 3 ? s.split('').map((c) => c + c).join('') : s;
  if (!/^[0-9a-f]{6}$/i.test(full)) throw new TypeError(`hex2rgb: not a hex colour: ${h}`);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}

function rgb2hex(rgb) {
  return `#${rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
}

export function mix(a, b, t) {
  const A = hex2rgb(a);
  const B = hex2rgb(b);
  const k = Math.max(0, Math.min(1, t));
  return rgb2hex(A.map((v, i) => v + (B[i] - v) * k));
}

export function darken(h, t) { return mix(h, '#000000', t); }
export function lighten(h, t) { return mix(h, '#ffffff', t); }

// ---------------------------------------------------------------------------
// State-derived scalars
// ---------------------------------------------------------------------------

function req(obj, key, what) {
  const v = obj?.[key];
  if (v === undefined || v === null) throw new TypeError(`${what}: missing required field "${key}"`);
  return v;
}

// Throws with the exact field name. A card rendered from a half-formed state is
// worse than no card — pizzint's whole failure mode is a confident number over a
// dead pipe.
export function assertState(state) {
  if (!state || typeof state !== 'object') throw new TypeError('state must be an object');
  const gen = req(state, 'generated_at', 'state');
  if (Number.isNaN(Date.parse(gen))) throw new TypeError(`state.generated_at is not a parsable date: ${gen}`);
  if (!Array.isArray(state.pillars)) throw new TypeError('state.pillars must be an array');
  const everyPillarDark = PILLAR_ORDER.every((id) => {
    const p = state.pillars.find((x) => x && x.id === id);
    return p?.dark || p?.uncalibrated;
  });
  if (isUnavailable(state)) {
    // A null score is legitimate only when there is genuinely nothing to score.
    // A null score with live pillars means something upstream dropped a number,
    // and imputing around it is exactly what we refuse to do.
    if (!everyPillarDark) {
      throw new TypeError(
        'state.score/state.level are null but not every pillar is dark. The engine emits a null ' +
        'score only when no pillar is live; this state is inconsistent and will not be rendered.',
      );
    }
  } else {
    if (!Number.isFinite(state.score)) throw new TypeError(`state.score must be a finite number or null, got ${state.score}`);
    if (!LEVELS[state.level]) throw new TypeError(`state.level must be 1..5 or null, got ${state.level}`);
  }
  for (const id of PILLAR_ORDER) {
    const p = state.pillars.find((x) => x && x.id === id);
    if (!p) throw new TypeError(`state.pillars is missing pillar "${id}" (all five are mandatory)`);
    if (!p.dark && !p.uncalibrated && !Number.isFinite(p.score)) {
      throw new TypeError(`pillar "${id}" is not dark but has a non-finite score: ${p.score}`);
    }
  }
  return state;
}

export function pillarsInOrder(state) {
  return PILLAR_ORDER.map((id) => {
    const p = state.pillars.find((x) => x && x.id === id);
    return {
      id,
      label: PILLAR_LABELS[id],
      dark: Boolean(p.dark),
      uncalibrated: Boolean(p.uncalibrated),
      score: (p.dark || p.uncalibrated) ? null : p.score,
      percentile: Number.isFinite(p.percentile) ? p.percentile : null,
      sources_ok: Number.isFinite(p.sources_ok) ? p.sources_ok : null,
      sources_total: Number.isFinite(p.sources_total) ? p.sources_total : null,
    };
  });
}

export function darkPillars(state) {
  return pillarsInOrder(state).filter((p) => p.dark || p.uncalibrated);
}

// Is this state degraded? Trust the engine's flag, but a dark pillar is degraded
// whether or not the flag says so — the two can only disagree if something
// upstream is wrong, and the safe direction is to admit it.
export function isDegraded(state) {
  return Boolean(state.degraded) || darkPillars(state).length > 0;
}

// Source health, for the one header line that tells a reader whether to believe
// the number at all. "Dark" and "awaiting baseline" are DIFFERENT states: a dark
// source is not reporting; an uncalibrated one is reporting fine but has no
// frozen reference distribution to be scored against yet. Collapsing them would
// be the same lie pizzint tells with "status: healthy" at two scrapes a day.
export function sourceHealth(state) {
  if (!Array.isArray(state?.sources) || state.sources.length === 0) return null;
  let ok = 0;
  let uncal = 0;
  let down = 0;
  for (const s of state.sources) {
    if (!s) continue;
    if (s.ok) { ok += 1; continue; }
    if (/^uncalibrated/i.test(String(s.error || ''))) { uncal += 1; continue; }
    down += 1;
  }
  return { ok, uncalibrated: uncal, down, total: state.sources.length };
}

// data/history.ndjson rows are written by collector/engine.mjs as
// { t, score, level, ... }. The fixtures in posts.mjs, and an older draft of
// this file, use `generated_at`. Reading only one of the two is how the delta
// silently became "--" on every live card while every test still passed, so
// both are accepted here and nowhere else.
export function histTime(row) {
  const raw = row?.t ?? row?.generated_at ?? row?.time ?? row?.at;
  const ms = typeof raw === 'number' ? raw : Date.parse(raw);
  return Number.isFinite(ms) ? ms : NaN;
}

export function histScore(row) {
  return Number.isFinite(row?.score) ? row.score : NaN;
}

// Returns a finite number, or null. NEVER 0 as a stand-in for "unknown" — a flat
// delta and a missing delta are different claims and the card prints them
// differently.
export function resolveDelta(state, history = []) {
  if (Number.isFinite(state?.delta_from_previous)) return round1(state.delta_from_previous);
  if (Number.isFinite(state?.delta)) return round1(state.delta);
  if (!Number.isFinite(state?.score)) return null; // no composite, so no change to report
  const prev = previousObservation(state, history);
  if (!prev) return null;
  return round1(state.score - prev.score);
}

// history is data/history.ndjson parsed into objects, any order. We take the
// newest entry strictly older than this state.
export function previousObservation(state, history = []) {
  if (!Array.isArray(history) || history.length === 0) return null;
  const t = Date.parse(state.generated_at);
  let best = null;
  let bestT = -Infinity;
  for (const h of history) {
    if (!h || !Number.isFinite(histScore(h))) continue;
    const ht = histTime(h);
    if (!Number.isFinite(ht) || ht >= t) continue;
    if (ht > bestT) { best = h; bestT = ht; }
  }
  return best;
}

// The trailing composite series, oldest first, with the current state appended.
// Index-spaced, not time-spaced: the caption says "LAST N READINGS" and never
// claims an even time axis, because the collector can skip a run and drawing
// that gap as a straight diagonal would invent motion that did not happen.
export function compositeSeries(history, state, { max = 48 } = {}) {
  const byTime = new Map();
  for (const h of Array.isArray(history) ? history : []) {
    const t = histTime(h);
    const s = histScore(h);
    if (!Number.isFinite(t) || !Number.isFinite(s)) continue;
    byTime.set(t, { t, score: s, level: Number.isFinite(h.level) ? h.level : null });
  }
  const now = Date.parse(state?.generated_at);
  if (Number.isFinite(now) && Number.isFinite(state?.score)) {
    byTime.set(now, { t: now, score: state.score, level: state.level ?? null });
  }
  const rows = [...byTime.values()].sort((a, b) => a.t - b.t);
  return Number.isFinite(max) && max > 0 ? rows.slice(-max) : rows;
}

export function round1(n) {
  if (!Number.isFinite(n)) throw new TypeError(`round1: expected finite number, got ${n}`);
  // Math.round on a negative half rounds toward +Infinity; that asymmetry would
  // make -0.05 and 0.05 disagree in sign. Round magnitude, restore sign.
  const r = Math.round(Math.abs(n) * 10) / 10;
  return n < 0 ? -r : r;
}

export function fmt1(n) {
  return round1(n).toFixed(1);
}

// ASCII only, deliberately. "▲" renders as tofu the moment a generic font stack
// resolves to something without the glyph, and we cannot ship a font file. The
// direction is carried by a drawn polygon (deltaGlyph) as well as by the sign,
// so the card never depends on colour or on a glyph to say which way it moved.
export function fmtDelta(d) {
  if (d === null || d === undefined) return '--';
  const r = round1(d);
  if (r > 0) return `+${r.toFixed(1)}`;
  if (r < 0) return `-${Math.abs(r).toFixed(1)}`;
  return '0.0';
}

export function deltaDirection(d) {
  if (d === null || d === undefined || !Number.isFinite(d)) return null;
  const r = round1(d);
  return r > 0 ? 1 : (r < 0 ? -1 : 0);
}

// Rising = toward a louder index, so it takes the level's own colour. Falling
// takes the calm green. Neither is ever the only cue: deltaGlyph draws the
// direction and fmtDelta prints the sign.
function deltaColor(d, accent) {
  const dir = deltaDirection(d);
  if (dir === null) return INK_FAINT;
  if (dir > 0) return accent;
  if (dir < 0) return CALM_COLOR;
  return INK_DIM;
}

// ---------------------------------------------------------------------------
// The news layer  (data/news.json — owned by another module; we only READ it)
// ---------------------------------------------------------------------------
//
// The live shape, as collector/news.mjs writes it and docs/NEWS.md documents it:
//
//   { "schema": 1, "generated_at": ISO, "items": [ {
//       "id": "8a2455657c62ae51",
//       "source": "techmeme",
//       "title": "...",
//       "pillar": "attention",
//       "published_at": ISO,
//       "score": 40.4,
//       "url": "..."                          read, NEVER printed
//       "meta": { "corroboration": {
//           "count": 2, "sources": ["arstechnica-ai", "hn-ai"],
//           "first_source": "arstechnica-ai",
//           "first_seen_published_at": ISO, "last_published_at": ISO,
//           "lead_minutes": 676,
//           "also": [ { "source": "...", "title": "...", "published_at": ISO } ] } }
//   } ] }
//
// Also accepted, so a shape change upstream degrades instead of breaking:
// `headline` for `title`; a flat `sources: [{id,name,at}]`; explicit
// `source_count` / `window_minutes`; a bare array; { news | top | top_news }.
// Anything we cannot understand is DROPPED, never guessed at.

const NEWS_HEADLINE_MAX = 150;

// Cosmetic only. collector/news-sources/*.mjs own these ids; an id with no
// entry falls back to a title-cased version of itself, so renaming an adapter
// degrades a name rather than breaking a card. Nothing downstream branches on
// the result — posts.mjs still runs every carrier name past the URL guard,
// which is why "GOV.UK" gets dropped from a carrier list and not printed.
const SOURCE_NAMES = Object.freeze({
  'anthropic-status': 'Anthropic status',
  'arstechnica-ai': 'Ars Technica',
  'arxiv-newest': 'arXiv',
  arxiv: 'arXiv',
  deepmind: 'DeepMind',
  'federal-register': 'Federal Register',
  'github-releases': 'GitHub releases',
  'google-ai-blog': 'Google AI blog',
  'hf-daily-papers': 'Hugging Face daily papers',
  'hf-trending-models': 'Hugging Face trending',
  'huggingface-blog': 'Hugging Face blog',
  huggingface: 'Hugging Face',
  'hn-ai': 'Hacker News',
  hn: 'Hacker News',
  kalshi: 'Kalshi',
  manifold: 'Manifold',
  mistral: 'Mistral',
  'mit-news-ai': 'MIT News',
  openai: 'OpenAI',
  openrouter: 'OpenRouter',
  polymarket: 'Polymarket',
  qwen: 'Qwen',
  'sec-fts': 'SEC full-text search',
  techmeme: 'Techmeme',
  'verge-ai': 'The Verge',
  wikipedia: 'Wikipedia',
});

export function prettySourceName(id) {
  if (typeof id !== 'string' || !id.trim()) return null;
  const key = id.trim();
  if (SOURCE_NAMES[key]) return SOURCE_NAMES[key];
  return key.split(/[-_]+/).filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// A URL inside a headline is noise on a card and a live rule violation in a
// post. Removed here, once, so both consumers get the same clean string.
export function stripUrls(s) {
  return String(s)
    .replace(/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, ' ')
    .replace(/(^|\s)www\.\S+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Truncates on a word boundary and marks the cut with an ASCII ellipsis. Never
// mid-word: a half-word can read as a different word, and "openai.co" is a
// domain where "openai.com" was a domain.
export function clampWords(s, maxChars) {
  const t = String(s).trim();
  if (t.length <= maxChars) return t;
  const cut = t.slice(0, maxChars);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > maxChars * 0.5 ? cut.slice(0, sp) : cut).replace(/[\s,;:.-]+$/, '')}...`;
}

function pickIso(...vals) {
  for (const v of vals) {
    if (typeof v === 'string' && !Number.isNaN(Date.parse(v))) return new Date(v).toISOString();
    if (typeof v === 'number' && Number.isFinite(v)) return new Date(v).toISOString();
  }
  return null;
}

function normaliseNewsItem(raw, fallbackIso) {
  if (!raw || typeof raw !== 'object') return null;
  const headlineRaw = raw.headline ?? raw.title ?? raw.text ?? null;
  if (typeof headlineRaw !== 'string') return null;
  const headline = clampWords(stripUrls(headlineRaw), NEWS_HEADLINE_MAX);
  if (headline.length < 8) return null; // a three-word fragment is not a headline

  const pillar = PILLAR_ORDER.includes(raw.pillar) ? raw.pillar : null;
  const published_at = pickIso(raw.published_at, raw.first_seen, raw.observed_at, raw.timestamp, raw.at, fallbackIso);

  // collector/news.mjs puts the carriers under meta.corroboration as bare
  // source ids plus an `also` list. A flat sources[] is still accepted.
  const corr = raw.meta && typeof raw.meta === 'object' && raw.meta.corroboration
    && typeof raw.meta.corroboration === 'object' ? raw.meta.corroboration : null;

  const srcRaw = Array.isArray(raw.sources) ? raw.sources : [];
  const sources = srcRaw.map((s) => {
    if (typeof s === 'string') return { id: s, name: prettySourceName(s) || s, at: null };
    if (!s || typeof s !== 'object') return null;
    const name = typeof s.name === 'string' ? s.name : (typeof s.id === 'string' ? prettySourceName(s.id) : null);
    if (!name) return null;
    return { id: typeof s.id === 'string' ? s.id : name, name, at: pickIso(s.at, s.observed_at, s.published_at) };
  }).filter(Boolean);

  if (sources.length === 0 && corr && Array.isArray(corr.sources)) {
    // Each carrier's own publish time, assembled from the three places
    // collector/news.mjs records one. A carrier with no time recorded keeps
    // at:null rather than borrowing the item's — an invented timestamp would
    // silently narrow the corroboration window, which is the one number this
    // whole layer exists to report.
    const atById = new Map();
    if (typeof raw.source === 'string' && published_at) atById.set(raw.source, published_at);
    for (const a of Array.isArray(corr.also) ? corr.also : []) {
      const iso = pickIso(a?.published_at, a?.at);
      if (a && typeof a.source === 'string' && iso) atById.set(a.source, iso);
    }
    const firstIso = pickIso(corr.first_seen_published_at);
    if (typeof corr.first_source === 'string' && firstIso) atById.set(corr.first_source, firstIso);
    for (const id of corr.sources) {
      if (typeof id !== 'string' || !id) continue;
      sources.push({ id, name: prettySourceName(id) || id, at: atById.get(id) ?? null });
    }
  }

  const countRaw = [raw.source_count, raw.corroborations, raw.corroboration_count, corr?.count]
    .find((v) => Number.isFinite(v));
  const source_count = Number.isFinite(countRaw) ? Math.round(countRaw) : sources.length;

  // Window: how far apart the independent carriers were. Preferred from the
  // layer's own lead_minutes, then recomputed from the carrier timestamps,
  // because a number we can recompute beats a number we were handed.
  let window_minutes = [raw.window_minutes, raw.spread_minutes, raw.window_min, corr?.lead_minutes]
    .find((v) => Number.isFinite(v)) ?? null;
  const times = sources.map((s) => Date.parse(s.at)).filter(Number.isFinite);
  if (window_minutes === null && times.length >= 2) {
    window_minutes = Math.round((Math.max(...times) - Math.min(...times)) / 60000);
  }
  if (Number.isFinite(window_minutes)) window_minutes = Math.max(0, Math.round(window_minutes));
  else window_minutes = null;

  // The earliest independent sighting. docs/NEWS.md's lead-time claim rests on
  // this being the FIRST carrier's time, not the item's own.
  const first_seen_at = pickIso(corr?.first_seen_published_at)
    ?? (times.length ? new Date(Math.min(...times)).toISOString() : published_at);

  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : headline.slice(0, 48),
    headline,
    pillar,
    published_at,
    first_seen_at,
    sources,
    source_count,
    window_minutes,
    rank_score: Number.isFinite(raw.score) ? raw.score : null,
  };
}

// Ordering is fully deterministic — CONTRACT.md §4 forbids an unseeded tiebreak.
// Most corroborated first, because "two independent outlets carried this" is
// the one claim nobody else in the category can compute; then the news layer's
// OWN score, which already folds in source weight, recency and entities, so we
// are not second-guessing collector/news.mjs; then the tightest window; then
// newest; then the id, lexicographically.
function newsOrder(a, b) {
  if (b.source_count !== a.source_count) return b.source_count - a.source_count;
  const ar = a.rank_score === null ? -Infinity : a.rank_score;
  const br = b.rank_score === null ? -Infinity : b.rank_score;
  if (ar !== br) return br - ar;
  const aw = a.window_minutes === null ? Infinity : a.window_minutes;
  const bw = b.window_minutes === null ? Infinity : b.window_minutes;
  if (aw !== bw) return aw - bw;
  const at = Date.parse(a.published_at) || 0;
  const bt = Date.parse(b.published_at) || 0;
  if (at !== bt) return bt - at;
  return a.id.localeCompare(b.id);
}

export function normaliseNews(raw) {
  const container = Array.isArray(raw)
    ? { items: raw }
    : (raw && typeof raw === 'object' ? raw : {});
  const list = [container.items, container.news, container.top, container.top_news, container.headlines]
    .find((v) => Array.isArray(v)) || [];
  const generated_at = pickIso(container.generated_at, container.updated_at);
  const items = list.map((r) => normaliseNewsItem(r, generated_at)).filter(Boolean).sort(newsOrder);
  return { generated_at, items };
}

// The single most corroborated item, optionally restricted to items fresh
// enough to be "the day's". `maxAgeHours: null` disables the freshness filter.
export function topNewsItem(news, { now = null, maxAgeHours = 36 } = {}) {
  const items = (news && Array.isArray(news.items)) ? news.items : [];
  if (items.length === 0) return null;
  const nowMs = now === null ? null : Date.parse(now);
  if (!Number.isFinite(nowMs) || !Number.isFinite(maxAgeHours)) return items[0];
  const fresh = items.filter((i) => {
    const t = Date.parse(i.published_at);
    if (!Number.isFinite(t)) return false;
    const age = (nowMs - t) / 3600000;
    return age >= -2 && age <= maxAgeHours; // -2h of slack for a clock skew
  });
  return fresh.length ? fresh[0] : null;
}

// Reads data/news.json if it exists. A missing file is an expected state while
// the news layer lands, and is reported, not hidden. Returns { news, source }.
export async function loadNews(path = 'data/news.json') {
  try {
    const raw = await readFile(path, 'utf8');
    return { news: normaliseNews(JSON.parse(raw)), source: path };
  } catch (err) {
    if (err.code === 'ENOENT') {
      process.stderr.write(`[card] no ${path} yet — news cards are omitted, not faked.\n`);
      return { news: { generated_at: null, items: [] }, source: null };
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Time formatting (UTC only, always exact)
// ---------------------------------------------------------------------------

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function d2(n) { return String(n).padStart(2, '0'); }

export function utcClock(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new TypeError(`utcClock: unparsable date ${iso}`);
  return `${d2(d.getUTCHours())}:${d2(d.getUTCMinutes())} UTC`;
}

export function utcDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new TypeError(`utcDate: unparsable date ${iso}`);
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function utcStamp(iso) {
  return `${utcClock(iso)} | ${utcDate(iso)}`;
}

// ---------------------------------------------------------------------------
// SVG primitives
// ---------------------------------------------------------------------------

const SANS = 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, DejaVu Sans Mono, Consolas, monospace';

export function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Cap height is ~0.72em across every sane sans face, so a digit block centred in
// [y0,y1] sits on this baseline. dominant-baseline is avoided on purpose: some
// rasterisers ignore it and the number would silently drift off the chip.
function centerBaseline(y0, y1, fontSize) {
  return Math.round((y0 + y1) / 2 + fontSize * 0.36);
}

// Rough advance widths, deliberately biased HIGH. Used only to reserve space
// next to text, so overestimating costs a little whitespace while
// underestimating overlaps two elements — which it did: the DEGRADED pill sat
// on top of the wordmark until these numbers went up. Tracking is counted on
// every character because SVG letter-spacing also trails the last glyph.
export function estWidth(text, fontSize, tracking = 0) {
  let units = 0;
  for (const ch of String(text)) {
    if (ch === ' ') units += 0.32;
    else if ('.,:;\'|!'.includes(ch)) units += 0.32;
    else if ('ijlt'.includes(ch)) units += 0.36;
    else if (ch >= 'a' && ch <= 'z') units += 0.58;
    else if (ch >= '0' && ch <= '9') units += 0.62;
    else units += 0.74; // uppercase and everything unknown
  }
  return units * fontSize + String(text).length * tracking;
}

// Largest size in [min, desired] whose estimated width fits. Used wherever the
// text length is not ours to control — the level name (UNPRECEDENTED is twice
// DORMANT) and every externally supplied headline.
export function fitSize(str, maxW, desired, min = MIN_FONT, tracking = 0) {
  let size = desired;
  while (size > min && estWidth(str, size, tracking) > maxW) size -= 2;
  return Math.max(min, size);
}

export function wrapLines(str, maxW, size, tracking = 0) {
  const words = String(str).split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && estWidth(next, size, tracking) > maxW) { lines.push(cur); cur = w; }
    else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

// Fit a paragraph into a box by shrinking until the wrapped lines fit, then
// hard-clip. The clip is a last resort and marked with an ellipsis; normaliseNews
// already caps the headline length so it should never fire on real input.
export function fitParagraph(str, maxW, maxH, sizeMax, sizeMin, lineHeight = 1.16, tracking = 0) {
  let size = sizeMax;
  for (;;) {
    const lines = wrapLines(str, maxW, size, tracking);
    if (lines.length * size * lineHeight <= maxH || size <= sizeMin) {
      const fit = Math.max(1, Math.floor(maxH / (size * lineHeight)));
      if (lines.length <= fit) return { size, lines, clipped: false };
      const kept = lines.slice(0, fit);
      kept[kept.length - 1] = `${kept[kept.length - 1].replace(/[\s,;:.-]+$/, '')}...`;
      return { size, lines: kept, clipped: true };
    }
    size -= 2;
  }
}

function text(t, { x, y, size, fill = INK, weight = 400, anchor = 'start', family = SANS, tracking = 0, opacity }) {
  const attrs = [
    `x="${x}"`, `y="${y}"`,
    `font-family="${family}"`,
    `font-size="${size}"`,
    `font-weight="${weight}"`,
    `fill="${fill}"`,
    `text-anchor="${anchor}"`,
  ];
  if (tracking) attrs.push(`letter-spacing="${tracking}"`);
  if (opacity !== undefined) attrs.push(`opacity="${opacity}"`);
  return `<text ${attrs.join(' ')}>${esc(t)}</text>`;
}

function rect(x, y, w, h, { fill = 'none', rx = 0, stroke, strokeWidth = 1, opacity } = {}) {
  const attrs = [`x="${x}"`, `y="${y}"`, `width="${w}"`, `height="${h}"`, `fill="${fill}"`];
  if (rx) attrs.push(`rx="${rx}"`);
  if (stroke) attrs.push(`stroke="${stroke}"`, `stroke-width="${strokeWidth}"`);
  if (opacity !== undefined) attrs.push(`opacity="${opacity}"`);
  return `<rect ${attrs.join(' ')} />`;
}

function line(x1, y1, x2, y2, stroke = RULE, w = 2, { dash, opacity } = {}) {
  const attrs = [`x1="${x1}"`, `y1="${y1}"`, `x2="${x2}"`, `y2="${y2}"`, `stroke="${stroke}"`, `stroke-width="${w}"`];
  if (dash) attrs.push(`stroke-dasharray="${dash}"`);
  if (opacity !== undefined) attrs.push(`opacity="${opacity}"`);
  return `<line ${attrs.join(' ')} />`;
}

// A dark pillar is drawn as hatching, not as an empty bar. An empty bar reads as
// "zero activity"; hatching reads as "no reading", which is the truth.
//
// The gradients are the only "graphics" in the visual sense, and they are all
// derived from the level colour so the card restains itself when the level
// changes. Nothing here carries meaning on its own — strip every gradient and
// the card still says the same things.
function defs(accent) {
  return `<defs>
<pattern id="dark-hatch" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
<rect width="12" height="12" fill="${TRACK}" />
<line x1="0" y1="0" x2="0" y2="12" stroke="${INK_FAINT}" stroke-width="4" />
</pattern>
<pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
<path d="M48 0H0V48" fill="none" stroke="#141a22" stroke-width="1" />
</pattern>
<linearGradient id="grad-bg" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${mix(BG, accent, 0.06)}" />
<stop offset="0.55" stop-color="${BG}" />
<stop offset="1" stop-color="#040507" />
</linearGradient>
<linearGradient id="grad-chip" x1="0" y1="0" x2="0.35" y2="1">
<stop offset="0" stop-color="${lighten(accent, 0.2)}" />
<stop offset="1" stop-color="${darken(accent, 0.24)}" />
</linearGradient>
<linearGradient id="grad-spark" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="${accent}" stop-opacity="0.45" />
<stop offset="1" stop-color="${accent}" stop-opacity="0.02" />
</linearGradient>
</defs>`;
}

function backdrop(W, H) {
  return rect(0, 0, W, H, { fill: 'url(#grad-bg)' })
    + rect(0, 0, W, H, { fill: 'url(#grid)', opacity: 0.55 });
}

function degradedPill(x, baselineY, size) {
  const label = 'DEGRADED';
  const w = estWidth(label, size, 4) + size * 1.2;
  const h = size * 1.75;
  const y = baselineY - size * 0.72 - (h - size * 0.72) / 2;
  return [
    rect(x, Math.round(y), Math.round(w), Math.round(h), { fill: DEGRADED_COLOR, rx: Math.round(h / 2) }),
    text(label, { x: Math.round(x + w / 2), y: baselineY, size, fill: ON_CHIP, weight: 800, anchor: 'middle', tracking: 4 }),
  ].join('');
}

// A labelled chip. Used for the pillar tag and the corroboration count on the
// news card. Returns { svg, width } so the caller can lay chips out in a row.
function tagChip(label, x, y, h, { fill = null, stroke = INK_DIM, ink = INK, size = 24 } = {}) {
  const w = Math.round(estWidth(label, size, 3) + size * 1.4);
  const svg = [
    rect(x, y, w, h, fill ? { fill, rx: 6 } : { fill: 'none', rx: 6, stroke, strokeWidth: 2 }),
    text(label, { x: Math.round(x + w / 2), y: centerBaseline(y, y + h, size), size, fill: ink, weight: 800, anchor: 'middle', family: MONO, tracking: 3 }),
  ].join('');
  return { svg, width: w };
}

// Direction as a drawn shape, so the card never leans on colour or on a glyph
// the font might not have. Flat is a bar, not a missing triangle.
function deltaGlyph(cx, cy, size, dir, fill) {
  const h = size, w = size * 1.1;
  if (dir === null) return rect(Math.round(cx - w / 2), Math.round(cy - 3), Math.round(w), 6, { fill, rx: 3, opacity: 0.6 });
  if (dir === 0) return rect(Math.round(cx - w / 2), Math.round(cy - 4), Math.round(w), 8, { fill, rx: 4 });
  const s = dir > 0 ? -1 : 1;
  const pts = [
    [cx, cy + (s * h) / 2],
    [cx - w / 2, cy - (s * h) / 2],
    [cx + w / 2, cy - (s * h) / 2],
  ].map(([px, py]) => `${Math.round(px)},${Math.round(py)}`).join(' ');
  return `<polygon points="${pts}" fill="${fill}" />`;
}

// ---------------------------------------------------------------------------
// The level ramp — where this level sits on the whole scale
// ---------------------------------------------------------------------------
//
// Five segments, calm on the left. The active one is marked THREE ways: full
// opacity, a white outline, and a caret above it. Never colour alone: a
// screenshot run through a monochrome filter, or read by someone with a colour
// vision deficiency, still says which segment is live.
//
// Vertical budget is `h + 16` above (caret and ring) and 30 below (end labels).
function levelRamp(x, y, w, h, level, { digitSize = 36, labelSize = 20 } = {}) {
  const gap = 10;
  const segW = (w - gap * (LEVEL_RAMP_ORDER.length - 1)) / LEVEL_RAMP_ORDER.length;
  const out = [];
  LEVEL_RAMP_ORDER.forEach((lv, i) => {
    const sx = Math.round(x + i * (segW + gap));
    const sw = Math.round(segW);
    const cx = sx + sw / 2;
    const meta = LEVELS[lv];
    const active = lv === level;
    out.push(rect(sx, y, sw, h, { fill: meta.color, rx: 6, opacity: active ? 1 : 0.2 }));
    if (active) {
      out.push(rect(sx - 4, y - 4, sw + 8, h + 8, { fill: 'none', rx: 10, stroke: INK, strokeWidth: 4 }));
      out.push(`<polygon points="${Math.round(cx - 15)},${y - 14} ${Math.round(cx + 15)},${y - 14} ${Math.round(cx)},${y - 1}" fill="${INK}" />`);
    }
    out.push(text(String(lv), {
      x: Math.round(cx), y: centerBaseline(y, y + h, digitSize), size: digitSize,
      fill: active ? ON_CHIP : mix(meta.color, BG, 0.4), weight: 800, anchor: 'middle',
    }));
  });
  out.push(text('5 CALMEST', { x, y: y + h + 28, size: labelSize, fill: INK_FAINT, weight: 600, family: MONO, tracking: 2 }));
  out.push(text('LOUDEST 1', { x: x + w, y: y + h + 28, size: labelSize, fill: INK_FAINT, weight: 600, family: MONO, anchor: 'end', tracking: 2 }));
  if (!LEVELS[level]) {
    out.push(text('NO LEVEL PUBLISHED', {
      x: Math.round(x + w / 2), y: y + h + 28, size: labelSize, fill: DEGRADED_COLOR,
      weight: 800, anchor: 'middle', family: MONO, tracking: 2,
    }));
  }
  return out.join('');
}

// ---------------------------------------------------------------------------
// The sparkline — the card's one claim about MOVEMENT
// ---------------------------------------------------------------------------
//
// A state is a photograph; a trend is a story, and a story is what gets
// screenshotted. Three honesty rules are baked in:
//
//  1. The y-domain never collapses below MIN_SPAN points. Auto-scaling a
//     +/-0.2 wobble to the full panel height would draw a mountain range out of
//     noise — visually the same lie as a truncated y-axis on a news chart.
//  2. Zero readings draws hatching and says AWAITING HISTORY. One reading draws
//     a dot and says exactly that. Neither is a flat line, because a flat line
//     is a claim that nothing moved.
//  3. The x-axis is reading index, not wall-clock, and the caption says so.
//     A skipped collector run is a missing reading, not a quiet hour.
const SPARK_MIN_SPAN = 12;

function sparkPanel(series, { x, y, w, h, accent, delta, title }) {
  const out = [];
  out.push(rect(x, y, w, h, { fill: PANEL, rx: 14, stroke: RULE, strokeWidth: 2, opacity: 0.92 }));

  const padX = 26;
  const headH = 84;
  const plotX = x + padX;
  const plotW = w - padX * 2;
  const plotY = y + headH;
  const plotH = h - headH - 30;

  // Header: the delta, with its drawn direction glyph, and the caption.
  const dir = deltaDirection(delta);
  const dcol = deltaColor(delta, accent);
  const dSize = Math.round(h * 0.19);
  out.push(deltaGlyph(x + padX + dSize * 0.55, y + 42, dSize, dir, dcol));
  out.push(text(fmtDelta(delta), {
    x: Math.round(x + padX + dSize * 1.5), y: y + 42 + Math.round(dSize * 0.36), size: Math.round(dSize * 1.15),
    fill: dcol, weight: 800, family: MONO,
  }));
  out.push(text(delta === null ? 'NO PRIOR READING' : 'SINCE PREVIOUS READING', {
    x: x + w - padX, y: y + 36, size: 21, fill: INK_DIM, weight: 600, family: MONO, anchor: 'end', tracking: 2,
  }));
  out.push(text(title, {
    x: x + w - padX, y: y + 62, size: 21, fill: INK_FAINT, weight: 600, family: MONO, anchor: 'end', tracking: 2,
  }));

  const pts = Array.isArray(series) ? series : [];

  if (pts.length === 0) {
    out.push(rect(plotX, plotY, plotW, plotH, { fill: 'url(#dark-hatch)', rx: 8 }));
    out.push(text('AWAITING HISTORY', {
      x: Math.round(plotX + plotW / 2), y: centerBaseline(plotY, plotY + plotH, 26), size: 26,
      fill: DEGRADED_COLOR, weight: 800, anchor: 'middle', family: MONO, tracking: 2,
    }));
    return out.join('');
  }

  const vals = pts.map((p) => p.score);
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  if (hi - lo < SPARK_MIN_SPAN) {
    const mid = (hi + lo) / 2;
    lo = mid - SPARK_MIN_SPAN / 2;
    hi = mid + SPARK_MIN_SPAN / 2;
  }
  lo = Math.max(0, lo - 2);
  hi = Math.min(100, hi + 2);
  if (hi - lo < 1) { lo = Math.max(0, lo - 1); hi = Math.min(100, hi + 1); }
  const yFor = (v) => plotY + plotH - ((v - lo) / (hi - lo)) * plotH;
  const xFor = (i) => (pts.length === 1 ? plotX + plotW / 2 : plotX + (i / (pts.length - 1)) * plotW);

  // Band edges inside the visible window, so a reader can see how near a
  // threshold the line came.
  for (const edge of BAND_EDGES) {
    if (edge <= lo || edge >= hi) continue;
    const ey = Math.round(yFor(edge));
    out.push(line(plotX, ey, plotX + plotW, ey, INK_FAINT, 1, { dash: '6 8', opacity: 0.5 }));
    out.push(text(String(edge), { x: plotX - 6, y: ey + 7, size: MIN_FONT, fill: INK_FAINT, weight: 600, family: MONO, anchor: 'end' }));
  }

  if (pts.length === 1) {
    const cx = Math.round(xFor(0));
    const cy = Math.round(yFor(vals[0]));
    out.push(`<circle cx="${cx}" cy="${cy}" r="10" fill="${accent}" stroke="${BG}" stroke-width="4" />`);
    out.push(text('1 READING, NO TREND YET', {
      x: Math.round(plotX + plotW / 2), y: plotY + plotH + 24, size: 22,
      fill: DEGRADED_COLOR, weight: 700, anchor: 'middle', family: MONO, tracking: 1,
    }));
    return out.join('');
  }

  const line_ = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${Math.round(xFor(i))} ${Math.round(yFor(p.score))}`).join(' ');
  const base = plotY + plotH;
  out.push(`<path d="${line_} L${Math.round(xFor(pts.length - 1))} ${base} L${Math.round(xFor(0))} ${base} Z" fill="url(#grad-spark)" />`);
  out.push(`<path d="${line_}" fill="none" stroke="${accent}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" />`);

  const lastX = Math.round(xFor(pts.length - 1));
  const lastY = Math.round(yFor(vals[vals.length - 1]));
  out.push(`<circle cx="${lastX}" cy="${lastY}" r="9" fill="${accent}" stroke="${BG}" stroke-width="4" />`);

  out.push(text(`${pts.length} READINGS`, {
    x: plotX, y: plotY + plotH + 24, size: 21, fill: INK_FAINT, weight: 600, family: MONO, tracking: 1,
  }));
  out.push(text(`LOW ${fmt1(Math.min(...vals))}  HIGH ${fmt1(Math.max(...vals))}`, {
    x: plotX + plotW, y: plotY + plotH + 24, size: 21, fill: INK_FAINT, weight: 600, family: MONO, anchor: 'end', tracking: 1,
  }));
  return out.join('');
}

// ---------------------------------------------------------------------------
// Pillar bars
// ---------------------------------------------------------------------------

// A tick at the 50 mark. Without a reference, a bar at 62 and a bar at 44 look
// like "long" and "short" rather than "above" and "below".
function midTick(trackX, trackW, y, h) {
  const tx = Math.round(trackX + trackW * 0.5);
  return line(tx, y + 2, tx, y + h - 2, BG, 2, { opacity: 0.55 });
}

function pillarBarVertical(p, x, w, topY, barH) {
  const labelY = topY - 14;
  const trackY = topY;
  const valueY = trackY + barH + 34;
  const out = [text(p.label, { x, y: labelY, size: 22, fill: INK_DIM, weight: 600, family: MONO, tracking: 2 })];
  if (p.dark || p.uncalibrated) {
    out.push(rect(x, trackY, w, barH, { fill: 'url(#dark-hatch)', rx: 6 }));
    out.push(text(p.uncalibrated ? 'NO BASELINE' : 'DARK',
      { x, y: valueY, size: p.uncalibrated ? 22 : 26, fill: DEGRADED_COLOR, weight: 800, family: MONO, tracking: 1 }));
  } else {
    out.push(rect(x, trackY, w, barH, { fill: TRACK, rx: 6 }));
    const fillW = Math.max(6, Math.round((Math.min(100, Math.max(0, p.score)) / 100) * w));
    out.push(rect(x, trackY, fillW, barH, { fill: colorForScore(p.score), rx: 6 }));
    out.push(midTick(x, w, trackY, barH));
    out.push(text(fmt1(p.score), { x, y: valueY, size: 26, fill: INK, weight: 700, family: MONO }));
  }
  return out.join('');
}

function pillarRowHorizontal(p, x, labelW, trackX, trackW, y, h, rightX) {
  const baseline = centerBaseline(y, y + h, 24);
  const out = [text(p.label, { x, y: baseline, size: 24, fill: INK_DIM, weight: 600, family: MONO, tracking: 1 })];
  if (p.dark || p.uncalibrated) {
    // The label sits in the value column, so the hatch stops short of it. Drawn
    // full-width it ran underneath the word and the two fought each other.
    const label = p.uncalibrated ? 'NO BASELINE' : 'DARK';
    const size = p.uncalibrated ? 22 : 24;
    const hatchW = Math.max(40, Math.round(trackW - estWidth(label, size) - (rightX - trackX - trackW) - 18));
    out.push(rect(trackX, y, hatchW, h, { fill: 'url(#dark-hatch)', rx: 5 }));
    out.push(text(label,
      { x: rightX, y: baseline, size, fill: DEGRADED_COLOR, weight: 800, family: MONO, anchor: 'end' }));
  } else {
    out.push(rect(trackX, y, trackW, h, { fill: TRACK, rx: 5 }));
    const fillW = Math.max(5, Math.round((Math.min(100, Math.max(0, p.score)) / 100) * trackW));
    out.push(rect(trackX, y, fillW, h, { fill: colorForScore(p.score), rx: 5 }));
    out.push(midTick(trackX, trackW, y, h));
    out.push(text(fmt1(p.score), { x: rightX, y: baseline, size: 24, fill: INK, weight: 700, family: MONO, anchor: 'end' }));
  }
  return out.join('');
}

// The one line that says whether to believe the number. Three different states,
// three different words — never one "healthy".
function healthLine(state) {
  const h = sourceHealth(state);
  if (!h) return null;
  const parts = [`${h.ok}/${h.total} SOURCES LIVE`];
  if (h.uncalibrated > 0) parts.push(`${h.uncalibrated} AWAITING BASELINE`);
  if (h.down > 0) parts.push(`${h.down} DARK`);
  return parts.join('  |  ');
}

// ---------------------------------------------------------------------------
// Landscape 1600x900 — the X timeline aspect
// ---------------------------------------------------------------------------

export function renderCardLandscape(state, opts = {}) {
  assertState(state);
  const brand = opts.brand || DEFAULT_BRAND;
  const delta = opts.delta === undefined ? null : opts.delta;
  const series = Array.isArray(opts.series) ? opts.series : [];
  const W = 1600, H = 900, M = 72, R = W - M;
  const lvl = levelMeta(state.level);
  const blank = isUnavailable(state);
  const pillars = pillarsInOrder(state);
  const degraded = isDegraded(state);

  const body = [];
  body.push(defs(lvl.color));
  body.push(backdrop(W, H));

  // Header
  body.push(text(brand.name, { x: M, y: 80, size: 54, fill: INK, weight: 800, tracking: 12 }));
  if (degraded) body.push(degradedPill(M + Math.round(estWidth(brand.name, 54, 12)) + 40, 74, 24));
  body.push(text(utcStamp(state.generated_at), { x: R, y: 76, size: 26, fill: INK_DIM, weight: 500, family: MONO, anchor: 'end' }));
  const health = healthLine(state);
  if (health) body.push(text(health, { x: R, y: 110, size: 22, fill: INK_FAINT, weight: 600, family: MONO, anchor: 'end', tracking: 1 }));
  body.push(line(M, 132, R, 132));

  // Hero: the level chip is the thumbnail. One digit, one colour block, legible
  // at 120px wide in a phone timeline — which is the only size that matters.
  const chipX = M, chipY = 156, chipW = 300, chipH = 396;
  body.push(rect(chipX, chipY, chipW, chipH, { fill: 'url(#grad-chip)', rx: 16 }));
  body.push(text(brand.name, { x: chipX + chipW / 2, y: chipY + 74, size: 30, fill: ON_CHIP, weight: 800, anchor: 'middle', tracking: 6, opacity: 0.78 }));
  body.push(text(blank ? '--' : String(state.level), {
    x: chipX + chipW / 2, y: centerBaseline(chipY + 96, chipY + chipH - 24, blank ? 190 : 292),
    size: blank ? 190 : 292, fill: ON_CHIP, weight: 800, anchor: 'middle',
  }));

  const colX = chipX + chipW + 56;
  body.push(text(lvl.name, { x: colX, y: 248, size: fitSize(lvl.name, R - colX, 92, 44, 2), fill: lvl.color, weight: 800, tracking: 2 }));
  body.push(text('ACTIVITY TEMPO AGAINST ITS OWN HISTORY', { x: colX, y: 294, size: 23, fill: INK_FAINT, weight: 600, family: MONO, tracking: 2 }));

  body.push(text(blank ? '--' : fmt1(state.score), { x: colX, y: 474, size: 176, fill: blank ? INK_FAINT : INK, weight: 800 }));
  body.push(text(blank ? 'NO COMPOSITE PUBLISHED' : 'COMPOSITE, 0-100', { x: colX, y: 518, size: 24, fill: INK_DIM, weight: 600, family: MONO, tracking: 3 }));

  body.push(sparkPanel(series, {
    x: 960, y: 324, w: R - 960, h: 228, accent: lvl.color, delta,
    title: 'COMPOSITE, BY READING',
  }));

  // Where this level sits on the whole scale.
  body.push(levelRamp(M, 582, R - M, 52, state.level, { digitSize: 34 }));

  // Pillars
  const gap = 26;
  const colW = Math.floor((R - M - gap * 4) / 5);
  pillars.forEach((p, i) => {
    body.push(pillarBarVertical(p, M + i * (colW + gap), colW, 700, 56));
  });

  // Footer: the domain is burned in here. It is the only place the URL is
  // allowed to exist, because an image is not parsed as a link.
  body.push(line(M, 812, R, 812));
  body.push(text(brand.tagline, { x: M, y: 860, size: 26, fill: INK_FAINT, weight: 500 }));
  body.push(text(brand.domain, { x: R, y: 864, size: 44, fill: INK, weight: 800, anchor: 'end', tracking: 1 }));

  return wrap(W, H, body.join(''), state, brand);
}

// ---------------------------------------------------------------------------
// Portrait 1080x1350 — outperforms landscape on mobile feeds, so it exists
// ---------------------------------------------------------------------------

export function renderCardPortrait(state, opts = {}) {
  assertState(state);
  const brand = opts.brand || DEFAULT_BRAND;
  const delta = opts.delta === undefined ? null : opts.delta;
  const series = Array.isArray(opts.series) ? opts.series : [];
  const W = 1080, H = 1350, M = 64, R = W - M, CX = W / 2;
  const lvl = levelMeta(state.level);
  const blank = isUnavailable(state);
  const pillars = pillarsInOrder(state);
  const degraded = isDegraded(state);

  const body = [];
  body.push(defs(lvl.color));
  body.push(backdrop(W, H));

  // The degraded pill sits on the wordmark's own line. It used to push the
  // whole stack down 28px, which is how a degraded portrait card once pushed
  // the domain off the bottom edge. Geometry below this line is now fixed.
  body.push(text(brand.name, { x: M, y: 72, size: 46, fill: INK, weight: 800, tracking: 10 }));
  if (degraded) body.push(degradedPill(M + Math.round(estWidth(brand.name, 46, 10)) + 28, 68, 22));
  body.push(text(utcClock(state.generated_at), { x: R, y: 56, size: 24, fill: INK_DIM, weight: 500, family: MONO, anchor: 'end' }));
  body.push(text(utcDate(state.generated_at), { x: R, y: 86, size: 24, fill: INK_DIM, weight: 500, family: MONO, anchor: 'end' }));
  const health = healthLine(state);
  if (health) body.push(text(health, { x: R, y: 116, size: 21, fill: INK_FAINT, weight: 600, family: MONO, anchor: 'end' }));
  body.push(line(M, 136, R, 136));

  const chipY = 152, chipH = 304;
  body.push(rect(M, chipY, R - M, chipH, { fill: 'url(#grad-chip)', rx: 18 }));
  body.push(text(brand.name, { x: CX, y: chipY + 66, size: 34, fill: ON_CHIP, weight: 800, anchor: 'middle', tracking: 10, opacity: 0.78 }));
  body.push(text(blank ? '--' : String(state.level), {
    x: CX, y: centerBaseline(chipY + 86, chipY + chipH - 20, blank ? 156 : 222),
    size: blank ? 156 : 222, fill: ON_CHIP, weight: 800, anchor: 'middle',
  }));

  const nameY = chipY + chipH + 76;  // 532
  body.push(text(lvl.name, { x: CX, y: nameY, size: fitSize(lvl.name, R - M, 80, 42, 2), fill: lvl.color, weight: 800, anchor: 'middle', tracking: 2 }));

  body.push(text(blank ? '--' : fmt1(state.score), { x: CX, y: nameY + 148, size: 150, fill: blank ? INK_FAINT : INK, weight: 800, anchor: 'middle' }));
  body.push(text(blank ? 'NO COMPOSITE PUBLISHED' : 'COMPOSITE, 0-100', { x: CX, y: nameY + 188, size: 24, fill: INK_DIM, weight: 600, family: MONO, anchor: 'middle', tracking: 3 }));

  body.push(sparkPanel(series, {
    x: M, y: 748, w: R - M, h: 214, accent: lvl.color, delta,
    title: 'COMPOSITE, BY READING',
  }));

  body.push(levelRamp(M, 992, R - M, 50, state.level, { digitSize: 32 }));

  // Five horizontal rows: at 1080 wide a row is far more legible than a column.
  const rowTop = 1100, rowH = 28, rowGap = 10;
  const trackX = M + 268;            // label column is 268 wide
  const trackW = (R - 90) - trackX;  // 90 reserves the right-anchored value
  pillars.forEach((p, i) => {
    body.push(pillarRowHorizontal(p, M, 268, trackX, trackW, rowTop + i * (rowH + rowGap), rowH, R));
  });

  body.push(line(M, 1298, R, 1298));
  body.push(text(brand.tagline, { x: M, y: 1332, size: 22, fill: INK_FAINT, weight: 500 }));
  body.push(text(brand.domain, { x: R, y: 1336, size: 42, fill: INK, weight: 800, anchor: 'end', tracking: 1 }));

  return wrap(W, H, body.join(''), state, brand);
}

// ---------------------------------------------------------------------------
// Square 1080x1080 — the aspect a quote-tweet and an IG post both crop to
// ---------------------------------------------------------------------------

export function renderCardSquare(state, opts = {}) {
  assertState(state);
  const brand = opts.brand || DEFAULT_BRAND;
  const delta = opts.delta === undefined ? null : opts.delta;
  const series = Array.isArray(opts.series) ? opts.series : [];
  const W = 1080, H = 1080, M = 64, R = W - M;
  const lvl = levelMeta(state.level);
  const blank = isUnavailable(state);
  const pillars = pillarsInOrder(state);
  const degraded = isDegraded(state);

  const body = [];
  body.push(defs(lvl.color));
  body.push(backdrop(W, H));

  body.push(text(brand.name, { x: M, y: 70, size: 44, fill: INK, weight: 800, tracking: 10 }));
  if (degraded) body.push(degradedPill(M + Math.round(estWidth(brand.name, 44, 10)) + 26, 66, 22));
  body.push(text(utcClock(state.generated_at), { x: R, y: 56, size: 23, fill: INK_DIM, weight: 500, family: MONO, anchor: 'end' }));
  body.push(text(utcDate(state.generated_at), { x: R, y: 86, size: 23, fill: INK_DIM, weight: 500, family: MONO, anchor: 'end' }));
  body.push(line(M, 108, R, 108));

  const chipY = 132, chipW = 300, chipH = 300;
  body.push(rect(M, chipY, chipW, chipH, { fill: 'url(#grad-chip)', rx: 16 }));
  body.push(text(brand.name, { x: M + chipW / 2, y: chipY + 60, size: 26, fill: ON_CHIP, weight: 800, anchor: 'middle', tracking: 5, opacity: 0.78 }));
  body.push(text(blank ? '--' : String(state.level), {
    x: M + chipW / 2, y: centerBaseline(chipY + 78, chipY + chipH - 18, blank ? 150 : 222),
    size: blank ? 150 : 222, fill: ON_CHIP, weight: 800, anchor: 'middle',
  }));

  const colX = M + chipW + 40;
  body.push(text(lvl.name, { x: colX, y: 216, size: fitSize(lvl.name, R - colX, 66, 34, 1), fill: lvl.color, weight: 800, tracking: 1 }));
  body.push(text(blank ? '--' : fmt1(state.score), { x: colX, y: 368, size: 150, fill: blank ? INK_FAINT : INK, weight: 800 }));
  body.push(text(blank ? 'NO COMPOSITE' : 'COMPOSITE, 0-100', { x: colX, y: 406, size: 22, fill: INK_DIM, weight: 600, family: MONO, tracking: 2 }));
  const health = healthLine(state);
  if (health) body.push(text(health, { x: colX, y: 440, size: 20, fill: INK_FAINT, weight: 600, family: MONO }));

  body.push(sparkPanel(series, {
    x: M, y: 470, w: R - M, h: 210, accent: lvl.color, delta,
    title: 'COMPOSITE, BY READING',
  }));

  body.push(levelRamp(M, 714, R - M, 50, state.level, { digitSize: 32 }));

  const rowTop = 820, rowH = 26, rowGap = 10;
  const trackX = M + 258;
  const trackW = (R - 88) - trackX;
  pillars.forEach((p, i) => {
    body.push(pillarRowHorizontal(p, M, 258, trackX, trackW, rowTop + i * (rowH + rowGap), rowH, R));
  });

  body.push(line(M, 1002, R, 1002));
  body.push(text(brand.tagline, { x: M, y: 1042, size: 22, fill: INK_FAINT, weight: 500 }));
  body.push(text(brand.domain, { x: R, y: 1046, size: 40, fill: INK, weight: 800, anchor: 'end', tracking: 1 }));

  return wrap(W, H, body.join(''), state, brand);
}

// ---------------------------------------------------------------------------
// News card — the day's top corroborated item, with the index as the footer
// ---------------------------------------------------------------------------
//
// A card carrying an actual fact is far more shareable than a bare gauge, and it
// is the thing pizzint gets from its 997 /intel briefs. The index does not
// disappear: the level chip, the composite and the domain all stay burned in, so
// one screenshot still carries the brand and the number.
//
// Laid out as a flow (a cursor that advances) rather than three hand-tuned
// coordinate sets, because the headline length is not ours to control.

const NEWS_SHAPES = Object.freeze({
  landscape: { variant: 'news-landscape', W: 1600, H: 900, M: 72, ruleY: 132, stripH: 176, headMax: 86, headMin: 44, brandSize: 54, brandTrack: 12, domainSize: 44 },
  portrait: { variant: 'news-portrait', W: 1080, H: 1350, M: 64, ruleY: 136, stripH: 210, headMax: 80, headMin: 40, brandSize: 46, brandTrack: 10, domainSize: 40 },
  square: { variant: 'news-square', W: 1080, H: 1080, M: 64, ruleY: 120, stripH: 196, headMax: 72, headMin: 36, brandSize: 44, brandTrack: 10, domainSize: 38 },
});

export function renderCardNews(state, item, opts = {}) {
  assertState(state);
  if (!item || typeof item.headline !== 'string' || item.headline.length === 0) {
    throw new TypeError('renderCardNews: item must carry a non-empty headline. Call topNewsItem() first and skip the card when it returns null.');
  }
  const shape = NEWS_SHAPES[opts.shape || 'landscape'];
  if (!shape) throw new TypeError(`renderCardNews: unknown shape "${opts.shape}"`);
  const brand = opts.brand || DEFAULT_BRAND;
  const delta = opts.delta === undefined ? null : opts.delta;
  const { W, H, M, ruleY, stripH } = shape;
  const R = W - M;
  const lvl = levelMeta(state.level);
  const blank = isUnavailable(state);
  const degraded = isDegraded(state);

  // The accent follows the ITEM's pillar when it has one, so a governance story
  // and a capability story do not look identical. Falls back to the level colour.
  const pillar = item.pillar ? pillarsInOrder(state).find((p) => p.id === item.pillar) : null;
  const accent = pillar && Number.isFinite(pillar.score) ? colorForScore(pillar.score) : lvl.color;

  const body = [];
  body.push(defs(accent));
  body.push(backdrop(W, H));

  // Header
  body.push(text(brand.name, { x: M, y: ruleY - 52, size: shape.brandSize, fill: INK, weight: 800, tracking: shape.brandTrack }));
  if (degraded) {
    body.push(degradedPill(M + Math.round(estWidth(brand.name, shape.brandSize, shape.brandTrack)) + 28, ruleY - 56, 22));
  }
  body.push(text(utcStamp(state.generated_at), { x: R, y: ruleY - 56, size: 24, fill: INK_DIM, weight: 500, family: MONO, anchor: 'end' }));
  body.push(text('TOP CORROBORATED ITEM', { x: R, y: ruleY - 24, size: 21, fill: INK_FAINT, weight: 700, family: MONO, anchor: 'end', tracking: 3 }));
  body.push(line(M, ruleY, R, ruleY));

  // Tag row: pillar, corroboration count, window.
  const tagY = ruleY + 30;
  const tagH = 46;
  let tx = M;
  if (pillar) {
    const chip = tagChip(PILLAR_LABELS[pillar.id], tx, tagY, tagH, { fill: accent, ink: ON_CHIP });
    body.push(chip.svg);
    tx += chip.width + 14;
  }
  if (Number.isFinite(item.source_count) && item.source_count > 0) {
    const label = `${item.source_count} SOURCE${item.source_count === 1 ? '' : 'S'}`;
    const chip = tagChip(label, tx, tagY, tagH, { stroke: INK_DIM, ink: INK });
    body.push(chip.svg);
    tx += chip.width + 14;
  }
  if (Number.isFinite(item.window_minutes) && item.source_count > 1) {
    const label = item.window_minutes < 60
      ? `WITHIN ${item.window_minutes} MIN`
      : `WITHIN ${Math.round(item.window_minutes / 60)} H`;
    const chip = tagChip(label, tx, tagY, tagH, { stroke: INK_DIM, ink: INK });
    body.push(chip.svg);
    tx += chip.width + 14;
  }

  // Headline: the hero of this variant.
  const headTop = tagY + tagH + 34;
  const stripTop = H - stripH;
  const metaBaseline = stripTop - 40;
  const headH = metaBaseline - 74 - headTop;   // 74 reserves two meta lines
  const fitted = fitParagraph(item.headline, R - M, headH, shape.headMax, shape.headMin, 1.16);
  // Centred in its box. Top-aligned left a 300px hole under a short headline on
  // the portrait card, which reads as a rendering failure rather than a design.
  const blockH = fitted.lines.length * fitted.size * 1.16;
  const headStart = Math.round(headTop + Math.max(0, (headH - blockH) / 2));
  fitted.lines.forEach((l, i) => {
    body.push(text(l, { x: M, y: Math.round(headStart + fitted.size * (0.82 + i * 1.16)), size: fitted.size, fill: INK, weight: 800 }));
  });

  // Provenance line. Names the carriers when we have them: "who else ran it" is
  // the whole claim, and an unnamed count is not checkable.
  const carriers = item.sources.map((s) => s.name).filter(Boolean);
  const metaBits = [];
  if (item.published_at) metaBits.push(`FIRST SEEN ${utcStamp(item.published_at)}`);
  if (carriers.length) metaBits.push(clampWords(carriers.join(', ').toUpperCase(), 64));
  if (metaBits.length) {
    // Up to two lines. A single fitted line ran off the right edge of the
    // portrait card the moment four carriers were named, and shrinking alone
    // could not save it without going under the legibility floor.
    const metaSize = 24;
    const metaLines = wrapLines(metaBits.join('   |   '), R - M, metaSize, 1).slice(0, 2);
    metaLines.forEach((l, i) => {
      body.push(text(l, {
        x: M, y: metaBaseline - (metaLines.length - 1 - i) * 30, size: metaSize,
        fill: INK_DIM, weight: 600, family: MONO, tracking: 1,
      }));
    });
  }

  // Footer strip: the index itself, still burned in, plus the domain.
  body.push(line(M, stripTop, R, stripTop));
  const cH = Math.round(stripH * 0.52);
  const cY = stripTop + 26;
  body.push(rect(M, cY, cH, cH, { fill: 'url(#grad-chip)', rx: 12 }));
  body.push(text(blank ? '--' : String(state.level), {
    x: Math.round(M + cH / 2), y: centerBaseline(cY, cY + cH, Math.round(cH * 0.66)),
    size: Math.round(cH * 0.66), fill: ON_CHIP, weight: 800, anchor: 'middle',
  }));
  // The right column is the domain over the tagline. Its width is MEASURED, not
  // guessed, and the left column is then fitted into what is left — the strap
  // line and the composite line used to overprint each other on the portrait
  // card, which is the one variant that matters most on a phone.
  const tX = M + cH + 24;
  const rightW = Math.ceil(Math.max(
    estWidth(brand.domain, shape.domainSize, 1),
    estWidth(brand.tagline, 22),
  ));
  const leftMax = R - tX - rightW - 28;
  const lede = `${brand.name} ${blank ? '--' : state.level} ${lvl.name}`;
  body.push(text(lede, {
    x: tX, y: cY + Math.round(cH * 0.42), size: fitSize(lede, leftMax, 34, MIN_FONT, 1),
    fill: lvl.color, weight: 800, tracking: 1,
  }));
  // Candidates longest-first; the first that fits is used. Dropping a clause
  // beats shrinking a number below the point where a thumbnail can carry it.
  const compositeLine = blank
    ? 'NO COMPOSITE PUBLISHED'
    : [
      `COMPOSITE ${fmt1(state.score)} OF 100, ${fmtDelta(delta)} SINCE PREVIOUS`,
      `COMPOSITE ${fmt1(state.score)} OF 100, ${fmtDelta(delta)}`,
      `COMPOSITE ${fmt1(state.score)} OF 100`,
      `${fmt1(state.score)} OF 100`,
    ].find((c) => estWidth(c, 24) <= leftMax) || `${fmt1(state.score)}`;
  body.push(text(compositeLine, {
    x: tX, y: cY + Math.round(cH * 0.86), size: 24, fill: INK_DIM, weight: 600, family: MONO,
  }));
  body.push(text(brand.domain, { x: R, y: cY + Math.round(cH * 0.5), size: shape.domainSize, fill: INK, weight: 800, anchor: 'end', tracking: 1 }));
  body.push(text(brand.tagline, { x: R, y: cY + Math.round(cH * 0.5) + 36, size: 22, fill: INK_FAINT, weight: 500, anchor: 'end' }));

  const title = `${brand.name} ${blank ? '' : state.level} — ${item.headline}`;
  return wrap(W, H, body.join(''), state, brand, title);
}

// width/height AND viewBox: Firefox and Safari refuse to size an <img> holding
// an SVG with viewBox alone, and post-sheet.mjs rasterises through <img>.
// xmlns is mandatory for the same reason — without it the <img> never loads.
function wrap(W, H, body, state, brand, titleOverride) {
  const title = titleOverride || (isUnavailable(state)
    ? `${brand.name} UNAVAILABLE — every pillar dark, no composite published`
    : `${brand.name} ${state.level} ${levelMeta(state.level).name} — ${fmt1(state.score)} of 100`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">`
    + `<title>${esc(title)}</title>`
    + `<desc>${esc(`${brand.name} activity tempo index at ${utcStamp(state.generated_at)}. ${brand.domain}`)}</desc>`
    + body
    + '</svg>';
}

/**
 * state     — data/state.json, parsed
 * opts.brand    — from loadBrand()
 * opts.delta    — from resolveDelta(); null is a legitimate value
 * opts.history  — parsed data/history.ndjson rows, for the sparkline
 * opts.series   — a pre-built series, overriding opts.history
 * opts.news     — normaliseNews() output, or a raw parsed data/news.json
 *
 * The three news variants appear ONLY when a usable item exists. A "no news
 * today" card is not a card, and an invented one would be the exact failure this
 * project exists to call out.
 */
export function renderCards(state, opts = {}) {
  const series = Array.isArray(opts.series)
    ? opts.series
    : compositeSeries(opts.history || [], state);
  const base = { ...opts, series };

  const out = {
    landscape: { svg: renderCardLandscape(state, base), width: 1600, height: 900, variant: 'landscape' },
    portrait: { svg: renderCardPortrait(state, base), width: 1080, height: 1350, variant: 'portrait' },
    square: { svg: renderCardSquare(state, base), width: 1080, height: 1080, variant: 'square' },
  };

  if (opts.news) {
    const news = Array.isArray(opts.news.items) ? opts.news : normaliseNews(opts.news);
    const item = opts.newsItem || topNewsItem(news, { now: state.generated_at, maxAgeHours: opts.newsMaxAgeHours ?? 36 });
    if (item) {
      for (const shapeName of Object.keys(NEWS_SHAPES)) {
        const s = NEWS_SHAPES[shapeName];
        out[s.variant] = {
          svg: renderCardNews(state, item, { ...base, shape: shapeName }),
          width: s.W, height: s.H, variant: s.variant, headline: item.headline,
        };
      }
    }
  }
  return out;
}

export default {
  renderCards, renderCardLandscape, renderCardPortrait, renderCardSquare, renderCardNews,
  loadBrand, loadNews, normaliseNews, topNewsItem, compositeSeries, auditCard, DEFAULT_BRAND,
};

// ---------------------------------------------------------------------------
// auditCard — the layout regression test
// ---------------------------------------------------------------------------
//
// SVG has no layout engine, so nothing stops a coordinate from landing off the
// canvas or a label from being rendered at 9px. This walks the emitted markup
// and reports both. It is cheap, it runs on every variant in selfTest(), and it
// is the reason a future tweak that pushes the domain off the bottom edge fails
// the build instead of shipping.
//
// Returns { problems, warnings }. `problems` are hard: out of bounds, or a font
// below MIN_FONT. `warnings` are estimated text overflows, which are soft
// because estWidth is deliberately biased high.
export function auditCard(svg, W, H, { minFont = MIN_FONT, minHero = MIN_HERO_FONT } = {}) {
  const problems = [];
  const warnings = [];
  // <defs> holds pattern tiles in their own coordinate space. Auditing them
  // would flag a 12x12 hatch tile as "out of bounds" forever.
  const drawn = svg.replace(/<defs>[\s\S]*?<\/defs>/g, '');

  const attr = (s, name) => {
    const m = new RegExp(`${name}="([^"]*)"`).exec(s);
    return m ? m[1] : null;
  };
  const num = (s, name) => {
    const v = attr(s, name);
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const inX = (v) => v >= -1 && v <= W + 1;
  const inY = (v) => v >= -1 && v <= H + 1;

  let heroMax = 0;

  for (const m of drawn.matchAll(/<rect\b([^>]*)\/>/g)) {
    const s = m[1];
    const x = num(s, 'x'), y = num(s, 'y'), w = num(s, 'width'), h = num(s, 'height');
    if (x === null || y === null || w === null || h === null) continue;
    if (!inX(x) || !inX(x + w) || !inY(y) || !inY(y + h)) {
      problems.push(`rect ${x},${y} ${w}x${h} leaves the ${W}x${H} canvas`);
    }
  }
  for (const m of drawn.matchAll(/<line\b([^>]*)\/>/g)) {
    const s = m[1];
    for (const [ax, ay] of [['x1', 'y1'], ['x2', 'y2']]) {
      const x = num(s, ax), y = num(s, ay);
      if (x === null || y === null) continue;
      if (!inX(x) || !inY(y)) problems.push(`line endpoint ${x},${y} leaves the ${W}x${H} canvas`);
    }
  }
  for (const m of drawn.matchAll(/<circle\b([^>]*)\/>/g)) {
    const s = m[1];
    const cx = num(s, 'cx'), cy = num(s, 'cy');
    if (cx !== null && (!inX(cx) || !inY(cy))) problems.push(`circle ${cx},${cy} leaves the canvas`);
  }
  for (const m of drawn.matchAll(/<polygon\b([^>]*)\/>/g)) {
    const pts = attr(m[1], 'points') || '';
    for (const pair of pts.trim().split(/\s+/)) {
      const [x, y] = pair.split(',').map(Number);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      if (!inX(x) || !inY(y)) problems.push(`polygon point ${x},${y} leaves the canvas`);
    }
  }
  for (const m of drawn.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)) {
    const s = m[1];
    const body = m[2];
    const size = num(s, 'font-size');
    const x = num(s, 'x'), y = num(s, 'y');
    if (size !== null) {
      if (size < minFont) problems.push(`font-size ${size} on "${body.slice(0, 32)}" is below the ${minFont}px floor`);
      if (size > heroMax) heroMax = size;
    }
    if (x === null || y === null) continue;
    if (!inX(x) || !inY(y)) problems.push(`text anchor ${x},${y} ("${body.slice(0, 24)}") leaves the canvas`);
    const anchor = attr(s, 'text-anchor') || 'start';
    const tracking = num(s, 'letter-spacing') || 0;
    const w = estWidth(body, size || 0, tracking);
    const left = anchor === 'end' ? x - w : (anchor === 'middle' ? x - w / 2 : x);
    const right = left + w;
    if (left < -2 || right > W + 2) {
      warnings.push(`text "${body.slice(0, 40)}" is estimated at ${Math.round(left)}..${Math.round(right)} on a ${W}px canvas`);
    }
  }
  if (heroMax < minHero) {
    problems.push(`largest glyph is ${heroMax}px; the hero number must be at least ${minHero}px to survive a thumbnail`);
  }
  return { problems, warnings };
}

// ---------------------------------------------------------------------------
// Self test:  node collector/card.mjs --test
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
    ],
    sources: Array.from({ length: 13 }, (_, i) => ({
      id: `s${i}`, ok: i < 9, error: i >= 9 && i < 12 ? 'uncalibrated: no entry in data/reference.json' : (i >= 12 ? 'HTTP 503' : null),
    })),
    ...over,
  };
}

const NEWS_FIXTURE = {
  schema: 1,
  generated_at: '2026-09-23T02:00:00.000Z',
  items: [
    {
      id: 'eu-ai-act-gpai',
      headline: 'EU publishes the general-purpose AI code of practice, with signatures from four frontier labs',
      pillar: 'governance',
      published_at: '2026-09-23T01:12:00.000Z',
      sources: [
        { id: 'federal-register', name: 'Federal Register', at: '2026-09-23T01:12:00.000Z' },
        { id: 'govuk', name: 'GOV.UK', at: '2026-09-23T01:31:00.000Z' },
        { id: 'hn', name: 'Hacker News', at: '2026-09-23T01:49:00.000Z' },
        { id: 'arxiv', name: 'arXiv', at: '2026-09-23T01:20:00.000Z' },
      ],
    },
    {
      id: 'small-item',
      headline: 'A single outlet carried this one and nobody else did',
      pillar: 'attention',
      published_at: '2026-09-23T00:05:00.000Z',
      sources: [{ id: 'hn', name: 'Hacker News', at: '2026-09-23T00:05:00.000Z' }],
    },
  ],
};

// The stroked trend path, with <defs> removed first — the grid pattern in defs
// is also a <path fill="none"> and matching it instead is how the flat-series
// test silently passed on a constant zero.
function trendPath(svg) {
  const drawn = svg.replace(/<defs>[\s\S]*?<\/defs>/g, '');
  return /<path d="([^"]+)" fill="none" stroke="[^"]+" stroke-width="4"/.exec(drawn);
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

  const state = fixtureState();
  const history = Array.from({ length: 40 }, (_, i) => ({
    t: new Date(Date.parse(state.generated_at) - (40 - i) * 3600 * 1000).toISOString(),
    score: 50 + (i % 13),
    level: 50 + (i % 13) >= 55 ? 3 : 4,
  }));
  const series = compositeSeries(history, state);

  // --- history key tolerance ------------------------------------------------
  check('histTime reads the engine\'s "t" key', () => {
    eq(histTime({ t: '2026-09-23T02:00:00.000Z' }), Date.parse('2026-09-23T02:00:00.000Z'), 't');
  });
  check('histTime reads the legacy "generated_at" key', () => {
    eq(histTime({ generated_at: '2026-09-23T02:00:00.000Z' }), Date.parse('2026-09-23T02:00:00.000Z'), 'generated_at');
  });
  check('resolveDelta finds a previous reading in engine-shaped history', () => {
    const d = resolveDelta(state, [{ t: '2026-09-23T01:00:00.000Z', score: 59.3 }]);
    eq(d, 2.1, 'delta');
  });
  check('resolveDelta is null, never 0, with no history', () => {
    eq(resolveDelta(state, []), null, 'delta');
  });

  // --- series ---------------------------------------------------------------
  check('compositeSeries appends the current state exactly once', () => {
    const s = compositeSeries(history, state);
    eq(s[s.length - 1].score, state.score, 'last point');
    eq(s.filter((p) => p.t === Date.parse(state.generated_at)).length, 1, 'duplicate current');
  });
  check('compositeSeries is sorted oldest first', () => {
    for (let i = 1; i < series.length; i += 1) {
      if (series[i].t < series[i - 1].t) throw new Error('out of order');
    }
  });
  check('compositeSeries drops unparsable rows rather than guessing', () => {
    eq(compositeSeries([{ t: 'nonsense', score: 4 }, { t: null, score: 9 }], state).length, 1, 'kept rows');
  });
  check('compositeSeries honours max', () => {
    eq(compositeSeries(history, state, { max: 5 }).length, 5, 'length');
  });

  // --- news normalisation ---------------------------------------------------
  check('normaliseNews orders by corroboration', () => {
    const n = normaliseNews(NEWS_FIXTURE);
    eq(n.items[0].id, 'eu-ai-act-gpai', 'top item');
    eq(n.items[0].source_count, 4, 'count');
    eq(n.items[0].window_minutes, 37, 'window');
  });
  check('normaliseNews accepts a bare array', () => {
    eq(normaliseNews(NEWS_FIXTURE.items).items.length, 2, 'items');
  });
  check('normaliseNews drops an item with no headline', () => {
    eq(normaliseNews({ items: [{ pillar: 'capability' }] }).items.length, 0, 'items');
  });
  check('normaliseNews drops an unknown pillar rather than inventing one', () => {
    eq(normaliseNews({ items: [{ headline: 'a headline long enough', pillar: 'vibes' }] }).items[0].pillar, null, 'pillar');
  });
  check('normaliseNews strips a URL out of a headline', () => {
    const n = normaliseNews({ items: [{ headline: 'Lab ships a model https://example.com/x see also www.foo.org' }] });
    if (/https?:|www\./.test(n.items[0].headline)) throw new Error(n.items[0].headline);
  });
  check('normaliseNews clamps a runaway headline on a word boundary', () => {
    const long = `${'word '.repeat(80)}end`;
    const h = normaliseNews({ items: [{ headline: long }] }).items[0].headline;
    if (h.length > NEWS_HEADLINE_MAX + 4) throw new Error(`${h.length} chars`);
    if (!h.endsWith('...')) throw new Error('no ellipsis');
  });
  check('normaliseNews is deterministic', () => {
    eq(JSON.stringify(normaliseNews(NEWS_FIXTURE)), JSON.stringify(normaliseNews(NEWS_FIXTURE)), 'two runs');
  });
  check('topNewsItem rejects a stale item rather than calling it today\'s', () => {
    const stale = { items: [{ headline: 'An old headline from last week', published_at: '2026-09-01T00:00:00.000Z' }] };
    eq(topNewsItem(normaliseNews(stale), { now: state.generated_at }), null, 'stale');
  });
  check('topNewsItem returns the freshest corroborated item', () => {
    eq(topNewsItem(normaliseNews(NEWS_FIXTURE), { now: state.generated_at }).id, 'eu-ai-act-gpai', 'id');
  });

  // --- geometry -------------------------------------------------------------
  // minHero differs by family: on a gauge card the hero is the level digit, on a
  // news card it is the headline, which is allowed to shrink to fit.
  const variants = [
    ['landscape', () => renderCardLandscape(state, { series, delta: 2.1 }), 1600, 900, MIN_HERO_FONT],
    ['portrait', () => renderCardPortrait(state, { series, delta: 2.1 }), 1080, 1350, MIN_HERO_FONT],
    ['square', () => renderCardSquare(state, { series, delta: 2.1 }), 1080, 1080, MIN_HERO_FONT],
    ['news-landscape', () => renderCardNews(state, normaliseNews(NEWS_FIXTURE).items[0], { series, delta: 2.1, shape: 'landscape' }), 1600, 900, 44],
    ['news-portrait', () => renderCardNews(state, normaliseNews(NEWS_FIXTURE).items[0], { series, delta: 2.1, shape: 'portrait' }), 1080, 1350, 40],
    ['news-square', () => renderCardNews(state, normaliseNews(NEWS_FIXTURE).items[0], { series, delta: 2.1, shape: 'square' }), 1080, 1080, 36],
  ];
  for (const [name, render, W, H, minHero] of variants) {
    check(`${name} stays on the canvas and above the ${MIN_FONT}px floor`, () => {
      const { problems } = auditCard(render(), W, H, { minHero });
      if (problems.length) throw new Error(problems.join(' / '));
    });
    check(`${name} burns in the domain`, () => {
      if (!render().includes(DEFAULT_BRAND.domain)) throw new Error('domain missing from the image');
    });
  }

  // --- degraded / blank states ---------------------------------------------
  check('a degraded state still fits, pill and all', () => {
    const d = fixtureState({ degraded: true });
    for (const [W, H, fn] of [[1600, 900, renderCardLandscape], [1080, 1350, renderCardPortrait], [1080, 1080, renderCardSquare]]) {
      const { problems } = auditCard(fn(d, { series, delta: -1.4 }), W, H);
      if (problems.length) throw new Error(problems.join(' / '));
    }
  });
  check('an all-dark state renders "--" and never a number', () => {
    const blank = fixtureState({
      score: null, level: null, level_name: 'UNAVAILABLE', degraded: true,
      pillars: fixtureState().pillars.map((p) => ({ ...p, dark: true, score: null, percentile: null })),
    });
    const svg = renderCardLandscape(blank, { series: [], delta: null });
    if (/COMPOSITE, 0-100/.test(svg)) throw new Error('quoted a composite caption with no composite');
    if (!svg.includes('NO COMPOSITE PUBLISHED')) throw new Error('did not say the composite is missing');
    if (!svg.includes('NO LEVEL PUBLISHED')) throw new Error('level ramp did not say the level is missing');
  });
  check('an uncalibrated pillar says NO BASELINE, a dark one says DARK', () => {
    const mixState = fixtureState({
      pillars: fixtureState().pillars.map((p) => {
        if (p.id === 'markets') return { ...p, uncalibrated: true, score: null };
        if (p.id === 'governance') return { ...p, dark: true, score: null };
        return p;
      }),
    });
    const svg = renderCardPortrait(mixState, { series, delta: 0 });
    if (!svg.includes('NO BASELINE')) throw new Error('uncalibrated pillar lost its NO BASELINE label');
    if (!svg.includes('&gt;DARK') && !svg.includes('>DARK<')) throw new Error('dark pillar lost its DARK label');
  });
  check('the health line separates live, awaiting-baseline and dark', () => {
    const h = sourceHealth(fixtureState());
    eq(h.ok, 9, 'ok'); eq(h.uncalibrated, 3, 'uncalibrated'); eq(h.down, 1, 'down');
  });

  // --- sparkline honesty ----------------------------------------------------
  check('an empty series draws hatching, not a flat line', () => {
    const svg = renderCardLandscape(state, { series: [], delta: null });
    if (!svg.includes('AWAITING HISTORY')) throw new Error('no AWAITING HISTORY');
  });
  check('a single reading says so instead of drawing a trend', () => {
    const one = compositeSeries([], state);
    eq(one.length, 1, 'series length');
    const svg = renderCardLandscape(state, { series: one, delta: null });
    if (!svg.includes('1 READING, NO TREND YET')) throw new Error('no single-reading notice');
  });
  check('a nearly flat series is not stretched into a mountain range', () => {
    // Measures the STROKE path only. The area path deliberately drops to the
    // plot floor, so including it would measure the fill, not the trend.
    const flat = [60.0, 60.1, 59.9, 60.05].map((s, i) => ({ t: i * 3600000, score: s }));
    const svg = renderCardLandscape({ ...state, score: 60.05 }, { series: flat, delta: 0.1 });
    const stroke = trendPath(svg);
    if (!stroke) throw new Error('no stroked trend path');
    const ys = [...stroke[1].matchAll(/[ML]\d+ (\d+)/g)].map((m) => Number(m[1]));
    const spread = Math.max(...ys) - Math.min(...ys);
    if (spread > 30) throw new Error(`a 0.2-point wobble was drawn ${spread}px tall`);
  });
  check('a real move is drawn at a readable height', () => {
    const moving = [42, 48, 55, 61, 68].map((s, i) => ({ t: i * 3600000, score: s }));
    const svg = renderCardLandscape({ ...state, score: 68 }, { series: moving, delta: 7 });
    const stroke = trendPath(svg);
    if (!stroke) throw new Error('no stroked trend path');
    const ys = [...stroke[1].matchAll(/[ML]\d+ (\d+)/g)].map((m) => Number(m[1]));
    const spread = Math.max(...ys) - Math.min(...ys);
    if (spread < 60) throw new Error(`a 26-point climb was drawn only ${spread}px tall`);
  });

  // --- contract guards ------------------------------------------------------
  check('a card with a live pillar and a null score is refused', () => {
    throws(() => renderCardLandscape(fixtureState({ score: null, level: null }), {}), 'inconsistent state');
  });
  check('a missing pillar is refused, not skipped', () => {
    throws(() => renderCardSquare(fixtureState({ pillars: fixtureState().pillars.slice(1) }), {}), 'missing pillar');
  });
  check('renderCardNews refuses an item with no headline', () => {
    throws(() => renderCardNews(state, { pillar: 'capability' }, {}), 'headless item');
  });
  check('renderCards omits news variants when there is no usable item', () => {
    const cards = renderCards(state, { history, news: { items: [] } });
    if (cards['news-landscape']) throw new Error('invented a news card out of nothing');
    eq(Boolean(cards.landscape && cards.portrait && cards.square), true, 'gauge variants');
  });
  check('renderCards emits all three news variants when an item exists', () => {
    const cards = renderCards(state, { history, news: NEWS_FIXTURE });
    for (const v of ['news-landscape', 'news-portrait', 'news-square']) {
      if (!cards[v]) throw new Error(`missing ${v}`);
    }
  });
  check('renderCards output is deterministic', () => {
    const a = JSON.stringify(renderCards(state, { history, news: NEWS_FIXTURE }));
    const b = JSON.stringify(renderCards(state, { history, news: NEWS_FIXTURE }));
    eq(a, b, 'two runs');
  });
  check('every SVG is well-formed enough to round-trip through an <img>', () => {
    for (const [, render] of variants) {
      const svg = render();
      if (!svg.startsWith('<svg xmlns=')) throw new Error('no xmlns');
      if (!/width="\d+" height="\d+" viewBox=/.test(svg)) throw new Error('no width/height/viewBox');
      if (!svg.endsWith('</svg>')) throw new Error('unterminated');
      const open = (svg.match(/</g) || []).length;
      const close = (svg.match(/>/g) || []).length;
      eq(open, close, 'angle brackets');
    }
  });
  check('a headline with markup is escaped, not injected', () => {
    const nasty = normaliseNews({ items: [{ headline: 'Lab <script>alert(1)</script> ships "a" & more', pillar: 'capability' }] });
    const svg = renderCardNews(state, nasty.items[0], { shape: 'square' });
    if (/<script/.test(svg)) throw new Error('raw markup reached the SVG');
    if (!svg.includes('&lt;script')) throw new Error('not escaped');
  });

  return results;
}

// ---------------------------------------------------------------------------
// CLI:  node collector/card.mjs [state.json] [outDir] [news.json]
//       node collector/card.mjs --test
//
// ORDER MATTERS: site/build.mjs clears public/ before regenerating it, so this
// runs AFTER it. Measured the hard way on 2026-09-23 — cards written first
// vanished.
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

  const statePath = argv[0] || 'data/state.json';
  const outDir = argv[1] || 'public/cards';
  const newsPath = argv[2] || 'data/news.json';
  const historyPath = 'data/history.ndjson';

  const state = JSON.parse(await readFile(statePath, 'utf8'));
  let history = [];
  try {
    const raw = await readFile(historyPath, 'utf8');
    history = raw.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    process.stderr.write(`[card] no ${historyPath} yet — the sparkline says AWAITING HISTORY rather than drawing one.\n`);
  }

  const { brand, source } = await loadBrand();
  const { news } = await loadNews(newsPath);
  const delta = resolveDelta(state, history);
  const series = compositeSeries(history, state);
  const cards = renderCards(state, { brand, delta, series, news });

  await mkdir(outDir, { recursive: true });
  for (const c of Object.values(cards)) {
    const p = `${outDir}/doomcon-${c.variant}.svg`;
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, c.svg, 'utf8');
    process.stdout.write(`wrote ${p} (${c.width}x${c.height}, ${c.svg.length} bytes)\n`);
  }
  // site/build.mjs looks for cards/current.svg as the og:image. It is the
  // landscape card under the name the site generator already knows.
  await writeFile(`${outDir}/current.svg`, cards.landscape.svg, 'utf8');
  process.stdout.write(`wrote ${outDir}/current.svg (alias of landscape)\n`);

  const audit = auditCard(cards.landscape.svg, 1600, 900);
  if (audit.problems.length) {
    process.stderr.write(`[card] LAYOUT PROBLEMS:\n  ${audit.problems.join('\n  ')}\n`);
    process.exit(1);
  }
  process.stdout.write(
    `brand from: ${source}, domain ${brand.domain}, ${series.length} reading${series.length === 1 ? '' : 's'} in the sparkline, `
    + `${news.items.length} news item${news.items.length === 1 ? '' : 's'}\n`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2)).catch((err) => {
    process.stderr.write(`card.mjs failed: ${err.stack || err.message}\n`);
    process.exit(1);
  });
}
