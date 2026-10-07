// MIT Technology Review. Added 2026-10-07 to widen the newsroom. Whole-site feed, filtered to AI items.
// Not verified from the build box (its network is allowlisted); the collector
// marks a feed that fails as dark rather than failing the run, so a bad URL
// shows up in source health instead of breaking anything.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'mit-tech-review',
  kind: 'press',
  label: 'MIT Technology Review',
  weight: 0.65,
  url: 'https://www.technologyreview.com/feed/',
  defaultPillar: 'attention',
  aiFilter: true,
  limit: 25,
});
