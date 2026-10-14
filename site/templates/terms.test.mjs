import assert from 'node:assert/strict';
import { test } from 'node:test';
import { terms } from './infoPages.mjs';

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

test('terms.html ships question-shaped title, speakable, breadcrumbs, and visible FAQ', () => {
  const html = terms(ctx);
  assert.match(html, /<title>What are the SIREN terms of use\?/);
  assert.match(html, /What are the SIREN terms of use\?/);
  assert.match(html, /"@type"\s*:\s*"WebPage"/);
  assert.match(html, /"@type"\s*:\s*"FAQPage"/);
  assert.match(html, /SpeakableSpecification/);
  assert.match(html, /BreadcrumbList/);
  assert.match(html, /Questions people actually ask/);
  assert.match(html, /Does SIREN predict the future or measure danger\?/);
  assert.match(html, /href="\/disclosures\.html">What does SIREN disclose\?<\/a>/);
  assert.match(html, /href="\/privacy\.html">What does SIREN know about you\?<\/a>/);
  assert.doesNotMatch(html, /href="\/disclosures\.html">disclosures<\/a>/);
  assert.doesNotMatch(html, /href="\/privacy\.html">privacy page<\/a>/);
  assert.doesNotMatch(html, /probability of doom is \d/i);
  assert.doesNotMatch(html, /SIREN.*p\(doom\) of \d/i);
});

test('terms.html section H2s use questions mirrored in FAQPage', () => {
  const html = terms(ctx);
  assert.match(html, /<h2>1\. Is SIREN information and entertainment only\?<\/h2>/);
  assert.match(html, /<h2>2\. What is the index, and what is it not\?<\/h2>/);
  assert.match(html, /<h2>3\. Is SIREN financial or investment advice\?<\/h2>/);
  assert.match(html, /<h2>4\. What do the security, surveillance and safety pages cover\?<\/h2>/);
  assert.match(html, /<h2>9\. Is there any warranty\?<\/h2>/);
  assert.match(html, /<h2>16\. How do changes, severability and your rights work\?<\/h2>/);
  assert.doesNotMatch(html, /<h2>1\. Information and entertainment only<\/h2>/);
  assert.doesNotMatch(html, /<h2>2\. What the index is, and is not<\/h2>/);
  assert.doesNotMatch(html, /<h2>9\. No warranty<\/h2>/);
  assert.doesNotMatch(html, /<h2>10\. Limitation of liability<\/h2>/);
  assert.match(html, /"name"\s*:\s*"1\. Is SIREN information and entertainment only\?"/);
  assert.match(html, /"name"\s*:\s*"16\. How do changes, severability and your rights work\?"/);
  assert.doesNotMatch(html, /probability of doom is \d/i);
});
