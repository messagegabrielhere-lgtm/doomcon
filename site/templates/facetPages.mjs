// Faceted landing pages: /pillar/<id>.html and /lab/<id>.html.
//
// COMPETITIVE-SEO.md (2026-10-10): DoomBench ships ~2,081 sitemap URLs via
// /models /companies /countries /people /jobs; Skynet ~1,237 via /tags + /news.
// pizzint still has ~1,018 via /intel but its news-sitemap is empty. Our long
// tail was /item/ only. These facet pages turn filters that already exist as
// CSS chips into crawlable URLs with unique titles (FINDABILITY.md §1.2 #3).

import { esc, num, utc } from './_html.mjs';
import { page } from './layout.mjs';
import { breadcrumbs } from './_seo.mjs';
import { slugFor } from './itemPage.mjs';
import * as brand from '../brand.mjs';

/** Minimum scored stories before a pillar page is indexable (soft-404 gate). */
export const PILLAR_INDEX_MIN = 3;

/** Minimum title/source hits before a lab page leans on news for substance. */
export const LAB_NEWS_MIN = 1;

function clip(text, max) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const at = cut.lastIndexOf(' ');
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,.;:–—-]+$/, '')}…`;
}

export function pillarPath(id) {
  return `/pillar/${id}.html`;
}

export function labPath(id) {
  return `/lab/${id}.html`;
}

export function itemsForPillar(ctx, pillarId) {
  const items = (ctx.news && Array.isArray(ctx.news.items)) ? ctx.news.items : [];
  return items
    .filter((it) => it && it.pillar === pillarId)
    .slice()
    .sort((a, b) => String(b.published_at || '').localeCompare(String(a.published_at || '')));
}

function pillarState(ctx, pillarId) {
  const list = (ctx.state && Array.isArray(ctx.state.pillars)) ? ctx.state.pillars : [];
  return list.find((p) => p && p.id === pillarId) || null;
}

export function pillarIndexable(ctx, pillarId) {
  return itemsForPillar(ctx, pillarId).length >= PILLAR_INDEX_MIN;
}

function scoreCell(it) {
  if (!(Number.isFinite(it.score))) return '<span class="fc__sc mute">—</span>';
  return `<span class="fc__sc num">${esc(num(it.score, 1))}</span>`;
}

function itemRows(ctx, items, limit = 40) {
  return items.slice(0, limit).map((it) => `<li>
  <a href="${esc(ctx.href(`/item/${slugFor(it)}.html`))}">${esc(it.title)}</a>
  <span class="fc__meta">${esc(String(it.source || '').toUpperCase())}
    · <time datetime="${esc(it.published_at || '')}">${esc(utc(it.published_at))}</time></span>
  ${scoreCell(it)}
</li>`).join('');
}

const STYLE = `<style>
.fc{max-width:78ch}
.fc__k{font:600 var(--t-xs)/1.3 var(--mono);color:var(--ink-faint);letter-spacing:.04em;text-transform:uppercase}
.fc__lede{font:400 var(--t-base)/1.55 var(--sans);color:var(--ink-dim);max-width:62ch}
.fc__stat{display:flex;flex-wrap:wrap;gap:14px 22px;margin:18px 0;padding:14px 0;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)}
.fc__stat b{font:700 var(--t-xl)/1 var(--mono);color:var(--ink)}
.fc__stat span{display:block;font:500 var(--t-xs)/1.3 var(--mono);color:var(--ink-faint);margin-top:4px}
.fc__list{list-style:none;padding:0;margin:16px 0 0;display:grid;gap:10px}
.fc__list li{display:grid;grid-template-columns:1fr auto;gap:4px 12px;padding:10px 0;border-bottom:1px solid var(--rule)}
.fc__list a{grid-column:1;color:var(--ink);font:600 var(--t-base)/1.35 var(--sans);text-decoration:none}
.fc__list a:hover{text-decoration:underline}
.fc__meta{grid-column:1;font:400 var(--t-xs)/1.3 var(--mono);color:var(--ink-faint)}
.fc__sc{grid-column:2;grid-row:1/span 2;align-self:center;font:700 var(--t-lg)/1 var(--mono)}
.fc__sc.mute{color:var(--ink-faint);font-weight:500}
.fc__labs,.fc__pillars{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 0}
.fc__labs a,.fc__pillars a{font:600 var(--t-sm)/1.3 var(--sans);padding:6px 10px;border:1px solid var(--rule);border-radius:6px;color:var(--ink);text-decoration:none}
.fc__labs a:hover,.fc__pillars a:hover{background:var(--bg-sunken)}
</style>`;

export function renderPillar(ctx, pillarId) {
  const meta = brand.pillarMeta(pillarId);
  const items = itemsForPillar(ctx, pillarId);
  const st = pillarState(ctx, pillarId);
  const indexable = items.length >= PILLAR_INDEX_MIN;
  const path = pillarPath(pillarId);
  const scoreTxt = st && Number.isFinite(st.score) ? num(st.score, 1) : null;
  const status = st && st.dark ? 'dark this hour'
    : (scoreTxt != null ? `${scoreTxt} of 100 this hour` : 'awaiting a baseline');
  const title = `${meta.name} AI activity · ${brand.NAME} pillar`;
  const description = clip(
    `${brand.NAME} ${meta.name} pillar: ${status}. ${meta.description} ${items.length} scored stories in the current newsroom window.`,
    160,
  );

  const otherPillars = brand.PILLARS
    .filter((p) => p.id !== pillarId)
    .map((p) => `<a href="${esc(ctx.href(pillarPath(p.id)))}">${esc(p.name)}</a>`)
    .join('');

  const main = `${STYLE}
