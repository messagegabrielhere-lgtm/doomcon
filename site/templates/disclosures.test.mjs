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
  assert.match(html, /What questions do people actually ask\?/);
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

test('disclosures.html section H2s use questions mirrored in FAQPage', () => {
  const html = disclosures(ctx);
  assert.match(html, /<h2>What is the SIREN index, and what is it not\?<\/h2>/);
  assert.match(html, /<h2>What does SIREN disclose about finance and markets\?<\/h2>/);
  assert.match(html, /<h2>What affiliate and paid links does this site use\?<\/h2>/);
  assert.match(html, /<h2>What does this page say about privacy and analytics\?<\/h2>/);
  assert.match(html, /<h2>Which pages are satire or jokes\?<\/h2>/);
  assert.match(html, /<h2>How are people and likenesses handled\?<\/h2>/);
  assert.match(html, /<h2>What licence covers SIREN\?<\/h2>/);
  assert.match(html, /<h2>How do you contact SIREN about disclosures\?<\/h2>/);
  assert.doesNotMatch(html, /<h2>What the index is<\/h2>/);
  assert.doesNotMatch(html, /<h2>Finance and markets<\/h2>/);
  assert.doesNotMatch(html, /<h2>Affiliate and paid links<\/h2>/);
  assert.doesNotMatch(html, /<h2>Privacy and analytics<\/h2>/);
  assert.doesNotMatch(html, /<h2>Satire and jokes<\/h2>/);
  assert.doesNotMatch(html, /<h2>People and likenesses<\/h2>/);
  assert.doesNotMatch(html, /<h2>Licence<\/h2>/);
  assert.doesNotMatch(html, /<h2>Contact<\/h2>/);
  assert.match(html, /"name"\s*:\s*"What is the SIREN index, and what is it not\?"/);
  assert.match(html, /"name"\s*:\s*"What licence covers SIREN\?"/);
  assert.match(html, /"name"\s*:\s*"How do you contact SIREN about disclosures\?"/);
  assert.doesNotMatch(html, /probability of doom is \d/i);
});
