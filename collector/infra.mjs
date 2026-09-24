#!/usr/bin/env node
// THE INFRASTRUCTURE INDEX — the physical substrate underneath the models.
//
//   docker run --rm --network host -v "$PWD":/app -w /app node:20-alpine \
//     node collector/infra.mjs
//
// You cannot train a frontier model without electricity, water and concrete.
// Weights can be kept secret; a gigawatt cannot. Every input here is a free,
// keyless, machine-readable public feed, and every one of them is published by
// somebody with no interest in this question at all — grid operators, the
// Geological Survey, the Drought Monitor, the SEC, the Federal Register.
//
// WHAT THIS IS NOT, stated at the top of the file that computes it:
//
//   This does not measure datacentre power draw. No public feed separates
//   datacentre load from any other industrial load, and no amount of arithmetic
//   downstream can recover a split the input never contained. What it measures
//   is the CONDITION OF THE SUBSTRATE those datacentres are being built into:
//   how much load never switches off, how much slack the grid has, how much
//   water is in the rivers, how much paperwork is moving. Correlation with AI
//   activity is a hypothesis this page states and does not claim to have proved.
//
// SUB-INDICES.md: a sub-index does not feed the main index unless its sources
// are in the frozen reference. None of these are. This writes data/infra.json
// and nothing else, and collector/engine.mjs never reads it. A page can be
// interesting without being load-bearing, and conflating the two is how an index
// quietly becomes a vibe.

