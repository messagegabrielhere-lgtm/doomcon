// DeepMind Safety Research (Medium). Added 2026-10-09.
// Alignment and eval notes that do not always land on the main DeepMind blog.
// Verified: HTTP 200, text/xml Medium RSS.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'deepmind-safety',
  kind: 'lab',
  label: 'DeepMind Safety Research',
  weight: 0.65,
  url: 'https://deepmindsafetyresearch.medium.com/feed',
  defaultPillar: 'governance',
  aiFilter: false,
  limit: 15,
  minIntervalMs: 900_000,
});
