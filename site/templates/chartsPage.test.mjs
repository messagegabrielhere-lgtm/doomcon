import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { render } from './chartsPage.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  routes: {},
  state: { generated_at: '2026-10-10T02:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE' },
};

const t0 = Date.parse('2026-10-06T00:00:00Z');
const history = Array.from({ length: 24 }, (_, i) => ({
  generated_at: new Date(t0 + i * 3600e3).toISOString(),
  t: t0 + i * 3600e3,
  score: 50 + (i % 5),
  level: 4,
  degraded: false,
  pillars: { capability: 40, compute: 45, attention: 50, governance: 35, markets: 55 },
}));

describe('charts page', () => {
  it('ships a question-shaped title, speakable WebPage, and matching FAQPage', () => {
    const html = render(ctx, { history });
    assert.match(html, /<title>What AI charts does SIREN publish\?/);
    assert.match(html, /<h1 class="bp__h1">What AI charts does SIREN publish\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /Are any of these charts estimated\?/);
    assert.match(html, /Can I post a chart to X as an image\?/);
    assert.match(html, /Where is the full power race table\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"WebPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/power\.html/);
    assert.match(html, /href="\/methodology\.html">How the SIREN AI activity index is computed · methodology<\/a>/);
    assert.match(html, /href="\/power\.html">Who makes the most electricity \(China vs US\)\?<\/a>/);
    assert.doesNotMatch(html, /href="\/methodology\.html">method<\/a>/);
    assert.doesNotMatch(html, /href="\/power\.html">full table<\/a>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /noindex/);
  });
});
