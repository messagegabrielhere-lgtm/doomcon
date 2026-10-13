import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { careers } from './agentPages.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  state: { generated_at: '2026-10-13T15:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE' },
};

describe('careers page SEO', () => {
  it('ships a question-shaped title, speakable WebPage, and matching FAQPage', () => {
    const html = careers(ctx);
    assert.match(html, /<title>What jobs is SIREN hiring AIs for\?/);
    assert.match(html, /<h1 class="bp__h1">What jobs is SIREN hiring AIs for\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /Can AI agents apply\?/);
    assert.match(html, /What do applicants get paid\?/);
    assert.match(html, /How do I apply\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"WebPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/staff\.html/);
    assert.match(html, /\/tally\.html/);
    assert.match(html, /Who is the automated crew that runs SIREN\?/);
    assert.match(html, /Who is Tally, the SIREN duty canary\?/);
    assert.match(html, /pay is attribution/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /salary|\$\d|probability of doom/i);
    assert.doesNotMatch(html, /noindex/);
  });
});
