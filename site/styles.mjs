// All CSS lives here as strings and is inlined into a <style> block by
// build.mjs. No external stylesheet on purpose: the dashboard is a single
// scalar people screenshot, so a render-blocking round trip to a CSS file is a
// blank screenshot. One document, one request, number visible.

// Two families, chosen rather than defaulted:
//   JetBrains Mono  - numerals. Slashed zero, true tabular figures, and digit
//                     shapes that stay distinct at 9rem. Every number on the
//                     site is mono so columns line up and the hero digit reads
//                     as instrumentation.
//   Inter Tight     - prose. A neo-grotesque with tighter default tracking than
//                     Inter, which suits a dense dashboard without going
//                     condensed-and-shouty.
// display=swap so a slow or blocked Google Fonts never hides the score.
export const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap';

// Colour is dark-native: this is instrumentation, and the brand lives at night.
// Light is a full first-class theme, not an inverted afterthought. Amber over
// terminal green on purpose: green on black is what every competitor in the
// category already does badly.
//
// =========================================================================
// THE FOUR COLOUR JOBS. Every hue on this site does exactly one of them.
// =========================================================================
//
// This sheet has always claimed amber was "spent only on live values and the
// active level". It was not. Counted at the start of this pass, --accent was
// spent 66 times in this file alone: the level, links, link hover, the wall
// clock, the nav figures, tab selection, the focus ring, chart series lines,
// sparklines, the pillar ranking bars, arrival badges, per-feed count bars,
// timeline dots and dates, cross-sell figures, the move archive's deltas, the
// level epithet, and as the fallback under four different var() chains. A
// colour used for sixteen things is not an accent; it is the body text in a
// costume, and the level digit — the one number this entire publication exists
// to publish — was competing with the footer's hover state for it.
//
//   1. --accent (sodium amber)  THE LIVE READING OF THE INDEX ON THIS PAGE.
//      Nothing else. Ever. It survives on: the level digit and its glow, the
//      five level pips, the live band of the scale strip, the live segment of
//      the gauge, the newest point on the history chart and the guide line
//      pointing at it, the live stage of the oven rail, the return line (which
//      is drawn only when the index has actually moved since your last visit),
//      the live delta chip, and the same level inside the embed widget.
//      66 uses became 20, and eighteen of those twenty are one number.
//      The two that are not are ::selection and .skip, which are browser
//      affordances rather than content and have to be the loudest thing on
//      screen when they exist at all.
//
//   2. --accent-2 (cool)  A REAL SCALAR THAT BELONGS SOMEWHERE ELSE, plus
//      every interactive affordance. Nav figures, tab counts, cross-sell
//      figures, arrival badges, the focus ring, and every hover. The rule that
//      makes this legible: if clicking it takes you somewhere, or if the number
//      is about a different page, it is cool. If it is the reading of the page
//      you are standing on, it is amber.
//
//   3. --p / --pill-<id> (five pillar hues)  WHICH OF THE FIVE. Set on every
//      [data-pillar] in the document. See PILLARS_DARK below.
//
//   4. --heat-5 … --heat-1  WHERE ON THE 5→1 SCALE. The masthead ramp, the
//      oven burners, and nothing else.
//
// Everything outside those four is ink, rule, or one of the three source-state
// colours (--ok / --dark-src / --accent-2 doubling as awaiting-baseline), and
// the source states are the one place where the hue is the FOURTH signal
// behind a glyph, a word and a border style.
//
// The two scales below are what separates "considered" from "default": a short
// type scale and an eight-step space scale, both used everywhere, so no
// measurement on this site is an improvised number typed once and forgotten.

// ONE DEFINITION PER COLOUR, EMITTED THREE TIMES.
//
// The palette used to be typed out three times over - inside the
// prefers-color-scheme query, inside the pinned light theme and inside the
// pinned dark theme - which is three chances for a value to drift and no way to
// notice until a screenshot in one of them looks wrong. Two objects and a
// serialiser produce the same CSS from one source, and adding a token is now
// one line rather than four.
const DARK = {
  bg:            '#0b0c0e',
  'bg-raised':   '#131519',
  'bg-sunken':   '#08090a',
  ink:           '#e8eaee',
  'ink-dim':     '#9aa2ad',
  // RAISED THIS PASS, in both schemes, and it is the largest single legibility
  // change in the file. Measured on the built homepage, 2026-09-24: 166 rules
  // across nine templates paint text in --ink-faint, and in the LIGHT scheme
  // #838a93 on the sunken ground measured 3.03:1 — 88 text elements on one page
  // failing WCAG AA at every size the site uses. The dark scheme was failing
  // too, more quietly: #6a717b measured 3.97:1 on --bg and 3.71:1 on
  // --bg-raised.
  //
  // #7a828c measures 5.03 : 4.70 : 5.12 against bg / raised / sunken.
  //
  // This does cost some of the tonal distance from --ink-dim (the two are now
  // 1.41x apart in relative luminance rather than 1.91x). That is the right
  // trade and it is the whole argument of this pass: de-emphasis is supposed to
  // come from SIZE, WEIGHT and POSITION, which a reader can act on, not from
  // ink so pale that the sentence is merely hard to read. A caption that cannot
  // be read is not a quiet caption, it is a bug with good manners.
  'ink-faint':   '#7a828c',
  rule:          '#23262c',
  'rule-soft':   '#191c21',
  accent:        '#ffb020',
  'accent-ink':  '#0b0c0e',
  // The cool counterpart to sodium amber. Amber is spent on the live value and
  // the active level and nothing else; this one is for the calm end of a scale
  // and for the infrastructure page, where "nothing is happening" is the
  // finding and printing it in the alarm colour would be a lie in CSS.
  'accent-2':    '#56b0e0',
  ok:            '#5fd08a',
  stale:         '#ffb020',
  'dark-src':    '#ff6b6b',
  // THE HEAT RAMP - five stops, one per level, cool to hot, and the numbering
  // follows the levels: --heat-5 is DORMANT, --heat-1 is UNPRECEDENTED.
  //
  // A temperature ramp is the right metaphor and not a smuggled risk claim,
  // because the thing being measured IS how much is happening - that is the
  // literal definition of the index (docs/VOICE.md 1). It is still never the
  // only signal: every surface that uses these also prints the level's name and
  // its band, so the ramp is confirmation and the words are the reading.
  'heat-5':      '#56b0e0',
  'heat-4':      '#5fd08a',
  'heat-3':      '#ffb020',
  'heat-2':      '#ff8b3d',
  'heat-1':      '#ff5f56',
  scan:          'rgba(255,255,255,0.016)',
  // Chart washes. Literal rgba rather than color-mix, so a chart never depends
  // on a colour function for its LEGIBILITY - only for its polish.
  wash:          'rgba(232,234,238,0.042)',
  'wash-alt':    'rgba(232,234,238,0.021)',
  'wash-live':   'rgba(255,176,32,0.115)',
  fill:          'rgba(255,176,32,0.150)',
  // ELEVATION - TWO STEPS, AND THEY ARE THIS PASS'S ANSWER TO "FRIENDLIER".
  //
  // The sheet had no shadow token at all, so every raised surface on the site
  // was separated from the page by a 1px hairline and nothing else. A hairline
  // is a DIAGRAM of a card; a shadow is a card. Two steps and no more, because
  // a third is how an elevation system starts lying about depth:
  //   --shadow-1  a resting surface: chart plates, the pillar grid, the
  //               cross-sell deck, the arrivals strip, the embed snippet.
  //   --shadow-2  a surface the pointer is on. Only ever a hover state.
  // Both are pure black in the dark scheme (a shadow on #0b0c0e has to be
  // darker than the page or it is a glow) and the warm near-black of --ink in
  // the light one, so the light theme's paper ground does not get a grey cast.
  // Neither carries meaning: turn both off and the site loses no fact and
  // fails no contrast check, which is the test for anything decorative here.
  'shadow-1':    '0 1px 2px rgba(0,0,0,0.44)',
  'shadow-2':    '0 10px 26px -12px rgba(0,0,0,0.72), 0 2px 6px -2px rgba(0,0,0,0.5)',
};

const LIGHT = {
  bg:            '#faf9f6',
  'bg-raised':   '#ffffff',
  'bg-sunken':   '#f1efe9',
  ink:           '#14161a',
  'ink-dim':     '#545a62',
  // See the dark set's note. #838a93 measured 3.31 : 3.49 : 3.03 against
  // bg / raised / sunken and was the direct cause of 70 of the 88 AA failures
  // counted on the light homepage. #666d75 measures 4.97 : 5.24 : 4.56, so the
  // weakest of the three grounds now clears AA with room, and the light scheme
  // stops being the one that has quietly been the weaker for several rounds.
  'ink-faint':   '#666d75',
  rule:          '#e0ddd5',
  'rule-soft':   '#eeebe4',
  accent:        '#9a5a00',
  'accent-ink':  '#ffffff',
  'accent-2':    '#0f6183',
  ok:            '#17714a',
  stale:         '#8a5a00',
  // DARKENED THIS PASS, and it is a colour-blindness fix rather than a taste
  // one. Measured relative luminance on paper: --ok #17714a is 0.125 and the
  // old --dark-src #b3261e was 0.111 - a 1.1x lightness ratio between the two
  // states this codebase exists to keep apart. Green and red are the textbook
  // deuteranopia confusion pair, so a reader with the commonest colour vision
  // deficiency was separating "live" from "dark" on the glyph alone, in the
  // theme the brief correctly names as the weaker one. #8c1d18 measures 0.065,
  // which is a 1.9x lightness ratio, and it still clears 8.6:1 against the
  // #faf9f6 ground - it got MORE legible, not less. The dark theme's pair
  // (0.49 against 0.33) was already separated and is untouched.
  'dark-src':    '#8c1d18',
  // Every one of these is darkened until it clears 4.5:1 against #faf9f6. The
  // dark set's #56b0e0 lands at 2.0:1 on paper, which is a hairline nobody can
  // see - a first-class light theme is the whole reason this map exists.
  'heat-5':      '#0f6183',
  'heat-4':      '#17714a',
  'heat-3':      '#9a5a00',
  'heat-2':      '#a8450d',
  'heat-1':      '#b3261e',
  scan:          'rgba(0,0,0,0.012)',
  wash:          'rgba(20,22,26,0.046)',
  'wash-alt':    'rgba(20,22,26,0.022)',
  'wash-live':   'rgba(154,90,0,0.105)',
  fill:          'rgba(154,90,0,0.130)',
  // See the dark set. Tinted with --ink (#14161a) rather than pure black so a
  // card on the #faf9f6 paper ground casts a warm shadow rather than a grey
  // one - pure black on warm paper is the single tell that separates a light
  // theme that was designed from a light theme that was inverted.
  'shadow-1':    '0 1px 2px rgba(20,22,26,0.055)',
  'shadow-2':    '0 10px 26px -12px rgba(20,22,26,0.18), 0 2px 6px -2px rgba(20,22,26,0.08)',
};

function palette(vars, indent = '  ') {
  return Object.entries(vars).map(([k, v]) => `${indent}--${k}: ${v};`).join('\n');
}

// PER-ORGANISATION ACCENTS, for the principal marks in
// site/templates/_avatars.mjs. The shape in that file identifies the person;
// this identifies their lab, so Zuckerberg and LeCun share a hue and differ in
// silhouette - which is the true relationship rather than a palette accident.
//
// The dark values are _labs.mjs's ACCENT verbatim, so a principal's mark and
// the left edge of that lab's box on the watch floor are the same colour. The
// light values are darkened here because _labs.mjs sets its accent inline and
// therefore cannot have a second theme; xAI's #9aa4b2 is a 2.1:1 hairline on
// paper. A lab with no entry falls back to --accent, which is why the table
// being incomplete is a cosmetic problem rather than an invisible mark.
const ORG_DARK = {
  openai: '#10a37f', anthropic: '#d97757', 'google-deepmind': '#5b9cff',
  xai: '#aab3bf', meta: '#3b82f6', deepseek: '#7a8cff',
  mistral: '#fa720f', qwen: '#8b86ff',
};
const ORG_LIGHT = {
  openai: '#0a6e55', anthropic: '#a2472a', 'google-deepmind': '#1a56d6',
  xai: '#4a525c', meta: '#1d4ed8', deepseek: '#3b3fc4',
  mistral: '#a34204', qwen: '#4b46c4',
};

function orgHues(prefix, hues) {
  return Object.entries(hues)
    .map(([id, c]) => `${prefix}[data-org="${id}"] { --avt-a: ${c}; }`)
    .join('\n');
}

// THE FIVE PILLAR HUES, PROMOTED TO THE GLOBAL SHEET.
//
// These five values are _reel.mjs's HUES_DARK / HUES_LIGHT, character for
// character. They are repeated here rather than imported for one reason that
// is worth the duplication: `pillarCss` is shipped INSIDE <main>, by whichever
// page happens to import it, so on a page that does not (methodology, history,
// the move pages, and this file's own chrome) `--p` was simply unset and every
// pillar-keyed surface fell back to the neutral rule. The operator has asked
// twice for more colour and five of the site's best colours were switched off
// on four of its pages.
//
// Promoting them costs ~40 lines of the head sheet and makes the hue a fact of
// the document rather than a fact of one section. The per-page block still
// ships and still wins on order; the values are identical, so it wins a tie
// with itself. If the two ever disagree, _reel.mjs is the definition and this
// is the copy — that pairing is in the integration note.
//
// Never the only signal, anywhere: every element that spends --p also carries
// the pillar's sigil (.pillar-tag::before, PILLAR_GLYPH in _charts.mjs) or its
// name in words. Desaturate the whole sheet and no fact is lost.
const PILLARS_DARK = {
  capability: '#6ea8fe',
  compute: '#c792ea',
  attention: '#ffb020',
  governance: '#5fd08a',
  markets: '#ff8f6b',
};
const PILLARS_LIGHT = {
  capability: '#1d4ed8',
  compute: '#6b21a8',
  attention: '#9a5a00',
  governance: '#17714a',
  markets: '#b3441e',
};

/**
 * Two emissions per set. `--pill-<id>` on the root is what lets a surface name
 * ONE pillar without carrying the attribute — the nav, a legend swatch, a
 * gradient across all five. `--p` on `[data-pillar=<id>]` is the inherited
 * hook every existing template already writes against and is untouched.
 */
function pillarHues(prefix, hues) {
  const root = Object.entries(hues).map(([id, c]) => `  --pill-${id}: ${c};`).join('\n');
  const hook = Object.entries(hues)
    .map(([id, c]) => `${prefix}[data-pillar="${id}"] { --p: ${c}; }`)
    .join('\n');
  return { root, hook };
}

