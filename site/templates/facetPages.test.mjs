import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as brand from '../brand.mjs';
import {
  itemsForPillar, archiveItemsForPillar, pillarIndexable, renderPillar, pillarPath,
  itemsForLab, archiveItemsForLab, itemMatchesLab, labIndexable, renderLab, labPath,
  labsFromRace, labsFromEntities,
  allLabs, indexableLabs, renderLabIndex, renderCompanies, sitemapEntries, ENTITY_LAB_MIN,
  indexablePillars, renderPillarIndex, renderPillars, renderSources,
  PILLAR_INDEX_MIN, SOURCE_INDEX_MIN, sourceLabel, sourceIndexable, renderSource,
  indexableSources,
} from './facetPages.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  state: {
    generated_at: '2026-10-10T02:00:00Z',
    score: 56.2,
    level: 4,
    level_name: 'ROUTINE',
    pillars: brand.PILLARS.map((p, i) => ({
      id: p.id,
      name: p.name,
      score: 40 + i,
      dark: false,
    })),
  },
  news: {
    generated_at: '2026-10-10T02:00:00Z',
    items: [
      ...Array.from({ length: PILLAR_INDEX_MIN }, (_, i) => ({
        id: `cap${i}`,
        title: `Capability story ${i}`,
        pillar: 'capability',
        source: 'hn',
        url: `https://example.test/${i}`,
        published_at: '2026-10-10T01:00:00Z',
        score: 50 + i,
      })),
      {
        id: 'oai1',
        title: 'OpenAI ships a model',
        pillar: 'capability',
        source: 'techcrunch',
        url: 'https://example.test/oai',
        published_at: '2026-10-09T12:00:00Z',
        score: 70,
        entities: ['OpenAI'],
      },
      ...Array.from({ length: ENTITY_LAB_MIN }, (_, i) => ({
        id: `ms${i}`,
        title: `Microsoft AI story ${i}`,
        pillar: 'compute',
        source: 'hn',
        url: `https://example.test/ms${i}`,
        published_at: '2026-10-09T10:00:00Z',
        score: 45,
        entities: ['Microsoft'],
      })),
    ],
  },
  race: {
    generated_at: '2026-10-10T02:00:00Z',
    players: [
      { id: 'openai', name: 'OpenAI', principal: 'Sam Altman', market: { probability: 0.32, change_7d: 0.02 } },
      { id: 'anthropic', name: 'Anthropic', principal: 'Dario Amodei', market: { probability: 0.28, change_7d: -0.01 } },
    ],
  },
};

describe('pillar facets', () => {
  it('counts and gates indexability', () => {
    assert.equal(itemsForPillar(ctx, 'capability').length, PILLAR_INDEX_MIN + 1);
    assert.equal(pillarIndexable(ctx, 'capability'), true);
    assert.equal(pillarIndexable(ctx, 'markets'), false);
  });

  it('renders a CollectionPage with breadcrumb and head-term title', () => {
    const html = renderPillar(ctx, 'capability');
    assert.match(html, /<title>What has SIREN scored under Capability\?/);
    assert.match(html, /<h1>What has SIREN scored under Capability\?<\/h1>/);
    assert.match(html, /CollectionPage/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /FAQPage/);
    assert.match(html, /speakable/);
    assert.match(html, /pillar\/attention\.html/);
    assert.doesNotMatch(html, /noindex/);
    assert.equal(pillarPath('capability'), '/pillar/capability.html');
  });

  it('noindexes thin pillars', () => {
    const html = renderPillar(ctx, 'markets');
    assert.match(html, /noindex/);
  });

  it('lists older archive stories on pillar pages without widening the live gate', () => {
    const withArch = {
      ...ctx,
      itemArchive: [{
        id: 'old-cap',
        title: 'Archived capability story about agents',
        pillar: 'capability',
        source: 'hn',
        url: 'https://example.test/old-cap',
        published_at: '2026-10-01T01:00:00Z',
        score: 41,
      }],
    };
    assert.equal(archiveItemsForPillar(withArch, 'capability').length, 1);
    assert.equal(pillarIndexable(withArch, 'markets'), false, 'archive alone must not index a thin pillar');
    const html = renderPillar(withArch, 'capability');
    assert.match(html, /Which older scored stories are under Capability\?/);
    assert.match(html, /Archived capability story about agents/);
    assert.doesNotMatch(html, /noindex/);
    // ItemList must include the visible archive row (FINDABILITY #52).
    assert.match(html, /"name"\s*:\s*"Archived capability story about agents"/);
    assert.match(html, /"numberOfItems"\s*:\s*5/); // 4 live + 1 archive
  });
});

