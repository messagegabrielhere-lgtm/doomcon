import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serpTitle, serpDescription } from './_html.mjs';

test('serpTitle keeps short titles and cuts long ones at the dash, keeping the brand', () => {
  assert.equal(serpTitle('Free bots, made by bots · SIREN'), 'Free bots, made by bots · SIREN');
  const long = 'A very long headline about something in AI today — with an extra clause that runs on · SIREN';
  assert.equal(serpTitle(long), 'A very long headline about something in AI today · SIREN');
});

test('serpDescription stays within 160 chars and ends on a sentence or a word', () => {
  const short = 'Fits as written.';
  assert.equal(serpDescription(short), short);
  const two = `${'First sentence carries the claim and runs long enough, well past eighty characters, to matter here'}. ${'Second sentence '.repeat(10)}`;
  const d = serpDescription(two);
  assert.ok(d.length <= 160, String(d.length));
  assert.match(d, /matter here\.$/);
  const run = 'word '.repeat(60);
  const r = serpDescription(run);
  assert.ok(r.length <= 161 && r.endsWith('…'));
});
