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

/**
 * The publication. Order is the nav order and the footer order, so a reader who
 * learns one has learned both.
 *
 * `needs` gates a route on data that may be absent: build.mjs only writes
 * race.html when data/race.json parsed and news.html when data/news.json did.
 * A nav that links a 404 is worse than a nav with five items, and "be careful"
 * is not a mechanism - the gate is.
 */
const SECTIONS = [
  { href: '/', label: 'Index', short: 'Index',
    blurb: 'The composite, the five pillars, the live signal feed.' },
  { href: '/race.html', label: 'The Race', short: 'Race', needs: 'race',
    blurb: 'Frontier labs ranked on live prediction-market odds.' },
  { href: '/news.html', label: 'Newsroom', short: 'News', needs: 'news',
    blurb: 'Every story, scored on how many independent sources carried it.' },
  { href: '/methodology.html', label: 'Methodology', short: 'Method',
    blurb: 'Every formula and constant. Recompute the number yourself.' },
  { href: '/history.html', label: 'History', short: 'History',
    blurb: 'Sixty years of the same argument, dated and attributed.' },
  { href: '/moves/', label: 'Archive', short: 'Archive',
    blurb: 'Every scored observation, each with a hash-chained receipt.' },
];

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
    nx=d.querySelector('[data-dc-next]');
var tObs=obs?Date.parse(obs.getAttribute('datetime')):NaN,
    tNx=nx?Date.parse(nx.getAttribute('datetime')):NaN;
