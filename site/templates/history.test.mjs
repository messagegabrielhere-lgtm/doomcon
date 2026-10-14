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

test('history chapter H2s use questions mirrored in FAQPage', () => {
  const html = render(ctx);
  assert.match(html, /id="idea-h">When does the idea of AI risk arrive before the machines\?<\/h2>/);
  assert.match(html, /id="precedent-h">Which precedent can nobody in AI stop citing\?<\/h2>/);
  assert.match(html, /id="shape-h">How does the AI-risk argument acquire a shape\?<\/h2>/);
  assert.match(html, /id="jumps-h">Where did the capability jumps land\?<\/h2>/);
  assert.match(html, /id="signatures-h">When does the field sign its name on AI risk\?<\/h2>/);
  assert.match(html, /id="dates-h">When does AI governance acquire dates\?<\/h2>/);
  assert.match(html, /FAQPage[\s\S]*When does the idea of AI risk arrive before the machines\?/);
  assert.match(html, /FAQPage[\s\S]*When does AI governance acquire dates\?/);
  assert.doesNotMatch(html, /id="idea-h">The idea arrives before the machines do<\/h2>/);
  assert.doesNotMatch(html, /id="jumps-h">The capability jumps<\/h2>/);
  assert.doesNotMatch(html, /probability of doom is \d/i);
});

test('history timeline entry H3s use questions mirrored in FAQPage', () => {
  const html = render(ctx);
  assert.match(html, /<h3 class="tl__h">What test did Turing propose instead of a definition\?<\/h3>/);
  assert.match(html, /<h3 class="tl__h">How did Good describe the intelligence explosion\?<\/h3>/);
  assert.match(html, /<h3 class="tl__h">What is the pause letter\?<\/h3>/);
  assert.match(html, /<h3 class="tl__h">When did the EU AI Act enter into force, on a staircase\?<\/h3>/);
  assert.match(html, /FAQPage[\s\S]*What test did Turing propose instead of a definition\?/);
  assert.match(html, /FAQPage[\s\S]*What is the pause letter\?/);
  assert.doesNotMatch(html, /<h3 class="tl__h">Turing proposes a test instead of a definition<\/h3>/);
  assert.doesNotMatch(html, /<h3 class="tl__h">The pause letter<\/h3>/);
  assert.doesNotMatch(html, /<h3 class="tl__h">The capability jumps<\/h3>/);
  assert.doesNotMatch(html, /probability of doom is \d/i);
});
