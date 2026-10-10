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
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter'];
// All The Places publishes a weekly scrape of every chain's own store locator.
const ATP = ['https://data.alltheplaces.xyz/runs/latest/output/waffle_house.geojson', 'https://alltheplaces-data.openaddresses.io/runs/latest/output/waffle_house.geojson'];
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
  for (const u of ATP) {
    try {
      const list = parseGeojson(JSON.parse(await fetchText(u, { timeoutMs: 60000, retries: 1 })));
      if (list.length > 100) { cache = { fetched_at: new Date().toISOString(), source: u, stores: list }; writeFileSync(STORES, JSON.stringify(cache) + '\n'); say(`stores ${list.length} from ${u}`); return cache; }
    } catch (e) { say(`alltheplaces ${u}: ${String(e.message).slice(0, 120)}`); }
  }
  return cache;
}

/** All The Places GeoJSON -> stores. */
export function parseGeojson(j) {
  return ((j && j.features) || []).map((f, i) => {
    const c = f.geometry && f.geometry.coordinates, p = f.properties || {};
    return Array.isArray(c) && Number.isFinite(+c[0]) && Number.isFinite(+c[1]) ? { id: p.ref ? `wh/${p.ref}` : `atp/${i}`, lat: +(+c[1]).toFixed(5), lon: +(+c[0]).toFixed(5), city: p['addr:city'] || p.city || null, state: p['addr:state'] || p.state || null } : null;
  }).filter(Boolean);
}

