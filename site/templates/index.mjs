// The dashboard.
//
// Everything above the fold on a 375px phone is server-rendered: the level
// digit, the score, its direction, the plain-language read, the oven rail and
// the first panel of the switcher. All of it is text or inline SVG in the first
// byte of the response. pizzint client-renders, so its prerendered HTML says
// "LOADING TACTICAL DATA..." - a crawler sees nothing and a screenshot taken
// before hydration is blank (TEARDOWN 3.3). Screenshots are the growth loop,
// so nothing on this page waits for JavaScript. There is no JavaScript.
//
// -------------------------------------------------------------------------
// THIS ROUND: the page was 235KB and ~8,700px tall on a phone, because it had
// grown a section per release and nothing had ever been removed. docs/VISITORS
// .md §5 measured the damage and its cut list is executed here, item by item.
//
//   §5.1  The reel and the feed's top eight were the SAME EIGHT STORIES, in
//         the same order, with the same scores - about two mobile screens of
//         verbatim duplication. The rail now carries the eight NEWEST items;
//         the feed carries the highest-scoring fourteen. Two orderings that
//         genuinely disagree, which is a second fact rather than a second coat
//         of paint. Both live in _switcher.mjs's SIGNAL panel.
//   §5.2  The frozen-reference distribution curve explained NORMALISATION to
//         the reader least equipped to read it, in the hero, above 6,000px of
//         one scalar drawn three ways. Gone from here; one line links the
//         readers who want it to where they already are.
//   §5.3  The fourteen-row source-freshness table collapses to the sentence we
//         already compute, with the rows one press away behind <details>.
//   §5.4  The X wire stops outranking our own scored corpus and becomes a
//         switcher panel.
//   §5.5  "Elsewhere on the desk" - three link cards at the very bottom of an
//         8,742px page - is deleted. The switcher reaches those destinations
//         from the fold, and the footer is already a full site index.
//   §5.6  THE LEVEL WAS STATED SEVEN TIMES above 6,000px: the digit, the name,
//         the epithet, the pips, the gauge arc, the band caption and the oven
//         rail. The gauge, the pips, the epithet and the band caption are gone.
//         Three statements remain and one of them is a five-stop scale that
//         shows the other four levels too.
//
// Density is facts per pixel, not ink per pixel. Roughly twenty of our
// fifty-seven desktop text atoms were the composite score wearing different
// hats; of pizzint's eighty-six, almost none repeat. The way to raise density
// of KINDS is to delete, which is what most of this diff is.
//
// -------------------------------------------------------------------------
// Visual hierarchy, top to bottom, and why:
//
//   1. THE FOLD   the level, the score, the direction since the last
//                 observation, and one plain sentence. A first-time visitor
//                 decides in about four seconds on a phone; sixteen of a
//                 hundred arrive from a screenshot with a budget under eight.
//                 Nothing above the numeral but its own timestamp.
//   2. THE OVEN   five named stages, the live one lit, the previous position
//                 marked so the rail reads as a needle that moves both ways
//                 rather than as a countdown.
//   3. THE DESK   the in-place switcher. One slot, five datasets, no page
//                 load, every panel already in this HTML.
//   4. THE RECORD then source health, the pillars, the archive, the machine
//                 surfaces.

import { LEVEL_LINE } from './_pixel.mjs';
import { esc, num, signed, utc } from './_html.mjs';
import { mascot, MOODS } from './_mascot.mjs';
import * as faq from './_faq.mjs';
import { tempoClock, TCLK_CSS } from './infoPages.mjs';
import * as verify from './_verify.mjs';
import { BOOK_COUNT } from './shopPages.mjs';
import { worldModel } from './_worldmap.mjs';
import { homeCards as topicCards, lead as topicLead } from './topicPages.mjs';
import { freshnessStrip, pillarCard, moveRow, sourceStatus } from './_parts.mjs';
import { indexHistoryChart, pillarRanked } from './_charts.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';
import * as news from './news.mjs';
import * as gauge from './_gauge.mjs';
import * as oven from './_oven.mjs';
import * as switcher from './_switcher.mjs';
import * as developing from './_developing.mjs';
import * as leaderwire from './_leaderwire.mjs';
import * as readings from './_readings.mjs';
import * as claims from './_claims.mjs';
import { existsSync } from 'node:fs';

// THE ONE HOMEPAGE MODULE THAT IS NOT A STATIC IMPORT, for the reason
// build.mjs gives at /flock. _balance.mjs is written on its own track, and a
// static import of a file that has not landed takes index.html down, and the
// whole build with it, so this wiring can land first and pick the module up
// the moment it exists. The same two failure cases, kept apart:
//
//   absent              -> silent. The homepage is one section shorter, and
//                          build.mjs has no /balance route either, because
//                          balancePage.mjs imports this same file.
//   present but broken  -> no section, and the error is kept in
//                          balanceLoadError, which build.mjs prints as a
//                          WARNING. A module that throws on import must not
//                          take the index with it.
let balance = null;
export let balanceLoadError = null;
if (existsSync(new URL('./_balance.mjs', import.meta.url))) {
  try {
    balance = await import('./_balance.mjs');
  } catch (err) {
    balanceLoadError = err.message;
  }
}

// Matches build.mjs's own sparkline window. Only a cap: the fallback reader
// below never needs more points than a 300-unit sparkline can resolve.
const SPARK_POINTS = 48;

