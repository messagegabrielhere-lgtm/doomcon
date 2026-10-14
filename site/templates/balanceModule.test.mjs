import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { render } from './_balance.mjs';

const balance = JSON.parse(readFileSync(new URL('../../data/balance.json', import.meta.url), 'utf8'));
const ledger = JSON.parse(readFileSync(new URL('../../data/ledger.json', import.meta.url), 'utf8'));

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  balance,
  ledger,
  state: { generated_at: '2026-10-14T02:00:00Z', score: 55.5, level: 4, level_name: 'ROUTINE' },
};

describe('balance homepage module', () => {
  it('links the whole-balance CTA with the balance question H1', () => {
    const html = render(ctx);
    assert.match(html, /href="\/balance\.html">How does SIREN count AI harm and benefit side by side\? →<\/a>/);
    assert.doesNotMatch(html, /See the whole balance →/);
    assert.doesNotMatch(html, /probability of doom/i);
  });

  it('ships a question-shaped module H2 (tip #262)', () => {
    const html = render(ctx);
    assert.match(html, /id="bal-h">How does SIREN count AI harm and benefit side by side\?/);
    assert.doesNotMatch(html, /id="bal-h">Harm and benefit, side by side/);
    assert.doesNotMatch(html, /probability of doom/i);
  });
});
