// VentureBeat — AI. Added 2026-10-07 to widen the newsroom. Enterprise AI and model releases.
// Not verified from the build box (its network is allowlisted); the collector
// marks a feed that fails as dark rather than failing the run, so a bad URL
// shows up in source health instead of breaking anything.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'venturebeat-ai',
  kind: 'press',
  label: 'VentureBeat — AI',
  weight: 0.5,
  url: 'https://venturebeat.com/category/ai/feed/',
  defaultPillar: 'attention',
  aiFilter: false,
  limit: 25,
});
