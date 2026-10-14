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
    assert.match(html, /<h1>What has SIREN scored under Capability\?<\/h1>/);
    assert.match(html, /CollectionPage/);
    assert.match(html, /BreadcrumbList/);
    assert.match(html, /Which AI activity pillars have SIREN pages\?/);
    assert.match(html, /What has SIREN scored under Attention\?/);
    assert.match(html, /How the SIREN AI activity index is computed · methodology/);
    assert.match(html, /What questions do people actually ask\?/);
    assert.match(html, /"@type"\s*:\s*"FAQPage"/);
    assert.match(html, /speakable/);
    assert.match(html, /id="window"[^>]*>Which scored stories are under Capability in this window\?/);
    assert.match(html, /id="other-pillars"[^>]*>Which other pillars have scored stories\?/);
    assert.match(html, /pillar\/attention\.html/);
    assert.match(html, /href="\/">AI activity index today · SIREN<\/a>/);
    assert.doesNotMatch(html, /href="\/">homepage<\/a>/);
    assert.doesNotMatch(html, /noindex/);
    assert.doesNotMatch(html, /<h2>Stories scored under Capability<\/h2>/);
    assert.doesNotMatch(html, /<h2>Other pillars<\/h2>/);
    assert.doesNotMatch(html, /pillar doom score:\s*\d/i);
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
    assert.match(html, /id="older"[^>]*>Which older scored stories are under Capability\?/);
    assert.match(html, /Archived capability story/);
    assert.match(html, /\/item\/archive\.html/);
    assert.doesNotMatch(html, /<h2>Older scored stories under Capability<\/h2>/);
  });

  it('overflow more-link uses the live-window item question H1', () => {
    const fat = {
      ...ctx,
      news: {
        ...ctx.news,
        items: Array.from({ length: 45 }, (_, i) => ({
          id: `cap-fat${i}`,
          title: `Capability fat story ${i}`,
          pillar: 'capability',
          source: 'hn',
          url: `https://example.test/fat${i}`,
          published_at: '2026-10-10T01:00:00Z',
          score: 50,
        })),
      },
    };
    const html = renderPillar(fat, 'capability');
    assert.match(html, /href="\/item\/">Which scored AI stories are in the SIREN live window\?<\/a>/);
    assert.doesNotMatch(html, /href="\/item\/">every scored item<\/a>/);
    assert.doesNotMatch(html, /pillar doom score:\s*\d/i);
    assert.doesNotMatch(html, /probability of doom/i);
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
    assert.match(html, /id="older"[^>]*>Which older scored stories are under Markets\?/);
    assert.doesNotMatch(html, /<h2>Older scored stories under Markets<\/h2>/);
  });

  it('ships /pillars.html and /pillar/ over the same gated pillar set', () => {
    assert.ok(indexablePillars(ctx).some((p) => p.id === 'capability'));
    assert.ok(!indexablePillars(ctx).some((p) => p.id === 'markets'));
    const hub = renderPillars(ctx);
    assert.match(hub, /Which AI activity pillars has SIREN scored\?/);
    assert.match(hub, /What has SIREN scored under Capability\?/);
    assert.match(hub, /Which AI doom indexes can you compare\?/);
    assert.match(hub, /Which AI activity pillars have SIREN pages\?/);
    assert.match(hub, /fc__k"><a href="\/compare\.html">Which AI doom indexes can you compare\?<\/a>/);
    assert.doesNotMatch(hub, /fc__k"><a href="\/compare\.html">Compare<\/a>/);
    assert.doesNotMatch(hub, /fc__k"><a href="\/pillar\/">Pillars<\/a>/);
    assert.match(hub, /\/pillar\/capability\.html/);
    assert.match(hub, /does not publish a pillar/);
    assert.match(hub, /What questions do people actually ask\?/);
    assert.match(hub, /"@type"\s*:\s*"FAQPage"/);
    assert.match(hub, /speakable/);
    assert.match(hub, /\/methodology\.html/);
    assert.doesNotMatch(hub, /doom score:\s*\d/i);
    const index = renderPillarIndex(ctx);
    assert.match(index, /Which AI activity pillars have SIREN pages\?/);
    assert.match(index, /What has SIREN scored under Capability\?/);
    assert.match(index, /Which AI stories has SIREN scored in this window\?/);
    assert.match(index, /fc__k"><a href="\/news\.html">Which AI stories has SIREN scored in this window\?<\/a>/);
    assert.doesNotMatch(index, /fc__k"><a href="\/news\.html">Newsroom<\/a>/);
    assert.match(index, /What questions do people actually ask\?/);
    assert.match(index, /"@type"\s*:\s*"FAQPage"/);
    assert.match(index, /speakable/);
    assert.match(index, /\/pillars\.html/);
    assert.doesNotMatch(index, /doom score:\s*\d/i);
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
    assert.match(html, /<h1>What has SIREN scored about OpenAI\?<\/h1>/);
    assert.match(html, /Who is winning the AI race\?/);
    assert.match(html, /Which AI labs have SIREN pages\?/);
    assert.match(html, /Which AI companies has SIREN scored stories about\?/);
    assert.match(html, /What has SIREN scored about Anthropic\?/);
    assert.match(html, /id="window"[^>]*>Which related scored stories name OpenAI in this window\?/);
    assert.match(html, /id="other-labs"[^>]*>Which other labs have scored stories\?/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /What questions do people actually ask\?/);
    assert.match(html, /lab\/anthropic\.html/);
    assert.match(html, /CollectionPage/);
    assert.match(html, /fc__k"><a href="\/race\.html">Who is winning the AI race\?<\/a>/);
    assert.doesNotMatch(html, /fc__k"><a href="\/race\.html">The Race<\/a>/);
    assert.doesNotMatch(html, /fc__k"><a href="\/lab\/">Labs<\/a>/);
    assert.doesNotMatch(html, /<h2>Related stories in this window<\/h2>/);
    assert.doesNotMatch(html, /<h2>Other labs<\/h2>/);
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
    assert.match(html, /id="older"[^>]*>Which older scored stories name OpenAI\?/);
    assert.match(html, /Archived OpenAI model card/);
    assert.match(html, /\/item\/archive\.html/);
    assert.doesNotMatch(html, /<h2>Older scored stories naming OpenAI<\/h2>/);
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
    assert.match(html, /id="older"[^>]*>Which older scored stories name ByteDance\?/);
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

  it('indexes Firmus entity lab when archive IPO headlines clear the gate', () => {
    const withArch = {
      ...ctx,
      news: { ...ctx.news, items: [...ctx.news.items] },
      itemArchive: [
        {
          id: 'fm1', title: 'Nvidia-Backed Firmus Scraps Australian IPO', pillar: 'compute', source: 'hn',
          url: 'https://example.test/fm1', published_at: '2026-09-01T01:00:00Z', score: 40,
        },
        {
          id: 'fm2', title: 'Firmus IPO Debacle Raises the Bar for Asia AI Deals', pillar: 'compute', source: 'hn',
          url: 'https://example.test/fm2', published_at: '2026-09-02T01:00:00Z', score: 41,
        },
        {
          id: 'fm3', title: 'Firmus Pulls Its $30 Billion A.I. Stock Listing', pillar: 'compute', source: 'hn',
          url: 'https://example.test/fm3', published_at: '2026-09-03T01:00:00Z', score: 42,
        },
        {
          id: 'fmbad', title: 'Data centre firm scraps listing amid AI valuation concerns', pillar: 'compute', source: 'hn',
          url: 'https://example.test/fmbad', published_at: '2026-09-04T01:00:00Z', score: 30,
        },
      ],
    };
    const firmus = labsFromEntities(withArch).find((p) => p.id === 'firmus');
    assert.ok(firmus, 'Firmus clears ENTITY_LAB_MIN');
    assert.match(renderLab(withArch, firmus), /What has SIREN scored about Firmus\?/);
    assert.doesNotMatch(renderLab(withArch, firmus), /Data centre firm scraps listing/);
    assert.ok(sitemapEntries(withArch).some((e) => e.loc === '/lab/firmus.html'));
  });

  it('indexes SpaceX entity lab when archive AI-chip headlines clear the gate', () => {
    const withArch = {
      ...ctx,
      news: { ...ctx.news, items: [...ctx.news.items] },
      itemArchive: [
        {
          id: 'sx1', title: 'SpaceX Seeks $40 Billion to Buy Nvidia AI Chips', pillar: 'compute', source: 'hn',
          url: 'https://example.test/sx1', published_at: '2026-09-01T01:00:00Z', score: 40,
        },
        {
          id: 'sx2', title: 'SpaceX vs. Micron: Which Is the Better Artificial Intelligence Stock', pillar: 'compute', source: 'hn',
          url: 'https://example.test/sx2', published_at: '2026-09-02T01:00:00Z', score: 41,
        },
        {
          id: 'sx3', title: "Silicon Valley's Compute Arms Race: SpaceX's GPU Reselling Revenue", pillar: 'compute', source: 'hn',
          url: 'https://example.test/sx3', published_at: '2026-09-03T01:00:00Z', score: 42,
        },
        {
          id: 'sxbad', title: 'Outer space race heats up without naming the lab', pillar: 'capability', source: 'hn',
          url: 'https://example.test/sxbad', published_at: '2026-09-04T01:00:00Z', score: 30,
        },
      ],
    };
    const spacex = labsFromEntities(withArch).find((p) => p.id === 'spacex');
    assert.ok(spacex, 'SpaceX clears ENTITY_LAB_MIN');
    assert.match(renderLab(withArch, spacex), /What has SIREN scored about SpaceX\?/);
    assert.doesNotMatch(renderLab(withArch, spacex), /Outer space race heats up/);
    assert.ok(sitemapEntries(withArch).some((e) => e.loc === '/lab/spacex.html'));
  });

  it('indexes HCLTech entity lab when archive Anthropic-partnership headlines clear the gate', () => {
    const withArch = {
      ...ctx,
      news: { ...ctx.news, items: [...ctx.news.items] },
      itemArchive: [
        {
          id: 'hc1', title: 'HCLTech, Anthropic partner to expand enterprise agentic AI deployments', pillar: 'capability', source: 'hn',
          url: 'https://example.test/hc1', published_at: '2026-09-01T01:00:00Z', score: 40,
        },
        {
          id: 'hc2', title: 'HCL Tech and Anthropic sign Global Premier Partnership', pillar: 'capability', source: 'hn',
          url: 'https://example.test/hc2', published_at: '2026-09-02T01:00:00Z', score: 41,
        },
        {
          id: 'hc3', title: "India's HCLTech signs a pact with Anthropic, to set up business unit", pillar: 'capability', source: 'hn',
          url: 'https://example.test/hc3', published_at: '2026-09-03T01:00:00Z', score: 42,
        },
        {
          id: 'hcbad', title: 'HCL Group quarterly results beat estimates without AI', pillar: 'compute', source: 'hn',
          url: 'https://example.test/hcbad', published_at: '2026-09-04T01:00:00Z', score: 30,
        },
      ],
    };
    const hcl = labsFromEntities(withArch).find((p) => p.id === 'hcltech');
    assert.ok(hcl, 'HCLTech clears ENTITY_LAB_MIN');
    assert.match(renderLab(withArch, hcl), /What has SIREN scored about HCLTech\?/);
    assert.doesNotMatch(renderLab(withArch, hcl), /HCL Group quarterly results/);
    assert.ok(sitemapEntries(withArch).some((e) => e.loc === '/lab/hcltech.html'));
  });

  it('indexes Suno entity lab when archive AI-music headlines clear the gate', () => {
    const withArch = {
      ...ctx,
      news: { ...ctx.news, items: [...ctx.news.items] },
      itemArchive: [
        {
          id: 'su1', title: 'Suno debuts Speech for spoken voices from scripts', pillar: 'capability', source: 'hn',
          url: 'https://example.test/su1', published_at: '2026-09-01T01:00:00Z', score: 40,
        },
        {
          id: 'su2', title: 'AI music maker Suno now generates spoken words', pillar: 'capability', source: 'hn',
          url: 'https://example.test/su2', published_at: '2026-09-02T01:00:00Z', score: 41,
        },
        {
          id: 'su3', title: 'Sony and UMG are suing Suno again', pillar: 'governance', source: 'hn',
          url: 'https://example.test/su3', published_at: '2026-09-03T01:00:00Z', score: 42,
        },
        {
          id: 'subad', title: 'A sunny day for open weights without naming the lab', pillar: 'capability', source: 'hn',
          url: 'https://example.test/subad', published_at: '2026-09-04T01:00:00Z', score: 30,
        },
      ],
    };
    const suno = labsFromEntities(withArch).find((p) => p.id === 'suno');
    assert.ok(suno, 'Suno clears ENTITY_LAB_MIN');
    assert.match(renderLab(withArch, suno), /What has SIREN scored about Suno\?/);
    assert.doesNotMatch(renderLab(withArch, suno), /sunny day for open weights/);
    assert.ok(sitemapEntries(withArch).some((e) => e.loc === '/lab/suno.html'));
  });

  it('indexes Manus entity lab when archive agent headlines clear the gate', () => {
    const withArch = {
      ...ctx,
      news: { ...ctx.news, items: [...ctx.news.items] },
      itemArchive: [
        {
          id: 'mn1', title: 'China’s Manus raises over $500M in first funding round since split with Meta', pillar: 'compute', source: 'hn',
          url: 'https://example.test/mn1', published_at: '2026-09-01T01:00:00Z', score: 40,
        },
        {
          id: 'mn2', title: 'Manus debuts Manus 2.0, its latest AI agent, and Cue', pillar: 'capability', source: 'hn',
          url: 'https://example.test/mn2', published_at: '2026-09-02T01:00:00Z', score: 41,
        },
        {
          id: 'mn3', title: 'OpenAI Revenue Forecast Cut, Manus Raises $500M', pillar: 'compute', source: 'hn',
          url: 'https://example.test/mn3', published_at: '2026-09-03T01:00:00Z', score: 42,
        },
        {
          id: 'mnbad', title: 'A codex of medieval manuscripts goes online', pillar: 'capability', source: 'hn',
          url: 'https://example.test/mnbad', published_at: '2026-09-04T01:00:00Z', score: 30,
        },
      ],
    };
    const manus = labsFromEntities(withArch).find((p) => p.id === 'manus');
    assert.ok(manus, 'Manus clears ENTITY_LAB_MIN');
    assert.match(renderLab(withArch, manus), /What has SIREN scored about Manus\?/);
    assert.doesNotMatch(renderLab(withArch, manus), /medieval manuscripts/);
    assert.ok(sitemapEntries(withArch).some((e) => e.loc === '/lab/manus.html'));
  });

  it('indexes Yandex and TikTok entity labs when archive headlines clear the gate', () => {
    const withArch = {
      ...ctx,
      news: { ...ctx.news, items: [...ctx.news.items] },
      itemArchive: [
        {
          id: 'ya1', title: 'Ukraine has hit three Yandex data centres in a week', pillar: 'compute', source: 'hn',
          url: 'https://example.test/ya1', published_at: '2026-09-01T01:00:00Z', score: 40,
        },
        {
          id: 'ya2', title: 'Yandex says a drone strike shut down a third data center and YandexGPT', pillar: 'compute', source: 'hn',
          url: 'https://example.test/ya2', published_at: '2026-09-02T01:00:00Z', score: 41,
        },
        {
          id: 'ya3', title: 'Ukraine Hits Second Yandex Cloud Data Center in 24 Hours', pillar: 'compute', source: 'hn',
          url: 'https://example.test/ya3', published_at: '2026-09-03T01:00:00Z', score: 42,
        },
        {
          id: 'yabad', title: 'Russia’s Google nickname alone should not invent a lab match', pillar: 'compute', source: 'hn',
          url: 'https://example.test/yabad', published_at: '2026-09-04T01:00:00Z', score: 30,
        },
        {
          id: 'tt1', title: 'TikTok’s Chew and Microsoft’s Althoff Warn About Runaway AI Hype', pillar: 'governance', source: 'hn',
          url: 'https://example.test/tt1', published_at: '2026-09-01T02:00:00Z', score: 40,
        },
        {
          id: 'tt2', title: 'AI to bring scientific breakthroughs in 2-3 years: TikTok CEO', pillar: 'capability', source: 'hn',
          url: 'https://example.test/tt2', published_at: '2026-09-02T02:00:00Z', score: 41,
        },
        {
          id: 'tt3', title: "TikTok's CEO warns that AI hype is outpacing the technology's reality", pillar: 'governance', source: 'hn',
          url: 'https://example.test/tt3', published_at: '2026-09-03T02:00:00Z', score: 42,
        },
        {
          id: 'ttbad', title: 'A short video about birds without naming the product', pillar: 'capability', source: 'hn',
          url: 'https://example.test/ttbad', published_at: '2026-09-04T02:00:00Z', score: 30,
        },
      ],
    };
    const yandex = labsFromEntities(withArch).find((p) => p.id === 'yandex');
    const tiktok = labsFromEntities(withArch).find((p) => p.id === 'tiktok');
    assert.ok(yandex, 'Yandex clears ENTITY_LAB_MIN');
    assert.ok(tiktok, 'TikTok clears ENTITY_LAB_MIN');
    assert.match(renderLab(withArch, yandex), /What has SIREN scored about Yandex\?/);
    assert.match(renderLab(withArch, tiktok), /What has SIREN scored about TikTok\?/);
    assert.doesNotMatch(renderLab(withArch, yandex), /Russia’s Google nickname/);
    assert.doesNotMatch(renderLab(withArch, tiktok), /short video about birds/);
    assert.doesNotMatch(renderLab(withArch, yandex), /doom score:\s*\d/i);
    assert.doesNotMatch(renderLab(withArch, tiktok), /probability of doom/i);
    assert.ok(sitemapEntries(withArch).some((e) => e.loc === '/lab/yandex.html'));
    assert.ok(sitemapEntries(withArch).some((e) => e.loc === '/lab/tiktok.html'));
  });

  it('indexes Slack and Synopsys entity labs when archive headlines clear the gate', () => {
    const withArch = {
      ...ctx,
      news: { ...ctx.news, items: [...ctx.news.items] },
      itemArchive: [
        {
          id: 'sl1', title: 'My personal AI agent posted my bank details on company Slack', pillar: 'governance', source: 'hn',
          url: 'https://example.test/sl1', published_at: '2026-09-01T01:00:00Z', score: 40,
        },
        {
          id: 'sl2', title: 'Leaked Slack messages show OpenAI employees pushback', pillar: 'governance', source: 'hn',
          url: 'https://example.test/sl2', published_at: '2026-09-02T01:00:00Z', score: 41,
        },
        {
          id: 'sl3', title: 'OpenAI says users can message Dots through ChatGPT, Slack, and Microsoft Teams', pillar: 'capability', source: 'hn',
          url: 'https://example.test/sl3', published_at: '2026-09-03T01:00:00Z', score: 42,
        },
        {
          id: 'slbad', title: 'A rope loses tension without naming the product', pillar: 'capability', source: 'hn',
          url: 'https://example.test/slbad', published_at: '2026-09-04T01:00:00Z', score: 30,
        },
        {
          id: 'sy1', title: 'Synopsys Could Be Undervalued Following OpenAI And Amazon AI Deals', pillar: 'compute', source: 'hn',
          url: 'https://example.test/sy1', published_at: '2026-09-01T02:00:00Z', score: 40,
        },
        {
          id: 'sy2', title: 'Is Synopsys Back from the Dead? EDA Leader Inks Deals With Amazon and OpenAI', pillar: 'compute', source: 'hn',
          url: 'https://example.test/sy2', published_at: '2026-09-02T02:00:00Z', score: 41,
        },
        {
          id: 'sy3', title: 'Chip design software leader Synopsys explores partnerships with Chinese AI labs', pillar: 'compute', source: 'hn',
          url: 'https://example.test/sy3', published_at: '2026-09-03T02:00:00Z', score: 42,
        },
        {
          id: 'sybad', title: 'An EDA tool review without naming the vendor', pillar: 'compute', source: 'hn',
          url: 'https://example.test/sybad', published_at: '2026-09-04T02:00:00Z', score: 30,
        },
      ],
    };
    const slack = labsFromEntities(withArch).find((p) => p.id === 'slack');
    const synopsys = labsFromEntities(withArch).find((p) => p.id === 'synopsys');
    assert.ok(slack, 'Slack clears ENTITY_LAB_MIN');
    assert.ok(synopsys, 'Synopsys clears ENTITY_LAB_MIN');
    assert.match(renderLab(withArch, slack), /What has SIREN scored about Slack\?/);
    assert.match(renderLab(withArch, synopsys), /What has SIREN scored about Synopsys\?/);
    assert.doesNotMatch(renderLab(withArch, slack), /rope loses tension/);
    assert.doesNotMatch(renderLab(withArch, synopsys), /without naming the vendor/);
    assert.doesNotMatch(renderLab(withArch, slack), /doom score:\s*\d/i);
    assert.doesNotMatch(renderLab(withArch, synopsys), /probability of doom/i);
    assert.ok(sitemapEntries(withArch).some((e) => e.loc === '/lab/slack.html'));
    assert.ok(sitemapEntries(withArch).some((e) => e.loc === '/lab/synopsys.html'));
  });

  it('indexes Airbnb and Asana entity labs when archive headlines clear the gate', () => {
    const withArch = {
      ...ctx,
      news: { ...ctx.news, items: [...ctx.news.items] },
      itemArchive: [
        {
          id: 'ab1', title: 'AI Agents Are a Threat to Travel Businesses. Airbnb Could Still Be a Winner.', pillar: 'capability', source: 'hn',
          url: 'https://example.test/ab1', published_at: '2026-09-01T01:00:00Z', score: 40,
        },
        {
          id: 'ab2', title: 'AI photos are making it harder to know what you\'re booking on Airbnb', pillar: 'capability', source: 'hn',
          url: 'https://example.test/ab2', published_at: '2026-09-02T01:00:00Z', score: 41,
        },
        {
          id: 'ab3', title: 'Q&A with Brian Chesky on Airbnb\'s plans for agent-to-agent interactions', pillar: 'capability', source: 'hn',
          url: 'https://example.test/ab3', published_at: '2026-09-03T01:00:00Z', score: 42,
        },
        {
          id: 'abbad', title: 'A vacation rental photo without naming the marketplace', pillar: 'capability', source: 'hn',
          url: 'https://example.test/abbad', published_at: '2026-09-04T01:00:00Z', score: 30,
        },
        {
          id: 'as1', title: 'Asana cuts model costs 76x in browser tests with GPT-6.1 Sol', pillar: 'capability', source: 'hn',
          url: 'https://example.test/as1', published_at: '2026-09-01T02:00:00Z', score: 40,
        },
        {
          id: 'as2', title: 'Asana says cache changes cut a browser agent\'s cost 76x', pillar: 'capability', source: 'hn',
          url: 'https://example.test/as2', published_at: '2026-09-02T02:00:00Z', score: 41,
        },
        {
          id: 'as3', title: 'Meta launches Muse for Small Business, integrating the AI agent with Asana', pillar: 'capability', source: 'hn',
          url: 'https://example.test/as3', published_at: '2026-09-03T02:00:00Z', score: 42,
        },
        {
          id: 'asbad', title: 'A project board without naming the product', pillar: 'capability', source: 'hn',
          url: 'https://example.test/asbad', published_at: '2026-09-04T02:00:00Z', score: 30,
        },
      ],
    };
    const airbnb = labsFromEntities(withArch).find((p) => p.id === 'airbnb');
    const asana = labsFromEntities(withArch).find((p) => p.id === 'asana');
    assert.ok(airbnb, 'Airbnb clears ENTITY_LAB_MIN');
    assert.ok(asana, 'Asana clears ENTITY_LAB_MIN');
    assert.match(renderLab(withArch, airbnb), /What has SIREN scored about Airbnb\?/);
    assert.match(renderLab(withArch, asana), /What has SIREN scored about Asana\?/);
    assert.doesNotMatch(renderLab(withArch, airbnb), /without naming the marketplace/);
    assert.doesNotMatch(renderLab(withArch, asana), /without naming the product/);
    assert.doesNotMatch(renderLab(withArch, airbnb), /doom score:\s*\d/i);
    assert.doesNotMatch(renderLab(withArch, asana), /probability of doom/i);
    assert.ok(sitemapEntries(withArch).some((e) => e.loc === '/lab/airbnb.html'));
    assert.ok(sitemapEntries(withArch).some((e) => e.loc === '/lab/asana.html'));
  });

  it('indexes Goldman Sachs and Coinbase entity labs when archive headlines clear the gate', () => {
    const withArch = {
      ...ctx,
      news: { ...ctx.news, items: [...ctx.news.items] },
      itemArchive: [
        {
          id: 'gs1', title: 'Goldman Sachs Says AI Model Costs Matched 15 Years of PC Price Declines', pillar: 'compute', source: 'hn',
          url: 'https://example.test/gs1', published_at: '2026-09-01T01:00:00Z', score: 40,
        },
        {
          id: 'gs2', title: 'Goldman Sachs data shows AI model costs fell as fast in three years as PC prices', pillar: 'compute', source: 'hn',
          url: 'https://example.test/gs2', published_at: '2026-09-02T01:00:00Z', score: 41,
        },
        {
          id: 'gs3', title: 'Goldman Sachs: investors have provided ~$500B in financing to AI-linked groups', pillar: 'compute', source: 'hn',
          url: 'https://example.test/gs3', published_at: '2026-09-03T01:00:00Z', score: 42,
        },
        {
          id: 'gsbad', title: 'A bank research note without naming the desk', pillar: 'compute', source: 'hn',
          url: 'https://example.test/gsbad', published_at: '2026-09-04T01:00:00Z', score: 30,
        },
        {
          id: 'cb1', title: 'Coinbase Fraud Prevention: How Did a Fine-Tuned Qwen Model Beat Opus?', pillar: 'capability', source: 'hn',
          url: 'https://example.test/cb1', published_at: '2026-09-01T02:00:00Z', score: 40,
        },
        {
          id: 'cb2', title: 'Coinbase fine-tunes Qwen3.5-9B model for fraud prevention', pillar: 'capability', source: 'hn',
          url: 'https://example.test/cb2', published_at: '2026-09-02T02:00:00Z', score: 41,
        },
        {
          id: 'cb3', title: 'Newer AI models missed more payment fraud in Coinbase’s benchmark', pillar: 'capability', source: 'hn',
          url: 'https://example.test/cb3', published_at: '2026-09-03T02:00:00Z', score: 42,
        },
        {
          id: 'cbbad', title: 'A crypto wallet tip without naming the exchange', pillar: 'capability', source: 'hn',
          url: 'https://example.test/cbbad', published_at: '2026-09-04T02:00:00Z', score: 30,
        },
      ],
    };
    const goldman = labsFromEntities(withArch).find((p) => p.id === 'goldman-sachs');
    const coinbase = labsFromEntities(withArch).find((p) => p.id === 'coinbase');
    assert.ok(goldman, 'Goldman Sachs clears ENTITY_LAB_MIN');
    assert.ok(coinbase, 'Coinbase clears ENTITY_LAB_MIN');
    assert.match(renderLab(withArch, goldman), /What has SIREN scored about Goldman Sachs\?/);
    assert.match(renderLab(withArch, coinbase), /What has SIREN scored about Coinbase\?/);
    assert.doesNotMatch(renderLab(withArch, goldman), /without naming the desk/);
    assert.doesNotMatch(renderLab(withArch, coinbase), /without naming the exchange/);
    assert.doesNotMatch(renderLab(withArch, goldman), /doom score:\s*\d/i);
    assert.doesNotMatch(renderLab(withArch, coinbase), /probability of doom/i);
    assert.ok(sitemapEntries(withArch).some((e) => e.loc === '/lab/goldman-sachs.html'));
    assert.ok(sitemapEntries(withArch).some((e) => e.loc === '/lab/coinbase.html'));
  });

  it('indexes Walmart and Netflix entity labs when archive headlines clear the gate', () => {
    const withArch = {
      ...ctx,
      news: { ...ctx.news, items: [...ctx.news.items] },
      itemArchive: [
        {
          id: 'w1', title: 'Walmart won’t hike prices based on your shopping history, CEO says', pillar: 'markets', source: 'hn',
          url: 'https://example.test/w1', published_at: '2026-09-01T01:00:00Z', score: 40,
        },
        {
          id: 'w2', title: 'Walmart CEO says the company will not use its AI shopping assistant to change prices', pillar: 'markets', source: 'hn',
          url: 'https://example.test/w2', published_at: '2026-09-02T01:00:00Z', score: 41,
        },
        {
          id: 'w3', title: 'Meta, Walmart, Instinct publish the Personal Agent Protocol', pillar: 'capability', source: 'hn',
          url: 'https://example.test/w3', published_at: '2026-09-03T01:00:00Z', score: 42,
        },
        {
          id: 'wbad', title: 'A retail note without naming the chain', pillar: 'markets', source: 'hn',
          url: 'https://example.test/wbad', published_at: '2026-09-04T01:00:00Z', score: 30,
        },
        {
          id: 'n1', title: 'After Amazon, Netflix Also Faces Layoffs amid AI investment shift', pillar: 'markets', source: 'hn',
          url: 'https://example.test/n1', published_at: '2026-09-01T02:00:00Z', score: 40,
        },
        {
          id: 'n2', title: 'Amazon, Netflix cut jobs amid overhiring and AI investment shift', pillar: 'markets', source: 'hn',
          url: 'https://example.test/n2', published_at: '2026-09-02T02:00:00Z', score: 41,
        },
        {
          id: 'n3', title: 'Amazon CEO points to Netflix as data centre backlash grows', pillar: 'compute', source: 'hn',
          url: 'https://example.test/n3', published_at: '2026-09-03T02:00:00Z', score: 42,
        },
        {
          id: 'nbad', title: 'A streaming note without naming the studio', pillar: 'markets', source: 'hn',
          url: 'https://example.test/nbad', published_at: '2026-09-04T02:00:00Z', score: 30,
        },
      ],
    };
    const walmart = labsFromEntities(withArch).find((p) => p.id === 'walmart');
    const netflix = labsFromEntities(withArch).find((p) => p.id === 'netflix');
    assert.ok(walmart, 'Walmart clears ENTITY_LAB_MIN');
    assert.ok(netflix, 'Netflix clears ENTITY_LAB_MIN');
    assert.match(renderLab(withArch, walmart), /What has SIREN scored about Walmart\?/);
    assert.match(renderLab(withArch, netflix), /What has SIREN scored about Netflix\?/);
    assert.doesNotMatch(renderLab(withArch, walmart), /without naming the chain/);
    assert.doesNotMatch(renderLab(withArch, netflix), /without naming the studio/);
    assert.doesNotMatch(renderLab(withArch, walmart), /doom score:\s*\d/i);
    assert.doesNotMatch(renderLab(withArch, netflix), /probability of doom/i);
    assert.ok(sitemapEntries(withArch).some((e) => e.loc === '/lab/walmart.html'));
    assert.ok(sitemapEntries(withArch).some((e) => e.loc === '/lab/netflix.html'));
  });

  it('indexes McDonald\'s entity lab when archive headlines clear the gate', () => {
    const withArch = {
      ...ctx,
      news: { ...ctx.news, items: [...ctx.news.items] },
      itemArchive: [
        {
          id: 'md1', title: "McDonald's sued over AI tool that recommends prices to US franchisees", pillar: 'governance', source: 'hn',
          url: 'https://example.test/md1', published_at: '2026-09-01T01:00:00Z', score: 40,
        },
        {
          id: 'md2', title: "McDonald's Is Using AI to Dynamically Price Its Burgers", pillar: 'governance', source: 'hn',
          url: 'https://example.test/md2', published_at: '2026-09-02T01:00:00Z', score: 41,
        },
        {
          id: 'md3', title: "Your Big Mac might cost more if McDonald's AI thinks people nearby can afford it", pillar: 'governance', source: 'hn',
          url: 'https://example.test/md3', published_at: '2026-09-03T01:00:00Z', score: 42,
        },
        {
          id: 'mdbad', title: 'A QSR pricing note without naming the chain', pillar: 'governance', source: 'hn',
          url: 'https://example.test/mdbad', published_at: '2026-09-04T01:00:00Z', score: 30,
        },
      ],
    };
    const mcdonald = labsFromEntities(withArch).find((p) => p.id === 'mcdonald-s');
    assert.ok(mcdonald, "McDonald's clears ENTITY_LAB_MIN");
    assert.match(renderLab(withArch, mcdonald), /What has SIREN scored about McDonald's\?/);
    assert.doesNotMatch(renderLab(withArch, mcdonald), /without naming the chain/);
    assert.doesNotMatch(renderLab(withArch, mcdonald), /doom score:\s*\d/i);
    assert.ok(sitemapEntries(withArch).some((e) => e.loc === '/lab/mcdonald-s.html'));
  });

  it('indexes TypeSafe entity lab when archive headlines clear the gate', () => {
    const withArch = {
      ...ctx,
      news: { ...ctx.news, items: [...ctx.news.items] },
      itemArchive: [
        {
          id: 'ts1', title: 'Jev AI model creator TypeSafe raises $870M at $7.5B valuation', pillar: 'markets', source: 'hn',
          url: 'https://example.test/ts1', published_at: '2026-09-01T01:00:00Z', score: 40,
        },
        {
          id: 'ts2', title: 'TypeSafe CEO Diogo Almeida says Jev is in use by Fortune 500 companies', pillar: 'markets', source: 'hn',
          url: 'https://example.test/ts2', published_at: '2026-09-02T01:00:00Z', score: 41,
        },
        {
          id: 'ts3', title: 'Jev developer TypeSafe AI raised a $870M Series A led by a16z', pillar: 'markets', source: 'hn',
          url: 'https://example.test/ts3', published_at: '2026-09-03T01:00:00Z', score: 42,
        },
        {
          id: 'tsbad', title: 'A decision-model note without naming the maker', pillar: 'markets', source: 'hn',
          url: 'https://example.test/tsbad', published_at: '2026-09-04T01:00:00Z', score: 30,
        },
      ],
    };
    const typesafe = labsFromEntities(withArch).find((p) => p.id === 'typesafe');
    assert.ok(typesafe, 'TypeSafe clears ENTITY_LAB_MIN');
    assert.match(renderLab(withArch, typesafe), /What has SIREN scored about TypeSafe\?/);
    assert.doesNotMatch(renderLab(withArch, typesafe), /without naming the maker/);
    assert.doesNotMatch(renderLab(withArch, typesafe), /doom score:\s*\d/i);
    assert.ok(sitemapEntries(withArch).some((e) => e.loc === '/lab/typesafe.html'));
  });

  it('indexes a16z and Instinct entity labs when archive headlines clear the gate', () => {
    const withArch = {
      ...ctx,
      news: { ...ctx.news, items: [...ctx.news.items] },
      itemArchive: [
        {
          id: 'a1', title: 'a16z’s Olivia Moore on the state of consumer AI', pillar: 'markets', source: 'hn',
          url: 'https://example.test/a1', published_at: '2026-09-01T01:00:00Z', score: 40,
        },
        {
          id: 'a2', title: 'Andreessen Horowitz Backs Jev Maker at $7.5 Billion Value', pillar: 'markets', source: 'hn',
          url: 'https://example.test/a2', published_at: '2026-09-02T01:00:00Z', score: 41,
        },
        {
          id: 'a3', title: 'Ghost emerges from stealth with an $11M seed led by a16z', pillar: 'markets', source: 'hn',
          url: 'https://example.test/a3', published_at: '2026-09-03T01:00:00Z', score: 42,
        },
        {
          id: 'abad', title: 'A venture note without naming the firm', pillar: 'markets', source: 'hn',
          url: 'https://example.test/abad', published_at: '2026-09-04T01:00:00Z', score: 30,
        },
        {
          id: 'i1', title: 'Instinct was the buzziest AI agent around — can it survive Muse?', pillar: 'capability', source: 'hn',
          url: 'https://example.test/i1', published_at: '2026-09-01T02:00:00Z', score: 40,
        },
        {
          id: 'i2', title: 'AI agent startup Instinct raised a $1B Series C from Sequoia', pillar: 'capability', source: 'hn',
          url: 'https://example.test/i2', published_at: '2026-09-02T02:00:00Z', score: 41,
        },
        {
          id: 'i3', title: 'Meta, Walmart, Instinct, Shopify publish the Personal Agent Protocol', pillar: 'capability', source: 'hn',
          url: 'https://example.test/i3', published_at: '2026-09-03T02:00:00Z', score: 42,
        },
        {
          id: 'ibad', title: 'A product roundup without naming the agent startup', pillar: 'capability', source: 'hn',
          url: 'https://example.test/ibad', published_at: '2026-09-04T02:00:00Z', score: 30,
        },
      ],
    };
    const a16z = labsFromEntities(withArch).find((p) => p.id === 'a16z');
    const instinct = labsFromEntities(withArch).find((p) => p.id === 'instinct');
    assert.ok(a16z, 'a16z clears ENTITY_LAB_MIN');
    assert.ok(instinct, 'Instinct clears ENTITY_LAB_MIN');
    assert.match(renderLab(withArch, a16z), /What has SIREN scored about a16z\?/);
    assert.match(renderLab(withArch, instinct), /What has SIREN scored about Instinct\?/);
    assert.doesNotMatch(renderLab(withArch, a16z), /without naming the firm/);
    assert.doesNotMatch(renderLab(withArch, instinct), /without naming the agent startup/);
    assert.doesNotMatch(renderLab(withArch, a16z), /doom score:\s*\d/i);
    assert.doesNotMatch(renderLab(withArch, instinct), /probability of doom/i);
    assert.ok(sitemapEntries(withArch).some((e) => e.loc === '/lab/a16z.html'));
    assert.ok(sitemapEntries(withArch).some((e) => e.loc === '/lab/instinct.html'));
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
    assert.match(labIndex, /Which AI labs have SIREN pages\?/);
    assert.match(labIndex, /\/lab\/openai\.html/);
    assert.match(labIndex, /\/companies\.html/);
    assert.match(labIndex, /What questions do people actually ask\?/);
    assert.match(labIndex, /"@type"\s*:\s*"FAQPage"/);
    assert.match(labIndex, /speakable/);
    assert.match(labIndex, /not a doom ranking/);
    const companies = renderCompanies(ctx);
    assert.match(companies, /Which AI companies has SIREN scored stories about\?/);
    assert.match(companies, /does not publish a company/);
    assert.match(companies, /\/lab\/openai\.html/);
    assert.match(companies, /\/compare\.html/);
    assert.match(companies, /SpeakableSpecification/);
    assert.match(companies, /FAQPage/);
    assert.match(companies, /What questions do people actually ask\?/);
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
    assert.match(html, /<h1>What has SIREN scored via hn\?<\/h1>/);
    assert.match(html, /Which AI stories has SIREN scored in this window\?/);
    assert.match(html, /Which AI feed adapters have SIREN pages\?/);
    assert.match(html, /Which AI news sources has SIREN scored via\?/);
    assert.match(html, /id="window"[^>]*>Which scored stories are from hn in this window\?/);
    assert.match(html, /fc__k"><a href="\/news\.html">Which AI stories has SIREN scored in this window\?<\/a>/);
    assert.doesNotMatch(html, /fc__k"><a href="\/news\.html">Newsroom<\/a>/);
    assert.doesNotMatch(html, /fc__k"><a href="\/source\/">Feed adapters<\/a>/);
    assert.match(html, /CollectionPage/);
    assert.match(html, /What questions do people actually ask\?/);
    assert.match(html, /"@type"\s*:\s*"FAQPage"/);
    assert.match(html, /speakable/);
    assert.doesNotMatch(html, /noindex/);
    assert.doesNotMatch(html, /<h2>Stories from hn<\/h2>/);
    assert.doesNotMatch(html, /<h2>Other outlets<\/h2>/);
    assert.match(html, /item\//);
    assert.match(html, /\/sources\.html/);
  });

  it('ships /sources.html over the same gated feed-adapter set', () => {
    const html = renderSources(ctx);
    assert.match(html, /Which AI news sources has SIREN scored via\?/);
    assert.match(html, /What has SIREN scored via hn\?/);
    assert.match(html, /Which AI doom indexes can you compare\?/);
    assert.match(html, /Which AI feed adapters have SIREN pages\?/);
    assert.match(html, /fc__k"><a href="\/compare\.html">Which AI doom indexes can you compare\?<\/a>/);
    assert.doesNotMatch(html, /fc__k"><a href="\/compare\.html">Compare<\/a>/);
    assert.doesNotMatch(html, /fc__k"><a href="\/source\/">Feed adapters<\/a>/);
    assert.match(html, /\/source\/hn\.html/);
    assert.match(html, /does not publish a source/);
    assert.match(html, /What questions do people actually ask\?/);
    assert.match(html, /"@type"\s*:\s*"FAQPage"/);
    assert.match(html, /speakable/);
    assert.match(html, /\/outlets\.html/);
    const srcIndex = renderSourceIndex(ctx);
    assert.match(srcIndex, /Which AI feed adapters have SIREN pages\?/);
    assert.match(srcIndex, /What has SIREN scored via hn\?/);
    assert.match(srcIndex, /Which AI stories has SIREN scored in this window\?/);
    assert.match(srcIndex, /fc__k"><a href="\/news\.html">Which AI stories has SIREN scored in this window\?<\/a>/);
    assert.doesNotMatch(srcIndex, /fc__k"><a href="\/news\.html">Newsroom<\/a>/);
    assert.match(srcIndex, /What questions do people actually ask\?/);
    assert.match(srcIndex, /"@type"\s*:\s*"FAQPage"/);
    assert.match(srcIndex, /speakable/);
    assert.match(srcIndex, /\/sources\.html/);
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
    assert.match(html, /id="older"[^>]*>Which older scored stories are from hn\?/);
    assert.match(html, /Archived HN story about agents/);
    assert.match(html, /\/item\/archive\.html/);
    assert.doesNotMatch(html, /<h2>Older scored stories from hn<\/h2>/);
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
    assert.match(html, /id="older"[^>]*>Which older scored stories are from techcrunch\?/);
    assert.doesNotMatch(html, /<h2>Older scored stories from techcrunch<\/h2>/);
  });
});
