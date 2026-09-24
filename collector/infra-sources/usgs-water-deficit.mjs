// Streamflow deficit at nine river gauges beside named datacentre clusters,
// as a percentage below the long-run normal flow for that calendar date.
//
//   deficit = 100 * (1 - today's daily mean flow / USGS median flow for this
//                        day of the year, over that gauge's whole record)
//
// Positive is drier than normal. Negative is wetter. Zero is an ordinary day.
// The index scalar is the MEDIAN of the nine, not the mean — see the aggregator
// note further down, which is there because the mean version shipped first and
// was wrong.
//
// WHY THE DENOMINATOR IS NOT OURS. Raw cubic feet per second is meaningless
// across gauges — the Columbia at The Dalles runs fifty times the Chattahoochee
// — and raw flow at one gauge is dominated by season. USGS already publishes,
// for every gauge and every day of the year, the median of that gauge's entire
// record: 127 years at Austin, 116 at Leesburg. Dividing by it removes the
// season and the size of the river in one step, using a number we did not
// choose. We could have computed our own baseline; a 127-year one published by
// the agency that owns the gauge is a better instrument and a much better answer
// to "where did that come from".
//
// WHAT THIS IS NOT. It is not datacentre water consumption. Nobody publishes
// that. Streamflow is rain, snowmelt, reservoir operations and irrigation, and
// a cooling tower's draw is a rounding error against all of them. What this
// measures is the condition of the water a datacentre cluster has to draw from —
// the constraint, not the consumption. docs/INFRA.md says this three times
// because it is the single most misreadable number on the page.
//
// Verified 2026-09-23: all nine gauges return daily values; the statistics
// service returns 366 day-of-year rows per gauge on one time series each.

import { parseRdb, mean, median, finite, round } from './_util.mjs';

const DV = 'https://waterservices.usgs.gov/nwis/dv/';
const STAT = 'https://waterservices.usgs.gov/nwis/stat/';

const DISCHARGE = '00060';   // streamflow, cubic feet per second
const DAILY_MEAN = '00003';  // the daily statistic we want, not min or max

// Three years of daily values is ~1,100 baseline points per gauge and ~750KB on
// the wire. Longer would be a better distribution and a ruder request; this is
// where the two curves cross. See docs/INFRA.md on run cadence.
const BASELINE_YEARS = 3;

// At least this many of the nine gauges must report on a date for that date's
// cross-gauge mean to be usable. A mean over four gauges and a mean over nine
// are different statistics and must not appear in the same series.
const MIN_SITES = 7;

/**
 * The gauges, and why each one. Every entry names a real datacentre cluster and
 * the water body that cluster's region actually draws on. A gauge chosen because
 * it was convenient would make this a decorative map.
 */
const GAUGES = Object.freeze([
  { site: '08158000', name: 'Colorado Rv at Austin', state: 'TX',
    cluster: 'Austin–San Antonio', note: 'central Texas build-out; ERCOT South' },
  { site: '08057000', name: 'Trinity Rv at Dallas', state: 'TX',
    cluster: 'Dallas–Fort Worth', note: 'ERCOT North; the densest Texas cluster' },
  { site: '01644000', name: 'Goose Creek near Leesburg', state: 'VA',
    cluster: 'Loudoun County', note: 'Data Center Alley itself; a small local stream' },
  { site: '01646500', name: 'Potomac Rv at Little Falls', state: 'MD',
    cluster: 'Northern Virginia', note: 'the regional supply gauge for the DC metro' },
  { site: '03227500', name: 'Scioto Rv at Columbus', state: 'OH',
    cluster: 'Central Ohio', note: 'New Albany and the Columbus corridor' },
  { site: '06610000', name: 'Missouri Rv at Omaha', state: 'NE',
    cluster: 'Council Bluffs–Omaha', note: 'the Iowa–Nebraska river cluster' },
  { site: '02335000', name: 'Chattahoochee Rv near Norcross', state: 'GA',
    cluster: 'Atlanta metro', note: 'metro Atlanta water supply' },
  { site: '09380000', name: 'Colorado Rv at Lees Ferry', state: 'AZ',
    cluster: 'Phoenix metro', note: 'the accounting point for Lower Basin deliveries, ' +
      'which is how Central Arizona Project water reaches Phoenix; it is 300 miles ' +
      'upstream of the datacentres and is a supply gauge, not a local one' },
  { site: '14105700', name: 'Columbia Rv at The Dalles', state: 'OR',
    cluster: 'The Dalles', note: 'the Oregon cluster sits on this river' },
]);

