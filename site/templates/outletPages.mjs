// /outlet/<slug>.html — publisher-domain hubs for scored stories.
//
// COMPETITIVE-SEO.md: DoomBench/Skynet win on entity URL count. We already
// page feed adapters at /source/<id>. These pages group by the publication
// host (arxiv.org, techcrunch.com, …) so search-shaped publisher queries get
// a crawlable CollectionPage. Gate OUTLET_INDEX_MIN keeps one-off domains off
// the sitemap (FINDABILITY.md §1.2 / §3.3).

import { esc, num, utc } from './_html.mjs';
import { page } from './layout.mjs';
import { breadcrumbs } from './_seo.mjs';
import { slugFor } from './itemPage.mjs';
import * as brand from '../brand.mjs';

/** Minimum scored stories before a publisher page is written and sitemapped. */
export const OUTLET_INDEX_MIN = 5;

/** Stories printed on the publisher page. */
export const OUTLET_LIST_CAP = 40;

const STYLE = `<style>
.od{max-width:78ch}
.od__k{font:600 var(--t-xs)/1.3 var(--mono);color:var(--ink-faint);letter-spacing:.04em;text-transform:uppercase}
.od__lede{font:400 var(--t-base)/1.55 var(--sans);color:var(--ink-dim);max-width:68ch}
.od__stat{display:flex;flex-wrap:wrap;gap:14px 22px;margin:18px 0;padding:14px 0;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)}
.od__stat b{font:700 var(--t-xl)/1 var(--mono);color:var(--ink)}
.od__stat span{display:block;font:500 var(--t-xs)/1.3 var(--mono);color:var(--ink-faint);margin-top:4px}
.od__list{list-style:none;padding:0;margin:16px 0 0;display:grid;gap:10px}
.od__list li{display:grid;grid-template-columns:1fr auto;gap:4px 12px;padding:10px 0;border-bottom:1px solid var(--rule)}
.od__list a{grid-column:1;color:var(--ink);font:600 var(--t-base)/1.35 var(--sans);text-decoration:none}
.od__list a:hover{text-decoration:underline}
.od__meta{grid-column:1;font:400 var(--t-xs)/1.3 var(--mono);color:var(--ink-faint)}
.od__sc{grid-column:2;grid-row:1/span 2;align-self:center;font:700 var(--t-base)/1 var(--mono);color:var(--accent)}
.od__nav{display:flex;flex-wrap:wrap;gap:8px 14px;margin:12px 0 0}
.od__nav a{font:600 var(--t-sm)/1.3 var(--sans);color:var(--ink)}
</style>`;

