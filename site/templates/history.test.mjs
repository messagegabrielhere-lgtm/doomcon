import assert from 'node:assert/strict';
import { test } from 'node:test';
import { render } from './history.mjs';

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

test('history.html ships question-shaped title, matching H1, speakable, breadcrumbs, and FAQ', () => {
  const html = render(ctx);
  assert.match(html, /<title>What is the history of AI risk\? Good, Asilomar, the pause letter/);
  assert.match(html, /<h1>What is the history of AI risk\?<\/h1>/);
  assert.match(html, /"@type"\s*:\s*"Article"/);
  assert.match(html, /"headline":\s*"What is the history of AI risk\?"/);
  assert.match(html, /"@type"\s*:\s*"FAQPage"/);
  assert.match(html, /SpeakableSpecification/);
  assert.match(html, /BreadcrumbList/);
  assert.match(html, /What is the history of AI risk\?/);
  assert.match(html, /What is the intelligence explosion\?/);
  assert.match(html, /Is SIREN a p\(doom\)\?/);
  assert.match(html, /\/methodology\.html/);
  assert.match(html, /\/guide\.html/);
  assert.match(html, /How the SIREN AI activity index is computed · methodology/);
  assert.match(html, /How does SIREN compare to DEFCON, the Doomsday Clock and p\(doom\)\?/);
  assert.doesNotMatch(html, /<h1>A sourced history of the AIpocalypse/);
  assert.doesNotMatch(html, /probability of doom is \d/i);
  assert.doesNotMatch(html, /SIREN.*p\(doom\) of \d/i);
  assert.doesNotMatch(html, /noindex/);
});
