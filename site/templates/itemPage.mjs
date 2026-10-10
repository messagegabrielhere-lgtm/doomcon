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

export function render(ctx, item, related = []) {
  const meta = brand.pillarMeta ? brand.pillarMeta(item.pillar) : null;
  const pillarName = meta ? meta.name : (item.pillar || 'unclassified');
  const firstSeen = (item.meta || {}).first_seen_at || item.published_at;

  const pillarHref = item.pillar ? ctx.href(`/pillar/${item.pillar}.html`) : null;
  const outletHref = item.source && sourceIndexable(ctx, item.source)
    ? ctx.href(sourcePath(item.source))
    : null;
  const outletName = item.source ? sourceLabel(item.source) : '';
  const main = `${styleTag()}
<article class="it">
  <p class="it__k">
    <a href="${esc(ctx.href('/news.html'))}">Newsroom</a> ·
    ${pillarHref ? `<a href="${esc(pillarHref)}">${esc(pillarName)}</a>` : esc(pillarName)} ·
    <time datetime="${esc(item.published_at)}">${esc(utc(item.published_at))}</time>
  </p>

  <h1 class="it__h">${esc(item.title)}</h1>
  ${item.summary ? `<blockquote class="lede" cite="${esc(item.url)}"><p>${esc(clipX(item.summary, 200))}</p><footer>— excerpt from ${esc(item.source)}; the full story and its rights belong to them.</footer></blockquote>` : ''}

  <p class="it__src">
    Source: ${outletHref
      ? `<a href="${esc(outletHref)}">${esc(outletName)}</a> · <a href="${esc(item.url)}" rel="nofollow noopener">original</a>`
      : `<a href="${esc(item.url)}" rel="nofollow noopener">${esc(outletName || item.source)}</a>`}
    · first seen by this index at <time datetime="${esc(firstSeen)}">${esc(utc(firstSeen))}</time>
  </p>

  <section class="it__s" aria-labelledby="it-score">
    <h2 id="it-score">The score</h2>
    ${components(item)}
    <p class="it__n">${hasScore(item)
      ? `Every term is published and every input is public, so this number can be
       recomputed. It ranks the item inside the ${esc(ctx.news.items.length)}-item window; it is
       not a judgement about importance in the world.`
      : `Unscored items stay in the ${esc(ctx.news.items.length)}-item window and keep their page;
         they are simply not ranked by a number. The page says so rather than printing a zero,
         because a zero would read as "measured, and it measured nothing".`}</p>
  </section>

  <section class="it__s" aria-labelledby="it-corr">
    <h2 id="it-corr">How many sources carried it<span class="sec__eb">Corroboration</span></h2>
    ${corroboration(item)}
  </section>

  ${related.length ? `<section class="it__s" aria-labelledby="it-rel">
    <h2 id="it-rel">Related in this window</h2>
    <ul class="it__rel">${related.map((r) => `<li>
      <a href="${esc(ctx.href(`/item/${slugFor(r)}.html`))}">${esc(r.title)}</a>
      ${scoreCell(r, 'it__rm')}
    </li>`).join('')}</ul>
  </section>` : ''}
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
      { name: 'Newsroom', path: '/news.html' },
      ...(item.pillar ? [{ name: pillarName, path: `/pillar/${item.pillar}.html` }] : []),
      { name: item.title, path },
    ])],
    main,
  });
}

export function renderIndex(ctx) {
  const items = ctx.news.items;
  return page({
    ctx,
    path: '/item/index.html',
    title: `Every scored item — ${brand.PUBLICATION}`,
    description: `All ${items.length} items in the current window, each with its score decomposition and corroboration set.`,
    main: `${styleTag()}
<h1>Every scored item</h1>
<p class="lede">${esc(items.length)} items in the rolling window. Each has a permanent page
   carrying how it scored and who else carried it.</p>
<ol class="it__all">${items.map((i) => `<li>
  <a href="${esc(ctx.href(`/item/${slugFor(i)}.html`))}">${esc(i.title)}</a>
  ${scoreCell(i, 'it__rm num')}
</li>`).join('')}</ol>`,
  });
}

export function styleTag() {
  return `<style>
.it__k{font-family:var(--mono);font-size: var(--t-xs);letter-spacing:.08em;text-transform:uppercase;color:var(--ink-faint)}
.it__h{margin:var(--s-2) 0;max-width:24ch;font-size:clamp(22px,4vw,34px);line-height:1.15}
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
