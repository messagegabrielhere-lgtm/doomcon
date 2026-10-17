import assert from 'node:assert/strict';
import { test } from 'node:test';
import { press } from './infoPages.mjs';

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

test('press.html ships question-shaped title, speakable, breadcrumbs, and visible FAQ', () => {
  const html = press(ctx);
  assert.match(html, /<title>Where is the SIREN press kit\?/);
  assert.match(html, /Where is the SIREN press kit\?/);
  assert.match(html, /"@type"\s*:\s*"WebPage"/);
  assert.match(html, /"@type"\s*:\s*"FAQPage"/);
  assert.match(html, /SpeakableSpecification/);
  assert.match(html, /BreadcrumbList/);
  assert.match(html, /What questions do people actually ask\?/);
  assert.match(html, /How do I cite a SIREN reading\?/);
  assert.match(html, /href="\/methodology\.html">How the SIREN AI activity index is computed · methodology<\/a>/);
  assert.match(html, /href="\/instruments\.html#embed">What instruments sit behind the SIREN reading\?<\/a>/);
  assert.doesNotMatch(html, /href="\/methodology\.html">method<\/a>/);
  assert.doesNotMatch(html, /href="\/instruments\.html#embed">instruments page<\/a>/);
  const facts = html.match(/<h2>What are the key SIREN facts\?<\/h2>\s*<ul>([\s\S]*?)<\/ul>/);
  assert.ok(facts, 'expected press Facts list');
  // FINDABILITY #469 — Current reading CTA names both head terms.
  assert.match(facts[1], /href="\/">AI activity index today · AI activity level today · SIREN<\/a>/);
  assert.doesNotMatch(facts[1], /href="\/">Live page<\/a>/);
  assert.match(facts[1], /href="\/moves\/">Where are the SIREN index moves\?<\/a>/);
  assert.doesNotMatch(facts[1], /href="\/moves\/">Archive<\/a>/);
  assert.doesNotMatch(html, /probability of doom is \d/i);
  assert.doesNotMatch(html, /SIREN.*p\(doom\) of \d/i);
});

test('press.html section H2s use questions mirrored in FAQPage', () => {
  const html = press(ctx);
  assert.match(html, /<h2>What is SIREN in one sentence\?<\/h2>/);
  assert.match(html, /<h2>What paragraph can you lift\?<\/h2>/);
  assert.match(html, /<h2>What are the key SIREN facts\?<\/h2>/);
  assert.match(html, /<h2>How do I cite a SIREN reading\?<\/h2>/);
  assert.match(html, /<h2>Which press images can you use\?<\/h2>/);
  assert.match(html, /<h2>How do you contact SIREN for press\?<\/h2>/);
  assert.match(html, /<h2>Is there press coverage yet\?<\/h2>/);
  assert.doesNotMatch(html, /<h2>In one sentence<\/h2>/);
  assert.doesNotMatch(html, /<h2>A paragraph you can lift<\/h2>/);
  assert.doesNotMatch(html, /<h2>Facts<\/h2>/);
  assert.doesNotMatch(html, /<h2>Images<\/h2>/);
  assert.doesNotMatch(html, /<h2>Contact<\/h2>/);
  assert.doesNotMatch(html, /<h2>Coverage<\/h2>/);
  assert.match(html, /"name"\s*:\s*"What is SIREN in one sentence\?"/);
  assert.match(html, /"name"\s*:\s*"Is there press coverage yet\?"/);
  assert.doesNotMatch(html, /probability of doom is \d/i);
});
