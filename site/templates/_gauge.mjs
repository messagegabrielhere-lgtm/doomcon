// THE DIAL — the signature graphic of the site.
//
// WHY THIS EXISTS. The fold's central fact was a text numeral: a 140px "4" set
// beside a paragraph. That is typography, not an instrument. The thing people
// screenshot and repost off a site like this is a meter — one image that says
// where the needle is without reading a word — and we did not have one. Counted
// on the built homepage at 1440x900 before this file: two graphics larger than
// 200x200 on the entire page, zero above the fold.
//
// WHAT IT IS. A 270-degree dial, 320x314 at desktop and 272x276 on a phone,
// carrying BOTH halves of the reading at once:
//
//   - the CONTINUOUS composite score, as the angular position of a mark on a
//     0-100 arc (the arc is the scale; the boundary numerals label it);
//   - the DISCRETE level, as five distinct band arcs coloured with the
//     --heat-* ramp, the live one thickened and at full opacity, each labelled
//     with its own level numeral inside the ring, and the live level's numeral,
//     name and band range printed large in the middle;
//   - the DELTA, as an open ring at the previous reading, a travel arc with an
//     arrowhead between the two when the move is big enough to draw honestly,
//     and the signed number printed in words underneath.
//
// WHAT IT REFUSES TO DO.
//
//   1. It never invents a position. A missing score draws the five bands in
//      --rule with NO mark and says "NO SCORE" in the middle — not a needle at
//      zero, which would read as "measured, and it is quiet".
//   2. A degraded observation, or one with a dark pillar, does not get a
//      confident needle. The mark goes dashed and hollow and the dial prints
//      "DEGRADED · POSITION IS PROVISIONAL" under itself.
//   3. It prints the pillar coverage on every render, including the happy case.
//      Today four of five pillars are scored — markets has no frozen reference
//      yet — and an instrument that only mentions that when it is bad is an
//      instrument you cannot trust when it is silent.
//   4. It does NOT print the composite score inside the dial. site/templates/
//      _motion.mjs live-updates exactly one element per page — the first
//      [data-dc-score], which is .score__val in the hero's right-hand column —
//      so a second copy of the number inside this SVG would silently disagree
//      with the one beside it the moment a new observation lands. The number is
//      printed as text BESIDE the dial, which is where it can stay true.
//
// COLOUR IS NEVER THE CARRIER. Every band is labelled with its level numeral,
// the live band is thicker as well as brighter, the mark is --ink over a --bg
// halo rather than a hue, and the previous reading is an OPEN ring against a
// FILLED dot. The whole thing reads in greyscale and survives a 40%-scale
// screenshot, which is the format most of our traffic actually sees.
//
// REUSE, NOT A SECOND CHARTING LAYER. This file draws no axes, no scales and no
// responsive machinery of its own. It renders into site/templates/_charts.mjs's
// published contract, which already exists in site/styles.mjs:
//
//     <figure class="ch ch--dial">
//       <svg class="ch__svg ch__svg--sm" style="--w:272px" role="img" …>
//       <svg class="ch__svg ch__svg--lg" style="--w:320px" role="img" …>
//       <figcaption class="ch__cap">
//
// `--w` caps each SVG at its own viewBox width so type is never upscaled;
// `.ch__svg--sm` / `.ch__svg--lg` are the 640px pair the kit already ships, so
// the phone gets a dial drawn for a phone rather than a desktop dial squeezed
// to 0.72 with 7px labels on it. The band model is derived from brand.LEVELS
// the same way _charts.mjs derives it — band FLOORS, never band widths, so 41.4
// lands at 41.4% of the sweep and not somewhere near it.
//
// DETERMINISM. Pure. No clock read, no Math.random, no module state, no
// iteration over an object's keys. Every coordinate goes through n2() at two
// decimals and negative zero is normalised, so two builds from one state.json
// produce byte-identical markup (CONTRACT.md constraint 4). Element ids are an
// FNV-1a hash of the dial's own content plus its geometry key.
//
// MOTION. Exactly one animation: a 420ms opacity lift on the LIVE band, once,
// never looping, inside @media (prefers-reduced-motion: no-preference). Two
// earlier versions of this — a fade on the mark and a stroke-dashoffset draw-in
// on the arcs — were both removed after a screenshot caught a frame with no
// needle on the dial and a frame with the scale half-built. The growth loop of
// this site is people screenshotting the instrument, so no frame of it may be
// missing its reading or its scale. See the note above the @keyframes.

import { esc, signed } from './_html.mjs';
import * as brand from '../brand.mjs';

// ---------------------------------------------------------------------------
// The scale
// ---------------------------------------------------------------------------

// Band FLOORS plus the ceiling: 0, 35, 55, 70, 85, 100. Identical derivation to
// _charts.mjs — see the note there about why widths are the wrong thing to use.
const EDGES = brand.LEVELS.map((l) => l.band[0]).concat(100);

