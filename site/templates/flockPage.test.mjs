import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { hasFlock, render } from './flockPage.mjs';

const flock = JSON.parse(readFileSync(new URL('../../data/flock.json', import.meta.url), 'utf8'));

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  routes: { flock: true, map: true },
  state: { generated_at: '2026-10-10T02:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE' },
  flock,
};

describe('flock page', () => {
  it('gates on flock payload', () => {
    assert.equal(hasFlock(ctx), true);
    assert.equal(hasFlock({}), false);
  });

  it('ships a question-shaped title, speakable Dataset, and matching FAQPage', () => {
    const html = render(ctx);
    assert.match(html, /<title>How many Flock ALPR cameras has SIREN mapped\?/);
    assert.match(html, /<h1 class="flk__h1">How many Flock ALPR cameras has SIREN mapped\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /Does a county with no pins have zero Flock cameras\?/);
    assert.match(html, /Does the Flock register feed the main SIREN number\?/);
    assert.match(html, /Is this a complete census of Flock cameras\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"Dataset"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/map\.html/);
    // Never-say list: do not assert banned claims as findings.
    assert.doesNotMatch(html, /\ball Flock cameras\b/);
    assert.doesNotMatch(html, /\bevery Flock camera\b/);
    assert.doesNotMatch(html, /\ba national total\b/);
    assert.doesNotMatch(html, /the number of Flock cameras in the United States/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /noindex/);
  });

  it('empty build keeps the question title and noindexes', () => {
    const html = render({ url: ctx.url, href: ctx.href, state: ctx.state });
    assert.match(html, /How many Flock ALPR cameras has SIREN mapped\?/);
    assert.match(html, /noindex/);
  });
});
