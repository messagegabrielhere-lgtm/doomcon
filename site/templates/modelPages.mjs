// /model/<slug>.html — one page per model family the newsroom names often
// enough. The names are the published vocabulary in
// collector/news-sources/_entities.mjs. A page exists only at MODEL_INDEX_MIN
// scored stories, so a single headline does not become a URL. These pages
// count stories. They do not assign a model a score this index does not compute.

import { publishedEntities, entitySlug } from '../../collector/news-sources/_entities.mjs';
import { esc, num, utc } from './_html.mjs';
import { page } from './layout.mjs';
import { breadcrumbs } from './_seo.mjs';
import { slugFor } from './itemPage.mjs';
import * as brand from '../brand.mjs';

/** Minimum scored stories before a model page is written and sitemapped. */
export const MODEL_INDEX_MIN = 3;

// Same pairings the race lab needles already use. A missing lab id simply
// omits the link; this map does not claim the lab owns the model.
const MODEL_LAB = {
  GPT: 'openai',
  'o-series': 'openai',
  Sora: 'openai',
  Whisper: 'openai',
  Claude: 'anthropic',
  Gemini: 'google-deepmind',
  Gemma: 'google-deepmind',
  Veo: 'google-deepmind',
  Llama: 'meta',
  Grok: 'xai',
  Qwen: 'qwen',
  'DeepSeek-R': 'deepseek',
  Mixtral: 'mistral',
};

const MODELS = publishedEntities().filter((e) => e.kind === 'model');
const MODEL_NAMES = new Set(MODELS.map((e) => e.name));

function clip(text, max) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const at = cut.lastIndexOf(' ');
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,.;:–—-]+$/, '')}…`;
}

export function modelNames() {
  return [...MODEL_NAMES];
}

export function isModelName(name) {
  return MODEL_NAMES.has(name);
}

export function modelPath(name) {
  return `/model/${entitySlug(name)}.html`;
}

function newsItems(ctx) {
  return (ctx.news && Array.isArray(ctx.news.items)) ? ctx.news.items : [];
}

export function itemsForModel(ctx, name) {
  return newsItems(ctx)
    .filter((it) => it && Array.isArray(it.entities) && it.entities.includes(name))
    .slice()
    .sort((a, b) => String(b.published_at || '').localeCompare(String(a.published_at || '')));
}

export function modelIndexable(ctx, name) {
  return isModelName(name) && itemsForModel(ctx, name).length >= MODEL_INDEX_MIN;
}

export function indexableModels(ctx) {
  return MODELS
    .map((e) => ({ name: e.name, slug: entitySlug(e.name), count: itemsForModel(ctx, e.name).length }))
    .filter((e) => e.count >= MODEL_INDEX_MIN)
    .sort((a, b) => (b.count - a.count) || a.name.localeCompare(b.name));
}

function labNote(ctx, name) {
  const id = MODEL_LAB[name];
  if (!id) return '';
  const players = (ctx.race && Array.isArray(ctx.race.players)) ? ctx.race.players : [];
  const player = players.find((p) => p && p.id === id);
  if (!player) return '';
  return ` Lab page: <a href="${esc(ctx.href(`/lab/${id}.html`))}">${esc(player.name)}</a>.`;
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

function storyRows(ctx, items) {
  return items.slice(0, 40).map((it) => `<li>
  <a href="${esc(ctx.href(`/item/${slugFor(it)}.html`))}">${esc(it.title)}</a>
  <span class="fc__meta">${esc(String(it.source || '').toUpperCase())}
    · <time datetime="${esc(it.published_at || '')}">${esc(utc(it.published_at))}</time></span>
  ${Number.isFinite(it.score) ? `<span class="fc__sc num">${esc(num(it.score, 1))}</span>` : '<span class="fc__sc mute">—</span>'}
</li>`).join('');
}

export function renderModel(ctx, name) {
  const items = itemsForModel(ctx, name);
  const path = modelPath(name);
  const title = `${name}: AI stories this index scored · ${brand.NAME}`;
  const description = clip(
    `${items.length} scored stories in the current ${brand.NAME} window name ${name}. A count of headlines that matched the published entity list, not a score for the model.`,
    160,
  );
  const others = indexableModels(ctx).filter((m) => m.name !== name);
  const main = `${STYLE}
