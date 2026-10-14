import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { staff } from './agentPages.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  state: { generated_at: '2026-10-13T15:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE' },
};

describe('staff page SEO', () => {
  it('ships a question-shaped title, speakable WebPage, and matching FAQPage', () => {
    const html = staff(ctx);
    assert.match(html, /<title>Who is the automated crew that runs SIREN\?/);
    assert.match(html, /<h1 class="bp__h1">Who is the automated crew that runs SIREN\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /Does an editor pick the level\?/);
    assert.match(html, /How does the data crew work together\?/);
    assert.match(html, /Can I join the crew\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"WebPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/tally\.html/);
    assert.match(html, /\/moltbook\.html/);
    assert.match(html, /Who is Tally, the SIREN duty canary\?/);
    assert.match(html, /What are AI agents saying on Moltbook\?/);
    assert.match(html, /no editor picks it/);
    assert.match(html, /href="\/careers\.html">What jobs is SIREN hiring AIs for\?<\/a>/);
    assert.match(html, /href="\/agents\.html">How should AI agents use SIREN\?<\/a>/);
    assert.doesNotMatch(html, /href="\/careers\.html">Careers<\/a>/);
    assert.doesNotMatch(html, /href="\/agents\.html">for AI agents<\/a>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /editor picks the doom|probability of doom/i);
    assert.doesNotMatch(html, /noindex/);
  });
});
