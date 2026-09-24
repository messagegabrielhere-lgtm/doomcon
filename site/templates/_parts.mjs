// Shared render fragments. Every one of these is a pure function of its
// arguments - no clock reads, no randomness - so two builds from the same
// data/ produce byte-identical HTML (CONTRACT.md hard constraint 4).

import { esc, num, signed, utc, duration, secondsBetween } from './_html.mjs';
import { sparkline, PILLAR_GLYPH } from './_charts.mjs';
import * as brand from '../brand.mjs';

/**
 * Five cells, filled count = 6 - level, so DOOMCON 1 is five filled and
 * DOOMCON 5 is one. The level has to survive greyscale: shape carries the
 * signal and the accent only confirms it. aria-hidden because the adjacent
 * text already says "DOOMCON 3 - ELEVATED"; a screen reader does not need the
 * decoration read out twice.
 */
export function levelBars(level, cls = 'bars') {
  const filled = 6 - level;
  const cells = [1, 2, 3, 4, 5]
    .map((i) => `<span data-on="${i <= filled ? 1 : 0}"></span>`)
    .join('');
  return `<div class="${esc(cls)}" aria-hidden="true">${cells}</div>`;
}

/**
 * The 0-100 scale with the live band marked and a caret at the actual score.
 *
 * Cells are sized by the DISTANCE BETWEEN band floors (0,35,55,70,85,100), not
 * by band width, which is the only way the track is linear in score - and a
 * track that is not linear in score puts the tick labels in the wrong place,
 * so a 61.9 appears to sit on the 70 mark. Cost me a screenshot to notice.
 *
 * NOT USED BY THE DASHBOARD ANY MORE. index.mjs now draws the same fact with
 * _charts.gauge(), which says everything this strip says plus the band name,
 * the band range and a tick at every boundary. Shipping both was two
 * instruments answering one question in the same 375px column. Kept exported
 * because it is the compact form, and a page with no room for a 192px dial
 * (a move page, the widget) should reach for this rather than reinvent it.
 */
export function scaleTrack(level, score) {
  const edges = brand.LEVELS.map((l) => l.band[0]).concat(100);

  const cells = brand.LEVELS.map((l, i) => {
    const width = edges[i + 1] - edges[i];
    return `<i style="width:${width}%" data-live="${l.level === level ? 1 : 0}"></i>`;
  }).join('');

  const marks = edges.map((e, i) => {
    const edge = i === 0 ? ' data-edge="first"' : i === edges.length - 1 ? ' data-edge="last"' : '';
    return `<span style="left:${e}%"${edge}>${e}</span>`;
  }).join('');

  const at = Math.max(0, Math.min(100, score));
  const meta = brand.levelMeta(level);

  return `<div class="scale">
      <div class="scale__track" role="img"
           aria-label="Score ${num(score, 1)} of 100, in the ${esc(meta.name)} band (${meta.band[0]} to ${meta.band[1]}).">
        ${cells}
        <span class="scale__you" style="left:${at.toFixed(2)}%"></span>
      </div>
      <div class="scale__marks" aria-hidden="true">${marks}</div>
    </div>`;
}

// Freshness thresholds, in seconds, measured against the build stamp. Two hours
// is generous for an hourly collector and deliberately so: we would rather flag
// stale late than cry wolf on a single skipped run.
const FRESH_LIMIT = 2 * 3600;
const STALE_LIMIT = 6 * 3600;

