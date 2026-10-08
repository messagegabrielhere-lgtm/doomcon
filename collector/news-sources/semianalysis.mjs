// SemiAnalysis. Verified 2026-10-08: HTTP 200, application/rss+xml.
//
// Cluster, chip and datacentre reporting. Some posts are paywalled past the
// headline; the headline and the RSS summary are still a public, dated fact
// about compute. Asked every 15 minutes.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'semianalysis',
  kind: 'press',
  label: 'SemiAnalysis',
  weight: 0.7,
  url: 'https://semianalysis.com/feed/',
  defaultPillar: 'compute',
  aiFilter: false,
  limit: 15,
  minIntervalMs: 900_000,
});
