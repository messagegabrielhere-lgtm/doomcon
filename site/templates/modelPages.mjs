// /model/<slug>.html — one page per model family the newsroom names often
// enough. The names are the published vocabulary in
// collector/news-sources/_entities.mjs. A page exists only at MODEL_INDEX_MIN
// scored stories, so a single headline does not become a URL. These pages
// count stories. They do not assign a model a score this index does not compute.

import { publishedEntities, entitySlug, entityMatchRegex } from '../../collector/news-sources/_entities.mjs';
import { esc, num, utc } from './_html.mjs';
import { page } from './layout.mjs';
import { breadcrumbs, speakable } from './_seo.mjs';
import { slugFor, storyItemListEntity } from './itemPage.mjs';
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
  Fable: 'anthropic',
  Gemini: 'google-deepmind',
  Gemma: 'google-deepmind',
  Veo: 'google-deepmind',
  Llama: 'meta',
  Grok: 'xai',
  Qwen: 'qwen',
  'DeepSeek-R': 'deepseek',
  Mixtral: 'mistral',
  'Muse Wonder': 'meta',
  'Muse Spark': 'meta',
  Maia: 'microsoft',
  Codex: 'openai',
  'Nano Banana': 'google-deepmind',
  Jev: 'typesafe',
  Dots: 'openai',
  EmbeddingGemma: 'google-deepmind',
  SynthID: 'google-deepmind',
  Clef: 'cloudflare',
  Kimi: 'moonshot-ai',
  GLM: 'zhipu',
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

/** True when the story names this model family in entities or title/summary forms. */
export function itemMatchesModel(it, name) {
  if (!it || !name) return false;
  if (Array.isArray(it.entities) && it.entities.includes(name)) return true;
  // Archive rows keep frozen entity lists; re-match published surface forms so
  // expanded vocab (DeepSeek / Mistral Large, …) can keep hubs above the gate.
  const re = entityMatchRegex(name);
  if (!re) return false;
  return re.test(`${it.title || ''} ${it.summary || ''}`);
}

export function itemsForModel(ctx, name) {
  return newsItems(ctx)
    .filter((it) => itemMatchesModel(it, name))
    .slice()
    .sort((a, b) => String(b.published_at || '').localeCompare(String(a.published_at || '')));
}

/** Older scored stories naming this model, kept in the durable item archive. */
export function archiveItemsForModel(ctx, name) {
  const archived = Array.isArray(ctx.itemArchive) ? ctx.itemArchive : [];
  return archived
    .filter((it) => itemMatchesModel(it, name))
    .slice()
    .sort((a, b) => String(b.published_at || '').localeCompare(String(a.published_at || '')));
}

/** Live + archive scored stories — archive can keep a hub alive after the window rolls (same idea as day hubs). */
export function modelStoryCount(ctx, name) {
  return itemsForModel(ctx, name).length + archiveItemsForModel(ctx, name).length;
}

export function modelIndexable(ctx, name) {
  return isModelName(name) && modelStoryCount(ctx, name) >= MODEL_INDEX_MIN;
}

export function indexableModels(ctx) {
  return MODELS
    .map((e) => {
      const live = itemsForModel(ctx, e.name).length;
      const archived = archiveItemsForModel(ctx, e.name).length;
      return {
        name: e.name,
        slug: entitySlug(e.name),
        live,
        archived,
        count: live + archived,
      };
    })
    .filter((e) => e.count >= MODEL_INDEX_MIN)
    .sort((a, b) => (b.count - a.count) || a.name.localeCompare(b.name));
}

/** Indexable model families this story matches (entities or title/summary forms). */
export function modelsForItem(ctx, item) {
  return indexableModels(ctx).filter((m) => itemMatchesModel(item, m.name));
}

