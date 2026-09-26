// CISA Known Exploited Vulnerabilities catalogue — the listing side of the join.
//
// WHAT IT IS. CISA publishes a catalogue of vulnerabilities it has determined
// are being exploited in the wild. Federal civilian agencies are required to
// remediate them by a due date; everyone else gets to read the list. It is the
// only keyless, dated, government-maintained register of *observed* exploitation
// that exists, which is why this measurement is built on it.
//
// WHAT IT GIVES US, and the whole reason it needs a second source:
//
//   dateAdded   — the day CISA put the CVE in the catalogue.
//
// and that is the ONLY date in the file. There is no disclosure date, no
// publication date, no first-seen-exploited date. Probed live 2026-09-26, the
// per-entry field set is exactly:
//
//   cveID, cwes, dateAdded, dueDate, forensicTriage,
//   knownRansomwareCampaignUse, notes, product, requiredAction,
//   shortDescription, vendorProject, vulnerabilityName
//
// So on its own the catalogue cannot answer "how long after a vulnerability
// became public was it seen being exploited?". It can only say when CISA wrote
// it down. The publication date comes from NVD — see ./nvd-kev.mjs — and the
// join key is cveID.
//
// ---------------------------------------------------------------------------
// THE LIMIT THAT GOVERNS EVERY NUMBER DOWNSTREAM
//
// `dateAdded` is a CATALOGUING date, not an exploitation date. It is when the
// US government published the fact, which is some unknown interval after
// somebody observed the fact, which is some unknown interval after exploitation
// began. The measurement built on it is therefore a lag on a lag, and CISA's
// own internal latency is not published and has no reason to be constant over
// time. This is stated on the page in the body text, not in a footnote, because
// it is the single biggest weakness of the whole exercise.
//
// Second limit: the catalogue records exploitation the US government observed
// AND chose to publish. It undercounts by an amount nobody outside CISA can
// estimate, and the undercount may vary by vendor, by sector and by year.
//
// SIZE. 1.75 MB, ~1,726 entries as of catalogueVersion 2026.09.25. One request,
// no pagination, no key, no quota. There is nothing here to cache or backfill.
//
// LICENCE. A work of the United States Government, in the public domain
// (17 U.S.C. §105). CISA asks to be cited; the payload carries the URL and the
// retrieval date so every figure on the page is recomputable by a stranger.

export const URL_KEV =
  'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';

// 1.75 MB over a slow link is well inside this; the 15 s default is not.
const TIMEOUT_MS = 120_000;

// A collapse is not a finding. The catalogue measured 1,726 entries on
// 2026-09-26 and it only ever grows — CISA has removed entries, but a handful,
// never a third of the file. If a run comes back far short of this the feed
// broke, and the honest move is to fail loudly rather than publish a cliff.
// Same reflex as dc-sources/osm-overpass.mjs.
export const SANITY_FLOOR = 1_400;

/** "Known" -> true, "Unknown" -> false, anything else -> null (never guessed). */
export function ransomwareFlag(raw) {
  if (raw === 'Known') return true;
  if (raw === 'Unknown') return false;
  return null;
}

export default {
  id: 'cisa-kev',
  label: 'CISA Known Exploited Vulnerabilities catalogue',
  url: URL_KEV,
  keyless: true,
  gives: 'cveID, vendorProject, product, dateAdded, knownRansomwareCampaignUse',
  licence: {
    data: 'US Government work, public domain (17 U.S.C. §105)',
    attribution: 'Cybersecurity and Infrastructure Security Agency (CISA)',
    url: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
  },

  /** Returns { entries, meta } or throws. One request. */
  async collect(net) {
    const body = await net.json(URL_KEV, { timeoutMs: TIMEOUT_MS });

    const raw = Array.isArray(body?.vulnerabilities) ? body.vulnerabilities : null;
    if (!raw) {
      throw new Error(
        `cisa-kev: no \`vulnerabilities\` array in the response (keys: ${Object.keys(body ?? {}).join(', ') || 'none'})`,
      );
    }
    if (raw.length < SANITY_FLOOR) {
      throw new Error(
        `cisa-kev: ${raw.length} entries is below the sanity floor of ${SANITY_FLOOR}. ` +
          'The catalogue does not shrink like that; the feed is broken, not the world.',
      );
    }

    const entries = [];
    const malformed = [];
    for (const v of raw) {
      const cve = typeof v?.cveID === 'string' ? v.cveID.trim() : '';
      const added = typeof v?.dateAdded === 'string' ? v.dateAdded.trim() : '';
      // A row without a CVE id cannot be joined and a row without dateAdded has
      // no measurement in it. Both are recorded as dropped, never as zero.
      if (!/^CVE-\d{4}-\d{4,}$/.test(cve) || !/^\d{4}-\d{2}-\d{2}$/.test(added)) {
        malformed.push({ cveID: cve || null, dateAdded: added || null });
        continue;
      }
      entries.push({
        cveID: cve,
        vendorProject: typeof v.vendorProject === 'string' ? v.vendorProject.trim() : null,
        product: typeof v.product === 'string' ? v.product.trim() : null,
        vulnerabilityName: typeof v.vulnerabilityName === 'string' ? v.vulnerabilityName.trim() : null,
        dateAdded: added,
        ransomware: ransomwareFlag(v.knownRansomwareCampaignUse),
      });
    }

    // Sorted here so nothing downstream depends on CISA's own row order.
    entries.sort((a, b) => a.cveID.localeCompare(b.cveID));

    return {
      entries,
      meta: {
        origin: 'network',
        error: null,
        catalog_version: typeof body.catalogVersion === 'string' ? body.catalogVersion : null,
        // CISA's own release timestamp for this build of the file. Not our clock.
        date_released: typeof body.dateReleased === 'string' ? body.dateReleased : null,
        count_declared: Number.isFinite(body.count) ? body.count : null,
        rows_seen: raw.length,
        rows_usable: entries.length,
        rows_malformed: malformed.length,
        malformed_examples: malformed.slice(0, 5),
      },
    };
  },
};
