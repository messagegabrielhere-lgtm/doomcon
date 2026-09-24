// RSS 2.0 of index moves. Only substantive moves: a feed that fires every hour
// with "score moved 0.1" trains every subscriber to mute it.

import { esc, num, signed, utc, rfc822 } from './_html.mjs';
import * as brand from '../brand.mjs';

export function render(ctx) {
  const items = ctx.moves.filter((m) => m.indexable).slice(0, 50).map((m) => {
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

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${esc(brand.NAME)} — index moves</title>
  <link>${esc(ctx.url('/'))}</link>
  <atom:link href="${esc(ctx.url('/feed.xml'))}" rel="self" type="application/rss+xml"/>
  <description>${esc(brand.DESCRIPTION)}</description>
  <language>en</language>
  <lastBuildDate>${esc(rfc822(ctx.state.generated_at))}</lastBuildDate>
  <ttl>60</ttl>
${items}
</channel>
</rss>
`;
}