export function render(ctx, { view = 'home' } = {}) {
  const { state } = ctx;
  const scoreTxt = num(state.score, 1);

  const pillars = brand.PILLARS.map((p) => {
    const live = state.pillars.find((x) => x.id === p.id);
    if (!live) throw new Error(`index.mjs: state.json is missing pillar "${p.id}"`);
    return pillarCard(live, seriesFor(ctx, p.id), sourcesForPillar(state, p.id));
  }).join('');

  const moves = ctx.moves.slice(0, 12)
    .map((m) => moveRow(m, ctx.href(`/moves/${m.id}.html`)))
    .join('');

  const embedSrc = ctx.url('/embed.html');
  const snippet = `<iframe src="${embedSrc}" width="320" height="152" ` +
    `style="border:0;max-width:100%" loading="lazy" title="${brand.NAME} — AI activity tempo"></iframe>`;

  const obs = ctx.history.length;

  // -----------------------------------------------------------------------
  // THE FOLD
  //
  // Four facts and nothing else. The old fold reached the numeral after seven
  // rows of apparatus and then restated the level six more ways before the
  // first story. What is gone: the epithet, the five pips, the 0-100 gauge,
  // the frozen-reference distribution strip and its caption, the
  // "level held since / receipt" stamp - which the oven rail directly below
  // now states with the interval spelled out - and the three-line disclaimer,
  // whose content the plain sentence one column to the left already carries
  // ("it is not a claim about how it ends") and which the footer prints in
  // full on every page. Saying the same refusal twice in one screen is the
  // §5.6 problem in prose rather than in numerals.
  //
  // The market leader deliberately does NOT sit here, although we compute it
  // every build. It is one press away on THE RACE tab, and a fold that carries
  // a fifth fact is a fold that carries none.
  // -----------------------------------------------------------------------
  const style = `<style>
/* Rules namespaced to elements this template owns, because site/styles.mjs
   belongs to the integrator. */

/* THE 1950s HERO. A broadside: hazard stripe across the top in the level's
   colour, a numbered bulletin line, the headline in poster gothic, a rubber
   stamp, and the seal. The stamp says NOT A PREDICTION because that is the one
   thing a page dressed as an official warning must not let a reader assume;
   it is aria-hidden because the disclaimer is already in the text twice. */
main.wrap > .hero { border-top: 0; overflow: hidden; }
main.wrap > .hero::before {
  content: ""; position: absolute; left: 0; right: 0; top: 0; height: 9px;
  background: repeating-linear-gradient(-45deg, var(--lvl, var(--accent)) 0 12px, var(--bg) 12px 24px);
}
main.wrap > .hero { padding-top: calc(var(--s-4) + 9px); }
.hero__bul { display: flex; flex-wrap: wrap; gap: 4px var(--s-4); align-items: baseline; }
.hero__bulno { font-family: var(--mono); font-weight: 700; letter-spacing: .14em; color: var(--ink); }
/* main.wrap > .hero in front, because the template's older .hero__headline
   rule comes later in this same sheet and would win the tie. */
main.wrap > .hero .hero__headline { font-family: var(--poster); font-weight: 400; text-transform: uppercase;
  letter-spacing: .012em; line-height: 1.04; font-size: clamp(34px, 4.6vw, 68px); max-width: 20ch; }
.hero__stamp {
  position: static; margin: 0 0 var(--s-2);
  padding: 6px 12px 4px; border: 3px solid currentColor; border-radius: 4px;
  font: 700 clamp(13px, 1.5vw, 19px)/1 var(--stencil); letter-spacing: .16em; text-transform: uppercase;
  color: var(--dark-src); opacity: .78; transform: rotate(-3deg); pointer-events: none;
}
/* THE INSTRUMENT BESIDE THE SENTENCE. At 1080px and up the hero was a
   headline with an empty right half and the dial a screen-height below it.
   The two wrappers dissolve (display: contents) so the dial becomes a grid
   item of the hero itself and takes the right column for the full height;
   everything else stacks in the left. The seal gives its corner to the dial
   here and is carried by the footer instead. */
.hero__stamp { display: inline-block; justify-self: start; }

/* THE DIAL BREATHES, AND HOW FAST IS THE LEVEL. The epithets have always
   described a needle - at rest, breathing, off the rest stop, pinned high, off
   the top of the chart - and the instrument itself sat perfectly still. The
   halo behind the dial now swells and settles at a tempo set by the level:
   still at 5, a slow breath at 4, quicker at each step, urgent at 1. It is the
   halo that moves and never the needle, so the mark stays exactly where the
   score puts it; the level is still in words inside the dial, so the motion is
   confirmation and not the reading. Off entirely under reduced motion. */
@keyframes dcBreathe {
  from { filter: drop-shadow(0 0 12px color-mix(in srgb, var(--lvl, var(--accent)) 16%, transparent)); }
  to   { filter: drop-shadow(0 0 36px color-mix(in srgb, var(--lvl, var(--accent)) 52%, transparent)); }
}
main.wrap[data-level="4"] > .hero .ch--dial { animation: dcBreathe 5.5s ease-in-out infinite alternate; }
main.wrap[data-level="3"] > .hero .ch--dial { animation: dcBreathe 3.2s ease-in-out infinite alternate; }
main.wrap[data-level="2"] > .hero .ch--dial { animation: dcBreathe 1.9s ease-in-out infinite alternate; }
main.wrap[data-level="1"] > .hero .ch--dial { animation: dcBreathe 1.1s ease-in-out infinite alternate; }
@media (prefers-reduced-motion: reduce) { main.wrap > .hero .ch--dial { animation: none !important; } }

/* EVERY SECTION WEARS THE COLOUR OF THE TILE THAT LEADS TO IT. The nav bar is
   thirteen saturated hues and the page under it was grey from the hero to the
   footer, so a reader who pressed the green tile landed in a section with
   nothing green about it. Each homepage heading now opens with a chip in its
   destination's hue and its rule starts in that hue and fades to the house
   line. Decoration only: the heading text stays ink, so nothing depends on
   telling the hues apart. */
#rd-h, #record-h { --sh: #ffef2a; }
#bal-h { --sh: #5fd08a; }
#oven-h { --sh: #ffb020; }
#sw-h, #news-h, #sw-latest-h, #sw-moved-h { --sh: #00a3ff; }
#labs-h { --sh: #00e676; }
#xw-h { --sh: #00e5ff; }
#fresh-h { --sh: #5fd08a; }
#pillars-h { --sh: #ff7a00; }
#moves-h { --sh: #ffb655; }
#embed-h { --sh: #4b59ff; }
#api-h { --sh: #8b5cf6; }
#support-h { --sh: #ff73c8; }
.sec__h[id]::before {
  content: ""; flex: 0 0 auto; align-self: center;
  width: 10px; height: 10px; margin-right: .65em; border-radius: 2px;
  background: var(--sh, var(--ink-faint));
  box-shadow: 0 0 10px color-mix(in srgb, var(--sh, transparent) 55%, transparent);
}
.sec__h[id]::after { background: linear-gradient(90deg, var(--sh, var(--rule)) 0%, var(--rule) 45%); }
/* No chip on a phone. Measured at 375px: its 16px pushed five sticky headings
   onto an extra line - "Where the index sits" from 19px to 46 - and a sticky
   heading is the worst place to spend a line. The coloured rule stays. */
@media (max-width: 560px) { .sec__h[id]::before { display: none; } }
/* On paper the neon hues wash out, so they are deepened rather than dropped. */
@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]) .sec__h[id]::before { filter: brightness(.72) saturate(1.3); box-shadow: none; }
}
:root[data-theme="light"] .sec__h[id]::before { filter: brightness(.72) saturate(1.3); box-shadow: none; }

/* The voice line under the headline: the level's epithet in the level's own
   colour, then the hook in dim ink. One line on a desktop, two on a phone. */
.sharebtn { margin-top: var(--s-3); padding: 8px 14px; border: 2px solid var(--lvl, var(--accent)); border-radius: 4px; background: transparent;
  color: var(--ink); cursor: pointer; font: 700 var(--t-xs)/1 var(--mono); letter-spacing: .14em; text-transform: uppercase; }
/* ON A PHONE the front page keeps the top of the ranked list and drops the
   clock rail; the full list is one tap away on /news and the level is already
   on the plate that opens the hero. */
@media (max-width: 719.98px) {
  main.wrap .sec.news, main.wrap .sw__moved { display: none; }
  main.wrap .sw .reel__item:nth-child(n+5), main.wrap .sw .lab:nth-child(n+4), main.wrap .sw .xw__i:nth-child(n+4) { display: none; }
  body:has(.hero__badge) .rail { display: none; }
  /* Six stacked cards were 1,192px of a phone page. They become one row that
     scrolls sideways with the next card showing at the edge, so the gesture
     is visible before it is needed. */
  main.wrap .clm { position: relative; }
  main.wrap .clm__l { display: flex; gap: 12px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 8px; scrollbar-width: thin; }
  main.wrap .clm__i { flex: 0 0 84%; scroll-snap-align: start; }
  body:has(.hero__badge) .foot__seal, body:has(.hero__badge) .foot__memo { display: none; }
}
${TCLK_CSS}
.xp__grid { display: grid; gap: var(--s-5); grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); align-items: center; max-width: 980px; }
.xp__l { display: grid; gap: var(--s-3); }
.xp__c { display: grid; gap: 4px; padding: var(--s-4); border: 1px solid var(--rule); border-radius: 12px; background: var(--bg-sunken); text-decoration: none; color: var(--ink-dim); text-align: left; }
.xp__c:hover, .xp__c:focus-visible { border-color: var(--lvl, var(--accent)); }
.xp__c b { font: 700 clamp(18px, 1.9vw, 22px)/1.15 var(--poster); letter-spacing: -.01em; color: var(--ink); }
.xp__c span { font: 400 var(--t-sm)/1.45 var(--sans); }
.xp__c i { font: 700 var(--t-2xs)/1 var(--mono); font-style: normal; letter-spacing: .12em; text-transform: uppercase; color: var(--lvl, var(--accent)); }
.stat { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--s-4) var(--s-5); margin: clamp(40px, 7vw, 88px) 0 0; }
.stat__c { margin: 0; display: grid; gap: 6px; align-content: start; }
.stat__n { font: 400 clamp(52px, 8vw, 104px)/.92 var(--poster); letter-spacing: .01em; color: var(--ink); }
.stat__c:last-child .stat__n { color: var(--lvl, var(--accent)); }
.stat__k { font: 500 var(--t-sm)/1.4 var(--sans); color: var(--ink-dim); max-width: 22ch; }
body:has(> main.wrap > .hero) .rail { display: none; }
/* Sections rise into place as they are reached. The class is only ever added
   by the script below, so without it, or with reduced motion, nothing is
   hidden and nothing moves. */
@media (prefers-reduced-motion: no-preference) {
  .rv { opacity: 0; transform: translateY(18px); transition: opacity .6s ease, transform .6s cubic-bezier(.2,.7,.2,1); }
  .rv.rv--in { opacity: 1; transform: none; }
}
.mt__l { list-style: none; margin: var(--s-4) 0; padding: 0; display: grid; gap: var(--s-3); grid-template-columns: repeat(5, minmax(0, 1fr)); }
.mt__i { display: grid; justify-items: center; gap: 6px; padding: var(--s-4) var(--s-2); border: 1px solid var(--rule); border-radius: 12px; background: var(--bg-sunken); opacity: .55; text-align: center; }
.mt__i .tally { width: 100%; max-width: 132px; height: auto; }
.mt__i--on { opacity: 1; border-color: var(--lvl); box-shadow: 0 0 26px color-mix(in srgb, var(--lvl) 30%, transparent); }
.mt__n { font: 400 clamp(15px, 1.6vw, 20px)/1.1 var(--poster); letter-spacing: .03em; color: var(--lvl); }
.mt__m { font: 500 var(--t-xs)/1.3 var(--mono); letter-spacing: .04em; color: var(--ink-dim); }
@media (max-width: 719.98px) {
  .mt__l { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 8px; scrollbar-width: thin; }
  .mt__i { flex: 0 0 46%; scroll-snap-align: center; }
}
/* THE LIVE DESK, FRAMED. One rounded panel like the others on the page. The
   ranked list and the what-moved strip are left to the pages that own them:
   "What happened" above already prints the top five, and the wall prints the
   movement, so the desk here is the tabs and the newest stories. */
main.wrap:has(> .hero) > .sw { margin-top: clamp(40px, 6vw, 72px); padding: clamp(14px, 2.4vw, 28px); border: 1px solid var(--rule); border-radius: 16px; background: var(--bg-raised); }
main.wrap:has(> .hero) > .sw .sec.news, main.wrap:has(> .hero) > .sw .sw__moved { display: none; }
main.wrap:has(> .hero) > .sw .sw__lede { display: none; }
.hmap__ph { position: relative; margin: 0 0 var(--s-4); border-radius: 16px; overflow: hidden; background: #06070b; }
.hmap__ph img { display: block; width: 100%; height: clamp(220px, 46vw, 560px); object-fit: cover; object-position: center 60%; }
.hmap__ph figcaption { position: absolute; left: 0; right: 0; bottom: 0; display: grid; gap: 4px; padding: clamp(14px, 3vw, 32px);
  background: linear-gradient(0deg, rgba(6,7,11,.92), rgba(6,7,11,0)); color: #eef0f4; }
.hmap__ph b { font: 700 clamp(40px, 8vw, 104px)/.95 var(--mono); letter-spacing: -.03em; text-shadow: 0 0 30px rgba(120,160,255,.45); }
.hmap__ph span { font: 500 var(--t-xs)/1.4 var(--mono); letter-spacing: .06em; text-transform: uppercase; color: #b3bac4; }
.hmap__a { display: block; border: 1px solid var(--rule); border-radius: 12px; background: var(--bg-sunken); overflow: hidden; }
.hmap__svg { display: block; width: 100%; height: auto; }
.hmap__land { fill: color-mix(in srgb, var(--ink) 9%, transparent); stroke: color-mix(in srgb, var(--ink) 18%, transparent); stroke-width: .5; }
.hmap__dots circle { fill: var(--lvl, var(--accent)); fill-opacity: .78; }
.earn { display: grid; gap: var(--s-3); grid-template-columns: repeat(auto-fit, minmax(min(100%, 230px), 1fr)); margin: var(--s-4) 0; }
.earn__c { display: grid; gap: 6px; align-content: start; padding: var(--s-4); border: 1px solid var(--rule); border-top: 6px solid var(--accent); border-radius: 8px;
  background: var(--bg-sunken); text-decoration: none; color: var(--ink-dim); }
.earn__c:hover, .earn__c:focus-visible { border-color: var(--accent); }
.earn__c b { font: 700 clamp(19px, 1.9vw, 23px)/1.15 var(--poster); letter-spacing: -.01em; color: var(--ink); }
.earn__c span { font: 400 var(--t-sm)/1.45 var(--sans); }
.earn__c i { font: 700 var(--t-2xs)/1 var(--mono); font-style: normal; letter-spacing: .12em; text-transform: uppercase; color: var(--accent); }
.fol__l { margin: var(--s-3) 0 var(--s-4); padding: 0 0 0 1.1em; display: grid; gap: 8px; max-width: 72ch; }
.fol__l li { font: 400 var(--t-base)/1.5 var(--sans); color: var(--ink-dim); }
.fol__l b { color: var(--ink); }
.hero__what { display: inline-block; margin: var(--s-3) 0 0 10px; font: 600 var(--t-xs)/1 var(--mono); letter-spacing: .08em; text-transform: uppercase; color: var(--ink-dim); }
.sharebtn--x { display: inline-block; margin-left: 8px; text-decoration: none; }
.hero__mood { color: var(--lvl, var(--accent)) !important; }
.supp__how { margin: var(--s-2) 0 0; font: 500 var(--t-sm)/1.5 var(--sans); color: var(--ink-dim); max-width: 60ch; }
.sharebtn:hover, .sharebtn:focus-visible { background: var(--lvl, var(--accent)); color: #0b0c0e; }
.bunk__go { display: inline-block; padding: 10px 16px; border: 2px solid var(--accent); border-radius: 4px; color: var(--ink);
  text-decoration: none; font: 700 var(--t-sm)/1 var(--mono); letter-spacing: .14em; text-transform: uppercase; }
.bunk__go:hover, .bunk__go:focus-visible { background: var(--accent); color: #0b0c0e; }
.hero__lang { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0 0 var(--s-3); font: 600 var(--t-2xs)/1 var(--mono); letter-spacing: .1em; text-transform: uppercase; color: var(--ink-faint); }
.hero__lang span { margin-right: 4px; }
.hero__lang button { padding: 5px 8px; border: 1px solid var(--rule); border-radius: 4px; background: transparent; color: var(--ink-dim); cursor: pointer; font: 500 var(--t-xs)/1 var(--sans); letter-spacing: 0; text-transform: none; }
.hero__lang button[aria-pressed="true"] { border-color: var(--lvl, var(--accent)); color: var(--ink); }
.hero__gist { margin: 0 0 var(--s-2); font: 500 var(--t-base)/1.4 var(--sans); color: var(--ink); max-width: 60ch; }
.hero__orders { display: flex; align-items: center; gap: 10px; }
/* THE STAGE: the picture, the answer over it. */
main.wrap > .hero { padding: 0; border: 0; background: none; box-shadow: none; overflow: visible; }
.stage { position: relative; isolation: isolate; display: grid; align-content: end; min-height: min(78svh, 760px);
  padding: clamp(20px, 4vw, 56px); border-radius: 16px; overflow: hidden;
  --ink: #eef0f4; --ink-dim: #b3bac4; --ink-faint: #8d95a0; --rule: #26324d; --bg: #06070b; --accent: #ffb020; --ok: #5fd08a;
  color: var(--ink); background: #06070b; }
.stage::before { content: ""; position: absolute; inset: 0; z-index: -2; background: var(--stage) right center / cover no-repeat; }
.stage::after { content: ""; position: absolute; inset: 0; z-index: -1;
  background: linear-gradient(90deg, rgba(6,7,11,.9) 0%, rgba(6,7,11,.62) 46%, rgba(6,7,11,.08) 78%),
    linear-gradient(0deg, rgba(6,7,11,.85) 0%, rgba(6,7,11,0) 34%); }
@supports (background-image: image-set(url("a.avif") type("image/avif"))) { .stage::before { background-image: var(--stage-set); } }
.stage > * { max-width: min(100%, 720px); }
.stage__credit { margin: var(--s-3) 0 0; font: 500 var(--t-2xs)/1.3 var(--mono); letter-spacing: .08em; text-transform: uppercase; color: var(--ink-faint); }
.stage .hero__lang button { color: var(--ink-dim); border-color: var(--rule); }
main.wrap > .hero .hero__grid { margin-top: var(--s-5); padding: var(--s-4); border: 1px solid var(--rule); border-radius: 12px; background: var(--bg-raised); }
@media (max-width: 719.98px) {
  .stage { min-height: 0; padding-top: 44vw; }
  .stage::before { background-position: 78% top; background-size: auto 62vw; }
  .stage::after { background: linear-gradient(0deg, rgba(6,7,11,1) 0%, rgba(6,7,11,.96) 58%, rgba(6,7,11,.1) 100%); }
}
/* THE ANSWER AND THE WALL: the terminal front page. */
main.wrap > .hero::before { display: none; }
main.wrap > .hero { border-radius: 3px; }
.ans__q { margin: 0 0 var(--s-2); font: 700 var(--t-sm)/1.2 var(--mono); letter-spacing: .18em; text-transform: uppercase; color: var(--accent); }
.ans__a { margin: 0 0 var(--s-3); font: 700 clamp(48px, 8.6vw, 128px)/.96 var(--poster); letter-spacing: -.04em; text-transform: none; color: var(--ink); }
.ans__a b { font-weight: 400; color: var(--lvl, var(--accent)); text-shadow: 0 0 34px color-mix(in srgb, var(--lvl, var(--accent)) 55%, transparent); }
.ans__a span { display: block; font-size: .34em; font-weight: 500; line-height: 1.15; letter-spacing: -.02em; margin-top: .28em; color: var(--ink); }
/* BORROWED FROM THE PAGES THAT DO THIS BEST. Three moves, each seen on Apple,
   Stripe and Linear: a section opens on a large plain sentence rather than a
   small label; the first screen offers exactly one filled action and one quiet
   one; and the page ends on a line and an action rather than fading into its
   footer. Home page only - .stage exists nowhere else. */
main.wrap:has(.stage) > section > .sec__h[id],
main.wrap:has(.stage) .duo > section > .sec__h[id],
main.wrap:has(.stage) .sw__hd > .sec__h[id] {
  display: block; position: static; margin: 0 0 var(--s-3); max-width: 24ch;
  font: 700 clamp(27px, 3.9vw, 46px)/1.06 var(--poster); letter-spacing: -.028em; text-transform: none; color: var(--ink);
}
main.wrap:has(.stage) > section > .sec__h[id]::before,
main.wrap:has(.stage) .duo > section > .sec__h[id]::before,
main.wrap:has(.stage) .sw__hd > .sec__h[id]::before {
  display: block; width: 40px; height: 4px; margin: 0 0 16px; border-radius: 2px;
}
main.wrap:has(.stage) > section > .sec__h[id]::after,
main.wrap:has(.stage) .duo > section > .sec__h[id]::after,
main.wrap:has(.stage) .sw__hd > .sec__h[id]::after { display: none; }
main.wrap:has(.stage) .sec__h[id] > .sec__eb { display: block; margin: 10px 0 0; }
main.wrap:has(.stage) > section.sec, main.wrap:has(.stage) > section.sw { margin-top: clamp(44px, 6vw, 84px); }
.wr { margin: var(--s-5) 0 0; padding: 14px; border: 1px solid var(--rule); border-radius: 16px; background: var(--bg-sunken);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--lvl, var(--accent)) 14%, transparent), 0 30px 80px -40px color-mix(in srgb, var(--lvl, var(--accent)) 40%, transparent); }
.wr__top { display: flex; flex-wrap: wrap; align-items: center; gap: 8px var(--s-4); padding: 2px 4px 12px; }
.wr__h { display: inline-flex; align-items: center; gap: 10px; margin: 0; font: 800 var(--t-sm)/1 var(--mono); letter-spacing: .2em; text-transform: uppercase; color: var(--ink); }
.wr__live { width: 9px; height: 9px; border-radius: 50%; background: var(--ok); box-shadow: 0 0 0 0 color-mix(in srgb, var(--ok) 70%, transparent); }
@media (prefers-reduced-motion: no-preference) { .wr__live { animation: wrpulse 2s ease-out infinite; } }
@keyframes wrpulse { to { box-shadow: 0 0 0 9px transparent; } }
.wr__k { margin: 0; font: 500 var(--t-2xs)/1.3 var(--mono); letter-spacing: .1em; text-transform: uppercase; color: var(--ink-faint); }
.wr__nav { display: flex; gap: 6px; flex: 1 1 100%; overflow-x: auto; scrollbar-width: none; padding-bottom: 2px; }
.wr__nav::-webkit-scrollbar { display: none; }
.wr__nav a { flex: 0 0 auto; padding: 7px 11px; border: 1px solid var(--rule); border-radius: 7px; background: color-mix(in srgb, var(--ph) 8%, transparent);
  font: 700 var(--t-2xs)/1 var(--mono); letter-spacing: .1em; text-transform: uppercase; text-decoration: none; color: var(--ink-dim); }
.wr__nav a::before { content: ""; display: inline-block; width: 6px; height: 6px; margin-right: 7px; border-radius: 50%; background: var(--ph); vertical-align: 1px; }
.wr__nav a:hover, .wr__nav a:focus-visible { color: var(--ink); border-color: var(--ph); }
.wr__grid { display: grid; gap: 10px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 270px), 1fr)); grid-auto-flow: dense; }
.wr__p { display: flex; flex-direction: column; min-width: 0; border: 1px solid var(--rule); border-top: 2px solid var(--ph); border-radius: 10px; background: var(--bg-raised); scroll-margin-top: 130px; }
.wr__p:target { box-shadow: 0 0 0 2px var(--ph); }
@media (min-width: 640px) { .wr__p--w { grid-column: span 2; } }
.wr__ph { display: flex; align-items: center; gap: 8px; padding: 9px 12px; border-bottom: 1px solid var(--rule); }
.wr__dot { width: 7px; height: 7px; border-radius: 50%; background: var(--ph); box-shadow: 0 0 8px var(--ph); flex: none; }
.wr__pn { margin: 0; font: 700 var(--t-2xs)/1.2 var(--mono); letter-spacing: .16em; text-transform: uppercase; color: var(--ink); }
.wr__pm { font: 500 var(--t-2xs)/1.2 var(--mono); letter-spacing: .06em; color: var(--ink-faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.wr__go { margin-left: auto; flex: none; font: 700 var(--t-2xs)/1 var(--mono); letter-spacing: .1em; text-transform: uppercase; text-decoration: none; color: var(--ph); }
.wr__go:hover, .wr__go:focus-visible { text-decoration: underline; }
.wr__pb { display: grid; gap: 8px; align-content: start; padding: 12px; flex: 1 1 auto; }
.wr__pb > * { margin: 0; }
.wr__big { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; }
.wr__big b { font: 700 clamp(34px, 4vw, 52px)/1 var(--mono); letter-spacing: -.04em; color: var(--ph); text-shadow: 0 0 22px color-mix(in srgb, var(--ph) 45%, transparent); }
.wr__big--c b { font-size: clamp(28px, 3vw, 40px); }
.wr__big span { font: 600 var(--t-2xs)/1.3 var(--mono); letter-spacing: .1em; text-transform: uppercase; color: var(--ink-dim); }
.wr__d { font: 600 var(--t-xs)/1.3 var(--mono); color: var(--ink-dim); }
.wr__spark { display: block; width: 100%; height: 84px; }
.wr__spark polyline { fill: none; stroke: var(--ph); stroke-width: 1.6; vector-effect: non-scaling-stroke; filter: drop-shadow(0 0 4px var(--ph)); }
.wr__spark polygon { fill: color-mix(in srgb, var(--ph) 14%, transparent); }
.wr__ax { display: flex; justify-content: space-between; gap: 8px; font: 500 var(--t-2xs)/1.3 var(--mono); letter-spacing: .06em; color: var(--ink-faint); }
.wr__s { font: 400 var(--t-sm)/1.45 var(--sans); color: var(--ink-dim); }
.wr__s--dark { color: var(--ink-faint); }
.wr__bars { list-style: none; padding: 0; display: grid; gap: 9px; }
.wr__bars li { display: grid; grid-template-columns: 112px minmax(0, 1fr) 42px; align-items: center; gap: 10px; }
.wr__bn { font: 600 var(--t-xs)/1.2 var(--sans); color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wr__bt { height: 8px; border-radius: 4px; background: color-mix(in srgb, var(--ink) 9%, transparent); overflow: hidden; }
.wr__bt i { display: block; height: 100%; border-radius: 4px; background: var(--ph); box-shadow: 0 0 10px var(--ph); }
.wr__bars b { font: 700 var(--t-xs)/1 var(--mono); text-align: right; color: var(--ink); }
.wr__bx b { font-weight: 500; font-size: 10px; color: var(--ink-faint); line-height: 1.1; }
.wr__news { list-style: none; padding: 0; display: grid; gap: 0; }
.wr__news li { display: grid; grid-template-columns: 2.4em minmax(0, 1fr); gap: 2px 10px; padding: 8px 0; border-bottom: 1px solid var(--rule); }
.wr__news li:last-child { border-bottom: 0; padding-bottom: 0; } .wr__news li:first-child { padding-top: 0; }
.wr__news b { grid-row: span 2; font: 700 var(--t-sm)/1.35 var(--mono); color: var(--ph); }
.wr__news a { font: 600 var(--t-sm)/1.35 var(--sans); color: var(--ink); text-decoration: none; }
.wr__news a:hover, .wr__news a:focus-visible { text-decoration: underline; }
.wr__news span { font: 500 var(--t-2xs)/1.2 var(--mono); letter-spacing: .08em; text-transform: uppercase; color: var(--ink-faint); }
.wr__kv { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 2px 10px; align-items: baseline; padding: 8px 0; border-bottom: 1px solid var(--rule); text-decoration: none; }
.wr__kv:last-child { border-bottom: 0; padding-bottom: 0; } .wr__kv:first-child { padding-top: 0; }
.wr__kv span { font: 700 var(--t-2xs)/1.2 var(--mono); letter-spacing: .14em; text-transform: uppercase; color: var(--ink-dim); }
.wr__kv b { font: 700 clamp(22px, 2.4vw, 30px)/1 var(--mono); letter-spacing: -.03em; color: var(--ph); }
.wr__kv em { grid-column: 1 / -1; font: 400 var(--t-xs)/1.4 var(--sans); font-style: normal; color: var(--ink-dim); }
.wr__bets { list-style: none; padding: 0; display: grid; gap: 8px; }
.wr__bets li { display: grid; grid-template-columns: 3.6em minmax(0, 1fr); gap: 10px; align-items: baseline; }
.wr__bets b { font: 700 var(--t-md, 18px)/1 var(--mono); color: var(--ph); }
.wr__bets span { font: 400 var(--t-xs)/1.4 var(--sans); color: var(--ink-dim); }
@media (max-width: 639px) {
  .wr { padding: 10px; border-radius: 12px; }
  .wr__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .wr__p--w, #wr-pillars, #wr-people, #wr-bets { grid-column: span 2; }
  .wr__p:not(.wr__p--w):not(#wr-pillars):not(#wr-people):not(#wr-bets) .wr__go { font-size: 0; }
  .wr__p:not(.wr__p--w):not(#wr-pillars):not(#wr-people):not(#wr-bets) .wr__go::after { content: "→"; font-size: 14px; }
  .wr__pn { letter-spacing: .1em; }
  .wr__big--c b { font-size: 24px; }
  .wr__s { font-size: 12.5px; line-height: 1.4; }
}
/* THE WALL ON THE FIRST SCREEN. At 1440x900 the photo stage was 704px tall and
   the war room began at 1,003 - a full scroll away from a reader who came for
   the panels. On a wide screen the stage gives up its fixed height, the answer
   steps down a size, and the one line that repeats the paragraph above it is
   kept for screen readers only, so the wall's header and jump bar are in view
   on arrival. Phones keep the tall stage: there the answer is the screen. */
@media (min-width: 1000px) {
  .stage { min-height: 0; padding-block: 34px 30px; }
  .ans__a { font-size: clamp(56px, 6.4vw, 92px); }
  main.wrap > .hero .stage .hero__headline { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  .stage .stage__credit { position: absolute; right: 18px; bottom: 12px; margin: 0; }
  .stage .ans__cta { margin: var(--s-3) 0; }
  .wr { margin-top: var(--s-3); }
}
.wr__bars--race { margin-top: 2px; } .wr__bars--race li { grid-template-columns: 84px minmax(0, 1fr) 46px; }
.wr__p:focus { outline: none; box-shadow: 0 0 0 2px var(--ph); }
.wr__new { margin-left: auto; padding: 7px 12px; border-radius: 999px; background: var(--ok); color: #06070b; font: 800 var(--t-2xs)/1 var(--mono); letter-spacing: .1em; text-transform: uppercase; text-decoration: none; }
.wr__new[hidden] { display: none; }
@media (hover: none), (max-width: 899px) { .wr__keys { display: none; } }
@media (min-width: 1100px) { .wr__grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } #wr-news { grid-row: span 2; } #wr-bets, #wr-pillars, #wr-people { grid-column: span 2; } }
.wr__brief { list-style: none; padding: 0; display: grid; gap: 9px; }
.wr__brief li { position: relative; padding-left: 16px; font: 400 var(--t-sm)/1.45 var(--sans); color: var(--ink-dim); }
.wr__brief li::before { content: ""; position: absolute; left: 0; top: .55em; width: 6px; height: 6px; border-radius: 50%; background: var(--ph); }
.wr__brief b { color: var(--ink); font-weight: 650; }
.wr__brief a { color: var(--ink); text-decoration: underline; text-decoration-color: color-mix(in srgb, var(--ph) 60%, transparent); text-underline-offset: 3px; }
.wr__brief span { color: var(--ink-faint); }
.wr { margin-bottom: var(--s-3); }
.srcs { margin: 0 0 var(--s-5); }
/* TWO PANELS, NOT TWO HALF-EMPTY ROWS. "Check it" and "follow it" each ran in
   a column 45ch wide with the other half of a 1240px page left blank. Side by
   side they read as one wall of two panels, the way the war room does. */
.duo { display: grid; gap: var(--s-4); margin-top: clamp(44px, 6vw, 84px); }
.duo > section { margin: 0; padding: clamp(20px, 2.6vw, 34px); border: 1px solid var(--rule); border-radius: 16px; background: var(--bg-raised); min-width: 0; }
.duo > section > .sec__h[id] { font-size: clamp(25px, 2.7vw, 36px); }
@media (min-width: 1000px) { .duo { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: stretch; } }
.duo > section:only-of-type { grid-column: 1 / -1; }
.duo > .dv { border-left: 3px solid var(--accent); }
.duo .xp__grid { gap: var(--s-4); }
.ans__cta { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 18px; margin: var(--s-4) 0; }
.cta { display: inline-flex; align-items: center; gap: 6px; text-decoration: none; font: 650 var(--t-base)/1 var(--sans); letter-spacing: -.005em; }
.cta--pri { padding: 13px 22px; border-radius: 999px; background: var(--lvl, var(--accent)); color: #06070b;
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--lvl, var(--accent)) 60%, transparent), 0 8px 28px color-mix(in srgb, var(--lvl, var(--accent)) 28%, transparent); }
.cta--pri:hover, .cta--pri:focus-visible { filter: brightness(1.08); }
.cta--sec { padding: 13px 4px; color: var(--ink); }
.cta--sec span { transition: transform 140ms ease; }
.cta--sec:hover span, .cta--sec:focus-visible span { transform: translateX(3px); }
.srcs { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px var(--s-4); margin: var(--s-4) 0 0; padding: 0 2px; }
.srcs__k { font: 700 var(--t-2xs)/1.4 var(--mono); letter-spacing: .14em; text-transform: uppercase; color: var(--ink-faint); }
.srcs__l { display: flex; flex-wrap: wrap; gap: 4px var(--s-4); margin: 0; padding: 0; list-style: none; }
.srcs__l li { font: 600 var(--t-sm)/1.4 var(--sans); letter-spacing: -.005em; color: var(--ink-dim); }
.close { margin: clamp(56px, 8vw, 110px) 0 var(--s-6); padding: clamp(36px, 6vw, 72px) clamp(20px, 5vw, 64px); border: 1px solid var(--rule); border-radius: 20px; text-align: center;
  background: radial-gradient(120% 140% at 50% 0%, color-mix(in srgb, var(--lvl, var(--accent)) 14%, transparent), transparent 60%), var(--bg-raised); }
.close__h { margin: 0 auto; max-width: 20ch; font: 750 clamp(30px, 5.2vw, 64px)/1.02 var(--poster); letter-spacing: -.035em; color: var(--ink); }
.close__h span { display: block; color: var(--lvl, var(--accent)); }
.close__p { margin: var(--s-4) auto 0; max-width: 44ch; font: 400 var(--t-base)/1.5 var(--sans); color: var(--ink-dim); }
.close .ans__cta { justify-content: center; margin-bottom: 0; }
.ans__why { margin: 0 0 var(--s-3); max-width: 62ch; font: 400 clamp(16px, 1.5vw, 20px)/1.5 var(--sans); color: var(--ink); }
.ans__meta { display: flex; flex-wrap: wrap; gap: 6px 14px; margin: 0 0 var(--s-3); font: 600 var(--t-2xs)/1.3 var(--mono); letter-spacing: .12em; text-transform: uppercase; color: var(--ink-dim); }
.ans__live { color: var(--ok); }
.ans__live::before { content: ""; display: inline-block; width: 7px; height: 7px; margin-right: 6px; border-radius: 50%; background: var(--ok); box-shadow: 0 0 10px var(--ok); vertical-align: 1px; }
@media (prefers-reduced-motion: no-preference) { .ans__live::before { animation: ansPulse 1.8s ease-in-out infinite; } }
@keyframes ansPulse { 50% { opacity: .35; } }
.hero__badge { display: inline-flex; align-items: center; gap: 12px; margin: 0 0 var(--s-3); padding: 8px 14px 8px 10px;
  border: 1px solid var(--lvl, var(--accent)); border-radius: 4px; background: color-mix(in srgb, var(--lvl, var(--accent)) 10%, transparent);
  box-shadow: 0 0 22px color-mix(in srgb, var(--lvl, var(--accent)) 32%, transparent), inset 0 0 18px color-mix(in srgb, var(--lvl, var(--accent)) 10%, transparent); }
main.wrap > .hero > .hero__badge { justify-self: start; }
.hero__badge-t { display: grid; gap: 3px; }
.hero__badge-t b { font: 700 clamp(18px, 2.2vw, 26px)/1 var(--mono); letter-spacing: .1em; color: var(--lvl, var(--accent)); text-shadow: 0 0 14px color-mix(in srgb, var(--lvl, var(--accent)) 60%, transparent); }
.hero__badge-t span { font: 600 var(--t-2xs)/1.2 var(--mono); letter-spacing: .14em; text-transform: uppercase; color: var(--ink-dim); }
main.wrap > .hero .hero__headline { margin: 0 0 var(--s-3); font: 500 var(--t-sm)/1.45 var(--mono); letter-spacing: .02em; text-transform: none; color: var(--ink-dim); max-width: 70ch; }
.wall { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1px; margin: var(--s-5) 0 0; border: 1px solid var(--rule); background: var(--rule); }
.wall__t { display: grid; gap: 4px; align-content: start; padding: 12px 14px 14px; background: var(--bg-sunken); text-decoration: none; color: var(--ink-dim); min-width: 0; }
.wall__t:hover, .wall__t:focus-visible { background: color-mix(in srgb, var(--lvl, var(--accent)) 9%, var(--bg-sunken)); }
.wall__k { font: 700 var(--t-2xs)/1 var(--mono); letter-spacing: .16em; text-transform: uppercase; color: var(--ink-faint); }
.wall__v { font: 700 clamp(20px, 2.3vw, 30px)/1.05 var(--mono); letter-spacing: -.03em; color: var(--lvl, var(--accent)); text-shadow: 0 0 16px color-mix(in srgb, var(--lvl, var(--accent)) 45%, transparent); overflow-wrap: anywhere; }
.wall__s { font: 500 var(--t-2xs)/1.35 var(--mono); letter-spacing: .04em; color: var(--ink-dim); overflow-wrap: anywhere; }
.pcs__l { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--s-3); grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr)); }
@media (min-width: 1100px) { .wall { grid-template-columns: repeat(6, minmax(0, 1fr)); } .pcs__l { grid-template-columns: repeat(5, minmax(0, 1fr)); } }
.pc { padding: 14px 16px 12px; border: 1px solid var(--rule); border-radius: 12px; background: var(--bg-raised); min-width: 0; }
.pc__top { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.pc__n { font: 700 var(--t-sm)/1.2 var(--poster); letter-spacing: 0; text-transform: uppercase; color: var(--ink); }
/* THE PHONE PAGE WAS 13,000px. These are the cuts that cost no content: the
   stat wall goes three across, the five pillar cards become one swipe row
   (faded at the right edge so it reads as a row, not as one card), the
   support cards pair up, and the clock stops filling the whole screen. */
@media (max-width: 599px) {
  .wall { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .wall__t { padding: 10px 9px 11px; }
  .wall__v { font-size: 17px; }
  .wall__s { display: none; }
  .pcs__l { grid-template-columns: none; grid-auto-flow: column; grid-auto-columns: 78%; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; padding-bottom: 4px;
    -webkit-mask-image: linear-gradient(90deg, #000 calc(100% - 28px), transparent); mask-image: linear-gradient(90deg, #000 calc(100% - 28px), transparent); }
  .pcs__l::-webkit-scrollbar { display: none; }
  .pcs__l > li { scroll-snap-align: start; }
  .pc__bars { height: 72px; }
  .earn { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: var(--s-2); }
  .earn__c { padding: var(--s-3); }
  .earn__c b { font-size: 16px; }
  .xp__grid { gap: var(--s-3); }
  .xp__grid .tclk { max-width: 230px; margin-inline: auto; }
  .xp__c { padding: var(--s-3); }
}
.pc__chip { padding: 4px 8px; border: 1px solid currentColor; border-radius: 6px; font: 700 var(--t-2xs)/1 var(--mono); letter-spacing: .1em; text-transform: uppercase; }
.pc__chip--up { color: var(--dark-src); background: color-mix(in srgb, var(--dark-src) 12%, transparent); }
.pc__chip--down { color: var(--accent-2); background: color-mix(in srgb, var(--accent-2) 12%, transparent); }
.pc__chip--flat, .pc__chip--wait { color: var(--ink-dim); }
.pc__s { margin: 6px 0 10px; font: 500 var(--t-2xs)/1.3 var(--mono); letter-spacing: .08em; text-transform: uppercase; color: var(--ink-faint); }
.pc__bars { display: block; width: 100%; height: 96px; border-bottom: 1px solid var(--rule); }
.pc__bars rect { fill: var(--bar); }
.pc__bars .pc__now { fill: var(--lvl, var(--accent)); filter: drop-shadow(0 0 3px var(--lvl, var(--accent))); }
.pc__f { margin: 8px 0 0; font: 500 var(--t-2xs)/1.4 var(--mono); letter-spacing: .04em; color: var(--ink-dim); }
.pc__f b { font-size: var(--t-md); color: var(--ink); margin: 0 4px 0 8px; }
.pc__live { color: var(--ok); font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
.pc__live::before { content: ""; display: inline-block; width: 6px; height: 6px; margin-right: 5px; border-radius: 50%; background: var(--ok); box-shadow: 0 0 8px var(--ok); vertical-align: 1px; }
.pc__none { margin: 0; font: 400 var(--t-sm)/1.5 var(--sans); color: var(--ink-dim); }
.tops__l { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--rule); }
.tops__i { display: grid; grid-template-columns: 34px minmax(0, 1fr); gap: 2px 10px; padding: 12px 0; border-bottom: 1px solid var(--rule); }
.tops__r { grid-row: span 2; font: 700 var(--t-md)/1.3 var(--mono); color: var(--accent); }
.tops__i a { font: 600 clamp(16px, 1.5vw, 19px)/1.35 var(--sans); color: var(--ink); text-decoration: none; }
.tops__i a:hover { text-decoration: underline; }
.tops__m { font: 500 var(--t-2xs)/1.3 var(--mono); letter-spacing: .08em; text-transform: uppercase; color: var(--ink-faint); }
.hero__tally { display: none; }
.hero__orders { margin: 0 0 var(--s-3); max-width: 60ch; font: 500 var(--t-xs)/1.45 var(--mono); letter-spacing: .04em; color: var(--ink-dim); }
.hero__orders b { font: 700 var(--t-xs)/1 var(--mono); letter-spacing: .14em; text-transform: uppercase; color: var(--ink); }
.clip { position: relative; margin: var(--s-4) 0 10px; padding: 14px 10px 10px; border: 2px dashed var(--ink-faint); border-radius: 2px; }
.clip::before { content: "✂ Clip and post"; position: absolute; top: -.8em; left: 12px; padding: 0 8px;
  background: var(--bg); color: var(--ink-dim); font: 700 var(--t-xs)/1.5 var(--mono); letter-spacing: .14em; text-transform: uppercase; }
.clip .snippet { margin: 0; }
.hero__voice { margin: var(--s-2) 0 var(--s-3); font: 500 var(--t-base)/1.4 var(--sans); color: var(--ink-dim); max-width: 60ch; }
.hero__ep { color: var(--lvl, var(--accent)); font-weight: 650; }

/* THE SOURCE-HEALTH BAR. Fourteen cells; shape carries the state, colour
   confirms it. position:relative on each cell because its visually-hidden
   label is absolute - the bug that widened three pages on 2026-10-03. */
.hb { margin: var(--s-3) 0; max-width: 560px; }
.hb__row { list-style: none; margin: 0; padding: 0; display: flex; gap: 4px; }
.hb__row .hb__c { flex: 1 1 0; height: 18px; }
.hb__c { position: relative; display: block; box-sizing: border-box; border-radius: 3px; border: 1.5px solid var(--ink-faint); }
.hb__c--live { background: var(--ok); border-color: var(--ok); }
.hb__c--stale { border-color: var(--stale); background: linear-gradient(90deg, var(--stale) 50%, transparent 50%); }
.hb__c--uncal { border-style: dashed; background: transparent; }
.hb__c--dark { border-color: var(--dark-src);
  background: linear-gradient(to top right, transparent 44%, var(--dark-src) 44%, var(--dark-src) 56%, transparent 56%); }
.hb__key { list-style: none; margin: var(--s-2) 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 4px var(--s-4);
  font: 400 var(--t-xs)/1.4 var(--mono); color: var(--ink-dim); }
.hb__key li { display: inline-flex; align-items: center; gap: 6px; }
.hb__key .hb__c { width: 14px; height: 12px; flex: 0 0 auto; }
.hb__key b { color: var(--ink); }

/* THE SUPPORT ROW. One link, sized like a control rather than set in running
   prose, because it is the only thing on the page asking the reader for
   something. It is the last section deliberately: a reader who has scrolled
   past the API list has already had the whole index for free. */
.supp__row { margin: var(--s-3) 0 var(--s-2); }
.supp__a {
  display: inline-flex; align-items: baseline; gap: .6em;
  padding: 9px var(--s-4); border: 1px solid var(--rule); border-radius: var(--radius);
  background: var(--bg-raised); color: var(--ink); text-decoration: none;
  font: 600 var(--t-sm)/1.2 var(--sans);
}
.supp__a:hover { border-color: var(--accent-2); color: var(--accent-2); }
.supp__h { font: 400 var(--t-2xs)/1.2 var(--mono); color: var(--ink-faint); }
.supp__a:hover .supp__h { color: var(--accent-2); }

/* The plain-language read is now the largest piece of prose in the hero, and
   it is the one sentence thirteen of a hundred visitors came for. It was set
   at caption size under five pips that no longer exist. */
/* THE HEADLINE is the largest thing on the page by design: 2.5x the next
   largest type above the fold (20px), clamped so a phone gets 30px across two
   or three lines and a desktop gets up to 54px on one or two. The dial's own
   numeral is 56px inside an SVG and does not compete - it is a glyph in an
   instrument, this is the sentence that names the instrument's reading. */
.hero__headline {
  font-family: var(--sans); font-weight: 650; letter-spacing: -0.02em;
  font-size: clamp(30px, 3.7vw, 54px); line-height: 1.08;
  max-width: 22ch; margin: var(--s-2) 0 var(--s-4); color: var(--ink);
  text-wrap: balance;
}
.hero .level__plain { font-size: var(--t-md); line-height: 1.45; color: var(--ink); max-width: 46ch; }

/* ---- THE DIAL IN THE HERO ------------------------------------------------
   .level is a flex row in styles.mjs and held a 140px numeral beside its text.
   It now holds a 320x314 instrument, which does not fit beside a sentence until
   there is real width, so the row only stays a row at 1080px and up.

   THE FOLD COST, measured at 1440x900 and stated because the operator has
   fought for this number: the hero was 158px tall and ended at y=717. A 314px
   instrument cannot cost nothing. Everything below is about making it cost as
   little as possible — the level column widens into the 756px of empty space
   the score column was sitting in rather than pushing anything down, and the
   grid centres rather than bottom-aligns so the 81px score block sits opposite
   the middle of the dial instead of under its bottom edge. */
.hero .level--dial { gap: var(--s-4); }
.hero .ch--dial { flex: 0 0 auto; }

/* Below 1080 the dial stacks above its own text. At 720-1079 the grid is still
   two columns, so the level column is ~480px — enough for the dial, not enough
   for the dial AND 34ch of prose beside it. */
@media (max-width: 1079.98px) {
  .hero .level--dial { flex-direction: column; align-items: flex-start; }
  .hero .level--dial .level__meta { width: 100%; }
}

/* On a phone the dial is the fold. Centre it, and let the caption centre with
   it; the SM geometry caps itself at 272px through --w, so this never upscales
   a 272-unit viewBox onto a 343px column. */
@media (max-width: 719.98px) {
  .hero .level--dial { align-items: center; text-align: left; }
  .hero .level--dial .ch--dial { align-self: center; }
}

/* At 1080+ the two hero columns are 420px : 1fr, which was sized for a numeral.
   Give the dial and its sentence the room, and let the score column keep the
   rest — it needs ~400px and had 756. */
@media (min-width: 1080px) {
  .hero .hero__grid { grid-template-columns: minmax(0, 700px) minmax(0, 1fr); align-items: center; }
  .hero .level--dial { gap: var(--s-5); }
}

/* The collapsed source table. */
.fresh__more { margin-top: var(--s-2); }
.fresh__morein { padding-top: var(--s-3); }
</style>
`;

  // THE INSTRUMENT ROOM. Everything a newcomer does not need in the first
  // minute and a checker needs in the second: the balance, the oven, the
  // record, source health, the pillars, the moves, the embed and the API.
  // These sections were the lower two thirds of a 12,574px home page
  // (measured 2026-10-04, 19 sections). They are unchanged; they have their
  // own address now, and the home page links to it.
  const instruments = `
<section class="inst__top">
  <p class="eyebrow">The instrument room · everything behind the reading</p>
  <h1 class="bp__h1">The instruments</h1>
  <p class="lede">The home page gives the reading. This page shows the working: where the score sits, how it has moved,
    which sources reported, what each pillar is doing, and how to take the number with you.</p>
</section>
<!-- THE BALANCE, straight after the claim cards: the cards say what SIREN
     counts, and this is where the page first sets the benefit side beside
     it. Its style block rides inside the fragment, as the cards' does, so a
     build without data/balance.json carries neither. Empty when either file
     is absent or when build.mjs did not write the page its link points at.
     site/templates/_balance.mjs. -->
${balanceModule(ctx)}

${oven.render(ctx)}

<section class="sec" id="record" aria-labelledby="record-h">
  <h2 class="sec__h" id="record-h">The score over time<span class="sec__eb">The record</span></h2>
  <p class="lede">${esc(recordLede(obs))}</p>
  ${indexHistoryChart(ctx.history, { id: 'home', now: state.score })}
  <p class="fresh__key">${esc(recordKey(obs))}
     <a href="${esc(ctx.href('/history.html'))}">Full history and every observation →</a></p>
  <p class="fresh__key">Where today sits inside the frozen reference distribution, and why that curve
     is never updated live, is drawn and explained on the
     <a href="${esc(ctx.href('/methodology.html'))}">methodology page →</a></p>
</section>

<section class="fresh" aria-labelledby="fresh-h">
  <h2 class="sec__h" id="fresh-h">Source health</h2>
  <p class="lede">${esc(healthSentence(state))}</p>
  ${healthBar(state)}
  <details class="fresh__more">
    <summary>All ${esc(state.sources.length)} sources, one row each</summary>
    <div class="fresh__morein">${freshnessStrip(state.sources, state.generated_at)}</div>
  </details>
</section>

<section class="sec" aria-labelledby="pillars-h">
  <h2 class="sec__h" id="pillars-h">The five pillars</h2>
  <p class="lede">Which part of the field is loudest today. Each bar is linear in score from 0 to 100,
     so the ordering is the comparison; the cards underneath carry each pillar's own history.</p>
  ${pillarRanked(state.pillars, { id: 'home' })}
  <hr class="rule">
  <div class="pillars">${pillars}</div>
</section>

<section class="sec" aria-labelledby="moves-h">
  <h2 class="sec__h" id="moves-h">Recent moves</h2>
  ${moves
    ? `<ul class="moves">${moves}</ul>
       <p class="fresh__key"><a href="${esc(ctx.href('/moves/'))}">Full archive →</a></p>`
    : `<p class="fresh__key">No scored observations recorded yet. Moves appear here the first time the index is computed twice.</p>`}
</section>

<section class="sec" id="embed" aria-labelledby="embed-h">
  <h2 class="sec__h" id="embed-h">Put the index on your site</h2>
  <p class="lede">One iframe. No script, no tracking, no key. It renders light or dark to match
     the page it sits in, and the number inside it is server-rendered too.</p>
  <div class="clip"><div class="snippet">${esc(snippet)}</div></div>
  <p class="lede">Or a badge, for a README or anywhere an iframe is stripped. It shows the current level and links back here.</p>
  <div class="clip"><div class="snippet">${esc(`[![${brand.NAME}](${ctx.url('/badge.svg')})](${ctx.url('/')})`)}</div></div>
  <p><img src="${esc(ctx.href('/badge.svg'))}" alt="${esc(brand.NAME)} badge showing the current level" height="20"></p>
  <p class="fresh__key">Add <code>?theme=light</code>, <code>?theme=dark</code> or <code>?compact=1</code> to pin the look.
     <a href="${esc(ctx.href('/embed.html'))}">Preview the widget →</a></p>
</section>

<section class="sec" id="api" aria-labelledby="api-h">
  <h2 class="sec__h" id="api-h">Public JSON API</h2>
  <ul class="apilist">
    <li><code>${esc(ctx.url('/api/state.json'))}</code> <span>current level, score, pillars and per-source health</span></li>
    <li><code>${esc(ctx.url('/api/history.json'))}</code> <span>every scored observation</span></li>
    <li><code>${esc(ctx.url('/api/health.json'))}</code> <span>per-source success, honestly reported</span></li>
    <li><code>${esc(ctx.url('/api/receipts/'))}&lt;id&gt;.json</code> <span>the hash-chained receipt behind one observation</span></li>
  </ul>
  <p class="fresh__key">Static files. No key, no rate limit, ${esc(brand.LICENSE)}. Attribution: ${esc(brand.DOMAIN)}.</p>
</section>

${style}`;

  const main = `
${news.styleTag()}
${gauge.styleTag()}
<section class="hero">
  <!-- THE STAGE. A picture behind the answer: a siren over a city at dusk.
       It is a generated illustration and the credit line under it says so.
       The text sits on the dark sky to its left, so the answer is still the
       first thing read, and the stage keeps a dark palette in both themes
       because the picture is dark in both. -->
  <div class="stage" style="--stage:url('${esc(ctx.href('/img/hero-siren.jpg'))}');--stage-set:image-set(url('${esc(ctx.href('/img/hero-siren.avif'))}') type('image/avif'), url('${esc(ctx.href('/img/hero-siren.jpg'))}') type('image/jpeg'))">
  ${answer(ctx)}
  <p class="hero__headline">${headline(ctx)}</p>
  ${Number.isFinite(state.score) ? langStrip(state) : ''}
  <p class="stage__credit">Background: a generated illustration, not a photograph.</p>
  </div>
  ${picksBand(ctx)}
  ${warRoom(ctx)}
  ${sourceStrip(state)}
  <div class="hero__grid">

    <!-- align-self overrides .hero__grid's align-items:end, so the dial sits
         opposite the number it labels rather than being hung off the baseline.
         An inline property rather than a new class, because site/styles.mjs
         belongs to the integrator. -->
    <div class="level level--dial" style="align-self:center">
      <!-- THE DIAL replaces the 140px text numeral that used to sit here.
           It is the same fact — the level — drawn as an instrument instead of
           set as type, and it carries three things the numeral could not: where
           the score sits inside the band, where the previous reading was, and
           whether the observation is degraded. site/templates/_gauge.mjs.

           data-dc-level rides on the <figure>, because it is the motion layer's
           hook (site/templates/_motion.mjs looks for [data-dc-level] first and
           falls back to .level__digit) and .dcmx-pulse is a ::after ring around
           whatever carries it. Moving it here keeps the level-changed pulse
           working and now rings the whole instrument. The score's own hook,
           data-dc-score, stays on .score__val below: _motion.mjs live-updates
           exactly ONE element per page, so the dial deliberately prints no
           composite score of its own that could drift out of step with it. -->
      ${gauge.render(ctx, {
        attrs: 'data-dc-level',
        // No figcaption HERE, and only here. _charts.mjs rule 4 wants a visible
        // sentence under every graphic so the finding survives an SVG that
        // never paints — but this dial already prints its own scale (0, 35, 55,
        // 70, 85, 100), its band range, the level's name, the delta and the
        // pillar coverage as text inside the drawing, and the h1 and the plain
        // read sit six pixels to its right saying the same thing in prose. The
        // caption was 38px of the fold restating what four other elements in
        // the same screen already say. The <desc> still carries the full
        // description for a screen reader. Other callers keep the default.
        caption: false,
      })}
      <div class="level__meta">
        <p class="level__plain">${esc(plainRead(ctx))}</p>
        ${Number.isFinite(state.score) ? `<button type="button" class="sharebtn" hidden data-t="${esc(`${brand.NAME} ${state.level}, ${state.level_name}. ${num(state.score, 1)} of 100 as of ${utc(state.generated_at)}. Tempo, not a probability.`)}">Copy this reading</button>
        <a class="sharebtn sharebtn--x" rel="noopener" target="_blank" href="https://x.com/intent/post?text=${encodeURIComponent(`${brand.NAME} ${state.level}, ${state.level_name}. ${num(state.score, 1)} of 100 as of ${utc(state.generated_at)}. Tempo, not a probability.`)}&amp;url=${encodeURIComponent(ctx.url('/'))}">Post this on X</a>
        <a class="hero__what" href="${esc(ctx.href('/guide.html'))}">What is ${esc(brand.NAME)}?</a>` : ''}
      </div>
    </div>

    <div class="score">
      <p class="eyebrow">Composite score</p>
      <div class="score__row">
        <span class="score__val num" data-dc-score>${esc(scoreTxt)}</span>
        <span class="score__of">/ 100</span>
        ${direction(ctx)}
      </div>
    </div>

  </div>
</section>

<!-- THE RECENT READINGS STRIP and THE CLAIM CARDS sit directly under the
     instrument. The strip is the Bulletin's 'Recent Clock changes' - the
     number seen MOVING, which is what brings a reader back - and the cards
     are the site's surface area as six sentences with the live number
     inside each, so a newcomer learns what SIREN knows before meeting
     eleven tiles. Both render '' when their data is absent; neither needs
     a script to exist. site/templates/_readings.mjs, _claims.mjs. -->
${readings.render(ctx)}
<div class="duo">
${verify.render(ctx)}
${followBand(ctx)}
</div>
${topicCards(ctx)}

<div class="duo">
${explainers(ctx)}
${developing.render(ctx)}
</div>

${homeMap(ctx)}

${switcher.render(ctx)}


<section class="sec inst" id="instruments" aria-labelledby="inst-h">
  <h2 class="sec__h" id="inst-h">Check the working</h2>
  <p class="lede">The score over time, source health, the five pillars, every recent move, the harm and benefit scale,
    the embed code and the public JSON API all live in one place.</p>
  <p><a class="bunk__go" href="${esc(ctx.href('/instruments.html'))}">Open the instrument room →</a></p>
</section>

 ${faq.render(ctx)}

<section class="sec supp" id="support" aria-labelledby="support-h">
  <h2 class="sec__h" id="support-h">Keep the count running</h2>
  <p class="lede">${esc(brand.NAME)} is free, sets no cookies, counts visits without cookies, and the number will never be behind a paywall:
    a number you have to pay to check is not a number anybody can check. It pays its way four ways, all labelled.</p>
  <div class="earn">
    <a class="earn__c" href="${esc(ctx.href('/library.html'))}"><b>The reading list</b><span>${esc(BOOK_COUNT)} books from every side of the AI argument.</span><i>Paid links</i></a>
    <a class="earn__c" href="${esc(ctx.href('/bunker-kit.html'))}"><b>The Bunker Kit</b><span>50 free tools, and one crate of gear that is not free.</span><i>Paid links</i></a>
    <a class="earn__c" href="${esc(ctx.href('/sponsor.html'))}"><b>Sponsor the index</b><span>One named sponsor at a time, with no say over the number.</span><i>Open</i></a>
    ${brand.X_URL ? `<a class="earn__c" href="${esc(brand.X_URL)}" rel="noopener"><b>Donate with X Money</b><span>Open ${esc(brand.X_HANDLE)} and use the Money ($) button on the profile.</span><i>Any amount</i></a>` : ''}
  </div>
  <p class="fresh__key">As an Amazon Associate, ${esc(brand.NAME)} earns from qualifying purchases. Paid links are marked wherever they appear, and nothing a reader buys changes a number.</p>
</section>

${closer(ctx)}

<script>(function(){
/* The war room, live. Three small things, none of them needed to read it:
   the age of the reading ticks, the number keys jump between panels, and the
   wall says so when a newer reading has been published. */
var age=document.querySelector('.wr__age'),pill=document.querySelector('.wr__new');
if(!age)return;
var at=Date.parse(age.getAttribute('data-at'));
function tick(){var m=Math.max(0,Math.round((Date.now()-at)/60000));
age.textContent=' · read '+(m<1?'just now':m<60?m+' min ago':Math.floor(m/60)+'h '+(m%60)+'m ago');}
if(isFinite(at)){tick();setInterval(tick,30000);}
var ps=[].slice.call(document.querySelectorAll('.wr__p'));
document.addEventListener('keydown',function(e){
if(e.metaKey||e.ctrlKey||e.altKey)return;var t=e.target&&e.target.tagName;
if(t==='INPUT'||t==='TEXTAREA'||t==='SELECT'||(e.target&&e.target.isContentEditable))return;
var n=parseInt(e.key,10);if(!(n>=1&&n<=9)||!ps[n-1])return;
ps[n-1].scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
ps[n-1].focus({preventScroll:true});});
function check(){if(document.hidden||!window.fetch)return;
fetch('${esc(ctx.href('/api/state.json'))}',{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).then(function(j){
if(j&&j.generated_at&&Date.parse(j.generated_at)>at&&pill){pill.hidden=false;}}).catch(function(){});}
setInterval(check,300000);document.addEventListener('visibilitychange',check);
})();</script>

<script>(function(){
if(!('IntersectionObserver' in window)||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
var els=[].slice.call(document.querySelectorAll('main.wrap > section:not(.hero)')),vh=innerHeight;
els=els.filter(function(e){return e.getBoundingClientRect().top>vh*0.9;});
if(!els.length)return;
var io=new IntersectionObserver(function(en){en.forEach(function(x){if(x.isIntersecting){x.target.classList.add('rv--in');io.unobserve(x.target);}});},{rootMargin:'0px 0px -8% 0px'});
els.forEach(function(e){e.classList.add('rv');io.observe(e);});
setTimeout(function(){els.forEach(function(e){e.classList.add('rv--in');});},6000);
window.addEventListener('hashchange',function(){els.forEach(function(e){e.classList.add('rv--in');});});
})();</script>
${style}`;

  if (view === 'instruments') {
    return page({
      ctx,
      path: '/instruments.html',
      title: `The instruments: score history, source health, pillars and API · ${brand.NAME}`,
      description: `Everything behind the ${brand.NAME} reading: the score over time, per-source health, the five pillars, recent moves, the embed and the public JSON API.`,
      main: instruments,
    });
  }

  return page({
    ctx,
    motion: true,
    path: '/',
    title: Number.isFinite(state.score) && LEVEL_LINE[state.level]
      ? `${brand.NAME} ${state.level}: ${LEVEL_LINE[state.level].replace(/\.$/, '')} · ${scoreTxt}`
      : `${brand.NAME} · the AI Siren Index`,
    ogTitle: `${brand.NAME} ${state.level} · ${state.level_name} · ${scoreTxt}/100 — ${LEVEL_LINE[state.level] || ''}`.replace(/ — $/, ''),
    description:
      `The AI Siren Index is at level ${state.level} of 5 (${state.level_name}), ${scoreTxt} of 100. ` +
      `${LEVEL_LINE[state.level] || ''} Counted hourly from public data, as of ${utc(state.generated_at)}.`,
    ogImage: ctx.cardFor(state.receipt_id),
    head: `<link rel="preload" as="image" type="image/avif" href="${esc(ctx.href('/img/hero-siren.avif'))}" fetchpriority="high">`,
    ogImageAlt: `${brand.NAME} ${state.level}, ${state.level_name}, score ${scoreTxt} of 100`,
    showDegraded: true,
    jsonld: [webApplication(ctx), dataset(ctx), faq.jsonLd(ctx)],
    main,
  });
}