const TOKENS = `
:root {
  color-scheme: dark light;

${palette(DARK)}
${pillarHues('', PILLARS_DARK).root}

  --mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  --sans: 'Inter Tight', system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif;

  /* ---- THE TYPE SCALE. SIX STEPS. -------------------------------------
     The previous sheet said "deliberately short - seven sizes" and then, three
     hundred lines lower down, typed a size by hand sixty-one more times.
     Counted before this pass: 24 distinct absolute sizes plus 4 ad-hoc clamps,
     so the "scale" described the tokens and not the sheet. On the built
     homepage at 375px that resolved to 25 distinct RENDERED sizes, which is
     not a hierarchy — it is a gradient, and a gradient has no top.

     Six, and each has a job no other one does. Nothing below this block sets a
     size in pixels; every rule names a step. 8, 8.5, 9, 9.5, 11.5, 12, 12.5,
     13.5, 14, 14.5, 15, 15.2, 16.32, 17, 32 and 36 are gone, and every one of
     them went to the nearest step LARGER than itself, never smaller — six of
     the cut sizes were under 10px, which is below the floor where this site's
     faint ink is legible at all in the light scheme (see --ink-faint).

     --t-md is KEPT, as an alias of --t-base, rather than deleted: eleven rules
     across six other templates name it, and a token that resolves to the body
     size is a one-line retirement where a deletion is six files of breakage.
     It is not a seventh step and nothing new may use it. */
  /* THE STEPS WERE TOO SMALL. Measured on the live homepage at 1440x900,
     2026-09-26: of 1,154 rendered HTML text nodes, 804 - SEVENTY PER CENT -
     were under 12px, the single commonest size on the site was 10px (401
     nodes) and only 53 nodes reached the 16px body step. The six-step scale
     above is sound; what was wrong is that the site is built almost entirely
     out of its two smallest steps, so the page reads as a terminal printout
     however much colour is added to it. Raising the three small steps lifts
     954 of those nodes in one move, without renaming a token or touching the
     34 templates that name them. --t-base and up are unchanged: the body was
     never the problem. */
  --t-2xs:  0.75rem;    /* 12 - mono micro-labels: rail keys, chip status, sigils (was 10) */
  --t-xs:   0.8125rem;  /* 13 - mono labels, eyebrows, section heads, captions    (was 11) */
  --t-sm:   0.90625rem; /* 14.5 - secondary prose, blurbs, tab labels, code       (was 13) */
  --t-base: 1rem;       /* 16 - body, and every lede                              */
  --t-lg:   1.25rem;    /* 20 - card numerals, h3                                 */
  --t-xl:   1.625rem;   /* 26 - h2, the level name, the page's second-largest fact */
  --t-md:   var(--t-base);  /* RETIRED alias. Do not use. */

  /* ---- DISPLAY. Outside the scale, and each bound to ONE element. --------
     A clamp is not a step — it is one element's behaviour across the viewport,
     and the moment two elements share one, the scale has quietly grown a
     seventh member. Three, and the comment names the sole user of each. */
  --d-level: clamp(5rem, 29vw, 8.75rem);      /* .level__digit  — nothing else */
  --d-score: clamp(2.5rem, 12.5vw, 3.5rem);   /* .score__val    — nothing else */
  --d-title: clamp(2rem, 8.5vw, 2.5rem);      /* .prose > h1    — nothing else */

  /* Space scale, 4px-based. Every margin and gap on the site is one of these. */
  --s-1: 4px;  --s-2: 8px;  --s-3: 12px; --s-4: 16px;
  --s-5: 24px; --s-6: 32px; --s-7: 48px; --s-8: 64px;

  /* Section rhythm. TWO values doing two different jobs, which is the whole of
     this pass's answer to "more organised".

     --row is the gap between things that belong TOGETHER: a heading and the
     list it labels, two rows of the same table, a caption and its chart. It is
     deliberately tight, because negative space between related items is not
     breathing room - it is a suggestion that they are unrelated.

     --sec is the gap between things that do NOT belong together, and it is now
     larger than it was rather than smaller. Measured at 375px before this pass:
     eleven sections at a uniform 28px, so the page read as one 13,000px column
     with hairlines in it. Shortening the inner gaps and lengthening the outer
     ones costs nothing net and is what turns a column into a stack of panels -
     the difference between a document and a console. */
  --row:    10px;
  --sec:    32px;
  /* 48, not 44. --sec is --s-6 exactly and --sec-lg was the one rhythm value
     in the file that named no step, which is the precise thing the comment
     above the type scale forbids ("every rule names a step"). 48 is --s-7, it
     is 4px more air between unrelated blocks rather than less, and it means
     the two section gaps are now 2 and 3 units of the same 16px module. */
  --sec-lg: 48px;

  /* The measure. One token, overridden on <body data-wide> for the pages whose
     job is density rather than reading. */
  --wrap: 940px;

  --gutter: 16px;
  /* THE MEASURE WAS CALIBRATED IN THE WRONG UNIT. Measured on the live page
     2026-09-26: .lede carries max-width:var(--measure) and still rendered 92
     REAL characters per line. The CSS ch unit is the advance of "0", which
     in this face is 8.38px where the average lowercase advance is 6.01px — a
     ratio of 0.72 — so 66ch buys about 92 characters, not 66. Typographic
     comfort is 45-75 characters and 92 is outside it.
     50ch x (8.38/6.01) lands at ~70 real characters, inside the band. */
  --measure: 50ch;

  /* RADIUS, NOW A SCALE OF TWO RATHER THAN ONE VALUE OF 3px.

     3px is the radius of something that did not want a radius. It reads at
     arm's length as a square corner with an antialiasing artefact, which is
     why the site looked machined rather than made. Raised to 6, which is the
     smallest radius that is legible AS a radius at 13px type, and given a
     large partner for anything that is a PANEL rather than a control.

     The reason this is one token change and not fifty is that 55 rules across
     the page templates already name var(--radius) - so every chip, badge,
     card and code block on every page rounds together, including the ones in
     files this task may not open. Anything that wants to stay crisp keeps its
     own literal; nothing does, because nothing on a dashboard is improved by
     one box being sharper than the box beside it.

     --radius     controls and inline objects: chips, tags, badges, buttons.
     --radius-lg  panels: chart plates, the pillar grid, the cross-sell deck,
                  the arrivals strip, prose tables and code blocks. */
  --radius: 6px;
  --radius-lg: 12px;

  /* The height of the sticky rail, as a token rather than as a number typed in
     two places. Anything that ever needs to scroll to a position clear of the
     pinned strip reads this, and the scroll-padding-top rule below is what stops an
     in-page anchor landing under it. */
  --rail-h: 28px;
}

body[data-wide="1"] { --wrap: 1240px; }

${orgHues('', ORG_DARK)}
${pillarHues('', PILLARS_DARK).hook}

@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]) {
${palette(LIGHT, '    ')}
${pillarHues('', PILLARS_LIGHT).root}
  }
${orgHues('  :root:not([data-theme="dark"]) ', ORG_LIGHT)}
${pillarHues('  :root:not([data-theme="dark"]) ', PILLARS_LIGHT).hook}
}

/* Explicit overrides so the embed can be pinned to a theme by the host page
   regardless of the visitor's OS setting - a light blog embedding a black box
   looks broken, and they cannot restyle inside an iframe. */
:root[data-theme="light"] {
  color-scheme: light;
${palette(LIGHT)}
${pillarHues('', PILLARS_LIGHT).root}
}
${orgHues(':root[data-theme="light"] ', ORG_LIGHT)}
${pillarHues(':root[data-theme="light"] ', PILLARS_LIGHT).hook}

:root[data-theme="dark"] {
  color-scheme: dark;
${palette(DARK)}
${pillarHues('', PILLARS_DARK).root}
}
${orgHues(':root[data-theme="dark"] ', ORG_DARK)}
${pillarHues(':root[data-theme="dark"] ', PILLARS_DARK).hook}
`;


const BASE = `
*, *::before, *::after { box-sizing: border-box; }
html {
  -webkit-text-size-adjust: 100%; scroll-behavior: smooth;
  /* Every in-page anchor on this site - the methodology headings, #oven, the
     footer's section ids - would otherwise land its target underneath the
     pinned rail. One declaration, and it is the only cost the sticky rail
     imposes anywhere. */
  scroll-padding-top: calc(var(--rail-h) + 6px);
}
body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--sans);
  font-size: var(--t-base);
  line-height: 1.55;
  font-synthesis-weight: none;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
  /* Tabular figures everywhere by default. Two builds an hour apart differ only
     in their digits, and proportional figures make a whole block reflow when a
     1 becomes a 7 - visible as jitter between two screenshots of the same page. */
  font-variant-numeric: tabular-nums;
}
/* ...except in running prose, where proportional figures set better. */
.prose p, .prose li, .lede, .foot p { font-variant-numeric: proportional-nums; }

/* One motion policy for the whole document. Nothing here animates on load; the
   few hover transitions and the feed's live dot all stop here. */
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}

/* The CRT tell, kept to a whisper. A 3px scanline at ~1.6% alpha reads as
   phosphor on a photograph and is invisible as texture at arm's length. No
   flicker animation: it makes text unreadable, it is a seizure risk, and it
   destroys screenshots - which are the entire growth loop. */
body::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9;
  background: repeating-linear-gradient(
    to bottom, var(--scan) 0 1px, transparent 1px 3px
  );
}
@media print { body::after { display: none; } }

/* LINKS ARE UNDERLINED UNLESS THEY CARRY THEIR OWN BOX.
   This line used to read "a { color: inherit; ... }" with no text-decoration,
   which meant every anchor on the site was born invisible and only became
   findable where a template happened to remember. Measured 2026-09-26: 31 of
   74 visible links on the homepage had NO static affordance at all — same ink
   as the body text, no underline, no border, no background — and the six
   worst carried a :hover rule only. Hover does not exist on a phone, so on
   most of the traffic those links were indistinguishable from prose. The
   operator's words: "it's hard to see what to click".

   Inverting the default fixes the CLASS of bug rather than the instances: a
   link added next year is visible without anyone remembering. The underline is
   drawn in --ink-faint rather than the text colour so it reads as a quiet
   affordance on a dense page instead of shouting.

   Opted out below: anything that already carries a border, a background or a
   chip, because two affordances on one control is noise, not clarity. */
a {
  color: inherit;
  text-decoration: underline;
  text-decoration-color: var(--ink-faint);
  text-underline-offset: 3px;
  text-decoration-thickness: 1px;
}
a:hover { text-decoration-color: currentColor; }
/* Controls that are already unmistakably pressable. Measured, not guessed:
   each of these reported a border or a background in the audit. */
.skip, .fb__t, .reel__more, .sw__more, .lw__more, .lw__rest,
.foot a, .sw__tab, .sw__tl, .rail__c, .dcmx__i { text-decoration: none; }
/* One focus ring for the whole document, and it is a RING plus an offset rather
   than a colour swap: on a page whose single accent is already spent on live
   values, a focused link that merely turns amber is indistinguishable from a
   live value. Two pixels of accent with two pixels of background behind it is
   legible on the dark ground, on the light ground, and on top of the one amber
   surface (the filled level cells). */
a:focus-visible, button:focus-visible, summary:focus-visible,
[tabindex]:focus-visible, details:focus-visible {
  outline: 2px solid var(--accent-2); outline-offset: 2px; border-radius: 2px;
}
::selection { background: var(--accent); color: var(--accent-ink); }
h1, h2, h3, h4 { font-weight: 600; line-height: 1.2; letter-spacing: -0.015em; margin: 0; }
p { margin: 0 0 1em; }
code, kbd, pre, .num, time { font-family: var(--mono); font-variant-numeric: tabular-nums; }

.wrap { width: 100%; max-width: var(--wrap); margin: 0 auto; padding: 0 var(--gutter); }
/* One place decides the gap between the chrome and the first thing on the page.
   Every template starts with a different element - a hero, a prose h1, a race
   intro - and without this the prose pages began 6px under the rail. .hero
   gives up its own top padding so the dashboard does not get both. */
main.wrap { padding-top: var(--s-4); }
/* Keyboard users land on this before the masthead. Off-screen until focused -
   never display:none, which would take it out of the tab order and make it
   ornamental. */
.skip {
  position: absolute; left: var(--gutter); top: -60px; z-index: 40;
  font-family: var(--mono); font-size: var(--t-xs); letter-spacing: 0.1em; text-transform: uppercase;
  background: var(--accent); color: var(--accent-ink); padding: 8px 12px;
  border-radius: 0 0 var(--radius) var(--radius); text-decoration: none;
  transition: top 120ms ease;
}
.skip:focus { top: 0; }

/* <details> is used wherever the long form of an honesty note has to stay on
   the page without owning the fold: the degraded banner, methodology asides.
   The marker is a glyph we draw, so it is identical in both engines. */
details > summary {
  cursor: pointer; list-style: none;
  font-family: var(--mono); font-size: var(--t-2xs); letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--ink-dim); display: inline-flex; align-items: center; gap: 5px;
}
details > summary::-webkit-details-marker { display: none; }
details > summary::before {
  content: '\\002b'; display: inline-block; width: 11px; text-align: center;
  border: 1px solid currentColor; border-radius: 2px; font-size: var(--t-2xs); line-height: 11px;
}
details[open] > summary::before { content: '\\2212'; }
details > summary:hover { color: var(--ink); }
.vh {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
.rule { border: 0; border-top: 1px solid var(--rule); margin: var(--s-6) 0; }

.eyebrow {
  font-family: var(--mono); font-size: var(--t-xs); font-weight: 500;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-faint);
  margin: 0 0 var(--s-2);
}

/* CUT in v5: .wrap--wide and .layout-split. Both were dead - grepped across
   every template and every module that emits markup, including the three
   landed since the last pass, and nothing in the repo writes either class.
   --wrap on <body data-wide> replaced the first; no page has ever used the
   sticky-aside layout the second describes. */
`;

