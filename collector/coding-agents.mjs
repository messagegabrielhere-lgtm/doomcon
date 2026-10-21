#!/usr/bin/env node
// CODING AGENTS + MCP HUB — maintenance status from public GitHub metadata.
//
//   docker run --rm --network host -v "$PWD":/app -w /app node:20-alpine \
//     node collector/coding-agents.mjs
//   docker run --rm -v "$PWD":/app -w /app node:20-alpine \
//     node collector/coding-agents.mjs --offline
//
// WHY. Ainnect's agents hub and MCP hub are the surfaces SIREN lacked: per-repo
// stars, latest release, and a health pill derived from release cadence — not
// a review. This module tracks a published roster through the GitHub API
// (CONTRACT.md §1.5 → fetch.mjs). A failed repo goes dark on its own row; the
// run never invents stars or dates.
//
// AUTH. Optional GITHUB_TOKEN / GH_TOKEN raises the rate limit. Without a token
// the unauthenticated 60 req/h budget still covers one roster refresh.
//
// DETERMINISM. generated_at is wall-clock (the fetch moment). Ranking and
// health labels are pure functions of the fetched fields, so two runs that
// see the same GitHub answers produce the same rows aside from generated_at.

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchJson } from './fetch.mjs';

export const SCHEMA = 1;
export const VERSION = '1.0.0';

/** Days since last release (or push) → health label. Not a review. */
export const HEALTH = Object.freeze({
  active_days: 30,     // release or push within 30d
  slowing_days: 90,    // within 90d
  // else dormant
});

// Published roster. Slug is the URL segment; repo is owner/name on GitHub.
export const AGENT_ROSTER = Object.freeze([
  { id: 'openclaw', name: 'OpenClaw', repo: 'openclaw/openclaw', blurb: 'The AI that really does things across OS and platform.' },
  { id: 'hermes', name: 'Hermes', repo: 'NousResearch/hermes-agent', blurb: 'The agent that grows with you.' },
  { id: 'opencode', name: 'OpenCode', repo: 'anomalyco/opencode', blurb: 'Open-source coding agent.' },
  { id: 'autogpt', name: 'AutoGPT', repo: 'Significant-Gravitas/AutoGPT', blurb: 'Accessible AI agent platform.' },
  { id: 'claude-code', name: 'Claude Code', repo: 'anthropics/claude-code', blurb: 'Anthropic\'s agentic coding tool in the terminal.' },
  { id: 'codex', name: 'Codex', repo: 'openai/codex', blurb: 'OpenAI\'s lightweight coding agent for the terminal.' },
  { id: 'browser-use', name: 'Browser Use', repo: 'browser-use/browser-use', blurb: 'Agents that use the browser.' },
  { id: 'pi', name: 'Pi', repo: 'earendil-works/pi', blurb: 'AI agent toolkit: unified LLM API, agent loop, TUI, coding CLI.' },
  { id: 'gemini-cli', name: 'Gemini CLI', repo: 'google-gemini/gemini-cli', blurb: 'Open-source Gemini agent in the terminal.' },
  { id: 'openhands', name: 'OpenHands', repo: 'OpenHands/OpenHands', blurb: 'AI-driven development agent.' },
  { id: 'cline', name: 'Cline', repo: 'cline/cline', blurb: 'Autonomous coding agent as SDK, IDE extension, or CLI.' },
  { id: 'open-interpreter', name: 'Open Interpreter', repo: 'openinterpreter/open-interpreter', blurb: 'Coding agent for open models.' },
  { id: 'crewai', name: 'CrewAI', repo: 'crewAIInc/crewAI', blurb: 'Framework for orchestrating role-playing autonomous agents.' },
  { id: 'goose', name: 'Goose', repo: 'block/goose', blurb: 'Extensible open-source agent beyond code suggestions.' },
  { id: 'aider', name: 'Aider', repo: 'Aider-AI/aider', blurb: 'AI pair programming in your terminal.' },
  { id: 'qwen-code', name: 'Qwen Code', repo: 'QwenLM/qwen-code', blurb: 'Open-source Qwen coding agent for the terminal.' },
  { id: 'copilot-cli', name: 'Copilot CLI', repo: 'github/copilot-cli', blurb: 'GitHub Copilot in the terminal.' },
  { id: 'swe-agent', name: 'SWE-agent', repo: 'SWE-agent/SWE-agent', blurb: 'Software engineering agents that use computers.' },
  { id: 'metagpt', name: 'MetaGPT', repo: 'FoundationAgents/MetaGPT', blurb: 'Multi-agent framework for software company simulation.' },
  { id: 'roo-code', name: 'Roo Code', repo: 'RooCodeInc/Roo-Code', blurb: 'Autonomous coding agent (VS Code).' },
  { id: 'superagi', name: 'SuperAGI', repo: 'TransformerOptimus/SuperAGI', blurb: 'Dev-first open-source autonomous AI agent framework.' },
  { id: 'kimi-cli', name: 'Kimi CLI', repo: 'MoonshotAI/kimi-cli', blurb: 'Moonshot\'s coding CLI.' },
]);

