import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { library, BOOK_COUNT } from './shopPages.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  history: [],
  state: {
    generated_at: '2026-10-13T20:00:00Z',
    score: 47.7,
    level: 4,
    level_name: 'ROUTINE',
    pillars: [],
  },
};

describe('library page', () => {
  it('ships a question-shaped title, speakable CollectionPage, and matching FAQPage', () => {
    const html = library(ctx);
    assert.match(html, /<title>What AI books argue both sides of the case\?/);
    assert.match(html, /<h1 class="bp__h1">What AI books argue both sides of the case\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /Are these paid links\?/);
    assert.match(html, /Does buying a book move the SIREN score\?/);
    assert.match(html, /Is the reading list a doom probability\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"CollectionPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, new RegExp(`These ${BOOK_COUNT} books do take sides`));
    assert.match(html, /does not feed the main number/);
    assert.match(html, /\/bunker-kit\.html/);
    assert.match(html, /\/sponsor\.html/);
    assert.match(html, /What free tools belong in a bunker kit\?/);
    assert.match(html, /How do you sponsor SIREN without moving the number\?/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom/i);
    assert.doesNotMatch(html, /noindex/);
  });

  it('section H2s use questions mirrored in FAQPage', () => {
    const html = library(ctx);
    assert.match(html, /<h2>What is the case for worry\?<\/h2>/);
    assert.match(html, /<h2>What is the case for doubt\?<\/h2>/);
    assert.match(html, /<h2>What is the view from the builders\?<\/h2>/);
    assert.match(html, /<h2>Which books put AI to work\?<\/h2>/);
    assert.match(html, /<h2>What is the long view\?<\/h2>/);
    assert.match(html, /<h2>What gear runs AI at home\?<\/h2>/);
    assert.match(html, /<h2>What are more ways to keep this running\?<\/h2>/);
    assert.doesNotMatch(html, /<h2>The case for worry<\/h2>/);
    assert.doesNotMatch(html, /<h2>Run AI at home<\/h2>/);
    assert.doesNotMatch(html, /<h2>More ways to keep this running<\/h2>/);
    assert.match(html, /"name"\s*:\s*"What is the case for worry\?"/);
    assert.match(html, /"name"\s*:\s*"What gear runs AI at home\?"/);
    assert.doesNotMatch(html, /probability of doom/i);
  });
});