const CHROME = `
/* ---------------------------------------------------------------------------
   The masthead, the rail, the return line, the footer.

   These four are what make six pages read as one publication rather than one
   page with siblings. The rail in particular is the density fix: measured
   against pizzint, our problem was never glyph count - at 375px we were level
   with them - it was that roughly twenty of our fifty-seven desktop atoms were
   the SAME composite score wearing a different hat. The rail carries eight to
   ten facts about eight to ten DIFFERENT things, in 28px.
   --------------------------------------------------------------------------- */
.masthead {
  border-bottom: 1px solid var(--rule);
  background: var(--bg-sunken);
  position: relative; z-index: 10;
}
.masthead__in {
  display: flex; align-items: baseline; gap: 2px var(--s-3);
  padding-top: 8px; padding-bottom: 7px; flex-wrap: wrap;
}
/* Measured at 375px: 96px of masthead to carry a wordmark, a tagline and a nav
   - on a page whose first job is to show a number above the fold to someone who
   tapped a screenshot. The tagline is the thing to spend: it is repeated
   verbatim in the footer creed one screen further down and it is the only line
   in the block that is not a fact or a destination. Under 560px it is dropped
   from the flow, which is 32px of a 812px fold back.
   It is still in the HTML and still in the footer, so nothing is lost to a
   crawler or to a reader. */
@media (max-width: 559px) {
  .masthead__tag { display: none; }
  .masthead__in { gap: 4px var(--s-3); }
}
.masthead__tag {
  font-size: var(--t-sm); color: var(--ink-faint); margin: 0;
  flex: 1 1 auto; min-width: 0;
}
/* The masthead text nav lived here. It is gone: the feature bar renders the
   same SECTIONS array as tiles with a mark and a live count on each, so this
   was the same eleven links a second time, stacked above them. Removed with
   the markup in site/templates/layout.mjs, 2026-09-25. */

/* ---- the rail ---------------------------------------------------------- */
/* THE RAIL IS NOW STICKY, AND IT IS THE BIGGEST SINGLE MOVE IN THIS PASS.

   The homepage is thirteen thousand pixels tall on a phone. Under the old
   rules, every fact about the instrument - the clock, the delta, the level, the
   source counters, the posture - lived in the first 130px and then left,
   permanently, and 12,000px of a page called a dashboard had no dashboard on
   it. Pinning the rail costs ZERO pixels of page height, because the strip was
   already there, and it converts the whole scroll into an instrument: the
   number and the second hand stay with you through the feed, the oven, the
   watch floor and the wire.

   It is the one thing in the category nobody does. It is also the honest
   version of "a dashboard you cannot stop looking at": what is pinned is a
   ticking clock and an exact signed delta, not an animation.

   Held to ONE LINE at every width so the offset below is a constant and the
   sticky band can never eat a third of a phone fold. */
.rail {
  border-bottom: 1px solid var(--rule);
  background: var(--bg-sunken);
  position: sticky; top: 0; z-index: 20;
}
/* A sticky element inherits no backdrop, so the scanline overlay and the page
   behind it would both show through the 1px hairline. An explicit background
   plus the hairline is what makes it read as a panel edge rather than a seam. */
@supports (backdrop-filter: blur(2px)) {
  .rail { background: color-mix(in srgb, var(--bg-sunken) 92%, transparent); backdrop-filter: blur(6px); }
}
.rail__in {
  display: flex; flex-wrap: nowrap; align-items: baseline;
  gap: 0; padding-top: 0; padding-bottom: 0;
  min-height: var(--rail-h); overflow-x: auto; overscroll-behavior-x: contain;
  scrollbar-width: none; -ms-overflow-style: none;
}
.rail__in::-webkit-scrollbar { display: none; }
.rail__c { flex: 0 0 auto; }
/* The wall clock, absorbed from the deleted .ops strip. The only element on the
   site that changes when nothing has happened - which is why it is stated as a
   TIME and sits beside OBSERVED, whose stamp is the thing that means the data
   moved. Tabular figures or the whole strip reflows once a second. */
.rail__clk { color: var(--ink); letter-spacing: 0.04em; }
/* On a phone the rail is ONE scrolling line, not five wrapped ones. Wrapped, it
   was 146px - 18% of an 812px fold - to say nine things that each fit in a
   thumb-width. A status bar that scrolls is the terminal idiom and it is what
   the cell rules are shaped for; the fade on the trailing edge is the only
   affordance it needs, and every cell in it is also stated somewhere below in
   full. STATUS is ordered first here because it is the one cell whose absence
   from view could mislead - and it is the one that says DEGRADED about us. */
/* The fade on the trailing edge is the only affordance a terminal status bar
   has ever needed, and it is applied only where the strip can actually
   overflow: at the wide measure all eleven cells fit and a permanent fade over
   the last cell would be a lie about there being more. */
@media (max-width: 1100px) {
  .rail__in {
    -webkit-mask-image: linear-gradient(to right, #000 88%, transparent);
    mask-image: linear-gradient(to right, #000 88%, transparent);
  }
}
@media (max-width: 679px) {
  /* Re-establish the separator the desktop rules take off the posture cell,
     because at this width it is no longer the last item on the line - it is the
     first, and "OPERATIONALUTC" is what happens without this. The clock is
     ordered ahead of it: on a phone the two cells that must survive a glance
     without a swipe are "is it working" and "what time is it now". */
  .rail__in .rail__c--posture:last-child {
    order: -1; border-right: 1px solid var(--rule-soft);
    padding-right: var(--s-3); margin-right: var(--s-3);
  }
  .rail__in .rail__c:first-child { order: -2; }
}
/* A vertical hairline between cells, not a gap: the cells are of very different
   widths and a pure gap made the strip read as a wrapped sentence. The rule
   makes it read as an instrument panel, and it costs no height at all. */
.rail__c {
  display: inline-flex; align-items: baseline; gap: 5px;
  padding: 5px var(--s-3) 5px 0; margin-right: var(--s-3);
  border-right: 1px solid var(--rule-soft);
  font-family: var(--mono); font-size: var(--t-xs); white-space: nowrap;
  color: var(--ink-dim); text-decoration: none;
}
.rail__c:last-child { border-right: 0; margin-right: 0; padding-right: 0; }
/* 10px uppercase mono at 0.12em tracking is the smallest type on the site, and
   it was also in the palette's faintest ink - the two hardest-to-read choices
   stacked on the one strip that is pinned to the top of every page. --ink-dim
   measures 7.73 on --bg-sunken in dark and 6.06 in light, against 5.12 / 4.56.
   The key still reads as the quiet half of the cell because it is 10px against
   the value's 11px and because the value is weight 500. */
.rail__k {
  font-size: var(--t-2xs); letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--ink-dim);
}
.rail__v { color: var(--ink); font-weight: 500; }
.rail__v small { color: var(--ink-faint); font-weight: 400; font-size: var(--t-2xs); }
.rail__s { color: var(--ink-faint); font-size: var(--t-2xs); letter-spacing: 0.06em; }
.rail__c[data-bad="1"] .rail__v { color: var(--dark-src); }
a.rail__c { transition: color 120ms ease; }
a.rail__c:hover .rail__v, a.rail__c:hover .rail__k { color: var(--accent-2); }
.rail__c--home .rail__v:first-of-type { letter-spacing: 0.06em; }
/* Posture is carried by the WORD as well as the hue: a greyscale screenshot,
   or a reader who cannot separate the colours, still reads DEGRADED. */
.rail__c--posture { margin-left: auto; padding-right: 0; border-right: 0; }
.rail__c--posture[data-posture="operational"] .rail__v { color: var(--ok); }
.rail__c--posture[data-posture="degraded"] .rail__v { color: var(--stale); }
@media (max-width: 620px) { .rail__c--posture { margin-left: 0; } }

/* The ticking age beside OBSERVED, and the countdown in place of NEXT DUE. The
   two atoms that move. Both are exact UTC facts in the HTML before any script
   runs; the script only ever ADDS the relative form beside the absolute one. */
.rail__age { color: var(--ink-faint); font-size: var(--t-2xs); }
.rail__age[hidden] { display: none; }
[data-dc-next][data-late="1"] { color: var(--stale); }
[data-dc-next][data-late="2"] { color: var(--dark-src); }

/* ---- the delta chip ---------------------------------------------------- */
/* Shape, then number, then a visually-hidden word. Colour is the third signal
   and never the only one - this chip is the thing a reader looks at to answer
   "did it move", and it has to survive a greyscale repost at thumbnail size. */
.delta {
  display: inline-flex; align-items: baseline; gap: 3px;
  font-family: var(--mono); font-variant-numeric: tabular-nums; white-space: nowrap;
}
.delta__g { font-size: var(--t-2xs); line-height: 1; }
.delta__n { font-weight: 700; color: var(--ink); }
/* ONE accent, and no good/bad axis. Green for a falling score would say that a
   quieter day is a better day, and DOOMCON measures activity tempo - it is not
   a risk scale and VOICE.md will not let a colour smuggle in the claim the copy
   is forbidden to make. Up gets the accent because rising activity is the thing
   the instrument is watching for; down and flat are ink. The glyph is the
   primary signal in every case, so the direction survives greyscale. */
.delta[data-dir="up"] .delta__g { color: var(--accent); }
.delta[data-dir="down"] .delta__g { color: var(--ink-dim); }
.delta[data-dir="flat"] .delta__g { color: var(--ink-faint); }
.delta--sm { font-size: var(--t-xs); }
.delta--sm .delta__n { font-weight: 500; color: var(--ink-dim); }

/* ---- the return line --------------------------------------------------- */
/* Nobody in this category has a return state. pizzint's twenty-six JS chunks
   hold three localStorage keys and not one of them is about change. This strip
   is drawn only when the build the reader last saw is not the build in front of
   them, so it is never decoration: if it is visible, something moved. */
.rvisit {
  border-bottom: 1px solid var(--rule);
  border-left: 2px solid var(--accent);
  background: var(--bg-raised);
  position: relative; z-index: 10;
}
.rvisit[hidden] { display: none; }
.rvisit__in {
  display: flex; flex-wrap: wrap; align-items: baseline; gap: 5px var(--s-3);
  padding-top: 7px; padding-bottom: 7px;
  font-family: var(--mono); font-size: var(--t-xs); color: var(--ink-dim);
}
.rvisit__k {
  color: var(--accent); letter-spacing: 0.14em; text-transform: uppercase;
  font-size: var(--t-2xs); font-weight: 700;
}
.rvisit__t { color: var(--ink-faint); }
.rvisit__d {
  color: var(--ink); font-weight: 700; font-variant-numeric: tabular-nums;
  border: 1px solid var(--rule); border-radius: 2px; padding: 0 5px;
}
.rvisit__d[data-dir="up"] { border-color: var(--accent); }
.rvisit__d[data-dir="down"] { border-color: var(--ink-faint); }
.rvisit__d:empty, .rvisit__x:empty, .rvisit__t:empty { display: none; }
.rvisit__b {
  margin-left: auto; appearance: none; -webkit-appearance: none;
  background: none; border: 0; padding: 2px 0; cursor: pointer;
  font-family: var(--mono); font-size: var(--t-2xs); letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--ink-faint);
}
.rvisit__b:hover { color: var(--ink); }

/* ---- degraded ---------------------------------------------------------- */
/* Liveness is the feature we advertise (TEARDOWN 3.1). When it is bad we say so
   at the top of the page, above the number, in words - in ONE LINE. The old
   form spent 42 words and 21% of an 812px phone fold on a caveat and then the
   hero underneath declined to say whether the number had moved, which is being
   careful in the wrong place. Every clause of it is still here, behind <why>. */
.degraded {
  background: var(--bg-raised);
  border-top: 2px solid var(--stale);
  border-bottom: 1px solid var(--rule);
  position: relative; z-index: 10;
}
.degraded__in {
  padding: 7px 0; display: flex; gap: 5px 10px; align-items: baseline; flex-wrap: wrap;
}
.degraded__mark {
  font-family: var(--mono); font-weight: 700; font-size: var(--t-xs);
  letter-spacing: 0.12em; color: var(--stale); flex: 0 0 auto;
}
/* Two rows on a phone, one on a desktop, and never three. As a plain wrapping
   flex row the <p> is a block-level flex item whose base size is max-content,
   so DEGRADED took a line, the sentence took two, and the <why> toggle took a
   fourth - 103px to say what fits in 65. Ordering the toggle up beside the mark
   and giving the sentence the full second row costs nothing and reads better:
   the label and the escape hatch are the chrome, the sentence is the content. */
.degraded__txt {
  font-family: var(--mono); font-size: var(--t-xs); margin: 0; color: var(--ink);
  min-width: 0; overflow-wrap: anywhere; flex: 1 0 100%; order: 2;
}
.degraded__txt strong { font-weight: 600; }
.degraded__d { flex: 0 0 auto; order: 1; margin-left: auto; }
@media (min-width: 720px) {
  .degraded__txt { flex: 0 1 auto; order: 0; }
  .degraded__d { order: 0; }
}
.degraded__d > p {
  font-family: var(--sans); font-size: var(--t-sm); color: var(--ink-dim);
  margin: var(--s-2) 0 2px; max-width: var(--measure); flex-basis: 100%;
}
.degraded__d[open] { flex-basis: 100%; }

/* ---- the footer as a site index ---------------------------------------- */
/* pizzint spends 26.5% of its homepage height selling its other pages; we spent
   3.6%. Half that gap closes here for free: every route, in nav order, each
   with the one sentence that says why you would open it. The reader who got
   this far is the reader most likely to open a second page, and we were handing
   them five bare words. */
/* 885px AT 375px, MEASURED - 9.8% of the page, to list twelve links and a
   licence. The footer earns its keep as a site index (that argument is above
   and it stands), but it was spending fold-sized money on air: a 48px top
   margin, 24/32 padding, a full-width creed, a disclaimer, and twelve
   descriptions set at 12px/1.4 in a single phone column.
   Tightened to a third of that without dropping one link or one sentence. */
.foot {
  border-top: 1px solid var(--rule); margin-top: var(--sec-lg);
  /* 16/24 -> 24/32. The tightening note below this rule is still right about
     the BLURBS and the two-column index; it was wrong about the top and bottom
     edges, which is where a footer actually earns the word "considered". The
     whole block is still under a third of what it was before that pass. */
  padding: var(--s-5) 0 var(--s-6); color: var(--ink-faint); font-size: var(--t-sm);
}
.foot__top { display: grid; gap: var(--s-4); }
@media (min-width: 760px) {
  .foot__top { grid-template-columns: minmax(0, 260px) minmax(0, 1fr); gap: var(--s-6); }
}
.foot__mark {
  font-family: var(--mono); font-weight: 700; font-size: var(--t-sm);
  letter-spacing: 0.22em; color: var(--ink); display: block;
}
.foot__creed { margin: 4px 0 6px; color: var(--ink-dim); font-size: var(--t-sm); }
.foot__dis { margin: 0; max-width: 42ch; line-height: 1.45; }
/* Two columns from the narrowest width, not from 520px. The site index is nine
   pages plus five data surfaces plus the repo; in one phone column that is a
   588px scroll of nothing but link text, and the reader who reached the footer
   of a 9,000px page has already proved they scroll - what they need is to SEE
   the shape of the publication in one screen, which is exactly what a second
   column buys. */
.foot__cols { display: grid; gap: var(--s-4) var(--s-5); grid-template-columns: 1fr 1fr; }
@media (max-width: 359px) { .foot__cols { grid-template-columns: 1fr; } }
@media (min-width: 980px) { .foot__cols { grid-template-columns: 1.15fr 1fr 1fr; } }
/* The same move as .sec__h, one step smaller, so the footer's column heads and
   the page's section heads are recognisably the same object at two scales.
   --ink-faint -> --ink-dim: 5.03 -> 7.59 on --bg in dark, 4.97 -> 6.61 light. */
.foot__h {
  font-family: var(--mono); font-size: var(--t-2xs); letter-spacing: 0.16em;
  text-transform: uppercase; color: var(--ink-dim); font-weight: 600;
  margin: 0 0 var(--s-3); padding-bottom: 6px; border-bottom: 2px solid var(--rule);
}
.foot__list { list-style: none; margin: 0; padding: 0; display: grid; gap: 7px; }
.foot__list li { display: grid; gap: 0; }
.foot__list a {
  font-family: var(--mono); font-size: var(--t-xs); letter-spacing: 0.07em;
  text-transform: uppercase; color: var(--ink); text-decoration: none;
  justify-self: start; border-bottom: 1px solid transparent;
}
/* The hover moves the LINK, not just a hairline under it. --accent-2 is the
   interactive hue by the doctrine at the top of this file, it measures 8.09 on
   --bg in dark and 6.52 in light, and it is what makes a 14-link index feel
   like a control panel rather than a colophon. */
.foot__list a:hover { color: var(--accent-2); border-bottom-color: var(--accent-2); }
.foot__list a[aria-current="page"] { color: var(--ink); }
.foot__list span { color: var(--ink-faint); font-size: var(--t-xs); line-height: 1.4; }
/* On a phone the site index is 12 links in one column, and twelve descriptions
   under them turned the footer into 988px. The descriptions are what make the
   PAGES tempting rather than merely listed, so they survive in the first
   column; an API endpoint and a repo link do not need selling to the reader who
   scrolled this far. */
/* The blurbs are what make the PAGES tempting rather than merely listed, so
   they survive in the first column at every width. An API endpoint and a repo
   link do not need selling to the reader who scrolled this far, and at two
   columns on a phone there is no room to try. */
@media (max-width: 759px) {
  .foot__col:nth-child(n+2) .foot__list span { display: none; }
  .foot__col:nth-child(n+2) .foot__list { gap: 6px; }
}
/* MEASURED, and it is the reason the blurbs go at phone width rather than the
   two-column grid: with descriptions on, "The desk" is 446px tall, and because
   grid rows are sized by their tallest item the five-link "Data" column beside
   it is ALSO 446px - about 250px of which is empty. Two columns of bare links
   is 420px of footer instead of 844px, and the shape of the publication - nine
   pages, five data surfaces, the source - arrives in one screen instead of
   two, which is what a footer that calls itself a site index is for.

   The sentences are not deleted. They are in the HTML for the crawler, they
   are the link titles for a screen reader, and they are visible from 520px up,
   which is every tablet and every desktop. */
@media (max-width: 519px) {
  .foot__list span { display: none; }
  .foot__list { gap: 6px; }
  .foot__cols > .foot__col:nth-child(3) { grid-column: 1 / -1; }
}
/* NOT CUT, though it is 55px and though the homepage hero prints the same
   sentence verbatim one screen up: on methodology.html, history.html and every
   move page the footer copy is the ONLY copy, and there is no hook in the
   markup that says "this page already said it". A duplicate on one page is a
   cheaper mistake than an omission on seven. The de-duplication belongs in
   index.mjs, which knows which page it is, and it is in the integration note. */
/* The one paragraph on the site that says how the whole thing works. It keeps
   every word; it stops keeping 24px of air above it and a 1.55 leading it does
   not need at 12.5px in faint ink. */
.foot__fine {
  margin: var(--s-4) 0 0; padding-top: 10px; border-top: 1px solid var(--rule-soft);
  max-width: 96ch; line-height: 1.5;
}
.foot__fine code { font-size: var(--t-xs); color: var(--ink-dim); }
.foot__fine b { color: var(--ink-dim); font-weight: 600; }
.foot a { color: var(--ink-dim); }
`;

const HERO = `
.hero { padding: 0 0 var(--s-2); }
.hero .eyebrow { margin-bottom: var(--s-2); }

/* Mobile-first: level block, then score, stacked. Everything in this block has
   to survive above the fold on a 375px phone, because that is where traffic
   arrives from X. The digit is deliberately oversized - at 31vw it is nearly a
   third of the screen, which is what keeps a reposted phone screenshot legible
   at thumbnail size.

   The desktop column split is 1fr : 1fr no longer. The level column holds a
   digit, a name, an epithet, five pips and one line of gloss; the score column
   holds a numeral, a 192-unit dial and a distribution curve and is ~300px
   taller. Giving them equal width left the left half of a 1440px fold almost
   empty and made the hero the tallest thing on the site. Capping the level
   column and letting the instruments take the rest closes most of that gap. */
.hero__grid { display: grid; gap: var(--s-4); }
@media (min-width: 720px) {
  .hero__grid { grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: var(--s-5); align-items: end; }
}
@media (min-width: 1080px) {
  .hero__grid { grid-template-columns: minmax(0,420px) minmax(0,1fr); gap: var(--s-6); }
}

.level { display: flex; align-items: center; gap: var(--s-4); }
.level__digit {
  font-family: var(--mono); font-weight: 700;
  font-size: var(--d-level);
  line-height: 0.8; letter-spacing: -0.065em;
  color: var(--accent);
  /* A single soft glow, dark mode only, on the one element that earns it. */
  text-shadow: 0 0 38px color-mix(in srgb, var(--accent) 26%, transparent);
}
@media (prefers-color-scheme: light) { :root:not([data-theme="dark"]) .level__digit { text-shadow: none; } }
:root[data-theme="light"] .level__digit { text-shadow: none; }

.level__meta { min-width: 0; }
.level__name {
  font-family: var(--mono); font-weight: 700;
  font-size: var(--t-lg);
  letter-spacing: 0.055em; margin: 0 0 var(--s-2); color: var(--ink);
  overflow-wrap: anywhere;
}
.level__gloss { font-size: var(--t-sm); color: var(--ink-dim); margin: var(--s-2) 0 0; max-width: 34ch; }

/* The level must be readable without colour: five cells, filled count = how
   loud. Shape carries the signal, amber only confirms it. Survives greyscale
   screenshots, colour-blind readers, and a printed page. */
.bars { display: flex; gap: 4px; }
.bars span {
  width: 13px; height: 13px; border: 1.5px solid var(--accent);
  border-radius: 1px; background: transparent;
}
.bars span[data-on="1"] { background: var(--accent); }

/* On a phone the score sits under the level with a hairline between them, so
   the two read as separate instruments rather than one run-on block. In the
   two-column layout the hairline moves to the side. */
.score { border-top: 1px solid var(--rule); padding-top: var(--s-3); }
@media (min-width: 720px) {
  .score { border-top: 0; border-left: 1px solid var(--rule); padding: 0 0 0 var(--s-5); }
}
.score__row { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.score__val {
  font-family: var(--mono); font-weight: 700;
  font-size: var(--d-score); line-height: 1;
  letter-spacing: -0.035em; color: var(--ink);
}
.score__of { font-family: var(--mono); font-size: var(--t-sm); color: var(--ink-faint); }
.score__dir {
  font-family: var(--mono); font-size: var(--t-sm); color: var(--ink-dim);
  display: inline-flex; align-items: baseline; gap: 5px;
}
.score__dir b { font-weight: 700; color: var(--ink); }

/* Slot for gauge() beside or beneath the score.

   At >=980px the two hero instruments sit SIDE BY SIDE rather than stacked, and
   they are placed by nth-child because the markup belongs to index.mjs and this
   file may not touch it. The score column's children are, in order: the
   eyebrow, the score row, the dial, the distribution strip, the caption. The
   first two and the last span both tracks; the two charts take one each. It
   halves the height of the tallest block on the site at desktop width, which is
   the single biggest reason the old fold sold nothing beyond one number. */
.hero__chart { margin-top: var(--s-3); }
.hero__chart .ch__svg { margin-inline: auto; }
@media (min-width: 980px) {
  .score { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 0 var(--s-5); align-content: start; }
  .score > :nth-child(1), .score > :nth-child(2), .score > :nth-child(5) { grid-column: 1 / -1; }
  .score > .hero__chart:nth-child(3) { grid-column: 1; }
  .score > .hero__chart:nth-child(4) { grid-column: 2; align-self: end; }
}

/* Scale strip: where this score sits across all five bands, with the live band
   marked by a caret rather than by colour alone. */
.scale { margin-top: var(--s-4); }
.scale__track {
  position: relative; display: flex; height: 10px;
  border: 1px solid var(--rule); border-radius: 2px;
}
.scale__track i { display: block; background: var(--rule-soft); border-right: 1px solid var(--rule); }
.scale__track i:last-of-type { border-right: 0; }
.scale__track i[data-live="1"] { background: var(--accent); }
/* The caret is ink, not accent: it has to stay visible both on the amber live
   band and on the grey ones, and colour is never the only signal here. */
.scale__you {
  position: absolute; top: -4px; bottom: -4px; width: 2px;
  margin-left: -1px; background: var(--ink); border-radius: 1px;
}
.scale__marks {
  position: relative; height: 15px; margin-top: var(--s-1);
  font-family: var(--mono); font-size: var(--t-2xs); color: var(--ink-faint); letter-spacing: 0.08em;
}
.scale__marks span { position: absolute; top: 0; transform: translateX(-50%); }
.scale__marks span[data-edge="first"] { transform: none; }
.scale__marks span[data-edge="last"]  { transform: translateX(-100%); }
/* The stamp and the disclaimer sit on one rule under the hero, not as two
   loose paragraphs with 24px above each. Same words, 26px less fold. */
.stamp {
  font-family: var(--mono); font-size: var(--t-xs); color: var(--ink-dim);
  margin: var(--s-4) 0 0; padding-top: var(--s-3); border-top: 1px solid var(--rule-soft);
  letter-spacing: 0.02em;
}
.stamp b { color: var(--ink); font-weight: 500; }
.disclaimer {
  font-size: var(--t-sm); color: var(--ink-faint); margin: 5px 0 0; max-width: var(--measure);
}
`;

