#!/usr/bin/env node
// Daily competitive SEO scoreboard for siren.watch.
//
// Re-fetches our live findability surfaces and the rivals named in
// docs/COMPETITIVE-SEO.md, then prints a scoreboard + gap list the daily
// SEO agent (and operators) can act on. Mechanics only — no doom claims
// (VOICE.md, CONTRACT.md).
//
//   node collector/tools/seo-daily.mjs              # live measure → stdout
//   node collector/tools/seo-daily.mjs --json        # machine-readable report
//   node collector/tools/seo-daily.mjs --write       # also data/seo-scoreboard.json
//   node collector/tools/seo-daily.mjs --selftest    # offline parser checks
//
// Network: every request goes through collector/fetch.mjs (CONTRACT.md).

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { fetchAll } from '../fetch.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'data', 'seo-scoreboard.json');

/** Rivals + us. Origins only; paths are appended below. */
export const SITES = Object.freeze([
  { id: 'siren', name: 'siren.watch', origin: 'https://siren.watch', ours: true },
  { id: 'pizzint', name: 'pizzint.watch', origin: 'https://www.pizzint.watch' },
  { id: 'doombench', name: 'DoomBench', origin: 'https://doombench.com' },
  { id: 'skynet', name: 'Skynet Countdown', origin: 'https://skynetcountdown.com' },
  { id: 'pdoom', name: 'pdoom.ai', origin: 'https://pdoom.ai' },
  { id: 'takeoff', name: 'takeofftracker', origin: 'https://takeofftracker.com' },
]);

/** Our agent / findability surfaces that must keep answering 200. */
export const OUR_SURFACES = Object.freeze([
  '/robots.txt',
  '/sitemap.xml',
  '/news-sitemap.xml',
  '/llms.txt',
  '/agents.md',
  '/agents.txt',
  '/openapi.json',
  '/.well-known/api-catalog',
  '/compare.html',
  '/alternatives.html',
  // Conquest + entity hubs shipped in-repo; flag until gh-pages deploy catches up.
  '/vs.html',
  '/tags.html',
  '/companies.html',
]);

/** Count <loc> entries in a sitemap or sitemapindex body. */
export function countLocs(xml) {
  const m = String(xml || '').match(/<loc>\s*[^<\s]+?\s*<\/loc>/gi);
  return m ? m.length : 0;
}

/** True when the document is a sitemap index (child sitemaps), not a urlset. */
export function isSitemapIndex(xml) {
  return /<sitemapindex[\s>]/i.test(String(xml || ''));
}

const TITLE_ENTITIES = Object.freeze({
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
});

/**
 * Decode one layer of common HTML entities in a title string.
 * Single-pass (no chained &amp; → & → new entity) so CodeQL's
 * double-unescape check stays quiet and rival titles stay readable.
 */
export function decodeTitleEntities(text) {
  return String(text || '').replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (raw, name) => {
    if (name[0] === '#') {
      const n = name[1] === 'x' || name[1] === 'X'
        ? Number.parseInt(name.slice(2), 16)
        : Number.parseInt(name.slice(1), 10);
      if (Number.isFinite(n) && n > 0 && n < 0x110000) return String.fromCodePoint(n);
      return raw;
    }
    const key = name.toLowerCase();
    return Object.prototype.hasOwnProperty.call(TITLE_ENTITIES, key) ? TITLE_ENTITIES[key] : raw;
  });
}

/** First <title> text, collapsed whitespace + common entities. Empty when missing. */
export function extractTitle(html) {
  const m = String(html || '').match(/<title[^>]*>([^<]*)<\/title>/i);
  if (!m) return '';
  return decodeTitleEntities(m[1].replace(/\s+/g, ' ').trim());
}

