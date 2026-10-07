// 404 Media. Added 2026-10-07 to widen the newsroom. Independent investigations; surveillance and AI misuse.
// Not verified from the build box (its network is allowlisted); the collector
// marks a feed that fails as dark rather than failing the run, so a bad URL
// shows up in source health instead of breaking anything.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: '404media',
  kind: 'press',
  label: '404 Media',
  weight: 0.5,
  url: 'https://www.404media.co/rss/',
  defaultPillar: 'attention',
  aiFilter: true,
  limit: 20,
});