function tick(){
 var now=Date.now();
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
/**
 * The operations strip, with the two ALWAYS-MOVING atoms.
 *
 * Measured 2026-09-24: two DOM snapshots of pizzint seventy seconds apart on a
 * quiet night differed in exactly TWO above-fold strings — a clock and a
 * countdown. That is their entire perceived liveness; the underlying data
 * barely moves. We had zero such atoms, which is why the page felt static even
 * while it was republishing every minute.
 *
 * Both are server-rendered with correct initial values, so a screenshot taken
 * before any script runs still shows a true clock and a true age. The script
 * only keeps them ticking.
 *
 * STATUS is computed, never asserted: it reads DEGRADED when a calibrated
 * source is actually dark. pizzint's own health endpoint reports "healthy" at
 * two successful scrapes in twenty-four hours, and that is the line we hold.
 */
function opsStrip(ctx) {
  const st = ctx && ctx.state;
  if (!st || !Array.isArray(st.sources)) return '';
  const total = st.sources.length;
  const reporting = st.sources.filter((x) => x.ok || x.uncalibrated).length;
  const scored = st.sources.filter((x) => x.ok).length;
  const dark = st.sources.filter((x) => !x.ok && !x.uncalibrated).length;
  const feeds = ctx.news && Array.isArray(ctx.news.sources)
    ? ctx.news.sources.filter((x) => x.ok).length : null;
  const items = ctx.news && Array.isArray(ctx.news.items) ? ctx.news.items.length : null;
  const posture = dark > 0 ? 'DEGRADED' : 'OPERATIONAL';

  const plain = [
    `${reporting}/${total} REPORTING`,
    `${scored} SCORED`,
    feeds !== null ? `${feeds} FEEDS` : null,
    items !== null ? `${items} ITEMS` : null,
  ].filter(Boolean);

  return `<div class="ops" data-posture="${posture.toLowerCase()}"><div class="wrap ops__in">` +
    `<span class="ops__c ops__clk" data-dc-clock>${esc(String(st.generated_at).slice(11, 19))}Z</span>` +
    `<span class="ops__c" data-dc-age data-since="${esc(st.generated_at)}">READ 0S AGO</span>` +
    plain.map((c) => `<span class="ops__c">${esc(c)}</span>`).join('') +
    `<span class="ops__c">STATUS: ${esc(posture)}</span>` +
    `</div></div>` +
    `<script>(function(){` +
    `var c=document.querySelector('[data-dc-clock]'),a=document.querySelector('[data-dc-age]');` +
    `if(!c&&!a)return;var s=a?Date.parse(a.getAttribute('data-since')):NaN;` +
    `function p(n){return n<10?'0'+n:''+n}` +
    `function f(x){if(x<60)return x+'S';var m=Math.floor(x/60);if(m<60)return m+'M '+p(x%60)+'S';` +
    `var h=Math.floor(m/60);return h+'H '+p(m%60)+'M'}` +
    `function t(){var d=new Date();` +
    `if(c)c.textContent=p(d.getUTCHours())+':'+p(d.getUTCMinutes())+':'+p(d.getUTCSeconds())+'Z';` +
    `if(a&&isFinite(s))a.textContent='READ '+f(Math.max(0,Math.round((d.getTime()-s)/1000)))+' AGO'}` +
    `t();setInterval(t,1000);})();</script>`;
}

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
  const ogImage = o.ogImage
    ? `<meta property="og:image" content="${esc(ctx.url(o.ogImage))}">
    <meta property="og:image:alt" content="${esc(o.ogImageAlt || `${brand.NAME} share card`)}">
    <meta name="twitter:image" content="${esc(ctx.url(o.ogImage))}">`
    : '';

  // twitter:site is emitted only when brand.X_HANDLE is a handle we control.
  // pizzint ships a handle they do not own on every page; the fix is to have no
  // fallback value at all rather than to remember to check.
  const twitterSite = brand.X_HANDLE
    ? `<meta name="twitter:site" content="${esc(brand.X_HANDLE)}">`
    : '';

  const sections = SECTIONS.filter((s) => !s.needs || hasSection(ctx, s.needs));
  const nav = sections.map((item) => {
    const current = item.href === o.path ? ' aria-current="page"' : '';
    return `<a href="${esc(ctx.href(item.href))}"${current}>${esc(item.label)}</a>`;
  }).join('');

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
<meta property="og:site_name" content="${esc(brand.NAME)}">
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
<link rel="icon" href="${esc(ctx.href('/favicon.svg'))}" type="image/svg+xml">
<style>${css()}</style>${headExtra}
${jsonld}
</head>
<body${wide ? ' data-wide="1"' : ''}>
<a class="skip" href="#main">Skip to the index</a>
<header class="masthead"><div class="wrap masthead__in">
  <a class="wordmark" href="${esc(ctx.href('/'))}">${esc(brand.NAME)}</a>
  <p class="masthead__tag">${esc(brand.TAGLINE)}</p>
  <nav class="nav" aria-label="Primary">${nav}</nav>
</div></header>
${opsStrip(ctx)}
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

function hasSection(ctx, key) {
  if (key === 'race') return Boolean(ctx.race && Array.isArray(ctx.race.players) && ctx.race.players.length);
  if (key === 'news') return Boolean(ctx.news && Array.isArray(ctx.news.items) && ctx.news.items.length);
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

  return `<footer class="foot">
  <div class="wrap">
    <div class="foot__top">
      <div class="foot__brand">
        <span class="foot__mark">${esc(brand.NAME)}</span>
        <p class="foot__creed">${esc(brand.TAGLINE)}</p>
        <p class="foot__dis">${esc(brand.DISCLAIMER)}</p>
      </div>
      <div class="foot__cols">
        ${col('foot-pages', 'The desk', sections)}
        ${col('foot-data', 'Data', DATA_LINKS)}
        ${col('foot-src', 'Provenance', source)}
      </div>
    </div>
    <p class="foot__fine">Collection runs on a published <code>*/${CADENCE_MIN}</code> cron; scheduled runs are queued and
      are routinely late, which is why the rail above says <b>overdue</b> rather than counting down into fiction.
      Every value on this site is computed from public data by published code, and each observation is written to a
      hash-chained receipt carrying its full inputs — so anyone can recompute the number and get the same answer.
      Data and code: ${esc(brand.LICENSE)}.</p>
  </div>
</footer>`;
}
