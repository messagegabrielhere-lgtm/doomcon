// ---------------------------------------------------------------------------
// THE MARKS. Logo, favicon, touch icons, manifest, default OG image.
//
// WHAT THE MARK IS: A TRIPWIRE, NOT A CLOCK.
//
// The publication is the AI EARLY WARNING SYSTEM (site/brand.mjs PUBLICATION).
// Every other instrument in this category draws a clock: the Doomsday Clock,
// the IMD AI Safety Clock, skynetcountdown's countdown. A clock is a claim
// about how much time is left, which is a claim about the future, which is the
// one sentence docs/VOICE.md §1 forbids us. We would be drawing our own ban.
//
// So the mark is a WIRE strung across a frame, and the reading is how far
// something has pulled it up:
//
//   DOOMCON 5     the wire is dead flat. Strung, armed, nothing touching it.
//   DOOMCON 4..1  the wire is snagged upward into one hard spike, higher and
//                 hotter the louder the reading.
//
// A wire reports a deflection that has ALREADY happened; it has no opinion
// about what comes next. That is "Detected early, never predicted. We just
// count." rendered as geometry rather than asserted as a slogan.
//
// THE THING NOBODY ELSE IN THE CATEGORY DOES is unchanged and is the whole
// reason this stayed generated rather than becoming a file in assets/logos/:
// the apex is computed from the level, so THE TAB ICON CARRIES THE READING.
// pizzint ships a static flag; DoomBench, the IMD clock and skynetcountdown
// ship a static logo. Ours comes off the same state.json that produced the
// number on the page, so it cannot disagree with it.
//
// ---------------------------------------------------------------------------
// WHY THIS REPLACED THE GRILLE, AND WHAT IT COST.
//
// The mark this file drew until 2026-09-25 was a detector seen face-on: a
// ring, a five-slot grille and a central lamp, with the slots lit from the
// calm end up to the current level. The comment that stood here argued that
// the COUNT of lit slots was the mark's first carrier, that it stayed
// countable with the hue removed, and that 1.11 device pixels of clear space
// between slots kept it countable at 16px.
//
// THAT CLAIM WAS TESTED AND IT IS FALSE IN PRACTICE. All five levels were
// rasterised at 16px and 32px, in colour and in greyscale. At 16px every level
// is the same small ring with a dot in it — the slots close up against the
// ring and against each other and nothing is countable. At 32px in greyscale
// the five states are still not rankable. The count carrier did not survive
// contact with a rasteriser, so the paragraph that asserted it has been
// deleted rather than softened: a comment that contradicts the render is worse
// than no comment.
//
// The wire was tested the same way and it does survive. Five states that can
// be ranked at 16px with the hue stripped out, because the carrier is the
// HEIGHT OF ONE EDGE against a flat baseline, which is the largest signal a
// 16px tile can hold.
//
// WHAT IT GIVES UP — stated here because the file that hides it will mislead
// whoever reads it next:
//
//   1. COUNT IS GONE as an independent carrier. The level is now an ordinal
//      MAGNITUDE, not a tally. Adjacent levels differ by ~1.5 device pixels of
//      apex height at 16px. DOOMCON 5 is instantly distinct from everything
//      (it is the only flat state) and 1 from 4, but 2 AND 3 ARE NOT RELIABLY
//      SEPARABLE AT 16px IN GREYSCALE. Two and a half carriers, not three, and
//      the middle of the scale is the weak part. The grille was better at this
//      in theory and worse at it in fact, which is why this is still a trade
//      worth taking.
//   2. DOOMCON 5 IS A BARE HORIZONTAL LINE. Right as a reading and right as an
//      armed state; thin as a press-kit asset on a quiet day. The mark is at
//      its most legible when the news is bad.
//   3. IT READS AS AN EVENT, NOT AS AN OBJECT. The grille read as an
//      instrument you could pick up. A line with a peak is close to sparkline
//      territory. Deliberate — the publication is a feed, not a device — but
//      it is a trade, and some readers will call it a chart.
//
// The carrier OUTSIDE the image is unchanged and still does the real work: the
// <title> printed beside the tab icon reads `DOOMCON 4 — ROUTINE · …`, which
// layout.mjs already emits. The mark is never unlabelled in situ.
//
// NEVER COLOUR ALONE still holds. Apex height is the reading; HEAT[level] is
// confirmation, never the reading. On a white ground the dark ramp does not
// clear 4.5:1, so there is a second ramp — HEAT_LIGHT — which is a real
// substitution, not an opacity.
//
// ---------------------------------------------------------------------------
// ZERO DEPENDENCIES, INCLUDING FOR THE PNGs.
//
// docs/CONTRACT.md §1 forbids npm dependencies, and collector/card.mjs settled
// the matter for share cards by emitting SVG and letting a browser rasterise.
// That answer does not reach here, because two of the assets below MUST be
// raster or they do not work at all:
//
//   apple-touch-icon   iOS ignores SVG. There is no SVG path to a home-screen
//                      icon. It is PNG or it is a screenshot of your page.
//   og:image           site/build.mjs:314 already warns, in this repo's own
//                      words: "X and most crawlers will not render an SVG
//                      og:image". docs/COMPETITIVE.md §1.4 records this as our
//                      largest single acquisition hole.
//
// So this module carries a rasteriser. It uses `node:zlib` and nothing else,
// and it draws exactly the primitives these marks need — a BUTT-CAPPED,
// MITER-JOINED stroked polyline, a filled rounded rectangle, and a hairline
// round-joined outline — by analytic coverage, which is what gives it clean
// antialiasing at 16px without a supersampling budget. It is deterministic:
// the same level in produces the same bytes out, which CONTRACT.md §4 requires
// of everything this repo emits.
//
// The miter matters and is not decoration. The spike's flanks meet the
// horizontal runs at about 104°; a round-joined version of the same path reads
// visibly softer at every size, and soft is the one thing a tripwire must not
// be. So `strokeOutline()` below converts the stroked polyline into its true
// outline polygon — offset chains, real miters, miter-limit fallback to bevel,
// and the inner-side self-intersection spliced out where the apex flat is
// shorter than the miter reaches — and the rasteriser fills that polygon. No
// approximation and no round joins pretending to be miters.
//
// It also carries a STROKE ALPHABET, because a 1200×630 OG image with no text
// on it is a decoration rather than a share card. Forty glyphs of straight
// segments on a 6×10 grid. It is a stencil, deliberately — the register
// docs/VOICE.md §2 asks for is "an instrument room, not an oracle", and a
// stencil is what instrument rooms letter things with. It is not a substitute
// for a typeface and it is never used for body copy; it sets six short lines
// on one image.
//
// WHAT THIS FILE DOES NOT DO. It does not write files, and it does not touch
// site/build.mjs, which a human integrator owns. Everything here is a pure
// function from a level (and, for the OG image, a score) to a string or a
// Uint8Array. `brandmarkAssets()` at the bottom returns the whole set as
// `{ path, body }` so the integration is one loop.
// ---------------------------------------------------------------------------

import { deflateSync } from 'node:zlib';
import * as brand from './brand.mjs';

// ---------------------------------------------------------------------------
// 1. THE PALETTE THESE MARKS ARE DRAWN IN
//
// Literal hex, not CSS variables, and that is forced rather than chosen: a
// favicon, a manifest icon and an OG image are all rendered OUTSIDE the
// document, where site/styles.mjs's custom properties do not exist. The values
// are the dark scheme's, character for character, and docs/BRAND.md §2 is the
// table that keeps the two in step.
//
// GROUND. #060c16 rather than styles.mjs's #0b0c0e. It is the ground measured
// off pizzint on 2026-09-24 — a near-black NAVY, not a near-black grey — and
// on an icon the size of a favicon the difference is the whole character: grey
// reads as a disabled control, navy reads as an instrument that is switched
// on. The site ground has not moved (styles.mjs is not this module's to edit);
// adopting it there is item 1 of the integration note, and until then this is
// the only surface that carries it. An icon has its own ground by definition —
// it sits on the browser's chrome, never on our page — so there is no seam.
// ---------------------------------------------------------------------------

/** The instrument ground. Near-black navy. */
export const GROUND = '#060c16';
/** One step up, for the OG image's panel fills. */
export const GROUND_RAISED = '#0c1320';
/** Ink on the ground. */
export const INK = '#e8eaee';
export const INK_DIM = '#9aa2ad';
export const INK_FAINT = '#7a828c';

/**
 * THE HEAT RAMP, keyed by level, cool to hot. Identical to styles.mjs's
 * --heat-5 … --heat-1. The numbering follows the levels, so HEAT[5] is DORMANT
 * and HEAT[1] is UNPRECEDENTED.
 *
 * A temperature ramp is the right metaphor and not a smuggled risk claim: the
 * thing being measured IS how much is happening. docs/VOICE.md §1 draws that
 * line and this ramp stays on the correct side of it, because every surface
 * that spends it also prints the level's name.
 */
