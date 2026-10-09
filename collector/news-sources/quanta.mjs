// Quanta Magazine. Added 2026-10-09.
// Research explainers; AI pieces arrive beside math and biology.
// Locally AI-filtered. Verified: HTTP 200, application/rss+xml.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'quanta',
  kind: 'press',
  label: 'Quanta Magazine',
  weight: 0.55,
  url: 'https://www.quantamagazine.org/feed/',
  defaultPillar: 'capability',
  aiFilter: true,
  limit: 20,
  minIntervalMs: 900_000,
});
