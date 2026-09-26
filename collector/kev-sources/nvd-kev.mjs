// NVD, filtered to exactly the KEV set — the publication side of the join.
//
// WHY THIS SOURCE EXISTS. CISA's catalogue carries no publication or disclosure
// date (see ./cisa-kev.mjs). Without one there is no interval to measure. NVD
// carries `cve.published`, and NVD's 2.0 API has a `hasKev` filter that returns
// exactly the CVEs CISA has catalogued — so one request lines the two files up
// with no guessing about which subset we are looking at.
//
//   https://services.nvd.nist.gov/rest/json/cves/2.0?hasKev&resultsPerPage=2000
//
// PROBED LIVE 2026-09-26: HTTP 200, 18.7 MB, totalResults 1726, and the whole
// set came back in ONE page. 2000 is the API's documented maximum page size and
// the KEV set is under it, so there is no pagination path here and no
// rate-limit problem to solve. If NVD's cap or the KEV set ever moves past
// 2,000 this adapter will say so loudly rather than silently truncate — see
// the totalResults check below. It does not paginate, because writing an
// untested pagination loop is worse than a clear error.
//
// NO API KEY. NVD offers keys for higher rate limits. Two requests per run does
// not need one, and CONTRACT.md §3 says no secrets anywhere, so there is none.
//
// WHAT WE TAKE. `cve.id` and `cve.published`, and nothing else — no CVSS, no
// CWE, no references. The measurement is a date arithmetic and everything else
// would be weight in a committed file.
//
// A NOTE ON WHAT `published` MEANS. It is the date the CVE record was published
// in the National Vulnerability Database. It is a good, dated, checkable proxy
// for "the vulnerability became publicly known" and it is not the same thing:
// a vendor advisory, an exploit in the wild or a conference talk can all
// precede it, and occasionally a CVE is published after exploitation is already
// under way — which is exactly why some lags in the joined table are negative.
// Those are kept and shown, never clamped to zero.
//
// LICENCE. NVD data is produced by NIST, a US Government agency: public domain,
// free to use with attribution requested, no key and no terms to accept.

export const URL_NVD =
  'https://services.nvd.nist.gov/rest/json/cves/2.0?hasKev&resultsPerPage=2000';

// The documented per-page maximum. If totalResults exceeds it, one request is
// no longer the whole set and this adapter must not pretend otherwise.
export const PAGE_SIZE = 2000;

// 18.7 MB. The 15 s default times out on anything but a fast link.
const TIMEOUT_MS = 180_000;

export default {
  id: 'nvd-haskev',
  label: 'NVD CVE records for the KEV set (cve.published)',
  url: URL_NVD,
  keyless: true,
  gives: 'cve.published per cveID, for exactly the CVEs CISA has catalogued',
  licence: {
    data: 'US Government work, public domain; NIST requests attribution',
    attribution: 'National Vulnerability Database (NVD), NIST',
    url: 'https://nvd.nist.gov/developers/vulnerabilities',
  },

  /** Returns { published: Map<cveID, 'YYYY-MM-DD'>, meta } or throws. One request. */
  async collect(net) {
    const body = await net.json(URL_NVD, { timeoutMs: TIMEOUT_MS });

    const items = Array.isArray(body?.vulnerabilities) ? body.vulnerabilities : null;
    if (!items) {
      throw new Error(
        `nvd-haskev: no \`vulnerabilities\` array in the response (keys: ${Object.keys(body ?? {}).join(', ') || 'none'})`,
      );
    }

    const total = Number.isFinite(body.totalResults) ? body.totalResults : null;
    if (total !== null && total > PAGE_SIZE) {
      throw new Error(
        `nvd-haskev: totalResults ${total} exceeds the ${PAGE_SIZE}-row page maximum, so this ` +
          'single request is no longer the whole set. This adapter deliberately does not ' +
          'paginate — add and test a pagination loop rather than publishing a partial join.',
      );
    }
    if (total !== null && items.length !== total) {
      throw new Error(
        `nvd-haskev: got ${items.length} records but totalResults says ${total}. Refusing to ` +
          'join a set that does not agree with its own header.',
      );
    }

    const published = new Map();
    const malformed = [];
    let duplicates = 0;
    for (const item of items) {
      const cve = typeof item?.cve?.id === 'string' ? item.cve.id.trim() : '';
      const pub = typeof item?.cve?.published === 'string' ? item.cve.published.trim() : '';
      // NVD publishes an ISO-ish local timestamp, e.g. "2026-08-19T10:15:00.000".
      // Only the calendar date is used; see collector/exploits.mjs for why.
      const day = pub.slice(0, 10);
      if (!/^CVE-\d{4}-\d{4,}$/.test(cve) || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
        malformed.push({ id: cve || null, published: pub || null });
        continue;
      }
      if (published.has(cve)) {
        // Two records for one id would make the join order-dependent. Keep the
        // earlier date, count the collision, and report it.
        duplicates++;
        if (day >= published.get(cve)) continue;
      }
      published.set(cve, day);
    }

    return {
      published,
      meta: {
        origin: 'network',
        error: null,
        total_results: total,
        records_seen: items.length,
        records_usable: published.size,
        records_malformed: malformed.length,
        malformed_examples: malformed.slice(0, 5),
        duplicate_ids: duplicates,
        page_size: PAGE_SIZE,
        paginated: false,
        format_version: typeof body.format === 'string' ? `${body.format} ${body.version ?? ''}`.trim() : null,
        // NVD's own timestamp for the response. Not our clock.
        nvd_timestamp: typeof body.timestamp === 'string' ? body.timestamp : null,
      },
    };
  },
};
