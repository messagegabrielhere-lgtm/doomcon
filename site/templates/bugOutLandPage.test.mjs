import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { land } from './agentPages.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  routes: { waffle: true },
  state: { generated_at: '2026-10-13T15:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE' },
};

describe('bug-out-land page', () => {
  it('ships a question-shaped title, speakable WebPage, and matching FAQPage', () => {
    const html = land(ctx);
    assert.match(html, /<title>Where to buy remote land to ride out Skynet\?/);
    assert.match(html, /<h1 class="bp__h1">Where to buy remote land to ride out Skynet\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /Is this a forecast that Skynet is coming\?/);
    assert.match(html, /Is this real-estate or financial advice\?/);
    assert.match(html, /What else does SIREN cover for supplies\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"WebPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/prepper-checklist\.html/);
    assert.match(html, /\/waffle\.html/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    // Refuse affirmative Skynet-as-forecast claims; the FAQ question "Is this a
    // forecast that Skynet is coming?" is allowed (and answered as a joke).
    assert.doesNotMatch(html, /Skynet is coming\.|Skynet will (come|arrive|happen)/i);
    assert.doesNotMatch(html, /probability of (Skynet|doom)/i);
    assert.doesNotMatch(html, /this is real-estate advice/i);
    assert.doesNotMatch(html, /noindex/);
  });
});
