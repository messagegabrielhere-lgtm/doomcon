// Google DeepMind blog. Verified 2026-09-23: 200, text/xml, RSS 2.0.
//
// Weighted just below OpenAI rather than equal to it for one measurable reason:
// DeepMind's feed mixes research-programme posts and organisational notes in
// with model launches at the same prominence, so the average item carries less
// news per item than the OpenAI newsroom does.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'deepmind',
  kind: 'lab',
  label: 'Google DeepMind blog',
  weight: 0.95,
  url: 'https://deepmind.google/blog/rss.xml',
  defaultPillar: 'capability',
  aiFilter: false,
  limit: 25,
});