// THE OFFICIAL SOURCE. Waffle House's own store locator (a SOCi/Where2GetIt
// locator) carries an opening_status per store, and its public search can
// filter on it: one call lists every store, one lists the temporarily
// closed. The app key is the public one embedded in the locator page, read
// fresh each run rather than hard-coded. Two polite calls an hour.
const LOCATOR = 'https://locations.wafflehouse.com';
export function appKeyFrom(html) {
  const m = /appkey\s*:\s*['"]([A-F0-9-]{20,})['"]/i.exec(String(html || ''));
  return m ? m[1] : null;
}
/** Locator POI -> store. bho = weekly hours; all "0000-0000" means 24 h. */
export function parseLocator(j) {
  return (((j && j.response) || {}).collection || []).map((x) => {
    const lat = +x.latitude, lon = +x.longitude;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    let hours24 = null;
    try { const b = JSON.parse(x.bho || '[]'); hours24 = b.length ? b.every((d) => d[0] === '0000' && d[1] === '0000') : null; } catch { /* odd hours field */ }
    return { id: `wh/${x.clientkey}`, no: String(x.clientkey || ''), lat: +lat.toFixed(5), lon: +lon.toFixed(5), city: x.city ? String(x.city).replace(/\b\w+/g, (w) => w.charAt(0) + w.slice(1).toLowerCase()) : null, state: x.state || null, url: x.website || null, hours24, coming_soon: !!x['Coming Soon'] };
  }).filter(Boolean);
}
async function locatorSearch(appkey, where) {
  const body = { request: { appkey, formdata: { geoip: false, dataview: 'store_default', limit: 5000, geolocs: { geoloc: [{ addressline: '', country: 'US', latitude: 33.5, longitude: -86.8 }] }, searchradius: '3000', ...(where ? { where } : {}) } } };
  const t = await fetchText(`${LOCATOR}/rest/locatorsearch?like=${Math.random()}&isSOCiLocator=true`, { method: 'POST', timeoutMs: 45000, retries: 1, headers: { 'content-type': 'application/json', accept: 'application/json', referer: `${LOCATOR}/`, origin: LOCATOR }, body: JSON.stringify(body) });
  const j = JSON.parse(t);
  if (j.code !== 1) throw new Error(`locator code ${j.code}: ${(j.response && j.response.message) || ''}`);
  return parseLocator(j);
}
export async function officialStatus() {
  const html = await fetchText(`${LOCATOR}/`, { timeoutMs: 30000, retries: 1 });
  const key = appKeyFrom(html);
  if (!key) throw new Error('locator app key not found');
  const all = await locatorSearch(key);
  const closed = await locatorSearch(key, { opening_status: { eq: 'temporarily_closed' } });
  const closedSet = new Set(closed.map((x) => x.id));
  return all.filter((x) => !x.coming_soon).map((x) => ({ ...x, closed: closedSet.has(x.id) }));
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

export function indexFrom(closed, known, limited = 0) {
  if (!known) return { level: 'UNKNOWN', label: 'No live status', color: '#94A3B8' };
  const pct = closed / known;
  if (pct >= 0.35) return { level: 'RED', label: 'Very bad: Waffle Houses are closed', color: '#F87171', pct };
  if (pct >= 0.05) return { level: 'YELLOW', label: 'Bad: some closed, expect limited menus', color: '#FACC15', pct };
  if (limited / known >= 0.1) return { level: 'YELLOW', label: 'Bad: many on limited hours', color: '#FACC15', pct };
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
  let official = null, officialErr = null;
  if (!offline) { try { official = await officialStatus(); } catch (e) { officialErr = String(e.message).slice(0, 160); } }
  const sc = official && official.length > 500 ? { fetched_at: new Date(now).toISOString(), source: 'locations.wafflehouse.com', stores: official } : await stores(offline);
  const all = (sc && sc.stores) || [];
  const live = !!(official && official.length > 500);
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
    if (key && !live && inPath.length && calls < maxCalls) {
      const centres = coverCentres(inPath, 45, maxCalls - calls);
      calls += centres.length;
      places = await google(centres, key);
      googled = true;
    }
    const withStatus = live
      ? inPath.map((w) => ({ name: `Waffle House #${w.no}`, lat: w.lat, lon: w.lon, closed: w.closed, status: w.closed ? 'temporarily closed' : (w.hours24 === false ? 'limited hours' : 'open'), limited: w.hours24 === false && !w.closed, address: [w.city, w.state].filter(Boolean).join(', '), url: w.url, d: w.d }))
      : places.map((p) => ({ ...p, closed: closedOf(p), d: distToPath(p, s.now, s.later) })).filter((p) => p.d <= s.radius_km + 30);
    const known = withStatus.filter((p) => p.closed !== null);
    const closed = known.filter((p) => p.closed);
    outStorms.push({
      ...s,
      waffle_in_path: inPath.length,
      stores: inPath.slice(0, 400).map(({ lat, lon, city, state, d }) => ({ lat, lon, city, state, d: Math.round(d) })),
      google: (googled || live) ? { source: live ? 'Waffle House locator' : 'Google Places', checked: withStatus.length, known: known.length, closed: closed.length, limited: withStatus.filter((p) => p.limited).length, places: withStatus.slice(0, 700).map((p) => ({ name: p.name, lat: p.lat, lon: p.lon, closed: p.closed, limited: !!p.limited, status: p.status, address: p.address, url: p.url || null })) } : null,
      index: indexFrom(closed.length, known.length, withStatus.filter((p) => p.limited).length),
      datacenters_in_path: dcIn.length,
      datacenters: dcIn.slice(0, 60).map(({ name, operator, city, state, status, lat, lon, d }) => ({ name, operator, city, state, status, lat, lon, d: Math.round(d) })),
    });
  }
  // US-relevant storms first: the ones with Waffle Houses in the path.
  outStorms.sort((a, b) => b.waffle_in_path - a.waffle_in_path || (b.wind_kt || 0) - (a.wind_kt || 0));
  const doc = {
    schema: 1, generated_at: new Date(now).toISOString(),
    storms: outStorms, storm_error: stormErr,
    stores_total: all.length, stores_fetched_at: sc && sc.fetched_at, stores_source: sc && sc.source,
    official: live ? {
      closed: all.filter((w) => w.closed).length,
      limited: all.filter((w) => w.hours24 === false && !w.closed).length,
      by_state: Object.entries(all.reduce((m, w) => { if (w.closed) m[w.state] = (m[w.state] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]).map(([state, n]) => ({ state, n })),
      closed_list: all.filter((w) => w.closed).slice(0, 300).map(({ no, city, state, lat, lon, url }) => ({ no, city, state, lat, lon, url })),
    } : { error: officialErr },
    // Every store as [lon, lat, flag] for the national map: 0 open, 1 closed, 2 limited hours.
    all_stores: all.map((w) => [+(+w.lon).toFixed(3), +(+w.lat).toFixed(3), w.closed ? 1 : (w.hours24 === false ? 2 : 0)]),
    google: { enabled: !!key, calls, cap: maxCalls },
    note: live ? 'Locations and open/closed from Waffle House’s own store locator (opening_status = temporarily_closed); short hours = posted hours not 24/7. Impact zone: a capsule along the storm’s current motion for 24 h, radius by intensity. Not the NHC cone.' : 'Waffle House’s locator was unreachable this run: locations from OpenStreetMap, open/closed from Google Places when enabled. Impact zone: a capsule along the storm’s current motion for 24 h, radius by intensity. Not the NHC cone.',
  };
  writeFileSync(OUT, JSON.stringify(doc, null, 1) + '\n');
  say(`official ${live ? 'ok' : 'dark: ' + officialErr} · storms ${outStorms.length}${stormErr ? ' (NHC: ' + stormErr + ')' : ''} · stores ${all.length} · google ${key ? `${calls} calls` : 'off'} · ${outStorms.map((s) => `${s.name}: ${s.waffle_in_path} WH, ${s.datacenters_in_path} DC, ${s.index.level}`).join('; ')}`);
}

if (process.argv[1] && process.argv[1].endsWith('waffle.mjs')) main(process.argv.slice(2)).catch((e) => { console.log(`::warning title=waffle::${String(e.message).slice(0, 200)}`); });
