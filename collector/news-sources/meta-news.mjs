// Meta newsroom. Verified 2026-10-08: HTTP 200, application/rss+xml.
//
// ai.meta.com publishes no RSS (the usual paths 404). The company newsroom
// does, and it mixes product, policy and everything else Meta ships, so the
// local AI filter is on. Llama and Meta AI posts survive; a VR headset note
// does not. Asked every five minutes, fast enough for a launch.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'meta-news',
  kind: 'press',
  label: 'Meta newsroom',
  weight: 0.6,
  url: 'https://about.fb.com/news/feed/',
  defaultPillar: 'capability',
  aiFilter: true,
  limit: 30,
  minIntervalMs: 300_000,
});
