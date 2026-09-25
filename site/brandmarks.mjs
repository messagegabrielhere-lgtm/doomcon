// ---------------------------------------------------------------------------
// THE MARKS. Logo, favicon, touch icons, manifest, default OG image.
//
// WHY A DETECTOR AND NOT A CLOCK.
//
// The publication is the AI EARLY WARNING SYSTEM (site/brand.mjs PUBLICATION).
// Every other instrument in this category draws a clock: the Doomsday Clock,
// the IMD AI Safety Clock, skynetcountdown's countdown. A clock is a claim
// about how much time is left, which is a claim about the future, which is the
// one sentence docs/VOICE.md §1 forbids us. We would be drawing our own ban.
//
// The honest picture of "early warning" is the one brand.mjs already argues in
// prose: a SMOKE DETECTOR. It predicts nothing. It has no opinion about the
// fire. It tells you sooner than you would otherwise have known, and it is
// judged on whether it is wired to anything. That is exactly our claim — we
// read arXiv, Hugging Face, the lab feeds and the filings directly, so we are
// upstream of the accounts that relay them (docs/NEWS.md, opening).
//
// So the mark is a detector seen face-on: a ring, a grille, a lamp.
//
//   OUTER RING     the housing
//   FIVE SLOTS     the grille, swept across the lower arc — one per DOOMCON
//                  level, in level order, 5 (calm) on the left to 1 (loudest)
//                  on the right
//   CENTRAL LED    the lamp, in the current level's heat colour
//
// THE THING NOBODY ELSE IN THE CATEGORY DOES. The favicon takes the level and
// lights every slot from the calm end up to the current one — two lit at
// DOOMCON 4, five lit at DOOMCON 1 — so the TAB ICON CARRIES THE READING. A
// pinned tab becomes the instrument. pizzint ships a static flag; DoomBench,
// the IMD clock and skynetcountdown ship a static logo. Ours is generated per
// observation from the same state.json that produced the number on the page,
// so it cannot disagree with it.
//
// NEVER COLOUR ALONE — and this is the one place on the site where the usual
// answer ("the word is printed beside it") is not available, because a favicon
// has no room for a word. Three independent carriers, verified in
// docs/BRAND.md §6 against greyscale and the three dichromacies:
//
//   1. COUNT   how many slots are lit. Countable with the hue removed.
//   2. WEIGHT  a lit slot is drawn at full stroke, an unlit one at 55% and
//              at 22% alpha. Survives a greyscale repost.
//   3. HUE     the heat ramp. Confirmation, never the reading.
//
// And the fourth, outside the image: the <title> the tab prints beside the
// icon is `DOOMCON 4 — ROUTINE · …`, which layout.mjs already emits. The mark
// is never unlabelled in situ.
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
// So this module carries a rasteriser. It is ~180 lines, it uses `node:zlib`
// and nothing else, and it draws exactly the primitives these marks need —
// stroked polylines with round caps, discs, rounded rectangles — by analytic
// coverage, which is what gives it clean antialiasing at 16px without a
// supersampling budget. It is deterministic: the same level in produces the
// same bytes out, which CONTRACT.md §4 requires of everything this repo emits.
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
 * How many slots are lit at a level: 6 − level.
 *
 * READ THIS ONCE AND THE WHOLE MARK FOLLOWS. DOOMCON counts DOWN toward
 * louder — 5 is the calmest reading and 1 the loudest — so "more lit" has to
 * mean "lower number", and a naive `slots <= level` would light four slots at
 * the calmest reading and one at the loudest, which is the instrument running
 * backwards. Slot i (i = 5…1, left to right) is lit when i >= level.
 */
export function litSlots(level) {
  return 6 - assertLevel(level);
}

