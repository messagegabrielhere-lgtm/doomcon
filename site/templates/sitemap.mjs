// sitemap.xml. Head pages always; move pages only when substantive, matching
// the noindex decision in move.mjs exactly. Submitting thin pages you have
// already told Google not to index is a way of looking like you do not know
// what your own site contains.

import { esc } from './_html.mjs';

export function render(ctx) {
  const entries = [
    { loc: '/', changefreq: 'hourly', priority: '1.0', lastmod: ctx.state.generated_at },
    { loc: '/methodology.html', changefreq: 'monthly', priority: '0.8', lastmod: ctx.state.generated_at },
    { loc: '/history.html', changefreq: 'monthly', priority: '0.8', lastmod: ctx.state.generated_at },
    ...(ctx.news && Array.isArray(ctx.news.items) && ctx.news.items.length
      ? [{ loc: '/news.html', changefreq: 'hourly', priority: '0.9', lastmod: ctx.news.generated_at }]
      : []),
    ...(ctx.race && Array.isArray(ctx.race.players) && ctx.race.players.length
      ? [{ loc: '/race.html', changefreq: 'daily', priority: '0.9', lastmod: ctx.race.generated_at }]
      : []),
    ...(ctx.infra && ctx.infra.generated_at
      ? [{ loc: '/watts.html', changefreq: 'hourly', priority: '0.8', lastmod: ctx.infra.generated_at }]
      : []),
    { loc: '/moves/', changefreq: 'hourly', priority: '0.6', lastmod: ctx.state.generated_at },
  ];

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
`;
}
