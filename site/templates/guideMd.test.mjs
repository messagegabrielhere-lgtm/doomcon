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
  assert.match(html, /Questions people actually ask/);
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
  assert.doesNotMatch(html, /<h1 class="bp__h1">SIREN, DEFCON, the Doomsday Clock and p\(doom\)<\/h1>/);
  assert.doesNotMatch(html, /SIREN.*p\(doom\) of \d/i);
  assert.doesNotMatch(html, /probability of doom is \d/i);
  assert.doesNotMatch(html, /noindex/);
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
  assert.ok(md.includes(brand.NAME));
});

test('methodology.md wraps the source doc', () => {
  const md = methodologyMd(ctx);
  assert.match(md, /^# SIREN methodology/);
  assert.match(md, /HTML: https:\/\/siren\.watch\/methodology\.html/);
  assert.match(md, /# How it works/);
  assert.match(md, /Built 2026-10-10T03:15:00\.000Z/);
});

test('methodology.html ships head-term title, speakable, breadcrumbs, and FAQ from question headings', () => {
  const html = renderMethodology({
    ...ctx,
    methodologyMd: readFileSync(new URL('../../docs/METHODOLOGY.md', import.meta.url), 'utf8'),
    state: { ...ctx.state, receipt_id: 'r1' },
  });
  assert.match(html, /<title>How the SIREN AI activity index is computed/);
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
});
