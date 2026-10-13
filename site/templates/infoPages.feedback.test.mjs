import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { feedback } from './infoPages.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  state: {
    generated_at: '2026-10-13T20:00:00Z',
    score: 47.7,
    level: 4,
    level_name: 'ROUTINE',
  },
};

describe('feedback page', () => {
  it('ships a question-shaped title, speakable WebPage, and matching FAQPage', () => {
    const html = feedback(ctx);
    assert.match(html, /<title>How do I report a problem or send an idea to SIREN\?/);
    assert.match(html, /<h1 class="bp__h1">How do I report a problem or send an idea to SIREN\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /Does this site store my feedback\?/);
    assert.match(html, /Are feedback issues public\?/);
    assert.match(html, /What kinds of reports can I send\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"WebPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /Nothing is sent to or stored by this site/);
    assert.match(html, /\/about\.html/);
    assert.match(html, /\/privacy\.html/);
    assert.match(html, /What is SIREN, and who is behind it\?/);
    assert.match(html, /What does this site know about you\?/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom/i);
    assert.doesNotMatch(html, /noindex/);
  });
});
