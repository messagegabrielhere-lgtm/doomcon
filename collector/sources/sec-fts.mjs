// SEC EDGAR full-text search: how often US public companies say "artificial
// intelligence" in their filings. Corporate AI mention velocity — a disclosure
// signal, not a price signal, which is why it sits in the compute/capital
// pillar rather than markets: filings track where money is being committed.
//
// Endpoint is keyless and undocumented-but-stable. Verified 2026-09-22:
// a trailing-30-day window returns hits.total.value = 3585, relation "eq".

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

    // TWO TRAPS IN ONE LINE. Both were found by watching this request 403 in
    // Docker, and both will bite the next person who touches it.
    //
    // 1. SEC's WAF rejects any User-Agent containing a URL. Bisected against
    //    the live endpoint on 2026-09-22: "doomcon/1.0", "doomcon/1.0 <email>"
    //    and "doomcon/1.0 (<email>)" all return 200; add "(+https://github…)"
    //    and the byte-identical request returns 403 "Your Request Originates
    //    from an Undeclared Automated Tool". fetch.mjs's default USER_AGENT
    //    carries the repo URL, so this source cannot use the default — it has
    //    to send a contact-only UA, which is what SEC's policy asks for anyway.
    //
    // 2. The key must be lowercase 'user-agent'. fetch.mjs builds its headers
    //    as { 'user-agent': USER_AGENT, ...opts.headers }, and JS object keys
    //    are case-sensitive: 'User-Agent' does not overwrite 'user-agent', it
    //    survives next to it and undici joins the pair with a comma. The joined
    //    value still contains the URL, so it still 403s — the bug looks like
    //    "my override was ignored". Matching the helper's casing makes this a
    //    replacement rather than an append.
    const body = await fetchJson(`${ENDPOINT}?${qs}`, {
      headers: { 'user-agent': 'doomcon.watch collector (gabegtornberg@protonmail.com)' },
    });

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
