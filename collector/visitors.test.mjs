import assert from 'node:assert/strict';
import test from 'node:test';
import {
  collectVisitors,
  countryCodeOf,
  normaliseLocations,
  shouldRefresh,
} from './visitors.mjs';

test('countryCodeOf accepts ISO2 and ISO3166-2 region forms', () => {
  assert.equal(countryCodeOf('us'), 'US');
  assert.equal(countryCodeOf('US-TX'), 'US');
  assert.equal(countryCodeOf('de-bw'), 'DE');
  assert.equal(countryCodeOf(''), '');
  assert.equal(countryCodeOf('Germany'), '');
});

test('normaliseLocations ranks by count and uppercases ISO2', () => {
  const rows = normaliseLocations([
    { id: 'us', name: 'United States', count: 12 },
    { id: 'DE', name: 'Germany', count: 4 },
    { id: 'us', name: 'United States', count: 3 },
    { id: 'US-CA', name: 'California', count: 5 },
    { id: '', name: '(unknown)', count: 2 },
    { name: 'bogus', count: 0 },
  ]);
  assert.deepEqual(rows, [
    { iso2: 'US', name: 'United States', count: 20 },
    { iso2: 'DE', name: 'Germany', count: 4 },
    { iso2: '', name: '(unknown)', count: 2 },
  ]);
});

test('a missing token is a distinct failure', async () => {
  await assert.rejects(
    () => collectVisitors({ fetchJson: async () => ({}), key: '   ' }),
    (err) => err.code === 'NO_KEY',
  );
});

test('collectVisitors asks for totals and locations over seven days', async () => {
  const calls = [];
  const doc = await collectVisitors({
    key: 'test-token',
    code: 'messagegabriel',
    now: Date.parse('2026-10-14T02:42:00.000Z'),
    fetchJson: async (url, opts) => {
      calls.push({
        url,
        auth: opts.headers.authorization,
        type: opts.headers['content-type'],
      });
      if (url.includes('/stats/total')) {
        return { total: 100, total_events: 0 };
      }
      return {
        more: false,
        stats: [
          { id: 'US', name: 'United States', count: 40 },
          { id: 'GB', name: 'United Kingdom', count: 10 },
          { id: '', name: '(unknown)', count: 5 },
        ],
      };
    },
  });

  assert.equal(calls.length, 2);
  for (const call of calls) {
    assert.equal(call.auth, 'Bearer test-token');
    assert.equal(call.type, 'application/json');
  }
  assert.match(calls[0].url, /\/stats\/total\?/);
  assert.match(calls[1].url, /\/stats\/locations\?/);
  assert.match(calls[0].url, /start=2026-10-07T02%3A00%3A00Z/);
  assert.match(calls[0].url, /end=2026-10-14T02%3A00%3A00Z/);

  assert.equal(doc.schema, 1);
  assert.equal(doc.as_of_date, '2026-10-14');
  assert.equal(doc.window.days, 7);
  assert.equal(doc.totals.pageviews, 100);
  assert.equal(doc.totals.visitors_located, 50);
  assert.equal(doc.totals.countries, 2);
  assert.equal(doc.totals.unknown, 5);
  assert.deepEqual(doc.countries, [
    { iso2: 'US', name: 'United States', count: 40, share: 0.8 },
    { iso2: 'GB', name: 'United Kingdom', count: 10, share: 0.2 },
  ]);
  assert.doesNotMatch(JSON.stringify(doc), /test-token/);
});

test('collectVisitors pages through GoatCounter when more is true', async () => {
  const offsets = [];
  const doc = await collectVisitors({
    key: 'tok',
    now: Date.parse('2026-10-14T02:00:00.000Z'),
    fetchJson: async (url) => {
      if (url.includes('/stats/total')) return { total: 30 };
      const u = new URL(url);
      const offset = Number(u.searchParams.get('offset') || 0);
      offsets.push(offset);
      if (offset === 0) {
        return { more: true, stats: [{ id: 'US', name: 'United States', count: 20 }] };
      }
      return { more: false, stats: [{ id: 'GB', name: 'United Kingdom', count: 10 }] };
    },
  });
  assert.deepEqual(offsets, [0, 1]);
  assert.equal(doc.totals.countries, 2);
  assert.equal(doc.totals.visitors_located, 30);
});

test('shouldRefresh respects the daily freshness window', () => {
  const now = Date.parse('2026-10-14T12:00:00.000Z');
  assert.equal(shouldRefresh(null, { now }), true);
  assert.equal(shouldRefresh({ generated_at: '2026-10-14T01:00:00.000Z' }, { now }), false);
  assert.equal(shouldRefresh({ generated_at: '2026-10-13T10:00:00.000Z' }, { now }), true);
  assert.equal(shouldRefresh({ generated_at: '2026-10-14T01:00:00.000Z' }, { now, force: true }), true);
});
