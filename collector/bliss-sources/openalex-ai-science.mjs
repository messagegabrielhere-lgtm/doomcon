// SCIENCE pillar — the peer-reviewed half of the same question arXiv answers.
//
// arXiv is the preprint heartbeat: fast, free, and skewed toward the disciplines
// that preprint. OpenAlex indexes the published literature across every discipline
// including the ones that never touch arXiv — chemistry and clinical materials
// science in particular — so the two sources disagree in useful ways and neither
// one alone would carry the pillar.
//
// It is also a genuinely independent failure domain. That matters more here than
// anywhere else in this file: arXiv throttles hard and often, and a SCIENCE pillar
// with one source is a pillar that goes dark on arXiv's bad afternoon, which under
// the honesty rule freezes the whole BLISS level. Two sources, two operators.
//
// Measured 2026-09-24: 93 works over 30 days. Sampled titles were "AI-enhanced
// adaptive virtual screening of large libraries for ligand discovery" and
// "Machine Learning-Based Discovery of Natural PknB Inhibitors Against
// Drug-Resistant Mycobacterium tuberculosis" — i.e. the query matches applied
// AI-for-science work, not papers about AI.

const WINDOW_DAYS = 30;

const ENDPOINT = 'https://api.openalex.org/works';

// THE OPERATOR BUDGET IS A HARD DESIGN CONSTRAINT, not a style choice.
// Measured 2026-09-24: OpenAlex answers a 6-operator anonymous search with
// HTTP 429 and the message "queries with more than 5 operators are limited to
// 1 request per second per client". At 3 operators the same query answers in
// ~390ms. Widening this phrase list past five OR/AND tokens moves the source
// into the throttled tier and it will go dark on most runs. Count before editing.
const METHOD_TERMS = ['machine learning', 'deep learning'];
const DOMAIN_TERMS = ['protein structure', 'materials discovery'];

/** YYYY-MM-DD, which is the only date form the filter accepts. */
function day(date) {
  return date.toISOString().slice(0, 10);
}

export default {
  id: 'openalex-ai-science',
  pillar: 'science',
  label: 'OpenAlex AI-in-science articles',

  async collect(fetchJson) {
    const observedAt = new Date();
    const from = day(new Date(observedAt.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000));
    const to = day(observedAt);

    // 3 boolean operators: one OR in each group, one AND between them. See the
    // note on METHOD_TERMS above before adding a term.
    const search = `(${METHOD_TERMS.join(' OR ')}) AND (${DOMAIN_TERMS.join(' OR ')})`;

    // type:article excludes datasets, errata, editorials and retractions, which
    // otherwise pad the count with things that are not results.
    const filter = [
      `from_publication_date:${from}`,
      `to_publication_date:${to}`,
      'type:article',
      `title_and_abstract.search:${encodeURIComponent(search)}`,
    ].join(',');

    const url = `${ENDPOINT}?filter=${filter}&per-page=1`;

    const body = await fetchJson(url);

    const count = body?.meta?.count;
    if (!Number.isFinite(count)) {
      throw new Error(
        `openalex-ai-science: expected a finite .meta.count from ${url}, got ` +
          `${JSON.stringify(count)} — API shape changed, refusing to guess`,
      );
    }

    // Zero over 30 days across the whole published literature is not a quiet
    // month, it is a broken filter. OpenAlex changing its search syntax would
    // present exactly this way, and a silent zero would drag the pillar down and
    // read as "AI stopped helping science".
    if (count === 0) {
      throw new Error(
        `openalex-ai-science: 0 works over ${WINDOW_DAYS}d for "${search}" — implausible, ` +
          `treating the search filter as broken rather than reporting a zero (${url})`,
      );
    }

    return {
      value: count,
      unit: `works/${WINDOW_DAYS}d`,
      observed_at: observedAt.toISOString(),
      meta: {
        window_days: WINDOW_DAYS,
        window_from: from,
        window_to: to,
        search,
        boolean_operators: 3,
      },
    };
  },
};