/** Unique @type values from application/ld+json blocks (string or array). */
export function extractSchemaTypes(html) {
  const types = new Set();
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const m of String(html || '').matchAll(re)) {
    try {
      const data = JSON.parse(m[1].trim());
      const stack = Array.isArray(data) ? data.slice() : [data];
      while (stack.length) {
        const node = stack.pop();
        if (!node || typeof node !== 'object') continue;
        if (node['@graph']) stack.push(...[].concat(node['@graph']));
        const t = node['@type'];
        if (typeof t === 'string') types.add(t);
        else if (Array.isArray(t)) for (const x of t) if (typeof x === 'string') types.add(x);
      }
    } catch {
      /* rival pages often ship broken JSON-LD; skip */
    }
  }
  return [...types].sort();
}

/** True when meta robots / googlebot includes noindex. */
export function hasNoindex(html) {
  return /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(String(html || ''))
    || /<meta[^>]+content=["'][^"']*noindex[^"']*["'][^>]+name=["']robots["']/i.test(String(html || ''));
}

/**
 * Estimate sitemap URLs this tree can publish once collect.yml rebuilds
 * gh-pages: live news items + durable archive + a conservative facet floor.
 * Pure filesystem peek — no network.
 */
export async function readLocalReadyUrls(root = ROOT) {
  try {
    const news = JSON.parse(await readFile(path.join(root, 'data/news.json'), 'utf8'));
    const arch = JSON.parse(await readFile(path.join(root, 'data/item-archive.json'), 'utf8'));
    const live = Array.isArray(news.items) ? news.items.length : 0;
    const archived = Array.isArray(arch.items) ? arch.items.length : 0;
    if (!live && !archived) return null;
    // Facets/moves/head pages currently land ~400–500 beside the item long-tail
    // (outlet archive gate alone adds ~60–70 publisher hubs).
    const facetFloor = 420;
    return {
      live,
      archived,
      estimated_sitemap: live + archived + facetFloor,
    };
  } catch {
    return null;
  }
}

/**
 * Build a gap list from one measured scoreboard.
 * Pure: no network. Kept exportable for --selftest and the daily agent prompt.
 */
export function deriveGaps(report) {
  const gaps = [];
  const ours = report.sites?.find((s) => s.ours);
  if (!ours) {
    gaps.push({ id: 'missing-us', severity: 'high', text: 'siren.watch row missing from scoreboard' });
    return gaps;
  }

  if (!ours.ok) {
    gaps.push({ id: 'us-down', severity: 'high', text: `siren.watch home failed: ${ours.error || 'unknown'}` });
  }

  const local = report.local_ready;
  const localEst = local && Number.isFinite(local.estimated_sitemap) ? local.estimated_sitemap : null;
  const deployPending = Boolean(
    localEst
    && ours.sitemap_urls != null
    && localEst >= 2000
    && ours.sitemap_urls < localEst * 0.5,
  );

  if (deployPending) {
    gaps.push({
      id: 'deploy-pending-url-lead',
      severity: 'high',
      text: `Repo is ready for ~${localEst} sitemap URLs (live ${local.live} + archive ${local.archived}) but live siren.watch still shows ${ours.sitemap_urls} — merge/deploy so gh-pages rebuilds (collect.yml)`,
    });
  } else if (ours.sitemap_urls != null && ours.sitemap_urls < 500) {
    gaps.push({
      id: 'url-count-low',
      severity: 'medium',
      text: `Our sitemap has ${ours.sitemap_urls} URLs — rivals above ~1k win on entity/faceted volume (COMPETITIVE-SEO.md)`,
    });
  }

  if (ours.news_sitemap_urls === 0) {
    gaps.push({
      id: 'news-sitemap-empty',
      severity: 'high',
      text: 'Our news-sitemap.xml has zero <loc> — Google News channel is dead this run',
    });
  }

  for (const s of report.sites || []) {
    if (s.ours || !s.ok) continue;
    // When the tree already has a deployable lead, do not nag "grow facets" —
    // the daily pass should merge/deploy first (deploy-pending-url-lead).
    if (!deployPending
      && s.sitemap_urls != null
      && ours.sitemap_urls != null
      && s.sitemap_urls > ours.sitemap_urls * 1.5) {
      gaps.push({
        id: `trail-${s.id}-urls`,
        severity: 'medium',
        text: `${s.name} sitemap ${s.sitemap_urls} URLs vs our ${ours.sitemap_urls} — grow gated facets/items, not doorway synonyms`,
      });
    }
    if (s.id === 'pizzint' && s.news_sitemap_urls > 0) {
      gaps.push({
        id: 'pizzint-news-alive',
        severity: 'medium',
        text: `pizzint news-sitemap has ${s.news_sitemap_urls} URLs again — Google News is contested; keep our rolling news-sitemap full and keyword-rich`,
      });
    }
  }

  for (const surf of report.surfaces || []) {
    if (!surf.ok) {
      gaps.push({
        id: `surface-${surf.path}`,
        severity: 'high',
        text: `Findability surface ${surf.path} failed (${surf.status ?? surf.error ?? 'err'})`,
      });
    }
  }

  if (ours.title && !/AI activity|SIREN/i.test(ours.title)) {
    gaps.push({
      id: 'title-head-term',
      severity: 'low',
      text: `Homepage title may have drifted off head-term discipline: "${ours.title.slice(0, 80)}"`,
    });
  }

  // Open engineering items from FINDABILITY.md that the daily pass can still ship.
  const open = report.open_engineering || [];
  for (const item of open) {
    gaps.push({ id: `open-${item.id}`, severity: item.severity || 'low', text: item.text });
  }

  return gaps;
}

