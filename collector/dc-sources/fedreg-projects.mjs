// Federal Register documents that NAME a datacentre project.
//
// collector/infra-sources/fedreg-datacenter.mjs counts documents containing the
// phrase "data center" and feeds a percentile. This adapter reads the same
// corpus for a different purpose, and it needs a far tighter filter, because
// what that count is measuring became obvious the moment the titles were read.
//
// MEASURED 2026-09-24. Of the 205 documents published since 2026-03-01 whose
// full text contains "data center", the twenty most recent include Kalshi
// listing-standard rule changes, four FAA instrument approach amendments, six
// NYSE proposed rule changes, two Privacy Act notices and an EPA carbon
// standards repeal. NONE of the top twenty names a datacentre project. The
// full-text count is a real signal about federal attention and a terrible
// source of pins.
//
// THE FILTER, THEREFORE: the phrase has to be in the TITLE, not merely in the
// body. That is the difference between a document about a datacentre and a
// document that mentions one.
//
// AND THE MEASURED RESULT OF THAT FILTER, 2026-09-24, over 437 full-text
// matches across eighteen months — FOUR documents have the phrase in the title,
// and NOT ONE of them is a project:
//
//   2026-08-21  DOT   Information collection: National Flight Data Center Web Portal
//   2026-04-13  HHS   Emergency Medical Services for Children Data Center (EDC)
//   2025-07-28  EOP   Accelerating Federal Permitting of Data Center Infrastructure
//   2025-06-17  DOC   NTIA Listening Session on Bolstering Data Center Growth
//
// Two are records systems that happen to be called data centers. Two are
// policy. A first version of this adapter pinned the HHS paediatric emergency
// data repository in Utah as an announced datacentre, which is a fabrication
// with a citation attached — the worst failure available in this dataset.
//
// So this source is GATED HARD and currently yields nothing: the agency must be
// one that permits physical infrastructure, the document must not be an
// information-collection notice or a listening session, and presidential policy
// documents are excluded. It stays wired up because a FERC interconnection
// notice naming a datacentre campus is exactly the thing worth catching, and
// the day one is published this will catch it. Until then it publishes the
// count of what it rejected, which is the honest output.
//
// WHAT A FEDERAL REGISTER PIN IS. A named project in a federal notice —
// typically a FERC preliminary permit, an environmental scoping notice or an
// interconnection filing. It is stronger evidence than a news mention and
// weaker than a surveyed building. Location resolves to whatever state the
// title or abstract names, and no further.

import { STATE_NAMES, stableId } from './_util.mjs';

const ENDPOINT = 'https://www.federalregister.gov/api/v1/documents.json';
const WINDOW_DAYS = 540;      // eighteen months; these documents are slow
const PER_PAGE = 200;
const MAX_PAGES = 6;

const TITLE_MATCH = /data\s?cent(?:er|re)s?\b/i;

// A record system, a web portal or a meeting is not a building.
const NOT_A_PROJECT =
  /\b(information collection|listening session|web portal|privacy act|system of records|request(?:s)? for comments|clearance of|paperwork reduction|advisory committee|meeting notice)\b/i;

// Agencies that permit, license or site physical energy and land
// infrastructure. Anything else naming a "data center" is naming something
// else. Matched as a substring of the Federal Register's own agency name.
const INFRASTRUCTURE_AGENCIES = Object.freeze([
  'Federal Energy Regulatory Commission',
  'Energy Department',
  'Environmental Protection Agency',
  'Engineers Corps',
  'Army Department',
  'Interior Department',
  'Land Management Bureau',
  'Reclamation Bureau',
  'Agriculture Department',
  'Rural Utilities Service',
  'Bonneville Power Administration',
  'Western Area Power Administration',
  'Nuclear Regulatory Commission',
]);

function isInfrastructureAgency(agencies) {
  return (agencies ?? []).some((a) =>
    INFRASTRUCTURE_AGENCIES.some((name) => String(a?.name ?? '').includes(name)),
  );
}

