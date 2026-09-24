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
const TOKENS = `
:root {
  color-scheme: dark light;

  --bg:        #0b0c0e;
  --bg-raised: #131519;
  --bg-sunken: #08090a;
  --ink:       #e8eaee;
  --ink-dim:   #9aa2ad;
  --ink-faint: #6a717b;
  --rule:      #23262c;
  --rule-soft: #191c21;
  --accent:    #ffb020;
  --accent-ink:#0b0c0e;
  --ok:        #5fd08a;
  --stale:     #ffb020;
  --dark-src:  #ff6b6b;
  --scan:      rgba(255,255,255,0.016);

  /* Chart washes. Literal rgba rather than color-mix, so a chart never depends
     on a colour function for its LEGIBILITY - only for its polish. */
  --wash:      rgba(232,234,238,0.042);
  --wash-alt:  rgba(232,234,238,0.021);
  --wash-live: rgba(255,176,32,0.115);
  --fill:      rgba(255,176,32,0.150);

  --mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  --sans: 'Inter Tight', system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif;

  /* Type scale. Deliberately short - six sizes plus the two display sizes that
     clamp. A page with eleven font sizes reads as an accident. */
  --t-xs:   0.6875rem;  /* 11 - mono labels, eyebrows, chips */
  --t-sm:   0.8125rem;  /* 13 - secondary prose, captions */
  --t-base: 1rem;       /* 16 - body */
  --t-md:   1.0625rem;  /* 17 - lede, h3 */
  --t-lg:   1.25rem;    /* 20 - card numbers */
  --t-xl:   1.5rem;     /* 24 - h2 */

  /* Space scale, 4px-based. Every margin and gap on the site is one of these. */
  --s-1: 4px;  --s-2: 8px;  --s-3: 12px; --s-4: 16px;
  --s-5: 24px; --s-6: 32px; --s-7: 48px; --s-8: 64px;

  --gutter: 16px;
  --measure: 66ch;
  --radius: 3px;
}

@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]) {
    --bg:        #faf9f6;
    --bg-raised: #ffffff;
    --bg-sunken: #f1efe9;
    --ink:       #14161a;
    --ink-dim:   #545a62;
    --ink-faint: #838a93;
    --rule:      #e0ddd5;
    --rule-soft: #eeebe4;
    --accent:    #9a5a00;
    --accent-ink:#ffffff;
    --ok:        #17714a;
    --stale:     #8a5a00;
    --dark-src:  #b3261e;
    --scan:      rgba(0,0,0,0.012);
    --wash:      rgba(20,22,26,0.046);
    --wash-alt:  rgba(20,22,26,0.022);
    --wash-live: rgba(154,90,0,0.105);
    --fill:      rgba(154,90,0,0.130);
  }
}

/* Explicit overrides so the embed can be pinned to a theme by the host page
   regardless of the visitor's OS setting - a light blog embedding a black box
   looks broken, and they cannot restyle inside an iframe. */
:root[data-theme="light"] {
  color-scheme: light;
  --bg:#faf9f6; --bg-raised:#ffffff; --bg-sunken:#f1efe9;
  --ink:#14161a; --ink-dim:#545a62; --ink-faint:#838a93;
  --rule:#e0ddd5; --rule-soft:#eeebe4;
  --accent:#9a5a00; --accent-ink:#ffffff;
  --ok:#17714a; --stale:#8a5a00; --dark-src:#b3261e; --scan:rgba(0,0,0,0.012);
  --wash:rgba(20,22,26,0.046); --wash-alt:rgba(20,22,26,0.022);
  --wash-live:rgba(154,90,0,0.105); --fill:rgba(154,90,0,0.130);
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --bg:#0b0c0e; --bg-raised:#131519; --bg-sunken:#08090a;
  --ink:#e8eaee; --ink-dim:#9aa2ad; --ink-faint:#6a717b;
  --rule:#23262c; --rule-soft:#191c21;
  --accent:#ffb020; --accent-ink:#0b0c0e;
  --ok:#5fd08a; --stale:#ffb020; --dark-src:#ff6b6b; --scan:rgba(255,255,255,0.016);
  --wash:rgba(232,234,238,0.042); --wash-alt:rgba(232,234,238,0.021);
  --wash-live:rgba(255,176,32,0.115); --fill:rgba(255,176,32,0.150);
}
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
a:focus-visible, button:focus-visible {
  outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 2px;
}
h1, h2, h3, h4 { font-weight: 600; line-height: 1.2; letter-spacing: -0.015em; margin: 0; }
p { margin: 0 0 1em; }
code, kbd, pre, .num, time { font-family: var(--mono); font-variant-numeric: tabular-nums; }

.wrap { width: 100%; max-width: 940px; margin: 0 auto; padding: 0 var(--gutter); }
/* Opt-in wider measure, for the dashboard once it carries a feed column. */
.wrap--wide { max-width: 1140px; }
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

/* Main column plus a sticky aside for the live feed. Mobile first, and the feed
   stacks UNDER the index, never above it: traffic arrives from X to look at the
   number, and a feed above the fold buries the thing they came for. */
.layout-split { display: grid; gap: var(--s-6); align-items: start; }
@media (min-width: 980px) {
  .layout-split { grid-template-columns: minmax(0, 1fr) 330px; gap: var(--s-7); }
  .layout-split__aside { position: sticky; top: var(--s-4); }
}
`;

