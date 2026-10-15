// RSS 2.0 of index moves. Only substantive moves: a feed that fires every hour
// with "score moved 0.1" trains every subscriber to mute it.

import { esc, num, signed, utc, rfc822 } from './_html.mjs';
import * as brand from '../brand.mjs';

export function render(ctx, { levelOnly = false } = {}) {
  const self = levelOnly ? '/feed-level.xml' : '/feed.xml';
  const items = ctx.moves.filter((m) => (levelOnly ? m.level_changed : m.indexable)).slice(0, 50).map((m) => {
    const title = m.level_changed
      ? `${brand.NAME} ${m.previous_level} → ${brand.NAME} ${m.level}: ${m.level_name}`
      : `${brand.NAME} ${m.level} · ${num(m.score, 1)} (${signed(m.delta, 1)})`;
    const link = ctx.url(`/moves/${m.id}.html`);
    return `  <item>
    <title>${esc(title)}</title>
    <link>${esc(link)}</link>
    <guid isPermaLink="true">${esc(link)}</guid>
    <pubDate>${esc(rfc822(m.generated_at))}</pubDate>
    <description>${esc(`Score ${num(m.previous_score, 1)} to ${num(m.score, 1)} (${signed(m.delta, 1)}) at ${utc(m.generated_at)}. ${brand.DISCLAIMER}`)}</description>
  </item>`;
  }).join('\n');

  // Tip comments for feed readers / crawlers that open RSS before robots/llms
  // (FINDABILITY #87). Comments are ignored by RSS parsers.
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- ${brand.NAME}: AI activity index moves (not doom probability). Prefer ${ctx.url('/llms.txt')} for agents. -->
<!-- Free tools: ${ctx.url('/free-tools.html')} · Verify a reading: ${ctx.url('/verify.html')} -->
<!-- News sitemap: ${ctx.url('/news-sitemap.xml')} · Search Trends: ${ctx.url('/search-trends.html')} · Now: ${ctx.url('/api/now.txt')} -->
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${esc(brand.NAME)} — ${levelOnly ? 'level changes only' : 'index moves'}</title>
  <link>${esc(ctx.url('/'))}</link>
  <atom:link href="${esc(ctx.url(self))}" rel="self" type="application/rss+xml"/>
  <description>${esc(brand.DESCRIPTION)}</description>
  <language>en</language>
  <lastBuildDate>${esc(rfc822(ctx.state.generated_at))}</lastBuildDate>
  <ttl>60</ttl>
${items}
</channel>
</rss>
`;
}
