import assert from 'node:assert/strict';
import { describe, it, afterEach } from 'node:test';
import { page } from './layout.mjs';

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
    sources: [{ id: 'arxiv', ok: true }],
    pillars: [],
  },
  news: { items: [{ id: '1' }], generated_at: '2026-10-14T15:00:00Z', total: 1, sources: [{ ok: true }] },
  history: [{ score: 50 }],
  moves: [{ id: 'm1' }],
};

const ENV_KEY = 'GOOGLE_SITE_VERIFICATION';
const prior = process.env[ENV_KEY];

afterEach(() => {
  if (prior === undefined) delete process.env[ENV_KEY];
  else process.env[ENV_KEY] = prior;
});

function shell() {
  return page({
    ctx,
    path: '/',
    title: 'AI activity index today · SIREN',
    description: 'GSC meta layout test.',
    body: '<p>Body</p>',
  });
}

describe('layout Google Search Console meta', () => {
  it('omits verification meta when the secret is unset', () => {
    delete process.env[ENV_KEY];
    const html = shell();
    assert.doesNotMatch(html, /name="google-site-verification"/);
  });

  it('emits verification meta when the secret looks like a GSC token', () => {
    process.env[ENV_KEY] = 'AbCdEfGhIj_KlMnOpQrStUvWxYz0123456789';
    const html = shell();
    assert.match(
      html,
      /<meta name="google-site-verification" content="AbCdEfGhIj_KlMnOpQrStUvWxYz0123456789">/,
    );
  });

  it('rejects short, spaced, or punctuation-heavy values (no stuffing / junk tags)', () => {
    process.env[ENV_KEY] = 'short';
    assert.doesNotMatch(shell(), /name="google-site-verification"/);

    process.env[ENV_KEY] = 'token with spaces that should never emit';
    assert.doesNotMatch(shell(), /name="google-site-verification"/);

    process.env[ENV_KEY] = '<script>alert(1)</script>';
    assert.doesNotMatch(shell(), /name="google-site-verification"/);
  });
});
