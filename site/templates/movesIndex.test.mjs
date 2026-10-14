import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { render } from './movesIndex.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  state: {
    generated_at: '2026-10-13T20:00:00Z',
    score: 47.6,
    level: 4,
    level_name: 'ROUTINE',
    receipt_id: 'r_test',
  },
  moves: [
    {
      id: 'm1',
      generated_at: '2026-10-13T20:00:00Z',
      previous_score: 48.0,
      score: 47.6,
      delta: -0.4,
      previous_level: 4,
      level: 4,
      level_name: 'ROUTINE',
      level_changed: false,
    },
  ],
};

describe('moves index SEO', () => {
  it('ships a question-shaped title, speakable CollectionPage, and matching FAQPage', () => {
    const html = render(ctx);
    assert.match(html, /<title>Where are the SIREN index moves\?/);
    assert.match(html, /<h1 class="bp__h1">Where are the SIREN index moves\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /How is a SIREN move different from a scraped search ranking\?/);
    assert.match(html, /first-party receipt/);
    assert.match(html, /Scraped Google result pages/);
    assert.match(html, /Is an index move a doom forecast\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"CollectionPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/changelog\.html/);
    assert.match(html, /\/agents\.html/);
    assert.match(html, /What moved the SIREN score this hour\?/);
    assert.match(html, /How should AI agents use SIREN\?/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom/i);
  });

  it('day-section H2s use questions mirrored in FAQPage', () => {
    const html = render(ctx);
    assert.match(html, /id="d2026-10-13">Which SIREN index moves were scored on 2026-10-13\?<\/h2>/);
    assert.match(html, /FAQPage[\s\S]*Which SIREN index moves were scored on 2026-10-13\?/);
    assert.doesNotMatch(html, /id="d2026-10-13">2026-10-13<\/h2>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom/i);
  });
});
