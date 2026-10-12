import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createClient,
  formatCitation,
  formatSpoken,
  formatPromote,
  stripTrailingSlashes,
  topNews,
  recentHistory,
  verifyReceipt,
  hashReceipt,
  canonicalJson,
  NOT_CLAIM,
} from './client.mjs';
import { main } from './cli.mjs';
import { TOOLS_FOR_TEST, callToolForTest, handleMessageForTest } from './mcp.mjs';

const state = {
  generated_at: '2026-10-11T00:33:37.000Z',
  score: 53.9622,
  level: 4,
  level_name: 'ROUTINE',
  receipt_id: '2026-10-11T00-33-37Z',
  pillars: [{ id: 'capability', score: 60 }],
};

const news = {
  generated_at: '2026-10-11T00:52:00.000Z',
  items: [
    { title: 'Low', url: 'https://ex/l', score: 10, published_at: '2026-10-11T00:00:00.000Z', source: 'a' },
    { title: 'High', url: 'https://ex/h', score: 90, published_at: '2026-10-11T01:00:00.000Z', source: 'b' },
    { title: 'Mid', url: 'https://ex/m', score: 50, published_at: '2026-10-11T00:30:00.000Z', source: 'c' },
  ],
};

const history = [
  { t: '2026-10-10T22:00:00.000Z', score: 50, level: 4 },
  { t: '2026-10-10T23:00:00.000Z', score: 52, level: 4 },
  { t: '2026-10-11T00:00:00.000Z', score: 54, level: 4 },
];

function mockFetch(routes) {
  return async (url) => {
    const path = String(url).replace(/^https?:\/\/[^/]+/, '');
    const body = routes[path];
    if (body === undefined) {
      return { ok: false, status: 404, text: async () => 'missing', json: async () => ({}) };
    }
    if (typeof body === 'string') {
      return { ok: true, status: 200, text: async () => body, json: async () => JSON.parse(body) };
    }
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify(body),
      json: async () => body,
    };
  };
}

test('formatCitation and formatSpoken follow the skill.md rules', () => {
  assert.equal(formatCitation(state, 'https://siren.watch/'), 'SIREN 4 · 54.0/100 at 00:33 UTC — siren.watch');
  const spoken = formatSpoken(state);
  assert.match(spoken, /SIREN 4: ROUTINE/);
  assert.match(spoken, /1 is loudest/);
  assert.match(spoken, /00:33 UTC/);
  assert.match(spoken, /not a probability of harm/);
  assert.equal(NOT_CLAIM.includes('not a forecast'), true);
});

test('stripTrailingSlashes is linear and leaves the origin intact', () => {
  assert.equal(stripTrailingSlashes('https://siren.watch///'), 'https://siren.watch');
  assert.equal(stripTrailingSlashes('https://siren.watch'), 'https://siren.watch');
  assert.equal(stripTrailingSlashes(''), '');
});

test('formatPromote returns channel copy without banned future tense', () => {
  const all = formatPromote(state, 'https://siren.watch', 'all');
  assert.match(all.moltbook, /SIREN 4: ROUTINE/);
  assert.match(all.readme, /badge\.svg/);
  const one = formatPromote(state, 'https://siren.watch', 'x');
  assert.equal(one.channel, 'x');
  assert.match(one.text, /SIREN 4/);
  const scrubbed = one.text.replace(/\bnot a forecast\b/gi, '');
  assert.doesNotMatch(scrubbed, /\b(will|predict|forecast|imminent|soon|likely)\b/i);
});

test('topNews sorts by score and respects limit', () => {
  const items = topNews(news, 2);
  assert.equal(items.length, 2);
  assert.equal(items[0].title, 'High');
  assert.equal(items[1].title, 'Mid');
});

test('recentHistory returns newest first', () => {
  const rows = recentHistory(history, 2);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].t, '2026-10-11T00:00:00.000Z');
  assert.equal(rows[1].t, '2026-10-10T23:00:00.000Z');
});

