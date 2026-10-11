// node --test mcp/server.test.mjs
// fetch is stubbed throughout: no test here touches the network.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PassThrough } from 'node:stream';
import { createServer, serveStdio } from './server.mjs';
import { TOOLS, listTools, SERVER_VERSION, PROTOCOL_VERSION, SEARCH_TYPES, makeFetcher } from './tools.mjs';
import { TYPES } from '../site/templates/catalogPages.mjs';

const BASE = 'https://example.test';
const FIXTURES = {
  '/api/state.json': {
    generated_at: '2026-10-11T00:33:37.535Z', score: 53.9622, level: 4, level_name: 'ROUTINE', previous_level: null,
    level_since: '2026-09-23T20:04:22.390Z', delta_from_previous: -0.0497, degraded: false, dark_pillars: [],
    pillars: [
      { id: 'capability', name: 'Capability', score: 63.7245, sources_ok: 1, sources_total: 4, dark: false, in_composite: true },
      { id: 'markets', name: 'Markets', score: null, sources_ok: 0, sources_total: 4, dark: false, in_composite: false },
    ],
    receipt_id: '2026-10-11T00-33-37Z',
    _disclaimer: 'Activity tempo, not probability of harm.',
  },
  '/api/news.json': {
    generated_at: '2026-10-11T00:35:59.255Z',
    sources: [{ id: 'verge', label: 'The Verge' }],
    items: [
      { id: 'a', source: 'verge', title: 'Old high', url: 'https://x.test/a', published_at: '2026-10-10T01:00:00Z', pillar: 'capability', score: 90, meta: { first_seen_at: '2026-10-10T01:05:00Z' } },
      { id: 'b', source: 'hn', title: 'New low', url: 'https://x.test/b', published_at: '2026-10-11T00:00:00Z', pillar: 'attention', score: 20, meta: { first_seen_at: '2026-10-11T00:10:00Z' } },
      { id: 'c', source: 'hn', title: 'Middle', url: 'https://x.test/c', published_at: '2026-10-10T12:00:00Z', pillar: 'capability', score: 50, meta: { first_seen_at: '2026-10-10T12:30:00Z' } },
    ],
  },
  '/api/changes.json': {
    generated_at: '2026-10-11T00:35:59.255Z',
    changed_since_previous_build: false,
    summary: 'No change since 2026-10-11 00:20 UTC.',
    baseline: { at: '2026-10-11T00:20:00Z', from: 'previous_build' },
    next_update_expected_at: '2026-10-11T00:45:00.000Z',
    poll: { min_interval_seconds: 900, use_since: true },
    changes: [
      { type: 'news', at: '2026-10-11T00:10:00Z', title: 'New low' },
      { type: 'reading', at: '2026-10-11T00:00:00Z', score: 54, delta: 0.1 },
      { type: 'level_change', at: '2026-10-10T00:00:00Z', level: 4, previous_level: 3 },
    ],
  },
  '/api/history.json': {
    count: 3,
    observations: [
      { generated_at: '2026-10-10T22:00:00Z', score: 55, level: 3, pillars: { capability: 60 } },
      { generated_at: '2026-10-10T23:00:00Z', score: 54, level: 4, pillars: { capability: 61 } },
      { generated_at: '2026-10-11T00:00:00Z', score: 53.9, level: 4, degraded: true, pillars: { capability: null } },
    ],
  },
  '/api/search-index.json': {
    v: 1, at: '2026-10-11T00:35:59.255Z', types: { page: 'Rooms & pages', news: 'News' },
    items: [
      ['page', 'Map: US datacentres vs water', '/map.html', 'Datacentres and drought', 'water power', ''],
      ['news', 'Water use of datacentres doubles', '/item/x.html', '2026-10-10 · story', 'compute', ''],
      ['page', 'Newsroom', '/news.html', 'All stories', 'news', ''],
    ],
  },
  '/skill.md': '# SIREN skill\n',
};
const sha = (body) => createHash('sha256').update(typeof body === 'string' ? body : JSON.stringify(body)).digest('hex');
FIXTURES['/api/manifest.json'] = {
  generated_at: '2026-10-11T00:35:59.255Z',
  receipts: `${BASE}/api/receipts/index.json`,
  files: [
    { path: 'api/state.json', sha256: sha(FIXTURES['/api/state.json']), bytes: Buffer.byteLength(JSON.stringify(FIXTURES['/api/state.json'])), generated_at: '2026-10-11T00:33:37.535Z' },
    { path: 'skill.md', sha256: '0'.repeat(64), bytes: 14, generated_at: null },
  ],
};

