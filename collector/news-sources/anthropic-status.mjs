// Anthropic incident history.
//
// ANTHROPIC HAS NO BLOG RSS AT ANY PATH. That is a measured negative, not an
// omission: /rss.xml, /feed.xml, /news/rss.xml and every neighbouring guess
// return HTML or 404. Shipping a made-up path that 200s with an SPA shell would
// put a permanently-empty source in the feed, which is the pizzint failure mode
// this repo exists to not repeat (docs/TEARDOWN.md §3.1).
//
// So Anthropic enters the feed through two real doors: this incident history,
// and the anthropics/* repositories inside github-releases.mjs.
//
// Verified 2026-09-23: status.anthropic.com/history.atom 302s to
// status.claude.com/history.atom and serves application/atom+xml.
//
// Weight is modest and the pillar is deliberately `attention`, not
// `capability`: an incident measures operational load on a frontier lab's
// serving fleet — how hard the world is leaning on it — not what shipped.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'anthropic-status',
  kind: 'status',
  label: 'Anthropic / Claude incident history',
  weight: 0.55,
  url: 'https://status.anthropic.com/history.atom',
  defaultPillar: 'attention',
  aiFilter: false,
  limit: 20,
  titlePrefix: 'Anthropic status: ',
  extraMeta: { note: 'Anthropic publishes no blog RSS at any path; this is the incident feed' },
});