import { readdir, mkdir, writeFile, readFile, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';

import { fetchJson, fetchText } from './fetch.mjs';
// The SAME normalisation the main index uses, imported rather than reimplemented.
// If engine.mjs ever drops these exports this file fails at import, loudly, which
// is the correct failure: a second copy of the arithmetic that silently drifted
// from the first would be worse than no sub-index at all.
import { normalise } from './engine.mjs';
import { quantileGrid, mean, round } from './infra-sources/_util.mjs';

const SCHEMA_VERSION = 1;
const ENGINE_VERSION = '1.0.0';

const SOURCES_DIR = new URL('./infra-sources/', import.meta.url);
const OUT_FILE = new URL('../data/infra.json', import.meta.url);

const VALID_SOURCE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// USGS returns three years of daily values for nine gauges (~750KB) and the
// Drought Monitor five years of weekly rows for ten states (~560KB). The whole
// run moves roughly two megabytes. Generous where collect.mjs is not.
const ADAPTER_TIMEOUT_MS = 60_000;

// ---------------------------------------------------------------------------
// The three pillars. Fixed ids, fixed order, never renamed, never reordered —
// same rule as CONTRACT.md's five, for the same reason: they are in the JSON.
// ---------------------------------------------------------------------------

const PILLARS = Object.freeze([
  { id: 'grid', name: 'The grid',
    blurb: 'How much load never switches off, and how little slack is left over it.' },
  { id: 'water', name: 'The water',
    blurb: 'The state of the rivers and the ground the clusters were built beside.' },
  { id: 'buildout', name: 'The build-out',
    blurb: 'What companies had to write down, and what the government had to publish.' },
]);
const PILLAR_IDS = PILLARS.map((p) => p.id);

// ---------------------------------------------------------------------------
// Levels. SUBSTRATE 5 (slackest) down to 1 (tightest), on CONTRACT.md's bands.
//
// These name a POSITION IN THIS INDEX'S OWN RECORD and nothing else. SUBSTRATE 2
// does not mean the grid is in trouble; it means the composite of these eight
// readings sits in the 70-84 band of the distribution we have observed. The page
// prints that definition next to the level, every time, because a scale is read
// as whatever its name suggests no matter what its documentation says.
// ---------------------------------------------------------------------------

const LEVELS = Object.freeze([
  { level: 5, name: 'SLACK',    min: 0,  max: 34,
    gloss: 'The substrate is reading at the quiet end of its own record.' },
  { level: 4, name: 'STEADY',   min: 35, max: 54,
    gloss: 'Ordinary. This is where most observations sit.' },
  { level: 3, name: 'LOADED',   min: 55, max: 69,
    gloss: 'Above the middle of the record on more than one pillar.' },
  { level: 2, name: 'STRAINED', min: 70, max: 84,
    gloss: 'Near the top of what this index has observed.' },
  { level: 1, name: 'MAXIMAL',  min: 85, max: 100,
    gloss: 'At the top of the record. A statement about our sample, not about the world.' },
]);

function levelFor(score) {
  for (const l of LEVELS) if (score >= l.min && score <= l.max) return l;
  return LEVELS[LEVELS.length - 1];
}
function levelByNumber(n) {
  return LEVELS.find((l) => l.level === n) ?? null;
}

// ---------------------------------------------------------------------------
// Baselines and scoring
// ---------------------------------------------------------------------------

// A source needs this many baseline points before it is SCORED. Below it the
// source is `awaiting-baseline`: it answered, the reading is real and printed,
// and it is excluded from every average. That is a third state, not a soft dark,
// and merging the two would claim an outage that is not happening.
//
// Thirty is where the continuity correction 1/(2n) stops dominating: at n=30 the
// most extreme score reachable is about 73, at n=261 about 85. Extremity has to
// be earned with evidence.
const MIN_BASELINE_N = 30;

// Sources whose feed hands over no usable history accumulate their own, one
// point per UTC day. Four hundred days is more than a year of record and about
// 16KB per source in the JSON.
const MAX_BASELINE_DAYS = 400;

// One row per run. At a 15-minute cadence this is five days of the level line.
const MAX_HISTORY = 480;

const SCORE_DP = 1;
const PCT_DP = 4;

/**
 * value -> percentile -> pseudo-z -> S = 50 + 12.5z, clamped to [0,100].
 *
 * The grid is built from the baseline array and handed to engine.normalise, so
 * an infra source and an index source are normalised by identical code. The only
 * difference is where the distribution came from: the main index uses a FROZEN
 * reference built once from backfill; these are built live, from feeds that hand
 * over their own history, or accumulated a day at a time. That difference is the
 * reason this index does not feed that one.
 */
function score(value, baselineValues) {
  const grid = quantileGrid(baselineValues);
  const n = baselineValues.length;
  const out = normalise(value, { quantiles: grid, n });
  return {
    score: round(out.score, SCORE_DP),
    percentile: round(out.percentile, PCT_DP),
    z: out.z,
    baseline_n: n,
    baseline_min: round(grid[0], 3),
    baseline_median: round(grid[(grid.length - 1) >> 1], 3),
    baseline_max: round(grid[grid.length - 1], 3),
  };
}

// ---------------------------------------------------------------------------
// Adapter discovery — a directory read, not a list in this file
// ---------------------------------------------------------------------------

async function discoverAdapters() {
  let entries;
  try {
    entries = await readdir(SOURCES_DIR);
  } catch (err) {
    throw new Error(`infra: cannot read collector/infra-sources/ — ${err.message}`);
  }

  const files = entries
    .filter((n) => n.endsWith('.mjs') && !n.startsWith('_') && !n.startsWith('.'))
    .sort();
  if (files.length === 0) throw new Error('infra: no adapters in collector/infra-sources/');

  const adapters = [];
  const seen = new Map();

  for (const file of files) {
    const href = new URL(file, SOURCES_DIR).href;
    let mod;
    try {
      mod = await import(href);
    } catch (err) {
      // Fatal for the run, exactly as in collect.mjs: to report a source dark we
      // must know its pillar, and an adapter we cannot import has no knowable
      // pillar. Attributing an outage to the wrong pillar is worse than stopping.
      throw new Error(`infra: adapter ${file} failed to import — ${err.message}`);
    }
    const a = mod.default;
    if (!a || typeof a !== 'object') throw new Error(`infra: ${file} has no default-exported object`);
    if (typeof a.id !== 'string' || !VALID_SOURCE_ID.test(a.id)) {
      throw new Error(`infra: ${file} has invalid id ${JSON.stringify(a.id)} (want kebab-case)`);
    }
    if (!PILLAR_IDS.includes(a.pillar)) {
      throw new Error(`infra: ${file} has unknown pillar ${JSON.stringify(a.pillar)} (want ${PILLAR_IDS.join(', ')})`);
    }
    if (typeof a.label !== 'string' || !a.label) throw new Error(`infra: ${file} has no label`);
    if (typeof a.collect !== 'function') throw new Error(`infra: ${file} has no collect()`);
    if (seen.has(a.id)) {
      throw new Error(`infra: duplicate source id "${a.id}" in ${file} and ${seen.get(a.id)}`);
    }
    seen.set(a.id, file);
    adapters.push({ ...a, file });
  }

  adapters.sort((x, y) => {
    const byPillar = PILLAR_IDS.indexOf(x.pillar) - PILLAR_IDS.indexOf(y.pillar);
    return byPillar !== 0 ? byPillar : x.id.localeCompare(y.id);
  });
  return adapters;
}

// ---------------------------------------------------------------------------
// Running one adapter
// ---------------------------------------------------------------------------

function errorMessage(err) {
  return err instanceof Error ? (err.message || err.name) : String(err);
}

function withTimeout(promise, ms, id) {
  let timer;
  const watchdog = new Promise((_r, reject) => {
    timer = setTimeout(() => reject(new Error(`${id}: timed out after ${ms}ms`)), ms);
    if (typeof timer.unref === 'function') timer.unref();
  });
  // The loser of the race is still in flight and will settle with nobody
  // listening; an unobserved rejection crashes Node 20 by default.
  promise.catch(() => {});
  return Promise.race([promise, watchdog]).finally(() => clearTimeout(timer));
}

// Adapters get named helpers rather than a bare function, because several of
// these feeds are CSV or tab-separated and fetchText is not optional for them.
// Both still route through collector/fetch.mjs — CONTRACT.md §1.5, no exceptions.
const NET = Object.freeze({
  json: (url, opts) => fetchJson(url, opts),
  text: (url, opts) => fetchText(url, opts),
});

async function runAdapter(adapter, generatedAt) {
  const started = Date.now();
  const base = {
    id: adapter.id,
    pillar: adapter.pillar,
    label: adapter.label,
    region: adapter.region ?? null,
    unit_label: adapter.unitLabel ?? null,
    cadence: adapter.cadence ?? null,
    direction: adapter.direction ?? null,
  };

  let result;
  try {
    result = await withTimeout(adapter.collect(NET), ADAPTER_TIMEOUT_MS, adapter.id);
  } catch (err) {
    return { ...base, state: 'dark', value: null, error: errorMessage(err), ms: Date.now() - started };
  }

  if (!result || typeof result !== 'object') {
    return { ...base, state: 'dark', value: null, error: 'adapter returned no result object', ms: Date.now() - started };
  }
  // typeof, never Number(). Number(null) === 0 is the silent zero this whole
  // project exists to prevent: a source that lost its value would be recorded
  // live, at zero, and read as "the rivers ran dry" rather than "this broke".
  if (typeof result.value !== 'number' || !Number.isFinite(result.value)) {
    return {
      ...base, state: 'dark', value: null,
      error: `adapter returned a non-finite value (${typeof result.value} ${String(result.value)})`,
      ms: Date.now() - started,
    };
  }

  let baseline = null;
  if (result.baseline && Array.isArray(result.baseline.values)) {
    const values = result.baseline.values.filter(Number.isFinite);
    baseline = {
      values,
      origin: 'feed',
      source: result.baseline.source ?? null,
      span: result.baseline.span ?? null,
      note: result.baseline.note ?? null,
    };
  }

  return {
    ...base,
    state: 'ok',
    value: result.value,
    unit: typeof result.unit === 'string' ? result.unit : null,
    observed_at: typeof result.observed_at === 'string' ? result.observed_at : generatedAt,
    meta: result.meta && typeof result.meta === 'object' ? result.meta : {},
    baseline,
    ms: Date.now() - started,
  };
}

// ---------------------------------------------------------------------------
// Previous state
// ---------------------------------------------------------------------------

async function readPrevious() {
  if (!existsSync(OUT_FILE)) return null;
  let text;
  try {
    text = await readFile(OUT_FILE, 'utf8');
  } catch (err) {
    throw new Error(`infra: data/infra.json exists but is unreadable — ${err.message}`);
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    // Deliberately fatal. Falling back to an empty object would silently throw
    // away every accumulated baseline day, and the index would come back looking
    // healthy while quietly having forgotten a month.
    throw new Error(
      `infra: data/infra.json is present but not valid JSON (${err.message}). ` +
      `It carries the accumulated baselines, so this run refuses to overwrite it. ` +
      `Fix or delete the file deliberately.`
    );
  }
}

/**
 * The accumulated baseline store: one point per UTC day per source.
 *
 * Daily, not per-run. Most of these scalars change once a day — an overnight
 * floor is the same number at 06:00 and at 23:00 — so keeping every run would
 * build a distribution of ninety-six identical copies of today and call it a
 * sample of size ninety-six. The last reading of each day wins.
 */
function updateAccumulated(previous, readings) {
  const store = {};
  const prior = previous?.baselines ?? {};

  for (const r of readings) {
    const existing = Array.isArray(prior[r.id]?.days) ? prior[r.id].days : [];
    const days = existing
      .filter((d) => d && typeof d.d === 'string' && Number.isFinite(d.v))
      .map((d) => ({ d: d.d, v: d.v }));

    if (r.state === 'ok') {
      const day = String(r.observed_at ?? '').slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
        const at = days.findIndex((d) => d.d === day);
        if (at >= 0) days[at] = { d: day, v: r.value };
        else days.push({ d: day, v: r.value });
      }
    }

    days.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
    store[r.id] = { days: days.slice(-MAX_BASELINE_DAYS) };
  }
  return store;
}

