// AWS Machine Learning Blog. Added 2026-10-07 to widen the newsroom. Cloud platform launches; mostly corroboration.
// Not verified from the build box (its network is allowlisted); the collector
// marks a feed that fails as dark rather than failing the run, so a bad URL
// shows up in source health instead of breaking anything.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'aws-ml',
  kind: 'lab',
  label: 'AWS Machine Learning Blog',
  weight: 0.5,
  url: 'https://aws.amazon.com/blogs/machine-learning/feed/',
  defaultPillar: 'attention',
  aiFilter: false,
  limit: 20,
});
