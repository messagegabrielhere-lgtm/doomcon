// One permanent page per scored item.
//
// THE PARITY MOVE. pizzint's sitemap holds 1,018 URLs and 997 of them are
// auto-generated /intel/<slug> briefs. That long tail is their actual traffic
// engine — the pizza index is the brand, the briefs are the search asset. We
// were shipping ten URLs against their thousand.
//
// The difference that keeps this from being doorway spam: their briefs are
// summaries of other people's reporting. Every page here carries numbers we
// COMPUTED and nobody else publishes — the five-term score decomposition, the
// corroboration set with named sources, and the measured lead in minutes
// between the first sighting and the second. A reader who lands here from a
// search gets something they cannot get from the original article.
//
// THE HONESTY THAT MAKES THE LEAD CLAIM SURVIVABLE. Measured 2026-09-24: of the
// four corroborated items in the corpus, three were arXiv -> Hugging Face Daily
// Papers, and HF Daily Papers CURATES FROM arXiv. Calling that an "8.7 hour
// lead" would be claiming to have beaten the newspaper to a story we read in
// the newspaper. Those pairs are labelled MECHANICAL and excluded from any
// lead claim; only independent carriers count.

import { esc, num, utc } from './_html.mjs';
import { page } from './layout.mjs';
import { breadcrumbs, speakable } from './_seo.mjs';
import { modelIndexable, modelPath, modelsForItem } from './modelPages.mjs';
import { tagsForItem, tagPath } from './tagPages.mjs';
import { peopleForItem, peoplePath } from './peoplePages.mjs';
import { outletsForItem, outletPath, OUTLET_INDEX_MIN } from './outletPages.mjs';
import { kindIndexable, kindPath, kindById } from './kindPages.mjs';
import { countriesForItem, countryPath } from './countryPages.mjs';
import * as brand from '../brand.mjs';
import { sourceIndexable, sourceLabel, sourcePath } from './facetPages.mjs';