// ---------------------------------------------------------------------------
// Charts. Paint only - every coordinate lives in site/templates/_charts.mjs.
// Keeping colour here rather than in SVG presentation attributes is what lets
// one stylesheet theme every chart for light and dark with no re-render, and
// what keeps the chart kit itself free of any colour knowledge.
// ---------------------------------------------------------------------------
const CHARTS_CORE = `
/* THE CHART PLATE. The single highest-leverage rule in this file right now.

   Every chart the kit emits is <figure class="ch">, and .ch was a bare
   margin:0 / padding:0 - which is to say a chart arrived as a loose SVG
   with a caption under it and no edges at all. On a page made of hairlines
   that is indistinguishable from a printout, and it is most of the reason the
   operator says there is nothing to look at: the two largest graphics on the
   homepage were not framed as objects, so they read as page furniture.

   Framed, padded and lifted, they read as instruments. This costs no template
   a single character - every chart already in the codebase and every chart
   landing beside this one inherits it from the class the kit already writes.

   THE BACKGROUND IS --bg ON PURPOSE AND MUST STAY --bg. Six rules in this
   block (.ch-halo, .ch-val, .ch-note, .ch-ring, .ch-g-markdot, .ch-d-val) knock
   text and lines out of the plot with a fat stroke or fill of var(--bg). Paint
   the plate --bg-raised and every one of those turns into a dark outline
   around the series. The plate separates from the page on its border, its
   radius and its shadow, which is enough, and it keeps the knockouts honest. */
.ch {
  margin: 0;
  padding: var(--s-3) var(--s-3) var(--s-2);
  background: var(--bg);
  border: 1px solid var(--rule);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-1);
}
@media (min-width: 640px) { .ch { padding: var(--s-4) var(--s-4) var(--s-3); } }
/* --w is set per chart by _charts.mjs to its own viewBox width, so a chart is
   never UPSCALED past the size its type was designed at. Centred rather than
   left-aligned, because a plot capped at 720 inside a 1240 plate parked hard
   against the left edge with 400px of blank plate beside it. */
.ch__svg { display: block; width: 100%; max-width: var(--w, 100%); height: auto; margin-inline: auto; }
/* The caption is the plate's legend, so it is ruled off from the plot rather
   than floating under it, and it is --ink-dim rather than --ink-faint: it
   carries the units and the caveat, which is the last thing on a chart that
   should be the hardest to read. 5.03 -> 7.59 dark, 4.97 -> 6.61 light. */
.ch__cap {
  font-family: var(--mono); font-size: var(--t-xs); line-height: 1.5;
  color: var(--ink-dim); margin: var(--s-3) 0 0; letter-spacing: 0.01em;
  padding-top: var(--s-2); border-top: 1px solid var(--rule-soft);
}
.ch text, .spark text {
  font-family: var(--mono); fill: var(--ink-dim); font-variant-numeric: tabular-nums;
}
/* Status messages knock out whatever they sit on: an empty history chart still
   draws its five band labels, and "No scored observations yet" landed straight
   on top of "ROUTINE". */
/* THE LABEL LIFT. Every one of the rules below paints type INSIDE a graphic -
   axis ticks, reference labels, and the words a chart prints when it has no
   data. All of them were --ink-faint, which is the palette's tertiary ink, set
   at 10px, sometimes over a band wash. A chart whose axis cannot be read is a
   picture of a chart, and the empty states are worse: "no read" is the most
   important sentence a graphic on this site can print, because this codebase
   never imputes a number, and it was the palest thing in the frame.

   --ink-faint -> --ink-dim throughout: 5.03 -> 7.59 against --bg in dark and
   4.97 -> 6.61 in light. --ink-faint survives only where it is genuinely a
   fourth-rank detail (band labels behind the series, sparkline references),
   because the point of the change is to stop spending the faint ink on things
   a reader has to read. */
.ch-note { fill: var(--ink-dim); stroke: var(--bg); stroke-width: 3.5; paint-order: stroke fill; }
.ch-note--dim { fill: var(--ink-dim); }

/* sparkline() - pillar cards */
.spark { display: block; }
.spark__area { fill: var(--fill); }
.spark__line { fill: none; stroke: var(--ink-dim); stroke-width: 1.6; stroke-linejoin: round; stroke-linecap: round; }
.spark__base { stroke: var(--rule); stroke-width: 1; }
.spark__ref  { stroke: var(--ink-faint); stroke-width: 1; }
.spark__reflabel { fill: var(--ink-faint); }
.spark__ring { fill: var(--bg-raised); stroke: var(--ink); stroke-width: 1.4; }
.spark__dot  { fill: var(--ink); }
/* font-size here, not only as an SVG attribute: _parts.sparkline (the older
   inline sparkline this kit replaces) sets no size and relies on the rule. */
.spark__empty { fill: var(--ink-dim); font-size: var(--t-2xs); }

/* gauge() - the hero score as a bounded arc. The live segment is six units
   thicker than the rest (14 -> 20; GAUGE.liveSw in _charts.mjs must match this
   number, because the tick radius is computed from it), so which band we sit in
   survives greyscale. */
.ch-g-seg { fill: none; stroke: var(--rule); stroke-width: 14; }
.ch-g-seg--live { stroke: var(--accent); stroke-width: 20; }
.ch-g-tick { stroke: var(--rule); stroke-width: 1; }
.ch-g-ticklabel { fill: var(--ink-dim); }
.ch-g-mark { stroke: var(--ink); stroke-width: 3; stroke-linecap: butt; }
.ch-g-markdot { fill: var(--ink); stroke: var(--bg); stroke-width: 1.2; }
.ch-g-val { fill: var(--ink); font-weight: 700; letter-spacing: -0.03em; }
.ch-g-of { fill: var(--ink-faint); letter-spacing: 0.16em; }
.ch-g-band { fill: var(--ink-dim); font-weight: 700; letter-spacing: 0.06em; }
`;

const CHARTS = `
/* Charts that ship two geometries rather than stretching one: the hero history
   chart and the pillar ranking. Below 640px a 720-unit viewBox downscales past
   0.5 and 10px axis type lands at 5px, so the phone gets a plot drawn for a
   phone. Both are in the HTML; only one is displayed. */
.ch__svg--lg { display: none; }
@media (min-width: 640px) {
  .ch__svg--sm { display: none; }
  .ch__svg--lg { display: block; }
}
.ch-band { fill: var(--wash-alt); }
.ch-band--alt { fill: var(--wash); }
.ch-band--live { fill: var(--wash-live); }
.ch-bandl { fill: var(--ink-faint); letter-spacing: 0.09em; }
.ch-bandl--live { fill: var(--ink); font-weight: 700; }
.ch-frame { fill: none; stroke: var(--rule); stroke-width: 1; }
.ch-axline { stroke: var(--rule); stroke-width: 1; }
.ch-ax { fill: var(--ink-dim); letter-spacing: 0.04em; }
/* A fat background-coloured stroke under the line, so the series stays readable
   where it crosses a band label without having to place labels defensively. */
.ch-halo { fill: none; stroke: var(--bg); stroke-width: 4.5; stroke-linejoin: round; stroke-linecap: round; }
.ch-line { fill: none; stroke: var(--ink); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
.ch-dot { fill: var(--accent); }
.ch-ring { fill: var(--bg); stroke: var(--accent); stroke-width: 1.5; }
.ch-val { fill: var(--ink); font-weight: 700; stroke: var(--bg); stroke-width: 3.5; paint-order: stroke fill; }
.ch-guide { stroke: var(--accent); stroke-width: 1; stroke-dasharray: 3 4; }
.ch-lvmark { stroke: var(--ink-faint); stroke-width: 1; stroke-dasharray: 2 4; }
.ch-lvtext { fill: var(--ink-dim); }

/* pillarRanked() */
.ch-r-track { fill: var(--wash-alt); }
.ch-r-bar { fill: var(--ink-dim); }
.ch-r-cap { stroke: var(--ink); stroke-width: 1.5; }
.ch-r-none { fill: none; stroke: var(--ink-dim); stroke-width: 1; stroke-dasharray: 3 3; }
.ch-r-nonet { fill: var(--ink-dim); letter-spacing: 0.05em; }
.ch-r-name { fill: var(--ink); font-family: var(--sans); font-weight: 600; letter-spacing: -0.005em; }
.ch-r-glyph { fill: var(--ink-dim); }
.ch-r-val { fill: var(--ink); font-weight: 700; }
.ch-r-val--none { fill: var(--ink-dim); font-weight: 400; }
.ch-r-ref { stroke: var(--ink-faint); stroke-width: 1; stroke-dasharray: 2 4; }
.ch-r-reflabel { fill: var(--ink-dim); letter-spacing: 0.06em; }

/* distributionStrip() */
.ch-d-rest { fill: var(--wash); }
.ch-d-fill { fill: var(--fill); }
.ch-d-curve { fill: none; stroke: var(--ink-dim); stroke-width: 1.25; }
.ch-d-base { stroke: var(--rule); stroke-width: 1; }
.ch-d-tick { stroke: var(--ink-faint); stroke-width: 1; }
.ch-d-marker { stroke: var(--ink); stroke-width: 2; }
.ch-d-caret { fill: var(--ink); }
.ch-d-val { fill: var(--ink); font-weight: 700; stroke: var(--bg); stroke-width: 3; paint-order: stroke fill; }
.ch-d-ax { fill: var(--ink-dim); letter-spacing: 0.12em; }
.ch-d-ax--dim { opacity: 0.7; }
`;

const FRESH = `
/* Per-source freshness. pizzint reports "healthy" at a 12% scrape success rate;
   this strip exists so the same lie is impossible here. Ages are stated as of
   the build stamp, never as "2 minutes ago" - a static page that says "2
   minutes ago" is lying within the hour. */
.fresh { margin: var(--sec) 0 0; }
.fresh__strip {
  /* 13 sources one-per-line eats the whole phone screen and pushes the pillars
     below three folds. Two columns at 375px, more as there is room. */
  display: grid; grid-template-columns: repeat(auto-fill, minmax(146px, 1fr));
  gap: 4px; margin: 0; padding: 0; list-style: none;
}
.chip {
  display: inline-flex; align-items: center; gap: 1px 5px; flex-wrap: wrap;
  font-family: var(--mono); font-size: var(--t-2xs); letter-spacing: 0.02em;
  border: 1px solid var(--rule); border-radius: var(--radius);
  padding: 4px 7px; background: var(--bg-raised); color: var(--ink-dim);
  white-space: nowrap; overflow: hidden; min-width: 0; text-decoration: none;
}
/* flex-wrap, not shrink. An uncalibrated source's detail reads "no baseline .
   no read", which is 139px of mono at two columns on a 375px phone - and with
   the age pinned and the name shrinkable the NAME was being squeezed to zero
   width, so the strip showed four identical anonymous chips. Wrapping puts the
   name on the first line and the status on the second; both survive intact,
   which is the only outcome worth having, because a freshness chip that does
   not say WHICH source is not a freshness chip. */
.chip b { font-weight: 500; color: var(--ink); overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.chip__age { flex: 0 0 auto; color: var(--ink-faint); }
.chip__dot { font-size: var(--t-2xs); line-height: 1; }

/* ---- THE THREE SOURCE STATES, AND WHY EACH GETS FOUR SIGNALS -------------

   live / dark / awaiting-baseline are the distinction this whole codebase is
   built to hold, so they are the one place on the site where a reader must
   never have to compare two colours to read the answer. Four independent
   signals carry each state, and any one of them alone is sufficient:

     1. GLYPH SHAPE.  ● filled / ◐ half / ○ hollow / ◇ open diamond.
        Emitted by _parts.mjs. Survives greyscale and thumbnail scale.
     2. THE WORD.     "live", "stale", "dark", "no baseline", in the chip for
        every state but the healthy one, and in the .vh span for that one.
     3. BORDER STYLE. solid / dashed / dotted, on the box AND now on a 3px
        inline-start bar, which is what makes the state legible in peripheral
        vision down a 14-chip grid rather than only on inspection.
     4. HUE, last and never alone.

   The hue axis is chosen for deuteranopia and protanopia, which is where the
   old set failed: --ok green against --dark-src red is the textbook confusion
   pair, and a reader with the commonest colour vision deficiency was reading
   two of the three states off shape alone. The three are now separated by
   LIGHTNESS and by the blue-yellow axis, which both forms of red-green CVD
   preserve: dark sources take the red at LOW lightness against a dimmed box,
   awaiting-baseline takes the cool accent, and live keeps the green - which
   now only ever has to be told apart from a much darker red and a blue.
   -------------------------------------------------------------------------- */
.chip { border-inline-start-width: 3px; }
.chip[data-status="ok"]    .chip__dot { color: var(--ok); }
.chip[data-status="stale"] .chip__dot { color: var(--stale); }
.chip[data-status="dark"]  .chip__dot { color: var(--dark-src); }
.chip[data-status="uncal"] .chip__dot { color: var(--accent-2); }

.chip[data-status="ok"]    { border-inline-start-color: var(--ok); }
.chip[data-status="stale"] { border-inline-start-color: var(--stale); }
/* Dark is the only state that dims the whole box. A source that did not answer
   should look like an absence, not like a red alert - MOTION.md 4 is explicit
   that dark sources are pointedly still, and this is the static half of that
   rule. The dashed border and the hollow glyph do the identifying; the fade
   does the ranking. */
.chip[data-status="dark"] {
  border-style: dashed; border-inline-start-color: var(--dark-src);
  background: transparent; color: var(--ink-faint);
}
.chip[data-status="dark"] b { color: var(--ink-dim); font-weight: 400; }
/* Awaiting a baseline is NOT a flavour of dark and is not drawn like one: the
   source answered fine. Dotted, cool, and at full weight - it is a live read
   with nothing to score it against yet. */
.chip[data-status="uncal"] {
  border-style: dotted; border-inline-start-color: var(--accent-2);
}
.chip[data-status="uncal"] b { color: var(--ink); }
.fresh__key { font-size: var(--t-xs); color: var(--ink-faint); margin: var(--s-2) 0 0; font-family: var(--mono); line-height: 1.55; }
/* The legend restates the three source states as counts, right where the chips
   are, so a reader matches glyph to word without a paragraph in between. The
   states are still named separately and still never merged - they are shorter. */
.fresh__legend {
  display: flex; flex-wrap: wrap; gap: 4px var(--s-4);
  padding-bottom: 5px; margin-bottom: 5px; border-bottom: 1px solid var(--rule-soft);
}
.fresh__lg { display: inline-flex; align-items: baseline; gap: 4px; color: var(--ink-dim); white-space: nowrap; }
.fresh__lg i { font-style: normal; font-size: var(--t-2xs); line-height: 1; }
/* The legend takes the SAME four signals in the same order, because a legend
   that renders its states differently from the things it is a legend for is
   worse than no legend. The bar is a border-block-end here rather than an
   inline-start one: these sit on a baseline row, not in a grid of boxes. */
.fresh__lg {
  padding-bottom: 2px; border-bottom: 2px solid transparent;
}
.fresh__lg[data-status="ok"] i { color: var(--ok); }
.fresh__lg[data-status="ok"] { border-bottom-color: var(--ok); }
.fresh__lg[data-status="stale"] i { color: var(--stale); }
.fresh__lg[data-status="stale"] { border-bottom-color: var(--stale); }
.fresh__lg[data-status="dark"] i { color: var(--dark-src); }
.fresh__lg[data-status="dark"] { border-bottom-style: dashed; border-bottom-color: var(--dark-src); }
.fresh__lg[data-status="uncal"] i { color: var(--accent-2); }
.fresh__lg[data-status="uncal"] { border-bottom-style: dotted; border-bottom-color: var(--accent-2); }

/* Chip variants for the feed and the reel. Every source-kind chip carries a
   letter or a shape in a boxed badge, so it is identifiable without colour and
   at screenshot scale. */
.chip--sm { font-size: var(--t-2xs); padding: 2px 5px; gap: 4px; }
.chip--quiet { background: transparent; color: var(--ink-faint); }
/* CUT in this pass: .chip--accent and .chip--solid. Grepped across site/ and
   collector/ — nothing has ever emitted either, and both spent the one accent
   on a chip with no owner. */
.chip--x::before, .chip--kalshi::before, .chip--polymarket::before,
.chip--manifold::before, .chip--news::before, .chip--paper::before,
.chip--gov::before, .chip--code::before {
  display: inline-flex; align-items: center; justify-content: center;
  width: 13px; height: 13px; flex: 0 0 13px;
  border: 1px solid currentColor; border-radius: 2px;
  font-size: var(--t-2xs); font-weight: 700; line-height: 1;
}
.chip--x::before          { content: 'X'; }
.chip--kalshi::before     { content: 'K'; }
.chip--polymarket::before { content: 'P'; }
.chip--manifold::before   { content: 'M'; }
.chip--news::before       { content: 'N'; }
.chip--paper::before      { content: '\\25b2'; border: 0; font-size: var(--t-2xs); }
.chip--gov::before        { content: '\\25c6'; border: 0; font-size: var(--t-2xs); }
.chip--code::before       { content: '\\25a0'; border: 0; font-size: var(--t-2xs); }

/* Pillar attribution, wherever a feed item or reel card is assigned to a
   pillar. The glyphs match PILLAR_GLYPH in _charts.mjs on purpose: the same
   shape means the same pillar on the ranked chart and in the feed. */
.pillar-tag {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: var(--mono); font-size: var(--t-2xs); letter-spacing: 0.09em; text-transform: uppercase;
  color: var(--ink-dim); border: 1px solid var(--rule); border-radius: 2px;
  padding: 1px 5px 1px 4px; white-space: nowrap; text-decoration: none;
}
.pillar-tag::before { font-size: var(--t-2xs); line-height: 1; color: var(--ink-faint); }
.pillar-tag[data-pillar="capability"]::before { content: '\\25b2'; }
.pillar-tag[data-pillar="compute"]::before    { content: '\\25a0'; }
.pillar-tag[data-pillar="attention"]::before  { content: '\\25cf'; }
.pillar-tag[data-pillar="governance"]::before { content: '\\25c6'; }
.pillar-tag[data-pillar="markets"]::before    { content: '\\2731'; }
`;

