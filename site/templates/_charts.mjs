// Server-rendered inline-SVG chart kit. No client JS, no chart library, no
// build step, no rasterisation.
//
// Why inline SVG and not canvas, not a <img src="chart.png">, not a client
// library: the growth loop is people screenshotting the number, and pizzint's
// fatal bug (TEARDOWN 3.3) is that its prerendered HTML says "LOADING TACTICAL
// DATA..." — a crawler sees nothing and a screenshot taken before hydration is
// blank. Every pixel produced here is present in the HTML the first byte of the
// response carries, is selectable text where it is text, and is crisp at any
// device pixel ratio.
//
// Five rules every function in this file obeys:
//
//   1. PURE. No clock reads, no Math.random, no module state. Two builds from
//      the same data produce byte-identical markup (CONTRACT.md constraint 4).
//      Element ids are an FNV-1a hash of the chart's own content.
//   2. NEVER COLOUR ALONE. Position, ordering, shape, dash pattern, glyph and a
//      printed number carry every signal. The accent only ever confirms
//      something that is already legible in greyscale — which is also what
//      survives a compressed screenshot on someone's phone.
//   3. NEVER UPSCALE. Each chart is drawn at its natural maximum size and the
//      SVG is capped at that width (`--w`), so type is never blown up past the
//      size it was designed at. The hero chart, which has to work at both 343px
//      and 720px, ships two geometries toggled by a media query instead of
//      stretching one — stretching text is the thing that makes a
//      "responsive SVG chart" look cheap.
//   4. TITLE + DESC + CAPTION. <title> and <desc> for screen readers, and a
//      visible <figcaption> that states the chart's finding in words. If the
//      SVG never painted at all, the sentence under it still tells you what
//      happened.
//   5. MISSING IS A STATE, NOT A ZERO. Empty, single-point, all-null and
//      awaiting-baseline each render as themselves, distinctly, and never as a
//      flat line at zero — a flat line reads as "measured and unchanged", which
//      is the exact lie this whole project is a reaction to.
//
// Paint lives in styles.mjs (classes prefixed `ch-`), never in presentation
// attributes, so one stylesheet themes every chart for light and dark.

import { esc, utcDay, utcClock } from './_html.mjs';
import * as brand from '../brand.mjs';

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

// Band floors, not band widths: 0,35,55,70,85,100. Everything positional is
// linear in score, so the 70 tick sits at exactly 70% of the axis. Using band
// WIDTHS here puts every label subtly in the wrong place and a 61.9 appears to
// sit on the 70 mark — the same bug _parts.scaleTrack carries a note about.
const EDGES = brand.LEVELS.map((l) => l.band[0]).concat(100);

const BANDS = brand.LEVELS.map((l, i) => ({
  level: l.level,
  name: l.name,
  lo: EDGES[i],
  hi: EDGES[i + 1],
  // The printed band, from brand.mjs, which is inclusive: "35–54", not "35–55".
  label: `${l.band[0]}–${l.band[1]}`,
}));

// One distinct SHAPE per pillar, reused by the `.pillar-tag` chips in the feed
// so a pillar is identifiable in greyscale and in a 40%-scale screenshot.
// Deliberately five silhouettes that differ in outline, not five hues.
export const PILLAR_GLYPH = {
  capability: '▲', // ▲
  compute: '■',    // ■
  attention: '●',  // ●
  governance: '◆', // ◆
  markets: '✱',    // ✱
};

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const n2 = (v) => Number(v).toFixed(2);
const f1 = (v) => (Number.isFinite(v) ? v.toFixed(1) : '—');

function bandFor(score) {
  if (!Number.isFinite(score)) return null;
  const s = clamp(score, 0, 100);
  return BANDS.find((b) => s >= b.lo && s < b.hi) || BANDS[BANDS.length - 1];
}

// Deterministic, content-derived element ids. A counter would make the output
// depend on call order; a random suffix would make two builds differ and turn
// every rebuild into a git diff.
function hashId(prefix, payload) {
  const s = typeof payload === 'string' ? payload : JSON.stringify(payload);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${prefix}${h.toString(36)}`;
}

/**
 * Acklam's inverse normal CDF. Present here only to PLACE A MARKER on a
 * drawing — the index's own arithmetic lives in collector/engine.mjs and this
 * copy never feeds it. Relative error below 1.15e-9 on (0,1), which is
 * several orders of magnitude finer than one screen pixel.
 */
function probit(p) {
  if (!Number.isFinite(p) || p <= 0 || p >= 1) return NaN;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0,
    -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0,
    3.754408661907416e0];
  const lo = 0.02425;
  if (p < lo) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
           ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - lo) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
            ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const q = p - 0.5;
  const r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
         (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

function ordinal(k) {
  const v = Math.round(k);
  const rem100 = v % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${v}th`;
  const rem10 = v % 10;
  return `${v}${rem10 === 1 ? 'st' : rem10 === 2 ? 'nd' : rem10 === 3 ? 'rd' : 'th'}`;
}

/**
 * Open an <svg>. `--w` caps the rendered width at the viewBox width so the
 * chart is never upscaled past the size its type was designed at (rule 3).
 * preserveAspectRatio is `meet`, never `none`: `none` stretches glyphs, which
 * is what makes a stretched SVG chart look like a mistake.
 */
function openSvg(cls, w, h, tid, did) {
  return `<svg class="ch__svg ${cls}" viewBox="0 0 ${w} ${h}" ` +
    `preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="${tid} ${did}" ` +
    `style="--w:${w}px">` +
    `<title id="${tid}">__T__</title><desc id="${did}">__D__</desc>`;
}

// Title and desc are substituted after the body is built, so a builder can
// derive its summary sentence from things it computed while drawing.
function seal(svg, title, desc) {
  return svg.replace('__T__', esc(title)).replace('__D__', esc(desc));
}

