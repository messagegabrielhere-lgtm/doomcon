// OpenAI incident history. Verified 2026-10-08: HTTP 200, application/atom+xml.
//
// Same door Anthropic already uses. A serving incident is how hard the world
// is leaning on the lab, so the pillar is attention, not capability, and the
// weight matches anthropic-status. Kind `status` is asked on every tick of
// the minute loop: an outage that waits a quarter hour is late.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'openai-status',
  kind: 'status',
  label: 'OpenAI incident history',
  weight: 0.55,
  url: 'https://status.openai.com/history.atom',
  defaultPillar: 'attention',
  aiFilter: false,
  limit: 20,
  titlePrefix: 'OpenAI status: ',
});
