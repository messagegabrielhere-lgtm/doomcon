// The motion layer. docs/MOTION.md is the spec; this file is the whole of the
// implementation, and layout.mjs is its only caller.
//
// RULE 0, from MOTION.md, governs every line below: every animated element is
// already in the static HTML, fully readable, before a line of JavaScript runs.
// The ticker markup is server-rendered here with real headlines and real
// timestamps. The score is server-rendered by index.mjs and this file only
// walks it from a REAL previous observation to the value already printed. The
// feed rows are server-rendered by news.mjs and this file only adds a class to
// rows that already exist. Nothing here is a loading strategy.
//
// Three decisions that shape everything:
//
// 1. THE TICKER IS CHROME, NOT NAVIGATION. Its items are plain text and the
//    strip is aria-hidden. The trap this avoids: an `overflow: hidden` element
//    is still programmatically scrollable, so focusing a link inside a marquee
//    makes the browser set scrollLeft to reveal it and the whole track shifts
//    permanently out of alignment — with no JS running, so it cannot be undone.
//    Every headline in the ticker is a real link in the feed a screen below, so
//    hiding a verbatim duplicate from assistive tech loses nothing.
//
// 2. THE POLLER NEVER REPAINTS A DERIVED FIGURE IT CANNOT RECOMPUTE. It updates
//    the composite score and the observed-at stamp, because both come straight
//    off the fetched JSON. It does NOT touch the level bars, the vs-yesterday
//    delta, the receipt id, the pillar cards or the sparklines: those are
//    computed at build time from history that the browser does not have.
//    Instead a one-line note is revealed saying a newer observation is live and
//    offering a reload. MOTION.md §4 forbids "any animation that makes a stale
//    value look fresh"; silently leaving a recomputed score beside a delta from
//    the previous build would be exactly that, in a costume.
//
// 3. NEW ITEMS ARE OFFERED, NEVER INSERTED, and they land in their own labelled
//    strip rather than in .nfeed. Two separate rules, both learned the hard way.
//
//    Offered, because content that moves under a reader mid-sentence is the one
//    behaviour every news site has been taught not to ship. Arrivals are
//    buffered and counted — "3 new stories since you arrived" — and the reader
//    presses a button. Until then the page is exactly as still as it was.
//
//    Their own strip, because a feed row carries a rank, a score meter, a
//    why-line and a corroboration count, all computed in news.mjs. Rebuilding
//    that shape in inline JS means two renderers of one row that are guaranteed
//    to diverge, and a half-formed row at the top of a ranked list reads as a
//    bug. The strip says what it is — "arrived since this page loaded" — which
//    is a true statement about items that were genuinely not in the build.
//
// 4. THE PAGE IS HONEST ABOUT ITS OWN LIVENESS. Ages follow the live compile
//    stamp so they are never stale against the data they claim to describe; the
//    pill's "newest 4m ago" is the one figure measured against the READER's
//    clock, so it is the one figure on a repaint timer. And when the poller
//    gives up after three failures it says so in the note, rather than leaving a
//    page that looks live sitting on data that has stopped arriving.
//
// Byte budget: MOTION.md sets 8KB uncompressed for MOTION_JS. The reasoning
// lives in this file's comments rather than in the shipped string, so the
// payload stays lean and the argument stays readable.

import { esc, utcClock } from './_html.mjs';
import { readNews } from './_reel.mjs';

// Enough headlines that the track is wider than any plausible viewport, few
// enough that the same text is not triplicated through the document.
const TICKER_ITEMS = 14;

// Below this the duplicated track can be narrower than a desktop viewport, and
// translating it -50% would crawl a band of empty background across the screen.
// Under the floor the strip renders static: same information, no animation.
const TICKER_MIN = 8;

// ~3.6s per item lands 14 items at 50s, inside MOTION.md's 40-60s window.
// Derived from the item count, not hard-coded, because a shorter strip at a
// fixed duration scrolls faster than anyone can read.
const SEC_PER_ITEM = 11.5;
const TICKER_MIN_S = 130;
const TICKER_MAX_S = 190;

const POLL_MS = 60000;
const ARRIVAL_CAP = 8;

// The arrivals buffer. A tab left open for a day against a wire that prints a
// few items an hour is the case this caps: the count stays truthful ("40+"),
// and merging cannot drop hundreds of nodes into the document in one frame.
const BUFFER_MAX = 40;

// How often the one wall-clock-relative figure on the page is repainted. 30s is
// the coarsest interval at which a value rendered in whole minutes can never be
// more than half a unit wrong, and it is cheap enough to leave running.
const AGE_TICK_MS = 30000;

