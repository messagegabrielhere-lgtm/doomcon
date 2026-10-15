import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { WHATS_NEW, whatsNewFor } from '../siteheader.mjs';

describe('whatsNewFor', () => {
  it('omits /#readers when the visitors map cannot render', () => {
    const without = whatsNewFor({});
    assert.ok(WHATS_NEW.some(([h]) => h === '/#readers'));
    assert.ok(!without.some(([h]) => h === '/#readers'));
    assert.ok(without.some(([h]) => h === '/nations.html'));
  });

  it('keeps /#readers when visitors + outline can build the map', () => {
    const ctx = {
      visitors: {
        countries: [{ iso2: 'US', name: 'United States', count: 12, share: 0.5 }],
        totals: { countries: 1, visitors_located: 12 },
        window: { days: 7 },
        as_of_date: '2026-10-14',
      },
      worldOutline: {
        countries: [{
          iso2: 'US',
          name: 'United States',
          rings: [[[-120, 40], [-110, 40], [-110, 30], [-120, 30], [-120, 40]]],
        }],
      },
    };
    const withReaders = whatsNewFor(ctx);
    assert.ok(withReaders.some(([h]) => h === '/#readers'));
    assert.equal(withReaders.length, WHATS_NEW.length);
  });
});