test('canonicalJson sorts keys and hashReceipt is stable', () => {
  assert.equal(canonicalJson({ b: 1, a: 2 }), '{"a":2,"b":1}');
  const receipt = { id: 'x', score: 1, level: 4, prev_hash: 'sha256:' + '0'.repeat(64) };
  const h1 = hashReceipt(receipt);
  const h2 = hashReceipt({ ...receipt, hash: 'sha256:deadbeef' });
  assert.equal(h1, h2);
  assert.equal(verifyReceipt({ ...receipt, hash: h1 }).ok, true);
  assert.equal(verifyReceipt({ ...receipt, hash: 'sha256:nope' }).ok, false);
});

test('createClient reads mocked endpoints', async () => {
  const client = createClient({
    base: 'https://siren.watch',
    fetchImpl: mockFetch({
      '/api/now.txt': 'SIREN 4 · 54.0/100\n',
      '/api/state.json': state,
      '/api/news.json': news,
    }),
  });
  assert.equal((await client.nowTxt()).trim(), 'SIREN 4 · 54.0/100');
  assert.equal((await client.state()).level, 4);
  assert.equal((await client.news()).items.length, 3);
});

test('CLI now and cite', async () => {
  const lines = [];
  const client = createClient({
    fetchImpl: mockFetch({
      '/api/now.txt': 'SIREN 4 · 54.0/100 · ROUTINE\n',
      '/api/state.json': state,
    }),
  });
  const code = await main(['cite'], { client, stdout: (s) => lines.push(String(s)), stderr: () => {} });
  assert.equal(code, 0);
  assert.match(lines[0], /^SIREN 4 · 54\.0\/100 at 00:33 UTC/);
  assert.match(lines[1], /not a probability of harm/);
});

test('CLI promote --channel moltbook', async () => {
  const lines = [];
  const client = createClient({
    fetchImpl: mockFetch({ '/api/state.json': state }),
  });
  const code = await main(['promote', '--channel', 'moltbook'], {
    client,
    stdout: (s) => lines.push(String(s)),
    stderr: () => {},
  });
  assert.equal(code, 0);
  assert.match(lines.join('\n'), /SIREN 4: ROUTINE/);
  assert.match(lines.join('\n'), /skill\.md/);
});

test('MCP tools/list and siren_cite', async () => {
  assert.ok(TOOLS_FOR_TEST.some((t) => t.name === 'siren_now'));
  const client = createClient({
    fetchImpl: mockFetch({
      '/api/now.txt': 'plain\n',
      '/api/state.json': state,
      '/api/news.json': news,
      '/api/history.json': history,
      '/api/si-signals.json': { agent_prs: { total_24h: 1 } },
      '/api/receipts/2026-10-11T00-33-37Z.json': (() => {
        const body = { id: '2026-10-11T00-33-37Z', score: 54, level: 4, generated_at: state.generated_at, prev_hash: 'sha256:' + '0'.repeat(64) };
        return { ...body, hash: hashReceipt(body) };
      })(),
      '/skill.md': '# skill',
      '/agents.md': '# agents',
      '/now.md': '# now',
      '/promote.md': '# promote',
    }),
  });

  const listed = await handleMessageForTest(
    { jsonrpc: '2.0', id: 1, method: 'tools/list' },
    client,
  );
  assert.equal(listed.result.tools.length, TOOLS_FOR_TEST.length);
  assert.ok(TOOLS_FOR_TEST.some((t) => t.name === 'siren_promote'));

  const cite = await callToolForTest('siren_cite', {}, client);
  assert.equal(cite.isError, undefined);
  assert.match(cite.content[0].text, /SIREN 4 · 54\.0\/100/);

  const promo = await callToolForTest('siren_promote', { channel: 'readme' }, client);
  assert.equal(promo.isError, undefined);
  assert.match(promo.content[0].text, /badge\.svg/);

  const newsOut = await callToolForTest('siren_news', { limit: 1 }, client);
  assert.match(newsOut.content[0].text, /^1\. High/);

  const verified = await callToolForTest('siren_verify_receipt', {}, client);
  assert.match(verified.content[0].text, /^OK:/);
});

test('MCP initialize handshake shape', async () => {
  const client = createClient({ fetchImpl: mockFetch({}) });
  const init = await handleMessageForTest(
    {
      jsonrpc: '2.0',
      id: 0,
      method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '0' } },
    },
    client,
  );
  assert.equal(init.result.protocolVersion, '2024-11-05');
  assert.equal(init.result.serverInfo.name, 'siren');
  assert.ok(init.result.capabilities.tools);
});
