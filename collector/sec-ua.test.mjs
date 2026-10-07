import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { SEC_UA } from './infra-sources/_sec.mjs';

// SEC's WAF, re-checked 2026-10-07: a User-Agent containing a URL or the
// substring "github" is HTTP 403, and that 403 is what took the compute pillar
// dark. The string is shared by the live adapter, the backfill and the
// datacentre readers. This locks the two tokens that must never return.

test('the SEC contact identifies the project and avoids the WAF tokens', () => {
  assert.match(SEC_UA, /^doomcon \S+@\S+$/);
  assert.doesNotMatch(SEC_UA, /github/i);
  assert.doesNotMatch(SEC_UA, /https?:\/\//i);
  assert.equal(SEC_UA.includes(' '), true);
});

test('the live adapter and the backfill send that same contact', () => {
  const adapter = readFileSync(new URL('./sources/sec-fts.mjs', import.meta.url), 'utf8');
  const backfill = readFileSync(new URL('./backfill.mjs', import.meta.url), 'utf8');
  assert.match(adapter, /headers:\s*\{\s*'user-agent':\s*SEC_UA\s*\}/);
  assert.match(backfill, /SEC_UA/);
  assert.doesNotMatch(adapter, /noreply\.github\.com/);
  assert.doesNotMatch(backfill, /noreply\.github\.com/);
});
