// Financial Times — Artificial intelligence stream. Added 2026-10-09.
// Capital and geopolitics desk; already AI-scoped by the FT stream.
// Verified: HTTP 200, text/xml RSS with CDATA titles.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'ft-ai',
  kind: 'press',
  label: 'Financial Times — AI',
  weight: 0.65,
  url: 'https://www.ft.com/artificial-intelligence?format=rss',
  defaultPillar: 'markets',
  aiFilter: false,
  limit: 25,
});
