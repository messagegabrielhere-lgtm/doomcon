// Reddit r/singularity, top posts of the day, via Reddit's public RSS feed (no key,
// no login). Added 2026-10-08. Community chatter, so a low weight: it counts
// as attention, never as confirmation of a claim. Not verified from the build
// box; a feed Reddit refuses goes dark in source health without breaking the run.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'reddit-singularity',
  kind: 'forum',
  label: 'Reddit r/singularity',
  weight: 0.4,
  url: 'https://www.reddit.com/r/singularity/top/.rss?t=day&limit=25',
  defaultPillar: 'attention',
  aiFilter: false,
  limit: 15,
});
