import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newsEligible, NEWS_WINDOW_HOURS, NEWS_SITEMAP_CAP, keywordsFor, labNeedleRe, render } from './newsSitemap.mjs';

test('newsEligible keeps only items inside the rolling window', () => {
  const now = Date.parse('2026-10-08T12:00:00Z');
  const ctx = {
    news: {
      items: [
        { id: 'new', title: 'Fresh', published_at: '2026-10-08T10:00:00Z', source: 'hn', pillar: 'attention' },
        { id: 'old', title: 'Stale', published_at: '2026-10-05T10:00:00Z', source: 'hn', pillar: 'attention' },
        { id: 'mid', title: 'Mid', published_at: '2026-10-07T01:00:00Z', source: 'arxiv', pillar: 'capability' },
      ],
    },
    url: (p) => `https://example.test${p}`,
  };
  const rows = newsEligible(ctx, now);
  assert.equal(NEWS_WINDOW_HOURS, 48);
  assert.deepEqual(rows.map((r) => r.it.id), ['new', 'mid']);
});

test('newsEligible caps and sorts newest first', () => {
  const now = Date.parse('2026-10-08T12:00:00Z');
  const items = Array.from({ length: NEWS_SITEMAP_CAP + 20 }, (_, i) => ({
    id: `i${i}`,
    title: `T${i}`,
    published_at: new Date(now - i * 60_000).toISOString(),
    source: 'hn',
  }));
  const rows = newsEligible({ news: { items } }, now);
  assert.equal(rows.length, NEWS_SITEMAP_CAP);
  assert.equal(rows[0].it.id, 'i0');
  assert.equal(rows[NEWS_SITEMAP_CAP - 1].it.id, `i${NEWS_SITEMAP_CAP - 1}`);
});

test('news-sitemap tip comments advertise full sitemap, free-tools, verify, Search Trends', () => {
  const xml = render({
    news: { items: [] },
    url: (p) => `https://siren.watch${p}`,
  });
  assert.match(xml, /<!--[^>]*Google News window/);
  assert.match(xml, /<!--[^>]*Full sitemap: https:\/\/siren\.watch\/sitemap\.xml/);
  assert.match(xml, /<!--[^>]*Free tools: https:\/\/siren\.watch\/free-tools\.html/);
  assert.match(xml, /<!--[^>]*Verify: https:\/\/siren\.watch\/verify\.html/);
  assert.match(xml, /<!--[^>]*Search Trends[^>]*https:\/\/siren\.watch\/search-trends\.html/);
  assert.match(xml, /<!--[^>]*llms\.txt/);
  assert.match(xml, /Not a doom forecast/);
  assert.doesNotMatch(xml, /probability of doom/i);
});

test('render emits a valid empty news sitemap when nothing is fresh', () => {
  const xml = render({
    news: { items: [{ id: 'old', title: 'Old', published_at: '2020-01-01T00:00:00Z' }] },
    url: (p) => `https://example.test${p}`,
  });
  assert.match(xml, /xmlns:news=/);
  assert.doesNotMatch(xml, /<url>/);
});

test('render keywords include scored entities and stay under the news cap', () => {
  assert.equal(NEWS_SITEMAP_CAP, 200);
  const xml = render({
    news: {
      items: [{
        id: 'a1',
        title: 'OpenAI ships GPT update',
        published_at: new Date().toISOString(),
        source: 'techcrunch-ai',
        pillar: 'capability',
        kind: 'press',
        entities: ['OpenAI', 'GPT'],
      }],
    },
    url: (p) => `https://example.test${p}`,
  });
  assert.match(xml, /<news:keywords>[^<]*OpenAI/);
  assert.match(xml, /artificial intelligence/);
});

test('keywordsFor puts AI head terms before pillar/source meta on thin rows', () => {
  const kw = keywordsFor({
    title: 'A thin story with no named lab',
    summary: 'No entity list.',
    pillar: 'attention',
    kind: 'press',
    source: 'bluesky-ai',
    entities: [],
  });
  const parts = kw.split(',').map((s) => s.trim());
  const aiAt = parts.indexOf('AI');
  const pillarAt = parts.indexOf('attention');
  const sourceAt = parts.indexOf('bluesky-ai');
  assert.ok(aiAt >= 0, kw);
  assert.equal(parts[0], 'AI', kw);
  assert.ok(parts.includes('artificial intelligence'), kw);
  assert.ok(parts.includes('SIREN'), kw);
  if (pillarAt >= 0) assert.ok(aiAt < pillarAt, kw);
  if (sourceAt >= 0) assert.ok(aiAt < sourceAt, kw);
});

test('keywordsFor keeps AI head terms before topic-tag names', () => {
  const kw = keywordsFor({
    title: 'New AI agents ship computer use and prompt injection defenses',
    summary: 'Agentic tool-use product with guardrails.',
    pillar: 'capability',
    kind: 'forum',
    source: 'hn',
    entities: [],
  });
  const parts = kw.split(',').map((s) => s.trim());
  const aiAt = parts.indexOf('AI');
  assert.ok(aiAt >= 0, kw);
  assert.ok(aiAt <= 1, `AI should lead (or follow only a named lab): ${kw}`);
  // Topic tags (Agents, Prompt injection, …) must not bury the head terms.
  for (const topicish of ['Agents', 'Prompt injection', 'Computer use', 'capability']) {
    const at = parts.indexOf(topicish);
    if (at >= 0) assert.ok(aiAt < at, kw);
  }
});

