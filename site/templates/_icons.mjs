// ---------------------------------------------------------------------------
// ONE ICON SYSTEM FOR THE WHOLE SITE.
//
// WHY THIS FILE EXISTS. The site draws its marks in five places today, with
// five unrelated conventions, and that is the largest single reason it reads as
// assembled rather than designed. Measured on the built homepage, 2026-09-24:
//
//   site/templates/_reel.mjs     SIGIL      5 pillar marks, 13x13 grid, stroke 1.3
//   site/templates/_charts.mjs   PILLAR_GLYPH  the SAME five pillars, as bare
//                                unicode  ▲ ■ ● ◆ ✱  — so a pillar has two
//                                unrelated visual identities on one page
//   site/templates/_labs.mjs     GLYPH      8 lab marks, 16x16 grid, stroke 1.6-1.8
//   site/templates/_avatars.mjs  dc-avt-*   8 silhouettes, 24x24 grid, + monogram
//   site/templates/_switcher.mjs glyph      7 tab marks as bare unicode
//                                ◆ ▲ ■ ✕ ◐ ● ○ — typeface-dependent, unhintable,
//                                and three of them collide with _charts's set
//                                while meaning something else entirely
//   site/templates/layout.mjs    FEATURE_ART 10 destination marks, 16x16 grid,
//                                stroke 1.5-1.8, each on its own saturated hue
//
// Three grids, four stroke weights, two rendering technologies (SVG and font
// glyphs), and one concept — "pillar" — carrying two different pictures. A bare
// unicode ◆ is not an icon: it is whatever the reader's font decides, it cannot
// be given a stroke weight, and on Android it arrives at a different optical
// size than on iOS.
//
// THE GRID, and it is the whole contract:
//
//   viewBox   0 0 20 20      one size, every icon
//   live area 2.5 .. 17.5    nothing touches the box edge
//   stroke    1.7            one weight, everywhere
//   caps      round          one join, everywhere
//   fill      none           except ONE solid element per icon, used only where
//                            "filled" is itself the information (a live source,
//                            a built datacentre)
//   colour    currentColor   so one colourless sprite serves both schemes, the
//                            five pillar hues and the heat ramp
//
// 20 rather than 16 or 13: the scales, the rack and the pin need the extra
// resolution, and 20 divides cleanly into the 10px and 20px steps of the type
// scale. At the smallest place an icon appears (11px, the pillar tag) the
// stroke lands at 0.94 device pixels, which is the same optical weight as the
// 13-grid sigils it replaces (1.10) within a rounding error, so adopting this
// changes no existing block's colour weight.
//
// NEVER COLOUR ALONE — the rule this sprite is built to make cheap. Every set
// below differs in SILHOUETTE first:
//
//   the three source states   filled disc / half disc / broken empty ring
//   awaiting baseline         dotted ring — the same dash grammar the chips use
//   the three DC statuses     one footprint, three degrees of completion
//   direction                 chevron up / chevron down / equals
//
// Desaturate the whole sheet and not one of those distinctions is lost.
//
// THE SPRITE. Every mark is a <symbol> in one inline <svg>, emitted once per
// page; each use site is a 60-byte <use>. The measured alternative — inlining
// path data — cost 52 KB on the 200-row archive when _reel.mjs did it with five
// shapes, and this set has twenty-nine. A same-document fragment needs no
// script and no second request, so it still renders in a prerender, in a
// crawler and in a screenshot taken before hydration, which is the constraint
// every visual decision on this site is downstream of.
//
// WHAT THIS FILE DOES NOT DO. It ships no CSS. `.dcico` is painted in
// site/styles.mjs, beside the type scale and the palette it has to agree with.
// A component that ships its own scoped <style> owns its own namespace — that
// rule is written down in styles.mjs and this file obeys it from the other
// side.
//
// NAMESPACE. Symbol ids are `dc-ico-<name>`, matching the existing `dc-sig-`
// and `dc-avt-` prefixes. Grepped before choosing: `.ic` is taken by
// wattsPage.mjs's corridor cards and `.ico` by _labs.mjs, so the class here is
// `.dcico` and the sprite's own is `.dcicons`.
// ---------------------------------------------------------------------------

