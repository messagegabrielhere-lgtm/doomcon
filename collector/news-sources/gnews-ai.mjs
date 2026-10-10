// Google News — topic searches over the last hour, via its public RSS.
//
// Keyless. Google News indexes thousands of newsrooms within minutes of
// publication, and each result names the newsroom in a <source url="…"> tag.
// That tag is what makes this useful to the breaking rule: a Google News row
// for a Reuters story is counted as Reuters, not as "Google".
//
// The links are Google redirect URLs (news.google.com/rss/articles/…), so they
// never de-duplicate against the newsroom's own feed by URL; they meet it by
// headline instead. The " - Publisher" suffix Google appends is cut off for
// exactly that reason.
//
// Three queries: one broad, two focused. The broad one is re-filtered against
// the published AI token list so a local paper's "AI" column does not flood
// the window.

import { decodeEntities, toPlainText, assertXmlFeed, draft, isAiRelevant } from './_feed.mjs';
import { extractEntities } from './_entities.mjs';
import { registrableDomain } from './_outlets.mjs';

export const QUERIES = Object.freeze([
  { q: 'OpenAI OR Anthropic OR "Google DeepMind" when:1h', needEntity: false },
  { q: '"AI model" OR "AI lab" OR AGI OR superintelligence when:1h', needEntity: false },
  // Non-US desks the Anglophone wires lag: China lab releases and EU AI Act.
  { q: 'DeepSeek OR Qwen OR "AI Act" OR "EU AI" when:1h', needEntity: false },
  { q: 'AI when:1h', needEntity: true },
]);
const PER_QUERY = 12;

export function searchUrl(q) {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
}

/** "OpenAI ships X - Reuters" -> "OpenAI ships X" when the suffix is the publisher. */
export function stripPublisher(title, publisher) {
  const t = String(title ?? '').trim();
  const p = String(publisher ?? '').trim();
  if (p && t.endsWith(` - ${p}`)) return t.slice(0, -(p.length + 3)).trim();
  return t;
}

/** Parse one Google News RSS document. Pure; exported for tests. */
export function parseGoogleNews(xml, { limit = PER_QUERY, needEntity = false, nowMs = Date.now() } = {}) {
  const out = [];
  for (const m of String(xml).matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item\s*>/gi)) {
    if (out.length >= limit) break;
    const block = m[1];
    const rawTitle = toPlainText(block.match(/<title(?:\s[^>]*)?>([\s\S]*?)<\/title>/i)?.[1] ?? '', 300);
    const link = decodeEntities(block.match(/<link(?:\s[^>]*)?>\s*([^<\s][^<]*?)\s*<\/link>/i)?.[1] ?? '').trim();
    const pub = Date.parse(decodeEntities(block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] ?? '').trim());
    const srcTag = block.match(/<source\b([^>]*)>([\s\S]*?)<\/source>/i);
    const publisher = srcTag ? toPlainText(srcTag[2], 80) : '';
    const srcUrl = srcTag ? decodeEntities(srcTag[1].match(/\burl\s*=\s*["']([^"']+)["']/i)?.[1] ?? '') : '';
    if (!rawTitle || !/^https?:\/\//i.test(link) || !Number.isFinite(pub)) continue;
    if (pub > nowMs + 10 * 60_000) continue;
    const title = stripPublisher(rawTitle, publisher);
    if (title.length < 15) continue;
    if (!isAiRelevant(title)) continue;
    if (needEntity && extractEntities(title).length === 0) continue;
    const domain = registrableDomain(srcUrl) ?? null;
    out.push(draft({
      source: 'gnews-ai',
      kind: 'press',
      title,
      summary: publisher ? `${publisher}, via Google News.` : 'Via Google News.',
      url: link,
      published_at: new Date(pub).toISOString(),
      defaultPillar: 'attention',
      meta: { publisher: publisher || null, outlet_domain: domain, publisher_url: srcUrl || null },
    }));
  }
  return out;
}

export default {
  id: 'gnews-ai',
  kind: 'press',
  label: 'Google News — AI searches, last hour',
  weight: 0.55,
  // Four searches a pass; every two minutes keeps us polite to a free door.
  minIntervalMs: 120_000,
  maxItems: 60,
  async collect(fetchText) {
    const settled = await Promise.allSettled(QUERIES.map(async ({ q, needEntity }) => {
      const url = searchUrl(q);
      const { data, headers } = await fetchText(url, { withMeta: true, retries: 0, timeoutMs: 10_000 });
      assertXmlFeed(data, url, headers?.['content-type'] ?? '');
      return parseGoogleNews(data, { needEntity });
    }));
    const ok = settled.filter((s) => s.status === 'fulfilled');
    if (ok.length === 0) {
      throw new Error(`gnews-ai: no search answered — ${settled[0]?.reason?.message ?? 'unknown'}`);
    }
    const byTitle = new Map();
    for (const s of ok) for (const d of s.value) if (!byTitle.has(d.title.toLowerCase())) byTitle.set(d.title.toLowerCase(), d);
    return [...byTitle.values()];
  },
};
