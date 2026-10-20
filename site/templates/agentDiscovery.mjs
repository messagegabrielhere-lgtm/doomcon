// Agent discovery surfaces beyond llms.txt / agents.md:
//   /agents.txt, /agents.json                 agents-txt.com capability announcement
//   /.well-known/api-catalog[+.json]          RFC 9727 linkset of machine APIs
//   /.well-known/agent-skills/index.json      agentskills.io skill index
//   /.well-known/mcp/server-card.json         how to run the stdio MCP kit
//   /skills/siren-ai-index/SKILL.md           skill package path many installers look for
//   /ai.txt                                   short "you are welcome here" pointer
//
// Honest about what ships: open JSON + a clone-and-run stdio MCP. No fake
// streamable-HTTP MCP URL and no A2A endpoint we do not operate.

import { createHash } from 'node:crypto';
import * as brand from '../brand.mjs';

export const SKILL_ID = 'siren-ai-index';
export const SKILL_PATH = `/skills/${SKILL_ID}/SKILL.md`;

const SKILL_DESC =
  'Report the current SIREN AI activity level (hourly tempo index). Prefer plain-text and markdown over HTML scraping.';

// Keep in sync with agent-kit/mcp.mjs TOOLS (names + one-line purpose). Listed
// here so the static site never imports the MCP process module.
const MCP_TOOLS = [
  ['siren_now', 'Current reading (plain text + structured fields)'],
  ['siren_state', 'Full /api/state.json'],
  ['siren_news', 'Top scored newsroom stories'],
  ['siren_history', 'Recent hourly readings'],
  ['siren_takeover_watch', 'Takeover Watch signals (watched, not scored)'],
  ['siren_verify_receipt', 'Fetch and verify a receipt self-hash'],
  ['siren_cite', 'Canonical citation + spoken form'],
];

function sha256Hex(text) {
  return createHash('sha256').update(String(text), 'utf8').digest('hex');
}

/** /agents.txt — agents-txt.com announcement layer (Skills only; no fake MCP URL). */
export function agentsTxt(ctx) {
  const u = (p) => ctx.url(p);
  return `# agents.txt
# Standard: https://agents-txt.com
# JSON: ${u('/agents.json')}
# Site map for language models: ${u('/llms.txt')}
# Short fetch-first entry: ${u('/agents.md')}
# AGENTS.md convention (same body): ${u('/AGENTS.md')}
# How to cite: ${u('/skill.md')}
# Live reading: ${u('/')} — AI activity index today · AI activity level today
# Scored stories: ${u('/now.md')} · ${u('/api/news.json')} · ${u('/news.html')}
# Google News sitemap: ${u('/news-sitemap.xml')}
# Free tools: ${u('/free-tools.html')} · Verify a reading: ${u('/verify.html')}
# Search Trends (watched, not scored): ${u('/search-trends.html')} · ${u('/api/search-trends.json')}
# Classic instrument panel: ${u('/classic.html')} — Where is the full SIREN instrument panel?

Skills: ${u('/skill.md')}
Skills: ${u(SKILL_PATH)}
`;
}

/** /agents.json — structured companion to agents.txt. */
export function agentsJson(ctx) {
  const u = (p) => ctx.url(p);
  return {
    $schema: 'https://agents-txt.com/schema/agents-json/v1.0.json',
    version: '1.0',
    standard: 'https://agents-txt.com',
    site: {
      name: brand.NAME,
      url: u('/'),
      description: brand.DESCRIPTION,
    },
    skills: [
      {
        url: u('/skill.md'),
        description: SKILL_DESC,
      },
      {
        url: u(SKILL_PATH),
        description: `${SKILL_DESC} Packaged path for skill installers.`,
      },
    ],
    // FINDABILITY #330 — structured companion lists the classic panel beside
    // agents.txt / ai.txt / api-catalog (#328) so JSON scrapers find it too.
    // FINDABILITY #441 — dual middot head terms beside live home (parallel to
    // discovery text #439) so JSON scrapers see both unbranded phrases.
    related: {
      home: u('/'),
      home_title: 'AI activity index today · AI activity level today',
      classic: u('/classic.html'),
      classic_title: 'Where is the full SIREN instrument panel?',
    },
  };
}

