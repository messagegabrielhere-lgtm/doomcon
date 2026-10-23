import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { render as notFound } from './notFound.mjs';
import { render as serverError } from './serverError.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  state: {
    generated_at: '2026-10-14T02:00:00Z',
    score: 55.5,
    level: 4,
    level_name: 'ROUTINE',
  },
};

describe('error pages SEO body links', () => {
  it('404 home CTA uses the live index question stem', () => {
    const html = notFound(ctx);
    assert.match(html, /href="\/">AI activity index today · AI activity level today · SIREN →<\/a>/);
    assert.doesNotMatch(html, /href="\/">Back to the index →<\/a>/);
    assert.match(html, /noindex/);
  });

  it('500 home and feedback links use question H1s', () => {
    const html = serverError(ctx);
    assert.match(html, /href="\/">AI activity index today · AI activity level today · SIREN →<\/a>/);
    assert.doesNotMatch(html, /href="\/">Back to the index →<\/a>/);
    assert.match(html, /href="\/feedback\.html">How do I report a problem or send an idea to SIREN\?<\/a>/);
    assert.doesNotMatch(html, /href="\/feedback\.html">feedback form<\/a>/);
    assert.match(html, /noindex/);
  });
});

describe('404 search', () => {
  it('offers a search box prefilled from the missing path, in present tense', () => {
    const h = notFound({ url: (p) => `https://siren.watch${p}`, href: (p) => p, cardFor: () => null, state: { level: 4, level_name: 'ROUTINE', score: 53, generated_at: '2026-10-23T00:00:00Z', pillars: [] } });
    assert.match(h, /<form class="nf__q" action="\/search\.html" method="get" role="search">/);
    assert.match(h, /id="nf-q" name="q"/);
    assert.doesNotMatch(h, /won't be back|will not impute/);
  });
});
