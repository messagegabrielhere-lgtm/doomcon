import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'static');
const html = readFileSync(join(root, 'prepper-checklist.html'), 'utf8');

describe('prepper-checklist page', () => {
  it('ships a question-shaped title, speakable WebPage, and matching FAQPage', () => {
    assert.match(html, /<title>What belongs in a 72-hour prepper kit\?/);
    assert.match(html, /<h1>What belongs in a 72-hour prepper kit\?<\/h1>/);
    assert.match(html, /What questions do people actually ask\?/);
    assert.match(html, /Is this professional emergency advice\?/);
    assert.match(html, /Where do the water and food amounts come from\?/);
    assert.match(html, /Where can I find the gear crates\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"WebPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /bunker-kit\.html/);
    assert.match(html, /What free tools belong in a bunker kit\?/);
    assert.match(html, /bug-out-land\.html/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /Judgment Day is coming/i);
    assert.doesNotMatch(html, /this is professional (emergency )?advice/i);
    assert.doesNotMatch(html, /probability of doom/i);
    assert.doesNotMatch(html, /noindex/);
  });
});