function clip(text, max) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const at = cut.lastIndexOf(' ');
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,.;:–—-]+$/, '')}…`;
}

function newsItems(ctx) {
  return (ctx.news && Array.isArray(ctx.news.items)) ? ctx.news.items : [];
}

/** Host of the original publisher, or null when unknown. */
export function outletDomain(item) {
  if (!item || typeof item !== 'object') return null;
  const meta = item.meta && typeof item.meta === 'object' ? item.meta : null;
  let host = meta && typeof meta.outlet_domain === 'string' ? meta.outlet_domain.trim().toLowerCase() : '';
  if (!host && typeof item.url === 'string' && item.url) {
    try {
      host = new URL(item.url).hostname.toLowerCase();
    } catch {
      host = '';
    }
  }
  if (!host) return null;
  host = host.replace(/^www\./, '');
  // Refuse junk hosts that are not real publishers.
  if (!host.includes('.') || host.length > 80) return null;
  if (!/^[a-z0-9.-]+$/.test(host)) return null;
  return host;
}

/** URL slug for a publisher host (`arxiv.org` → `arxiv-org`). */
export function outletSlug(domain) {
  return String(domain || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function outletPath(domain) {
  return `/outlet/${outletSlug(domain)}.html`;
}

export function itemsForOutlet(ctx, domain) {
  const key = String(domain || '').toLowerCase().replace(/^www\./, '');
  return newsItems(ctx)
    .filter((it) => outletDomain(it) === key)
    .slice()
    .sort((a, b) => String(b.published_at || '').localeCompare(String(a.published_at || '')));
}

/** Older scored stories on this host kept in the durable item archive. */
export function archiveItemsForOutlet(ctx, domain) {
  const key = String(domain || '').toLowerCase().replace(/^www\./, '');
  const archived = Array.isArray(ctx.itemArchive) ? ctx.itemArchive : [];
  return archived
    .filter((it) => outletDomain(it) === key)
    .slice()
    .sort((a, b) => String(b.published_at || '').localeCompare(String(a.published_at || '')));
}

export function outletIndexable(ctx, domain) {
  return itemsForOutlet(ctx, domain).length >= OUTLET_INDEX_MIN;
}

export function indexableOutlets(ctx) {
  const counts = new Map();
  for (const it of newsItems(ctx)) {
    const d = outletDomain(it);
    if (!d) continue;
    counts.set(d, (counts.get(d) || 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, n]) => n >= OUTLET_INDEX_MIN)
    .map(([domain, count]) => ({ domain, slug: outletSlug(domain), count }))
    .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain));
}

/** Indexable publishers named on this story (0–1; used for item internal links). */
export function outletsForItem(ctx, item) {
  const d = outletDomain(item);
  if (!d || !outletIndexable(ctx, d)) return [];
  return [{ domain: d, slug: outletSlug(d) }];
}

function itemRows(ctx, items) {
  return items.slice(0, OUTLET_LIST_CAP).map((it) => `<li>
  <a href="${esc(ctx.href(`/item/${slugFor(it)}.html`))}">${esc(it.title)}</a>
  <span class="od__meta"><time datetime="${esc(it.published_at || '')}">${esc(utc(it.published_at))}</time>
    · ${esc(it.source || 'source')}</span>
  ${Number.isFinite(it.score) ? `<span class="od__sc num">${esc(num(it.score, 1))}</span>` : '<span class="od__sc mute">—</span>'}
</li>`).join('');
}

export function renderOutlet(ctx, domain) {
  const items = itemsForOutlet(ctx, domain);
  const archivedAll = archiveItemsForOutlet(ctx, domain);
  const older = archivedAll.slice(0, 12);
  const indexable = items.length >= OUTLET_INDEX_MIN;
  const path = outletPath(domain);
  const title = `${domain}: AI stories this index scored · ${brand.NAME}`;
  const description = clip(
    `${items.length} scored stories whose original URL is on ${domain} in the current ${brand.NAME} window. The publisher wrote them. The score is tempo, not a forecast.`,
    160,
  );
  const others = indexableOutlets(ctx)
    .filter((o) => o.domain !== domain)
    .slice(0, 12)
    .map((o) => `<a href="${esc(ctx.href(outletPath(o.domain)))}">${esc(o.domain)}</a>`)
    .join('');
  const olderBlock = older.length
    ? `<h2>Older scored stories on ${esc(domain)}</h2>
  <p class="od__lede">Kept in the permanent archive after they left the live window. Still scored stories — not a forecast.</p>
  <ol class="od__list">${itemRows(ctx, older)}</ol>
  <p class="fresh__key"><a href="${esc(ctx.href('/item/archive.html'))}">Full story archive</a></p>`
    : '';

  const main = `${STYLE}
