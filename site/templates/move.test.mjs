import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { render } from './move.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  state: {
    generated_at: '2026-10-13T12:00:00Z',
    score: 48.2,
    level: 4,
    level_name: 'ROUTINE',
  },
};

const baseMove = {
  id: '2026-10-13T12-00-00Z',
  generated_at: '2026-10-13T12:00:00Z',
  score: 48.2,
  previous_score: 47.5,
  level: 4,
  previous_level: 4,
  level_name: 'ROUTINE',
  level_changed: false,
  delta: 0.7,
  indexable: true,
  receipt: { id: 'r1', sources: [], pillars: [], rule_fired: 'none', engine_version: '1', hash: 'h', prev_hash: 'p' },
  contributors: [],
};

describe('move page', () => {
  it('superseded stamp links home with the live title question', () => {
    const html = render(ctx, { ...baseMove, newer: true });
    assert.match(html, /class="bstamp bstamp--old"><a href="\/">AI activity index today · AI activity level today · SIREN<\/a>/);
    assert.doesNotMatch(html, /Superseded · current reading/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom/i);
  });

  it('section H2s use questions mirrored in FAQPage', () => {
    const html = render(ctx, baseMove);
    assert.match(html, /<h2 id="pillars">Which pillars scored at this observation\?<\/h2>/);
    assert.match(html, /<h2 id="inputs">Which inputs did the engine see\?<\/h2>/);
    assert.match(html, /<h2 id="receipt">What is the receipt for this observation\?<\/h2>/);
    assert.doesNotMatch(html, /<h2 id="pillars">Pillars at this observation<\/h2>/);
    assert.doesNotMatch(html, /<h2 id="inputs">Inputs<\/h2>/);
    assert.doesNotMatch(html, /<h2 id="receipt">Receipt<\/h2>/);
    assert.match(html, /"@type"\s*:\s*"FAQPage"/);
    assert.match(html, /"name"\s*:\s*"Which pillars scored at this observation\?"/);
    assert.match(html, /"name"\s*:\s*"What is the receipt for this observation\?"/);
    assert.match(html, /Does this move mean a doom probability\?/);
    assert.doesNotMatch(html, /probability of doom is \d/i);
  });
});
