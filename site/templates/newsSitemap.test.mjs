import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newsEligible, NEWS_WINDOW_HOURS, NEWS_SITEMAP_CAP, render } from './newsSitemap.mjs';

test('newsEligible keeps only items inside the rolling window', () => {
  const now = Date.parse('2026-10-08T12:00:00Z');
  const ctx = {
    news: {
      items: [
        { id: 'new', title: 'Fresh', published_at: '2026-10-08T10:00:00Z', source: 'hn', pillar: 'attention' },
        { id: 'old', title: 'Stale', published_at: '2026-10-05T10:00:00Z', source: 'hn', pillar: 'attention' },
        { id: 'mid', title: 'Mid', published_at: '2026-10-07T01:00:00Z', source: 'arxiv', pillar: 'capability' },
      ],
    },
    url: (p) => `https://example.test${p}`,
  };
  const rows = newsEligible(ctx, now);
  assert.equal(NEWS_WINDOW_HOURS, 48);
  assert.deepEqual(rows.map((r) => r.it.id), ['new', 'mid']);
});

test('newsEligible caps and sorts newest first', () => {
  const now = Date.parse('2026-10-08T12:00:00Z');
  const items = Array.from({ length: NEWS_SITEMAP_CAP + 20 }, (_, i) => ({
    id: `i${i}`,
    title: `T${i}`,
    published_at: new Date(now - i * 60_000).toISOString(),
    source: 'hn',
  }));
  const rows = newsEligible({ news: { items } }, now);
  assert.equal(rows.length, NEWS_SITEMAP_CAP);
  assert.equal(rows[0].it.id, 'i0');
  assert.equal(rows[NEWS_SITEMAP_CAP - 1].it.id, `i${NEWS_SITEMAP_CAP - 1}`);
});

test('render emits a valid empty news sitemap when nothing is fresh', () => {
  const xml = render({
    news: { items: [{ id: 'old', title: 'Old', published_at: '2020-01-01T00:00:00Z' }] },
    url: (p) => `https://example.test${p}`,
  });
  assert.match(xml, /xmlns:news=/);
  assert.doesNotMatch(xml, /<url>/);
});
