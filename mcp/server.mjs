#!/usr/bin/env node
// SIREN as an MCP server: plug the AI Siren Index into an agent as tools.
//
//   node mcp/server.mjs
//   npx -y --package=github:messagegabrielhere-lgtm/doomcon siren-mcp
//
// stdio transport, JSON-RPC 2.0, one message per line (MCP 2025-06-18).
// Implements initialize, ping, tools/list and tools/call; every tool is
// read-only and defined in ./tools.mjs. Zero dependencies, Node >= 20.
//
// SIREN_BASE_URL overrides https://siren.watch (a mirror, a local preview
// server, or file:///path/to/public for a local build). Logs go to stderr;
// stdout carries protocol messages and nothing else.

import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';
import {
  SERVER_NAME, SERVER_TITLE, SERVER_VERSION, PROTOCOL_VERSION, SUPPORTED_PROTOCOL_VERSIONS,
  DEFAULT_BASE_URL, listTools, callTool, makeFetcher,
} from './tools.mjs';

const INSTRUCTIONS =
  'SIREN is an hourly index of AI activity tempo: a 0-100 score and a level from 5 (quietest) to 1 (loudest). ' +
  'It counts activity; it is not a probability of harm and not a forecast. Quote the level with its name and UTC time, ' +
  'link the source, and poll siren_changes at most every 15 minutes, passing the last generated_at as "since".';

const err = (id, code, message) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });
const ok = (id, result) => ({ jsonrpc: '2.0', id, result });

/**
 * A transport-free server: hand it one parsed JSON-RPC message, get back the
 * response object, or null for a notification. Tests drive this directly.
 */
export function createServer({ baseUrl = process.env.SIREN_BASE_URL || DEFAULT_BASE_URL, fetchImpl = globalThis.fetch } = {}) {
  const fetcher = makeFetcher({ baseUrl, fetchImpl });
  return {
    fetcher,
    async handle(msg) {
      if (!msg || typeof msg !== 'object' || Array.isArray(msg) || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') {
        return err(msg && msg.id, -32600, 'Invalid Request');
      }
      const isNotification = !('id' in msg);
      const { id, method } = msg;
      const params = msg.params && typeof msg.params === 'object' ? msg.params : {};
      if (isNotification) return null; // notifications/initialized, notifications/cancelled, ...
      switch (method) {
        case 'initialize': {
          const asked = params.protocolVersion;
          return ok(id, {
            protocolVersion: SUPPORTED_PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSION,
            capabilities: { tools: { listChanged: false } },
            serverInfo: { name: SERVER_NAME, title: SERVER_TITLE, version: SERVER_VERSION },
            instructions: INSTRUCTIONS,
          });
        }
        case 'ping':
          return ok(id, {});
        case 'tools/list':
          return ok(id, { tools: listTools() });
        case 'tools/call': {
          if (typeof params.name !== 'string') return err(id, -32602, 'tools/call needs params.name');
          const result = await callTool(params.name, params.arguments || {}, fetcher);
          if (!result) return err(id, -32602, `Unknown tool: ${params.name}`);
          return ok(id, result);
        }
        default:
          return err(id, -32601, `Method not found: ${method}`);
      }
    },
  };
}

/** Wire a server to line-delimited streams. Resolves when input closes. */
export function serveStdio(server, { input = process.stdin, output = process.stdout } = {}) {
  const rl = createInterface({ input, crlfDelay: Infinity });
  const send = (obj) => output.write(`${JSON.stringify(obj)}\n`);
  const pending = new Set();
  rl.on('line', (line) => {
    if (!line.trim()) return;
    let msg;
    try { msg = JSON.parse(line); } catch { send(err(null, -32700, 'Parse error')); return; }
    if (Array.isArray(msg)) { send(err(null, -32600, 'Batches are not supported')); return; }
    const p = server.handle(msg)
      .then((res) => { if (res) send(res); })
      .catch((e) => { if (msg && 'id' in msg) send(err(msg.id, -32603, `Internal error: ${e.message}`)); })
      .finally(() => pending.delete(p));
    pending.add(p);
  });
  return new Promise((resolve) => rl.on('close', () => Promise.allSettled([...pending]).then(resolve)));
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
// npm's bin shim runs this file through a symlink; resolve it before comparing.
async function isMainResolved() {
  if (isMain) return true;
  if (!process.argv[1]) return false;
  try {
    const { realpath } = await import('node:fs/promises');
    return import.meta.url === pathToFileURL(await realpath(process.argv[1])).href;
  } catch { return false; }
}

if (await isMainResolved()) {
  const server = createServer();
  process.stderr.write(`${SERVER_NAME}-mcp ${SERVER_VERSION} on stdio, reading ${server.fetcher.base}\n`);
  await serveStdio(server);
}
