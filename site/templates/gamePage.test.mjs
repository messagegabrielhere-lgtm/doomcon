import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'static');
const html = readFileSync(join(root, 'game.html'), 'utf8');

describe('game / Tally Counts page', () => {
  it('ships a question-shaped title, speakable WebPage, and matching FAQPage', () => {
    assert.match(html, /<title>How do you play Tally Counts\?/);
    assert.match(html, /<h1>How do you play Tally Counts\?<\/h1>/);
    assert.match(html, /What questions do people actually ask\?/);
    assert.match(html, /Does Tally Counts feed the SIREN index\?/);
    assert.match(html, /Where is my best score kept\?/);
    assert.match(html, /Is there a leaderboard\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"WebPage"/);
    assert.match(html, /VideoGame/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /games\.html/);
    assert.match(html, /desk\.html/);
    assert.match(html, /What free AI games can you play on SIREN\?/);
    assert.match(html, /What unserious counts does SIREN keep on Tally.s desk\?/);
    assert.match(html, /Nothing here feeds the index/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /feeds the doom|probability of doom/i);
    assert.doesNotMatch(html, /noindex/);
  });
});