// Third-party summaries are shown as short, attributed excerpts, never in full.
function clipX(text, max) {
  const t = String(text).replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const at = cut.lastIndexOf(' ');
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,.;:–—-]+$/, '')}…`;
}

/**
 * Source pairs where one feed derives from the other, so a time difference
 * between them measures pipeline latency rather than anybody being first.
 *
 * Keyed deliberately rather than inferred: guessing at derivation would be a
 * worse error than maintaining a short list by hand.
 */
const DERIVES_FROM = {
  'hf-daily-papers': ['arxiv-newest'],
  'hf-trending-models': ['github-releases'],
};

function isMechanical(firstSource, otherSource) {
  const a = DERIVES_FROM[otherSource] || [];
  const b = DERIVES_FROM[firstSource] || [];
  return a.includes(firstSource) || b.includes(otherSource);
}

// MISSING IS A STATE, NOT A ZERO — the fifth rule in the header of
// _charts.mjs, and the one this page used to break. _reel.normalizeItem() sets
// score: null for an item the collector did not score, which is a real and
// supported state, and _html.num() throws on any non-finite value. So an
// unscored item did not render as 0 here; it took the whole build down inside
// the per-item page loop.
//
// Every score read on this page goes through these two helpers. An unscored
// item renders as an em dash plus the phrase below, never as a zero and never
// as a value imputed from anything else on the page.
const UNSCORED = 'this item carries no score';

function hasScore(item) {
  return Boolean(item) && Number.isFinite(item.score);
}

/** A score cell, or the named unscored state. Shares the caller's classes. */
function scoreCell(item, cls) {
  return hasScore(item)
    ? `<span class="${esc(cls)}">${esc(num(item.score, 1))}</span>`
    : `<span class="${esc(cls)} it__sc--none" title="${esc(UNSCORED)}">&mdash;</span>`;
}

export function slugFor(item) {
  const base = String(item.title || 'item')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/, '');
  return `${base || 'item'}-${item.id}`;
}

/**
 * CollectionPage ItemList that mirrors visible live + older archive rows
 * (FINDABILITY #51–#53). Live first, then archive — caps match on-page lists.
 */
export function storyItemListEntity(ctx, liveItems, archivedItems, {
  liveCap = 40,
  archiveCap = 12,
} = {}) {
  const list = [];
  for (const it of liveItems || []) {
    if (list.length >= liveCap) break;
    list.push(it);
  }
  const liveCount = list.length;
  for (const it of archivedItems || []) {
    if (list.length >= liveCount + archiveCap) break;
    list.push(it);
  }
  return {
    '@type': 'ItemList',
    numberOfItems: list.length,
    itemListElement: list.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: ctx.url(`/item/${slugFor(it)}.html`),
      name: it.title,
    })),
  };
}

export function hasItems(ctx) {
  return Boolean(ctx && ctx.news && Array.isArray(ctx.news.items) && ctx.news.items.length);
}

function components(item) {
  const c = (item.meta || {}).score_components;
  const rows = c && typeof c === 'object'
    ? Object.entries(c)
      .filter(([, v]) => Number.isFinite(v))
      .sort((a, b) => b[1] - a[1])
    : [];

  // No decomposition to draw. Both halves are stated in words rather than
  // returning '' — an absent table beside the note below reads as a rendering
  // failure, and a zero total would read as "scored, and it scored nothing".
  if (!rows.length) {
    return hasScore(item)
      ? `<p class="it__none">Scored <b class="num">${esc(num(item.score, 1))}</b> of 100. This
         item's record carries no component breakdown, so there is nothing here to decompose —
         the five terms are absent, not zero.</p>`
      : `<p class="it__none"><b aria-hidden="true">&mdash;</b> <span class="vh">No score. </span>This
         item carries no score: the collector did not score it, and no components were recorded.
         Both are absent rather than zero, so nothing on this page imputes a number for it.</p>`;
  }

  const sum = rows.reduce((n, [, v]) => n + v, 0);
  const body = `<thead><tr><th scope="col">Component</th><th scope="col">Points</th></tr></thead>
    <tbody>${rows.map(([k, v]) => `<tr>
      <th scope="row">${esc(k.replace(/_/g, ' '))}</th>
      <td class="num">${esc(num(v, 1))}</td>
    </tr>`).join('')}</tbody>`;

  // Components without an overall score: the rows are real published numbers,
  // so they are shown, but the foot is labelled as the arithmetic sum of the
  // rows above it. Calling it the item's total would be publishing a score the
  // collector never assigned.
  if (!hasScore(item)) {
    return `<table class="it__t">
      <caption>Score components recorded for this item, which carries no overall score</caption>
      ${body}
      <tfoot><tr><th scope="row">Sum of these components</th><td class="num">${esc(num(sum, 1))}</td></tr>
      <tr><th scope="row">Score of 100</th><td class="num it__sc--none" title="${esc(UNSCORED)}">&mdash;</td></tr></tfoot>
    </table>`;
  }

  return `<table class="it__t">
    <caption>How this item scored ${esc(num(item.score, 1))} of 100</caption>
    ${body}
    <tfoot><tr><th scope="row">Total</th><td class="num">${esc(num(sum, 1))}</td></tr></tfoot>
  </table>`;
}

function corroboration(item) {
  const c = (item.meta || {}).corroboration;
  if (!c || !Number.isFinite(c.count) || c.count < 2) {
    return `<p class="it__solo">Carried by one source. That is the normal case — most items are
      reported once — and it is stated rather than left blank so a single-source item cannot be
      mistaken for a corroborated one.</p>`;
  }

  const first = c.first_source;
  const others = (c.sources || []).filter((x) => x !== first);
  const mechanical = others.filter((o) => isMechanical(first, o));
  const independent = others.filter((o) => !isMechanical(first, o));
  const lead = Number.isFinite(c.lead_minutes) ? c.lead_minutes : null;

  const leadLine = independent.length && lead !== null
    ? `<p class="it__lead"><b>${esc(num(lead / 60, 1))} hours</b> separated the first sighting
       from the next independent one.</p>`
    : mechanical.length && !independent.length
      ? `<p class="it__lead it__lead--mech">No independent lead. ${esc(others.join(', '))}
         derives from ${esc(first)}, so the gap between them measures pipeline latency, not
         whether anybody was first.</p>`
      : '';

  return `<div class="it__corr">
    <p><b>${esc(c.count)}</b> sources carried this.
       First: <b>${esc(first)}</b> at ${esc(utc(c.first_seen_published_at || item.published_at))}.</p>
    ${leadLine}
    ${independent.length ? `<p class="it__ind">Independent carriers: ${esc(independent.join(', '))}.</p>` : ''}
    ${mechanical.length ? `<p class="it__mech">Derived carriers (excluded from any lead claim):
       ${esc(mechanical.join(', '))}.</p>` : ''}
  </div>`;
}

function namedLine(ctx, item) {
  const names = Array.isArray(item.entities) ? item.entities.slice() : [];
  // Model hubs also match published surface forms on title/summary (archive
  // rows may only carry the lab entity). Surface those links when the gate clears.
  for (const m of modelsForItem(ctx, item)) {
    if (!names.includes(m.name)) names.push(m.name);
  }
  if (!names.length) return '';
  const bits = names.map((name) => (
    modelIndexable(ctx, name)
      ? `<a href="${esc(ctx.href(modelPath(name)))}">What has ${esc(brand.NAME)} scored about ${esc(name)}?</a>`
      : esc(name)
  ));
  return `<p class="it__src">Names in this headline: ${bits.join(', ')}. A name is a match against the published entity list, not a claim the subject wrote the story.</p>`;
}

function topicLine(ctx, item) {
  const tags = tagsForItem(ctx, item);
  if (!tags.length) return '';
  const bits = tags.map((t) => `<a href="${esc(ctx.href(tagPath(t.id)))}">What has ${esc(brand.NAME)} scored about ${esc(t.name)}?</a>`);
  return `<p class="it__src">Topics: ${bits.join(', ')}. A topic link means the title or summary matched a published needle with enough other stories to clear the tag gate.</p>`;
}

function peopleLine(ctx, item) {
  const people = peopleForItem(ctx, item);
  if (!people.length) return '';
  const bits = people.map((p) => `<a href="${esc(ctx.href(peoplePath(p.id)))}">What press has ${esc(brand.NAME)} scored about ${esc(p.name)}?</a>`);
  return `<p class="it__src">People: ${bits.join(', ')}. A name link means the full name appears in the title or summary and that person already cleared the people-page coverage gate.</p>`;
}

function publisherLine(ctx, item) {
  const outlets = outletsForItem(ctx, item);
  if (!outlets.length) return '';
  const bits = outlets.map((o) => `<a href="${esc(ctx.href(outletPath(o.domain)))}">What has ${esc(brand.NAME)} scored from ${esc(o.domain)}?</a>`);
  return `<p class="it__src">Publisher: ${bits.join(', ')}. A publisher link means the original URL host cleared the outlet gate (≥${OUTLET_INDEX_MIN} scored stories in this window).</p>`;
}

function countryLine(ctx, item) {
  const countries = countriesForItem(ctx, item).slice(0, 4);
  if (!countries.length) return '';
  const bits = countries.map((c) => `<a href="${esc(ctx.href(countryPath(c.iso2)))}">How many datacentres has ${esc(brand.NAME)} mapped in ${esc(c.name)}?</a>`);
  return `<p class="it__src">Countries: ${bits.join(', ')}. A country link means the title or summary named that place and the country already clears the mapped-datacentre gate on the world map.</p>`;
}

export function render(ctx, item, related = []) {
  const meta = brand.pillarMeta ? brand.pillarMeta(item.pillar) : null;
  const pillarName = meta ? meta.name : (item.pillar || 'unclassified');
  const firstSeen = (item.meta || {}).first_seen_at || item.published_at;

  const pillarHref = item.pillar ? ctx.href(`/pillar/${item.pillar}.html`) : null;
  const outletHref = item.source && sourceIndexable(ctx, item.source)
    ? ctx.href(sourcePath(item.source))
    : null;
  const outletName = item.source ? sourceLabel(item.source) : '';
  const kindDef = item.kind ? kindById(item.kind) : null;
  const kindHref = item.kind && kindIndexable(ctx, item.kind)
    ? ctx.href(kindPath(item.kind))
    : null;
  const kindLabel = kindDef ? kindDef.name : (item.kind || '');
  const newsroomQ = `Which AI stories has ${brand.NAME} scored in this window?`;
  const pillarQ = `What has ${brand.NAME} scored under ${pillarName}?`;
  const kindQ = kindLabel ? `What has ${brand.NAME} scored as ${kindLabel}?` : '';
  // Tip #293: section H2s are question-shaped and mirrored in FAQ (§3.3).
  const scoreQ = 'What is the score on this story?';
  const corrQ = 'How many sources carried this story?';
  const relQ = 'Which related stories are in this window?';
  const corr = (item.meta || {}).corroboration;
  const corrCount = corr && Number.isFinite(corr.count) ? corr.count : 1;
  const scoreNote = hasScore(item)
    ? `Every term is published and every input is public, so this number can be
       recomputed. It ranks the item inside the ${esc(ctx.news.items.length)}-item window; it is
       not a judgement about importance in the world.`
    : `Unscored items stay in the ${esc(ctx.news.items.length)}-item window and keep their page;
         they are simply not ranked by a number. The page says so rather than printing a zero,
         because a zero would read as "measured, and it measured nothing".`;
  const faq = [
    [scoreQ,
      hasScore(item)
        ? `Scored ${num(item.score, 1)} of 100. Every term is published and every input is public, so this number can be recomputed. It ranks the item inside the ${ctx.news.items.length}-item window — not a judgement about importance in the world and not an item doom score.`
        : `This item carries no score: the collector did not score it. Unscored items stay in the ${ctx.news.items.length}-item window and keep their page; they are simply not ranked by a number.`],
    [corrQ,
      corrCount >= 2
        ? `${corrCount} sources carried this. Independent carriers count toward any lead claim; derived carriers are labelled mechanical and excluded.`
        : 'Carried by one source. That is the normal case — most items are reported once — and it is stated rather than left blank so a single-source item cannot be mistaken for a corroborated one.'],
    ...(related.length
      ? [[relQ,
        `${related.length} related ${related.length === 1 ? 'story' : 'stories'} in the same window, each with its own permanent scored page.`]]
      : []),
    [`Does ${brand.NAME} publish an item doom score?`,
      `No. ${brand.DISCLAIMER_SHORT} A permanent story page carries a tempo score decomposition and corroboration set, not a probability of harm.`],
  ];
  const faqHtml = faq.map(([q, a]) => `
  <h3>${esc(q)}</h3>
  <p>${esc(a)}</p>`).join('');
  const main = `${styleTag()}
