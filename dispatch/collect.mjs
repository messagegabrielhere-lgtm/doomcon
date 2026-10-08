// Dispatch snapshot: 911 CAD calls, NWS emergency alerts, and police-call
// "blather" (the nature-of-call chatter from open CAD feeds).
//
// Same publishing pattern as monitor/ and scanner/: the workflow writes JSON to
// the dispatch-data branch; site/static/dispatch.html reads it from
// raw.githubusercontent.com. Nothing here writes to main or touches the index.
//
// Privacy: street addresses never leave this file. Coordinates are rounded to
// three decimal degrees (~100 m). SF rows marked sensitive_call are dropped.
//
// Usage: node dispatch/collect.mjs <outdir>

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fetchJson, fetchText } from '../collector/fetch.mjs';

const OUT = process.argv[2] || 'dispatch-out';
const log = (...a) => console.log(...a);

const NWS_URL = 'https://api.weather.gov/alerts/active?status=actual&message_type=alert';
const NWS_HEADERS = { Accept: 'application/geo+json' };

// Keep Severe and Extreme, plus a short list of warning-class events that NWS
// sometimes tags Moderate but that still belong on an emergency board.
// Named events kept even when NWS tags them Moderate. Marine gales are left
// out on purpose — they dominate the active feed and bury land emergencies.
const NWS_EVENT_KEEP = /\b(Tornado|Hurricane|Typhoon|Tropical Storm|Tsunami|Flash Flood|Flood Warning|Severe Thunderstorm|Blizzard|Ice Storm|Extreme Wind|Storm Surge|Red Flag|Extreme Heat|Heat (Warning|Advisory)|Cold Warning|Wind Chill|Winter Storm|Fire Weather|Avalanche)\b/i;

/** City CAD adapters. Each returns { calls, blather } or throws. */
const CITIES = [
  {
    id: 'seattle',
    label: 'Seattle 911',
    city: 'Seattle',
    agency: 'Fire/EMS',
    url: 'https://data.seattle.gov/resource/kzjm-xkqj.json?$limit=200&$order=datetime%20DESC',
    map(rows) {
      const calls = [], blather = [];
      for (const r of rows) {
        const t = Date.parse(r.datetime);
        const lon = round3(+r.longitude), lat = round3(+r.latitude);
        if (!Number.isFinite(t) || !Number.isFinite(lon) || !Number.isFinite(lat)) continue;
        const type = clean(r.type);
        if (!type) continue;
        const id = `sea:${r.incident_number || `${t}:${lon},${lat}`}`;
        calls.push({ id, city: 'Seattle', agency: 'Fire/EMS', type, t, lon, lat, district: null, priority: null });
        blather.push({ t, city: 'Seattle', agency: 'Fire/EMS', text: type });
      }
      return { calls, blather };
    },
  },
  {
    id: 'sf',
    label: 'San Francisco CAD',
    city: 'San Francisco',
    agency: 'Police',
    url: 'https://data.sf.gov/resource/gnap-fj3t.json?$limit=200&$order=received_datetime%20DESC'
      + '&$where=intersection_point%20IS%20NOT%20NULL%20AND%20sensitive_call=false'
      + '&$select=cad_number,call_type_final_desc,agency,priority_final,received_datetime,intersection_point,police_district,sensitive_call',
    map(rows) {
      const calls = [], blather = [];
      for (const r of rows) {
        if (r.sensitive_call === true || r.sensitive_call === 'true') continue;
        const t = Date.parse(r.received_datetime);
        const coords = r.intersection_point?.coordinates;
        const lon = round3(+coords?.[0]), lat = round3(+coords?.[1]);
        if (!Number.isFinite(t) || !Number.isFinite(lon) || !Number.isFinite(lat)) continue;
        const type = clean(r.call_type_final_desc);
        if (!type) continue;
        const agency = clean(r.agency) || 'Police';
        const id = `sf:${r.cad_number || `${t}:${lon},${lat}`}`;
        calls.push({
          id, city: 'San Francisco', agency, type, t, lon, lat,
          district: clean(r.police_district), priority: clean(r.priority_final),
        });
        blather.push({ t, city: 'San Francisco', agency, text: type });
      }
      return { calls, blather };
    },
  },
  {
    id: 'montgomery',
    label: 'Montgomery County MD',
    city: 'Montgomery Co.',
    agency: 'Police',
    url: 'https://data.montgomerycountymd.gov/resource/98cc-bc7d.json?$limit=200&$order=start_time%20DESC',
    map(rows) {
      const calls = [], blather = [];
      for (const r of rows) {
        const t = Date.parse(r.start_time);
        const lon = round3(+(r.longitude ?? r.geolocation?.coordinates?.[0]));
        const lat = round3(+(r.latitude ?? r.geolocation?.coordinates?.[1]));
        if (!Number.isFinite(t) || !Number.isFinite(lon) || !Number.isFinite(lat)) continue;
        const type = clean(r.initial_type || r.close_type);
        if (!type) continue;
        const id = `moco:${r.incident_id || `${t}:${lon},${lat}`}`;
        calls.push({
          id, city: 'Montgomery Co.', agency: 'Police', type, t, lon, lat,
          district: clean(r.police_district_number), priority: clean(r.priority),
        });
        blather.push({ t, city: 'Montgomery Co.', agency: 'Police', text: type });
      }
      return { calls, blather };
    },
  },
  {
    // Dallas publishes active police calls without coordinates. Pins sit on
    // division centroids; the nature_of_call strings feed the blather ticker.
    id: 'dallas',
    label: 'Dallas Police',
    city: 'Dallas',
    agency: 'Police',
    url: 'https://www.dallasopendata.com/resource/9fxf-t2tr.json?$limit=200',
    map(rows) {
      const calls = [], blather = [];
      for (const r of rows) {
        const day = (r.date || '').slice(0, 10);
        const t = Date.parse(`${day}T${r.time || '12:00:00'}`);
        const type = clean(r.nature_of_call);
        if (!type || !Number.isFinite(t)) continue;
        const div = clean(r.division) || 'Central';
        const c = DALLAS_DIV[div] || DALLAS_DIV.Central;
        const id = `dal:${r.incident_number || `${t}:${type}:${div}`}`;
        calls.push({
          id, city: 'Dallas', agency: 'Police', type, t,
          lon: c[0], lat: c[1], district: div, priority: clean(r.priority),
          approx: true,
        });
        blather.push({ t, city: 'Dallas', agency: 'Police', text: type });
      }
      return { calls, blather };
    },
  },
];

