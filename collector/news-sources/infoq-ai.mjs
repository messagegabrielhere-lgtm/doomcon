// InfoQ — AI, ML & Data Engineering. Added 2026-10-09.
// Engineering conference talks and production AI patterns.
// Verified: HTTP 200, application/xml.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'infoq-ai',
  kind: 'press',
  label: 'InfoQ — AI/ML',
  weight: 0.5,
  url: 'https://feed.infoq.com/ai-ml-data-eng/',
  defaultPillar: 'capability',
  aiFilter: false,
  limit: 20,
});