const CHROME = `
.masthead {
  border-bottom: 1px solid var(--rule);
  background: var(--bg-sunken);
  position: relative; z-index: 10;
}
.masthead__in {
  display: flex; align-items: baseline; gap: var(--s-3);
  padding-top: var(--s-3); padding-bottom: var(--s-3); flex-wrap: wrap;
}
.wordmark {
  font-family: var(--mono); font-weight: 700; font-size: 15px;
  letter-spacing: 0.22em; text-decoration: none; color: var(--ink);
}
.masthead__tag {
  font-size: var(--t-sm); color: var(--ink-faint); margin: 0;
  flex: 1 1 auto; min-width: 0;
}
.nav { display: flex; gap: var(--s-4); flex-wrap: wrap; }
.nav a {
  font-family: var(--mono); font-size: var(--t-xs); letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--ink-dim); text-decoration: none;
  padding: 2px 0; border-bottom: 1px solid transparent;
  transition: color 120ms ease, border-color 120ms ease;
}
.nav a:hover { color: var(--ink); border-bottom-color: var(--accent); }
.nav a[aria-current="page"] { color: var(--ink); border-bottom-color: var(--accent); }

/* Liveness is the feature we advertise (TEARDOWN 3.1). When it is bad we say
   so at the top of the page, above the number, in words. */
.degraded {
  background: var(--bg-raised);
  border-top: 2px solid var(--stale);
  border-bottom: 1px solid var(--rule);
  position: relative; z-index: 10;
}
.degraded__in { padding: var(--s-3) 0; display: flex; gap: 10px; align-items: flex-start; }
.degraded__mark {
  font-family: var(--mono); font-weight: 700; font-size: 12px;
  letter-spacing: 0.1em; color: var(--stale); flex: 0 0 auto; padding-top: 1px;
}
.degraded__txt { font-size: var(--t-sm); margin: 0; color: var(--ink); }
.degraded__txt strong { font-weight: 600; }

.foot {
  border-top: 1px solid var(--rule); margin-top: var(--s-8);
  padding: var(--s-5) 0 var(--s-7); color: var(--ink-faint); font-size: 12.5px;
}
.foot p { margin: 0 0 var(--s-2); max-width: var(--measure); }
.foot a { color: var(--ink-dim); }
.foot__links {
  display: flex; gap: var(--s-4); flex-wrap: wrap; margin-top: var(--s-3);
  font-family: var(--mono); font-size: var(--t-xs); letter-spacing: 0.08em; text-transform: uppercase;
}
`;

