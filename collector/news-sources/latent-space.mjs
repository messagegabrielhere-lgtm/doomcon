// Latent Space (newsletter). Added 2026-10-07 to widen the newsroom. Engineer-facing interviews and recaps.
// Not verified from the build box (its network is allowlisted); the collector
// marks a feed that fails as dark rather than failing the run, so a bad URL
// shows up in source health instead of breaking anything.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'latent-space',
  kind: 'press',
  label: 'Latent Space (newsletter)',
  weight: 0.5,
  url: 'https://www.latent.space/feed',
  defaultPillar: 'attention',
  aiFilter: false,
  limit: 10,
});
