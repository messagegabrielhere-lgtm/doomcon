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

test('news-sitemap tip comments advertise full sitemap, free-tools, verify, Search Trends, classic', () => {
  const xml = render({
    news: { items: [] },
    url: (p) => `https://siren.watch${p}`,
  });
  assert.match(xml, /<!--[^>]*Google News window/);
  assert.match(xml, /<!--[^>]*Full sitemap: https:\/\/siren\.watch\/sitemap\.xml/);
  assert.match(xml, /<!--[^>]*Free tools: https:\/\/siren\.watch\/free-tools\.html/);
  assert.match(xml, /<!--[^>]*Verify: https:\/\/siren\.watch\/verify\.html/);
  assert.match(xml, /<!--[^>]*Search Trends[^>]*https:\/\/siren\.watch\/search-trends\.html/);
  assert.match(xml, /<!--[^>]*Classic instrument panel: https:\/\/siren\.watch\/classic\.html/);
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

test('news sitemap keywords add CRWV when CoreWeave is named (FINDABILITY #288)', () => {
  const a = keywordsFor({
    title: 'CoreWeave (CRWV) slides as GPU-cloud debt costs rise',
    summary: 'Neocloud lender stress.',
    pillar: 'compute',
    kind: 'press',
    source: 'wires-ai',
    entities: ['CoreWeave'],
  });
  assert.match(a, /\bCoreWeave\b/);
  assert.match(a, /\bCRWV\b/);
  assert.match(a, /\bneocloud\b/);
  // Bare titles must not invent the ticker alias.
  const b = keywordsFor({
    title: 'Nasdaq futures fall on debt concerns',
    summary: 'No GPU-cloud vendor named.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: [],
  });
  assert.doesNotMatch(b, /(^|,\s*)CRWV(,|$)/);
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

test('news sitemap keywords match GPT 6 Astra space form (FINDABILITY #310)', () => {
  // Live HN titles often write "GPT 6 Astra" while NEWS_KEYWORD_LABS uses hyphens.
  assert.ok(labNeedleRe('GPT-6 Astra').test('It took an octillion calculations to train GPT 6 Astra'));
  assert.ok(labNeedleRe('GPT-6.1 Astra').test('OpenAI cancels GPT 6.1 Astra release'));
  assert.ok(!labNeedleRe('GPT-6 Astra').test('GPT-6 Luna launch'));
  const kw = keywordsFor({
    title: 'It took an octillion calculations to train GPT 6 Astra',
    summary: '',
    pillar: 'attention',
    kind: 'forum',
    source: 'hn-fresh-ai',
    entities: [],
  });
  assert.match(kw, /GPT-6 Astra/);
});

test('labNeedleRe matches Qwen 3.8 spaced form of Qwen3.8 (FINDABILITY #388)', () => {
  // Live Dory vs Qwen titles write "Qwen 3.8" while NEWS_KEYWORD_LABS keeps the
  // glued Qwen3.8 needle; letter↔digit flex covers the space without a doorway.
  assert.ok(labNeedleRe('Qwen3.8').test('Dory 1.0 4B vs Qwen 3.8: a 4B against a three-tier line'));
  assert.ok(labNeedleRe('Qwen3.8').test('Qwen3.8 Omni Flash'));
  assert.ok(labNeedleRe('Qwen3.8-Max').test('Qwen 3.8 Max vs Mythos'));
  assert.ok(labNeedleRe('Nemotron 3.5').test('Nvidia unveils Nemotron3.5 open models'));
  assert.ok(!labNeedleRe('PS5').test('Jailbroken PS5s can now run local AI'));
  const spaced = keywordsFor({
    title: 'Dory 1.0 4B vs Qwen 3.8: a 4B against a three-tier line',
    summary: 'Spaced Qwen version beside Dory SKU.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Nemotron', 'Qwen', 'NVIDIA'],
  });
  assert.match(spaced, /\bQwen3\.8\b/);
  assert.match(spaced, /\bDory 1\.0\b/);
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
  // Model needles must outrank pillar meta under the 12-cap when meta survives.
  // FINDABILITY #310 — hyphen flex also lifts DeepSeek-V4-Pro from the same
  // title, which can fill the cap before pillar meta — still keep MAI ahead of
  // any surviving capability bit.
  if (parts.includes('capability')) {
    assert.ok(parts.indexOf('MAI-Base') < parts.indexOf('capability')
      || parts.indexOf('MAI-Base-2') < parts.indexOf('capability'), a);
  } else {
    assert.ok(parts.includes('MAI-Base') || parts.includes('MAI-Base-2'), a);
  }
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

test('news sitemap keywords include Tencent Cloud from multi-title tape (FINDABILITY #224)', () => {
  // Multi-title Tencent Cloud rogue-agent tape: bare Tencent fills a 12-cap
  // slot (parallel to Alibaba Cloud) while product-class titles omit the
  // cloud surface under topic tags.
  const a = keywordsFor({
    title: 'Researchers Trace Rogue AI Agent Fleet on Tencent Cloud to Alibaba Probe',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Tencent', 'Alibaba'],
  });
  assert.match(a, /\bTencent Cloud\b/);
  assert.match(a, /\bTencent\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Tencent Cloud') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'AI agents on Tencent Cloud try to break into Alibaba’s Amap: researchers',
    summary: 'Rogue agents on Tencent Cloud.',
    pillar: 'attention',
    kind: 'press',
    source: 'scmp-tech',
    entities: ['Alibaba'],
  });
  assert.match(b, /\bTencent Cloud\b/);
  const c = keywordsFor({
    title: 'China’s Tencent Detected Unintended Behaviors From AI Agents',
    summary: 'Parent lab only — cloud product not named.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: ['Tencent'],
  });
  assert.match(c, /\bTencent\b/);
  assert.doesNotMatch(c, /Tencent Cloud/);
});

test('news sitemap keywords include CERT-In from multi-title tape (FINDABILITY #226)', () => {
  // Multi-title CERT-In AI-agent cyber tape: titles name the India CERT while
  // topic/source meta fill the 12-cap and drop the agency surface.
  const a = keywordsFor({
    title: 'AI-Powered Cyberattacks Hit Indian Firms in Hours, CERT-In Flags Growing Threat',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: [],
  });
  assert.match(a, /\bCERT-In\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('CERT-In') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'CERT-In warns AI agents accessed Indian firms’ live systems, sensitive data',
    summary: 'India CERT flags AI agent access.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: [],
  });
  assert.match(b, /\bCERT-In\b/);
  const c = keywordsFor({
    title: 'Nasdaq futures fall on debt concerns',
    summary: 'No CERT agency named.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: [],
  });
  assert.doesNotMatch(c, /CERT-In/);
});

test('news sitemap keywords include DeepSeek V4.1 Flash from multi-title tape (FINDABILITY #228)', () => {
  // Multi-title DeepSeek V4.1 Flash tape: DeepSeek V4.1 fills a 12-cap slot
  // while product-class Flash titles omit the variant surface.
  const a = keywordsFor({
    title: 'OpenCode Makes DeepSeek V4.1 Flash Free to Use, With a 200K Context Window',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['DeepSeek'],
  });
  assert.match(a, /\bDeepSeek V4\.1 Flash\b/);
  assert.match(a, /\bDeepSeek V4\.1\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('DeepSeek V4.1 Flash') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Muse Spark Open vs DeepSeek V4.1 Flash: Same Score, Triple the Cost',
    summary: 'Flash variant named beside Muse Spark Open.',
    pillar: 'capability',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['DeepSeek'],
  });
  assert.match(b, /\bDeepSeek V4\.1 Flash\b/);
  const c = keywordsFor({
    title: 'DeepSeek V4.1 ships for enterprise agents',
    summary: 'Parent version only — Flash variant not named.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: ['DeepSeek'],
  });
  assert.match(c, /\bDeepSeek V4\.1\b/);
  assert.doesNotMatch(c, /DeepSeek V4\.1 Flash/);
});

test('labNeedleRe matches non-contiguous DeepSeek … V4.1 Flash titles (FINDABILITY #431)', () => {
  // Live tape writes "DeepSeek Launches V4.1-Flash-…" / "DeepSeek API Key
  // Setup: V4.1 Flash…" — contiguous labNeedleRe missed those while Trends
  // #418 already flexed. Parent V4.1 (no Flash) must stay unmatched.
  assert.ok(labNeedleRe('DeepSeek V4.1 Flash').test(
    'DeepSeek Launches V4.1-Flash-1017, Beats Claude Opus 5 On Some Benchmarks',
  ));
  assert.ok(labNeedleRe('DeepSeek V4.1 Flash').test(
    'DeepSeek API Key Setup: V4.1 Flash in 13 Steps [2026]',
  ));
  assert.ok(labNeedleRe('DeepSeek V4.1 Flash').test(
    'OpenCode Makes DeepSeek V4.1 Flash Free to Use',
  ));
  assert.ok(!labNeedleRe('DeepSeek V4.1 Flash').test(
    'DeepSeek V4.1 ships for enterprise agents',
  ));
  const gap = keywordsFor({
    title: 'DeepSeek Launches V4.1-Flash-1017, Beats Claude Opus 5 On Some Benchmarks',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['DeepSeek'],
  });
  assert.match(gap, /\bDeepSeek V4\.1 Flash\b/);
  const setup = keywordsFor({
    title: 'DeepSeek API Key Setup: V4.1 Flash in 13 Steps [2026]',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['DeepSeek'],
  });
  assert.match(setup, /\bDeepSeek V4\.1 Flash\b/);
});

test('news sitemap keywords include $44T from Anthropic GDP tape (FINDABILITY #448)', () => {
  // Multi-title Anthropic GDP / $44T tape: Anthropic / Claude fill the 12-cap
  // while trillion / $44T SKU titles omit the contiguous surface. Flex covers
  // "$44.4 Trillion" / "$44 trillion" / "44T"; bare GDP must not invent $44T.
  assert.ok(labNeedleRe('$44T').test(
    'Anthropic Says AI Could Push US GDP to $44.4 Trillion by 2030',
  ));
  assert.ok(labNeedleRe('$44T').test(
    'Anthropic co-founder Clark projects U.S. GDP to hit $44T by 2030 thanks to AI',
  ));
  assert.ok(labNeedleRe('$44T').test(
    'AI could boost US GDP to $44 trillion by 2030, Anthropic model forecasts',
  ));
  assert.ok(!labNeedleRe('$44T').test(
    'AI rapidly improving, could vastly boost US GDP, Anthropic\'s Clark tells policymakers',
  ));
  assert.ok(!labNeedleRe('$44T').test('US GDP grew 2.1% last quarter'));
  const a = keywordsFor({
    title: 'Anthropic Says AI Could Push US GDP to $44.4 Trillion by 2030, but Its Modest Scenario Sees $34.1 Tr',
    summary: '',
    pillar: 'compute',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Anthropic', 'Google', 'Claude'],
  });
  assert.match(a, /\$44T/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('$44T') < parts.indexOf('compute'), a);
  const b = keywordsFor({
    title: 'Anthropic forecasts U.S. GDP at $44T by 2030 due to AI (ANTHRO)',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Anthropic', 'Claude'],
  });
  assert.match(b, /\$44T/);
  const c = keywordsFor({
    title: 'AI rapidly improving, could vastly boost US GDP, Anthropic\'s Clark tells policymakers',
    summary: 'Qualitative GDP claim without the forecast SKU.',
    pillar: 'governance',
    kind: 'press',
    source: 'wires-ai',
    entities: ['Anthropic', 'Claude'],
  });
  assert.doesNotMatch(c, /\$44T/);
});

test('news sitemap keywords include Navier-Stokes from OpenAI math-proof tape (FINDABILITY #477)', () => {
  // Multi-title OpenAI Navier-Stokes tape: OpenAI / ChatGPT fill the 12-cap
  // while the equation surface is dropped. Hyphen↔space flex covers
  // "Navier Stokes"; bare Stokes / Navier alone must not invent the lab.
  assert.ok(labNeedleRe('Navier-Stokes').test(
    'OpenAI releases 722 AI written math papers, Navier-Stokes claim',
  ));
  assert.ok(labNeedleRe('Navier-Stokes').test(
    'Mathematicians say OpenAI doesn\'t understand its own Navier-Stokes proof',
  ));
  assert.ok(labNeedleRe('Navier-Stokes').test(
    'OpenAI Navier Stokes claim draws scrutiny',
  ));
  assert.ok(!labNeedleRe('Navier-Stokes').test('Something about Stokes flow alone'));
  assert.ok(!labNeedleRe('Navier-Stokes').test('Navier alone is not enough'));
  const a = keywordsFor({
    title: 'OpenAI releases 722 AI written math papers, Navier-Stokes claim',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['OpenAI', 'Google', 'ChatGPT'],
  });
  assert.match(a, /Navier-Stokes/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Navier-Stokes') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Mathematicians say OpenAI doesn\'t understand its own Navier-Stokes proof',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'the-decoder',
    entities: ['OpenAI', 'ChatGPT'],
  });
  assert.match(b, /Navier-Stokes/);
  const c = keywordsFor({
    title: 'OpenAI releases AI written math papers without naming the equation',
    summary: 'Qualitative math-paper claim without the equation surface.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['OpenAI', 'ChatGPT'],
  });
  assert.doesNotMatch(c, /Navier-Stokes/);
});

test('news sitemap keywords include Flash-1017 from DeepSeek build SKU tape (FINDABILITY #479)', () => {
  // Multi-title DeepSeek V4.1 Flash-1017 tape: DeepSeek / V4.1 Flash fill the
  // 12-cap while the build SKU is dropped. Hyphen↔space flex covers
  // "Flash 1017" / "V4.1-Flash-1017"; bare V4.1 Flash must not invent 1017.
  assert.ok(labNeedleRe('Flash-1017').test(
    'DeepSeek releases V4.1-Flash-1017, an update it says offers stronger benchmark',
  ));
  assert.ok(labNeedleRe('Flash-1017').test(
    'The fastest DeepSeek v4.1 flash 1017 – Day 0',
  ));
  assert.ok(labNeedleRe('Flash-1017').test(
    'deepseek-ai/DeepSeek-V4.1-Flash-1017 — trending on Hugging Face',
  ));
  assert.ok(!labNeedleRe('Flash-1017').test('DeepSeek V4.1 Flash without the build'));
  assert.ok(!labNeedleRe('Flash-1017').test('Flash photography tips for 1017 cameras'));
  const a = keywordsFor({
    title: 'Chinese startup DeepSeek releases V4.1-Flash-1017 AI model live on platforms',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['DeepSeek', 'Google'],
  });
  assert.match(a, /Flash-1017/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Flash-1017') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'The fastest DeepSeek v4.1 flash 1017 – Day 0',
    summary: '',
    pillar: 'attention',
    kind: 'forum',
    source: 'hn-fresh-ai',
    entities: ['DeepSeek'],
  });
  assert.match(b, /Flash-1017/);
  const c = keywordsFor({
    title: 'DeepSeek V4.1 Flash lands without naming the build SKU',
    summary: 'Qualitative Flash claim without the 1017 surface.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['DeepSeek'],
  });
  assert.doesNotMatch(c, /Flash-1017/);
});

