// THE RESOURCE JOIN. This is the feature.
//
// A pin that says "Abilene, TX" is a map. A pin that says "Abilene, TX —
// ERCOT, 71.6% of committed capacity, Taylor County 17.9% in severe drought"
// is the thing this project exists to build, because it puts a datacentre next
// to the condition of the substrate it was built into, and nobody else joins
// those two up.
//
// THREE JOINS, EACH WITH ITS OWN HONESTY PROBLEM:
//
//  1. DROUGHT, per county. The US Drought Monitor publishes by county FIPS,
//     keyless, and answers a comma-separated list of counties in one request.
//     Verified 2026-09-24: Taylor County TX (Abilene) 17.9% D2; Dallas County
//     TX 88.31% D3 and 43.28% D4. Note what the number IS — the share of the
//     COUNTY'S AREA in that category, not a category for the site. A county 20%
//     in D3 does not tell you which 20%.
//
//  2. STREAMFLOW, nearest gauge. /watts reads nine USGS gauges chosen because
//     each sits on a datacentre corridor. The nearest of those nine is attached
//     with its distance in kilometres, and THE DISTANCE IS THE CAVEAT: Lees
//     Ferry is 300 km from Phoenix and is a supply gauge, not a local one. A
//     gauge 400 km away tells you about a watershed, not about a building. The
//     distance is published so the reader can discount it themselves.
//
//  3. GRID, per state. _grid.mjs, which must agree with the corridor table in
//     site/templates/wattsPage.mjs. Only ERCOT, NYISO and CAISO have a keyless
//     real-time feed; the rest carry a named reason instead of a number.
//
// NOTHING HERE MEASURES A DATACENTRE'S POWER OR WATER DRAW. That is not public
// anywhere, at any cadence, for any site. docs/INFRA.md §5 says it about
// /watts and it is no less true here. What is measured is the condition of the
// substrate around the pin.

import { readFileSync, existsSync } from 'node:fs';
import { haversineKm, round } from './_util.mjs';

const INFRA_PATH = 'data/infra.json';

const USDM_COUNTY =
  'https://usdmdataservices.unl.edu/api/CountyStatistics/GetDroughtSeverityStatisticsByAreaPercent';

// The service answers a list; 120 keeps the URL comfortably short and the whole
// country needs only a handful of requests.
const COUNTY_BATCH = 120;

// USGS site service, for the nine gauge coordinates. Keyless, and cached for a
// season — a stream gauge is a concrete post in a river.
const USGS_SITES = 'https://waterservices.usgs.gov/nwis/site/';

