import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { referencePlanPage } from './extrasPages.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  history: [{ t: 1 }, { t: 2 }],
  state: {
    generated_at: '2026-10-13T20:00:00Z',
    score: 47.7,
    level: 4,
    level_name: 'ROUTINE',
    pillars: [],
  },
};

describe('reference-plan page', () => {
  it('ships a question-shaped title, speakable WebPage, and matching FAQPage', () => {
    const html = referencePlanPage(ctx, {
      built_at: '2025-01-01T00:00:00Z',
      window: '2024',
      window_days: 365,
      sources: ['arxiv', 'hn'],
      hash: 'abc123',
    });
    assert.match(html, /<title>How does the SIREN baseline get updated\?/);
    assert.match(html, /<h1>How does the SIREN baseline get updated\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /id="v1">What is reference v1, and why is it frozen\?<\/h2>/);
    assert.match(html, /id="addenda">How do addenda run as a shadow score\?<\/h2>/);
    assert.match(html, /id="promotion">When is an addendum promoted\?<\/h2>/);
    assert.match(html, /id="cutover">What happens at cutover\?<\/h2>/);
    assert.match(html, /id="shift">How does a permanent baseline shift work\?<\/h2>/);
    assert.match(html, /id="now">How do official and candidate scores compare this reading\?<\/h2>/);
    assert.match(html, /FAQPage[\s\S]*What is reference v1, and why is it frozen\?/);
    assert.match(html, /How do new sources join the score\?/);
    assert.match(html, /When is an addendum promoted\?/);
    assert.match(html, /Does updating the baseline make SIREN a doom forecast\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"WebPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /14 days/);
    assert.match(html, /95% uptime/);
    assert.match(html, /\/bias\.html/);
    assert.match(html, /\/methodology\.html/);
    assert.match(html, /What can SIREN not see\?/);
    assert.match(html, /How the SIREN AI activity index is computed · methodology/);
    assert.match(html, /What moved the SIREN score this hour\?/);
    assert.doesNotMatch(html, /id="v1">Reference v1, frozen<\/h2>/);
    assert.doesNotMatch(html, /id="promotion">Promotion rule<\/h2>/);
    assert.doesNotMatch(html, /id="now">Official vs candidate, this reading<\/h2>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom/i);
    assert.doesNotMatch(html, /noindex/);
  });
});
