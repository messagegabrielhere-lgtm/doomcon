// /news.html - every item in the collection window, on one server-rendered,
// indexable page.
//
// This is our answer to the single most important finding in the teardown:
// pizzint's sitemap holds 1,018 URLs and 997 of them are auto-generated
// /intel/<slug> briefs. The viral index gets the spike; the long tail is the
// durable traffic. We do not auto-generate 997 thin pages of restated
// headlines - that is a content-farm posture and it ages badly - but we do
// need one substantial, crawlable page that carries every item we scored, with
// real structured data on it, rather than a dashboard that is one URL.
//
// Constraints that shaped this file:
//   - no client-side framework, and in fact no JavaScript at all. The pillar
//     filter is five radio inputs and a sibling selector. It works with JS off,
//     it works in a prerender, and the default state shows EVERY row - so a
//     crawler is never looking at a filtered subset.
//   - every row is in the HTML. Same rule as the dashboard, same reason.

import { esc, utc, utcDay } from './_html.mjs';
import { readNews, reel, pillarSigil, pillarSprite, newsSourceStrip } from './_reel.mjs';
import { newsCss, liveHead, legend, feedRow } from './news.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';

const PATH = '/news.html';
const REEL_CARDS = 10;

// Structured data is capped, and numberOfItems still declares the true total.
// _html.mjs pretty-prints JSON-LD at two-space indent, which is right for a
// file a human is invited to audit and expensive across hundreds of nested
// objects: at 200 items the graph was 143 KB, larger than the markup it
// described. 100 is the whole first screen of the ranking and then some.
const JSONLD_MAX = 100;

/** build.mjs guard: is there anything to build this page from? */
export function hasNews(ctx) {
  return Boolean(ctx && ctx.news);
}

export function render(ctx) {
  const news = readNews(ctx);
  if (!news) return emptyPage(ctx);

  const { items, total } = news;
  const days = items.length
    ? uniqueDays(items)
    : 0;

  const main = `<style>${newsCss()}${archiveCss(pillarsPresent(news))}</style>${pillarSprite()}
<section class="narch__intro">
  <h1 class="narch__h1">AI signal feed</h1>
  <p class="lede">Every item ${esc(brand.NAME)} scored in the current collection window &mdash;
     ${esc(total)} item${total === 1 ? '' : 's'} across ${esc(days)} day${days === 1 ? '' : 's'},
     ranked by score and tagged to the pillar each one feeds. These are the inputs behind the
     Attention pillar, published rather than summarised. Nothing here is rewritten: every headline
     links to the source that carried it.</p>
  ${liveHead(news, 'Collection window', 'arch-live')}
  ${legend(news)}
</section>

${reel(items, { id: 'areel', limit: REEL_CARDS, heading: 'Highest-scoring items' })}

${distribution(news)}

<section class="sec narch" aria-labelledby="arch-h">
  <h2 class="sec__h" id="arch-h">All items</h2>
  <h3 class="vh">Filter by pillar</h3>
  ${filterInputs(news)}
  ${filterBar(news)}
  <ol class="nfeed narch__list">${items.map(archiveRow).join('')}</ol>
</section>

<section class="sec" aria-labelledby="arch-src-h">
  <h2 class="sec__h" id="arch-src-h">Where these came from</h2>
  ${newsSourceStrip(news.sources)}
  <p class="nkey">Scores rank items against each other inside this window; they are not a
     probability of anything and they do not move the index on their own. The composite score and
     the level are computed from the five pillars, not from this list.
     <a href="${esc(ctx.href('/methodology.html'))}">Read the methodology &rarr;</a></p>
</section>`;

  return page({
    ctx,
    motion: true,
    path: PATH,
    title: `AI signal feed — ${total} scored items · ${brand.NAME}`,
    ogTitle: `${brand.NAME} signal feed — ${total} scored items`,
    description:
      `Every AI news item ${brand.NAME} scored in the current window: ${total} items across ` +
      `${days} days, ranked, pillar-tagged and linked to the source that carried each one. ` +
      `Compiled ${utc(news.generated_at)}.`,
    ogImage: ctx.cardFor && ctx.state ? ctx.cardFor(ctx.state.receipt_id) : null,
    ogImageAlt: `${brand.NAME} share card`,
    jsonld: [collectionPage(ctx, news), itemList(ctx, news)],
    main,
  });
}

/**
 * ctx.news absent. The page still builds, says so plainly and carries
 * noindex - an empty archive that Google has cached is worse than no archive.
 * build.mjs can also just skip writing this file; hasNews(ctx) is the guard.
 */
function emptyPage(ctx) {
  return page({
    ctx,
    path: PATH,
    noindex: true,
    title: `AI signal feed · ${brand.NAME}`,
    description: `${brand.NAME} news collection has not published a window yet.`,
    main: `<style>${newsCss()}${archiveCss()}</style>${pillarSprite()}
<section class="narch__intro">
  <h1 class="narch__h1">AI signal feed</h1>
  <p class="lede">No collection window has been published in this build. This page is not
     an empty result &mdash; it is the absence of a result, and the two are different states.
     When <code>data/news.json</code> is present it is rendered here in full.</p>
</section>`,
  });
}