describe('lab facets', () => {
  it('matches news by lab name and keeps race rows indexable', () => {
    const [openai] = labsFromRace(ctx);
    assert.equal(openai.id, 'openai');
    assert.ok(itemsForLab(ctx, openai).some((it) => /OpenAI/i.test(it.title)));
    assert.equal(labIndexable(ctx, openai), true);
  });

  it('renders lab landings under /lab/', () => {
    const html = renderLab(ctx, ctx.race.players[0]);
    assert.match(html, /<title>What has SIREN scored about OpenAI\?/);
    assert.match(html, /<h1>What has SIREN scored about OpenAI\?<\/h1>/);
    assert.match(html, /lab\/anthropic\.html/);
    assert.match(html, /CollectionPage/);
    assert.match(html, /FAQPage/);
    assert.match(html, /speakable/);
    assert.equal(labPath('openai'), '/lab/openai.html');
  });

  it('matches labs on word boundaries and lists archive stories without widening the gate', () => {
    const amd = { id: 'amd', name: 'AMD', entityOnly: true, entityName: 'AMD' };
    assert.equal(itemMatchesLab({ title: 'AMD ships MI300X', summary: '' }, amd), true);
    assert.equal(itemMatchesLab({ title: 'Demand for GPUs rises', summary: '' }, amd), false);
    const withArch = {
      ...ctx,
      itemArchive: [{
        id: 'old-oai',
        title: 'Archived OpenAI story about agents',
        pillar: 'capability',
        source: 'hn',
        url: 'https://example.test/old-oai',
        published_at: '2026-10-01T01:00:00Z',
        score: 55,
        entities: ['OpenAI'],
      }],
    };
    const openai = withArch.race.players[0];
    assert.equal(archiveItemsForLab(withArch, openai).length, 1);
    const html = renderLab(withArch, openai);
    assert.match(html, /Which older scored stories name OpenAI\?/);
    assert.match(html, /Archived OpenAI story about agents/);
    assert.match(html, /"name"\s*:\s*"Archived OpenAI story about agents"/);
  });

  it('adds entity-only labs that clear the story gate without inventing odds', () => {
    const entityLabs = labsFromEntities(ctx);
    assert.ok(entityLabs.some((p) => p.id === 'microsoft'));
    assert.ok(!entityLabs.some((p) => p.id === 'openai'), 'race labs stay on the race path');
    const ms = allLabs(ctx).find((p) => p.id === 'microsoft');
    assert.ok(ms);
    assert.equal(labIndexable(ctx, ms), true);
    const html = renderLab(ctx, ms);
    assert.match(html, /<title>What has SIREN scored about Microsoft\?/);
    assert.match(html, /does not invent market odds/);
    assert.doesNotMatch(html, /Market odds \(best model\)/);
  });

  it('ships /lab/ directory and DoomBench-shaped /companies.html hubs', () => {
    assert.ok(indexableLabs(ctx).some((p) => p.id === 'openai'));
    const labIndex = renderLabIndex(ctx);
    assert.match(labIndex, /Which AI labs have SIREN pages\?/);
    assert.match(labIndex, /\/lab\/openai\.html/);
    assert.match(labIndex, /\/companies\.html/);
    assert.match(labIndex, /What questions do people actually ask\?/);
    assert.match(labIndex, /"@type"\s*:\s*"FAQPage"/);
    assert.match(labIndex, /speakable/);
    const companies = renderCompanies(ctx);
    assert.match(companies, /Which AI companies has SIREN scored stories about\?/);
    assert.match(companies, /does not publish a company/);
    assert.match(companies, /\/lab\/openai\.html/);
    assert.match(companies, /\/compare\.html/);
    assert.match(companies, /SpeakableSpecification/);
    assert.match(companies, /FAQPage/);
    assert.doesNotMatch(companies, /doom score:\s*\d/i);
  });
});

