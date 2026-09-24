// THE OVEN — a five-stage rail in the Domino's pizza-tracker grammar, pointed
// at the index we already publish.
//
// WHY THIS SHAPE. The Domino's tracker (PREP · BAKE · QUALITY CHECK · OUT FOR
// DELIVERY, your stage lit) is one of the most legible progress visuals ever
// shipped: no legend, no onboarding, understood in under a second by people who
// have never thought about it. Nobody has pointed it at an index. VISITORS.md
// measured the cost of not having one — every persona cluster we currently
// serve has a time budget over 45 seconds, every cluster pizzint serves has one
// under 20, and the level is stated seven separate ways above 6,000px of mobile
// scroll without any of them being a single glanceable object. This rail is
// that object, and it absorbs three of those seven restatements.
//
// THE ONE THING THAT MAKES IT SHIPPABLE RATHER THAN EMBARRASSING. A Domino's
// tracker is a RATCHET. Your pizza never goes back to PREP. If we ship the same
// grammar unchanged we have shipped a doom countdown with better typography,
// and the first hostile quote-tweet is correct. So three properties are
// non-negotiable and are enforced by the markup below:
//
//   1. The stages are the DOOMCON levels. Not a second, parallel scale that can
//      disagree with the first. brand.LEVELS is the only stage table; the band
//      edges printed here are derived from it and asserted at module load.
//   2. The rail is a THERMOSTAT, not a progress bar. The mark falls as readily
//      as it rises, the previous position is drawn, and the de-escalation gates
//      are printed with the same weight as the escalation gates. A reader who
//      only ever sees one of the two cards has been shown a countdown.
//   3. Every stage boundary is a published number with a published gate, and
//      both are on the page as figures. "What would have to happen" stated in
//      arithmetic is the difference between an instrument and a mood ring.
//
// It says WHERE WE ARE. It never says where we are going. Every number in it
// describes an observation that has already been written to a receipt.
//
// NO JAVASCRIPT. The whole component is server-rendered HTML plus one scoped
// <style>, the way _labs.mjs, _xwire.mjs and newsPage.mjs each ship their own,
// so site/styles.mjs stays owned by one author (MOTION.md Rule 0: every
// animated element is already in the static HTML, fully readable, before a
// single line of JS runs — here there is no JS at all).
//
// See docs/OVEN.md for the stage table, the thresholds and the statement that
// these describe observed activity and are not a prediction.

import { esc, num, signed, utc, duration, secondsBetween } from './_html.mjs';
import * as brand from '../brand.mjs';

// ---------------------------------------------------------------------------
// Engine constants
// ---------------------------------------------------------------------------

// collector/engine.mjs owns these. It also writes every one of them into each
// receipt's `constants` block, which is why this module prefers the receipt and
// treats the table below as a fallback only. Printing a hard-coded 3 beside a
// threshold the engine computed with a 4 would be a fabricated figure wearing
// the costume of a measured one — the exact failure this project exists not to
// commit — so the receipt wins whenever it is legible.
const FALLBACK_CONSTANTS = Object.freeze({
  boundaries: Object.freeze({ 2: 85, 3: 70, 4: 55, 5: 35 }),
  deadband: 3,
  dwell_up_seconds: Object.freeze([10800, 1800]),
  dwell_down_seconds: Object.freeze([43200, 10800]),
  min_interval_ms: 6 * 3600 * 1000,
  lock_ms: 4 * 3600 * 1000,
  quorum: 2,
});

// Human labels for the dwell windows. Derived from the seconds so a change to
// DWELL_UP_SECONDS cannot leave a stale "3h" on the page.
function windowLabel(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  if (seconds % 3600 === 0) return `${seconds / 3600}h`;
  if (seconds % 60 === 0) return `${seconds / 60}m`;
  return `${seconds}s`;
}

/**
 * Read the engine's constants off the receipt this state was produced by.
 *
 * Falls back per-field rather than wholesale: a receipt with a malformed
 * dwell array should not cost us the boundaries it got right.
 */
function constantsFrom(ctx) {
  const receipts = Array.isArray(ctx.receipts) ? ctx.receipts : [];
  const wanted = ctx.state && ctx.state.receipt_id;
  const hit = receipts.find((r) => r && r.id === wanted) || receipts[receipts.length - 1] || null;
  const raw = hit && hit.constants && typeof hit.constants === 'object' ? hit.constants : null;

  const out = { ...FALLBACK_CONSTANTS, source: raw ? 'receipt' : 'fallback', receipt_id: hit ? hit.id : null };
  if (!raw) return out;

  // Boundaries arrive JSON-keyed as strings. Accept only a complete, finite set;
  // a partial one is worse than the fallback because it silently mixes sources.
  if (raw.boundaries && typeof raw.boundaries === 'object') {
    const b = {};
    let ok = true;
    for (const lvl of [2, 3, 4, 5]) {
      const v = raw.boundaries[lvl] ?? raw.boundaries[String(lvl)];
      if (!Number.isFinite(v)) { ok = false; break; }
      b[lvl] = v;
    }
    if (ok) out.boundaries = b;
  }
  if (Number.isFinite(raw.deadband) && raw.deadband >= 0) out.deadband = raw.deadband;
  if (Number.isFinite(raw.quorum) && raw.quorum >= 1) out.quorum = raw.quorum;
  if (Number.isFinite(raw.min_interval_ms) && raw.min_interval_ms >= 0) out.min_interval_ms = raw.min_interval_ms;
  if (Number.isFinite(raw.lock_ms) && raw.lock_ms >= 0) out.lock_ms = raw.lock_ms;
  for (const key of ['dwell_up_seconds', 'dwell_down_seconds']) {
    const v = raw[key];
    if (Array.isArray(v) && v.length && v.every((n) => Number.isFinite(n) && n > 0)) out[key] = v.slice();
  }
  return out;
}

