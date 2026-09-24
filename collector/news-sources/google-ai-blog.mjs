// The Keyword, AI section. Verified 2026-09-23: 200, application/xml; the
// request 302s from /technology/ai/rss/ to /innovation-and-ai/technology/ai/rss/
// and fetch.mjs follows redirects, so the canonical short path stays in code.
//
// Lower weight than deepmind: this is Google's product-marketing channel, so
// the same launch often appears here and on the DeepMind blog. That overlap is
// a feature — two independent feeds carrying one story is exactly the
// corroboration signal the scoring formula rewards.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'google-ai-blog',
  kind: 'lab',
  label: 'Google AI blog (The Keyword)',
  weight: 0.8,
  url: 'https://blog.google/technology/ai/rss/',
  defaultPillar: 'capability',
  aiFilter: false,
  limit: 25,
});
