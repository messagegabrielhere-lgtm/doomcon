// collector/engine.mjs
//
// raw readings -> normalised scores -> pillars -> composite -> level,
// through the six-layer anti-flap state machine.
//
// Everything above main() is pure and exported. That is not tidiness: the whole
// product claim is that a stranger can recompute our number from public data, so
// the arithmetic has to be reachable without touching the filesystem or a clock.
//
// Rounding discipline: every stage rounds before the next stage consumes it.
// Full-precision intermediates would mean a verifier working from our published
// numbers lands a few ULPs away from ours and cannot reproduce the hash. Each
// published number is literally the number we used.

import { readFileSync, writeFileSync, appendFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { writeReceipt, latestReceipt, receiptIdFor, canonicalJson, GENESIS_PREV_HASH } from './receipts.mjs';

export const ENGINE_VERSION = '1.0.0';
export const STATE_SCHEMA = 1;

// ---------------------------------------------------------------------------
// Constants. Every one of these is published in docs/METHODOLOGY.md and copied
// into each receipt, so a level change can be re-argued years later against the
// thresholds that were actually in force at the time.
// ---------------------------------------------------------------------------

// Fixed ids, fixed order. CONTRACT.md: never renamed, never reordered.
export const PILLARS = [
  { id: 'capability', name: 'Capability' },
  { id: 'compute',    name: 'Compute & Capital' },
  { id: 'attention',  name: 'Attention' },
  { id: 'governance', name: 'Governance' },
  { id: 'markets',    name: 'Markets' },
];

export const LEVEL_NAMES = { 5: 'DORMANT', 4: 'ROUTINE', 3: 'ELEVATED', 2: 'ACCELERATED', 1: 'UNPRECEDENTED' };

// BOUNDARY[L] is the composite score separating level L from level L-1.
// The published bands are stated in whole points (0-34, 35-54, ...); read
// continuously, the cut sits at the upper band's floor.
export const BOUNDARY = { 5: 35, 4: 55, 3: 70, 2: 85 };

export const SCORE_Z_SCALE = 12.5;   // S = 50 + 12.5*z
export const SCORE_CENTRE = 50;

export const DEADBAND = 3;                       // layer 1: Schmitt, +/-3 points
export const DWELL_UP_SECONDS = [10800, 1800];   // layer 2: 3h AND 30min, both past T_up
export const DWELL_DOWN_SECONDS = [43200, 10800];// layer 2: 12h AND 3h, both below T_down
export const MIN_INTERVAL_MS = 6 * 3600 * 1000;  // layer 3
export const LOCK_MS = 4 * 3600 * 1000;          // layer 4
export const QUORUM = 2;                         // layer 6: 2-of-5 pillars
export const NOWCAST_WINDOW = 12;
export const NOWCAST_MIN_WEIGHT = 0.5;

const SCORE_DP = 4;
const PCT_DP = 6;

// ---------------------------------------------------------------------------
// Small pure helpers
// ---------------------------------------------------------------------------

export function round(x, dp) {
  if (!Number.isFinite(x)) throw new Error(`round: refusing non-finite value ${x}`);
  const r = Number(x.toFixed(dp));
  return Object.is(r, -0) ? 0 : r;
}

export function clamp(x, lo, hi) {
  return x < lo ? lo : x > hi ? hi : x;
}

function mean(xs) {
  if (xs.length === 0) throw new Error('mean: empty array');
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

// ---------------------------------------------------------------------------
// Inverse normal CDF - Acklam's rational approximation (Peter J. Acklam, 2003).
//
// Chosen over Moro because it is a single closed-form rational fit with no
// branch-dependent tail series, so it is short enough to read and audit in one
// sitting - which matters more here than raw accuracy, since a verifier has to
// be able to convince themselves it is right.
//
// Relative error < 1.15e-9 over the whole open interval (0,1), without the
// Halley refinement step. We deliberately omit the refinement: it needs erfc,
// which Node has no built-in for, and 1.15e-9 is ~7 orders of magnitude finer
// than the 4-decimal precision we publish.
// ---------------------------------------------------------------------------

const ACKLAM_A = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
                   1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
const ACKLAM_B = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
                   6.680131188771972e+01, -1.328068155288572e+01];
const ACKLAM_C = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
                  -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
const ACKLAM_D = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00,
                  3.754408661907416e+00];
