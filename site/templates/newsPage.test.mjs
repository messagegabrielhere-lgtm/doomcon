import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { render, hasNews } from './newsPage.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  state: { generated_at: '2026-10-14T18:00:00Z', score: 55.5, level: 4, level_name: 'ROUTINE', receipt_id: 'r1' },
  news: {
    generated_at: '2026-10-14T18:00:00Z',
    items: [
      {
        id: 'a1',
        title: 'OpenAI ships a model',
        url: 'https://example.com/a1',
        source: 'hn',
        pillar: 'capability',
        score: 80,
        rank: 1,
        published_at: '2026-10-14T12:00:00Z',
        anchor: 'a1',
      },
      {
        id: 'a2',
        title: 'Anthropic updates Claude',
        url: 'https://example.com/a2',
        source: 'techmeme',
        pillar: 'attention',
        score: 70,
        rank: 2,
        published_at: '2026-10-14T11:00:00Z',
        anchor: 'a2',
      },
    ],
    total: 2,
    byPillar: { capability: 1, attention: 1, compute: 0, markets: 0, governance: 0 },
    sources: [],
  },
};

describe('newsroom page SEO', () => {
  it('ships a question-shaped title, H1, FAQPage, and speakable CollectionPage', () => {
    assert.equal(hasNews(ctx), true);
    const html = render(ctx);
    assert.match(html, /<title>Which AI stories has SIREN scored in this window\?/);
    assert.match(html, /<h1 class="narch__h1">Which AI stories has SIREN scored in this window\?<\/h1>/);
    assert.match(html, /Which items scored highest in this window\?/);
    assert.match(html, /How are the scores spread in this window\?/);
    assert.match(html, /Which scored items are in this window\?/);
    assert.match(html, /Where did these scored stories come from\?/);
    assert.match(html, /How do you filter the scored list\?/);
    assert.match(html, /Does SIREN publish a newsroom doom score\?/);
    assert.match(html, /FAQPage/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /"@type":\s*"CollectionPage"/);
    assert.doesNotMatch(html, /<title>The newsroom/);
    assert.doesNotMatch(html, /<h1 class="narch__h1">The newsroom<\/h1>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
  });
});
