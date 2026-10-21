import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ols, doublingMonthsFromLog10Slope, summariseRecursion, parseMetrYaml,
  summariseHorizon, epochRows, summariseJumps, summariseCompute, summariseSilence,
  agentSearchQueries, CORE_REPOS,
} from '../labs-bench.mjs';

test('ols + doubling months from a clean log10 slope', () => {
  // log10(FLOP) rises 0.3010 per year → one doubling per year → 12 months.
  const pts = [[2020, 1], [2021, 1.30103], [2022, 1.60206], [2023, 1.90309]];
  const fit = ols(pts);
  assert.ok(fit);
  assert.ok(Math.abs(fit.b - 0.30103) < 1e-4);
  assert.equal(doublingMonthsFromLog10Slope(fit.b), 12);
  assert.equal(doublingMonthsFromLog10Slope(0), null);
});

test('summariseRecursion computes the agent share across repos', () => {
  const r = summariseRecursion([
    { repo: 'pytorch/pytorch', merged: 100, agent_merged: 10, merged_complete: true, agent_complete: true },
    { repo: 'google/jax', merged: 50, agent_merged: 5, merged_complete: true, agent_complete: true },
    { repo: 'ggml-org/llama.cpp', merged: null, agent_merged: null, error: 'timeout' },
  ], { since: '2026-10-06', window_days: 7 });
  assert.equal(r.ok, true);
  assert.equal(r.total_merged, 150);
  assert.equal(r.total_agent, 15);
  assert.equal(r.share, 0.1);
  assert.equal(r.repos[2].error, 'timeout');
  assert.equal(CORE_REPOS.length, 5);
});

test('parseMetrYaml + summariseHorizon read METR p50 minutes', () => {
  const yaml = `
benchmark_name: METR-Horizon-v1.1
doubling_time_in_days:
  from_2023_on:
    point_estimate: 128.744
results:
  gpt_4:
    metrics:
      is_sota: true
      p50_horizon_length:
        estimate: 6.0
        ci_low: 2.0
        ci_high: 12.0
    release_date: 2023-03-14
  claude_3_7_sonnet:
    metrics:
      is_sota: true
      p50_horizon_length:
        estimate: 60.0
        ci_low: 30.0
        ci_high: 100.0
    release_date: 2025-02-24
`;
  const h = summariseHorizon(parseMetrYaml(yaml));
  assert.equal(h.ok, true);
  assert.equal(h.benchmark, 'METR-Horizon-v1.1');
  assert.equal(h.doubling_days, 128.7);
  assert.equal(h.frontier.p50_hours, 1);
  assert.equal(h.models.length, 2);
});

test('summariseJumps flags a modern model more than 2σ above the FLOP trend', () => {
  const rows = [];
  for (let y = 2018; y <= 2024; y++) {
    rows.push({
      Model: `Base-${y}`, Organization: 'Lab', 'Publication date': `${y}-06-01`,
      'Training compute (FLOP)': String(10 ** (23 + (y - 2018) * 0.3)), Link: `https://example.com/${y}`,
    });
  }
  // Pre-2018 outlier must not enter the fit.
  rows.push({
    Model: 'Perceptron', Organization: 'Lab', 'Publication date': '1959-02-01',
    'Training compute (FLOP)': '600000000', Link: 'https://example.com/old',
  });
  // One release far above the line in 2023.
  rows.push({
    Model: 'Jump-Model', Organization: 'Frontier', 'Publication date': '2023-09-01',
    'Training compute (FLOP)': String(10 ** 28), Link: 'https://example.com/jump',
  });
  const models = epochRows(rows);
  const j = summariseJumps(models, { sigma_threshold: 2 });
  assert.equal(j.ok, true);
  assert.ok(j.flagged_count >= 1);
  assert.ok(j.flagged.some((f) => f.model === 'Jump-Model'));
  assert.ok(!j.flagged.some((f) => f.model === 'Perceptron'));
  assert.equal(agentSearchQueries('pytorch/pytorch', '2026-10-06').length, 12);
  const c = summariseCompute(models);
  assert.equal(c.ok, true);
  assert.equal(c.largest.model, 'Jump-Model');
  assert.ok(c.envelope.length >= 2);
});

test('summariseSilence reads leaders + news and flags long gaps', () => {
  const leaders = {
    leaders: [
      { id: 'a', name: 'A', org_id: 'openai', days_silent: 0, state: 'on_record', reason: null, last_statement_at: '2026-10-13T00:00:00Z' },
      { id: 'b', name: 'B', org_id: 'anthropic', days_silent: 10, state: 'no_line', reason: 'quiet', last_statement_at: '2026-10-03T00:00:00Z' },
      { id: 'c', name: 'C', org_id: 'deepseek', days_silent: null, state: 'no_line', reason: 'no_sources', last_statement_at: null },
    ],
  };
  const news = {
    generated_at: '2026-10-13T12:00:00Z', window_days: 7,
    items: [
      { title: 'OpenAI ships a model', entities: ['OpenAI'], published_at: '2026-10-12T00:00:00Z' },
      { title: 'Other news', entities: [], published_at: '2026-10-12T00:00:00Z' },
    ],
  };
  const s = summariseSilence(leaders, news, []);
  assert.equal(s.ok, true);
  const oai = s.labs.find((l) => l.id === 'openai');
  const ant = s.labs.find((l) => l.id === 'anthropic');
  const ds = s.labs.find((l) => l.id === 'deepseek');
  assert.equal(oai.days_silent, 0);
  assert.equal(oai.news_7d, 1);
  assert.equal(oai.flag, 'normal');
  assert.equal(ant.flag, 'long');
  assert.equal(ds.flag, 'unread');
});
