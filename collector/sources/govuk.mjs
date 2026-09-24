// GOV.UK Search API — UK government publications mentioning artificial
// intelligence, trailing 30 days. Pillar: governance.
//
// Paired with federal-register so the governance pillar is not a single
// jurisdiction. The two are not comparable in absolute terms (GOV.UK indexes
// news stories, statistics and guidance; the Federal Register indexes only
// what is formally published) — which does not matter, because each source is
// normalised against its OWN frozen reference distribution before the pillar
// is formed. Never compare these two raw values to each other.

const WINDOW_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ENDPOINT = 'https://www.gov.uk/api/search.json';

function toApiDate(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

function buildUrl(fromMs, toMs) {
  const params = new URLSearchParams({
    // TRAP (measured 2026-09-23): the quotes are load-bearing. Unquoted,
    // `artificial intelligence` is a relevance query that matches documents
    // containing only "intelligence" — 406 hits over a 30-day window against
    // 150 for the quoted phrase. The unquoted form would have made this source
    // a partial measure of UK security and defence publishing.
    q: '"artificial intelligence"',
    // Comma-separated bounds inside one value; URLSearchParams encodes the
    // colons and comma, which the API accepts.
    filter_public_timestamp: `from:${toApiDate(fromMs)},to:${toApiDate(toMs)}`,
    // We want the total only. count=0 returns an empty results array and the
    // full total, so this stays a constant-size request as the window fills.
    count: '0',
  });
  return `${ENDPOINT}?${params.toString()}`;
}

export default {
  id: 'govuk',
  pillar: 'governance',
  label: 'GOV.UK AI publications (30d)',

  async collect(fetchJson) {
    const nowMs = Date.now();
    const fromMs = nowMs - (WINDOW_DAYS - 1) * MS_PER_DAY;

    const body = await fetchJson(buildUrl(fromMs, nowMs));

    if (!body || typeof body !== 'object') {
      throw new Error('govuk: response was not a JSON object');
    }

    // `total` is the only field we depend on. Requiring it to be finite means a
    // future API change that drops or renames it takes this source dark instead
    // of feeding the index a zero that reads as "the UK stopped publishing".
    if (!Number.isFinite(body.total)) {
      throw new Error(
        `govuk: no finite \`total\` in response (got ${JSON.stringify(body.total)}) — API shape may have changed`
      );
    }

    return {
      value: body.total,
      unit: 'documents/30d',
      observed_at: new Date(nowMs).toISOString(),
      meta: {
        window_days: WINDOW_DAYS,
        window_start: toApiDate(fromMs),
        window_end: toApiDate(nowMs),
        query: '"artificial intelligence"',
      },
    };
  },
};