const SITE_LIST = GAUGES.map((g) => g.site).join(',');
const BY_SITE = new Map(GAUGES.map((g) => [g.site, g]));

/** site -> "M-D" -> long-run median flow. */
function readNormals(rdbText) {
  const { rows, hadSpecLine } = parseRdb(rdbText);
  const normals = new Map();
  const record = new Map();

  for (const r of rows) {
    const site = r.site_no;
    if (!BY_SITE.has(site)) continue;
    const p50 = Number(r.p50_va);
    // A blank or zero median makes the ratio undefined or infinite. Skipping the
    // day is correct; substituting anything would be inventing a river.
    if (!Number.isFinite(p50) || p50 <= 0) continue;
    const key = `${Number(r.month_nu)}-${Number(r.day_nu)}`;
    if (!normals.has(site)) normals.set(site, new Map());
    normals.get(site).set(key, p50);
    const begin = Number(r.begin_yr);
    const end = Number(r.end_yr);
    if (Number.isFinite(begin) && Number.isFinite(end)) record.set(site, { begin, end });
  }

  return { normals, record, hadSpecLine };
}

/** site -> "YYYY-MM-DD" -> daily mean flow, with the no-data sentinel removed. */
function readDailyValues(body) {
  const series = body?.value?.timeSeries;
  if (!Array.isArray(series) || series.length === 0) {
    throw new Error('usgs-water-deficit: daily-values response carried no timeSeries');
  }

  const flows = new Map();
  let sentinels = 0;

  for (const s of series) {
    const site = s?.sourceInfo?.siteCode?.[0]?.value;
    if (!site || !BY_SITE.has(site)) continue;
    // USGS declares its own sentinel per series rather than using null. Reading
    // it from the payload beats hard-coding -999999: an Ice-affected December at
    // Omaha is five days of -999999 that would otherwise read as a river running
    // a million cubic feet per second backwards.
    const sentinel = Number(s?.variable?.noDataValue);
    const points = s?.values?.[0]?.value;
    if (!Array.isArray(points)) continue;

    const byDay = new Map();
    for (const p of points) {
      const day = String(p?.dateTime ?? '').slice(0, 10);
      if (day.length !== 10) continue;
      const v = Number(p?.value);
      if (!Number.isFinite(v)) continue;
      if (Number.isFinite(sentinel) && v === sentinel) { sentinels++; continue; }
      if (v < 0) { sentinels++; continue; }
      byDay.set(day, v);
    }
    flows.set(site, byDay);
  }

  if (flows.size === 0) throw new Error('usgs-water-deficit: no requested gauge appeared in the response');
  return { flows, sentinels };
}