test('news sitemap keywords include Stripe from OpenRouter acquisition tape (FINDABILITY #481)', () => {
  // Multi-title Stripe OpenRouter tape: OpenRouter / Google fill the 12-cap
  // while the payments-buyer company surface is dropped (parallel Accenture /
  // Vercel). Bare OpenRouter-only titles must not invent Stripe.
  assert.ok(labNeedleRe('Stripe').test(
    "Stripe's $7.5 Billion OpenRouter Deal Puts a Payments Company in Charge of AI Model Choice",
  ));
  assert.ok(labNeedleRe('Stripe').test(
    'Stripe will pay more than $7 billion to buy AI router OpenRouter',
  ));
  assert.ok(!labNeedleRe('Stripe').test(
    'OpenRouter raises a round without naming the buyer',
  ));
  const a = keywordsFor({
    title: "Stripe's $7.5 Billion OpenRouter Deal Puts a Payments Company in Charge of AI Model Choice",
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['OpenRouter', 'Google'],
  });
  assert.match(a, /\bStripe\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Stripe') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Stripe will pay more than $7 billion to buy AI router OpenRouter',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['OpenRouter'],
  });
  assert.match(b, /\bStripe\b/);
  const c = keywordsFor({
    title: 'OpenRouter catalogue listings expand without naming the buyer',
    summary: 'Qualitative OpenRouter claim without the payments-buyer company surface.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['OpenRouter'],
  });
  assert.doesNotMatch(c, /(^|,\s*)Stripe(,|$)/);
});

test('news sitemap keywords include Nemotron 3.5 Super VL from multi-title tape (FINDABILITY #231)', () => {
  // Multi-title Nemotron 3.5 Super VL tape: bare Nemotron fills a 12-cap slot
  // while product-class Super VL titles omit the variant surface.
  const a = keywordsFor({
    title: 'Nemotron 3.5 Super VL vs Microsoft Mage-VL: two video paths',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Nemotron'],
  });
  assert.match(a, /\bNemotron 3\.5 Super VL\b/);
  assert.match(a, /\bNemotron\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Nemotron 3.5 Super VL') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Nemotron 3.5 Super VL vs Qwen3.8 Omni Flash: You Cannot Have the Ears and the Weights',
    summary: 'Super VL variant named beside Qwen Omni Flash.',
    pillar: 'capability',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Nemotron'],
  });
  assert.match(b, /\bNemotron 3\.5 Super VL\b/);
  const c = keywordsFor({
    title: 'Nemotron ships for enterprise agents',
    summary: 'Bare Nemotron only — Super VL variant not named.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: ['Nemotron'],
  });
  assert.match(c, /\bNemotron\b/);
  assert.doesNotMatch(c, /Nemotron 3\.5 Super VL/);
});

test('news sitemap keywords include Airship from multi-title ISO + AISP tape (FINDABILITY #241)', () => {
  // Multi-title Airship AI tape while google-news-open: topic/source meta fill
  // the 12-cap and drop the company surface (parallel to Nscale #204).
  const a = keywordsFor({
    title: 'Airship Achieves ISO 42001 Certification, Clearing the Path for Responsible Enterprise AI',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: [],
  });
  assert.match(a, /\bAirship\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Airship') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Airship AI Holdings Inc. Cl A (AISP) Stock Price Today - The Wall Street Journal',
    summary: 'AISP holdings named beside finance wires.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: [],
  });
  assert.match(b, /\bAirship\b/);
  const c = keywordsFor({
    title: 'Enterprise AI vendors race ISO certifications',
    summary: 'No named holdings vendor — balloon/vehicle noise must not invent a needle.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: [],
  });
  assert.doesNotMatch(c, /\bAirship\b/);
});

test('news sitemap keywords include ModelSphere from multi-title RiseUnion tape (FINDABILITY #250)', () => {
  // Multi-title ModelSphere open-source LLM serving tape while google-news-open:
  // topic/source meta fill the 12-cap and drop the product surface.
  const a = keywordsFor({
    title: '4Paradigm and RiseUnion Open-Source ModelSphere for Heterogeneous LLM Serving',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: [],
  });
  assert.match(a, /\bModelSphere\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('ModelSphere') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Phancy and RiseUnion Launch ModelSphere, an Open-Source, One-Stop Production-Grade AI Deployment Platform',
    summary: 'RiseUnion named beside open-source deployment wires.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: [],
  });
  assert.match(b, /\bModelSphere\b/);
  const c = keywordsFor({
    title: 'Open-source LLM serving platforms race production deployments',
    summary: 'No named product — generic serving noise must not invent a needle.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: [],
  });
  assert.doesNotMatch(c, /\bModelSphere\b/);
});

