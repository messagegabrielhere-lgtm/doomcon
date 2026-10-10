// THE WAFFLE HOUSE INDEX, AI EDITION.
//
// FEMA's informal disaster gauge: if the Waffle House is open, things are
// fine; if it runs a limited menu, it's bad; if it closes, it's very bad.
// This collector watches every active Atlantic/Gulf storm from the National
// Hurricane Center, finds the Waffle Houses in its rough path, reads each
// restaurant's posted open/closed flag from the official store locator, and
// puts the AI data centres in the same path beside them: the restaurants that
// never close and the machines that never sleep, under the same storm.
//
// Sources, each failing dark:
//   NHC CurrentStorms.json             storms, position, intensity, motion
//   OpenStreetMap (Overpass)           Waffle House locations, refreshed weekly
//   locations.wafflehouse.com          LIVE open / temporarily_closed /
//                                      permanently_closed from each store page
//                                      (sitemap → HTML). No API key. Primary.
//   Google Places API (New)            optional overlay when
//                                      GOOGLE_PLACES_API_KEY is set
//   data/datacenters.json              SIREN's own map of US data centres
//
// HONESTY. The "impact zone" is NOT the NHC cone: it is a capsule from the
// storm's centre along its current motion for 24 hours, sized by intensity.
// Opening status is the locator's posted flag, not a phone call to the grill.
// A temporary closure is not proof of storm damage. Limited-menu (FEMA yellow)
// is not published as its own flag, so yellow here means "some are closed".
//
//   node collector/waffle.mjs [--offline]
import { readFileSync, writeFileSync } from 'node:fs';
import { fetchJson, fetchText, fetchAll } from './fetch.mjs';

const OUT = 'data/waffle.json';
const STORES = 'data/waffle-stores.json';
const LOCATOR = 'data/waffle-locator.json';
const SITEMAP = 'https://locations.wafflehouse.com/sitemap.xml';
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter'];
// All The Places publishes a weekly scrape of every chain's own store locator.
const ATP = ['https://data.alltheplaces.xyz/runs/latest/output/waffle_house.geojson', 'https://alltheplaces-data.openaddresses.io/runs/latest/output/waffle_house.geojson'];
const say = (m) => { if (process.env.GITHUB_ACTIONS) console.log(`::notice title=waffle::${m}`); else console.log(m); };
// Locator pages embed nearby stores too; match the URL's store number so a
// Pensacola page does not report four statuses for one restaurant.
const STORE_URL_RE = /^https:\/\/locations\.wafflehouse\.com\/[a-z0-9-]+-(\d+)\/?$/i;
const LOCATOR_FRESH_MS = 50 * 60 * 1000; // reuse within the hour between lanes
const LOCATOR_CONCURRENCY = 14;
const MATCH_KM = 0.55; // OSM pin to locator pin

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

/** Store-detail URLs from the official locator sitemap. */
export function parseSitemap(xml) {
  const out = [];
  for (const m of String(xml || '').matchAll(/<loc>\s*(https:\/\/locations\.wafflehouse\.com\/[^<\s]+)\s*<\/loc>/gi)) {
    const url = m[1].replace(/\/?$/, '/');
    const idm = STORE_URL_RE.exec(url);
    if (idm) out.push({ url, store_id: idm[1] });
  }
  return out;
}

/**
 * One store page HTML → status row for the store_id in the URL.
 * Nearby restaurants appear on the same page; only the matching clientkey counts.
 */