<article class="it">
  <p class="it__k"><a href="${esc(ctx.href('/news.html'))}">${esc(newsroomQ)}</a> · ${pillarHref ? `<a href="${esc(pillarHref)}">${esc(pillarQ)}</a>` : esc(pillarName)}${kindLabel ? ` · ${kindHref ? `<a href="${esc(kindHref)}">${esc(kindQ)}</a>` : esc(kindLabel)}` : ''} · <time datetime="${esc(item.published_at)}">${esc(utc(item.published_at))}</time></p>

  <h1 class="it__h">${esc(item.title)}</h1>
  <p class="it__act">${hasScore(item) ? `<a class="it__score" href="#it-score"><b>${esc(num(item.score, 1))}</b><span>/100 ${esc(brand.NAME)} score</span></a>` : ''}<a class="it__read" href="${esc(item.url)}" rel="nofollow noopener">Read the full story →</a></p>
  <nav class="it__next" aria-label="Keep reading">
    <a href="${esc(ctx.href('/charts.html'))}">What AI charts does ${esc(brand.NAME)} publish?</a>
    <a href="${esc(ctx.href('/news.html'))}">${esc(newsroomQ)}</a>
    <a href="${esc(ctx.href('/'))}">AI activity index today</a>
  </nav>
  ${item.summary ? `<blockquote class="lede" cite="${esc(item.url)}"><p>${esc(clipX(item.summary, 200))}</p><footer>— excerpt from ${esc(item.source)}; the full story and its rights belong to them.</footer></blockquote>` : ''}

  <p class="it__src">
    Source: ${outletHref
      ? `<a href="${esc(outletHref)}">What has ${esc(brand.NAME)} scored via ${esc(outletName)}?</a> · <a href="${esc(item.url)}" rel="nofollow noopener">original</a>`
      : `<a href="${esc(item.url)}" rel="nofollow noopener">${esc(outletName || item.source)}</a>`}
    · first seen by this index at <time datetime="${esc(firstSeen)}">${esc(utc(firstSeen))}</time>
  </p>
  ${namedLine(ctx, item)}
  ${peopleLine(ctx, item)}
  ${publisherLine(ctx, item)}
  ${topicLine(ctx, item)}
  ${countryLine(ctx, item)}

  <section class="it__s" aria-labelledby="it-score">
    <h2 id="it-score">${esc(scoreQ)}</h2>
    ${components(item)}
    <p class="it__n">${scoreNote}</p>
  </section>

  <section class="it__s" aria-labelledby="it-corr">
    <h2 id="it-corr">${esc(corrQ)}<span class="sec__eb">Corroboration</span></h2>
    ${corroboration(item)}
  </section>

  ${related.length ? `<section class="it__s" aria-labelledby="it-rel">
    <h2 id="it-rel">${esc(relQ)}</h2>
    <ul class="it__rel">${related.map((r) => `<li>
      <a href="${esc(ctx.href(`/item/${slugFor(r)}.html`))}">${esc(r.title)}</a>
      ${scoreCell(r, 'it__rm')}
    </li>`).join('')}</ul>
  </section>` : ''}
  <h2 id="faq">What questions do people actually ask?</h2>
  ${faqHtml}
