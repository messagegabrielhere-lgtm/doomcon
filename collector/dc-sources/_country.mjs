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
        const code = alpha2(p);
        const bb = bboxOf(f.geometry).map(q4);
        return {
          iso3: p.ADM0_A3 ?? null,
          iso2: code,
          // WHICH FEATURE IS THE COUNTRY, AND WHICH IS ONE OF ITS SPECKS.
          // Natural Earth gives Australia three features that all resolve to
          // AU - the mainland, Ashmore and Cartier, and the Coral Sea Islands.
          // A consumer that keeps the first one it sees labelled 148 Australian
          // datacentres "Ashmore and Cartier Islands". Only the sovereign
          // feature carries the plain ISO_A2; a dependency carries -99 there and
          // borrows the code through ISO_A2_EH. Extent is the tiebreak when
          // neither does, and it is in square degrees because it is only ever
          // compared with itself.
          primary: typeof p.ISO_A2 === 'string' && p.ISO_A2 === code,
          extent: Math.round(Math.abs((bb[2] - bb[0]) * (bb[3] - bb[1])) * 100) / 100,
          name: p.ADMIN ?? p.NAME ?? null,
          continent: p.CONTINENT ?? null,
          subregion: p.SUBREGION ?? null,
          bbox: bb,
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
  // Eight compass points on a circle of RISK_DEG around the site. The diagonals
  // are at RISK_DEG / sqrt(2) per axis so all eight sit the same distance out.
  const DIAG = Math.round(RISK_DEG * Math.SQRT1_2 * 1e6) / 1e6;
  const PROBES = Object.freeze([
    [0, RISK_DEG], [DIAG, DIAG], [RISK_DEG, 0], [DIAG, -DIAG],
    [0, -RISK_DEG], [-DIAG, -DIAG], [-RISK_DEG, 0], [-DIAG, DIAG],
  ]);

  /** Which country identity owns this feature. Natural Earth gives Australia
   *  three features that all carry AU; a probe that steps from the mainland on
   *  to Ashmore and Cartier has not crossed a border. Codeless features - the
   *  handful that carry "-99" in all three fields - are their own identity, so
   *  they still count as somewhere else. */
  const idOf = (f) => f.iso2 ?? `iso3:${f.iso3}`;

  /** The first feature whose polygons contain the point, or null. */
  function locate(lat, lon) {
    for (const f of features) {
      const [minLon, minLat, maxLon, maxLat] = f.bbox;
      if (lon < minLon || lon > maxLon || lat < minLat || lat > maxLat) continue;
      for (const rings of f.polys) if (inPolygon(lon, lat, rings)) return f;
    }
    return null;
  }

  // DISTANCE TO A BORDER, NOT TO A BOUNDING BOX. The flag used to test how far
  // the site was from the edge of its country's bbox, which for anywhere with
  // an overseas territory is a rectangle out at sea with no border on it: France
  // reached past Kourou, the United States past Guam, and 5,196 attributed sites
  // produced 3 flags. This steps RISK_DEG out in eight directions and asks the
  // same polygons what is there; a step into a DIFFERENT country is the thing
  // the flag claims. A step into the sea is not a border and is not flagged -
  // this says "could belong to the neighbour", and the sea has no neighbour.
  function nearAnotherCountry(lat, lon, home) {
    const mine = idOf(home);
    for (const [dLon, dLat] of PROBES) {
      const probeLat = lat + dLat;
      if (probeLat > 90 || probeLat < -90) continue;
      let probeLon = lon + dLon;
      if (probeLon > 180) probeLon -= 360;
      if (probeLon < -180) probeLon += 360;
      const f = locate(probeLat, probeLon);
      if (f && idOf(f) !== mine) return true;
    }
    return false;
  }

  function lookup(lat, lon) {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    const f = locate(lat, lon);
    if (!f) return null;
    return {
      iso2: f.iso2, iso3: f.iso3, name: f.name, continent: f.continent, subregion: f.subregion,
      boundary_risk: nearAnotherCountry(lat, lon, f),
    };
  }

  return {
    lookup,
    countries: features.map((f) => ({ iso2: f.iso2, iso3: f.iso3, name: f.name, continent: f.continent, subregion: f.subregion, primary: f.primary, extent: f.extent })),
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
        'can be assigned to the neighbour, and says so. The border flag steps 0.02 degrees out in eight ' +
        'directions and checks whether any of them lands in a different country. A site in no polygon is ' +
        'published as unresolved.',
    },
  };
}
