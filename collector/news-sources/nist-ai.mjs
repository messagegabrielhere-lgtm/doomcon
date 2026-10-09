// NIST news RSS, locally AI-filtered. Added 2026-10-09.
// AI RMF, evaluations and US standards notices that move governance.
// Verified: HTTP 200, application/rss+xml.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'nist-ai',
  kind: 'press',
  label: 'NIST news (AI)',
  weight: 0.6,
  url: 'https://www.nist.gov/news-events/news/rss.xml',
  defaultPillar: 'governance',
  aiFilter: true,
  limit: 25,
});
