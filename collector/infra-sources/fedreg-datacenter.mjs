// How many documents in the Federal Register mentioned "data center" over the
// last hundred and eighty days.
//
// The Federal Register is the daily journal of the United States government:
// proposed rules, final rules, notices, presidential documents. When siting,
// interconnection, tax treatment, export control or federal procurement touches
// datacentres, it passes through here, in public, on a fixed schedule, with a
// citable document number. It is the slowest instrument in this index and the
// only one that measures the state rather than the market.
//
// WHY IT IS HERE AT ALL WHEN THE TWO SEC SOURCES ARE SHARPER. Redundancy of
// host. Both SEC adapters read efts.sec.gov; one WAF change takes the entire
// buildout pillar dark at once, and a pillar with no live source is a pillar
// with no score. This is a second building, run by a different agency, on a
// different domain, answering a related question. It is here so that the pillar
// can lose a host and keep reporting.
//
// WHAT IT CANNOT TELL YOU, AND THIS ONE IS BAD ENOUGH TO PRINT ON THE PAGE. The
// phrase "data center" appears in the Federal Register for reasons that have
// nothing to do with the AI build-out: the National Climatic Data Center, the
// EPA's own data centres, federal facility consolidation notices, and every
// agency that has the words in the name of a building. This is the noisiest
// source in the index by some distance. It is published with that caveat
// attached rather than quietly weighted down, because a reader who spots the
// problem before we admit it has learned something about the whole page.
//
// Verified 2026-09-23: 2,066 documents since 2019-01-01, paginated at 1,000.

import { finite, isoDay } from './_util.mjs';

const ENDPOINT = 'https://www.federalregister.gov/api/v1/documents.json';

const TERM = 'data center';
const WINDOW_DAYS = 180;
const BASELINE_YEARS = 5;
const STEP_DAYS = 7;       // one baseline point per week
const PER_PAGE = 1000;     // the service's documented maximum

// If the corpus outgrows this the baseline would be silently truncated at the
// oldest end, which tilts every percentile. Five pages is 5,000 documents and
// roughly double the present volume; blowing through it should stop the source,
// not quietly change what it measures.
const MAX_PAGES = 5;

function daysAgo(ms, n) {
  return new Date(ms - n * 86_400_000);
}

export default {
  id: 'fedreg-datacenter',
  pillar: 'buildout',
  label: 'Federal Register documents saying "data center"',
  region: 'US federal government',
  unitLabel: 'documents / 180d',
  cadence: 'daily, on the federal publication calendar',
  direction: 'higher = more federal paperwork touching datacentres',

  async collect(net) {
    const nowMs = Date.now();
    const since = isoDay(new Date(Date.UTC(
      new Date(nowMs).getUTCFullYear() - BASELINE_YEARS,
      new Date(nowMs).getUTCMonth(),
      new Date(nowMs).getUTCDate(),
    )));

    const dates = [];
    let pages = 0;
    let reported = null;

    for (let page = 1; page <= MAX_PAGES; page++) {
      const qs = new URLSearchParams({
        'conditions[term]': `"${TERM}"`,
        'conditions[publication_date][gte]': since,
        per_page: String(PER_PAGE),
        order: 'oldest',
        page: String(page),
      });
      qs.append('fields[]', 'publication_date');

      const body = await net.json(`${ENDPOINT}?${qs}`);
      const results = body?.results;
      if (!Array.isArray(results)) {
        throw new Error(
          `fedreg-datacenter: page ${page} carried no results array ` +
          `(keys: ${Object.keys(body ?? {}).join(',') || 'none'})`
        );
      }
      pages = page;
      if (reported === null && Number.isFinite(body?.count)) reported = body.count;

      for (const r of results) {
        const d = String(r?.publication_date ?? '');
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) dates.push(Date.parse(`${d}T00:00:00Z`));
      }

      const totalPages = Number(body?.total_pages);
      if (!Number.isFinite(totalPages) || page >= totalPages) break;
      if (page === MAX_PAGES && totalPages > MAX_PAGES) {
        throw new Error(
          `fedreg-datacenter: corpus is ${totalPages} pages, over the ${MAX_PAGES}-page cap ` +
          `(${reported} documents since ${since}); the window must be shortened before ` +
          `this source can be scored without silently truncating its own baseline`
        );
      }
    }

    if (dates.length === 0) {
      throw new Error(`fedreg-datacenter: no documents matching "${TERM}" since ${since}`);
    }
    dates.sort((a, b) => a - b);

    /** Documents published in the WINDOW_DAYS ending at `endMs`. */
    const windowCount = (endMs) => {
      const startMs = endMs - WINDOW_DAYS * 86_400_000;
      let n = 0;
      for (const t of dates) { if (t > startMs && t <= endMs) n++; }
      return n;
    };

    const value = windowCount(nowMs);

    // Weekly anchors, oldest first, each one a full window inside the fetched
    // span. The windows overlap by design — a rolling count is what the value
    // is, so the baseline has to be made of the same thing. The overlap makes
    // successive baseline points strongly autocorrelated, which means the
    // EFFECTIVE sample size is far below the point count. docs/INFRA.md says so.
    const earliest = dates[0] + WINDOW_DAYS * 86_400_000;
    const baseline = [];
    for (let end = nowMs - STEP_DAYS * 86_400_000; end >= earliest; end -= STEP_DAYS * 86_400_000) {
      baseline.push(windowCount(end));
    }
    baseline.reverse();

    return {
      value: finite(value, 'fedreg-datacenter window count'),
      unit: 'documents/180d',
      observed_at: new Date(nowMs).toISOString(),
      baseline: {
        values: baseline,
        source: 'the same 180-day rolling count taken at weekly anchors across the fetched corpus',
        span: `${isoDay(new Date(earliest))} to ${isoDay(daysAgo(nowMs, STEP_DAYS))}`,
        note:
          'windows overlap, so these points are strongly autocorrelated and the effective ' +
          'sample size is much smaller than the count',
      },
      meta: {
        term: TERM,
        window_days: WINDOW_DAYS,
        window_start: isoDay(daysAgo(nowMs, WINDOW_DAYS)),
        window_end: isoDay(new Date(nowMs)),
        corpus_since: since,
        corpus_documents: dates.length,
        corpus_reported_count: reported,
        pages_fetched: pages,
        baseline_points: baseline.length,
        direction: 'higher = more federal documents mention datacentres',
        source_note:
          'the noisiest source in this index: "data center" also matches the National ' +
          'Climatic Data Center, federal facility consolidation notices and every agency ' +
          'building with the words in its name',
      },
    };
  },
};