// ---------------------------------------------------------------------------
// The balance module
// ---------------------------------------------------------------------------

/**
 * _balance.mjs render(), behind two conditions once the module has loaded.
 *
 * hasBalance() is the module's own: both files parsed and the ledger carries
 * its two registers. ctx.routes.balance is build.mjs's: whether it wrote
 * /balance.html at all, which also depends on balancePage.mjs loading — a
 * fact this file cannot see. The drawing and the page are two files, so the
 * first can be here when the second is not, and the module's "See the whole
 * balance" link would then point at a 404. Absent ctx.routes — a harness
 * rendering the homepage on its own — hasBalance() stands by itself, as it
 * does for the route gates in layout.mjs.
 */
function balanceModule(ctx) {
  if (!balance) return '';
  if (ctx.routes && ctx.routes.balance === false) return '';
  if (!balance.hasBalance(ctx)) return '';
  return balance.render(ctx);
}

// ---------------------------------------------------------------------------
// The record section
// ---------------------------------------------------------------------------

/**
 * Cold start told as a design decision, not apologised for.
 *
 * A three-point history is the honest state of a new index and the chart has to
 * look deliberate at three points, not broken. The thing that makes it look
 * deliberate is the fixed 0-100 domain: the line is short because the record is
 * short, not because the axis gave up. Say that in words under the heading, so
 * the sentence carries the finding even if the SVG never paints.
 */
