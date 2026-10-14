import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { guideMd } from './infoPages.mjs';
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

test('guide.md mirrors the HTML guide claims', () => {
  const md = guideMd(ctx);
  assert.match(md, /^# SIREN, DEFCON/);
  assert.match(md, /HTML: https:\/\/siren\.watch\/guide\.html/);
  assert.match(md, /\*\*SIREN 4, ROUTINE\*\*/);
  assert.match(md, /\| \*\*DEFCON\*\*/);
  assert.match(md, /methodology\.md/);
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

test('methodology.html ships matching title/H1, speakable, breadcrumbs, and FAQ from question headings', () => {
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
  assert.doesNotMatch(html, /probability of doom is \d/i);
  assert.doesNotMatch(html, /noindex/);
});
