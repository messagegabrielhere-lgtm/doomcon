// Nature, machine-learning subject feed.
// Verified 2026-10-08: HTTP 200, application/rss+xml.
//
// Peer-reviewed machine learning. Kind `paper` keeps it on the hourly cadence
// with arXiv: these issues are not a wire, and asking more often returns the
// same document.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'nature-ml',
  kind: 'paper',
  label: 'Nature — machine learning',
  weight: 0.65,
  url: 'https://www.nature.com/subjects/machine-learning.rss',
  defaultPillar: 'capability',
  aiFilter: false,
  limit: 20,
});
