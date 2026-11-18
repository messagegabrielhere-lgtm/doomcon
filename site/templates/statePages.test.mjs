import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as sp from './statePages.mjs';

const STATE = JSON.parse(readFileSync(new URL('../../data/state.json', import.meta.url), 'utf8'));

const ctx = {
  routes: { flock: true },
  state: STATE,
  news: { items: [] },
  href: (p) => p,
  url: (p) => `https://siren.watch${p}`,
  flock: {
    generated_at: '2026-09-26T00:00:00Z',
    copy: { headline_qualifier: 'as mapped in OpenStreetMap on 2026-09-26', empty_state: 'A county with no pins is a county nobody has mapped.' },
    totals: { in_a_us_county: 30 },
    states: [
      { name: 'Ohio', state: 'OH', cameras_mapped: 20, counties_total: 3, counties_with_mapped_cameras: 2, direction_present: 0 },
      { name: 'Louisiana', state: 'LA', cameras_mapped: 10, counties_total: 2, counties_with_mapped_cameras: 1, direction_present: 0 },
      { name: 'Alaska', state: 'AK', cameras_mapped: 0, counties_total: 30, counties_with_mapped_cameras: 0 },
    ],
    counties: [['39035', 'Cuyahoga County', 'OH', 15], ['39049', 'Franklin County', 'OH', 5], ['39001', 'Adams County', 'OH', 0],
      ['22033', 'East Baton Rouge Parish', 'LA', 10], ['22001', 'Acadia Parish', 'LA', 0]],
  },
  datacenters: {
    generated_at: '2026-11-18T00:00:00Z',
    honesty: ['A site missing from this map means nobody mapped it.'],
    counts: { sites: 4, by_state: { VA: { total: 3, operating: 2, under_construction: 1, announced: 0 }, WY: { total: 1, operating: 1 } } },
    resources_index: { drought_by_county: {}, drought_by_state: {} },
    sites: [
      { name: 'A', state: 'VA', state_name: 'Virginia', county: 'Loudoun County', status: 'operating' },
      { name: 'B', state: 'VA', state_name: 'Virginia', county: 'Loudoun County', status: 'under_construction' },
      { name: null, state: 'VA', state_name: 'Virginia', county: 'Prince William County', status: 'operating' },
      { name: 'C', state: 'WY', state_name: 'Wyoming', county: 'Laramie County', status: 'operating' },
    ],
  },
};

test('flock: one page per state with a camera, none for a state with zero', () => {
  const st = sp.flockStates(ctx);
  assert.deepEqual(st.map((s) => s.name), ['Ohio', 'Louisiana']);
  const html = sp.renderFlockState(ctx, st[0], 0, st);
  assert.match(html, /<title>Flock Cameras in Ohio: 20 Mapped, by County · SIREN/);
  assert.match(html, /Cuyahoga County/);
  assert.match(html, /Adams County\./, 'counties with none mapped are named');
  assert.match(html, /nobody has mapped/, 'the empty-state caveat ships on every state page');
});

test('flock: Louisiana says parish', () => {
  const st = sp.flockStates(ctx);
  assert.match(sp.renderFlockState(ctx, st[1], 1, st), /by Parish/);
});

test('data centers: below DC_MIN sites gets no page', () => {
  assert.deepEqual(sp.dcStates(ctx).map((s) => s.name), ['Virginia']);
  const html = sp.renderDcState(ctx, sp.dcStates(ctx)[0], 0, sp.dcStates(ctx));
  assert.match(html, /<title>Data Centers in Virginia: 3 Mapped, by County/);
  assert.match(html, /Unnamed site/);
});

test('sitemap lists exactly the pages written', () => {
  const written = sp.allPages(ctx).map((p) => `/${p.rel}`.replace(/index\.html$/, ''));
  const listed = sp.sitemapEntries(ctx).map((e) => e.loc);
  assert.deepEqual([...written].sort(), [...listed].sort());
});

test('no data, no pages', () => {
  assert.deepEqual(sp.allPages({ ...ctx, flock: null, datacenters: null }), []);
  assert.deepEqual(sp.allPages({ ...ctx, routes: {} , datacenters: null }), []);
});
