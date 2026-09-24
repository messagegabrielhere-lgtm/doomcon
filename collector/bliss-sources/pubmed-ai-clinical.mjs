// MEDICINE pillar — the published clinical half.
//
// ClinicalTrials.gov counts trials STARTING. This counts results ARRIVING: papers
// entering PubMed that pair an AI method with a clinical use - diagnosis, imaging,
// screening, drug discovery. The two are the front and back of the same pipeline
// and they move years apart, which is why the pillar carries both rather than
// treating either as the whole story.
//
// NCBI's E-utilities are free, keyless and return an exact count. The window is on
// EDAT (Entrez date - when the record entered PubMed) rather than publication date,
// because publication dates in PubMed are frequently the journal issue date and can
// predate indexing by months; filtering on them would make a "trailing 30 days"
// window quietly mean "whatever was published in a window that already closed".
//
// Measured 2026-09-24: 484 records over a 14-day EDAT window.

const ENDPOINT = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';

const WINDOW_DAYS = 30;

// NCBI ask every automated client to identify itself with a tool name so they can
// contact the operator instead of silently blocking the IP. No email and no API
// key: CONTRACT.md §1.3 - there are no secrets in this repo - and an operator's
// address is not ours to hand to a third party.
const TOOL = 'doomcon-bliss';

const AI_TERMS = ['"artificial intelligence"', '"machine learning"', '"deep learning"'];
const CLINICAL_TERMS = ['diagnosis', '"drug discovery"', 'screening', 'prognosis'];

/** PubMed date filters want YYYY/MM/DD. */
function day(date) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}/${p(date.getUTCMonth() + 1)}/${p(date.getUTCDate())}`;
}

export default {
  id: 'pubmed-ai-clinical',
  pillar: 'medicine',
  label: 'PubMed AI-in-clinical-practice records',

  async collect(fetchJson) {
    const observedAt = new Date();
    const from = day(new Date(observedAt.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000));
    const to = day(observedAt);

    // [Title/Abstract] on both groups. Without the field tag PubMed expands the
    // terms through MeSH, which pulls in every paper whose subject headings brush
    // against "diagnosis" - a much larger and much vaguer set.
    const ai = AI_TERMS.map((t) => `${t}[Title/Abstract]`).join(' OR ');
    const clinical = CLINICAL_TERMS.map((t) => `${t}[Title/Abstract]`).join(' OR ');
    const term = `(${ai}) AND (${clinical}) AND ("${from}"[EDAT] : "${to}"[EDAT])`;

    const url =
      `${ENDPOINT}?db=pubmed&retmode=json&rettype=count` +
      `&tool=${encodeURIComponent(TOOL)}&term=${encodeURIComponent(term)}`;

    const body = await fetchJson(url);

    // E-utilities return the count as a STRING ("484"). Number() it explicitly
    // rather than let it reach the engine, where a string would fail the finite
    // check in collect and take the source dark for the wrong reason.
    const raw = body?.esearchresult?.count;
    if (typeof raw !== 'string' && !Number.isFinite(raw)) {
      const err = body?.esearchresult?.ERROR ?? body?.ERROR;
      throw new Error(
        `pubmed-ai-clinical: no .esearchresult.count from ${url} ` +
          `(got ${JSON.stringify(raw)}${err ? `, NCBI said: ${err}` : ''}) — API shape changed`,
      );
    }
    const value = Number(raw);
    if (!Number.isFinite(value)) {
      throw new Error(`pubmed-ai-clinical: count "${raw}" is not a finite number`);
    }

    if (value === 0) {
      throw new Error(
        `pubmed-ai-clinical: 0 records over a ${WINDOW_DAYS}d EDAT window — implausible against ` +
          `a measured 484/14d, treating the term syntax as broken rather than reporting a zero (${url})`,
      );
    }

    return {
      value,
      unit: `records/${WINDOW_DAYS}d`,
      observed_at: observedAt.toISOString(),
      meta: {
        window_days: WINDOW_DAYS,
        edat_from: from,
        edat_to: to,
        ai_terms: AI_TERMS,
        clinical_terms: CLINICAL_TERMS,
        date_field: 'EDAT (Entrez date, i.e. when PubMed indexed it)',
      },
    };
  },
};
