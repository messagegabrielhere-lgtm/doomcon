// arXiv — newest cs.AI / cs.LG / cs.CL entries, with titles and abstracts.
//
// The most upstream source in the whole feed. A result exists here days before
// anyone posts a thread about it, which is the entire structural advantage over
// a competitor whose feed relays X.
//
// DELIBERATELY NOT the same query as collector/sources/arxiv.mjs. That adapter
// asks for a COUNT over a submittedDate window, which is a range scan on
// arXiv's side and regularly runs past 20 seconds. This one asks for the newest
// N sorted descending with no date filter, which measured 0.49s for 5 entries
// on 2026-09-23. Same API, one is slow and one is not, and the difference is
// the date range — worth knowing before anyone "simplifies" them together.

import { parseFeed, assertXmlFeed, draft } from './_feed.mjs';

const ENDPOINT = 'https://export.arxiv.org/api/query';
const CATEGORIES = ['cs.AI', 'cs.LG', 'cs.CL'];
const MAX_RESULTS = 60;

/**
 * arXiv abstract URLs carry a version suffix (…/abs/2609.26796v1). Two sources
 * pointing at v1 and v2 of one paper are the same story, and the version is
 * also the thing most likely to change under us between runs — which would mint
 * a new stable id for an item we already have and duplicate it in the feed.
 * So the version is stripped for the canonical URL, and the bare arXiv id
 * becomes an explicit dedup key that de-duplicates against Hugging Face's
 * daily-papers listing of the same paper under a completely different URL.
 */
function arxivId(url) {
  return url.match(/arxiv\.org\/abs\/([^\s?#]+?)(?:v\d+)?$/i)?.[1] ?? null;
}

export default {
  id: 'arxiv-newest',
  kind: 'paper',
  label: 'arXiv cs.AI / cs.LG / cs.CL (newest)',
  weight: 0.65,

  async collect(fetchText) {
    // Built by hand rather than with URLSearchParams for the reason recorded in
    // collector/sources/arxiv.mjs: arXiv's query language wants literal `+` for
    // spaces, and percent-encoding it is a coin flip on their parser.
    const query = CATEGORIES.map((c) => `cat:${c}`).join('+OR+');
    const url =
      `${ENDPOINT}?search_query=${query}&sortBy=submittedDate&sortOrder=descending` +
      `&start=0&max_results=${MAX_RESULTS}`;

    // retries: 0 — arXiv throttles hard and keeps throttling; a retry converts a
    // soft 429 into a longer ban and buys nothing. Same policy as sources/arxiv.mjs.
    const { data: xml, headers } = await fetchText(url, { timeoutMs: 30_000, retries: 0, withMeta: true });
    assertXmlFeed(xml, url, headers?.['content-type'] ?? '');

    // arXiv answers a malformed query with HTTP 200 and an error ENTRY, so a
    // good status proves nothing at all. Check the payload.
    if (/<title>\s*Error\s*<\/title>/i.test(xml)) {
      const reason = xml.match(/<summary>([\s\S]*?)<\/summary>/i)?.[1]?.trim() ?? 'no summary';
      throw new Error(`arxiv-newest: API returned an error entry — ${reason}`);
    }

    const entries = parseFeed(xml, { limit: MAX_RESULTS });
    const items = [];

    for (const e of entries) {
      // The feed's own <title> element is the query echo, not a paper. It sits
      // outside <entry> so parseFeed never sees it, but the guard is cheap and
      // the failure it prevents (one junk item at the top of the reel, every
      // single run) is highly visible.
      if (/^arXiv Query:/i.test(e.title)) continue;

      const id = arxivId(e.url);
      if (!id) continue;

      items.push(draft({
        source: 'arxiv-newest',
        kind: 'paper',
        title: e.title,
        summary: e.summary,
        url: `https://arxiv.org/abs/${id}`,
        published_at: e.published_at,
        defaultPillar: 'capability',
        dedupKey: `arxiv:${id}`,
        meta: { arxiv_id: id, categories: CATEGORIES, query_url: url },
      }));
    }

    if (items.length === 0) {
      throw new Error(`arxiv-newest: parsed ${entries.length} entries but none carried an arXiv abs URL`);
    }
    return items;
  },
};
