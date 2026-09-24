// Severe drought across the ten states that hold the American datacentre
// build-out, as a percentage of land area.
//
// The scalar is the unweighted mean, across those ten states, of the share of
// each state's area in US Drought Monitor category D2 or worse. Higher is drier.
//
// WHY D2 AND NOT D0. D0 is "abnormally dry" and it is on somewhere almost
// always — Texas sat at 96.45% D0 on 2026-09-15 while only 42.64% was D2. A
// series that is pinned near its ceiling carries no information. D2 is "severe
// drought", the threshold at which water utilities start issuing restrictions,
// which is the point at which a river stops being scenery and starts being a
// permit condition for a cooling tower.
//
// WHY A DROUGHT INDEX AT ALL, NEXT TO THE STREAM GAUGES. The gauges measure what
// the river is doing now. The Drought Monitor is a weekly expert assessment that
// folds in soil moisture, reservoir storage, groundwater and snowpack — the
// slow state of the water system rather than this week's rain. Two instruments
// on the same question, one fast and mechanical, one slow and judged. When they
// disagree, that disagreement is the interesting reading, and it is the reason
// both are here rather than one.
//
// The Drought Monitor is produced by NDMC, USDA and NOAA and is itself a human
// judgement rendered weekly. It is not a measurement in the sense the stream
// gauges are, and docs/INFRA.md records that distinction rather than hiding it
// inside an average.
//
// Verified 2026-09-23: ten states, 261 weekly rows each over five years, 559KB.

import { usDate, mean, finite, round } from './_util.mjs';

const ENDPOINT =
  'https://usdmdataservices.unl.edu/api/StateStatistics/GetDroughtSeverityStatisticsByAreaPercent';

const BASELINE_YEARS = 5;

// FIPS codes, because the service takes those and not postal abbreviations.
// Every state here is named for a specific cluster; this is not "large states".
const STATES = Object.freeze([
  { fips: '48', abbr: 'TX', name: 'Texas',        cluster: 'Dallas, Austin, San Antonio' },
  { fips: '51', abbr: 'VA', name: 'Virginia',     cluster: 'Loudoun County' },
  { fips: '13', abbr: 'GA', name: 'Georgia',      cluster: 'Atlanta metro' },
  { fips: '39', abbr: 'OH', name: 'Ohio',         cluster: 'New Albany, Columbus' },
  { fips: '19', abbr: 'IA', name: 'Iowa',         cluster: 'Council Bluffs, Des Moines' },
  { fips: '31', abbr: 'NE', name: 'Nebraska',     cluster: 'Omaha, Papillion' },
  { fips: '04', abbr: 'AZ', name: 'Arizona',      cluster: 'Phoenix metro' },
  { fips: '41', abbr: 'OR', name: 'Oregon',       cluster: 'The Dalles, Hillsboro' },
  { fips: '36', abbr: 'NY', name: 'New York',     cluster: 'the NYISO control region' },
  { fips: '06', abbr: 'CA', name: 'California',   cluster: 'Santa Clara, the CAISO control region' },
]);

const BY_ABBR = new Map(STATES.map((s) => [s.abbr, s]));

/** D2-or-worse share for one row. The service reports cumulative categories. */
function severe(row) {
  const d2 = Number(row?.d2);
  if (!Number.isFinite(d2) || d2 < 0 || d2 > 100) return null;
  return d2;
}

