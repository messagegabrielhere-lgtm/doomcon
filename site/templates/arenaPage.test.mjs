import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'static');
const html = readFileSync(join(root, 'arena.html'), 'utf8');

describe('arena page SEO', () => {
  it('ships a question-shaped title, speakable WebPage, and matching FAQPage', () => {
    assert.match(html, /<title>What does SIREN Arena show\?/);
    assert.match(html, /<h1[^>]*>What does SIREN Arena show\?<\/h1>/);
    assert.match(html, /What questions do people actually ask\?/);
    assert.match(html, /Is Arena financial advice\?/);
    assert.match(html, /Does Arena move the SIREN score\?/);
    assert.match(html, /Where does Arena data come from\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"WebPage"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /id="battle"/);
    assert.match(html, /id="view-battle"/);
    assert.match(html, /scanner\.html/);
    assert.match(html, /game\.html/);
    assert.match(html, /What does the SIREN Capitulation Scanner show\?/);
    assert.match(html, /How do you play Tally Counts\?/);
    assert.match(html, /never moves the SIREN score/);
    assert.match(html, /Nothing here is financial advice/);
    assert.match(html, /document\.title = "What does SIREN Arena show\? · SIREN"/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom|buy this stock now/i);
    assert.doesNotMatch(html, /noindex/);
  });
});