export function sourceStatus(source, asOfIso) {
  if (!source || typeof source.id !== 'string') {
    throw new Error(`sourceStatus(): malformed source entry ${JSON.stringify(source)}`);
  }
  // Uncalibrated outranks dark: the source answered, we just have no frozen
  // history to score it against. Reporting it as dark would claim an outage
  // that is not happening - the same category error as pizzint printing a
  // confident number over a dead scraper, pointed the other way.
  if (source.uncalibrated) return { status: 'uncal', age: null };
  if (!source.ok) return { status: 'dark', age: null };

  // Prefer age computed at build time from last_ok: age_seconds was measured
  // when the collector ran, and the site may be rebuilt much later.
  let age = null;
  if (typeof source.last_ok === 'string') age = secondsBetween(asOfIso, source.last_ok);
  else if (Number.isFinite(source.age_seconds)) age = source.age_seconds;
  else throw new Error(`sourceStatus(): source ${source.id} is ok but carries neither last_ok nor age_seconds`);

  if (age < 0) age = 0; // clock skew between collector and builder, not an error
  if (age <= FRESH_LIMIT) return { status: 'ok', age };
  if (age <= STALE_LIMIT) return { status: 'stale', age };
  return { status: 'stale', age };
}

const DOT = { ok: '●', stale: '◐', dark: '○', uncal: '◇' };
const WORD = { ok: 'live', stale: 'stale', dark: 'dark', uncal: 'no baseline' };

export function freshnessStrip(sources, asOfIso) {
  if (!Array.isArray(sources) || sources.length === 0) {
    return `<p class="fresh__key">No source health reported in state.json.</p>`;
  }
  const chips = sources.map((s) => {
    const { status, age } = sourceStatus(s, asOfIso);
    // The status WORD is printed only for the exceptions. Thirteen chips all
    // saying "live" is noise that pushes the age out of a phone-width chip,
    // and the summary line below already states the healthy case. Anything not
    // healthy gets three independent signals: glyph shape, the word, and a
    // dashed border - never colour alone.
    const detail = status === 'ok'
      ? duration(age)
      : `${WORD[status]} · ${age === null ? 'no read' : duration(age)}`;
    return `<li class="chip" data-status="${status}">` +
      `<span class="chip__dot" aria-hidden="true">${DOT[status]}</span>` +
      `<b>${esc(s.id)}</b>` +
      `<span class="chip__age">${esc(detail)}</span>` +
      `<span class="vh">${esc(WORD[status])}</span></li>`;
  }).join('');

  const uncal = sources.filter((s) => s.uncalibrated).length;
  const dark = sources.filter((s) => !s.ok && !s.uncalibrated).length;
  const stale = sources.filter((s) => s.ok && sourceStatus(s, asOfIso).status === 'stale').length;
  const bits = [];
  if (dark) bits.push(`${dark} dark`);
  if (stale) bits.push(`${stale} stale`);
  if (uncal) bits.push(`${uncal} awaiting baseline`);
  const key = bits.length === 0
    ? `All ${sources.length} sources answered. Ages are as of the build stamp above.`
    : `${bits.join(', ')}, of ${sources.length} sources. ` +
      `Dark sources are excluded, never imputed. Sources awaiting a baseline are collected and published but not yet scored.`;

  return `<ul class="fresh__strip">${chips}</ul><p class="fresh__key">${esc(key)}</p>`;
}

/**
 * Count a pillar's sources by state, from the rows state.json publishes.
 *
 * The pillar record itself only carries sources_ok / sources_total, and on the
 * live data "1/4" is true but misleading: three of capability's four sources
 * are collecting fine and simply have no frozen reference entry yet. Printing
 * "1/4 SOURCES" invites the reader to conclude three are down. So the card
 * counts the three states separately off the source rows when it is given
 * them, and falls back to the pillar's own two numbers when it is not.
 */
function countSources(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  let live = 0; let uncal = 0; let dark = 0;
  for (const s of rows) {
    if (s && s.uncalibrated) uncal += 1;
    else if (s && s.ok) live += 1;
    else dark += 1;
  }
  return { live, uncal, dark, total: rows.length };
}

/**
 * One pillar, with its own sparkline.
 *
 * Three states, kept distinct at every level of the card - the score, the body
 * and the data attribute:
 *
 *   live          a number and a sparkline
 *   uncalibrated  AWAITING BASELINE. Sources answered; there is no frozen
 *                 reference to score them against yet.
 *   dark          DARK. Nothing answered.
 *
 * Collapsing the middle one into DARK would claim an outage that is not
 * happening, which is the same category error as pizzint printing a confident
 * DOUGHCON 5 over a scraper managing two successful runs a day - just pointed
 * the other way.
 *
 * @param {object} pillar   a row from state.pillars
 * @param {Array<number>} series  oldest-first pillar scores; may be empty
 * @param {Array<object>} [sourceRows]  state.sources filtered to this pillar
 */
