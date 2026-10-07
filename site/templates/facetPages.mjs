// Faceted landing pages: one URL per pillar and per frontier lab.
//
// COMPETITIVE.md §1.3 / Phase 2.3: both sides built filter chips and neither
// emitted a URL. pizzint's /intel chips and our newsroom radios are CSS state
// with no crawlable address. These pages turn the same queries into indexable
// landing pages that also give every /item/* page an internal link target
// richer than "back to the newsroom".
//
// Deterministic: no clock, no randomness. A facet with fewer than MIN items
// is not written — thin doorway pages are worse than a missing URL.

import { esc, num, utc } from './_html.mjs';
import { page } from './layout.mjs';
import { slugFor } from './itemPage.mjs';
import * as brand from '../brand.mjs';

/** Labs need a few hits before a page is worth indexing. Pillars are our own
 *  taxonomy — even one item earns a landing page, so item breadcrumbs never
 *  point at a 404. */
export const MIN_LAB_ITEMS = 3;
export const MIN_PILLAR_ITEMS = 1;

/** Labs we will emit a page for when enough items mention them. Keys are
 *  URL slugs; `match` is the case-insensitive word test against title +
 *  summary + source. Ids align with data/race.json players where they exist. */
export const LABS = [
  { id: 'openai', name: 'OpenAI', match: /\bopenai\b|\bgpt[-\s]?\d|\bchatgpt\b/i },
  { id: 'anthropic', name: 'Anthropic', match: /\banthropic\b|\bclaude\b/i },
  { id: 'google-deepmind', name: 'Google DeepMind', match: /\bdeepmind\b|\bgoogle\s+deepmind\b|\bgemini\b|\bgoogle\s+ai\b/i },
  { id: 'meta', name: 'Meta AI', match: /\bmeta\s+ai\b|\bllama\b|\bfacebook\s+ai\b/i },
  { id: 'xai', name: 'xAI', match: /\bxai\b|\bgrok\b/i },
  { id: 'mistral', name: 'Mistral', match: /\bmistral\b/i },
  { id: 'deepseek', name: 'DeepSeek', match: /\bdeepseek\b/i },
  { id: 'nvidia', name: 'NVIDIA', match: /\bnvidia\b|\bcuda\b/i },
];

function itemsOf(ctx) {
  return ctx.news && Array.isArray(ctx.news.items) ? ctx.news.items : [];
}

function scored(list) {
  return list.filter((it) => Number.isFinite(it.score));
}

function scoreCell(it) {
  return Number.isFinite(it.score)
    ? `<span class="fc__sc num">${esc(num(it.score, 1))}</span>`
    : '<span class="fc__sc num fc__sc--none" title="this item carries no score">&mdash;</span>';
}

function listBlock(ctx, list) {
  const top = [...list].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 40);
  return `<ol class="fc__list">${top.map((it) => `<li>
    <a href="${esc(ctx.href(`/item/${slugFor(it)}.html`))}">${esc(it.title)}</a>
    ${scoreCell(it)}
    <span class="fc__src">${esc(it.source || '')}</span>
  </li>`).join('')}</ol>`;
}

function styleTag() {
  return `<style>
.fc__k{font-family:var(--mono);font-size:var(--t-xs);letter-spacing:.08em;text-transform:uppercase;color:var(--ink-faint)}
.fc__h{margin:var(--s-2) 0;max-width:28ch;font-size:clamp(22px,4vw,34px);line-height:1.15}
.fc__list{list-style:none;margin:var(--s-4) 0 0;padding:0}
.fc__list li{display:grid;grid-template-columns:1fr auto;gap:4px 12px;padding:8px 0;border-bottom:1px solid var(--rule)}
.fc__list a{color:inherit;text-decoration:none;grid-column:1}
.fc__list a:hover{color:var(--accent)}
.fc__sc{font-family:var(--mono);font-size:var(--t-xs);color:var(--accent);font-variant-numeric:tabular-nums}
.fc__sc--none{color:var(--ink-faint)}
.fc__src{grid-column:1;font-family:var(--mono);font-size:var(--t-2xs);color:var(--ink-faint);letter-spacing:.04em}
.fc__more{margin-top:var(--s-4);font-size:var(--t-sm)}
.fc__nav{display:flex;flex-wrap:wrap;gap:8px 14px;margin:var(--s-4) 0;font-family:var(--mono);font-size:var(--t-xs)}
.fc__nav a{color:var(--ink-dim)}
</style>`;
}

