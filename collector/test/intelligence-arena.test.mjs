import { test } from 'node:test';
import assert from 'node:assert/strict';
import adapter, {
  aggregateMentionVolume,
  parseArenaDate,
} from '../sources/intelligence-arena.mjs';

const NOW = Date.parse('2026-10-12T02:00:00.000Z');

function row(overrides = {}) {
  return {
    model_slug: 'test/model',
    display_name: 'Test Model',
    provider: 'Test',
    date: '2026-10-10 12:00:00',
    f5_mention_count: 100,
    arena_regime: 'neutral',
    ...overrides,
  };
}

function catalogue(n, base = {}) {
  const rows = [];
  for (let i = 0; i < n; i++) {
    rows.push(row({
      model_slug: `test/model-${i}`,
      f5_mention_count: 10 + i,
      arena_regime: i % 3 === 0 ? 'bull' : i % 3 === 1 ? 'bear' : 'neutral',
      ...base,
    }));
  }
  return rows;
}

test('adapter contract shape', () => {
  assert.equal(adapter.id, 'intelligence-arena');
  assert.equal(adapter.pillar, 'attention');
  assert.equal(typeof adapter.label, 'string');
  assert.equal(typeof adapter.collect, 'function');
});

test('parseArenaDate accepts observed stamp forms', () => {
  assert.equal(parseArenaDate('2026-10-08 01:17:21'), Date.parse('2026-10-08T01:17:21Z'));
  assert.equal(parseArenaDate('2026-04-22'), Date.parse('2026-04-22T00:00:00Z'));
  assert.equal(parseArenaDate('2026-10-08T01:17:21.013318+00'), Date.parse('2026-10-08T01:17:21.013Z'));
  assert.equal(parseArenaDate(null), null);
  assert.equal(parseArenaDate('not-a-date'), null);
});

test('aggregateMentionVolume sums f5_mention_count', () => {
  const rows = catalogue(50);
  const r = aggregateMentionVolume(rows, { nowMs: NOW });
  const expected = rows.reduce((s, x) => s + x.f5_mention_count, 0);
  assert.equal(r.value, expected);
  assert.equal(r.unit, 'mentions');
  assert.equal(r.meta.models, 50);
  assert.equal(r.meta.regimes.bull + r.meta.regimes.bear + r.meta.regimes.neutral, 50);
  assert.equal(r.meta.snapshot_newest, '2026-10-10T12:00:00.000Z');
});

test('collect uses fetchJson endpoint and returns the aggregate', async () => {
  const rows = catalogue(60, { date: '2026-10-11 00:00:00' });
  let called = null;
  const fetchJson = async (url) => {
    called = url;
    return rows;
  };
  const r = await adapter.collect(fetchJson);
  assert.equal(called, 'https://www.intelligencearena.ai/api/arena/latest');
  assert.equal(r.value, rows.reduce((s, x) => s + x.f5_mention_count, 0));
  assert.equal(r.unit, 'mentions');
});

test('refuses non-array, empty, and truncated catalogues', () => {
  assert.throws(() => aggregateMentionVolume({ data: [] }, { nowMs: NOW }), /expected an array/);
  assert.throws(() => aggregateMentionVolume([], { nowMs: NOW }), /empty/);
  assert.throws(() => aggregateMentionVolume(catalogue(10), { nowMs: NOW }), /truncated/);
});

test('refuses missing or non-finite mention fields', () => {
  const missing = catalogue(50);
  missing[3].f5_mention_count = null;
  assert.throws(() => aggregateMentionVolume(missing, { nowMs: NOW }), /no f5_mention_count/);

  const bad = catalogue(50);
  bad[4].f5_mention_count = 'lots';
  assert.throws(() => aggregateMentionVolume(bad, { nowMs: NOW }), /non-finite/);

  const neg = catalogue(50);
  neg[5].f5_mention_count = -1;
  assert.throws(() => aggregateMentionVolume(neg, { nowMs: NOW }), /negative/);
});

test('refuses a stale snapshot', () => {
  const rows = catalogue(50, { date: '2026-09-01 00:00:00' });
  assert.throws(() => aggregateMentionVolume(rows, { nowMs: NOW }), /stale/);
});

test('refuses when no dates are parseable', () => {
  const rows = catalogue(50, { date: 'banana' });
  assert.throws(() => aggregateMentionVolume(rows, { nowMs: NOW }), /no parseable date/);
});
