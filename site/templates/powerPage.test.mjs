import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { render } from './powerPage.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  routes: {},
  state: { generated_at: '2026-10-10T02:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE' },
};

const power = {
  year: 2024,
  world_twh: 30000,
  top: [
    { iso: 'CHN', name: 'China', twh: 10000, growth_5y_pct: 40 },
    { iso: 'USA', name: 'United States', twh: 4200, growth_5y_pct: 5 },
  ],
  per_capita: [{ name: 'Iceland', per_capita_kwh: 50000 }],
  fastest: [{ name: 'Vietnam', growth_5y_pct: 60, twh: 300 }],
  race: {
    china: [[2000, 1000], [2024, 10000]],
    us: [[2000, 3800], [2024, 4200]],
  },
};

describe('power page', () => {
  it('ships a question-shaped title, speakable Dataset, and matching FAQPage', () => {
    const html = render(ctx, power);
    assert.match(html, /<title>Who makes the most electricity \(China vs US\)\?/);
    assert.match(html, /<h1 class="bp__h1">Who makes the most electricity \(China vs US\)\?<\/h1>/);
    assert.match(html, /What questions do people actually ask\?/);
    assert.match(html, /id="race">Who is winning the electricity race by year\?<\/h2>/);
    assert.match(html, /id="top20">Which countries are the top 20 generators in 2024\?<\/h2>/);
    assert.match(html, /id="percap">Who makes the most electricity per person\?<\/h2>/);
    assert.match(html, /id="fast">Which countries grew generation fastest\?<\/h2>/);
    assert.match(html, /FAQPage[\s\S]*Who is winning the electricity race by year\?/);
    assert.match(html, /Is this generation or consumption\?/);
    assert.match(html, /Why does electricity matter for AI on this site\?/);
    assert.match(html, /Where does the data come from\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"Dataset"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/watts\.html/);
    const related = html.match(/Related:([\s\S]*?)<\/p>/);
    assert.ok(related, 'expected Related links');
    assert.match(related[1], /What does the SIREN infrastructure index read\?/);
    assert.match(related[1], /How many datacentres has SIREN mapped in the United States\?/);
    assert.match(related[1], /How many datacentres has SIREN mapped on Earth\?/);
    assert.doesNotMatch(related[1], /AI.s power draw/);
    assert.doesNotMatch(related[1], /US data-centre map/);
    assert.doesNotMatch(related[1], /World data centres/);
    assert.doesNotMatch(html, /id="race">THE RACE:/);
    assert.doesNotMatch(html, /id="percap">MOST PER PERSON/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /noindex/);
  });
});
