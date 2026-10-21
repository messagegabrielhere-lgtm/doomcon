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
    assert.match(html, /What questions do people actually ask\?/);
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

  it('storm-kit and why-watch H3s use questions mirrored in FAQPage', () => {
    const html = render(ctx, waffle, null);
    assert.match(html, /<h3>What belongs in a storm kit\? /);
    assert.match(html, /<h3>Why does an AI site watch Waffle Houses\?<\/h3>/);
    assert.doesNotMatch(html, /<h3>STORM KIT /);
    assert.doesNotMatch(html, /<h3>WHY AN AI SITE WATCHES WAFFLES<\/h3>/);
    assert.match(html, /"name"\s*:\s*"What belongs in a storm kit\?"/);
    assert.match(html, /"name"\s*:\s*"Why does an AI site watch Waffle Houses\?"/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
  });

  it('chain-wide, path and rank-card H3s use questions when those blocks are visible', () => {
    const html = render(ctx, waffle, null);
    if (/temporarily closed|CLOSED IN PATH|datacentres|data centres/i.test(html)) {
      assert.match(html, /How many Waffle Houses are closed chain-wide right now\?|Which Waffle Houses are closed in|Which Waffle Houses are closest to the path\?|Which data centres/);
    }
    assert.doesNotMatch(html, /<h3>RIGHT NOW, CHAIN-WIDE:/);
    assert.doesNotMatch(html, /<h3>WAFFLE HOUSES CLOSED IN/);
    assert.doesNotMatch(html, /<h3>DATA CENTRES RANKED BY IMPACT/);
    assert.doesNotMatch(html, /<h3>DATA CENTRES NEXT TO CLOSED WAFFLE HOUSES<\/h3>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
  });

  it('other-storms section H2 uses a question mirrored in FAQPage when visible', () => {
    // data/waffle.json is live and often lists a single storm, so build a
    // two-storm payload here instead of depending on the hour's weather.
    const storm = (id, name) => ({
      id, name, cls: 'HU', wind_kt: 90, category: 'Hurricane 2', at: '2026-10-13T15:00:00Z',
      now: { lat: 27, lon: -88 }, later: { lat: 29, lon: -87 }, radius_km: 150,
      url: `https://www.nhc.noaa.gov/${id}`, waffle_in_path: 3, stores: [], datacenters_in_path: 1, datacenters: [],
      google: null, index: { level: 'UNKNOWN', label: 'No live status', color: '#94A3B8' }, dc_impact: [],
    });
    const html = render(ctx, { ...waffle, storms: [storm('al01', 'Alpha'), storm('al02', 'Bravo')] }, null);
    assert.match(html, /<h2>Which other storms are active\?<\/h2>/);
    assert.doesNotMatch(html, /<h2>Other active storms<\/h2>/);
    assert.match(html, /"name"\s*:\s*"Which other storms are active\?"/);
    assert.match(html, /Waffle Houses and data centres in the path/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
  });

  it('omits other-storms FAQ when only one storm is listed', () => {
    const one = {
      ...waffle,
      storms: (waffle.storms || []).slice(0, 1),
    };
    const html = render(ctx, one, null);
    assert.doesNotMatch(html, /<h2>Which other storms are active\?<\/h2>/);
    assert.doesNotMatch(html, /"name"\s*:\s*"Which other storms are active\?"/);
    assert.doesNotMatch(html, /<h2>Other active storms<\/h2>/);
  });
});

