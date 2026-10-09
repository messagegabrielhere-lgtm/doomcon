// The homepage news module: a reel of the day's most significant items, then a
// dense feed of pills underneath it.
//
// This is our answer to pizzint's live OSINT column (TEARDOWN 2.x) and it is
// deliberately built the opposite way round. Theirs is a client-rendered strip
// that is blank in a prerender and blank in a screenshot taken before
// hydration. Every row below is in the static HTML. There is no fetch on this
// page, no script tag, no hydration - the feed is as visible to a crawler and
// to a screenshotter as it is to a reader.
//
// THE ROW IS A PILL. Five research sweeps measured the sites a newcomer reads
// fastest - Metaculus, artificialanalysis.ai - and they make the table the
// product: one full-width outlined track per row, 32px tall, 8px radius, a 1px
// neutral border, the label on the left and the value on the right at 16px,
// with a fill bar behind the text whose WIDTH IS THE VALUE. Our rows were text
// in a list. feedRow() below is that pill, and it is the single definition of
// what a row is: the homepage feed, the switcher tab and /news all render it.
//
// The fill is the item's score OUT OF 100 - the collector's own ceiling
// (collector/news.mjs clamps at 100), not a share of the top item in the
// window - and it is always paired with the printed figure at the pill's right
// edge, so colour is never the carrier and a greyscale screenshot still reads.
// A missing score prints as missing: a dashed track, an em dash and the words
// "no score", never a fill of zero.
//
// It exports a fragment rather than a page, because index.mjs owns the
// dashboard. See the integration note at the bottom of this file.

import { esc, utc } from './_html.mjs';
import { readNews, reel, pillarTag, pillarSprite, pillarCss, reelCss, newsSourceStrip } from './_reel.mjs';
import * as brand from '../brand.mjs';
import { slugFor } from './itemPage.mjs';

const HOME_ROWS = 14;
const REEL_CARDS = 8;

// The scorer's ceiling. docs/NEWS.md states the score as 0-100 and
// collector/news.mjs clamps it there, so the fill behind a row is score/100
// and the unit printed after the figure is this number.
const SCORE_CEILING = 100;

/**
 * The homepage news section.
 *
 * @param {object} ctx  build context; needs ctx.news (parsed data/news.json),
 *                      ctx.state and ctx.href.
 * @returns {string} HTML fragment, or '' when there is no news data at all.
 */
export function render(ctx) {
  const news = readNews(ctx);

  // No news.json: the feature is not wired this build and the section does not
  // exist. Rendering an empty feed here would claim we looked and found
  // nothing, which is a different and false statement.
  if (!news) return '';

  const rows = news.items.slice(0, HOME_ROWS);
  const archiveHref = ctx.href('/news.html');

  // Data present, window genuinely empty. That IS a finding and it gets said in
  // words, with the per-source strip underneath so the reader can see whether
  // the silence is real or whether every feed is dark.
  if (!rows.length) {
    return `${styleTag()}
<section class="sec news" aria-labelledby="news-h">
  ${liveHead(news, 'Signal feed')}
  <p class="lede">No items in the collection window. This is a measured zero, not an outage:
     the per-source strip below says which feeds answered and which did not.</p>
  ${newsSourceStrip(news.sources)}
</section>`;
  }

  return `${styleTag()}
${reel(news.items, {
    id: 'reel',
    limit: REEL_CARDS,
    heading: "Today's signal",
    href: archiveHref,
  })}
<section class="sec news" aria-labelledby="news-h">
  ${liveHead(news, 'Signal feed')}
  ${legend(news)}
  <ol class="nfeed">${rows.map((it) => feedRow(it)).join('')}</ol>
  <p class="nkey nkey--more">
    <a href="${esc(archiveHref)}">All ${esc(news.total)} items in the window &rarr;</a>
  </p>
  ${newsSourceStrip(news.sources)}
</section>`;
}

