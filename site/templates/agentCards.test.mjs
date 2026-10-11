import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  changesJson, changesTxt, mcpJson, agentCard, aiPlugin, mcpConfig, CHANGES_LIMITS,
  parseCadence, CADENCE_FALLBACK, nextCronSlot, cronIntervalSeconds, pollFields,
  newsWithHandoff, stripHandoff, manifestJson, isMachineFile, citeLine,
} from './agentCards.mjs';
import { useFromAgent } from './agentPages.mjs';
import { listTools } from '../../mcp/tools.mjs';

const url = (p) => `https://siren.watch${p}`;
const ctx = { url, href: (p) => p, state: { level: 4, level_name: 'ROUTINE', score: 53.9622, generated_at: '2026-10-11T00:33:37.535Z' } };

const hist = (t, score, level) => ({ generated_at: t, score, level, pillars: {} });
const history = [
  hist('2026-10-10T21:07:00.000Z', 56, 3),
  hist('2026-10-10T22:07:00.000Z', 54.5, 4),
  hist('2026-10-10T23:07:00.000Z', 54.0119, 4),
  hist('2026-10-11T00:07:00.000Z', 53.9622, 4),
];
const receipts = [
  { id: '2026-10-10T22-07-00Z', generated_at: '2026-10-10T22:07:00.000Z' },
  { id: '2026-10-11T00-07-00Z', generated_at: '2026-10-11T00:07:00.000Z' },
];
const news = {
  generated_at: '2026-10-11T00:35:59.255Z',
  sources: [{ id: 'verge', label: 'The Verge' }],
  items: [
    { id: 'a1', source: 'verge', title: 'Model  ships', url: 'https://x.test/a', published_at: '2026-10-11T00:20:00Z', pillar: 'capability', score: 40, meta: { first_seen_at: '2026-10-11T00:30:00.000Z' } },
    { id: 'b2', source: 'hn', title: 'Old thread', url: 'https://x.test/b', published_at: '2026-10-10T10:00:00Z', pillar: 'attention', score: 20, meta: { first_seen_at: '2026-10-10T10:05:00.000Z' } },
    { id: 'c3', source: 'hn', title: 'No first-seen', url: 'https://x.test/c', published_at: '2026-10-10T11:00:00Z', score: 20, meta: {} },
  ],
};

test('changes.json: readings with deltas and receipts, level changes, news by first-seen, newest first', () => {
  const c = changesJson({ state: ctx.state, history, news, url, receipts });
  assert.equal(c.generated_at, '2026-10-11T00:35:59.255Z');
  assert.deepEqual(c.sections, { readings: 4, level_changes: 1, news: 2 });
  assert.deepEqual(c.changes.map((x) => `${x.type}@${x.at.slice(11, 16)}`), [
    'news@00:30', 'reading@00:07', 'reading@23:07', 'level_change@22:07', 'reading@22:07', 'reading@21:07', 'news@10:05',
  ]);
  const r = c.changes.find((x) => x.type === 'reading' && x.at.startsWith('2026-10-11T00:07'));
  assert.equal(r.delta, -0.0497);
  assert.equal(r.level_name, 'ROUTINE');
  assert.equal(r.permalink, 'https://siren.watch/api/receipts/2026-10-11T00-07-00Z.json');
  assert.equal(r.cite, 'SIREN (siren.watch), SIREN 4 ROUTINE 54.0/100, 2026-10-11 00:07 UTC, https://siren.watch/api/receipts/2026-10-11T00-07-00Z.json, CC BY 4.0');
  assert.equal(c.changes.find((x) => x.at.startsWith('2026-10-10T23')).permalink, null, 'no receipt, no invented link');
  const lc = c.changes.find((x) => x.type === 'level_change');
  assert.deepEqual([lc.previous_level, lc.level, lc.direction, lc.level_name], [3, 4, 'quieter', 'ROUTINE']);
  const n = c.changes[0];
  assert.equal(n.outlet, 'The Verge');
  assert.equal(n.permalink, 'https://siren.watch/item/model-ships-a1.html');
  assert.equal(n.cite, 'SIREN (siren.watch), "Model ships" (The Verge), first seen 2026-10-11 00:30 UTC, https://siren.watch/item/model-ships-a1.html, CC BY 4.0');
  assert.equal(c.changes.find((x) => x.at.startsWith('2026-10-10T21')).delta, null);
  assert.equal(c._license, 'CC BY 4.0');
  assert.doesNotMatch(JSON.stringify(c), /undefined|NaN/);
});

