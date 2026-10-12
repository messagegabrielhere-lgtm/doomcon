// The Telegraph — Technology. Added 2026-10-11 (pizzint.watch's briefs cite it). Filtered to AI
// items. A dead URL shows as dark in source health; it never fails the run.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'telegraph-tech',
  kind: 'press',
  label: 'The Telegraph — Technology',
  weight: 0.7,
  url: 'https://www.telegraph.co.uk/technology/rss.xml',
  defaultPillar: 'attention',
  aiFilter: true,
  limit: 30,
});
