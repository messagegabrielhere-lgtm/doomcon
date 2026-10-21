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
    assert.match(html, /What questions do people actually ask\?/);
    assert.match(html, /"@type"\s*:\s*"FAQPage"/);
    assert.match(html, /speakable/);
    assert.match(html, /Dataset/);
    assert.match(html, /Does SIREN publish an AI race doom score\?/);
    assert.match(html, /market odds and observable activity/i);
    assert.match(html, /class="rjump"/);
    assert.match(html, /href="#rgfx-h">Jump to the live race charts/);
    assert.match(html, /href="#rtb-h">Jump to the ranked board/);
    assert.match(html, /id="rgfx-h"[^>]*>How do the labs sit on one axis\?/);
    assert.match(html, /id="rgfx-move-h"[^>]*>How did each lab change over seven days\?/);
    assert.match(html, /id="rpart-h"[^>]*>How are the odds split across the board\?/);
    assert.match(html, /id="rtb-h"[^>]*>Who leads the AI race board\?/);
    assert.match(html, /id="rsrc-h"[^>]*>How healthy are the race sources\?/);
    assert.match(html, /id="rmeth-h"[^>]*>How is the race board computed\?/);
    assert.match(html, /class="rmeth__h3">What does a blank reading mean\?<\/h3>/);
    assert.doesNotMatch(html, /class="rmeth__h3">What a blank reading means<\/h3>/);
    assert.match(html, /"name"\s*:\s*"What does a blank reading mean\?"/);
    assert.doesNotMatch(html, /id="rgfx-h"[^>]*>Every lab on one axis</);
    assert.doesNotMatch(html, /id="rtb-h"[^>]*>The leaderboard</);
    assert.doesNotMatch(html, /id="rsrc-h"[^>]*>Source health</);
    assert.doesNotMatch(html, /id="rmeth-h"[^>]*>How this is computed</);
    assert.match(html, /href="\/news\.html">Which AI stories has SIREN scored in this window\?<\/a>/);
    assert.doesNotMatch(html, /href="\/news\.html">the signal feed<\/a>/);
    // FINDABILITY #144 — race board lab links use labAboutLabel (#121 aliases).
    assert.match(html, /rpill__name"><a href="\/lab\/openai\.html">What has SIREN scored about OpenAI \/ ChatGPT\?<\/a>/);
    assert.match(html, /rpill__name"><a href="\/lab\/anthropic\.html">What has SIREN scored about Anthropic \/ Claude\?<\/a>/);
    assert.match(html, /rpill__name"><a href="\/lab\/google-deepmind\.html">What has SIREN scored about Google DeepMind \/ Gemini \/ Argon\?<\/a>/);
    assert.doesNotMatch(html, /rpill__name"><a href="\/lab\/openai\.html">What has SIREN scored about OpenAI\?<\/a>/);
    assert.doesNotMatch(html, /rpill__name"><a href="\/lab\/openai\.html">OpenAI<\/a>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
  });
});
