import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { render } from './_verify.mjs';

const ctx = {
  href: (p) => p,
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  state: {
    receipt_id: '2026-10-14T02-00-00Z',
    receipt_hash: 'sha256:abcd',
    level: 4,
    level_name: 'ROUTINE',
    score: 55.5,
    generated_at: '2026-10-14T02:00:00Z',
  },
};

describe('verify module', () => {
  it('section H2 uses a question', () => {
    const html = render(ctx);
    assert.match(html, /id="vfy-h">How do you check a SIREN reading yourself\?<\/h2>/);
    assert.doesNotMatch(html, /Don’t trust it\. Check it\./);
    assert.doesNotMatch(html, /probability of doom/i);
  });
});
