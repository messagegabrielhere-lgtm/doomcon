// Tests for ADS-B modality helpers (FlightAware-style sources on an ODbL feed).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  adsbModality, adsbCells, adsbModeTotals, adsbModeLine, ADSB_CELL_DEG,
  assessAircraftHealth, AIRCRAFT_STALE_MIN, MIL_THIN_FLOOR, ADSB_THIN_FLOOR,
  categorize, CORE_VERSION,
} from './core.mjs';
import { carryForward } from './collect.mjs';

test('adsbModality buckets adsb.lol type strings the way FlightAware names them', () => {
  assert.equal(adsbModality('adsb_icao'), 'adsb');
  assert.equal(adsbModality('adsb_icao_nt'), 'adsb');
  assert.equal(adsbModality('adsr_icao'), 'adsb');
  assert.equal(adsbModality('mlat'), 'mlat');
  assert.equal(adsbModality('adsb_icao', { mlat: ['lat'] }), 'adsb'); // type wins
  assert.equal(adsbModality('other', { mlat: ['lat'] }), 'mlat');
  assert.equal(adsbModality('tisb_icao'), 'tisb');
  assert.equal(adsbModality('mode_s'), 'modes');
  assert.equal(adsbModality('other'), 'modes');
  assert.equal(adsbModality('weird'), 'other');
});

test('adsbCells keeps only counts, countries and modality mix on a 5° lattice', () => {
  const cells = adsbCells([
    { lat: 40.1, lon: -74.2, mod: 'adsb', iso: 'US' },
    { lat: 40.4, lon: -73.9, mod: 'mlat', iso: 'US' },
    { lat: 40.4, lon: -73.9, mod: 'adsb', iso: 'US' },
    { lat: 51.5, lon: -0.1, type: 'tisb_icao', iso: 'GB' },
  ]);
  assert.equal(ADSB_CELL_DEG, 5);
  assert.equal(cells.length, 2);
  const us = cells.find((c) => c.isos.US);
  const gb = cells.find((c) => c.isos.GB);
  assert.equal(us.n, 3);
  assert.equal(us.by.adsb, 2);
  assert.equal(us.by.mlat, 1);
  assert.equal(gb.n, 1);
  assert.equal(gb.by.tisb, 1);
  // No identifying fields leaked into the cell.
  for (const c of cells) {
    assert.equal(c.hex, undefined);
    assert.equal(c.flight, undefined);
    assert.equal(c.r, undefined);
  }
});

test('adsbModeTotals and adsbModeLine summarise a layer for chips and tooltips', () => {
  const cells = adsbCells([
    { lat: 1, lon: 1, mod: 'adsb' },
    { lat: 1, lon: 1, mod: 'adsb' },
    { lat: 1, lon: 1, mod: 'mlat' },
    { lat: 10, lon: 10, by: { 7700: 1 } },
  ]);
  const t = adsbModeTotals(cells);
  assert.equal(t.n, 4);
  assert.equal(t.adsb, 2);
  assert.equal(t.mlat, 1);
  assert.equal(t['7700'], 1);
  assert.equal(adsbModeLine(t), 'ADS-B 2 · MLAT 1 · 7700 1');
  assert.equal(adsbModeLine(null), '');
});

test('assessAircraftHealth is ok on a fresh, populated snapshot', () => {
  const now = Date.parse('2026-10-12T03:00:00Z');
  const health = assessAircraftHealth({
    generated: '2026-10-12T02:50:00Z',
    sources: {
      mil: { ok: true, n: 80 },
      adsb: { ok: true, n: 400 },
      emerg: { ok: true, n: 0 },
      mil_modes: { n: 80, adsb: 60, mlat: 20 },
      adsb_modes: { n: 400, adsb: 380, mlat: 20 },
      adsb_hubs: { ok: 38, of: 40, unique: 400 },
    },
    mil: [{ lat: 40, lon: -74, n: 80, by: { adsb: 60, mlat: 20 } }],
    adsb: [{ lat: 40, lon: -74, n: 400, by: { adsb: 380 } }],
    emerg: [],
  }, now);
  assert.equal(health.ok, true);
  assert.equal(health.issues.length, 0);
  assert.equal(health.mil, 80);
  assert.equal(health.adsb, 400);
  assert.ok(AIRCRAFT_STALE_MIN >= 30);
  assert.ok(MIL_THIN_FLOOR >= 1);
  assert.ok(ADSB_THIN_FLOOR >= 10);
});