const BANDS = brand.LEVELS.map((l, i) => ({
  level: l.level,
  name: l.name,
  lo: EDGES[i],
  hi: EDGES[i + 1],
  // brand.mjs prints bands inclusively: "35–54", not "35–55".
  label: `${l.band[0]}–${l.band[1]}`,
}));

// The sweep. 135deg (lower left) clockwise through the top to 405deg (lower
// right), leaving a 90deg wedge open at the bottom for the delta readout. In
// SVG coordinates y grows downward, so increasing the angle is visually
// clockwise, which is the direction a reader expects a value to grow.
const START = 135;
const SWEEP = 270;

// The smallest move this dial will claim to have DRAWN. One point of score is
// 2.7deg, about 6px of arc at the desktop radius and roughly the width of the
// mark itself. Below that the ghost ring sits underneath the live dot and the
// travel arc is a smudge, so the drawing stops making the claim and the readout
// says the move was smaller than the instrument can show. The number itself is
// still printed, to two decimals if it needs them — the refusal is to DRAW a
// movement that cannot be seen, never to omit it.
const GHOST_MIN = 1;

// ---------------------------------------------------------------------------
// Geometry. Two sets, never one stretched set.
// ---------------------------------------------------------------------------
//
// Every radius below was chosen against a rendered screenshot, not on paper,
// and the three that are load-bearing are:
//
//   lvR    the level numerals live INSIDE the ring, and must clear the centre
//          block. The tightest pair is level 5 at 182deg against the big digit
//          and level 1 at 25deg against the band-range line.
//   labR   the boundary numerals live OUTSIDE the ring. The tightest is 85, at
//          4.5deg, which is the widest point of the drawing.
//   footY  the readout sits in the open bottom wedge, far enough below the 0
//          and 100 labels that they do not touch at the corners.

const LG = {
  key: 'l', w: 320, h: 308, cx: 160, cy: 150,
  r: 112, sw: 20, liveSw: 28,
  tick0: 126, tick1: 132, labR: 143, labFs: 10.5,
  lvR: 84, lvFs: 13, lvBoxW: 17, lvBoxH: 17, lvBoxR: 3,
  digitFs: 66, digitY: 146, nameFs: 12, nameY: 172, bandFs: 10.5, bandY: 190,
  emptyFs: 22, emptyY: 146, emptySubFs: 10.5, emptySubY: 168,
  markPad: 8, dotR: 4.2, ghostR: 4.6,
  arrow: 6,
  endR: 160, endFs: 9.5,
  footFs: 11, footFs2: 9.5, footY: [268, 283, 297],
};

const SM = {
  key: 's', w: 272, h: 276, cx: 136, cy: 132,
  r: 95, sw: 17, liveSw: 24,
  tick0: 107.5, tick1: 113, labR: 122, labFs: 10,
  lvR: 70, lvFs: 12, lvBoxW: 15.5, lvBoxH: 15.5, lvBoxR: 3,
  digitFs: 56, digitY: 128, nameFs: 11, nameY: 152, bandFs: 9.5, bandY: 168,
  emptyFs: 19, emptyY: 128, emptySubFs: 9.5, emptySubY: 148,
  markPad: 7, dotR: 3.8, ghostR: 4.2,
  arrow: 5.2,
  endR: 137, endFs: 9,
  footFs: 10.5, footFs2: 9, footY: [236, 251, 264],
};

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// Two decimals, and negative zero normalised. -0 formats as "-0.00" for any
// input in (-0.005, 0), which is a byte that wobbles for no reason.
function n2(v) {
  const s = Number(v).toFixed(2);
  return s === '-0.00' ? '0.00' : s;
}