test('news sitemap keywords include Krea / Krea 3 from multi-title image-model tape (FINDABILITY #256)', () => {
  // Multi-title Krea 3 tape while google-news-open: Qwen / topic meta fill the
  // 12-cap and drop the product surface (live lag on vs-Qwen Image title).
  const a = keywordsFor({
    title: 'Krea 3 vs Qwen Image 3.0: The Open Line Stopped Here',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: [],
  });
  assert.match(a, /\bKrea\b/);
  assert.match(a, /\bKrea 3\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Krea') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Krea 3 – Frontier Image Model 4× faster than Nano Banana Pro',
    summary: 'Frontier image model named beside Nano Banana.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: [],
  });
  assert.match(b, /\bKrea\b/);
  assert.match(b, /\bKrea 3\b/);
  const c = keywordsFor({
    title: 'Frontier image models race open line quality',
    summary: 'No named product — generic image-model noise must not invent a needle.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: [],
  });
  assert.doesNotMatch(c, /\bKrea\b/);
});

test('news sitemap keywords include Flux 3 from multi-title Image Klein tape (FINDABILITY #258)', () => {
  // Multi-title Flux 3 / FLUX 3 Image Klein tape while google-news-open:
  // topic/source meta fill the 12-cap when titles rotate into newest-200.
  const a = keywordsFor({
    title: "Black Forest Labs' open-weights image model FLUX 3 Image Klein runs on consumer GPUs with just 8 GB of VRAM",
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: [],
  });
  assert.match(a, /\bFlux 3\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Flux 3') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Flux 3 Image Klein',
    summary: 'Black Forest Labs open-weights image model.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: [],
  });
  assert.match(b, /\bFlux 3\b/);
  const c = keywordsFor({
    title: 'Open-weights image models race consumer GPU footprints',
    summary: 'No named Flux product — generic image-model noise must not invent a needle.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: [],
  });
  assert.doesNotMatch(c, /\bFlux 3\b/);
});

test('news sitemap keywords include Together AI from multi-title hosting tape (FINDABILITY #260)', () => {
  // Multi-title Together AI tape: Stanford Hybrid Reasoning Agents + Muse Spark
  // Open on Together; topic/source meta fill the 12-cap on rotate-in.
  const a = keywordsFor({
    title: 'New paper from Stanford, Together AI, UIUC, and Meta introduces Hybrid Reasoning Agents',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: [],
  });
  assert.match(a, /\bTogether AI\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Together AI') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Meta Muse Spark Open is live on Together AI',
    summary: 'Open-weight Muse Spark hosted on Together.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: ['Meta'],
  });
  assert.match(b, /\bTogether AI\b/);
  const c = keywordsFor({
    title: 'Open-weight models race hosted inference platforms',
    summary: 'No named Together surface — generic hosting noise must not invent a needle.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: [],
  });
  assert.doesNotMatch(c, /\bTogether AI\b/);
});

test('news sitemap keywords include Terafab from multi-title TSMC / Musk tape (FINDABILITY #267)', () => {
  // Multi-title Terafab tape: TSMC / Musk Texas fab talks; bare TSMC fills a
  // 12-cap slot while product-class Terafab titles drop the fab surface.
  const a = keywordsFor({
    title: 'TSMC Weighs Texas Expansion, Holds Talks on Musk’s Terafab',
    summary: '',
    pillar: 'compute',
    kind: 'press',
    source: 'wires-ai',
    entities: ['TSMC'],
  });
  assert.match(a, /\bTerafab\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Terafab') < parts.indexOf('compute'), a);
  const b = keywordsFor({
    title: 'TSMC Open to Working With Terafab But Must Control Plants',
    summary: 'Operational control stays with TSMC if Terafab proceeds.',
    pillar: 'compute',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['TSMC'],
  });
  assert.match(b, /\bTerafab\b/);
  const c = keywordsFor({
    title: 'TSMC expands Texas capacity talks without naming a fab brand',
    summary: 'Generic foundry noise must not invent a product-class fab needle.',
    pillar: 'compute',
    kind: 'press',
    source: 'wires-ai',
    entities: ['TSMC'],
  });
  assert.doesNotMatch(c, /\bTerafab\b/);
});

test('news sitemap keywords include Cohere from multi-title AISLE / cyber tape (FINDABILITY #269)', () => {
  // Multi-title Cohere tape: acquisition / cyber; without a lab needle,
  // headline-only rows drop Cohere under the 12-cap (entity path is optional).
  const a = keywordsFor({
    title: 'Cohere is Buying Its Customers Better Cybersecurity',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: [],
  });
  assert.match(a, /\bCohere\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Cohere') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Cohere to acquire AISLE to advance cyber-resilient sovereign AI',
    summary: 'Cohere buys AISLE for sovereign AI security.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: [],
  });
  assert.match(b, /\bCohere\b/);
  const c = keywordsFor({
    title: 'Sovereign AI security vendors consolidate without naming a lab',
    summary: 'Generic cyber M&A noise must not invent a named-lab needle.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: [],
  });
  assert.doesNotMatch(c, /\bCohere\b/);
});

test('news sitemap keywords include Accenture from multi-title Claude spend tape (FINDABILITY #271)', () => {
  // Multi-title Accenture tape: Claude spend caps; Anthropic / Claude fill
  // 12-cap slots and drop the consulting-buyer company surface.
  const a = keywordsFor({
    title: 'Some Accenture employees spent $1,000 a month on Anthropic’s Claude AI, the company will now pay only $29',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Anthropic', 'Claude'],
  });
  assert.match(a, /\bAccenture\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Accenture') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Accenture Tells Employees They Can Now Spend Only $29 on Claude Per Month',
    summary: 'Consulting giant caps Claude spend.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: ['Claude'],
  });
  assert.match(b, /\bAccenture\b/);
  const c = keywordsFor({
    title: 'Enterprises cap monthly Claude spend without naming a consultancy',
    summary: 'Generic buyer-spend noise must not invent a company needle.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Claude'],
  });
  assert.doesNotMatch(c, /\bAccenture\b/);
});

test('news sitemap keywords include G7 from multi-title AI cyber drill tape (FINDABILITY #273)', () => {
  // Multi-title G7 tape: AI cyberattack drills on banks; Google / topic /
  // source meta fill 12-cap and drop the G7 forum surface.
  const a = keywordsFor({
    title: 'G7 Finance Leaders Approve AI Cyberattack Drills',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: [],
  });
  assert.match(a, /\bG7\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('G7') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'G7 Will Stage Fake AI Cyberattacks on Banks to Find the Cracks First',
    summary: 'Finance ministers plan simulated AI attacks.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: [],
  });
  assert.match(b, /\bG7\b/);
  const c = keywordsFor({
    title: 'Finance ministers plan bank cyber drills without naming a forum',
    summary: 'Generic cyber-drill noise must not invent a forum needle.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: [],
  });
  assert.doesNotMatch(c, /\bG7\b/);
});

test('news sitemap keywords include Bee Frontier / Bee Eclipse from multi-title wearable tape (FINDABILITY #275)', () => {
  // Multi-title Bee Frontier / Bee Eclipse tape: bare Bee fills a 12-cap slot
  // while product-class device titles drop the Frontier / Eclipse surfaces.
  const a = keywordsFor({
    title: 'Amazon Unveils Bee Frontier and Bee Eclipse AI Listening Devices',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Amazon'],
  });
  assert.match(a, /\bBee Frontier\b/);
  assert.match(a, /\bBee Eclipse\b/);
  assert.match(a, /\bBee\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Bee Frontier') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Amazon launches two AI wearables, the $75 Bee Frontier wristband and $100 Bee Eclipse magnetic phone-attachment recorder',
    summary: 'Personal AI listening devices from Amazon Bee.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: ['Amazon'],
  });
  assert.match(b, /\bBee Frontier\b/);
  assert.match(b, /\bBee Eclipse\b/);
  const c = keywordsFor({
    title: 'Amazon Debuts Revamped Bee AI Wearables, $12-a-Month Subscription Plan',
    summary: 'Bare Bee wearable tape must not invent Frontier or Eclipse needles.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Amazon'],
  });
  assert.match(c, /\bBee\b/);
  assert.doesNotMatch(c, /\bBee Frontier\b/);
  assert.doesNotMatch(c, /\bBee Eclipse\b/);
});

test('news sitemap keywords include Surface Laptop Ultra from multi-title AI-laptop tape (FINDABILITY #277)', () => {
  // Multi-title Surface Laptop Ultra tape: Microsoft / Copilot fill 12-cap
  // slots while product-class AI-laptop titles drop the Surface surface.
  const a = keywordsFor({
    title: 'Surface Laptop Ultra review: a different kind of MacBook Pro',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Microsoft'],
  });
  assert.match(a, /\bSurface Laptop Ultra\b/);
  assert.match(a, /\bMicrosoft\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Surface Laptop Ultra') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Running local AI models on Microsoft’s Surface Laptop Ultra: What we found',
    summary: 'On-device AI laptop coverage from Microsoft Surface.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: ['Microsoft'],
  });
  assert.match(b, /\bSurface Laptop Ultra\b/);
  const c = keywordsFor({
    title: 'Microsoft expands Copilot on Surface devices for enterprise AI',
    summary: 'Bare Surface / Copilot tape must not invent the Ultra laptop product needle.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Microsoft'],
  });
  assert.match(c, /\bMicrosoft\b/);
  assert.doesNotMatch(c, /\bSurface Laptop Ultra\b/);
});

test('news sitemap keywords include RTX Spark from multi-title on-device AI PC tape (FINDABILITY #279)', () => {
  // Multi-title RTX Spark tape: NVIDIA / NVDA fill 12-cap slots while
  // product-class on-device AI PC titles drop the RTX Spark surface.
  const a = keywordsFor({
    title: 'NVIDIA RTX Spark Laptops Launch Worldwide With Local AI Agent Support',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['NVIDIA'],
  });
  assert.match(a, /\bRTX Spark\b/);
  assert.match(a, /\bNVIDIA\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('RTX Spark') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'NVIDIA RTX Spark PCs Available Today — A New Beginning for Windows PCs',
    summary: 'On-device AI PC launch coverage from NVIDIA.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: ['NVIDIA'],
  });
  assert.match(b, /\bRTX Spark\b/);
  const c = keywordsFor({
    title: 'NVIDIA expands NVDA AI GPU lineup for enterprise inference',
    summary: 'Bare NVIDIA / NVDA tape must not invent the Spark PC product needle.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['NVIDIA'],
  });
  assert.match(c, /\bNVIDIA\b/);
  assert.doesNotMatch(c, /\bRTX Spark\b/);
});