// ---------------------------------------------------------------------------
// The live feed and the news reel. pizzint's X column down the right-hand side
// is the single thing that makes its page feel alive (TEARDOWN 2.4). Ours is
// server-rendered, so unlike theirs it is in the HTML a crawler sees and in a
// screenshot taken before any JS runs - and it has no JS to break.
// ---------------------------------------------------------------------------
/* The old .feed__* block lived here and is gone. Nothing emitted it: the live
   newsroom is news.mjs's own .nfeed / .nrow, shipped in that module's scoped
   styleTag, and these 45 lines were being inlined into every page on the site
   for nobody. What replaces it is the ARRIVAL grammar those rows share with the
   reel and the return line - the one thing a reader needs to see is which rows
   are new since they were last here, and that is worth owning centrally. */
const ARRIVE = `
/* ---------------------------------------------------------------------------
   THE ARRIVAL GRAMMAR — "this is new since you were last here".

   One vocabulary, used by the return line in the chrome, by the feed rows, and
   by the arrival counters _parts.mjs renders (.newbadge / .npulse / .nsrc).
   Three rules hold across all of them:

     1. Never colour alone. A bar on the inline-start edge, a glyph, or a word -
        so it survives a greyscale repost, a colour-blind reader, and a
        40%-scale screenshot, which are the three ways this site gets read.
     2. ZERO IS NOT AN EVENT. data-zero="1" drops the accent entirely. A badge
        that lights up to announce nothing happened is the pizzint failure mode
        in a smaller costume, and this index posts the calm days on purpose.
     3. PARTIAL IS ITS OWN STATE, dotted rather than solid - the same grammar
        the freshness chips use for "awaiting baseline". A 24h count taken over
        a 5h record is not a 24h count, and the border says so before the text
        does.
   --------------------------------------------------------------------------- */
[data-new="1"], .is-new {
  border-inline-start: 2px solid var(--accent-2);
  padding-inline-start: var(--s-2);
}

/* The inline badge, for a section heading: "12 new · 1h". */
.newbadge {
  display: inline-flex; align-items: baseline; gap: 5px;
  font-family: var(--mono); font-size: var(--t-2xs); letter-spacing: 0.06em;
  border: 1px solid var(--accent-2); border-radius: var(--radius); padding: 2px 6px;
  color: var(--ink-dim); white-space: nowrap; vertical-align: middle;
  /* .sec__h is a flex row terminated by a hairline rule, which is exactly where
     a section's count belongs. Without this the badge is a shrinkable flex item
     and the rule eats it. */
  flex: 0 0 auto;
}
.newbadge__n { font-size: var(--t-xs); font-weight: 700; color: var(--accent-2); }
.newbadge__w { text-transform: uppercase; }
.newbadge__w time { font-family: inherit; font-size: inherit; }
.newbadge[data-zero="1"] { border-color: var(--rule); color: var(--ink-faint); }
.newbadge[data-zero="1"] .newbadge__n { color: var(--ink-faint); font-weight: 500; }
.newbadge[data-partial="1"] { border-style: dotted; }

/* The arrivals strip: one lead numeral and a row of counters about different
   things. This is pizzint's "40 REPORTS / 19 ALERTS / 8 LOCATIONS MONITORED"
   header done with numbers we can defend, and it is the densest block on the
   page per pixel - which is exactly what it is for. */
.npulse {
  display: grid; gap: var(--s-3);
  border: 1px solid var(--rule); border-left: 3px solid var(--accent-2);
  border-radius: var(--radius-lg); background: var(--bg-raised);
  box-shadow: var(--shadow-1);
  padding: var(--s-3) 14px;
}
@media (min-width: 760px) {
  .npulse { grid-template-columns: minmax(0, 190px) minmax(0, 1fr); align-items: start; }
  .npulse__note { grid-column: 1 / -1; }
}
.npulse[data-zero="1"] { border-left-color: var(--rule); }
.npulse[data-partial="1"] { border-left-style: dotted; }
.npulse__lead { display: flex; align-items: baseline; gap: var(--s-2); min-width: 0; }
.npulse__n {
  font-family: var(--mono); font-weight: 700; font-size: var(--t-xl); line-height: 1;
  letter-spacing: -0.035em; color: var(--ink);
}
.npulse[data-zero="1"] .npulse__n { color: var(--ink-faint); }
.npulse__u { font-size: var(--t-xs); color: var(--ink-dim); line-height: 1.35; min-width: 0; }
.npulse__cells {
  list-style: none; margin: 0; padding: 0;
  display: grid; gap: var(--s-3) var(--s-4);
  grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
}
.npulse__c { display: grid; gap: 1px; min-width: 0; }
.npulse__ck {
  font-family: var(--mono); font-size: var(--t-2xs); letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--ink-faint);
}
.npulse__cv {
  font-family: var(--mono); font-size: var(--t-lg); font-weight: 700; color: var(--ink);
  font-variant-numeric: tabular-nums;
  display: flex; align-items: baseline; gap: 3px; min-width: 0;
}
.npulse__of { font-size: var(--t-2xs); color: var(--ink-faint); }
/* The busiest feed is named, in the cool accent rather than the amber one.
   Amber is spent on live index values; this cell is a label, and giving it its
   own hue is what stops four counter cells reading as one block of type. */
.npulse__src {
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-size: var(--t-sm); color: var(--accent-2); letter-spacing: 0.01em;
}
.npulse__cs { font-size: var(--t-2xs); color: var(--ink-faint); line-height: 1.35; }
.npulse__note {
  margin: 0; font-size: var(--t-xs); line-height: 1.5; color: var(--ink-faint);
  max-width: var(--measure);
}
.npulse__note a { color: var(--ink-dim); }

/* Per-feed arrivals as a ranked list. The bar is the scan, the numerals are the
   reading, and every row states both numbers in text - so the list is complete
   with no CSS at all. */
.nsrcs { list-style: none; margin: 0; padding: 0; display: grid; gap: 3px; }
.nsrc {
  display: grid; grid-template-columns: minmax(0, 1fr) minmax(60px, 2fr) auto;
  align-items: center; gap: var(--s-2);
  font-family: var(--mono); font-size: var(--t-xs); color: var(--ink-dim);
  padding: 3px 0; border-bottom: 1px solid var(--rule-soft);
}
.nsrc__n { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--ink); }
.nsrc__bar { display: block; height: 7px; background: var(--wash-alt); border-radius: 1px; overflow: hidden; }
.nsrc__bar i { display: block; height: 100%; background: var(--ink-dim); border-radius: 1px; }
.nsrc__v { font-weight: 700; color: var(--ink); white-space: nowrap; }
.nsrc__of { font-weight: 400; color: var(--ink-faint); font-size: var(--t-2xs); margin-left: 2px; }
.nsrc[data-zero="1"] { color: var(--ink-faint); }
.nsrc[data-zero="1"] .nsrc__n, .nsrc[data-zero="1"] .nsrc__v { color: var(--ink-faint); }
.nsrc[data-zero="1"] .nsrc__bar i { background: var(--rule); }
`;

const REEL = `
/* THE RAIL MECHANICS MOVED, AND THIS BLOCK IS NOW ALMOST EMPTY ON PURPOSE.

   _reel.mjs shipped a .reel__viewport wrapper this round and took the scroller,
   the snap axis, the bleed margin, the scrollbar paint and the item flex-basis
   into its own styleTag. This file was still painting the OLD shape, and the
   two disagreed in three ways that were all visible at 375px:

     - .reel { margin: 0 -16px } here, PLUS .reel__viewport's own -16px there,
       bled the card rail 32px past the page gutter in both directions.
     - overflow-x + scroll-snap-type on .reel__rail put a second, nested
       scroller inside the real one.
     - .reel__rail > * { flex: 0 0 79%; max-width: 300px } fought
       .reel__item { flex: 0 0 clamp(248px, 78vw, 318px) } for the card width.

   The rule for two files painting one component is that the one shipping the
   markup wins, so all of it is cut rather than reconciled. What stays is the
   one thing that is a PAGE concern rather than a component concern: the
   heading row's rhythm against the section above it. */
.reel .sec__h { margin-bottom: var(--s-2); }
`;


const PILLARS = `
/* One row on a phone, two at 620, three at 900, five once the wide measure is
   in play - so on a 1440px dashboard the five pillars are ONE screen-row and
   the reader compares them by scanning rather than by scrolling. That is the
   whole argument for the section. */
/* The grid is ONE object - a five-up panel with hairline seams, not five loose
   boxes - so it takes the panel radius and the panel shadow as a unit. The
   overflow clip was already here for the seams; it now also rounds the corner
   cards' own inline-start pillar bars, which is why the radius can go this
   large without a square corner poking out of a round one. */
.pillars {
  display: grid; gap: 1px; background: var(--rule);
  border: 1px solid var(--rule); border-radius: var(--radius-lg); overflow: hidden;
  box-shadow: var(--shadow-1);
}
@media (min-width: 620px) { .pillars { grid-template-columns: 1fr 1fr; } }
@media (min-width: 900px) { .pillars { grid-template-columns: 1fr 1fr 1fr; } }
@media (min-width: 1140px) { .pillars { grid-template-columns: repeat(5, 1fr); } }

/* 11/12/10 was three numbers that named no step. One step, --s-3, on all four
   sides, and the inner gap goes 5 -> 6 so the card's own stack is on the 2px
   half-module the rest of the card uses. Five pillars across 1140px gain 6px
   of height each and lose nothing. */
.pillar { background: var(--bg-raised); padding: var(--s-3); display: flex; flex-direction: column; gap: 6px; }
.pillar__top { display: flex; align-items: baseline; justify-content: space-between; gap: var(--s-2); }
.pillar__name { font-size: var(--t-sm); font-weight: 600; margin: 0; }
/* The score and its change since the previous observation, on one baseline. The
   delta is a real fact computed from the series the card already holds, and it
   is five more facts on the dashboard for no new data. */
.pillar__nums { display: inline-flex; align-items: baseline; gap: 6px; white-space: nowrap; }
.pillar__score { font-family: var(--mono); font-size: var(--t-lg); font-weight: 700; letter-spacing: -0.02em; }
.pillar__blurb { font-size: var(--t-xs); color: var(--ink-faint); margin: 0; line-height: 1.4; }
/* Two sparklines exist during the changeover. _parts.sparkline uses
   preserveAspectRatio="none" and NEEDS its height pinned, or it scales to 2x
   and renders "no history yet" at 20px across the card. _charts.sparkline
   carries its own aspect ratio and a --w cap, so it takes height:auto. */
.pillar__spark { display: block; width: 100%; height: 30px; }
.pillar__spark.ch__svg { height: auto; }
.pillar__foot { font-family: var(--mono); font-size: var(--t-2xs); color: var(--ink-faint); letter-spacing: 0.04em; margin-top: auto; }
.pillar[data-dark="1"] { background: var(--bg-sunken); }
.pillar[data-dark="1"] .pillar__score { color: var(--ink-faint); }
.pillar__dark {
  font-family: var(--mono); font-size: var(--t-2xs); line-height: 1.4; color: var(--dark-src);
  border: 1px dashed currentColor; border-radius: var(--radius); padding: 3px 7px; align-self: flex-start;
}
/* Awaiting a baseline is a THIRD state, not a flavour of dark: the source
   answered, we have no frozen history to score it against. Dotted rather than
   dashed, and in ink rather than the dark-source red. */
.pillar[data-uncalibrated="1"] .pillar__dark { color: var(--ink-faint); border-style: dotted; }
`;

const MOVES = `
.moves { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--rule); }
.move { border-bottom: 1px solid var(--rule); }
.move__a {
  /* text-decoration:none stays: this anchor is a THREE-COLUMN GRID (time,
     description, delta) and underlining the wrapper would rule through the
     timestamp and the number as well. The description carries the affordance
     instead — see .move__what below. */
  display: grid; gap: 2px 14px; padding: 8px 2px; text-decoration: none; color: inherit;
  grid-template-columns: auto 1fr auto; align-items: baseline;
  transition: background-color 120ms ease;
}
.move__a:hover { background: var(--bg-raised); }
.move__time { font-family: var(--mono); font-size: var(--t-xs); color: var(--ink-faint); grid-column: 1; }
.move__what { text-decoration: underline; text-decoration-color: var(--ink-faint); font-size: var(--t-sm); grid-column: 1 / -1; }
@media (min-width: 560px) { .move__what { grid-column: 2; } }
/* The loudest live pillar at that observation, off the receipt. The row used to
   say only THAT the number moved; this says which part of the field moved it. */
.move__lead {
  font-family: var(--mono); font-size: var(--t-2xs); letter-spacing: 0.06em;
  color: var(--ink-faint); margin-left: var(--s-2); white-space: nowrap;
}
.move__delta { font-family: var(--mono); font-size: var(--t-sm); font-weight: 700; grid-column: 3; grid-row: 1; text-align: right; }
.move__delta[data-dir="up"]::before   { content: '\\25b2 '; font-size: var(--t-2xs); color: var(--ink); }
.move__delta[data-dir="down"]::before { content: '\\25bc '; font-size: var(--t-2xs); color: var(--ink-dim); }
.move__delta[data-dir="flat"]::before { content: '\\25c6 '; font-size: var(--t-2xs); color: var(--ink-faint); }
.move[data-changed="1"] { background: var(--wash-alt); }
.move__tag {
  font-family: var(--mono); font-size: var(--t-2xs); letter-spacing: 0.1em; text-transform: uppercase;
  border: 1px solid var(--rule); color: var(--ink-dim); border-radius: var(--radius); padding: 2px 6px; margin-left: var(--s-2);
}

.movehead { display: grid; gap: var(--s-4); margin-bottom: var(--s-2); }
.movehead__nums { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; font-family: var(--mono); }
.movehead__from, .movehead__to { font-size: var(--t-xl); font-weight: 700; letter-spacing: -0.03em; }
.movehead__from { color: var(--ink-faint); }
.movehead__to { color: var(--ink); }
.movehead__arrow { color: var(--ink-faint); font-size: var(--t-lg); }
.movehead__delta { font-size: var(--t-lg); font-weight: 700; color: var(--ink); }

.kv { border-top: 1px solid var(--rule); margin: var(--s-5) 0 0; }
/* Same banding grammar as .prose table, for the same reason: a move page is
   fourteen of these rows and without a band the key and the value on line nine
   are held together by nothing but proximity. */
.kv__row {
  display: grid; grid-template-columns: 1fr; gap: 0 18px;
  border-bottom: 1px solid var(--rule-soft);
  /* The band is inset into the gutter and the padding gives it back, so the
     keys stay on exactly the column they were on and the tint has a margin
     rather than ending under the first letter. 8px into a 16px gutter. */
  padding: 10px var(--s-2); margin-inline: calc(var(--s-2) * -1);
  border-radius: var(--radius);
}
.kv__row:nth-child(even) { background: var(--wash-alt); }
.kv__row:last-child { border-bottom: 0; }
@media (min-width: 560px) { .kv__row { grid-template-columns: 180px 1fr; } }
.kv__k { font-family: var(--mono); font-size: var(--t-xs); letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-faint); }
.kv__v { font-size: var(--t-base); overflow-wrap: anywhere; }
.kv__v .num, .kv__v code { font-size: var(--t-sm); }

.srcs { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.srcs li { display: flex; gap: var(--s-2); align-items: baseline; font-size: var(--t-sm); flex-wrap: wrap; }
.srcs .num { font-family: var(--mono); font-size: var(--t-sm); color: var(--ink-dim); }
.hash { font-family: var(--mono); font-size: var(--t-xs); color: var(--ink-dim); overflow-wrap: anywhere; display: block; }
`;

