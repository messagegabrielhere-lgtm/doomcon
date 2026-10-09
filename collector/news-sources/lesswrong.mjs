// LessWrong. Verified 2026-10-08: HTTP 200, application/rss+xml.
//
// The frontpage mixes AI with everything else the forum argues about, so the
// local AI filter is on and the rejections are counted. It does not turn over
// like a wire, so it keeps a 15-minute interval instead of the forum default.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'lesswrong',
  kind: 'forum',
  label: 'LessWrong',
  weight: 0.5,
  url: 'https://www.lesswrong.com/feed.xml',
  defaultPillar: 'governance',
  aiFilter: true,
  limit: 30,
  minIntervalMs: 900_000,
});
