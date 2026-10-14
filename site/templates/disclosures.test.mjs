import assert from 'node:assert/strict';
import { test } from 'node:test';
import { disclosures } from './infoPages.mjs';

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

test('disclosures.html ships question-shaped title, speakable, breadcrumbs, and visible FAQ', () => {
  const html = disclosures(ctx);
  assert.match(html, /<title>What does SIREN disclose\?/);
  assert.match(html, /What does SIREN disclose\?/);
  assert.match(html, /"@type"\s*:\s*"WebPage"/);
  assert.match(html, /"@type"\s*:\s*"FAQPage"/);
  assert.match(html, /SpeakableSpecification/);
  assert.match(html, /BreadcrumbList/);
  assert.match(html, /Questions people actually ask/);
  assert.match(html, /Is SIREN financial or legal advice\?/);
  const lede = html.match(/class="lede">([\s\S]*?)<\/p>/);
  assert.ok(lede, 'expected disclosures lede');
  assert.match(lede[1], /href="\/terms\.html">What are the SIREN terms of use\?<\/a>/);
  assert.match(lede[1], /href="\/privacy\.html">What does SIREN know about you\?<\/a>/);
  assert.doesNotMatch(lede[1], /href="\/terms\.html">terms<\/a>/);
  assert.doesNotMatch(lede[1], /href="\/privacy\.html">privacy<\/a>/);
  assert.doesNotMatch(html, /probability of doom is \d/i);
  assert.doesNotMatch(html, /SIREN.*p\(doom\) of \d/i);
});
