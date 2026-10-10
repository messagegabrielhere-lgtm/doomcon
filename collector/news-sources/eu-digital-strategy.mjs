// European Commission — Digital Strategy RSS. Added 2026-10-09.
// EU AI Act, DSA and digital-market notices the US press often lags.
// Locally AI-filtered: the channel mixes broadband, chips and general ICT.
// Verified: HTTP 200, application/rss+xml.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'eu-digital-strategy',
  kind: 'press',
  label: 'EU Digital Strategy',
  weight: 0.65,
  url: 'https://digital-strategy.ec.europa.eu/en/rss.xml',
  defaultPillar: 'governance',
  aiFilter: true,
  limit: 30,
});
