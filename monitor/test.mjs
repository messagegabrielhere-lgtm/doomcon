// Tests for ADS-B modality helpers (FlightAware-style sources on an ODbL feed).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  adsbModality, adsbCells, adsbModeTotals, adsbModeLine, ADSB_CELL_DEG,
} from './core.mjs';

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
