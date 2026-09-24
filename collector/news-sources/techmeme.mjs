// Techmeme front page — general tech, so it is filtered locally.
//
// Techmeme is the fastest aggregator in tech and is worth carrying, but its
// feed is not AI-scoped: a straight ingest would fill the reel with phone
// launches. Every item is therefore re-tested against the published AI token
// list in _entities.mjs and the rejection count is reported in meta, the same
// discipline docs/METHODOLOGY.md records for the Polymarket basket.
//
// Verified 2026-09-23: 200, text/xml, RSS 2.0.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'techmeme',
  kind: 'press',
  label: 'Techmeme front page (AI-filtered)',
  weight: 0.7,
  url: 'https://www.techmeme.com/feed.xml',
  defaultPillar: 'attention',
  aiFilter: true,
  limit: 40,
});
