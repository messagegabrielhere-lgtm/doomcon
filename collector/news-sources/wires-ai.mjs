// The wires and the big business papers — Reuters, AP, AFP, the Wall Street
// Journal, the Financial Times, Bloomberg and the Telegraph — on AI, via
// Google News site: searches (Reuters and AFP publish no public RSS).
// Added 2026-10-11 to match the newsroom set pizzint.watch's intel briefs
// cite, so a wire scoop reaches SIREN as soon as Google indexes it.
//
// A second search covers military AI and the OSINT beat (drones, autonomous
// weapons, AI cyberattacks, strikes on data centres) that conflict monitors
// break first.

import { assertXmlFeed } from './_feed.mjs';
import { parseGoogleNews, searchUrl } from './gnews-ai.mjs';

export const QUERIES = Object.freeze([
  { q: '(site:reuters.com OR site:apnews.com OR site:afp.com OR site:france24.com) (AI OR "artificial intelligence" OR OpenAI OR Anthropic OR Nvidia) when:3h', ai: true },
  { q: '(site:wsj.com OR site:ft.com OR site:bloomberg.com OR site:telegraph.co.uk OR site:economist.com) (AI OR "artificial intelligence" OR OpenAI OR Anthropic) when:3h', ai: true },
  { q: '("military AI" OR "autonomous weapons" OR "AI drone" OR "drone swarm" OR "AI cyberattack" OR "data center attack" OR "Pentagon AI") when:3h', ai: false },
]);

export default {
  id: 'wires-ai',
  kind: 'press',
  label: 'Wires & business papers — Reuters, AP, AFP, WSJ, FT, Bloomberg, Telegraph (via Google News)',
  weight: 0.75,
  minIntervalMs: 180_000,
  maxItems: 45,
  async collect(fetchText) {
    const settled = await Promise.allSettled(QUERIES.map(async ({ q, ai }) => {
      const url = searchUrl(q);
      const { data, headers } = await fetchText(url, { withMeta: true, retries: 0, timeoutMs: 10_000 });
      assertXmlFeed(data, url, headers?.['content-type'] ?? '');
      return parseGoogleNews(data, { source: 'wires-ai', aiCheck: ai, limit: 15 });
    }));
    const ok = settled.filter((s) => s.status === 'fulfilled');
    if (!ok.length) throw new Error(`wires-ai: no search answered — ${settled[0]?.reason?.message ?? 'unknown'}`);
    const byTitle = new Map();
    for (const s of ok) for (const d of s.value) if (!byTitle.has(d.title.toLowerCase())) byTitle.set(d.title.toLowerCase(), d);
    return [...byTitle.values()];
  },
};
