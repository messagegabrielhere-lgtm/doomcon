import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LABS, currentWeek } from './labsPage.mjs';

test('labs: 3-5 experiments a week, unique ids, current week by date', () => {
  const ids = new Set();
  for (const w of LABS.weeks) {
    assert.ok(w.items.length >= 3 && w.items.length <= 5, w.theme);
    for (const it of w.items) { assert.ok(!ids.has(it.id), it.id); ids.add(it.id); for (const k of ['name', 'q', 'build', 'data', 'measure', 'icon', 'c']) assert.ok(it[k], `${it.id}.${k}`); }
  }
  assert.equal(currentWeek(Date.parse('2026-10-12T13:00:00Z')), 0);
  assert.equal(currentWeek(Date.parse('2026-10-20T00:00:00Z')), 1);
  assert.equal(currentWeek(Date.parse('2027-06-01T00:00:00Z')), LABS.weeks.length - 1);
});
