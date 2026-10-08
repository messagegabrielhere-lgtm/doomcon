// Shared reader for SEC EDGAR full-text search, used by the two buildout
// adapters. Leading underscore: not an adapter, skipped by discovery.
//
// This endpoint is keyless and undocumented-but-stable, and collector/sources/
// sec-fts.mjs has been running against it since 2026-09-22. The traps below
// are silent and each one costs an afternoon to find:
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
//   3. As of 2026-10-07 the same WAF also 403s any User-Agent containing the
//      substring "github". The GitHub noreply address trips it, and that 403
//      is what took the compute pillar dark. A dotted product name such as
//      "doomcon.watch" is read as a URL and 403s the same way. The contact
//      below is the one the investors workflow already sends.

const ENDPOINT = 'https://efts.sec.gov/LATEST/search-index';

// Published on the investors workflow. Used whenever SEC_CONTACT_EMAIL is
// unset, blank, or itself a string the WAF refuses.
const FALLBACK_CONTACT = 'messagegabrielhere@gmail.com';

/**
 * A contact SEC will accept. `SEC_CONTACT_EMAIL` may override the fallback,
 * but an empty value, a URL, whitespace, or the substring "github" is ignored:
 * those are exactly the strings that 403, and an unset Actions secret arrives
 * as an empty string.
 */
export function secContact(raw = process.env.SEC_CONTACT_EMAIL) {
  const value = String(raw ?? '').trim();
  if (!value || /github/i.test(value) || /https?:\/\//i.test(value) || /\s/.test(value)) {
    return FALLBACK_CONTACT;
  }
  return value;
}

/**
 * User-Agents tried in order. The first is the string a live probe returned
 * 200 for on 2026-10-07. The later two are the shapes SEC's own example and
 * the 2026-09-22 bisect accepted. Only a 403 advances to the next one.
 */
export function secUserAgents(contact = secContact()) {
  return [
    `doomcon ${contact}`,
    `SIREN AI Index ${contact}`,
    `SIREN/1.0 (${contact})`,
  ];
}

export const SEC_UA = secUserAgents()[0];

function isSecForbidden(err) {
  if (err && err.status === 403) return true;
  return /\b403\b/.test(String(err && err.message));
}

/**
 * GET JSON from EDGAR, replacing the User-Agent on each attempt. A caller
 * header named user-agent is overwritten so the default repo URL cannot leak
 * back in beside it.
 */
export async function secFetchJson(fetchJson, url, opts = {}) {
  const { headers: extra = {}, ...rest } = opts;
  let lastErr;
  for (const ua of secUserAgents()) {
    try {
      return await fetchJson(url, {
        ...rest,
        headers: { ...extra, 'user-agent': ua },
      });
    } catch (err) {
      lastErr = err;
      if (!isSecForbidden(err)) throw err;
    }
  }
  throw lastErr;
}

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

  const body = await secFetchJson((url, opts) => net.json(url, opts), `${ENDPOINT}?${qs}`);

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
