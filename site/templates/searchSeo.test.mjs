import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { search } from './catalogPages.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  state: { generated_at: '2026-10-13T15:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE' },
};

const stats = {
  counts: { page: 12, tool: 4, game: 3, news: 40, data: 6, feed: 2 },
  popular: [
    { url: '/race.html', title: 'The Race', desc: 'Labs ranked.', icon: 'radar' },
  ],
};

describe('search page SEO', () => {
  it('ships a question-shaped title, speakable WebPage, and matching FAQPage', () => {
    const html = search(ctx, stats);
    assert.match(html, /<title>How do you search everything on SIREN\?/);
    assert.match(html, /<h1 class="bp__h1">How do you search everything on SIREN\?<\/h1>/);
    assert.match(html, /What questions do people actually ask\?/);
    assert.match(html, /How do results work\?/);
    assert.match(html, /Does search need JavaScript\?/);
    assert.match(html, /Rather browse than search\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"WebPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/catalog\.html/);
    assert.match(html, /Where is everything on SIREN listed\?/);
    assert.match(html, /One box for the whole site/);
    assert.match(html, /Results appear as you type/);
    assert.match(html, /href="\/catalog\.html">Where is everything on SIREN listed\?<\/a>/);
    assert.doesNotMatch(html, /href="\/catalog\.html">catalog<\/a>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /search[- ]as[- ]doom|doom oracle/i);
    assert.doesNotMatch(html, /probability of doom/i);
    assert.doesNotMatch(html, /noindex/);
  });

  it('empty-state section H2s use questions mirrored in FAQPage', () => {
    const html = search(ctx, stats);
    assert.match(html, /<h2>Which search queries should you try first\?<\/h2>/);
    assert.match(html, /<h2>Which rooms do people open most\?<\/h2>/);
    assert.doesNotMatch(html, /<h2>Try one of these<\/h2>/);
    assert.doesNotMatch(html, /<h2>Popular rooms<\/h2>/);
    assert.match(html, /"name"\s*:\s*"Which search queries should you try first\?"/);
    assert.match(html, /"name"\s*:\s*"Which rooms do people open most\?"/);
    assert.match(html, /Starter queries on this page/);
    assert.doesNotMatch(html, /probability of doom/i);
  });
});
