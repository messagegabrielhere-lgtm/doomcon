// Extras: alert feeds, CSV/TXT exports, and five standalone pages.
//
//   const written = await writeExtras(ctx, write, args.out);
//
// Writes (paths relative to the output dir):
//   feed-delta.xml               readings where |score change| >= 3 vs the previous reading
//   feed-pillar.xml              any pillar moving >= 8 points, or going dark / live
//   feed-pillar-<id>.xml         the same, one pillar at a time (5 files)
//   api/history.csv              t, score, level, degraded, rule_fired, one column per pillar
//   api/pillars.csv              the current pillars
//   api/latest.txt               the current reading as one line
//   alerts.html export.html bias.html reference-plan.html changelog.html
//   evidence.html
// feed-level.xml and feed.xml are build.mjs's and are not touched.
//
// Also exported for the homepage: whatMoved(ctx), alternativeSignals(state).

import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as brand from './brand.mjs';
import { esc, num, utc, utcClock, rfc822 } from './templates/_html.mjs';
import {
  DELTA_THRESHOLD, PILLAR_THRESHOLD, PILLAR_IDS, pillarName,
  readings, transitions, readingPath, receiptId, whatMoved, alternativeSignals,
} from './templates/extrasData.mjs';
import {
  alertsPage, exportPage, biasPage, referencePlanPage, changelogPage, evidencePage,
} from './templates/extrasPages.mjs';

export { whatMoved, alternativeSignals };

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const MAX_ITEMS = 50;

/** Pages this module writes, for the sitemap / nav / guide. */
export const EXTRAS_PAGES = [
  { path: '/evidence.html', label: 'Evidence', blurb: 'Newsroom, race, leaders, map, watts — what backs the number.' },
  { path: '/alerts.html', label: 'Alerts', blurb: 'RSS, email, webhook and X alerts for level changes and spikes.' },
  { path: '/export.html', label: 'Export and embed', blurb: 'CSV and JSON downloads, the widget, the badge, the API.' },
  { path: '/changelog.html', label: 'What moved', blurb: 'The last 48 hours, hour by hour.' },
  { path: '/bias.html', label: 'Known biases', blurb: 'What an English, US-centric input set cannot see.' },
  { path: '/reference-plan.html', label: 'Reference plan', blurb: 'How the frozen baseline gets updated.' },
];

/** Feeds this module writes: [{path, title}], for <link rel="alternate"> or the API index. */
export const EXTRAS_FEEDS = [
  { path: '/feed-delta.xml', title: `${brand.NAME}: score moves of ${DELTA_THRESHOLD}+ points` },
  { path: '/feed-pillar.xml', title: `${brand.NAME}: pillar spikes of ${PILLAR_THRESHOLD}+ points` },
  ...PILLAR_IDS.map((id) => ({ path: `/feed-pillar-${id}.xml`, title: `${brand.NAME}: ${pillarName(id)} spikes` })),
];

// ---------------------------------------------------------------------------
// RSS
// ---------------------------------------------------------------------------
const arrow = (d) => (d > 0 ? '▲' : '▼');
const fmtD = (d) => `${arrow(d)}${Math.abs(d).toFixed(1)}`;

