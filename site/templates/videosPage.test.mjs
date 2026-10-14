import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { videos } from './mediaPages.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  state: { generated_at: '2026-10-13T15:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE' },
};

describe('videos page', () => {
  it('ships a question-shaped title, speakable CollectionPage, and matching FAQPage', () => {
    const html = videos(ctx);
    assert.match(html, /<title>What free AI explainer videos does SIREN publish\?/);
    assert.match(html, /<h1 class="bp__h1">What free AI explainer videos does SIREN publish\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /Do the videos work on mute\?/);
    assert.match(html, /Can I share them\?/);
    assert.match(html, /Where is the soundtrack music\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"CollectionPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /VideoObject/);
    assert.match(html, /\/radio\.html/);
    assert.match(html, /work on mute/);
    const body = html.match(/<div class="md-vids">[\s\S]*?<section class="md-faq"/);
    assert.ok(body, 'expected videos body before FAQ');
    assert.match(body[0], /href="\/radio\.html">What free music does SIREN Radio play\?<\/a>/);
    assert.match(body[0], /href="\/elon\.html">Where can you find real clips of AI leaders\?<\/a>/);
    assert.match(body[0], /href="\/history\.html">What is the history of AI risk\? →<\/a>/);
    assert.match(body[0], /href="\/">AI activity index today · SIREN →<\/a>/);
    assert.match(body[0], /href="\/tally\.html">Who is Tally, the SIREN duty canary\? →<\/a>/);
    assert.match(body[0], /href="\/methodology\.html">How the SIREN AI activity index is computed · methodology →<\/a>/);
    assert.match(body[0], /href="\/si-ready\.html">Ready for superintelligence\? →<\/a>/);
    assert.match(body[0], /href="\/ai-proof-job\.html">How do I AI-proof my job\? →<\/a>/);
    assert.match(body[0], /href="\/bunker-kit\.html">What free tools belong in a bunker kit\? →<\/a>/);
    assert.doesNotMatch(body[0], /Open the page →/);
    assert.doesNotMatch(body[0], /href="\/radio\.html">Tune in to SIREN Radio<\/a>/);
    assert.doesNotMatch(body[0], /href="\/elon\.html">Real Clips<\/a>/);
    const faqKey = html.match(/<p class="md-faq-key">([\s\S]*?)<\/p>/);
    assert.ok(faqKey, 'expected md-faq-key');
    assert.match(faqKey[1], /href="\/live\.html">What AI is on TV and radio right now\?<\/a>/);
    assert.match(faqKey[1], /href="\/elon\.html">Where can you find real clips of AI leaders\?<\/a>/);
    assert.doesNotMatch(html, /BreadcrumbList[\s\S]*?"name"\s*:\s*"Videos"/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /videos (are|as) (a )?forecast/i);
    assert.doesNotMatch(html, /probability of doom/i);
    assert.doesNotMatch(html, /noindex/);
  });
});
