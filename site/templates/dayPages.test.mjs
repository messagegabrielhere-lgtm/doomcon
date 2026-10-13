import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DAY_NEWS_MIN,
  closingReading,
  dayPath,
  indexableDays,
  renderDay,
  renderIndex,
  sitemapEntries,
  storiesForDay,
} from './dayPages.mjs';

function row(t, score, level) {
  return { t, score, level, degraded: false };
}

function story(id, published_at, title = id) {
  return {
    id,
    title,
    pillar: 'capability',
    source: 'hn',
    url: `https://example.test/${id}`,
    published_at,
    score: 40,
    summary: 'A short summary.',
  };
}

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  state: {
    generated_at: '2026-10-13T23:00:00.000Z',
    score: 46.7,
    level: 4,
    level_name: 'ROUTINE',
    pillars: [],
  },
  history: [
    row('2026-10-12T01:00:00.000Z', 48.1, 4),
    row('2026-10-12T22:00:00.000Z', 47.2, 4),
    row('2026-10-13T10:00:00.000Z', 46.9, 4),
  ],
  news: {
    generated_at: '2026-10-13T23:00:00.000Z',
    items: [
      story('a', '2026-10-12T08:00:00Z', 'Story A'),
      story('b', '2026-10-12T18:00:00Z', 'Story B'),
      story('c', '2026-10-13T09:00:00Z', 'Story C'),
    ],
  },
};

describe('dayPages', () => {
  it('closingReading picks the last reading of the UTC day', () => {
    const r = closingReading(ctx, '2026-10-12');
    assert.equal(r.score, 47.2);
    assert.equal(r.count, 2);
  });

  it('storiesForDay filters by UTC date', () => {
    assert.equal(storiesForDay(ctx, '2026-10-12').length, 2);
    assert.equal(storiesForDay(ctx, '2026-10-13').length, 1);
  });

  it('indexableDays returns newest-first days with readings', () => {
    const days = indexableDays(ctx, { now: Date.parse('2026-10-13T23:30:00Z'), window: 30 });
    assert.deepEqual(days, ['2026-10-13', '2026-10-12']);
  });

  it('dayPath is stable', () => {
    assert.equal(dayPath('2026-10-12'), '/day/2026-10-12.html');
  });

  it('renderDay ships head-term title, alerts link, and stories', () => {
    const html = renderDay(ctx, '2026-10-12');
    assert.match(html, /AI activity on 2026-10-12/);
    assert.match(html, /alerts\.html/);
    assert.match(html, /Story A/);
    assert.match(html, /CollectionPage/);
    assert.match(html, /SpeakableSpecification|speakable/);
  });

  it('renderIndex lists days and stays indexable when populated', () => {
    const html = renderIndex(ctx);
    assert.match(html, /AI activity by day/);
    assert.match(html, /2026-10-12/);
    assert.doesNotMatch(html, /noindex/);
  });

  it('sitemapEntries include index and each day', () => {
    const locs = sitemapEntries(ctx).map((e) => e.loc);
    assert.ok(locs.includes('/day/'));
    assert.ok(locs.includes('/day/2026-10-12.html'));
  });

  it(`news-only days need at least ${DAY_NEWS_MIN} stories`, () => {
    const thin = {
      ...ctx,
      history: [],
      state: { generated_at: '2026-09-01T00:00:00Z', score: 40, level: 4, level_name: 'ROUTINE' },
      news: {
        items: [
          story('1', '2026-10-11T01:00:00Z'),
          story('2', '2026-10-11T02:00:00Z'),
        ],
      },
    };
    assert.equal(indexableDays(thin, { now: Date.parse('2026-10-13T00:00:00Z') }).includes('2026-10-11'), false);
    thin.news.items.push(story('3', '2026-10-11T03:00:00Z'));
    assert.ok(indexableDays(thin, { now: Date.parse('2026-10-13T00:00:00Z') }).includes('2026-10-11'));
  });
});
