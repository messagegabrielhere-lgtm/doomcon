// OpenAPI 3.1 discovery document for the public JSON API.
//
// COMPETITIVE.md / SITE-UPGRADES-90 Month 1D: we already ship a CORS-enabled
// API with /api/index.json, but /openapi.json 404'd — so directory scrapers
// and "awesome public APIs" lists had nothing machine-readable to ingest.
// Generated from the same endpoint map the build writes into api/index.json.

import * as brand from '../brand.mjs';

export function render(ctx) {
  const state = ctx.state || {};
  const spec = {
    openapi: '3.1.0',
    info: {
      title: `${brand.NAME} public API`,
      summary: brand.DESCRIPTION,
      description:
        `${brand.PUBLICATION} publishes every reading as static JSON. ` +
        `No key, no account, CORS *. License ${brand.LICENSE}. ` +
        `Levels run from 5 (quietest) to 1 (loudest) and measure activity tempo, not probability of harm.\n\n` +
        `POLL CONTRACT. /api/state.json, /api/fresh.json, /api/news.json, /api/history.json and /api/changes.json carry ` +
        '`next_update_expected_at` (the next scheduled build, from the real workflow cron) and a `poll` object (see the Poll schema). ' +
        'Poll no faster than `poll.min_interval_seconds`; nothing changes between builds. Scheduled builds run late, so when ' +
        '`next_update_expected_at` has passed, wait the interval again instead of retrying sooner. Every path here is a static file: ' +
        'GET is idempotent, cacheable and safe to retry with backoff. Verify any file against /api/manifest.json (sha256).',
      version: String(state.engine_version || '1'),
      license: { name: brand.LICENSE, identifier: 'CC-BY-4.0' },
      contact: {
        name: brand.PUBLICATION,
        url: brand.REPO_URL,
        ...(brand.X_URL ? { 'x-twitter': brand.X_URL } : {}),
      },
    },
    servers: [{ url: brand.CANONICAL_URL, description: 'GitHub Pages static origin' }],
    tags: [
      { name: 'index', description: 'The composite reading and its history' },
      { name: 'receipts', description: 'Hash-chained, recomputable observations' },
      { name: 'surfaces', description: 'Newsroom, race, substrate and related datasets' },
      { name: 'discovery', description: 'Cards that tell agent frameworks how to use SIREN' },
    ],
    paths: {
      '/api/index.json': {
        get: {
          tags: ['index'],
          summary: 'API discovery document',
          operationId: 'getApiIndex',
          responses: {
            200: {
              description: 'Endpoint map and license',
              content: { 'application/json': { schema: { type: 'object' } } },
            },
          },
        },
      },
      '/api/state.json': {
        get: {
          tags: ['index'],
          summary: 'Current composite score, level, pillars and per-source freshness',
          operationId: 'getState',
          responses: {
            200: {
              description: 'Latest scored observation',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/State' } } },
            },
          },
        },
      },
      '/api/history.json': {
        get: {
          tags: ['index'],
          summary: 'Scored observations over time',
          operationId: 'getHistory',
          responses: {
            200: {
              description: 'Observation list',
              content: { 'application/json': { schema: { type: 'object' } } },
            },
          },
        },
      },
      '/api/health.json': {
        get: {
          tags: ['index'],
          summary: 'Source-ok counts — the ratio is the status, there is no healthy/unhealthy word',
          operationId: 'getHealth',
          responses: {
            200: {
              description: 'Per-source and per-pillar health',
              content: { 'application/json': { schema: { type: 'object' } } },
            },
          },
        },
      },
      '/api/receipts/{id}.json': {
        get: {
          tags: ['receipts'],
          summary: 'One hash-chained receipt',
          operationId: 'getReceipt',
          parameters: [{
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', example: '2026-10-08T05-24-36Z' },
            description: 'Receipt id (UTC stamp with colons replaced by hyphens)',
          }],
          responses: {
            200: {
              description: 'Full receipt: inputs, constants, decision, prev_hash, hash',
              content: { 'application/json': { schema: { type: 'object' } } },
            },
            404: { description: 'Unknown receipt id' },
          },
        },
      },
      '/api/receipts/index.json': {
        get: {
          tags: ['receipts'],
          summary: 'Index of published receipt ids',
          operationId: 'listReceipts',
          responses: {
            200: {
              description: 'Newest-first list of receipt ids and hashes',
              content: { 'application/json': { schema: { type: 'object' } } },
            },
          },
        },
      },
      '/api/news.json': {
        get: {
          tags: ['surfaces'],
          summary: 'Scored newsroom window',
          operationId: 'getNews',
          responses: {
            200: {
              description: 'Current scored items',
              content: { 'application/json': { schema: { type: 'object' } } },
            },
          },
        },
      },
      '/api/now.txt': {
        get: {
          tags: ['index'],
          summary: 'Current reading as 3-6 plain lines: level, score, name, UTC time, top mover, meaning, URL',
          operationId: 'getNowText',
          responses: {
            200: { description: 'Plain-text reading, rebuilt every build', content: { 'text/plain': { schema: { type: 'string' } } } },
          },
        },
      },
      '/now.md': {
        get: {
          tags: ['index'],
          summary: 'Markdown snapshot: reading, pillars, top 10 scored stories, leaders, Takeover Watch, how to cite',
          operationId: 'getNowMarkdown',
          responses: {
            200: { description: 'Markdown snapshot, rebuilt every build', content: { 'text/markdown': { schema: { type: 'string' } } } },
          },
        },
      },
      '/llms.txt': {
        get: {
          tags: ['index'],
          summary: 'llms.txt site map for language models (also at /.well-known/llms.txt)',
          operationId: 'getLlmsTxt',
          responses: {
            200: { description: 'llmstxt.org-format markdown', content: { 'text/plain': { schema: { type: 'string' } } } },
          },
        },
      },
      '/llms-full.txt': {
        get: {
          tags: ['index'],
          summary: 'llms.txt followed by the live markdown snapshot',
          operationId: 'getLlmsFullTxt',
          responses: {
            200: { description: 'Markdown', content: { 'text/plain': { schema: { type: 'string' } } } },
          },
        },
      },
      '/api/changes.json': {
        get: {
          tags: ['index'],
          summary: 'What changed, newest first: hourly readings with score deltas, level changes, news items with the time SIREN first saw them',
          description:
            'A static file rebuilt every build (the newsroom part every few minutes). There is no server-side query: ' +
            'poll at most every 15 minutes, keep generated_at, and on the next poll keep only entries whose `at` is later. ' +
            'A section whose source data is absent is left out (see `sections`).',
          operationId: 'getChanges',
          responses: {
            200: {
              description: 'Change list',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Changes' } } },
            },
          },
        },
      },
      '/api/changes.txt': {
        get: {
          tags: ['index'],
          summary: 'One tab-separated line per change since the previous build (at, type, text, permalink), or the single line "no change since <time>"',
          operationId: 'getChangesText',
          responses: { 200: { description: 'Plain text', content: { 'text/plain': { schema: { type: 'string' } } } } },
        },
      },
      '/api/manifest.json': {
        get: {
          tags: ['index'],
          summary: 'Integrity manifest: path, url, sha256, bytes and generated_at of every machine-readable file, computed last from the bytes written',
          description: 'The index readings are additionally hash-chained in /api/receipts/ (prev_hash, hash); individual receipts are not repeated here.',
          operationId: 'getManifest',
          responses: { 200: { description: 'Manifest', content: { 'application/json': { schema: { $ref: '#/components/schemas/Manifest' } } } } },
        },
      },
      '/.well-known/mcp.json': {
        get: {
          tags: ['discovery'],
          summary: 'The SIREN MCP server (stdio): how to run it and its read-only tools',
          operationId: 'getMcpCard',
          responses: { 200: { description: 'MCP server card', content: { 'application/json': { schema: { type: 'object' } } } } },
        },
      },
      '/.well-known/agent-card.json': {
        get: {
          tags: ['discovery'],
          summary: 'A2A-style agent card: skills mapped to the public endpoints',
          operationId: 'getAgentCard',
          responses: { 200: { description: 'Agent card', content: { 'application/json': { schema: { type: 'object' } } } } },
        },
      },
      '/.well-known/ai-plugin.json': {
        get: {
          tags: ['discovery'],
          summary: 'Legacy plugin manifest pointing at this document',
          operationId: 'getAiPlugin',
          responses: { 200: { description: 'Plugin manifest', content: { 'application/json': { schema: { type: 'object' } } } } },
        },
      },
      '/openapi.json': {
        get: {
          tags: ['index'],
          summary: 'This OpenAPI document',
          operationId: 'getOpenApi',
          responses: {
            200: {
              description: 'OpenAPI 3.1 document',
              content: { 'application/json': { schema: { type: 'object' } } },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        Poll: {
          type: 'object',
          description: 'When to come back. Poll no faster than min_interval_seconds; nothing changes between builds.',
          properties: {
            min_interval_seconds: { type: 'integer', description: 'Seconds between scheduled builds for this file (900 for the news lane, 3600 for the hourly index)' },
            use_since: { type: 'boolean', description: 'Whether entries carry timestamps you can filter on with your last generated_at' },
            cadence: { type: 'object', properties: { cron: { type: 'string' }, source: { type: 'string' } } },
            note: { type: 'string' },
          },
        },
        Manifest: {
          type: 'object',
          properties: {
            generated_at: { type: 'string', format: 'date-time' },
            count: { type: 'integer' },
            algorithm: { type: 'string', const: 'sha256' },
            receipts: { type: 'string', format: 'uri' },
            files: {
              type: 'array',
              items: {
                type: 'object',
                required: ['path', 'sha256', 'bytes'],
                properties: {
                  path: { type: 'string' },
                  url: { type: 'string', format: 'uri' },
                  sha256: { type: 'string', pattern: '^[0-9a-f]{64}$' },
                  bytes: { type: 'integer' },
                  generated_at: { type: ['string', 'null'], description: "The file's own top-level generated_at, or null when it has none" },
                },
              },
            },
          },
        },
        Changes: {
          type: 'object',
          required: ['schema', 'generated_at', 'changes'],
          properties: {
            schema: { type: 'integer' },
            changed_since_previous_build: { type: 'boolean', description: 'False: nothing is newer than baseline.at. A cron agent can stay quiet.' },
            summary: { type: 'string', description: 'One line, e.g. "1 reading, 12 news items since 2026-10-11 00:12 UTC. Now SIREN 4 ROUTINE · 54.0/100."' },
            baseline: {
              type: ['object', 'null'],
              properties: { at: { type: 'string', format: 'date-time' }, from: { type: 'string', enum: ['previous_build', 'previous_reading'] } },
            },
            new_since_baseline: { type: 'integer' },
            next_update_expected_at: { type: ['string', 'null'], format: 'date-time' },
            poll: { $ref: '#/components/schemas/Poll' },
            generated_at: { type: ['string', 'null'], format: 'date-time', description: 'Newest timestamp in the file; pass it back as your "since"' },
            sections: { type: 'object', additionalProperties: { type: 'integer' }, description: 'Entries per section present: readings, level_changes, news' },
            usage: { type: 'string' },
            changes: {
              type: 'array',
              items: {
                type: 'object',
                required: ['type', 'at'],
                properties: {
                  type: { type: 'string', enum: ['reading', 'level_change', 'news'] },
                  at: { type: 'string', format: 'date-time' },
                  score: { type: ['number', 'null'] },
                  level: { type: ['integer', 'null'], minimum: 1, maximum: 5 },
                  level_name: { type: ['string', 'null'] },
                  delta: { type: ['number', 'null'], description: 'reading: score minus the previous reading' },
                  previous_level: { type: 'integer', description: 'level_change only' },
                  direction: { type: 'string', enum: ['louder', 'quieter'], description: 'level_change only' },
                  title: { type: 'string', description: 'news only' },
                  url: { type: 'string', format: 'uri', description: 'news only' },
                  outlet: { type: 'string', description: 'news only' },
                  published_at: { type: ['string', 'null'], description: 'news only' },
                  pillar: { type: ['string', 'null'], description: 'news only' },
                  permalink: { type: ['string', 'null'], format: 'uri', description: 'news: the SIREN item page; reading/level_change: the receipt' },
                  cite: { type: 'string', description: 'SIREN (siren.watch), <what>, <UTC time>, <permalink>, CC BY 4.0' },
                },
              },
            },
          },
        },
        State: {
          type: 'object',
          properties: {
            schema: { type: 'integer' },
            generated_at: { type: 'string', format: 'date-time' },
            score: { type: 'number', minimum: 0, maximum: 100 },
            level: { type: 'integer', minimum: 1, maximum: 5 },
            level_name: { type: 'string' },
            degraded: { type: 'boolean' },
            receipt_id: { type: 'string' },
            receipt_hash: { type: 'string' },
            next_update_expected_at: { type: ['string', 'null'], format: 'date-time' },
            poll: { $ref: '#/components/schemas/Poll' },
          },
        },
      },
    },
    externalDocs: {
      description: 'Methodology — every formula and constant',
      url: ctx.url('/methodology.html'),
    },
  };

  return `${JSON.stringify(spec, null, 2)}\n`;
}
