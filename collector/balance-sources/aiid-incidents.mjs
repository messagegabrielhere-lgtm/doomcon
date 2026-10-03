// HARM side — AI Incident Database incidents first entered in the window.
//
// WHAT "ENTERED" MEANS. The database has two dates per incident and neither is
// the one wanted. `date` is when the harm happened, which lags entry by months
// or years (1713 was entered on 2026-09-27 and happened on 2024-02-14). The
// incident id is assigned when an editor processes it, but ids carry no date.
// So entry is proxied by the EARLIEST `date_submitted` among an incident's
// reports: the day the first article about it reached the editors. A proxy, and
// named as one.
//
// NOT AN API. The file is a Gatsby build artefact (page-data.json) that the
// site's own incidents page loads. Its shape can change on any deploy, so every
// path into it is checked and a missing one takes the source dark with the path
// in the error. The site's GraphQL endpoint is not used: it accepts only
// requests carrying the site's own origin and is not documented as public.
//
// BATCHES. Editors enter incidents in batches — 9 on 2026-09-04, 6 on
// 2026-09-08 and on 2026-09-19 — so moving the window edge by one day can move
// the count by up to 9. The window is fixed in whole UTC days and published.

export const URL_PAGE_DATA = 'https://incidentdatabase.ai/page-data/apps/incidents/page-data.json';

// 5.7 MB, 955 KB gzipped, measured at 460-730 ms. The default 15 s is too tight
// for a slow runner.
const TIMEOUT_MS = 120_000;

// 1,703 incidents on 2026-09-28. Far fewer means a truncated or reshaped file.
export const SANITY_FLOOR = 1_400;

// If fewer than this share of incidents yield an entry date, date_submitted has
// changed format or moved, and every count below would silently shrink.
const MIN_DATED_SHARE = 0.95;

function dayOf(raw) {
  const t = Date.parse(raw);
  return Number.isNaN(t) ? null : new Date(t).toISOString().slice(0, 10);
}

/**
 * page-data.json -> per-incident entry day (earliest report submission, UTC).
 * Pure; throws on a shape it does not recognise rather than return a smaller map.
 */
export function entryDays(pageData) {
  const data = pageData?.result?.data;
  const incidents = data?.incidents?.nodes;
  const reports = data?.reports?.nodes;
  if (!Array.isArray(incidents)) throw new Error('aiid-incidents-entered-30d: no result.data.incidents.nodes array');
  if (!Array.isArray(reports)) throw new Error('aiid-incidents-entered-30d: no result.data.reports.nodes array');

  const ids = new Set();
  let maxId = null;
  for (const inc of incidents) {
    if (!Number.isInteger(inc?.incident_id)) throw new Error(`aiid-incidents-entered-30d: incident without an integer id: ${JSON.stringify(inc).slice(0, 120)}`);
    ids.add(inc.incident_id);
    if (maxId === null || inc.incident_id > maxId) maxId = inc.incident_id;
  }

  const entry = new Map();
  let unparseable = 0;
  for (const group of reports) {
    const id = group?.incident_id;
    if (!ids.has(id) || !Array.isArray(group.reports)) continue;
    for (const r of group.reports) {
      const d = dayOf(r?.date_submitted);
      if (d === null) { unparseable += 1; continue; }
      if (!entry.has(id) || d < entry.get(id)) entry.set(id, d);
    }
  }
  const undated = [...ids].filter((id) => !entry.has(id)).sort((a, b) => a - b);
  return { incidents: ids.size, max_incident_id: maxId, entry, undated, unparseable_report_dates: unparseable };
}

/** Count incidents whose entry day falls in [from, to], both ends inclusive. */
export function countEntered(entry, { from, to }) {
  let n = 0;
  for (const d of entry.values()) if (d >= from && d <= to) n += 1;
  return n;
}

export default {
  id: 'aiid-incidents-entered-30d',
  side: 'harm',
  label: 'AI Incident Database: incidents first entered in the window',
  endpoint: URL_PAGE_DATA,
  keyless: true,
  windowed: true,
  ai_specific: true,
  context_only: false,
  counts:
    'Incidents whose earliest linked report was submitted to the database inside the window: the editors\' intake, ' +
    'in whole UTC days.',
  does_not_count:
    'Harms that happened in the window (the incident date lags entry by months or years). Verified harms: the database ' +
    'is volunteer-curated from press reports and many entries are allegations. Incidents nobody reported to it.',

  async collect(net, { from, to }) {
    const body = await net.json(URL_PAGE_DATA, { timeoutMs: TIMEOUT_MS });
    const e = entryDays(body);
    if (e.incidents < SANITY_FLOOR) {
      throw new Error(`aiid-incidents-entered-30d: ${e.incidents} incidents is below the sanity floor of ${SANITY_FLOOR}; the file is truncated or reshaped`);
    }
    if (e.entry.size / e.incidents < MIN_DATED_SHARE) {
      throw new Error(
        `aiid-incidents-entered-30d: only ${e.entry.size} of ${e.incidents} incidents have a readable date_submitted; ` +
          'the field has changed, and a count over the rest would be silently low',
      );
    }
    const n = countEntered(e.entry, { from, to });
    // 54 in the verified window, 152 in 90 days. A zero is a broken date path.
    if (n === 0) {
      throw new Error(`aiid-incidents-entered-30d: 0 incidents entered between ${from} and ${to} — implausible, treating the date path as broken`);
    }
    let newest = null;
    for (const d of e.entry.values()) if (newest === null || d > newest) newest = d;
    return {
      value: n,
      unit: 'incidents entered',
      meta: {
        incidents_total: e.incidents,
        max_incident_id: e.max_incident_id,
        incidents_without_entry_date: e.undated,
        unparseable_report_dates: e.unparseable_report_dates,
        newest_entry_day: newest,
        entry_date_rule: 'earliest date_submitted among the incident\'s reports, as a UTC day',
      },
    };
  },
};