function siblingNav(ctx, currentPath) {
  const pillars = pillarsToWrite(ctx)
    .map((p) => ({ href: `/pillar/${p.id}.html`, label: p.name }));
  const labs = labsToWrite(ctx)
    .map((lab) => ({ href: `/lab/${lab.id}.html`, label: lab.name }));
  const links = [...pillars, ...labs]
    .filter((l) => l.href !== currentPath)
    .slice(0, 12);
  if (!links.length) return '';
  return `<nav class="fc__nav" aria-label="Other facets">${links.map((l) =>
    `<a href="${esc(ctx.href(l.href))}">${esc(l.label)}</a>`).join('')}</nav>`;
}

export function pillarItems(ctx, pillarId) {
  return itemsOf(ctx).filter((it) => it.pillar === pillarId);
}

export function labItems(ctx, lab) {
  return itemsOf(ctx).filter((it) => {
    const hay = `${it.title || ''} ${it.summary || ''} ${it.source || ''}`;
    return lab.match.test(hay);
  });
}

export function pillarsToWrite(ctx) {
  return brand.PILLARS.filter((p) => pillarItems(ctx, p.id).length >= MIN_PILLAR_ITEMS);
}

export function labsToWrite(ctx) {
  return LABS.filter((lab) => labItems(ctx, lab).length >= MIN_LAB_ITEMS);
}

