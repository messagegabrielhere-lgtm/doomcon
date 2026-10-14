import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { render } from './gamesPage.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  state: { generated_at: '2026-10-13T15:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE' },
};

describe('games page', () => {
  it('ships a question-shaped title, speakable CollectionPage, and matching FAQPage', () => {
    const html = render(ctx);
    assert.match(html, /<title>What free AI games can you play on SIREN\?/);
    assert.match(html, /<h1 class="bp__h1">What free AI games can you play on SIREN\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /Do I need an account or install\?/);
    assert.match(html, /Where is Containment\?/);
    assert.match(html, /Is there music while you play\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"CollectionPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/contain\.html/);
    assert.match(html, /\/day-after\.html/);
    assert.match(html, /href="\/contain\.html"[^>]*>[\s\S]*?<b>Can you stop an AI breakout\?<\/b>/);
    assert.match(html, /href="\/game\.html"[^>]*>[\s\S]*?<b>How do you play Tally Counts\?<\/b>/);
    assert.match(html, /href="\/day-after\.html"[^>]*>[\s\S]*?<b>What happens the day after an AI catastrophe\?<\/b>/);
    assert.match(html, /href="\/self-aware\.html"[^>]*>[\s\S]*?<b>What if an AI wakes up at 2:14 a\.m\.\?<\/b>/);
    assert.match(html, /href="\/arena\.html#battle"[^>]*>[\s\S]*?<b>What does SIREN Arena show\?<\/b>/);
    assert.match(html, /href="\/bets\.html"[^>]*>[\s\S]*?<b>Does the SIREN index make forecasts\?<\/b>/);
    assert.match(html, /href="\/p-doom\.html#voices"[^>]*>[\s\S]*?<b>What is p\(doom\)\?<\/b>/);
    assert.match(html, /href="\/si-ready\.html"[^>]*>[\s\S]*?<b>Ready for superintelligence\?<\/b>/);
    assert.match(html, /href="\/ai-proof-job\.html"[^>]*>[\s\S]*?<b>How do I AI-proof my job\?<\/b>/);
    assert.doesNotMatch(html, /<b>Containment<\/b>/);
    assert.doesNotMatch(html, /<b>Signal or Noise<\/b>/);
    assert.doesNotMatch(html, /<b>The Day After<\/b>/);
    assert.match(html, /No sign-up/);
    const music = html.match(/<div class="gm-g">[\s\S]*?<\/div>\s*<p>([\s\S]*?)<\/p>/);
    assert.ok(music, 'expected music paragraph after game cards');
    assert.match(music[1], /Want music while you play\?/);
    assert.match(music[1], /href="\/radio\.html">What free music does SIREN Radio play\?<\/a>/);
    assert.doesNotMatch(music[1], /href="\/radio\.html">SIREN Radio<\/a>/);
    const faqKey = html.match(/<p class="gm-faq-key">([\s\S]*?)<\/p>/);
    assert.ok(faqKey, 'expected gm-faq-key');
    assert.match(faqKey[1], /href="\/videos\.html">What free AI explainer videos does SIREN publish\?<\/a>/);
    assert.match(html, /BreadcrumbList[\s\S]*?"name"\s*:\s*"AI activity index today · SIREN"/);
    assert.doesNotMatch(html, /BreadcrumbList[\s\S]*?"name"\s*:\s*"Home"/);
    assert.doesNotMatch(html, /BreadcrumbList[\s\S]*?"name"\s*:\s*"Games"/);
    const fine = html.match(/<p class="foot__fine"><b>Not advice\.<\/b>([\s\S]*?)<\/p>/);
    assert.ok(fine, 'expected layout legal footer');
    assert.match(fine[1], /href="\/terms\.html">What are the SIREN terms of use\?<\/a>/);
    assert.match(fine[1], /href="\/privacy\.html">What does SIREN know about you\?<\/a>/);
    assert.match(fine[1], /href="\/disclosures\.html">What does SIREN disclose\?<\/a>/);
    assert.doesNotMatch(fine[1], /href="\/privacy\.html">Privacy<\/a>/);
    assert.doesNotMatch(fine[1], /href="\/terms\.html">terms &amp; disclaimers<\/a>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /games (are|as) (a )?forecast/i);
    assert.doesNotMatch(html, /how to cause a takeover/i);
    assert.doesNotMatch(html, /probability of doom/i);
    assert.doesNotMatch(html, /noindex/);
  });
});
