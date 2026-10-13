// Tests for the World Monitor tracking-source additions (cables extract,
 // Science Daily feeds, FEEDS count).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { FEEDS } from './collect.mjs';

test('FEEDS includes Science Daily top science and AI lanes', () => {
  const ids = FEEDS.map((f) => f[0]);
  assert.ok(ids.includes('sciencedaily'));
  assert.ok(ids.includes('sciencedaily-ai'));
  const ai = FEEDS.find((f) => f[0] === 'sciencedaily-ai');
  assert.equal(ai[3], 'ai');
  assert.equal(FEEDS.length, 29);
});

test('data/monitor-cables.json is a simplified TeleGeography extract', async () => {
  const j = JSON.parse(await readFile(new URL('../data/monitor-cables.json', import.meta.url), 'utf8'));
  assert.equal(j.schema, 1);
  assert.match(j.source, /TeleGeography/i);
  assert.ok(Array.isArray(j.cables));
  assert.ok(j.cables.length >= 50 && j.cables.length <= 200);
  const sample = j.cables[0];
  assert.ok(sample.n && Array.isArray(sample.l) && sample.l.length >= 1);
  const pt = sample.l[0][0];
  assert.equal(pt.length, 2);
  assert.ok(Number.isFinite(pt[0]) && Number.isFinite(pt[1]));
  assert.ok(Math.abs(pt[0]) <= 180 && Math.abs(pt[1]) <= 90);
});
