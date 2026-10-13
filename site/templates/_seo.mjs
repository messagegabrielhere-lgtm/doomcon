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
    alternateName: [brand.NAME, brand.FORMERLY, 'AI SIREN Index', 'AI Siren Index'].filter(Boolean),
    url: ctx.url('/'),
    description: brand.DESCRIPTION,
    logo: ctx.url('/favicon.svg'),
    knowsAbout: [
      'AI activity index',
      'AI activity index today',
      'AI activity tempo',
      'AI tempo index',
      'frontier AI news',
      'p(doom)',
      'what is p(doom)',
      'AI doomsday clock',
      'verifiable AI doomsday clock',
      'how the AI activity index is computed',
      'history of AI risk',
      'AI explainers',
      'Is AI taking jobs',
      'Is AI curing anything',
      'what is SIREN',
      'SIREN privacy',
      'SIREN press kit',
      'SIREN terms of use',
      'SIREN disclosures',
      'SIREN brand guide',
      'AI models this index scored',
      'AI companies this index scored',
      'AI tags this index scored',
      'AI people this index scored',
      'AI story kinds this index scored',
      'AI outlets this index scored',
      'AI news sources this index scored',
      'AI activity pillars this index scored',
      'AI doom index alternatives',
      'DoomBench alternative',
      'Skynet Countdown alternative',
      'Takeoff Tracker alternative',
      'Pentagon Pizza Index alternative',
      'recomputable AI activity index',
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
