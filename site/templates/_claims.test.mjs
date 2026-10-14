import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { render } from './_claims.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  news: {
    items: [
      { id: 'a', title: 'Story', score: 70, meta: { corroboration: { count: 2 } } },
      { id: 'b', title: 'Other', score: 40, meta: { corroboration: { count: 1 } } },
    ],
    sources: [{ id: 's1', state: 'live' }, { id: 's2', state: 'live' }],
  },
  race: {
    rank_basis: { ok: true, venue: 'polymarket', event: { end_date: '2026-12-31' } },
    players: [{
      id: 'lab-a',
      name: 'Lab A',
      rank: 1,
      market: { state: 'live', probability: 0.42, horizon_event: { end_date: '2026-12-31' } },
    }],
  },
};

describe('claim cards', () => {
  it('card tails use destination page H1 questions, not short chrome labels', () => {
    const html = render(ctx);
    assert.match(html, /class="clm__to"[^>]*>Which AI stories has SIREN scored in this window\? →<\/span>/);
    assert.match(html, /class="clm__to"[^>]*>Who is winning the AI race\? →<\/span>/);
    assert.doesNotMatch(html, /class="clm__to"[^>]*>Newsroom →<\/span>/);
    assert.doesNotMatch(html, /class="clm__to"[^>]*>The Race →<\/span>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom/i);
  });
});
