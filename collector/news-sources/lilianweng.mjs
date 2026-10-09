// Lilian Weng (Lil'Log). Added 2026-10-09.
// Long-form surveys from OpenAI's research side — rare, high signal.
// Verified: HTTP 200, application/xml Hugo RSS.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'lilianweng',
  kind: 'press',
  label: 'Lilian Weng (Lil\'Log)',
  weight: 0.6,
  url: 'https://lilianweng.github.io/index.xml',
  defaultPillar: 'capability',
  aiFilter: false,
  limit: 10,
  minIntervalMs: 1_800_000,
});