const ACKLAM_P_LOW = 0.02425;

export function invNormalCdf(p) {
  if (!Number.isFinite(p) || p <= 0 || p >= 1) {
    throw new Error(`invNormalCdf: p must be strictly inside (0,1), got ${p}`);
  }
  const [a0, a1, a2, a3, a4, a5] = ACKLAM_A;
  const [b0, b1, b2, b3, b4] = ACKLAM_B;
  const [c0, c1, c2, c3, c4, c5] = ACKLAM_C;
  const [d0, d1, d2, d3] = ACKLAM_D;

  if (p < ACKLAM_P_LOW) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c0 * q + c1) * q + c2) * q + c3) * q + c4) * q + c5) /
           ((((d0 * q + d1) * q + d2) * q + d3) * q + 1);
  }
  if (p <= 1 - ACKLAM_P_LOW) {
    const q = p - 0.5, r = q * q;
    return (((((a0 * r + a1) * r + a2) * r + a3) * r + a4) * r + a5) * q /
           (((((b0 * r + b1) * r + b2) * r + b3) * r + b4) * r + 1);
  }
  const q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c0 * q + c1) * q + c2) * q + c3) * q + c4) * q + c5) /
          ((((d0 * q + d1) * q + d2) * q + d3) * q + 1);
}

// ---------------------------------------------------------------------------
// Step 1: normalise against the FROZEN reference distribution
// ---------------------------------------------------------------------------

/**
 * Empirical percentile of `value` against an ascending quantile grid.
 *
 * The grid is the inverse CDF sampled at evenly spaced knots, so inverting it
 * gives the percentile. Where the grid is flat (a plateau - common for sources
 * that read zero on most days) the inverse is multivalued and we take the
 * midpoint of the plateau. That is the standard mid-rank convention, and it
 * stops a source that is zero 60% of the time from scoring at percentile 0 on
 * a perfectly ordinary zero day.
 */
export function empiricalPercentile(value, grid) {
  if (!Array.isArray(grid) || grid.length < 2) {
    throw new Error(`empiricalPercentile: quantile grid must have >= 2 points, got ${grid?.length}`);
  }
  if (!Number.isFinite(value)) throw new Error(`empiricalPercentile: value must be finite, got ${value}`);
  const last = grid.length - 1;
  // Strict comparisons only. Using <= here was a real bug: for a source that
  // reads zero on (say) 11% of days, the grid floor IS zero, and an ordinary
  // zero day would return percentile 0 - i.e. "all-time low" - and normalise to
  // a score near 12. Equality has to fall through to the plateau rule below.
  if (value < grid[0]) return 0;
  if (value > grid[last]) return 1;

  let lo = 0;
  for (let i = 0; i <= last; i++) if (grid[i] <= value) lo = i;

  if (grid[lo] === value) {
    let a = lo;
    while (a > 0 && grid[a - 1] === value) a--;
    return ((a + lo) / 2) / last;
  }
  const span = grid[lo + 1] - grid[lo];
  const frac = span > 0 ? (value - grid[lo]) / span : 0;
  return (lo + frac) / last;
}

/**
 * value -> percentile -> pseudo-z -> S = 50 + 12.5*z, clamped to [0,100].
 *
 * The percentile is pinched away from 0 and 1 by a continuity correction of
 * 1/(2n), where n is the size of the reference sample. Without it, any new
 * record high is percentile 1.0 and z is +Infinity. With it, the most extreme
 * claim we can make is bounded by how much history we actually have: a 365-day
 * reference tops out near S=90, a 4000-day reference near S=95. Extremity has to
 * be earned with evidence. This is deliberate and is documented as a known
 * property, not a bug - it is why the index is structurally hard to pin at 100.
 */
