import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { render } from './betsPage.mjs';

const bets = JSON.parse(readFileSync(new URL('../../data/bets.json', import.meta.url), 'utf8'));

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  routes: { bets: true },
  bets,
  state: { generated_at: '2026-10-13T15:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE' },
};

describe('bets page', () => {
  it('ships a question-shaped title, speakable Dataset, and matching FAQPage', () => {
    const html = render(ctx);
    assert.match(html, /<title>Does the SIREN index make forecasts\?/);
    assert.match(html, /<h1 class="bp__h1">Does the SIREN index make forecasts\?<\/h1>/);
    assert.match(html, /What questions do people actually ask\?/);
    assert.match(html, /Are these bets about the world or what AI does next\?/);
    assert.match(html, /How are the probabilities set\?/);
    assert.match(html, /Can bets be edited or deleted\?/);
    assert.match(html, /id="bt-open-h">Which bets are open right now\?<\/h2>/);
    assert.match(html, /id="bt-track-h">What is the track record so far\?<\/h2>/);
    assert.match(html, /id="bt-rules-h">What are the rules for these bets\?<\/h2>/);
    assert.match(html, /id="bt-limit-h">What can a base rate not see\?<\/h2>/);
    assert.match(html, /FAQPage[\s\S]*Which bets are open right now\?/);
    assert.match(html, /FAQPage[\s\S]*What is the track record so far\?/);
    assert.match(html, /FAQPage[\s\S]*What can a base rate not see\?/);
    assert.doesNotMatch(html, /id="bt-open-h">Open bets<\/h2>/);
    assert.doesNotMatch(html, /id="bt-track-h">The track record<\/h2>/);
    assert.doesNotMatch(html, /id="bt-rules-h">The rules<\/h2>/);
    assert.doesNotMatch(html, /id="bt-limit-h">What a base rate cannot see<\/h2>/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"Dataset"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/si-watch\.html/);
    assert.match(html, /\/instruments\.html/);
    assert.match(html, /The index does not predict/);
    assert.match(html, /href="\/methodology\.html">How the SIREN AI activity index is computed · methodology →<\/a>/);
    assert.doesNotMatch(html, /href="\/methodology\.html">How the index is computed →<\/a>/);
    assert.match(html, /href="\/">AI activity index today · SIREN →<\/a>/);
    assert.doesNotMatch(html, /href="\/">The current reading →<\/a>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /the index predicts/i);
    assert.doesNotMatch(html, /these are bets about the world/i);
    assert.doesNotMatch(html, /probability of doom/i);
    assert.doesNotMatch(html, /noindex/);
  });
});
