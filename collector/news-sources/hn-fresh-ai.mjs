// Hacker News — AI submissions from the last two hours, before they are big.
//
// hn-ai.mjs reads 72 hours of stories that already cleared 8 points: good for
// engagement, slow for speed, because a lab announcement is usually submitted
// within minutes and only crosses 8 points some time later. This adapter asks
// Algolia's search_by_date for the NEWEST stories (two hours, 3+ points) and
// keeps only headlines that name a frontier lab or model family — the fast,
// narrow complement to the broad, slow one.
//
// The item URL is the linked article, as in hn-ai, so the two de-duplicate
// against each other and against the press feeds instead of double-counting.

import { draft, isAiRelevant } from './_feed.mjs';
import { extractEntities } from './_entities.mjs';
import { registrableDomain } from './_outlets.mjs';

const ENDPOINT = 'https://hn.algolia.com/api/v1/search_by_date';
const WINDOW_HOURS = 2;
const MIN_POINTS = 3;
const POINTS_FULL_SCALE = 500;

export function endpoint(nowMs = Date.now()) {
  const since = Math.floor(nowMs / 1000) - WINDOW_HOURS * 3600;
  const params = new URLSearchParams({
    tags: 'story',
    numericFilters: `created_at_i>${since},points>${MIN_POINTS - 1}`,
    hitsPerPage: '100',
  });
  return `${ENDPOINT}?${params}`;
}

/** Algolia body -> drafts. Pure; exported for tests. */
export function parseHits(body) {
  if (!body || !Array.isArray(body.hits)) {
    throw new Error('hn-fresh-ai: Algolia response had no hits array');
  }
  const out = [];
  for (const hit of body.hits) {
    const title = typeof hit?.title === 'string' ? hit.title.replace(/\s+/g, ' ').trim() : '';
    if (!title || !hit.objectID) continue;
    const createdMs = Date.parse(hit.created_at ?? '');
    if (!Number.isFinite(createdMs)) continue;
    if (!isAiRelevant(title) || extractEntities(title).length === 0) continue;
    const points = Number(hit.points ?? 0);
    const comments = Number(hit.num_comments ?? 0);
    const discussion = `https://news.ycombinator.com/item?id=${hit.objectID}`;
    const url = typeof hit.url === 'string' && /^https?:\/\//i.test(hit.url) ? hit.url : discussion;
    out.push(draft({
      source: 'hn-fresh-ai',
      kind: 'forum',
      title,
      summary: `New on Hacker News: ${points} points, ${comments} comments so far.`,
      url,
      published_at: new Date(createdMs).toISOString(),
      defaultPillar: 'attention',
      engagement: { metric: 'hn_points', value: points, full_scale: POINTS_FULL_SCALE },
      meta: {
        hn_id: String(hit.objectID),
        points,
        comments,
        discussion_url: discussion,
        outlet_domain: registrableDomain(url),
        window_hours: WINDOW_HOURS,
      },
    }));
  }
  return out;
}

export default {
  id: 'hn-fresh-ai',
  kind: 'forum',
  label: 'Hacker News — newest AI submissions (2h)',
  weight: 0.45,
  maxItems: 40,
  async collect(_fetchText, fetchJson) {
    return parseHits(await fetchJson(endpoint(), { retries: 1, timeoutMs: 10_000 }));
  },
};
