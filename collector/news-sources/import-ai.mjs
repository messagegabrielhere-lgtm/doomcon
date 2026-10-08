// Import AI, Jack Clark. Verified 2026-10-08: HTTP 200, application/xml.
//
// A weekly primary digest of papers, policy and lab moves. Weight sits with
// the other primary writers, below the lab newsrooms themselves. Asked every
// 15 minutes: the issue does not move faster than that.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'import-ai',
  kind: 'press',
  label: 'Import AI',
  weight: 0.7,
  url: 'https://importai.substack.com/feed',
  defaultPillar: 'capability',
  aiFilter: false,
  limit: 15,
  minIntervalMs: 900_000,
});
