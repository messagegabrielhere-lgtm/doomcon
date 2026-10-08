import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { SEC_UA, secContact, secFetchJson, secUserAgents } from './infra-sources/_sec.mjs';

const FALLBACK = 'messagegabrielhere@gmail.com';

// SEC's WAF, re-checked 2026-10-07: a User-Agent containing a URL or the
// substring "github" is HTTP 403, and that 403 is what took the compute pillar
// dark. An unset Actions secret is an empty string, so the old `|| noreply`
// fallback ran on every collect.

test('the default SEC contact identifies the project and avoids the WAF tokens', () => {
  assert.equal(secContact(undefined), FALLBACK);
  assert.equal(secContact(''), FALLBACK);
  assert.equal(secContact('   '), FALLBACK);
  assert.equal(secContact('331486973+messagegabrielhere-lgtm@users.noreply.github.com'), FALLBACK);
  assert.equal(secContact('doomcon.watch collector (admin@example.com)'), FALLBACK);
  assert.equal(secContact('https://example.com'), FALLBACK);
  assert.equal(secContact('ops@example.com'), 'ops@example.com');
  assert.equal(secContact('bob+siren@gmail.com'), 'bob+siren@gmail.com');

  assert.equal(SEC_UA, secUserAgents()[0]);
  assert.equal(secUserAgents(FALLBACK)[0], `doomcon ${FALLBACK}`);
  assert.doesNotMatch(SEC_UA, /github/i);
  assert.doesNotMatch(SEC_UA, /https?:\/\//i);
  assert.deepEqual(secUserAgents('ops@example.com'), [
    'doomcon ops@example.com',
    'SIREN AI Index ops@example.com',
    'SIREN/1.0 (ops@example.com)',
  ]);
});

test('a 403 tries the next contact string and any other error stops', async () => {
  const seen = [];
  const body = await secFetchJson(async (url, opts) => {
    seen.push(opts.headers['user-agent']);
    if (seen.length < 2) {
      const err = new Error('HTTP 403 Forbidden from https://efts.sec.gov/LATEST/search-index');
      err.status = 403;
      throw err;
    }
    return { hits: { total: { value: 1, relation: 'eq' } }, url };
  }, 'https://efts.sec.gov/LATEST/search-index?q=1', {
    headers: { 'user-agent': 'doomcon https://github.com/example' },
  });

  assert.equal(body.hits.total.value, 1);
  assert.deepEqual(seen, secUserAgents().slice(0, 2));
  for (const ua of seen) assert.doesNotMatch(ua, /github/i);

  await assert.rejects(
    () => secFetchJson(async () => {
      throw new Error('HTTP 500 Internal server error');
    }, 'https://efts.sec.gov/LATEST/search-index'),
    /HTTP 500/,
  );
});

test('the live adapter and the backfill send the shared contact', () => {
  const adapter = readFileSync(new URL('./sources/sec-fts.mjs', import.meta.url), 'utf8');
  const backfill = readFileSync(new URL('./backfill.mjs', import.meta.url), 'utf8');
  const shared = readFileSync(new URL('./infra-sources/_sec.mjs', import.meta.url), 'utf8');
  assert.match(adapter, /secFetchJson\(fetchJson,/);
  assert.match(backfill, /headers:\s*\{\s*'user-agent':\s*SEC_UA\s*\}/);
  assert.doesNotMatch(adapter, /noreply\.github\.com/);
  assert.doesNotMatch(backfill, /noreply\.github\.com/);
  assert.doesNotMatch(shared, /noreply\.github\.com/);
});
