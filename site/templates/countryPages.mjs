// /country/<iso2>.html — one page per country with enough mapped datacentres.
//
// DoomBench's URL count is mostly entity pages, including countries. Ours is
// the OpenStreetMap harvest in data/world.json (docs/WORLD.md). A page exists
// only when the country has at least COUNTRY_INDEX_MIN mapped sites, so a
// one-pin outline does not become its own URL. The copy stays a count of map
// objects. copy.never_say ("the number of datacentres in the world") does not
// appear here.

import { esc, utc } from './_html.mjs';
import { page } from './layout.mjs';
import { breadcrumbs } from './_seo.mjs';
import * as brand from '../brand.mjs';

/** Minimum mapped sites before a country page is written and sitemapped. */
export const COUNTRY_INDEX_MIN = 3;

/** Named sites printed on the page. The rest stay on the world map. */
export const SITE_LIST_CAP = 40;

const STATUS_WORD = {
  operating: 'operating',
  under_construction: 'under construction',
  announced: 'announced',
};

const STATUS_RANK = { announced: 0, under_construction: 1, operating: 2 };

function clip(text, max) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const at = cut.lastIndexOf(' ');
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,.;:–—-]+$/, '')}…`;
}

function n(value) {
  const x = Number(value);
  return Number.isFinite(x) ? x.toLocaleString('en-US') : '—';
}

export function countryPath(iso2) {
  return `/country/${String(iso2).toLowerCase()}.html`;
}

function countryList(ctx) {
  const list = ctx.world && Array.isArray(ctx.world.countries) ? ctx.world.countries : [];
  return list.filter((c) => c && typeof c.iso2 === 'string' && /^[A-Za-z]{2}$/.test(c.iso2));
}

export function countryIndexable(country) {
  return Boolean(country && Number(country.total) >= COUNTRY_INDEX_MIN);
}

export function indexableCountries(ctx) {
  return countryList(ctx)
    .filter(countryIndexable)
    .slice()
    .sort((a, b) => (Number(b.total) - Number(a.total)) || String(a.name).localeCompare(String(b.name)));
}

export function countryByIso(ctx, iso2) {
  const code = String(iso2 || '').toUpperCase();
  return countryList(ctx).find((c) => c.iso2.toUpperCase() === code) || null;
}

export function sitesForCountry(ctx, iso2) {
  const sites = ctx.world && Array.isArray(ctx.world.sites) ? ctx.world.sites : [];
  const code = String(iso2 || '').toUpperCase();
  return sites
    .filter((s) => s && String(s.country || '').toUpperCase() === code)
    .slice()
    .sort((a, b) => {
      const rank = (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9);
      if (rank !== 0) return rank;
      return String(a.name || a.id || '').localeCompare(String(b.name || b.id || ''));
    });
}

function topCounts(values, limit = 8) {
  const counts = new Map();
  for (const value of values) {
    const label = String(value || '').trim();
    if (!label) continue;
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
    .slice(0, limit);
}

const STYLE = `<style>
.fc{max-width:78ch}
.fc__k{font:600 var(--t-xs)/1.3 var(--mono);color:var(--ink-faint);letter-spacing:.04em;text-transform:uppercase}
.fc__lede{font:400 var(--t-base)/1.55 var(--sans);color:var(--ink-dim);max-width:68ch}
.fc__stat{display:flex;flex-wrap:wrap;gap:14px 22px;margin:18px 0;padding:14px 0;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)}
.fc__stat b{font:700 var(--t-xl)/1 var(--mono);color:var(--ink)}
.fc__stat span{display:block;font:500 var(--t-xs)/1.3 var(--mono);color:var(--ink-faint);margin-top:4px}
.fc__list{list-style:none;padding:0;margin:16px 0 0;display:grid;gap:10px}
.fc__list li{display:grid;grid-template-columns:1fr auto;gap:4px 12px;padding:10px 0;border-bottom:1px solid var(--rule)}
.fc__list a{color:var(--ink);font:600 var(--t-base)/1.35 var(--sans);text-decoration:none}
.fc__list a:hover{text-decoration:underline}
.fc__meta{font:400 var(--t-xs)/1.3 var(--mono);color:var(--ink-faint)}
.fc__sc{font:700 var(--t-lg)/1 var(--mono)}
.fc__nav{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 0}
.fc__nav a{font:600 var(--t-sm)/1.3 var(--sans);padding:6px 10px;border:1px solid var(--rule);border-radius:6px;color:var(--ink);text-decoration:none}
.fc__nav a:hover{background:var(--bg-sunken)}
</style>`;

function statusWord(status) {
  return STATUS_WORD[status] || String(status || 'status not recorded');
}

export function renderCountry(ctx, iso2) {
  const country = countryByIso(ctx, iso2);
  if (!country) return '';
  const copy = (ctx.world && ctx.world.copy) || {};
  const qualifier = String(copy.headline_qualifier || 'as mapped in OpenStreetMap');
  const path = countryPath(country.iso2);
  const sites = sitesForCountry(ctx, country.iso2);
  const shown = sites.slice(0, SITE_LIST_CAP);
  const title = `Datacentres mapped in ${country.name} · ${brand.NAME}`;
  const description = clip(
    `${country.name}: ${n(country.total)} datacentre sites ${qualifier} (${n(country.operating)} operating, ${n(country.under_construction)} under construction, ${n(country.announced)} announced). A count of map objects, not of every datacentre that exists.`,
    160,
  );
  const cities = topCounts(sites.map((s) => s.city));
  const operators = topCounts(sites.map((s) => s.operator));
  const neighbours = indexableCountries(ctx)
    .filter((c) => c.iso2 !== country.iso2 && c.subregion && c.subregion === country.subregion)
    .slice(0, 12);
  const attribution = copy.attribution_url
    ? `<a href="${esc(copy.attribution_url)}" rel="noopener">${esc(copy.attribution_required || 'OpenStreetMap copyright')}</a>`
    : esc(copy.attribution_required || 'OpenStreetMap contributors');

  const rows = shown.map((s) => {
    const bits = [s.city, s.operator, statusWord(s.status)].filter(Boolean);
    const name = s.name || s.id || 'unnamed site';
    const label = s.url
      ? `<a href="${esc(s.url)}" rel="nofollow noopener">${esc(name)}</a>`
      : esc(name);
    return `<li>${label}<span class="fc__meta">${esc(bits.join(' · '))}</span></li>`;
  }).join('');

  const main = `${STYLE}
