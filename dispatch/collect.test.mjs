// node --test dispatch/collect.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { geomCentroid, round2, round3, clean, isMain } from './geo.mjs';
import { evaluateEmergency, sanitizeAlertText, formatAlertPost, freshTriggers, phrasingIndex, nwsAngle, NWS_ANGLES } from './emergency.mjs';
import { renderAlertCard, cardFacts, SYSTEM_LOOK } from './card.mjs';
import { CITIES } from './cities.mjs';

test('round2 is ~1 km privacy grid; round3 is ~100 m', () => {
  assert.equal(round2(-122.4194), -122.42);
  assert.equal(round3(-122.4194), -122.419);
  assert.ok(Number.isNaN(round2(undefined)));
  assert.ok(Number.isNaN(round3(null)));
});

test('clean collapses whitespace', () => {
  assert.equal(clean('  Aid   Response  '), 'Aid Response');
  assert.equal(clean(''), null);
  assert.equal(clean(null), null);
});

test('isMain resolves relative argv paths', () => {
  const here = pathToFileURL(path.resolve('dispatch/collect.mjs')).href;
  assert.equal(isMain(here, 'dispatch/collect.mjs'), true);
  assert.equal(isMain(here, 'dispatch/other.mjs'), false);
  assert.equal(isMain(here, ''), false);
});

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

test('seattle Fire/EMS mapper: rounds to 2 decimals and drops junk rows', () => {
  const sea = CITIES.find((c) => c.id === 'seattle');
  const { calls, blather } = sea.map([
    { datetime: '2026-10-08T12:00:00Z', longitude: '-122.41941', latitude: '37.77491', type: 'Aid Response', incident_number: 'F1' },
    { datetime: 'bad', longitude: '-122.4', latitude: '37.7', type: 'Aid Response' },
    { datetime: '2026-10-08T12:01:00Z', longitude: '-122.4', latitude: '37.7', type: 'SUICIDE THREAT', incident_number: 'F2' },
  ]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].lon, -122.42);
  assert.equal(calls[0].lat, 37.77);
  assert.equal(calls[0].id, 'sea:F1');
  assert.equal(blather.length, 1);
  assert.equal(blather[0].text, 'Aid Response');
});

test('sf mapper: drops sensitive_call rows', () => {
  const sf = CITIES.find((c) => c.id === 'sf');
  const { calls } = sf.map([
    {
      cad_number: '1', call_type_final_desc: 'Noise', agency: 'Police',
      received_datetime: '2026-10-08T12:00:00Z', sensitive_call: false,
      intersection_point: { coordinates: [-122.41941, 37.77491] },
    },
    {
      cad_number: '2', call_type_final_desc: 'Sensitive', agency: 'Police',
      received_datetime: '2026-10-08T12:01:00Z', sensitive_call: true,
      intersection_point: { coordinates: [-122.4, 37.7] },
    },
  ]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].id, 'sf:1');
  assert.equal(calls[0].lon, -122.42);
});

test('dallas mapper: approx pin uses round2 and never copies address fields', () => {
  const dal = CITIES.find((c) => c.id === 'dallas');
  const { calls } = dal.map([{
    date: '2026-10-08T00:00:00.000', time: '14:30:00',
    nature_of_call: 'Disturbance', division: 'Central',
    incident_number: 'D1', priority: '2', location: '123 Main St',
  }]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].approx, true);
  assert.equal(calls[0].lon, -96.8);
  assert.equal(calls[0].lat, 32.78);
  assert.equal(JSON.stringify(calls[0]).includes('Main'), false);
});

test('sanitizeAlertText strips Warning / expected', () => {
  assert.match(sanitizeAlertText('Tornado Warning expected'), /Tornado alert listed/i);
  assert.doesNotMatch(sanitizeAlertText('Tornado Warning'), /\bWarning\b/);
});

test('nwsAngle covers the catalogue', () => {
  assert.equal(nwsAngle({ event: 'Tornado Warning' }), 'tornado');
  assert.equal(nwsAngle({ event: 'Heat Advisory' }), 'heat');
  assert.equal(nwsAngle({ event: 'Special Weather Statement' }), 'weather');
  for (const a of NWS_ANGLES) assert.equal(typeof a, 'string');
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

test('evaluateEmergency: M7 beats Extreme NWS on weight', () => {
  const now = Date.parse('2026-10-08T18:00:00Z');
  const e = evaluateEmergency({
    alerts: [
      { id: 'nws:1', system: 'nws', event: 'Tornado', severity: 'Extreme', t: now, headline: 'T' },
      { id: 'usgs:1', system: 'usgs', event: 'M7.1', severity: 'Extreme', mag: 7.1, t: now - 3600e3, headline: 'Q' },
    ],
  }, { now });
  assert.equal(e.label, 'EMERGENCY');
  assert.equal(e.primary.id, 'usgs:1');
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