export function normalise(value, ref) {
  if (!ref || !Array.isArray(ref.quantiles)) {
    throw new Error('normalise: reference entry must carry a quantiles array');
  }
  const n = ref.n;
  if (!Number.isInteger(n) || n < 2) {
    throw new Error(`normalise: reference entry needs an integer sample size n >= 2, got ${n}`);
  }
  const percentile = empiricalPercentile(value, ref.quantiles);
  const eps = 1 / (2 * n);
  const adjusted = round(clamp(percentile, eps, 1 - eps), PCT_DP);
  const z = round(invNormalCdf(adjusted), PCT_DP);
  const score = round(clamp(SCORE_CENTRE + SCORE_Z_SCALE * z, 0, 100), SCORE_DP);
  return { percentile: round(percentile, PCT_DP), percentile_adjusted: adjusted, z, score };
}

// ---------------------------------------------------------------------------
// Step 2: EPA NowCast smoothing
// ---------------------------------------------------------------------------

/**
 * EPA NowCast over the trailing 12 observations. series[0] is the current
 * observation, series[i] is i observations ago, null where that source was dark.
 *
 * w = max(0.5, min/max) over the present values; observation i gets weight w^i.
 * The 0.5 floor is what makes NowCast the right choice here: in a quiet stretch
 * it behaves like a 12-period average, and when the range blows out it collapses
 * toward the newest reading instead of burying a spike under stale history.
 *
 * Missing slots are skipped but keep their offset - a value three observations
 * ago is weighted w^3 whether or not observation two exists. Collapsing the gap
 * would silently make stale data look fresh.
 */
export function nowcast(series) {
  if (!Array.isArray(series) || series.length === 0) throw new Error('nowcast: empty series');
  if (series[0] === null || series[0] === undefined) {
    throw new Error('nowcast: series[0] is the current observation and must be present');
  }
  const present = series.filter((v) => v !== null && v !== undefined);
  for (const v of present) {
    if (!Number.isFinite(v)) throw new Error(`nowcast: non-finite value in series (${v})`);
  }
  const lo = Math.min(...present), hi = Math.max(...present);
  // hi === 0 means every present value is 0 (scores are non-negative), so the
  // range ratio is degenerate rather than undefined. Reachable, not theoretical.
  const ratio = hi > 0 ? lo / hi : 1;
  const w = clamp(Math.max(NOWCAST_MIN_WEIGHT, ratio), NOWCAST_MIN_WEIGHT, 1);

  let num = 0, den = 0;
  for (let i = 0; i < series.length; i++) {
    const v = series[i];
    if (v === null || v === undefined) continue;
    const weight = Math.pow(w, i);
    num += weight * v;
    den += weight;
  }
  return { value: round(num / den, SCORE_DP), w: round(w, SCORE_DP), used: present.length };
}

// ---------------------------------------------------------------------------
// Steps 3-5: pillars, composite, level band
// ---------------------------------------------------------------------------

/** Composite = 0.7*mean(live pillars) + 0.3*max(live pillars). Null if none are live. */
export function composite(livePillarScores) {
  if (livePillarScores.length === 0) return null;
  return round(0.7 * mean(livePillarScores) + 0.3 * Math.max(...livePillarScores), SCORE_DP);
}

export function levelFor(score) {
  if (score === null) return null;
  if (score < BOUNDARY[5]) return 5;
  if (score < BOUNDARY[4]) return 4;
  if (score < BOUNDARY[3]) return 3;
  if (score < BOUNDARY[2]) return 2;
  return 1;
}

// ---------------------------------------------------------------------------
// The anti-flap state machine - all six layers
// ---------------------------------------------------------------------------

/** Mean composite over the trailing `seconds`, from live observations only. */
export function meanOverWindow(observations, nowMs, seconds) {
  const cutoff = nowMs - seconds * 1000;
  const xs = observations
    .filter((o) => o.t >= cutoff && o.t <= nowMs && o.score !== null && o.score !== undefined)
    .map((o) => o.score);
  if (xs.length === 0) return null;
  return { mean: round(mean(xs), SCORE_DP), n: xs.length };
}

