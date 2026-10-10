#!/usr/bin/env node
// Build the X engage slate for the human managing account.
//
// WHY THIS EXISTS. docs/POSTING.md §6 and the binding X use-case text forbid the
// automated @SIRENutf6 account from liking, following, reposting or quote-posting.
// Self-serve X apps also lost like / follow / quote endpoints on 2026-04-20.
// So the only legal sync path is a human console: take the X posts siren.watch
// already surfaces (oEmbed X wire + newsroom items that ARE x.com status URLs),
// rank them, and hand the operator intent links to like / repost by hand.
//
//   node collector/x-engage.mjs                 # write data/x-engage.json
//   node collector/x-engage.mjs --selftest      # no network
//
// NEVER scores the index. NEVER posts. NEVER likes. NEVER scrapes x.com.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { parseStatusUrl } from './news-sources/_xai.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMA = 1;
export const MAX_ITEMS = 24;
export const OUT_REL = 'data/x-engage.json';

/** Intent URLs open the X composer for the signed-in human. User-initiated. */
export function likeIntentUrl(statusId) {
  return `https://x.com/intent/like?tweet_id=${encodeURIComponent(String(statusId))}`;
}

export function repostIntentUrl(statusId) {
  return `https://x.com/intent/retweet?tweet_id=${encodeURIComponent(String(statusId))}`;
}

function clip(s, n = 240) {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n - 1).trimEnd()}…`;
}

function stableId(parts) {
  return createHash('sha256').update(parts.join('\0')).digest('hex').slice(0, 16);
}

/**
 * Rank: official lab posts and high-score newsroom X URLs first. Ties break on
 * recency so the sheet stays "what to do now", not a museum.
 */
export function rankScore(row, nowMs = Date.now()) {
  let s = 0;
  if (row.official) s += 40;
  if (row.source === 'news') s += Math.min(30, Number(row.news_score) || 0) * 0.4;
  if (row.source === 'x-surface') s += 12;
  if (row.cited_by && row.cited_by.length) s += Math.min(10, row.cited_by.length * 2);
  const ageH = row.posted_at ? (nowMs - Date.parse(row.posted_at)) / 3_600_000 : 72;
  if (Number.isFinite(ageH) && ageH >= 0) s += Math.max(0, 20 - ageH * (20 / 72));
  return Math.round(s * 10) / 10;
}

function fromXSurface(surface, nowMs) {
  const items = Array.isArray(surface?.items) ? surface.items : [];
  const out = [];
  for (const it of items) {
    const parsed = parseStatusUrl(it.url) || (it.id && it.author_handle
      ? { id: String(it.id), handle: String(it.author_handle), url: `https://x.com/${it.author_handle}/status/${it.id}` }
      : null);
    if (!parsed) continue;
    const row = {
      id: stableId(['x-surface', parsed.id]),
      status_id: parsed.id,
      url: parsed.url,
      handle: parsed.handle.replace(/^@/, ''),
      author_name: it.author_name || parsed.handle,
      text: clip(it.text || ''),
      posted_at: it.posted_at || null,
      official: Boolean(it.official),
      source: 'x-surface',
      why: it.attribution_line || (it.cited_by?.length
        ? `Cited by ${it.cited_by.map((c) => c.label || c.id).filter(Boolean).join(', ')}`
        : 'On the siren.watch X wire'),
      cited_by: Array.isArray(it.cited_by) ? it.cited_by.map((c) => c.label || c.id).filter(Boolean) : [],
      news_score: null,
      site_path: '/live-x.html',
    };
    row.rank = rankScore(row, nowMs);
    row.like_url = likeIntentUrl(row.status_id);
    row.repost_url = repostIntentUrl(row.status_id);
    out.push(row);
  }
  return out;
}