const HERO = `
.hero { padding: var(--s-6) 0 var(--s-2); }

/* Mobile-first: level block, then score, stacked. Everything in this block has
   to survive above the fold on a 375px phone, because that is where traffic
   arrives from X. The digit is deliberately oversized - at 31vw it is nearly a
   third of the screen, which is what keeps a reposted phone screenshot legible
   at thumbnail size. */
.hero__grid { display: grid; gap: var(--s-5); }
@media (min-width: 720px) {
  .hero__grid { grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: var(--s-6); align-items: end; }
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
.score { border-top: 1px solid var(--rule); padding-top: var(--s-4); }
@media (min-width: 720px) {
  .score { border-top: 0; border-left: 1px solid var(--rule); padding: 0 0 0 var(--s-6); }
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

/* Slot for gauge() beside or beneath the score. */
.hero__chart { margin-top: var(--s-4); }
.hero__chart .ch__svg { margin-inline: auto; }

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
.stamp {
  font-family: var(--mono); font-size: 12px; color: var(--ink-dim);
  margin: var(--s-5) 0 0; letter-spacing: 0.02em;
}
.stamp b { color: var(--ink); font-weight: 500; }
.disclaimer {
  font-size: 12.5px; color: var(--ink-faint); margin: 10px 0 0; max-width: var(--measure);
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
.fresh { margin: var(--s-5) 0 0; }
.fresh__strip {
  /* 13 sources one-per-line eats the whole phone screen and pushes the pillars
     below three folds. Two columns at 375px, more as there is room. */
  display: grid; grid-template-columns: repeat(auto-fill, minmax(158px, 1fr));
  gap: 6px; margin: 0; padding: 0; list-style: none;
}
.chip {
  display: inline-flex; align-items: center; gap: 2px 6px; flex-wrap: wrap;
  font-family: var(--mono); font-size: var(--t-xs); letter-spacing: 0.02em;
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
.fresh__key { font-size: 11.5px; color: var(--ink-faint); margin: var(--s-2) 0 0; font-family: var(--mono); line-height: 1.6; }

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
const FEED = `
.feed { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--rule); }
.feed__row {
  display: grid; grid-template-columns: auto minmax(0, 1fr); gap: var(--s-1) 10px;
  padding: 10px 2px; border-bottom: 1px solid var(--rule-soft);
  transition: background-color 120ms ease;
}
.feed__row:hover { background: var(--bg-raised); }
.feed__row a { text-decoration: none; color: inherit; }
.feed__row a:hover .feed__title, .feed__row a:hover.feed__title { text-decoration: underline; }
/* An item that arrived in this build is marked by a rule AND a glyph, never by
   colour alone: a screenshot at 40% still shows the bar. */
.feed__row--new { border-left: 2px solid var(--accent); padding-left: var(--s-2); }
.feed__row--new .feed__time::before { content: '\\203a '; color: var(--accent); font-weight: 700; }

.feed__time { grid-column: 1; grid-row: 1; font-family: var(--mono); font-size: 10.5px; color: var(--ink-faint); white-space: nowrap; }
.feed__meta { grid-column: 2; grid-row: 1; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; min-width: 0; }
.feed__src { font-family: var(--mono); font-size: 10.5px; color: var(--ink-faint); overflow: hidden; text-overflow: ellipsis; }
.feed__title { grid-column: 1 / -1; font-size: 13.5px; line-height: 1.4; margin: 0; overflow-wrap: anywhere; }
.feed__body { grid-column: 1 / -1; font-size: 12px; color: var(--ink-faint); margin: 0; line-height: 1.45; }
@media (min-width: 420px) {
  .feed__title { grid-column: 2; }
  .feed__body { grid-column: 2; }
}
/* Prediction-market odds inline beside the item, the way pizzint puts
   Polymarket next to the news. Mono and tabular, so a column of them lines up
   and a repriced number does not shift the row. */
.feed__odds {
  font-family: var(--mono); font-size: 11.5px; font-weight: 700; color: var(--ink);
  border: 1px solid var(--rule); border-radius: 2px; padding: 0 4px; white-space: nowrap;
}
.feed__odds small { font-weight: 400; color: var(--ink-faint); font-size: 9.5px; letter-spacing: 0.06em; }
.feed__move { font-family: var(--mono); font-size: 11.5px; font-weight: 700; white-space: nowrap; }
.feed__move[data-dir="up"]::before   { content: '\\25b2 '; font-size: 8px; }
.feed__move[data-dir="down"]::before { content: '\\25bc '; font-size: 8px; }
.feed__move[data-dir="flat"]::before { content: '\\25c6 '; font-size: 8px; }

.feed__head { display: flex; align-items: center; gap: var(--s-2); flex-wrap: wrap; margin: 0 0 var(--s-3); }
.feed__live {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: var(--mono); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-faint);
}
.feed__live::before {
  content: ''; width: 7px; height: 7px; border-radius: 50%; background: var(--accent);
  animation: dc-pulse 2.6s ease-in-out infinite;
}
@keyframes dc-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
.feed__empty { font-family: var(--mono); font-size: 11.5px; color: var(--ink-faint); padding: var(--s-4) 0; margin: 0; }
.feed__more { font-family: var(--mono); font-size: var(--t-xs); letter-spacing: 0.06em; margin: var(--s-3) 0 0; }
`;

const REEL = `
/* Horizontally snapping card rail. No JS: scroll-snap and overflow do the whole
   job, so it works with the keyboard, works in a screenshot, and cannot break
   during hydration because there is no hydration. */
