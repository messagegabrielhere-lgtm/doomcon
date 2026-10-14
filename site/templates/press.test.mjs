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
  assert.match(html, /Questions people actually ask/);
  assert.match(html, /How do I cite a SIREN reading\?/);
  assert.match(html, /href="\/methodology\.html">How the SIREN AI activity index is computed · methodology<\/a>/);
  assert.match(html, /href="\/instruments\.html#embed">What instruments sit behind the SIREN reading\?<\/a>/);
  assert.doesNotMatch(html, /href="\/methodology\.html">method<\/a>/);
  assert.doesNotMatch(html, /href="\/instruments\.html#embed">instruments page<\/a>/);
  assert.doesNotMatch(html, /probability of doom is \d/i);
  assert.doesNotMatch(html, /SIREN.*p\(doom\) of \d/i);
});