test('news sitemap keywords include Nemotron / Google DeepMind surfaces', () => {
  const kw = keywordsFor({
    title: 'NVIDIA Nemotron models expand as Google DeepMind ships evals',
    summary: 'Nemotron and Google DeepMind appear in coverage.',
    pillar: 'capability',
    kind: 'press',
    source: 'hn',
    entities: [],
  });
  assert.match(kw, /Nemotron/);
  assert.match(kw, /Google DeepMind|DeepMind/);
});

test('news sitemap keywords include Character.AI / Mythos / Prime Intellect surfaces', () => {
  const a = keywordsFor({
    title: 'Now that Character.AI is going bankrupt, what happens to all of its users’ data?',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'hn',
    entities: [],
  });
  assert.match(a, /Character\.AI|Character AI/);
  const b = keywordsFor({
    title: "Bank of America hired 1,000 contractors to patch software flaws exposed by Anthropic's Mythos",
    summary: 'Prime Intellect acquires Moondream; Sachin Katti and Sarah Friar also in the window.',
    pillar: 'capability',
    kind: 'press',
    source: 'hn',
    entities: [],
  });
  assert.match(b, /Mythos/);
  assert.match(b, /Prime Intellect|Moondream|Sachin Katti|Sarah Friar|Bank of America/);
});

test('news sitemap keywords include Claude Code / YouTube Music / x402 surfaces', () => {
  const a = keywordsFor({
    title: 'anthropics/claude-code v2.1.300',
    summary: '',
    pillar: 'capability',
    kind: 'release',
    source: 'github-releases',
    entities: [],
  });
  assert.match(a, /Claude Code|claude-code|Claude/);
  const a2 = keywordsFor({
    title: 'Anthropic ships Claude Code improvements for agent workflows',
    summary: '',
    pillar: 'capability',
    kind: 'press',
    source: 'hn',
    entities: [],
  });
  assert.match(a2, /Claude Code/);
  const b = keywordsFor({
    title: 'YouTube Music launches new labels as AI-generated music floods streaming platforms',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'techcrunch-ai',
    entities: [],
  });
  assert.match(b, /YouTube Music|YouTube/);
  const c = keywordsFor({
    title: 'Chainalysis Finds AI Agents Made 138 Million x402 Payments on Coinbase Base',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: [],
  });
  assert.match(c, /x402|Chainalysis|Coinbase|Base/);
});

test('news sitemap keywords promote ChatGPT / Pentagon / EDPB ahead of topic-cap drop', () => {
  const a = keywordsFor({
    title: 'Eight US states sue OpenAI, claiming ChatGPT harms children',
    summary: 'ChatGPT safety lawsuit; OpenAI, Microsoft, Anthropic, AI agents and GPUs in the roundup.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['OpenAI', 'United States'],
  });
  assert.match(a, /ChatGPT/);
  // Named labs (incl. ChatGPT + #172 Copilot alias) must beat trailing topic/meta
  // slots under the 12-cap (pillar may drop when aliases fill the row).
  const parts = a.split(', ');
  assert.match(a, /\bCopilot\b/);
  assert.ok(parts.indexOf('ChatGPT') < parts.indexOf('AI agents'), a);
  const b = keywordsFor({
    title: 'Anthropic Seeks Full Appeals Court Review of Pentagon Ban',
    summary: '',
    pillar: 'governance',
    kind: 'press',
    source: 'techmeme',
    entities: [],
  });
  assert.match(b, /Pentagon/);
  const c = keywordsFor({
    title: 'Mind the gap: IC sets expectations for AI model developers, how this differs from the EDPB',
    summary: '',
    pillar: 'governance',
    kind: 'press',
    source: 'gnews-ai',
    entities: [],
  });
  assert.match(c, /EDPB/);
});

test('news sitemap keywords add MU ticker when Micron is named (FINDABILITY #146)', () => {
  const a = keywordsFor({
    title: 'Micron, Nvidia and other chip stocks face renewed pressure as AI fears swell',
    summary: 'Memory-chip shares slide with the AI selloff.',
    pillar: 'compute',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Micron', 'NVIDIA'],
  });
  assert.match(a, /\bMicron\b/);
  assert.match(a, /\bMU\b/);
  const parts = a.split(', ');
  assert.ok(parts.includes('MU'), a);
  // Bare MU titles without Micron must not invent the ticker.
  const b = keywordsFor({
    title: 'Nasdaq futures fall on debt concerns',
    summary: 'No memory-chip lab named.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: [],
  });
  assert.doesNotMatch(b, /(^|,\s*)MU(,|$)/);
});

test('news sitemap keywords add NVDA when NVIDIA is named (FINDABILITY #161)', () => {
  const a = keywordsFor({
    title: 'How Investors May Respond To NVIDIA (NVDA) Higher AI Funding Costs',
    summary: '',
    pillar: 'compute',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['NVIDIA'],
  });
  assert.match(a, /\bNVIDIA\b/);
  assert.match(a, /\bNVDA\b/);
  const b = keywordsFor({
    title: 'Nasdaq futures fall on debt concerns',
    summary: 'No GPU maker named.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: [],
  });
  assert.doesNotMatch(b, /(^|,\s*)NVDA(,|$)/);
});

