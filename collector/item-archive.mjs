// Durable /item/ long-tail for findability.
//
// data/news.json stays a mobile-sized rolling window. Items that fall off that
// window (cap overflow or age) are kept here so site/build.mjs can keep writing
// permanent scored pages and listing them in sitemap.xml — the same archive
// shape that lets pizzint hold ~1k intel URLs. Thin synonym doorways stay refused;
// every archived row was a fully scored NewsItem first.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ARCHIVE_SCHEMA = 1;

/** Hard ceiling so the committed file cannot grow without bound. */
/** Cap on durable scored /item rows kept after they leave the live window.
 *  Raised past DoomBench's ~2k sitemap lead once history can fill it
 *  (FINDABILITY.md / COMPETITIVE-SEO.md). */
export const ARCHIVE_MAX = 3200;

const DEFAULT_PATH = fileURLToPath(new URL('../data/item-archive.json', import.meta.url));

function asItem(row) {
  if (!row || typeof row !== 'object' || typeof row.id !== 'string' || !row.id) return null;
  if (typeof row.title !== 'string' || !row.title.trim()) return null;
  if (typeof row.url !== 'string' || !row.url.trim()) return null;
  return row;
}

/** Newest published_at first; id breaks ties (stable, score-independent). */
export function sortArchiveItems(items) {
  return items.slice().sort((a, b) =>
    Date.parse(b.published_at || 0) - Date.parse(a.published_at || 0) ||
    String(a.id).localeCompare(String(b.id)));
}

/**
 * Merge overflow + departed scored items into the archive.
 * Live window ids are never stored here (build reads those from news.json).
 */
export function mergeArchive(previous, { overflow = [], departed = [], liveIds = [], max = ARCHIVE_MAX, updatedAt } = {}) {
  const live = new Set(
    (Array.isArray(liveIds) ? liveIds : [])
      .filter((id) => typeof id === 'string' && id),
  );
  const byId = new Map();

  const ingest = (row) => {
    const item = asItem(row);
    if (!item || live.has(item.id)) return;
    const prev = byId.get(item.id);
    if (!prev) {
      byId.set(item.id, item);
      return;
    }
    // Prefer the row with the newer first_seen / generated stamp when both exist.
    const prevSeen = Date.parse(prev.meta?.first_seen_at || prev.published_at || 0);
    const nextSeen = Date.parse(item.meta?.first_seen_at || item.published_at || 0);
    if (nextSeen >= prevSeen) byId.set(item.id, item);
  };

  for (const row of (previous && Array.isArray(previous.items)) ? previous.items : []) ingest(row);
  for (const row of overflow) ingest(row);
  for (const row of departed) ingest(row);

  const items = sortArchiveItems([...byId.values()]).slice(0, max);
  return {
    schema: ARCHIVE_SCHEMA,
    updated_at: updatedAt || previous?.updated_at || new Date(0).toISOString(),
    max_items: max,
    items,
  };
}

export async function loadArchive(filePath = DEFAULT_PATH) {
  try {
    const raw = JSON.parse(await readFile(filePath, 'utf8'));
    if (!raw || !Array.isArray(raw.items)) {
      return { schema: ARCHIVE_SCHEMA, updated_at: null, max_items: ARCHIVE_MAX, items: [] };
    }
    const items = sortArchiveItems(raw.items.map(asItem).filter(Boolean));
    return {
      schema: ARCHIVE_SCHEMA,
      updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : null,
      max_items: Number.isFinite(raw.max_items) ? raw.max_items : ARCHIVE_MAX,
      items,
    };
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      return { schema: ARCHIVE_SCHEMA, updated_at: null, max_items: ARCHIVE_MAX, items: [] };
    }
    throw err;
  }
}

export async function saveArchive(archive, filePath = DEFAULT_PATH) {
  const dir = path.dirname(filePath);
  await mkdir(dir, { recursive: true });
  const body = `${JSON.stringify(archive, null, 2)}\n`;
  await writeFile(filePath, body, 'utf8');
  return archive;
}

/**
 * Load → merge overflow/departed → save. Returns the written archive.
 */
export async function updateArchive(opts = {}) {
  const filePath = opts.path || DEFAULT_PATH;
  const previous = await loadArchive(filePath);
  const next = mergeArchive(previous, {
    overflow: opts.overflow,
    departed: opts.departed,
    liveIds: opts.liveIds,
    max: opts.max ?? ARCHIVE_MAX,
    updatedAt: opts.updatedAt || new Date().toISOString(),
  });
  await saveArchive(next, filePath);
  return next;
}

/** Items in the archive that are not in the live newsroom window. */
export function archiveOnlyItems(archive, liveItems) {
  const live = new Set((liveItems || []).map((it) => it && it.id).filter(Boolean));
  const items = (archive && Array.isArray(archive.items)) ? archive.items : [];
  return items.filter((it) => it && it.id && !live.has(it.id));
}
