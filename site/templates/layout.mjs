// The document shell every page is poured into. One <style> block, no external
// stylesheet, no framework. If a page needs JavaScript to show its number, it is
// wrong.
//
// v4 changed what this file is FOR. It used to be a wrapper: masthead, one
// counter strip, a footer with five links. It is now the publication's chrome —
// the thing that makes six pages read as one desk rather than one page with
// siblings. Three additions carry that:
//
//   1. THE RAIL. A single dense status line of facts about DIFFERENT things:
//      the signed delta since the previous observation, when the next one is
//      due, when this one landed, the source counters, the posture. Measured
//      against pizzint, our problem was never glyph count - it was that ~20 of
//      our 57 desktop atoms were the SAME composite score wearing a different
//      hat. Every cell here is a fact the hero does not already state.
//
//   2. TWO ATOMS THAT MOVE, AND ARE NEVER WRONG. `OBSERVED 00:04:49Z` grows a
//      ticking `· 7m 12s ago`, and `NEXT DUE 00:15Z` becomes a live countdown
//      that degrades to DUE and then to OVERDUE. On a quiet night pizzint
//      changed exactly two above-fold strings in seventy seconds - a clock and
//      a countdown - and that is the whole of their perceived liveness. We had
//      zero. Both of ours carry information theirs do not, and both are exact
//      UTC facts in the static HTML before any script runs.
//
//   3. THE RETURN LINE. `SINCE YOU LOOKED` diffs this build against what the
//      browser stored on the last visit. Nobody in this category has a return
//      state at all - grepping all 26 of pizzint's JS chunks finds three
//      localStorage keys, none of them about change. We have stable receipt
//      ids and a signed delta, which is everything the mechanic needs.
//
// The motion layer (o.motion) is unchanged: opt-in, off for every caller that
// does not ask, and everything it animates is already in the HTML it decorates.

import { esc, num, utc, utcClock, jsonScript } from './_html.mjs';
import { degradedBanner, deltaChip } from './_parts.mjs';
import { motionBlock } from './_motion.mjs';
import { css, FONT_HREF } from '../styles.mjs';
import * as brand from '../brand.mjs';
import * as marks from '../brandmarks.mjs';

/**
 * The publication. Order is the nav order and the footer order, so a reader who
 * learns one has learned both.
 *
 * `needs` gates a route on data that may be absent: build.mjs only writes
 * race.html when data/race.json parsed and news.html when data/news.json did.
 * A nav that links a 404 is worse than a nav with five items, and "be careful"
 * is not a mechanism - the gate is. hasSection() below holds every predicate.
 *
 * `count(ctx)` is what turns the nav from a list of words into an instrument.
 *
 * Every destination that HOLDS a number publishes it in the nav, so a reader
 * learns what is behind a link before spending a tap on it. Each returns
 * `{ v, k }` — the figure, and the word a screen reader hears in its place —
 * or null, and null prints nothing at all rather than a dash. Methodology has
 * no scalar and is deliberately left bare: a nav that invented a number for the
 * page that explains the numbers would be a joke at its own expense.
 */
const SECTIONS = [
  { href: '/', label: 'Index', short: 'Index',
    blurb: 'The composite, the five pillars, the live signal feed.',
    count: (ctx) => (ctx.state && Number.isFinite(ctx.state.score)
      ? { v: num(ctx.state.score, 1), k: 'composite score' } : null) },
  { href: '/race.html', label: 'The Race', short: 'Race', needs: 'race',
    blurb: 'Frontier labs ranked on live prediction-market odds.',
    count: raceCount },
  { href: '/news.html', label: 'Newsroom', short: 'News', needs: 'news',
    blurb: 'Every story, scored on how many independent sources carried it.',
    count: (ctx) => (ctx.news && Array.isArray(ctx.news.items) && ctx.news.items.length
      ? { v: String(ctx.news.items.length), k: 'scored items' } : null) },
  { href: '/watts.html', label: 'Watts', short: 'Watts', needs: 'watts',
    blurb: 'The substrate index: grid load, drought and buildout under the models.',
    count: (ctx) => (ctx.infra && Number.isFinite(ctx.infra.score)
      ? { v: num(ctx.infra.score, 1), k: 'substrate score' } : null) },
  { href: '/map.html', label: 'Map', short: 'Map', needs: 'map',
    blurb: 'Where the compute physically sits, against the water it needs.',
    count: (ctx) => (ctx.datacenters && ctx.datacenters.counts
      ? { v: String(ctx.datacenters.counts.sites ?? ctx.datacenters.sites.length), k: 'datacentres mapped' } : null) },
  // Beside /map on purpose: both are maps of physical AI infrastructure, and a
  // reader who has learned one legend has learned half of the other.
  //
  // THE COUNT IS QUALIFIED IN THE NAV ITSELF. `k` is what a screen reader
  // hears in place of the figure, and it carries copy.headline_qualifier — "as
  // mapped in OpenStreetMap on <date>" — because 115,608 read as a national
  // total is the single wrong reading this page exists to prevent, and a bare
  // number in a navigation bar is read as a total by default. The qualifier
  // comes from the payload rather than from a string typed here, so it cannot
  // drift from the date the data was actually collected.
  { href: '/flock.html', label: 'Cameras', short: 'Cameras', needs: 'flock',
    blurb: 'Automated licence-plate readers, as volunteers have mapped them into OpenStreetMap.',
    count: (ctx) => {
      const f = ctx.flock;
      if (!f || !f.totals || !Number.isFinite(f.totals.mapped_worldwide)) return null;
      const q = f.copy && f.copy.headline_qualifier ? f.copy.headline_qualifier : 'as mapped in OpenStreetMap';
      return { v: grouped(f.totals.mapped_worldwide), k: `Flock ALPR cameras ${q}` };
    } },
  { href: '/leaders.html', label: 'Leaders', short: 'Leaders', needs: 'leaders',
    blurb: 'What the people running AI said this week, as their publishers printed it.',
    count: (ctx) => {
      const rows = ctx.leaders && Array.isArray(ctx.leaders.leaders) ? ctx.leaders.leaders : null;
      if (!rows) return null;
      const on = rows.filter((r) => Array.isArray(r.lines) && r.lines.length).length;
      return { v: `${on}/${rows.length}`, k: 'leaders on the record this week' };
    } },
  { href: '/digest.html', label: 'Digest', short: 'Digest', needs: 'digest',
    blurb: 'The day in one page, assembled from the scored corpus.' },
  { href: '/bliss.html', label: 'Bliss', short: 'Bliss', needs: 'bliss',
    blurb: 'The same machinery, pointed the other way.',
    count: (ctx) => (ctx.bliss && Number.isFinite(ctx.bliss.score)
      ? { v: num(ctx.bliss.score, 1), k: 'bliss score' } : null) },
  { href: '/methodology.html', label: 'Methodology', short: 'Method',
    blurb: 'Every formula and constant. Recompute the number yourself.' },
  { href: '/history.html', label: 'History', short: 'History',
    blurb: 'Sixty years of the same argument, dated and attributed.',
    count: (ctx) => (Array.isArray(ctx.history) && ctx.history.length
      ? { v: String(ctx.history.length), k: 'scored observations' } : null) },
  { href: '/moves/', label: 'Archive', short: 'Archive',
    blurb: 'Every scored observation, each with a hash-chained receipt.',
    count: (ctx) => (Array.isArray(ctx.moves) && ctx.moves.length
      ? { v: String(ctx.moves.length), k: 'archived moves' } : null) },
];

