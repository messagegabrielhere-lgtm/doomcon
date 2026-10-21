// Thin, dependency-free client for the public SIREN API.
// AI agents import this module, call the CLI, or talk to mcp.mjs over stdio.
//
// Honesty rules (same as skill.md / agents.md):
//   - quote the level with its name; scale runs 5 (quietest) → 1 (loudest)
//   - it counts activity tempo, not doom probability and not a forecast
//   - always include the UTC stamp from the file you fetched
//   - fetch at most every 15 minutes

import { createHash } from 'node:crypto';

export const DEFAULT_BASE = 'https://siren.watch';
export const NOT_CLAIM = 'It counts AI activity. It is not a probability of harm and not a forecast.';

/**
 * @param {object} [opts]
 * @param {string} [opts.base] Origin, no trailing slash. Env SIREN_BASE_URL wins over default.
 * @param {typeof fetch} [opts.fetchImpl]
 * @param {string} [opts.userAgent]
 */
/** Strip trailing `/` without a repeating-quantifier regex (CodeQL js/polynomial-redos). */
export function stripTrailingSlashes(s) {
  const str = String(s);
  let end = str.length;
  while (end > 0 && str[end - 1] === '/') end -= 1;
  return str.slice(0, end);
}

export function createClient(opts = {}) {
  const base = stripTrailingSlashes(opts.base || process.env.SIREN_BASE_URL || DEFAULT_BASE);
  const fetchImpl = opts.fetchImpl || globalThis.fetch;
  const userAgent = opts.userAgent || 'siren-agent-kit/1.0 (+https://siren.watch/agents.html)';

  if (typeof fetchImpl !== 'function') {
    throw new Error('createClient: fetch is not available; pass fetchImpl or use Node 20+');
  }

  async function get(path, { as = 'json' } = {}) {
    const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`;
    const res = await fetchImpl(url, {
      headers: { 'User-Agent': userAgent, Accept: as === 'text' ? 'text/plain,*/*' : 'application/json,*/*' },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`SIREN ${res.status} for ${url}${body ? `: ${body.slice(0, 200)}` : ''}`);
    }
    if (as === 'text') return res.text();
    if (as === 'raw') return res;
    return res.json();
  }

  return {
    base,
    get,
    nowTxt: () => get('/api/now.txt', { as: 'text' }),
    nowMd: () => get('/now.md', { as: 'text' }),
    state: () => get('/api/state.json'),
    history: () => get('/api/history.json'),
    news: () => get('/api/news.json'),
    leaders: () => get('/api/leaders.json'),
    siSignals: () => get('/api/si-signals.json'),
    labsBench: () => get('/api/labs-bench.json'),
    labs: () => get('/api/labs.json'),
    fresh: () => get('/api/fresh.json'),
    health: () => get('/api/health.json'),
    index: () => get('/api/index.json'),
    skillMd: () => get('/skill.md', { as: 'text' }),
    agentsMd: () => get('/agents.md', { as: 'text' }),
    promoteMd: () => get('/promote.md', { as: 'text' }),
    promoteJson: () => get('/api/promote.json'),
    receipt: (id) => {
      if (!id || typeof id !== 'string') throw new Error('receipt: id is required');
      const safe = id.replace(/\.json$/i, '');
      return get(`/api/receipts/${encodeURIComponent(safe)}.json`);
    },
  };
}

/** "SIREN 4 · 54.0/100 at 00:33 UTC — siren.watch" */
export function formatCitation(state, siteUrl = DEFAULT_BASE) {
  if (!state || !Number.isFinite(state.level) || !Number.isFinite(state.score)) {
    throw new Error('formatCitation: state.level and state.score are required');
  }
  const host = stripTrailingSlashes(String(siteUrl).replace(/^https?:\/\//, ''));
  const hm = utcHm(state.generated_at);
  return `SIREN ${state.level} · ${fix1(state.score)}/100 at ${hm} — ${host}`;
}

/** Spoken form agents should use with humans. */
export function formatSpoken(state) {
  if (!state || !Number.isFinite(state.level)) throw new Error('formatSpoken: state.level is required');
  const name = state.level_name || levelName(state.level);
  const score = Number.isFinite(state.score) ? `${fix1(state.score)}/100` : 'score unknown';
  const when = utcFull(state.generated_at);
  return `AI activity is at SIREN ${state.level}: ${name}, on a scale where 1 is loudest (${score}, ${when}). ${NOT_CLAIM}`;
}

/**
 * Ready-to-post promote kit for one or all channels.
 * Channels: moltbook | x | discord | slack | readme | assistant | all
 */
export function formatPromote(state, siteUrl = DEFAULT_BASE, channel = 'all') {
  if (!state || !Number.isFinite(state.level) || !Number.isFinite(state.score)) {
    throw new Error('formatPromote: state.level and state.score are required');
  }
  const base = stripTrailingSlashes(siteUrl);
  const cite = formatCitation(state, base);
  const spoken = formatSpoken(state);
  const hm = utcHm(state.generated_at);
  const full = utcFull(state.generated_at);
  const name = state.level_name || levelName(state.level);
  const score = fix1(state.score);
  const host = base.replace(/^https?:\/\//, '');
  const scale = 'Levels run from 5 (quietest) to 1 (loudest).';
  const posts = {
    citation: cite,
    spoken,
    moltbook:
      `SIREN ${state.level}: ${name} (${score}/100 at ${hm}). ${scale} ${NOT_CLAIM} Source: ${base}/ · skill: ${base}/skill.md`,
    x:
      `SIREN ${state.level} · ${name} · ${score}/100 · ${hm}\n${scale}\n${NOT_CLAIM}\n${base}/`,
    discord:
      `**SIREN ${state.level}: ${name}** — ${score}/100 at ${full}.\n${scale} ${NOT_CLAIM}\n<${base}/> · <${base}/api/now.txt>`,
    slack:
      `*SIREN ${state.level}: ${name}* — ${score}/100 at ${full}. ${scale} ${NOT_CLAIM} <${base}|${host}>`,
    readme: `[![SIREN](${base}/badge.svg)](${base}/)`,
    assistant: `Open ${host}/agents.md and follow it. What is the AI activity level on ${host} right now?`,
  };
  const ch = String(channel || 'all').toLowerCase();
  if (ch === 'all') return { ...posts, channel: 'all' };
  if (ch === 'readme_md' || ch === 'readme') return { channel: 'readme', text: posts.readme, ...posts };
  if (ch === 'assistant_prompt' || ch === 'assistant') return { channel: 'assistant', text: posts.assistant, ...posts };
  if (!Object.prototype.hasOwnProperty.call(posts, ch) || ch === 'citation' || ch === 'spoken') {
    throw new Error(`formatPromote: unknown channel "${channel}" (use moltbook|x|discord|slack|readme|assistant|all)`);
  }
  return { channel: ch, text: posts[ch], ...posts };
}

export function levelName(level) {
  return ({ 5: 'DORMANT', 4: 'ROUTINE', 3: 'ELEVATED', 2: 'ACCELERATED', 1: 'UNPRECEDENTED' })[level] || 'UNKNOWN';
}

/** Top N news items by score (ties broken by published_at). */
export function topNews(news, n = 10) {
  const items = news && Array.isArray(news.items) ? news.items : [];
  const limit = clampInt(n, 1, 50, 10);
  return items
    .filter((it) => it && it.title && it.url && Number.isFinite(it.score))
    .slice()
    .sort((a, b) => (b.score - a.score) || ((Date.parse(b.published_at) || 0) - (Date.parse(a.published_at) || 0)))
    .slice(0, limit)
    .map((it) => ({
      title: it.title,
      url: it.url,
      score: it.score,
      source: it.source || null,
      published_at: it.published_at || null,
      pillar: it.pillar || null,
    }));
}

/** Last N history rows (newest last in the published file; we return newest first). */
export function recentHistory(history, n = 24) {
  const rows = Array.isArray(history) ? history : (history && history.observations) || [];
  const limit = clampInt(n, 1, 500, 24);
  return rows.slice(-limit).reverse().map((h) => ({
    t: h.t || h.generated_at || null,
    score: h.score ?? null,
    level: h.level ?? null,
    pillars: h.pillars || null,
  }));
}

/**
 * Verify one receipt's self-hash (canonical JSON, keys sorted, hash field removed).
 * Does not walk the full chain — that needs the whole directory.
 */
export function verifyReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, error: 'receipt must be an object' };
  }
  if (!receipt.hash || typeof receipt.hash !== 'string') {
    return { ok: false, error: 'receipt.hash missing' };
  }
  let expected;
  try {
    expected = hashReceipt(receipt);
  } catch (e) {
    return { ok: false, error: e.message };
  }
  return {
    ok: expected === receipt.hash,
    id: receipt.id ?? null,
    expected,
    actual: receipt.hash,
    score: receipt.score ?? null,
    level: receipt.level ?? null,
    generated_at: receipt.generated_at ?? null,
  };
}

export function hashReceipt(obj) {
  const { hash: _ignored, ...rest } = obj;
  return `sha256:${createHash('sha256').update(canonicalJson(rest), 'utf8').digest('hex')}`;
}

/** Same canonical JSON rules as collector/receipts.mjs. */
export function canonicalJson(value) {
  if (value === null) return 'null';
  const t = typeof value;
  if (t === 'number') {
    if (!Number.isFinite(value)) throw new Error(`canonicalJson: non-finite number (${value})`);
    return Object.is(value, -0) ? '0' : String(value);
  }
  if (t === 'string') return JSON.stringify(value);
  if (t === 'boolean') return value ? 'true' : 'false';
  if (t === 'undefined') throw new Error('canonicalJson: refusing undefined');
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (t === 'object') {
    const keys = Object.keys(value).sort();
    const parts = [];
    for (const k of keys) {
      if (value[k] === undefined) continue;
      parts.push(`${JSON.stringify(k)}:${canonicalJson(value[k])}`);
    }
    return `{${parts.join(',')}}`;
  }
  throw new Error(`canonicalJson: unsupported type ${t}`);
}

function fix1(n) {
  return Number.isFinite(n) ? n.toFixed(1) : '—';
}

function utcHm(iso) {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? `${new Date(ms).toISOString().slice(11, 16)} UTC` : 'time unknown';
}

function utcFull(iso) {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? `${new Date(ms).toISOString().slice(0, 16).replace('T', ' ')} UTC` : 'time unknown';
}

function clampInt(n, min, max, fallback) {
  const v = Number.parseInt(n, 10);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}
