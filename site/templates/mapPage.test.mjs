import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { hasDatacenters, render } from './mapPage.mjs';

const datacenters = JSON.parse(readFileSync(new URL('../../data/datacenters.json', import.meta.url), 'utf8'));

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  routes: {},
  state: { generated_at: '2026-10-10T02:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE' },
  datacenters,
};

describe('map page', () => {
  it('gates on datacenters + resources_index', () => {
    assert.equal(hasDatacenters(ctx), true);
    assert.equal(hasDatacenters({}), false);
  });

  it('ships a question-shaped title, speakable Dataset, and matching FAQPage', () => {
    const html = render(ctx);
    assert.match(html, /<title>How many datacentres has SIREN mapped in the United States\?/);
    assert.match(html, /<h1 class="bldhero__h1">How many datacentres has SIREN mapped in the United States\?<\/h1>/);
    assert.match(html, /What questions do people actually ask\?/);
    assert.match(html, /Does this map measure a datacentre's power or water draw\?/);
    assert.match(html, /Does a state with no pins have zero datacentres\?/);
    assert.match(html, /Does the US map feed the main SIREN number\?/);
    assert.match(html, /id="bld-claim"[\s\S]*?What can this US map not show you\?/);
    assert.match(html, /id="bld-map"[\s\S]*?Where are the mapped US datacentres\?/);
    assert.match(html, /id="bld-water"[\s\S]*?Which counties with mapped sites are in drought\?/);
    assert.match(html, /id="bld-power"[\s\S]*?Which grid sits under each pin\?/);
    assert.match(html, /id="bld-onepin"[\s\S]*?What does one pin say\?/);
    assert.match(html, /id="bld-largest"[\s\S]*?Which are the largest tagged sites\?/);
    assert.match(html, /id="bld-method"[\s\S]*?How was this US map built, and what is wrong with it\?/);
    assert.match(html, /class="bldsec__h3">Which nine river gauges sit beside datacentre clusters\?<\/h3>/);
    assert.match(html, /class="bldsec__h3">What does each status mean in words\?<\/h3>/);
    assert.match(html, /class="bldsec__h3">What does each confidence level mean in words\?<\/h3>/);
    assert.match(html, /class="bldsec__h3">What are the sources for this map\?<\/h3>/);
    assert.match(html, /class="bldsec__h3">What are the limitations, in full\?<\/h3>/);
    assert.match(html, /class="bldsec__h3">What was tried and dropped\?<\/h3>/);
    assert.doesNotMatch(html, /class="bldsec__h3">The nine river gauges<\/h3>/);
    assert.doesNotMatch(html, /class="bldsec__h3">Status, in words<\/h3>/);
    assert.doesNotMatch(html, /class="bldsec__h3">The sources<\/h3>/);
    assert.match(html, /"name"\s*:\s*"Which nine river gauges sit beside datacentre clusters\?"/);
    assert.match(html, /"name"\s*:\s*"What was tried and dropped\?"/);
    assert.match(html, /class="usm__lh">What does shape mean on this map\?<\/h3>/);
    assert.match(html, /class="usm__lh">What does colour mean on this map\?<\/h3>/);
    assert.match(html, /class="usm__lh">What does size mean on this map\?<\/h3>/);
    assert.match(html, /"name"\s*:\s*"What does shape mean on this map\?"/);
    assert.match(html, /"name"\s*:\s*"What does colour mean on this map\?"/);
    assert.doesNotMatch(html, /class="usm__lh">Shape is status<\/h3>/);
    assert.doesNotMatch(html, /class="usm__lh">Colour is the drought in that county<\/h3>/);
    assert.doesNotMatch(html, /class="usm__lh">Size is capacity, where it is published<\/h3>/);
    assert.doesNotMatch(html, /id="bld-claim"[\s\S]{0,200}What this map cannot show you</);
    assert.doesNotMatch(html, /id="bld-map"[\s\S]{0,200}> The map\s*</);
    assert.doesNotMatch(html, /id="bld-water"[\s\S]{0,200}Drought, by county</);
    assert.doesNotMatch(html, /id="bld-power"[\s\S]{0,200}The grid under each pin</);
    assert.doesNotMatch(html, /id="bld-onepin"[\s\S]{0,200}What one pin says</);
    assert.doesNotMatch(html, /id="bld-largest"[\s\S]{0,200}The largest tagged sites</);
    assert.doesNotMatch(html, /id="bld-method"[\s\S]{0,200}How this was built, and what is wrong with it</);
    assert.match(html, /Does SIREN publish a US-map doom score\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /"@type":\s*"Dataset"/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /\/world\.html/);
    assert.match(html, /href="\/watts\.html">What does the SIREN infrastructure index read\?<\/a>/);
    assert.doesNotMatch(html, /href="\/watts\.html">The infrastructure index<\/a>/);
    assert.doesNotMatch(html, /href="\/watts\.html">Watts<\/a>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.doesNotMatch(html, /noindex/);
  });

  it('empty build keeps the question title and noindexes', () => {
    const html = render({ url: ctx.url, href: ctx.href, state: ctx.state });
    assert.match(html, /How many datacentres has SIREN mapped in the United States\?/);
    assert.match(html, /noindex/);
  });

  it('jurisdiction-table H3 uses a question mirrored in FAQPage', () => {
    const html = render(ctx);
    assert.match(html, /Which jurisdictions are ranked by mapped sites\?/);
    assert.match(html, /FAQPage[\s\S]*Which jurisdictions are ranked by mapped sites\?/);
    assert.doesNotMatch(html, /bldstate__h"[^>]*>[\s\S]*Every jurisdiction, ranked/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
  });

  it('moves-panel H3 uses a question mirrored in FAQPage', () => {
    const html = render(ctx);
    assert.match(html, /id="bld-moves"[^>]*>[\s\S]*What moves between collects\?/);
    assert.match(html, /FAQPage[\s\S]*What moves between collects\?/);
    assert.doesNotMatch(html, /id="bld-moves"[^>]*>[\s\S]*What moves between collects<\/h3>/);
  });
});
