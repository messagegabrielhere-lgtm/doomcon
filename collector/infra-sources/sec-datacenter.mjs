// How many SEC filings said "data centers" in the last thirty days.
//
// This is the money half of the substrate. Power and water are what a training
// cluster consumes; this is what it costs, and it is the one part of the story
// that American public companies are legally obliged to write down. A company
// can decline to say how large its next model is. It cannot decline to tell its
// shareholders it is committing forty billion dollars to buildings full of
// racks.
//
// WHY THE PLURAL. Measured 2026-09-23 over the same thirty-day window:
// "data center" returned 1,615 filings and "data centers" returned 2,072. The
// plural is both the larger count and the more specifically infrastructural
// phrase — a company discussing its estate writes "our data centers", while
// "data center" alone catches a great deal of ordinary corporate IT and every
// organisation with "Data Center" in its name. The larger, noisier phrase would
// have been the tempting pick; this is the narrower one that still has volume.
//
// WHAT IT CANNOT TELL YOU. It is a count of documents, not of dollars, and it
// counts every public company including the ones leasing a single cage. It also
// carries EDGAR's own filing calendar inside it: the 10-K season in February and
// March lifts every full-text count regardless of what anyone is building. That
// seasonality is real, it is in the baseline once the baseline exists, and it is
// why this source is one of eight rather than a headline.

import { secFullTextCount } from './_sec.mjs';
import { finite } from './_util.mjs';

const PHRASE = 'data centers';
const WINDOW_DAYS = 30;

export default {
  id: 'sec-datacenter',
  pillar: 'buildout',
  label: 'SEC filings saying "data centers"',
  region: 'US public companies',
  unitLabel: 'filings / 30d',
  cadence: 'continuous; EDGAR indexes on filing',
  direction: 'higher = more disclosed datacentre activity',

  async collect(net) {
    const r = await secFullTextCount(net, { id: 'sec-datacenter', phrase: PHRASE, windowDays: WINDOW_DAYS });

    return {
      value: finite(r.value, 'sec-datacenter hit count'),
      unit: 'filings/30d',
      observed_at: new Date().toISOString(),
      meta: {
        phrase: PHRASE,
        window_days: WINDOW_DAYS,
        startdt: r.startdt,
        enddt: r.enddt,
        relation: r.relation,
        direction: 'higher = more filings mention datacentres',
        source_note:
          'efts.sec.gov full-text search; a count of matching filings, not of dollars, ' +
          'and it carries EDGAR’s own filing calendar — 10-K season lifts every phrase',
      },
    };
  },
};
