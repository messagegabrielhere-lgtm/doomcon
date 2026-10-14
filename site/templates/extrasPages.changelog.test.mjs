import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { changelogPage } from './extrasPages.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  history: [
    {
      generated_at: '2026-10-13T20:00:00Z',
      score: 48.0,
      level: 4,
      level_name: 'ROUTINE',
      pillars: [{ id: 'capability', score: 50 }],
      sources: [],
      top_items: [],
    },
    {
      generated_at: '2026-10-13T19:00:00Z',
      score: 47.0,
      level: 4,
      level_name: 'ROUTINE',
      pillars: [{ id: 'capability', score: 49 }],
      sources: [],
      top_items: [],
    },
  ],
  state: {
    generated_at: '2026-10-13T20:00:00Z',
    score: 48.0,
    level: 4,
    level_name: 'ROUTINE',
    pillars: [],
  },
};

describe('changelog page', () => {
  it('ships a question-shaped title, speakable WebPage, and matching FAQPage', () => {
    const html = changelogPage(ctx);
    assert.match(html, /<title>What moved the SIREN score this hour\?/);
    assert.match(html, /<h1>What moved the SIREN score this hour\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /Do news items move the score\?/);
    assert.match(html, /How do I get these as alerts\?/);
    assert.match(html, /Is an hourly move a doom probability\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"WebPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /News items are context, not cause/);
    assert.match(html, /\/alerts\.html/);
    assert.match(html, /\/reference-plan\.html/);
    assert.match(html, /How do I get alerts when SIREN moves\?/);
    assert.match(html, /How does the SIREN baseline get updated\?/);
    assert.match(html, /href="\/history\.html">What is the history of AI risk\? →<\/a>/);
    assert.doesNotMatch(html, /href="\/history\.html">FULL HISTORY →<\/a>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom/i);
    assert.doesNotMatch(html, /noindex/);
  });
});
