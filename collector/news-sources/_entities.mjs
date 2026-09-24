// Fixed, published vocabularies. Everything in this file is a hand-maintained
// list, deliberately, because the whole product claim is that a stranger can
// recompute our numbers. An LLM classifier would make every score in the feed
// unfalsifiable — see docs/METHODOLOGY.md, "Every other live AI-risk index
// scores by human or model judgement."
//
// Files here beginning with `_` are helpers, not adapters. collector/news.mjs
// skips them during discovery, exactly as collector/collect.mjs does.

/**
 * Builds a case-insensitive word-boundary matcher for a list of surface forms.
 *
 * \b does not work at the edges of tokens like "GPT-5" or "o3" the way you
 * expect, so boundaries are asserted with lookarounds against the character
 * class we actually care about: a match may not be flanked by a letter or a
 * digit. That keeps "Meta" out of "Metaculus" and "AI" out of "Air" while
 * still matching "GPT-5," and "(Claude)".
 */
function surfaceRegex(forms) {
  const alternatives = forms
    .slice()
    // Longest first so "DeepSeek-R1" wins over "DeepSeek" in the same position.
    .sort((a, b) => b.length - a.length)
    .map((f) => f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`(?<![A-Za-z0-9])(?:${alternatives.join('|')})(?![A-Za-z0-9])`, 'i');
}

/**
 * Frontier labs and the model families they ship. `name` is the canonical form
 * that lands in NewsItem.entities; `forms` are the surface strings we match.
 *
 * Curated, not exhaustive. A name earns a place here if its appearance in a
 * headline is itself the news — which is the property the scoring formula's
 * entity term is trying to capture.
 */
const ENTITY_DEFS = [
  // --- labs ---
  { name: 'OpenAI', kind: 'lab', forms: ['OpenAI'] },
  { name: 'Anthropic', kind: 'lab', forms: ['Anthropic'] },
  { name: 'Google DeepMind', kind: 'lab', forms: ['DeepMind', 'Google DeepMind'] },
  { name: 'Meta AI', kind: 'lab', forms: ['Meta AI', 'FAIR', 'Meta Superintelligence'] },
  { name: 'Mistral', kind: 'lab', forms: ['Mistral AI', 'Mistral'] },
  { name: 'xAI', kind: 'lab', forms: ['xAI'] },
  { name: 'DeepSeek', kind: 'lab', forms: ['DeepSeek'] },
  { name: 'Alibaba Qwen', kind: 'lab', forms: ['Qwen', 'Alibaba Cloud', 'Tongyi'] },
  { name: 'Moonshot AI', kind: 'lab', forms: ['Moonshot AI', 'Moonshot'] },
  { name: 'Zhipu', kind: 'lab', forms: ['Zhipu', 'Z.ai'] },
  { name: 'NVIDIA', kind: 'lab', forms: ['NVIDIA', 'Nvidia'] },
  { name: 'Microsoft', kind: 'lab', forms: ['Microsoft', 'Microsoft AI', 'MSFT'] },
  { name: 'Amazon', kind: 'lab', forms: ['Amazon', 'AWS', 'Amazon Bedrock'] },
  { name: 'Apple', kind: 'lab', forms: ['Apple Intelligence'] },
  { name: 'Cohere', kind: 'lab', forms: ['Cohere'] },
  { name: 'Hugging Face', kind: 'lab', forms: ['Hugging Face', 'HuggingFace'] },
  { name: 'Stability AI', kind: 'lab', forms: ['Stability AI'] },
  { name: 'Black Forest Labs', kind: 'lab', forms: ['Black Forest Labs'] },
  { name: 'Safe Superintelligence', kind: 'lab', forms: ['Safe Superintelligence', 'SSI Inc'] },
  { name: 'Thinking Machines', kind: 'lab', forms: ['Thinking Machines'] },
  { name: 'Perplexity', kind: 'lab', forms: ['Perplexity AI', 'Perplexity'] },
  { name: 'Baidu', kind: 'lab', forms: ['Baidu'] },
  { name: 'Tencent', kind: 'lab', forms: ['Tencent'] },
  { name: 'ByteDance', kind: 'lab', forms: ['ByteDance', 'Seed-OSS'] },
  { name: 'Ai2', kind: 'lab', forms: ['Allen Institute for AI', 'AI2', 'Ai2'] },

  // --- model families ---
  { name: 'GPT', kind: 'model', forms: ['GPT-3', 'GPT-4', 'GPT-4o', 'GPT-5', 'GPT-6', 'ChatGPT', 'GPT'] },
  { name: 'o-series', kind: 'model', forms: ['o1-preview', 'o1', 'o3-mini', 'o3', 'o4-mini', 'o4'] },
  { name: 'Claude', kind: 'model', forms: ['Claude', 'Claude Code', 'Opus', 'Sonnet', 'Haiku'] },
  { name: 'Gemini', kind: 'model', forms: ['Gemini'] },
  { name: 'Gemma', kind: 'model', forms: ['Gemma'] },
  { name: 'Llama', kind: 'model', forms: ['Llama', 'LLaMA'] },
  { name: 'Grok', kind: 'model', forms: ['Grok'] },
  { name: 'Qwen', kind: 'model', forms: ['Qwen', 'Qwen2', 'Qwen3', 'QwQ'] },
  { name: 'DeepSeek-R', kind: 'model', forms: ['DeepSeek-R1', 'DeepSeek-V3', 'DeepSeek-V4'] },
  { name: 'Mixtral', kind: 'model', forms: ['Mixtral', 'Magistral', 'Devstral', 'Codestral'] },
  { name: 'Phi', kind: 'model', forms: ['Phi-3', 'Phi-4'] },
  { name: 'Command R', kind: 'model', forms: ['Command R', 'Command A'] },
  { name: 'Kimi', kind: 'model', forms: ['Kimi', 'Kimi K2'] },
  { name: 'GLM', kind: 'model', forms: ['GLM-4', 'GLM'] },
  { name: 'Nemotron', kind: 'model', forms: ['Nemotron'] },
  { name: 'Sora', kind: 'model', forms: ['Sora'] },
  { name: 'Veo', kind: 'model', forms: ['Veo'] },
  { name: 'Whisper', kind: 'model', forms: ['Whisper'] },
  { name: 'Stable Diffusion', kind: 'model', forms: ['Stable Diffusion', 'SDXL'] },
  { name: 'FLUX', kind: 'model', forms: ['FLUX.1', 'FLUX'] },
];