function uniqueDays(items) {
  const set = new Set(items.map((it) => utcDay(it.published_at)));
  return set.size;
}

// ---------------------------------------------------------------------------
// The pure-CSS pillar filter
// ---------------------------------------------------------------------------
//
// Five radio inputs plus "all", visually hidden with the site's own .vh (which
// uses clip, so they stay focusable and stay in the tab order), followed by a
// bar of <label> chips and then the list. The selector is
//
//   #nf-<id>:checked ~ .narch__list > .nrow:not([data-pillar="<id>"]) { display: none }
//
// which needs the inputs to be earlier siblings of the list - hence the flat
// structure inside <section> rather than a <fieldset>. No :has(), so this works
// everywhere, and no script, so it works in a prerender.
//
// "All" is checked by default on purpose: a crawler, a screenshot and a reader
// with CSS disabled all see every row.

function pillarsPresent(news) {
  return brand.PILLARS.filter((p) => news.byPillar[p.id] > 0);
}

function filterInputs(news) {
  const ids = ['all', ...pillarsPresent(news).map((p) => p.id)];
  return ids.map((id) =>
    `<input class="vh nfin" type="radio" name="nf" id="nf-${esc(id)}"${id === 'all' ? ' checked' : ''}>`
  ).join('\n  ');
}

function filterBar(news) {
  const all = `<label class="nfchip" for="nf-all">` +
    `<span>All</span><b class="num">${esc(news.total)}</b></label>`;

  const chips = pillarsPresent(news).map((p) =>
    `<label class="nfchip" for="nf-${esc(p.id)}" data-pillar="${esc(p.id)}">` +
    `${pillarSigil(p.id)}<span>${esc(p.name)}</span><b class="num">${esc(news.byPillar[p.id])}</b></label>`
  ).join('');

  return `<div class="nfbar">${all}${chips}</div>`;
}

/**
 * Pillar mix as a single stacked bar. Server-rendered divs, no chart library,
 * no canvas - it is in the HTML and it is in the screenshot. The bar is
 * labelled as an image with the actual counts, and the legend directly beneath
 * it is the filter bar, so no reader ever has to decode a colour to use it.
 */
function distribution(news) {
  const present = pillarsPresent(news);
  if (!present.length || !news.total) return '';

  const label = present
    .map((p) => `${p.name} ${news.byPillar[p.id]}`)
    .join(', ');

  const segs = present.map((p) => {
    const pct = (news.byPillar[p.id] / news.total) * 100;
    return `<span data-pillar="${esc(p.id)}" style="--w:${pct.toFixed(3)}%" ` +
      `title="${esc(`${p.name}: ${news.byPillar[p.id]} of ${news.total}`)}"></span>`;
  }).join('');

  return `<section class="sec ndistwrap" aria-labelledby="dist-h">
  <h2 class="sec__h" id="dist-h">Pillar mix in this window</h2>
  <div class="ndist" role="img" aria-label="${esc(`Items by pillar: ${label}. ${news.total} in total.`)}">${segs}</div>
</section>`;
}

/** Same row as the homepage feed, plus a stable anchor for the JSON-LD @id. */
function archiveRow(it) {
  return feedRow(it).replace('<li class="nrow"', `<li class="nrow" id="${esc(it.anchor)}"`);
}

// ---------------------------------------------------------------------------
// Structured data
// ---------------------------------------------------------------------------

function collectionPage(ctx, news) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${brand.NAME} AI signal feed`,
    url: ctx.url(PATH),
    description:
      `Every AI news item ${brand.NAME} scored in the current collection window, ranked by ` +
      'score, tagged to one of five pillars and linked to the source that carried it.',
    inLanguage: 'en',
    isAccessibleForFree: true,
    dateModified: news.generated_at,
    license: 'https://creativecommons.org/licenses/by/4.0/',
    isPartOf: { '@type': 'WebSite', name: brand.NAME, url: ctx.url('/') },
  };
}

/**
 * One ItemList for the page, each element a NewsArticle for the item.
 *
 * `url` points at the ORIGINAL source, never at us: we did not write these and
 * claiming authorship of a headline we merely counted would be the same species
 * of dishonesty as printing a confident number over a dead pipe. `publisher` is
 * the feed that carried it; `mainEntityOfPage` is our anchor, which is the
 * honest description of our role - we are the page that lists it.
 */
function itemList(ctx, news) {
  const base = ctx.url(PATH);
  const items = news.items.slice(0, JSONLD_MAX);

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${brand.NAME} AI signal feed`,
    url: base,
    numberOfItems: news.total,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    itemListElement: items.map((it) => ({
      '@type': 'ListItem',
      position: it.rank,
      url: `${base}#${it.anchor}`,
      item: newsArticle(ctx, it, base),
    })),
  };
}

/**
 * Deliberately lean. An earlier version repeated every summary, language and
 * accessibility flag inside the graph and the two JSON-LD blocks came to 261 KB
 * on a 200-item page - larger than the page they described, for facts a crawler
 * can already read in the markup. What is left is what only the graph can say:
 * what this is, when it was published, who carried it and which pillar it feeds.
 */
