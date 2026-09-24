// Ars Technica's AI section feed. Verified 2026-09-23: 200, application/rss+xml.
//
// Section feed, not the site feed: /ai/feed/ is already AI-scoped upstream, so
// no local filter is applied and none is needed. The generic
// feeds.arstechnica.com/arstechnica/technology-lab feed also resolves, but it
// is a general technology feed and would need filtering.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'arstechnica-ai',
  kind: 'press',
  label: 'Ars Technica AI',
  weight: 0.6,
  url: 'https://arstechnica.com/ai/feed/',
  defaultPillar: 'attention',
  aiFilter: false,
  limit: 25,
});