function fromNews(news, nowMs) {
  const items = Array.isArray(news?.items) ? news.items : [];
  const out = [];
  for (const it of items) {
    const parsed = parseStatusUrl(it.url);
    if (!parsed) continue;
    const row = {
      id: stableId(['news', parsed.id]),
      status_id: parsed.id,
      url: parsed.url,
      handle: parsed.handle.replace(/^@/, ''),
      author_name: parsed.handle,
      text: clip(it.title || it.summary || ''),
      posted_at: it.published_at || null,
      official: false,
      source: 'news',
      why: `Newsroom ${it.pillar || 'item'} · score ${Number(it.score || 0).toFixed(1)}`,
      cited_by: [],
      news_score: Number(it.score) || 0,
      site_path: it.id ? `/item/${it.id}.html` : '/news.html',
    };
    row.rank = rankScore(row, nowMs);
    row.like_url = likeIntentUrl(row.status_id);
    row.repost_url = repostIntentUrl(row.status_id);
    out.push(row);
  }
  return out;
}

/** Dedupe by status_id; keep the higher-ranked row, merge why/site hints. */
export function mergeCandidates(rows, { max = MAX_ITEMS, nowMs = Date.now() } = {}) {
  const byId = new Map();
  for (const row of rows) {
    if (!row?.status_id) continue;
    const prev = byId.get(row.status_id);
    if (!prev) {
      byId.set(row.status_id, { ...row, rank: rankScore(row, nowMs) });
      continue;
    }
    const merged = {
      ...prev,
      ...row,
      official: prev.official || row.official,
      cited_by: [...new Set([...(prev.cited_by || []), ...(row.cited_by || [])])],
      text: (row.text && row.text.length >= (prev.text || '').length) ? row.text : prev.text,
      why: prev.rank >= row.rank ? prev.why : row.why,
      site_path: prev.source === 'news' ? prev.site_path : (row.site_path || prev.site_path),
      source: prev.source === 'news' || row.source === 'news'
        ? (prev.rank >= row.rank ? prev.source : row.source)
        : prev.source,
      news_score: Math.max(prev.news_score || 0, row.news_score || 0) || null,
    };
    merged.rank = rankScore(merged, nowMs);
    merged.like_url = likeIntentUrl(merged.status_id);
    merged.repost_url = repostIntentUrl(merged.status_id);
    byId.set(row.status_id, merged);
  }
  return [...byId.values()]
    .sort((a, b) => (b.rank - a.rank) || String(b.posted_at || '').localeCompare(String(a.posted_at || '')))
    .slice(0, max)
    .map((row, i) => ({ ...row, order: i + 1 }));
}

/**
 * @param {{ surface?: object, news?: object, now?: Date|string|number, max?: number }} input
 */
export function buildEngageSlate(input = {}) {
  const nowMs = input.now == null ? Date.now() : new Date(input.now).getTime();
  const generated_at = new Date(nowMs).toISOString();
  const fromSurface = fromXSurface(input.surface, nowMs);
  const fromNewsroom = fromNews(input.news, nowMs);
  const items = mergeCandidates([...fromSurface, ...fromNewsroom], { max: input.max ?? MAX_ITEMS, nowMs });
  return {
    schema: SCHEMA,
    generated_at,
    affects_index: false,
    account: 'human-managing-account',
    bot_account: 'SIRENutf6',
    policy: 'Likes and reposts are user-initiated via X intent URLs. The automated @SIRENutf6 account never likes or reposts (POSTING.md §6, X use-case text).',
    method: 'x-surface-oembed + newsroom-x-status-urls',
    counts: {
      from_x_surface: fromSurface.length,
      from_news: fromNewsroom.length,
      published: items.length,
      cap: input.max ?? MAX_ITEMS,
    },
    items,
  };
}

