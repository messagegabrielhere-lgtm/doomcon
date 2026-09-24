#!/usr/bin/env node
// DOOMCON news layer — the data behind the news reel.
//
//   docker run --rm --network host -v "$PWD":/app -w /app node:20-alpine node collector/news.mjs
//
// WHAT THIS IS FOR, in one paragraph, because it drives every decision below.
// pizzint.watch's live column relays X posts. That makes it structurally
// DOWNSTREAM of the accounts it mirrors: it cannot print anything until someone
// else has already posted it. This layer reads the PRIMARY sources those
// accounts are themselves relaying — arXiv, Hugging Face, lab newsrooms, GitHub
// releases — so an item can appear here BEFORE it appears on X. Every item
// carries the timestamp of its earliest independent sighting, which is what
// makes "we had this first" a checkable claim rather than an assertion.
//
// The second thing a single-source competitor cannot do is CORROBORATION.
// skynetcountdown.com reads one TechCrunch RSS feed and says so
// (docs/TEARDOWN.md §4); with one source, "two outlets independently reported
// this" is not a computable quantity. Here it is a scored term, and it is the
// strongest signal in the formula that something real happened.
//
// Writes data/news.json only. It touches nothing in public/, so it is
// order-independent with respect to site/build.mjs — which CLEARS public/ before
// regenerating and would delete anything written there first.

