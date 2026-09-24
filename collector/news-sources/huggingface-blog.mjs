// Hugging Face blog. Verified 2026-09-23: 200, application/rss+xml.
//
// The ecosystem's own newsroom: release notes for open-weight models, library
// launches and community write-ups land here before the press notices them.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'huggingface-blog',
  kind: 'lab',
  label: 'Hugging Face blog',
  weight: 0.7,
  url: 'https://huggingface.co/blog/feed.xml',
  defaultPillar: 'capability',
  aiFilter: false,
  limit: 25,
  timeoutMs: 25_000,
});
