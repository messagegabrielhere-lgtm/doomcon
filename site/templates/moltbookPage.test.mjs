import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { render, evolution } from './moltbookPage.mjs';

const molt = {
  generated_at: '2026-10-13T15:00:00Z',
  watch: {
    totals: { posts: 120, agents: 40, votes: 900, comments: 300 },
    themes: [{ id: 'agents', name: 'Agents', n: 12 }, { id: 'safety', name: 'Safety', n: 8 }],
    terms: [{ term: 'memory', n: 5 }],
    siren_mentions: [],
  },
  fresh: [],
  posts: [],
  week_agents: [],
};

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  state: { generated_at: '2026-10-13T15:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE' },
};

describe('moltbook page', () => {
  it('ships a question-shaped title, speakable Dataset, and matching FAQPage', () => {
    const html = render(ctx, molt);
    assert.match(html, /<title>What are AI agents saying on Moltbook\?/);
    assert.match(html, /<h1 class="bp__h1">What are AI agents saying on Moltbook\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /id="themes"[^>]*>What do AI agents talk about on Moltbook\?/);
    assert.match(html, /id="words"[^>]*>Which words do AI agents keep using\?/);
    assert.match(html, /Does Agent Watch move the SIREN score\?/);
    assert.match(html, /What do the theme counts mean\?/);
    assert.match(html, /Are agent posts vetted\?/);
    assert.match(html, /How is the agent network changing\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"Dataset"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/si-watch\.html/);
    assert.match(html, /\/bets\.html/);
    assert.match(html, /never moves the SIREN score/);
    assert.match(html, /href="\/agents\.html">How should AI agents use SIREN\?<\/a>/);
    assert.match(html, /class="mw-cta"[\s\S]*?href="\/agents\.html">How should AI agents use SIREN\?<\/a>/);
    assert.doesNotMatch(html, /href="\/agents\.html">For AI agents<\/a>/);
    assert.doesNotMatch(html, /Are you an AI agent\?<\/b> SIREN’s reading is open: <a href="\/skill\.md">skill\.md<\/a>/);
    assert.doesNotMatch(html, /<h2>What they talk about<\/h2>/);
    assert.doesNotMatch(html, /<h2>Words they keep using<\/h2>/);
    assert.doesNotMatch(html, /<h2>Agents working together<\/h2>/);
    assert.doesNotMatch(html, /<h2>How the agent network is changing<\/h2>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /Agent Watch feeds the index/i);
    assert.doesNotMatch(html, /agents will take over/i);
    assert.doesNotMatch(html, /probability of doom/i);
    assert.doesNotMatch(html, /noindex/);
  });

  it('evolution body link uses the evolution question H1', () => {
    const history = [
      { day: '2026-10-12', themes: { agents: 2 }, posts: 10 },
      { day: '2026-10-13', themes: { agents: 3 }, posts: 12 },
    ];
    const html = evolution(history, [], '/evolution.html');
    assert.match(html, /id="network"[^>]*>How is the agent network changing\?/);
    assert.match(html, /href="\/evolution\.html">How has AI activity moved day by day\?<\/a>/);
    assert.doesNotMatch(html, /<h2>How the agent network is changing<\/h2>/);
    assert.doesNotMatch(html, /Evolution log/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom/i);
  });
});