// Content-derived ids. A counter would make the output depend on call order and
// a random suffix would make every rebuild a git diff.
function hashId(prefix, payload) {
  const s = typeof payload === 'string' ? payload : JSON.stringify(payload);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${prefix}${h.toString(36)}`;
}

function bandFor(score) {
  if (!Number.isFinite(score)) return null;
  const s = clamp(score, 0, 100);
  return BANDS.find((b) => s >= b.lo && s < b.hi) || BANDS[BANDS.length - 1];
}

const degOf = (v) => START + (clamp(v, 0, 100) / 100) * SWEEP;
const radOf = (v) => (degOf(v) * Math.PI) / 180;
const px = (g, v, r) => g.cx + r * Math.cos(radOf(v));
const py = (g, v, r) => g.cy + r * Math.sin(radOf(v));

function arcPath(g, lo, hi, r) {
  // A band can never exceed 35 points (94.5deg), so the large-arc flag is only
  // ever set by the travel arc, and only for a move of two thirds of the scale.
  const large = (hi - lo) / 100 * SWEEP > 180 ? 1 : 0;
  const sweep = hi >= lo ? 1 : 0;
  return `M${n2(px(g, lo, r))},${n2(py(g, lo, r))} ` +
    `A${n2(r)},${n2(r)} 0 ${large} ${sweep} ${n2(px(g, hi, r))},${n2(py(g, hi, r))}`;
}

function textAt(cls, x, y, anchor, size, content) {
  return `<text class="${cls}" x="${n2(x)}" y="${n2(y)}" text-anchor="${anchor}" ` +
    `font-size="${size}">${esc(content)}</text>`;
}

function radialLine(g, cls, v, r0, r1) {
  return `<line class="${cls}" x1="${n2(px(g, v, r0))}" y1="${n2(py(g, v, r0))}" ` +
    `x2="${n2(px(g, v, r1))}" y2="${n2(py(g, v, r1))}"/>`;
}

// ---------------------------------------------------------------------------
// The reading. One place that decides what is true, so the two geometries can
// never draw two different stories.
// ---------------------------------------------------------------------------

/**
 * @param {object} ctx  the build context; reads ctx.state and ctx.vsYesterday
 */
export function model(ctx) {
  const st = (ctx && ctx.state) || {};
  const score = Number.isFinite(st.score) ? clamp(st.score, 0, 100) : null;
  const band = bandFor(score);

  // The level the ENGINE published, which is what the h1 and the oven rail
  // print. It is normally the band the score falls in; if a hand-edit ever
  // makes those two disagree, the dial says so rather than quietly picking one.
  const stated = Number.isFinite(st.level) ? st.level : null;
  const mismatch = band !== null && stated !== null && stated !== band.level;
  const meta = stated !== null ? safeLevelMeta(stated) : null;

  // The delta, from the same three sources index.mjs's direction() uses and in
  // the same order, so the dial and the chip beside it can never disagree about
  // whether anything moved.
  const vs = ctx && ctx.vsYesterday;
  let delta = null;
  let basis = null;
  let sinceLabel = null;
  if (vs && Number.isFinite(vs.delta)) {
    delta = vs.delta;
    basis = vs.basis === 'previous' ? 'previous' : 'day';
    sinceLabel = String(vs.label || '');
  } else if (Number.isFinite(st.delta_from_previous)) {
    delta = st.delta_from_previous;
    basis = 'engine';
    sinceLabel = null;
  }

  // The previous reading, as a POSITION. Only meaningful when we also have a
  // current one: "score - delta" against a null score is not a number.
  const prev = score !== null && delta !== null ? clamp(score - delta, 0, 100) : null;

  const pillars = Array.isArray(st.pillars) ? st.pillars : [];
  const scored = pillars.filter((p) => p && Number.isFinite(p.score)).length;
  const darkPillars = Array.isArray(st.dark_pillars) ? st.dark_pillars.length : 0;
  const degraded = st.degraded === true || darkPillars > 0;

  return {
    score, band, stated, meta, mismatch,
    delta, basis, sinceLabel, prev,
    degraded, darkPillars,
    pillarsScored: scored,
    pillarsTotal: pillars.length,
  };
}

// brand.levelMeta throws on an unknown level, which is right at import time and
// wrong in the hero: a bad level in state.json should degrade this graphic, not
// take the whole page down. The band arcs and the mark do not depend on it.
function safeLevelMeta(level) {
  try {
    return brand.levelMeta(level);
  } catch {
    return null;
  }
}

/**
 * The signed delta, printed.
 *
 * One decimal, matching the chip in the hero's right-hand column — EXCEPT when
 * one decimal would round a real move to "0.0". A move of -0.0211 is not zero
 * and an instrument may not say it is, so that case gets a second decimal.
 */
function deltaText(delta) {
  if (!Number.isFinite(delta)) return null;
  const oneDp = signed(delta, 1);
  if (delta !== 0 && (oneDp === '+0.0' || oneDp === '−0.0' || oneDp === '±0.0')) {
    return signed(delta, 2);
  }
  return oneDp;
}

function deltaGlyph(delta) {
  if (!Number.isFinite(delta)) return '◆';
  return delta > 0 ? '▲' : delta < 0 ? '▼' : '◆';
}

function sinceText(m) {
  if (m.basis === 'day') return `VS ${String(m.sinceLabel || '').toUpperCase()}`;
  if (m.basis === 'previous') return `SINCE ${String(m.sinceLabel || '').toUpperCase()}`;
  return 'SINCE THE LAST OBSERVATION';
}

// The three lines of the readout in the open bottom wedge. Returned as data so
// both geometries place the same sentences at their own coordinates.
function footLines(m) {
  const out = [];

  if (m.score === null) {
    out.push({ t: 'NO POSITION MARKED', cls: 'dial__foot' });
    out.push({ t: 'THE INDEX HAS NOT BEEN COMPUTED', cls: 'dial__foot dial__foot--dim' });
    return out;
  }

  if (m.delta === null) {
    out.push({ t: 'FIRST SCORED OBSERVATION', cls: 'dial__foot' });
    out.push({ t: 'NOTHING YET TO COMPARE IT AGAINST', cls: 'dial__foot dial__foot--dim' });
  } else {
    out.push({ t: `${deltaGlyph(m.delta)} ${deltaText(m.delta)}  ${sinceText(m)}`, cls: 'dial__foot' });
    // The legend may only name a thing that is on the drawing. At -0.02 the
    // previous reading is 0.05deg away and its ring is entirely underneath the
    // live dot, so "○ marks the previous reading" would be pointing at nothing.
    out.push({
      t: Math.abs(m.delta) >= GHOST_MIN
        ? '● TODAY · ○ PREVIOUS READING'
        : 'MOVE UNDER 1 POINT · ○ HIDDEN UNDER ●',
      cls: 'dial__foot dial__foot--dim',
    });
  }

  if (m.degraded) {
    out.push({
      t: m.darkPillars > 0
        ? `DEGRADED · ${m.darkPillars} DARK · POSITION PROVISIONAL`
        : 'DEGRADED · POSITION IS PROVISIONAL',
      cls: 'dial__foot dial__foot--warn',
    });
  } else if (m.mismatch) {
    out.push({ t: 'PUBLISHED LEVEL AND SCORE DISAGREE', cls: 'dial__foot dial__foot--warn' });
  } else if (m.pillarsTotal > 0) {
    out.push({
      t: `${m.pillarsScored} OF ${m.pillarsTotal} PILLARS SCORED`,
      cls: 'dial__foot dial__foot--dim',
    });
  }

  return out.slice(0, 3);
}

// ---------------------------------------------------------------------------
// The drawing
// ---------------------------------------------------------------------------

function dial(m, g, id, variantCls) {
  const tid = `${id}${g.key}t`;
  const did = `${id}${g.key}d`;
  const live = m.band;
  const hasMark = m.score !== null;

  let out = `<svg class="ch__svg ch__svg--dial ${variantCls}" viewBox="0 0 ${g.w} ${g.h}" ` +
    `preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="${tid} ${did}" ` +
    `style="--w:${g.w}px">` +
    `<title id="${tid}">__T__</title><desc id="${did}">__D__</desc>`;

  // --- the five band arcs -------------------------------------------------
  // A visible gap between segments, so five bands are COUNTABLE without
  // reference to colour. Same radius for every one; the live band differs by
  // stroke width, which reads as thicker rather than as displaced.
  const gapV = (1.7 / SWEEP) * 100;
  for (const b of BANDS) {
    const lo = b.lo + (b.lo === 0 ? 0 : gapV);
    const hi = b.hi - (b.hi === 100 ? 0 : gapV);
    if (hi <= lo) continue;
    const isLive = hasMark && live !== null && b.level === live.level;
    const cls = hasMark ? 'dial__seg' : 'dial__seg dial__seg--flat';
    out += `<path class="${cls}" data-lv="${b.level}"${isLive ? ' data-live="1"' : ''} ` +
      `stroke-width="${isLive ? g.liveSw : g.sw}" d="${arcPath(g, lo, hi, g.r)}"/>`;
  }

  // --- boundary ticks and their numbers, outside the ring -----------------
  // Cleared from the LIVE stroke width, not the base one: the live band bulges
  // past the nominal radius and a tick measured off g.sw lands underneath it.
  for (const e of EDGES) {
    out += radialLine(g, 'dial__tick', e, g.tick0, g.tick1);
    const x = px(g, e, g.labR);
    const y = py(g, e, g.labR);
    out += textAt('dial__ticklab', x, y + g.labFs * 0.34, 'middle', g.labFs, String(e));
  }

  // --- WHICH END IS BAD ---------------------------------------------------
  // Measured on the live page 2026-09-26: the words "calm", "worst", "most
  // severe", "counts down" and "1 is" appeared ZERO times anywhere on it. The
  // dial drew 5 4 3 2 1 round an arc and left the direction to the heat ramp,
  // which is exactly the thing this file's own header forbids — "colour is
  // never the carrier". A numeral tells you WHICH band you are in; it does not
  // tell you which way is worse, and DOOMCON counts DOWN, so a newcomer reads
  // "4 of 5" as four-fifths of the way to bad when it is the second CALMEST
  // reading there is. That is not a small misread, it is the opposite of the
  // truth, and it was the site's single largest comprehension failure.
  //
  // Two words at the two ends of the arc fix it in any colour scheme, in
  // greyscale, and for a reader who has never heard of DEFCON. They sit just
  // outside the boundary numerals at the open bottom of the sweep, where
  // value 0 lands bottom-left and value 100 bottom-right.
  out += textAt('dial__end', px(g, 0, g.endR), py(g, 0, g.endR) + g.endFs * 0.34,
    'middle', g.endFs, 'CALM');
  out += textAt('dial__end', px(g, 100, g.endR), py(g, 100, g.endR) + g.endFs * 0.34,
    'middle', g.endFs, 'SEVERE');

  // --- the level numerals, inside the ring --------------------------------
  // The band carries the hue; this carries the number. The live one is a filled
  // chip in that band's heat colour with --accent-ink type on it, which is the
  // one place a hue is load-bearing — and it is redundant with the big numeral
  // in the middle, the thicker arc, and the name printed under it.
  for (const b of BANDS) {
    const mid = (b.lo + b.hi) / 2;
    const x = px(g, mid, g.lvR);
    const y = py(g, mid, g.lvR);
    const isLive = hasMark && live !== null && b.level === live.level;
    if (isLive) {
      out += `<rect class="dial__lvbox" data-lv="${b.level}" ` +
        `x="${n2(x - g.lvBoxW / 2)}" y="${n2(y - g.lvBoxH / 2)}" ` +
        `width="${n2(g.lvBoxW)}" height="${n2(g.lvBoxH)}" rx="${g.lvBoxR}"/>`;
    }
    out += textAt(
      isLive ? 'dial__lvn dial__lvn--live' : 'dial__lvn',
      x, y + g.lvFs * 0.35, 'middle', g.lvFs, String(b.level),
    );
  }

  // --- the centre block ---------------------------------------------------
  if (hasMark) {
    const digit = m.stated !== null ? String(m.stated) : String(live.level);
    const name = m.meta ? m.meta.name : live.name;
    out += textAt('dial__digit', g.cx, g.digitY, 'middle', g.digitFs, digit);
    out += textAt('dial__name', g.cx, g.nameY, 'middle', g.nameFs, name);
    out += textAt('dial__band', g.cx, g.bandY, 'middle', g.bandFs, `BAND ${live.label}`);
  } else {
    out += textAt('dial__digit dial__digit--none', g.cx, g.emptyY, 'middle', g.emptyFs, 'NO SCORE');
    out += textAt('dial__band', g.cx, g.emptySubY, 'middle', g.emptySubFs, 'NOTHING IS MARKED');
  }

  // --- the movement -------------------------------------------------------
  if (hasMark) {
    out += '<g class="dial__live">';

    // The ghost first, so the live mark always wins the overlap. An OPEN ring
    // against a FILLED dot: the difference is shape, not hue.
    if (m.prev !== null) {
      out += radialLine(g, 'dial__ghost', m.prev, g.r - g.sw / 2 - g.markPad, g.r + g.sw / 2 + g.markPad);
      out += `<circle class="dial__ghostdot" cx="${n2(px(g, m.prev, g.r))}" ` +
        `cy="${n2(py(g, m.prev, g.r))}" r="${n2(g.ghostR)}"/>`;
    }

    // The travel arc: the sweep the needle made, drawn ON the ring itself over
    // a --bg halo. It was first drawn on a ring of its own outside the bands,
    // which put it straight through the boundary numerals — there is no free
    // radius out there, because cy is 150 and an arc at r=152 leaves the top of
    // the viewBox. On the ring it collides with nothing, it is a hairline over
    // a 20-28 unit band, and "the needle came from there" is exactly what it
    // means. It is only drawn when the move is large enough to draw truthfully;
    // under one point the sweep is shorter than the mark is wide and the
    // readout says so in words instead.
    if (m.prev !== null && Math.abs(m.score - m.prev) >= GHOST_MIN) {
      const d = arcPath(g, Math.min(m.prev, m.score), Math.max(m.prev, m.score), g.r);
      out += `<path class="dial__travelhalo" d="${d}"/>`;
      out += `<path class="dial__travel" d="${d}"/>`;

      // The arrowhead goes at the MIDPOINT, not at either end, where it would
      // sit under the live dot. Below five points the sweep is under 30 units
      // long and a six-unit arrow between two five-unit dots is a cluster
      // rather than a direction, so it is left off — the glyph and the sign in
      // the readout already say which way.
      if (Math.abs(m.score - m.prev) >= 5) {
        const mid = (m.prev + m.score) / 2;
        const dir = m.score > m.prev ? 1 : -1;
        out += `<path class="dial__arrow" d="M0,0 L${n2(-g.arrow)},${n2(g.arrow * 0.55)} ` +
          `L${n2(-g.arrow)},${n2(-g.arrow * 0.55)} Z" ` +
          `transform="translate(${n2(px(g, mid, g.r))},${n2(py(g, mid, g.r))}) ` +
          `rotate(${n2(degOf(mid) + dir * 90)})"/>`;
      }
    }

    // THE MARK. A radial bar crossing the ring plus a dot centred on it — a
    // speedometer redline, not a hub-to-rim needle. A needle in a 270deg dial
    // runs straight through the only place the level numeral can go; the first
    // render of this file had the pointer bisecting the "4". The bar is drawn
    // twice, once in --bg underneath, so it stays visible over any heat colour
    // in either scheme.
    const r0 = g.r - g.sw / 2 - g.markPad;
    const r1 = g.r + g.sw / 2 + g.markPad;
    const soft = m.degraded ? ' dial__mark--soft' : '';
    out += radialLine(g, 'dial__markhalo', m.score, r0, r1);
    out += radialLine(g, `dial__mark${soft}`, m.score, r0, r1);
    out += `<circle class="dial__dot${m.degraded ? ' dial__dot--soft' : ''}" ` +
      `cx="${n2(px(g, m.score, g.r))}" cy="${n2(py(g, m.score, g.r))}" r="${n2(g.dotR)}"/>`;

    out += '</g>';
  }

  // --- the readout in the open bottom wedge -------------------------------
  const lines = footLines(m);
  for (let i = 0; i < lines.length; i += 1) {
    out += textAt(lines[i].cls, g.cx, g.footY[i], 'middle',
      i === 0 ? g.footFs : g.footFs2, lines[i].t);
  }

  return `${out}</svg>`;
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

