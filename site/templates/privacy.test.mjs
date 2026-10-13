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

test('privacy.html ships question-shaped title, speakable, breadcrumbs, and visible FAQ', () => {
  const html = privacy(ctx);
  assert.match(html, /<title>What does SIREN know about you\? Privacy policy/);
  assert.match(html, /What does this site know about you\?/);
  assert.match(html, /"@type"\s*:\s*"WebPage"/);
  assert.match(html, /"@type"\s*:\s*"FAQPage"/);
  assert.match(html, /SpeakableSpecification/);
  assert.match(html, /BreadcrumbList/);
  assert.match(html, /Questions people actually ask/);
  assert.match(html, /Does SIREN sell personal data\?/);
  assert.doesNotMatch(html, /probability of doom is \d/i);
});
