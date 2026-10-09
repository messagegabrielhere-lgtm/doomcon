// South China Morning Post — Tech. Added 2026-10-09.
// Asia / China tech war coverage the Anglophone labs do not print first.
// Locally AI-filtered: gadgets and consumer tech share the channel.
// Verified: HTTP 200, text/xml (rss/36).

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'scmp-tech',
  kind: 'press',
  label: 'SCMP — Tech',
  weight: 0.6,
  url: 'https://www.scmp.com/rss/36/feed',
  defaultPillar: 'attention',
  aiFilter: true,
  limit: 30,
});
