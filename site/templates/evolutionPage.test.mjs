import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { render } from './evolutionPage.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  history: [
    { t: '2026-10-12T12:00:00Z', score: 50, level: 4, pillars: { capability: 40, compute: 50, attention: 45, governance: 30, markets: 55 } },
    { t: '2026-10-13T12:00:00Z', score: 52, level: 4, pillars: { capability: 42, compute: 51, attention: 46, governance: 31, markets: 54 } },
  ],
  deskPicks: { items: [] },
  state: { generated_at: '2026-10-13T15:00:00Z', score: 52, level: 4, level_name: 'ROUTINE' },
};

describe('evolution page', () => {
  it('ships a question-shaped title, speakable Dataset, and matching FAQPage', () => {
    const log = {
      runs: [{
        at: '2026-10-13T14:00:00Z',
        desk_picks: [],
        moltbook: { standouts: [], top_themes: ['tools'], siren_mentions: 0 },
      }],
    };
    const withPicks = {
      ...ctx,
      deskPicks: {
        items: [{
          title: 'Sample desk pick',
          url: 'https://example.com/a',
          publisher: 'Example',
          published_at: '2026-10-12T18:00:00Z',
          pillar: 'capability',
        }],
      },
    };
    const html = render(withPicks, log, []);
    assert.match(html, /<title>How has AI activity moved day by day\?/);
    assert.match(html, /<h1 class="bp__h1">How has AI activity moved day by day\?<\/h1>/);
    assert.match(html, /What questions do people actually ask\?/);
    assert.match(html, /Does the Evolution Log move the SIREN index\?/);
    assert.match(html, /Are these forecasts\?/);
    assert.match(html, /What records are kept\?/);
    assert.match(html, /id="ev-tempo-h">How does the tempo look day by day\?<\/h2>/);
    assert.match(html, /id="ev-news-h">What was the news about\?<\/h2>/);
    assert.match(html, /id="ev-agents-h">What did the agents talk about\?<\/h2>/);
    assert.match(html, /id="ev-scan-h">What is in each scan log entry\?<\/h2>/);
    assert.match(html, /id="ev-desk-h">Which desk picks are kept\?<\/h2>/);
    assert.match(html, /What did the scan at [^<]+ find\?/);
    assert.match(html, /Which desk picks were kept on [^<]+\?/);
    assert.match(html, /FAQPage[\s\S]*How does the tempo look day by day\?/);
    assert.match(html, /FAQPage[\s\S]*What did the agents talk about\?/);
    assert.match(html, /FAQPage[\s\S]*What did the scan at/);
    assert.match(html, /FAQPage[\s\S]*Which desk picks were kept on/);
    assert.doesNotMatch(html, /<h3>SCAN ·/);
    assert.doesNotMatch(html, /id="ev-tempo-h">The tempo<\/h2>/);
    assert.doesNotMatch(html, /id="ev-news-h">What the news was about<\/h2>/);
    assert.doesNotMatch(html, /id="ev-agents-h">What the agents talked about<\/h2>/);
    assert.doesNotMatch(html, /id="ev-scan-h">Scan log<\/h2>/);
    assert.doesNotMatch(html, /id="ev-desk-h">Every desk pick<\/h2>/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"Dataset"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/moltbook\.html/);
    assert.match(html, /\/history\.html/);
    assert.match(html, /counts of activity, not forecasts/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /Evolution Log (is|as) a forecast/i);
    assert.doesNotMatch(html, /Evolution Log feeds the index/i);
    assert.doesNotMatch(html, /probability of doom/i);
    assert.doesNotMatch(html, /noindex/);
  });
});
