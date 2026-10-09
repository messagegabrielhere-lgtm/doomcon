// Bloomberg Technology. Added 2026-10-09.
// Markets-facing wire; locally AI-filtered because the feed is all of tech.
// Verified: HTTP 200, text/xml.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'bloomberg-tech',
  kind: 'press',
  label: 'Bloomberg Technology',
  weight: 0.6,
  url: 'https://feeds.bloomberg.com/technology/news.rss',
  defaultPillar: 'markets',
  aiFilter: true,
  limit: 30,
});
