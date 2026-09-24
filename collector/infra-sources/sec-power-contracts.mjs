// How many SEC filings said "power purchase agreement" in the last ninety days.
//
// A power purchase agreement is the instrument by which a company that is not a
// utility buys electricity in bulk, for years, at a fixed price. It is the
// contract a hyperscaler signs before it pours a foundation, and it is signed
// long before any of it is visible as a building. Of everything in this index it
// is the earliest signal, because it is the one that has to happen first.
//
// WHY NINETY DAYS AND NOT THIRTY. Measured 2026-09-23: the phrase returned 70
// filings over thirty days. Counting events at seventy, the ordinary Poisson
// noise is about eight — twelve per cent — which is larger than most of the
// movement worth reading. Ninety days puts roughly two hundred filings in the
// window and cuts that to about seven per cent, at the cost of a slower series.
// For a quantity whose real-world cadence is board meetings and quarterly
// disclosure, slow is the correct trade.
//
// WHAT IT CANNOT TELL YOU. PPAs are signed by steel mills, hospitals, airlines
// and universities, and nothing in a full-text count separates a datacentre's
// from a smelter's. Read alongside sec-datacenter it is a sharper instrument
// than either is alone; read by itself it is a measure of American corporate
// electricity procurement, which is a real thing but not this one.

import { secFullTextCount } from './_sec.mjs';
import { finite } from './_util.mjs';

const PHRASE = 'power purchase agreement';
const WINDOW_DAYS = 90;

export default {
  id: 'sec-power-contracts',
  pillar: 'buildout',
  label: 'SEC filings saying "power purchase agreement"',
  region: 'US public companies',
  unitLabel: 'filings / 90d',
  cadence: 'continuous; EDGAR indexes on filing',
  direction: 'higher = more bulk electricity being contracted for',

  async collect(net) {
    const r = await secFullTextCount(net, {
      id: 'sec-power-contracts', phrase: PHRASE, windowDays: WINDOW_DAYS,
    });

    return {
      value: finite(r.value, 'sec-power-contracts hit count'),
      unit: 'filings/90d',
      observed_at: new Date().toISOString(),
      meta: {
        phrase: PHRASE,
        window_days: WINDOW_DAYS,
        startdt: r.startdt,
        enddt: r.enddt,
        relation: r.relation,
        direction: 'higher = more bulk power contracted',
        source_note:
          'efts.sec.gov full-text search; PPAs are signed by every heavy industry, ' +
          'and nothing in a phrase count separates a datacentre’s from a smelter’s',
      },
    };
  },
};
