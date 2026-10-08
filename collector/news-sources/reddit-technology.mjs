// Reddit r/technology, top posts of the day, via Reddit's public RSS feed.
// Added 2026-10-08. A broad tech subreddit, so items are re-filtered locally to
// AI stories only. Community chatter: low weight, counts as attention.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'reddit-technology',
  kind: 'forum',
  label: 'Reddit r/technology',
  weight: 0.3,
  url: 'https://www.reddit.com/r/technology/top/.rss?t=day&limit=25',
  defaultPillar: 'attention',
  aiFilter: true,
  limit: 25,
});
