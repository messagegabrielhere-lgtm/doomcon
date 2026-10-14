// /tags/<slug>.html — topic hubs for scored stories that match a curated needle.
//
// COMPETITIVE-SEO.md §1.3: Skynet Countdown ships ~717 `/tags/*` pages with
// ItemList + BreadcrumbList. We already have pillar/lab/model/source facets;
// these add search-shaped topic landings without inventing synonym doorways.
// A tag under TAG_INDEX_MIN stays off the sitemap (soft-404 gate). Matching is
// hand-curated regex against title+summary — same honesty rule as entities
// (published vocabulary, recomputable by a stranger).

import { esc, num, utc } from './_html.mjs';
import { page } from './layout.mjs';
import { breadcrumbs, speakable } from './_seo.mjs';
import { slugFor } from './itemPage.mjs';
import * as brand from '../brand.mjs';

/** Minimum scored stories before a tag page is written and sitemapped. */
export const TAG_INDEX_MIN = 5;

/** Stories printed on the tag page. */
export const TAG_LIST_CAP = 40;

/**
 * Published topic vocabulary. `id` is the URL slug. `match` is tested against
 * title + summary. Keep the list short and evidence-backed — thin synonym
 * farms are refused (FINDABILITY.md §3.3).
 */
export const TOPIC_DEFS = Object.freeze([
  {
    id: 'agents',
    name: 'AI agents',
    description: 'Stories about agentic systems, tool use, and computer-use products.',
    match: /\b(agentic|ai agents?|tool[- ]use|computer[- ]use|autonomous agents?)\b/i,
  },
  {
    id: 'gpus',
    name: 'GPUs & chips',
    description: 'Hardware, accelerators, and semiconductor supply that move the compute pillar.',
    match: /\b(gpus?|h100|b200|blackwell|cuda|chip(?:s|making)?|semiconductor|nvidia|tpu)\b/i,
  },
  {
    id: 'safety',
    name: 'AI safety',
    description: 'Alignment, evaluations, red-teaming, and misuse reporting — not a harm forecast.',
    match: /\b(alignment|ai safety|red[- ]team|evals?|jailbreak|misuse|responsible scaling)\b/i,
  },
  {
    id: 'datacenters',
    name: 'Datacenters & power',
    description: 'Sites, megawatts, and power deals tied to frontier training and inference.',
    match: /\b(data[- ]cent(?:er|re)s?|power purchase|megawatts?|gwh|grid interconnect)\b/i,
  },
  {
    id: 'fundraising',
    name: 'AI fundraising',
    description: 'Rounds, valuations, and capital raises named in the newsroom window.',
    match: /\b(fundrais\w*|raises? \$?\d|series [a-d]\b|valuation|ipo|investment round)\b/i,
  },
  {
    id: 'benchmarks',
    name: 'AI benchmarks',
    description: 'Public leaderboards and eval suites the stories name.',
    match: /\b(benchmark|swe-bench|mmlu|lmsys|chatbot arena|humanity'?s last exam)\b/i,
  },
  {
    id: 'regulation',
    name: 'AI regulation',
    description: 'Statutes, agencies, and executive actions that name AI rules.',
    match: /\b(regulat\w*|eu ai act|executive order|congress|legislation|ftc|ofcom|nist ai)\b/i,
  },
  {
    id: 'inference',
    name: 'Inference & serving',
    description: 'Serving stacks, inference cost, and deployment throughput named in headlines.',
    match: /\b(inference|serving stack|vllm|tensorrt|tokens? per second)\b/i,
  },
  {
    id: 'robotics',
    name: 'AI robotics',
    description: 'Robots and humanoids tied to frontier model labs or AI product news.',
    match: /\b(robot(?:ics|s)?|humanoid|figure ai|boston dynamics)\b/i,
  },
  {
    id: 'china',
    name: 'China AI',
    description: 'Stories that name China, Chinese labs, or PRC-linked AI companies in this window.',
    match: /\b(china|chinese|beijing|shanghai|deepseek|alibaba|tencent|baidu)\b/i,
  },
  {
    id: 'security',
    name: 'AI security',
    description: 'Breaches, prompt injection, and cyber incidents the newsroom scored — not a threat forecast.',
    match: /\b(cyber|breach|prompt injection|data leak|vulnerability|ransomware)\b/i,
  },
  {
    id: 'military',
    name: 'AI & defense',
    description: 'Defense, Pentagon, and military procurement stories that name AI systems.',
    match: /\b(pentagon|defense|defence|military|weaponis\w*|autonomous weapon)\b/i,
  },
  {
    id: 'education',
    name: 'AI in education',
    description: 'Classrooms, universities, and student-use stories scored in this window.',
    match: /\b(classroom|university|students?|cheating|homework|school district)\b/i,
  },
  {
    id: 'open-weights',
    name: 'Open weights',
    description: 'Open-weight and open-source model releases named in the newsroom window.',
    match: /\b(open[- ]source|open[- ]weight|weights? release|apache[- ]2\.0|mit license)\b/i,
  },
  {
    id: 'cloud',
    name: 'Cloud AI',
    description: 'Cloud platforms and hosted model APIs (Azure, AWS, GCP, Bedrock, Vertex).',
    match: /\b(azure|aws|gcp|bedrock|vertex ai|cloud gpu)\b/i,
  },
  {
    id: 'startups',
    name: 'AI startups',
    description: 'Startups and early-stage AI companies named in scored headlines.',
    match: /\b(start[- ]?ups?|seed round|unicorn|y combinator|\byc\b)\b/i,
  },
  {
    id: 'finance',
    name: 'AI in finance',
    description: 'Banking, fintech, and markets stories that name AI systems.',
    match: /\b(bank(?:ing)?|fintech|trading desk|wall street|hedge fund)\b/i,
  },
  {
    id: 'multimodal',
    name: 'Multimodal AI',
    description: 'Vision, image generation, and other multimodal model stories.',
    match: /\b(multimodal|vision model|image generat|text[- ]to[- ]image)\b/i,
  },
  {
    id: 'chips',
    name: 'AI chips',
    description: 'Semiconductors, foundries, and AI accelerators named in scored headlines.',
    match: /\b(chip(?:s|makers?)?|semiconductor|tsmc|foundry|ai accelerator|h100|b200|gpu shortage)\b/i,
  },
  {
    id: 'energy',
    name: 'AI energy',
    description: 'Power, grid, and nuclear stories tied to AI datacentres and training load.',
    match: /\b(nuclear|power grid|electricity|reactor|energy demand|megawatts?)\b/i,
  },
  {
    id: 'labor',
    name: 'AI and labor',
    description: 'Hiring, layoffs, and workforce stories that name AI systems.',
    match: /\b(layoff|job(?:s|less)?|workforce|hiring freeze|unemploy|white[- ]collar)\b/i,
  },
  {
    id: 'healthcare',
    name: 'AI in healthcare',
    description: 'Hospital, clinical, and medical-AI stories scored in this window.',
    match: /\b(hospital|healthcare|medical|diagnos|clinical|\bfda\b|patient|physician)\b/i,
  },
  {
    id: 'coding',
    name: 'AI coding',
    description: 'Coding agents, copilots, and software-engineering evals named in scored headlines.',
    match: /\b(coding agents?|ai coding|code generat|copilot|devin|swe-bench|vibe[- ]coding|software engineer(ing)? agents?)\b/i,
  },
  {
    id: 'acquisitions',
    name: 'AI acquisitions',
    description: 'Acqui-hires, mergers, and AI company acquisitions named in the newsroom window.',
    match: /\b(acqui-?hir\w*|acquisition|acquires?\b|bought by|merger with)\b/i,
  },
  {
    id: 'browser',
    name: 'Browser agents',
    description: 'Computer-use and browser agents named in scored headlines — product and eval stories, not a forecast.',
    match: /\b(browser agents?|computer[- ]use|chatgpt operator|web agents?|agentic browser|openai operator|claude computer)\b/i,
  },
  {
    id: 'watermarking',
    name: 'AI watermarking',
    description: 'Watermarking and content-provenance stories scored in the newsroom or archive.',
    match: /\bwatermark/i,
  },
  {
    id: 'evals',
    name: 'AI evals',
    description: 'Model evals, leaderboards, and benchmark arenas named in scored headlines.',
    match: /\b(llm evals?|model evals?|ai evals?|leaderboard|lmsys|chatbot arena|lm arena|lmarena|arena elo|swe-bench|mmlu|gpqa|humaneval|bigcodebench)\b/i,
  },
  {
    id: 'video',
    name: 'AI video',
    description: 'Text-to-video and generative video products named in scored headlines — story counts, not a forecast.',
    match: /\b(ai video|text[- ]to[- ]video|video generat|\bsora\b|\bveo\b|runway (ml|gen)|pika labs|kling ai|openai sora)\b/i,
  },
  {
    id: 'voice',
    name: 'Voice AI',
    description: 'Speech and voice-AI products named in scored headlines (TTS, ASR, voice agents).',
    match: /\b(voice ai|text[- ]to[- ]speech|speech[- ]to[- ]text|elevenlabs|openai whisper|voice clon|\btts\b|\basr\b)\b/i,
  },
  {
    id: 'reasoning',
    name: 'Reasoning models',
    description: 'Reasoning-model and chain-of-thought stories scored in the newsroom or archive.',
    match: /\b(reasoning\s*models?|chain[- ]of[- ]thought|test[- ]time\s*compute|\bo1\b|\bo3\b|thinking\s*mode|extended\s*thinking)\b/i,
  },
  {
    id: 'ipo',
    name: 'AI IPOs',
    description: 'IPO and listing stories naming AI labs or AI infrastructure companies — coverage counts, not investment advice.',
    // Wider window + Moonshot / Firmus / Nvidia-backed infra forms so today’s
    // AI-IPO headlines clear TAG_INDEX_MIN without synonym doorways.
    match: /\bai\s*ipos?\b|\bipo\b.{0,80}\b(ai|openai|anthropic|moonshot|coreweave|firmus|nvidia)\b|\b(ai|openai|anthropic|moonshot|coreweave|firmus|nvidia)\b.{0,80}\bipo\b|\bdirect\s*listing\b.{0,40}\b(openai|anthropic|coreweave|\bai\b)\b/i,
  },
  {
    id: 'rag',
    name: 'RAG / retrieval',
    description: 'Retrieval-augmented generation and agentic RAG stories scored in the newsroom or archive.',
    match: /\b(retrieval[- ]augmented|\brag\b|agentic\s*rag)\b/i,
  },
  {
    id: 'mcp',
    name: 'MCP / tool protocols',
    description: 'Model Context Protocol and related tool-protocol stories scored in the newsroom or archive.',
    match: /\b(model context protocol|\bmcp\b|mcp servers?|mcp clients?)\b/i,
  },
  {
    id: 'fine-tuning',
    name: 'Fine-tuning',
    description: 'Fine-tuning and post-training stories scored in the newsroom or archive — coverage counts, not a model score.',
    match: /\b(fine[- ]tun(?:e|ing|ed)|post[- ]train(?:ing|ed)?|lora|qlora)\b/i,
  },
  {
    id: 'quantization',
    name: 'Quantization',
    description: 'Model quantization and low-bit serving stories scored in the newsroom or archive.',
    match: /\b(quantiz(?:es?|ation|ed|ing)|int4|int8|fp8|gguf|awq|gptq)\b/i,
  },
  {
    id: 'distillation',
    name: 'Distillation',
    description: 'Knowledge-distillation and student-model stories scored in the newsroom or archive.',
    match: /\b(distill(?:ation|ed|ing)?|knowledge distill)\b/i,
  },
  {
    id: 'memory',
    name: 'Agent memory',
    description: 'Long-term and agent-memory stories scored in the newsroom or archive — coverage counts, not a capability claim.',
    match: /\b(long[- ]term memory|agent memory|memory for agents|episodic memory|memory layer)\b/i,
  },
  {
    id: 'test-time',
    name: 'Test-time compute',
    description: 'Test-time compute and inference-time scaling stories scored in the newsroom or archive.',
    match: /\b(test[- ]time (compute|scaling)|inference[- ]time scaling|tts scaling)\b/i,
  },
  {
    id: 'hallucination',
    name: 'AI hallucination',
    description: 'Hallucination and factuality stories scored in the newsroom or archive — coverage counts, not a harm forecast.',
    match: /\bhallucinat/i,
  },
  {
    id: 'prompt-injection',
    name: 'Prompt injection',
    description: 'Prompt-injection defense and exploit stories scored in the newsroom or archive — not a threat forecast.',
    match: /\bprompt[- ]injection\b/i,
  },
  {
    id: 'moe',
    name: 'Mixture of experts',
    description: 'Mixture-of-experts architecture stories scored in the newsroom or archive.',
    match: /\b(mixture[- ]of[- ]experts|\bMoEs?\b)\b/i,
  },
  {
    id: 'world-models',
    name: 'World models',
    description: 'World-model and generative-environment research stories scored in the newsroom or archive.',
    match: /\bworld models?\b/i,
  },
  {
    id: 'copyright',
    name: 'AI copyright',
    description: 'Copyright, fair-use, and training-data lawsuit stories naming AI systems — coverage counts, not legal advice.',
    match: /\b(copyright(?:ed|s)?|fair use|training data (?:lawsuit|suit|case)|ai (?:copyright|lawsuit))\b/i,
  },
  {
    id: 'diffusion',
    name: 'Diffusion models',
    description: 'Diffusion-model and image-generation architecture stories scored in the newsroom or archive.',
    match: /\b(diffusion models?|latent diffusion|stable diffusion)\b/i,
  },
  {
    id: 'embeddings',
    name: 'Embeddings',
    description: 'Embedding, vector-search, and semantic-search stories scored in the newsroom or archive.',
    match: /\b(embeddings?|vector (?:db|database|search)|semantic search)\b/i,
  },
  {
    id: 'guardrails',
    name: 'AI guardrails',
    description: 'Guardrail and content-filter product stories scored in the newsroom or archive — not a harm forecast.',
    match: /\b(guardrails?|content filter|safety filter)\b/i,
  },
  {
    id: 'context-window',
    name: 'Context windows',
    description: 'Long-context and context-window stories scored in the newsroom or archive.',
    match: /\b(context windows?|long context|1m context|million.?token context)\b/i,
  },
  {
    id: 'ai-search',
    name: 'AI search',
    description: 'AI search and answer-engine stories scored in the newsroom or archive — product coverage, not a ranking claim.',
    match: /\b(ai (?:search|overview)|perplexity|searchgpt|chatgpt search)\b/i,
  },
  {
    id: 'multi-agent',
    name: 'Multi-agent systems',
    description: 'Multi-agent and agent-swarm stories scored in the newsroom or archive — coverage counts, not a capability forecast.',
    match: /\b(multi[- ]agent|agent swarm|swarm of agents)\b/i,
  },
  {
    id: 'deepfakes',
    name: 'Deepfakes',
    description: 'Deepfake and synthetic-media stories scored in the newsroom or archive — not a harm forecast.',
    match: /\b(deepfakes?|deep[- ]fake|synthetic media)\b/i,
  },
  {
    id: 'slm',
    name: 'Small language models',
    description: 'Small and on-device language-model stories scored in the newsroom or archive.',
    match: /\b(small language models?|\bslms?\b|on[- ]device (?:llm|ai))\b/i,
  },
  {
    id: 'ai-science',
    name: 'AI for science',
    description: 'Scientific-discovery and AI-for-science stories scored in the newsroom or archive.',
    match: /\b(ai for science|scientific discovery|alphafold|materials discovery)\b/i,
  },
  {
    id: 'speculative-decoding',
    name: 'Speculative decoding',
    description: 'Speculative-decoding inference stories scored in the newsroom or archive.',
    match: /\bspeculative decoding\b/i,
  },
  {
    id: 'kv-cache',
    name: 'KV cache',
    description: 'KV-cache and inference-memory stories scored in the newsroom or archive.',
    match: /\bkv[- ]?cache\b/i,
  },
  {
    id: 'ai-act',
    name: 'EU AI Act',
    description: 'EU AI Act and related statute stories scored in the newsroom or archive — coverage counts, not legal advice.',
    match: /\b(eu ai act|\bai act\b)\b/i,
  },
  {
    id: 'autonomous-vehicles',
    name: 'Autonomous vehicles',
    description: 'Self-driving and robotaxi stories scored in the newsroom or archive.',
    match: /\b(self[- ]driving|autonomous (?:vehicle|car|driving)|waymo|robotaxi)\b/i,
  },
  {
    id: 'ai-music',
    name: 'AI music',
    description: 'AI music and generative-audio product stories scored in the newsroom or archive.',
    match: /\b(ai music|suno|udio|music generat(?:ion|ive|ors?)?)\b/i,
  },
  {
    id: 'synthetic-data',
    name: 'Synthetic data',
    description: 'Synthetic-data training stories scored in the newsroom or archive.',
    match: /\b(synthetic data|synth(?:etic)?[- ]?data|synthetic training)\b/i,
  },
  {
    id: 'inference-cost',
    name: 'Inference cost',
    description: 'Inference-cost and serving-price stories scored in the newsroom or archive — coverage counts, not a price index.',
    match: /\b(inference cost|cost per (?:token|million))\b|\$\/mTok/i,
  },
  {
    id: 'prefer-data',
    name: 'Preference data',
    description: 'RLHF, DPO, and preference-tuning stories scored in the newsroom or archive.',
    match: /\b(preference (?:data|tuning)|direct preference|\bdpo\b|\brlhf\b)\b/i,
  },
  {
    id: 'reasoning-traces',
    name: 'Reasoning traces',
    description: 'Reasoning-trace and chain-of-thought visibility stories scored in the newsroom or archive.',
    match: /\breasoning traces?\b/i,
  },
  {
    id: 'claude-code',
    name: 'Claude Code',
    description: 'Claude Code product stories scored in the newsroom or archive — coverage counts, not a product score.',
    match: /\bclaude code\b/i,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'OpenRouter routing and marketplace stories scored in the newsroom or archive.',
    match: /\bopenrouter\b/i,
  },
  {
    id: 'huggingface',
    name: 'Hugging Face',
    description: 'Hugging Face platform and model-hub stories scored in the newsroom or archive — coverage counts, not a ranking.',
    match: /\b(hugging ?face|huggingface)\b/i,
  },
  {
    id: 'blackwell',
    name: 'Blackwell GPUs',
    description: 'NVIDIA Blackwell accelerator stories scored in the newsroom or archive.',
    match: /\bblackwell\b/i,
  },
  {
    id: 'ollama',
    name: 'Ollama',
    description: 'Ollama local-model runtime stories scored in the newsroom or archive — coverage counts, not a product score.',
    match: /\bollama\b/i,
  },
  {
    id: 'mlx',
    name: 'MLX',
    description: 'Apple MLX framework stories scored in the newsroom or archive.',
    match: /\bmlx\b/i,
  },
  {
    id: 'computer-use',
    name: 'Computer use',
    description: 'Computer-use and desktop-agent stories scored in the newsroom or archive — product coverage, not a forecast.',
    match: /\bcomputer[- ]use\b/i,
  },
  {
    id: 'voice-agents',
    name: 'Voice agents',
    description: 'Voice-agent and speech-dialogue product stories scored in the newsroom or archive — coverage counts, not a forecast.',
    match: /\b(voice agents?|speech[- ]to[- ]speech|realtime voice|voice[- ]first agents?|voice[- ]based (?:conversational )?agents?)\b/i,
  },
  {
    id: 'skills',
    name: 'Agent skills',
    description: 'Agent-skills packs and skill-routing stories scored in the newsroom or archive — coverage counts, not a product score.',
    match: /\b(agent skills?|claude skills?|skill\.md|agentskills|anthropic skills)\b/i,
  },
  {
    id: 'tsmc',
    name: 'TSMC',
    description: 'TSMC foundry and process-node stories scored in the newsroom or archive — coverage counts, not a chip forecast.',
    // Market nickname “Taiwan Semi” keeps the hub above TAG_INDEX_MIN.
    match: /\b(tsmc|taiwan semiconductor|taiwan semi)\b/i,
  },
  {
    id: 'mcp-servers',
    name: 'MCP servers',
    description: 'MCP server and Model Context Protocol server stories scored in the newsroom or archive.',
    match: /\b(mcp servers?|model context protocol servers?)\b/i,
  },
  {
    id: 'llama-cpp',
    name: 'llama.cpp',
    description: 'llama.cpp runtime stories scored in the newsroom or archive — coverage counts, not a product score.',
    match: /\b(llama\.cpp|llamacpp)\b/i,
  },
  {
    id: 'deep-research',
    name: 'Deep research',
    description: 'Deep-research agent product stories scored in the newsroom or archive — coverage counts, not a capability forecast.',
    match: /\bdeep research\b/i,
  },
  {
    id: 'lora',
    name: 'LoRA',
    description: 'LoRA and QLoRA adaptation stories scored in the newsroom or archive.',
    match: /\b(qlora|lora)\b/i,
  },
  {
    id: 'grpo',
    name: 'GRPO',
    description: 'GRPO reinforcement-learning stories scored in the newsroom or archive — method coverage, not a training score.',
    match: /\b[\w-]*grpo\b/i,
  },
  {
    id: 'rlvr',
    name: 'RLVR',
    description: 'RLVR (reinforcement learning from verifiable rewards) stories scored in the newsroom or archive — method coverage, not a training score.',
    match: /\b(rlvr|reinforcement learning (?:from|with) verifiable rewards?)\b/i,
  },
  {
    id: 'humanoid',
    name: 'Humanoid robots',
    description: 'Humanoid-robot and physical-AI stories scored in the newsroom or archive — coverage counts, not a robotics forecast.',
    match: /\bhumanoid\b/i,
  },
  {
    id: 'interpretability',
    name: 'Interpretability',
    description: 'Mechanistic interpretability and model-internals stories scored in the newsroom or archive — research coverage, not a safety score.',
    match: /\b(interpretabilit\w*|mech[- ]?interp|logit lens|circuit discovery|activation patching)\b/i,
  },
  {
    id: 'gguf',
    name: 'GGUF',
    description: 'GGUF weight-format stories scored in the newsroom or archive — coverage counts, not a format ranking.',
    match: /\bgguf\b/i,
  },
  {
    id: 'red-teaming',
    name: 'Red-teaming',
    description: 'Red-teaming and adversarial-eval stories scored in the newsroom or archive — coverage counts, not a threat forecast.',
    // jailbreak detection is adversarial-eval coverage; refuse bare “jailbreak”
    // alone (console/game false friends).
    match: /\b(red[- ]team(?:ing)?|jailbreak detection)\b/i,
  },
  {
    id: 'edge-ai',
    name: 'Edge AI',
    description: 'Edge-AI and on-device inference stories scored in the newsroom or archive.',
    // on-device AI / edge-native / edge LLM keep the hub above TAG_INDEX_MIN
    // without matching bare “edge” alone.
    match: /\b(edge ai|on[- ]device (?:llm|inference|language models?|ai)|edge[- ]native|edge llm)\b/i,
  },
  {
    id: 'sft',
    name: 'SFT',
    description: 'Supervised fine-tuning (SFT) stories scored in the newsroom or archive — method coverage, not a model score.',
    match: /\b(\bsft\b|supervised fine[- ]tun(?:e|ing|ed))\b/i,
  },
  {
    id: 'copilot',
    name: 'Copilot',
    description: 'GitHub Copilot and Microsoft Copilot product stories scored in the newsroom or archive — coverage counts, not a product score.',
    match: /\b((?:github )?copilot|microsoft copilot)\b/i,
  },
  {
    id: 'diffusion-llm',
    name: 'Diffusion LLMs',
    description: 'Diffusion language-model stories scored in the newsroom or archive — method coverage, not a capability forecast.',
    match: /\bdiffusion (?:llms?|language models?)\b/i,
  },
  {
    id: 'activation-steering',
    name: 'Activation steering',
    description: 'Activation-steering and representation-engineering stories scored in the newsroom or archive.',
    match: /\b(activation steer(?:ing)?|representation engineer(?:ing)?|contrastive activation)\b/i,
  },
  {
    id: 'rerank',
    name: 'Reranking',
    description: 'Retrieval reranking stories scored in the newsroom or archive.',
    match: /\brerank(?:er|ing)?\b/i,
  },
  {
    id: 'federated-learning',
    name: 'Federated learning',
    description: 'Federated-learning stories scored in the newsroom or archive — method coverage, not a privacy score.',
    match: /\bfederated learning\b/i,
  },
  {
    id: 'training-data',
    name: 'Training data',
    description: 'Training-data and pretraining-corpus stories scored in the newsroom or archive — coverage counts, not a dataset ranking.',
    match: /\btraining data\b/i,
  },
  {
    id: 'physical-ai',
    name: 'Physical AI',
    description: 'Physical-AI and real-world robotics stories scored in the newsroom or archive — coverage counts, not a robotics forecast.',
    match: /\bphysical ai\b/i,
  },
  {
    id: 'gui-agents',
    name: 'GUI agents',
    description: 'GUI-agent and mobile-agent stories scored in the newsroom or archive — product coverage, not a capability forecast.',
    match: /\bgui agents?\b/i,
  },
  {
    id: 'tool-calling',
    name: 'Tool calling',
    description: 'Tool-calling and tool-use API stories scored in the newsroom or archive.',
    match: /\btool[- ]call(?:ing|s)?\b/i,
  },
  {
    id: 'long-context',
    name: 'Long context',
    description: 'Long-context model and serving stories scored in the newsroom or archive.',
    match: /\blong[- ]context\b/i,
  },
  {
    id: 'chain-of-thought',
    name: 'Chain-of-thought',
    description: 'Chain-of-thought reasoning stories scored in the newsroom or archive — method coverage, not a capability score.',
    match: /\bchain[- ]of[- ]thought\b/i,
  },
  {
    id: 'local-llm',
    name: 'Local LLMs',
    description: 'Local-LLM and on-prem model stories scored in the newsroom or archive — coverage counts, not a product score.',
    match: /\blocal (?:llm|models?)\b/i,
  },
  {
    id: 'coding-agents',
    name: 'Coding agents',
    description: 'Coding-agent product and eval stories scored in the newsroom or archive — coverage counts, not a capability forecast.',
    match: /\bcoding[- ]agents?\b/i,
  },
  {
    id: 'agentic-workflow',
    name: 'Agentic workflows',
    description: 'Agentic-workflow and agentic-coding stories scored in the newsroom or archive.',
    match: /\bagentic (?:workflow|rag|coding|browser)\b/i,
  },
  {
    id: 'leaderboard',
    name: 'AI leaderboards',
    description: 'Model-leaderboard and arena-ranking stories scored in the newsroom or archive — coverage counts, not a ranking of this index.',
    match: /\bleaderboard\b/i,
  },
  {
    id: 'alignment',
    name: 'AI alignment',
    description: 'AI-alignment research and plan stories scored in the newsroom or archive — coverage counts, not a safety score.',
    match: /\b(ai alignment|alignment plans?|model alignment|alignment research|alignment forum|alignment leaderboard)\b/i,
  },
  {
    id: 'world-action',
    name: 'World-action models',
    description: 'World-action model and WAM robotics stories scored in the newsroom or archive — method coverage, not a robotics forecast.',
    match: /\bworld[- ]action\b/i,
  },
  {
    id: 'embodied',
    name: 'Embodied AI',
    description: 'Embodied-AI and embodied-agent stories scored in the newsroom or archive — coverage counts, not a capability forecast.',
    match: /\bembodied (?:ai|intelligence|agents?)\b/i,
  },
  {
    id: 'tts',
    name: 'Text-to-speech',
    description: 'Text-to-speech product and research stories scored in the newsroom or archive — coverage counts, not a product score.',
    match: /\b(text[- ]to[- ]speech|elevenlabs|speech synthes)\b/i,
  },
  {
    id: 'asr',
    name: 'Speech recognition',
    description: 'ASR and speech-to-text stories scored in the newsroom or archive.',
    match: /\b(speech[- ]to[- ]text|\basr\b|automatic speech recognition)\b/i,
  },
  {
    id: 'vision-language',
    name: 'Vision-language models',
    description: 'VLM and vision-language model stories scored in the newsroom or archive — coverage counts, not a capability forecast.',
    match: /\b(vision[- ]language models?|\bvlms?\b)\b/i,
  },
  {
    id: 'foundation-models',
    name: 'Foundation models',
    description: 'Foundation-model research and product stories scored in the newsroom or archive — coverage counts, not a ranking.',
    match: /\bfoundation models?\b/i,
  },
  {
    id: 'video-generation',
    name: 'Video generation',
    description: 'Video-generation model and product stories scored in the newsroom or archive — coverage counts, not a product score.',
    match: /\bvideo generat(?:ion|ors?|e[sd]?)\b/i,
  },
  {
    id: 'image-generation',
    name: 'Image generation',
    description: 'Image-generation model and product stories scored in the newsroom or archive — coverage counts, not a product score.',
    match: /\bimage generat(?:ion|ors?|e[sd]?)\b/i,
  },
  {
    id: 'model-merging',
    name: 'Model merging',
    description: 'Model-merging method stories scored in the newsroom or archive — method coverage, not a quality ranking.',
    match: /\bmodel merg(?:ing|e[sd]?)\b/i,
  },
  {
    id: 'agent-memory',
    name: 'Agent memory',
    description: 'Agent-memory research stories scored in the newsroom or archive — coverage counts, not a capability forecast.',
    match: /\bagent memory\b/i,
  },
  {
    id: 'open-source-ai',
    name: 'Open-source AI',
    description: 'Open-source AI policy and product stories scored in the newsroom or archive — coverage counts, not an openness score.',
    match: /\bopen[- ]source ai\b/i,
  },
  {
    id: 'tool-use',
    name: 'Tool use',
    description: 'Tool-use and tool-calling stories scored in the newsroom or archive — coverage counts, not a capability forecast.',
    match: /\btool[- ]use\b/i,
  },
  {
    id: 'post-training',
    name: 'Post-training',
    description: 'Post-training method and product stories scored in the newsroom or archive — coverage counts, not a capability forecast.',
    match: /\bpost[- ]?training\b/i,
  },
  {
    id: 'pretraining',
    name: 'Pre-training',
    description: 'Pre-training research stories scored in the newsroom or archive — coverage counts, not a ranking.',
    match: /\bpre[- ]?training\b/i,
  },
  {
    id: 'zero-shot',
    name: 'Zero-shot',
    description: 'Zero-shot learning and eval stories scored in the newsroom or archive.',
    match: /\bzero[- ]shot\b/i,
  },
  {
    id: 'in-context',
    name: 'In-context learning',
    description: 'In-context learning stories scored in the newsroom or archive — method coverage, not a capability forecast.',
    match: /\bin[- ]context learning\b/i,
  },
  {
    id: 'tokenization',
    name: 'Tokenization',
    description: 'Tokenization research stories scored in the newsroom or archive.',
    match: /\btokeniz(?:ation|ers?)\b/i,
  },
  {
    id: 'continual-learning',
    name: 'Continual learning',
    description: 'Continual-learning research stories scored in the newsroom or archive — coverage counts, not a capability forecast.',
    match: /\bcontinual learning\b/i,
  },
  {
    id: 'sparsity',
    name: 'Model sparsity',
    description: 'Sparse-model and sparsity research stories scored in the newsroom or archive — method coverage, not a quality ranking.',
    match: /\b(?:model )?sparsity\b|\bsparse (?:attention|models?)\b/i,
  },
  {
    id: 'knowledge-graphs',
    name: 'Knowledge graphs',
    description: 'Knowledge-graph and KG-embedding stories scored in the newsroom or archive.',
    match: /\bknowledge graphs?\b/i,
  },
  {
    id: 'research-agents',
    name: 'Research agents',
    description: 'Research-agent product and paper stories scored in the newsroom or archive — coverage counts, not a capability forecast.',
    match: /\bresearch agents?\b/i,
  },
  {
    id: 'system-prompts',
    name: 'System prompts',
    description: 'System-prompt product and research stories scored in the newsroom or archive.',
    match: /\bsystem prompts?\b/i,
  },
  {
    id: 'ai-infrastructure',
    name: 'AI infrastructure',
    description: 'AI-infrastructure buildout stories scored in the newsroom or archive — coverage counts, not a capacity forecast.',
    match: /\bai infrastructure\b/i,
  },
  {
    id: 'robot-learning',
    name: 'Robot learning',
    description: 'Robot-learning research stories scored in the newsroom or archive — coverage counts, not a robotics forecast.',
    match: /\brobot learning\b/i,
  },
  {
    id: 'frontier-models',
    name: 'Frontier models',
    description: 'Frontier-model product and policy stories scored in the newsroom or archive — coverage counts, not a capability ranking.',
    match: /\bfrontier models?\b/i,
  },
  {
    id: 'small-models',
    name: 'Small models',
    description: 'Small-model and small-LM stories scored in the newsroom or archive — coverage counts, not a size ranking.',
    match: /\bsmall (?:language )?models?\b/i,
  },
  {
    id: 'open-models',
    name: 'Open models',
    description: 'Open-model release and strategy stories scored in the newsroom or archive — coverage counts, not an openness score.',
    match: /\bopen models?\b/i,
  },
  {
    id: 'generative-ai',
    name: 'Generative AI',
    description: 'Generative-AI product and policy stories scored in the newsroom or archive — coverage counts, not a harm forecast.',
    match: /\bgenerative ai\b/i,
  },
  {
    id: 'reasoning-models',
    name: 'Reasoning models',
    description: 'Reasoning-model research and product stories scored in the newsroom or archive — coverage counts, not a capability forecast.',
    match: /\breasoning models?\b/i,
  },
  {
    id: 'voice-ai',
    name: 'Voice AI',
    description: 'Voice-AI product stories scored in the newsroom or archive — coverage counts, not a product score.',
    match: /\bvoice ai\b/i,
  },
  {
    id: 'conversational-ai',
    name: 'Conversational AI',
    description: 'Conversational-AI product stories scored in the newsroom or archive — coverage counts, not a product score.',
    match: /\bconversational ai\b/i,
  },
  {
    id: 'audio-generation',
    name: 'Audio generation',
    description: 'Audio-generation and text-to-audio stories scored in the newsroom or archive — coverage counts, not a product score.',
    // text-to-speech is the same product class; refuse bare “TTS” (test-time
    // scaling false friend).
    match: /\b(audio generat(?:ion|ors?|e[sd]?)|text[- ]to[- ]audio|text[- ]to[- ]speech)\b/i,
  },
  {
    id: 'ai-chips',
    name: 'AI chips',
    description: 'AI-chip and custom-accelerator stories scored in the newsroom or archive — coverage counts, not a supply forecast.',
    match: /\bai chips?\b/i,
  },
  {
    id: 'ai-regulation',
    name: 'AI regulation',
    description: 'AI-regulation policy stories scored in the newsroom or archive — coverage counts, not a compliance score.',
    // Statute forms (EU AI Act / AI Act) share the policy head term; overlap
    // with /tags/ai-act is intentional — same stories can carry both tags.
    match: /\b(ai regulat\w*|eu ai act|\bai act\b)\b/i,
  },
  {
    id: 'artificial-analysis',
    name: 'Artificial Analysis',
    description: 'Artificial Analysis leaderboard and index stories scored in the newsroom or archive — coverage counts, not a ranking of this index.',
    match: /\bartificial analysis\b/i,
  },
  {
    id: 'humanoid-robots',
    name: 'Humanoid robots',
    description: 'Humanoid-robot product and research stories scored in the newsroom or archive — coverage counts, not a robotics forecast.',
    match: /\bhumanoid robots?\b/i,
  },
  {
    id: 'transformers',
    name: 'Transformers',
    description: 'Transformer-architecture research stories scored in the newsroom or archive — method coverage, not a capability forecast.',
    match: /\b(transformer (?:architecture|models?|blocks?|layers?)|vision transformers?|language transformers?)\b/i,
  },
  {
    id: 'self-attention',
    name: 'Self-attention',
    description: 'Self-attention research stories scored in the newsroom or archive — method coverage, not a capability forecast.',
    match: /\bself[- ]attention\b/i,
  },
  {
    id: 'openai-codex',
    name: 'OpenAI Codex',
    description: 'OpenAI Codex CLI and hackathon stories scored in the newsroom or archive — coverage counts, not a product score.',
    // “OpenAI Codex” without a CLI/hackathon suffix still names the product;
    // bare Codex stays refused (false friends).
    match: /\b((?:openai )?codex (?:cli|hackathon|agent|update|app)|codex cli|openai codex)\b/i,
  },
  {
    id: 'reward-models',
    name: 'Reward models',
    description: 'Reward-model research stories scored in the newsroom or archive — method coverage, not a safety score.',
    match: /\breward models?\b/i,
  },
  {
    id: 'reinforcement-learning',
    name: 'Reinforcement learning',
    description: 'Reinforcement-learning research stories scored in the newsroom or archive — method coverage, not a capability forecast.',
    match: /\b(reinforcement learning|online rl|offline rl|rl (?:for|from|training|policy|agent|hf))\b/i,
  },
  {
    id: 'vision-language-action',
    name: 'Vision-language-action',
    description: 'VLA and vision-language-action robotics stories scored in the newsroom or archive — coverage counts, not a robotics forecast.',
    match: /\b(vision[- ]language[- ]action|\bvlas?\b)\b/i,
  },
  {
    id: 'flow-matching',
    name: 'Flow matching',
    description: 'Flow-matching generative-model stories scored in the newsroom or archive — method coverage, not a quality ranking.',
    match: /\bflow matching\b/i,
  },
  {
    id: 'text-to-image',
    name: 'Text-to-image',
    description: 'Text-to-image model and product stories scored in the newsroom or archive — coverage counts, not a product score.',
    match: /\btext[- ]to[- ]image\b/i,
  },
  {
    id: 'imitation-learning',
    name: 'Imitation learning',
    description: 'Imitation-learning research stories scored in the newsroom or archive — method coverage, not a capability forecast.',
    match: /\b(imitation learning|behavioral cloning)\b/i,
  },
  {
    id: 'locomotion',
    name: 'Robot locomotion',
    description: 'Robot-locomotion research stories scored in the newsroom or archive — coverage counts, not a robotics forecast.',
    match: /\blocomotion\b/i,
  },
  {
    id: 'self-supervised',
    name: 'Self-supervised learning',
    description: 'Self-supervised learning research stories scored in the newsroom or archive — method coverage, not a capability forecast.',
    match: /\bself[- ]supervised\b/i,
  },
  {
    id: 'latent-space',
    name: 'Latent space',
    description: 'Latent-space research stories scored in the newsroom or archive — method coverage, not a quality ranking.',
    match: /\blatent space\b/i,
  },
  {
    id: 'autoencoders',
    name: 'Autoencoders',
    description: 'Autoencoder research stories scored in the newsroom or archive — method coverage, not a quality ranking.',
    match: /\bautoencoders?\b/i,
  },
  {
    id: 'diffusion-transformer',
    name: 'Diffusion transformers',
    description: 'Diffusion-transformer (DiT) research stories scored in the newsroom or archive — method coverage, not a quality ranking.',
    match: /\bdiffusion transformers?\b/i,
  },
  {
    id: 'scaling-laws',
    name: 'Scaling laws',
    description: 'Scaling-laws research stories scored in the newsroom or archive — method coverage, not a forecast.',
    match: /\bscaling laws?\b/i,
  },
  {
    id: 'ai-assistants',
    name: 'AI assistants',
    description: 'AI-assistant product stories scored in the newsroom or archive — coverage counts, not a product score.',
    match: /\bai assistants?\b/i,
  },
  {
    id: 'code-generation',
    name: 'Code generation',
    description: 'Code-generation model stories scored in the newsroom or archive — coverage counts, not a capability forecast.',
    match: /\bcode generat(?:ion|ors?|e[sd]?)\b/i,
  },
  {
    id: 'linear-attention',
    name: 'Linear attention',
    description: 'Linear-attention research stories scored in the newsroom or archive — method coverage, not a capability forecast.',
    match: /\blinear attention\b/i,
  },
  {
    id: 'state-space-models',
    name: 'State-space models',
    description: 'State-space model (SSM) research stories scored in the newsroom or archive — method coverage, not a capability forecast.',
    match: /\b(state[- ]space models?|\bssms?\b)\b/i,
  },
  {
    id: 'ai-factories',
    name: 'AI factories',
    description: 'AI-factory infrastructure stories scored in the newsroom or archive — coverage counts, not a capacity forecast.',
    match: /\bai factor(?:y|ies)\b/i,
  },
  {
    id: 'multimodal-reasoning',
    name: 'Multimodal reasoning',
    description: 'Multimodal-reasoning research stories scored in the newsroom or archive — method coverage, not a capability forecast.',
    match: /\bmultimodal reasoning\b/i,
  },
  {
    id: 'model-pruning',
    name: 'Model pruning',
    description: 'Model-pruning research stories scored in the newsroom or archive — method coverage, not a quality ranking.',
    match: /\b(?:model |weight |structured |unstructured |semi[- ]structured |llm )?pruning\b/i,
  },
  {
    id: 'peft',
    name: 'PEFT',
    description: 'Parameter-efficient fine-tuning (PEFT) stories scored in the newsroom or archive — method coverage, not a quality ranking.',
    match: /\b(\bpeft\b|parameter[- ]efficient)\b/i,
  },
  {
    id: 'test-time-training',
    name: 'Test-time training',
    description: 'Test-time training research stories scored in the newsroom or archive — method coverage, not a capability forecast.',
    match: /\btest[- ]time train(?:ing|ed)\b/i,
  },
  {
    id: 'gaussian-splatting',
    name: 'Gaussian splatting',
    description: '3D Gaussian splatting research stories scored in the newsroom or archive — method coverage, not a quality ranking.',
    match: /\b(?:3d )?gaussian splatting\b/i,
  },
  {
    id: 'domain-adaptation',
    name: 'Domain adaptation',
    description: 'Domain-adaptation research stories scored in the newsroom or archive — method coverage, not a capability forecast.',
    match: /\bdomain adaptation\b/i,
  },
  {
    id: 'llm-agents',
    name: 'LLM agents',
    description: 'LLM-agent product and research stories scored in the newsroom or archive — coverage counts, not a capability forecast.',
    match: /\bllm agents?\b/i,
  },
  {
    id: 'on-policy-distillation',
    name: 'On-policy distillation',
    description: 'On-policy distillation research stories scored in the newsroom or archive — method coverage, not a quality ranking.',
    match: /\bon[- ]policy distillation\b/i,
  },
  {
    id: 'time-series',
    name: 'Time series',
    description: 'Time-series forecasting and foundation-model stories scored in the newsroom or archive — coverage counts, not a forecast score.',
    match: /\btime[- ]series\b/i,
  },
  {
    id: 'self-distillation',
    name: 'Self-distillation',
    description: 'Self-distillation research stories scored in the newsroom or archive — method coverage, not a quality ranking.',
    match: /\bself[- ]distillation\b/i,
  },
  {
    id: 'video-world-models',
    name: 'Video world models',
    description: 'Video world-model research stories scored in the newsroom or archive — method coverage, not a capability forecast.',
    match: /\bvideo world models?\b/i,
  },
  {
    id: 'machine-unlearning',
    name: 'Machine unlearning',
    description: 'Machine-unlearning research stories scored in the newsroom or archive — method coverage, not a compliance score.',
    match: /\b(machine )?unlearning\b/i,
  },
  {
    id: 'neural-networks',
    name: 'Neural networks',
    description: 'Neural-network research stories scored in the newsroom or archive — method coverage, not a capability forecast.',
    match: /\bneural networks?\b/i,
  },
  {
    id: 'self-improving-ai',
    name: 'Self-improving AI',
    description: 'Self-improving AI research stories scored in the newsroom or archive — coverage counts, not a capability forecast.',
    match: /\bself[- ]improving\b/i,
  },
  {
    id: 'provenance',
    name: 'AI provenance',
    description: 'AI content-provenance stories scored in the newsroom or archive — coverage counts, not a compliance score.',
    match: /\bprovenance\b/i,
  },
  {
    id: 'sparse-attention',
    name: 'Sparse attention',
    description: 'Sparse-attention research stories scored in the newsroom or archive — method coverage, not a capability forecast.',
    match: /\bsparse attention\b/i,
  },
  {
    id: 'synthid',
    name: 'SynthID',
    description: 'SynthID watermarking stories scored in the newsroom or archive — coverage counts, not a provenance score.',
    match: /\bsynthid\b/i,
  },
  {
    id: 'dexterous-manipulation',
    name: 'Dexterous manipulation',
    description: 'Dexterous-manipulation robotics stories scored in the newsroom or archive — coverage counts, not a robotics forecast.',
    match: /\bdexterous\b/i,
  },
  {
    id: 'protein-design',
    name: 'Protein design',
    description: 'AI protein-design stories scored in the newsroom or archive — coverage counts, not a science forecast.',
    match: /\b(protein (?:design|folding)|alphafold)\b/i,
  },
  {
    id: 'drug-discovery',
    name: 'Drug discovery',
    description: 'AI drug-discovery stories scored in the newsroom or archive — coverage counts, not a science forecast.',
    match: /\bdrug discovery\b/i,
  },
  {
    id: 'agent-skills',
    name: 'Agent skills',
    description: 'Agent-skill and Claude-Skills marketplace stories scored in the newsroom or archive — coverage counts, not a capability forecast.',
    match: /\b(agent skills?|Claude Skills?)\b/i,
  },
  {
    id: 'neoclouds',
    name: 'Neoclouds',
    description: 'Neocloud GPU-rental and AI-infra provider stories scored in the newsroom or archive — coverage counts, not a vendor ranking.',
    match: /\bneoclouds?\b/i,
  },
  {
    id: 'ai-slop',
    name: 'AI slop',
    description: 'AI-slop and low-quality generative-flood stories scored in the newsroom or archive — coverage counts, not a harm forecast.',
    match: /\bAI slop\b/i,
  },
  {
    id: 'gulf-ai',
    name: 'Gulf AI investment',
    description: 'Gulf-region AI capital and SoftBank/Gulf fund stories scored in the newsroom or archive — coverage counts, not financial advice.',
    match: /\bGulf\b.{0,60}\b(AI|OpenAI|SoftBank|fund)\b|\b(AI|OpenAI|SoftBank)\b.{0,60}\bGulf\b/i,
  },
  {
    id: 'agentic-ai',
    name: 'Agentic AI',
    description: 'Agentic-AI product and research stories scored in the newsroom or archive — coverage counts, not a capability forecast.',
    match: /\bagentic AI\b/i,
  },
  {
    id: 'ai-security',
    name: 'AI security',
    description: 'AI-security product and research stories scored in the newsroom or archive — coverage counts, not a harm forecast.',
    match: /\bAI security\b/i,
  },
  {
    id: 'ai-factories',
    name: 'AI factories',
    description: 'AI-factory datacentre and optics buildout stories scored in the newsroom or archive — coverage counts, not a capacity forecast.',
    match: /\bAI factor(?:y|ies)\b/i,
  },
  {
    id: 'amazon-bedrock',
    name: 'Amazon Bedrock',
    description: 'Amazon Bedrock / AWS Bedrock product stories scored in the newsroom or archive — coverage counts, not a vendor ranking.',
    match: /\b(?:Amazon |AWS )?Bedrock\b/i,
  },
  {
    id: 'claude-opus',
    name: 'Claude Opus',
    description: 'Claude Opus model stories scored in the newsroom or archive — coverage counts, not a capability ranking.',
    match: /\bClaude Opus\b/i,
  },
  {
    id: 'claude-haiku',
    name: 'Claude Haiku',
    description: 'Claude Haiku model stories scored in the newsroom or archive — coverage counts, not a capability ranking.',
    match: /\bClaude Haiku\b/i,
  },
  {
    id: 'intelligent-ui',
    name: 'Intelligent UI',
    description: 'OpenAI Intelligent UI / ChatGPT interactive-response stories scored in the newsroom or archive — coverage counts, not a product score.',
    match: /\bIntelligent UI\b/i,
  },
  {
    id: 'gpt-6',
    name: 'GPT-6',
    description: 'GPT-6 / GPT-6.x product stories scored in the newsroom or archive — coverage counts, not a capability ranking.',
    match: /\bGPT-6(?:\.\d+)?\b/i,
  },
  {
    id: 'emergency-brake',
    name: 'AI emergency brake',
    description: 'Emergency-brake-on-AI policy and Nadella-quote stories scored in the newsroom or archive — coverage counts, not a containment forecast.',
    match: /\bEmergency Brake\b/i,
  },
  {
    id: 'big-tech',
    name: 'Big Tech AI',
    description: 'Big Tech AI race and capital stories scored in the newsroom or archive — coverage counts, not a vendor ranking.',
    match: /\bBig Tech\b/i,
  },
  {
    id: 'gpt-6-astra',
    name: 'GPT-6 Astra',
    description: 'GPT-6 Astra / GPT-6.1 Astra product stories scored in the newsroom or archive — coverage counts, not a capability ranking.',
    match: /\bGPT-6(?:\.1)? Astra\b/i,
  },
  {
    id: 'gemini-4',
    name: 'Gemini 4',
    description: 'Gemini 4 / Gemini 4 Argon / Carbon product stories scored in the newsroom or archive — coverage counts, not a capability ranking.',
    match: /\bGemini[- ]?4(?:\.\d+)?\b/i,
  },
  {
    id: 'ai-waiver',
    name: 'AI waiver',
    description: 'AI-waiver and likeness-consent stories scored in the newsroom or archive — coverage counts, not a legal forecast.',
    match: /\bAI [Ww]aiver\b/i,
  },
  {
    id: 'openai-agents',
    name: 'OpenAI agents',
    description: 'OpenAI agent product and incident stories scored in the newsroom or archive — coverage counts, not an autonomy forecast.',
    match: /\bOpenAI agents?\b/i,
  },
  {
    id: 'ai-bubble',
    name: 'AI bubble',
    description: 'AI-bubble and valuation-froth stories scored in the newsroom or archive — coverage counts, not a crash forecast.',
    match: /\bAI bubble\b/i,
  },
  {
    id: 'openai-revenue',
    name: 'OpenAI revenue',
    description: 'OpenAI revenue and run-rate stories scored in the newsroom or archive — coverage counts, not a valuation forecast.',
    match: /\bOpenAI [Rr]evenue\b/i,
  },
  {
    id: 'recursive-self-improvement',
    name: 'Recursive self-improvement',
    description: 'Recursive-self-improvement research stories scored in the newsroom or archive — coverage counts, not an autonomy forecast.',
    match: /\b[Rr]ecursive [Ss]elf(?:[- ][Ii]mprovement)?\b/i,
  },
]);

const BY_ID = new Map(TOPIC_DEFS.map((t) => [t.id, t]));

const STYLE = `<style>
.tg{max-width:78ch}
.tg__k{font:600 var(--t-xs)/1.3 var(--mono);color:var(--ink-faint);letter-spacing:.04em;text-transform:uppercase}
.tg__lede{font:400 var(--t-base)/1.55 var(--sans);color:var(--ink-dim);max-width:68ch}
.tg__stat{display:flex;flex-wrap:wrap;gap:14px 22px;margin:18px 0;padding:14px 0;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)}
.tg__stat b{font:700 var(--t-xl)/1 var(--mono);color:var(--ink)}
.tg__stat span{display:block;font:500 var(--t-xs)/1.3 var(--mono);color:var(--ink-faint);margin-top:4px}
.tg__list{list-style:none;padding:0;margin:16px 0 0;display:grid;gap:10px}
.tg__list li{display:grid;grid-template-columns:1fr auto;gap:4px 12px;padding:10px 0;border-bottom:1px solid var(--rule)}
.tg__list a{grid-column:1;color:var(--ink);font:600 var(--t-base)/1.35 var(--sans);text-decoration:none}
.tg__list a:hover{text-decoration:underline}
.tg__meta{grid-column:1;font:400 var(--t-xs)/1.3 var(--mono);color:var(--ink-faint)}
.tg__sc{grid-column:2;grid-row:1/span 2;align-self:center;font:700 var(--t-lg)/1 var(--mono)}
.tg__nav{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 0}
.tg__nav a{font:600 var(--t-sm)/1.3 var(--sans);padding:6px 10px;border:1px solid var(--rule);border-radius:6px;color:var(--ink);text-decoration:none}
.tg__nav a:hover{background:var(--bg-sunken)}
</style>`;

function clip(text, max) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const at = cut.lastIndexOf(' ');
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,.;:–—-]+$/, '')}…`;
}

function newsItems(ctx) {
  return (ctx.news && Array.isArray(ctx.news.items)) ? ctx.news.items : [];
}

function haystack(it) {
  return `${it?.title || ''} ${it?.summary || ''}`;
}

export function tagPath(id) {
  return `/tags/${String(id || '').toLowerCase()}.html`;
}

export function tagById(id) {
  return BY_ID.get(String(id || '').toLowerCase()) || null;
}

export function itemMatchesTag(it, topic) {
  if (!it || !topic || !topic.match) return false;
  return topic.match.test(haystack(it));
}

export function itemsForTag(ctx, id) {
  const topic = tagById(id);
  if (!topic) return [];
  return newsItems(ctx)
    .filter((it) => itemMatchesTag(it, topic))
    .slice()
    .sort((a, b) => String(b.published_at || '').localeCompare(String(a.published_at || '')));
}

/** Older scored stories matching this tag, kept in the durable item archive. */
export function archiveItemsForTag(ctx, id) {
  const topic = tagById(id);
  if (!topic) return [];
  const archived = Array.isArray(ctx.itemArchive) ? ctx.itemArchive : [];
  return archived
    .filter((it) => itemMatchesTag(it, topic))
    .slice()
    .sort((a, b) => String(b.published_at || '').localeCompare(String(a.published_at || '')));
}

/** Live + archive matches — archive can keep a tag hub alive after the window rolls. */
export function tagStoryCount(ctx, id) {
  return itemsForTag(ctx, id).length + archiveItemsForTag(ctx, id).length;
}

export function tagIndexable(ctx, id) {
  return tagStoryCount(ctx, id) >= TAG_INDEX_MIN;
}

export function indexableTags(ctx) {
  return TOPIC_DEFS
    .map((t) => {
      const live = itemsForTag(ctx, t.id).length;
      const archived = archiveItemsForTag(ctx, t.id).length;
      return { ...t, live, archived, count: live + archived };
    })
    .filter((t) => t.count >= TAG_INDEX_MIN)
    .sort((a, b) => (b.count - a.count) || a.name.localeCompare(b.name));
}

/** Tags that clear the gate for one story — used on item pages. */
export function tagsForItem(ctx, item) {
  return TOPIC_DEFS.filter((t) => itemMatchesTag(item, t) && tagIndexable(ctx, t.id));
}

function storyRows(ctx, items) {
  return items.slice(0, TAG_LIST_CAP).map((it) => `<li>
  <a href="${esc(ctx.href(`/item/${slugFor(it)}.html`))}">${esc(it.title)}</a>
  <span class="tg__meta">${esc(String(it.source || '').toUpperCase())}
    · <time datetime="${esc(it.published_at || '')}">${esc(utc(it.published_at))}</time>
    ${it.pillar ? ` · ${esc(it.pillar)}` : ''}</span>
  ${Number.isFinite(it.score) ? `<span class="tg__sc num">${esc(num(it.score, 1))}</span>` : '<span class="tg__sc">—</span>'}
