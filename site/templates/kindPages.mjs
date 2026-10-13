// /kind/<id>.html — hubs for scored stories by collector kind.
//
// Kind is already a first-class field on every NewsItem (collector/news.mjs
// VALID_KINDS). These pages turn that filter into crawlable URLs with unique
// titles — another gated facet axis toward the DoomBench/Skynet URL lead,
// without synonym doorway farms (FINDABILITY.md §3.3).

import { esc, num, utc } from './_html.mjs';
import { page } from './layout.mjs';
import { breadcrumbs, speakable } from './_seo.mjs';
import { slugFor } from './itemPage.mjs';
import * as brand from '../brand.mjs';

/** Minimum scored stories before a kind page is written and sitemapped. */
export const KIND_INDEX_MIN = 5;

export const KIND_LIST_CAP = 40;

/** Published kind vocabulary — ids match collector/news.mjs VALID_KINDS. */
export const KIND_DEFS = Object.freeze([
  {
    id: 'press',
    name: 'Press',
    description: 'Outlet reporting this index scored in the current window.',
  },
  {
    id: 'forum',
    name: 'Forums',
    description: 'Forum and community threads this index scored (HN, Reddit, and peers).',
  },
  {
    id: 'paper',
    name: 'Papers',
    description: 'Research papers and preprints this index scored.',
  },
  {
    id: 'lab',
    name: 'Lab posts',
    description: 'Official lab blog and research posts this index scored.',
  },
  {
    id: 'release',
    name: 'Releases',
    description: 'Model and product releases this index scored.',
  },
  {
    id: 'model',
    name: 'Model cards',
    description: 'Model-card and model-hub items this index scored.',
  },
  {
    id: 'status',
    name: 'Status incidents',
    description: 'Provider status incidents this index scored.',
  },
]);

const BY_ID = new Map(KIND_DEFS.map((k) => [k.id, k]));

const STYLE = `<style>
.kd{max-width:78ch}
.kd__k{font:600 var(--t-xs)/1.3 var(--mono);color:var(--ink-faint);letter-spacing:.04em;text-transform:uppercase}
.kd__lede{font:400 var(--t-base)/1.55 var(--sans);color:var(--ink-dim);max-width:68ch}
.kd__stat{display:flex;flex-wrap:wrap;gap:14px 22px;margin:18px 0;padding:14px 0;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)}
.kd__stat b{font:700 var(--t-xl)/1 var(--mono);color:var(--ink)}
.kd__stat span{display:block;font:500 var(--t-xs)/1.3 var(--mono);color:var(--ink-faint);margin-top:4px}
.kd__list{list-style:none;padding:0;margin:16px 0 0;display:grid;gap:10px}
.kd__list li{display:grid;grid-template-columns:1fr auto;gap:4px 12px;padding:10px 0;border-bottom:1px solid var(--rule)}
.kd__list a{grid-column:1;color:var(--ink);font:600 var(--t-base)/1.35 var(--sans);text-decoration:none}
.kd__list a:hover{text-decoration:underline}
.kd__meta{grid-column:1;font:400 var(--t-xs)/1.3 var(--mono);color:var(--ink-faint)}
.kd__sc{grid-column:2;grid-row:1/span 2;align-self:center;font:700 var(--t-lg)/1 var(--mono)}
.kd__nav{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 0}
.kd__nav a{font:600 var(--t-sm)/1.3 var(--sans);padding:6px 10px;border:1px solid var(--rule);border-radius:6px;color:var(--ink);text-decoration:none}
.kd__nav a:hover{background:var(--bg-sunken)}
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

export function kindPath(id) {
  return `/kind/${String(id || '').toLowerCase()}.html`;
}

export function kindById(id) {
  return BY_ID.get(String(id || '').toLowerCase()) || null;
}

export function itemsForKind(ctx, id) {
  const key = String(id || '').toLowerCase();
  if (!BY_ID.has(key)) return [];
  return newsItems(ctx)
    .filter((it) => it && String(it.kind || '').toLowerCase() === key)
    .slice()
    .sort((a, b) => String(b.published_at || '').localeCompare(String(a.published_at || '')));
}

/** Older scored stories of this kind, kept in the durable item archive. */
export function archiveItemsForKind(ctx, id) {
  const key = String(id || '').toLowerCase();
  if (!BY_ID.has(key)) return [];
  const archived = Array.isArray(ctx.itemArchive) ? ctx.itemArchive : [];
  return archived
    .filter((it) => it && String(it.kind || '').toLowerCase() === key)
    .slice()
    .sort((a, b) => String(b.published_at || '').localeCompare(String(a.published_at || '')));
}

/** Live + archive stories of this kind — archive can keep a hub above the gate. */
export function kindStoryCount(ctx, id) {
  return itemsForKind(ctx, id).length + archiveItemsForKind(ctx, id).length;
}

export function kindIndexable(ctx, id) {
  return kindStoryCount(ctx, id) >= KIND_INDEX_MIN;
}

export function indexableKinds(ctx) {
  return KIND_DEFS
    .map((k) => {
      const live = itemsForKind(ctx, k.id).length;
      const archived = archiveItemsForKind(ctx, k.id).length;
      return { ...k, live, archived, count: live + archived };
    })
    .filter((k) => k.count >= KIND_INDEX_MIN)
    .sort((a, b) => (b.count - a.count) || a.name.localeCompare(b.name));
}

function storyRows(ctx, items) {
  return items.slice(0, KIND_LIST_CAP).map((it) => `<li>
  <a href="${esc(ctx.href(`/item/${slugFor(it)}.html`))}">${esc(it.title)}</a>
  <span class="kd__meta">${esc(String(it.source || '').toUpperCase())}
    · <time datetime="${esc(it.published_at || '')}">${esc(utc(it.published_at))}</time>
    ${it.pillar ? ` · ${esc(it.pillar)}` : ''}</span>
  ${Number.isFinite(it.score) ? `<span class="kd__sc num">${esc(num(it.score, 1))}</span>` : '<span class="kd__sc">—</span>'}
