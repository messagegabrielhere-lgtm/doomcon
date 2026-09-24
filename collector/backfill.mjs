// collector/backfill.mjs
//
// Builds data/reference.json ONCE, then it is frozen forever.
//
// The reference distribution is the only place history enters the live index.
// Every source value is turned into a percentile against it, so if this file is
// wrong, every number the site has ever printed is wrong in a way no downstream
// check can catch. Two rules follow, and they are absolute:
//
//   1. NEVER fabricate a day. A day we could not fetch is a gap, recorded as a
//      gap. A shorter honest series beats a longer invented one.
//   2. Reconstruct the EXACT statistic the live adapter emits - same window,
//      same query, same aggregation. A reference built from daily counts would
//      be arithmetically fine and factually meaningless against an adapter that
//      reports a 7-day rolling count.
//
// Rule 2 is why each builder below duplicates its adapter's window logic instead
// of calling the adapter: the adapters are hard-wired to "now", and we need them
// evaluated at 3,000 past instants.
//
// Run:  node collector/backfill.mjs [--force] [--quick] [--only=hn,wikipedia]
// Docker: docker run --rm --network host -v "$PWD":/app -w /app node:20-alpine \
//           node collector/backfill.mjs

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchJson, fetchText } from './fetch.mjs';
import { normalise, nowcast, composite, levelFor, LEVEL_NAMES, PILLARS, round } from './engine.mjs';

export const BACKFILL_VERSION = '1.0.0';

const MS_DAY = 86_400_000;
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const P = {
  reference: join(ROOT, 'data', 'reference.json'),
  history: join(ROOT, 'data', 'history.ndjson'),
  cache: join(ROOT, 'data', 'backfill-cache'),
};

// ---------------------------------------------------------------------------
// Windows
//
// REFERENCE_WINDOW_DAYS is a deliberate choice, not a convenience.
//
// A longer window is worse, not better, for every source here. AI activity has
// grown by more than an order of magnitude since 2018, so calibrating today
// against a decade means today sits at percentile ~0.99 every single day and the
// index flatlines at its ceiling - it would stop measuring tempo and start
// measuring the trend it is embedded in. 365 days is the shortest window that
// still contains one full cycle of the seasonality that actually drives these
// series: conference deadlines for arXiv, the US legislative calendar for the
// Federal Register, the fiscal-year filing calendar for SEC.
// ---------------------------------------------------------------------------
const REFERENCE_WINDOW_DAYS = 365;

// How far back the reconstructed CHART goes, for sources cheap enough to reach.
// Separate from the reference window on purpose: the chart is allowed to be
// deeper than the calibration, because it is scored against the frozen window
// rather than defining it.
const HISTORY_FROM = '2018-01-01';

// A source needs at least this many reconstructed days before it earns a frozen
// distribution. Below it, percentiles are quantised so coarsely that the score
// is theatre.
const MIN_REFERENCE_DAYS = 200;

const QUANTILE_KNOTS = 101; // percentiles 0..100 inclusive

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);
const dayMs = (iso) => Date.parse(`${iso}T00:00:00.000Z`);

/** End of the UTC day `iso` - the instant the live adapter would be reading at. */
const endOfDay = (iso) => dayMs(iso) + MS_DAY - 1;

function dayRange(fromIso, toIso) {
  const out = [];
  for (let t = dayMs(fromIso); t <= dayMs(toIso); t += MS_DAY) out.push(isoDay(t));
  return out;
}

/**
 * Quantile of a sorted sample by linear interpolation between order statistics
 * (the "type 7" definition, which is numpy's and R's default). Named explicitly
 * because a verifier reimplementing this in another language has to pick the
 * same one of the nine standard definitions or land on different percentiles.
 */
function quantileSorted(sorted, p) {
  const n = sorted.length;
  if (n === 0) throw new Error('quantileSorted: empty sample');
  if (n === 1) return sorted[0];
  const h = (n - 1) * p;
  const lo = Math.floor(h);
  const hi = Math.min(lo + 1, n - 1);
  return sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo]);
}

function quantileGrid(values, knots = QUANTILE_KNOTS) {
  const sorted = [...values].sort((a, b) => a - b);
  const grid = [];
  for (let i = 0; i < knots; i++) grid.push(round(quantileSorted(sorted, i / (knots - 1)), 6));
  return grid;
}

