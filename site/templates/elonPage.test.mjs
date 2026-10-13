import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'static');
const html = readFileSync(join(root, 'elon.html'), 'utf8');

describe('elon / Real Clips page', () => {
  it('ships a question-shaped title, speakable WebPage, and matching FAQPage', () => {
    assert.match(html, /<title>Where can you find real clips of AI leaders\?/);
    assert.match(html, /<h1>Where can you find real clips of AI leaders\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /How do you know a clip is real\?/);
    assert.match(html, /Are YouTube trends verified\?/);
    assert.match(html, /Can I check a clip I found\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"WebPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /live\.html/);
    assert.match(html, /videos\.html/);
    assert.match(html, /What AI is on TV and radio right now\?/);
    assert.match(html, /What free AI explainer videos does SIREN publish\?/);
    assert.match(html, /id="h-topic"/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /we endorse|probability of doom/i);
    assert.doesNotMatch(html, /judge a clip by looking and trust it/i);
    assert.doesNotMatch(html, /noindex/);
  });
});
