// Qwen (Alibaba) blog — Hugo-generated, so the feed is /blog/index.xml.
// Verified 2026-09-23: 200, application/xml, RSS 2.0, parses cleanly.
//
// CURRENTLY DORMANT, and reported as such. Its newest entry is dated
// 2025-09-22 — a year old. The feed is not broken, Qwen simply stopped
// publishing there, and news.mjs has a distinct `dormant` state for exactly
// this so the source is never reported as a healthy zero.
//
// There is no live replacement: qwen.ai answers /rss.xml, /blog/rss.xml and
// /feed.xml with HTTP 200 and 94KB of SPA HTML (measured 2026-09-23), which is
// the trap _feed.mjs's body sniff exists to catch, and
// github.com/QwenLM/Qwen3/releases.atom is a 500-byte empty feed. The adapter
// stays because the feed is real and may wake up; when it does, it is already
// wired. Shipping a guessed path that 200s with an SPA shell would have looked
// identical in a status check and produced silence forever.
//
// Included deliberately for coverage reasons that docs/METHODOLOGY.md already
// admits against the index itself: "the index measures the loudness of
// English-language, Western, open-web AI activity — not AI." A Chinese frontier
// lab publishing in English is the cheapest available correction to that bias,
// and it is a primary source rather than Western commentary about one.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'qwen',
  kind: 'lab',
  label: 'Qwen blog',
  weight: 0.85,
  url: 'https://qwenlm.github.io/blog/index.xml',
  defaultPillar: 'capability',
  aiFilter: false,
  limit: 25,
});
