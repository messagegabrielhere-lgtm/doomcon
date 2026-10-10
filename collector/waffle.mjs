// THE WAFFLE HOUSE INDEX, AI EDITION.
//
// FEMA's informal disaster gauge: if the Waffle House is open, things are
// fine; if it runs a limited menu, it's bad; if it closes, it's very bad.
// This collector watches every active Atlantic/Gulf storm from the National
// Hurricane Center, finds the Waffle Houses in its rough path, asks Google
// whether each one is open right now, and puts the AI data centres in the
// same path beside them: the restaurants that never close and the machines
// that never sleep, under the same storm.
//
// Sources, each failing dark:
//   NHC CurrentStorms.json             storms, position, intensity, motion
//   OpenStreetMap (Overpass)           Waffle House locations, refreshed weekly
//   Google Places API (New)            open-now / temporarily-closed, only with
//                                      GOOGLE_PLACES_API_KEY, capped per run
//   data/datacenters.json              SIREN's own map of US data centres
//
// HONESTY. The "impact zone" is NOT the NHC cone: it is a capsule from the
// storm's centre along its current motion for 24 hours, sized by intensity.
// Without the Google key nothing is called closed; stores are "in the path".
//
//   node collector/waffle.mjs [--offline]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fetchJson, fetchText } from './fetch.mjs';

const OUT = 'data/waffle.json';
const STORES = 'data/waffle-stores.json';
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
const say = (m) => { if (process.env.GITHUB_ACTIONS) console.log(`::notice title=waffle::${m}`); else console.log(m); };

/** Great-circle distance in km. */
export function km(a, b) {
  const R = 6371, d = Math.PI / 180;
  const dLat = (b.lat - a.lat) * d, dLon = (b.lon - a.lon) * d;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * d) * Math.cos(b.lat * d) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Point `dist` km from `p` on bearing `deg`. */
export function move(p, deg, dist) {
  const R = 6371, d = Math.PI / 180, br = deg * d, la = p.lat * d, lo = p.lon * d, dr = dist / R;
  const la2 = Math.asin(Math.sin(la) * Math.cos(dr) + Math.cos(la) * Math.sin(dr) * Math.cos(br));
  const lo2 = lo + Math.atan2(Math.sin(br) * Math.sin(dr) * Math.cos(la), Math.cos(dr) - Math.sin(la) * Math.sin(la2));
  return { lat: la2 / d, lon: ((lo2 / d + 540) % 360) - 180 };
}

/** Rough radius of damaging wind around the centre, by intensity (kt). */
export function radiusKm(windKt) {
  const w = Number(windKt) || 0;
  return w >= 96 ? 300 : w >= 64 ? 240 : w >= 34 ? 170 : 110;
}

/** Shortest distance (km) from point to the segment a→b, sampled finely. */
export function distToPath(p, a, b) {
  let best = Infinity;
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    best = Math.min(best, km(p, { lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t }));
  }
  return best;
}

export function category(windKt, cls) {
  const w = Number(windKt) || 0;
  if (w >= 137) return 'Category 5 hurricane';
  if (w >= 113) return 'Category 4 hurricane';
  if (w >= 96) return 'Category 3 hurricane';
  if (w >= 83) return 'Category 2 hurricane';
  if (w >= 64) return 'Category 1 hurricane';
  if (w >= 34) return 'Tropical storm';
  return /PTC|potential/i.test(cls || '') ? 'Potential tropical cyclone' : 'Tropical depression';
}

/** NHC CurrentStorms -> storms with a 24 h drift capsule. */
export function parseStorms(j) {
  const out = [];
  for (const s of (j && j.activeStorms) || []) {
    const lat = +s.latitudeNumeric;
    let lon = +s.longitudeNumeric;
    if (!Number.isFinite(lon) && typeof s.longitude === 'string') { const m = /([\d.]+)([EW])/i.exec(s.longitude); if (m) lon = m[2].toUpperCase() === 'W' ? -(+m[1]) : +m[1]; }
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const wind = +s.intensity;
    const dir = +s.movementDir, mph = +s.movementSpeed;
    const now = { lat, lon };
    const later = Number.isFinite(dir) && Number.isFinite(mph) && mph > 0 ? move(now, dir, mph * 1.609 * 24) : now;
    out.push({
      id: s.id, name: s.name || s.id, cls: s.classification || '', wind_kt: Number.isFinite(wind) ? wind : null,
      category: category(wind, s.classification), pressure_mb: Number.isFinite(+s.pressure) ? +s.pressure : null,
      at: s.lastUpdate || null, now, later, radius_km: radiusKm(wind),
      motion: Number.isFinite(dir) && Number.isFinite(mph) ? { deg: dir, mph } : null,
      url: (s.publicAdvisory && s.publicAdvisory.url) || 'https://www.nhc.noaa.gov/',
    });
  }
  return out;
}