/**
 * Decide this run's level.
 *
 * Returns { level, changed, rule_fired, thresholds } where rule_fired names the
 * gate that BLOCKED a change, or the change itself. Naming the blocker is the
 * useful audit field: "why is it still ELEVATED when the score says ACCELERATED"
 * is the question every reader asks, and the receipt has to answer it.
 *
 * Gate order matters and is fixed: cheap structural gates first, then time, then
 * the statistical tests, then breadth.
 */
export function decideLevel(ctx) {
  const { score, currentLevel, levelSinceMs, pillarScores, observations, nowMs, darkPillars } = ctx;

  if (score === null) {
    // No live pillar at all. Hold whatever we last said and say nothing new.
    return { level: currentLevel, changed: false, rule_fired: 'no_live_pillars', thresholds: null };
  }

  if (currentLevel === null || currentLevel === undefined) {
    // Genesis. There is no prior level to protect, so the anti-flap machine has
    // nothing to act on; we adopt the band the score is in. If pillars are dark
    // this is flagged separately as genesis_under_degradation so the site is
    // obliged to show the degraded banner rather than a clean first number.
    return { level: levelFor(score), changed: true, rule_fired: 'genesis', thresholds: null };
  }

  // The honesty rule. A dark pillar means the composite is computed over a
  // different set of inputs than last run, so any apparent move may be an
  // artifact of what died rather than of what happened. Freeze, disclose, wait.
  if (darkPillars.length > 0) {
    return { level: currentLevel, changed: false, rule_fired: 'frozen_dark_pillar', thresholds: null };
  }

  const target = levelFor(score);
  if (target === currentLevel) {
    return { level: currentLevel, changed: false, rule_fired: 'none', thresholds: null };
  }

  const escalating = target < currentLevel; // lower number = louder
  // Layer 1 (Schmitt) and layer 5 (one step) in one line each.
  const threshold = escalating
    ? BOUNDARY[currentLevel] + DEADBAND
    : BOUNDARY[currentLevel + 1] - DEADBAND;
  const proposed = escalating ? currentLevel - 1 : currentLevel + 1;
  const windows = escalating ? DWELL_UP_SECONDS : DWELL_DOWN_SECONDS;

  const thresholds = {
    direction: escalating ? 'escalate' : 'deescalate',
    proposed_level: proposed,
    threshold,
    windows_seconds: windows,
    window_means: {},
    quorum_required: QUORUM,
    quorum_agreeing: null,
  };

  // Layer 4: post-change lock. Kept as its own gate even though the 6h minimum
  // currently subsumes it - if the minimum is ever shortened the lock still bites.
  const sinceChange = nowMs - levelSinceMs;
  if (sinceChange < LOCK_MS) {
    return { level: currentLevel, changed: false, rule_fired: 'locked', thresholds };
  }
  // Layer 3: minimum 6h between changes.
  if (sinceChange < MIN_INTERVAL_MS) {
    return { level: currentLevel, changed: false, rule_fired: 'min_interval', thresholds };
  }

  // Layer 1 proper: the instantaneous score must clear the deadband before we
  // even look at the dwell windows.
  const cleared = escalating ? score > threshold : score < threshold;
  if (!cleared) {
    return { level: currentLevel, changed: false, rule_fired: 'deadband', thresholds };
  }

  // Layer 2: dual-window dwell. Both windows must agree. De-escalation uses the
  // 12h/3h pair against escalation's 3h/30min, which is what makes standing down
  // roughly four times slower than raising - deliberate asymmetry.
  for (const secs of windows) {
    const m = meanOverWindow(observations, nowMs, secs);
    thresholds.window_means[String(secs)] = m ? m.mean : null;
    if (m === null) {
      return { level: currentLevel, changed: false, rule_fired: 'insufficient_history', thresholds };
    }
    const pass = escalating ? m.mean > threshold : m.mean < threshold;
    if (!pass) {
      return { level: currentLevel, changed: false, rule_fired: 'dwell', thresholds };
    }
  }

  // Layer 6: breadth. The composite carries a 0.3*max term, so a single pillar
  // spiking can drag the whole index across a boundary on its own. The quorum is
  // the guard against exactly that: at least two live pillars must independently
  // be on the correct side of the threshold.
  const agreeing = pillarScores.filter((p) => (escalating ? p > threshold : p < threshold)).length;
  thresholds.quorum_agreeing = agreeing;
  if (agreeing < QUORUM) {
    return { level: currentLevel, changed: false, rule_fired: 'quorum', thresholds };
  }

  return {
    level: proposed,
    changed: true,
    rule_fired: escalating ? 'escalate' : 'deescalate',
    thresholds,
  };
}

