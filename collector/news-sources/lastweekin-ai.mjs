// Last Week in AI. Added 2026-10-09.
// Weekly digest — good corroboration votes, not a first-sighting wire.
// Verified: HTTP 200, application/xml.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'lastweekin-ai',
  kind: 'press',
  label: 'Last Week in AI',
  weight: 0.5,
  url: 'https://lastweekin.ai/feed',
  defaultPillar: 'attention',
  aiFilter: false,
  limit: 10,
  minIntervalMs: 900_000,
});
