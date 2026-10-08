import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  baselineProgress, attachBaselineProgress, baselinePhrase, baselineCompact, BASELINE_DAYS_REQUIRED,
} from '../forward-coverage.mjs';

const DEF = 'volume-weighted mean of the current basket';
const OLD = 'an older basket';

function reading(source, day, { ok = true, value = 1, def = DEF, unit = 'prob_points/day', hour = '12' } = {}) {
  return {
    source, ok, value, unit,
    observed_at: `${day}T${hour}:00:00.000Z`,
    meta: def === null ? {} : { definition: def },
  };
}

test('counts distinct days on the current definition and drops the older one', () => {
  const snaps = [
    { readings: [reading('polymarket', '2026-09-23', { def: OLD, hour: '03' })] },
    { readings: [reading('polymarket', '2026-09-24', { hour: '01' })] },
    { readings: [reading('polymarket', '2026-09-24', { hour: '18', value: 2 })] },
    { readings: [reading('polymarket', '2026-09-25')] },
  ];
  const got = baselineProgress(snaps, { asOfDay: '2026-09-25' });
  assert.deepEqual(got.get('polymarket'), {
    days: 2, required: BASELINE_DAYS_REQUIRED, since: '2026-09-24', until: '2026-09-25',
  });
});

test('a later failure does not erase a good reading the same day', () => {
  const snaps = [
    { readings: [reading('kalshi', '2026-10-01', { hour: '01' })] },
    { readings: [reading('kalshi', '2026-10-01', { hour: '20', ok: false, value: null })] },
  ];
  assert.equal(baselineProgress(snaps, { asOfDay: '2026-10-01' }).get('kalshi').days, 1);
});

test('a day with no definition does not count', () => {
  const snaps = [
    { readings: [reading('manifold', '2026-10-01', { def: null })] },
    { readings: [reading('manifold', '2026-10-02')] },
  ];
  const got = baselineProgress(snaps, { asOfDay: '2026-10-02' });
  assert.equal(got.get('manifold').days, 1);
  assert.equal(got.get('manifold').since, '2026-10-02');
});

test('a unit change drops the older days', () => {
  const snaps = [
    { readings: [reading('manifold', '2026-10-01', { unit: 'mana/24h' })] },
    { readings: [reading('manifold', '2026-10-02', { unit: 'other' })] },
  ];
  const got = baselineProgress(snaps, { asOfDay: '2026-10-02' });
  assert.equal(got.get('manifold').days, 1);
  assert.equal(got.get('manifold').since, '2026-10-02');
});

test('days outside the trailing window are not counted', () => {
  const snaps = [
    { readings: [reading('polymarket', '2025-01-01')] },
    { readings: [reading('polymarket', '2026-10-08')] },
  ];
  const got = baselineProgress(snaps, { asOfDay: '2026-10-08', windowDays: 365 });
  assert.equal(got.get('polymarket').days, 1);
  assert.equal(got.get('polymarket').since, '2026-10-08');
});

test('attach writes presentation fields and leaves the score untouched', () => {
  const state = {
    score: 59.4,
    pillars: [
      { id: 'markets', uncalibrated: true, score: null },
      { id: 'attention', uncalibrated: false, score: 40 },
    ],
    sources: [
      { id: 'polymarket', pillar: 'markets', uncalibrated: true, ok: false },
      { id: 'kalshi', pillar: 'markets', uncalibrated: true, ok: false },
      { id: 'hn', pillar: 'attention', uncalibrated: false, ok: true },
    ],
  };
  const progress = new Map([
    ['polymarket', { days: 15, required: 300, since: '2026-09-24', until: '2026-10-08' }],
    ['kalshi', { days: 16, required: 300, since: '2026-09-23', until: '2026-10-08' }],
    ['hn', { days: 400, required: 300, since: '2025-01-01', until: '2026-10-08' }],
  ]);
  attachBaselineProgress(state, progress);
  assert.equal(state.score, 59.4);
  assert.equal(state.sources[0].baseline_days, 15);
  assert.equal(state.sources[1].baseline_days, 16);
  assert.equal(state.sources[2].baseline_days, undefined);
  assert.equal(state.pillars[0].baseline_days, 15);
  assert.equal(state.pillars[0].baseline_since, '2026-09-24');
  assert.equal(state.pillars[1].baseline_days, undefined);
  assert.equal(baselinePhrase(15, 300), '15 of 300 days');
  assert.equal(baselineCompact(15, 300), '15/300');
  assert.equal(baselinePhrase(0, 300), null);
});

test('a pillar stays uncounted when one of its sources has no days', () => {
  const state = {
    pillars: [{ id: 'markets', uncalibrated: true }],
    sources: [
      { id: 'polymarket', pillar: 'markets', uncalibrated: true },
      { id: 'manifold', pillar: 'markets', uncalibrated: true },
    ],
  };
  attachBaselineProgress(state, new Map([
    ['polymarket', { days: 15, required: 300, since: '2026-09-24', until: '2026-10-08' }],
  ]));
  assert.equal(state.pillars[0].baseline_days, undefined);
  assert.equal(state.sources[0].baseline_days, 15);
});