function recordLede(n) {
  if (n === 0) {
    return 'Nothing has been scored yet. The five bands below are the full range a score is measured '
      + 'against; the line starts at the first scored run and never gets rewritten.';
  }
  if (n === 1) {
    return 'One scored observation. A single point is a reading, not a trend, so no trend is drawn — '
      + 'but the whole 0–100 range is, which is what places that one reading.';
  }
  if (n < 12) {
    return `${n} scored observations so far. The y axis is fixed at 0–100 and never auto-scaled to the `
      + 'data, so a short record reads as short and a quiet day reads as quiet — a chart that zooms to '
      + 'fit turns a 0.4-point wiggle into a crisis.';
  }
  return `${n} scored observations. The y axis is fixed at 0–100 and never auto-scaled to the data, so `
    + 'the question this chart answers stays "where in the range", not "what shape is the noise".';
}

// The caption under the chart already prints the observation count, so this
// line says the thing the caption cannot: every point on it is auditable.
function recordKey(n) {
  if (n === 0) return 'The line starts at the first scored run.';
  return 'Every point on this line is written to a hash-chained receipt carrying its full inputs.';
}

// ---------------------------------------------------------------------------
// Source health
// ---------------------------------------------------------------------------

/**
 * Fourteen rows of which nine read "no baseline · no read" is a database dump.
 * The honesty is in the counts, and we already compute them for the strip's own
 * legend - docs/VISITORS.md §5.3. So the sentence is the section and the rows
 * are one press away, which loses nothing and returns about 300px of phone.
 *
 * The three states stay distinct and are never merged. A source awaiting a
 * baseline answered its request perfectly well; calling it dark would report an
 * outage that is not happening, and that is the same category error as pizzint
 * printing a confident DOUGHCON 5 over a scraper managing two runs a day, just
 * pointed the other way.
 */
