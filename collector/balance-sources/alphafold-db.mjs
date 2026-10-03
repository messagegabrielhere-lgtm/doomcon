// BENEFIT side — how many predicted structures the AlphaFold database serves.
//
// A CONTEXT FIGURE, NOT A DAILY COUNTER. The total only moves when a release or a
// provider batch lands, and the search has no date filter, so no trailing window
// is possible. It is published because it is the one number in the benefit
// register that can be re-read live, and because a reader should be able to see
// it change the day a batch lands rather than take a press release's word.
//
// UNDOCUMENTED ENDPOINT. /api/search is not in the published spec
// (/api/openapi.json v1.0.0 lists /prediction, /complex, /uniprot/summary,
// /sequence/summary and /annotations). Only the q=* type=main form was checked:
// type=complex returned a figure that matches neither the complex count nor the
// total, and type=all returned HTTP 500. So the one verified form is used and
// numFoundExact is required, or the source goes dark.

export const URL_SEARCH = 'https://alphafold.ebi.ac.uk/api/search?q=*&type=main&start=0&rows=0';

// The EBI's own release note says "over 200 million entries". A total below that
// is a changed or broken search, not a shrinking database.
export const SANITY_FLOOR = 200_000_000;

export default {
  id: 'alphafold-db-entries',
  side: 'benefit',
  // "predicted" is on the future-tense list (VOICE.md §3.1); "predictions" is the
  // permitted noun and means the same thing here (VOICE.md §5.6).
  label: 'AlphaFold DB structure predictions, single-chain plus complexes (total)',
  endpoint: URL_SEARCH,
  keyless: true,
  windowed: false,
  ai_specific: true,
  context_only: true,
  counts: 'Structure predictions the AlphaFold Protein Structure Database search returns, single chains and complexes together.',
  does_not_count:
    'Experimental structures, validated structures, or anything a prediction was used for. A prediction is not a drug. ' +
    'The total jumps whenever a provider batch lands, so a rise says a batch landed.',

  async collect(net) {
    const body = await net.json(URL_SEARCH);
    const n = body?.numFound;
    if (!Number.isInteger(n)) {
      throw new Error(`alphafold-db-entries: expected an integer .numFound, got ${JSON.stringify(n)} (${URL_SEARCH})`);
    }
    // An inexact count is a lower bound the search engine gave up refining. It is
    // a different number, so it is not published as this one.
    if (body.numFoundExact !== true) {
      throw new Error(`alphafold-db-entries: numFoundExact is ${JSON.stringify(body.numFoundExact)}, not true — refusing an inexact total`);
    }
    if (n < SANITY_FLOOR) {
      throw new Error(`alphafold-db-entries: ${n} is below the sanity floor of ${SANITY_FLOOR}; the search changed, not the database`);
    }
    return { value: n, unit: 'structure predictions', meta: { num_found_exact: true } };
  },
};
