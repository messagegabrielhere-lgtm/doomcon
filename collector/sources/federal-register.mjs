// US Federal Register — documents mentioning artificial intelligence,
// trailing 30 days. Pillar: governance.
//
// This counts regulatory *activity*, not regulatory *severity*: a notice of a
// public meeting and a binding rule both count one. That is deliberate and
// matches the index's remit — tempo, never a judgement about consequences.

const WINDOW_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ENDPOINT = 'https://www.federalregister.gov/api/v1/documents.json';

/** The API wants calendar dates, YYYY-MM-DD, and treats both bounds inclusive. */
function toApiDate(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

function buildUrl(fromMs, toMs) {
  // Bracketed keys are real parameter names here, not array sugar we invented.
  // URLSearchParams percent-encodes the brackets, which the API accepts.
  const params = new URLSearchParams({
    'conditions[term]': 'artificial intelligence',
    'conditions[publication_date][gte]': toApiDate(fromMs),
    'conditions[publication_date][lte]': toApiDate(toMs),
    // We only ever read `count`. per_page=1 keeps the payload to a single
    // document instead of dragging 30 days of full metadata across the wire on
    // every run; the count field is the total for the window, not the page.
    per_page: '1',
    'fields[]': 'document_number',
  });
  return `${ENDPOINT}?${params.toString()}`;
}

export default {
  id: 'federal-register',
  pillar: 'governance',
  label: 'US Federal Register AI documents (30d)',

  async collect(fetchJson) {
    const nowMs = Date.now();
    // 29 days back plus today = a 30-day inclusive window.
    const fromMs = nowMs - (WINDOW_DAYS - 1) * MS_PER_DAY;

    const body = await fetchJson(buildUrl(fromMs, nowMs));

    if (!body || typeof body !== 'object') {
      throw new Error('federal-register: response was not a JSON object');
    }

    // TRAP (measured 2026-09-23): a zero-result response omits `results` and
    // `total_pages` entirely and returns only {description, count:0}. Code that
    // reads `results.length` throws on the one case that is not an error, and
    // code that defaults a missing count to 0 cannot tell "no AI documents this
    // month" from "the shape changed". So we require count to be present and
    // finite, and accept a genuine 0 only when the API actually said 0.
    if (!Number.isFinite(body.count)) {
      throw new Error(
        `federal-register: no finite \`count\` in response (got ${JSON.stringify(body.count)}) — API shape may have changed`
      );
    }

    return {
      value: body.count,
      unit: 'documents/30d',
      observed_at: new Date(nowMs).toISOString(),
      meta: {
        window_days: WINDOW_DAYS,
        window_start: toApiDate(fromMs),
        window_end: toApiDate(nowMs),
        term: 'artificial intelligence',
        // The API echoes back how it parsed the query. Archiving it means a
        // future silent change in its search semantics is visible in history
        // rather than showing up as an unexplained step in the index.
        api_description: typeof body.description === 'string' ? body.description : null,
      },
    };
  },
};
