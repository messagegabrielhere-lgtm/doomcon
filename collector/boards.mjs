#!/usr/bin/env node
// MODEL BOARDS — public leaderboards, linked back to each source.
//
//   docker run --rm --network host -v "$PWD":/app -w /app node:20-alpine \
//     node collector/boards.mjs
//   docker run --rm -v "$PWD":/app -w /app node:20-alpine \
//     node collector/boards.mjs --selftest
//
// WHY. Ainnect's dashboard centrepiece is model boards (LMArena Elo, OpenRouter
// usage, Hugging Face video downloads). SIREN already ranks labs on prediction
// markets (/race) but did not republish these public boards. This module closes
// that gap without inventing metrics: every row links to the upstream source,
// and a board that fails to parse goes dark rather than shipping a stale guess.
//
// NETWORK: every call through collector/fetch.mjs (CONTRACT.md §1.5).
//
// DETERMINISM: aside from generated_at, output is a pure function of the
// fetched pages/APIs. Arrays are sorted on stable keys.

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchJson, fetchText } from './fetch.mjs';

export const SCHEMA = 1;
export const VERSION = '1.0.0';

const OPENROUTER_RANKINGS = 'https://openrouter.ai/rankings';
const HF_VIDEO = 'https://huggingface.co/api/models?pipeline_tag=text-to-video&sort=downloads&limit=15';
const LMARENA_TEXT = 'https://lmarena.ai/leaderboard/text';

/** Parse "5.68T" / "841B" / "726B" token strings into a numeric hint (tokens). */
export function parseTokenVolume(text) {
  const s = String(text ?? '').trim().replace(/,/g, '');
  const m = /^([\d.]+)\s*([TtBbMmKk])?$/.exec(s);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  const unit = (m[2] || '').toUpperCase();
  const mult = unit === 'T' ? 1e12 : unit === 'B' ? 1e9 : unit === 'M' ? 1e6 : unit === 'K' ? 1e3 : 1;
  return n * mult;
}

/**
 * Flatten HTML to plain text. Drop well-formed tags, then any leftover `<`
 * so nested leftovers cannot re-form markup (CodeQL
 * js/incomplete-multi-character-sanitization).
 */
