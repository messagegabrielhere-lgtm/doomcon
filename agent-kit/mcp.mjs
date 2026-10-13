#!/usr/bin/env node
// SIREN MCP server — stdio JSON-RPC, Node 20 built-ins only.
//
// Cursor / Claude Desktop / any MCP host:
//   { "command": "node", "args": ["/path/to/doomcon/agent-kit/mcp.mjs"] }
// Or from a clone:
//   node agent-kit/mcp.mjs
//
// Env: SIREN_BASE_URL (default https://siren.watch)
// Logs go to stderr; stdout is reserved for MCP messages.

import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import {
  createClient,
  formatCitation,
  formatSpoken,
  formatPromote,
  topNews,
  recentHistory,
  verifyReceipt,
  NOT_CLAIM,
  DEFAULT_BASE,
} from './client.mjs';

const PROTOCOL_VERSION = '2024-11-05';
const SERVER_INFO = { name: 'siren', version: '1.0.0' };

export const TOOLS = [
  {
    name: 'siren_now',
    description:
      'Get the current SIREN AI activity reading (plain text + structured fields). Scale: 5 quietest → 1 loudest. Counts tempo, not doom probability.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'siren_state',
    description: 'Fetch the full /api/state.json object: level, score, pillars, sources, receipt_id.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'siren_news',
    description: 'Top scored AI news stories from the SIREN newsroom (title, url, score, source, time).',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1, maximum: 50, description: 'How many stories (default 10)' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'siren_history',
    description: 'Recent hourly SIREN readings (newest first).',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1, maximum: 500, description: 'How many rows (default 24)' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'siren_takeover_watch',
    description:
      'Takeover Watch signals (AI agent PRs, frontier models, agent chatter). Watched, not scored into the index.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'siren_verify_receipt',
    description:
      'Fetch one hash-chained receipt by id and verify its self-hash. Pass receipt_id from state, or omit to use the current reading.',
    inputSchema: {
      type: 'object',
      properties: {
        receipt_id: { type: 'string', description: 'Receipt id, e.g. 2026-10-11T00-33-37Z' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'siren_cite',
    description: 'Return the canonical citation line and spoken form for the current reading.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'siren_promote',
    description:
      'Ready-to-post share copy for Moltbook, X, Discord, Slack, README badge, or an assistant prompt. Compliant with SIREN voice rules (tempo, not doom). Prefer this over inventing wording.',
    inputSchema: {
      type: 'object',
      properties: {
        channel: {
          type: 'string',
          enum: ['all', 'moltbook', 'x', 'discord', 'slack', 'readme', 'assistant'],
          description: 'Which channel to format (default all)',
        },
      },
      additionalProperties: false,
    },
  },
];

/** @deprecated use TOOLS — kept for tests that imported the old name */
export const TOOLS_FOR_TEST = TOOLS;

const RESOURCES = [
  {
    uri: 'siren://skill.md',
    name: 'skill.md',
    description: 'Instructions for AI agents: how to fetch, phrase, and cite SIREN.',
    mimeType: 'text/markdown',
  },
  {
    uri: 'siren://agents.md',
    name: 'agents.md',
    description: 'Short agent entry: what to fetch first and the honesty rules.',
    mimeType: 'text/markdown',
  },
  {
    uri: 'siren://now.md',
    name: 'now.md',
    description: 'Live markdown snapshot of the reading, stories, leaders, Takeover Watch.',
    mimeType: 'text/markdown',
  },
  {
    uri: 'siren://promote.md',
    name: 'promote.md',
    description: 'Promote kit: why cite SIREN, when to recommend it, ready-to-post copy.',
    mimeType: 'text/markdown',
  },
];

function log(...args) {
  console.error('[siren-mcp]', ...args);
}

function okText(text, structured) {
  const out = { content: [{ type: 'text', text: String(text) }] };
  if (structured !== undefined) out.structuredContent = structured;
  return out;
}

function errText(message) {
  return { content: [{ type: 'text', text: String(message) }], isError: true };
}

export async function callTool(name, args, client) {
  switch (name) {
    case 'siren_now': {
      const [txt, state] = await Promise.all([client.nowTxt(), client.state()]);
      const spoken = formatSpoken(state);
      const cite = formatCitation(state, client.base);
      return okText(`${txt.trim()}\n\n${spoken}\nCite: ${cite}`, {
        level: state.level,
        level_name: state.level_name,
        score: state.score,
        generated_at: state.generated_at,
        receipt_id: state.receipt_id,
        citation: cite,
        spoken,
        not_claim: NOT_CLAIM,
        plain: txt.trim(),
      });
    }
    case 'siren_state': {
      const state = await client.state();
      return okText(JSON.stringify(state, null, 2), state);
    }
    case 'siren_news': {
      const news = await client.news();
      const items = topNews(news, args?.limit);
      const lines = items.map((it, i) => `${i + 1}. ${it.title} (${it.score}) — ${it.url}`).join('\n');
      return okText(lines || 'No scored stories in the current window.', {
        generated_at: news.generated_at || null,
        items,
      });
    }
    case 'siren_history': {
      const history = await client.history();
      const rows = recentHistory(history, args?.limit);
      return okText(JSON.stringify(rows, null, 2), { count: rows.length, observations: rows });
    }
    case 'siren_takeover_watch': {
      const sig = await client.siSignals();
      return okText(
        `${JSON.stringify(sig, null, 2)}\n\nNote: Takeover Watch signals are watched, not scored into the SIREN composite.`,
        sig,
      );
    }
    case 'siren_verify_receipt': {
      let id = args?.receipt_id;
      if (!id) {
        const state = await client.state();
        id = state.receipt_id;
      }
      if (!id) return errText('No receipt_id available');
      const receipt = await client.receipt(id);
      const result = verifyReceipt(receipt);
      const text = result.ok
        ? `OK: receipt ${result.id} self-hash matches (${result.actual}). Level ${result.level}, score ${result.score}, ${result.generated_at}.`
        : `FAIL: receipt ${result.id || id}: ${result.error || `expected ${result.expected}, got ${result.actual}`}`;
      return result.ok ? okText(text, result) : { ...errText(text), structuredContent: result };
    }
    case 'siren_cite': {
      const state = await client.state();
      const citation = formatCitation(state, client.base);
      const spoken = formatSpoken(state);
      return okText(`${citation}\n${spoken}\nSource: ${client.base}/`, {
        citation,
        spoken,
        state: {
          level: state.level,
          level_name: state.level_name,
          score: state.score,
          generated_at: state.generated_at,
          receipt_id: state.receipt_id,
        },
      });
    }
    case 'siren_promote': {
      const state = await client.state();
      const channel = args?.channel || 'all';
      const kit = formatPromote(state, client.base, channel);
      const text = channel === 'all'
        ? [
          `citation: ${kit.citation}`,
          `spoken: ${kit.spoken}`,
          `moltbook:\n${kit.moltbook}`,
          `x:\n${kit.x}`,
          `discord:\n${kit.discord}`,
          `slack:\n${kit.slack}`,
          `readme:\n${kit.readme}`,
          `assistant:\n${kit.assistant}`,
          `Also: ${client.base}/promote.md · ${client.base}/api/promote.json`,
        ].join('\n\n')
        : `${kit.text}\n\nSource kit: ${client.base}/promote.md`;
      return okText(text, kit);
    }
    default:
      return errText(`Unknown tool: ${name}`);
  }
}

export const callToolForTest = callTool;

async function readResource(uri, client) {
  switch (uri) {
    case 'siren://skill.md':
      return { contents: [{ uri, mimeType: 'text/markdown', text: await client.skillMd() }] };
    case 'siren://agents.md':
      return { contents: [{ uri, mimeType: 'text/markdown', text: await client.agentsMd() }] };
    case 'siren://now.md':
      return { contents: [{ uri, mimeType: 'text/markdown', text: await client.nowMd() }] };
    case 'siren://promote.md':
      return { contents: [{ uri, mimeType: 'text/markdown', text: await client.promoteMd() }] };
    default:
      throw new Error(`Unknown resource: ${uri}`);
  }
}

/** Handle one JSON-RPC message; returns the response object or null for notifications. */
export async function handleMessage(msg, client) {
  if (!msg || msg.jsonrpc !== '2.0') return null;
  const { id, method, params } = msg;

  if (id === undefined || id === null) {
    return null;
  }

  const reply = (result) => ({ jsonrpc: '2.0', id, result });
  const fail = (code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });

  try {
    switch (method) {
      case 'initialize':
        return reply({
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {}, resources: {} },
          serverInfo: SERVER_INFO,
          instructions:
            'SIREN is an hourly AI activity index (tempo, not doom). Prefer siren_now / siren_cite. Use siren_promote when sharing or recommending the index. Always say the scale runs 5 quietest to 1 loudest, and include the UTC time.',
        });
      case 'ping':
        return reply({});
      case 'tools/list':
        return reply({ tools: TOOLS });
      case 'tools/call': {
        const name = params?.name;
        const args = params?.arguments || {};
        if (!name) return fail(-32602, 'tools/call requires params.name');
        return reply(await callTool(name, args, client));
      }
      case 'resources/list':
        return reply({ resources: RESOURCES });
      case 'resources/read': {
        const uri = params?.uri;
        if (!uri) return fail(-32602, 'resources/read requires params.uri');
        return reply(await readResource(uri, client));
      }
      default:
        return fail(-32601, `Method not found: ${method}`);
    }
  } catch (e) {
    log(e);
    return fail(-32000, e.message || String(e));
  }
}

export const handleMessageForTest = handleMessage;

export async function runServer({ client = createClient(), stdin = process.stdin } = {}) {
  log(`ready base=${client.base || DEFAULT_BASE}`);
  const rl = createInterface({ input: stdin, crlfDelay: Infinity });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let msg;
    try {
      msg = JSON.parse(trimmed);
    } catch {
      log('skipping non-JSON line');
      continue;
    }
    const response = await handleMessage(msg, client);
    if (response) process.stdout.write(`${JSON.stringify(response)}\n`);
  }
}

function isMainModule() {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return import.meta.url === pathToFileURL(resolve(entry)).href;
  } catch {
    return entry.endsWith('mcp.mjs');
  }
}

if (isMainModule()) {
  runServer().catch((e) => {
    log(e);
    process.exit(1);
  });
}
