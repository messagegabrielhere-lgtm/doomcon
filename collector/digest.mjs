#!/usr/bin/env node
// collector/digest.mjs — the value-add layer. data/ in, data/digest.json out.
//
//   docker run --rm -v "$PWD":/app -w /app node:20-alpine node collector/digest.mjs
//
// The dashboard says WHAT happened. This says what it MEANS, and it does so
// without a single sentence of invented prose. Every "why this matters" line
// below is assembled from facts that are already in the inputs: how many
// independent sources carried an item, how fast that source is publishing
// against its own baseline, which lab is named, where that lab sits on the
// leaderboard, which pillar moved and by how much.
//
// THE RULE THIS FILE EXISTS TO HOLD: no LLM, no judgement, no prose invention.
// docs/TEARDOWN.md §4 is the whole argument — DoomBench's 67.8 and the IMD
// clock cannot be recomputed by a stranger, and ours can. A generated summary
// would torch that in one paragraph. So every string this module emits is a
// template with measured numbers substituted into it, and docs/DIGEST.md
// publishes every rule and every threshold that produced them.
//
// NO NETWORK. CONTRACT.md §1.5 routes every network call through
// collector/fetch.mjs; this module makes none at all, which is why it does not
// import it. It is a pure function of the files in data/ plus one wall-clock
// read for `generated_at` (CONTRACT.md §1.4's explicit exception). Every other
// number is anchored to `as_of`, which is read from data/news.json, so two runs
// over identical inputs differ in exactly one field.
//
// WRITES data/digest.json ONLY. It never touches public/, so it is safe either
// side of site/build.mjs — which clears public/ and would delete anything
// written there first. Its place in the pipeline is after engine.mjs (it reads
// state.json and history.ndjson) and before site/build.mjs.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const DIGEST_VERSION = '1.0.0';

// ---------------------------------------------------------------------------
// Every threshold, in one object, emitted into the output file.
// ---------------------------------------------------------------------------
//
// These travel WITH the numbers for the same reason data/news.json carries its
// `scoring` block (docs/NEWS.md, "Shapes"): a reader recomputing a selection
// should not have to match a file against a commit to find the constants that
// produced it. docs/DIGEST.md explains why each one is the number it is.
export const RULES = Object.freeze({
  // --- the daily brief ---
  BRIEF_WINDOW_HOURS: 24,
  BRIEF_MAX_ITEMS: 6,
  BRIEF_MAX_PER_SOURCE: 2,
  // Rule weights. Corroboration is heaviest for the same reason it is the
  // heaviest scoring term in docs/NEWS.md: independent sources agreeing is the
  // strongest evidence available that a real event occurred, and it is the one
  // term a single-source competitor structurally cannot compute.
  RULE_WEIGHT: Object.freeze({
    corroborated: 3,
    engagement_outlier: 2,
    source_surge: 2,
    primary_announcement: 1,
    frontier_salience: 1,
  }),
  CORROBORATION_MIN_SOURCES: 2,
  ENGAGEMENT_QUANTILE: 0.9,
  ENGAGEMENT_MIN_SAMPLES: 10,
  SURGE_MIN_RATIO: 1.75,
  SURGE_MIN_ITEMS_24H: 4,
  SURGE_MIN_PRIOR_HOURS: 24,
  SALIENCE_MIN_ENTITIES: 2,
  PRIMARY_KINDS: Object.freeze(['lab', 'release']),

  // --- what changed ---
  DAY_MIN_AGE_HOURS: 20,
  DAY_MAX_AGE_HOURS: 40,
  RACE_PROB_MIN_MOVE: 0.005,
  MIN_LEDGER_RUNS: 1,

  // --- streaks and records ---
  RECORD_MIN_OBSERVATIONS: 2,
  STREAK_MIN_MOVES: 2,
  EXTREME_PERCENTILE_LOW: 0.05,
  EXTREME_PERCENTILE_HIGH: 0.95,

  // --- entity rollups ---
  ROLLUP_TOP_ITEMS: 3,

  // --- housekeeping ---
  SKEW_NOTE_HOURS: 6,
});

// The frontier roster. Ids match data/race.json players so the two join
// cleanly; `entities` are canonical names from the published vocabulary in
// collector/news-sources/_entities.mjs.
//
// Duplicated here rather than imported on purpose: this module must produce a
// rollup when data/race.json is absent, and a hand-maintained list that is
// printed in docs/DIGEST.md is auditable in a way that a transitive import is
// not. When race.json IS present, its own `mindshare.entities` wins — it is the
// published join and RACE.md documents it.
export const LAB_ROSTER = Object.freeze([
  { id: 'openai', name: 'OpenAI', entities: ['OpenAI', 'GPT', 'o-series', 'Sora'] },
  { id: 'anthropic', name: 'Anthropic', entities: ['Anthropic', 'Claude'] },
  { id: 'google-deepmind', name: 'Google DeepMind', entities: ['Google DeepMind', 'Gemini', 'Gemma', 'Veo'] },
  { id: 'meta', name: 'Meta AI', entities: ['Meta AI', 'Llama'] },
  { id: 'xai', name: 'xAI', entities: ['xAI', 'Grok'] },
  { id: 'deepseek', name: 'DeepSeek', entities: ['DeepSeek', 'DeepSeek-R'] },
  { id: 'qwen', name: 'Alibaba Qwen', entities: ['Alibaba Qwen', 'Qwen'] },
  { id: 'mistral', name: 'Mistral', entities: ['Mistral', 'Mixtral'] },
]);

const PILLAR_ORDER = ['capability', 'compute', 'attention', 'governance', 'markets'];
const PILLAR_NAME = {
  capability: 'Capability',
  compute: 'Compute & Capital',
  attention: 'Attention',
  governance: 'Governance',
  markets: 'Markets',
};

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

function iso(value, what) {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) throw new Error(`digest: ${what} is not an ISO-8601 timestamp: ${JSON.stringify(value)}`);
  return ms;
}

