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
});
