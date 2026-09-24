// OpenAI newsroom. The single highest-weight source in the feed.
//
// This is the upstream point. pizzint.watch's OSINT column relays X posts, so
// it is structurally downstream of whichever accounts it mirrors and can only
// ever react. An OpenAI launch appears HERE first and on X afterwards, which is
// what makes a timestamped "we had this first" claim honest rather than
// asserted (see docs/TEARDOWN.md §4).
//
// Verified 2026-09-23: HTTP 200, content-type text/xml, body opens <?xml, RSS 2.0.
// The feed is large (~750KB) because it carries full post bodies; `limit` caps
// how many entries we parse, not how many bytes arrive.

import { feedAdapter } from './_feed.mjs';

export default feedAdapter({
  id: 'openai',
  kind: 'lab',
  label: 'OpenAI newsroom',
  weight: 1.0,
  url: 'https://openai.com/news/rss.xml',
  defaultPillar: 'capability',
  // No local AI filter: every item in a frontier lab's own newsroom is on topic
  // by construction, and filtering would only ever produce false negatives.
  aiFilter: false,
  limit: 25,
  timeoutMs: 25_000,

  // OpenAI's newsroom publishes two materially different things under one feed,
  // and the <category> element separates them cleanly. Surveyed across the 40
  // most recent items on 2026-09-23:
  //
  //   Product 9, Global Affairs 8, Company 7, Startup 6, (none) 5,
  //   Publication 1, Safety 1, Research 1, Engineering 1, Applied AI 1
  //
  // `Startup` and uncategorised are, without exception in that sample, customer
  // case studies — "Hex turns complex analysis into visual reports with GPT-6
  // Astra", "How Cooley is accelerating IPO work with ChatGPT". They are
  // marketing, they publish several a week, and at full weight they filled the
  // top of the reel and pushed real launches off it.
  //
  // These multipliers are an EDITORIAL JUDGEMENT, stated here so it can be
  // argued with rather than discovered. They scale the source weight only; they
  // never exclude an item, so a case study that gets corroborated or heavily
  // upvoted can still climb on its own merits.
  categoryWeights: {
    Product: 1.0,
    Research: 1.0,
    Publication: 1.0,
    Safety: 1.0,
    Company: 0.75,
    'Global Affairs': 0.75,
    Engineering: 0.7,
    'Applied AI': 0.7,
    Startup: 0.45,
    _none: 0.45,
    _default: 0.8,
  },
});
