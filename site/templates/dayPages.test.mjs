import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DAY_INDEX_MIN,
  dayPath,
  indexableDays,
  renderDay,
  sitemapEntries,
} from './dayPages.mjs';

function story(id, day, title = `Story ${id}`) {
  return {
    id,
    title,
    pillar: 'capability',
    source: 'hn',
    url: `https://example.test/${id}`,
    published_at: `${day}T12:00:00Z`,
    score: 40,
  };
}

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  state: { generated_at: '2026-10-10T02:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE', pillars: [] },
  news: {
    generated_at: '2026-10-10T02:00:00Z',
    items: [
      ...Array.from({ length: 5 }, (_, i) => story(`a${i}`, '2026-10-10')),
      story('b1', '2026-10-09'),
      story('b2', '2026-10-09'),
    ],
  },
};

describe('news day hubs', () => {
  it('pages a UTC day only after five scored stories', () => {
    const days = indexableDays(ctx).map((d) => d.day);
    assert.deepEqual(days, ['2026-10-10']);
    assert.equal(DAY_INDEX_MIN, 5);
    assert.equal(dayPath('2026-10-10'), '/news/2026-10-10.html');
    const locs = sitemapEntries(ctx).map((e) => e.loc);
    assert.ok(locs.includes('/news/2026-10-10.html'));
    assert.ok(!locs.includes('/news/2026-10-09.html'));
  });

  it('lists the day\'s stories with CollectionPage schema', () => {
    const html = renderDay(ctx, '2026-10-10');
    assert.match(html, /<title>AI news 2026-10-10/);
    assert.match(html, /CollectionPage/);
    assert.match(html, /Story a0/);
    assert.doesNotMatch(html, /noindex/);
    assert.match(html, /not a forecast and not a probability of harm/);
    assert.doesNotMatch(html, /doom score/i);
  });
});