function newsArticle(ctx, it, base) {
  const out = {
    '@type': 'NewsArticle',
    '@id': `${base}#${it.anchor}`,
    headline: it.title,
    datePublished: it.published_at,
    url: it.href || `${base}#${it.anchor}`,
    publisher: { '@type': 'Organization', name: it.source },
    about: { '@type': 'Thing', name: brand.pillarMeta(it.pillar).name },
  };
  if (it.entities.length) out.keywords = it.entities.join(', ');
  return out;
}

// ---------------------------------------------------------------------------
// CSS
// ---------------------------------------------------------------------------

function filterRules(present) {
  return present.map((p) => `
#nf-${p.id}:checked ~ .narch__list > .nrow:not([data-pillar="${p.id}"]) { display: none; }
#nf-${p.id}:checked ~ .nfbar .nfchip[for="nf-${p.id}"] { background: var(--bg-raised); border-color: var(--p, var(--accent)); color: var(--ink); }
#nf-${p.id}:checked ~ .nfbar .nfchip[for="nf-${p.id}"]::after { transform: scaleX(1); }
#nf-${p.id}:focus-visible ~ .nfbar .nfchip[for="nf-${p.id}"] { outline: 2px solid var(--accent); outline-offset: 2px; }`
  ).join('');
}

function archiveCss(present = brand.PILLARS) {
  return `
.narch__intro { padding: 26px 0 0; }
.narch__h1 { font-size: clamp(1.7rem, 7vw, 2.3rem); letter-spacing: -0.025em; margin: 0 0 12px; }
.narch__intro .lede { margin-bottom: 16px; }
.narch__intro .nhead { margin-top: 18px; }

.ndistwrap { margin-top: 30px; }
.ndist {
  display: flex; height: 12px; width: 100%; overflow: hidden;
  border: 1px solid var(--rule); border-radius: 2px; background: var(--bg-sunken);
}
.ndist span { display: block; width: var(--w, 0%); background: var(--p, var(--accent)); }
/* A hairline between segments so two adjacent hues never read as one block in
   a greyscale screenshot. The filter chips below carry the sigils and counts,
   so the bar never has to be decoded on its own. */
.ndist span + span { border-left: 1px solid var(--bg); }

.nfbar { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 14px; }
.nfchip {
  position: relative; display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--mono); font-size: 11px; letter-spacing: 0.06em;
  border: 1px solid var(--rule); border-radius: var(--radius);
  padding: 5px 9px; background: transparent; color: var(--ink-dim);
  cursor: pointer; user-select: none; white-space: nowrap;
  /* 44px of thumb is the whole point on a phone; the chip is 30px tall, so the
     rest comes from the row gap plus this. */
  min-height: 30px;
}
.nfchip:hover { color: var(--ink); border-color: var(--ink-faint); }
.nfchip svg { width: 12px; height: 12px; color: var(--p, var(--accent)); flex: 0 0 auto; }
.nfchip b { font-weight: 700; color: var(--ink-faint); font-size: 10.5px; }
/* The selected chip is marked by an underline bar as well as by colour, so the
   filter state survives greyscale and colour blindness. */
.nfchip::after {
  content: ''; position: absolute; left: -1px; right: -1px; bottom: -1px; height: 2px;
  background: var(--p, var(--accent)); transform: scaleX(0); transform-origin: left;
}
#nf-all:checked ~ .nfbar .nfchip[for="nf-all"] { background: var(--bg-raised); border-color: var(--accent); color: var(--ink); }
#nf-all:checked ~ .nfbar .nfchip[for="nf-all"]::after { transform: scaleX(1); }
#nf-all:focus-visible ~ .nfbar .nfchip[for="nf-all"] { outline: 2px solid var(--accent); outline-offset: 2px; }
${filterRules(present)}

@media (prefers-reduced-motion: no-preference) {
  .nfchip::after { transition: transform 140ms ease-out; }
}

/* The archive is long. Rows past the fold do not get the enter animation -
   staggering 400 of them would still be running a minute after the page
   settled. news.mjs only sets data-enter on the top rows, so this is belt and
   braces for a future change to that constant. */
.narch__list .nrow[data-enter="1"]:nth-child(n+16) { animation: none; }
.narch__list .nrow[data-enter="1"]:nth-child(n+16)::before { animation: none; }
`;
}

// ---------------------------------------------------------------------------
// INTEGRATION (site/build.mjs owns these calls)
//
//   import * as newsPage from './templates/newsPage.mjs';
//   written.push(await write(args.out, 'news.html', newsPage.render(ctx)));
//
// render(ctx) is safe to call unconditionally: with ctx.news null it emits a
// noindex "no window published" page. To omit the file entirely instead, guard
// with newsPage.hasNews(ctx).
//
// Also needs, and neither is mine to edit:
//   layout.mjs NAV       add { href: '/news.html', label: 'News' }
//   sitemap.mjs          add /news.html, changefreq hourly, priority 0.8
// ---------------------------------------------------------------------------