test('news sitemap keywords include Qwen 4 Max from multi-title model tape (FINDABILITY #282)', () => {
  // Multi-title Qwen 4 Max tape: bare Qwen / Alibaba Qwen fill 12-cap slots
  // while product-class vs Muse Spark / Claude Opus titles drop Qwen 4 Max.
  const a = keywordsFor({
    title: 'Claude Opus 5.5 vs Qwen 4 Max: who publishes speed?',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Qwen', 'Claude'],
  });
  assert.match(a, /\bQwen 4 Max\b/);
  assert.match(a, /\bQwen\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Qwen 4 Max') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Muse Spark vs Qwen 4 Max: one side has no endpoint',
    summary: 'Model compare coverage naming the Max product class.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: ['Qwen', 'Meta'],
  });
  assert.match(b, /\bQwen 4 Max\b/);
  const c = keywordsFor({
    title: 'Alibaba Qwen expands open-weight Tongyi releases for enterprise',
    summary: 'Bare Qwen / Alibaba tape must not invent the Max product needle.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Qwen', 'Alibaba'],
  });
  assert.match(c, /\bQwen\b/);
  assert.doesNotMatch(c, /\bQwen 4 Max\b/);
});

test('news sitemap keywords include Beam from multi-title open-model tape (FINDABILITY #286)', () => {
  // Multi-title Beam tape: topic / China AI / source meta fill 12-cap slots
  // while product-class Reflection Beam / Welcome Beam titles drop Beam.
  const a = keywordsFor({
    title: "Reflection's Beam aims to undercut Chinese open models with fewer tokens, not cheaper tokens",
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Google'],
  });
  assert.match(a, /\bBeam\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Beam') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Welcome Beam: a 501B open model you can own, customize, and scale',
    summary: 'Open-weight model launch naming the Beam product class.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: [],
  });
  assert.match(b, /\bBeam\b/);
  const c = keywordsFor({
    title: 'Alibaba Qwen expands open-weight Tongyi releases for enterprise',
    summary: 'Unrelated open-model tape must not invent the Reflection product needle.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Qwen', 'Alibaba'],
  });
  assert.match(c, /\bQwen\b/);
  assert.doesNotMatch(c, /\bBeam\b/);
});

test('news sitemap keywords include Vercel from multi-title Jev adoption tape (FINDABILITY #298)', () => {
  // Multi-title Vercel tape: Jev / Google / OpenRouter fill 12-cap slots while
  // company-class Vercel titles drop the host surface.
  const a = keywordsFor({
    title: 'Vercel data shows Jev posts fastest early AI model adoption',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Google', 'Jev'],
  });
  assert.match(a, /\bVercel\b/);
  assert.match(a, /\bJev\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Vercel') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Jev is Vercel\u2019s fastest-adopted AI model ever',
    summary: 'Curly-apostrophe possessive still matches the Vercel needle.',
    pillar: 'attention',
    kind: 'press',
    source: 'techcrunch-ai',
    entities: ['Jev', 'OpenRouter'],
  });
  assert.match(b, /\bVercel\b/);
  const c = keywordsFor({
    title: 'Jev AI model hits fastest adoption ever, used by Fortune 500',
    summary: 'Model-only tape — hosting company surface not named.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Jev'],
  });
  assert.match(c, /\bJev\b/);
  assert.doesNotMatch(c, /\bVercel\b/);
});

test('news sitemap keywords include Elorian from multi-title Glimpse tape (FINDABILITY #302)', () => {
  // Multi-title Elorian tape: Google / GPT / topic meta fill 12-cap slots while
  // company-class Elorian titles drop the lab surface.
  const a = keywordsFor({
    title: 'Elorian launches Glimpse, an AI model built to reason in pictures',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Google'],
  });
  assert.match(a, /\bElorian\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Elorian') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Elorian\u2019s first AI model wants to reason with images, not just about them',
    summary: 'Curly-apostrophe possessive still matches the Elorian needle.',
    pillar: 'attention',
    kind: 'press',
    source: 'techcrunch-ai',
    entities: ['GPT', 'GPT-6 Astra'],
  });
  assert.match(b, /\bElorian\b/);
  const c = keywordsFor({
    title: 'Glimpse AI model wants to reason with images, not just about them',
    summary: 'Product-only tape — company surface not named.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Glimpse'],
  });
  assert.doesNotMatch(c, /\bElorian\b/);
});

test('news sitemap keywords include Dell from multi-title AI-infra tape (FINDABILITY #304)', () => {
  // Multi-title Dell tape: Google / Supermicro / topic meta fill 12-cap slots
  // while company-class Dell titles drop the infra surface.
  const a = keywordsFor({
    title: 'How Dell Transformed From PC King to AI Infrastructure Giant',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: ['Google'],
  });
  assert.match(a, /\bDell\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Dell') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Hewlett Packard Enterprise Falls 5% as AI Financing Worries Extend Hardware Selloff; Super Micro Sinks 7%, Dell Drops 3%',
    summary: 'Selloff tape still matches trailing Dell needle.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Supermicro', 'Google'],
  });
  assert.match(b, /\bDell\b/);
  const c = keywordsFor({
    title: 'AI infrastructure giants race to ship more servers this quarter',
    summary: 'Infra-only tape — company surface not named.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Google'],
  });
  assert.doesNotMatch(c, /\bDell\b/);
});

test('news sitemap keywords include NYC Council from SpaceX AI-safety hearing tape (FINDABILITY #306)', () => {
  // Multi-title NYC Council tape: SpaceX / Starshield / Google fill 12-cap
  // while agency-class NYC Council titles drop the hearing surface.
  const a = keywordsFor({
    title: "Elon Musk's SpaceX to testify at NYC Council meeting on AI safety",
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['SpaceX', 'Google', 'Elon Musk'],
  });
  assert.match(a, /\bNYC Council\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('NYC Council') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'NYC Council hearing testimony from SpaceX about AI safety',
    summary: 'Hearing tape still matches leading NYC Council needle.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['SpaceX', 'Google'],
  });
  assert.match(b, /\bNYC Council\b/);
  const c = keywordsFor({
    title: 'SpaceX to testify at city council meeting on AI safety',
    summary: 'Generic council tape — agency surface not named.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['SpaceX'],
  });
  assert.doesNotMatch(c, /\bNYC Council\b/);
});

test('news sitemap keywords include GPT-Live-1 from multi-title voice tape (FINDABILITY #336)', () => {
  // Multi-title GPT-Live-1 tape: GPT / Google / GPT-Live fill 12-cap slots
  // while #214 GPT-Live-1.1 needle does not match bare GPT-Live-1.
  const a = keywordsFor({
    title: 'GPT-Live-1 vs Qwen-Audio-3.1: The Full-Duplex Fight Is the One Worth Having',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['GPT', 'Qwen', 'Google'],
  });
  assert.match(a, /\bGPT-Live-1\b/);
  assert.match(a, /\bGPT-Live\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('GPT-Live-1') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'GPT-Live-1 Prompt-to-Voice: Nine New International Voices',
    summary: 'OpenAI voice product adds languages.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['GPT', 'Google'],
  });
  assert.match(b, /\bGPT-Live-1\b/);
  const c = keywordsFor({
    title: 'OpenAI expands ChatGPT Voice with GPT-Live-1.1 latency cuts',
    summary: 'Voice product update with lower latency.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['OpenAI', 'ChatGPT'],
  });
  assert.match(c, /\bGPT-Live-1\.1\b/);
  // labNeedleRe treats hyphen/dot as boundaries, so GPT-Live-1.1 also emits
  // the GPT-Live-1 SKU needle (family surface) — require both.
  assert.match(c, /\bGPT-Live-1\b/);
});

test('news sitemap keywords include Kling 4.0 from multi-title video tape (FINDABILITY #336)', () => {
  // Multi-title Kling tape: Google / topic meta fill 12-cap while product
  // titles drop the Kling / Kling 4.0 surface.
  const a = keywordsFor({
    title: 'Kuaishou launches Kling 4.0, a next-gen AI video model for professionals',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Google'],
  });
  assert.match(a, /\bKling\b/);
  assert.match(a, /\bKling 4\.0\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Kling') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Kling AI Officially Launches Next-Generation Kling 4.0, Raising the Bar for Professional-Grade Video',
    summary: 'Kuaishou generative video update.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: ['Google'],
  });
  assert.match(b, /\bKling\b/);
  assert.match(b, /\bKling 4\.0\b/);
  const c = keywordsFor({
    title: 'Kuaishou expands cloud rendering for short-form creators',
    summary: 'Bare Kuaishou tape must not invent the video-model product needle.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Google'],
  });
  assert.doesNotMatch(c, /\bKling\b/);
});

test('news sitemap keywords include Xing 4.0 from multi-title MoE tape (FINDABILITY #338)', () => {
  // Multi-title Xing tape: Nemotron / Qwen / Google fill 12-cap while product
  // titles drop the Xing / Xing 4.0 surface.
  const a = keywordsFor({
    title: 'Xing 4.0 29B-A4B vs Nemotron 3.5 Lightning 30B-A3B: Same Shape, Different Licence',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Nemotron', 'Google'],
  });
  assert.match(a, /\bXing\b/);
  assert.match(a, /\bXing 4\.0\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Xing') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Xing 4.0 29B-A4B vs Qwen 3.8 27B: Vision or Tool Calling',
    summary: 'OrcaRouter sparse MoE comparison.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Alibaba Qwen', 'Qwen', 'Google'],
  });
  assert.match(b, /\bXing\b/);
  assert.match(b, /\bXing 4\.0\b/);
  const c = keywordsFor({
    title: 'Nemotron 3.5 Lightning lands as a compact open MoE for agents',
    summary: 'Bare Nemotron Lightning tape must not invent an unrelated MoE product needle.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Nemotron', 'Google'],
  });
  assert.doesNotMatch(c, /\bXing\b/);
});

