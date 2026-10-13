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
      'AI datacentre countries this index scored',
      'how many datacentres mapped on Earth',
      'how many datacentres mapped in the United States',
      'SIREN infrastructure index',
      'what does the SIREN infrastructure index read',
      'AI charts',
      'what AI charts does SIREN publish',
      'who makes the most electricity',
      'China vs US electricity',
      'SIREN daily brief',
      'what is the SIREN daily brief',
      'CVE exploit lag',
      'how many days from a CVE going public to CISA listing it as exploited',
      'Flock ALPR camera map',
      'how many Flock ALPR cameras has SIREN mapped',
      'SIREN upside index',
      'what is BLISS, the SIREN upside index',
      'AI harm and benefit side by side',
      'how does SIREN count AI harm and benefit side by side',
      'Tally desk unserious counts',
      'what unserious counts does SIREN keep on Tally\'s desk',
      'AI breakthroughs tracked',
      'what AI breakthroughs has SIREN tracked',
      'SIREN instruments',
      'what instruments sit behind the SIREN reading',
      'Waffle House Index',
      'is the Waffle House open',
      'AI threat board',
      'what could take the machines offline tonight',
      'ready for superintelligence',
      'Ready for SI personal plan',
      'USA vs China AI race',
      'USA vs China: who is winning the race to superintelligence',
      'AI-proof your job',
      'how do I AI-proof my job',
      'Is ChatGPT down',
      'Is Claude down',
      'bug-out land',
      'where to buy remote land to ride out Skynet',
      'prepper checklist',
      'what belongs in a 72-hour prepper kit',
      'bunker kit',
      'what free tools belong in a bunker kit',
      'Takeover Watch',
      'what AI autonomy signals is SIREN watching',
      "Tally's bets",
      'Does the SIREN index make forecasts',
      'Skynet scenario',
      'What if an AI wakes up at 2:14 a.m.',
      'The Day After',
      'What happens the day after an AI catastrophe',
      'Containment',
      'Can you stop an AI breakout',
      'Agent Watch',
      'What are AI agents saying on Moltbook',
      'SIREN Arcade',
      'What free AI games can you play on SIREN',
      'Evolution Log',
      'How has AI activity moved day by day',
      'SIREN Radio',
      'What free music does SIREN Radio play',
      'SIREN TV',
      'What free AI explainer videos does SIREN publish',
      'AI on TV and radio',
      'What AI is on TV and radio right now',
      'SIREN catalog',
      'Where is everything on SIREN listed',
      'AI labs this index scored',
      'AI stories this index scored',
      'AI leaders on the record',
      'AI race',
      'who is winning the AI race',
      'AI IPOs this index scored',
      'scored AI stories this index kept',
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