// Approximate Dallas PD division centres (lon, lat), three-decimal rounded.
const DALLAS_DIV = {
  Central: [-96.797, 32.780],
  'North Central': [-96.780, 32.900],
  Northeast: [-96.700, 32.860],
  Northwest: [-96.900, 32.900],
  'South Central': [-96.800, 32.720],
  Southeast: [-96.700, 32.720],
  Southwest: [-96.900, 32.700],
};

function round3(n) { return Number.isFinite(n) ? Math.round(n * 1000) / 1000 : NaN; }
function clean(s) {
  if (s == null) return null;
  const t = String(s).replace(/\s+/g, ' ').trim();
  return t || null;
}

/** Polygon / MultiPolygon → rough centroid. */
export function geomCentroid(geometry) {
  if (!geometry) return null;
  const pts = [];
  const walk = (coords, depth) => {
    if (!Array.isArray(coords) || !coords.length) return;
    if (typeof coords[0] === 'number') { pts.push(coords); return; }
    for (const c of coords) walk(c, depth + 1);
  };
  if (geometry.type === 'Point') return { lon: round3(+geometry.coordinates[0]), lat: round3(+geometry.coordinates[1]) };
  walk(geometry.coordinates, 0);
  if (!pts.length) return null;
  let x = 0, y = 0, n = 0;
  for (const p of pts) {
    if (Number.isFinite(+p[0]) && Number.isFinite(+p[1])) { x += +p[0]; y += +p[1]; n++; }
  }
  return n ? { lon: round3(x / n), lat: round3(y / n) } : null;
}

function keepAlert(p) {
  if (!p) return false;
  if (p.severity === 'Extreme' || p.severity === 'Severe') return true;
  return NWS_EVENT_KEEP.test(p.event || '') || NWS_EVENT_KEEP.test(p.headline || '');
}

