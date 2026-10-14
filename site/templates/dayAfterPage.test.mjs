import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'static');
const html = readFileSync(join(root, 'day-after.html'), 'utf8');

describe('day-after page', () => {
  it('ships a question-shaped title, speakable WebPage, and matching FAQPage', () => {
    assert.match(html, /<title>What happens the day after an AI catastrophe\?/);
    assert.match(html, /<h1>What happens the day after an <b>AI catastrophe<\/b>\?<\/h1>/);
    assert.match(html, /QUESTIONS PEOPLE ACTUALLY ASK|What questions do people actually ask?/i);
    assert.match(html, /Is this a forecast\?/);
    assert.match(html, /Does the game describe how to cause harm\?/);
    assert.match(html, /Where is the real-world backlash watch\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"WebPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /"@type":\s*"Game"/);
    assert.match(html, /not a forecast/i);
    assert.match(html, /self-aware\.html/);
    assert.match(html, /threats\.html/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /this is a forecast/i);
    assert.doesNotMatch(html, /how to (cause|launch|run) (a |an )?(cyberattack|attack)/i);
    assert.doesNotMatch(html, /probability of doom/i);
    assert.doesNotMatch(html, /noindex/);
  });
});
