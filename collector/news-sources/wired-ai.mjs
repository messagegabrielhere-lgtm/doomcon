// WIRED — AI. Added 2026-10-07 to widen the newsroom. Long-form reporting; slower, deeper.
// Not verified from the build box (its network is allowlisted); the collector
// marks a feed that fails as dark rather than failing the run, so a bad URL
// shows up in source health instead of breaking anything.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'wired-ai',
  kind: 'press',
  label: 'WIRED — AI',
  weight: 0.55,
  url: 'https://www.wired.com/feed/tag/ai/latest/rss',
  defaultPillar: 'attention',
  aiFilter: false,
  limit: 20,
});