/**
 * Section header with the liveness pip.
 *
 * The pip pulses and says LIVE, which is a claim - so the exact compile stamp
 * is printed beside it, and the pip degrades to STALE and then COLD off the
 * real age of news.json. A pip that says LIVE unconditionally is pizzint's
 * status endpoint reporting "healthy" at two successful scrapes per day.
 */
export function liveHead(news, heading, id = 'news-h') {
  const l = news.liveness;
  return `<div class="nhead">
    <h2 class="sec__h" id="${esc(id)}">${esc(heading)}</h2>
    <p class="nlive" data-live="${esc(l.status)}">
      <span class="nlive__pip" aria-hidden="true"></span>
      <b>${esc(l.word)}</b>
      <span class="nlive__stamp">compiled <time datetime="${esc(news.generated_at)}">${esc(utc(news.generated_at))}</time></span>
    </p>
  </div>`;
}

/**
 * The line that makes every relative age on this page honest.
 *
 * _html.mjs bans "3 minutes ago" for good reason: a static page that says it is
 * lying within the hour. An age measured against a stamp that is printed two
 * lines above is a duration, not a moment, and stays true forever. So the feed
 * gets its "14m" - and gets told exactly what the 14m is counted from.
 *
 * It also states what the fill behind each pill is, because a bar with no
 * stated scale is decoration and this one is a measurement.
 */
export function legend(news) {
  const window = news.window_label ? ` Window: ${news.window_label}.` : '';
  return `<p class="nkey">Ranked by score, highest first &middot; the fill behind each row is that item's
     <b>score out of ${SCORE_CEILING}</b>, the same figure printed at its right edge &middot; <b>AGE</b> is measured
     from the compile stamp above, not from your clock &middot; <b>&times;N</b> marks an item carried by N
     independent sources.${esc(window)}</p>`;
}

/**
 * One row: the pill, then the provenance line, then the summary.
 *
 * @param {object} it    a normalized item from _reel.readNews()
 * @param {object} [opts]
 * @param {string} [opts.attrs]   extra attributes spliced onto the <li>, already
 *                                escaped, each with its leading space (the
 *                                archive's id / data-tier / data-corr hooks)
 * @param {string} [opts.before]  HTML placed inside the row ahead of the pill
 *                                (the archive's tier / corroboration banner)
 * @param {object|null} [opts.corr]  overrides the corroboration chip:
 *                                { count, sources[], kind: 'item'|'story' }.
 *                                Absent, the chip is the item's own
 *                                corroboration; null suppresses it.
 *
 * Every piece of provenance the old row carried is still here and in the same
 * order of importance: the source, the exact UTC stamp and its age, the pillar
 * tag (now the mark inside the pill), the corroboration set (in the chip's
 * title and its screen-reader sentence),
 * and the link to the item as its publication printed it. Nothing is clipped
 * except the summary, and that is marked with a real ellipsis.
 */
