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
    assert.match(html, /id="regions"[^>]*>Which regions do people look at for remote land\?/);
    assert.match(html, /id="checklist"[^>]*>What is the checklist before you buy\?/);
    assert.match(html, /id="listings"[^>]*>Where is land listed\?/);
    assert.match(html, /id="stock"[^>]*>What else does SIREN cover for supplies\?/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /Is this a forecast that Skynet is coming\?/);
    assert.match(html, /Is this real-estate or financial advice\?/);
    assert.match(html, /What else does SIREN cover for supplies\?/);
    assert.match(html, /Why look at Wyoming for remote land\?/);
    assert.match(html, /Why look at Montana for remote land\?/);
    assert.match(html, /Why look at Alaska for remote land\?/);
    assert.match(html, /Why check water before you buy\?/);
    assert.match(html, /Why check legal access before you buy\?/);
    assert.match(html, /Why check hazards before you buy\?/);
    assert.match(html, /FAQPage[\s\S]*Why look at Wyoming for remote land\?/);
    assert.match(html, /FAQPage[\s\S]*Why check water before you buy\?/);
    assert.doesNotMatch(html, /<h3>Wyoming<\/h3>/);
    assert.doesNotMatch(html, /<h3>✔ Water<\/h3>/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"WebPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/prepper-checklist\.html/);
    assert.match(html, /What belongs in a 72-hour prepper kit\?/);
    assert.match(html, /\/waffle\.html/);
    const stock = html.match(/id="stock"[^>]*>What else does SIREN cover for supplies\?<\/h2>\s*<p>([\s\S]*?)<\/p>/);
    assert.ok(stock, 'expected stock paragraph');
    assert.match(stock[1], /href="\/prepper-checklist\.html">What belongs in a 72-hour prepper kit\?<\/a>/);
    assert.match(stock[1], /href="\/bunker-kit\.html">What free tools belong in a bunker kit\?<\/a>/);
    assert.doesNotMatch(stock[1], /href="\/prepper-checklist\.html">Prepper Checklist<\/a>/);
    assert.doesNotMatch(stock[1], /href="\/bunker-kit\.html">Bunker Kit/);
    assert.doesNotMatch(html, /<h2>Regions people look at<\/h2>/);
    assert.doesNotMatch(html, /<h2>The checklist before you buy<\/h2>/);
    assert.doesNotMatch(html, /<h2>Where land is listed<\/h2>/);
    assert.doesNotMatch(html, /<h2>Then stock it<\/h2>/);
    assert.doesNotMatch(html, /BreadcrumbList[\s\S]*?"name"\s*:\s*"Bug-out land"/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    // Refuse affirmative Skynet-as-forecast claims; the FAQ question "Is this a
    // forecast that Skynet is coming?" is allowed (and answered as a joke).
    assert.doesNotMatch(html, /Skynet is coming\.|Skynet will (come|arrive|happen)/i);
    assert.doesNotMatch(html, /probability of (Skynet|doom)/i);
    assert.doesNotMatch(html, /this is real-estate advice/i);
    assert.doesNotMatch(html, /noindex/);
  });
});
