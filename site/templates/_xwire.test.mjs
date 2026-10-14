import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { render } from './_xwire.mjs';

const ctx = {
  href: (p) => p,
  x: {
    generated_at: '2026-10-14T02:00:00Z',
    items: [{
      url: 'https://x.com/openai/status/1',
      author_handle: 'openai',
      author_name: 'OpenAI',
      author_url: 'https://x.com/openai',
      posted_at: '2026-10-14T01:00:00Z',
      text: 'A post about models.',
      official: true,
      cited_by: [{ label: 'Techmeme', source: 'techmeme' }],
    }],
  },
};

describe('X wire module', () => {
  it('section H2 uses a question', () => {
    const html = render(ctx);
    assert.match(html, /id="xw-h">Which labs’ posts are on the X wire\?<span/);
    assert.doesNotMatch(html, /id="xw-h">The labs’ posts on X/);
    assert.doesNotMatch(html, /probability of doom/i);
  });
});
