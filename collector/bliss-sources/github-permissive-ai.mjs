// OPENNESS pillar — new AI code anybody may use.
//
// Epoch measures whether the FRONTIER is open, over a year, in dozens of models.
// This measures whether the FLOOR is open, over a month, in hundreds of repos.
// They answer the same question at opposite ends of the field and at opposite
// cadences, which is the point of running both: a year-long ratio cannot move in
// a week, and a week-long count cannot tell you anything about the frontier.
//
// The licence qualifier is doing the real work. A count of new AI repositories is
// a measure of enthusiasm; a count of new Apache-2.0 AI repositories is a measure
// of how much of that enthusiasm arrives with a grant of rights attached.
//
// Measured 2026-09-24: 57 repositories created in the trailing 7 days with
// topic:machine-learning and an apache-2.0 licence; 150 over the trailing 23 days.

const ENDPOINT = 'https://api.github.com/search/repositories';

// 30 days, not 7. A weekly count lands around 57 and quantises the percentile into
// a handful of buckets; a monthly count lands in the low hundreds, where a single
// repo no longer moves the reading. Same reasoning as the 7-day window on arXiv,
// one step further out because the underlying rate is lower.
const WINDOW_DAYS = 30;

// topic:, not a keyword search. GitHub's free-text search matches READMEs and
// would count every tutorial that mentions machine learning; the topic is a label
// the repository owner applied on purpose, which is a much stronger claim that the
// repo IS an ML project rather than merely mentions one.
const TOPIC = 'machine-learning';

// One licence, and the most common permissive one in this corner of GitHub.
// GitHub's search API accepts a single license: qualifier per query - repeating it
// ANDs rather than ORs, which would return zero - so broadening this means more
// requests against an endpoint that allows 10 per minute unauthenticated. One
// query, one licence, stated openly as a floor rather than a total.
const LICENCE = 'apache-2.0';

/** YYYY-MM-DD, the only date form the created: qualifier accepts. */
function day(date) {
  return date.toISOString().slice(0, 10);
}

export default {
  id: 'github-permissive-ai',
  pillar: 'openness',
  label: 'New permissively licensed ML repositories',

  async collect(fetchJson) {
    const observedAt = new Date();
    const from = day(new Date(observedAt.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000));

    const q = `topic:${TOPIC} license:${LICENCE} created:>=${from}`;
    // per_page=1 because only total_count is wanted; asking for 100 results we do
    // not read costs GitHub a page build and us nothing but latency.
    const url = `${ENDPOINT}?q=${encodeURIComponent(q)}&per_page=1`;

    const body = await fetchJson(url);

    const total = body?.total_count;
    if (!Number.isFinite(total)) {
      throw new Error(
        `github-permissive-ai: expected a finite .total_count from ${url}, got ` +
          `${JSON.stringify(total)} — API shape changed, refusing to guess`,
      );
    }

    // GitHub sets incomplete_results when its search timed out partway. The
    // total_count that comes back with it is a partial, and publishing a partial
    // as a count is precisely the "floor dressed up as a measurement" failure this
    // codebase refuses everywhere else.
    if (body.incomplete_results === true) {
      throw new Error(
        `github-permissive-ai: GitHub returned incomplete_results=true for ${url} ` +
          `(partial total ${total}) — the search timed out server-side and the count is a floor`,
      );
    }

    if (total === 0) {
      throw new Error(
        `github-permissive-ai: 0 repositories in ${WINDOW_DAYS}d for "${q}" — implausible ` +
          `against a measured ~150/23d, treating the query syntax as broken rather than ` +
          `reporting a zero (${url})`,
      );
    }

    return {
      value: total,
      unit: `repos/${WINDOW_DAYS}d`,
      observed_at: observedAt.toISOString(),
      meta: {
        window_days: WINDOW_DAYS,
        created_from: from,
        topic: TOPIC,
        licence: LICENCE,
        query: q,
        // Said out loud because the number is a floor by construction: it counts
        // one licence and one topic, not all permissive AI code on GitHub.
        scope_note: 'single topic and single licence; a floor, not a total',
      },
    };
  },
};
