// Microsoft Cloud / AI blog. Added 2026-10-09.
// Product and sovereign-AI posts from the Windows/Azure parent; overlaps
// microsoft-research but catches launches the research desk skips.
// Locally AI-filtered: the channel mixes general cloud posts.
// Verified: HTTP 200, application/rss+xml.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'microsoft-ai',
  kind: 'lab',
  label: 'Microsoft Cloud Blog (AI)',
  weight: 0.7,
  url: 'https://www.microsoft.com/en-us/ai/blog/feed/',
  defaultPillar: 'capability',
  aiFilter: true,
  limit: 20,
});