function stubFetch(calls = []) {
  return async (url) => {
    calls.push(url);
    const rel = url.slice(BASE.length);
    if (!(rel in FIXTURES)) return { ok: false, status: 404, text: async () => 'nope' };
    const body = FIXTURES[rel];
    const text = typeof body === 'string' ? body : JSON.stringify(body);
    return { ok: true, status: 200, text: async () => text, arrayBuffer: async () => new TextEncoder().encode(text).buffer };
  };
}

const server = (calls) => createServer({ baseUrl: `${BASE}/`, fetchImpl: stubFetch(calls) });
const call = async (s, name, args = {}) => (await s.handle({ jsonrpc: '2.0', id: 9, method: 'tools/call', params: { name, arguments: args } })).result;

test('initialize negotiates the protocol version and advertises tools only', async () => {
  const s = server();
  const r = await s.handle({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: 't', version: '0' } } });
  assert.equal(r.id, 1);
  assert.equal(r.result.protocolVersion, '2025-06-18');
  assert.deepEqual(r.result.capabilities, { tools: { listChanged: false } });
  assert.equal(r.result.serverInfo.name, 'siren');
  assert.match(r.result.instructions, /not a probability of harm/);
  const old = await s.handle({ jsonrpc: '2.0', id: 2, method: 'initialize', params: { protocolVersion: '2024-11-05' } });
  assert.equal(old.result.protocolVersion, '2024-11-05');
  const unknown = await s.handle({ jsonrpc: '2.0', id: 3, method: 'initialize', params: { protocolVersion: '1999-01-01' } });
  assert.equal(unknown.result.protocolVersion, PROTOCOL_VERSION);
});

test('ping, notifications, unknown methods and bad requests', async () => {
  const s = server();
  assert.deepEqual(await s.handle({ jsonrpc: '2.0', id: 'p', method: 'ping' }), { jsonrpc: '2.0', id: 'p', result: {} });
  assert.equal(await s.handle({ jsonrpc: '2.0', method: 'notifications/initialized' }), null);
  assert.equal((await s.handle({ jsonrpc: '2.0', id: 4, method: 'resources/list' })).error.code, -32601);
  assert.equal((await s.handle({ id: 5, method: 'ping' })).error.code, -32600);
  assert.equal((await s.handle({ jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'nope' } })).error.code, -32602);
});

test('tools/list: seven read-only tools whose descriptions carry the disclaimer', async () => {
  const r = (await server().handle({ jsonrpc: '2.0', id: 1, method: 'tools/list' })).result;
  assert.deepEqual(r.tools.map((t) => t.name), ['siren_status', 'siren_news', 'siren_changes', 'siren_history', 'siren_search', 'siren_verify', 'siren_guide']);
  for (const t of r.tools) {
    assert.equal(t.inputSchema.type, 'object');
    assert.equal(t.annotations.readOnlyHint, true);
    assert.equal(t.endpoint, undefined, 'internal fields stay internal');
  }
  for (const name of ['siren_status', 'siren_news', 'siren_changes', 'siren_history', 'siren_guide']) {
    assert.match(r.tools.find((t) => t.name === name).description, /not a probability of harm/);
  }
  assert.deepEqual(listTools().map((t) => t.name), TOOLS.map((t) => t.name));
});

