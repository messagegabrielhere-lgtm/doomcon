import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { GUIDES, aiClock, guides, guidesMd, pdoom } from './infoPages.mjs';

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
  it('lists evergreen explainers with ItemList and FAQ schema', () => {
    assert.ok(GUIDES.length >= 7);
    assert.ok(GUIDES.some((g) => g.path === '/p-doom.html'));
    assert.ok(GUIDES.some((g) => g.path === '/ai-doomsday-clock.html'));
    assert.ok(GUIDES.some((g) => g.path === '/vs.html'));
    const html = guides(ctx);
    assert.match(html, /AI explainers/);
    assert.match(html, /\/guides\.html/);
    assert.match(html, /ItemList/);
    assert.match(html, /FAQPage/);
    assert.match(html, /\/p-doom\.html/);
    assert.match(html, /\/ai-doomsday-clock\.html/);
    assert.match(html, /\/compare\.html/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom is \d/i);
    assert.match(html, /guides\.md/);
    assert.match(html, /rel="alternate"[^>]*guides\.md/);
  });

  it('ships a markdown mirror for agents', () => {
    const md = guidesMd(ctx);
    assert.match(md, /^# AI explainers/m);
    assert.match(md, /\/guides\.html/);
    assert.match(md, /\/p-doom\.html/);
    assert.match(md, /\/ai-doomsday-clock\.html/);
    assert.doesNotMatch(md, /doom score:\s*\d/i);
  });

  it('ai-doomsday-clock uses a question-shaped head-term title', () => {
    const html = aiClock(ctx);
    assert.match(html, /<title>Is there an AI doomsday clock\? Bulletin vs verifiable count/);
    assert.match(html, /Is there an AI Doomsday Clock\?/);
    assert.match(html, /Bulletin of the Atomic Scientists/);
    assert.match(html, /"@type"\s*:\s*"WebPage"/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /BreadcrumbList/);
    assert.doesNotMatch(html, /probability of doom is \d/i);
    assert.doesNotMatch(html, /SIREN.*p\(doom\) of \d/i);
  });

  it('p-doom ships WebPage speakable + breadcrumbs with FAQ', () => {
    const html = pdoom(ctx);
    assert.match(html, /What is p\(doom\)\?/);
    assert.match(html, /"@type"\s*:\s*"FAQPage"/);
    assert.match(html, /"@type"\s*:\s*"WebPage"/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /BreadcrumbList/);
    assert.doesNotMatch(html, /SIREN.*p\(doom\) of \d/i);
  });
});
