// BBC News — Technology. Added 2026-10-07 to widen the newsroom. Mainstream reach; filtered to AI items.
// Not verified from the build box (its network is allowlisted); the collector
// marks a feed that fails as dark rather than failing the run, so a bad URL
// shows up in source health instead of breaking anything.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'bbc-tech',
  kind: 'press',
  label: 'BBC News — Technology',
  weight: 0.6,
  url: 'https://feeds.bbci.co.uk/news/technology/rss.xml',
  defaultPillar: 'attention',
  aiFilter: true,
  limit: 30,
});