<article class="od prose">
  <p class="od__k"><a href="${esc(ctx.href('/news.html'))}">Newsroom</a> · <a href="${esc(ctx.href('/outlet/'))}">Publishers</a></p>
  <h1>${esc(domain)}</h1>
  <p class="od__lede">Stories this index scored whose original link is on ${esc(domain)}. The words belong to that publisher. The score is computed here and measures activity tempo inside the window, not whether the story is good or bad, and not a probability of harm.</p>
  <div class="od__stat" role="group" aria-label="Publisher counts">
    <div><b class="num">${esc(String(items.length))}</b><span>Scored stories in window</span></div>
    ${archivedAll.length ? `<div><b class="num">${esc(String(archivedAll.length))}</b><span>Older in archive</span></div>` : ''}
  </div>
  <h2>Stories on ${esc(domain)}</h2>
  ${items.length
    ? `<ol class="od__list">${itemRows(ctx, items)}</ol>`
    : '<p>No scored stories from this publisher in the current window.</p>'}
  ${items.length > OUTLET_LIST_CAP
    ? `<p class="fresh__key">${esc(String(items.length - OUTLET_LIST_CAP))} more on the <a href="${esc(ctx.href('/news.html'))}">full newsroom</a>.</p>`
    : ''}
  ${olderBlock}
  ${others ? `<h2>Other publishers</h2><nav class="od__nav" aria-label="Other publishers">${others}</nav>` : ''}
</article>`;

  return page({
    ctx,
    path,
    title,
    description,
    noindex: !indexable,
    jsonld: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      url: ctx.url(path),
      description,
      isPartOf: { '@type': 'WebSite', name: brand.PUBLICATION, url: ctx.url('/') },
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: Math.min(items.length, OUTLET_LIST_CAP),
        itemListElement: items.slice(0, OUTLET_LIST_CAP).map((it, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: it.title,
          url: ctx.url(`/item/${slugFor(it)}.html`),
        })),
      },
    }, breadcrumbs(ctx, [
      { name: 'Newsroom', path: '/news.html' },
      { name: 'Publishers', path: '/outlet/' },
      { name: domain, path },
    ])],
    main,
  });
}

export function renderIndex(ctx) {
  const outlets = indexableOutlets(ctx);
  const path = '/outlet/';
  const title = `AI publishers this index scores · ${brand.NAME}`;
  const description = clip(
    `${outlets.length} publisher domains with at least ${OUTLET_INDEX_MIN} scored stories in the current ${brand.NAME} window.`,
    160,
  );
  const rows = outlets.map((o) => `<li>
  <a href="${esc(ctx.href(outletPath(o.domain)))}">${esc(o.domain)}</a>
  <span class="od__meta">${esc(String(o.count))} scored stories</span>
</li>`).join('');
  const main = `${STYLE}
<article class="od prose">
  <p class="od__k"><a href="${esc(ctx.href('/news.html'))}">Newsroom</a></p>
  <h1>AI publishers</h1>
  <p class="od__lede">A publisher earns a page when the current window holds at least ${OUTLET_INDEX_MIN} scored stories whose original URL is on that host. Thinner domains stay on the story page only. Feed adapters live under <a href="${esc(ctx.href('/source/'))}">/source/</a>.</p>
  ${outlets.length
    ? `<ol class="od__list">${rows}</ol>`
    : '<p>No publisher has cleared the gate in this window.</p>'}
</article>`;

  return page({
    ctx,
    path,
    title,
    description,
    noindex: outlets.length === 0,
    jsonld: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      url: ctx.url(path),
      description,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: outlets.length,
        itemListElement: outlets.map((o, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: ctx.url(outletPath(o.domain)),
          name: o.domain,
        })),
      },
    }, breadcrumbs(ctx, [
      { name: 'Newsroom', path: '/news.html' },
      { name: 'Publishers', path },
    ])],
    main,
  });
}

export function sitemapEntries(ctx) {
  const outlets = indexableOutlets(ctx);
  if (!outlets.length) return [];
  const last = (ctx.news && ctx.news.generated_at) || (ctx.state && ctx.state.generated_at);
  return [
    { loc: '/outlet/', changefreq: 'hourly', priority: '0.7', lastmod: last },
    ...outlets.map((o) => ({
      loc: outletPath(o.domain),
      changefreq: 'hourly',
      priority: '0.65',
      lastmod: last,
    })),
  ];
}
