#!/usr/bin/env node
// BLISS — the upside index. DOOMCON's machinery, pointed the other way.
//
//   docker run --rm --network host -v "$PWD":/app -w /app node:20-alpine node collector/bliss.mjs
//
// WHY THIS EXISTS. Every competitor in this category measures one direction.
// DoomBench, the IMD AI Safety Clock, skynetcountdown, takeofftracker, pdoom.ai —
// all of them answer "how bad", none of them answers anything else. "AI is scary"
// is a crowded take. "Here are both numbers, computed identically, and today they
// disagree" is not a take at all: it is an instrument. It is also the only thing
// that makes a calm day interesting, and posting the calm days is where an index
// account's credibility comes from (docs/TEARDOWN.md §2.4).
//
// THE ONE RULE THAT SHAPES THIS FILE. BLISS must be computed by the SAME code as
// DOOMCON, not by a second implementation of the same formulas. Two implementations
// that can disagree would be worse than having no second index at all — the moment
// they diverge for an arithmetic reason rather than a world reason, the entire
// "you can recompute our number" claim dies. So every piece of maths below is
// IMPORTED from collector/engine.mjs: normalise, nowcast, composite, levelFor,
// decideLevel, round, and every constant. This file contributes exactly three
// things engine.mjs cannot know: a different pillar list, a different level
// vocabulary, and a different set of source adapters.
//
// WHAT IS DELIBERATELY NOT SHARED. runEngine() itself is not reusable here: it
// closes over engine.PILLARS, which is a frozen five-item list that CONTRACT.md
// forbids renaming or reordering. Rather than widen a contract that other modules
// depend on, this file re-walks the same steps in the same order, calling the same
// exported functions at each one. The arithmetic is shared; only the bookkeeping
// around it is restated.
//
// OUTPUT. data/bliss.json and data/bliss-history.ndjson, and NOTHING in public/.
// site/build.mjs clears public/ before it regenerates, so anything written there
// first is deleted. Same separate-failure-domain rule as the news and race layers:
// BLISS going dark must not stop the index building, and a dark index must not
// empty BLISS.

