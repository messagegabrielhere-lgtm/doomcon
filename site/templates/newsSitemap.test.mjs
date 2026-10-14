import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  newsEligible,
  NEWS_WINDOW_HOURS,
  NEWS_SITEMAP_CAP,
  render,
  keywordsFor,
} from './newsSitemap.mjs';

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
  assert.equal(NEWS_SITEMAP_CAP, 200);
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

test('keywordsFor puts AI head terms before pillar/source meta on thin rows', () => {
  const kw = keywordsFor({
    title: 'A thin story with no named lab',
    summary: 'No entity list.',
    pillar: 'attention',
    kind: 'press',
    source: 'bluesky-ai',
    entities: [],
  });
  const parts = kw.split(',').map((s) => s.trim());
  assert.equal(parts[0], 'AI', kw);
  assert.ok(parts.includes('artificial intelligence'), kw);
  assert.ok(parts.includes('SIREN'), kw);
  assert.ok(parts.indexOf('AI') < parts.indexOf('attention'), kw);
  assert.ok(parts.indexOf('AI') < parts.indexOf('bluesky-ai'), kw);
});

test('keywordsFor includes lab surfaces and scored entities', () => {
  const kw = keywordsFor({
    title: 'OpenAI Weighs Deal for Trail of Bits after Gemini 4 Argon ships',
    summary: 'DualEntry benchmark coverage.',
    pillar: 'attention',
    source: 'techmeme',
    entities: ['OpenAI'],
  });
  assert.match(kw, /OpenAI/);
  assert.match(kw, /Trail of Bits/);
  assert.match(kw, /Gemini 4 Argon|Gemini/);
  assert.match(kw, /DualEntry/);
  const parts = kw.split(',').map((s) => s.trim());
  assert.ok(parts.indexOf('AI') < parts.indexOf('attention'), kw);
});

test('render keywords include artificial intelligence head term', () => {
  const xml = render({
    news: {
      items: [{
        id: 'a1',
        title: 'OpenAI ships GPT update',
        published_at: new Date().toISOString(),
        source: 'hn',
        pillar: 'capability',
        entities: ['OpenAI'],
      }],
    },
    url: (p) => `https://siren.watch${p}`,
  });
  assert.match(xml, /<news:keywords>[^<]*OpenAI/);
  assert.match(xml, /artificial intelligence/);
});
