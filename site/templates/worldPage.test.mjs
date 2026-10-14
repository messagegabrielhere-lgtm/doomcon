import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hasWorldData, render } from './worldPage.mjs';

/** Minimal equal-area ring around a mid-latitude pin so worldModel draws land. */
const BOX = [
  [-10, 40], [-5, 40], [-5, 45], [-10, 45], [-10, 40],
];

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
    totals: {
      sites: 2,
      countries_with_sites: 1,
      countries_with_none: 0,
      in_united_states: 0,
      unresolved: 0,
    },
    countries: [
      { iso2: 'DE', name: 'Germany', continent: 'Europe', subregion: 'Western Europe', total: 2, operating: 2, under_construction: 0, announced: 0 },
    ],
    sites: [
      { country: 'DE', name: 'Berlin hall', city: 'Berlin', operator: 'Example Net', status: 'operating', lat: 42.5, lon: -7.5, url: 'https://www.openstreetmap.org/node/1' },
      { country: 'DE', name: 'Hamburg hall', city: 'Hamburg', operator: null, status: 'operating', lat: 43.0, lon: -8.0, url: 'https://www.openstreetmap.org/node/2' },
    ],
    source: { licence: { url: 'https://www.openstreetmap.org/copyright' } },
  },
  worldOutline: {
    countries: [
      { iso2: 'DE', name: 'Germany', rings: [BOX] },
    ],
  },
};

describe('world page', () => {
  it('gates on world + outline data', () => {
    assert.equal(hasWorldData(ctx), true);
    assert.equal(hasWorldData({}), false);
  });

  it('ships a question-shaped title, speakable Dataset, and matching FAQPage', () => {
    const html = render(ctx);
    assert.match(html, /<title>How many datacentres has SIREN mapped on Earth\?/);
    assert.match(html, /<h1 class="wld__h1">How many datacentres has SIREN mapped on Earth\?<\/h1>/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /Does a country with none mapped have zero datacentres\?/);
    assert.match(html, /Does the world map feed the main SIREN number\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"Dataset"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/countries\.html/);
    assert.match(html, /href="\/country\/">Which AI datacentre countries have SIREN pages\?<\/a>/);
    assert.doesNotMatch(html, /href="\/country\/">Countries with at least three mapped sites<\/a>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /noindex/);
  });

  it('empty build keeps the question title and noindexes', () => {
    const html = render({ url: ctx.url, href: ctx.href, state: ctx.state });
    assert.match(html, /How many datacentres has SIREN mapped on Earth\?/);
    assert.match(html, /noindex/);
  });
});