// ---------------------------------------------------------------------------
// 2. THE GEOMETRY
//
// A 64-unit grid. Every asset below is this one drawing at a different size
// with a different ground, which is the entire reason it reads as one mark
// rather than as a family of related ones.
//
// THE NUMBERS ARE LOAD-BEARING AND THEY WERE MEASURED, NOT PICKED.
//
// At 16px a 64-unit grid is 4 units per device pixel, and the whole design is
// a fight for one clear pixel between the grille slots at that size.
//
// The five slots sit on an arc of radius 23 swept from 16° to 164° (y down, so
// the LOWER arc), 37° apart. 37° at r=23 is 14.85 units of arc between slot
// centres. Each slot draws 5.6 units of arc and is stroked at 4.8 with round
// caps, so it occupies 5.6 + 4.8 = 10.4 units and leaves a gap of 4.45 units —
// 1.11 device pixels of clear space at 16px.
//
// Below about 4 units of gap the slots blur into one smear at 16px and the
// COUNT, which is the first of the three carriers above, stops being
// countable. Every other number here is downstream of that one: the radius is
// as large as the housing allows (23 + half the 4.8 stroke = 25.4, against the
// ring's inner edge at 28 − 1.7 = 26.3), and the slot length is whatever is
// left after the gap is paid for. Rendered and counted at 16, 32 and 64px
// across all five levels; the sheet is described in docs/BRAND.md §6.
// ---------------------------------------------------------------------------

export const LOGO_GRID = Object.freeze({
  size: 64,
  cx: 32,
  cy: 32,
  ringRadius: 28,
  ringStroke: 3.4,
  slotRadius: 23,
  slotStroke: 4.8,
  slotArc: 5.6,        // drawn arc length in grid units, before caps
  slotFrom: 16,        // degrees, y-down; the lower arc
  slotStep: 37,
  ledRadius: 7.0,
  ledGap: 2.6,         // clear ring between the LED and everything else
});

const RAD = Math.PI / 180;

/** A point on the slot arc. */
function onArc(deg, r = LOGO_GRID.slotRadius) {
  return [
    LOGO_GRID.cx + Math.cos(deg * RAD) * r,
    LOGO_GRID.cy + Math.sin(deg * RAD) * r,
  ];
}

/** The centre angle of slot `i`, where i is a LEVEL (5 leftmost … 1 rightmost). */
function slotAngle(level) {
  // In a y-down frame, 18° is the lower RIGHT of the circle and 162° the lower
  // LEFT. DOOMCON 5 is the calm end and belongs on the left, which is the
  // direction every scale on this site already runs, so level 5 takes 162° and
  // level 1 takes 18°.
  const idx = level - 1;
  return LOGO_GRID.slotFrom + LOGO_GRID.slotStep * idx;
}

/**
 * The mark as a list of primitives, in paint order.
 *
 * ONE description, consumed by two renderers — the SVG writer below and the
 * rasteriser further down. That is deliberate and it is the only way the PNG
 * favicon and the inline SVG masthead can be guaranteed to be the same
 * drawing: there is exactly one copy of the geometry and neither renderer can
 * drift from it.
 *
 * @param {number} level 1-5
 * @param {object} [opts]
 * @param {boolean} [opts.mono] draw every element in one colour (currentColor
 *   in SVG). For the masthead, where the mark sits beside the wordmark and
 *   takes the ink of the text it belongs to. The level is still legible: the
 *   lit slots keep their weight and the unlit ones keep their 22% alpha.
 * @param {boolean} [opts.led] draw the central lamp. Off for the wordmark
 *   lockup at small sizes, where the lamp closes up against the grille.
 */