/**
 * The hero dial.
 *
 * @param {object} ctx
 * @param {object} [opts]
 * @param {string} [opts.id]        disambiguator if this ever appears twice
 * @param {string|false} [opts.caption]
 * @param {string} [opts.attrs]     extra attributes for the <figure>
 */
export function render(ctx, opts = {}) {
  const m = model(ctx);

  const key = [
    opts.id || '',
    m.score === null ? 'null' : m.score.toFixed(4),
    m.prev === null ? 'null' : m.prev.toFixed(4),
    m.stated === null ? 'null' : String(m.stated),
    m.basis || '-', m.sinceLabel || '-',
    m.degraded ? 'd' : '-', m.mismatch ? 'x' : '-',
    `${m.pillarsScored}/${m.pillarsTotal}`,
  ].join('|');
  const id = hashId('dl', key);

  const title = m.score === null
    ? `${brand.NAME} level dial — no score`
    : `${brand.NAME} ${m.stated !== null ? m.stated : m.band.level} — ` +
      `${m.meta ? m.meta.name : m.band.name}, composite score ${m.score.toFixed(1)} of 100`;

  const desc = describe(m);

  const svgs = dial(m, SM, id, 'ch__svg--sm').replace('__T__', esc(title)).replace('__D__', esc(desc)) +
    dial(m, LG, id, 'ch__svg--lg').replace('__T__', esc(title)).replace('__D__', esc(desc));

  const caption = opts.caption !== undefined
    ? opts.caption
    : 'Position on the 0–100 scale, banded by level.';
  const cap = caption === false || caption == null || caption === ''
    ? ''
    : `<figcaption class="ch__cap">${esc(caption)}</figcaption>`;

  const attrs = opts.attrs ? ` ${opts.attrs}` : '';
  return `<figure class="ch ch--dial"${attrs}>${svgs}${cap}</figure>`;
}

