import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { exportPage } from './extrasPages.mjs';

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

describe('export page', () => {
  it('ships a question-shaped title, speakable WebPage, and matching FAQPage', () => {
    const html = exportPage(ctx);
    assert.match(html, /<title>How do I export and embed SIREN data\?/);
    assert.match(html, /<h1>How do I export and embed SIREN data\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /What files can I download\?/);
    assert.match(html, /Do I need an API key\?/);
    assert.match(html, /Does exporting move the SIREN score\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"WebPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /No key, no rate limit/);
    assert.match(html, /never moves the SIREN score/);
    assert.match(html, /\/alerts\.html/);
    assert.match(html, /\/agents\.html/);
    assert.match(html, /How do I get alerts when SIREN moves\?/);
    assert.match(html, /How should AI agents use SIREN\?/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom/i);
    assert.doesNotMatch(html, /noindex/);
  });
});
