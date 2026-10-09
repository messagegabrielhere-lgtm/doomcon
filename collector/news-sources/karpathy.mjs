// Andrej Karpathy blog. Added 2026-10-09.
// Rare personal posts; when they land they move the field.
// Verified: HTTP 200, application/xml.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'karpathy',
  kind: 'lab',
  label: 'Andrej Karpathy',
  weight: 0.7,
  url: 'https://karpathy.github.io/feed.xml',
  defaultPillar: 'capability',
  aiFilter: false,
  limit: 10,
  minIntervalMs: 1_800_000,
});
