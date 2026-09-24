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
// 3. NEW ITEMS LAND IN THEIR OWN LABELLED STRIP, not prepended into .nfeed.
//    A feed row carries a rank, a score meter, a why-line and a corroboration
//    count, all computed in news.mjs. Rebuilding that shape in inline JS means
//    two renderers of one row that are guaranteed to diverge, and a half-formed
//    row at the top of a ranked list reads as a bug. The arrivals strip says
//    what it is — "arrived since this page loaded" — which is a true statement
//    about items that were genuinely not in the build.
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
const SEC_PER_ITEM = 3.6;
const TICKER_MIN_S = 40;
const TICKER_MAX_S = 60;

const POLL_MS = 60000;
const ARRIVAL_CAP = 8;

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
.dcmx{position:relative;overflow:hidden;border-bottom:1px solid var(--rule);background:var(--bg-sunken)}
.dcmx__win{display:flex;width:max-content}
.dcmx__t{display:flex;margin:0;padding:0;list-style:none;flex:0 0 auto}
.dcmx__i{display:flex;gap:9px;align-items:baseline;min-width:250px;padding:5px 16px;
  border-right:1px solid var(--rule-soft);white-space:nowrap;font-size:12px}
.dcmx__c{font-family:var(--mono);font-size:10.5px;letter-spacing:.06em;
  color:var(--p,var(--accent));font-variant-numeric:tabular-nums}
.dcmx__s{font-family:var(--mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-faint)}
.dcmx__h{color:var(--ink-dim);max-width:60ch;overflow:hidden;text-overflow:ellipsis}
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

// No template literals inside this string: a `${` in the payload would be
// interpolated by the very template literal that carries it.
// THE PAYLOAD. MOTION.md budgets 8KB uncompressed for this string, so the
// reasoning lives in the comments above rather than inside it. Only the notes a
// debugger standing in this code actually needs are shipped; everything else is
// argued for in this file's header and beside the model functions.
//
// No template literals inside the string: a `${` in the payload would be
// interpolated by the very template literal that carries it.
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
var d=document,cfgEl=d.getElementById('dcmx-cfg');
if(!cfgEl){console.error('DOOMCON motion: #dcmx-cfg missing.');return;}
var C;try{C=JSON.parse(cfgEl.textContent);}catch(e){
console.error('DOOMCON motion: #dcmx-cfg is not valid JSON.',e);return;}
var reduce=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches);
function q(s,r){return (r||d).querySelector(s);}
function qa(s,r){return [].slice.call((r||d).querySelectorAll(s));}
function p2(n){return n<10?'0'+n:''+n;}
function clockZ(i){var x=new Date(i);return p2(x.getUTCHours())+':'+p2(x.getUTCMinutes())+'Z';}
function stampUTC(i){return new Date(i).toISOString().replace('T',' ').slice(0,19)+' UTC';}

/* numerals */
var scoreEl=q('[data-dc-score]')||q('.score__val'),shown=C.score;
function paint(v){if(scoreEl)scoreEl.textContent=v.toFixed(C.decimals);}
function countTo(to,ms){
 var from=shown;shown=to;
 if(!scoreEl||reduce||from===to){paint(to);return;}
 var t0=0;
 requestAnimationFrame(function step(t){
  if(!t0)t0=t;
  var p=Math.min(1,(t-t0)/ms);
  paint(from+(to-from)*(1-Math.pow(1-p,3)));
  if(p<1)requestAnimationFrame(step);
 });
}
if(scoreEl&&C.prevScore!==null&&C.prevScore!==C.score&&!reduce){
 shown=C.prevScore;paint(C.prevScore);countTo(C.score,600);
}
var badge=q('[data-dc-level]')||q('.level__digit');
if(badge&&C.levelChanged&&!reduce)badge.classList.add('dcmx-pulse');