test('siren_status reshapes state.json and builds the citation', async () => {
  const calls = [];
  const r = await call(server(calls), 'siren_status');
  assert.equal(r.isError, false);
  const o = r.structuredContent;
  assert.equal(calls[0], `${BASE}/api/state.json`);
  assert.equal(o.level, 4);
  assert.equal(o.level_name, 'ROUTINE');
  assert.equal(o.score, 54.0);
  assert.equal(o.score_raw, 53.9622);
  assert.equal(o.citation, 'SIREN 4 · 54.0/100 at 00:33 UTC — example.test');
  assert.equal(o.receipt_url, `${BASE}/api/receipts/2026-10-11T00-33-37Z.json`);
  assert.equal(o.pillars[1].score, null);
  assert.deepEqual(JSON.parse(r.content[0].text), o);
});

test('siren_news: newest first by default, since, pillar, score sort, limit', async () => {
  const s = server();
  let o = (await call(s, 'siren_news')).structuredContent;
  assert.deepEqual(o.items.map((i) => i.id), ['b', 'c', 'a']);
  assert.equal(o.items[2].outlet, 'The Verge');
  o = (await call(s, 'siren_news', { since: '2026-10-10T12:00:00Z' })).structuredContent;
  assert.deepEqual(o.items.map((i) => i.id), ['b', 'c']);
  o = (await call(s, 'siren_news', { pillar: 'capability', sort: 'score', limit: 1 })).structuredContent;
  assert.deepEqual(o.items.map((i) => i.id), ['a']);
  assert.equal(o.matched, 2);
  const bad = await call(s, 'siren_news', { since: 'yesterday' });
  assert.equal(bad.isError, true);
  assert.match(bad.content[0].text, /ISO 8601/);
});

test('siren_changes filters by since and type', async () => {
  const s = server();
  let o = (await call(s, 'siren_changes', { since: '2026-10-10T12:00:00Z' })).structuredContent;
  assert.deepEqual(o.changes.map((c) => c.type), ['news', 'reading']);
  assert.equal(o.generated_at, '2026-10-11T00:35:59.255Z');
  o = (await call(s, 'siren_changes', { types: ['level_change'] })).structuredContent;
  assert.equal(o.changes.length, 1);
  assert.equal(o.changes[0].previous_level, 3);
});

test('siren_changes carries the quiet flag: the file\'s own, or the caller\'s since', async () => {
  const s = server();
  let o = (await call(s, 'siren_changes')).structuredContent;
  assert.equal(o.changed, false);
  assert.equal(o.summary, 'No change since 2026-10-11 00:20 UTC.');
  assert.equal(o.poll.min_interval_seconds, 900);
  assert.equal(o.next_update_expected_at, '2026-10-11T00:45:00.000Z');
  o = (await call(s, 'siren_changes', { since: '2026-10-11T00:05:00Z' })).structuredContent;
  assert.equal(o.changed, true);
  assert.equal(o.summary, '1 change since 2026-10-11T00:05:00Z.');
  o = (await call(s, 'siren_changes', { since: '2026-10-11T00:30:00Z' })).structuredContent;
  assert.equal(o.changed, false);
  assert.match(o.summary, /^No change since/);
});

test('siren_verify hashes the fetched bytes, or checks a supplied hash, against the manifest', async () => {
  const s = server();
  let o = (await call(s, 'siren_verify', { path: '/api/state.json' })).structuredContent;
  assert.equal(o.ok, true);
  assert.equal(o.actual_sha256, o.expected_sha256);
  assert.equal(o.checked, 'the bytes fetched just now');
  o = (await call(s, 'siren_verify', { path: `${BASE}/api/state.json`, sha256: 'A'.repeat(64) })).structuredContent;
  assert.equal(o.ok, false);
  assert.match(o.note, /different builds/);
  o = (await call(s, 'siren_verify', { path: 'skill.md' })).structuredContent;
  assert.equal(o.ok, false, 'a tampered (here: wrong-hash) file fails');
  o = (await call(s, 'siren_verify', { path: 'index.html' })).structuredContent;
  assert.equal(o.listed, false);
  assert.equal((await call(s, 'siren_verify', { path: 'api/state.json', sha256: 'xyz' })).isError, true);
});

