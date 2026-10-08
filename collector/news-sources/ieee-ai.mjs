// IEEE Spectrum, artificial-intelligence topic.
// Verified 2026-10-08: HTTP 200, application/rss+xml.
//
// The topic feed is already scoped, so it is not filtered again. Engineering
// press, slower than the wires, asked every 15 minutes.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'ieee-ai',
  kind: 'press',
  label: 'IEEE Spectrum — AI',
  weight: 0.55,
  url: 'https://spectrum.ieee.org/feeds/topic/artificial-intelligence.rss',
  defaultPillar: 'capability',
  aiFilter: false,
  limit: 20,
  minIntervalMs: 900_000,
});