function stripHtml(html) {
  return String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/</g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract the accessible rankings-summary table from OpenRouter HTML.
 * Returns { caption, rows: [{ rank, name, author, tokens, tokens_raw, change }] }.
 */
export function parseOpenRouterRankingsHtml(html) {
  const start = html.indexOf('rankings-summary');
  if (start < 0) throw new Error('openrouter rankings: rankings-summary not found');
  const slice = html.slice(start, start + 80_000);
  const captionMatch = /<caption[^>]*>([\s\S]*?)<\/caption>/i.exec(slice);
  const caption = captionMatch
    ? stripHtml(captionMatch[1]).trim()
    : 'OpenRouter model rankings';
  const bodyMatch = /<tbody[^>]*>([\s\S]*?)<\/tbody>/i.exec(slice);
  if (!bodyMatch) throw new Error('openrouter rankings: tbody not found');
  const rows = [];
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let tr;
  while ((tr = trRe.exec(bodyMatch[1]))) {
    const cells = [...tr[1].matchAll(/<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)]
      .map((m) => stripHtml(m[1]).replace(/\s+/g, ' ').trim());
    if (cells.length < 4) continue;
    const rank = Number(cells[0]);
    if (!Number.isFinite(rank)) continue;
    rows.push({
      rank,
      name: cells[1],
      author: cells[2],
      tokens_label: cells[3],
      tokens: parseTokenVolume(cells[3]),
      change: cells[4] || null,
      source_url: `https://openrouter.ai/${cells[2]}/${slugifyModel(cells[1])}`,
    });
  }
  if (!rows.length) throw new Error('openrouter rankings: zero rows parsed');
  rows.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
  return { caption, rows };
}

function slugifyModel(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** LMArena JSON-LD ItemList → ordered model names (Elo lives in the SPA). */
export function parseLmarenaJsonLd(html) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  for (const m of blocks) {
    let j;
    try { j = JSON.parse(m[1]); } catch { continue; }
    if (j && j['@type'] === 'ItemList' && Array.isArray(j.itemListElement)) {
      const rows = j.itemListElement
        .filter((it) => it && Number.isFinite(it.position) && it.name)
        .map((it) => ({
          rank: it.position,
          name: String(it.name),
          elo: null, // Elo is rendered client-side; order is the published fact we can verify in HTML
          source_url: LMARENA_TEXT,
        }))
        .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
      if (rows.length) return rows;
    }
  }
  throw new Error('lmarena: ItemList JSON-LD not found');
}

/** Try to attach Elo numbers from nearby HTML spans when present. */
export function attachEloFromHtml(rows, html) {
  // Pattern near Ainnect / live board: body-sm">1507</span>…±
  // We pair by scanning for model name then the next 3–4 digit Elo.
  return rows.map((r) => {
    const needle = r.name;
    const idx = html.indexOf(needle);
    if (idx < 0) return r;
    const window = html.slice(idx, idx + 800);
    const eloMatch = />(\d{3,4})<\/span>\s*<span[^>]*>\s*±/.exec(window)
      || /body-sm[^>]*>\s*(\d{3,4})\s*</.exec(window);
    if (!eloMatch) return r;
    const elo = Number(eloMatch[1]);
    return Number.isFinite(elo) ? { ...r, elo } : r;
  });
}

export function parseHfVideo(models) {
  if (!Array.isArray(models)) throw new Error('hf video: expected array');
  return models.map((m, i) => ({
    rank: i + 1,
    id: m.id || null,
    name: (m.id || '').split('/').pop() || m.id || 'unknown',
    author: (m.id || '').split('/')[0] || null,
    downloads: Number.isFinite(m.downloads) ? m.downloads : null,
    likes: Number.isFinite(m.likes) ? m.likes : null,
    source_url: m.id ? `https://huggingface.co/${m.id}` : 'https://huggingface.co/models?pipeline_tag=text-to-video',
  })).filter((r) => r.id);
}

/**
 * Pure-ish assemble from already-fetched pieces. Used by tests.
 */
export function buildBoardsFromParts({
  openrouter = null,
  openrouterError = null,
  lmarena = null,
  lmarenaError = null,
  hfVideo = null,
  hfVideoError = null,
  asOf = new Date().toISOString(),
} = {}) {
  const board = (id, title, unit, source, sourceUrl, rows, error, note) => ({
    id,
    title,
    unit,
    source,
    source_url: sourceUrl,
    ok: !error && Array.isArray(rows) && rows.length > 0,
    error: error ? String(error.message || error) : null,
    note: note || null,
    rows: Array.isArray(rows) ? rows : [],
  });

  const boards = [
    board(
      'openrouter-usage',
      'Most used on OpenRouter',
      'tokens / day',
      'OpenRouter rankings',
      OPENROUTER_RANKINGS,
      openrouter?.rows,
      openrouterError,
      openrouter?.caption || 'What developers actually run: models ranked by tokens processed.',
    ),
    board(
      'lmarena-text',
      'Frontier models (LMArena text)',
      'rank (Elo when present)',
      'LMArena text arena',
      LMARENA_TEXT,
      lmarena,
      lmarenaError,
      'Blind head-to-head votes. Order from the published ItemList; Elo attached when the HTML carries it.',
    ),
    board(
      'hf-video',
      'Open-weight video models',
      'downloads',
      'Hugging Face',
      'https://huggingface.co/models?pipeline_tag=text-to-video',
      hfVideo,
      hfVideoError,
      'Open-weight text-to-video models ranked by downloads across listed variants.',
    ),
  ];

  return {
    schema: SCHEMA,
    version: VERSION,
    generated_at: asOf,
    rule: {
      statement:
        'Every board is a republish of a public upstream ranking. '
        + 'SIREN does not invent Elo, token volumes or download counts. '
        + 'A board that fails to fetch or parse is dark for this run.',
    },
    boards,
    glance: {
      openrouter_top: boards[0].ok ? boards[0].rows[0] : null,
      lmarena_top: boards[1].ok ? boards[1].rows[0] : null,
      hf_video_top: boards[2].ok ? boards[2].rows[0] : null,
      boards_ok: boards.filter((b) => b.ok).length,
      boards_total: boards.length,
    },
  };
}

export async function collectBoards({
  fetchTextFn = fetchText,
  fetchJsonFn = fetchJson,
  asOf = new Date().toISOString(),
} = {}) {
  let openrouter = null;
  let openrouterError = null;
  try {
    const html = await fetchTextFn(OPENROUTER_RANKINGS, { retries: 1, timeoutMs: 20_000 });
    openrouter = parseOpenRouterRankingsHtml(html);
  } catch (err) {
    openrouterError = err;
  }

  let lmarena = null;
  let lmarenaError = null;
  try {
    const html = await fetchTextFn(LMARENA_TEXT, { retries: 1, timeoutMs: 25_000 });
    lmarena = attachEloFromHtml(parseLmarenaJsonLd(html), html);
  } catch (err) {
    lmarenaError = err;
  }

  let hfVideo = null;
  let hfVideoError = null;
  try {
    const models = await fetchJsonFn(HF_VIDEO, { retries: 1, timeoutMs: 15_000 });
    hfVideo = parseHfVideo(models);
  } catch (err) {
    hfVideoError = err;
  }

  return buildBoardsFromParts({
    openrouter, openrouterError, lmarena, lmarenaError, hfVideo, hfVideoError, asOf,
  });
}

async function main(argv = process.argv.slice(2)) {
  if (argv.includes('--selftest')) {
    runSelftest();
    return;
  }
  const outIdx = argv.indexOf('--out');
  const outPath = outIdx >= 0 ? argv[outIdx + 1] : 'data/boards.json';
  const payload = await collectBoards();
  await writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(
    `boards: ${payload.glance.boards_ok}/${payload.glance.boards_total} live`
    + (payload.glance.openrouter_top ? ` · OpenRouter #1 ${payload.glance.openrouter_top.name}` : '')
    + (payload.glance.lmarena_top ? ` · LMArena #1 ${payload.glance.lmarena_top.name}` : ''),
  );
}

function runSelftest() {
  if (parseTokenVolume('5.68T') !== 5.68e12) throw new Error('T parse');
  if (parseTokenVolume('841B') !== 841e9) throw new Error('B parse');
  const html = `
    <div id="rankings-summary"><caption class="or-table__caption">Models ranked by tokens</caption>
    <tbody class="or-table__body">
      <tr class="or-table__row"><td class="or-table__cell">1</td><th class="or-table__cell">DeepSeek V4.1 Flash</th>
      <td class="or-table__cell">deepseek</td><td class="or-table__cell">5.68T</td><td class="or-table__cell">+13%</td></tr>
      <tr class="or-table__row"><td class="or-table__cell">2</td><th class="or-table__cell">GLM 5.3 Flash</th>
      <td class="or-table__cell">z-ai</td><td class="or-table__cell">1.79T</td><td class="or-table__cell">+12%</td></tr>
    </tbody></div>`;
  const or = parseOpenRouterRankingsHtml(html);
  if (or.rows.length !== 2 || or.rows[0].tokens !== 5.68e12) throw new Error('or parse');
  const ld = `<script type="application/ld+json">{"@type":"ItemList","itemListElement":[{"@type":"ListItem","position":1,"name":"claude-fable-5"},{"@type":"ListItem","position":2,"name":"gemini-3-pro"}]}</script>`;
  const lm = parseLmarenaJsonLd(ld);
  if (lm[0].name !== 'claude-fable-5') throw new Error('lmarena parse');
  const hf = parseHfVideo([{ id: 'Wan-AI/Wan2.2', downloads: 8_860_000, likes: 1 }]);
  if (hf[0].rank !== 1 || hf[0].downloads !== 8_860_000) throw new Error('hf parse');
  const built = buildBoardsFromParts({
    openrouter: or,
    lmarena: lm,
    hfVideo: hf,
    asOf: '2026-10-12T00:00:00.000Z',
  });
  if (built.glance.boards_ok !== 3) throw new Error('expected 3 live boards');
  const dark = buildBoardsFromParts({
    openrouterError: new Error('boom'),
    lmarenaError: new Error('boom'),
    hfVideoError: new Error('boom'),
    asOf: '2026-10-12T00:00:00.000Z',
  });
  if (dark.glance.boards_ok !== 0) throw new Error('expected all dark');
  console.log('boards selftest: ok');
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