test('news sitemap keywords add Muse / Apple Intelligence / Copilot when parent named (FINDABILITY #172)', () => {
  const a = keywordsFor({
    title: 'Meta expands open-weight model releases',
    summary: 'No product codename in the headline.',
    pillar: 'capability',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Meta AI'],
  });
  assert.match(a, /\bMeta\b|\bMeta AI\b/);
  assert.match(a, /\bMuse\b/);
  const b = keywordsFor({
    title: 'Apple ships on-device AI update in China',
    summary: '',
    pillar: 'capability',
    kind: 'press',
    source: 'wires-ai',
    entities: ['Apple'],
  });
  assert.match(b, /\bApple\b/);
  assert.match(b, /Apple Intelligence/);
  const c = keywordsFor({
    title: 'Microsoft expands Azure AI enterprise deals',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Microsoft'],
  });
  assert.match(c, /\bMicrosoft\b/);
  assert.match(c, /\bCopilot\b/);
  // Unrelated titles must not invent Trends product aliases.
  const d = keywordsFor({
    title: 'Nasdaq futures fall on debt concerns',
    summary: 'No frontier lab named.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: [],
  });
  assert.doesNotMatch(d, /(^|,\s*)Muse(,|$)/);
  assert.doesNotMatch(d, /Apple Intelligence/);
  assert.doesNotMatch(d, /(^|,\s*)Copilot(,|$)/);
});

test('news sitemap keywords add Grok when xAI is named (FINDABILITY #173)', () => {
  const a = keywordsFor({
    title: 'xAI expands API access for developers',
    summary: 'No product codename in the headline.',
    pillar: 'capability',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['xAI'],
  });
  assert.match(a, /\bxAI\b/);
  assert.match(a, /\bGrok\b/);
  const b = keywordsFor({
    title: 'Nasdaq futures fall on debt concerns',
    summary: 'No frontier lab named.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: [],
  });
  assert.doesNotMatch(b, /(^|,\s*)Grok(,|$)/);
});

test('news sitemap keywords keep Gemma when open-model titles name it (FINDABILITY #174)', () => {
  const a = keywordsFor({
    title: 'Google Gemma 4 Open Models',
    summary: 'Open weights from Google DeepMind.',
    pillar: 'capability',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Google DeepMind'],
  });
  assert.match(a, /\bGemma\b/);
  assert.match(a, /\bGemini\b/);
  const b = keywordsFor({
    title: 'Nasdaq futures fall on debt concerns',
    summary: 'No frontier lab named.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: [],
  });
  assert.doesNotMatch(b, /(^|,\s*)Gemma(,|$)/);
});

test('news sitemap keywords add HBM when Samsung is named (FINDABILITY #175)', () => {
  const a = keywordsFor({
    title: 'Samsung and SK Hynix shares under pressure despite strong AI demand',
    summary: 'Memory-chip selloff.',
    pillar: 'compute',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Samsung'],
  });
  assert.match(a, /\bSamsung\b/);
  assert.match(a, /\bHBM\b/);
  assert.match(a, /SK Hynix/);
  const b = keywordsFor({
    title: 'Nasdaq futures fall on debt concerns',
    summary: 'No frontier lab named.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: [],
  });
  assert.doesNotMatch(b, /(^|,\s*)HBM(,|$)/);
});

test('news sitemap keywords add Chatbots when Character.ai is named (FINDABILITY #176)', () => {
  const a = keywordsFor({
    title: 'Character.ai Maker Files for Chapter 11 Bankruptcy',
    summary: 'Companion chatbot maker enters Chapter 11.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Character.AI'],
  });
  assert.match(a, /Character\.AI|Character AI/);
  assert.match(a, /\bChatbots\b/);
  const b = keywordsFor({
    title: 'Nasdaq futures fall on debt concerns',
    summary: 'No companion-AI company named.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: [],
  });
  assert.doesNotMatch(b, /(^|,\s*)Chatbots(,|$)/);
});


test('news sitemap keywords add Qwen when Alibaba is named (FINDABILITY #177)', () => {
  const a = keywordsFor({
    title: 'Alibaba expands cloud AI for enterprises',
    summary: 'Open-weight models.',
    pillar: 'capability',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Alibaba'],
  });
  assert.match(a, /\bAlibaba\b/);
  assert.match(a, /\bQwen\b/);
  const b = keywordsFor({
    title: 'Nasdaq futures fall on debt concerns',
    summary: 'No lab named.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: [],
  });
  // Qwen may still appear via topic noise; require Alibaba parent for alias path:
  assert.doesNotMatch(b, /(^|,\s*)Alibaba(,|$)/);
});

