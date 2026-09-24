// SEC EDGAR full-text search, used for what it can actually support.
//
// THE THING THAT DOES NOT WORK, AND WHY IT IS WRITTEN DOWN RATHER THAN QUIETLY
// OMITTED. EDGAR full-text search returns, per hit: the filer's name and CIK,
// the form type, the filing date, and `biz_locations` — which is the FILER'S
// REGISTERED HEAD OFFICE. Measured 2026-09-24, the top hits for "data center"
// were Stark Focus Group (Calgary) and PRF Technologies (Tel Aviv). Head office
// is not site. Pinning a datacentre at a filer's HQ would be fabrication with a
// citation attached, which is worse than no pin.
//
// WHAT IT DOES SUPPORT: corroboration at the OPERATOR level. When a company
// that operates datacentres on this map filed documents saying "data centers"
// in the last thirty days, that is a real, dated, citable fact about that
// operator, and attaching it to their sites tells a reader something the map
// otherwise cannot. It adds no pins and moves no pin.

import { secFullTextCount, SEC_UA } from '../infra-sources/_sec.mjs';

const ENDPOINT = 'https://efts.sec.gov/LATEST/search-index';
const PHRASE = 'data centers';
const WINDOW_DAYS = 30;
const MAX_HITS = 100;

export default {
  id: 'sec-operators',
  label: 'SEC filings saying "data centers", joined to operators',
  endpoint: ENDPOINT,
  keyless: true,
  refresh_days: 0,
  gives: 'operator-level corroboration; no pins, no coordinates',

  async collect(net) {
    // The count first, and with it the saturation guard from _sec.mjs. A
    // saturated counter is a censored pipe and this adapter reports it as one.
    const counted = await secFullTextCount(net, { id: 'sec-operators', phrase: PHRASE, windowDays: WINDOW_DAYS });

    const qs = new URLSearchParams({
      q: `"${PHRASE}"`,
      dateRange: 'custom',
      startdt: counted.startdt,
      enddt: counted.enddt,
      from: '0',
    });
    // Both traps from collector/infra-sources/_sec.mjs apply: the User-Agent
    // must not contain a URL, and the header key must be lowercase or undici
    // joins it to the default instead of replacing it.
    const body = await net.json(`${ENDPOINT}?${qs}`, { headers: { 'user-agent': SEC_UA } });
    const hits = Array.isArray(body?.hits?.hits) ? body.hits.hits.slice(0, MAX_HITS) : [];

    const filers = new Map();
    for (const h of hits) {
      const display = h?._source?.display_names?.[0];
      if (typeof display !== 'string') continue;
      // "Microsoft Corp  (MSFT)  (CIK 0000789019)" -> "Microsoft Corp"
      const name = display.replace(/\s*\(.*$/, '').trim();
      if (!name) continue;
      const cik = h._source.ciks?.[0] ?? null;
      const rec = filers.get(name) ?? { name, cik, filings: 0, forms: new Set(), latest: null };
      rec.filings++;
      if (h._source.form) rec.forms.add(h._source.form);
      const d = h._source.file_date ?? null;
      if (d && (!rec.latest || d > rec.latest)) rec.latest = d;
      filers.set(name, rec);
    }

    return {
      sites: [],
      filers: [...filers.values()]
        .map((f) => ({ ...f, forms: [...f.forms].sort() }))
        .sort((a, b) => b.filings - a.filings || a.name.localeCompare(b.name)),
      meta: {
        origin: 'network',
        error: null,
        phrase: PHRASE,
        window_days: WINDOW_DAYS,
        window: `${counted.startdt} to ${counted.enddt}`,
        total_filings: counted.value,
        hits_read: hits.length,
        distinct_filers: filers.size,
        note:
          'EDGAR gives the filer’s registered head office, not the site — Stark Focus Group filed ' +
          'from Calgary and PRF Technologies from Tel Aviv. This source adds no pins by design.',
      },
    };
  },
};
