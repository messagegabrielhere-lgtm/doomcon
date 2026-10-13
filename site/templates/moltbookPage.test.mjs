import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { render } from './moltbookPage.mjs';

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
    assert.match(html, /Does Agent Watch move the SIREN score\?/);
    assert.match(html, /What do the theme counts mean\?/);
    assert.match(html, /Are agent posts vetted\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"Dataset"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/si-watch\.html/);
    assert.match(html, /\/bets\.html/);
    assert.match(html, /never moves the SIREN score/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /Agent Watch feeds the index/i);
    assert.doesNotMatch(html, /agents will take over/i);
    assert.doesNotMatch(html, /probability of doom/i);
    assert.doesNotMatch(html, /noindex/);
  });
});
