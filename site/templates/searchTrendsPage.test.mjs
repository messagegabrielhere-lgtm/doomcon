import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render } from './searchTrendsPage.mjs';
import { render as renderMarkets } from './aiPredictionMarketsPage.mjs';

const ctx = {
  url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
  href: (p) => p,
  state: { generated_at: '2026-10-14T15:00:00.000Z', level: 4, score: 56.1 },
};

test('searchTrendsPage renders watchlist and FAQ schema', () => {
  const html = render(ctx, {
    ok: true,
    generated_at: '2026-10-14T15:00:00.000Z',
    geos: [{ geo: 'US', ok: true }],
    ai_trends: [{ title: 'chatgpt update', traffic: 20000, traffic_raw: '20000+', geo: 'US', head_terms: ['chatgpt'], news: [] }],
    head_terms: [{ id: 'chatgpt', label: 'ChatGPT', path: '/lab/openai.html', trending: true, titles: [{ geo: 'US', title: 'chatgpt update' }] }],
  }, []);
  assert.match(html, /Which Google Search Trends for AI does/);
  assert.match(html, /chatgpt update/);
  assert.match(html, /Which head terms already have/);
  assert.match(html, /"@type"\s*:\s*"FAQPage"/);
  assert.match(html, /Mintieo/);
  assert.match(html, /api\/search-trends\.json/);
  // FINDABILITY #158 — watchlist FAQ routes stock / neocloud Trends to gated pages.
  assert.match(html, /Where does SIREN send IREN stock, dram stock, CoreWeave stock, and neocloud Trends\?/);
  assert.match(html, /\/watts\.html/);
  assert.match(html, /\/lab\/micron\.html/);
  assert.match(html, /\/lab\/coreweave\.html/);
  assert.match(html, /\/tags\/neoclouds\.html/);
  assert.match(html, /CoreWeave stock \/ CRWV \/ debt \/ bond yields/);
  assert.match(html, /Nvidia \/ NVDA stock → \/lab\/nvidia\.html/);
  // FINDABILITY #162 — OpenAI lawsuit / FTC suits route to gated lab.
  assert.match(html, /OpenAI lawsuit \/ FTC \/ ChatGPT suits → \/lab\/openai\.html/);
  assert.match(html, /not legal advice/);
  // FINDABILITY #163 — Anthropic IPO / FTC route to gated lab.
  assert.match(html, /Anthropic IPO \/ FTC → \/lab\/anthropic\.html/);
  // FINDABILITY #362 — Anthropic AI safety bill route to same gated lab.
  assert.match(html, /Anthropic AI safety bill → \/lab\/anthropic\.html/);
  assert.match(html, /not IPO advice/);
  // FINDABILITY #368 — Anthropic Canadian data-centre route to same gated lab.
  assert.match(html, /Anthropic Canadian data centres → \/lab\/anthropic\.html/);
  assert.match(html, /not a construction forecast/);
  // FINDABILITY #164 — ASML / EUV route to gated lab.
  assert.match(html, /ASML \/ EUV AI chip tools → \/lab\/asml\.html/);
  // FINDABILITY #165 — TSMC / AI foundry route to gated lab.
  assert.match(html, /TSMC \/ AI foundry → \/lab\/tsmc\.html/);
  // FINDABILITY #167 — Amazon Bee / AI wearables route to gated lab.
  assert.match(html, /Amazon Bee \/ AI wearables → \/lab\/amazon\.html/);
  // FINDABILITY #169 — Meta Muse / open-weight AI route to gated lab.
  assert.match(html, /Meta Muse \/ open-weight AI → \/lab\/meta\.html/);
  // FINDABILITY #193 — Meta–Apple Mac AI route to gated Meta lab.
  assert.match(html, /Meta–Apple Mac AI \/ Muse on Mac → \/lab\/meta\.html/);
  // FINDABILITY #195 — Samsung AI glasses route to gated Samsung lab.
  assert.match(html, /Samsung AI glasses → \/lab\/samsung\.html/);
  // FINDABILITY #170 — Apple Intelligence route to gated lab.
  assert.match(html, /Apple Intelligence → \/lab\/apple\.html/);
  // FINDABILITY #171 — Microsoft Copilot route to gated lab.
  assert.match(html, /Microsoft Copilot → \/lab\/microsoft\.html/);
  // FINDABILITY #220 — Microsoft MAI-Base route to same gated lab.
  assert.match(html, /Microsoft MAI-Base \/ MAI-Base-2 → \/lab\/microsoft\.html/);
  // FINDABILITY #173 — Grok / xAI route to gated lab.
  assert.match(html, /Grok \/ xAI → \/lab\/xai\.html/);
  // FINDABILITY #174 / #187 — Gemini / Gemma / Argon route to gated DeepMind lab.
  assert.match(html, /Gemini \/ Gemma \/ Argon → \/lab\/google-deepmind\.html/);
  // FINDABILITY #175 — Samsung / HBM / AI memory route to gated Samsung lab.
  assert.match(html, /Samsung \/ HBM \/ AI memory → \/lab\/samsung\.html/);
  // FINDABILITY #183 — Palantir / AIP route to gated Palantir lab.
  assert.match(html, /Palantir \/ AIP → \/lab\/palantir\.html/);
  // FINDABILITY #184 — AMD / MI300 route to gated AMD lab.
  assert.match(html, /AMD \/ MI300 → \/lab\/amd\.html/);
  // FINDABILITY #185 — Tesla / FSD route to gated Tesla lab.
  assert.match(html, /Tesla \/ FSD → \/lab\/tesla\.html/);
  // FINDABILITY #372 — Waymo Canada / Toronto route to gated Waymo lab.
  assert.match(html, /Waymo Canada \/ Toronto robotaxi → \/lab\/waymo\.html/);
  // FINDABILITY #374 — SoftBank / Allied Universal route to gated SoftBank lab.
  assert.match(html, /SoftBank \/ Allied Universal → \/lab\/softbank\.html/);
  assert.match(html, /not a launch forecast/);
  // FINDABILITY #176 — Character.ai bankruptcy route to gated Chatbots tag.
  assert.match(html, /Character\.ai bankruptcy → \/tags\/chatbots\.html/);
  // FINDABILITY #177 — Qwen / Alibaba open models route to gated Qwen lab.
  assert.match(html, /Qwen \/ Alibaba open models → \/lab\/qwen\.html/);
  // FINDABILITY #178 — Oracle / AI datacenters route to gated Datacenters tag.
  assert.match(html, /Oracle \/ AI datacenters → \/tags\/datacenters\.html/);
  // FINDABILITY #179 — DeepSeek outage route to gated DeepSeek lab.
  assert.match(html, /DeepSeek outage → \/lab\/deepseek\.html/);
  // FINDABILITY #180 — Mistral / Timestral route to gated Mistral lab.
  assert.match(html, /Mistral \/ Timestral → \/lab\/mistral\.html/);
  // FINDABILITY #181 — OpenAI outage route to gated OpenAI lab.
  assert.match(html, /OpenAI outage → \/lab\/openai\.html/);
  // FINDABILITY #191 — ChatGPT Chrome / computer use route to gated OpenAI lab.
  assert.match(html, /ChatGPT Chrome \/ computer use → \/lab\/openai\.html/);
  // FINDABILITY #182 — Hugging Face hack route to gated Hugging Face tag.
  assert.match(html, /Hugging Face hack → \/tags\/huggingface\.html/);
  assert.match(html, /not investment advice/);
  assert.match(html, /not credit analysis/);
});