// ---------------------------------------------------------------------------
// The gate that held the level, in words
// ---------------------------------------------------------------------------

// engine.decideLevel() returns rule_fired naming the gate that BLOCKED a change
// or the change itself, and the collector writes it into state.json. It is the
// single most useful field on the page and nothing currently renders it: "why
// is it still ROUTINE when the score says ELEVATED" is the question every
// reader asks, and this is the engine answering it in its own words.
//
// Present tense throughout, describing the run that has already happened.
const RULE_NOTE = Object.freeze({
  none: 'the score sat inside the current band, so no stage change was proposed.',
  genesis: 'first scored observation. The stage was adopted from the band the score is in, with no prior level for the anti-flap machine to protect.',
  no_live_pillars: 'no pillar reported. The stage is held and nothing new is claimed.',
  frozen_dark_pillar: 'a pillar was dark, so the stage is frozen regardless of the score.',
  locked: 'the run fell inside the lock that follows any stage change.',
  min_interval: 'less than the minimum interval had passed since the last stage change.',
  deadband: 'the score crossed a band edge but not the deadband around it.',
  dwell: 'the score cleared the deadband; one of the two dwell windows did not.',
  quorum: 'every other gate cleared and too few pillars agreed with the direction.',
  insufficient_history: 'a dwell window held no observation, so its mean could not be computed.',
  escalate: 'every gate cleared and the index moved one stage hotter.',
  deescalate: 'every gate cleared and the index moved one stage cooler.',
});

// ---------------------------------------------------------------------------
// Derivation — one pure function of ctx, no clock reads
// ---------------------------------------------------------------------------

/**
 * Mean composite over the trailing `seconds`, matching engine.meanOverWindow().
 *
 * Definition copied deliberately, not approximated: backfilled rows excluded
 * (engine.mjs liveHistory), window inclusive at both ends, live scores only,
 * plain mean. The engine's own figure is preferred wherever a receipt recorded
 * one — see gateRows() — and this is what gets printed when it did not, clearly
 * labelled with its observation count so a one-observation mean reads as one
 * observation rather than as a trend.
 */
export function windowMean(history, asOfIso, seconds) {
  const nowMs = Date.parse(asOfIso);
  if (!Number.isFinite(nowMs) || !Number.isFinite(seconds)) return null;
  const cutoff = nowMs - seconds * 1000;
  const xs = [];
  for (const row of Array.isArray(history) ? history : []) {
    if (!row || row.backfilled === true) continue;
    const t = Date.parse(row.generated_at ?? row.t);
    if (!Number.isFinite(t) || t < cutoff || t > nowMs) continue;
    if (!Number.isFinite(row.score)) continue;
    xs.push(row.score);
  }
  if (xs.length === 0) return null;
  return { mean: xs.reduce((a, b) => a + b, 0) / xs.length, n: xs.length };
}

/** The observation immediately before this one, or null. Timestamp included,
 *  because "the pin moved" without a stamp is a claim the reader cannot check. */
function previousObservation(ctx) {
  const state = ctx.state;
  const rows = Array.isArray(ctx.history) ? ctx.history : [];
  const nowMs = Date.parse(state.generated_at);
  let best = null;
  for (const row of rows) {
    if (!row || row.backfilled === true) continue;
    const t = Date.parse(row.generated_at ?? row.t);
    if (!Number.isFinite(t) || !(t < nowMs) || !Number.isFinite(row.score)) continue;
    if (!best || t > best.t) best = { t, at: row.generated_at ?? row.t, score: row.score };
  }
  if (!best) return null;
  // The engine's own delta wins when it is published; the log supplies the
  // stamp either way. They agree in normal operation, and when they do not the
  // engine is the authority on its own arithmetic.
  const delta = Number.isFinite(state.delta_from_previous)
    ? state.delta_from_previous
    : state.score - best.score;
  return { at: best.at, score: state.score - delta, delta };
}

/**
 * Everything the rail and the gate cards render, as data.
 *
 * Exported so a harness can exercise the degenerate states without parsing
 * HTML, and so a future /methodology mirror of this table cannot drift from it.
 */