function figure(cls, svgs, caption) {
  const cap = caption === false || caption == null || caption === ''
    ? ''
    : `<figcaption class="ch__cap">${esc(caption)}</figcaption>`;
  return `<figure class="ch ${cls}">${svgs}${cap}</figure>`;
}

function textAt(cls, x, y, anchor, size, content) {
  const a = anchor ? ` text-anchor="${anchor}"` : '';
  return `<text class="${cls}" x="${n2(x)}" y="${n2(y)}"${a} font-size="${size}">${esc(content)}</text>`;
}

// ---------------------------------------------------------------------------
// 1. indexHistoryChart — the hero
// ---------------------------------------------------------------------------

// Two geometries, not one stretched geometry. 640px is the breakpoint because
// below it a 720-unit viewBox downscales past 0.5 and 10px axis type lands at
// 5px, which is unreadable and looks broken in a screenshot.
const GEOM_SM = { w: 356, h: 250, l: 30, r: 10, t: 12, b: 30, fs: 9.5, fsb: 8.5, ticks: 2 };
const GEOM_LG = { w: 720, h: 300, l: 38, r: 14, t: 14, b: 34, fs: 11, fsb: 10, ticks: 4 };

/**
 * The single most important graphic on the site: composite score over time,
 * drawn against the five level bands.
 *
 * The y domain is FIXED at 0–100, never auto-scaled to the data. Auto-scaling
 * would make a 0.4-point wiggle fill the frame and read as a crisis; the whole
 * point of this chart is "where in the range do we sit", and that question is
 * meaningless without the range in the picture.
 *
 * @param {Array<{score:number, generated_at?:string, t?:string, level?:number}>|Array<number>} history
 * @param {object} [opts]
 * @param {string} [opts.id]        disambiguator when two of these share a page
 * @param {string|false} [opts.caption]
 * @param {number} [opts.now]       score to mark as current (defaults to last row)
 */
export function indexHistoryChart(history, opts = {}) {
  const rows = normaliseHistory(history);
  const key = `${opts.id || ''}|${rows.map((r) => `${r.ms}:${r.score}`).join(',')}`;
  const id = hashId('ih', key);

  const last = rows.length ? rows[rows.length - 1] : null;
  const current = Number.isFinite(opts.now) ? opts.now : last ? last.score : null;
  const band = bandFor(current);

  const scores = rows.map((r) => r.score);
  const lo = scores.length ? Math.min(...scores) : null;
  const hi = scores.length ? Math.max(...scores) : null;

  const span = rows.length && Number.isFinite(rows[0].ms) && Number.isFinite(last.ms) && last.ms > rows[0].ms
    ? `${utcDay(rows[0].at)} to ${utcDay(last.at)}`
    : null;

  const title = rows.length
    ? `${brand.NAME} composite score over the last ${rows.length} observation${rows.length === 1 ? '' : 's'}`
    : `${brand.NAME} composite score history`;

  const desc = rows.length === 0
    ? 'No scored observations recorded yet. The five level bands are drawn; the line begins at the first scored run.'
    : rows.length === 1
      ? `One observation so far, scoring ${f1(scores[0])} of 100, in the ${band ? band.name : 'unknown'} band. ` +
        'There is no trend to draw from a single point, so none is drawn.'
      : `${rows.length} observations${span ? ` from ${span}` : ''}. ` +
        `Range ${f1(lo)} to ${f1(hi)} of 100. ` +
        `Latest ${f1(current)}, in the ${band ? band.name : 'unknown'} band (${band ? band.label : '?'}). ` +
        'Background bands, bottom to top, are DORMANT 0 to 34, ROUTINE 35 to 54, ELEVATED 55 to 69, ' +
        'ACCELERATED 70 to 84, UNPRECEDENTED 85 to 100.';

  const caption = opts.caption !== undefined ? opts.caption : (
    rows.length === 0
      ? 'No scored observations yet — the chart begins at the first scored run.'
      : rows.length === 1
        ? `1 observation — history begins here. ${f1(scores[0])} of 100, ${band ? band.name : ''}.`
        : `${rows.length} observations${span ? ` · ${span}` : ''} · range ${f1(lo)}–${f1(hi)} · ` +
          `now ${f1(current)} in ${band ? band.name : ''} ${band ? band.label : ''}`
  );

  const sm = seal(historyPlot(rows, GEOM_SM, current, `${id}ts`, `${id}ds`, 'ch__svg--sm'), title, desc);
  const lg = seal(historyPlot(rows, GEOM_LG, current, `${id}tl`, `${id}dl`, 'ch__svg--lg'), title, desc);

  return figure('ch--history', sm + lg, caption);
}

