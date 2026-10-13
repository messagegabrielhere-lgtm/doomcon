import assert from 'node:assert/strict';
import { test } from 'node:test';
import { about } from './infoPages.mjs';

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

test('about.html ships question-shaped title, speakable, breadcrumbs, and visible FAQ', () => {
  const html = about(ctx);
  assert.match(html, /<title>What is SIREN\? An independent AI activity index/);
  assert.match(html, /What is SIREN, and who is behind it\?/);
  assert.match(html, /"@type"\s*:\s*"WebPage"/);
  assert.match(html, /"@type"\s*:\s*"FAQPage"/);
  assert.match(html, /SpeakableSpecification/);
  assert.match(html, /BreadcrumbList/);
  assert.match(html, /Questions people actually ask/);
  assert.match(html, /Who runs SIREN\?/);
  assert.doesNotMatch(html, /probability of doom is \d/i);
  assert.doesNotMatch(html, /SIREN.*p\(doom\) of \d/i);
});