async function collectNws(sources) {
  const body = await fetchText(NWS_URL, { headers: NWS_HEADERS, timeoutMs: 40000, retries: 1 });
  let j;
  try { j = JSON.parse(body); } catch { throw new Error('NWS alerts: bad JSON'); }
  const alerts = [];
  for (const f of j.features || []) {
    const p = f.properties || {};
    if (!keepAlert(p)) continue;
    const c = geomCentroid(f.geometry); // null for zone-only alerts → list yes, map no
    const t = Date.parse(p.onset || p.effective || p.sent) || Date.now();
    alerts.push({
      id: p.id || f.id,
      event: clean(p.event) || 'Alert',
      severity: clean(p.severity) || 'Unknown',
      urgency: clean(p.urgency),
      headline: clean(p.headline),
      area: clean((p.areaDesc || '').split(';')[0]),
      lon: c?.lon ?? null, lat: c?.lat ?? null, t,
      ends: Date.parse(p.ends || p.expires) || null,
      url: p['@id'] || f.id || null,
    });
  }
  // Newest first; cap so the page stays light.
  alerts.sort((a, b) => b.t - a.t);
  const out = alerts.slice(0, 250);
  sources.nws = { ok: true, n: out.length, of: (j.features || []).length };
  log(`nws ${out.length} alerts (from ${(j.features || []).length} active)`);
  return out;
}

async function collectCity(city, sources) {
  try {
    const rows = await fetchJson(city.url, { timeoutMs: 30000, retries: 1 });
    if (!Array.isArray(rows)) throw new Error('expected JSON array');
    const { calls, blather } = city.map(rows);
    sources[city.id] = { ok: true, n: calls.length, label: city.label };
    log(`${city.id} ${calls.length} calls`);
    return { calls, blather };
  } catch (e) {
    sources[city.id] = { ok: false, error: String(e.message).slice(0, 160), label: city.label };
    log(`${city.id} FAILED ${sources[city.id].error}`);
    return { calls: [], blather: [] };
  }
}

export async function main() {
  const t0 = Date.now();
  const sources = {};
  let alerts = [];
  try {
    alerts = await collectNws(sources);
  } catch (e) {
    sources.nws = { ok: false, error: String(e.message).slice(0, 160) };
    log(`nws FAILED ${sources.nws.error}`);
  }

  const cityParts = await Promise.all(CITIES.map((c) => collectCity(c, sources)));
  const calls = cityParts.flatMap((p) => p.calls);
  const blather = cityParts.flatMap((p) => p.blather);

  // Deduplicate blather by city+text+minute so the ticker is not a wall of
  // identical Aid Response Yellow lines.
  const seen = new Set();
  const blatherDedup = [];
  for (const b of blather.sort((a, b) => b.t - a.t)) {
    const key = `${b.city}|${b.text}|${Math.floor(b.t / 60000)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    blatherDedup.push(b);
    if (blatherDedup.length >= 400) break;
  }

  calls.sort((a, b) => b.t - a.t);
  const snap = {
    schema: 1,
    generated: new Date().toISOString(),
    took_ms: Date.now() - t0,
    sources,
    counts: {
      alerts: alerts.length,
      calls: calls.length,
      blather: blatherDedup.length,
      cities_ok: CITIES.filter((c) => sources[c.id]?.ok).length,
      cities: CITIES.length,
    },
    alerts,
    calls: calls.slice(0, 800),
    blather: blatherDedup,
    cities: CITIES.map((c) => ({
      id: c.id, label: c.label, city: c.city, agency: c.agency,
      ok: !!sources[c.id]?.ok, n: sources[c.id]?.n || 0,
    })),
  };

  if (!alerts.length && !calls.length) {
    throw new Error('every dispatch source failed; refusing to publish an empty snapshot');
  }

  await mkdir(OUT, { recursive: true });
  await writeFile(path.join(OUT, 'dispatch.json'), JSON.stringify(snap));
  await writeFile(
    path.join(OUT, 'README.md'),
    `# dispatch-data\n\nGenerated by dispatch/collect.mjs on main. Force-pushed on every run; do not edit.\nLast run: ${snap.generated}\n`,
  );
  log(`wrote ${alerts.length} alerts, ${calls.length} calls, ${blatherDedup.length} blather in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