/** Static open items the daily agent should keep in view until closed in FINDABILITY. */
export const OPEN_ENGINEERING = Object.freeze([
  {
    id: 'gsc-verify',
    severity: 'medium',
    text: 'Operator: Search Console verify + submit both sitemaps (FINDABILITY #11)',
  },
]);

function sitePaths(origin) {
  const base = origin.replace(/\/$/, '');
  return {
    home: `${base}/`,
    sitemap: `${base}/sitemap.xml`,
    news: `${base}/news-sitemap.xml`,
    robots: `${base}/robots.txt`,
    llms: `${base}/llms.txt`,
  };
}

/**
 * Measure one site. Uses pre-fetched envelope map keyed by URL.
 * @param {{ id: string, name: string, origin: string, ours?: boolean }} site
 * @param {Map<string, { ok: boolean, value?: string, status?: number, error?: Error }>} byUrl
 */
export function measureSite(site, byUrl) {
  const paths = sitePaths(site.origin);
  const home = byUrl.get(paths.home);
  const sm = byUrl.get(paths.sitemap);
  const news = byUrl.get(paths.news);
  const robots = byUrl.get(paths.robots);
  const llms = byUrl.get(paths.llms);

  const row = {
    id: site.id,
    name: site.name,
    origin: site.origin,
    ours: Boolean(site.ours),
    ok: Boolean(home?.ok),
    title: home?.ok ? extractTitle(home.value) : '',
    schema_types: home?.ok ? extractSchemaTypes(home.value) : [],
    noindex: home?.ok ? hasNoindex(home.value) : null,
    sitemap_urls: null,
    sitemap_is_index: null,
    news_sitemap_urls: null,
    robots_ok: Boolean(robots?.ok),
    llms_ok: Boolean(llms?.ok),
    error: home?.ok ? undefined : (home?.error?.message || home?.error || 'home fetch failed'),
  };

  if (sm?.ok) {
    row.sitemap_urls = countLocs(sm.value);
    row.sitemap_is_index = isSitemapIndex(sm.value);
  } else if (sm) {
    row.sitemap_error = sm.error?.message || `HTTP ${sm.status}`;
  }

  if (news?.ok) {
    row.news_sitemap_urls = countLocs(news.value);
  } else if (news) {
    // Missing news sitemap is normal for most rivals; record null, not error noise.
    row.news_sitemap_urls = news.status === 404 ? 0 : null;
  }

  return row;
}