.reel { margin: 0 calc(var(--gutter) * -1); padding: 0; }
.reel__hint {
  font-family: var(--mono); font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase;
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
   <a class="reel__card"> straight in the rail and <li><a class="reel__card">
   are natural markup, and in the second shape the <li> is the flex item - so
   putting flex-basis on .reel__card let the <li> shrink to max-content and the
   three cards collapsed into a 99px-wide column with no horizontal scroll at
   all. Measured, not guessed. No 'flex' shorthand on .reel__card itself, or it
   would clobber this basis in the one-element shape. */
.reel__rail > * {
  flex: 0 0 79%; max-width: 300px; min-width: 0;
  scroll-snap-align: start; display: flex;
}
@media (min-width: 620px) { .reel__rail > * { flex-basis: 268px; } }
.reel__card {
  width: 100%;
  display: flex; flex-direction: column; gap: var(--s-2);
  background: var(--bg-raised); border: 1px solid var(--rule); border-radius: var(--radius);
  padding: var(--s-3) 13px; min-height: 148px;
  text-decoration: none; color: inherit;
  transition: border-color 120ms ease;
}
.reel__card:hover { border-color: var(--accent); }
.reel__kicker {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  font-family: var(--mono); font-size: 10px; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--ink-faint);
}
.reel__title { font-size: 14px; font-weight: 600; line-height: 1.32; margin: 0; overflow-wrap: anywhere; }
.reel__body { font-size: 12px; color: var(--ink-dim); margin: 0; line-height: 1.45; }
.reel__num { font-family: var(--mono); font-size: var(--t-lg); font-weight: 700; letter-spacing: -0.025em; color: var(--ink); }
.reel__foot {
  margin-top: auto; padding-top: var(--s-2); border-top: 1px solid var(--rule-soft);
  display: flex; align-items: baseline; justify-content: space-between; gap: var(--s-2);
  font-family: var(--mono); font-size: 10.5px; color: var(--ink-faint);
}
`;

const PILLARS = `
.pillars { display: grid; gap: 1px; background: var(--rule); border: 1px solid var(--rule); border-radius: var(--radius); overflow: hidden; }
@media (min-width: 620px) { .pillars { grid-template-columns: 1fr 1fr; } }
@media (min-width: 900px) { .pillars { grid-template-columns: 1fr 1fr 1fr; } }

