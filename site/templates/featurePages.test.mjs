import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { breakthroughs, pickBreakthroughs } from './featurePages.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  routes: { bliss: true, medicine: true },
  state: { generated_at: '2026-10-10T02:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE' },
};

const sample = [
  {
    id: 'bt-1',
    title: 'AI drug discovers new antibiotic for rare disease',
    url: 'https://example.com/drug',
    source: 'nature',
    published_at: '2026-10-01T12:00:00Z',
    field: 'Medicine',
  },
  {
    id: 'bt-2',
    title: 'Math theorem solved with AI proof assistant',
    url: 'https://example.com/math',
    source: 'arxiv',
    published_at: '2026-09-28T12:00:00Z',
    field: 'Math & science',
  },
];

describe('breakthroughs page', () => {
  it('picks helping headlines and refuses lawsuit false friends', () => {
    const picked = pickBreakthroughs([
      { id: 'a', title: 'AI drug discovers new antibiotic for rare disease', kind: 'news' },
      { id: 'b', title: 'AI company sued over deepfake scam', kind: 'news' },
      { id: 'c', title: 'Paper on protein folding', kind: 'paper' },
    ]);
    assert.equal(picked.length, 1);
    assert.equal(picked[0].id, 'a');
  });

  it('ships a question-shaped title, speakable CollectionPage, and matching FAQPage', () => {
    const html = breakthroughs(ctx, sample);
    assert.match(html, /<title>What AI breakthroughs has SIREN tracked\?/);
    assert.match(html, /<h1 class="bp__h1">What AI breakthroughs has SIREN tracked\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /Is every headline here a verified breakthrough\?/);
    assert.match(html, /What kinds of upside stories appear on this page\?/);
    assert.match(html, /Where else does SIREN track the upside of AI\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"CollectionPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/bliss\.html/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /verified cure/i);
    assert.doesNotMatch(html, /noindex/);
  });

  it('empty list keeps the question title', () => {
    const html = breakthroughs(ctx, []);
    assert.match(html, /What AI breakthroughs has SIREN tracked\?/);
    assert.match(html, /No breakthrough stories in the current window/);
  });
});