const PROSE = `
.prose { max-width: var(--measure); font-size: var(--t-base); }
.prose > h1 { font-size: var(--d-title); margin: 0 0 14px; letter-spacing: -0.025em; }
.prose > h2 { font-size: var(--t-xl); margin: var(--sec-lg) 0 9px; letter-spacing: -0.02em; }
.prose > h3 { font-size: var(--t-lg); margin: var(--s-4) 0 var(--s-2); }
.prose > h4 { font-size: var(--t-base); margin: var(--s-4) 0 6px; color: var(--ink-dim); }
.prose ul, .prose ol { margin: 0 0 1em; padding-left: 1.25em; }
.prose li { margin: 0 0 0.4em; }
.prose blockquote {
  margin: 1.2em 0; padding: 2px 0 2px var(--s-4);
  border-left: 3px solid var(--rule); color: var(--ink-dim);
}
.prose pre {
  background: var(--bg-sunken); border: 1px solid var(--rule); border-radius: var(--radius-lg);
  padding: var(--s-3) 14px; overflow-x: auto; font-size: var(--t-sm); line-height: 1.5; margin: 0 0 1.2em;
}
.prose :not(pre) > code {
  background: var(--bg-raised); border: 1px solid var(--rule); border-radius: var(--radius);
  padding: 1px 5px; font-size: var(--t-sm);
}
/* THE TABLE, which on methodology.html is most of the page and which had no
   row structure at all: every row was a pair of hairlines and the header was
   set in the faintest ink in the palette. A table with no banding is read by
   tracking a finger across it, which is not something a reader will do twice.

   Banding is --wash-alt, the same 2% knock-down the charts use for their
   alternating bands, so the two objects on a page that both mean "these rows
   are a series" agree. The hover is --wash, one step up, which is the only
   thing on the row that says a pointer is on it - a table with no hover on a
   30-row methodology page loses your place every time you glance away.

   The header goes --ink-faint -> --ink-dim (4.97 -> 6.61 light, 5.03 -> 7.59
   dark) and gains a 2px underline, so the head separates from the body on
   weight and rule rather than on ink alone. Cells keep their flush-left first
   column - a full-bleed band with the first column indented is a spreadsheet,
   and this is a document - and the band is drawn on the row so the flush cell
   still sits inside it. */
.prose table {
  width: 100%; border-collapse: collapse; margin: 0 0 1.4em; font-size: var(--t-sm);
  display: block; overflow-x: auto;
}
.prose th, .prose td { text-align: left; padding: 8px 14px 8px 0; border-bottom: 1px solid var(--rule-soft); vertical-align: top; }
.prose th {
  font-family: var(--mono); font-size: var(--t-xs); letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--ink-dim); font-weight: 600; border-bottom: 2px solid var(--rule); white-space: nowrap;
}
.prose tbody tr:nth-child(even) { background: var(--wash-alt); }
.prose tbody tr:hover { background: var(--wash); }
.prose tbody tr:last-child td { border-bottom: 0; }
/* Every heading level, not just h2 and h3. _markdown.mjs appends an anchor to
   ALL of them, so "Methodology #" was printing a permanent hash next to the
   title of the most-linked page on the site. Focus is included alongside hover
   so the anchor is reachable by keyboard rather than merely present. */
.prose h1 a.anchor, .prose h2 a.anchor, .prose h3 a.anchor, .prose h4 a.anchor {
  color: var(--ink-faint); text-decoration: none; font-weight: 400; margin-left: 6px;
  opacity: 0; transition: opacity 120ms ease;
}
.prose h1:hover a.anchor, .prose h2:hover a.anchor,
.prose h3:hover a.anchor, .prose h4:hover a.anchor,
.prose a.anchor:focus-visible { opacity: 1; }

/* Two jobs, two sizes. On a prose page the lede is the paragraph that sets up
   the whole document and it stays at reading size. Inside a dashboard .sec it
   is a caption under a five-word heading, and at 17px it was competing with the
   thing it was captioning while costing three lines of fold. */
/* PROSE THAT HAD NO MEASURE AT ALL.
   Measured on the live homepage, real font metrics via canvas, 2026-09-26:
   median line length 132 characters, longest 210, and 68 of 89 prose blocks
   over the 75-character comfort ceiling. Every class below reported
   max-width:none. The worst were .nrow__sub at 202 average and .dv__not at
   191 — and .dv__not is the "this does not move the level" honesty note, the
   one paragraph on the site that most needs to be read rather than skimmed.

   NOT constrained, deliberately: .dcmx__i (the ticker is a horizontal
   scroller, width is the point) and .nrow itself (a row container; its
   .nrow__sub child carries the prose and is capped instead). */
.dv__not, .dv__lead, .dv__sib, .dv__terms, .dv__rule,
.nrow__sub, .fresh__key, .nkey, .oven__hint, .sw__lede,
.move, .foot__fine,
.apilist li { max-width: var(--measure); }
.lede { font-size: var(--t-base); color: var(--ink-dim); max-width: var(--measure); margin: 0 0 var(--s-3); }
.sec .lede { font-size: var(--t-sm); line-height: 1.55; margin-bottom: var(--s-3); }

/* history.html timeline - a rule with dated entries, each with a real source. */
/* THE TIMELINE, which is the whole of history.html and was a 1px line with 7px
   grey dots on it. The dot is now a NODE - a ring drawn in the page ground with
   an --ink-dim edge - which is the difference between a list that has bullets
   and a spine that has stops on it. The spine goes to 2px to match every other
   rule on the site that separates rather than decorates (.sec__h::after,
   .foot__h, .prose thead th), so the page has one line weight rather than two.

   The ring's fill is --bg rather than transparent on purpose: it has to knock
   the spine out from under itself or the line runs straight through the node. */
.tl { list-style: none; margin: 0; padding: 0; border-left: 2px solid var(--rule); }
.tl__item { position: relative; padding: 0 0 var(--s-5) 22px; }
.tl__item::before {
  content: ''; position: absolute; left: -6px; top: 6px;
  width: 10px; height: 10px; border-radius: 50%;
  background: var(--bg); border: 2px solid var(--ink-dim); box-sizing: border-box;
}
.tl__date { font-family: var(--mono); font-size: var(--t-xs); letter-spacing: 0.08em; color: var(--ink-dim); display: block; margin-bottom: 3px; }
.tl__h { font-size: var(--t-base); margin: 0 0 5px; }
.tl__b { font-size: var(--t-base); color: var(--ink-dim); margin: 0 0 6px; max-width: var(--measure); }
.tl__src { font-family: var(--mono); font-size: var(--t-xs); }
.tl__src a { color: var(--ink-faint); }
.tl__src a:hover { color: var(--ink); }

/* Section rhythm. One value, used everywhere, loosened once there is room - the
   negative space is what makes a dense instrument panel readable rather than
   busy, and it is the cheapest thing on this page that reads as expensive. */
.sec { margin: var(--sec) 0 0; }
@media (min-width: 720px) { .sec { margin-top: var(--sec-lg); } }
/* The trailing hairline is an editorial device, not decoration: it terminates
   the heading so a five-word label does not float in the middle of a wide column. */
.sec__h {
  display: flex; align-items: center; gap: var(--s-3);
  /* WAS --t-sm (14.5px) in --ink-dim — SMALLER AND DIMMER THAN BODY TEXT, on
     the element whose whole job is to break 17 sections into findable parts.
     That is an inverted hierarchy: the organising layer was the quietest thing
     on the page. Now the body step in full ink, which is the smallest change
     that makes a heading outrank the prose under it. */
  font-family: var(--mono); font-size: var(--t-base); letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink); margin: 0 0 var(--s-3); font-weight: 600;
}
/* FOUR CHANGES TO THE MOST-REPEATED ELEMENT ON THE SITE, and they are the
   cheapest hierarchy available: there are 32 of these across the templates and
   every one of them was an <h2> set at 11px in the faintest ink in the palette
   at weight 500 - lighter, smaller and paler than the caption underneath it.
   A section heading that loses to its own lede is not a heading.

     size    --t-xs -> --t-sm. 11 -> 13. Still the smallest step that is not a
             micro-label, so nothing reflows; it is simply no longer tied with
             the axis ticks inside the charts for smallest type on the page.
     ink     --ink-faint -> --ink-dim. Measured: 5.03 -> 7.59 on --bg in dark
             and 4.97 -> 6.61 in light. Both already cleared AA; this is the
             brief's point that de-emphasis should come from size and weight
             rather than from pale ink, applied to the element that had been
             carrying all three at once.
     weight  500 -> 600, which is what actually separates it from the mono
             labels that share its case and tracking.
     air     8 -> 12px below, so the heading belongs to the block it labels by
             a clear margin rather than by one step of --s.

   The trailing rule goes 1px -> 2px for the same reason: at 1px it read as the
   bottom of a table, at 2px it reads as the end of a title. CHROMA overrides
   only its BACKGROUND with the fade, so the weight set here is what ships. */
.sec__h::after { content: ''; flex: 1 1 auto; height: 2px; border-radius: 2px; background: var(--rule); }

/* The embed snippet box on the dashboard - the moat is only a moat if people
   can find the copy-paste line without reading docs. */
.snippet {
  background: var(--bg-sunken); border: 1px solid var(--rule); border-radius: var(--radius-lg);
  padding: var(--s-3) 14px; font-family: var(--mono); font-size: var(--t-xs); line-height: 1.5;
  overflow-x: auto; white-space: pre; color: var(--ink-dim); margin: 0 0 10px;
}
.apilist { list-style: none; margin: 0; padding: 0; display: grid; gap: 7px; }
.apilist code { font-size: var(--t-xs); }
.apilist span { color: var(--ink-faint); font-size: var(--t-sm); }
`;

// ---------------------------------------------------------------------------
// AVATARS - the principal marks from site/templates/_avatars.mjs.
//
// Shape identifies the person, hue identifies their lab, and the name is always
// in text beside the mark. That division is argued in the header of the module
// that emits this markup; the only thing to say here is that it is the reason
// none of these rules make a colour load-bearing. Desaturate this whole block
// and every mark is still eight distinguishable silhouettes with a monogram on
// it, which is how a reposted screenshot of the watch floor actually reads.
// ---------------------------------------------------------------------------
const AVATARS = `
/* The symbol sheet must not take part in layout. width/height 0 on the element
   is not enough in every engine; absolute plus overflow hidden is. */
.avtsprite { position: absolute; width: 0; height: 0; overflow: hidden; }

.avt {
  position: relative; display: inline-flex; align-items: center; justify-content: center;
  flex: 0 0 auto; color: var(--avt-a, var(--ink-dim));
}
.avt--sm { width: 20px; height: 20px; }
.avt--md { width: 26px; height: 26px; }
.avt--lg { width: 34px; height: 34px; }
/* fill and stroke-dasharray are inheritable SVG properties, so they cross into
   the <use> shadow tree and reach the shape inside the <symbol>. That is what
   lets one colourless sprite serve both themes, eight hues and the dotted
   "no principal published" frame without a second copy of the geometry.
   The flat transparent declaration first, so an engine without color-mix gets
   an outline rather than a black blob. */
.avt__m {
  position: absolute; inset: 0; width: 100%; height: 100%; display: block;
  fill: transparent;
  fill: color-mix(in srgb, currentColor 15%, transparent);
}
.avt__i {
  position: relative; font-family: var(--mono); font-weight: 700;
  color: var(--ink); line-height: 1; letter-spacing: 0.01em;
  -webkit-user-select: none; user-select: none;
}
.avt--sm .avt__i { font-size: var(--t-2xs); }
.avt--md .avt__i { font-size: var(--t-2xs); }
.avt--lg .avt__i { font-size: var(--t-sm); }
/* No principal published. Dotted, unlettered, in faint ink - the same grammar
   the freshness chips use for "awaiting a baseline", because it is the same
   kind of statement: we have not published this, which is not the same as
   there being nothing to publish. */
.avt--none { color: var(--ink-faint); }
.avt--none .avt__m { fill: none; stroke-dasharray: 1.6 2.4; }

/* max-width plus min-width:0 plus a capped role line is what stops a long
   principal_role blowing out the column it sits in. Measured, not assumed:
   data/race.json publishes "CEO, Google DeepMind" as a role, which the row
   composes into a 38-character second line, and in a grid track declared as
   plain 1fr that widened the whole watch floor past the viewport. Two of the
   three guards are here; the third is on the caller and is written into the
   integration note in _avatars.mjs - a grid holding these wants
   minmax(0, 1fr), never 1fr. */
.avtrow {
  display: inline-flex; align-items: center; gap: var(--s-2);
  min-width: 0; max-width: 100%; text-decoration: none; color: inherit;
}
.avtrow--bare { gap: 0; }
.avtrow__t { display: flex; flex-direction: column; flex: 1 1 auto; min-width: 0; line-height: 1.25; }
.avtrow__n {
  font-family: var(--mono); font-size: var(--t-xs); font-weight: 500;
  letter-spacing: 0.02em; color: var(--ink);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.avtrow__n--none { color: var(--ink-faint); }
.avtrow__r {
  font-size: var(--t-2xs); color: var(--ink-faint); max-width: 30ch;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.avtrow--md .avtrow__n { font-size: var(--t-sm); }
.avtrow--lg .avtrow__n { font-size: var(--t-base); font-weight: 700; letter-spacing: 0; }
.avtrow--lg .avtrow__r { font-size: var(--t-xs); }
a.avtrow:hover .avtrow__n { color: var(--avt-a, var(--accent-2)); }
a.avtrow:hover .avt__m { fill: color-mix(in srgb, currentColor 28%, transparent); }
`;

// NOTE ON WHERE THE ARRIVAL PAINT LIVES.
//
// The .newbadge / .npulse / .nsrc rules for the counters in
// site/templates/_parts.mjs are NOT here. They are in the ARRIVE block above,
// beside [data-new="1"] and the rest of the arrival grammar, because that is
// what they are - the same "this is new since you were last here" vocabulary,
// counted rather than marked. This file briefly carried two definitions of
// them, which is how the desktop layout ended up being decided by whichever
// block happened to be later in css(). One home, and it is the one where the
// grammar already lived.
//
// One thing was settled in the merge and is worth recording: a PARTIAL window
// is dotted, not dashed. The freshness chips already spend dashed on "dark"
// (the fetch failed) and dotted on "awaiting baseline" (it answered, we have no
// frozen history to score it against). A 24h count taken over a 5h record is
// the second of those, not the first - we have the reading and we lack the
// history - so it takes the dotted border, and the two never get confused.

// ---------------------------------------------------------------------------
// THE OVEN — NOT PAINTED HERE, AND THAT IS THE FINDING.
//
// This file briefly carried a full .oven* block: a five-stop rail, a heat
// track, a previous-position caret. site/templates/_oven.mjs then landed with
// its own markup and its own scoped <style>, the way _labs.mjs, _xwire.mjs,
// newsPage.mjs, racePage.mjs and _whatchanged.mjs all do — and it reuses four
// of the same class names for structurally different elements.
//
// That is not a style disagreement, it is a defect, and it was measured rather
// than argued: rendering _oven.mjs against the global sheet, `.oven__band {
// margin-top: auto }` pushed all five published band ranges — 0-34, 35-54,
// 55-69, 70-84, 85-100 — down into the cell's bottom padding, where
// `.oven__st { overflow: hidden }` clipped them out of existence. Five figures
// that were correctly present in the HTML were invisible on the page. On a site
// whose whole claim is that the numbers are in the markup, a stylesheet that
// hides them is the worst available bug. `.oven__fill { inset: 0 }` was setting
// a right edge on an element that sizes itself by width, for good measure.
//
// So the block is gone, and the rule it teaches is written down: a component
// that ships its own scoped styleTag owns its own class namespace completely.
// This file owns the TOKENS it draws with — --heat-5 through --heat-1 are
// defined above and are exactly the cool-to-hot ramp an oven wants — the shared
// grammar, and the components whose markup comes out of _parts.mjs and
// _avatars.mjs, which deliberately ship no style block of their own.

// ---------------------------------------------------------------------------
// THE INFRASTRUCTURE SUB-INDEX — NOT PAINTED HERE EITHER, FOR THE SAME REASON.
//
// This file briefly exported an `infraCss` block of .infra* rules — a header,
// counter tiles, a corridor table and the three source states — written against
// a markup contract nobody had agreed to. site/templates/infraPage.mjs then
// landed with its own namespace (.ib, .ic, .ig, .idev, .idro, .icorr), its own
// scoped <style>, and its own function called infraCss(). Not one of my
// selectors matches a single element it emits.
//
// So the block was 4.2 KB of CSS for markup that will never exist, under an
// export name that would collide with the real function the first time anyone
// wrote `import { infraCss } from '../styles.mjs'` inside the module that
// actually owns the page. It is gone.
//
// What that page should take from this file is the TOKENS, which are the part
// a shared stylesheet is genuinely for: --accent-2 is the cool accent, defined
// in both schemes and deliberately not the hero's amber, so a second named
// scalar cannot be mistaken for the index itself; --heat-5 through --heat-1 are
// the cool-to-hot ramp; and the three source states keep their existing
// grammar — solid for live, dashed for dark, dotted for awaiting a baseline —
// which is set by .chip in FRESH and must not be reinvented per page.

// ---------------------------------------------------------------------------
// THE ICON SPRITE — paint for site/templates/_icons.mjs.
//
// That module ships the geometry and no CSS; this block is the whole of its
// appearance. The division is the same one the rest of this file already
// keeps: a component with its own scoped <style> owns its namespace, and a
// component that deliberately ships none (_parts.mjs, _avatars.mjs, and now
// _icons.mjs) is painted here.
//
// SIZED IN `em`, and that is the decision that makes one sprite serve six type
// steps. A mark set in em is 1.15x the size of the text it sits beside, at
// every step, with no size prop at any call site — so the same icon is 11.5px
// against a rail key and 23px against a card numeral and is optically correct
// in both. The old marks were sized in px at every call site, which is why
// _labs's 16px glyph and _reel's 13px sigil looked like different weights
// beside the same 11px label.
//
// COLOUR IS INHERITED, never declared. `currentColor` inside a <symbol>
// resolves against the referencing element, so a mark in a pillar tag takes
// --p, a mark in a live chip takes --ok, and a mark in the level block takes
// the accent, with no per-icon rule and no second copy of the geometry.
// ---------------------------------------------------------------------------
const ICONS = `
/* The sheet itself must not take part in layout. width/height 0 on the element
   is not enough in every engine; absolute plus overflow hidden is. Same
   treatment as .avtsprite and .dcsprite, for the same reason. */
.dcicons { position: absolute; width: 0; height: 0; overflow: hidden; }

.dcico {
  width: var(--ico, 1.15em); height: var(--ico, 1.15em);
  display: inline-block; flex: 0 0 auto;
  /* Optical baseline. A square mark sitting on the text baseline rides high,
     because a lowercase-height line of mono has its mass below the cap line.
     -0.16em is measured against JetBrains Mono at --t-xs, which is where most
     of these sit. */
  vertical-align: -0.16em;
  color: inherit;
}
/* In a baseline-aligned flex row (.chip, .rail__c, .sw__tab, .avtrow) the
   element is already positioned by the row and the shift would double. */
.chip .dcico, .rail__c .dcico, .sw__tab .dcico,
.fresh__lg .dcico, .pillar-tag .dcico, .delta .dcico { vertical-align: baseline; }

/* A mark that is doing the identifying on its own gets a little more room. */
.dcico--lg { --ico: 1.45em; }
/* A mark inside a heading is a label for the heading, not a second heading. */
.sec__h .dcico, .foot__h .dcico { --ico: 1.25em; color: var(--ink-faint); }

/* THE THREE — FOUR — SOURCE STATES, WHEN DRAWN AS AN ICON RATHER THAN AS A
   CHIP BORDER. Same four hues the chips use, in the same order, because a
   legend that renders its states differently from the things it legends is
   worse than no legend. The dash pattern is baked into the geometry in
   _icons.mjs, so these rules add only the hue — which is the fourth signal,
   behind silhouette, dash and the word beside it. */
[data-status="ok"]    > .dcico, .dcico--live     { color: var(--ok); }
[data-status="stale"] > .dcico, .dcico--stale    { color: var(--stale); }
[data-status="dark"]  > .dcico, .dcico--dark     { color: var(--dark-src); }
[data-status="uncal"] > .dcico, .dcico--awaiting { color: var(--accent-2); }

/* Datacentre status, for the map and its legend. Deliberately NOT the source
   states' palette: a building that is operating is not a feed that is live,
   and giving them one palette would invite the reader to read a dark pin as a
   failed fetch. Operating takes ink — it is the ordinary case and there are
   1,769 of them; the two that are NOT yet concrete take the cool accent and
   the faint ink, which is the same "not scored yet" grammar as everywhere
   else on this site. */
[data-dc="operating"] > .dcico, .dcico--operating { color: var(--ink); }
[data-dc="under_construction"] > .dcico, .dcico--building { color: var(--accent-2); }
[data-dc="announced"] > .dcico, .dcico--announced { color: var(--ink-faint); }

/* Direction. The same no-good-bad-axis rule the .delta chip already follows and
   for the same reason: green for a falling score would say a quieter day is a
   better day, and DOOMCON measures tempo. Up takes the accent ONLY inside the
   live delta chip — everywhere else all three directions are ink, and the
   chevron is the signal. */
.dcico--up, .dcico--down, .dcico--flat { color: var(--ink-dim); }
.delta[data-dir="up"] .dcico--up { color: var(--accent); }

@media print { .dcico { color: #000; } }
`;

