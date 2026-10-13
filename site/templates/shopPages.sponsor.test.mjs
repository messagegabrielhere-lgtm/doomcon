import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sponsor } from './shopPages.mjs';

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

describe('sponsor page', () => {
  it('ships a question-shaped title, speakable WebPage, and matching FAQPage', () => {
    const html = sponsor(ctx);
    assert.match(html, /<title>How do you sponsor SIREN without moving the number\?/);
    assert.match(html, /<h1 class="bp__h1">How do you sponsor SIREN without moving the number\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /What does a sponsor get\?/);
    assert.match(html, /What does a sponsor not get\?/);
    assert.match(html, /Does sponsorship turn SIREN into a doom forecast\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"WebPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /no say over the number/);
    assert.match(html, /No influence on the number/);
    assert.match(html, /\/library\.html/);
    assert.match(html, /\/about\.html/);
    assert.match(html, /What AI books argue both sides of the case\?/);
    assert.match(html, /What is SIREN, and who is behind it\?/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom/i);
    assert.doesNotMatch(html, /noindex/);
  });
});