import { readdir, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

import { fetchText, fetchJson } from './fetch.mjs';
import { extractEntities, entityKinds, classifyPillar } from './news-sources/_entities.mjs';

const SCHEMA_VERSION = 1;
const SCORING_VERSION = '1.0.0';

// Rolling window. 7 days matches the reference window the rest of the pipeline
// thinks in, and 200 items is about as much as a phone on a cellular connection
// should be asked to download from an X link (CONTRACT: mobile first).
const WINDOW_DAYS = 7;
const MAX_ITEMS = 200;

// Per-adapter watchdog, on top of whatever timeout fetch.mjs applies to a single
// request. Same reasoning as collect.mjs: fetch.mjs guards one request, this
// guards an adapter that may make seven (github-releases fans out across its
// whole basket).
const ADAPTER_TIMEOUT_MS = 60_000;

const VALID_SOURCE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VALID_KINDS = Object.freeze(['lab', 'paper', 'model', 'release', 'forum', 'press', 'status']);
const PILLARS = Object.freeze(['capability', 'compute', 'attention', 'governance', 'markets']);

// Kinds whose pillar is fixed by what they ARE rather than what they are about.
// See the pillar rule in mergeGroup() for the measurement that produced this.
const PRIMARY_ARTEFACT_KINDS = new Set(['paper', 'model', 'release']);

const SOURCES_DIR = new URL('./news-sources/', import.meta.url);
const OUTPUT_URL = new URL('../data/news.json', import.meta.url);

// ---------------------------------------------------------------------------
// Scoring. Every term is a published number over a published input. No LLM is
// involved anywhere in this file, and that is the product claim: a stranger can
// recompute these scores. See docs/NEWS.md, "Scoring".
// ---------------------------------------------------------------------------

// The five terms sum to exactly 100, so the clamp in scoreItem() is a guard
// rather than a load-bearing part of the maths.
//
// The balance is an EDITORIAL JUDGEMENT and is disclosed here rather than
// buried, the same way docs/METHODOLOGY.md discloses the index's 70/30 AQI
// split. It was also corrected against a measurement: the first version gave
// source weight 35 points, and because source weight is constant per feed, the
// entire top of the reel became whatever OpenAI's newsroom published that day —
// "Two years of OpenAI Academy" outranked an 880-point Hacker News story about
// a Pentagon incident. Source identity is a prior, not a verdict, so it now
// ranks below the two terms that measure what actually happened:
//
//   CORROBORATION  25  independent sources agreeing is the strongest available
//                      evidence that a real event occurred, and it is the term
//                      a single-source competitor cannot compute at all.
//   WEIGHT         25  who published it. A prior on reliability and primacy.
//   RECENCY        20  a news reel that is not fresh is not news.
//   ENGAGEMENT     18  how hard humans actually reacted, where measurable.
//   ENTITIES       12  a named frontier lab or model family in the headline.
const SCORE = Object.freeze({
  WEIGHT_MAX: 25,
  RECENCY_MAX: 20,
  RECENCY_HALF_LIFE_HOURS: 36,
  CORROBORATION_MAX: 25,
  CORROBORATION_PER_EXTRA_SOURCE: 12.5,
  ENTITY_MAX: 12,
  ENTITY_PER_HIT: 3,
  ENGAGEMENT_MAX: 18,
});

function round1(n) {
  return Math.round(n * 10) / 10;
}

function scoreItem({ weight, publishedAtMs, generatedAtMs, sourceCount, entityCount, engagement }) {
  const w = SCORE.WEIGHT_MAX * clamp01(weight);

  // A feed that publishes with a future timestamp (several do, by a few minutes,
  // through clock skew or scheduled posts) must not score ABOVE a brand-new item
  // through a negative exponent. Age floors at zero.
  const ageHours = Math.max(0, (generatedAtMs - publishedAtMs) / 3_600_000);
  const r = SCORE.RECENCY_MAX * 0.5 ** (ageHours / SCORE.RECENCY_HALF_LIFE_HOURS);

  const c = Math.min(
    SCORE.CORROBORATION_MAX,
    SCORE.CORROBORATION_PER_EXTRA_SOURCE * Math.max(0, sourceCount - 1),
  );
  const e = Math.min(SCORE.ENTITY_MAX, SCORE.ENTITY_PER_HIT * entityCount);

  // Log scale, because engagement is log-distributed: the gap between 5 points
  // and 50 is real news, the gap between 500 and 545 is noise. A source with no
  // engagement signal scores zero here and forfeits the term — it is never
  // faked and never defaulted to a middling value, the same rule the index
  // applies to a dark source.
  let p = 0;
  if (engagement && Number.isFinite(engagement.value) && engagement.value > 0 && engagement.full_scale > 0) {
    p = SCORE.ENGAGEMENT_MAX * Math.min(1, Math.log1p(engagement.value) / Math.log1p(engagement.full_scale));
  }

  const components = {
    source_weight: round1(w),
    recency: round1(r),
    corroboration: round1(c),
    entities: round1(e),
    engagement: round1(p),
  };
  const total = Math.min(100, Math.max(0, round1(w + r + c + e + p)));
  return { score: total, components, age_hours: round1(ageHours) };
}

function clamp01(n) {
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
}

// ---------------------------------------------------------------------------
// Canonicalisation and identity
// ---------------------------------------------------------------------------

// Tracking parameters are noise that would otherwise mint a distinct id for the
// same article arriving through two feeds — the single most common cause of a
// duplicated news reel.
const TRACKING_PARAMS = /^(utm_[a-z_]+|ref|ref_src|referrer|source|fbclid|gclid|gbraid|wbraid|mc_cid|mc_eid|igshid|si|cmpid|ncid|sh|at_medium|at_campaign|__twitter_impression|guccounter|s|t)$/i;

/**
 * Canonical URL. Lowercased scheme and host, `www.` dropped, tracking params
 * stripped, remaining params sorted, fragment dropped, trailing slash trimmed.
 * Sorting matters: ?a=1&b=2 and ?b=2&a=1 are one page and must hash alike.
 */
export function canonicalUrl(raw) {
  let u;
  try {
    u = new URL(String(raw).trim());
  } catch {
    return null;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;

  u.protocol = 'https:'; // http and https of one page are one page
  u.hostname = u.hostname.toLowerCase().replace(/^www\./, '');
  u.hash = '';

  const kept = [...u.searchParams.entries()]
    .filter(([k]) => !TRACKING_PARAMS.test(k))
    .sort((a, b) => (a[0] === b[0] ? a[1].localeCompare(b[1]) : a[0].localeCompare(b[0])));
  u.search = '';
  for (const [k, v] of kept) u.searchParams.append(k, v);

  // Trim the trailing slash. /a/b/ and /a/b are one page, and so are
  // https://x.com/ and https://x.com — the host root normalises to no slash
  // too, which is consistent rather than special-cased.
  return u.toString().replace(/(?<=\/[^/?#]+)\/(?=$|\?)/, '');
}

/** Stable id: a hash of the canonical URL, so reruns never duplicate an item. */
export function itemId(canonical) {
  return createHash('sha256').update(canonical).digest('hex').slice(0, 16);
}

// ---------------------------------------------------------------------------
// Near-duplicate titles
// ---------------------------------------------------------------------------

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'for', 'nor', 'of', 'to', 'in', 'on', 'at', 'by', 'with',
  'from', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'it', 'its', 'this', 'that', 'these',
  'those', 'you', 'your', 'we', 'our', 'has', 'have', 'had', 'new', 'now', 'how', 'why', 'what',
  'can', 'will', 'into', 'out', 'up', 'down', 'over', 'about', 'via', 'says', 'said',
]);

/** Normalised token set for title comparison. Case, punctuation and stopwords removed. */
export function titleTokens(title) {
  return new Set(
    String(title)
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, ' ')
      .split(' ')
      .filter((t) => t.length >= 3 && !STOPWORDS.has(t)),
  );
}

// Overlap ratio against the SMALLER set, not the union. Jaccard punishes a
// newspaper headline for being longer than a wire headline about the same
// event; containment does not. Chosen deliberately, and stated so it can be
// argued with.
const TITLE_MATCH_RATIO = 0.75;
const TITLE_MIN_TOKENS = 4;
const TITLE_MIN_INTERSECTION = 4;
// Two reports of one event land within days. Beyond this, identical titles are
// far more likely to be a recurring headline ("OpenAI announces new model")
// than one story, and merging them would corrupt the "first seen" timestamp.
const CORROBORATION_MAX_GAP_HOURS = 96;

export function titleOverlap(a, b) {
  const A = titleTokens(a);
  const B = titleTokens(b);
  if (A.size < TITLE_MIN_TOKENS || B.size < TITLE_MIN_TOKENS) return 0;
  let hits = 0;
  for (const t of A) if (B.has(t)) hits += 1;
  if (hits < TITLE_MIN_INTERSECTION) return 0;
  return hits / Math.min(A.size, B.size);
}

// ---------------------------------------------------------------------------
// Adapter discovery
// ---------------------------------------------------------------------------

async function discoverAdapters() {
  const entries = await readdir(SOURCES_DIR);
  const files = entries
    .filter((n) => n.endsWith('.mjs') && !n.startsWith('_') && !n.startsWith('.'))
    .sort();

  if (files.length === 0) throw new Error('news: no adapters in collector/news-sources/');

  const adapters = [];
  const seen = new Map();

  for (const file of files) {
    const mod = await import(new URL(file, SOURCES_DIR).href);
    const a = mod.default;

    // A malformed adapter is fatal for the run, exactly as in collect.mjs: it is
    // a code error that CI catches, not a data outage, and reporting it as a
    // dead source would teach the operator to ignore dead sources.
    if (!a || typeof a !== 'object') throw new Error(`news: ${file} has no default-exported object`);
    if (typeof a.id !== 'string' || !VALID_SOURCE_ID.test(a.id)) throw new Error(`news: ${file} has invalid id ${JSON.stringify(a.id)}`);
    if (!VALID_KINDS.includes(a.kind)) throw new Error(`news: ${file} has unknown kind ${JSON.stringify(a.kind)} (want ${VALID_KINDS.join('|')})`);
    if (typeof a.label !== 'string' || !a.label) throw new Error(`news: ${file} has no label`);
    if (typeof a.weight !== 'number' || !(a.weight > 0 && a.weight <= 1)) throw new Error(`news: ${file} weight must be in (0,1], got ${a.weight}`);
    if (typeof a.collect !== 'function') throw new Error(`news: ${file} has no collect()`);
    if (seen.has(a.id)) throw new Error(`news: duplicate source id "${a.id}" in ${file} and ${seen.get(a.id)}`);

    seen.set(a.id, file);
    adapters.push(a);
  }
  return adapters;
}

function withTimeout(promise, ms, id) {
  let timer;
  const watchdog = new Promise((_r, reject) => {
    timer = setTimeout(() => reject(new Error(`${id}: timed out after ${ms}ms`)), ms);
    if (typeof timer.unref === 'function') timer.unref();
  });
  // The loser of the race is still in flight; an unobserved rejection would
  // crash Node under its default --unhandled-rejections=throw.
  promise.catch(() => {});
  return Promise.race([promise, watchdog]).finally(() => clearTimeout(timer));
}

const errMsg = (e) => (e instanceof Error ? e.message || e.name : String(e));

// ---------------------------------------------------------------------------
// Draft -> NewsItem
// ---------------------------------------------------------------------------

function normaliseDraft(d, adapter) {
  if (!d || typeof d !== 'object') return null;
  const title = typeof d.title === 'string' ? d.title.replace(/\s+/g, ' ').trim() : '';
  if (!title) return null;

  const canonical = canonicalUrl(d.url);
  if (!canonical) return null;

  const publishedMs = Date.parse(d.published_at ?? '');
  if (!Number.isFinite(publishedMs)) return null;

  const pillarHint = PILLARS.includes(d.default_pillar) ? d.default_pillar : null;

  // A per-item override lets one feed carry more than one grade of item —
  // OpenAI's newsroom mixes launches with customer case studies. Clamped into
  // (0,1] so a bad override cannot mint points or zero an item out silently.
  const override = Number(d.weight_override);
  const weight = Number.isFinite(override) && override > 0 ? Math.min(1, override) : adapter.weight;

  return {
    source: adapter.id,
    kind: d.kind && VALID_KINDS.includes(d.kind) ? d.kind : adapter.kind,
    weight,
    title,
    summary: typeof d.summary === 'string' ? d.summary.replace(/\s+/g, ' ').trim() : '',
    url: canonical,
    published_at: new Date(publishedMs).toISOString(),
    published_ms: publishedMs,
    default_pillar: pillarHint,
    dedup_key: typeof d.dedup_key === 'string' && d.dedup_key ? d.dedup_key : null,
    engagement: d.engagement && Number.isFinite(Number(d.engagement.value))
      ? { metric: String(d.engagement.metric), value: Number(d.engagement.value), full_scale: Number(d.engagement.full_scale) }
      : null,
    meta: d.meta && typeof d.meta === 'object' ? d.meta : {},
  };
}

// ---------------------------------------------------------------------------
// Grouping: canonical URL, then explicit dedup key, then near-identical title
// ---------------------------------------------------------------------------

function groupDuplicates(records) {
  const parent = records.map((_, i) => i);
  const find = (i) => {
    while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; }
    return i;
  };
  const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent[Math.max(ra, rb)] = Math.min(ra, rb); };

  // Pass 1 — exact keys. Cheap, certain, and catches the majority.
  const byKey = new Map();
  records.forEach((r, i) => {
    const keys = [`url:${r.url}`];
    if (r.dedup_key) keys.push(`key:${r.dedup_key}`);
    for (const k of keys) {
      if (byKey.has(k)) union(byKey.get(k), i); else byKey.set(k, i);
    }
  });

  // Pass 2 — near-identical titles. O(n^2) over a few hundred items, which is
  // milliseconds, and the alternative (MinHash/LSH) is unauditable by a reader
  // who wants to check why two items merged. Auditability wins here.
  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      if (find(i) === find(j)) continue;
      const a = records[i];
      const b = records[j];

      // Two items carrying DIFFERENT explicit keys are different things by
      // construction (two distinct arXiv papers can share a generic title).
      if (a.dedup_key && b.dedup_key && a.dedup_key !== b.dedup_key) continue;
      if (Math.abs(a.published_ms - b.published_ms) > CORROBORATION_MAX_GAP_HOURS * 3_600_000) continue;
      if (titleOverlap(a.title, b.title) >= TITLE_MATCH_RATIO) union(i, j);
    }
  }

  const groups = new Map();
  records.forEach((_, i) => {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(i);
  });
  return [...groups.values()];
}

