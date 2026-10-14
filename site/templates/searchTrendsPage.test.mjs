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
  assert.match(html, /Google Search Trends for AI/);
  assert.match(html, /chatgpt update/);
  assert.match(html, /Head-term watchlist/);
  assert.match(html, /"@type"\s*:\s*"FAQPage"/);
  assert.match(html, /Mintieo/);
  assert.match(html, /api\/search-trends\.json/);
});

test('searchTrendsPage stays honest when Trends is dark', () => {
  const html = render(ctx, { ok: false, geos: [], ai_trends: [], head_terms: [] }, []);
  assert.match(html, /did not answer|No AI-related/i);
});

test('aiPredictionMarketsPage targets the head term without forecasting', () => {
  const html = renderMarkets(ctx, {
    generated_at: '2026-10-14T15:00:00.000Z',
    players: [{ rank: 1, name: 'Anthropic', market: { probability: 0.425 } }],
  });
  assert.match(html, /AI prediction markets/);
  assert.match(html, /42\.5%/);
  assert.match(html, /not a .* forecast/i);
  assert.match(html, /\/race\.html/);
  assert.match(html, /"@type"\s*:\s*"FAQPage"/);
  assert.match(html, /not a SIREN forecast|not a .* forecast/i);
});