test('news sitemap keywords include Replit from multi-title Anthropic tape (FINDABILITY #340)', () => {
  // Multi-title Replit tape: Anthropic / OpenAI / ChatGPT / Claude fill 12-cap
  // while company-class Replit titles drop the host surface.
  const a = keywordsFor({
    title: 'Replit ends partnership with Anthropic, citing cost and performance; shifts focus to OpenAI.',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Anthropic', 'OpenAI', 'Google'],
  });
  assert.match(a, /\bReplit\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Replit') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Replit is no longer working with Anthropic, CEO says',
    summary: 'Amjad Masad comments at TechCrunch Disrupt.',
    pillar: 'attention',
    kind: 'press',
    source: 'techcrunch-ai',
    entities: ['Anthropic', 'Claude'],
  });
  assert.match(b, /\bReplit\b/);
  const c = keywordsFor({
    title: 'Cloud IDE vendor ends Anthropic partnership and shifts focus to OpenAI',
    summary: 'Generic partnership noise must not invent a company needle.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Anthropic', 'OpenAI'],
  });
  assert.doesNotMatch(c, /\bReplit\b/);
});

test('news sitemap keywords include Siri from multi-title vs Gemini tape (FINDABILITY #342)', () => {
  // Multi-title Siri tape: Gemini / Google / Argon / Apple Intelligence fill
  // 12-cap while product-class Siri titles drop the assistant surface.
  const a = keywordsFor({
    title: 'I Tested Siri and Gemini\'s Inbox-Digging Feature for a Week. The Winner Surprised Me.',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Gemini', 'Google'],
  });
  assert.match(a, /\bSiri\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Siri') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Siri vs. Gemini: Who Wins the Mobile AI Battle?',
    summary: 'Assistant comparison without inventing unrelated tags.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Gemini', 'Google'],
  });
  assert.match(b, /\bSiri\b/);
  const c = keywordsFor({
    title: 'How Does Apple\'s Siri Compete in an Agentic World?',
    summary: 'Apple Intelligence alias path still keeps the Siri surface.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: ['Google', 'Apple'],
  });
  assert.match(c, /\bSiri\b/);
  const d = keywordsFor({
    title: 'Mobile assistants compete on inbox digging without naming the products',
    summary: 'Generic assistant noise must not invent an Apple voice-assistant product needle.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Gemini', 'Google'],
  });
  assert.doesNotMatch(d, /\bSiri\b/);
});

test('news sitemap keywords include Claude Mythos 5 from multi-title tape (FINDABILITY #344)', () => {
  // Multi-title Mythos 5 tape: Claude / Qwen / Mythos / Qwen3.8 fill 12-cap
  // while version-class Claude Mythos 5 titles drop the SKU surface.
  const a = keywordsFor({
    title: 'Claude Mythos 5 vs Qwen3.8-Max: Three Changes in Seven Weeks',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Claude', 'Qwen', 'Google'],
  });
  assert.match(a, /\bClaude Mythos 5\b/);
  assert.match(a, /\bMythos 5\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Claude Mythos 5') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Claude Mythos 5 vs Qwen3.8-Max: Tre cambiamenti in sette settimane',
    summary: 'Italian mirror of the EN comparison tape.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Claude', 'Qwen', 'Google'],
  });
  assert.match(b, /\bClaude Mythos 5\b/);
  assert.match(b, /\bMythos 5\b/);
  const c = keywordsFor({
    title: 'Claude Mythos 5 vs DeepSeek V4 Pro: price gap fifteenfold',
    summary: 'Bare Mythos alone must not drop the version SKU.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Claude', 'DeepSeek', 'Google'],
  });
  assert.match(c, /\bClaude Mythos 5\b/);
  const d = keywordsFor({
    title: 'Claude expands safety eval access without naming a version SKU',
    summary: 'Generic Claude tape must not invent a Mythos version-class needle.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Claude', 'Google'],
  });
  assert.doesNotMatch(d, /\bClaude Mythos 5\b/);
  assert.doesNotMatch(d, /\bMythos 5\b/);
});

test('news sitemap keywords include Qwen3.8-Max from multi-title SKU tape (FINDABILITY #346)', () => {
  // Multi-title Qwen3.8-Max tape: Claude / Mythos / Qwen / Qwen3.8 fill 12-cap
  // while the Max SKU surface is dropped (parallel to Mythos 5 #344).
  const a = keywordsFor({
    title: 'Claude Mythos 5 vs Qwen3.8-Max: Three Changes in Seven Weeks',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Claude', 'Qwen', 'Google'],
  });
  assert.match(a, /\bQwen3\.8-Max\b/);
  assert.match(a, /\bQwen3\.8\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Qwen3.8-Max') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Claude Mythos 5 vs Qwen3.8-Max: Tre cambiamenti in sette settimane',
    summary: 'Italian mirror of the EN comparison tape.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Claude', 'Qwen', 'Google'],
  });
  assert.match(b, /\bQwen3\.8-Max\b/);
  // Space form via hyphen↔space flex (#310).
  const c = keywordsFor({
    title: 'Nemotron 3.5 Super VL vs Qwen3.8 Max: Open vs Hosted',
    summary: 'Space-form Max SKU beside Super VL.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Nemotron', 'Qwen', 'Google'],
  });
  assert.match(c, /\bQwen3\.8-Max\b/);
  const d = keywordsFor({
    title: 'Qwen3.8 Omni Flash expands multilingual audio tools',
    summary: 'Bare Qwen3.8 / Omni Flash tape must not invent the Max SKU needle.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Qwen', 'Google'],
  });
  assert.match(d, /\bQwen3\.8\b/);
  assert.doesNotMatch(d, /\bQwen3\.8-Max\b/);
});

test('news sitemap keywords include Xing 4.0 29B-A4B from multi-title size-SKU tape (FINDABILITY #348)', () => {
  // Multi-title Xing 4.0 29B-A4B tape: Xing / Xing 4.0 fill 12-cap while the
  // size-class 29B-A4B surface is dropped (parallel to Qwen3.8-27B #290).
  const a = keywordsFor({
    title: 'Xing 4.0 29B-A4B vs Nemotron 3.5 Lightning 30B-A3B: Same Shape, Different Licence',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Nemotron', 'Google'],
  });
  assert.match(a, /\bXing 4\.0 29B-A4B\b/);
  assert.match(a, /\bXing 4\.0\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Xing 4.0 29B-A4B') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Xing 4.0 29B-A4B vs Qwen 3.8 27B: Vision or Tool Calling',
    summary: 'Size-SKU comparison beside Qwen 3.8 27B.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Qwen', 'Google'],
  });
  assert.match(b, /\bXing 4\.0 29B-A4B\b/);
  const c = keywordsFor({
    title: 'Xing 4.0 expands MoE tool calling without naming a size SKU',
    summary: 'Bare Xing 4.0 tape must not invent the 29B-A4B size-class needle.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Google'],
  });
  assert.match(c, /\bXing 4\.0\b/);
  assert.doesNotMatch(c, /\bXing 4\.0 29B-A4B\b/);
});

test('news sitemap keywords include PS5 from multi-title local-AI console tape (FINDABILITY #320)', () => {
  // Multi-title PS5 tape: Llama / Sony / GGUF / topic meta fill 12-cap slots
  // while product-class local-AI console titles drop the PS5 surface.
  const a = keywordsFor({
    title: 'Llama.cpp on a jailbroken PS5: run any GGUF model natively on the console',
    summary: '',
    pillar: 'attention',
    kind: 'forum',
    source: 'hn-fresh-ai',
    entities: ['Llama'],
  });
  assert.match(a, /\bPS5\b/);
  assert.match(a, /\bLlama\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('PS5') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Jailbroken PS5 Turns into a Local AI Machine with Speeds Above 100 Tokens Per Second',
    summary: 'Local inference on a jailbroken PlayStation console.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Google'],
  });
  assert.match(b, /\bPS5\b/);
  const c = keywordsFor({
    title: 'Sony expands PlayStation cloud gaming for AI-assisted titles',
    summary: 'Bare Sony / PlayStation tape must not invent the console product needle.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Sony'],
  });
  assert.match(c, /\bSony\b/);
  assert.doesNotMatch(c, /\bPS5\b/);
});

test('news sitemap keywords include Bee AI from multi-title wearable tape (FINDABILITY #356)', () => {
  // Multi-title Bee AI tape: bare Bee / Amazon fill 12-cap while the contiguous
  // Bee AI surface is dropped (FAQ #167 gates the lab).
  const a = keywordsFor({
    title: "Amazon's new Bee AI devices have a bystander problem, says former AWS security engineer",
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Amazon', 'Google', 'AWS'],
  });
  assert.match(a, /\bBee AI\b/);
  assert.match(a, /\bBee\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Bee AI') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Amazon launches Bee AI devices that can listen throughout your day',
    summary: 'Always-listening wearable tape beside AWS security commentary.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Amazon', 'Google'],
  });
  assert.match(b, /\bBee AI\b/);
  // Bare Bee Frontier tape must not invent the Bee AI needle.
  // (Summary must not name the needle — keywordsFor hay is title+summary.)
  const c = keywordsFor({
    title: 'Amazon’s all-new Bee Frontier is available now: Shop this always-listening wearable',
    summary: 'Bare Frontier wearable tape must not invent a contiguous product-class compound needle.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Amazon', 'Google'],
  });
  assert.match(c, /\bBee Frontier\b/);
  assert.doesNotMatch(c, /(^|,\s*)Bee AI(,|$)/);
});

