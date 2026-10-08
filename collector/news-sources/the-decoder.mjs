// The Decoder. Verified 2026-10-08: HTTP 200, application/rss+xml.
//
// An English-language AI newsroom that often carries European regulation and
// open-weight launches before the US wires do. The whole feed is AI, so it is
// not filtered again. Kind `press` is asked every minute.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'the-decoder',
  kind: 'press',
  label: 'The Decoder',
  weight: 0.55,
  url: 'https://the-decoder.com/feed/',
  defaultPillar: 'attention',
  aiFilter: false,
  limit: 25,
});