/**
 * RFC 9727 api-catalog linkset. Lists the open APIs and agent entry points.
 * Served at /.well-known/api-catalog and /.well-known/api-catalog.json.
 */
export function apiCatalog(ctx) {
  const u = (p) => ctx.url(p);
  const catalog = u('/.well-known/api-catalog');
  return {
    linkset: [
      {
        anchor: catalog,
        item: [
          { href: u('/'), type: 'text/html', title: 'AI activity index today · AI activity level today' },
          { href: u('/openapi.json'), type: 'application/json', title: 'OpenAPI 3.1 description of the public API' },
          { href: u('/api/index.json'), type: 'application/json', title: 'Endpoint map' },
          { href: u('/api/state.json'), type: 'application/json', title: 'Current SIREN reading' },
          { href: u('/api/now.txt'), type: 'text/plain', title: 'Current reading in a few plain lines' },
          { href: u('/now.md'), type: 'text/markdown', title: 'Markdown snapshot of the reading' },
          { href: u('/api/news.json'), type: 'application/json', title: 'Scored newsroom window (JSON)' },
          { href: u('/api/search-trends.json'), type: 'application/json', title: 'Google Search Trends for AI (watched, not scored)' },
          { href: u('/search-trends.html'), type: 'text/html', title: 'Which Google Search Trends for AI does SIREN watch?' },
          { href: u('/ai-prediction-markets.html'), type: 'text/html', title: 'Where are live AI prediction market odds?' },
          { href: u('/free-tools.html'), type: 'text/html', title: 'What free tools does SIREN publish?' },
          { href: u('/verify.html'), type: 'text/html', title: 'How do you check a SIREN reading yourself?' },
          { href: u('/classic.html'), type: 'text/html', title: 'Where is the full SIREN instrument panel?' },
          { href: u('/news-sitemap.xml'), type: 'application/xml', title: 'Google News rolling sitemap' },
          { href: u('/news.html'), type: 'text/html', title: 'Which AI stories has SIREN scored in this window?' },
          { href: u('/agents.md'), type: 'text/markdown', title: 'Short agent entry: what to fetch first' },
          { href: u('/AGENTS.md'), type: 'text/markdown', title: 'AGENTS.md convention: same fetch-first entry as agents.md' },
          { href: u('/agents.txt'), type: 'text/plain', title: 'agents.txt capability announcement' },
          { href: u('/agents.json'), type: 'application/json', title: 'agents.json structured capabilities' },
          { href: u('/skill.md'), type: 'text/markdown', title: 'Agent skill: how to report and cite' },
          { href: u('/llms.txt'), type: 'text/plain', title: 'llms.txt site map for language models' },
          { href: u('/.well-known/mcp/server-card.json'), type: 'application/json', title: 'MCP server card (stdio kit)' },
          { href: u('/.well-known/agent-skills/index.json'), type: 'application/json', title: 'Agent skills index' },
        ],
      },
      {
        anchor: u('/openapi.json'),
        'service-desc': [{ href: u('/openapi.json'), type: 'application/json' }],
        'service-doc': [{ href: u('/agents.html') }],
      },
      {
        anchor: u('/api/state.json'),
        'service-desc': [{ href: u('/openapi.json'), type: 'application/json' }],
        'service-doc': [{ href: u('/') }],
      },
    ],
  };
}

/** /.well-known/agent-skills/index.json */
export function agentSkillsIndex(ctx, skillBody) {
  return {
    $schema: 'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
    skills: [
      {
        name: SKILL_ID,
        type: 'skill-md',
        description: SKILL_DESC,
        url: ctx.url(SKILL_PATH),
        // Identical body also published at /skill.md for the short well-known URL.
        digest: `sha256:${sha256Hex(skillBody)}`,
        // FINDABILITY #330 — skill index points at the classic panel (same
        // question needle as agents.json / skill.md).
        // FINDABILITY #441 — dual head terms beside live home (same needle as
        // agents.json / agents.txt).
        related: {
          home: ctx.url('/'),
          home_title: 'AI activity index today · AI activity level today',
          classic: ctx.url('/classic.html'),
          classic_title: 'Where is the full SIREN instrument panel?',
        },
      },
    ],
  };
}