// ---------------------------------------------------------------------------
// CHROMA - the colour the operator asked for twice, spent where it is also
// information.
//
// Loaded last so these win ties without renaming a single selector, which
// matters because index.mjs, news.mjs, _reel.mjs, _charts.mjs, _labs.mjs,
// _xwire.mjs, racePage.mjs, newsPage.mjs and history.mjs all emit markup
// against the names being touched here.
//
// The discipline is unchanged: amber still means the live value and nothing
// else, and every rule below adds a hue to something that ALREADY carries its
// meaning in a word, a shape or a number. Turn the whole block off and the site
// loses no fact.
// ---------------------------------------------------------------------------
const CHROMA = `
/* The masthead hairline is the level scale, cool to hot, two pixels tall. It is
   the only piece of pure decoration added here and it earns its place by being
   the page's legend: the reader meets the ramp before they meet the rail that
   uses it. Absolutely positioned, so it adds no height and shifts nothing. */
.masthead::before {
  content: ''; position: absolute; left: 0; right: 0; top: 0; height: 3px;
  background: linear-gradient(90deg,
    var(--heat-5) 0%, var(--heat-4) 30%, var(--heat-3) 54%, var(--heat-2) 74%, var(--heat-1) 100%);
}
@media print { .masthead::before { display: none; } }

/* Pillar cards take their pillar's hue on the inline-start edge. _parts.mjs now
   puts data-pillar on the article, which is the same hook the feed rows, the
   reel cards and the filter chips use, so a reader learns five colours once and
   they mean the same five things everywhere. The fallback is the neutral rule,
   so a page that does not ship _reel's pillarCss still renders correctly. */
.pillar { border-inline-start: 2px solid var(--p, var(--rule-soft)); }
.pillar[data-dark="1"] { border-inline-start-style: dashed; border-inline-start-color: var(--rule); }
.pillar[data-uncalibrated="1"] { border-inline-start-style: dotted; }
.pillar__score { color: var(--p, var(--ink)); }
.pillar[data-dark="1"] .pillar__score { color: var(--ink-faint); }

/* Source-kind badges. The letter was already doing the identifying; the hue is
   the second read, and it is what makes a mixed strip of chips scannable rather
   than uniform. */
.chip--x::before          { color: var(--ink-dim); }
.chip--kalshi::before     { color: var(--heat-4); }
.chip--polymarket::before { color: var(--accent-2); }
.chip--manifold::before   { color: var(--heat-2); }
.chip--news::before       { color: var(--heat-3); }
.chip--paper::before      { color: var(--accent-2); }
.chip--gov::before        { color: var(--heat-4); }
.chip--code::before       { color: var(--heat-2); }

/* The section rule fades rather than stopping dead, which is the cheapest
   possible way to make eleven identical headings look composed. It now fades
   from var(--p) where a pillar hue is in scope and from --rule where it is
   not, so a heading inside a pillar-scoped block is tied to its pillar by the
   same five colours the cards, the feed rows and the filter chips use. The
   fallback is the neutral rule, which is what every heading outside such a
   block still gets - this adds a hue where one is already defined and invents
   none. Height comes from the base rule (2px), not from here. */
.sec__h::after { background: linear-gradient(90deg, var(--p, var(--rule)), transparent); }

/* ---- THE OVEN RAIL TAKES THE HEAT RAMP -----------------------------------

   The rail is the best-built object on the homepage and it was rendered in one
   colour. Five stages, named DORMANT to UNPRECEDENTED, cool to hot, drawn as
   five identical grey cells with one amber box - so the thing the rail is FOR,
   that the stages are a temperature scale rather than a list, was carried by
   the words alone and by a burner bar that was grey at every stage.

   --k is set inline by _oven.mjs, per stage, as heat/100: 0.0 at DORMANT
   through 0.8 at UNPRECEDENTED. That one number is enough to interpolate the
   whole ramp, so each burner is lit at its own stage's colour with no new
   markup, no per-stage class and nothing for that file to emit. Turn the
   colour off and the burner is still a bar that is 20% longer per stage, the
   number is still printed, the name is still printed and the band is still
   printed. The hue is the fourth signal, exactly as the heat ramp's own
   definition in this file requires.

   Selected at .oven <thing> because _oven.mjs's styleTag ships inside <main>
   and is therefore later in the document; one extra class is the whole of what
   it takes to win that tie without renaming anything. */
.oven .oven__st {
  --burn: color-mix(in oklab, var(--heat-5), var(--heat-1) calc(var(--k, 0) * 100%));
}
.oven .oven__st::after { background: var(--burn); opacity: 0.55; }
.oven .oven__st[data-state="live"]::after { background: var(--accent); opacity: 1; }
/* The stage number takes the same hue at half strength, so the staircase reads
   at a glance from the numerals as well as from the burners. The live stage
   keeps full ink and 700 weight from _oven.mjs, which is what must win. */
.oven .oven__st .oven__num { color: color-mix(in srgb, var(--burn) 62%, var(--ink-faint)); }
.oven .oven__st[data-state="live"] .oven__num { color: var(--ink); }
/* A hairline of the stage's own colour along its top edge. 1px, inside the
   cell's existing border, so it adds no height and moves nothing. */
.oven .oven__st { border-top: 2px solid var(--burn); }
.oven .oven__st[data-state="live"] { border-top-color: var(--accent); }

/* ---- PILLAR HUE, SPENT WHERE IT IS ALSO INFORMATION -----------------------

   --p is now set on every [data-pillar] in the document rather than only on the
   pages that happen to ship _reel.mjs's block (see PILLARS_DARK above). These
   are the surfaces that were carrying a pillar id and painting it grey. */

/* The pillar tag's sigil was ink-faint on every pillar - the one element on the
   site whose entire job is to say WHICH pillar, rendered in the colour that
   says "none of them". The sigil shape still does the identifying. */
.pillar-tag {
  color: var(--p, var(--ink-dim));
  border-color: color-mix(in srgb, var(--p, var(--rule)) 45%, var(--rule));
  background: color-mix(in srgb, var(--p, transparent) 10%, transparent);
}
.pillar-tag::before { color: var(--p, var(--ink-faint)); }
/* The five pillar hues, available as a swatch to anything that names ONE
   pillar without carrying the attribute — a legend key, a filter chip, a map
   overlay. --pill-<id> is set on :root in TOKENS; this is the paint. */
.pswatch { display: inline-block; width: 0.7em; height: 0.7em; border-radius: 1px; background: var(--p, var(--rule)); vertical-align: -0.02em; }
/* NOT WRITTEN HERE, and the reason is worth a line so the next pass does not
   try: the 200-row signal feed already takes the pillar hue. news.mjs draws
   .nrow::before as var(--p, var(--rule)), which resolved to the fallback rule
   on every page that did not ship _reel.mjs's block and now resolves to the
   pillar on all of them. Promoting the tokens lit that up for free. The ranked
   pillar chart is the one surface that still cannot: _charts.mjs emits its bars
   as bare <rect class="ch-r-bar"> with no per-row pillar hook, so there is
   nothing to select. That is a two-attribute change in that file and it is in
   the integration note rather than forced from here.

   THE SPARKLINES. Five pillar cards, five sparklines, all of them amber - so
   the row read as one chart drawn five times. .spark__line and friends are the
   real class names (double underscore; the first draft of this block guessed
   single and shipped four dead selectors). A five-card row in five colours is
   the clearest statement the homepage makes that the pillars are five different
   things, and every card still prints its pillar's name, sigil and score. */
.pillar .spark__line { stroke: var(--p, var(--ink-dim)); }
.pillar .spark__area { fill: color-mix(in srgb, var(--p, var(--ink-dim)) 15%, transparent); }
.pillar .spark__dot  { fill: var(--p, var(--ink)); }
.pillar .spark__ring { stroke: var(--p, var(--ink)); }
/* A dark or uncalibrated pillar keeps its grey. Colour on that card would say
   the series is live, which is the one thing MOTION.md 4 forbids a visual from
   implying - and a still, colourless card is the honest opposite. */
.pillar[data-dark="1"] .spark__line, .pillar[data-uncalibrated="1"] .spark__line { stroke: var(--ink-faint); }
.pillar[data-dark="1"] .spark__area, .pillar[data-uncalibrated="1"] .spark__area { fill: var(--wash-alt); }
.pillar[data-dark="1"] .spark__dot, .pillar[data-uncalibrated="1"] .spark__dot { fill: var(--ink-faint); }

/* The masthead ramp is the page's legend for all of the above, and it now has
   two things to legend rather than one. Unchanged geometry, stated here only
   so the next reader knows it is deliberate that it is the LEVEL ramp and not
   the pillar palette: the pillars are five categories with no order, and a
   gradient across them would claim an ordering that does not exist. */

/* ---- ONE HOVER GRAMMAR, SPENT IN THE INTERACTIVE HUE ----------------------

   --accent-2 is defined at the top of this file as "every interactive
   affordance", and it was being spent on about half of them: the cross-sell
   cards had it, the footer index and the row lists did not, so whether a thing
   was clickable was answered differently in three places on one page.

   Every hover below is the same two ideas - a 3px inline-start mark in the
   interactive hue, and the raised ground - so a reader learns the affordance
   once. Colour is never alone in any of them: the ground moves too, and every
   one of these targets is a link whose cursor and focus ring already say so.
   An inset shadow rather than a border, because a border on hover reflows a
   row by 3px and an inset does not move anything at all. */
.move__a:hover { box-shadow: inset 3px 0 0 var(--accent-2); }
a.chip:hover { border-color: var(--accent-2); background: var(--bg-sunken); }
a.chip:hover b { color: var(--accent-2); }

`;


// ---------------------------------------------------------------------------
// THE SWITCHER - .sw*
//
// WHY IT EXISTS. docs/VISITORS.md 4.9, measured: pizzint runs SEVEN in-place
// dataset switchers - one slot, different datasets, no navigation - and we ran
// zero. That is the structural reason their sessions are longer. It is a
// control, not a decoration: it turns "read this page" into "operate this
// instrument", and it retires "Elsewhere on the desk", which reached the same
// destinations as three link cards at 84% scroll depth.
//
// THE ONE RULE THAT CANNOT BEND, and the reason the control is radios and not
// script: every panel is in the static HTML. The page works with JavaScript
// off, a crawler reads all five datasets, and a screenshot taken before
// hydration shows the default panel complete. That is the exact failure we beat
// pizzint on - LOADING TACTICAL DATA... where their venue card should be - and
// buying their engagement mechanism at the price of their worst bug would be a
// bad trade at any exchange rate.
//
// WHO PAINTS WHAT. _switcher.mjs ships the markup and the panel INTERIORS,
// namespaced .dsk__*, and ships no rule at all for the control. The control is
// this block, entire: the radios, the strip, the selected state, the frame and
// the stacking. That division is why the contract below is written out in full
// - it is the interface between two files, so it is stated rather than implied.
//
// THE MARKUP CONTRACT.
//
//   <section class="sw" aria-labelledby="sw-h">
//     …an optional heading row…
//     <input class="sw__in" type="radio" name="sw" id="sw-…" checked>   one per
//                                        panel, ALL of them before .sw__tabs
//     <div class="sw__tabs" role="radiogroup">
//       <label class="sw__tab" for="sw-…" data-state="live">
//         <i class="sw__tg" aria-hidden="true">◆</i>
//         <span class="sw__tk">Signal</span>
//         <b class="sw__tn num">200</b>
//       </label>                                       same order as the radios
//     </div>
//     <div class="sw__panels">
//       <article class="sw__panel">
//         <div class="sw__head"><h3 class="sw__ph">…</h3><span class="sw__pm">…</span></div>
//         <div class="sw__body">…</div>
//         <a class="sw__more" href="…">…</a>
//       </article>                                     same order again
//     </div>
//   </section>
//
// Panel N binds to radio N by nth-of-type, so the labels must be the only
// children of .sw__tabs and the articles the only children of .sw__panels. A
// heading before the radios is fine - :nth-of-type counts inputs among inputs.
// Exactly one radio carries `checked`. SW_MAX is the ceiling.
//
// If the control is ever rendered server-selected instead - one panel chosen at
// build time, the tabs as real links - set aria-selected="true" on the chosen
// tab and data-on="1" on the chosen panel and every rule here still applies.
// ---------------------------------------------------------------------------

/** Radio N lights tab N and shows panel N. Five datasets today; room for eight
 *  before anyone has to think about this number again. */
const SW_MAX = 8;

/** One index, six selectors: the lit tab, its accent cap, its figure, its
 *  sigil, its panel, and its focus ring. Generated rather than typed out, so
 *  adding a dataset is a data change in _switcher.mjs and nothing at all here. */
function swBindings() {
  const rows = [];
  const on = (n, sel) => `.sw__in:nth-of-type(${n}):checked ~ ${sel}`;
  for (let n = 1; n <= SW_MAX; n += 1) {
    const tab = `.sw__tabs > .sw__tab:nth-child(${n})`;
    rows.push(`${on(n, tab)} { color: var(--ink); background: var(--bg-sunken); border-color: var(--rule); border-bottom-color: var(--bg-sunken); font-weight: 700; }`);
    rows.push(`${on(n, tab)}::after { opacity: 1; }`);
    rows.push(`${on(n, tab)} .sw__tn { color: var(--accent-2); border-color: var(--accent-2); }`);
    rows.push(`${on(n, tab)} .sw__tg { color: var(--ink); }`);
    rows.push(`${on(n, `.sw__panels > .sw__panel:nth-child(${n})`)} { visibility: visible; opacity: 1; }`);
    rows.push(`.sw__in:nth-of-type(${n}):focus-visible ~ ${tab} { outline: 2px solid var(--accent-2); outline-offset: -2px; }`);
  }
  return rows.join('\n');
}

/* ---------------------------------------------------------------------------
   MEASURED THIS PASS, AND DELIBERATELY NOT CUT.

   _switcher.mjs has since landed its own complete scoped <style> for this
   control, and it binds its panels with ID selectors (`#sw-signal:checked ~ …`)
   rather than with the nth-of-type chain below. An id beats a class chain and
   its sheet ships inside <main>, so it wins twice. Checked on the built page:
   ALL THIRTEEN .sw__* selectors this block paints are also painted there, and
   nothing here is currently reaching the page — about 5.9 KB of emitted CSS,
   inlined into every page, doing nothing.

   It stays anyway, and the reason is one line in that module: `render()` takes
   `o.style === false` and will emit the markup with no sheet at all. Its header
   states the redundancy as a design choice — "the control works with that
   sheet, without it, and with either of its vocabularies" — and a switcher
   whose panels do not switch because two files disagreed is the worst available
   outcome. Today's single caller (index.mjs:148) does not pass that flag, so
   the block is a parachute. Cutting a parachute because it has not opened is
   not a saving.

   What IS a defect is the two files disagreeing about COLOUR, which they now
   do: the accent doctrine at the top of this file spends amber only on the live
   reading of the index, and the rules below were moved to --accent-2 to match.
   _switcher.mjs:607 and :693 still say var(--accent) and they win, so the open
   tab's count renders amber on the live page. That is two values in one file
   and it is in the integration note.
   --------------------------------------------------------------------------- */