export function pillarCard(pillar, series, sourceRows) {
  const meta = brand.pillarMeta(pillar.id);
  const dark = pillar.dark === true;
  const uncal = pillar.uncalibrated === true;
  const noScore = dark || uncal;
  const scoreTxt = noScore ? '—' : num(pillar.score, 1);
  const glyph = PILLAR_GLYPH[pillar.id] || '▪';
  const counts = countSources(sourceRows);

  const body = noScore
    ? (uncal
        ? `<p class="pillar__dark">AWAITING BASELINE · ${esc(counts ? counts.total : (pillar.sources_total ?? '?'))} sources collecting, not yet scored</p>`
        : `<p class="pillar__dark">DARK · 0 of ${esc(counts ? counts.total : (pillar.sources_total ?? '?'))} sources answered</p>`)
    : `${sparkline(series, { id: pillar.id, label: `${meta.name} score history` })}
       <p class="pillar__foot">${esc(footLine(pillar, counts))}</p>`;

  return `<article class="pillar" data-dark="${noScore ? 1 : 0}" data-uncalibrated="${uncal ? 1 : 0}">
      <div class="pillar__top">
        <h3 class="pillar__name"><span aria-hidden="true">${glyph}</span> ${esc(meta.name)}</h3>
        <span class="pillar__score num">${esc(scoreTxt)}</span>
      </div>
      <p class="pillar__blurb">${esc(meta.blurb)}</p>
      ${body}
    </article>`;
}

function footLine(pillar, counts) {
  const bits = [];
  if (counts) {
    bits.push(`${counts.live}/${counts.total} SCORED`);
    if (counts.uncal) bits.push(`${counts.uncal} AWAITING BASELINE`);
    if (counts.dark) bits.push(`${counts.dark} DARK`);
  } else {
    bits.push(`${pillar.sources_ok}/${pillar.sources_total} SOURCES`);
  }
  // The percentile is the differentiator in miniature: not a judgement, a
  // position in the frozen reference record. It is printed wherever it exists.
  if (Number.isFinite(pillar.percentile)) {
    bits.push(`${(pillar.percentile * 100).toFixed(0)}TH PCTL`);
  }
  return bits.join(' · ');
}

export function moveRow(move, href) {
  const what = move.level_changed
    ? `${brand.NAME} ${move.previous_level} → ${brand.NAME} ${move.level} · ${brand.levelMeta(move.level).name}`
    : `Score ${num(move.previous_score, 1)} → ${num(move.score, 1)}`;
  const tag = move.level_changed ? '<span class="move__tag">level change</span>' : '';
  return `<li class="move"><a class="move__a" href="${esc(href)}">
      <time class="move__time" datetime="${esc(move.generated_at)}">${esc(utc(move.generated_at))}</time>
      <span class="move__what">${esc(what)}${tag}</span>
      <span class="move__delta num">${esc(signed(move.delta, 1))}</span>
    </a></li>`;
}

export function degradedBanner(state) {
  if (!state.degraded) return '';
  const dark = Array.isArray(state.dark_pillars) ? state.dark_pillars : [];
  const which = dark.length
    ? `${dark.map((id) => brand.pillarMeta(id).name).join(', ')} ${dark.length === 1 ? 'is' : 'are'} dark.`
    : 'One or more inputs are not reporting.';
  return `<div class="degraded"><div class="wrap degraded__in">
      <span class="degraded__mark">DEGRADED</span>
      <p class="degraded__txt"><strong>${esc(which)}</strong> The score below is computed from live pillars only.
      Dark pillars are excluded, never imputed and never counted as zero, and the level is frozen until they report.</p>
    </div></div>`;
}
