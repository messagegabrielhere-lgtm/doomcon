// Georgetown CSET. Added 2026-10-09.
// Security and emerging-technology policy desk — chips, China, propaganda.
// Fills the governance gap that lab blogs rarely cover.
// Verified: HTTP 200, application/rss+xml.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'cset',
  kind: 'press',
  label: 'Georgetown CSET',
  weight: 0.65,
  url: 'https://cset.georgetown.edu/feed/',
  defaultPillar: 'governance',
  aiFilter: false,
  limit: 20,
  minIntervalMs: 900_000,
});