</li>`).join('');
}

export function renderTag(ctx, id) {
  const topic = tagById(id);
  if (!topic) {
    return page({
      ctx,
      path: tagPath(id),
      title: `Tag not in this build · ${brand.NAME}`,
      description: `No topic page for ${id}.`,
      noindex: true,
      main: `${STYLE}<article class="tg prose"><h1>Not in this build</h1><p>This topic is not in the published tag list.</p></article>`,
    });
  }

  const items = itemsForTag(ctx, topic.id);
  const archivedAll = archiveItemsForTag(ctx, topic.id);
  const older = archivedAll.slice(0, 12);
  const total = items.length + archivedAll.length;
  const path = tagPath(topic.id);
  // Head-term title: people search “{topic} AI stories” / topic doom score.
  const title = `What has ${brand.NAME} scored about ${topic.name}? AI stories, not a topic score`;
  const description = clip(
    `${total} scored stories about ${topic.name} on ${brand.NAME} (${items.length} in the live window). ${topic.description} Tempo, not a forecast.`,
    160,
  );
  // Tip #290: section H2s are question-shaped and mirrored in FAQ (§3.3).
  const windowQ = `Which scored stories are tagged ${topic.name} in this window?`;
  const olderQ = `Which older scored stories are tagged ${topic.name}?`;
  const othersQ = 'Which other tags have scored stories?';
  const others = indexableTags(ctx).filter((t) => t.id !== topic.id);
  const faq = [
    [`What has ${brand.NAME} scored about ${topic.name}?`,
      `${total} scored stories match this published needle on ${brand.NAME} (${items.length} in the live window${archivedAll.length ? `, ${archivedAll.length} older in the archive` : ''}). ${topic.description}`],
    [windowQ,
      items.length
        ? `${items.length} scored ${items.length === 1 ? 'story' : 'stories'} matched this published needle in the current window. A tag page lists headlines — not a topic doom score.`
        : 'No scored story matched this tag in the current window.'],
    ...(older.length
      ? [[olderQ,
        'Kept in the permanent archive after they left the live window. Still scored stories — not a forecast.']]
      : []),
    ...(others.length
      ? [[othersQ,
        `Other published tags that clear the substance gate, each linking What has ${brand.NAME} scored about that tag?`]]
      : []),
    [`Does ${brand.NAME} publish a ${topic.name} doom score?`,
      `No. ${brand.DISCLAIMER_SHORT} A tag page lists matching headlines — not a probability of harm and not a ranking of the companies named.`],
  ];
  const faqHtml = faq.map(([q, a]) => `
  <h3>${esc(q)}</h3>
  <p>${esc(a)}</p>`).join('');
  const olderBlock = older.length
    ? `<h2 id="older">${esc(olderQ)}</h2>
  <p class="tg__lede">Kept in the permanent archive after they left the live window. Still scored stories — not a forecast.</p>
  <ol class="tg__list">${storyRows(ctx, older)}</ol>
  <p class="fresh__key"><a href="${esc(ctx.href('/item/archive.html'))}">Which older AI stories has ${esc(brand.NAME)} kept in the archive?</a></p>`
    : '';

  const main = `${STYLE}
