import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hostMinIntervalMs } from '../fetch.mjs';

test('api.adsb.lol spacing stays under 10 requests per minute', () => {
  const ms = hostMinIntervalMs('https://api.adsb.lol/v2/sqk/7500');
  assert.equal(hostMinIntervalMs('https://api.adsb.lol/v2/mil'), ms);
  // The 10th start is 9 intervals after the first. It has to fall outside
  // the 60s window that opened on the first start, or the 10th call is the
  // one adsb.lol answers 429.
  assert.ok(ms * 9 > 60_000, `10 starts would share a minute at ${ms}ms`);
  assert.equal(hostMinIntervalMs('https://example.com/v2/mil'), 0);
});
