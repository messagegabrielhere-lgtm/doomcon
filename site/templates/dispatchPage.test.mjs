import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'static');
const html = readFileSync(join(root, 'dispatch.html'), 'utf8');

describe('dispatch page SEO', () => {
  it('ships a question-shaped title, speakable WebPage, and matching FAQPage', () => {
    assert.match(html, /<title>What public feeds does SIREN Dispatch show\?/);
    assert.match(html, /<h1>What public feeds does SIREN Dispatch show\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /Is Dispatch an emergency service\?/);
    assert.match(html, /Does Dispatch move the SIREN score\?/);
    assert.match(html, /Which cities have open CAD\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"WebPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /threats\.html/);
    assert.match(html, /monitor\.html/);
    assert.match(html, /What could take the machines offline tonight\?/);
    assert.match(html, /World Monitor/);
    assert.match(html, /never moves the SIREN score/);
    assert.match(html, /document\.title = "What public feeds does SIREN Dispatch show\? · SIREN"/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /call 911 from this page|probability of doom/i);
    assert.doesNotMatch(html, /noindex/);
  });
});