// The <desc>, which is what a screen reader reads and what the sentence under a
// chart would have to say if the SVG never painted. It states the finding, the
// full scale, the movement and the coverage, in that order.
function describe(m) {
  const scale = BANDS.map((b) => `level ${b.level} ${b.name} ${b.label}`).join('; ');

  if (m.score === null) {
    return 'A dial showing the five DOOMCON bands across 0 to 100: ' + scale + '. ' +
      'No composite score is available for this observation, so no position is marked. ' +
      'Nothing is drawn at zero, because zero would be a reading.';
  }

  const here = `The mark sits at ${m.score.toFixed(1)} of 100, inside ` +
    `${m.meta ? m.meta.name : m.band.name}, band ${m.band.label}, ` +
    `level ${m.stated !== null ? m.stated : m.band.level}.`;

  const moved = m.delta === null
    ? 'This is the first scored observation, so there is nothing to compare it against and no previous position is drawn.'
    : `An open ring marks the previous reading at ${m.prev.toFixed(1)}, a move of ` +
      `${deltaText(m.delta)} ${m.basis === 'day' ? `against ${m.sinceLabel}` : m.basis === 'previous' ? `since ${m.sinceLabel}` : 'since the last observation'}.`;

  const state = m.degraded
    ? `This observation is degraded${m.darkPillars > 0 ? `, with ${m.darkPillars} pillar${m.darkPillars === 1 ? '' : 's'} dark` : ''}, so the position is drawn as a dashed provisional mark rather than a confident one.`
    : m.mismatch
      ? 'The published level and the band the score falls in disagree, which is flagged on the dial.'
      : `${m.pillarsScored} of ${m.pillarsTotal} pillars are scored.`;

  return `A 270 degree dial. ${here} The scale runs ${scale}. ${moved} ${state}`;
}

