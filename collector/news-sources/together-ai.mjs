// Together AI blog. Added 2026-10-09.
// Open-weight inference lab — capacity, harnesses, training notes.
// Verified: HTTP 200, application/rss+xml.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'together-ai',
  kind: 'lab',
  label: 'Together AI',
  weight: 0.55,
  url: 'https://www.together.ai/blog/rss.xml',
  defaultPillar: 'compute',
  aiFilter: false,
  limit: 15,
});
