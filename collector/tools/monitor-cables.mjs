#!/usr/bin/env node
// Rebuild data/monitor-cables.json from TeleGeography's public cable GeoJSON.
//
//   docker run --rm --network host -v "$PWD":/app -w /app node:20-alpine \
//     node collector/tools/monitor-cables.mjs
//
// The World Monitor draws this as a static reference layer (like shipping
// lanes). The full TeleGeography file is ~750 KB; we keep the longest 180
// systems and downsample each segment so the page can load it on demand.

import { writeFile } from 'node:fs/promises';
import { fetchJson } from '../fetch.mjs';

const SRC = 'https://www.submarinecablemap.com/api/v3/cable/cable-geo.json';
const KEEP = 180;
const MAX_PTS = 24;
const OUT = new URL('../../data/monitor-cables.json', import.meta.url);

const geo = await fetchJson(SRC, { timeoutMs: 60000 });
if (!geo?.features?.length) throw new Error('monitor-cables: no features in TeleGeography response');

const scored = [];
for (const f of geo.features) {
  const name = f.properties?.name || '';
  const color = f.properties?.color || '#4fc3f7';
  let coords = f.geometry?.coordinates;
  if (!coords) continue;
  if (f.geometry.type === 'LineString') coords = [coords];
  const totalPts = coords.reduce((n, line) => n + (line?.length || 0), 0);
  const lines = [];
  for (const line of coords) {
    if (!Array.isArray(line) || line.length < 2) continue;
    const step = Math.max(1, Math.floor(line.length / MAX_PTS));
    const simp = line.filter((_, i) => i % step === 0);
    if (simp[simp.length - 1] !== line[line.length - 1]) simp.push(line[line.length - 1]);
    lines.push(simp.map(([lon, lat]) => [Math.round(lon * 100) / 100, Math.round(lat * 100) / 100]));
  }
  if (!lines.length) continue;
  scored.push({ n: name, c: color, l: lines, p: totalPts });
}

scored.sort((a, b) => b.p - a.p);
const cables = scored.slice(0, KEEP).map(({ n, c, l }) => ({ n, c, l }));

const out = {
  schema: 1,
  source: 'TeleGeography Submarine Cable Map',
  url: 'https://www.submarinecablemap.com/',
  generated: new Date().toISOString().slice(0, 10),
  cables,
};

await writeFile(OUT, JSON.stringify(out));
console.log(`wrote ${cables.length} cables → data/monitor-cables.json (${JSON.stringify(out).length} bytes)`);
