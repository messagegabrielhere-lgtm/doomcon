// Epoch AI. Verified 2026-10-08: HTTP 200, application/xml.
//
// Training-compute and model-trend notes. That is the compute pillar's kind
// of fact, and it is upstream of the press write-ups of the same numbers.
// A research desk, not a wire, so it is asked every 15 minutes.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'epoch-ai',
  kind: 'lab',
  label: 'Epoch AI',
  weight: 0.75,
  url: 'https://epochai.substack.com/feed',
  defaultPillar: 'compute',
  aiFilter: false,
  limit: 15,
  minIntervalMs: 900_000,
});