/** Overpass JSON -> [{id, lat, lon, city, state}] */
export function parseStores(j) {
  return ((j && j.elements) || []).map((e) => {
    const lat = e.lat ?? (e.center && e.center.lat), lon = e.lon ?? (e.center && e.center.lon);
    const t = e.tags || {};
    return Number.isFinite(lat) && Number.isFinite(lon) ? { id: `${e.type}/${e.id}`, lat: +lat.toFixed(5), lon: +lon.toFixed(5), city: t['addr:city'] || null, state: t['addr:state'] || null } : null;
  }).filter(Boolean);
}

async function stores(offline) {
  let cache = null;
  try { cache = JSON.parse(readFileSync(STORES, 'utf8')); } catch { /* first run */ }
  const fresh = cache && Date.now() - Date.parse(cache.fetched_at) < 7 * 864e5 && cache.stores && cache.stores.length > 100;
  if (fresh || offline) return cache;
  const q = '[out:json][timeout:90];nwr["brand:wikidata"="Q1701206"](23,-106,42,-72);out center tags;';
  for (const ep of OVERPASS) {
    try {
      const body = await fetchText(ep, { method: 'POST', body: `data=${encodeURIComponent(q)}`, headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' }, timeoutMs: 120000, retries: 0 });
      const list = parseStores(JSON.parse(body));
      if (list.length > 100) { cache = { fetched_at: new Date().toISOString(), source: ep, stores: list }; writeFileSync(STORES, JSON.stringify(cache) + '\n'); say(`stores ${list.length} from ${ep}`); return cache; }
    } catch (e) { say(`overpass ${ep}: ${String(e.message).slice(0, 120)}`); }
  }
  return cache;
}

/** Pick query centres so every in-path store is within `r` km of one (greedy). */
export function coverCentres(points, r = 45, max = 25) {
  const left = points.slice(), centres = [];
  while (left.length && centres.length < max) {
    const c = left[0];
    centres.push(c);
    for (let i = left.length - 1; i >= 0; i--) if (km(c, left[i]) <= r) left.splice(i, 1);
  }
  return centres;
}

/** Google Places (New) searchText -> [{id, name, lat, lon, status, open_now, address}] */
export function parsePlaces(j) {
  return ((j && j.places) || []).filter((p) => /waffle house/i.test((p.displayName && p.displayName.text) || '')).map((p) => ({
    id: p.id, name: p.displayName.text, lat: p.location && p.location.latitude, lon: p.location && p.location.longitude,
    status: p.businessStatus || null, open_now: p.currentOpeningHours ? !!p.currentOpeningHours.openNow : null, address: p.formattedAddress || null,
  }));
}

/** A Waffle House is open 24/7, so "not open now" or temporarily closed both read as closed. */
export function closedOf(p) {
  if (p.status === 'CLOSED_TEMPORARILY' || p.status === 'CLOSED_PERMANENTLY') return true;
  if (p.status === 'OPERATIONAL' && p.open_now === false) return true;
  if (p.status === 'OPERATIONAL' && p.open_now === true) return false;
  return null;
}

export function indexFrom(closed, known) {
  if (!known) return { level: 'UNKNOWN', label: 'No live status', color: '#94A3B8' };
  const pct = closed / known;
  if (pct >= 0.35) return { level: 'RED', label: 'Very bad: Waffle Houses are closed', color: '#F87171', pct };
  if (pct >= 0.05) return { level: 'YELLOW', label: 'Bad: some closed, expect limited menus', color: '#FACC15', pct };
  return { level: 'GREEN', label: 'Open for business', color: '#4ADE80', pct };
}

async function google(centres, key) {
  const out = [], seen = new Set();
  for (const c of centres) {
    try {
      const body = await fetchText('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST', timeoutMs: 20000, retries: 0,
        headers: { 'content-type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.businessStatus,places.currentOpeningHours.openNow,places.formattedAddress' },
        body: JSON.stringify({ textQuery: 'Waffle House', locationBias: { circle: { center: { latitude: c.lat, longitude: c.lon }, radius: 50000 } }, maxResultCount: 20 }),
      });
      for (const p of parsePlaces(JSON.parse(body))) if (!seen.has(p.id)) { seen.add(p.id); out.push(p); }
    } catch (e) { say(`google: ${String(e.message).slice(0, 140)}`); }
  }
  return out;
}

async function main(argv) {
  const offline = argv.includes('--offline');
  const now = Date.now();
  let storms = [], stormErr = null;
  if (!offline) {
    try { storms = parseStorms(await fetchJson('https://www.nhc.noaa.gov/CurrentStorms.json', { timeoutMs: 30000, retries: 1 })); }
    catch (e) { stormErr = String(e.message).slice(0, 160); }
  }
  const sc = await stores(offline);
  const all = (sc && sc.stores) || [];
  let dcs = [];
  try { dcs = (JSON.parse(readFileSync('data/datacenters.json', 'utf8')).sites || []).filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lon)); } catch { /* optional */ }

  const key = process.env.GOOGLE_PLACES_API_KEY || '';
  const maxCalls = Math.max(0, Math.min(60, Number(process.env.GOOGLE_WAFFLE_MAX_CALLS) || 10));
  let calls = 0;
  const outStorms = [];
  for (const s of storms) {
    const inPath = all.map((w) => ({ ...w, d: distToPath(w, s.now, s.later) })).filter((w) => w.d <= s.radius_km).sort((a, b) => a.d - b.d);
    const dcIn = dcs.map((x) => ({ name: x.name || 'Data centre', operator: x.operator || null, city: x.addr && x.addr.city, state: x.state || (x.addr && x.addr.state), status: x.status || null, lat: x.lat, lon: x.lon, d: distToPath(x, s.now, s.later) })).filter((x) => x.d <= s.radius_km).sort((a, b) => a.d - b.d);
    let places = [], googled = false;
    if (key && inPath.length && calls < maxCalls) {
      const centres = coverCentres(inPath, 45, maxCalls - calls);
      calls += centres.length;
      places = await google(centres, key);
      googled = true;
    }
    const withStatus = places.map((p) => ({ ...p, closed: closedOf(p), d: distToPath(p, s.now, s.later) })).filter((p) => p.d <= s.radius_km + 30);
    const known = withStatus.filter((p) => p.closed !== null);
    const closed = known.filter((p) => p.closed);
    outStorms.push({
      ...s,
      waffle_in_path: inPath.length,
      stores: inPath.slice(0, 400).map(({ lat, lon, city, state, d }) => ({ lat, lon, city, state, d: Math.round(d) })),
      google: googled ? { checked: withStatus.length, known: known.length, closed: closed.length, places: withStatus.slice(0, 200).map((p) => ({ name: p.name, lat: p.lat, lon: p.lon, closed: p.closed, status: p.status, address: p.address })) } : null,
      index: indexFrom(closed.length, known.length),
      datacenters_in_path: dcIn.length,
      datacenters: dcIn.slice(0, 60).map(({ name, operator, city, state, status, lat, lon, d }) => ({ name, operator, city, state, status, lat, lon, d: Math.round(d) })),
    });
  }
  // US-relevant storms first: the ones with Waffle Houses in the path.
  outStorms.sort((a, b) => b.waffle_in_path - a.waffle_in_path || (b.wind_kt || 0) - (a.wind_kt || 0));
  const doc = {
    schema: 1, generated_at: new Date(now).toISOString(),
    storms: outStorms, storm_error: stormErr,
    stores_total: all.length, stores_fetched_at: sc && sc.fetched_at,
    google: { enabled: !!key, calls, cap: maxCalls },
    note: 'Impact zone: a capsule along the storm’s current motion for 24 h, radius by intensity. Not the NHC cone. Waffle House locations from OpenStreetMap; open/closed from Google Places when enabled.',
  };
  writeFileSync(OUT, JSON.stringify(doc, null, 1) + '\n');
  say(`storms ${outStorms.length}${stormErr ? ' (NHC: ' + stormErr + ')' : ''} · stores ${all.length} · google ${key ? `${calls} calls` : 'off'} · ${outStorms.map((s) => `${s.name}: ${s.waffle_in_path} WH, ${s.datacenters_in_path} DC, ${s.index.level}`).join('; ')}`);
}

if (process.argv[1] && process.argv[1].endsWith('waffle.mjs')) main(process.argv.slice(2)).catch((e) => { console.log(`::warning title=waffle::${String(e.message).slice(0, 200)}`); });
