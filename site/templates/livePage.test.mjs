import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { render } from './livePage.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  state: { generated_at: '2026-10-13T15:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE' },
};

describe('live page', () => {
  it('ships a question-shaped title, speakable CollectionPage, and matching FAQPage', () => {
    const html = render(ctx, { live: { items: [] }, tv: { items: [] }, radio: { items: [] }, news_247: [] });
    assert.match(html, /<title>What AI is on TV and radio right now\?/);
    assert.match(html, /<h1 class="bp__h1">What AI is on TV and radio right now\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /Does anything autoplay\?/);
    assert.match(html, /Does SIREN endorse these streams\?/);
    assert.match(html, /Where else is live AI on SIREN\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"CollectionPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/radio\.html/);
    assert.match(html, /\/videos\.html/);
    assert.match(html, /nothing plays and no player loads/);
    assert.match(html, /Where are live X feeds and Spaces on AI\?/);
    assert.match(html, /Where can you find real clips of AI leaders\?/);
    assert.match(html, /Which AI stories has SIREN scored in this window\?/);
    const aboutNote = html.match(/<h2>About this room<\/h2>\s*<p class="lv-note">([\s\S]*?)<\/p>/);
    assert.ok(aboutNote, 'expected About this room lv-note');
    assert.match(aboutNote[1], /href="\/live-x\.html">Where are live X feeds and Spaces on AI\?<\/a>/);
    assert.match(aboutNote[1], /href="\/elon\.html">Where can you find real clips of AI leaders\?<\/a>/);
    assert.match(aboutNote[1], /href="\/news\.html">Which AI stories has SIREN scored in this window\?<\/a>/);
    assert.doesNotMatch(aboutNote[1], /href="\/live-x\.html">Live on X<\/a>/);
    assert.doesNotMatch(aboutNote[1], /href="\/elon\.html">Real Clips<\/a>/);
    assert.doesNotMatch(aboutNote[1], /href="\/news\.html">the Newsroom<\/a>/);
    assert.doesNotMatch(html, /"name"\s*:\s*"AI on TV & radio"/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /SIREN endorses these streams/i);
    assert.doesNotMatch(html, /probability of doom/i);
    assert.doesNotMatch(html, /noindex/);
  });
});
