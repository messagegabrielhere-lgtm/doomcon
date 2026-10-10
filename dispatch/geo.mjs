// Shared geo helpers for Dispatch collectors.
// CAD calls use ~1 km rounding (privacy). Alert systems use ~100 m.

import path from 'node:path';
import { pathToFileURL } from 'node:url';

/** Round to two decimal degrees (~1 km). Use for 911 / CAD pins. */
export function round2(n) {
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}

/** Round to three decimal degrees (~100 m). Use for weather / quake alerts. */
export function round3(n) {
  return Number.isFinite(n) ? Math.round(n * 1000) / 1000 : NaN;
}

/** Collapse whitespace; empty → null. */
export function clean(s) {
  if (s == null) return null;
  const t = String(s).replace(/\s+/g, ' ').trim();
  return t || null;
}

/** Polygon / MultiPolygon / Point → rough centroid, or null. */
export function geomCentroid(geometry) {
  if (!geometry) return null;
  if (geometry.type === 'Point' && Array.isArray(geometry.coordinates)) {
    const lon = round3(+geometry.coordinates[0]);
    const lat = round3(+geometry.coordinates[1]);
    return Number.isFinite(lon) && Number.isFinite(lat) ? { lon, lat } : null;
  }
  const pts = [];
  const walk = (coords) => {
    if (!Array.isArray(coords) || !coords.length) return;
    if (typeof coords[0] === 'number') { pts.push(coords); return; }
    for (const c of coords) walk(c);
  };
  walk(geometry.coordinates);
  if (!pts.length) return null;
  let x = 0, y = 0, n = 0;
  for (const p of pts) {
    if (Number.isFinite(+p[0]) && Number.isFinite(+p[1])) { x += +p[0]; y += +p[1]; n++; }
  }
  return n ? { lon: round3(x / n), lat: round3(y / n) } : null;
}

/** Rough state / territory centroids, for NWS zone alerts that carry no geometry. */
export const STATE_CENTROIDS = Object.freeze({
  AL: [-86.8, 32.8], AK: [-152.3, 64.2], AZ: [-111.7, 34.3], AR: [-92.4, 34.9], CA: [-119.4, 37.2],
  CO: [-105.5, 39.0], CT: [-72.7, 41.6], DE: [-75.5, 39.0], DC: [-77.0, 38.9], FL: [-81.7, 28.6],
  GA: [-83.4, 32.7], HI: [-157.5, 20.3], ID: [-114.6, 44.4], IL: [-89.2, 40.0], IN: [-86.3, 39.9],
  IA: [-93.5, 42.1], KS: [-98.4, 38.5], KY: [-85.3, 37.5], LA: [-91.9, 31.1], ME: [-69.2, 45.4],
  MD: [-76.8, 39.0], MA: [-71.8, 42.3], MI: [-84.7, 44.3], MN: [-94.3, 46.3], MS: [-89.7, 32.7],
  MO: [-92.5, 38.4], MT: [-109.6, 47.0], NE: [-99.8, 41.5], NV: [-116.6, 39.3], NH: [-71.6, 43.7],
  NJ: [-74.7, 40.2], NM: [-106.1, 34.4], NY: [-75.5, 42.9], NC: [-79.4, 35.6], ND: [-100.5, 47.5],
  OH: [-82.8, 40.3], OK: [-97.5, 35.6], OR: [-120.6, 43.9], PA: [-77.8, 40.9], RI: [-71.5, 41.7],
  SC: [-80.9, 33.9], SD: [-100.2, 44.4], TN: [-86.3, 35.9], TX: [-99.3, 31.5], UT: [-111.7, 39.3],
  VT: [-72.7, 44.1], VA: [-78.8, 37.5], WA: [-120.5, 47.4], WV: [-80.6, 38.6], WI: [-89.8, 44.6],
  WY: [-107.6, 43.0], PR: [-66.5, 18.2], VI: [-64.8, 18.3], GU: [144.8, 13.4],
});

/** Best-effort state code from an NWS area ("Leon, FL") or headline ("… by NWS Great Falls MT"). */
export function stateFromText(area, headline) {
  const a = String(area || '').match(/,\s*([A-Z]{2})\s*$/);
  if (a && STATE_CENTROIDS[a[1]]) return a[1];
  const h = String(headline || '').match(/\bby NWS\b.*?\b([A-Z]{2})\s*$/);
  if (h && STATE_CENTROIDS[h[1]]) return h[1];
  return null;
}

/**
 * True when this module is the process entrypoint.
 * Handles relative `process.argv[1]` (the old file:// string compare does not).
 */
export function isMain(metaUrl, argv1 = process.argv[1]) {
  if (!argv1) return false;
  try {
    return metaUrl === pathToFileURL(path.resolve(argv1)).href;
  } catch {
    return false;
  }
}