test('news sitemap keywords add Datacenters when Oracle is named (FINDABILITY #178)', () => {
  const a = keywordsFor({
    title: '12 States Push Back on New Mexico in Oracle Data Center Pipeline Fight',
    summary: 'AI cloud capacity fight.',
    pillar: 'compute',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Oracle'],
  });
  assert.match(a, /\bOracle\b/);
  assert.match(a, /\bDatacenters\b/);
  const b = keywordsFor({
    title: 'Nasdaq futures fall on debt concerns',
    summary: 'No infra company named.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: [],
  });
  assert.doesNotMatch(b, /(^|,\s*)Datacenters(,|$)/);
});

test('news sitemap keywords add Timestral when Mistral is named (FINDABILITY #180)', () => {
  const a = keywordsFor({
    title: 'CERN and Mistral partner to build Flare, a new AI model for physics',
    summary: 'Open models for science.',
    pillar: 'capability',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Mistral'],
  });
  assert.match(a, /\bMistral\b/);
  assert.match(a, /\bTimestral\b/);
  const b = keywordsFor({
    title: 'Nasdaq futures fall on debt concerns',
    summary: 'No lab named.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: [],
  });
  assert.doesNotMatch(b, /(^|,\s*)Timestral(,|$)/);
});

test('news sitemap keywords add MI300 when AMD is named (FINDABILITY #184)', () => {
  const a = keywordsFor({
    title: 'AMD Helion for Agentic AI and Enterprise',
    summary: 'AI GPU accelerators.',
    pillar: 'compute',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['AMD'],
  });
  assert.match(a, /\bAMD\b/);
  assert.match(a, /\bMI300\b/);
  const b = keywordsFor({
    title: 'Nasdaq futures fall on debt concerns',
    summary: 'No lab named.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: [],
  });
  assert.doesNotMatch(b, /(^|,\s*)MI300(,|$)/);
});

test('news sitemap keywords add FSD when Tesla is named (FINDABILITY #185)', () => {
  const a = keywordsFor({
    title: 'Tesla confirms Autopilot/FSD was on when car crossed a median',
    summary: 'Autonomy headlines.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Tesla'],
  });
  assert.match(a, /\bTesla\b/);
  assert.match(a, /\bFSD\b/);
  const b = keywordsFor({
    title: 'Nasdaq futures fall on debt concerns',
    summary: 'No lab named.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: [],
  });
  assert.doesNotMatch(b, /(^|,\s*)FSD(,|$)/);
});

test('news sitemap keywords add AIP when Palantir is named (FINDABILITY #183)', () => {
  const a = keywordsFor({
    title: 'Palantir and Sadiq Khan drop legal battle over Met contract',
    summary: 'Government software contracts.',
    pillar: 'governance',
    kind: 'press',
    source: 'guardian-ai',
    entities: ['Palantir'],
  });
  assert.match(a, /\bPalantir\b/);
  assert.match(a, /\bAIP\b/);
  const b = keywordsFor({
    title: 'Nasdaq futures fall on debt concerns',
    summary: 'No lab named.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: [],
  });
  assert.doesNotMatch(b, /(^|,\s*)AIP(,|$)/);
});


test('news sitemap keywords add neocloud / Iris Energy when parent named (FINDABILITY #159)', () => {
  const a = keywordsFor({
    title: "CoreWeave's slump puts spotlight on debt behind AI boom",
    summary: 'GPU-cloud lender stress.',
    pillar: 'compute',
    kind: 'press',
    source: 'wires-ai',
    entities: ['CoreWeave'],
  });
  assert.match(a, /\bCoreWeave\b/);
  assert.match(a, /\bneocloud\b/);
  const b = keywordsFor({
    title: 'IREN stock rises on AI power demand',
    summary: '',
    pillar: 'compute',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['IREN'],
  });
  assert.match(b, /\bIREN\b/);
  assert.match(b, /Iris Energy/);
  // Bare titles must not invent the aliases.
  const c = keywordsFor({
    title: 'Nasdaq futures fall on debt concerns',
    summary: 'No GPU-cloud vendor or power-stock lab named.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: [],
  });
  assert.doesNotMatch(c, /\bneocloud\b/);
  assert.doesNotMatch(c, /Iris Energy/);
});

test('news sitemap keywords add ChatGPT/Claude/Gemini when parent lab named (FINDABILITY #147)', () => {
  const a = keywordsFor({
    title: 'OpenAI raises new round for infrastructure',
    summary: 'No product name in the headline.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['OpenAI'],
  });
  assert.match(a, /\bOpenAI\b/);
  assert.match(a, /\bChatGPT\b/);
  const b = keywordsFor({
    title: 'Anthropic expands compute deals',
    summary: '',
    pillar: 'compute',
    kind: 'press',
    source: 'wires-ai',
    entities: ['Anthropic'],
  });
  assert.match(b, /\bAnthropic\b/);
  assert.match(b, /\bClaude\b/);
  const c = keywordsFor({
    title: 'Google DeepMind publishes new eval suite',
    summary: '',
    pillar: 'capability',
    kind: 'paper',
    source: 'arxiv',
    entities: ['Google DeepMind'],
  });
  assert.match(c, /DeepMind/);
  assert.match(c, /\bGemini\b/);
  // Unrelated titles must not invent product aliases.
  const d = keywordsFor({
    title: 'Nasdaq futures fall on debt concerns',
    summary: 'No frontier lab named.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: [],
  });
  assert.doesNotMatch(d, /\bChatGPT\b/);
  assert.doesNotMatch(d, /\bClaude\b/);
  assert.doesNotMatch(d, /\bGemini\b/);
});

