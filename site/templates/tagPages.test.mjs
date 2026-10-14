import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { render as renderItem } from './itemPage.mjs';
import {
  TAG_INDEX_MIN,
  TOPIC_DEFS,
  indexableTags,
  tagPath,
  tagStoryCount,
  tagsForItem,
  renderTag,
  renderIndex,
  renderTags,
  sitemapEntries,
} from './tagPages.mjs';

function story(id, title, summary = '') {
  return {
    id,
    title,
    summary,
    entities: [],
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
      story('a1', 'New AI agents ship computer use'),
      story('a2', 'Agentic workflow tools expand'),
      story('a3', 'Enterprise AI agents go live'),
      story('a4', 'Tool-use demos impress labs'),
      story('a5', 'Autonomous agents in production'),
      story('g1', 'One GPU headline alone'),
    ],
  },
};

describe('tag pages', () => {
  it('pages a topic only after the substance gate', () => {
    const ids = indexableTags(ctx).map((t) => t.id);
    assert.ok(ids.includes('agents'));
    assert.ok(!ids.includes('gpus'));
    assert.equal(TAG_INDEX_MIN, 5);
    assert.equal(tagPath('agents'), '/tags/agents.html');
    assert.ok(TOPIC_DEFS.length >= 5);
    const locs = sitemapEntries(ctx).map((e) => e.loc);
    assert.ok(locs.includes('/tags/'));
    assert.ok(locs.includes('/tags.html'));
    assert.ok(locs.includes('/tags/agents.html'));
    assert.ok(!locs.includes('/tags/gpus.html'));
  });

  it('ships /tags.html over the same gated tag set', () => {
    const html = renderTags(ctx);
    assert.match(html, /Which AI tags has SIREN scored stories about\?/);
    assert.match(html, /What has SIREN scored about AI agents\?/);
    assert.match(html, /Which AI doom indexes can you compare\?/);
    assert.match(html, /Which AI news tags have SIREN pages\?/);
    assert.match(html, /tg__k"><a href="\/compare\.html">Which AI doom indexes can you compare\?<\/a>/);
    assert.doesNotMatch(html, /tg__k"><a href="\/compare\.html">Compare<\/a>/);
    assert.doesNotMatch(html, /tg__k"><a href="\/tags\/">Tags<\/a>/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /What questions do people actually ask\?/);
    assert.match(html, /\/tags\/agents\.html/);
    assert.match(html, /does not publish a topic/);
    assert.match(html, /\/models\.html/);
    assert.match(renderIndex(ctx), /\/tags\.html/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
  });

  it('lists stories with ItemList schema and refuses doom claims', () => {
    const html = renderTag(ctx, 'agents');
    assert.match(html, /<title>What has SIREN scored about AI agents\?/);
    assert.match(html, /<h1>What has SIREN scored about AI agents\?<\/h1>/);
    assert.match(html, /Which AI stories has SIREN scored in this window\?/);
    assert.match(html, /Which AI news tags have SIREN pages\?/);
    assert.match(html, /Which AI tags has SIREN scored stories about\?/);
    assert.match(html, /tg__k"><a href="\/news\.html">Which AI stories has SIREN scored in this window\?<\/a>/);
    assert.doesNotMatch(html, /tg__k"><a href="\/news\.html">Newsroom<\/a>/);
    assert.doesNotMatch(html, /tg__k"><a href="\/tags\/">Tags<\/a>/);
    assert.match(html, /CollectionPage/);
    assert.match(html, /SpeakableSpecification/);
    assert.match(html, /FAQPage/);
    assert.match(html, /What questions do people actually ask\?/);
    assert.match(html, /id="window"[^>]*>Which scored stories are tagged AI agents in this window\?/);
    assert.match(html, /ItemList/);
    assert.match(html, /New AI agents ship computer use/);
    assert.match(html, /not a probability of harm/);
    assert.doesNotMatch(html, /noindex/);
    assert.doesNotMatch(html, /<h2>Stories tagged AI agents<\/h2>/);
    assert.doesNotMatch(html, /<h2>Other tags<\/h2>/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
  });

  it('renders the tag index and links from story pages', () => {
    const index = renderIndex(ctx);
    assert.match(index, /Which AI news tags have SIREN pages\?/);
    assert.match(index, /What has SIREN scored about AI agents\?/);
    assert.match(index, /Which AI stories has SIREN scored in this window\?/);
    assert.match(index, /tg__k"><a href="\/news\.html">Which AI stories has SIREN scored in this window\?<\/a>/);
    assert.doesNotMatch(index, /tg__k"><a href="\/news\.html">Newsroom<\/a>/);
    assert.match(index, /What questions do people actually ask\?/);
    assert.match(index, /"@type"\s*:\s*"FAQPage"/);
    assert.match(index, /speakable/);
    assert.match(index, /\/tags\/agents\.html/);
    const tags = tagsForItem(ctx, ctx.news.items[0]);
    assert.ok(tags.some((t) => t.id === 'agents'));
    const html = renderItem(ctx, ctx.news.items[0]);
    assert.match(html, /href="\/tags\/agents\.html">What has SIREN scored about AI agents\?<\/a>/);
    assert.doesNotMatch(html, /href="\/tags\/agents\.html">AI agents<\/a>/);
  });

  it('links older archived stories that match the tag needle', () => {
    const withArch = {
      ...ctx,
      itemArchive: [
        story('old1', 'Archived AI agents story from last week'),
      ],
    };
    const html = renderTag(withArch, 'agents');
    assert.match(html, /id="older"[^>]*>Which older scored stories are tagged AI agents\?/);
    assert.match(html, /Archived AI agents story/);
    assert.match(html, /\/item\/archive\.html/);
    assert.doesNotMatch(html, /<h2>Older scored stories tagged AI agents<\/h2>/);
  });

  it('lets the durable archive keep a tag hub above the substance gate', () => {
    const withArch = {
      ...ctx,
      news: {
        ...ctx.news,
        items: [
          story('w1', 'OpenAI enables opt-in text watermarking'),
          story('w2', 'Lab ships watermark detector API'),
        ],
      },
      itemArchive: [
        story('w-old1', 'Archived watermark research paper'),
        story('w-old2', 'Archived watermark policy brief'),
        story('w-old3', 'Archived watermarking rollout note'),
      ],
    };
    const ids = indexableTags(withArch).map((t) => t.id);
    assert.ok(ids.includes('watermarking'));
    const html = renderTag(withArch, 'watermarking');
    assert.doesNotMatch(html, /noindex/);
    assert.match(html, /id="older"[^>]*>Which older scored stories are tagged AI watermarking\?/);
    assert.doesNotMatch(html, /<h2>Older scored stories tagged AI watermarking<\/h2>/);
  });

  it('indexes coding and acquisitions when the live gate clears', () => {
    const rich = {
      ...ctx,
      news: {
        ...ctx.news,
        items: [
          story('c1', 'AI coding agents beat SWE-bench baseline'),
          story('c2', 'New coding agent ships for enterprise'),
          story('c3', 'Copilot AI coding tools expand'),
          story('c4', 'Devin coding agent update'),
          story('c5', 'Vibe coding workflow lands in IDEs'),
          story('m1', 'Lab announces acquisition of rival startup'),
          story('m2', 'Big tech acqui-hire of research team'),
          story('m3', 'Startup acquires smaller model shop'),
          story('m4', 'Chip firm bought by hyperscaler'),
          story('m5', 'Merger with AI infrastructure vendor'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('coding'));
    assert.ok(ids.includes('acquisitions'));
    assert.match(renderTag(rich, 'coding'), /What has SIREN scored about AI coding\?/);
    assert.match(renderTag(rich, 'acquisitions'), /What has SIREN scored about AI acquisitions\?/);
    assert.ok(TOPIC_DEFS.some((t) => t.id === 'coding'));
    assert.ok(TOPIC_DEFS.some((t) => t.id === 'acquisitions'));
  });

  it('pages evals, video, and voice topic hubs when the needle clears the gate', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('e1', 'Claude tops the LMSYS leaderboard'),
          story('e2', 'Chatbot Arena raises on model evals'),
          story('e3', 'SWE-bench update for coding agents'),
          story('e4', 'New MMLU variant for frontier models'),
          story('e5', 'GPQA diamond results for reasoning'),
          story('v1', 'OpenAI plans to revive Sora'),
          story('v2', 'Text-to-video tools flood the market'),
          story('v3', 'Runway Gen model ships a new cut'),
          story('v4', 'Pika Labs AI video demo'),
          story('v5', 'Kling AI generative video update'),
          story('o1', 'Voice AI still waiting on its ChatGPT moment'),
          story('o2', 'ElevenLabs text-to-speech upgrade'),
          story('o3', 'Speech-to-text ASR error rates drop'),
          story('o4', 'OpenAI Whisper fine-tune for calls'),
          story('o5', 'Voice clon tools draw new rules'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('evals'));
    assert.ok(ids.includes('video'));
    assert.ok(ids.includes('voice'));
    assert.match(renderTag(rich, 'evals'), /What has SIREN scored about AI evals\?/);
    assert.match(renderTag(rich, 'video'), /What has SIREN scored about AI video\?/);
    assert.match(renderTag(rich, 'voice'), /What has SIREN scored about Voice AI\?/);
    assert.ok(TOPIC_DEFS.some((t) => t.id === 'evals'));
    assert.ok(TOPIC_DEFS.some((t) => t.id === 'video'));
    assert.ok(TOPIC_DEFS.some((t) => t.id === 'voice'));
  });

  it('pages reasoning, IPO, and RAG topic hubs when the needle clears the gate', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('r1', 'New reasoning models beat prior o1 baselines'),
          story('r2', 'Chain-of-thought faithfulness study'),
          story('r3', 'Test-time compute scaling curves'),
          story('r4', 'OpenAI o3 thinking mode preview'),
          story('r5', 'Extended thinking cuts tool errors'),
          story('i1', 'Anthropic IPO talk heats up'),
          story('i2', 'CoreWeave IPO files redraw AI infra'),
          story('i3', 'OpenAI IPO rumors meet bank earnings'),
          story('i4', 'When is the Anthropic IPO priced'),
          story('i5', 'Direct listing talk for Anthropic AI'),
          story('g1', 'Agentic RAG evaluation budget paper'),
          story('g2', 'Retrieval-augmented generation in prod'),
          story('g3', 'Amazon Bedrock RAG access control'),
          story('g4', 'LangChain RAG pipeline update'),
          story('g5', 'Multimodal RAG compression note'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('reasoning'));
    assert.ok(ids.includes('ipo'));
    assert.ok(ids.includes('rag'));
    assert.match(renderTag(rich, 'reasoning'), /What has SIREN scored about Reasoning models\?/);
    assert.match(renderTag(rich, 'ipo'), /What has SIREN scored about AI IPOs\?/);
    assert.match(renderTag(rich, 'rag'), /What has SIREN scored about RAG \/ retrieval\?/);
  });

  it('indexes AI IPOs from Moonshot / Firmus / Nvidia-backed listing forms', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('ipo1', 'Moonshot AI Plans Record $50 Billion Hong Kong IPO'),
          story('ipo2', 'Nvidia-Backed Firmus Scraps Australian IPO'),
          story('ipo3', 'Firmus IPO Debacle Raises the Bar for Asia AI Deals'),
          story('ipo4', 'Research Firm Calls Anthropic\'s IPO Unprecedented'),
          story('ipo5', 'Nvidia-backed data centre firm scraps IPO as AI valuation concerns deepen'),
        ],
      },
    };
    assert.ok(indexableTags(rich).some((t) => t.id === 'ipo'));
    assert.ok(tagStoryCount(rich, 'ipo') >= TAG_INDEX_MIN);
    assert.match(renderTag(rich, 'ipo'), /What has SIREN scored about AI IPOs\?/);
    assert.ok(sitemapEntries(rich).some((e) => e.loc === '/tags/ipo.html'));
  });

  it('indexes TSMC from Taiwan Semi market nickname forms', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('t1', 'TSMC Reports Oct. 15 early read on Nvidia'),
          story('t2', "TSMC's Record Quarter Collides With OpenAI Puzzle"),
          story('t3', 'Elon Musk confirms TSMC discussions on a Terafab deal'),
          story('t4', "ASML, Nvidia's chipmaker Taiwan Semi to kick off AI earnings"),
          story('t5', 'Taiwan Semiconductor capacity update for AI GPUs'),
        ],
      },
    };
    assert.ok(indexableTags(rich).some((t) => t.id === 'tsmc'));
    assert.ok(tagStoryCount(rich, 'tsmc') >= TAG_INDEX_MIN);
    assert.match(renderTag(rich, 'tsmc'), /What has SIREN scored about TSMC\?/);
    assert.ok(sitemapEntries(rich).some((e) => e.loc === '/tags/tsmc.html'));
  });

  it('clears red-teaming via jailbreak detection without bare jailbreak false friends', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('rt1', 'Agents that red-team startup ideas'),
          story('rt2', 'Red-team evolution of agent skills'),
          story('rt3', 'Autonomous red-teaming for repos'),
          story('rt4', 'Red teaming multi-service agents'),
          story('rt5', 'Fragility of gradient-based jailbreak detection'),
          // Refuse: bare console jailbreak without “detection”.
          story('bad', 'PS5 jailbreaks spread across social media'),
        ],
      },
    };
    assert.ok(tagStoryCount(rich, 'red-teaming') >= TAG_INDEX_MIN);
    assert.ok(indexableTags(rich).some((t) => t.id === 'red-teaming'));
    assert.match(renderTag(rich, 'red-teaming'), /What has SIREN scored about Red-teaming\?/);
    assert.match(renderTag(rich, 'red-teaming'), /jailbreak detection/i);
    assert.doesNotMatch(renderTag(rich, 'red-teaming'), /PS5 jailbreaks/);
    assert.ok(sitemapEntries(rich).some((e) => e.loc === '/tags/red-teaming.html'));
  });

  it('clears edge-ai, audio-generation, ai-regulation, openai-codex, imitation-learning, protein-design gates', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('ed1', 'Edge-Native language models for on-device AI'),
          story('ed2', 'Edge LLM agents resist context pollution'),
          story('ed3', 'Packet twin commissions megahertz edge AI'),
          story('ed4', 'On-device AI note-taker ships offline'),
          story('ed5', 'Edge AI broadband demo at Network X'),
          story('au1', 'Text-to-speech model ships emotional control'),
          story('au2', 'Synchronized video and audio generation paper'),
          story('au3', 'Joint video-audio generation training recipe'),
          story('au4', 'Open text-to-speech leaderboard expands'),
          story('au5', 'Foley audio generation with retrieval'),
          story('rg1', 'Microsoft president on a gap in AI regulation'),
          story('rg2', 'EU AI Act readiness guide for corporate leaders'),
          story('rg3', 'EU Tech Chief says AI Act can contain rogue agents'),
          story('rg4', 'AI Regulation must balance safety with innovation'),
          story('rg5', 'Senators debate AI regulation and free speech'),
          story('cx1', 'OpenAI Codex launches input prediction beta'),
          story('cx2', 'OpenAI Codex Head states default context length'),
          story('cx3', 'Codex CLI 0.162 vs Claude Code'),
          story('cx4', 'OpenAI brings Codex hackathon series to Malaysia'),
          story('cx5', 'OpenAI announces new features for Codex CLI'),
          story('il1', 'Adversarial imitation learning rates paper'),
          story('il2', 'Generative behavioral cloning multimodality'),
          story('il3', 'Imitation learning for action chunks'),
          story('il4', 'Behavioral cloning for VLA policies'),
          story('il5', 'Imitation learning vs reinforcement learning'),
          story('pd1', 'AlphaFold cracked protein shapes from DNA'),
          story('pd2', 'Protein folding model training kernel'),
          story('pd3', 'Does learning protein folding generalize'),
          story('pd4', 'Watermark for AI-designed protein design'),
          story('pd5', 'AlphaFold follow-on for broader folding'),
          // Refuse: bare TTS (test-time) and bare Codex / bare space-adjacent edge.
          story('bad1', 'Test-time scaling TTS curves for agents'),
          story('bad2', 'A codex of medieval manuscripts goes online'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    for (const id of ['edge-ai', 'audio-generation', 'ai-regulation', 'openai-codex', 'imitation-learning', 'protein-design']) {
      assert.ok(ids.includes(id), `${id} clears TAG_INDEX_MIN`);
      assert.ok(tagStoryCount(rich, id) >= TAG_INDEX_MIN, `${id} count`);
      assert.ok(sitemapEntries(rich).some((e) => e.loc === `/tags/${id}.html`), `${id} sitemap`);
    }
    assert.match(renderTag(rich, 'openai-codex'), /What has SIREN scored about OpenAI Codex\?/);
    assert.match(renderTag(rich, 'edge-ai'), /What has SIREN scored about Edge AI\?/);
    assert.doesNotMatch(renderTag(rich, 'audio-generation'), /Test-time scaling TTS curves/);
    assert.doesNotMatch(renderTag(rich, 'openai-codex'), /medieval manuscripts/);
  });

  it('pages MCP, fine-tuning, and quantization hubs when the needle clears the gate', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('m1', 'Anthropic ships Model Context Protocol servers'),
          story('m2', 'MCP clients land in coding agents'),
          story('m3', 'New MCP server for file tools'),
          story('m4', 'Labs adopt the Model Context Protocol'),
          story('m5', 'Open MCP registry grows overnight'),
          story('f1', 'Fine-tuning Llama for enterprise RAG'),
          story('f2', 'LoRA fine-tune cuts training cost'),
          story('f3', 'QLoRA post-training notebook ships'),
          story('f4', 'Lab fine-tuned a smaller student model'),
          story('f5', 'Post-training stack for open weights'),
          story('q1', 'INT4 quantization lands in vLLM'),
          story('q2', 'GGUF AWQ GPTQ packing guide'),
          story('q3', 'FP8 serving stack cuts memory'),
          story('q4', 'Lab ships quantized 70B checkpoint'),
          story('q5', 'INT8 quantization for edge inference'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('mcp'));
    assert.ok(ids.includes('fine-tuning'));
    assert.ok(ids.includes('quantization'));
    assert.match(renderTag(rich, 'mcp'), /What has SIREN scored about MCP \/ tool protocols\?/);
    assert.match(renderTag(rich, 'fine-tuning'), /What has SIREN scored about Fine-tuning\?/);
    assert.match(renderTag(rich, 'quantization'), /What has SIREN scored about Quantization\?/);
  });

  it('pages distillation and agent-memory hubs when the needle clears the gate', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('d1', 'Knowledge distillation for a smaller student'),
          story('d2', 'Lab distilled a 70B teacher into 8B'),
          story('d3', 'Distillation cuts inference cost in half'),
          story('d4', 'Open weights via distillation pipeline'),
          story('d5', 'Distilling chain-of-thought into a tiny model'),
          story('y1', 'Long-term memory for coding agents'),
          story('y2', 'Agent memory layer ships in production'),
          story('y3', 'Episodic memory for tool-use agents'),
          story('y4', 'Memory for agents beyond the context window'),
          story('y5', 'New memory layer for browser agents'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('distillation'));
    assert.ok(ids.includes('memory'));
    assert.match(renderTag(rich, 'distillation'), /What has SIREN scored about Distillation\?/);
    assert.match(renderTag(rich, 'memory'), /What has SIREN scored about Agent memory\?/);
  });

  it('pages a test-time compute hub when the needle clears the gate', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('t1', 'Test-time compute scaling curves'),
          story('t2', 'Labs bet on test-time scaling'),
          story('t3', 'Inference-time scaling for o-series'),
          story('t4', 'Test-time compute budget paper'),
          story('t5', 'TTS scaling notes for agents'),
        ],
      },
    };
    assert.ok(indexableTags(rich).some((t) => t.id === 'test-time'));
    assert.match(renderTag(rich, 'test-time'), /What has SIREN scored about Test-time compute\?/);
  });

  it('pages Ollama, MLX, and computer-use hubs when the needle clears the gate', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('o1', 'Ollama adds a new local model pack'),
          story('o2', 'Ollama on Apple Silicon guide'),
          story('o3', 'Devs ship agents on Ollama'),
          story('o4', 'Ollama API update'),
          story('o5', 'Ollama vs other local runtimes'),
          story('x1', 'MLX ports a new LLM to Mac'),
          story('x2', 'Apple MLX training recipe'),
          story('x3', 'MLX inference speed note'),
          story('x4', 'Open MLX model weights'),
          story('x5', 'MLX for on-device agents'),
          story('u1', 'Computer-use agents beat prior demos'),
          story('u2', 'Labs ship computer use APIs'),
          story('u3', 'Computer use safety eval'),
          story('u4', 'Desktop computer-use product launch'),
          story('u5', 'Computer use for enterprise IT'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('ollama'));
    assert.ok(ids.includes('mlx'));
    assert.ok(ids.includes('computer-use'));
    assert.match(renderTag(rich, 'ollama'), /What has SIREN scored about Ollama\?/);
    assert.match(renderTag(rich, 'mlx'), /What has SIREN scored about MLX\?/);
    assert.match(renderTag(rich, 'computer-use'), /What has SIREN scored about Computer use\?/);
  });

  it('pages Hugging Face and Blackwell topic hubs when the needle clears the gate', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('h1', 'Hugging Face ships a new model hub feature'),
          story('h2', 'HuggingFace datasets update'),
          story('h3', 'Open weights land on Hugging Face'),
          story('h4', 'Hugging Face inference endpoints grow'),
          story('h5', 'Labs mirror checkpoints to Hugging Face'),
          story('b1', 'NVIDIA Blackwell GPUs for training'),
          story('b2', 'Blackwell rack density report'),
          story('b3', 'Cloud providers add Blackwell instances'),
          story('b4', 'Blackwell supply update'),
          story('b5', 'Inference on Blackwell accelerators'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('huggingface'));
    assert.ok(ids.includes('blackwell'));
    assert.match(renderTag(rich, 'huggingface'), /What has SIREN scored about Hugging Face\?/);
    assert.match(renderTag(rich, 'blackwell'), /What has SIREN scored about Blackwell GPUs\?/);
  });

  it('pages prefer-data, reasoning-traces, Claude Code, and OpenRouter hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('p1', 'RLHF preference data recipe'),
          story('p2', 'Direct preference optimization (DPO) paper'),
          story('p3', 'Preference tuning for chat models'),
          story('p4', 'Lab ships new preference data mix'),
          story('p5', 'DPO beats prior RLHF baseline'),
          story('r1', 'Reasoning traces for agent debug'),
          story('r2', 'Visible reasoning trace UI ships'),
          story('r3', 'Reasoning traces cut tool errors'),
          story('r4', 'Open reasoning trace format'),
          story('r5', 'Reasoning trace faithfulness study'),
          story('c1', 'Claude Code ships a new agent loop'),
          story('c2', 'Claude Code terminal update'),
          story('c3', 'Devs adopt Claude Code for refactors'),
          story('c4', 'Claude Code vs other coding agents'),
          story('c5', 'Claude Code changelog notes'),
          story('o1', 'OpenRouter adds a new model route'),
          story('o2', 'OpenRouter pricing update'),
          story('o3', 'Apps route via OpenRouter'),
          story('o4', 'OpenRouter marketplace grows'),
          story('o5', 'OpenRouter latency report'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('prefer-data'));
    assert.ok(ids.includes('reasoning-traces'));
    assert.ok(ids.includes('claude-code'));
    assert.ok(ids.includes('openrouter'));
    assert.match(renderTag(rich, 'prefer-data'), /What has SIREN scored about Preference data\?/);
    assert.match(renderTag(rich, 'reasoning-traces'), /What has SIREN scored about Reasoning traces\?/);
    assert.match(renderTag(rich, 'claude-code'), /What has SIREN scored about Claude Code\?/);
    assert.match(renderTag(rich, 'openrouter'), /What has SIREN scored about OpenRouter\?/);
  });

  it('pages kv-cache, AI Act, autonomous-vehicles, AI music, synthetic-data, inference-cost hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('k1', 'KV cache paging for long context'),
          story('k2', 'New kv-cache compression paper'),
          story('k3', 'KV cache hits cut GPU memory'),
          story('k4', 'Serving stack ships KV cache reuse'),
          story('k5', 'KV-cache aware batching note'),
          story('u1', 'EU AI Act compliance guide for labs'),
          story('u2', 'AI Act enforcement timeline update'),
          story('u3', 'Providers prepare for the AI Act'),
          story('u4', 'EU AI Act high-risk rules clarified'),
          story('u5', 'Startups and the AI Act'),
          story('v1', 'Waymo robotaxi expansion story'),
          story('v2', 'Self-driving stack uses frontier models'),
          story('v3', 'Autonomous vehicle safety report'),
          story('v4', 'Robotaxi rides cross a new city'),
          story('v5', 'Autonomous driving AI chip deal'),
          story('y1', 'Suno AI music model update'),
          story('y2', 'Udio generative music rivalry'),
          story('y3', 'AI music rights fight heats up'),
          story('y4', 'Music generation tools for creators'),
          story('y5', 'New AI music chart controversy'),
          story('z1', 'Synthetic data for model training'),
          story('z2', 'Limits of synthetic-data attribution'),
          story('z3', 'Lab ships synthetic training recipe'),
          story('z4', 'Synthetic data cuts labeling cost'),
          story('z5', 'Synth data pipeline for robotics'),
          story('c1', 'Inference cost drops for open weights'),
          story('c2', 'Cost per million tokens comparison'),
          story('c3', 'Labs publish $/mTok serving prices'),
          story('c4', 'Inference cost curve for agents'),
          story('c5', 'Serving price war on inference cost'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    for (const id of ['kv-cache', 'ai-act', 'autonomous-vehicles', 'ai-music', 'synthetic-data', 'inference-cost']) {
      assert.ok(ids.includes(id), id);
    }
    assert.match(renderTag(rich, 'kv-cache'), /What has SIREN scored about KV cache\?/);
    assert.match(renderTag(rich, 'ai-act'), /What has SIREN scored about EU AI Act\?/);
    assert.match(renderTag(rich, 'autonomous-vehicles'), /What has SIREN scored about Autonomous vehicles\?/);
    assert.match(renderTag(rich, 'ai-music'), /What has SIREN scored about AI music\?/);
    assert.match(renderTag(rich, 'synthetic-data'), /What has SIREN scored about Synthetic data\?/);
    assert.match(renderTag(rich, 'inference-cost'), /What has SIREN scored about Inference cost\?/);
  });

  it('pages multi-agent, deepfakes, SLM, AI-science, and speculative-decoding hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('m1', 'Multi-agent systems for enterprise workflows'),
          story('m2', 'Agent swarm coordination paper'),
          story('m3', 'New multi-agent benchmark ships'),
          story('m4', 'Swarm of agents beats single agent'),
          story('m5', 'Multi-agent routing cuts tool errors'),
          story('f1', 'Deepfake detectors improve overnight'),
          story('f2', 'Synthetic media rules for elections'),
          story('f3', 'Deep-fake audio scam report'),
          story('f4', 'Labs ship deepfakes watermark tools'),
          story('f5', 'Deepfake dataset for research'),
          story('l1', 'Small language models for on-device AI'),
          story('l2', 'New SLM beats larger baseline'),
          story('l3', 'On-device LLM for phones'),
          story('l4', 'SLMs cut inference cost'),
          story('l5', 'Small language model open weights'),
          story('a1', 'AI for science materials discovery'),
          story('a2', 'AlphaFold update for proteins'),
          story('a3', 'Scientific discovery with frontier models'),
          story('a4', 'Materials discovery lab uses AI'),
          story('a5', 'AI for science grant round'),
          story('p1', 'Speculative decoding speeds inference'),
          story('p2', 'Lab ships speculative decoding in vLLM'),
          story('p3', 'Speculative decoding for long context'),
          story('p4', 'Open speculative decoding recipe'),
          story('p5', 'Speculative decoding cuts latency'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('multi-agent'));
    assert.ok(ids.includes('deepfakes'));
    assert.ok(ids.includes('slm'));
    assert.ok(ids.includes('ai-science'));
    assert.ok(ids.includes('speculative-decoding'));
    assert.match(renderTag(rich, 'multi-agent'), /What has SIREN scored about Multi-agent systems\?/);
    assert.match(renderTag(rich, 'deepfakes'), /What has SIREN scored about Deepfakes\?/);
    assert.match(renderTag(rich, 'slm'), /What has SIREN scored about Small language models\?/);
    assert.match(renderTag(rich, 'ai-science'), /What has SIREN scored about AI for science\?/);
    assert.match(renderTag(rich, 'speculative-decoding'), /What has SIREN scored about Speculative decoding\?/);
  });

  it('pages diffusion, embeddings, guardrails, context-window, and ai-search hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('d1', 'Stable Diffusion model ships a new checkpoint'),
          story('d2', 'Latent diffusion training recipe'),
          story('d3', 'Reinforcement of diffusion models paper'),
          story('d4', 'Conditional diffusion models for images'),
          story('d5', 'Open diffusion models release note'),
          story('e1', 'New embeddings for semantic search'),
          story('e2', 'Vector database ranking update'),
          story('e3', 'Geospatial foundation model embeddings'),
          story('e4', 'Embedding model beats prior baseline'),
          story('e5', 'Vector search for RAG pipelines'),
          story('g1', 'What should AI guardrails look like'),
          story('g2', 'Lab ships a content filter API'),
          story('g3', 'Safety filter for coding agents'),
          story('g4', 'Guardrails product for enterprise chat'),
          story('g5', 'Multi-agent guardrail patterns'),
          story('x1', 'Million-token context window demo'),
          story('x2', 'Long context eval for agents'),
          story('x3', '1m context shipping in API'),
          story('x4', 'Context windows expand again'),
          story('x5', 'New context window pricing note'),
          story('s1', 'Perplexity AI search product update'),
          story('s2', 'ChatGPT search rolls out wider'),
          story('s3', 'AI overview changes publisher traffic'),
          story('s4', 'SearchGPT prototype notes'),
          story('s5', 'Show HN: AI search for local photos'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('diffusion'));
    assert.ok(ids.includes('embeddings'));
    assert.ok(ids.includes('guardrails'));
    assert.ok(ids.includes('context-window'));
    assert.ok(ids.includes('ai-search'));
    assert.match(renderTag(rich, 'diffusion'), /What has SIREN scored about Diffusion models\?/);
    assert.match(renderTag(rich, 'embeddings'), /What has SIREN scored about Embeddings\?/);
    assert.match(renderTag(rich, 'guardrails'), /What has SIREN scored about AI guardrails\?/);
    assert.match(renderTag(rich, 'context-window'), /What has SIREN scored about Context windows\?/);
    assert.match(renderTag(rich, 'ai-search'), /What has SIREN scored about AI search\?/);
  });

  it('pages hallucination, prompt-injection, MoE, world-models, and copyright hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('h1', 'Tracing hallucinated terms in RAG answers'),
          story('h2', 'Post-hallucination reasoning benchmark'),
          story('h3', 'Lab cuts hallucination rate on medical QA'),
          story('h4', 'Hallucination detectors for agent tools'),
          story('h5', 'Factuality vs hallucination tradeoff note'),
          story('p1', 'Learnable delimiters for prompt injection defense'),
          story('p2', 'Adaptive prompt injection against web agents'),
          story('p3', 'Prompt-injection red team for copilots'),
          story('p4', 'New prompt injection dataset ships'),
          story('p5', 'Prompt injection bypasses tool sandboxes'),
          story('o1', 'Converting dense models into Mixture-of-Experts'),
          story('o2', 'Sparse MoE routing paper'),
          story('o3', 'Training a 8x7B MoE checkpoint'),
          story('o4', 'Mixture of experts cuts serving cost'),
          story('o5', 'Open MoE weights release'),
          story('w1', 'Robot policies steered with world models'),
          story('w2', 'Generative world model demo'),
          story('w3', 'Egocentric world model for agents'),
          story('w4', 'Video world model for task planning'),
          story('w5', 'Language world models for simulation'),
          story('c1', 'USA Today copyright lawsuit against OpenAI'),
          story('c2', 'Third Circuit fair use ruling on AI training'),
          story('c3', 'Publishers sue over copyrighted training-data copying'),
          story('c4', 'AI copyright suit redraws fair use'),
          story('c5', 'Copyright office seeks comment on AI training'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('hallucination'));
    assert.ok(ids.includes('prompt-injection'));
    assert.ok(ids.includes('moe'));
    assert.ok(ids.includes('world-models'));
    assert.ok(ids.includes('copyright'));
    assert.match(renderTag(rich, 'hallucination'), /What has SIREN scored about AI hallucination\?/);
    assert.match(renderTag(rich, 'prompt-injection'), /What has SIREN scored about Prompt injection\?/);
    assert.match(renderTag(rich, 'moe'), /What has SIREN scored about Mixture of experts\?/);
    assert.match(renderTag(rich, 'world-models'), /What has SIREN scored about World models\?/);
    assert.match(renderTag(rich, 'copyright'), /What has SIREN scored about AI copyright\?/);
    assert.doesNotMatch(renderTag(rich, 'hallucination'), /doom score:\s*\d/i);
  });

  it('pages voice-agents, skills, TSMC, MCP servers, llama.cpp, deep-research, LoRA, GRPO hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('va1', 'Voice agents for customer support'),
          story('va2', 'Realtime voice agent latency paper'),
          story('va3', 'Speech-to-speech voice agents ship'),
          story('va4', 'Voice-first agents on phones'),
          story('va5', 'Voice-based conversational agents eval'),
          story('sk1', 'AI agent skills pack for Claude'),
          story('sk2', 'Claude skills marketplace opens'),
          story('sk3', 'Agent skill routing improves tools'),
          story('sk4', 'Skill.md format for agent skills'),
          story('sk5', 'Anthropic skills for desktop agents'),
          story('t1', 'TSMC N2P AI chip node demand'),
          story('t2', 'Taiwan Semiconductor reports AI boom'),
          story('t3', 'TSMC capacity for AI accelerators'),
          story('t4', 'Foundry wait times cite TSMC'),
          story('t5', 'TSMC AI wafer pricing note'),
          story('m1', 'Best MCP servers for Claude Code'),
          story('m2', 'Self-hosted MCP server for agents'),
          story('m3', 'New MCP servers for databases'),
          story('m4', 'MCP server security review'),
          story('m5', 'Model Context Protocol servers list'),
          story('l1', 'Deploy models with llama.cpp'),
          story('l2', 'llama.cpp CUDA backend update'),
          story('l3', 'llamacpp quantization guide'),
          story('l4', 'Speed test vs llama.cpp'),
          story('l5', 'llama.cpp on Raspberry Pi'),
          story('d1', 'OpenAI deep research agent update'),
          story('d2', 'Deep research for enterprise docs'),
          story('d3', 'Multimodal deep research paper'),
          story('d4', 'Deep research agent harness'),
          story('d5', 'Limits of deep research agents'),
          story('lo1', 'LoRA adapters for domain chat'),
          story('lo2', 'QLoRA fine-tune on a single GPU'),
          story('lo3', 'Memory-floor LoRA at the edge'),
          story('lo4', 'LoRA merge recipes for open weights'),
          story('lo5', 'Comparing LoRA ranks for coding'),
          story('g1', 'BoT-GRPO for reasoning models'),
          story('g2', 'CorrGRPO multi-reward learning'),
          story('g3', 'GRPO training run notes'),
          story('g4', 'Open GRPO recipe for math'),
          story('g5', 'GRPO vs PPO for preference tuning'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    for (const id of ['voice-agents', 'skills', 'tsmc', 'mcp-servers', 'llama-cpp', 'deep-research', 'lora', 'grpo']) {
      assert.ok(ids.includes(id), id);
    }
    assert.match(renderTag(rich, 'voice-agents'), /What has SIREN scored about Voice agents\?/);
    assert.match(renderTag(rich, 'skills'), /What has SIREN scored about Agent skills\?/);
    assert.match(renderTag(rich, 'tsmc'), /What has SIREN scored about TSMC\?/);
    assert.match(renderTag(rich, 'mcp-servers'), /What has SIREN scored about MCP servers\?/);
    assert.match(renderTag(rich, 'llama-cpp'), /What has SIREN scored about llama\.cpp\?/);
    assert.match(renderTag(rich, 'deep-research'), /What has SIREN scored about Deep research\?/);
    assert.match(renderTag(rich, 'lora'), /What has SIREN scored about LoRA\?/);
    assert.match(renderTag(rich, 'grpo'), /What has SIREN scored about GRPO\?/);
    assert.doesNotMatch(renderTag(rich, 'voice-agents'), /doom score:\s*\d/i);
  });

  it('pages RLVR, humanoid, interpretability, GGUF, red-teaming, edge-AI, SFT, Copilot, diffusion-LLM, activation-steering, rerank, federated-learning hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('r1', 'RLVR improves math reasoning'),
          story('r2', 'Reinforcement learning from verifiable rewards paper'),
          story('r3', 'RLVR rollout reuse study'),
          story('r4', 'Open RLVR recipe for agents'),
          story('r5', 'Limits of RLVR verifiers'),
          story('h1', 'Humanoid robots learn from video'),
          story('h2', 'Nvidia physical AI for humanoid robots'),
          story('h3', 'Humanoid control policy release'),
          story('h4', 'Factory trials for humanoid workers'),
          story('h5', 'Humanoid benchmark for loco-manipulation'),
          story('i1', 'Mechanistic interpretability circuit discovery'),
          story('i2', 'Logit lens for model internals'),
          story('i3', 'Activation patching interpretability study'),
          story('i4', 'Mech-interp sparse autoencoder paper'),
          story('i5', 'CoT-interpretability alignment note'),
          story('g1', 'New GGUF quant on Hugging Face'),
          story('g2', 'GGUF packs for local runtimes'),
          story('g3', 'Converting safetensors to GGUF'),
          story('g4', 'GGUF Q4 vs Q5 quality'),
          story('g5', 'Trending GGUF checkpoints'),
          story('rt1', 'Red-teaming personal agents'),
          story('rt2', 'Agents that red-team startup ideas'),
          story('rt3', 'Red-team evolution of agent skills'),
          story('rt4', 'Autonomous red-teaming for repos'),
          story('rt5', 'Red teaming multi-service agents'),
          story('e1', 'Edge AI chip tester ships'),
          story('e2', 'On-device LLM for phones'),
          story('e3', 'Edge AI broadband gear'),
          story('e4', 'Compact on-device inference stack'),
          story('e5', 'Edge AI plasma control twin'),
          story('s1', 'Supervised fine-tuning under long-tail data'),
          story('s2', 'SFT token reweighting paper'),
          story('s3', 'SFT vs RL for domain adaptation'),
          story('s4', 'Open SFT mix for coding'),
          story('s5', 'Supervised fine-tune recipes'),
          story('c1', 'GitHub Copilot runtime rewrite'),
          story('c2', 'Microsoft Copilot Office update'),
          story('c3', 'Copilot prompts leak review'),
          story('c4', 'Copilot+ PCs security features'),
          story('c5', 'Copilot Studio staffing note'),
          story('d1', 'Diffusion language models design space'),
          story('d2', 'Faster speculative decoding in diffusion LLMs'),
          story('d3', 'Continuous diffusion language model paper'),
          story('d4', 'Quantization for diffusion language models'),
          story('d5', 'Autoregressive post-training for diffusion LLMs'),
          story('a1', 'Activation steering for emotion control'),
          story('a2', 'Closed-loop activation steering in diffusion LLMs'),
          story('a3', 'Contrastive activation addition for SLMs'),
          story('a4', 'Calibrated activation steering for traits'),
          story('a5', 'Representation engineering in LLM safety'),
          story('rk1', 'Agent skill reranking study'),
          story('rk2', 'Recommendation reranking with LLMs'),
          story('rk3', 'Learning to rerank search with vision'),
          story('rk4', 'RAG document-set reranking'),
          story('rk5', 'E-commerce preference reranker'),
          story('f1', 'Federated learning for edge devices'),
          story('f2', 'Personalized federated learning norms'),
          story('f3', 'Policy-compliant federated learning'),
          story('f4', 'Model-poisoning defense in federated learning'),
          story('f5', 'Hybrid-order federated learning'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    for (const id of [
      'rlvr', 'humanoid', 'interpretability', 'gguf', 'red-teaming', 'edge-ai',
      'sft', 'copilot', 'diffusion-llm', 'activation-steering', 'rerank', 'federated-learning',
    ]) {
      assert.ok(ids.includes(id), id);
    }
    assert.match(renderTag(rich, 'rlvr'), /What has SIREN scored about RLVR\?/);
    assert.match(renderTag(rich, 'humanoid'), /What has SIREN scored about Humanoid robots\?/);
    assert.match(renderTag(rich, 'interpretability'), /What has SIREN scored about Interpretability\?/);
    assert.match(renderTag(rich, 'gguf'), /What has SIREN scored about GGUF\?/);
    assert.match(renderTag(rich, 'red-teaming'), /What has SIREN scored about Red-teaming\?/);
    assert.match(renderTag(rich, 'edge-ai'), /What has SIREN scored about Edge AI\?/);
    assert.match(renderTag(rich, 'sft'), /What has SIREN scored about SFT\?/);
    assert.match(renderTag(rich, 'copilot'), /What has SIREN scored about Copilot\?/);
    assert.match(renderTag(rich, 'diffusion-llm'), /What has SIREN scored about Diffusion LLMs\?/);
    assert.match(renderTag(rich, 'activation-steering'), /What has SIREN scored about Activation steering\?/);
    assert.match(renderTag(rich, 'rerank'), /What has SIREN scored about Reranking\?/);
    assert.match(renderTag(rich, 'federated-learning'), /What has SIREN scored about Federated learning\?/);
    assert.doesNotMatch(renderTag(rich, 'rlvr'), /doom score:\s*\d/i);
  });

  it('pages training-data, physical-AI, GUI-agents, tool-calling, long-context, chain-of-thought, local-LLM hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('td1', 'AI training data supply chain grows'),
          story('td2', 'Programming training data for agents'),
          story('td3', 'Labs buy more training data'),
          story('td4', 'Open training data corpus release'),
          story('td5', 'Training data rights dispute'),
          story('pa1', 'Nvidia physical AI for robotaxis'),
          story('pa2', 'Physical AI ecosystem at trade show'),
          story('pa3', 'Robot gyms for physical AI'),
          story('pa4', 'Physical AI fundraising wave'),
          story('pa5', 'Is Physical AI a rebranded IoT?'),
          story('ga1', 'Mobile GUI agents benchmark'),
          story('ga2', 'Self-improving GUI agents'),
          story('ga3', 'Cross-user reliability for GUI agents'),
          story('ga4', 'GUI agent training from image edits'),
          story('ga5', 'Visual world models for GUI agents'),
          story('tc1', 'AI agent tool calling in TypeScript'),
          story('tc2', 'Tool-calling guardrails against loops'),
          story('tc3', 'New tool calls API for agents'),
          story('tc4', 'Tool calling latency hiding paper'),
          story('tc5', 'Enterprise tool-call audit'),
          story('lc1', 'Long-context hybrid attention paper'),
          story('lc2', 'Efficient transformers for long context'),
          story('lc3', 'Long-context serving cost study'),
          story('lc4', 'Mechanics of long-context models'),
          story('lc5', 'Sparse engine for long context'),
          story('ct1', 'Legal chain-of-thought faithfulness'),
          story('ct2', 'Chain-of-thought interpretability alignment'),
          story('ct3', 'Chain-of-thought hiding in distillation'),
          story('ct4', 'Chain of thought token spikes study'),
          story('ct5', 'Open chain-of-thought eval suite'),
          story('ll1', 'Local LLM classification cache'),
          story('ll2', 'Coding with local models on SWE-bench'),
          story('ll3', 'Local LLM reverse engineering notes'),
          story('ll4', 'Serving local models offline'),
          story('ll5', 'Local LLM vs cloud latency'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    for (const id of ['training-data', 'physical-ai', 'gui-agents', 'tool-calling', 'long-context', 'chain-of-thought', 'local-llm']) {
      assert.ok(ids.includes(id), id);
    }
    assert.match(renderTag(rich, 'training-data'), /What has SIREN scored about Training data\?/);
    assert.match(renderTag(rich, 'physical-ai'), /What has SIREN scored about Physical AI\?/);
    assert.match(renderTag(rich, 'gui-agents'), /What has SIREN scored about GUI agents\?/);
    assert.match(renderTag(rich, 'tool-calling'), /What has SIREN scored about Tool calling\?/);
    assert.match(renderTag(rich, 'long-context'), /What has SIREN scored about Long context\?/);
    assert.match(renderTag(rich, 'chain-of-thought'), /What has SIREN scored about Chain-of-thought\?/);
    assert.match(renderTag(rich, 'local-llm'), /What has SIREN scored about Local LLMs\?/);
    assert.doesNotMatch(renderTag(rich, 'physical-ai'), /doom score:\s*\d/i);
  });

  it('pages coding-agents, agentic-workflow, leaderboard, and alignment hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('ca1', 'Coding agents generate more code'),
          story('ca2', 'SWE-Duel for coding agents'),
          story('ca3', 'Coding-agent benchmarks match task flows'),
          story('ca4', 'Long-horizon coding agents train'),
          story('ca5', 'Enterprise coding agents ship'),
          story('aw1', 'Agentic RAG evaluation budgets'),
          story('aw2', 'Agentic coding performance from base models'),
          story('aw3', 'ParanoiaEval for agentic coding'),
          story('aw4', 'GPT nearly matches on agentic coding'),
          story('aw5', 'Agentic browser workflow notes'),
          story('lb1', 'AI alignment leaderboard ships'),
          story('lb2', 'Claude tops Epoch AI leaderboard'),
          story('lb3', 'Arena leaderboard valuation doubles'),
          story('lb4', 'Popular AI leaderboard raises Series B'),
          story('lb5', 'Consumer AI leaderboard trends'),
          story('al1', 'Labs current alignment plans seem terrible'),
          story('al2', 'AI alignment research forum for AIs'),
          story('al3', 'Model alignment and self-conception'),
          story('al4', 'Admiration and model alignment'),
          story('al5', 'Alignment leaderboard for chat models'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    for (const id of ['coding-agents', 'agentic-workflow', 'leaderboard', 'alignment']) {
      assert.ok(ids.includes(id), id);
    }
    assert.match(renderTag(rich, 'coding-agents'), /What has SIREN scored about Coding agents\?/);
    assert.match(renderTag(rich, 'agentic-workflow'), /What has SIREN scored about Agentic workflows\?/);
    assert.match(renderTag(rich, 'leaderboard'), /What has SIREN scored about AI leaderboards\?/);
    assert.match(renderTag(rich, 'alignment'), /What has SIREN scored about AI alignment\?/);
    assert.doesNotMatch(renderTag(rich, 'alignment'), /doom score:\s*\d/i);
  });

  it('pages world-action, embodied, TTS, and ASR hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('wa1', 'World-action model for robot manipulation'),
          story('wa2', 'World Action Models vs VLAs'),
          story('wa3', 'Latent world-action model on edge devices'),
          story('wa4', 'JEPA world action model with MPC'),
          story('wa5', 'Compositional world-action model paper'),
          story('em1', 'Embodied AI push into robotics startups'),
          story('em2', 'Continual learning for embodied agents'),
          story('em3', 'Long-horizon embodied agents control'),
          story('em4', 'Embodied intelligence navigation model'),
          story('em5', 'Self-evolving embodied AI benchmark'),
          story('tt1', 'Open text-to-speech leaderboard'),
          story('tt2', 'Distilling a text-to-speech model'),
          story('tt3', 'Zero-shot text-to-speech accent control'),
          story('tt4', 'ElevenLabs voice clone update'),
          story('tt5', 'Speech synthes recipe for Turkish TTS'),
          story('as1', 'Low-resource ASR augmentation costs'),
          story('as2', 'Introducing Falcon ASR'),
          story('as3', 'Speech-to-text in 16 MB'),
          story('as4', 'Automatic speech recognition for dialects'),
          story('as5', 'Cascaded voice agent ASR latency'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    for (const id of ['world-action', 'embodied', 'tts', 'asr']) {
      assert.ok(ids.includes(id), id);
    }
    assert.match(renderTag(rich, 'world-action'), /What has SIREN scored about World-action models\?/);
    assert.match(renderTag(rich, 'embodied'), /What has SIREN scored about Embodied AI\?/);
    assert.match(renderTag(rich, 'tts'), /What has SIREN scored about Text-to-speech\?/);
    assert.match(renderTag(rich, 'asr'), /What has SIREN scored about Speech recognition\?/);
    assert.doesNotMatch(renderTag(rich, 'embodied'), /doom score:\s*\d/i);
  });

  it('pages vision-language, foundation-models, video/image generation, merging, agent-memory, open-source-ai, tool-use', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('vl1', 'Vision-language model spatial reasoning'),
          story('vl2', 'When VLMs destroy lexical priors'),
          story('vl3', 'Multi-perspective verification for vision-language models'),
          story('vl4', 'VLM hallucination benchmark'),
          story('vl5', 'Training a VLM for robotics'),
          story('fm1', 'OCR foundation models for text'),
          story('fm2', 'Biological foundation models use inputs'),
          story('fm3', 'Medical foundation models release'),
          story('fm4', 'Open foundation models catalog'),
          story('fm5', 'Foundation model training costs'),
          story('vg1', 'Exocentric-to-egocentric video generation'),
          story('vg2', 'Goal-directed video generation paper'),
          story('vg3', 'Looking for a video generator'),
          story('vg4', 'Open video generation leaderboard'),
          story('vg5', 'Latent video generation recipe'),
          story('ig1', 'Heterogeneous image generators interface'),
          story('ig2', 'Pixel-space image generation diffusion'),
          story('ig3', 'Open image generation eval'),
          story('ig4', 'Controllable image generators'),
          story('ig5', 'Image generation safety filters'),
          story('mm1', 'Demographic model merging fairness'),
          story('mm2', 'A broader look at model merging'),
          story('mm3', 'Model merge for multilingual LLMs'),
          story('mm4', 'Task-arithmetic model merging'),
          story('mm5', 'Sparse model merging baselines'),
          story('am1', 'Bootstrapping agent memory from tasks'),
          story('am2', 'Schema evolution for agent memory'),
          story('am3', 'Long conversational agent memory'),
          story('am4', 'Episodic agent memory survey'),
          story('am5', 'Compressing agent memory traces'),
          story('os1', 'Open-source AI path for Europe'),
          story('os2', 'Nvidia stake in open-source AI startup'),
          story('os3', 'Open-source AI licensing debate'),
          story('os4', 'Enterprise open-source AI stack'),
          story('os5', 'Open-source AI model weights drop'),
          story('tu1', 'Coordinated tool use in CAD agents'),
          story('tu2', 'Failure attribution in tool-use agents'),
          story('tu3', 'Agentic learning with tool use'),
          story('tu4', 'Benchmarks for LLM tool-use'),
          story('tu5', 'Safe tool use in enterprise agents'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    for (const id of [
      'vision-language', 'foundation-models', 'video-generation', 'image-generation',
      'model-merging', 'agent-memory', 'open-source-ai', 'tool-use',
    ]) {
      assert.ok(ids.includes(id), id);
    }
    assert.match(renderTag(rich, 'vision-language'), /What has SIREN scored about Vision-language models\?/);
    assert.match(renderTag(rich, 'foundation-models'), /What has SIREN scored about Foundation models\?/);
    assert.match(renderTag(rich, 'video-generation'), /What has SIREN scored about Video generation\?/);
    assert.match(renderTag(rich, 'image-generation'), /What has SIREN scored about Image generation\?/);
    assert.match(renderTag(rich, 'model-merging'), /What has SIREN scored about Model merging\?/);
    assert.match(renderTag(rich, 'agent-memory'), /What has SIREN scored about Agent memory\?/);
    assert.match(renderTag(rich, 'open-source-ai'), /What has SIREN scored about Open-source AI\?/);
    assert.match(renderTag(rich, 'tool-use'), /What has SIREN scored about Tool use\?/);
    assert.doesNotMatch(renderTag(rich, 'foundation-models'), /doom score:\s*\d/i);
  });

  it('pages post-training, pretraining, zero-shot, in-context, tokenization, continual-learning, sparsity, knowledge-graphs, research-agents, system-prompts, ai-infrastructure, robot-learning', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('pt1', 'Continual post-training of small models'),
          story('pt2', 'Outcome-only post-training with RL'),
          story('pt3', 'Synthetic data for post-training'),
          story('pt4', 'Post-training recipe for tool use'),
          story('pt5', 'Efficient post-training on one GPU'),
          story('pr1', 'Knowledge organization in pre-training'),
          story('pr2', 'Dense to MoE conversion after pretraining'),
          story('pr3', 'Scaling laws for pre-training'),
          story('pr4', 'Curriculum pretraining for robots'),
          story('pr5', 'Open pre-training datasets'),
          story('zs1', 'Zero-shot robot foundation models'),
          story('zs2', 'Zero-shot accent transfer'),
          story('zs3', 'Zero-shot classification eval'),
          story('zs4', 'Improving zero-shot VLM transfer'),
          story('zs5', 'Zero-shot tool selection'),
          story('ic1', 'In-context learning for robots'),
          story('ic2', 'Limits of in-context learning'),
          story('ic3', 'Many-shot in-context learning'),
          story('ic4', 'In-context learning without labels'),
          story('ic5', 'Mechanics of in-context learning'),
          story('tk1', 'Adaptive visual tokenization'),
          story('tk2', 'Compute-adaptive tokenization'),
          story('tk3', 'Byte-level tokenizers survey'),
          story('tk4', 'Multilingual tokenization gaps'),
          story('tk5', 'Tokenizer free models'),
          story('cl1', 'Continual learning for embodied agents'),
          story('cl2', 'Agentic continual learning harness'),
          story('cl3', 'Catastrophic forgetting in continual learning'),
          story('cl4', 'Continual learning benchmarks'),
          story('cl5', 'Memory for continual learning'),
          story('sp1', 'Sparse attention gap in diffusion'),
          story('sp2', 'Model sparsity recipes'),
          story('sp3', 'Training with sparsity constraints'),
          story('sp4', 'Sparse models for edge devices'),
          story('sp5', 'Measuring model sparsity'),
          story('kg1', 'Knowledge graph embedding training'),
          story('kg2', 'Ontology-driven knowledge graphs'),
          story('kg3', 'RAG over knowledge graphs'),
          story('kg4', 'Enterprise knowledge graph AI'),
          story('kg5', 'Updating knowledge graphs with LLMs'),
          story('ra1', 'Multimodal deep research agent'),
          story('ra2', 'Institutions for research agents'),
          story('ra3', 'Open research agents benchmark'),
          story('ra4', 'Safety for research agents'),
          story('ra5', 'Research agents in science workflows'),
          story('sy1', 'Claude system prompt text cut'),
          story('sy2', 'Comparing system prompts across models'),
          story('sy3', 'Leaked system prompts archive'),
          story('sy4', 'Designing system prompts for agents'),
          story('sy5', 'System prompt injection defenses'),
          story('ai1', 'Cooling solutions for AI infrastructure'),
          story('ai2', 'PCIe test for AI infrastructure'),
          story('ai3', 'Funding AI infrastructure buildout'),
          story('ai4', 'Open AI infrastructure stack'),
          story('ai5', 'Power deals for AI infrastructure'),
          story('rl1', 'In-context robot learning recipe'),
          story('rl2', 'Multi-task robot learning on GPUs'),
          story('rl3', 'Sim-to-real robot learning'),
          story('rl4', 'Open robot learning datasets'),
          story('rl5', 'Benchmarking robot learning policies'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    for (const id of [
      'post-training', 'pretraining', 'zero-shot', 'in-context', 'tokenization',
      'continual-learning', 'sparsity', 'knowledge-graphs', 'research-agents',
      'system-prompts', 'ai-infrastructure', 'robot-learning',
    ]) {
      assert.ok(ids.includes(id), id);
    }
    assert.match(renderTag(rich, 'post-training'), /What has SIREN scored about Post-training\?/);
    assert.match(renderTag(rich, 'pretraining'), /What has SIREN scored about Pre-training\?/);
    assert.match(renderTag(rich, 'ai-infrastructure'), /What has SIREN scored about AI infrastructure\?/);
    assert.match(renderTag(rich, 'robot-learning'), /What has SIREN scored about Robot learning\?/);
    assert.doesNotMatch(renderTag(rich, 'post-training'), /doom score:\s*\d/i);
  });

  it('pages frontier/small/open models, generative-AI, reasoning-models, voice/conversational AI, audio-generation, AI chips', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('fr1', 'Frontier models for agents release'),
          story('fr2', 'Access restored to frontier models'),
          story('fr3', 'Evaluating frontier models safely'),
          story('fr4', 'Cost of serving frontier models'),
          story('fr5', 'Open rivals to frontier models'),
          story('sm1', 'Post-training small models cheaply'),
          story('sm2', 'Small language models on phones'),
          story('sm3', 'Distilling into small models'),
          story('sm4', 'Benchmarks for small models'),
          story('sm5', 'When small models beat large ones'),
          story('om1', 'Strategy on open models'),
          story('om2', 'Western open models roundup'),
          story('om3', 'Telecom bets on open models'),
          story('om4', 'Licensing open models'),
          story('om5', 'Fine-tuning open models at scale'),
          story('ga1', 'Generative AI scandal in photo contest'),
          story('ga2', 'Creator of generative AI viruses'),
          story('ga3', 'Enterprise generative AI rollout'),
          story('ga4', 'Generative AI policy draft'),
          story('ga5', 'Limits of generative AI writing'),
          story('rm1', 'When biological reasoning models use inputs'),
          story('rm2', 'Uncertainty in reasoning models'),
          story('rm3', 'Open reasoning models drop'),
          story('rm4', 'Cost of reasoning models'),
          story('rm5', 'Evals for reasoning models'),
          story('va1', 'Voice AI has not reached ChatGPT moment'),
          story('va2', 'Open voice AI that talks while listening'),
          story('va3', 'Enterprise voice AI stack'),
          story('va4', 'Latency in voice AI agents'),
          story('va5', 'Voice AI for call centers'),
          story('ca1', 'Conversational AI shopping assistant'),
          story('ca2', 'Conversational AI in customer support'),
          story('ca3', 'Evaluating conversational AI'),
          story('ca4', 'Multilingual conversational AI'),
          story('ca5', 'Safety for conversational AI'),
          story('ag1', 'Synchronized video and audio generation'),
          story('ag2', 'Text-to-audio foundation models'),
          story('ag3', 'Open audio generation leaderboard'),
          story('ag4', 'Spatial audio generation'),
          story('ag5', 'Audio generation for games'),
          story('ac1', 'Maia 300 AI chip unveiled'),
          story('ac2', 'Custom AI chips reduce Nvidia reliance'),
          story('ac3', 'AI chip export rules tighten'),
          story('ac4', 'Funding for AI chips startups'),
          story('ac5', 'Packaging for AI chips'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    for (const id of [
      'frontier-models', 'small-models', 'open-models', 'generative-ai',
      'reasoning-models', 'voice-ai', 'conversational-ai', 'audio-generation', 'ai-chips',
    ]) {
      assert.ok(ids.includes(id), id);
    }
    assert.match(renderTag(rich, 'frontier-models'), /What has SIREN scored about Frontier models\?/);
    assert.match(renderTag(rich, 'generative-ai'), /What has SIREN scored about Generative AI\?/);
    assert.match(renderTag(rich, 'ai-chips'), /What has SIREN scored about AI chips\?/);
    assert.doesNotMatch(renderTag(rich, 'generative-ai'), /doom score:\s*\d/i);
  });

  it('pages AI regulation, Artificial Analysis, humanoid robots, transformers, self-attention, Codex, reward models', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('ar1', 'UK best placed to drive AI regulation'),
          story('ar2', 'The AI regulation debate shaping the future'),
          story('ar3', 'Corporate AI regulation readiness'),
          story('ar4', 'States draft AI regulation bills'),
          story('ar5', 'Industry lobbies on AI regulation'),
          story('aa1', 'Artificial Analysis Intelligence Index update'),
          story('aa2', 'Artificial Analysis says Mistral Large leads'),
          story('aa3', 'Scores on Artificial Analysis for open models'),
          story('aa4', 'Artificial Analysis compares frontier models'),
          story('aa5', 'Reading the Artificial Analysis chart'),
          story('hr1', 'Motion planning for humanoid robots'),
          story('hr2', 'AI roadblocks for humanoid robots'),
          story('hr3', 'Factories train humanoid robots'),
          story('hr4', 'Funding round for humanoid robots'),
          story('hr5', 'Safety tests for humanoid robots'),
          story('tr1', 'Recurrent vision transformers with experts'),
          story('tr2', 'KV cache for looped transformer models'),
          story('tr3', 'Efficient transformer architecture survey'),
          story('tr4', 'Language transformers at long context'),
          story('tr5', 'Scaling transformer models on one GPU'),
          story('sa1', 'Self-attention for dense prediction'),
          story('sa2', 'Efficient self-attention token mixing'),
          story('sa3', 'Linear self-attention variants'),
          story('sa4', 'Sparse self-attention for video'),
          story('sa5', 'Theory of self-attention heads'),
          story('oc1', 'OpenAI Codex hackathon comes to Malaysia'),
          story('oc2', 'Codex CLI update for agents'),
          story('oc3', 'Sea and OpenAI Codex hackathon series'),
          story('oc4', 'Codex agent workflows in the terminal'),
          story('oc5', 'Regional Codex hackathon results'),
          story('rm1', 'Training reward models from preferences'),
          story('rm2', 'Outcome-only paths to reward models'),
          story('rm3', 'Open reward models for chat'),
          story('rm4', 'Evaluating reward models'),
          story('rm5', 'Process rewards vs reward models'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    for (const id of [
      'ai-regulation', 'artificial-analysis', 'humanoid-robots', 'transformers',
      'self-attention', 'openai-codex', 'reward-models',
    ]) {
      assert.ok(ids.includes(id), id);
    }
    assert.match(renderTag(rich, 'ai-regulation'), /What has SIREN scored about AI regulation\?/);
    assert.match(renderTag(rich, 'artificial-analysis'), /What has SIREN scored about Artificial Analysis\?/);
    assert.match(renderTag(rich, 'openai-codex'), /What has SIREN scored about OpenAI Codex\?/);
    assert.match(renderTag(rich, 'reward-models'), /What has SIREN scored about Reward models\?/);
    assert.doesNotMatch(renderTag(rich, 'ai-regulation'), /doom score:\s*\d/i);
  });

  it('pages reinforcement-learning, VLA, flow-matching, text-to-image, imitation-learning, locomotion', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('rl1', 'Reinforcement learning for long-horizon agents'),
          story('rl2', 'Offline RL for robot control'),
          story('rl3', 'Online RL scaling laws'),
          story('rl4', 'RL training for diffusion policies'),
          story('rl5', 'RL for tool-use agents'),
          story('vl1', 'Vision-language-action inference acceleration'),
          story('vl2', 'World Action Models vs VLAs'),
          story('vl3', 'Training VLAs for manipulation'),
          story('vl4', 'Open VLA checkpoint release'),
          story('vl5', 'Evaluating vision-language-action models'),
          story('fm1', 'Flow matching on anisotropic graphs'),
          story('fm2', 'Conditional flow matching for weather'),
          story('fm3', 'Few-step generation with flow matching'),
          story('fm4', 'Flow matching for 3D microstructures'),
          story('fm5', 'Survey of flow matching methods'),
          story('ti1', 'Text-to-image consistency evaluation'),
          story('ti2', 'Post-training text-to-image models'),
          story('ti3', 'Open text-to-image leaderboard'),
          story('ti4', 'Safety filters for text-to-image'),
          story('ti5', 'Distilling text-to-image models'),
          story('il1', 'Imitation learning for robot policies'),
          story('il2', 'Multimodal imitation learning'),
          story('il3', 'Scaling imitation learning datasets'),
          story('il4', 'Imitation learning from video'),
          story('il5', 'Offline imitation learning baselines'),
          story('lo1', 'Legged locomotion with RL'),
          story('lo2', 'Humanoid locomotion from video'),
          story('lo3', 'Multi-agent locomotion control'),
          story('lo4', 'Sim-to-real locomotion transfer'),
          story('lo5', 'Energy-efficient robot locomotion'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    for (const id of [
      'reinforcement-learning', 'vision-language-action', 'flow-matching',
      'text-to-image', 'imitation-learning', 'locomotion',
    ]) {
      assert.ok(ids.includes(id), id);
    }
    assert.match(renderTag(rich, 'reinforcement-learning'), /What has SIREN scored about Reinforcement learning\?/);
    assert.match(renderTag(rich, 'vision-language-action'), /What has SIREN scored about Vision-language-action\?/);
    assert.match(renderTag(rich, 'flow-matching'), /What has SIREN scored about Flow matching\?/);
    assert.match(renderTag(rich, 'text-to-image'), /What has SIREN scored about Text-to-image\?/);
    assert.doesNotMatch(renderTag(rich, 'reinforcement-learning'), /doom score:\s*\d/i);
  });

  it('pages self-supervised, latent-space, autoencoders, diffusion-transformer, scaling-laws', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('ss1', 'Self-supervised part concepts for vision models'),
          story('ss2', 'Self-supervised pretraining for audio'),
          story('ss3', 'Contrastive self-supervised learning survey'),
          story('ss4', 'Self-supervised objectives for robotics'),
          story('ss5', 'Scaling self-supervised learning'),
          story('ls1', 'Judging in latent space for reward models'),
          story('ls2', 'Navigating latent space of diffusion models'),
          story('ls3', 'Latent space editing for images'),
          story('ls4', 'Geometry of latent space representations'),
          story('ls5', 'Compressing latent space for video'),
          story('ae1', 'Kernel-based autoencoders for embeddings'),
          story('ae2', 'Variational autoencoders for audio decoders'),
          story('ae3', 'Sparse autoencoders for interpretability'),
          story('ae4', 'Convolutional autoencoders survey'),
          story('ae5', 'Training stable autoencoders'),
          story('dt1', 'Pixel diffusion transformers guide'),
          story('dt2', 'Sparse attention in diffusion transformers'),
          story('dt3', 'Efficient diffusion transformers'),
          story('dt4', 'Open diffusion transformer checkpoints'),
          story('dt5', 'Scaling diffusion transformers'),
          story('sl1', 'Scaling laws for looped mixture of experts'),
          story('sl2', 'When data mixtures improve scaling laws'),
          story('sl3', 'Scaling laws for AI-generated web text'),
          story('sl4', 'Compute-optimal scaling laws revisit'),
          story('sl5', 'Scaling laws for multimodal models'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    for (const id of [
      'self-supervised', 'latent-space', 'autoencoders',
      'diffusion-transformer', 'scaling-laws',
    ]) {
      assert.ok(ids.includes(id), id);
    }
    assert.match(renderTag(rich, 'self-supervised'), /What has SIREN scored about Self-supervised learning\?/);
    assert.match(renderTag(rich, 'latent-space'), /What has SIREN scored about Latent space\?/);
    assert.match(renderTag(rich, 'autoencoders'), /What has SIREN scored about Autoencoders\?/);
    assert.match(renderTag(rich, 'diffusion-transformer'), /What has SIREN scored about Diffusion transformers\?/);
    assert.match(renderTag(rich, 'scaling-laws'), /What has SIREN scored about Scaling laws\?/);
    assert.doesNotMatch(renderTag(rich, 'scaling-laws'), /doom score:\s*\d/i);
  });

  it('pages AI assistants, code-generation, linear-attention, SSM, AI factories, multimodal reasoning', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('aa1', 'Enterprise AI assistants reach production desks'),
          story('aa2', 'AI assistants for customer support roll out'),
          story('aa3', 'Voice AI assistants expand in healthcare'),
          story('aa4', 'On-device AI assistants ship on phones'),
          story('aa5', 'Open-source AI assistants gain traction'),
          story('cg1', 'Code generation models for enterprise IDEs'),
          story('cg2', 'Benchmarking code generation quality'),
          story('cg3', 'Secure code generation pipelines'),
          story('cg4', 'Multilingual code generation survey'),
          story('cg5', 'Code generators for legacy migration'),
          story('la1', 'Linear attention for long sequences'),
          story('la2', 'Efficient linear attention kernels'),
          story('la3', 'Linear attention vs softmax attention'),
          story('la4', 'Scaling linear attention transformers'),
          story('la5', 'Hardware-aware linear attention'),
          story('ssm1', 'Selective state space models for audio'),
          story('ssm2', 'State space models for long context'),
          story('ssm3', 'Hybrid transformers with SSMs'),
          story('ssm4', 'Training stable state-space models'),
          story('ssm5', 'Vision backbones with state space models'),
          story('af1', 'NVIDIA opens architecture for AI factories'),
          story('af2', 'Modular data centers for AI factories'),
          story('af3', 'Optics interconnects for AI factories'),
          story('af4', 'Power planning for AI factories'),
          story('af5', 'Regional alliances to build AI factories'),
          story('mr1', 'Multimodal reasoning benchmarks for VLMs'),
          story('mr2', 'Token-level multimodal reasoning rewards'),
          story('mr3', 'Scaffolding multimodal reasoning representations'),
          story('mr4', 'Physical multimodal reasoning tests'),
          story('mr5', 'Antibody discovery via multimodal reasoning'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    for (const id of [
      'ai-assistants', 'code-generation', 'linear-attention',
      'state-space-models', 'ai-factories', 'multimodal-reasoning',
    ]) {
      assert.ok(ids.includes(id), id);
    }
    assert.match(renderTag(rich, 'ai-assistants'), /What has SIREN scored about AI assistants\?/);
    assert.match(renderTag(rich, 'code-generation'), /What has SIREN scored about Code generation\?/);
    assert.match(renderTag(rich, 'linear-attention'), /What has SIREN scored about Linear attention\?/);
    assert.match(renderTag(rich, 'state-space-models'), /What has SIREN scored about State-space models\?/);
    assert.match(renderTag(rich, 'ai-factories'), /What has SIREN scored about AI factories\?/);
    assert.match(renderTag(rich, 'multimodal-reasoning'), /What has SIREN scored about Multimodal reasoning\?/);
    assert.doesNotMatch(renderTag(rich, 'ai-factories'), /doom score:\s*\d/i);
  });

  it('pages model-pruning, PEFT, test-time-training, Gaussian splatting, domain-adaptation', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('mp1', 'Structured pruning for transformer blocks'),
          story('mp2', 'Semi-structured LLM pruning survey'),
          story('mp3', 'Weight pruning with fault tolerance'),
          story('mp4', 'Model pruning for on-device inference'),
          story('mp5', 'Unstructured pruning recovery tricks'),
          story('pf1', 'PEFT recipes for domain specialists'),
          story('pf2', 'Parameter-efficient methods for medical LLMs'),
          story('pf3', 'Comparing PEFT adapters at the edge'),
          story('pf4', 'Parameter-efficient fine-tuning at scale'),
          story('pf5', 'PEFT for continual adaptation'),
          story('tt1', 'Test-time training for long-horizon agents'),
          story('tt2', 'Self-generated feedback in test-time training'),
          story('tt3', 'Online test-time training via self-distillation'),
          story('tt4', 'Test-time training of latent world models'),
          story('tt5', 'Personalized reward modeling with test-time training'),
          story('gs1', 'Mobile Gaussian splatting for real-time 3D'),
          story('gs2', 'Reliability-aware Gaussian splatting from handheld video'),
          story('gs3', 'Gaussian splatting for irregular turntable capture'),
          story('gs4', 'Scaling density functional theory with Gaussian splatting'),
          story('gs5', '3D cinemagraphs via Gaussian splatting'),
          story('da1', 'RL-only domain adaptation from base models'),
          story('da2', 'Domain adaptation for long legal documents'),
          story('da3', 'Tuning-free domain adaptation for classification'),
          story('da4', 'Retrieval-based domain adaptation framework'),
          story('da5', 'Parameter-space mitigation after domain adaptation'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    for (const id of [
      'model-pruning', 'peft', 'test-time-training',
      'gaussian-splatting', 'domain-adaptation',
    ]) {
      assert.ok(ids.includes(id), id);
    }
    assert.match(renderTag(rich, 'model-pruning'), /What has SIREN scored about Model pruning\?/);
    assert.match(renderTag(rich, 'peft'), /What has SIREN scored about PEFT\?/);
    assert.match(renderTag(rich, 'test-time-training'), /What has SIREN scored about Test-time training\?/);
    assert.match(renderTag(rich, 'gaussian-splatting'), /What has SIREN scored about Gaussian splatting\?/);
    assert.match(renderTag(rich, 'domain-adaptation'), /What has SIREN scored about Domain adaptation\?/);
    assert.doesNotMatch(renderTag(rich, 'model-pruning'), /doom score:\s*\d/i);
  });

  it('pages LLM agents, on-policy distillation, time-series, self-distillation, video world models, unlearning', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('la1', 'LLM agents for enterprise workflows'),
          story('la2', 'Benchmarking LLM agents on tool use'),
          story('la3', 'Secure LLM agents in production'),
          story('la4', 'Multi-step LLM agents survey'),
          story('la5', 'Open-source LLM agents stack'),
          story('op1', 'On-policy distillation for reasoning models'),
          story('op2', 'Scaling on-policy distillation'),
          story('op3', 'On-policy distillation vs off-policy'),
          story('op4', 'Efficient on-policy distillation recipes'),
          story('op5', 'On-policy distillation for coding models'),
          story('ts1', 'Time-series foundation models'),
          story('ts2', 'Multivariate time series forecasting with transformers'),
          story('ts3', 'Time-series benchmarks for LLMs'),
          story('ts4', 'Zero-shot time series prediction'),
          story('ts5', 'Industrial time-series models'),
          story('sd1', 'Self-distillation for compact models'),
          story('sd2', 'Online self-distillation loops'),
          story('sd3', 'Self-distillation in vision transformers'),
          story('sd4', 'Iterative self-distillation survey'),
          story('sd5', 'Self-distillation for speech models'),
          story('vw1', 'Video world models for planning'),
          story('vw2', 'Training video world models at scale'),
          story('vw3', 'Open video world models release'),
          story('vw4', 'Evaluating video world models'),
          story('vw5', 'Latent video world models'),
          story('mu1', 'Machine unlearning for LLMs'),
          story('mu2', 'Continual machine unlearning methods'),
          story('mu3', 'Evaluating machine unlearning fidelity'),
          story('mu4', 'Approximate unlearning for multimodal models'),
          story('mu5', 'Certified machine unlearning bounds'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    for (const id of [
      'llm-agents', 'on-policy-distillation', 'time-series',
      'self-distillation', 'video-world-models', 'machine-unlearning',
    ]) {
      assert.ok(ids.includes(id), id);
    }
    assert.match(renderTag(rich, 'llm-agents'), /What has SIREN scored about LLM agents\?/);
    assert.match(renderTag(rich, 'on-policy-distillation'), /What has SIREN scored about On-policy distillation\?/);
    assert.match(renderTag(rich, 'time-series'), /What has SIREN scored about Time series\?/);
    assert.match(renderTag(rich, 'self-distillation'), /What has SIREN scored about Self-distillation\?/);
    assert.match(renderTag(rich, 'video-world-models'), /What has SIREN scored about Video world models\?/);
    assert.match(renderTag(rich, 'machine-unlearning'), /What has SIREN scored about Machine unlearning\?/);
    assert.doesNotMatch(renderTag(rich, 'llm-agents'), /doom score:\s*\d/i);
  });

  it('pages neural-networks, self-improving AI, provenance, sparse-attention, SynthID, dexterous manipulation', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('nn1', 'Topological expressivity of neural networks'),
          story('nn2', 'Neural networks for scientific discovery'),
          story('nn3', 'Efficient neural networks on edge devices'),
          story('nn4', 'Theory of deep neural networks'),
          story('nn5', 'Spiking neural networks survey'),
          story('si1', 'Self-improving model for solving and judging'),
          story('si2', 'Recursively self-improving AI agents'),
          story('si3', 'Self-improving GUI agents via harness evolution'),
          story('si4', 'Self-improving agents from hindsight distillation'),
          story('si5', 'Self-improving alignment generalization'),
          story('pr1', 'Provenance for LLM agent outputs'),
          story('pr2', 'Synthetic-data provenance attribution limits'),
          story('pr3', 'Watermarking and provenance for AI content'),
          story('pr4', 'Content provenance standards roll out'),
          story('pr5', 'Measuring provenance in long-form writing'),
          story('sa1', 'Sparse attention for diffusion transformers'),
          story('sa2', 'Dynamic sparse attention for video-audio models'),
          story('sa3', 'Sparse-first inference with sparse attention'),
          story('sa4', 'Closing the dense-sparse attention gap'),
          story('sa5', 'Training with sparse attention at 2K resolution'),
          story('sy1', 'Google rolls out improved SynthID detector'),
          story('sy2', 'How to use Google SynthID to check AI content'),
          story('sy3', 'SynthID Detector website for AI-generated media'),
          story('sy4', 'SynthID Bio watermarks for designed proteins'),
          story('sy5', 'SynthID upgrades for global availability'),
          story('dx1', 'Learning dexterous manipulation from one demo'),
          story('dx2', 'Dexterous robotic manipulation with world action models'),
          story('dx3', 'Trajectory-guided dexterous manipulation'),
          story('dx4', 'Dexterous policies for multi-object reset'),
          story('dx5', 'Tactile sensing for dexterous hands'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    for (const id of [
      'neural-networks', 'self-improving-ai', 'provenance',
      'sparse-attention', 'synthid', 'dexterous-manipulation',
    ]) {
      assert.ok(ids.includes(id), id);
    }
    assert.match(renderTag(rich, 'neural-networks'), /What has SIREN scored about Neural networks\?/);
    assert.match(renderTag(rich, 'self-improving-ai'), /What has SIREN scored about Self-improving AI\?/);
    assert.match(renderTag(rich, 'provenance'), /What has SIREN scored about AI provenance\?/);
    assert.match(renderTag(rich, 'sparse-attention'), /What has SIREN scored about Sparse attention\?/);
    assert.match(renderTag(rich, 'synthid'), /What has SIREN scored about SynthID\?/);
    assert.match(renderTag(rich, 'dexterous-manipulation'), /What has SIREN scored about Dexterous manipulation\?/);
    assert.doesNotMatch(renderTag(rich, 'self-improving-ai'), /doom score:\s*\d/i);
  });

  it('pages protein-design and drug-discovery hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('pd1', 'Natural-language protein design for binders'),
          story('pd2', 'Protein folding models for binders'),
          story('pd3', 'Watermarking AI protein design outputs'),
          story('pd4', 'Sample complexity for protein design'),
          story('pd5', 'Fast protein folding model training'),
          story('dd1', 'AI drug discovery startup spun out of DeepMind'),
          story('dd2', 'Virtual cell efforts for drug discovery'),
          story('dd3', 'Labs invest in AI drug discovery'),
          story('dd4', 'Benchmarking drug discovery models'),
          story('dd5', 'Open datasets for drug discovery'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('protein-design'));
    assert.ok(ids.includes('drug-discovery'));
    assert.match(renderTag(rich, 'protein-design'), /What has SIREN scored about Protein design\?/);
    assert.match(renderTag(rich, 'drug-discovery'), /What has SIREN scored about Drug discovery\?/);
    assert.doesNotMatch(renderTag(rich, 'protein-design'), /doom score:\s*\d/i);
  });
});