function historyPlot(rows, g, current, tid, did, variantCls) {
  const pw = g.w - g.l - g.r;
  const ph = g.h - g.t - g.b;
  const x0 = g.l;
  const y0 = g.t;
  const yFor = (s) => y0 + ph - (clamp(s, 0, 100) / 100) * ph;

  let out = openSvg(variantCls, g.w, g.h, tid, did);

  // --- level bands ---------------------------------------------------------
  // Alternating wash so the five bands are countable in greyscale, plus the
  // live band in accent AND a leading caret AND the word NOW. Three signals.
  const liveBand = bandFor(current);
  for (let i = 0; i < BANDS.length; i += 1) {
    const b = BANDS[i];
    const yTop = yFor(b.hi);
    const h = yFor(b.lo) - yTop;
    const live = liveBand && b.level === liveBand.level;
    out += `<rect class="ch-band${live ? ' ch-band--live' : i % 2 ? ' ch-band--alt' : ''}" ` +
      `x="${n2(x0)}" y="${n2(yTop)}" width="${n2(pw)}" height="${n2(h)}"/>`;
    // Label sits just inside the top of its own band. The smallest band
    // (ACCELERATED, 15 points) is still ~27px tall on the phone geometry, so an
    // 8.5px label clears it.
    //
    // The band range is dropped on the phone geometry. The label the reader
    // most needs - the live one - is the one the series is guaranteed to run
    // through, and "ROUTINE 35-54 . NOW" hides a quarter of a 318-unit plot
    // where "ROUTINE" hides a tenth. The range is on the y axis a centimetre to
    // the left and in the caption underneath, so nothing is lost.
    const wide = g.fsb >= 10;
    const label = live
      ? (wide ? `▸ ${b.name} ${b.label} · NOW` : `▸ ${b.name}`)
      : (wide ? `${b.name} ${b.label}` : b.name);
    out += textAt(`ch-bandl${live ? ' ch-bandl--live' : ''}`, x0 + 5, yTop + g.fsb + 2.5, null, g.fsb, label);
  }

  // --- y axis at the band floors ------------------------------------------
  for (const e of EDGES) {
    const y = yFor(e);
    out += `<line class="ch-axline" x1="${n2(x0 - 4)}" y1="${n2(y)}" x2="${n2(x0)}" y2="${n2(y)}"/>`;
    out += textAt('ch-ax', x0 - 6, y + g.fs * 0.35, 'end', g.fs, String(e));
  }
  // Plot frame. A single hairline box reads as instrumentation and stops the
  // top band bleeding into the page background.
  out += `<rect class="ch-frame" x="${n2(x0)}" y="${n2(y0)}" width="${n2(pw)}" height="${n2(ph)}"/>`;

  if (rows.length === 0) {
    // Sat at the exact vertical centre first, which is where the ROUTINE band
    // label lives. Nudged down into the gap between the ROUTINE and DORMANT
    // labels; the knockout stroke on .ch-note covers the rest.
    out += textAt('ch-note', x0 + pw / 2, y0 + ph * 0.56, 'middle', g.fs + 1,
      'No scored observations yet');
    out += textAt('ch-note ch-note--dim', x0 + pw / 2, y0 + ph * 0.56 + g.fs + 6, 'middle', g.fs,
      'The line begins at the first scored run');
    return out + '</svg>';
  }

  // --- x positions ---------------------------------------------------------
  const allTimed = rows.every((r) => Number.isFinite(r.ms));
  const t0 = allTimed ? rows[0].ms : 0;
  const t1 = allTimed ? rows[rows.length - 1].ms : 0;
  const timeSpan = t1 - t0;
  const xFor = (i) => {
    if (rows.length === 1) return x0;
    if (allTimed && timeSpan > 0) return x0 + ((rows[i].ms - t0) / timeSpan) * pw;
    return x0 + (i / (rows.length - 1)) * pw;
  };

  if (rows.length === 1) {
    // Cold start, handled with dignity rather than as an error: one honest dot
    // at the origin, a dashed guide showing the level it sits at, and a
    // sentence. Never a broken axis, never a flat line across the frame — a
    // flat line would claim two measurements that agreed.
    const y = yFor(rows[0].score);
    out += `<line class="ch-guide" x1="${n2(x0)}" y1="${n2(y)}" x2="${n2(x0 + pw)}" y2="${n2(y)}"/>`;
    out += `<circle class="ch-ring" cx="${n2(x0)}" cy="${n2(y)}" r="6.5"/>`;
    out += `<circle class="ch-dot" cx="${n2(x0)}" cy="${n2(y)}" r="3.2"/>`;
    const up = y > y0 + g.fs + 14;
    out += textAt('ch-val', x0 + 11, up ? y - 8 : y + g.fs + 8, 'start', g.fs + 1.5, f1(rows[0].score));
    out += textAt('ch-note', x0 + pw - 5, up ? y - 8 : y + g.fs + 8, 'end', g.fs,
      '1 observation — history begins here');
    out += xAxisLabel(rows[0], x0, y0 + ph + g.fs + 8, 'start', g);
    return out + '</svg>';
  }

  // --- level-change marks --------------------------------------------------
  // A vertical hairline where the level actually moved, with the new digit
  // underneath. This is the staircase the anti-flap machinery produces, and it
  // is the most interesting thing in the series.
  const changes = [];
  for (let i = 1; i < rows.length; i += 1) {
    if (Number.isInteger(rows[i].level) && Number.isInteger(rows[i - 1].level) &&
        rows[i].level !== rows[i - 1].level) {
      changes.push(i);
    }
  }
  // Kept to a tick in the bottom of the plot rather than a full-height rule:
  // a floor-to-ceiling dashed line at every change turns the band structure
  // into hatching, and the digits collided with the date axis underneath.
  for (const i of changes.slice(-8)) {
    const x = xFor(i);
    out += `<line class="ch-lvmark" x1="${n2(x)}" y1="${n2(y0 + ph - 15)}" x2="${n2(x)}" y2="${n2(y0 + ph)}"/>`;
    const tx = clamp(x, x0 + 9, x0 + pw - 9);
    out += textAt('ch-lvtext', tx, y0 + ph - 19, 'middle', g.fs, `△${rows[i].level}`);
  }

  // --- the series ----------------------------------------------------------
  const pts = rows.map((r, i) => `${n2(xFor(i))},${n2(yFor(r.score))}`);
  const d = `M${pts.join(' L')}`;

  // No area fill under the line. On a FIXED 0-100 domain an area drops all the
  // way to the axis and floods DORMANT and half of ROUTINE with accent, which
  // destroys exactly the band structure this chart exists to show. Rendered it,
  // looked at it, deleted it. The bands are the fill; the line is the line.
  // (The sparkline keeps its area fill - its domain is tight, so the fill sits
  // where the data is.)
  //
  // Halo first: a fat stroke in the page background colour so the line stays
  // readable where it crosses a band label. Cheaper and more reliable than
  // trying to place labels out of the line's way at every possible dataset.
  out += `<path class="ch-halo" d="${d}"/>`;
  out += `<path class="ch-line" d="${d}"/>`;

  const lx = xFor(rows.length - 1);
  const ly = yFor(rows[rows.length - 1].score);
  out += `<circle class="ch-ring" cx="${n2(lx)}" cy="${n2(ly)}" r="6.5"/>`;
  out += `<circle class="ch-dot" cx="${n2(lx)}" cy="${n2(ly)}" r="3.2"/>`;
  // The current value is labelled to the LEFT of the final dot, because the dot
  // is pinned to the right edge of the frame and a right-anchored label would
  // fall off the viewBox.
  const above = ly > y0 + g.fs + 12;
  out += textAt('ch-val', lx - 13, above ? ly - 9 : ly + g.fs + 10, 'end', g.fs + 2.5, f1(current));

  // --- x axis --------------------------------------------------------------
  const yAx = y0 + ph + g.fs + 8;
  const count = Math.min(g.ticks, rows.length);
  for (let k = 0; k < count; k += 1) {
    const i = count === 1 ? 0 : Math.round((k / (count - 1)) * (rows.length - 1));
    const anchor = k === 0 ? 'start' : k === count - 1 ? 'end' : 'middle';
    const x = k === 0 ? x0 : k === count - 1 ? x0 + pw : xFor(i);
    out += xAxisLabel(rows[i], x, yAx, anchor, g);
  }

  return out + '</svg>';
}