/**
 * Collapse one duplicate group into a single NewsItem.
 *
 * Primary selection is deterministic and, critically, PREFERS AN ID WE ALREADY
 * PUBLISHED. Without that rule a story picked up by a heavier source on run two
 * would change its canonical URL, change its id, and reappear as a brand-new
 * item — which is the opposite of idempotent.
 */
function mergeGroup(indexes, records, knownIds, generatedAtMs) {
  const members = indexes.map((i) => records[i]);

  const rank = (r) => [
    knownIds.has(itemId(r.url)) ? 0 : 1,
    -r.weight,
    r.published_ms,
    itemId(r.url),
  ];
  const primary = members.slice().sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    for (let i = 0; i < ra.length; i++) {
      if (ra[i] < rb[i]) return -1;
      if (ra[i] > rb[i]) return 1;
    }
    return 0;
  })[0];

  const bySource = new Map();
  for (const m of members) if (!bySource.has(m.source)) bySource.set(m.source, m);
  const sourceIds = [...bySource.keys()].sort();

  // The upstream claim, made checkable. `first` is the earliest independent
  // sighting; `lead_minutes` is how long we held the item before the slowest
  // corroborating source printed it.
  const ordered = members.slice().sort((a, b) => a.published_ms - b.published_ms || a.source.localeCompare(b.source));
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  const leadMinutes = Math.round((last.published_ms - first.published_ms) / 60_000);

  const text = `${primary.title} ${primary.summary}`;
  const entities = extractEntities(text);

  // PILLAR RULE, and it is a rule rather than a heuristic.
  //
  // A paper, a model and a release ARE the capability pillar's own definition —
  // CONTRACT.md words it as "model releases, research output". So they are
  // assigned directly and no keyword may override that. Only prose ABOUT the
  // world (a lab post, a press story, a forum thread, a status incident) gets
  // topic-classified, because only there does the topic decide the pillar.
  //
  // This is not tidiness. Measured on the first live run, keyword classification
  // over abstracts put 12 of 93 arXiv papers in `governance` ("Bellman Policy
  // Optimization", "JEV-as-a-Judge"), one in `markets` (the word "manifold") and
  // one in `compute`. A survey of RL policy gradients is research output no
  // matter which words its abstract happens to contain.
  const { pillar, reason } = PRIMARY_ARTEFACT_KINDS.has(primary.kind)
    ? { pillar: 'capability', reason: 'primary artefact (research output / model release)' }
    : classifyPillar(text, primary.default_pillar ?? null);

  // Best engagement signal in the group. Max, not sum: two sources reporting the
  // same HN thread's points are one measurement seen twice, not twice the
  // engagement.
  let engagement = null;
  for (const m of members) {
    if (!m.engagement) continue;
    const norm = Math.log1p(m.engagement.value) / Math.log1p(m.engagement.full_scale || 1);
    if (!engagement || norm > engagement._norm) engagement = { ...m.engagement, _norm: norm };
  }
  if (engagement) delete engagement._norm;

  const scored = scoreItem({
    weight: primary.weight,
    publishedAtMs: first.published_ms,
    generatedAtMs,
    sourceCount: sourceIds.length,
    entityCount: entities.length,
    engagement,
  });

  return {
    id: itemId(primary.url),
    source: primary.source,
    kind: primary.kind,
    title: primary.title,
    summary: primary.summary,
    url: primary.url,
    // The EARLIEST independent sighting, not the primary's own timestamp. This
    // is the number the "we had this first" claim rests on, so it has to be the
    // earliest one we can defend.
    published_at: first.published_at,
    pillar,
    score: scored.score,
    entities,
    meta: {
      ...primary.meta,
      source_weight: primary.weight,
      pillar_reason: reason,
      entity_kinds: entityKinds(text),
      score_components: scored.components,
      age_hours_at_score: scored.age_hours,
      engagement: engagement ?? null,
      corroboration: {
        count: sourceIds.length,
        sources: sourceIds,
        first_source: first.source,
        first_seen_published_at: first.published_at,
        last_published_at: last.published_at,
        lead_minutes: leadMinutes,
        also: members
          .filter((m) => m !== primary)
          .map((m) => ({ source: m.source, url: m.url, title: m.title, published_at: m.published_at }))
          .sort((a, b) => a.source.localeCompare(b.source) || a.url.localeCompare(b.url)),
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Previous file
// ---------------------------------------------------------------------------

async function readPrevious() {
  try {
    const parsed = JSON.parse(await readFile(OUTPUT_URL, 'utf8'));
    return Array.isArray(parsed?.items) ? parsed : { items: [] };
  } catch (err) {
    // A missing file is the first run. A CORRUPT file is different and must be
    // loud: silently starting over would erase the rolling window and the
    // first_seen_at timestamps that back the upstream claim.
    if (err?.code === 'ENOENT') return { items: [] };
    throw new Error(`news: data/news.json exists but could not be read — ${errMsg(err)}`);
  }
}

/**
 * An item we published before but did not re-fetch this run (it has aged off
 * its source feed) is re-scored against the new clock and kept until it leaves
 * the window. Its stored components are reused verbatim; only recency moves,
 * because only recency depends on the clock.
 */
function rescoreRetained(item, generatedAtMs) {
  const publishedMs = Date.parse(item.published_at);
  if (!Number.isFinite(publishedMs)) return null;

  const c = item.meta?.score_components ?? {};
  const ageHours = Math.max(0, (generatedAtMs - publishedMs) / 3_600_000);
  const recency = SCORE.RECENCY_MAX * 0.5 ** (ageHours / SCORE.RECENCY_HALF_LIFE_HOURS);
  const components = {
    source_weight: Number(c.source_weight) || 0,
    recency: round1(recency),
    corroboration: Number(c.corroboration) || 0,
    entities: Number(c.entities) || 0,
    engagement: Number(c.engagement) || 0,
  };
  const total = Math.min(100, Math.max(0, round1(
    components.source_weight + components.recency + components.corroboration +
    components.entities + components.engagement,
  )));

  return {
    ...item,
    score: total,
    meta: { ...item.meta, score_components: components, age_hours_at_score: round1(ageHours), retained: true },
  };
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function printSourceTable(sources) {
  const w = {
    id: Math.max(6, ...sources.map((s) => s.id.length)),
    kind: Math.max(4, ...sources.map((s) => s.kind.length)),
  };
  const header =
    'source'.padEnd(w.id) + '  ' + 'kind'.padEnd(w.kind) + '  wt    state    fetched  in-window      ms  newest item';
  console.log('');
  console.log(header);
  console.log('-'.repeat(header.length));
  for (const s of sources) {
    let line =
      s.id.padEnd(w.id) + '  ' +
      s.kind.padEnd(w.kind) + '  ' +
      s.weight.toFixed(2) + '  ' +
      s.state.toUpperCase().padEnd(7) + '  ' +
      String(s.raw_items ?? 0).padStart(7) + '  ' +
      String(s.count ?? 0).padStart(9) + '  ' +
      String(s.ms).padStart(6) + '  ' +
      (s.newest_item_at ? s.newest_item_at.slice(0, 16).replace('T', ' ') : '—');
    if (s.error) line += `  ${s.error}`;
    console.log(line);
  }
}

function printTop(items, n) {
  // `items` is ordered newest-first because that is the order the reel renders
  // in. This table ranks by score instead, so sort a copy — reading the head of
  // a date-sorted array and calling it "top by score" is how a log starts lying.
  const ranked = items.slice().sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  console.log('');
  console.log(`top ${Math.min(n, ranked.length)} by score:`);
  for (const it of ranked.slice(0, n)) {
    const c = it.meta.score_components;
    const corr = it.meta.corroboration;
    console.log(
      `  ${String(it.score).padStart(5)}  [${it.pillar ?? 'none'}/${it.kind}] ${it.title.slice(0, 84)}`,
    );
    console.log(
      `         ${it.source}` +
      (corr.count > 1 ? ` +${corr.count - 1} (${corr.sources.filter((s) => s !== it.source).join(', ')})` : ' (single source)') +
      `  w=${c.source_weight} r=${c.recency} c=${c.corroboration} e=${c.entities} p=${c.engagement}` +
      (it.entities.length ? `  [${it.entities.join(', ')}]` : ''),
    );
  }
}

// ---------------------------------------------------------------------------

async function main() {
  const generatedAt = new Date().toISOString();
  const generatedAtMs = Date.parse(generatedAt);
  const cutoffMs = generatedAtMs - WINDOW_DAYS * 86_400_000;

  const adapters = await discoverAdapters();
  const previous = await readPrevious();
  const knownIds = new Set(previous.items.map((i) => i.id));
  const firstSeen = new Map(previous.items.map((i) => [i.id, i.meta?.first_seen_at ?? null]));

  console.log(`news: ${adapters.length} adapters, window ${WINDOW_DAYS}d, ${previous.items.length} items carried forward`);

  // Promise.allSettled, never Promise.all: one dead feed must never take down
  // the rest of the run. Every adapter runs concurrently — they are independent
  // hosts, and fetch.mjs already caps concurrency inside any single fan-out.
  const settled = await Promise.allSettled(
    adapters.map(async (a) => {
      const t0 = Date.now();
      try {
        const drafts = await withTimeout(
          Promise.resolve(a.collect(fetchText, fetchJson)),
          ADAPTER_TIMEOUT_MS,
          a.id,
        );
        if (!Array.isArray(drafts)) throw new Error(`${a.id}: collect() did not return an array`);
        return { adapter: a, drafts, ms: Date.now() - t0 };
      } catch (err) {
        return { adapter: a, error: errMsg(err), ms: Date.now() - t0 };
      }
    }),
  );

  const records = [];
  const sources = [];

  for (let i = 0; i < settled.length; i++) {
    const outcome = settled[i];
    const a = adapters[i];
    const base = { id: a.id, kind: a.kind, label: a.label, weight: a.weight };

    if (outcome.status !== 'fulfilled') {
      sources.push({ ...base, ok: false, state: 'dark', count: 0, raw_items: 0, newest_item_at: null, error: `runner bug: ${errMsg(outcome.reason)}`, ms: 0 });
      continue;
    }
    const res = outcome.value;
    if (res.error) {
      // A dark source is reported dark. It is never omitted and never zeroed —
      // the same rule collect.mjs enforces for the index, for the same reason.
      sources.push({ ...base, ok: false, state: 'dark', count: 0, raw_items: 0, newest_item_at: null, error: res.error, ms: res.ms });
      continue;
    }

    let kept = 0;
    let newestMs = null;
    for (const d of res.drafts) {
      const rec = normaliseDraft(d, a);
      if (!rec) continue;
      // Tracked across ALL drafts, in-window or not: it is the only evidence
      // that separates a dormant publisher from a broken parser.
      if (newestMs === null || rec.published_ms > newestMs) newestMs = rec.published_ms;
      if (rec.published_ms < cutoffMs) continue; // outside the rolling window
      records.push(rec);
      kept += 1;
    }

    // THREE STATES, NOT TWO. This is the same discipline docs/METHODOLOGY.md
    // applies to the index, extended to cover a case the index does not have.
    //
    //   live     the feed answered and published inside the window
    //   dormant  the feed answered and parsed correctly, but its newest item
    //            predates the window — the publisher is quiet, not broken
    //   dark     the fetch or the parse failed
    //
    // Collapsing `dormant` into `live` would print a permanent, unexplained 0
    // next to a healthy-looking source on every run, which is how pizzint's
    // endpoint reports "status":"healthy" at a 12% scrape success rate
    // (docs/TEARDOWN.md §3.1) — a number nobody reads any more because it never
    // changes. Collapsing it into `dark` would be worse: it would claim a
    // working feed is broken, and under the index's own honesty rule a dark
    // source has consequences a quiet one must not trigger.
    //
    // Measured 2026-09-23: qwen is dormant — qwenlm.github.io/blog/index.xml is
    // valid RSS whose newest entry is 2025-09-23, and qwen.ai answers every
    // guessable feed path with HTTP 200 and 94KB of SPA HTML.
    const state = kept > 0 ? 'live' : 'dormant';

    sources.push({
      ...base,
      ok: true,
      state,
      count: kept,
      raw_items: res.drafts.length,
      newest_item_at: newestMs === null ? null : new Date(newestMs).toISOString(),
      error: null,
      ms: res.ms,
    });
  }

  // Retained items join the SAME grouping pass as fresh ones, so an item first
  // seen yesterday still collects today's corroboration instead of sitting at a
  // stale score next to a duplicate of itself.
  const retained = previous.items
    .filter((i) => Date.parse(i.published_at) >= cutoffMs)
    .filter((i) => !records.some((r) => r.url === i.url))
    .map((i) => rescoreRetained(i, generatedAtMs))
    .filter(Boolean);

  for (const r of retained) {
    records.push({
      source: r.source,
      kind: r.kind,
      weight: Number(r.meta?.source_weight) || 0.5,
      title: r.title,
      summary: r.summary,
      url: r.url,
      published_at: r.published_at,
      published_ms: Date.parse(r.published_at),
      default_pillar: PILLARS.includes(r.pillar) ? r.pillar : null,
      dedup_key: r.meta?.arxiv_id ? `arxiv:${r.meta.arxiv_id}` : null,
      engagement: r.meta?.engagement ?? null,
      meta: r.meta ?? {},
      retained: true,
    });
  }

  const groups = groupDuplicates(records);
  let items = groups
    .map((g) => mergeGroup(g, records, knownIds, generatedAtMs))
    .map((item) => ({
      ...item,
      meta: { ...item.meta, first_seen_at: firstSeen.get(item.id) ?? generatedAt },
    }))
    // Newest first, as specified, with score breaking a timestamp tie and id
    // breaking a score tie — a total order, so two runs over the same inputs
    // produce byte-identical output.
    .sort((a, b) =>
      Date.parse(b.published_at) - Date.parse(a.published_at) ||
      b.score - a.score ||
      a.id.localeCompare(b.id));

  // MEMBERSHIP MUST NOT DEPEND ON SCORE, and this is not a style preference.
  //
  // The recency term re-decays every run by design, so every score drifts a
  // little between runs. Hugging Face's daily-papers timestamps are
  // date-granular, which puts ~40 items on the identical instant
  // (T00:00:00.000Z), and that tie block straddles the 200-item cap. With score
  // in the truncation key, a 0.1-point drift reshuffled the block and three
  // items fell out of the file that had been in it an hour earlier — measured,
  // 2026-09-23, on the second of two consecutive runs.
  //
  // For a news reel that is visible churn: items vanish and reappear for no
  // reason a reader can see. So the CUT is taken on (published_at, id), both of
  // which are immutable for a given item, and the score only decides the order
  // of what survives. An item now leaves the tail for exactly one reason —
  // genuinely newer items arrived — which is a reason worth showing.
  const membership = new Set(
    items
      .slice()
      .sort((a, b) =>
        Date.parse(b.published_at) - Date.parse(a.published_at) ||
        a.id.localeCompare(b.id))
      .slice(0, MAX_ITEMS)
      .map((i) => i.id),
  );
  items = items.filter((i) => membership.has(i.id));

  const output = {
    schema: SCHEMA_VERSION,
    generated_at: generatedAt,
    scoring_version: SCORING_VERSION,
    window_days: WINDOW_DAYS,
    max_items: MAX_ITEMS,
    scoring: SCORE,
    items,
    sources,
  };

  await mkdir(new URL('../data/', import.meta.url), { recursive: true });
  await writeFile(OUTPUT_URL, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

  printSourceTable(sources);

  const live = sources.filter((s) => s.state === 'live').length;
  const dormant = sources.filter((s) => s.state === 'dormant');
  const dark = sources.filter((s) => s.state === 'dark');
  const corroborated = items.filter((i) => i.meta.corroboration.count > 1).length;
  const collapsed = records.length - groups.length;

  console.log('');
  console.log(`${live}/${sources.length} sources live, ${dormant.length} dormant, ${dark.length} dark`);
  // Named, not just counted. A count nobody can act on is a count nobody reads.
  if (dormant.length) console.log(`dormant (feed healthy, nothing published inside ${WINDOW_DAYS}d): ${dormant.map((s) => s.id).join(', ')}`);
  if (dark.length) console.log(`dark (fetch or parse failed): ${dark.map((s) => s.id).join(', ')}`);
  console.log(`${records.length} records -> ${groups.length} unique stories (${collapsed} collapsed as duplicates)`);
  console.log(`${corroborated} stories corroborated by 2+ independent sources`);
  console.log(`wrote data/news.json — ${items.length} items, newest first`);

  printTop(items, 5);

  // Exit non-zero only when we learned NOTHING. Some sources dark or dormant is
  // a normal Tuesday and must not fail the workflow; the file is still useful.
  if (live === 0) {
    console.error('\nnews: no source produced an in-window item — exiting 1');
    process.exitCode = 1;
  }
}

// Only run when invoked directly, so the pure helpers above can be imported by
// a test without firing a dozen HTTP requests as a side effect.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(`news: fatal — ${errMsg(err)}`);
    process.exitCode = 1;
  });
}