/** The grid, exported so a caller can assert against it rather than assume. */
export const ICON_GRID = Object.freeze({
  size: 20,
  stroke: 1.7,
  inset: 2.5,
  linecap: 'round',
  linejoin: 'round',
});

// A ring used by three of the four source states. Same circle, three treatments,
// so the states sit on one optical baseline and differ only where they mean to.
const RING = 'M10 3.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13';

// The datacentre footprint. ONE shape for all three statuses: a reader learns
// the silhouette once and then reads only how finished it is. The ground line
// is what stops the box reading as a generic card.
const DC_GROUND = 'M2 17.6h16';

// THE TWO DASH PATTERNS, and they are not interchangeable.
//
// styles.mjs already spends dashed on one meaning and dotted on another, in
// three separate components (.chip, .fresh__lg, .sw__tab, .pillar), and
// docs/VOICE.md §4 makes merging them the one edit nobody may make. The sprite
// inherits both, to the pixel, rather than inventing a third convention:
//
//   DASHED  "this is not there"  — a dark source, an unbuilt wall
//   DOTTED  "this is there, and we cannot score it yet" — awaiting a baseline
//
// Measured against the ring's circumference (2π·6.5 = 40.8 units): 4.5/3.2
// lays five full dashes with five clean gaps and no stub at the seam; 0.1/3.05
// with round caps lays thirteen dots at even spacing. Both survive to 11px.
const DASHED = '4.5 3.2';
const DOTTED = '0.1 3.05';

/**
 * name -> { d, dash?, d2, dash2?, solid?, title }
 *
 *   d      the stroked geometry
 *   dash   a stroke-dasharray for `d`
 *   d2     a SECOND stroked path with its own dash. Exactly one set needs this
 *          and it is the reason the field exists: the three datacentre statuses
 *          are one footprint at three degrees of completion, so
 *          `under_construction` has to draw a solid lower wall and a dashed
 *          upper one in the same mark. Faking it with two icons would give the
 *          middle state a different silhouette from the two it sits between,
 *          which is the whole thing this set is built to avoid.
 *   solid  geometry filled with currentColor and not stroked — at most one per
 *          icon, and only where "filled" is the information
 *   title  the accessible name, used only when a caller asks for one; every
 *          icon on this site is decorative by default because the word is
 *          always beside it
 */
