import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { render as renderItem } from './itemPage.mjs';
import {
  MODEL_INDEX_MIN,
  indexableModels,
  modelPath,
  renderModel,
  renderIndex,
  renderModels,
  sitemapEntries,
} from './modelPages.mjs';

function story(id, title, entities) {
  return {
    id,
    title,
    entities,
    pillar: 'capability',
    source: 'hn',
    url: `https://example.test/${id}`,
    published_at: '2026-10-10T01:00:00Z',
    score: 40,
  };
}

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  cardFor: () => null,
  state: { generated_at: '2026-10-10T02:00:00Z', score: 56.2, level: 4, level_name: 'ROUTINE', pillars: [] },
  news: {
    generated_at: '2026-10-10T02:00:00Z',
    items: [
      story('c1', 'Claude one', ['Claude']),
      story('c2', 'Claude two', ['Claude', 'Anthropic']),
      story('c3', 'Claude three', ['Claude']),
      story('g1', 'Grok once', ['Grok']),
    ],
  },
  race: {
    players: [{ id: 'anthropic', name: 'Anthropic' }],
  },
};

describe('model pages', () => {
  it('pages a model family only after three scored stories', () => {
    const names = indexableModels(ctx).map((m) => m.name);
    assert.deepEqual(names, ['Claude']);
    assert.equal(MODEL_INDEX_MIN, 3);
    assert.equal(modelPath('Claude'), '/model/claude.html');
    const locs = sitemapEntries(ctx).map((e) => e.loc);
    assert.ok(locs.includes('/model/'));
    assert.ok(locs.includes('/models.html'));
    assert.ok(locs.includes('/model/claude.html'));
    assert.ok(!locs.includes('/model/grok.html'));
  });

  it('ships /models.html over the same gated model set', () => {
    const html = renderModels(ctx);
    assert.match(html, /Which AI models has SIREN scored stories about\?/);
    assert.match(html, /\/model\/claude\.html/);
    assert.match(html, /does not publish a model/);
    assert.match(html, /\/companies\.html/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /What questions do people actually ask\?/);
    const index = renderIndex(ctx);
    assert.match(index, /Which AI model families have SIREN pages\?/);
    assert.match(index, /What questions do people actually ask\?/);
    assert.match(index, /"@type"\s*:\s*"FAQPage"/);
    assert.match(index, /speakable/);
    assert.match(index, /\/models\.html/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
  });

  it('lists the stories and the lab page, and does not invent a model score', () => {
    const html = renderModel(ctx, 'Claude');
    assert.match(html, /<title>What has SIREN scored about Claude\?/);
    assert.match(html, /<h1>What has SIREN scored about Claude\?<\/h1>/);
    assert.match(html, /Which AI stories has SIREN scored in this window\?/);
    assert.match(html, /Which AI model families have SIREN pages\?/);
    assert.match(html, /Which AI models has SIREN scored stories about\?/);
    assert.match(html, /fc__k"><a href="\/news\.html">Which AI stories has SIREN scored in this window\?<\/a>/);
    assert.doesNotMatch(html, /fc__k"><a href="\/news\.html">Newsroom<\/a>/);
    assert.doesNotMatch(html, /fc__k"><a href="\/model\/">Models<\/a>/);
    assert.match(html, /CollectionPage/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /What questions do people actually ask\?/);
    assert.match(html, /Does SIREN publish a Claude doom score\?/);
    assert.match(html, /id="window"[^>]*>Which scored stories name Claude in this window\?/);
    assert.match(html, /Claude one/);
    assert.match(html, /href="\/lab\/anthropic\.html">What has SIREN scored about Anthropic\?<\/a>/);
    assert.doesNotMatch(html, /href="\/lab\/anthropic\.html">Anthropic<\/a>/);
    assert.doesNotMatch(html, /noindex/);
    assert.match(html, /not a rating of the model/);
    assert.match(html, /href="\/">AI activity index today · SIREN<\/a>/);
    assert.doesNotMatch(html, /href="\/">homepage<\/a>/);
    assert.doesNotMatch(html, /<h2>Stories in this window<\/h2>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
  });

  it('links older archived stories naming the model', () => {
    const withArch = {
      ...ctx,
      itemArchive: [
        story('old1', 'Archived Claude model card', ['Claude']),
      ],
    };
    const html = renderModel(withArch, 'Claude');
    assert.match(html, /id="older"[^>]*>Which older scored stories name Claude\?/);
    assert.match(html, /Archived Claude model card/);
    assert.match(html, /\/item\/archive\.html/);
    assert.doesNotMatch(html, /<h2>Older scored stories naming Claude<\/h2>/);
    assert.match(html, /"name"\s*:\s*"Archived Claude model card"/);
  });

  it('links an indexable model from the story page and leaves a thin name as text', () => {
    const claude = renderItem(ctx, ctx.news.items[0]);
    assert.match(claude, /href="\/model\/claude\.html">What has SIREN scored about Claude\?<\/a>/);
    assert.doesNotMatch(claude, /href="\/model\/claude\.html">Claude<\/a>/);
    const grok = renderItem(ctx, ctx.news.items[3]);
    assert.doesNotMatch(grok, /\/model\/grok\.html/);
    assert.match(grok, /Names in this headline: Grok/);
    assert.doesNotMatch(grok, /What has SIREN scored about Grok\?/);
  });

  it('lets the durable archive keep a model hub above the substance gate', () => {
    const withArch = {
      ...ctx,
      itemArchive: [
        story('g-old1', 'Archived Grok launch', ['Grok']),
        story('g-old2', 'Archived Grok update', ['Grok']),
      ],
    };
    const names = indexableModels(withArch).map((m) => m.name);
    assert.ok(names.includes('Grok'));
    assert.ok(names.includes('Claude'));
    const html = renderModel(withArch, 'Grok');
    assert.doesNotMatch(html, /noindex/);
    assert.match(html, /id="older"[^>]*>Which older scored stories name Grok\?/);
    assert.match(html, /id="other-models"[^>]*>Which other model families have scored stories\?/);
    assert.doesNotMatch(html, /<h2>Other model families<\/h2>/);
    assert.ok(sitemapEntries(withArch).some((e) => e.loc === '/model/grok.html'));
  });

  it('indexes DeepSeek-R from title/summary forms when archive only carries the lab entity', () => {
    const withArch = {
      ...ctx,
      news: { generated_at: ctx.state.generated_at, items: [] },
      itemArchive: [
        story('d1', 'DeepSeek accelerates push into embodied AI', ['DeepSeek']),
        story('d2', 'DeepSeek-R1 beats prior open baseline', ['DeepSeek']),
        story('d3', 'Labs react to DeepSeek V3 release', ['DeepSeek']),
      ],
    };
    const names = indexableModels(withArch).map((m) => m.name);
    assert.ok(names.includes('DeepSeek-R'));
    const html = renderModel(withArch, 'DeepSeek-R');
    assert.doesNotMatch(html, /noindex/);
    assert.match(html, /DeepSeek accelerates/);
    assert.ok(sitemapEntries(withArch).some((e) => e.loc === '/model/deepseek-r.html'));
  });

  it('indexes Mixtral from Mistral Large style surface forms', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('m1', 'Mistral Large ships a new checkpoint', []),
          story('m2', 'Mixtral MoE serving guide', []),
          story('m3', 'Codestral update for coding agents', []),
        ],
      },
    };
    assert.ok(indexableModels(rich).some((m) => m.name === 'Mixtral'));
    assert.match(renderModel(rich, 'Mixtral'), /Mistral Large ships/);
  });

  it('indexes Mixtral from Le Chonk / Mistral Large 4 nickname forms', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('lc1', 'Mistral Says Its New AI Model ‘Le Chonk’ Is the Best Open-Weight Offering Outside of China', []),
          story('lc2', 'Mistral says "Le Chonk" can challenge the best AI models', []),
          story('lc3', 'Introducing Mistral Large 4: Le chonk', []),
        ],
      },
    };
    assert.ok(indexableModels(rich).some((m) => m.name === 'Mixtral'));
    const html = renderModel(rich, 'Mixtral');
    assert.match(html, /Le Chonk|Mistral Large 4/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.ok(sitemapEntries(rich).some((e) => e.loc === '/model/mixtral.html'));
  });

  it('indexes Muse Wonder from title/summary forms', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('mw1', 'Meta launches Muse Wonder AI models', []),
          story('mw2', 'Muse Wonder Full outperforms rivals on a public leaderboard', []),
          story('mw3', 'Developers try Muse Wonder for agent workflows', []),
        ],
      },
    };
    assert.ok(indexableModels(rich).some((m) => m.name === 'Muse Wonder'));
    const html = renderModel(rich, 'Muse Wonder');
    assert.match(html, /What has SIREN scored about Muse Wonder\?|Muse Wonder/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.ok(sitemapEntries(rich).some((e) => e.loc === '/model/muse-wonder.html'));
  });

  it('indexes Maia from Maia 300 / Azure Maia title forms', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('ma1', 'Microsoft unveils Maia 300 AI chip', []),
          story('ma2', 'Azure Maia custom silicon expands', []),
          story('ma3', 'Watch Microsoft, Musk race as Maia 300 ships', []),
        ],
      },
    };
    assert.ok(indexableModels(rich).some((m) => m.name === 'Maia'));
    const html = renderModel(rich, 'Maia');
    assert.match(html, /What has SIREN scored about Maia\?|Maia/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.ok(sitemapEntries(rich).some((e) => e.loc === '/model/maia.html'));
  });

  it('indexes Nano Banana from multi-word title forms (not bare Banana)', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('nb1', 'Google releases Nano Banana 2.1 image model', []),
          story('nb2', 'Create stickers with ChatGPT and Nano Banana 2', []),
          story('nb3', 'Playground powered by Gemini, Nano Banana, and Lyria', []),
        ],
      },
    };
    assert.ok(indexableModels(rich).some((m) => m.name === 'Nano Banana'));
    const thin = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('bad1', 'A banana republic of AI hype', []),
          story('bad2', 'Yellow fruit metaphors in model names', []),
          story('bad3', 'Towerglow orchestrator ships', []),
        ],
      },
    };
    assert.ok(!indexableModels(thin).some((m) => m.name === 'Nano Banana'));
    const html = renderModel(rich, 'Nano Banana');
    assert.match(html, /What has SIREN scored about Nano Banana\?|Nano Banana/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.ok(sitemapEntries(rich).some((e) => e.loc === '/model/nano-banana.html'));
  });

  it('indexes Dots from OpenAI-anchored title forms (not bare Dots)', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('dt1', "How OpenAI's Dots differs from Meta's Muse", []),
          story('dt2', 'OpenAI Dots + Instacart Doesn’t Allow Cross-Store Price Comparison', []),
          story('dt3', 'OpenAI’s Dots Full Mobile Rollout reaches Pro users', []),
        ],
      },
    };
    assert.ok(indexableModels(rich).some((m) => m.name === 'Dots'));
    const thin = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('bad1', 'Connect those dots in the training plot', []),
          story('bad2', 'Introducing dots on a scatter chart', []),
          story('bad3', 'Towerglow orchestrator ships', []),
        ],
      },
    };
    assert.ok(!indexableModels(thin).some((m) => m.name === 'Dots'));
    const html = renderModel(rich, 'Dots');
    assert.match(html, /What has SIREN scored about Dots\?|Dots/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.ok(sitemapEntries(rich).some((e) => e.loc === '/model/dots.html'));
  });

  it('indexes Jev from decision-model title forms', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('jv1', 'Jev AI model creator TypeSafe raises $870M at $7.5B valuation', []),
          story('jv2', 'Microsoft Launches Decision 1, a Qwen Decision Model Aimed at Jev', []),
          story('jv3', 'Can Jev be Your Q or Policy in Reinforcement Learning?', []),
        ],
      },
    };
    assert.ok(indexableModels(rich).some((m) => m.name === 'Jev'));
    const thin = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('bad1', 'A decision note without naming the model', []),
          story('bad2', 'ollama v0.40.3 release notes', []),
          story('bad3', 'Towerglow orchestrator ships', []),
        ],
      },
    };
    assert.ok(!indexableModels(thin).some((m) => m.name === 'Jev'));
    const html = renderModel(rich, 'Jev');
    assert.match(html, /What has SIREN scored about Jev\?|Jev/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.ok(sitemapEntries(rich).some((e) => e.loc === '/model/jev.html'));
  });

  it('indexes GLM and Grok model hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('gl1', 'Intel CEO Says DeepSeek, Kimi, GLM Are Good Enough', []),
          story('gl2', 'Strata for GLM5.3 Flash is here for some', []),
          story('gl3', 'Ecosia switches to open-weight models including Qwen, GLM, Kimi', []),
          story('gk1', 'Grok 4.7 Release: Pricing, Benchmarks vs Claude 5.5', []),
          story('gk2', 'Musk Says Some Grok Training Traces Read Like Torture', []),
          story('gk3', 'AI shopping with Grok sparks privacy debate', []),
        ],
      },
    };
    assert.ok(indexableModels(rich).some((m) => m.name === 'GLM'));
    assert.ok(indexableModels(rich).some((m) => m.name === 'Grok'));
    assert.ok(sitemapEntries(rich).some((e) => e.loc === '/model/glm.html'));
    assert.ok(sitemapEntries(rich).some((e) => e.loc === '/model/grok.html'));
    assert.match(renderModel(rich, 'GLM'), /What has SIREN scored about GLM\?|GLM/);
    assert.match(renderModel(rich, 'Grok'), /What has SIREN scored about Grok\?|Grok/);
    assert.doesNotMatch(renderModel(rich, 'GLM'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderModel(rich, 'Grok'), /probability of doom/i);
  });

  it('indexes Kimi from Moonshot-family title forms', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('km1', 'Intel CEO Says DeepSeek, Kimi, GLM Are Good Enough', []),
          story('km2', 'Ecosia switches to open-weight AI models including Qwen, GLM, Kimi', []),
          story('km3', 'Kimi K2 open-weight release expands agent workloads', []),
        ],
      },
    };
    assert.ok(indexableModels(rich).some((m) => m.name === 'Kimi'));
    assert.ok(sitemapEntries(rich).some((e) => e.loc === '/model/kimi.html'));
    assert.match(renderModel(rich, 'Kimi'), /What has SIREN scored about Kimi\?|Kimi/);
    assert.doesNotMatch(renderModel(rich, 'Kimi'), /doom score:\s*\d/i);
    const thin = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('bad1', 'A kimono metaphor in a design essay', []),
          story('bad2', 'Towerglow orchestrator ships', []),
          story('bad3', 'An open-weight note without naming the model', []),
        ],
      },
    };
    assert.ok(!indexableModels(thin).some((m) => m.name === 'Kimi'));
  });

  it('indexes Claude, GPT, Gemini, Qwen, DeepSeek-R, Llama, and Gemma model hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('cl1', 'Claude ships a new Anthropic checkpoint', ['Claude']),
          story('cl2', 'Claude handles long-context agent tasks', ['Claude']),
          story('cl3', 'Developers adopt Claude for coding agents', ['Claude']),
          story('gp1', 'GPT models expand OpenAI API traffic', ['GPT']),
          story('gp2', 'GPT fine-tunes land in enterprise copilots', ['GPT']),
          story('gp3', 'Researchers benchmark GPT against open weights', ['GPT']),
          story('ge1', 'Gemini multimodal updates land in Google apps', ['Gemini']),
          story('ge2', 'Gemini API adds new reasoning modes', ['Gemini']),
          story('ge3', 'Enterprises trial Gemini for document agents', ['Gemini']),
          story('qw1', 'Qwen open-weight models expand Alibaba Cloud AI', ['Qwen']),
          story('qw2', 'Developers pull Qwen checkpoints for agents', ['Qwen']),
          story('qw3', 'Qwen multimodal release widens open-source use', ['Qwen']),
          story('ds1', 'DeepSeek-R1 beats prior open baseline', ['DeepSeek-R']),
          story('ds2', 'Labs react to DeepSeek-R reasoning scores', ['DeepSeek-R']),
          story('ds3', 'DeepSeek-R open weights land on Hugging Face', ['DeepSeek-R']),
          story('ll1', 'Llama open weights expand Meta AI distribution', ['Llama']),
          story('ll2', 'Fine-tunes of Llama power local coding agents', ['Llama']),
          story('ll3', 'Enterprises host Llama for private inference', ['Llama']),
          story('gm1', 'Gemma open models expand Google DeepMind lineup', ['Gemma']),
          story('gm2', 'Developers fine-tune Gemma for on-device apps', ['Gemma']),
          story('gm3', 'Gemma checkpoints land in edge AI kits', ['Gemma']),
        ],
      },
    };
    for (const [name, slug] of [
      ['Claude', 'claude'],
      ['GPT', 'gpt'],
      ['Gemini', 'gemini'],
      ['Qwen', 'qwen'],
      ['DeepSeek-R', 'deepseek-r'],
      ['Llama', 'llama'],
      ['Gemma', 'gemma'],
    ]) {
      assert.ok(indexableModels(rich).some((m) => m.name === name), name);
      assert.ok(sitemapEntries(rich).some((e) => e.loc === `/model/${slug}.html`), slug);
      assert.match(renderModel(rich, name), new RegExp(name));
      assert.doesNotMatch(renderModel(rich, name), /doom score:\s*\d/i);
    }
  });

  it('indexes EmbeddingGemma, SynthID, and Clef model hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('eg1', 'EmbeddingGemma 2: an open, lightweight multimodal embedding model', []),
          story('eg2', 'Google DeepMind launches EmbeddingGemma 2, a 740M-parameter model', []),
          story('eg3', 'Open-source Mac app that runs EmbeddingGemma 2 locally', []),
          story('sy1', 'Google rolls out improved SynthID AI content detector', []),
          story('sy2', 'Google DeepMind introduces SynthID Bio for AI-designed proteins', []),
          story('sy3', 'Step-by-step guide: How to use Google’s SynthID detector', []),
          story('cl1', 'Cloudflare debuts open-weight multimodal decision models Clef and Clef-flash', []),
          story('cl2', 'Cloudflare debuts Clef-omni, an open-weight decision model', []),
          story('cl3', 'Cloudflare Open Sources Decision Models for AI Agents including Clef', []),
        ],
      },
    };
    assert.ok(indexableModels(rich).some((m) => m.name === 'EmbeddingGemma'));
    assert.ok(indexableModels(rich).some((m) => m.name === 'SynthID'));
    assert.ok(indexableModels(rich).some((m) => m.name === 'Clef'));
    assert.ok(sitemapEntries(rich).some((e) => e.loc === '/model/embeddinggemma.html'));
    assert.ok(sitemapEntries(rich).some((e) => e.loc === '/model/synthid.html'));
    assert.ok(sitemapEntries(rich).some((e) => e.loc === '/model/clef.html'));
    assert.match(renderModel(rich, 'EmbeddingGemma'), /What has SIREN scored about EmbeddingGemma\?|EmbeddingGemma/);
    assert.match(renderModel(rich, 'SynthID'), /What has SIREN scored about SynthID\?|SynthID/);
    assert.match(renderModel(rich, 'Clef'), /What has SIREN scored about Clef\?|Clef/);
    assert.doesNotMatch(renderModel(rich, 'EmbeddingGemma'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderModel(rich, 'SynthID'), /probability of doom/i);
    assert.doesNotMatch(renderModel(rich, 'Clef'), /doom score:\s*\d/i);
    const thin = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('bad1', 'A gemma stone metaphor in a poem', []),
          story('bad2', 'Towerglow orchestrator ships', []),
          story('bad3', 'An open-weight decision note without naming the product', []),
        ],
      },
    };
    assert.ok(!indexableModels(thin).some((m) => m.name === 'EmbeddingGemma'));
    assert.ok(!indexableModels(thin).some((m) => m.name === 'SynthID'));
    assert.ok(!indexableModels(thin).some((m) => m.name === 'Clef'));
  });

  it('indexes Codex from OpenAI Codex / Codex CLI forms (not bare Codex)', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('cx1', 'OpenAI Codex Launches Input Prediction Beta', []),
          story('cx2', 'Codex CLI 0.162 vs Claude Code', []),
          story('cx3', 'Regional Codex Hackathon Comes to Malaysia', []),
        ],
      },
    };
    assert.ok(indexableModels(rich).some((m) => m.name === 'Codex'));
    // Bare "Codex" alone must not invent matches on unrelated titles.
    const thin = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('bad1', 'Towerglow orchestrator ships', []),
          story('bad2', 'ollama v0.40.3 release notes', []),
          story('bad3', 'Asana cuts model costs in browser tests', []),
        ],
      },
    };
    assert.ok(!indexableModels(thin).some((m) => m.name === 'Codex'));
    const html = renderModel(rich, 'Codex');
    assert.match(html, /What has SIREN scored about Codex\?|Codex/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
    assert.ok(sitemapEntries(rich).some((e) => e.loc === '/model/codex.html'));
  });
});