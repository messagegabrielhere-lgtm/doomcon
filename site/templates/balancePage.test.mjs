import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { hasBalancePage, render } from './balancePage.mjs';

const balance = JSON.parse(readFileSync(new URL('../../data/balance.json', import.meta.url), 'utf8'));
const ledger = JSON.parse(readFileSync(new URL('../../data/ledger.json', import.meta.url), 'utf8'));

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  routes: { balance: true, bliss: true },
  state: { generated_at: '2026-10-10T02:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE' },
  balance,
  ledger,
};

describe('balance page', () => {
  it('gates on balance + ledger payload', () => {
    assert.equal(hasBalancePage(ctx), true);
    assert.equal(hasBalancePage({}), false);
  });

  it('ships a question-shaped title, speakable Dataset, and matching FAQPage', () => {
    const html = render(ctx);
    assert.match(html, /<title>How does SIREN count AI harm and benefit side by side\?/);
    assert.match(html, /<h1 class="bp__h1">How does SIREN count AI harm and benefit side by side\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /Does the balance feed the main SIREN number\?/);
    assert.match(html, /Is there a net score of harm versus benefit\?/);
    assert.match(html, /What do the newsroom word-list counts measure\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"Dataset"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/bliss\.html/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /net score of good versus evil/i);
    assert.doesNotMatch(html, /noindex/);
  });

  it('empty build keeps the question title and noindexes', () => {
    const html = render({ url: ctx.url, href: ctx.href, state: ctx.state });
    assert.match(html, /How does SIREN count AI harm and benefit side by side\?/);
    assert.match(html, /noindex/);
  });
});
