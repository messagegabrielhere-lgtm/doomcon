import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { hasBliss, render } from './blissPage.mjs';

const bliss = JSON.parse(readFileSync(new URL('../../data/bliss.json', import.meta.url), 'utf8'));

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  routes: { bliss: true, watts: true },
  state: { generated_at: '2026-10-10T02:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE' },
  bliss,
};

describe('bliss page', () => {
  it('gates on bliss payload', () => {
    assert.equal(hasBliss(ctx), true);
    assert.equal(hasBliss({}), false);
  });

  it('ships a question-shaped title, speakable Dataset, and matching FAQPage', () => {
    const html = render(ctx);
    assert.match(html, /<title>What is BLISS, the SIREN upside index\?/);
    assert.match(html, /<h1 class="bintro__h1">What is BLISS, the SIREN upside index\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /Why publish BLISS beside the main SIREN number\?/);
    assert.match(html, /Is a BLISS score a probability\?/);
    assert.match(html, /Which BLISS sources answered this run\?/);
    assert.match(html, /id="pair-h"[^>]*>How do BLISS and SIREN sit on one axis\?/);
    assert.match(html, /id="pillars-h"[^>]*>What are the five BLISS pillars\?/);
    assert.match(html, /id="sources-h"[^>]*>Which BLISS sources answered this run\?/);
    assert.match(html, /id="how-h"[^>]*>How is BLISS computed\?/);
    assert.doesNotMatch(html, /<h2 id="pair-h"[^>]*>Both numbers, one axis<\/h2>/);
    assert.doesNotMatch(html, /<h2 id="pillars-h"[^>]*>The five pillars<\/h2>/);
    assert.doesNotMatch(html, /<h2 id="sources-h"[^>]*>Every source, and what it read<\/h2>/);
    assert.doesNotMatch(html, /<h2 id="how-h"[^>]*>How this is computed<\/h2>/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"Dataset"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/watts\.html/);
    const links = html.match(/<p class="bhow__links">([\s\S]*?)<\/p>/);
    assert.ok(links, 'expected bliss methodology links');
    assert.match(links[1], /href="\/methodology\.html">How the SIREN AI activity index is computed · methodology<\/a>/);
    assert.match(links[1], /href="\/">AI activity index today · SIREN<\/a>/);
    assert.doesNotMatch(links[1], /href="\/methodology\.html">Full methodology<\/a>/);
    assert.doesNotMatch(links[1], /href="\/">SIREN index<\/a>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /doom probability/i);
    assert.doesNotMatch(html, /noindex/);
  });

  it('empty build keeps the question title and noindexes', () => {
    const html = render({ url: ctx.url, href: ctx.href, state: ctx.state });
    assert.match(html, /What is BLISS, the SIREN upside index\?/);
    assert.match(html, /noindex/);
  });
});
