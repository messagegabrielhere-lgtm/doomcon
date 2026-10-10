import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as brand from '../brand.mjs';
import {
  itemsForPillar, pillarIndexable, renderPillar, pillarPath,
  itemsForLab, labIndexable, renderLab, labPath, labsFromRace, labsFromEntities,
  allLabs, sitemapEntries, ENTITY_LAB_MIN,
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
    assert.match(html, /<title>Capability AI activity/);
    assert.match(html, /CollectionPage/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /pillar\/attention\.html/);
    assert.doesNotMatch(html, /noindex/);
    assert.equal(pillarPath('capability'), '/pillar/capability.html');
  });

  it('noindexes thin pillars', () => {
    const html = renderPillar(ctx, 'markets');
    assert.match(html, /noindex/);
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
    assert.match(html, /<title>OpenAI AI activity/);
    assert.match(html, /lab\/anthropic\.html/);
    assert.match(html, /CollectionPage/);
    assert.equal(labPath('openai'), '/lab/openai.html');
  });

  it('adds entity-only labs that clear the story gate without inventing odds', () => {
    const entityLabs = labsFromEntities(ctx);
    assert.ok(entityLabs.some((p) => p.id === 'microsoft'));
    assert.ok(!entityLabs.some((p) => p.id === 'openai'), 'race labs stay on the race path');
    const ms = allLabs(ctx).find((p) => p.id === 'microsoft');
    assert.ok(ms);
    assert.equal(labIndexable(ctx, ms), true);
    const html = renderLab(ctx, ms);
    assert.match(html, /<title>Microsoft: AI stories this index scored/);
    assert.match(html, /does not invent market odds/);
    assert.doesNotMatch(html, /Market odds \(best model\)/);
  });
});

describe('facet sitemap', () => {
  it('emits only indexable facets', () => {
    const rows = sitemapEntries(ctx);
    const locs = rows.map((r) => r.loc);
    assert.ok(locs.includes('/pillar/capability.html'));
    assert.ok(!locs.includes('/pillar/markets.html'));
    assert.ok(locs.includes('/lab/openai.html'));
    assert.ok(locs.includes('/lab/anthropic.html'));
    assert.ok(locs.includes('/source/hn.html'));
    assert.ok(!locs.includes('/source/techcrunch.html'));
    assert.ok(locs.includes('/source/'));
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

  it('renders an outlet page that lists its stories', () => {
    const html = renderSource(ctx, 'hn');
    assert.match(html, /<h1>hn<\/h1>/);
    assert.match(html, /CollectionPage/);
    assert.doesNotMatch(html, /noindex/);
    assert.match(html, /item\//);
  });
});