const ICONS = {
  // ---- the five pillars -------------------------------------------------
  // Redrawn from _reel.mjs's SIGIL on the 20 grid rather than reinvented: the
  // concepts were right and a reader who has learned them keeps them.
  'pillar-capability': {
    title: 'Capability',
    // a rising staircase — up and to the right
    d: 'M2.5 16.5h4.5V12h4.5V7.5H16V3',
  },
  'pillar-compute': {
    title: 'Compute & Capital',
    // a chip with pins
    d: 'M6.2 6.2h7.6v7.6H6.2zM2.3 8.5h3.9M2.3 11.5h3.9M13.8 8.5h3.9M13.8 11.5h3.9'
      + 'M8.5 2.3v3.9M11.5 2.3v3.9M8.5 13.8v3.9M11.5 13.8v3.9',
  },
  'pillar-attention': {
    title: 'Attention',
    // broadcast arcs
    d: 'M6 6a5.7 5.7 0 0 0 0 8M14 6a5.7 5.7 0 0 1 0 8M2.9 2.9a10 10 0 0 0 0 14.2M17.1 2.9a10 10 0 0 1 0 14.2',
    solid: 'M10 8.4a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2',
  },
  'pillar-governance': {
    title: 'Governance',
    // a balance. The scales, not a gavel: this pillar counts rulemaking, not
    // verdicts, and a gavel would claim enforcement we do not measure.
    d: 'M10 3.4v13.2M3.8 16.6h12.4M3.8 5.2h12.4M6.5 5.2 4 10.2h5zM13.5 5.2 11 10.2h5z',
  },
  'pillar-markets': {
    title: 'Markets',
    // two candlesticks
    d: 'M5.5 2.5v15.1M14.5 2.5v15.1M3.4 5.5h4.2v6.2H3.4zM12.4 8.3h4.2v6.2h-4.2z',
  },

  // ---- the source states ------------------------------------------------
  // FOUR, not three. The brief names three and the codebase carries four:
  // _parts.mjs and the .chip rules both distinguish `stale` from `ok`, and
  // docs/VOICE.md §4 is explicit that merging two of these is the one edit
  // nobody is allowed to make. Shipping three would force a caller to pick a
  // wrong one for the fourth.
  'state-live': {
    title: 'Live',
    d: RING,
    solid: 'M10 6.8a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4',
  },
  'state-stale': {
    title: 'Stale',
    d: RING,
    // the left half, filled — a half-read
    solid: 'M10 3.5a6.5 6.5 0 0 0 0 13z',
  },
  'state-dark': {
    title: 'Dark',
    // A DASHED ring with nothing inside. An absence, not an alarm: MOTION.md §4
    // requires a dark source to look still, and dashed is the grammar
    // .chip[data-status="dark"] already uses.
    //
    // The first draft drew this as two opposing quarter-arcs and it read as a
    // comma — at 11px two arcs with round caps are one swoosh, and the RING
    // silhouette that ties the four states together was gone. Dashing the whole
    // ring keeps the circle and still says "broken".
    d: RING,
    dash: DASHED,
  },
  'state-awaiting': {
    title: 'Awaiting baseline',
    // A DOTTED ring with a small centre dot. The source answered — that is the
    // dot — and there is no frozen history to score it against — that is the
    // dotted ring. Dotted rather than dashed on purpose: .chip[data-status=
    // "uncal"] spends dotted on exactly this state and dashed on dark, and the
    // two must never be confusable.
    d: RING,
    dash: DOTTED,
    solid: 'M10 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3',
  },

  // ---- datacentre status ------------------------------------------------
  // ONE footprint, three degrees of completion. A map legend's whole job is to
  // say how far along a thing is, and three unrelated pictures would make the
  // reader learn three facts where there is one axis.
  // The axis is COMPLETION and nothing else, drawn as how much of one wall is
  // solid: all of it, half of it, none of it. Set the three side by side in a
  // legend and the reader learns the whole scale in one look, which is what a
  // map legend is for. The first draft gave `under_construction` a scaffold
  // brace and it read as a suspension bridge — a third picture where there is
  // one axis.
  'dc-operating': {
    title: 'Operating',
    d: `${DC_GROUND}M4 17.6V5.6h12v12M6.6 9.2h6.8M6.6 12.4h6.8`,
    // The power light. The only status that is switched on, and the only fill
    // in the set — which is the second, non-dash signal separating this one
    // from the two below it.
    solid: 'M14.8 14.6a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2',
  },
  'dc-building': {
    title: 'Under construction',
    // lower wall built…
    d: `${DC_GROUND}M4 17.6v-7.4h12v7.4M6.6 14.2h6.8`,
    // …upper wall not
    d2: 'M4 10.2V5.6h12v4.6',
    dash2: DASHED,
  },
  'dc-announced': {
    title: 'Announced',
    // The same footprint with nothing in it. A plan, not a building.
    d: `${DC_GROUND}`,
    d2: 'M4 17.6V5.6h12v12',
    dash2: DASHED,
  },

  // ---- direction --------------------------------------------------------
  'dir-up': { title: 'Up', d: 'M10 17V4.4M5 9.4 10 4.4l5 5' },
  'dir-down': { title: 'Down', d: 'M10 3v12.6M5 10.6l5 5 5-5' },
  // An equals sign, not a dash: one bar reads as a minus, which is a direction.
  'dir-flat': { title: 'Unchanged', d: 'M4.5 8h11M4.5 12h11' },

  // ---- section marks ----------------------------------------------------
  // One per destination the switcher and the feature bar reach. Every one is a
  // distinct silhouette at 15px, which is the size layout.mjs draws them at.
  'sec-index': {
    title: 'The index',
    // A gauge: a bounded dome, its chord, and a needle inside it. The chord is
    // load-bearing — without it the dome plus a needle leaving its right end
    // reads as a tick, which is what the first draft drew. Closing the dome
    // into a D and swinging the needle left makes it a dial at 11px.
    d: 'M3 14.6a7 7 0 0 1 14 0M3 14.6h14M10 14.6 6.3 9.1',
    solid: 'M10 13.3a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6',
  },
  'sec-signal': {
    title: 'The newsroom',
    // a wire list: a lead item, then the run of rows under it
    d: 'M8.2 5h9.3M2.5 10.4h15M2.5 15.4h10.5',
    solid: 'M4.4 3.6a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8',
  },
  'sec-race': {
    title: 'The race',
    // a podium — three ranked blocks, which is what the board is
    d: `${DC_GROUND}M3.4 17.6v-5.2h4.4v5.2M7.8 17.6V6.4h4.4v11.2M12.2 17.6v-7.6h4.4v7.6`,
  },
  'sec-floor': {
    title: 'The watch floor',
    // four monitored cells
    d: 'M3.2 3.2h5.9v5.9H3.2zM10.9 3.2h5.9v5.9h-5.9zM3.2 10.9h5.9v5.9H3.2zM10.9 10.9h5.9v5.9h-5.9z',
  },
  'sec-wire': {
    title: 'The X wire',
    // a post, marked. The cross is inside a frame so it cannot be read as the
    // "close" or "dark" cross it would otherwise collide with.
    d: 'M3.2 3.2h13.6v13.6H3.2zM7 7l6 6M13 7l-6 6',
  },
  'sec-substrate': {
    title: 'The substrate',
    // the bolt. /watts is power, water and concrete, and the bolt is the one of
    // the three that is legible at 11px.
    d: 'M11.4 2.4 5.6 10.9h4l-1 6.7 5.8-8.5h-4z',
  },
  'sec-digest': {
    title: 'The digest',
    d: 'M5.4 2.6h9.2v15l-4.6-3.3-4.6 3.3z',
  },
  'sec-bliss': {
    title: 'The other direction',
    // a sun. The opposite-direction index gets the opposite-direction picture.
    d: 'M10 2.2v2.3M10 15.5v2.3M2.2 10h2.3M15.5 10h2.3'
      + 'M4.5 4.5 6.1 6.1M13.9 13.9l1.6 1.6M15.5 4.5 13.9 6.1M6.1 13.9l-1.6 1.6'
      + 'M10 6.4a3.6 3.6 0 1 1 0 7.2 3.6 3.6 0 0 1 0-7.2',
  },
  'sec-map': {
    title: 'The map',
    d: 'M10 17.6s5.6-5.4 5.6-9.4a5.6 5.6 0 1 0-11.2 0c0 4 5.6 9.4 5.6 9.4z'
      + 'M10 6.2a2 2 0 1 1 0 4 2 2 0 0 1 0-4',
  },
  'sec-history': {
    title: 'History',
    d: 'M10 2.8a7.2 7.2 0 1 1 0 14.4 7.2 7.2 0 0 1 0-14.4M10 5.6V10l3.3 2',
  },
  'sec-archive': {
    title: 'The archive',
    // stacked layers — one receipt per observation, chained
    d: 'M10 2.4 17.6 6.4 10 10.4 2.4 6.4zM2.4 10 10 14l7.6-4M2.4 13.6 10 17.6l7.6-4',
  },
  'sec-method': {
    title: 'Methodology',
    d: 'M7.6 2.6v5.1l-4.1 7.6A1.9 1.9 0 0 0 5.2 18h9.6a1.9 1.9 0 0 0 1.7-2.7l-4.1-7.6V2.6M6.6 2.6h6.8',
  },
  'sec-api': {
    title: 'The API',
    d: 'M7 5.4 2.6 10 7 14.6M13 5.4 17.4 10 13 14.6',
  },
};

