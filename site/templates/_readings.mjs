// THE RECENT READINGS STRIP — the last eight observations, each drawn as the
// hero dial at a third the size, oldest left and newest right, under the
// headline.
//
// WHY THIS EXISTS. The Bulletin's Doomsday Clock page carries one thing that
// makes a reader come back: "Recent Clock changes", six dated readings in a
// row. It shows that the number MOVES. Measured on our built homepage before
// this file, data/history.ndjson held 45 scored observations and the fold
// showed none of them — one dial, one score, one delta. A reader could not see
// that there was a record, let alone read it.
//
// WHAT IT IS. One <section> holding an <ol> of the newest N observations from
// ctx.history (N = 8 by default), every one drawn as the SAME instrument
// site/templates/_gauge.mjs draws in the hero — the 270-degree sweep from 135
// to 405 degrees, the five band arcs on the --heat-* ramp derived from
// brand.LEVELS band FLOORS, the live band thicker and at full opacity, the
// radial bar-and-dot mark over a knock-out halo, dashed and hollow when the
// observation is degraded — at 96 units wide instead of 320. Under each dial,
// as real HTML text: the level name, the composite score, and the exact UTC
// stamp, which links to that observation's receipt page when build.mjs put a
// matching move on ctx.moves. The strip closes with a link to /history.html.
//
// WHAT IT REFUSES TO DO.
//
//   1. It never invents a reading. Fewer than READINGS.MIN observations and it
//      prints "N observations so far" instead of a strip: two dials are not a
//      trend and one dial is the hero repeated.
//   2. It never imputes. A row with no finite score draws the five bands in
//      --rule with no mark and prints "—" for the score. A row whose level is
//      not an integer 1–5 prints "—" in the dial and NO LEVEL under it, rather
//      than the band the score happens to fall in — the level is the engine's
//      decision (Schmitt deadband, frozen-dark-pillar hold) and this module
//      does not get to make it. That is one deliberate departure from
//      _gauge.mjs, which falls back to the score's band for its centre digit.
//   3. A degraded observation gets the gauge's dashed hollow mark, AND a
//      dashed plate border, AND the word DEGRADED printed under it. Three
//      carriers, none of them a hue.
//   4. Nothing here needs JavaScript. Every dial, name, score and stamp is in
//      the served HTML, and the strip scrolls with CSS overflow.
//
// WHAT IS NOT DRAWN AT THIS SIZE, and where it went. At 96 units the boundary
// numerals (0 35 55 70 85 100), the five level numerals inside the ring, the
// CALM / SEVERE end words and the three-line readout would all be under 7px,
// which is below the floor site/styles.mjs holds every other label above. They
// are not shrunk; they are stated ONCE, in the key sentence under the strip,
// which also names the two things that survive the reduction — the thick band
// is the level, the bar is the score — and the direction of the sweep.
//
// TIME ORDER, AND THE ONE PIECE OF CSS THAT NEEDS EXPLAINING. The eye should
// read the movement left to right, so the oldest dial is at the left and the
// newest at the right. On a 375px phone only four of eight fit, and a strip
// that opened on the oldest four would show a reader the four readings that
// matter least. So the <ol> is emitted NEWEST FIRST and carries `reversed`,
// and the list is a `direction: rtl` flex container: the first item lands at
// the right edge, the rest run leftwards, overflow is on the left where a
// right-to-left scroll container can reach it, and the initial scroll position
// is the right end — the newest four. The cells themselves are `direction:
// ltr` so their text is untouched, and an auto right margin on the first cell
// packs the row against the LEFT edge whenever it fits, so on a desktop the
// strip lines up with everything else on the page. See the CSS.
//
// DETERMINISM. Pure. No clock read, no Math.random, no module state, no
// iteration over object keys in a render path. Rows are sorted on
// (timestamp ms, timestamp string), every coordinate goes through n2() at two
// decimals with negative zero normalised, and the SVGs carry no ids at all
// (they are aria-hidden; the HTML beside them carries every fact). Two builds
// from one history.ndjson produce byte-identical markup.
//
// MOTION. None. Eight dials that lift their live band in sequence would be a
// carousel, and MOTION.md rule 0 plus the gauge's own history of screenshot
// frames with no needle on them are reason enough to ship this static.

import { esc, num, utc } from './_html.mjs';
import * as brand from '../brand.mjs';

