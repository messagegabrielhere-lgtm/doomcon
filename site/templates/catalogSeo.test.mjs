import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { catalog } from './catalogPages.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  state: { generated_at: '2026-10-13T15:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE' },
};

const entries = [
  { type: 'page', url: '/race.html', title: 'The Race', desc: 'Labs ranked.', group: 'LIVE INTEL', icon: 'radar' },
  { type: 'tool', url: '/scanner.html', title: 'Scanner', desc: 'Screen stocks.', icon: 'px:crosshair' },
  { type: 'game', url: '/contain.html', title: 'Containment', desc: 'Arcade.', icon: 'px:core' },
];

describe('catalog page SEO', () => {
  it('ships a question-shaped title, speakable CollectionPage, and matching FAQPage', () => {
    const html = catalog(ctx, entries);
    assert.match(html, /<title>Where is everything on SIREN listed\?/);
    assert.match(html, /<h1 class="bp__h1">Where is everything on SIREN listed\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /How do I filter the catalog\?/);
    assert.match(html, /Where do I find stories, leaders and Bunker Kit tools\?/);
    assert.match(html, /What kinds of things are listed\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"CollectionPage"/);
    assert.match(html, /ItemList/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/live\.html/);
    assert.match(html, /\/search\.html/);
    assert.match(html, /How do you search everything on SIREN\?/);
    assert.match(html, /one directory/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /catalog of doom/i);
    assert.doesNotMatch(html, /probability of doom/i);
    assert.doesNotMatch(html, /noindex/);
  });
});
