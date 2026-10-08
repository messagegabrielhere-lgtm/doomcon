import assert from 'node:assert/strict';
import test from 'node:test';
import { collectReport, formatReport } from './visitor-report.mjs';

test('a missing token is a distinct failure', async () => {
  await assert.rejects(
    () => collectReport({ fetchJson: async () => ({}), key: '   ' }),
    (err) => err.code === 'NO_KEY',
  );
});

test('the report asks GoatCounter for a day, a week, and the top pages', async () => {
  const calls = [];
  const report = await collectReport({
    key: 'test-token',
    code: 'messagegabriel',
    now: Date.parse('2026-10-08T02:42:00.000Z'),
    fetchJson: async (url, opts) => {
      calls.push({ url, auth: opts.headers.authorization });
      if (url.includes('/stats/total')) {
        return { total: url.includes('2026-10-01') ? 40 : 12, total_events: 0, total_utc: 12 };
      }
      return { stats: [{ name: '/doomcon/', count: 8 }, { name: '/doomcon/news.html', count: 3 }] };
    },
  });

  assert.equal(calls.length, 3);
  for (const call of calls) assert.equal(call.auth, 'Bearer test-token');
  assert.equal(report.day, 12);
  assert.equal(report.week, 40);
  assert.deepEqual(report.pages, [
    { name: '/doomcon/', count: 8 },
    { name: '/doomcon/news.html', count: 3 },
  ]);
  const text = formatReport(report);
  assert.match(text, /Last 24 hours: 12 pageviews/);
  assert.match(text, /Last 7 days: 40 pageviews/);
  assert.match(text, /\/doomcon\/news.html: 3/);
  assert.doesNotMatch(text, /test-token/);
});