// ---------------------------------------------------------------------------
// The whole computation, as one pure function
// ---------------------------------------------------------------------------

/**
 * @param raw            parsed data/raw/<iso>.json
 * @param reference      parsed data/reference.json (frozen)
 * @param history        array of parsed data/history.ndjson lines
 * @param previousState  parsed data/state.json, or null
 * @param prevReceipt    the last receipt, or null
 * @param nowIso         generated_at for this run
 */
export function runEngine({ raw, reference, history, previousState, prevReceipt, nowIso }) {
  if (!raw || !Array.isArray(raw.readings)) {
    throw new Error('runEngine: raw snapshot must have a readings array (see CONTRACT.md data/raw shape)');
  }
  if (!reference || !reference.sources) {
    throw new Error('runEngine: reference.json missing or has no sources map; run collector/backfill.mjs first');
  }
  const nowMs = new Date(nowIso).getTime();
  if (Number.isNaN(nowMs)) throw new Error(`runEngine: bad nowIso ${nowIso}`);

  // Only live (non-backfilled) lines feed the windows. Backfilled history is
  // daily and reconstructed from a partial pillar set; folding it into a "3h
  // mean" would be mixing cadences and calling the result a measurement.
  const liveHistory = history.filter((h) => h.backfilled !== true);
  const recent = liveHistory.slice(-(NOWCAST_WINDOW - 1)).reverse(); // newest first

  const refIndex = buildReferenceIndex(reference);

  // ---- per source -------------------------------------------------------
  const sources = [];
  for (const r of raw.readings) {
    if (!r || typeof r.source !== 'string') {
      throw new Error(`runEngine: reading without a source id: ${JSON.stringify(r)}`);
    }
    const base = { id: r.source, pillar: r.pillar ?? null, label: r.label ?? null };

    if (r.ok !== true) {
      sources.push({ ...base, ok: false, error: r.error ?? 'collector reported not ok',
                     value: null, unit: r.unit ?? null, observed_at: r.observed_at ?? null,
                     percentile: null, z: null, score_raw: null, score: null,
                     nowcast_w: null, nowcast_series: null });
      continue;
    }
    if (!Number.isFinite(r.value)) {
      sources.push({ ...base, ok: false, error: `non_finite_value: ${JSON.stringify(r.value)}`,
                     value: null, unit: r.unit ?? null, observed_at: r.observed_at ?? null,
                     percentile: null, z: null, score_raw: null, score: null,
                     nowcast_w: null, nowcast_series: null });
      continue;
    }

    const ref = refIndex.get(r.source);
    if (!ref) {
      // Still not scoreable - inventing a distribution is the sin this project
      // exists to avoid - but UNCALIBRATED is not DARK and must not be conflated
      // with one. Dark means "we normally measure this and the pipe is dead";
      // uncalibrated means "this source reports fine, we have no frozen history
      // to judge it against yet". Collapsing the two is exactly pizzint's error
      // in the opposite direction, and it would pin the index in a permanent
      // DEGRADED state that can never change level. The reading is still
      // recorded and still published - it just does not enter the composite.
      sources.push({ ...base, ok: false, uncalibrated: true,
                     error: `uncalibrated: "${r.source}" has no entry in data/reference.json yet, so it is collected and published but not scored`,
                     value: r.value, unit: r.unit ?? null, observed_at: r.observed_at ?? null,
                     percentile: null, z: null, score_raw: null, score: null,
                     nowcast_w: null, nowcast_series: null });
      continue;
    }
    const accepted = ref.accepted_units ?? [ref.unit];
    if (r.unit != null && !accepted.includes(r.unit)) {
      sources.push({ ...base, ok: false,
                     error: `unit_mismatch: reading is "${r.unit}", reference accepts [${accepted.join(', ')}]`,
                     value: r.value, unit: r.unit, observed_at: r.observed_at ?? null,
                     percentile: null, z: null, score_raw: null, score: null,
                     nowcast_w: null, nowcast_series: null });
      continue;
    }

    const norm = normalise(r.value, ref);
    // Positional series: slot i is i observations ago, null where this source
    // was dark then. Offsets are preserved so stale data is weighted as stale.
    const series = [norm.score, ...recent.map((h) => (h.sources && h.sources[r.source] != null ? h.sources[r.source] : null))];
    const smoothed = nowcast(series);

    sources.push({
      ...base, ok: true, error: null,
      value: r.value, unit: r.unit ?? ref.unit ?? null, observed_at: r.observed_at ?? raw.generated_at,
      reference_key: ref.key,
      percentile: norm.percentile, percentile_adjusted: norm.percentile_adjusted, z: norm.z,
      score_raw: norm.score, score: smoothed.value,
      nowcast_w: smoothed.w, nowcast_used: smoothed.used, nowcast_series: series,
    });
  }

  // ---- pillars ----------------------------------------------------------
  const pillars = PILLARS.map(({ id, name }) => {
    const mine = sources.filter((s) => s.pillar === id);
    const live = mine.filter((s) => s.ok);
    // A pillar nobody has calibrated yet is not a pillar that broke. Only a
    // pillar with at least one calibrated source that is currently failing
    // counts as dark, because only that case means we have lost a measurement
    // we normally have.
    const calibrated = mine.filter((s) => !s.uncalibrated);
    if (live.length === 0) {
      const uncalibrated = calibrated.length === 0 && mine.length > 0;
      return { id, name, score: null, percentile: null, sources_ok: 0,
               sources_total: mine.length, dark: !uncalibrated, uncalibrated };
    }
    return {
      id, name,
      score: round(mean(live.map((s) => s.score)), SCORE_DP),
      percentile: round(mean(live.map((s) => s.percentile)), PCT_DP),
      sources_ok: live.length, sources_total: mine.length, dark: false, uncalibrated: false,
    };
  });

  const darkPillars = pillars.filter((p) => p.dark).map((p) => p.id);
  const livePillarScores = pillars.filter((p) => !p.dark).map((p) => p.score);
  const score = composite(livePillarScores);

  // ---- level ------------------------------------------------------------
  const prevLevel = previousState?.level ?? null;
  const prevLevelSince = previousState?.level_since ? new Date(previousState.level_since).getTime() : nowMs;

  const observations = [
    ...liveHistory.map((h) => ({ t: new Date(h.t).getTime(), score: h.score })),
    { t: nowMs, score },
  ];

  const decision = decideLevel({
    score, currentLevel: prevLevel, levelSinceMs: prevLevelSince,
    pillarScores: livePillarScores, observations, nowMs, darkPillars,
  });

  // failed = a calibrated source that did not report. uncalibrated sources are
  // reported separately so the dashboard can say "awaiting calibration" rather
  // than crying outage about a source that is working perfectly well.
  const failedSources = sources.filter((s) => !s.ok && !s.uncalibrated).map((s) => s.id);
  const uncalibratedSources = sources.filter((s) => s.uncalibrated).map((s) => s.id);
  const uncalibratedPillars = pillars.filter((p) => p.uncalibrated).map((p) => p.id);
  const degraded = darkPillars.length > 0 || failedSources.length > 0;
  const genesisUnderDegradation = decision.rule_fired === 'genesis' && darkPillars.length > 0;

  const levelSince = decision.changed ? nowIso : (previousState?.level_since ?? nowIso);
  const previousLevel = decision.changed ? prevLevel : (previousState?.previous_level ?? null);

  const prevScore = previousState?.score ?? null;
  const delta = (score !== null && prevScore !== null) ? round(score - prevScore, SCORE_DP) : null;

  const state = {
    schema: STATE_SCHEMA,
    generated_at: nowIso,
    score,
    level: decision.level,
    level_name: decision.level === null ? null : LEVEL_NAMES[decision.level],
    previous_level: previousLevel,
    level_since: levelSince,
    delta_from_previous: delta,
    degraded,
    dark_pillars: darkPillars,
    uncalibrated_pillars: uncalibratedPillars,
    uncalibrated_sources: uncalibratedSources,
    failed_sources: failedSources,
    // posts.mjs must suppress when 2+ pillars are dark. Computed here so the
    // rule lives in one place and the post layer cannot get it wrong.
    post_suppressed: darkPillars.length >= 2,
    genesis_under_degradation: genesisUnderDegradation,
    rule_fired: decision.rule_fired,
    pillars: pillars.map((p) => ({ ...p })),
    sources: sources.map((s) => ({
      id: s.id, pillar: s.pillar, label: s.label, ok: s.ok,
      uncalibrated: Boolean(s.uncalibrated), error: s.error ?? null,
      value: s.value, unit: s.unit,
      score: s.score ?? null, percentile: s.percentile ?? null,
      observed_at: s.observed_at ?? null,
      age_seconds: s.observed_at ? Math.max(0, Math.round((nowMs - new Date(s.observed_at).getTime()) / 1000)) : null,
      last_ok: s.ok ? (s.observed_at ?? nowIso) : (lastOkFor(previousState, s.id) ?? null),
    })),
    engine_version: ENGINE_VERSION,
    receipt_id: receiptIdFor(nowIso),
    prev_receipt_hash: prevReceipt?.hash ?? GENESIS_PREV_HASH,
  };

  const receiptBody = {
    schema: 1,
    id: state.receipt_id,
    generated_at: nowIso,
    score,
    level: decision.level,
    level_name: state.level_name,
    delta_from_previous: delta,
    level_changed: decision.changed && decision.rule_fired !== 'genesis' ? true : decision.changed,
    rule_fired: decision.rule_fired,
    decision: decision.thresholds,
    degraded,
    dark_pillars: darkPillars,
    uncalibrated_pillars: uncalibratedPillars,
    uncalibrated_sources: uncalibratedSources,
    pillars: pillars.map((p) => ({ ...p })),
    // The full working, not a summary. A stranger with this receipt and
    // data/reference.json can redo every arithmetic step and land on `score`.
    inputs: sources.map((s) => ({ ...s })),
    raw_generated_at: raw.generated_at ?? null,
    constants: {
      score_centre: SCORE_CENTRE, score_z_scale: SCORE_Z_SCALE,
      boundaries: BOUNDARY, deadband: DEADBAND,
      dwell_up_seconds: DWELL_UP_SECONDS, dwell_down_seconds: DWELL_DOWN_SECONDS,
      min_interval_ms: MIN_INTERVAL_MS, lock_ms: LOCK_MS, quorum: QUORUM,
      nowcast_window: NOWCAST_WINDOW, nowcast_min_weight: NOWCAST_MIN_WEIGHT,
      composite_weights: { mean: 0.7, max: 0.3 },
      rounding: { score_decimals: SCORE_DP, percentile_decimals: PCT_DP },
    },
    // Which frozen distribution was in force. If reference.json is ever edited,
    // every later receipt records a different hash and the edit is visible.
    reference: {
      built_at: reference.built_at ?? null,
      hash: 'sha256:' + createHash('sha256').update(canonicalJson(reference), 'utf8').digest('hex'),
    },
    engine_version: ENGINE_VERSION,
    prev_hash: prevReceipt?.hash ?? GENESIS_PREV_HASH,
  };

  const historyLine = {
    t: nowIso,
    score,
    level: decision.level,
    degraded,
    rule_fired: decision.rule_fired,
    pillars: Object.fromEntries(pillars.map((p) => [p.id, p.score])),
    // Raw (pre-smoothing) scores. Storing the smoothed value here would make the
    // next run smooth an already-smoothed series and quietly double-damp the index.
    sources: Object.fromEntries(sources.map((s) => [s.id, s.ok ? s.score_raw : null])),
  };

  return { state, receiptBody, historyLine, pillars, sources, decision };
}

