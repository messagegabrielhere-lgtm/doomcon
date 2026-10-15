import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as brand from '../brand.mjs';
import {
  itemsForPillar, archiveItemsForPillar, pillarIndexable, renderPillar, pillarPath,
  itemsForLab, archiveItemsForLab, itemMatchesLab, labIndexable, renderLab, labPath,
  labAboutLabel, LAB_HEAD_ALIASES,
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
    assert.match(html, /<title>What has SIREN scored about OpenAI \/ ChatGPT\?/);
    assert.match(html, /<h1>What has SIREN scored about OpenAI \/ ChatGPT\?<\/h1>/);
    assert.match(html, /lab\/anthropic\.html/);
    assert.match(html, /CollectionPage/);
    assert.match(html, /FAQPage/);
    assert.match(html, /speakable/);
    assert.equal(labPath('openai'), '/lab/openai.html');
  });

  it('includes Gemini in Google DeepMind lab title (FINDABILITY #121)', () => {
    assert.equal(LAB_HEAD_ALIASES['google-deepmind'], 'Gemini / Argon');
    assert.equal(
      labAboutLabel({ id: 'google-deepmind', name: 'Google DeepMind' }),
      'Google DeepMind / Gemini / Argon',
    );
    assert.equal(labAboutLabel({ id: 'openai', name: 'OpenAI' }), 'OpenAI / ChatGPT');
    assert.equal(labAboutLabel({ id: 'anthropic', name: 'Anthropic' }), 'Anthropic / Claude');
    // FINDABILITY #137 — Micron / MU ticker for Trends "mu" memory-chip spikes.
    assert.equal(LAB_HEAD_ALIASES.micron, 'MU');
    assert.equal(labAboutLabel({ id: 'micron', name: 'Micron' }), 'Micron / MU');
    const html = renderLab(ctx, {
      id: 'google-deepmind',
      name: 'Google DeepMind',
      principal: 'Demis Hassabis',
      market: { probability: 0.4, change_7d: 0.01 },
    });
    assert.match(html, /<title>What has SIREN scored about Google DeepMind \/ Gemini \/ Argon\?/);
    assert.match(html, /<h1>What has SIREN scored about Google DeepMind \/ Gemini \/ Argon\?<\/h1>/);
    const micronHtml = renderLab(ctx, {
      id: 'micron',
      name: 'Micron',
      entityOnly: true,
      entityName: 'Micron',
    });
    assert.match(micronHtml, /<title>What has SIREN scored about Micron \/ MU\?/);
    assert.match(micronHtml, /<h1>What has SIREN scored about Micron \/ MU\?<\/h1>/);
    // FINDABILITY #151 — Trends “micron stock” / DRAM FAQ on the gated lab.
    assert.match(
      micronHtml,
      /Why does SIREN watch Micron stock, MU, and DRAM stock in Google Search Trends\?/,
    );
    assert.match(micronHtml, /search-trends\.html/);
    assert.match(micronHtml, /not investment advice/);
    assert.doesNotMatch(micronHtml, /buy Micron|sell Micron|price target/i);
    // FINDABILITY #155 — Trends “coreweave stock” FAQ on the gated lab.
    const cwHtml = renderLab(ctx, {
      id: 'coreweave',
      name: 'CoreWeave',
      entityOnly: true,
      entityName: 'CoreWeave',
    });
    assert.match(
      cwHtml,
      /Why does SIREN watch CoreWeave stock in Google Search Trends\?/,
    );
    // FINDABILITY #160 — debt / bond-yield FAQ on the same gated lab.
    assert.match(
      cwHtml,
      /Why does SIREN watch CoreWeave debt and bond yields in Google Search Trends\?/,
    );
    assert.match(cwHtml, /not credit analysis/);
    assert.match(cwHtml, /\/tags\/neoclouds\.html/);
    assert.match(cwHtml, /search-trends\.html/);
    assert.match(cwHtml, /not investment advice/);
    assert.doesNotMatch(cwHtml, /buy CoreWeave|sell CoreWeave|price target/i);
    // FINDABILITY #161 — Nvidia / NVDA Trends FAQ + labAboutLabel.
    assert.equal(LAB_HEAD_ALIASES.nvidia, 'NVDA');
    assert.equal(labAboutLabel({ id: 'nvidia', name: 'NVIDIA' }), 'NVIDIA / NVDA');
    const nvHtml = renderLab(ctx, {
      id: 'nvidia',
      name: 'NVIDIA',
      entityOnly: true,
      entityName: 'NVIDIA',
    });
    assert.match(
      nvHtml,
      /Why does SIREN watch Nvidia stock and NVDA in Google Search Trends\?/,
    );
    assert.match(nvHtml, /<title>[^<]*NVDA/);
    assert.match(nvHtml, /search-trends\.html/);
    assert.match(nvHtml, /not investment advice/);
    assert.doesNotMatch(nvHtml, /buy NVIDIA|sell NVDA|price target/i);
    // FINDABILITY #162 — OpenAI lawsuit / FTC FAQ on gated ChatGPT lab.
    const oaiHtml = renderLab(ctx, ctx.race.players[0]);
    assert.match(
      oaiHtml,
      /Why does SIREN watch OpenAI lawsuits and FTC probes\?/,
    );
    assert.match(oaiHtml, /[Nn]ot legal advice/);
    assert.match(oaiHtml, /search-trends\.html/);
    assert.doesNotMatch(oaiHtml, /guilty|liable|will lose|settlement odds/i);
    // FINDABILITY #181 — OpenAI / ChatGPT outage FAQ on same gated lab.
    assert.match(
      oaiHtml,
      /Why does SIREN watch OpenAI and ChatGPT outages\?/,
    );
    // FINDABILITY #191 — ChatGPT Chrome / computer use FAQ on same gated lab.
    assert.match(
      oaiHtml,
      /Why does SIREN watch ChatGPT computer use and Chrome tabs\?/,
    );
    assert.match(oaiHtml, /[Nn]ot a model review/);
    assert.match(oaiHtml, /uptime SLA|not an uptime/i);
    assert.match(oaiHtml, /status\.html/);
    assert.doesNotMatch(oaiHtml, /buy OpenAI|must use ChatGPT|99\.9% uptime/i);
    // FINDABILITY #163 — Anthropic IPO / FTC FAQ on gated Claude lab.
    const antHtml = renderLab(ctx, ctx.race.players[1]);
    assert.match(
      antHtml,
      /Why does SIREN watch Anthropic IPO and FTC probes\?/,
    );
    assert.match(antHtml, /[Nn]ot IPO advice/);
    assert.match(antHtml, /[Nn]ot legal advice/);
    assert.match(antHtml, /search-trends\.html/);
    assert.doesNotMatch(antHtml, /buy Anthropic|price target|will IPO at/i);
    // FINDABILITY #164 — ASML / EUV Trends FAQ on gated lab.
    const asmlHtml = renderLab(ctx, {
      id: 'asml',
      name: 'ASML',
      entityOnly: true,
      entityName: 'ASML',
    });
    assert.match(
      asmlHtml,
      /Why does SIREN watch ASML in Google Search Trends\?/,
    );
    assert.match(asmlHtml, /not investment advice/);
    assert.match(asmlHtml, /search-trends\.html/);
    assert.doesNotMatch(asmlHtml, /buy ASML|sell ASML|price target/i);
    // FINDABILITY #165 — TSMC / AI foundry Trends FAQ on gated lab.
    const tsmcHtml = renderLab(ctx, {
      id: 'tsmc',
      name: 'TSMC',
      entityOnly: true,
      entityName: 'TSMC',
    });
    assert.match(
      tsmcHtml,
      /Why does SIREN watch TSMC in Google Search Trends\?/,
    );
    assert.match(tsmcHtml, /not investment advice/);
    assert.match(tsmcHtml, /search-trends\.html/);
    assert.doesNotMatch(tsmcHtml, /buy TSMC|sell TSMC|price target/i);
    // FINDABILITY #167 — Amazon Bee / wearable AI FAQ on gated lab.
    const amazonHtml = renderLab(ctx, {
      id: 'amazon',
      name: 'Amazon',
      entityOnly: true,
      entityName: 'Amazon',
    });
    assert.match(
      amazonHtml,
      /Why does SIREN watch Amazon Bee and AI wearables\?/,
    );
    assert.match(amazonHtml, /[Nn]ot a product review/);
    assert.match(amazonHtml, /search-trends\.html/);
    assert.doesNotMatch(amazonHtml, /buy Amazon|price target|must buy Bee/i);
    // FINDABILITY #169 — Meta Muse / open-weight AI FAQ on gated lab.
    assert.equal(LAB_HEAD_ALIASES.meta, 'Muse');
    assert.equal(labAboutLabel({ id: 'meta', name: 'Meta AI' }), 'Meta AI / Muse');
    const metaHtml = renderLab(ctx, {
      id: 'meta',
      name: 'Meta AI',
      entityOnly: true,
      entityName: 'Meta AI',
    });
    assert.match(
      metaHtml,
      /Why does SIREN watch Meta Muse and open-weight AI\?/,
    );
    // FINDABILITY #193 — Meta–Apple Mac AI FAQ on same gated lab.
    assert.match(
      metaHtml,
      /Why does SIREN watch Meta and Apple Mac AI partnerships\?/,
    );
    assert.match(metaHtml, /<title>[^<]*Muse/);
    assert.match(metaHtml, /[Nn]ot a model review/);
    assert.match(metaHtml, /search-trends\.html/);
    assert.doesNotMatch(metaHtml, /buy Meta|price target|must use Muse/i);
    // FINDABILITY #170 — Apple Intelligence / on-device AI FAQ on gated lab.
    assert.equal(LAB_HEAD_ALIASES.apple, 'Apple Intelligence');
    assert.equal(labAboutLabel({ id: 'apple', name: 'Apple' }), 'Apple / Apple Intelligence');
    const appleHtml = renderLab(ctx, {
      id: 'apple',
      name: 'Apple',
      entityOnly: true,
      entityName: 'Apple',
    });
    assert.match(
      appleHtml,
      /Why does SIREN watch Apple Intelligence\?/,
    );
    assert.match(appleHtml, /<title>[^<]*Apple Intelligence/);
    assert.match(appleHtml, /[Nn]ot a product review/);
    assert.match(appleHtml, /search-trends\.html/);
    assert.doesNotMatch(appleHtml, /buy Apple|price target|must use Apple Intelligence/i);
    // FINDABILITY #171 — Microsoft Copilot FAQ on gated lab.
    assert.equal(LAB_HEAD_ALIASES.microsoft, 'Copilot');
    assert.equal(labAboutLabel({ id: 'microsoft', name: 'Microsoft' }), 'Microsoft / Copilot');
    const msHtml = renderLab(ctx, {
      id: 'microsoft',
      name: 'Microsoft',
      entityOnly: true,
      entityName: 'Microsoft',
    });
    assert.match(
      msHtml,
      /Why does SIREN watch Microsoft Copilot\?/,
    );
    assert.match(msHtml, /<title>[^<]*Copilot/);
    assert.match(msHtml, /[Nn]ot a product review/);
    assert.match(msHtml, /search-trends\.html/);
    assert.doesNotMatch(msHtml, /buy Microsoft|price target|must use Copilot/i);
    // FINDABILITY #173 — xAI / Grok FAQ on gated lab.
    assert.equal(LAB_HEAD_ALIASES.xai, 'Grok');
    assert.equal(labAboutLabel({ id: 'xai', name: 'xAI' }), 'xAI / Grok');
    const xaiHtml = renderLab(ctx, {
      id: 'xai',
      name: 'xAI',
      entityOnly: true,
      entityName: 'xAI',
    });
    assert.match(
      xaiHtml,
      /Why does SIREN watch Grok and xAI\?/,
    );
    assert.match(xaiHtml, /<title>[^<]*Grok/);
    assert.match(xaiHtml, /[Nn]ot a model review/);
    assert.match(xaiHtml, /search-trends\.html/);
    assert.doesNotMatch(xaiHtml, /buy xAI|price target|must use Grok/i);
    // FINDABILITY #174 — Google DeepMind / Gemini / Gemma / Argon FAQ on gated lab.
    assert.equal(LAB_HEAD_ALIASES['google-deepmind'], 'Gemini / Argon');
    assert.equal(
      labAboutLabel({ id: 'google-deepmind', name: 'Google DeepMind' }),
      'Google DeepMind / Gemini / Argon',
    );
    const gdmHtml = renderLab(ctx, {
      id: 'google-deepmind',
      name: 'Google DeepMind',
      principal: 'Demis Hassabis',
      market: { probability: 0.3, change_7d: 0 },
    });
    assert.match(
      gdmHtml,
      /Why does SIREN watch Gemini, Gemma, and Argon\?/,
    );
    assert.match(gdmHtml, /<title>[^<]*Gemini/);
    assert.match(gdmHtml, /Gemini 4 Argon|Gemma open-model/);
    assert.match(gdmHtml, /[Nn]ot a model review/);
    assert.match(gdmHtml, /search-trends\.html/);
    assert.doesNotMatch(gdmHtml, /buy Gemini|price target|must use Gemma/i);
    // FINDABILITY #175 — Samsung / HBM / AI memory FAQ on gated lab.
    assert.equal(LAB_HEAD_ALIASES.samsung, 'HBM');
    assert.equal(labAboutLabel({ id: 'samsung', name: 'Samsung' }), 'Samsung / HBM');
    const samHtml = renderLab(ctx, {
      id: 'samsung',
      name: 'Samsung',
      entityOnly: true,
      entityName: 'Samsung',
    });
    assert.match(
      samHtml,
      /Why does SIREN watch Samsung and AI memory chips\?/,
    );
    // FINDABILITY #195 — Samsung AI glasses FAQ on same gated lab.
    assert.match(
      samHtml,
      /Why does SIREN watch Samsung AI glasses\?/,
    );
    assert.match(samHtml, /Galaxy glasses|XR \/ smart-glasses|Meta Ray-Ban/);
    assert.match(samHtml, /[Nn]ot a product review/);
    assert.match(samHtml, /<title>[^<]*HBM/);
    assert.match(samHtml, /SK Hynix/);
    assert.match(samHtml, /[Nn]ot a stock tip/);
    assert.match(samHtml, /search-trends\.html/);
    assert.doesNotMatch(samHtml, /buy Samsung|price target|must buy HBM/i);
    // FINDABILITY #177 — Qwen / Alibaba open-weight FAQ on gated lab.
    assert.equal(LAB_HEAD_ALIASES.qwen, 'Qwen');
    const qwenHtml = renderLab(ctx, {
      id: 'qwen',
      name: 'Alibaba Qwen',
      principal: 'Liang Wenfeng',
      market: { probability: 0.01, change_7d: 0 },
    });
    assert.match(
      qwenHtml,
      /Why does SIREN watch Qwen and Alibaba open models\?/,
    );
    assert.match(qwenHtml, /<title>[^<]*Qwen/);
    assert.match(qwenHtml, /Tongyi|open-weight/);
    assert.match(qwenHtml, /[Nn]ot a model review/);
    assert.match(qwenHtml, /search-trends\.html/);
    assert.doesNotMatch(qwenHtml, /buy Qwen|price target|must use Tongyi/i);
    // FINDABILITY #179 — DeepSeek outage FAQ on gated lab.
    const dsHtml = renderLab(ctx, {
      id: 'deepseek',
      name: 'DeepSeek',
      principal: 'Liang Wenfeng',
      market: { probability: 0.01, change_7d: 0 },
    });
    assert.match(dsHtml, /Why does SIREN watch DeepSeek and AI outages\?/);
    assert.match(dsHtml, /<title>[^<]*DeepSeek/);
    assert.match(dsHtml, /[Nn]ot a model review/);
    assert.match(dsHtml, /uptime SLA|not an uptime/i);
    assert.match(dsHtml, /search-trends\.html/);
    assert.doesNotMatch(dsHtml, /buy DeepSeek|price target|must use DeepSeek/i);
    // FINDABILITY #180 — Mistral / Timestral FAQ on gated lab.
    assert.equal(LAB_HEAD_ALIASES.mistral, 'Timestral');
    const misHtml = renderLab(ctx, {
      id: 'mistral',
      name: 'Mistral',
      principal: 'Arthur Mensch',
      market: { probability: 0.003, change_7d: 0 },
    });
    assert.match(misHtml, /Why does SIREN watch Mistral and Timestral\?/);
    assert.match(misHtml, /<title>[^<]*Timestral/);
    assert.match(misHtml, /CERN Flare|Timestral/);
    assert.match(misHtml, /[Nn]ot a model review/);
    assert.match(misHtml, /search-trends\.html/);
    assert.doesNotMatch(misHtml, /buy Mistral|price target|must use Timestral/i);
    // FINDABILITY #183 — Palantir / AIP / government AI FAQ on gated lab.
    assert.equal(LAB_HEAD_ALIASES.palantir, 'AIP');
    const palHtml = renderLab(ctx, {
      id: 'palantir',
      name: 'Palantir',
      principal: 'Alex Karp',
      entityOnly: true,
      entityName: 'Palantir',
    });
    assert.match(palHtml, /Why does SIREN watch Palantir and government AI\?/);
    assert.match(palHtml, /<title>[^<]*AIP/);
    assert.match(palHtml, /Gotham|Foundry|AIP/);
    assert.match(palHtml, /[Nn]ot a stock tip/);
    assert.match(palHtml, /not legal advice/i);
    assert.match(palHtml, /search-trends\.html/);
    assert.doesNotMatch(palHtml, /buy Palantir|price target|must use Palantir/i);
    // FINDABILITY #184 — AMD / MI300 / Instinct FAQ on gated lab.
    assert.equal(LAB_HEAD_ALIASES.amd, 'MI300');
    const amdHtml = renderLab(ctx, {
      id: 'amd',
      name: 'AMD',
      entityOnly: true,
      entityName: 'AMD',
    });
    assert.match(amdHtml, /Why does SIREN watch AMD and AI GPUs\?/);
    assert.match(amdHtml, /<title>[^<]*MI300/);
    assert.match(amdHtml, /MI300|Instinct/);
    assert.match(amdHtml, /[Nn]ot a stock tip/);
    assert.match(amdHtml, /chip review/);
    assert.match(amdHtml, /search-trends\.html/);
    assert.doesNotMatch(amdHtml, /buy AMD|price target|must use MI300/i);
    // FINDABILITY #185 — Tesla / FSD / Autopilot FAQ on gated lab.
    assert.equal(LAB_HEAD_ALIASES.tesla, 'FSD');
    const teslaHtml = renderLab(ctx, {
      id: 'tesla',
      name: 'Tesla',
      entityOnly: true,
      entityName: 'Tesla',
    });
    assert.match(teslaHtml, /Why does SIREN watch Tesla Autopilot and FSD\?/);
    assert.match(teslaHtml, /<title>[^<]*FSD/);
    assert.match(teslaHtml, /Autopilot|FSD|robotaxi/);
    assert.match(teslaHtml, /[Nn]ot a stock tip/);
    assert.match(teslaHtml, /crash verdict|safety advice/i);
    assert.match(teslaHtml, /search-trends\.html/);
    assert.doesNotMatch(teslaHtml, /buy Tesla|price target|must use FSD/i);
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
    assert.match(html, /Which older scored stories name OpenAI \/ ChatGPT\?/);
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
    // FINDABILITY #171 — labAboutLabel adds Copilot alias on Microsoft title.
    assert.match(html, /<title>What has SIREN scored about Microsoft \/ Copilot\?/);
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
    // FINDABILITY #140 — hub rows + ItemList use labAboutLabel.
    assert.match(labIndex, /What has SIREN scored about OpenAI \/ ChatGPT\?/);
    assert.match(labIndex, /What has SIREN scored about Anthropic \/ Claude\?/);
    const companies = renderCompanies(ctx);
    assert.match(companies, /Which AI companies has SIREN scored stories about\?/);
    assert.match(companies, /does not publish a company/);
    assert.match(companies, /\/lab\/openai\.html/);
    assert.match(companies, /\/compare\.html/);
    assert.match(companies, /SpeakableSpecification/);
    assert.match(companies, /FAQPage/);
    assert.match(companies, /What has SIREN scored about OpenAI \/ ChatGPT\?/);
    assert.match(companies, /What has SIREN scored about Anthropic \/ Claude\?/);
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