// ---------------------------------------------------------------------------
// Paint
// ---------------------------------------------------------------------------

/**
 * Emitted once by the page that uses the dial, next to news.styleTag().
 *
 * It lives here rather than in site/styles.mjs for the same reason _oven.mjs's
 * does: that file belongs to the integrator, and a component that ships its own
 * paint cannot be half-installed. Every colour is a custom property already
 * defined there, so both schemes and both pinned themes are covered without a
 * single literal hex.
 */
export function styleTag() {
  return `<style>
/* EVERY RULE IS PREFIXED WITH .ch--dial, AND THAT IS LOAD-BEARING, NOT TIDINESS.
   site/styles.mjs paints the whole chart kit with

       .ch text, .spark text { fill: var(--ink-dim); }

   which is specificity (0,1,1) — one class plus one element — and therefore
   beats a bare .dial__digit at (0,1,0). The first version of this file set the
   centre numeral to var(--ink), the tick labels to var(--ink-faint) and the
   live chip's numeral to var(--accent-ink), and the browser rendered all three
   as --ink-dim: the big digit came out grey and the numeral on the coloured
   chip was invisible. Descendant-prefixing every rule takes them to (0,2,0),
   which wins, and it costs nothing. Do not un-prefix one of these. */

/* SIZING, and it took three goes to get right.

   --w is set on each <svg>, never on the <figure>, so a figcaption left to its
   own devices sets the figure's width: a 45-character sentence made the flex
   item 417px wide around a 320px dial. Capping the FIGURE at 320px then went
   wrong the other way, because .ch is now a padded, bordered plate and
   box-sizing is border-box site-wide — the cap ate the plate's padding out of
   the drawing and the desktop dial rendered at 286x275 instead of 320x308.

   fit-content alone was not enough either: .ch__svg is width:100% and an SVG
   with only a viewBox has an intrinsic size of 300, so the plate sized itself
   to 302 and the dial came out at 302x291. The fix is to stop asking the
   figure how big the drawing is and TELL IT — each variant gets the pixel
   width its viewBox was drawn at, which is the same number --w already caps it
   to, and max-width:100% keeps it shrinkable inside a narrow column. The plate
   then wraps a dial at its designed size, which is the whole contract of
   _charts.mjs rule 3: never upscale, never guess. */
.ch--dial { margin: 0; width: fit-content; max-width: 100%; }
.ch--dial .ch__svg { margin-inline: auto; }
.ch--dial .ch__svg--lg { width: 320px; max-width: 100%; }
.ch--dial .ch__svg--sm { width: 272px; max-width: 100%; }
.ch--dial .ch__cap { text-align: center; max-width: 320px; }

/* Bands. Hue from the --heat-* ramp, which runs cool at level 5 to hot at
   level 1; the live one is at full opacity AND eight units thicker, so which
   band we are in survives greyscale, a colour-blind reader and a thumbnail. */
.ch--dial .dial__seg { fill: none; stroke-linecap: butt; opacity: .42; }
.ch--dial .dial__seg[data-live="1"] { opacity: 1; }
.ch--dial .dial__seg[data-lv="5"] { stroke: var(--heat-5); }
.ch--dial .dial__seg[data-lv="4"] { stroke: var(--heat-4); }
.ch--dial .dial__seg[data-lv="3"] { stroke: var(--heat-3); }
.ch--dial .dial__seg[data-lv="2"] { stroke: var(--heat-2); }
.ch--dial .dial__seg[data-lv="1"] { stroke: var(--heat-1); }
/* No score: the ramp is withdrawn entirely. A dimmed ramp would still be a
   temperature, and we are not reporting one. The [data-lv] in the selector is
   deliberate — it has to outrank the five rules directly above, which are
   themselves (0,2,0), and source order alone is too easy to break by moving a
   line. This is the rule that decides whether a dead index draws in colour. */
.ch--dial .dial__seg--flat[data-lv] { stroke: var(--rule); opacity: 1; }

.ch--dial .dial__tick { stroke: var(--rule); stroke-width: 1.2; }
.ch--dial .dial__ticklab { fill: var(--ink-faint); letter-spacing: .02em; }
/* The two end words. Brighter than the boundary numerals on purpose: they are
   read once, to learn the direction of the scale, and then never again. */
.ch--dial .dial__end { fill: var(--ink-dim); letter-spacing: .14em; font-weight: 600; }

/* Level numerals inside the ring. The live one is a filled chip; --accent-ink
   is the token for type sitting on a saturated ground and is white on paper,
   near-black on the dark scheme, so the chip reads in both. */
.ch--dial .dial__lvn { fill: var(--ink-dim); font-weight: 700; }
.ch--dial .dial__lvn--live { fill: var(--accent-ink); }
.ch--dial .dial__lvbox[data-lv="5"] { fill: var(--heat-5); }
.ch--dial .dial__lvbox[data-lv="4"] { fill: var(--heat-4); }
.ch--dial .dial__lvbox[data-lv="3"] { fill: var(--heat-3); }
.ch--dial .dial__lvbox[data-lv="2"] { fill: var(--heat-2); }
.ch--dial .dial__lvbox[data-lv="1"] { fill: var(--heat-1); }

.ch--dial .dial__digit { fill: var(--ink); font-weight: 700; letter-spacing: -.045em; }
.ch--dial .dial__digit--none { fill: var(--ink-dim); letter-spacing: .06em; }
.ch--dial .dial__name { fill: var(--ink); font-weight: 700; letter-spacing: .12em; }
.ch--dial .dial__band { fill: var(--ink-faint); letter-spacing: .08em; }

/* The mark. --ink over a --bg halo, never a hue: it has to stay visible
   crossing any of the five band colours in either scheme. */
.ch--dial .dial__markhalo { stroke: var(--bg); stroke-width: 7.6; stroke-linecap: round; }
.ch--dial .dial__mark { stroke: var(--ink); stroke-width: 3.4; stroke-linecap: round; }
.ch--dial .dial__mark--soft { stroke-dasharray: 4 3; }
.ch--dial .dial__dot { fill: var(--ink); stroke: var(--bg); stroke-width: 1.4; }
.ch--dial .dial__dot--soft { fill: var(--bg); stroke: var(--ink); stroke-width: 2; }

.ch--dial .dial__ghost { stroke: var(--ink-faint); stroke-width: 2; stroke-dasharray: 3 3; }
.ch--dial .dial__ghostdot { fill: var(--bg); stroke: var(--ink-faint); stroke-width: 1.6; }

/* The sweep, over a knock-out so it stays readable crossing a saturated band. */
.ch--dial .dial__travelhalo { fill: none; stroke: var(--bg); stroke-width: 5.4; opacity: .85; }
.ch--dial .dial__travel { fill: none; stroke: var(--ink); stroke-width: 2.2; }
.ch--dial .dial__arrow { fill: var(--ink); stroke: var(--bg); stroke-width: 1.1; }

.ch--dial .dial__foot { fill: var(--ink); font-weight: 700; letter-spacing: .07em; }
.ch--dial .dial__foot--dim { fill: var(--ink-faint); font-weight: 400; letter-spacing: .09em; }
.ch--dial .dial__foot--warn { fill: var(--dark-src); font-weight: 700; letter-spacing: .08em; }

/* --- motion ----------------------------------------------------------- */
/* ONE 420ms lift, once, on ONE element: the live band comes up from the dim
   opacity the other four sit at to full. Nothing else moves, ever.
//
   This is the third version and the first that is safe, and the reason is
   screenshots. Version one faded the MARK in behind a 260ms delay, and a
   capture taken 300ms after load came back with a dial and no needle on it.
   Version two drew the five arcs on with stroke-dashoffset, and a capture
   taken while the phone geometry first became visible came back with five
   fragments — a scale half-built reads as a broken page, not as an animation.
   An instrument may never have a frame in which it is missing its reading or
   its scale, because on this site a frame is the product.
//
   An opacity lift has no such frame. At t=0 every band is fully drawn in its
   own colour at .42, which is exactly what the four non-live bands look like
   for good; the only thing that changes is which one is bright. It also passes
   MOTION.md's test, which the draw-ins did not: it represents a real event —
   this is the band the index is in — rather than decorating the arrival of a
   scale that did not just come into existence. Under reduced motion the live
   band is simply bright from the first frame. */
@keyframes dialLight { from { opacity: .42; } to { opacity: 1; } }
@media (prefers-reduced-motion: no-preference) {
  .ch--dial .dial__seg[data-live="1"] { animation: dialLight 420ms ease-out both; }
}
</style>`;
}

