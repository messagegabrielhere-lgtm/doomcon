import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as brand from '../brand.mjs';
import {
  itemsForPillar, pillarIndexable, renderPillar, pillarPath,
  indexablePillars, renderPillarIndex, renderPillars,
  itemsForLab, labIndexable, renderLab, labPath, labsFromRace, labsFromEntities,
  allLabs, indexableLabs, renderLabIndex, renderCompanies, sitemapEntries, ENTITY_LAB_MIN,
  PILLAR_INDEX_MIN, SOURCE_INDEX_MIN, sourceLabel, sourceIndexable, renderSource,
  renderSourceIndex, renderSources, indexableSources,
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
    assert.match(html, /CollectionPage/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /"@type"\s*:\s*"FAQPage"/);
    assert.match(html, /speakable/);
    assert.match(html, /pillar\/attention\.html/);
    assert.doesNotMatch(html, /noindex/);
    assert.equal(pillarPath('capability'), '/pillar/capability.html');
  });

  it('noindexes thin pillars', () => {
    const html = renderPillar(ctx, 'markets');
    assert.match(html, /noindex/);
  });

  it('links older archived stories under the same pillar', () => {
    const withArch = {
      ...ctx,
      itemArchive: [{
        id: 'old-cap',
        title: 'Archived capability story',
        pillar: 'capability',
        source: 'hn',
        url: 'https://example.test/old-cap',
        published_at: '2026-10-01T01:00:00Z',
        score: 55,
      }],
    };
    const html = renderPillar(withArch, 'capability');
    assert.match(html, /Older scored stories under Capability/);
    assert.match(html, /Archived capability story/);
    assert.match(html, /\/item\/archive\.html/);
  });

  it('lets the durable archive keep a thin pillar above the substance gate', () => {
    const withArch = {
      ...ctx,
      itemArchive: [
        {
          id: 'm-old1',
          title: 'Archived markets one',
          pillar: 'markets',
          source: 'hn',
          url: 'https://example.test/m1',
          published_at: '2026-09-01T01:00:00Z',
          score: 40,
        },
        {
          id: 'm-old2',
          title: 'Archived markets two',
          pillar: 'markets',
          source: 'hn',
          url: 'https://example.test/m2',
          published_at: '2026-09-02T01:00:00Z',
          score: 41,
        },
        {
          id: 'm-old3',
          title: 'Archived markets three',
          pillar: 'markets',
          source: 'hn',
          url: 'https://example.test/m3',
          published_at: '2026-09-03T01:00:00Z',
          score: 42,
        },
      ],
    };
    assert.equal(pillarIndexable(withArch, 'markets'), true);
    const html = renderPillar(withArch, 'markets');
    assert.doesNotMatch(html, /noindex/);
    assert.match(html, /Older scored stories under Markets/);
  });

  it('ships /pillars.html and /pillar/ over the same gated pillar set', () => {
    assert.ok(indexablePillars(ctx).some((p) => p.id === 'capability'));
    assert.ok(!indexablePillars(ctx).some((p) => p.id === 'markets'));
    const hub = renderPillars(ctx);
    assert.match(hub, /Which AI activity pillars has SIREN scored\?/);
    assert.match(hub, /\/pillar\/capability\.html/);
    assert.match(hub, /does not publish a pillar/);
    assert.match(hub, /Questions people actually ask/);
    assert.match(hub, /"@type"\s*:\s*"FAQPage"/);
    assert.match(hub, /speakable/);
    assert.match(hub, /\/methodology\.html/);
    assert.doesNotMatch(hub, /doom score:\s*\d/i);
    const index = renderPillarIndex(ctx);
    assert.match(index, /Pillars this index scores/);
    assert.match(index, /\/pillars\.html/);
    assert.match(renderPillar(ctx, 'capability'), /\/pillars\.html/);
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
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /lab\/anthropic\.html/);
    assert.match(html, /CollectionPage/);
    assert.equal(labPath('openai'), '/lab/openai.html');
  });

  it('links older archived stories naming the lab', () => {
    const withArch = {
      ...ctx,
      itemArchive: [{
        id: 'old-oai',
        title: 'Archived OpenAI model card',
        pillar: 'capability',
        source: 'hn',
        url: 'https://example.test/old-oai',
        published_at: '2026-10-01T01:00:00Z',
        score: 60,
        entities: ['OpenAI'],
      }],
    };
    const html = renderLab(withArch, withArch.race.players[0]);
    assert.match(html, /Older scored stories naming OpenAI/);
    assert.match(html, /Archived OpenAI model card/);
    assert.match(html, /\/item\/archive\.html/);
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

  it('indexes infra entity labs when the live story gate clears', () => {
    const rich = {
      ...ctx,
      news: {
        ...ctx.news,
        items: [
          ...ctx.news.items,
          ...['Oracle cloud AI deal', 'Oracle GPU cluster expand', 'Oracle signs AI power pact'].map((title, i) => ({
            id: `or${i}`,
            title,
            pillar: 'compute',
            source: 'hn',
            url: `https://example.test/or${i}`,
            published_at: '2026-10-09T09:00:00Z',
            score: 44,
          })),
          ...['Palantir AI platform win', 'Palantir defense AI contract', 'Palantir names AI chief'].map((title, i) => ({
            id: `pl${i}`,
            title,
            pillar: 'capability',
            source: 'hn',
            url: `https://example.test/pl${i}`,
            published_at: '2026-10-09T08:00:00Z',
            score: 43,
          })),
        ],
      },
    };
    const ids = labsFromEntities(rich).map((p) => p.id);
    assert.ok(ids.includes('oracle'));
    assert.ok(ids.includes('palantir'));
    assert.match(renderLab(rich, labsFromEntities(rich).find((p) => p.id === 'oracle')), /What has SIREN scored about Oracle\?/);
  });

  it('lets the durable archive keep an entity lab above the substance gate', () => {
    const withArch = {
      ...ctx,
      news: {
        ...ctx.news,
        items: [
          ...ctx.news.items,
          {
            id: 'bd1',
            title: 'ByteDance ships a personal AI agent',
            pillar: 'capability',
            source: 'hn',
            url: 'https://example.test/bd1',
            published_at: '2026-10-09T07:00:00Z',
            score: 42,
          },
        ],
      },
      itemArchive: [
        {
          id: 'bd-old1',
          title: 'Archived ByteDance model release',
          pillar: 'capability',
          source: 'hn',
          url: 'https://example.test/bd-old1',
          published_at: '2026-09-01T01:00:00Z',
          score: 40,
        },
        {
          id: 'bd-old2',
          title: 'Archived ByteDance AI phone push',
          pillar: 'capability',
          source: 'hn',
          url: 'https://example.test/bd-old2',
          published_at: '2026-09-02T01:00:00Z',
          score: 41,
        },
      ],
    };
    const ids = labsFromEntities(withArch).map((p) => p.id);
    assert.ok(ids.includes('bytedance'));
    const html = renderLab(withArch, labsFromEntities(withArch).find((p) => p.id === 'bytedance'));
    assert.doesNotMatch(html, /noindex/);
    assert.match(html, /Older scored stories naming ByteDance/);
  });

  it('indexes Groq as an entity lab when archive stories clear the gate', () => {
    const withArch = {
      ...ctx,
      news: { ...ctx.news, items: [...ctx.news.items] },
      itemArchive: [
        {
          id: 'gq1',
          title: 'Former Groq engineers file a lawsuit',
          pillar: 'compute',
          source: 'hn',
          url: 'https://example.test/gq1',
          published_at: '2026-09-01T01:00:00Z',
          score: 40,
        },
        {
          id: 'gq2',
          title: 'Groq inference stack update',
          pillar: 'compute',
          source: 'hn',
          url: 'https://example.test/gq2',
          published_at: '2026-09-02T01:00:00Z',
          score: 41,
        },
        {
          id: 'gq3',
          title: 'Cloud buyers compare Groq latency',
          pillar: 'compute',
          source: 'hn',
          url: 'https://example.test/gq3',
          published_at: '2026-09-03T01:00:00Z',
          score: 42,
        },
      ],
    };
    const groq = labsFromEntities(withArch).find((p) => p.id === 'groq');
    assert.ok(groq, 'Groq clears ENTITY_LAB_MIN via archive');
    assert.equal(labIndexable(withArch, groq), true);
    const html = renderLab(withArch, groq);
    assert.match(html, /<title>What has SIREN scored about Groq\?/);
    assert.doesNotMatch(html, /noindex/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
  });

  it('indexes Physical Intelligence as an entity lab when archive stories clear the gate', () => {
    const withArch = {
      ...ctx,
      news: { ...ctx.news, items: [...ctx.news.items] },
      itemArchive: [
        {
          id: 'pi1', title: 'Ultra expands its deal with Physical Intelligence', pillar: 'capability', source: 'hn',
          url: 'https://example.test/pi1', published_at: '2026-09-01T01:00:00Z', score: 40,
        },
        {
          id: 'pi2', title: 'Physical Intelligence world-action model paper', pillar: 'capability', source: 'hn',
          url: 'https://example.test/pi2', published_at: '2026-09-02T01:00:00Z', score: 41,
        },
        {
          id: 'pi3', title: 'Benchmarking Physical Intelligence in VLMs', pillar: 'capability', source: 'hn',
          url: 'https://example.test/pi3', published_at: '2026-09-03T01:00:00Z', score: 42,
        },
      ],
    };
    const pi = labsFromEntities(withArch).find((p) => p.id === 'physical-intelligence');
    assert.ok(pi, 'Physical Intelligence clears ENTITY_LAB_MIN');
    assert.match(renderLab(withArch, pi), /What has SIREN scored about Physical Intelligence\?/);
    assert.doesNotMatch(renderLab(withArch, pi), /doom score:\s*\d/i);
  });

  it('indexes CoreWeave, Qualcomm, Tesla, Waymo, Micron, and TSMC entity labs from archive', () => {
    const withArch = {
      ...ctx,
      news: { ...ctx.news, items: [...ctx.news.items] },
      itemArchive: [
        {
          id: 'cw1', title: 'CoreWeave cloud AI capacity expands', pillar: 'compute', source: 'hn',
          url: 'https://example.test/cw1', published_at: '2026-09-01T01:00:00Z', score: 40,
        },
        {
          id: 'cw2', title: 'CoreWeave Physical AI interview', pillar: 'compute', source: 'hn',
          url: 'https://example.test/cw2', published_at: '2026-09-02T01:00:00Z', score: 41,
        },
        {
          id: 'cw3', title: 'AI stocks name CoreWeave after revenue report', pillar: 'compute', source: 'hn',
          url: 'https://example.test/cw3', published_at: '2026-09-03T01:00:00Z', score: 42,
        },
        {
          id: 'qc1', title: 'Qualcomm CEO on on-device AI phones', pillar: 'compute', source: 'hn',
          url: 'https://example.test/qc1', published_at: '2026-09-01T02:00:00Z', score: 40,
        },
        {
          id: 'qc2', title: 'Qualcomm supports 100B-parameter phones', pillar: 'compute', source: 'hn',
          url: 'https://example.test/qc2', published_at: '2026-09-02T02:00:00Z', score: 41,
        },
        {
          id: 'qc3', title: 'AMD vs Qualcomm as AI chip buys', pillar: 'compute', source: 'hn',
          url: 'https://example.test/qc3', published_at: '2026-09-03T02:00:00Z', score: 42,
        },
        {
          id: 'ts1', title: 'Tesla Optimus humanoid training', pillar: 'capability', source: 'hn',
          url: 'https://example.test/ts1', published_at: '2026-09-01T03:00:00Z', score: 40,
        },
        {
          id: 'ts2', title: 'Tesla ramps Optimus production', pillar: 'capability', source: 'hn',
          url: 'https://example.test/ts2', published_at: '2026-09-02T03:00:00Z', score: 41,
        },
        {
          id: 'ts3', title: 'Ex-Tesla Dojo team AI chip startup', pillar: 'compute', source: 'hn',
          url: 'https://example.test/ts3', published_at: '2026-09-03T03:00:00Z', score: 42,
        },
        {
          id: 'wm1', title: 'Waymo safety strategy update', pillar: 'capability', source: 'hn',
          url: 'https://example.test/wm1', published_at: '2026-09-01T04:00:00Z', score: 40,
        },
        {
          id: 'wm2', title: 'Waymo debt raise for AI fleet', pillar: 'capability', source: 'hn',
          url: 'https://example.test/wm2', published_at: '2026-09-02T04:00:00Z', score: 41,
        },
        {
          id: 'wm3', title: 'Kleiner Perkins bets from Anthropic to Waymo', pillar: 'capability', source: 'hn',
          url: 'https://example.test/wm3', published_at: '2026-09-03T04:00:00Z', score: 42,
        },
        {
          id: 'mi1', title: 'Micron memory chip AI demand', pillar: 'compute', source: 'hn',
          url: 'https://example.test/mi1', published_at: '2026-09-01T05:00:00Z', score: 40,
        },
        {
          id: 'mi2', title: 'Micron reports AI-driven revenue', pillar: 'compute', source: 'hn',
          url: 'https://example.test/mi2', published_at: '2026-09-02T05:00:00Z', score: 41,
        },
        {
          id: 'mi3', title: 'SpaceX vs Micron AI stock debate', pillar: 'compute', source: 'hn',
          url: 'https://example.test/mi3', published_at: '2026-09-03T05:00:00Z', score: 42,
        },
        {
          id: 'tm1', title: 'TSMC N2P AI chip node demand', pillar: 'compute', source: 'hn',
          url: 'https://example.test/tm1', published_at: '2026-09-01T06:00:00Z', score: 40,
        },
        {
          id: 'tm2', title: 'Taiwan Semiconductor AI boom profits', pillar: 'compute', source: 'hn',
          url: 'https://example.test/tm2', published_at: '2026-09-02T06:00:00Z', score: 41,
        },
        {
          id: 'tm3', title: 'TSMC earnings as Nvidia read-through', pillar: 'compute', source: 'hn',
          url: 'https://example.test/tm3', published_at: '2026-09-03T06:00:00Z', score: 42,
        },
      ],
    };
    const ids = labsFromEntities(withArch).map((p) => p.id);
    for (const id of ['coreweave', 'qualcomm', 'tesla', 'waymo', 'micron', 'tsmc']) {
      assert.ok(ids.includes(id), id);
    }
    assert.match(renderLab(withArch, labsFromEntities(withArch).find((p) => p.id === 'coreweave')), /What has SIREN scored about CoreWeave\?/);
    assert.match(renderLab(withArch, labsFromEntities(withArch).find((p) => p.id === 'tsmc')), /What has SIREN scored about TSMC\?/);
    assert.doesNotMatch(renderLab(withArch, labsFromEntities(withArch).find((p) => p.id === 'tesla')), /doom score:\s*\d/i);
  });

  it('indexes Samsung, ASML, and Cognition entity labs when archive stories clear the gate', () => {
    const withArch = {
      ...ctx,
      news: { ...ctx.news, items: [...ctx.news.items] },
      itemArchive: [
        {
          id: 'sa1', title: 'Samsung AI glasses with Gemini', pillar: 'capability', source: 'hn',
          url: 'https://example.test/sa1', published_at: '2026-09-01T01:00:00Z', score: 40,
        },
        {
          id: 'sa2', title: 'Samsung profits from AI chip boom', pillar: 'compute', source: 'hn',
          url: 'https://example.test/sa2', published_at: '2026-09-02T01:00:00Z', score: 41,
        },
        {
          id: 'sa3', title: 'Samsung commits to AI infrastructure', pillar: 'compute', source: 'hn',
          url: 'https://example.test/sa3', published_at: '2026-09-03T01:00:00Z', score: 42,
        },
        {
          id: 'as1', title: 'ASML tools for AI fab capacity', pillar: 'compute', source: 'hn',
          url: 'https://example.test/as1', published_at: '2026-09-01T02:00:00Z', score: 40,
        },
        {
          id: 'as2', title: 'ASML CEO interview on chip supply', pillar: 'compute', source: 'hn',
          url: 'https://example.test/as2', published_at: '2026-09-02T02:00:00Z', score: 41,
        },
        {
          id: 'as3', title: 'Earnings watch names ASML and TSMC', pillar: 'compute', source: 'hn',
          url: 'https://example.test/as3', published_at: '2026-09-03T02:00:00Z', score: 42,
        },
        {
          id: 'cg1', title: 'Cognition Supports ChatGPT payment for Devin', pillar: 'capability', source: 'hn',
          url: 'https://example.test/cg1', published_at: '2026-09-01T03:00:00Z', score: 40,
        },
        {
          id: 'cg2', title: 'Alex Stamos joins Cognition as CSO', pillar: 'capability', source: 'hn',
          url: 'https://example.test/cg2', published_at: '2026-09-02T03:00:00Z', score: 41,
        },
        {
          id: 'cg3', title: 'Devin coding agent partnership expands', pillar: 'capability', source: 'hn',
          url: 'https://example.test/cg3', published_at: '2026-09-03T03:00:00Z', score: 42,
        },
      ],
    };
    const ids = labsFromEntities(withArch).map((p) => p.id);
    assert.ok(ids.includes('samsung'));
    assert.ok(ids.includes('asml'));
    assert.ok(ids.includes('cognition'));
    assert.match(renderLab(withArch, labsFromEntities(withArch).find((p) => p.id === 'samsung')), /What has SIREN scored about Samsung\?/);
    assert.match(renderLab(withArch, labsFromEntities(withArch).find((p) => p.id === 'asml')), /What has SIREN scored about ASML\?/);
    assert.match(renderLab(withArch, labsFromEntities(withArch).find((p) => p.id === 'cognition')), /What has SIREN scored about Cognition\?/);
    assert.doesNotMatch(renderLab(withArch, labsFromEntities(withArch).find((p) => p.id === 'cognition')), /doom score:\s*\d/i);
  });

  it('indexes Decart, Sakana AI, Isomorphic Labs, Winverse AI, and Cisco entity labs from archive', () => {
    const withArch = {
      ...ctx,
      news: { ...ctx.news, items: [...ctx.news.items] },
      itemArchive: [
        {
          id: 'dc1', title: 'Amazon reportedly eyeing acquisition of AI start-up Decart', pillar: 'capability', source: 'hn',
          url: 'https://example.test/dc1', published_at: '2026-09-01T01:00:00Z', score: 40,
        },
        {
          id: 'dc2', title: 'Why Amazon might pay billions for Decart', pillar: 'capability', source: 'hn',
          url: 'https://example.test/dc2', published_at: '2026-09-02T01:00:00Z', score: 41,
        },
        {
          id: 'dc3', title: 'AMZN Eyes Decart AI upside', pillar: 'capability', source: 'hn',
          url: 'https://example.test/dc3', published_at: '2026-09-03T01:00:00Z', score: 42,
        },
        {
          id: 'sk1', title: 'Sakana AI self-improving model update', pillar: 'capability', source: 'hn',
          url: 'https://example.test/sk1', published_at: '2026-09-01T02:00:00Z', score: 40,
        },
        {
          id: 'sk2', title: 'Sakana AI demonstrates a working RSI loop', pillar: 'capability', source: 'hn',
          url: 'https://example.test/sk2', published_at: '2026-09-02T02:00:00Z', score: 41,
        },
        {
          id: 'sk3', title: 'Sakana AI peer review system catches errors', pillar: 'capability', source: 'hn',
          url: 'https://example.test/sk3', published_at: '2026-09-03T02:00:00Z', score: 42,
        },
        {
          id: 'il1', title: 'Isomorphic Labs drug discovery spin-out', pillar: 'capability', source: 'hn',
          url: 'https://example.test/il1', published_at: '2026-09-01T03:00:00Z', score: 40,
        },
        {
          id: 'il2', title: 'Isomorphic Labs and DeepMind invest in virtual cell', pillar: 'capability', source: 'hn',
          url: 'https://example.test/il2', published_at: '2026-09-02T03:00:00Z', score: 41,
        },
        {
          id: 'il3', title: 'Meta and Isomorphic Labs fund biology AI', pillar: 'capability', source: 'hn',
          url: 'https://example.test/il3', published_at: '2026-09-03T03:00:00Z', score: 42,
        },
        {
          id: 'wv1', title: 'DeepSeek leads Winverse AI seed round', pillar: 'capability', source: 'hn',
          url: 'https://example.test/wv1', published_at: '2026-09-01T04:00:00Z', score: 40,
        },
        {
          id: 'wv2', title: 'Winverse AI robotics startup funding', pillar: 'capability', source: 'hn',
          url: 'https://example.test/wv2', published_at: '2026-09-02T04:00:00Z', score: 41,
        },
        {
          id: 'wv3', title: 'DeepSeek backs Winverse AI founder', pillar: 'capability', source: 'hn',
          url: 'https://example.test/wv3', published_at: '2026-09-03T04:00:00Z', score: 42,
        },
        {
          id: 'cs1', title: 'Cisco and NVIDIA announce pluggable optics for AI factories', pillar: 'compute', source: 'hn',
          url: 'https://example.test/cs1', published_at: '2026-09-01T05:00:00Z', score: 40,
        },
        {
          id: 'cs2', title: 'Watch Cisco tackle AI data center bottleneck', pillar: 'compute', source: 'hn',
          url: 'https://example.test/cs2', published_at: '2026-09-02T05:00:00Z', score: 41,
        },
        {
          id: 'cs3', title: 'Cisco expands path to AI connectivity', pillar: 'compute', source: 'hn',
          url: 'https://example.test/cs3', published_at: '2026-09-03T05:00:00Z', score: 42,
        },
      ],
    };
    const ids = labsFromEntities(withArch).map((p) => p.id);
    for (const id of ['decart', 'sakana-ai', 'isomorphic-labs', 'winverse-ai', 'cisco']) {
      assert.ok(ids.includes(id), id);
    }
    assert.match(renderLab(withArch, labsFromEntities(withArch).find((p) => p.id === 'decart')), /What has SIREN scored about Decart\?/);
    assert.match(renderLab(withArch, labsFromEntities(withArch).find((p) => p.id === 'sakana-ai')), /What has SIREN scored about Sakana AI\?/);
    assert.match(renderLab(withArch, labsFromEntities(withArch).find((p) => p.id === 'isomorphic-labs')), /What has SIREN scored about Isomorphic Labs\?/);
    assert.match(renderLab(withArch, labsFromEntities(withArch).find((p) => p.id === 'winverse-ai')), /What has SIREN scored about Winverse AI\?/);
    assert.match(renderLab(withArch, labsFromEntities(withArch).find((p) => p.id === 'cisco')), /What has SIREN scored about Cisco\?/);
    assert.doesNotMatch(renderLab(withArch, labsFromEntities(withArch).find((p) => p.id === 'decart')), /doom score:\s*\d/i);
  });

  it('indexes Epoch AI entity lab from archive (two-word form only)', () => {
    const withArch = {
      ...ctx,
      news: { ...ctx.news, items: [...ctx.news.items] },
      itemArchive: [
        {
          id: 'ep1', title: 'Claude Opus 5.5 Tops Epoch AI Leaderboard', pillar: 'capability', source: 'hn',
          url: 'https://example.test/ep1', published_at: '2026-09-01T01:00:00Z', score: 40,
        },
        {
          id: 'ep2', title: 'Epoch AI shows LLMs still have a long way to go', pillar: 'capability', source: 'hn',
          url: 'https://example.test/ep2', published_at: '2026-09-02T01:00:00Z', score: 41,
        },
        {
          id: 'ep3', title: 'Epoch AI and Anthropic independently found the same thing', pillar: 'capability', source: 'hn',
          url: 'https://example.test/ep3', published_at: '2026-09-03T01:00:00Z', score: 42,
        },
        {
          id: 'epbad', title: 'An epoch of history in AI policy', pillar: 'governance', source: 'hn',
          url: 'https://example.test/epbad', published_at: '2026-09-04T01:00:00Z', score: 30,
        },
      ],
    };
    const epoch = labsFromEntities(withArch).find((p) => p.id === 'epoch-ai');
    assert.ok(epoch, 'Epoch AI clears ENTITY_LAB_MIN');
    const html = renderLab(withArch, epoch);
    assert.match(html, /What has SIREN scored about Epoch AI\?/);
    assert.doesNotMatch(html, /An epoch of history/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.ok(sitemapEntries(withArch).some((e) => e.loc === '/lab/epoch-ai.html'));
  });

  it('indexes Artificial Analysis entity lab from archive (two-word form only)', () => {
    const withArch = {
      ...ctx,
      news: { ...ctx.news, items: [...ctx.news.items] },
      itemArchive: [
        {
          id: 'aa1', title: 'Artificial Analysis Intelligence Index ranks Sonnet above Astra', pillar: 'capability', source: 'hn',
          url: 'https://example.test/aa1', published_at: '2026-09-01T01:00:00Z', score: 40,
        },
        {
          id: 'aa2', title: 'Artificial Analysis says Mistral Large 4 leads outside the US', pillar: 'capability', source: 'hn',
          url: 'https://example.test/aa2', published_at: '2026-09-02T01:00:00Z', score: 41,
        },
        {
          id: 'aa3', title: 'Artificial Analysis launches the Cyber Index Alliance', pillar: 'capability', source: 'hn',
          url: 'https://example.test/aa3', published_at: '2026-09-03T01:00:00Z', score: 42,
        },
        {
          id: 'aabad', title: 'An analysis of artificial general intelligence timelines', pillar: 'governance', source: 'hn',
          url: 'https://example.test/aabad', published_at: '2026-09-04T01:00:00Z', score: 30,
        },
      ],
    };
    const aa = labsFromEntities(withArch).find((p) => p.id === 'artificial-analysis');
    assert.ok(aa, 'Artificial Analysis clears ENTITY_LAB_MIN');
    const html = renderLab(withArch, aa);
    assert.match(html, /What has SIREN scored about Artificial Analysis\?/);
    assert.doesNotMatch(html, /An analysis of artificial general/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.ok(sitemapEntries(withArch).some((e) => e.loc === '/lab/artificial-analysis.html'));
  });

  it('indexes Salesforce and World Labs entity labs from archive', () => {
    const withArch = {
      ...ctx,
      news: { ...ctx.news, items: [...ctx.news.items] },
      itemArchive: [
        {
          id: 'sf1', title: 'Salesforce agrees to buy Listen Labs', pillar: 'capability', source: 'hn',
          url: 'https://example.test/sf1', published_at: '2026-09-01T01:00:00Z', score: 40,
        },
        {
          id: 'sf2', title: 'Salesforce is saying bye to AI branding', pillar: 'capability', source: 'hn',
          url: 'https://example.test/sf2', published_at: '2026-09-02T01:00:00Z', score: 41,
        },
        {
          id: 'sf3', title: 'Ex-Meta, Salesforce lead categorises AI workers', pillar: 'capability', source: 'hn',
          url: 'https://example.test/sf3', published_at: '2026-09-03T01:00:00Z', score: 42,
        },
        {
          id: 'wl1', title: 'AMD acquires World Labs AI startup', pillar: 'capability', source: 'hn',
          url: 'https://example.test/wl1', published_at: '2026-09-01T02:00:00Z', score: 40,
        },
        {
          id: 'wl2', title: 'AMD agrees to acquire Fei-Fei Li\'s World Labs', pillar: 'capability', source: 'hn',
          url: 'https://example.test/wl2', published_at: '2026-09-02T02:00:00Z', score: 41,
        },
        {
          id: 'wl3', title: 'AMD is acquiring AI company World Labs', pillar: 'capability', source: 'hn',
          url: 'https://example.test/wl3', published_at: '2026-09-03T02:00:00Z', score: 42,
        },
        {
          id: 'wlbad', title: 'A world of labs races toward AGI', pillar: 'governance', source: 'hn',
          url: 'https://example.test/wlbad', published_at: '2026-09-04T02:00:00Z', score: 30,
        },
      ],
    };
    const ids = labsFromEntities(withArch).map((p) => p.id);
    assert.ok(ids.includes('salesforce'), 'Salesforce clears ENTITY_LAB_MIN');
    assert.ok(ids.includes('world-labs'), 'World Labs clears ENTITY_LAB_MIN');
    assert.match(renderLab(withArch, labsFromEntities(withArch).find((p) => p.id === 'salesforce')), /What has SIREN scored about Salesforce\?/);
    assert.match(renderLab(withArch, labsFromEntities(withArch).find((p) => p.id === 'world-labs')), /What has SIREN scored about World Labs\?/);
    assert.doesNotMatch(renderLab(withArch, labsFromEntities(withArch).find((p) => p.id === 'world-labs')), /A world of labs/);
    assert.ok(sitemapEntries(withArch).some((e) => e.loc === '/lab/salesforce.html'));
    assert.ok(sitemapEntries(withArch).some((e) => e.loc === '/lab/world-labs.html'));
  });

  it('indexes Supermicro, IREN, OpenRouter, and Reflection AI entity labs from archive', () => {
    const withArch = {
      ...ctx,
      news: { ...ctx.news, items: [...ctx.news.items] },
      itemArchive: [
        {
          id: 'sm1', title: 'Supermicro powers DigiPowerX with Blackwell', pillar: 'compute', source: 'hn',
          url: 'https://example.test/sm1', published_at: '2026-09-01T01:00:00Z', score: 40,
        },
        {
          id: 'sm2', title: 'Super Micro contractor AI server case', pillar: 'compute', source: 'hn',
          url: 'https://example.test/sm2', published_at: '2026-09-02T01:00:00Z', score: 41,
        },
        {
          id: 'sm3', title: 'Supermicro AI rack demand rises', pillar: 'compute', source: 'hn',
          url: 'https://example.test/sm3', published_at: '2026-09-03T01:00:00Z', score: 42,
        },
        {
          id: 'ir1', title: 'IREN stock rises on Anthropic cloud deal', pillar: 'compute', source: 'hn',
          url: 'https://example.test/ir1', published_at: '2026-09-01T02:00:00Z', score: 40,
        },
        {
          id: 'ir2', title: 'IREN named as Anthropic cloud client', pillar: 'compute', source: 'hn',
          url: 'https://example.test/ir2', published_at: '2026-09-02T02:00:00Z', score: 41,
        },
        {
          id: 'ir3', title: 'IREN rebounds on AI datacentre report', pillar: 'compute', source: 'hn',
          url: 'https://example.test/ir3', published_at: '2026-09-03T02:00:00Z', score: 42,
        },
        {
          id: 'or1', title: 'OpenRouter spend share OpenAI vs Anthropic', pillar: 'capability', source: 'hn',
          url: 'https://example.test/or1', published_at: '2026-09-01T03:00:00Z', score: 40,
        },
        {
          id: 'or2', title: 'Nvidia considered an OpenRouter bid', pillar: 'capability', source: 'hn',
          url: 'https://example.test/or2', published_at: '2026-09-02T03:00:00Z', score: 41,
        },
        {
          id: 'or3', title: 'Usage and spend diverge on OpenRouter', pillar: 'capability', source: 'hn',
          url: 'https://example.test/or3', published_at: '2026-09-03T03:00:00Z', score: 42,
        },
        {
          id: 'rf1', title: 'Nvidia in talks to acquire Reflection AI', pillar: 'capability', source: 'hn',
          url: 'https://example.test/rf1', published_at: '2026-09-01T04:00:00Z', score: 40,
        },
        {
          id: 'rf2', title: 'Nvidia weighs further investment in Reflection AI', pillar: 'capability', source: 'hn',
          url: 'https://example.test/rf2', published_at: '2026-09-02T04:00:00Z', score: 41,
        },
        {
          id: 'rf3', title: 'Reflection AI open-model startup valuation', pillar: 'capability', source: 'hn',
          url: 'https://example.test/rf3', published_at: '2026-09-03T04:00:00Z', score: 42,
        },
      ],
    };
    const ids = labsFromEntities(withArch).map((p) => p.id);
    for (const id of ['supermicro', 'iren', 'openrouter', 'reflection-ai']) {
      assert.ok(ids.includes(id), id);
    }
    assert.match(renderLab(withArch, labsFromEntities(withArch).find((p) => p.id === 'supermicro')), /What has SIREN scored about Supermicro\?/);
    assert.match(renderLab(withArch, labsFromEntities(withArch).find((p) => p.id === 'iren')), /What has SIREN scored about IREN\?/);
    assert.match(renderLab(withArch, labsFromEntities(withArch).find((p) => p.id === 'openrouter')), /What has SIREN scored about OpenRouter\?/);
    assert.match(renderLab(withArch, labsFromEntities(withArch).find((p) => p.id === 'reflection-ai')), /What has SIREN scored about Reflection AI\?/);
    assert.doesNotMatch(renderLab(withArch, labsFromEntities(withArch).find((p) => p.id === 'reflection-ai')), /doom score:\s*\d/i);
  });

  it('indexes Huawei and Sony entity labs when archive stories clear the gate', () => {
    const withArch = {
      ...ctx,
      news: { ...ctx.news, items: [...ctx.news.items] },
      itemArchive: [
        {
          id: 'hw1', title: 'Huawei AI phone chip strategy', pillar: 'compute', source: 'hn',
          url: 'https://example.test/hw1', published_at: '2026-09-01T01:00:00Z', score: 40,
        },
        {
          id: 'hw2', title: 'Huawei patent deal covering AI and 5G', pillar: 'compute', source: 'hn',
          url: 'https://example.test/hw2', published_at: '2026-09-02T01:00:00Z', score: 41,
        },
        {
          id: 'hw3', title: 'Tencent Qualcomm Huawei AI phone fight', pillar: 'compute', source: 'hn',
          url: 'https://example.test/hw3', published_at: '2026-09-03T01:00:00Z', score: 42,
        },
        {
          id: 'sy1', title: 'Sony and Warner sue Anthropic over Claude', pillar: 'capability', source: 'hn',
          url: 'https://example.test/sy1', published_at: '2026-09-01T02:00:00Z', score: 40,
        },
        {
          id: 'sy2', title: 'Sony launches AI upscaling for cinema', pillar: 'capability', source: 'hn',
          url: 'https://example.test/sy2', published_at: '2026-09-02T02:00:00Z', score: 41,
        },
        {
          id: 'sy3', title: 'Sony AI music training lawsuit expands', pillar: 'capability', source: 'hn',
          url: 'https://example.test/sy3', published_at: '2026-09-03T02:00:00Z', score: 42,
        },
      ],
    };
    const ids = labsFromEntities(withArch).map((p) => p.id);
    assert.ok(ids.includes('huawei'), 'Huawei clears ENTITY_LAB_MIN');
    assert.ok(ids.includes('sony'), 'Sony clears ENTITY_LAB_MIN');
    assert.match(renderLab(withArch, labsFromEntities(withArch).find((p) => p.id === 'huawei')), /What has SIREN scored about Huawei\?/);
    assert.match(renderLab(withArch, labsFromEntities(withArch).find((p) => p.id === 'sony')), /What has SIREN scored about Sony\?/);
    assert.doesNotMatch(renderLab(withArch, labsFromEntities(withArch).find((p) => p.id === 'huawei')), /doom score:\s*\d/i);
  });

  it('does not treat Intel as a substring of intelligent', () => {
    const player = { id: 'intel', name: 'Intel', entityName: 'Intel', entityOnly: true };
    const falseHit = {
      id: 'x',
      title: 'An intelligent agent plans the week',
      summary: '',
      pillar: 'capability',
      source: 'hn',
      url: 'https://example.test/x',
      published_at: '2026-10-09T07:00:00Z',
      score: 40,
    };
    const trueHit = {
      id: 'y',
      title: 'Intel CEO says Chinese AI models see rapid adoption',
      summary: '',
      pillar: 'capability',
      source: 'hn',
      url: 'https://example.test/y',
      published_at: '2026-10-09T07:00:00Z',
      score: 40,
    };
    assert.equal(itemsForLab({ news: { items: [falseHit] } }, player).length, 0);
    assert.equal(itemsForLab({ news: { items: [trueHit] } }, player).length, 1);
  });

  it('ships /lab/ and /companies.html indexes over the gated lab set', () => {
    assert.ok(indexableLabs(ctx).some((p) => p.id === 'openai'));
    const labIndex = renderLabIndex(ctx);
    assert.match(labIndex, /AI labs this index covers/);
    assert.match(labIndex, /\/lab\/openai\.html/);
    assert.match(labIndex, /\/companies\.html/);
    assert.match(labIndex, /not a doom ranking/);
    const companies = renderCompanies(ctx);
    assert.match(companies, /Which AI companies has SIREN scored stories about\?/);
    assert.match(companies, /does not publish a company/);
    assert.match(companies, /\/lab\/openai\.html/);
    assert.match(companies, /\/compare\.html/);
    assert.match(companies, /SpeakableSpecification/);
    assert.match(companies, /FAQPage/);
    assert.match(companies, /Questions people actually ask/);
    assert.doesNotMatch(companies, /doom score:\s*\d/i);
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

  it('renders an outlet page that lists its stories', () => {
    const html = renderSource(ctx, 'hn');
    assert.match(html, /What has SIREN scored via hn\?/);
    assert.match(html, /CollectionPage/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /"@type"\s*:\s*"FAQPage"/);
    assert.match(html, /speakable/);
    assert.doesNotMatch(html, /noindex/);
    assert.match(html, /item\//);
    assert.match(html, /\/sources\.html/);
  });

  it('ships /sources.html over the same gated feed-adapter set', () => {
    const html = renderSources(ctx);
    assert.match(html, /Which AI news sources has SIREN scored via\?/);
    assert.match(html, /\/source\/hn\.html/);
    assert.match(html, /does not publish a source/);
    assert.match(html, /Questions people actually ask/);
    assert.match(html, /"@type"\s*:\s*"FAQPage"/);
    assert.match(html, /speakable/);
    assert.match(html, /\/outlets\.html/);
    assert.match(renderSourceIndex(ctx), /\/sources\.html/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
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
    assert.match(html, /Older scored stories from hn/);
    assert.match(html, /Archived HN story about agents/);
    assert.match(html, /\/item\/archive\.html/);
  });

  it('lets the durable archive keep a feed-adapter hub above the substance gate', () => {
    const withArch = {
      ...ctx,
      itemArchive: [
        {
          id: 'tc-old1',
          title: 'Archived TechCrunch one',
          pillar: 'attention',
          source: 'techcrunch',
          url: 'https://example.test/tc1',
          published_at: '2026-09-01T01:00:00Z',
          score: 40,
        },
        {
          id: 'tc-old2',
          title: 'Archived TechCrunch two',
          pillar: 'attention',
          source: 'techcrunch',
          url: 'https://example.test/tc2',
          published_at: '2026-09-02T01:00:00Z',
          score: 41,
        },
        {
          id: 'tc-old3',
          title: 'Archived TechCrunch three',
          pillar: 'attention',
          source: 'techcrunch',
          url: 'https://example.test/tc3',
          published_at: '2026-09-03T01:00:00Z',
          score: 42,
        },
      ],
    };
    assert.equal(sourceIndexable(withArch, 'techcrunch'), true);
    assert.ok(indexableSources(withArch).some((s) => s.id === 'techcrunch'));
    const html = renderSource(withArch, 'techcrunch');
    assert.doesNotMatch(html, /noindex/);
    assert.match(html, /Older scored stories/);
  });
});
