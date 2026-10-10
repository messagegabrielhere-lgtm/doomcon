import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MONETIZE, polymarketUrl } from '../monetize.mjs';

test('polymarketUrl adds UTM tags, and the referral only when one is configured', () => {
  const saved = MONETIZE.polymarket.ref;
  try {
    MONETIZE.polymarket.ref = null;
    assert.equal(polymarketUrl('https://polymarket.com/event/x', 'race'), 'https://polymarket.com/event/x?utm_source=siren&utm_medium=race');
    MONETIZE.polymarket.ref = 'https://polymarket.com/?r=abc';
    assert.equal(polymarketUrl('https://polymarket.com/event/x', 'race'), 'https://polymarket.com/event/x?utm_source=siren&utm_medium=race&r=abc');
    MONETIZE.polymarket.ref = 'via=abc';
    assert.match(polymarketUrl('https://polymarket.com/market/y'), /via=abc/);
    assert.equal(polymarketUrl('https://example.com/a'), 'https://example.com/a');
    assert.equal(polymarketUrl(null), null);
  } finally { MONETIZE.polymarket.ref = saved; }
});
