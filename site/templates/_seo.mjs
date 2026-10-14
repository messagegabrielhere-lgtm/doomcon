// Shared structured-data builders for Google rich results and E-E-A-T.
//
// FINDABILITY.md §1.4: schema only for claims the page already makes in HTML.
// Speakable selectors must match visible elements. BreadcrumbList must match
// the nav path a reader can click. Organization is the publisher identity.
//
// ChatGPT citation study (SE Ranking via Groberman, 2026-10-13; FINDABILITY
// §2.6): well-structured pages with question-shaped headings, clear answers,
// and recent dateModified earned far more citations than llms.txt. Prefer
// WebPage freshness + FAQ that mirrors visible Q&A over agent-map churn.
//
// Perplexity / AI-search discovery (Groberman 2026-10-14; FINDABILITY §2.7):
// engines often discover pages via Google SERPs, then chunk them into short
// reusable fragments. Visible answer blocks (`.ans`) are the HTML form of
// that fragment — not a special AI file, and not a substitute for Google rank.

import { esc } from './_html.mjs';
import * as brand from '../brand.mjs';

/** Publisher Organization with sameAs profiles Google can join for E-E-A-T. */
export function organization(ctx) {
  const sameAs = [
    brand.X_URL,
    'https://github.com/messagegabrielhere-lgtm/doomcon',
  ].filter(Boolean);
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    // ctx.url('/') already ends with / — do not add another slash before #org
    // (live bug was https://siren.watch//#org).
    '@id': `${ctx.url('/')}#org`,
    name: brand.PUBLICATION,
    alternateName: [brand.NAME, brand.FORMERLY, 'AI SIREN Index', 'AI Siren Index'].filter(Boolean),
    url: ctx.url('/'),
    description: brand.DESCRIPTION,
    logo: ctx.url('/favicon.svg'),
    knowsAbout: [
      'AI activity index',
      'AI activity tempo',
      'frontier AI news',
      'p(doom)',
      'AI doomsday clock',
    ],
    ...(sameAs.length ? { sameAs } : {}),
  };
}

/**
 * BreadcrumbList for SERP hierarchy.
 * @param {object} ctx
 * @param {{ name: string, path: string }[]} crumbs  root-first; last is current page
 */
export function breadcrumbs(ctx, crumbs) {
  const items = [{ name: brand.NAME, path: '/' }, ...crumbs];
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: ctx.url(c.path),
    })),
  };
}

/**
 * SpeakableSpecification for voice / summary surfaces.
 * Selectors must exist as visible HTML on the page (Google rich-result policy).
 */
export function speakable(cssSelector) {
  const sels = Array.isArray(cssSelector) ? cssSelector : [cssSelector];
  return {
    '@type': 'SpeakableSpecification',
    cssSelector: sels,
  };
}

/**
 * WebPage block with optional freshness and speakable selectors.
 * dateModified must be a real ISO stamp already on the page (usually the
 * hourly reading). Never invent a "today" from the build clock.
 *
 * @param {object} ctx
 * @param {{
 *   path: string,
 *   name: string,
 *   description?: string,
 *   dateModified?: string,
 *   speakable?: string|string[],
 * }} opts
 */
export function webPage(ctx, opts) {
  const block = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: opts.name,
    url: ctx.url(opts.path),
    isPartOf: { '@type': 'WebSite', name: brand.PUBLICATION, url: ctx.url('/') },
  };
  if (opts.description) block.description = opts.description;
  if (opts.dateModified && typeof opts.dateModified === 'string') {
    block.dateModified = opts.dateModified;
  }
  if (opts.speakable) block.speakable = speakable(opts.speakable);
  return block;
}

/**
 * FAQPage from [question, answer] pairs that already appear as visible HTML.
 * @param {[string, string][]} pairs
 */
export function faqPage(pairs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: pairs.map(([q, a]) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

/**
 * Standard evergreen JSON-LD stack: WebPage + breadcrumbs + optional FAQ.
 * Organization is added by layout.page() for every indexable route.
 *
 * @param {object} ctx
 * @param {{
 *   path: string,
 *   name: string,
 *   description?: string,
 *   crumbs: { name: string, path: string }[],
 *   speakable?: string|string[],
 *   faq?: [string, string][],
 * }} opts
 */
export function evergreenJsonLd(ctx, opts) {
  const modified = ctx.state && typeof ctx.state.generated_at === 'string'
    ? ctx.state.generated_at
    : undefined;
  const blocks = [
    webPage(ctx, {
      path: opts.path,
      name: opts.name,
      description: opts.description,
      dateModified: modified,
      // Prefer the short answer block when present; fall back to the lede.
      speakable: opts.speakable || ['h1', '.ans__a', '.lede'],
    }),
    breadcrumbs(ctx, opts.crumbs),
  ];
  if (opts.faq && opts.faq.length) blocks.push(faqPage(opts.faq));
  return blocks;
}

/**
 * Visible short-answer / TLDR block for AI chunk extraction and humans.
 * Text must already be a claim the page makes elsewhere — never invent.
 * Keep `a` under ~500 characters so one fragment fits a retrieval chunk.
 *
 * @param {{ q?: string, a: string, label?: string }} opts
 * @returns {string} HTML
 */
export function answerBlock(opts) {
  const a = String(opts.a || '').trim();
  if (!a) return '';
  const label = opts.label || 'In short';
  const q = opts.q ? String(opts.q).trim() : '';
  const qHtml = q
    ? `<p class="ans__q">${esc(q)}</p>`
    : '';
  return `<aside class="ans" aria-label="${esc(label)}">
  <p class="ans__k">${esc(label)}</p>
  ${qHtml}<p class="ans__a">${esc(a)}</p>
</aside>`;
}

/** CSS for `.ans` — inject into page-local `<style>` or the layout sheet. */
export const ANSWER_BLOCK_CSS = `
.ans{margin:var(--s-3,16px) 0 var(--s-4,24px);padding:12px 14px;border-left:3px solid var(--accent,#ffb020);background:var(--bg-sunken,#12151c);border-radius:0 8px 8px 0;max-width:68ch}
.ans__k{margin:0 0 6px;font:700 var(--t-2xs,10px)/1.2 var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--ink-faint,#8b93a7)}
.ans__q{margin:0 0 6px;font:600 var(--t-sm,14px)/1.35 var(--sans);color:var(--ink,#e8eaee)}
.ans__a{margin:0;font:400 var(--t-base,16px)/1.5 var(--sans);color:var(--ink-dim,#c4cad6)}
.ans__a b{color:var(--ink,#e8eaee)}
`;
