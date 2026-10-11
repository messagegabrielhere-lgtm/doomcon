// The SIREN MCP tools: one list, read by two places.
//
//   mcp/server.mjs            serves them over stdio JSON-RPC (tools/list, tools/call)
//   site/build.mjs            prints them into /.well-known/mcp.json and the
//                             skills of /.well-known/agent-card.json
//
// Keeping the definitions here, and only here, is what stops the discovery
// cards drifting from the server an agent actually runs.
//
// Every tool is READ-ONLY. It fetches the public static JSON the site already
// publishes (https://siren.watch/api/*.json, or SIREN_BASE_URL) and reshapes
// it. Nothing here computes a number the site did not publish: the handlers
// filter, sort and trim, and that is all.
//
// Zero dependencies, Node >= 20 (global fetch). No import from site/ so the
// server stays loadable on its own.

import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const SERVER_NAME = 'siren';
export const SERVER_TITLE = 'SIREN: the AI Siren Index';
// Kept equal to package.json "version" by mcp/server.test.mjs.
export const SERVER_VERSION = '1.0.0';
export const PROTOCOL_VERSION = '2025-06-18';
export const SUPPORTED_PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
export const DEFAULT_BASE_URL = 'https://siren.watch';
export const REPO = 'messagegabrielhere-lgtm/doomcon';
export const BIN = 'siren-mcp';

/** How to start the server, for the README, /agents.html and /.well-known/mcp.json. */
export const INSTALL = {
  npx: { command: 'npx', args: ['-y', `--package=github:${REPO}`, BIN] },
  node: { command: 'node', args: ['mcp/server.mjs'], note: `from a clone of https://github.com/${REPO}` },
};

// The one sentence every description carries. The site's own disclaimer.
const NOT_HARM = 'SIREN counts AI activity (tempo); it is not a probability of harm and not a forecast.';
const SCALE = 'Levels run from 5 (quietest, DORMANT) to 1 (loudest, UNPRECEDENTED); the score is 0-100.';

// The kinds api/search-index.json carries (site/templates/catalogPages.mjs TYPES).
export const SEARCH_TYPES = ['page', 'tool', 'game', 'video', 'leader', 'news', 'data', 'feed', 'embed', 'faq', 'kit'];

export const PILLAR_IDS = ['capability', 'compute', 'attention', 'governance', 'markets'];

const iso = { type: 'string', description: 'ISO 8601 UTC timestamp, e.g. 2026-10-11T00:00:00Z. Only entries strictly newer are returned.' };