function xAxisLabel(row, x, y, anchor, g) {
  if (!row.at) return '';
  const day = utcDay(row.at).slice(5);
  const label = g.fs >= 11 ? `${day} ${utcClock(row.at)}Z` : day;
  return textAt('ch-ax', x, y, anchor, g.fs, label);
}

function normaliseHistory(history) {
  if (!Array.isArray(history)) return [];
  const out = [];
  for (const item of history) {
    if (typeof item === 'number') {
      if (Number.isFinite(item)) out.push({ score: item, at: null, ms: NaN, level: null });
      continue;
    }
    if (!item || typeof item !== 'object') continue;
    // STRICT typeof, not Number(). Number(null) is 0, Number('') is 0 and
    // Number([]) is 0, so a coercing check silently turns a dark reading into a
    // measurement of zero - which is the single thing this project exists not
    // to do. Caught by rendering the all-null fixture and seeing a confident
    // line along the floor of DORMANT captioned "now 0.0".
    const score = item.score;
    if (typeof score !== 'number' || !Number.isFinite(score)) continue; // a gap, never a zero
    const at = typeof item.generated_at === 'string' ? item.generated_at
      : typeof item.t === 'string' ? item.t : null;
    const ms = at ? Date.parse(at) : NaN;
    out.push({
      score,
      at: Number.isFinite(ms) ? at : null,
      ms: Number.isFinite(ms) ? ms : NaN,
      level: Number.isInteger(item.level) ? item.level : null,
    });
  }
  if (out.length > 1 && out.every((r) => Number.isFinite(r.ms))) {
    out.sort((a, b) => a.ms - b.ms);
  }
  return out;
}

// ---------------------------------------------------------------------------
// 2. pillarRanked — the five-axis comparison
// ---------------------------------------------------------------------------

// A RADAR WAS BUILT AND THROWN AWAY. On a 343px phone a five-axis radar has to
// carry five labels around a ~150px polygon; "Compute & Capital" alone is 17
// characters, so the labels either overlap, get abbreviated into nonsense, or
// shrink below 8px. Worse, radar area scales as the square of the value, so a
// pillar at 70 draws roughly twice the ink of one at 50 and the shape
// systematically overstates the leader — which is precisely the kind of
// flattering distortion this index exists to not do.
//
// A horizontal ranked bar is boring and correct: length is linear in score, the
// ordering is the comparison, every label has a full line to itself, and it
// reads identically at 343px and 560px. Legibility wins (task instruction).
//
// Two geometries for the same reason the hero has two: a single 560-unit
// viewBox downscales to 0.61 on a 343px phone, which turns 11.5px pillar names
// into 7px. Legibility wins twice - once over the radar, once over the
// convenience of one geometry.
const RANK_SM = { w: 352, rowH: 27, top: 18, bottom: 16, nameW: 92, valW: 36, fs: 10.5, wide: false };
const RANK_LG = { w: 560, rowH: 30, top: 20, bottom: 20, nameW: 130, valW: 46, fs: 11.5, wide: true };

/**
 * @param {Array<{id:string, score:number|null, dark?:boolean, uncalibrated?:boolean,
 *                sources_ok?:number, sources_total?:number, percentile?:number}>} pillars
 * @param {object} [opts]
 */