export function model(ctx) {
  const state = ctx && ctx.state;
  if (!state || !Number.isFinite(state.score) || !Number.isInteger(state.level)) {
    throw new Error('oven.model(): ctx.state needs a finite .score and an integer .level (CONTRACT.md data/state.json)');
  }
  const K = constantsFrom(ctx);
  const level = state.level;
  const score = state.score;

  const pillars = Array.isArray(state.pillars) ? state.pillars : [];
  // "Scored" is the engine's livePillarScores: not dark, not awaiting a frozen
  // baseline, carrying a finite number. A pillar awaiting a baseline is not a
  // dark pillar and is never counted as one (VOICE.md §4, the three states).
  const scored = pillars.filter((p) => p && p.dark !== true && p.uncalibrated !== true && Number.isFinite(p.score));
  const darkPillars = pillars.filter((p) => p && p.dark === true).map((p) => p.id);
  const uncalPillars = pillars.filter((p) => p && p.uncalibrated === true).map((p) => p.id);

  const heldSeconds = typeof state.level_since === 'string'
    ? Math.max(0, secondsBetween(state.generated_at, state.level_since))
    : null;
  const minIntervalSeconds = K.min_interval_ms / 1000;
  const lockSeconds = K.lock_ms / 1000;

  const stages = brand.LEVELS.map((l) => ({
    level: l.level,
    name: l.name,
    epithet: l.epithet,
    band: l.band,
    heat: (6 - l.level) * 20,            // 20 / 40 / 60 / 80 / 100, as a percent
    state: l.level === level ? 'live' : (l.level > level ? 'cooler' : 'hotter'),
    previous: Number.isInteger(state.previous_level)
      && state.previous_level !== level
      && state.previous_level === l.level,
  })).sort((a, b) => b.level - a.level);       // coolest first, left to right

  // Hotter = escalate one step. Threshold is the boundary out of THIS level,
  // plus the deadband. Absent at level 1, which is the top of the scale.
  const hotter = level > 1 ? {
    level: level - 1,
    threshold: K.boundaries[level] + K.deadband,
    windows: K.dwell_up_seconds,
    agreeing: null,
  } : null;
  if (hotter) hotter.agreeing = scored.filter((p) => p.score > hotter.threshold).length;

  // Cooler = de-escalate one step. Threshold is the boundary into the level
  // below, minus the deadband. Absent at level 5, the floor of the scale.
  const cooler = level < 5 ? {
    level: level + 1,
    threshold: K.boundaries[level + 1] - K.deadband,
    windows: K.dwell_down_seconds,
    agreeing: null,
  } : null;
  if (cooler) cooler.agreeing = scored.filter((p) => p.score < cooler.threshold).length;

  return {
    constants: K,
    level,
    score,
    meta: brand.levelMeta(level),
    stages,
    hotter,
    cooler,
    scoredCount: scored.length,
    pillarCount: pillars.length,
    darkPillars,
    uncalPillars,
    frozen: darkPillars.length > 0,
    heldSeconds,
    minIntervalSeconds,
    lockSeconds,
    levelSince: typeof state.level_since === 'string' ? state.level_since : null,
    previousLevel: Number.isInteger(state.previous_level) ? state.previous_level : null,
    previous: previousObservation(ctx),
    ruleFired: typeof state.rule_fired === 'string' ? state.rule_fired : null,
    observations: Array.isArray(ctx.history) ? ctx.history.filter((r) => r && r.backfilled !== true).length : 0,
  };
}

// ---------------------------------------------------------------------------
// The rail
// ---------------------------------------------------------------------------

// Name length drives the label size bucket. Measured, not guessed: five equal
// cells inside a 343px content column on a 375px phone leave ~62px of inner
// width per cell, and monospace advance is ~0.6em, so 13 characters need the
// label at or under 7.9px. The buckets below land at 7.5 / 8.6 / 9.8px there
// and scale up to 11px on a desktop column.
//
// The buckets are the FALLBACK. They size against the viewport, which is only
// the same thing as the cell when the rail is in the page's own 343px column —
// and the first time this component was dropped inside a container with its own
// padding, UNPRECEDENTED clipped to "UNPRECEDENT…". So the CSS also carries a
// container-query rule that sizes each label against its own cell, with --len
// as the character count; the buckets are what browsers without `cqw` get.
// Ellipsis stays as the last net, and a visible ellipsis is at least a truthful
// "there is more".
function nameBucket(name) {
  if (name.length <= 8) return 'a';
  if (name.length <= 11) return 'b';
  return 'c';
}

const POSITION_WORD = {
  live: 'current stage',
  cooler: 'cooler than the current stage',
  hotter: 'hotter than the current stage',
};

function stageCell(s, mdl) {
  const live = s.state === 'live';
  // The slot above every cell is the same height whether or not it carries a
  // marker, so the rail does not re-flow as the mark moves along it.
  let slot = '';
  if (live) {
    slot = `<b class="oven__nowv num">${esc(num(mdl.score, 1))}</b>` +
           `<span class="oven__nowk">NOW <span aria-hidden="true">▼</span></span>`;
  } else if (s.previous) {
    slot = `<span class="oven__wask">WAS <span aria-hidden="true">▽</span></span>`;
  }

  const vh = live
    ? `${POSITION_WORD.live}. Composite ${num(mdl.score, 1)} of 100.`
    : (s.previous ? `${POSITION_WORD[s.state]}. Previous stage.` : POSITION_WORD[s.state]);

  return `<li class="oven__st" data-state="${esc(s.state)}" data-prev="${s.previous ? 1 : 0}"` +
    `${live ? ' aria-current="true"' : ''} style="--heat:${s.heat}%;--k:${(s.heat / 100).toFixed(1)}">
      <span class="oven__slot">${slot}</span>
      <span class="oven__num num" aria-hidden="true">${esc(s.level)}</span>
      <span class="oven__name" data-len="${nameBucket(s.name)}" style="--len:${s.name.length}">${esc(s.name)}</span>
      <span class="oven__band num" aria-hidden="true">${esc(s.band[0])}–${esc(s.band[1])}</span>
      <span class="vh">${esc(brand.NAME)} ${esc(s.level)}, ${esc(s.name)}, band ${esc(s.band[0])} to ${esc(s.band[1])}. ${esc(vh)}</span>
    </li>`;
}

function rail(mdl) {
  const label = `The five ${brand.NAME} stages, coolest first. ` +
    `${brand.NAME} ${mdl.level}, ${mdl.meta.name}, is the current stage at ${num(mdl.score, 1)} of 100.`;
  return `<ol class="oven__rail" aria-label="${esc(label)}">${
    mdl.stages.map((s) => stageCell(s, mdl)).join('')}</ol>`;
}