const COMPILED = ENTITY_DEFS.map((d) => ({ name: d.name, kind: d.kind, re: surfaceRegex(d.forms) }));

/**
 * Canonical entity names present in a piece of text, sorted and de-duplicated.
 * Sorted because NewsItem output must be byte-stable across runs
 * (CONTRACT.md §1.4) — an array whose order depended on match position would
 * make two identical runs produce different JSON.
 */
export function extractEntities(text) {
  if (!text) return [];
  const found = new Set();
  for (const { name, re } of COMPILED) {
    if (re.test(text)) found.add(name);
  }
  return [...found].sort();
}

/** Same match, but grouped, for `meta` so the entity score term is auditable. */
export function entityKinds(text) {
  const labs = [];
  const models = [];
  for (const { name, kind, re } of COMPILED) {
    if (!re.test(text)) continue;
    (kind === 'lab' ? labs : models).push(name);
  }
  return { labs: labs.sort(), models: models.sort() };
}

/**
 * Is this item about AI at all?
 *
 * Applied locally by the adapters whose upstream feed is broader than AI
 * (Techmeme) and, as a second line of defence, by the ones whose upstream
 * filter we do not control (Hacker News' Algolia query). docs/METHODOLOGY.md
 * already records why we re-filter locally rather than trust a vendor's search:
 * Polymarket's fuzzy search returned 19 live markets about a politician's
 * word count for the query "artificial general intelligence".
 *
 * Every rejection is counted and reported, so the basket is auditable rather
 * than merely trusted.
 */
const AI_TOKENS = surfaceRegex([
  'AI', 'A.I.', 'AGI', 'ASI', 'artificial intelligence', 'machine learning', 'deep learning',
  'neural network', 'neural networks', 'LLM', 'LLMs', 'large language model', 'large language models',
  'generative AI', 'GenAI', 'transformer', 'transformers', 'diffusion model', 'diffusion models',
  'chatbot', 'chatbots', 'foundation model', 'foundation models', 'frontier model', 'frontier models',
  'fine-tuning', 'inference', 'GPU', 'GPUs', 'TPU', 'datacenter', 'data center', 'superintelligence',
  'alignment', 'RLHF', 'reinforcement learning', 'multimodal', 'agentic', 'copilot', 'open-weight',
  'open weights', 'training run', 'tokens', 'benchmark', 'H100', 'H200', 'B200', 'GB200', 'MI300',
  'robotaxi', 'humanoid', 'prompt injection', 'model weights',
]);

