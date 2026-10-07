// Google Research Blog. Added 2026-10-07 to widen the newsroom. Research papers and systems from Google Research.
// Not verified from the build box (its network is allowlisted); the collector
// marks a feed that fails as dark rather than failing the run, so a bad URL
// shows up in source health instead of breaking anything.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'google-research',
  kind: 'lab',
  label: 'Google Research Blog',
  weight: 0.85,
  url: 'https://research.google/blog/rss/',
  defaultPillar: 'attention',
  aiFilter: false,
  limit: 20,
});