function isoOrNull(value) {
  if (typeof value !== 'string') return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

// Ages floor at zero. Several feeds publish a few minutes into the future
// through clock skew (docs/NEWS.md, "Scoring"), and a negative age would make
// an item look older than the run that collected it.
function hoursSince(asOfMs, whenIso) {
  const ms = isoOrNull(whenIso);
  if (ms === null) return null;
  return Math.max(0, (asOfMs - ms) / 3600000);
}

function r1(n) { return Number.isFinite(n) ? Math.round(n * 10) / 10 : null; }
function r2(n) { return Number.isFinite(n) ? Math.round(n * 100) / 100 : null; }
function r4(n) { return Number.isFinite(n) ? Math.round(n * 10000) / 10000 : null; }

/**
 * Type 7 quantile — linear interpolation between order statistics, the numpy
 * and R default. The same definition data/reference.json states for the index's
 * own quantile grids, so "the 90th percentile" means one thing in this repo.
 */
export function quantile(sortedAsc, q) {
  const n = sortedAsc.length;
  if (n === 0) return null;
  if (n === 1) return sortedAsc[0];
  const h = (n - 1) * q;
  const lo = Math.floor(h);
  const hi = Math.min(lo + 1, n - 1);
  return sortedAsc[lo] + (h - lo) * (sortedAsc[hi] - sortedAsc[lo]);
}

// Item kinds, in words that pluralise. `kind` is a machine token from
// docs/NEWS.md ("lab | paper | model | release | forum | press | status"); a
// naive +"s" produces "6 presss", which is the kind of detail that makes a page
// look generated even when every number on it is right.
const KIND_LABEL = {
  lab: ['lab post', 'lab posts'],
  paper: ['paper', 'papers'],
  model: ['model release', 'model releases'],
  release: ['release', 'releases'],
  forum: ['forum thread', 'forum threads'],
  press: ['press item', 'press items'],
  status: ['status note', 'status notes'],
};

function kindLabel(kind, n) {
  const pair = KIND_LABEL[kind];
  if (!pair) return `${kind} item${n === 1 ? '' : 's'}`;
  return n === 1 ? pair[0] : pair[1];
}

function plural(n, one, many) { return n === 1 ? one : (many || `${one}s`); }

/** "A, B or C" — an English list, so a rendered sentence reads like one. */
function orList(names) {
  if (names.length <= 1) return names[0] || '';
  return `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`;
}

/** Fixed-width UTC clock, matching site/templates/_html.mjs utc(). */
function utcStamp(isoStr) {
  const d = new Date(Date.parse(isoStr));
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ` +
         `${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC`;
}

function utcClock(isoStr) {
  const d = new Date(Date.parse(isoStr));
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC`;
}

function utcDay(isoStr) { return new Date(Date.parse(isoStr)).toISOString().slice(0, 10); }

/**
 * The same signed value, for a SENTENCE rather than for a field.
 *
 * Every `*_label` and every numeric field in this file carries an ASCII
 * hyphen-minus, because those are data and a consumer parsing them should not
 * have to know about U+2212. The `why` lines and the rollup lines are prose
 * headed straight for a page, and site/templates/_html.mjs is explicit about
 * why display gets the real minus sign: the hyphen-minus is a different width
 * in JetBrains Mono's tabular set and a column of deltas jitters.
 */
function prose(n, decimals = 1) {
  const body = signed(n, decimals);
  return body === null ? null : body.replace('-', '\u2212');
}

// Signed with a plain ASCII sign: this is data, not display. The templates
// swap in U+2212 where a column of deltas has to line up.
function signed(n, decimals = 1) {
  if (!Number.isFinite(n)) return null;
  const body = Math.abs(n).toFixed(decimals);
  if (n > 0) return `+${body}`;
  if (n < 0) return `-${body}`;
  return `0.${'0'.repeat(decimals)}`;
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

async function readJsonOr(file, fallback) {
  if (!existsSync(file)) return fallback;
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (err) {
    throw new Error(`digest: ${file} is present but is not valid JSON: ${err.message}`);
  }
}

async function readHistory(file) {
  if (!existsSync(file)) return [];
  const text = await readFile(file, 'utf8');
  const rows = [];
  text.split('\n').forEach((line, n) => {
    if (!line.trim()) return;
    let row;
    try {
      row = JSON.parse(line);
    } catch (err) {
      // A corrupt line in an append-only log is a corrupt log. Skipping it
      // quietly is how a streak starts lying about how long it has run.
      throw new Error(`digest: ${file}:${n + 1} is not valid JSON: ${err.message}`);
    }
    const at = row.generated_at ?? row.t;
    if (!Number.isFinite(row.score) || !Number.isFinite(Date.parse(at))) {
      throw new Error(`digest: ${file}:${n + 1} needs a finite "score" and an ISO "t"/"generated_at"`);
    }
    rows.push({ ...row, generated_at: at });
  });
  rows.sort((a, b) => Date.parse(a.generated_at) - Date.parse(b.generated_at));
  return rows;
}

/** history.ndjson writes pillars as an object; state.json as an array. Both. */
function pillarValue(row, id) {
  if (!row || !row.pillars) return null;
  if (Array.isArray(row.pillars)) {
    const p = row.pillars.find((x) => x && x.id === id);
    return p && !p.dark && Number.isFinite(p.score) ? p.score : null;
  }
  const v = row.pillars[id];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

// ---------------------------------------------------------------------------
// Corpus shape
// ---------------------------------------------------------------------------

/**
 * What the news corpus actually is, measured rather than assumed.
 *
 * data/news.json nominally holds seven days. It is also capped at 200 items
 * (docs/NEWS.md, "Rolling window"), and on a busy run that cap bites long
 * before seven days do — the observed span on the run this was written against
 * was 32.95 hours, not 168. Printing "last 7 days" over a 33-hour corpus is the
 * kind of quiet inaccuracy this repo exists to not commit, so the span is
 * measured and published and every window label downstream reads it.
 */
function describeCorpus(news, asOfMs) {
  const items = Array.isArray(news.items) ? news.items : [];
  const stamps = items.map((it) => isoOrNull(it.published_at)).filter((x) => x !== null);
  const oldest = stamps.length ? Math.min(...stamps) : null;
  const newest = stamps.length ? Math.max(...stamps) : null;
  const spanHours = oldest === null ? 0 : Math.max(0, (asOfMs - oldest) / 3600000);

  const sources = Array.isArray(news.sources) ? news.sources : [];
  return {
    items: items.length,
    max_items: news.max_items ?? null,
    nominal_window_days: news.window_days ?? null,
    observed_span_hours: r1(spanHours),
    capped: news.max_items ? items.length >= news.max_items : false,
    oldest_item_at: oldest === null ? null : new Date(oldest).toISOString(),
    newest_item_at: newest === null ? null : new Date(newest).toISOString(),
    feeds_total: sources.length,
    feeds_live: sources.filter((s) => s.state === 'live').length,
    feeds_dormant: sources.filter((s) => s.state === 'dormant').length,
    feeds_dark: sources.filter((s) => s.state === 'dark' || s.ok === false).length,
  };
}

// ---------------------------------------------------------------------------
// 1. THE DAILY BRIEF
// ---------------------------------------------------------------------------

/**
 * Per-source publishing velocity against that source's own baseline.
 *
 * The baseline is the source's rate over the part of the corpus OLDER than the
 * brief window — its own recent normal, not a cross-source average, because a
 * feed that publishes sixty papers a day and a feed that publishes one blog
 * post a week are not comparable on any absolute scale.
 *
 * It is `awaiting-baseline`, and the surge rule does not fire, when the prior
 * segment is shorter than SURGE_MIN_PRIOR_HOURS. That is the honest state on a
 * capped corpus: the 200-item cut can leave under nine hours of prior, and a
 * ratio computed against nine hours is a number, not a measurement. Three
 * states, never collapsed — the same rule docs/NEWS.md applies to a feed.
 */
function sourceVelocity(items, asOfMs, corpus) {
  const windowH = RULES.BRIEF_WINDOW_HOURS;
  const priorHours = Math.max(0, (corpus.observed_span_hours ?? 0) - windowH);
  const comparable = priorHours >= RULES.SURGE_MIN_PRIOR_HOURS;

  const recent = new Map();
  const prior = new Map();
  for (const it of items) {
    const age = hoursSince(asOfMs, it.published_at);
    if (age === null) continue;
    const bucket = age <= windowH ? recent : prior;
    bucket.set(it.source, (bucket.get(it.source) || 0) + 1);
  }

  const out = new Map();
  const ids = [...new Set([...recent.keys(), ...prior.keys()])].sort();
  for (const id of ids) {
    const n24 = recent.get(id) || 0;
    const nPrior = prior.get(id) || 0;
    const baseline = comparable ? (nPrior * windowH) / priorHours : null;
    const ratio = baseline && baseline > 0 ? n24 / baseline : null;
    const surging = Boolean(
      comparable &&
      ratio !== null &&
      n24 >= RULES.SURGE_MIN_ITEMS_24H &&
      ratio >= RULES.SURGE_MIN_RATIO,
    );
    out.set(id, {
      source: id,
      state: comparable ? 'live' : 'awaiting-baseline',
      items_24h: n24,
      items_prior: nPrior,
      prior_hours: r1(priorHours),
      baseline_per_24h: r2(baseline),
      ratio: r2(ratio),
      surging,
    });
  }
  return {
    state: comparable ? 'live' : 'awaiting-baseline',
    prior_hours: r1(priorHours),
    min_prior_hours: RULES.SURGE_MIN_PRIOR_HOURS,
    reason: comparable
      ? null
      : `the corpus holds ${r1(priorHours)}h of history older than the ${windowH}h brief window, ` +
        `against the ${RULES.SURGE_MIN_PRIOR_HOURS}h a velocity baseline needs`,
    by_source: [...out.values()],
  };
}

/**
 * Engagement thresholds, computed per source from the corpus itself.
 *
 * An absolute cut-off ("500 Hacker News points") is wrong twice: it does not
 * transfer between metrics (HN points, HF upvotes and HF likes run on three
 * different scales — docs/NEWS.md tabulates them) and it does not survive a
 * quiet week. The p90 of what that source actually carried in this window is
 * self-calibrating, is recomputable from the published file, and is emitted
 * here with its sample size so a reader can see when it rests on ten values.
 */
function engagementThresholds(items) {
  const bySource = new Map();
  for (const it of items) {
    const e = it.meta && it.meta.engagement;
    if (!e || !Number.isFinite(e.value)) continue;
    if (!bySource.has(it.source)) bySource.set(it.source, { metric: e.metric, full_scale: e.full_scale ?? null, values: [] });
    bySource.get(it.source).values.push(e.value);
  }
  const out = new Map();
  for (const [id, rec] of [...bySource.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    rec.values.sort((a, b) => a - b);
    const enough = rec.values.length >= RULES.ENGAGEMENT_MIN_SAMPLES;
    out.set(id, {
      source: id,
      metric: rec.metric,
      full_scale: rec.full_scale,
      samples: rec.values.length,
      state: enough ? 'live' : 'awaiting-baseline',
      threshold: enough ? r1(quantile(rec.values, RULES.ENGAGEMENT_QUANTILE)) : null,
      max: rec.values[rec.values.length - 1],
      median: r1(quantile(rec.values, 0.5)),
    });
  }
  return out;
}

/**
 * Which rules an item satisfies. An item enters the brief on ANY one of them.
 *
 * Five independent qualifying rules rather than one blended score, because a
 * blend hides which fact did the work. Here every selected item carries the
 * list of rules it fired, and each rule is a comparison a reader can redo
 * against data/news.json with a calculator.
 */
function qualify(item, ctx) {
  const fired = [];
  const corr = (item.meta && item.meta.corroboration) || { count: 1, sources: [item.source] };

  if ((corr.count || 1) >= RULES.CORROBORATION_MIN_SOURCES) fired.push('corroborated');

  if (isPrimaryAnnouncement(item, ctx)) fired.push('primary_announcement');

  const eng = item.meta && item.meta.engagement;
  const th = ctx.engagement.get(item.source);
  if (eng && Number.isFinite(eng.value) && th && th.state === 'live' && th.threshold !== null && eng.value >= th.threshold) {
    fired.push('engagement_outlier');
  }

  const vel = ctx.velocityBySource.get(item.source);
  if (vel && vel.surging && ctx.surgeTopItem.get(item.source) === item.id) fired.push('source_surge');

  const entities = Array.isArray(item.entities) ? item.entities : [];
  const labs = entities.filter((e) => ctx.frontierEntities.has(e));
  if (entities.length >= RULES.SALIENCE_MIN_ENTITIES && labs.length > 0) fired.push('frontier_salience');

  return fired;
}

/**
 * A primary announcement: the source published it itself, and its own adapter
 * did not down-weight it.
 *
 * `kind` alone is not enough. OpenAI's newsroom is the case that proves it —
 * docs/NEWS.md, "Per-item weight" records that its `<category>` element cleanly
 * separates launches from customer case studies, and that the case studies
 * filled the reel at full weight. The adapter already grades them: every
 * customer story in the window this was written against carries
 * `meta.source_weight` 0.45 against the feed's declared 1.00, while
 * "Introducing GPT-6 Sol and Luna" carries the full 1.00.
 *
 * So the rule reads the grade the adapter already published rather than
 * inventing a second one. A down-weighted item is not excluded from the brief —
 * it can still qualify on corroboration, engagement or salience, exactly as
 * docs/NEWS.md intends — it just cannot claim to be an announcement.
 */
function isPrimaryAnnouncement(item, ctx) {
  if (!RULES.PRIMARY_KINDS.includes(item.kind)) return false;
  const base = ctx.sourceWeight(item.source);
  const own = item.meta && item.meta.source_weight;
  if (!Number.isFinite(base) || !Number.isFinite(own)) return true;
  return own >= base - 1e-9;
}

/**
 * The computed "why this matters" line.
 *
 * Every clause below is a substitution into a fixed template. Nothing is
 * paraphrased, nothing is characterised, and no clause appears unless the
 * number behind it exists — an item with no corroboration simply has no
 * corroboration sentence, rather than one saying "only one source".
 */
function whyComponents(item, ctx) {
  const out = [];
  const corr = (item.meta && item.meta.corroboration) || null;

  if (corr && corr.count > 1) {
    const names = (corr.sources || []).map((s) => ctx.sourceLabel(s)).join(', ');
    const lead = Number.isFinite(corr.lead_minutes) && corr.lead_minutes > 0
      ? `, first at ${utcClock(corr.first_seen_published_at)}, ${Math.round(corr.lead_minutes)} minutes before the last of them`
      : '';
    out.push(`${corr.count} independent sources carried it — ${names}${lead}.`);
  }

  if (isPrimaryAnnouncement(item, ctx)) {
    out.push(item.kind === 'release'
      ? `A cut release tag in ${ctx.sourceLabel(item.source)} — the least ambiguous "shipped" event this layer can read.`
      : `Published directly by ${ctx.sourceLabel(item.source)} at its full declared feed weight of ${ctx.sourceWeight(item.source)}, not relayed from another outlet.`);
  }

  const eng = item.meta && item.meta.engagement;
  const th = ctx.engagement.get(item.source);
  if (eng && Number.isFinite(eng.value) && th && th.state === 'live' && th.threshold !== null && eng.value >= th.threshold) {
    out.push(
      `${eng.value} ${eng.metric.replace(/_/g, ' ')} against a window 90th percentile of ${th.threshold} ` +
      `across ${th.samples} scored ${ctx.sourceLabel(item.source)} items.`,
    );
  }

  const vel = ctx.velocityBySource.get(item.source);
  if (vel && vel.surging && ctx.surgeTopItem.get(item.source) === item.id) {
    out.push(
      `${ctx.sourceLabel(item.source)} published ${vel.items_24h} items in ${RULES.BRIEF_WINDOW_HOURS}h ` +
      `against its own baseline of ${vel.baseline_per_24h} — ${vel.ratio}x.`,
    );
  }

  const entities = Array.isArray(item.entities) ? item.entities : [];
  if (entities.length) {
    const named = `Names ${entities.join(', ')}.`;
    // One sentence per LAB, not per entity. "OpenAI" and "GPT" are two names
    // for one player on the leaderboard, and printing its rank twice reads as
    // a bug the first time anybody sees it.
    const seen = new Set();
    const placed = [];
    for (const e of entities) {
      const lab = ctx.labFor(e);
      if (!lab || seen.has(lab.id)) continue;
      seen.add(lab.id);
      const line = ctx.labPlacement(lab);
      if (line) placed.push(line);
      if (placed.length >= 2) break;
    }
    out.push(placed.length ? `${named} ${placed.join(' ')}` : named);
  }

  if (item.pillar) {
    const move = ctx.pillarMove(item.pillar);
    out.push(move
      ? `Feeds the ${PILLAR_NAME[item.pillar] || item.pillar} pillar, ${move}`
      : `Feeds the ${PILLAR_NAME[item.pillar] || item.pillar} pillar.`);
  }

  const age = hoursSince(ctx.asOfMs, item.published_at);
  if (age !== null) {
    out.push(`Published ${utcStamp(item.published_at)}, ${age < 1 ? `${Math.round(age * 60)} minutes` : `${r1(age)} hours`} before the compile stamp.`);
  }

  return out;
}

function buildBrief(news, ctx) {
  const items = Array.isArray(news.items) ? news.items : [];
  const candidates = items.filter((it) => {
    const age = hoursSince(ctx.asOfMs, it.published_at);
    return age !== null && age <= RULES.BRIEF_WINDOW_HOURS;
  });

  const scored = [];
  for (const it of candidates) {
    const fired = qualify(it, ctx);
    if (!fired.length) continue;
    const weight = fired.reduce((sum, r) => sum + (RULES.RULE_WEIGHT[r] || 0), 0);
    scored.push({ item: it, rules: fired.slice().sort(), weight });
  }

  // Total ordering, so two runs over one file produce one answer: weight, then
  // the item's own news score, then published time, then id. Every key is
  // immutable for a given (item, as_of) pair.
  scored.sort((a, b) =>
    b.weight - a.weight ||
    (b.item.score || 0) - (a.item.score || 0) ||
    Date.parse(b.item.published_at) - Date.parse(a.item.published_at) ||
    (a.item.id < b.item.id ? -1 : 1));

  // Diversity cap. arxiv-newest and hf-daily-papers contribute half the corpus
  // (docs/NEWS.md, "Known limitations" 4); without a per-source cap a brief of
  // six is a list of six preprints on a day a lab shipped something.
  const perSource = new Map();
  const chosen = [];
  const heldBack = [];
  for (const row of scored) {
    const n = perSource.get(row.item.source) || 0;
    if (chosen.length >= RULES.BRIEF_MAX_ITEMS) { heldBack.push(row); continue; }
    if (n >= RULES.BRIEF_MAX_PER_SOURCE) { heldBack.push(row); continue; }
    perSource.set(row.item.source, n + 1);
    chosen.push(row);
  }

  const entries = chosen.map((row, i) => {
    const it = row.item;
    const corr = (it.meta && it.meta.corroboration) || null;
    const why = whyComponents(it, ctx);
    return {
      rank: i + 1,
      id: it.id,
      title: it.title,
      summary: it.summary || null,
      url: it.url,
      source: it.source,
      source_label: ctx.sourceLabel(it.source),
      kind: it.kind,
      pillar: it.pillar,
      published_at: it.published_at,
      age_hours: r1(hoursSince(ctx.asOfMs, it.published_at)),
      news_score: it.score ?? null,
      rules: row.rules,
      rule_weight: row.weight,
      corroboration: corr ? { count: corr.count, sources: corr.sources || [], lead_minutes: corr.lead_minutes ?? null } : null,
      engagement: it.meta && it.meta.engagement ? { ...it.meta.engagement } : null,
      entities: Array.isArray(it.entities) ? it.entities : [],
      why_components: why,
      why: why.join(' '),
    };
  });

  return {
    // The brief is never padded. When fewer items clear the bar than there are
    // slots, the brief is short and says how many cleared it. Filling the rest
    // with the next-highest-scoring items would make "selected by rule" mean
    // "ranked by score", which is a different and weaker claim.
    state: entries.length ? 'live' : 'empty',
    window_hours: RULES.BRIEF_WINDOW_HOURS,
    window_from: new Date(ctx.asOfMs - RULES.BRIEF_WINDOW_HOURS * 3600000).toISOString(),
    candidates: candidates.length,
    qualified: scored.length,
    shown: entries.length,
    held_back: heldBack.length,
    max_items: RULES.BRIEF_MAX_ITEMS,
    max_per_source: RULES.BRIEF_MAX_PER_SOURCE,
    rule_counts: Object.fromEntries(
      Object.keys(RULES.RULE_WEIGHT).sort().map((r) => [r, scored.filter((s) => s.rules.includes(r)).length]),
    ),
    items: entries,
  };
}

// ---------------------------------------------------------------------------
// 2. WHAT CHANGED
// ---------------------------------------------------------------------------

/**
 * The index half of the diff, against two references.
 *
 * `since_previous` is the last observation, whatever its age — always available
 * once two observations exist, and it is what makes the module useful on day
 * one. `since_24h` is the observation closest to a day old inside a 20-40h
 * tolerance, which is the comparison a reader actually wants and which is
 * `awaiting-baseline` until the log is a day old. Both are published, each
 * labelled with the exact reference timestamp it used, because a delta whose
 * baseline is unstated is not a measurement.
 */
function indexDiff(state, history, asOfMs) {
  const cur = history.length ? history[history.length - 1] : null;

  const compare = (ref) => {
    if (!cur || !ref) return null;
    const pillars = PILLAR_ORDER.map((id) => {
      const from = pillarValue(ref.row, id);
      const to = pillarValue(cur, id);
      const live = Number.isFinite(from) && Number.isFinite(to);
      return {
        id,
        name: PILLAR_NAME[id],
        // A pillar with no score on either side is not "unchanged". It is
        // uncalibrated or dark, and saying "0.0" over it would be the exact
        // imputation CONTRACT.md forbids.
        state: live ? 'live' : 'not-scored',
        from: r2(from),
        to: r2(to),
        delta: live ? r2(to - from) : null,
        delta_label: live ? signed(to - from, 2) : null,
      };
    });
    const moved = pillars.filter((p) => p.state === 'live' && Math.abs(p.delta) > 0);
    moved.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || (a.id < b.id ? -1 : 1));
    return {
      state: 'live',
      reference_at: ref.row.generated_at,
      reference_age_hours: ref.age_hours,
      score_from: r2(ref.row.score),
      score_to: r2(cur.score),
      score_delta: r2(cur.score - ref.row.score),
      score_delta_label: signed(cur.score - ref.row.score, 2),
      level_from: ref.row.level ?? null,
      level_to: cur.level ?? null,
      level_changed: Number.isFinite(ref.row.level) && Number.isFinite(cur.level) ? ref.row.level !== cur.level : null,
      pillars,
      pillars_moved: moved.length,
      biggest_mover: moved.length ? moved[0] : null,
    };
  };

  const prevRow = history.length >= 2 ? { row: history[history.length - 2], age_hours: r1((Date.parse(cur.generated_at) - Date.parse(history[history.length - 2].generated_at)) / 3600000) } : null;

  let dayRow = null;
  for (let i = history.length - 2; i >= 0; i -= 1) {
    const ageH = (Date.parse(cur.generated_at) - Date.parse(history[i].generated_at)) / 3600000;
    if (ageH < RULES.DAY_MIN_AGE_HOURS) continue;
    if (ageH > RULES.DAY_MAX_AGE_HOURS) break;
    if (!dayRow || Math.abs(ageH - 24) < Math.abs(dayRow.age_hours - 24)) dayRow = { row: history[i], age_hours: r1(ageH) };
  }

  return {
    observations: history.length,
    since_previous: prevRow ? compare(prevRow) : {
      state: 'awaiting-baseline',
      reason: `data/history.ndjson holds ${history.length} observation${history.length === 1 ? '' : 's'}; a diff needs two`,
    },
    since_24h: dayRow ? compare(dayRow) : {
      state: 'awaiting-baseline',
      reason: `no observation in data/history.ndjson falls between ${RULES.DAY_MIN_AGE_HOURS}h and ${RULES.DAY_MAX_AGE_HOURS}h old`,
    },
    level_since: state.level_since ?? null,
    level_stable_hours: state.level_since ? r1((asOfMs - iso(state.level_since, 'state.level_since')) / 3600000) : null,
    rule_fired: state.rule_fired ?? null,
  };
}

/** The three source states, for a news feed. Never two, never merged. */
function newsSourceState(s) {
  if (s.state === 'live' || s.state === 'dormant' || s.state === 'dark') return s.state;
  return s.ok === false ? 'dark' : 'live';
}

/**
 * The three source states, for an index source.
 *
 * `awaiting-baseline` is a source that answered perfectly and has no frozen
 * reference to score against yet. docs/VOICE.md §4 is explicit that calling it
 * dark claims an outage that is not happening, and nine of fourteen sources
 * were in exactly this state on the run this was written against.
 */
function indexSourceState(s) {
  if (s.ok === true) return 'live';
  if (s.uncalibrated === true) return 'awaiting-baseline';
  return 'dark';
}

function sourceDiff(news, state, prevSnapshot) {
  const nowNews = new Map((news.sources || []).map((s) => [s.id, newsSourceState(s)]));
  const nowIndex = new Map((state.sources || []).map((s) => [s.id, indexSourceState(s)]));

  const build = (nowMap, prevMap, family) => {
    const transitions = [];
    if (!prevMap) return { state: 'awaiting-baseline', transitions, reason: 'no previous digest to diff against' };
    const ids = [...new Set([...nowMap.keys(), ...Object.keys(prevMap)])].sort();
    for (const id of ids) {
      const to = nowMap.get(id) ?? 'absent';
      const from = prevMap[id] ?? 'absent';
      if (from === to) continue;
      transitions.push({ family, id, from, to, kind: transitionKind(from, to) });
    }
    return { state: 'live', transitions, reason: null };
  };

  const newsDiff = build(nowNews, prevSnapshot ? prevSnapshot.news_sources : null, 'news');
  const idxDiff = build(nowIndex, prevSnapshot ? prevSnapshot.index_sources : null, 'index');

  const all = [...newsDiff.transitions, ...idxDiff.transitions];
  return {
    state: newsDiff.state === 'live' || idxDiff.state === 'live' ? 'live' : 'awaiting-baseline',
    reason: newsDiff.reason || idxDiff.reason,
    news: newsDiff,
    index: idxDiff,
    transitions: all,
    went_dark: all.filter((t) => t.kind === 'went_dark').length,
    came_back: all.filter((t) => t.kind === 'came_back').length,
    now: {
      news: Object.fromEntries([...nowNews.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))),
      index: Object.fromEntries([...nowIndex.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))),
    },
  };
}

function transitionKind(from, to) {
  if (to === 'dark') return 'went_dark';
  if (from === 'dark') return 'came_back';
  if (from === 'awaiting-baseline' && to === 'live') return 'newly_calibrated';
  if (to === 'dormant') return 'went_quiet';
  if (from === 'dormant') return 'resumed';
  if (to === 'absent') return 'left_the_roster';
  if (from === 'absent') return 'joined_the_roster';
  return 'changed';
}

function raceDiff(race, prevSnapshot) {
  if (!race || !Array.isArray(race.players)) {
    return { state: 'absent', reason: 'data/race.json was not present at digest time', movers: [], leader: null };
  }
  const prev = prevSnapshot ? prevSnapshot.race : null;
  const players = race.players.slice().sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
  const leader = players[0] || null;

  const movers = [];
  for (const p of players) {
    const m = p.market || {};
    const before = prev ? prev[p.id] : null;
    const rankDelta = before && Number.isFinite(before.rank) && Number.isFinite(p.rank) ? before.rank - p.rank : null;
    const probDelta = before && Number.isFinite(before.probability) && Number.isFinite(m.probability)
      ? m.probability - before.probability : null;
    const moved = (rankDelta !== null && rankDelta !== 0) ||
                  (probDelta !== null && Math.abs(probDelta) >= RULES.RACE_PROB_MIN_MOVE);
    if (!moved) continue;
    movers.push({
      id: p.id,
      name: p.name,
      rank: p.rank ?? null,
      rank_from: before ? before.rank : null,
      rank_delta: rankDelta,
      probability: r4(m.probability),
      probability_from: before ? r4(before.probability) : null,
      probability_delta: r4(probDelta),
      probability_delta_points: r1(probDelta === null ? null : probDelta * 100),
    });
  }
  movers.sort((a, b) => Math.abs(b.probability_delta ?? 0) - Math.abs(a.probability_delta ?? 0) || (a.id < b.id ? -1 : 1));

  // change_7d comes from the venue, not from us, so it is a live number on the
  // first run — the one part of this diff that needs no baseline of our own.
  const sevenDay = players
    .filter((p) => p.market && Number.isFinite(p.market.change_7d) && p.market.change_7d_state === 'live')
    .map((p) => ({
      id: p.id,
      name: p.name,
      rank: p.rank ?? null,
      change_7d: r4(p.market.change_7d),
      change_7d_points: r1(p.market.change_7d * 100),
      probability: r4(p.market.probability),
    }))
    .sort((a, b) => Math.abs(b.change_7d) - Math.abs(a.change_7d) || (a.id < b.id ? -1 : 1));

  return {
    state: prev ? 'live' : 'awaiting-baseline',
    reason: prev ? null : 'no previous digest to diff positions against; the venue\'s own 7-day change is published instead',
    venue: race.rank_basis && race.rank_basis.venue ? race.rank_basis.venue : null,
    event: race.rank_basis && race.rank_basis.event ? race.rank_basis.event.title : null,
    generated_at: race.generated_at ?? null,
    leader: leader ? { id: leader.id, name: leader.name, probability: r4(leader.market && leader.market.probability) } : null,
    movers,
    seven_day: sevenDay,
  };
}

/**
 * First sighting of an entity or a source in our corpus. Nobody else computes
 * this, and it is the cheapest genuinely new signal in the whole layer: a name
 * that has never appeared in the record before is a fact about the record, and
 * the record is ours.
 *
 * The trap is the first run, where every name is "new" and the claim is
 * meaningless. So the ledger seeds itself silently, marks every seeded entry,
 * and refuses to make a first-seen claim until it has survived
 * MIN_LEDGER_RUNS prior runs. Until then the block reads `awaiting-baseline` —
 * not "nothing is new", which would be a different and false statement.
 */
function updateLedger(news, prev, asOfIso) {
  const prevLedger = (prev && prev.ledger) || null;
  const runs = prevLedger ? (prevLedger.runs || 0) : 0;
  const established = prevLedger ? prevLedger.established_at : asOfIso;
  const entities = { ...(prevLedger ? prevLedger.entities : {}) };
  const sources = { ...(prevLedger ? prevLedger.sources : {}) };
  const seeding = runs < RULES.MIN_LEDGER_RUNS;

  const newEntities = [];
  const newSources = [];

  const items = Array.isArray(news.items) ? news.items : [];
  // Iterate oldest-first so an entity's ledger entry records the earliest item
  // that carried it, not whichever one the file happened to list first.
  const ordered = items.slice().sort((a, b) =>
    Date.parse(a.published_at) - Date.parse(b.published_at) || (a.id < b.id ? -1 : 1));

  for (const it of ordered) {
    const seenAt = (it.meta && it.meta.first_seen_at) || it.published_at;
    for (const name of (Array.isArray(it.entities) ? it.entities : [])) {
      if (entities[name]) { entities[name].items_total += 1; continue; }
      entities[name] = {
        first_seen_at: seenAt,
        first_published_at: it.published_at,
        first_item_id: it.id,
        first_item_title: it.title,
        first_source: it.source,
        seeded: seeding,
        items_total: 1,
      };
      if (!seeding) newEntities.push({ name, ...entities[name] });
    }
    if (!sources[it.source]) {
      sources[it.source] = { first_seen_at: seenAt, first_item_id: it.id, seeded: seeding };
      if (!seeding) newSources.push({ id: it.source, ...sources[it.source] });
    }
  }

  newEntities.sort((a, b) => Date.parse(a.first_seen_at) - Date.parse(b.first_seen_at) || (a.name < b.name ? -1 : 1));
  newSources.sort((a, b) => (a.id < b.id ? -1 : 1));

  return {
    ledger: {
      established_at: established,
      runs: runs + 1,
      min_runs_before_claiming: RULES.MIN_LEDGER_RUNS,
      entities_known: Object.keys(entities).length,
      sources_known: Object.keys(sources).length,
      entities: Object.fromEntries(Object.keys(entities).sort().map((k) => [k, entities[k]])),
      sources: Object.fromEntries(Object.keys(sources).sort().map((k) => [k, sources[k]])),
    },
    first_seen: {
      state: seeding ? 'awaiting-baseline' : 'live',
      reason: seeding
        ? `the entity ledger was established this run from ${Object.keys(entities).length} names already in the corpus; ` +
          `a first-sighting claim needs at least ${RULES.MIN_LEDGER_RUNS} prior run to be a claim about the record rather than about the ledger`
        : null,
      established_at: established,
      runs: runs + 1,
      entities: newEntities,
      sources: newSources,
    },
  };
}

// ---------------------------------------------------------------------------
// 3. STREAKS AND RECORDS
// ---------------------------------------------------------------------------

/**
 * A run of consecutive moves in one direction at the tail of the log.
 *
 * Counted in MOVES, not days: this index observes roughly hourly and calling
 * three consecutive rises "three days" would be false. A non-finite reading
 * (dark or uncalibrated) ends the streak and is named as the thing that ended
 * it, because a gap is not a flat stretch.
 */
function streakOf(series) {
  if (series.length < 2) return null;
  const vals = series.map((s) => s.value);
  const last = vals.length - 1;
  if (!Number.isFinite(vals[last]) || !Number.isFinite(vals[last - 1])) {
    return { direction: 'none', moves: 0, broken_by: 'a reading with no score', state: 'broken' };
  }
  const dir = Math.sign(vals[last] - vals[last - 1]);
  if (dir === 0) return { direction: 'flat', moves: 0, state: 'flat' };
  let moves = 0;
  let i = last;
  while (i >= 1 && Number.isFinite(vals[i]) && Number.isFinite(vals[i - 1]) && Math.sign(vals[i] - vals[i - 1]) === dir) {
    moves += 1;
    i -= 1;
  }
  const from = series[last - moves];
  const to = series[last];
  return {
    direction: dir > 0 ? 'rising' : 'falling',
    moves,
    observations: moves + 1,
    from: r2(from.value),
    to: r2(to.value),
    total_change: r2(to.value - from.value),
    total_change_label: signed(to.value - from.value, 2),
    from_at: from.at,
    to_at: to.at,
    span_hours: r1((Date.parse(to.at) - Date.parse(from.at)) / 3600000),
    state: moves >= RULES.STREAK_MIN_MOVES ? 'notable' : 'live',
  };
}

function extremesOf(series, label) {
  const live = series.filter((s) => Number.isFinite(s.value));
  if (live.length < RULES.RECORD_MIN_OBSERVATIONS) return null;
  let hi = live[0];
  let lo = live[0];
  for (const s of live) {
    if (s.value > hi.value) hi = s;
    if (s.value < lo.value) lo = s;
  }
  const cur = live[live.length - 1];
  return {
    label,
    observations: live.length,
    // Ties resolve to the EARLIEST observation: a record is set the first time
    // it is reached, not the last time it is equalled.
    high: { value: r2(hi.value), at: hi.at },
    low: { value: r2(lo.value), at: lo.at },
    current: r2(cur.value),
    // "record" is scoped to the observed log, and that scope travels in the
    // `scope` field and is repeated in every rendered sentence. There is no
    // "all-time" here, because there is no all-time yet and there will not be
    // one until the log is longer than the thing it claims to be a record over.
    //
    // Compared by VALUE, not by timestamp: a pillar that has not moved is at
    // its own log high AND its own log low, and saying otherwise because the
    // record was first set three observations ago is a technicality nobody
    // reading the page would accept.
    at_log_high: r2(cur.value) === r2(hi.value),
    at_log_low: r2(cur.value) === r2(lo.value),
    // A series that never moved has no record worth printing. Flagged rather
    // than dropped, so the reason it is absent from a page is inspectable.
    flat: r2(hi.value) === r2(lo.value),
  };
}

function buildStreaks(state, history, news, asOfMs) {
  const obs = history.length;
  if (obs < RULES.RECORD_MIN_OBSERVATIONS) {
    return {
      state: 'awaiting-baseline',
      observations: obs,
      min_observations: RULES.RECORD_MIN_OBSERVATIONS,
      reason: `data/history.ndjson holds ${obs} observation${obs === 1 ? '' : 's'}; ` +
              `a record needs at least ${RULES.RECORD_MIN_OBSERVATIONS} to be a comparison rather than a restatement`,
      records: [],
      streaks: [],
      facts: [],
    };
  }

  const spanHours = (Date.parse(history[history.length - 1].generated_at) - Date.parse(history[0].generated_at)) / 3600000;
  const scope = `${obs} observations spanning ${r1(spanHours)}h`;

  const composite = history.map((h) => ({ at: h.generated_at, value: h.score }));
  const records = [];
  const streaks = [];

  const cRec = extremesOf(composite, 'Composite');
  if (cRec) records.push({ id: 'composite', ...cRec, scope });
  const cStreak = streakOf(composite);
  if (cStreak) streaks.push({ id: 'composite', name: 'Composite', ...cStreak });

  for (const id of PILLAR_ORDER) {
    const series = history.map((h) => ({ at: h.generated_at, value: pillarValue(h, id) }));
    const rec = extremesOf(series, PILLAR_NAME[id]);
    if (rec) records.push({ id, ...rec, scope });
    const st = streakOf(series);
    if (st) streaks.push({ id, name: PILLAR_NAME[id], ...st });
  }

  streaks.sort((a, b) => b.moves - a.moves || (a.id < b.id ? -1 : 1));

  // Facts that cost nothing but arithmetic and are the reason a daily visit
  // pays. Each is a sentence with its denominator already in it.
  const facts = [];
  const fact = (id, text) => facts.push({ id, text });

  const quietest = composite.reduce((best, s) => (s.value < best.value ? s : best), composite[0]);
  const loudest = composite.reduce((best, s) => (s.value > best.value ? s : best), composite[0]);
  fact('quietest', `Quietest observation on record: ${r2(quietest.value)} of 100 at ${utcStamp(quietest.at)}, out of ${scope}.`);
  fact('loudest', `Loudest observation on record: ${r2(loudest.value)} of 100 at ${utcStamp(loudest.at)}, out of ${scope}.`);

  if (state.level_since) {
    const h = (asOfMs - iso(state.level_since, 'state.level_since')) / 3600000;
    fact('level_held', `${state.level_name} has held for ${r1(h)}h, since ${utcStamp(state.level_since)}.`);
  }

  // Sources sitting at an extreme of their own frozen reference. This is the
  // anomaly signal docs/SUB-INDICES.md §6 calls THE TELL, and it is available
  // on the first run because the reference is frozen, not accumulated.
  const extremes = (state.sources || [])
    .filter((s) => s.ok === true && Number.isFinite(s.percentile))
    .filter((s) => s.percentile <= RULES.EXTREME_PERCENTILE_LOW || s.percentile >= RULES.EXTREME_PERCENTILE_HIGH)
    .map((s) => ({
      id: s.id,
      pillar: s.pillar,
      percentile: r4(s.percentile),
      value: s.value,
      unit: s.unit ?? null,
      end: s.percentile >= RULES.EXTREME_PERCENTILE_HIGH ? 'high' : 'low',
    }))
    .sort((a, b) => a.percentile - b.percentile || (a.id < b.id ? -1 : 1));

  for (const e of extremes) {
    fact(`extreme_${e.id}`,
      `${e.id} is at the ${r1(e.percentile * 100)}th percentile of its own frozen reference — ` +
      `${e.value}${e.unit ? ` ${e.unit}` : ''}, the ${e.end} end of the record it is scored against.`);
  }

  // Corpus facts, measured from data/news.json rather than the index log.
  const items = Array.isArray(news.items) ? news.items : [];
  let busiestHour = null;
  if (items.length) {
    const byHour = new Map();
    for (const it of items) {
      const key = it.published_at.slice(0, 13);
      if (!byHour.has(key)) byHour.set(key, []);
      byHour.get(key).push(it);
    }
    const [bucketKey, bucket] = [...byHour.entries()]
      .sort((a, b) => b[1].length - a[1].length || (a[0] < b[0] ? -1 : 1))[0];
    const bySrc = new Map();
    for (const it of bucket) bySrc.set(it.source, (bySrc.get(it.source) || 0) + 1);
    const top = [...bySrc.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0];

    // A "busiest hour" is a lie when one feed stamps every item at midnight.
    // docs/NEWS.md records that Hugging Face's daily-papers timestamps are
    // date-granular and put ~40 items on one instant. Rather than trusting that
    // note, measure it: a source is date-granular in this window when every one
    // of its items lands at exactly 00:00:00 UTC. The caveat is then a fact
    // about this file, not a remembered caveat about a feed.
    const granular = dateGranularSources(items);
    const dominated = top[1] / bucket.length >= 0.5;
    const caveat = dominated && granular.includes(top[0])
      ? ` ${top[1]} of them came from ${top[0]}, every one of whose ${items.filter((i) => i.source === top[0]).length} items in this window is stamped 00:00:00 UTC — the hour is that feed's date granularity, not a burst.`
      : dominated
        ? ` ${top[1]} of them came from ${top[0]}.`
        : ` Across ${bySrc.size} feeds.`;
    busiestHour = {
      hour: `${bucketKey}:00:00Z`,
      items: bucket.length,
      top_source: top[0],
      top_source_items: top[1],
      feeds: bySrc.size,
      date_granular_sources: granular,
      dominated_by_one_feed: dominated,
    };
    fact('busiest_hour',
      `Busiest hour in the corpus: ${bucket.length} items stamped in the hour beginning ${bucketKey.replace('T', ' ')}:00 UTC.${caveat}`);

    const best = items.reduce((b, it) => ((it.score || 0) > (b.score || 0) ? it : b), items[0]);
    fact('top_item', `Highest-scoring item in the window: ${best.score} of 100, ${best.source}, ${utcStamp(best.published_at)}.`);

    const maxCorr = items.reduce((m, it) => Math.max(m, (it.meta && it.meta.corroboration && it.meta.corroboration.count) || 1), 1);
    const corrCount = items.filter((it) => ((it.meta && it.meta.corroboration && it.meta.corroboration.count) || 1) > 1).length;
    fact('corroboration',
      corrCount
        ? `${corrCount} of ${items.length} items were carried by more than one independent source; the most-corroborated by ${maxCorr}.`
        : `No item in the ${items.length}-item window was carried by more than one independent source. That is a measured zero across ${(news.sources || []).length} feeds, not a missing field.`);
  }

  return {
    state: 'live',
    observations: obs,
    span_hours: r1(spanHours),
    scope,
    first_observation_at: history[0].generated_at,
    records,
    streaks,
    longest_streak: streaks.find((s) => s.moves >= RULES.STREAK_MIN_MOVES) || null,
    source_extremes: extremes,
    busiest_hour: busiestHour,
    facts,
  };
}

/**
 * Sources whose every timestamp in this window is exactly 00:00:00 UTC.
 *
 * Measured, not remembered. It is the difference between "40 items in one hour"
 * and "a feed that only publishes a date", and every downstream hour-bucket
 * claim has to know which one it is looking at.
 */
function dateGranularSources(items) {
  const bySrc = new Map();
  for (const it of items) {
    if (!bySrc.has(it.source)) bySrc.set(it.source, { n: 0, midnight: 0 });
    const rec = bySrc.get(it.source);
    rec.n += 1;
    if (/T00:00:00/.test(it.published_at)) rec.midnight += 1;
  }
  return [...bySrc.entries()]
    .filter(([, rec]) => rec.n >= 2 && rec.midnight === rec.n)
    .map(([id]) => id)
    .sort();
}

// ---------------------------------------------------------------------------
// 4. ENTITY ROLLUPS
// ---------------------------------------------------------------------------

/**
 * Per frontier lab: everything the corpus and the leaderboard know about them,
 * in one object. This is the seed of the per-lab pages that are the
 * programmatic-SEO surface (docs/TEARDOWN.md §2.3 — the viral index gets the
 * spike, the long tail gets the traffic).
 *
 * The entity join prefers data/race.json's own `mindshare.entities`, which
 * docs/RACE.md publishes, so this module and /race never disagree about which
 * names belong to which lab. LAB_ROSTER is the fallback when race.json is
 * absent, and it is printed in docs/DIGEST.md.
 */
function buildRollups(news, race, corpus, asOfMs) {
  const items = Array.isArray(news.items) ? news.items : [];
  const byId = new Map();
  if (race && Array.isArray(race.players)) {
    for (const p of race.players) byId.set(p.id, p);
  }

  const roster = LAB_ROSTER.map((lab) => {
    const player = byId.get(lab.id) || null;
    const fromRace = player && player.mindshare && Array.isArray(player.mindshare.entities) && player.mindshare.entities.length
      ? player.mindshare.entities
      : null;
    return {
      ...lab,
      entities: fromRace || lab.entities,
      entity_source: fromRace ? 'data/race.json mindshare.entities' : 'digest LAB_ROSTER',
      player,
    };
  });

  const labs = roster.map((lab) => {
    const set = new Set(lab.entities);
    const mine = items.filter((it) => (it.entities || []).some((e) => set.has(e)));
    mine.sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at) || (a.id < b.id ? -1 : 1));

    const kinds = {};
    for (const it of mine) kinds[it.kind] = (kinds[it.kind] || 0) + 1;

    const days = {};
    for (const it of mine) {
      const d = utcDay(it.published_at);
      days[d] = (days[d] || 0) + 1;
    }

    const top = mine.slice()
      .sort((a, b) => (b.score || 0) - (a.score || 0) || (a.id < b.id ? -1 : 1))
      .slice(0, RULES.ROLLUP_TOP_ITEMS)
      .map((it) => ({
        id: it.id,
        title: it.title,
        url: it.url,
        source: it.source,
        kind: it.kind,
        pillar: it.pillar,
        published_at: it.published_at,
        score: it.score ?? null,
      }));

    const p = lab.player;
    const market = p && p.market ? {
      state: p.market.state ?? 'absent',
      rank: p.rank ?? null,
      probability: r4(p.market.probability),
      probability_pct: r1(p.market.probability === null || p.market.probability === undefined ? null : p.market.probability * 100),
      change_7d: r4(p.market.change_7d),
      change_7d_points: Number.isFinite(p.market.change_7d) ? r1(p.market.change_7d * 100) : null,
      change_7d_state: p.market.change_7d_state ?? null,
      venue: race && race.rank_basis ? race.rank_basis.venue : null,
    } : { state: 'absent', rank: null, probability: null, probability_pct: null, change_7d: null, change_7d_points: null, change_7d_state: null, venue: null };

    const ship = p && p.shipping ? p.shipping : null;
    const shipping = {
      github: ship && ship.github ? {
        state: ship.github.state, releases_30d: ship.github.releases_30d ?? null,
        is_floor: ship.github.is_floor === true, repos: ship.github.repos_total ?? null,
      } : { state: 'absent', releases_30d: null, is_floor: false, repos: null },
      openrouter: ship && ship.openrouter ? {
        state: ship.openrouter.state, listed_30d: ship.openrouter.listed_30d ?? null,
        catalogue: ship.openrouter.catalogue ?? null, newest_listed_at: ship.openrouter.newest_listed_at ?? null,
      } : { state: 'absent', listed_30d: null, catalogue: null, newest_listed_at: null },
      huggingface: ship && ship.huggingface ? {
        state: ship.huggingface.state, models_30d: ship.huggingface.models_30d ?? null,
        newest_at: ship.huggingface.newest_at ?? null,
      } : { state: 'absent', models_30d: null, newest_at: null },
    };

    const mindshare = p && p.mindshare ? {
      state: p.mindshare.state ?? 'absent',
      items: p.mindshare.items ?? null,
      corpus: p.mindshare.corpus ?? null,
      share: r4(p.mindshare.share),
      share_pct: Number.isFinite(p.mindshare.share) ? r1(p.mindshare.share * 100) : null,
      delta: r4(p.mindshare.delta),
      delta_points: Number.isFinite(p.mindshare.delta) ? r1(p.mindshare.delta * 100) : null,
      delta_state: p.mindshare.delta_state ?? null,
      source: 'data/race.json',
    } : { state: 'absent', items: null, corpus: null, share: null, share_pct: null, delta: null, delta_points: null, delta_state: null, source: null };

    const lines = [];
    const names = orList(lab.entities);
    lines.push(
      mine.length
        ? `${mine.length} of ${items.length} items in the ${r1(corpus.observed_span_hours)}h corpus name ${names}.`
        : `No item in the ${items.length}-item corpus names ${names}. A measured zero across ${corpus.feeds_live} live feeds.`,
    );
    if (mine.length) {
      const kindLine = Object.keys(kinds).sort().map((k) => `${kinds[k]} ${kindLabel(k, kinds[k])}`).join(', ');
      lines.push(`By kind: ${kindLine}.`);
      lines.push(`Most recent at ${utcStamp(mine[0].published_at)} via ${mine[0].source}.`);
    }
    if (market.state === 'live' && market.probability_pct !== null) {
      lines.push(
        `Rank ${market.rank} on the leaderboard at ${market.probability_pct}% on ${market.venue || 'the venue'}` +
        (market.change_7d_state === 'live' && market.change_7d_points !== null
          ? `, ${prose(market.change_7d_points, 1)} points over 7 days.` : '.'),
      );
    }
    const shipBits = [];
    if (shipping.github.state === 'live' && Number.isFinite(shipping.github.releases_30d)) {
      shipBits.push(`${shipping.github.is_floor ? '≥' : ''}${shipping.github.releases_30d} GitHub ${plural(shipping.github.releases_30d, 'release')}`);
    }
    if (shipping.openrouter.state === 'live' && Number.isFinite(shipping.openrouter.listed_30d)) {
      shipBits.push(`${shipping.openrouter.listed_30d} OpenRouter ${plural(shipping.openrouter.listed_30d, 'listing')}`);
    }
    if (shipping.huggingface.state === 'live' && Number.isFinite(shipping.huggingface.models_30d)) {
      shipBits.push(`${shipping.huggingface.models_30d} Hugging Face model ${plural(shipping.huggingface.models_30d, 'repo')}`);
    }
    if (shipBits.length) lines.push(`${shipBits.join(', ')} in 30 days.`);

    return {
      id: lab.id,
      name: lab.name,
      principal: p ? (p.principal ?? null) : null,
      entities: lab.entities,
      entity_source: lab.entity_source,
      items: mine.length,
      share_of_corpus: items.length ? r4(mine.length / items.length) : null,
      kinds: Object.fromEntries(Object.keys(kinds).sort().map((k) => [k, kinds[k]])),
      by_day: Object.fromEntries(Object.keys(days).sort().map((k) => [k, days[k]])),
      first_item_at: mine.length ? mine[mine.length - 1].published_at : null,
      latest_item_at: mine.length ? mine[0].published_at : null,
      latest_item_age_hours: mine.length ? r1(hoursSince(asOfMs, mine[0].published_at)) : null,
      top_items: top,
      market,
      shipping,
      mindshare,
      lines,
    };
  });

  // Ranked by leaderboard position when we have one, so /digest and /race agree
  // about who is first; corpus presence breaks ties and orders the rest.
  labs.sort((a, b) =>
    (a.market.rank ?? 99) - (b.market.rank ?? 99) ||
    b.items - a.items ||
    (a.id < b.id ? -1 : 1));

  const named = new Set();
  for (const it of items) for (const e of (it.entities || [])) named.add(e);

  return {
    state: labs.some((l) => l.items > 0) || labs.some((l) => l.market.state === 'live') ? 'live' : 'empty',
    window_hours: corpus.observed_span_hours,
    window_label: windowLabel(corpus),
    corpus_items: items.length,
    items_naming_any_entity: items.filter((it) => (it.entities || []).length > 0).length,
    distinct_entities: named.size,
    race_state: race ? 'live' : 'absent',
    labs,
  };
}

