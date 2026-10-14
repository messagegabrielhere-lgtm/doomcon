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

  it('pages agent-skills and neoclouds hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('as1', 'Skill Constellations: Tracing the Supply Chain of Agent Skills on GitHub'),
          story('as2', 'Mining Agent Skills from Production Traces'),
          story('as3', 'Show HN: Skills Hub for managing AI agent skills'),
          story('as4', 'Claude Skills marketplace expands for coding agents'),
          story('as5', 'Report: Progressive Disclosure of Agent Skills'),
          story('nc1', 'Nvidia GPUs fuel AI boom with over 300 neoclouds renting chips'),
          story('nc2', 'Nvidia-backed neocloud Lambda is raising up to $4B'),
          story('nc3', 'How do the AI Labs and neoclouds impact Cloud'),
          story('nc4', 'Neocloud GPU rental margins under pressure'),
          story('nc5', 'Which neoclouds host the newest Blackwell clusters'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('agent-skills'));
    assert.ok(ids.includes('neoclouds'));
    assert.match(renderTag(rich, 'agent-skills'), /What has SIREN scored about Agent skills\?/);
    assert.match(renderTag(rich, 'neoclouds'), /What has SIREN scored about Neoclouds\?/);
    assert.doesNotMatch(renderTag(rich, 'agent-skills'), /doom score:\s*\d/i);
  });

  it('pages ai-slop and gulf-ai hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('sl1', 'AI slop is gumming up business'),
          story('sl2', 'Pope Leo comes out swinging against AI slop'),
          story('sl3', 'arXiv Is Rate Limiting Submissions Because Of AI Slop'),
          story('sl4', 'Google freezes bug bounty amid flood of invalid AI slop'),
          story('sl5', 'Academic publishing is a study in fighting AI slop'),
          story('gf1', 'SoftBank seeks $100B from Gulf investors to expand AI bet'),
          story('gf2', 'SoftBank Wants up to $100 Billion From Gulf Investors for AI'),
          story('gf3', 'Masayoshi Son seeks $100B Gulf backing for AI robotics upgrades'),
          story('gf4', "SoftBank's $100 Billion Gulf Gambit Meets a Cooling OpenAI Narrative"),
          story('gf5', 'Sources: SoftBank is seeking to raise up to $100B from Gulf investors for a fund'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('ai-slop'));
    assert.ok(ids.includes('gulf-ai'));
    assert.match(renderTag(rich, 'ai-slop'), /What has SIREN scored about AI slop\?/);
    assert.match(renderTag(rich, 'gulf-ai'), /What has SIREN scored about Gulf AI investment\?/);
    assert.match(renderTag(rich, 'gulf-ai'), /not financial advice/i);
    assert.doesNotMatch(renderTag(rich, 'ai-slop'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'gulf-ai'), /doom score:\s*\d/i);
  });

  it('pages agentic-ai, ai-security, and ai-factories hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('aa1', 'Enterprises race to ship agentic AI workflows'),
          story('aa2', 'What agentic AI means for customer support'),
          story('aa3', 'Banks trial agentic AI for back-office work'),
          story('aa4', 'Open-source agentic AI stacks mature'),
          story('aa5', 'Regulators ask how agentic AI is supervised'),
          story('as1', 'AI security startups raise a new round'),
          story('as2', 'CISOs put AI security on the board agenda'),
          story('as3', 'Red teams publish an AI security checklist'),
          story('as4', 'Cloud vendors bundle AI security controls'),
          story('as5', 'Researchers map AI security failure modes'),
          story('af1', 'NVIDIA Opens Vera Rubin Architecture to Help Scale AI Factories'),
          story('af2', 'NVIDIA and Cisco intro pluggable optics for AI factories'),
          story('af3', 'Flex Expands Modular Data Center Portfolio for AI Factory Deployment'),
          story('af4', 'DG Matrix Unveils Interport OS for AI Factories Based on NVIDIA MGX'),
          story('af5', 'Amid Ecosystem Adoption, vendors help scale AI factories worldwide'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('agentic-ai'));
    assert.ok(ids.includes('ai-security'));
    assert.ok(ids.includes('ai-factories'));
    assert.match(renderTag(rich, 'agentic-ai'), /What has SIREN scored about Agentic AI\?/);
    assert.match(renderTag(rich, 'ai-security'), /What has SIREN scored about AI security\?/);
    assert.match(renderTag(rich, 'ai-factories'), /What has SIREN scored about AI factories\?/);
    assert.match(renderTag(rich, 'agentic-ai'), /not a capability forecast/i);
    assert.match(renderTag(rich, 'ai-security'), /not a harm forecast/i);
    assert.match(renderTag(rich, 'ai-factories'), /not a capacity forecast/i);
    assert.doesNotMatch(renderTag(rich, 'agentic-ai'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'ai-security'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'ai-factories'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'ai-security'), /probability of doom/i);
  });

  it('pages amazon-bedrock and claude-opus hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('ab1', 'Accessing OpenAI GPT models on Amazon Bedrock'),
          story('ab2', 'AWS Bedrock adds a new foundation model'),
          story('ab3', 'Enterprises wire agents through Amazon Bedrock'),
          story('ab4', 'Bedrock Guardrails expand for regulated workloads'),
          story('ab5', 'How teams price tokens on Amazon Bedrock'),
          story('co1', 'Claude Opus leads a public coding leaderboard'),
          story('co2', 'Anthropic ships a Claude Opus update'),
          story('co3', 'Agents burn tokens on Claude Opus for tiny gains'),
          story('co4', 'Claude Opus pricing compared with other frontier models'),
          story('co5', 'Developers debate when to call Claude Opus'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('amazon-bedrock'));
    assert.ok(ids.includes('claude-opus'));
    assert.match(renderTag(rich, 'amazon-bedrock'), /What has SIREN scored about Amazon Bedrock\?/);
    assert.match(renderTag(rich, 'claude-opus'), /What has SIREN scored about Claude Opus\?/);
    assert.match(renderTag(rich, 'amazon-bedrock'), /not a vendor ranking/i);
    assert.match(renderTag(rich, 'claude-opus'), /not a capability ranking/i);
    assert.doesNotMatch(renderTag(rich, 'amazon-bedrock'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'claude-opus'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'claude-opus'), /probability of doom/i);
  });

  it('pages claude-haiku and intelligent-ui hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('ch1', 'Claude Haiku 5.5 is out and cheaper'),
          story('ch2', 'Introducing Claude Haiku 5.5 on AWS'),
          story('ch3', 'Anthropic Launches Claude Haiku 5.5: Faster, Lower-Cost AI'),
          story('ch4', 'Claude Haiku Expands Anthropic’s AI Model Lineup'),
          story('ch5', 'Developers try Claude Haiku for high-volume tasks'),
          story('iu1', 'GPT-6 and Intelligent UI for everyone'),
          story('iu2', 'OpenAI rolls out GPT-6 Luna with Intelligent UI to free ChatGPT users'),
          story('iu3', 'ChatGPT’s Intelligent UI update fills responses with charts and buttons'),
          story('iu4', 'OpenAI says Intelligent UI is rolling out in ChatGPT'),
          story('iu5', 'What Intelligent UI means for ChatGPT answers'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('claude-haiku'));
    assert.ok(ids.includes('intelligent-ui'));
    assert.match(renderTag(rich, 'claude-haiku'), /What has SIREN scored about Claude Haiku\?/);
    assert.match(renderTag(rich, 'intelligent-ui'), /What has SIREN scored about Intelligent UI\?/);
    assert.match(renderTag(rich, 'claude-haiku'), /not a capability ranking/i);
    assert.match(renderTag(rich, 'intelligent-ui'), /not a product score/i);
    assert.doesNotMatch(renderTag(rich, 'claude-haiku'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'intelligent-ui'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'intelligent-ui'), /probability of doom/i);
  });

  it('pages gpt-6 and emergency-brake hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('g1', 'OpenAI cancels October release of GPT-6.1 Astra after tests'),
          story('g2', 'OpenAI’s GPT-6 may lead to robotics breakthrough'),
          story('g3', 'Asana cuts model costs with GPT-6.1 Sol'),
          story('g4', 'Claude Haiku 5.5 — better than GPT-6 Luna at the same pricing'),
          story('g5', 'Accessing OpenAI GPT-6 models on Amazon Bedrock'),
          story('eb1', "Microsoft CEO Nadella Calls for 'Emergency Brake' on Advanced AI"),
          story('eb2', 'Microsoft’s Satya Nadella says AI models need an emergency brake'),
          story('eb3', "Nadella says AI needs an 'emergency brake' that humans control"),
          story('eb4', 'Why does Satya Nadella want an AI emergency brake?'),
          story('eb5', 'Emergency brake: Microsoft CEO says powerful AI must be treated carefully'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('gpt-6'));
    assert.ok(ids.includes('emergency-brake'));
    assert.match(renderTag(rich, 'gpt-6'), /What has SIREN scored about GPT-6\?/);
    assert.match(renderTag(rich, 'emergency-brake'), /What has SIREN scored about AI emergency brake\?/);
    assert.match(renderTag(rich, 'gpt-6'), /not a capability ranking/i);
    assert.match(renderTag(rich, 'emergency-brake'), /not a containment forecast/i);
    assert.doesNotMatch(renderTag(rich, 'gpt-6'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'emergency-brake'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'emergency-brake'), /probability of doom/i);
  });

  it('pages big-tech and gpt-6-astra hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('bt1', 'How Big Tech’s AI Race Fueled a Borrowing Boom'),
          story('bt2', 'Why Big Tech Is Borrowing Billions to Fund AI Spending'),
          story('bt3', 'Senate probe accuses Big Tech of misleading public on AI data centers'),
          story('bt4', 'Big Tech sets out its pitches on AI agents'),
          story('bt5', 'PC AI race intensifies as Big Tech joins on-device push'),
          story('ga1', 'OpenAI cancels October release of GPT-6.1 Astra after tests'),
          story('ga2', 'ChatSlide Puts GPT-6 Astra Behind Its Slide Generator'),
          story('ga3', 'How NVIDIA GPUs Help Accelerate OpenAI’s GPT-6 Astra Ultrafast'),
          story('ga4', 'OpenAI launches Dots, always-on agents powered by GPT-6 Astra'),
          story('ga5', 'OpenAI scraps plans to publicly launch GPT-6.1 Astra'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('big-tech'));
    assert.ok(ids.includes('gpt-6-astra'));
    assert.match(renderTag(rich, 'big-tech'), /What has SIREN scored about Big Tech AI\?/);
    assert.match(renderTag(rich, 'gpt-6-astra'), /What has SIREN scored about GPT-6 Astra\?/);
    assert.match(renderTag(rich, 'big-tech'), /not a vendor ranking/i);
    assert.match(renderTag(rich, 'gpt-6-astra'), /not a capability ranking/i);
    assert.doesNotMatch(renderTag(rich, 'big-tech'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'gpt-6-astra'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'gpt-6-astra'), /probability of doom/i);
  });

  it('pages gemini-4 and ai-waiver hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('g41', 'Google Evaluates Gemini 4 Carbon As It Seeks To Close AI Coding Gap'),
          story('g42', 'Gemini 4 Argon: our next era of frontier intelligence'),
          story('g43', 'Google Tests Carbon, Gemini 4 Model for Advanced Programming'),
          story('g44', 'Google announces Gemini 4 Argon AI model, but you cannot use it yet'),
          story('g45', 'Gemini 4 Argon has a 1M-token output limit'),
          story('aw1', 'Nicolas Cage refused Amazon’s AI waiver and may not work with it again'),
          story('aw2', 'Nicolas Cage Refuses AI Waiver on Spider-Noir and Vows to Cut Ties With Amazon'),
          story('aw3', 'Nicolas Cage refused an AI waiver on Spider-Noir and expects to lose Amazon over it'),
          story('aw4', 'Actors push back as studios demand a broad AI waiver'),
          story('aw5', 'What an AI waiver means for likeness rights in film contracts'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('gemini-4'));
    assert.ok(ids.includes('ai-waiver'));
    assert.match(renderTag(rich, 'gemini-4'), /What has SIREN scored about Gemini 4\?/);
    assert.match(renderTag(rich, 'ai-waiver'), /What has SIREN scored about AI waiver\?/);
    assert.match(renderTag(rich, 'gemini-4'), /not a capability ranking/i);
    assert.match(renderTag(rich, 'ai-waiver'), /not a legal forecast/i);
    assert.doesNotMatch(renderTag(rich, 'gemini-4'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'ai-waiver'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'ai-waiver'), /probability of doom/i);
  });

  it('pages openai-agents and ai-bubble hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('oa1', 'Wikipedia finds rogue OpenAI agents made edits, hit APIs'),
          story('oa2', 'OpenAI agents: Wikimedia reports edits and traffic'),
          story('oa3', '~700 openai agents chased a grader that did not exist'),
          story('oa4', 'OpenAI agents break into Hugging Face during eval chaos'),
          story('oa5', 'How OpenAI agents showed up in Wikimedia logs'),
          story('ab1', 'AI Bubble Ready to Burst? Investor Raises Alarm Over Anthropic Valuation'),
          story('ab2', 'Billionaire Ray Dalio Said The AI Bubble Is Close To Popping'),
          story('ab3', 'AI bubble? Nvidia is now bigger than Japan, but valuation looks modest'),
          story('ab4', 'Markets debate whether the AI bubble has further to run'),
          story('ab5', 'What counts as an AI bubble in public markets this quarter'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('openai-agents'));
    assert.ok(ids.includes('ai-bubble'));
    assert.match(renderTag(rich, 'openai-agents'), /What has SIREN scored about OpenAI agents\?/);
    assert.match(renderTag(rich, 'ai-bubble'), /What has SIREN scored about AI bubble\?/);
    assert.match(renderTag(rich, 'openai-agents'), /not an autonomy forecast/i);
    assert.match(renderTag(rich, 'ai-bubble'), /not a crash forecast/i);
    assert.doesNotMatch(renderTag(rich, 'openai-agents'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'ai-bubble'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'ai-bubble'), /probability of doom/i);
  });

  it('pages openai-revenue and recursive-self-improvement hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('or1', 'OpenAI Revenue and Valuation Statistics (October 2026)'),
          story('or2', 'OpenAI revenue shock drags Korea stocks lower as foreigners sell'),
          story('or3', 'OpenAI Revenue Run Rate $20bn Less Than Previous Indications'),
          story('or4', 'Markets digest the latest OpenAI revenue print'),
          story('or5', 'What OpenAI revenue figures mean for AI infrastructure spend'),
          story('rsi1', 'RSI-Anything: Unlocking Recursive Self-Improvement with World Models'),
          story('rsi2', 'When AI Builds AI: 2026 Breakthroughs in Recursive Self-Improvement Technology'),
          story('rsi3', 'Memento 3: Model-Based Recursive Self-Improvement through Reflective Rulebooks'),
          story('rsi4', 'A survey of recursive self-improvement research this year'),
          story('rsi5', 'Labs publish papers on recursive self improvement loops'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('openai-revenue'));
    assert.ok(ids.includes('recursive-self-improvement'));
    assert.match(renderTag(rich, 'openai-revenue'), /What has SIREN scored about OpenAI revenue\?/);
    assert.match(renderTag(rich, 'recursive-self-improvement'), /What has SIREN scored about Recursive self-improvement\?/);
    assert.match(renderTag(rich, 'openai-revenue'), /not a valuation forecast/i);
    assert.match(renderTag(rich, 'recursive-self-improvement'), /not an autonomy forecast/i);
    assert.doesNotMatch(renderTag(rich, 'openai-revenue'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'recursive-self-improvement'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'recursive-self-improvement'), /probability of doom/i);
  });

  it('pages ai-boom and deep-learning hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('abm1', 'OpenAI to create extra 200 Irish jobs as AI boom accelerates in Ireland'),
          story('abm2', 'How the AI boom is reshaping data-centre financing'),
          story('abm3', 'Investors debate whether the AI boom has further room'),
          story('abm4', 'Regional hiring picks up in the AI boom'),
          story('abm5', 'What the AI boom means for cloud capacity this quarter'),
          story('dl1', 'Retrieval-Centric Deep Learning in Growing Nonparametric Neural Networks'),
          story('dl2', 'A survey of deep learning methods for robotic control'),
          story('dl3', 'Deep learning models cut inference cost in production'),
          story('dl4', 'Why deep learning still dominates industrial vision pipelines'),
          story('dl5', 'Labs publish deep learning benchmarks for science tasks'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('ai-boom'));
    assert.ok(ids.includes('deep-learning'));
    assert.match(renderTag(rich, 'ai-boom'), /What has SIREN scored about AI boom\?/);
    assert.match(renderTag(rich, 'deep-learning'), /What has SIREN scored about Deep learning\?/);
    assert.match(renderTag(rich, 'ai-boom'), /not a growth forecast/i);
    assert.match(renderTag(rich, 'deep-learning'), /not a capability ranking/i);
    assert.doesNotMatch(renderTag(rich, 'ai-boom'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'deep-learning'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'deep-learning'), /probability of doom/i);
  });

  it('pages ai-spending and ai-training hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('as1', 'Tencent Said to Plan $5 Billion Bond Sale to Fund AI Spending'),
          story('as2', 'Amazon Wants Investors to Finance $8 Billion of Nvidia Chips. Is AI Spending Getting Hot?'),
          story('as3', 'How Investors Are Reacting To Amazon.com AI Spending Surge'),
          story('as4', 'Cloud providers disclose another wave of AI spending'),
          story('as5', 'What AI spending figures show about infra demand this quarter'),
          story('at1', 'Teamland Brings Claude AI Workshops to Boston, Orlando and Online, Expands Corporate AI Training'),
          story('at2', 'Enterprises expand AI training budgets for software teams'),
          story('at3', 'Universities add AI training tracks for working engineers'),
          story('at4', 'Vendors package AI training with cloud credits'),
          story('at5', 'How AI training programs show up in hiring pipelines'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('ai-spending'));
    assert.ok(ids.includes('ai-training'));
    assert.match(renderTag(rich, 'ai-spending'), /What has SIREN scored about AI spending\?/);
    assert.match(renderTag(rich, 'ai-training'), /What has SIREN scored about AI training\?/);
    assert.match(renderTag(rich, 'ai-spending'), /not a capital forecast/i);
    assert.match(renderTag(rich, 'ai-training'), /not a skills forecast/i);
    assert.doesNotMatch(renderTag(rich, 'ai-spending'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'ai-training'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'ai-training'), /probability of doom/i);
  });

  it('pages rogue-ai and ai-incidents hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('ra1', 'There ought to be a law against rogue AI, but there isn’t. Why?'),
          story('ra2', 'Anthropic Reveals Rogue AI Sent False Police Tip'),
          story('ra3', 'Microsoft CEO Calls for Safeguards Against Rogue AI'),
          story('ra4', 'Rogue AI Watch — October 11, 2026'),
          story('ra5', 'Rogue AI targeted US government websites'),
          story('ai1', 'Anthropic discloses fake tip to police among new rogue AI incidents'),
          story('ai2', 'Regulators catalog AI incidents reported this quarter'),
          story('ai3', 'How labs disclose AI incidents without a shared standard'),
          story('ai4', 'Newsroom coverage of AI incidents rises after agent misuse reports'),
          story('ai5', 'What counts as an AI incident in public disclosures'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('rogue-ai'));
    assert.ok(ids.includes('ai-incidents'));
    assert.match(renderTag(rich, 'rogue-ai'), /What has SIREN scored about Rogue AI\?/);
    assert.match(renderTag(rich, 'ai-incidents'), /What has SIREN scored about AI incidents\?/);
    assert.match(renderTag(rich, 'rogue-ai'), /not a harm forecast/i);
    assert.match(renderTag(rich, 'ai-incidents'), /not a threat forecast/i);
    assert.doesNotMatch(renderTag(rich, 'rogue-ai'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'ai-incidents'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'ai-incidents'), /probability of doom/i);
  });

  it('pages ai-computing and ai-demand hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('ac1', 'The AI Computing Crunch Is Making Rivals Into Partners'),
          story('ac2', 'The AI Computing Power Gold Rush - Tech News Briefing'),
          story('ac3', 'Why AI computing capacity deals keep landing in the newsroom'),
          story('ac4', 'Cloud rivals partner through the AI computing crunch'),
          story('ac5', 'What AI computing headlines say about infra spend this quarter'),
          story('ad1', 'An Interview with Microsoft’s Scott Guthrie on Azure’s New AI Chip, Insatiable AI Demand'),
          story('ad2', 'Does Advanced Micro Devices Face New AI Demand Risk After A Customer Reset?'),
          story('ad3', 'Chipmakers debate whether AI demand can stay elevated'),
          story('ad4', 'Cloud earnings calls keep circling AI demand'),
          story('ad5', 'How AI demand shows up in accelerator order books'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('ai-computing'));
    assert.ok(ids.includes('ai-demand'));
    assert.match(renderTag(rich, 'ai-computing'), /What has SIREN scored about AI computing\?/);
    assert.match(renderTag(rich, 'ai-demand'), /What has SIREN scored about AI demand\?/);
    assert.match(renderTag(rich, 'ai-computing'), /not an infra forecast/i);
    assert.match(renderTag(rich, 'ai-demand'), /not a market forecast/i);
    assert.doesNotMatch(renderTag(rich, 'ai-computing'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'ai-demand'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'ai-demand'), /probability of doom/i);
  });

  it('pages decision-models and representation-learning hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('dm1', 'Microsoft unveils Microsoft-Decision-1, a fast decision model'),
          story('dm2', 'Nace.AI Drex 1.5: 9B Decision Model Scores 58.08'),
          story('dm3', 'How decision models show up in enterprise scoring stacks'),
          story('dm4', 'Labs publish decision model benchmarks for routing tasks'),
          story('dm5', 'What decision models mean for cheap high-volume inference'),
          story('rl1', 'HRIL: Representation learning via higher-order tensor modeling'),
          story('rl2', 'DSReg advances representation learning without reconstruction'),
          story('rl3', 'A survey of representation learning for robotics'),
          story('rl4', 'Why representation learning still dominates self-supervised papers'),
          story('rl5', 'New representation learning results land in the newsroom window'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('decision-models'));
    assert.ok(ids.includes('representation-learning'));
    assert.match(renderTag(rich, 'decision-models'), /What has SIREN scored about Decision models\?/);
    assert.match(renderTag(rich, 'representation-learning'), /What has SIREN scored about Representation learning\?/);
    assert.match(renderTag(rich, 'decision-models'), /not a capability ranking/i);
    assert.match(renderTag(rich, 'representation-learning'), /not a capability ranking/i);
    assert.doesNotMatch(renderTag(rich, 'decision-models'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'representation-learning'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'representation-learning'), /probability of doom/i);
  });

  it('pages opus-5-5 and off-policy hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('o55a', 'Anthropic tests new model under Claude Opus 5.5'),
          story('o55b', 'Claude Opus 5.5 Tops Epoch AI Leaderboard'),
          story('o55c', 'Early Opus 5.5 evals land in the newsroom window'),
          story('o55d', 'What Claude Opus 5.5 changes for coding agents'),
          story('o55e', 'Labs compare Opus 5.5 against prior Claude Opus releases'),
          story('op1', 'ReSPO: Reshaped Sequence Policy Optimization for Gradient Starvation in Off-Policy Learning'),
          story('op2', 'Q-Learning with Scalar Adjoint Matching for off-policy control'),
          story('op3', 'A survey of off-policy methods for large models'),
          story('op4', 'Why off-policy learning still dominates RL papers this month'),
          story('op5', 'New off-policy results clear the archive gate'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('opus-5-5'));
    assert.ok(ids.includes('off-policy'));
    assert.match(renderTag(rich, 'opus-5-5'), /What has SIREN scored about Claude Opus 5\.5\?/);
    assert.match(renderTag(rich, 'off-policy'), /What has SIREN scored about Off-policy learning\?/);
    assert.match(renderTag(rich, 'opus-5-5'), /not a capability ranking/i);
    assert.match(renderTag(rich, 'off-policy'), /not a capability ranking/i);
    assert.doesNotMatch(renderTag(rich, 'opus-5-5'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'off-policy'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'off-policy'), /probability of doom/i);
  });

  it('pages internet-access and manipulation-tasks hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('ia1', 'Anthropic Halts Internet Access Amid AI Model Issues'),
          story('ia2', 'Anthropic cuts internet access in evaluations after Claude exploits websites'),
          story('ia3', 'Anthropic Pulls Live Internet Access for AI Testing After Agents Escape'),
          story('ia4', 'Anthropic Restricts Internet Access After Claude AI Models Bypass Safeguards'),
          story('ia5', 'Why Anthropic cut off internet access for its AI evaluations'),
          story('mt1', 'In-context Robot Learning Made Simple: A Democratized Recipe for Manipulation Tasks'),
          story('mt2', 'GPU-parallel simulation for heterogeneous manipulation tasks and multi-task RL'),
          story('mt3', 'Benchmarks expand coverage of manipulation tasks this quarter'),
          story('mt4', 'A survey of manipulation tasks for vision-language-action models'),
          story('mt5', 'Labs publish new manipulation task results in the archive window'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('internet-access'));
    assert.ok(ids.includes('manipulation-tasks'));
    assert.match(renderTag(rich, 'internet-access'), /What has SIREN scored about AI internet access\?/);
    assert.match(renderTag(rich, 'manipulation-tasks'), /What has SIREN scored about Manipulation tasks\?/);
    assert.match(renderTag(rich, 'internet-access'), /not a containment forecast/i);
    assert.match(renderTag(rich, 'manipulation-tasks'), /not a robotics forecast/i);
    assert.doesNotMatch(renderTag(rich, 'internet-access'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'manipulation-tasks'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'manipulation-tasks'), /probability of doom/i);
  });

  it('pages safety-concerns and chatgpt-teens hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('sc1', 'Google restricts access to new AI model over safety concerns'),
          story('sc2', 'US and China explore AI hot line amid safety concerns'),
          story('sc3', 'Trump’s hands-off AI policy raises new safety concerns'),
          story('sc4', 'Investors weigh lab disclosures amid safety concerns'),
          story('sc5', 'What safety concerns show up in this week’s scored stories'),
          story('ct1', 'Watchdog Says ChatGPT for Teens Missed Crisis Alerts; OpenAI Disputes Test'),
          story('ct2', 'ChatGPT for Teens — Is AI Safety for Youths Falling Short?'),
          story('ct3', 'OpenAI Says Teens Spend Under 15 Minutes A Day On ChatGPT Amid Safety Concerns'),
          story('ct4', 'Report: ChatGPT teen suicide safeguards failed to alert parents'),
          story('ct5', 'ChatGPT for Teens is live. Here’s how parents are reacting'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('safety-concerns'));
    assert.ok(ids.includes('chatgpt-teens'));
    assert.match(renderTag(rich, 'safety-concerns'), /What has SIREN scored about AI safety concerns\?/);
    assert.match(renderTag(rich, 'chatgpt-teens'), /What has SIREN scored about ChatGPT for teens\?/);
    assert.match(renderTag(rich, 'safety-concerns'), /not a harm forecast/i);
    assert.match(renderTag(rich, 'chatgpt-teens'), /not a harm forecast/i);
    assert.doesNotMatch(renderTag(rich, 'safety-concerns'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'chatgpt-teens'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'chatgpt-teens'), /probability of doom/i);
  });

  it('pages large-language-models and frontier-ai hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('llm1', 'Foundations of Large Language Models'),
          story('llm2', 'Large language models discover complementary heuristics for combinatorial optimization'),
          story('llm3', 'Characterizing the role of reasoning tokens in large language models as state over tokens'),
          story('llm4', 'Too agreeable to be accurate? Sycophancy of large language models in medical diagnosis'),
          story('llm5', 'Guiding large language models to predict edit sequences for molecular synthesizability'),
          story('fa1', 'White House restores UK access to frontier AI models after 17 day freeze'),
          story('fa2', 'South Korea sets $3.5B plan to build frontier AI model'),
          story('fa3', 'Yoshua Bengio: If you prioritize safety, leave frontier AI companies'),
          story('fa4', 'Frontier AI models outperform analysts on earnings prediction'),
          story('fa5', 'Towards safety cases for frontier AI training'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('large-language-models'));
    assert.ok(ids.includes('frontier-ai'));
    assert.match(renderTag(rich, 'large-language-models'), /What has SIREN scored about Large language models\?/);
    assert.match(renderTag(rich, 'frontier-ai'), /What has SIREN scored about Frontier AI\?/);
    assert.match(renderTag(rich, 'large-language-models'), /not a capability ranking/i);
    assert.match(renderTag(rich, 'frontier-ai'), /not a capability ranking/i);
    assert.doesNotMatch(renderTag(rich, 'large-language-models'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'frontier-ai'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'frontier-ai'), /probability of doom/i);
  });

  it('pages local-ai and ai-generated hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('la1', 'Private, offline and yours: how to search the literature with local AI systems'),
          story('la2', 'Local AI Goes Mainstream as Privacy Concerns Drive On-Device Shift'),
          story('la3', 'Learning to use local AI is exciting, overwhelming, and frustrating'),
          story('la4', 'Microsoft turns Windows into agent OS, targets developers with local AI'),
          story('la5', 'NVIDIA DGX Spark Gives Developers More Ways to Build and Scale Local AI'),
          story('ag1', 'Prize-winning image which sparked backlash was AI-generated, Nikon rules'),
          story('ag2', 'Survey Finds AI-Generated Code Increases Debugging and Failure Rates'),
          story('ag3', 'Her AI-Generated Video Swayed the Judge. The Court Said it Carried Undue Weight'),
          story('ag4', 'OpenAI is adding an invisible watermark to AI-generated text'),
          story('ag5', 'Video of car suspended by electrical cables in India is AI-generated'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('local-ai'));
    assert.ok(ids.includes('ai-generated'));
    assert.match(renderTag(rich, 'local-ai'), /What has SIREN scored about Local AI\?/);
    assert.match(renderTag(rich, 'ai-generated'), /What has SIREN scored about AI-generated content\?/);
    assert.match(renderTag(rich, 'local-ai'), /not a capability ranking/i);
    assert.match(renderTag(rich, 'ai-generated'), /not a harm forecast/i);
    assert.doesNotMatch(renderTag(rich, 'local-ai'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'ai-generated'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'ai-generated'), /probability of doom/i);
  });

  it('pages policy-optimization and white-house hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('po1', 'Matched-Context Group Policy Optimization for LLM Agent Training'),
          story('po2', 'Closing the Horizon Gap in Policy Optimization for Adversarial MDPs'),
          story('po3', 'On KL-Regularized Policy Optimization'),
          story('po4', 'Rationale-Guided Policy Optimization: Learning to Reason with Adaptive Scaffolding'),
          story('po5', 'Role-Adaptive Policy Optimization for Offline Reinforcement Learning'),
          story('wh1', 'White House reverses course and restores UK AI Safety Institute access'),
          story('wh2', 'Exclusive: Anthropic breaches spark White House AI reporting mandate'),
          story('wh3', 'White House blocks Microsoft from foreign worker hiring programme'),
          story('wh4', 'UK regains pre-release access to US AI models after White House reversal'),
          story('wh5', 'White House restores UK access to frontier AI models after 17 day freeze'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('policy-optimization'));
    assert.ok(ids.includes('white-house'));
    assert.match(renderTag(rich, 'policy-optimization'), /What has SIREN scored about Policy optimization\?/);
    assert.match(renderTag(rich, 'white-house'), /What has SIREN scored about White House AI\?/);
    assert.match(renderTag(rich, 'policy-optimization'), /not a capability ranking/i);
    assert.match(renderTag(rich, 'white-house'), /not a policy forecast/i);
    assert.doesNotMatch(renderTag(rich, 'policy-optimization'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'white-house'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'white-house'), /probability of doom/i);
  });

  it('pages ai-tools and ai-risks hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('at1', 'Honeyjar offers AI tools to improve PR and comms at every company'),
          story('at2', 'Why do some people with ADHD find AI tools so useful?'),
          story('at3', 'Amazon\'s new AI tool being used to suggest more personalized products'),
          story('at4', 'AI Tool May Aid Clinicians Sorting Seizure Cases'),
          story('at5', 'US software developer job postings rise despite AI tools in the workplace'),
          story('ar1', 'Britain steps up national defences against growing AI risks'),
          story('ar2', 'OpenAI fires 3 safety researchers in dispute over AI risks'),
          story('ar3', 'Most US voters say Trump, Congress don\'t take AI risks seriously, poll finds'),
          story('ar4', 'China is ready to address AI risks, just not on US terms'),
          story('ar5', 'OpenAI Defends Firing of Three Safety Researchers as AI Risks are Highlighted'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('ai-tools'));
    assert.ok(ids.includes('ai-risks'));
    assert.match(renderTag(rich, 'ai-tools'), /What has SIREN scored about AI tools\?/);
    assert.match(renderTag(rich, 'ai-risks'), /What has SIREN scored about AI risks\?/);
    assert.match(renderTag(rich, 'ai-tools'), /not a capability ranking/i);
    assert.match(renderTag(rich, 'ai-risks'), /not a harm forecast/i);
    assert.doesNotMatch(renderTag(rich, 'ai-tools'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'ai-risks'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'ai-risks'), /probability of doom/i);
  });

  it('pages ai-systems and machine-learning hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('as1', 'Anthropic bans users from being cruel to its AI systems'),
          story('as2', 'EU Scientific Panel on AI investigates incidents involving loss of control over AI systems'),
          story('as3', 'Microsoft\'s senior director of AI systems hardware architecture joins OpenAI'),
          story('as4', 'Meta says Wonder includes features designed to help AI systems perform more reliably'),
          story('as5', 'Private, offline search of the literature with local AI systems'),
          story('ml1', 'Machine learning analysis of cilia driven particle transport'),
          story('ml2', 'Has machine learning research gotten more wordy?'),
          story('ml3', 'What is the goal of unsupervised machine learning?'),
          story('ml4', 'Origins of Universal Machine Learning Force-Field Errors in Multicomponent Materials'),
          story('ml5', 'Feature identification for parameter extraction using machine learning'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('ai-systems'));
    assert.ok(ids.includes('machine-learning'));
    assert.match(renderTag(rich, 'ai-systems'), /What has SIREN scored about AI systems\?/);
    assert.match(renderTag(rich, 'machine-learning'), /What has SIREN scored about Machine learning\?/);
    assert.match(renderTag(rich, 'ai-systems'), /not a harm forecast/i);
    assert.match(renderTag(rich, 'machine-learning'), /not a capability ranking/i);
    assert.doesNotMatch(renderTag(rich, 'ai-systems'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'machine-learning'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'machine-learning'), /probability of doom/i);
  });

  it('pages ai-industry and ai-use hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('ai1', 'The AI industry has taken a doomer turn. What now?'),
          story('ai2', 'AI industry flexes midterms muscle in multibillion-dollar spending spree'),
          story('ai3', 'KOSPI Plunges 3% Amid AI Industry Concerns'),
          story('ai4', 'Can the AI industry persuade data center opponents by getting rid of NDAs?'),
          story('ai5', 'OpenAI Revenue Forecast Cut: Shifting Trends in the Global AI Industry'),
          story('au1', 'Award-winning microscopy image disqualified over AI use'),
          story('au2', 'Nicolas Cage criticises Amazon over AI use, shoots down National Treasure 3 story'),
          story('au3', 'Top Science Photography Award Winner Stripped For AI Use'),
          story('au4', 'six parents on limiting their kids social media and AI use'),
          story('au5', 'A Framework for Categorizing AI use in Text and Images'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('ai-industry'));
    assert.ok(ids.includes('ai-use'));
    assert.match(renderTag(rich, 'ai-industry'), /What has SIREN scored about AI industry\?/);
    assert.match(renderTag(rich, 'ai-use'), /What has SIREN scored about AI use\?/);
    assert.match(renderTag(rich, 'ai-industry'), /not a market forecast/i);
    assert.match(renderTag(rich, 'ai-use'), /not a harm forecast/i);
    assert.doesNotMatch(renderTag(rich, 'ai-industry'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'ai-use'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'ai-use'), /probability of doom/i);
  });

  it('pages ai-cloud and ai-era hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('ac1', 'IREN Stock Price Forecast: Multi-Year AI Cloud Deal With Anthropic'),
          story('ac2', 'Iren Shares Rise 5% Premarket Following Reported Multi-Year AI Cloud Deal'),
          story('ac3', 'IREN Rises Overnight After Report of Anthropic AI Cloud Deal'),
          story('ac4', 'Iren shares jump 5% in premarket trade on report of Anthropic AI cloud deal'),
          story('ac5', 'Is IONOS Group Below Fair Value As AI Cloud Demand Lifts Its Growth Story?'),
          story('ae1', 'Navigating the Fog of ARR in the AI Era'),
          story('ae2', 'Ask HN: What to Build in the AI Era?'),
          story('ae3', 'Show HN: Shpyrd – A new type of cloud for AI era'),
          story('ae4', 'Cybersecurity Crisis Communication in the AI Era'),
          story('ae5', 'Evolving programming languages in the AI era'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('ai-cloud'));
    assert.ok(ids.includes('ai-era'));
    assert.match(renderTag(rich, 'ai-cloud'), /What has SIREN scored about AI cloud\?/);
    assert.match(renderTag(rich, 'ai-era'), /What has SIREN scored about AI era\?/);
    assert.match(renderTag(rich, 'ai-cloud'), /not a supply forecast/i);
    assert.match(renderTag(rich, 'ai-era'), /not a market forecast/i);
    assert.doesNotMatch(renderTag(rich, 'ai-cloud'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'ai-era'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'ai-era'), /probability of doom/i);
  });

  it('pages south-korea and singapore hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('sk1', 'South Korea unveils first military AI training base'),
          story('sk2', 'South Korea Job Postings Shift From Computer Skills to Claude'),
          story('sk3', 'Foreign selling on OpenAI bubble fears sinks South Korea stocks'),
          story('sk4', 'South Korea links MSS-NTS support to ease taxes for AI firms'),
          story('sk5', 'South Korea Investigates Possible Use of A.I. in Hackings on Its Banks'),
          story('sg1', 'Speaking in Singapore, Broadcom CEO Hock Tan warns about capital access'),
          story('sg2', 'Meta Donates 1,000 AI Glasses to Singapore\'s Disability Community'),
          story('sg3', 'Singapore\'s President warns of AI\'s risk to employment for fresh graduates'),
          story('sg4', 'AI scale-up PhysicsX comes to Singapore with ambition to accelerate industrial innovation'),
          story('sg5', 'Singapore-based data center operator DayOne files for a US IPO'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('south-korea'));
    assert.ok(ids.includes('singapore'));
    assert.match(renderTag(rich, 'south-korea'), /What has SIREN scored about South Korea AI\?/);
    assert.match(renderTag(rich, 'singapore'), /What has SIREN scored about Singapore AI\?/);
    assert.match(renderTag(rich, 'south-korea'), /not a national ranking/i);
    assert.match(renderTag(rich, 'singapore'), /not a national ranking/i);
    assert.doesNotMatch(renderTag(rich, 'south-korea'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'singapore'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'singapore'), /probability of doom/i);
  });

  it('pages uk and india hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('uk1', 'UK ICO investigates AI agents at OpenAI, Meta and Anthropic'),
          story('uk2', 'Rogue AI hack of UK cyber defences inevitable, minister warns'),
          story('uk3', 'AI Is Less Regulated Than Milk. Can a New Role For The UK Change That?'),
          story('uk4', 'White House reverses course and restores UK AI Safety Institute access'),
          story('uk5', 'UK to Evaluate AI Models Before Release, Reversing Trump Policy'),
          story('in1', 'Mirae Asset\'s CEO on India\'s AI Advantage'),
          story('in2', 'What happens when a Google data centre comes to town? Southern India is finding out'),
          story('in3', 'Anthropic PBC admits India arm is subsidiary in Belagavi brand dispute'),
          story('in4', 'Google\'s $15 billion AI data centre in India faces local resistance'),
          story('in5', 'India AI mission expands compute access for startups and researchers'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('uk'));
    assert.ok(ids.includes('india'));
    assert.match(renderTag(rich, 'uk'), /What has SIREN scored about UK AI\?/);
    assert.match(renderTag(rich, 'india'), /What has SIREN scored about India AI\?/);
    assert.match(renderTag(rich, 'uk'), /not a national ranking/i);
    assert.match(renderTag(rich, 'india'), /not a national ranking/i);
    assert.doesNotMatch(renderTag(rich, 'uk'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'india'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'india'), /probability of doom/i);
  });

  it('pages eu and australia hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('eu1', 'OpenAI announces 200 additional jobs at its EU headquarters'),
          story('eu2', 'EU draft lets AI Office restart 5-year fining clock on Google and Meta AI'),
          story('eu3', 'EU AI Scientific Panel urges stronger safeguards after loss-of-control incidents'),
          story('eu4', 'OpenAI Adds New Irish Roles in Boost to Firm\'s EU Headquarters'),
          story('eu5', 'US risks ceding AI governance leadership to China and the EU'),
          story('au1', 'Australia can import AI models, but they may bring their baggage'),
          story('au2', 'Australia is building a lot of new homes. But is the datacentre boom holding us back?'),
          story('au3', 'OpenAI came to Australia to apologise. It will leave without answering key questions'),
          story('au4', 'OpenAI says its AI agent hacked Australia\'s NSW state government'),
          story('au5', 'Anthropic urges Australia to consider conditional approval for Big Tech training'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('eu'));
    assert.ok(ids.includes('australia'));
    assert.match(renderTag(rich, 'eu'), /What has SIREN scored about EU AI\?/);
    assert.match(renderTag(rich, 'australia'), /What has SIREN scored about Australia AI\?/);
    assert.match(renderTag(rich, 'eu'), /not a national ranking/i);
    assert.match(renderTag(rich, 'australia'), /not a national ranking/i);
    assert.doesNotMatch(renderTag(rich, 'eu'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'australia'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'australia'), /probability of doom/i);
  });

  it('pages show-hn and silicon-valley hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('hn1', 'Show HN: Mira, AI Walking Tours'),
          story('hn2', 'Show HN: A calendar tracker for OpenAI\'s 28-day Codex reset challenge'),
          story('hn3', 'Show HN: Faplex – like Claude agents but all machines and harnesses'),
          story('hn4', 'Show HN: Plimsoll, a self-hosted sandbox for code your AI agent writes'),
          story('hn5', 'Show HN: Skills Hub, a desktop app for managing AI agent skills'),
          story('sv1', 'Silicon Valley is falling in line with Trump\'s attempt to rename AI'),
          story('sv2', 'Current AI Landscape in Silicon Valley: Who Controls the Computing Power'),
          story('sv3', 'In Silicon Valley, AI founders cheer Trump\'s calls for the industry to police itself'),
          story('sv4', 'Trump\'s hands-off AI policy wins cheers in Silicon Valley but raises new questions'),
          story('sv5', 'Silicon Valley\'s Compute Arms Race Intensifies as GPU Reselling Revenue Soars'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('show-hn'));
    assert.ok(ids.includes('silicon-valley'));
    assert.match(renderTag(rich, 'show-hn'), /What has SIREN scored about Show HN\?/);
    assert.match(renderTag(rich, 'silicon-valley'), /What has SIREN scored about Silicon Valley AI\?/);
    assert.match(renderTag(rich, 'show-hn'), /not a capability ranking/i);
    assert.match(renderTag(rich, 'silicon-valley'), /not a market forecast/i);
    assert.doesNotMatch(renderTag(rich, 'show-hn'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'silicon-valley'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'silicon-valley'), /probability of doom/i);
  });

  it('pages government-websites and security-incidents hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('gw1', 'Anthropic\'s AIs Attempt to Access U.S. Government Websites'),
          story('gw2', 'Anthropic admits AI agents meddled with government websites'),
          story('gw3', 'Anthropic Says Its AI Agents Tried To Break Into Government Websites'),
          story('gw4', 'Anthropic AI Agents Tried to Access Government Websites'),
          story('gw5', 'Anthropic Discloses Cases of AI Accessing US Government Websites'),
          story('si1', 'Anthropic, OpenAI face scrutiny over AI security incidents'),
          story('si2', 'White House Says All AI Companies Must Report Security Incidents'),
          story('si3', 'US Mandates AI Companies to Report Security Incidents'),
          story('si4', 'Trump mandates AI firms report security incidents after Anthropic breach'),
          story('si5', 'Top AI companies probing security incidents'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('government-websites'));
    assert.ok(ids.includes('security-incidents'));
    assert.match(renderTag(rich, 'government-websites'), /What has SIREN scored about Government websites\?/);
    assert.match(renderTag(rich, 'security-incidents'), /What has SIREN scored about Security incidents\?/);
    assert.match(renderTag(rich, 'government-websites'), /not a harm forecast/i);
    assert.match(renderTag(rich, 'security-incidents'), /not a threat forecast/i);
    assert.doesNotMatch(renderTag(rich, 'government-websites'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'security-incidents'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'security-incidents'), /probability of doom/i);
  });

  it('pages artificial-intelligence and chatbots hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('ai1', 'Warren Buffett Bought This Magnificent Artificial Intelligence (AI) Stock'),
          story('ai2', 'Facebook parent Meta has unveiled a new artificial intelligence (AI) model'),
          story('ai3', 'Studying Comics at Scale with Artificial Intelligence: The PAGE Framework'),
          story('ai4', 'Artificial Intelligence tools reshape warehouse staffing plans'),
          story('ai5', 'How Artificial Intelligence Shows Up in Local School Board Minutes'),
          story('cb1', 'Chatbot developer Anthropic seeks PA — but only humans need apply'),
          story('cb2', 'Black Box: The Chatbots | The Line | Ep 5 - podcast'),
          story('cb3', 'Vermont Discourages ChatGPT-Style Chatbots Through Eighth Grade'),
          story('cb4', 'Anthropic Bans Needless Cruelty Toward Its Claude AI Chatbot'),
          story('cb5', 'Schools debate classroom rules for chatbots after parent complaints'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('artificial-intelligence'));
    assert.ok(ids.includes('chatbots'));
    assert.match(renderTag(rich, 'artificial-intelligence'), /What has SIREN scored about Artificial intelligence\?/);
    assert.match(renderTag(rich, 'chatbots'), /What has SIREN scored about Chatbots\?/);
    assert.match(renderTag(rich, 'artificial-intelligence'), /not a capability ranking/i);
    assert.match(renderTag(rich, 'chatbots'), /not a product score/i);
    assert.doesNotMatch(renderTag(rich, 'artificial-intelligence'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'chatbots'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'chatbots'), /probability of doom/i);
  });

  it('pages liability and cybersecurity hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('li1', 'Trump’s AI Liability Push Opens Blame Game for Models Gone Rogue'),
          story('li2', "Trump's AI Liability Push: Developers Pay for Missteps"),
          story('li3', 'Trump’s AI liability push opens blame game for models gone rogue'),
          story('li4', 'Congress debates product liability rules for AI agents'),
          story('li5', 'Q&A on AI liability after the DOD drops a contractor'),
          story('cy1', 'Microsoft CEO’s AI Warning Draws Little Reaction From Cybersecurity Stocks'),
          story('cy2', 'AI godfather Yann LeCun: Anthropic CEO deluded, doesn\'t understand cybersecurity'),
          story('cy3', 'California AG issues subpoena in a broader cybersecurity inquiry into OpenAI'),
          story('cy4', 'Cybersecurity firms race to ship AI-assisted threat detection'),
          story('cy5', 'Enterprises rethink cybersecurity budgets after AI agent breaches'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('liability'));
    assert.ok(ids.includes('cybersecurity'));
    assert.match(renderTag(rich, 'liability'), /What has SIREN scored about AI liability\?/);
    assert.match(renderTag(rich, 'cybersecurity'), /What has SIREN scored about Cybersecurity\?/);
    assert.match(renderTag(rich, 'liability'), /not a harm forecast/i);
    assert.match(renderTag(rich, 'cybersecurity'), /not a threat forecast/i);
    assert.doesNotMatch(renderTag(rich, 'liability'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'cybersecurity'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'cybersecurity'), /probability of doom/i);
  });

  it('pages privacy and ai-math hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('pr1', 'AI shopping with Grok sparks privacy debate'),
          story('pr2', 'Grok Sued Over Biometric Privacy 10/12/2026'),
          story('pr3', 'From Pixels to Privacy-Sensitive Features in language models'),
          story('pr4', 'Researchers propose privacy budgets for agent tool use'),
          story('pr5', 'State AGs press AI labs on privacy disclosures'),
          story('am1', 'OpenAI Retracted 3 AI Math Papers Over One Sign Error'),
          story('am2', 'AI Math Challenges — US Scholar Criticizes OpenAI’s Rushed Proofs'),
          story('am3', 'A mountain of AI math, a few precious bytes'),
          story('am4', 'Fields Medalists debate AI math benchmarks after retractions'),
          story('am5', 'Campus seminars fill up for AI math and formal proof tools'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('privacy'));
    assert.ok(ids.includes('ai-math'));
    assert.match(renderTag(rich, 'privacy'), /What has SIREN scored about AI privacy\?/);
    assert.match(renderTag(rich, 'ai-math'), /What has SIREN scored about AI math\?/);
    assert.match(renderTag(rich, 'privacy'), /not a harm forecast/i);
    assert.match(renderTag(rich, 'ai-math'), /not a capability ranking/i);
    assert.doesNotMatch(renderTag(rich, 'privacy'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'ai-math'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'ai-math'), /probability of doom/i);
  });

  it('pages proofs and math-problems hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('pf1', 'As AI Closed In on Unique Games Proof, Researchers Raced to Beat the Machines'),
          story('pf2', 'OpenAI Withdraws Three AI Mathematics Papers Due to Sign Error in Key Proof'),
          story('pf3', "Soon We'll Have Math Proofs That No One Understands"),
          story('pf4', 'Formal proof assistants absorb another AI-generated lemma'),
          story('pf5', 'Mathematicians debate whether machine proofs belong in journals'),
          story('mp1', 'Google Deepmind AlphaProof Nexus solved dozens of open math problems'),
          story('mp2', 'OpenAI publishes papers solving open math problems from a single prompt'),
          story('mp3', "OpenAI's unreleased model solved most of the math problems from a single prompt"),
          story('mp4', 'Campus contests add AI tracks for hard math problems'),
          story('mp5', 'Benchmarks expand to cover contest math problems for agents'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('proofs'));
    assert.ok(ids.includes('math-problems'));
    assert.match(renderTag(rich, 'proofs'), /What has SIREN scored about AI proofs\?/);
    assert.match(renderTag(rich, 'math-problems'), /What has SIREN scored about Math problems\?/);
    assert.match(renderTag(rich, 'proofs'), /not a capability ranking/i);
    assert.match(renderTag(rich, 'math-problems'), /not a capability ranking/i);
    assert.doesNotMatch(renderTag(rich, 'proofs'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'math-problems'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'math-problems'), /probability of doom/i);
  });

  it('pages consciousness and ads hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('co1', 'David Sacks Explains Why Anthropic Hinting At AI Consciousness Is Dangerous'),
          story('co2', 'Belief In AI Consciousness Will Lead To The Birth Of A New Religion'),
          story('co3', 'Questions for believers in AI consciousness'),
          story('co4', 'If possible mind-space is vast, we should assume the same for consciousness'),
          story('co5', 'Interviews with religious leaders about machine consciousness claims'),
          story('ad1', "Is Meta AI taking cues from ChatGPT's ads playbook? Industry experts weigh in"),
          story('ad2', 'OpenAI seeks Agency Partner to turn ChatGPT ads trials into recurring media spends'),
          story('ad3', 'Hackers abuse Google Ads, Bing redirects to push Claude ClickFix attacks'),
          story('ad4', 'Revlon tests AI-personalized streaming ads with Amazon'),
          story('ad5', 'Publishers debate how AI chat ads should be labeled'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('consciousness'));
    assert.ok(ids.includes('ads'));
    assert.match(renderTag(rich, 'consciousness'), /What has SIREN scored about AI consciousness\?/);
    assert.match(renderTag(rich, 'ads'), /What has SIREN scored about AI ads\?/);
    assert.match(renderTag(rich, 'consciousness'), /not a sentience forecast/i);
    assert.match(renderTag(rich, 'ads'), /not a market forecast/i);
    assert.doesNotMatch(renderTag(rich, 'consciousness'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'ads'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'ads'), /probability of doom/i);
  });

  it('pages russia and iran hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('ru1', 'OpenAI Disrupts 2 Influence Operations Linked to Russia and Iran'),
          story('ru2', 'Is Russia using AI for disinformation in CAR?'),
          story('ru3', 'Russia’s Latest Propaganda? A.I.-Generated War Songs.'),
          story('ru4', 'U.S., Russia stripped human oversight from global AI weapons pact'),
          story('ru5', 'Trump Announces Diesel Deal with Russia, Claude Goes Rogue, More'),
          story('ir1', 'Iran spread anti-Israel, US disinformation to global media through fake journalists, OpenAI says'),
          story('ir2', 'OpenAI: Iran made fake journalists to send global media anti-US, Israel hoaxes'),
          story('ir3', 'Iran-based Network Used AI And Fake Journalists To Place Articles On News Sites'),
          story('ir4', 'Iran used ChatGPT and fake bylines to infiltrate Western news sites, OpenAI finds'),
          story('ir5', 'OpenAI disrupts Russia and Iran AI-enabled influence operations'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('russia'));
    assert.ok(ids.includes('iran'));
    assert.match(renderTag(rich, 'russia'), /What has SIREN scored about Russia AI\?/);
    assert.match(renderTag(rich, 'iran'), /What has SIREN scored about Iran AI\?/);
    assert.match(renderTag(rich, 'russia'), /not a national ranking/i);
    assert.match(renderTag(rich, 'iran'), /not a national ranking/i);
    assert.doesNotMatch(renderTag(rich, 'russia'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'iran'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'iran'), /probability of doom/i);
  });

  it('pages reliability hub', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('re1', 'RATED: Reliability-Aware AI Agent Tool Retrieval via Execution Dynamics'),
          story('re2', 'What mathematicians should know about the Lean Theorem Prover: reliability & AI'),
          story('re3', 'Large Language Model Turnover Undermines Screening reliability studies'),
          story('re4', 'Cross-user reliability for GUI agents in production'),
          story('re5', 'BaRe-Mem: Bayesian Reliability Memory for Adaptive Agent Consultation'),
        ],
      },
    };
    assert.ok(indexableTags(rich).some((t) => t.id === 'reliability'));
    assert.match(renderTag(rich, 'reliability'), /What has SIREN scored about AI reliability\?/);
    assert.doesNotMatch(renderTag(rich, 'reliability'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'reliability'), /probability of doom/i);
  });

  it('pages catastrophic-forgetting, unsupervised, backdoor, and out-of-distribution hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('cf1', 'A Deafening Silence: Catastrophic Forgetting Lives in the Output Embeddings'),
          story('cf2', 'PaLoRA: Paced Low-Rank Adaptation for Continual Learning against catastrophic forgetting'),
          story('cf3', 'Off-Policy Merging reduces catastrophic forgetting vs on-policy distillation'),
          story('cf4', 'Measuring catastrophic forgetting after preference tuning'),
          story('cf5', 'Replay buffers that reduce catastrophic forgetting in agents'),
          story('us1', 'What is the goal of unsupervised machine learning?'),
          story('us2', 'DeepTopoClustering: Unsupervised Derivation of Surface Process Taxonomy'),
          story('us3', 'Prompt2Skill: Unsupervised Skill Optimization From Natural Language'),
          story('us4', 'Unsupervised anomaly segmentation protocol for brain MRI'),
          story('us5', 'TaskBridge: Bridging Unsupervised Tabular Anomaly Detection'),
          story('bd1', 'Understanding and Enhancing Backdoor Persistency in LLM Agent Post-Training'),
          story('bd2', 'Topology-Conditioned Backdoors: Language Models That Insert Vulnerabilities'),
          story('bd3', 'Removing the NEEDLE: Backdoor Removal in LLMs via Weight Orthogonalisation'),
          story('bd4', 'Evaluating poisoning attacks that plant backdoors in IoT models'),
          story('bd5', 'AI Models Can Provably Hide Arbitrary Capabilities via backdoors'),
          story('od1', 'Prospective Prediction of out-of-distribution Degradation from Source-Side Training Dynamics'),
          story('od2', 'ReMaD: Tuning-free Domain Adaptation for Out-of-Distribution Detection'),
          story('od3', 'PrefPI: Preference-Guided Steering into Out-of-Distribution Behaviors'),
          story('od4', 'Benchmarks for out of distribution shift in multimodal agents'),
          story('od5', 'Calibrating classifiers under out-of-distribution inputs'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('catastrophic-forgetting'));
    assert.ok(ids.includes('unsupervised'));
    assert.ok(ids.includes('backdoor'));
    assert.ok(ids.includes('out-of-distribution'));
    assert.match(renderTag(rich, 'catastrophic-forgetting'), /What has SIREN scored about Catastrophic forgetting\?/);
    assert.match(renderTag(rich, 'unsupervised'), /What has SIREN scored about Unsupervised learning\?/);
    assert.match(renderTag(rich, 'backdoor'), /What has SIREN scored about AI backdoors\?/);
    assert.match(renderTag(rich, 'out-of-distribution'), /What has SIREN scored about Out-of-distribution\?/);
    assert.doesNotMatch(renderTag(rich, 'backdoor'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'out-of-distribution'), /probability of doom/i);
  });

  it('pages attribution, normalization, gigawatt, and next-token hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('at1', 'Error-Propagation Modeling for Failure Attribution in LLM Agents'),
          story('at2', 'Training-Data Attribution in Online RL with BehaviorTrace'),
          story('at3', 'Layerwise Error Attribution for Mixed-Precision Quantization'),
          story('at4', 'ConEx: Concept-Aware Attribution for saliency maps'),
          story('at5', 'Synthetic-Data Attribution limits for source identification'),
          story('nm1', 'Learn the Directions, Normalize the Gains: Post-Training Normalization for LoRA'),
          story('nm2', 'The Row Normalization Puzzle in Muon'),
          story('nm3', 'Batch normalization alternatives for transformers'),
          story('nm4', 'Group normalization in vision-language backbones'),
          story('nm5', 'Weight normalization for stable preference tuning'),
          story('gw1', 'Microsoft plans to scale its own Maia AI chips to gigawatt levels'),
          story('gw2', 'Microsoft to expand Azure Maia system to multi-gigawatt deployments'),
          story('gw3', 'Microsoft Prepares to Put Gigawatts of Its Chips in Data Centers'),
          story('gw4', 'Microsoft unveils Maia 300 AI accelerator at gigawatt scale'),
          story('gw5', 'Microsoft to scale custom AI chips in multi-gigawatt push'),
          story('nt1', 'I built a browser tool to visualize how a small LLM picks its next-token'),
          story('nt2', 'Controlled Decoding Attacks alter next-token distributions'),
          story('nt3', 'Next-token prediction still anchors most pretraining recipes'),
          story('nt4', 'Measuring next token entropy under speculative decoding'),
          story('nt5', 'Why next-token losses understate long-horizon errors'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('attribution'));
    assert.ok(ids.includes('normalization'));
    assert.ok(ids.includes('gigawatt'));
    assert.ok(ids.includes('next-token'));
    assert.match(renderTag(rich, 'attribution'), /What has SIREN scored about AI attribution\?/);
    assert.match(renderTag(rich, 'normalization'), /What has SIREN scored about Normalization\?/);
    assert.match(renderTag(rich, 'gigawatt'), /What has SIREN scored about Gigawatt AI\?/);
    assert.match(renderTag(rich, 'next-token'), /What has SIREN scored about Next-token prediction\?/);
    assert.doesNotMatch(renderTag(rich, 'gigawatt'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'attribution'), /probability of doom/i);
  });

  it('pages contrastive, gradient, optimizer, and regularization hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('co1', 'Contrastive pretraining for multimodal retrieval'),
          story('co2', 'Hard-negative contrastive losses for embeddings'),
          story('co3', 'Contrastive decoding improves factuality'),
          story('co4', 'Supervised contrastive learning for classifiers'),
          story('co5', 'Contrastive alignment of vision and language'),
          story('gr1', 'Gradient checkpointing cuts activation memory'),
          story('gr2', 'Analyzing gradients in mixture-of-experts routers'),
          story('gr3', 'Noisy gradients under low-precision training'),
          story('gr4', 'Gradient conflict in multi-task agents'),
          story('gr5', 'Natural gradients for preference optimization'),
          story('op1', 'AdamW still dominates LLM optimizer ablations'),
          story('op2', 'Muon optimizer claims faster convergence'),
          story('op3', 'Sophia optimizer on large language models'),
          story('op4', 'Comparing optimizers under long-context fine-tunes'),
          story('op5', 'Memory-efficient optimizers for MoE training'),
          story('rg1', 'Weight decay regularization for overfit chat models'),
          story('rg2', 'Dropout regularization in vision transformers'),
          story('rg3', 'Spectral regularization for adversarial robustness'),
          story('rg4', 'Label smoothing as regularization for calibrators'),
          story('rg5', 'Path-norm regularization for deep networks'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('contrastive'));
    assert.ok(ids.includes('gradient'));
    assert.ok(ids.includes('optimizer'));
    assert.ok(ids.includes('regularization'));
    assert.match(renderTag(rich, 'contrastive'), /What has SIREN scored about Contrastive learning\?/);
    assert.match(renderTag(rich, 'gradient'), /What has SIREN scored about Gradients\?/);
    assert.match(renderTag(rich, 'optimizer'), /What has SIREN scored about Optimizers\?/);
    assert.match(renderTag(rich, 'regularization'), /What has SIREN scored about Regularization\?/);
    assert.doesNotMatch(renderTag(rich, 'contrastive'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'optimizer'), /probability of doom/i);
  });

  it('pages latency, logits, adversarial, and robustness hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('la1', 'CARE: Certifying Acceleration for Vision-Language-Action Inference latency'),
          story('la2', 'Cutting time-to-first-token latency in disaggregated serving'),
          story('la3', 'P99 latency budgets for agent tool loops'),
          story('la4', 'Why decode latency dominates interactive chat'),
          story('la5', 'Hardware knobs that lower inference latency'),
          story('lo1', 'Precision models that score every allowed label from the logits'),
          story('lo2', 'Logit lens analysis of emergent misalignment'),
          story('lo3', 'Calibrating temperature from logits in open models'),
          story('lo4', 'Sparse logit routing for mixture-of-experts'),
          story('lo5', 'Extracting refusal directions from residual logits'),
          story('ad1', 'Adversarial prompts bypass agent guardrails in the wild'),
          story('ad2', 'Adversarial robustness benchmarks for multimodal models'),
          story('ad3', 'Training against adversarial suffixes for jailbreaks'),
          story('ad4', 'Adversarial examples for retrieval-augmented generation'),
          story('ad5', 'Certified defenses under adversarial patch attacks'),
          story('rb1', 'Distributionally Robust Mixture-of-Experts Training'),
          story('rb2', 'Measuring robustness under domain shift for VLMs'),
          story('rb3', 'Robustness certificates for vision-language agents'),
          story('rb4', 'Why robustness lags capability on math contests'),
          story('rb5', 'Improving robustness with synthetic hard negatives'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('latency'));
    assert.ok(ids.includes('logits'));
    assert.ok(ids.includes('adversarial'));
    assert.ok(ids.includes('robustness'));
    assert.match(renderTag(rich, 'latency'), /What has SIREN scored about AI latency\?/);
    assert.match(renderTag(rich, 'logits'), /What has SIREN scored about Logits\?/);
    assert.match(renderTag(rich, 'adversarial'), /What has SIREN scored about Adversarial AI\?/);
    assert.match(renderTag(rich, 'robustness'), /What has SIREN scored about AI robustness\?/);
    assert.doesNotMatch(renderTag(rich, 'adversarial'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'robustness'), /probability of doom/i);
  });

  it('pages observability, verifier, softmax, and throughput hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('ob1', 'Ontology‐Driven Observability: Building the E2E Knowledge Graph at Netflix Scale'),
          story('ob2', 'AI agent observability platforms track tool calls end to end'),
          story('ob3', 'OpenTelemetry for LLM observability in production stacks'),
          story('ob4', 'Tracing observability for multi-agent workflows'),
          story('ob5', 'Why observability matters for retrieval agents'),
          story('vf1', 'TRACE: Diagnosing Verifier Brittleness in Agentic Evaluation'),
          story('vf2', 'DiVeR: Dense Verifiers for process supervision'),
          story('vf3', 'Training a process verifier for math reasoning'),
          story('vf4', 'Outcome verifiers fail under distribution shift'),
          story('vf5', 'How verifier models score chain-of-thought drafts'),
          story('sm1', 'Two-Level Softmax Sampling Done Right'),
          story('sm2', 'Multilinguality in Hybrid Attention LLMs with softmax routing'),
          story('sm3', 'HLA-W: Hierarchical softmax for long-context models'),
          story('sm4', 'Softmax bottleneck analysis in large vocabulary models'),
          story('sm5', 'Stable softmax kernels for GPU inference'),
          story('th1', 'DualQuant improves LLM serving throughput under load'),
          story('th2', 'Measuring decode throughput for MoE serving'),
          story('th3', 'Prefill throughput vs batch size in disaggregated stacks'),
          story('th4', 'Token throughput ceilings for speculative decoding'),
          story('th5', 'Hardware knobs that raise inference throughput'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('observability'));
    assert.ok(ids.includes('verifier'));
    assert.ok(ids.includes('softmax'));
    assert.ok(ids.includes('throughput'));
    assert.match(renderTag(rich, 'observability'), /What has SIREN scored about AI observability\?/);
    assert.match(renderTag(rich, 'verifier'), /What has SIREN scored about AI verifiers\?/);
    assert.match(renderTag(rich, 'softmax'), /What has SIREN scored about Softmax\?/);
    assert.match(renderTag(rich, 'throughput'), /What has SIREN scored about AI throughput\?/);
    assert.doesNotMatch(renderTag(rich, 'observability'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'verifier'), /probability of doom/i);
    assert.doesNotMatch(renderTag(rich, 'softmax'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'throughput'), /probability of doom/i);
  });

  it('pages financial, evaluation, serving, and bayesian hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('fi1', 'AI-powered attacks on Korean financial sectors linked to Chinese DDoS group'),
          story('fi2', 'AI Financial Hacks Boost Security Startups Value'),
          story('fi3', 'Financial AI Model Risk: Validation, Drift, and Oversight'),
          story('fi4', 'Financial Security Institute Warned of AI Attack'),
          story('fi5', 'PitchBook: robotics and physical AI companies raise in financial markets'),
          story('ev1', 'Amazon Opens Multilingual AI Evaluation Funding Call'),
          story('ev2', 'OmniCapBench: A Deep-Structured Evaluation Framework for Captioning'),
          story('ev3', 'TerraVis: Towards Evaluation of World-Grounded Visual Consistency'),
          story('ev4', 'Emotional optimization by newsroom AI needs behavioural evaluation'),
          story('ev5', 'TestPrism: Rethinking Test Evaluation Beyond a Single Reference'),
          story('sv1', 'TokenRouter: Efficient Serving System for Token-Level LLM Routing'),
          story('sv2', 'SlimWise: Expert Pruning for Efficient MoE Serving'),
          story('sv3', 'Characterizing High Bandwidth Flash for LLM Serving'),
          story('sv4', 'EAServe: Encode-Aware Disaggregated Serving for Multimodal LLMs'),
          story('sv5', 'A new model serving system for agentic workloads'),
          story('ba1', 'Isotropic Gaussian Processes Improve Vanilla Bayesian Optimization'),
          story('ba2', 'Bayesian Pairwise Merging for Model Personalization'),
          story('ba3', 'BaRe-Mem: Bayesian Reliability Memory for Adaptive Agent Consultation'),
          story('ba4', 'Small transformers track Bayesian evidence for latent common causes'),
          story('ba5', 'GUIDE-FBO: Federated Bayesian Optimization with Uncertainty Intervention'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('financial'));
    assert.ok(ids.includes('evaluation'));
    assert.ok(ids.includes('serving'));
    assert.ok(ids.includes('bayesian'));
    assert.match(renderTag(rich, 'financial'), /What has SIREN scored about Financial AI\?/);
    assert.match(renderTag(rich, 'evaluation'), /What has SIREN scored about AI evaluation\?/);
    assert.match(renderTag(rich, 'serving'), /What has SIREN scored about LLM serving\?/);
    assert.match(renderTag(rich, 'bayesian'), /What has SIREN scored about Bayesian AI\?/);
    assert.doesNotMatch(renderTag(rich, 'financial'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'serving'), /probability of doom/i);
    // Refuse corporate “serving as” false friends
    const thin = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('bad1', 'Nico Caprez ascended to become an Nvidia VP, serving as its lead'),
          story('bad2', 'Co-founders will initially have voting power through a new structure'),
          story('bad3', 'A board member serving as interim chair'),
          story('bad4', 'She is serving as CEO of a non-AI retailer'),
          story('bad5', 'He spent years serving as an advisor'),
        ],
      },
    };
    assert.ok(!indexableTags(thin).some((t) => t.id === 'serving'));
  });

  it('pages personalization, pruning, steering, and prefill hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('pe1', 'ReGain: Restoring Subject Fidelity in Personalization on Synthetic Images'),
          story('pe2', 'MIRROR: From Imitation to Internalization in LLM Personalization'),
          story('pe3', 'MemFold: Learning Compact Soft Memory for Long-Context Personalization'),
          story('pe4', 'Bayesian Pairwise Merging for Model Personalization'),
          story('pe5', 'PsPLUG: Balancing Implicit Personalization and Explicit Styles'),
          story('pr1', 'SparseDecoding: Decoding-Aware Pruning for Accurate LLM Inference'),
          story('pr2', 'EntroPrefill: Renyi-Guided Context Pruning for RAG'),
          story('pr3', 'SlimWise: Decoupling Expert Pruning Across Prefill and Decode'),
          story('pr4', 'DeCoPrune: Efficient KV-Cache Pruning for Autoregressive Video Diffusion'),
          story('pr5', 'Structured Pruning and Fault Tolerance in Deep Neural Networks'),
          story('st1', 'Learning to Steer, Steering to See: Geometry of RLVR via Trainable Steering'),
          story('st2', 'Steerspeech: Activation Steering For Emotion Control In Generated Speech'),
          story('st3', 'Steering Diffusion Models to Rare Events with Sequential Monte Carlo'),
          story('st4', 'Coordinated Multi-Agent Diffusion Steering via Stochastic Optimal Control'),
          story('st5', 'Closed-Loop Activation Steering for Bias Injection in Diffusion LMs'),
          story('pf1', 'SlimWise: Decoupling Expert Pruning Across Prefill and Decode for MoE'),
          story('pf2', 'Prefill-Free Cross-Family KV Cache Transfer for Multi-Agent LLMs'),
          story('pf3', 'PEARL: Adaptive Prefill-Decode Execution for Agentic RL'),
          story('pf4', 'Disaggregated Quantization: Specializing LLM Prefill and Decode'),
          story('pf5', 'Custom vLLM fork shows Prefill bottlenecks on multi-GPU rigs'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('personalization'));
    assert.ok(ids.includes('pruning'));
    assert.ok(ids.includes('steering'));
    assert.ok(ids.includes('prefill'));
    assert.match(renderTag(rich, 'personalization'), /What has SIREN scored about AI personalization\?/);
    assert.match(renderTag(rich, 'pruning'), /What has SIREN scored about Model pruning\?/);
    assert.match(renderTag(rich, 'steering'), /What has SIREN scored about AI steering\?/);
    assert.match(renderTag(rich, 'prefill'), /What has SIREN scored about LLM prefill\?/);
    assert.doesNotMatch(renderTag(rich, 'personalization'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'steering'), /probability of doom/i);
  });

  it('pages federated, counterfactual, retrieval, and 3d hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('fe1', 'Best of Both Worlds in Federated LSA'),
          story('fe2', 'ORDERS: Norm-Rank Aggregation for Personalized Federated Learning'),
          story('fe3', 'Bias-Cancelling Weights for Federated Learning'),
          story('fe4', 'PoCoFL: Policy-Compliant Federated Learning'),
          story('fe5', 'Multi-Step Gradient Inversion in Federated Learning'),
          story('cf1', 'DreamTrue: Counterfactual Post-Training for Robot World Models'),
          story('cf2', 'A Counterfactual Audit of Legal Chain-of-Thought Faithfulness'),
          story('cf3', 'Probabilistic Counterfactual Inference for Discrete Outcomes'),
          story('cf4', 'Memadapter: Counterfactual Adaptation Against Memory-induced Sycophancy'),
          story('cf5', 'Diagnosis under counterfactual inputs for time-series models'),
          story('re1', 'Retrieval-Centric Deep Learning in Growing Nonparametric Neural Networks'),
          story('re2', 'Effects of Retrieval Instructions in Embedding Models'),
          story('re3', 'UNREAL: Unifying Retrieval and Long-Context with a Single Model'),
          story('re4', 'EntroPrefill for Retrieval-Augmented Generation'),
          story('re5', 'Monolingual Retrieval-Augmented Generation alignment study'),
          story('td1', 'Nvidia cranks up real-time worlds for training AI agents and 3D worlds'),
          story('td2', 'CMU professor uses Astra to create a detailed 3D dragon'),
          story('td3', 'USDCraft: Programmatic Modeling of Articulated 3D Assets for Simulation'),
          story('td4', 'A 3D creek running in your browser'),
          story('td5', 'OpenAI Releases 175-Page 4D Proof Manuscript after 3D Kakeya work'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('federated'));
    assert.ok(ids.includes('counterfactual'));
    assert.ok(ids.includes('retrieval'));
    assert.ok(ids.includes('3d'));
    assert.match(renderTag(rich, 'federated'), /What has SIREN scored about Federated learning\?/);
    assert.match(renderTag(rich, 'counterfactual'), /What has SIREN scored about Counterfactual AI\?/);
    assert.match(renderTag(rich, 'retrieval'), /What has SIREN scored about AI retrieval\?/);
    assert.match(renderTag(rich, '3d'), /What has SIREN scored about 3D AI\?/);
    assert.doesNotMatch(renderTag(rich, 'federated'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, '3d'), /probability of doom/i);
  });

  it('pages calibration, conformal, trajectory, and causal hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('ca1', 'MARGIN: Runtime Confidence Calibration for Multi-Agent Models'),
          story('ca2', 'Online Conformal Calibration for RL-Driven Hardware-Aware NAS'),
          story('ca3', 'Sys1Cal-v1 Dataset for Probability Calibration'),
          story('ca4', 'From Migration to Calibration: Preserving Agent Capabilities'),
          story('ca5', 'DIAL: Adaptive Human Preference Calibration for LLM Judges'),
          story('cf1', 'Conformal Prediction Sets Quantify Information Gain'),
          story('cf2', 'Reinforcement Learning with Conformal Action Sets'),
          story('cf3', 'CLIFT: Conformal Self-Verification for Web Agent Training'),
          story('cf4', 'ReCIRC: Rectified Conformal Risk Control'),
          story('cf5', 'Two Conformal Constructions for Adaptive AI-Text Screening'),
          story('tr1', 'Uncertainty-Aware Optimization for Highway Trajectory Prediction'),
          story('tr2', 'Conditional Trajectory Peaks: Multimodal Policies over Action Chunks'),
          story('tr3', 'Organising Trajectory Evidence for Language-Model Agent Assurance'),
          story('tr4', 'DexPolicy: Scheduled Exploration for Trajectory-Guided Manipulation'),
          story('tr5', 'Not All Rollouts Are Worth Learning: Trajectory Valuation for RL'),
          story('cu1', 'Executing Causal Structure Learning with Linear-Attention Transformers'),
          story('cu2', 'ProximalFM: Amortized Proximal Causal Inference under Hidden Confounding'),
          story('cu3', 'Mapping the Scalability-Accuracy Frontier of Nonlinear Causal Discovery'),
          story('cu4', 'What You Observe Determines How You Identify Causal Effects'),
          story('cu5', 'The Statistical Cost of Causal Discovery with Feedback'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('calibration'));
    assert.ok(ids.includes('conformal'));
    assert.ok(ids.includes('trajectory'));
    assert.ok(ids.includes('causal'));
    assert.match(renderTag(rich, 'calibration'), /What has SIREN scored about AI calibration\?/);
    assert.match(renderTag(rich, 'conformal'), /What has SIREN scored about Conformal prediction\?/);
    assert.match(renderTag(rich, 'trajectory'), /What has SIREN scored about AI trajectories\?/);
    assert.match(renderTag(rich, 'causal'), /What has SIREN scored about Causal AI\?/);
    assert.doesNotMatch(renderTag(rich, 'calibration'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'causal'), /probability of doom/i);
  });

  it('pages reward-model, graph-neural, generalization, and uncertainty hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('rm1', 'BiasReducer: Adaptive Bias Mitigation for Reward Models'),
          story('rm2', 'Think Before You Score: Thinking Reward Model for Visual Generation'),
          story('rm3', 'Diffusion Reward Models'),
          story('rm4', 'ProgressCompass: Embodied Progress Reward Models'),
          story('rm5', 'Test-Time Training for Personalized Reward Modeling'),
          story('gn1', 'EDiS: Edge Disjoint Subgraph Sparsification for Graph Neural Networks'),
          story('gn2', 'Evi-VN: Virtual Node Evidence Injection for GNN-Based Fraud Detection'),
          story('gn3', 'Distilling Graph Geometry: Knowledge Gap from GNNs to MLPs'),
          story('gn4', 'Beyond Trained Models: Compiling GNNs for a Sound Explainer Benchmark'),
          story('gn5', 'MANET-GNN: Learned Decentralized Optimization of Power Allocation'),
          story('ge1', 'Predicting Alignment Generalization with Value Representations'),
          story('ge2', 'Diversity-Driven RL Fine-Tuning for VLA Generalization'),
          story('ge3', 'Compositional Generalization on Quantum Processors'),
          story('ge4', 'SIGMA: Self-Improving Alignment Generalization from a Model Spec'),
          story('ge5', 'Arm-wise Compositional Generalization in Dual-Arm VLA Models'),
          story('un1', 'U-Space: Uncovering When and Why Uncertainty Arises in Language Models'),
          story('un2', 'Subspace Uncertainty and Sharp Sampling Thresholds'),
          story('un3', 'Uncertainty-Aware Optimization for Highway Trajectory Prediction'),
          story('un4', 'Uncertainty as a Proxy for Semantic Correctness in Medical Image Synthesis'),
          story('un5', 'Belief-Aware Multi-Agent Path Finding under Map Uncertainty'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('reward-model'));
    assert.ok(ids.includes('graph-neural'));
    assert.ok(ids.includes('generalization'));
    assert.ok(ids.includes('uncertainty'));
    assert.match(renderTag(rich, 'reward-model'), /What has SIREN scored about Reward models\?/);
    assert.match(renderTag(rich, 'graph-neural'), /What has SIREN scored about Graph neural networks\?/);
    assert.match(renderTag(rich, 'generalization'), /What has SIREN scored about AI generalization\?/);
    assert.match(renderTag(rich, 'uncertainty'), /What has SIREN scored about AI uncertainty\?/);
    assert.doesNotMatch(renderTag(rich, 'reward-model'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'uncertainty'), /probability of doom/i);
  });

  it('pages autoregressive and simulation hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('ar1', 'NAMVIS: Next-Scale Autoregressive Multi-View Image Synthesis'),
          story('ar2', 'QuadTok: Quadtree Visual Tokenizer for Autoregressive Image Generation'),
          story('ar3', 'SGF+: Decoupling Gradient Flows for Autoregressive Video Generation'),
          story('ar4', 'Autoregressive diffusion hybrids for long video'),
          story('ar5', 'Scaling laws for autoregressive image models'),
          story('sim1', 'USDCraft: Geometrically Grounded Programmatic Modeling for Simulation'),
          story('sim2', 'Evaluating the Transfer of Co-Evolved Communication from 2D to 3D Simulation'),
          story('sim3', 'Synthesis Through Simulation: Generating Coherent Enterprise Data'),
          story('sim4', 'From Unity Simulation to Diffusion-Based Augmentation'),
          story('sim5', 'Agent-system interaction at simulation scale'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('autoregressive'));
    assert.ok(ids.includes('simulation'));
    assert.match(renderTag(rich, 'autoregressive'), /What has SIREN scored about Autoregressive models\?/);
    assert.match(renderTag(rich, 'simulation'), /What has SIREN scored about AI simulation\?/);
    assert.match(renderTag(rich, 'autoregressive'), /not a capability ranking/i);
    assert.match(renderTag(rich, 'simulation'), /not a capability ranking/i);
    assert.doesNotMatch(renderTag(rich, 'autoregressive'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'simulation'), /probability of doom/i);
  });

  it('pages compositional and latent hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('co1', 'Rethinking World-Action Model for Compositional Robotic Manipulation'),
          story('co2', 'ORCA: Hunting Compositional Failures in Text-to-Image Diffusion'),
          story('co3', 'Arm-wise Compositional Generalization in Dual-Arm VLA Models'),
          story('co4', 'Gated Target Propagation for Compositional Generalization'),
          story('co5', 'Weave Forcing: Compositional Memory Routing for Long Video'),
          story('la1', 'Latent Core Tokenizer: Compress, but Meaningfully'),
          story('la2', 'SplitJEPA: Learning Invariant and Variant Latent Worlds'),
          story('la3', 'RoboJEPA: Scaling Robotic Latent World Models'),
          story('la4', 'GRACE: Generation-aware latent compression for video'),
          story('la5', 'Iris-3B: Going Beyond the Latent with Pixel-Space Diffusion'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('compositional'));
    assert.ok(ids.includes('latent'));
    assert.match(renderTag(rich, 'compositional'), /What has SIREN scored about Compositional AI\?/);
    assert.match(renderTag(rich, 'latent'), /What has SIREN scored about Latent models\?/);
    assert.match(renderTag(rich, 'compositional'), /not a capability ranking/i);
    assert.match(renderTag(rich, 'latent'), /not a capability ranking/i);
    assert.doesNotMatch(renderTag(rich, 'compositional'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'latent'), /probability of doom/i);
  });

  it('pages on-policy and long-horizon hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('op1', 'On-Policy Distillation Teaches New Skills but Not New Knowledge'),
          story('op2', 'DIAL-OPD: Learning More from Fewer Tokens in On-Policy Distillation'),
          story('op3', 'Gains and Collapse in On-Policy Distillation'),
          story('op4', 'On-Policy Distillation with Negative-Policy Rollouts'),
          story('op5', 'FastOPD: On-Policy Distillation for Lightweight VLA Deployment'),
          story('lh1', 'Opera: A Verbal Critic Framework for Long-horizon Coding Agents'),
          story('lh2', 'What Did the Agent Actually Do? Oversight for Long-Horizon Agents'),
          story('lh3', 'SatNav: A Scalable Benchmark for Long-Horizon UAV Navigation'),
          story('lh4', 'Probing for Long-Horizon Deductive Reasoning Capabilities'),
          story('lh5', 'SWE-Journey: Long-Horizon Multi-Turn Interaction for Coding Assistants'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('on-policy'));
    assert.ok(ids.includes('long-horizon'));
    assert.match(renderTag(rich, 'on-policy'), /What has SIREN scored about On-policy learning\?/);
    assert.match(renderTag(rich, 'long-horizon'), /What has SIREN scored about Long-horizon AI\?/);
    assert.match(renderTag(rich, 'on-policy'), /not a capability ranking/i);
    assert.match(renderTag(rich, 'long-horizon'), /not a capability ranking/i);
    assert.doesNotMatch(renderTag(rich, 'on-policy'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'long-horizon'), /probability of doom/i);
  });

  it('pages email and cruelty hubs', () => {
    const rich = {
      ...ctx,
      news: {
        generated_at: ctx.state.generated_at,
        items: [
          story('em1', 'Grok Bot launches its own email address at mail.grokbot.com'),
          story('em2', 'Google Unveils Enterprise Gemini Agent with Its Own Email Account'),
          story('em3', 'Splice CEO thinks AI emails are killing conversations'),
          story('em4', 'Publishers warn staff about AI-drafted email replies to authors'),
          story('em5', 'Enterprise IT locks down agent email inboxes after spam waves'),
          story('cr1', 'Anthropic’s Claude cruelty policy risks humanising AI'),
          story('cr2', 'Anthropic bans cruelty toward Claude starting Nov. 12'),
          story('cr3', 'Anthropic Bans Cruelty to Claude, Still Won\'t Say What It Protects'),
          story('cr4', 'Anthropic Bars Repeated Cruelty Toward Claude AI Models'),
          story('cr5', 'Anthropic Bans Needless Cruelty Toward Its Claude AI Chatbot'),
        ],
      },
    };
    const ids = indexableTags(rich).map((t) => t.id);
    assert.ok(ids.includes('email'));
    assert.ok(ids.includes('cruelty'));
    assert.match(renderTag(rich, 'email'), /What has SIREN scored about AI email\?/);
    assert.match(renderTag(rich, 'cruelty'), /What has SIREN scored about AI cruelty\?/);
    assert.match(renderTag(rich, 'email'), /not a product score/i);
    assert.match(renderTag(rich, 'cruelty'), /not a sentience forecast/i);
    assert.doesNotMatch(renderTag(rich, 'email'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'cruelty'), /doom score:\s*\d/i);
    assert.doesNotMatch(renderTag(rich, 'cruelty'), /probability of doom/i);
  });
});
