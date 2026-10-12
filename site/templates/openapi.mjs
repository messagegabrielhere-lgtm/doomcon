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
        `Levels run from 5 (quietest) to 1 (loudest) and measure activity tempo, not probability of harm.`,
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
      '/api/mood.json': {
        get: {
          tags: ['surfaces'],
          summary: 'Headline-tone index per AI company (−100…100) from fixed word lists',
          operationId: 'getMood',
          responses: {
            200: {
              description: 'Per-company mood board and lexicons',
              content: { 'application/json': { schema: { type: 'object' } } },
            },
          },
        },
      },
      '/api/boards.json': {
        get: {
          tags: ['surfaces'],
          summary: 'Public model boards: OpenRouter usage, LMArena order, Hugging Face video downloads',
          operationId: 'getBoards',
          responses: {
            200: {
              description: 'Boards with source links; dark boards carry ok:false',
              content: { 'application/json': { schema: { type: 'object' } } },
            },
          },
        },
      },
      '/api/coding-agents.json': {
        get: {
          tags: ['surfaces'],
          summary: 'Coding agents and MCP hubs: stars, releases, health from GitHub',
          operationId: 'getCodingAgents',
          responses: {
            200: {
              description: 'Agent and MCP rosters with health labels',
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
      '/agents.md': {
        get: {
          tags: ['index'],
          summary: 'Short entry point for AI agents (ChatGPT, Grok, …): what to fetch first and how to cite',
          operationId: 'getAgentsMd',
          responses: {
            200: { description: 'Markdown', content: { 'text/markdown': { schema: { type: 'string' } } } },
          },
        },
      },
      '/skill.md': {
        get: {
          tags: ['index'],
          summary: 'Agent skill file: how to report and cite the current SIREN reading',
          operationId: 'getSkillMd',
          responses: {
            200: { description: 'Markdown', content: { 'text/markdown': { schema: { type: 'string' } } } },
          },
        },
      },
      '/agents.txt': {
        get: {
          tags: ['index'],
          summary: 'agents-txt.com capability announcement (Skills)',
          operationId: 'getAgentsTxt',
          responses: {
            200: { description: 'Plain-text agents.txt', content: { 'text/plain': { schema: { type: 'string' } } } },
          },
        },
      },
      '/agents.json': {
        get: {
          tags: ['index'],
          summary: 'Structured agents.json companion to agents.txt',
          operationId: 'getAgentsJson',
          responses: {
            200: { description: 'agents.json document', content: { 'application/json': { schema: { type: 'object' } } } },
          },
        },
      },
      '/ai.txt': {
        get: {
          tags: ['index'],
          summary: 'Short welcome pointer for AI agents',
          operationId: 'getAiTxt',
          responses: {
            200: { description: 'Plain text', content: { 'text/plain': { schema: { type: 'string' } } } },
          },
        },
      },
      '/.well-known/api-catalog': {
        get: {
          tags: ['index'],
          summary: 'RFC 9727 API catalog linkset (also at /.well-known/api-catalog.json)',
          operationId: 'getApiCatalog',
          responses: {
            200: { description: 'Linkset JSON', content: { 'application/linkset+json': { schema: { type: 'object' } } } },
          },
        },
      },
      '/.well-known/mcp/server-card.json': {
        get: {
          tags: ['index'],
          summary: 'MCP server card for the clone-and-run stdio kit (not streamable HTTP)',
          operationId: 'getMcpServerCard',
          responses: {
            200: { description: 'MCP server card', content: { 'application/json': { schema: { type: 'object' } } } },
          },
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