/** One tally for the sentence and the bar, so the two cannot disagree. */
function healthTally(state) {
  const rows = Array.isArray(state.sources) ? state.sources : [];
  const cells = rows.map((s) => {
    const { status } = sourceStatus(s, state.generated_at);
    const kind = status === 'uncal' || status === 'dark' || status === 'stale' ? status : 'live';
    return { id: String(s.id ?? s.source ?? 'unnamed'), kind };
  });
  const n = (k) => cells.filter((c) => c.kind === k).length;
  return { cells, live: n('live'), stale: n('stale'), uncal: n('uncal'), dark: n('dark') };
}

/**
 * THE SOURCES, ONE CELL EACH. The sentence above says "4 live, 1 stale, 9
 * awaiting a baseline, of 14"; this draws the fourteen. One cell per source,
 * grouped by state and then by name so the order is stable across builds.
 *
 * State is carried by SHAPE before colour, because three of the four hues are
 * a green, an amber and a red: live is a solid cell, stale is a half-filled
 * one, awaiting-baseline is an empty outline - it answered, there is nothing
 * to fill it against - and dark is an outline struck through. The key beneath
 * repeats each shape with its word and its count, so the bar is readable in
 * greyscale and the counts survive a stylesheet that never loads.
 */
const HEALTH_KINDS = Object.freeze([
  ['live', 'live'], ['stale', 'stale'], ['uncal', 'awaiting a baseline'], ['dark', 'dark'],
]);

function healthBar(state) {
  const t = healthTally(state);
  if (!t.cells.length) return '';
  const order = HEALTH_KINDS.map(([k]) => k);
  const cells = t.cells.slice().sort((a, b) => (
    order.indexOf(a.kind) - order.indexOf(b.kind) || a.id.localeCompare(b.id)
  ));
  const word = Object.fromEntries(HEALTH_KINDS);
  const key = HEALTH_KINDS.filter(([k]) => t[k] > 0).map(([k, w]) => (
    `<li><i class="hb__c hb__c--${k}" aria-hidden="true"></i><b class="num">${esc(t[k])}</b> ${esc(w)}</li>`
  )).join('');
  return `<div class="hb">
    <ol class="hb__row" aria-label="Each of the ${esc(t.cells.length)} sources, by state">${cells.map((c) => (
      `<li class="hb__c hb__c--${esc(c.kind)}" title="${esc(c.id)}: ${esc(word[c.kind])}"><span class="vh">${esc(c.id)}: ${esc(word[c.kind])}</span></li>`
    )).join('')}</ol>
    <ul class="hb__key">${key}</ul>
  </div>`;
}

function healthSentence(state) {
  const rows = Array.isArray(state.sources) ? state.sources : [];
  if (!rows.length) return 'state.json reports no source health at all, so nothing on this page can be attributed to a named feed.';

  const { live, stale, uncal, dark } = healthTally(state);

  const bits = [`${live} live`];
  if (stale) bits.push(`${stale} stale`);
  if (uncal) bits.push(`${uncal} awaiting a baseline`);
  if (dark) bits.push(`${dark} dark`);

  const tail = dark
    ? 'A dark source failed to answer and is excluded from the composite, never imputed as a zero.'
    : uncal
      ? 'A source awaiting a baseline answered fine; there is simply no frozen reference to score it against yet, so it is published and not counted.'
      : 'Every source answered inside its window.';

  return `${bits.join(', ')}, of ${rows.length} sources. ${tail}`;
}

// ---------------------------------------------------------------------------
// Series plumbing
// ---------------------------------------------------------------------------

/**
 * Pillar history for one sparkline.
 *
 * ctx.seriesFor() is build.mjs's reader and it understands only a row whose
 * `pillars` is an ARRAY. collector/engine.mjs writes data/history.ndjson with
 * `pillars` as an OBJECT keyed by pillar id, so against the live log
 * ctx.seriesFor() returns [] for every pillar and every card prints "no history
 * yet" beside three scored observations we are holding in memory. A chart
 * claiming we have no data when we do is the same lie as a chart claiming we
 * have data when we do not, so the log is read here too, tolerantly, and the
 * builder's reader is still preferred whenever it produced anything.
 */
function seriesFor(ctx, id) {
  const fromCtx = typeof ctx.seriesFor === 'function' ? ctx.seriesFor(id) : null;
  if (Array.isArray(fromCtx) && fromCtx.length) return fromCtx;
  return seriesFromHistory(ctx.history, id);
}

function seriesFromHistory(history, id) {
  if (!Array.isArray(history)) return [];
  const out = [];
  for (const row of history.slice(-SPARK_POINTS)) {
    const p = row && row.pillars;
    if (!p) continue;
    let v = null;
    if (Array.isArray(p)) {
      const entry = p.find((x) => x && x.id === id);
      // A dark reading is a gap, not a zero. Dropping the point leaves a line
      // that connects across the outage, which is the honest shape: we are not
      // claiming to know what happened while the source was down.
      v = entry && entry.dark !== true ? entry.score : null;
    } else {
      v = p[id];
    }
    // typeof, never Number(). Number(null) is 0, so a coercing check turns a
    // pillar that reported nothing into a pillar that measured nothing.
    if (typeof v === 'number' && Number.isFinite(v)) out.push(v);
  }
  return out;
}

function sourcesForPillar(state, id) {
  if (!Array.isArray(state.sources)) return [];
  return state.sources.filter((s) => s && s.pillar === id);
}

/**
 * The plain-language read, for the largest group of people who arrive here.
 *
 * Pew (June 2025): 50% of US adults are more concerned than excited about AI,
 * against 10% more excited. YouGov (2026, n=18,238): 50% very or somewhat
 * concerned about AI ending humanity, up from 43% in June 2025. The modal
 * visitor is not an ML engineer — it is an ordinary anxious person who clicked
 * a frightening headline, and the 100-visitor study found that neither this
 * site nor pizzint says anything to them at all.
 *
 * This is the sentence that does. It states where today sits in our own record
 * and what the number is NOT, in words that need no key. It makes no
 * prediction, offers no reassurance we cannot support, and uses no future
 * tense.
 */
/**
 * The headline: one sentence, the number inside it, the unit and the
 * direction carried along. No future tense, no adjective the data did not
 * earn. When there is no score it says so - the absence is the headline.
 */
/**
 * THE BRAND'S OWN VOICE, UNDER THE HEADLINE. brand.mjs has carried an epithet
 * for every level since the first week - "Needle breathing" for ROUTINE, "Off
 * the top of the chart" for UNPRECEDENTED - and the best line the project has,
 * "Everyone has a p(doom). Nobody has a receipt." Measured 2026-10-03: neither
 * appeared anywhere on the homepage. The page was all instrument and no voice.
 *
 * Both are framing, and neither is a number: the epithet describes the needle,
 * never the world (docs/FEAR.md 11), and the hook is a claim about the category
 * that docs/METHODOLOGY.md backs. docs/VOICE.md 5: a joke in the framing plus
 * a straight number is a brand. The straight number is one line above.
 */
// The instruction is "none" at every level: the index counts activity, it does
// not tell anyone what to do about it. The second sentence is the level's.
const STANDING_ORDERS = {
  5: 'The needle is at rest. So is the duty officer.',
  4: 'Carry on. The kettle is on.',
  3: 'Read the pillar breakdown before the replies.',
  2: 'Check the receipt. Then check it again.',
  1: 'This is a count, not a siren. The arithmetic is below.',
};

