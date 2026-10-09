// Berkeley Artificial Intelligence Research (BAIR) blog. Added 2026-10-09.
// Academic primary source — agent tooling, long-horizon models, systems notes.
// Verified: HTTP 200, application/xml, real RSS body.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'bair',
  kind: 'lab',
  label: 'Berkeley AI Research (BAIR)',
  weight: 0.7,
  url: 'https://bair.berkeley.edu/blog/feed.xml',
  defaultPillar: 'capability',
  aiFilter: false,
  limit: 15,
  minIntervalMs: 900_000,
});