export function feedRow(it, opts = {}) {
  const title = it.href
    ? `<a class="nrow__a" href="${esc(it.href)}" rel="noopener nofollow">${esc(it.title)}</a>`
    : esc(it.title);

  const corr = corrChip(opts.corr === undefined ? it.corroboration : opts.corr);

  // NEW is a word, not a colour, for exactly the reason the fill is paired with
  // a figure: it has to survive a greyscale screenshot and a screen reader.
  const fresh = it.fresh
    ? '<span class="nrow__new">NEW</span>'
    : '';

  // THE VALUE AND THE FILL ARE THE SAME NUMBER. scoreLabel is the figure the
  // page prints (already on the 0-100 scale whichever scale the collector
  // emitted, see _reel.readNews), and the fill is that printed figure as a
  // percentage of the ceiling - so the bar can never disagree with the digits
  // beside it. The raw score rides along in the title.
  const scored = it.scoreLabel !== null;
  const value = scored
    // THE SCORE IS THE LINK. Each item has a permanent page carrying its
    // five-term score decomposition and corroboration set - the thing a reader
    // cannot get from the original article, and the site's 200-URL search
    // asset. The newsroom list never linked to those pages, before or after
    // the pill redesign; the number that the page explains is the obvious
    // place to hang the link, and it inherits the document underline so it
    // reads as one.
    ? `<a class="npill__v num" href="${brand.BASE_PATH}/item/${esc(slugFor(it))}.html" title="Score ${esc(String(it.score))} of 100 - open the breakdown">${esc(it.scoreLabel)}` +
      `<span class="npill__u">/${SCORE_CEILING}</span></a>`
    : '<span class="npill__v num npill__v--none" title="this item carries no score">&mdash;<span class="vh"> no score</span></span>';

  const sub = it.summary
    ? `<p class="nrow__sub">${esc(clip(it.summary, 190))}</p>`
    : '';

  const attrs = typeof opts.attrs === 'string' ? opts.attrs : '';
  const before = typeof opts.before === 'string' ? opts.before : '';

  return `<li class="nrow"${attrs} data-pillar="${esc(it.pillar)}" data-enter="${it.enter ? 1 : 0}" style="--i:${it.rank - 1}">
    <div class="nrow__in">${before}
      <div class="npill"${scored ? ` style="--fill:${fillPct(it.scoreLabel)}%"` : ' data-fill="none"'}>
        <i class="npill__fill" aria-hidden="true"></i>
        <span class="npill__right">${corr}${value}</span>
        <span class="npill__rank num" aria-hidden="true">${esc(it.rankLabel)}</span>
        ${pillarTag(it.pillar)}
        <h3 class="npill__h"><span class="vh">Rank ${esc(it.rank)}. </span>${title}</h3>
      </div>
      <p class="nrow__meta">
        <time class="nrow__clock num" datetime="${esc(it.published_at)}" title="${esc(it.stampFull)}">${esc(it.stamp)}</time>
        <span class="nrow__age num" title="${esc(`${it.age.label} before the compile stamp`)}">${esc(it.age.label)}</span>
        <span class="nrow__src">${esc(it.source)}</span>
        ${fresh}
        <button type="button" class="nrow__x" data-xpost="news" data-x-title="${esc(it.title)}" data-x-src="${esc(it.source)}"${it.href ? ` data-x-url="${esc(it.href)}"` : ''} aria-label="Post this story to X">𝕏 Post</button>
      </p>
      ${sub}
    </div>
  </li>`;
}

/**
 * The corroboration chip. Items carried by several independent sources are
 * the valuable ones - it is the one number a single-source competitor cannot
 * compute - so it sits ON the pill with weight, as a filled chip, rather than
 * as a small figure on a meta line.
 *
 * Two kinds, two shapes, one vocabulary. `item`: the same item was carried by
 * N sources (the dedup group). `story`: N sources ran this story (the cluster
 * in news.json's stories[]). Both print ×N and the word; the filled/outlined
 * shape tells them apart, and the exact sentence - with the sources named - is
 * in the title and in the screen-reader text, so nothing here is a hue.
 */
function corrChip(c) {
  if (!c || !Number.isFinite(c.count) || c.count <= 1) return '';
  const n = Math.round(c.count);
  const names = Array.isArray(c.sources) ? c.sources.filter((s) => typeof s === 'string') : [];
  const kind = c.kind === 'story' ? 'story' : 'item';
  const sentence = kind === 'story'
    ? `${n} independent sources ran this story`
    : `carried by ${n} independent sources`;
  const full = names.length ? `${sentence}: ${names.join(', ')}` : sentence;
  return `<span class="npill__corr" data-kind="${kind}" title="${esc(full)}">` +
    `<b aria-hidden="true">&times;${n}</b><span class="npill__corrw" aria-hidden="true">sources</span>` +
    `<span class="vh">${esc(full)}</span></span>`;
}

// The printed figure, clamped to the ceiling, as the fill width. Written so it
// can never emit "-0": Number("-0") is negative zero and String(-0) is "0".
function fillPct(label) {
  const v = Number(label);
  if (!Number.isFinite(v)) return '0';
  const c = Math.max(0, Math.min(SCORE_CEILING, v));
  return String(c === 0 ? 0 : c);
}