</article>`;

  const path = `/item/${slugFor(item)}.html`;
  const pageUrl = ctx.url(path);
  return page({
    ctx,
    path,
    title: `${item.title} — ${brand.PUBLICATION}`,
    description: `${clipX(String(item.summary || item.title), 140)} ${hasScore(item)
      ? `Scored ${num(item.score, 1)} of 100 by the ${brand.NAME} AI activity index.`
      : `Indexed by the ${brand.NAME} AI activity index; ${UNSCORED}.`}`,
    ogTitle: item.title,
    ogImageAlt: hasScore(item)
      ? `${brand.NAME} scored this item ${num(item.score, 1)} of 100`
      : `${brand.NAME} indexed this item without a score`,
    jsonld: [{
      '@context': 'https://schema.org',
      // A WebPage ABOUT someone else's story, not a NewsArticle: this index
      // did not write the headline, and structured data must not say it did.
      '@type': 'WebPage',
      name: item.title,
      url: pageUrl,
      isBasedOn: item.url,
      datePublished: item.published_at || undefined,
      publisher: { '@type': 'Organization', name: brand.PUBLICATION, url: ctx.url('/') },
      description: clipX(String(item.summary || item.title), 200),
      speakable: speakable(['h1.it__h', 'blockquote.lede']),
      isPartOf: { '@type': 'WebSite', name: brand.PUBLICATION, url: ctx.url('/') },
    }, breadcrumbs(ctx, [
      { name: newsroomQ, path: '/news.html' },
      ...(item.pillar ? [{ name: pillarQ, path: `/pillar/${item.pillar}.html` }] : []),
      { name: item.title, path },
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

/** Stories per paginated archive hub (keeps /item/ light; links the long tail). */
export const ARCHIVE_PAGE_SIZE = 100;

export function archivedItems(ctx) {
  return Array.isArray(ctx.itemArchive) ? ctx.itemArchive : [];
}

export function archivePageCount(ctx) {
  const n = archivedItems(ctx).length;
  return n ? Math.ceil(n / ARCHIVE_PAGE_SIZE) : 0;
}

/** Page 1 → `/item/archive.html`; page 2+ → `/item/archive-2.html`. */
export function archivePagePath(pageNum) {
  const n = Math.max(1, Number(pageNum) || 1);
  return n === 1 ? '/item/archive.html' : `/item/archive-${n}.html`;
}

export function renderIndex(ctx) {
  const items = ctx.news.items;
  const archived = archivedItems(ctx);
  const pages = archivePageCount(ctx);
  const archiveNote = archived.length
    ? ` <a href="${esc(ctx.href(archivePagePath(1)))}">${esc(String(archived.length))} older scored ${archived.length === 1 ? 'story' : 'stories'}</a> sit in the permanent archive outside this window.`
    : '';
  // Head-term title: people search “scored AI stories” / every item this window.
  const title = `Which scored AI stories are in the ${brand.NAME} live window?`;
  const description = `All ${items.length} items in the current window, each with its score decomposition and corroboration set.`;
  const faq = [
    [`Which scored AI stories are in the ${brand.NAME} live window?`,
      `${items.length} scored ${items.length === 1 ? 'item' : 'items'} in the rolling window. Each has a permanent page carrying how it scored and who else carried it — not an item doom score.`],
    [`Does ${brand.NAME} publish an item doom score?`,
      `No. ${brand.DISCLAIMER_SHORT} Each permanent story page carries a tempo score decomposition and corroboration set, not a probability of harm.`],
  ];
  const faqHtml = faq.map(([q, a]) => `
  <h3>${esc(q)}</h3>
  <p>${esc(a)}</p>`).join('');
  return page({
    ctx,
    path: '/item/index.html',
    title,
    description,
    jsonld: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      url: ctx.url('/item/'),
      description,
      speakable: speakable(['h1', 'p.lede']),
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: items.length,
        itemListElement: items.slice(0, 100).map((it, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: it.title,
          url: ctx.url(`/item/${slugFor(it)}.html`),
        })),
      },
    }, breadcrumbs(ctx, [
      { name: `Which AI stories has ${brand.NAME} scored in this window?`, path: '/news.html' },
      { name: title, path: '/item/' },
    ]), {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map(([q, a]) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    }],
    main: `${styleTag()}
