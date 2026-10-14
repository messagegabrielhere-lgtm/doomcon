import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { worldTable } from './_worldmap.mjs';
import {
  COUNTRY_INDEX_MIN,
  countryPath,
  countriesForItem,
  indexableCountries,
  itemMatchesCountry,
  renderCountry,
  renderCountries,
  renderIndex,
  sitemapEntries,
} from './countryPages.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  routes: { world: true },
  state: { generated_at: '2026-10-10T02:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE' },
  news: {
    generated_at: '2026-10-10T02:00:00Z',
    items: [
      {
        id: 'de1',
        title: 'Germany expands AI datacentre grid deal',
        summary: 'Berlin names new interconnect.',
        source: 'hn',
        pillar: 'compute',
        url: 'https://example.test/de1',
        published_at: '2026-10-10T01:00:00Z',
        score: 41.2,
      },
    ],
  },
  itemArchive: [
    {
      id: 'de-old',
      title: 'Older Germany chip fab story',
      summary: '',
      source: 'reuters',
      pillar: 'compute',
      url: 'https://example.test/de-old',
      published_at: '2026-09-01T01:00:00Z',
      score: 38,
    },
  ],
  world: {
    generated_at: '2026-10-03T00:00:00Z',
    copy: {
      headline_qualifier: 'as mapped in OpenStreetMap on 2026-10-03',
      attribution_required: '© OpenStreetMap contributors',
      attribution_url: 'https://www.openstreetmap.org/copyright',
      what_zero_means: 'A country with no mapped datacentre is a country nobody has mapped.',
      never_say: 'the number of datacentres in the world',
    },
    countries: [
      { iso2: 'DE', name: 'Germany', continent: 'Europe', subregion: 'Western Europe', total: 10, operating: 8, under_construction: 1, announced: 1 },
      { iso2: 'FR', name: 'France', continent: 'Europe', subregion: 'Western Europe', total: 4, operating: 4, under_construction: 0, announced: 0 },
      { iso2: 'LI', name: 'Liechtenstein', continent: 'Europe', subregion: 'Western Europe', total: 1, operating: 1, under_construction: 0, announced: 0 },
      { iso2: 'US', name: 'United States of America', continent: 'Americas', subregion: 'Northern America', total: 20, operating: 10, under_construction: 5, announced: 5 },
    ],
    sites: [
      { country: 'DE', name: 'Berlin hall', city: 'Berlin', operator: 'Example Net', status: 'operating', url: 'https://www.openstreetmap.org/node/1' },
      { country: 'DE', name: 'Hamburg hall', city: 'Hamburg', operator: null, status: 'announced', url: 'https://www.openstreetmap.org/node/2' },
    ],
  },
};

