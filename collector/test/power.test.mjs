import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, summarise } from '../power.mjs';

test('summarise ranks countries, skips aggregates, computes growth', () => {
  const csv = ['country,year,iso_code,population,electricity_generation,per_capita_electricity,low_carbon_share_elec,solar_electricity,nuclear_electricity',
    'World,2020,,7800000000,26000,,,,', 'World,2025,,8100000000,31000,,,,',
    'China,2020,CHN,1400000000,7700,5500,30,,', 'China,2025,CHN,1410000000,10500,7400,38,,',
    'United States,2020,USA,330000000,4200,12700,40,,', 'United States,2025,USA,340000000,4500,13000,42,,',
    'Asia,2025,,4700000000,15000,,,,'].join('\n');
  const s = summarise(parseCsv(csv));
  assert.equal(s.year, 2025);
  assert.equal(s.world_twh, 31000);
  assert.deepEqual(s.top.map((c) => c.iso), ['CHN', 'USA']);
  assert.equal(s.top[0].growth_5y_pct, 36.4);
  assert.equal(s.race.china.length, 2);
});
