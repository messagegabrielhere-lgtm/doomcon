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
import * as brand from '../brand.mjs';

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
  if (!c || typeof c !== 'object') return '';
  const rows = Object.entries(c)
    .filter(([, v]) => Number.isFinite(v))
    .sort((a, b) => b[1] - a[1]);
  if (!rows.length) return '';
  const total = rows.reduce((n, [, v]) => n + v, 0);
  return `<table class="it__t">
    <caption>How this item scored ${esc(num(item.score, 1))} of 100</caption>
    <thead><tr><th scope="col">Component</th><th scope="col">Points</th></tr></thead>
    <tbody>${rows.map(([k, v]) => `<tr>
      <th scope="row">${esc(k.replace(/_/g, ' '))}</th>
      <td class="num">${esc(num(v, 1))}</td>
    </tr>`).join('')}</tbody>
    <tfoot><tr><th scope="row">Total</th><td class="num">${esc(num(total, 1))}</td></tr></tfoot>
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

  const main = `${styleTag()}
<article class="it">
  <p class="it__k">
    <a href="${esc(ctx.href('/news.html'))}">Newsroom</a> ·
    ${esc(pillarName)} ·
    <time datetime="${esc(item.published_at)}">${esc(utc(item.published_at))}</time>
  </p>

  <h1 class="it__h">${esc(item.title)}</h1>
  ${item.summary ? `<p class="lede">${esc(item.summary)}</p>` : ''}

  <p class="it__src">
    Source: <a href="${esc(item.url)}" rel="nofollow noopener">${esc(item.source)}</a>
    · first seen by this index at <time datetime="${esc(firstSeen)}">${esc(utc(firstSeen))}</time>
  </p>

  <section class="it__s" aria-labelledby="it-score">
    <h2 id="it-score">The score</h2>
    ${components(item)}
    <p class="it__n">Every term is published and every input is public, so this number can be
       recomputed. It ranks the item inside the ${esc(ctx.news.items.length)}-item window; it is
       not a judgement about importance in the world.</p>
  </section>

  <section class="it__s" aria-labelledby="it-corr">
    <h2 id="it-corr">Corroboration</h2>
    ${corroboration(item)}
  </section>

  ${related.length ? `<section class="it__s" aria-labelledby="it-rel">
    <h2 id="it-rel">Related in this window</h2>
    <ul class="it__rel">${related.map((r) => `<li>
      <a href="${esc(ctx.href(`/item/${slugFor(r)}.html`))}">${esc(r.title)}</a>
      <span class="it__rm">${esc(num(r.score, 1))}</span>
    </li>`).join('')}</ul>
  </section>` : ''}
</article>`;

  return page({
    ctx,
    path: `/item/${slugFor(item)}.html`,
    title: `${item.title} — ${brand.PUBLICATION}`,
    description: `${String(item.summary || item.title).slice(0, 150)} Scored ${num(item.score, 1)} of 100 by the ${brand.NAME} index.`,
    ogTitle: item.title,
    ogImageAlt: `${brand.NAME} scored this item ${num(item.score, 1)} of 100`,
    jsonld: [{
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: item.title,
      datePublished: item.published_at,
      url: ctx.url(`/item/${slugFor(item)}.html`),
      isBasedOn: item.url,
      publisher: { '@type': 'Organization', name: brand.PUBLICATION },
      description: item.summary || item.title,
    }],
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
  <span class="it__rm num">${esc(num(i.score, 1))}</span>
</li>`).join('')}</ol>`,
  });
}

export function styleTag() {
  return `<style>
.it__k{font-family:var(--mono);font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-faint)}
.it__h{margin:var(--s-2) 0;max-width:24ch;font-size:clamp(22px,4vw,34px);line-height:1.15}
.it__src{font-family:var(--mono);font-size:11.5px;color:var(--ink-dim)}
.it__s{margin-top:var(--s-5);border-top:1px solid var(--rule);padding-top:var(--s-3)}
.it__s h2{font-family:var(--mono);font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-faint);margin:0 0 var(--s-2)}
.it__t{width:100%;border-collapse:collapse;font-family:var(--mono);font-size:12.5px}
.it__t caption{text-align:left;color:var(--ink-dim);font-size:11.5px;padding-bottom:6px}
.it__t th,.it__t td{text-align:left;padding:5px 0;border-bottom:1px solid var(--rule-soft,var(--rule))}
.it__t td{text-align:right;font-variant-numeric:tabular-nums;color:var(--accent)}
.it__t tfoot th,.it__t tfoot td{border-bottom:0;padding-top:8px}
.it__n,.it__solo{font-size:var(--t-xs);color:var(--ink-dim);line-height:1.5;max-width:60ch}
.it__lead{font-size:var(--t-sm)}
.it__lead--mech,.it__mech{color:var(--ink-faint);font-size:var(--t-xs);max-width:60ch}
.it__ind{font-size:var(--t-xs);color:var(--ink-dim)}
.it__rel,.it__all{list-style:none;margin:0;padding:0}
.it__rel li,.it__all li{display:flex;gap:var(--s-2);align-items:baseline;padding:6px 0;border-bottom:1px solid var(--rule)}
.it__rel a,.it__all a{flex:1;color:inherit;text-decoration:none}
.it__rel a:hover,.it__all a:hover{color:var(--accent)}
.it__rm{font-family:var(--mono);font-size:11.5px;color:var(--ink-faint);font-variant-numeric:tabular-nums}
</style>`;
}
