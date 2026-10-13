import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'static');
const html = readFileSync(join(root, 'contain.html'), 'utf8');

describe('contain page', () => {
  it('ships a question-shaped title, speakable WebPage, and matching FAQPage', () => {
    assert.match(html, /<title>Can you stop an AI breakout\?/);
    assert.match(html, /<h1>Can you stop an <b>AI breakout<\/b>\?<\/h1>/);
    assert.match(html, /QUESTIONS PEOPLE ACTUALLY ASK/);
    assert.match(html, /Is Containment a forecast\?/);
    assert.match(html, /Does difficulty follow the live SIREN level\?/);
    assert.match(html, /Where are more SIREN games\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"WebPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /"@type":\s*"VideoGame"/);
    assert.match(html, /not a forecast/i);
    assert.match(html, /day-after\.html/);
    assert.match(html, /self-aware\.html/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /this is a forecast/i);
    assert.doesNotMatch(html, /how to (cause|launch) (a )?breakout/i);
    assert.doesNotMatch(html, /probability of doom/i);
    assert.doesNotMatch(html, /noindex/);
  });
});