<article class="tg prose">
  <p class="tg__k"><a href="${esc(ctx.href('/news.html'))}">Which AI stories has ${esc(brand.NAME)} scored in this window?</a> · <a href="${esc(ctx.href('/tags/'))}">Which AI news tags have ${esc(brand.NAME)} pages?</a> · <a href="${esc(ctx.href('/tags.html'))}">Which AI tags has ${esc(brand.NAME)} scored stories about?</a></p>
  <h1>What has ${esc(brand.NAME)} scored about ${esc(topic.name)}?</h1>
  <p class="tg__lede">${esc(topic.description)} A tag page lists scored stories whose title or summary matched a published needle — not a probability of harm and not a ranking of the companies named.</p>
  <div class="tg__stat" role="group" aria-label="Tag totals">
    <div><b class="num">${esc(String(items.length))}</b><span>Scored stories in window</span></div>
    ${archivedAll.length ? `<div><b class="num">${esc(String(archivedAll.length))}</b><span>Older in archive</span></div>` : ''}
  </div>
  <h2 id="window">${esc(windowQ)}</h2>
  ${items.length
    ? `<ol class="tg__list">${storyRows(ctx, items)}</ol>`
    : '<p>No scored story matched this tag in the current window.</p>'}
  ${items.length > TAG_LIST_CAP
    ? `<p class="fresh__key">${esc(String(items.length - TAG_LIST_CAP))} more on <a href="${esc(ctx.href('/news.html'))}">Which AI stories has ${esc(brand.NAME)} scored in this window?</a>.</p>`
    : `<p class="fresh__key"><a href="${esc(ctx.href('/news.html'))}">Which AI stories has ${esc(brand.NAME)} scored in this window?</a></p>`}
  ${olderBlock}
  <h2 id="faq">What questions do people actually ask?</h2>
  ${faqHtml}
  ${others.length ? `<h2 id="other-tags">${esc(othersQ)}</h2>
  <nav class="tg__nav" aria-label="Other tags">${others.map((t) => `<a href="${esc(ctx.href(tagPath(t.id)))}">What has ${esc(brand.NAME)} scored about ${esc(t.name)}?</a>`).join('')}</nav>` : ''}
