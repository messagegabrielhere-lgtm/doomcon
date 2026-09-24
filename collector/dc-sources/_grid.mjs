// Which grid is this site on, and does /watts have a live reading for it?
//
// THIS TABLE MUST AGREE WITH site/templates/wattsPage.mjs's CORRIDORS. That is
// the sibling page and the whole point of building the map inside this project
// rather than beside it. Same three grids with a live feed — ERCOT, NYISO,
// CAISO. Same five reasons the others have none, in the same words. If the two
// ever diverge, the map is lying about the page next door.
//
// THE HONEST SIZE OF THIS MAPPING. A balancing authority is not a state, and
// this table pretends it is. The errors are known, named, and attached to the
// sites they affect:
//
//   TEXAS      ERCOT carries about nine tenths of Texas load and none of El
//              Paso (WECC), none of the far north Panhandle (SPP), none of the
//              far east or Texarkana (MISO). Those counties are listed below by
//              FIPS and get `grid: null` with the reason, not a wrong answer.
//   CALIFORNIA CAISO does not include LADWP, SMUD, Imperial or the Balancing
//              Authority of Northern California. Los Angeles County is the one
//              that matters for datacentres and it is listed.
//   NEW YORK   NYISO is the whole state. This one is clean.
//
// Everything else gets a named operator and an explicit reason there is no
// reading, because a blank cell reads as an oversight and a named wall reads as
// a boundary of the instrument.

// ERCOT's own service territory stops at these county lines. FIPS, so the list
// survives a county being renamed.
const NOT_ERCOT_TX = Object.freeze(new Set([
  '48141', // El Paso — WECC, not ERCOT, not even the same interconnection
  '48229', // Hudspeth — WECC
  '48111', // Dallam — SPP
  '48421', // Sherman — SPP
  '48195', // Hansford — SPP
  '48295', // Lipscomb — SPP
  '48357', // Ochiltree — SPP
  '48211', // Hemphill — SPP
  '48087', // Carson, and the SPP Panhandle generally
  '48343', // Morris — MISO / east Texas
  '48067', // Cass — MISO
  '48315', // Marion — MISO
  '48183', // Gregg, partial
  '48203', // Harrison — MISO
  '48365', // Panola — MISO
  '48419', // Shelby — MISO
]));

// CAISO does not balance these California load pockets.
const NOT_CAISO_CA = Object.freeze(new Set([
  '06037', // Los Angeles — LADWP
  '06067', // Sacramento — SMUD
  '06025', // Imperial — IID
]));

/**
 * Grid assignment for a located site.
 *
 * `watts_source` names the id of the collector/infra-sources adapter whose
 * reading applies, or null. That id is the join key into data/infra.json and is
 * how a pin gets to say "69% of committed capacity" without this file knowing
 * what a percentage of committed capacity is.
 */
export function gridFor({ state, county_fips }) {
  if (!state) {
    return { id: null, label: null, watts_source: null, why: 'no state resolved for this site' };
  }

  if (state === 'TX') {
    if (county_fips && NOT_ERCOT_TX.has(county_fips)) {
      return {
        id: null,
        label: 'WECC / SPP / MISO',
        watts_source: null,
        why: 'this Texas county is outside ERCOT — El Paso is WECC, the far Panhandle is SPP, the far east is MISO',
      };
    }
    return { id: 'ERCOT', label: 'ERCOT', watts_source: 'ercot-tightness', why: null };
  }

  if (state === 'NY') {
    return { id: 'NYISO', label: 'NYISO', watts_source: 'nyiso-baseload', why: null };
  }

  if (state === 'CA') {
    if (county_fips && NOT_CAISO_CA.has(county_fips)) {
      return {
        id: null,
        label: 'LADWP / SMUD / IID',
        watts_source: null,
        why: 'this California load pocket is balanced by a municipal utility, not by CAISO',
      };
    }
    return { id: 'CAISO', label: 'CAISO', watts_source: 'caiso-baseload', why: null };
  }

  const PJM = new Set(['VA', 'OH', 'PA', 'NJ', 'MD', 'DE', 'WV', 'DC', 'KY', 'IN', 'NC', 'MI']);
  if (PJM.has(state)) {
    return {
      id: 'PJM',
      label: 'PJM',
      watts_source: null,
      why: 'PJM publishes real-time demand only through Data Miner 2, which requires a registered subscription key. Keys are free; secrets in this repo are not permitted.',
    };
  }

  const MISO_SPP = new Set(['IA', 'NE', 'MN', 'MO', 'KS', 'OK', 'AR', 'LA', 'MS', 'ND', 'SD', 'WI', 'IL', 'MT']);
  if (MISO_SPP.has(state)) {
    return {
      id: 'MISO/SPP',
      label: 'MISO / SPP',
      watts_source: null,
      why: 'MISO’s public data broker answered {"error": "no data"} on every message type tested on 2026-09-23. SPP has no equivalent keyless endpoint.',
    };
  }

  const SOUTHEAST = new Set(['GA', 'AL', 'FL', 'SC', 'TN']);
  if (SOUTHEAST.has(state)) {
    return {
      id: null,
      label: 'Southern Co. / TVA / vertically integrated',
      watts_source: null,
      why: 'The Southeast is not an organised market. There is no independent system operator here and therefore no public real-time demand feed.',
    };
  }

  const WEST_VI = new Set(['AZ', 'NV', 'NM', 'UT', 'CO', 'WY', 'ID']);
  if (WEST_VI.has(state)) {
    return {
      id: null,
      label: 'WECC — vertically integrated utilities',
      watts_source: null,
      why: 'Vertically integrated utilities, no organised market, no public demand feed.',
    };
  }

  if (state === 'OR' || state === 'WA') {
    return {
      id: null,
      label: 'BPA',
      watts_source: null,
      why: 'Bonneville publishes balancing-authority totals on a different cadence and format; not yet read by this collector.',
    };
  }

  const ISONE = new Set(['MA', 'CT', 'RI', 'NH', 'VT', 'ME']);
  if (ISONE.has(state)) {
    return {
      id: 'ISO-NE',
      label: 'ISO New England',
      watts_source: null,
      why: 'ISO-NE publishes real-time demand through a web-services account; no keyless endpoint was found.',
    };
  }

  return {
    id: null,
    label: null,
    watts_source: null,
    why: `no grid mapped for ${state} in this table`,
  };
}

/** Everything this table claims, for the honesty section on the page. */
export const GRID_TABLE_NOTE = Object.freeze({
  grids_with_a_live_reading: ['ERCOT', 'NYISO', 'CAISO'],
  method: 'state, with named county exceptions for ERCOT and CAISO',
  caveat:
    'a balancing authority is not a state; outside the named exceptions this assignment is ' +
    'an approximation, and a site near a seam may be on a different grid than the one printed',
  agrees_with: 'site/templates/wattsPage.mjs CORRIDORS',
});