export const MCP_ROSTER = Object.freeze([
  { id: 'github-mcp', name: 'GitHub MCP', repo: 'github/github-mcp-server', blurb: 'Official GitHub Model Context Protocol server.' },
  { id: 'playwright-mcp', name: 'Playwright MCP', repo: 'microsoft/playwright-mcp', blurb: 'Browser automation MCP server from Microsoft.' },
  { id: 'fastmcp', name: 'FastMCP', repo: 'jlowin/fastmcp', blurb: 'Python framework for building MCP servers.' },
  { id: 'mcp-toolbox', name: 'MCP Toolbox', repo: 'googleapis/genai-toolbox', blurb: 'Google\'s MCP toolbox for databases and tools.' },
  { id: 'activepieces', name: 'Activepieces', repo: 'activepieces/activepieces', blurb: 'Open-source automation with MCP surfaces.' },
  { id: 'headroom', name: 'Headroom', repo: 'headroomlabs-ai/headroom', blurb: 'Compress tool outputs and RAG chunks before they reach the LLM; library, proxy, MCP server.' },
]);

/**
 * Health from release/push recency only. Stars measure attention, not quality.
 * @param {string|null} lastReleaseAt
 * @param {string|null} pushedAt
 * @param {string} asOfIso
 */
export function healthOf(lastReleaseAt, pushedAt, asOfIso) {
  const asOf = Date.parse(asOfIso);
  const releaseMs = lastReleaseAt ? Date.parse(lastReleaseAt) : NaN;
  const pushMs = pushedAt ? Date.parse(pushedAt) : NaN;
  const newest = Math.max(
    Number.isFinite(releaseMs) ? releaseMs : -Infinity,
    Number.isFinite(pushMs) ? pushMs : -Infinity,
  );
  if (!Number.isFinite(newest) || !Number.isFinite(asOf)) {
    return { label: 'unknown', days_since_activity: null };
  }
  const days = Math.max(0, Math.floor((asOf - newest) / 86_400_000));
  if (days <= HEALTH.active_days) return { label: 'active', days_since_activity: days };
  if (days <= HEALTH.slowing_days) return { label: 'slowing', days_since_activity: days };
  return { label: 'dormant', days_since_activity: days };
}

function ghHeaders() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function fetchRepo(repo, { fetcher = fetchJson, headers }) {
  return fetcher(`https://api.github.com/repos/${repo}`, { headers, retries: 1, timeoutMs: 12_000 });
}

async function fetchLatestRelease(repo, { fetcher = fetchJson, headers }) {
  try {
    return await fetcher(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers, retries: 0, timeoutMs: 12_000,
    });
  } catch (err) {
    // 404 = no releases published; that is a state, not a dark row.
    if (err && err.status === 404) return null;
    throw err;
  }
}

/**
 * Build one entity row from GitHub answers (or an error).
 * Pure given the inputs — used by tests with fixtures.
 */
