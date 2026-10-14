import assert from 'node:assert/strict';
import { test } from 'node:test';
import { privacy } from './infoPages.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  state: {
    level: 4,
    level_name: 'ROUTINE',
    score: 55.5,
    generated_at: '2026-10-10T03:15:00.000Z',
    receipt_id: 'r1',
  },
  cardFor: () => null,
};

test('privacy.html ships matching question H1, speakable, breadcrumbs, and visible FAQ', () => {
  const html = privacy(ctx);
  assert.match(html, /<title>What does SIREN know about you\? Privacy policy/);
  assert.match(html, /<h1 class="bp__h1">What does SIREN know about you\?<\/h1>/);
  assert.doesNotMatch(html, /What does this site know about you\?/);
  assert.match(html, /"@type"\s*:\s*"WebPage"/);
  assert.match(html, /"@type"\s*:\s*"FAQPage"/);
  assert.match(html, /SpeakableSpecification/);
  assert.match(html, /BreadcrumbList/);
  assert.match(html, /Questions people actually ask/);
  assert.match(html, /Does SIREN sell personal data\?/);
  assert.match(html, /\/about\.html/);
  assert.match(html, /What is SIREN\?/);
  assert.match(html, /\/disclosures\.html/);
  assert.match(html, /href="\/feedback\.html">How do I report a problem or send an idea to SIREN\?<\/a>/);
  assert.doesNotMatch(html, /href="\/feedback\.html">feedback form<\/a>/);
  assert.doesNotMatch(html, /probability of doom is \d/i);
  assert.doesNotMatch(html, /noindex/);
});

test('privacy.html section H2s use questions mirrored in FAQPage', () => {
  const html = privacy(ctx);
  assert.match(html, /<h2>Who is responsible for SIREN privacy\?<\/h2>/);
  assert.match(html, /<h2>What does the site itself do with a visit\?<\/h2>/);
  assert.match(html, /<h2>How do California and similar privacy laws apply\?<\/h2>/);
  assert.match(html, /<h2>What rights do you have under EU, UK and similar laws\?<\/h2>/);
  assert.match(html, /<h2>Is the site directed at children\?<\/h2>/);
  assert.match(html, /<h2>Which third parties does a visit touch\?<\/h2>/);
  assert.match(html, /<h2>How long is visit data retained\?<\/h2>/);
  assert.match(html, /<h2>Do the embed and the badge track visitors\?<\/h2>/);
  assert.match(html, /<h2>How do you contact SIREN about privacy\?<\/h2>/);
  assert.doesNotMatch(html, /<h2>Who is responsible<\/h2>/);
  assert.doesNotMatch(html, /<h2>What the site itself does<\/h2>/);
  assert.doesNotMatch(html, /<h2>California and similar privacy laws<\/h2>/);
  assert.doesNotMatch(html, /<h2>Your rights \(EU\/UK and elsewhere\)<\/h2>/);
  assert.doesNotMatch(html, /<h2>Children<\/h2>/);
  assert.doesNotMatch(html, /<h2>Third parties a visit touches<\/h2>/);
  assert.doesNotMatch(html, /<h2>Retention<\/h2>/);
  assert.doesNotMatch(html, /<h2>The embed and the badge<\/h2>/);
  assert.doesNotMatch(html, /<h2>Contact<\/h2>/);
  assert.match(html, /"name"\s*:\s*"Who is responsible for SIREN privacy\?"/);
  assert.match(html, /"name"\s*:\s*"What does the site itself do with a visit\?"/);
  assert.match(html, /"name"\s*:\s*"Do the embed and the badge track visitors\?"/);
  assert.match(html, /"name"\s*:\s*"How do you contact SIREN about privacy\?"/);
  assert.doesNotMatch(html, /probability of doom is \d/i);
});