</article>`;
  return page({
    ctx,
    path,
    title,
    description,
    noindex: total < TAG_INDEX_MIN,
    jsonld: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      url: ctx.url(path),
      description,
      isPartOf: { '@type': 'WebSite', name: brand.PUBLICATION, url: ctx.url('/') },
      about: { '@type': 'Thing', name: topic.name, description: topic.description },
      speakable: speakable(['h1', '.tg__lede']),
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: Math.min(items.length, TAG_LIST_CAP),
        itemListElement: items.slice(0, TAG_LIST_CAP).map((it, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: ctx.url(`/item/${slugFor(it)}.html`),
          name: it.title,
        })),
      },
    }, breadcrumbs(ctx, [
      { name: `Which AI stories has ${brand.NAME} scored in this window?`, path: '/news.html' },
      { name: `Which AI news tags have ${brand.NAME} pages?`, path: '/tags/' },
      { name: `What has ${brand.NAME} scored about ${topic.name}?`, path },
    ]), {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map(([q, a]) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    }],
    main,
  });
}

export function renderIndex(ctx) {
  const tags = indexableTags(ctx);
  const path = '/tags/';
  // Head-term title: people search “AI news tags” / topic hubs.
  const title = `Which AI news tags have ${brand.NAME} pages?`;
  const description = clip(
    `${tags.length} topic hubs with at least ${TAG_INDEX_MIN} scored stories on ${brand.NAME} (live window plus archive). Each page lists those stories.`,
    160,
  );
  const faq = [
    [`Which AI news tags have ${brand.NAME} pages?`,
      `${tags.length} topics clear the substance gate of at least ${TAG_INDEX_MIN} matching headlines in the live window or archive. Each hub lists those stories — not a topic doom score.`],
    [`Does ${brand.NAME} publish a topic doom score?`,
      `No. ${brand.DISCLAIMER_SHORT} These pages count headlines that match a published needle.`],
  ];
  const faqHtml = faq.map(([q, a]) => `
  <h3>${esc(q)}</h3>
  <p>${esc(a)}</p>`).join('');
  const rows = tags.map((t) => `<li>
  <a href="${esc(ctx.href(tagPath(t.id)))}">What has ${esc(brand.NAME)} scored about ${esc(t.name)}?</a>
  <span class="tg__meta">${esc(t.name)} · ${esc(t.description)} · <span class="num">${esc(String(t.count))}</span> stories${t.archived ? ` (${esc(String(t.live))} live)` : ''}</span>
