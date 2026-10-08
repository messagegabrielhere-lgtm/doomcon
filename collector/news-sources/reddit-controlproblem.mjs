// Reddit r/ControlProblem, top posts of the day, via Reddit's public RSS feed.
// Added 2026-10-08. The AI-risk community, so it is on-topic without a filter.
// Community chatter: low weight, counts as attention, never as confirmation.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'reddit-controlproblem',
  kind: 'forum',
  label: 'Reddit r/ControlProblem',
  weight: 0.35,
  url: 'https://www.reddit.com/r/ControlProblem/top/.rss?t=day&limit=25',
  defaultPillar: 'attention',
  aiFilter: false,
  limit: 15,
});
