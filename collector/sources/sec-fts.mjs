// SEC EDGAR full-text search: how often US public companies say "artificial
// intelligence" in their filings. Corporate AI mention velocity — a disclosure
// signal, not a price signal, which is why it sits in the compute/capital
// pillar rather than markets: filings track where money is being committed.
//
// Endpoint is keyless and undocumented-but-stable. Verified 2026-09-22:
// a trailing-30-day window returns hits.total.value = 3585, relation "eq".

import { secFetchJson } from '../infra-sources/_sec.mjs';

const ENDPOINT = 'https://efts.sec.gov/LATEST/search-index';

// The phrase is quoted so EDGAR matches it as a phrase, not as two loose terms.
// Unquoted, "artificial" OR "intelligence" drags in every intelligence-agency
// contractor and the count stops meaning anything.
const QUERY = '"artificial intelligence"';

const WINDOW_DAYS = 30;

// EDGAR wants plain YYYY-MM-DD. Slicing the ISO string keeps this in UTC; using
// toLocaleDateString would silently shift the window by a day for anyone west
// of Greenwich and make the series non-reproducible across machines.
function isoDate(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

export default {
  id: 'sec-fts',
  pillar: 'compute',
  label: 'SEC filings mentioning AI (30d)',

  async collect(fetchJson) {
    const endMs = Date.now();
    const startMs = endMs - WINDOW_DAYS * 86400_000;
    const startdt = isoDate(startMs);
    const enddt = isoDate(endMs);

    const qs = new URLSearchParams({
      q: QUERY,
      dateRange: 'custom',
      startdt,
      enddt,
    });

    // Contact, header casing, and the 403 retry live in _sec.mjs. An unset
    // SEC_CONTACT_EMAIL (the Actions secret arrives as "") must not fall
    // through to a GitHub noreply address: that string is what 403s.
    const body = await secFetchJson(fetchJson, `${ENDPOINT}?${qs}`);

    const total = body?.hits?.total;
    if (!total || typeof total.value !== 'number') {
      throw new Error(
        `sec-fts: no hits.total.value in response (got keys: ${Object.keys(body ?? {}).join(',') || 'none'})`
      );
    }

    // THE TRAP. EDGAR's counter saturates at 10000 and flips relation from
    // "eq" to "gte". A saturated count looks like a perfectly good number and
    // would pin this series flat at 10000 forever once AI chatter grows past
    // the ceiling — a confident reading over a censored pipe, which is exactly
    // the failure this project exists to not repeat. Go dark instead, loudly.
    if (total.relation !== 'eq') {
      throw new Error(
        `sec-fts: hit count saturated at ${total.value} (relation="${total.relation}"); ` +
        `the ${WINDOW_DAYS}d window must be narrowed before this source is trustworthy again`
      );
    }

    if (!Number.isFinite(total.value)) {
      throw new Error(`sec-fts: non-finite hit count ${total.value}`);
    }

    return {
      value: total.value,
      unit: 'filings/30d',
      observed_at: new Date(endMs).toISOString(),
      meta: {
        query: QUERY,
        window_days: WINDOW_DAYS,
        startdt,
        enddt,
        relation: total.relation,
        source_note: 'efts.sec.gov full-text search; total hit count, not a page of rows',
      },
    };
  },
};
