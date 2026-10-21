import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCsv,
  fitComputeTrend,
  modelRows,
  recordLadder,
  summariseModels,
  summariseDataCenters,
} from '../compute-clock.mjs';

test('parseCsv keeps commas inside quoted fields and multiline cells', () => {
  const csv = [
    'Model,Organization,Publication date,Training compute (FLOP),Frontier model,Abstract',
    'A,Org,2024-01-01,1e25,True,"hello, world"',
    'B,"Big, Co",2024-06-01,2e25,True,"line1\nline2"',
  ].join('\n');
  const rows = parseCsv(csv);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].Model, 'A');
  assert.equal(rows[1].Organization, 'Big, Co');
  assert.match(rows[1].Abstract, /line1/);
});

test('fitComputeTrend recovers a known doubling schedule', () => {
  // log10(FLOP) rises by log10(2) every 0.5 years → doubling every 6 months, 4×/year.
  const points = [];
  for (let i = 0; i < 16; i++) {
    const t = 2020 + i * 0.5;
    points.push({ t, log10: 24 + i * Math.log10(2) });
  }
  const fit = fitComputeTrend(points);
  assert.equal(fit.ok, true);
  assert.ok(Math.abs(fit.months_per_doubling - 6) < 0.05);
  assert.ok(Math.abs(fit.growth_per_year - 4) < 0.05);
});

test('recordLadder only keeps new highs', () => {
  const ladder = recordLadder([
    { model: 'a', org: 'o', date: '2020-01-01', flop: 1e24, frontier: true, link: null },
    { model: 'b', org: 'o', date: '2021-01-01', flop: 5e23, frontier: true, link: null },
    { model: 'c', org: 'o', date: '2022-01-01', flop: 2e24, frontier: true, link: null },
  ]);
  assert.deepEqual(ladder.map((x) => x.model), ['a', 'c']);
});

test('summariseModels picks the largest run and a frontier trend', () => {
  const header = 'Model,Organization,Publication date,Training compute (FLOP),Frontier model,Domain,Confidence,Link';
  const lines = [header];
  for (let i = 0; i < 20; i++) {
    const flop = 1e24 * (2 ** i);
    lines.push(`M${i},Lab,2020-${String((i % 12) + 1).padStart(2, '0')}-15,${flop},True,Language,Confident,https://example.com/m${i}`);
  }
  // Largest overall, published last — so the ladder still climbs through M0..M19.
  lines.push('Side,Other,2025-06-01,1e32,False,Language,Confident,https://example.com/big');
  const s = summariseModels(parseCsv(lines.join('\n')), { nowMs: Date.parse('2026-10-12T00:00:00Z') });
  assert.equal(s.largest_run.model, 'Side');
  assert.equal(s.trend.ok, true);
  assert.ok(s.record_ladder.length >= 2);
  assert.ok(modelRows(parseCsv(lines.join('\n'))).length >= 20);
});

test('summariseDataCenters ranks by H100 equivalents and strips confidence tags', () => {
  const header = 'Name,Current H100 equivalents,Current power (MW),Owner,Country,Project';
  const lines = [header];
  for (let i = 0; i < 12; i++) {
    lines.push(`Site ${i},${(12 - i) * 10000},${(12 - i) * 10},Owner${i} #confident,United States,P${i}`);
  }
  const s = summariseDataCenters(parseCsv(lines.join('\n')));
  assert.equal(s.sites_covered, 12);
  assert.equal(s.largest.name, 'Site 0');
  assert.equal(s.largest.owner, 'Owner0');
  assert.ok(s.total_h100_eq > 0);
});
