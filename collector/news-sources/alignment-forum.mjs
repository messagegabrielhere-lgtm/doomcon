// AI Alignment Forum. Added 2026-10-07 to widen the newsroom. Safety research community; governance and risk signals.
// Not verified from the build box (its network is allowlisted); the collector
// marks a feed that fails as dark rather than failing the run, so a bad URL
// shows up in source health instead of breaking anything.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'alignment-forum',
  kind: 'forum',
  label: 'AI Alignment Forum',
  weight: 0.6,
  url: 'https://www.alignmentforum.org/feed.xml',
  defaultPillar: 'attention',
  aiFilter: false,
  limit: 15,
});
