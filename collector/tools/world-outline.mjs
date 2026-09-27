// One-off: turn Natural Earth's 1:110m admin-0 countries into the compact
// outline the world map draws and attributes points against.
//
//   curl -sL -o .tmp-world/ne110.geojson https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson
//   node collector/tools/world-outline.mjs .tmp-world/ne110.geojson 2026-09-27 0.2 > data/world-outline.json
//
// Natural Earth is public domain. 110m is the coarsest tier: 177 countries,
// 10,642 outer-ring vertices, 839 KB as GeoJSON. Visvalingam-Whyatt keeps the
// vertices that carry the most area, rings smaller than MIN_AREA are dropped
// unless they are all a country has, and every coordinate is quantised to
// 0.01 degrees, which is about 1 km - two orders of magnitude finer than the
// picture can show. Deterministic: same input, same date argument, same bytes.
//
// No dependencies, per CONTRACT.md. Node 20 built-ins only.

import { readFileSync } from 'node:fs';

const [, , src, retrieved, vwArg] = process.argv;
if (!src || !/^\d{4}-\d{2}-\d{2}$/.test(retrieved || '')) {
  process.stderr.write('usage: world-outline.mjs <ne_110m_admin_0_countries.geojson> <YYYY-MM-DD>\n');
  process.exit(2);
}

const MIN_AREA = 0.02;      // square degrees; drops islets that would be sub-pixel
const VW_AREA = Number(vwArg) > 0 ? Number(vwArg) : 0.02; // square degrees; the triangle area below which a vertex goes
const Q = 100;              // 0.01 degree

const q = (v) => Math.round(v * Q) / Q;

/** Shoelace area in square degrees, absolute. */
function ringArea(r) {
  let a = 0;
  for (let i = 0; i < r.length; i += 1) {
    const [x1, y1] = r[i]; const [x2, y2] = r[(i + 1) % r.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

/** Visvalingam-Whyatt: repeatedly remove the vertex whose triangle with its
 *  neighbours has the least area, until every remaining triangle exceeds the
 *  threshold. O(n^2) in this naive form; n is 10k, so it is instant. */
function simplify(ring, thresh) {
  const pts = ring.slice(0, -1); // GeoJSON rings repeat the first point last
  if (pts.length <= 4) return pts;
  const tri = (i) => {
    const a = pts[(i - 1 + pts.length) % pts.length]; const b = pts[i]; const c = pts[(i + 1) % pts.length];
    return Math.abs((a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1])) / 2);
  };
  for (;;) {
    if (pts.length <= 4) break;
    let min = Infinity; let at = -1;
    for (let i = 0; i < pts.length; i += 1) { const t = tri(i); if (t < min) { min = t; at = i; } }
    if (min >= thresh) break;
    pts.splice(at, 1);
  }
  return pts;
}

const g = JSON.parse(readFileSync(src, 'utf8'));
const countries = [];
for (const f of g.features) {
  const p = f.properties;
  const iso2 = (p.ISO_A2 && p.ISO_A2 !== '-99') ? p.ISO_A2 : (p.ISO_A2_EH && p.ISO_A2_EH !== '-99' ? p.ISO_A2_EH : null);
  const geom = f.geometry;
  const polys = geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates];
  const rings = polys.map((poly) => poly[0]); // outer rings only; holes are sub-pixel at this scale
  const sized = rings.map((r) => ({ r, a: ringArea(r) })).sort((x, y) => y.a - x.a);
  const kept = sized.filter((s, i) => i === 0 || s.a >= MIN_AREA);
  const out = kept.map((s) => simplify(s.r, VW_AREA).map(([x, y]) => [q(x), q(y)]))
    .filter((r) => r.length >= 3);
  countries.push({
    iso2, name: p.ADMIN, continent: p.CONTINENT, subregion: p.SUBREGION,
    rings: out,
  });
}
countries.sort((a, b) => String(a.name).localeCompare(String(b.name)));

const vertices = countries.reduce((n, c) => n + c.rings.reduce((m, r) => m + r.length, 0), 0);
const doc = {
  schema: 1,
  what_this_is: 'Country outlines for the world datacentre map, and the polygons every point is attributed to a country with.',
  source: {
    label: 'Natural Earth, 1:110m Admin 0 - Countries',
    url: 'https://www.naturalearthdata.com/downloads/110m-cultural-vectors/',
    file: 'ne_110m_admin_0_countries.geojson',
    licence: 'public domain',
    retrieved,
  },
  simplify: { method: 'visvalingam-whyatt', min_triangle_deg2: VW_AREA, min_ring_deg2: MIN_AREA, quantise_deg: 1 / Q },
  counts: { countries: countries.length, rings: countries.reduce((n, c) => n + c.rings.length, 0), vertices },
  countries,
};
process.stdout.write(`${JSON.stringify(doc)}\n`);
