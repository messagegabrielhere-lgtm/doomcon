// ERCOT overnight floor — the lowest the Texas grid went between midnight and
// 06:00 Central, in megawatts.
//
// WHY THE FLOOR AND NOT "DEMAND RIGHT NOW". Instantaneous grid demand is mostly
// a statement about the weather and the hour: at 17:00 in August ERCOT is
// serving air conditioning, and a series of that number measures Texas summers.
// The overnight trough is the part of the curve that air conditioning has left.
// What remains at 04:00 is industry, refrigeration, pumping — and datacentres,
// which are the only large load on the grid that runs flat out at four in the
// morning. The floor is therefore the cleanest public proxy for always-on
// industrial load that exists without a utility contract.
//
// It is a proxy and not a measurement, and docs/INFRA.md says so at length: a
// new aluminium smelter moves this number exactly as a new training cluster
// does, and nothing in this feed can tell them apart.
//
// Verified 2026-09-23: fuel-mix.json returns two local days (yesterday complete
// at 288 five-minute intervals, today partial), eight fuel categories.

import { wallMinutes, finite, round } from './_util.mjs';

const ENDPOINT = 'https://www.ercot.com/api/1/services/read/dashboards/fuel-mix.json';

// Midnight to 06:00 Central. 06:00 is before the Texas morning ramp in every
// season, and starting at 00:00 rather than 01:00 keeps the window whole-hour
// aligned so a DST spring-forward loses one interval rather than shifting the
// definition of the window.
const WINDOW_START_MIN = 0;
const WINDOW_END_MIN = 6 * 60;
const EXPECTED_INTERVALS = 72; // 6h at 5-minute resolution

// A partial overnight window has a higher minimum than a complete one purely
// because it contains fewer draws, so accepting one would publish an upward
// step that is an artefact of coverage. Two missing intervals is ERCOT's normal
// telemetry noise; ten is a different quantity.
const MIN_INTERVALS = 70;

/**
 * WHY fuel-mix AND NOT supply-demand. supply-demand.json carries `demand`
 * directly and would be the obvious read, but it publishes only the current
 * local day. Before 06:00 Central there is no complete overnight window in it
 * and the source would go dark for six hours out of every twenty-four.
 * fuel-mix.json carries yesterday as well, so a complete window always exists.
 *
 * Summing generation across fuels gives net generation, which is net load
 * served. `Power Storage` is negative while batteries charge, and that negative
 * is kept: a charging battery is a load on the grid at that instant, and
 * removing it would overstate the floor on every night the fleet charges.
 */
function totalGeneration(interval) {
  let total = 0;
  let fuels = 0;
  for (const [fuel, cell] of Object.entries(interval)) {
    const gen = cell?.gen;
    // A fuel row present but unparseable is not a zero. One silently-coerced
    // null here would show up as a 40 GW grid becoming a 31 GW grid overnight.
    if (typeof gen !== 'number' || !Number.isFinite(gen)) {
      throw new Error(`ercot-baseload: fuel "${fuel}" has non-numeric gen ${JSON.stringify(gen)}`);
    }
    total += gen;
    fuels++;
  }
  if (fuels === 0) throw new Error('ercot-baseload: interval carried no fuel rows');
  return { total, fuels };
}

export default {
  id: 'ercot-baseload',
  pillar: 'grid',
  label: 'ERCOT overnight floor',
  region: 'ERCOT · Texas',
  unitLabel: 'MW',
  cadence: 'daily, settles at 06:00 Central',
  direction: 'higher = more load that never switches off',

  async collect(net) {
    const body = await net.json(ENDPOINT);
    const data = body?.data;
    if (!data || typeof data !== 'object') {
      throw new Error(
        `ercot-baseload: no data object (keys: ${Object.keys(body ?? {}).join(',') || 'none'})`
      );
    }

    // Newest local day first; take the newest one whose overnight window is whole.
    const days = Object.keys(data).sort().reverse();
    const coverage = [];

    for (const day of days) {
      const intervals = data[day];
      if (!intervals || typeof intervals !== 'object') continue;

      const totals = [];
      let fuelCount = 0;
      for (const [stamp, cell] of Object.entries(intervals)) {
        // The local wall time lives in the first 19 characters of the key; the
        // trailing offset is what makes Date.parse able to place it absolutely.
        const min = wallMinutes(stamp.slice(11));
        if (min < WINDOW_START_MIN || min >= WINDOW_END_MIN) continue;
        const { total, fuels } = totalGeneration(cell);
        fuelCount = fuels;
        totals.push({ stamp, total });
      }

      coverage.push({ day, intervals: totals.length });
      if (totals.length < MIN_INTERVALS) continue;

      totals.sort((a, b) => a.total - b.total);
      const floor = totals[0];
      const peakOfWindow = totals[totals.length - 1].total;

      const ms = Date.parse(floor.stamp);
      if (!Number.isFinite(ms)) {
        throw new Error(`ercot-baseload: unparseable timestamp ${JSON.stringify(floor.stamp)}`);
      }

      return {
        value: finite(round(floor.total, 1), 'ercot-baseload floor'),
        unit: 'MW',
        observed_at: new Date(ms).toISOString(),
        meta: {
          local_day: day,
          window_local: '00:00–06:00 CT',
          intervals_used: totals.length,
          intervals_expected: EXPECTED_INTERVALS,
          fuel_categories: fuelCount,
          floor_at_local: floor.stamp,
          window_high_mw: round(peakOfWindow, 1),
          window_range_mw: round(peakOfWindow - floor.total, 1),
          days_available: days,
          feed_last_updated: body?.lastUpdated ?? null,
          direction: 'higher = more always-on load',
          source_note:
            'net generation summed across all fuel categories, five-minute resolution; ' +
            'Power Storage is negative while batteries charge and that sign is kept',
        },
      };
    }

    throw new Error(
      `ercot-baseload: no local day has a complete 00:00–06:00 CT window ` +
      `(need ${MIN_INTERVALS} of ${EXPECTED_INTERVALS} intervals; got ` +
      `${coverage.map((c) => `${c.day}=${c.intervals}`).join(', ') || 'no days'})`
    );
  },
};
