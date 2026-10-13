import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { render } from './gamesPage.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  state: { generated_at: '2026-10-13T15:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE' },
};

describe('games page', () => {
  it('ships a question-shaped title, speakable CollectionPage, and matching FAQPage', () => {
    const html = render(ctx);
    assert.match(html, /<title>What free AI games can you play on SIREN\?/);
    assert.match(html, /<h1 class="bp__h1">What free AI games can you play on SIREN\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /Do I need an account or install\?/);
    assert.match(html, /Where is Containment\?/);
    assert.match(html, /Is there music while you play\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"CollectionPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/contain\.html/);
    assert.match(html, /\/day-after\.html/);
    assert.match(html, /No sign-up/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /games (are|as) (a )?forecast/i);
    assert.doesNotMatch(html, /how to cause a takeover/i);
    assert.doesNotMatch(html, /probability of doom/i);
    assert.doesNotMatch(html, /noindex/);
  });
});