test('assessAircraftHealth errors on a down mil feed and a stale snapshot', () => {
  const now = Date.parse('2026-10-12T04:00:00Z');
  const health = assessAircraftHealth({
    generated: '2026-10-12T02:00:00Z', // 120 min old
    sources: {
      mil: { ok: false, error: 'HTTP 502' },
      adsb: { ok: true, n: 10 },
      emerg: { ok: false, error: 'timed out', stale_from: '2026-10-12T01:50:00Z' },
      mil_modes: { n: 0 },
      adsb_modes: { n: 10 },
      adsb_hubs: { ok: 10, of: 40, unique: 10 },
    },
    mil: [], adsb: [], emerg: [],
  }, now);
  assert.equal(health.ok, false);
  const ids = health.issues.map((i) => i.id);
  assert.ok(ids.includes('snap_stale'));
  assert.ok(ids.includes('mil_down'));
  assert.ok(ids.includes('emerg_stale'));
  assert.ok(ids.includes('adsb_hubs_thin') || ids.includes('adsb_thin'));
});

test('carryForward keeps a previously ok empty squawk layer, so a 429 warns instead of paging', () => {
  const sources = { emerg: { ok: false, error: 'HTTP 429 Too Many Requests — rate limit exceeded: 10 req/min' } };
  const hz = { emerg: [] };
  carryForward(sources, hz, {
    generated: '2026-10-21T09:00:00Z',
    sources: { emerg: { ok: true, n: 0 } },
    emerg: [],
  });
  assert.equal(sources.emerg.ok, false);
  assert.equal(sources.emerg.stale_from, '2026-10-21T09:00:00Z');
  const health = assessAircraftHealth({
    generated: '2026-10-21T09:10:00Z',
    sources: {
      mil: { ok: true, n: 80 },
      adsb: { ok: true, n: 400 },
      emerg: sources.emerg,
      mil_modes: { n: 80 },
      adsb_modes: { n: 400 },
      adsb_hubs: { ok: 40, of: 40, unique: 400 },
    },
    mil: [{ n: 80 }],
    adsb: [{ n: 400 }],
    emerg: hz.emerg,
  }, Date.parse('2026-10-21T09:10:00Z'));
  assert.equal(health.ok, true);
  assert.ok(health.issues.some((i) => i.id === 'emerg_stale' && i.severity === 'warn'));
});

test('carryForward does not launder a previous hard failure with no rows', () => {
  const sources = { emerg: { ok: false, error: 'HTTP 429' } };
  const hz = { emerg: [{ n: 3 }] };
  carryForward(sources, hz, {
    generated: '2026-10-21T09:00:00Z',
    sources: { emerg: { ok: false, error: 'HTTP 429' } },
    emerg: [],
  });
  assert.equal(sources.emerg.stale_from, undefined);
  assert.equal(hz.emerg.length, 1);
});

test('carryForward still keeps a previous non-empty layer', () => {
  const sources = { mil: { ok: false, error: 'HTTP 502' } };
  const hz = { mil: [] };
  carryForward(sources, hz, {
    generated: '2026-10-21T09:00:00Z',
    mil: [{ n: 12 }, { n: NaN }],
  });
  assert.equal(sources.mil.stale_from, '2026-10-21T09:00:00Z');
  assert.deepEqual(hz.mil, [{ n: 12 }]);
});

test('assessAircraftHealth warns when mil answers empty', () => {
  const now = Date.parse('2026-10-12T03:00:00Z');
  const health = assessAircraftHealth({
    generated: '2026-10-12T02:55:00Z',
    sources: {
      mil: { ok: true, n: 0 },
      adsb: { ok: true, n: 200 },
      emerg: { ok: true, n: 0 },
      mil_modes: { n: 0 },
      adsb_modes: { n: 200 },
      adsb_hubs: { ok: 40, of: 40, unique: 200 },
    },
    mil: [], adsb: [{ lat: 1, lon: 1, n: 200 }], emerg: [],
  }, now);
  assert.equal(health.ok, true);
  assert.ok(health.issues.some((i) => i.id === 'mil_empty' && i.severity === 'warn'));
});

test('categorize flags AI case-insensitively and robots', () => {
  assert.ok(CORE_VERSION >= 4);
  assert.equal(categorize('OpenAI releases a model'), 'ai');
  assert.equal(categorize('local ai lab raises funds'), 'ai');
  assert.equal(categorize('A.I. safety summit opens'), 'ai');
  assert.equal(categorize('Warehouse robots double shifts'), 'ai');
  assert.equal(categorize('Humanoid robot demo in Tokyo'), 'ai');
  assert.equal(categorize('Robotics firm files papers'), 'ai');
  // Must not swallow ordinary English ("aid", "air", "said").
  assert.notEqual(categorize('Aid convoy reaches border'), 'ai');
  assert.notEqual(categorize('Air strike reported overnight'), 'ai');
});
