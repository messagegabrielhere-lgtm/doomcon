// Hacker News — AI attention amplitude over the trailing 24 hours.
// Pillar: attention. Higher = louder, which is the direction the contract wants.
//
// Scalar choice: aggregate points, not story count. Submission volume on HN is
// close to flat day over day, so a story count mostly measures HN's posting
// rate rather than the world's interest. Points scale with how hard the
// community actually engaged with AI specifically. The story count is still
// carried in meta, so a future engine can re-derive a different aggregation
// from the archived raw snapshots without refetching anything.

// Deliberately NOT filtered to `tags=front_page`, despite "front page" being
// the intuitive framing. That tag is a snapshot of what sits on the front page
// at index time, not a historical flag on stories that once ranked. Measured
// over one identical 24h window it returned 2 hits against 181 for tags=story
// — it would have made this source effectively dead every day.

const WINDOW_SECONDS = 24 * 60 * 60;

// Algolia never returns more than this in one response, regardless of
// hitsPerPage, and it does not expose a usable second page at this size.
const ALGOLIA_HIT_CEILING = 1000;

const ENDPOINT = 'https://hn.algolia.com/api/v1/search';

/**
 * Builds the query string. Every parameter goes through URLSearchParams and is
 * never string-concatenated, for one specific reason recorded below.
 *
 * TRAP (measured 2026-09-23): the comparison operators in `numericFilters`
 * MUST be percent-encoded. A literal `>` in the query string does not produce
 * a 4xx — it produces a non-JSON error body, so the failure surfaces later as
 * a JSON parse error with no hint of the real cause. URLSearchParams encodes
 * `>` as %3E, which makes the trap unreachable by construction.
 */
function buildQueryUrl(sinceUnixSeconds) {
  const params = new URLSearchParams({
    tags: 'story',
    query: 'AI',
    // Keeps the match off story_text and url. Measured over one identical 24h
    // window: 253 hits unrestricted vs 181 title-only. The unrestricted form
    // also matches the body and link target of stories that are not about AI,
    // which inflates the very signal this source exists to measure.
    restrictSearchableAttributes: 'title',
    numericFilters: `created_at_i>${sinceUnixSeconds}`,
    hitsPerPage: String(ALGOLIA_HIT_CEILING),
    page: '0',
  });
  return `${ENDPOINT}?${params.toString()}`;
}

export default {
  id: 'hn',
  pillar: 'attention',
  label: 'Hacker News AI story points (24h)',

  async collect(fetchJson) {
    const nowMs = Date.now();
    const sinceUnixSeconds = Math.floor(nowMs / 1000) - WINDOW_SECONDS;

    const body = await fetchJson(buildQueryUrl(sinceUnixSeconds));

    if (!body || !Array.isArray(body.hits)) {
      throw new Error('hn: Algolia response had no hits array — shape changed or an error body was returned as JSON');
    }
    if (!Number.isFinite(body.nbHits)) {
      throw new Error(`hn: Algolia returned a non-numeric nbHits (${JSON.stringify(body.nbHits)})`);
    }

    // Algolia caps a response at 1000 hits and still reports nbPages=1 when the
    // true total is far larger (measured over a 30d window: nbHits 4474,
    // nbPages 1, 1000 hits returned). There is no second page to ask for. So an
    // overflow cannot be paged around — it can only be summed wrongly or
    // refused. We refuse: an under-reported points total on the single loudest
    // AI day of the year is exactly the silent corruption this project exists
    // to avoid, and a dark source is an honest answer where a low number is not.
    if (body.hits.length < body.nbHits) {
      throw new Error(
        `hn: window overflowed Algolia's ${ALGOLIA_HIT_CEILING}-hit ceiling ` +
        `(nbHits=${body.nbHits}, returned=${body.hits.length}); refusing to report a truncated points total`
      );
    }

    let points = 0;
    let comments = 0;
    for (const hit of body.hits) {
      // Points and num_comments are null on very fresh submissions rather than
      // absent, so `?? 0` here is reading a real zero, not papering over a gap.
      points += Number(hit.points ?? 0);
      comments += Number(hit.num_comments ?? 0);
    }

    if (!Number.isFinite(points)) {
      throw new Error('hn: points sum was not finite — a hit carried a non-numeric points field');
    }

    return {
      value: points,
      unit: 'points/24h',
      observed_at: new Date(nowMs).toISOString(),
      meta: {
        stories: body.nbHits,
        comments,
        // False would mean nbHits is an Algolia estimate rather than a count.
        // It has always measured true here; recorded so a future drift is visible.
        exhaustive_count: body.exhaustiveNbHits === true,
        window_seconds: WINDOW_SECONDS,
        window_start: new Date(sinceUnixSeconds * 1000).toISOString(),
        window_end: new Date(nowMs).toISOString(),
        query: 'AI (title only, tags=story)',
      },
    };
  },
};