/** Run the live competitive measure. */
export async function runScoreboard({ fetchBatch = fetchAll } = {}) {
  const measured_at = new Date().toISOString();
  const jobs = [];

  for (const site of SITES) {
    const p = sitePaths(site.origin);
    for (const url of [p.home, p.sitemap, p.news, p.robots, p.llms]) {
      jobs.push({ key: url, url, parse: 'text', timeoutMs: 12_000, retries: 1 });
    }
  }

  const origin = 'https://siren.watch';
  for (const rel of OUR_SURFACES) {
    const url = `${origin}${rel}`;
    if (!jobs.some((j) => j.url === url)) {
      jobs.push({ key: url, url, parse: 'text', timeoutMs: 12_000, retries: 1 });
    }
  }

  const results = await fetchBatch(jobs, { concurrency: 4 });
  const byUrl = new Map(results.map((r) => [r.url, r]));

  const sites = SITES.map((s) => measureSite(s, byUrl));
  const surfaces = OUR_SURFACES.map((rel) => {
    const url = `${origin}${rel}`;
    const r = byUrl.get(url);
    return {
      path: rel,
      ok: Boolean(r?.ok),
      status: r?.status ?? null,
      error: r?.ok ? undefined : (r?.error?.message || undefined),
      bytes: r?.ok ? String(r.value).length : 0,
    };
  });

  const local_ready = await readLocalReadyUrls(ROOT);
  const report = {
    measured_at,
    host: 'siren.watch',
    sites,
    surfaces,
    local_ready,
    open_engineering: OPEN_ENGINEERING.map((x) => ({ ...x })),
  };
  report.gaps = deriveGaps(report);
  return report;
}

export function formatMarkdown(report) {
  const lines = [];
  lines.push(`# SEO scoreboard — ${report.measured_at}`);
  lines.push('');
  lines.push('| Site | Sitemap URLs | News sitemap | Home title (trunc) | Schema types | llms.txt |');
  lines.push('|---|---:|---:|---|---|---|');
  for (const s of report.sites || []) {
    const title = (s.title || (s.ok ? '(no title)' : `ERR: ${s.error || '?'}`)).slice(0, 56);
    const schema = (s.schema_types || []).slice(0, 4).join(', ') || '—';
    const sm = s.sitemap_urls == null ? '—' : String(s.sitemap_urls) + (s.sitemap_is_index ? ' (idx)' : '');
    const news = s.news_sitemap_urls == null ? '—' : String(s.news_sitemap_urls);
    const llms = s.llms_ok ? 'yes' : 'no';
    const name = s.ours ? `**${s.name}**` : s.name;
    lines.push(`| ${name} | ${sm} | ${news} | ${title.replace(/\|/g, '/')} | ${schema} | ${llms} |`);
  }
  lines.push('');
  lines.push('## Findability surfaces (siren.watch)');
  lines.push('');
  for (const surf of report.surfaces || []) {
    lines.push(`- ${surf.ok ? 'OK' : 'FAIL'} \`${surf.path}\`${surf.ok ? ` (${surf.bytes} B)` : ` — ${surf.error || surf.status}`}`);
  }
  if (report.local_ready && Number.isFinite(report.local_ready.estimated_sitemap)) {
    const L = report.local_ready;
    lines.push('');
    lines.push(
      `## Local tree (pre-deploy)\n\n- Ready estimate **~${L.estimated_sitemap}** sitemap URLs `
      + `(live news ${L.live} + item-archive ${L.archived} + ~420 facets)`,
    );
  }
  lines.push('');
  lines.push('## Gaps / next moves');
  lines.push('');
  if (!(report.gaps || []).length) {
    lines.push('- No automated gaps this run. Still scan search trends and ship one gated URL or title fix.');
  } else {
    for (const g of report.gaps) {
      lines.push(`- **${g.severity}** \`${g.id}\`: ${g.text}`);
    }
  }
  lines.push('');
  lines.push('Constraints: `docs/CONTRACT.md`, `docs/VOICE.md`, `docs/FINDABILITY.md`, `docs/COMPETITIVE-SEO.md`.');
  lines.push('Refuse keyword stuffing, thin doorway synonyms, and doom-probability titles.');
  return lines.join('\n');
}