// ---------------------------------------------------------------------------
// The pin track — the fine-grained position, and the evidence it moves both ways
// ---------------------------------------------------------------------------

/**
 * A continuous 0-100 track under the rail carrying two marks: where the
 * composite is now, and where it was at the previous observation.
 *
 * The ghost mark is the load-bearing part of this whole component. A rail alone
 * is a staircase, and a staircase only ever reads in one direction. Two marks a
 * tenth of a point apart, one of them behind the other, is the cheapest
 * possible proof that this thing is a thermostat and not a countdown — and on
 * most days the ghost is AHEAD of the pin, which is a fact no competitor in
 * this category ever puts on their front page.
 */
function pinTrack(mdl) {
  const at = Math.max(0, Math.min(100, mdl.score));
  const edges = brand.LEVELS.map((l) => l.band[0]).concat(100);
  const interior = edges.filter((e) => e > 0 && e < 100);

  const ghost = mdl.previous && Number.isFinite(mdl.previous.score)
    ? `<span class="oven__ghost" style="left:${Math.max(0, Math.min(100, mdl.previous.score)).toFixed(2)}%"></span>`
    : '';

  const marks = edges.map((e, i) => {
    const edge = i === 0 ? ' data-edge="first"' : i === edges.length - 1 ? ' data-edge="last"' : '';
    return `<span style="left:${e}%"${edge}>${e}</span>`;
  }).join('');

  const label = `Composite ${num(mdl.score, 1)} of 100, inside the ${mdl.meta.name} band, ` +
    `${mdl.meta.band[0]} to ${mdl.meta.band[1]}.` +
    (mdl.previous ? ` Previous observation ${num(mdl.previous.score, 1)}.` : '');

  return `<div class="oven__pinwrap">
      <div class="oven__pin" role="img" aria-label="${esc(label)}">
        <span class="oven__fill" style="width:${at.toFixed(2)}%"></span>
        ${interior.map((e) => `<span class="oven__edge" style="left:${e}%"></span>`).join('')}
        ${ghost}
        <span class="oven__now" style="left:${at.toFixed(2)}%"></span>
      </div>
      <div class="oven__ticks num" aria-hidden="true">${marks}</div>
      <p class="oven__hint">${pinHint(mdl)}</p>
    </div>`;
}

function pinHint(mdl) {
  const bits = [`Pin at <b class="num">${esc(num(mdl.score, 1))}</b>`];
  if (mdl.previous && Number.isFinite(mdl.previous.score)) {
    bits.push(
      `dashed mark is the previous observation, <b class="num">${esc(num(mdl.previous.score, 1))}</b> ` +
      `at ${esc(utc(mdl.previous.at))} <b class="num">${esc(signed(mdl.previous.delta, 1))}</b>`,
    );
  } else {
    bits.push('no earlier observation in the record, so nothing is drawn behind it');
  }
  return bits.join(' · ');
}

// ---------------------------------------------------------------------------
// The gate cards — "what would have to happen", as numbers
// ---------------------------------------------------------------------------

const MARK = { met: '●', unmet: '○', na: '◇' };
const MARK_WORD = { met: 'met', unmet: 'not met', na: 'not evaluated this run' };

function gateRow(label, requirement, detail, met) {
  return `<div class="oven__row" data-met="${esc(met)}">
      <dt><i class="oven__mk" aria-hidden="true">${MARK[met]}</i>${esc(label)}</dt>
      <dd><b class="oven__req num">${requirement}</b>
          <span class="oven__sub">${detail}<span class="vh"> — ${esc(MARK_WORD[met])}</span></span></dd>
    </div>`;
}

/**
 * The gate rows for one direction.
 *
 * Every figure here is measured or published: the threshold is the engine's own
 * boundary plus or minus its own deadband, the gap is arithmetic on the score
 * printed two inches above, the pillar count is a count of the pillars in
 * state.json, and the dwell means come from the receipt where the engine
 * recorded them and from the published history where it did not.
 *
 * What is NOT here: any statement that a gate is close, likely, or about to
 * clear. The rows print the requirement and the current reading side by side
 * and stop. A reader can subtract.
 */