<article class="it">
<p class="it__k"><a href="${esc(ctx.href('/news.html'))}">Which AI stories has ${esc(brand.NAME)} scored in this window?</a> · Which scored AI stories are in the ${esc(brand.NAME)} live window?</p>
<h1>Which scored AI stories are in the ${esc(brand.NAME)} live window?</h1>
<p class="lede">${esc(items.length)} items in the rolling window. Each has a permanent page
   carrying how it scored and who else carried it.${archiveNote}</p>
${pages ? `<p class="it__n">Archive hubs: ${Array.from({ length: Math.min(pages, 8) }, (_, i) => {
  const n = i + 1;
  return `<a href="${esc(ctx.href(archivePagePath(n)))}">${n === 1 ? 'newest' : `page ${n}`}</a>`;
}).join(' · ')}${pages > 8 ? ` · <a href="${esc(ctx.href(archivePagePath(pages)))}">page ${esc(String(pages))}</a>` : ''}</p>` : ''}
<ol class="it__all">${items.map((i) => `<li>
  <a href="${esc(ctx.href(`/item/${slugFor(i)}.html`))}">${esc(i.title)}</a>
  ${scoreCell(i, 'it__rm num')}
</li>`).join('')}</ol>
<h2 id="faq">What questions do people actually ask?</h2>
${faqHtml}
</article>`,
  });
}

/**
 * One page of the durable archive (stories outside the live newsroom window).
 * Each row is a previously scored NewsItem — not a synonym doorway.
 */
export function renderArchivePage(ctx, pageNum = 1) {
  const all = archivedItems(ctx);
  const pages = archivePageCount(ctx);
  const n = Math.min(Math.max(1, Number(pageNum) || 1), Math.max(1, pages));
  const start = (n - 1) * ARCHIVE_PAGE_SIZE;
  const slice = all.slice(start, start + ARCHIVE_PAGE_SIZE);
  const path = archivePagePath(n);
  // Head-term title: people search “AI story archive” / older scored stories.
  const title = n === 1
    ? `Which older AI stories has ${brand.NAME} kept in the archive?`
    : `Which older AI stories has ${brand.NAME} kept in the archive? (page ${n}/${pages})`;
  const description = `Page ${n} of ${pages || 1}: older scored AI stories kept after they left the live ${brand.NAME} newsroom window. Tempo scores, not a forecast.`;
  const faq = [
    [`Which older AI stories has ${brand.NAME} kept in the archive?`,
      `${all.length} older scored ${all.length === 1 ? 'story' : 'stories'} sit outside the live window (page ${n} of ${pages || 1}). Each page still carries the score decomposition from when it was measured — not an archive doom score.`],
    [`Does ${brand.NAME} publish an archive doom score?`,
      `No. ${brand.DISCLAIMER_SHORT} The archive keeps scored stories after they leave the live window — tempo scores, not a forecast and not a probability of harm.`],
  ];
  const faqHtml = faq.map(([q, a]) => `
  <h3>${esc(q)}</h3>
  <p>${esc(a)}</p>`).join('');
  const prev = n > 1 ? `<a href="${esc(ctx.href(archivePagePath(n - 1)))}">← newer</a>` : '';
  const next = n < pages ? `<a href="${esc(ctx.href(archivePagePath(n + 1)))}">older →</a>` : '';
  const pager = (prev || next)
    ? `<p class="it__n">${prev}${prev && next ? ' · ' : ''}${next} · page ${esc(String(n))} of ${esc(String(pages))}</p>`
    : '';
  return page({
    ctx,
    path,
    title,
    description,
    noindex: slice.length === 0,
    jsonld: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      url: ctx.url(path),
      description,
      speakable: speakable(['h1.it__h', 'p.lede']),
      isPartOf: { '@type': 'WebSite', name: brand.PUBLICATION, url: ctx.url('/') },
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: slice.length,
        itemListElement: slice.map((it, i) => ({
          '@type': 'ListItem',
          position: start + i + 1,
          name: it.title,
          url: ctx.url(`/item/${slugFor(it)}.html`),
        })),
      },
    }, breadcrumbs(ctx, [
      { name: `Which AI stories has ${brand.NAME} scored in this window?`, path: '/news.html' },
      { name: `Which scored AI stories are in the ${brand.NAME} live window?`, path: '/item/' },
      { name: title, path },
    ]), {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map(([q, a]) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    }],
    main: `${styleTag()}
