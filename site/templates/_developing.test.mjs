import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { render } from './_developing.mjs';

const ctx = {
  href: (p) => p,
  url: (p) => `https://siren.watch${p}`,
  state: { level: 4, level_name: 'ROUTINE', score: 55.5, generated_at: '2026-10-14T02:00:00Z' },
  news: {
    generated_at: '2026-10-14T02:00:00Z',
    items: [
      {
        id: 'a',
        title: 'Labs ship something',
        url: 'https://example.com/a',
        publisher: 'Example',
        published_at: '2026-10-14T01:30:00Z',
        source: 'hn',
      },
      {
        id: 'b',
        title: 'Same story elsewhere',
        url: 'https://example.com/b',
        publisher: 'Other',
        published_at: '2026-10-14T01:00:00Z',
        source: 'techmeme',
      },
    ],
    stories: [{
      id: 's1',
      lead: 'a',
      members: ['a', 'b'],
      source_count: 3,
      severity: 5,
      first_published_at: '2026-10-14T00:00:00Z',
      last_published_at: '2026-10-14T01:30:00Z',
      severity_terms: [],
      sources: ['hn', 'techmeme', 'press'],
    }],
  },
};

describe('developing module', () => {
  it('section H2 uses a question', () => {
    const html = render(ctx);
    assert.match(html, /id="dv-h">[\s\S]*What story is developing right now\?<\/h2>/);
    assert.doesNotMatch(html, /id="dv-h">[\s\S]*> Developing<\/h2>/);
    assert.doesNotMatch(html, /probability of doom/i);
  });
});