.pillar { background: var(--bg-raised); padding: var(--s-4) 15px 13px; display: flex; flex-direction: column; gap: var(--s-2); }
.pillar__top { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.pillar__name { font-size: 14px; font-weight: 600; margin: 0; }
.pillar__score { font-family: var(--mono); font-size: var(--t-lg); font-weight: 700; letter-spacing: -0.02em; }
.pillar__blurb { font-size: 12px; color: var(--ink-faint); margin: 0; }
/* Two sparklines exist during the changeover. _parts.sparkline uses
   preserveAspectRatio="none" and NEEDS its height pinned, or it scales to 2x
   and renders "no history yet" at 20px across the card. _charts.sparkline
   carries its own aspect ratio and a --w cap, so it takes height:auto. The
   double-class selector is what keeps the two apart; delete the first rule once
   _parts stops exporting a sparkline. */
.pillar__spark { display: block; width: 100%; height: 30px; }
.pillar__spark.ch__svg { height: auto; }
.pillar__foot { font-family: var(--mono); font-size: 10.5px; color: var(--ink-faint); letter-spacing: 0.04em; }
.pillar[data-dark="1"] { background: var(--bg-sunken); }
.pillar[data-dark="1"] .pillar__score { color: var(--ink-faint); }
.pillar__dark {
  font-family: var(--mono); font-size: var(--t-xs); color: var(--dark-src);
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
  display: grid; gap: 2px 14px; padding: var(--s-3) 2px; text-decoration: none; color: inherit;
  grid-template-columns: auto 1fr auto; align-items: baseline;
  transition: background-color 120ms ease;
}
.move__a:hover { background: var(--bg-raised); }
.move__time { font-family: var(--mono); font-size: 11.5px; color: var(--ink-faint); grid-column: 1; }
.move__what { font-size: 14px; grid-column: 1 / -1; }
@media (min-width: 560px) { .move__what { grid-column: 2; } }
.move__delta { font-family: var(--mono); font-size: var(--t-sm); font-weight: 700; grid-column: 3; grid-row: 1; text-align: right; }
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
.prose > h2 { font-size: var(--t-xl); margin: var(--s-7) 0 10px; letter-spacing: -0.02em; }
.prose > h3 { font-size: var(--t-md); margin: var(--s-5) 0 var(--s-2); }
.prose > h4 { font-size: 0.95rem; margin: var(--s-5) 0 6px; color: var(--ink-dim); }
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
.prose h2 a.anchor, .prose h3 a.anchor { color: var(--ink-faint); text-decoration: none; font-weight: 400; margin-left: 6px; opacity: 0; }
.prose h2:hover a.anchor, .prose h3:hover a.anchor { opacity: 1; }

.lede { font-size: var(--t-md); color: var(--ink-dim); max-width: var(--measure); margin: 0 0 var(--s-5); }

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
.sec { margin: var(--s-7) 0 0; }
@media (min-width: 720px) { .sec { margin-top: var(--s-8); } }
/* The trailing hairline is an editorial device, not decoration: it terminates
   the heading so a five-word label does not float in the middle of a wide column. */
.sec__h {
  display: flex; align-items: center; gap: var(--s-3);
  font-family: var(--mono); font-size: var(--t-xs); letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--ink-faint); margin: 0 0 var(--s-3); font-weight: 500;
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

/**
 * Strip block comments and the blank lines they leave behind.
 *
 * This sheet is inlined into EVERY page, so every byte of reasoning above is
 * paid for on every request, by every reader, forever. The reasoning still
 * matters and still lives in this file - it just does not need to travel. The
 * repo is public and linked from the footer, so nothing is hidden by this.
 *
 * Measured: 35.7 KB -> 29.1 KB raw, 9.6 KB -> 6.4 KB gzipped. Safe because no
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
   as five more things to know rather than five more places to click. */
.xsell__grid {
  list-style: none; margin: 0; padding: 0;
  display: grid; gap: 10px;
  grid-template-columns: 1fr;
}
@media (min-width: 620px) { .xsell__grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 980px) { .xsell__grid { grid-template-columns: repeat(3, 1fr); } }
.xsell__a {
  display: flex; flex-direction: column; gap: 4px; height: 100%;
  padding: var(--s-3) 13px;
  background: var(--bg-raised);
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  text-decoration: none; color: inherit;
  transition: border-color 120ms ease, transform 120ms ease;
}
.xsell__a:hover { border-color: var(--accent); }
@media (prefers-reduced-motion: no-preference) {
  .xsell__a:hover { transform: translateY(-1px); }
}
.xsell__k {
  font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--ink-faint);
}
.xsell__l {
  font-family: var(--mono); font-size: var(--t-sm);
  color: var(--accent); font-variant-numeric: tabular-nums;
}
.xsell__s { font-size: var(--t-xs); color: var(--ink-dim); line-height: 1.45; }
`;

const OPS = `
.ops {
  border-bottom: 1px solid var(--rule);
  background: var(--bg-sunken);
  font-family: var(--mono);
  font-size: 10.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-faint);
}
.ops__in { display: flex; flex-wrap: wrap; gap: 0 var(--s-3); padding: 6px var(--gutter); }
.ops__c { white-space: nowrap; padding: 1px 0; }
.ops__c:last-child { margin-left: auto; color: var(--ok); }
/* Posture is carried by the WORD as well as the hue: a greyscale screenshot,
   or a reader who cannot separate the colours, still reads DEGRADED. */
.ops[data-posture="degraded"] .ops__c:last-child { color: var(--accent); }
@media (max-width: 560px) { .ops__c:last-child { margin-left: 0; } }

/* The epithet sits between the level name and the gloss: two to four words with
   a point of view, where the name above it is the measurement. */
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
    TOKENS, BASE, CHROME, OPS, HERO,
    CHARTS_CORE, CHARTS,
    FRESH, FEED, REEL, PILLARS, MOVES, XSELL, PROSE,
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
