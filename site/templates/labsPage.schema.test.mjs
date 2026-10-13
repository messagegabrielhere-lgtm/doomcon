import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { render } from './labsPage.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  history: [],
  state: {
    generated_at: '2026-10-13T20:00:00Z',
    score: 47.7,
    level: 4,
    level_name: 'ROUTINE',
    pillars: [],
  },
};

describe('labs page schema', () => {
  it('ships a question-shaped title, speakable CollectionPage, and matching FAQPage', () => {
    const html = render(ctx, Date.parse('2026-10-13T12:00:00Z'));
    assert.match(html, /<title>What is SIREN Labs measuring this week\?/);
    assert.match(html, /<h1 class="bp__h1">What is SIREN Labs measuring this week\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /Does Labs say when superintelligence arrives\?/);
    assert.match(html, /What are the lab rules\?/);
    assert.match(html, /Is SIREN Labs a doom probability\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"CollectionPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /None of them is a forecast/);
    assert.match(html, /Count, don’t predict|Count, don&#39;t predict|Count, don&rsquo;t predict|Count, don.?t predict/);
    assert.match(html, /\/si-watch\.html/);
    assert.match(html, /\/feedback\.html/);
    assert.match(html, /What AI autonomy signals is SIREN watching\?/);
    assert.match(html, /How do I report a problem or send an idea to SIREN\?/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom/i);
    assert.doesNotMatch(html, /noindex/);
  });
});