export function parseLocatorPage(html, url) {
  const idm = STORE_URL_RE.exec(String(url || '').replace(/\/?$/, '/'));
  if (!idm) return null;
  const store_id = idm[1];
  const text = String(html || '');
  // Prefer the JS location blob keyed to this store number.
  const re = new RegExp(
    String.raw`clientkey\s*:\s*'${store_id}'[\s\S]{0,400}?opening_status:\s*'([^']*)'`,
    'i',
  );
  let status = null;
  const jm = re.exec(text);
  if (jm) status = jm[1].toLowerCase();
  if (!status) {
    // Fallback: Restaurant LD+JSON on this page is for this store.
    const closedSpecial = /"specialOpeningHoursSpecification"\s*:\s*\[\s*\{\s*"@type"\s*:\s*"OpeningHoursSpecification"\s*,\s*"opens"\s*:\s*"00:00"\s*,\s*"closes"\s*:\s*"00:00"/.test(text);
    const openFlag = /opening_status:\s*'open'/i.test(text);
    if (closedSpecial) status = 'temporarily_closed';
    else if (openFlag) status = 'open';
  }
  if (!status) return null;

  const latM = text.match(/"latitude"\s*:\s*(-?[0-9.]+)/);
  const lonM = text.match(/"longitude"\s*:\s*(-?[0-9.]+)/);
  const nameM = text.match(/"name"\s*:\s*"(Waffle House[^"]*)"/);
  const streetM = text.match(/"streetAddress"\s*:\s*"([^"]+)"/);
  const cityM = text.match(/"addressLocality"\s*:\s*"([^"]+)"/);
  const regionM = text.match(/"addressRegion"\s*:\s*"([^"]+)"/);
  const lat = latM ? +(+latM[1]).toFixed(5) : null;
  const lon = lonM ? +(+lonM[1]).toFixed(5) : null;
  const city = cityM ? cityM[1] : null;
  const state = regionM ? regionM[1] : null;
  const street = streetM ? streetM[1] : null;
  const name = nameM ? nameM[1] : `Waffle House #${store_id}`;
  const address = [street, city, state].filter(Boolean).join(', ') || null;
  return {
    id: `wh/${store_id}`,
    store_id,
    url: String(url).replace(/\/?$/, '/'),
    name,
    lat,
    lon,
    city,
    state,
    address,
    status,
    closed: locatorClosed(status),
  };
}

/** Locator opening_status → closed boolean (null if unknown). */
export function locatorClosed(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'temporarily_closed' || s === 'permanently_closed') return true;
  if (s === 'open') return false;
  return null;
}

/** Nearest locator row within MATCH_KM, or null. */
export function nearestLocator(point, locatorStores) {
  let best = null, bestD = MATCH_KM;
  for (const loc of locatorStores) {
    if (!Number.isFinite(loc.lat) || !Number.isFinite(loc.lon)) continue;
    const d = km(point, { lat: loc.lat, lon: loc.lon });
    if (d <= bestD) { bestD = d; best = loc; }
  }
  return best;
}

/**
 * Attach live locator status to in-path OSM pins by nearest neighbour.
 * Returns { places, checked, known, closed } ready for the index and the feed.
 */
export function liveFromLocator(inPath, locatorStores) {
  const places = [];
  for (const w of inPath) {
    const loc = nearestLocator(w, locatorStores);
    if (!loc) continue;
    places.push({
      id: loc.id,
      name: loc.name,
      lat: loc.lat,
      lon: loc.lon,
      city: loc.city || w.city,
      state: loc.state || w.state,
      address: loc.address,
      url: loc.url,
      status: loc.status,
      closed: loc.closed,
      d: Math.round(w.d),
      match_km: +km(w, loc).toFixed(3),
    });
  }
  // One row per locator store (an OSM cluster can hit the same restaurant).
  const seen = new Set();
  const uniq = [];
  for (const p of places) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    uniq.push(p);
  }
  const known = uniq.filter((p) => p.closed !== null);
  const closed = known.filter((p) => p.closed);
  return { source: 'locator', checked: uniq.length, known: known.length, closed: closed.length, places: uniq };
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
  if (p.status === 'CLOSED_TEMPORARILY' || p.status === 'CLOSED_PERMANENTLY' || p.status === 'temporarily_closed' || p.status === 'permanently_closed') return true;
  if (p.status === 'open') return false;
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

