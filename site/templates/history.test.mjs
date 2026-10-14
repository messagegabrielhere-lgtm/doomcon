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
  assert.match(html, /id="paperclip">What is the paperclip maximizer, properly attributed\?<\/h2>/);
  assert.match(html, /id="legend">What is the SIREN scale, level by level\?<\/h2>/);
  assert.match(html, /id="not">What does this index not claim\?<\/h2>/);
  assert.match(html, /id="counted">What does this index actually count\?<\/h2>/);
  assert.match(html, /<h3>What is the cautionary tale, in full\?<\/h3>/);
  assert.doesNotMatch(html, /<h3>The cautionary tale, in full, because it is ours too<\/h3>/);
  assert.match(html, /What is the cautionary tale, in full\?/);
  assert.doesNotMatch(html, /id="paperclip">The paperclip maximizer, properly attributed</);
  assert.doesNotMatch(html, /id="legend">The scale, level by level</);
  assert.doesNotMatch(html, /id="not">What this index does not claim</);
  assert.doesNotMatch(html, /id="counted">What is actually counted</);
  assert.match(html, /Does SIREN publish a history-page doom score\?/);
  assert.match(html, /\/methodology\.html/);
  assert.match(html, /\/guide\.html/);
  assert.match(html, /How the SIREN AI activity index is computed · methodology/);
  assert.match(html, /How does SIREN compare to DEFCON, the Doomsday Clock and p\(doom\)\?/);
  const prose = html.match(/<article class="prose">([\s\S]*?)<h2 id="faq">/);
  assert.ok(prose, 'expected history prose before FAQ');
  assert.match(prose[1], /href="\/methodology\.html">How the SIREN AI activity index is computed · methodology<\/a>/);
  assert.doesNotMatch(prose[1], /href="\/methodology\.html">methodology<\/a>/);
  assert.match(prose[1], /href="\/moves\/">Where are the SIREN index moves\?<\/a>/);
  assert.doesNotMatch(prose[1], /href="\/moves\/">hash-chained receipt<\/a>/);
  assert.match(html, /lore-nav__n[^<]*<\/span>How the SIREN AI activity index is computed · methodology<\/a>/);
  assert.doesNotMatch(html, /lore-nav__n[^<]*<\/span>The arithmetic<\/a>/);
  assert.doesNotMatch(html, /<h1>A sourced history of the AIpocalypse/);
  assert.doesNotMatch(html, /probability of doom is \d/i);
  assert.doesNotMatch(html, /SIREN.*p\(doom\) of \d/i);
  assert.doesNotMatch(html, /noindex/);
});

test('history level and pillar legend H3s use questions mirrored in FAQPage', () => {
  const html = render(ctx);
  assert.match(html, /What does SIREN 5 · DORMANT mean\?/);
  assert.match(html, /What does SIREN 4 · ROUTINE mean\?/);
  assert.match(html, /What does SIREN 1 · UNPRECEDENTED mean\?/);
  assert.match(html, /What does the Capability pillar count\?/);
  assert.match(html, /What does the Markets pillar count\?/);
  assert.match(html, /FAQPage[\s\S]*What does SIREN 5 · DORMANT mean\?/);
  assert.match(html, /FAQPage[\s\S]*What does the Capability pillar count\?/);
  assert.doesNotMatch(html, /<h3 class="lore-lv__h">SIREN 5 · DORMANT/);
  assert.doesNotMatch(html, /<h3 class="lore-pl__h">Capability<\/h3>/);
  assert.doesNotMatch(html, /probability of doom is \d/i);
});