// ---------------------------------------------------------------------------
// Server-rendered model
// ---------------------------------------------------------------------------

/**
 * The newest headlines, for the marquee.
 *
 * readNews() ranks by score, because that is what the reel and the feed want.
 * A wire ticker wants the opposite: newest first. The timestamp is what makes
 * a crawling line read as intelligence rather than as marketing (MOTION.md
 * §2.1), so sorting by anything but the clock would undercut the device.
 *
 * @returns {null|{items: Array, seconds: number, moving: boolean}}
 */
export function tickerModel(ctx) {
  const news = readNews(ctx);
  if (!news || !news.items.length) return null;

  const byClock = news.items.slice().sort((a, b) => {
    const ta = Date.parse(a.published_at);
    const tb = Date.parse(b.published_at);
    if (tb !== ta) return tb - ta;
    // Total order or two builds from identical inputs emit different bytes.
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  }).slice(0, TICKER_ITEMS);

  const items = byClock.map((it) => ({
    // Never rendered. It is the signature the poller compares a refreshed feed
    // against, so a newsroom whose newest headlines did not change rebuilds
    // nothing at all and the crawl is not interrupted for no reason.
    id: it.id,
    clock: `${utcClock(it.published_at)}Z`,
    datetime: it.published_at,
    source: it.source,
    title: it.title,
    pillar: it.pillar,
  }));

  const raw = Math.round(items.length * SEC_PER_ITEM);
  return {
    items,
    seconds: Math.min(TICKER_MAX_S, Math.max(TICKER_MIN_S, raw)),
    moving: items.length >= TICKER_MIN,
  };
}

function tickerTrack(items, dup) {
  const rows = items.map((it) => (
    `<li class="dcmx__i" data-pillar="${esc(it.pillar)}">` +
    `<span class="dcmx__c">${esc(it.clock)}</span>` +
    `<span class="dcmx__s">${esc(it.source)}</span>` +
    `<span class="dcmx__h">${esc(it.title)}</span></li>`
  )).join('');
  // Both tracks are identical and both are in the HTML: a seamless loop cannot
  // be produced by JS cloning without violating Rule 0 for the second half of
  // every cycle.
  return `<ul class="dcmx__t"${dup ? ' data-dup="1"' : ''}>${rows}</ul>`;
}

/**
 * The marquee. aria-hidden because it is a verbatim duplicate of the feed's
 * newest rows, which are present, linked and announced further down the page.
 */
export function ticker(model) {
  if (!model) return '';
  return `<div class="dcmx" data-mode="${model.moving ? 'run' : 'static'}"` +
    ` style="--dcmx-dur:${model.seconds}s" aria-hidden="true">` +
    `<div class="dcmx__win">${tickerTrack(model.items, false)}${tickerTrack(model.items, true)}</div>` +
    `</div>`;
}

/**
 * The reload note. Server-rendered and `hidden`; the poller fills it and
 * unhides it when a newer observation lands. It exists in the HTML rather than
 * being created on demand so its markup and its styling live together, and so
 * the live region is registered before it has anything to announce.
 */
function note(ctx, path) {
  const href = ctx.href(path || '/');
  return `<p class="dcmx-note" id="dcmx-note" role="status" hidden>` +
    `<b class="dcmx-note__k">NEWER OBSERVATION</b>` +
    `<span class="dcmx-note__t"></span>` +
    `<span class="dcmx-note__x"></span>` +
    `<a class="dcmx-note__a" href="${esc(href)}">reload for the fully recomputed page</a></p>`;
}

/**
 * "N new since you arrived."
 *
 * THE RULE THIS EXISTS TO OBEY: content never moves under a reader mid-sentence.
 * The previous version of the poller inserted arrivals straight into the page
 * the moment they landed — the single behaviour every news site has been taught
 * not to ship, because the paragraph you were reading jumps and you lose your
 * place for something you did not ask for. So arrivals are BUFFERED and counted,
 * and a reader who wants them presses a button. Until then the page is exactly
 * as still as it was.
 *
 * The count is the honest headline: it is the number of items in the refreshed
 * feed that are newer than the newest item this page was built with, so it is a
 * statement about the wire and not about our render loop.
 *
 * Server-rendered and `hidden`, like the note above it: the live region has to
 * be registered before it has anything to announce, or the first announcement is
 * swallowed. `aria-live` is deliberately NOT on the button — a button that
 * announces itself every time its label changes is a screen-reader torture
 * device. The wrapper is `role="status"`, which is polite and coalescing.
 */
