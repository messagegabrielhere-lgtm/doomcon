// ERCOT headroom — how much of the committed generating fleet the Texas grid is
// using at this instant, as a percentage.
//
// This is the closest thing in the whole index to the operator's "power
// outages". A blackout is not a signal you can watch build; by the time an
// outage is reportable the interesting part is over. What you CAN watch is the
// margin disappearing beforehand, and ERCOT publishes that every five minutes
// for free.
//
//   tightness = 100 * demand / committed capacity
//
// Higher means less slack. It is bounded, dimensionless, and comparable across
// seasons in a way that raw megawatts is not.
//
// THE CAVEAT, stated here because it is easy to forget downstream: `capacity` is
// COMMITTED capacity, not installed capacity. ERCOT commits units to follow
// expected load, so the denominator chases the numerator and the ratio is
// flatter than the underlying physical margin. It moves sharply when the fleet
// cannot follow — which is precisely the condition worth watching — and barely
// at all the rest of the time.
//
// THE FORECAST TRAP, which this adapter fell into once and now guards against.
// `supply-demand.json` publishes the WHOLE local day in one array: the intervals
// that have happened, and the intervals that have not. At 02:25 Central the file
// already carries rows stamped 23:55 tonight and 00:00 tomorrow. Those rows are
// marked `forecast: 1` and they carry plausible five-digit demand numbers, so a
// naive "newest row by epoch" read returns a day-ahead ERCOT projection and
// prints it as an observation — twenty-two hours of the future, with no visible
// symptom beyond an `observed_at` nobody checks.
//
// This index counts what happened. Rows with `forecast` set are dropped, and so
// is anything stamped after the run clock, before the ratio, the day high and
// the day low are computed. The count of rows dropped is published in meta so
// the filter is visible rather than implied.
//
// Verified 2026-09-24: 289 intervals for the local day, of which 30 were actual
// and 259 forecast; newest actual 57,624 MW against 82,421 MW committed at
// 02:25 Central, matching the feed's own `lastUpdated`.

import { finite, round } from './_util.mjs';

const SUPPLY_DEMAND = 'https://www.ercot.com/api/1/services/read/dashboards/supply-demand.json';

// Physical Responsive Capability: the megawatts of generation that would arrest
// a frequency fall right now. ERCOT's own emergency ladder is defined against
// it. This is ENRICHMENT ONLY — it never touches the scalar — because it is a
// second endpoint and a second endpoint is a second way to go dark. If it fails
// the reading still publishes, with the failure named in meta.
const PRC = 'https://www.ercot.com/api/1/services/read/dashboards/daily-prc.json';

/**
 * An interval is usable only if it has really happened and really carries both
 * quantities. `forecast` is ERCOT's own flag: 0 on actuals, 1 on projections.
 * The epoch test is a second gate rather than a substitute, because a flag we
 * do not control is one schema change away from being absent, and the failure
 * mode of trusting it alone is publishing a projection as a reading.
 */
function usable(row, nowMs) {
  if (!Number.isFinite(row?.epoch) || row.epoch > nowMs) return false;
  if (row.forecast !== undefined && row.forecast !== null && Number(row.forecast) !== 0) return false;
  return Number.isFinite(row.demand) && row.demand > 0 &&
         Number.isFinite(row.capacity) && row.capacity > 0;
}

async function readPrc(net) {
  try {
    const body = await net.json(PRC);
    const rows = Array.isArray(body?.data) ? body.data.filter((r) => Number.isFinite(r?.prc)) : [];
    if (rows.length === 0) return { error: 'prc feed carried no numeric readings' };
    let low = rows[0];
    for (const r of rows) if (r.prc < low.prc) low = r;
    const cc = body?.current_condition ?? {};
    return {
      current_mw: rows[rows.length - 1].prc,
      day_low_mw: low.prc,
      day_low_at_local: low.timestamp ?? null,
      samples: rows.length,
      // ERCOT's own words for its own grid, quoted rather than paraphrased.
      // A number we computed next to a sentence they wrote is the honest pairing.
      ercot_state: typeof cc.state === 'string' ? cc.state : null,
      ercot_title: typeof cc.title === 'string' ? cc.title : null,
      ercot_note: typeof cc.condition_note === 'string' ? cc.condition_note : null,
      eea_level: Number.isFinite(cc.eea_level) ? cc.eea_level : null,
    };
  } catch (err) {
    return { error: err?.message ?? String(err) };
  }
}

export default {
  id: 'ercot-tightness',
  pillar: 'grid',
  label: 'ERCOT headroom used',
  region: 'ERCOT · Texas',
  unitLabel: '% of committed capacity',
  cadence: 'every 5 minutes',
  direction: 'higher = less slack between load and the committed fleet',

  async collect(net) {
    const body = await net.json(SUPPLY_DEMAND);
    const rows = Array.isArray(body?.data) ? body.data : null;
    if (!rows) {
      throw new Error(
        `ercot-tightness: no data array (keys: ${Object.keys(body ?? {}).join(',') || 'none'})`
      );
    }

    const nowMs = Date.now();
    const live = rows.filter((r) => usable(r, nowMs));
    if (live.length === 0) {
      throw new Error(
        `ercot-tightness: none of ${rows.length} intervals were both observed and complete ` +
        `(forecast rows and rows stamped after the run clock are dropped)`
      );
    }

    // Newest by epoch, not by array position. The dashboard has always been in
    // order, but "trust the order of someone else's array" is not a guarantee
    // anyone gave us, and the cost of sorting 288 rows is nothing. By this point
    // every row left is an observation, so "newest" cannot mean "furthest into
    // the day ERCOT has guessed at".
    live.sort((a, b) => a.epoch - b.epoch);
    const latest = live[live.length - 1];

    const tightness = (100 * latest.demand) / latest.capacity;
    if (tightness <= 0 || tightness > 100) {
      // Demand above committed capacity is physically possible for one interval
      // during a shortfall, but it is far more often a feed error, and a ratio
      // over 100 would land in the baseline and distort every later percentile.
      throw new Error(
        `ercot-tightness: implausible ratio ${tightness.toFixed(2)}% ` +
        `(demand ${latest.demand} MW, committed capacity ${latest.capacity} MW)`
      );
    }

    const day = live.map((r) => (100 * r.demand) / r.capacity);
    const prc = await readPrc(net);

    return {
      value: finite(round(tightness, 3), 'ercot-tightness ratio'),
      unit: 'percent',
      observed_at: new Date(latest.epoch).toISOString(),
      meta: {
        demand_mw: round(latest.demand, 1),
        committed_capacity_mw: round(latest.capacity, 1),
        headroom_mw: round(latest.capacity - latest.demand, 1),
        interval_local: latest.timestamp ?? null,
        intervals_today: live.length,
        intervals_in_feed: rows.length,
        intervals_dropped_forecast: rows.length - live.length,
        today_high_pct: round(Math.max(...day), 3),
        today_low_pct: round(Math.min(...day), 3),
        feed_last_updated: body?.lastUpdated ?? null,
        prc,
        direction: 'higher = tighter',
        source_note:
          'capacity is COMMITTED capacity, which follows expected load, so this ratio ' +
          'understates the swing in physical margin; PRC is enrichment and never scored; ' +
          'rows ERCOT flags as forecast, and any row stamped after the run clock, are ' +
          'dropped before the ratio and the day high and low are computed',
      },
    };
  },
};