<article class="it">
  <p class="it__k"><a href="${esc(ctx.href('/news.html'))}">Which AI stories has ${esc(brand.NAME)} scored in this window?</a> · <a href="${esc(ctx.href('/item/'))}">Which scored AI stories are in the ${esc(brand.NAME)} live window?</a></p>
  <h1 class="it__h">Which older AI stories has ${esc(brand.NAME)} kept in the archive?</h1>
  <p class="lede">${esc(String(all.length))} older scored stories kept after they left the live window.
     Each page still carries the score decomposition from when it was measured. This is not a
     forecast and not a probability of harm.</p>
  ${pager}
  <ol class="it__all">${slice.map((i) => `<li>
  <a href="${esc(ctx.href(`/item/${slugFor(i)}.html`))}">${esc(i.title)}</a>
  ${scoreCell(i, 'it__rm num')}
</li>`).join('')}</ol>
  ${pager}
  <h2 id="faq">What questions do people actually ask?</h2>
  ${faqHtml}
</article>`,
  });
}

/** Sitemap rows for paginated archive hubs (individual /item/ URLs stay elsewhere). */
export function archiveSitemapEntries(ctx) {
  const pages = archivePageCount(ctx);
  if (!pages) return [];
  const last = (ctx.itemArchiveMeta && ctx.itemArchiveMeta.updated_at)
    || (ctx.news && ctx.news.generated_at)
    || (ctx.state && ctx.state.generated_at);
  return Array.from({ length: pages }, (_, i) => ({
    loc: archivePagePath(i + 1),
    changefreq: 'daily',
    priority: i === 0 ? '0.65' : '0.55',
    lastmod: last,
  }));
}

export function styleTag() {
  return `<style>