function statesIn(text) {
  const found = new Set();
  for (const [abbr, name] of Object.entries(STATE_NAMES)) {
    if (new RegExp(`\\b${name.replace(/ /g, '\\s')}\\b`).test(text)) found.add(abbr);
  }
  return [...found].sort();
}

export default {
  id: 'fedreg-projects',
  label: 'Federal Register documents naming a datacentre project',
  endpoint: ENDPOINT,
  keyless: true,
  refresh_days: 0,
  gives: 'announced sites named in a federal notice, state-level',

  async collect(net, { nowMs, nowIso }) {
    const since = new Date(nowMs - WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);
    const docs = [];

    for (let page = 1; page <= MAX_PAGES; page++) {
      const qs = new URLSearchParams({
        'conditions[term]': '"data center"',
        'conditions[publication_date][gte]': since,
        per_page: String(PER_PAGE),
        order: 'newest',
        page: String(page),
      });
      for (const f of ['document_number', 'title', 'abstract', 'publication_date', 'type', 'html_url', 'agencies']) {
        qs.append('fields[]', f);
      }
      const body = await net.json(`${ENDPOINT}?${qs}`);
      const results = body?.results;
      if (!Array.isArray(results)) {
        throw new Error(
          `fedreg-projects: page ${page} carried no results array ` +
            `(keys: ${Object.keys(body ?? {}).join(',') || 'none'})`,
        );
      }
      docs.push(...results);
      const total = Number(body?.total_pages);
      if (!Number.isFinite(total) || page >= total) break;
    }

    const sites = [];
    const titleMatches = [];
    let rejected = 0;

    for (const d of docs) {
      const title = String(d?.title ?? '');
      if (!TITLE_MATCH.test(title)) continue;

      titleMatches.push({
        document_number: d.document_number ?? null,
        published_at: d.publication_date ?? null,
        agency: d.agencies?.[0]?.name ?? null,
        document_type: d.type ?? null,
        title,
        url: d.html_url ?? null,
      });

      // The three gates. Each one exists because a real document got through
      // without it.
      if (NOT_A_PROJECT.test(title)) { rejected++; continue; }
      if (d.type === 'Presidential Document') { rejected++; continue; }
      if (!isInfrastructureAgency(d.agencies)) { rejected++; continue; }

      const states = statesIn(`${title} ${d?.abstract ?? ''}`);
      if (states.length !== 1) { rejected++; continue; }

      const id = stableId('dc', 'fedreg', String(d.document_number));
      sites.push({
        id,
        name: title,
        operator: null,
        status: 'announced',
        lat: null,
        lon: null,
        state: states[0],
        location_precision: 'state',
        evidence: [
          {
            kind: 'federal_register',
            document_number: d.document_number ?? null,
            document_type: d.type ?? null,
            agency: d.agencies?.[0]?.name ?? null,
            title,
            url: d.html_url ?? null,
            published_at: d.publication_date ?? null,
          },
        ],
        // A named project in a federal notice is a document with a citable
        // number that a stranger can pull up. That is the strongest evidence in
        // the pending half of this dataset.
        confidence: 'medium',
        first_seen_at: nowIso,
      });
    }

    return {
      sites,
      meta: {
        origin: 'network',
        error: null,
        window_days: WINDOW_DAYS,
        corpus_since: since,
        documents_matching_full_text: docs.length,
        documents_with_the_phrase_in_the_title: titleMatches.length,
        title_matches_rejected: rejected,
        title_matches: titleMatches,
        sites: sites.length,
        note:
          'the full-text corpus is dominated by FAA approach procedures, exchange rule filings ' +
          'and Privacy Act notices. Of 437 full-text matches over eighteen months, four have the ' +
          'phrase in the title and none of them is a project. This source is gated to an ' +
          'infrastructure-permitting agency and currently yields no pins, by design.',
      },
    };
  },
};