export function renderPillar(ctx, pillarId) {
  const meta = brand.pillarMeta(pillarId);
  const list = pillarItems(ctx, pillarId);
  const n = list.length;
  const scoredN = scored(list).length;
  const path = `/pillar/${pillarId}.html`;
  const at = ctx.news && ctx.news.generated_at ? utc(ctx.news.generated_at) : null;

  const main = `${styleTag()}
<article class="fc">
  <p class="fc__k"><a href="${esc(ctx.href('/news.html'))}">Newsroom</a> · Pillar · ${esc(meta.name)}</p>
  <h1 class="fc__h">${esc(meta.name)} signal in this window</h1>
  <p class="lede">${esc(meta.description)}</p>
  <p>${esc(String(n))} scored item${n === 1 ? '' : 's'} in the current newsroom window sit under this pillar
    ${scoredN !== n ? ` (${esc(String(scoredN))} with a numeric score)` : ''}${at ? `, as of ${esc(at)}` : ''}.</p>
  ${siblingNav(ctx, path)}
  ${listBlock(ctx, list)}
  <p class="fc__more"><a href="${esc(ctx.href('/news.html'))}">Full newsroom →</a> ·
    <a href="${esc(ctx.href('/item/'))}">Every item page →</a> ·
    <a href="${esc(ctx.href('/methodology.html'))}">How pillars are composed →</a></p>
</article>`;

  return page({
    ctx,
    path,
    title: `${meta.name} AI signal — live scored items · ${brand.NAME}`,
    description: `${n} newsroom items under the ${meta.name} pillar of the ${brand.NAME} index. ${meta.blurb}`,
    ogTitle: `${meta.name} · ${n} items in the ${brand.NAME} newsroom`,
    jsonld: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${meta.name} signal`,
      url: ctx.url(path),
      description: meta.description,
      isPartOf: { '@type': 'WebSite', name: brand.PUBLICATION, url: ctx.url('/') },
      numberOfItems: n,
    }, {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: ctx.url('/') },
        { '@type': 'ListItem', position: 2, name: 'Newsroom', item: ctx.url('/news.html') },
        { '@type': 'ListItem', position: 3, name: meta.name, item: ctx.url(path) },
      ],
    }],
    main,
  });
}

export function renderLab(ctx, lab) {
  const list = labItems(ctx, lab);
  const n = list.length;
  const path = `/lab/${lab.id}.html`;
  const at = ctx.news && ctx.news.generated_at ? utc(ctx.news.generated_at) : null;

  const main = `${styleTag()}
<article class="fc">
  <p class="fc__k"><a href="${esc(ctx.href('/news.html'))}">Newsroom</a> · Lab · ${esc(lab.name)}</p>
  <h1 class="fc__h">${esc(lab.name)} in the scored window</h1>
  <p class="lede">Headlines in this index that name ${esc(lab.name)}, each with the score this site computed — not a judgement of the lab, a count of how loud the story was across independent carriers.</p>
  <p>${esc(String(n))} item${n === 1 ? '' : 's'} in the current window mention ${esc(lab.name)}${at ? `, as of ${esc(at)}` : ''}.</p>
  ${siblingNav(ctx, path)}
  ${listBlock(ctx, list)}
  <p class="fc__more"><a href="${esc(ctx.href('/race.html'))}">The Race — live lab odds →</a> ·
    <a href="${esc(ctx.href('/news.html'))}">Full newsroom →</a></p>
</article>`;

  return page({
    ctx,
    path,
    title: `${lab.name} AI news — scored by ${brand.NAME}`,
    description: `${n} newsroom items mentioning ${lab.name}, each with a recomputable ${brand.NAME} score from public sources.`,
    ogTitle: `${lab.name} · ${n} scored items · ${brand.NAME}`,
    jsonld: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${lab.name} in the newsroom`,
      url: ctx.url(path),
      about: { '@type': 'Organization', name: lab.name },
      isPartOf: { '@type': 'WebSite', name: brand.PUBLICATION, url: ctx.url('/') },
      numberOfItems: n,
    }, {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: ctx.url('/') },
        { '@type': 'ListItem', position: 2, name: 'Newsroom', item: ctx.url('/news.html') },
        { '@type': 'ListItem', position: 3, name: lab.name, item: ctx.url(path) },
      ],
    }],
    main,
  });
}

export function renderPillarIndex(ctx) {
  const pillars = pillarsToWrite(ctx);
  const labs = labsToWrite(ctx);
  const main = `${styleTag()}
<article class="fc">
  <p class="fc__k">Facets</p>
  <h1 class="fc__h">Browse by pillar or lab</h1>
  <p class="lede">Every chip the newsroom already filters on, as a real URL a crawler can open.</p>
  <h2 class="fc__k">Pillars</h2>
  <ul class="fc__list">${pillars.map((p) => {
    const n = pillarItems(ctx, p.id).length;
    return `<li><a href="${esc(ctx.href(`/pillar/${p.id}.html`))}">${esc(p.name)}</a>
      <span class="fc__sc num">${esc(String(n))}</span>
      <span class="fc__src">${esc(p.blurb)}</span></li>`;
  }).join('')}</ul>
  <h2 class="fc__k">Labs</h2>
  <ul class="fc__list">${labs.map((lab) => {
    const n = labItems(ctx, lab).length;
    return `<li><a href="${esc(ctx.href(`/lab/${lab.id}.html`))}">${esc(lab.name)}</a>
      <span class="fc__sc num">${esc(String(n))}</span></li>`;
  }).join('')}</ul>
</article>`;

  return page({
    ctx,
    path: '/facets.html',
    title: `Browse AI signal by pillar or lab · ${brand.NAME}`,
    description: `Faceted views of the ${brand.NAME} newsroom: capability, compute, attention, governance, markets, and frontier labs.`,
    main,
  });
}
