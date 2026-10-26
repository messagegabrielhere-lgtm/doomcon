import { slugFor, archiveSitemapEntries } from './itemPage.mjs';
import { sitemapEntries as facetEntries } from './facetPages.mjs';
import { sitemapEntries as countryEntries } from './countryPages.mjs';
import { sitemapEntries as modelEntries } from './modelPages.mjs';
import { sitemapEntries as compareEntries } from './comparePages.mjs';
import { sitemapEntries as peopleEntries } from './peoplePages.mjs';
import { sitemapEntries as dayEntries } from './dayPages.mjs';
import { sitemapEntries as tagEntries } from './tagPages.mjs';
import { sitemapEntries as kindEntries } from './kindPages.mjs';
import { sitemapEntries as outletEntries } from './outletPages.mjs';
// sitemap.xml. Head pages always; move pages only when substantive, matching
// the noindex decision in move.mjs exactly. Submitting thin pages you have
// already told Google not to index is a way of looking like you do not know
// what your own site contains.

import { esc } from './_html.mjs';
import * as brand from '../brand.mjs';

export function render(ctx) {
  const entries = [
    { loc: '/', changefreq: 'hourly', priority: '1.0', lastmod: ctx.state.generated_at },
    { loc: '/methodology.html', changefreq: 'monthly', priority: '0.8', lastmod: ctx.state.generated_at },
    { loc: '/methodology.md', changefreq: 'monthly', priority: '0.4', lastmod: ctx.state.generated_at },
    { loc: '/history.html', changefreq: 'monthly', priority: '0.8', lastmod: ctx.state.generated_at },
    ...(ctx.ledger ? [
      { loc: '/jobs.html', changefreq: 'daily', priority: '0.9', lastmod: ctx.state.generated_at },
      { loc: '/medicine.html', changefreq: 'daily', priority: '0.9', lastmod: ctx.state.generated_at },
    ] : []),
    { loc: '/instruments.html', changefreq: 'hourly', priority: '0.8', lastmod: ctx.state.generated_at },
    // FINDABILITY #318 — full instrument panel (own canonical; not a home alias).
    { loc: '/classic.html', changefreq: 'hourly', priority: '0.8', lastmod: ctx.state.generated_at },
    { loc: '/p-doom.html', changefreq: 'weekly', priority: '0.8', lastmod: ctx.state.generated_at },
    { loc: '/ai-doomsday-clock.html', changefreq: 'weekly', priority: '0.8', lastmod: ctx.state.generated_at },
    { loc: '/guide.html', changefreq: 'weekly', priority: '0.8', lastmod: ctx.state.generated_at },
    { loc: '/guide.md', changefreq: 'weekly', priority: '0.4', lastmod: ctx.state.generated_at },
    { loc: '/guides.html', changefreq: 'weekly', priority: '0.9', lastmod: ctx.state.generated_at },
    { loc: '/guides.md', changefreq: 'weekly', priority: '0.4', lastmod: ctx.state.generated_at },
    ...compareEntries(ctx),
    { loc: '/library.html', changefreq: 'monthly', priority: '0.7', lastmod: ctx.state.generated_at },
    { loc: '/sponsor.html', changefreq: 'monthly', priority: '0.5', lastmod: ctx.state.generated_at },
    { loc: '/brand.html', changefreq: 'monthly', priority: '0.5', lastmod: ctx.state.generated_at },
    { loc: '/press.html', changefreq: 'weekly', priority: '0.6', lastmod: ctx.state.generated_at },
    { loc: '/about.html', changefreq: 'monthly', priority: '0.5', lastmod: ctx.state.generated_at },
    { loc: '/privacy.html', changefreq: 'monthly', priority: '0.3', lastmod: ctx.state.generated_at },
    { loc: '/terms.html', changefreq: 'monthly', priority: '0.3', lastmod: ctx.state.generated_at },
    { loc: '/disclosures.html', changefreq: 'monthly', priority: '0.3', lastmod: ctx.state.generated_at },
    { loc: '/bets.html', changefreq: 'daily', priority: '0.8', lastmod: ctx.state.generated_at },
    { loc: '/desk.html', changefreq: 'hourly', priority: '0.7', lastmod: ctx.state.generated_at },
    { loc: '/game.html', changefreq: 'monthly', priority: '0.6', lastmod: ctx.state.generated_at },
    { loc: '/bunker-kit.html', changefreq: 'monthly', priority: '0.7', lastmod: ctx.state.generated_at },
    // Machine surfaces. Directory scrapers and citation tools look here.
    { loc: '/openapi.json', changefreq: 'weekly', priority: '0.4', lastmod: ctx.state.generated_at },
    { loc: '/api/index.json', changefreq: 'hourly', priority: '0.4', lastmod: ctx.state.generated_at },
    { loc: '/api/state.json', changefreq: 'hourly', priority: '0.5', lastmod: ctx.state.generated_at },
    { loc: '/api/receipts/', changefreq: 'hourly', priority: '0.4', lastmod: ctx.state.generated_at },
    { loc: '/now.md', changefreq: 'hourly', priority: '0.5', lastmod: ctx.state.generated_at },
    { loc: '/api/now.txt', changefreq: 'hourly', priority: '0.4', lastmod: ctx.state.generated_at },
    { loc: '/llms.txt', changefreq: 'weekly', priority: '0.4', lastmod: ctx.state.generated_at },
    { loc: '/llms-full.txt', changefreq: 'hourly', priority: '0.4', lastmod: ctx.state.generated_at },
    { loc: '/agents.md', changefreq: 'weekly', priority: '0.5', lastmod: ctx.state.generated_at },
    // FINDABILITY #489 — uppercase path coding agents request (same body).
    { loc: '/AGENTS.md', changefreq: 'weekly', priority: '0.5', lastmod: ctx.state.generated_at },
    { loc: '/agents.txt', changefreq: 'weekly', priority: '0.5', lastmod: ctx.state.generated_at },
    { loc: '/agents.json', changefreq: 'weekly', priority: '0.4', lastmod: ctx.state.generated_at },
    { loc: '/ai.txt', changefreq: 'weekly', priority: '0.4', lastmod: ctx.state.generated_at },
    { loc: '/skill.md', changefreq: 'weekly', priority: '0.4', lastmod: ctx.state.generated_at },
    { loc: '/promote.md', changefreq: 'hourly', priority: '0.5', lastmod: ctx.state.generated_at },
    { loc: '/api/promote.json', changefreq: 'hourly', priority: '0.4', lastmod: ctx.state.generated_at },
    { loc: '/skills/siren-ai-index/SKILL.md', changefreq: 'weekly', priority: '0.4', lastmod: ctx.state.generated_at },
    { loc: '/.well-known/api-catalog', changefreq: 'weekly', priority: '0.4', lastmod: ctx.state.generated_at },
    { loc: '/.well-known/agent-skills/index.json', changefreq: 'weekly', priority: '0.3', lastmod: ctx.state.generated_at },
    { loc: '/.well-known/mcp/server-card.json', changefreq: 'weekly', priority: '0.3', lastmod: ctx.state.generated_at },
    ...['/midterms.html', '/nations.html', '/labs.html', '/bench.html', '/games.html', '/radio.html', '/charts.html', '/power.html', '/compute.html', '/leaders.html', '/elon.html', '/threats.html', '/self-aware.html', '/status.html', '/waffle.html', '/day-after.html', '/videos.html', '/live.html', '/si-ready.html', '/ai-proof-job.html', '/for-people.html', '/breakthroughs.html', '/live-x.html', '/tally.html', '/staff.html', '/careers.html', '/agents.html', '/bug-out-land.html', '/prepper-checklist.html', '/survival-llm.html', '/feedback.html', '/verify.html', '/free-tools.html', '/evidence.html', '/alerts.html', '/export.html', '/bias.html', '/reference-plan.html', '/changelog.html', '/moltbook.html', '/evolution.html', '/si-watch.html', '/search-trends.html', '/ai-prediction-markets.html', '/contain.html', '/monitor.html', '/scanner.html', '/dispatch.html', '/arena.html', '/catalog.html', '/search.html']
      .filter((loc, i, a) => a.indexOf(loc) === i).map((loc) => ({ loc, changefreq: loc === '/changelog.html' ? 'hourly' : 'weekly', priority: '0.7', lastmod: ctx.state.generated_at })),
    ...(ctx.news && Array.isArray(ctx.news.items) && ctx.news.items.length
      ? [{ loc: '/news.html', changefreq: 'hourly', priority: '0.9', lastmod: ctx.news.generated_at }]
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
    ...((ctx.mood || ctx.boards || ctx.codingAgents)
      ? [{ loc: '/today.html', changefreq: 'hourly', priority: '0.9',
        lastmod: ctx.mood?.generated_at || ctx.boards?.generated_at || ctx.codingAgents?.generated_at || ctx.state.generated_at }]
      : []),
    ...(ctx.mood && ctx.mood.generated_at
      ? [{ loc: '/mood.html', changefreq: 'hourly', priority: '0.85', lastmod: ctx.mood.generated_at }]
      : []),
    ...(ctx.boards && ctx.boards.generated_at
      ? [{ loc: '/boards.html', changefreq: 'daily', priority: '0.85', lastmod: ctx.boards.generated_at }]
      : []),
    ...(ctx.codingAgents && ctx.codingAgents.generated_at
      ? [
        { loc: '/coding-agents.html', changefreq: 'daily', priority: '0.85', lastmod: ctx.codingAgents.generated_at },
        { loc: '/mcp-hub.html', changefreq: 'daily', priority: '0.8', lastmod: ctx.codingAgents.generated_at },
        ...((ctx.codingAgents.agents || []).map((a) => ({
          loc: `/coding-agents/${a.id}.html`, changefreq: 'daily', priority: '0.6', lastmod: ctx.codingAgents.generated_at,
        }))),
        ...((ctx.codingAgents.mcp || []).map((a) => ({
          loc: `/mcp-hub/${a.id}.html`, changefreq: 'daily', priority: '0.55', lastmod: ctx.codingAgents.generated_at,
        }))),
      ]
      : []),
    ...(ctx.bliss && ctx.bliss.generated_at
      ? [{ loc: '/bliss.html', changefreq: 'hourly', priority: '0.8', lastmod: ctx.bliss.generated_at }]
      : []),
    // /nothing. Skeptic's counter (SUB-INDICES §4). Always built when state
    // exists; lastmod is the observation stamp, not a separate collect file.
    ...(ctx.state && ctx.state.generated_at
      ? [{ loc: '/nothing.html', changefreq: 'daily', priority: '0.8', lastmod: ctx.state.generated_at }]
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

  // Faceted pillar + lab landings (only when substance clears the noindex gate).
  entries.push(...facetEntries(ctx));
  entries.push(...countryEntries(ctx));
  entries.push(...modelEntries(ctx));
  entries.push(...peopleEntries(ctx));
  entries.push(...dayEntries(ctx));
  entries.push(...tagEntries(ctx));
  entries.push(...kindEntries(ctx));
  entries.push(...outletEntries(ctx));

  // Every scored item is an indexable page. Live window + durable archive
  // (data/item-archive.json) so the long tail grows instead of churning off
  // when the mobile newsroom cap binds (FINDABILITY.md / COMPETITIVE-SEO.md).
  if (ctx.news && Array.isArray(ctx.news.items)) {
    entries.push({ loc: '/item/', changefreq: 'hourly', priority: '0.7', lastmod: ctx.news.generated_at });
    const seen = new Set();
    for (const it of ctx.news.items) {
      if (!it || !it.id) continue;
      seen.add(it.id);
      entries.push({
        loc: `/item/${slugFor(it)}.html`,
        changefreq: 'weekly',
        priority: '0.6',
        lastmod: it.published_at,
      });
    }
    const archived = Array.isArray(ctx.itemArchive) ? ctx.itemArchive : [];
    for (const it of archived) {
      if (!it || !it.id || seen.has(it.id)) continue;
      seen.add(it.id);
      entries.push({
        loc: `/item/${slugFor(it)}.html`,
        changefreq: 'monthly',
        priority: '0.5',
        lastmod: it.published_at || (ctx.itemArchiveMeta && ctx.itemArchiveMeta.updated_at) || ctx.news.generated_at,
      });
    }
    entries.push(...archiveSitemapEntries(ctx));
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

  // XML comments after the declaration — crawlers that open sitemap.xml before
  // robots.txt still see the Outrank free-tool + news + trends tips
  // (FINDABILITY #84). Comments are ignored by sitemap parsers.
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- ${brand.NAME}: AI activity index (not doom probability). Prefer ${ctx.url('/llms.txt')} for agents. -->
<!-- Free tools: ${ctx.url('/free-tools.html')} · Verify a reading: ${ctx.url('/verify.html')} -->
<!-- Google News sitemap: ${ctx.url('/news-sitemap.xml')} · Search Trends: ${ctx.url('/search-trends.html')} -->
<!-- Classic instrument panel: ${ctx.url('/classic.html')} -->
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
//
// AI crawlers and assistants are welcome by name. A named group replaces the
// * group for that agent, so each one is given Allow: / explicitly rather than
// left to infer it.
// Named so ChatGPT search (OAI-SearchBot), Grok/xAI retrieval, and other
// answer engines do not inherit a future restrictive * group by accident.
// GrokBot / xAI-SearchBot / xAI-Bot are reported registry tokens (xAI has not
// published an official crawler page); Allow is intentional for citations.
export const AI_AGENTS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
  'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'anthropic-ai',
  'PerplexityBot', 'Perplexity-User',
  'GrokBot', 'xAI-SearchBot', 'xAI-Bot',
  'Google-Extended', 'GoogleOther', 'Applebot-Extended', 'Amazonbot', 'CCBot',
  'meta-externalagent', 'DuckAssistBot', 'cohere-ai', 'MistralAI-User',
  'AI2Bot', 'YouBot', 'Bytespider',
];

export function robots(ctx) {
  return `# AI crawlers and assistants welcome (ChatGPT, Grok, Claude, Perplexity, …).
# Start with ${ctx.url('/llms.txt')} · short agent entry ${ctx.url('/agents.md')}
# How to use (no key): GET ${ctx.url('/api/now.txt')} · how to cite ${ctx.url('/skill.md')}
# AGENTS.md convention (same body as agents.md): ${ctx.url('/AGENTS.md')}
# Capability announcement: ${ctx.url('/agents.txt')} · API catalog ${ctx.url('/.well-known/api-catalog')}
# Live reading: ${ctx.url('/api/now.txt')} · markdown ${ctx.url('/now.md')}
# Free tools: ${ctx.url('/free-tools.html')} · Verify a reading: ${ctx.url('/verify.html')}
# Search Trends (watched, not scored): ${ctx.url('/search-trends.html')} · ${ctx.url('/api/search-trends.json')}
# Classic instrument panel: ${ctx.url('/classic.html')}

User-agent: *
Allow: /

${AI_AGENTS.map((a) => `User-agent: ${a}\nAllow: /`).join('\n\n')}

Sitemap: ${ctx.url('/sitemap.xml')}
Sitemap: ${ctx.url('/news-sitemap.xml')}
`;
}
