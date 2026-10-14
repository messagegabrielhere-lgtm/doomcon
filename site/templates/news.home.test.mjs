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

  it('signal reel H2 uses a question', () => {
    const html = render(ctx);
    assert.match(html, /id="reel-h">What is today(?:'|&#39;|&apos;)s signal\?<\/h2>/);
    assert.doesNotMatch(html, /id="reel-h">Today(?:'|&#39;|&apos;)s signal<\/h2>/);
    assert.doesNotMatch(html, /probability of doom/i);
  });

  it('signal feed H2 uses a question', () => {
    const html = render(ctx);
    assert.match(html, /id="news-h">What is the signal feed\?<\/h2>/);
    assert.doesNotMatch(html, /id="news-h">Signal feed<\/h2>/);
    assert.doesNotMatch(html, /probability of doom/i);
  });
});