export const READINGS = Object.freeze({
  // How many observations the strip shows. Eight is the Bulletin's six plus
  // room for a level change to have a before and an after inside the window.
  MAX: 8,
  // Below this the strip is a sentence, not a strip.
  MIN: 3,
  // The smallest move this dial will DRAW a previous-reading ring for. The hero
  // dial uses 1 point at r=112, "about 6px of arc, roughly the width of the
  // mark". At r=36 one point is 1.7px, so the same test lands at 3 points.
  // Below that the ring is entirely underneath the live dot and drawing it
  // would be a smudge claiming to be a movement.
  GHOST_MIN: 3,
});

// ---------------------------------------------------------------------------
// The scale — identical derivation to _gauge.mjs and _charts.mjs.
// ---------------------------------------------------------------------------

// Band FLOORS plus the ceiling: 0, 35, 55, 70, 85, 100. Floors, never widths,
// so a score of 41.4 lands at 41.4% of the sweep and not somewhere near it.
const EDGES = brand.LEVELS.map((l) => l.band[0]).concat(100);

const BANDS = brand.LEVELS.map((l, i) => ({
  level: l.level,
  name: l.name,
  lo: EDGES[i],
  hi: EDGES[i + 1],
  label: `${l.band[0]}–${l.band[1]}`,
}));

// The sweep. 135deg (lower left) clockwise through the top to 405deg (lower
// right). Same constants as _gauge.mjs; a strip of dials drawn on a different
// sweep from the dial above them would be a second instrument.
const START = 135;
const SWEEP = 270;

// ---------------------------------------------------------------------------
// Geometry. ONE set, drawn at 96 units and never upscaled past 96px; on a
// phone it shrinks to ~76px, which keeps the 26-unit centre numeral at ~20px.
// ---------------------------------------------------------------------------
//
// Checked against the viewBox at module load (see the invariants at the foot
// of the file): the live band's outer edge clears the top, the mark and its
// halo at the two ends of the sweep clear the bottom and the sides.
const G = Object.freeze({
  w: 96, h: 80, cx: 48, cy: 43,
  r: 36, sw: 7, liveSw: 10,
  // Degrees trimmed from each end of every band so five bands are COUNTABLE
  // without reference to colour. The gauge trims 1.7deg at r=112; at r=36 that
  // is one pixel, so it is opened to 2.5deg.
  gapDeg: 2.5,
  markPad: 3, haloSw: 5, dotR: 2.6, ghostR: 2.8,
  digitFs: 26, digitY: 52,
});

// ---------------------------------------------------------------------------
// Primitives — the gauge's, at this radius.
// ---------------------------------------------------------------------------

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// Two decimals, and negative zero normalised. -0 formats as "-0.00" for any
// input in (-0.005, 0), which is a byte that wobbles for no reason.
function n2(v) {
  const s = Number(v).toFixed(2);
  return s === '-0.00' ? '0.00' : s;
}

function bandFor(score) {
  if (!Number.isFinite(score)) return null;
  const s = clamp(score, 0, 100);
  return BANDS.find((b) => s >= b.lo && s < b.hi) || BANDS[BANDS.length - 1];
}

const degOf = (v) => START + (clamp(v, 0, 100) / 100) * SWEEP;
const radOf = (v) => (degOf(v) * Math.PI) / 180;
const px = (v, r) => G.cx + r * Math.cos(radOf(v));
const py = (v, r) => G.cy + r * Math.sin(radOf(v));

function arcPath(lo, hi, r) {
  // A band can never exceed 35 points (94.5deg), so the large-arc flag never
  // fires here; kept for parity with the gauge's arcPath.
  const large = ((hi - lo) / 100) * SWEEP > 180 ? 1 : 0;
  const sweep = hi >= lo ? 1 : 0;
  return `M${n2(px(lo, r))},${n2(py(lo, r))} ` +
    `A${n2(r)},${n2(r)} 0 ${large} ${sweep} ${n2(px(hi, r))},${n2(py(hi, r))}`;
}

function radialLine(cls, v, r0, r1) {
  return `<line class="${cls}" x1="${n2(px(v, r0))}" y1="${n2(py(v, r0))}" ` +
    `x2="${n2(px(v, r1))}" y2="${n2(py(v, r1))}"/>`;
}

function dotAt(cls, v, r, radius) {
  return `<circle class="${cls}" cx="${n2(px(v, r))}" cy="${n2(py(v, r))}" r="${n2(radius)}"/>`;
}