export const HEAT = Object.freeze({
  5: '#56b0e0',
  4: '#5fd08a',
  3: '#ffb020',
  2: '#ff8b3d',
  1: '#ff5f56',
});

/**
 * THE HEAT RAMP FOR A WHITE GROUND.
 *
 * Not an opacity and not a tint of the ramp above — a real substitution. The
 * dark ramp is tuned against #060c16 and does not survive the change of
 * ground: #ffb020 on white is about 1.7:1, which is a pale smear rather than a
 * reading. Every value here clears 4.5:1 on #ffffff, measured, which costs
 * fidelity at 3 and 2 (yellow becomes dark amber, orange becomes rust) and is
 * the right price for a mark that is legible on paper and in a light-scheme
 * browser chrome.
 */
export const HEAT_LIGHT = Object.freeze({
  5: '#1c6f9e',
  4: '#0e7a46',
  3: '#8a6500',
  2: '#a84a00',
  1: '#c4001f',
});

/** The light scheme's ground. */
export const PAPER = '#ffffff';

/** The masthead accent — sodium amber, styles.mjs's --accent. */
export const ACCENT = '#ffb020';

const LEVELS = [5, 4, 3, 2, 1];

function assertLevel(level) {
  const n = Number(level);
  if (!LEVELS.includes(n)) {
    throw new Error(`brandmarks: level ${JSON.stringify(level)} is not 1-5`);
  }
  return n;
}

/**
 * How many stops are lit at a level: 6 − level.
 *
 * THE MARK NO LONGER USES THIS. The grille it was written for is gone (see the
 * header). It stays exported because the rule it encodes is not the grille's,
 * it is the SCALE's, and the scale is still drawn in several places: the
 * five-stop level rail on every share card (collector/cards/_kit.mjs
 * levelRail) lights exactly these stops, and it currently re-derives the test
 * inline. One definition is better than two that can drift.
 *
 * READ IT ONCE AND EVERY LADDER ON THE SITE FOLLOWS. DOOMCON counts DOWN
 * toward louder — 5 is the calmest reading and 1 the loudest — so "more lit"
 * has to mean "lower number", and a naive `stop <= level` would light four
 * stops at the calmest reading and one at the loudest, which is the instrument
 * running backwards. Stop i (i = 5…1, left to right) is lit when i >= level.
 */