// Truncation is on a word boundary and marked with a real ellipsis, so nobody
// can read a clipped summary as the whole of what the source said.
function clip(text, max) {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const at = cut.lastIndexOf(' ');
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,.;:–—-]+$/, '')}…`;
}

// ---------------------------------------------------------------------------
// CSS
// ---------------------------------------------------------------------------

// site/styles.mjs is owned by another module and links one stylesheet from
// <head>. These rules ship inside the fragment instead, which costs one extra
// <style> element and keeps the news feature self-contained: it can be added to
// or removed from a page without touching the global sheet. Everything below
// is namespaced under .n* / .reel / .ptag, and every value is one of the
// existing design tokens - no new colours except the five pillar hues, which
// _reel.mjs already publishes in both schemes as --p.
const feedCss = `
.news { margin: 34px 0 0; }
.nhead { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.nhead .sec__h { margin-bottom: 8px; }

.nlive {
  display: inline-flex; align-items: center; gap: 7px; margin: 0 0 8px;
  font-family: var(--mono); font-size: var(--t-2xs); letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-faint);
}
.nlive b { font-weight: 700; color: var(--ink); }
.nlive__pip { width: 7px; height: 7px; border-radius: 50%; flex: 0 0 auto; background: var(--ok); }
.nlive[data-live="stale"] .nlive__pip { background: var(--stale); }
.nlive[data-live="cold"]  .nlive__pip { background: transparent; border: 1.5px solid var(--dark-src); }
.nlive[data-live="stale"] b { color: var(--stale); }
.nlive[data-live="cold"]  b { color: var(--dark-src); }
.nlive__stamp { color: var(--ink-faint); letter-spacing: 0.04em; text-transform: none; }

.nkey { font-family: var(--mono); font-size: var(--t-xs); line-height: 1.6; color: var(--ink-faint); margin: 0 0 10px; }
.nkey b { color: var(--ink-dim); font-weight: 500; }
.nkey--more { margin: 10px 0 18px; }
.nkey--more a { color: var(--ink-dim); text-decoration: none; border-bottom: 1px solid var(--rule); }
.nkey--more a:hover { color: var(--ink); border-bottom-color: var(--accent); }

/* ---- the list ---------------------------------------------------------- */
.nfeed { list-style: none; margin: 0; padding: 0; }
/* No rule between rows any more: each pill carries its own outline, and a
   hairline under an outlined box is two borders doing one job. */
.nrow { position: relative; padding: 5px 0 7px; border-radius: 8px; }
.nrow:hover { background: var(--bg-raised); }
.nrow:hover .npill { border-color: var(--ink-faint); }

/* ---- THE PILL ----------------------------------------------------------
   32px minimum, 8px radius, 1px neutral track (--rule). The fill is an
   absolutely positioned bar behind the text whose width is the score out of
   100; the label is the headline at 16px/500 on the left, and the value is
   the same score at 16px/500 on the right. A headline is never clipped -
   this site does not shorten a sentence and attribute it to its publisher -
   so a long one wraps and the pill grows with it. The value and the chip
   float on the first line and the text runs full-width beneath them.

   flow-root, not block: the right-hand cluster is a float, and a container
   that does not establish a formatting context lets a float hang out of the
   bottom of a one-line pill. */
.npill {
  position: relative; isolation: isolate; display: flow-root;
  min-height: 32px; padding: 3px 10px; margin: 0;
  border: 1px solid var(--rule); border-radius: 8px;
  line-height: 1.5;
}
/* 3px + 24px line + 3px + two 1px borders = 32px for a one-line pill. Every
   inline box in the pill is kept inside the 24px line: the tag is top-aligned
   rather than raised, and the floated cluster carries no bottom margin, so
   nothing grows the line box past the strut. */
/* The fill sits between the pill's own background and its text: negative
   z-index inside the pill's isolated stacking context paints exactly there.
   The wrapper clips to the radius so the bar's corners follow the track's;
   the bar itself is the ::before, and its width is the row's --fill. The
   flat wash is declared first so an engine without color-mix draws a neutral
   bar rather than nothing, and the 2px edge gives the value a hard end to
   read against in greyscale. */
