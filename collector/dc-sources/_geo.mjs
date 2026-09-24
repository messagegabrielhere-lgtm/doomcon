// Which county is this point in?
//
// Every join downstream needs it. The US Drought Monitor is queried by county
// FIPS. The grid a site sits on is a statement about a state. "Abilene, TX" is
// the sentence the whole feature exists to print, and OpenStreetMap only tells
// us that for the roughly half of sites carrying an addr:state tag.
//
// SOURCE. Census TIGERweb, the Census Bureau's own public ArcGIS service. No
// key, no registration, no terms click-through. Verified 2026-09-24.
//
//   https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer/13/query
//
// WHY NOT A PER-POINT GEOCODER. The FCC Area API and the Census coordinate
// geocoder both answer this question keylessly and both would need one request
// per site — about two thousand on a cold run, every run, forever. Fetching the
// county polygons once and doing the arithmetic here is nine requests every
// ninety days. Same answer, three orders of magnitude less traffic.
//
// WHY THE GEOMETRY IS SIMPLIFIED. Asking TIGERweb for full-resolution county
// polygons returns 18 MB per 400 counties — about 150 MB for the country, for a
// question whose answer changes at the scale of a city block.
// `maxAllowableOffset=0.005` degrees (roughly 550 m) brings that to about 3 MB
// for all 3,235 counties. THE COST IS REAL AND IT IS STATED ON THE PAGE: a site
// within a few hundred metres of a county line can land in the neighbouring
// county. It is never wrong about the STATE except where a state line is also
// that close, which the output flags as `boundary_risk`.
//
// WHY IT ALSO FILTERS THE COUNTRY. The Overpass query runs over a bounding box
// that necessarily includes Canada, Mexico and the Caribbean. A point in no US
// county is not in the United States, and is dropped. That is one mechanism
// doing two jobs, which is better than two mechanisms disagreeing.

import { cached } from './_cache.mjs';
import { bboxOf, inPolygon, FIPS_TO_STATE } from './_util.mjs';

const BASE =
  'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer/13/query';

const PAGE = 400;          // TIGERweb's transfer limit on this layer
const MAX_PAGES = 12;      // 4,800 records; there are 3,235 counties
const SIMPLIFY_DEG = 0.005;
const MAX_AGE_DAYS = 90;

// How close to a boundary is close enough to admit it. Two simplification
// tolerances: if the point is within this of the polygon's own bounding box
// edge we say so rather than let the reader assume survey accuracy.
const BOUNDARY_RISK_DEG = SIMPLIFY_DEG * 2;

export const COUNTY_CACHE_KEY = 'tiger-counties';

async function loadCounties(net) {
  const features = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const qs = new URLSearchParams({
      where: '1=1',
      outFields: 'GEOID,NAME,STATE',
      returnGeometry: 'true',
      geometryPrecision: '4',
      maxAllowableOffset: String(SIMPLIFY_DEG),
      outSR: '4326',
      f: 'geojson',
      resultRecordCount: String(PAGE),
      resultOffset: String(page * PAGE),
    });
    const body = await net.json(`${BASE}?${qs}`, { timeoutMs: 60_000 });
    const batch = body?.features;
    if (!Array.isArray(batch)) {
      throw new Error(
        `tiger-counties: page ${page} carried no features array ` +
          `(keys: ${Object.keys(body ?? {}).join(',') || 'none'})`,
      );
    }
    for (const f of batch) {
      if (!f?.geometry?.coordinates || !f?.properties?.GEOID) continue;
      features.push({
        geoid: String(f.properties.GEOID),
        name: String(f.properties.NAME ?? ''),
        state_fips: String(f.properties.STATE ?? '').padStart(2, '0'),
        bbox: bboxOf(f.geometry),
        polys: f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates],
      });
    }
    if (batch.length < PAGE) break;
    if (page === MAX_PAGES - 1) {
      throw new Error(
        `tiger-counties: still returning full pages at the ${MAX_PAGES}-page cap; ` +
          'silently truncating the country would drop whole states off the map',
      );
    }
  }

  // A truncated download is worse than none: it takes a state off the map and
  // reports every site in it as "not in the United States".
  if (features.length < 3000) {
    throw new Error(`tiger-counties: only ${features.length} counties returned; expected ~3,235`);
  }
  return { fetched_at: new Date().toISOString(), simplify_deg: SIMPLIFY_DEG, features };
}

/**
 * Resolve the county index, from disk when it is fresh enough.
 * Returns { lookup(lat, lon), meta } where lookup gives
 * { state, state_fips, county, county_fips, boundary_risk } or null.
 */
export async function countyIndex(net, nowMs) {
  const r = await cached(COUNTY_CACHE_KEY, {
    maxAgeDays: MAX_AGE_DAYS,
    nowMs,
    load: () => loadCounties(net),
  });

  const features = r.value.features;

  function lookup(lat, lon) {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    for (const f of features) {
      const [minLon, minLat, maxLon, maxLat] = f.bbox;
      if (lon < minLon || lon > maxLon || lat < minLat || lat > maxLat) continue;
      for (const rings of f.polys) {
        if (!inPolygon(lon, lat, rings)) continue;
        const edge = Math.min(lon - minLon, maxLon - lon, lat - minLat, maxLat - lat);
        return {
          state: FIPS_TO_STATE[f.state_fips] ?? null,
          state_fips: f.state_fips,
          county: f.name,
          county_fips: f.geoid,
          boundary_risk: edge < BOUNDARY_RISK_DEG,
        };
      }
    }
    return null;
  }

  return {
    lookup,
    meta: {
      id: 'tiger-counties',
      label: 'Census TIGERweb county boundaries',
      endpoint: BASE,
      keyless: true,
      origin: r.origin,
      age_days: r.age_days,
      error: r.error,
      counties: features.length,
      simplify_deg: SIMPLIFY_DEG,
      refresh_days: MAX_AGE_DAYS,
      note:
        'county polygons simplified to about 550 m; a site within a few hundred metres ' +
        'of a county line can be assigned to the neighbouring county, and says so',
    },
  };
}
