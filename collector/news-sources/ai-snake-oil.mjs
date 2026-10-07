// AI Snake Oil (newsletter). Added 2026-10-07 to widen the newsroom. Skeptical analysis; a counterweight to launch hype.
// Not verified from the build box (its network is allowlisted); the collector
// marks a feed that fails as dark rather than failing the run, so a bad URL
// shows up in source health instead of breaking anything.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'ai-snake-oil',
  kind: 'press',
  label: 'AI Snake Oil (newsletter)',
  weight: 0.55,
  url: 'https://www.aisnakeoil.com/feed',
  defaultPillar: 'attention',
  aiFilter: false,
  limit: 10,
});