/**
 * Thousands separators, done by hand.
 *
 * toLocaleString() would be one call and is banned here: its output depends on
 * the host's ICU build and default locale, so the same inputs would produce
 * different bytes on a contributor's laptop and in CI. This build promises
 * byte-identical output from identical inputs, and 115608 is unreadable at
 * 11.5px in a nav tile, so the grouping is computed rather than looked up.
 */
function grouped(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * The leader's odds, or the roster size — never a stale price.
 *
 * The three market states are kept apart here exactly as they are everywhere
 * else: a leg whose market is not `live` has no probability we are entitled to
 * print. A percentage in a navigation bar is read as current by definition, so
 * a dark one would be the single most misleading number on the site.
 */
function raceCount(ctx) {
  const players = ctx.race && Array.isArray(ctx.race.players) ? ctx.race.players : [];
  if (!players.length) return null;
  const top = players.find((p) => p && p.rank === 1) || players[0];
  const m = top && top.market;
  if (m && m.state === 'live' && Number.isFinite(m.probability)) {
    return { v: `${num(m.probability * 100, 1)}%`, k: `${top.name} on the ranking market` };
  }
  return { v: String(players.length), k: 'labs tracked' };
}

/** Machine-readable surfaces. Separated in the footer because the audience is. */
const DATA_LINKS = [
  { href: '/api/state.json', label: 'JSON API', blurb: 'Level, score, pillars, per-source health.' },
  { href: '/api/history.json', label: 'History JSON', blurb: 'Every scored observation as one file.' },
  { href: '/api/health.json', label: 'Health', blurb: 'Per-source success, honestly reported.' },
  { href: '/embed.html', label: 'Embed', blurb: 'One iframe. No script, no key, no tracking.' },
  { href: '/feed.xml', label: 'RSS', blurb: 'An entry per index move.' },
];

// The published collection cadence, from .github/workflows/collect.yml: a */15
// cron. The rail derives "next due" from it rather than from a guess, and says
// OVERDUE rather than counting down forever when a run is late - GitHub's
// scheduler is routinely 5-20 minutes behind under load, and a countdown that
// never admits that is the pizzint failure in a smaller costume.
const CADENCE_MIN = 15;

/** The newest observation strictly older than the one being rendered, or null. */
function prevObservation(ctx) {
  const rows = Array.isArray(ctx.history) ? ctx.history : [];
  const now = Date.parse(ctx.state && ctx.state.generated_at);
  if (!Number.isFinite(now)) return null;
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
 * The next scheduled collection, as an ISO string.
 *
 * Derived from generated_at alone - never from the build clock - because
 * CONTRACT.md §4 forbids unseeded time in output and two builds from identical
 * inputs must emit identical bytes. Rounds UP to the next wall-clock quarter
 * hour, which is what an every-15-minutes cron actually fires on. (The literal
 * cron expression is not written in this block comment, because its second
 * character pair would close the comment - a trap worth a line of prose.)
 */
function nextDueIso(iso) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const step = CADENCE_MIN * 60000;
  return new Date(Math.floor(t / step) * step + step).toISOString();
}

/**
 * The status rail. Counters only, every one read from real state.
 *
 * The temptation is to print STATUS: OPERATIONAL unconditionally because it
 * reads well. pizzint's own health endpoint does exactly that while reporting
 * two successful scrapes in twenty-four hours. The posture here is computed
 * from the same fields the dashboard shows, so it can say DEGRADED about us.
 *
 * On the dashboard the level/score cell is omitted: the hero is six inches
 * below it at 9.5rem and a second copy is the "same number in another hat"
 * problem this rail exists to fix. On every other page it is the anchor that
 * makes the site read as one instrument, so it is there and it is a link home.
 */
function rail(ctx, path) {
  const st = ctx && ctx.state;
  if (!st || !Array.isArray(st.sources)) return '';

  const total = st.sources.length;
  // "reporting" is ok OR uncalibrated: both answered the request. Only `ok`
  // means we also have a frozen baseline to score it against. Printing
  // "5/14 SOURCES" conflated those and read as though nine were broken, which
  // is the precise confusion this codebase exists to avoid.
  const reporting = st.sources.filter((x) => x.ok || x.uncalibrated).length;
  const scored = st.sources.filter((x) => x.ok).length;
  const dark = st.sources.filter((x) => !x.ok && !x.uncalibrated).length;
  const news = ctx.news && Array.isArray(ctx.news.items) ? ctx.news.items.length : null;
  const feedRows = ctx.news && Array.isArray(ctx.news.sources) ? ctx.news.sources : null;
  const feeds = feedRows ? feedRows.filter((x) => x.ok).length : null;
  const receipts = Array.isArray(ctx.receipts) ? ctx.receipts.length : null;
  const posture = dark > 0 ? 'DEGRADED' : 'OPERATIONAL';

  const prev = prevObservation(ctx);
  const due = nextDueIso(st.generated_at);
  const cells = [];

  const cell = (k, v, extra = '') =>
    `<span class="rail__c"${extra}><span class="rail__k">${k}</span>${v}</span>`;

  // THE WALL CLOCK. Absorbed from the operations strip this pass, which is the
  // only atom that strip carried that this one did not already hold. Rendered
  // with the observation's own second so the first paint is a true UTC time
  // (CONTRACT.md 4: no unseeded clock in output); the chrome script then moves
  // it every second. It is the only element on the site that changes when
  // nothing has happened, and it is honest because it is stating the time
  // rather than pretending the data moved.
  cells.push(cell(
    'UTC',
    `<b class="rail__v rail__clk num" data-dc-clock>${esc(utcClock(st.generated_at))}Z</b>`,
    ' title="Wall-clock UTC. The observation stamp is the next cell along."',
  ));

  if (path !== '/') {
    cells.push(
      `<a class="rail__c rail__c--home" href="${esc(ctx.href('/'))}">` +
      `<span class="rail__k">Now</span>` +
      `<b class="rail__v">${esc(brand.NAME)} ${esc(st.level)}</b>` +
      `<span class="rail__v num">${esc(num(st.score, 1))}<small>/100</small></span></a>`,
    );
  }

  // The single most valuable cell on the page, and the one we were not
  // printing: whether the number moved. It is stated as an exact signed delta
  // against an exact prior stamp, never as "no prior observation" while the
  // score visibly walks.
  if (prev) {
    cells.push(cell(
      'Delta',
      `${deltaChip(st.score - prev.score)}<span class="rail__s">since ${esc(utcClock(prev.generated_at))}Z</span>`,
      ` title="Change in the composite since the previous scored observation at ${esc(utc(prev.generated_at))}."`,
    ));
  }

  // Atom one. Exact UTC in the HTML; the chrome script appends a ticking age.
  cells.push(cell(
    'Observed',
    `<time class="rail__v num" datetime="${esc(st.generated_at)}" data-dc-obs>${esc(utcClock(st.generated_at))}Z</time>` +
    `<span class="rail__age num" data-dc-age hidden></span>`,
    ` title="${esc(utc(st.generated_at))}"`,
  ));

  // Atom two. A schedule, stated as a schedule - and it admits lateness rather
  // than counting down into fiction.
  if (due) {
    cells.push(cell(
      'Next due',
      `<time class="rail__v num" datetime="${esc(due)}" data-dc-next>${esc(utcClock(due))}Z</time>`,
      ` title="Collection runs on a published */${CADENCE_MIN} cron. Scheduled runs are queued and are routinely late."`,
    ));
  }

  cells.push(cell('Sources', `<b class="rail__v num">${reporting}/${total}</b><span class="rail__s">reporting</span>`));
  cells.push(cell('Scored', `<b class="rail__v num">${scored}</b>`));
  if (dark) cells.push(cell('Dark', `<b class="rail__v num">${dark}</b>`, ' data-bad="1"'));
  // A bare "FEEDS 15" is a number with no denominator, which is the one thing
  // VOICE.md will not have. 15 of 16 says both that the newsroom is wide and
  // that one feed is not answering, in four more characters.
  if (feeds !== null) {
    cells.push(cell('Feeds', `<b class="rail__v num">${feeds}/${feedRows.length}</b>`));
  }
  if (news !== null) cells.push(cell('Items', `<b class="rail__v num">${news}</b>`));
  if (receipts !== null) cells.push(cell('Receipts', `<b class="rail__v num">${receipts}</b>`));

  cells.push(
    `<span class="rail__c rail__c--posture" data-posture="${posture.toLowerCase()}">` +
    `<span class="rail__k">Status</span><b class="rail__v">${posture}</b></span>`,
  );

  return `<div class="rail"><div class="wrap rail__in">${cells.join('')}</div></div>`;
}

/**
 * The return line, server-rendered and hidden.
 *
 * The markup and its data are here; the two dozen lines that diff them against
 * localStorage are in CHROME_JS below. Nothing is fetched, so this works on
 * every page including the ones with no motion layer, and it renders nothing at
 * all on a first visit, nothing when storage throws, and nothing when the build
 * the reader last saw is the build they are looking at.
 */
function visitSlot(ctx) {
  const st = ctx.state;
  const obs = Array.isArray(ctx.history) ? ctx.history.length : 0;
  return `<aside class="rvisit" id="dc-visit" role="status" hidden` +
    ` data-at="${esc(st.generated_at)}" data-score="${esc(num(st.score, 1))}"` +
    ` data-level="${esc(st.level)}" data-name="${esc(st.level_name)}" data-obs="${obs}">` +
    `<div class="wrap rvisit__in">` +
    `<b class="rvisit__k">Since you looked</b>` +
    `<span class="rvisit__t num"></span>` +
    `<span class="rvisit__d"></span>` +
    `<span class="rvisit__x"></span>` +
    `<button class="rvisit__b" type="button" data-dc-dismiss>Dismiss</button>` +
    `</div></aside>`;
}

// ---------------------------------------------------------------------------
// The chrome script
// ---------------------------------------------------------------------------
//
// ~3.3KB uncompressed, no dependencies, and everything it touches is already correct in
// the HTML before it runs - it only ever ADDS. Three jobs:
//
//   1. tick the age beside OBSERVED
//   2. turn NEXT DUE into a countdown, then DUE, then OVERDUE
//   3. draw the SINCE YOU LOOKED line from localStorage
//
// Guarded on window.__dcChrome so a second copy is a no-op, and it stands down
// entirely if something else has claimed the return line by setting
// window.__dcSince first. layout.mjs emits the motion layer's bodyEnd BEFORE
// this block, so _motion.mjs can take job 3 over whenever it wants it.
//
// No template literals and no regex literals inside the payload: a `${` would
// be interpolated by the template literal carrying it, and a backslash would be
// eaten by it (the same trap documented at length in _motion.mjs).
const CHROME_JS = `(function(){
if(window.__dcChrome)return;window.__dcChrome=1;
var d=document,M=6e4;
function pad(n){return n<10?'0'+n:''+n;}
/* Ticking form: always carries seconds, so the atom moves every second at any
   age. mm:ss under an hour, h:mm:ss under two days, then days. */
function span(ms){var s=Math.max(0,Math.round(ms/1000));
 if(s<3600)return pad(Math.floor(s/60))+':'+pad(s%60);
 var h=Math.floor(s/3600);
 if(h<48)return h+':'+pad(Math.floor((s%3600)/60))+':'+pad(s%60);
 return Math.round(h/24)+'d';}
/* Coarse form, for the one place a seconds-precise figure would read as a
   clock time rather than as an elapsed span ("18:42:03 ago"). */
function coarse(ms){var s=Math.max(0,Math.round(ms/1000));
 if(s<90)return s+'s';var m=Math.round(s/60);
 if(m<90)return m+'m';var h=Math.floor(s/3600);
 if(h<48)return h+'h '+pad(Math.round((s%3600)/60))+'m';
 return Math.round(h/24)+'d';}
/* MOTION.md: reduce disables the motion, not the information. A figure that
   rewrites itself every second is continuously moving content, so under reduce
   both atoms fall back to the coarse form and a 30s tick - still correct, still
   live, and no longer a thing flickering in the corner of the eye. */
var reduce=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches);
var fmt=reduce?coarse:span,every=reduce?3e4:1000;
var obs=d.querySelector('[data-dc-obs]'),age=d.querySelector('[data-dc-age]'),
    nx=d.querySelector('[data-dc-next]'),clk=d.querySelector('[data-dc-clock]');
var tObs=obs?Date.parse(obs.getAttribute('datetime')):NaN,
    tNx=nx?Date.parse(nx.getAttribute('datetime')):NaN;
function tick(){
 var now=Date.now();
 /* The wall clock. Absorbed from the deleted operations strip. Under reduce it
    ticks every 30s with the same string, which is still a correct UTC time to
    the second at the moment it is written - it simply stops being a thing
    flickering in the corner of the eye. */
 if(clk){var u=new Date(now);
  clk.textContent=pad(u.getUTCHours())+':'+pad(u.getUTCMinutes())+':'+pad(u.getUTCSeconds())+'Z';}
 if(age&&tObs===tObs){age.hidden=false;age.textContent='+'+fmt(now-tObs);}
 if(nx&&tNx===tNx){
  var dt=tNx-now;
  if(dt>0){nx.textContent='in '+fmt(dt);nx.removeAttribute('data-late');}
  else if(dt>-6*M){nx.textContent='due now';nx.setAttribute('data-late','1');}
  else{nx.textContent='overdue '+fmt(-dt);nx.setAttribute('data-late','2');}
 }
}
tick();setInterval(tick,every);

if(window.__dcSince)return;window.__dcSince=1;
try{
 var el=d.getElementById('dc-visit');if(!el)return;
 var K='doomcon.visit.v1',ds=el.dataset;
 var cur={at:ds.at,score:parseFloat(ds.score),level:+ds.level,name:ds.name,obs:+ds.obs};
 var raw=null;try{raw=localStorage.getItem(K);}catch(e){return;}
 var save=function(){try{cur.t=Date.now();localStorage.setItem(K,JSON.stringify(cur));}catch(e){}};
 var prev=null;try{prev=raw?JSON.parse(raw):null;}catch(e){prev=null;}
 save();
 if(!prev||!prev.at||prev.at===cur.at)return;
 var t=el.querySelector('.rvisit__t'),dd=el.querySelector('.rvisit__d'),x=el.querySelector('.rvisit__x');
 if(prev.t)t.textContent=coarse(Date.now()-prev.t)+' ago';
 var delta=cur.score-prev.score,s=delta>0?'up':delta<0?'down':'flat',
     g=delta>0?'\\u25b2':delta<0?'\\u25bc':'\\u25c6';
 dd.setAttribute('data-dir',s);
 dd.textContent=g+' '+prev.score.toFixed(1)+' \\u2192 '+cur.score.toFixed(1);
 var bits=[];
 if(cur.level!==prev.level)bits.push('level '+prev.level+' \\u2192 '+cur.level+' \\u00b7 '+cur.name);
 var n=cur.obs-prev.obs;
 if(n>0)bits.push(n+' new observation'+(n===1?'':'s'));
 x.textContent=bits.join(' \\u00b7 ');
 el.hidden=false;
 var b=el.querySelector('[data-dc-dismiss]');
 if(b)b.addEventListener('click',function(){el.hidden=true;});
}catch(e){}
})();`;

/**
 * @param {object} o
 * @param {object} o.ctx      build context (href/url helpers, state)
 * @param {string} o.title    full <title>; already includes the brand
 * @param {string} o.description
 * @param {string} o.path     root-relative path of THIS page, for canonical + nav
 * @param {string} o.main     the page body HTML
 * @param {string} [o.ogImage] root-relative card path; omitted if the card is absent
 * @param {boolean} [o.noindex]
 * @param {Array<object>} [o.jsonld]
 * @param {boolean} [o.showDegraded] dashboard shows the banner; deep pages do not
 * @param {string} [o.head]    extra HTML injected at the end of <head>
 * @param {string} [o.bodyEnd] extra HTML injected just before </body>
 * @param {true|object} [o.motion] enable the motion layer. `true` takes the
 *        defaults; an object is passed through to _motion.motionBlock as
 *        { stateUrl, newsUrl (null disables news polling), pollMs }.
 */
/* THE OPERATIONS STRIP IS GONE, and what it was for is in rail() above.

   Measured on the built homepage at 375px, 2026-09-24: .ops printed
   "14/14 REPORTING · 5 SCORED · 15 FEEDS · 200 ITEMS · STATUS: OPERATIONAL"
   twenty-eight pixels above a rail printing SOURCES 14/14 reporting, SCORED 5,
   FEEDS 15/16, ITEMS 200, STATUS OPERATIONAL. Five atoms, stated twice, in two
   strips, 53px of an 812px fold - the exact "same fact wearing a different
   hat" failure the rail was built to fix, committed by the file that built it.
   .ops carried exactly one atom the rail did not: the ticking wall clock. That
   atom is now a rail cell and the strip is deleted. Nothing else in the repo
   emitted .ops or .ops__*; grepped across every template before cutting. */

// ---------------------------------------------------------------------------
// The feature bar.
//
// pizzint's features are findable because they sit in a seven-item ICON ROW
// near the top — Pizza Cards, HormuzHub, Gay Bar Report, Strip Club Index, Map
// View, Commute Index — each a tile you can see rather than a word in a list.
// Ours were a thin run of text in the masthead, which reads as boilerplate, so
// /watts, /digest and /bliss shipped and nobody could find them.
//
// Same links, same SECTIONS table, same live counts. The difference is that a
// tile with a mark and a number on it reads as a PLACE, and a word in a row
// reads as chrome.
//
// The palette is measured from pizzint (2026-09-24): ground #060c16, a
// near-black navy rather than grey, and a saturated hue per destination out of
// their own spectrum — #ffef2a #eab308 #ff7a00 #ff0033 #00e676 #00a3ff #4b59ff
// #c400ff. Eleven hues doing eleven jobs is why their page reads as an arcade
// HUD and ours read as a terminal printout. Colour is never the only carrier:
// every tile also has a distinct mark and its name in text.
// ---------------------------------------------------------------------------
const FEATURE_ART = {
  '/': { hue: '#ffef2a', mark: '<path d="M2 12.5 6.5 6l3.5 4L14 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' },
  '/race.html': { hue: '#00e676', mark: '<path d="M3 13V7m5 6V3m5 10V9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' },
  '/news.html': { hue: '#00a3ff', mark: '<path d="M2.5 4h11v8.5H2.5z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M4.5 6.5h5M4.5 9h7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>' },
  '/watts.html': { hue: '#ff7a00', mark: '<path d="M9 2 4 9h3l-1 5 5-7H8z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' },
  '/map.html': { hue: '#c400ff', mark: '<path d="M8 14s4.5-4.2 4.5-7.4A4.5 4.5 0 0 0 3.5 6.6C3.5 9.8 8 14 8 14z" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="6.5" r="1.6" fill="currentColor"/>' },
  // Aqua: the one clear gap in the eleven hues above — #00a3ff is azure and
  // #00e676 is green, and nothing sits between them. Far enough from /map's
  // #c400ff that the two map pages never read as the same tile, which is the
  // pair most at risk of being confused.
  '/flock.html': { hue: '#00e5ff', mark: '<path d="M3.2 14.4V4.6h3.2M1.8 14.4h2.8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.4 2.7h5.4v3.8H6.4z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M11.8 3.5 14 2.5v4.2l-2.2-1z" fill="currentColor"/>' },
  '/leaders.html': { hue: '#ff0033', mark: '<path d="M8 2.5a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M3 13.5c0-2.6 2.2-4.2 5-4.2s5 1.6 5 4.2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' },
  '/digest.html': { hue: '#ffd600', mark: '<path d="M3.5 2.5h9v11l-4.5-2.5L3.5 13.5z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>' },
  '/bliss.html': { hue: '#5fd08a', mark: '<circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' },
  '/methodology.html': { hue: '#4b59ff', mark: '<path d="M6 2v4.5L2.8 12a1.6 1.6 0 0 0 1.4 2.4h7.6A1.6 1.6 0 0 0 13.2 12L10 6.5V2z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>' },
  '/history.html': { hue: '#ffb655', mark: '<circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 4.5V8l2.5 1.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' },
  '/moves/': { hue: '#9aa4b2', mark: '<path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' },
};

function featureBar(ctx, sections, path, { inline = false } = {}) {
  const tiles = sections.map((item) => {
    const art = FEATURE_ART[item.href] || { hue: 'var(--accent)', mark: '' };
    const c = typeof item.count === 'function' ? item.count(ctx) : null;
    const current = item.href === path ? ' aria-current="page"' : '';
    // `k` WAS BEING COMPUTED AND THROWN AWAY. SECTIONS documents it as "the
    // word a screen reader hears in place of the figure" and nothing rendered
    // it, so every tile announced a bare number: "ALPR, 115,608". For most
    // tiles that is merely unhelpful. For this one it is the wrong reading —
    // 115,608 heard without "as mapped in OpenStreetMap on <date>" is heard as
    // a national total, which is the single claim the data cannot support. So
    // the unit is attached where it was always meant to go: aria-label for
    // assistive technology, title for a pointer. Neither changes the visible
    // tile, and a tile with no count is unchanged.
    const unit = c && c.k ? `${c.v} ${c.k}` : '';
    const named = unit ? ` aria-label="${esc(`${item.label}: ${unit}`)}" title="${esc(unit)}"` : '';
    return `<a class="fb__t" href="${esc(ctx.href(item.href))}"${current}${named} style="--fb-hue:${esc(art.hue)}">
      <svg class="fb__m" viewBox="0 0 16 16" aria-hidden="true" focusable="false">${art.mark}</svg>
      <span class="fb__l">${esc(item.label)}</span>
      ${c ? `<b class="fb__n num">${esc(c.v)}</b>` : '<span class="fb__n fb__n--none" aria-hidden="true">·</span>'}
    </a>`;
  }).join('');
  // Inline form: the masthead already supplies the .wrap and the gutter, so a
  // second one here would indent the tiles inside their own band. The tile
  // markup is identical either way -- only the container changes.
  if (inline) return `<nav class="fb fb--inline" aria-label="Sections">${tiles}</nav>`;
  return `<nav class="fb" aria-label="Sections"><div class="wrap fb__in">${tiles}</div></nav>`;
}

const FEATURE_BAR_CSS = `<style>
.fb { border-bottom: 1px solid var(--rule); background: var(--bg-sunken); }
.fb__in { display: flex; gap: 6px; padding: 7px var(--gutter); overflow-x: auto; scrollbar-width: thin; }
.fb__t {
  display: flex; align-items: center; gap: 6px; flex: 0 0 auto;
  padding: 6px 10px; border: 1px solid var(--rule); border-radius: 7px;
  background: color-mix(in srgb, var(--fb-hue) 7%, transparent);
  text-decoration: none; color: var(--ink-dim);
  font-family: var(--mono); font-size: var(--t-xs); letter-spacing: .07em; text-transform: uppercase;
  transition: border-color 120ms ease, background 120ms ease, color 120ms ease;
}
.fb__m { width: 15px; height: 15px; color: var(--fb-hue); flex: none; }
.fb__n { color: var(--fb-hue); font-variant-numeric: tabular-nums; font-size: var(--t-xs); }
.fb__n--none { opacity: .45; }
.fb__t:hover { color: var(--ink); border-color: var(--fb-hue);
  background: color-mix(in srgb, var(--fb-hue) 16%, transparent); }
.fb__t[aria-current="page"] {
  color: var(--ink); border-color: var(--fb-hue);
  background: color-mix(in srgb, var(--fb-hue) 20%, transparent);
  box-shadow: inset 0 -2px 0 0 var(--fb-hue);
}
/* THE INLINE FORM -- the tiles live in the masthead's row, not in a band of
   their own. Two bands cost two borders, two lots of vertical padding and, on
   a wide screen, a whole extra 58px stripe before any content.

   flex-wrap on .masthead__in does the responsive work with no breakpoint: the
   tiles sit beside the lockup when they fit and drop to their own line when
   they do not, so nothing is ever hidden behind a horizontal gesture. All
   eleven destinations stay TILES at every width -- a mark and a live number --
   because the text-link treatment is what made /watts, /digest and /bliss
   undiscoverable in the first place. */
.fb--inline {
  display: flex; gap: 6px; flex: 1 1 100%; min-width: 0;
  justify-content: flex-start;
}
/* WRAP, DO NOT SCROLL, ONCE THERE IS ROOM TO WRAP INTO.
   Measured 2026-09-25 at 1440x900: the tiles need 1400px and the column is
   1240, so the strip was scrolling 160px and "Archive" sat past the right
   edge -- one to two destinations hidden behind a gesture with no affordance,
   at the commonest desktop width. That is the same findability failure the
   tiles were built to fix, arriving from the other direction. A second row
   costs ~38px and hides nothing. */
@media (min-width: 700px) { .fb--inline { flex-wrap: wrap; } }
/* Under 700px eleven tiles would wrap into three rows and eat the fold, so the
   strip scrolls -- the one width where a swipe is the expected idiom, and
   where the labels are already dropped so a tile is a mark and a number. */
@media (max-width: 699px) {
  .fb--inline { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: thin; padding-bottom: 2px;
    /* The strip is ALWAYS scrollable at this width -- eleven tiles need ~790px
       of a 375px screen -- so the right edge is faded to say so. Without it the
       last tile ends flush and the strip reads as complete, which is how five
       destinations go missing on a phone. The fade is unconditional here
       precisely because the overflow is. */
    -webkit-mask-image: linear-gradient(90deg, #000 calc(100% - 26px), transparent);
    mask-image: linear-gradient(90deg, #000 calc(100% - 26px), transparent);
  }
}
/* The tagline must not eat the row the tiles need. */
.masthead__in > .masthead__tag { flex: 0 1 auto; }
/* THE LABEL STAYS ON A PHONE. This hid .fb__l below 620px so twelve tiles
   would fit, which turned the entire navigation into twelve icon-and-number
   pairs with no words — the operator's exact words were "it's an icon and a
   number for the flock map, it doesn't say what it is so I wouldn't know to
   click it". They were right, and it was true of all twelve, not just that
   one. An unlabelled glyph beside a number is a puzzle, not a destination.
   The strip already scrolls horizontally at this width and already carries a
   fade on its right edge to say so, so the cost of keeping the words is that
   fewer tiles are visible at once — which is the correct trade: four tiles a
   reader can read beats twelve they cannot. */
@media (max-width: 620px) { .fb__t { padding: 7px 9px; } }
@media (prefers-reduced-motion: reduce) { .fb__t { transition: none; } }
</style>`;

export function page(o) {
  const { ctx } = o;
  const canonical = ctx.url(o.path);
  const jsonld = (o.jsonld || []).map((block) => jsonScript(block)).join('\n');

  // Absent -> the empty string, and every interpolation site below is written
  // so that the empty string changes nothing. A page() caller that does not ask
  // for motion gets the same output it got before this existed, which is the
  // only way to be sure the nine existing callers still work.
  const motion = o.motion
    ? motionBlock(ctx, o.motion === true ? {} : o.motion, o.path)
    : { head: '', beforeMain: '', bodyEnd: '' };

  const lead = (s) => (s ? `\n${s}` : '');
  const headExtra = lead(motion.head) + lead(o.head);
  const bodyEndExtra = lead(motion.bodyEnd) + lead(o.bodyEnd);

  // og:image only when the card actually exists on disk. A tag pointing at a
  // 404 is worse than no tag: X renders a broken card instead of falling back
  // to the summary form, and the share is the whole growth loop.
  // Fall back to the live state card rather than to nothing. Every page with
  // no card of its own — /methodology, /history, the 200 item pages — was
  // emitting NO og:image at all, which docs/COMPETITIVE.md measured as the
  // largest single acquisition hole on the site: a shared link rendered as a
  // bare blue rectangle. The state card is a reading rather than a logo, so
  // the fallback is worth clicking.
  const ogPath = o.ogImage || 'cards/state.png';
  const ogImage = ogPath
    ? `<meta property="og:image" content="${esc(ctx.url(ogPath))}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="675">
    <meta property="og:image:alt" content="${esc(o.ogImageAlt || `${brand.NAME} share card`)}">
    <meta name="twitter:image" content="${esc(ctx.url(ogPath))}">
    <meta name="twitter:card" content="summary_large_image">`
    : '';

  // twitter:site is emitted only when brand.X_HANDLE is a handle we control.
  // pizzint ships a handle they do not own on every page; the fix is to have no
  // fallback value at all rather than to remember to check.
  const twitterSite = brand.X_HANDLE
    ? `<meta name="twitter:site" content="${esc(brand.X_HANDLE)}">`
    : '';

  // The nav carries the number each destination holds. Two labels are emitted
  // per link, not one: the full name and the short one, and CSS swaps them at
  // phone width - so a nine-item nav with a figure on each is one wrapped row
  // on a 375px screen rather than three. The figure is inside the link on
  // purpose; it is the reason to tap, not a decoration beside it.
  const sections = SECTIONS.filter((s) => !s.needs || hasSection(ctx, s.needs));
  // The masthead text nav was REMOVED here. The feature bar above renders the
  // same SECTIONS array with a mark and a live count on each tile, so it was a
  // strict superset of this list, and shipping both stacked two navigations on
  // top of each other: 122px of masthead on a 375px phone, and no answer to
  // "which one do I use?". Measured 2026-09-25, chrome above the first content
  // was 244px of an 812px fold. `sections` stays — the feature bar and the
  // footer both still read it.

  // Data pages get the wide measure; prose pages keep the 66ch reading column.
  // A methodology page at 1240px is a worse methodology page; a dashboard at
  // 940px on a 1440px screen is 500px of margin doing nothing.
  const wide = o.path === '/' || o.path === '/race.html' || o.path === '/news.html';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.description)}">
