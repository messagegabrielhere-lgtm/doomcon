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