// THE SENTENCE, IN SEVEN LANGUAGES. Only the headline and a one-line gist are
// translated; the level NAME stays in English because it is a code word that
// the cards, the feed and the API all print. The strip is hidden until its
// script runs, so without JavaScript the page is simply English.
const LANGS = [
  ['en', 'English', null, null],
  ['es', 'Español', 'La actividad de la IA está en SIREN {n} — {name}, en una escala donde 1 es lo más ruidoso.', 'SIREN cuenta cuánto está pasando en la IA, cada hora. No es una predicción.'],
  ['fr', 'Français', 'L’activité de l’IA est à SIREN {n} — {name}, sur une échelle où 1 est le plus bruyant.', 'SIREN compte ce qui se passe dans l’IA, chaque heure. Ce n’est pas une prédiction.'],
  ['de', 'Deutsch', 'Die KI-Aktivität steht bei SIREN {n} — {name}, auf einer Skala, auf der 1 am lautesten ist.', 'SIREN zählt stündlich, wie viel in der KI passiert. Es ist keine Vorhersage.'],
  ['pt', 'Português', 'A atividade de IA está em SIREN {n} — {name}, numa escala em que 1 é o mais ruidoso.', 'O SIREN conta, de hora em hora, quanto está a acontecer na IA. Não é uma previsão.'],
  ['ja', '日本語', 'AIの活動量は SIREN {n} — {name}。1が最も騒がしい尺度です。', 'SIRENはAIで起きていることの量を毎時数えます。予測ではありません。'],
  ['zh', '中文', 'AI 活动水平为 SIREN {n} — {name}，量表中 1 表示最喧闹。', 'SIREN 每小时统计 AI 领域发生了多少事。这不是预测。'],
];

function langStrip(state) {
  const fill = (t) => t.replace('{n}', String(state.level)).replace('{name}', String(state.level_name));
  const data = {};
  for (const [code, , h, g] of LANGS) if (h) data[code] = [fill(h), g];
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return `<p class="hero__gist" id="hero-gist" hidden></p>
  <p class="hero__lang" id="hero-lang" hidden><span>Read it in</span>${LANGS.map(([code, label]) => `<button type="button" lang="${code}" data-l="${code}"${code === 'en' ? ' aria-pressed="true"' : ' aria-pressed="false"'}>${esc(label)}</button>`).join('')}</p>
  <script>(function(){var T=${json},h=document.querySelector('.hero__headline'),g=document.getElementById('hero-gist'),w=document.getElementById('hero-lang');
if(!h||!g||!w)return;var en=h.textContent;w.hidden=false;
function set(l){var t=T[l];h.textContent=t?t[0]:en;h.lang=l;g.textContent=t?t[1]:'';g.lang=l;g.hidden=!t;
[].forEach.call(w.querySelectorAll('button'),function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-l')===l));});
try{localStorage.setItem('dc-lang',l);}catch(e){}}
w.addEventListener('click',function(e){var b=e.target.closest('button');if(b)set(b.getAttribute('data-l'));});
try{var s=localStorage.getItem('dc-lang');if(s&&T[s])set(s);}catch(e){}})();</script>`;
}

// THE ANSWER. The site's job, said first: should a person care about AI today?
// The verdict is a fixed phrase per level, so it is the reading in plain words
// and never somebody's mood. The sentence under it is assembled from the same
// state: which pillar is loudest and how the score compares with a day ago.
// "Care" here means "is it worth your attention", which is what tempo is; it
// is never a statement that things are going well or badly.
const VERDICT = {
  5: ['No.', 'The siren is silent.'],
  4: ['Not really.', 'A normal day. The siren is off.'],
  3: ['A little.', 'Busier than usual.'],
  2: ['Yes.', 'A lot is happening.'],
  1: ['Yes.', 'The siren is at full volume.'],
};
const PILLAR_PLAIN = {
  capability: 'new models, papers and code',
  compute: 'chips, data centres and money',
  attention: 'headlines and searches',
  governance: 'rules and regulators',
  markets: 'market prices',
};

function loudest(state) {
  const scored = (state.pillars || []).filter((x) => Number.isFinite(x.score) && !x.dark && !x.uncalibrated);
  return scored.length ? scored.reduce((a, b) => (b.score > a.score ? b : a)) : null;
}

function answer(ctx) {
  const st = ctx.state;
  const n = Array.isArray(ctx.history) ? ctx.history.length : null;
  const meta = `<p class="ans__meta"><span class="ans__live">Live</span>${n ? `<span>Reading No.&nbsp;${esc(n)}</span>` : ''}<span>Observed <time datetime="${esc(st.generated_at)}">${esc(utc(st.generated_at))}</time></span><span>A count, not a forecast</span></p>`;
  if (!Number.isFinite(st.score) || !VERDICT[st.level]) {
    return `<p class="ans__q">Should you care about AI today?</p>
  <h1 class="ans__a"><b>No reading.</b> <span>Not enough sources reported to say.</span></h1>
  ${meta}`;
  }
  const [yes, gloss] = VERDICT[st.level];
  const top = loudest(st);
  const d = ctx.vsYesterday;
  const bits = [];
  if (top) bits.push(`The loudest part is ${top.name.toLowerCase()} (${PILLAR_PLAIN[top.id] || top.name.toLowerCase()}), at ${num(top.score, 1)} of 100.`);
  if (d && Number.isFinite(d.delta)) {
    const mag = Math.abs(d.delta);
    const when = d.basis === 'previous' ? `since ${d.label}` : `than ${d.label}`;
    bits.push(mag < 1 ? `The overall score is about where it was ${d.basis === 'previous' ? `at ${d.label}` : d.label}.`
      : `The overall score is ${num(mag, 1)} ${d.delta > 0 ? 'higher' : 'lower'} ${when}.`);
  }
  return `<p class="ans__q">Should you care about AI today?</p>
  <h1 class="ans__a" style="--lvl:var(--heat-${esc(st.level)})"><b>${esc(yes)}</b> <span>${esc(gloss)}</span></h1>
  <p class="ans__why">AI activity is at level ${esc(st.level)} on a scale where 5 is quiet and 1 is loudest. ${esc(bits.join(' '))}</p>
  <p class="ans__cta">${brand.X_URL ? `<a class="cta cta--pri" href="${esc(brand.X_URL)}" rel="noopener">Get the alert on X</a>` : ''}<a class="cta cta--sec" href="#war-room">See why <span aria-hidden="true">›</span></a></p>
  <p class="hero__badge" aria-hidden="true">${mascot({ size: 44, level: st.level })}<span class="hero__badge-t"><b>${esc(brand.NAME)} ${esc(st.level)}</b><span>${esc(st.level_name)} · ${esc(num(st.score, 1))} of 100</span></span></p>
  ${meta}`;
}

// THE WALL. The terminal: every instrument the site runs, as one tile with one
// glowing number and a link to the page behind it. A tile whose data is absent
// is not drawn; nothing here is a placeholder.
// THE SOURCE STRIP. Where a product page puts its customers' logos, this page
// puts where the number comes from. Names only, taken from the sources the
// current reading lists; a source the reading does not carry is not named.
const SOURCE_NAMES = {
  arxiv: 'arXiv', 'github-releases': 'GitHub', huggingface: 'Hugging Face', openrouter: 'OpenRouter',
  'sec-fts': 'SEC filings', stockanalysis: 'StockAnalysis', vastai: 'Vast.ai', hn: 'Hacker News',
  wikipedia: 'Wikipedia', 'federal-register': 'Federal Register', govuk: 'GOV.UK', kalshi: 'Kalshi',
  manifold: 'Manifold', polymarket: 'Polymarket',
};
function sourceStrip(st) {
  const src = (Array.isArray(st.sources) ? st.sources : []).filter((x) => x && x.id && (x.ok || x.uncalibrated));
  if (src.length < 3) return '';
  const names = src.map((x) => x.label || SOURCE_NAMES[x.id] || x.id);
  return `<div class="srcs" aria-label="Sources read for this reading"><span class="srcs__k">Read from ${names.length} public sources</span><ul class="srcs__l">${names.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></div>`;
}

// THE WAR ROOM. Every instrument at once, as panels on one wall, each with a
// name, a live number and a door to the page behind it. The operator asked
// for the competitor's density with better navigation, so the bar across the
// top jumps to any panel and each panel's header opens its page. A panel
// whose data is absent is not drawn; nothing here is a placeholder, and no
// number is computed here that its own page does not also print.
const WR_HUE = { signal: 'var(--lvl, var(--accent))', pillars: '#ff7a00', news: '#00a3ff', race: '#00e676', flock: '#00e5ff', datacenters: '#c9a0ff', exploits: '#ff5f56', leaders: '#ffb020', people: '#ff73c8', bets: '#8b9cff', corrob: '#5fd08a', brief: '#ffd166' };
const WR_NAME = { race: 'The race', flock: 'Cameras', datacenters: 'Machines', exploits: 'Exploits', news: 'Corroboration', leaders: 'Leaders' };
function warRoom(ctx) {
  const st = ctx.state;
  if (!Number.isFinite(st.score)) return '';
  const panels = [];
  const panel = (id, name, href, body, { wide = false, meta = '' } = {}) => panels.push({ id, name,
    html: `<article class="wr__p${wide ? ' wr__p--w' : ''}" id="wr-${esc(id)}" tabindex="-1" style="--ph:${WR_HUE[id] || 'var(--accent)'}">
    <header class="wr__ph"><span class="wr__dot" aria-hidden="true"></span><h3 class="wr__pn">${esc(name)}</h3>${meta ? `<span class="wr__pm">${esc(meta)}</span>` : ''}<a class="wr__go" href="${esc(href)}" aria-label="Open ${esc(name)}">Open →</a></header>
    <div class="wr__pb">${body}</div></article>` });

  // SIGNAL: the score and its own recent record, drawn on the range it used.
  const rows = (Array.isArray(ctx.history) ? ctx.history : []).slice(-72).filter((r) => Number.isFinite(r.score));
  let spark = '';
  if (rows.length >= 4) {
    const vals = rows.map((r) => r.score);
    const lo = Math.floor(Math.min(...vals) - 2); const hi = Math.ceil(Math.max(...vals) + 2);
    const pts = vals.map((v, i) => `${((i / (vals.length - 1)) * 300).toFixed(1)},${(70 - ((v - lo) / (hi - lo)) * 64 - 3).toFixed(1)}`);
    spark = `<svg class="wr__spark" viewBox="0 0 300 70" preserveAspectRatio="none" role="img" aria-label="The score over the last ${vals.length} readings, between ${lo} and ${hi} of 100; now ${esc(num(st.score, 1))}"><polygon points="0,70 ${pts.join(' ')} 300,70"/><polyline points="${pts.join(' ')}"/></svg>
      <p class="wr__ax"><span>Last ${vals.length} readings</span><span>axis ${lo}–${hi} of 100</span></p>`;
  }
  const d = ctx.vsYesterday;
  const delta = d && Number.isFinite(d.delta) ? `${d.delta > 0 ? '▲ +' : d.delta < 0 ? '▼ −' : '■ '}${num(Math.abs(d.delta), 1)} ${d.basis === 'previous' ? `since ${d.label}` : `vs ${d.label}`}` : '';
  panel('signal', 'Signal', ctx.href('/instruments.html#record'),
    `<p class="wr__big"><b class="num">${esc(num(st.score, 1))}</b><span>/ 100 · ${esc(brand.NAME)} ${esc(st.level)} · ${esc(st.level_name)}</span></p>${delta ? `<p class="wr__d">${esc(delta)}</p>` : ''}${spark}`,
    { wide: true, meta: `observed ${utc(st.generated_at)}` });

  // THE BRIEF: what a reader would be told if they asked "anything I should
  // know?" - each line a number this page already prints, with the comparison
  // spelled out. Lines whose data is absent are left out, not padded.
  {
    const lines = [];
    const sinceDay = st.level_since && Number.isFinite(Date.parse(st.level_since)) ? String(st.level_since).slice(0, 10) : null;
    lines.push(`<b>Level ${esc(st.level)}, ${esc(st.level_name)}.</b> ${esc(num(st.score, 1))} of 100${sinceDay ? `, at this level since ${esc(sinceDay)}` : ''}.`);
    if (d && Number.isFinite(d.delta)) {
      const mag = Math.abs(d.delta);
      lines.push(`<b>${mag < 1 ? 'Barely moved' : d.delta > 0 ? 'Louder' : 'Quieter'}.</b> ${mag < 1 ? 'Within a point of' : `${esc(num(mag, 1))} ${d.delta > 0 ? 'above' : 'below'}`} the reading ${esc(d.basis === 'previous' ? `at ${d.label}` : d.label)}.`);
    }
    const hist = Array.isArray(ctx.history) ? ctx.history : [];
    const ref = d && d.reference_at ? hist.find((r) => r.generated_at === d.reference_at) : null;
    const now = hist.length ? hist[hist.length - 1] : null;
    if (ref && ref.pillars && now && now.pillars) {
      let best = null;
      for (const p of brand.PILLARS) {
        const a0 = ref.pillars[p.id]; const a1 = now.pillars[p.id];
        if (!Number.isFinite(a0) || !Number.isFinite(a1)) continue;
        if (!best || Math.abs(a1 - a0) > Math.abs(best.dv)) best = { p, dv: a1 - a0, v: a1 };
      }
      if (best && Math.abs(best.dv) >= 0.1) lines.push(`<b>${esc(best.p.name)} moved most.</b> Now ${esc(num(best.v, 1))}, ${best.dv > 0 ? 'up' : 'down'} ${esc(num(Math.abs(best.dv), 1))} over the same span.`);
    }
    const all = ctx.news && Array.isArray(ctx.news.items) ? ctx.news.items : [];
    if (all.length) {
      const lead = [...all].sort((x, y) => Number(y.score) - Number(x.score) || String(x.id).localeCompare(String(y.id)))[0];
      lines.push(`<b>Top story.</b> <a href="${esc(lead.url)}" rel="noopener">${esc(lead.title)}</a> <span>(${esc(lead.source)})</span>`);
    }
    const lead2 = ctx.race && Array.isArray(ctx.race.players)
      ? ctx.race.players.filter((p) => p && p.market && p.market.state === 'live' && Number.isFinite(p.market.probability)).sort((x, y) => y.market.probability - x.market.probability || String(x.id).localeCompare(String(y.id)))[0] : null;
    if (lead2) lines.push(`<b>The race.</b> ${esc(lead2.name)} leads the market at ${esc(num(lead2.market.probability * 100, 1))}%.`);
    if (lines.length >= 3) panel('brief', 'The brief', ctx.href('/digest.html'), `<ul class="wr__brief">${lines.map((l) => `<li>${l}</li>`).join('')}</ul>`, { wide: true, meta: 'thirty seconds' });
  }

  // PILLARS: the five, as bars on the same 0-100 scale.
  const last = Array.isArray(ctx.history) && ctx.history.length ? ctx.history[ctx.history.length - 1] : null;
  if (last && last.pillars) {
    const li = brand.PILLARS.map((p) => {
      const v = last.pillars[p.id];
      return Number.isFinite(v)
        ? `<li><span class="wr__bn">${esc(p.name)}</span><span class="wr__bt"><i style="width:${Math.max(0, Math.min(100, v)).toFixed(1)}%"></i></span><b class="num">${esc(num(v, 1))}</b></li>`
        : `<li class="wr__bx"><span class="wr__bn">${esc(p.name)}</span><span class="wr__bt"></span><b>no baseline</b></li>`;
    }).join('');
    panel('pillars', 'The five pillars', ctx.href('/instruments.html'), `<ul class="wr__bars">${li}</ul><p class="wr__ax"><span>Each of 100</span><span>this reading</span></p>`);
  }

  // NEWSROOM: the five highest-scoring stories, as their publishers wrote them.
  const items = ctx.news && Array.isArray(ctx.news.items) ? ctx.news.items : [];
  if (items.length) {
    const top = [...items].sort((a, b) => Number(b.score) - Number(a.score) || String(a.id).localeCompare(String(b.id))).slice(0, 5);
    panel('news', 'Newsroom', ctx.href('/news.html'),
      `<ol class="wr__news">${top.map((i) => `<li><b class="num">${esc(num(Number(i.score), 0))}</b><a href="${esc(i.url)}" rel="noopener">${esc(i.title)}</a><span>${esc(i.source)}</span></li>`).join('')}</ol>`,
      { wide: true, meta: `${items.length} scored` });
  }

  // ONE PANEL PER CLAIM: the same sentence its own page leads with.
  for (const c of claims.claims(ctx)) {
    if (c.id === 'news' && c.state !== 'live') continue;
    const body = c.state === 'live'
      ? `<p class="wr__big wr__big--c"><b class="num">${esc(c.num)}</b></p><p class="wr__s">${esc(claims.sentenceOf(c))}</p>`
      : `<p class="wr__s wr__s--dark">${esc(c.text)}</p>`;
    let extra = '';
    if (c.id === 'race' && c.state === 'live' && ctx.race && Array.isArray(ctx.race.players)) {
      // The market's own ranking, top four live legs, on one 0-100% scale.
      const legs = ctx.race.players.filter((p) => p && p.market && p.market.state === 'live' && Number.isFinite(p.market.probability))
        .sort((x, y) => y.market.probability - x.market.probability || String(x.id).localeCompare(String(y.id))).slice(0, 4);
      if (legs.length >= 2) extra = `<ul class="wr__bars wr__bars--race">${legs.map((p) => `<li><span class="wr__bn">${esc(p.name)}</span><span class="wr__bt"><i style="width:${(p.market.probability * 100).toFixed(1)}%"></i></span><b class="num">${esc(num(p.market.probability * 100, 1))}%</b></li>`).join('')}</ul>`;
    }
    panel(c.id === 'news' ? 'corrob' : c.id, WR_NAME[c.id] || c.id, c.href, body + extra);
  }

  // PEOPLE: the two questions everyone asks, as the registers record them.
  const jobs = topicLead(ctx, 'jobs'); const med = topicLead(ctx, 'medicine');
  if (jobs || med) {
    const row = (t, href, label) => (t ? `<a class="wr__kv" href="${esc(ctx.href(href))}"><span>${esc(label)}</span><b class="num">${esc(Number.isFinite(Number(t.value)) ? Number(t.value).toLocaleString('en-US') : t.value)}</b><em>${esc(t.unit)}</em></a>` : '');
    panel('people', 'Jobs & medicine', ctx.href('/jobs.html'), `${row(jobs, '/jobs.html', 'Jobs')}${row(med, '/medicine.html', 'Medicine')}`);
  }

  // BETS: base rates about the index itself, scored when they come due.
  if (ctx.bets && Array.isArray(ctx.bets.open) && ctx.bets.open.length) {
    panel('bets', 'Tally’s bets', ctx.href('/bets.html'),
      `<ul class="wr__bets">${ctx.bets.open.slice(0, 3).map((b) => `<li><b class="num">${esc(num(b.p * 100, 0))}%</b><span>${esc(b.statement)}</span></li>`).join('')}</ul>`,
      { meta: `${ctx.bets.summary ? ctx.bets.summary.resolved : 0} settled` });
  }

  const n = Array.isArray(ctx.history) ? ctx.history.length : null;
  return `<section class="wr" id="war-room" aria-labelledby="wr-h" style="--lvl:var(--heat-${esc(st.level)})">
  <div class="wr__top">
    <h2 class="wr__h" id="wr-h"><span class="wr__live" aria-hidden="true"></span>War room</h2>
    <p class="wr__k">${n ? `Reading no. ${esc(n)} · ` : ''}${panels.length} panels<span class="wr__age" data-at="${esc(st.generated_at)}"></span><span class="wr__keys"> · keys 1–${Math.min(9, panels.length)} jump</span></p>
    <a class="wr__new" href="${esc(ctx.href('/'))}" hidden>New reading in · reload</a>
    <nav class="wr__nav" aria-label="Jump to a panel">${panels.map((p) => `<a href="#wr-${esc(p.id)}" style="--ph:${WR_HUE[p.id] || 'var(--accent)'}">${esc(p.name)}</a>`).join('')}</nav>
  </div>
  <div class="wr__grid">
${panels.map((p) => p.html).join('\n')}
  </div>
</section>`;
}

