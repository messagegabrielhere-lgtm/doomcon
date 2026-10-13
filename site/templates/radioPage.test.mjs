import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { radio } from './mediaPages.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  state: { generated_at: '2026-10-13T15:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE' },
};

describe('radio page', () => {
  it('ships a question-shaped title, speakable WebPage, and matching FAQPage', () => {
    const html = radio(ctx, null);
    assert.match(html, /<title>What free music does SIREN Radio play\?/);
    assert.match(html, /<h1 class="bp__h1">What free music does SIREN Radio play\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /Are there audio files, ads or licence fees\?/);
    assert.match(html, /How do I change stations\?/);
    assert.match(html, /Where can I hear these stations in videos\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"WebPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/games\.html/);
    assert.match(html, /No audio files, no ads/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /Radio feeds the index/i);
    assert.doesNotMatch(html, /probability of doom/i);
    assert.doesNotMatch(html, /noindex/);
  });
});
