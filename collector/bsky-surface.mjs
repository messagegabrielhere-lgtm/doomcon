#!/usr/bin/env node
// SIREN Bluesky surface — AI posts from a fixed watchlist, keyless AppView.
//
//   docker run --rm --network host -v "$PWD":/app -w /app node:20-alpine \
//     node collector/bsky-surface.mjs
//
// WHY THIS EXISTS. X is the densest AI social wire, but docs/X-STRATEGY.md
// already records that frontier-lab Bluesky handles are parked. Researchers,
// practitioners and a few labs still post there, and the public AppView
// (`public.api.bsky.app`) serves author feeds without a key. This file is the
// Bluesky twin of x-surface.mjs: presentation-only, never scored, never
// invented, and dark-by-name when a handle fails.
//
// Writes data/bsky-surface.json. Affects the index: no.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { fetchJson } from './fetch.mjs';

const SCHEMA_VERSION = 1;
const OUT_URL = new URL('../data/bsky-surface.json', import.meta.url);
const APPVIEW = 'https://public.api.bsky.app/xrpc';

const WINDOW_HOURS = 168; // 7 days — matches the newsroom window
const MAX_ITEMS = 24;
const PER_HANDLE = 12;
const HTTP_TIMEOUT_MS = 20_000;

// Fixed watchlist. Handles that 404 or stay empty are reported dark/dormant
// rather than dropped — the same honesty rule as the news layer. Verified
// 2026-10-09 against public.api.bsky.app (Profile not found → omitted).
const WATCHLIST = Object.freeze([
  { handle: 'simonw.bsky.social', label: 'Simon Willison' },
  { handle: 'karpathy.bsky.social', label: 'Andrej Karpathy' },
  { handle: 'rasbt.bsky.social', label: 'Sebastian Raschka' },
  { handle: 'yann-lecun.bsky.social', label: 'Yann LeCun' },
  { handle: 'garymarcus.bsky.social', label: 'Gary Marcus' },
  { handle: 'emollick.bsky.social', label: 'Ethan Mollick' },
  { handle: 'cfiesler.bsky.social', label: 'Casey Fiesler' },
  { handle: 'milesbrundage.bsky.social', label: 'Miles Brundage' },
  { handle: 'andrewng.bsky.social', label: 'Andrew Ng' },
  { handle: 'markriedl.bsky.social', label: 'Mark Riedl' },
]);

// Narrow topic gate — same discipline as x-surface. A researcher posting about
// dinner is not AI news. Official handles on this list still need an AI token
// in the post text, because Bluesky handles are not citation-gated the way the
// X surface is.
const AI_RE = /\b(?:AI|AGI|LLM|LLMs|GPT|Claude|Gemini|Grok|Llama|Qwen|DeepSeek|OpenAI|Anthropic|DeepMind|Mistral|Hugging\s?Face|neural|transformer|inference|alignment|benchmark|model(?:s)?|agent(?:s)?|superintelligen\w*)\b/i;

function round1(n) {
  return Math.round(n * 10) / 10;
}

function postUrl(handle, uri) {
  // at://did:plc:…/app.bsky.feed.post/<rkey>
  const rkey = String(uri ?? '').split('/').pop();
  if (!rkey) return `https://bsky.app/profile/${encodeURIComponent(handle)}`;
  return `https://bsky.app/profile/${encodeURIComponent(handle)}/post/${encodeURIComponent(rkey)}`;
}

export function isOnTopic(text) {
  return AI_RE.test(String(text ?? ''));
}

export function normalisePost(entry, handle, label, nowMs) {
  const post = entry?.post;
  if (!post || typeof post !== 'object') return null;
  const record = post.record;
  const text = typeof record?.text === 'string' ? record.text.trim() : '';
  if (!text) return null;
  if (!isOnTopic(text)) return null;

  const createdMs = Date.parse(record.createdAt ?? post.indexedAt ?? '');
  if (!Number.isFinite(createdMs)) return null;
  if (createdMs < nowMs - WINDOW_HOURS * 3600_000) return null;

  const uri = typeof post.uri === 'string' ? post.uri : '';
  if (!uri) return null;

  const likes = Number(post.likeCount) || 0;
  const replies = Number(post.replyCount) || 0;
  const reposts = Number(post.repostCount) || 0;
  const ageHours = Math.max(0, (nowMs - createdMs) / 3600_000);
  const engagement = Math.log10(1 + likes + 2 * replies + reposts);
  const recency = Math.max(0, 1 - ageHours / WINDOW_HOURS);
  const score = round1(engagement * 2 + recency * 3);

  return {
    id: uri,
    handle,
    display_name: label,
    text: text.slice(0, 500),
    url: postUrl(handle, uri),
    posted_at: new Date(createdMs).toISOString(),
    likes,
    replies,
    reposts,
    score,
    score_parts: { engagement: round1(engagement), recency: round1(recency), age_hours: round1(ageHours) },
  };
}

export function deriveStatus(sources) {
  if (!Array.isArray(sources) || sources.length === 0) return 'dark';
  if (!sources.some((s) => s.ok)) return 'dark';
  if (!sources.every((s) => s.ok)) return 'degraded';
  return 'live';
}

