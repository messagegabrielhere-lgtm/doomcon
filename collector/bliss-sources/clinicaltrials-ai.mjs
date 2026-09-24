// MEDICINE pillar — trials that have actually started.
//
// A registered, started interventional trial is the most expensive signal in this
// whole index. A paper costs a preprint upload; a trial costs a protocol, an
// ethics board, a sponsor and enrolled human beings. When the count of AI-involved
// trials rises, somebody has committed real money to the proposition that a model
// helps a patient — which is a far harder claim than any benchmark.
//
// ClinicalTrials.gov's v2 API is free, keyless and returns an exact totalCount
// rather than a sample, so this source has no estimation error.
//
// Measured 2026-09-24: 942 studies with an AI term and a start date on or after
// 2026-03-01.

const WINDOW_DAYS = 180;

const ENDPOINT = 'https://clinicaltrials.gov/api/v2/studies';

// Two phrases, quoted, joined with OR. Deliberately not "AI": unquoted it matches
// the token inside unrelated words and registry text, and the registry's own
// indexing already expands the spelled-out form.
const TERMS = ['"artificial intelligence"', '"machine learning"'];

/** YYYY-MM-DD for the AREA[StartDate] range filter. */
function day(date) {
  return date.toISOString().slice(0, 10);
}

export default {
  id: 'clinicaltrials-ai',
  pillar: 'medicine',
  label: 'ClinicalTrials.gov AI trial starts',

  async collect(fetchJson) {
    const observedAt = new Date();
    const from = day(new Date(observedAt.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000));
    const to = day(observedAt);

    // The range is CLOSED at today rather than open to MAX. RANGE[from,MAX]
    // includes trials whose start date is in the future — registered plans, not
    // starts — and counting those would make this source a measure of intention.
    // The pillar is about what has begun.
    const advanced = `AREA[StartDate]RANGE[${from},${to}]`;

    const url =
      `${ENDPOINT}?query.term=${encodeURIComponent(TERMS.join(' OR '))}` +
      `&filter.advanced=${encodeURIComponent(advanced)}` +
      `&countTotal=true&pageSize=1`;

    const body = await fetchJson(url);

    const total = body?.totalCount;
    if (!Number.isFinite(total)) {
      throw new Error(
        `clinicaltrials-ai: expected a finite .totalCount from ${url}, got ` +
          `${JSON.stringify(total)} — API shape changed, refusing to guess`,
      );
    }

    // Zero over 180 days is not a quiet half-year in a registry holding thousands
    // of AI-tagged studies; it is the date filter or the term syntax having
    // changed underneath us.
    if (total === 0) {
      throw new Error(
        `clinicaltrials-ai: 0 trials started in ${WINDOW_DAYS}d matching ${TERMS.join(' OR ')} — ` +
          `implausible, treating the query as broken rather than reporting a zero (${url})`,
      );
    }

    return {
      value: total,
      unit: `trials/${WINDOW_DAYS}d`,
      observed_at: observedAt.toISOString(),
      meta: {
        window_days: WINDOW_DAYS,
        start_date_from: from,
        start_date_to: to,
        terms: TERMS,
        registry: 'ClinicalTrials.gov API v2',
      },
    };
  },
};