function gateRows(mdl, dir) {
  const g = dir === 'hot' ? mdl.hotter : mdl.cooler;
  const K = mdl.constants;
  const rows = [];

  // 1. The instantaneous composite against the Schmitt deadband.
  const cleared = dir === 'hot' ? mdl.score > g.threshold : mdl.score < g.threshold;
  const gap = Math.abs(mdl.score - g.threshold);
  rows.push(gateRow(
    'Composite',
    `${dir === 'hot' ? 'above' : 'below'} ${esc(num(g.threshold, 1))}`,
    `now ${esc(num(mdl.score, 1))} · ${esc(num(gap, 1))} ${dir === 'hot' ? 'below' : 'above'} that mark`,
    cleared ? 'met' : 'unmet',
  ));

  // 2. Both dwell windows. Deliberately two rows, not one: the asymmetry
  //    between the pairs is the whole anti-flap story and collapsing them into
  //    "dwell" hides it.
  for (const secs of g.windows) {
    const m = windowMean(mdl.history, mdl.asOf, secs);
    const pass = m === null ? null : (dir === 'hot' ? m.mean > g.threshold : m.mean < g.threshold);
    rows.push(gateRow(
      `${windowLabel(secs)} mean`,
      `${dir === 'hot' ? 'above' : 'below'} ${esc(num(g.threshold, 1))}`,
      m === null
        ? 'no observation inside this window'
        : `${esc(num(m.mean, 1))} over ${esc(m.n)} observation${m.n === 1 ? '' : 's'}`,
      m === null ? 'na' : (pass ? 'met' : 'unmet'),
    ));
  }

  // 3. Breadth. The composite carries a 0.3*max term, so one pillar spiking can
  //    drag the index across a boundary alone; the quorum is the guard. The
  //    denominator is the pillars actually scored, not five, because a pillar
  //    awaiting a frozen baseline is not in the engine's vote either.
  rows.push(gateRow(
    'Pillars agreeing',
    `${esc(K.quorum)} of ${esc(mdl.scoredCount)} scored`,
    `${esc(g.agreeing)} ${dir === 'hot' ? 'above' : 'below'} ${esc(num(g.threshold, 1))}` +
      (mdl.scoredCount < mdl.pillarCount
        ? ` · ${esc(mdl.pillarCount - mdl.scoredCount)} of ${esc(mdl.pillarCount)} not scored`
        : ''),
    g.agreeing >= K.quorum ? 'met' : 'unmet',
  ));

  // 4. Time. Two gates in the engine (a 4h lock and a 6h minimum) and the
  //    minimum currently subsumes the lock, so one row states the binding one
  //    and names the other.
  const minS = mdl.minIntervalSeconds;
  if (mdl.heldSeconds === null) {
    rows.push(gateRow('Since last change', `${esc(duration(minS))} minimum`, 'no level_since stamp in state.json', 'na'));
  } else {
    const short = minS - mdl.heldSeconds;
    rows.push(gateRow(
      'Since last change',
      `${esc(duration(minS))} minimum`,
      short > 0
        ? `held ${esc(duration(mdl.heldSeconds))} · ${esc(duration(short))} short`
        : `held ${esc(duration(mdl.heldSeconds))}`,
      short > 0 ? 'unmet' : 'met',
    ));
  }

  // 5. The honesty rule, which outranks every gate above it.
  rows.push(gateRow(
    'Dark pillars',
    'none',
    mdl.darkPillars.length === 0
      ? `0 of ${esc(mdl.pillarCount)} dark`
      : `${esc(mdl.darkPillars.length)} dark · stage frozen`,
    mdl.darkPillars.length === 0 ? 'met' : 'unmet',
  ));

  return rows.join('');
}