<article class="fc prose">
  <p class="fc__k"><a href="${esc(ctx.href('/news.html'))}">Newsroom</a> · Pillar</p>
  <h1>${esc(meta.name)} AI activity</h1>
  <p class="fc__lede">${esc(meta.description)}</p>
  <div class="fc__stat" role="group" aria-label="Current pillar reading">
    <div><b class="num">${esc(scoreTxt != null ? scoreTxt : '—')}</b><span>Pillar score / 100</span></div>
    <div><b class="num">${esc(String(items.length))}</b><span>Scored stories in window</span></div>
    <div><b>${esc(st && st.dark ? 'DARK' : (st && st.uncalibrated ? 'CALIBRATING' : 'LIVE'))}</b><span>Source posture</span></div>
  </div>
  <p class="fresh__key">This page is the crawlable face of the ${esc(meta.name)} filter on the newsroom.
     The composite ${esc(brand.NAME)} reading still lives on the <a href="${esc(ctx.href('/'))}">homepage</a>;
     the method is on <a href="${esc(ctx.href('/methodology.html'))}">methodology</a>.</p>
  <h2>Stories scored under ${esc(meta.name)}</h2>
  ${items.length
    ? `<ol class="fc__list">${itemRows(ctx, items)}</ol>
       ${items.length > 40 ? `<p class="fresh__key">${esc(String(items.length - 40))} more in the window — see <a href="${esc(ctx.href('/item/'))}">every scored item</a>.</p>` : ''}`
    : `<p>No scored stories in the current window for this pillar. The page stays up so the pillar reading remains addressable; it is not submitted to the sitemap while empty.</p>`}
  <h2>Other pillars</h2>
  <nav class="fc__pillars" aria-label="SIREN pillars">${otherPillars}</nav>
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
      about: {
        '@type': 'Dataset',
        name: `${brand.NAME} ${meta.name} pillar`,
        description: meta.description,
        creator: { '@type': 'Organization', name: brand.PUBLICATION, url: ctx.url('/') },
      },
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: Math.min(items.length, 40),
        itemListElement: items.slice(0, 40).map((it, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: ctx.url(`/item/${slugFor(it)}.html`),
          name: it.title,
        })),
      },
    }, breadcrumbs(ctx, [
      { name: 'Newsroom', path: '/news.html' },
      { name: meta.name, path },
    ])],
    main,
  });
}

/** Race players become /lab/<id>.html landings (DoomBench /companies analogue). */
export function labsFromRace(ctx) {
  const players = (ctx.race && Array.isArray(ctx.race.players)) ? ctx.race.players : [];
  return players.filter((p) => p && p.id && p.name);
}

function labNeedles(player) {
  const names = [player.name, player.id, ...(player.aliases || [])]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());
  // Common short forms the newsroom titles use.
  const extras = {
    openai: ['openai', 'gpt', 'chatgpt', 'sam altman'],
    anthropic: ['anthropic', 'claude', 'amodei'],
    'google-deepmind': ['deepmind', 'gemini', 'google deepmind', 'demis'],
    meta: ['meta ai', 'llama', 'fair', 'zuckerberg'],
    xai: ['xai', 'grok', 'x.ai'],
    deepseek: ['deepseek'],
    mistral: ['mistral'],
    qwen: ['qwen', 'alibaba'],
  };
  return [...new Set([...(extras[player.id] || []), ...names])];
}

