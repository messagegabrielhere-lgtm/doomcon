import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchCount } from '../si-signals.mjs';

test('searchCount retries an incomplete GitHub search and keeps the full count', async () => {
  const answers = [{ total_count: 1, incomplete_results: true }, { total_count: 2184, incomplete_results: false }];
  let i = 0;
  const r = await searchCount('q', { fetcher: async () => answers[i++], pause: 0 });
  assert.deepEqual(r, { count: 2184, complete: true });
  assert.equal(i, 2);
});

test('searchCount marks a count that never completed', async () => {
  const r = await searchCount('q', { fetcher: async () => ({ total_count: 40, incomplete_results: true }), pause: 0, tries: 2 });
  assert.deepEqual(r, { count: 40, complete: false });
});