// ---------------------------------------------------------------------------
// Module-load invariants
// ---------------------------------------------------------------------------

// The dial places everything linearly in score, so the bands must tile 0-100
// with no gap and no overlap or the mark lands in a band it does not belong to.
// brand.mjs asserts this too; it is repeated here because THIS file is the one
// that would draw the wrong answer, and a graphic that is confidently wrong is
// worse than a build that refuses to finish.
(function assertDialIntegrity() {
  if (BANDS.length !== 5) {
    throw new Error(`_gauge: expected 5 bands, derived ${BANDS.length}`);
  }
  if (BANDS[0].lo !== 0 || BANDS[BANDS.length - 1].hi !== 100) {
    throw new Error('_gauge: the band scale must start at 0 and end at 100');
  }
  for (let i = 1; i < BANDS.length; i += 1) {
    if (BANDS[i].lo !== BANDS[i - 1].hi) {
      throw new Error(
        `_gauge: bands ${BANDS[i - 1].level} and ${BANDS[i].level} do not meet ` +
        `(${BANDS[i - 1].hi} vs ${BANDS[i].lo})`,
      );
    }
  }
  // Both geometries must leave the bottom wedge clear for the readout: every
  // foot line has to sit below the lowest point the arc labels reach.
  for (const g of [SM, LG]) {
    const lowestLabel = py(g, 0, g.labR);
    if (g.footY[0] <= lowestLabel) {
      throw new Error(`_gauge: ${g.key} readout at ${g.footY[0]} collides with the 0 label at ${lowestLabel.toFixed(1)}`);
    }
    if (g.footY[g.footY.length - 1] > g.h - 4) {
      throw new Error(`_gauge: ${g.key} readout overflows the ${g.h}-unit viewBox`);
    }
  }
})();
