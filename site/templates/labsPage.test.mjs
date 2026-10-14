import { test, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LABS, currentWeek, render } from './labsPage.mjs';

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

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  state: { generated_at: '2026-10-14T15:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE' },
};

describe('labs page SEO', () => {
  it('ships question-shaped experiment H3s mirrored in FAQPage', () => {
    const html = render(ctx, Date.parse('2026-10-14T15:00:00Z'));
    const week0 = LABS.weeks[0];
    for (const it of week0.items) {
      assert.match(html, new RegExp(`<h3>${it.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<\\/h3>`));
      assert.match(html, new RegExp(`FAQPage[\\s\\S]*${it.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
      assert.doesNotMatch(html, new RegExp(`<h3>${it.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<\\/h3>`));
    }
    assert.match(html, /How much of the code that builds AI is now written by AI\?/);
    assert.match(html, /We don.t say when SI arrives/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom/i);
    assert.doesNotMatch(html, /SI arrives on|arrival date/i);
  });
});