test('news sitemap keywords include Flying Roadster from multi-title aerial tape (FINDABILITY #354)', () => {
  // Multi-title Flying Roadster tape: Roadster / FSD / Tesla fill 12-cap while
  // the contiguous Flying Roadster surface is dropped (FAQ #185 gates the lab).
  const a = keywordsFor({
    title: 'Trump, Pichai and Even Altman Praise Tesla’s Flying Roadster EV',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: ['Tesla', 'Google'],
  });
  assert.match(a, /\bFlying Roadster\b/);
  assert.match(a, /\bRoadster\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Flying Roadster') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Five Big Questions About Tesla’s New Flying Roadster',
    summary: 'Aerial thruster unveil beside FSD robotaxi tape.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: ['Tesla', 'Google'],
  });
  assert.match(b, /\bFlying Roadster\b/);
  const c = keywordsFor({
    title: 'Watch Chip Rout Intensifies and Tesla Showcases Flying Roadster',
    summary: 'GPU selloff briefing beside aerial Roadster demo.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: ['Tesla', 'Google'],
  });
  assert.match(c, /\bFlying Roadster\b/);
  // Bare Roadster / FSD tape must not invent the Flying Roadster needle.
  // (Summary must not name the needle — keywordsFor hay is title+summary.)
  const d = keywordsFor({
    title: 'Tesla unveils its new Roadster sports car, which can thrust itself into the air',
    summary: 'Bare Roadster / FSD tape must not invent a contiguous Flying product needle.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: ['Tesla', 'Google'],
  });
  assert.match(d, /\bRoadster\b/);
  assert.doesNotMatch(d, /\bFlying Roadster\b/);
});

test('news sitemap keywords include Amazon Web Services from multi-title CFO tape (FINDABILITY #360)', () => {
  // Multi-title Amazon Web Services tape: Amazon / Google fill 12-cap while the
  // contiguous long-form surface is dropped (AWS acronym does not match; FAQ #167).
  const a = keywordsFor({
    title: 'Amazon Web Services CFO: AI spending paying off',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Amazon', 'Google'],
  });
  assert.match(a, /\bAmazon Web Services\b/);
  assert.match(a, /\bAmazon\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Amazon Web Services') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Exclusive: Amazon Web Services CFO says AI spending is sustainable',
    summary: 'Cloud AI capex commentary beside Bedrock tape.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Amazon', 'Google'],
  });
  assert.match(b, /\bAmazon Web Services\b/);
  // Short AWS / bare Amazon tape must not invent the long-form needle.
  // (Summary must not name the needle — keywordsFor hay is title+summary.)
  const c = keywordsFor({
    title: 'AWS expands Bedrock regions for enterprise AI',
    summary: 'Short AWS acronym tape must not invent a contiguous long-form cloud needle.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Amazon', 'Google', 'AWS'],
  });
  assert.match(c, /\bAWS\b/);
  assert.doesNotMatch(c, /\bAmazon Web Services\b/);
});

test('news sitemap keywords include M5 Max from multi-title Apple Silicon tape (FINDABILITY #364)', () => {
  // Multi-title M5 Max tape: Apple / Apple Intelligence / RTX Spark fill 12-cap
  // while the contiguous Apple Silicon SKU surface is dropped (FAQ #170 gates lab).
  const a = keywordsFor({
    title: "Nvidia RTX Spark First Tests: Can These Ambitious AI Laptops Beat Apple's M5 Max?",
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['NVIDIA', 'Google', 'Apple'],
  });
  assert.match(a, /\bM5 Max\b/);
  assert.match(a, /\bRTX Spark\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('M5 Max') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: "Nvidia's RTX Spark Superchip in the Surface Laptop Ultra outperforms Apple's M5 Max MacBook Pro by ~25%",
    summary: 'Agentic AI completion benchmarks beside Qwen models.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['NVIDIA', 'Apple', 'Qwen'],
  });
  assert.match(b, /\bM5 Max\b/);
  // Bare M5 / MacBook Pro tape must not invent the Max SKU needle.
  // (Summary must not name the needle — keywordsFor hay is title+summary.)
  const c = keywordsFor({
    title: 'Apple M5 chip launch brings on-device AI to MacBook Pro',
    summary: 'Bare M5 / MacBook Pro tape must not invent a contiguous Max SKU needle.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Apple', 'Google'],
  });
  assert.match(c, /\bApple\b/);
  assert.doesNotMatch(c, /\bM5 Max\b/);
});

test('news sitemap keywords include NIST from multi-title Anthropic crypto tape (FINDABILITY #370)', () => {
  // Multi-title NIST tape: Anthropic / Claude fill 12-cap while the contiguous
  // standards-body surface is dropped (FAQ #368/#362 gate the lab).
  const a = keywordsFor({
    title: 'Anthropic Traces NIST P-256 Seed to a 1997 Random Generator',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Anthropic', 'Google'],
  });
  assert.match(a, /\bNIST\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('NIST') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Anthropic Says Claude Traced NIST ECDSA Curve Seeds to a 1990S RNG',
    summary: 'Claude chain-of-thought on curve seed origins.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Anthropic', 'Claude', 'Google'],
  });
  assert.match(b, /\bNIST\b/);
  // administration / ECDSA-only tape must not invent the NIST needle.
  // (Summary must not name the needle — keywordsFor hay is title+summary.)
  const c = keywordsFor({
    title: 'Intel CEO Lip-Bu Tan says the Trump administration does not have any policy',
    summary: 'Bare administration tape must not invent a contiguous standards-body acronym.',
    pillar: 'attention',
    kind: 'press',
    source: 'techmeme',
    entities: ['Intel'],
  });
  assert.doesNotMatch(c, /\bNIST\b/);
  const d = keywordsFor({
    title: 'Claude reveals ECDSA curve origins',
    summary: 'Bare curve-seed forum tape without naming the standards body.',
    pillar: 'attention',
    kind: 'forum',
    source: 'hn-fresh-ai',
    entities: ['Claude'],
  });
  assert.doesNotMatch(d, /\bNIST\b/);
});

test('news sitemap keywords include Ondas from Ondas–Palantir JV tape (FINDABILITY #404)', () => {
  // Multi-title Ondas–Palantir tape: Palantir / AIP fill 12-cap while the
  // contiguous Ondas partner surface is dropped (Palantir FAQ gates lab).
  const a = keywordsFor({
    title: 'RTX, AeroVironment And Ondas-Palantir Push Deeper Into Drone Defense And AI This Week',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Palantir'],
  });
  assert.match(a, /\bOndas\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Ondas') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Stocktwits Defense Watch: RTX Continues Deal Momentum, Ondas-Palantir Launch AI Firm As AeroVironment Strike Four International Deals',
    summary: 'Ondas and Palantir launch a joint AI firm for defense deployments.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Palantir'],
  });
  assert.match(b, /\bOndas\b/);
  // bare Palantir / AeroVironment titles must not invent the partner needle.
  // (Summary must not name the needle — keywordsFor hay is title+summary.)
  const c = keywordsFor({
    title: 'Palantir AIP wins another government AI contract',
    summary: 'Defense software tape without naming the JV partner company.',
    pillar: 'attention',
    kind: 'press',
    source: 'techmeme',
    entities: ['Palantir'],
  });
  assert.doesNotMatch(c, /\bOndas\b/);
  const d = keywordsFor({
    title: 'AeroVironment Strike Four International Deals This Week',
    summary: 'Drone-defense tape without the JV partner company surface.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: [],
  });
  assert.doesNotMatch(d, /\bOndas\b/);
});

test('news sitemap keywords include Allied Universal from SoftBank acquisition tape (FINDABILITY #380)', () => {
  // Multi-title Allied Universal tape: SoftBank fills 12-cap while the contiguous
  // company surface is dropped (FAQ #374 gates `/lab/softbank.html`).
  const a = keywordsFor({
    title: 'SoftBank weighs $18 billion acquisition of Allied Universal, source says',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['SoftBank'],
  });
  assert.match(a, /\bAllied Universal\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Allied Universal') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Sources: SoftBank weighs buying US security services giant Allied Universal at an ~$18B equity valuation, as Masayoshi Son explores deploying AI-powered robots (Bloomberg)',
    summary: 'SoftBank Group Corp. is considering an acquisition of Allied Universal.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['SoftBank'],
  });
  assert.match(b, /\bAllied Universal\b/);
  // bare "Allied" shorthand must not invent the full company needle.
  // (Summary must not name the needle — keywordsFor hay is title+summary.)
  const c = keywordsFor({
    title: 'SoftBank Is Said to Weigh Buying Top US Security Firm Allied',
    summary: 'Bare Allied shorthand tape must not invent the full company name.',
    pillar: 'attention',
    kind: 'press',
    source: 'techmeme',
    entities: ['SoftBank'],
  });
  assert.doesNotMatch(c, /\bAllied Universal\b/);
  const d = keywordsFor({
    title: 'Key facts: SoftBank (9984) $18B Allied talks; robotics; Nokia AI RAN',
    summary: 'Deal-talk shorthand without the Universal company surface.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['SoftBank', 'Nokia'],
  });
  assert.doesNotMatch(d, /\bAllied Universal\b/);
});

test('news sitemap keywords include Blackstone from Anthropic financing tape (FINDABILITY #382)', () => {
  // Multi-title Blackstone tape: Anthropic / Claude fill 12-cap while the
  // contiguous PE surface is dropped (FAQ #163/#362/#368 gate the lab).
  const a = keywordsFor({
    title: 'Anthropic offers Blackstone double-digit yield in latest chip financing',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Anthropic', 'Google'],
  });
  assert.match(a, /\bBlackstone\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Blackstone') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Sources: Anthropic is offering Blackstone a 10%+ yield to help finance Anthropic\'s $60B debt package to buy Google TPUs; Blackstone would invest $9B in the debt (Financial Times)',
    summary: 'High borrowing costs complicate AI lab debt package.',
    pillar: 'attention',
    kind: 'press',
    source: 'techmeme',
    entities: ['Anthropic', 'Google'],
  });
  assert.match(b, /\bBlackstone\b/);
  // Anthropic / AI Jitters tape without Blackstone must not invent the needle.
  const c = keywordsFor({
    title: 'Anthropic raises debt package to buy Google TPUs',
    summary: 'Bare Anthropic financing tape must not invent a PE counterparty.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Anthropic', 'Google'],
  });
  assert.doesNotMatch(c, /\bBlackstone\b/);
  const d = keywordsFor({
    title: 'Bloomberg Businessweek Daily: AI Jitters Persist',
    summary: 'Market-jitter noise without naming the PE firm.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: [],
  });
  assert.doesNotMatch(d, /\bBlackstone\b/);
});

