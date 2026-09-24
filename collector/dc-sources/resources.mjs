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
 * Attach drought, streamflow and grid to one site.
 * A site with no coordinates still gets drought and grid from its state where
 * the data is state-shaped; it never gets a streamflow distance it cannot have.
 */
export function joinSite(site, { infra, droughtMap, gauges, grid }) {
  const resources = { drought: null, streamflow: null, grid: null };

  // --- drought -------------------------------------------------------------
  const usdm = sourceById(infra, 'usdm-drought');
  if (site.county_fips && droughtMap.has(site.county_fips)) {
    const d = droughtMap.get(site.county_fips);
    resources.drought = {
      granularity: 'county',
      county: d.county,
      county_fips: site.county_fips,
      map_date: d.map_date,
      headline: droughtHeadline(d),
      area_pct: { none: d.none, d0: d.d0, d1: d.d1, d2: d.d2, d3: d.d3, d4: d.d4 },
      source: 'US Drought Monitor, county statistics',
      state: null,
    };
  } else if (site.state && usdm?.meta?.states) {
    // Fall back to the ten states /watts already reads. Only ten states, so
    // most of the country gets null here rather than an invented number.
    const st = usdm.meta.states.find((s) => s.abbr === site.state);
    if (st) {
      resources.drought = {
        granularity: 'state',
        county: null,
        county_fips: null,
        map_date: usdm.meta.map_date ?? null,
        headline: droughtHeadline(st),
        area_pct: { none: st.none, d0: st.d0, d1: st.d1, d2: st.d2, d3: st.d3, d4: st.d4 },
        source: 'US Drought Monitor, state statistics, via /watts',
        state: st.abbr,
      };
    }
  }

  // --- streamflow ----------------------------------------------------------
  const usgs = sourceById(infra, 'usgs-water-deficit');
  const gaugeReadings = usgs?.meta?.gauges ?? [];
  if (Number.isFinite(site.lat) && Number.isFinite(site.lon) && gauges.length) {
    let best = null;
    for (const g of gauges) {
      const km = haversineKm(site.lat, site.lon, g.lat, g.lon);
      if (!best || km < best.km) best = { ...g, km };
    }
    if (best) {
      const reading = gaugeReadings.find((g) => g.site === best.site) ?? null;
      resources.streamflow = {
        site: best.site,
        name: reading?.name ?? best.name,
        cluster: reading?.cluster ?? null,
        distance_km: round(best.km, 1),
        percent_of_normal: reading?.percent_of_normal ?? null,
        deficit_pct: reading?.deficit_pct ?? null,
        flow_cfs: reading?.flow_cfs ?? null,
        normal_cfs: reading?.normal_cfs ?? null,
        reading_day: usgs?.meta?.reading_day ?? null,
        gauge_note: reading?.note ?? null,
        // The one number that decides whether the rest of this object means
        // anything. Nine gauges cannot cover a continent.
        relevance:
          best.km <= 50 ? 'local'
          : best.km <= 200 ? 'regional'
          : 'distant — this gauge describes a different watershed',
      };
    }
  }

  // --- grid ----------------------------------------------------------------
  const g = grid;
  const src = g.watts_source ? sourceById(infra, g.watts_source) : null;
  resources.grid = {
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
            state: src.state,
            observed_at: src.observed_at,
            // A source that is live is scored; one awaiting baseline has a real
            // number and no percentile. The two are never merged.
            score: Number.isFinite(src.score) ? src.score : null,
          }
        : null,
    reading_state: src ? src.state : null,
  };

  return resources;
}

/** One plain sentence per site. The thing the page prints under the pin. */
export function sentenceFor(site) {
  const where = site.county && site.state ? `${site.county}, ${site.state}`
    : site.state ? site.state
    : 'location not resolved';
  const parts = [where];

  const gr = site.resources?.grid;
  if (gr?.reading) {
    parts.push(`${gr.id} — ${fmt(gr.reading.value)} ${gr.reading.unit ?? ''}`.trim());
  } else if (gr?.label) {
    parts.push(`${gr.label}, no keyless demand feed`);
  }

  const d = site.resources?.drought;
  if (d?.headline && d.headline.category !== 'none') {
    parts.push(
      `${d.granularity === 'county' ? d.county : d.state} ${fmt(d.headline.area_pct)}% in ${d.headline.category}`,
    );
  } else if (d?.headline) {
    parts.push('no drought category in this county');
  }

  const s = site.resources?.streamflow;
  if (s && Number.isFinite(s.percent_of_normal)) {
    parts.push(`nearest gauge ${s.name} ${fmt(s.percent_of_normal)}% of the seasonal median, ${s.distance_km} km away`);
  }

  return parts.join(' · ');
}

function fmt(v) {
  if (!Number.isFinite(v)) return '—';
  return Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-US') : String(round(v, 1));
}