function lastOkFor(previousState, id) {
  const prev = previousState?.sources?.find((s) => s.id === id);
  return prev?.last_ok ?? null;
}

/** id -> reference entry, resolving declared aliases. Aliases are in the frozen
 *  file so id resolution is auditable rather than hidden in code. */
function buildReferenceIndex(reference) {
  const idx = new Map();
  for (const [key, entry] of Object.entries(reference.sources)) {
    const withKey = { ...entry, key };
    idx.set(key, withKey);
    for (const alias of entry.aliases ?? []) {
      if (idx.has(alias) && idx.get(alias).key !== key) {
        throw new Error(`reference.json: alias "${alias}" is claimed by both "${idx.get(alias).key}" and "${key}"`);
      }
      idx.set(alias, withKey);
    }
  }
  return idx;
}

// ---------------------------------------------------------------------------
// I/O shell
// ---------------------------------------------------------------------------

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const P = {
  raw: join(ROOT, 'data', 'raw'),
  reference: join(ROOT, 'data', 'reference.json'),
  history: join(ROOT, 'data', 'history.ndjson'),
  state: join(ROOT, 'data', 'state.json'),
  receipts: join(ROOT, 'data', 'receipts'),
};

export function readHistory(path = P.history) {
  if (!existsSync(path)) return [];
  const text = readFileSync(path, 'utf8');
  const out = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    try {
      out.push(JSON.parse(line));
    } catch (e) {
      throw new Error(`readHistory: ${path}:${i + 1} is not valid JSON: ${e.message}`);
    }
  }
  return out;
}

