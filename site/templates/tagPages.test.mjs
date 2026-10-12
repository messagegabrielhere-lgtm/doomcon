import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { render as renderItem } from './itemPage.mjs';
import {
  TAG_INDEX_MIN,
  TOPIC_DEFS,
  indexableTags,
  tagPath,
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
    assert.match(html, /AI tags this index covers/);
    assert.match(html, /\/tags\/agents\.html/);
    assert.match(html, /does not publish a topic/);
    assert.match(html, /\/models\.html/);
    assert.match(renderIndex(ctx), /\/tags\.html/);
    assert.doesNotMatch(html, /doom score:\s*\d/i);
  });

  it('lists stories with ItemList schema and refuses doom claims', () => {
    const html = renderTag(ctx, 'agents');
    assert.match(html, /<title>AI agents: AI stories this index scored/);
    assert.match(html, /CollectionPage/);
    assert.match(html, /ItemList/);
    assert.match(html, /New AI agents ship computer use/);
    assert.match(html, /not a probability of harm/);
    assert.doesNotMatch(html, /noindex/);
    assert.doesNotMatch(html, /doom score/i);
  });

  it('renders the tag index and links from story pages', () => {
    const index = renderIndex(ctx);
    assert.match(index, /AI news tags/);
    assert.match(index, /\/tags\/agents\.html/);
    const tags = tagsForItem(ctx, ctx.news.items[0]);
    assert.ok(tags.some((t) => t.id === 'agents'));
    const html = renderItem(ctx, ctx.news.items[0]);
    assert.match(html, /href="\/tags\/agents\.html"/);
  });

  it('links older archived stories that match the tag needle', () => {
    const withArch = {
      ...ctx,
      itemArchive: [
        story('old1', 'Archived AI agents story from last week'),
      ],
    };
    const html = renderTag(withArch, 'agents');
    assert.match(html, /Older scored stories tagged AI agents/);
    assert.match(html, /Archived AI agents story/);
    assert.match(html, /\/item\/archive\.html/);
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
    assert.match(html, /Older scored stories tagged AI watermarking/);
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
    assert.match(renderTag(rich, 'coding'), /AI coding: AI stories this index scored/);
    assert.match(renderTag(rich, 'acquisitions'), /AI acquisitions: AI stories this index scored/);
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
    assert.match(renderTag(rich, 'evals'), /AI evals: AI stories this index scored/);
    assert.match(renderTag(rich, 'video'), /AI video: AI stories this index scored/);
    assert.match(renderTag(rich, 'voice'), /Voice AI: AI stories this index scored/);
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
    assert.match(renderTag(rich, 'reasoning'), /Reasoning models: AI stories this index scored/);
    assert.match(renderTag(rich, 'ipo'), /AI IPOs: AI stories this index scored/);
    assert.match(renderTag(rich, 'rag'), /RAG \/ retrieval: AI stories this index scored/);
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
    assert.match(renderTag(rich, 'mcp'), /MCP \/ tool protocols: AI stories this index scored/);
    assert.match(renderTag(rich, 'fine-tuning'), /Fine-tuning: AI stories this index scored/);
    assert.match(renderTag(rich, 'quantization'), /Quantization: AI stories this index scored/);
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
    assert.match(renderTag(rich, 'distillation'), /Distillation: AI stories this index scored/);
    assert.match(renderTag(rich, 'memory'), /Agent memory: AI stories this index scored/);
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
    assert.match(renderTag(rich, 'test-time'), /Test-time compute: AI stories this index scored/);
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
    assert.match(renderTag(rich, 'ollama'), /Ollama: AI stories this index scored/);
    assert.match(renderTag(rich, 'mlx'), /MLX: AI stories this index scored/);
    assert.match(renderTag(rich, 'computer-use'), /Computer use: AI stories this index scored/);
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
    assert.match(renderTag(rich, 'huggingface'), /Hugging Face: AI stories this index scored/);
    assert.match(renderTag(rich, 'blackwell'), /Blackwell GPUs: AI stories this index scored/);
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
    assert.match(renderTag(rich, 'prefer-data'), /Preference data: AI stories this index scored/);
    assert.match(renderTag(rich, 'reasoning-traces'), /Reasoning traces: AI stories this index scored/);
    assert.match(renderTag(rich, 'claude-code'), /Claude Code: AI stories this index scored/);
    assert.match(renderTag(rich, 'openrouter'), /OpenRouter: AI stories this index scored/);
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
    assert.match(renderTag(rich, 'kv-cache'), /KV cache: AI stories this index scored/);
    assert.match(renderTag(rich, 'ai-act'), /EU AI Act: AI stories this index scored/);
    assert.match(renderTag(rich, 'autonomous-vehicles'), /Autonomous vehicles: AI stories this index scored/);
    assert.match(renderTag(rich, 'ai-music'), /AI music: AI stories this index scored/);
    assert.match(renderTag(rich, 'synthetic-data'), /Synthetic data: AI stories this index scored/);
    assert.match(renderTag(rich, 'inference-cost'), /Inference cost: AI stories this index scored/);
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
    assert.match(renderTag(rich, 'multi-agent'), /Multi-agent systems: AI stories this index scored/);
    assert.match(renderTag(rich, 'deepfakes'), /Deepfakes: AI stories this index scored/);
    assert.match(renderTag(rich, 'slm'), /Small language models: AI stories this index scored/);
    assert.match(renderTag(rich, 'ai-science'), /AI for science: AI stories this index scored/);
    assert.match(renderTag(rich, 'speculative-decoding'), /Speculative decoding: AI stories this index scored/);
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
    assert.match(renderTag(rich, 'diffusion'), /Diffusion models: AI stories this index scored/);
    assert.match(renderTag(rich, 'embeddings'), /Embeddings: AI stories this index scored/);
    assert.match(renderTag(rich, 'guardrails'), /AI guardrails: AI stories this index scored/);
    assert.match(renderTag(rich, 'context-window'), /Context windows: AI stories this index scored/);
    assert.match(renderTag(rich, 'ai-search'), /AI search: AI stories this index scored/);
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
    assert.match(renderTag(rich, 'hallucination'), /AI hallucination: AI stories this index scored/);
    assert.match(renderTag(rich, 'prompt-injection'), /Prompt injection: AI stories this index scored/);
    assert.match(renderTag(rich, 'moe'), /Mixture of experts: AI stories this index scored/);
    assert.match(renderTag(rich, 'world-models'), /World models: AI stories this index scored/);
    assert.match(renderTag(rich, 'copyright'), /AI copyright: AI stories this index scored/);
    assert.doesNotMatch(renderTag(rich, 'hallucination'), /doom score/i);
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
    assert.match(renderTag(rich, 'voice-agents'), /Voice agents: AI stories this index scored/);
    assert.match(renderTag(rich, 'skills'), /Agent skills: AI stories this index scored/);
    assert.match(renderTag(rich, 'tsmc'), /TSMC: AI stories this index scored/);
    assert.match(renderTag(rich, 'mcp-servers'), /MCP servers: AI stories this index scored/);
    assert.match(renderTag(rich, 'llama-cpp'), /llama\.cpp: AI stories this index scored/);
    assert.match(renderTag(rich, 'deep-research'), /Deep research: AI stories this index scored/);
    assert.match(renderTag(rich, 'lora'), /LoRA: AI stories this index scored/);
    assert.match(renderTag(rich, 'grpo'), /GRPO: AI stories this index scored/);
    assert.doesNotMatch(renderTag(rich, 'voice-agents'), /doom score/i);
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
    assert.match(renderTag(rich, 'rlvr'), /RLVR: AI stories this index scored/);
    assert.match(renderTag(rich, 'humanoid'), /Humanoid robots: AI stories this index scored/);
    assert.match(renderTag(rich, 'interpretability'), /Interpretability: AI stories this index scored/);
    assert.match(renderTag(rich, 'gguf'), /GGUF: AI stories this index scored/);
    assert.match(renderTag(rich, 'red-teaming'), /Red-teaming: AI stories this index scored/);
    assert.match(renderTag(rich, 'edge-ai'), /Edge AI: AI stories this index scored/);
    assert.match(renderTag(rich, 'sft'), /SFT: AI stories this index scored/);
    assert.match(renderTag(rich, 'copilot'), /Copilot: AI stories this index scored/);
    assert.match(renderTag(rich, 'diffusion-llm'), /Diffusion LLMs: AI stories this index scored/);
    assert.match(renderTag(rich, 'activation-steering'), /Activation steering: AI stories this index scored/);
    assert.match(renderTag(rich, 'rerank'), /Reranking: AI stories this index scored/);
    assert.match(renderTag(rich, 'federated-learning'), /Federated learning: AI stories this index scored/);
    assert.doesNotMatch(renderTag(rich, 'rlvr'), /doom score/i);
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
    assert.match(renderTag(rich, 'training-data'), /Training data: AI stories this index scored/);
    assert.match(renderTag(rich, 'physical-ai'), /Physical AI: AI stories this index scored/);
    assert.match(renderTag(rich, 'gui-agents'), /GUI agents: AI stories this index scored/);
    assert.match(renderTag(rich, 'tool-calling'), /Tool calling: AI stories this index scored/);
    assert.match(renderTag(rich, 'long-context'), /Long context: AI stories this index scored/);
    assert.match(renderTag(rich, 'chain-of-thought'), /Chain-of-thought: AI stories this index scored/);
    assert.match(renderTag(rich, 'local-llm'), /Local LLMs: AI stories this index scored/);
    assert.doesNotMatch(renderTag(rich, 'physical-ai'), /doom score/i);
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
    assert.match(renderTag(rich, 'coding-agents'), /Coding agents: AI stories this index scored/);
    assert.match(renderTag(rich, 'agentic-workflow'), /Agentic workflows: AI stories this index scored/);
    assert.match(renderTag(rich, 'leaderboard'), /AI leaderboards: AI stories this index scored/);
    assert.match(renderTag(rich, 'alignment'), /AI alignment: AI stories this index scored/);
    assert.doesNotMatch(renderTag(rich, 'alignment'), /doom score/i);
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
    assert.match(renderTag(rich, 'world-action'), /World-action models: AI stories this index scored/);
    assert.match(renderTag(rich, 'embodied'), /Embodied AI: AI stories this index scored/);
    assert.match(renderTag(rich, 'tts'), /Text-to-speech: AI stories this index scored/);
    assert.match(renderTag(rich, 'asr'), /Speech recognition: AI stories this index scored/);
    assert.doesNotMatch(renderTag(rich, 'embodied'), /doom score/i);
  });
});
