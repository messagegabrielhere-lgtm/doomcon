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
    assert.match(html, /What questions do people actually ask\?/);
    assert.match(html, /Are any of these charts estimated\?/);
    assert.match(html, /Can I post a chart to X as an image\?/);
    assert.match(html, /id="ch-mh">How do you post this chart to 𝕏\?<\/h3>/);
    assert.doesNotMatch(html, /id="ch-mh">POST THIS CHART TO/);
    assert.match(html, /"name"\s*:\s*"How do you post this chart to 𝕏\?"/);
    assert.match(html, /Where is the full power race table\?/);
    assert.match(html, /What are the odds for the best AI model at the end of 2026\?/);
    assert.match(html, /Which AI bets are hottest right now\?/);
    assert.match(html, /What does the SIREN dial read\?/);
    assert.match(html, /What does a week of SIREN look like as a heat strip\?/);
    assert.match(html, /What is driving the index: the pillars\?/);
    assert.match(html, /Who is winning the power race since 2000\?/);
    assert.match(html, /How is the world's electricity split in 100 squares\?/);
    assert.doesNotMatch(html, />The odds race: best AI model at the end of 2026</);
    assert.doesNotMatch(html, />The hottest AI bets right now</);
    assert.doesNotMatch(html, />The SIREN dial</);
    assert.doesNotMatch(html, />The week as a heat strip</);
    assert.match(html, /Does SIREN publish a charts-page doom score\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"WebPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/power\.html/);
    assert.match(html, /href="\/methodology\.html">How the SIREN AI activity index is computed · methodology<\/a>/);
    assert.match(html, /href="\/power\.html">Who makes the most electricity \(China vs US\)\?<\/a>/);
    assert.doesNotMatch(html, /href="\/methodology\.html">method<\/a>/);
    assert.doesNotMatch(html, /href="\/power\.html">full table<\/a>/);
    assert.doesNotMatch(html, /href="\/power\.html">The power race: who makes the most electricity \(China vs US\)<\/a>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /noindex/);
  });

  it('links the highest-scored stories behind the charts', () => {
    const html = render({
      ...ctx,
      news: {
        items: [
          { id: 's1', title: 'Quiet paper', url: 'https://example.test/a', score: 20 },
          { id: 's2', title: 'Loud filing', url: 'https://example.test/b', score: 80 },
        ],
      },
    }, { history });
    assert.match(html, /id="ch-stories-h">Which scored stories sit behind these charts\?<\/h2>/);
    assert.match(html, /href="\/item\/loud-filing-s2\.html">Loud filing<\/a><span>80\.0<\/span>/);
    assert.match(html, /href="\/news\.html">Which AI stories has SIREN scored in this window\?<\/a>/);
    assert.match(html, /Which scored stories sit behind these charts\?/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
  });
});
