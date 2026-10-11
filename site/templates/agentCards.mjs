// Machine-readable doors for agents, the feed they poll, and the contract
// that keeps their polling polite:
//   /api/changes.json               what changed, newest first (readings, level changes, news first seen)
//   /api/changes.txt                the same, one line per change since the previous build, or "no change since"
//   /api/manifest.json              sha256 + bytes of every machine-readable file, computed last
//   poll fields                     next_update_expected_at + poll{} on state/fresh/news/history/changes
//   /.well-known/mcp.json           the MCP server (mcp/server.mjs): how to run it, its tools
//   /.well-known/agent-card.json    an A2A-style agent card: skills mapped to the public endpoints
//   /.well-known/ai-plugin.json     the legacy plugin manifest, pointing at /openapi.json
//
// The tool list is imported from mcp/tools.mjs, the module the server itself
// serves from, so a card cannot describe a tool the server does not have.
//
// EVERY FACT COMES FROM A DATA FILE. changes.json is built only from what the
// build already holds (history.ndjson, news.json, state.json). A section whose
// source is absent is left out, never filled in. No network calls.

import { createHash } from 'node:crypto';
import * as brand from '../brand.mjs';
import { slugFor } from './itemPage.mjs';
import {
  TOOLS, listTools, SERVER_NAME, SERVER_TITLE, SERVER_VERSION, PROTOCOL_VERSION, INSTALL, REPO, BIN,
} from '../../mcp/tools.mjs';

const NOT_CLAIM = 'It counts AI activity. It is not a probability of harm and not a forecast.';

// How much of each record changes.json carries. Hourly readings: two days.
export const CHANGES_LIMITS = { readings: 48, level_changes: 20, news: 100 };

const ms = (s) => { const t = Date.parse(s); return Number.isFinite(t) ? t : null; };
const levelName = (level) => { try { return brand.levelMeta(level).name; } catch { return null; } };
// Differences of two published scores, at the precision they are published.
const diff4 = (a, b) => (Number.isFinite(a) && Number.isFinite(b) ? Number((a - b).toFixed(4)) : null);

const TYPE_ORDER = { level_change: 0, reading: 1, news: 2 };

// ---------------------------------------------------------------- the poll contract
//
// The two schedules the site is built on, as written in
// .github/workflows/collect.yml. The build reads that file (readCadence in
// build.mjs, parseCadence here); these are only the fallback when it cannot,
// and agentCards.test.mjs fails if they stop matching the file.
export const CADENCE_FALLBACK = { newsCron: '*/15 * * * *', indexCron: '7 * * * *', source: '.github/workflows/collect.yml' };

/** Pull the news lane (every N minutes) and the hourly index pass out of a workflow's text. */
export function parseCadence(yamlText, source = CADENCE_FALLBACK.source) {
  let newsCron = null;
  let indexCron = null;
  for (const m of String(yamlText || '').matchAll(/cron:\s*['"]([^'"]+)['"]/g)) {
    const [min, ...rest] = m[1].trim().split(/\s+/);
    if (rest.join(' ') !== '* * * *') continue;
    if (/^\*\/\d+$/.test(min) && !newsCron) newsCron = m[1].trim();
    else if (/^\d+$/.test(min) && !indexCron) indexCron = m[1].trim();
  }
  return newsCron && indexCron ? { newsCron, indexCron, source } : null;
}

/** Seconds between runs of a "*\/N * * * *" or "M * * * *" cron. */
export function cronIntervalSeconds(cron) {
  const min = String(cron).trim().split(/\s+/)[0];
  const every = min.match(/^\*\/(\d+)$/);
  if (every) return Number(every[1]) * 60;
  if (/^\d+$/.test(min)) return 3600;
  return null;
}

