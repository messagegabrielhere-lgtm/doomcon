import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { verifyPage } from './verifyPage.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  state: {
    generated_at: '2026-10-14T20:00:00Z',
    score: 55.4,
    level: 4,
    level_name: 'ROUTINE',
    receipt_id: '2026-10-14T20-00-00Z',
    receipt_hash: 'sha256:abcdef0123456789abcdef0123456789',
    pillars: [],
  },
};

describe('verify free-tool page', () => {
  it('ships question H1, WebApplication, matching FAQ, and the receipt checker', () => {
    const html = verifyPage(ctx);
    assert.match(html, /<title>How do you check a SIREN reading yourself\?/);
    assert.match(html, /id="vfy-page-h">How do you check a SIREN reading yourself\?<\/h1>/);
    assert.match(html, /id="vfy"/);
    assert.match(html, /data-vfy-go/);
    assert.match(html, /WebApplication/);
    assert.match(html, /FAQPage[\s\S]*What does the browser check prove\?/);
    assert.match(html, /FAQPage[\s\S]*What does the browser check not prove\?/);
    assert.match(html, /FAQPage[\s\S]*Does verifying a reading move the SIREN score\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/free-tools\.html/);
    assert.match(html, /\/methodology\.html/);
    assert.doesNotMatch(html, /id="vfy-h">/);
    assert.doesNotMatch(html, /probability of doom/i);
    assert.doesNotMatch(html, /noindex/);
  });
});