/* feed arrival */
function arrive(n){
 if(reduce)return;
 for(var i=0;i<n.length&&i<C.arrivalCap;i++){
  n[i].style.animationDelay=(i*40)+'ms';n[i].classList.add('dcmx-in');
 }
}
/* TRAP: dcmx-in starts at opacity 0; late = blink out a visible row. */
if(C.since&&d.readyState!=='complete'){
 var since=Date.parse(C.since);
 arrive(qa('.nfeed > .nrow').filter(function(li){
  var t=li.querySelector('time[datetime]');
  return t&&Date.parse(t.getAttribute('datetime'))>since;
 }));
}

/* reel auto-advance */
var vp=q('.reel__viewport'),rail=vp&&q('.reel__rail',vp),items=rail?qa('.reel__item',rail):[];
var many=!!vp&&items.length>1,live=many&&vp.scrollWidth>vp.clientWidth;
if(many&&!live)console.warn('DOOMCON motion: reel not scrollable; .reel__rail needs width:max-content.');
if(live){
 var dots=d.createElement('div'),timer=null,dead=false,raf=0;
 dots.className='dcmx-dots';
 dots.setAttribute('aria-label','Reel position');
 items.forEach(function(it,i){
  var b=d.createElement('button');
  b.type='button';
  b.setAttribute('aria-label','Card '+(i+1)+' of '+items.length);
  b.setAttribute('aria-current',i===0?'true':'false');
  b.addEventListener('click',function(){stop();go(i);});
  dots.appendChild(b);
 });
 vp.parentNode.insertBefore(dots,vp.nextSibling);
 function go(i){
  vp.scrollTo({left:items[i].offsetLeft-items[0].offsetLeft,behavior:reduce?'auto':'smooth'});
 }
 function at(){
  var x=vp.scrollLeft+items[0].offsetLeft,best=0,bd=Infinity,g;
  for(var i=0;i<items.length;i++){g=Math.abs(items[i].offsetLeft-x);if(g<bd){bd=g;best=i;}}
  return best;
 }
 vp.addEventListener('scroll',function(){
  if(raf)return;
  raf=requestAnimationFrame(function(){
   raf=0;var c=at();
   for(var i=0;i<dots.children.length;i++)dots.children[i].setAttribute('aria-current',i===c?'true':'false');
  });
 },{passive:true});
 /* Permanent; never rearmed. 'scroll' is not a trigger. */
 function stop(){dead=true;if(timer){clearInterval(timer);timer=null;}}
 ['pointerdown','touchstart','wheel','keydown','focusin'].forEach(function(t){
  vp.addEventListener(t,stop,{once:true,passive:true});
  dots.addEventListener(t,stop,{once:true,passive:true});
 });
 if(!reduce)timer=setInterval(function(){
  if(dead||d.hidden)return;
  go((at()+1)%items.length);
 },7000);
}

/* live refresh */
var BACKOFF=[60000,120000,300000],fails=0,tid=null,waiting=false;
var stateAt=C.generatedAt,newsAt=C.newsAt,newest=C.newsNewest,newsOff=!C.newsUrl,seen={};
var noteEl=d.getElementById('dcmx-note');
function plan(ms){if(tid)clearTimeout(tid);tid=setTimeout(run,ms);}
function getJson(u){
 var ac=new AbortController(),to=setTimeout(function(){ac.abort();},10000);
 return fetch(u,{cache:'no-store',signal:ac.signal}).then(function(r){
  clearTimeout(to);
  if(r.status===404){var e=new Error('404');e.missing=true;throw e;}
  if(!r.ok)throw new Error('HTTP '+r.status);
  return r.json();
 },function(e){clearTimeout(to);throw e;});
}
function flash(el){if(el&&!reduce){el.classList.remove('dcmx-flash');void el.offsetWidth;el.classList.add('dcmx-flash');}}
function applyState(s){
 if(!s||typeof s.generated_at!=='string'||typeof s.score!=='number'||!isFinite(s.score))
  throw new Error('state.json has no usable generated_at/score');
 /* unchanged -> not one DOM write. */
 if(s.generated_at===stateAt)return;
 stateAt=s.generated_at;
 countTo(s.score,600);
 var t=q('.hero .eyebrow time[datetime]');
 if(t){t.setAttribute('datetime',s.generated_at);t.textContent=stampUTC(s.generated_at);flash(t);}
 /* Bars, delta, receipt id are build-time: never repaint half. */
 if(noteEl){
  q('.dcmx-note__t',noteEl).textContent=stampUTC(s.generated_at);
  q('.dcmx-note__x',noteEl).textContent=(s.level!==C.level)
   ?('level is now DOOMCON '+s.level+' · '+s.level_name):'';
  noteEl.hidden=false;
 }
}
function arrivals(){
 var ul=d.getElementById('dcmx-arrivals');
 if(ul)return ul;
 var feed=q('.nfeed');
 if(!feed)return null;
 var box=d.createElement('section');
 box.className='dcmx-arr';
 box.innerHTML='<p class="dcmx-arr__h">Arrived since this page loaded</p>'
  +'<ol class="dcmx-arr__l" id="dcmx-arrivals"></ol>';
 feed.parentNode.insertBefore(box,feed);
 return d.getElementById('dcmx-arrivals');
}
/* Scheme test is a string compare, never a regex - see NO REGEX above.
   Third-party feed text: createElement+textContent, never innerHTML. */
