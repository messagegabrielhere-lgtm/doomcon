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

  // ---- the five levels --------------------------------------------------
  // ONE DIAL AT FIVE NEEDLE ANGLES. Not five pictures: the reader learns the
  // instrument once and then reads only where the needle is pointing, which is
  // the same economy the datacentre set buys with one footprint.
  //
  // WHY THIS SET EXISTS AT ALL. docs/VISITORS.md §4 item 5 asks for the level
  // rail to carry "a glyph per stop so it is never colour alone", and today the
  // five stops are five anonymous pips plus the heat ramp — which is colour
  // alone, in the one place on the site where the level is the whole point.
  // Five needle angles are distinguishable in a greyscale thumbnail and to
  // every dichromacy, because a rotation is not a hue.
  //
  // The sweep runs 144° (calm, pointing up-left) to 36° (loudest, pointing
  // up-right), through vertical at ELEVATED — the same direction of travel
  // as the level rail, the gauge on the fold, and the five slots in the logo.
  // A mark that ran the other way would be a fourth convention, which is the
  // thing this file was written to end.
  //
  // 144-36 RATHER THAN THE 162-18 THE FIRST DRAFT USED, and the reason is the
  // 16px render. At 162° the needle lies almost along the chord at y=14.6 and
  // merges with it, so DORMANT and UNPRECEDENTED both came out of the harness
  // as "a dome with a bump" and were indistinguishable from each other — which
  // is the worst possible pair to confuse. Pulling the ends in by 18° each
  // lifts both tips clear of the chord. Needle length 6.6 against the dome's
  // radius 7, so the tip never breaks the arc at ELEVATED.
  //
  // The dome is `sec-index`'s dome, to the decimal, so a level mark and the
  // section mark for the index read as the same instrument.
  'level-5': {
    title: 'DOOMCON 5, DORMANT',
    d: 'M3 14.6a7 7 0 0 1 14 0M3 14.6h14M10 14.6 4.66 10.72',
    solid: 'M10 13.3a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6',
  },
  'level-4': {
    title: 'DOOMCON 4, ROUTINE',
    d: 'M3 14.6a7 7 0 0 1 14 0M3 14.6h14M10 14.6 7 8.72',
    solid: 'M10 13.3a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6',
  },
  'level-3': {
    title: 'DOOMCON 3, ELEVATED',
    d: 'M3 14.6a7 7 0 0 1 14 0M3 14.6h14M10 14.6V8',
    solid: 'M10 13.3a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6',
  },
  'level-2': {
    title: 'DOOMCON 2, ACCELERATED',
    d: 'M3 14.6a7 7 0 0 1 14 0M3 14.6h14M10 14.6 13 8.72',
    solid: 'M10 13.3a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6',
  },
  'level-1': {
    title: 'DOOMCON 1, UNPRECEDENTED',
    d: 'M3 14.6a7 7 0 0 1 14 0M3 14.6h14M10 14.6 15.34 10.72',
    solid: 'M10 13.3a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6',
  },

  // ---- the eight labs ---------------------------------------------------
  // Redrawn from _labs.mjs's GLYPH onto this grid. Same eight concepts, one
  // stroke weight, one live area — the module they came from draws them on a
  // 16 grid at stroke 1.6-1.8, so a lab mark and the pillar tag beside it on
  // the same row were two different weights of line.
  //
  // THESE ARE NOT LOGOS AND THEY ARE NOT TRYING TO BE. Nobody's registered mark
  // is reproduced here: they are eight abstract figures, assigned to eight
  // named organisations, and the organisation's NAME is printed beside every
  // one of them everywhere it appears — the same rule, and the same reason, as
  // the principal marks in _avatars.mjs. Identification is by label.
  'lab-openai': {
    title: 'OpenAI',
    d: 'M10 3.2a6.8 6.8 0 1 1 0 13.6 6.8 6.8 0 0 1 0-13.6',
    solid: 'M10 7.9a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 0 1 0-4.2',
  },
  'lab-anthropic': {
    title: 'Anthropic',
    d: 'M3.2 16.4 10 3.6l6.8 12.8',
  },
  'lab-google-deepmind': {
    title: 'Google DeepMind',
    d: 'M10 3.2 16.8 10 10 16.8 3.2 10z',
  },
  'lab-xai': {
    title: 'xAI',
    d: 'M4.2 4.2 15.8 15.8M15.8 4.2 4.2 15.8',
  },
  'lab-meta': {
    title: 'Meta',
    d: 'M2.8 12.9c2-6.3 4.3-6.3 7.2-1.8s5.2 4.5 7.2-1.8',
  },
  'lab-deepseek': {
    title: 'DeepSeek',
    d: 'M2.6 10h4.1l2-4.4 2.5 8.6 2-4.2h4.2',
  },
  'lab-mistral': {
    title: 'Mistral',
    d: 'M3.4 16.6V6.1h4.1v10.5M12.5 16.6V3.4h4.1v13.2',
  },
  'lab-qwen': {
    title: 'Alibaba Qwen',
    d: 'M9.1 3.4a5.7 5.7 0 1 1 0 11.4 5.7 5.7 0 0 1 0-11.4M13.2 13.2 17 17',
  },
  // A lab we draw no figure for. A ROUNDED SQUARE, NOT A QUESTION MARK: the
  // roster is open and a new entrant is not an error, and a query glyph in a
  // column of eight confident marks reads as a rendering fault. The name
  // beside it is doing the work, as it is for the other eight.
  'lab-generic': {
    title: 'Lab',
    d: 'M4 4h12v12H4z',
  },

  // ---- news item kinds --------------------------------------------------
  // The seven `kind` values docs/NEWS.md fixes on a NewsItem. The newsroom
  // prints the word — `paper`, `release`, `status` — and this is the mark that
  // goes beside it, so a reader scanning 200 rows can sort them by silhouette
  // before reading any of them.
  'kind-paper': {
    title: 'Paper',
    // a sheet with a turned corner
    d: 'M5 2.6h6.4L15 6.2v11.2H5zM11.4 2.6V6.2H15M7.4 10.4h5.2M7.4 13.4h5.2',
  },
  'kind-model': {
    title: 'Model',
    // a box in three dimensions: weights that actually landed, as an object
    d: 'M10 2.6 17.2 6.5v7.8L10 18.2 2.8 14.3V6.5zM10 10.4l7.2-3.9M10 10.4v7.8M10 10.4 2.8 6.5',
  },
  'kind-release': {
    title: 'Release',
    // a cut tag — the least ambiguous "shipped" event there is
    d: 'M2.8 10.6 10.6 2.8h6.6v6.6L9.4 17.2z',
    solid: 'M13.6 5.2a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6',
  },
  'kind-lab': {
    title: 'Lab newsroom',
    // a building with a door: the lab's own front page, not a report about it
    d: 'M3 17.4V5.6L10 2.8l7 2.8v11.8M8.2 17.4v-4.4h3.6v4.4',
  },
  'kind-forum': {
    title: 'Forum',
    // two overlapping bubbles — a thread, not a statement
    d: 'M2.6 4.2h10v6.6H6.9L3.9 13.4v-2.6H2.6z',
    d2: 'M8.6 8.2h8.8v6.4h-1.3v2.6l-2.9-2.6H8.6z',
  },
  'kind-press': {
    title: 'Press',
    // a folded newspaper
    d: 'M2.6 4.6h10.8v12.8H2.6zM13.4 8.4h4v7.2a1.6 1.6 0 0 1-4 0M5 7.8h6M5 10.8h6M5 13.8h6',
  },
  'kind-status': {
    title: 'Status page',
    // two rack units with their lamps lit. The one kind that is about a fleet
    // rather than about a publication.
    d: 'M3 4.4h14v4.4H3zM3 11.2h14v4.4H3z',
    solid: 'M5.4 5.5a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2M5.4 12.3a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2',
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

/**
 * A DOOMCON level, 1-5. Takes the number, a `state.json` object, or the level
 * word — three things a caller might be holding, and none of them should have
 * to be converted at the call site.
 *
 * Throws on anything else rather than falling back to a neutral mark: a level
 * is the one quantity on this site that must never be drawn wrong, and a
 * silent fallback would render DORMANT's needle over an UNPRECEDENTED reading.
 */
const LEVEL_WORD = {
  dormant: 5, routine: 4, elevated: 3, accelerated: 2, unprecedented: 1,
};
export function levelIcon(level, opts) {
  let n = level;
  if (n && typeof n === 'object') n = n.level;
  if (typeof n === 'string') {
    const w = LEVEL_WORD[n.trim().toLowerCase()];
    n = w === undefined ? Number(n) : w;
  }
  if (!Number.isInteger(n) || n < 1 || n > 5) {
    throw new Error(`_icons: no level mark for ${JSON.stringify(level)} (expected 1-5 or a level name)`);
  }
  return icon(`level-${n}`, opts);
}

/**
 * A lab mark, keyed by the ids data/race.json and _labs.mjs already use.
 *
 * Unknown ids resolve to `lab-generic` rather than throwing, and that is the
 * opposite of the level rule above on purpose: the roster of frontier labs is
 * open, a new entrant arriving in the data is an ordinary Tuesday, and failing
 * the whole build over one is the wrong trade. The level set is closed by
 * docs/CONTRACT.md and can never grow.
 */
const LAB_ALIAS = {
  openai: 'openai',
  anthropic: 'anthropic',
  'google-deepmind': 'google-deepmind', deepmind: 'google-deepmind', google: 'google-deepmind',
  xai: 'xai', 'x-ai': 'xai',
  meta: 'meta', 'meta-ai': 'meta',
  deepseek: 'deepseek',
  mistral: 'mistral',
  qwen: 'qwen', 'alibaba-qwen': 'qwen', alibaba: 'qwen',
};
export function labIcon(id, opts) {
  const k = LAB_ALIAS[String(id).toLowerCase()] || 'generic';
  return icon(`lab-${k}`, opts);
}

/** True when this lab has a figure of its own rather than the generic frame. */
export function hasLab(id) {
  return Object.prototype.hasOwnProperty.call(LAB_ALIAS, String(id).toLowerCase());
}

/**
 * A news item's `kind`, in the seven spellings docs/NEWS.md fixes.
 * Falls back to the press mark for an unknown kind, for the same reason
 * labIcon() falls back: a new adapter is not a build failure.
 */
const KIND_ALIAS = {
  lab: 'lab', paper: 'paper', model: 'model', release: 'release',
  forum: 'forum', press: 'press', status: 'status',
  // the two spellings that already exist elsewhere in the tree
  news: 'press', code: 'release',
};
export function kindIcon(kind, opts) {
  const k = KIND_ALIAS[String(kind).toLowerCase()] || 'press';
  return icon(`kind-${k}`, opts);
}

/**
 * THE SHEET, GROUPED.
 *
 * Exported so three callers stop hard-coding name lists: a legend that wants
 * to print every source state; `iconSprite({ only })` on a page that knows it
 * needs one group and should not pay for the other six; and the visual
 * regression harness, which renders every group at 16, 32 and 64px and is the
 * only way anyone finds out that a new mark is mud at the smallest size it
 * ships at.
 *
 * Adding an icon without adding it to a set is caught at import time below.
 */
export const ICON_SETS = Object.freeze({
  pillar: ['pillar-capability', 'pillar-compute', 'pillar-attention', 'pillar-governance', 'pillar-markets'],
  state: ['state-live', 'state-stale', 'state-dark', 'state-awaiting'],
  datacentre: ['dc-operating', 'dc-building', 'dc-announced'],
  direction: ['dir-up', 'dir-down', 'dir-flat'],
  section: ['sec-index', 'sec-signal', 'sec-race', 'sec-floor', 'sec-wire', 'sec-substrate',
    'sec-digest', 'sec-bliss', 'sec-map', 'sec-history', 'sec-archive', 'sec-method', 'sec-api'],
  level: ['level-5', 'level-4', 'level-3', 'level-2', 'level-1'],
  lab: ['lab-openai', 'lab-anthropic', 'lab-google-deepmind', 'lab-xai', 'lab-meta',
    'lab-deepseek', 'lab-mistral', 'lab-qwen', 'lab-generic'],
  kind: ['kind-paper', 'kind-model', 'kind-release', 'kind-lab', 'kind-forum', 'kind-press', 'kind-status'],
});

// Module-load invariants. Both directions, because both have been wrong:
// a name in a set that no longer exists renders an empty <use> that nobody
// sees, and a name in the sheet that is in no set is invisible to the harness
// that would have caught it being mud at 16px.
(function assertIconSets() {
  const inSets = new Set();
  for (const [set, names] of Object.entries(ICON_SETS)) {
    for (const name of names) {
      if (!hasIcon(name)) throw new Error(`_icons: ICON_SETS.${set} names "${name}", which is not in the sheet`);
      if (inSets.has(name)) throw new Error(`_icons: "${name}" appears in two sets`);
      inSets.add(name);
    }
  }
  const orphans = ICON_NAMES.filter((n) => !inSets.has(n));
  if (orphans.length) {
    throw new Error(`_icons: ${orphans.length} icon(s) belong to no set: ${orphans.join(', ')}`);
  }
})();