export function markShapes(level, { mono = false, led = true } = {}) {
  const L = assertLevel(level);
  const g = LOGO_GRID;
  const heat = HEAT[L];
  const out = [];

  // The housing. One ring, drawn as a closed polyline so the rasteriser needs
  // no circle primitive of its own.
  out.push({
    kind: 'ring',
    cx: g.cx, cy: g.cy, r: g.ringRadius, w: g.ringStroke,
    color: mono ? 'currentColor' : INK_DIM,
    alpha: mono ? 0.55 : 1,
  });

  // The grille. Five slots, in level order, calm end first.
  for (const slot of LEVELS) {
    const on = slot >= L;
    const a = slotAngle(slot);
    const half = (g.slotArc / g.slotRadius) / RAD / 2; // half the drawn arc, in degrees
    out.push({
      kind: 'arc',
      cx: g.cx, cy: g.cy, r: g.slotRadius,
      a0: a - half, a1: a + half,
      // WEIGHT IS THE SECOND CARRIER. A lit slot is drawn at full stroke and a
      // dark one at 55%, so the reading survives a greyscale repost and a
      // dichromatic reader, neither of which gets the hue.
      w: on ? g.slotStroke : g.slotStroke * 0.55,
      color: mono ? 'currentColor' : (on ? HEAT[slot] : INK_DIM),
      alpha: on ? 1 : 0.30,
      slot,
      on,
    });
  }

  if (led) {
    // The lamp. The only filled element in the mark, which is the whole reason
    // it reads as a light rather than as a dot: fill is spent once, here.
    out.push({
      kind: 'disc',
      cx: g.cx, cy: g.cy, r: g.ledRadius,
      color: mono ? 'currentColor' : heat,
      alpha: 1,
    });
    // A dark collar, so the lamp does not touch the grille at any size. Drawn
    // as a stroke in the ground colour rather than as a gap in the geometry,
    // because a gap would have to know what it is sitting on and a collar does
    // not. In `mono` it is omitted — there is nothing to separate it from.
    if (!mono) {
      out.push({
        kind: 'ring',
        cx: g.cx, cy: g.cy, r: g.ledRadius + g.ledGap / 2, w: g.ledGap,
        color: 'ground',
        alpha: 1,
        collar: true,
      });
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// 3. SVG
// ---------------------------------------------------------------------------

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const n2 = (v) => (Math.round(v * 100) / 100).toString();

function arcPath(cx, cy, r, a0, a1) {
  const [x0, y0] = [cx + Math.cos(a0 * RAD) * r, cy + Math.sin(a0 * RAD) * r];
  const [x1, y1] = [cx + Math.cos(a1 * RAD) * r, cy + Math.sin(a1 * RAD) * r];
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  const sweep = a1 > a0 ? 1 : 0;
  return `M${n2(x0)} ${n2(y0)}A${n2(r)} ${n2(r)} 0 ${large} ${sweep} ${n2(x1)} ${n2(y1)}`;
}

/**
 * The shape list as SVG elements.
 * @param {string} ground the colour the collar paints in; ignored when the
 *   caller drew no ground, in which case pass null and the collar is dropped.
 */
function shapesToSvg(shapes, ground) {
  const parts = [];
  for (const s of shapes) {
    if (s.collar && !ground) continue;
    const color = s.color === 'ground' ? ground : s.color;
    const op = s.alpha === 1 ? '' : ` opacity="${n2(s.alpha)}"`;
    if (s.kind === 'disc') {
      parts.push(`<circle cx="${n2(s.cx)}" cy="${n2(s.cy)}" r="${n2(s.r)}" fill="${esc(color)}"${op}/>`);
    } else if (s.kind === 'ring') {
      parts.push(`<circle cx="${n2(s.cx)}" cy="${n2(s.cy)}" r="${n2(s.r)}" fill="none"`
        + ` stroke="${esc(color)}" stroke-width="${n2(s.w)}"${op}/>`);
    } else if (s.kind === 'arc') {
      parts.push(`<path d="${arcPath(s.cx, s.cy, s.r, s.a0, s.a1)}" fill="none"`
        + ` stroke="${esc(color)}" stroke-width="${n2(s.w)}" stroke-linecap="round"${op}/>`);
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
 * @param {boolean} [opts.heat=false] paint the grille and lamp in the heat
 *   ramp instead of currentColor. For the one place it is the subject rather
 *   than the byline.
 */
export function logoMark(level, opts = {}) {
  const { className = '', label = null, size = null, heat = false } = opts;
  const shapes = markShapes(level, { mono: !heat });
  const cls = `dcmark${className ? ` ${esc(className)}` : ''}`;
  const style = size
    ? ` style="--mark:${esc(typeof size === 'number' ? `${size}px` : size)}"` : '';
  const a11y = label ? ` role="img" aria-label="${esc(label)}"` : ' aria-hidden="true"';
  return `<svg class="${cls}" viewBox="0 0 ${LOGO_GRID.size} ${LOGO_GRID.size}"${style}${a11y}`
    + ` focusable="false">${shapesToSvg(shapes, null)}</svg>`;
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
export function mastheadLockup(level, { href = '/', current = false } = {}) {
  const L = assertLevel(level);
  const meta = brand.levelMeta(L);
  const inner =
    `${logoMark(L, { className: 'dclock__m' })}`
    + `<span class="dclock__t">`
    + `<b class="dclock__w">${esc(brand.NAME)}</b>`
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
@media (max-width: 420px) { .dclock__m { --mark: 26px; } }
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
 */
export function faviconSvg(level, { rounded = true } = {}) {
  const L = assertLevel(level);
  const meta = brand.levelMeta(L);
  const g = LOGO_GRID;
  const r = rounded ? 12 : 0;
  // A HAIRLINE ON THE GROUND. Measured: on a dark browser chrome the navy
  // square has no edge at all and the mark appears to float, which at 16px
  // reads as a broken transparent icon. 1px of --rule at 18% is enough to seat
  // it and is invisible against light chrome.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.size} ${g.size}" role="img"`
    + ` aria-label="${esc(`${brand.NAME} ${L}, ${meta.name}`)}">`
    + `<title>${esc(`${brand.NAME} ${L} — ${meta.name}`)}</title>`
    + `<rect width="${g.size}" height="${g.size}" rx="${r}" fill="${GROUND}"/>`
    + `<rect x="0.5" y="0.5" width="${g.size - 1}" height="${g.size - 1}" rx="${r ? r - 0.5 : 0}"`
    + ` fill="none" stroke="${INK}" stroke-opacity="0.18"/>`
    + shapesToSvg(markShapes(L), GROUND)
    + `</svg>\n`;
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
  const L = assertLevel(opts.level ?? 4);
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
    + `<g transform="translate(${mx} ${my}) scale(${n2(scale)})">${shapesToSvg(markShapes(L), GROUND)}</g>`
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
    `<meta name="theme-color" content="${GROUND}">`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// 4. THE RASTERISER
//
// Analytic coverage, not supersampling. Every primitive here has a cheap exact
// signed distance, so a pixel's coverage is `clamp(0.5 - d, 0, 1)` with d in
// device pixels — which produces the same antialiasing a real rasteriser does,
// at 16px, without a 16x sample budget. Stroked geometry is reduced to
// polylines of round-capped capsules, because a capsule's SDF is four lines of
// arithmetic and a stroked arc's is not.
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
  if (prim.kind === 'disc' || prim.kind === 'ringPoly') {
    x0 = prim.cx - prim.r - pad; x1 = prim.cx + prim.r + pad;
    y0 = prim.cy - prim.r - pad; y1 = prim.cy + prim.r + pad;
  } else if (prim.kind === 'rrect') {
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
      if (prim.kind === 'disc') {
        d = Math.hypot(px - prim.cx, py - prim.cy) - prim.r;
      } else if (prim.kind === 'ringPoly') {
        d = Math.abs(Math.hypot(px - prim.cx, py - prim.cy) - prim.r) - prim.w / 2;
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

/** The mark's shape list, flattened into rasteriser primitives at `size`. */
function markPrimitives(level, size, { inset = 0, ground = GROUND } = {}) {
  const g = LOGO_GRID;
  const live = size - inset * 2;
  const k = live / g.size;
  const T = (v) => v * k + inset;
  const out = [];
  for (const s of markShapes(level)) {
    const color = s.color === 'ground' ? ground : s.color;
    if (s.kind === 'disc') {
      out.push({ kind: 'disc', cx: T(s.cx), cy: T(s.cy), r: s.r * k, color, alpha: s.alpha });
    } else if (s.kind === 'ring') {
      out.push({ kind: 'ringPoly', cx: T(s.cx), cy: T(s.cy), r: s.r * k, w: s.w * k, color, alpha: s.alpha });
    } else if (s.kind === 'arc') {
      // Sixteen samples per slot. The slot spans ~13° of arc, so the chord
      // error at 16 samples is well under a hundredth of a pixel at 512.
      const pts = [];
      const steps = 16;
      for (let i = 0; i <= steps; i += 1) {
        const a = s.a0 + ((s.a1 - s.a0) * i) / steps;
        pts.push([T(s.cx + Math.cos(a * RAD) * s.r), T(s.cy + Math.sin(a * RAD) * s.r)]);
      }
      out.push({ kind: 'poly', pts, w: s.w * k, color, alpha: s.alpha });
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
 * @param {number} [opts.padding]   fraction of the edge kept clear around the
 *   mark. 0.10 for an ordinary icon. 0.20 for `maskable`, where Android may
 *   crop to a circle inscribed in the middle 80% and anything outside that is
 *   not guaranteed to survive.
 * @param {boolean} [opts.transparent] no ground at all. For nothing currently
 *   shipped; kept because a transparent mark is what a press kit asks for and
 *   the alternative is somebody re-deriving the geometry by hand.
 * @returns {Buffer}
 */
export function iconPng(level, { size = 192, rounded = true, padding = 0.10, transparent = false } = {}) {
  const L = assertLevel(level);
  const buf = canvas(size, size, null);
  if (!transparent) {
    paint(buf, size, size, {
      kind: 'rrect', x: 0, y: 0, w2: size, h2: size,
      r: rounded ? size * 0.1875 : 0, color: GROUND, alpha: 1,
    });
  }
  const inset = size * padding;
  for (const p of markPrimitives(L, size, { inset, ground: transparent ? GROUND : GROUND })) {
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
  const L = assertLevel(opts.level ?? 4);
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
  for (const p of markPrimitives(L, markSize, { inset: 0 })) {
    paint(buf, W, H, { ...p, pts: p.pts ? p.pts.map(([x, y]) => [x + mx, y + my]) : undefined,
      cx: p.cx === undefined ? undefined : p.cx + mx,
      cy: p.cy === undefined ? undefined : p.cy + my });
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
    { path: 'favicon.svg', body: faviconSvg(level), type: 'image/svg+xml' },
    { path: 'favicon-32.png', body: iconPng(level, { size: 32, padding: 0.06 }), type: 'image/png' },
    { path: 'apple-touch-icon.png', body: iconPng(level, { size: 180, rounded: false, padding: 0.12 }), type: 'image/png' },
    { path: 'icon-192.png', body: iconPng(level, { size: 192, padding: 0.10 }), type: 'image/png' },
    { path: 'icon-512.png', body: iconPng(level, { size: 512, padding: 0.10 }), type: 'image/png' },
    { path: 'icon-maskable-512.png', body: iconPng(level, { size: 512, rounded: false, padding: 0.20 }), type: 'image/png' },
    { path: 'manifest.webmanifest', body: manifestJson(level), type: 'application/manifest+json' },
    { path: 'og-default.png', body: ogImagePng({ level, score, generatedAt }), type: 'image/png' },
    { path: 'og-default.svg', body: ogImageSvg({ level, score, generatedAt }), type: 'image/svg+xml' },
  ];
}