export function itemsForLab(ctx, player) {
  const items = (ctx.news && Array.isArray(ctx.news.items)) ? ctx.news.items : [];
  const needles = labNeedles(player);
  return items
    .filter((it) => {
      const hay = `${it.title || ''} ${it.source || ''} ${it.summary || ''}`.toLowerCase();
      return needles.some((n) => n.length >= 3 && hay.includes(n));
    })
    .slice()
    .sort((a, b) => String(b.published_at || '').localeCompare(String(a.published_at || '')));
}

export function labIndexable(ctx, player) {
  // A live race row is substance even with sparse news hits; require either
  // market odds or enough news so we never sitemap a name-only shell.
  const m = player.market || {};
  const hasOdds = Number.isFinite(m.probability);
  return hasOdds || itemsForLab(ctx, player).length >= LAB_NEWS_MIN;
}

function fmtPct(p) {
  return Number.isFinite(p) ? `${(p * 100).toFixed(1)}%` : '—';
}

export function renderLab(ctx, player) {
  const path = labPath(player.id);
  const items = itemsForLab(ctx, player);
  const indexable = labIndexable(ctx, player);
  const m = player.market || {};
  const title = `${player.name} AI activity & market odds · ${brand.NAME}`;
  const description = clip(
    `${player.name} on ${brand.NAME}: live prediction-market odds ${fmtPct(m.probability)}, shipping and mindshare when reported, plus ${items.length} related scored stories.`,
    160,
  );

  const labs = labsFromRace(ctx)
    .filter((p) => p.id !== player.id)
    .map((p) => `<a href="${esc(ctx.href(labPath(p.id)))}">${esc(p.name)}</a>`)
    .join('');

  const main = `${STYLE}
<article class="fc prose">
  <p class="fc__k"><a href="${esc(ctx.href('/race.html'))}">The Race</a> · Lab</p>
  <h1>${esc(player.name)}</h1>
  <p class="fc__lede">${esc(player.principal ? `${player.name}, principal ${player.principal}.` : player.name)}
     Odds and shipping signals come from the public race board; stories are scored newsroom items that name this lab.</p>
  <div class="fc__stat" role="group" aria-label="Lab signals">
    <div><b class="num">${esc(fmtPct(m.probability))}</b><span>Market odds (best model)</span></div>
    <div><b class="num">${esc(Number.isFinite(m.change_7d) ? `${m.change_7d >= 0 ? '+' : '−'}${Math.abs(m.change_7d * 100).toFixed(1)} pts` : '—')}</b><span>7-day change</span></div>
    <div><b class="num">${esc(String(items.length))}</b><span>Related scored stories</span></div>
  </div>
  <p class="fresh__key"><a href="${esc(ctx.href('/race.html'))}">Full race board →</a>
     · Odds are prediction-market prices, not ${esc(brand.NAME)} judgements.</p>
  <h2>Related stories in this window</h2>
  ${items.length
    ? `<ol class="fc__list">${itemRows(ctx, items)}</ol>`
    : `<p>No scored story in the current window names ${esc(player.name)}. The race row above is still the addressable unit.</p>`}
  <h2>Other labs</h2>
  <nav class="fc__labs" aria-label="Labs on the race board">${labs}</nav>
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
      about: { '@type': 'Organization', name: player.name },
      isPartOf: { '@type': 'WebSite', name: brand.PUBLICATION, url: ctx.url('/') },
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: Math.min(items.length, 40),
        itemListElement: items.slice(0, 40).map((it, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: ctx.url(`/item/${slugFor(it)}.html`),
          name: it.title,
        })),
      },
    }, breadcrumbs(ctx, [
      { name: 'The Race', path: '/race.html' },
      { name: player.name, path },
    ])],
    main,
  });
}

/** Sitemap rows: only indexable facets (mirrors noindex). */
export function sitemapEntries(ctx) {
  const out = [];
  const lastNews = (ctx.news && ctx.news.generated_at) || (ctx.state && ctx.state.generated_at);
  for (const p of brand.PILLARS) {
    if (!pillarIndexable(ctx, p.id)) continue;
    out.push({
      loc: pillarPath(p.id),
      changefreq: 'hourly',
      priority: '0.8',
      lastmod: lastNews,
    });
  }
  const lastRace = (ctx.race && ctx.race.generated_at) || lastNews;
  for (const player of labsFromRace(ctx)) {
    if (!labIndexable(ctx, player)) continue;
    out.push({
      loc: labPath(player.id),
      changefreq: 'daily',
      priority: '0.7',
      lastmod: lastRace,
    });
  }
  return out;
}
