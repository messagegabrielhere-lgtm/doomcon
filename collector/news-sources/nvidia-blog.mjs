// NVIDIA Blog. Added 2026-10-07 to widen the newsroom. The compute supplier; filtered to AI items.
// Not verified from the build box (its network is allowlisted); the collector
// marks a feed that fails as dark rather than failing the run, so a bad URL
// shows up in source health instead of breaking anything.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'nvidia-blog',
  kind: 'lab',
  label: 'NVIDIA Blog',
  weight: 0.75,
  url: 'https://blogs.nvidia.com/feed/',
  defaultPillar: 'attention',
  aiFilter: true,
  limit: 20,
});
