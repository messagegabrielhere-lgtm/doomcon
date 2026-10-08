// node --test dispatch/collect.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { geomCentroid } from './collect.mjs';

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
