import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { render } from './news.mjs';

const news = JSON.parse(readFileSync(new URL('../../data/news.json', import.meta.url), 'utf8'));

const ctx = {
  href: (p) => p,
  news,
  state: {},
};

describe('homepage news module', () => {
  it('reel and feed more-links use the newsroom question H1', () => {
    const html = render(ctx);
    assert.match(html, /class="reel__more"[^>]*>Which AI stories has SIREN scored in this window\?<\/a>/);
    assert.match(html, /class="nkey nkey--more">\s*<a href="\/news\.html">Which AI stories has SIREN scored in this window\?<\/a>/);
    assert.doesNotMatch(html, /All \d+ items in the window/);
    assert.doesNotMatch(html, /class="reel__more"[^>]*>All \d+ items/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom/i);
  });
});
