// Pure helpers for the datacentre dataset. No network, no clock, no randomness —
// CONTRACT.md §1.4: identical inputs must produce byte-identical output.
//
// Leading underscore: collector/datacenters.mjs never treats these as adapters.

import { createHash } from 'node:crypto';

/** Stable short id. Same inputs -> same id forever, across machines and runs. */
export function stableId(prefix, ...parts) {
  const h = createHash('sha256').update(parts.map((p) => String(p ?? '')).join('\u0000')).digest('hex');
  return `${prefix}_${h.slice(0, 12)}`;
}

/** Rounds for output. Keeps data/datacenters.json free of float dust. */
export function round(value, dp = 4) {
  if (!Number.isFinite(value)) return null;
  const f = 10 ** dp;
  return Math.round(value * f) / f;
}

/** Great-circle distance in kilometres. Mean Earth radius; good to ~0.5%. */
export function haversineKm(aLat, aLon, bLat, bLon) {
  const R = 6371.0088;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/**
 * Ray-casting point-in-polygon over a GeoJSON ring (array of [lon, lat]).
 *
 * The half-open comparison `(yi > y) !== (yj > y)` is what stops a point that
 * sits exactly on a shared horizontal edge being counted twice — which is not a
 * theoretical worry here, because county boundaries follow parallels across most
 * of the western United States and a datacentre on a section line is normal.
 */
function inRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Inside the outer ring and outside every hole. GeoJSON Polygon coordinates. */
export function inPolygon(lon, lat, rings) {
  if (!rings?.length || !inRing(lon, lat, rings[0])) return false;
  for (let i = 1; i < rings.length; i++) if (inRing(lon, lat, rings[i])) return false;
  return true;
}

/** [minLon, minLat, maxLon, maxLat] of a GeoJSON Polygon / MultiPolygon. */
export function bboxOf(geometry) {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  const polys = geometry.type === 'MultiPolygon' ? geometry.coordinates : [geometry.coordinates];
  for (const poly of polys) {
    for (const [lon, lat] of poly[0]) {
      if (lon < minLon) minLon = lon;
      if (lat < minLat) minLat = lat;
      if (lon > maxLon) maxLon = lon;
      if (lat > maxLat) maxLat = lat;
    }
  }
  return [minLon, minLat, maxLon, maxLat];
}

/**
 * Parse an OSM power tag into megawatts.
 *
 * OSM writes these by hand and the corpus really does contain "42 MW",
 * "2.0 MW", "108MW", "1500 kW" and "1.2 GW". A tag we cannot read returns null
 * and the raw string is kept beside it — never a zero, which would be a claim
 * that the building draws nothing.
 */
export function parseMegawatts(raw) {
  if (typeof raw !== 'string') return null;
  const m = /^\s*([0-9]+(?:[.,][0-9]+)?)\s*(m|k|g)?w\s*$/i.exec(raw.replace(/\s+/g, ' '));
  if (!m) return null;
  const n = Number(m[1].replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  const unit = (m[2] ?? 'm').toLowerCase();
  const mw = unit === 'k' ? n / 1000 : unit === 'g' ? n * 1000 : n;
  // A single building drawing more than two gigawatts is a tagging error, not a
  // discovery. Rejecting it keeps one mistyped tag out of every total on the page.
  return mw > 0 && mw <= 2000 ? round(mw, 3) : null;
}

/** Sort key that never depends on iteration order of a Map or an object. */
export function bySiteOrder(a, b) {
  return (
    String(a.state ?? 'ZZ').localeCompare(String(b.state ?? 'ZZ')) ||
    String(a.county ?? '').localeCompare(String(b.county ?? '')) ||
    String(a.name ?? '').localeCompare(String(b.name ?? '')) ||
    String(a.id).localeCompare(String(b.id))
  );
}

/** Canonical JSON: keys sorted at every level, so a diff is a real change. */
export function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value).sort()) out[k] = canonical(value[k]);
    return out;
  }
  return value;
}

/** The fifty states plus DC, by postal abbreviation and by name. */
export const STATE_NAMES = Object.freeze({
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan',
  MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
  NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota',
  OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee',
  TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
});

/** FIPS -> postal abbreviation. The join key between TIGER and everything else. */
export const FIPS_TO_STATE = Object.freeze({
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO',
  '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL', '13': 'GA', '15': 'HI',
  '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA', '20': 'KS', '21': 'KY',
  '22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN',
  '28': 'MS', '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH',
  '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH',
  '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC', '46': 'SD',
  '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA',
  '54': 'WV', '55': 'WI', '56': 'WY',
});
