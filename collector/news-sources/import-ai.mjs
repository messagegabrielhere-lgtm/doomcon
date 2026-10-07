// Import AI (newsletter). Added 2026-10-07 to widen the newsroom. Weekly expert digest; capability and policy.
// Not verified from the build box (its network is allowlisted); the collector
// marks a feed that fails as dark rather than failing the run, so a bad URL
// shows up in source health instead of breaking anything.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'import-ai',
  kind: 'press',
  label: 'Import AI (newsletter)',
  weight: 0.7,
  url: 'https://importai.substack.com/feed',
  defaultPillar: 'attention',
  aiFilter: false,
  limit: 10,
});