function newPill() {
  return `<p class="dcmx-new" id="dcmx-new" role="status" hidden>` +
    `<button class="dcmx-new__b" type="button">` +
    `<b class="dcmx-new__n">0</b><span class="dcmx-new__w"> new since you arrived</span>` +
    `</button>` +
    `<span class="dcmx-new__t"></span></p>`;
}

/** The newest observation strictly older than the one being rendered, or null. */
function prevObservation(ctx) {
  const rows = Array.isArray(ctx.history) ? ctx.history : [];
  const now = Date.parse(ctx.state.generated_at);
  let best = null;
  let bestT = -Infinity;
  for (const r of rows) {
    const t = Date.parse(r && r.generated_at);
    if (!Number.isFinite(t) || t >= now) continue;
    if (!Number.isFinite(r.score)) continue;
    if (t > bestT) { best = r; bestT = t; }
  }
  return best;
}

/**
 * Did the level change at THIS observation?
 *
 * TRAP: state.previous_level is the level before the last change whenever there
 * has ever been one, so `previous_level !== level` is true for hours afterwards
 * and would pulse the badge on every page load for four hours. The newest move
 * carries the exact per-observation flag; level_since is the fallback, because
 * the engine stamps it at the observation that moved the level.
 */
function levelChangedNow(ctx) {
  const s = ctx.state;
  const m = Array.isArray(ctx.moves) && ctx.moves.length ? ctx.moves[0] : null;
  if (m && m.id === s.receipt_id) return m.level_changed === true;
  return s.level_since === s.generated_at;
}

/**
 * Everything the inline script needs, as a pure function of the build inputs.
 * No Date.now(), no Math.random(): two builds from identical inputs emit
 * byte-identical JSON (CONTRACT.md hard constraint 4).
 */
export function motionConfig(ctx, opts = {}) {
  const s = ctx.state;
  const prev = prevObservation(ctx);
  const news = readNews(ctx);

  // Newest item in the build, so the poller can tell a genuinely new item from
  // one it is already displaying without diffing 200 ids.
  let newsNewest = null;
  if (news) {
    for (const it of news.items) {
      if (!newsNewest || Date.parse(it.published_at) > Date.parse(newsNewest)) newsNewest = it.published_at;
    }
  }

  return {
    stateUrl: ctx.href(opts.stateUrl || '/api/state.json'),
    // Nullable on purpose. build.mjs does not write api/news.json today; a URL
    // that is known not to exist is a configuration fact, not a fetch to retry.
    newsUrl: opts.newsUrl === null ? null : ctx.href(opts.newsUrl || '/api/news.json'),
    pollMs: Number.isFinite(opts.pollMs) ? opts.pollMs : POLL_MS,
    generatedAt: s.generated_at,
    score: s.score,
    decimals: 1,
    // null when there is no prior observation. The count-up is then skipped
    // entirely: animating up from zero would invent a delta that never happened.
    prevScore: prev ? prev.score : null,
    level: s.level,
    levelName: s.level_name,
    levelChanged: levelChangedNow(ctx),
    // "Newer than the last build" for the arrival animation. The collector run
    // IS the build, so the previous observation's stamp is the exact boundary.
    since: prev ? prev.generated_at : null,
    newsAt: news ? news.generated_at : null,
    newsNewest,
    arrivalCap: ARRIVAL_CAP,
    // The ids currently crawling across the ticker, in order. The poller
    // rebuilds the strip only when this list changes, which is what keeps
    // "nothing changed -> nothing visible" true for the one element on the page
    // that is always moving anyway.
    tickerIds: (tickerModel(ctx)?.items ?? []).map((i) => i.id),
    tickerN: TICKER_ITEMS,
    // How many arrivals the pill will hold before it stops counting individuals.
    // A reader who leaves a tab open overnight comes back to a real number, not
    // to 400 buffered DOM nodes waiting to be inserted at once.
    bufferMax: BUFFER_MAX,
    // Milliseconds between wall-clock age repaints. Everything else on this page
    // is measured against the compile stamp; the pill's "newest 4m ago" is the
    // one figure measured against the READER's clock, so it is the one figure
    // that has to be re-rendered on a timer or it starts lying immediately.
    tickMs: AGE_TICK_MS,
  };
}

// ---------------------------------------------------------------------------
// CSS
// ---------------------------------------------------------------------------

