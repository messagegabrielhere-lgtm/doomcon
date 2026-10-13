import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { render, hasNews } from './newsPage.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  state: {
    generated_at: '2026-10-13T02:00:00Z',
    score: 49.1,
    level: 4,
    level_name: 'ROUTINE',
    receipt_id: 'r1',
    pillars: [],
  },
  news: {
    generated_at: '2026-10-13T02:00:00Z',
    total: 3,
    items: [
      {
        id: 'a1',
        anchor: 'a1',
        rank: 1,
        title: 'OpenAI ships a model',
        summary: '',
        source: 'hn',
        pillar: 'capability',
        url: 'https://example.test/a1',
        published_at: '2026-10-12T12:00:00Z',
        score: 50,
      },
      {
        id: 'a2',
        anchor: 'a2',
        rank: 2,
        title: 'Anthropic updates Claude',
        summary: '',
        source: 'reuters',
        pillar: 'attention',
        url: 'https://example.test/a2',
        published_at: '2026-10-12T11:00:00Z',
        score: 40,
      },
      {
        id: 'a3',
        anchor: 'a3',
        rank: 3,
        title: 'Microsoft Maia 300 chip',
        summary: '',
        source: 'gnews-ai',
        pillar: 'compute',
        url: 'https://example.test/a3',
        published_at: '2026-10-11T10:00:00Z',
        score: 39,
      },
    ],
    sources: [],
  },
};

describe('newsroom page', () => {
  it('guards builds without news', () => {
    assert.equal(hasNews(ctx), true);
    assert.equal(hasNews({}), false);
  });

  it('ships question-shaped title, speakable, and visible FAQ matching schema', () => {
    const html = render(ctx);
    assert.match(html, /<title>Which AI stories has SIREN scored in this window\?/);
    assert.match(html, /<h1 class="narch__h1">Which AI stories has SIREN scored in this window\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /"@type"\s*:\s*"FAQPage"/);
    assert.match(html, /speakable/);
    assert.match(html, /CollectionPage/);
    assert.match(html, /Does SIREN publish a newsroom doom score\?/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.match(html, /OpenAI ships a model/);
  });
});
