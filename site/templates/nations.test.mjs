import { test } from 'node:test';
import assert from 'node:assert/strict';
import { marketByCountry, bestByCountry, countryOf, nationsRace } from '../nations.mjs';

test('nations: companies map to countries and odds sum by country', () => {
  assert.equal(countryOf('DeepSeek'), 'CN'); assert.equal(countryOf('Google'), 'US'); assert.equal(countryOf('Mistral'), 'FR'); assert.equal(countryOf('Nobody'), 'XX');
  const by = marketByCountry([{ title: 'Google', probability: 0.5 }, { title: 'Anthropic', probability: 0.3 }, { title: 'DeepSeek', probability: 0.1 }, { title: 'Mistral', probability: 0.1 }]);
  assert.ok(Math.abs(by.US - 0.8) < 1e-9 && Math.abs(by.CN - 0.1) < 1e-9);
  assert.equal(bestByCountry([{ title: 'Baidu', probability: 0.06 }, { title: 'DeepSeek', probability: 0.05 }]).CN, 0.06);
});

test('nations: scoreboard counts scored measures only', () => {
  const nr = nationsRace({
    race: { markets: { polymarket: { ok: true, horizon: { legs: [{ title: 'Google', probability: 0.9 }, { title: 'DeepSeek', probability: 0.1 }] } } } },
    power: { year: 2025, top: [{ iso: 'CHN', twh: 10000 }, { iso: 'USA', twh: 4500 }] },
    world: { countries: [{ iso2: 'US', total: 2000 }, { iso2: 'CN', total: 100 }] },
  });
  assert.deepEqual(nr.score, { US: 1, CN: 1 }); // odds to the US, power to China, labs tied, data centres unscored
  assert.equal(nr.measures.find((m) => m.id === 'dc').scored, false);
});