test('changes.json is quiet by default: the flag and summary follow the previous build', () => {
  let c = changesJson({ history, news, url, previousAt: '2026-10-11T00:35:59.255Z' });
  assert.equal(c.changed_since_previous_build, false);
  assert.deepEqual(c.baseline, { at: '2026-10-11T00:35:59.255Z', from: 'previous_build' });
  assert.equal(c.summary, 'No change since 2026-10-11 00:35 UTC. Now SIREN 4 ROUTINE · 54.0/100.');
  assert.equal(changesTxt(c), 'no change since 2026-10-11T00:35:59.255Z\n');
  c = changesJson({ history, news, url, previousAt: '2026-10-11T00:00:00Z' });
  assert.equal(c.changed_since_previous_build, true);
  assert.equal(c.new_since_baseline, 2);
  assert.equal(c.summary, '1 reading, 1 news item since 2026-10-11 00:00 UTC. Now SIREN 4 ROUTINE · 54.0/100.');
  const lines = changesTxt(c).trimEnd().split('\n');
  assert.equal(lines.length, 2);
  assert.deepEqual(lines[0].split('\t'), ['2026-10-11T00:30:00.000Z', 'news', 'The Verge: Model ships', 'https://siren.watch/item/model-ships-a1.html']);
  assert.match(lines[1], /^2026-10-11T00:07:00\.000Z\treading\tSIREN 4 ROUTINE 54\.0\/100 \(-0\.05\)$/);
  // No previous build on disk: the reading before the latest is the baseline.
  c = changesJson({ history, url });
  assert.deepEqual(c.baseline, { at: '2026-10-10T23:07:00.000Z', from: 'previous_reading' });
  assert.equal(c.changed_since_previous_build, true);
});

test('changes.json leaves out what it has no data for', () => {
  const c = changesJson({ history: [], news: null, url });
  assert.deepEqual(c.sections, {});
  assert.deepEqual(c.changes, []);
  assert.equal(c.generated_at, null);
  assert.equal(c.baseline, null);
  assert.equal(c.changed_since_previous_build, false);
  const onlyNews = changesJson({ news, url });
  assert.deepEqual(Object.keys(onlyNews.sections), ['news']);
  const many = Array.from({ length: 80 }, (_, i) => hist(new Date(Date.UTC(2026, 9, 1, i)).toISOString(), 50 + (i % 3), 4));
  assert.equal(changesJson({ history: many, url }).sections.readings, CHANGES_LIMITS.readings);
});

test('cadence: read from collect.yml, and the fallback is the same text', () => {
  const yml = readFileSync(new URL('../../.github/workflows/collect.yml', import.meta.url), 'utf8');
  assert.deepEqual(parseCadence(yml), CADENCE_FALLBACK);
  assert.equal(parseCadence('no cron here'), null);
  assert.equal(cronIntervalSeconds('*/15 * * * *'), 900);
  assert.equal(cronIntervalSeconds('7 * * * *'), 3600);
  assert.equal(nextCronSlot('*/15 * * * *', '2026-10-11T00:35:59.255Z'), '2026-10-11T00:45:00.000Z');
  assert.equal(nextCronSlot('*/15 * * * *', '2026-10-11T00:45:00.000Z'), '2026-10-11T01:00:00.000Z');
  assert.equal(nextCronSlot('7 * * * *', '2026-10-11T00:33:37.535Z'), '2026-10-11T01:07:00.000Z');
  assert.equal(nextCronSlot('7 * * * *', '2026-10-11T00:03:00Z'), '2026-10-11T00:07:00.000Z');
  assert.equal(nextCronSlot('7 * * * *', 'nope'), null);
});

test('poll fields: the engine forecast for the index, the cron slot otherwise', () => {
  const state = { generated_at: '2026-10-11T00:33:37.535Z', health: { expected_next_run_utc: '2026-10-11T01:19:36.000Z' } };
  let p = pollFields({ lane: 'index', at: state.generated_at, state });
  assert.equal(p.next_update_expected_at, '2026-10-11T01:19:36.000Z');
  assert.equal(p.poll.min_interval_seconds, 3600);
  assert.equal(p.poll.use_since, false);
  assert.match(p.poll.note, /nothing changes between builds/);
  p = pollFields({ lane: 'index', at: state.generated_at, state: { health: { expected_next_run_utc: '2026-10-10T00:00:00Z' } } });
  assert.equal(p.next_update_expected_at, '2026-10-11T01:07:00.000Z', 'a stale engine forecast is not used');
  p = pollFields({ lane: 'news', at: '2026-10-11T00:35:59.255Z', useSince: true });
  assert.deepEqual([p.next_update_expected_at, p.poll.min_interval_seconds, p.poll.use_since], ['2026-10-11T00:45:00.000Z', 900, true]);
});

test('news.json handoff fields round-trip: added for readers, stripped for comparison', () => {
  const out = newsWithHandoff(news, url);
  assert.equal(out.items[0].permalink, 'https://siren.watch/item/model-ships-a1.html');
  assert.match(out.items[1].cite, /^SIREN \(siren\.watch\), "Old thread" \(hn\), first seen 2026-10-10 10:05 UTC, .*CC BY 4\.0$/);
  assert.deepEqual(out.items.map(stripHandoff), news.items);
  assert.equal(newsWithHandoff(news, url, { itemPages: false }).items[0].permalink, 'https://x.test/a');
  assert.equal(newsWithHandoff(null, url), null);
  assert.equal(citeLine(url, 'x', 'bad'), 'SIREN (siren.watch), x, time unknown, CC BY 4.0');
});