/** The first scheduled run strictly after `iso`, for the two cron shapes above. */
export function nextCronSlot(cron, iso) {
  const t = ms(iso);
  if (t === null) return null;
  const min = String(cron).trim().split(/\s+/)[0];
  const d = new Date(t);
  d.setUTCSeconds(0, 0);
  const every = min.match(/^\*\/(\d+)$/);
  if (every) {
    const n = Number(every[1]);
    d.setUTCMinutes(Math.floor(d.getUTCMinutes() / n) * n);
    while (d.getTime() <= t) d.setUTCMinutes(d.getUTCMinutes() + n);
    return d.toISOString();
  }
  if (/^\d+$/.test(min)) {
    d.setUTCMinutes(Number(min));
    while (d.getTime() <= t) d.setUTCHours(d.getUTCHours() + 1);
    return d.toISOString();
  }
  return null;
}

export const POLL_NOTE =
  'Poll no faster than min_interval_seconds; nothing changes between builds. next_update_expected_at is the next scheduled build; ' +
  'GitHub runs schedules late (often 5-20 minutes), so if it has passed, wait min_interval_seconds again rather than retrying sooner. ' +
  'Every endpoint is a static file: GET is idempotent and safe to retry with backoff.';

/**
 * The poll fields for one file. `lane` is 'index' (hourly scoring) or 'news'
 * (the 15-minute lane). For the index the engine's own forecast
 * (state.health.expected_next_run_utc, from the same cron plus measured lag)
 * wins when it is later than the reading; otherwise the next cron slot.
 */
export function pollFields({ lane, at, state = null, cadence = CADENCE_FALLBACK, useSince = false }) {
  const cron = lane === 'index' ? cadence.indexCron : cadence.newsCron;
  let next = null;
  const engineNext = state && state.health && state.health.expected_next_run_utc;
  if (lane === 'index' && ms(engineNext) !== null && ms(engineNext) > (ms(at) ?? 0)) next = engineNext;
  if (!next) next = nextCronSlot(cron, at);
  return {
    next_update_expected_at: next,
    poll: {
      min_interval_seconds: cronIntervalSeconds(cron),
      use_since: useSince,
      cadence: { cron, source: cadence.source },
      note: POLL_NOTE,
    },
  };
}

// ---------------------------------------------------------------- citation and handoff

