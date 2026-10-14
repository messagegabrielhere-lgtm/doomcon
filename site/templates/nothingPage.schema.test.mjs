import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { render } from './nothingPage.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  history: Array.from({ length: 20 }, () => ({ level: 4, level_name: 'ROUTINE' })),
  moves: [
    { generated_at: '2026-10-13T20:00:00Z', level: 4, level_name: 'ROUTINE', level_changed: false },
  ],
  state: {
    generated_at: '2026-10-13T20:00:00Z',
    score: 47.7,
    level: 4,
    level_name: 'ROUTINE',
    pillars: [],
  },
};

describe('nothing page schema', () => {
  it('ships a question-shaped title, speakable WebPage, and matching FAQPage', () => {
    const html = render(ctx);
    assert.match(html, /<title>How often do dated AI claims miss\?/);
    assert.match(html, /<h1 class="neh__h1 bp__h1">How often do dated AI claims miss\?<\/h1>/);
    assert.match(html, /What questions do people actually ask\?/);
    assert.match(html, /id="ledger">What claims are on the ledger\?<\/h2>/);
    assert.match(html, /id="method">How is the Nothing Index made\?<\/h2>/);
    assert.match(html, /FAQPage[\s\S]*What claims are on the ledger\?/);
    assert.match(html, /FAQPage[\s\S]*How is the Nothing Index made\?/);
    assert.match(html, /How is this different from pizzint\.watch/);
    assert.match(html, /Does this number feed the main SIREN index\?/);
    assert.match(html, /Why not auto-fail every overdue row\?/);
    assert.match(html, /Is the Nothing Index a doom probability\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"WebPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /does not feed the main/);
    assert.match(html, /\/bets\.html/);
    assert.match(html, /\/methodology\.html/);
    assert.match(html, /Does the SIREN index make forecasts\?/);
    assert.match(html, /How the SIREN AI activity index is computed · methodology/);
    const related = html.match(/class="neh__fine">Related:([\s\S]*?)<\/p>/);
    assert.ok(related, 'expected Related fine print');
    assert.match(related[1], /href="\/desk\.html">What unserious counts does SIREN keep on Tally’s desk\?<\/a>/);
    assert.doesNotMatch(related[1], /href="\/desk\.html">Tally’s Desk<\/a>/);
    assert.doesNotMatch(html, /id="ledger">The ledger<\/h2>/);
    assert.doesNotMatch(html, /id="method">How the number is made<\/h2>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom/i);
    assert.doesNotMatch(html, /noindex/);
  });
});
