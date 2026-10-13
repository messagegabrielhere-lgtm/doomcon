import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { hasDatacenters, render } from './mapPage.mjs';

const datacenters = JSON.parse(readFileSync(new URL('../../data/datacenters.json', import.meta.url), 'utf8'));

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  routes: {},
  state: { generated_at: '2026-10-10T02:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE' },
  datacenters,
};

describe('map page', () => {
  it('gates on datacenters + resources_index', () => {
    assert.equal(hasDatacenters(ctx), true);
    assert.equal(hasDatacenters({}), false);
  });

  it('ships a question-shaped title, speakable Dataset, and matching FAQPage', () => {
    const html = render(ctx);
    assert.match(html, /<title>How many datacentres has SIREN mapped in the United States\?/);
    assert.match(html, /<h1 class="bldhero__h1">How many datacentres has SIREN mapped in the United States\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /Does this map measure a datacentre's power or water draw\?/);
    assert.match(html, /Does a state with no pins have zero datacentres\?/);
    assert.match(html, /Does the US map feed the main SIREN number\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"Dataset"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/world\.html/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /noindex/);
  });

  it('empty build keeps the question title and noindexes', () => {
    const html = render({ url: ctx.url, href: ctx.href, state: ctx.state });
    assert.match(html, /How many datacentres has SIREN mapped in the United States\?/);
    assert.match(html, /noindex/);
  });
});
