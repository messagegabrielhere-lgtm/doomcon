/** Round to three decimal degrees (~100 m). */
export function round3(n) {
  return Number.isFinite(n) ? Math.round(n * 1000) / 1000 : NaN;
}

/** Polygon / MultiPolygon / Point → rough centroid, or null. */
export function geomCentroid(geometry) {
  if (!geometry) return null;
  const pts = [];
  const walk = (coords) => {
    if (!Array.isArray(coords) || !coords.length) return;
    if (typeof coords[0] === 'number') { pts.push(coords); return; }
    for (const c of coords) walk(c);
  };
  if (geometry.type === 'Point') {
    return { lon: round3(+geometry.coordinates[0]), lat: round3(+geometry.coordinates[1]) };
  }
  walk(geometry.coordinates);
  if (!pts.length) return null;
  let x = 0, y = 0, n = 0;
  for (const p of pts) {
    if (Number.isFinite(+p[0]) && Number.isFinite(+p[1])) { x += +p[0]; y += +p[1]; n++; }
  }
  return n ? { lon: round3(x / n), lat: round3(y / n) } : null;
}
