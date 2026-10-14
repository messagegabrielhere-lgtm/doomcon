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
