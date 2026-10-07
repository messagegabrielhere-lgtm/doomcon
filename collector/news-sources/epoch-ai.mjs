// Epoch AI. Added 2026-10-07 to widen the newsroom. Compute and capability trend data.
// Not verified from the build box (its network is allowlisted); the collector
// marks a feed that fails as dark rather than failing the run, so a bad URL
// shows up in source health instead of breaking anything.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'epoch-ai',
  kind: 'press',
  label: 'Epoch AI',
  weight: 0.75,
  url: 'https://epoch.ai/blog/rss.xml',
  defaultPillar: 'attention',
  aiFilter: false,
  limit: 10,
});