export default {
  id: 'usgs-water-deficit',
  pillar: 'water',
  label: 'Streamflow below normal, nine clusters',
  region: 'nine gauges, seven states',
  unitLabel: '% below normal, median of 9',
  cadence: 'daily, one day in arrears',
  direction: 'higher = less water in the rivers these clusters draw on',

  async collect(net) {
    const now = new Date();
    const startDT = new Date(Date.UTC(
      now.getUTCFullYear() - BASELINE_YEARS, now.getUTCMonth(), now.getUTCDate(),
    )).toISOString().slice(0, 10);

    const statUrl = `${STAT}?${new URLSearchParams({
      format: 'rdb', sites: SITE_LIST, statReportType: 'daily',
      statTypeCd: 'p50', parameterCd: DISCHARGE,
    })}`;
    const dvUrl = `${DV}?${new URLSearchParams({
      format: 'json', sites: SITE_LIST, parameterCd: DISCHARGE,
      statCd: DAILY_MEAN, startDT,
    })}`;

    const [rdbText, dvBody] = await Promise.all([net.text(statUrl), net.json(dvUrl)]);

    const { normals, record } = readNormals(rdbText);
    const { flows, sentinels } = readDailyValues(dvBody);

    if (normals.size === 0) {
      throw new Error('usgs-water-deficit: statistics service returned no usable medians');
    }

    // Build one cross-gauge mean per calendar date.
    const dates = new Set();
    for (const byDay of flows.values()) for (const d of byDay.keys()) dates.add(d);

    const series = [];
    for (const day of [...dates].sort()) {
      const [y, m, d] = day.split('-').map(Number);
      const key = `${m}-${d}`;
      const parts = [];
      for (const g of GAUGES) {
        const flow = flows.get(g.site)?.get(day);
        const normal = normals.get(g.site)?.get(key);
        if (!Number.isFinite(flow) || !Number.isFinite(normal) || normal <= 0) continue;
        parts.push({ site: g.site, flow, normal, deficit: 100 * (1 - flow / normal) });
      }
      if (parts.length < MIN_SITES) continue;
      // MEDIAN, NOT MEAN, and this is not a style preference. Measured
      // 2026-09-22 the Scioto at Columbus ran at 3,892% of its September median
      // after a storm and Goose Creek at 1,078%. A mean of ratios is unbounded
      // upward and bounded at +100 downward, so those two flooded creeks dragged
      // the nine-gauge mean to -528% -- a reading that says "wetter than any day
      // on record" -- while four of the nine gauges were in fact below normal
      // and the median of the nine was -12.8%, an ordinary slightly-wet day.
      // Two gauges decided the number for all nine. The median is the same
      // statistic without that failure mode; the mean is kept in meta so the
      // divergence stays visible rather than being quietly discarded.
      series.push({
        day,
        deficit: median(parts.map((p) => p.deficit)),
        meanDeficit: mean(parts.map((p) => p.deficit)),
        parts,
      });
      void y;
    }

    if (series.length === 0) {
      throw new Error(
        `usgs-water-deficit: no date had ${MIN_SITES} of ${GAUGES.length} gauges reporting ` +
        `against a published median (${dates.size} dates seen, ${sentinels} no-data points dropped)`
      );
    }

    const latest = series[series.length - 1];
    // Everything strictly older than today's reading. The value must never be a
    // member of the distribution it is scored against, or the newest observation
    // drags its own percentile toward the middle.
    const baseline = series.slice(0, -1).map((s) => s.deficit);

    const gauges = latest.parts.map((p) => {
      const g = BY_SITE.get(p.site);
      const rec = record.get(p.site);
      return {
        site: p.site,
        name: g.name,
        state: g.state,
        cluster: g.cluster,
        note: g.note,
        flow_cfs: round(p.flow, 1),
        normal_cfs: round(p.normal, 1),
        percent_of_normal: round(100 * (p.flow / p.normal), 1),
        deficit_pct: round(p.deficit, 1),
        record_years: rec ? `${rec.begin}–${rec.end}` : null,
      };
    });

    const missing = GAUGES.filter((g) => !latest.parts.some((p) => p.site === g.site))
      .map((g) => `${g.site} ${g.name}`);

    return {
      value: finite(round(latest.deficit, 2), 'usgs-water-deficit mean'),
      unit: 'percent below normal',
      observed_at: `${latest.day}T12:00:00.000Z`,
      baseline: {
        values: baseline,
        source: 'the same nine-gauge median recomputed for every earlier day in the window',
        span: `${series[0].day} to ${series[series.length - 2]?.day ?? series[0].day}`,
        note: `${BASELINE_YEARS} years of USGS daily values; the current reading is excluded`,
      },
      meta: {
        reading_day: latest.day,
        gauges_reporting: latest.parts.length,
        gauges_total: GAUGES.length,
        gauges_missing: missing,
        gauges,
        median_deficit_pct: round(latest.deficit, 2),
        mean_deficit_pct: round(latest.meanDeficit, 2),
        aggregator: 'median across gauges; the mean is reported but never scored',
        driest: gauges.reduce((a, b) => (b.deficit_pct > a.deficit_pct ? b : a)).name,
        wettest: gauges.reduce((a, b) => (b.deficit_pct < a.deficit_pct ? b : a)).name,
        baseline_days: baseline.length,
        no_data_points_dropped: sentinels,
        lag_note: 'USGS daily values settle the following morning, so this reads one day behind',
        direction: 'higher = drier',
        source_note:
          'denominator is the USGS published median for that gauge on that day of the year, ' +
          'over the gauge’s full period of record; it is not computed by this project',
      },
    };
  },
};