export function rowFromFetch(entry, { repoJson = null, releaseJson = null, error = null, asOf }) {
  if (error || !repoJson) {
    return {
      id: entry.id,
      name: entry.name,
      repo: entry.repo,
      blurb: entry.blurb,
      ok: false,
      error: error ? String(error.message || error) : 'no repo payload',
      stars: null,
      forks: null,
      watchers: null,
      open_issues: null,
      language: null,
      license: null,
      archived: null,
      pushed_at: null,
      latest_release: null,
      releases_90d: null,
      health: { label: 'dark', days_since_activity: null },
      html_url: `https://github.com/${entry.repo}`,
    };
  }
  const release = releaseJson ? {
    tag: releaseJson.tag_name ?? null,
    name: releaseJson.name ?? null,
    published_at: releaseJson.published_at ?? releaseJson.created_at ?? null,
    url: releaseJson.html_url ?? null,
    prerelease: Boolean(releaseJson.prerelease),
  } : null;
  const health = healthOf(release?.published_at, repoJson.pushed_at, asOf);
  return {
    id: entry.id,
    name: entry.name,
    repo: entry.repo,
    blurb: entry.blurb,
    ok: true,
    error: null,
    stars: Number.isFinite(repoJson.stargazers_count) ? repoJson.stargazers_count : null,
    forks: Number.isFinite(repoJson.forks_count) ? repoJson.forks_count : null,
    watchers: Number.isFinite(repoJson.subscribers_count) ? repoJson.subscribers_count : null,
    open_issues: Number.isFinite(repoJson.open_issues_count) ? repoJson.open_issues_count : null,
    language: repoJson.language ?? null,
    license: repoJson.license?.spdx_id ?? repoJson.license?.key ?? null,
    archived: Boolean(repoJson.archived),
    pushed_at: repoJson.pushed_at ?? null,
    latest_release: release,
    // Count filled by collectRoster when release list is available; null here.
    releases_90d: null,
    health: repoJson.archived ? { label: 'archived', days_since_activity: health.days_since_activity } : health,
    html_url: repoJson.html_url || `https://github.com/${entry.repo}`,
    description: typeof repoJson.description === 'string' ? repoJson.description : null,
  };
}

function sortAgents(rows) {
  const rank = { active: 0, slowing: 1, dormant: 2, archived: 3, dark: 4, unknown: 5 };
  return rows.slice().sort((a, b) => {
    const ha = rank[a.health?.label] ?? 9;
    const hb = rank[b.health?.label] ?? 9;
    if (ha !== hb) return ha - hb;
    const sa = a.stars ?? -1;
    const sb = b.stars ?? -1;
    if (sb !== sa) return sb - sa;
    return a.name.localeCompare(b.name);
  });
}

async function collectRoster(roster, { fetcher, headers, asOf, pauseMs = 200 }) {
  const rows = [];
  for (const entry of roster) {
    try {
      const repoJson = await fetchRepo(entry.repo, { fetcher, headers });
      let releaseJson = null;
      try {
        releaseJson = await fetchLatestRelease(entry.repo, { fetcher, headers });
      } catch {
        releaseJson = null;
      }
      // Optional: count releases in 90d (one extra page). Soft-fail.
      let releases90 = null;
      try {
        const list = await fetcher(
          `https://api.github.com/repos/${entry.repo}/releases?per_page=30`,
          { headers, retries: 0, timeoutMs: 12_000 },
        );
        if (Array.isArray(list)) {
          const cutoff = Date.parse(asOf) - 90 * 86_400_000;
          releases90 = list.filter((r) => {
            const t = Date.parse(r.published_at || r.created_at || '');
            return Number.isFinite(t) && t >= cutoff;
          }).length;
        }
      } catch {
        releases90 = null;
      }
      const row = rowFromFetch(entry, { repoJson, releaseJson, asOf });
      row.releases_90d = releases90;
      rows.push(row);
    } catch (err) {
      rows.push(rowFromFetch(entry, { error: err, asOf }));
    }
    if (pauseMs) await new Promise((r) => setTimeout(r, pauseMs));
  }
  return sortAgents(rows);
}

export function summarise(rows) {
  const ok = rows.filter((r) => r.ok);
  const byHealth = { active: 0, slowing: 0, dormant: 0, archived: 0, dark: 0, unknown: 0 };
  for (const r of rows) {
    const k = r.health?.label || 'unknown';
    byHealth[k] = (byHealth[k] || 0) + 1;
  }
  const updated7 = ok.filter((r) => {
    const t = Date.parse(r.latest_release?.published_at || '');
    return Number.isFinite(t) && (Date.now() - t) <= 7 * 86_400_000;
  }).length;
  const mostStars = ok.slice().sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0))[0] || null;
  const mostReleases = ok
    .filter((r) => Number.isFinite(r.releases_90d))
    .slice()
    .sort((a, b) => b.releases_90d - a.releases_90d)[0] || null;
  return {
    tracked: rows.length,
    ok: ok.length,
    dark: rows.length - ok.length,
    by_health: byHealth,
    updated_this_week: updated7,
    most_stars: mostStars ? { id: mostStars.id, name: mostStars.name, stars: mostStars.stars } : null,
    most_releases_90d: mostReleases
      ? { id: mostReleases.id, name: mostReleases.name, releases_90d: mostReleases.releases_90d }
      : null,
  };
}

