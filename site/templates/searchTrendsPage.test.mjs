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
  assert.match(html, /CoreWeave stock \/ debt \/ bond yields/);
  assert.match(html, /Nvidia \/ NVDA stock → \/lab\/nvidia\.html/);
  // FINDABILITY #162 — OpenAI lawsuit / FTC suits route to gated lab.
  assert.match(html, /OpenAI lawsuit \/ FTC \/ ChatGPT suits → \/lab\/openai\.html/);
  assert.match(html, /not legal advice/);
  // FINDABILITY #163 — Anthropic IPO / FTC route to gated lab.
  assert.match(html, /Anthropic IPO \/ FTC → \/lab\/anthropic\.html/);
  assert.match(html, /not IPO advice/);
  // FINDABILITY #164 — ASML / EUV route to gated lab.
  assert.match(html, /ASML \/ EUV AI chip tools → \/lab\/asml\.html/);
  // FINDABILITY #165 — TSMC / AI foundry route to gated lab.
  assert.match(html, /TSMC \/ AI foundry → \/lab\/tsmc\.html/);
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