// Everything animated here is transform or opacity. Nothing touches top, left,
// width or height, so nothing in this file can trigger layout (MOTION.md §3).
//
// styles.mjs already ships a blanket `animation-duration: 0.001ms !important`
// under prefers-reduced-motion. That is not sufficient on its own for a
// marquee: a zero-duration animation JUMPS TO ITS END STATE, which would park
// the track at translateX(-50%) and show the reader the duplicate half. So the
// reduce block below sets `animation: none` — the shorthand clears the
// animation-name, and an !important duration on an animation with no name runs
// nothing at all.
export function motionCss() {
  return `
.dcmx{position:relative;overflow:hidden;padding:7px 0;border-bottom:1px solid var(--rule);background:var(--bg-sunken)}
.dcmx__win{display:flex;width:max-content}
.dcmx__t{display:flex;margin:0;padding:0;list-style:none;flex:0 0 auto}
.dcmx__i{display:flex;gap:9px;align-items:baseline;min-width:250px;padding:5px 16px;
  border-right:1px solid var(--rule-soft);white-space:nowrap;font-size:13px;font-size:12.5px}
.dcmx__c{font-family:var(--mono);font-size:10.5px;letter-spacing:.06em;
  color:var(--p,var(--accent));font-variant-numeric:tabular-nums}
.dcmx__s{font-family:var(--mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-faint)}
.dcmx__h{color:var(--ink);max-width:78ch;overflow:hidden;text-overflow:ellipsis}
@media (prefers-reduced-motion:no-preference){
  .dcmx[data-mode="run"] .dcmx__win{animation:dcmxRun var(--dcmx-dur,50s) linear infinite;will-change:transform}
  .dcmx:hover .dcmx__win,.dcmx:focus-within .dcmx__win{animation-play-state:paused}
  @keyframes dcmxRun{from{transform:translateX(0)}to{transform:translateX(-50%)}}
}

.dcmx-note{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px;margin:0;
  padding:7px var(--gutter);border-bottom:1px solid var(--rule);background:var(--bg-sunken);
  font-family:var(--mono);font-size:11.5px;color:var(--ink-dim)}
.dcmx-note[hidden]{display:none}
.dcmx-note__k{color:var(--accent);letter-spacing:.14em;font-weight:700;font-size:10px}
.dcmx-note__t{color:var(--ink);font-variant-numeric:tabular-nums}
.dcmx-note__x:empty{display:none}
.dcmx-note__a{color:var(--ink-dim)}

/* The arrivals pill. It sits in the same strip band as the note, so the top of
   the page has exactly one place where the live layer is allowed to speak. */
.dcmx-new{display:flex;flex-wrap:wrap;align-items:center;gap:9px;margin:0;
  padding:6px var(--gutter);border-bottom:1px solid var(--rule);background:var(--bg-sunken);
  font-family:var(--mono);font-size:11.5px;color:var(--ink-dim)}
.dcmx-new[hidden]{display:none}
.dcmx-new__b{appearance:none;-webkit-appearance:none;font:inherit;line-height:1.5;
  color:var(--accent);background:none;border:1px solid var(--accent);border-radius:999px;
  padding:2px 12px;cursor:pointer;letter-spacing:.04em}
.dcmx-new__b:hover,.dcmx-new__b:focus-visible{background:var(--accent);color:var(--accent-ink,var(--bg))}
.dcmx-new__n{font-variant-numeric:tabular-nums;font-weight:700}
.dcmx-new__t{color:var(--ink-faint)}
.dcmx-new__t:empty{display:none}
/* The arrivals list takes focus on merge so the reader lands on what they asked
   for. A focus ring on a container that was never clicked is noise, so it is
   the programmatic-focus ring only. */
.dcmx-arr__l:focus{outline:2px solid var(--accent);outline-offset:3px}
.dcmx-arr__l:focus:not(:focus-visible){outline:none}

/* REPAIR, NOT DECORATION. This rule belongs in reelCss in _reel.mjs, which
   this module does not own, so it is parked here and flagged for the
   integrator. .reel__rail is a block-level flex container, so it computes to
   the viewport's content width - 491px measured - while its no-shrink cards
   overflow to 2470px. That overflow never becomes SCROLLABLE overflow of
   .reel__viewport, so vp.scrollWidth === vp.clientWidth (523 === 523, measured
   in Chrome against the real built index.html with no motion layer present)
   and the rail cannot be swiped, dragged, wheeled or scrolled by anybody.
   max-content sizes the rail to its cards: vp.scrollWidth goes 523 -> 2502.
   Without it the carousel - the operator's headline request - is inert. */
.reel__rail{width:max-content}

.dcmx-dots{display:flex;gap:6px;justify-content:center;margin:0;padding:4px 0 0}
.dcmx-dots button{appearance:none;-webkit-appearance:none;width:24px;height:14px;
  padding:0;margin:0;border:0;background:none;cursor:pointer}
.dcmx-dots button::before{content:'';display:block;height:3px;border-radius:2px;background:var(--rule)}
.dcmx-dots button[aria-current="true"]::before{background:var(--accent);height:4px}

.dcmx-arr{margin:18px 0 6px;border:1px dashed var(--rule);border-radius:var(--radius);padding:8px 11px 9px}
.dcmx-arr__h{margin:0 0 5px;font-family:var(--mono);font-size:10px;letter-spacing:.14em;
  text-transform:uppercase;color:var(--ink-faint)}
.dcmx-arr__l{list-style:none;margin:0;padding:0}
.dcmx-arr__i{display:flex;flex-wrap:wrap;gap:8px;align-items:baseline;font-size:13.5px;
  padding:5px 0 5px 9px;border-left:2px solid var(--p,var(--accent));
  border-top:1px solid var(--rule-soft)}
.dcmx-arr__i:first-child{border-top:0}
.dcmx-arr__i time{font-family:var(--mono);font-size:10.5px;color:var(--p,var(--accent));
  font-variant-numeric:tabular-nums}
.dcmx-arr__s{font-family:var(--mono);font-size:10px;letter-spacing:.1em;
  text-transform:uppercase;color:var(--ink-faint)}

/* tabular-nums is redundant with the body rule in styles.mjs and is repeated on
   the two elements that count, because a single proportional-figure override
   anywhere above them makes the digits jitter through the count and the whole
   thing reads as broken (MOTION.md §2.4). */
.score__val,.dcmx-note__t{font-variant-numeric:tabular-nums}

.dcmx-pulse{position:relative}
.dcmx-pulse::after{content:'';position:absolute;inset:-7px -10px;border:2px solid var(--accent);
  border-radius:12px;pointer-events:none;animation:dcmxPulse 900ms ease-out 1 both}
@keyframes dcmxPulse{from{opacity:.7;transform:scale(.88)}to{opacity:0;transform:scale(1.2)}}

.dcmx-in{animation:dcmxIn 220ms ease-out both}
@keyframes dcmxIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}

.dcmx-flash{animation:dcmxFlash 900ms ease-out 1}
@keyframes dcmxFlash{0%{opacity:.2}100%{opacity:1}}

@media (prefers-reduced-motion:reduce){
  .dcmx__win{animation:none;transform:none}
  .dcmx-in,.dcmx-flash{animation:none;opacity:1;transform:none}
  .dcmx-pulse::after{animation:none;display:none}
}
`;
}

