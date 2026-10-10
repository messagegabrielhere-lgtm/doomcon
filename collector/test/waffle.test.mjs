import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseStorms, parseStores, parsePlaces, parseSitemap, parseLocatorPage,
  locatorClosed, liveFromLocator, nearestLocator,
  closedOf, indexFrom, distToPath, coverCentres, km, category,
} from '../waffle.mjs';

test('parseStorms reads NHC CurrentStorms and builds a 24 h drift', () => {
  const s = parseStorms({ activeStorms: [{ id: 'al092026', name: 'Isaias', classification: 'HU', intensity: '105', pressure: '960', latitudeNumeric: 28.4, longitudeNumeric: -87.2, movementDir: 20, movementSpeed: 7, lastUpdate: '2026-10-09T21:00:00Z' }] });
  assert.equal(s.length, 1);
  assert.equal(s[0].category, 'Category 3 hurricane');
  assert.equal(s[0].radius_km, 300);
  assert.ok(s[0].later.lat > s[0].now.lat, 'moves north-north-east');
  assert.ok(km(s[0].now, s[0].later) > 250 && km(s[0].now, s[0].later) < 300, '7 mph for 24 h is about 270 km');
});

test('parseStores reads Overpass nodes and ways', () => {
  const st = parseStores({ elements: [{ type: 'node', id: 1, lat: 30.4, lon: -87.2, tags: { 'addr:city': 'Pensacola', 'addr:state': 'FL' } }, { type: 'way', id: 2, center: { lat: 30.7, lon: -88.0 }, tags: {} }, { type: 'node', id: 3 }] });
  assert.equal(st.length, 2);
  assert.equal(st[0].city, 'Pensacola');
});

test('Google status: a 24/7 restaurant that is not open now counts as closed', () => {
  const p = parsePlaces({ places: [
    { id: 'a', displayName: { text: 'Waffle House' }, location: { latitude: 30, longitude: -87 }, businessStatus: 'OPERATIONAL', currentOpeningHours: { openNow: false } },
    { id: 'b', displayName: { text: 'Waffle House' }, location: { latitude: 30, longitude: -87 }, businessStatus: 'CLOSED_TEMPORARILY' },
    { id: 'c', displayName: { text: 'Waffle House' }, location: { latitude: 30, longitude: -87 }, businessStatus: 'OPERATIONAL', currentOpeningHours: { openNow: true } },
    { id: 'd', displayName: { text: 'IHOP' }, location: { latitude: 30, longitude: -87 }, businessStatus: 'OPERATIONAL' },
  ] });
  assert.equal(p.length, 3);
  assert.deepEqual(p.map(closedOf), [true, true, false]);
});

test('index levels and geometry helpers', () => {
  assert.equal(indexFrom(0, 0).level, 'UNKNOWN');
  assert.equal(indexFrom(0, 20).level, 'GREEN');
  assert.equal(indexFrom(3, 20).level, 'YELLOW');
  assert.equal(indexFrom(10, 20).level, 'RED');
  const a = { lat: 28, lon: -87 }, b = { lat: 30, lon: -86 };
  assert.ok(distToPath({ lat: 29, lon: -86.5 }, a, b) < 5);
  const pts = [{ lat: 30, lon: -87 }, { lat: 30.1, lon: -87 }, { lat: 32, lon: -84 }];
  assert.equal(coverCentres(pts, 45).length, 2);
  assert.equal(category(40), 'Tropical storm');
});

test('parseGeojson reads All The Places output', async () => {
  const { parseGeojson } = await import('../waffle.mjs');
  const s = parseGeojson({ features: [{ geometry: { coordinates: [-87.2, 30.4] }, properties: { ref: '1234', 'addr:city': 'Pensacola', 'addr:state': 'FL' } }, { geometry: null }] });
  assert.deepEqual(s, [{ id: 'wh/1234', lat: 30.4, lon: -87.2, city: 'Pensacola', state: 'FL' }]);
});

test('parseSitemap keeps only store-detail URLs', () => {
  const rows = parseSitemap(`<?xml version="1.0"?><urlset>
    <loc>https://locations.wafflehouse.com/fl/</loc>
    <loc>https://locations.wafflehouse.com/pensacola-fl-1046/</loc>
    <loc>https://locations.wafflehouse.com/greenville-sc-1667/</loc>
  </urlset>`);
  assert.deepEqual(rows.map((r) => r.store_id), ['1046', '1667']);
});

test('parseLocatorPage reads only the URL store’s opening_status', () => {
  const html = `
    <script type="application/ld+json">{"@type":"Restaurant","name":"Waffle House #1046","geo":{"latitude":30.50229,"longitude":-87.22219},"address":{"streetAddress":"7329 N. DAVIS HWY.","addressLocality":"PENSACOLA","addressRegion":"FL"}}</script>
    var nearby = { clientkey : '9999', opening_status: 'open' };
    var here = { clientkey : '1046', coming_soon:'', opening_status: 'temporarily_closed', uid : 1 };
  `;
  const row = parseLocatorPage(html, 'https://locations.wafflehouse.com/pensacola-fl-1046/');
  assert.equal(row.store_id, '1046');
  assert.equal(row.status, 'temporarily_closed');
  assert.equal(row.closed, true);
  assert.equal(row.lat, 30.50229);
  assert.equal(row.city, 'PENSACOLA');
  assert.equal(locatorClosed('open'), false);
  assert.equal(locatorClosed('permanently_closed'), true);
});

test('liveFromLocator matches OSM pins to nearest official store', () => {
  const locator = [
    { id: 'wh/1', name: 'Waffle House #1', lat: 30.5, lon: -87.2, city: 'Pensacola', state: 'FL', address: '1 Main', url: 'https://locations.wafflehouse.com/x-fl-1/', status: 'temporarily_closed', closed: true },
    { id: 'wh/2', name: 'Waffle House #2', lat: 33.6, lon: -85.8, city: 'Centre', state: 'AL', address: '2 Main', url: 'https://locations.wafflehouse.com/x-al-2/', status: 'open', closed: false },
  ];
  const inPath = [
    { lat: 30.501, lon: -87.201, city: null, state: null, d: 3 },
    { lat: 33.601, lon: -85.801, city: null, state: null, d: 12 },
  ];
  const live = liveFromLocator(inPath, locator);
  assert.equal(live.source, 'locator');
  assert.equal(live.known, 2);
  assert.equal(live.closed, 1);
  assert.equal(nearestLocator({ lat: 30.5, lon: -87.2 }, locator).id, 'wh/1');
  // 1 of 2 closed is RED (≥35%); yellow is the 5–35% band.
  assert.equal(indexFrom(live.closed, live.known).level, 'RED');
  assert.equal(indexFrom(2, 40).level, 'YELLOW');
});