function httpUrl(u){u=typeof u==='string'?u.toLowerCase():'';return u.indexOf('https://')===0||u.indexOf('http://')===0;}
function row(it){
 var li=d.createElement('li');
 li.className='dcmx-arr__i';
 if(it.pillar)li.setAttribute('data-pillar',it.pillar);
 var t=d.createElement('time');
 t.setAttribute('datetime',it.published_at);
 t.textContent=clockZ(it.published_at);
 var s=d.createElement('span');
 s.className='dcmx-arr__s';
 s.textContent=String(it.source||'');
 var ok=httpUrl(it.url);
 var h=d.createElement(ok?'a':'span');
 if(ok){h.href=it.url;h.rel='noopener nofollow';}
 h.textContent=String(it.title||'');
 li.appendChild(t);li.appendChild(s);li.appendChild(h);
 return li;
}
function applyNews(n){
 if(!n||typeof n.generated_at!=='string'||!Array.isArray(n.items))
  throw new Error('news.json has no usable generated_at/items');
 if(n.generated_at===newsAt)return;
 newsAt=n.generated_at;
 var fresh=n.items.filter(function(it){
  if(!it||typeof it.published_at!=='string'||seen[it.id])return false;
  return !newest||Date.parse(it.published_at)>Date.parse(newest);
 }).sort(function(a,b){return Date.parse(b.published_at)-Date.parse(a.published_at);})
  .slice(0,C.arrivalCap);
 if(!fresh.length)return;
 var ul=arrivals();
 if(!ul)return;
 var added=[];
 fresh.forEach(function(it){
  seen[it.id]=1;
  if(Date.parse(it.published_at)>Date.parse(newest||0))newest=it.published_at;
  var li=row(it);
  ul.insertBefore(li,ul.firstChild);
  added.push(li);
 });
 arrive(added);
}
function run(){
 if(d.hidden){waiting=true;return;}
 waiting=false;
 getJson(C.stateUrl).then(function(s){
  applyState(s);
  if(newsOff)return null;
  return getJson(C.newsUrl).then(applyNews,function(e){
   if(!e||!e.missing)throw e;
   newsOff=true;
   console.warn('DOOMCON motion: news 404 at '+C.newsUrl+'; build.mjs must write api/news.json.');
  });
 }).then(function(){fails=0;plan(C.pollMs);},function(e){
  fails++;
  console.warn('DOOMCON motion: refresh '+fails+'/3 failed: '+((e&&e.message)||e));
  if(fails>=3){console.warn('DOOMCON motion: stopped after 3 failures.');return;}
  plan(BACKOFF[Math.min(fails,BACKOFF.length-1)]);
 });
}
/* Hidden tab: no timer, no request. */
d.addEventListener('visibilitychange',function(){if(!d.hidden&&waiting)run();});
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
    beforeMain: `${strip}${note(ctx, path)}`,
    bodyEnd: `<script type="application/json" id="dcmx-cfg">${jsonBlock(cfg)}</script>\n<script>${MOTION_JS}</script>`,
  };
}