function rss(ctx, { self, title, description, items }) {
  const body = items.slice(0, MAX_ITEMS).map((it) => `  <item>
    <title>${esc(it.title)}</title>
    <link>${esc(it.link)}</link>
    <guid isPermaLink="false">${esc(it.guid)}</guid>
    <pubDate>${esc(rfc822(it.at))}</pubDate>
    <description>${esc(it.description)}</description>
  </item>`).join('\n');
  const last = ctx.state && ctx.state.generated_at ? rfc822(ctx.state.generated_at) : new Date().toUTCString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${esc(title)}</title>
  <link>${esc(ctx.url('/alerts.html'))}</link>
  <atom:link href="${esc(ctx.url(self))}" rel="self" type="application/rss+xml"/>
  <description>${esc(description)}</description>
  <language>en</language>
  <lastBuildDate>${esc(last)}</lastBuildDate>
  <ttl>60</ttl>
${body}
</channel>
</rss>
`;
}

function deltaItems(ctx, trs) {
  return trs.filter((t) => Math.abs(t.score_delta) >= DELTA_THRESHOLD).map((t) => ({
    at: t.at,
    title: `${brand.NAME}: score ${fmtD(t.score_delta)} to ${num(t.cur.score, 1)} (${utcClock(t.at)} UTC)`,
    link: ctx.url(readingPath(ctx, t.at)),
    guid: `${brand.NAME.toLowerCase()}:delta:${receiptId(t.at)}`,
    description: `Composite score ${num(t.prev.score, 1)} → ${num(t.cur.score, 1)} at ${utc(t.at)}; ${brand.NAME} ${t.cur.level}`
      + `${t.level_change ? ` (level changed from ${t.level_change.from})` : ''}.`
      + `${t.pillars.filter((p) => p.kind === 'move' && Math.abs(p.delta) >= 1).map((p) => ` ${p.name} ${fmtD(p.delta)}.`).join('')}`
      + `${t.pillars.filter((p) => p.kind !== 'move').map((p) => ` ${p.name} ${p.kind === 'dark' ? 'went dark' : 'back live'}.`).join('')}`
      + ` ${brand.DISCLAIMER_SHORT}`,
  }));
}

function pillarItem(ctx, t, p) {
  const when = `(${utcClock(t.at)} UTC)`;
  const title = p.kind === 'move'
    ? `${brand.NAME}: ${p.name} ${fmtD(p.delta)} to ${num(p.to, 1)} ${when}`
    : p.kind === 'dark'
      ? `${brand.NAME}: ${p.name} went dark ${when}`
      : `${brand.NAME}: ${p.name} back live at ${num(p.to, 1)} ${when}`;
  const what = p.kind === 'move'
    ? `${p.name} ${num(p.from, 1)} → ${num(p.to, 1)}`
    : p.kind === 'dark'
      ? `${p.name} has no usable reading (last ${num(p.from, 1)}); the composite is degraded until it returns`
      : `${p.name} is reporting again at ${num(p.to, 1)}`;
  return {
    at: t.at,
    title,
    link: ctx.url(readingPath(ctx, t.at)),
    guid: `${brand.NAME.toLowerCase()}:pillar:${p.id}:${receiptId(t.at)}`,
    description: `${what} at ${utc(t.at)}. Composite ${num(t.cur.score, 1)}, ${brand.NAME} ${t.cur.level}. ${brand.DISCLAIMER_SHORT}`,
  };
}

function pillarItems(ctx, trs, only = null) {
  const out = [];
  for (const t of trs) {
    for (const p of t.pillars) {
      if (only && p.id !== only) continue;
      if (p.kind === 'move' && Math.abs(p.delta) < PILLAR_THRESHOLD) continue;
      out.push(pillarItem(ctx, t, p));
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// CSV / TXT
// ---------------------------------------------------------------------------
function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'number' ? String(Math.round(v * 1e6) / 1e6) : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const csvRow = (cells) => cells.map(csvCell).join(',');

export function historyCsv(ctx) {
  const head = ['t', 'score', 'level', 'degraded', 'rule_fired', ...PILLAR_IDS];
  const rows = readings(ctx).map((r) => csvRow([
    r.generated_at, r.score, r.level, r.degraded === true, r.rule_fired ?? '',
    ...PILLAR_IDS.map((id) => (r.pillars && isNum(r.pillars[id]) ? r.pillars[id] : null)),
  ]));
  return `${[head.join(','), ...rows].join('\n')}\n`;
}

export function pillarsCsv(ctx) {
  const s = ctx.state || {};
  const head = ['generated_at', 'id', 'name', 'score', 'percentile', 'sources_ok', 'sources_total', 'dark', 'uncalibrated'];
  const rows = (Array.isArray(s.pillars) ? s.pillars : []).map((p) => csvRow([
    s.generated_at, p.id, p.name, isNum(p.score) ? p.score : null, isNum(p.percentile) ? p.percentile : null,
    p.sources_ok, p.sources_total, p.dark === true, p.uncalibrated === true,
  ]));
  return `${[head.join(','), ...rows].join('\n')}\n`;
}

export function latestTxt(ctx) {
  const s = ctx.state || {};
  if (!isNum(s.score)) return `${brand.NAME}: no reading yet · ${ctx.url('/')}\n`;
  const d = isNum(s.delta_from_previous) ? ` (${s.delta_from_previous >= 0 ? '+' : '-'}${Math.abs(s.delta_from_previous).toFixed(1)})` : '';
  const dark = Array.isArray(s.dark_pillars) && s.dark_pillars.length ? ` · degraded: ${s.dark_pillars.map(pillarName).join(', ')} dark` : '';
  const stamp = s.generated_at ? ` · ${utc(s.generated_at).slice(0, 16)} UTC` : '';
  return `${brand.NAME} ${s.level} ${s.level_name || ''} · score ${num(s.score, 1)}${d}${stamp}${dark} · ${ctx.url('/')}\n`.replace(/ {2,}/g, ' ');
}

// ---------------------------------------------------------------------------
// Reference facts for /reference-plan.html
// ---------------------------------------------------------------------------
function referenceFacts(ctx, dataDir) {
  const file = path.join(dataDir, 'reference.json');
  let ref = null;
  let text = null;
  if (existsSync(file)) {
    try { text = readFileSync(file, 'utf8'); ref = JSON.parse(text); } catch { ref = null; }
  }
  // Prefer the hash the engine stamps on receipts: it is the one a verifier checks.
  const receipts = Array.isArray(ctx.receipts) ? ctx.receipts : [];
  const last = receipts.length ? receipts[receipts.length - 1] : null;
  const hash = (last && last.reference && last.reference.hash)
    || (text ? `sha256:${createHash('sha256').update(text).digest('hex')}` : null);
  if (!ref && !hash) return null;
  const w = ref && ref.reference_window;
  return {
    built_at: (ref && ref.built_at) || (last && last.reference && last.reference.built_at) || null,
    window: w && w.from && w.to ? `${w.from} to ${w.to}` : null,
    window_days: ref && ref.reference_window_days ? ref.reference_window_days : null,
    sources: ref && ref.sources && typeof ref.sources === 'object' ? Object.keys(ref.sources) : null,
    hash,
  };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
/**
 * @param ctx     build.mjs's ctx (state, history, news, moves, receipts, href, url, ...)
 * @param write   build.mjs's write(outDir, rel, body) -> absolute path
 * @param outDir  args.out
 * @param opts    { dataDir } defaults to <repo>/data (only reference.json is read)
 * @returns       array of written paths, in the order written
 */
export async function writeExtras(ctx, write, outDir, opts = {}) {
  const dataDir = opts.dataDir || path.join(ROOT, 'data');
  const written = [];
  const trs = transitions(ctx); // newest first

  written.push(await write(outDir, 'feed-delta.xml', rss(ctx, {
    self: '/feed-delta.xml',
    title: `${brand.NAME}: score moves of ${DELTA_THRESHOLD}+ points`,
    description: `Every ${brand.NAME} reading where the composite moved ${DELTA_THRESHOLD} points or more since the previous reading. ${brand.DISCLAIMER}`,
    items: deltaItems(ctx, trs),
  })));
  written.push(await write(outDir, 'feed-pillar.xml', rss(ctx, {
    self: '/feed-pillar.xml',
    title: `${brand.NAME}: pillar spikes of ${PILLAR_THRESHOLD}+ points`,
    description: `Any ${brand.NAME} pillar moving ${PILLAR_THRESHOLD}+ points between consecutive readings, or going dark or coming back live. ${brand.DISCLAIMER}`,
    items: pillarItems(ctx, trs),
  })));
  for (const id of PILLAR_IDS) {
    written.push(await write(outDir, `feed-pillar-${id}.xml`, rss(ctx, {
      self: `/feed-pillar-${id}.xml`,
      title: `${brand.NAME}: ${pillarName(id)} spikes`,
      description: `${pillarName(id)} moving ${PILLAR_THRESHOLD}+ points between consecutive ${brand.NAME} readings, or going dark or coming back live. ${brand.DISCLAIMER}`,
      items: pillarItems(ctx, trs, id),
    })));
  }

  written.push(await write(outDir, 'api/history.csv', historyCsv(ctx)));
  written.push(await write(outDir, 'api/pillars.csv', pillarsCsv(ctx)));
  written.push(await write(outDir, 'api/latest.txt', latestTxt(ctx)));

  written.push(await write(outDir, 'evidence.html', evidencePage(ctx)));
  written.push(await write(outDir, 'alerts.html', alertsPage(ctx)));
  written.push(await write(outDir, 'export.html', exportPage(ctx)));
  written.push(await write(outDir, 'bias.html', biasPage(ctx)));
  written.push(await write(outDir, 'reference-plan.html', referencePlanPage(ctx, referenceFacts(ctx, dataDir))));
  written.push(await write(outDir, 'changelog.html', changelogPage(ctx)));
  return written;
}
