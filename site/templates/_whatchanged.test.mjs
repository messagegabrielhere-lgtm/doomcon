import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { render } from './_whatchanged.mjs';

const digest = JSON.parse(readFileSync(new URL('../../data/digest.json', import.meta.url), 'utf8'));

const ctx = {
  href: (p) => p,
  digest,
};

describe('what-changed strip', () => {
  it('more-link uses the digest question H1', () => {
    const html = render(ctx);
    assert.match(html, /class="wc__more"><a href="\/digest\.html">What is the SIREN daily brief\?<\/a>/);
    assert.doesNotMatch(html, /The full brief, the streaks and the per-lab rollups/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom/i);
  });

  it('section H2 uses a question', () => {
    const html = render(ctx);
    assert.match(html, /id="wc-h">What changed since the last reading\?<\/h2>/);
    assert.doesNotMatch(html, /id="wc-h">What changed<\/h2>/);
    assert.doesNotMatch(html, /probability of doom/i);
  });
});