.npill__fill { position: absolute; inset: 0; z-index: -1; border-radius: inherit; overflow: hidden; pointer-events: none; }
.npill__fill::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: var(--fill, 0%);
  background: var(--wash-alt);
  background: color-mix(in srgb, var(--p, var(--accent)) 20%, transparent);
  /* 1px, not 2: a headline that wraps to five lines on a phone has this edge
     running through all five, and at 2px it reads as a text cursor. At 1px
     it is a rule - still a hard end for the value in greyscale. */
  border-right: 1px solid var(--p, var(--accent));
}
/* No score: a dashed track, no bar. Missing is a state, not a zero. */
.npill[data-fill="none"] { border-style: dashed; }
.npill[data-fill="none"] .npill__fill::before { display: none; }

.npill__right { float: right; display: inline-flex; align-items: center; gap: 6px; height: 24px; margin: 0 0 0 10px; }
.npill__v {
  font-family: var(--mono); font-size: var(--t-base); font-weight: 500; line-height: 1;
  color: var(--ink); white-space: nowrap; font-variant-numeric: tabular-nums;
}
.npill__u { font-size: var(--t-2xs); color: var(--ink-faint); }
/* The score link is 16px tall; on touch screens its hit area grows to ~40px without moving the row. */
@media (pointer: coarse) { a.npill__v { position: relative; } a.npill__v::after { content: ''; position: absolute; inset: -12px -8px; } }
.npill__v--none { color: var(--ink-faint); }

/* The corroboration chip. Filled - ink on ground, in both schemes - because
   this is the number that earns a row its place and it should read from
   across the room. The story kind is the same chip outlined. */
.npill__corr {
  display: inline-flex; align-items: center; gap: 4px; height: 22px; padding: 0 8px; border-radius: 11px;
  font-family: var(--mono); font-size: var(--t-2xs); line-height: 1; letter-spacing: 0.04em;
  color: var(--bg); background: var(--ink); border: 1px solid var(--ink); white-space: nowrap;
}
.npill__corr b { font-weight: 700; }
.npill__corr[data-kind="story"] { color: var(--ink); background: transparent; }

.npill__rank { font-family: var(--mono); font-size: var(--t-xs); font-weight: 500; color: var(--ink-faint); margin-right: 8px; }
/* The mark: the pillar tag - sigil and short code in the pillar's hue, with
   the pillar's full name for a screen reader - sits inside the pill between
   the rank and the headline. It is emitted once per row, here, and not again
   on the provenance line. */
.npill .ptag { margin-right: 8px; vertical-align: top; margin-top: 1px; }
.npill__h {
  display: inline; margin: 0; font-size: var(--t-base); font-weight: 500; line-height: 1.5;
  letter-spacing: -0.01em; overflow-wrap: anywhere;
}
/* Inherits the document underline. See the anchor block in site/styles.mjs:
   these headline links had no static affordance at all. */
.nrow__a:hover { text-decoration: underline; text-decoration-color: var(--p, var(--accent)); }
/* site/styles.mjs's tap-target pass sets .nrow__a to display:flex with a 24px
   min-height. Inside the pill the link is inline text on 24px line boxes -
   the same target height, delivered by line-height - and a flex box here
   drops the headline onto its own line under the rank and the tag, which is
   two lines for a twelve-character title. Two classes outrank the one. */
.npill .nrow__a { display: inline; min-height: 0; }