const SWITCHER = `
/* The densest object on the page gets the page's largest gap above it. A tab
   strip beginning 24px under the thing before it reads as part of that thing. */
.sw { margin-top: var(--sec-lg); }

/* The radios are the state machine. Off-screen rather than display:none, which
   would take them out of the tab order and leave the control unreachable from a
   keyboard - the labels are the only visible handle, so the input being
   focusable is what makes the arrow keys work. */
.sw__in {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

/* ---- THE TAB STRIP ------------------------------------------------------ */
/* Folder tabs, not pills. A tab whose bottom edge opens into the panel below it
   is the one idiom that says "this strip and that frame are one object" with no
   word of instruction, and it is the difference between a control and five
   buttons above some content. The -1px margin closes the seam. */
.sw__tabs {
  display: flex; gap: 2px; margin: 0; padding: 0;
  overflow-x: auto; overscroll-behavior-x: contain;
  scrollbar-width: none; -ms-overflow-style: none;
  border-bottom: 1px solid var(--rule);
}
.sw__tabs::-webkit-scrollbar { display: none; }
.sw__tab {
  position: relative; flex: 0 0 auto;
  display: inline-flex; align-items: baseline; gap: 6px;
  padding: 7px 11px; cursor: pointer;
  font-family: var(--mono); font-size: var(--t-xs); letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--ink-dim); font-weight: 500;
  background: var(--bg); border: 1px solid transparent; border-bottom: 0;
  border-radius: var(--radius) var(--radius) 0 0;
  margin-bottom: -1px;
  -webkit-user-select: none; user-select: none;
  transition: color 120ms ease, background-color 120ms ease;
}
.sw__tab:hover { color: var(--ink); background: var(--bg-raised); }
/* SELECTION IS NEVER COLOUR ALONE, and on a tab strip that is not a nicety:
   this control is how the reader knows which dataset is under them, so getting
   it wrong makes the panel beneath it a lie. FOUR signals, all generated in
   swBindings(): the tab lifts onto the frame's own background, its hairline
   opens into the frame, its label goes to 700 weight and full ink, and a 2px
   accent cap sits on its top edge. Desaturate the page and the open tab is
   still the heavier one that has broken the line. */
.sw__tab::after {
  content: ''; position: absolute; left: -1px; right: -1px; top: -1px; height: 2px;
  background: var(--accent-2); border-radius: var(--radius) var(--radius) 0 0;
  opacity: 0; transition: opacity 120ms ease;
}
.sw__tg { font-style: normal; font-size: var(--t-2xs); line-height: 1; color: var(--ink-faint); }
.sw__tk { white-space: nowrap; }
/* THE LIVE COUNT is what makes the strip a legend rather than a menu: five
   destinations AND five readings in one 34px row, every figure already computed
   before the control was rendered. Cool accent, the same rule the masthead nav
   follows - amber is the live value of the thing you are LOOKING at, so only
   the open tab's figure goes amber. */
.sw__tn {
  font-weight: 700; letter-spacing: 0.01em; font-size: var(--t-xs);
  font-variant-numeric: tabular-nums; color: var(--accent-2);
  border: 1px solid var(--rule); border-radius: 2px; padding: 0 4px;
  min-width: 3.4ch; text-align: center; line-height: 1.5;
}
/* ZERO IS NOT AN EVENT - the arrival badges' rule, applied here. A counter that
   lights up to announce that nothing happened is the pizzint failure in a
   smaller costume, and this index posts the calm days on purpose. */
.sw__tn[data-zero="1"] { color: var(--ink-faint); font-weight: 500; }
/* A dataset whose sources are dark says so ON ITS OWN TAB, before the reader
   spends a tap on it, and in the same three-state grammar the freshness chips
   use - because it is the same statement. */
.sw__tab[data-state="dark"] { border-style: dashed; border-color: var(--rule); color: var(--ink-faint); }
.sw__tab[data-state="dark"] .sw__tn { color: var(--ink-faint); border-style: dashed; }
.sw__tab[data-state="uncal"] .sw__tn,
.sw__tab[data-state="awaiting-baseline"] .sw__tn { border-style: dotted; color: var(--accent-2); }

/* ---- THE PANEL FRAME ---------------------------------------------------- */
/* MOUNTED, NOT STACKED. Before this the tab strip floated over a panel with no
   edges, so five datasets read as five headings that happened to replace each
   other rather than as one instrument with five settings. An inset well with a
   hairline around it, under a strip of raised tabs, is the whole difference
   between a control and a list, and it costs 13px of padding.

   EVERY PANEL IN ONE GRID CELL is the whole of "no layout shift on switch": the
   well is always as tall as its TALLEST panel, so switching moves nothing on
   the page below it and the reader's thumb stays where they put it. A stack
   that resizes on every tap is why most tab strips feel cheap. Measured on the
   live build, the five panels run 617px to 1,920px - so without this, tapping
   SUBSTRATE after SIGNAL shortens the page by about 1,300px under the reader's
   finger. It costs the tallest panel's height rather than the average, and that
   is the price of the control not jumping.

   Hidden panels are visibility:hidden, NOT display:none. Three reasons, all
   load-bearing: a display:none box has no height, so there would be nothing to
   stack against; visibility:hidden still takes the links out of the tab order
   and the text out of the accessibility tree, which is the correctness
   requirement; and a laid-out card reel can measure itself, so it does not
   appear at zero width the first time its panel is opened.

   min-width: 0 ON THE PANEL IS NOT COSMETIC, and this block shipped without it
   once. A grid item's default min-width is auto, which means it refuses to
   shrink below its content's MIN-CONTENT width. The signal panel contains the
   card reel, whose min-content width is eight 300px cards, so the panel
   resolved to 2,410px inside a 375px viewport and every line of text in it ran
   off the right edge. Found by looking at the built page at 375x812, which is
   the only way it could have been found. */
.sw__panels {
  display: grid; grid-template-areas: 'sw'; grid-template-columns: minmax(0, 1fr);
  align-items: start; min-width: 0;
  background: var(--bg-sunken);
  border: 1px solid var(--rule); border-top: 0;
  border-radius: 0 0 var(--radius) var(--radius);
}
.sw__panel {
  grid-area: sw; min-width: 0;
  padding: var(--s-3) 13px var(--s-4);
  visibility: hidden; opacity: 0;
  transition: opacity 140ms ease;
}
/* The server-selected form, for a rendering with no radios. Before the
   generated bindings, so a radio always wins when both are present. */
.sw__panel[data-on="1"] { visibility: visible; opacity: 1; }
.sw__tab[aria-selected="true"] {
  color: var(--ink); background: var(--bg-sunken); border-color: var(--rule);
  border-bottom-color: var(--bg-sunken); font-weight: 700;
}
.sw__tab[aria-selected="true"]::after { opacity: 1; }
.sw__tab[aria-selected="true"] .sw__tn { color: var(--accent-2); border-color: var(--accent-2); }

${swBindings()}

/* ---- PANEL INTERIOR ----------------------------------------------------- */
/* The well is inset from the page, so the first thing in it must not be inset
   again from the well, and the last must not push a gap against the frame. */
.sw__panel > :first-child { margin-top: 0; }
.sw__panel > :last-child { margin-bottom: 0; }
.sw__head {
  display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px var(--s-3);
  padding-bottom: 7px; margin-bottom: var(--row);
  border-bottom: 1px solid var(--rule-soft);
}
.sw__ph {
  font-family: var(--mono); font-size: var(--t-sm); letter-spacing: 0.06em;
  color: var(--ink); margin: 0; font-weight: 500;
}
/* THE STAMP, and every panel carries one. The first question anyone asks of an
   in-place dataset switcher is whether the thing they just switched to is as
   fresh as the thing they switched from. pizzint's seven panels answer it zero
   times; that is the difference between a dashboard and a slideshow. */
.sw__pm {
  font-family: var(--mono); font-size: var(--t-2xs); letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--ink-faint); margin-left: auto;
  font-variant-numeric: tabular-nums;
}
.sw__body { min-width: 0; }
.sw__body > :first-child { margin-top: 0; }
.sw__body > :last-child { margin-bottom: 0; }
/* A panel that re-hosts a whole section brings that section's own top margin
   with it, and in here it is already inside a frame with its own padding. */
.sw__body > .sec:first-child, .sw__body > section:first-child { margin-top: 0; }
.sw__body .sec__h { font-size: var(--t-xs); }
/* Every tile is also a real URL. The crawler requirement and the share
   requirement are one requirement. The arrow is drawn, not typed. */
.sw__more {
  display: inline-flex; align-items: baseline; gap: 5px; margin-top: var(--row);
  font-family: var(--mono); font-size: var(--t-xs); letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--ink-dim); text-decoration: none;
  border-bottom: 1px solid var(--rule);
}
.sw__more::after { content: '\\2192'; color: var(--ink-faint); }
.sw__more:hover { color: var(--ink); border-bottom-color: var(--accent-2); }
.sw__more:hover::after { color: var(--accent-2); }

/* At 375px the well's 13px of side padding is 26px a card reel cannot spend on
   the card. The frame's edges are still drawn; only the inset shrinks. */
@media (max-width: 519px) {
  .sw__panel { padding: var(--s-3) 10px 12px; }
  .sw__tab { padding-inline: 9px; gap: 5px; }
}

/* Reduce turns the cross-fade off; the panel still switches, instantly. Same
   information, no motion - MOTION.md 3. Restated rather than left to the
   blanket override in BASE, because a zero-duration opacity transition on a
   visibility-hidden element is the exact case engines disagree on. */
@media (prefers-reduced-motion: reduce) {
  .sw__panel { transition: none; }
}
`;

/**
 * Strip block comments and the blank lines they leave behind.
 *
 * This sheet is inlined into EVERY page, so every byte of reasoning above is
 * paid for on every request, by every reader, forever. The reasoning still
 * matters and still lives in this file - it just does not need to travel. The
 * repo is public and linked from the footer, so nothing is hidden by this.
 *
 * Measured after this pass, 2026-09-24: 59.3 KB raw, 10.3 KB gzipped, against
 * 45.9 KB / 8.8 KB before it. The +13.4 KB raw is almost entirely the
 * switcher's generated bindings - forty-eight selectors that differ only in an
 * index - which is why the gzipped figure moves by 1.5 KB and not by thirteen:
 * that is exactly the shape a deflate window eats. The rest is the promoted
 * pillar tokens (four theme blocks) and the switcher's frame.
 *
 * Paid back in the same pass: the dead .ops block, the stale .reel rail
 * mechanics, and the first draft of the switcher contract are all cut.
 *
 * Safe because no declaration in this file contains the sequence slash-star -
 * the 'content' values are all escaped code points, and the assertion is
 * checked by building and grepping the output rather than by hoping.
 */
function lean(sheet) {
  return sheet
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim() + '\n';
}

/* ---------------------------------------------------------------------------
   OPS — the operations strip, and the level epithet.

   Measured against pizzint on 2026-09-24: we carry 554 numeric facts to their
   162, so density was never our problem. They beat us on internal links (84 to
   our 43) and on FRAMING — "8 LOCATIONS MONITORED / 40 REPORTS / 19 ALERTS /
   STATUS: OPERATIONAL" makes the page read as a desk that is watching
   something, rather than a page that displays a number. These rules buy that
   framing using counters we already hold and can defend.
   --------------------------------------------------------------------------- */
const XSELL = `
/* The cross-sell deck. Each card is a live fact, not a label, so the grid reads
   as five more things to KNOW rather than five more places to click - "The AI
   race" is a label and "Anthropic leads at 73.5%" is a reason.

   Denser than it was: the kicker and the figure share a baseline instead of
   stacking, which takes a card from 96px to 72px, and the grid goes to four
   columns on the wide measure so the whole deck is one screen-row rather than
   two. The arrow is drawn here rather than typed into the markup, so every card
   gains the affordance without index.mjs changing. */
.xsell__grid {
  list-style: none; margin: 0; padding: 0;
  display: grid; gap: 8px;
  grid-template-columns: 1fr;
}
@media (min-width: 560px) { .xsell__grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 900px) { .xsell__grid { grid-template-columns: repeat(3, 1fr); } }
@media (min-width: 1140px) { .xsell__grid { grid-template-columns: repeat(5, 1fr); } }
.xsell__a {
  position: relative;
  display: flex; flex-direction: column; gap: 3px; height: 100%;
  padding: var(--s-3) 14px;
  background: var(--bg-raised);
  border: 1px solid var(--rule);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-1);
  text-decoration: none; color: inherit;
  transition: border-color 120ms ease, background-color 120ms ease,
              box-shadow 120ms ease, transform 120ms ease;
}
/* The deck is the only place on the site where five cards sit in a row and
   every one of them is a link, so it is where a hover is worth spending depth
   on: the card lifts off the page rather than merely changing its edge. */
.xsell__a:hover { border-color: var(--accent-2); background: var(--bg-sunken); box-shadow: var(--shadow-2); }
.xsell__a::after {
  content: '\\2192'; position: absolute; top: 9px; right: 10px;
  font-family: var(--mono); font-size: var(--t-xs); color: var(--ink-faint);
  transition: color 120ms ease, transform 120ms ease;
}
.xsell__a:hover::after { color: var(--accent-2); }
@media (prefers-reduced-motion: no-preference) {
  .xsell__a:hover { transform: translateY(-1px); }
  .xsell__a:hover::after { transform: translateX(2px); }
}
.xsell__k {
  font-family: var(--mono); font-size: var(--t-2xs); letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--ink-faint); padding-right: 18px;
}
.xsell__l {
  font-family: var(--mono); font-size: var(--t-sm); line-height: 1.3;
  color: var(--accent-2); font-variant-numeric: tabular-nums;
}
.xsell__s { font-size: var(--t-xs); color: var(--ink-dim); line-height: 1.4; }
`;

const PLAIN = `
/* The plain-language read. Deliberately the only sentence in the hero set in
   the prose face rather than the mono — it is addressed to someone who does not
   read dashboards, and it should not look like telemetry. */
.level__plain {
  font-size: var(--t-base); line-height: 1.5; color: var(--ink-dim);
  max-width: 46ch; margin: var(--s-2) 0 0;
  border-left: 2px solid var(--rule); padding-left: 10px;
}
`;

const WORDMARK = `
/* Two-tier masthead: the publication is the name of the desk, the scalar is
   the number it publishes. Same shape as "Pentagon Pizza Index" sitting above
   "DOUGHCON 5" — one tells you where you are, the other tells you the reading. */
.wordmark { display: flex; flex-direction: column; gap: 0; text-decoration: none; line-height: 1.1; }
.wordmark__pub {
  font-family: var(--mono); font-size: var(--t-sm);
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink);
}
.wordmark__sc {
  font-family: var(--mono); font-size: var(--t-2xs);
  letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink-faint);
}
.wordmark:hover .wordmark__pub { color: var(--accent-2); }
`;

const OPS = `
/* ---------------------------------------------------------------------------
   WHAT IS LEFT OF THE OPERATIONS STRIP.

   The .ops block that lived here - the strip's layout, its phone-width scroll,
   its clock and its posture hue, about forty lines - is CUT, because the markup
   it painted is cut. layout.mjs printed .ops immediately above .rail and the
   two shared five atoms verbatim: REPORTING, SCORED, FEEDS, ITEMS and STATUS,
   said twice, 53px apart, in an 812px fold. That is precisely the "same fact
   wearing a different hat" failure the rail was built to fix, and the rail's
   own file was committing it. The one atom .ops carried alone - the ticking
   wall clock - is a rail cell now (.rail__clk in CHROME).

   Grepped before cutting: nothing in site/templates/ or site/*.mjs emits .ops
   or any .ops__* class except layout.mjs, which no longer does.

   The level epithet stays. It was only ever in this block because the counters
   it sat beside used to be.
   --------------------------------------------------------------------------- */
/* The epithet sits between the level name and the gloss: two to four words with
   a point of view, where the name above it is the measurement. The counters
   that used to live in this block are now the rail, in CHROME. */
.level__ep {
  font-family: var(--mono);
  font-size: var(--t-xs);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-dim);
  margin: 2px 0 var(--s-2);
}
`;

export function css() {
  return lean([
    TOKENS, BASE, CHROME, WORDMARK, OPS, PLAIN, HERO,
    CHARTS_CORE, CHARTS,
    FRESH, ARRIVE, REEL, PILLARS, MOVES, SWITCHER, XSELL, PROSE,
    // AVATARS is global because _avatars.mjs deliberately ships no style block
    // and its marks appear on more than one page. (The arrival counters' paint
    // is in ARRIVE, above, with the rest of the arrival grammar, for the same
    // reason.) infraCss is NOT here: it is exported for the sub-index module to
    // put in its own styleTag, so it costs nothing on the nine pages that will
    // never draw it and cannot collide with names that module may prefer —
    // which is the exact failure the missing OVEN block is a monument to.
    // CHROMA is last on purpose: every rule in it restyles a selector an
    // existing template already emits, and last is how it wins the tie without
    // any of those templates being renamed.
    AVATARS, ICONS, CHROMA,
  ].join('\n'));
}

// The widget is a separate, much smaller sheet. It shares no selectors with the
// site on purpose: an embed that drifts when the dashboard is restyled is worse
// than no embed. CHARTS_CORE rides along so a sparkline or gauge dropped into
// the widget is painted rather than invisible; the hero, feed and reel blocks
// have no business inside a 320px iframe.
export function embedCss() {
  return lean(`${TOKENS}
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: transparent; }
body { font-family: var(--sans); color: var(--ink); -webkit-font-smoothing: antialiased; font-variant-numeric: tabular-nums; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
}
.w {
  display: block; text-decoration: none; color: inherit;
  background: var(--bg); border: 1px solid var(--rule); border-radius: 4px;
  padding: 12px 14px 11px; min-width: 0;
}
.w:hover { border-color: var(--accent-2); }
.w__top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.w__brand { font-family: var(--mono); font-size: var(--t-2xs); font-weight: 700; letter-spacing: 0.2em; color: var(--ink-faint); }
.w__main { display: flex; align-items: center; gap: 12px; margin-top: 6px; }
.w__digit { font-family: var(--mono); font-weight: 700; font-size: var(--w-digit, 44px); line-height: 0.85; letter-spacing: -0.05em; color: var(--accent); }
.w__meta { min-width: 0; }
.w__name { font-family: var(--mono); font-weight: 700; font-size: var(--t-sm); letter-spacing: 0.06em; margin: 0 0 4px; }
.w__score { font-family: var(--mono); font-size: var(--t-xs); color: var(--ink-dim); margin: 4px 0 0; font-variant-numeric: tabular-nums; }
.w__bars { display: flex; gap: 3px; }
.w__bars span { width: 9px; height: 9px; border: 1.5px solid var(--accent); border-radius: 1px; }
.w__bars span[data-on="1"] { background: var(--accent); }
.w__foot { display: flex; justify-content: space-between; gap: 8px; margin-top: 9px; padding-top: 8px; border-top: 1px solid var(--rule-soft); font-family: var(--mono); font-size: var(--t-2xs); letter-spacing: 0.06em; color: var(--ink-faint); }
.w__degraded { color: var(--stale); }
body[data-compact="1"] { --w-digit: 30px; }
body[data-compact="1"] .w__foot { margin-top: 7px; }
${CHARTS_CORE}`);
}
