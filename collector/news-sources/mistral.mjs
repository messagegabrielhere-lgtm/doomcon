// Mistral AI blog.
//
// TRAP, measured 2026-09-23. Mistral runs an Astro site that answers HTTP 404
// with a 240KB HTML page — and it does so for every path you would guess:
//   /news/rss.xml   404 HTML
//   /feed.xml       404 HTML
//   /news/feed.rss  404 HTML
//   /news/index.xml 404 HTML
// The feed that exists is /rss.xml, which 302s to /news/rss and serves valid
// RSS 2.0 as `text/plain; charset=UTF-8`.
//
// That is precisely why _feed.mjs sniffs the BODY and treats content-type as
// advisory: a strict `application/rss+xml` check would reject this live feed,
// and a permissive status-only check would have admitted one of the four 404
// HTML pages as a news source that silently parses to zero items.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'mistral',
  kind: 'lab',
  label: 'Mistral AI blog',
  weight: 0.85,
  url: 'https://mistral.ai/rss.xml',
  defaultPillar: 'capability',
  aiFilter: false,
  limit: 25,
  extraMeta: { note: 'served as text/plain; body-sniffed as RSS' },
});
