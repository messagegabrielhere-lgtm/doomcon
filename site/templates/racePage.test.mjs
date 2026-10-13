import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { render, hasRace } from './racePage.mjs';

const race = JSON.parse(readFileSync(new URL('../../data/race.json', import.meta.url), 'utf8'));

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  state: {
    generated_at: '2026-10-13T02:00:00Z',
    score: 49.1,
    level: 4,
    level_name: 'ROUTINE',
    receipt_id: 'r1',
    pillars: [],
  },
  race,
};

describe('race page', () => {
  it('guards builds without a race board', () => {
    assert.equal(hasRace(ctx), true);
    assert.equal(hasRace({}), false);
  });

  it('ships question-shaped title, speakable, and visible FAQ matching schema', () => {
    const html = render(ctx);
    assert.match(html, /<title>Who is winning the AI race\?/);
    assert.match(html, /<h1 class="rintro__h1">Who is winning the AI race\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /"@type"\s*:\s*"FAQPage"/);
    assert.match(html, /speakable/);
    assert.match(html, /Dataset/);
    assert.match(html, /Does SIREN publish an AI race doom score\?/);
    assert.match(html, /market odds and observable activity/i);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
  });
});
