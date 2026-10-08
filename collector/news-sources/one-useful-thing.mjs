// One Useful Thing, Ethan Mollick. Verified 2026-10-08: HTTP 200, application/xml.
//
// A primary account of how people actually use the models, which the lab
// blogs do not cover. It publishes a few times a month, so it does not
// inherit the one-minute wire cadence.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'one-useful-thing',
  kind: 'press',
  label: 'One Useful Thing',
  weight: 0.65,
  url: 'https://www.oneusefulthing.org/feed',
  defaultPillar: 'attention',
  aiFilter: false,
  limit: 15,
  minIntervalMs: 900_000,
});