import { readdir, mkdir, writeFile, readFile, appendFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

import { fetchJson as sharedFetchJson, fetchText as sharedFetchText } from './fetch.mjs';
import {
  // The maths. Every one of these is the exact function that computes DOOMCON.
  normalise,
  nowcast,
  composite,
  levelFor,
  decideLevel,
  round,
  // The constants. Imported rather than copied so a change to the band table or
  // the anti-flap timings cannot apply to one index and not the other.
  BOUNDARY,
  DEADBAND,
  DWELL_UP_SECONDS,
  DWELL_DOWN_SECONDS,
  MIN_INTERVAL_MS,
  LOCK_MS,
  QUORUM,
  NOWCAST_WINDOW,
  NOWCAST_MIN_WEIGHT,
  SCORE_CENTRE,
  SCORE_Z_SCALE,
  ENGINE_VERSION,
} from './engine.mjs';
import { canonicalJson } from './receipts.mjs';

export const BLISS_SCHEMA = 1;
export const BLISS_VERSION = '1.0.0';

// ---------------------------------------------------------------------------
// The five pillars. Fixed ids, fixed order, never renamed — the same discipline
// CONTRACT.md imposes on DOOMCON's five, for the same reason: the ids are keys in
// an append-only history file and a rename silently orphans every stored series.
// ---------------------------------------------------------------------------

export const PILLARS = [
  {
    id: 'science',
    name: 'Science',
    blurb: 'AI methods showing up in other people’s fields.',
    description:
      'Papers outside computer science whose method is a model: structural biology, ' +
      'materials, chemistry, numerical analysis. Not the field talking about itself — ' +
      'the field being used by somebody solving a different problem.',
  },
  {
    id: 'medicine',
    name: 'Medicine',
    blurb: 'Trials started, clinical results indexed.',
    description:
      'Registered interventional trials involving AI, and the published clinical ' +
      'literature pairing a model with a diagnosis. A trial costs a protocol, an ethics ' +
      'board and enrolled human beings. It is the most expensive signal in this index.',
  },
  {
    id: 'access',
    name: 'Access',
    blurb: 'What a dollar buys, and what you may keep.',
    description:
      'The price of a million tokens at the cheap frontier, and the volume of weights ' +
      'published under a licence that lets a stranger run them commercially without ' +
      'asking. Falling cost is not a proxy for broadening access. It is broadening access.',
  },
  {
    id: 'adoption',
    name: 'Adoption',
    blurb: 'People building, not labs announcing.',
    description:
      'Installs of the AI stack and downloads of widely deployed open models. Every ' +
      'other pillar counts what laboratories produce; this one counts what everybody ' +
      'else does with it.',
  },
  {
    id: 'openness',
    name: 'Openness',
    blurb: 'How much of it anybody is allowed to hold.',
    description:
      'The open-weight share of notable model releases over a year, and the count of new ' +
      'permissively licensed ML repositories over a month. One measures the frontier, the ' +
      'other the floor. A share can fall while every count rises, and this pillar can say so.',
  },
];

const PILLAR_ORDER = Object.freeze(PILLARS.map((p) => p.id));

// ---------------------------------------------------------------------------
// The level vocabulary.
//
// BLISS counts 5 -> 1 exactly as DOOMCON does, over the SAME bands, taken from the
// same BOUNDARY constant. Only the words differ, and every word describes the
// NEEDLE rather than the world (docs/VOICE.md §2): "UNMATCHED" is a statement
// about this index's reference distribution running out, not a claim that anybody
// has been cured. A high BLISS is not a promise and a low BLISS is not a verdict —
// both are readings of measured upside tempo against BLISS's own frozen record.
// ---------------------------------------------------------------------------

export const LEVEL_NAMES = { 5: 'BECALMED', 4: 'STEADY', 3: 'LIFTING', 2: 'SURGING', 1: 'UNMATCHED' };

export const LEVELS = [
  {
    level: 5, name: 'BECALMED', band: [0, BOUNDARY[5] - 1],
    epithet: 'Needle at rest',
    gloss: 'Upside activity below this index’s own historical norm.',
    description:
      'The floor of the scale. Papers, trials, price curves and open releases are all ' +
      'moving slower than BLISS calls normal. That is not a judgement about whether ' +
      'anything good is happening — it is a quiet hour on these particular instruments.',
  },
  {
    level: 4, name: 'STEADY', band: [BOUNDARY[5], BOUNDARY[4] - 1],
    epithet: 'Needle breathing',
    gloss: 'Upside activity within the normal range of the record.',
    description:
      'The scale is centred here by construction: 50 is the middle of the frozen ' +
      'reference distribution. A reading in this band means nothing across the five ' +
      'pillars is behaving out of character.',
  },
  {
    level: 3, name: 'LIFTING', band: [BOUNDARY[4], BOUNDARY[3] - 1],
    epithet: 'Off the rest stop',
    gloss: 'Upside activity above the normal range of the record.',
    description:
      'Something is carrying the average. One or more pillars have pulled clear of their ' +
      'own reference distribution and the composite followed. It says louder than usual. ' +
      'It does not say why, and the pillar breakdown is where you go to find out.',
  },
  {
    level: 2, name: 'SURGING', band: [BOUNDARY[3], BOUNDARY[2] - 1],
    epithet: 'Pinned high',
    gloss: 'Upside activity in the top decile of the record.',
    description:
      'The top decile, with several pillars high at once. That is what it looks like when ' +
      'results, trials and open releases land in the same window — and it is also what it ' +
      'looks like when one source is having a strange week. The inputs tell them apart.',
  },
  {
    level: 1, name: 'UNMATCHED', band: [BOUNDARY[2], 100],
    epithet: 'Off the top of the chart',
    gloss: 'Upside activity beyond anything in the record.',
    description:
      'Past the top of the reference distribution: the frozen record holds nothing like ' +
      'this. The name is a statement about our own record running out, not about anybody ' +
      'being saved. Those are two different sentences and this index refuses to merge them.',
  },
];

// ---------------------------------------------------------------------------
// Adapter discovery and execution. Deliberately the same shape and the same
// paranoia as collector/collect.mjs — a source that failed appears in the output
// AS a failure, never omitted, never zeroed, never carried forward.
// ---------------------------------------------------------------------------

const SOURCES_DIR = new URL('./bliss-sources/', import.meta.url);
const VALID_SOURCE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Epoch's CSV is 2.2MB and arXiv's windowed range scan runs ~40s on its own, so
// the per-adapter watchdog is wider than collect.mjs's. It still exists for the
// same reason: one wedged socket must not hold a scheduled run open until CI
// kills the job, because a killed job writes no output and loses every source
// that DID answer.
const ADAPTER_TIMEOUT_MS = 60_000;

async function discoverAdapters() {
  let entries;
  try {
    entries = await readdir(SOURCES_DIR);
  } catch (err) {
    throw new Error(`bliss: cannot read collector/bliss-sources/ — ${err.message}`);
  }

  const files = entries
    .filter((n) => n.endsWith('.mjs') && !n.startsWith('_') && !n.startsWith('.'))
    .sort();

  if (files.length === 0) {
    throw new Error('bliss: no adapters found in collector/bliss-sources/ — nothing to collect');
  }

  const adapters = [];
  const seen = new Map();

  for (const file of files) {
    const href = new URL(file, SOURCES_DIR).href;

    // A file that will not import is fatal for the whole run rather than reported
    // as one dark source, for the reason collect.mjs gives: to report a source dark
    // we must know its pillar, and an adapter we cannot read has no knowable
    // pillar, so recording it as dark would attribute the outage to the wrong
    // pillar or to none. A broken adapter is a code error, not a data outage.
    let mod;
    try {
      mod = await import(href);
    } catch (err) {
      throw new Error(`bliss: adapter ${file} failed to import — ${err.message}`);
    }

    const a = mod.default;
    if (!a || typeof a !== 'object') throw new Error(`bliss: adapter ${file} has no default-exported object`);
    if (typeof a.id !== 'string' || !VALID_SOURCE_ID.test(a.id)) {
      throw new Error(`bliss: adapter ${file} has invalid id ${JSON.stringify(a.id)} (want kebab-case)`);
    }
    if (!PILLAR_ORDER.includes(a.pillar)) {
      throw new Error(
        `bliss: adapter ${file} has unknown pillar ${JSON.stringify(a.pillar)} ` +
        `(want one of ${PILLAR_ORDER.join(', ')})`,
      );
    }
    if (typeof a.label !== 'string' || a.label.length === 0) throw new Error(`bliss: adapter ${file} has no label`);
    if (typeof a.collect !== 'function') throw new Error(`bliss: adapter ${file} has no collect() function`);
    if (seen.has(a.id)) {
      // Two adapters sharing an id would collapse into one series and corrupt
      // every percentile computed from it.
      throw new Error(`bliss: duplicate source id "${a.id}" in ${file} and ${seen.get(a.id)}`);
    }

    seen.set(a.id, file);
    adapters.push(a);
  }

  // Deterministic ordering: pillar order, then id. Two runs over the same adapters
  // produce byte-identical key ordering (CONTRACT.md hard constraint 4).
  adapters.sort((x, y) => {
    const byPillar = PILLAR_ORDER.indexOf(x.pillar) - PILLAR_ORDER.indexOf(y.pillar);
    return byPillar !== 0 ? byPillar : x.id.localeCompare(y.id);
  });

  return adapters;
}

function errorMessage(err) {
  return err instanceof Error ? (err.message || err.name) : String(err);
}

function describeValue(v) {
  if (typeof v === 'string') return `string ${JSON.stringify(v)}`;
  return `${typeof v} ${String(v)}`;
}

function withTimeout(promise, ms, id) {
  let timer;
  const watchdog = new Promise((_res, rej) => {
    timer = setTimeout(() => rej(new Error(`${id}: timed out after ${ms}ms`)), ms);
    if (typeof timer.unref === 'function') timer.unref();
  });
  // When the watchdog wins, the adapter's promise is still in flight and would
  // otherwise reject unobserved — which crashes Node under its default
  // --unhandled-rejections=throw, taking down a run that had already written off
  // this one source.
  promise.catch(() => {});
  return Promise.race([promise, watchdog]).finally(() => clearTimeout(timer));
}

/** Runs one adapter. Never throws: every failure path becomes an ok:false reading. */
async function runAdapter(adapter, deps, generatedAt) {
  const startedAt = Date.now();
  const fail = (message) => ({
    source: adapter.id, pillar: adapter.pillar, label: adapter.label,
    ok: false, error: message, value: null, ms: Date.now() - startedAt,
  });

  let result;
  try {
    result = await withTimeout(
      adapter.collect(deps.fetchJson, { fetchText: deps.fetchText }),
      ADAPTER_TIMEOUT_MS,
      adapter.id,
    );
  } catch (err) {
    return fail(errorMessage(err));
  }

  if (!result || typeof result !== 'object') return fail('adapter returned no result object');

  // typeof, NOT Number(). The coercion Number(null) === 0 is the exact silent zero
  // this project exists to prevent: an adapter that lost its value and returned
  // null would be recorded live, at zero, and read downstream as "the good news
  // stopped" rather than "this source broke".
  if (typeof result.value !== 'number' || !Number.isFinite(result.value)) {
    return fail(`adapter returned a non-finite value (${describeValue(result.value)})`);
  }

  return {
    source: adapter.id,
    pillar: adapter.pillar,
    label: adapter.label,
    ok: true,
    value: result.value,
    unit: typeof result.unit === 'string' ? result.unit : null,
    observed_at: typeof result.observed_at === 'string' ? result.observed_at : generatedAt,
    meta: result.meta && typeof result.meta === 'object' ? result.meta : {},
    ms: Date.now() - startedAt,
  };
}

// ---------------------------------------------------------------------------
// Scoring. Pure — no filesystem, no clock. Same reason engine.mjs keeps its
// arithmetic reachable without I/O: the product claim is that a stranger can
// recompute the number, so the computation has to be callable on its own.
// ---------------------------------------------------------------------------

function buildReferenceIndex(reference) {
  const idx = new Map();
  if (!reference || !reference.sources) return idx;
  for (const [key, entry] of Object.entries(reference.sources)) {
    const withKey = { ...entry, key };
    idx.set(key, withKey);
    for (const alias of entry.aliases ?? []) {
      if (idx.has(alias) && idx.get(alias).key !== key) {
        throw new Error(`bliss-reference.json: alias "${alias}" is claimed by both "${idx.get(alias).key}" and "${key}"`);
      }
      idx.set(alias, withKey);
    }
  }
  return idx;
}

function mean(xs) {
  if (xs.length === 0) throw new Error('mean: empty array');
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

/**
 * readings + frozen reference + history -> scored BLISS state.
 *
 * THE THREE STATES, kept distinct at every level of this function and never
 * collapsed (the requirement is explicit in the brief and it is the thing that
 * separates this index from pizzint printing a confident DOUGHCON 5 over a dead
 * scraper):
 *
 *   live               the source answered AND has a frozen reference entry.
 *                      It is normalised, smoothed and folded into its pillar.
 *   dark               the fetch failed. Excluded, never imputed, never zeroed.
 *   awaiting-baseline  the source answered fine and there is no frozen history to
 *                      score it against yet. Collected, published, NOT scored, and
 *                      pointedly NOT reported as an outage.
 *
 * On day one every BLISS source is in the third state, because data/bliss-reference.json
 * does not exist. That is the designed cold start, not a failure, and the whole
 * function is written so that case produces a clean "awaiting baseline" rather
 * than a zero, a null dressed as a number, or a fabricated distribution.
 */
export function scoreBliss({ readings, reference, history, previous, doomcon, nowIso }) {
  if (!Array.isArray(readings)) throw new Error('scoreBliss: readings must be an array');
  const nowMs = new Date(nowIso).getTime();
  if (Number.isNaN(nowMs)) throw new Error(`scoreBliss: bad nowIso ${nowIso}`);

  const liveHistory = (history ?? []).filter((h) => h.backfilled !== true);
  const recent = liveHistory.slice(-(NOWCAST_WINDOW - 1)).reverse(); // newest first
  const refIndex = buildReferenceIndex(reference);
  const hasReference = refIndex.size > 0;

  // ---- per source ----
  const sources = [];
  for (const r of readings) {
    const base = { id: r.source, pillar: r.pillar ?? null, label: r.label ?? null };
    const blank = {
      percentile: null, percentile_adjusted: null, z: null,
      score_raw: null, score: null, nowcast_w: null, nowcast_series: null,
    };

    if (r.ok !== true) {
      sources.push({ ...base, ok: false, uncalibrated: false,
        error: r.error ?? 'collector reported not ok',
        value: null, unit: r.unit ?? null, observed_at: r.observed_at ?? null, meta: r.meta ?? {}, ...blank });
      continue;
    }
    if (!Number.isFinite(r.value)) {
      sources.push({ ...base, ok: false, uncalibrated: false,
        error: `non_finite_value: ${JSON.stringify(r.value)}`,
        value: null, unit: r.unit ?? null, observed_at: r.observed_at ?? null, meta: r.meta ?? {}, ...blank });
      continue;
    }

    const ref = refIndex.get(r.source);
    if (!ref) {
      // UNCALIBRATED is not DARK. Inventing a distribution is the sin this project
      // exists to avoid, so the reading is not scored — but it answered, so it is
      // recorded and published with its real value, and the site says "awaiting
      // baseline" rather than crying outage about a source that is working.
      sources.push({ ...base, ok: false, uncalibrated: true,
        error: `awaiting_baseline: "${r.source}" has no entry in data/bliss-reference.json yet, so it is collected and published but not scored`,
        value: r.value, unit: r.unit ?? null, observed_at: r.observed_at ?? null, meta: r.meta ?? {}, ...blank });
      continue;
    }

    const accepted = ref.accepted_units ?? [ref.unit];
    if (r.unit != null && !accepted.includes(r.unit)) {
      // A unit change means the adapter is measuring something else now. Scoring
      // it against the old distribution would compare tokens to dollars.
      sources.push({ ...base, ok: false, uncalibrated: false,
        error: `unit_mismatch: reading is "${r.unit}", reference accepts [${accepted.join(', ')}]`,
        value: r.value, unit: r.unit, observed_at: r.observed_at ?? null, meta: r.meta ?? {}, ...blank });
      continue;
    }

    const norm = normalise(r.value, ref);
    // Positional series: slot i is i observations ago, null where this source was
    // dark then. Offsets are preserved so stale data is weighted as stale.
    const series = [
      norm.score,
      ...recent.map((h) => (h.sources && h.sources[r.source] != null ? h.sources[r.source] : null)),
    ];
    const smoothed = nowcast(series);

    sources.push({
      ...base, ok: true, uncalibrated: false, error: null,
      value: r.value, unit: r.unit ?? ref.unit ?? null,
      observed_at: r.observed_at ?? nowIso, meta: r.meta ?? {},
      reference_key: ref.key,
      percentile: norm.percentile, percentile_adjusted: norm.percentile_adjusted, z: norm.z,
      score_raw: norm.score, score: smoothed.value,
      nowcast_w: smoothed.w, nowcast_used: smoothed.used, nowcast_series: series,
    });
  }

  // ---- pillars ----
  const pillars = PILLARS.map((meta) => {
    const mine = sources.filter((s) => s.pillar === meta.id);
    const live = mine.filter((s) => s.ok);
    const calibrated = mine.filter((s) => !s.uncalibrated);
    if (live.length === 0) {
      // A pillar nobody has calibrated yet is not a pillar that broke. Only a
      // pillar holding at least one calibrated source that is currently failing
      // counts as dark, because only that case means we lost a measurement we
      // normally have.
      const uncalibrated = calibrated.length === 0 && mine.length > 0;
      return {
        id: meta.id, name: meta.name, score: null, percentile: null,
        sources_ok: 0, sources_total: mine.length, dark: !uncalibrated, uncalibrated,
      };
    }
    return {
      id: meta.id, name: meta.name,
      score: round(mean(live.map((s) => s.score)), 4),
      percentile: round(mean(live.map((s) => s.percentile)), 6),
      sources_ok: live.length, sources_total: mine.length, dark: false, uncalibrated: false,
    };
  });

  const darkPillars = pillars.filter((p) => p.dark).map((p) => p.id);
  const uncalibratedPillars = pillars.filter((p) => p.uncalibrated).map((p) => p.id);
  const livePillarScores = pillars.filter((p) => !p.dark && !p.uncalibrated).map((p) => p.score);
  const score = composite(livePillarScores);

  // ---- level ----
  const prevLevel = previous?.level ?? null;
  const prevLevelSince = previous?.level_since ? new Date(previous.level_since).getTime() : nowMs;

  const observations = [
    ...liveHistory.map((h) => ({ t: new Date(h.t).getTime(), score: h.score })),
    { t: nowMs, score },
  ];

  // The identical state machine DOOMCON runs, with all six anti-flap layers and
  // the honesty rule that freezes a level change while any pillar is dark.
  const decision = decideLevel({
    score, currentLevel: prevLevel, levelSinceMs: prevLevelSince,
    pillarScores: livePillarScores, observations, nowMs, darkPillars,
  });

  const failedSources = sources.filter((s) => !s.ok && !s.uncalibrated).map((s) => s.id);
  const uncalibratedSources = sources.filter((s) => s.uncalibrated).map((s) => s.id);
  const reportingSources = sources.filter((s) => s.ok || s.uncalibrated).length;

  // POSTURE is the single field every surface reads to decide what to say, so the
  // three states cannot be merged by a template author who did not read this file.
  //
  // THE ORDERING TRAP, found by running this on the real cold start: the naive
  // rule "any dark source means posture is dark" reported BLISS as DARK on a run
  // where 8 of 10 sources answered perfectly and the only reason there was no
  // score was that no frozen reference exists yet. That is precisely the lie the
  // brief forbids - an absent baseline presented as an outage. The reason there is
  // no score has to be diagnosed from WHY, not from whether anything else failed:
  //
  //   no score + nothing is calibratable  -> awaiting-baseline. No reference file,
  //                                          or every pillar uncalibrated. The
  //                                          score was never computable this run,
  //                                          and dark sources did not cause that.
  //   no score + something IS calibrated  -> dark. We normally have a measurement
  //                                          here and we have lost it.
  //
  // Dark sources are still reported loudly in failed_sources and `degraded` either
  // way; this field answers "why is there no number", not "is everything fine".
  const everyPillarUncalibrated = uncalibratedPillars.length === PILLARS.length;
  const posture =
    score !== null
      ? (failedSources.length > 0 || darkPillars.length > 0 ? 'degraded' : 'live')
      : (!hasReference || everyPillarUncalibrated) ? 'awaiting-baseline'
        : 'dark';

  const degraded = darkPillars.length > 0 || failedSources.length > 0;
  const levelSince = decision.changed ? nowIso : (previous?.level_since ?? nowIso);
  const previousLevel = decision.changed ? prevLevel : (previous?.previous_level ?? null);
  const prevScore = previous?.score ?? null;
  const delta = (score !== null && prevScore !== null) ? round(score - prevScore, 4) : null;

  const state = {
    schema: BLISS_SCHEMA,
    index: 'BLISS',
    generated_at: nowIso,
    score,
    level: decision.level,
    level_name: decision.level === null ? null : LEVEL_NAMES[decision.level],
    previous_level: previousLevel,
    level_since: levelSince,
    delta_from_previous: delta,
    posture,
    degraded,
    awaiting_baseline: posture === 'awaiting-baseline',
    reference_present: hasReference,
    dark_pillars: darkPillars,
    uncalibrated_pillars: uncalibratedPillars,
    uncalibrated_sources: uncalibratedSources,
    failed_sources: failedSources,
    sources_reporting: reportingSources,
    sources_total: sources.length,
    rule_fired: decision.rule_fired,
    decision: decision.thresholds,
    levels: LEVELS,
    pillars: pillars.map((p) => {
      const meta = PILLARS.find((x) => x.id === p.id);
      return { ...p, blurb: meta.blurb, description: meta.description };
    }),
    sources: sources.map((s) => ({
      id: s.id, pillar: s.pillar, label: s.label,
      ok: s.ok, uncalibrated: Boolean(s.uncalibrated), error: s.error ?? null,
      value: s.value, unit: s.unit,
      score: s.score ?? null, score_raw: s.score_raw ?? null, percentile: s.percentile ?? null,
      observed_at: s.observed_at ?? null,
      age_seconds: s.observed_at
        ? Math.max(0, Math.round((nowMs - new Date(s.observed_at).getTime()) / 1000))
        : null,
      last_ok: s.ok || s.uncalibrated ? (s.observed_at ?? nowIso) : (lastOkFor(previous, s.id) ?? null),
      meta: s.meta ?? {},
    })),
    comparison: compare(score, decision.level, doomcon),
    // The constants that produced these numbers travel WITH the numbers, so a
    // reader does not have to match the file against a commit to recompute it.
    // Same decision as data/news.json's scoring block.
    constants: {
      score_centre: SCORE_CENTRE, score_z_scale: SCORE_Z_SCALE,
      boundaries: BOUNDARY, deadband: DEADBAND,
      dwell_up_seconds: DWELL_UP_SECONDS, dwell_down_seconds: DWELL_DOWN_SECONDS,
      min_interval_ms: MIN_INTERVAL_MS, lock_ms: LOCK_MS, quorum: QUORUM,
      nowcast_window: NOWCAST_WINDOW, nowcast_min_weight: NOWCAST_MIN_WEIGHT,
      composite_weights: { mean: 0.7, max: 0.3 },
    },
    reference: {
      present: hasReference,
      built_at: reference?.built_at ?? null,
      // If bliss-reference.json is ever edited, every later run records a
      // different hash and the edit is visible rather than silent.
      hash: hasReference
        ? 'sha256:' + createHash('sha256').update(canonicalJson(reference), 'utf8').digest('hex')
        : null,
    },
    engine_version: ENGINE_VERSION,
    bliss_version: BLISS_VERSION,
  };

  const historyLine = {
    t: nowIso,
    score,
    level: decision.level,
    degraded,
    posture,
    rule_fired: decision.rule_fired,
    pillars: Object.fromEntries(pillars.map((p) => [p.id, p.score])),
    // RAW, pre-smoothing scores. Storing the smoothed value here would make the
    // next run smooth an already-smoothed series and quietly double-damp the index.
    sources: Object.fromEntries(sources.map((s) => [s.id, s.ok ? s.score_raw : null])),
  };

  return { state, historyLine };
}

function lastOkFor(previous, id) {
  return previous?.sources?.find((s) => s.id === id)?.last_ok ?? null;
}

/**
 * BLISS beside DOOMCON, and the arithmetic of their disagreement.
 *
 * Both are 0-100 percentile scores against their own frozen reference, produced by
 * the same normalise/nowcast/composite chain, so the SUBTRACTION IS MEANINGFUL in
 * a way that comparing two hand-scored indices never is. That is the entire
 * argument for the pairing, and it is why this is computed here — in the collector,
 * with the inputs — rather than in a template where it would be unauditable.
 *
 * Either side may be null. A null is never treated as a zero: an index with no
 * score has not said "nothing is happening", it has said nothing at all.
 */
function compare(blissScore, blissLevel, doomcon) {
  const d = doomcon ?? null;
  const doomScore = Number.isFinite(d?.score) ? d.score : null;
  const doomLevel = Number.isInteger(d?.level) ? d.level : null;

  const computable = blissScore !== null && doomScore !== null;
  const divergence = computable ? round(blissScore - doomScore, 4) : null;

  let reading = null;
  if (computable) {
    // A 3-point band around zero, matching the Schmitt deadband the level machine
    // already uses. Below it the two indices are not meaningfully apart and saying
    // they diverge would be reading noise as a story.
    if (Math.abs(divergence) < DEADBAND) reading = 'aligned';
    else reading = divergence > 0 ? 'bliss-ahead' : 'doomcon-ahead';
  }

  return {
    computable,
    bliss: { score: blissScore, level: blissLevel, level_name: blissLevel === null ? null : LEVEL_NAMES[blissLevel] },
    doomcon: {
      score: doomScore,
      level: doomLevel,
      level_name: d?.level_name ?? null,
      generated_at: d?.generated_at ?? null,
    },
    divergence,
    divergence_band: DEADBAND,
    reading,
    // The literal arithmetic, as a string, so the page can print the working
    // rather than assert the conclusion.
    working: computable
      ? `${blissScore.toFixed(1)} − ${doomScore.toFixed(1)} = ${divergence > 0 ? '+' : divergence < 0 ? '−' : '±'}${Math.abs(divergence).toFixed(1)}`
      : null,
  };
}

// ---------------------------------------------------------------------------
// The per-source table. Read by a human scrolling a CI log who needs to know in
// one glance what is alive — so the state is a word, not a boolean, and the error
// text is on the same line as the source that produced it.
// ---------------------------------------------------------------------------

function stateWord(s) {
  if (s.uncalibrated) return 'BASE?';
  return s.ok ? 'LIVE ' : 'DARK ';
}

function formatValue(s) {
  if (s.value === null || s.value === undefined) return '—';
  const v = s.value;
  if (Number.isInteger(v)) return String(v);
  return Math.abs(v) < 1 ? v.toFixed(4) : v.toFixed(2);
}

function printSummary(state, outPath) {
  const rows = state.sources;
  const w = {
    id: Math.max(6, ...rows.map((r) => r.id.length)),
    pillar: Math.max(8, ...rows.map((r) => String(r.pillar).length)),
    value: Math.max(5, ...rows.map((r) => formatValue(r).length)),
    unit: Math.max(4, ...rows.map((r) => String(r.unit ?? '').length)),
  };

  const header =
    'source'.padEnd(w.id) + '  ' + 'pillar'.padEnd(w.pillar) + '  state  ' +
    'value'.padStart(w.value) + '  ' + 'unit'.padEnd(w.unit) + '  score';

  console.log('');
  console.log(header);
  console.log('-'.repeat(header.length + 8));

  for (const r of rows) {
    let line =
      r.id.padEnd(w.id) + '  ' + String(r.pillar).padEnd(w.pillar) + '  ' +
      stateWord(r) + '  ' + formatValue(r).padStart(w.value) + '  ' +
      String(r.unit ?? '').padEnd(w.unit) + '  ' +
      (r.score === null ? '   —' : r.score.toFixed(1).padStart(4));
    if (!r.ok && !r.uncalibrated) line += `  ${r.error}`;
    console.log(line);
  }

  console.log('');
  console.log('pillar      score  sources');
  console.log('-'.repeat(34));
  for (const p of state.pillars) {
    const s = p.dark ? 'DARK' : p.uncalibrated ? 'BASE?' : p.score.toFixed(1);
    console.log(`${p.id.padEnd(10)}  ${String(s).padStart(5)}  ${p.sources_ok}/${p.sources_total}`);
  }

  console.log('');
  const shown = state.score === null ? `NO SCORE (${state.posture})` : state.score.toFixed(1);
  console.log(`BLISS ${state.level ?? '-'} ${state.level_name ?? 'AWAITING BASELINE'}  score=${shown}  rule=${state.rule_fired}`);
  console.log(`${state.sources_reporting}/${state.sources_total} sources reporting · ` +
              `${state.sources.filter((s) => s.ok).length} scored · ` +
              `${state.uncalibrated_sources.length} awaiting baseline · ` +
              `${state.failed_sources.length} dark`);
  if (state.comparison.computable) {
    console.log(`vs DOOMCON: ${state.comparison.working} (${state.comparison.reading})`);
  } else {
    console.log('vs DOOMCON: not computable — one of the two indices has no score this run');
  }
  console.log(`wrote ${outPath}`);
}

// ---------------------------------------------------------------------------
// I/O shell
// ---------------------------------------------------------------------------

const ROOT = new URL('../', import.meta.url);

function parseArgs(argv) {
  const out = { data: 'data', quiet: false, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--data') { out.data = argv[i + 1]; i++; }
    else if (a === '--quiet') out.quiet = true;
    else if (a === '--dry-run') out.dryRun = true;
    else throw new Error(`bliss: unknown argument "${a}". Usage: node collector/bliss.mjs [--data DIR] [--quiet] [--dry-run]`);
  }
  return out;
}

async function readJsonIfPresent(url) {
  if (!existsSync(url)) return null;
  try {
    return JSON.parse(await readFile(url, 'utf8'));
  } catch (err) {
    throw new Error(`bliss: ${url.pathname ?? url} is present but not valid JSON: ${err.message}`);
  }
}

async function readNdjson(url) {
  if (!existsSync(url)) return [];
  const text = await readFile(url, 'utf8');
  const out = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    try {
      out.push(JSON.parse(line));
    } catch (err) {
      // A corrupt line in an append-only log is not skippable: silently dropping
      // observations is how a chart starts lying.
      throw new Error(`bliss: ${url.pathname}:${i + 1} is not valid JSON: ${err.message}`);
    }
  }
  return out;
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const log = args.quiet ? () => {} : (...a) => console.log(...a);

  const dataDir = new URL(`${args.data.replace(/\/*$/, '')}/`, ROOT);
  const P = {
    out: new URL('bliss.json', dataDir),
    history: new URL('bliss-history.ndjson', dataDir),
    reference: new URL('bliss-reference.json', dataDir),
    doomcon: new URL('state.json', dataDir),
  };

  // One clock for the whole run. Every timestamp derives from it, so the file is
  // reproducible from its own inputs (CONTRACT.md hard constraint 4).
  const generatedAt = new Date().toISOString();

  const adapters = await discoverAdapters();
  log(`bliss: ${adapters.length} adapters across ${PILLAR_ORDER.length} pillars`);

  const deps = { fetchJson: sharedFetchJson, fetchText: sharedFetchText };

  // allSettled, not all: a rejected adapter must not cancel the others. runAdapter
  // already converts failures into readings, so nothing here should reject — the
  // allSettled is the second line of defence, and a rejection that reaches it is
  // itself recorded rather than thrown away.
  const settled = await Promise.allSettled(adapters.map((a) => runAdapter(a, deps, generatedAt)));
  const readings = settled.map((o, i) => {
    if (o.status === 'fulfilled') return o.value;
    return {
      source: adapters[i].id, pillar: adapters[i].pillar, label: adapters[i].label,
      ok: false, error: `bliss bug: runAdapter rejected — ${errorMessage(o.reason)}`,
      value: null, ms: 0,
    };
  });

  const [reference, history, previous, doomcon] = await Promise.all([
    readJsonIfPresent(P.reference),
    readNdjson(P.history),
    readJsonIfPresent(P.out),
    readJsonIfPresent(P.doomcon),
  ]);

  const { state, historyLine } = scoreBliss({
    // `ms` is timing telemetry for the log, not part of the published shape.
    readings: readings.map(({ ms, ...r }) => r),
    reference, history, previous, doomcon, nowIso: generatedAt,
  });

  if (!args.dryRun) {
    await mkdir(dataDir, { recursive: true });
    await writeFile(P.out, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    await appendFile(P.history, `${JSON.stringify(historyLine)}\n`, 'utf8');
  }

  if (!args.quiet) printSummary(state, args.dryRun ? '(dry run — nothing written)' : `${args.data}/bliss.json`);

  // Some sources dark is a normal Tuesday and must not fail the workflow: the file
  // is still useful and every downstream surface knows how to degrade. Every source
  // dark means we learned nothing this run, and that should go red.
  if (!readings.some((r) => r.ok)) {
    console.error('\nbliss: every source failed — exiting 1');
    process.exitCode = 1;
  }

  return state;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    // Reaching here means the run could not be set up at all. No file is written,
    // because an output we cannot vouch for is worse than none.
    console.error(`bliss: fatal — ${errorMessage(err)}`);
    process.exitCode = 1;
  });
}
