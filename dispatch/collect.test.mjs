// node --test dispatch/collect.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { geomCentroid } from './geo.mjs';
import { evaluateEmergency, sanitizeAlertText, formatAlertPost, freshTriggers, phrasingIndex } from './emergency.mjs';
import { renderAlertCard, cardFacts, SYSTEM_LOOK } from './card.mjs';
import { CITIES } from './cities.mjs';

test('geomCentroid: Point', () => {
  const c = geomCentroid({ type: 'Point', coordinates: [-122.4194, 37.7749] });
  assert.deepEqual(c, { lon: -122.419, lat: 37.775 });
});

test('geomCentroid: Polygon averages vertices (including ring close)', () => {
  const c = geomCentroid({
    type: 'Polygon',
    // Closed ring: first point repeats, so mean lon is -0.2 and mean lat is 0.8.
    coordinates: [[[-1, 0], [1, 0], [1, 2], [-1, 2], [-1, 0]]],
  });
  assert.equal(c.lon, -0.2);
  assert.equal(c.lat, 0.8);
});

test('geomCentroid: null without geometry', () => {
  assert.equal(geomCentroid(null), null);
});

test('cities: at least 8 CAD adapters', () => {
  assert.ok(CITIES.length >= 8);
  for (const c of CITIES) {
    assert.ok(c.id && c.url && typeof c.map === 'function', c.id);
  }
});

test('sanitizeAlertText strips Warning / expected', () => {
  assert.match(sanitizeAlertText('Tornado Warning expected'), /Tornado alert listed/i);
  assert.doesNotMatch(sanitizeAlertText('Tornado Warning'), /\bWarning\b/);
});

test('evaluateEmergency: Extreme NWS activates', () => {
  const e = evaluateEmergency({
    alerts: [{
      id: 'nws:1', system: 'nws', event: 'Tornado Warning', severity: 'Extreme',
      headline: 'Tornado', t: Date.now(),
    }],
  });
  assert.equal(e.active, true);
  assert.equal(e.label, 'ALERT');
  assert.ok(e.trigger_ids.includes('nws:1'));
});

test('evaluateEmergency: quiet Moderate is clear', () => {
  const e = evaluateEmergency({
    alerts: [{
      id: 'nws:2', system: 'nws', event: 'Heat Advisory', severity: 'Moderate',
      headline: 'Heat', t: Date.now(),
    }],
  });
  assert.equal(e.active, false);
  assert.equal(e.label, 'CLEAR');
});

