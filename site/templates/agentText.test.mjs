import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nowTxt, nowMd, llmsTxt, llmsFullTxt, topMover, topStories, mostCovered, citation, dispatchFeedUrl } from './agentText.mjs';
import { robots, AI_AGENTS } from './sitemap.mjs';

const url = (p) => `https://siren.watch${p}`;
const state = {
  generated_at: '2026-10-09T19:07:12.000Z',
  score: 57.31,
  level: 4,
  level_name: 'ROUTINE',
  level_since: '2026-10-08T03:00:00.000Z',
  delta_from_previous: -0.4,
  degraded: false,
  receipt_id: '2026-10-09T19-07-12Z',
  pillars: [
    { id: 'capability', name: 'Capability', score: 68.9, sources_ok: 1, sources_total: 4, in_composite: true },
    { id: 'compute', name: 'Compute & Capital', score: 47.0, sources_ok: 1, sources_total: 3, in_composite: true },
    { id: 'markets', name: 'Markets', score: null, dark: true, sources_ok: 0, sources_total: 4, in_composite: false },
  ],
};
const history = [
  { t: '2026-10-09T18:07:00.000Z', pillars: { capability: 60, compute: 40 } },
  { t: '2026-10-09T19:02:00.000Z', pillars: { capability: 67.4, compute: 49.5, markets: null } },
  { t: '2026-10-09T19:07:12.000Z', pillars: { capability: 68.9, compute: 47.0 } },
];
const news = {
  generated_at: '2026-10-09T19:10:00.000Z',
  sources: [{ id: 'verge-ai', label: 'The Verge' }],
  items: Array.from({ length: 14 }, (_, i) => ({
    id: `i${i}`,
    source: i === 0 ? 'verge-ai' : 'hn',
    title: i === 0 ? 'Big [model] drop' : `Story ${i}`,
    url: i === 0 ? 'https://example.com/a_(b)' : `https://example.com/${i}`,
    published_at: `2026-10-09T1${i % 10}:00:00.000Z`,
    pillar: 'attention',
    score: i === 0 ? 90 : 10 + i,
  })),
};
const leaders = {
  leaders: [
    { name: 'A Person', org: 'Lab A', coverage: { count_7d: 12, saturated: false } },
    { name: 'B Person', org: 'Lab B', coverage: { count_7d: 100, saturated: true } },
    { name: 'C Person', org: 'Lab C', coverage: { state: 'dark' } },
  ],
};
const siSignals = {
  generated_at: '2026-10-09T19:05:00.000Z',
  agent_prs: { ok: true, total_24h: 516, by_agent: [{ name: 'Devin', prs_24h: 283 }, { name: 'Claude', prs_24h: 69 }] },
  frontier: { ok: true, models_total: 1078, models_90d: 32, newest: [{ model: 'M1', org: 'O1', date: '2026-09-30' }] },
  agi_forecast: { ok: false, error: 'token needed' },
  moltbook: { ok: true, agents_seen: 29, replies_seen: 110341 },
};

test('topMover compares against the previous observation, not the current one', () => {
  const m = topMover(state, history);
  assert.equal(m.id, 'compute');
  assert.ok(Math.abs(m.delta - -2.5) < 1e-9);
  assert.equal(m.prevAt, '2026-10-09T19:02:00.000Z');
  assert.equal(topMover(state, [history[2]]), null);
});

test('nowTxt is 3-6 plain lines with level, score, name, UTC time, meaning and URL', () => {
  const txt = nowTxt({ state, history, url });
  const lines = txt.trimEnd().split('\n');
  assert.ok(lines.length >= 3 && lines.length <= 6, `got ${lines.length} lines`);
  assert.match(lines[0], /^SIREN 4 · 57\.3\/100 · ROUTINE/);
  assert.match(txt, /Computed 2026-10-09 19:07 UTC/);
  assert.match(txt, /Top mover: Compute & Capital −2\.5 since the previous reading \(19:02 UTC\)/);
  assert.match(txt, /not a probability of harm and not a forecast/);
  assert.equal(lines[lines.length - 1], 'https://siren.watch/');
  assert.doesNotMatch(txt, /<|undefined|NaN/);
});