const utcMin = (iso) => { const t = ms(iso); return t === null ? 'time unknown' : `${new Date(t).toISOString().slice(0, 16).replace('T', ' ')} UTC`; };
const hostOf = (u) => String(u).replace(/^https?:\/\//, '').replace(/\/+$/, '');
const fix1 = (n) => (Number.isFinite(n) ? n.toFixed(1) : '—');

/** "SIREN (siren.watch), <what>, <UTC time>, <permalink>, CC BY 4.0" */
export function citeLine(url, what, iso, permalink, label = '') {
  return `${brand.NAME} (${hostOf(url('/'))}), ${what}, ${label ? `${label} ` : ''}${utcMin(iso)}${permalink ? `, ${permalink}` : ''}, ${brand.LICENSE}`;
}

/** Permalink + cite for one news item: SIREN's own page for it when item pages are built. */
export function newsHandoff(it, url, { itemPages = true, outlet = null } = {}) {
  const permalink = itemPages ? url(`/item/${slugFor(it)}.html`) : it.url;
  const seen = (it.meta && it.meta.first_seen_at) || it.published_at;
  const what = `"${String(it.title).replace(/\s+/g, ' ').trim()}"${outlet || it.source ? ` (${outlet || it.source})` : ''}`;
  return { permalink, cite: citeLine(url, what, seen, permalink, 'first seen') };
}

/** news.json as published: each item gains permalink and cite, nothing else changes. */
export function newsWithHandoff(news, url, { itemPages = true } = {}) {
  if (!news || !Array.isArray(news.items)) return news;
  const label = new Map((Array.isArray(news.sources) ? news.sources : []).map((s) => [s.id, s.label]));
  return {
    ...news,
    items: news.items.map((it) => (it && it.title && it.id ? { ...it, ...newsHandoff(it, url, { itemPages, outlet: label.get(it.source) }) } : it)),
  };
}

/** Drop the fields newsWithHandoff adds, so a published item compares equal to its source. */
export function stripHandoff(it) {
  if (!it || typeof it !== 'object') return it;
  const { permalink, cite, ...rest } = it;
  return rest;
}

/** Receipt id for a reading time: the engine names receipts by the UTC stamp, colons as hyphens. */
function receiptIndex(receipts) {
  const m = new Map();
  for (const r of Array.isArray(receipts) ? receipts : []) {
    const t = r && ms(r.generated_at);
    if (t !== null && r.id) m.set(t, r.id);
  }
  return m;
}

/**
 * /api/changes.json. `history` is the build's loaded history (ascending,
 * each row with generated_at, score, level). Returns a plain object; the
 * build serialises it with stableJson.
 */
export function changesJson({ state = null, history = [], news = null, url, receipts = [], itemPages = true, previousAt = null, cadence = CADENCE_FALLBACK }) {
  const rid = receiptIndex(receipts);
  const readingLink = (at) => { const id = rid.get(ms(at)); return id ? url(`/api/receipts/${id}.json`) : null; };
  const rows = (Array.isArray(history) ? history : [])
    .filter((r) => r && Number.isFinite(r.score) && ms(r.generated_at ?? r.t) !== null)
    .map((r) => ({ ...r, at: r.generated_at ?? r.t }))
    .sort((a, b) => ms(a.at) - ms(b.at));

  const changes = [];
  const sections = {};

  if (rows.length) {
    const start = Math.max(0, rows.length - CHANGES_LIMITS.readings);
    for (let i = start; i < rows.length; i += 1) {
      const r = rows[i];
      const prev = i > 0 ? rows[i - 1] : null;
      const permalink = readingLink(r.at);
      changes.push({
        type: 'reading',
        at: r.at,
        score: r.score,
        level: Number.isInteger(r.level) ? r.level : null,
        level_name: levelName(r.level),
        delta: prev ? diff4(r.score, prev.score) : null,
        degraded: r.degraded === true,
        permalink,
        cite: citeLine(url, `${brand.NAME} ${r.level} ${levelName(r.level) || ''} ${fix1(r.score)}/100`.replace(/\s+/g, ' '), r.at, permalink),
      });
    }
    sections.readings = rows.length - start;

    const levelChanges = [];
    for (let i = 1; i < rows.length; i += 1) {
      const r = rows[i];
      const prev = rows[i - 1];
      if (!Number.isInteger(r.level) || !Number.isInteger(prev.level) || r.level === prev.level) continue;
      const permalink = readingLink(r.at);
      levelChanges.push({
        type: 'level_change',
        at: r.at,
        level: r.level,
        level_name: levelName(r.level),
        previous_level: prev.level,
        previous_level_name: levelName(prev.level),
        direction: r.level < prev.level ? 'louder' : 'quieter',
        score: r.score,
        permalink,
        cite: citeLine(url, `level moved from ${brand.NAME} ${prev.level} to ${brand.NAME} ${r.level} ${levelName(r.level) || ''}`.trim(), r.at, permalink),
      });
    }
    const kept = levelChanges.slice(-CHANGES_LIMITS.level_changes);
    changes.push(...kept);
    sections.level_changes = kept.length;
  }

  const items = news && Array.isArray(news.items) ? news.items : null;
  if (items) {
    const label = new Map((Array.isArray(news.sources) ? news.sources : []).map((s) => [s.id, s.label]));
    const seen = items
      .filter((it) => it && it.title && it.url && it.meta && ms(it.meta.first_seen_at) !== null)
      .sort((a, b) => ms(b.meta.first_seen_at) - ms(a.meta.first_seen_at))
      .slice(0, CHANGES_LIMITS.news);
    for (const it of seen) {
      changes.push({
        type: 'news',
        at: it.meta.first_seen_at,
        id: it.id,
        title: it.title,
        url: it.url,
        source: it.source,
        outlet: label.get(it.source) || it.source,
        published_at: it.published_at ?? null,
        pillar: it.pillar ?? null,
        score: Number.isFinite(it.score) ? it.score : null,
        ...newsHandoff(it, url, { itemPages, outlet: label.get(it.source) }),
      });
    }
    sections.news = seen.length;
  }

  changes.sort((a, b) => (ms(b.at) - ms(a.at)) || (TYPE_ORDER[a.type] - TYPE_ORDER[b.type]));

  const stamps = [state && state.generated_at, news && news.generated_at, rows.length ? rows[rows.length - 1].at : null, ...changes.map((c) => c.at)]
    .filter((s) => ms(s) !== null);
  const generatedAt = stamps.length ? stamps.reduce((a, b) => (ms(b) > ms(a) ? b : a)) : null;

  // QUIET BY DEFAULT. What is new since the previous build: the previous
  // api/changes.json's generated_at when the build found one on disk, else
  // the reading before the latest (the hourly build's own predecessor).
  let baseline = null;
  if (ms(previousAt) !== null) baseline = { at: previousAt, from: 'previous_build' };
  else if (rows.length >= 2) baseline = { at: rows[rows.length - 2].at, from: 'previous_reading' };
  const fresh = baseline ? changes.filter((c) => ms(c.at) > ms(baseline.at)) : changes.slice();
  const counts = {};
  for (const c of fresh) counts[c.type] = (counts[c.type] || 0) + 1;
  const latest = rows.length ? rows[rows.length - 1] : null;
  const parts = ['level_change', 'reading', 'news'].filter((t) => counts[t]).map((t) => `${counts[t]} ${t === 'level_change' ? `level change${counts[t] === 1 ? '' : 's'}` : t === 'reading' ? `reading${counts[t] === 1 ? '' : 's'}` : `news item${counts[t] === 1 ? '' : 's'}`}`);
  const now = latest ? ` Now ${brand.NAME} ${latest.level} ${levelName(latest.level) || ''} · ${fix1(latest.score)}/100.`.replace(/ +·/, ' ·') : '';
  const summary = fresh.length
    ? `${parts.join(', ')} since ${utcMin(baseline ? baseline.at : null)}.${now}`
    : `No change since ${utcMin(baseline && baseline.at)}.${now}`;

  return {
    schema: 1,
    generated_at: generatedAt,
    changed_since_previous_build: fresh.length > 0,
    summary,
    baseline,
    new_since_baseline: fresh.length,
    sections,
    limits: CHANGES_LIMITS,
    ...pollFields({ lane: 'news', at: generatedAt, cadence, useSince: true }),
    usage:
      'Poll at most every 15 minutes. Keep generated_at from your last fetch and keep only entries whose "at" is later than it; ' +
      'this is a static file, so the filtering is yours (the MCP tool siren_changes takes it as "since"). ' +
      '"reading" = an hourly score (delta vs the reading before), "level_change" = the level moved, "news" = a story SIREN first saw at "at".',
    changes,
    _about: `${brand.NAME}: ${brand.DESCRIPTION}`,
    _disclaimer: brand.DISCLAIMER,
    _license: brand.LICENSE,
    _docs: url('/agents.html#use-from-your-agent'),
  };
}

/** /api/changes.txt: one line per change since the baseline, or the single "no change" line. */
export function changesTxt(c) {
  const base = c && c.baseline ? c.baseline.at : null;
  const fresh = (c && Array.isArray(c.changes) ? c.changes : []).filter((x) => base === null || ms(x.at) > ms(base));
  if (!fresh.length) return `no change since ${base || 'the previous build'}\n`;
  const one = (x) => {
    if (x.type === 'news') return `${x.outlet || x.source}: ${String(x.title).replace(/\s+/g, ' ').trim()}`;
    if (x.type === 'level_change') return `${brand.NAME} ${x.previous_level} -> ${brand.NAME} ${x.level} ${x.level_name || ''} (${x.direction})`.trim();
    const d = Number.isFinite(x.delta) ? ` (${x.delta > 0 ? '+' : ''}${x.delta.toFixed(2)})` : '';
    return `${brand.NAME} ${x.level} ${x.level_name || ''} ${fix1(x.score)}/100${d}`.replace(/\s+/g, ' ');
  };
  return `${fresh.map((x) => [x.at, x.type, one(x), x.permalink || x.url || ''].join('\t').trimEnd()).join('\n')}\n`;
}

// ---------------------------------------------------------------- integrity manifest

/** Which written files count as machine-readable (paths relative to the site root). */
export function isMachineFile(rel) {
  if (rel === 'api/manifest.json') return false;
  if (/^api\/receipts\/[^/]+\.json$/.test(rel)) return rel === 'api/receipts/index.json'; // receipts carry their own hash chain
  if (/^api\/[^/]+\.(json|txt|csv|ndjson)$/.test(rel)) return true;
  if (/^\.well-known\/[^/]+\.(json|txt)$/.test(rel)) return true;
  return /^[^/]+\.(txt|md|xml|json)$/.test(rel);
}

/**
 * /api/manifest.json from the bytes actually on disk. `files` is
 * [{ path, bytes: Buffer }]. A file's generated_at is its own top-level
 * generated_at when it is JSON and has one; otherwise null, never guessed.
 */
export function manifestJson({ files, generatedAt, url }) {
  const entries = files
    .filter((f) => isMachineFile(f.path))
    .slice()
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
    .map((f) => {
      let at = null;
      if (f.path.endsWith('.json')) {
        try { const j = JSON.parse(f.bytes.toString('utf8')); if (j && typeof j.generated_at === 'string') at = j.generated_at; } catch { /* not JSON after all */ }
      }
      return {
        path: f.path,
        url: url(`/${f.path}`),
        sha256: createHash('sha256').update(f.bytes).digest('hex'),
        bytes: f.bytes.length,
        generated_at: at,
      };
    });
  return {
    schema: 1,
    generated_at: generatedAt,
    count: entries.length,
    algorithm: 'sha256',
    usage:
      'Fetch a file, hash its exact bytes with sha256 and compare. A mismatch usually means the file and this manifest come from ' +
      'different builds (the newsroom lane rewrites some files every few minutes): fetch both again. ' +
      'The index readings themselves are hash-chained in the receipts; each receipt carries prev_hash and hash.',
    receipts: url('/api/receipts/index.json'),
    files: entries,
    _license: brand.LICENSE,
  };
}

/** The Claude Desktop / Claude Code style config block. */
export function mcpConfig({ local = false } = {}) {
  const run = local ? INSTALL.node : INSTALL.npx;
  return { mcpServers: { [SERVER_NAME]: { command: run.command, args: run.args } } };
}

/** /.well-known/mcp.json */
export function mcpJson(ctx) {
  return {
    schema: 1,
    name: SERVER_NAME,
    title: SERVER_TITLE,
    version: SERVER_VERSION,
    description: `${brand.DESCRIPTION} ${NOT_CLAIM} Read-only tools over the public JSON at ${ctx.url('/')}.`,
    protocolVersion: PROTOCOL_VERSION,
    transport: 'stdio',
    install: {
      npx: { ...INSTALL.npx },
      node: { ...INSTALL.node },
      requires: 'Node.js >= 20, no dependencies, no key',
    },
    env: {
      SIREN_BASE_URL: { default: brand.CANONICAL_URL, description: 'Where to read the JSON from; http(s) or file:// for a local build.' },
    },
    config: mcpConfig(),
    tools: listTools().map(({ name, title, description, inputSchema, annotations }) => ({ name, title, description, inputSchema, annotations })),
    source: `https://github.com/${REPO}/tree/main/mcp`,
    homepage: ctx.url('/agents.html#use-from-your-agent'),
    license: brand.LICENSE,
    bin: BIN,
  };
}

// Plain endpoints that are not MCP tools but deserve a skill on the card.
const EXTRA_SKILLS = [
  { id: 'siren_now_text', name: 'Current reading as plain text', endpoint: '/api/now.txt', mode: 'text/plain', description: 'The current reading in 3-6 plain lines: level, name, score, UTC time, top mover, what it means.', tags: ['ai', 'index', 'text'] },
  { id: 'siren_snapshot', name: 'Markdown snapshot', endpoint: '/now.md', mode: 'text/markdown', description: 'Reading, pillars, top 10 scored stories, leaders most covered, Takeover Watch and how to cite, as markdown.', tags: ['ai', 'news', 'markdown'] },
];

const TOOL_EXAMPLES = {
  siren_status: ['How loud is AI activity right now?', 'What is the current SIREN level?'],
  siren_news: ['What are the top AI stories in the last hour?'],
  siren_changes: ['What changed on SIREN since 2026-10-11T00:00:00Z?'],
  siren_history: ['Is today unusual compared with the last week of readings?'],
  siren_search: ['Find SIREN pages about datacentre water use.'],
  siren_verify: ['Is the copy of api/state.json I fetched complete and unaltered?'],
  siren_guide: ['How should I describe and cite a SIREN reading?'],
};

/** /.well-known/agent-card.json (A2A AgentCard shape). */
export function agentCard(ctx) {
  const toolSkills = TOOLS.map((t) => ({
    id: t.name,
    name: t.title,
    description: `${t.description} HTTP: GET ${ctx.url(t.endpoint)}. MCP tool: ${t.name}.`,
    tags: ['ai', 'index', 'read-only'],
    examples: TOOL_EXAMPLES[t.name] || [],
    inputModes: ['text/plain', 'application/json'],
    outputModes: [t.endpoint.endsWith('.md') ? 'text/markdown' : 'application/json'],
  }));
  const extra = EXTRA_SKILLS.map((s) => ({
    id: s.id, name: s.name, description: `${s.description} HTTP: GET ${ctx.url(s.endpoint)}.`, tags: s.tags, examples: [],
    inputModes: ['text/plain'], outputModes: [s.mode],
  }));
  return {
    protocolVersion: '0.3.0',
    name: `${brand.NAME}: the AI Siren Index`,
    description:
      `${brand.DESCRIPTION} ${NOT_CLAIM} There is no live agent endpoint: every skill is a static GET on ${ctx.url('/')} ` +
      `(CORS open, no key) or a tool of the stdio MCP server described at ${ctx.url('/.well-known/mcp.json')}.`,
    url: ctx.url('/'),
    version: SERVER_VERSION,
    provider: { organization: brand.PUBLICATION, url: brand.REPO_URL },
    documentationUrl: ctx.url('/agents.html'),
    iconUrl: ctx.url('/icon-512.png'),
    capabilities: { streaming: false, pushNotifications: false, stateTransitionHistory: false },
    defaultInputModes: ['text/plain'],
    defaultOutputModes: ['application/json', 'text/plain', 'text/markdown'],
    skills: [...toolSkills, ...extra],
    supportsAuthenticatedExtendedCard: false,
  };
}

/** /.well-known/ai-plugin.json (legacy plugin manifest, schema v1). */
export function aiPlugin(ctx) {
  return {
    schema_version: 'v1',
    name_for_human: brand.NAME,
    name_for_model: 'siren_ai_index',
    description_for_human: 'The hourly AI Siren Index: how loud AI activity is right now, with the news behind it.',
    description_for_model:
      `${brand.NAME} is an hourly index of AI activity tempo: a 0-100 score and a level from 5 (quietest) to 1 (loudest), ` +
      `with five pillar scores, a scored AI newsroom and a changes feed. ${NOT_CLAIM} Quote the level with its name and ` +
      `the UTC time of the reading, link ${ctx.url('/')}, and fetch at most every 15 minutes.`,
    auth: { type: 'none' },
    api: { type: 'openapi', url: ctx.url('/openapi.json') },
    logo_url: ctx.url('/icon-512.png'),
    legal_info_url: ctx.url('/terms.html'),
  };
}