function selftest() {
  const xml = `<?xml version="1.0"?>
<urlset><url><loc>https://siren.watch/a</loc></url>
<url><loc>https://siren.watch/b</loc></url></urlset>`;
  if (countLocs(xml) !== 2) throw new Error('countLocs failed');
  if (!isSitemapIndex('<sitemapindex xmlns="x"><sitemap><loc>https://x/s.xml</loc></sitemap></sitemapindex>')) {
    throw new Error('isSitemapIndex failed');
  }
  if (isSitemapIndex(xml)) throw new Error('urlset misread as index');

  const html = `<html><head><title>  AI activity index today · SIREN  </title>
  <script type="application/ld+json">{"@type":["WebSite","Dataset"],"name":"SIREN"}</script>
  <script type="application/ld+json">{"@graph":[{"@type":"FAQPage"}]}</script>
  </head><body></body></html>`;
  if (extractTitle(html) !== 'AI activity index today · SIREN') throw new Error('title');
  const types = extractSchemaTypes(html);
  if (!types.includes('WebSite') || !types.includes('Dataset') || !types.includes('FAQPage')) {
    throw new Error(`schema types ${types}`);
  }
  if (hasNoindex('<meta name="robots" content="noindex,follow">') !== true) throw new Error('noindex');

  const report = {
    sites: [
      {
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 400, news_sitemap_urls: 0, schema_types: ['WebSite'],
      },
      {
        id: 'doombench', name: 'DoomBench', ours: false, ok: true,
        title: 'Live AI Doom Index', sitemap_urls: 2000, news_sitemap_urls: null, schema_types: ['FAQPage'],
      },
      {
        id: 'pizzint', name: 'pizzint', ours: false, ok: true,
        title: 'x', sitemap_urls: 1000, news_sitemap_urls: 12, schema_types: [],
      },
    ],
    surfaces: [{ path: '/llms.txt', ok: false, error: 'timeout' }],
    open_engineering: [],
  };
  const gaps = deriveGaps(report);
  const ids = new Set(gaps.map((g) => g.id));
  for (const need of ['news-sitemap-empty', 'url-count-low', 'trail-doombench-urls', 'pizzint-news-alive', 'surface-/llms.txt']) {
    if (!ids.has(need)) throw new Error(`missing gap ${need}: ${[...ids]}`);
  }
  const deployGaps = deriveGaps({
    ...report,
    sites: report.sites.map((s) => (s.ours ? { ...s, sitemap_urls: 683, news_sitemap_urls: 100 } : s)),
    local_ready: { live: 800, archived: 5000, estimated_sitemap: 6220 },
    surfaces: [{ path: '/llms.txt', ok: true }],
    open_engineering: [],
  });
  const deployIds = new Set(deployGaps.map((g) => g.id));
  if (!deployIds.has('deploy-pending-url-lead')) throw new Error('deploy-pending gap missing');
  if (deployIds.has('trail-doombench-urls')) throw new Error('trail gap should yield to deploy-pending');

  const md = formatMarkdown({ ...report, measured_at: '2026-10-12T00:00:00.000Z', gaps });
  if (!md.includes('siren.watch') || !md.includes('Gaps')) throw new Error('markdown');

  console.log('seo-daily selftest: ok');
}

async function main(argv = process.argv.slice(2)) {
  if (argv.includes('--selftest')) {
    selftest();
    return;
  }
  const asJson = argv.includes('--json');
  const doWrite = argv.includes('--write');

  console.error('seo-daily: measuring competitors + siren.watch…');
  const report = await runScoreboard();

  if (doWrite) {
    await mkdir(path.dirname(OUT), { recursive: true });
    await writeFile(OUT, `${JSON.stringify(report, null, 2)}\n`);
    console.error(`seo-daily: wrote ${path.relative(ROOT, OUT)}`);
  }

  if (asJson) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(`${formatMarkdown(report)}\n`);
  }

  const highs = (report.gaps || []).filter((g) => g.severity === 'high');
  if (highs.length) {
    console.error(`seo-daily: ${highs.length} high-severity gap(s)`);
    process.exitCode = 2;
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((err) => {
    console.error(`seo-daily: ${err.message || err}`);
    process.exit(1);
  });
}