test('news sitemap keywords include MediaTek / Cathie Wood / ServiceNow (FINDABILITY #108)', () => {
  const a = keywordsFor({
    title: 'ByteDance nears deal to buy MediaTek’s custom AI chips for data centers',
    summary: '',
    pillar: 'compute',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['ByteDance'],
  });
  assert.match(a, /MediaTek/);
  const b = keywordsFor({
    title: 'Tracking Cathie Wood: Buying Heavily into Kodiak AI and CoreWeave',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: [],
  });
  assert.match(b, /Cathie Wood/);
  assert.match(b, /CoreWeave/);
  const c = keywordsFor({
    title: 'Salesforce vs. ServiceNow: What Revenue Trends Tell Investors About Their Move to AI',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Salesforce'],
  });
  assert.match(c, /ServiceNow/);
});

test('news sitemap keywords include Kodiak AI beside Cathie Wood tape (FINDABILITY #109)', () => {
  const a = keywordsFor({
    title: 'Tracking Cathie Wood: Buying Heavily into Kodiak AI and CoreWeave, Cutting Personalis and Toast',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: [],
  });
  assert.match(a, /Kodiak AI/);
  assert.match(a, /Cathie Wood/);
  assert.match(a, /CoreWeave/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Kodiak AI') < parts.indexOf('attention'), a);
});

test('news sitemap keywords include Trail of Bits / DualEntry / Qwen N1 surfaces', () => {
  const a = keywordsFor({
    title: 'OpenAI Weighs Deal for One-Time Security Partner Trail of Bits',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'techmeme',
    entities: [],
  });
  assert.match(a, /Trail of Bits/);
  const b = keywordsFor({
    title: "Google's Gemini 4 Argon Is the Most Accurate AI Model on DualEntry Benchmark",
    summary: 'Qwen N1 and Grok Voice also appear in adjacent coverage.',
    pillar: 'capability',
    kind: 'press',
    source: 'hn',
    entities: [],
  });
  assert.match(b, /DualEntry/);
  assert.match(b, /Qwen N1|Qwen/);
  assert.match(b, /Grok Voice|Grok/);
});

test('render keywords include matching topic-tag names for Google News contest', () => {
  const xml = render({
    news: {
      items: [{
        id: 'a2',
        title: 'New AI agents ship computer use and prompt injection defenses',
        summary: 'Agentic tool-use product with guardrails.',
        published_at: new Date().toISOString(),
        source: 'hn',
        pillar: 'capability',
        kind: 'forum',
        entities: [],
      }],
    },
    url: (p) => `https://example.test${p}`,
  });
  assert.match(xml, /<news:keywords>[^<]*AI agents/);
  assert.match(xml, /Prompt injection|AI guardrails/);
  const kw = xml.match(/<news:keywords>([^<]*)<\/news:keywords>/)[1];
  assert.ok(kw.split(',').length <= 12);
});

test('render keywords include expanded lab and model surface names', () => {
  const xml = render({
    news: {
      items: [{
        id: 'a3',
        title: 'IREN stock rises as Meta launches Muse Wonder',
        summary: 'Cloud deal chatter names IREN; Muse Wonder hits Artificial Analysis.',
        published_at: new Date().toISOString(),
        source: 'hn',
        pillar: 'compute',
        kind: 'press',
        entities: [],
      }],
    },
    url: (p) => `https://example.test${p}`,
  });
  assert.match(xml, /<news:keywords>[^<]*IREN/);
  assert.match(xml, /Muse Wonder|Artificial Analysis/);
});

test('render keywords include Decart, Sakana AI, Isomorphic Labs, Winverse AI, Cisco', () => {
  const xml = render({
    news: {
      items: [{
        id: 'a4',
        title: 'Amazon eyes Decart as Sakana AI and Isomorphic Labs expand',
        summary: 'Winverse AI raises; Cisco and NVIDIA ship AI optics.',
        published_at: new Date().toISOString(),
        source: 'hn',
        pillar: 'capability',
        kind: 'press',
        entities: [],
      }],
    },
    url: (p) => `https://example.test${p}`,
  });
  assert.match(xml, /<news:keywords>[^<]*Decart/);
  assert.match(xml, /Sakana AI|Isomorphic Labs|Winverse AI|Cisco/);
});

test('render keywords include Maia / Maia 300 model surfaces', () => {
  const xml = render({
    news: {
      items: [{
        id: 'a5',
        title: 'Microsoft unveils Maia 300 AI chip',
        summary: 'Azure Maia custom silicon expands cloud inference capacity.',
        published_at: new Date().toISOString(),
        source: 'hn',
        pillar: 'compute',
        kind: 'press',
        entities: [],
      }],
    },
    url: (p) => `https://example.test${p}`,
  });
  assert.match(xml, /<news:keywords>[^<]*(?:Maia 300|Maia)/);
});

test('render keywords include OpenAI Codex model surfaces', () => {
  const xml = render({
    news: {
      items: [{
        id: 'a6',
        title: 'OpenAI Codex Launches Input Prediction Beta',
        summary: 'Codex CLI updates for Pro users.',
        published_at: new Date().toISOString(),
        source: 'hn',
        pillar: 'capability',
        kind: 'press',
        entities: [],
      }],
    },
    url: (p) => `https://example.test${p}`,
  });
  assert.match(xml, /<news:keywords>[^<]*(?:OpenAI Codex|Codex)/);
});

test('render keywords include Epoch AI lab surface', () => {
  const xml = render({
    news: {
      items: [{
        id: 'a7',
        title: 'Claude Opus 5.5 Tops Epoch AI Leaderboard',
        summary: 'Independent evals from Epoch AI and peers.',
        published_at: new Date().toISOString(),
        source: 'hn',
        pillar: 'capability',
        kind: 'press',
        entities: [],
      }],
    },
    url: (p) => `https://example.test${p}`,
  });
  assert.match(xml, /<news:keywords>[^<]*Epoch AI/);
});

test('render keywords include Salesforce and World Labs surfaces', () => {
  const xml = render({
    news: {
      items: [{
        id: 'a8',
        title: 'Salesforce buoy Dow as AMD courts World Labs',
        summary: 'Enterprise AI M&A names Salesforce and World Labs.',
        published_at: new Date().toISOString(),
        source: 'hn',
        pillar: 'capability',
        kind: 'press',
        entities: [],
      }],
    },
    url: (p) => `https://example.test${p}`,
  });
  assert.match(xml, /<news:keywords>[^<]*Salesforce/);
  assert.match(xml, /<news:keywords>[^<]*World Labs/);
});

test('render keywords include Nano Banana model surface', () => {
  const xml = render({
    news: {
      items: [{
        id: 'a9',
        title: 'Google releases Nano Banana 2.1 image model',
        summary: 'Nano Banana improves across the board at lower price.',
        published_at: new Date().toISOString(),
        source: 'hn',
        pillar: 'capability',
        kind: 'press',
        entities: [],
      }],
    },
    url: (p) => `https://example.test${p}`,
  });
  assert.match(xml, /<news:keywords>[^<]*Nano Banana/);
});

test('news sitemap keywords include Le Chonk / Mistral Large 4 surfaces', () => {
  const kw = keywordsFor({
    title: 'Mistral Says Its New AI Model ‘Le Chonk’ Is the Best Open-Weight Offering',
    summary: 'Mistral Large 4 nicknamed Le Chonk ships as an open-weight model.',
    pillar: 'capability',
    kind: 'press',
    source: 'hn',
    entities: [],
  });
  assert.match(kw, /Le Chonk|Mistral Large 4|Mixtral/);
});

test('news sitemap keywords include GPT-6 Astra / Luna / Sol surfaces', () => {
  const kw = keywordsFor({
    title: 'OpenAI cancels October release of GPT-6.1 Astra after tests',
    summary: 'GPT-6 Astra, GPT-6 Luna, and GPT-6 Sol nicknames appear in product coverage.',
    pillar: 'capability',
    kind: 'press',
    source: 'hn',
    entities: [],
  });
  assert.match(kw, /GPT-6 Astra|GPT-6\.1 Astra|GPT-6 Luna|GPT-6 Sol/);
});

test('news sitemap keywords include Gemini 4 Argon / Carbon surfaces', () => {
  const kw = keywordsFor({
    title: 'Google announces Gemini 4 Argon AI model',
    summary: 'Gemini 4 Carbon and Gemini 4 Argon nicknames appear in product coverage.',
    pillar: 'capability',
    kind: 'press',
    source: 'hn',
    entities: [],
  });
  assert.match(kw, /Gemini 4 Argon|Gemini 4 Carbon|Gemini 4/);
});

test('news sitemap keywords include GLM-5 / GLM5.3 surfaces', () => {
  const kw = keywordsFor({
    title: 'Strata for GLM5.3 Flash is here for some',
    summary: 'GLM-5 and GLM5.3 nicknames appear in model coverage.',
    pillar: 'capability',
    kind: 'press',
    source: 'hn',
    entities: [],
  });
  assert.match(kw, /GLM-5\.3|GLM5\.3|GLM-5/);
});

test('news sitemap keywords include Claude Opus 5.5 surfaces', () => {
  const kw = keywordsFor({
    title: 'Anthropic tests new model under Claude Opus 5.5',
    summary: 'Opus 5.5 nickname appears in product coverage.',
    pillar: 'capability',
    kind: 'press',
    source: 'hn',
    entities: [],
  });
  assert.match(kw, /Claude Opus 5\.5|Opus 5\.5/);
});

test('news sitemap keywords include METR + Bee from live 48h tape (FINDABILITY #199)', () => {
  // google-news-open: Anthropic/METR safety-eval titles and Amazon Bee wearable
  // titles that lead with bare "Bee" were dropping under the 12-cap.
  const metr = keywordsFor({
    title: 'Anthropic grants outside evaluator METR employee-level access in AI safety push',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Anthropic'],
  });
  assert.match(metr, /METR/);
  assert.match(metr, /Anthropic/);
  const bee = keywordsFor({
    title: "Amazon's Bee Turns Everyday Conversations Into AI Tasks and Shopping Prompts",
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Amazon'],
  });
  assert.match(bee, /\bBee\b/);
  assert.match(bee, /Amazon/);
  const parts = bee.split(', ');
  assert.ok(parts.indexOf('Bee') < parts.indexOf('attention'), bee);
});

test('news sitemap keywords include Apertus from live 48h tape (FINDABILITY #200)', () => {
  // pizzint-news-alive: Swiss open multimodal Apertus 1.5 release titles.
  const a = keywordsFor({
    title: 'Apertus 1.5: Swiss AI Model Hits 262K Context [2026]',
    summary: '',
    pillar: 'capability',
    kind: 'press',
    source: 'gnews-ai',
    entities: [],
  });
  assert.match(a, /Apertus/);
  assert.match(a, /Apertus 1\.5/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Apertus') < parts.indexOf('capability'), a);
});

test('news sitemap keywords include Bluesky + Attie + Nscale from live 48h tape (FINDABILITY #204)', () => {
  // google-news-open: Bluesky Attie builder titles and Nscale neocloud IPO /
  // datacenter titles were dropping under the 12-cap without named lab needles.
  const attie = keywordsFor({
    title: 'Bluesky Expands Attie Into AI-Built Social Experiences',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: [],
  });
  assert.match(attie, /\bBluesky\b/);
  assert.match(attie, /\bAttie\b/);
  const parts = attie.split(', ');
  assert.ok(parts.indexOf('Bluesky') < parts.indexOf('attention'), attie);
  assert.ok(parts.indexOf('Attie') < parts.indexOf('attention'), attie);
  const nscale = keywordsFor({
    title: 'Nscale’s AI Buildout Hit by Fire, Delays and Angry Workers Ahead of IPO',
    summary: '',
    pillar: 'compute',
    kind: 'press',
    source: 'wires-ai',
    entities: [],
  });
  assert.match(nscale, /\bNscale\b/);
  const nParts = nscale.split(', ');
  assert.ok(nParts.indexOf('Nscale') < nParts.indexOf('compute'), nscale);
});

test('news sitemap keywords include Roadster from live 48h Tesla Trends tape (FINDABILITY #208)', () => {
  // Tesla Trends trending on flying cars / Roadster; titles name Roadster while
  // Tesla + FSD already occupy 12-cap slots and drop the product needle.
  const a = keywordsFor({
    title: 'The Tesla Roadster 2 Is Here—and It Flies',
    summary: '',
    pillar: 'attention',
    kind: 'forum',
    source: 'bluesky-ai',
    entities: ['Tesla'],
  });
  assert.match(a, /\bTesla\b/);
  assert.match(a, /\bRoadster\b/);
  assert.match(a, /\bFSD\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Roadster') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Nasdaq futures fall on debt concerns',
    summary: 'No Tesla product named.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: [],
  });
  assert.doesNotMatch(b, /(^|,\s*)Roadster(,|$)/);
});

test('news sitemap keywords include MAI-Base from Microsoft MoE tape (FINDABILITY #216)', () => {
  // Contested Google News: MAI-Base-2 titles kept Microsoft + Copilot + topic
  // tags under the 12-cap while Coinbase "Base" false-matched inside MAI-Base-*.
  const a = keywordsFor({
    title: 'Microsoft unveils MAI-Base-2, a MoE model with 2.8T total and 80B active parameters, claiming 4x-12x more pretraining FLOPs-efficiency than DeepSeek-V4-Pro-Base (Microsoft AI)',
    summary: '',
    pillar: 'capability',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Microsoft'],
  });
  assert.match(a, /\bMAI-Base\b/);
  assert.match(a, /\bMAI-Base-2\b/);
  assert.doesNotMatch(a, /(^|,\s*)Base(,|$)/);
  const parts = a.split(', ');
  // Model needles must outrank pillar meta under the 12-cap.
  assert.ok(parts.indexOf('MAI-Base') < parts.indexOf('capability')
    || parts.indexOf('MAI-Base-2') < parts.indexOf('capability'), a);
  // Coinbase Base still matches as a standalone chain needle (#70).
  const b = keywordsFor({
    title: 'Chainalysis Finds AI Agents Made 138 Million x402 Payments on Coinbase Base',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: [],
  });
  assert.match(b, /(^|,\s*)Base(,|$)/);
  assert.doesNotMatch(b, /MAI-Base/);
  assert.ok(labNeedleRe('Base').test('Coinbase Base'));
  assert.ok(!labNeedleRe('Base').test('MAI-Base-2 MoE model'));
  const c = keywordsFor({
    title: 'Nasdaq futures fall on debt concerns',
    summary: 'No Microsoft model named.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: [],
  });
  assert.doesNotMatch(c, /MAI-Base/);
});

test('news sitemap keywords include ChatGPT Voice / GPT-Live from live 48h tape (FINDABILITY #214)', () => {
  // Contested Google News: ChatGPT Voice + GPT-Live-1.1 titles keep OpenAI /
  // ChatGPT under the 12-cap and drop the product / model needles.
  const a = keywordsFor({
    title: 'OpenAI has updated ChatGPT Voice (voice function). GPT-Live-1.1, which supports this update, improve..',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['OpenAI'],
  });
  assert.match(a, /\bOpenAI\b/);
  assert.match(a, /\bChatGPT\b/);
  assert.match(a, /\bChatGPT Voice\b/);
  assert.match(a, /\bGPT-Live\b/);
  assert.match(a, /\bGPT-Live-1\.1\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('ChatGPT Voice') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'OpenAI adds Korean voices and boosts natural chat in ChatGPT Voice - CHOSUNBIZ',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['OpenAI'],
  });
  assert.match(b, /\bChatGPT Voice\b/);
  const c = keywordsFor({
    title: 'Nasdaq futures fall on debt concerns',
    summary: 'No voice product named.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: [],
  });
  assert.doesNotMatch(c, /ChatGPT Voice|GPT-Live/);
});