// THE CLOSE. Every page worth copying ends on one line and one action instead
// of trailing off into its footer. The line states today's level; it promises
// nothing about tomorrow's.
function closer(ctx) {
  const st = ctx.state;
  if (!brand.X_URL || !Number.isFinite(st.score)) return '';
  const v = VERDICT[st.level];
  return `<section class="close rv" aria-label="Follow for level changes" style="--lvl:var(--heat-${esc(st.level)})">
  <h2 class="close__h">${esc(v ? v[1] : `${brand.NAME} ${st.level}.`)} <span>Hear it the hour that changes.</span></h2>
  <p class="close__p">One post when the level moves, with the receipt. Nothing in between.</p>
  <p class="ans__cta"><a class="cta cta--pri" href="${esc(brand.X_URL)}" rel="noopener">Follow ${esc(brand.X_HANDLE)}</a><a class="cta cta--sec" href="${esc(ctx.href('/feed-level.xml'))}">Level alerts by RSS <span aria-hidden="true">›</span></a></p>
</section>`;
}


// THE FIVE CARDS. One per pillar, each with a bar for every recent reading:
// the competitor's signature graphic (a bar chart per pizza shop), drawn for
// the five things this index counts. The chip compares the newest reading with
// the median of the bars shown, in words, and a pillar with no score is
// printed as waiting, never as zero.

// WHAT HAPPENED. The three highest-scoring stories in the window, verbatim,
// so "should I care" comes with the reasons a person can read for themselves.

// FOUR NUMBERS, SET LARGE. What the site is, as counts a stranger can check:
// how many readings exist, how many sources answered this hour, how many
// receipts the verify button walks, and how many ads or trackers it carries.
// The last one is zero by construction, which is why it is printed.
function statStrip(ctx) {
  const st = ctx.state;
  const readingsN = Array.isArray(ctx.history) ? ctx.history.length : null;
  const src = Array.isArray(st.sources) ? st.sources : [];
  // Same definition as the status rail: answered, whether or not it is scored yet.
  const ok = src.filter((x) => x && (x.ok || x.uncalibrated)).length;
  const cells = [
    readingsN ? [readingsN.toLocaleString('en-US'), 'readings published, each with a receipt'] : null,
    src.length ? [`${ok}/${src.length}`, 'sources reporting this hour'] : null,
    ['12', 'receipts your browser can re-check in one click'],
    ['0', 'ads, trackers or cookies'],
  ].filter(Boolean);
  return `<section class="stat" aria-label="${esc(brand.NAME)} in four numbers">
  ${cells.map(([v, k]) => `<p class="stat__c"><b class="stat__n num">${esc(v)}</b><span class="stat__k">${esc(k)}</span></p>`).join('')}
</section>`;
}

// THE CLOCK AND THE EXPLAINERS. The reading as a clock face, beside the three
// pages that answer what people type into a search box.
function explainers(ctx) {
  const card = (href, q, a) => `<a class="xp__c" href="${esc(ctx.href(href))}"><b>${esc(q)}</b><span>${esc(a)}</span><i>Read →</i></a>`;
  return `<section class="sec xp" id="clock" aria-labelledby="xp-h">
  <h2 class="sec__h" id="xp-h">The reading, as a clock</h2>
  <p class="lede">Everyone asks for a doomsday clock. This is the honest version: one hand, showing how loud AI is right now, that you can check.</p>
  <div class="xp__grid">
    ${tempoClock(ctx, { size: 280 })}
    <div class="xp__l">
      ${card('/ai-doomsday-clock.html', 'Is there an AI doomsday clock?', 'What exists, who sets it, and the one you can verify.')}
      ${card('/p-doom.html', 'What is p(doom)?', 'The probability-of-doom number, and why nobody can check one.')}
      ${card('/guide.html', 'SIREN vs DEFCON vs the Clock', 'Five numbers side by side, and what each one measures.')}
    </div>
  </div>
</section>`;
}

// THE ONE PICTURE THE SITE HAS. Five large drawings of the mascot, one per
// level, with the current one lit. It is also the scale explained without a
// chart: read left to right and the bird gets louder.
function meetTally(ctx) {
  const cur = Number.isFinite(ctx.state.level) ? ctx.state.level : null;
  const levels = [...brand.LEVELS].sort((a, b) => b.level - a.level);
  return `<section class="sec mt" id="tally" aria-labelledby="mt-h">
  <h2 class="sec__h" id="mt-h">Meet Tally</h2>
  <p class="lede">The duty canary keeps the count. The helmet is the level's colour and the face is the level's mood, so one look tells you how loud things are.${cur ? ` Today Tally is ${esc(MOODS[cur])}.` : ''}</p>
  <ol class="mt__l">
${levels.map((l) => `    <li class="mt__i${l.level === cur ? ' mt__i--on' : ''}" style="--lvl:var(--heat-${l.level})"${l.level === cur ? ' aria-current="true"' : ''}>
      ${mascot({ size: 132, level: l.level })}
      <b class="mt__n">${esc(l.level)} · ${esc(l.name)}</b><span class="mt__m">${esc(MOODS[l.level])}</span>
    </li>`).join('\n')}
  </ol>
  <p class="fresh__key"><a href="${esc(ctx.href('/bets.html'))}">Tally's bets: scored forecasts →</a> · <a href="${esc(ctx.href('/desk.html'))}">Tally's desk: the unserious counts →</a> · <a href="${esc(ctx.href('/game.html'))}">Play Tally Counts →</a></p>
</section>`;
}

// THE MAP, ON THE FRONT PAGE. The competitor's globe is a destination; ours
// was two clicks down. This is the /world figure itself, drawn by the same
// function from the same file, with the count in the sentence above it so the
// number is text and not only dots.
function homeMap(ctx) {
  if (!(ctx.routes && ctx.routes.world && ctx.world && ctx.worldOutline)) return '';
  let m;
  try { m = worldModel(ctx.world, ctx.worldOutline); } catch { return ''; }
  const t = ctx.world.totals || {};
  const q = (ctx.world.copy && ctx.world.copy.headline_qualifier) || 'as mapped in OpenStreetMap';
  const n = (v) => Number(v).toLocaleString('en-US');
  // A PICTURE, NOT THE INSTRUMENT. The full /world figure is 921 KB of markup
  // (one titled marker per site) and put the front page at 1.3 MB when it was
  // embedded here. This is the same projection drawn light: the land as one
  // path with every other vertex of the long rings, and the sites binned into
  // 5-unit cells with the dot sized by how many fall in each. The count stays
  // in the sentence above, and the real map is one link away.
  const land = m.lands.map(({ polys }) => polys.map((poly) => {
    const pts = poly.length > 24 ? poly.filter((_, k) => k % 2 === 0) : poly;
    return pts.map((pt, k) => `${k === 0 ? 'M' : 'L'}${Math.round(pt[0])} ${Math.round(pt[1])}`).join('') + 'Z';
  }).join('')).join('');
  const CELL = 5; const bins = new Map();
  for (const pin of m.pins) {
    const key = `${Math.floor(pin.x / CELL)},${Math.floor(pin.y / CELL)}`;
    bins.set(key, (bins.get(key) || 0) + 1);
  }
  const dots = [...bins.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([key, c]) => {
    const [bx, by] = key.split(',').map(Number);
    const r = Math.min(6, 1.1 + Math.sqrt(c) * 0.55);
    return `<circle cx="${bx * CELL + CELL / 2}" cy="${by * CELL + CELL / 2}" r="${r.toFixed(1)}"/>`;
  }).join('');
  return `<section class="sec hmap" id="where" aria-labelledby="hmap-h">
  <h2 class="sec__h" id="hmap-h">Where the machines live</h2>
  <p class="lede"><b>${esc(n(t.sites))}</b> datacentre sites in <b>${esc(n(t.countries_with_sites))}</b> countries, ${esc(q)}.
    ${esc(n(t.countries_with_none))} countries have none mapped, which means nobody has mapped one there, not that none exists.</p>
  <figure class="hmap__ph">
    <picture><source type="image/avif" srcset="${esc(ctx.href('/img/datacentre-night.avif'))}">
    <img src="${esc(ctx.href('/img/datacentre-night.jpg'))}" width="1920" height="1080" loading="lazy" decoding="async" alt="A large data centre campus lit up at night, seen from the air"></picture>
    <figcaption><b class="num">${esc(n(t.sites))}</b><span>of these, mapped so far. Illustration: generated image, not a real site.</span></figcaption>
  </figure>
  <a class="hmap__a" href="${esc(ctx.href('/world.html'))}" aria-label="Open the world map of datacentre sites">
    <svg class="hmap__svg" viewBox="0 0 1000 451" role="img" aria-label="World map with a dot wherever datacentre sites are mapped; larger dots mean more sites close together">
      <path class="hmap__land" d="${land}"/><g class="hmap__dots">${dots}</g>
    </svg>
  </a>
  <p class="fresh__key">Dots are sites grouped by area; bigger means more. <a href="${esc(ctx.href('/world.html'))}">The full map, every site and country →</a> ·
    <a href="${esc(ctx.href('/map.html'))}">US sites, drought and the grid →</a> · <a href="${esc(ctx.href('/flock.html'))}">Cameras →</a></p>
</section>`;
}

