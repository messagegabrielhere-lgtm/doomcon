import { slugFor } from './itemPage.mjs';
import { pillarsToWrite, labsToWrite } from './facetPages.mjs';
// sitemap.xml. Head pages always; move pages only when substantive, matching
// the noindex decision in move.mjs exactly. Submitting thin pages you have
// already told Google not to index is a way of looking like you do not know
// what your own site contains.

import { esc } from './_html.mjs';

export function render(ctx) {
  const facetStamp = (ctx.news && ctx.news.generated_at) || ctx.state.generated_at;
  const entries = [
    { loc: '/', changefreq: 'hourly', priority: '1.0', lastmod: ctx.state.generated_at },
    { loc: '/methodology.html', changefreq: 'monthly', priority: '0.8', lastmod: ctx.state.generated_at },
    { loc: '/history.html', changefreq: 'monthly', priority: '0.8', lastmod: ctx.state.generated_at },
    ...(ctx.ledger ? [
      { loc: '/jobs.html', changefreq: 'daily', priority: '0.9', lastmod: ctx.state.generated_at },
      { loc: '/medicine.html', changefreq: 'daily', priority: '0.9', lastmod: ctx.state.generated_at },
    ] : []),
    { loc: '/instruments.html', changefreq: 'hourly', priority: '0.8', lastmod: ctx.state.generated_at },
    { loc: '/p-doom.html', changefreq: 'weekly', priority: '0.8', lastmod: ctx.state.generated_at },
    { loc: '/ai-doomsday-clock.html', changefreq: 'weekly', priority: '0.8', lastmod: ctx.state.generated_at },
    { loc: '/guide.html', changefreq: 'weekly', priority: '0.8', lastmod: ctx.state.generated_at },
    { loc: '/library.html', changefreq: 'monthly', priority: '0.7', lastmod: ctx.state.generated_at },
    { loc: '/sponsor.html', changefreq: 'monthly', priority: '0.5', lastmod: ctx.state.generated_at },
    { loc: '/brand.html', changefreq: 'monthly', priority: '0.5', lastmod: ctx.state.generated_at },
    { loc: '/press.html', changefreq: 'weekly', priority: '0.6', lastmod: ctx.state.generated_at },
    { loc: '/about.html', changefreq: 'monthly', priority: '0.5', lastmod: ctx.state.generated_at },
    { loc: '/privacy.html', changefreq: 'monthly', priority: '0.3', lastmod: ctx.state.generated_at },
    { loc: '/terms.html', changefreq: 'monthly', priority: '0.3', lastmod: ctx.state.generated_at },
    { loc: '/bets.html', changefreq: 'daily', priority: '0.8', lastmod: ctx.state.generated_at },
    { loc: '/desk.html', changefreq: 'hourly', priority: '0.7', lastmod: ctx.state.generated_at },
    { loc: '/game.html', changefreq: 'monthly', priority: '0.6', lastmod: ctx.state.generated_at },
    { loc: '/bunker-kit.html', changefreq: 'monthly', priority: '0.7', lastmod: ctx.state.generated_at },
    // Machine surfaces. Directory scrapers and citation tools look here; the
    // human docs already link them from /instruments, but sitemap omission
    // left the only CORS-enabled API in the category invisible to crawlers.
    { loc: '/openapi.json', changefreq: 'weekly', priority: '0.4', lastmod: ctx.state.generated_at },
    { loc: '/api/index.json', changefreq: 'hourly', priority: '0.4', lastmod: ctx.state.generated_at },
    { loc: '/api/state.json', changefreq: 'hourly', priority: '0.5', lastmod: ctx.state.generated_at },
    { loc: '/api/receipts/', changefreq: 'hourly', priority: '0.4', lastmod: ctx.state.generated_at },
    ...(ctx.news && Array.isArray(ctx.news.items) && ctx.news.items.length
      ? [
        { loc: '/news.html', changefreq: 'hourly', priority: '0.9', lastmod: ctx.news.generated_at },
        { loc: '/facets.html', changefreq: 'hourly', priority: '0.7', lastmod: facetStamp },
      ]
      : []),
    ...(ctx.race && Array.isArray(ctx.race.players) && ctx.race.players.length
      ? [{ loc: '/race.html', changefreq: 'daily', priority: '0.9', lastmod: ctx.race.generated_at }]
      : []),
    ...(ctx.infra && ctx.infra.generated_at
      ? [{ loc: '/watts.html', changefreq: 'hourly', priority: '0.8', lastmod: ctx.infra.generated_at }]
      : []),
    ...(ctx.digest && ctx.digest.generated_at
      ? [{ loc: '/digest.html', changefreq: 'daily', priority: '0.9', lastmod: ctx.digest.generated_at }]
      : []),
    ...(ctx.bliss && ctx.bliss.generated_at
      ? [{ loc: '/bliss.html', changefreq: 'hourly', priority: '0.8', lastmod: ctx.bliss.generated_at }]
      : []),
    // /balance. Gated on ctx.routes.balance, the same flag build.mjs uses to
    // decide whether to write the file, so this entry cannot name a URL the
    // build did not produce. daily, not hourly, although the newsroom counts
    // move with every window: the six counters are 30-day or cumulative counts
    // that docs/BALANCE.md §10 finds "daily is enough" for, and the registers
    // change only when a row is re-verified by hand. lastmod is the file's own
    // generated_at, the newest of its inputs' stamps, never the build clock.
    ...(ctx.routes && ctx.routes.balance && ctx.balance && ctx.balance.generated_at
      ? [{ loc: '/balance.html', changefreq: 'daily', priority: '0.8', lastmod: ctx.balance.generated_at }]
      : []),
    ...(ctx.datacenters && ctx.datacenters.generated_at
      ? [{ loc: '/map.html', changefreq: 'daily', priority: '0.9', lastmod: ctx.datacenters.generated_at }]
      : []),
    // /world. Gated on ctx.routes.world, the same flag build.mjs uses to decide
    // whether to write the file, so this entry cannot name a URL the build did
    // not produce. weekly, because the Overpass harvest behind every pin is
    // refreshed on a 7-day cache and the country outlines on a 90-day one;
    // lastmod is still generated_at, the honest stamp of the file served.
    ...(ctx.routes && ctx.routes.world && ctx.world && ctx.world.generated_at
      ? [{ loc: '/world.html', changefreq: 'weekly', priority: '0.8', lastmod: ctx.world.generated_at }]
      : []),
    // /flock. Gated on ctx.routes.flock, which build.mjs sets from the same
    // predicate it uses to decide whether to write the file — so this entry
    // cannot name a URL the build did not produce. weekly, because the
    // Overpass harvest behind it runs on a 7-day refresh and takes 27 minutes;
    // claiming daily would be asking crawlers to revisit an unchanged page.
    ...(ctx.routes && ctx.routes.flock && ctx.flock && ctx.flock.generated_at
      ? [{ loc: '/flock.html', changefreq: 'weekly', priority: '0.8', lastmod: ctx.flock.generated_at }]
      : []),
    // /exploits. Gated on ctx.routes.exploits, the same flag build.mjs uses to
    // decide whether to write the file, so this entry cannot name a URL the
    // build did not produce. daily, because CISA adds entries on most working
    // days and the two-request collector picks them up on the same cadence as
    // everything else here.
    ...(ctx.routes && ctx.routes.exploits && ctx.exploits && ctx.exploits.generated_at
      ? [{ loc: '/exploits.html', changefreq: 'daily', priority: '0.8', lastmod: ctx.exploits.generated_at }]
      : []),
    { loc: '/moves/', changefreq: 'hourly', priority: '0.6', lastmod: ctx.state.generated_at },
  ];

  for (const p of pillarsToWrite(ctx)) {
    entries.push({ loc: `/pillar/${p.id}.html`, changefreq: 'hourly', priority: '0.7', lastmod: facetStamp });
  }
  for (const lab of labsToWrite(ctx)) {
    entries.push({ loc: `/lab/${lab.id}.html`, changefreq: 'hourly', priority: '0.7', lastmod: facetStamp });
  }

  // Every scored item is an indexable page. This is the long tail — it takes
  // the sitemap from ten URLs to two hundred and ten, and it grows daily.
  if (ctx.news && Array.isArray(ctx.news.items)) {
    entries.push({ loc: '/item/', changefreq: 'hourly', priority: '0.7', lastmod: ctx.news.generated_at });
    for (const it of ctx.news.items) {
      entries.push({
        loc: `/item/${slugFor(it)}.html`,
        changefreq: 'weekly',
        priority: '0.6',
        lastmod: it.published_at,
      });
    }
  }

  for (const m of ctx.moves) {
    if (!m.indexable) continue;
    entries.push({
      loc: `/moves/${m.id}.html`,
      changefreq: 'never',
      priority: m.level_changed ? '0.7' : '0.4',
      lastmod: m.generated_at,
    });
  }

  const body = entries.map((e) => `  <url>
    <loc>${esc(ctx.url(e.loc))}</loc>
    <lastmod>${esc(e.lastmod)}</lastmod>
    <changefreq>${esc(e.changefreq)}</changefreq>
    <priority>${esc(e.priority)}</priority>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

// robots.txt.
//
// pizzint's robots.txt disallows - and therefore publishes - /social-admin,
// /video-export/, /marquee-lab, /internal/, /test-*, a complete list of their
// unshipped features. A Disallow line is an announcement. This file names
// nothing that is not already linked from the site.
export function robots(ctx) {
  return `User-agent: *
Allow: /
Sitemap: ${ctx.url('/sitemap.xml')}
Sitemap: ${ctx.url('/news-sitemap.xml')}
`;
}
