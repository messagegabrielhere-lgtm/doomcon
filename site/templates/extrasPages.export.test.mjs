import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { exportPage } from './extrasPages.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  history: [{ t: 1 }, { t: 2 }],
  state: {
    generated_at: '2026-10-13T20:00:00Z',
    score: 47.7,
    level: 4,
    level_name: 'ROUTINE',
    pillars: [],
  },
};

describe('export page', () => {
  it('ships a question-shaped title, speakable WebPage, and matching FAQPage', () => {
    const html = exportPage(ctx);
    assert.match(html, /<title>How do I export and embed SIREN data\?/);
    assert.match(html, /<h1>How do I export and embed SIREN data\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /id="download">What can I download\?<\/h2>/);
    assert.match(html, /id="embed">How do I embed the current reading\?<\/h2>/);
    assert.match(html, /id="api">How do I use it from code\?<\/h2>/);
    assert.match(html, /id="licence">What is the licence and credit\?<\/h2>/);
    assert.match(html, /FAQPage[\s\S]*What can I download\?/);
    assert.match(html, /What files can I download\?/);
    assert.match(html, /Do I need an API key\?/);
    assert.match(html, /Does exporting move the SIREN score\?/);
    assert.match(html, /How do I download every reading as CSV\?/);
    assert.match(html, /How do I download every reading as JSON\?/);
    assert.match(html, /How do I download current pillars as CSV\?/);
    assert.match(html, /How do I download the current reading as JSON\?/);
    assert.match(html, /How do I download the current reading as one line of text\?/);
    assert.match(html, /Where is the API index\?/);
    assert.match(html, /What badge works when iframes are stripped\?/);
    assert.match(html, /How do I use it live in Google Sheets\?/);
    assert.match(html, /How do I embed the widget iframe\?/);
    assert.match(html, /How do I add the badge in HTML\?/);
    assert.match(html, /How do I fetch it from JavaScript\?/);
    assert.match(html, /What attribution line should I use\?/);
    assert.match(html, /FAQPage[\s\S]*How do I download every reading as CSV\?/);
    assert.match(html, /FAQPage[\s\S]*What badge works when iframes are stripped\?/);
    assert.doesNotMatch(html, />Every reading as CSV</);
    assert.doesNotMatch(html, />Every reading as JSON</);
    assert.doesNotMatch(html, />Current pillars as CSV</);
    assert.doesNotMatch(html, />API index</);
    assert.doesNotMatch(html, />Badge, for READMEs and newsletters that strip iframes</);
    assert.doesNotMatch(html, />Live in Google Sheets</);
    assert.doesNotMatch(html, />Widget \(iframe\)</);
    assert.doesNotMatch(html, />JavaScript</);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"WebPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /No key, no rate limit/);
    assert.match(html, /never moves the SIREN score/);
    assert.match(html, /\/alerts\.html/);
    assert.match(html, /\/agents\.html/);
    assert.match(html, /How do I get alerts when SIREN moves\?/);
    assert.match(html, /How should AI agents use SIREN\?/);
    assert.doesNotMatch(html, /id="download">Download<\/h2>/);
    assert.doesNotMatch(html, /id="embed">Embed<\/h2>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom/i);
    assert.doesNotMatch(html, /noindex/);
  });
});