test('siren_history is newest first and honours limit and since', async () => {
  const o = (await call(server(), 'siren_history', { limit: 2 })).structuredContent;
  assert.deepEqual(o.observations.map((r) => r.score), [53.9, 54]);
  assert.equal(o.observations[0].degraded, true);
  assert.equal(o.count_total, 3);
  const s = (await call(server(), 'siren_history', { since: '2026-10-10T22:30:00Z' })).structuredContent;
  assert.equal(s.matched, 2);
});

test('siren_search needs every word, ranks title hits first, makes URLs absolute', async () => {
  const s = server();
  const o = (await call(s, 'siren_search', { query: 'water datacentres' })).structuredContent;
  assert.equal(o.matched, 2);
  assert.equal(o.results[0].url, `${BASE}/item/x.html`);
  assert.equal(o.results[0].kind, 'News');
  const typed = (await call(s, 'siren_search', { query: 'water', type: 'page' })).structuredContent;
  assert.deepEqual(typed.results.map((r) => r.url), [`${BASE}/map.html`]);
  assert.equal((await call(s, 'siren_search', { query: '  ' })).isError, true);
});

test('siren_guide returns the rules and skill.md, and survives skill.md missing', async () => {
  const o = (await call(server(), 'siren_guide')).structuredContent;
  assert.equal(o.skill_md, '# SIREN skill\n');
  assert.ok(o.rules.some((r) => /5 \(quietest\) to 1 \(loudest\)/.test(r)));
  assert.equal(o.endpoints.siren_changes, `${BASE}/api/changes.json`);
  const s = createServer({ baseUrl: BASE, fetchImpl: async () => ({ ok: false, status: 500, text: async () => '' }) });
  assert.equal((await call(s, 'siren_guide')).structuredContent.skill_md, null);
});

test('a network failure is a tool error the model can read, not a crash', async () => {
  const s = createServer({ baseUrl: BASE, fetchImpl: async () => { throw new Error('ECONNREFUSED'); } });
  const r = await call(s, 'siren_status');
  assert.equal(r.isError, true);
  assert.match(r.content[0].text, /could not fetch https:\/\/example\.test\/api\/state\.json: ECONNREFUSED/);
  const h = await call(server(), 'siren_status');
  assert.equal(h.isError, false);
  const notFound = createServer({ baseUrl: BASE, fetchImpl: stubFetch() });
  notFound.fetcher.json('/api/missing.json').catch((e) => assert.match(e.message, /HTTP 404/));
});

test('file: base URLs read a local build', async () => {
  const f = makeFetcher({ baseUrl: new URL('.', import.meta.url).href });
  assert.match(await f.text('/tools.mjs'), /export const TOOLS/);
});

test('stdio transport: one JSON message per line in, one per line out', async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  let out = '';
  output.on('data', (d) => { out += d; });
  const done = serveStdio(server(), { input, output });
  input.write(`${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } })}\n`);
  input.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
  input.write('{not json\n');
  input.write(`${JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'siren_status', arguments: {} } })}\n`);
  input.end();
  await done;
  const msgs = out.trim().split('\n').map((l) => JSON.parse(l));
  assert.equal(msgs.length, 3);
  assert.equal(msgs.find((m) => m.id === 1).result.serverInfo.name, 'siren');
  assert.equal(msgs.find((m) => m.error).error.code, -32700);
  assert.equal(msgs.find((m) => m.id === 2).result.structuredContent.level, 4);
});

test('the server version matches package.json, and search types match the site index', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(SERVER_VERSION, pkg.version);
  assert.equal(pkg.bin['siren-mcp'], 'mcp/server.mjs');
  assert.deepEqual(SEARCH_TYPES, TYPES.map(([k]) => k));
  assert.match(readFileSync(new URL('./server.mjs', import.meta.url), 'utf8'), /^#!\/usr\/bin\/env node\n/);
});