function newestRawFile(dir) {
  if (!existsSync(dir)) throw new Error(`No raw snapshots: ${dir} does not exist. Run collector/collect.mjs first.`);
  const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  if (files.length === 0) throw new Error(`No raw snapshots in ${dir}. Run collector/collect.mjs first.`);
  return join(dir, files[files.length - 1]);
}

export function main(argv = process.argv.slice(2)) {
  const rawPath = argv[0] ?? newestRawFile(P.raw);
  if (!existsSync(P.reference)) {
    throw new Error(`Missing ${P.reference}. Build it once with: node collector/backfill.mjs`);
  }
  const raw = JSON.parse(readFileSync(rawPath, 'utf8'));
  const reference = JSON.parse(readFileSync(P.reference, 'utf8'));
  const history = readHistory(P.history);
  const previousState = existsSync(P.state) ? JSON.parse(readFileSync(P.state, 'utf8')) : null;
  const prevReceipt = latestReceipt(P.receipts);
  const nowIso = raw.generated_at ?? new Date().toISOString();

  const { state, receiptBody, historyLine } = runEngine({
    raw, reference, history, previousState, prevReceipt, nowIso,
  });

  const receipt = writeReceipt(P.receipts, receiptBody);
  state.receipt_hash = receipt.hash;

  mkdirSync(dirname(P.state), { recursive: true });
  writeFileSync(P.state, JSON.stringify(state, null, 2) + '\n', 'utf8');
  appendFileSync(P.history, JSON.stringify(historyLine) + '\n', 'utf8');

  const shown = state.score === null ? 'NO SCORE (all pillars dark)' : state.score.toFixed(1);
  console.log(`DOOMCON ${state.level ?? '-'} ${state.level_name ?? 'UNAVAILABLE'}  score=${shown}  rule=${state.rule_fired}` +
              (state.degraded ? `  DEGRADED dark=[${state.dark_pillars.join(',')}] failed=[${state.failed_sources.join(',')}]` : ''));
  console.log(`receipt ${receipt.id}  ${receipt.hash}`);
  return state;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
