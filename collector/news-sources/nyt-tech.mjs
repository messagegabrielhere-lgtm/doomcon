// The New York Times — Technology. Added 2026-10-07 to widen the newsroom. Paper of record; filtered to AI items.
// Not verified from the build box (its network is allowlisted); the collector
// marks a feed that fails as dark rather than failing the run, so a bad URL
// shows up in source health instead of breaking anything.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'nyt-tech',
  kind: 'press',
  label: 'The New York Times — Technology',
  weight: 0.7,
  url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml',
  defaultPillar: 'attention',
  aiFilter: true,
  limit: 30,
});