test('news sitemap keywords include Muse Spark from multi-title tape (FINDABILITY #222)', () => {
  // Multi-title Muse Spark / Muse Spark Open tape: #172 Muse alias fires beside
  // Meta, but 12-cap leaves product-class titles without Muse Spark needles.
  const a = keywordsFor({
    title: 'Muse Spark Open vs DeepSeek V4.1 Flash: Same Score, Triple the Cost',
    summary: '',
    pillar: 'capability',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['DeepSeek'],
  });
  assert.match(a, /\bMuse Spark\b/);
  assert.match(a, /\bMuse Spark Open\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Muse Spark') < parts.indexOf('capability')
    || parts.indexOf('Muse Spark Open') < parts.indexOf('capability'), a);
  const b = keywordsFor({
    title: 'Meta&#39;s new Muse Spark AI model focuses on coding and task automation',
    summary: 'Open-weight Muse Spark release.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Meta'],
  });
  assert.match(b, /\bMuse Spark\b/);
  assert.match(b, /\bMuse\b/);
  const c = keywordsFor({
    title: 'Nasdaq futures fall on debt concerns',
    summary: 'No Muse product named.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: [],
  });
  assert.doesNotMatch(c, /Muse Spark/);
});

test('news sitemap keywords include Fable from live 48h eval tape (FINDABILITY #212)', () => {
  // Contested Google News: Azure Fable 5.5 + GLM→Fable 5 + Gemini-vs-Fable
  // titles name the model class while topic tags bury it under the 12-cap.
  const a = keywordsFor({
    title: 'Breaking News: Fable 5.5 Spotted on Azure – Directly Competing Against Google’s New AI Model',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: [],
  });
  assert.match(a, /\bFable\b/);
  assert.match(a, /\bFable 5\.5\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Fable') < parts.indexOf('attention') || parts.indexOf('Fable 5.5') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Team of 5 post-trains GLM 5.3 Flash to Fable 5 class for $300k all-in',
    summary: 'On par with Fable 5.1 in eval chatter.',
    pillar: 'capability',
    kind: 'forum',
    source: 'hn-fresh-ai',
    entities: ['GLM'],
  });
  assert.match(b, /\bFable\b/);
  assert.match(b, /\bFable 5\b/);
  assert.match(b, /\bFable 5\.1\b/);
  const c = keywordsFor({
    title: 'Nasdaq futures fall on debt concerns',
    summary: 'No model-class named.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: [],
  });
  assert.doesNotMatch(c, /(^|,\s*)Fable(,|$)/);
});