</li>`).join('');

  const main = `${STYLE}
<article class="tg prose">
  <p class="tg__k"><a href="${esc(ctx.href('/news.html'))}">Which AI stories has ${esc(brand.NAME)} scored in this window?</a> · Which AI news tags have ${esc(brand.NAME)} pages? · <a href="${esc(ctx.href('/tags.html'))}">Which AI tags has ${esc(brand.NAME)} scored stories about?</a></p>
  <h1>Which AI news tags have ${esc(brand.NAME)} pages?</h1>
  <p class="tg__lede">A topic earns a page when at least ${TAG_INDEX_MIN} scored stories match a published needle in the live window or the durable archive. Thinner matches stay on the story page only.</p>
  ${tags.length ? `<ol class="tg__list">${rows}</ol>` : '<p>No tag cleared the gate in this build.</p>'}
  <h2 id="faq">What questions do people actually ask?</h2>
  ${faqHtml}
  <p class="fresh__key">Search-shaped directory: <a href="${esc(ctx.href('/tags.html'))}">Which AI tags has ${esc(brand.NAME)} scored stories about?</a>.</p>
</article>`;

  return page({
    ctx,
    path,
    title,
    description,
    noindex: tags.length === 0,
    jsonld: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      url: ctx.url(path),
      description,
      speakable: speakable(['h1', '.tg__lede']),
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: tags.length,
        itemListElement: tags.map((t, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: ctx.url(tagPath(t.id)),
          name: `What has ${brand.NAME} scored about ${t.name}?`,
        })),
      },
    }, breadcrumbs(ctx, [
      { name: `Which AI stories has ${brand.NAME} scored in this window?`, path: '/news.html' },
      { name: `Which AI news tags have ${brand.NAME} pages?`, path },
    ]), {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map(([q, a]) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    }],
    main,
  });
}

/**
 * Skynet-shaped /tags head-term hub. Same gated topic set as /tags/,
 * different title and lede for “AI tags” / “AI news topics” queries —
 * story counts only, not a topic doom scoreboard.
 */
export function renderTags(ctx) {
  const tags = indexableTags(ctx);
  const path = '/tags.html';
  // Head-term title: people search “AI tags” / Skynet-shaped topic hubs.
  const title = `Which AI tags has ${brand.NAME} scored stories about?`;
  const description = clip(
    `${tags.length} AI topic hubs with scored-story pages on ${brand.NAME}. Each row links /tags pages — story counts only, not a topic doom score.`,
    160,
  );
  const faq = [
    [`Which AI tags has ${brand.NAME} scored stories about?`,
      `${tags.length} topic hubs clear the substance gate of at least ${TAG_INDEX_MIN} matching headlines in the live window or archive. Each page lists those stories — not a topic doom score.`],
    [`Does ${brand.NAME} publish a topic doom score?`,
      `No. ${brand.DISCLAIMER_SHORT} These pages count headlines that match a published needle (Skynet-shaped tags without timeline claims).`],
  ];
  const faqHtml = faq.map(([q, a]) => `
  <h3>${esc(q)}</h3>
  <p>${esc(a)}</p>`).join('');
  const rows = tags.map((t) => `<li>
  <a href="${esc(ctx.href(tagPath(t.id)))}">What has ${esc(brand.NAME)} scored about ${esc(t.name)}?</a>
  <span class="tg__meta">${esc(t.name)} · Topic hub · <span class="num">${esc(String(t.count))}</span> scored${t.archived ? ` (${esc(String(t.live))} live)` : ''}</span>