.it__k{font-family:var(--mono);font-size: var(--t-xs);letter-spacing:.08em;text-transform:uppercase;color:var(--ink-faint)}
.it__h{margin:var(--s-2) 0;max-width:24ch;font-size:clamp(22px,4vw,34px);line-height:1.15}
.it__act{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:var(--s-2) 0 var(--s-3)}
.it__score{display:inline-flex;align-items:baseline;gap:4px;min-height:44px;padding:8px 12px;box-sizing:border-box;border:2px solid var(--rule);color:var(--ink);text-decoration:none}
.it__score b{font-size:20px;font-variant-numeric:tabular-nums}.it__score span{font-size:12px;color:var(--ink-dim)}
.it__read{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;background:var(--ink);color:var(--bg-sunken)!important;font-weight:700;text-decoration:none;border-radius:3px}
.it__read:hover{opacity:.9}
.it__next{display:flex;flex-wrap:wrap;gap:8px 14px;margin:0 0 var(--s-3);font-family:var(--mono);font-size:var(--t-xs)}
.it__next a{color:var(--accent,#93C5FD)}
.it__src{font-family:var(--mono);font-size: var(--t-xs);color:var(--ink-dim)}
.it blockquote.lede{margin:var(--s-2) 0;padding-left:var(--s-3);border-left:3px solid var(--rule)}.it blockquote.lede p{margin:0}.it blockquote.lede footer{margin-top:6px;font-family:var(--mono);font-size:var(--t-xs);color:var(--ink-faint)}
.it__s{margin-top:var(--s-5);border-top:1px solid var(--rule);padding-top:var(--s-3)}
.it__s h2{font-family:var(--mono);font-size: var(--t-xs);letter-spacing:.12em;text-transform:uppercase;color:var(--ink-faint);margin:0 0 var(--s-2)}
.it__t{width:100%;border-collapse:collapse;font-family:var(--mono);font-size: var(--t-xs)}
.it__t caption{text-align:left;color:var(--ink-dim);font-size: var(--t-xs);padding-bottom:6px}
.it__t th,.it__t td{text-align:left;padding:5px 0;border-bottom:1px solid var(--rule-soft,var(--rule))}
.it__t td{text-align:right;font-variant-numeric:tabular-nums;color:var(--accent)}
.it__t tfoot th,.it__t tfoot td{border-bottom:0;padding-top:8px}
.it__n,.it__solo,.it__none{font-size:var(--t-xs);color:var(--ink-dim);line-height:1.5;max-width:60ch}
.it__sc--none{color:var(--ink-faint)}
.it__lead{font-size:var(--t-sm)}
.it__lead--mech,.it__mech{color:var(--ink-faint);font-size:var(--t-xs);max-width:60ch}
.it__ind{font-size:var(--t-xs);color:var(--ink-dim)}
.it__rel,.it__all{list-style:none;margin:0;padding:0}
.it__rel li,.it__all li{display:flex;gap:var(--s-2);align-items:baseline;padding:6px 0;border-bottom:1px solid var(--rule)}
.it__rel a,.it__all a{flex:1;color:inherit;text-decoration:none}
.it__rel a:hover,.it__all a:hover{color:var(--accent)}
.it__rm{font-family:var(--mono);font-size: var(--t-xs);color:var(--ink-faint);font-variant-numeric:tabular-nums}
</style>`;
}
