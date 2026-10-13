import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { videos } from './mediaPages.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  state: { generated_at: '2026-10-13T15:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE' },
};

describe('videos page', () => {
  it('ships a question-shaped title, speakable CollectionPage, and matching FAQPage', () => {
    const html = videos(ctx);
    assert.match(html, /<title>What free AI explainer videos does SIREN publish\?/);
    assert.match(html, /<h1 class="bp__h1">What free AI explainer videos does SIREN publish\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /Do the videos work on mute\?/);
    assert.match(html, /Can I share them\?/);
    assert.match(html, /Where is the soundtrack music\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"CollectionPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /VideoObject/);
    assert.match(html, /\/radio\.html/);
    assert.match(html, /work on mute/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /videos (are|as) (a )?forecast/i);
    assert.doesNotMatch(html, /probability of doom/i);
    assert.doesNotMatch(html, /noindex/);
  });
});
