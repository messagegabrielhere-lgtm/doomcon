// Hacker News — AI stories with their points and comment counts.
//
// The engagement signal. Points and comments are the only hard numbers in this
// whole layer that measure how hard people actually reacted, rather than how
// prominently a publisher placed something.
//
// TRAP, already recorded in collector/sources/hn.mjs and repeated because it
// costs an hour every time: the comparison operators in `numericFilters` MUST
// be percent-encoded. A literal `>` does not produce a 4xx — it produces a
// non-JSON error body, so the failure surfaces much later as a JSON parse
// error with no hint of the cause. Everything goes through URLSearchParams,
// which encodes `>` as %3E and makes the trap unreachable by construction.

import { draft, isAiRelevant } from './_feed.mjs';

const ENDPOINT = 'https://hn.algolia.com/api/v1/search';
const WINDOW_HOURS = 72;
const HITS = 80;
const POINTS_FULL_SCALE = 500;

// Below this a story is noise: HN's new page is full of AI submissions that
// nobody voted on, and they would swamp the reel with items no human saw.
// A floor, not a filter on content — stated so it can be argued with.
const MIN_POINTS = 8;

export default {
  id: 'hn-ai',
  kind: 'forum',
  label: 'Hacker News AI stories (72h)',
  weight: 0.6,

  async collect(_fetchText, fetchJson) {
    const sinceSeconds = Math.floor(Date.now() / 1000) - WINDOW_HOURS * 3600;

    const params = new URLSearchParams({
      tags: 'story',
      query: 'AI',
      // Title-only, for the reason measured in sources/hn.mjs: unrestricted
      // search also matches story_text and the link target, which drags in
      // stories that are not about AI at all.
      restrictSearchableAttributes: 'title',
      numericFilters: `created_at_i>${sinceSeconds},points>${MIN_POINTS - 1}`,
      hitsPerPage: String(HITS),
      page: '0',
    });

    const body = await fetchJson(`${ENDPOINT}?${params}`);
    if (!body || !Array.isArray(body.hits)) {
      throw new Error('hn-ai: Algolia response had no hits array — shape changed or an error body arrived as JSON');
    }

    let rejected = 0;
    const items = [];

    for (const hit of body.hits) {
      const title = typeof hit.title === 'string' ? hit.title.replace(/\s+/g, ' ').trim() : '';
      if (!title || !hit.objectID) continue;

      const createdMs = Date.parse(hit.created_at ?? '');
      if (!Number.isFinite(createdMs)) continue;

      // Second line of defence over Algolia's own matching, the same discipline
      // docs/METHODOLOGY.md records for the Polymarket basket. Rejections are
      // counted and reported so the basket is auditable rather than trusted.
      if (!isAiRelevant(title)) {
        rejected += 1;
        continue;
      }

      const points = Number(hit.points ?? 0);
      const comments = Number(hit.num_comments ?? 0);
      const discussion = `https://news.ycombinator.com/item?id=${hit.objectID}`;

      // The item's URL is the ARTICLE, not the HN thread, when one exists.
      // That is what makes an HN hit de-duplicate against the press feeds
      // covering the same story — pointing at the thread instead would make
      // every HN item look like a unique story and inflate the reel.
      const url = typeof hit.url === 'string' && /^https?:\/\//i.test(hit.url) ? hit.url : discussion;

      items.push(draft({
        source: 'hn-ai',
        kind: 'forum',
        title,
        summary: `${points} points, ${comments} comments on Hacker News.`,
        url,
        published_at: new Date(createdMs).toISOString(),
        defaultPillar: 'attention',
        engagement: { metric: 'hn_points', value: points, full_scale: POINTS_FULL_SCALE },
        meta: {
          hn_id: String(hit.objectID),
          points,
          comments,
          discussion_url: discussion,
          window_hours: WINDOW_HOURS,
          min_points: MIN_POINTS,
          locally_ai_filtered: true,
        },
      }));
    }

    for (const item of items) item.meta.rejected_off_topic = rejected;

    if (items.length === 0) {
      throw new Error(
        `hn-ai: ${body.hits.length} hits returned, ${rejected} rejected as off-topic, none usable`,
      );
    }
    return items;
  },
};