export function pillarRanked(pillars, opts = {}) {
  const list = Array.isArray(pillars) ? pillars : [];

  // Keep contract order as the tiebreak so two pillars on the same score never
  // swap places between builds.
  const order = new Map(brand.PILLARS.map((p, i) => [p.id, i]));
  const rows = list.map((p) => {
    const meta = brand.PILLARS.find((x) => x.id === p.id);
    const dark = p.dark === true;
    const uncal = p.uncalibrated === true;
    const score = Number.isFinite(p.score) ? p.score : null;
    return {
      id: p.id,
      name: meta ? meta.name : String(p.id),
      // "Compute & Capital" is 17 characters and does not fit the phone
      // geometry's label column. The head of the name is dropped to, never
      // abbreviated into, something a reader has to decode - and the full name
      // is in the <desc>, the caption and the pillar card next to it.
      shortName: meta ? meta.name.split(' & ')[0] : String(p.id),
      glyph: PILLAR_GLYPH[p.id] || '\u25aa',
      score: dark || uncal ? null : score,
      state: dark ? 'dark' : uncal ? 'uncal' : score === null ? 'none' : 'live',
      rank: order.has(p.id) ? order.get(p.id) : 99,
    };
  });
  // Live pillars first, ranked loudest to quietest; unscored pillars sink to the
  // bottom in contract order. An unscored pillar is not a zero and must never be
  // drawn at the bottom of the scale as though it had been measured at nothing.
  rows.sort((a, b) => {
    if ((a.score === null) !== (b.score === null)) return a.score === null ? 1 : -1;
    if (a.score !== null && b.score !== null && a.score !== b.score) return b.score - a.score;
    return a.rank - b.rank;
  });

  const id = hashId('pr', `${opts.id || ''}|${rows.map((r) => `${r.id}:${r.score}:${r.state}`).join(',')}`);

  const live = rows.filter((r) => r.score !== null);
  const unscored = rows.filter((r) => r.score === null);
  const lead = live[0] || null;

  const title = 'The five pillars, ranked by score';
  const desc = rows.length === 0
    ? 'No pillar scores were reported.'
    : live.length === 0
      ? 'No pillar has a score. ' + rows.map((r) => `${r.name} is ${r.state === 'dark' ? 'dark' : 'awaiting a baseline'}`).join('; ') + '.'
      : `Ranked loudest to quietest: ${live.map((r) => `${r.name} ${f1(r.score)}`).join(', ')}. ` +
        (unscored.length
          ? `Not scored: ${unscored.map((r) => `${r.name} (${r.state === 'dark' ? 'dark' : 'awaiting baseline'})`).join(', ')}. `
          : '') +
        'Each bar is linear in score from 0 to 100; the vertical line marks 50, the median of the frozen reference distribution.';

  const caption = opts.caption !== undefined ? opts.caption : (
    rows.length === 0
      ? 'No pillars reported.'
      : lead
        ? `${lead.name} leads at ${f1(lead.score)}` +
          (unscored.length
            ? `. ${unscored.map((r) => `${r.name} ${r.state === 'dark' ? 'is dark' : 'is awaiting a baseline'}`).join(', ')}.`
            : `, ${live[live.length - 1].name} is quietest at ${f1(live[live.length - 1].score)}.`)
        : 'No pillar is scored yet.'
  );

  const sm = seal(rankPlot(rows, RANK_SM, `${id}ts`, `${id}ds`, 'ch__svg--sm'), title, desc);
  const lg = seal(rankPlot(rows, RANK_LG, `${id}tl`, `${id}dl`, 'ch__svg--lg'), title, desc);
  return figure('ch--rank', sm + lg, caption);
}

function rankPlot(rows, g, tid, did, variantCls) {
  const h = g.top + Math.max(rows.length, 1) * g.rowH + g.bottom;
  const trackX = g.nameW;
  const trackW = g.w - g.nameW - g.valW;

  let out = openSvg(`ch__svg--rank ${variantCls}`, g.w, h, tid, did);

  if (rows.length === 0) {
    out += textAt('ch-note', g.w / 2, h / 2, 'middle', 12, 'No pillars reported');
    return out + '</svg>';
  }

  // Reference line at 50 - the median of the frozen reference distribution, so
  // "left of the line" literally means "quieter than the historical median".
  const refX = trackX + trackW * 0.5;
  out += textAt('ch-r-reflabel', refX, g.top - 7, 'middle', g.wide ? 9 : 8.5,
    g.wide ? '50 \u00b7 reference median' : '50 \u00b7 MEDIAN');
  out += `<line class="ch-r-ref" x1="${n2(refX)}" y1="${n2(g.top - 4)}" x2="${n2(refX)}" y2="${n2(g.top + rows.length * g.rowH)}"/>`;

  rows.forEach((r, i) => {
    const mid = g.top + i * g.rowH + g.rowH / 2;
    const barH = g.wide ? 12 : 11;
    const barY = mid - barH / 2;

    out += textAt('ch-r-glyph', 2, mid + 4, 'start', g.wide ? 10.5 : 9.5, r.glyph);
    out += textAt('ch-r-name', g.wide ? 16 : 14, mid + 4, 'start', g.fs, g.wide ? r.name : r.shortName);
    out += `<rect class="ch-r-track" x="${n2(trackX)}" y="${n2(barY)}" width="${n2(trackW)}" height="${barH}"/>`;

    if (r.score === null) {
      // Dashed outline, the word, no bar. Three signals that this is not a
      // measurement of zero.
      out += `<rect class="ch-r-none" x="${n2(trackX)}" y="${n2(barY)}" width="${n2(trackW)}" height="${barH}"/>`;
      const word = r.state === 'dark'
        ? (g.wide ? 'DARK \u00b7 no source answered' : 'DARK')
        : r.state === 'uncal'
          ? (g.wide ? 'AWAITING BASELINE \u00b7 collected, not scored' : 'AWAITING BASELINE')
          : 'NOT SCORED';
      out += textAt('ch-r-nonet', trackX + 6, mid + 3.5, 'start', g.wide ? 9.5 : 8.5, word);
      out += textAt('ch-r-val ch-r-val--none', g.w - 2, mid + 4, 'end', g.fs, '\u2014');
    } else {
      const w = Math.max(1.5, (clamp(r.score, 0, 100) / 100) * trackW);
      out += `<rect class="ch-r-bar" x="${n2(trackX)}" y="${n2(barY)}" width="${n2(w)}" height="${barH}"/>`;
      // A tick at the bar's end gives the value a hard edge to read against at
      // low contrast, and survives a greyscale screenshot where the fill does not.
      out += `<line class="ch-r-cap" x1="${n2(trackX + w)}" y1="${n2(barY - 2)}" x2="${n2(trackX + w)}" y2="${n2(barY + barH + 2)}"/>`;
      out += textAt('ch-r-val', g.w - 2, mid + 4, 'end', g.fs, f1(r.score));
    }
  });

  return out + '</svg>';
}

// Exported under both names so whichever the integrator reaches for resolves.
// The implementation is the ranked bar, for the reason above RANK_SM.
export const pillarRadar = pillarRanked;

// ---------------------------------------------------------------------------
// 3. sparkline — pillar cards
// ---------------------------------------------------------------------------

const SPARK = { w: 300, h: 42, pad: 6 };

// The smallest y domain a sparkline is allowed to fill. Without a floor, a
// series that moved 0.3 points draws a rollercoaster and every pillar card
// looks like an emergency. Six points is roughly a fifth of a level band: real
// movement still reads clearly, noise stays flat.
const SPARK_MIN_SPAN = 6;