async function readJson(rel) {
  try {
    return JSON.parse(await readFile(join(ROOT, rel), 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

export async function loadAndBuild(opts = {}) {
  const surface = opts.surface ?? await readJson('data/x-surface.json');
  const news = opts.news ?? await readJson('data/news.json');
  return buildEngageSlate({ surface, news, now: opts.now, max: opts.max });
}

async function writeSlate(slate, outRel = OUT_REL) {
  const path = join(ROOT, outRel);
  await mkdir(dirname(path), { recursive: true });
  const body = `${JSON.stringify(slate, null, 2)}\n`;
  await writeFile(path, body, 'utf8');
  return path;
}

// ---------------------------------------------------------------------------
// Self-test
// ---------------------------------------------------------------------------

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

export function selfTest() {
  const failures = [];
  const check = (name, fn) => {
    try { fn(); } catch (err) { failures.push(`${name}: ${err.message}`); }
  };

  check('intent urls', () => {
    assert(likeIntentUrl('123').includes('tweet_id=123'), 'like');
    assert(repostIntentUrl('123').includes('tweet_id=123'), 'repost');
  });

  check('merge prefers official + news score', () => {
    const now = Date.parse('2026-10-10T03:00:00Z');
    const slate = buildEngageSlate({
      now,
      surface: {
        items: [{
          id: '2102824959827742916',
          url: 'https://x.com/OpenAI/status/2102824959827742916',
          author_handle: 'OpenAI',
          author_name: 'OpenAI',
          official: true,
          text: 'Lab post about a model release that is long enough.',
          posted_at: '2026-10-10T01:00:00Z',
          cited_by: [{ id: 'hn', label: 'Hacker News' }],
          attribution_line: 'as cited by Hacker News',
        }],
      },
      news: {
        items: [{
          id: 'abcd',
          url: 'https://twitter.com/rohanpaul_ai/status/2105786881111896126',
          title: 'A scored X headline in the newsroom',
          score: 70,
          pillar: 'attention',
          published_at: '2026-10-10T02:00:00Z',
        }, {
          id: 'nope',
          url: 'https://www.theverge.com/ai/123',
          title: 'Not an X URL',
          score: 99,
        }],
      },
    });
    assert(slate.affects_index === false, 'never scores');
    assert(slate.items.length === 2, `expected 2 got ${slate.items.length}`);
    assert(slate.items[0].status_id === '2102824959827742916', 'official first');
    assert(slate.items[0].like_url.includes('2102824959827742916'), 'like intent');
    assert(slate.items[1].source === 'news', 'news second');
    assert(slate.items[1].site_path.includes('/item/'), 'item path');
    assert(slate.account === 'human-managing-account', 'human only');
  });

  check('dedupe keeps one status', () => {
    const slate = buildEngageSlate({
      now: '2026-10-10T03:00:00Z',
      surface: {
        items: [{
          id: '2102824959827742999',
          url: 'https://x.com/AnthropicAI/status/2102824959827742999',
          author_handle: 'AnthropicAI',
          official: true,
          text: 'dup a',
          posted_at: '2026-10-10T01:00:00Z',
        }],
      },
      news: {
        items: [{
          id: 'dup',
          url: 'https://x.com/AnthropicAI/status/2102824959827742999',
          title: 'dup b',
          score: 50,
          published_at: '2026-10-10T02:00:00Z',
        }],
      },
    });
    assert(slate.items.length === 1, 'deduped');
    assert(slate.items[0].official === true, 'kept official');
  });

  check('cap', () => {
    const newsItems = Array.from({ length: 40 }, (_, i) => ({
      id: `n${i}`,
      url: `https://x.com/user/status/${2105786881111896000n + BigInt(i)}`,
      title: `Story ${i}`,
      score: 40 - i,
      published_at: '2026-10-10T02:00:00Z',
    }));
    const slate = buildEngageSlate({ news: { items: newsItems }, max: 5, now: '2026-10-10T03:00:00Z' });
    assert(slate.items.length === 5, `capped got ${slate.items.length}`);
    assert(slate.items[0].order === 1 && slate.items[4].order === 5, 'ordered');
  });

  if (failures.length) {
    console.error(`x-engage selftest: ${failures.length} FAILURE(S)\n${failures.map((f) => `  - ${f}`).join('\n')}`);
    return false;
  }
  console.log('x-engage selftest: all checks passed');
  return true;
}

async function main(argv) {
  if (argv.includes('--selftest')) {
    process.exit(selfTest() ? 0 : 1);
  }
  const slate = await loadAndBuild();
  const path = await writeSlate(slate);
  console.log(`x-engage: ${slate.items.length} actions → ${path}`);
  console.log(`  surface ${slate.counts.from_x_surface} · news ${slate.counts.from_news}`);
  console.log('  human managing account only — @SIRENutf6 never likes or reposts');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((err) => {
    console.error(`x-engage.mjs failed: ${err.stack || err.message}`);
    process.exit(1);
  });
}