async function fetchHandle(handle, label, nowMs) {
  const url = `${APPVIEW}/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(handle)}&limit=${PER_HANDLE}`;
  const body = await fetchJson(url, { timeoutMs: HTTP_TIMEOUT_MS });
  const feed = Array.isArray(body?.feed) ? body.feed : [];
  const items = [];
  for (const entry of feed) {
    const n = normalisePost(entry, handle, label, nowMs);
    if (n) items.push(n);
  }
  return { items, raw: feed.length };
}

async function readPrevious() {
  try {
    return JSON.parse(await readFile(OUT_URL, 'utf8'));
  } catch {
    return null;
  }
}

async function main() {
  const generatedAt = new Date().toISOString();
  const nowMs = Date.parse(generatedAt);
  const previous = await readPrevious();
  const sources = [];
  const collected = [];

  const settled = await Promise.allSettled(
    WATCHLIST.map(async (w) => {
      const t0 = Date.now();
      try {
        const { items, raw } = await fetchHandle(w.handle, w.label, nowMs);
        return { ...w, ok: true, items, raw, ms: Date.now() - t0, error: null };
      } catch (err) {
        return {
          ...w,
          ok: false,
          items: [],
          raw: 0,
          ms: Date.now() - t0,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }),
  );

  for (const outcome of settled) {
    const res = outcome.status === 'fulfilled'
      ? outcome.value
      : { handle: '?', label: '?', ok: false, items: [], raw: 0, ms: 0, error: String(outcome.reason) };
    const newest = res.items[0]?.posted_at ?? null;
    const state = !res.ok ? 'dark' : res.items.length === 0 ? 'dormant' : 'live';
    sources.push({
      id: res.handle,
      label: res.label,
      ok: res.ok,
      state,
      count: res.items.length,
      raw_items: res.raw,
      newest_item_at: newest,
      error: res.error,
      ms: res.ms,
    });
    collected.push(...res.items);
  }

  // Prefer fresher / higher-engagement posts; one handle cannot flood the reel.
  collected.sort((a, b) => b.score - a.score || b.posted_at.localeCompare(a.posted_at) || a.id.localeCompare(b.id));
  const perHandle = new Map();
  const items = [];
  for (const it of collected) {
    const n = perHandle.get(it.handle) ?? 0;
    if (n >= 3) continue;
    perHandle.set(it.handle, n + 1);
    items.push(it);
    if (items.length >= MAX_ITEMS) break;
  }

  const status = deriveStatus(sources);
  const out = {
    schema: SCHEMA_VERSION,
    generated_at: generatedAt,
    affects_index: false,
    status,
    window_hours: WINDOW_HOURS,
    max_items: MAX_ITEMS,
    watchlist_version: 1,
    counts: {
      handles: WATCHLIST.length,
      live_handles: sources.filter((s) => s.state === 'live').length,
      dormant_handles: sources.filter((s) => s.state === 'dormant').length,
      dark_handles: sources.filter((s) => s.state === 'dark').length,
      items: items.length,
    },
    sources,
    items,
    previous_generated_at: previous?.generated_at ?? null,
  };

  await mkdir(new URL('.', OUT_URL), { recursive: true });
  await writeFile(OUT_URL, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`bsky-surface: ${status.toUpperCase()}  ${generatedAt}`);
  console.log(`  ${out.counts.live_handles}/${WATCHLIST.length} handles live, ${items.length} posts`);
  for (const s of sources.filter((x) => !x.ok)) console.log(`  dark  ${s.id}: ${s.error}`);
  console.log('  -> data/bsky-surface.json');
  if (status === 'dark') process.exitCode = 1;
}

function selftest() {
  const failures = [];
  const eq = (name, got, want) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) failures.push(`${name}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
    else console.log(`  ok  ${name}`);
  };
  const nowMs = Date.parse('2026-10-09T20:00:00.000Z');
  const entry = {
    post: {
      uri: 'at://did:plc:test/app.bsky.feed.post/abc',
      likeCount: 12,
      replyCount: 3,
      repostCount: 1,
      record: { text: 'New Claude model ships with better agents', createdAt: '2026-10-09T18:00:00.000Z' },
    },
  };
  const n = normalisePost(entry, 'simonw.bsky.social', 'Simon Willison', nowMs);
  eq('keeps on-topic post', !!n && n.handle === 'simonw.bsky.social', true);
  eq('drops dinner posts', normalisePost({
    post: { uri: 'at://did:plc:test/app.bsky.feed.post/x', record: { text: 'Had pasta for dinner', createdAt: '2026-10-09T18:00:00.000Z' } },
  }, 'simonw.bsky.social', 'Simon Willison', nowMs), null);
  eq('status live', deriveStatus([{ ok: true }, { ok: true }]), 'live');
  eq('status degraded', deriveStatus([{ ok: true }, { ok: false }]), 'degraded');
  eq('status dark', deriveStatus([{ ok: false }]), 'dark');
  eq('topic gate', isOnTopic('LLM evals'), true);
  eq('topic gate negative', isOnTopic('weather in Lisbon'), false);

  if (failures.length) {
    console.error(`bsky-surface selftest: ${failures.length} FAILURE(S)`);
    for (const f of failures) console.error(`  FAIL ${f}`);
    process.exitCode = 1;
  } else {
    console.log('bsky-surface selftest: all checks passed');
  }
}

const isEntryPoint =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (!isEntryPoint) {
  // imported for helpers
} else if (process.argv.includes('--selftest')) {
  selftest();
} else {
  main().catch((err) => {
    console.error(`bsky-surface: fatal — ${err?.message ?? err}`);
    process.exitCode = 1;
  });
}
