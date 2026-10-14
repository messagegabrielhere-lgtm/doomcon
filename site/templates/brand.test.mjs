import assert from 'node:assert/strict';
import { test } from 'node:test';
import { brandPage } from './infoPages.mjs';

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
  history: [{ level: 4 }, { level: 4 }],
  cardFor: () => null,
};

test('brand.html ships question-shaped title, speakable, breadcrumbs, and visible FAQ', () => {
  const html = brandPage(ctx);
  assert.match(html, /<title>Where is the SIREN brand guide\?/);
  assert.match(html, /Where is the SIREN brand guide\?/);
  assert.match(html, /"@type"\s*:\s*"WebPage"/);
  assert.match(html, /"@type"\s*:\s*"FAQPage"/);
  assert.match(html, /SpeakableSpecification/);
  assert.match(html, /BreadcrumbList/);
  assert.match(html, /What questions do people actually ask\?/);
  assert.match(html, /Who is Tally\?/);
  assert.doesNotMatch(html, /probability of doom is \d/i);
  assert.doesNotMatch(html, /SIREN.*p\(doom\) of \d/i);
});

test('brand.html section H2s use questions mirrored in FAQPage', () => {
  const html = brandPage(ctx);
  assert.match(html, /<h2>What is the SIREN brand idea\?<\/h2>/);
  assert.match(html, /<h2>How should the SIREN name be written\?<\/h2>/);
  assert.match(html, /<h2>Who is Tally, the duty canary\?<\/h2>/);
  assert.match(html, /<h2>What colours does the brand use\?<\/h2>/);
  assert.match(html, /<h2>What typefaces does the brand use\?<\/h2>/);
  assert.match(html, /<h2>What is the brand voice\?<\/h2>/);
  assert.match(html, /<h2>Which brand files can you download\?<\/h2>/);
  assert.doesNotMatch(html, /<h2>The idea<\/h2>/);
  assert.doesNotMatch(html, /<h2>The name<\/h2>/);
  assert.doesNotMatch(html, /<h2>Tally, the duty canary<\/h2>/);
  assert.doesNotMatch(html, /<h2>Colour<\/h2>/);
  assert.doesNotMatch(html, /<h2>Type<\/h2>/);
  assert.doesNotMatch(html, /<h2>Voice<\/h2>/);
  assert.doesNotMatch(html, /<h2>Files<\/h2>/);
  assert.match(html, /"name"\s*:\s*"What is the SIREN brand idea\?"/);
  assert.match(html, /"name"\s*:\s*"What is the brand voice\?"/);
  assert.doesNotMatch(html, /probability of doom is \d/i);
});
