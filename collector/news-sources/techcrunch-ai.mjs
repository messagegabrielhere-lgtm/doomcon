// TechCrunch — AI. Added 2026-10-07 to widen the newsroom. Startup funding and product launches; strong on money moving.
// Not verified from the build box (its network is allowlisted); the collector
// marks a feed that fails as dark rather than failing the run, so a bad URL
// shows up in source health instead of breaking anything.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'techcrunch-ai',
  kind: 'press',
  label: 'TechCrunch — AI',
  weight: 0.6,
  url: 'https://techcrunch.com/category/artificial-intelligence/feed/',
  defaultPillar: 'attention',
  aiFilter: false,
  limit: 25,
});