/** Every name in the sprite, in emission order. Frozen so a caller cannot
 *  mutate the set it is iterating. */
export const ICON_NAMES = Object.freeze(Object.keys(ICONS));

/** Cheap membership test, so a caller can fall back rather than throw. */
export function hasIcon(name) {
  return Object.prototype.hasOwnProperty.call(ICONS, name);
}

/** The accessible name this sprite publishes for an icon, or null. */
export function iconTitle(name) {
  return hasIcon(name) ? ICONS[name].title : null;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function stroke(d, dash) {
  if (!d) return '';
  return `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${ICON_GRID.stroke}"`
    + ` stroke-linecap="${ICON_GRID.linecap}" stroke-linejoin="${ICON_GRID.linejoin}"`
    + (dash ? ` stroke-dasharray="${dash}"` : '')
    + '/>';
}

function geometry(icon) {
  const g = ICONS[icon];
  return stroke(g.d, g.dash)
    + stroke(g.d2, g.dash2)
    + (g.solid ? `<path d="${g.solid}" fill="currentColor" stroke="none"/>` : '');
}

/**
 * THE SPRITE. Emit once per page, anywhere in <body>, before the first `icon()`
 * on that page. It is `width=0 height=0` and absolutely positioned by
 * `.dcicons` in styles.mjs, so it takes part in no layout.
 *
 * Deterministic: object key order, no clock, no randomness — the same bytes on
 * every build, which docs/CONTRACT.md §4 requires of everything this repo emits.
 *
 * @param {object}  [opts]
 * @param {string[]}[opts.only]  emit only these names. The map page and the
 *   embed do not need the eight lab-adjacent section marks; a page that knows
 *   its own set can say so and pay for nothing else.
 */
export function iconSprite({ only = null } = {}) {
  const names = only ? only.filter(hasIcon) : ICON_NAMES;
  const symbols = names.map((name) =>
    `<symbol id="dc-ico-${name}" viewBox="0 0 ${ICON_GRID.size} ${ICON_GRID.size}">`
    + geometry(name)
    + '</symbol>'
  ).join('');
  return `<svg class="dcicons" aria-hidden="true" focusable="false" width="0" height="0">${symbols}</svg>`;
}

/**
 * One icon.
 *
 * DECORATIVE BY DEFAULT, and that is not laziness. Every mark on this site sits
 * beside the word it illustrates — the pillar tag prints `CMP`, the freshness
 * chip prints `dark`, the switcher tab prints `Substrate`. An icon that
 * announces "Compute & Capital" next to the text "Compute & Capital" is a
 * screen reader reading everything twice. Pass `label` only where the mark is
 * genuinely alone.
 *
 * @param {string} name
 * @param {object} [opts]
 * @param {string} [opts.className] extra classes, appended after `dcico`
 * @param {string} [opts.label]     accessible name; makes the icon non-decorative
 * @param {number|string} [opts.size] a CSS length for this one icon. Omit it —
 *   `.dcico` is sized in `em` so a mark scales with the type it sits in, which
 *   is what keeps the optical weight right across six type steps without a
 *   size prop at every call site.
 * @param {boolean} [opts.inline]   inline the geometry instead of referencing
 *   the sprite. For the ONE case that needs it: a fragment rendered outside the
 *   page that carries the sprite (an RSS description, a share card, an embed).
 *   Costs ~9x the bytes; never use it in a list.
 */
export function icon(name, opts = {}) {
  if (!hasIcon(name)) throw new Error(`_icons: no icon named "${name}"`);
  const { className = '', label = null, size = null, inline = false } = opts;
  const cls = `dcico${className ? ` ${esc(className)}` : ''}`;
  const style = size ? ` style="--ico:${esc(typeof size === 'number' ? `${size}px` : size)}"` : '';
  const a11y = label
    ? ` role="img" aria-label="${esc(label)}"`
    : ' aria-hidden="true"';
  const body = inline
    ? geometry(name)
    : `<use href="#dc-ico-${name}"/>`;
  const box = inline ? ` viewBox="0 0 ${ICON_GRID.size} ${ICON_GRID.size}"` : '';
  return `<svg class="${cls}"${box}${style}${a11y} focusable="false">${body}</svg>`;
}

// ---------------------------------------------------------------------------
// NAMED LOOKUPS.
//
// These exist so no caller has to build an icon name by string concatenation.
// A typo in `\`pillar-${id}\`` is a silent empty <use>; a typo in
// `pillarIcon(id)` throws at build time, which is when this repo wants to hear
// about it.
// ---------------------------------------------------------------------------

/** The five pillars, keyed by the ids docs/CONTRACT.md fixes. */
export function pillarIcon(id, opts) {
  return icon(`pillar-${id}`, opts);
}

/**
 * A source state. Accepts every spelling already in the repo, because three
 * files spell the same four states three ways:
 *   _parts.mjs / .chip   ok | stale | dark | uncal
 *   _switcher.mjs        live | dark | uncal | awaiting-baseline
 *   docs/INFRA.md §4     live | dark | awaiting-baseline
 * Normalising here rather than at six call sites is the point of a lookup.
 */
const STATE_ALIAS = {
  ok: 'live', live: 'live', up: 'live',
  stale: 'stale', cold: 'stale', quiet: 'stale',
  dark: 'dark', down: 'dark',
  uncal: 'awaiting', uncalibrated: 'awaiting',
  awaiting: 'awaiting', 'awaiting-baseline': 'awaiting', 'no-baseline': 'awaiting',
};
export function stateIcon(state, opts) {
  const key = STATE_ALIAS[String(state).toLowerCase()];
  if (!key) throw new Error(`_icons: no source state "${state}"`);
  return icon(`state-${key}`, opts);
}

/** A datacentre status, in the three spellings docs/DATACENTERS.md §4 fixes. */
const DC_ALIAS = {
  operating: 'operating',
  under_construction: 'building', 'under-construction': 'building', building: 'building',
  announced: 'announced', planned: 'announced', proposed: 'announced',
};
export function dcIcon(status, opts) {
  const key = DC_ALIAS[String(status).toLowerCase()];
  if (!key) throw new Error(`_icons: no datacentre status "${status}"`);
  return icon(`dc-${key}`, opts);
}

/**
 * Direction. Takes a number or a word. A zero is `flat`, never `up` — the
 * arrival grammar in styles.mjs is explicit that zero is not an event, and a
 * signed delta of 0.0 drawn as a rising chevron is the same lie in a smaller
 * costume.
 */
export function dirIcon(v, opts) {
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return icon('dir-flat', opts);
    return icon(v > 0 ? 'dir-up' : v < 0 ? 'dir-down' : 'dir-flat', opts);
  }
  const k = { up: 'up', rise: 'up', down: 'down', fall: 'down', flat: 'flat', same: 'flat', unchanged: 'flat' }[
    String(v).toLowerCase()];
  if (!k) throw new Error(`_icons: no direction "${v}"`);
  return icon(`dir-${k}`, opts);
}