/** `M/D/YYYY`, the only date format the Drought Monitor service accepts. */
function usDate(d) {
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`;
}

/** Read the /watts output. It is the sibling and the single source for all three joins. */
export function readInfra() {
  if (!existsSync(INFRA_PATH)) {
    throw new Error(`resources: ${INFRA_PATH} does not exist; run collector/infra.mjs first`);
  }
  return JSON.parse(readFileSync(INFRA_PATH, 'utf8'));
}

function sourceById(infra, id) {
  return infra.sources?.find((s) => s.id === id) ?? null;
}

/**
 * Per-county drought for every county that has a site in it.
 *
 * THE TRAP, inherited from collector/infra-sources/usdm-drought.mjs: without an
 * explicit Accept: application/json header this service answers XML with a 200,
 * which surfaces as a parse error naming the URL rather than the cause. One
 * header, not optional. fetchJson sets it; this comment is here so nobody
 * "simplifies" it into fetchText.
 */
export async function droughtByCounty(net, countyFips, nowMs) {
  const wanted = [...new Set(countyFips)].filter((f) => /^\d{5}$/.test(f)).sort();
  const out = new Map();
  if (wanted.length === 0) return { byFips: out, meta: { counties_requested: 0, counties_returned: 0, error: null } };

  // The Drought Monitor publishes on Tuesdays for the previous Thursday. A
  // fourteen-day window always contains at least one published map and the
  // newest row wins, so the result does not depend on which day the run fires.
  const end = new Date(nowMs);
  const start = new Date(nowMs - 14 * 86_400_000);

  let error = null;
  let batches = 0;
  for (let i = 0; i < wanted.length; i += COUNTY_BATCH) {
    const aoi = wanted.slice(i, i + COUNTY_BATCH).join(',');
    const qs = new URLSearchParams({
      aoi,
      startdate: usDate(start),
      enddate: usDate(end),
      statisticsType: '1',
    });
    try {
      const rows = await net.json(`${USDM_COUNTY}?${qs}`, { timeoutMs: 60_000 });
      batches++;
      if (!Array.isArray(rows)) throw new Error('usdm-county: response was not an array');
      for (const r of rows) {
        const fips = String(r?.fips ?? '');
        if (!/^\d{5}$/.test(fips)) continue;
        const mapDate = String(r.mapDate ?? '').slice(0, 10);
        const prev = out.get(fips);
        if (prev && prev.map_date >= mapDate) continue;
        out.set(fips, {
          county: r.county ?? null,
          state: r.state ?? null,
          map_date: mapDate,
          none: num(r.none),
          d0: num(r.d0),
          d1: num(r.d1),
          d2: num(r.d2),
          d3: num(r.d3),
          d4: num(r.d4),
        });
      }
    } catch (err) {
      // One failed batch must not take the other batches, or the map, with it.
      error = String(err?.message ?? err);
    }
  }

  return {
    byFips: out,
    meta: {
      endpoint: USDM_COUNTY,
      keyless: true,
      counties_requested: wanted.length,
      counties_returned: out.size,
      batches,
      error,
      note:
        'the figure is the share of the COUNTY’S AREA in that category, not a category for the ' +
        'site; a county 20% in D3 does not say which 20%. The Drought Monitor is a weekly expert ' +
        'assessment by NDMC, USDA and NOAA — a judgement, not an instrument reading.',
    },
  };
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? round(n, 2) : null;
}

/**
 * The worst category with any of the county in it, as a label.
 * `null` when the county is clear of D0 entirely — which is a reading, not a gap.
 */
function droughtHeadline(d) {
  if (!d) return null;
  for (const k of ['d4', 'd3', 'd2', 'd1', 'd0']) {
    if (Number.isFinite(d[k]) && d[k] > 0) {
      return { category: k.toUpperCase(), area_pct: d[k] };
    }
  }
  return { category: 'none', area_pct: 0 };
}

/** Coordinates for the nine /watts gauges, from the USGS site service. Cached. */
export async function gaugeCoords(net, siteIds, parseRdb, cached, nowMs) {
  const ids = [...siteIds].sort();
  const r = await cached('usgs-gauge-sites', {
    maxAgeDays: 90,
    nowMs,
    load: async () => {
      const qs = new URLSearchParams({ format: 'rdb', sites: ids.join(','), siteOutput: 'expanded' });
      const text = await net.text(`${USGS_SITES}?${qs}`, { timeoutMs: 60_000 });
      const { rows } = parseRdb(text);
      const sites = [];
      for (const row of rows) {
        const lat = Number(row.dec_lat_va);
        const lon = Number(row.dec_long_va);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
        sites.push({ site: row.site_no, lat, lon, name: row.station_nm ?? null });
      }
      if (sites.length === 0) throw new Error('usgs-gauge-sites: no site rows with coordinates');
      return { fetched_at: new Date().toISOString(), sites };
    },
  });
  return r;
}

/**
 * WHAT A SITE CARRIES, AND WHY IT IS ONLY THIS.
 *
 * A pin holds join KEYS and the one number that is genuinely its own — the
 * distance to the nearest gauge. Everything else lives once, at the top of the
 * file, in `resources_index`.
 *
 * This is not tidiness. data/datacenters.json is rebuilt on a schedule and
 * committed. If every one of 1,877 pins carried a copy of its county's drought
 * row, its gauge's flow and its grid's current megawatts, then a grid reading
 * that moves every five minutes would rewrite all five megabytes every single
 * run, forever. Normalised, the pins change when OpenStreetMap changes — about
 * once a week — and the volatile numbers change in a block of about three
 * hundred lines.
 */
export function joinSite(site, { droughtMap, gauges, grid }) {
  const resources = {
    drought: null,
    streamflow: null,
    grid: { key: grid.key, id: grid.id },
  };

  if (site.county_fips && droughtMap.has(site.county_fips)) {
    resources.drought = { granularity: 'county', county_fips: site.county_fips };
  } else if (site.state) {
    resources.drought = { granularity: 'state', state: site.state };
  }

  if (Number.isFinite(site.lat) && Number.isFinite(site.lon) && gauges.length) {
    let best = null;
    for (const g of gauges) {
      const km = haversineKm(site.lat, site.lon, g.lat, g.lon);
      if (!best || km < best.km) best = { ...g, km };
    }
    if (best) {
      resources.streamflow = {
        site: best.site,
        distance_km: round(best.km, 1),
        // The one number that decides whether the gauge means anything here.
        // Nine gauges cannot cover a continent and the distance says so.
        relevance:
          best.km <= 50 ? 'local'
          : best.km <= 200 ? 'regional'
          : 'distant',
      };
    }
  }

  return resources;
}

/**
 * The index every pin points into. Built once per run.
 *
 * `drought_by_county` — only the counties that actually have a site in them.
 * `drought_by_state` — the ten states /watts already reads, for pins with no
 *                      coordinates. Most of the country is absent, deliberately.
 * `gauges`            — the nine USGS gauges, with their current reading.
 * `grids`             — the grid table, with the live reading where one exists.
 */
export function buildIndex({ infra, droughtMap, gauges, grids }) {
  const usdm = sourceById(infra, 'usdm-drought');
  const usgs = sourceById(infra, 'usgs-water-deficit');
  const gaugeReadings = usgs?.meta?.gauges ?? [];

  const drought_by_county = {};
  for (const [fips, d] of [...droughtMap.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    drought_by_county[fips] = {
      county: d.county,
      state: d.state,
      map_date: d.map_date,
      headline: droughtHeadline(d),
      area_pct: { none: d.none, d0: d.d0, d1: d.d1, d2: d.d2, d3: d.d3, d4: d.d4 },
    };
  }

  const drought_by_state = {};
  for (const st of usdm?.meta?.states ?? []) {
    drought_by_state[st.abbr] = {
      state: st.abbr,
      name: st.name ?? null,
      map_date: usdm?.meta?.map_date ?? null,
      headline: droughtHeadline(st),
      area_pct: { none: st.none, d0: st.d0, d1: st.d1, d2: st.d2, d3: st.d3, d4: st.d4 },
    };
  }

  const gaugeIndex = {};
  for (const g of gauges) {
    const r = gaugeReadings.find((x) => x.site === g.site) ?? null;
    gaugeIndex[g.site] = {
      site: g.site,
      name: r?.name ?? g.name,
      cluster: r?.cluster ?? null,
      note: r?.note ?? null,
      percent_of_normal: r?.percent_of_normal ?? null,
      deficit_pct: r?.deficit_pct ?? null,
      flow_cfs: r?.flow_cfs ?? null,
      normal_cfs: r?.normal_cfs ?? null,
      reading_day: usgs?.meta?.reading_day ?? null,
      // usgs-water-deficit can be live, awaiting-baseline or dark. The pin must
      // never present a dark gauge's last number as a current one.
      reading_state: usgs?.state ?? 'dark',
    };
  }

  const gridIndex = {};
  for (const [key, g] of Object.entries(grids)) {
    const src = g.watts_source ? sourceById(infra, g.watts_source) : null;
    gridIndex[key] = {
      id: g.id,
      label: g.label,
      why_no_reading: g.why,
      watts_source: g.watts_source,
      reading:
        src && Number.isFinite(src.value)
          ? {
              source: src.id,
              label: src.label,
              value: src.value,
              unit: src.unit_label ?? src.unit ?? null,
              observed_at: src.observed_at,
              // live | awaiting-baseline | dark, never merged into one another.
              state: src.state,
              score: Number.isFinite(src.score) ? src.score : null,
            }
          : null,
      reading_error: src?.error ?? null,
    };
  }

  return {
    drought_by_county,
    drought_by_state,
    gauges: gaugeIndex,
    grids: gridIndex,
    usdm_map_date: usdm?.meta?.map_date ?? null,
    usgs_reading_day: usgs?.meta?.reading_day ?? null,
    usgs_state: usgs?.state ?? 'dark',
    usdm_state: usdm?.state ?? 'dark',
  };
}

/**
 * The stable half of the sentence under a pin: place, grid name, county drought
 * headline, nearest gauge and its distance.
 *
 * THE LIVE NUMBERS ARE DELIBERATELY NOT IN HERE. "ERCOT, 71.6% of committed
 * capacity" is the sentence the feature exists to print, and the 71.6 moves
 * every five minutes. The page composes it from `resources_index.grids`; baking
 * it into 1,877 strings would make the file churn and would freeze a five-minute
 * number into a weekly artefact. docs/DATACENTERS.md gives the exact recipe.
 */
export function sentenceFor(site, index) {
  const parts = [];
  parts.push(
    site.county && site.state ? `${site.county}, ${site.state}`
    : site.state ? site.state
    : 'location not resolved',
  );

  const g = index.grids[site.resources?.grid?.key];
  if (g?.id) parts.push(g.id);
  else if (g?.label) parts.push(`${g.label} — no keyless demand feed`);

  const d = site.resources?.drought?.granularity === 'county'
    ? index.drought_by_county[site.resources.drought.county_fips]
    : index.drought_by_state[site.resources?.drought?.state];
  if (d?.headline) {
    parts.push(
      d.headline.category === 'none'
        ? 'no drought category here'
        : `${fmt(d.headline.area_pct)}% of the ${d.county ? 'county' : 'state'} in ${d.headline.category}`,
    );
  }

  const sf = site.resources?.streamflow;
  if (sf && index.gauges[sf.site]) {
    parts.push(`nearest gauge ${index.gauges[sf.site].name}, ${sf.distance_km} km`);
  }

  return parts.join(' · ');
}

function fmt(v) {
  if (!Number.isFinite(v)) return '—';
  return Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-US') : String(round(v, 1));
}