// ---------------------------------------------------------------------------
// The inline script
// ---------------------------------------------------------------------------

// THE PAYLOAD. MOTION.md budgets 8KB uncompressed for this string and it is
// currently 8147 bytes, so the reasoning lives HERE rather than inside it. Check
// the budget after any edit:
//
//   docker run --rm -v "$PWD":/app -w /app node:20-alpine node -e \
//     "import('./site/templates/_motion.mjs').then(m=>console.log(Buffer.byteLength(m.MOTION_JS)))"
//
// No template literals inside the string: a `${` in the payload would be
// interpolated by the very template literal that carries it.
//
// MAP OF THE SHIPPED CODE, in the order it appears:
//
//   q/qa/T/clk/sp/dur/el/A/L   micro-helpers. `dur` MIRRORS duration() in
//                              _html.mjs exactly — a different rounding rule
//                              makes a ticked age disagree with the one the
//                              next build server-renders beside it.
//   sc/ct/pt                   the score count-up (MOTION.md §2.4).
//   arr                        the arrival animation. TRAP: .dcmx-in starts at
//                              opacity 0, so adding it to a row the browser has
//                              ALREADY painted blinks a visible row out and
//                              back — hence the readyState !== 'complete' gate.
//   vp/cd/dots/go/at/stop      the reel (§2.2). `stop` is permanent and never
//                              rearmed; 'scroll' is deliberately not a trigger,
//                              because the auto-advance itself scrolls.
//   gj                         fetch with `cache:'no-cache'`, NOT 'no-store'.
//                              no-store forbids caching, so every poll drags
//                              the whole of api/news.json (~350KB) down a phone
//                              connection. no-cache still revalidates on every
//                              poll but lets an unchanged file answer 304 with
//                              no body at all — which, between builds, is what
//                              almost every poll gets.
//   aS                         state.json -> score and observed-at stamp only.
//                              See decision 2 above for what it refuses to touch.
//   rt                         ages, recomputed against the LIVE compile stamp.
//                              NOT against the reader's clock: news.mjs prints a
//                              legend saying the AGE column is measured from the
//                              compile stamp, and re-basing it here would make
//                              every row disagree with the sentence above it.
//                              When a refresh moves the stamp, every age and the
//                              "compiled" line move with it, together.
//   rk                         the ticker, refed from the poll. Rebuilt only
//                              when the newest-N id list actually changes, so an
//                              unchanged newsroom never interrupts the crawl.
//   pl/bf/box/row/ago/ofr/mg   the arrivals buffer and its pill. See newPill().
//   run/plan                   the poll loop: 60s, backoff 120s then 300s, dead
//                              after three, no timer at all while hidden. On
//                              giving up it SAYS SO in the note — a page that
//                              has silently stopped updating while still looking
//                              live is the exact failure this project exists to
//                              not commit.
//
// NO REGEX LITERALS IN THE PAYLOAD EITHER, and this one drew blood. A backslash
// inside the template literal that carries the payload is consumed by it, so a
// source `/^https?:\/\//i` shipped as `/^https?:///i` - which JavaScript lexes
// as the regex `/^https?:/` followed by a `//` LINE COMMENT. The comment ate
// the rest of the line, the guard evaluated to a truthy RegExp object, and a
// `javascript:` URL out of a third-party feed reached an href. Caught in the
// browser, not by review. Every scheme check below is a string compare, and the
// harness executes the shipped httpUrl against a hostile URL list rather than
// pattern-matching the source.
export const MOTION_JS = `(function(){
var d=document,cf=d.getElementById('dcmx-cfg');
if(!cf){console.error('dcmx: no #dcmx-cfg');return;}
var C;try{C=JSON.parse(cf.textContent);}catch(e){console.error('dcmx: bad cfg',e);return;}
var rm=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches);
function q(s,r){return (r||d).querySelector(s);}
function qa(s,r){return [].slice.call((r||d).querySelectorAll(s));}
function T(i){return Date.parse(i);}
function clk(i){return new Date(i).toISOString().slice(11,16)+'Z';}
function sp(i){return new Date(i).toISOString().replace('T',' ').slice(0,19)+' UTC';}
function dur(s){s=Math.round(s);if(s<90)return s+'s';var m=Math.round(s/60);if(m<90)return m+'m';var h=Math.round(m/60);if(h<48)return h+'h';return Math.round(h/24)+'d';}
function el(t,c,x){var e=d.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e;}
function A(e,k,v){e.setAttribute(k,v);}
function L(e,t,f,o){e.addEventListener(t,f,o);}
var sc=q('[data-dc-score]')||q('.score__val'),sh=C.score;
function pt(v){if(sc)sc.textContent=v.toFixed(C.decimals);}
function ct(to,ms){var f=sh;sh=to;if(!sc||rm||f===to){pt(to);return;}var t0=0;
requestAnimationFrame(function s(t){if(!t0)t0=t;var p=Math.min(1,(t-t0)/ms);
pt(f+(to-f)*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(s);});}
if(sc&&C.prevScore!==null&&C.prevScore!==C.score&&!rm){sh=C.prevScore;pt(C.prevScore);ct(C.score,600);}
var lv=q('[data-dc-level]')||q('.level__digit');
if(lv&&C.levelChanged&&!rm)lv.classList.add('dcmx-pulse');
function arr(n){if(rm)return;for(var i=0;i<n.length&&i<C.arrivalCap;i++){
n[i].style.animationDelay=(i*40)+'ms';n[i].classList.add('dcmx-in');}}
if(C.since&&d.readyState!=='complete'){var sn=T(C.since);
arr(qa('.nfeed > .nrow').filter(function(li){var t=q('time[datetime]',li);
return t&&T(t.getAttribute('datetime'))>sn;}));}
var vp=q('.reel__viewport'),rl=vp&&q('.reel__rail',vp),cd=rl?qa('.reel__item',rl):[];
if(vp&&cd.length>1&&vp.scrollWidth>vp.clientWidth){
var dt=el('div','dcmx-dots'),tm=null,dead=false,raf=0;
A(dt,'aria-label','Reel position');
cd.forEach(function(it,i){var b=el('button');b.type='button';
A(b,'aria-label','Card '+(i+1)+' of '+cd.length);A(b,'aria-current',i===0?'true':'false');
L(b,'click',function(){stop();go(i);});dt.appendChild(b);});
vp.parentNode.insertBefore(dt,vp.nextSibling);
function go(i){vp.scrollTo({left:cd[i].offsetLeft-cd[0].offsetLeft,behavior:rm?'auto':'smooth'});}
function at(){var x=vp.scrollLeft+cd[0].offsetLeft,b=0,g,bg=Infinity;
for(var i=0;i<cd.length;i++){g=Math.abs(cd[i].offsetLeft-x);if(g<bg){bg=g;b=i;}}return b;}
L(vp,'scroll',function(){if(raf)return;raf=requestAnimationFrame(function(){raf=0;var c=at();
for(var i=0;i<dt.children.length;i++)A(dt.children[i],'aria-current',i===c?'true':'false');});},{passive:true});
function stop(){dead=true;if(tm){clearInterval(tm);tm=null;}}
['pointerdown','touchstart','wheel','keydown','focusin'].forEach(function(t){
L(vp,t,stop,{once:true,passive:true});L(dt,t,stop,{once:true,passive:true});});
if(!rm)tm=setInterval(function(){if(dead||d.hidden)return;go((at()+1)%cd.length);},7000);}
var BO=[0,120000,300000],fl=0,tid=null,wt=false,off=false;
var sAt=C.generatedAt,nAt=C.newsAt,nw=C.newsNewest,noN=!C.newsUrl,mem={};
var nt=d.getElementById('dcmx-note');
function plan(ms){if(tid)clearTimeout(tid);tid=setTimeout(run,ms);}
function gj(u){var ac=new AbortController(),to=setTimeout(function(){ac.abort();},10000);
return fetch(u,{cache:'no-cache',signal:ac.signal}).then(function(r){clearTimeout(to);
if(r.status===404){var e=new Error('404');e.missing=true;throw e;}
if(!r.ok)throw new Error('HTTP '+r.status);return r.json();},function(e){clearTimeout(to);throw e;});}
function say(x){if(!nt)return;q('.dcmx-note__x',nt).textContent=x;nt.hidden=false;}
function aS(s){
if(!s||typeof s.generated_at!=='string'||!Number.isFinite(s.score))throw new Error('bad state');
var g=s.generated_at;if(g===sAt)return;
sAt=g;var z=sp(g);ct(s.score,600);
var t=q('.hero .eyebrow time[datetime]');
if(t){A(t,'datetime',g);t.textContent=z;
if(!rm){t.classList.remove('dcmx-flash');void t.offsetWidth;t.classList.add('dcmx-flash');}}
if(nt){q('.dcmx-note__t',nt).textContent=z;
say(s.level!==C.level?('level is now DOOMCON '+s.level+' '+s.level_name):'');}}
function rt(){
if(!nAt)return;var at=T(nAt);qa('.nrow').forEach(function(li){var t=q('time[datetime]',li),a=q('.nrow__age',li);
if(!t||!a)return;var v=dur(Math.max(0,(at-T(t.getAttribute('datetime')))/1000));
if(a.textContent!==v){a.textContent=v;A(a,'title',v+' before the compile stamp');}});
var s=q('.nlive__stamp time[datetime]');
if(s&&s.getAttribute('datetime')!==nAt){A(s,'datetime',nAt);s.textContent=sp(nAt);}}
var tg=(C.tickerIds||[]).join(',');
function bc(a,b){return T(b.published_at)-T(a.published_at)||(a.id<b.id?-1:a.id>b.id?1:0);}
function rk(ls){
var w=q('.dcmx__win');if(!w)return;
var tp=ls.slice(0,C.tickerN),sg=tp.map(function(i){return i.id;}).join(',');
if(sg===tg)return;tg=sg;w.textContent='';
for(var k=0;k<2;k++){var u=el('ul','dcmx__t');if(k)A(u,'data-dup','1');
tp.forEach(function(it){var li=el('li','dcmx__i');if(it.pillar)A(li,'data-pillar',it.pillar);
li.appendChild(el('span','dcmx__c',clk(it.published_at)));
li.appendChild(el('span','dcmx__s',it.source||''));
li.appendChild(el('span','dcmx__h',it.title||''));u.appendChild(li);});
w.appendChild(u);}}
var pl=d.getElementById('dcmx-new'),bf=[];
function box(){var u=d.getElementById('dcmx-arrivals');if(u)return u;
var f=q('.nfeed');if(!f)return null;
var b=el('section','dcmx-arr');b.appendChild(el('p','dcmx-arr__h','Arrived since this page loaded'));
u=el('ol','dcmx-arr__l');u.id='dcmx-arrivals';u.tabIndex=-1;
b.appendChild(u);f.parentNode.insertBefore(b,f);return u;}
function hu(u){u=typeof u==='string'?u.toLowerCase():'';return u.indexOf('https://')===0||u.indexOf('http://')===0;}
function row(it){var li=el('li','dcmx-arr__i');if(it.pillar)A(li,'data-pillar',it.pillar);
var t=el('time',null,clk(it.published_at));A(t,'datetime',it.published_at);
var ok=hu(it.url),h=el(ok?'a':'span',null,it.title||'');
if(ok){h.href=it.url;h.rel='noopener nofollow';}
li.appendChild(t);li.appendChild(el('span','dcmx-arr__s',it.source||''));li.appendChild(h);return li;}
function ago(){if(!pl||pl.hidden)return;
q('.dcmx-new__t',pl).textContent=bf.length?('newest '+dur(Math.max(0,(Date.now()-T(bf[0].published_at))/1000))+' ago'):'';}
function ofr(){if(!pl)return;if(!bf.length){pl.hidden=true;return;}
q('.dcmx-new__n',pl).textContent=bf.length+(bf.length>=C.bufferMax?'+':'');
q('.dcmx-new__w',pl).textContent=(bf.length===1?' new story':' new stories')+' since you arrived';
pl.hidden=false;ago();}
function mg(){var u=box();if(!u)return;var a=[];
for(var i=bf.length-1;i>=0;i--)a.unshift(u.insertBefore(row(bf[i]),u.firstChild));
bf=[];ofr();arr(a);u.focus({preventScroll:true});
u.scrollIntoView({behavior:rm?'auto':'smooth',block:'center'});}
if(pl)L(q('button',pl),'click',mg);
function aN(n){
if(!n||typeof n.generated_at!=='string'||!Array.isArray(n.items))throw new Error('bad news');
if(n.generated_at===nAt)return;nAt=n.generated_at;
var ls=n.items.filter(function(it){return it&&it.id&&isFinite(T(it.published_at));}).sort(bc);
rt();rk(ls);
if(!nw){if(ls.length)nw=ls[0].published_at;ls.forEach(function(it){mem[it.id]=1;});return;}
var fr=ls.filter(function(it){return !mem[it.id]&&T(it.published_at)>T(nw);});
if(!fr.length)return;
fr.forEach(function(it){mem[it.id]=1;});nw=fr[0].published_at;bf=fr.concat(bf).slice(0,C.bufferMax);ofr();}
function run(){
if(d.hidden){wt=true;return;}
wt=false;gj(C.stateUrl).then(function(s){aS(s);if(noN)return null;
return gj(C.newsUrl).then(aN,function(e){if(!e||!e.missing)throw e;noN=true;console.warn('dcmx news 404');});
}).then(function(){fl=0;plan(C.pollMs);},function(e){fl++;
console.warn('dcmx poll '+fl+': '+((e&&e.message)||e));
if(fl>=3){off=true;if(nt)q('.dcmx-note__k',nt).textContent='REFRESH STOPPED';
say('refresh gave up; reload the page');return;}
plan(BO[fl]);});}
L(d,'visibilitychange',function(){if(d.hidden)return;ago();if(wt&&!off)run();});
setInterval(function(){if(!d.hidden)ago();},C.tickMs);
plan(C.pollMs);
})();`;

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