export function isAiRelevant(text) {
  if (!text) return false;
  if (AI_TOKENS.test(text)) return true;
  // A named lab or model family in the headline is itself an AI signal even
  // when no generic AI token appears ("Anthropic raises at $350B").
  return COMPILED.some(({ re }) => re.test(text));
}

/**
 * Pillar classification by published keyword list, in fixed precedence order.
 *
 * Precedence matters and is deliberate: a story about an EU fine on a chip
 * deal is governance, not compute. Specific-and-rare beats generic-and-common,
 * so governance and markets are tested before compute, and the adapter's own
 * default is the fallback rather than the first guess.
 *
 * Returns { pillar, reason } — the reason string is written into
 * NewsItem.meta.pillar_reason so the classification can be argued with.
 */
const PILLAR_RULES = [
  {
    pillar: 'governance',
    label: 'regulatory/legal keyword',
    // PURGED, and why. The first draft of this list carried `policy`, `judge`,
    // `bill`, `privacy`, `SEC` and `EU` as bare tokens and it misfired on 12 of
    // 93 arXiv papers in one run: "Bellman Policy Optimization" and
    // "JEV-as-a-Judge" are not regulatory news, and "sec" is how a paper writes
    // seconds. Machine-learning jargon and legal vocabulary overlap badly, so
    // every ambiguous single word here has been replaced by an unambiguous
    // phrase. If a term is common in an ML abstract, it does not belong here.
    re: surfaceRegex([
      'regulation', 'regulations', 'regulator', 'regulators', 'regulatory', 'regulate',
      'AI Act', 'EU AI Act', 'executive order', 'legislation', 'lawmaker', 'lawmakers',
      'Senate', 'Congress', 'Parliament', 'European Commission', 'White House',
      'Federal Register', 'FTC', 'DOJ', 'FDA', 'Ofcom', 'antitrust', 'lawsuit', 'lawsuits',
      'sues', 'sued', 'court', 'courts', 'federal judge', 'judge ruled', 'ruling',
      'settlement', 'copyright', 'subpoena', 'moratorium', 'compliance', 'consent decree',
      'export control', 'export controls', 'sanctions', 'safety institute', 'GDPR',
      'AI policy', 'public policy', 'policymaker', 'policymakers', 'privacy law',
      'data protection', 'attorney general', 'signed into law', 'passed a bill', 'banned',
    ]),
  },
  {
    pillar: 'markets',
    label: 'prediction-market keyword',
    // NOT bare 'Manifold': manifold learning is core ML vocabulary and it
    // classified "Deep Generative Crystal Structure Prediction" as a markets
    // story. Only the platform's full name counts.
    re: surfaceRegex(['Polymarket', 'Kalshi', 'Manifold Markets', 'prediction market', 'prediction markets', 'betting odds', 'implied odds']),
  },
  {
    pillar: 'compute',
    label: 'hardware/capital keyword',
    re: surfaceRegex([
      'GPU', 'GPUs', 'TPU', 'chip', 'chips', 'silicon', 'wafer', 'fab', 'foundry', 'TSMC',
      'H100', 'H200', 'B200', 'GB200', 'MI300', 'Blackwell', 'Rubin', 'datacenter', 'data center',
      'data centre', 'capex', 'gigawatt', 'megawatt', 'power purchase', 'nuclear', 'funding round',
      'Series A', 'Series B', 'Series C', 'Series D', 'Series E', 'valuation',
      'IPO', 'acquisition', 'acquires', 'acquired', 'merger', 'earnings', 'revenue', 'billion',
      'trillion', 'investment', 'invests', 'supercomputer', 'export ban',
      // 'raises'/'raised' only with a currency attached: an abstract that
      // "raises the question" is not a funding round. 'stake' and 'cluster'
      // were removed outright — "at stake" and "cluster" are ML prose.
      'raises $', 'raised $', 'raises \u00a3', 'raises \u20ac',
    ]),
  },
];

export function classifyPillar(text, fallbackPillar) {
  for (const rule of PILLAR_RULES) {
    if (rule.re.test(text)) return { pillar: rule.pillar, reason: rule.label };
  }
  return { pillar: fallbackPillar, reason: 'source default' };
}

export const ENTITY_COUNT = ENTITY_DEFS.length;
