// Flight Report Card: counting and grading. Pure functions, no imports, so
// site/static/flights.html can inline this file (build.mjs inlineModules).
//
// A grade is a count of past flights. It carries no claim about the next one.

// Below this many scheduled flights in the window a flight gets no letter.
export const MIN_FLIGHTS = 20;
// Below this many a flight is not published at all (one-off flight numbers).
export const KEEP_MIN = 5;

// The BTS "Reporting Carrier On-Time Performance" columns this job reads.
export const COLUMNS = [
  'FlightDate', 'IATA_CODE_Reporting_Airline', 'Flight_Number_Reporting_Airline',
  'Origin', 'Dest', 'CRSDepTime', 'ArrDel15', 'ArrDelayMinutes', 'Cancelled', 'Diverted',
];

// Carriers that report to BTS, by IATA code. An unlisted code shows as the code.
export const CARRIERS = {
  AA: 'American', AS: 'Alaska', B6: 'JetBlue', DL: 'Delta', F9: 'Frontier',
  G4: 'Allegiant', HA: 'Hawaiian', NK: 'Spirit', UA: 'United', WN: 'Southwest',
  '9E': 'Endeavor', MQ: 'Envoy', OH: 'PSA', OO: 'SkyWest', YX: 'Republic',
};

/** One CSV line -> fields. Handles quoted fields with commas and "" escapes. */
export function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c !== '"') cur += c;
      else if (line[i + 1] === '"') { cur += '"'; i++; }
      else quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

/** Header line -> { column: position }. Throws naming any column BTS dropped. */
export function columnIndex(headerLine) {
  const names = splitCsvLine(headerLine);
  const ix = {};
  for (const col of COLUMNS) ix[col] = names.indexOf(col);
  const missing = COLUMNS.filter((col) => ix[col] < 0);
  if (missing.length) throw new Error(`BTS header is missing: ${missing.join(', ')}`);
  return ix;
}

export function newTally() {
  return Object.create(null);
}

/**
 * Count one flight row into tally[origin][dest]["DL 482"].
 * On time means BTS marked the arrival under 15 minutes late. A cancelled or
 * diverted flight has no such mark, so it counts as scheduled and not on time.
 */
export function addRow(tally, f, ix) {
  const origin = f[ix.Origin];
  const dest = f[ix.Dest];
  const key = `${f[ix.IATA_CODE_Reporting_Airline]} ${f[ix.Flight_Number_Reporting_Airline]}`;
  const dests = (tally[origin] ??= Object.create(null));
  const flights = (dests[dest] ??= Object.create(null));
  const r = (flights[key] ??= { n: 0, ontime: 0, cancelled: 0, diverted: 0, late: 0, lateMin: 0, dep: '', last: '' });
  r.n++;
  if (Number(f[ix.Cancelled]) === 1) r.cancelled++;
  else if (Number(f[ix.Diverted]) === 1) r.diverted++;
  else if (f[ix.ArrDel15] !== '' && Number(f[ix.ArrDel15]) === 0) r.ontime++;
  else if (Number(f[ix.ArrDel15]) === 1) {
    r.late++;
    r.lateMin += Number(f[ix.ArrDelayMinutes]) || 0;
  }
  // The scheduled departure shown is the one on the latest date counted.
  if (f[ix.FlightDate] >= r.last) { r.last = f[ix.FlightDate]; r.dep = f[ix.CRSDepTime]; }
}

/** { pct, letter }. letter is null under MIN_FLIGHTS: too few to grade. */
export function grade(n, ontime) {
  if (!n) return { pct: null, letter: null };
  const pct = (100 * ontime) / n;
  const letter = n < MIN_FLIGHTS ? null
    : pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : 'F';
  return { pct, letter };
}

export function prevMonth(y, m) {
  return m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 };
}

/**
 * tally -> { 'index.json': …, 'origin/ATL.json': … } as JSON text.
 * A flight row is [carrier, number, dep, n, ontime, cancelled, diverted, late, lateMin].
 */
export function buildFiles(tally, meta) {
  const files = {};
  const routes = {};
  let flights = 0;
  for (const origin of Object.keys(tally).sort()) {
    const out = {};
    for (const dest of Object.keys(tally[origin]).sort()) {
      const rows = Object.keys(tally[origin][dest]).sort()
        .map((key) => [key, tally[origin][dest][key]])
        .filter(([, r]) => r.n >= KEEP_MIN)
        .map(([key, r]) => {
          const [carrier, number] = key.split(' ');
          return [carrier, number, r.dep, r.n, r.ontime, r.cancelled, r.diverted, r.late, Math.round(r.lateMin)];
        });
      if (rows.length) { out[dest] = rows; flights += rows.length; }
    }
    if (!Object.keys(out).length) continue;
    routes[origin] = Object.keys(out);
    files[`origin/${origin}.json`] = JSON.stringify({ schema: 1, origin, months: meta.months, routes: out });
  }
  files['index.json'] = JSON.stringify({ schema: 1, ...meta, flights, routes }, null, 1);
  return files;
}