export default {
  id: 'usdm-drought',
  pillar: 'water',
  label: 'Severe drought, ten cluster states',
  region: 'ten states, weekly',
  unitLabel: '% of area in D2+',
  cadence: 'weekly, published Thursdays',
  direction: 'higher = more of the build-out sitting in severe drought',

  async collect(net) {
    const now = new Date();
    const start = new Date(Date.UTC(
      now.getUTCFullYear() - BASELINE_YEARS, now.getUTCMonth(), now.getUTCDate(),
    ));

    const url = `${ENDPOINT}?${new URLSearchParams({
      aoi: STATES.map((s) => s.fips).join(','),
      startdate: usDate(start),
      enddate: usDate(now),
      statisticsType: '1', // "categorical" — the percent-of-area form
    })}`;

    // THE TRAP. Without an explicit JSON Accept header this service answers with
    // XML and a 200, which arrives in fetch.mjs as a parse error naming the URL
    // rather than the cause. One header, and it is not optional.
    const rows = await net.json(url, { headers: { accept: 'application/json' } });

    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error(
        `usdm-drought: expected an array of weekly rows, got ` +
        `${Array.isArray(rows) ? 'an empty array' : typeof rows}`
      );
    }

    // Group by the week the map was published for.
    const weeks = new Map();
    for (const r of rows) {
      const abbr = r?.stateAbbreviation;
      if (!BY_ABBR.has(abbr)) continue;
      const d2 = severe(r);
      if (d2 === null) continue;
      const date = String(r?.mapDate ?? '').slice(0, 10);
      if (date.length !== 10) continue;
      if (!weeks.has(date)) weeks.set(date, new Map());
      weeks.get(date).set(abbr, { d2, row: r });
    }

    // Every state or none. A mean over eight states and a mean over ten are
    // different numbers, and a week missing Texas would read as a national thaw.
    const complete = [...weeks.entries()]
      .filter(([, m]) => m.size === STATES.length)
      .sort((a, b) => (a[0] < b[0] ? -1 : 1));

    if (complete.length === 0) {
      throw new Error(
        `usdm-drought: no week had all ${STATES.length} states ` +
        `(${weeks.size} weeks seen, largest had ${Math.max(0, ...[...weeks.values()].map((m) => m.size))})`
      );
    }

    const [latestDate, latestMap] = complete[complete.length - 1];
    const latestValue = mean(STATES.map((s) => latestMap.get(s.abbr).d2));
    const baseline = complete.slice(0, -1).map(([, m]) => mean(STATES.map((s) => m.get(s.abbr).d2)));

    const states = STATES.map((s) => {
      const r = latestMap.get(s.abbr).row;
      const n = (k) => (Number.isFinite(Number(r?.[k])) ? round(Number(r[k]), 2) : null);
      return {
        abbr: s.abbr, name: s.name, cluster: s.cluster,
        none: n('none'), d0: n('d0'), d1: n('d1'),
        d2: n('d2'), d3: n('d3'), d4: n('d4'),
      };
    }).sort((a, b) => b.d2 - a.d2);

    return {
      value: finite(round(latestValue, 2), 'usdm-drought mean'),
      unit: 'percent of area',
      // The Drought Monitor's map date is the Tuesday the data cuts off for a
      // map published that Thursday. Midday UTC keeps it inside its own day for
      // every reader without claiming an hour the source never gave.
      observed_at: `${latestDate}T12:00:00.000Z`,
      baseline: {
        values: baseline,
        source: 'the same ten-state mean recomputed for every earlier week in the window',
        span: `${complete[0][0]} to ${complete[complete.length - 2]?.[0] ?? complete[0][0]}`,
        note: `${BASELINE_YEARS} years of weekly maps; the current week is excluded`,
      },
      meta: {
        map_date: latestDate,
        valid_start: latestMap.get('TX').row?.validStart ?? null,
        valid_end: latestMap.get('TX').row?.validEnd ?? null,
        states,
        states_total: STATES.length,
        driest: states[0].abbr,
        driest_d2: states[0].d2,
        states_clear_of_d2: states.filter((s) => s.d2 === 0).map((s) => s.abbr),
        baseline_weeks: baseline.length,
        weeks_seen: weeks.size,
        weeks_complete: complete.length,
        threshold: 'D2 — severe drought or worse; cumulative, so D2 includes D3 and D4',
        direction: 'higher = drier',
        source_note:
          'US Drought Monitor, produced weekly by NDMC, USDA and NOAA; an expert assessment, ' +
          'not an instrument reading, and averaged here without area or population weighting',
      },
    };
  },
};