/**
 * A section mark, keyed by the switcher's own panel keys and by route.
 * Both forms are accepted because the switcher thinks in keys and the feature
 * bar thinks in hrefs, and neither should have to learn the other's vocabulary.
 */
const SECTION_ALIAS = {
  // _switcher.mjs panel keys
  signal: 'signal', race: 'race', floor: 'floor', wire: 'wire',
  substrate: 'substrate', digest: 'digest', bliss: 'bliss', map: 'map',
  // layout.mjs SECTIONS hrefs
  '/': 'index',
  '/race.html': 'race',
  '/news.html': 'signal',
  '/watts.html': 'substrate',
  '/map.html': 'map',
  '/digest.html': 'digest',
  '/bliss.html': 'bliss',
  '/methodology.html': 'method',
  '/history.html': 'history',
  '/moves/': 'archive',
  // spelled out
  index: 'index', news: 'signal', newsroom: 'signal', watts: 'substrate',
  methodology: 'method', method: 'method', history: 'history',
  archive: 'archive', moves: 'archive', api: 'api', labs: 'floor',
};
export function sectionIcon(key, opts) {
  const k = SECTION_ALIAS[String(key).toLowerCase()];
  if (!k) throw new Error(`_icons: no section mark for "${key}"`);
  return icon(`sec-${k}`, opts);
}

/** True when a section mark exists for this key or route — for a caller that
 *  would rather draw nothing than fail a build. */
export function hasSection(key) {
  return Object.prototype.hasOwnProperty.call(SECTION_ALIAS, String(key).toLowerCase());
}
