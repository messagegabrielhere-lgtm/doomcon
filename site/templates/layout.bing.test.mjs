import assert from 'node:assert/strict';
import { describe, it, afterEach } from 'node:test';
import { page } from './layout.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  routes: {},
  state: {
    generated_at: '2026-10-15T09:00:00Z',
    score: 57.7,
    level: 4,
    level_name: 'ROUTINE',
    receipt_id: 'r1',
    sources: [{ id: 'arxiv', ok: true }],
    pillars: [],
  },
  news: { items: [{ id: '1' }], generated_at: '2026-10-15T09:00:00Z', total: 1, sources: [{ ok: true }] },
  history: [{ score: 50 }],
  moves: [{ id: 'm1' }],
};

const ENV_KEY = 'BING_SITE_VERIFICATION';
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
    description: 'Bing Webmaster meta layout test.',
    body: '<p>Body</p>',
  });
}

describe('layout Bing Webmaster meta (FINDABILITY #120)', () => {
  it('omits msvalidate.01 when the secret is unset', () => {
    delete process.env[ENV_KEY];
    assert.doesNotMatch(shell(), /name="msvalidate\.01"/);
  });

  it('emits msvalidate.01 when the secret looks like a Bing token', () => {
    process.env[ENV_KEY] = 'AbCdEfGhIjKlMnOpQrStUvWxYz012345';
    assert.match(
      shell(),
      /<meta name="msvalidate\.01" content="AbCdEfGhIjKlMnOpQrStUvWxYz012345">/,
    );
  });

  it('rejects short, spaced, or punctuation-heavy values', () => {
    process.env[ENV_KEY] = 'short';
    assert.doesNotMatch(shell(), /name="msvalidate\.01"/);

    process.env[ENV_KEY] = 'token with spaces that should never emit';
    assert.doesNotMatch(shell(), /name="msvalidate\.01"/);

    process.env[ENV_KEY] = '<script>alert(1)</script>';
    assert.doesNotMatch(shell(), /name="msvalidate\.01"/);
  });
});