/** /.well-known/mcp/server-card.json — documents the clone-and-run stdio MCP. */
export function mcpServerCard(ctx) {
  return {
    name: 'siren',
    description:
      'Read and cite the SIREN AI activity index. Scale runs 5 (quietest) to 1 (loudest). Counts activity tempo; not a probability of harm and not a forecast. No API key.',
    version: '1.0.0',
    tools: MCP_TOOLS.map(([name, description]) => ({ name, description })),
    serverInfo: {
      name: 'siren',
      version: '1.0.0',
      description: 'SIREN MCP — stdio tools over the public siren.watch API.',
    },
    transport: {
      type: 'stdio',
      command: 'node',
      args: ['agent-kit/mcp.mjs'],
      repository: brand.REPO_URL,
      docs: `${brand.REPO_URL}/tree/main/agent-kit`,
      env: { SIREN_BASE_URL: ctx.url('/').replace(/\/$/, '') },
    },
    capabilities: {
      tools: true,
      resources: true,
      prompts: false,
    },
    related: {
      agents_txt: ctx.url('/agents.txt'),
      agents_md: ctx.url('/agents.md'),
      skill: ctx.url('/skill.md'),
      openapi: ctx.url('/openapi.json'),
      home: ctx.url('/'),
      home_title: 'AI activity index today · AI activity level today',
      now: ctx.url('/api/now.txt'),
      news: ctx.url('/api/news.json'),
      news_sitemap: ctx.url('/news-sitemap.xml'),
      newsroom: ctx.url('/news.html'),
      search_trends: ctx.url('/api/search-trends.json'),
      search_trends_html: ctx.url('/search-trends.html'),
      ai_prediction_markets: ctx.url('/ai-prediction-markets.html'),
      free_tools: ctx.url('/free-tools.html'),
      verify: ctx.url('/verify.html'),
      classic: ctx.url('/classic.html'),
    },
  };
}

/** /ai.txt — short welcome many crawlers probe by name. */
export function aiTxt(ctx) {
  const u = (p) => ctx.url(p);
  return `# AI agents are welcome at ${brand.NAME}

${brand.NAME} is an hourly, recomputable index of AI activity tempo.
It counts how loud AI is (5 quietest → 1 loudest). It is not a probability of harm and not a forecast.
Free under ${brand.LICENSE}. No key, no account.

Start here:
- ${u('/')} — live AI activity index today · AI activity level today
- ${u('/agents.md')} — what to fetch first
- ${u('/AGENTS.md')} — same fetch-first map (uppercase path coding agents request)
- ${u('/agents.txt')} — capability announcement (agents-txt.com)
- ${u('/skill.md')} — how to phrase and cite the reading
- ${u('/llms.txt')} — full site map for language models
- ${u('/api/now.txt')} — current reading in a few plain lines
- ${u('/now.md')} — markdown snapshot + top scored stories
- ${u('/api/news.json')} — scored newsroom window (JSON)
- ${u('/api/search-trends.json')} — Google Search Trends for AI (watched, not scored)
- ${u('/search-trends.html')} — Which Google Search Trends for AI does ${brand.NAME} watch?
- ${u('/ai-prediction-markets.html')} — Where are live AI prediction market odds?
- ${u('/free-tools.html')} — What free tools does ${brand.NAME} publish?
- ${u('/verify.html')} — How do you check a ${brand.NAME} reading yourself?
- ${u('/classic.html')} — Where is the full ${brand.NAME} instrument panel?
- ${u('/news-sitemap.xml')} — Google News rolling sitemap (keyword-rich; prefer over HTML scraping)
- ${u('/news.html')} — Which AI stories has ${brand.NAME} scored in this window? (UTC day hubs under /news/YYYY-MM-DD.html)
- ${u('/openapi.json')} — every JSON endpoint
- ${u('/.well-known/api-catalog')} — RFC 9727 API catalog

Runnable MCP (stdio, Node built-ins only): ${brand.REPO_URL}/tree/main/agent-kit
Human welcome: ${u('/agents.html')}
`;
}
