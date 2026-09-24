// The Verge, AI tag. Verified 2026-09-23: 200, application/xml, Atom.
//
// Weighted lowest of the press sources on purpose: The Verge covers the same
// stories as Ars and Techmeme with the shortest items, so it contributes mostly
// as a corroboration vote rather than as a primary account of anything.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'verge-ai',
  kind: 'press',
  label: 'The Verge — AI',
  weight: 0.55,
  url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml',
  defaultPillar: 'attention',
  aiFilter: false,
  limit: 25,
});