/** Fetch or reuse the locator catalog. Writes data/waffle-locator.json. */
async function locatorCatalog(offline) {
  let cache = null;
  try { cache = JSON.parse(readFileSync(LOCATOR, 'utf8')); } catch { /* first run */ }
  const fresh = cache && Date.now() - Date.parse(cache.fetched_at) < LOCATOR_FRESH_MS
    && Array.isArray(cache.stores) && cache.stores.length > 100;
  if (fresh || offline) return cache;

  let urls;
  try {
    const xml = await fetchText(SITEMAP, { timeoutMs: 30000, retries: 1, headers: { Referer: 'https://locations.wafflehouse.com/' } });
    urls = parseSitemap(xml);
  } catch (e) {
    say(`locator sitemap: ${String(e.message).slice(0, 140)}`);
    return cache;
  }
  if (!urls.length) return cache;

  const results = await fetchAll(
    urls.map(({ url }) => ({
      url,
      key: url,
      parse: 'text',
      timeoutMs: 20000,
      retries: 0,
      headers: { Referer: 'https://locations.wafflehouse.com/', accept: 'text/html' },
    })),
    { concurrency: LOCATOR_CONCURRENCY },
  );
  const stores = [];
  let fail = 0;
  for (const r of results) {
    if (!r.ok) { fail += 1; continue; }
    const row = parseLocatorPage(r.value, r.url);
    if (row && Number.isFinite(row.lat) && Number.isFinite(row.lon) && row.closed !== null) stores.push(row);
    else fail += 1;
  }
  if (stores.length < 100) {
    say(`locator scrape thin (${stores.length} ok, ${fail} fail); keeping previous catalog`);
    return cache;
  }
  const closed = stores.filter((s) => s.closed).length;
  cache = {
    fetched_at: new Date().toISOString(),
    source: SITEMAP,
    total_urls: urls.length,
    ok: stores.length,
    fail,
    closed,
    open: stores.length - closed,
    stores,
  };
  writeFileSync(LOCATOR, JSON.stringify(cache) + '\n');
  say(`locator ${stores.length} stores (${closed} closed, ${fail} fail)`);
  return cache;
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
  const loc = await locatorCatalog(offline);
  const locStores = (loc && loc.stores) || [];
  let dcs = [];
  try { dcs = (JSON.parse(readFileSync('data/datacenters.json', 'utf8')).sites || []).filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lon)); } catch { /* optional */ }

  const key = process.env.GOOGLE_PLACES_API_KEY || '';
  const maxCalls = Math.max(0, Math.min(60, Number(process.env.GOOGLE_WAFFLE_MAX_CALLS) || 10));
  let calls = 0;
  const outStorms = [];
  for (const s of storms) {
    const inPath = all.map((w) => ({ ...w, d: distToPath(w, s.now, s.later) })).filter((w) => w.d <= s.radius_km).sort((a, b) => a.d - b.d);
    const dcIn = dcs.map((x) => ({ name: x.name || 'Data centre', operator: x.operator || null, city: x.addr && x.addr.city, state: x.state || (x.addr && x.addr.state), status: x.status || null, lat: x.lat, lon: x.lon, d: distToPath(x, s.now, s.later) })).filter((x) => x.d <= s.radius_km).sort((a, b) => a.d - b.d);

    // Primary live feed: official locator opening_status, matched onto the path.
    const live = locStores.length
      ? liveFromLocator(inPath, locStores)
      : { source: 'locator', checked: 0, known: 0, closed: 0, places: [] };

    // Optional Google overlay — never replaces a live locator reading.
    let googleBlock = null;
    if (key && inPath.length && calls < maxCalls) {
      const centres = coverCentres(inPath, 45, maxCalls - calls);
      calls += centres.length;
      const places = await google(centres, key);
      const withStatus = places.map((p) => ({ ...p, closed: closedOf(p), d: distToPath(p, s.now, s.later) })).filter((p) => p.d <= s.radius_km + 30);
      const known = withStatus.filter((p) => p.closed !== null);
      const closed = known.filter((p) => p.closed);
      googleBlock = { checked: withStatus.length, known: known.length, closed: closed.length, places: withStatus.slice(0, 200).map((p) => ({ name: p.name, lat: p.lat, lon: p.lon, closed: p.closed, status: p.status, address: p.address })) };
    }

    const feed = live.known
      ? live
      : googleBlock && googleBlock.known
        ? { source: 'google', ...googleBlock }
        : live;
    const closedList = feed.places.filter((p) => p.closed).sort((a, b) => (a.d ?? 0) - (b.d ?? 0));

    outStorms.push({
      ...s,
      waffle_in_path: inPath.length,
      stores: inPath.slice(0, 400).map(({ lat, lon, city, state, d }) => ({ lat, lon, city, state, d: Math.round(d) })),
      live: {
        source: feed.source,
        checked: feed.checked,
        known: feed.known,
        closed: feed.closed,
        open: feed.known - feed.closed,
        places: feed.places.slice(0, 400).map((p) => ({
          id: p.id, name: p.name, lat: p.lat, lon: p.lon, city: p.city, state: p.state,
          address: p.address, url: p.url || null, status: p.status, closed: p.closed, d: p.d,
        })),
        closed_feed: closedList.slice(0, 200).map((p) => ({
          id: p.id, name: p.name, address: p.address, city: p.city, state: p.state,
          status: p.status, url: p.url || null, lat: p.lat, lon: p.lon, d: p.d,
        })),
      },
      // Keep the old google key for one release so anything reading it still works.
      google: googleBlock,
      index: indexFrom(feed.closed, feed.known),
      datacenters_in_path: dcIn.length,
      datacenters: dcIn.slice(0, 60).map(({ name, operator, city, state, status, lat, lon, d }) => ({ name, operator, city, state, status, lat, lon, d: Math.round(d) })),
    });
  }
  // US-relevant storms first: the ones with Waffle Houses in the path.
  outStorms.sort((a, b) => b.waffle_in_path - a.waffle_in_path || (b.wind_kt || 0) - (a.wind_kt || 0));
  const doc = {
    schema: 2, generated_at: new Date(now).toISOString(),
    storms: outStorms, storm_error: stormErr,
    stores_total: all.length, stores_fetched_at: sc && sc.fetched_at,
    locator: loc ? {
      enabled: true,
      fetched_at: loc.fetched_at,
      total: loc.ok ?? locStores.length,
      closed: loc.closed ?? locStores.filter((s) => s.closed).length,
      open: loc.open ?? locStores.filter((s) => s.closed === false).length,
      source: loc.source || SITEMAP,
    } : { enabled: false },
    google: { enabled: !!key, calls, cap: maxCalls },
    note: 'Impact zone: a capsule along the storm’s current motion for 24 h, radius by intensity. Not the NHC cone. Locations from OpenStreetMap; live open/closed from the official Waffle House locator (opening_status). Google Places is an optional overlay. Temporary closure ≠ confirmed storm damage.',
  };
  writeFileSync(OUT, JSON.stringify(doc, null, 1) + '\n');
  say(`storms ${outStorms.length}${stormErr ? ' (NHC: ' + stormErr + ')' : ''} · stores ${all.length} · locator ${locStores.length} · google ${key ? `${calls} calls` : 'off'} · ${outStorms.map((s) => `${s.name}: ${s.waffle_in_path} WH, ${s.datacenters_in_path} DC, ${s.index.level}${s.live && s.live.known ? ` (${s.live.closed}/${s.live.known} closed)` : ''}`).join('; ')}`);
}

if (process.argv[1] && process.argv[1].endsWith('waffle.mjs')) main(process.argv.slice(2)).catch((e) => { console.log(`::warning title=waffle::${String(e.message).slice(0, 200)}`); });
