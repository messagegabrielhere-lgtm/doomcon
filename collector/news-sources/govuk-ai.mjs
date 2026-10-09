// UK government news & communications filtered to "artificial intelligence".
// Added 2026-10-09. Atom from GOV.UK search — procurement, defence, MHRA.
// Verified: HTTP 200, Atom body.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'govuk-ai',
  kind: 'press',
  label: 'GOV.UK — AI',
  weight: 0.55,
  url: 'https://www.gov.uk/search/news-and-communications.atom?keywords=artificial+intelligence',
  defaultPillar: 'governance',
  aiFilter: false,
  limit: 20,
});
