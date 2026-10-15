import assert from 'node:assert/strict';
import { test } from 'node:test';
import { render } from './feed.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p.startsWith('/') ? p : `/${p}`}`,
  state: { generated_at: '2026-10-15T01:00:00Z' },
  moves: [{
    id: '2026-10-15T01-00-00Z',
    indexable: true,
    level_changed: false,
    level: 4,
    level_name: 'ROUTINE',
    previous_level: 4,
    score: 55.4,
    previous_score: 54.0,
    delta: 1.4,
    generated_at: '2026-10-15T01:00:00Z',
  }],
};

test('feed.xml tip comments advertise free-tools, verify, news-sitemap, Search Trends', () => {
  const xml = render(ctx);
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<!--[^>]*Free tools: https:\/\/siren\.watch\/free-tools\.html/);
  assert.match(xml, /<!--[^>]*Verify a reading: https:\/\/siren\.watch\/verify\.html/);
  assert.match(xml, /<!--[^>]*News sitemap: https:\/\/siren\.watch\/news-sitemap\.xml/);
  assert.match(xml, /<!--[^>]*Search Trends: https:\/\/siren\.watch\/search-trends\.html/);
  assert.match(xml, /<!--[^>]*llms\.txt/);
  assert.match(xml, /not doom probability/i);
  assert.doesNotMatch(xml, /probability of doom/i);
  assert.match(xml, /<rss version="2\.0"/);
});

test('feed-level.xml keeps the same discovery tips', () => {
  const xml = render(ctx, { levelOnly: true });
  assert.match(xml, /Free tools: https:\/\/siren\.watch\/free-tools\.html/);
  assert.match(xml, /level changes only/);
});
