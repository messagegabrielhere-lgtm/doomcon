// NYISO overnight floor — the lowest New York State's load went between
// midnight and 06:00 Eastern, in megawatts.
//
// Same statistic as ERCOT and for the same reason: the overnight trough is what
// the load curve looks like once air conditioning, offices and traffic have gone
// home, and the load that is still there at four in the morning is the load that
// never stops. See ercot-baseload.mjs for the full argument.
//
// New York is here as the CONTROL, and that is its real job. It is a large,
// mature, well-instrumented grid with comparatively little of the 2020s
// datacentre build. If the Texas floor climbs and the New York floor does not,
// the divergence is informative. If both climb together, the honest reading is
// that something national is happening — electrification, weather, the economy —
// and not that Texas built a training cluster. An index with no control region
// cannot tell those two apart and should not pretend to.
//
// Verified 2026-09-23: 164KB per daily CSV, 11 zones at five-minute resolution.

import { parseCsv, wallMinutes, zonedDay, finite, round } from './_util.mjs';

const BASE = 'https://mis.nyiso.com/public/csv/pal';

const WINDOW_START_MIN = 0;
const WINDOW_END_MIN = 6 * 60;
const EXPECTED_INTERVALS = 72;
const MIN_INTERVALS = 66; // NYISO drops more intervals than ERCOT; 6 of 72 tolerated

// The eleven load zones NYISO settles against. Named in full rather than counted
// because the failure this guards is a zone quietly disappearing from the feed:
// summing "whatever turned up" would publish a 1,900 MW drop the night Long
// Island's row is late and call it a quiet night in New York.
const ZONES = Object.freeze([
  'CAPITL', 'CENTRL', 'DUNWOD', 'GENESE', 'HUD VL',
  'LONGIL', 'MHK VL', 'MILLWD', 'N.Y.C.', 'NORTH', 'WEST',
]);

// NYISO stamps each row with a zone abbreviation, not an offset. Two values
// occur and both are unambiguous; anything else means the feed changed and we
// would rather go dark than guess an hour.
const OFFSETS = Object.freeze({ EDT: '-04:00', EST: '-05:00' });

function fileFor(date) {
  // The file is named for the EASTERN day it covers, so the name has to be
  // derived in Eastern time. Using the UTC date would ask for tomorrow's file
  // for the five hours after 19:00 ET and take the source dark every evening.
  return `${BASE}/${zonedDay(date, 'America/New_York').replace(/-/g, '')}pal.csv`;
}

/**
 * Sums the eleven zones per timestamp inside the overnight window.
 * Returns { floor, samples, complete, partial } — `partial` counts timestamps
 * that had between one and ten zones, which is the diagnostic that tells a
 * missing-zone outage apart from a missing-file outage.
 */
function statewideFloor(csv) {
  const rows = parseCsv(csv);
  if (rows.length < 2) throw new Error('nyiso-baseload: CSV had no rows');

  const header = rows[0].map((h) => h.trim());
  const iStamp = header.indexOf('Time Stamp');
  const iZone = header.indexOf('Time Zone');
  const iName = header.indexOf('Name');
  const iLoad = header.indexOf('Load');
  if (iStamp < 0 || iZone < 0 || iName < 0 || iLoad < 0) {
    throw new Error(`nyiso-baseload: unexpected columns [${header.join(', ')}]`);
  }

  const byStamp = new Map();
  let partial = 0;
  let blanks = 0;

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const stamp = (cells[iStamp] ?? '').trim();
    if (!stamp) continue;
    const min = wallMinutes(stamp.slice(11));
    if (min < WINDOW_START_MIN || min >= WINDOW_END_MIN) continue;

    const name = (cells[iName] ?? '').trim();
    if (!ZONES.includes(name)) continue;

    const raw = (cells[iLoad] ?? '').trim();
    // An empty Load cell is NYISO saying "no telemetry for this zone at this
    // minute". Number('') is 0, and a 0 for New York City would take 4,800 MW
    // off the statewide sum and publish it as the overnight floor.
    if (raw === '') { blanks++; continue; }
    const load = Number(raw);
    if (!Number.isFinite(load)) continue;

    let slot = byStamp.get(stamp);
    if (!slot) {
      slot = { total: 0, zones: new Set(), tz: (cells[iZone] ?? '').trim() };
      byStamp.set(stamp, slot);
    }
    slot.total += load;
    slot.zones.add(name);
  }

  let floor = null;
  let complete = 0;
  for (const [stamp, slot] of byStamp) {
    if (slot.zones.size !== ZONES.length) { partial++; continue; }
    complete++;
    if (floor === null || slot.total < floor.total) floor = { stamp, ...slot };
  }

  return { floor, complete, partial, blanks, stamps: byStamp.size };
}

function toIso(stamp, tz) {
  const offset = OFFSETS[tz];
  if (!offset) throw new Error(`nyiso-baseload: unknown time zone abbreviation ${JSON.stringify(tz)}`);
  // "09/23/2026 00:50:00" -> "2026-09-23T00:50:00-04:00"
  const m = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2}:\d{2})$/.exec(stamp);
  if (!m) throw new Error(`nyiso-baseload: unparseable timestamp ${JSON.stringify(stamp)}`);
  const ms = Date.parse(`${m[3]}-${m[1]}-${m[2]}T${m[4]}${offset}`);
  if (!Number.isFinite(ms)) throw new Error(`nyiso-baseload: Date.parse rejected ${stamp} ${tz}`);
  return new Date(ms).toISOString();
}

export default {
  id: 'nyiso-baseload',
  pillar: 'grid',
  label: 'NYISO overnight floor',
  region: 'NYISO · New York',
  unitLabel: 'MW',
  cadence: 'daily, settles at 06:00 Eastern',
  direction: 'higher = more load that never switches off',

  async collect(net) {
    const now = new Date();
    // Today first; yesterday only if today's overnight window is not yet whole.
    // Two requests is the worst case and it happens for six hours a day.
    const attempts = [now, new Date(now.getTime() - 86_400_000)];
    const tried = [];

    for (const day of attempts) {
      const url = fileFor(day);
      let csv;
      try {
        csv = await net.text(url);
      } catch (err) {
        tried.push(`${url.slice(-15)}: ${err?.message ?? err}`);
        continue;
      }

      const r = statewideFloor(csv);
      if (!r.floor || r.complete < MIN_INTERVALS) {
        tried.push(`${url.slice(-15)}: ${r.complete} complete intervals (need ${MIN_INTERVALS})`);
        continue;
      }

      return {
        value: finite(round(r.floor.total, 1), 'nyiso-baseload floor'),
        unit: 'MW',
        observed_at: toIso(r.floor.stamp, r.floor.tz),
        meta: {
          local_day: zonedDay(day, 'America/New_York'),
          window_local: '00:00–06:00 ET',
          intervals_used: r.complete,
          intervals_expected: EXPECTED_INTERVALS,
          intervals_dropped_incomplete: r.partial,
          blank_load_cells: r.blanks,
          zones: ZONES.length,
          floor_at_local: r.floor.stamp,
          time_zone: r.floor.tz,
          attempts: tried,
          direction: 'higher = more always-on load',
          source_note:
            'statewide sum of all eleven NYISO load zones; a timestamp missing any ' +
            'zone is discarded rather than summed short',
        },
      };
    }

    throw new Error(`nyiso-baseload: no usable overnight window — ${tried.join(' | ')}`);
  },
};