<link rel="canonical" href="${esc(canonical)}">
${o.noindex ? '<meta name="robots" content="noindex,follow">' : '<meta name="robots" content="index,follow,max-image-preview:large">'}
<meta name="color-scheme" content="dark light">
<meta name="theme-color" content="#faf9f6" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0b0c0e" media="(prefers-color-scheme: dark)">
<meta property="og:type" content="${esc(o.ogType || 'website')}">
<meta property="og:site_name" content="${esc(brand.PUBLICATION)}">
<meta property="og:title" content="${esc(o.ogTitle || o.title)}">
<meta property="og:description" content="${esc(o.description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta name="twitter:card" content="summary_large_image">
${twitterSite}
${ogImage}
<link rel="alternate" type="application/rss+xml" title="${esc(brand.NAME)} index moves" href="${esc(ctx.href('/feed.xml'))}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${esc(FONT_HREF)}">
${marks.headLinks({ href: ctx.href })}
<style>${marks.LOCKUP_CSS}</style>
<style>${css()}</style>${headExtra}
${jsonld}
</head>
<body${wide ? ' data-wide="1"' : ''}>
<a class="skip" href="#main">Skip to the index</a>
<header class="masthead"><div class="wrap masthead__in">
  ${marks.mastheadLockup(ctx.state.level, { href: ctx.href('/'), current: o.path === '/', logos: ctx.logos, logoHref: (n) => ctx.href(`/logos/${n}`) })}
  <p class="masthead__tag">${esc(brand.TAGLINE)}</p>
  ${featureBar(ctx, sections, o.path, { inline: true })}
