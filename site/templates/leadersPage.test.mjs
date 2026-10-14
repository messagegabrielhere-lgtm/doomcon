import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { render, hasLeaders } from './leadersPage.mjs';

const leaders = JSON.parse(readFileSync(new URL('../../data/leaders.json', import.meta.url), 'utf8'));

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
  leaders,
};

describe('leaders page', () => {
  it('guards builds without a leader wire', () => {
    assert.equal(hasLeaders(ctx), true);
    assert.equal(hasLeaders({}), false);
  });

  it('ships question-shaped title, speakable, and visible FAQ matching schema', () => {
    const html = render(ctx);
    assert.match(html, /<title>Which AI leaders are on the record this week\?/);
    assert.match(html, /<h1 class="lwp__h1">Which AI leaders are on the record this week\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /"@type"\s*:\s*"FAQPage"/);
    assert.match(html, /speakable/);
    assert.match(html, /CollectionPage/);
    assert.match(html, /Does SIREN invent quotations for AI leaders\?/);
    assert.match(html, /never writes a quotation/i);
    assert.match(html, /lwc__n" href="\/people\/altman\.html">What press has SIREN scored about Sam Altman\?<\/a>/);
    assert.match(html, /lwc__n" href="\/people\/amodei\.html">What press has SIREN scored about Dario Amodei\?<\/a>/);
    assert.doesNotMatch(html, /lwc__n" href="\/people\/altman\.html">Sam Altman<\/a>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
  });
});