describe('country pages', () => {
  it('keeps countries under the gate off the index and the sitemap', () => {
    const names = indexableCountries(ctx).map((c) => c.iso2);
    assert.deepEqual(names, ['US', 'DE', 'FR']);
    assert.equal(COUNTRY_INDEX_MIN, 3);
    const locs = sitemapEntries(ctx).map((e) => e.loc);
    assert.ok(locs.includes('/country/'));
    assert.ok(locs.includes('/countries.html'));
    assert.ok(locs.includes('/country/de.html'));
    assert.ok(locs.includes('/country/us.html'));
    assert.ok(!locs.includes('/country/li.html'));
    assert.equal(countryPath('DE'), '/country/de.html');
  });

  it('ships /countries.html over the same gated country set', () => {
    const html = renderCountries(ctx);
    assert.match(html, /Which AI datacentre countries has SIREN mapped\?/);
    assert.match(html, /How many datacentres has SIREN mapped in Germany\?/);
    assert.match(html, /Which AI doom indexes can you compare\?/);
    assert.match(html, /Which AI datacentre countries have SIREN pages\?/);
    assert.match(html, /fc__k"><a href="\/compare\.html">Which AI doom indexes can you compare\?<\/a>/);
    assert.doesNotMatch(html, /fc__k"><a href="\/compare\.html">Compare<\/a>/);
    assert.doesNotMatch(html, /fc__k"><a href="\/country\/">Countries<\/a>/);
    assert.match(html, /\/country\/de\.html/);
    assert.match(html, /does not publish a country/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /"@type"\s*:\s*"FAQPage"/);
    assert.match(html, /speakable/);
    assert.match(html, /\/world\.html/);
    const index = renderIndex(ctx);
    assert.match(index, /Which AI datacentre countries have SIREN pages\?/);
    assert.match(index, /How many datacentres has SIREN mapped in Germany\?/);
    assert.match(index, /How many datacentres has SIREN mapped on Earth\?/);
    assert.match(index, /fc__k"><a href="\/world\.html">How many datacentres has SIREN mapped on Earth\?<\/a>/);
    assert.doesNotMatch(index, /fc__k"><a href="\/world\.html">World<\/a>/);
    assert.doesNotMatch(index, /fc__k">[^<]*· Countries ·/);
    assert.match(index, /Questions people actually ask/);
    assert.match(index, /"@type"\s*:\s*"FAQPage"/);
    assert.match(index, /speakable/);
    assert.match(index, /\/countries\.html/);
    assert.doesNotMatch(index, /doom score:\s*\d/i);
    assert.match(renderCountry(ctx, 'de'), /\/countries\.html/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /the number of datacentres in the world/i);
  });

  it('renders the mapped count and does not claim a census of datacentres', () => {
    const html = renderCountry(ctx, 'de');
    assert.match(html, /<title>How many datacentres has SIREN mapped in Germany\?/);
    assert.match(html, /<h1>How many datacentres has SIREN mapped in Germany\?<\/h1>/);
    assert.match(html, /How many datacentres has SIREN mapped on Earth\?/);
    assert.match(html, /Which AI datacentre countries have SIREN pages\?/);
    assert.match(html, /Which AI datacentre countries has SIREN mapped\?/);
    assert.match(html, /How many datacentres has SIREN mapped in France\?/);
    assert.match(html, /fc__k"><a href="\/world\.html">How many datacentres has SIREN mapped on Earth\?<\/a>/);
    assert.doesNotMatch(html, /fc__k"><a href="\/world\.html">World<\/a>/);
    assert.doesNotMatch(html, /fc__k"><a href="\/country\/">Countries<\/a>/);
    assert.doesNotMatch(html, /fc__nav"[^>]*>[\s\S]*?>France<\/a>/);
    assert.match(html, /Dataset/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /"@type"\s*:\s*"FAQPage"/);
    assert.match(html, /speakable/);
    assert.match(html, /Berlin hall/);
    assert.match(html, /as mapped in OpenStreetMap on 2026-10-03/);
    assert.match(html, /country\/fr\.html/);
    assert.doesNotMatch(html, /the number of datacentres in the world/i);
    assert.doesNotMatch(html, /noindex/);
  });

  it('adds a country-page link without replacing the map zoom control', () => {
    const model = {
      totals: { sites: 10 },
      qualifier: 'as mapped',
      unresolved: { total: 0, name: 'Unresolved', operating: 0, under_construction: 0, announced: 0 },
      countries: [{
        iso2: 'DE', name: 'Germany', subregion: 'Western Europe', outlined: true,
        boundary_risk: 0, continent: 'Europe', total: 10, operating: 8, under_construction: 1, announced: 1,
      }],
    };
    const html = worldTable(model, { countryHref: () => '/country/de.html' });
    assert.match(html, /data-wm-go="DE"/);
    assert.match(html, /href="\/country\/de\.html"/);
    assert.match(html, /country page/);
  });

  it('lists live and archived stories that name the country', () => {
    const html = renderCountry(ctx, 'de');
    assert.match(html, /Scored stories naming Germany/);
    assert.match(html, /Germany expands AI datacentre grid deal/);
    assert.match(html, /Older scored stories naming Germany/);
    assert.match(html, /Older Germany chip fab story/);
    assert.match(html, /ItemList/);
    assert.match(html, /\/item\/archive\.html/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
  });

  it('matches US aliases without treating bare ISO as a needle', () => {
    const us = ctx.world.countries.find((c) => c.iso2 === 'US');
    assert.ok(itemMatchesCountry({ title: 'United States chips export rule', summary: '' }, us));
    assert.ok(itemMatchesCountry({ title: 'USA datacentre boom', summary: '' }, us));
    assert.ok(!itemMatchesCountry({ title: 'Using GPUs in the cloud', summary: '' }, us));
    const hits = countriesForItem(ctx, ctx.news.items[0]).map((c) => c.iso2);
    assert.deepEqual(hits, ['DE']);
  });
});
