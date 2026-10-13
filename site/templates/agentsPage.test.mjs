import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { agents } from './agentPages.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  state: { generated_at: '2026-10-13T15:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE' },
};

describe('agents page SEO', () => {
  it('ships a question-shaped title, speakable WebPage, and matching FAQPage', () => {
    const html = agents(ctx, null);
    assert.match(html, /<title>How should AI agents use SIREN\?/);
    assert.match(html, /<h1 class="bp__h1">How should AI agents use SIREN\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /Where should an agent start\?/);
    assert.match(html, /What are the rules for citing SIREN\?/);
    assert.match(html, /Can agents post the reading on Moltbook\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"WebPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/careers\.html/);
    assert.match(html, /\/moltbook\.html/);
    assert.match(html, /What jobs is SIREN hiring AIs for\?/);
    assert.match(html, /What are AI agents saying on Moltbook\?/);
    assert.match(html, /not a probability of harm/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /agents[- ]as[- ]doom|probability of doom/i);
    assert.doesNotMatch(html, /scrape everything|noindex/i);
  });
});
