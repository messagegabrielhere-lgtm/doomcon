// The document shell every page is poured into. One <style> block, no external
// stylesheet, no framework, no runtime. If a page needs JavaScript to show its
// number, it is wrong.
//
// The motion layer (o.motion) does not change that sentence. It is opt-in, it
// is off for every caller that does not ask, and everything it animates is
// already in the HTML it decorates - see the header of _motion.mjs.

import { esc, jsonScript } from './_html.mjs';
import { degradedBanner } from './_parts.mjs';
import { motionBlock } from './_motion.mjs';
import { css, FONT_HREF } from '../styles.mjs';
import * as brand from '../brand.mjs';

const NAV = [
  { href: '/', label: 'Index' },
  { href: '/methodology.html', label: 'Methodology' },
  { href: '/history.html', label: 'History' },
  { href: '/moves/', label: 'Archive' },
  { href: '/api/state.json', label: 'API' },
];

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
 * The operations strip. Counters only, all read from real state.
 *
 * The temptation is to print STATUS: OPERATIONAL unconditionally because it
 * reads well. pizzint's own health endpoint does exactly that while reporting
 * two successful scrapes in twenty-four hours. The posture here is computed
 * from the same fields the dashboard shows, so it can say DEGRADED about us.
 */
function opsStrip(ctx) {
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
  const feeds = ctx.news && Array.isArray(ctx.news.sources)
    ? ctx.news.sources.filter((x) => x.ok).length : null;
  const receipts = Array.isArray(ctx.receipts) ? ctx.receipts.length : null;
  const posture = dark > 0 ? 'DEGRADED' : 'OPERATIONAL';

  const cells = [
    `${reporting}/${total} REPORTING`,
    `${scored} SCORED`,
    feeds !== null ? `${feeds} FEEDS` : null,
    news !== null ? `${news} ITEMS` : null,
    receipts !== null ? `${receipts} RECEIPTS` : null,
    `STATUS: ${posture}`,
  ].filter(Boolean);

  return `<div class="ops" data-posture="${posture.toLowerCase()}"><div class="wrap ops__in">` +
    cells.map((c) => `<span class="ops__c">${esc(c)}</span>`).join('') +
    `</div></div>`;
}

export function page(o) {
  const { ctx } = o;
  const canonical = ctx.url(o.path);
  const jsonld = (o.jsonld || []).map((block) => jsonScript(block)).join('\n');

  // Absent -> the empty string, and every interpolation site below is written
  // so that the empty string changes nothing. A page() caller that does not ask
  // for motion gets byte-identical output to the build before this existed,
  // which is the only way to be sure the six existing callers still work.
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

  const nav = NAV.map((item) => {
    const current = item.href === o.path ? ' aria-current="page"' : '';
    return `<a href="${esc(ctx.href(item.href))}"${current}>${esc(item.label)}</a>`;
  }).join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.description)}">
<link rel="canonical" href="${esc(canonical)}">
${o.noindex ? '<meta name="robots" content="noindex,follow">' : '<meta name="robots" content="index,follow,max-image-preview:large">'}
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
<body>
<header class="masthead"><div class="wrap masthead__in">
  <a class="wordmark" href="${esc(ctx.href('/'))}">${esc(brand.NAME)}</a>
  <p class="masthead__tag">${esc(brand.TAGLINE)}</p>
  <nav class="nav" aria-label="Primary">${nav}</nav>
</div></header>
${opsStrip(ctx)}
${o.showDegraded ? degradedBanner(ctx.state) : ''}${motion.beforeMain}
<main class="wrap" id="main">
${o.main}
</main>
<footer class="foot"><div class="wrap">
  <p>${esc(brand.DISCLAIMER)}</p>
  <p>Every value on this site is computed from public data by published code. Each observation
     is written to a hash-chained receipt carrying its full inputs, so anyone can recompute the
     number and get the same answer. Data and code: ${esc(brand.LICENSE)}.</p>
  <div class="foot__links">
    <a href="${esc(ctx.href('/methodology.html'))}">Methodology</a>
    <a href="${esc(ctx.href('/api/state.json'))}">JSON API</a>
    <a href="${esc(ctx.href('/embed.html'))}">Embed</a>
    <a href="${esc(ctx.href('/feed.xml'))}">RSS</a>
    <a href="${esc(brand.REPO_URL)}" rel="noopener">Source</a>
  </div>
</div></footer>${bodyEndExtra}
</body>
</html>
`;
}
