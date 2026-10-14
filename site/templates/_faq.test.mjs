import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { items, linkifyAnswer, render, jsonLd, faqPathLabels } from './_faq.mjs';

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
    assert.match(linked, /href="\/compare\.html">Which AI doom indexes can you compare\?<\/a>/);
    assert.match(linked, /href="\/people\/">Which AI leaders have press coverage pages on SIREN\?<\/a>/);
    assert.doesNotMatch(linked, /href="\/compare\.html">\/compare\.html<\/a>/);
    assert.doesNotMatch(linked, /href="\/people\/">\/people\/<\/a>/);
    assert.doesNotMatch(linked, /&lt;a /);
    assert.ok(faqPathLabels().every(([p, l]) => p.startsWith('/') && /\?|methodology/.test(l)));
  });

  it('renders people and tags in the FAQ footer and body links', () => {
    const html = render(ctx);
    assert.match(html, /Where are the AI leader and topic pages/);
    assert.match(html, /href="\/people\/">Which AI leaders have press coverage pages on SIREN\?<\/a>/);
    assert.match(html, /href="\/tags\/">Which AI news tags have SIREN pages\?<\/a>/);
    assert.match(html, /href="\/item\/archive\.html">Which older AI stories has SIREN kept in the archive\?<\/a>/);
    assert.match(html, /href="\/compare\.html">Which AI doom indexes can you compare\?<\/a>/);
    assert.match(html, /href="\/ai-doomsday-clock\.html">Is there an AI doomsday clock\?<\/a>/);
    assert.match(html, /href="\/p-doom\.html">What is p\(doom\)\?<\/a>/);
    assert.match(html, /href="\/guide\.html">How does SIREN compare to DEFCON, the Doomsday Clock and p\(doom\)\?<\/a>/);
    assert.match(html, /How does SIREN compare to DEFCON, the Doomsday Clock and p\(doom\)\?/);
    assert.match(html, /Which AI doom indexes can you compare\?/);
    assert.match(html, /Which AI indexes does SIREN contrast\?/);
    assert.match(html, /What are AI doom index alternatives\?/);
    assert.match(html, /Which AI leaders have press coverage pages on SIREN\?/);
    assert.match(html, /Which AI news tags have SIREN pages\?/);
    assert.doesNotMatch(html, /href="\/compare\.html">\/compare\.html<\/a>/);
    assert.doesNotMatch(html, /href="\/people\/">\/people\/<\/a>/);
    assert.doesNotMatch(html, /AI explainers hub →/);
    assert.doesNotMatch(html, /Alternatives hub →/);
    assert.doesNotMatch(html, /Versus directory →/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom/i);
  });

  it('includes Meet Tally and war-room questions mirrored from home H2s', () => {
    const qa = items(ctx);
    assert.ok(qa.some(([q]) => q === 'Who is Tally, the duty canary?'));
    assert.ok(qa.some(([q]) => q === 'What is in the war room?'));
    assert.ok(!qa.some(([q]) => q === 'Who is Tally?'));
    const html = render(ctx);
    assert.match(html, /Who is Tally, the duty canary\?/);
    assert.match(html, /What is in the war room\?/);
    assert.doesNotMatch(html, /probability of doom/i);
  });
});