test('searchTrendsPage stays honest when Trends is dark', () => {
  const html = render(ctx, { ok: false, geos: [], ai_trends: [], head_terms: [] }, []);
  assert.match(html, /did not answer|No AI-related/i);
});

test('searchTrendsPage canonical stays on /search-trends.html (FINDABILITY #124 alias reuse)', () => {
  // build.mjs writes the same body to trends.html; canonical must not follow the alias path.
  const html = render(ctx, { ok: true, generated_at: '2026-10-14T15:00:00.000Z', geos: [], ai_trends: [], head_terms: [] }, []);
  assert.match(html, /rel="canonical" href="https:\/\/siren\.watch\/search-trends\.html"/);
  assert.doesNotMatch(html, /rel="canonical" href="https:\/\/siren\.watch\/trends\.html"/);
});

test('aiPredictionMarketsPage targets the head term without forecasting', () => {
  const html = renderMarkets(ctx, {
    generated_at: '2026-10-14T15:00:00.000Z',
    players: [{ rank: 1, name: 'Anthropic', market: { probability: 0.425 } }],
  });
  assert.match(html, /Where are live AI prediction market odds\?/);
  assert.match(html, /AI prediction markets/);
  assert.match(html, /42\.5%/);
  assert.match(html, /not a .* forecast/i);
  assert.match(html, /\/race\.html/);
  assert.match(html, /"@type"\s*:\s*"FAQPage"/);
  assert.match(html, /not a SIREN forecast|not a .* forecast/i);
});