</div></header>${FEATURE_BAR_CSS}
${rail(ctx, o.path)}
${visitSlot(ctx)}
${o.showDegraded ? degradedBanner(ctx.state) : ''}${motion.beforeMain}
<main class="wrap" id="main">
${o.main}
</main>
${footer(ctx, sections, o.path)}${bodyEndExtra}
<script>${CHROME_JS}</script>
</body>
</html>
`;
}

/**
 * The route gate. One predicate per `needs` key, and each one is the SAME
 * predicate build.mjs uses to decide whether to write the file — deliberately
 * restated here rather than imported, because importing wattsPage into layout
 * would close an import cycle (every page module imports `page` from this
 * file). If build.mjs's gate moves, this one moves with it; that pairing is in
 * the integration note.
 *
 * `digest` and `bliss` read false today, because build.mjs sets neither
 * ctx.digest nor ctx.bliss. That is the correct failure: the entries sit in
 * SECTIONS ready, and the day the integrator wires those two templates up the
 * nav grows two links and the footer grows two rows with no edit here. A nav
 * that links a 404 is worse than a nav with seven items.
 */
function hasSection(ctx, key) {
  if (key === 'race') return Boolean(ctx.race && Array.isArray(ctx.race.players) && ctx.race.players.length);
  if (key === 'news') return Boolean(ctx.news && Array.isArray(ctx.news.items) && ctx.news.items.length);
  if (key === 'watts') {
    return Boolean(ctx.infra && Array.isArray(ctx.infra.sources) && ctx.infra.sources.length
      && Array.isArray(ctx.infra.pillars));
  }
  if (key === 'digest') return Boolean(ctx.digest && typeof ctx.digest === 'object');
  if (key === 'bliss') return Boolean(ctx.bliss && Array.isArray(ctx.bliss.sources) && ctx.bliss.sources.length);
  if (key === 'leaders') {
    return Boolean(ctx.leaders && Array.isArray(ctx.leaders.leaders) && ctx.leaders.leaders.length);
  }
  if (key === 'map') {
    return Boolean(ctx.datacenters && Array.isArray(ctx.datacenters.sites)
      && ctx.datacenters.sites.length && ctx.datacenters.resources_index);
  }
  // /flock is gated on TWO facts, because it is decided by two modules.
  //
  // The data half is build.mjs's hasFlockData() restated verbatim — same
  // fields, same order — and the two must move together. `coverage` and `copy`
  // are required, not optional: copy carries the "as mapped in OpenStreetMap
  // on <date>" qualifier this nav prints, the sentence that separates a county
  // nobody has mapped from a county with no cameras, and the
  // "© OpenStreetMap contributors" attribution the ODbL requires. A page
  // without them would publish a crowdsourced sample as a census.
  //
  // The second half is ctx.routes.flock, which build.mjs sets and this module
  // cannot compute: whether site/templates/flockPage.mjs loaded at all. Data
  // with no template is no page, and a tile drawn from the data alone would
  // link a 404 until the template lands. Absent ctx.routes — a harness
  // rendering layout on its own — the data predicate stands by itself.
  if (key === 'flock') {
    if (ctx.routes && ctx.routes.flock === false) return false;
    const f = ctx.flock;
    return Boolean(f
      && f.totals && Number.isFinite(f.totals.mapped_worldwide)
      && Array.isArray(f.counties) && f.counties.length
      && Array.isArray(f.states) && f.states.length
      && f.coverage
      && f.copy && f.copy.attribution_required);
  }
  return true;
}

/**
 * The footer as a site index, not a link list.
 *
 * pizzint spends 26.5% of its homepage height selling its other pages and we
 * spent 3.6%. Half of that gap closes in the footer for free: every route on
 * the site, in the same order as the nav, each with the one sentence that says
 * why you would open it. The reader who got this far is the reader most likely
 * to open a second page, and we were handing them five bare words.
 */
function footer(ctx, sections, path) {
  const col = (id, heading, items, blurbKey = 'blurb') => `
    <div class="foot__col">
      <h2 class="foot__h" id="${esc(id)}">${esc(heading)}</h2>
      <ul class="foot__list">
        ${items.map((it) => {
          const external = /^https?:/.test(it.href);
          const href = external ? it.href : ctx.href(it.href);
          const here = !external && it.href === path ? ' aria-current="page"' : '';
          return `<li><a href="${esc(href)}"${here}${external ? ' rel="noopener"' : ''}>${esc(it.label)}</a>` +
            (it[blurbKey] ? `<span>${esc(it[blurbKey])}</span>` : '') + `</li>`;
        }).join('')}
      </ul>
    </div>`;

  const source = [{ href: brand.REPO_URL, label: 'Source code', blurb: `Every line that produced these numbers. ${brand.LICENSE}.` }];

  // The two ALPR endpoints appear only when the route does. Every other row in
  // DATA_LINKS is unconditional because every other endpoint is; these two are
  // written only when data/flock.json parsed, and a footer link to a 404 is
  // the same failure as a nav link to one.
  const flockOn = hasSection(ctx, 'flock');
  const zeros = flockOn && ctx.flock.coverage && Number.isFinite(ctx.flock.coverage.counties_with_none_mapped)
    ? ctx.flock.coverage.counties_with_none_mapped : null;
  const dataLinks = flockOn ? [...DATA_LINKS,
    { href: '/api/flock.json', label: 'ALPR JSON',
      blurb: zeros === null
        ? 'Mapped ALPR cameras by state and by county, every county included.'
        : `Mapped ALPR cameras by state and by county — including the ${grouped(zeros)} counties nobody has mapped.` },
    { href: '/api/flock-points.json', label: 'ALPR points',
      blurb: 'Packed latitude, longitude and bearing, one entry per mapped camera. OpenStreetMap data, ODbL.' },
  ] : DATA_LINKS;

  // THE LICENCE LINE. ODbL requires the attribution and the link wherever the
  // data is shown, and "the page template will remember" is not a mechanism.
  // The page carries its own attribution; this is the footer's copy of it, on
  // the one route that shows the data, so the licence condition is met by the
  // chrome even if a future edit to the page body drops it. The second
  // sentence is the coverage caveat, printed from the payload rather than
  // paraphrased here: a reader who scrolls to the bottom of a map of cameras
  // should not be able to leave believing the blank counties are clear.
  const odbl = flockOn && path === '/flock.html'
    ? `<p class="foot__fine">Camera locations on this page are ${esc(ctx.flock.copy.attribution_required)}, licensed under the
      <a href="${esc(ctx.flock.copy.attribution_url || 'https://www.openstreetmap.org/copyright')}" rel="noopener">Open Database License</a>.
      ${esc(ctx.flock.coverage && ctx.flock.coverage.what_zero_means ? ctx.flock.coverage.what_zero_means : '')}</p>`
    : '';

  return `<footer class="foot">
  <div class="wrap">
    <div class="foot__top">
      <div class="foot__brand">
        <span class="foot__mark">${esc(brand.PUBLICATION)}</span>
        <p class="foot__creed">${esc(brand.TAGLINE)}</p>
        <p class="foot__dis">${esc(brand.DISCLAIMER)}</p>
      </div>
      <div class="foot__cols">
        ${col('foot-pages', 'The desk', sections)}
        ${col('foot-data', 'Data', dataLinks)}
        ${col('foot-src', 'Provenance', source)}
      </div>
    </div>
    ${odbl}<p class="foot__fine">Collection runs on a published <code>*/${CADENCE_MIN}</code> cron; scheduled runs are queued and
      are routinely late, which is why the rail above says <b>overdue</b> rather than counting down into fiction.
      Every value on this site is computed from public data by published code, and each observation is written to a
      hash-chained receipt carrying its full inputs — so anyone can recompute the number and get the same answer.
      Data and code: ${esc(brand.LICENSE)}.</p>
  </div>
</footer>`;
}
