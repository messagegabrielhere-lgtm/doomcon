// Interconnects (newsletter). Added 2026-10-07 to widen the newsroom. Open models and post-training analysis.
// Not verified from the build box (its network is allowlisted); the collector
// marks a feed that fails as dark rather than failing the run, so a bad URL
// shows up in source health instead of breaking anything.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'interconnects',
  kind: 'press',
  label: 'Interconnects (newsletter)',
  weight: 0.65,
  url: 'https://www.interconnects.ai/feed',
  defaultPillar: 'attention',
  aiFilter: false,
  limit: 10,
});