describe('pillar + source directory hubs', () => {
  it('ships /pillar/ and /pillars.html over the gated pillar set', () => {
    assert.ok(indexablePillars(ctx).some((p) => p.id === 'capability'));
    const idx = renderPillarIndex(ctx);
    assert.match(idx, /Which AI activity pillars have SIREN pages\?/);
    assert.match(idx, /\/pillar\/capability\.html/);
    assert.match(idx, /\/pillars\.html/);
    assert.match(idx, /FAQPage/);
    const hubs = renderPillars(ctx);
    assert.match(hubs, /Which AI activity pillars has SIREN scored\?/);
    assert.match(hubs, /does not publish a pillar/);
    assert.doesNotMatch(hubs, /doom score:\s*\d/i);
  });

  it('ships /sources.html over gated feed adapters', () => {
    const html = renderSources(ctx);
    assert.match(html, /Which AI news sources has SIREN scored via\?/);
    assert.match(html, /\/source\/hn\.html/);
    assert.match(html, /\/outlets\.html/);
    assert.match(html, /FAQPage/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
  });
});

describe('facet sitemap', () => {
  it('emits only indexable facets', () => {
    const rows = sitemapEntries(ctx);
    const locs = rows.map((r) => r.loc);
    assert.ok(locs.includes('/pillar/capability.html'));
    assert.ok(!locs.includes('/pillar/markets.html'));
    assert.ok(locs.includes('/pillar/'));
    assert.ok(locs.includes('/pillars.html'));
    assert.ok(locs.includes('/lab/'));
    assert.ok(locs.includes('/companies.html'));
    assert.ok(locs.includes('/lab/openai.html'));
    assert.ok(locs.includes('/lab/anthropic.html'));
    assert.ok(locs.includes('/source/hn.html'));
    assert.ok(!locs.includes('/source/techcrunch.html'));
    assert.ok(locs.includes('/source/'));
    assert.ok(locs.includes('/sources.html'));
  });
});

describe('outlet facets', () => {
  it('gates outlets below the story minimum and uses the adapter label', () => {
    assert.equal(SOURCE_INDEX_MIN, 3);
    assert.equal(sourceIndexable(ctx, 'hn'), true);
    assert.equal(sourceIndexable(ctx, 'techcrunch'), false);
    assert.equal(sourceLabel('techcrunch-ai'), 'TechCrunch — AI');
    assert.equal(indexableSources(ctx).some((s) => s.id === 'hn'), true);
  });

  it('lets the durable archive keep a feed adapter above the substance gate', () => {
    const withArch = {
      ...ctx,
      itemArchive: [
        {
          id: 'tc-old-1', title: 'Archived TechCrunch AI one', pillar: 'capability',
          source: 'techcrunch', url: 'https://example.test/tc1', published_at: '2026-09-01T01:00:00Z', score: 40,
        },
        {
          id: 'tc-old-2', title: 'Archived TechCrunch AI two', pillar: 'capability',
          source: 'techcrunch', url: 'https://example.test/tc2', published_at: '2026-09-02T01:00:00Z', score: 41,
        },
      ],
    };
    // 1 live + 2 archive clears SOURCE_INDEX_MIN=3
    assert.equal(sourceIndexable(withArch, 'techcrunch'), true);
    assert.ok(indexableSources(withArch).some((s) => s.id === 'techcrunch' && s.count === 3));
    const html = renderSource(withArch, 'techcrunch');
    assert.doesNotMatch(html, /noindex/);
    assert.match(html, /Archived TechCrunch AI one/);
    assert.match(html, /"name"\s*:\s*"Archived TechCrunch AI one"/);
    assert.match(html, /"name"\s*:\s*"Archived TechCrunch AI two"/);
  });

  it('renders an outlet page that lists its stories', () => {
    const html = renderSource(ctx, 'hn');
    assert.match(html, /<h1>What has SIREN scored via hn\?<\/h1>/);
    assert.match(html, /CollectionPage/);
    assert.match(html, /FAQPage/);
    assert.match(html, /speakable/);
    assert.doesNotMatch(html, /noindex/);
    assert.match(html, /item\//);
  });

  it('links older archived stories from the same adapter', () => {
    const withArch = {
      ...ctx,
      itemArchive: [{
        id: 'old-hn',
        title: 'Archived HN story about agents',
        pillar: 'capability',
        source: 'hn',
        url: 'https://example.test/old-hn',
        published_at: '2026-10-01T01:00:00Z',
        score: 44,
      }],
    };
    const html = renderSource(withArch, 'hn');
    assert.match(html, /Which older scored stories are from hn\?/);
    assert.match(html, /Archived HN story about agents/);
    assert.match(html, /\/item\/archive\.html/);
  });
});