/**
 * @param {Array<number|null>} values  oldest first; nulls and non-finite dropped
 * @param {object} [opts]
 * @param {string} [opts.label]  accessible name, e.g. "Capability score history"
 */
export function sparkline(values, opts = {}) {
  const { width = SPARK.w, height = SPARK.h, label = '' } = opts;
  const pts = (Array.isArray(values) ? values : []).filter((v) => Number.isFinite(v));
  const id = hashId('sp', `${opts.id || ''}|${label}|${pts.map((v) => v.toFixed(3)).join(',')}`);
  const pad = SPARK.pad;
  const usable = height - pad * 2;

  const head = `<svg class="spark pillar__spark ch__svg" viewBox="0 0 ${width} ${height}" ` +
    `preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="${id}t ${id}d" ` +
    `style="--w:${width}px"><title id="${id}t">__T__</title><desc id="${id}d">__D__</desc>`;

  if (pts.length === 0) {
    const body = head +
      `<line class="spark__base" x1="1" y1="${n2(height - pad)}" x2="${width - 1}" y2="${n2(height - pad)}" stroke-dasharray="2 3"/>` +
      textAt('spark__empty', 2, height / 2 + 3, 'start', 10, 'no history yet') + '</svg>';
    return seal(body, label || 'Score history', 'No history yet. Nothing has been scored for this pillar, which is not the same as a score of zero.');
  }

  if (pts.length === 1) {
    // One reading is a reading, not a trend. A dot and a dashed rule say
    // exactly that; a line between one point and the frame edge would not.
    const y = height / 2;
    const body = head +
      `<line class="spark__base" x1="1" y1="${n2(y)}" x2="${width - 1}" y2="${n2(y)}" stroke-dasharray="2 3"/>` +
      `<circle class="spark__ring" cx="14" cy="${n2(y)}" r="5"/>` +
      `<circle class="spark__dot" cx="14" cy="${n2(y)}" r="2.6"/>` +
      textAt('spark__empty', 24, y + 3.5, 'start', 10, `${f1(pts[0])} · 1 observation`) + '</svg>';
    return seal(body, label || 'Score history', `A single observation, scoring ${f1(pts[0])} of 100. There is no trend to draw from one point.`);
  }

  let min = Math.min(...pts);
  let max = Math.max(...pts);
  if (max - min < SPARK_MIN_SPAN) {
    const mid = (max + min) / 2;
    min = mid - SPARK_MIN_SPAN / 2;
    max = mid + SPARK_MIN_SPAN / 2;
  }
  const span = max - min;
  const y = (v) => pad + usable - ((v - min) / span) * usable;
  const x = (i) => (i / (pts.length - 1)) * (width - 2) + 1;

  const d = pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${n2(x(i))},${n2(y(v))}`).join(' ');
  const area = `${d} L${n2(x(pts.length - 1))},${n2(height)} L${n2(x(0))},${n2(height)} Z`;
  const lx = x(pts.length - 1);
  const ly = y(pts[pts.length - 1]);

  // The 50 line is the median of the frozen reference distribution, so it is
  // the only horizontal on this chart that means anything. Drawn only when it
  // falls inside the domain, because a reference line clamped to the frame edge
  // would imply the series is touching it.
  const ref = min < 50 && max > 50
    ? `<line class="spark__ref" x1="1" y1="${n2(y(50))}" x2="${width - 1}" y2="${n2(y(50))}" stroke-dasharray="3 4"/>` +
      textAt('spark__reflabel', 2, y(50) - 2.5, 'start', 8, '50')
    : '';

  const first = pts[0];
  const lastV = pts[pts.length - 1];
  const dir = lastV > first ? 'up' : lastV < first ? 'down' : 'level';
  const body = head +
    `<path class="spark__area" d="${area}"/>` + ref +
    `<path class="spark__line" d="${d}"/>` +
    `<circle class="spark__ring" cx="${n2(lx)}" cy="${n2(ly)}" r="4.6"/>` +
    `<circle class="spark__dot" cx="${n2(lx)}" cy="${n2(ly)}" r="2.4"/>` + '</svg>';

  return seal(body, label || 'Score history',
    `${pts.length} observations, ${dir} from ${f1(first)} to ${f1(lastV)} of 100. ` +
    `Range ${f1(Math.min(...pts))} to ${f1(Math.max(...pts))}.`);
}

// ---------------------------------------------------------------------------
// 4. gauge — the hero score as a bounded arc
// ---------------------------------------------------------------------------

// Geometry chosen against a rendered screenshot, not on paper. Two things it
// has to satisfy that are not obvious until you look at it:
//
//   - The tick labels must clear the LIVE segment, which is drawn six units
//     thicker than the others and therefore bulges past the nominal radius.
//     Ticks start outside r + liveSw/2, not outside r + sw/2.
//   - THERE IS NO NEEDLE. A hub-to-rim needle in a semicircle runs straight
//     through the middle of the dial, which is the only place the number can
//     go; the first render had the pointer bisecting "61.4". The position is
//     marked instead by a radial bar crossing the arc plus a dot centred on it
//     - a speedometer redline mark. It is unambiguous, it never collides with
//     anything, and it leaves the centre of the dial for the value.
const GAUGE = { w: 320, h: 192, cx: 160, cy: 150, r: 104, sw: 14, liveSw: 20, gapDeg: 1.4 };

/**
 * A bounded 0–100 arc with the five bands laid on it, so the score is read as a
 * POSITION IN A RANGE rather than as a free-floating number. AQI dual-output:
 * the digit and the band name are both printed, and the needle points at the
 * band it names.
 *
 * @param {number|null} score
 * @param {object} [opts]
 * @param {boolean} [opts.showValue=true]
 */
export function gauge(score, opts = {}) {
  const g = GAUGE;
  const s = Number.isFinite(score) ? clamp(score, 0, 100) : null;
  const band = bandFor(s);
  const id = hashId('gg', `${opts.id || ''}|${s === null ? 'null' : s.toFixed(4)}`);

  const ang = (v) => Math.PI + (clamp(v, 0, 100) / 100) * Math.PI; // 180deg -> 360deg
  const px = (v, rad) => g.cx + rad * Math.cos(ang(v));
  const py = (v, rad) => g.cy + rad * Math.sin(ang(v));

  let out = openSvg('ch__svg--gauge', g.w, g.h, `${id}t`, `${id}d`);

  // Band arcs, separated by a visible gap so five segments are countable
  // without reference to colour.
  const gapV = (g.gapDeg / 180) * 100;
  for (const b of BANDS) {
    const lo = b.lo + (b.lo === 0 ? 0 : gapV);
    const hi = b.hi - (b.hi === 100 ? 0 : gapV);
    if (hi <= lo) continue;
    // Same radius for every segment; the live one differs by STROKE WIDTH
    // (see .ch-g-seg--live), so it reads as thicker rather than as displaced.
    const path = `M${n2(px(lo, g.r))},${n2(py(lo, g.r))} A${g.r},${g.r} 0 0 1 ${n2(px(hi, g.r))},${n2(py(hi, g.r))}`;
    const live = band && b.level === band.level && s !== null;
    out += `<path class="ch-g-seg${live ? ' ch-g-seg--live' : ''}" d="${path}"/>`;
  }

  // Boundary ticks, outside the arc, with the score that starts each band.
  // Cleared from the LIVE stroke width, not the base one - see the note above.
  for (const e of EDGES) {
    const inner = g.r + g.liveSw / 2 + 12;
    const outer = inner + 4;
    out += `<line class="ch-g-tick" x1="${n2(px(e, inner))}" y1="${n2(py(e, inner))}" ` +
      `x2="${n2(px(e, outer))}" y2="${n2(py(e, outer))}"/>`;
    const lr = outer + 7;
    const anchor = e === 0 ? 'start' : e === 100 ? 'end' : 'middle';
    out += textAt('ch-g-ticklabel', px(e, lr), py(e, lr) + 3, anchor, 9, String(e));
  }

  if (s === null) {
    out += textAt('ch-note', g.cx, g.cy - 34, 'middle', 12, 'No score');
    out += textAt('ch-note ch-note--dim', g.cx, g.cy - 18, 'middle', 9.5, 'index not yet computed');
    const body = seal(out + '</svg>', `${brand.NAME} score gauge`,
      'No composite score is available, so no position is marked on the 0 to 100 arc.');
    return figure('ch--gauge', body,
      opts.caption !== undefined ? opts.caption : 'No composite score yet — nothing is marked on the arc.');
  }

  // Position mark: a radial bar crossing the whole arc plus a dot centred on
  // it. Ink, not accent, so it stays visible over the accent-filled live
  // segment - colour is never what tells you where the needle is.
  const inR = g.r - g.liveSw / 2 - 5;
  const outR = g.r + g.liveSw / 2 + 5;
  out += `<line class="ch-g-mark" x1="${n2(px(s, inR))}" y1="${n2(py(s, inR))}" x2="${n2(px(s, outR))}" y2="${n2(py(s, outR))}"/>`;
  out += `<circle class="ch-g-markdot" cx="${n2(px(s, g.r))}" cy="${n2(py(s, g.r))}" r="3.4"/>`;

  if (opts.showValue !== false) {
    out += textAt('ch-g-val', g.cx, g.cy - 32, 'middle', 40, f1(s));
    out += textAt('ch-g-of', g.cx, g.cy - 17, 'middle', 9.5, 'OF 100');
  }
  out += textAt('ch-g-band', g.cx, g.cy + 24, 'middle', 11,
    `${band.name} · ${band.label}`);

  const title = `${brand.NAME} composite score ${f1(s)} of 100`;
  const desc = `A 0 to 100 arc divided into the five level bands. The needle points at ${f1(s)}, ` +
    `which falls in ${band.name}, ${band.label}, level ${band.level}. ` +
    'Band boundaries are marked at 0, 35, 55, 70, 85 and 100.';
  return figure('ch--gauge', seal(out + '</svg>', title, desc),
    opts.caption !== undefined ? opts.caption
      : `${f1(s)} of 100 — ${brand.NAME} ${band.level}, ${band.name} (${band.label}).`);
}

// ---------------------------------------------------------------------------
// 5. distributionStrip — the differentiator, drawn
// ---------------------------------------------------------------------------

const DIST = { w: 380, h: 112, l: 10, r: 10, t: 10, b: 30 };

/**
 * Where today sits in the FROZEN reference distribution.
 *
 * This is the one chart that draws our actual differentiator. Every competitor
 * in the category produces a number by human or model judgement (TEARDOWN 4);
 * ours is an empirical percentile against published history, and this strip is
 * that sentence made visible: here is the record, here is today inside it.
 *
 * The curve is the normal the score scale is defined against — the engine maps
 * an empirical percentile through the inverse normal CDF to S = 50 + 12.5z, so
 * a normal with mean 50 and sd 12.5 IS the score-space reference, not a
 * decorative bell.
 *
 * @param {number|null} percentile  0..1
 * @param {object} [opts]
 * @param {number} [opts.score]     score to place the marker at; derived if absent
 * @param {'uncalibrated'|'dark'|string} [opts.missing]
 * @param {string} [opts.subject]   what is being placed, e.g. "Today"
 */
export function distributionStrip(percentile, opts = {}) {
  const g = DIST;
  const pw = g.w - g.l - g.r;
  const ph = g.h - g.t - g.b;
  const x0 = g.l;
  const y0 = g.t;
  const base = y0 + ph;
  const subject = opts.subject || 'Today';

  const p = Number.isFinite(percentile) ? clamp(percentile, 0, 1) : null;
  const score = Number.isFinite(opts.score)
    ? clamp(opts.score, 0, 100)
    : p === null ? null : clamp(50 + 12.5 * probit(clamp(p, 1e-6, 1 - 1e-6)), 0, 100);

  const id = hashId('ds', `${opts.id || ''}|${p === null ? 'null' : p.toFixed(6)}|${score === null ? 'null' : score.toFixed(4)}|${opts.missing || ''}`);
  const xFor = (v) => x0 + (clamp(v, 0, 100) / 100) * pw;

  // Normal density over the score axis, peak normalised to the plot height.
  const dens = (v) => Math.exp(-0.5 * ((v - 50) / 12.5) ** 2);
  const N = 100;
  const curve = [];
  for (let i = 0; i <= N; i += 1) {
    const v = (i / N) * 100;
    curve.push(`${n2(xFor(v))},${n2(base - dens(v) * (ph - 2))}`);
  }
  const curvePath = `M${curve.join(' L')}`;
  const fullArea = `${curvePath} L${n2(x0 + pw)},${n2(base)} L${n2(x0)},${n2(base)} Z`;

  let out = openSvg('ch__svg--dist', g.w, g.h, `${id}t`, `${id}d`);
  out += `<path class="ch-d-rest" d="${fullArea}"/>`;

  if (score !== null) {
    // Everything the record has been QUIETER than today, filled. The filled
    // fraction is the percentile, drawn as area rather than asserted as a digit.
    const cut = curve.filter((_, i) => (i / N) * 100 <= score);
    if (cut.length >= 2) {
      const lead = `M${cut.join(' L')} L${n2(xFor(score))},${n2(base)} L${n2(x0)},${n2(base)} Z`;
      out += `<path class="ch-d-fill" d="${lead}"/>`;
    }
  }
  out += `<path class="ch-d-curve" d="${curvePath}"/>`;
  out += `<line class="ch-d-base" x1="${n2(x0)}" y1="${n2(base)}" x2="${n2(x0 + pw)}" y2="${n2(base)}"/>`;

  // Decile ticks, placed by percentile rather than by score, so the spacing
  // itself shows that the axis is a distribution and not a ruler.
  for (let k = 1; k <= 9; k += 1) {
    const v = 50 + 12.5 * probit(k / 10);
    out += `<line class="ch-d-tick" x1="${n2(xFor(v))}" y1="${n2(base)}" x2="${n2(xFor(v))}" y2="${n2(base + (k === 5 ? 6 : 3.5))}"/>`;
  }
  out += textAt('ch-d-ax', x0, base + 19, 'start', 9, 'QUIETER');
  out += textAt('ch-d-ax', x0 + pw, base + 19, 'end', 9, 'LOUDER');
  out += textAt('ch-d-ax ch-d-ax--dim', x0 + pw / 2, base + 19, 'middle', 9, 'MEDIAN');

  if (score === null) {
    const word = opts.missing === 'dark'
      ? 'SOURCE DARK · nothing to place'
      : opts.missing === 'uncalibrated' || opts.missing === undefined || opts.missing === null
        ? 'AWAITING BASELINE · no frozen reference yet'
        : String(opts.missing);
    // NO MARKER. A dashed rule down the median said "here, roughly" about a
    // reading we explicitly do not have a position for, which is imputation
    // drawn rather than computed. The curve is the record; the sentence says we
    // cannot place today inside it. That is the whole state.
    out += textAt('ch-note', x0 + pw / 2, y0 + 12, 'middle', 9.5, word);
    const title = 'Position in the frozen reference distribution';
    const desc = opts.missing === 'dark'
      ? 'The source is dark, so there is no reading to place in the reference distribution. This is not a reading of zero.'
      : 'There is no frozen reference distribution for this reading yet, so it is collected and published but not placed. ' +
        'This is not the same as a dark source, and not the same as a low score.';
    return figure('ch--dist', seal(out + '</svg>', title, desc),
      opts.caption !== undefined ? opts.caption
        : (opts.missing === 'dark'
          ? 'Source dark — nothing to place in the reference distribution.'
          : 'Awaiting baseline — collected and published, not yet placed against the record.'));
  }

  const mx = xFor(score);
  out += `<line class="ch-d-marker" x1="${n2(mx)}" y1="${n2(y0 - 2)}" x2="${n2(mx)}" y2="${n2(base + 7)}"/>`;
  out += `<path class="ch-d-caret" d="M${n2(mx - 4.5)},${n2(base + 13)} L${n2(mx + 4.5)},${n2(base + 13)} L${n2(mx)},${n2(base + 5.5)} Z"/>`;
  const pct = p === null ? null : p * 100;
  const lbl = pct === null ? `${f1(score)}` : `${ordinal(pct)} pctl`;
  // Always BESIDE the marker, never centred on it. A centred label sits exactly
  // where the marker line is, and the knockout stroke is too thin at this size
  // to rescue it - "51st pctl" came out with the rule running through the gap.
  // Which side is chosen by which half of the plot the marker is in, so the
  // label can never run off the viewBox either.
  const toLeft = mx > x0 + pw / 2;
  out += textAt('ch-d-val', toLeft ? mx - 5 : mx + 5, y0 + 9, toLeft ? 'end' : 'start', 10.5, lbl);

  const title = pct === null
    ? `${subject} at ${f1(score)} of 100 in the reference distribution`
    : `${subject} at the ${ordinal(pct)} percentile of the reference distribution`;
  const desc = (pct === null
    ? `${subject} scores ${f1(score)} of 100. `
    : `${subject} sits at the ${ordinal(pct)} percentile: the record has been quieter than this ${Math.round(pct)} per cent of the time. `) +
    'The curve is the frozen reference distribution the score scale is defined against, built once from historical backfill ' +
    'and never updated live. Ticks along the baseline mark each decile.';
  const caption = opts.caption !== undefined ? opts.caption : (
    pct === null
      ? `${subject}: ${f1(score)} of 100 against the frozen reference record.`
      : `${ordinal(pct)} percentile — the record has been quieter than ${subject.toLowerCase()} ${Math.round(pct)}% of the time.`
  );

  return figure('ch--dist', seal(out + '</svg>', title, desc), caption);
}
