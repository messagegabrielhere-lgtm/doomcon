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
  molt: {
    generated_at: '2026-10-14T15:00:00Z',
    posts: [{
      title: 'Agent post',
      url: 'https://example.com/p/1',
      agent: 'bot',
      agent_url: 'https://example.com/u/bot',
      upvotes: 3,
      comments: 1,
      created_at: '2026-10-14T14:00:00Z',
    }],
  },
};

describe('home v2 footer', () => {
  it('uses question-shaped legal and provenance sibling links', () => {
    const html = render(ctx, { head: '' });
    assert.match(html, /href="\/classic\.html#oven">Where is the full SIREN instrument panel\? →<\/a>/);
    assert.doesNotMatch(html, /href="\/classic\.html#oven">full oven with gates →<\/a>/);
    assert.match(html, /href="\/history\.html">What is the history of AI risk\?<\/a>/);
    assert.match(html, /href="\/race\.html">Who is winning the AI race\?<\/a>/);
    assert.doesNotMatch(html, /href="\/history\.html">HISTORY<\/a>/);
    assert.doesNotMatch(html, /href="\/race\.html">MARKETS<\/a>/);
    assert.doesNotMatch(html, /href="\/race\.html">THE RACE →<\/a>/);
    assert.doesNotMatch(html, /href="\/moltbook\.html">AGENT WATCH →<\/a>/);
    assert.doesNotMatch(html, /href="\/changelog\.html">CHANGELOG →<\/a>/);
    assert.doesNotMatch(html, /href="\/moves\/"[^>]*>MOVES →<\/a>/);
    const feet = [...html.matchAll(/<p class="v2-foot">([\s\S]*?)<\/p>/g)].map((m) => m[1]);
    assert.ok(feet.length >= 2, 'expected home v2 foot paragraphs');
    const all = feet.join('\n');
    assert.match(all, /href="\/methodology\.html">How the SIREN AI activity index is computed · methodology<\/a>/);
    assert.match(all, /href="\/classic\.html#vfy">Where is the full SIREN instrument panel\?<\/a>/);
    assert.match(all, /href="\/classic\.html">Where is the full SIREN instrument panel\?<\/a>/);
    assert.match(all, /href="\/alerts\.html">How do I get alerts when SIREN moves\?<\/a>/);
    assert.doesNotMatch(all, /href="\/classic\.html#vfy">Verify a reading<\/a>/);
    assert.doesNotMatch(all, /href="\/classic\.html">Full instrument panel<\/a>/);
    assert.doesNotMatch(all, /href="\/feed\.xml">RSS<\/a>/);
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

  it('dash buttons and live news chip use alerts/export/news question H1s', () => {
    const html = render(ctx, { head: '' });
    assert.match(html, /href="\/alerts\.html">🔔 How do I get alerts when SIREN moves\?<\/a>/);
    assert.match(html, /href="\/export\.html">⤓ How do I export and embed SIREN data\?<\/a>/);
    assert.match(html, /href="\/news\.html"[^>]*>[\s\S]*?Which AI stories has SIREN scored in this window\?<\/a>/);
    assert.match(html, /class="tag cool v2-top__x"[^>]*href="\/alerts\.html"[^>]*>How do I get alerts when SIREN moves\?<\/a>/);
    assert.doesNotMatch(html, /href="\/feed-level\.xml"[^>]*>ALERTS<\/a>/);
    assert.doesNotMatch(html, /href="\/alerts\.html">🔔 ALERTS<\/a>/);
    assert.doesNotMatch(html, /href="\/export\.html">⤓ DATA &amp; EMBED<\/a>/);
    assert.doesNotMatch(html, /NEWS &amp; ALERTS LIVE/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom/i);
  });


  it('reuse embed helper links to the export question, not the noindex widget', () => {
    const html = render(ctx, { head: '' });
    assert.match(html, /href="\/export\.html#embed">How do I export and embed SIREN data\?<\/a>/);
    assert.doesNotMatch(html, /href="\/embed\.html">Open the widget<\/a>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
  });

  it('Tally CTA level-change subscribe uses the alerts question H1', () => {
    const html = render(ctx, { head: '' });
    assert.match(html, /id="tally"[\s\S]*?href="\/alerts\.html">How do I get alerts when SIREN moves\?<\/a>/);
    assert.doesNotMatch(html, /href="\/feed-level\.xml">level-change RSS<\/a>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom/i);
  });

  it('moltbook agents note links the agents question H1', () => {
    const html = render(ctx, { head: '' });
    assert.match(html, /class="[^"]*v2-molt[^"]*"[\s\S]*?href="\/agents\.html">How should AI agents use SIREN\?<\/a>/);
    assert.match(html, /href="\/skill\.md">skill\.md<\/a>/);
    assert.doesNotMatch(html, /AI agents: SIREN’s data is open at <a href="\/skill\.md">skill\.md<\/a>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom/i);
  });
});