export async function buildCodingAgents({
  fetcher = fetchJson,
  asOf = new Date().toISOString(),
  offline = false,
  previous = null,
  pauseMs = 150,
} = {}) {
  if (offline) {
    if (previous && previous.agents) {
      return { ...previous, generated_at: asOf, offline: true };
    }
    return {
      schema: SCHEMA,
      version: VERSION,
      generated_at: asOf,
      offline: true,
      rule: {
        statement: 'Health labels reflect commit and release recency on GitHub, not endorsements. Stars measure attention, not quality.',
        health: HEALTH,
      },
      agents: AGENT_ROSTER.map((e) => rowFromFetch(e, { error: new Error('offline'), asOf })),
      mcp: MCP_ROSTER.map((e) => rowFromFetch(e, { error: new Error('offline'), asOf })),
      agents_summary: null,
      mcp_summary: null,
    };
  }

  const headers = ghHeaders();
  const agents = await collectRoster(AGENT_ROSTER, { fetcher, headers, asOf, pauseMs });
  const mcp = await collectRoster(MCP_ROSTER, { fetcher, headers, asOf, pauseMs });

  return {
    schema: SCHEMA,
    version: VERSION,
    generated_at: asOf,
    offline: false,
    rule: {
      statement:
        'Health labels reflect GitHub release and push recency only — not a review. '
        + `active ≤ ${HEALTH.active_days}d, slowing ≤ ${HEALTH.slowing_days}d, else dormant. `
        + 'Archived repos are labelled archived. Stars measure attention, not quality.',
      health: HEALTH,
      source: 'GitHub REST API',
    },
    agents,
    mcp,
    agents_summary: summarise(agents),
    mcp_summary: summarise(mcp),
  };
}

async function main(argv = process.argv.slice(2)) {
  if (argv.includes('--selftest')) {
    runSelftest();
    return;
  }
  const offline = argv.includes('--offline');
  const outIdx = argv.indexOf('--out');
  const outPath = outIdx >= 0 ? argv[outIdx + 1] : 'data/coding-agents.json';
  let previous = null;
  if (existsSync(outPath)) {
    try { previous = JSON.parse(await readFile(outPath, 'utf8')); } catch { previous = null; }
  }
  const payload = await buildCodingAgents({ offline, previous });
  await writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`);
  const a = payload.agents_summary;
  const m = payload.mcp_summary;
  console.log(
    `coding-agents: ${a ? `${a.ok}/${a.tracked} agents ok` : 'offline'} · `
    + `${m ? `${m.ok}/${m.tracked} mcp ok` : 'offline'}`
    + (a?.updated_this_week != null ? ` · ${a.updated_this_week} agent releases this week` : ''),
  );
}

function runSelftest() {
  const asOf = '2026-10-12T00:00:00.000Z';
  const h1 = healthOf('2026-10-10T00:00:00.000Z', null, asOf);
  if (h1.label !== 'active') throw new Error(`expected active, got ${h1.label}`);
  const h2 = healthOf('2026-07-01T00:00:00.000Z', null, asOf);
  if (h2.label !== 'dormant') throw new Error(`expected dormant, got ${h2.label}`);
  const row = rowFromFetch(AGENT_ROSTER[0], {
    repoJson: {
      stargazers_count: 100,
      forks_count: 10,
      subscribers_count: 5,
      open_issues_count: 2,
      language: 'TypeScript',
      license: { spdx_id: 'MIT' },
      archived: false,
      pushed_at: '2026-10-11T00:00:00.000Z',
      html_url: 'https://github.com/openclaw/openclaw',
      description: 'test',
    },
    releaseJson: {
      tag_name: 'v1.0.0',
      name: 'v1.0.0',
      published_at: '2026-10-10T00:00:00.000Z',
      html_url: 'https://github.com/openclaw/openclaw/releases/tag/v1.0.0',
      prerelease: false,
    },
    asOf,
  });
  if (!row.ok || row.stars !== 100 || row.health.label !== 'active') {
    throw new Error('rowFromFetch failed');
  }
  const dark = rowFromFetch(AGENT_ROSTER[0], { error: new Error('HTTP 403'), asOf });
  if (dark.ok || dark.health.label !== 'dark') throw new Error('dark row failed');
  console.log('coding-agents selftest: ok');
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
