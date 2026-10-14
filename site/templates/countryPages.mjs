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
import { breadcrumbs, speakable } from './_seo.mjs';
import { slugFor } from './itemPage.mjs';
import * as brand from '../brand.mjs';

/** Minimum mapped sites before a country page is written and sitemapped. */
export const COUNTRY_INDEX_MIN = 3;

/** Named sites printed on the page. The rest stay on the world map. */
export const SITE_LIST_CAP = 40;

/** Scored stories naming the country printed on the country page. */
export const COUNTRY_STORY_CAP = 12;

/**
 * Extra headline forms for countries whose OpenStreetMap name is longer than
 * the words reporters use. Keep this list short — bare two-letter ISO codes
 * alone are refused (too many false positives).
 */
const COUNTRY_ALIASES = Object.freeze({
  US: ['United States', 'U.S.A.', 'U.S.', 'USA'],
  GB: ['United Kingdom', 'U.K.', 'UK', 'Britain'],
  AE: ['UAE'],
  KR: ['South Korea', 'Republic of Korea'],
  CZ: ['Czechia', 'Czech Republic'],
  NL: ['Netherlands', 'Holland'],
});

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

function escapeRe(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Headline needles for a country — OpenStreetMap name plus published aliases. */
export function countryNeedles(country) {
  if (!country || !country.name) return [];
  const iso = String(country.iso2 || '').toUpperCase();
  const raw = [country.name, ...(COUNTRY_ALIASES[iso] || [])];
  return [...new Set(raw.map((s) => String(s || '').trim()).filter((s) => s.length >= 2))];
}

export function itemMatchesCountry(it, country) {
  if (!it || !country) return false;
  const hay = `${it.title || ''} ${it.summary || ''}`;
  if (!hay.trim()) return false;
  for (const needle of countryNeedles(country)) {
    // Word-ish boundary: letters/digits around the needle must not continue the token.
    // Allows "U.S." and "UK" without matching inside longer words.
    const re = new RegExp(`(?:^|[^A-Za-z0-9])${escapeRe(needle)}(?:[^A-Za-z0-9]|$)`, 'i');
    if (re.test(hay)) return true;
  }
  return false;
}

function newsItems(ctx) {
  return (ctx.news && Array.isArray(ctx.news.items)) ? ctx.news.items : [];
}

export function itemsForCountry(ctx, iso2) {
  const country = countryByIso(ctx, iso2);
  if (!country) return [];
  return newsItems(ctx)
    .filter((it) => itemMatchesCountry(it, country))
    .slice()
    .sort((a, b) => String(b.published_at || '').localeCompare(String(a.published_at || '')));
}

/** Older scored stories naming this country, kept in the durable item archive. */
export function archiveItemsForCountry(ctx, iso2) {
  const country = countryByIso(ctx, iso2);
  if (!country) return [];
  const archived = Array.isArray(ctx.itemArchive) ? ctx.itemArchive : [];
  return archived
    .filter((it) => itemMatchesCountry(it, country))
    .slice()
    .sort((a, b) => String(b.published_at || '').localeCompare(String(a.published_at || '')));
}

/** Indexable countries named in one story — used on item pages. */
export function countriesForItem(ctx, item) {
  if (!item) return [];
  return indexableCountries(ctx).filter((c) => itemMatchesCountry(item, c));
}

function storyRows(ctx, items) {
  return items.slice(0, COUNTRY_STORY_CAP).map((it) => `<li>
  <a href="${esc(ctx.href(`/item/${slugFor(it)}.html`))}">${esc(it.title)}</a>
  <span class="fc__meta">${esc(String(it.source || '').toUpperCase())}
    · <time datetime="${esc(it.published_at || '')}">${esc(utc(it.published_at))}</time>
    ${it.pillar ? ` · ${esc(it.pillar)}` : ''}</span>
  ${Number.isFinite(it.score) ? `<span class="fc__sc num">${esc(Number(it.score).toFixed(1))}</span>` : '<span class="fc__sc">—</span>'}
</li>`).join('');
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
.fc__list a{grid-column:1;color:var(--ink);font:600 var(--t-base)/1.35 var(--sans);text-decoration:none}
.fc__list a:hover{text-decoration:underline}
.fc__meta{grid-column:1;font:400 var(--t-xs)/1.3 var(--mono);color:var(--ink-faint)}
.fc__sc{grid-column:2;grid-row:1/span 2;align-self:center;font:700 var(--t-lg)/1 var(--mono)}
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
  const stories = itemsForCountry(ctx, country.iso2);
  const archivedAll = archiveItemsForCountry(ctx, country.iso2);
  const older = archivedAll.slice(0, COUNTRY_STORY_CAP);
  // Head-term title: people search “datacentres in {country}” / national AI ranking.
  const title = `How many datacentres has ${brand.NAME} mapped in ${country.name}?`;
  const description = clip(
    `${country.name}: ${n(country.total)} datacentre sites ${qualifier} (${n(country.operating)} operating, ${n(country.under_construction)} under construction, ${n(country.announced)} announced). A count of map objects, not of every datacentre that exists.`,
    160,
  );
  // Tip #284: section H2s are question-shaped and mirrored in FAQ (§3.3).
  const sitesQ = `Which named sites has ${brand.NAME} mapped in ${country.name}?`;
  const storiesQ = `Which scored stories name ${country.name}?`;
  const olderQ = `Which older scored stories name ${country.name}?`;
  const subregionQ = 'Which other countries are in the same subregion?';
  const cities = topCounts(sites.map((s) => s.city));
  const operators = topCounts(sites.map((s) => s.operator));
  const neighbours = indexableCountries(ctx)
    .filter((c) => c.iso2 !== country.iso2 && c.subregion && c.subregion === country.subregion)
    .slice(0, 12);
  const faq = [
    [`How many datacentres has ${brand.NAME} mapped in ${country.name}?`,
      `${n(country.total)} sites in ${country.name} ${qualifier} (${n(country.operating)} operating, ${n(country.under_construction)} under construction, ${n(country.announced)} announced). This is a count of OpenStreetMap objects, not every datacentre that exists.`],
    [sitesQ,
      shown.length
        ? `${n(shown.length)} named ${shown.length === 1 ? 'site' : 'sites'} listed here${shown.length < sites.length ? ` of ${n(sites.length)} in the file` : ''}. Announced and under construction first, then operating, by name — map objects, not a national ranking.`
        : 'The country total is published. This build has no per-site rows to list.'],
    ...(stories.length
      ? [[storiesQ,
        'Headlines and summaries in the live newsroom window that name this country. Story counts are not a ranking of national AI activity and not a forecast.']]
      : []),
    ...(older.length
      ? [[olderQ,
        'Kept in the permanent archive after they left the live window. Still scored stories — not a forecast.']]
      : []),
    ...(neighbours.length
      ? [[subregionQ,
        `Other countries in ${country.subregion} that clear the same mapped-site gate, each linking How many datacentres has ${brand.NAME} mapped in that country?`]]
      : []),
    [`Does ${brand.NAME} rank ${country.name} for AI risk?`,
      `No. ${brand.DISCLAIMER_SHORT} A country page counts mapped datacentre sites and matching headlines — not a national AI ranking or doom score.`],
  ];
  const faqHtml = faq.map(([q, a]) => `
  <h3>${esc(q)}</h3>
  <p>${esc(a)}</p>`).join('');
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

  const storyBlock = stories.length
    ? `<h2 id="stories">${esc(storiesQ)}</h2>
  <p class="fc__lede">Headlines and summaries in the live newsroom window that name this country. Story counts are not a ranking of national AI activity and not a forecast.</p>
  <ol class="fc__list">${storyRows(ctx, stories)}</ol>
  <p class="fresh__key"><a href="${esc(ctx.href('/news.html'))}">Which AI stories has ${esc(brand.NAME)} scored in this window?</a></p>`
    : '';
  const olderBlock = older.length
    ? `<h2 id="older">${esc(olderQ)}</h2>
  <p class="fc__lede">Kept in the permanent archive after they left the live window. Still scored stories — not a forecast.</p>
  <ol class="fc__list">${storyRows(ctx, older)}</ol>
  <p class="fresh__key"><a href="${esc(ctx.href('/item/archive.html'))}">Which older AI stories has ${esc(brand.NAME)} kept in the archive?</a></p>`
    : '';

  const main = `${STYLE}
<article class="fc prose">
  <p class="fc__k"><a href="${esc(ctx.href('/world.html'))}">How many datacentres has ${esc(brand.NAME)} mapped on Earth?</a> · <a href="${esc(ctx.href('/country/'))}">Which AI datacentre countries have ${esc(brand.NAME)} pages?</a> · <a href="${esc(ctx.href('/countries.html'))}">Which AI datacentre countries has ${esc(brand.NAME)} mapped?</a></p>
  <h1>How many datacentres has ${esc(brand.NAME)} mapped in ${esc(country.name)}?</h1>
  <p class="fc__lede">${esc(n(country.total))} sites in ${esc(country.name)} ${esc(qualifier)}.
     This page counts map objects carrying a datacentre tag. It does not count every datacentre that exists.
     A dense country is a country somebody mapped.</p>
  <div class="fc__stat" role="group" aria-label="Mapped sites by status">
    <div><b class="num">${esc(n(country.total))}</b><span>Mapped sites</span></div>
    <div><b class="num">${esc(n(country.operating))}</b><span>Operating</span></div>
    <div><b class="num">${esc(n(country.under_construction))}</b><span>Under construction</span></div>
    <div><b class="num">${esc(n(country.announced))}</b><span>Announced</span></div>
    ${stories.length ? `<div><b class="num">${esc(n(stories.length))}</b><span>Stories in window</span></div>` : ''}
    ${archivedAll.length ? `<div><b class="num">${esc(n(archivedAll.length))}</b><span>Older in archive</span></div>` : ''}
  </div>
  <p class="fresh__key">${esc(country.continent || 'Continent not recorded')}${country.subregion ? ` · ${esc(country.subregion)}` : ''} · ${esc(country.iso2)}
     ${ctx.world && ctx.world.generated_at ? ` · file dated ${esc(utc(ctx.world.generated_at))}` : ''}.
     ${attribution}.</p>
  ${cities.length ? `<p>Cities named most often in this extract: ${cities.map(([name, count]) => `${esc(name)} (${esc(n(count))})`).join(', ')}.</p>` : ''}
  ${operators.length ? `<p>Operators named most often: ${operators.map(([name, count]) => `${esc(name)} (${esc(n(count))})`).join(', ')}.</p>` : ''}
  <h2 id="sites">${esc(sitesQ)}</h2>
  ${shown.length
    ? `<ol class="fc__list">${rows}</ol>
       <p class="fresh__key">${shown.length < sites.length
         ? `Showing ${esc(n(shown.length))} of ${esc(n(sites.length))}, announced and under construction first, then operating, by name.`
         : `${esc(n(shown.length))} named ${shown.length === 1 ? 'site' : 'sites'} in the file.`}
          The full set is on <a href="${esc(ctx.href('/world.html'))}">How many datacentres has ${esc(brand.NAME)} mapped on Earth?</a>.</p>`
    : `<p>The country total is published. This build has no per-site rows to list. <a href="${esc(ctx.href('/world.html'))}">How many datacentres has ${esc(brand.NAME)} mapped on Earth?</a> still carries the count.</p>`}
  ${storyBlock}
  ${olderBlock}
  <h2 id="faq">Questions people actually ask</h2>
  ${faqHtml}
  ${neighbours.length ? `<h2 id="same-subregion">${esc(subregionQ)}</h2>
  <nav class="fc__nav" aria-label="Other countries in ${esc(country.subregion)}">${neighbours.map((c) => `<a href="${esc(ctx.href(countryPath(c.iso2)))}">How many datacentres has ${esc(brand.NAME)} mapped in ${esc(c.name)}?</a>`).join('')}</nav>` : ''}
  <p class="fresh__key">Search-shaped directory: <a href="${esc(ctx.href('/countries.html'))}">Which AI datacentre countries has ${esc(brand.NAME)} mapped?</a>.</p>
</article>`;
  const jsonld = [{
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: title,
    url: ctx.url(path),
    description,
    spatialCoverage: { '@type': 'Place', name: country.name },
    isBasedOn: copy.attribution_url || undefined,
    isPartOf: { '@type': 'WebSite', name: brand.PUBLICATION, url: ctx.url('/') },
    creator: { '@type': 'Organization', name: brand.PUBLICATION, url: ctx.url('/') },
    speakable: speakable(['h1', '.fc__lede']),
  }, breadcrumbs(ctx, [
    { name: `How many datacentres has ${brand.NAME} mapped on Earth?`, path: '/world.html' },
    { name: `Which AI datacentre countries have ${brand.NAME} pages?`, path: '/country/' },
    { name: `How many datacentres has ${brand.NAME} mapped in ${country.name}?`, path },
  ]), {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(([q, a]) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }];
  if (stories.length) {
    jsonld.push({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: storiesQ,
      numberOfItems: Math.min(stories.length, COUNTRY_STORY_CAP),
      itemListElement: stories.slice(0, COUNTRY_STORY_CAP).map((it, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: ctx.url(`/item/${slugFor(it)}.html`),
        name: it.title,
      })),
    });
  }

  return page({
    ctx,
    path,
    title,
    description,
    jsonld,
    main,
  });
}

export function renderIndex(ctx) {
  const countries = indexableCountries(ctx);
  const copy = (ctx.world && ctx.world.copy) || {};
  const qualifier = String(copy.headline_qualifier || 'as mapped in OpenStreetMap');
  const path = '/country/';
  // Head-term title: people search “AI countries” / datacentre-directory.
  const title = `Which AI datacentre countries have ${brand.NAME} pages?`;
  const description = clip(
    `${countries.length} countries with at least ${COUNTRY_INDEX_MIN} datacentre sites ${qualifier}. Each page lists the count and named sites. A count of map objects.`,
    160,
  );
  const faq = [
    [`Which AI datacentre countries have ${brand.NAME} pages?`,
      `${countries.length} countries clear the substance gate of at least ${COUNTRY_INDEX_MIN} sites ${qualifier}. Each hub lists those mapped counts — not a national AI ranking or country doom score.`],
    [`Does ${brand.NAME} publish a country doom score?`,
      `No. ${brand.DISCLAIMER_SHORT} These pages count OpenStreetMap datacentre sites, not a ranking of how dangerous a country is.`],
  ];
  const faqHtml = faq.map(([q, a]) => `
  <h3>${esc(q)}</h3>
  <p>${esc(a)}</p>`).join('');
  const rows = countries.map((c) => `<li>
  <a href="${esc(ctx.href(countryPath(c.iso2)))}">How many datacentres has ${esc(brand.NAME)} mapped in ${esc(c.name)}?</a>
  <span class="fc__meta">${esc(c.name)} · ${esc(c.iso2)} · ${esc(c.continent || '')}</span>
  <span class="fc__sc num">${esc(n(c.total))}</span>
</li>`).join('');
  const main = `${STYLE}
<article class="fc prose">
  <p class="fc__k"><a href="${esc(ctx.href('/world.html'))}">How many datacentres has ${esc(brand.NAME)} mapped on Earth?</a> · Which AI datacentre countries have ${esc(brand.NAME)} pages? · <a href="${esc(ctx.href('/countries.html'))}">Which AI datacentre countries has ${esc(brand.NAME)} mapped?</a></p>
  <h1>Which AI datacentre countries have ${esc(brand.NAME)} pages?</h1>
  <p class="fc__lede">A country earns a page when OpenStreetMap has at least ${COUNTRY_INDEX_MIN} datacentre sites mapped there, ${esc(qualifier)}. Fewer than that stays on <a href="${esc(ctx.href('/world.html'))}">How many datacentres has ${esc(brand.NAME)} mapped on Earth?</a> only. ${esc(copy.what_zero_means || 'A country with no mapped datacentre is a country nobody has mapped.')}</p>
  ${rows ? `<ol class="fc__list">${rows}</ol>` : '<p>No country clears the gate in this file.</p>'}
  <h2 id="faq">Questions people actually ask</h2>
  ${faqHtml}
  <p class="fresh__key">Search-shaped directory: <a href="${esc(ctx.href('/countries.html'))}">Which AI datacentre countries has ${esc(brand.NAME)} mapped?</a>.</p>
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
      speakable: speakable(['h1', '.fc__lede']),
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: countries.length,
        itemListElement: countries.map((c, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: ctx.url(countryPath(c.iso2)),
          name: `How many datacentres has ${brand.NAME} mapped in ${c.name}?`,
        })),
      },
    }, breadcrumbs(ctx, [
      { name: `How many datacentres has ${brand.NAME} mapped on Earth?`, path: '/world.html' },
      { name: `Which AI datacentre countries have ${brand.NAME} pages?`, path },
    ]), {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map(([q, a]) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    }],
    main,
  });
}

/**
 * Head-term /countries hub. Same gated country set as /country/, different
 * title and lede for “AI countries” / datacentre-directory queries — mapped
 * site counts only, not a national AI ranking or doom score.
 */
export function renderCountries(ctx) {
  const countries = indexableCountries(ctx);
  const copy = (ctx.world && ctx.world.copy) || {};
  const qualifier = String(copy.headline_qualifier || 'as mapped in OpenStreetMap');
  const path = '/countries.html';
  // Head-term title: people search “AI countries” / datacentre countries.
  const title = `Which AI datacentre countries has ${brand.NAME} mapped?`;
  const description = clip(
    `${countries.length} countries with mapped datacentre hubs on ${brand.NAME}. Each row links /country pages — OpenStreetMap site counts only, not a national AI ranking.`,
    160,
  );
  const faq = [
    [`Which AI datacentre countries has ${brand.NAME} mapped?`,
      `${countries.length} countries clear the substance gate of at least ${COUNTRY_INDEX_MIN} sites ${qualifier}. Each hub lists those mapped counts — not a national AI ranking or country doom score.`],
    [`Does ${brand.NAME} publish a country doom score?`,
      `No. ${brand.DISCLAIMER_SHORT} Numbers are OpenStreetMap datacentre site counts, not a ranking of how dangerous a country is.`],
  ];
  const faqHtml = faq.map(([q, a]) => `
  <h3>${esc(q)}</h3>
  <p>${esc(a)}</p>`).join('');
  const rows = countries.map((c) => `<li>
  <a href="${esc(ctx.href(countryPath(c.iso2)))}">How many datacentres has ${esc(brand.NAME)} mapped in ${esc(c.name)}?</a>
  <span class="fc__meta">${esc(c.name)} · ${esc(c.iso2)}${c.continent ? ` · ${esc(c.continent)}` : ''} · <span class="num">${esc(n(c.total))}</span> mapped sites</span>
</li>`).join('');
  const main = `${STYLE}
<article class="fc prose">
  <p class="fc__k"><a href="${esc(ctx.href('/compare.html'))}">Which AI doom indexes can you compare?</a> · <a href="${esc(ctx.href('/country/'))}">Which AI datacentre countries have ${esc(brand.NAME)} pages?</a> · Which AI datacentre countries has ${esc(brand.NAME)} mapped?</p>
  <h1>Which AI datacentre countries has ${esc(brand.NAME)} mapped?</h1>
  <p class="fc__lede">${esc(brand.NAME)} does not publish a country “doom score” or a national AI ranking. It publishes mapped datacentre counts ${esc(qualifier)}. This page lists countries that already clear the same substance gate as <a href="${esc(ctx.href('/country/'))}">Which AI datacentre countries have ${esc(brand.NAME)} pages?</a> — at least ${COUNTRY_INDEX_MIN} sites in the OpenStreetMap harvest.</p>
  <div class="fc__stat" role="group" aria-label="Countries hub totals">
    <div><b class="num">${esc(n(countries.length))}</b><span>Country hubs</span></div>
  </div>
  ${countries.length ? `<ol class="fc__list">${rows}</ol>` : '<p>No country hub cleared the gate in this build.</p>'}
  <h2 id="faq">Questions people actually ask</h2>
  ${faqHtml}
  <p class="fresh__key"><a href="${esc(ctx.href('/country/'))}">Which AI datacentre countries have ${esc(brand.NAME)} pages?</a>
     · <a href="${esc(ctx.href('/world.html'))}">How many datacentres has ${esc(brand.NAME)} mapped on Earth?</a>
     · <a href="${esc(ctx.href('/companies.html'))}">Which AI companies has ${esc(brand.NAME)} scored stories about?</a>
     · <a href="${esc(ctx.href('/pillars.html'))}">Which AI activity pillars has ${esc(brand.NAME)} scored?</a></p>
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
      speakable: speakable(['h1', '.fc__lede']),
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: countries.length,
        itemListElement: countries.map((c, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: ctx.url(countryPath(c.iso2)),
          name: `How many datacentres has ${brand.NAME} mapped in ${c.name}?`,
        })),
      },
    }, breadcrumbs(ctx, [
      { name: 'Which AI doom indexes can you compare?', path: '/compare.html' },
      { name: `Which AI datacentre countries has ${brand.NAME} mapped?`, path },
    ]), {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map(([q, a]) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    }],
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
    { loc: '/countries.html', changefreq: 'weekly', priority: '0.75', lastmod: last },
    ...countries.map((c) => ({
      loc: countryPath(c.iso2),
      changefreq: 'weekly',
      priority: '0.5',
      lastmod: last,
    })),
  ];
}
