import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { hasFlock, render } from './flockPage.mjs';

const flock = JSON.parse(readFileSync(new URL('../../data/flock.json', import.meta.url), 'utf8'));

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  routes: { flock: true, map: true },
  state: { generated_at: '2026-10-10T02:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE' },
  flock,
};

describe('flock page', () => {
  it('gates on flock payload', () => {
    assert.equal(hasFlock(ctx), true);
    assert.equal(hasFlock({}), false);
  });

  it('ships a question-shaped title, speakable Dataset, and matching FAQPage', () => {
    const html = render(ctx);
    assert.match(html, /<title>How many Flock ALPR cameras has SIREN mapped\?/);
    assert.match(html, /<h1 class="flk__h1">How many Flock ALPR cameras has SIREN mapped\?<\/h1>/);
    assert.match(html, /What questions do people actually ask\?/);
    assert.match(html, /Does a county with no pins have zero Flock cameras\?/);
    assert.match(html, /Does the Flock register feed the main SIREN number\?/);
    assert.match(html, /Is this a complete census of Flock cameras\?/);
    assert.match(html, /id="flk-warn-h"[\s\S]*?What should you read before the Flock map\?/);
    assert.match(html, /id="flk-map-h"[\s\S]*?Where are the mapped Flock ALPR cameras\?/);
    assert.match(html, /id="flk-jur-h"[\s\S]*?Which jurisdictions have mapped Flock cameras\?/);
    assert.match(html, /id="flk-lim-h"[\s\S]*?What is this Flock register not\?/);
    assert.match(html, /id="flk-method-h"[\s\S]*?Where did the Flock map data come from\?/);
    assert.match(html, /class="flk__sec__h3">How was the harvest tiled\?<\/h3>/);
    assert.match(html, /class="flk__sec__h3">How was geography assigned\?<\/h3>/);
    assert.match(html, /class="flk__sec__h3">What is the licence\?<\/h3>/);
    assert.match(html, /class="flk__sec__h3">How do you take the data\?<\/h3>/);
    assert.match(html, /class="flk__sec__h3">How do you recompute it\?<\/h3>/);
    assert.match(html, /class="flk__sec__h3">Which counties have the most mapped cameras\?<\/h3>/);
    assert.doesNotMatch(html, /class="flk__sec__h3">The harvest<\/h3>/);
    assert.doesNotMatch(html, /class="flk__sec__h3">Geography<\/h3>/);
    assert.doesNotMatch(html, /class="flk__sec__h3">Take the data<\/h3>/);
    assert.match(html, /"name"\s*:\s*"How was the harvest tiled\?"/);
    assert.match(html, /"name"\s*:\s*"Which counties have the most mapped cameras\?"/);
    assert.doesNotMatch(html, /id="flk-warn-h"[\s\S]{0,200}Read this before you read the map</);
    assert.doesNotMatch(html, /id="flk-map-h"[\s\S]{0,200}> The map\s*</);
    assert.doesNotMatch(html, /id="flk-jur-h"[\s\S]{0,200}> Jurisdictions\s*</);
    assert.doesNotMatch(html, /id="flk-method-h"[\s\S]{0,200}Where this came from</);
    assert.match(html, /Does SIREN publish a Flock doom score\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"Dataset"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/map\.html/);
    // Never-say list: do not assert banned claims as findings.
    assert.doesNotMatch(html, /\ball Flock cameras\b/);
    assert.doesNotMatch(html, /\bevery Flock camera\b/);
    assert.doesNotMatch(html, /\ba national total\b/);
    assert.doesNotMatch(html, /the number of Flock cameras in the United States/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /noindex/);
  });

  it('empty build keeps the question title and noindexes', () => {
    const html = render({ url: ctx.url, href: ctx.href, state: ctx.state });
    assert.match(html, /How many Flock ALPR cameras has SIREN mapped\?/);
    assert.match(html, /noindex/);
  });
});