// Resumable cache. A 4,000-request rebuild that loses everything to one transient
// failure would be rebuilt by hand under time pressure, which is how invented
// data gets into a frozen file.
function cacheRead(id) {
  const f = join(P.cache, `${id}.json`);
  if (!existsSync(f)) return {};
  return JSON.parse(readFileSync(f, 'utf8'));
}
function cacheWrite(id, series) {
  mkdirSync(P.cache, { recursive: true });
  writeFileSync(join(P.cache, `${id}.json`), JSON.stringify(series), 'utf8');
}

/**
 * Walk days, fetch the ones we do not already have, cache as we go.
 * `fn(dayIso)` resolves to a finite number, or throws. A throw is recorded as a
 * gap for that day and the walk continues - one bad day must not cost the series.
 */
async function walkDays(id, days, fn, { delayMs, label }) {
  const series = cacheRead(id);
  const todo = days.filter((d) => !(d in series));
  if (todo.length === 0) {
    console.log(`  ${label}: all ${days.length} days already cached`);
    return series;
  }
  console.log(`  ${label}: ${todo.length} of ${days.length} days to fetch (~${Math.ceil((todo.length * delayMs) / 60000)} min)`);

  let done = 0, gaps = 0, consecutiveFailures = 0;
  for (const d of todo) {
    try {
      const v = await fn(d);
      if (!Number.isFinite(v)) throw new Error(`non-finite value ${v}`);
      series[d] = v;
      consecutiveFailures = 0;
    } catch (e) {
      series[d] = null; // an explicit gap, never a zero
      gaps++;
      consecutiveFailures++;
      if (gaps <= 3 || consecutiveFailures === 25) {
        console.log(`    gap ${d}: ${String(e.message).slice(0, 140)}`);
      }
      // A long unbroken failure run is an upstream block, not bad luck. Stop
      // hammering: what we have is honest, what comes next is just a longer ban.
      if (consecutiveFailures >= 25) {
        console.log(`    ${label}: 25 consecutive failures, abandoning the rest of this source`);
        break;
      }
    }
    done++;
    if (done % 250 === 0) { cacheWrite(id, series); console.log(`    ${label}: ${done}/${todo.length} (${gaps} gaps)`); }
    if (delayMs) await sleep(delayMs);
  }
  cacheWrite(id, series);
  return series;
}

// ---------------------------------------------------------------------------
// Series builders. One per live adapter, each reproducing that adapter's exact
// statistic at an arbitrary past instant.
// ---------------------------------------------------------------------------

/**
 * wikipedia -> `pageviews/day`
 * Sum over the 9 frozen articles of each article's 7-day mean daily views.
 * Algebraically that is the 7-day mean of the total across articles, which is
 * what we compute. Nine requests cover the entire history.
 *
 * The article list is duplicated from collector/sources/wikipedia.mjs, which
 * marks it FROZEN SET. If it ever changes there, this file and the reference
 * distribution must change in the same commit or the index is silently rebased.
 */
const WIKI_ARTICLES = [
  'Artificial_intelligence', 'Large_language_model', 'Artificial_general_intelligence',
  'OpenAI', 'ChatGPT', 'Anthropic', 'Machine_learning', 'Google_DeepMind',
  'Generative_artificial_intelligence',
];
const WIKI_WINDOW_DAYS = 7;