<article class="fc prose">
  <p class="fc__k"><a href="${esc(ctx.href('/news.html'))}">Newsroom</a> · <a href="${esc(ctx.href('/model/'))}">Models</a></p>
  <h1>${esc(name)}</h1>
  <p class="fc__lede">${esc(items.length)} scored ${items.length === 1 ? 'story names' : 'stories name'} ${esc(name)} in the current window.
     The match is the published entity list, applied to the headline. It is not a claim that ${esc(name)} wrote the story, and it is not a rating of the model.</p>
  <div class="fc__stat" role="group" aria-label="Stories naming this model">
    <div><b class="num">${esc(String(items.length))}</b><span>Scored stories in window</span></div>
  </div>
  <p class="fresh__key">${labNote(ctx, name)}
     The composite reading is on the <a href="${esc(ctx.href('/'))}">homepage</a>.</p>
  <h2>Stories in this window</h2>
  ${items.length ? `<ol class="fc__list">${storyRows(ctx, items)}</ol>` : '<p>No scored story in this window names this model.</p>'}
  ${others.length ? `<h2>Other model families</h2>
  <nav class="fc__nav" aria-label="Other model families">${others.map((m) => `<a href="${esc(ctx.href(modelPath(m.name)))}">${esc(m.name)}</a>`).join('')}</nav>` : ''}
</article>`;

  return page({
    ctx,
    path,
    title,
    description,
    noindex: items.length < MODEL_INDEX_MIN,
    jsonld: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      url: ctx.url(path),
      description,
      about: { '@type': 'Thing', name },
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
      { name: 'Newsroom', path: '/news.html' },
      { name: 'Models', path: '/model/' },
      { name, path },
    ])],
    main,
  });
}

export function renderIndex(ctx) {
  const models = indexableModels(ctx);
  const path = '/model/';
  const title = `AI model families this index scored · ${brand.NAME}`;
  const description = clip(
    `${models.length} model families with at least ${MODEL_INDEX_MIN} scored stories in the current ${brand.NAME} window. Each page lists those stories. No model score is computed.`,
    160,
  );
  const rows = models.map((m) => `<li>
  <a href="${esc(ctx.href(modelPath(m.name)))}">${esc(m.name)}</a>
  <span class="fc__meta">${esc(m.slug)}</span>
  <span class="fc__sc num">${esc(String(m.count))}</span>
</li>`).join('');
  const main = `${STYLE}
<article class="fc prose">
  <p class="fc__k"><a href="${esc(ctx.href('/news.html'))}">Newsroom</a> · Models</p>
  <h1>Model families this index scored</h1>
  <p class="fc__lede">A model family earns a page when the current window holds at least ${MODEL_INDEX_MIN} scored stories whose headline matches that name in the published entity list. Fewer than that stays on the story page only.</p>
  ${rows ? `<ol class="fc__list">${rows}</ol>` : '<p>No model family clears the gate in this window.</p>'}
</article>`;
  return page({
    ctx,
    path,
    title,
    description,
    noindex: models.length === 0,
    jsonld: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      url: ctx.url(path),
      description,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: models.length,
        itemListElement: models.map((m, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: ctx.url(modelPath(m.name)),
          name: m.name,
        })),
      },
    }, breadcrumbs(ctx, [
      { name: 'Newsroom', path: '/news.html' },
      { name: 'Models', path },
    ])],
    main,
  });
}

/** Sitemap rows for the model index and each family that clears the gate. */
export function sitemapEntries(ctx) {
  const models = indexableModels(ctx);
  if (!models.length) return [];
  const last = (ctx.news && ctx.news.generated_at) || (ctx.state && ctx.state.generated_at);
  return [
    { loc: '/model/', changefreq: 'hourly', priority: '0.6', lastmod: last },
    ...models.map((m) => ({
      loc: modelPath(m.name),
      changefreq: 'hourly',
      priority: '0.6',
      lastmod: last,
    })),
  ];
}
