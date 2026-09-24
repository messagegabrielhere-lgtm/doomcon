// OPENNESS pillar — the share of the frontier anybody can hold.
//
// Every other source in this index is a COUNT, and counts conflate two different
// things: more open models can mean the field got more open, or it can mean the
// field got bigger. This source is a RATIO, and it is the only number here that
// can fall while every count rises - which is exactly the case where an upside
// index has to be able to disagree with itself.
//
// Epoch AI maintain the notable-models dataset by hand, with an explicit
// accessibility classification per model. That classification is the thing we
// cannot compute ourselves and cannot get anywhere else, and it is what makes
// this source worth a 2.2MB CSV.
//
// Measured 2026-09-24: 1,073 models in the file, newest dated 2026-09-21. Over the
// trailing 365 days, 119 released models carried an accessibility value and 44 of
// them were open weights - a share of 0.3697.
//
// KNOWN COST, stated rather than hidden: the CSV is ~2.2MB and there is no
// conditional-request path through collector/fetch.mjs, so an hourly cadence
// re-downloads it hourly. Epoch update the file roughly weekly. See docs/BLISS.md
// "Limitations" - the honest mitigation is cadence, not a cleverer fetch.

import { fetchText as defaultFetchText } from '../fetch.mjs';

const ENDPOINT = 'https://epoch.ai/data/notable_ai_models.csv';

const WINDOW_DAYS = 365;

// A share computed over a handful of models is noise wearing a decimal point. At
// the measured rate (~119 models a year) this never binds; it exists so that a
// truncated download or a filtered-out column cannot produce "1.00 open" over
// three rows and pin the pillar at the top of the scale.
const MIN_DENOMINATOR = 20;

const COL_DATE = 'Publication date';
const COL_ACCESS = 'Model accessibility';
const COL_NAME = 'Model';

/**
 * RFC 4180 CSV, enough of it. Epoch's file carries abstracts, so quoted fields
 * contain commas, doubled quotes AND newlines - a `split('\n')` parse reads the
 * file as ~8,440 broken rows instead of 1,073 real ones, and every one of the
 * broken ones lands in the denominator. That bug produced a plausible-looking
 * wrong number in testing, which is the worst kind, so the parser is a character
 * scanner rather than a regex.
 */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }   // escaped quote
        else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); field = ''; rows.push(row); row = []; }
    else if (c !== '\r') field += c;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

export default {
  id: 'epoch-open-weights',
  pillar: 'openness',
  label: 'Open-weight share of notable models',

  async collect(fetchJson, { fetchText = defaultFetchText } = {}) {
    const observedAt = new Date();
    const cutoffMs = observedAt.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000;

    // 2.2MB over a 15s default is tight on a slow link; 30s with the normal retry
    // policy. Still the shared helper, so UA and error capture hold.
    const csv = await fetchText(ENDPOINT, { timeoutMs: 30_000 });

    const rows = parseCsv(csv);
    if (rows.length < 2) {
      throw new Error(`epoch-open-weights: parsed ${rows.length} rows from ${ENDPOINT} — not a CSV table`);
    }

    const header = rows[0];
    const iDate = header.indexOf(COL_DATE);
    const iAccess = header.indexOf(COL_ACCESS);
    const iName = header.indexOf(COL_NAME);
    if (iDate === -1 || iAccess === -1) {
      throw new Error(
        `epoch-open-weights: ${ENDPOINT} has no "${COL_DATE}" and/or "${COL_ACCESS}" column ` +
          `(found ${header.length} columns: ${header.slice(0, 8).join(', ')}…) — schema changed, refusing to guess`,
      );
    }

    let released = 0;
    let openWeights = 0;
    let newest = null;
    let newestName = null;
    const breakdown = {};

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (row.length <= Math.max(iDate, iAccess)) continue;

      const rawDate = (row[iDate] ?? '').trim();
      const access = (row[iAccess] ?? '').trim();
      if (!rawDate) continue;

      const t = Date.parse(rawDate);
      if (!Number.isFinite(t)) continue;
      if (newest === null || t > newest) {
        newest = t;
        newestName = iName === -1 ? null : (row[iName] ?? '').trim() || null;
      }
      if (t < cutoffMs) continue;

      // Two exclusions from the DENOMINATOR, both deliberate:
      //   ""          Epoch have not classified this model. Counting an unknown as
      //               closed would manufacture a downward bias out of their backlog.
      //   "Unreleased" the model was never published at all, so it has no
      //               accessibility to measure and belongs in neither column.
      if (access === '' || /^unreleased$/i.test(access)) continue;

      released += 1;
      breakdown[access] = (breakdown[access] ?? 0) + 1;

      // "Open weights (unrestricted)", "Open weights (restricted use)" and
      // "Open weights (non-commercial)" all count: the pillar asks whether the
      // weights left the building, and ACCESS is where licence permissiveness is
      // measured separately by hf-permissive-models. Splitting the two questions
      // across two pillars is what stops either one quietly answering both.
      if (/^open weights/i.test(access)) openWeights += 1;
    }

    if (released < MIN_DENOMINATOR) {
      throw new Error(
        `epoch-open-weights: only ${released} classified releases in the trailing ${WINDOW_DAYS}d ` +
          `(needed ${MIN_DENOMINATOR}) from ${rows.length - 1} parsed rows — either the download ` +
          `truncated or the date/accessibility columns changed meaning. Refusing to publish a ` +
          `share over a denominator this small.`,
      );
    }

    const share = openWeights / released;

    return {
      value: Number(share.toFixed(6)),
      unit: `share/${WINDOW_DAYS}d`,
      observed_at: observedAt.toISOString(),
      meta: {
        window_days: WINDOW_DAYS,
        open_weight_models: openWeights,
        classified_releases: released,
        accessibility_breakdown: breakdown,
        rows_in_file: rows.length - 1,
        newest_publication_date: newest === null ? null : new Date(newest).toISOString().slice(0, 10),
        newest_model: newestName,
        excluded_from_denominator: ['(unclassified)', 'Unreleased'],
      },
    };
  },
};
