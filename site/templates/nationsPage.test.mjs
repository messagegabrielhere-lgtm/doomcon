import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { nationsRace } from '../nations.mjs';
import { highlightHtml, render } from './nationsPage.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  routes: { race: true, power: true, world: true },
  state: { generated_at: '2026-10-13T15:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE' },
};

const sample = nationsRace({
  race: {
    markets: {
      polymarket: {
        ok: true,
        horizon: {
          legs: [
            { title: 'Google', probability: 0.9 },
            { title: 'DeepSeek', probability: 0.1 },
          ],
          url: 'https://example.com/pm',
        },
      },
    },
  },
  power: { year: 2025, top: [{ iso: 'CHN', twh: 10000 }, { iso: 'USA', twh: 4500 }] },
  world: { countries: [{ iso2: 'US', total: 2000 }, { iso2: 'CN', total: 100 }] },
});

describe('nations page', () => {
  it('ships a question-shaped title, speakable Dataset, and matching FAQPage', () => {
    const html = render(ctx, sample);
    assert.match(html, /<title>USA vs China: who is winning the race to superintelligence\?/);
    assert.match(html, /<h1 class="bp__h1">USA vs China: who is winning the race to superintelligence\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /Are the odds SIREN’s forecast of who wins\?/);
    assert.match(html, /How does the scoreboard award points\?/);
    assert.match(html, /How is this different from the lab race page\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"Dataset"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/race\.html/);
    assert.match(html, /\/power\.html/);
    const related = html.match(/>Related:([\s\S]*?)<\/p>/);
    assert.ok(related, 'expected Related paragraph');
    assert.match(related[1], /href="\/race\.html">Who is winning the AI race\?<\/a>/);
    assert.match(related[1], /href="\/power\.html">Who makes the most electricity \(China vs US\)\?<\/a>/);
    assert.match(related[1], /href="\/world\.html">How many datacentres has SIREN mapped on Earth\?<\/a>/);
    assert.match(related[1], /href="\/charts\.html">What AI charts does SIREN publish\?<\/a>/);
    assert.doesNotMatch(related[1], /href="\/race\.html">the lab race<\/a>/);
    assert.doesNotMatch(related[1], /href="\/power\.html">the power race<\/a>/);
    assert.doesNotMatch(related[1], /href="\/world\.html">world data centres<\/a>/);
    assert.doesNotMatch(related[1], /href="\/charts\.html">charts<\/a>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /SIREN (predicts|forecasts) who wins/i);
    assert.doesNotMatch(html, /this is financial advice/i);
    assert.doesNotMatch(html, /noindex/);
  });

  it('keeps the question title when measures are empty', () => {
    const html = render(ctx, { measures: [], score: { US: 0, CN: 0 } });
    assert.match(html, /USA vs China: who is winning the race to superintelligence\?/);
    assert.match(html, /FAQPage/);
    assert.doesNotMatch(html, /noindex/);
  });

  it('highlight card CTA uses the nations page H1 question', () => {
    const html = highlightHtml(ctx, sample);
    assert.match(html, /USA vs China: who is winning the race to superintelligence\? →/);
    assert.doesNotMatch(html, /See the full scoreboard/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
  });
});