/**
 * The window, in words, measured. docs/NEWS.md declares a nominal seven days
 * and a 200-item cap; when the cap bites first, the honest label is the span
 * the corpus actually covers and the fact that it was truncated.
 */
export { kindLabel };

export function windowLabel(corpus) {
  const h = corpus.observed_span_hours ?? 0;
  const body = h >= 48 ? `${Math.round(h / 24)} days` : `${r1(h)} hours`;
  return corpus.capped
    ? `${body} (the ${corpus.max_items}-item cap, not the ${corpus.nominal_window_days}-day window)`
    : body;
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

export function buildDigest({ news, state, history, race, previous, generatedAt }) {
  if (!news || !Array.isArray(news.items)) throw new Error('digest: data/news.json is required and must carry an items array');
  if (!state || !Number.isFinite(state.score)) throw new Error('digest: data/state.json is required and must carry a finite score');

  const asOf = news.generated_at;
  const asOfMs = iso(asOf, 'news.generated_at');
  const indexAsOf = state.generated_at;
  const indexMs = iso(indexAsOf, 'state.generated_at');
  const skewS = Math.round((asOfMs - indexMs) / 1000);

  const corpus = describeCorpus(news, asOfMs);
  const items = news.items;

  const velocity = sourceVelocity(items, asOfMs, corpus);
  const velocityBySource = new Map(velocity.by_source.map((v) => [v.source, v]));
  const engagement = engagementThresholds(items);

  // One item per surging source carries the surge rule, so a feed that doubled
  // its rate contributes its best item rather than flooding the brief with the
  // reason it is surging.
  const surgeTopItem = new Map();
  for (const [id, v] of velocityBySource.entries()) {
    if (!v.surging) continue;
    const pool = items
      .filter((it) => it.source === id && hoursSince(asOfMs, it.published_at) <= RULES.BRIEF_WINDOW_HOURS)
      .sort((a, b) => (b.score || 0) - (a.score || 0) || (a.id < b.id ? -1 : 1));
    if (pool.length) surgeTopItem.set(id, pool[0].id);
  }

  const sourceLabels = new Map((news.sources || []).map((s) => [s.id, s.label || s.id]));
  const sourceWeights = new Map((news.sources || []).map((s) => [s.id, Number.isFinite(s.weight) ? s.weight : null]));
  const frontierEntities = new Set();
  const entityToLab = new Map();
  const racePlayers = race && Array.isArray(race.players) ? race.players : [];
  const rosterForEntities = LAB_ROSTER.map((lab) => {
    const p = racePlayers.find((x) => x.id === lab.id) || null;
    const names = p && p.mindshare && Array.isArray(p.mindshare.entities) && p.mindshare.entities.length
      ? p.mindshare.entities : lab.entities;
    return { ...lab, entities: names, player: p };
  });
  for (const lab of rosterForEntities) {
    for (const e of lab.entities) { frontierEntities.add(e); entityToLab.set(e, lab); }
  }

  const idx = indexDiff(state, history, asOfMs);

  const ctx = {
    asOfMs,
    engagement,
    velocityBySource,
    surgeTopItem,
    frontierEntities,
    sourceLabel: (id) => sourceLabels.get(id) || id,
    sourceWeight: (id) => sourceWeights.get(id) ?? null,
    labFor: (entity) => entityToLab.get(entity) || null,
    labPlacement: (lab) => {
      if (!lab || !lab.player || !lab.player.market || lab.player.market.state !== 'live') return null;
      const m = lab.player.market;
      if (!Number.isFinite(m.probability)) return null;
      return `${lab.name} sits at rank ${lab.player.rank} on the leaderboard at ${r1(m.probability * 100)}%.`;
    },
    pillarMove: (pillarId) => {
      const d = idx.since_previous;
      if (!d || d.state !== 'live') return null;
      const p = d.pillars.find((x) => x.id === pillarId);
      if (!p || p.state !== 'live') return null;
      return p.delta === 0
        ? `which held at ${p.to} of 100 across the ${d.reference_age_hours}h since the previous observation.`
        : `which moved ${prose(p.delta, 2)} in the ${d.reference_age_hours}h since the previous observation.`;
    },
  };

  const brief = buildBrief(news, ctx);
  const { ledger, first_seen } = updateLedger(news, previous, asOf);
  const prevSnapshot = previous && previous.snapshot ? previous.snapshot : null;

  const whatChanged = {
    state: 'live',
    since_previous_digest_at: prevSnapshot ? prevSnapshot.as_of : null,
    index: idx,
    sources: sourceDiff(news, state, prevSnapshot),
    race: raceDiff(race, prevSnapshot),
    first_seen,
  };

  const streaks = buildStreaks(state, history, news, asOfMs);
  const entities = buildRollups(news, race, corpus, asOfMs);

  const snapshot = {
    as_of: asOf,
    index_as_of: indexAsOf,
    score: r2(state.score),
    level: state.level,
    pillars: Object.fromEntries(PILLAR_ORDER.map((id) => {
      const p = (state.pillars || []).find((x) => x.id === id);
      return [id, p && Number.isFinite(p.score) ? r2(p.score) : null];
    })),
    news_sources: Object.fromEntries(
      (news.sources || []).map((s) => [s.id, newsSourceState(s)]).sort((a, b) => (a[0] < b[0] ? -1 : 1)),
    ),
    index_sources: Object.fromEntries(
      (state.sources || []).map((s) => [s.id, indexSourceState(s)]).sort((a, b) => (a[0] < b[0] ? -1 : 1)),
    ),
    race: Object.fromEntries(racePlayers.map((p) => [p.id, {
      rank: p.rank ?? null,
      probability: r4(p.market && p.market.probability),
      state: (p.market && p.market.state) || 'absent',
    }]).sort((a, b) => (a[0] < b[0] ? -1 : 1))),
  };

  return {
    schema: 1,
    generated_at: generatedAt,
    digest_version: DIGEST_VERSION,
    as_of: asOf,
    index_as_of: indexAsOf,
    clock_skew_seconds: skewS,
    clock_skew_note: Math.abs(skewS) >= RULES.SKEW_NOTE_HOURS * 3600
      ? `data/news.json and data/state.json were written ${r1(Math.abs(skewS) / 3600)}h apart. ` +
        'Every news figure below is measured against the news stamp and every index figure against the index stamp.'
      : null,
    inputs: {
      news_generated_at: news.generated_at,
      news_scoring_version: news.scoring_version ?? null,
      state_generated_at: state.generated_at,
      state_receipt_id: state.receipt_id ?? null,
      race_generated_at: race ? (race.generated_at ?? null) : null,
      race_present: Boolean(race),
      history_observations: history.length,
      previous_digest_at: previous ? (previous.as_of ?? null) : null,
    },
    rules: RULES,
    corpus,
    velocity,
    engagement_thresholds: [...engagement.values()],
    brief,
    what_changed: whatChanged,
    streaks,
    entities,
    ledger,
    snapshot,
  };
}

// Stable key order so two runs over identical inputs produce a byte-identical
// file and git stays quiet. Same helper shape as site/templates/_html.mjs
// stableJson(), duplicated because a collector must not import from site/.
function stableJson(value) {
  const sortKeys = (v) => {
    if (Array.isArray(v)) return v.map(sortKeys);
    if (v && typeof v === 'object') {
      const out = {};
      for (const k of Object.keys(v).sort()) out[k] = sortKeys(v[k]);
      return out;
    }
    return v;
  };
  return `${JSON.stringify(sortKeys(value), null, 2)}\n`;
}

function parseArgs(argv) {
  const out = { data: 'data', out: null, quiet: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--data' || a === '--out') { out[a.slice(2)] = argv[i + 1]; i += 1; }
    else if (a === '--quiet') out.quiet = true;
    else throw new Error(`digest: unknown argument "${a}". Usage: node collector/digest.mjs [--data DIR] [--out FILE] [--quiet]`);
  }
  out.data = path.resolve(ROOT, out.data);
  out.out = out.out ? path.resolve(ROOT, out.out) : path.join(out.data, 'digest.json');
  return out;
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const log = args.quiet ? () => {} : (...a) => console.log(...a);

  const newsFile = path.join(args.data, 'news.json');
  const stateFile = path.join(args.data, 'state.json');
  if (!existsSync(newsFile)) throw new Error(`digest: ${newsFile} does not exist. Run collector/news.mjs first.`);
  if (!existsSync(stateFile)) throw new Error(`digest: ${stateFile} does not exist. Run collector/engine.mjs first.`);

  const news = await readJsonOr(newsFile, null);
  const state = await readJsonOr(stateFile, null);
  const race = await readJsonOr(path.join(args.data, 'race.json'), null);
  const history = await readHistory(path.join(args.data, 'history.ndjson'));
  const previous = await readJsonOr(args.out, null);

  const digest = buildDigest({
    news,
    state,
    history,
    race,
    previous,
    // The one wall-clock read in the module, and the only field that differs
    // between two runs over identical inputs (CONTRACT.md §1.4).
    generatedAt: new Date().toISOString(),
  });

  await mkdir(path.dirname(args.out), { recursive: true });
  await writeFile(args.out, stableJson(digest));

  log('DOOMCON digest written.');
  log(`  out            ${args.out}`);
  log(`  as of          ${digest.as_of}  (index ${digest.index_as_of}, skew ${digest.clock_skew_seconds}s)`);
  log(`  corpus         ${digest.corpus.items} items over ${digest.corpus.observed_span_hours}h, ${digest.corpus.feeds_live} live feeds`);
  log(`  brief          ${digest.brief.shown} of ${digest.brief.qualified} qualified from ${digest.brief.candidates} candidates (${digest.brief.state})`);
  log(`  what changed   index ${digest.what_changed.index.since_previous.state}, sources ${digest.what_changed.sources.state}, race ${digest.what_changed.race.state}, first-seen ${digest.what_changed.first_seen.state}`);
  log(`  streaks        ${digest.streaks.state}, ${digest.streaks.observations} observations, ${digest.streaks.records.length} records, ${digest.streaks.facts.length} facts`);
  log(`  entities       ${digest.entities.labs.filter((l) => l.items > 0).length} of ${digest.entities.labs.length} labs present in the corpus`);
  log(`  ledger         run ${digest.ledger.runs}, ${digest.ledger.entities_known} entities known`);
  return digest;
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main().catch((err) => {
    console.error(`\n${err.message}\n`);
    process.exitCode = 1;
  });
}
