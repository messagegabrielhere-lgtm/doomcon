// Shared helpers for the infrastructure adapters. Leading underscore: collector/
// infra.mjs skips these during discovery, same convention as collector/sources/.
//
// Nothing in here makes a network call. Every helper is pure so an adapter can be
// reasoned about, and so the same arithmetic runs in a throwaway harness.

/** Mean of a finite array. Throws rather than returning NaN on an empty input. */
export function mean(xs) {
  if (!Array.isArray(xs) || xs.length === 0) throw new Error('mean: empty input');
  let sum = 0;
  for (const x of xs) {
    if (!Number.isFinite(x)) throw new Error(`mean: non-finite member ${x}`);
    sum += x;
  }
  return sum / xs.length;
}

/** Median of a finite array. Copies before sorting: callers keep their order. */
export function median(xs) {
  if (!Array.isArray(xs) || xs.length === 0) throw new Error('median: empty input');
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * A 101-knot ascending quantile grid, the shape collector/engine.mjs's
 * normalise() expects as `ref.quantiles`.
 *
 * Built with linear interpolation between order statistics (the R type-7 /
 * numpy default convention) rather than nearest-rank, so a 261-point baseline
 * does not quantise the grid into visible steps.
 */
export function quantileGrid(values, knots = 101) {
  const s = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (s.length < 2) throw new Error(`quantileGrid: need >= 2 finite values, got ${s.length}`);
  const grid = new Array(knots);
  for (let i = 0; i < knots; i++) {
    const h = (s.length - 1) * (i / (knots - 1));
    const lo = Math.floor(h);
    const hi = Math.min(lo + 1, s.length - 1);
    grid[i] = s[lo] + (h - lo) * (s[hi] - s[lo]);
  }
  return grid;
}

/**
 * A minimal RFC-4180 CSV parser: quoted fields, doubled quotes inside them, CRLF
 * or LF line endings. Both grid CSVs this project reads (NYISO, CAISO) quote
 * some fields and not others, and one of NYISO's zone names is `HUD VL` — a
 * space, not a comma, but close enough to the edge that hand-splitting on commas
 * is the wrong instinct to start with.
 *
 * Returns an array of row arrays, including the header row. Blank trailing lines
 * are dropped; a blank field stays as the empty string, which the callers rely on
 * to tell "no reading yet" from "a reading of zero".
 */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  let started = false;

  const endField = () => { row.push(field); field = ''; started = false; };
  const endRow = () => {
    endField();
    if (row.length > 1 || row[0] !== '') rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { quoted = false; }
      } else field += c;
      continue;
    }
    if (c === '"' && !started) { quoted = true; started = true; continue; }
    if (c === ',') { endField(); continue; }
    if (c === '\r') continue;
    if (c === '\n') { endRow(); continue; }
    field += c;
    started = true;
  }
  if (field !== '' || row.length > 0) endRow();
  return rows;
}

/**
 * The USGS RDB (tab-separated) dialect: `#` comment lines, then a header row,
 * then a row of column *format* codes (`5s`, `12s`, `3n`) that is not data and
 * must be dropped. Returns { columns, rows } with rows as objects.
 */
export function parseRdb(text) {
  const lines = text.split('\n').filter((l) => l.length > 0 && !l.startsWith('#'));
  if (lines.length < 2) throw new Error('parseRdb: no header and format line');
  const columns = lines[0].split('\t').map((s) => s.trim());
  // Line 1 is the format spec (e.g. "5s\t15s\t3n"). Verified by shape, not by
  // position: if USGS ever drops it, silently consuming a real row as the spec
  // would delete one day of record without a word.
  const looksLikeSpec = lines[1].split('\t').every((c) => /^\d+[sndg]$/.test(c.trim()));
  const body = looksLikeSpec ? lines.slice(2) : lines.slice(1);
  const rows = [];
  for (const line of body) {
    const cells = line.split('\t');
    const obj = {};
    for (let i = 0; i < columns.length; i++) obj[columns[i]] = (cells[i] ?? '').trim();
    rows.push(obj);
  }
  return { columns, rows, hadSpecLine: looksLikeSpec };
}

/**
 * The local wall-clock minute-of-day carried inside a timestamp string, read off
 * the characters rather than computed.
 *
 * ERCOT emits `2026-09-23 00:05:00-0500`; NYISO emits `09/23/2026 00:00:00` with
 * the zone in a separate column. In both the first part IS the local wall time,
 * which is exactly what an overnight window is defined against. Converting to an
 * absolute instant and back through a time zone database would give the same
 * answer with more ways to be wrong, and would make the window shift under DST.
 */
export function wallMinutes(hhmmss) {
  const m = /(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(hhmmss);
  if (!m) throw new Error(`wallMinutes: no HH:MM in ${JSON.stringify(hhmmss)}`);
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!(h >= 0 && h <= 23) || !(min >= 0 && min <= 59)) {
    throw new Error(`wallMinutes: out-of-range time in ${JSON.stringify(hhmmss)}`);
  }
  return h * 60 + min;
}

/** `YYYY-MM-DD` for an instant in a named IANA zone. Node 20 ships full ICU. */
export function zonedDay(date, timeZone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}

/** `M/D/YYYY`, the only date format the US Drought Monitor service accepts. */
export function usDate(date) {
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear()}`;
}

/** `YYYY-MM-DD` in UTC. */
export function isoDay(date) {
  return date.toISOString().slice(0, 10);
}

/** Rounds for output. Keeps data/infra.json free of float dust like 43210.50000000001. */
export function round(value, dp = 2) {
  const f = 10 ** dp;
  return Math.round(value * f) / f;
}

/**
 * The guard every adapter ends with. collector/infra.mjs would reject a
 * non-finite value anyway, but failing here names the quantity that went wrong
 * instead of reporting a generic bad-value error two files away.
 */
export function finite(value, what) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${what} resolved to ${typeof value} ${String(value)}, not a finite number`);
  }
  return value;
}
