import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LABS, currentWeek, render } from './labsPage.mjs';

test('labs: 3-5 experiments a week, unique ids, current week by date', () => {
  const ids = new Set();
  for (const w of LABS.weeks) {
    assert.ok(w.items.length >= 3 && w.items.length <= 5, w.theme);
    for (const it of w.items) {
      assert.ok(!ids.has(it.id), it.id);
      ids.add(it.id);
      for (const k of ['name', 'q', 'build', 'data', 'measure', 'icon', 'c']) assert.ok(it[k], `${it.id}.${k}`);
      if (it.status === 'shipped') assert.ok(it.href, `${it.id} shipped needs href`);
    }
  }
  assert.equal(currentWeek(Date.parse('2026-10-12T13:00:00Z')), 0);
  assert.equal(currentWeek(Date.parse('2026-10-20T00:00:00Z')), 1);
  assert.equal(currentWeek(Date.parse('2027-06-01T00:00:00Z')), LABS.weeks.length - 1);
});

test('labs week of Oct 12 is shipped to /bench.html', () => {
  const week = LABS.weeks[0];
  assert.equal(week.start, '2026-10-12');
  for (const it of week.items) {
    assert.equal(it.status, 'shipped', it.id);
    assert.match(it.href, /^\/bench\.html#/);
  }
  const html = render({
    href: (p) => p,
    url: (p) => `https://siren.watch${p}`,
    state: { generated_at: '2026-10-13T12:00:00Z', score: 49, level: 4, level_name: 'ROUTINE' },
    history: [],
  }, Date.parse('2026-10-13T12:00:00Z'));
  assert.match(html, /● LIVE/);
  assert.match(html, /href="\/bench\.html#rsi"/);
  assert.match(html, /Open the instrument/);
});
