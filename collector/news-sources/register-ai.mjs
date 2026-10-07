// The Register — AI/ML. Added 2026-10-07 to widen the newsroom. Skeptical trade press; good on outages and security.
// Not verified from the build box (its network is allowlisted); the collector
// marks a feed that fails as dark rather than failing the run, so a bad URL
// shows up in source health instead of breaking anything.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'register-ai',
  kind: 'press',
  label: 'The Register — AI/ML',
  weight: 0.45,
  url: 'https://www.theregister.com/software/ai_ml/headlines.atom',
  defaultPillar: 'attention',
  aiFilter: false,
  limit: 25,
});
