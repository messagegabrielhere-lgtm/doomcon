// Which country is this point in?
//
// The world datacentre map needs one fact per site that OpenStreetMap only
// carries for about one object in twenty (addr:country): the country. It is
// answered the way _geo.mjs answers the county question - polygons fetched
// once, cached for ninety days, arithmetic here - so a run costs one request
// every three months rather than one per site every run.
//
// SOURCE. Natural Earth, 1:50m Admin 0 - Countries, public domain ("No
// permission is needed to use Natural Earth. Crediting the authors is
// unnecessary."), pinned to a release tag so the bytes cannot move under us.
//
// WHY 50m AND NOT 110m. Measured 2026-09-25: the 1:110m layer has NO Singapore
// polygon, so every one of the 47 Singapore-tagged datacentres would land in
// Malaysia and nothing downstream would notice. 110m is fine for DRAWING the
// world (site/templates/_worldmap.mjs uses it) and wrong for attributing
// points to countries. Two datasets, two jobs.
//
// THE COST, STATED. 50m polygons are generalised to roughly 1 km. A site within
// about a kilometre of a land border can be assigned to the neighbour, and the
// page says so; a site in no polygon at all - a coastal fill, an offshore
// island the layer omits - is published as unresolved, never guessed.

import { cached } from './_cache.mjs';
import { bboxOf, inPolygon } from './_util.mjs';

const TAG = 'v5.1.2';
const FILE = 'ne_50m_admin_0_countries.geojson';
export const ENDPOINTS = Object.freeze([
  `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${TAG}/geojson/${FILE}`,
  `https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@${TAG}/geojson/${FILE}`,
]);
const MAX_AGE_DAYS = 90;
const MIN_FEATURES = 200;   // the file carries 242; a short answer is a broken answer
const Q = 1e4;              // 0.0001 degree, about 11 m - far inside the layer's own tolerance
export const COUNTRY_CACHE_KEY = 'ne-countries-50m';

/** ISO 3166-1 alpha-2. ISO_A2 is the string "-99" for France, Norway and a
 *  few others; ISO_A2_EH carries the code Natural Earth actually means. */
function alpha2(p) {
  for (const k of ['ISO_A2_EH', 'ISO_A2', 'WB_A2']) {
    const v = p[k];
    if (typeof v === 'string' && /^[A-Z]{2}$/.test(v)) return v;
  }
  return null;
}

const q4 = (v) => Math.round(v * Q) / Q;

async function loadCountries(net) {
  let lastErr = null;
  for (const url of ENDPOINTS) {
    try {
      const g = await net.json(url, { timeoutMs: 90_000, retries: 1 });
      if (!g || !Array.isArray(g.features) || g.features.length < MIN_FEATURES) {
        throw new Error(`${url}: unexpected shape (${g?.features?.length ?? 'no'} features)`);
      }
      const features = g.features.map((f) => {
        const p = f.properties ?? {};
        const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
        return {
          iso3: p.ADM0_A3 ?? null,
          iso2: alpha2(p),
          name: p.ADMIN ?? p.NAME ?? null,
          continent: p.CONTINENT ?? null,
          subregion: p.SUBREGION ?? null,
          bbox: bboxOf(f.geometry).map(q4),
          polys: polys.map((poly) => poly.map((ring) => ring.map(([x, y]) => [q4(x), q4(y)]))),
        };
      }).sort((a, b) => String(a.iso3).localeCompare(String(b.iso3)) || String(a.name).localeCompare(String(b.name)));
      return { tag: TAG, file: FILE, url, features };
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr ?? new Error('country outline: no endpoint answered');
}

/**
 * Resolve the country index, from disk when it is fresh enough.
 * Returns { lookup(lat, lon), countries, meta } where lookup gives
 * { iso2, iso3, name, continent, subregion, boundary_risk } or null.
 */
export async function countryIndex(net, nowMs) {
  const r = await cached(COUNTRY_CACHE_KEY, {
    maxAgeDays: MAX_AGE_DAYS,
    nowMs,
    load: () => loadCountries(net),
  });
  const features = r.value.features;
  const RISK_DEG = 0.02; // ~2 km: twice the layer's generalisation

  function lookup(lat, lon) {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    for (const f of features) {
      const [minLon, minLat, maxLon, maxLat] = f.bbox;
      if (lon < minLon || lon > maxLon || lat < minLat || lat > maxLat) continue;
      for (const rings of f.polys) {
        if (!inPolygon(lon, lat, rings)) continue;
        const edge = Math.min(lon - minLon, maxLon - lon, lat - minLat, maxLat - lat);
        return {
          iso2: f.iso2, iso3: f.iso3, name: f.name, continent: f.continent, subregion: f.subregion,
          boundary_risk: edge < RISK_DEG,
        };
      }
    }
    return null;
  }

  return {
    lookup,
    countries: features.map((f) => ({ iso2: f.iso2, iso3: f.iso3, name: f.name, continent: f.continent, subregion: f.subregion })),
    meta: {
      id: COUNTRY_CACHE_KEY,
      label: 'Natural Earth 1:50m admin-0 countries',
      endpoint: r.value.url ?? ENDPOINTS[0],
      version: r.value.tag ?? TAG,
      licence: 'public domain',
      keyless: true,
      origin: r.origin,
      age_days: r.age_days,
      error: r.error,
      countries: features.length,
      refresh_days: MAX_AGE_DAYS,
      note:
        'country polygons generalised to about 1 km; a site within about a kilometre of a land border ' +
        'can be assigned to the neighbour, and says so. A site in no polygon is published as unresolved.',
    },
  };
}
