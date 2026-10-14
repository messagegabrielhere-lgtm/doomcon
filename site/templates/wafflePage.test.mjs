import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { render } from './wafflePage.mjs';

const waffle = JSON.parse(readFileSync(new URL('../../data/waffle.json', import.meta.url), 'utf8'));

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  routes: { waffle: true, map: true },
  state: { generated_at: '2026-10-13T15:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE' },
};

describe('waffle page', () => {
  it('ships a question-shaped title, speakable Dataset, and matching FAQPage', () => {
    const html = render(ctx, waffle, null);
    assert.match(html, /<title>Is the Waffle House open\?/);
    assert.match(html, /<h1 class="bp__h1">Is the Waffle House open\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /Is this an official Waffle House or FEMA status map\?/);
    assert.match(html, /Why does an AI site watch Waffle Houses\?/);
    assert.match(html, /Is the shaded path the official forecast cone\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"Dataset"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/map\.html/);
    // Never-say list: refuse official FEMA / outage-report claims.
    assert.doesNotMatch(html, /official FEMA status/i);
    assert.doesNotMatch(html, /is an outage report/i);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /noindex/);
  });

  it('keeps the question title when storm payload is empty', () => {
    const html = render(ctx, { storms: [], generated_at: '2026-10-13T15:00:00Z' }, null);
    assert.match(html, /Is the Waffle House open\?/);
    assert.match(html, /FAQPage/);
    assert.doesNotMatch(html, /noindex/);
  });

  it('storm-kit and map body links use bunker and US-map question H1s', () => {
    const html = render(ctx, waffle, null);
    assert.match(html, /href="\/bunker-kit\.html">What free tools belong in a bunker kit\? →<\/a>/);
    assert.doesNotMatch(html, /SIREN’s bunker kit →|SIREN's bunker kit →/);
    assert.match(html, /href="\/map\.html">How many datacentres has SIREN mapped in the United States\?<\/a>/);
    assert.doesNotMatch(html, /href="map\.html">power map<\/a>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
  });
});