test('news sitemap keywords include Starshield from live 48h tape (FINDABILITY #206)', () => {
  // Contested Google News: Ukraine Starshield access titles name the product
  // beside SpaceX; without a needle the 12-cap keeps SpaceX and drops Starshield.
  const a = keywordsFor({
    title: 'Musk Comments Sow Confusion Over Ukraine Starshield Disruption',
    summary: '',
    pillar: 'attention',
    kind: 'forum',
    source: 'bluesky-ai',
    entities: ['SpaceX', 'Elon Musk'],
  });
  assert.match(a, /\bSpaceX\b/);
  assert.match(a, /\bStarshield\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Starshield') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'SpaceX expands Starlink capacity for enterprise customers',
    summary: 'No Starshield product in the headline.',
    pillar: 'compute',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['SpaceX'],
  });
  // Alias path: SpaceX parent → Starshield even when title omits the product.
  assert.match(b, /\bSpaceX\b/);
  assert.match(b, /\bStarshield\b/);
});

test('keywordsFor keeps lab surfaces ahead of topic-tag flood under the 12-cap', () => {
  const kw = keywordsFor({
    title: 'Decart agents ship computer use, prompt injection defenses, and multimodal reasoning',
    summary: 'Agentic tool-use with guardrails, RAG, fine-tuning, and open-weights coverage naming Decart.',
    pillar: 'capability',
    kind: 'press',
    source: 'techcrunch-ai-very-long-source-slug',
    entities: [],
  });
  const parts = kw.split(',').map((s) => s.trim());
  assert.ok(parts.length <= 12, kw);
  assert.ok(parts.includes('Decart'), kw);
  // Named lab must outrank meta source slug when the cap is tight.
  const decartAt = parts.indexOf('Decart');
  const sourceAt = parts.indexOf('techcrunch-ai-very-long-source-slug');
  assert.ok(decartAt >= 0);
  if (sourceAt >= 0) assert.ok(decartAt < sourceAt, kw);
});