test('formatAlertPost passes preflightX and is system-specific', () => {
  const t = Date.parse('2026-10-08T15:45:00Z');
  const usgs = formatAlertPost({
    id: 'usgs:x', system: 'usgs', event: 'M6.4 earthquake', severity: 'Severe',
    headline: 'M6.4 - offshore', area: 'Pacific', t, mag: 6.4,
  });
  assert.match(usgs, /15:45 UTC/);
  assert.match(usgs, /USGS|quake/i);
  assert.doesNotMatch(usgs, /https?:\/\//);

  const nws = formatAlertPost({
    id: 'nws:tornado-1', system: 'nws', event: 'Tornado Warning',
    severity: 'Extreme', headline: 'Tornado Warning for Test County',
    area: 'Test County', t,
  }, { phrasing: 0 });
  assert.match(nws, /tornado/i);
  assert.doesNotMatch(nws, /\bWarning\b/);

  const a = formatAlertPost({
    id: 'usgs:a', system: 'usgs', event: 'M6.1 earthquake', severity: 'Severe',
    headline: 'M6.1', area: 'Chile', t, mag: 6.1,
  }, { phrasing: 0 });
  const b = formatAlertPost({
    id: 'usgs:a', system: 'usgs', event: 'M6.1 earthquake', severity: 'Severe',
    headline: 'M6.1', area: 'Chile', t, mag: 6.1,
  }, { phrasing: 1 });
  assert.notEqual(a, b);
});

test('phrasingIndex is deterministic', () => {
  assert.equal(
    phrasingIndex('usgs:x', '2026-10-08T15:45:00Z', 3),
    phrasingIndex('usgs:x', '2026-10-08T15:45:00Z', 3),
  );
});

test('renderAlertCard: custom PNG per system', () => {
  const t = Date.parse('2026-10-08T15:45:00Z');
  const usgs = {
    id: 'usgs:x', system: 'usgs', event: 'M6.4 earthquake', severity: 'Severe',
    headline: 'M6.4 - offshore Pacific', area: 'Pacific', t, mag: 6.4,
    lat: 10.2, lon: -90.5,
  };
  const nws = {
    id: 'nws:1', system: 'nws', event: 'Tornado Warning', severity: 'Extreme',
    headline: 'Tornado alert for Test County', area: 'Test County', t,
    lat: 35.2, lon: -97.5,
  };
  assert.ok(SYSTEM_LOOK.usgs && SYSTEM_LOOK.nws);
  assert.ok(cardFacts(usgs).some((f) => /Magnitude/.test(f)));
  const pngU = renderAlertCard(usgs);
  const pngN = renderAlertCard(nws);
  assert.equal(pngU[0], 0x89);
  assert.equal(pngN[0], 0x89);
  assert.ok(pngU.length > 1000);
  assert.ok(pngN.length > 1000);
  assert.notEqual(Buffer.compare(pngU, pngN), 0);
});

test('freshTriggers filters posted ids', () => {
  assert.deepEqual(
    freshTriggers({ trigger_ids: ['a', 'b', 'c'] }, ['b']),
    ['a', 'c'],
  );
});

test('evaluateEmergency: storms far from the US drop to WATCH and are not posted', async () => {
  const { evaluateEmergency, freshTriggers } = await import('./emergency.mjs');
  const now = Date.parse('2026-10-09T12:00:00Z');
  const e = evaluateEmergency({ alerts: [
    { id: 'nhc:ep1', system: 'nhc', event: 'HU Simon', severity: 'Extreme', lon: -105, lat: 16, t: now },
  ] }, { now });
  assert.equal(e.label, 'WATCH');
  assert.deepEqual(freshTriggers(e, []), []);
  const g = evaluateEmergency({ alerts: [
    { id: 'nhc:al1', system: 'nhc', event: 'HU Gulf', severity: 'Extreme', lon: -87.6, lat: 27, t: now },
  ] }, { now });
  assert.equal(g.label, 'ALERT');
  assert.deepEqual(freshTriggers(g, []), ['nhc:al1']);
});

test('evaluateEmergency: expired alerts never trigger', async () => {
  const { evaluateEmergency } = await import('./emergency.mjs');
  const now = Date.parse('2026-10-09T12:00:00Z');
  const e = evaluateEmergency({ alerts: [
    { id: 'x', system: 'nws', event: 'Tornado Warning', severity: 'Extreme', lon: -97, lat: 35, t: now - 7200e3, ends: now - 3600e3 },
  ] }, { now });
  assert.equal(e.active, false);
});

test('stateFromText: NWS zone alerts get a state pin', async () => {
  const { stateFromText } = await import('./geo.mjs');
  assert.equal(stateFromText('Leon, FL', ''), 'FL');
  assert.equal(stateFromText('Cascade County below 5000ft', 'Winter Storm Watch issued October 8 by NWS Great Falls MT'), 'MT');
  assert.equal(stateFromText('Somewhere', 'no office'), null);
});

test('balancePerCity keeps every city and plausibleUS drops placeholder pins', async () => {
  const { balancePerCity } = await import('./collect.mjs');
  const { plausibleUS } = await import('./cities.mjs');
  const calls = [...Array(10)].map((_, i) => ({ city: 'A', t: 100 + i })).concat([{ city: 'B', t: 1 }]);
  const out = balancePerCity(calls, 3);
  assert.equal(out.filter((c) => c.city === 'A').length, 3);
  assert.equal(out.filter((c) => c.city === 'B').length, 1);
  assert.equal(plausibleUS(0, 0), false);
  assert.equal(plausibleUS(-1, -1), false);
  assert.equal(plausibleUS(-122.4, 37.8), true);
});
