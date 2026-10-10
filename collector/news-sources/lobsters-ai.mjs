// Lobsters — AI tag. Added 2026-10-09.
// Practitioner forum; lower volume and higher SNR than most Reddit feeds.
// Verified: HTTP 200, application/rss+xml.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'lobsters-ai',
  kind: 'forum',
  label: 'Lobsters — AI',
  weight: 0.45,
  url: 'https://lobste.rs/t/ai.rss',
  defaultPillar: 'attention',
  aiFilter: false,
  limit: 25,
});
