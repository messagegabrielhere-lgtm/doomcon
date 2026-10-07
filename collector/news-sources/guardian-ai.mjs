// The Guardian — AI. Added 2026-10-07 to widen the newsroom. General-audience coverage; policy and labour angles.
// Not verified from the build box (its network is allowlisted); the collector
// marks a feed that fails as dark rather than failing the run, so a bad URL
// shows up in source health instead of breaking anything.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'guardian-ai',
  kind: 'press',
  label: 'The Guardian — AI',
  weight: 0.6,
  url: 'https://www.theguardian.com/technology/artificialintelligenceai/rss',
  defaultPillar: 'attention',
  aiFilter: false,
  limit: 25,
});
