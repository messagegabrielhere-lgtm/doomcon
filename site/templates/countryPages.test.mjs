import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { worldTable } from './_worldmap.mjs';
import {
  COUNTRY_INDEX_MIN,
  countryPath,
  indexableCountries,
  renderCountry,
  sitemapEntries,
} from './countryPages.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  routes: { world: true },
  state: { generated_at: '2026-10-10T02:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE' },
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
    assert.deepEqual(names, ['DE', 'FR']);
    assert.equal(COUNTRY_INDEX_MIN, 3);
    const locs = sitemapEntries(ctx).map((e) => e.loc);
    assert.ok(locs.includes('/country/'));
    assert.ok(locs.includes('/country/de.html'));
    assert.ok(!locs.includes('/country/li.html'));
    assert.equal(countryPath('DE'), '/country/de.html');
  });

  it('renders the mapped count and does not claim a census of datacentres', () => {
    const html = renderCountry(ctx, 'de');
    assert.match(html, /<h1>Datacentres mapped in Germany<\/h1>/);
    assert.match(html, /Dataset/);
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
});
