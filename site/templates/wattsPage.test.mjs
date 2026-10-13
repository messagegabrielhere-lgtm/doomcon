import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { hasWatts, render } from './wattsPage.mjs';

const infra = JSON.parse(readFileSync(new URL('../../data/infra.json', import.meta.url), 'utf8'));

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  routes: {},
  state: { generated_at: '2026-10-10T02:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE' },
  infra,
};

describe('watts page', () => {
  it('gates on infra sources + pillars', () => {
    assert.equal(hasWatts(ctx), true);
    assert.equal(hasWatts({}), false);
  });

  it('ships a question-shaped title, speakable Dataset, and matching FAQPage', () => {
    const html = render(ctx);
    assert.match(html, /<title>What does the SIREN infrastructure index read\?/);
    assert.match(html, /<h1 class="ihero__h1">What does the SIREN infrastructure index read\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /Does Watts measure datacentre power or water draw\?/);
    assert.match(html, /Does Watts feed the main SIREN number\?/);
    assert.match(html, /Does SUBSTRATE mean the grid is in trouble\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"Dataset"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/map\.html/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /noindex/);
  });

  it('empty build keeps the question title and noindexes', () => {
    const html = render({ url: ctx.url, href: ctx.href, state: ctx.state });
    assert.match(html, /What does the SIREN infrastructure index read\?/);
    assert.match(html, /noindex/);
  });
});