export function litSlots(level) {
  return 6 - assertLevel(level);
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// 2. THE GEOMETRY
//
// A 64-unit grid and ONE VARIABLE: the y of the apex. Wire height, stroke
// width, flank run and apex flat are constant across all five levels, so the
// whole mark is one path with one number substituted into it.
//
// THE NUMBERS ARE LOAD-BEARING AND THEY WERE CHOSEN AGAINST THE PIXEL GRID,
// then verified by rasterising. Do not "improve" them.
//
// At 16px, 4 grid units is exactly one device pixel.
//
//   WIRE STROKE 8 units = 2 device pixels at 16px. The wire spans y 40…48,
//               both multiples of 4, so BOTH LONG EDGES LAND ON PIXEL
//               BOUNDARIES at 16, 32, 64 and 128px. The longest and thinnest
//               element in the mark is therefore the one element that can
//               never go soft — the inverse of the usual favicon failure,
//               where the hairline dissolves first. Nothing here is a
//               hairline: the thinnest painted run is 2 device pixels at
//               favicon size.
//   APEX FLAT   3 units. The peak is CUT, never pointed, so it terminates in
//               0.75 device pixels of solid colour instead of in antialiased
//               nothing. It also caps the miter: the flanks meet the
//               horizontal runs at ~104°, a miter ratio of 1.26 at DOOMCON 4
//               and 1.33 at DOOMCON 1, so the miterlimit of 2 is a guard that
//               never fires and no join spikes outside the frame.
//   FLANK RUN   5 units each side. A 45° flank at an 18-unit deflection would
//               make the peak 43 units wide and it would stop being a spike.
//   THE BLEED   the drawn wire runs the full width of the tile, x 0…64, and
//               its butt ends land ON the tile edge rather than short of it.
//               That puts maximum ink on a 16px tile, and under the circular
//               crop X and most avatar surfaces apply it reads as passing
//               THROUGH the frame instead of being beheaded. An earlier
//               version ended at x 4…60, almost exactly where the inscribed
//               circle cuts at that height, and looked like a rendering bug.
//
// ON THE BLEED AND THE CLIP. The mark was drawn as x −2…66 clipped by the
// rounded tile. That clip is emitted here already applied, at x 0…64, and the
// two are EXACTLY equivalent for this geometry: the tile's corner radius is
// 12, so its corner arcs only bend the boundary at y < 12 and y > 52, and the
// wire lives at y 40…48 where the tile's left and right edges are straight
// verticals at x = 0 and x = 64. Clipping a horizontal butt-capped run against
// a vertical line is the same shape as ending it there. Doing it this way
// costs no clipPath element, which matters: two inline copies of the mark in
// one HTML document would otherwise collide on the clip path's id.
//
// THE FRAME. A 1-unit hairline at 18% ink on the tile's edge. Measured: on a
// dark browser chrome the navy square has no edge at all and the mark appears
// to float, which at 16px reads as a broken transparent icon. It also gives
// the butt ends of the wire something to end AGAINST, which is what makes the
// flat DOOMCON 5 state read as a strung wire rather than as a dash.
// ---------------------------------------------------------------------------

/**
 * THE APEX TABLE — the centreline y of the spike, by level.
 *
 * `null` at DOOMCON 5 means there is no spike: the wire is flat. Every other
 * value was picked by rendering the ladder and checking that consecutive
 * states are separable, then rounded to keep the apex's cut top on a clean
 * fraction of a device pixel.
 *
 * This is the whole level-responsive surface of the mark. If you want to know
 * what the favicon does with the number in state.json, it is this table.
 */
export const APEX_Y = Object.freeze({
  5: null,
  4: 26,
  3: 20,
  2: 13,
  1: 7,
});

/** The tile the mark is drawn on. */
export const LOGO_GRID = Object.freeze({
  size: 64,
  cx: 32,
  cy: 32,
  radius: 12,            // the tile's corner radius
  frameStroke: 1,        // the hairline that seats the tile on browser chrome
  frameAlpha: 0.18,      // …on the dark ground
  frameAlphaLight: 0.16, // …on white
});

const RAD = Math.PI / 180;

/** The wire itself. See the comment above before touching any of it. */
export const WIRE = Object.freeze({
  y: 44,             // the resting centreline; the wire spans y 40…48
  stroke: 8,         // 2 device pixels at 16px
  flat: 3,           // the apex's cut top
  run: 5,            // horizontal run of each flank
  miterLimit: 2,
});

/**
 * The wire's centreline, as points, already clipped to the tile.
 *
 * Six points when the wire is triggered, two when it is flat. Exported because
 * it is the one thing a consumer might legitimately want without the rest of
 * the shape list — a test that wants to assert the apex moved, for instance.
 */
export function wirePoints(level) {
  const L = assertLevel(level);
  const g = LOGO_GRID;
  const apex = APEX_Y[L];
  if (apex == null) return [[0, WIRE.y], [g.size, WIRE.y]];
  const half = WIRE.flat / 2;
  return [
    [0, WIRE.y],
    [g.cx - half - WIRE.run, WIRE.y],
    [g.cx - half, apex],
    [g.cx + half, apex],
    [g.cx + half + WIRE.run, WIRE.y],
    [g.size, WIRE.y],
  ];
}

/**
 * The mark as a list of primitives, in paint order.
 *
 * ONE description, consumed by three renderers — the SVG writer below, the
 * rasteriser further down, and site/cardpng.mjs's surface.mark(). That is
 * deliberate and it is the only way the PNG favicon, the inline SVG masthead
 * and the share cards can be guaranteed to be the same drawing: there is
 * exactly one copy of the geometry and no renderer can drift from it.
 *
 * THE SHAPE KINDS, in full — every consumer must handle all three or throw:
 *
 *   rrect        { x, y, w, h, r, color, alpha }        the tile's fill
 *   wire         { pts, w, cap, join, miterLimit,       the wire; `w` is the
 *                  color, alpha, level, apex }          STROKE width
 *   rrectStroke  { x, y, w, h, r, sw, color, alpha }    the hairline frame
 *
 * @param {number} level 1-5
 * @param {object} [opts]
 * @param {boolean} [opts.mono] draw in one colour (currentColor in SVG), for
 *   the masthead, where the mark takes the ink of the type it sits beside. The
 *   level is still legible with the hue gone: apex height is the carrier.
 * @param {string|null} [opts.ground] paint the tile's fill in this colour.
 *   Null (the default) emits no fill, for the surfaces that already have a
 *   ground of their own — the inline masthead SVG, the OG image, a card.
 * @param {boolean} [opts.frame] emit the hairline frame.
 * @param {boolean} [opts.rounded=true] round the tile's corners.
 * @param {'dark'|'light'} [opts.scheme] which heat ramp and which frame ink.
 */
export function markShapes(level, {
  mono = false, ground = null, frame = false, rounded = true, scheme = 'dark',
} = {}) {
  const L = assertLevel(level);
  const g = LOGO_GRID;
  const light = scheme === 'light';
  const r = rounded ? g.radius : 0;
  const out = [];

  if (ground) {
    out.push({
      kind: 'rrect', x: 0, y: 0, w: g.size, h: g.size, r, color: ground, alpha: 1, tile: true,
    });
  }

  out.push({
    kind: 'wire',
    pts: wirePoints(L),
    w: WIRE.stroke,
    cap: 'butt',
    join: 'miter',
    miterLimit: WIRE.miterLimit,
    // HUE IS CONFIRMATION, NOT THE READING. The apex already carries the
    // level; this makes the same statement a second time for the readers who
    // get it, and costs nothing to the readers who do not.
    color: mono ? 'currentColor' : (light ? HEAT_LIGHT : HEAT)[L],
    alpha: 1,
    level: L,
    apex: APEX_Y[L],
  });

  if (frame) {
    const half = g.frameStroke / 2;
    out.push({
      kind: 'rrectStroke',
      x: half,
      y: half,
      w: g.size - g.frameStroke,
      h: g.size - g.frameStroke,
      r: r ? r - half : 0,
      sw: g.frameStroke,
      color: mono ? 'currentColor' : (light ? GROUND_RAISED : INK),
      alpha: light ? g.frameAlphaLight : g.frameAlpha,
      frame: true,
    });
  }

  return out;
}

// ---------------------------------------------------------------------------
// 3. SVG
// ---------------------------------------------------------------------------

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const n2 = (v) => (Math.round(v * 100) / 100).toString();

/**
 * The shape list as SVG elements.
 *
 * Every kind markShapes() can emit is handled here and an unknown one THROWS.
 * That is the guard the grille never had: the old writer silently dropped a
 * shape it did not recognise, so a new primitive could reach production as a
 * hole in the icon.
 */
function shapesToSvg(shapes) {
  const parts = [];
  for (const s of shapes) {
    if (s.kind === 'rrect') {
      parts.push('<rect'
        + (s.x ? ` x="${n2(s.x)}"` : '')
        + (s.y ? ` y="${n2(s.y)}"` : '')
        + ` width="${n2(s.w)}" height="${n2(s.h)}"`
        + (s.r ? ` rx="${n2(s.r)}"` : '')
        + ` fill="${esc(s.color)}"`
        + (s.alpha === 1 ? '' : ` fill-opacity="${n2(s.alpha)}"`)
        + '/>');
    } else if (s.kind === 'wire') {
      // BUTT CAPS AND MITER JOINS ARE THE POINT. A round cap would round the
      // wire's ends where they meet the frame, and a round join would soften
      // the ~104° corners the spike is made of — which is the difference
      // between a tripwire and a sparkline.
      const d = s.pts.map(([x, y], i) => `${i ? 'L' : 'M'}${n2(x)} ${n2(y)}`).join(' ');
      parts.push(`<path d="${d}" fill="none" stroke="${esc(s.color)}"`
        + ` stroke-width="${n2(s.w)}" stroke-linecap="${esc(s.cap)}"`
        + ` stroke-linejoin="${esc(s.join)}" stroke-miterlimit="${n2(s.miterLimit)}"`
        + (s.alpha === 1 ? '' : ` stroke-opacity="${n2(s.alpha)}"`)
        + '/>');
    } else if (s.kind === 'rrectStroke') {
      parts.push(`<rect x="${n2(s.x)}" y="${n2(s.y)}"`
        + ` width="${n2(s.w)}" height="${n2(s.h)}"`
        + (s.r ? ` rx="${n2(s.r)}"` : '')
        + ` fill="none" stroke="${esc(s.color)}"`
        + (s.sw === 1 ? '' : ` stroke-width="${n2(s.sw)}"`)
        + (s.alpha === 1 ? '' : ` stroke-opacity="${n2(s.alpha)}"`)
        + '/>');
    } else {
      throw new Error(`brandmarks: no SVG writer for shape kind ${JSON.stringify(s.kind)}`);
    }
  }
  return parts.join('');
}

/**
 * THE MASTHEAD MARK. Inline SVG, one colour, sized in `em` so it rides the
 * type it sits beside.
 *
 * Decorative by default and that is not laziness — it is the same rule
 * _icons.mjs and _avatars.mjs are built on. In the masthead the words
 * "DOOMCON" and "AI Early Warning System" are printed immediately beside it,
 * so an aria-label here makes a screen reader say the name twice. Pass `label`
 * only where the mark genuinely stands alone.
 *
 * @param {number} level
 * @param {object} [opts]
 * @param {string} [opts.className]
 * @param {string} [opts.label]  accessible name; makes the mark non-decorative
 * @param {string|number} [opts.size] a CSS length. Omit it and `.dcmark` sizes
 *   it in em.
 * @param {boolean} [opts.heat=false] paint the wire in the heat ramp instead
 *   of currentColor. For the one place it is the subject rather than the
 *   byline.
 * @param {'dark'|'light'} [opts.scheme='dark'] only consulted under `heat`;
 *   in mono the mark is currentColor and follows the page by itself.
 */
export function logoMark(level, opts = {}) {
  const {
    className = '', label = null, size = null, heat = false, scheme = 'dark',
  } = opts;
  // THE FRAME COMES ALONG, THE FILL DOES NOT. Inline in the masthead the mark
  // sits on whatever the page's ground is, so a fill would be a patch of the
  // wrong colour on the light scheme; the hairline is currentColor at 18% and
  // is what stops the flat DOOMCON 5 wire reading as a stray dash.
  const shapes = markShapes(level, { mono: !heat, frame: true, scheme });
  const cls = `dcmark${className ? ` ${esc(className)}` : ''}`;
  const style = size
    ? ` style="--mark:${esc(typeof size === 'number' ? `${size}px` : size)}"` : '';
  const a11y = label ? ` role="img" aria-label="${esc(label)}"` : ' aria-hidden="true"';
  return `<svg class="${cls}" viewBox="0 0 ${LOGO_GRID.size} ${LOGO_GRID.size}"${style}${a11y}`
    + ` focusable="false">${shapesToSvg(shapes)}</svg>`;
}

/**
 * THE MASTHEAD LOCKUP. The mark, the wordmark, and the publication line, as
 * HTML — the text is real text, so it is selectable, translatable, indexable
 * and set in the site's own typeface. An SVG wordmark would be none of those.
 *
 * The accessible name of the whole thing is the text, not the mark; the mark
 * carries aria-hidden. One name, once.
 *
 * `.dclock*` is this module's namespace. Grepped before choosing against
 * styles.mjs and all 34 templates: no collision. The paint for it is the one
 * block this module asks the integrator to add, and it is printed verbatim in
 * `LOCKUP_CSS` below so it can be pasted rather than re-derived.
 */
/**
 * Resolve an operator slot from the manifest site/build.mjs passes as
 * `ctx.logos`. Accepts an Array, a Set or an Object keyed by filename (a falsy
 * value counts as absent), because the shape of that manifest is the build's
 * business, not ours. SVG is preferred over PNG when an operator ships both.
 *
 * Never touches the filesystem — it only maps a name to a URL. If nothing
 * matches, the caller falls back to the mark we generate, which is the path
 * that has the tests on it.
 */
function operatorSlot(logos, base) {
  if (!logos) return null;
  const has = Array.isArray(logos) || logos instanceof Set
    ? (n) => (logos instanceof Set ? logos.has(n) : logos.includes(n))
    : (n) => Boolean(logos[n]);
  for (const ext of ['svg', 'png']) {
    const name = `${base}.${ext}`;
    if (has(name)) return name;
  }
  return null;
}

export function mastheadLockup(level, { href = '/', current = false, logos = null, logoHref = null } = {}) {
  const L = assertLevel(level);
  const meta = brand.levelMeta(L);

  // An operator file wins over the generated mark; absent, nothing changes.
  const resolve = typeof logoHref === 'function' ? logoHref : (n) => `/logos/${n}`;
  const opMark = logoHref ? operatorSlot(logos, 'mark') : null;
  const opWord = logoHref ? operatorSlot(logos, 'wordmark') : null;

  // alt is deliberately empty on the mark (the wordmark beside it already names
  // the publication, so alt text here would be read twice) and is the name on
  // the wordmark, so replacing the text cannot cost the page its accessible name.
  const markHtml = opMark
    ? `<img class="dclock__m dclock__m--op" src="${esc(resolve(opMark))}" alt="" width="30" height="30" decoding="async">`
    : logoMark(L, { className: 'dclock__m' });
  const wordHtml = opWord
    ? `<img class="dclock__wm" src="${esc(resolve(opWord))}" alt="${esc(brand.NAME)}" decoding="async">`
    : `<b class="dclock__w">${esc(brand.NAME)}</b>`;

  const inner =
    `${markHtml}`
    + `<span class="dclock__t">`
    + `${wordHtml}`
    + `<span class="dclock__p">${esc(brand.PUBLICATION)}</span>`
    + `</span>`
    // The reading, in text, beside the mark. This is the label that makes the
    // mark legal under the site's own rule, and it is also the thing cluster A
    // in docs/VISITORS.md came for.
    + `<span class="vh">Currently ${esc(brand.NAME)} ${L}, ${esc(meta.name)}.</span>`;
  return current
    ? `<span class="dclock" aria-current="page">${inner}</span>`
    : `<a class="dclock" href="${esc(href)}">${inner}</a>`;
}

/** The paint for `mastheadLockup()`. Pasted into site/styles.mjs by the
 *  integrator; exported so the two cannot be transcribed apart. */
export const LOCKUP_CSS = `
.dcmark { width: var(--mark, 1.6em); height: var(--mark, 1.6em);
  display: inline-block; flex: 0 0 auto; color: inherit; vertical-align: -0.28em; }
.dclock { display: inline-flex; align-items: center; gap: var(--s-2);
  text-decoration: none; color: inherit; }
.dclock__m { --mark: 30px; color: var(--accent); }
.dclock__t { display: flex; flex-direction: column; line-height: 1.05; min-width: 0; }
.dclock__w { font-family: var(--mono); font-size: var(--t-lg); font-weight: 700;
  letter-spacing: 0.08em; color: var(--ink); }
.dclock__p { font-family: var(--mono); font-size: var(--t-2xs); letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--ink-faint); }
a.dclock:hover .dclock__w { color: var(--accent); }
.dclock__m--op { width: 30px; height: 30px; object-fit: contain; }
.dclock__wm { display: block; height: 1.15em; width: auto; max-width: 62vw; object-fit: contain; object-position: left center; }
@media (max-width: 420px) { .dclock__m { --mark: 26px; } .dclock__m--op { width: 26px; height: 26px; } }
`.trim();

/**
 * THE FAVICON. A 64-unit square of ground with the mark on it.
 *
 * Generated from the level rather than stored, so it can never disagree with
 * the number on the page — the same argument site/build.mjs already makes for
 * the numeral favicon this replaces.
 *
 * @param {number} level
 * @param {object} [opts]
 * @param {boolean} [opts.rounded=true] round the ground's corners. Chrome
 *   masks the tab icon square; Safari's pinned-tab and the bookmark grids do
 *   not, and a hard square there reads as a missing icon.
 * @param {'dark'|'light'} [opts.scheme='dark'] `light` draws the same wire on
 *   white in the light heat ramp. Nothing ships this today — the icon has its
 *   own ground, so it does not follow the page — but it is the path the press
 *   kit and any printed use take, and it is tested.
 */
export function faviconSvg(level, { rounded = true, scheme = 'dark' } = {}) {
  const L = assertLevel(level);
  const meta = brand.levelMeta(L);
  const g = LOGO_GRID;
  const ground = scheme === 'light' ? PAPER : GROUND;
  // The tile, the wire and the hairline all come out of markShapes() now, so
  // this function no longer draws anything of its own. That is the point: the
  // favicon cannot be a different drawing from the card or the masthead
  // because there is only one drawing.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.size} ${g.size}" role="img"`
    + ` aria-label="${esc(`${brand.NAME} ${L}, ${meta.name}`)}">`
    + `<title>${esc(`${brand.NAME} ${L} — ${meta.name}`)}</title>`
    + shapesToSvg(markShapes(L, { ground, frame: true, rounded, scheme }))
    + `</svg>\n`;
}

/**
 * The level an OG image is for.
 *
 * `opts.level` when the caller passed one, and the level off `opts.state`
 * otherwise — site/build.mjs calls both OG builders as `({ state })`, which
 * before this fell straight through to the hardcoded 4 and pinned the default
 * share image to ROUTINE forever regardless of the reading. The mark is
 * level-responsive; an OG image that ignores the level would throw that away
 * on the single most-shared surface we have.
 */
function ogLevel(opts) {
  if (opts && opts.level != null) return opts.level;
  if (opts && opts.state && opts.state.level != null) return opts.state.level;
  return 4;
}

/**
 * THE OG IMAGE, as SVG. 1200×630.
 *
 * Emitted alongside the PNG, not instead of it: the PNG is what goes in the
 * meta tag (build.mjs:314 is right that crawlers will not rasterise SVG), and
 * this is the vector original — for the press kit, for a README, and so the
 * PNG has something to be checked against.
 *
 * THE TEXT IS REAL <text>. This one asset may use a font stack, because unlike
 * the PNG it is rendered by something that has fonts. The PNG path below sets
 * the same six lines in the stroke alphabet.
 */
export function ogImageSvg(opts = {}) {
  const L = assertLevel(ogLevel(opts));
  const lines = ogLines(L, opts);
  const g = LOGO_GRID;
  const markSize = 300;
  const mx = 86;
  const my = 346 - markSize / 2;
  const scale = markSize / g.size;
  const mono = `'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace`;
  const tx = mx + markSize + 78;
  const row = (y, text, size, fill, weight, track) => (text
    ? `<text x="${tx}" y="${y}" font-family="${mono}" font-size="${size}"`
      + (weight ? ` font-weight="${weight}"` : '')
      + ` letter-spacing="${track}" fill="${fill}">${esc(text)}</text>`
    : '');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"`
    + ` role="img" aria-label="${esc(lines.alt)}">`
    + `<title>${esc(lines.alt)}</title>`
    + `<rect width="1200" height="630" fill="${GROUND}"/>`
    + `<rect x="0" y="0" width="1200" height="8" fill="${HEAT[L]}"/>`
    + `<g transform="translate(${mx} ${my}) scale(${n2(scale)})">`
    + shapesToSvg(markShapes(L, { frame: true }))
    + `</g>`
    + row(236, lines.wordmark, 92, INK, 700, 12)
    + row(282, lines.publication, 24, INK_FAINT, null, 7)
    + row(372, lines.reading, 42, HEAT[L], 700, 3)
    + row(416, lines.gloss, 23, INK_DIM, null, 2)
    + row(456, lines.stamp, 20, INK_FAINT, null, 2)
    + row(524, lines.tagline, 23, INK_DIM, null, 2)
    + row(574, lines.domain, 23, ACCENT, null, 6)
    + `</svg>\n`;
}

/**
 * The lines the OG image sets, in one place, so the SVG and the PNG cannot
 * print different words.
 *
 * EVERY LINE IS A MEASUREMENT OR A NAME. There is no adjective on this image.
 * It is also checked against the post pre-flight's two rules by construction:
 * no future tense (the words come from brand.mjs, which obeys the ban), and
 * the domain is burned in rather than linked, which is the whole reason cards
 * exist (docs/CONTRACT.md "Post rules").
 *
 * THE STAMP IS NOT DECORATION. docs/VOICE.md §2 habit 3 — "exact clock, always
 * UTC, never relative" — applies hardest here, because an OG image is cached by
 * every platform that touches it and is the single most likely surface to be
 * looked at long after it was made. A figure with no clock on it claims to be
 * current forever. It is omitted, rather than faked, when no timestamp was
 * passed; there is no path that prints a plausible one.
 */
function ogLines(level, { score = null, domain = brand.DOMAIN, generatedAt = null } = {}) {
  const meta = brand.levelMeta(level);
  const hasScore = Number.isFinite(score);
  const reading = `${brand.NAME} ${level} / ${meta.name}`;
  const gloss = hasScore
    ? `${score.toFixed(1)} OF 100 - ${meta.band[0]}-${meta.band[1]} BAND`
    : meta.gloss.replace(/[’']/g, '').replace(/\.$/, '').toUpperCase();
  const t = generatedAt && Number.isFinite(Date.parse(generatedAt)) ? new Date(generatedAt) : null;
  const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const pad = (v) => String(v).padStart(2, '0');
  const stamp = t
    ? `OBSERVED ${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())} UTC `
      + `${pad(t.getUTCDate())} ${MON[t.getUTCMonth()]} ${t.getUTCFullYear()}`
    : null;
  return {
    wordmark: brand.NAME,
    publication: brand.PUBLICATION.toUpperCase(),
    reading: reading.toUpperCase(),
    gloss: gloss.toUpperCase(),
    stamp,
    tagline: brand.TAGLINE.toUpperCase(),
    domain: String(domain).toUpperCase(),
    alt: `${brand.NAME} ${level}, ${meta.name}. ${meta.gloss} ${brand.PUBLICATION}.`,
  };
}

/**
 * THE MANIFEST. `manifest.webmanifest`.
 *
 * Nobody in the category ships one — docs/COMPETITIVE.md §1.6 measured
 * `/manifest.json` as a 404 on pizzint and on all five AI competitors. It is
 * the cheapest uncontested item on that list: it costs 400 bytes and it is
 * what turns "a link someone sent me" into an icon on a phone's home screen,
 * which is the only install surface either site has.
 *
 * `start_url` and `scope` carry BASE_PATH, because this is a GitHub Pages
 * project site served under /doomcon and a manifest scoped to "/" is silently
 * ignored.
 */
export function manifestJson(level, { basePath = brand.BASE_PATH } = {}) {
  const L = assertLevel(level);
  const p = (rel) => `${basePath}/${rel}`;
  return `${JSON.stringify({
    name: `${brand.NAME} — ${brand.PUBLICATION}`,
    short_name: brand.NAME,
    description: brand.DISCLAIMER_SHORT,
    start_url: `${basePath}/`,
    scope: `${basePath}/`,
    display: 'standalone',
    orientation: 'portrait',
    background_color: GROUND,
    theme_color: GROUND,
    icons: [
      { src: p('icon-192.png'), sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: p('icon-512.png'), sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: p('icon-maskable-512.png'), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: p('favicon.svg'), sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  }, null, 2)}\n`;
}

/**
 * The `<head>` tags these assets want, as one string.
 *
 * Exported rather than described in prose so the integrator pastes it instead
 * of transcribing it. `href` is the ctx.href already in layout.mjs.
 */
export function headLinks({ href }) {
  return [
    `<link rel="icon" href="${esc(href('/favicon.svg'))}" type="image/svg+xml">`,
    `<link rel="icon" href="${esc(href('/favicon-32.png'))}" sizes="32x32" type="image/png">`,
    `<link rel="apple-touch-icon" href="${esc(href('/apple-touch-icon.png'))}">`,
    `<link rel="manifest" href="${esc(href('/manifest.webmanifest'))}">`,
    // NO theme-color here. layout.mjs emits one per colour scheme, and an
    // unconditional value printed after them matches in BOTH, so it won
    // outright -- Android chrome rendered the dark ground on the light page.
    // GROUND stays the manifest's colour, which is scheme-independent.
  ].join('\n');
}

// ---------------------------------------------------------------------------
// 4. THE RASTERISER
//
// Analytic coverage, not supersampling. Every primitive here has a cheap exact
// signed distance, so a pixel's coverage is `clamp(0.5 - d, 0, 1)` with d in
// device pixels — which produces the same antialiasing a real rasteriser does,
// at 16px, without a 16x sample budget.
//
// TWO WAYS OF STROKING, and the difference is the whole reason the wire looks
// like a wire:
//
//   poly  a polyline of ROUND-capped, round-joined capsules. Four lines of
//         arithmetic per segment. It draws the frame hairline and every glyph
//         in the stroke alphabet, where nobody can see a join.
//   fill  a filled polygon. The wire is stroked by turning it into its true
//         outline first (`strokeOutline`) — offset chains, real miter joins,
//         butt caps — and filling that. It costs one polygon SDF instead of
//         one capsule SDF and it is the only way to get a 104° corner that
//         stays a corner.
// ---------------------------------------------------------------------------

function hexToRgb(hex) {
  const h = String(hex).replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

/** Distance from p to the segment ab. */
function segDist(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const len2 = vx * vx + vy * vy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2));
  const dx = wx - vx * t;
  const dy = wy - vy * t;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Signed distance to a closed polygon, negative inside. NONZERO WINDING, not
 * even-odd: a stroke outline can legitimately fold over itself and even-odd
 * would punch a hole in the fold.
 */
function polyDist(px, py, pts) {
  let best = Infinity;
  let wind = 0;
  const n = pts.length;
  for (let i = 0; i < n; i += 1) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[(i + 1) % n];
    const dd = segDist(px, py, ax, ay, bx, by);
    if (dd < best) best = dd;
    const side = (bx - ax) * (py - ay) - (px - ax) * (by - ay);
    if (ay <= py) {
      if (by > py && side > 0) wind += 1;
    } else if (by <= py && side < 0) {
      wind -= 1;
    }
  }
  return (wind !== 0 ? -1 : 1) * best;
}

/** A rounded rectangle's outline, as a polyline. Eight chords a corner, which
 *  is under a tenth of a pixel of chord error on a 512px icon. */
function rrectOutline(x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  if (rr <= 0) return [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]];
  const pts = [];
  const corner = (cx, cy, a0) => {
    for (let i = 0; i <= 8; i += 1) {
      const a = (a0 + (i / 8) * 90) * RAD;
      pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
    }
  };
  corner(x + w - rr, y + rr, -90);
  corner(x + w - rr, y + h - rr, 0);
  corner(x + rr, y + h - rr, 90);
  corner(x + rr, y + rr, 180);
  pts.push(pts[0]);
  return pts;
}

/** Where two open segments cross, or null. Endpoints excluded, so a shared
 *  vertex is not an intersection. */
function segCross(p1, p2, p3, p4) {
  const ax = p2[0] - p1[0];
  const ay = p2[1] - p1[1];
  const bx = p4[0] - p3[0];
  const by = p4[1] - p3[1];
  const den = ax * by - ay * bx;
  if (Math.abs(den) < 1e-12) return null;
  const ox = p3[0] - p1[0];
  const oy = p3[1] - p1[1];
  const t = (ox * by - oy * bx) / den;
  const u = (ox * ay - oy * ax) / den;
  const E = 1e-9;
  if (t <= E || t >= 1 - E || u <= E || u >= 1 - E) return null;
  return [p1[0] + ax * t, p1[1] + ay * t];
}

/**
 * THE STROKED POLYLINE, AS AN OUTLINE POLYGON. Butt caps, miter joins, miter
 * limit. This is the primitive the sentinel wire is drawn with, in both
 * renderers — site/cardpng.mjs imports it so a card and a favicon cannot
 * disagree about what a miter is.
 *
 * WHY AN OUTLINE AND NOT A CAPSULE UNION. A union of round-capped capsules is
 * four lines of arithmetic and it is what the rest of this rasteriser uses,
 * but it can only ever produce round caps and round joins. The wire's flanks
 * meet its horizontal runs at about 104°, and rounded, that corner reads
 * visibly soft at every size — the mark stops being a snagged wire and starts
 * being a smoothed curve. So the stroke is resolved to geometry first.
 *
 * HOW. Offset the centreline by half the width to each side; at each interior
 * vertex place the miter point where the two offset lines meet, falling back
 * to a bevel when the miter ratio would exceed the limit; join the two chains
 * end to end. On the INNER side of a sharp turn those offsets overshoot each
 * other whenever the adjacent run is shorter than the miter reaches — which
 * is exactly what happens at this mark's apex, where the flat top is 3 units
 * and the miter reaches about 5 — so the fold is spliced out at the crossing.
 * The result is a simple polygon identical to what an SVG renderer paints.
 *
 * LIMIT: the splice removes any self-crossing it finds, which is right for an
 * inner-side fold and would be wrong for a path that genuinely crosses itself
 * (a figure eight). Nothing here draws one, and the guard stops after 16
 * splices rather than looping.
 *
 * @param {Array<[number, number]>} points the centreline
 * @param {number} width stroke width
 * @param {object} [o]
 * @param {number} [o.miterLimit=2]
 * @returns {Array<[number, number]>} a closed polygon, first point not repeated
 */
export function strokeOutline(points, width, { miterLimit = 2 } = {}) {
  const h = width / 2;
  const p = [];
  for (const q of points) {
    const last = p[p.length - 1];
    if (!last || Math.abs(q[0] - last[0]) > 1e-9 || Math.abs(q[1] - last[1]) > 1e-9) {
      p.push([q[0], q[1]]);
    }
  }
  if (p.length < 2) {
    throw new Error('brandmarks: strokeOutline needs at least two distinct points');
  }
  const n = p.length;
  const nor = [];
  for (let i = 1; i < n; i += 1) {
    const dx = p[i][0] - p[i - 1][0];
    const dy = p[i][1] - p[i - 1][1];
    const len = Math.hypot(dx, dy);
    nor.push([-dy / len, dx / len]);
  }
  const chain = (sgn) => {
    const out = [[p[0][0] + nor[0][0] * h * sgn, p[0][1] + nor[0][1] * h * sgn]];
    for (let i = 1; i < n - 1; i += 1) {
      const a = nor[i - 1];
      const b = nor[i];
      const mx = a[0] + b[0];
      const my = a[1] + b[1];
      const mlen = Math.hypot(mx, my);
      // |a + b| = 2·cos(half the turn), so the miter ratio is 2 / |a + b| and
      // the miter point is vertex + (a + b)·(2h / |a + b|²).
      if (mlen > 1e-9 && 2 / mlen <= miterLimit) {
        const k = (2 * h) / (mlen * mlen);
        out.push([p[i][0] + mx * k * sgn, p[i][1] + my * k * sgn]);
      } else {
        out.push([p[i][0] + a[0] * h * sgn, p[i][1] + a[1] * h * sgn]);
        out.push([p[i][0] + b[0] * h * sgn, p[i][1] + b[1] * h * sgn]);
      }
    }
    const e = nor[n - 2];
    out.push([p[n - 1][0] + e[0] * h * sgn, p[n - 1][1] + e[1] * h * sgn]);
    return out;
  };
  const ring = chain(1).concat(chain(-1).reverse());
  for (let guard = 0; guard < 16; guard += 1) {
    let spliced = false;
    for (let i = 0; i < ring.length - 1 && !spliced; i += 1) {
      for (let j = i + 2; j < ring.length - 1; j += 1) {
        const x = segCross(ring[i], ring[i + 1], ring[j], ring[j + 1]);
        if (x) {
          ring.splice(i + 1, j - i, x);
          spliced = true;
          break;
        }
      }
    }
    if (!spliced) break;
  }
  return ring;
}

/** A canvas of premultiplied-free RGBA floats. */
function canvas(w, h, bg) {
  const buf = new Float32Array(w * h * 4);
  if (bg) {
    const [r, g, b] = hexToRgb(bg);
    for (let i = 0; i < w * h; i += 1) {
      buf[i * 4] = r; buf[i * 4 + 1] = g; buf[i * 4 + 2] = b; buf[i * 4 + 3] = 255;
    }
  }
  return buf;
}

function blend(buf, w, x, y, rgb, a) {
  if (a <= 0) return;
  const i = (y * w + x) * 4;
  const inv = 1 - a;
  buf[i] = buf[i] * inv + rgb[0] * a;
  buf[i + 1] = buf[i + 1] * inv + rgb[1] * a;
  buf[i + 2] = buf[i + 2] * inv + rgb[2] * a;
  buf[i + 3] = buf[i + 3] * inv + 255 * a;
}

/**
 * Paint one primitive. `bounds` keeps the inner loop over the affected box
 * only, which is what makes a 1200×630 image with sixty glyphs finish in
 * milliseconds rather than seconds.
 */
function paint(buf, w, h, prim) {
  const rgb = hexToRgb(prim.color);
  const alpha = prim.alpha ?? 1;
  const pad = (prim.w ?? 0) / 2 + 1.5;
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  const pts = prim.pts || [];
  if (prim.kind === 'rrect') {
    x0 = prim.x - 1.5; y0 = prim.y - 1.5; x1 = prim.x + prim.w2 + 1.5; y1 = prim.y + prim.h2 + 1.5;
  } else {
    for (const [px, py] of pts) {
      x0 = Math.min(x0, px - pad); x1 = Math.max(x1, px + pad);
      y0 = Math.min(y0, py - pad); y1 = Math.max(y1, py + pad);
    }
  }
  const ix0 = Math.max(0, Math.floor(x0));
  const iy0 = Math.max(0, Math.floor(y0));
  const ix1 = Math.min(w - 1, Math.ceil(x1));
  const iy1 = Math.min(h - 1, Math.ceil(y1));

  for (let y = iy0; y <= iy1; y += 1) {
    const py = y + 0.5;
    for (let x = ix0; x <= ix1; x += 1) {
      const px = x + 0.5;
      let d;
      if (prim.kind === 'fill') {
        d = polyDist(px, py, pts);
      } else if (prim.kind === 'rrect') {
        // Rounded-rect SDF, the standard one.
        const hw = prim.w2 / 2;
        const hh = prim.h2 / 2;
        const qx = Math.abs(px - (prim.x + hw)) - hw + prim.r;
        const qy = Math.abs(py - (prim.y + hh)) - hh + prim.r;
        d = Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - prim.r;
      } else {
        // Polyline of round-capped capsules.
        let best = Infinity;
        if (pts.length === 1) {
          best = Math.hypot(px - pts[0][0], py - pts[0][1]);
        } else {
          for (let i = 1; i < pts.length; i += 1) {
            const dd = segDist(px, py, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
            if (dd < best) best = dd;
          }
        }
        d = best - prim.w / 2;
      }
      const cov = Math.max(0, Math.min(1, 0.5 - d));
      if (cov > 0) blend(buf, w, x, y, rgb, cov * alpha);
    }
  }
}

/** CRC32, for the PNG chunks. Table built once at module load. */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(data.length + 12);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

/**
 * RGBA8 PNG. Filter type 0 on every row and one deflate pass.
 *
 * Deterministic: zlib's deflate is a pure function of its input and its level,
 * so the same level in produces byte-identical bytes out on a given Node
 * image. CONTRACT.md §4 requires that of everything this repo emits, and a
 * favicon that changed on every build would also defeat every cache between us
 * and the reader.
 */
function encodePng(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y += 1) {
    raw[y * (w * 4 + 1)] = 0;
    for (let x = 0; x < w * 4; x += 1) {
      raw[y * (w * 4 + 1) + 1 + x] = Math.max(0, Math.min(255, Math.round(rgba[y * w * 4 + x])));
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;     // bit depth
  ihdr[9] = 6;     // colour type: RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * The mark's shape list, flattened into rasteriser primitives at `size`.
 *
 * EVERY KIND markShapes() CAN EMIT IS HANDLED AND AN UNKNOWN ONE THROWS — the
 * same guard the SVG writer carries, for the same reason. A dropped shape here
 * is a hole in a PNG that nothing else in the build would notice.
 *
 * @param {number} level
 * @param {number} size    the mark's box, in pixels
 * @param {object} [o]
 * @param {number} [o.inset] keep this many pixels clear inside the box
 * @param {number} [o.ox] translate the finished primitives
 * @param {number} [o.oy]
 *   …plus anything markShapes() takes (mono, ground, frame, rounded, scheme).
 */
function markPrimitives(level, size, { inset = 0, ox = 0, oy = 0, ...shapeOpts } = {}) {
  const g = LOGO_GRID;
  const live = size - inset * 2;
  const k = live / g.size;
  const T = (v) => v * k + inset;
  const out = [];
  for (const s of markShapes(level, shapeOpts)) {
    if (s.kind === 'rrect') {
      out.push({
        kind: 'rrect',
        x: ox + T(s.x), y: oy + T(s.y), w2: s.w * k, h2: s.h * k, r: s.r * k,
        color: s.color, alpha: s.alpha,
      });
    } else if (s.kind === 'wire') {
      // The stroke is resolved to its outline HERE, at device scale, so the
      // miter is computed in the same units the coverage test runs in.
      out.push({
        kind: 'fill',
        pts: strokeOutline(
          s.pts.map(([x, y]) => [ox + T(x), oy + T(y)]),
          s.w * k,
          { miterLimit: s.miterLimit },
        ),
        color: s.color, alpha: s.alpha,
      });
    } else if (s.kind === 'rrectStroke') {
      out.push({
        kind: 'poly',
        pts: rrectOutline(ox + T(s.x), oy + T(s.y), s.w * k, s.h * k, s.r * k),
        w: s.sw * k, color: s.color, alpha: s.alpha,
      });
    } else {
      throw new Error(`brandmarks: no rasteriser for shape kind ${JSON.stringify(s.kind)}`);
    }
  }
  return out;
}

/**
 * THE ICON, AS PNG.
 *
 * @param {number} level
 * @param {object} opts
 * @param {number} opts.size        square edge in pixels
 * @param {boolean} [opts.rounded]  round the ground's corners
 * @param {number} [opts.padding=0] fraction of the edge kept clear around the
 *   mark.
 *
 *   IT IS ZERO NOW AND IT USED TO BE 0.10. The grille was a ring and a ring
 *   needs its corners; the wire is drawn edge to edge on the 64-unit tile and
 *   padding fights the design — an inset wire stops short of the icon and
 *   reads as a floating hyphen instead of as something strung across the
 *   frame. The one case that still pays for padding is `maskable`, below.
 *
 *   0.20 for `maskable`, where Android may crop to a circle inscribed in the
 *   middle 80%. That crop is what forces the inset: at DOOMCON 1 the apex's
 *   top edge sits at y = 3/64 of the tile, far outside the safe circle, so a
 *   full-bleed maskable icon would have the spike beheaded.
 * @param {boolean} [opts.transparent] no ground at all. For nothing currently
 *   shipped; kept because a transparent mark is what a press kit asks for and
 *   the alternative is somebody re-deriving the geometry by hand.
 * @param {boolean} [opts.frame] the hairline. Defaults to on when the mark
 *   fills the icon and off when it is inset, because the hairline belongs on
 *   the ICON's edge — an inset one is a box drawn inside a box.
 * @param {'dark'|'light'} [opts.scheme='dark']
 * @returns {Buffer}
 */
export function iconPng(level, {
  size = 192, rounded = true, padding = 0, transparent = false,
  frame = padding === 0, scheme = 'dark',
} = {}) {
  const L = assertLevel(level);
  const g = LOGO_GRID;
  const buf = canvas(size, size, null);
  const ground = scheme === 'light' ? PAPER : GROUND;
  if (!transparent) {
    paint(buf, size, size, {
      kind: 'rrect', x: 0, y: 0, w2: size, h2: size,
      r: rounded ? size * (g.radius / g.size) : 0, color: ground, alpha: 1,
    });
  }
  const inset = size * padding;
  for (const p of markPrimitives(L, size, { inset, frame, scheme })) {
    paint(buf, size, size, p);
  }
  return encodePng(size, size, buf);
}

// ---------------------------------------------------------------------------
// 5. THE STROKE ALPHABET
//
// Straight segments on a 6-wide, 10-tall grid, baseline at y=10. Forty glyphs,
// which is every character the OG image sets and nothing else.
//
// IT IS A STENCIL ON PURPOSE. Curves would need a curve primitive in the
// rasteriser and a hinting story at small sizes; chamfered corners need
// neither and they are what instrument panels, survey markers and equipment
// cases are actually lettered with. docs/VOICE.md §2 asks for "an instrument
// room, not an oracle" — this is that, in a typeface.
//
// IT IS NOT A TYPEFACE. It sets six short lines on one image at 24-96px. Body
// copy is Inter Tight and JetBrains Mono, set by the browser, everywhere else.
// ---------------------------------------------------------------------------

const GLYPH_W = 6;
const GLYPH_H = 10;

/** char -> array of polylines, each an array of [x, y] on the 6x10 grid. */
const GLYPHS = {
  A: [[[0, 10], [3, 0], [6, 10]], [[1.1, 6.6], [4.9, 6.6]]],
  B: [[[0, 0], [0, 10]], [[0, 0], [4.3, 0], [5.8, 1.5], [5.8, 3.5], [4.3, 5], [0, 5]],
    [[0, 5], [4.5, 5], [6, 6.5], [6, 8.5], [4.5, 10], [0, 10]]],
  C: [[[6, 2.2], [4.2, 0], [1.8, 0], [0, 2.2], [0, 7.8], [1.8, 10], [4.2, 10], [6, 7.8]]],
  D: [[[0, 0], [0, 10]], [[0, 0], [4, 0], [6, 2.2], [6, 7.8], [4, 10], [0, 10]]],
  E: [[[6, 0], [0, 0], [0, 10], [6, 10]], [[0, 5], [4.6, 5]]],
  F: [[[6, 0], [0, 0], [0, 10]], [[0, 5], [4.4, 5]]],
  G: [[[6, 2.2], [4.2, 0], [1.8, 0], [0, 2.2], [0, 7.8], [1.8, 10], [4.2, 10], [6, 7.8], [6, 5.4], [3.3, 5.4]]],
  H: [[[0, 0], [0, 10]], [[6, 0], [6, 10]], [[0, 5], [6, 5]]],
  I: [[[0.7, 0], [5.3, 0]], [[3, 0], [3, 10]], [[0.7, 10], [5.3, 10]]],
  J: [[[5.6, 0], [5.6, 7.6], [3.8, 10], [1.7, 10], [0, 8.1]]],
  K: [[[0, 0], [0, 10]], [[6, 0], [0.3, 5.4]], [[2.2, 3.7], [6, 10]]],
  L: [[[0, 0], [0, 10], [5.8, 10]]],
  M: [[[0, 10], [0, 0], [3, 4.6], [6, 0], [6, 10]]],
  N: [[[0, 10], [0, 0], [6, 10], [6, 0]]],
  O: [[[1.9, 0], [4.1, 0], [6, 2.2], [6, 7.8], [4.1, 10], [1.9, 10], [0, 7.8], [0, 2.2], [1.9, 0]]],
  P: [[[0, 10], [0, 0], [4.3, 0], [6, 1.8], [6, 4], [4.3, 5.8], [0, 5.8]]],
  Q: [[[1.9, 0], [4.1, 0], [6, 2.2], [6, 7.8], [4.1, 10], [1.9, 10], [0, 7.8], [0, 2.2], [1.9, 0]],
    [[3.7, 7.1], [6.2, 10.4]]],
  R: [[[0, 10], [0, 0], [4.3, 0], [6, 1.8], [6, 4], [4.3, 5.8], [0, 5.8]], [[3.2, 5.8], [6, 10]]],
  S: [[[6, 1.9], [4.2, 0], [1.8, 0], [0, 1.8], [0, 3.4], [1.6, 5], [4.4, 5], [6, 6.6], [6, 8.2],
    [4.2, 10], [1.8, 10], [0, 8.1]]],
  T: [[[0, 0], [6, 0]], [[3, 0], [3, 10]]],
  U: [[[0, 0], [0, 7.8], [1.9, 10], [4.1, 10], [6, 7.8], [6, 0]]],
  V: [[[0, 0], [3, 10], [6, 0]]],
  W: [[[0, 0], [1.4, 10], [3, 3.6], [4.6, 10], [6, 0]]],
  X: [[[0, 0], [6, 10]], [[6, 0], [0, 10]]],
  Y: [[[0, 0], [3, 5.2], [6, 0]], [[3, 5.2], [3, 10]]],
  Z: [[[0, 0], [6, 0], [0, 10], [6, 10]]],
  0: [[[1.9, 0], [4.1, 0], [6, 2.2], [6, 7.8], [4.1, 10], [1.9, 10], [0, 7.8], [0, 2.2], [1.9, 0]],
    [[1.3, 8.1], [4.7, 1.9]]],
  1: [[[0.7, 2.1], [3, 0], [3, 10]], [[0.8, 10], [5.2, 10]]],
  2: [[[0, 2], [1.8, 0], [4.2, 0], [6, 1.9], [6, 3.6], [0, 10], [6, 10]]],
  3: [[[0, 1.8], [1.8, 0], [4.2, 0], [6, 1.8], [6, 3.4], [4.4, 5], [2.4, 5]],
    [[4.4, 5], [6, 6.6], [6, 8.2], [4.2, 10], [1.8, 10], [0, 8.2]]],
  4: [[[4.6, 10], [4.6, 0], [0, 7], [6, 7]]],
  5: [[[6, 0], [0, 0], [0, 4.4], [4.2, 4.4], [6, 6.2], [6, 8.2], [4.2, 10], [1.6, 10], [0, 8.4]]],
  6: [[[5.4, 0.7], [3.6, 0], [1.5, 0.8], [0, 3.4], [0, 7.9], [1.9, 10], [4.1, 10], [6, 7.9], [6, 6.6],
    [4.1, 4.6], [1.9, 4.6], [0, 6.6]]],
  7: [[[0, 0], [6, 0], [2, 10]]],
  8: [[[2, 5], [0.2, 3.4], [0.2, 1.7], [2, 0], [4, 0], [5.8, 1.7], [5.8, 3.4], [4, 5], [2, 5],
    [0, 6.7], [0, 8.3], [1.9, 10], [4.1, 10], [6, 8.3], [6, 6.7], [4, 5]]],
  9: [[[0.6, 9.3], [2.4, 10], [4.5, 9.2], [6, 6.6], [6, 2.1], [4.1, 0], [1.9, 0], [0, 2.1], [0, 3.4],
    [1.9, 5.4], [4.1, 5.4], [6, 3.4]]],
  '.': [[[1.1, 9.7]]],
  ',': [[[1.5, 9.3], [1.5, 9.8], [0.5, 11.3]]],
  '-': [[[0.4, 5.6], [5.6, 5.6]]],
  '/': [[[0, 10], [4.6, 0]]],
  ':': [[[1.4, 3.3]], [[1.4, 8.4]]],
  '·': [[[1.4, 5.6]]],
  '%': [[[0.6, 1.4]], [[5.4, 8.6]], [[6, 0], [0, 10]]],
  ' ': [],
};

/** Per-character advance, in grid units, before tracking. Narrow marks do not
 *  pay for a full 6-unit body; everything else does, so the alphabet sets as a
 *  near-monospace, which is the register. */
const ADVANCE = { '.': 2.6, ',': 2.6, ':': 2.8, '·': 3.0, ' ': 3.0, '/': 5.2, '-': 6, I: 6 };

/** True when this alphabet can set the string. Used by the OG builder to fail
 *  loudly at build time rather than silently dropping a character. */
export function canSet(text) {
  return [...String(text).toUpperCase()].every((c) => Object.prototype.hasOwnProperty.call(GLYPHS, c));
}

/**
 * Set a line of text as rasteriser primitives.
 *
 * @param {string} text
 * @param {object} o
 * @param {number} o.x, o.y   the left end of the BASELINE
 * @param {number} o.size     cap height in pixels
 * @param {number} [o.track]  extra advance between characters, in cap heights
 * @param {number} [o.weight] stroke width as a fraction of cap height
 */
function setText(text, { x, y, size, color, alpha = 1, track = 0.22, weight = 0.115 }) {
  const s = String(text).toUpperCase();
  const k = size / GLYPH_H;
  const w = size * weight;
  const out = [];
  let cx = x;
  for (const ch of s) {
    const g = GLYPHS[ch];
    if (!g) throw new Error(`brandmarks: the stroke alphabet has no glyph for ${JSON.stringify(ch)}`);
    for (const line of g) {
      out.push({
        kind: 'poly',
        pts: line.map(([gx, gy]) => [cx + gx * k, y - GLYPH_H * k + gy * k]),
        w, color, alpha,
      });
    }
    const adv = ADVANCE[ch] ?? GLYPH_W;
    cx += adv * k + size * track;
  }
  return { prims: out, width: cx - x - size * track };
}

/** The width a line would set to, without setting it. For right-alignment and
 *  for the fit check below. */
function textWidth(text, size, track = 0.22) {
  const k = size / GLYPH_H;
  let w = 0;
  for (const ch of String(text).toUpperCase()) {
    w += (ADVANCE[ch] ?? GLYPH_W) * k + size * track;
  }
  return Math.max(0, w - size * track);
}

/**
 * THE DEFAULT OG IMAGE, AS PNG. 1200×630.
 *
 * "Default" is the operative word: collector/card.mjs renders the per-
 * observation share card, with the score, the delta and the pillar breakdown.
 * This is the one that sits on every page that has no card of its own —
 * /methodology, /history, the item pages, the move pages — and on the day the
 * card pipeline has not run. Today those pages emit NO og:image at all, which
 * docs/COMPETITIVE.md §1.4 records as "our largest single acquisition hole":
 * ten pages declaring `twitter:card=summary_large_image` with nothing to put
 * in it, so every share renders a blank rectangle.
 *
 * It still carries the reading, because a share card with no number on it is
 * a logo, and a logo is not a reason to click.
 *
 * FIT IS CHECKED, NOT ASSUMED. Every line is measured against the column and
 * the size is stepped down until it fits, exactly as collector/card.mjs's
 * fitSize() does — and like that one, it throws rather than shipping a line
 * that runs off the edge.
 */
export function ogImagePng(opts = {}) {
  const L = assertLevel(ogLevel(opts));
  const lines = ogLines(L, opts);
  const W = 1200;
  const H = 630;
  const buf = canvas(W, H, GROUND);

  // The level stripe. A sixth carrier of the reading, and the one that
  // survives being cropped to a square thumbnail by a feed.
  paint(buf, W, H, { kind: 'rrect', x: 0, y: 0, w2: W, h2: 8, r: 0, color: HEAT[L], alpha: 1 });

  // The mark. Its optical centre sits on the text block's centre, not on the
  // canvas's — the block runs from the wordmark's cap line (y=144) to the
  // domain's baseline (y=548), so its centre is y=346 and the mark follows it.
  // Centring the mark on the canvas instead left it visibly high, which is the
  // kind of thing that reads as "assembled" from ten feet away.
  const markSize = 300;
  const mx = 86;
  const my = 346 - markSize / 2;
  // The mark carries its own hairline frame here and no fill: the OG ground is
  // already GROUND, so a tile fill would be an invisible rectangle, while the
  // frame is what the wire's butt ends need to end against. The translate is
  // markPrimitives's job now — the old per-kind field-patching loop silently
  // failed to move anything that was not a disc or a polyline.
  for (const p of markPrimitives(L, markSize, { inset: 0, ox: mx, oy: my, frame: true })) {
    paint(buf, W, H, p);
  }

  const tx = mx + markSize + 78;
  const col = W - tx - 72;

  // baseline, text, cap height, colour, stroke weight, tracking.
  // A null text is a line we have no measurement for — the stamp, when no
  // timestamp was passed — and it is skipped, never filled.
  const rows = [
    [236, lines.wordmark, 92, INK, 0.150, 0.30],
    [282, lines.publication, 24, INK_FAINT, 0.10, 0.34],
    [372, lines.reading, 42, HEAT[L], 0.130, 0.20],
    [416, lines.gloss, 23, INK_DIM, 0.105, 0.20],
    [456, lines.stamp, 20, INK_FAINT, 0.105, 0.20],
    [524, lines.tagline, 23, INK_DIM, 0.105, 0.20],
    [574, lines.domain, 23, ACCENT, 0.120, 0.30],
  ];

  for (const [y, text, size0, color, weight, track] of rows) {
    if (!text) continue;
    if (!canSet(text)) {
      throw new Error(`brandmarks: OG line ${JSON.stringify(text)} uses a character the stroke alphabet has no glyph for`);
    }
    let size = size0;
    // Step down in whole points rather than scaling continuously, so two
    // builds of the same line land on the same size and the bytes match.
    while (size > 12 && textWidth(text, size, track) > col) size -= 1;
    if (textWidth(text, size, track) > col) {
      throw new Error(`brandmarks: OG line ${JSON.stringify(text)} does not fit ${Math.round(col)}px even at 12px`);
    }
    const { prims } = setText(text, { x: tx, y, size, color, weight, track });
    for (const p of prims) paint(buf, W, H, p);
  }

  return encodePng(W, H, buf);
}

// ---------------------------------------------------------------------------
// 6. THE WHOLE SET
// ---------------------------------------------------------------------------

/**
 * Every brand asset, as `{ path, body, type }`, ready for one write loop.
 *
 * `body` is a string for the text assets and a Buffer for the PNGs;
 * `fs.writeFile` takes either, so the integrator's loop needs no branch.
 *
 * The level comes from state.json, so every one of these is regenerated on
 * every build and none of them can disagree with the number on the page. That
 * is the same argument site/build.mjs already makes for the favicon it
 * generates today, extended to the other seven.
 *
 * @param {object} state  data/state.json
 * @param {object} [opts]
 * @param {number} [opts.score] the composite, for the OG image's second line.
 *   Omitted, the image prints the level's gloss instead — never a placeholder
 *   and never a stale figure.
 */
export function brandmarkAssets(state, opts = {}) {
  const level = assertLevel(state && state.level);
  const score = Number.isFinite(opts.score) ? opts.score
    : (state && Number.isFinite(state.score) ? state.score : null);
  const generatedAt = opts.generatedAt
    || (state && typeof state.generated_at === 'string' ? state.generated_at : null);
  return [
    // NO PADDING except on the maskable icon. See iconPng(): the wire is drawn
    // edge to edge and an inset one reads as a floating hyphen. The maskable
    // icon keeps 20% because Android's circular crop would behead the spike.
    { path: 'favicon.svg', body: faviconSvg(level), type: 'image/svg+xml' },
    { path: 'favicon-32.png', body: iconPng(level, { size: 32 }), type: 'image/png' },
    { path: 'apple-touch-icon.png', body: iconPng(level, { size: 180, rounded: false }), type: 'image/png' },
    { path: 'icon-192.png', body: iconPng(level, { size: 192 }), type: 'image/png' },
    { path: 'icon-512.png', body: iconPng(level, { size: 512 }), type: 'image/png' },
    { path: 'icon-maskable-512.png', body: iconPng(level, { size: 512, rounded: false, padding: 0.20 }), type: 'image/png' },
    { path: 'manifest.webmanifest', body: manifestJson(level), type: 'application/manifest+json' },
    { path: 'og-default.png', body: ogImagePng({ level, score, generatedAt }), type: 'image/png' },
    { path: 'og-default.svg', body: ogImageSvg({ level, score, generatedAt }), type: 'image/svg+xml' },
  ];
}