// ---------------------------------------------------------------------------
// Anti-flap
//
// FOUR of CONTRACT.md's six layers, and the two that are missing are named here
// rather than quietly skipped:
//
//   IMPLEMENTED   Schmitt deadband; minimum interval; one step per change;
//                 frozen while any pillar is dark.
//   NOT IMPLEMENTED
//     Dual-window dwell (3h/30min up, 12h/3h down). It needs a dense
//     observation history this index does not have: half its sources move once
//     a day and one moves once a week, so a thirty-minute mean is a thirty-
//     minute mean of the same number.
//     Four-hour post-change lock. Subsumed by the six-hour minimum interval,
//     which is strictly longer.
//
//   The 2-of-5 pillar quorum becomes 2-of-3 here and IS implemented.
// ---------------------------------------------------------------------------

const DEADBAND = 3;
const MIN_HOURS_BETWEEN_CHANGES = 6;
const QUORUM = 2;

function applyAntiFlap({ rawLevel, score: composite, previous, darkPillars, pillars, generatedAt }) {
  // Falls back to `last_known` so one all-dark run does not reset the state
  // machine to genesis. A run where every feed failed publishes level: null —
  // printing a confident level over a dead pipe is the exact failure this
  // project exists to not repeat — but it must not also FORGET the level, or the
  // deadband and the six-hour dwell start from nothing on the next good run.
  const prevLevel = Number.isInteger(previous?.level) ? previous.level
    : Number.isInteger(previous?.last_known?.level) ? previous.last_known.level
    : null;
  const prevSince = typeof previous?.level_since === 'string' ? previous.level_since
    : typeof previous?.last_known?.level_since === 'string' ? previous.last_known.level_since
    : null;

  if (prevLevel === null) {
    return { level: rawLevel, level_since: generatedAt, rule_fired: 'genesis', previous_level: null };
  }
  if (rawLevel === prevLevel) {
    return { level: prevLevel, level_since: prevSince ?? generatedAt, rule_fired: 'none', previous_level: prevLevel };
  }

  const hold = (rule) => ({ level: prevLevel, level_since: prevSince ?? generatedAt, rule_fired: rule, previous_level: prevLevel });

  // 1. The honesty freeze. A level change computed over a missing pillar is a
  //    statement about which feed answered, not about the substrate.
  if (darkPillars.length > 0) return hold(`frozen: ${darkPillars.join(', ')} dark`);

  // 2. Schmitt deadband: the score must be DEADBAND past the boundary it just
  //    crossed, not merely over it.
  const target = levelByNumber(rawLevel);
  const rising = rawLevel < prevLevel; // lower number = tighter
  const edge = rising ? target.min : target.max;
  if (rising ? composite < edge + DEADBAND : composite > edge - DEADBAND) {
    return hold(`deadband: ${composite} within ${DEADBAND} of ${edge}`);
  }

  // 3. Minimum dwell since the last change.
  if (prevSince) {
    const hours = (Date.parse(generatedAt) - Date.parse(prevSince)) / 3_600_000;
    if (Number.isFinite(hours) && hours < MIN_HOURS_BETWEEN_CHANGES) {
      return hold(`min-interval: ${hours.toFixed(1)}h since last change`);
    }
  }

  // 4. Pillar quorum: at least two of the three live pillars must be moving the
  //    same way as the composite.
  const prevPillars = new Map((previous?.pillars ?? []).map((p) => [p.id, p.score]));
  let agree = 0;
  let comparable = 0;
  for (const p of pillars) {
    const was = prevPillars.get(p.id);
    if (!Number.isFinite(p.score) || !Number.isFinite(was)) continue;
    comparable++;
    if (rising ? p.score > was : p.score < was) agree++;
  }
  if (comparable >= QUORUM && agree < QUORUM) {
    return hold(`quorum: ${agree} of ${comparable} pillars agree, need ${QUORUM}`);
  }

  // 5. One step. Never jump 5 -> 3; produce a staircase.
  const stepped = prevLevel + (rising ? -1 : 1);
  return {
    level: stepped,
    level_since: generatedAt,
    rule_fired: stepped === rawLevel ? 'changed' : `one-step: held at ${stepped}, raw ${rawLevel}`,
    previous_level: prevLevel,
  };
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

function buildSources(readings, accumulated) {
  return readings.map((r) => {
    const row = {
      id: r.id,
      pillar: r.pillar,
      label: r.label,
      region: r.region,
      unit: r.unit ?? null,
      unit_label: r.unit_label,
      cadence: r.cadence,
      direction: r.direction,
      state: 'dark',
      value: null,
      score: null,
      percentile: null,
      baseline_n: 0,
      baseline_origin: null,
      baseline_source: null,
      baseline_span: null,
      baseline_note: null,
      observed_at: null,
      error: null,
      meta: {},
      ms: r.ms,
    };

    if (r.state === 'dark') {
      row.error = r.error;
      return row;
    }

    row.value = r.value;
    row.observed_at = r.observed_at;
    row.meta = r.meta;

    // The feed's own history wins over ours whenever it is long enough: five
    // years of weekly Drought Monitor maps is a better distribution than
    // anything this collector could accumulate, and it is right there in the
    // response we already paid for.
    let chosen = null;
    if (r.baseline && r.baseline.values.length >= MIN_BASELINE_N) {
      chosen = r.baseline;
    } else {
      // The accumulated store already includes TODAY's point, written a moment
      // ago. Scoring a value against a distribution containing itself pulls its
      // own percentile toward the middle, so today comes out.
      const day = String(r.observed_at ?? '').slice(0, 10);
      const days = (accumulated[r.id]?.days ?? []).filter((d) => d.d !== day);
      if (days.length >= MIN_BASELINE_N) {
        chosen = {
          values: days.map((d) => d.v),
          origin: 'accumulated',
          source: 'one reading per UTC day, recorded by this collector',
          span: `${days[0].d} to ${days[days.length - 1].d}`,
          note: 'this feed publishes no usable history, so the baseline is grown a day at a time',
        };
      }
    }

    if (!chosen) {
      row.state = 'awaiting-baseline';
      const feedN = r.baseline?.values.length ?? 0;
      const accN = (accumulated[r.id]?.days ?? []).length;
      row.baseline_n = Math.max(feedN, accN);
      row.baseline_origin = r.baseline ? 'feed' : 'accumulated';
      row.baseline_note =
        `${row.baseline_n} of ${MIN_BASELINE_N} points needed before this source can be scored`;
      return row;
    }

    const s = score(r.value, chosen.values);
    row.state = 'live';
    row.score = s.score;
    row.percentile = s.percentile;
    row.z = s.z;
    row.baseline_n = s.baseline_n;
    row.baseline_origin = chosen.origin;
    row.baseline_source = chosen.source;
    row.baseline_span = chosen.span;
    row.baseline_note = chosen.note;
    row.baseline_min = s.baseline_min;
    row.baseline_median = s.baseline_median;
    row.baseline_max = s.baseline_max;
    return row;
  });
}

function buildPillars(sources) {
  return PILLARS.map((p) => {
    const mine = sources.filter((s) => s.pillar === p.id);
    const live = mine.filter((s) => s.state === 'live');
    const awaiting = mine.filter((s) => s.state === 'awaiting-baseline');
    const dark = mine.filter((s) => s.state === 'dark');

    // THREE STATES AT THE PILLAR LEVEL TOO, and this is the whole honesty
    // argument in one ternary. A pillar with no live source is NOT automatically
    // dark: if its feeds all answered and are simply short of baseline, nothing
    // is broken and calling it dark claims an outage that is not happening. It
    // is only dark when something actually failed. The first build of this file
    // collapsed the two and printed "grid DARK" on a run where all four grid
    // feeds returned clean numbers.
    const state = live.length > 0 ? 'live'
      : awaiting.length > 0 ? 'awaiting-baseline'
      : 'dark';

    return {
      id: p.id,
      name: p.name,
      blurb: p.blurb,
      // Never zero, never carried forward, never imputed from its siblings.
      score: live.length ? round(mean(live.map((s) => s.score)), SCORE_DP) : null,
      state,
      dark: state === 'dark',
      sources_live: live.length,
      sources_awaiting: awaiting.length,
      sources_dark: dark.length,
      sources_total: mine.length,
    };
  });
}

function printTable(sources, out) {
  const w = {
    id: Math.max(9, ...sources.map((s) => s.id.length)),
    pillar: Math.max(8, ...PILLAR_IDS.map((p) => p.length)),
    value: Math.max(9, ...sources.map((s) => fmtValue(s).length)),
    unit: Math.max(4, ...sources.map((s) => (s.unit_label ?? s.unit ?? '').length)),
  };
  const head =
    'source'.padEnd(w.id) + '  ' + 'pillar'.padEnd(w.pillar) + '  ' +
    'state'.padEnd(17) + 'value'.padStart(w.value) + '  ' +
    'unit'.padEnd(w.unit) + '  ' + 'score'.padStart(5) + '  ' +
    'pctile'.padStart(6) + '  ' + 'base'.padStart(5) + ' origin       ' + '   ms';

  console.log('');
  console.log(head);
  console.log('-'.repeat(head.length));
  for (const s of sources) {
    let line =
      s.id.padEnd(w.id) + '  ' + s.pillar.padEnd(w.pillar) + '  ' +
      s.state.toUpperCase().padEnd(17) +
      fmtValue(s).padStart(w.value) + '  ' +
      String(s.unit_label ?? s.unit ?? '').padEnd(w.unit) + '  ' +
      (s.score === null ? '—' : s.score.toFixed(1)).padStart(5) + '  ' +
      (s.percentile === null ? '—' : (100 * s.percentile).toFixed(1)).padStart(6) + '  ' +
      String(s.baseline_n).padStart(5) + ' ' +
      String(s.baseline_origin ?? '—').padEnd(13) +
      String(s.ms).padStart(5);
    if (s.error) line += `\n${' '.repeat(w.id + 2)}└─ ${s.error}`;
    console.log(line);
  }
  console.log('');
  for (const p of out.pillars) {
    console.log(
      `${p.id.padEnd(w.pillar)}  ${p.score === null ? p.state.toUpperCase().padStart(17) : String(p.score).padStart(17)}  ` +
      `${p.sources_live} live / ${p.sources_awaiting} awaiting / ${p.sources_dark} dark`
    );
  }
  console.log('');
  console.log(
    out.score === null
      ? `SUBSTRATE —  no live pillar; composite not computed`
      : `SUBSTRATE ${out.level} ${out.level_name}  composite ${out.score} of 100  (rule: ${out.rule_fired})`
  );
  console.log(
    `${out.counts.live} live, ${out.counts.awaiting_baseline} awaiting baseline, ` +
    `${out.counts.dark} dark, of ${out.counts.total}`
  );
}

function fmtValue(s) {
  if (s.value === null) return '—';
  return Math.abs(s.value) >= 1000 ? s.value.toFixed(0) : s.value.toFixed(2);
}

async function main() {
  const generatedAt = new Date().toISOString();
  const adapters = await discoverAdapters();
  const previous = await readPrevious();

  const settled = await Promise.allSettled(adapters.map((a) => runAdapter(a, generatedAt)));
  const readings = settled.map((o, i) => {
    if (o.status === 'fulfilled') return o.value;
    return {
      id: adapters[i].id, pillar: adapters[i].pillar, label: adapters[i].label,
      region: adapters[i].region ?? null, unit_label: adapters[i].unitLabel ?? null,
      cadence: adapters[i].cadence ?? null, direction: adapters[i].direction ?? null,
      state: 'dark', value: null,
      error: `collector bug: runAdapter rejected — ${errorMessage(o.reason)}`, ms: 0,
    };
  });

  const accumulated = updateAccumulated(previous, readings);
  const sources = buildSources(readings, accumulated);
  const pillars = buildPillars(sources);

  const livePillars = pillars.filter((p) => p.state === 'live').map((p) => p.score);
  const darkPillars = pillars.filter((p) => p.state === 'dark').map((p) => p.id);
  const awaitingPillars = pillars.filter((p) => p.state === 'awaiting-baseline').map((p) => p.id);

  // CONTRACT.md step 4, unchanged: 0.7 * mean + 0.3 * max over live pillars.
  // The max term is why a single pillar at the top of its record moves the
  // composite even when the others are ordinary — which is the behaviour you
  // want from something watching for one thing going wrong.
  const composite = livePillars.length
    ? round(0.7 * mean(livePillars) + 0.3 * Math.max(...livePillars), SCORE_DP)
    : null;

  const raw = composite === null ? null : levelFor(composite);
  const flap = composite === null
    ? { level: null, level_since: null, rule_fired: 'no live pillar', previous_level: previous?.level ?? null }
    : applyAntiFlap({
        rawLevel: raw.level, score: composite, previous,
        darkPillars, pillars, generatedAt,
      });

  const named = flap.level === null ? null : levelByNumber(flap.level);

  // The last run that actually produced a number, carried forward untouched
  // through every dark run. The page renders it under an explicit "this is the
  // last reading, not the current one" label; it is never shown as live.
  const lastKnown = composite !== null
    ? {
        level: flap.level,
        level_name: named?.name ?? null,
        level_since: flap.level_since,
        score: composite,
        generated_at: generatedAt,
      }
    : (previous?.last_known ?? null);

  const counts = {
    live: sources.filter((s) => s.state === 'live').length,
    awaiting_baseline: sources.filter((s) => s.state === 'awaiting-baseline').length,
    dark: sources.filter((s) => s.state === 'dark').length,
    total: sources.length,
  };

  const history = [...(Array.isArray(previous?.history) ? previous.history : [])]
    .filter((h) => h && typeof h.generated_at === 'string' && h.generated_at !== generatedAt);
  if (composite !== null) history.push({ generated_at: generatedAt, score: composite, level: flap.level });

  const out = {
    schema: SCHEMA_VERSION,
    engine_version: ENGINE_VERSION,
    generated_at: generatedAt,
    index: {
      name: 'SUBSTRATE',
      question: 'How loaded is the physical substrate the models are being built on?',
      feeds_main_index: false,
    },
    score: composite,
    level: flap.level,
    level_name: named?.name ?? null,
    level_gloss: named?.gloss ?? null,
    previous_level: flap.previous_level,
    level_since: flap.level_since,
    rule_fired: flap.rule_fired,
    raw_level: raw?.level ?? null,
    last_known: lastKnown,
    degraded: counts.dark > 0 || darkPillars.length > 0,
    dark_pillars: darkPillars,
    awaiting_pillars: awaitingPillars,
    counts,
    levels: LEVELS,
    pillars,
    sources,
    thresholds: {
      min_baseline_n: MIN_BASELINE_N,
      deadband: DEADBAND,
      min_hours_between_changes: MIN_HOURS_BETWEEN_CHANGES,
      quorum: QUORUM,
      composite: '0.7 * mean(live pillars) + 0.3 * max(live pillars)',
      normalisation: 'empirical percentile -> inverse normal CDF -> 50 + 12.5z, clamped to [0,100]',
    },
    history: history.slice(-MAX_HISTORY),
    baselines: accumulated,
  };

  await mkdir(new URL('../data/', import.meta.url), { recursive: true });
  // Write-then-rename. A run killed mid-write would otherwise leave a truncated
  // infra.json, and readPrevious() treats unparseable JSON as fatal precisely
  // because it carries the accumulated baselines.
  const tmp = new URL('../data/.infra.json.tmp', import.meta.url);
  await writeFile(tmp, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
  await rename(tmp, OUT_FILE);

  printTable(sources, out);
  console.log(`wrote data/infra.json`);

  if (counts.live === 0 && counts.awaiting_baseline === 0) {
    console.error('\ninfra: every source failed — exiting 1');
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(`infra: fatal — ${errorMessage(err)}`);
  process.exitCode = 1;
});