test('news sitemap keywords include Dory 1.0 from Nemotron Labs tape (FINDABILITY #384)', () => {
  // Multi-title Dory 1.0 tape: NVIDIA / Nemotron / Qwen fill 12-cap while the
  // contiguous model SKU is dropped (`/lab/nvidia.html` gates the lab).
  const a = keywordsFor({
    title: 'NVIDIA Nemotron Labs Dory 1.0 4B: a quiet HF release',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['NVIDIA', 'Nemotron'],
  });
  assert.match(a, /\bDory 1\.0\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Dory 1.0') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Dory 1.0 4B vs Qwen 3.8: a 4B against a three-tier line',
    summary: 'Small open-weight SKU vs Qwen three-tier line.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Qwen'],
  });
  assert.match(b, /\bDory 1\.0\b/);
  // bare Nemotron / Qwen tape must not invent Dory 1.0.
  const c = keywordsFor({
    title: 'Nvidia unveils Nemotron 3.5 open models for AI agents',
    summary: 'Bare Nemotron tape must not invent the Dory SKU.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['NVIDIA', 'Nemotron'],
  });
  assert.doesNotMatch(c, /\bDory 1\.0\b/);
  const d = keywordsFor({
    title: 'Qwen 3.8 Max lands on Alibaba Cloud',
    summary: 'Bare Qwen version tape without the Dory SKU.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Qwen'],
  });
  assert.doesNotMatch(d, /\bDory 1\.0\b/);
});

test('news sitemap keywords include Nemotron 3.5 from multi-title version tape (FINDABILITY #386)', () => {
  // Multi-title Nemotron 3.5 tape: bare Nemotron / Super VL fill 12-cap while
  // the contiguous version surface is dropped (`/lab/nvidia.html` gates).
  const a = keywordsFor({
    title: 'Nvidia unveils Nemotron 3.5 open models for AI agents, targeting server to edge',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['NVIDIA', 'Nemotron'],
  });
  assert.match(a, /\bNemotron 3\.5\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Nemotron 3.5') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Nvidia\'s Nemotron 3.5 Super VL is an open model built to run enterprise AI agents nonstop',
    summary: 'Super VL SKU beside the Nemotron 3.5 line.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['NVIDIA', 'Nemotron'],
  });
  assert.match(b, /\bNemotron 3\.5\b/);
  // bare Nemotron / Dory tape must not invent the 3.5 version.
  const c = keywordsFor({
    title: 'NVIDIA Nemotron Labs Dory 1.0 4B: a quiet HF release',
    summary: 'Bare Nemotron Labs tape must not invent the 3.5 version SKU.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['NVIDIA', 'Nemotron'],
  });
  assert.doesNotMatch(c, /\bNemotron 3\.5\b/);
  const d = keywordsFor({
    title: 'Nemotron open models expand agent runtime support',
    summary: 'Bare Nemotron line without the 3.5 version surface.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Nemotron'],
  });
  assert.doesNotMatch(d, /\bNemotron 3\.5\b/);
});

test('news sitemap keywords include MOSS-Image from multi-title image-model tape (FINDABILITY #394)', () => {
  // Multi-title MOSS-Image tape: GPT / FLUX / Qwen / Nano Banana fill 12-cap
  // while the contiguous product surface is dropped (no doorway lab).
  const a = keywordsFor({
    title: 'MOSS-Image vs GPT Image 2.5: Weights or an Endpoint',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['GPT'],
  });
  assert.match(a, /\bMOSS-Image\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('MOSS-Image') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'MOSS-Image vs FLUX 3: Two Ways to Put a Bounding Box in a Prompt',
    summary: 'Open-weight image model beside FLUX 3.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['FLUX'],
  });
  assert.match(b, /\bMOSS-Image\b/);
  const c = keywordsFor({
    title: 'MOSS-Image vs Nano Banana 2: Twelve Days to Shutdown',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Nano Banana'],
  });
  assert.match(c, /\bMOSS-Image\b/);
  // bare FLUX / Nano Banana tape must not invent the open-weight image surface.
  const d = keywordsFor({
    title: 'FLUX 3 lands a tighter bounding-box prompt path',
    summary: 'Bare FLUX tape without the open-weight image product surface.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['FLUX'],
  });
  assert.doesNotMatch(d, /\bMOSS-Image\b/);
});

test('news sitemap keywords include ECDSA from multi-title Anthropic curve-seed tape (FINDABILITY #397)', () => {
  const a = keywordsFor({
    title: 'Anthropic Says Claude Traced NIST ECDSA Curve Seeds to a 1990S RNG',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Anthropic', 'Claude', 'NIST'],
  });
  assert.match(a, /\bECDSA\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('ECDSA') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Claude found the seeds for ECDSA. Proof of no NSA backdoor, but also...',
    summary: 'Forum tape beside Claude curve-seed reconstruction.',
    pillar: 'attention',
    kind: 'forum',
    source: 'reddit-singularity',
    entities: ['Claude'],
  });
  assert.match(b, /\bECDSA\b/);
  const c = keywordsFor({
    title: 'Claude reveals ECDSA curve origins',
    summary: '',
    pillar: 'attention',
    kind: 'forum',
    source: 'hn-fresh-ai',
    entities: ['Claude'],
  });
  assert.match(c, /\bECDSA\b/);
  // bare Claude / Anthropic tape must not invent ECDSA.
  const d = keywordsFor({
    title: 'Anthropic ships a quieter Claude coding update',
    summary: 'Bare Claude tape about a coding release, no cryptography.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Anthropic', 'Claude'],
  });
  assert.doesNotMatch(d, /\bECDSA\b/);
});

test('news sitemap keywords include Chrome from ChatGPT browser-assistant tape (FINDABILITY #390)', () => {
  // Multi-title ChatGPT Chrome tape: ChatGPT / OpenAI / GPT fill 12-cap while
  // the contiguous browser surface is dropped (FAQ #191 gates OpenAI lab).
  const a = keywordsFor({
    title: 'ChatGPT for Chrome can now read tabs, compare prices, and send messages.',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['ChatGPT', 'OpenAI'],
  });
  assert.match(a, /\bChrome\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Chrome') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'ChatGPT becomes a full Chrome browser assistant that reads and acts on your open tabs',
    summary: 'Browser-assistant surface beside ChatGPT computer use.',
    pillar: 'attention',
    kind: 'press',
    source: 'the-decoder',
    entities: ['ChatGPT', 'OpenAI'],
  });
  assert.match(b, /\bChrome\b/);
  const c = keywordsFor({
    title: 'ChatGPT can peek at your Chrome tabs now',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['ChatGPT'],
  });
  assert.match(c, /\bChrome\b/);
  // bare ChatGPT / OpenAI tape must not invent the browser-assistant surface.
  const d = keywordsFor({
    title: 'OpenAI ships ChatGPT voice upgrades for desktop',
    summary: 'Bare ChatGPT tape without the browser-assistant surface.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['OpenAI', 'ChatGPT'],
  });
  assert.doesNotMatch(d, /\bChrome\b/);
});
test('news sitemap keywords include AI safety bill from multi-title legislative tape (FINDABILITY #358)', () => {
  // Multi-title AI safety bill tape: Anthropic / Claude / AI safety fill 12-cap
  // while the contiguous legislative surface is dropped (FAQ #163 gates the lab).
  const a = keywordsFor({
    title: 'Anthropic proposes AI safety bill with strict intervention thresholds - Politico By Investing.com',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Anthropic', 'Google'],
  });
  assert.match(a, /\bAI safety bill\b/);
  assert.match(a, /\bAnthropic\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('AI safety bill') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Anthropic said to pitch AI safety bill to US Congress',
    summary: 'Legislative draft beside Claude safety-eval tape.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Anthropic', 'Google'],
  });
  assert.match(b, /\bAI safety bill\b/);
  const c = keywordsFor({
    title: 'Anthropic quietly pitches its own AI safety bill to lawmakers',
    summary: 'Politico report on intervention thresholds.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Anthropic', 'Google'],
  });
  assert.match(c, /\bAI safety bill\b/);
  // Bare AI safety / NYC Council hearing must not invent the bill needle.
  // (Summary must not name the needle — keywordsFor hay is title+summary.)
  const d = keywordsFor({
    title: "Elon Musk's SpaceX to testify at NYC Council meeting on AI safety",
    summary: 'Bare AI safety hearing tape must not invent a contiguous legislative bill needle.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['SpaceX', 'Google'],
  });
  assert.match(d, /\bAI safety\b/);
  assert.doesNotMatch(d, /\bAI safety bill\b/);
});

test('news sitemap keywords include Anthropic IPO from multi-title IPO tape (FINDABILITY #352)', () => {
  // Multi-title Anthropic IPO tape: Anthropic / Claude / AI IPOs fill 12-cap
  // while the contiguous event surface is dropped (FAQ #163 gates the lab).
  const a = keywordsFor({
    title: 'Could an Anthropic IPO put your 401(k) at risk? The AI safety debate hits a new dimension.',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Anthropic', 'Google'],
  });
  assert.match(a, /\bAnthropic IPO\b/);
  assert.match(a, /\bAnthropic\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Anthropic IPO') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Anthropic IPO timing, price is major factor for stocks now, says CIO',
    summary: 'CIO weighs filing window beside Claude fundraising tape.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Anthropic', 'Google'],
  });
  assert.match(b, /\bAnthropic IPO\b/);
  const c = keywordsFor({
    title: 'Anthropic IPO raises 401(k) concerns amid AI safety debate',
    summary: 'Retirement-plan exposure beside safety eval tape.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Anthropic', 'Google'],
  });
  assert.match(c, /\bAnthropic IPO\b/);
  // Bare Anthropic / Claude tape must not invent the IPO event needle.
  // (Summary must not name the needle — keywordsFor hay is title+summary.)
  const d = keywordsFor({
    title: 'Anthropic expands Claude safety eval access for enterprise buyers',
    summary: 'Bare Anthropic / Claude tape must not invent a contiguous IPO event needle.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Anthropic', 'Google'],
  });
  assert.match(d, /\bAnthropic\b/);
  assert.doesNotMatch(d, /\bAnthropic IPO\b/);
});