<article class="fc prose">
  <p class="fc__k"><a href="${esc(ctx.href('/world.html'))}">World</a> · <a href="${esc(ctx.href('/country/'))}">Countries</a></p>
  <h1>Datacentres mapped in ${esc(country.name)}</h1>
  <p class="fc__lede">${esc(n(country.total))} sites in ${esc(country.name)} ${esc(qualifier)}.
     This page counts map objects carrying a datacentre tag. It does not count every datacentre that exists.
     A dense country is a country somebody mapped.</p>
  <div class="fc__stat" role="group" aria-label="Mapped sites by status">
    <div><b class="num">${esc(n(country.total))}</b><span>Mapped sites</span></div>
    <div><b class="num">${esc(n(country.operating))}</b><span>Operating</span></div>
    <div><b class="num">${esc(n(country.under_construction))}</b><span>Under construction</span></div>
    <div><b class="num">${esc(n(country.announced))}</b><span>Announced</span></div>
  </div>
  <p class="fresh__key">${esc(country.continent || 'Continent not recorded')}${country.subregion ? ` · ${esc(country.subregion)}` : ''} · ${esc(country.iso2)}
     ${ctx.world && ctx.world.generated_at ? ` · file dated ${esc(utc(ctx.world.generated_at))}` : ''}.
     ${attribution}.</p>
  ${cities.length ? `<p>Cities named most often in this extract: ${cities.map(([name, count]) => `${esc(name)} (${esc(n(count))})`).join(', ')}.</p>` : ''}
  ${operators.length ? `<p>Operators named most often: ${operators.map(([name, count]) => `${esc(name)} (${esc(n(count))})`).join(', ')}.</p>` : ''}
  <h2>Named sites</h2>
  ${shown.length
    ? `<ol class="fc__list">${rows}</ol>
       <p class="fresh__key">${shown.length < sites.length
         ? `Showing ${esc(n(shown.length))} of ${esc(n(sites.length))}, announced and under construction first, then operating, by name.`
         : `${esc(n(shown.length))} named ${shown.length === 1 ? 'site' : 'sites'} in the file.`}
          The full set is on the <a href="${esc(ctx.href('/world.html'))}">world map</a>.</p>`
    : `<p>The country total is published. This build has no per-site rows to list. The <a href="${esc(ctx.href('/world.html'))}">world map</a> still carries the count.</p>`}
  ${neighbours.length ? `<h2>Same subregion</h2>
  <nav class="fc__nav" aria-label="Other countries in ${esc(country.subregion)}">${neighbours.map((c) => `<a href="${esc(ctx.href(countryPath(c.iso2)))}">${esc(c.name)}</a>`).join('')}</nav>` : ''}
