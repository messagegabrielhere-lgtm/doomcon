// The homepage news module: a reel of the day's most significant items, then a
// dense terminal feed underneath it.
//
// This is our answer to pizzint's live OSINT column (TEARDOWN 2.x) and it is
// deliberately built the opposite way round. Theirs is a client-rendered strip
// that is blank in a prerender and blank in a screenshot taken before
// hydration. Every row below is in the static HTML. There is no fetch on this
// page, no script tag, no hydration - the feed is as visible to a crawler and
// to a screenshotter as it is to a reader.
//
// It exports a fragment rather than a page, because index.mjs owns the
// dashboard. See the integration note at the bottom of this file.

import { esc, utc } from './_html.mjs';
import { readNews, reel, pillarTag, pillarSprite, pillarCss, reelCss, newsSourceStrip } from './_reel.mjs';

const HOME_ROWS = 14;
const REEL_CARDS = 8;

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
  <ol class="nfeed">${rows.map(feedRow).join('')}</ol>
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
 */
export function legend(news) {
  const window = news.window_label ? ` Window: ${news.window_label}.` : '';
  return `<p class="nkey">Ranked by score, highest first &middot; <b>AGE</b> is measured from the compile
     stamp above, not from your clock &middot; <b>&times;N</b> marks an item carried by N independent
     sources.${esc(window)}</p>`;
}

export function feedRow(it) {
  const title = it.href
    ? `<a class="nrow__a" href="${esc(it.href)}" rel="noopener nofollow">${esc(it.title)}</a>`
    : esc(it.title);

  const corr = it.corroboration.count > 1
    ? `<span class="corr" title="${esc(it.corroboration.sources.join(', ') || `${it.corroboration.count} independent sources`)}">` +
      `<span aria-hidden="true">&times;${it.corroboration.count}</span>` +
      `<span class="vh">carried by ${it.corroboration.count} independent sources</span></span>`
    : '';

  // NEW is a word, not a colour, for exactly the reason the level bars are
  // shapes: it has to survive a greyscale screenshot and a screen reader.
  const fresh = it.fresh
    ? '<span class="nrow__new">NEW</span>'
    : '';

  const score = it.scoreLabel !== null
    ? `<span class="nrow__score num" title="raw score ${esc(String(it.score))}">${esc(it.scoreLabel)}` +
      `<i class="meter" style="--w:${it.scorePct.toFixed(1)}%" aria-hidden="true"></i></span>`
    : '<span class="nrow__score num nrow__score--none" title="this item carries no score">&mdash;</span>';

  const sub = it.summary
    ? `<p class="nrow__sub">${esc(clip(it.summary, 190))}</p>`
    : '';

  return `<li class="nrow" data-pillar="${esc(it.pillar)}" data-enter="${it.enter ? 1 : 0}" style="--i:${it.rank - 1}">
    <div class="nrow__in">
      <span class="nrow__rank num" aria-hidden="true">${esc(it.rankLabel)}</span>
      <p class="nrow__meta">
        <time class="nrow__clock num" datetime="${esc(it.published_at)}" title="${esc(it.stampFull)}">${esc(it.stamp)}</time>
        <span class="nrow__age num" title="${esc(`${it.age.label} before the compile stamp`)}">${esc(it.age.label)}</span>
        ${pillarTag(it.pillar)}
        <span class="nrow__src">${esc(it.source)}</span>
        ${fresh}
      </p>
      <div class="nrow__right">${score}${corr}</div>
      <h3 class="nrow__h"><span class="vh">Rank ${esc(it.rank)}. </span>${title}</h3>
      ${sub}
    </div>
  </li>`;
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

// site/styles.mjs is owned by another module and inlines one <style> into
// <head>. These rules ship inside the fragment instead, which costs one extra
// <style> element and keeps the news feature self-contained: it can be added to
// or removed from a page without touching the global sheet. Everything below
// is namespaced under .n* / .reel / .ptag, and every value is one of the
// existing design tokens - no new colours except the five pillar hues.
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

.nfeed { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--rule); }
.nrow { position: relative; border-bottom: 1px solid var(--rule); }
/* The pillar rail. Two pixels of colour that also happen to be the only thing
   animated when a row is new - see the motion block at the bottom. */
