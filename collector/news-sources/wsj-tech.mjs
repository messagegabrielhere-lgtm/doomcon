// The Wall Street Journal — Technology. Added 2026-10-11 (pizzint.watch's briefs cite it). Filtered to AI
// items. A dead URL shows as dark in source health; it never fails the run.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'wsj-tech',
  kind: 'press',
  label: 'The Wall Street Journal — Technology',
  weight: 0.7,
  url: 'https://feeds.a.dj.com/rss/RSSWSJD.xml',
  defaultPillar: 'attention',
  aiFilter: true,
  limit: 30,
});
