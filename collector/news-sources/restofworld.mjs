// Rest of World. Added 2026-10-09.
// Non-US tech and AI deployments — China, Red Sea cables, Global South.
// Locally AI-filtered: the feed covers tech broadly.
// Verified: HTTP 200, application/xml.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'restofworld',
  kind: 'press',
  label: 'Rest of World',
  weight: 0.55,
  url: 'https://restofworld.org/feed/latest/',
  defaultPillar: 'attention',
  aiFilter: true,
  limit: 25,
});
