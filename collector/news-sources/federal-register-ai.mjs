// Federal Register — documents matching "artificial intelligence".
// Added 2026-10-09. Primary US regulatory wire: rules, notices, meetings.
// Verified: HTTP 200, application/rss+xml from the FR API.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'federal-register-ai',
  kind: 'press',
  label: 'Federal Register — AI',
  weight: 0.7,
  url: 'https://www.federalregister.gov/api/v1/documents.rss?conditions%5Bterm%5D=artificial+intelligence',
  defaultPillar: 'governance',
  aiFilter: false,
  limit: 25,
});