/* ---- the provenance line, under the pill ------------------------------- */
.nrow__meta {
  margin: 4px 0 0; padding: 0 10px;
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap; min-width: 0;
}
.nrow__clock { font-family: var(--mono); font-size: var(--t-2xs); color: var(--ink-dim); letter-spacing: 0.02em; white-space: nowrap; }
.nrow__age {
  font-family: var(--mono); font-size: var(--t-2xs); color: var(--ink-faint);
  border: 1px solid var(--rule-soft); border-radius: 2px; padding: 0 4px; white-space: nowrap;
}
.nrow__x {
  all: unset; cursor: pointer; margin-left: auto; padding: 2px 8px; border: 1px solid var(--ink-faint, #556);
  font: 600 11px/1.4 var(--f-mono, ui-monospace, monospace); letter-spacing: .04em; color: inherit; opacity: .8;
}
.nrow__x:hover, .nrow__x:focus-visible { opacity: 1; border-color: currentColor; outline: none; }
.nrow__src {
  font-family: var(--mono); font-size: var(--t-2xs); letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--ink-faint); overflow: hidden; text-overflow: ellipsis; max-width: 16ch; white-space: nowrap;
}
.nrow__new {
  font-family: var(--mono); font-size: var(--t-2xs); font-weight: 700; letter-spacing: 0.14em;
  color: var(--accent-ink); background: var(--accent); border-radius: 2px; padding: 1px 4px;
}
.nrow__sub { margin: 3px 0 0; padding: 0 10px; font-size: var(--t-xs); color: var(--ink-faint); overflow-wrap: anywhere; }

/* 375px: the pill keeps everything - rank, mark, headline, chip, value - and
   gives up only the word on the chip; the ×N and the screen-reader sentence
   stay. Nothing on the row is hidden. */
@media (max-width: 400px) {
  .npill { padding: 3px 8px; }
  .npill__right { margin-left: 8px; }
  .npill__corrw { display: none; }
  .nrow__meta, .nrow__sub { padding: 0 8px; }
}

/* Motion. The enter animation wipes the fill in and tints the row - never
   the headline or the figure. A row that fades in from opacity 0 is a blank
   row in a screenshot taken in the first 300ms, and screenshots are the
   growth loop. */
@media (prefers-reduced-motion: no-preference) {
  .nrow[data-enter="1"] .npill__fill::before {
    transform-origin: left;
    animation: doomconFill 520ms ease-out backwards;
    animation-delay: calc(var(--i, 0) * 45ms);
  }
  @keyframes doomconFill { from { transform: scaleX(0); } to { transform: scaleX(1); } }

  .nrow[data-enter="1"] {
    animation: doomconRowIn 1100ms ease-out backwards;
    animation-delay: calc(var(--i, 0) * 45ms);
  }
  @keyframes doomconRowIn {
    0%   { background: color-mix(in srgb, var(--p, var(--accent)) 16%, transparent); }
    100% { background: transparent; }
  }

  .nlive[data-live="live"] .nlive__pip { animation: doomconPip 2.6s ease-in-out infinite; }
  @keyframes doomconPip {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%      { opacity: 0.32; transform: scale(0.7); }
  }
}
`;

/** All CSS the news feed and the reel need. Safe to inline more than once. */
export function newsCss() {
  return [pillarCss, reelCss, feedCss].join('\n');
}

/**
 * Everything the news markup needs before its first tag: the stylesheet and the
 * sigil sprite. Emitted once per page by whichever news module renders first;
 * emitting it twice is harmless (duplicate symbol ids resolve to the first).
 */
export function styleTag() {
  return `<style>${newsCss()}</style>${pillarSprite()}`;
}

// ---------------------------------------------------------------------------
// INTEGRATION (site/build.mjs and site/templates/index.mjs own these calls)
//
//   build.mjs:  read data/news.json (tolerate ENOENT -> ctx.news = null) and
//               put the parsed object on ctx as ctx.news.
//   index.mjs:  import * as news from './news.mjs';
//               ...and drop `${news.render(ctx)}` into main, directly after the
//               freshness strip and before the pillars. The operator's brief
//               puts the feed second on mobile, after the index itself.
//
// render(ctx) returns '' when ctx.news is absent, so wiring the call before the
// collector ships news.json is safe and changes nothing.
//
// feedRow(it) keeps its one-argument form for _switcher.mjs; the second
// argument is what newsPage.mjs uses to attach its archive hooks and banner,
// replacing the string splice it used to do on this module's output.
// ---------------------------------------------------------------------------