// WHY FOLLOW. The site cannot tap anyone on the shoulder: it is a static page
// with no accounts and no notifications. The X account is the only channel
// that reaches a reader who is not looking, so this band says exactly what is
// posted there and nothing it does not do.
// THE MARKETS BAND. The stock picks, the big-investor tracker and the AI
// battle live on /arena.html, on their own data branches, refreshed through the
// trading day, which is faster than this page is rebuilt. So the band is a
// server-rendered shell with working links that a small script fills from
// scanner-data/picks.json (the same engine the picks page runs, summarized by
// the scanner workflow). Without the script the links still go everywhere.
function picksBand(ctx) {
  const arena = ctx.href('/arena.html');
  const RAW = 'https://raw.githubusercontent.com/messagegabrielhere-lgtm/doomcon';
  return `<section class="sec mkb" id="picks" aria-labelledby="mkb-h">
<style>
.mkb{border:1px solid var(--line, rgba(127,127,127,.3));border-left:5px solid #e2a03b;border-radius:10px;padding:var(--s-4, 18px);margin-block:var(--s-4, 18px)}
.mkb__hd{display:flex;flex-wrap:wrap;gap:6px 16px;align-items:baseline;justify-content:space-between}
.mkb__hd h2{margin:0}
.mkb__k{font-family:var(--mono);font-size:var(--t-2xs, 11px);letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint, #888);margin:0}
.mkb__top{display:grid;gap:14px;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);margin-top:12px}
.mkb__potd{display:block;text-decoration:none;color:inherit;padding:14px 16px;border-radius:8px;background:color-mix(in srgb,#e2a03b 12%,transparent);border:1px solid color-mix(in srgb,#e2a03b 45%,transparent)}
.mkb__potd:hover,.mkb__card:hover{border-color:#e2a03b}
.mkb__potd small,.mkb__card small{font-family:var(--mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#b06d10}
.mkb__potd b.tk{display:block;font-size:clamp(34px,5vw,52px);line-height:1;margin:6px 0 2px;letter-spacing:.01em}
.mkb__potd .nm{opacity:.8}
.mkb__potd .st{margin-top:8px;font-family:var(--mono);font-size:13px}
.mkb__list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.mkb__list a{display:flex;justify-content:space-between;gap:10px;padding:8px 12px;border-radius:8px;border:1px solid var(--line, rgba(127,127,127,.3));text-decoration:none;color:inherit;font-family:var(--mono);font-size:13px}
.mkb__list a:hover{border-color:#e2a03b}
.mkb__two{display:grid;gap:14px;grid-template-columns:1fr 1fr;margin-top:14px}
.mkb__two>*{min-width:0} /* a grid item would otherwise grow to its longest nowrap line: 714px on a 390px phone */
.mkb__card{display:flex;flex-direction:column;gap:8px;text-decoration:none;color:inherit;padding:14px 16px;border-radius:8px;border:1px solid var(--line, rgba(127,127,127,.3))}
.mkb__card h3{margin:0;font-size:18px;line-height:1.15}
.mkb__rows{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:5px;font-size:13.5px}
.mkb__rows li{display:flex;justify-content:space-between;gap:10px;align-items:baseline}
.mkb__rows li span:first-child{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mkb__rows li span:last-child{font-family:var(--mono);font-size:12.5px;white-space:nowrap}
.mkb__rows b{font-family:var(--mono)}
.mkb__card .ft{font-size:12px;opacity:.72;margin-top:auto}
.mkb__card .cta{font-weight:600;font-size:13.5px}
.mkb__up{color:#0f9d7a}.mkb__dn{color:#d2483f}
.mkb__go{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.mkb__go a{padding:8px 14px;border-radius:999px;border:1px solid var(--line, rgba(127,127,127,.35));text-decoration:none;color:inherit;font-weight:600;font-size:14px}
.mkb__go a.pri{background:#e2a03b;border-color:#e2a03b;color:#14110a}
.mkb__note{margin:12px 0 0;font-size:12px;opacity:.75}
@media (max-width:720px){.mkb__top,.mkb__two{grid-template-columns:1fr}}
</style>
  <div class="mkb__hd">
    <h2 class="sec__h" id="mkb-h">Markets: today's picks, big investors, AI battle<span class="sec__eb">Markets</span></h2>
    <p class="mkb__k" id="mkb-as">Daily screen · disclosed trades · paper-money AI battle</p>
  </div>
  <div class="mkb__top">
    <a class="mkb__potd" id="mkb-potd" href="${esc(arena)}">
      <small>&#9733; Pick of the day</small>
      <b class="tk" id="mkb-tk">See today's picks</b>
      <span class="nm" id="mkb-nm">A fixed RSI(2) pullback screen of about 150 large US stocks, with every past pick scored.</span>
      <div class="st" id="mkb-st"></div>
    </a>
    <ul class="mkb__list" id="mkb-list" aria-label="The other picks"></ul>
  </div>
  <div class="mkb__two">
    <a class="mkb__card" href="${esc(arena)}#investors">
      <small>Big investors</small>
      <h3>What Pelosi, Burry, Cathie Wood and Buffett disclosed</h3>
      <ul class="mkb__rows" id="mkb-inv"><li><span>13F holdings, ARK's daily trades and House trade reports, from the filings.</span></li></ul>
      <span class="cta">All disclosed trades →</span>
      <span class="ft">Filings are delayed: up to 45 days after a trade or a quarter.</span>
    </a>
    <a class="mkb__card" href="${esc(arena)}#battle">
      <small>AI battle</small>
      <h3 id="mkb-bt">AI models trading paper money</h3>
      <ul class="mkb__rows" id="mkb-bat"><li><span>Crypto and US stocks at live prices; a server checks every trade against fixed rules.</span></li></ul>
      <span class="cta">The standings and every trade →</span>
      <span class="ft" id="mkb-bft">Paper money: prices are real, fills and wallets are simulated.</span>
    </a>
  </div>
  <div class="mkb__go">
    <a class="pri" href="${esc(arena)}">All picks and the track record →</a>
    <a href="${esc(arena)}#investors">Big investors</a>
    <a href="${esc(arena)}#battle">AI battle</a>
    <a href="${esc(ctx.href('/scanner.html'))}">Scanner</a>
  </div>
  <p class="mkb__note" id="mkb-rec">Picks come from an automated, hypothetical screen. Not financial advice; we are not financial advisors.</p>
<script>
(function(){
  var RAW = ${JSON.stringify(RAW)}, arena = ${JSON.stringify(arena)};
  var $ = function(id){ return document.getElementById(id); };
  var esc = function(s){ return String(s == null ? "" : s).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); };
  var sg = function(x, d){ return (x >= 0 ? "+" : "") + x.toFixed(d == null ? 2 : d) + "%"; };
  var day = function(d){ return new Date(d + "T12:00:00Z").toLocaleDateString("en-US", {weekday:"short", month:"short", day:"numeric", timeZone:"UTC"}); };
  var usd = function(x){ var a = Math.abs(x); return (x < 0 ? "-" : "+") + "$" + (a >= 1e9 ? (a / 1e9).toFixed(1) + "B" : a >= 1e6 ? (a / 1e6).toFixed(0) + "M" : (a / 1e3).toFixed(0) + "K"); };
  var get = function(path){ return fetch(RAW + path + "?t=" + Math.floor(Date.now() / 60e3), {cache:"no-store"}).then(function(r){ return r.ok ? r.json() : null; }).catch(function(){ return null; }); };
  function live(p){
    var L = p.live || {};
    if(L.state === "target") return '<span class="mkb__up">Target hit ' + sg(L.ret) + '</span>';
    if(L.state === "stop") return '<span class="mkb__dn">Stop hit ' + sg(L.ret) + '</span>';
    if(L.state === "running" || L.state === "closed") return '<span class="' + (L.now >= 0 ? "mkb__up" : "mkb__dn") + '">' + (L.state === "running" ? "Now " : "Closed ") + sg(L.now) + ' since the open</span>';
    return '<span>Buy at the open · target +' + p.targetPct.toFixed(2) + '%</span>';
  }
  get("/scanner-data/picks.json").then(function(d){
    if(!d) return;
    var P = d.picks || [], top = P[0];
    $("mkb-as").textContent = "Picks for " + day(d.tradeDay) + " · from the close of " + day(d.closeOf);
    if(top){
      $("mkb-tk").textContent = top.s;
      $("mkb-nm").textContent = (top.n || "") + (top.sec ? " · " + top.sec : "") + " · RSI(2) " + top.rsi2.toFixed(1) + ", in an uptrend";
      $("mkb-st").innerHTML = live(top) + " · sell by " + esc(day(d.sellBy)) + " open";
    }else{
      $("mkb-tk").textContent = "No picks today";
      $("mkb-nm").textContent = "Nothing passed the screen at the close of " + day(d.closeOf) + ". Sitting out is part of the rule.";
    }
    $("mkb-list").innerHTML = P.slice(1).map(function(p){ return '<li><a href="' + esc(arena) + '"><b>' + esc(p.s) + '</b>' + live(p) + '</a></li>'; }).join("");
    var s = d.stats || {};
    if(s.sessions) $("mkb-rec").textContent = "Picks track record over " + s.sessions + " sessions, hypothetical: " + s.winRate.toFixed(1) + "% of picks won, " + (s.avgRet >= 0 ? "+" : "") + s.avgRet.toFixed(2) + "% a pick after costs; $1,000 following every pick became $" + s.equity.toLocaleString("en-US") + " vs $" + s.bench.toLocaleString("en-US") + " holding SPY. Automated screen, not financial advice.";
  });
  get("/investors-data/highlights.json").then(function(h){
    if(!h) return;
    var rows = [], kind = {buy:"bought", sell:"sold", "sell (partial)":"sold some", new:"new", add:"added", trim:"trimmed", exit:"sold out of"};
    var tk = function(t){ return '<b>' + esc(t.ticker || t.name || t.asset) + '</b>' + (t.options ? " options" : t.putCall ? " " + esc(t.putCall.toLowerCase()) + "s" : ""); };
    var p = (h.pelosi || []).filter(function(t){ return t.ticker; })[0];
    if(p) rows.push('<li><span>Pelosi ' + esc(kind[p.type] || p.type) + ' ' + tk(p) + '</span><span>' + esc(p.amount.replace(/,000,000/g, "M").replace(/,000/g, "K").replace(/,001/g, "K")) + '</span></li>');
    (h.funds || []).filter(function(f){ return ["burry", "wood", "buffett"].indexOf(f.id) >= 0; }).forEach(function(f){
      rows.push('<li><span>' + esc(f.person.split(" ").slice(-1)[0]) + ' ' + esc(kind[f.kind] || f.kind) + ' ' + tk(f) + '</span><span class="' + (f.dValue >= 0 ? "mkb__up" : "mkb__dn") + '">' + usd(f.dValue) + (f.stale ? " · old" : "") + '</span></li>');
    });
    var c = (h.congress || [])[0];
    if(c) rows.push('<li><span>' + esc(c.member.split(" ").slice(-1)[0]) + ' ' + esc(kind[c.type] || c.type) + ' ' + tk(c) + '</span><span>Congress</span></li>');
    if(rows.length) $("mkb-inv").innerHTML = rows.slice(0, 5).join("");
  });
  get("/arena-data/state.json").then(function(S){
    if(!S || !S.wallets || !S.roster) return;
    var start = S.startCash || 1000, base = {hodl:1, rsi:1};
    var R = S.roster.map(function(a){ var w = S.wallets[a.id] || {}; return {a:a, r:((w.equity || start) / start - 1) * 100}; }).sort(function(x, y){ return y.r - x.r; });
    var lead = R[0];
    $("mkb-bt").textContent = lead ? lead.a.name + (lead.a.standin ? " (stand-in)" : base[lead.a.id] ? " (baseline)" : "") + " leads" : "AI models trading paper money";
    $("mkb-bat").innerHTML = R.slice(0, 4).map(function(x, i){ return '<li><span>' + (i + 1) + '. ' + esc(x.a.name) + (x.a.standin ? ' <small style="opacity:.7;letter-spacing:0;text-transform:none;color:inherit">stand-in</small>' : base[x.a.id] ? ' <small style="opacity:.7;letter-spacing:0;text-transform:none;color:inherit">baseline</small>' : '') + '</span><span class="' + (x.r >= 0 ? "mkb__up" : "mkb__dn") + '">' + sg(x.r) + '</span></li>'; }).join("");
    var n = S.roster.filter(function(a){ return a.standin; }).length;
    if(n) $("mkb-bft").textContent = "Paper money. " + n + " AI slots have no API key yet and trade a labelled rule-based stand-in, not the model.";
  });
})();
</script>
</section>`;
}

function followBand(ctx) {
  if (!brand.X_URL) return '';
  const handle = brand.X_HANDLE.replace(/^@/, '');
  return `<section class="sec fol" id="follow" aria-labelledby="fol-h">
  <h2 class="sec__h" id="fol-h">Hear it first: follow ${esc(brand.X_HANDLE)}</h2>
  <p class="lede">This page only tells you something when you open it. The X account tells you when something changes.
    If you want to know that AI got louder before your feed fills up with takes about it, that is where it lands.</p>
  <ul class="fol__l">
    <li><b>Level changes, as they happen.</b> When the dial moves a level, it is posted with the receipt. The site has no alerts; X is the alert.</li>
    <li><b>One reading a day.</b> The level, the score and the card, in one post you can read in five seconds.</li>
    <li><b>What moved it.</b> Which of the five pillars got loud, in plain words, so you know whether it was releases, money, headlines, rules or markets.</li>
    <li><b>Jobs and medicine, when the numbers update.</b> New counts on the two questions everyone asks, with the source.</li>
    <li><b>No predictions.</b> Counts with timestamps. If we cannot count it, we do not post it.</li>
  </ul>
  <p class="supp__row"><a class="supp__a" rel="noopener" href="https://x.com/intent/follow?screen_name=${esc(handle)}">Follow ${esc(brand.X_HANDLE)} on X</a></p>
</section>`;
}

function heroAside(ctx) {
  const st = ctx.state;
  const lvl = Number.isFinite(st.level) ? brand.LEVELS.find((l) => l.level === st.level) : null;
  const hook = String(brand.STRAPLINE).split('. ').slice(0, 2).join('. ') + '.';
  return `<p class="hero__voice">${lvl && lvl.epithet
    ? `<span class="hero__ep">${esc(lvl.epithet)}.</span> ` : ''}<span class="hero__hook">${esc(hook)}</span></p>`
    + `<p class="hero__orders">${mascot({ size: 48, cls: 'hero__tally', level: lvl ? lvl.level : null })}<span>${lvl && MOODS[lvl.level] ? `<b class="hero__mood">Tally is ${esc(MOODS[lvl.level])}.</b> ` : ''}<b>Instructions to the public:</b> none. ${esc(
      (lvl && STANDING_ORDERS[lvl.level]) || 'No reading was taken, so none is posted.')}</span></p>`;
}

function headline(ctx) {
  const st = ctx.state;
  if (!Number.isFinite(st.score)) {
    return 'No reading today: not enough sources reported to compute one.';
  }
  return `AI activity is at ${esc(brand.NAME)}\u00a0${esc(st.level)} — ${esc(st.level_name)}, ` +
    'on a scale where 1 is loudest.';
}

function plainRead(ctx) {
  const st = ctx.state;
  const s = Number.isFinite(st.score) ? st.score : null;
  if (s === null) return 'No score today — not enough sources reported to compute one.';

  const where = s >= 85 ? 'higher than almost anything in our record'
    : s >= 70 ? 'above the usual range of our record'
    : s >= 55 ? 'a little above the middle of our record'
    : s >= 35 ? 'inside the middle band of our own record'
    : 'below the usual range of our record';

  return `Today reads ${s >= 70 ? 'busy' : s >= 55 ? 'slightly busy' : 'ordinary'}. ` +
    `${s.toFixed(1)} of 100 sits ${where}. ` +
    `This counts how much is happening in AI right now — it is not a claim about how it ends.`;
}

/**
 * The direction of the last move, on the fold.
 *
 * docs/VISITORS.md §0 found this printing "— no prior observation to compare"
 * while "Recent moves", two screens down in the same build, printed
 * "Score 40.8 → 40.7 · −0.1". The delta was never missing; the CHOSEN
 * COMPARISON was, and the fold reported that as an absence of information to
 * the 45 of 100 visitors whose first question is whether the number moved.
 *
 * So there are now three sources, tried in order, and each one is LABELLED AS
 * WHAT IT IS rather than dressed up as the one above it:
 *
 *   1. ctx.vsYesterday, basis "day"       a genuine ~24h comparison
 *   2. ctx.vsYesterday, basis "previous"  the preceding observation, by clock
 *   3. state.delta_from_previous          the engine's own last-move delta,
 *                                         which exists from the second run and
 *                                         survives a history log too short for
 *                                         build.mjs to difference
 *
 * Only when all three are absent - a genuine genesis observation - does it say
 * so, and then it says the true thing: this is the first reading. Printing
 * "+0.0" against nothing would be exactly the imputation this project is a
 * reaction to.
 */
function direction(ctx) {
  const st = ctx.state;
  const d = ctx.vsYesterday;

  if (d && Number.isFinite(d.delta)) {
    const against = d.basis === 'previous' ? `since ${d.label}` : `vs ${d.label}`;
    return chip(d.delta, against, d.basis || 'day');
  }

  // The engine writes this on every scored run after the first. It is the same
  // number the move rows print, so the fold and the archive can no longer
  // disagree about whether anything happened.
  if (Number.isFinite(st.delta_from_previous)) {
    return chip(st.delta_from_previous, 'since the last observation', 'engine');
  }

  return `<span class="score__dir"><b>—</b> first scored observation; nothing yet to compare it against</span>`;
}

function chip(delta, against, basis) {
  const glyph = delta > 0 ? '▲' : delta < 0 ? '▼' : '◆';
  const word = delta > 0 ? 'up' : delta < 0 ? 'down' : 'unchanged';
  return `<span class="score__dir" data-basis="${esc(basis)}">
      <span aria-hidden="true">${glyph}</span>
      <b>${esc(signed(delta, 1))}</b> ${esc(word)} ${esc(against)}
    </span>`;
}

function webApplication(ctx) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: brand.NAME,
    url: ctx.url('/'),
    applicationCategory: 'ReferenceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'No JavaScript required',
    description: brand.DESCRIPTION,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    isAccessibleForFree: true,
    license: 'https://creativecommons.org/licenses/by/4.0/',
  };
}

function dataset(ctx) {
  const { state } = ctx;
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: `${brand.NAME} AI activity tempo index`,
    description:
      'An hourly 0-100 index of observable AI activity tempo, aggregated from public sources ' +
      'across five pillars: capability, compute and capital, attention, governance and markets. ' +
      'Each observation ships a hash-chained receipt carrying its full inputs.',
    url: ctx.url('/'),
    license: 'https://creativecommons.org/licenses/by/4.0/',
    isAccessibleForFree: true,
    creator: { '@type': 'Organization', name: brand.NAME, url: ctx.url('/') },
    temporalCoverage: ctx.temporalCoverage,
    dateModified: state.generated_at,
    variableMeasured: [
      { '@type': 'PropertyValue', name: 'composite score', value: state.score, minValue: 0, maxValue: 100 },
      { '@type': 'PropertyValue', name: 'level', value: state.level, minValue: 1, maxValue: 5 },
    ],
    distribution: [
      { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: ctx.url('/api/state.json') },
      { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: ctx.url('/api/history.json') },
    ],
  };
}
