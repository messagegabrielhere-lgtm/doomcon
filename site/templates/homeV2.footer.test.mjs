import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { render } from './homeV2.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  routes: {},
  state: {
    generated_at: '2026-10-14T15:00:00Z',
    score: 56.2,
    level: 4,
    level_name: 'ROUTINE',
    receipt_id: 'r1',
    pillars: [],
  },
  news: { items: [], generated_at: '2026-10-14T15:00:00Z', total: 0, sources: [] },
};

describe('home v2 footer', () => {
  it('uses question-shaped legal and provenance sibling links', () => {
    const html = render(ctx, { head: '' });
    assert.match(html, /href="\/classic\.html#oven">Where is the full SIREN instrument panel\? →<\/a>/);
    assert.doesNotMatch(html, /href="\/classic\.html#oven">full oven with gates →<\/a>/);
    const feet = [...html.matchAll(/<p class="v2-foot">([\s\S]*?)<\/p>/g)].map((m) => m[1]);
    assert.ok(feet.length >= 2, 'expected home v2 foot paragraphs');
    const all = feet.join('\n');
    assert.match(all, /href="\/methodology\.html">How the SIREN AI activity index is computed · methodology<\/a>/);
    assert.match(all, /href="\/about\.html">What is SIREN\?<\/a>/);
    assert.match(all, /href="\/sponsor\.html">How do you sponsor SIREN without moving the number\?<\/a>/);
    assert.match(all, /href="\/terms\.html">What are the SIREN terms of use\?<\/a>/);
    assert.match(all, /href="\/privacy\.html">What does SIREN know about you\?<\/a>/);
    assert.match(all, /href="\/disclosures\.html">What does SIREN disclose\?<\/a>/);
    assert.match(all, /href="\/feedback\.html">How do I report a problem or send an idea to SIREN\?<\/a>/);
    assert.doesNotMatch(all, /href="\/about\.html">About<\/a>/);
    assert.doesNotMatch(all, /href="\/privacy\.html">Privacy<\/a>/);
    assert.doesNotMatch(all, /href="\/methodology\.html">How it works<\/a>/);
    assert.doesNotMatch(all, /href="\/terms\.html">terms &amp; disclaimers<\/a>/);
    assert.doesNotMatch(all, /href="\/disclosures\.html">Disclosures<\/a>/);
    assert.doesNotMatch(all, /href="\/sponsor\.html">Sponsor<\/a>/);
    assert.doesNotMatch(all, /doom score:\s*\d/i);
    assert.doesNotMatch(all, /probability of doom/i);
  });
});