</li>`).join('');
  const main = `${STYLE}
<article class="tg prose">
  <p class="tg__k"><a href="${esc(ctx.href('/compare.html'))}">Which AI doom indexes can you compare?</a> · <a href="${esc(ctx.href('/tags/'))}">Which AI news tags have ${esc(brand.NAME)} pages?</a> · Which AI tags has ${esc(brand.NAME)} scored stories about?</p>
  <h1>Which AI tags has ${esc(brand.NAME)} scored stories about?</h1>
  <p class="tg__lede">${esc(brand.NAME)} does not publish a topic “doom score.” It publishes an activity index and scored stories. This page lists topic hubs that already clear the same substance gate as <a href="${esc(ctx.href('/tags/'))}">Which AI news tags have ${esc(brand.NAME)} pages?</a> — at least ${TAG_INDEX_MIN} matching headlines in the live window or archive (Skynet-shaped tags without their timeline claims).</p>
  <div class="tg__stat" role="group" aria-label="Tags hub totals">
    <div><b class="num">${esc(String(tags.length))}</b><span>Topic hubs</span></div>
  </div>
  ${tags.length ? `<ol class="tg__list">${rows}</ol>` : '<p>No tag hub cleared the gate in this build.</p>'}
  <h2 id="faq">What questions do people actually ask?</h2>
  ${faqHtml}
  <p class="fresh__key"><a href="${esc(ctx.href('/tags/'))}">Which AI news tags have ${esc(brand.NAME)} pages?</a>
     · <a href="${esc(ctx.href('/models.html'))}">Which AI models has ${esc(brand.NAME)} scored stories about?</a>
     · <a href="${esc(ctx.href('/companies.html'))}">Which AI companies has ${esc(brand.NAME)} scored stories about?</a>
     · <a href="${esc(ctx.href('/people.html'))}">Which AI people has ${esc(brand.NAME)} scored press about?</a>
     · <a href="${esc(ctx.href('/compare.html'))}">Which AI doom indexes can you compare?</a></p>
</article>`;
  return page({
    ctx,
    path,
    title,
    description,
    noindex: tags.length === 0,
    jsonld: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      url: ctx.url(path),
      description,
      speakable: speakable(['h1', '.tg__lede']),
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: tags.length,
        itemListElement: tags.map((t, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: ctx.url(tagPath(t.id)),
          name: `What has ${brand.NAME} scored about ${t.name}?`,
        })),
      },
    }, breadcrumbs(ctx, [
      { name: 'Which AI doom indexes can you compare?', path: '/compare.html' },
      { name: `Which AI tags has ${brand.NAME} scored stories about?`, path },
    ]), {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map(([q, a]) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    }],
    main,
  });
}

export function sitemapEntries(ctx) {
  const tags = indexableTags(ctx);
  if (!tags.length) return [];
  const last = (ctx.news && ctx.news.generated_at) || (ctx.state && ctx.state.generated_at);
  return [
    { loc: '/tags/', changefreq: 'hourly', priority: '0.7', lastmod: last },
    { loc: '/tags.html', changefreq: 'hourly', priority: '0.75', lastmod: last },
    ...tags.map((t) => ({
      loc: tagPath(t.id),
      changefreq: 'hourly',
      priority: '0.65',
      lastmod: last,
    })),
  ];
}
