// MIT News, AI topic. Verified 2026-09-23: 200, application/rss+xml.
//
// Academic-institution press. Low weight because a university news office
// publishes on its own schedule rather than the field's, so these items are
// rarely the first report of anything — but they are a genuinely independent
// corroboration vote, which is worth more to the dedup maths than their weight
// alone suggests.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'mit-news-ai',
  kind: 'press',
  label: 'MIT News — AI',
  weight: 0.45,
  url: 'https://news.mit.edu/rss/topic/artificial-intelligence2',
  defaultPillar: 'capability',
  aiFilter: false,
  limit: 20,
  timeoutMs: 25_000,
});