export const TOOLS = [
  {
    name: 'siren_status',
    title: 'Current SIREN reading',
    description:
      `The current SIREN reading from /api/state.json: level (1-5), level_name, score (0-100), generated_at (UTC), ` +
      `delta_from_previous, level_since, degraded flag, the five pillar scores with how many of their sources answered, ` +
      `the receipt id and a ready-made citation line. Recomputed hourly. ${SCALE} ${NOT_HARM}`,
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    endpoint: '/api/state.json',
  },
  {
    name: 'siren_news',
    title: 'SIREN newsroom',
    description:
      `Scored AI news items from the SIREN newsroom (/api/news.json, about 400 stories over a rolling window, refreshed every few minutes). ` +
      `Each item has title, url, outlet, published_at, first_seen_at (when SIREN first saw it), pillar and the newsroom's own 0-100 story score ` +
      `(a ranking, not a rating of truth or importance). Default: newest first-seen first. ${NOT_HARM}`,
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 10, description: 'How many items to return (1-100).' },
        since: { ...iso, description: 'ISO 8601 UTC timestamp. Only items SIREN first saw after this time are returned.' },
        pillar: { type: 'string', enum: PILLAR_IDS, description: 'Only items assigned to this pillar.' },
        sort: { type: 'string', enum: ['newest', 'score'], default: 'newest', description: '"newest" by first-seen time, or "score" by story score.' },
      },
      additionalProperties: false,
    },
    endpoint: '/api/news.json',
  },
  {
    name: 'siren_changes',
    title: 'What changed on SIREN',
    description:
      `What changed since a timestamp, from /api/changes.json, newest first: hourly readings with their score delta, level changes, ` +
      `and news items with the time SIREN first saw them; each entry has a permalink and a ready-made cite string. ` +
      `Returns "changed" (false means nothing new: stay quiet), a one-line "summary", next_update_expected_at and the poll contract. ` +
      `Poll pattern: call with no "since", keep the returned generated_at, pass it as "since" next time, never faster than poll.min_interval_seconds. ${NOT_HARM}`,
    inputSchema: {
      type: 'object',
      properties: {
        since: iso,
        types: {
          type: 'array',
          items: { type: 'string', enum: ['reading', 'level_change', 'news'] },
          description: 'Only these change types. Default: all.',
        },
        limit: { type: 'integer', minimum: 1, maximum: 200, default: 50, description: 'How many changes to return (1-200).' },
      },
      additionalProperties: false,
    },
    endpoint: '/api/changes.json',
  },
  {
    name: 'siren_history',
    title: 'SIREN reading history',
    description:
      `Past hourly SIREN readings from /api/history.json, newest first: generated_at, score, level, degraded, and per-pillar scores ` +
      `(null means that pillar was dark). Use it to say whether today is unusual by giving the level band, not a percentage risk. ${SCALE} ${NOT_HARM}`,
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1, maximum: 500, default: 24, description: 'How many readings to return (1-500).' },
        since: iso,
      },
      additionalProperties: false,
    },
    endpoint: '/api/history.json',
  },
  {
    name: 'siren_search',
    title: 'Search SIREN',
    description:
      'Search the whole SIREN site (pages, instruments, news items, AI leaders, FAQ, tools) using its published index /api/search-index.json. ' +
      'Every word of the query must appear in the title, description or keywords; title matches rank first. Returns titles, absolute URLs and short descriptions.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', minLength: 1, description: 'Words to look for, e.g. "datacentre water" or "Anthropic".' },
        type: { type: 'string', enum: SEARCH_TYPES, description: 'Only results of this kind.' },
        limit: { type: 'integer', minimum: 1, maximum: 50, default: 10, description: 'How many results to return (1-50).' },
      },
      required: ['query'],
      additionalProperties: false,
    },
    endpoint: '/api/search-index.json',
  },
  {
    name: 'siren_verify',
    title: 'Verify a SIREN file',
    description:
      'Check that a SIREN file is complete and unaltered against the build\'s integrity manifest /api/manifest.json (sha256 and byte count of every ' +
      'machine-readable file). Pass "sha256" to check a hash you computed yourself, or omit it and the tool fetches the file and hashes its exact bytes. ' +
      'A mismatch usually means the file and the manifest come from different builds: fetch both again. Index readings are also hash-chained in /api/receipts/.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', minLength: 1, description: 'Site path as listed in the manifest, e.g. "api/state.json" or "llms.txt" (a leading slash or the full URL also works).' },
        sha256: { type: 'string', pattern: '^[0-9a-fA-F]{64}$', description: 'Optional: the sha256 (hex) of the bytes you fetched.' },
      },
      required: ['path'],
      additionalProperties: false,
    },
    endpoint: '/api/manifest.json',
  },
  {
    name: 'siren_guide',
    title: 'How to read and cite SIREN',
    description:
      `What SIREN is, how to describe a level honestly, how to cite it, and which endpoints exist. Returns the site's /skill.md ` +
      `plus the honesty rules. Call this once before quoting SIREN to a person. ${NOT_HARM}`,
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    endpoint: '/skill.md',
  },
];

