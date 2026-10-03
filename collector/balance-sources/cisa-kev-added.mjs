// HARM side, CONTEXT ONLY — CISA KEV entries added in the window. NOT AN AI MEASURE.
//
// It counts vulnerabilities in any software that the US government catalogued as
// exploited in the wild. It is here because it is the one keyless, dated,
// government register of observed exploitation, and a page about harm without
// it has no baseline for "how much exploitation gets catalogued in a month". It
// must be printed as context and labelled not-AI, or left off.
//
// dateAdded is when CISA wrote the entry down, not when exploitation happened
// (docs/EXPLOITS.md). The fetch and the row validation are
// kev-sources/cisa-kev.mjs's, reused rather than restated, so the two pages can
// never disagree about what a usable row is.
//
// WHY A TRAILING WINDOW AND NOT "THIS MONTH". A calendar-month count drops to
// about zero on the 1st of every month, which reads as a collapse. The trailing
// window matches the other counters; the calendar-month count rides in meta.
//
// WHY NO AI SUBSET. A basket of AI-stack products (Langflow, LiteLLM, MLflow,
// Ray, n8n) read 12 all-time and 1 in 30 days on 2026-09-28: too sparse for a
// counter, and a basket would need freezing (BLISS.md §4 rule 6).

import cisaKev, { URL_KEV } from '../kev-sources/cisa-kev.mjs';

/** Entries added in [from, to] and in the calendar month `month` (YYYY-MM). Pure. */
export function countAdded(entries, { from, to, month }) {
  let inWindow = 0;
  let inMonth = 0;
  for (const e of entries) {
    if (e.dateAdded >= from && e.dateAdded <= to) inWindow += 1;
    if (e.dateAdded.startsWith(`${month}-`)) inMonth += 1;
  }
  return { inWindow, inMonth };
}

export default {
  id: 'cisa-kev-added-30d',
  side: 'harm',
  label: 'CISA KEV: vulnerabilities catalogued as exploited in the window (not AI-specific)',
  endpoint: URL_KEV,
  keyless: true,
  windowed: true,
  ai_specific: false,
  context_only: true,
  counts: 'Entries CISA added to its Known Exploited Vulnerabilities catalogue inside the window, for any vendor and any product.',
  does_not_count:
    'Anything specific to AI. When exploitation happened: dateAdded is the cataloguing date. Exploitation the US ' +
    'government did not observe, or did not publish.',

  async collect(net, { from, to }) {
    const { entries, meta } = await cisaKev.collect(net);
    const month = to.slice(0, 7);
    const { inWindow, inMonth } = countAdded(entries, { from, to, month });
    // 43 in the verified window; CISA adds entries on most weekdays.
    if (inWindow === 0) {
      throw new Error(`cisa-kev-added-30d: 0 entries added between ${from} and ${to} — implausible for a catalogue that grows most weekdays`);
    }
    return {
      value: inWindow,
      unit: 'vulnerabilities catalogued',
      meta: {
        this_month: { month, count: inMonth },
        catalog_version: meta.catalog_version,
        // CISA's own release timestamp for this build of the file. Not our clock.
        date_released: meta.date_released,
        count_declared: meta.count_declared,
        rows_usable: meta.rows_usable,
        rows_malformed: meta.rows_malformed,
      },
    };
  },
};