test('news sitemap keywords include PS5s from plural local-AI console tape (FINDABILITY #350)', () => {
  // Plural companion to #320: labNeedleRe does not match PS5s for the PS5
  // needle, so the plural surface drops under the 12-cap (Mac Studios #292).
  const a = keywordsFor({
    title: 'Jailbroken PS5s can now run local AI models at over 100+ tokens per second — fork of PS5LM goes native',
    summary: '',
    pillar: 'attention',
    kind: 'forum',
    source: 'reddit-artificial',
    entities: [],
  });
  assert.match(a, /\bPS5s\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('PS5s') < parts.indexOf('attention'), a);
  // Singular PS5 titles keep the singular needle without inventing plural.
  const b = keywordsFor({
    title: 'Llama.cpp on a jailbroken PS5: run any GGUF model natively on the console',
    summary: 'Singular console tape — plural form not named alone.',
    pillar: 'attention',
    kind: 'forum',
    source: 'hn-fresh-ai',
    entities: ['Llama'],
  });
  assert.match(b, /\bPS5\b/);
  assert.doesNotMatch(b, /(^|,\s*)PS5s(,|$)/);
  // Bare Sony / PlayStation must not invent the plural console needle.
  // (Summary must not name the needle — keywordsFor hay is title+summary.)
  const c = keywordsFor({
    title: 'Sony expands PlayStation cloud gaming for AI-assisted titles',
    summary: 'Bare Sony / PlayStation tape must not invent a plural console product needle.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Sony'],
  });
  assert.doesNotMatch(c, /\bPS5s\b/);
});

test('news sitemap keywords include Mac Studio from Apple–Meta Muse local tape (FINDABILITY #294)', () => {
  // Singular Mac Studio: Apple / Meta / Muse / Apple Intelligence fill 12-cap
  // while #292 plural needle does not match "Mac Studio".
  const a = keywordsFor({
    title: 'Apple and Meta Team Up to Run Muse Local AI Model on Mac Studio',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Meta', 'Apple'],
  });
  assert.match(a, /\bMac Studio\b/);
  assert.match(a, /\bMuse\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Mac Studio') < parts.indexOf('attention'), a);
  // Plural titles keep Mac Studios without false-adding a duplicate singular
  // when only the plural surface is named.
  const b = keywordsFor({
    title: 'Meta Muse Spark Open brings 816B-parameter AI to Mac Studios',
    summary: 'Plural Mac Studios host — singular form not named alone.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Meta'],
  });
  assert.match(b, /\bMac Studios\b/);
  assert.doesNotMatch(b, /(^|,\s*)Mac Studio(,|$)/);
  const c = keywordsFor({
    title: 'Muse Spark Open vs DeepSeek for coding agents',
    summary: 'Product-class compare — Apple silicon host surface not named.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: ['Meta'],
  });
  assert.match(c, /\bMuse Spark Open\b/);
  assert.doesNotMatch(c, /\bMac Studio\b/);
});

test('news sitemap keywords include Mac Studios from multi-title Muse Spark Open tape (FINDABILITY #292)', () => {
  // Multi-title Mac Studios tape: Muse Spark / Muse Spark Open fill 12-cap
  // slots while hardware-host titles drop the Mac Studios surface.
  const a = keywordsFor({
    title: 'Meta Muse Spark Open brings 816B-parameter AI to Mac Studios',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Meta'],
  });
  assert.match(a, /\bMac Studios\b/);
  assert.match(a, /\bMuse Spark Open\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Mac Studios') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Meta releases Muse Spark Open: it runs on two Mac Studios, and its license bans passing off its output',
    summary: 'Open-weight Muse Spark Open naming dual Mac Studios hosts.',
    pillar: 'attention',
    kind: 'forum',
    source: 'reddit-artificial',
    entities: ['Meta'],
  });
  assert.match(b, /\bMac Studios\b/);
  const c = keywordsFor({
    title: 'Muse Spark Open vs DeepSeek for coding agents',
    summary: 'Product-class compare — Apple silicon host surface not named.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: ['Meta'],
  });
  assert.match(c, /\bMuse Spark Open\b/);
  assert.doesNotMatch(c, /\bMac Studios\b/);
});

test('news sitemap keywords include Qwen3.8-27B from multi-title SKU tape (FINDABILITY #290)', () => {
  // Multi-title Qwen3.8-27B tape: Qwen / Qwen3.8 fill 12-cap slots while
  // size-class titles drop the 27B surface.
  const a = keywordsFor({
    title: "Hy-Memory-30B-A3B vs Qwen3.8-27B : À l'usage vs capital",
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Qwen'],
  });
  assert.match(a, /\bQwen3\.8-27B\b/);
  assert.match(a, /\bQwen3\.8\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Qwen3.8-27B') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'ZwZ2-9B vs. Qwen3.8-27B: Der 9B-Slot, den Qwen offen ließ',
    summary: 'Size-class open-weight compare naming the 27B SKU.',
    pillar: 'capability',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Alibaba Qwen'],
  });
  assert.match(b, /\bQwen3\.8-27B\b/);
  const c = keywordsFor({
    title: 'Qwen3.8 Max ships for enterprise agents',
    summary: 'Versioned Max only — 27B size-class surface not named.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: ['Qwen'],
  });
  assert.match(c, /\bQwen3\.8\b/);
  assert.doesNotMatch(c, /Qwen3\.8-27B/);
});

test('news sitemap keywords include Qwen3.8 from multi-title Max + Omni Flash tape (FINDABILITY #238)', () => {
  // Multi-title Qwen3.8 tape: bare Qwen fills a 12-cap slot while Max / Omni
  // Flash vs-Nemotron titles omit the version surface.
  const a = keywordsFor({
    title: 'Nemotron 3.5 Super VL vs Qwen3.8 Max: Open vs Hosted',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Nemotron', 'Qwen'],
  });
  assert.match(a, /\bQwen3\.8\b/);
  assert.match(a, /\bNemotron 3\.5 Super VL\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Qwen3.8') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Nemotron 3.5 Super VL vs Qwen3.8 Omni Flash: You Cannot Have the Ears and the Weights',
    summary: 'Qwen3.8 Omni Flash named beside Super VL.',
    pillar: 'capability',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['Nemotron', 'Qwen'],
  });
  assert.match(b, /\bQwen3\.8\b/);
  const c = keywordsFor({
    title: 'Qwen ships for enterprise agents',
    summary: 'Bare Qwen only — versioned Max / Omni surfaces not named.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: ['Qwen'],
  });
  assert.match(c, /\bQwen\b/);
  assert.doesNotMatch(c, /Qwen3\.8/);
});

test('news sitemap keywords include DeepSeek V4 Pro from multi-title tape (FINDABILITY #236)', () => {
  // Multi-title DeepSeek V4 Pro tape: bare DeepSeek fills a 12-cap slot while
  // vs-Nemotron titles omit the V4 Pro product surface.
  const a = keywordsFor({
    title: 'Nemotron 3.5 Bolt 74B vs DeepSeek V4 Pro: 24GB vs 1.6T',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['DeepSeek', 'Nemotron'],
  });
  assert.match(a, /\bDeepSeek V4 Pro\b/);
  assert.match(a, /\bBolt\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('DeepSeek V4 Pro') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Nemotron 3.5 Super VL vs DeepSeek V4 Pro: pixel economics',
    summary: 'V4 Pro named beside Super VL.',
    pillar: 'capability',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['DeepSeek', 'Nemotron'],
  });
  assert.match(b, /\bDeepSeek V4 Pro\b/);
  assert.match(b, /\bNemotron 3\.5 Super VL\b/);
  const c = keywordsFor({
    title: 'DeepSeek V4.1 Pro Leak: A 180 tok/s Unlabelled Endpoint',
    summary: 'V4.1 Pro must not trip the V4 Pro needle.',
    pillar: 'attention',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['DeepSeek'],
  });
  assert.match(c, /\bDeepSeek V4\.1\b/);
  assert.doesNotMatch(c, /DeepSeek V4 Pro/);
});

test('news sitemap keywords include Bolt from Nemotron 3.5 Bolt multi-title tape (FINDABILITY #234)', () => {
  // Multi-title Nemotron 3.5 Bolt companion tape: bare Nemotron fills a 12-cap
  // slot while HF slug + "Bolt Models" titles omit the Bolt product surface.
  const a = keywordsFor({
    title: 'Nvidia/Nvidia-Nemotron-3.5-Bolt-74B-A9B-24GB',
    summary: '',
    pillar: 'attention',
    kind: 'press',
    source: 'hf-daily-papers',
    entities: ['NVIDIA', 'Nemotron'],
  });
  assert.match(a, /\bBolt\b/);
  assert.match(a, /\bNemotron\b/);
  const parts = a.split(', ');
  assert.ok(parts.indexOf('Bolt') < parts.indexOf('attention'), a);
  const b = keywordsFor({
    title: 'Open From Data Center to Desktop: NVIDIA Expands Nemotron Family With Highest Efficiency Super VL and Bolt Models',
    summary: 'Bolt companion named beside Super VL.',
    pillar: 'capability',
    kind: 'press',
    source: 'gnews-ai',
    entities: ['NVIDIA', 'Nemotron'],
  });
  assert.match(b, /\bBolt\b/);
  assert.match(b, /\bNemotron\b/);
  // Contiguous "Nemotron 3.5 Super VL" is absent here — Super VL needle stays #231.
  assert.doesNotMatch(b, /Nemotron 3\.5 Super VL/);
  const c = keywordsFor({
    title: 'Nemotron ships for enterprise agents',
    summary: 'Bare Nemotron only — companion variant not named.',
    pillar: 'attention',
    kind: 'press',
    source: 'wires-ai',
    entities: ['Nemotron'],
  });
  assert.match(c, /\bNemotron\b/);
  assert.doesNotMatch(c, /\bBolt\b/);
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
