import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { guide, guideMd } from './infoPages.mjs';
import { methodologyMd, render as renderMethodology } from './methodology.mjs';
import * as brand from '../brand.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  state: {
    level: 4,
    level_name: 'ROUTINE',
    score: 55.5,
    generated_at: '2026-10-10T03:15:00.000Z',
  },
  cardFor: () => null,
  methodologyMd: '# How it works\n\nThe composite is arithmetic.\n',
};

test('guide.html ships question H1, visible FAQ matching FAQPage, and speakable schema', () => {
  const html = guide(ctx);
  assert.match(html, /<title>How does SIREN compare to DEFCON, the Doomsday Clock and p\(doom\)\?/);
  assert.match(html, /<h1 class="bp__h1">How does SIREN compare to DEFCON, the Doomsday Clock and p\(doom\)\?<\/h1>/);
  assert.match(html, /What questions do people actually ask\?/);
  assert.match(html, /Is SIREN a DEFCON level or the Bulletin.s Doomsday Clock\?/);
  assert.match(html, /What is p\(doom\)\?/);
  assert.match(html, /Does a loud SIREN reading mean AI is more dangerous\?/);
  assert.match(html, /"@type"\s*:\s*"FAQPage"/);
  assert.match(html, /"@type"\s*:\s*"WebPage"/);
  assert.match(html, /SpeakableSpecification/);
  assert.match(html, /BreadcrumbList/);
  assert.match(html, /Takeoff Tracker/);
  assert.match(html, /\/history\.html/);
  assert.match(html, /\/methodology\.html/);
  assert.match(html, /\/p-doom\.html/);
  assert.match(html, /What is the history of AI risk\?/);
  // FINDABILITY #457 — dual middot head terms on guide live link.
  assert.match(html, /href="\/">AI activity index today · AI activity level today · SIREN →<\/a>/);
  assert.doesNotMatch(html, /href="\/">The current reading →<\/a>/);
  assert.doesNotMatch(html, /<h1 class="bp__h1">SIREN, DEFCON, the Doomsday Clock and p\(doom\)<\/h1>/);
  assert.doesNotMatch(html, /SIREN.*p\(doom\) of \d/i);
  assert.doesNotMatch(html, /probability of doom is \d/i);
  assert.doesNotMatch(html, /noindex/);
});

test('guide.html section H2s use questions mirrored in FAQPage', () => {
  const html = guide(ctx);
  assert.match(html, /<h2>What is the short version of the comparison\?<\/h2>/);
  assert.match(html, /<h2>How do you read the SIREN dial\?<\/h2>/);
  assert.match(html, /<h2>What does a loud reading tell you, and what does it not\?<\/h2>/);
  assert.match(html, /<h2>Why borrow DEFCON(?:'|&#39;|&apos;)s grammar at all\?<\/h2>/);
  assert.match(html, /<h2>Where should you go next\?<\/h2>/);
  assert.doesNotMatch(html, /<h2>The short version<\/h2>/);
  assert.doesNotMatch(html, /<h2>How to read the SIREN dial<\/h2>/);
  assert.doesNotMatch(html, /<h2>What a loud reading does and does not tell you<\/h2>/);
  assert.doesNotMatch(html, /<h2>Where to go next<\/h2>/);
  assert.match(html, /"name"\s*:\s*"What is the short version of the comparison\?"/);
  assert.match(html, /"name"\s*:\s*"How do you read the SIREN dial\?"/);
  assert.doesNotMatch(html, /probability of doom is \d/i);
});

test('guide.md mirrors the HTML guide claims', () => {
  const md = guideMd(ctx);
  assert.match(md, /^# How does SIREN compare to DEFCON, the Doomsday Clock and p\(doom\)\?/);
  assert.match(md, /HTML: https:\/\/siren\.watch\/guide\.html/);
  assert.match(md, /\*\*SIREN 4, ROUTINE\*\*/);
  assert.match(md, /\| \*\*DEFCON\*\*/);
  assert.match(md, /methodology\.md/);
  assert.match(md, /\/vs\/pizzint\.html/);
  assert.match(md, /PizzINT/);
  // FINDABILITY #457 — dual middot head terms on guide.md live link.
  assert.match(md, /AI activity index today · AI activity level today · SIREN/);
  assert.doesNotMatch(md, /\[The current reading\]/);
  assert.ok(md.includes(brand.NAME));
});

test('methodology.md wraps the source doc with matching question H1', () => {
  const md = methodologyMd(ctx);
  assert.match(md, /^# How the SIREN AI activity index is computed · methodology/);
  assert.match(md, /HTML: https:\/\/siren\.watch\/methodology\.html/);
  assert.match(md, /The composite is arithmetic/);
  assert.doesNotMatch(md, /^# How it works/m);
  assert.doesNotMatch(md, /^# SIREN methodology/m);
  assert.match(md, /Built 2026-10-10T03:15:00\.000Z/);
});

test('methodology.html ships matching question H1, speakable, breadcrumbs, and FAQ from question headings', () => {
  const html = renderMethodology({
    ...ctx,
    methodologyMd: readFileSync(new URL('../../docs/METHODOLOGY.md', import.meta.url), 'utf8'),
    state: { ...ctx.state, receipt_id: 'r1' },
  });
  assert.match(html, /<title>How the SIREN AI activity index is computed · methodology/);
  assert.match(html, /<h1[^>]*>How the SIREN AI activity index is computed · methodology/);
  assert.doesNotMatch(html, /<h1[^>]*>Methodology\s*</);
  assert.match(html, /"@type"\s*:\s*"TechArticle"/);
  assert.match(html, /SpeakableSpecification/);
  assert.match(html, /BreadcrumbList/);
  assert.match(html, /"@type"\s*:\s*"FAQPage"/);
  assert.match(html, /What does the index measure/);
  assert.match(html, /What are the five pillars/);
  assert.match(html, /Why is the market pillar not/);
  assert.match(html, /How does the arithmetic work/);
  assert.match(html, /Why does the level not flicker/);
  assert.match(html, /What happens when a source is missing/);
  assert.match(html, /What is a receipt, and can I check one/);
  assert.match(html, /How could this index mislead you/);
  assert.match(html, /What are reference versions and the shadow index/);
  assert.match(html, /What biases does this index carry/);
  assert.match(html, /Where does the historical training-compute data come from/);
  assert.match(html, /What are the limitations, stated plainly/);
  assert.match(html, /How do I recompute the index myself/);
  assert.doesNotMatch(html, /probability of doom is \d/i);
  assert.doesNotMatch(html, /noindex/);
});
