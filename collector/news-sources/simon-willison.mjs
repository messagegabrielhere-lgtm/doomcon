// Simon Willison. Added 2026-10-07 to widen the newsroom. Hands-on testing of new models and tools; filtered to AI.
// Not verified from the build box (its network is allowlisted); the collector
// marks a feed that fails as dark rather than failing the run, so a bad URL
// shows up in source health instead of breaking anything.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'simon-willison',
  kind: 'press',
  label: 'Simon Willison',
  weight: 0.6,
  url: 'https://simonwillison.net/atom/everything/',
  defaultPillar: 'attention',
  aiFilter: true,
  limit: 25,
});
