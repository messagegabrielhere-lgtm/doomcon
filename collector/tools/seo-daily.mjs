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

/**
 * Surfaces that must stay green even while conquest/entity hubs await
 * gh-pages merge (deploy-pending-url-lead). Failures here stay high-severity.
 */
export const CORE_LIVE_SURFACES = Object.freeze([
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
  '/methodology.html',
  '/history.html',
  '/about.html',
  '/news.html',
  '/race.html',
  '/guide.html',
  '/search-trends.html',
  '/ai-prediction-markets.html',
  '/verify.html',
  '/free-tools.html',
  '/now.md',
  '/api/now.txt',
  // FINDABILITY #111/#113/#119 — conquest short aliases must stay 200 even
  // while orphan newsroom publishes race the tip (high-severity if wiped).
  '/vs/doom.html',
  '/vs/skynet.html',
  '/vs/takeoff.html',
]);

/** Our agent / findability surfaces that must keep answering 200. */
export const OUR_SURFACES = Object.freeze([
  ...CORE_LIVE_SURFACES,
  // Live rooms already on gh-pages — monitor regressions after each collect.
  '/privacy.html',
  '/press.html',
  '/terms.html',
  '/disclosures.html',
  '/brand.html',
  '/ai-doomsday-clock.html',
  '/jobs.html',
  '/medicine.html',
  '/world.html',
  '/map.html',
  '/watts.html',
  '/charts.html',
  '/power.html',
  '/digest.html',
  '/status.html',
  '/nations.html',
  '/catalog.html',
  '/library.html',
  '/moves/',
  // Conquest + entity hubs shipped in-repo; flag until gh-pages deploy catches up.
  // Short aliases live in CORE_LIVE_SURFACES (#119); primaries stay here.
  '/vs.html',
  '/vs/doombench.html',
  '/vs/skynet-countdown.html',
  '/vs/pizzint.html',
  '/vs/takeofftracker.html',
  '/guides.html',
  '/guides.md',
  '/companies.html',
  '/models.html',
  '/pillars.html',
  '/sources.html',
  '/lab/',
  // FINDABILITY #123 — head-term alias lab titles (#121/#122).
  '/lab/google-deepmind.html',
  '/lab/openai.html',
  '/lab/anthropic.html',
  '/pillar/',
  '/people/index.html',
  '/outlet/index.html',
  '/kind/index.html',
  '/tags/index.html',
  '/tags.html',
  '/kinds.html',
  '/outlets.html',
  '/people.html',
  '/countries.html',
  '/tags/agents.html',
  '/tags/large-language-models.html',
  '/tags/gpus.html',
  '/tags/china.html',
  '/tags/reinforcement-learning.html',
  '/tags/startups.html',
  '/tags/safety.html',
  '/tags/inference.html',
  '/tags/chatgpt.html',
  '/tags/fine-tuning.html',
  '/tags/robotics.html',
  '/tags/distillation.html',
  '/tags/artificial-intelligence.html',
  '/tags/fundraising.html',
  '/tags/multimodal.html',
  '/tags/evaluation.html',
  '/tags/chips.html',
  '/tags/benchmarks.html',
  '/tags/open-weights.html',
  '/tags/trajectory.html',
  '/tags/finance.html',
  '/tags/financial.html',
  '/tags/visual-language.html',
  '/tags/latent.html',
  '/tags/long-horizon.html',
  '/tags/llm-agents.html',
  '/tags/education.html',
  '/tags/healthcare.html',
  '/tags/world-models.html',
  '/tags/datacenters.html',
  '/tags/retrieval.html',
  '/tags/3d.html',
  '/tags/acquisitions.html',
  '/tags/post-training.html',
  '/tags/multi-agent.html',
  '/tags/coding.html',
  '/tags/on-policy.html',
  '/tags/foundation-models.html',
  '/tags/regulation.html',
  '/tags/gradient.html',
  '/kind/press.html',
  '/kind/paper.html',
  '/kind/forum.html',
  '/kind/lab.html',
  '/kind/release.html',
  '/kind/model.html',
  '/outlet/arxiv-org.html',
  '/outlet/huggingface-co.html',
  '/outlet/techmeme-com.html',
  '/outlet/reddit-com.html',
  '/outlet/theverge-com.html',
  '/outlet/bloomberg-com.html',
  '/outlet/github-com.html',
  '/outlet/techcrunch-com.html',
  '/outlet/theguardian-com.html',
  '/outlet/lesswrong-com.html',
  '/outlet/arstechnica-com.html',
  '/outlet/yahoo-com.html',
  '/outlet/36kr-com.html',
  '/outlet/biggo-com.html',
  '/outlet/reuters-com.html',
  '/outlet/ft-com.html',
  '/outlet/simplywall-st.html',
  '/outlet/wsj-com.html',
  '/outlet/cryptobriefing-com.html',
  '/outlet/the-decoder-com.html',
  '/outlet/wired-com.html',
  '/outlet/nytimes-com.html',
  '/outlet/ad-hoc-news-de.html',
  '/outlet/chosun-com.html',
  '/people/nadella.html',
  '/people/altman.html',
  '/people/musk.html',
  '/people/amodei.html',
  '/people/huang.html',
  '/people/zuckerberg.html',
  '/people/brockman.html',
  '/people/lecun.html',
  '/people/bengio.html',
  '/people/karpathy.html',
  '/people/pichai.html',
  '/people/hassabis.html',
  '/people/sutskever.html',
  '/people/liang.html',
  '/people/suleyman.html',
  '/people/hinton.html',
  '/people/karp.html',
  '/people/murati.html',
  '/people/kavukcuoglu.html',
  '/people/mensch.html',
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

/** True when the HTML-tag Search Console verification meta is present. */
export function hasGscMeta(html) {
  return /<meta[^>]+name=["']google-site-verification["'][^>]+content=["'][A-Za-z0-9_-]{10,120}["']/i.test(
    String(html || ''),
  ) || /<meta[^>]+content=["'][A-Za-z0-9_-]{10,120}["'][^>]+name=["']google-site-verification["']/i.test(
    String(html || ''),
  );
}

/**
 * True when live home ships Bing Webmaster HTML-tag meta (FINDABILITY #120).
 */
export function hasBingMeta(html) {
  return /<meta[^>]+name=["']msvalidate\.01["'][^>]+content=["'][A-Za-z0-9_-]{10,120}["']/i.test(
    String(html || ''),
  ) || /<meta[^>]+content=["'][A-Za-z0-9_-]{10,120}["'][^>]+name=["']msvalidate\.01["']/i.test(
    String(html || ''),
  );
}

/**
 * True when sitemap tip comments advertise free-tools + verify (FINDABILITY #84).
 * Detects collect Publish wipes that drop SEO overlays before main tip catches up.
 */
export function hasSitemapTips(xml) {
  const head = String(xml || '').slice(0, 1200);
  return /Free tools:.*\/free-tools\.html/i.test(head)
    && /Verify(?: a reading)?:.*\/verify\.html/i.test(head)
    && (/Search Trends/i.test(head) || /news-sitemap\.xml/i.test(head) || /llms\.txt/i.test(head));
}

/**
 * True when RSS tip comments advertise free-tools + verify (FINDABILITY #87).
 * Same discovery tip shape as sitemaps; separate name so feed wipes surface as
 * `feed-tips-missing` (FINDABILITY #88) rather than a sitemap false alarm.
 */
export function hasFeedTips(xml) {
  return hasSitemapTips(xml);
}

/**
 * True when robots.txt tip comments advertise free-tools + verify (FINDABILITY #79).
 * Hash-comment tips share the same discovery shape; wipe gap is `robots-tips-missing`
 * (FINDABILITY #89).
 */
export function hasRobotsTips(txt) {
  return hasSitemapTips(txt);
}

/**
 * True when live reading surfaces advertise free-tools + verify + Search Trends
 * (FINDABILITY #90). Tip shape differs from sitemap/robots (`Free tools ·` / markdown
 * links); wipe gap is `now-tips-missing` (FINDABILITY #91).
 */
/**
 * Newest `news:publication_date` as epoch ms, or null when none parse.
 * Used for FINDABILITY #97 stale Google News detection.
 */
export function newestNewsPublicationMs(xml) {
  let newest = null;
  for (const m of String(xml || '').matchAll(/<news:publication_date>\s*([^<\s]+)\s*<\/news:publication_date>/gi)) {
    const t = Date.parse(m[1]);
    if (!Number.isFinite(t)) continue;
    if (newest == null || t > newest) newest = t;
  }
  return newest;
}

/** Hours after which a non-empty news-sitemap is treated as stale (FINDABILITY #97). */
export const NEWS_STALE_HOURS = 6;

/**
 * High-signal lab needles to probe for title↔keywords lag (FINDABILITY #110).
 * Kept short so seo-daily stays cheap; expand only when a live 48h title proves
 * a NEWS_KEYWORD_LABS needle is shipping in HTML titles but missing from
 * news:keywords (CDN/old-tip publishes after #108/#109).
 */
export const NEWS_KEYWORD_PROBE_LABS = Object.freeze([
  'Kodiak AI', 'MediaTek', 'Cathie Wood', 'ServiceNow', 'ChatGPT', 'Claude Code',
]);

/**
 * Entries whose news:title matches a probe lab but news:keywords omit it.
 * Returns up to 8 `{ lab, title }` rows for the daily gap line.
 */
export function newsKeywordLags(xml, labs = NEWS_KEYWORD_PROBE_LABS) {
  const out = [];
  const seen = new Set();
  for (const block of String(xml || '').matchAll(/<url\b[\s\S]*?<\/url>/gi)) {
    const chunk = block[0];
    const titleM = chunk.match(/<news:title>\s*([\s\S]*?)\s*<\/news:title>/i);
    const kwM = chunk.match(/<news:keywords>\s*([\s\S]*?)\s*<\/news:keywords>/i);
    if (!titleM) continue;
    const title = decodeXmlText(titleM[1]);
    const keywords = decodeXmlText(kwM ? kwM[1] : '');
    for (const lab of labs) {
      const re = new RegExp(
        `(?:^|[^A-Za-z0-9])${lab.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[^A-Za-z0-9]|$)`,
        'i',
      );
      if (!re.test(title)) continue;
      if (re.test(keywords)) continue;
      const key = `${lab}\0${title.slice(0, 80)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ lab, title: title.slice(0, 100) });
      if (out.length >= 8) return out;
    }
  }
  return out;
}

function decodeXmlText(s) {
  // Decode &amp; last so a literal "&amp;lt;" cannot become "<" in one pass
  // (CodeQL js/double-escaping / FINDABILITY #65 pattern).
  return String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

export function hasNowTips(txt) {
  const head = String(txt || '').slice(0, 1500);
  return /\/free-tools\.html/i.test(head)
    && /\/verify\.html/i.test(head)
    && /Search Trends/i.test(head);
}

/**
 * Conquest short aliases that agents.md / llms.txt must advertise
 * (FINDABILITY #116/#119). Same paths as comparePages.mjs `aliases`.
 */
export const VS_SHORT_ALIASES = Object.freeze([
  '/vs/doom.html',
  '/vs/skynet.html',
  '/vs/takeoff.html',
]);

/**
 * True when an agent-map body lists every conquest short alias.
 * Wipe gap is `agents-vs-aliases-missing` (FINDABILITY #119).
 */
export function hasVsShortAliases(txt, aliases = VS_SHORT_ALIASES) {
  const body = String(txt || '');
  return aliases.every((p) => body.includes(p));
}

/**
 * Lab pages whose `<title>` must include a product head-term alias
 * (FINDABILITY #121/#122/#123). Keep in sync with LAB_HEAD_ALIASES in
 * site/templates/facetPages.mjs.
 */
export const LAB_HEAD_TITLE_PROBES = Object.freeze([
  { path: '/lab/google-deepmind.html', needle: 'Gemini' },
  { path: '/lab/openai.html', needle: 'ChatGPT' },
  { path: '/lab/anthropic.html', needle: 'Claude' },
]);

/**
 * Probe rows whose live lab `<title>` is missing the expected head-term needle.
 * Wipe/CDN lag gap is `lab-head-aliases-missing` (FINDABILITY #123).
 */
export function labHeadAliasLags(byUrl, origin = 'https://siren.watch', probes = LAB_HEAD_TITLE_PROBES) {
  const base = String(origin || '').replace(/\/$/, '');
  const out = [];
  for (const { path: rel, needle } of probes) {
    const env = byUrl.get(`${base}${rel}`);
    if (!env?.ok) {
      out.push({ path: rel, needle, reason: 'fetch' });
      continue;
    }
    const title = extractTitle(env.value) || '';
    if (!title.includes(needle)) out.push({ path: rel, needle, reason: 'title', title });
  }
  return out;
}

/** Conservative floor when facet sitemap modules cannot be loaded. */
export const FACET_URL_FLOOR = 450;

/**
 * Count gated facet / hub sitemap rows this tree would emit (tags, labs,
 * outlets, people, days, conquest, …). Falls back to null on import/data miss.
 */
export async function countLocalFacetUrls(root = ROOT) {
  try {
    const news = JSON.parse(await readFile(path.join(root, 'data/news.json'), 'utf8'));
    const arch = JSON.parse(await readFile(path.join(root, 'data/item-archive.json'), 'utf8'));
    const race = JSON.parse(await readFile(path.join(root, 'data/race.json'), 'utf8'));
    const state = JSON.parse(await readFile(path.join(root, 'data/state.json'), 'utf8'));
    let leaders = null;
    let leadersCoverage = null;
    try {
      leaders = JSON.parse(await readFile(path.join(root, 'data/leaders.json'), 'utf8'));
      leadersCoverage = JSON.parse(await readFile(path.join(root, 'data/leaders-coverage.json'), 'utf8'));
    } catch {
      /* people hubs stay empty without leaders */
    }
    // Country hubs need world.json + routes.world (same gate as site/build.mjs).
    // Without them countryEntries always returns [] and the facet count under-reports.
    let world = null;
    try {
      world = JSON.parse(await readFile(path.join(root, 'data/world.json'), 'utf8'));
    } catch {
      /* countries stay off the facet count without the map file */
    }
    const worldReady = Boolean(
      world
      && Array.isArray(world.countries)
      && world.countries.length
      && Array.isArray(world.sites),
    );
    const ctx = {
      news,
      itemArchive: Array.isArray(arch.items) ? arch.items : [],
      race,
      state,
      leaders,
      leadersCoverage,
      world: worldReady ? world : null,
      routes: { world: worldReady },
      href: (p) => p,
      url: (p) => `https://siren.watch${p === '/' ? '/' : p}`,
      cardFor: () => null,
    };
    const site = path.join(root, 'site/templates');
    const load = async (file, name) => {
      const mod = await import(pathToFileURL(path.join(site, file)).href);
      return mod[name];
    };
    const [
      tagEntries, facetEntries, modelEntries, compareEntries,
      peopleEntries, countryEntries, kindEntries, outletEntries, dayEntries,
    ] = await Promise.all([
      load('tagPages.mjs', 'sitemapEntries'),
      load('facetPages.mjs', 'sitemapEntries'),
      load('modelPages.mjs', 'sitemapEntries'),
      load('comparePages.mjs', 'sitemapEntries'),
      load('peoplePages.mjs', 'sitemapEntries'),
      load('countryPages.mjs', 'sitemapEntries'),
      load('kindPages.mjs', 'sitemapEntries'),
      load('outletPages.mjs', 'sitemapEntries'),
      load('dayPages.mjs', 'sitemapEntries'),
    ]);
    const parts = [
      tagEntries(ctx), facetEntries(ctx), modelEntries(ctx), compareEntries(ctx),
      peopleEntries(ctx), countryEntries(ctx), kindEntries(ctx), outletEntries(ctx),
      dayEntries(ctx),
    ];
    return parts.reduce((n, rows) => n + (Array.isArray(rows) ? rows.length : 0), 0);
  } catch {
    return null;
  }
}

/**
 * Estimate sitemap URLs this tree can publish once collect.yml rebuilds
 * gh-pages: live news items + durable archive + gated facets.
 * Pure filesystem peek — no network.
 */
export async function readLocalReadyUrls(root = ROOT) {
  try {
    const news = JSON.parse(await readFile(path.join(root, 'data/news.json'), 'utf8'));
    const arch = JSON.parse(await readFile(path.join(root, 'data/item-archive.json'), 'utf8'));
    const live = Array.isArray(news.items) ? news.items.length : 0;
    const archived = Array.isArray(arch.items) ? arch.items.length : 0;
    if (!live && !archived) return null;
    // Prefer a live count of gated facet sitemap rows; never drop below the
    // floor so deploy-pending stays honest if a module fails to load.
    const counted = await countLocalFacetUrls(root);
    const facets = Math.max(FACET_URL_FLOOR, Number.isFinite(counted) ? counted : 0);
    return {
      live,
      archived,
      facets,
      estimated_sitemap: live + archived + facets,
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

  // FINDABILITY #97 — non-empty but stale news-sitemap (hung news-fast / cancelled collect).
  if (ours.news_sitemap_urls > 0 && ours.news_newest_publication_at) {
    const newest = Date.parse(ours.news_newest_publication_at);
    const nowMs = report.measured_at ? Date.parse(report.measured_at) : Date.now();
    if (Number.isFinite(newest) && Number.isFinite(nowMs)) {
      const ageH = (nowMs - newest) / 3_600_000;
      if (ageH >= NEWS_STALE_HOURS) {
        gaps.push({
          id: 'news-stale',
          severity: 'high',
          text: `Newest news-sitemap publication_date is ${ageH.toFixed(1)}h old (threshold ${NEWS_STALE_HOURS}h) with ${ours.news_sitemap_urls} <loc> — unstick news-fast/collect Publish so Google News stays fresh`,
        });
      }
    }
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
    if (s.id === 'pizzint'
      && (s.news_sitemap_urls === 0 || s.news_sitemap_urls == null)
      && ours.news_sitemap_urls > 0) {
      gaps.push({
        id: 'google-news-open',
        severity: 'medium',
        text: `pizzint news-sitemap is empty while ours has ${ours.news_sitemap_urls} <loc> (local cap 200) — hold the Google News lane; keep the rolling window full and keyword-rich`,
      });
    }
  }

  const coreLive = new Set(CORE_LIVE_SURFACES);
  const awaiting = [];
  for (const surf of report.surfaces || []) {
    if (surf.ok) continue;
    // While deploy-pending, undeployed conquest/entity 404s are one root cause —
    // do not flood the daily pass with 100 high-severity surface-* rows.
    if (deployPending && !coreLive.has(surf.path)) {
      awaiting.push(surf);
      continue;
    }
    gaps.push({
      id: `surface-${surf.path}`,
      severity: 'high',
      text: `Findability surface ${surf.path} failed (${surf.status ?? surf.error ?? 'err'})`,
    });
  }
  if (awaiting.length) {
    const sample = awaiting.slice(0, 4).map((s) => s.path).join(', ');
    gaps.push({
      id: 'surfaces-awaiting-deploy',
      severity: 'medium',
      text: `${awaiting.length} findability surfaces 404 until merge/deploy (e.g. ${sample}) — same root cause as deploy-pending-url-lead`,
    });
  }

  if (ours.title && !/AI activity|SIREN/i.test(ours.title)) {
    gaps.push({
      id: 'title-head-term',
      severity: 'low',
      text: `Homepage title may have drifted off head-term discipline: "${ours.title.slice(0, 80)}"`,
    });
  }

  // FINDABILITY #84/#85 — tip comments wiped when collect Publishes an older tip.
  if (ours.sitemap_tips === false || ours.news_sitemap_tips === false) {
    const which = [
      ours.sitemap_tips === false ? 'sitemap.xml' : null,
      ours.news_sitemap_tips === false ? 'news-sitemap.xml' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'sitemap-tips-missing',
      severity: 'medium',
      text: `${which} missing free-tools/verify tip comments (FINDABILITY #84) — re-overlay or wait for collect Publish on tip ≥ #159`,
    });
  }

  // FINDABILITY #87/#88 — RSS tip comments wiped the same way as sitemap tips.
  if (ours.feed_tips === false || ours.feed_level_tips === false) {
    const which = [
      ours.feed_tips === false ? 'feed.xml' : null,
      ours.feed_level_tips === false ? 'feed-level.xml' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'feed-tips-missing',
      severity: 'medium',
      text: `${which} missing free-tools/verify tip comments (FINDABILITY #87) — re-overlay or wait for collect Publish on tip ≥ #162`,
    });
  }

  // FINDABILITY #79/#89 — robots tip comments wiped the same way as sitemap/feed tips.
  if (ours.robots_tips === false) {
    gaps.push({
      id: 'robots-tips-missing',
      severity: 'medium',
      text: 'robots.txt missing free-tools/verify tip comments (FINDABILITY #79) — re-overlay or wait for collect Publish that emits #79 tips',
    });
  }

  // FINDABILITY #90/#91 — live reading tip lines missing until tip ≥ #166 deploys or overlay.
  if (ours.now_md_tips === false || ours.now_txt_tips === false) {
    const which = [
      ours.now_md_tips === false ? 'now.md' : null,
      ours.now_txt_tips === false ? 'api/now.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'now-tips-missing',
      severity: 'medium',
      text: `${which} missing free-tools/verify/Search Trends tip lines (FINDABILITY #90) — re-overlay or wait for collect Publish on tip ≥ #166`,
    });
  }

  // FINDABILITY #110 — title names a probe lab but news:keywords omit it
  // (CDN/old-tip publishes after NEWS_KEYWORD_LABS refresh).
  if (Array.isArray(ours.news_keyword_lags) && ours.news_keyword_lags.length > 0) {
    const sample = ours.news_keyword_lags
      .slice(0, 3)
      .map((row) => `${row.lab}`)
      .join(', ');
    gaps.push({
      id: 'news-keywords-lag',
      severity: 'medium',
      text: `news-sitemap title↔keywords lag on ${ours.news_keyword_lags.length} probe lab(s) (e.g. ${sample}) — re-overlay or wait for news-fast Publish on tip ≥ #109 (FINDABILITY #110)`,
    });
  }

  // FINDABILITY #116/#119 — agents.md / llms.txt dropped short-alias lines
  // (orphan tip lag or overlay miss after HTML aliases restored).
  if (ours.agents_vs_aliases === false || ours.llms_vs_aliases === false) {
    const which = [
      ours.agents_vs_aliases === false ? 'agents.md' : null,
      ours.llms_vs_aliases === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-vs-aliases-missing',
      severity: 'medium',
      text: `${which} missing /vs/{doom,skynet,takeoff}.html short-alias lines (FINDABILITY #116/#119) — re-overlay agent maps or wait for news-fast Publish on tip ≥ #116`,
    });
  }

  // FINDABILITY #121/#122/#123 — lab titles dropped product head-term aliases.
  if (Array.isArray(ours.lab_head_alias_lags) && ours.lab_head_alias_lags.length > 0) {
    const sample = ours.lab_head_alias_lags
      .slice(0, 3)
      .map((row) => `${row.path} (−${row.needle})`)
      .join(', ');
    gaps.push({
      id: 'lab-head-aliases-missing',
      severity: 'medium',
      text: `lab head-term title alias lag on ${ours.lab_head_alias_lags.length} page(s) (e.g. ${sample}) — re-overlay or wait for collect Publish on tip ≥ #122 (FINDABILITY #123)`,
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
  // #15 people pages + news day hubs shipped 2026-10-14 (cursor/seo-daily-20261014-4dfe).
  {
    id: 'gsc-verify',
    severity: 'medium',
    text: 'Operator: set repo secret GOOGLE_SITE_VERIFICATION (HTML-tag token), verify https://siren.watch in Search Console, submit sitemap.xml + news-sitemap.xml (FINDABILITY #11 / OUTREACH.md §0)',
  },
  {
    id: 'bing-verify',
    severity: 'medium',
    text: 'Operator: set repo secret BING_SITE_VERIFICATION (msvalidate.01 token), verify https://siren.watch in Bing Webmaster, submit both sitemaps (FINDABILITY #120 / OUTREACH.md §0)',
  },
]);

/** Refine open-engineering copy once live home ships console verification metas. */
export function openEngineeringForReport(sites) {
  const ours = (sites || []).find((s) => s.ours);
  return OPEN_ENGINEERING.map((item) => {
    if (item.id === 'gsc-verify') {
      if (ours?.gsc_meta) {
        return {
          ...item,
          text: 'Operator: GSC meta is live — submit https://siren.watch/sitemap.xml + news-sitemap.xml and confirm indexing (FINDABILITY #11 / OUTREACH.md §0)',
        };
      }
      return {
        ...item,
        text: 'Operator: set repo secret GOOGLE_SITE_VERIFICATION (HTML-tag token), verify https://siren.watch in Search Console, submit both sitemaps (FINDABILITY #11 / OUTREACH.md §0)',
      };
    }
    if (item.id === 'bing-verify') {
      if (ours?.bing_meta) {
        return {
          ...item,
          text: 'Operator: Bing msvalidate.01 is live — submit both sitemaps in Bing Webmaster and confirm indexing (FINDABILITY #120 / OUTREACH.md §0)',
        };
      }
      return {
        ...item,
        text: 'Operator: set repo secret BING_SITE_VERIFICATION (msvalidate.01 token), verify https://siren.watch in Bing Webmaster, submit both sitemaps (FINDABILITY #120 / OUTREACH.md §0)',
      };
    }
    return { ...item };
  });
}

function sitePaths(origin) {
  const base = origin.replace(/\/$/, '');
  return {
    home: `${base}/`,
    sitemap: `${base}/sitemap.xml`,
    news: `${base}/news-sitemap.xml`,
    robots: `${base}/robots.txt`,
    llms: `${base}/llms.txt`,
    feed: `${base}/feed.xml`,
    feedLevel: `${base}/feed-level.xml`,
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
    gsc_meta: home?.ok ? hasGscMeta(home.value) : null,
    bing_meta: home?.ok ? hasBingMeta(home.value) : null,
    sitemap_urls: null,
    sitemap_is_index: null,
    news_sitemap_urls: null,
    robots_ok: Boolean(robots?.ok),
    llms_ok: Boolean(llms?.ok),
    error: home?.ok ? undefined : (home?.error?.message || home?.error || 'home fetch failed'),
  };

  if (site.ours) {
    row.robots_tips = robots?.ok ? hasRobotsTips(robots.value) : false;
  }

  if (sm?.ok) {
    row.sitemap_urls = countLocs(sm.value);
    row.sitemap_is_index = isSitemapIndex(sm.value);
    if (site.ours) row.sitemap_tips = hasSitemapTips(sm.value);
  } else if (sm) {
    row.sitemap_error = sm.error?.message || `HTTP ${sm.status}`;
    if (site.ours) row.sitemap_tips = false;
  }

  if (news?.ok) {
    row.news_sitemap_urls = countLocs(news.value);
    if (site.ours) {
      row.news_sitemap_tips = hasSitemapTips(news.value);
      const newest = newestNewsPublicationMs(news.value);
      row.news_newest_publication_at = newest != null ? new Date(newest).toISOString() : null;
      row.news_keyword_lags = newsKeywordLags(news.value);
    }
  } else if (news) {
    // Missing news sitemap is normal for most rivals; record null, not error noise.
    row.news_sitemap_urls = news.status === 404 ? 0 : null;
    if (site.ours) {
      row.news_sitemap_tips = false;
      row.news_newest_publication_at = null;
      row.news_keyword_lags = [];
    }
  }

  if (site.ours) {
    const feed = byUrl.get(paths.feed);
    const feedLevel = byUrl.get(paths.feedLevel);
    row.feed_tips = feed?.ok ? hasFeedTips(feed.value) : false;
    row.feed_level_tips = feedLevel?.ok ? hasFeedTips(feedLevel.value) : false;
    const base = site.origin.replace(/\/$/, '');
    const nowMd = byUrl.get(`${base}/now.md`);
    const nowTxt = byUrl.get(`${base}/api/now.txt`);
    row.now_md_tips = nowMd?.ok ? hasNowTips(nowMd.value) : false;
    row.now_txt_tips = nowTxt?.ok ? hasNowTips(nowTxt.value) : false;
    // FINDABILITY #119 — agent maps must list short aliases after #116 overlay.
    // Prefer the surface fetch (OUR_SURFACES); fall back to measure llms row.
    const agentsMd = byUrl.get(`${base}/agents.md`);
    const llmsBody = llms?.ok ? llms.value : '';
    row.agents_vs_aliases = agentsMd?.ok ? hasVsShortAliases(agentsMd.value) : false;
    row.llms_vs_aliases = llms?.ok ? hasVsShortAliases(llmsBody) : false;
    // FINDABILITY #123 — lab title must keep product head-term aliases.
    row.lab_head_alias_lags = labHeadAliasLags(byUrl, site.origin);
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
    // FINDABILITY #88 — only our RSS tips matter for wipe detection.
    if (site.ours) {
      for (const url of [p.feed, p.feedLevel]) {
        jobs.push({ key: url, url, parse: 'text', timeoutMs: 12_000, retries: 1 });
      }
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
    open_engineering: openEngineeringForReport(sites),
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
  {
    const ours = (report.sites || []).find((s) => s.ours);
    if (ours && ours.gsc_meta != null) {
      lines.push(
        ours.gsc_meta
          ? '- GSC HTML-tag meta: **present** on live home (still submit sitemaps — FINDABILITY #11)'
          : '- GSC HTML-tag meta: **absent** on live home (set `GOOGLE_SITE_VERIFICATION` — FINDABILITY #11)',
      );
    }
    if (ours && ours.bing_meta != null) {
      lines.push(
        ours.bing_meta
          ? '- Bing msvalidate.01 meta: **present** on live home (still submit sitemaps — FINDABILITY #120)'
          : '- Bing msvalidate.01 meta: **absent** on live home (set `BING_SITE_VERIFICATION` — FINDABILITY #120)',
      );
    }
    if (ours && ours.robots_tips != null) {
      lines.push(`- Robots tip comments (#79): robots.txt **${ours.robots_tips ? 'yes' : 'NO'}**`);
    }
    if (ours && (ours.sitemap_tips != null || ours.news_sitemap_tips != null)) {
      const smTip = ours.sitemap_tips == null ? '—' : (ours.sitemap_tips ? 'yes' : 'NO');
      const newsTip = ours.news_sitemap_tips == null ? '—' : (ours.news_sitemap_tips ? 'yes' : 'NO');
      lines.push(`- Sitemap tip comments (#84): sitemap.xml **${smTip}** · news-sitemap.xml **${newsTip}**`);
    }
    if (ours && (ours.feed_tips != null || ours.feed_level_tips != null)) {
      const feedTip = ours.feed_tips == null ? '—' : (ours.feed_tips ? 'yes' : 'NO');
      const feedLevelTip = ours.feed_level_tips == null ? '—' : (ours.feed_level_tips ? 'yes' : 'NO');
      lines.push(`- Feed tip comments (#87): feed.xml **${feedTip}** · feed-level.xml **${feedLevelTip}**`);
    }
    if (ours && (ours.now_md_tips != null || ours.now_txt_tips != null)) {
      const mdTip = ours.now_md_tips == null ? '—' : (ours.now_md_tips ? 'yes' : 'NO');
      const txtTip = ours.now_txt_tips == null ? '—' : (ours.now_txt_tips ? 'yes' : 'NO');
      lines.push(`- Now tip lines (#90): now.md **${mdTip}** · api/now.txt **${txtTip}**`);
    }
    if (ours && Array.isArray(ours.news_keyword_lags)) {
      if (ours.news_keyword_lags.length === 0) {
        lines.push('- News keyword probes (#110): **ok** (title needles present in news:keywords)');
      } else {
        const sample = ours.news_keyword_lags.slice(0, 3).map((r) => r.lab).join(', ');
        lines.push(
          `- News keyword probes (#110): **LAG** on ${ours.news_keyword_lags.length} (e.g. ${sample})`,
        );
      }
    }
    if (ours && (ours.agents_vs_aliases != null || ours.llms_vs_aliases != null)) {
      const ag = ours.agents_vs_aliases == null ? '—' : (ours.agents_vs_aliases ? 'yes' : 'NO');
      const lm = ours.llms_vs_aliases == null ? '—' : (ours.llms_vs_aliases ? 'yes' : 'NO');
      lines.push(`- Agent-map vs short aliases (#116/#119): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && Array.isArray(ours.lab_head_alias_lags)) {
      if (ours.lab_head_alias_lags.length === 0) {
        lines.push('- Lab head-term titles (#121/#123): **ok** (Gemini / ChatGPT / Claude in lab `<title>`)');
      } else {
        const sample = ours.lab_head_alias_lags.slice(0, 3).map((r) => r.needle).join(', ');
        lines.push(
          `- Lab head-term titles (#121/#123): **LAG** on ${ours.lab_head_alias_lags.length} (e.g. ${sample})`,
        );
      }
    }
    if (ours && (ours.gsc_meta != null || ours.bing_meta != null || ours.robots_tips != null
      || ours.sitemap_tips != null || ours.news_sitemap_tips != null
      || ours.feed_tips != null || ours.feed_level_tips != null
      || ours.now_md_tips != null || ours.now_txt_tips != null
      || ours.news_keyword_lags != null
      || ours.agents_vs_aliases != null || ours.llms_vs_aliases != null
      || ours.lab_head_alias_lags != null)) {
      lines.push('');
    }
  }
  lines.push('## Findability surfaces (siren.watch)');
  lines.push('');
  for (const surf of report.surfaces || []) {
    lines.push(`- ${surf.ok ? 'OK' : 'FAIL'} \`${surf.path}\`${surf.ok ? ` (${surf.bytes} B)` : ` — ${surf.error || surf.status}`}`);
  }
  if (report.local_ready && Number.isFinite(report.local_ready.estimated_sitemap)) {
    const L = report.local_ready;
    const facetN = Number.isFinite(L.facets)
      ? L.facets
      : (Number.isFinite(L.estimated_sitemap) && Number.isFinite(L.live) && Number.isFinite(L.archived)
        ? L.estimated_sitemap - L.live - L.archived
        : FACET_URL_FLOOR);
    lines.push('');
    lines.push(
      `## Local tree (pre-deploy)\n\n- Ready estimate **~${L.estimated_sitemap}** sitemap URLs `
      + `(live news ${L.live} + item-archive ${L.archived} + ~${facetN} facets)`,
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
  if (hasGscMeta('<meta name="google-site-verification" content="AbCdEfGhIj_KlMnOpQrSt">') !== true) {
    throw new Error('hasGscMeta true');
  }
  if (hasGscMeta('<meta name="description" content="x">') !== false) throw new Error('hasGscMeta false');
  if (hasBingMeta('<meta name="msvalidate.01" content="AbCdEfGhIjKlMnOpQrStUvWxYz012345">') !== true) {
    throw new Error('hasBingMeta true');
  }
  if (hasBingMeta('<meta name="description" content="x">') !== false) throw new Error('hasBingMeta false');
  const engAbsent = openEngineeringForReport([{ ours: true, gsc_meta: false, bing_meta: false }]);
  if (!/GOOGLE_SITE_VERIFICATION/.test(engAbsent.find((e) => e.id === 'gsc-verify').text)) {
    throw new Error('open eng absent meta');
  }
  if (!/BING_SITE_VERIFICATION/.test(engAbsent.find((e) => e.id === 'bing-verify').text)) {
    throw new Error('open eng absent bing');
  }
  const engPresent = openEngineeringForReport([{ ours: true, gsc_meta: true, bing_meta: true }]);
  if (!/meta is live/.test(engPresent.find((e) => e.id === 'gsc-verify').text)) {
    throw new Error('open eng present meta');
  }
  if (!/msvalidate\.01 is live/.test(engPresent.find((e) => e.id === 'bing-verify').text)) {
    throw new Error('open eng present bing');
  }
  const tipped = `<?xml version="1.0"?>\n<!-- Free tools: https://siren.watch/free-tools.html · Verify a reading: https://siren.watch/verify.html -->\n<!-- Search Trends: https://siren.watch/search-trends.html -->\n<urlset></urlset>`;
  if (hasSitemapTips(tipped) !== true) throw new Error('hasSitemapTips true');
  if (hasSitemapTips('<?xml version="1.0"?><urlset></urlset>') !== false) throw new Error('hasSitemapTips false');
  const tipGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      sitemap_tips: false, news_sitemap_tips: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!tipGaps.some((g) => g.id === 'sitemap-tips-missing')) throw new Error('sitemap-tips-missing gap');
  if (hasFeedTips(tipped) !== true) throw new Error('hasFeedTips true');
  if (hasFeedTips('<rss></rss>') !== false) throw new Error('hasFeedTips false');
  const feedTipGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      sitemap_tips: true, news_sitemap_tips: true,
      feed_tips: false, feed_level_tips: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!feedTipGaps.some((g) => g.id === 'feed-tips-missing')) throw new Error('feed-tips-missing gap');
  const robotsTipped = `# Free tools: https://siren.watch/free-tools.html · Verify a reading: https://siren.watch/verify.html\n# Search Trends: https://siren.watch/search-trends.html\nUser-agent: *\nAllow: /\n`;
  if (hasRobotsTips(robotsTipped) !== true) throw new Error('hasRobotsTips true');
  if (hasRobotsTips('User-agent: *\nAllow: /\n') !== false) throw new Error('hasRobotsTips false');
  const robotsTipGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      sitemap_tips: true, news_sitemap_tips: true,
      feed_tips: true, feed_level_tips: true,
      robots_tips: false,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!robotsTipGaps.some((g) => g.id === 'robots-tips-missing')) throw new Error('robots-tips-missing gap');
  const nowTipped = 'Also: [free tools](https://siren.watch/free-tools.html) · [verify a reading](https://siren.watch/verify.html) · [Search Trends](https://siren.watch/search-trends.html).\n';
  if (hasNowTips(nowTipped) !== true) throw new Error('hasNowTips true');
  if (hasNowTips('# SIREN: current reading\n') !== false) throw new Error('hasNowTips false');
  const nowTipGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      sitemap_tips: true, news_sitemap_tips: true,
      feed_tips: true, feed_level_tips: true,
      robots_tips: true,
      now_md_tips: false, now_txt_tips: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!nowTipGaps.some((g) => g.id === 'now-tips-missing')) throw new Error('now-tips-missing gap');
  if (!CORE_LIVE_SURFACES.includes('/now.md') || !CORE_LIVE_SURFACES.includes('/api/now.txt')) {
    throw new Error('CORE_LIVE_SURFACES missing now reading surfaces');
  }
  const aliasMap = 'short alias https://siren.watch/vs/doom.html\n/vs/skynet.html\n/vs/takeoff.html\n';
  if (hasVsShortAliases(aliasMap) !== true) throw new Error('hasVsShortAliases true');
  if (hasVsShortAliases('/vs/doom.html\n/vs/skynet.html\n') !== false) throw new Error('hasVsShortAliases false');
  for (const p of VS_SHORT_ALIASES) {
    if (!CORE_LIVE_SURFACES.includes(p)) throw new Error(`CORE_LIVE_SURFACES missing ${p}`);
  }
  const aliasGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      sitemap_tips: true, news_sitemap_tips: true,
      feed_tips: true, feed_level_tips: true,
      robots_tips: true,
      now_md_tips: true, now_txt_tips: true,
      agents_vs_aliases: false, llms_vs_aliases: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!aliasGaps.some((g) => g.id === 'agents-vs-aliases-missing')) {
    throw new Error('agents-vs-aliases-missing gap');
  }
  const labByUrl = new Map([
    ['https://siren.watch/lab/google-deepmind.html', {
      ok: true,
      value: '<title>What has SIREN scored about Google DeepMind? AI stories</title>',
    }],
    ['https://siren.watch/lab/openai.html', {
      ok: true,
      value: '<title>What has SIREN scored about OpenAI / ChatGPT?</title>',
    }],
    ['https://siren.watch/lab/anthropic.html', {
      ok: true,
      value: '<title>What has SIREN scored about Anthropic / Claude?</title>',
    }],
  ]);
  const labLags = labHeadAliasLags(labByUrl);
  if (!labLags.some((r) => r.path === '/lab/google-deepmind.html' && r.needle === 'Gemini')) {
    throw new Error('labHeadAliasLags Gemini');
  }
  if (labLags.some((r) => r.path === '/lab/openai.html')) throw new Error('labHeadAliasLags ChatGPT false positive');
  const labGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      lab_head_alias_lags: labLags,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!labGaps.some((g) => g.id === 'lab-head-aliases-missing')) {
    throw new Error('lab-head-aliases-missing gap');
  }
  for (const p of LAB_HEAD_TITLE_PROBES) {
    if (!OUR_SURFACES.includes(p.path)) throw new Error(`OUR_SURFACES missing ${p.path}`);
  }
  const newsXml = '<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
    + '<url><news:publication_date>2026-10-14T12:00:00.000Z</news:publication_date></url>'
    + '<url><news:publication_date>2026-10-14T18:55:00.000Z</news:publication_date></url>'
    + '</urlset>';
  if (newestNewsPublicationMs(newsXml) !== Date.parse('2026-10-14T18:55:00.000Z')) {
    throw new Error('newestNewsPublicationMs');
  }
  if (NEWS_STALE_HOURS < 6) throw new Error('NEWS_STALE_HOURS floor');
  const staleGaps = deriveGaps({
    measured_at: '2026-10-15T02:30:00.000Z',
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      news_newest_publication_at: '2026-10-14T18:55:00.000Z',
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!staleGaps.some((g) => g.id === 'news-stale')) throw new Error('news-stale gap');

  // FINDABILITY #110 — title names a probe lab but keywords omit it.
  const lagXml = '<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
    + '<url><news:title>Tracking Cathie Wood: Buying Heavily into Kodiak AI and CoreWeave</news:title>'
    + '<news:keywords>CoreWeave, Google, AI, artificial intelligence, SIREN</news:keywords></url>'
    + '<url><news:title>ByteDance nears MediaTek AI chip deal</news:title>'
    + '<news:keywords>ByteDance, Google, MediaTek, AI, SIREN</news:keywords></url>'
    + '</urlset>';
  const lags = newsKeywordLags(lagXml);
  if (!lags.some((r) => r.lab === 'Kodiak AI') || !lags.some((r) => r.lab === 'Cathie Wood')) {
    throw new Error(`newsKeywordLags expected Kodiak/Cathie: ${JSON.stringify(lags)}`);
  }
  if (lags.some((r) => r.lab === 'MediaTek')) {
    throw new Error('newsKeywordLags should not flag MediaTek when keywords include it');
  }
  const lagGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      news_keyword_lags: lags,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!lagGaps.some((g) => g.id === 'news-keywords-lag')) throw new Error('news-keywords-lag gap');
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Kodiak AI')) throw new Error('probe labs missing Kodiak AI');

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
    surfaces: [
      { path: '/llms.txt', ok: true },
      { path: '/companies.html', ok: false, status: 404 },
      { path: '/tags/agents.html', ok: false, status: 404 },
    ],
    open_engineering: [],
  });
  const deployIds = new Set(deployGaps.map((g) => g.id));
  if (!deployIds.has('deploy-pending-url-lead')) throw new Error('deploy-pending gap missing');
  if (deployIds.has('trail-doombench-urls')) throw new Error('trail gap should yield to deploy-pending');
  if (!deployIds.has('surfaces-awaiting-deploy')) throw new Error('undeployed surfaces should collapse');
  if (deployIds.has('surface-/companies.html')) throw new Error('surface flood should yield to deploy-pending');
  if (!OUR_SURFACES.includes('/methodology.html') || !OUR_SURFACES.includes('/news.html')) {
    throw new Error('OUR_SURFACES missing live rooms');
  }
  // pizzint news empty + our news alive → hold the Google News lane (FINDABILITY #49).
  const openNewsGaps = deriveGaps({
    ...report,
    sites: [
      {
        id: 'siren', name: 'siren.watch', ours: true, ok: true,
        title: 'AI activity index today · SIREN',
        sitemap_urls: 700, news_sitemap_urls: 100, schema_types: ['WebSite'],
      },
      {
        id: 'pizzint', name: 'pizzint', ours: false, ok: true,
        title: 'x', sitemap_urls: 1000, news_sitemap_urls: 0, schema_types: [],
      },
    ],
    local_ready: null,
    surfaces: [],
    open_engineering: [],
  });
  if (!openNewsGaps.some((g) => g.id === 'google-news-open')) {
    throw new Error(`google-news-open gap missing: ${openNewsGaps.map((g) => g.id)}`);
  }

  const md = formatMarkdown({
    ...report,
    measured_at: '2026-10-12T00:00:00.000Z',
    gaps,
    local_ready: { live: 800, archived: 5000, facets: 420, estimated_sitemap: 6220 },
  });
  if (!md.includes('siren.watch') || !md.includes('Gaps')) throw new Error('markdown');
  if (!md.includes('Local tree') || !md.includes('6220')) throw new Error('local-ready markdown');

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
