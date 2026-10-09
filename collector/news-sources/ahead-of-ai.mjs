// Ahead of AI (Sebastian Raschka). Added 2026-10-09.
// Independent research newsletter on architectures and training practice.
// Verified: HTTP 200, application/xml Substack-style feed.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'ahead-of-ai',
  kind: 'press',
  label: 'Ahead of AI',
  weight: 0.6,
  url: 'https://magazine.sebastianraschka.com/feed',
  defaultPillar: 'capability',
  aiFilter: false,
  limit: 12,
  minIntervalMs: 900_000,
});