function gateCard(mdl, dir) {
  const g = dir === 'hot' ? mdl.hotter : mdl.cooler;
  const kicker = dir === 'hot' ? 'One stage hotter' : 'One stage cooler';
  const glyph = dir === 'hot' ? '▲' : '▼';

  if (!g) {
    const endCopy = dir === 'hot'
      ? `${brand.NAME} 1 is the top of the scale. The frozen reference record holds nothing above this ` +
        'band, which is a statement about our own record running out rather than about anything else.'
      : `${brand.NAME} 5 is the floor of the scale. Zero is the bottom of the range every score on this ` +
        'site is measured against, and a quiet hour on the instruments is not the same thing as safety.';
    return `<article class="oven__gate" data-dir="${esc(dir)}" data-end="1">
        <h3 class="oven__gh"><span class="oven__gk"><i aria-hidden="true">${glyph}</i> ${esc(kicker)}</span>
          <span class="oven__gn">none — end of scale</span></h3>
        <p class="oven__gp">${esc(endCopy)}</p>
      </article>`;
  }

  const meta = brand.levelMeta(g.level);
  return `<article class="oven__gate" data-dir="${esc(dir)}">
      <h3 class="oven__gh"><span class="oven__gk"><i aria-hidden="true">${glyph}</i> ${esc(kicker)}</span>
        <span class="oven__gn">${esc(brand.NAME)} ${esc(g.level)} · ${esc(meta.name)}</span></h3>
      <dl class="oven__rows">${gateRows(mdl, dir)}</dl>
    </article>`;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

/**
 * @param {object} ctx  the build context (state, history, receipts, href)
 * @param {object} [opts]
 * @param {boolean} [opts.style=true]    emit the scoped <style> block
 * @param {boolean} [opts.heading=true]  emit the <h2>; false for an embed
 */
export function render(ctx, opts = {}) {
  const { style = true, heading = true } = opts;
  const mdl = model(ctx);
  // Carried on the model so gateRows() can reach the window inputs without a
  // second argument threaded through four call sites.
  mdl.history = Array.isArray(ctx.history) ? ctx.history : [];
  mdl.asOf = ctx.state.generated_at;

  const href = typeof ctx.href === 'function' ? ctx.href : (p) => p;

  const frozen = mdl.frozen
    ? `<p class="oven__frozen"><b>STAGE FROZEN</b> — ${esc(mdl.darkPillars.length)} pillar${
        mdl.darkPillars.length === 1 ? '' : 's'} dark (${esc(mdl.darkPillars.map((id) => brand.pillarMeta(id).name).join(', '))}).
       No stage change is computed while a pillar is dark. The composite is then taken over a different
       set of inputs than the previous run, so an apparent move may be an artifact of what died rather
       than of what happened.</p>`
    : '';

  // The previous-stage line. Three genuinely different states and none of them
  // is "unknown": a recorded previous level, a level held since the first
  // scored observation, and a state.json with no level_since at all.
  let heldLine;
  if (mdl.previousLevel !== null) {
    heldLine = `Previous stage <b>${esc(brand.NAME)} ${esc(mdl.previousLevel)} · ${
      esc(brand.levelMeta(mdl.previousLevel).name)}</b>, marked WAS on the rail. ` +
      `Current stage held ${mdl.heldSeconds === null ? 'since an unrecorded time' : `${esc(duration(mdl.heldSeconds))}, since ${esc(utc(mdl.levelSince))}`}.`;
  } else if (mdl.levelSince) {
    heldLine = `No stage change in the record. ${esc(brand.NAME)} ${esc(mdl.level)} has been the reading ` +
      `for ${esc(duration(mdl.heldSeconds ?? 0))}, since ${esc(utc(mdl.levelSince))}, across ` +
      `${esc(mdl.observations)} scored observation${mdl.observations === 1 ? '' : 's'}.`;
  } else {
    heldLine = `state.json carries no level_since stamp, so how long this stage has been held is not ` +
      `something this page can state.`;
  }

  // The criterion for the stage we are IN, which is the one number neither gate
  // card states: the hold interval is the printed band widened by the deadband
  // at each edge, and it is exactly the two thresholds the cards already carry.
  // One line, and it closes the loop between the band on the cell and the
  // thresholds underneath it.
  const lo = mdl.cooler ? mdl.cooler.threshold : null;
  const hi = mdl.hotter ? mdl.hotter.threshold : null;
  let critLine;
  if (lo !== null && hi !== null) {
    critLine = `This stage holds while the composite sits between <b>${esc(num(lo, 1))}</b> and ` +
      `<b>${esc(num(hi, 1))}</b> — the ${esc(mdl.meta.band[0])}–${esc(mdl.meta.band[1])} band widened by the ` +
      `±${esc(num(mdl.constants.deadband, 0))}-point deadband at each edge.`;
  } else if (hi !== null) {
    critLine = `This stage holds while the composite stays below <b>${esc(num(hi, 1))}</b> — the ` +
      `${esc(mdl.meta.band[0])}–${esc(mdl.meta.band[1])} band widened by the ±${esc(num(mdl.constants.deadband, 0))}-point ` +
      `deadband at the top. Zero is the bottom of the scale.`;
  } else {
    critLine = `This stage holds while the composite stays above <b>${esc(num(lo, 1))}</b> — the ` +
      `${esc(mdl.meta.band[0])}–${esc(mdl.meta.band[1])} band widened by the ±${esc(num(mdl.constants.deadband, 0))}-point ` +
      `deadband at the bottom. 100 is the top of the scale.`;
  }

  const ruleNote = mdl.ruleFired && RULE_NOTE[mdl.ruleFired]
    ? `<p class="oven__rule"><span class="oven__rulek">Last run</span> ${esc(RULE_NOTE[mdl.ruleFired])}
       <span class="oven__rulei">rule_fired: <code>${esc(mdl.ruleFired)}</code></span></p>`
    : '';

  const upLabels = (mdl.hotter ? mdl.hotter.windows : mdl.constants.dwell_up_seconds).map(windowLabel).join(' and ');
  const downLabels = (mdl.cooler ? mdl.cooler.windows : mdl.constants.dwell_down_seconds).map(windowLabel).join(' and ');

  const body = `
${heading ? `<div class="oven__hd">
  <h2 class="sec__h" id="oven-h">The oven</h2>
</div>` : ''}
<p class="oven__k">Observed position · the mark moves both ways · not a prediction</p>
<p class="lede">Five stages, coolest on the left, lit at the one the index is in as of
   <time datetime="${esc(ctx.state.generated_at)}">${esc(utc(ctx.state.generated_at))}</time>.
   Hotter means more is happening — not that anything is worse. The stages are the
   ${esc(brand.NAME)} levels themselves, not a second scale that could disagree with the first.</p>

${frozen}
${rail(mdl)}
${pinTrack(mdl)}

<p class="oven__crit">${critLine}</p>
<p class="oven__held">${heldLine}</p>

<h3 class="oven__gsh">What would move it</h3>
<p class="oven__gp oven__gp--intro">The published gates, as numbers. Each row is a requirement beside the
   current reading; nothing here says any of them is met. Heating is measured over ${esc(upLabels)};
   standing down over ${esc(downLabels)} — cooling is deliberately the slower move, so a stage this index
   raises is one it keeps for a while.</p>
<div class="oven__gates">
  ${gateCard(mdl, 'hot')}
  ${gateCard(mdl, 'cool')}
</div>
${ruleNote}

<p class="fresh__key">${esc(brand.DISCLAIMER_SHORT)} Thresholds read from receipt
   <code>${esc(mdl.constants.receipt_id || 'none')}</code>${mdl.constants.source === 'fallback'
     ? ' (unreadable — the published defaults are shown)' : ''}.
   <a href="${esc(href('/methodology.html'))}">How a stage is decided →</a></p>`;

  return `${style ? styleTag() : ''}<section class="sec oven" id="oven" data-frozen="${
    mdl.frozen ? 1 : 0}"${heading ? ' aria-labelledby="oven-h"' : ' aria-label="The oven"'}>${body}
</section>`;
}

// ---------------------------------------------------------------------------
// Scoped CSS
// ---------------------------------------------------------------------------

/**
 * Shipped with the module, the way _labs.mjs, _xwire.mjs and newsPage.mjs do,
 * so site/styles.mjs stays owned by one author.
 *
 * Every colour is a token from styles.mjs, so the component renders correctly in
 * both themes with no second palette to keep in sync. Nothing here is carried by
 * colour alone: the live stage is marked by a 2px inset ring, a filled element
 * bar, a caret, the word NOW, the score printed on it, aria-current and a
 * visually-hidden sentence. A greyscale screenshot still reads.
 */
export function styleTag() {
  return `<style>
.oven__hd{display:flex;flex-wrap:wrap;align-items:baseline;gap:0 var(--s-3);justify-content:space-between}
.oven__k{font-family:var(--mono);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint);margin:0 0 var(--s-2)}

/* --- the rail ---------------------------------------------------------- */
.oven__rail{list-style:none;margin:var(--s-3) 0 0;padding:0;
  display:grid;grid-template-columns:repeat(5,1fr);gap:3px}
.oven__st{position:relative;display:flex;flex-direction:column;align-items:center;gap:1px;
  min-width:0;padding:0 2px 14px;text-align:center;overflow:hidden;
  border:1px solid var(--rule-soft);border-radius:var(--radius);
  /* Ambient heat as fill HEIGHT, 20% per stage. Depth only — the tint is 4% and
     the burner below is what actually carries the ramp. */
  background:linear-gradient(to top,var(--wash) 0 var(--heat),transparent var(--heat))}
/* THE BURNER. A track at the foot of every cell with a fill 20% longer per
   stage, so the five cells read as a staircase in one glance and in greyscale.
   It lives in the cell's own bottom padding, below the text: an earlier version
   drew the heat line at the fill height and it struck through the band label at
   the low stages, which looked like a defect and not like an oven. */
.oven__st::before{content:'';position:absolute;left:5px;right:5px;bottom:5px;height:3px;
  border-radius:2px;background:var(--wash)}
.oven__st::after{content:'';position:absolute;left:5px;bottom:5px;height:3px;border-radius:2px;
  width:calc((100% - 10px) * var(--k));background:var(--ink-faint)}
.oven__slot{display:flex;flex-direction:column;justify-content:flex-end;align-items:center;
  gap:0;height:32px;width:100%;padding-top:3px}
.oven__nowv{font-family:var(--mono);font-size:13px;line-height:1.1;color:var(--accent);
  font-variant-numeric:tabular-nums}
.oven__nowk{font-family:var(--mono);font-size:8.5px;letter-spacing:.14em;color:var(--accent);line-height:1.3}
.oven__wask{font-family:var(--mono);font-size:8.5px;letter-spacing:.14em;color:var(--ink-faint);line-height:1.3}
.oven__num{font-family:var(--mono);font-size:19px;line-height:1.15;color:var(--ink-dim);
  font-variant-numeric:tabular-nums}
.oven__name{font-family:var(--mono);text-transform:uppercase;color:var(--ink-dim);
  max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* Measured buckets: 13 characters must clear ~62px of inner cell at 375px.
   Viewport-relative, so they are only right when the rail sits in the page's
   own column — the @supports block below sizes against the cell instead. */
.oven__name[data-len="a"]{font-size:clamp(8.5px,2.6vw,11px)}
.oven__name[data-len="b"]{font-size:clamp(7.6px,2.3vw,11px)}
.oven__name[data-len="c"]{font-size:clamp(6.9px,2.0vw,11px);letter-spacing:-.01em}
/* --len is the character count; 0.63em is the monospace advance with the
   stack's fallbacks. The label is then exactly as large as its own cell allows,
   in any container, at any width, with no measurement done in JavaScript. */
@supports (container-type:inline-size){
  .oven__st{container-type:inline-size}
  .oven__name[data-len]{font-size:clamp(6.4px,calc(100cqw / (var(--len,8) * 0.63)),11px)}
}
.oven__band{font-size:9px;color:var(--ink-faint);font-variant-numeric:tabular-nums;font-family:var(--mono)}

.oven__st[data-state="live"]{background:linear-gradient(to top,var(--wash-live) 0 var(--heat),transparent var(--heat));
  box-shadow:inset 0 0 0 2px var(--accent)}
.oven__st[data-state="live"] .oven__num{color:var(--ink);font-weight:700}
.oven__st[data-state="live"] .oven__name{color:var(--ink)}
.oven__st[data-state="live"] .oven__band{color:var(--ink-dim)}
/* The lit burner. The only thing in the component that ever animates. */
.oven__st[data-state="live"]::after{background:var(--accent)}
.oven__st[data-prev="1"]{border-style:dashed;border-color:var(--rule)}

/* --- the pin track ----------------------------------------------------- */
.oven__pinwrap{margin-top:18px}
.oven__pin{position:relative;height:10px;border:1px solid var(--rule-soft);border-radius:2px;
  background:var(--wash-alt)}
.oven__fill{position:absolute;left:0;top:0;bottom:0;background:var(--fill)}
.oven__edge{position:absolute;top:-3px;bottom:-3px;width:1px;background:var(--rule)}
/* Previous observation: dashed, thinner, behind. Shape, not colour, is what
   separates it from the live pin — they are often a tenth of a point apart. */
.oven__ghost{position:absolute;top:-5px;bottom:-5px;width:0;border-left:1px dashed var(--ink-dim)}
.oven__now{position:absolute;top:-8px;bottom:-5px;width:2px;margin-left:-1px;background:var(--accent)}
.oven__now::before{content:'';position:absolute;top:-5px;left:-3px;
  border-left:4px solid transparent;border-right:4px solid transparent;border-top:5px solid var(--accent)}
.oven__ticks{position:relative;height:14px;margin-top:4px;font-family:var(--mono);font-size:9.5px;
  color:var(--ink-faint);font-variant-numeric:tabular-nums}
.oven__ticks span{position:absolute;transform:translateX(-50%)}
.oven__ticks span[data-edge="first"]{transform:none}
.oven__ticks span[data-edge="last"]{transform:translateX(-100%)}
.oven__hint{font-family:var(--mono);font-size:10.5px;line-height:1.5;color:var(--ink-faint);margin:7px 0 0}
.oven__hint b{color:var(--ink-dim);font-weight:400}

.oven__crit,.oven__held{font-size:var(--t-sm);color:var(--ink-dim);margin:var(--s-2) 0 0;max-width:var(--measure)}
.oven__crit b,.oven__held b{color:var(--ink);font-weight:500;font-variant-numeric:tabular-nums}
.oven__crit{padding-left:9px;border-left:2px solid var(--rule)}
.oven__frozen{font-family:var(--mono);font-size:11px;line-height:1.55;color:var(--ink-dim);
  margin:var(--s-2) 0 0;padding:9px 11px;border:1px dashed var(--rule);border-radius:var(--radius);
  background:var(--bg-raised)}
.oven__frozen b{color:var(--ink);letter-spacing:.1em}

/* --- the gate cards ---------------------------------------------------- */
.oven__gsh{font-family:var(--mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;
  color:var(--ink-faint);margin:var(--sec) 0 var(--s-2);font-weight:400}
.oven__gp{font-size:var(--t-sm);line-height:1.55;color:var(--ink-dim);margin:0;max-width:var(--measure)}
.oven__gp--intro{margin-bottom:var(--s-3)}
.oven__gates{display:grid;gap:9px;grid-template-columns:1fr}
@media(min-width:620px){.oven__gates{grid-template-columns:1fr 1fr}}
.oven__gate{padding:11px 12px;border:1px solid var(--rule);border-radius:var(--radius);
  background:var(--bg-raised);border-left:3px solid var(--ink-faint)}
.oven__gate[data-dir="hot"]{border-left-color:var(--accent)}
.oven__gate[data-end="1"]{border-left-style:dashed}
.oven__gh{display:flex;flex-direction:column;gap:2px;margin:0 0 9px;font-weight:400}
.oven__gk{font-family:var(--mono);font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-faint)}
.oven__gn{font-family:var(--mono);font-size:var(--t-sm);letter-spacing:.02em;color:var(--ink)}
.oven__rows{margin:0;padding:0;display:grid;gap:7px}
.oven__row{margin:0}
.oven__row dt{font-family:var(--mono);font-size:9.5px;letter-spacing:.11em;text-transform:uppercase;
  color:var(--ink-faint);display:flex;align-items:baseline;gap:5px}
.oven__row dd{margin:0 0 0 15px;display:flex;flex-wrap:wrap;align-items:baseline;gap:0 7px}
.oven__mk{font-style:normal;font-size:8px;line-height:1;color:var(--ink-faint);flex:none}
.oven__row[data-met="met"] .oven__mk{color:var(--ok)}
.oven__req{font-family:var(--mono);font-size:var(--t-sm);font-weight:400;color:var(--ink);
  font-variant-numeric:tabular-nums}
.oven__sub{font-family:var(--mono);font-size:10px;color:var(--ink-faint);font-variant-numeric:tabular-nums}
.oven__rule{font-family:var(--mono);font-size:10.5px;line-height:1.6;color:var(--ink-faint);
  margin:var(--s-3) 0 0;max-width:var(--measure)}
.oven__rulek{color:var(--ink-dim);letter-spacing:.12em;text-transform:uppercase;font-size:9.5px}
.oven__rulei{color:var(--ink-faint)}
.oven__rulei code{font-size:10px}

/* --- motion ------------------------------------------------------------ */
/* The only animation in the component, and it passes MOTION.md's test: the
   real event it represents is "this index is live and unfrozen". It stops dead
   when a pillar is dark, because that stillness is the honest signal — the
   opposite of pizzint pulsing a confident level over a dead scraper. opacity
   only, so nothing reflows. */
@media(prefers-reduced-motion:no-preference){
  .oven:not([data-frozen="1"]) .oven__st[data-state="live"]::after{
    animation:ovenBreathe 3.2s ease-in-out infinite;will-change:opacity}
}
@keyframes ovenBreathe{0%,100%{opacity:1}50%{opacity:.55}}
</style>`;
}

// ---------------------------------------------------------------------------
// Module-load invariants
// ---------------------------------------------------------------------------

// The stage table on this page is brand.LEVELS and the thresholds are the
// engine's boundaries. Those two agree today by construction — BOUNDARY[L] is
// the floor of the band above L — and if a hand-edit to a band edge ever breaks
// that, the rail would draw its caret on one scale while the gate cards printed
// thresholds from another. That is a second parallel scale arriving by
// accident, which is precisely what this component was built not to have. Fail
// at import instead.
(function assertOvenIntegrity() {
  for (const lvl of [2, 3, 4, 5]) {
    const below = brand.levelMeta(lvl);
    const above = brand.levelMeta(lvl - 1);
    const derived = below.band[1] + 1;
    if (derived !== above.band[0]) {
      throw new Error(`_oven: brand bands do not tile at level ${lvl} (${below.band[1]} -> ${above.band[0]})`);
    }
    if (derived !== FALLBACK_CONSTANTS.boundaries[lvl]) {
      throw new Error(
        `_oven: brand.LEVELS puts the ${lvl}/${lvl - 1} boundary at ${derived}, ` +
        `collector/engine.mjs BOUNDARY puts it at ${FALLBACK_CONSTANTS.boundaries[lvl]}. ` +
        'The rail and the gate thresholds would be drawn on two different scales.',
      );
    }
  }
})();
