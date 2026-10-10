import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStorms, parseStores, parsePlaces, closedOf, indexFrom, distToPath, coverCentres, km, category, appKeyFrom, parseLocator } from '../waffle.mjs';

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

test('appKeyFrom reads the public locator key from the page config', () => {
  assert.equal(appKeyFrom(`<script>var W2GI={config:{appkey:'67D5833A-80B5-4F9E-9C2B-9E7BAA634C27',x:1}}</script>`), '67D5833A-80B5-4F9E-9C2B-9E7BAA634C27');
  assert.equal(appKeyFrom('<html>no key</html>'), null);
});

test('parseLocator maps stores, 24 h hours and coming-soon flags', () => {
  const allDay = JSON.stringify(Array(7).fill(['0000', '0000']));
  const short = JSON.stringify(Array(7).fill(['0700', '1400']));
  const s = parseLocator({ code: 1, response: { collection: [
    { clientkey: '2591', latitude: '30.42', longitude: '-86.61', city: 'FORT WALTON BEACH', state: 'FL', website: 'https://locations.wafflehouse.com/x', bho: short },
    { clientkey: '100', latitude: '33.7', longitude: '-84.4', city: 'ATLANTA', state: 'GA', bho: allDay },
    { clientkey: 'bad', latitude: 'x', longitude: '1' },
  ] } });
  assert.equal(s.length, 2);
  assert.equal(s[0].city, 'Fort Walton Beach');
  assert.equal(s[0].hours24, false);
  assert.equal(s[1].hours24, true);
  assert.equal(s[1].id, 'wh/100');
});

test('indexFrom turns yellow when many stores are on short hours', () => {
  assert.equal(indexFrom(0, 100, 15).level, 'YELLOW');
  assert.equal(indexFrom(0, 100, 2).level, 'GREEN');
  assert.equal(indexFrom(40, 100, 0).level, 'RED');
});