</article>`;

  return page({
    ctx,
    path,
    title,
    description,
    jsonld: [{
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: title,
      url: ctx.url(path),
      description,
      spatialCoverage: { '@type': 'Place', name: country.name },
      isBasedOn: copy.attribution_url || undefined,
      isPartOf: { '@type': 'WebSite', name: brand.PUBLICATION, url: ctx.url('/') },
      creator: { '@type': 'Organization', name: brand.PUBLICATION, url: ctx.url('/') },
    }, breadcrumbs(ctx, [
      { name: 'World', path: '/world.html' },
      { name: 'Countries', path: '/country/' },
      { name: country.name, path },
    ])],
    main,
  });
}

export function renderIndex(ctx) {
  const countries = indexableCountries(ctx);
  const copy = (ctx.world && ctx.world.copy) || {};
  const qualifier = String(copy.headline_qualifier || 'as mapped in OpenStreetMap');
  const path = '/country/';
  const title = `Datacentres mapped by country · ${brand.NAME}`;
  const description = clip(
    `${countries.length} countries with at least ${COUNTRY_INDEX_MIN} datacentre sites ${qualifier}. Each page lists the count and named sites. A count of map objects.`,
    160,
  );
  const rows = countries.map((c) => `<li>
  <a href="${esc(ctx.href(countryPath(c.iso2)))}">${esc(c.name)}</a>
  <span class="fc__meta">${esc(c.iso2)} · ${esc(c.continent || '')}</span>
  <span class="fc__sc num">${esc(n(c.total))}</span>
</li>`).join('');
  const main = `${STYLE}
<article class="fc prose">
  <p class="fc__k"><a href="${esc(ctx.href('/world.html'))}">World</a> · Countries</p>
  <h1>Datacentres mapped by country</h1>
  <p class="fc__lede">A country earns a page when OpenStreetMap has at least ${COUNTRY_INDEX_MIN} datacentre sites mapped there, ${esc(qualifier)}. Fewer than that stays on the <a href="${esc(ctx.href('/world.html'))}">world map</a> only. ${esc(copy.what_zero_means || 'A country with no mapped datacentre is a country nobody has mapped.')}</p>
  ${rows ? `<ol class="fc__list">${rows}</ol>` : '<p>No country clears the gate in this file.</p>'}
</article>`;
  return page({
    ctx,
    path,
    title,
    description,
    noindex: countries.length === 0,
    jsonld: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      url: ctx.url(path),
      description,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: countries.length,
        itemListElement: countries.map((c, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: ctx.url(countryPath(c.iso2)),
          name: c.name,
        })),
      },
    }, breadcrumbs(ctx, [
      { name: 'World', path: '/world.html' },
      { name: 'Countries', path },
    ])],
    main,
  });
}

/** Sitemap rows for the country index and each country that clears the gate. */
export function sitemapEntries(ctx) {
  if (!ctx.routes || !ctx.routes.world || !ctx.world) return [];
  const countries = indexableCountries(ctx);
  if (!countries.length) return [];
  const last = ctx.world.generated_at || (ctx.state && ctx.state.generated_at);
  return [
    { loc: '/country/', changefreq: 'weekly', priority: '0.6', lastmod: last },
    ...countries.map((c) => ({
      loc: countryPath(c.iso2),
      changefreq: 'weekly',
      priority: '0.5',
      lastmod: last,
    })),
  ];
}