test('nowTxt omits the mover line when there is no earlier reading, and flags degraded', () => {
  const txt = nowTxt({ state: { ...state, degraded: true }, history: [], url });
  assert.doesNotMatch(txt, /Top mover/);
  assert.match(txt, /degraded/);
  assert.ok(txt.trimEnd().split('\n').length >= 3);
});

test('topStories and mostCovered order strictly from the data', () => {
  const top = topStories(news, 10);
  assert.equal(top.length, 10);
  assert.equal(top[0].id, 'i0');
  assert.equal(top[1].id, 'i13');
  assert.deepEqual(mostCovered(leaders).map((l) => l.name), ['B Person', 'A Person']);
});

test('nowMd carries the reading, pillars, stories, leaders, Takeover Watch and citation', () => {
  const md = nowMd({ state, history, news, leaders, siSignals, url });
  assert.match(md, /^# SIREN: current reading/);
  assert.match(md, /\| Compute & Capital \| 47\.0 \| 1\/3 \| yes \|/);
  assert.match(md, /\| Markets \| dark \| 0\/4 \| no \|/);
  assert.match(md, /1\. \[Big \\\[model\\\] drop\]\(https:\/\/example\.com\/a_%28b%29\) — The Verge · 2026-10-09 10:00 UTC · score 90\.0/);
  assert.equal((md.match(/^\d+\. \[/gm) || []).length, 10);
  assert.match(md, /- B Person \(Lab B\): 100\+ stories/);
  assert.doesNotMatch(md, /C Person/);
  assert.match(md, /516 pull requests/);
  assert.match(md, /Devin 283, Claude 69/);
  assert.doesNotMatch(md, /Metaculus/); // agi_forecast not ok -> left out
  assert.match(md, /"SIREN 4 · 57\.3\/100 at 19:07 UTC — siren\.watch"/);
  assert.match(md, /not a probability of harm/);
  assert.match(md, /api\/receipts\/2026-10-09T19-07-12Z\.json/);
  assert.doesNotMatch(md, /undefined|NaN/);
});

test('nowMd leaves out sections whose data is absent', () => {
  const md = nowMd({ state, history: [], url });
  assert.doesNotMatch(md, /Top 10 scored stories|Leaders most covered|Takeover Watch/);
  assert.match(md, /## How to cite/);
});

test('citation format', () => {
  assert.equal(citation(state, 'https://siren.watch/'), 'SIREN 4 · 57.3/100 at 19:07 UTC — siren.watch');
});

test('llms.txt follows the llmstxt.org shape and lists the endpoints', () => {
  const ctx = { url };
  const txt = llmsTxt(ctx);
  const lines = txt.split('\n');
  assert.match(lines[0], /^# SIREN/);
  assert.match(lines[2], /^> /);
  assert.ok(lines.length < 160, `${lines.length} lines`);
  for (const p of ['/api/now.txt', '/now.md', '/api/state.json', '/api/history.json', '/api/news.json', '/api/leaders.json',
    '/api/si-signals.json', '/api/search-index.json', '/api/fresh.json', '/api/health.json', '/api/receipts/', '/feed.xml', '/openapi.json']) {
    assert.ok(txt.includes(`https://siren.watch${p}`), p);
  }
  assert.ok(txt.includes(dispatchFeedUrl()));
  assert.match(dispatchFeedUrl(), /^https:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/dispatch-data\/emergency\.json$/);
  assert.match(txt, /## Use SIREN with your human/);
  assert.doesNotMatch(txt, /@[a-z0-9-]+\.[a-z]/i, 'no email addresses');
  const full = llmsFullTxt(ctx, { state, history, url });
  assert.ok(full.startsWith(txt));
  assert.match(full, /# SIREN: current reading/);
});

test('robots.txt welcomes each AI agent by name and keeps the sitemaps', () => {
  const r = robots({ url });
  for (const a of AI_AGENTS) assert.match(r, new RegExp(`User-agent: ${a}\\nAllow: /`));
  assert.ok(AI_AGENTS.includes('ClaudeBot') && AI_AGENTS.includes('GPTBot') && AI_AGENTS.includes('MistralAI-User'));
  assert.match(r, /^# .*https:\/\/siren\.watch\/llms\.txt/m);
  assert.match(r, /Sitemap: https:\/\/siren\.watch\/sitemap\.xml/);
  assert.match(r, /Sitemap: https:\/\/siren\.watch\/news-sitemap\.xml/);
  assert.doesNotMatch(r, /Disallow/);
});