/** The tool list as tools/list returns it (no internal fields). */
export function listTools() {
  return TOOLS.map(({ name, title, description, inputSchema }) => ({
    name, title, description, inputSchema,
    annotations: { title, readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }));
}

// ---------------------------------------------------------------- fetching

export class ToolError extends Error {}

const trimBase = (b) => String(b || DEFAULT_BASE_URL).replace(/\/+$/, '');

/**
 * A fetcher bound to a base URL. http(s) uses fetch; file: reads the disk, so
 * the server can be pointed at a local build (SIREN_BASE_URL=file:///…/public).
 */
export function makeFetcher({ baseUrl = DEFAULT_BASE_URL, fetchImpl = globalThis.fetch, timeoutMs = 15000 } = {}) {
  const base = trimBase(baseUrl);
  const get = async (rel) => {
    const target = `${base}${rel}`;
    if (base.startsWith('file:')) {
      try { return await readFile(fileURLToPath(target), 'utf8'); } catch (err) { throw new ToolError(`could not read ${target}: ${err.code || err.message}`); }
    }
    let res;
    try {
      res = await fetchImpl(target, { headers: { accept: 'application/json, text/plain, */*', 'user-agent': `${BIN}/${SERVER_VERSION}` }, signal: AbortSignal.timeout(timeoutMs) });
    } catch (err) {
      throw new ToolError(`could not fetch ${target}: ${err.message}`);
    }
    if (!res.ok) throw new ToolError(`${target} answered HTTP ${res.status}`);
    return res.text();
  };
  const bytes = async (rel) => {
    const target = `${base}${rel}`;
    if (base.startsWith('file:')) {
      try { return await readFile(fileURLToPath(target)); } catch (err) { throw new ToolError(`could not read ${target}: ${err.code || err.message}`); }
    }
    let res;
    try {
      res = await fetchImpl(target, { headers: { 'user-agent': `${BIN}/${SERVER_VERSION}`, 'accept-encoding': 'identity' }, signal: AbortSignal.timeout(timeoutMs) });
    } catch (err) {
      throw new ToolError(`could not fetch ${target}: ${err.message}`);
    }
    if (!res.ok) throw new ToolError(`${target} answered HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  };
  return {
    base,
    url: (rel) => `${base}${rel}`,
    text: get,
    bytes,
    json: async (rel) => {
      const body = await get(rel);
      try { return JSON.parse(body); } catch { throw new ToolError(`${base}${rel} is not valid JSON`); }
    },
  };
}

// ---------------------------------------------------------------- helpers

const ms = (s) => { const t = Date.parse(s); return Number.isFinite(t) ? t : null; };

function sinceMs(args) {
  if (args.since === undefined || args.since === null || args.since === '') return null;
  const t = ms(args.since);
  if (t === null) throw new ToolError(`"since" must be an ISO 8601 timestamp, got ${JSON.stringify(args.since)}`);
  return t;
}

function intArg(args, key, def, min, max) {
  const v = args[key];
  if (v === undefined || v === null) return def;
  const n = Number(v);
  if (!Number.isInteger(n)) throw new ToolError(`"${key}" must be an integer`);
  return Math.min(max, Math.max(min, n));
}

const hm = (s) => { const t = ms(s); return t === null ? 'time unknown' : `${new Date(t).toISOString().slice(11, 16)} UTC`; };
const host = (u) => String(u).replace(/^[a-z]+:\/\//, '').replace(/\/+$/, '');

// ---------------------------------------------------------------- handlers

const HANDLERS = {
  async siren_status(args, f) {
    const s = await f.json('/api/state.json');
    const score = Number.isFinite(s.score) ? Number(s.score.toFixed(1)) : null;
    return {
      level: s.level,
      level_name: s.level_name,
      score,
      score_raw: s.score,
      generated_at: s.generated_at,
      level_since: s.level_since ?? null,
      previous_level: s.previous_level ?? null,
      delta_from_previous: s.delta_from_previous ?? null,
      degraded: s.degraded === true,
      dark_pillars: s.dark_pillars ?? [],
      pillars: (s.pillars || []).map((p) => ({
        id: p.id, name: p.name, score: p.score ?? null, dark: p.dark === true, in_composite: p.in_composite === true,
        sources_ok: p.sources_ok ?? null, sources_total: p.sources_total ?? null,
      })),
      next_update_expected_at: s.next_update_expected_at ?? null,
      poll: s.poll ?? null,
      receipt_id: s.receipt_id ?? null,
      receipt_url: s.receipt_id ? f.url(`/api/receipts/${s.receipt_id}.json`) : null,
      citation: `SIREN ${s.level} · ${score === null ? '—' : score.toFixed(1)}/100 at ${hm(s.generated_at)} — ${host(f.base)}`,
      scale: SCALE,
      disclaimer: s._disclaimer || NOT_HARM,
      source: f.url('/api/state.json'),
    };
  },

  async siren_news(args, f) {
    const limit = intArg(args, 'limit', 10, 1, 100);
    const since = sinceMs(args);
    const sort = args.sort === 'score' ? 'score' : 'newest';
    if (args.pillar !== undefined && !PILLAR_IDS.includes(args.pillar)) throw new ToolError(`"pillar" must be one of ${PILLAR_IDS.join(', ')}`);
    const n = await f.json('/api/news.json');
    const label = new Map((n.sources || []).map((s) => [s.id, s.label]));
    const seen = (it) => (it.meta && it.meta.first_seen_at) || it.published_at || null;
    let items = (n.items || []).filter((it) => it && it.title && it.url);
    if (args.pillar) items = items.filter((it) => it.pillar === args.pillar);
    if (since !== null) items = items.filter((it) => (ms(seen(it)) ?? -Infinity) > since);
    items.sort(sort === 'score'
      ? (a, b) => ((b.score ?? -1) - (a.score ?? -1)) || ((ms(seen(b)) ?? 0) - (ms(seen(a)) ?? 0))
      : (a, b) => ((ms(seen(b)) ?? 0) - (ms(seen(a)) ?? 0)) || ((b.score ?? -1) - (a.score ?? -1)));
    return {
      generated_at: n.generated_at ?? null,
      total_in_window: (n.items || []).length,
      matched: items.length,
      items: items.slice(0, limit).map((it) => ({
        id: it.id, title: it.title, url: it.url, source: it.source, outlet: label.get(it.source) || it.source,
        published_at: it.published_at ?? null, first_seen_at: seen(it), pillar: it.pillar ?? null, score: it.score ?? null,
        summary: it.summary ? String(it.summary).slice(0, 280) : null,
        permalink: it.permalink ?? null,
        cite: it.cite ?? null,
      })),
      next_update_expected_at: n.next_update_expected_at ?? null,
      note: 'Story score is the newsroom\'s own 0-100 ranking, not a rating of truth or importance.',
      source: f.url('/api/news.json'),
    };
  },

  async siren_changes(args, f) {
    const limit = intArg(args, 'limit', 50, 1, 200);
    const since = sinceMs(args);
    const types = Array.isArray(args.types) && args.types.length ? new Set(args.types) : null;
    const c = await f.json('/api/changes.json');
    let changes = (c.changes || []).filter((x) => x && ms(x.at) !== null);
    if (since !== null) changes = changes.filter((x) => ms(x.at) > since);
    if (types) changes = changes.filter((x) => types.has(x.type));
    // With "since", the quiet flag is about the caller's own last poll; without
    // it, the file's own flag (new since the previous build).
    const changed = since !== null ? changes.length > 0 : c.changed_since_previous_build === true;
    return {
      changed,
      summary: since !== null
        ? (changes.length ? `${changes.length} change${changes.length === 1 ? '' : 's'} since ${args.since}.` : `No change since ${args.since}.`)
        : (c.summary ?? null),
      generated_at: c.generated_at ?? null,
      since: args.since ?? null,
      changed_since_previous_build: c.changed_since_previous_build ?? null,
      baseline: c.baseline ?? null,
      next_update_expected_at: c.next_update_expected_at ?? null,
      poll: c.poll ?? null,
      matched: changes.length,
      changes: changes.slice(0, limit),
      next: 'Pass generated_at as "since" on the next call, no sooner than poll.min_interval_seconds.',
      source: f.url('/api/changes.json'),
    };
  },

  async siren_history(args, f) {
    const limit = intArg(args, 'limit', 24, 1, 500);
    const since = sinceMs(args);
    const h = await f.json('/api/history.json');
    let rows = (h.observations || []).filter((r) => r && ms(r.generated_at ?? r.t) !== null);
    if (since !== null) rows = rows.filter((r) => ms(r.generated_at ?? r.t) > since);
    rows.sort((a, b) => ms(b.generated_at ?? b.t) - ms(a.generated_at ?? a.t));
    return {
      count_total: Number.isFinite(h.count) ? h.count : (h.observations || []).length,
      matched: rows.length,
      observations: rows.slice(0, limit).map((r) => ({
        generated_at: r.generated_at ?? r.t, score: r.score, level: r.level ?? null, degraded: r.degraded === true, pillars: r.pillars ?? null,
      })),
      scale: SCALE,
      source: f.url('/api/history.json'),
    };
  },

  async siren_search(args, f) {
    const q = String(args.query ?? '').toLowerCase().trim();
    if (!q) throw new ToolError('"query" is required');
    const limit = intArg(args, 'limit', 10, 1, 50);
    const words = q.split(/\s+/).filter(Boolean);
    const idx = await f.json('/api/search-index.json');
    const labels = idx.types || {};
    const hits = [];
    for (const row of idx.items || []) {
      if (!Array.isArray(row)) continue;
      const [type, title = '', url = '', desc = '', keys = ''] = row;
      if (args.type && type !== args.type) continue;
      const t = String(title).toLowerCase();
      const hay = `${t} ${String(desc).toLowerCase()} ${String(keys).toLowerCase()}`;
      if (!words.every((w) => hay.includes(w))) continue;
      const rank = words.filter((w) => t.includes(w)).length * 2 + (t.startsWith(words[0]) ? 1 : 0);
      hits.push({ rank, type, kind: labels[type] || type, title, url: /^https?:/.test(url) ? url : f.url(url), description: desc });
    }
    hits.sort((a, b) => b.rank - a.rank);
    return {
      query: args.query,
      matched: hits.length,
      results: hits.slice(0, limit).map(({ rank, ...r }) => r),
      index_at: idx.at ?? null,
      source: f.url('/api/search-index.json'),
    };
  },

  async siren_verify(args, f) {
    let rel = String(args.path ?? '').trim();
    if (!rel) throw new ToolError('"path" is required');
    if (rel.startsWith(f.base)) rel = rel.slice(f.base.length);
    rel = rel.replace(/^\/+/, '').replace(/[?#].*$/, '');
    if (args.sha256 !== undefined && !/^[0-9a-fA-F]{64}$/.test(String(args.sha256))) throw new ToolError('"sha256" must be 64 hex characters');
    const m = await f.json('/api/manifest.json');
    const entry = (m.files || []).find((x) => x && x.path === rel);
    if (!entry) {
      return { path: rel, listed: false, ok: false, note: 'Not in the manifest: only machine-readable files are listed (api/*, .well-known/*, llms.txt, feeds, ...).', manifest_generated_at: m.generated_at ?? null, source: f.url('/api/manifest.json') };
    }
    let actual = args.sha256 ? String(args.sha256).toLowerCase() : null;
    let actualBytes = null;
    if (!actual) {
      const buf = await f.bytes(`/${rel}`);
      actual = createHash('sha256').update(buf).digest('hex');
      actualBytes = buf.length;
    }
    const ok = actual === entry.sha256 && (actualBytes === null || actualBytes === entry.bytes);
    return {
      path: rel,
      listed: true,
      ok,
      checked: args.sha256 ? 'the sha256 you supplied' : 'the bytes fetched just now',
      expected_sha256: entry.sha256,
      expected_bytes: entry.bytes,
      actual_sha256: actual,
      actual_bytes: actualBytes,
      file_generated_at: entry.generated_at ?? null,
      manifest_generated_at: m.generated_at ?? null,
      note: ok ? 'Matches the build manifest.' : 'Does not match. The file and the manifest may come from different builds: fetch both again before concluding it was altered.',
      receipts: m.receipts ?? null,
      source: f.url('/api/manifest.json'),
    };
  },

  async siren_guide(args, f) {
    let skill = null;
    try { skill = await f.text('/skill.md'); } catch { skill = null; }
    return {
      rules: [
        'Give the level with its name and say the scale runs 5 (quietest) to 1 (loudest).',
        NOT_HARM,
        'Give the UTC time of the reading; the score is hourly, the news is refreshed every few minutes.',
        `Link ${f.base}/ or the receipt you used. License: CC BY 4.0.`,
        'Fetch at most every 15 minutes; each JSON file says when to come back (next_update_expected_at, poll.min_interval_seconds).',
        'Hand a fact on with its permalink and cite string; check files against /api/manifest.json with siren_verify.',
      ],
      skill_md: skill,
      endpoints: Object.fromEntries(TOOLS.filter((t) => t.endpoint).map((t) => [t.name, f.url(t.endpoint)])),
      more: [f.url('/llms.txt'), f.url('/openapi.json'), f.url('/agents.html')],
    };
  },
};

/**
 * Run one tool. Returns an MCP CallToolResult. A failure inside the tool
 * (network, bad argument) is a result with isError, not a JSON-RPC error,
 * so the model can read what went wrong and try again.
 */
export async function callTool(name, args, fetcher) {
  const handler = Object.prototype.hasOwnProperty.call(HANDLERS, name) ? HANDLERS[name] : null;
  if (!handler) return null;
  try {
    const out = await handler(args && typeof args === 'object' ? args : {}, fetcher);
    return { content: [{ type: 'text', text: JSON.stringify(out, null, 2) }], structuredContent: out, isError: false };
  } catch (err) {
    const msg = err instanceof ToolError ? err.message : `unexpected error: ${err && err.message}`;
    return { content: [{ type: 'text', text: `${name} failed: ${msg}` }], isError: true };
  }
}
