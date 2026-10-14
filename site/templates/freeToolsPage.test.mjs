import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { freeToolsPage, freeToolRows } from './freeToolsPage.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  state: {
    generated_at: '2026-10-14T20:00:00Z',
    score: 55.4,
    level: 4,
    level_name: 'ROUTINE',
    pillars: [],
  },
};

describe('free-tools listicle', () => {
  it('lists real instruments with question H1, ItemList, and matching FAQ', () => {
    const html = freeToolsPage(ctx);
    const rows = freeToolRows();
    assert.ok(rows.length >= 8);
    assert.match(html, /<title>What free tools does SIREN publish\?/);
    assert.match(html, /<h1>What free tools does SIREN publish\?<\/h1>/);
    assert.match(html, /\/verify\.html/);
    assert.match(html, /How do you check a SIREN reading yourself\?/);
    assert.match(html, /\/alerts\.html/);
    assert.match(html, /\/export\.html/);
    assert.match(html, /CollectionPage/);
    assert.match(html, /ItemList/);
    assert.match(html, /FAQPage[\s\S]*Does SIREN ship a doom-probability calculator\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /None of them is a doom-probability calculator/);
    assert.doesNotMatch(html, /probability of doom/i);
    assert.doesNotMatch(html, /noindex/);
    for (const row of rows) {
      assert.match(html, new RegExp(row.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
  });
});
