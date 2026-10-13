import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'static');
const html = readFileSync(join(root, 'bunker-kit.html'), 'utf8');

describe('bunker-kit page', () => {
  it('ships a question-shaped title, speakable WebPage, and matching FAQPage', () => {
    assert.match(html, /<title>What free tools belong in a bunker kit\?/);
    assert.match(html, /<h1>What free tools belong in a bunker kit\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /Are the 50 tools run by SIREN\?/);
    assert.match(html, /Are the supply-drop links paid\?/);
    assert.match(html, /Where is the household prepper checklist\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"WebPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /prepper-checklist\.html/);
    assert.match(html, /What belongs in a 72-hour prepper kit\?/);
    assert.match(html, /bug-out-land\.html/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /Skynet will take the internet/i);
    assert.doesNotMatch(html, /this is professional advice/i);
    assert.doesNotMatch(html, /probability of doom/i);
    assert.doesNotMatch(html, /noindex/);
  });
});
