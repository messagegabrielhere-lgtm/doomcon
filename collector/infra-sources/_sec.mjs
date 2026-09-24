// Shared reader for SEC EDGAR full-text search, used by the two buildout
// adapters. Leading underscore: not an adapter, skipped by discovery.
//
// This endpoint is keyless and undocumented-but-stable, and collector/sources/
// sec-fts.mjs has been running against it since 2026-09-22. Two traps carried
// over from that file verbatim, because both are silent and both cost an
// afternoon to find:
//
//   1. SEC's WAF returns 403 for any User-Agent containing a URL. fetch.mjs's
//      default UA carries the repo link, so every SEC call must override it
//      with a contact-only string — which is what SEC's own access policy asks
//      for anyway.
//   2. The override key must be lowercase 'user-agent'. fetch.mjs builds
//      { 'user-agent': DEFAULT, ...opts.headers } and JS keys are
//      case-sensitive, so 'User-Agent' does not replace the default, it sits
//      beside it and undici joins the pair with a comma. The joined value still
//      contains the URL, so it still 403s, and the bug presents as "my header
//      was ignored".

const ENDPOINT = 'https://efts.sec.gov/LATEST/search-index';

export const SEC_UA = 'doomcon.watch collector (gabegtornberg@protonmail.com)';

function isoDate(ms) {
  // Slicing the ISO string keeps the window in UTC. toLocaleDateString would
  // shift it by a day for anyone west of Greenwich and make the series depend
  // on which machine ran the collector.
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Count of filings whose full text contains `phrase`, over a trailing window.
 * Returns { value, startdt, enddt, relation }. Throws on anything ambiguous.
 */
export async function secFullTextCount(net, { id, phrase, windowDays }) {
  const endMs = Date.now();
  const startdt = isoDate(endMs - windowDays * 86_400_000);
  const enddt = isoDate(endMs);

  const qs = new URLSearchParams({
    // Quoted so EDGAR matches a phrase. Unquoted, "data center" becomes
    // "data" OR "center" and the count stops meaning anything at all.
    q: `"${phrase}"`,
    dateRange: 'custom',
    startdt,
    enddt,
  });

  const body = await net.json(`${ENDPOINT}?${qs}`, { headers: { 'user-agent': SEC_UA } });

  const total = body?.hits?.total;
  if (!total || typeof total.value !== 'number' || !Number.isFinite(total.value)) {
    throw new Error(
      `${id}: no finite hits.total.value in response ` +
      `(keys: ${Object.keys(body ?? {}).join(',') || 'none'})`
    );
  }

  // THE TRAP. EDGAR's counter saturates at 10,000 and flips relation from "eq"
  // to "gte". A saturated count looks like a perfectly good number and would pin
  // this series flat forever once the phrase grows past the ceiling — a
  // confident reading over a censored pipe. Go dark instead, loudly.
  if (total.relation !== 'eq') {
    throw new Error(
      `${id}: hit count saturated at ${total.value} (relation="${total.relation}"); ` +
      `the ${windowDays}-day window must be narrowed before this source is trustworthy again`
    );
  }

  return { value: total.value, startdt, enddt, relation: total.relation };
}

export { ENDPOINT as SEC_ENDPOINT };
