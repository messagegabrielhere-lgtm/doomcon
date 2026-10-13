import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { tally } from './agentPages.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  state: { generated_at: '2026-10-13T15:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE' },
};

describe('tally page SEO', () => {
  it('ships a question-shaped title, speakable WebPage, and matching FAQPage', () => {
    const html = tally(ctx);
    assert.match(html, /<title>Who is Tally, the SIREN duty canary\?/);
    assert.match(html, /<h1 class="bp__h1">Who is Tally, the SIREN duty canary\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /What do the five moods mean\?/);
    assert.match(html, /Where does Tally work on the site\?/);
    assert.match(html, /Can I use Tally in my own posts\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"WebPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/desk\.html/);
    assert.match(html, /\/bets\.html/);
    assert.match(html, /What unserious counts does SIREN keep on Tally.s desk\?/);
    assert.match(html, /Does the SIREN index make forecasts\?/);
    assert.match(html, /never how bad/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /doom oracle|probability of doom/i);
    assert.doesNotMatch(html, /mood means severity|how bad AI is/i);
    assert.doesNotMatch(html, /noindex/);
  });
});