</li>`).join('');
}

export function renderKind(ctx, id) {
  const def = kindById(id);
  if (!def) {
    return page({
      ctx,
      path: kindPath(id),
      title: `Kind not in this build · ${brand.NAME}`,
      description: `No kind page for ${id}.`,
      noindex: true,
      main: `${STYLE}<article class="kd prose"><h1>Not in this build</h1><p>This kind is not in the published vocabulary.</p></article>`,
    });
  }

  const items = itemsForKind(ctx, def.id);
  const archivedAll = archiveItemsForKind(ctx, def.id);
  const older = archivedAll.slice(0, 12);
  const total = items.length + archivedAll.length;
  const path = kindPath(def.id);
  // Head-term title: people search “{kind} AI stories” / kind doom score.
  const title = `What has ${brand.NAME} scored as ${def.name}? AI stories, not a kind score`;
  const description = clip(
    `${total} scored ${def.name.toLowerCase()} stories on ${brand.NAME} (live window plus archive). ${def.description} Tempo, not a forecast.`,
    160,
  );
  const faq = [
    [`What has ${brand.NAME} scored as ${def.name}?`,
      `${total} scored stories carry the ${def.name} collector label on ${brand.NAME} (${items.length} in the live window${archivedAll.length ? `, ${archivedAll.length} older in the archive` : ''}). ${def.description}`],
    [`Does ${brand.NAME} publish a ${def.name} doom score?`,
      `No. ${brand.DISCLAIMER_SHORT} A kind page lists scored stories with that collector label — not a judgement about quality or harm.`],
  ];
  const faqHtml = faq.map(([q, a]) => `
  <h3>${esc(q)}</h3>
  <p>${esc(a)}</p>`).join('');
  const others = indexableKinds(ctx).filter((k) => k.id !== def.id);
  const olderBlock = older.length
    ? `<h2>Older scored ${esc(def.name.toLowerCase())}</h2>
  <p class="kd__lede">Kept in the permanent archive after they left the live window. Still scored stories — not a forecast.</p>
  <ol class="kd__list">${storyRows(ctx, older)}</ol>
  <p class="fresh__key"><a href="${esc(ctx.href('/item/archive.html'))}">Full story archive</a></p>`
    : '';

  const main = `${STYLE}
