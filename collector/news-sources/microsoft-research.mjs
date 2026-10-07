// Microsoft Research Blog. Added 2026-10-07 to widen the newsroom. Research announcements; filtered to AI items.
// Not verified from the build box (its network is allowlisted); the collector
// marks a feed that fails as dark rather than failing the run, so a bad URL
// shows up in source health instead of breaking anything.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'microsoft-research',
  kind: 'lab',
  label: 'Microsoft Research Blog',
  weight: 0.8,
  url: 'https://www.microsoft.com/en-us/research/feed/',
  defaultPillar: 'attention',
  aiFilter: true,
  limit: 20,
});