.nrow::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 2px;
  background: var(--p, var(--rule)); opacity: 0.55; transform-origin: top;
}
.nrow:hover { background: var(--bg-raised); }
.nrow:hover::before { opacity: 1; }

.nrow__in {
  display: grid; grid-template-columns: 2.6ch minmax(0, 1fr) auto;
  gap: 3px 9px; padding: 10px 2px 11px 11px; align-items: baseline;
}
.nrow__rank { grid-column: 1; grid-row: 1; font-family: var(--mono); font-size: var(--t-xs); color: var(--ink-faint); }
.nrow__meta {
  grid-column: 2; grid-row: 1; margin: 0;
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap; min-width: 0;
}
.nrow__clock { font-family: var(--mono); font-size: var(--t-2xs); color: var(--ink-dim); letter-spacing: 0.02em; white-space: nowrap; }
.nrow__age {
  font-family: var(--mono); font-size: var(--t-2xs); color: var(--ink-faint);
  border: 1px solid var(--rule-soft); border-radius: 2px; padding: 0 4px; white-space: nowrap;
}
.nrow__src {
  font-family: var(--mono); font-size: var(--t-2xs); letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--ink-faint); overflow: hidden; text-overflow: ellipsis; max-width: 16ch; white-space: nowrap;
}
.nrow__new {
  font-family: var(--mono); font-size: var(--t-2xs); font-weight: 700; letter-spacing: 0.14em;
  color: var(--accent-ink); background: var(--accent); border-radius: 2px; padding: 1px 4px;
}

/* Score and corroboration stack in one right-hand cell. They belong together -
   both answer "how much should I trust this row's position" - and keeping the
   badge out of the meta line stops every corroborated row wrapping to a third
   line on a phone, which cost about 26px a row across a 200-row archive. */
.nrow__right { grid-column: 3; grid-row: 1; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.nrow__score { font-family: var(--mono); font-size: var(--t-base); font-weight: 700; color: var(--ink); text-align: right; }
.nrow__score--none { color: var(--ink-faint); font-weight: 400; }
/* A bar relative to the top-scoring item in the window, so the ordering is
   legible at a glance whatever scale the collector scores on. */
.meter { display: block; height: 2px; width: 34px; margin: 3px 0 0 auto; background: var(--rule); }
.meter::before { content: ''; display: block; height: 100%; width: var(--w, 0%); background: var(--p, var(--accent)); }

.nrow__h { grid-column: 2 / -1; grid-row: 2; font-size: var(--t-sm); line-height: 1.34; font-weight: 500; letter-spacing: -0.01em; overflow-wrap: anywhere; }
/* Inherits the document underline. See the anchor block in site/styles.mjs:
   these headline links had no static affordance at all. */
.nrow__a:hover { text-decoration: underline; text-decoration-color: var(--p, var(--accent)); }
.nrow__sub { grid-column: 2 / -1; grid-row: 3; font-size: var(--t-xs); color: var(--ink-faint); margin: 2px 0 0; }

/* 375px: the rank column is the first thing that stops earning its width, so
   it goes, and the meta line is allowed to wrap to two lines rather than
   truncating the source name off the end. */
@media (max-width: 400px) {
  .nrow__in { grid-template-columns: minmax(0, 1fr) auto; padding-left: 9px; }
  .nrow__rank { display: none; }
  .nrow__meta { grid-column: 1; }
  .nrow__right { grid-column: 2; }
  .nrow__h, .nrow__sub { grid-column: 1 / -1; }
}

/* Motion. The enter animation moves the pillar rail and a background tint -
   never the headline. A row that fades in from opacity 0 is a blank row in a
   screenshot taken in the first 300ms, and screenshots are the growth loop. */
@media (prefers-reduced-motion: no-preference) {
  .nrow[data-enter="1"]::before {
    animation: doomconRail 420ms ease-out backwards;
    animation-delay: calc(var(--i, 0) * 45ms);
  }
  @keyframes doomconRail { from { transform: scaleY(0); } to { transform: scaleY(1); } }

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
// ---------------------------------------------------------------------------
