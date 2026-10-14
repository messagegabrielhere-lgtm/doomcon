import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { render } from './_leaderwire.mjs';

const leaders = JSON.parse(readFileSync(new URL('../../data/leaders.json', import.meta.url), 'utf8'));

const ctx = {
  href: (p) => p,
  url: (p) => `https://siren.watch${p}`,
  leaders,
};

describe('leader wire module', () => {
  it('default section H2 uses a question', () => {
    const html = render(ctx);
    assert.match(html, /id="lw-h">Which AI leaders are on the record\?<\/h2>/);
    assert.doesNotMatch(html, /id="lw-h">AI leaders, on the record<\/h2>/);
    assert.doesNotMatch(html, /probability of doom/i);
  });
});
