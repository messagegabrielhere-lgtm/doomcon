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
// Light is a full first-class theme, not an inverted afterthought. One accent
// (sodium amber) and it is spent only on live values and the active level -
// everything else is ink on paper. Amber over terminal green on purpose: green
// on black is what every competitor in the category already does badly.
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
  'ink-faint':   '#6a717b',
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
};

const LIGHT = {
  bg:            '#faf9f6',
  'bg-raised':   '#ffffff',
  'bg-sunken':   '#f1efe9',
  ink:           '#14161a',
  'ink-dim':     '#545a62',
  'ink-faint':   '#838a93',
  rule:          '#e0ddd5',
  'rule-soft':   '#eeebe4',
  accent:        '#9a5a00',
  'accent-ink':  '#ffffff',
  'accent-2':    '#0f6183',
  ok:            '#17714a',
  stale:         '#8a5a00',
  'dark-src':    '#b3261e',
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

const TOKENS = `
:root {
  color-scheme: dark light;

${palette(DARK)}

  --mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  --sans: 'Inter Tight', system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif;

  /* Type scale. Deliberately short - seven sizes plus the two display sizes
     that clamp. A page with eleven font sizes reads as an accident. */
  --t-2xs:  0.625rem;   /* 10 - chip labels, glyph captions, rail keys */
  --t-xs:   0.6875rem;  /* 11 - mono labels, eyebrows, chips */
  --t-sm:   0.8125rem;  /* 13 - secondary prose, captions */
  --t-base: 1rem;       /* 16 - body */
  --t-md:   1.0625rem;  /* 17 - lede, h3 */
  --t-lg:   1.25rem;    /* 20 - card numbers */
  --t-xl:   1.5rem;     /* 24 - h2 */

  /* Space scale, 4px-based. Every margin and gap on the site is one of these. */
  --s-1: 4px;  --s-2: 8px;  --s-3: 12px; --s-4: 16px;
  --s-5: 24px; --s-6: 32px; --s-7: 48px; --s-8: 64px;

  /* Section rhythm, as its own token rather than as --s-7/--s-8 read off the
     space scale. Measured at 375: the old 48px gap between sections cost 7
     gaps x 20px = 140px of a page a reader is scrolling THROUGH to find facts,
     and a terminal-style instrument page earns its authority from facts per
     screen. */
  --sec:    28px;
  --sec-lg: 38px;

  /* The measure. One token, overridden on <body data-wide> for the pages whose
     job is density rather than reading. */
  --wrap: 940px;

  --gutter: 16px;
  --measure: 66ch;
  --radius: 3px;
}

body[data-wide="1"] { --wrap: 1240px; }

${orgHues('', ORG_DARK)}

@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]) {
${palette(LIGHT, '    ')}
  }
${orgHues('  :root:not([data-theme="dark"]) ', ORG_LIGHT)}
}

/* Explicit overrides so the embed can be pinned to a theme by the host page
   regardless of the visitor's OS setting - a light blog embedding a black box
   looks broken, and they cannot restyle inside an iframe. */
:root[data-theme="light"] {
  color-scheme: light;
${palette(LIGHT)}
}
${orgHues(':root[data-theme="light"] ', ORG_LIGHT)}

:root[data-theme="dark"] {
  color-scheme: dark;
${palette(DARK)}
}
${orgHues(':root[data-theme="dark"] ', ORG_DARK)}
`;


const BASE = `
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; scroll-behavior: smooth; }
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

a { color: inherit; text-underline-offset: 3px; text-decoration-thickness: 1px; }
/* One focus ring for the whole document, and it is a RING plus an offset rather
   than a colour swap: on a page whose single accent is already spent on live
   values, a focused link that merely turns amber is indistinguishable from a
   live value. Two pixels of accent with two pixels of background behind it is
   legible on the dark ground, on the light ground, and on top of the one amber
   surface (the filled level cells). */
a:focus-visible, button:focus-visible, summary:focus-visible,
[tabindex]:focus-visible, details:focus-visible {
  outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 2px;
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
  border: 1px solid currentColor; border-radius: 2px; font-size: 9px; line-height: 10px;
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
  display: flex; align-items: baseline; gap: var(--s-2) var(--s-3);
  padding-top: 9px; padding-bottom: 8px; flex-wrap: wrap;
}
.wordmark {
  font-family: var(--mono); font-weight: 700; font-size: 15px;
  letter-spacing: 0.22em; text-decoration: none; color: var(--ink);
}
.wordmark:hover { color: var(--accent); }
.masthead__tag {
  font-size: var(--t-sm); color: var(--ink-faint); margin: 0;
  flex: 1 1 auto; min-width: 0;
}
/* Seven destinations, not five, because /race and /news exist and the homepage
   mentioned /race exactly once. On a phone the row wraps rather than scrolling:
   a horizontally scrolled nav hides half the publication behind a gesture
   nobody is told about, and the whole point of the addition is discovery. */
.nav { display: flex; gap: 3px var(--s-3); flex-wrap: wrap; margin-left: auto; }
.nav a {
  font-family: var(--mono); font-size: var(--t-xs); letter-spacing: 0.09em;
  text-transform: uppercase; color: var(--ink-dim); text-decoration: none;
  padding: 2px 0; border-bottom: 1px solid transparent;
  transition: color 120ms ease, border-color 120ms ease;
}
.nav a:hover { color: var(--ink); border-bottom-color: var(--accent); }
.nav a[aria-current="page"] { color: var(--ink); border-bottom-color: var(--accent); }

/* ---- the rail ---------------------------------------------------------- */
.rail {
  border-bottom: 1px solid var(--rule);
  background: var(--bg-sunken);
  position: relative; z-index: 10;
}
.rail__in {
  display: flex; flex-wrap: wrap; align-items: baseline;
  gap: 0; padding-top: 0; padding-bottom: 0;
}
/* On a phone the rail is ONE scrolling line, not five wrapped ones. Wrapped, it
   was 146px - 18% of an 812px fold - to say nine things that each fit in a
   thumb-width. A status bar that scrolls is the terminal idiom and it is what
   the cell rules are shaped for; the fade on the trailing edge is the only
   affordance it needs, and every cell in it is also stated somewhere below in
   full. STATUS is ordered first here because it is the one cell whose absence
   from view could mislead - and it is the one that says DEGRADED about us. */
@media (max-width: 679px) {
  .rail__in {
    flex-wrap: nowrap; overflow-x: auto; overscroll-behavior-x: contain;
    scrollbar-width: none; -ms-overflow-style: none;
    -webkit-mask-image: linear-gradient(to right, #000 86%, transparent);
    mask-image: linear-gradient(to right, #000 86%, transparent);
  }
  .rail__in::-webkit-scrollbar { display: none; }
  .rail__c { flex: 0 0 auto; }
  /* Re-establish the separator the desktop rules take off the posture cell,
     because at this width it is no longer the last item on the line - it is the
     first, and "OPERATIONALDELTA" is what happens without this. */
  .rail__in .rail__c--posture:last-child {
    order: -1; border-right: 1px solid var(--rule-soft);
    padding-right: var(--s-3); margin-right: var(--s-3);
  }
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
.rail__k {
  font-size: var(--t-2xs); letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--ink-faint);
}
.rail__v { color: var(--ink); font-weight: 500; }
.rail__v small { color: var(--ink-faint); font-weight: 400; font-size: var(--t-2xs); }
.rail__s { color: var(--ink-faint); font-size: var(--t-2xs); letter-spacing: 0.06em; }
.rail__c[data-bad="1"] .rail__v { color: var(--dark-src); }
a.rail__c { transition: color 120ms ease; }
a.rail__c:hover .rail__v { color: var(--accent); }
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
.delta__g { font-size: 8px; line-height: 1; }
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
.foot {
  border-top: 1px solid var(--rule); margin-top: var(--s-7);
  padding: var(--s-5) 0 var(--s-6); color: var(--ink-faint); font-size: 12.5px;
}
.foot__top { display: grid; gap: var(--s-5); }
@media (min-width: 760px) {
  .foot__top { grid-template-columns: minmax(0, 260px) minmax(0, 1fr); gap: var(--s-6); }
}
.foot__mark {
  font-family: var(--mono); font-weight: 700; font-size: 13px;
  letter-spacing: 0.22em; color: var(--ink); display: block;
}
.foot__creed { margin: 5px 0 var(--s-2); color: var(--ink-dim); font-size: var(--t-sm); }
.foot__dis { margin: 0; max-width: 42ch; }
.foot__cols { display: grid; gap: var(--s-4) var(--s-5); grid-template-columns: 1fr; }
@media (min-width: 520px) { .foot__cols { grid-template-columns: 1fr 1fr; } }
@media (min-width: 980px) { .foot__cols { grid-template-columns: 1.15fr 1fr 1fr; } }
.foot__h {
  font-family: var(--mono); font-size: var(--t-2xs); letter-spacing: 0.16em;
  text-transform: uppercase; color: var(--ink-faint); font-weight: 500;
  margin: 0 0 var(--s-2); padding-bottom: 5px; border-bottom: 1px solid var(--rule);
}
.foot__list { list-style: none; margin: 0; padding: 0; display: grid; gap: 7px; }
.foot__list li { display: grid; gap: 1px; }
.foot__list a {
  font-family: var(--mono); font-size: var(--t-xs); letter-spacing: 0.07em;
  text-transform: uppercase; color: var(--ink); text-decoration: none;
  justify-self: start; border-bottom: 1px solid transparent;
}
.foot__list a:hover { border-bottom-color: var(--accent); }
.foot__list a[aria-current="page"] { color: var(--accent); }
.foot__list span { color: var(--ink-faint); font-size: 12px; line-height: 1.4; }
/* On a phone the site index is 12 links in one column, and twelve descriptions
   under them turned the footer into 988px. The descriptions are what make the
   PAGES tempting rather than merely listed, so they survive in the first
   column; an API endpoint and a repo link do not need selling to the reader who
   scrolled this far. */
@media (max-width: 519px) {
  .foot__col:nth-child(n+2) .foot__list span { display: none; }
  .foot__col:nth-child(n+2) .foot__list { gap: var(--s-2); }
}
.foot__fine {
  margin: var(--s-5) 0 0; padding-top: var(--s-3); border-top: 1px solid var(--rule-soft);
  max-width: 96ch; line-height: 1.55;
}
.foot__fine code { font-size: 11.5px; color: var(--ink-dim); }
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
  font-size: clamp(5.5rem, 31vw, 9.5rem);
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
  font-size: clamp(1.05rem, 5.2vw, 1.55rem);
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
  font-size: clamp(2.75rem, 13.5vw, 3.75rem); line-height: 1;
  letter-spacing: -0.035em; color: var(--ink);
}
.score__of { font-family: var(--mono); font-size: var(--t-sm); color: var(--ink-faint); }
.score__dir {
  font-family: var(--mono); font-size: 12.5px; color: var(--ink-dim);
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
  font-family: var(--mono); font-size: 10px; color: var(--ink-faint); letter-spacing: 0.08em;
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
  font-size: 12.5px; color: var(--ink-faint); margin: 5px 0 0; max-width: var(--measure);
}
`;

// ---------------------------------------------------------------------------
// Charts. Paint only - every coordinate lives in site/templates/_charts.mjs.
// Keeping colour here rather than in SVG presentation attributes is what lets
// one stylesheet theme every chart for light and dark with no re-render, and
// what keeps the chart kit itself free of any colour knowledge.
// ---------------------------------------------------------------------------
const CHARTS_CORE = `
.ch { margin: 0; padding: 0; }
/* --w is set per chart by _charts.mjs to its own viewBox width, so a chart is
   never UPSCALED past the size its type was designed at. */
.ch__svg { display: block; width: 100%; max-width: var(--w, 100%); height: auto; }
.ch__cap {
  font-family: var(--mono); font-size: var(--t-xs); line-height: 1.5;
  color: var(--ink-faint); margin: var(--s-2) 0 0; letter-spacing: 0.01em;
}
.ch text, .spark text {
  font-family: var(--mono); fill: var(--ink-dim); font-variant-numeric: tabular-nums;
}
/* Status messages knock out whatever they sit on: an empty history chart still
   draws its five band labels, and "No scored observations yet" landed straight
   on top of "ROUTINE". */
.ch-note { fill: var(--ink-dim); stroke: var(--bg); stroke-width: 3.5; paint-order: stroke fill; }
.ch-note--dim { fill: var(--ink-faint); }

/* sparkline() - pillar cards */
.spark { display: block; }
.spark__area { fill: var(--fill); }
.spark__line { fill: none; stroke: var(--accent); stroke-width: 1.6; stroke-linejoin: round; stroke-linecap: round; }
.spark__base { stroke: var(--rule); stroke-width: 1; }
.spark__ref  { stroke: var(--ink-faint); stroke-width: 1; }
.spark__reflabel { fill: var(--ink-faint); }
.spark__ring { fill: var(--bg-raised); stroke: var(--accent); stroke-width: 1.4; }
.spark__dot  { fill: var(--accent); }
/* font-size here, not only as an SVG attribute: _parts.sparkline (the older
   inline sparkline this kit replaces) sets no size and relies on the rule. */
.spark__empty { fill: var(--ink-faint); font-size: 10px; }

/* gauge() - the hero score as a bounded arc. The live segment is six units
   thicker than the rest (14 -> 20; GAUGE.liveSw in _charts.mjs must match this
   number, because the tick radius is computed from it), so which band we sit in
   survives greyscale. */
.ch-g-seg { fill: none; stroke: var(--rule); stroke-width: 14; }
.ch-g-seg--live { stroke: var(--accent); stroke-width: 20; }
.ch-g-tick { stroke: var(--rule); stroke-width: 1; }
.ch-g-ticklabel { fill: var(--ink-faint); }
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
.ch-ax { fill: var(--ink-faint); letter-spacing: 0.04em; }
/* A fat background-coloured stroke under the line, so the series stays readable
   where it crosses a band label without having to place labels defensively. */
.ch-halo { fill: none; stroke: var(--bg); stroke-width: 4.5; stroke-linejoin: round; stroke-linecap: round; }
.ch-line { fill: none; stroke: var(--accent); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
.ch-dot { fill: var(--accent); }
.ch-ring { fill: var(--bg); stroke: var(--accent); stroke-width: 1.5; }
.ch-val { fill: var(--ink); font-weight: 700; stroke: var(--bg); stroke-width: 3.5; paint-order: stroke fill; }
.ch-guide { stroke: var(--accent); stroke-width: 1; stroke-dasharray: 3 4; }
.ch-lvmark { stroke: var(--ink-faint); stroke-width: 1; stroke-dasharray: 2 4; }
.ch-lvtext { fill: var(--ink-dim); }

/* pillarRanked() */
.ch-r-track { fill: var(--wash-alt); }
.ch-r-bar { fill: var(--accent); }
.ch-r-cap { stroke: var(--ink); stroke-width: 1.5; }
.ch-r-none { fill: none; stroke: var(--ink-faint); stroke-width: 1; stroke-dasharray: 3 3; }
.ch-r-nonet { fill: var(--ink-faint); letter-spacing: 0.05em; }
.ch-r-name { fill: var(--ink); font-family: var(--sans); font-weight: 600; letter-spacing: -0.005em; }
.ch-r-glyph { fill: var(--ink-dim); }
.ch-r-val { fill: var(--ink); font-weight: 700; }
.ch-r-val--none { fill: var(--ink-faint); font-weight: 400; }
.ch-r-ref { stroke: var(--ink-faint); stroke-width: 1; stroke-dasharray: 2 4; }
.ch-r-reflabel { fill: var(--ink-faint); letter-spacing: 0.06em; }

/* distributionStrip() */
.ch-d-rest { fill: var(--wash); }
.ch-d-fill { fill: var(--fill); }
.ch-d-curve { fill: none; stroke: var(--ink-dim); stroke-width: 1.25; }
.ch-d-base { stroke: var(--rule); stroke-width: 1; }
.ch-d-tick { stroke: var(--ink-faint); stroke-width: 1; }
.ch-d-marker { stroke: var(--ink); stroke-width: 2; }
.ch-d-caret { fill: var(--ink); }
.ch-d-val { fill: var(--ink); font-weight: 700; stroke: var(--bg); stroke-width: 3; paint-order: stroke fill; }
.ch-d-ax { fill: var(--ink-faint); letter-spacing: 0.12em; }
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
  padding: 3px 6px; background: var(--bg-raised); color: var(--ink-dim);
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
.chip__dot { font-size: 10px; line-height: 1; }
.chip[data-status="ok"]    .chip__dot { color: var(--ok); }
.chip[data-status="stale"] .chip__dot { color: var(--stale); }
.chip[data-status="dark"]  .chip__dot { color: var(--dark-src); }
.chip[data-status="uncal"] .chip__dot { color: var(--ink-faint); }
/* Border STYLE, not border colour, is the second signal: dashed = dark,
   dotted = awaiting a baseline. Those are different states and a greyscale
   screenshot has to keep them apart. */
.chip[data-status="dark"]  { border-style: dashed; }
.chip[data-status="uncal"] { border-style: dotted; }
.fresh__key { font-size: 11.5px; color: var(--ink-faint); margin: var(--s-2) 0 0; font-family: var(--mono); line-height: 1.55; }
/* The legend restates the three source states as counts, right where the chips
   are, so a reader matches glyph to word without a paragraph in between. The
   states are still named separately and still never merged - they are shorter. */
.fresh__legend {
  display: flex; flex-wrap: wrap; gap: 4px var(--s-4);
  padding-bottom: 5px; margin-bottom: 5px; border-bottom: 1px solid var(--rule-soft);
}
.fresh__lg { display: inline-flex; align-items: baseline; gap: 4px; color: var(--ink-dim); white-space: nowrap; }
.fresh__lg i { font-style: normal; font-size: 9px; line-height: 1; }
.fresh__lg[data-status="ok"] i { color: var(--ok); }
.fresh__lg[data-status="stale"] i { color: var(--stale); }
.fresh__lg[data-status="dark"] i { color: var(--dark-src); }
.fresh__lg[data-status="uncal"] i { color: var(--ink-faint); }

/* Chip variants for the feed and the reel. Every source-kind chip carries a
   letter or a shape in a boxed badge, so it is identifiable without colour and
   at screenshot scale. */
.chip--sm { font-size: 10px; padding: 2px 5px; gap: 4px; }
.chip--quiet { background: transparent; color: var(--ink-faint); }
.chip--accent { border-color: var(--accent); color: var(--ink); }
.chip--solid { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); font-weight: 700; }
.chip--x::before, .chip--kalshi::before, .chip--polymarket::before,
.chip--manifold::before, .chip--news::before, .chip--paper::before,
.chip--gov::before, .chip--code::before {
  display: inline-flex; align-items: center; justify-content: center;
  width: 13px; height: 13px; flex: 0 0 13px;
  border: 1px solid currentColor; border-radius: 2px;
  font-size: 8.5px; font-weight: 700; line-height: 1;
}
.chip--x::before          { content: 'X'; }
.chip--kalshi::before     { content: 'K'; }
.chip--polymarket::before { content: 'P'; }
.chip--manifold::before   { content: 'M'; }
.chip--news::before       { content: 'N'; }
.chip--paper::before      { content: '\\25b2'; border: 0; font-size: 10px; }
.chip--gov::before        { content: '\\25c6'; border: 0; font-size: 10px; }
.chip--code::before       { content: '\\25a0'; border: 0; font-size: 10px; }

/* Pillar attribution, wherever a feed item or reel card is assigned to a
   pillar. The glyphs match PILLAR_GLYPH in _charts.mjs on purpose: the same
   shape means the same pillar on the ranked chart and in the feed. */
.pillar-tag {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: var(--mono); font-size: 10px; letter-spacing: 0.09em; text-transform: uppercase;
  color: var(--ink-dim); border: 1px solid var(--rule); border-radius: 2px;
  padding: 1px 5px 1px 4px; white-space: nowrap; text-decoration: none;
}
.pillar-tag::before { font-size: 9px; line-height: 1; color: var(--ink-faint); }
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
  border-inline-start: 2px solid var(--accent);
  padding-inline-start: var(--s-2);
}

/* The inline badge, for a section heading: "12 new · 1h". */
.newbadge {
  display: inline-flex; align-items: baseline; gap: 5px;
  font-family: var(--mono); font-size: var(--t-2xs); letter-spacing: 0.06em;
  border: 1px solid var(--accent); border-radius: 2px; padding: 1px 5px;
  color: var(--ink-dim); white-space: nowrap; vertical-align: middle;
  /* .sec__h is a flex row terminated by a hairline rule, which is exactly where
     a section's count belongs. Without this the badge is a shrinkable flex item
     and the rule eats it. */
  flex: 0 0 auto;
}
.newbadge__n { font-size: var(--t-xs); font-weight: 700; color: var(--accent); }
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
  border: 1px solid var(--rule); border-left: 2px solid var(--accent);
  border-radius: var(--radius); background: var(--bg-raised);
  padding: var(--s-3) 13px;
}
@media (min-width: 760px) {
  .npulse { grid-template-columns: minmax(0, 190px) minmax(0, 1fr); align-items: start; }
  .npulse__note { grid-column: 1 / -1; }
}
.npulse[data-zero="1"] { border-left-color: var(--rule); }
.npulse[data-partial="1"] { border-left-style: dotted; }
.npulse__lead { display: flex; align-items: baseline; gap: var(--s-2); min-width: 0; }
.npulse__n {
  font-family: var(--mono); font-weight: 700; font-size: 2.25rem; line-height: 0.95;
  letter-spacing: -0.035em; color: var(--accent);
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
  font-family: var(--mono); font-size: var(--t-md); font-weight: 700; color: var(--ink);
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
.nsrc__bar i { display: block; height: 100%; background: var(--accent); border-radius: 1px; }
.nsrc__v { font-weight: 700; color: var(--ink); white-space: nowrap; }
.nsrc__of { font-weight: 400; color: var(--ink-faint); font-size: var(--t-2xs); margin-left: 2px; }
.nsrc[data-zero="1"] { color: var(--ink-faint); }
.nsrc[data-zero="1"] .nsrc__n, .nsrc[data-zero="1"] .nsrc__v { color: var(--ink-faint); }
.nsrc[data-zero="1"] .nsrc__bar i { background: var(--rule); }
`;

const REEL = `
/* Horizontally snapping card rail. No JS: scroll-snap and overflow do the whole
   job, so it works with the keyboard, works in a screenshot, and cannot break
   during hydration because there is no hydration.

   The card interior (.rcard*) is shipped by _reel.mjs's own styleTag; only the
   rail mechanics live here, because only the rail interacts with the page
   gutter. The .reel__card/.reel__kicker/.reel__num rules that used to sit in
   this block were emitted by nothing at all and have been cut. */
.reel { margin: 0 calc(var(--gutter) * -1); padding: 0; }
.reel__hint {
  font-family: var(--mono); font-size: var(--t-2xs); letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--ink-faint); margin: 0 0 var(--s-2); padding: 0 var(--gutter);
}
.reel__rail {
  display: flex; gap: 10px; list-style: none; margin: 0;
  padding: 2px var(--gutter) var(--s-3);
  overflow-x: auto; overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory; scroll-padding-left: var(--gutter);
  scrollbar-width: thin; scrollbar-color: var(--rule) transparent;
}
.reel__rail::-webkit-scrollbar { height: 6px; }
.reel__rail::-webkit-scrollbar-thumb { background: var(--rule); border-radius: 3px; }
/* Sizing and snapping live on the RAIL'S DIRECT CHILD, whatever that is. Both
   <a class="reel__card"> straight in the rail and <li><a> are natural markup,
   and in the second shape the <li> is the flex item - so putting flex-basis on
   the inner element let the <li> shrink to max-content and the three cards
   collapsed into a 99px-wide column with no horizontal scroll at all. Measured,
   not guessed. */
.reel__rail > * {
  flex: 0 0 79%; max-width: 300px; min-width: 0;
  scroll-snap-align: start; display: flex;
}
@media (min-width: 620px) { .reel__rail > * { flex-basis: 268px; } }
`;

const PILLARS = `
/* One row on a phone, two at 620, three at 900, five once the wide measure is
   in play - so on a 1440px dashboard the five pillars are ONE screen-row and
   the reader compares them by scanning rather than by scrolling. That is the
   whole argument for the section. */
.pillars { display: grid; gap: 1px; background: var(--rule); border: 1px solid var(--rule); border-radius: var(--radius); overflow: hidden; }
@media (min-width: 620px) { .pillars { grid-template-columns: 1fr 1fr; } }
@media (min-width: 900px) { .pillars { grid-template-columns: 1fr 1fr 1fr; } }
@media (min-width: 1140px) { .pillars { grid-template-columns: repeat(5, 1fr); } }

.pillar { background: var(--bg-raised); padding: 11px 12px 10px; display: flex; flex-direction: column; gap: 5px; }
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
  border: 1px dashed currentColor; border-radius: 2px; padding: 3px 6px; align-self: flex-start;
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
  display: grid; gap: 2px 14px; padding: 8px 2px; text-decoration: none; color: inherit;
  grid-template-columns: auto 1fr auto; align-items: baseline;
  transition: background-color 120ms ease;
}
.move__a:hover { background: var(--bg-raised); }
.move__time { font-family: var(--mono); font-size: var(--t-xs); color: var(--ink-faint); grid-column: 1; }
.move__what { font-size: var(--t-sm); grid-column: 1 / -1; }
@media (min-width: 560px) { .move__what { grid-column: 2; } }
/* The loudest live pillar at that observation, off the receipt. The row used to
   say only THAT the number moved; this says which part of the field moved it. */
.move__lead {
  font-family: var(--mono); font-size: var(--t-2xs); letter-spacing: 0.06em;
  color: var(--ink-faint); margin-left: var(--s-2); white-space: nowrap;
}
.move__delta { font-family: var(--mono); font-size: var(--t-sm); font-weight: 700; grid-column: 3; grid-row: 1; text-align: right; }
.move__delta[data-dir="up"]::before   { content: '\\25b2 '; font-size: 8px; color: var(--accent); }
.move__delta[data-dir="down"]::before { content: '\\25bc '; font-size: 8px; color: var(--ink-dim); }
.move__delta[data-dir="flat"]::before { content: '\\25c6 '; font-size: 8px; color: var(--ink-faint); }
.move[data-changed="1"] { background: var(--wash-alt); }
.move__tag {
  font-family: var(--mono); font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase;
  border: 1px solid var(--accent); color: var(--accent); border-radius: 2px; padding: 1px 5px; margin-left: var(--s-2);
}

.movehead { display: grid; gap: var(--s-4); margin-bottom: var(--s-2); }
.movehead__nums { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; font-family: var(--mono); }
.movehead__from, .movehead__to { font-size: 2rem; font-weight: 700; letter-spacing: -0.03em; }
.movehead__from { color: var(--ink-faint); }
.movehead__to { color: var(--ink); }
.movehead__arrow { color: var(--ink-faint); font-size: 1.25rem; }
.movehead__delta { font-size: 1rem; font-weight: 700; color: var(--accent); }

.kv { border-top: 1px solid var(--rule); margin: var(--s-5) 0 0; }
.kv__row { display: grid; grid-template-columns: 1fr; gap: 0 18px; border-bottom: 1px solid var(--rule); padding: 9px 0; }
@media (min-width: 560px) { .kv__row { grid-template-columns: 180px 1fr; } }
.kv__k { font-family: var(--mono); font-size: var(--t-xs); letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-faint); }
.kv__v { font-size: 14px; overflow-wrap: anywhere; }
.kv__v .num, .kv__v code { font-size: 12.5px; }

.srcs { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.srcs li { display: flex; gap: var(--s-2); align-items: baseline; font-size: var(--t-sm); flex-wrap: wrap; }
.srcs .num { font-family: var(--mono); font-size: 12.5px; color: var(--ink-dim); }
.hash { font-family: var(--mono); font-size: 11.5px; color: var(--ink-dim); overflow-wrap: anywhere; display: block; }
`;

const PROSE = `
.prose { max-width: var(--measure); font-size: var(--t-base); }
.prose > h1 { font-size: clamp(1.7rem, 7vw, 2.3rem); margin: 0 0 14px; letter-spacing: -0.025em; }
.prose > h2 { font-size: var(--t-xl); margin: var(--sec-lg) 0 9px; letter-spacing: -0.02em; }
.prose > h3 { font-size: var(--t-md); margin: var(--s-4) 0 var(--s-2); }
.prose > h4 { font-size: 0.95rem; margin: var(--s-4) 0 6px; color: var(--ink-dim); }
.prose ul, .prose ol { margin: 0 0 1em; padding-left: 1.25em; }
.prose li { margin: 0 0 0.4em; }
.prose blockquote {
  margin: 1.2em 0; padding: 2px 0 2px var(--s-4);
  border-left: 2px solid var(--rule); color: var(--ink-dim);
}
.prose pre {
  background: var(--bg-sunken); border: 1px solid var(--rule); border-radius: var(--radius);
  padding: var(--s-3) 14px; overflow-x: auto; font-size: 12.5px; line-height: 1.5; margin: 0 0 1.2em;
}
.prose :not(pre) > code {
  background: var(--bg-raised); border: 1px solid var(--rule); border-radius: 2px;
  padding: 1px 4px; font-size: 0.87em;
}
.prose table { width: 100%; border-collapse: collapse; margin: 0 0 1.4em; font-size: 13.5px; display: block; overflow-x: auto; }
.prose th, .prose td { text-align: left; padding: 7px 10px 7px 0; border-bottom: 1px solid var(--rule); vertical-align: top; }
.prose th { font-family: var(--mono); font-size: var(--t-xs); letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-faint); font-weight: 500; }
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
.lede { font-size: var(--t-md); color: var(--ink-dim); max-width: var(--measure); margin: 0 0 var(--s-3); }
.sec .lede { font-size: var(--t-sm); line-height: 1.5; margin-bottom: var(--s-2); }

/* history.html timeline - a rule with dated entries, each with a real source. */
.tl { list-style: none; margin: 0; padding: 0; border-left: 1px solid var(--rule); }
.tl__item { position: relative; padding: 0 0 var(--s-5) 20px; }
.tl__item::before {
  content: ''; position: absolute; left: -4px; top: var(--s-2);
  width: 7px; height: 7px; border-radius: 50%; background: var(--accent);
}
.tl__date { font-family: var(--mono); font-size: 11.5px; letter-spacing: 0.08em; color: var(--accent); display: block; margin-bottom: 3px; }
.tl__h { font-size: 1.02rem; margin: 0 0 5px; }
.tl__b { font-size: 14.5px; color: var(--ink-dim); margin: 0 0 6px; max-width: var(--measure); }
.tl__src { font-family: var(--mono); font-size: 11.5px; }
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
  font-family: var(--mono); font-size: var(--t-xs); letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--ink-faint); margin: 0 0 var(--s-2); font-weight: 500;
}
.sec__h::after { content: ''; flex: 1 1 auto; height: 1px; background: var(--rule); }

/* The embed snippet box on the dashboard - the moat is only a moat if people
   can find the copy-paste line without reading docs. */
.snippet {
  background: var(--bg-sunken); border: 1px solid var(--rule); border-radius: var(--radius);
  padding: 11px 13px; font-family: var(--mono); font-size: 11.5px; line-height: 1.5;
  overflow-x: auto; white-space: pre; color: var(--ink-dim); margin: 0 0 10px;
}
.apilist { list-style: none; margin: 0; padding: 0; display: grid; gap: 7px; }
.apilist code { font-size: 12px; }
.apilist span { color: var(--ink-faint); font-size: 12.5px; }
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
  flex: 0 0 auto; color: var(--avt-a, var(--accent));
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
.avt--sm .avt__i { font-size: 8px; }
.avt--md .avt__i { font-size: 10px; }
.avt--lg .avt__i { font-size: 13px; }
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
.avtrow--lg .avtrow__n { font-size: var(--t-md); font-weight: 700; letter-spacing: 0; }
.avtrow--lg .avtrow__r { font-size: var(--t-xs); }
a.avtrow:hover .avtrow__n { color: var(--avt-a, var(--accent)); }
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
  content: ''; position: absolute; left: 0; right: 0; top: 0; height: 2px;
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
   possible way to make eleven identical headings look composed. */
.sec__h::after { background: linear-gradient(90deg, var(--rule), transparent); }
`;

/**
 * Strip block comments and the blank lines they leave behind.
 *
 * This sheet is inlined into EVERY page, so every byte of reasoning above is
 * paid for on every request, by every reader, forever. The reasoning still
 * matters and still lives in this file - it just does not need to travel. The
 * repo is public and linked from the footer, so nothing is hidden by this.
 *
 * Measured on the v5 sheet, 2026-09-24: 62.4 KB -> 45.9 KB raw, 8.8 KB
 * gzipped. Against the sheet this pass started from that is +4.4 KB raw for the
 * heat ramp, the cool accent, the eight per-lab hues and the avatar paint, less
 * the .layout-split and .wrap--wide rules that were emitting for nobody and the
 * .oven block that was emitting over somebody. (The 35.7/29.1 figures this
 * comment carried before were three component blocks out of date; a measurement
 * with no date on it goes stale exactly like a source does, which is the joke
 * this whole repo is built on.) Safe because no
 * declaration in this file contains the sequence slash-star - the 'content'
 * values are all escaped code points.
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
  padding: 10px 12px 11px;
  background: var(--bg-raised);
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  text-decoration: none; color: inherit;
  transition: border-color 120ms ease, background-color 120ms ease, transform 120ms ease;
}
.xsell__a:hover { border-color: var(--accent); background: var(--bg-sunken); }
.xsell__a::after {
  content: '\\2192'; position: absolute; top: 9px; right: 10px;
  font-family: var(--mono); font-size: var(--t-xs); color: var(--ink-faint);
  transition: color 120ms ease, transform 120ms ease;
}
.xsell__a:hover::after { color: var(--accent); }
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
  color: var(--accent); font-variant-numeric: tabular-nums;
}
.xsell__s { font-size: var(--t-xs); color: var(--ink-dim); line-height: 1.4; }
`;

const PLAIN = `
/* The plain-language read. Deliberately the only sentence in the hero set in
   the prose face rather than the mono — it is addressed to someone who does not
   read dashboards, and it should not look like telemetry. */
.level__plain {
  font-size: var(--t-sm); line-height: 1.5; color: var(--ink-dim);
  max-width: 46ch; margin: var(--s-2) 0 0;
  border-left: 2px solid var(--rule); padding-left: 10px;
}
`;

const OPS = `
/* ---------------------------------------------------------------------------
   THE OPERATIONS STRIP — .ops, emitted by layout.mjs's opsStrip().

   This block carried the clock's colour and nothing that gave the strip a
   layout, so it was rendering RAW on the homepage fold: 16px Inter, no
   separators, wrapped to three lines, reading
   "03:30:32Z+3:25:4314/14 REPORTING5 SCORED15 FEEDS200 ITEMSSTATUS:
   OPERATIONAL". Found by looking at the built page at 375px, not by reading the
   file — .ops is emitted by a template this module does not import, so nothing
   in the repo could have pointed at it.

   Painted as the rail's quieter sibling and deliberately not as its equal: the
   same hairline-separated mono cells, one size smaller, in dimmer ink, so two
   counter strips stacked above the fold read as a panel and its caption rather
   than as the same announcement made twice. (That they restate each other at
   all is a markup question for layout.mjs, not a paint question — it is in the
   integration note.)
   --------------------------------------------------------------------------- */
.ops {
  border-bottom: 1px solid var(--rule);
  background: var(--bg-sunken);
  position: relative; z-index: 10;
}
.ops__in {
  display: flex; align-items: baseline; flex-wrap: wrap;
  gap: 0; padding-top: 0; padding-bottom: 0;
}
/* The same treatment the rail gets at phone width, for the same measured
   reason: wrapped, these eight cells spend three lines of an 812px fold saying
   eight things that each fit in a thumb-width. Scrolled, they spend one, and
   the fade on the trailing edge is the only affordance a terminal-style status
   bar has ever needed. */
@media (max-width: 679px) {
  .ops__in {
    flex-wrap: nowrap; overflow-x: auto; overscroll-behavior-x: contain;
    scrollbar-width: none; -ms-overflow-style: none;
    -webkit-mask-image: linear-gradient(to right, #000 88%, transparent);
    mask-image: linear-gradient(to right, #000 88%, transparent);
  }
  .ops__in::-webkit-scrollbar { display: none; }
  .ops__c { flex: 0 0 auto; }
}
.ops__c {
  display: inline-flex; align-items: baseline; gap: 4px;
  padding: 4px var(--s-3) 4px 0; margin-right: var(--s-3);
  border-right: 1px solid var(--rule-soft);
  font-family: var(--mono); font-size: var(--t-2xs);
  letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--ink-faint); white-space: nowrap;
}
.ops__c:last-child { border-right: 0; margin-right: 0; padding-right: 0; }
/* STATUS is the last cell opsStrip() writes and it is the one cell that can say
   DEGRADED about us, so it gets a hue — on top of the word, never instead of
   it. If that emitter ever appends a cell after STATUS, this is the selector
   that needs revisiting. */
.ops[data-posture="operational"] .ops__c:last-child { color: var(--ok); }
.ops[data-posture="degraded"] .ops__c:last-child { color: var(--stale); }

/* The clock moves every second — the only thing on the page that does. Tabular
   figures, or the strip reflows once a second and reads as broken. */
.ops__clk { color: var(--accent); font-variant-numeric: tabular-nums; letter-spacing: 0.06em; }
.ops__c[data-dc-age] { font-variant-numeric: tabular-nums; }

/* The epithet sits between the level name and the gloss: two to four words with
   a point of view, where the name above it is the measurement. The counters
   that used to live in this block are now the rail, in CHROME. */
.level__ep {
  font-family: var(--mono);
  font-size: var(--t-xs);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
  margin: 2px 0 var(--s-2);
}
`;

export function css() {
  return lean([
    TOKENS, BASE, CHROME, OPS, PLAIN, HERO,
    CHARTS_CORE, CHARTS,
    FRESH, ARRIVE, REEL, PILLARS, MOVES, XSELL, PROSE,
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
    AVATARS, CHROMA,
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
.w:hover { border-color: var(--accent); }
.w__top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.w__brand { font-family: var(--mono); font-size: 10px; font-weight: 700; letter-spacing: 0.2em; color: var(--ink-faint); }
.w__main { display: flex; align-items: center; gap: 12px; margin-top: 6px; }
.w__digit { font-family: var(--mono); font-weight: 700; font-size: 44px; line-height: 0.85; letter-spacing: -0.05em; color: var(--accent); }
.w__meta { min-width: 0; }
.w__name { font-family: var(--mono); font-weight: 700; font-size: 13px; letter-spacing: 0.06em; margin: 0 0 4px; }
.w__score { font-family: var(--mono); font-size: 11.5px; color: var(--ink-dim); margin: 4px 0 0; font-variant-numeric: tabular-nums; }
.w__bars { display: flex; gap: 3px; }
.w__bars span { width: 9px; height: 9px; border: 1.5px solid var(--accent); border-radius: 1px; }
.w__bars span[data-on="1"] { background: var(--accent); }
.w__foot { display: flex; justify-content: space-between; gap: 8px; margin-top: 9px; padding-top: 8px; border-top: 1px solid var(--rule-soft); font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.06em; color: var(--ink-faint); }
.w__degraded { color: var(--stale); }
body[data-compact="1"] .w__digit { font-size: 30px; }
body[data-compact="1"] .w__foot { margin-top: 7px; }
${CHARTS_CORE}`);
}
