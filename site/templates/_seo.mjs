// Shared structured-data builders for Google rich results and E-E-A-T.
//
// FINDABILITY.md §1.4: schema only for claims the page already makes in HTML.
// Speakable selectors must match visible elements. BreadcrumbList must match
// the nav path a reader can click. Organization is the publisher identity.

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
    alternateName: [brand.NAME, brand.FORMERLY, 'AI SIREN Index'].filter(Boolean),
    url: ctx.url('/'),
    description: brand.DESCRIPTION,
    logo: ctx.url('/favicon.svg'),
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
