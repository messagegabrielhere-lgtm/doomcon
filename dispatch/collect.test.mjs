// node --test dispatch/collect.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { geomCentroid } from './geo.mjs';
import { evaluateEmergency, sanitizeAlertText, formatAlertPost, freshTriggers } from './emergency.mjs';
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

test('formatAlertPost passes preflightX', () => {
  const text = formatAlertPost({
    id: 'usgs:x', system: 'usgs', event: 'M6.4 earthquake', severity: 'Severe',
    headline: 'M6.4 - offshore', area: 'Pacific',
    t: Date.parse('2026-10-08T15:45:00Z'), mag: 6.4,
  });
  assert.match(text, /15:45 UTC/);
  assert.match(text, /DISPATCH/);
  assert.doesNotMatch(text, /https?:\/\//);
});

test('freshTriggers filters posted ids', () => {
  assert.deepEqual(
    freshTriggers({ trigger_ids: ['a', 'b', 'c'] }, ['b']),
    ['a', 'c'],
  );
});