test('manifest: sha256 and bytes of the machine files only, with their own generated_at', () => {
  const files = [
    { path: 'api/state.json', bytes: Buffer.from('{"generated_at":"2026-10-11T00:33:37.535Z"}\n') },
    { path: 'llms.txt', bytes: Buffer.from('# SIREN\n') },
    { path: 'index.html', bytes: Buffer.from('<html>') },
    { path: 'api/receipts/2026-10-11T00-07-00Z.json', bytes: Buffer.from('{}') },
    { path: 'api/receipts/index.json', bytes: Buffer.from('{"generated_at":"x"}') },
    { path: 'api/manifest.json', bytes: Buffer.from('{}') },
    { path: '.well-known/mcp.json', bytes: Buffer.from('{}') },
  ];
  const m = manifestJson({ files, generatedAt: '2026-10-11T00:35:59.255Z', url });
  assert.deepEqual(m.files.map((f) => f.path), ['.well-known/mcp.json', 'api/receipts/index.json', 'api/state.json', 'llms.txt']);
  const st = m.files.find((f) => f.path === 'api/state.json');
  assert.equal(st.sha256, createHash('sha256').update(files[0].bytes).digest('hex'));
  assert.equal(st.bytes, files[0].bytes.length);
  assert.equal(st.generated_at, '2026-10-11T00:33:37.535Z');
  assert.equal(m.files.find((f) => f.path === 'llms.txt').generated_at, null);
  assert.equal(m.count, 4);
  assert.equal(m.receipts, 'https://siren.watch/api/receipts/index.json');
  for (const p of ['feed.xml', 'skill.md', 'now.md', 'openapi.json', 'api/changes.txt', 'api/history.csv', '.well-known/agent-card.json']) assert.ok(isMachineFile(p), p);
  for (const p of ['about.html', 'img/a.png', 'item/x.html', 'manifest.webmanifest']) assert.ok(!isMachineFile(p), p);
});

test('mcp.json lists exactly the tools the server serves, with a working config', () => {
  const m = mcpJson(ctx);
  assert.deepEqual(m.tools, listTools());
  assert.equal(m.protocolVersion, '2025-06-18');
  assert.equal(m.transport, 'stdio');
  assert.deepEqual(m.config, { mcpServers: { siren: { command: 'npx', args: ['-y', '--package=github:messagegabrielhere-lgtm/doomcon', 'siren-mcp'] } } });
  assert.deepEqual(mcpConfig({ local: true }).mcpServers.siren, { command: 'node', args: ['mcp/server.mjs'] });
  assert.match(m.description, /not a probability of harm/);
});

test('agent card maps every tool to a skill with its endpoint; plugin points at openapi', () => {
  const a = agentCard(ctx);
  for (const t of listTools()) {
    const s = a.skills.find((x) => x.id === t.name);
    assert.ok(s, t.name);
    assert.match(s.description, /HTTP: GET https:\/\/siren\.watch\//);
  }
  assert.ok(a.skills.some((s) => s.id === 'siren_now_text'));
  assert.equal(a.url, 'https://siren.watch/');
  assert.equal(a.capabilities.streaming, false);
  assert.ok(a.defaultInputModes.length && a.defaultOutputModes.length);
  const p = aiPlugin(ctx);
  assert.equal(p.api.url, 'https://siren.watch/openapi.json');
  assert.deepEqual(p.auth, { type: 'none' });
  assert.ok(p.name_for_model.length <= 50 && /^[a-z_]+$/.test(p.name_for_model));
});

test('agents.html: the "Use SIREN from your agent" section has config, cards, polling, reliability and citing', () => {
  const html = useFromAgent(ctx);
  assert.match(html, /id="use-from-your-agent"/);
  assert.match(html, /&quot;mcpServers&quot;/);
  assert.match(html, /siren-mcp/);
  for (const p of ['/.well-known/mcp.json', '/.well-known/agent-card.json', '/.well-known/ai-plugin.json', '/api/changes.json', '/api/changes.txt', '/api/manifest.json']) {
    assert.ok(html.includes(`https://siren.watch${p}`), p);
  }
  assert.match(html, /Built for reliable agents/);
  assert.match(html, /Poll no faster than this; nothing changes between builds/);
  assert.match(html, /SIREN 4 · 54\.0\/100 at 00:33 UTC — siren\.watch/);
  assert.match(html, /CC BY 4\.0/);
  for (const t of listTools()) assert.ok(html.includes(t.name), t.name);
});
