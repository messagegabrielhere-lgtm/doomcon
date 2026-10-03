// BENEFIT side — AI trials that actually started, per ClinicalTrials.gov.
//
// THE FILTER THAT MAKES THIS A COUNT OF STARTS. Every registered study carries a
// start date and a start-date TYPE: ACTUAL once the sponsor says the trial has
// begun, ESTIMATED (shown as "Anticipated") before that. A RANGE on StartDate
// alone counts both, and on the verification run of 2026-09-28 that meant 145
// studies in the window of which 125 were ESTIMATED and 118 were not yet
// recruiting. That is a count of plans. With AREA[StartDateType]ACTUAL the same
// window read 20 on both runs. The pillar this sits beside is about what has
// begun, so the filter is not optional.
//
// The same trap is open in collector/bliss-sources/clinicaltrials-ai.mjs, whose
// closed RANGE mostly counts ESTIMATED dates. Not this file's to change.
//
// LAG. A start becomes ACTUAL only when the sponsor next updates the record, so
// the newest days of any window ending on the anchor day come in low and fill
// in later. The window is published with the value; nothing is back-filled.

export const ENDPOINT = 'https://clinicaltrials.gov/api/v2/studies';

// Two phrases, quoted, joined with OR — the verified query, unchanged.
export const QUERY_TERM = '"artificial intelligence" OR "machine learning"';

export function advancedFilter(from, to) {
  return `AREA[StartDate]RANGE[${from},${to}] AND AREA[StartDateType]ACTUAL`;
}

export function startsUrl(from, to) {
  return (
    `${ENDPOINT}?query.term=${encodeURIComponent(QUERY_TERM)}` +
    `&filter.advanced=${encodeURIComponent(advancedFilter(from, to))}` +
    '&countTotal=true&pageSize=1&fields=NCTId'
  );
}

export default {
  id: 'clinicaltrials-ai-starts-30d',
  side: 'benefit',
  label: 'ClinicalTrials.gov: AI trials that actually started in the window',
  endpoint: startsUrl('{from}', '{to}'),
  keyless: true,
  windowed: true,
  ai_specific: true,
  context_only: false,
  counts:
    'Registered studies matching "artificial intelligence" or "machine learning" in any of about 40 registry fields, ' +
    'whose start date falls in the window AND is marked ACTUAL by the sponsor. Interventional and observational both.',
  does_not_count:
    'Results, approvals or patient benefit: a trial starting is a commitment, not an outcome. Trials whose sponsor has not ' +
    'yet updated the start to ACTUAL, so the newest days read low. Registered plans whose start is still marked estimated.',

  async collect(net, { from, to }) {
    const url = startsUrl(from, to);
    const body = await net.json(url);
    const total = body?.totalCount;
    if (!Number.isInteger(total) || total < 0) {
      throw new Error(
        `clinicaltrials-ai-starts-30d: expected an integer .totalCount, got ${JSON.stringify(total)} — ` +
          `API shape changed, refusing to guess (${url})`,
      );
    }
    // Twenty starts a month is the measured rate. Zero is the date filter or the
    // term syntax having changed underneath us, not a quiet month (BLISS.md §4.4).
    if (total === 0) {
      throw new Error(
        `clinicaltrials-ai-starts-30d: 0 ACTUAL starts between ${from} and ${to} — implausible, ` +
          `treating the query as broken rather than publishing a zero (${url})`,
      );
    }
    return {
      value: total,
      unit: 'trials started',
      meta: { query_term: QUERY_TERM, filter_advanced: advancedFilter(from, to), registry: 'ClinicalTrials.gov API v2' },
    };
  },
};
