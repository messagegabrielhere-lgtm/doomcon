import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { items, linkifyAnswer, render, jsonLd } from './_faq.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  state: { score: 51.4, level: 4, level_name: 'ROUTINE', generated_at: '2026-10-12T18:00:00Z' },
};

describe('homepage FAQ', () => {
  it('keeps JSON-LD answers as plain text and linkifies HTML answers', () => {
    const qa = items(ctx);
    assert.ok(qa.some(([q]) => /leader and topic/i.test(q)));
    const alt = qa.find(([q]) => /DoomBench|Skynet/i.test(q));
    assert.ok(alt[1].includes('/compare.html'));
    const ld = jsonLd(ctx);
    assert.equal(ld['@type'], 'FAQPage');
    assert.ok(ld.mainEntity.every((q) => !String(q.acceptedAnswer.text).includes('<a ')));

    const linked = linkifyAnswer(ctx, 'See /compare.html and /people/ next.');
    assert.match(linked, /href="\/compare\.html"/);
    assert.match(linked, /href="\/people\/"/);
    assert.doesNotMatch(linked, /&lt;a /);
  });

  it('renders people and tags in the FAQ footer and body links', () => {
    const html = render(ctx);
    assert.match(html, /Where are the AI leader and topic pages/);
    assert.match(html, /href="\/people\/"/);
    assert.match(html, /href="\/tags\/"/);
    assert.match(html, /href="\/compare\.html"/);
    assert.match(html, /href="\/ai-doomsday-clock\.html"/);
  });
});