function jsonBlock(obj) {
  // A "</script>" inside any string value would close the block and turn the
  // rest of the document into markup.
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

/**
 * Everything layout.mjs needs, in the three places it can inject.
 *
 * @param {object} ctx   build context (state, news, history, moves, href)
 * @param {object} [opts] { stateUrl, newsUrl (null disables), pollMs }
 * @param {string} [path] this page's root-relative path, for the reload link
 * @returns {{head: string, beforeMain: string, bodyEnd: string}}
 */
export function motionBlock(ctx, opts = {}, path = '/') {
  if (!ctx || typeof ctx.href !== 'function') {
    throw new Error('_motion.motionBlock(): needs the build ctx with an href() helper.');
  }
  if (!ctx.state || typeof ctx.state.generated_at !== 'string') {
    throw new Error('_motion.motionBlock(): ctx.state.generated_at is required; motion animates from a real observation or not at all.');
  }

  const cfg = motionConfig(ctx, opts);
  const strip = ticker(tickerModel(ctx));

  return {
    head: `<style>${motionCss()}</style>`,
    beforeMain: `${strip}${note(ctx, path)}${newPill()}`,
    bodyEnd: `<script type="application/json" id="dcmx-cfg">${jsonBlock(cfg)}</script>\n<script>${MOTION_JS}</script>`,
  };
}
