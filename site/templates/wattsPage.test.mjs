import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { hasWatts, render } from './wattsPage.mjs';

const infra = JSON.parse(readFileSync(new URL('../../data/infra.json', import.meta.url), 'utf8'));

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  routes: {},
  state: { generated_at: '2026-10-10T02:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE' },
  infra,
};

describe('watts page', () => {
  it('gates on infra sources + pillars', () => {
    assert.equal(hasWatts(ctx), true);
    assert.equal(hasWatts({}), false);
  });

  it('ships a question-shaped title, speakable Dataset, and matching FAQPage', () => {
    const html = render(ctx);
    assert.match(html, /<title>What does the SIREN infrastructure index read\?/);
    assert.match(html, /<h1 class="ihero__h1">What does the SIREN infrastructure index read\?<\/h1>/);
    assert.match(html, /What questions do people actually ask\?/);
    assert.match(html, /Does Watts measure datacentre power or water draw\?/);
    assert.match(html, /Does Watts feed the main SIREN number\?/);
    assert.match(html, /Does SUBSTRATE mean the grid is in trouble\?/);
    assert.match(html, /id="iwarn-h"[^>]*>What should you read before the Watts charts\?/);
    assert.match(html, /id="icorr-h"[^>]*>Which datacentre regions does Watts cover\?/);
    assert.match(html, /id="igrid-h"[^>]*>What does overnight grid load show\?/);
    assert.match(html, /id="iwater-h"[^>]*>What does river flow at the gauges show\?/);
    assert.match(html, /class="iw__h">Which nine gauges sit beside datacentre clusters\?/);
    assert.match(html, /class="iw__h">Which ten states does the US Drought Monitor cover here\?/);
    assert.doesNotMatch(html, /class="iw__h">Nine gauges,/);
    assert.doesNotMatch(html, /class="iw__h">Ten states, US Drought Monitor/);
    assert.match(html, /"name"\s*:\s*"Which nine gauges sit beside datacentre clusters\?"/);
    assert.match(html, /"name"\s*:\s*"Which ten states does the US Drought Monitor cover here\?"/);
    assert.match(html, /id="ibuild-h"[^>]*>Which filings mention datacentres\?/);
    assert.match(html, /id="isrc-h"[^>]*>What state is every Watts source in\?/);
    assert.match(html, /id="icant-h"[^>]*>What can this index not tell you\?/);
    assert.match(html, /id="ihow-h"[^>]*>How is the Watts number made\?/);
    assert.match(html, /id="iex-h"[^>]*>Which sources were tried and left out\?/);
    assert.doesNotMatch(html, /id="iwarn-h"[^>]*>Read this before the charts</);
    assert.doesNotMatch(html, /id="igrid-h"[^>]*>Overnight grid load</);
    assert.doesNotMatch(html, /id="isrc-h"[^>]*>Every source, every state</);
    assert.doesNotMatch(html, /id="ihow-h"[^>]*>How the number is made</);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"Dataset"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/map\.html/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /noindex/);
  });

  it('empty build keeps the question title and noindexes', () => {
    const html = render({ url: ctx.url, href: ctx.href, state: ctx.state });
    assert.match(html, /What does the SIREN infrastructure index read\?/);
    assert.match(html, /noindex/);
  });

  it('corridor-card H3s use questions mirrored in FAQPage', () => {
    const html = render(ctx);
    assert.match(html, /What does Watts see in Texas\?/);
    assert.match(html, /What does Watts see in Northern Virginia\?/);
    assert.match(html, /What does Watts see in California\?/);
    assert.match(html, /FAQPage[\s\S]*What does Watts see in Texas\?/);
    assert.match(html, /FAQPage[\s\S]*What does Watts see in New York\?/);
    assert.doesNotMatch(html, /<h3 class="ic__name">Texas/);
    assert.doesNotMatch(html, /<h3 class="ic__name">Northern Virginia/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
  });
});