async function buildWikipedia(days) {
  const cached = cacheRead('wikipedia-daily');
  let daily = cached.daily ?? null;

  if (!daily) {
    const from = isoDay(dayMs(days[0]) - WIKI_WINDOW_DAYS * MS_DAY).replace(/-/g, '');
    const to = days[days.length - 1].replace(/-/g, '');
    daily = {};
    for (const article of WIKI_ARTICLES) {
      const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/${article}/daily/${from}/${to}`;
      const body = await fetchJson(url, { timeoutMs: 60_000 });
      if (!Array.isArray(body?.items) || body.items.length === 0) {
        throw new Error(`wikipedia backfill: no items for ${article}`);
      }
      for (const item of body.items) {
        const d = `${item.timestamp.slice(0, 4)}-${item.timestamp.slice(4, 6)}-${item.timestamp.slice(6, 8)}`;
        daily[d] = (daily[d] ?? 0) + Number(item.views);
      }
      console.log(`    wikipedia: ${article} ${body.items.length} days`);
      await sleep(250);
    }
    cacheWrite('wikipedia-daily', { daily });
  }

  // An article that did not exist yet contributes nothing rather than a gap, so
  // require every article to be present before trusting a day's total. Pages
  // created mid-history (Generative_artificial_intelligence, 2022) would
  // otherwise make 2018 look like a genuine attention trough when it is really
  // a smaller basket.
  const firstComplete = Object.keys(daily).sort().find((d) => daily[d] > 0);
  const series = {};
  for (const d of days) {
    const window = [];
    for (let i = 0; i < WIKI_WINDOW_DAYS; i++) {
      const wd = isoDay(dayMs(d) - i * MS_DAY);
      if (daily[wd] === undefined) { window.length = 0; break; }
      window.push(daily[wd]);
    }
    series[d] = window.length === WIKI_WINDOW_DAYS && d >= firstComplete
      ? round(window.reduce((a, b) => a + b, 0) / WIKI_WINDOW_DAYS, 4)
      : null;
  }
  return series;
}

/**
 * federal-register -> `documents/30d`
 * The adapter asks for [now-29d, now] inclusive. The facets/daily endpoint hands
 * back per-day counts for an arbitrary range in ONE request; verified 2026-09-23
 * that summing facet counts over a range equals the range endpoint's own count
 * (8 == 8 for 2025-08-01..30), so the rolling sum below is exact, not an estimate.
 */
const FR_WINDOW_DAYS = 30;

async function buildFederalRegister(days) {
  const cached = cacheRead('federal-register-daily');
  let daily = cached.daily ?? null;

  if (!daily) {
    const from = isoDay(dayMs(days[0]) - FR_WINDOW_DAYS * MS_DAY);
    const to = days[days.length - 1];
    const params = new URLSearchParams({
      'conditions[term]': 'artificial intelligence',
      'conditions[publication_date][gte]': from,
      'conditions[publication_date][lte]': to,
    });
    const body = await fetchJson(`https://www.federalregister.gov/api/v1/documents/facets/daily?${params}`, { timeoutMs: 60_000 });
    if (!body || typeof body !== 'object') throw new Error('federal-register backfill: facets response was not an object');
    daily = {};
    for (const [d, v] of Object.entries(body)) daily[d] = Number(v?.count ?? 0);
    cacheWrite('federal-register-daily', { daily });
    console.log(`    federal-register: ${Object.keys(daily).length} days in one request`);
  }

  const series = {};
  for (const d of days) {
    let sum = 0, have = true;
    for (let i = 0; i < FR_WINDOW_DAYS; i++) {
      const wd = isoDay(dayMs(d) - i * MS_DAY);
      if (daily[wd] === undefined) { have = false; break; }
      sum += daily[wd];
    }
    series[d] = have ? sum : null;
  }
  return series;
}

/**
 * hn -> `points/24h`
 * Sum of story points over the 24h ending at the close of day d, title-only
 * match on "AI", tags=story. One request per day.
 *
 * The live adapter refuses any window that overflows Algolia's 1000-hit ceiling
 * rather than report a truncated sum. We refuse the same way - a truncated day
 * is recorded as a gap, because a silently-low point total on the loudest AI day
 * of the year is exactly the corruption a frozen reference must not contain.
 */
const ALGOLIA_HIT_CEILING = 1000;

async function buildHn(days) {
  return walkDays('hn', days, async (d) => {
    const end = Math.floor(endOfDay(d) / 1000);
    const start = end - 86_400;
    const params = new URLSearchParams({
      tags: 'story', query: 'AI', restrictSearchableAttributes: 'title',
      // Both bounds, unlike the live adapter, which only needs a lower bound
      // because its upper bound is "now".
      numericFilters: `created_at_i>${start},created_at_i<${end}`,
      hitsPerPage: String(ALGOLIA_HIT_CEILING), page: '0',
    });
    const body = await fetchJson(`https://hn.algolia.com/api/v1/search?${params}`, { timeoutMs: 30_000 });
    if (!Array.isArray(body?.hits)) throw new Error('no hits array');
    if (!Number.isFinite(body.nbHits)) throw new Error('non-numeric nbHits');
    if (body.hits.length < body.nbHits) throw new Error(`overflowed the ${ALGOLIA_HIT_CEILING}-hit ceiling (nbHits=${body.nbHits})`);
    let points = 0;
    for (const h of body.hits) points += Number(h.points ?? 0);
    return points;
  }, { delayMs: 120, label: 'hn' });
}

/**
 * sec-fts -> `filings/30d`
 * The adapter uses startdt = enddt - 30 days, both as plain YYYY-MM-DD.
 * Reproduced exactly, including the saturation refusal: EDGAR's counter caps at
 * 10000 and flips relation to "gte", which would pin the series flat.
 *
 * The contact-only User-Agent is not optional. SEC's WAF 403s any UA containing
 * a URL, and fetch.mjs's default carries the repo URL - the header key must be
 * lowercase to replace it rather than sit beside it.
 */
const SEC_WINDOW_DAYS = 30;
const SEC_UA = 'doomcon.watch backfill (gabegtornberg@protonmail.com)';

async function buildSecFts(days) {
  return walkDays('sec-fts', days, async (d) => {
    const end = endOfDay(d);
    const params = new URLSearchParams({
      q: '"artificial intelligence"', dateRange: 'custom',
      startdt: isoDay(end - SEC_WINDOW_DAYS * MS_DAY), enddt: isoDay(end),
    });
    const body = await fetchJson(`https://efts.sec.gov/LATEST/search-index?${params}`, {
      headers: { 'user-agent': SEC_UA }, timeoutMs: 30_000,
    });
    const total = body?.hits?.total;
    if (!total || typeof total.value !== 'number') throw new Error('no hits.total.value');
    if (total.relation !== 'eq') throw new Error(`saturated at ${total.value} (relation=${total.relation})`);
    return total.value;
  }, { delayMs: 200, label: 'sec-fts' });
}

/**
 * arxiv -> `papers/7d`
 * Exact population count of cs.AI/cs.LG/cs.CL submissions in the 7 days ending
 * at the close of day d. One request per day.
 *
 * arXiv throttles windowed submittedDate queries hard and keeps throttling:
 * measured 2026-09-23, six requests in four minutes earned an instant
 * HTTP 429 "Rate exceeded." on every subsequent windowed query for the next
 * twenty minutes, while unwindowed queries kept returning 200 from cache. The
 * delay below is deliberately above arXiv's published 1-request-per-3-seconds
 * guidance. If it still 429s, this source ends up in `unavailable` and goes dark
 * at launch - which is the correct outcome. An uncalibrated source is worse than
 * an absent one.
 */
const ARXIV_WINDOW_DAYS = 7;

async function buildArxiv(days) {
  const stamp = (ms) => {
    const dt = new Date(ms), p = (n) => String(n).padStart(2, '0');
    return `${dt.getUTCFullYear()}${p(dt.getUTCMonth() + 1)}${p(dt.getUTCDate())}${p(dt.getUTCHours())}${p(dt.getUTCMinutes())}`;
  };
  return walkDays('arxiv', days, async (d) => {
    const end = endOfDay(d);
    const from = stamp(end - ARXIV_WINDOW_DAYS * MS_DAY), to = stamp(end);
    const query = `(cat:cs.AI+OR+cat:cs.LG+OR+cat:cs.CL)+AND+submittedDate:[${from}+TO+${to}]`;
    const xml = await fetchText(`https://export.arxiv.org/api/query?search_query=${query}&start=0&max_results=1`, {
      timeoutMs: 45_000, retries: 0,
    });
    if (/<title>\s*Error\s*<\/title>/i.test(xml)) throw new Error('API returned an error entry');
    const m = xml.match(/<opensearch:totalResults[^>]*>\s*(\d+)\s*<\/opensearch:totalResults>/i);
    if (!m) throw new Error('no <opensearch:totalResults>');
    // A cached response for a different query would echo a different search_query
    // in its title. Checking it costs nothing and catches an edge-cache collision,
    // which on this endpoint would be a plausible-looking 200 carrying the
    // unwindowed catalogue total.
    const title = xml.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '';
    if (!title.includes(from)) throw new Error(`response echoes a different query (title: ${title.slice(0, 80)})`);
    const v = Number(m[1]);
    if (v === 0) throw new Error('0 submissions over 7d is implausible; treating the date filter as broken');
    return v;
  }, { delayMs: 3500, label: 'arxiv' });
}

// ---------------------------------------------------------------------------
// Source registry
//
// `id` MUST equal the live adapter's id, and `accepted_units` MUST contain the
// unit string that adapter emits. Both were read out of collector/sources/*.mjs
// rather than guessed; if an adapter changes either, the engine darks that
// source with a unit_mismatch instead of normalising against the wrong history.
// ---------------------------------------------------------------------------
const SOURCES = [
  { id: 'wikipedia', pillar: 'attention', unit: 'pageviews/day', accepted_units: ['pageviews/day'],
    from: HISTORY_FROM, build: buildWikipedia, aliases: ['wikimedia', 'wikipedia-pageviews'],
    method: '7-day mean of total daily pageviews across 9 frozen en.wikipedia articles (Wikimedia REST pageviews, agent=user)',
    params: { articles: WIKI_ARTICLES, window_days: WIKI_WINDOW_DAYS } },

  { id: 'federal-register', pillar: 'governance', unit: 'documents/30d', accepted_units: ['documents/30d'],
    from: HISTORY_FROM, build: buildFederalRegister, aliases: ['fedreg', 'federal_register'],
    method: 'rolling 30-day inclusive count of Federal Register documents matching the term "artificial intelligence", summed from the facets/daily endpoint',
    params: { term: 'artificial intelligence', window_days: FR_WINDOW_DAYS } },

  { id: 'hn', pillar: 'attention', unit: 'points/24h', accepted_units: ['points/24h'],
    from: HISTORY_FROM, build: buildHn, aliases: ['hackernews', 'hn-algolia'],
    method: 'sum of story points over the trailing 24h, HN Algolia tags=story with a title-only match on "AI"; days overflowing the 1000-hit ceiling are gaps',
    params: { query: 'AI', title_only: true, window_seconds: 86400 } },

  { id: 'sec-fts', pillar: 'compute', unit: 'filings/30d', accepted_units: ['filings/30d'],
    fromOffsetDays: 400, build: buildSecFts, aliases: ['sec', 'edgar-fts'],
    method: 'EDGAR full-text-search hit count for the phrase "artificial intelligence" over a trailing 30-day filing-date range; saturated counts (relation != eq) are gaps',
    params: { query: '"artificial intelligence"', window_days: SEC_WINDOW_DAYS } },

  { id: 'arxiv', pillar: 'capability', unit: 'papers/7d', accepted_units: ['papers/7d'],
    fromOffsetDays: 400, build: buildArxiv, aliases: ['arxiv-submissions'],
    method: 'exact count of cs.AI OR cs.LG OR cs.CL submissions in the trailing 7 days, from opensearch:totalResults on a submittedDate-windowed query',
    params: { categories: ['cs.AI', 'cs.LG', 'cs.CL'], window_days: ARXIV_WINDOW_DAYS } },
];

// Deliberately NOT backfilled. Recorded in reference.json so the omissions are
// public and argued rather than silent.
const EXCLUDED = [
  { id: 'openrouter', reason: 'the /models catalogue is a survivor set - delisted models vanish, so a reconstructed 30d count is biased low the further back it reaches (only 9 of 454 listed models carry a 2023 created date). Calibrating live readings against a downward-biased history would bias the live score upward, which is a confident number over a compromised pipe.' },
  { id: 'huggingface', reason: 'no keyless historical endpoint; reconstructing createdAt counts would require paging the entire model index.' },
  { id: 'github-releases', reason: 'releases.atom returns only the most recent entries per repo, with no date-range parameter.' },
  { id: 'govuk', reason: 'the search API exposes no reliable publication-date range filter for historical counts.' },
  { id: 'polymarket', reason: 'no historical price series on the keyless gamma endpoint; current prices only.' },
  { id: 'manifold', reason: 'turnover is reported as a current aggregate, not a dated series.' },
  { id: 'vastai', reason: 'spot pricing is a live snapshot with no history endpoint.' },
  { id: 'stockanalysis', reason: 'unofficial and ToS-risky; excluded from calibration so the index can never depend on it.' },
  { id: 'epoch', reason: 'notable_ai_models.csv is backfillable and was verified (8436 rows), but no live adapter reads it, so a frozen distribution for it would calibrate nothing.' },
];

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

async function build(opts) {
  const yesterday = isoDay(Date.now() - MS_DAY);
  const quick = opts.quick;
  const refDays = quick ? 30 : REFERENCE_WINDOW_DAYS;

  console.log(`DOOMCON backfill v${BACKFILL_VERSION}`);
  console.log(`  reference window : ${refDays} days ending ${yesterday}`);
  console.log(`  chart history    : from ${quick ? isoDay(dayMs(yesterday) - 60 * MS_DAY) : HISTORY_FROM}`);
  console.log('');

  const built = {};
  const unavailable = [];

  for (const src of SOURCES) {
    if (opts.only && !opts.only.includes(src.id)) continue;
    const from = quick
      ? isoDay(dayMs(yesterday) - 60 * MS_DAY)
      : (src.fromOffsetDays ? isoDay(dayMs(yesterday) - src.fromOffsetDays * MS_DAY) : src.from);
    const days = dayRange(from, yesterday);
    console.log(`[${src.id}] ${days.length} days, ${from} -> ${yesterday}`);
    try {
      built[src.id] = await src.build(days);
    } catch (e) {
      console.log(`  FAILED: ${e.message}`);
      unavailable.push({ id: src.id, reason: `backfill failed: ${e.message}` });
    }
  }

  // ---- reference: the trailing window of each series -----------------------
  const refFrom = isoDay(dayMs(yesterday) - (refDays - 1) * MS_DAY);
  const sources = {};

  for (const src of SOURCES) {
    const series = built[src.id];
    if (!series) continue;
    const window = dayRange(refFrom, yesterday);
    const values = window.map((d) => series[d]).filter((v) => v !== null && v !== undefined && Number.isFinite(v));
    const gaps = window.length - values.length;

    const need = quick ? 10 : MIN_REFERENCE_DAYS;
    if (values.length < need) {
      unavailable.push({ id: src.id, reason: `only ${values.length} usable days in the ${refDays}-day reference window (need ${need}); ${gaps} gaps` });
      console.log(`[${src.id}] EXCLUDED from reference: ${values.length}/${window.length} usable days`);
      continue;
    }

    const sorted = [...values].sort((a, b) => a - b);
    sources[src.id] = {
      label: src.id, pillar: src.pillar, aliases: src.aliases,
      unit: src.unit, accepted_units: src.accepted_units,
      method: src.method, params: src.params,
      n: values.length,
      coverage: { from: refFrom, to: yesterday, days_in_window: window.length, days_observed: values.length, gaps },
      min: round(sorted[0], 6), max: round(sorted[sorted.length - 1], 6),
      median: round(quantileSorted(sorted, 0.5), 6),
      quantiles: quantileGrid(values),
    };
    console.log(`[${src.id}] reference built: n=${values.length} gaps=${gaps} min=${sorted[0]} median=${round(quantileSorted(sorted, 0.5), 2)} max=${sorted[sorted.length - 1]}`);
  }

  if (Object.keys(sources).length === 0) throw new Error('backfill produced no usable reference distributions; refusing to write an empty frozen file');

  const reference = {
    schema: 1,
    frozen: true,
    built_at: new Date().toISOString(),
    builder_version: BACKFILL_VERSION,
    note: 'FROZEN. Built once by collector/backfill.mjs and never regenerated. Every published score is a percentile against these exact quantile grids; rebuilding this file silently rebases the entire index and invalidates every receipt ever issued.',
    reference_window_days: refDays,
    reference_window: { from: refFrom, to: yesterday },
    quantile_knots: QUANTILE_KNOTS,
    quantile_definition: 'linear interpolation between order statistics (type 7, the numpy/R default)',
    sources,
    // Named, with reasons. A reader can check that we left out what we say we
    // left out, which is the only way "we do not cherry-pick" is falsifiable.
    unavailable: [...unavailable, ...EXCLUDED],
  };

  if (existsSync(P.reference) && !opts.force) {
    throw new Error(`${P.reference} already exists and is FROZEN. Pass --force only if you intend to invalidate every receipt ever issued.`);
  }
  mkdirSync(dirname(P.reference), { recursive: true });
  writeFileSync(P.reference, JSON.stringify(reference, null, 2) + '\n', 'utf8');
  console.log(`\nwrote ${P.reference} (${Object.keys(sources).length} sources, ${unavailable.length + EXCLUDED.length} recorded unavailable)`);

  return { reference, built, yesterday, quick };
}

// ---------------------------------------------------------------------------
// Reconstructed chart history
//
// Marked backfilled:true. The engine ignores these lines when computing its
// dwell windows - they are daily, reconstructed from a partial pillar set, and
// folding them into a "3h mean" would be mixing cadences and calling the result
// a measurement. They exist so the site launches with a chart instead of a
// single number, and they carry pillars_live so the chart can say so.
// ---------------------------------------------------------------------------
function replayHistory({ reference, built, yesterday, quick }) {
  const ids = Object.keys(reference.sources);
  const first = ids.map((id) => Object.keys(built[id] ?? {}).sort()[0]).filter(Boolean).sort()[0];
  if (!first) throw new Error('replayHistory: no series to replay');

  const days = dayRange(first, yesterday);
  const lines = [];
  const rawHistory = {}; // id -> ordered raw scores, for the NowCast series

  for (const d of days) {
    const perSource = {};
    for (const id of ids) {
      const v = built[id]?.[d];
      if (v === null || v === undefined || !Number.isFinite(v)) { perSource[id] = null; continue; }
      perSource[id] = normalise(v, reference.sources[id]).score;
    }

    const smoothed = {};
    for (const id of ids) {
      (rawHistory[id] ??= []).push(perSource[id]);
      if (perSource[id] === null) { smoothed[id] = null; continue; }
      const series = rawHistory[id].slice(-12).reverse();
      smoothed[id] = nowcast(series).value;
    }

    const pillars = {};
    for (const { id: pid } of PILLARS) {
      const mine = ids.filter((id) => reference.sources[id].pillar === pid && smoothed[id] !== null);
      pillars[pid] = mine.length === 0 ? null : round(mine.reduce((a, id) => a + smoothed[id], 0) / mine.length, 4);
    }

    const live = Object.values(pillars).filter((v) => v !== null);
    const score = composite(live);

    lines.push({
      t: `${d}T23:59:59.999Z`,
      score,
      level: levelFor(score),
      level_name: score === null ? null : LEVEL_NAMES[levelFor(score)],
      degraded: true,
      backfilled: true,
      // Every backfilled point is reconstructed from a partial pillar set. Saying
      // so on every line means no consumer can plot it as if it were the live index.
      pillars_live: live.length,
      pillars_total: PILLARS.length,
      rule_fired: 'backfill',
      pillars,
      sources: perSource,
    });
  }

  const usable = lines.filter((l) => l.score !== null);
  if (existsSync(P.history) && !quick) {
    const existing = readFileSync(P.history, 'utf8').split('\n').filter(Boolean);
    if (existing.some((l) => !JSON.parse(l).backfilled)) {
      console.log(`\nSKIPPED history replay: ${P.history} already contains live observations. Backfill must not be interleaved after go-live.`);
      return lines;
    }
  }
  writeFileSync(P.history, usable.map((l) => JSON.stringify(l)).join('\n') + '\n', 'utf8');
  console.log(`wrote ${P.history}: ${usable.length} reconstructed days, ${lines[0].t.slice(0, 10)} -> ${lines[lines.length - 1].t.slice(0, 10)}`);
  const last = usable[usable.length - 1];
  console.log(`  latest reconstructed point: score=${last.score} level=${last.level} ${last.level_name} (${last.pillars_live}/${last.pillars_total} pillars)`);
  return lines;
}

function parseArgs(argv) {
  const opts = { force: false, quick: false, only: null, skipHistory: false };
  for (const a of argv) {
    if (a === '--force') opts.force = true;
    else if (a === '--quick') opts.quick = true;
    else if (a === '--skip-history') opts.skipHistory = true;
    else if (a.startsWith('--only=')) opts.only = a.slice(7).split(',');
    else throw new Error(`unknown argument ${a}`);
  }
  return opts;
}

export async function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  const result = await build(opts);
  if (!opts.skipHistory) replayHistory(result);
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error(`\nBACKFILL FAILED: ${e.message}`); process.exitCode = 1; });
}