function textAt(cls, x, y, size, content) {
  return `<text class="${cls}" x="${n2(x)}" y="${n2(y)}" text-anchor="middle" ` +
    `font-size="${size}">${esc(content)}</text>`;
}

// brand.levelMeta throws on an unknown level, which is right at import time and
// wrong in the fold: a bad level in one history row should degrade one cell,
// not take the homepage down.
function safeLevelMeta(level) {
  try {
    return brand.levelMeta(level);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// The model. One place decides what is true about each observation.
// ---------------------------------------------------------------------------

function boundedMax(v) {
  const n = Number.isInteger(v) ? v : READINGS.MAX;
  return clamp(n, 1, 16);
}

/**
 * Read ctx.history into the strip's own shape.
 *
 * @param {object} ctx   build context; reads ctx.history (build.mjs's parsed
 *                       data/history.ndjson, each row carrying generated_at or
 *                       t, score, level, degraded, rule_fired), ctx.moves (for
 *                       the receipt links) and ctx.href.
 * @param {object} [opts]
 * @param {number} [opts.max]  how many observations to show, 1–16. Default 8.
 * @returns {object|null} null when ctx.history is not an array — the feature is
 *                        not wired, which is a different state from "wired and
 *                        empty" and renders differently ('' versus a note).
 */
export function model(ctx, opts = {}) {
  if (!ctx || !Array.isArray(ctx.history)) return null;
  const max = boundedMax(opts.max);

  // build.mjs already refuses a history row without an ISO stamp, so `dropped`
  // is zero on every real build. It exists so that a row this module cannot
  // place in time is COUNTED in the key rather than vanishing — silently
  // dropping observations is how a chart starts lying.
  let dropped = 0;
  const rows = [];
  for (const row of ctx.history) {
    const at = row ? (row.generated_at ?? row.t) : undefined;
    const ms = Date.parse(at);
    if (!Number.isFinite(ms)) { dropped += 1; continue; }
    rows.push({ at: String(at), ms, row });
  }
  // build.mjs sorts ascending already; sorted again here on a total key so the
  // strip's order can never depend on who assembled ctx.
  rows.sort((a, b) => a.ms - b.ms || (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));

  const total = rows.length;
  const picked = rows.slice(-max);
  const firstIdx = total - picked.length;

  // Receipt pages, keyed by the stamp they were generated at. deriveMoves() in
  // build.mjs carries generated_at through from the receipt, and the engine
  // writes the same stamp into history.ndjson, so the match is exact — checked
  // 2026-09-26: 45 of 45. A row with no move simply has no link.
  const moveIds = new Map();
  if (Array.isArray(ctx.moves)) {
    for (const m of ctx.moves) {
      if (m && typeof m.id === 'string' && typeof m.generated_at === 'string') {
        moveIds.set(m.generated_at, m.id);
      }
    }
  }

  const readings = picked.map((r, i) => {
    const prev = firstIdx + i > 0 ? rows[firstIdx + i - 1] : null;
    return reading(r, prev, moveIds);
  });

  return {
    total,
    dropped,
    max,
    few: total < READINGS.MIN,
    readings,
    ghosts: readings.filter((r) => r.ghost !== null).length,
    degraded: readings.filter((r) => r.degraded).length,
  };
}

function reading({ at, ms, row }, prev, moveIds) {
  const score = Number.isFinite(row.score) ? clamp(row.score, 0, 100) : null;
  // The band the SCORE sits in — this is what the thick arc shows, exactly as
  // the hero dial thickens bandFor(score). The centre digit is the PUBLISHED
  // level. When the two disagree (a deadband hold, a frozen level, a hand
  // edit) the cell says so in words rather than quietly picking one.
  const band = bandFor(score);
  const stated = Number.isInteger(row.level) && row.level >= 1 && row.level <= 5 ? row.level : null;
  const meta = stated !== null ? safeLevelMeta(stated) : null;
  const mismatch = band !== null && stated !== null && band.level !== stated;

  // engine.mjs writes `degraded`; a `frozen_dark_pillar` rule is a degraded
  // observation by definition (build.mjs: "a dark pillar is a degraded index").
  // Either flag marks the cell. Nothing is inferred from a null pillar score,
  // because in the history log a null pillar is EITHER dark OR awaiting its
  // baseline and the log does not say which.
  const degraded = row.degraded === true || row.rule_fired === 'frozen_dark_pillar';

  // The previous reading as a POSITION, against the observation immediately
  // before this one in the full record — the same "since the last observation"
  // basis the engine's delta_from_previous uses — and only when the move is
  // large enough to draw truthfully at this radius.
  let ghost = null;
  if (score !== null && prev && Number.isFinite(prev.row.score)) {
    const p = clamp(prev.row.score, 0, 100);
    if (Math.abs(score - p) >= READINGS.GHOST_MIN) ghost = p;
  }

  return {
    at, ms, score, band, stated, meta, mismatch, degraded, ghost,
    moveId: moveIds.get(at) ?? null,
  };
}

/** build.mjs / index.mjs guard. */
export function hasReadings(ctx) {
  return model(ctx) !== null;
}

// ---------------------------------------------------------------------------
// The drawing
// ---------------------------------------------------------------------------

function dial(rd) {
  const hasMark = rd.score !== null;
  const live = rd.band;

  // aria-hidden, and deliberately so: the three lines of HTML under the dial
  // carry every fact it draws, and eight <desc>s read aloud in a row would be
  // the same sentence eight times.
  let out = `<svg class="rd__svg" viewBox="0 0 ${G.w} ${G.h}" aria-hidden="true" focusable="false">`;

  // --- the five band arcs ---------------------------------------------------
  const gapV = (G.gapDeg / SWEEP) * 100;
  for (const b of BANDS) {
    const lo = b.lo + (b.lo === 0 ? 0 : gapV);
    const hi = b.hi - (b.hi === 100 ? 0 : gapV);
    if (hi <= lo) continue;
    const isLive = hasMark && live !== null && b.level === live.level;
    const cls = hasMark ? 'rdd__seg' : 'rdd__seg rdd__seg--flat';
    out += `<path class="${cls}" data-lv="${b.level}"${isLive ? ' data-live="1"' : ''} ` +
      `stroke-width="${isLive ? G.liveSw : G.sw}" d="${arcPath(lo, hi, G.r)}"/>`;
  }

  // --- the published level, in the centre ------------------------------------
  if (rd.stated !== null) {
    out += textAt('rdd__digit', G.cx, G.digitY, G.digitFs, String(rd.stated));
  } else {
    out += textAt('rdd__digit rdd__digit--none', G.cx, G.digitY, G.digitFs, '—');
  }

  // --- the movement -------------------------------------------------------------
  if (hasMark) {
    const r0 = G.r - G.sw / 2 - G.markPad;
    const r1 = G.r + G.sw / 2 + G.markPad;

    // The ghost first, so the live mark always wins the overlap. An OPEN ring
    // against a FILLED dot: the difference is shape, not hue.
    if (rd.ghost !== null) {
      out += radialLine('rdd__ghost', rd.ghost, r0, r1);
      out += dotAt('rdd__ghostdot', rd.ghost, G.r, G.ghostR);
    }

    // THE MARK. A radial bar crossing the ring plus a dot centred on it, drawn
    // twice — once in the plate colour underneath — so it stays visible over
    // any heat colour in either scheme. Dashed and hollow when degraded.
    const soft = rd.degraded ? ' rdd__mark--soft' : '';
    out += radialLine('rdd__markhalo', rd.score, r0, r1);
    out += radialLine(`rdd__mark${soft}`, rd.score, r0, r1);
    out += dotAt(`rdd__dot${rd.degraded ? ' rdd__dot--soft' : ''}`, rd.score, G.r, G.dotR);
  }

  return `${out}</svg>`;
}

// Soft hyphens at the one place each long name can break honestly. U+00AD
// renders nothing unless the word has to wrap, and at 76px on a phone the two
// longest level names do. Without this, overflow-wrap: anywhere would break
// "UNPRECEDENTED" wherever the pixels ran out.
const BREAKS = Object.freeze({
  UNPRECEDENTED: 'UNPRE­CEDENTED',
  ACCELERATED: 'ACCEL­ERATED',
});

function cell(rd, ctx) {
  const name = rd.meta ? rd.meta.name : (rd.stated !== null ? `LEVEL ${rd.stated}` : 'NO LEVEL');
  const nameShown = BREAKS[name] || name;
  const levelVh = rd.stated !== null ? `Level ${rd.stated}, ` : 'Level not recorded, ';
  const scoreTxt = rd.score !== null ? num(rd.score, 1) : '—';

  // utc() converts, so a row stamped with an offset still prints its UTC day
  // and clock. "Z" is the ISO designator the rail and the leader wire already
  // use; the full "… UTC" form is in the title.
  const stamp = utc(rd.at); // "2026-09-26 23:19:45 UTC"
  const day = stamp.slice(0, 10);
  const clock = `${stamp.slice(11, 19)}Z`;
  const time = `<time datetime="${esc(rd.at)}" title="${esc(stamp)}">` +
    `<span class="rd__d">${esc(day)}</span><span class="rd__c">${esc(clock)}</span></time>`;
  const link = rd.moveId && ctx && typeof ctx.href === 'function'
    ? ctx.href(`/moves/${rd.moveId}.html`)
    : null;
  const timeBlock = link
    ? `<a href="${esc(link)}">${time}<span class="vh"> — receipt for this observation</span></a>`
    : time;

  const flags = [];
  if (rd.degraded) {
    flags.push('<p class="rd__flag">Degraded<span class="vh"> — the position is provisional</span></p>');
  }
  if (rd.mismatch) {
    flags.push('<p class="rd__flag rd__flag--dim">Level &ne; band<span class="vh"> — published level ' +
      `${esc(rd.stated)}; the score sits in the ${esc(rd.band.label)} band, level ${esc(rd.band.level)}</span></p>`);
  }

  const attrs = (rd.stated !== null ? ` data-lv="${rd.stated}"` : '') +
    (rd.degraded ? ' data-degraded="1"' : '');

  return `<li class="rd__i"${attrs}>
  ${dial(rd)}
  <p class="rd__lv${rd.meta ? '' : ' rd__lv--none'}"><span class="vh">${esc(levelVh)}</span>${esc(nameShown)}</p>
  <p class="rd__sc"><b class="rd__n num${rd.score === null ? ' rd__n--none' : ''}">${esc(scoreTxt)}</b><span class="vh">${rd.score === null ? ' no score' : ' of 100'}</span></p>
  <p class="rd__t">${timeBlock}</p>${flags.length ? `\n  ${flags.join('\n  ')}` : ''}
</li>`;
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

const DEFAULT_HEADING = 'Recent readings';

/**
 * The strip.
 *
 * @param {object} ctx  build context; needs ctx.history, and uses ctx.moves
 *                      and ctx.href when present.
 * @param {object} [opts]
 * @param {number}      [opts.max]      observations to show, 1–16 (default 8)
 * @param {string|null} [opts.heading]  null suppresses the <h2>; the region is
 *                                      then labelled directly
 * @param {string}      [opts.id]       disambiguator if the strip appears twice
 * @returns {string} HTML fragment. '' only when ctx.history is not an array.
 */
export function render(ctx, opts = {}) {
  const m = model(ctx, opts);
  if (!m) return '';

  const idBase = opts.id ? `rd-${String(opts.id)}` : 'rd';
  const hid = `${idBase}-h`;
  const showHeading = opts.heading !== null && (opts.heading === undefined || String(opts.heading).trim() !== '');
  const headingText = showHeading && opts.heading !== undefined ? String(opts.heading) : DEFAULT_HEADING;
  const label = showHeading ? ` aria-labelledby="${hid}"` : ` aria-label="${esc(DEFAULT_HEADING)}"`;
  const h2 = showHeading ? `<h2 class="rd__h" id="${hid}">${esc(headingText)}</h2>` : '';

  const historyHref = ctx && typeof ctx.href === 'function' ? ctx.href('/history.html') : '/history.html';
  const more = `<a href="${esc(historyHref)}">The full history &rarr;</a>`;

  // Fewer than READINGS.MIN: a sentence with the count in it, never an empty
  // strip and never a strip of one.
  if (m.few) {
    const n = m.total;
    return `${styleTag()}
<section class="rd rd--few"${label}>
  <div class="rd__hd">${h2}</div>
  <p class="rd__few"><b>${esc(n)} observation${n === 1 ? '' : 's'} so far.</b> The strip of dials
     starts at ${esc(READINGS.MIN)}; fewer than that is not a movement to draw. ${more}</p>
</section>`;
  }

  const shown = m.readings.length;
  const count = shown < m.total
    ? `Last ${shown} of ${m.total} observations`
    : `All ${m.total} observation${m.total === 1 ? '' : 's'}`;

  // DOM order is NEWEST FIRST and the <ol> says so with `reversed`; the CSS
  // lays the list out right-to-left so the oldest is at the left. See the
  // header of this file and the comment on .rd__l below.
  const items = [...m.readings].reverse().map((rd) => cell(rd, ctx)).join('\n');

  const ghostKey = m.ghosts > 0
    ? ` An open ring is the previous reading, drawn only where the move was ${READINGS.GHOST_MIN} points or more.`
    : '';
  const droppedKey = m.dropped > 0
    ? ` ${m.dropped} row${m.dropped === 1 ? '' : 's'} in the log carr${m.dropped === 1 ? 'ies' : 'y'} no usable timestamp and ${m.dropped === 1 ? 'is' : 'are'} not drawn.`
    : '';

  return `${styleTag()}
<section class="rd"${label}>
  <div class="rd__hd">
    ${h2}
    <p class="rd__k">${esc(count)}</p>
  </div>
  <ol class="rd__l" reversed>
${items}
  </ol>
  <p class="rd__key">Oldest left, newest right. Same dial as above at a third the size: the thick band
     is the level, the bar is the score, CALM end at 0, SEVERE end at 100. Dashed means
     degraded.${esc(ghostKey)}${esc(droppedKey)} Stamps open receipts. ${more}</p>
</section>`;
}

// ---------------------------------------------------------------------------
// CSS
// ---------------------------------------------------------------------------
//
// Namespaced under .rd* (the strip) and .rdd__* (inside a dial), shipped inside
// the fragment, so the module can be added to or removed from a page without
// touching site/styles.mjs, which another module owns. Every colour is a custom
// property already defined there; no literal hex anywhere in this block.
//
// The dial does NOT use the .ch chart plate or .ch__svg: a bordered, padded
// plate per 96px dial is eight plates in the fold, and `.ch text { fill:
// var(--ink-dim) }` at (0,1,1) would out-rank the centre numeral's fill. The
// cell is its own quieter plate, and every SVG rule is prefixed .rd so it
// cannot be beaten by a bare element selector from the global sheet.
const readingsCssText = `
.rd { margin: var(--s-4) 0 0; }
.rd__hd {
  display: flex; align-items: baseline; justify-content: space-between;
  gap: 4px var(--s-3); flex-wrap: wrap;
}
.rd__h {
  font-family: var(--mono); font-size: var(--t-xs); font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink); margin: 0;
}
.rd__k {
  margin: 0; font-family: var(--mono); font-size: var(--t-2xs); letter-spacing: 0.06em;
  text-transform: uppercase; color: var(--ink-faint);
}

/* THE ROW. Read the header of this file before touching "direction".
   The list is emitted newest-first and laid out right-to-left, which puts the
   oldest dial at the LEFT, the newest at the RIGHT, the overflow on the left
   where an rtl scroll container can reach it, and the initial scroll position
   at the newest end — so a phone opens on the four readings that matter and
   swipes back into the past. The auto margin on the first (newest) cell soaks
   up any free space on its right, so a row that FITS packs against the left
   edge like everything else on the page; when the row overflows there is no
   free space and the margin is nothing. Cells set direction back to ltr so
   their own text is untouched. */
.rd__l {
  list-style: none; margin: var(--s-2) 0 0; padding: 2px 0 var(--s-2);
  display: flex; gap: var(--s-2);
  overflow-x: auto; overscroll-behavior-x: contain; scroll-snap-type: x proximity;
  direction: rtl;
}
.rd__i {
  direction: ltr; flex: 0 0 96px; min-width: 0; scroll-snap-align: start;
  text-align: center;
  background: var(--bg-raised); border: 1px solid var(--rule); border-radius: var(--radius);
  box-shadow: var(--shadow-1);
  padding: var(--s-2) var(--s-1);
}
.rd__i:first-child { margin-right: auto; }
/* Dashed, like the dashed mark inside it and the dashed monogram on the leader
   wire: the border is the second carrier, the word DEGRADED below is the first. */
.rd__i[data-degraded="1"] { border-style: dashed; }

.rd__svg { display: block; width: 100%; max-width: 96px; height: auto; margin: 0 auto; }
.rd__svg text { font-family: var(--mono); font-variant-numeric: tabular-nums; }

/* Bands. Hue from the --heat-* ramp, cool at level 5 to hot at level 1; the
   live one is at full opacity AND three units thicker, so which band the
   reading is in survives greyscale and a thumbnail. Same opacities as the hero
   dial, so the two never disagree about what "dim" means. */
.rd .rdd__seg { fill: none; stroke-linecap: butt; opacity: .42; }
.rd .rdd__seg[data-live="1"] { opacity: 1; }
.rd .rdd__seg[data-lv="5"] { stroke: var(--heat-5); }
.rd .rdd__seg[data-lv="4"] { stroke: var(--heat-4); }
.rd .rdd__seg[data-lv="3"] { stroke: var(--heat-3); }
.rd .rdd__seg[data-lv="2"] { stroke: var(--heat-2); }
.rd .rdd__seg[data-lv="1"] { stroke: var(--heat-1); }
/* No score: the ramp is withdrawn. A dimmed ramp is still a temperature, and
   for that row we are not reporting one. [data-lv] keeps this above the five
   rules directly over it whatever order they end up in. */
.rd .rdd__seg--flat[data-lv] { stroke: var(--rule); opacity: 1; }

.rd .rdd__digit { fill: var(--ink); font-weight: 700; letter-spacing: -.04em; }
.rd .rdd__digit--none { fill: var(--ink-dim); font-weight: 400; }

/* The mark: --ink over a halo in the PLATE colour (the dial sits on
   --bg-raised, not on --bg), so it stays visible crossing any band in either
   scheme. Degraded: dashed bar, hollow dot — the gauge's own --soft variant. */
.rd .rdd__markhalo { stroke: var(--bg-raised); stroke-width: 5; stroke-linecap: round; }
.rd .rdd__mark { stroke: var(--ink); stroke-width: 2.4; stroke-linecap: round; }
.rd .rdd__mark--soft { stroke-dasharray: 3 2; }
.rd .rdd__dot { fill: var(--ink); stroke: var(--bg-raised); stroke-width: 1; }
.rd .rdd__dot--soft { fill: var(--bg-raised); stroke: var(--ink); stroke-width: 1.5; }
.rd .rdd__ghost { stroke: var(--ink-faint); stroke-width: 1.4; stroke-dasharray: 2 2; }
.rd .rdd__ghostdot { fill: var(--bg-raised); stroke: var(--ink-faint); stroke-width: 1.2; }

/* The three lines of text under the dial. Level name, score, stamp — in that
   order because that is the order the hero states them. */
.rd__lv, .rd__sc, .rd__t, .rd__flag { margin: 0; line-height: 1.3; }
.rd__lv {
  margin-top: 2px; font-family: var(--mono); font-size: var(--t-2xs); font-weight: 700;
  letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink);
  overflow-wrap: anywhere;
}
.rd__lv--none { color: var(--ink-dim); font-weight: 400; }
.rd__sc { margin-top: 2px; }
.rd__n { font-family: var(--mono); font-size: var(--t-base); font-weight: 700; color: var(--ink); }
.rd__n--none { color: var(--ink-dim); font-weight: 400; }
.rd__t { margin-top: 3px; font-family: var(--mono); font-size: var(--t-2xs); color: var(--ink-dim); }
/* The stamp is the link, and it keeps the document underline. The padding is
   the tap target: two 12px lines plus 8px is 39px tall and 78px wide, clear of
   the 24px floor, without moving the visible text. */
.rd__t a { display: inline-block; padding: 4px 3px; margin: -2px -3px 0; color: var(--ink-dim); }
.rd__t a:hover { color: var(--ink); }
.rd__d, .rd__c { display: block; white-space: nowrap; }
.rd__flag {
  margin-top: 3px; font-family: var(--mono); font-size: var(--t-2xs); font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase; color: var(--dark-src);
}
.rd__flag--dim { color: var(--ink-dim); }

/* The key and the empty state: the same size and ink as .fresh__key, because
   they do the same job on the same page. */
.rd__key, .rd__few {
  margin: var(--s-2) 0 0; font-family: var(--mono); font-size: var(--t-xs);
  line-height: 1.55; color: var(--ink-faint);
}
.rd__few { font-family: var(--sans); font-size: var(--t-sm); color: var(--ink-dim); max-width: var(--measure); }
.rd__few b { color: var(--ink); font-weight: 600; }

/* 375px: four dials visible plus a sliver of the fifth, which is the scroll
   affordance — a row that ends exactly at the edge looks finished. 343px of
   column gives (343 - 30) / 4 = 78px per dial with a 12px sliver; the floor
   of 74px keeps "2026-09-26" at 12px mono (72px) on one line down to a 320px
   phone, where three fit and the fourth peeks. Measured at 375x812: four
   cells fully visible, the newest flush to the right edge, no page overflow. */
@media (max-width: 479.98px) {
  .rd__l { gap: 6px; }
  .rd__i { flex-basis: clamp(74px, calc((100% - 30px) / 4), 96px); padding: var(--s-2) 2px; }
}
`;

/** All CSS this module needs. Safe to inline more than once. */
export function readingsCss() {
  return readingsCssText;
}

export function styleTag() {
  return `<style>${readingsCssText}</style>`;
}

// ---------------------------------------------------------------------------
// Module-load invariants
// ---------------------------------------------------------------------------

(function assertReadingsIntegrity() {
  if (BANDS.length !== 5) throw new Error(`_readings: expected 5 bands, derived ${BANDS.length}`);
  if (BANDS[0].lo !== 0 || BANDS[BANDS.length - 1].hi !== 100) {
    throw new Error('_readings: the band scale must start at 0 and end at 100');
  }
  for (let i = 1; i < BANDS.length; i += 1) {
    if (BANDS[i].lo !== BANDS[i - 1].hi) {
      throw new Error(`_readings: bands ${BANDS[i - 1].level} and ${BANDS[i].level} do not meet`);
    }
  }
  // The drawing must stay inside its own viewBox at both ends of the sweep and
  // at the top, including the mark's halo — a clipped needle is a wrong reading.
  const outer = G.r + G.liveSw / 2;
  if (G.cy - outer < 0) throw new Error('_readings: the live band leaves the top of the viewBox');
  const reach = G.r + G.sw / 2 + G.markPad + G.haloSw / 2;
  for (const v of [0, 100]) {
    const x = px(v, reach);
    const y = py(v, reach);
    if (x < 0 || x > G.w || y > G.h) {
      throw new Error(`_readings: the mark at ${v} reaches (${x.toFixed(1)}, ${y.toFixed(1)}), outside ${G.w}x${G.h}`);
    }
  }
  if (G.cx - outer < 0 || G.cx + outer > G.w) throw new Error('_readings: the ring leaves the sides of the viewBox');
})();

// ---------------------------------------------------------------------------
// INTEGRATION (site/build.mjs and site/templates/index.mjs own these calls)
//
//   build.mjs:  nothing. ctx.history is already the parsed data/history.ndjson
//               (rows normalised to carry generated_at), ctx.moves already
//               carries {id, generated_at} per receipt, and ctx.href exists.
//               No new read, no new context key.
//
//   index.mjs:  import * as readings from './_readings.mjs';
//               ...and drop `${readings.render(ctx)}` into main IMMEDIATELY
//               AFTER the closing </section> of the hero and BEFORE
//               oven.render(ctx). That is "under the headline": the hero dial
//               says where the needle is, this row says where it has been, and
//               the oven rail underneath then names the five stages. Placed
//               above the hero it would compete with the one number the fold
//               exists to show; placed below the oven it would be a second
//               history chart rather than part of the reading.
//
//               styleTag() is emitted by render() itself, at the top of the
//               fragment, so nothing needs adding to the head. It is exported
//               separately for a page that wants the CSS once and the markup
//               elsewhere.
//
// render(ctx) returns '' only when ctx.history is not an array. With an array
// of fewer than READINGS.MIN rows it renders the "N observations so far" note,
// so wiring the call on a fresh install is safe and changes one sentence.
//
// MEASURED HEIGHT, because the integrator owns the fold. Rendered against the
// live 45-row log with the site's own sheet, 2026-09-26/27:
//   1440x900  256px  (heading row 19, list 181, key 40 = two lines)
//   375x812   345px  (heading row 38 — the count wraps under the h2 — list
//                     170 with four 78px cells fully visible and the fifth
//                     peeking, key 121)
//   the "N observations so far" note: 69px / 91px.
// It sits BELOW the hero, so the level dial and the composite score keep the
// fold they had; the cost is paid by whatever sits under it, which is the
// oven rail. The largest single line item on a phone is the key sentence.
// If that has to give, cut the ghost-ring clause first (it is conditional and
// rare), then "Stamps open receipts" — the underline already says so — and
// never the direction of the sweep, which is the one thing a newcomer cannot
// infer from eight dials with no numerals on their rims.
// ---------------------------------------------------------------------------
