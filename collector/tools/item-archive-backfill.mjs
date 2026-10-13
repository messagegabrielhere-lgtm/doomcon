#!/usr/bin/env node
// Backfill data/item-archive.json from prior committed data/news.json snapshots.
//
// Every row was a fully scored NewsItem we already published. Re-attaching them
// to the durable /item/ long-tail is how we keep sitemap growth honest without
// inventing doorway pages (FINDABILITY.md / COMPETITIVE-SEO.md §4.4).
//
//   node collector/tools/item-archive-backfill.mjs
//   node collector/tools/item-archive-backfill.mjs --max-commits 200

import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  ARCHIVE_MAX,
  loadArchive,
  mergeArchive,
  saveArchive,
} from '../item-archive.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const NEWS_PATH = path.join(ROOT, 'data/news.json');
const ARCHIVE_PATH = path.join(ROOT, 'data/item-archive.json');

function parseArgs(argv) {
  let maxCommits = 400;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--max-commits' && argv[i + 1]) {
      maxCommits = Math.max(1, Number(argv[++i]) || 400);
    }
  }
  return { maxCommits };
}

function gitLines(...args) {
  const out = execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return out.split('\n').map((l) => l.trim()).filter(Boolean);
}

function newsAt(commit) {
  try {
    const raw = execFileSync('git', ['show', `${commit}:data/news.json`], {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function main() {
  const { maxCommits } = parseArgs(process.argv.slice(2));
  const commits = gitLines('log', `--max-count=${maxCommits}`, '--format=%H', '--', 'data/news.json');
  console.log(`item-archive-backfill: scanning ${commits.length} news.json commits (newest first)`);

  const historical = new Map();
  for (const commit of commits) {
    const news = newsAt(commit);
    if (!news || !Array.isArray(news.items)) continue;
    for (const it of news.items) {
      if (!it || typeof it.id !== 'string' || !it.title || !it.url) continue;
      if (!historical.has(it.id)) historical.set(it.id, it);
    }
    // Enough unique ids to fill the archive after live ids are excluded.
    if (historical.size >= ARCHIVE_MAX + 900) break;
  }
  console.log(`item-archive-backfill: ${historical.size} unique scored items in history`);

  return (async () => {
    let liveIds = [];
    try {
      const live = JSON.parse(await readFile(NEWS_PATH, 'utf8'));
      liveIds = (live.items || []).map((it) => it && it.id).filter(Boolean);
    } catch (err) {
      console.error(`item-archive-backfill: could not read live news.json (${err.message})`);
    }

    const previous = await loadArchive(ARCHIVE_PATH);
    const before = previous.items.length;
    const next = mergeArchive(previous, {
      departed: [...historical.values()],
      liveIds,
      max: ARCHIVE_MAX,
      updatedAt: new Date().toISOString(),
    });
    await saveArchive(next, ARCHIVE_PATH);
    console.log(
      `item-archive-backfill: wrote ${ARCHIVE_PATH} — ${before} → ${next.items.length} ` +
      `(cap ${ARCHIVE_MAX}, live window ${liveIds.length})`,
    );
  })();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
