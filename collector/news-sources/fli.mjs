// Future of Life Institute. Added 2026-10-09.
// Treaty / pause / catastrophic-risk statements from a named advocacy desk.
// Verified: HTTP 200, application/rss+xml.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'fli',
  kind: 'press',
  label: 'Future of Life Institute',
  weight: 0.6,
  url: 'https://futureoflife.org/feed/',
  defaultPillar: 'governance',
  aiFilter: false,
  limit: 20,
  minIntervalMs: 900_000,
});
