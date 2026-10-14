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
      speakable: opts.speakable || ['h1', '.lede'],
    }),
    breadcrumbs(ctx, opts.crumbs),
  ];
  if (opts.faq && opts.faq.length) blocks.push(faqPage(opts.faq));
  return blocks;
}
