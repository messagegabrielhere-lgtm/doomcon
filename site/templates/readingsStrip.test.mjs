import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { render } from './_readings.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  history: Array.from({ length: 8 }, (_, i) => ({
    generated_at: `2026-10-1${i}T12:00:00Z`,
    t: Date.parse(`2026-10-1${i}T12:00:00Z`),
    score: 50 + i,
    level: 4,
    level_name: 'ROUTINE',
    degraded: false,
  })),
  moves: [],
  state: { generated_at: '2026-10-14T02:00:00Z', score: 55.5, level: 4, level_name: 'ROUTINE' },
};

describe('recent readings strip', () => {
  it('links the history CTA with the history question H1', () => {
    const html = render(ctx);
    assert.match(html, /href="\/history\.html">What is the history of AI risk\? &rarr;<\/a>/);
    assert.doesNotMatch(html, /The full history/);
    assert.doesNotMatch(html, /probability of doom/i);
  });

  it('section H2 uses a question', () => {
    const html = render(ctx);
    assert.match(html, /id="rd-h">Which readings are most recent\?<\/h2>/);
    assert.doesNotMatch(html, /id="rd-h">Recent readings<\/h2>/);
    assert.doesNotMatch(html, /probability of doom/i);
  });
});