<article class="kd prose">
  <p class="kd__k"><a href="${esc(ctx.href('/news.html'))}">Newsroom</a> · <a href="${esc(ctx.href('/kind/'))}">Kinds</a> · <a href="${esc(ctx.href('/kinds.html'))}">Kinds hub</a></p>
  <h1>What has ${esc(brand.NAME)} scored as ${esc(def.name)}?</h1>
  <p class="kd__lede">${esc(def.description)} Kind is the collector label on each scored item — not a judgement about quality or harm.</p>
  <div class="kd__stat" role="group" aria-label="Kind totals">
    <div><b class="num">${esc(String(total))}</b><span>Scored stories (live + archive)</span></div>
    <div><b class="num">${esc(String(items.length))}</b><span>In live window</span></div>
    ${archivedAll.length ? `<div><b class="num">${esc(String(archivedAll.length))}</b><span>Older in archive</span></div>` : ''}
  </div>
  <h2>${esc(def.name)} in this window</h2>
  ${items.length
    ? `<ol class="kd__list">${storyRows(ctx, items)}</ol>`
    : '<p>No scored story of this kind in the current window.</p>'}
  ${items.length > KIND_LIST_CAP
    ? `<p class="fresh__key">${esc(String(items.length - KIND_LIST_CAP))} more on the <a href="${esc(ctx.href('/news.html'))}">full newsroom</a>.</p>`
    : `<p class="fresh__key"><a href="${esc(ctx.href('/news.html'))}">Full newsroom →</a></p>`}
  ${olderBlock}
  <h2 id="faq">Questions people actually ask</h2>
  ${faqHtml}
  ${others.length ? `<h2>Other kinds</h2>
  <nav class="kd__nav" aria-label="Other kinds">${others.map((k) => `<a href="${esc(ctx.href(kindPath(k.id)))}">${esc(k.name)} <span class="num">(${esc(String(k.count))})</span></a>`).join('')}</nav>` : ''}
</article>`;

  return page({
    ctx,
    path,
    title,
    description,
    noindex: total < KIND_INDEX_MIN,
    jsonld: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      url: ctx.url(path),
      description,
      isPartOf: { '@type': 'WebSite', name: brand.PUBLICATION, url: ctx.url('/') },
      about: { '@type': 'Thing', name: def.name, description: def.description },
      speakable: speakable(['h1', '.kd__lede']),
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: Math.min(items.length, KIND_LIST_CAP),
        itemListElement: items.slice(0, KIND_LIST_CAP).map((it, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: ctx.url(`/item/${slugFor(it)}.html`),
          name: it.title,
        })),
      },
    }, breadcrumbs(ctx, [
      { name: 'Newsroom', path: '/news.html' },
      { name: 'Kinds', path: '/kind/' },
      { name: def.name, path },
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
  const kinds = indexableKinds(ctx);
  const path = '/kind/';
  // Head-term title: people search “AI story kinds” / press vs forum.
  const title = `Which AI story kinds have ${brand.NAME} pages?`;
  const description = clip(
    `${kinds.length} kind hubs with at least ${KIND_INDEX_MIN} scored stories on ${brand.NAME} (live window plus archive).`,
    160,
  );
  const faq = [
    [`Which AI story kinds have ${brand.NAME} pages?`,
      `${kinds.length} kinds clear the substance gate of at least ${KIND_INDEX_MIN} matching stories in the live window or archive. Each hub lists those stories — not a kind doom score.`],
    [`Does ${brand.NAME} publish a kind doom score?`,
      `No. ${brand.DISCLAIMER_SHORT} These pages count stories that carry a published collector label.`],
  ];
  const faqHtml = faq.map(([q, a]) => `
  <h3>${esc(q)}</h3>
  <p>${esc(a)}</p>`).join('');
  const rows = kinds.map((k) => `<li>
  <a href="${esc(ctx.href(kindPath(k.id)))}">${esc(k.name)}</a>
  <span class="kd__meta">${esc(k.description)} · <span class="num">${esc(String(k.count))}</span> scored${k.archived ? ` (${esc(String(k.live))} live)` : ''}</span>
</li>`).join('');

  const main = `${STYLE}
<article class="kd prose">
  <p class="kd__k"><a href="${esc(ctx.href('/news.html'))}">Newsroom</a> · Kinds · <a href="${esc(ctx.href('/kinds.html'))}">Kinds hub</a></p>
  <h1>Which AI story kinds have ${esc(brand.NAME)} pages?</h1>
  <p class="kd__lede">A kind earns a page when at least ${KIND_INDEX_MIN} scored stories with that collector label appear in the live window or the durable archive. Thinner kinds stay on the story page only.</p>
  ${kinds.length ? `<ol class="kd__list">${rows}</ol>` : '<p>No kind cleared the gate in this build.</p>'}
  <h2 id="faq">Questions people actually ask</h2>
  ${faqHtml}
  <p class="fresh__key">Search-shaped directory: <a href="${esc(ctx.href('/kinds.html'))}">Which AI story kinds has ${esc(brand.NAME)} scored?</a>.</p>
