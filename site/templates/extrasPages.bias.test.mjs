import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { biasPage } from './extrasPages.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  history: [{ t: 1 }, { t: 2 }],
  state: {
    generated_at: '2026-10-13T20:00:00Z',
    score: 47.7,
    level: 4,
    level_name: 'ROUTINE',
    pillars: [],
  },
};

describe('bias page', () => {
  it('ships a question-shaped title, speakable WebPage, and matching FAQPage', () => {
    const html = biasPage(ctx);
    assert.match(html, /<title>What can SIREN not see\?/);
    assert.match(html, /<h1>What can SIREN not see\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /What does that skew\?/);
    assert.match(html, /How do new sources get into the score\?/);
    assert.match(html, /Is the biased reading a doom probability\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"WebPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /almost everything SIREN counts is published in English/);
    assert.match(html, /uncalibrated/);
    assert.match(html, /\/methodology\.html/);
    assert.match(html, /\/feedback\.html/);
    assert.match(html, /How the SIREN AI activity index is computed · methodology/);
    assert.match(html, /How do I report a problem or send an idea to SIREN\?/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom/i);
    assert.doesNotMatch(html, /noindex/);
  });
});
