// BENEFIT side — the FDA's AI-Enabled Medical Device List, as a cumulative count.
//
// WHAT IT IS. A list the FDA publishes of devices it has authorised that it
// identifies as AI-enabled, mostly from AI-related terms in decision summaries.
// Published as a CSV with six columns. The FDA says the list is not
// comprehensive and is "updated periodically".
//
// WHY THE VALUE IS THE CUMULATIVE COUNT AND NOT A 30-DAY WINDOW. The list lags
// by about two months: on 2026-09-28 the file was dated 2026-09-04 and its
// newest decision was 2026-06-29, so a window ending on the anchor day reads 0
// for a reason that is the FDA's publishing cadence, not the world. The
// cumulative count and the file's own dates are the honest pair. The
// in-window count is still published in meta, so the lag is visible.
//
// WHY BLISS DID NOT USE IT. docs/BLISS.md §4 rejected openFDA's 510(k) API
// because it has no AI field. This is not that API: it is the list itself.

export const CSV_URL = 'https://www.fda.gov/media/178541/download?attachment';
export const LIST_PAGE =
  'https://www.fda.gov/medical-devices/software-medical-device-samd/artificial-intelligence-enabled-medical-devices';

export const EXPECTED_COLUMNS = Object.freeze([
  'Date of Final Decision', 'Submission Number', 'Device', 'Company', 'Panel (Lead)', 'Primary Product Code',
]);

// 1,614 rows on 2026-09-28, and the list only grows. A file far short of that is
// a broken or truncated download, not a mass withdrawal (same reflex as
// kev-sources/cisa-kev.mjs).
export const SANITY_FLOOR = 1_300;

/**
 * RFC 4180 CSV, quote-aware: commas and line breaks inside quotes, "" as an
 * escaped quote, CRLF or LF, a leading BOM. The device and company columns are
 * full of commas ("Agada Medical, Ltd."), so a split(',') would shift columns.
 */
export function parseCsv(text) {
  const s = String(text).replace(/^﻿/, '');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (quoted) throw new Error('parseCsv: unterminated quoted field');
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/** MM/DD/YYYY -> YYYY-MM-DD, or null. Never guessed. */
export function isoDay(mdY) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(mdY).trim());
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== `${yyyy}-${mm}-${dd}` ? null : `${yyyy}-${mm}-${dd}`;
}

/** Parsed CSV rows (header first) -> the published summary. Pure. */
export function summarise(table, { from, to }) {
  const [header, ...rows] = table;
  if (!header || header.length !== EXPECTED_COLUMNS.length || header.some((h, i) => h.trim() !== EXPECTED_COLUMNS[i])) {
    throw new Error(`fda-ai-enabled-devices: header is ${JSON.stringify(header)}, expected ${JSON.stringify(EXPECTED_COLUMNS)}`);
  }
  const submissions = new Set();
  const byYear = {};
  let unparseable = 0;
  let newest = null;
  let oldest = null;
  let inWindow = 0;
  for (const r of rows) {
    if (r.length !== EXPECTED_COLUMNS.length) {
      throw new Error(`fda-ai-enabled-devices: row with ${r.length} columns: ${JSON.stringify(r).slice(0, 160)}`);
    }
    submissions.add(r[1].trim());
    const day = isoDay(r[0]);
    if (!day) { unparseable += 1; continue; }
    const y = day.slice(0, 4);
    byYear[y] = (byYear[y] ?? 0) + 1;
    if (newest === null || day > newest) newest = day;
    if (oldest === null || day < oldest) oldest = day;
    if (day >= from && day <= to) inWindow += 1;
  }
  return {
    rows: rows.length,
    distinct_submissions: submissions.size,
    unparseable_dates: unparseable,
    newest_decision: newest,
    oldest_decision: oldest,
    decisions_in_window: inWindow,
    by_year: byYear,
  };
}

export default {
  id: 'fda-ai-enabled-devices',
  side: 'benefit',
  label: 'FDA AI-enabled medical device authorisations (cumulative)',
  endpoint: CSV_URL,
  keyless: true,
  windowed: false,
  ai_specific: true,
  context_only: false,
  counts:
    'Every device on the FDA AI-Enabled Medical Device List, one row per authorisation (510(k), De Novo or PMA), ' +
    'from the first in 1995 to the newest the file carries.',
  does_not_count:
    'Use, outcomes or benefit to patients: the list records marketing authorisation. Devices the FDA has not yet added ' +
    '(the list lags by about two months, so the newest months read low). Devices the FDA did not identify as AI-enabled.',

  async collect(net, { from, to }) {
    const res = await net.text(CSV_URL, { withMeta: true, timeoutMs: 30_000 });
    const s = summarise(parseCsv(res.data), { from, to });
    if (s.rows < SANITY_FLOOR) {
      throw new Error(
        `fda-ai-enabled-devices: ${s.rows} rows is below the sanity floor of ${SANITY_FLOOR}; ` +
          'the list does not shrink like that — the download is broken, not the register',
      );
    }
    return {
      value: s.rows,
      unit: 'devices authorised, cumulative',
      meta: {
        ...s,
        // The FDA's own clock for this build of the file. Not ours.
        file_last_modified: res.headers?.['last-modified'] ?? null,
        list_page: LIST_PAGE,
      },
    };
  },
};