function labNote(ctx, name) {
  const id = MODEL_LAB[name];
  if (!id) return '';
  const players = (ctx.race && Array.isArray(ctx.race.players)) ? ctx.race.players : [];
  const player = players.find((p) => p && p.id === id);
  if (!player) return '';
  return ` Lab page: <a href="${esc(ctx.href(`/lab/${id}.html`))}">What has ${esc(brand.NAME)} scored about ${esc(player.name)}?</a>.`;
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
  const archivedAll = archiveItemsForModel(ctx, name);
  const older = archivedAll.slice(0, 12);
  const path = modelPath(name);
  // Head-term title: people search “{model} stories” / does SIREN score the model.
  const title = `What has ${brand.NAME} scored about ${name}? AI stories, not a model score`;
  const total = items.length + archivedAll.length;
  const description = clip(
    `${total} scored stories name ${name} on ${brand.NAME} (${items.length} in the live window). A count of headlines that matched the published entity list, not a score for the model.`,
    160,
  );
  // Tip #285: section H2s are question-shaped and mirrored in FAQ (§3.3).
  const windowQ = `Which scored stories name ${name} in this window?`;
  const olderQ = `Which older scored stories name ${name}?`;
  const othersQ = 'Which other model families have scored stories?';
  const others = indexableModels(ctx).filter((m) => m.name !== name);
  const faq = [
    [`What has ${brand.NAME} scored about ${name}?`,
      `${total} scored stories name ${name} on ${brand.NAME} (${items.length} in the live window${archivedAll.length ? `, ${archivedAll.length} older in the archive` : ''}). The match is the published entity list applied to the headline — not a rating of the model.`],
    [windowQ,
      items.length
        ? `${items.length} scored ${items.length === 1 ? 'story names' : 'stories name'} ${name} in the current window. Headline match only — not a rating of the model.`
        : 'No scored story in this window names this model.'],
    ...(older.length
      ? [[olderQ,
        'Kept in the permanent archive after they left the live window. Still scored stories — not a forecast.']]
      : []),
    ...(others.length
      ? [[othersQ,
        `Other model families that clear the substance gate, each linking What has ${brand.NAME} scored about that family?`]]
      : []),
    [`Does ${brand.NAME} publish a ${name} doom score?`,
      `No. ${brand.DISCLAIMER_SHORT} This page counts matching headlines. It does not assign ${name} a score.`],
    [`How does a story match ${name}?`,
      `A story matches when the published entity list names the family, or when the headline or summary carries a published surface form for that family. Thinner names stay on the story page only.`],
  ];
  const faqHtml = faq.map(([q, a]) => `
  <h3>${esc(q)}</h3>
  <p>${esc(a)}</p>`).join('');
  const olderBlock = older.length
    ? `<h2 id="older">${esc(olderQ)}</h2>
  <p class="fc__lede">Kept in the permanent archive after they left the live window. Still scored stories — not a forecast.</p>
  <ol class="fc__list">${storyRows(ctx, older)}</ol>
  <p class="fresh__key"><a href="${esc(ctx.href('/item/archive.html'))}">Which older AI stories has ${esc(brand.NAME)} kept in the archive?</a></p>`
    : '';
  const main = `${STYLE}
<article class="fc prose">
  <p class="fc__k"><a href="${esc(ctx.href('/news.html'))}">Which AI stories has ${esc(brand.NAME)} scored in this window?</a> · <a href="${esc(ctx.href('/model/'))}">Which AI model families have ${esc(brand.NAME)} pages?</a> · <a href="${esc(ctx.href('/models.html'))}">Which AI models has ${esc(brand.NAME)} scored stories about?</a></p>
  <h1>What has ${esc(brand.NAME)} scored about ${esc(name)}?</h1>
  <p class="fc__lede">${esc(items.length)} scored ${items.length === 1 ? 'story names' : 'stories name'} ${esc(name)} in the current window.
     The match is the published entity list, applied to the headline. It is not a claim that ${esc(name)} wrote the story, and it is not a rating of the model.</p>
  <div class="fc__stat" role="group" aria-label="Stories naming this model">
    <div><b class="num">${esc(String(items.length))}</b><span>Scored stories in window</span></div>
    ${archivedAll.length ? `<div><b class="num">${esc(String(archivedAll.length))}</b><span>Older in archive</span></div>` : ''}
  </div>
  <p class="fresh__key">${labNote(ctx, name)}
     The composite reading is on <a href="${esc(ctx.href('/'))}">AI activity index today · AI activity level today · ${esc(brand.NAME)}</a>.</p>
  <h2 id="window">${esc(windowQ)}</h2>
  ${items.length ? `<ol class="fc__list">${storyRows(ctx, items)}</ol>` : '<p>No scored story in this window names this model.</p>'}
  ${olderBlock}
  <h2 id="faq">What questions do people actually ask?</h2>
  ${faqHtml}
  ${others.length ? `<h2 id="other-models">${esc(othersQ)}</h2>
  <nav class="fc__nav" aria-label="Other model families">${others.map((m) => `<a href="${esc(ctx.href(modelPath(m.name)))}">What has ${esc(brand.NAME)} scored about ${esc(m.name)}?</a>`).join('')}</nav>` : ''}
</article>`;
  return page({
    ctx,
    path,
    title,
    description,
    noindex: total < MODEL_INDEX_MIN,
    jsonld: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      url: ctx.url(path),
      description,
      about: { '@type': 'Thing', name },
      isPartOf: { '@type': 'WebSite', name: brand.PUBLICATION, url: ctx.url('/') },
      speakable: speakable(['h1', '.fc__lede']),
      mainEntity: storyItemListEntity(ctx, items, older),
    }, breadcrumbs(ctx, [
      { name: `Which AI stories has ${brand.NAME} scored in this window?`, path: '/news.html' },
      { name: `Which AI model families have ${brand.NAME} pages?`, path: '/model/' },
      { name: `What has ${brand.NAME} scored about ${name}?`, path },
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

export function renderIndex(ctx) {
  const models = indexableModels(ctx);
  const path = '/model/';
  // Head-term title: people search “AI model families” / which models SIREN covers.
  const title = `Which AI model families have ${brand.NAME} pages?`;
  const description = clip(
    `${models.length} model families with at least ${MODEL_INDEX_MIN} scored stories on ${brand.NAME} (live window plus archive). Each page lists those stories. No model score is computed.`,
    160,
  );
  const faq = [
    [`Which AI model families have ${brand.NAME} pages?`,
      `${models.length} model families clear the substance gate of at least ${MODEL_INDEX_MIN} matching headlines in the live window or archive. Each hub lists those stories — not a model doom score.`],
    [`Does ${brand.NAME} publish a model doom score?`,
      `No. ${brand.DISCLAIMER_SHORT} These pages count headlines that name a published model family.`],
  ];
  const faqHtml = faq.map(([q, a]) => `
  <h3>${esc(q)}</h3>
  <p>${esc(a)}</p>`).join('');
  const rows = models.map((m) => `<li>
  <a href="${esc(ctx.href(modelPath(m.name)))}">What has ${esc(brand.NAME)} scored about ${esc(m.name)}?</a>
  <span class="fc__meta">${esc(m.slug)}${m.archived ? ` · ${esc(String(m.live))} live / ${esc(String(m.archived))} archive` : ''}</span>
  <span class="fc__sc num">${esc(String(m.count))}</span>
</li>`).join('');
  const main = `${STYLE}
<article class="fc prose">
  <p class="fc__k"><a href="${esc(ctx.href('/news.html'))}">Which AI stories has ${esc(brand.NAME)} scored in this window?</a> · Which AI model families have ${esc(brand.NAME)} pages? · <a href="${esc(ctx.href('/models.html'))}">Which AI models has ${esc(brand.NAME)} scored stories about?</a></p>
  <h1>Which AI model families have ${esc(brand.NAME)} pages?</h1>
  <p class="fc__lede">A model family earns a page when at least ${MODEL_INDEX_MIN} scored stories name it in the live window or the durable archive (same published entity list). Thinner names stay on the story page only. No model “doom score” is computed.</p>
  ${rows ? `<ol class="fc__list">${rows}</ol>` : '<p>No model family clears the gate in this build.</p>'}
  <h2 id="faq">What questions do people actually ask?</h2>
  ${faqHtml}
  <p class="fresh__key">Search-shaped directory: <a href="${esc(ctx.href('/models.html'))}">Which AI models has ${esc(brand.NAME)} scored stories about?</a>.</p>
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
      speakable: speakable(['h1', '.fc__lede']),
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: models.length,
        itemListElement: models.map((m, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: ctx.url(modelPath(m.name)),
          name: `What has ${brand.NAME} scored about ${m.name}?`,
        })),
      },
    }, breadcrumbs(ctx, [
      { name: `Which AI stories has ${brand.NAME} scored in this window?`, path: '/news.html' },
      { name: `Which AI model families have ${brand.NAME} pages?`, path },
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
 * DoomBench-shaped /models head-term hub. Same gated model set as /model/,
 * different title and lede for “AI models” queries — story counts only, not
 * a model doom scoreboard.
 */
export function renderModels(ctx) {
  const models = indexableModels(ctx);
  const path = '/models.html';
  // Head-term title: people search “AI models” / which models SIREN covers.
  const title = `Which AI models has ${brand.NAME} scored stories about?`;
  const description = clip(
    `${models.length} AI model families with scored-story hubs on ${brand.NAME}. Each row links /model pages — story counts only, not a model doom score.`,
    160,
  );
  const faq = [
    [`Which AI models has ${brand.NAME} scored stories about?`,
      `${models.length} model families clear the substance gate of at least ${MODEL_INDEX_MIN} matching headlines in the live window or archive. Each hub lists those stories — not a model doom score.`],
    [`Does ${brand.NAME} publish a model doom score?`,
      `No. ${brand.DISCLAIMER_SHORT} These pages count headlines that name a published model family.`],
  ];
  const faqHtml = faq.map(([q, a]) => `
  <h3>${esc(q)}</h3>
  <p>${esc(a)}</p>`).join('');
  const rows = models.map((m) => `<li>
  <a href="${esc(ctx.href(modelPath(m.name)))}">What has ${esc(brand.NAME)} scored about ${esc(m.name)}?</a>
  <span class="fc__meta">Story hub · <span class="num">${esc(String(m.count))}</span> scored${m.archived ? ` (${esc(String(m.live))} live)` : ''}</span>
</li>`).join('');
  const main = `${STYLE}
<article class="fc prose">
  <p class="fc__k"><a href="${esc(ctx.href('/compare.html'))}">Which AI doom indexes can you compare?</a> · <a href="${esc(ctx.href('/model/'))}">Which AI model families have ${esc(brand.NAME)} pages?</a> · Which AI models has ${esc(brand.NAME)} scored stories about?</p>
  <h1>Which AI models has ${esc(brand.NAME)} scored stories about?</h1>
  <p class="fc__lede">${esc(brand.NAME)} does not publish a model “doom score.” It publishes an activity index and scored stories. This page lists model families that already clear the same substance gate as <a href="${esc(ctx.href('/model/'))}">Which AI model families have ${esc(brand.NAME)} pages?</a> — at least ${MODEL_INDEX_MIN} matching headlines in the live window or archive.</p>
  <div class="fc__stat" role="group" aria-label="Model hub totals">
    <div><b class="num">${esc(String(models.length))}</b><span>Model family hubs</span></div>
  </div>
  ${models.length ? `<ol class="fc__list">${rows}</ol>` : '<p>No model hub cleared the gate in this build.</p>'}
  <h2 id="faq">What questions do people actually ask?</h2>
  ${faqHtml}
  <p class="fresh__key"><a href="${esc(ctx.href('/model/'))}">Which AI model families have ${esc(brand.NAME)} pages?</a>
     · <a href="${esc(ctx.href('/companies.html'))}">Which AI companies has ${esc(brand.NAME)} scored stories about?</a>
     · <a href="${esc(ctx.href('/compare.html'))}">Which AI doom indexes can you compare?</a></p>
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
      speakable: speakable(['h1', '.fc__lede']),
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: models.length,
        itemListElement: models.map((m, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: ctx.url(modelPath(m.name)),
          name: `What has ${brand.NAME} scored about ${m.name}?`,
        })),
      },
    }, breadcrumbs(ctx, [
      { name: 'Which AI doom indexes can you compare?', path: '/compare.html' },
      { name: `Which AI models has ${brand.NAME} scored stories about?`, path },
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

/** Sitemap rows for the model index and each family that clears the gate. */
export function sitemapEntries(ctx) {
  const models = indexableModels(ctx);
  if (!models.length) return [];
  const last = (ctx.news && ctx.news.generated_at) || (ctx.state && ctx.state.generated_at);
  return [
    { loc: '/model/', changefreq: 'hourly', priority: '0.6', lastmod: last },
    { loc: '/models.html', changefreq: 'hourly', priority: '0.75', lastmod: last },
    ...models.map((m) => ({
      loc: modelPath(m.name),
      changefreq: 'hourly',
      priority: '0.6',
      lastmod: last,
    })),
  ];
}
