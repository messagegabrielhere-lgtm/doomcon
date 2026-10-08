// Apple Machine Learning Research journal.
// Verified 2026-10-08: HTTP 200, text/xml, RSS 2.0.
//
// The journal is the research, not the Apple Intelligence marketing page, so
// every item is on topic and there is no local filter. Kind `lab` is asked
// every five minutes, which is as fast as a journal moves.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'apple-ml',
  kind: 'lab',
  label: 'Apple Machine Learning Research',
  weight: 0.7,
  url: 'https://machinelearning.apple.com/rss.xml',
  defaultPillar: 'capability',
  aiFilter: false,
  limit: 20,
});
