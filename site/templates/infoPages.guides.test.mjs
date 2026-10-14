import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { GUIDES, guides, guidesMd } from './infoPages.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  state: {
    generated_at: '2026-10-10T14:00:00Z',
    score: 55.5,
    level: 4,
    level_name: 'ROUTINE',
  },
};

describe('guides hub', () => {
  it('lists evergreen explainers with matching question H1 and FAQ schema', () => {
    assert.ok(GUIDES.length >= 7);
    assert.ok(GUIDES.some((g) => g.path === '/p-doom.html'));
    assert.ok(GUIDES.some((g) => g.path === '/ai-doomsday-clock.html'));
    assert.ok(GUIDES.some((g) => g.path === '/vs.html'));
    assert.ok(GUIDES.some((g) => g.path === '/history.html'));
    const html = guides(ctx);
    assert.match(html, /<title>What are the AI explainers\? p\(doom\), clocks, doom indexes/);
    assert.match(html, /<h1 class="bp__h1">What are the AI explainers\?<\/h1>/);
    assert.match(html, /What questions do people actually ask\?/);
    assert.match(html, /Where are the AI doom and p\(doom\) explainers\?/);
    assert.match(html, /Does SIREN publish a doom probability\?/);
    assert.match(html, /\/guides\.html/);
    assert.match(html, /ItemList/);
    assert.match(html, /FAQPage/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/p-doom\.html/);
    assert.match(html, /\/ai-doomsday-clock\.html/);
    assert.match(html, /\/history\.html/);
    assert.match(html, /\/compare\.html/);
    assert.match(html, /\/methodology\.html/);
    assert.match(html, /How does SIREN compare to DEFCON/);
    assert.match(html, /How the SIREN AI activity index is computed/);
    assert.match(html, /Which AI doom indexes can you compare\?/);
    assert.match(html, /Which AI indexes does SIREN contrast\?/);
    assert.match(html, /What are AI doom index alternatives\?/);
    assert.match(html, /eyebrow"><a href="\/guide\.html">How does SIREN compare to DEFCON/);
    assert.doesNotMatch(html, /eyebrow">Guides<\/p>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom is \d/i);
    assert.doesNotMatch(html, /noindex/);
    assert.match(html, /guides\.md/);
    assert.match(html, /rel="alternate"[^>]*guides\.md/);
    assert.match(html, /href="\/">AI activity index today · SIREN →<\/a>/);
    assert.match(html, /href="\/guides\.md">What are the AI explainers\?<\/a>/);
  });

  it('ships a markdown mirror for agents', () => {
    const md = guidesMd(ctx);
    assert.match(md, /^# What are the AI explainers\?/m);
    assert.match(md, /\/guides\.html/);
    assert.match(md, /\/p-doom\.html/);
    assert.match(md, /\/ai-doomsday-clock\.html/);
    assert.match(md, /AI activity index today · SIREN/);
    assert.match(md, /^## What else sits next to these AI explainers\?/m);
    assert.doesNotMatch(md, /^## Also$/m);
    assert.doesNotMatch(md, /doom score:\s*\d/i);
  });

  it('guides section H2s use questions mirrored in FAQPage', () => {
    const html = guides(ctx);
    assert.match(html, /<h2>What else sits next to these AI explainers\?<\/h2>/);
    assert.doesNotMatch(html, /<h2>Also<\/h2>/);
    assert.match(html, /"name"\s*:\s*"What else sits next to these AI explainers\?"/);
    assert.match(html, /the both-sides library/);
    assert.doesNotMatch(html, /probability of doom is \d/i);
  });
});
