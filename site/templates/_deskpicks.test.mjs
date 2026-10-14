import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { render, renderV2 } from './_deskpicks.mjs';

const items = [{
  title: 'Example AI headline',
  url: 'https://example.com/story',
  publisher: 'Example',
  published_at: '2026-10-13T12:00:00Z',
  found_on: 'https://reddit.com/r/MachineLearning',
}];

const ctx = {
  href: (p) => p,
  deskPicks: { items },
  news: { generated_at: '2026-10-14T02:00:00Z', items: [] },
  state: { generated_at: '2026-10-14T02:00:00Z' },
};

describe('desk picks module', () => {
  it('classic section H2 uses a question', () => {
    const html = render(ctx);
    assert.match(html, /id="dpick-h">Which stories are desk picks\?<\/h2>/);
    assert.doesNotMatch(html, /id="dpick-h">Desk picks<\/h2>/);
    assert.doesNotMatch(html, /probability of doom/i);
  });

  it('homeV2 section H2 uses a question', () => {
    const html = renderV2(ctx, () => 'DESK PICKS');
    assert.match(html, /id="dpick-h"[^>]*>Which stories are desk picks\?<\/h2>/);
    assert.doesNotMatch(html, /probability of doom/i);
  });
});
