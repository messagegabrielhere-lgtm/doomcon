import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newsEligible, NEWS_WINDOW_HOURS, NEWS_SITEMAP_CAP, keywordsFor, render } from './newsSitemap.mjs';

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