</article>`;

  return page({
    ctx,
    path,
    title,
    description,
    noindex: kinds.length === 0,
    jsonld: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      url: ctx.url(path),
      description,
      speakable: speakable(['h1', '.kd__lede']),
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: kinds.length,
        itemListElement: kinds.map((k, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: ctx.url(kindPath(k.id)),
          name: k.name,
        })),
      },
    }, breadcrumbs(ctx, [
      { name: 'Newsroom', path: '/news.html' },
      { name: 'Kinds', path },
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
 * Head-term /kinds hub. Same gated kind set as /kind/, different title and
 * lede for “AI story kinds” / press-vs-forum queries — collector labels only.
 */
export function renderKinds(ctx) {
  const kinds = indexableKinds(ctx);
  const path = '/kinds.html';
  // Head-term title: people search “AI story kinds” / press vs forum hubs.
  const title = `Which AI story kinds has ${brand.NAME} scored?`;
  const description = clip(
    `${kinds.length} story-kind hubs on ${brand.NAME} (press, forum, paper, …). Each row links /kind pages — collector labels and story counts, not a doom score.`,
    160,
  );
  const faq = [
    [`Which AI story kinds has ${brand.NAME} scored?`,
      `${kinds.length} kinds clear the substance gate of at least ${KIND_INDEX_MIN} matching stories in the live window or archive. Each hub lists those stories — not a kind doom score.`],
    [`Does ${brand.NAME} publish a kind doom score?`,
      `No. ${brand.DISCLAIMER_SHORT} These pages count stories that carry a published collector label (press, forum, paper, …).`],
  ];
  const faqHtml = faq.map(([q, a]) => `
  <h3>${esc(q)}</h3>
  <p>${esc(a)}</p>`).join('');
  const rows = kinds.map((k) => `<li>
  <a href="${esc(ctx.href(kindPath(k.id)))}">${esc(k.name)}</a>
  <span class="kd__meta">Kind hub · <span class="num">${esc(String(k.count))}</span> scored${k.archived ? ` (${esc(String(k.live))} live)` : ''}</span>
</li>`).join('');
  const main = `${STYLE}
<article class="kd prose">
  <p class="kd__k"><a href="${esc(ctx.href('/compare.html'))}">Compare</a> · <a href="${esc(ctx.href('/kind/'))}">Kinds</a> · Kinds hub</p>
  <h1>Which AI story kinds has ${esc(brand.NAME)} scored?</h1>
  <p class="kd__lede">${esc(brand.NAME)} does not publish a kind “doom score.” It labels scored stories with collector kinds (press, forum, paper, …). This page lists kinds that already clear the same substance gate as <a href="${esc(ctx.href('/kind/'))}">/kind/</a> — at least ${KIND_INDEX_MIN} matching stories in the live window or archive.</p>
  <div class="kd__stat" role="group" aria-label="Kinds hub totals">
    <div><b class="num">${esc(String(kinds.length))}</b><span>Kind hubs</span></div>
  </div>
  ${kinds.length ? `<ol class="kd__list">${rows}</ol>` : '<p>No kind hub cleared the gate in this build.</p>'}
  <h2 id="faq">Questions people actually ask</h2>
  ${faqHtml}
  <p class="fresh__key"><a href="${esc(ctx.href('/kind/'))}">Kind directory →</a>
     · <a href="${esc(ctx.href('/tags.html'))}">AI tags →</a>
     · <a href="${esc(ctx.href('/news.html'))}">Newsroom →</a></p>
</article>`;
  return page({
    ctx,
    path,
    title,
    description,
    noindex: kinds.length === 0,
    jsonld: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      url: ctx.url(path),
      description,
      speakable: speakable(['h1', '.kd__lede']),
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: kinds.length,
        itemListElement: kinds.map((k, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: ctx.url(kindPath(k.id)),
          name: k.name,
        })),
      },
    }, breadcrumbs(ctx, [
      { name: 'Compare', path: '/compare.html' },
      { name: 'Kinds', path },
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

export function sitemapEntries(ctx) {
  const kinds = indexableKinds(ctx);
  if (!kinds.length) return [];
  const last = (ctx.news && ctx.news.generated_at) || (ctx.state && ctx.state.generated_at);
  return [
    { loc: '/kind/', changefreq: 'hourly', priority: '0.7', lastmod: last },
    { loc: '/kinds.html', changefreq: 'hourly', priority: '0.75', lastmod: last },
    ...kinds.map((k) => ({
      loc: kindPath(k.id),
      changefreq: 'hourly',
      priority: '0.65',
      lastmod: last,
    })),
  ];
}
