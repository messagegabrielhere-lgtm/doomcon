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
import { labNeedleRe } from './lab-needle.mjs';

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
  // FINDABILITY #489 — uppercase path must stay 200 (same body as agents.md).
  '/AGENTS.md',
  '/agents.txt',
  // FINDABILITY #326 — skill.md must keep classic panel needle after tip.
  '/skill.md',
  // FINDABILITY #437 — agents.html must keep dual index/level head terms after tip.
  '/agents.html',
  // FINDABILITY #328 — ai.txt Start-here must keep classic panel needle after tip.
  '/ai.txt',
  // FINDABILITY #330 — agents.json related.classic must survive tip wipe.
  '/agents.json',
  '/openapi.json',
  '/api/index.json',
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
  // FINDABILITY #186 — Search Trends JSON tip freshness (generated_at).
  '/api/search-trends.json',
  // FINDABILITY #111/#113/#119 — conquest short aliases must stay 200 even
  // while orphan newsroom publishes race the tip (high-severity if wiped).
  '/vs/doom.html',
  '/vs/skynet.html',
  '/vs/takeoff.html',
  // FINDABILITY #124 — directory indexes + /trends short alias (typed guesses).
  '/verify/',
  '/free-tools/',
  '/search-trends/',
  '/trends.html',
  '/trends/',
  // FINDABILITY #129 — unhyphenated /pdoom typed guess (canonical on /p-doom.html).
  '/pdoom.html',
  '/pdoom/',
  // FINDABILITY #131 — root rival brand typed guesses (canonical on /vs/*).
  '/doombench.html',
  '/doom.html',
  '/skynet-countdown.html',
  '/skynet.html',
  '/pizzint.html',
  '/takeofftracker.html',
  '/takeoff.html',
  // FINDABILITY #133 — doomsday-clock / ai-doom / doom-index typed guesses.
  '/doomsday-clock.html',
  '/ai-doom.html',
  '/doom-index.html',
  '/ai-doom-index.html',
  // FINDABILITY #252 — /ai-activity-index typed guess (canonical on /).
  '/ai-activity-index.html',
  '/ai-activity-index/',
  // FINDABILITY #262 — /ai-activity-level typed guess (canonical on /).
  '/ai-activity-level.html',
  '/ai-activity-level/',
  // FINDABILITY #318 — full instrument panel (own canonical; not a home alias).
  '/classic.html',
]);

/** Our agent / findability surfaces that must keep answering 200. */
export const OUR_SURFACES = Object.freeze([
  ...CORE_LIVE_SURFACES,
  // Live rooms already on gh-pages — monitor regressions after each collect.
  '/privacy.html',
  // FINDABILITY #469 — press Current reading CTA must keep dual head terms.
  '/press.html',
  // FINDABILITY #471 — superseded-move bstamp CTA must keep dual head terms.
  '/moves/2026-10-17T15-35-33Z.html',
  // FINDABILITY #473 — error-page home CTAs must keep dual head terms.
  '/404.html',
  '/500.html',
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
  // FINDABILITY #459 — desk/joke live links must keep dual head terms after tip.
  '/bets.html',
  '/balance.html',
  '/self-aware.html',
  // FINDABILITY #461 — videos explainer CTA must keep dual head terms after tip.
  '/videos.html',
  // FINDABILITY #467 — bliss methodology home CTA must keep dual head terms.
  '/bliss.html',
  // FINDABILITY #463 — model hub composite-reading CTAs must keep dual head terms.
  '/model/muse-spark.html',
  '/model/fable.html',
  // FINDABILITY #465 — pillar composite-reading CTAs must keep dual head terms.
  '/pillar/compute.html',
  '/pillar/attention.html',
  '/companies.html',
  '/models.html',
  '/pillars.html',
  '/sources.html',
  '/lab/',
  // FINDABILITY #123/#137 — head-term alias lab titles (#121/#122/#137).
  '/lab/google-deepmind.html',
  '/lab/openai.html',
  '/lab/anthropic.html',
  '/lab/micron.html',
  // FINDABILITY #155 — CoreWeave stock Trends FAQ lab.
  '/lab/coreweave.html',
  // FINDABILITY #161 — NVIDIA / NVDA Trends FAQ lab.
  '/lab/nvidia.html',
  // FINDABILITY #164 — ASML / EUV AI chip-tool Trends FAQ lab.
  '/lab/asml.html',
  // FINDABILITY #165 — TSMC / AI foundry Trends FAQ lab.
  '/lab/tsmc.html',
  // FINDABILITY #167 — Amazon Bee / wearable AI Trends FAQ lab.
  '/lab/amazon.html',
  // FINDABILITY #169 — Meta Muse / open-weight AI Trends FAQ lab.
  '/lab/meta.html',
  // FINDABILITY #170 — Apple Intelligence Trends FAQ lab.
  '/lab/apple.html',
  // FINDABILITY #171 — Microsoft Copilot Trends FAQ lab.
  '/lab/microsoft.html',
  // FINDABILITY #173 — xAI / Grok Trends FAQ lab.
  '/lab/xai.html',
  // FINDABILITY #174 — Gemini / Gemma Trends FAQ lab.
  '/lab/google-deepmind.html',
  // FINDABILITY #175 — Samsung / HBM AI memory Trends FAQ lab.
  '/lab/samsung.html',
  // FINDABILITY #157 — neocloud Trends FAQ tag hub.
  '/tags/neoclouds.html',
  // FINDABILITY #176 — Character.ai bankruptcy FAQ chatbots tag hub.
  '/tags/chatbots.html',
  // FINDABILITY #182 — Hugging Face hack / incident FAQ tag hub.
  '/tags/huggingface.html',
  // FINDABILITY #177 — Qwen / Alibaba open-weight Trends FAQ lab.
  '/lab/qwen.html',
  // FINDABILITY #178 — Oracle / AI datacenter Trends FAQ tag hub.
  '/tags/datacenters.html',
  // FINDABILITY #179 — DeepSeek outage Trends FAQ lab.
  '/lab/deepseek.html',
  // FINDABILITY #180 — Mistral / Timestral Trends FAQ lab.
  '/lab/mistral.html',
  // FINDABILITY #183 — Palantir / AIP / government AI Trends FAQ lab.
  '/lab/palantir.html',
  // FINDABILITY #184 — AMD / MI300 / Instinct AI GPU Trends FAQ lab.
  '/lab/amd.html',
  // FINDABILITY #185 — Tesla / FSD / Autopilot Trends FAQ lab.
  '/lab/tesla.html',
  // FINDABILITY #372 — Waymo Canada / Toronto robotaxi FAQ lab.
  '/lab/waymo.html',
  // FINDABILITY #374 — SoftBank / Allied Universal FAQ lab.
  '/lab/softbank.html',
  // FINDABILITY #376 — SpaceX / Starshield FAQ lab.
  '/lab/spacex.html',
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
 * True when sitemap tip comments advertise free-tools + verify (FINDABILITY #84)
 * and the classic instrument panel (FINDABILITY #334).
 * Detects collect Publish wipes that drop SEO overlays before main tip catches up.
 */
export function hasSitemapTips(xml) {
  const head = String(xml || '').slice(0, 1600);
  return /Free tools:.*\/free-tools\.html/i.test(head)
    && /Verify(?: a reading)?:.*\/verify\.html/i.test(head)
    && (/Search Trends/i.test(head) || /news-sitemap\.xml/i.test(head) || /llms\.txt/i.test(head))
    && /\/classic\.html/i.test(head);
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
 * True when the homepage `<head>` and robots.txt both point an agent at
 * how to use the index (FINDABILITY #489): skill.md + api/now.txt in head,
 * skill.md + /AGENTS.md in robots.txt. Body links do not count.
 */
export function hasAgentUseLinks(html, robots) {
  const h = String(html || '');
  const end = h.toLowerCase().indexOf('</head>');
  const head = end >= 0 ? h.slice(0, end) : '';
  const skill = /rel="alternate"[^>]*href="[^"]*\/skill\.md"/.test(head);
  const now = /rel="alternate"[^>]*href="[^"]*\/api\/now\.txt"/.test(head);
  const r = String(robots || '');
  return skill && now && /\/skill\.md/.test(r) && /\/AGENTS\.md/.test(r);
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
 * Hours after which live Search Trends JSON is treated as stale (FINDABILITY #186).
 * Mirrors news-stale: catches hung news-fast / quiet collect before Trends tip decays.
 */
export const TRENDS_STALE_HOURS = 6;

/**
 * Parse `generated_at` from live `/api/search-trends.json` body.
 * @param {string} body
 * @returns {number|null} epoch ms, or null when missing/unparseable
 */
export function trendsGeneratedAtMs(body) {
  try {
    const j = JSON.parse(String(body || ''));
    const t = Date.parse(j?.generated_at);
    return Number.isFinite(t) ? t : null;
  } catch {
    return null;
  }
}

/**
 * High-signal lab needles to probe for title↔keywords lag (FINDABILITY #110).
 * Kept short so seo-daily stays cheap; expand only when a live 48h title proves
 * a NEWS_KEYWORD_LABS needle is shipping in HTML titles but missing from
 * news:keywords (CDN/old-tip publishes after #108/#109).
 */
export const NEWS_KEYWORD_PROBE_LABS = Object.freeze([
  'Kodiak AI', 'MediaTek', 'Cathie Wood', 'ServiceNow', 'ChatGPT', 'Claude Code',
  // FINDABILITY #201 — live 48h needles from #199/#200 while pizzint-news-alive.
  'METR', 'Bee', 'Apertus', 'Apertus 1.5',
  // FINDABILITY #204 — live 48h needles (Bluesky/Attie/Nscale) while google-news-open.
  'Bluesky', 'Attie', 'Nscale',
  // FINDABILITY #206 — Starshield product needle while Google News contested.
  'Starshield',
  // FINDABILITY #208 — Roadster product needle while Tesla Trends trending.
  'Roadster',
  // FINDABILITY #354 — Flying Roadster product-class companion (multi-title).
  'Flying Roadster',
  // FINDABILITY #212 — Fable model-class needles while Google News contested.
  'Fable', 'Fable 5', 'Fable 5.1', 'Fable 5.5',
  // FINDABILITY #214 — ChatGPT Voice / GPT-Live needles while Google News contested.
  'ChatGPT Voice', 'GPT-Live', 'GPT-Live-1.1',
  // FINDABILITY #336 — GPT-Live-1 SKU + Kling 4.0 video needles (multi-title).
  'GPT-Live-1', 'Kling', 'Kling 4.0',
  // FINDABILITY #338 — Xing / Xing 4.0 MoE needles (multi-title).
  'Xing', 'Xing 4.0',
  // FINDABILITY #348 — Xing 4.0 29B-A4B size-SKU needle (multi-title).
  'Xing 4.0 29B-A4B',
  // FINDABILITY #340 — Replit company needle (multi-title Anthropic/OpenAI tape).
  'Replit',
  // FINDABILITY #342 — Siri product needle (multi-title vs Gemini tape).
  'Siri',
  // FINDABILITY #344 — Claude Mythos 5 / Mythos 5 version needles (multi-title).
  'Claude Mythos 5', 'Mythos 5',
  // FINDABILITY #346 — Qwen3.8-Max SKU needle (multi-title vs Mythos 5 tape).
  'Qwen3.8-Max',
  // FINDABILITY #216 — MAI-Base needles while Google News contested.
  'MAI-Base', 'MAI-Base-2',
  // FINDABILITY #222 — Muse Spark product-class needles (multi-title tape).
  'Muse Spark', 'Muse Spark Open',
  // FINDABILITY #292 — Mac Studios hardware needle (Muse Spark Open tape).
  'Mac Studios',
  // FINDABILITY #294 — singular Mac Studio companion (Apple–Meta Muse tape).
  'Mac Studio',
  // FINDABILITY #224 — Tencent Cloud product-class needle (multi-title tape).
  'Tencent Cloud',
  // FINDABILITY #226 — CERT-In agency needle (multi-title AI cyber tape).
  'CERT-In',
  // FINDABILITY #228 — DeepSeek V4.1 Flash product-class needle.
  'DeepSeek V4.1 Flash',
  // FINDABILITY #231 — Nemotron 3.5 Super VL product-class needle.
  'Nemotron 3.5 Super VL',
  // FINDABILITY #234 — Nemotron 3.5 Bolt companion needle (bare Bolt).
  'Bolt',
  // FINDABILITY #236 — DeepSeek V4 Pro product-class needle.
  'DeepSeek V4 Pro',
  // FINDABILITY #238 — Qwen3.8 product-class needle (Max + Omni Flash tape).
  'Qwen3.8',
  // FINDABILITY #290 — Qwen3.8-27B size-class needle (multi-title SKU tape).
  'Qwen3.8-27B',
  // FINDABILITY #241 — Airship company needle (ISO + AISP tape).
  'Airship',
  // FINDABILITY #250 — ModelSphere product-class needle (RiseUnion tape).
  'ModelSphere',
  // FINDABILITY #256 — Krea / Krea 3 image-model needles (multi-title tape).
  'Krea', 'Krea 3',
  // FINDABILITY #258 — Flux 3 image-model needle (multi-title Klein tape).
  'Flux 3',
  // FINDABILITY #260 — Together AI hosting needle (multi-title tape).
  'Together AI',
  // FINDABILITY #267 — Terafab fab needle (multi-title TSMC / Musk tape).
  'Terafab',
  // FINDABILITY #269 — Cohere lab needle (multi-title AISLE / cyber tape).
  'Cohere',
  // FINDABILITY #271 — Accenture company needle (multi-title Claude spend tape).
  'Accenture',
  // FINDABILITY #273 — G7 forum needle (multi-title AI cyber drill tape).
  'G7',
  // FINDABILITY #275 — Bee Frontier / Bee Eclipse product needles (wearable tape).
  'Bee Frontier', 'Bee Eclipse',
  // FINDABILITY #356 — Bee AI product-class companion (multi-title; FAQ #167 gates).
  'Bee AI',
  // FINDABILITY #277 — Surface Laptop Ultra product needle (AI-laptop tape).
  'Surface Laptop Ultra',
  // FINDABILITY #279 — RTX Spark product needle (on-device AI PC tape).
  'RTX Spark',
  // FINDABILITY #282 — Qwen 4 Max product needle (vs Muse Spark / Opus tape).
  'Qwen 4 Max',
  // FINDABILITY #286 — Beam product needle (Reflection open-model tape).
  'Beam',
  // FINDABILITY #298 — Vercel company needle (Jev adoption tape).
  'Vercel',
  // FINDABILITY #302 — Elorian company needle (Glimpse vision-model tape).
  'Elorian',
  // FINDABILITY #304 — Dell company needle (AI infrastructure tape).
  'Dell',
  // FINDABILITY #306 — NYC Council agency needle (SpaceX AI-safety hearing).
  'NYC Council',
  // FINDABILITY #320 — PS5 product needle (local-AI / llama.cpp console tape).
  'PS5',
  // FINDABILITY #350 — plural PS5s companion (boundary misses PS5s titles).
  'PS5s',
  // FINDABILITY #352 — Anthropic IPO event needle (multi-title; FAQ #163 gates lab).
  'Anthropic IPO',
  // FINDABILITY #358 — AI safety bill event needle (multi-title; FAQ #163 gates lab).
  'AI safety bill',
  // FINDABILITY #360 — Amazon Web Services full-name companion (multi-title; FAQ #167 gates).
  'Amazon Web Services',
  // FINDABILITY #364 — M5 Max Apple Silicon SKU companion (multi-title; FAQ #170 gates).
  'M5 Max',
  // FINDABILITY #370 — NIST standards-body needle (multi-title; FAQ #368/#362 gate lab).
  'NIST',
  // FINDABILITY #380 — Allied Universal companion (multi-title; FAQ #374 gates SoftBank lab).
  'Allied Universal',
  // FINDABILITY #382 — Blackstone financing companion (multi-title; FAQ #163/#362/#368 gate Anthropic lab).
  'Blackstone',
  // FINDABILITY #384 — Dory 1.0 Nemotron Labs SKU companion (multi-title; NVIDIA lab gates).
  'Dory 1.0',
  // FINDABILITY #386 — Nemotron 3.5 version companion (multi-title 48h; NVIDIA lab gates).
  'Nemotron 3.5',
  // FINDABILITY #390 — Chrome browser-assistant companion (multi-title ChatGPT Chrome tape; FAQ #191 gates OpenAI lab).
  'Chrome',
  // FINDABILITY #394 — MOSS-Image open-weight image-model companion (multi-title vs GPT/FLUX/Qwen/Nano Banana; no doorway lab).
  'MOSS-Image',
  // FINDABILITY #397 — ECDSA curve-seed companion (multi-title; FAQ #397 gates Anthropic lab).
  'ECDSA',
  // FINDABILITY #402 — Claude Opus 5.5 product companion (multi-title; FAQ #402 gates Anthropic lab).
  'Claude Opus 5.5', 'Opus 5.5',
  // FINDABILITY #404 — Ondas partner companion (multi-title Ondas–Palantir JV; Palantir FAQ gates lab).
  'Ondas',
  // FINDABILITY #448 — Anthropic GDP $44T SKU companion (multi-title; Anthropic FAQs gate lab).
  '$44T',
  // FINDABILITY #477 — Navier-Stokes math-proof companion (multi-title; OpenAI FAQs gate lab).
  'Navier-Stokes',
  // FINDABILITY #479 — DeepSeek V4.1 Flash-1017 build SKU companion (multi-title; DeepSeek FAQs gate lab).
  'Flash-1017',
  // FINDABILITY #481 — Stripe company needle (multi-title OpenRouter acquisition tape).
  'Stripe',
  // FINDABILITY #310 — GPT-6 Astra space-form titles ("GPT 6 Astra") lag without flex match.
  'GPT-6 Astra', 'GPT-6.1 Astra',
]);

/**
 * Entries whose news:title matches a probe lab but news:keywords omit it.
 * Returns up to 8 `{ lab, title }` rows for the daily gap line.
 * FINDABILITY #310 — hyphen↔space flex via labNeedleRe.
 * FINDABILITY #388 — letter↔digit flex via labNeedleRe (Qwen3.8 ↔ Qwen 3.8).
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
      const re = labNeedleRe(lab);
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

/**
 * labAboutLabel parent→alias pairs for news:keywords (FINDABILITY #146/#147).
 * Wipe/CDN lag gap is `news-lab-alias-keywords-missing` (FINDABILITY #148/#159).
 */
export const NEWS_LAB_ALIAS_PROBES = Object.freeze([
  { lab: 'OpenAI', alias: 'ChatGPT' },
  { lab: 'Anthropic', alias: 'Claude' },
  { lab: 'DeepMind', alias: 'Gemini' },
  // FINDABILITY #187 — Gemini → Argon for Google News keywords.
  { lab: 'Gemini', alias: 'Argon' },
  { lab: 'Micron', alias: 'MU' },
  // FINDABILITY #159 — Trends HEAD_TERM aliases for Google News keywords.
  { lab: 'CoreWeave', alias: 'neocloud' },
  // FINDABILITY #288 — CoreWeave ticker alias for Google News keywords.
  { lab: 'CoreWeave', alias: 'CRWV' },
  { lab: 'IREN', alias: 'Iris Energy' },
  // FINDABILITY #161 — NVIDIA ticker alias for Google News keywords.
  { lab: 'NVIDIA', alias: 'NVDA' },
  // FINDABILITY #172 — Trends product aliases for Google News keywords.
  { lab: 'Meta', alias: 'Muse' },
  { lab: 'Apple', alias: 'Apple Intelligence' },
  { lab: 'Microsoft', alias: 'Copilot' },
  // FINDABILITY #173 — xAI → Grok for Google News keywords.
  { lab: 'xAI', alias: 'Grok' },
  // FINDABILITY #175 — Samsung → HBM for Google News keywords.
  { lab: 'Samsung', alias: 'HBM' },
  // FINDABILITY #176 — Character.ai → Chatbots for Google News keywords.
  { lab: 'Character.ai', alias: 'Chatbots' },
  // FINDABILITY #177 — Alibaba → Qwen for Google News keywords.
  { lab: 'Alibaba', alias: 'Qwen' },
  // FINDABILITY #178 — Oracle → Datacenters for Google News keywords.
  { lab: 'Oracle', alias: 'Datacenters' },
  // FINDABILITY #180 — Mistral → Timestral for Google News keywords.
  { lab: 'Mistral', alias: 'Timestral' },
  // FINDABILITY #183 — Palantir → AIP for Google News keywords.
  { lab: 'Palantir', alias: 'AIP' },
  // FINDABILITY #184 — AMD → MI300 for Google News keywords.
  { lab: 'AMD', alias: 'MI300' },
  // FINDABILITY #185 — Tesla → FSD for Google News keywords.
  { lab: 'Tesla', alias: 'FSD' },
  // FINDABILITY #206 — SpaceX → Starshield for Google News keywords.
  { lab: 'SpaceX', alias: 'Starshield' },
]);

/**
 * Entries whose news:title names a parent lab but news:keywords omit the
 * labAboutLabel alias (#146/#147). Returns up to 24 `{ lab, alias, title }`
 * so late probes (Alibaba→Qwen … Tesla→FSD) are not clipped by the old 8-cap.
 */
export function newsLabAliasKeywordLags(xml, probes = NEWS_LAB_ALIAS_PROBES) {
  const out = [];
  const seen = new Set();
  for (const block of String(xml || '').matchAll(/<url\b[\s\S]*?<\/url>/gi)) {
    const chunk = block[0];
    const titleM = chunk.match(/<news:title>\s*([\s\S]*?)\s*<\/news:title>/i);
    const kwM = chunk.match(/<news:keywords>\s*([\s\S]*?)\s*<\/news:keywords>/i);
    if (!titleM) continue;
    const title = decodeXmlText(titleM[1]);
    const keywords = decodeXmlText(kwM ? kwM[1] : '');
    for (const { lab, alias } of probes) {
      const labRe = new RegExp(
        `(?:^|[^A-Za-z0-9])${lab.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[^A-Za-z0-9]|$)`,
        'i',
      );
      const aliasRe = new RegExp(
        `(?:^|[^A-Za-z0-9])${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[^A-Za-z0-9]|$)`,
        'i',
      );
      if (!labRe.test(title)) continue;
      if (aliasRe.test(keywords)) continue;
      const key = `${lab}\0${alias}\0${title.slice(0, 80)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ lab, alias, title: title.slice(0, 100) });
      if (out.length >= 24) return out;
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
  // FINDABILITY #124/#125 — tip lines must name the /trends.html short alias
  // (canonical stays on search-trends), not only the words "Search Trends".
  // FINDABILITY #334 — tip lines must also name /classic.html for crawlers that
  // open now.md / api/now.txt before robots/llms/agent maps.
  return /\/free-tools\.html/i.test(head)
    && /\/verify\.html/i.test(head)
    && /Search Trends/i.test(head)
    && /\/trends\.html/i.test(head)
    && /\/classic\.html/i.test(head);
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

/** Search Trends short alias (FINDABILITY #124). Canonical on /search-trends.html. */
export const TRENDS_SHORT_ALIAS = '/trends.html';

/**
 * True when an agent-map body lists the /trends.html short alias.
 * Wipe gap is `agents-trends-alias-missing` (FINDABILITY #125).
 */
export function hasTrendsShortAlias(txt, alias = TRENDS_SHORT_ALIAS) {
  return String(txt || '').includes(alias);
}

/** Unhyphenated p(doom) hub short alias (FINDABILITY #129). Canonical on /p-doom.html. */
export const PDOOM_SHORT_ALIAS = '/pdoom.html';

/** Home head-term typed-guess alias (FINDABILITY #252). Canonical on /. */
export const ACTIVITY_INDEX_ALIAS = '/ai-activity-index.html';

/** Home meta/FAQ typed-guess alias (FINDABILITY #262). Canonical on /. */
export const ACTIVITY_LEVEL_ALIAS = '/ai-activity-level.html';

/**
 * Contiguous unbranded head term for agent maps (FINDABILITY #433).
 * Home title/H1 already ship “AI activity level today ·”; agents.md / llms.txt
 * must not leave the level phrase as a URL-only alias.
 */
export const ACTIVITY_LEVEL_HEAD_TERM_NEEDLE = 'AI activity level today';

/**
 * Dual middot head terms on /agents.html machine endpoints (FINDABILITY #437).
 * A lone “AI activity level today” in an assistant prompt is not enough —
 * the HTML welcome must name both head terms beside the home aliases.
 */
export const AGENTS_HTML_DUAL_HEAD_TERM_NEEDLE =
  'AI activity index today · AI activity level today';

/** Classic instrument panel path advertised in agent maps (FINDABILITY #324). */
export const CLASSIC_PANEL_AGENT_PATH = '/classic.html';

/**
 * Strip `/vs/<basename>` so a conquest primary cannot satisfy a root/short
 * alias probe via naive `includes` (FINDABILITY #135).
 * Example: `/vs/pdoom.html` must not count as `/pdoom.html`.
 */
export function stripVsPrefixedPaths(txt, paths) {
  let body = String(txt || '');
  for (const p of paths) {
    const base = String(p || '').replace(/^\//, '');
    if (!base) continue;
    body = body.split(`/vs/${base}`).join('');
  }
  return body;
}

/**
 * True when an agent-map body lists the /pdoom.html short alias.
 * Wipe gap is `agents-pdoom-alias-missing` (FINDABILITY #130).
 * `/vs/pdoom.html` alone does not count (FINDABILITY #135).
 */
export function hasPdoomShortAlias(txt, alias = PDOOM_SHORT_ALIAS) {
  return stripVsPrefixedPaths(txt, [alias]).includes(alias);
}

/**
 * True when an agent-map body lists the /ai-activity-index.html short alias.
 * Wipe gap is `agents-activity-index-alias-missing` (FINDABILITY #252).
 */
export function hasActivityIndexAlias(txt, alias = ACTIVITY_INDEX_ALIAS) {
  return String(txt || '').includes(alias);
}

/**
 * True when an agent-map body lists the /ai-activity-level.html short alias.
 * Wipe gap is `agents-activity-level-alias-missing` (FINDABILITY #262).
 */
export function hasActivityLevelAlias(txt, alias = ACTIVITY_LEVEL_ALIAS) {
  return String(txt || '').includes(alias);
}

/**
 * True when an agent-map body names contiguous “AI activity level today”.
 * Wipe gap is `agents-activity-level-head-term-missing` (FINDABILITY #433).
 */
export function hasActivityLevelHeadTerm(txt, needle = ACTIVITY_LEVEL_HEAD_TERM_NEEDLE) {
  return String(txt || '').includes(needle);
}

/**
 * True when /agents.html names dual middot head terms (FINDABILITY #437).
 * Wipe gap is `agents-html-dual-head-term-missing`.
 */
export function hasAgentsHtmlDualHeadTerm(txt, needle = AGENTS_HTML_DUAL_HEAD_TERM_NEEDLE) {
  return String(txt || '').includes(needle);
}

/**
 * True when agents.txt / ai.txt name dual middot head terms (FINDABILITY #439).
 * Same needle as #437; wipe gap is `discovery-dual-head-term-missing`.
 */
export function hasDiscoveryDualHeadTerm(txt, needle = AGENTS_HTML_DUAL_HEAD_TERM_NEEDLE) {
  return hasAgentsHtmlDualHeadTerm(txt, needle);
}

/**
 * True when agents.json related.home_title names dual middot head terms
 * (FINDABILITY #441). Wipe gap is `agents-json-dual-head-term-missing`.
 */
export function hasAgentsJsonDualHeadTerm(body, needle = AGENTS_HTML_DUAL_HEAD_TERM_NEEDLE) {
  const raw = String(body || '');
  if (!raw.includes(needle)) return false;
  try {
    const j = JSON.parse(raw);
    const title = j?.related?.home_title;
    return typeof title === 'string' && title.includes(needle);
  } catch {
    return true;
  }
}

/**
 * True when openapi.json paths['/'] summary names dual middot head terms
 * (FINDABILITY #446). Wipe gap is `openapi-dual-head-term-missing`.
 * #441 shipped the summary; seo-daily only probed agents.json until #446.
 */
export function hasOpenapiDualHeadTerm(body, needle = AGENTS_HTML_DUAL_HEAD_TERM_NEEDLE) {
  const raw = String(body || '');
  if (!raw.includes(needle)) return false;
  try {
    const j = JSON.parse(raw);
    const summary = j?.paths?.['/']?.get?.summary;
    return typeof summary === 'string' && summary.includes(needle);
  } catch {
    return true;
  }
}

/**
 * True when api/index.json agents.home_title names dual middot head terms
 * (FINDABILITY #446). Wipe gap is `api-index-dual-head-term-missing`.
 */
export function hasApiIndexDualHeadTerm(body, needle = AGENTS_HTML_DUAL_HEAD_TERM_NEEDLE) {
  const raw = String(body || '');
  if (!raw.includes(needle)) return false;
  try {
    const j = JSON.parse(raw);
    const title = j?.agents?.home_title;
    return typeof title === 'string' && title.includes(needle);
  } catch {
    return true;
  }
}

/**
 * True when an agent-map body lists /classic.html (FINDABILITY #324).
 * Wipe gap is `agents-classic-panel-missing`.
 */
export function hasClassicPanelAgentMap(txt, path = CLASSIC_PANEL_AGENT_PATH) {
  return String(txt || '').includes(path);
}

/**
 * True when skill.md lists /classic.html (FINDABILITY #326).
 * Wipe gap is `skill-classic-panel-missing`.
 */
export function hasSkillClassicPanel(txt, path = CLASSIC_PANEL_AGENT_PATH) {
  const body = String(txt || '');
  return body.includes(path) && /Where is the full SIREN instrument panel\?/i.test(body);
}

/**
 * True when agents.txt / ai.txt list /classic.html with the panel question
 * (FINDABILITY #328). Wipe gap is `discovery-classic-panel-missing`.
 */
export function hasDiscoveryClassicPanel(txt, path = CLASSIC_PANEL_AGENT_PATH) {
  return hasSkillClassicPanel(txt, path);
}

/**
 * True when RFC 9727 api-catalog lists /classic.html (FINDABILITY #328).
 */
export function hasCatalogClassicPanel(body, path = CLASSIC_PANEL_AGENT_PATH) {
  const raw = String(body || '');
  if (!raw.includes(path) && !raw.includes(path.replace(/^\//, ''))) return false;
  try {
    const j = JSON.parse(raw);
    const items = j?.linkset?.[0]?.item;
    if (!Array.isArray(items)) return raw.includes(path);
    return items.some((it) => String(it?.href || '').includes(path));
  } catch {
    return raw.includes(path);
  }
}

/**
 * True when agents.json related.classic (+ question title) lists the panel
 * (FINDABILITY #330). Wipe gap is `agents-json-classic-panel-missing`.
 */
export function hasAgentsJsonClassicPanel(body, path = CLASSIC_PANEL_AGENT_PATH) {
  const raw = String(body || '');
  if (!raw.includes(path) && !raw.includes(path.replace(/^\//, ''))) return false;
  if (!/Where is the full SIREN instrument panel\?/i.test(raw)) return false;
  try {
    const j = JSON.parse(raw);
    const href = j?.related?.classic;
    if (typeof href !== 'string') return false;
    return href.includes(path) || href.endsWith(path) || href.includes('classic.html');
  } catch {
    return true;
  }
}

/**
 * True when openapi.json paths include /classic.html (FINDABILITY #330).
 * Wipe gap is `openapi-classic-panel-missing`.
 */
export function hasOpenapiClassicPanel(body, path = CLASSIC_PANEL_AGENT_PATH) {
  const raw = String(body || '');
  if (!raw.includes(path) && !raw.includes(`"${path}"`)) return false;
  try {
    const j = JSON.parse(raw);
    const entry = j?.paths?.[path];
    if (!entry?.get) return false;
    return /instrument panel/i.test(String(entry.get.summary || ''));
  } catch {
    return raw.includes(path) && /instrument panel/i.test(raw);
  }
}

/**
 * True when /api/index.json lists classic (FINDABILITY #330).
 */
export function hasApiIndexClassicPanel(body, path = CLASSIC_PANEL_AGENT_PATH) {
  const raw = String(body || '');
  if (!raw.includes(path) && !raw.includes(path.replace(/^\//, ''))) return false;
  try {
    const j = JSON.parse(raw);
    const agents = j?.agents?.classic;
    const endpoints = j?.endpoints?.classic;
    return (typeof agents === 'string' && agents.includes('classic'))
      || (typeof endpoints === 'string' && endpoints.includes('classic'));
  } catch {
    return raw.includes(path);
  }
}

/**
 * True when free-tools.html names dual middot head terms (FINDABILITY #443).
 * Wipe gap is `freetools-dual-head-term-missing`.
 */
export function hasFreeToolsDualHeadTerm(html, needle = AGENTS_HTML_DUAL_HEAD_TERM_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * True when verify.html names dual middot head terms (FINDABILITY #451).
 * Wipe gap is `verify-dual-head-term-missing`.
 */
export function hasVerifyDualHeadTerm(html, needle = AGENTS_HTML_DUAL_HEAD_TERM_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * True when compare.html names dual middot head terms (FINDABILITY #453).
 * Wipe gap is `compare-dual-head-term-missing` (paired with alternatives).
 */
export function hasCompareDualHeadTerm(html, needle = AGENTS_HTML_DUAL_HEAD_TERM_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * True when alternatives.html names dual middot head terms (FINDABILITY #453).
 * Wipe gap is `compare-dual-head-term-missing` (paired with compare).
 */
export function hasAlternativesDualHeadTerm(html, needle = AGENTS_HTML_DUAL_HEAD_TERM_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * True when pdoom.html (canonical /p-doom.html) names dual middot head terms
 * (FINDABILITY #455). Wipe gap is `pdoom-dual-head-term-missing`.
 */
export function hasPdoomDualHeadTerm(html, needle = AGENTS_HTML_DUAL_HEAD_TERM_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * True when ai-doomsday-clock.html names dual middot head terms
 * (FINDABILITY #455, shared nowLine). Wipe gap is `pdoom-dual-head-term-missing`.
 */
export function hasAiDoomsdayClockDualHeadTerm(html, needle = AGENTS_HTML_DUAL_HEAD_TERM_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * True when guide.html names dual middot head terms (FINDABILITY #457).
 * Wipe gap is `guide-dual-head-term-missing` (paired with guides).
 */
export function hasGuideDualHeadTerm(html, needle = AGENTS_HTML_DUAL_HEAD_TERM_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * True when guides.html names dual middot head terms (FINDABILITY #457).
 * Wipe gap is `guide-dual-head-term-missing` (paired with guide).
 */
export function hasGuidesDualHeadTerm(html, needle = AGENTS_HTML_DUAL_HEAD_TERM_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * True when bets.html names dual middot head terms (FINDABILITY #459).
 * Wipe gap is `desk-dual-head-term-missing` (paired with balance + self-aware).
 */
export function hasBetsDualHeadTerm(html, needle = AGENTS_HTML_DUAL_HEAD_TERM_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * True when balance.html names dual middot head terms (FINDABILITY #459).
 * Wipe gap is `desk-dual-head-term-missing` (paired with bets + self-aware).
 */
export function hasBalanceDualHeadTerm(html, needle = AGENTS_HTML_DUAL_HEAD_TERM_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * True when self-aware.html names dual middot head terms (FINDABILITY #459).
 * Wipe gap is `desk-dual-head-term-missing` (paired with bets + balance).
 */
export function hasSelfAwareDualHeadTerm(html, needle = AGENTS_HTML_DUAL_HEAD_TERM_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * True when videos.html names dual middot head terms (FINDABILITY #461).
 * Wipe gap is `videos-dual-head-term-missing`.
 */
export function hasVideosDualHeadTerm(html, needle = AGENTS_HTML_DUAL_HEAD_TERM_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * True when bliss.html names dual middot head terms (FINDABILITY #467).
 * Wipe gap is `bliss-dual-head-term-missing`.
 */
export function hasBlissDualHeadTerm(html, needle = AGENTS_HTML_DUAL_HEAD_TERM_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * True when press.html names dual middot head terms (FINDABILITY #469).
 * Wipe gap is `press-dual-head-term-missing`.
 */
export function hasPressDualHeadTerm(html, needle = AGENTS_HTML_DUAL_HEAD_TERM_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * True when a superseded move page names dual middot head terms (FINDABILITY #471).
 * Wipe gap is `moves-dual-head-term-missing`.
 */
export function hasMovesDualHeadTerm(html, needle = AGENTS_HTML_DUAL_HEAD_TERM_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * True when 404.html names dual middot head terms (FINDABILITY #473).
 * Wipe gap is `error-dual-head-term-missing` (paired with 500).
 */
export function hasNotFoundDualHeadTerm(html, needle = AGENTS_HTML_DUAL_HEAD_TERM_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * True when 500.html names dual middot head terms (FINDABILITY #473).
 * Wipe gap is `error-dual-head-term-missing` (paired with 404).
 */
export function hasServerErrorDualHeadTerm(html, needle = AGENTS_HTML_DUAL_HEAD_TERM_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * True when /kind/press.html names dual middot home-crumb head terms
 * (FINDABILITY #475 — homeCrumbName / BreadcrumbList). Wipe gap is
 * `crumb-dual-head-term-missing`.
 */
export function hasKindPressCrumbDualHeadTerm(html, needle = AGENTS_HTML_DUAL_HEAD_TERM_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * True when footer Pages (id=foot-pages) home link names dual middot head terms
 * (FINDABILITY #483 — layout SECTIONS home label; #485 in-place Publish preserve).
 * Scoped to foot-pages so a dual crumb (#475) cannot satisfy an index-only
 * footer. Wipe gap is `sections-dual-head-term-missing`.
 */
export function hasFooterSectionsDualHeadTerm(html, needle = AGENTS_HTML_DUAL_HEAD_TERM_NEEDLE) {
  const pages = String(html || '').match(/id="foot-pages"[\s\S]*?<\/ul>/);
  if (!pages) return false;
  return pages[0].includes(`href="/">${needle} · SIREN</a>`);
}

/**
 * True when /model/muse-spark.html names dual middot head terms (FINDABILITY #463).
 * Wipe gap is `model-dual-head-term-missing` (paired with fable).
 */
export function hasMuseSparkDualHeadTerm(html, needle = AGENTS_HTML_DUAL_HEAD_TERM_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * True when /model/fable.html names dual middot head terms (FINDABILITY #463).
 * Wipe gap is `model-dual-head-term-missing` (paired with muse-spark).
 */
export function hasFableDualHeadTerm(html, needle = AGENTS_HTML_DUAL_HEAD_TERM_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * True when /pillar/compute.html names dual middot head terms (FINDABILITY #465).
 * Wipe gap is `pillar-dual-head-term-missing` (paired with attention).
 */
export function hasPillarComputeDualHeadTerm(html, needle = AGENTS_HTML_DUAL_HEAD_TERM_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * True when /pillar/attention.html names dual middot head terms (FINDABILITY #465).
 * Wipe gap is `pillar-dual-head-term-missing` (paired with compute).
 */
export function hasPillarAttentionDualHeadTerm(html, needle = AGENTS_HTML_DUAL_HEAD_TERM_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * True when free-tools.html listicle lists /classic.html with the panel
 * question (FINDABILITY #332). Wipe gap is `freetools-classic-panel-missing`.
 */
export function hasFreeToolsClassicPanel(html, path = CLASSIC_PANEL_AGENT_PATH) {
  const body = String(html || '');
  return body.includes(path) && /Where is the full SIREN instrument panel\?/i.test(body);
}

/**
 * Root rival brand aliases (FINDABILITY #131) that agent maps must list
 * after #132. Canonical on matching /vs/* primaries.
 */
export const ROOT_RIVAL_AGENT_ALIASES = Object.freeze([
  '/doombench.html',
  '/skynet-countdown.html',
  '/pizzint.html',
  '/takeofftracker.html',
]);

/**
 * True when an agent-map body lists every root rival brand alias.
 * Wipe gap is `agents-root-rivals-missing` (FINDABILITY #132).
 * `/vs/<brand>.html` lines alone do not count (FINDABILITY #135).
 */
export function hasRootRivalAliases(txt, aliases = ROOT_RIVAL_AGENT_ALIASES) {
  const body = stripVsPrefixedPaths(txt, aliases);
  return aliases.every((p) => body.includes(p));
}

/**
 * Head-term typed-guess aliases (FINDABILITY #133) that agent maps must list
 * after #134. Canonical on guide / clock / compare primaries.
 */
export const HEAD_TERM_AGENT_ALIASES = Object.freeze([
  '/doomsday-clock.html',
  '/ai-doom.html',
  '/doom-index.html',
]);

/**
 * True when an agent-map body lists every #133 head-term short alias.
 * Wipe gap is `agents-head-aliases-missing` (FINDABILITY #134).
 */
export function hasHeadTermAliases(txt, aliases = HEAD_TERM_AGENT_ALIASES) {
  const body = String(txt || '');
  return aliases.every((p) => body.includes(p));
}

/**
 * Lab About-line head-term aliases in agent maps (FINDABILITY #138).
 * Only required when the map lists `/lab/openai.html` (llms.txt facets);
 * agents.md is a short entry and does not list lab URLs.
 * Wipe gap is `agents-lab-labels-missing` (FINDABILITY #139).
 */
export const LAB_ABOUT_AGENT_NEEDLE = 'OpenAI / ChatGPT';
export const LAB_ABOUT_AGENT_URL = '/lab/openai.html';

export function hasLabAboutLabels(
  txt,
  { url = LAB_ABOUT_AGENT_URL, needle = LAB_ABOUT_AGENT_NEEDLE } = {},
) {
  const body = String(txt || '');
  if (!body.includes(url)) return true;
  return body.includes(needle);
}

/**
 * /lab/ + /companies.html hub rows must keep #140 labAboutLabel
 * (FINDABILITY #141). Wipe gap is `lab-hub-labels-missing`.
 */
export const LAB_HUB_LABEL_PROBES = Object.freeze([
  { path: '/lab/', needle: LAB_ABOUT_AGENT_NEEDLE },
  { path: '/companies.html', needle: LAB_ABOUT_AGENT_NEEDLE },
]);

export function labHubLabelLags(byUrl, origin = 'https://siren.watch', probes = LAB_HUB_LABEL_PROBES) {
  const base = String(origin || '').replace(/\/$/, '');
  const out = [];
  for (const { path: rel, needle } of probes) {
    const row = byUrl.get(`${base}${rel}`);
    const body = row?.ok ? String(row.value || '') : '';
    // Only flag when the hub lists the OpenAI lab URL (gated set present).
    if (body.includes(LAB_ABOUT_AGENT_URL) && !body.includes(needle)) {
      out.push({ path: rel, needle });
    }
  }
  return out;
}

/**
 * Home Organization knowsAbout must keep #142 labAboutLabel
 * (FINDABILITY #143). Wipe gap is `home-knowsabout-labels-missing`.
 */
export function hasHomeLabAboutLabels(html, needle = LAB_ABOUT_AGENT_NEEDLE) {
  return String(html || '').includes(needle);
}

/** FINDABILITY #423 — home every-room + FAQ path for DoomBench conquest. */
export const HOME_DOOMBENCH_CONQUEST_NEEDLE = 'SIREN vs DoomBench: which should you use?';

/**
 * Home (and activity-index aliases) must keep the #423 DoomBench conquest link.
 * Wipe gap is `home-doombench-conquest-missing`.
 */
export function hasHomeDoombenchConquest(html, needle = HOME_DOOMBENCH_CONQUEST_NEEDLE) {
  return String(html || '').includes(needle);
}

/** FINDABILITY #425 — home every-room + FAQ path for Skynet Countdown conquest. */
export const HOME_SKYNET_CONQUEST_NEEDLE = 'SIREN vs Skynet Countdown: which should you use?';

/**
 * Home (and activity-index aliases) must keep the #425 Skynet conquest link.
 * Wipe gap is `home-skynet-conquest-missing`.
 */
export function hasHomeSkynetConquest(html, needle = HOME_SKYNET_CONQUEST_NEEDLE) {
  return String(html || '').includes(needle);
}

/** FINDABILITY #429 — home every-room + FAQ path for PizzINT conquest. */
export const HOME_PIZZINT_CONQUEST_NEEDLE = 'SIREN vs PizzINT: which should you use?';

/**
 * Home (and activity-index aliases) must keep the PizzINT conquest link.
 * Wipe gap is `home-pizzint-conquest-missing`.
 */
export function hasHomePizzintConquest(html, needle = HOME_PIZZINT_CONQUEST_NEEDLE) {
  return String(html || '').includes(needle);
}

/** FINDABILITY #429 — home every-room for Takeoff Tracker conquest. */
export const HOME_TAKEOFF_CONQUEST_NEEDLE = 'SIREN vs Takeoff Tracker: which should you use?';

/**
 * Home (and activity-index aliases) must keep the Takeoff Tracker conquest link.
 * Wipe gap is `home-takeoff-conquest-missing`.
 */
export function hasHomeTakeoffConquest(html, needle = HOME_TAKEOFF_CONQUEST_NEEDLE) {
  return String(html || '').includes(needle);
}

/** FINDABILITY #254 — exact unbranded head-term FAQ on home (+ alias body). */
export const HOME_ACTIVITY_INDEX_FAQ_NEEDLE = 'What is an AI activity index?';

/**
 * Home (and /ai-activity-index alias) must keep the #254 head-term FAQ.
 * Wipe gap is `home-activity-index-faq-missing`.
 */
export function hasHomeActivityIndexFaq(html, needle = HOME_ACTIVITY_INDEX_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/** FINDABILITY #284 — exact title head-term FAQ (“AI activity index today”). */
export const HOME_ACTIVITY_INDEX_TODAY_FAQ_NEEDLE = 'What is the AI activity index today?';

/**
 * Home must keep the #284 title-match FAQ beside #254 definitional.
 * Wipe gap is `home-activity-index-today-faq-missing`.
 */
export function hasHomeActivityIndexTodayFaq(html, needle = HOME_ACTIVITY_INDEX_TODAY_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/** FINDABILITY #264 — #262 level-alias FAQ prose on home (+ alias bodies). */
export const HOME_ACTIVITY_LEVEL_FAQ_ALIAS_NEEDLE = '/ai-activity-level.html is a short alias';

/**
 * Home must keep the #262 level-alias mention inside the activity-level FAQ.
 * Wipe gap is `home-activity-level-faq-alias-missing`.
 */
export function hasHomeActivityLevelFaqAlias(html, needle = HOME_ACTIVITY_LEVEL_FAQ_ALIAS_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * FINDABILITY #296 — dual head-term <title> middot form (description uses
 * “AI activity level today:” with a colon — do not match that).
 */
export const HOME_ACTIVITY_LEVEL_TITLE_NEEDLE = 'AI activity level today ·';

/**
 * Home <title> must keep contiguous “AI activity level today ·” beside index.
 * Wipe gap is `home-activity-level-title-missing`.
 */
export function hasHomeActivityLevelTitle(html, needle = HOME_ACTIVITY_LEVEL_TITLE_NEEDLE) {
  const title = extractTitle(html);
  return String(title || '').includes(needle);
}

/**
 * FINDABILITY #308 — home H1 .v2-sr carries both head terms beside the brand
 * pixel mark (title already has them via #296; H1 was brand-only).
 */
export const HOME_ACTIVITY_H1_HEAD_TERMS_NEEDLE =
  'AI activity index today · AI activity level today · AI SIREN INDEX';

/**
 * Home H1 screen-reader / crawler text must keep dual head terms.
 * Wipe gap is `home-activity-h1-head-terms-missing`.
 */
export function hasHomeActivityH1HeadTerms(html, needle = HOME_ACTIVITY_H1_HEAD_TERMS_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * FINDABILITY #312/#314 — home <title> must drop level_name (ROUTINE etc.)
 * so both head terms survive Google’s ~60-char SERP rewrite. Body scale copy
 * still says ROUTINE; only the <title> is checked.
 */
export const HOME_TITLE_LEVEL_NAME_RE =
  /\b(?:DORMANT|ROUTINE|ELEVATED|ACCELERATED|UNPRECEDENTED|UNAVAILABLE)\b/;

/**
 * Home <title> keeps dual head terms (#296) without a level_name token (#312)
 * and without a decimal score (#316 — description carries the reading).
 * Wipe gap is `home-activity-title-trim-missing`.
 */
export function hasHomeTitleTrimmed(html) {
  const title = extractTitle(html);
  if (!title.includes(HOME_ACTIVITY_LEVEL_TITLE_NEEDLE)) return false;
  if (HOME_TITLE_LEVEL_NAME_RE.test(title)) return false;
  // FINDABILITY #316 — score in <title> pushes past Google’s ~60-char rewrite.
  if (/\b\d+\.\d+\b/.test(title)) return false;
  return true;
}

/**
 * FINDABILITY #318 — /classic.html must ship the instrument-panel title and
 * its own canonical (build used to write view=home into classic.html).
 */
export const CLASSIC_PANEL_TITLE_NEEDLE = 'Where is the full SIREN instrument panel?';
export const CLASSIC_PANEL_CANONICAL_NEEDLE =
  'rel="canonical" href="https://siren.watch/classic.html"';

/**
 * Classic panel page keeps question title + own canonical.
 * Wipe gap is `classic-panel-missing`.
 */
export function hasClassicPanel(html) {
  const body = String(html || '');
  const title = extractTitle(body);
  if (!String(title || '').includes(CLASSIC_PANEL_TITLE_NEEDLE)) return false;
  if (!body.includes(CLASSIC_PANEL_CANONICAL_NEEDLE)) return false;
  return true;
}

/**
 * FINDABILITY #322 — sitemap.xml must list /classic.html (newsroom orphan
 * dropped the loc after tip #318). Wipe gap is `classic-sitemap-missing`.
 */
export function hasClassicSitemapLoc(xml) {
  return /<loc>\s*https:\/\/siren\.watch\/classic\.html\s*<\/loc>/i.test(String(xml || ''));
}

/**
 * /race.html leaderboard lab links must keep #144 labAboutLabel
 * (OpenAI / ChatGPT etc.). Wipe gap is `race-lab-labels-missing`.
 */
export function hasRaceLabAboutLabels(
  html,
  { url = LAB_ABOUT_AGENT_URL, needle = LAB_ABOUT_AGENT_NEEDLE } = {},
) {
  const body = String(html || '');
  if (!body.includes(url)) return true;
  return body.includes(needle);
}

/**
 * Conquest FAQ needles that must stay on tip after #126/#127 (FINDABILITY #128).
 * Orphan news-fast tars can wipe overlay hubs back to a stale seed.
 */
export const CONQUEST_FAQ_PROBES = Object.freeze([
  { path: '/compare.html', needle: 'How do you compare AI doom indexes?' },
  { path: '/alternatives.html', needle: 'What is an AI doom index alternative?' },
]);

/** FINDABILITY #152/#153 — Watts FAQ + agent maps for IREN / AI-cloud Trends. */
export const WATTS_IREN_FAQ_NEEDLE = 'Why does SIREN watch IREN stock and AI cloud power in Google Search Trends?';
export const AGENTS_IREN_WATTS_NEEDLE = 'IREN stock';

/** Tip /watts.html must keep the #152 IREN Trends FAQ (FINDABILITY #153). */
export function hasWattsIrenFaq(html, needle = WATTS_IREN_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route IREN / AI-cloud Trends to Watts (FINDABILITY #153).
 * Wipe gap is `agents-iren-watts-missing`.
 */
export function hasAgentsIrenWatts(body, needle = AGENTS_IREN_WATTS_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/watts.html');
}

/** FINDABILITY #151/#154 — Micron lab FAQ + agent maps for dram / memory Trends. */
export const MICRON_DRAM_FAQ_NEEDLE = 'Why does SIREN watch Micron stock, MU, and DRAM stock in Google Search Trends?';
export const AGENTS_MICRON_DRAM_NEEDLE = 'dram stock';

/** Tip /lab/micron.html must keep the #151 DRAM Trends FAQ (FINDABILITY #154). */
export function hasMicronDramFaq(html, needle = MICRON_DRAM_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route dram / Micron stock Trends to Micron lab (FINDABILITY #154).
 * Wipe gap is `agents-micron-dram-missing`.
 */
export function hasAgentsMicronDram(body, needle = AGENTS_MICRON_DRAM_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/lab/micron.html');
}

/** FINDABILITY #155 — CoreWeave lab FAQ + agent maps for CoreWeave stock Trends. */
// FINDABILITY #288 — title matches CRWV ticker (parallel to Nvidia / NVDA #161).
export const COREWEAVE_STOCK_FAQ_NEEDLE = 'Why does SIREN watch CoreWeave stock and CRWV in Google Search Trends?';
/** FINDABILITY #160 — CoreWeave debt / bond-yield FAQ on the same gated lab. */
export const COREWEAVE_DEBT_FAQ_NEEDLE = 'Why does SIREN watch CoreWeave debt and bond yields in Google Search Trends?';
// FINDABILITY #288 — prefer CRWV ticker tip (parallel to NVDA Trends #161);
// keep matching CoreWeave stock for tip transition after FAQ retitle.
export const AGENTS_COREWEAVE_NEEDLE = 'CRWV Trends';

/** Tip /lab/coreweave.html must keep the #155 CoreWeave Trends FAQ. */
export function hasCoreweaveStockFaq(html, needle = COREWEAVE_STOCK_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/** Tip /lab/coreweave.html must keep the #160 CoreWeave debt / bond FAQ. */
export function hasCoreweaveDebtFaq(html, needle = COREWEAVE_DEBT_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route CoreWeave stock Trends to CoreWeave lab (FINDABILITY #155).
 * Wipe gap is `agents-coreweave-missing`.
 */
export function hasAgentsCoreweave(body, needle = AGENTS_COREWEAVE_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/lab/coreweave.html');
}

/** FINDABILITY #157 — Neoclouds tag FAQ + agent maps for neocloud Trends. */
export const NEOCLOUD_FAQ_NEEDLE = 'Why does SIREN watch neocloud and neoclouds in Google Search Trends?';
/** Shared substring in agents.md (“neocloud / neoclouds Trends”) and llms tip. */
export const AGENTS_NEOCLOUD_NEEDLE = 'neoclouds Trends';

/** Tip /tags/neoclouds.html must keep the #157 neocloud Trends FAQ. */
export function hasNeocloudFaq(html, needle = NEOCLOUD_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route neocloud Trends to Neoclouds tag (FINDABILITY #157).
 * Wipe gap is `agents-neocloud-missing`.
 */
export function hasAgentsNeocloud(body, needle = AGENTS_NEOCLOUD_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/tags/neoclouds.html');
}

/** FINDABILITY #158 — Search Trends watchlist FAQ routes stock / neocloud spikes. */
export const TRENDS_ROUTES_FAQ_NEEDLE = 'Where does SIREN send IREN stock, dram stock, CoreWeave stock, and neocloud Trends?';
/** FINDABILITY #166 — latest head destinations must stay on the routing answer. */
export const TRENDS_ROUTES_ASML_NEEDLE = 'ASML / EUV AI chip tools → /lab/asml.html';
export const TRENDS_ROUTES_TSMC_NEEDLE = 'TSMC / AI foundry → /lab/tsmc.html';
export const TRENDS_ROUTES_AMAZON_BEE_NEEDLE = 'Amazon Bee / AI wearables → /lab/amazon.html';
export const TRENDS_ROUTES_META_MUSE_NEEDLE = 'Meta Muse / open-weight AI → /lab/meta.html';
export const TRENDS_ROUTES_META_APPLE_MAC_NEEDLE = 'Meta–Apple Mac AI / Muse on Mac → /lab/meta.html';
export const TRENDS_ROUTES_APPLE_INTELLIGENCE_NEEDLE = 'Apple Intelligence → /lab/apple.html';
export const TRENDS_ROUTES_MICROSOFT_COPILOT_NEEDLE = 'Microsoft Copilot → /lab/microsoft.html';
export const TRENDS_ROUTES_MICROSOFT_MAI_NEEDLE = 'Microsoft MAI-Base / MAI-Base-2 → /lab/microsoft.html';
/** FINDABILITY #414 — Surface Laptop Ultra / on-device AI laptop → gated Microsoft lab. */
export const TRENDS_ROUTES_SURFACE_ULTRA_NEEDLE = 'Surface Laptop Ultra → /lab/microsoft.html';
export const TRENDS_WATCHLIST_SURFACE_ULTRA_NEEDLE = '<td>Surface Laptop Ultra</td>';
/** FINDABILITY #418 — DeepSeek V4.1 Flash product-class → gated DeepSeek lab. */
export const TRENDS_ROUTES_DEEPSEEK_FLASH_NEEDLE = 'DeepSeek V4.1 Flash → /lab/deepseek.html';
export const TRENDS_WATCHLIST_DEEPSEEK_FLASH_NEEDLE = '<td>DeepSeek V4.1 Flash</td>';
export const TRENDS_ROUTES_XAI_GROK_NEEDLE = 'Grok / xAI → /lab/xai.html';
export const TRENDS_ROUTES_GEMINI_GEMMA_NEEDLE = 'Gemini / Gemma / Argon → /lab/google-deepmind.html';
export const TRENDS_ROUTES_SAMSUNG_HBM_NEEDLE = 'Samsung / HBM / AI memory → /lab/samsung.html';
export const TRENDS_ROUTES_SAMSUNG_GLASSES_NEEDLE = 'Samsung AI glasses → /lab/samsung.html';
export const TRENDS_ROUTES_CHARACTER_AI_NEEDLE = 'Character.ai bankruptcy → /tags/chatbots.html';
/** FINDABILITY #410 — CERT-In / India AI-agent cyber → gated agents tag. */
export const TRENDS_ROUTES_CERT_IN_NEEDLE = 'CERT-In → /tags/agents.html';
export const TRENDS_WATCHLIST_CERT_IN_NEEDLE = '<td>CERT-In</td>';
export const TRENDS_ROUTES_QWEN_NEEDLE = 'Qwen / Alibaba open models → /lab/qwen.html';
export const TRENDS_ROUTES_ORACLE_DATACENTERS_NEEDLE = 'Oracle / AI datacenters → /tags/datacenters.html';
export const TRENDS_ROUTES_DEEPSEEK_NEEDLE = 'DeepSeek outage → /lab/deepseek.html';
export const TRENDS_ROUTES_MISTRAL_NEEDLE = 'Mistral / Timestral → /lab/mistral.html';
export const TRENDS_ROUTES_OPENAI_OUTAGE_NEEDLE = 'OpenAI outage → /lab/openai.html';
export const TRENDS_ROUTES_OPENAI_CHROME_NEEDLE = 'ChatGPT Chrome / computer use → /lab/openai.html';
export const TRENDS_ROUTES_ANTHROPIC_AI_SAFETY_BILL_NEEDLE = 'Anthropic AI safety bill → /lab/anthropic.html';
export const TRENDS_ROUTES_ANTHROPIC_CANADA_DC_NEEDLE = 'Anthropic Canadian data centres → /lab/anthropic.html';
export const TRENDS_ROUTES_ANTHROPIC_METR_NEEDLE = 'Anthropic METR → /lab/anthropic.html';
export const TRENDS_ROUTES_ANTHROPIC_ECDSA_NEEDLE = 'Anthropic ECDSA → /lab/anthropic.html';
export const TRENDS_ROUTES_CLAUDE_OPUS_55_NEEDLE = 'Claude Opus 5.5 → /lab/anthropic.html';
export const TRENDS_ROUTES_BLACKSTONE_ANTHROPIC_NEEDLE = 'Blackstone / Anthropic → /lab/anthropic.html';
export const TRENDS_ROUTES_REPLIT_ANTHROPIC_NEEDLE = 'Replit / Anthropic → /lab/anthropic.html';
/** FINDABILITY #420 — Claude Mythos 5 product-class → gated Anthropic lab. */
export const TRENDS_ROUTES_CLAUDE_MYTHOS_5_NEEDLE = 'Claude Mythos 5 → /lab/anthropic.html';
/** FINDABILITY #400 — watchlist table row (distinct from FAQ arrow text; tip #399 wipe). */
export const TRENDS_WATCHLIST_ANTHROPIC_ECDSA_NEEDLE = '<td>Anthropic ECDSA</td>';
export const TRENDS_WATCHLIST_ANTHROPIC_METR_NEEDLE = '<td>Anthropic METR</td>';
export const TRENDS_WATCHLIST_CLAUDE_OPUS_55_NEEDLE = '<td>Claude Opus 5.5</td>';
/** FINDABILITY #408 — watchlist table row (distinct from FAQ arrow text). */
export const TRENDS_WATCHLIST_BLACKSTONE_ANTHROPIC_NEEDLE = '<td>Blackstone / Anthropic</td>';
/** FINDABILITY #412 — watchlist table row (distinct from FAQ arrow text). */
export const TRENDS_WATCHLIST_REPLIT_ANTHROPIC_NEEDLE = '<td>Replit / Anthropic</td>';
/** FINDABILITY #420 — watchlist table row (distinct from FAQ arrow text). */
export const TRENDS_WATCHLIST_CLAUDE_MYTHOS_5_NEEDLE = '<td>Claude Mythos 5</td>';
export const TRENDS_ROUTES_HUGGINGFACE_NEEDLE = 'Hugging Face hack → /tags/huggingface.html';
export const TRENDS_ROUTES_PALANTIR_NEEDLE = 'Palantir / AIP → /lab/palantir.html';
export const TRENDS_ROUTES_ONDAS_PALANTIR_NEEDLE = 'Ondas / Palantir → /lab/palantir.html';
/** FINDABILITY #406 — watchlist table row (distinct from FAQ arrow text). */
export const TRENDS_WATCHLIST_ONDAS_PALANTIR_NEEDLE = '<td>Ondas / Palantir</td>';
export const TRENDS_ROUTES_AMD_NEEDLE = 'AMD / MI300 → /lab/amd.html';
export const TRENDS_ROUTES_TESLA_NEEDLE = 'Tesla / FSD → /lab/tesla.html';
export const TRENDS_ROUTES_WAYMO_CANADA_NEEDLE = 'Waymo Canada / Toronto robotaxi → /lab/waymo.html';
export const TRENDS_ROUTES_SOFTBANK_ALLIED_NEEDLE = 'SoftBank / Allied Universal → /lab/softbank.html';
export const TRENDS_ROUTES_SPACEX_STARSHIELD_NEEDLE = 'SpaceX / Starshield → /lab/spacex.html';
export const TRENDS_ROUTES_TESLA_FLYING_ROADSTER_NEEDLE = 'Tesla Flying Roadster → /lab/tesla.html';

/**
 * Tip /search-trends.html must keep the #158 routing FAQ and #164/#165/#167/#169/#170/#171/#173/#174/#175/#176/#177/#178/#179/#180
 * destinations (FINDABILITY #166 — newsroom used to keep the question while dropping newer answer destinations).
 */
export function hasTrendsRoutesFaq(html, needle = TRENDS_ROUTES_FAQ_NEEDLE) {
  const text = String(html || '');
  return text.includes(needle)
    && text.includes(TRENDS_ROUTES_ASML_NEEDLE)
    && text.includes(TRENDS_ROUTES_TSMC_NEEDLE)
    && text.includes(TRENDS_ROUTES_AMAZON_BEE_NEEDLE)
    && text.includes(TRENDS_ROUTES_META_MUSE_NEEDLE)
    && text.includes(TRENDS_ROUTES_META_APPLE_MAC_NEEDLE)
    && text.includes(TRENDS_ROUTES_APPLE_INTELLIGENCE_NEEDLE)
    && text.includes(TRENDS_ROUTES_MICROSOFT_COPILOT_NEEDLE)
    && text.includes(TRENDS_ROUTES_MICROSOFT_MAI_NEEDLE)
    && text.includes(TRENDS_ROUTES_SURFACE_ULTRA_NEEDLE)
    && text.includes(TRENDS_WATCHLIST_SURFACE_ULTRA_NEEDLE)
    && text.includes(TRENDS_ROUTES_XAI_GROK_NEEDLE)
    && text.includes(TRENDS_ROUTES_GEMINI_GEMMA_NEEDLE)
    && text.includes(TRENDS_ROUTES_SAMSUNG_HBM_NEEDLE)
    && text.includes(TRENDS_ROUTES_SAMSUNG_GLASSES_NEEDLE)
    && text.includes(TRENDS_ROUTES_CHARACTER_AI_NEEDLE)
    && text.includes(TRENDS_ROUTES_CERT_IN_NEEDLE)
    && text.includes(TRENDS_WATCHLIST_CERT_IN_NEEDLE)
    && text.includes(TRENDS_ROUTES_QWEN_NEEDLE)
    && text.includes(TRENDS_ROUTES_ORACLE_DATACENTERS_NEEDLE)
    && text.includes(TRENDS_ROUTES_DEEPSEEK_NEEDLE)
    && text.includes(TRENDS_ROUTES_DEEPSEEK_FLASH_NEEDLE)
    && text.includes(TRENDS_WATCHLIST_DEEPSEEK_FLASH_NEEDLE)
    && text.includes(TRENDS_ROUTES_MISTRAL_NEEDLE)
    && text.includes(TRENDS_ROUTES_OPENAI_OUTAGE_NEEDLE)
    && text.includes(TRENDS_ROUTES_OPENAI_CHROME_NEEDLE)
    && text.includes(TRENDS_ROUTES_ANTHROPIC_AI_SAFETY_BILL_NEEDLE)
    && text.includes(TRENDS_ROUTES_ANTHROPIC_CANADA_DC_NEEDLE)
    && text.includes(TRENDS_ROUTES_ANTHROPIC_METR_NEEDLE)
    && text.includes(TRENDS_ROUTES_ANTHROPIC_ECDSA_NEEDLE)
    && text.includes(TRENDS_ROUTES_CLAUDE_OPUS_55_NEEDLE)
    && text.includes(TRENDS_ROUTES_BLACKSTONE_ANTHROPIC_NEEDLE)
    && text.includes(TRENDS_ROUTES_REPLIT_ANTHROPIC_NEEDLE)
    && text.includes(TRENDS_ROUTES_CLAUDE_MYTHOS_5_NEEDLE)
    // FINDABILITY #400 — table rows must survive tip overlays (FAQ arrows alone are not enough).
    && text.includes(TRENDS_WATCHLIST_ANTHROPIC_ECDSA_NEEDLE)
    && text.includes(TRENDS_WATCHLIST_ANTHROPIC_METR_NEEDLE)
    && text.includes(TRENDS_WATCHLIST_CLAUDE_OPUS_55_NEEDLE)
    && text.includes(TRENDS_WATCHLIST_BLACKSTONE_ANTHROPIC_NEEDLE)
    && text.includes(TRENDS_WATCHLIST_REPLIT_ANTHROPIC_NEEDLE)
    && text.includes(TRENDS_WATCHLIST_CLAUDE_MYTHOS_5_NEEDLE)
    && text.includes(TRENDS_ROUTES_HUGGINGFACE_NEEDLE)
    && text.includes(TRENDS_ROUTES_PALANTIR_NEEDLE)
    && text.includes(TRENDS_ROUTES_ONDAS_PALANTIR_NEEDLE)
    && text.includes(TRENDS_WATCHLIST_ONDAS_PALANTIR_NEEDLE)
    && text.includes(TRENDS_ROUTES_AMD_NEEDLE)
    && text.includes(TRENDS_ROUTES_TESLA_NEEDLE)
    && text.includes(TRENDS_ROUTES_WAYMO_CANADA_NEEDLE)
    && text.includes(TRENDS_ROUTES_SOFTBANK_ALLIED_NEEDLE)
    && text.includes(TRENDS_ROUTES_SPACEX_STARSHIELD_NEEDLE)
    && text.includes(TRENDS_ROUTES_TESLA_FLYING_ROADSTER_NEEDLE);
}

/** FINDABILITY #161 — NVIDIA lab FAQ + agent maps for Nvidia / NVDA Trends. */
export const NVIDIA_NVDA_FAQ_NEEDLE = 'Why does SIREN watch Nvidia stock and NVDA in Google Search Trends?';
export const AGENTS_NVIDIA_NEEDLE = 'NVDA Trends';

/** Tip /lab/nvidia.html must keep the #161 Nvidia / NVDA Trends FAQ. */
export function hasNvidiaNvdaFaq(html, needle = NVIDIA_NVDA_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route Nvidia / NVDA Trends to Nvidia lab (FINDABILITY #161).
 * Wipe gap is `agents-nvidia-missing`.
 */
export function hasAgentsNvidia(body, needle = AGENTS_NVIDIA_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/lab/nvidia.html');
}

/** FINDABILITY #162 — OpenAI lab FAQ + agent maps for lawsuit / FTC tape. */
export const OPENAI_LAWSUIT_FAQ_NEEDLE = 'Why does SIREN watch OpenAI lawsuits and FTC probes?';
export const AGENTS_OPENAI_LAWSUIT_NEEDLE = 'OpenAI lawsuit';

/** Tip /lab/openai.html must keep the #162 OpenAI lawsuit / FTC FAQ. */
export function hasOpenaiLawsuitFaq(html, needle = OPENAI_LAWSUIT_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route OpenAI lawsuit / FTC tape to OpenAI lab (FINDABILITY #162).
 * Wipe gap is `agents-openai-lawsuit-missing`.
 */
export function hasAgentsOpenaiLawsuit(body, needle = AGENTS_OPENAI_LAWSUIT_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/lab/openai.html');
}

/** FINDABILITY #163 — Anthropic lab FAQ + agent maps for IPO / FTC tape. */
export const ANTHROPIC_IPO_FAQ_NEEDLE = 'Why does SIREN watch Anthropic IPO and FTC probes?';
export const AGENTS_ANTHROPIC_IPO_NEEDLE = 'Anthropic IPO';

/** Tip /lab/anthropic.html must keep the #163 Anthropic IPO / FTC FAQ. */
export function hasAnthropicIpoFaq(html, needle = ANTHROPIC_IPO_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route Anthropic IPO / FTC tape to Anthropic lab (FINDABILITY #163).
 * Wipe gap is `agents-anthropic-ipo-missing`.
 */
export function hasAgentsAnthropicIpo(body, needle = AGENTS_ANTHROPIC_IPO_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/lab/anthropic.html');
}

/** FINDABILITY #164 — ASML lab FAQ + agent maps for EUV / AI chip-tool Trends. */
export const ASML_TRENDS_FAQ_NEEDLE = 'Why does SIREN watch ASML in Google Search Trends?';
export const AGENTS_ASML_NEEDLE = 'ASML stock';

/** Tip /lab/asml.html must keep the #164 ASML Trends FAQ. */
export function hasAsmlTrendsFaq(html, needle = ASML_TRENDS_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route ASML / EUV Trends to ASML lab (FINDABILITY #164).
 * Wipe gap is `agents-asml-missing`.
 * Needle `ASML stock` appears in both llms tip and agents.md list forms.
 */
export function hasAgentsAsml(body, needle = AGENTS_ASML_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/lab/asml.html');
}

/** FINDABILITY #165 — TSMC lab FAQ + agent maps for AI foundry Trends. */
export const TSMC_TRENDS_FAQ_NEEDLE = 'Why does SIREN watch TSMC in Google Search Trends?';
export const AGENTS_TSMC_NEEDLE = 'TSMC stock';

/** Tip /lab/tsmc.html must keep the #165 TSMC Trends FAQ. */
export function hasTsmcTrendsFaq(html, needle = TSMC_TRENDS_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route TSMC / AI foundry Trends to TSMC lab (FINDABILITY #165).
 * Wipe gap is `agents-tsmc-missing`.
 * Needle `TSMC stock` appears in both llms tip and agents.md list forms.
 */
export function hasAgentsTsmc(body, needle = AGENTS_TSMC_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/lab/tsmc.html');
}

/** FINDABILITY #167 — Amazon lab FAQ + agent maps for Bee / wearable AI Trends. */
export const AMAZON_BEE_FAQ_NEEDLE = 'Why does SIREN watch Amazon Bee and AI wearables?';
export const AGENTS_AMAZON_BEE_NEEDLE = 'Amazon Bee';

/** Tip /lab/amazon.html must keep the #167 Amazon Bee FAQ. */
export function hasAmazonBeeFaq(html, needle = AMAZON_BEE_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route Amazon Bee / wearable AI Trends to Amazon lab (FINDABILITY #167).
 * Wipe gap is `agents-amazon-bee-missing`.
 */
export function hasAgentsAmazonBee(body, needle = AGENTS_AMAZON_BEE_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/lab/amazon.html');
}

/** FINDABILITY #169 — Meta Muse / open-weight AI FAQ + agent maps. */
export const META_MUSE_FAQ_NEEDLE = 'Why does SIREN watch Meta Muse and open-weight AI?';
export const AGENTS_META_MUSE_NEEDLE = 'Meta Muse';

/** Tip /lab/meta.html must keep the #169 Meta Muse FAQ. */
export function hasMetaMuseFaq(html, needle = META_MUSE_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route Meta Muse / open-weight AI Trends to Meta lab (FINDABILITY #169).
 * Wipe gap is `agents-meta-muse-missing`.
 */
export function hasAgentsMetaMuse(body, needle = AGENTS_META_MUSE_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/lab/meta.html');
}

/** FINDABILITY #170 — Apple Intelligence FAQ + agent maps. */
export const APPLE_INTELLIGENCE_FAQ_NEEDLE = 'Why does SIREN watch Apple Intelligence?';
export const AGENTS_APPLE_INTELLIGENCE_NEEDLE = 'Apple Intelligence';

/** Tip /lab/apple.html must keep the #170 Apple Intelligence FAQ. */
export function hasAppleIntelligenceFaq(html, needle = APPLE_INTELLIGENCE_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route Apple Intelligence Trends to Apple lab (FINDABILITY #170).
 * Wipe gap is `agents-apple-intelligence-missing`.
 */
export function hasAgentsAppleIntelligence(body, needle = AGENTS_APPLE_INTELLIGENCE_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/lab/apple.html');
}

/** FINDABILITY #171 — Microsoft Copilot FAQ + agent maps. */
export const MICROSOFT_COPILOT_FAQ_NEEDLE = 'Why does SIREN watch Microsoft Copilot?';
export const AGENTS_MICROSOFT_COPILOT_NEEDLE = 'Microsoft Copilot';

/** Tip /lab/microsoft.html must keep the #171 Microsoft Copilot FAQ. */
export function hasMicrosoftCopilotFaq(html, needle = MICROSOFT_COPILOT_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route Microsoft Copilot Trends to Microsoft lab (FINDABILITY #171).
 * Wipe gap is `agents-microsoft-copilot-missing`.
 */
export function hasAgentsMicrosoftCopilot(body, needle = AGENTS_MICROSOFT_COPILOT_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/lab/microsoft.html');
}

/** FINDABILITY #220 — Microsoft MAI-Base FAQ + agent maps (same gated lab as #171). */
export const MICROSOFT_MAI_FAQ_NEEDLE = 'Why does SIREN watch Microsoft MAI-Base?';
export const AGENTS_MICROSOFT_MAI_NEEDLE = 'Microsoft MAI-Base';

/** Tip /lab/microsoft.html must keep the #220 Microsoft MAI-Base FAQ. */
export function hasMicrosoftMaiFaq(html, needle = MICROSOFT_MAI_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route MAI-Base / MAI-Base-2 tape to Microsoft lab (FINDABILITY #220).
 * Wipe gap is `agents-microsoft-mai-missing`.
 */
export function hasAgentsMicrosoftMai(body, needle = AGENTS_MICROSOFT_MAI_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/lab/microsoft.html');
}

/** FINDABILITY #414 — Surface Laptop Ultra FAQ + agent maps (same gated lab as #171/#220). */
export const SURFACE_ULTRA_FAQ_NEEDLE = 'Why does SIREN watch Surface Laptop Ultra?';
export const AGENTS_SURFACE_ULTRA_NEEDLE = 'Surface Laptop Ultra';

/** Tip /lab/microsoft.html must keep the #414 Surface Laptop Ultra FAQ. */
export function hasSurfaceUltraFaq(html, needle = SURFACE_ULTRA_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route Surface Laptop Ultra tape to Microsoft lab (FINDABILITY #414).
 * Wipe gap is `agents-surface-ultra-missing`.
 */
export function hasAgentsSurfaceUltra(body, needle = AGENTS_SURFACE_ULTRA_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/lab/microsoft.html');
}

/** FINDABILITY #418 — DeepSeek V4.1 Flash FAQ + agent maps (same gated lab as #179). */
export const DEEPSEEK_FLASH_FAQ_NEEDLE = 'Why does SIREN watch DeepSeek V4.1 Flash?';
export const AGENTS_DEEPSEEK_FLASH_NEEDLE = 'DeepSeek V4.1 Flash';

/** Tip /lab/deepseek.html must keep the #418 DeepSeek V4.1 Flash FAQ. */
export function hasDeepseekFlashFaq(html, needle = DEEPSEEK_FLASH_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route DeepSeek V4.1 Flash tape to DeepSeek lab (FINDABILITY #418).
 * Wipe gap is `agents-deepseek-flash-missing`.
 */
export function hasAgentsDeepseekFlash(body, needle = AGENTS_DEEPSEEK_FLASH_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/lab/deepseek.html');
}


/** FINDABILITY #173 — xAI / Grok FAQ + agent maps. */
export const XAI_GROK_FAQ_NEEDLE = 'Why does SIREN watch Grok and xAI?';
export const AGENTS_XAI_GROK_NEEDLE = 'Grok / xAI';

/** Tip /lab/xai.html must keep the #173 Grok / xAI FAQ. */
export function hasXaiGrokFaq(html, needle = XAI_GROK_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route Grok / xAI Trends to xAI lab (FINDABILITY #173).
 * Wipe gap is `agents-xai-grok-missing`.
 */
export function hasAgentsXaiGrok(body, needle = AGENTS_XAI_GROK_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/lab/xai.html');
}

/** FINDABILITY #174/#187 — Gemini / Gemma / Argon FAQ + agent maps. */
export const GEMINI_GEMMA_FAQ_NEEDLE = 'Why does SIREN watch Gemini, Gemma, and Argon?';
export const AGENTS_GEMINI_GEMMA_NEEDLE = 'Gemini / Gemma / Argon';

/** Tip /lab/google-deepmind.html must keep the #174/#187 Gemini / Gemma / Argon FAQ. */
export function hasGeminiGemmaFaq(html, needle = GEMINI_GEMMA_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route Gemini / Gemma Trends to DeepMind lab (FINDABILITY #174).
 * Wipe gap is `agents-gemini-gemma-missing`.
 */
export function hasAgentsGeminiGemma(body, needle = AGENTS_GEMINI_GEMMA_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/lab/google-deepmind.html');
}

/** FINDABILITY #175 — Samsung / HBM / AI memory FAQ + agent maps. */
export const SAMSUNG_HBM_FAQ_NEEDLE = 'Why does SIREN watch Samsung and AI memory chips?';
export const AGENTS_SAMSUNG_HBM_NEEDLE = 'Samsung / AI memory';

/** Tip /lab/samsung.html must keep the #175 Samsung / HBM FAQ. */
export function hasSamsungHbmFaq(html, needle = SAMSUNG_HBM_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route Samsung / AI memory Trends to Samsung lab (FINDABILITY #175).
 * Wipe gap is `agents-samsung-hbm-missing`.
 */
export function hasAgentsSamsungHbm(body, needle = AGENTS_SAMSUNG_HBM_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/lab/samsung.html');
}

/** FINDABILITY #195 — Samsung AI glasses FAQ + agent maps (same lab as HBM #175). */
export const SAMSUNG_GLASSES_FAQ_NEEDLE = 'Why does SIREN watch Samsung AI glasses?';
export const AGENTS_SAMSUNG_GLASSES_NEEDLE = 'Samsung AI glasses';

/** Tip /lab/samsung.html must keep the #195 Samsung AI glasses FAQ. */
export function hasSamsungGlassesFaq(html, needle = SAMSUNG_GLASSES_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route Samsung AI glasses Trends to Samsung lab (FINDABILITY #195).
 * Wipe gap is `agents-samsung-glasses-missing`.
 */
export function hasAgentsSamsungGlasses(body, needle = AGENTS_SAMSUNG_GLASSES_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/lab/samsung.html');
}

/** FINDABILITY #176 — Character.ai bankruptcy FAQ + agent maps on chatbots tag. */
export const CHARACTER_AI_FAQ_NEEDLE = 'Why does SIREN watch Character.ai and AI chatbot bankruptcies?';
export const AGENTS_CHARACTER_AI_NEEDLE = 'Character.ai bankruptcy';

/** Tip /tags/chatbots.html must keep the #176 Character.ai FAQ. */
export function hasCharacterAiFaq(html, needle = CHARACTER_AI_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route Character.ai bankruptcy Trends to Chatbots tag (FINDABILITY #176).
 * Wipe gap is `agents-character-ai-missing`.
 */
export function hasAgentsCharacterAi(body, needle = AGENTS_CHARACTER_AI_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/tags/chatbots.html');
}


/** FINDABILITY #410 — CERT-In FAQ + agent maps on agents tag. */
export const CERT_IN_FAQ_NEEDLE = 'Why does SIREN watch CERT-In and AI agent cyber incidents?';
export const AGENTS_CERT_IN_NEEDLE = 'CERT-In';

/** Tip /tags/agents.html must keep the #410 CERT-In FAQ. */
export function hasCertInFaq(html, needle = CERT_IN_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route CERT-In / India AI-agent cyber Trends to Agents tag (FINDABILITY #410).
 * Wipe gap is `agents-cert-in-missing`.
 */
export function hasAgentsCertIn(body, needle = AGENTS_CERT_IN_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/tags/agents.html');
}

/** FINDABILITY #177 — Qwen / Alibaba open-weight FAQ + agent maps. */
export const QWEN_FAQ_NEEDLE = 'Why does SIREN watch Qwen and Alibaba open models?';
export const AGENTS_QWEN_NEEDLE = 'Alibaba open-weight';

/** Tip /lab/qwen.html must keep the #177 Qwen FAQ. */
export function hasQwenFaq(html, needle = QWEN_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route Qwen / Alibaba open-weight Trends to Qwen lab (FINDABILITY #177).
 * Wipe gap is `agents-qwen-missing`.
 */
export function hasAgentsQwen(body, needle = AGENTS_QWEN_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/lab/qwen.html');
}

/** FINDABILITY #178 — Oracle / AI datacenter FAQ + agent maps on datacenters tag. */
export const ORACLE_DATACENTERS_FAQ_NEEDLE = 'Why does SIREN watch Oracle and AI datacenters?';
export const AGENTS_ORACLE_DATACENTERS_NEEDLE = 'Oracle datacenter';

/** Tip /tags/datacenters.html must keep the #178 Oracle FAQ. */
export function hasOracleDatacentersFaq(html, needle = ORACLE_DATACENTERS_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route Oracle / AI datacenter Trends to Datacenters tag (FINDABILITY #178).
 * Wipe gap is `agents-oracle-datacenters-missing`.
 */
export function hasAgentsOracleDatacenters(body, needle = AGENTS_ORACLE_DATACENTERS_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/tags/datacenters.html');
}

/** FINDABILITY #179 — DeepSeek outage FAQ + agent maps. */
export const DEEPSEEK_FAQ_NEEDLE = 'Why does SIREN watch DeepSeek and AI outages?';
export const AGENTS_DEEPSEEK_NEEDLE = 'DeepSeek outage';

/** Tip /lab/deepseek.html must keep the #179 DeepSeek FAQ. */
export function hasDeepseekFaq(html, needle = DEEPSEEK_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route DeepSeek outage Trends to DeepSeek lab (FINDABILITY #179).
 * Wipe gap is `agents-deepseek-missing`.
 */
export function hasAgentsDeepseek(body, needle = AGENTS_DEEPSEEK_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/lab/deepseek.html');
}

/** FINDABILITY #180 — Mistral / Timestral FAQ + agent maps. */
export const MISTRAL_FAQ_NEEDLE = 'Why does SIREN watch Mistral and Timestral?';
export const AGENTS_MISTRAL_NEEDLE = 'Timestral';

/** Tip /lab/mistral.html must keep the #180 Mistral FAQ. */
export function hasMistralFaq(html, needle = MISTRAL_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route Mistral / Timestral Trends to Mistral lab (FINDABILITY #180).
 * Wipe gap is `agents-mistral-missing`.
 */
export function hasAgentsMistral(body, needle = AGENTS_MISTRAL_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/lab/mistral.html');
}

/** FINDABILITY #181 — OpenAI / ChatGPT outage FAQ + agent maps. */
export const OPENAI_OUTAGE_FAQ_NEEDLE = 'Why does SIREN watch OpenAI and ChatGPT outages?';
export const AGENTS_OPENAI_OUTAGE_NEEDLE = 'OpenAI outage';

/** Tip /lab/openai.html must keep the #181 OpenAI outage FAQ. */
export function hasOpenaiOutageFaq(html, needle = OPENAI_OUTAGE_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route OpenAI outage Trends to OpenAI lab (FINDABILITY #181).
 * Wipe gap is `agents-openai-outage-missing`.
 */
export function hasAgentsOpenaiOutage(body, needle = AGENTS_OPENAI_OUTAGE_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/lab/openai.html');
}

/** FINDABILITY #191 — ChatGPT Chrome / computer use FAQ + agent maps. */
export const OPENAI_CHROME_FAQ_NEEDLE = 'Why does SIREN watch ChatGPT computer use and Chrome tabs?';
export const AGENTS_OPENAI_CHROME_NEEDLE = 'ChatGPT Chrome';

/** Tip /lab/openai.html must keep the #191 ChatGPT Chrome FAQ. */
export function hasOpenaiChromeFaq(html, needle = OPENAI_CHROME_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route ChatGPT Chrome / computer use Trends to OpenAI lab
 * (FINDABILITY #191). Wipe gap is `agents-openai-chrome-missing`.
 */
export function hasAgentsOpenaiChrome(body, needle = AGENTS_OPENAI_CHROME_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/lab/openai.html');
}

/** FINDABILITY #362 — Anthropic AI safety bill FAQ + agent maps. */
export const ANTHROPIC_AI_SAFETY_BILL_FAQ_NEEDLE = 'Why does SIREN watch Anthropic AI safety bill pitches?';
export const AGENTS_ANTHROPIC_AI_SAFETY_BILL_NEEDLE = 'AI safety bill';

/** Tip /lab/anthropic.html must keep the #362 AI safety bill FAQ. */
export function hasAnthropicAiSafetyBillFaq(html, needle = ANTHROPIC_AI_SAFETY_BILL_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route AI safety bill tape to Anthropic lab (FINDABILITY #362).
 * Wipe gap is `agents-anthropic-ai-safety-bill-missing`.
 */
export function hasAgentsAnthropicAiSafetyBill(body, needle = AGENTS_ANTHROPIC_AI_SAFETY_BILL_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/lab/anthropic.html');
}

/** FINDABILITY #368 — Anthropic Canadian data-centre FAQ + agent maps. */
export const ANTHROPIC_CANADA_DC_FAQ_NEEDLE = 'Why does SIREN watch Anthropic Canadian data centres?';
export const AGENTS_ANTHROPIC_CANADA_DC_NEEDLE = 'Canadian data';

/** Tip /lab/anthropic.html must keep the #368 Canadian data-centre FAQ. */
export function hasAnthropicCanadaDcFaq(html, needle = ANTHROPIC_CANADA_DC_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route Canadian data-centre tape to Anthropic lab (FINDABILITY #368).
 * Wipe gap is `agents-anthropic-canada-dc-missing`.
 */
export function hasAgentsAnthropicCanadaDc(body, needle = AGENTS_ANTHROPIC_CANADA_DC_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/lab/anthropic.html');
}

/** FINDABILITY #392 — Anthropic / METR evaluator-access FAQ + agent maps. */
export const ANTHROPIC_METR_FAQ_NEEDLE = 'Why does SIREN watch Anthropic METR evaluator access?';
export const AGENTS_ANTHROPIC_METR_NEEDLE = 'METR';

/** Tip /lab/anthropic.html must keep the #392 METR evaluator FAQ. */
export function hasAnthropicMetrFaq(html, needle = ANTHROPIC_METR_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route Anthropic / METR tape to Anthropic lab (FINDABILITY #392).
 * Wipe gap is `agents-anthropic-metr-missing`.
 */
export function hasAgentsAnthropicMetr(body, needle = AGENTS_ANTHROPIC_METR_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/lab/anthropic.html');
}

/** FINDABILITY #397 — Anthropic / Claude ECDSA curve-seed FAQ + agent maps. */
export const ANTHROPIC_ECDSA_FAQ_NEEDLE = 'Why does SIREN watch Anthropic ECDSA curve seeds?';
export const AGENTS_ANTHROPIC_ECDSA_NEEDLE = 'ECDSA';

/** Tip /lab/anthropic.html must keep the #397 ECDSA curve-seed FAQ. */
export function hasAnthropicEcdsaFaq(html, needle = ANTHROPIC_ECDSA_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route Anthropic / ECDSA tape to Anthropic lab (FINDABILITY #397).
 * Wipe gap is `agents-anthropic-ecdsa-missing`.
 */
export function hasAgentsAnthropicEcdsa(body, needle = AGENTS_ANTHROPIC_ECDSA_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/lab/anthropic.html');
}

/** FINDABILITY #402 — Claude Opus 5.5 FAQ + agent maps. */
export const CLAUDE_OPUS_55_FAQ_NEEDLE = 'Why does SIREN watch Claude Opus 5.5?';
export const AGENTS_CLAUDE_OPUS_55_NEEDLE = 'Claude Opus 5.5';

/** Tip /lab/anthropic.html must keep the #402 Claude Opus 5.5 FAQ. */
export function hasClaudeOpus55Faq(html, needle = CLAUDE_OPUS_55_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route Claude Opus 5.5 tape to Anthropic lab (FINDABILITY #402).
 * Wipe gap is `agents-claude-opus-55-missing`.
 */
export function hasAgentsClaudeOpus55(body, needle = AGENTS_CLAUDE_OPUS_55_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/lab/anthropic.html');
}

/** FINDABILITY #408 — Blackstone / Anthropic financing FAQ + agent maps. */
export const BLACKSTONE_ANTHROPIC_FAQ_NEEDLE = 'Why does SIREN watch Blackstone Anthropic financing?';
export const AGENTS_BLACKSTONE_ANTHROPIC_NEEDLE = 'Blackstone';

/** Tip /lab/anthropic.html must keep the #408 Blackstone Anthropic financing FAQ. */
export function hasBlackstoneAnthropicFaq(html, needle = BLACKSTONE_ANTHROPIC_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route Blackstone Anthropic financing tape to Anthropic lab (FINDABILITY #408).
 * Wipe gap is `agents-blackstone-anthropic-missing`.
 */
export function hasAgentsBlackstoneAnthropic(body, needle = AGENTS_BLACKSTONE_ANTHROPIC_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/lab/anthropic.html');
}

/** FINDABILITY #412 — Replit / Anthropic model-switch FAQ + agent maps. */
export const REPLIT_ANTHROPIC_FAQ_NEEDLE = 'Why does SIREN watch Replit Anthropic model switches?';
export const AGENTS_REPLIT_ANTHROPIC_NEEDLE = 'Replit';

/** Tip /lab/anthropic.html must keep the #412 Replit Anthropic model-switch FAQ. */
export function hasReplitAnthropicFaq(html, needle = REPLIT_ANTHROPIC_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route Replit Anthropic model-switch tape to Anthropic lab (FINDABILITY #412).
 * Wipe gap is `agents-replit-anthropic-missing`.
 */
export function hasAgentsReplitAnthropic(body, needle = AGENTS_REPLIT_ANTHROPIC_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/lab/anthropic.html');
}

/** FINDABILITY #420 — Claude Mythos 5 FAQ + agent maps. */
export const CLAUDE_MYTHOS_5_FAQ_NEEDLE = 'Why does SIREN watch Claude Mythos 5?';
export const AGENTS_CLAUDE_MYTHOS_5_NEEDLE = 'Claude Mythos 5';

/** Tip /lab/anthropic.html must keep the #420 Claude Mythos 5 FAQ. */
export function hasClaudeMythos5Faq(html, needle = CLAUDE_MYTHOS_5_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route Claude Mythos 5 / quantum-circuit tape to Anthropic lab (FINDABILITY #420).
 * Wipe gap is `agents-claude-mythos-5-missing`.
 */
export function hasAgentsClaudeMythos5(body, needle = AGENTS_CLAUDE_MYTHOS_5_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/lab/anthropic.html');
}

/** FINDABILITY #372 — Waymo Canada / Toronto robotaxi FAQ + agent maps. */
export const WAYMO_CANADA_FAQ_NEEDLE = 'Why does SIREN watch Waymo Canada and Toronto robotaxis?';
export const AGENTS_WAYMO_CANADA_NEEDLE = 'Waymo Canada';

/** Tip /lab/waymo.html must keep the #372 Waymo Canada FAQ. */
export function hasWaymoCanadaFaq(html, needle = WAYMO_CANADA_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route Waymo Canada / Toronto tape to Waymo lab (FINDABILITY #372).
 * Wipe gap is `agents-waymo-canada-missing`.
 */
export function hasAgentsWaymoCanada(body, needle = AGENTS_WAYMO_CANADA_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/lab/waymo.html');
}

/** FINDABILITY #374 — SoftBank / Allied Universal FAQ + agent maps. */
export const SOFTBANK_ALLIED_FAQ_NEEDLE = 'Why does SIREN watch SoftBank Allied Universal talks?';
export const AGENTS_SOFTBANK_ALLIED_NEEDLE = 'Allied Universal';

/** Tip /lab/softbank.html must keep the #374 SoftBank Allied FAQ. */
export function hasSoftbankAlliedFaq(html, needle = SOFTBANK_ALLIED_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route SoftBank / Allied Universal tape to SoftBank lab (FINDABILITY #374).
 * Wipe gap is `agents-softbank-allied-missing`.
 */
export function hasAgentsSoftbankAllied(body, needle = AGENTS_SOFTBANK_ALLIED_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/lab/softbank.html');
}

/** FINDABILITY #376 — SpaceX / Starshield FAQ + agent maps. */
export const SPACEX_STARSHIELD_FAQ_NEEDLE = 'Why does SIREN watch SpaceX Starshield?';
export const AGENTS_SPACEX_STARSHIELD_NEEDLE = 'Starshield';

/** Tip /lab/spacex.html must keep the #376 SpaceX Starshield FAQ. */
export function hasSpacexStarshieldFaq(html, needle = SPACEX_STARSHIELD_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route SpaceX / Starshield tape to SpaceX lab (FINDABILITY #376).
 * Wipe gap is `agents-spacex-starshield-missing`.
 */
export function hasAgentsSpacexStarshield(body, needle = AGENTS_SPACEX_STARSHIELD_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/lab/spacex.html');
}

/** FINDABILITY #378 — Tesla Flying Roadster FAQ + agent maps. */
export const TESLA_FLYING_ROADSTER_FAQ_NEEDLE = 'Why does SIREN watch Tesla Flying Roadster?';
export const AGENTS_TESLA_FLYING_ROADSTER_NEEDLE = 'Flying Roadster';

/** Tip /lab/tesla.html must keep the #378 Tesla Flying Roadster FAQ. */
export function hasTeslaFlyingRoadsterFaq(html, needle = TESLA_FLYING_ROADSTER_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route Tesla Flying Roadster tape to Tesla lab (FINDABILITY #378).
 * Wipe gap is `agents-tesla-flying-roadster-missing`.
 */
export function hasAgentsTeslaFlyingRoadster(body, needle = AGENTS_TESLA_FLYING_ROADSTER_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/lab/tesla.html');
}

/** FINDABILITY #193 — Meta–Apple Mac AI / Muse-on-Mac FAQ + agent maps. */
export const META_APPLE_MAC_FAQ_NEEDLE = 'Why does SIREN watch Meta and Apple Mac AI partnerships?';
export const AGENTS_META_APPLE_MAC_NEEDLE = 'Meta and Apple Mac AI';

/** Tip /lab/meta.html must keep the #193 Meta–Apple Mac FAQ. */
export function hasMetaAppleMacFaq(html, needle = META_APPLE_MAC_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route Meta–Apple Mac AI Trends to Meta lab (FINDABILITY #193).
 * Wipe gap is `agents-meta-apple-mac-missing`.
 */
export function hasAgentsMetaAppleMac(body, needle = AGENTS_META_APPLE_MAC_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/lab/meta.html');
}

/** FINDABILITY #182 — Hugging Face hack / incident FAQ + agent maps. */
export const HUGGINGFACE_FAQ_NEEDLE = 'Why does SIREN watch Hugging Face hacks and incidents?';
export const AGENTS_HUGGINGFACE_NEEDLE = 'Hugging Face hack';

/** Tip /tags/huggingface.html must keep the #182 Hugging Face FAQ. */
export function hasHuggingfaceFaq(html, needle = HUGGINGFACE_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route Hugging Face hack Trends to Hugging Face tag (FINDABILITY #182).
 * Wipe gap is `agents-huggingface-missing`.
 */
export function hasAgentsHuggingface(body, needle = AGENTS_HUGGINGFACE_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/tags/huggingface.html');
}

/** FINDABILITY #183 — Palantir / AIP / government AI FAQ + agent maps. */
export const PALANTIR_FAQ_NEEDLE = 'Why does SIREN watch Palantir and government AI?';
export const AGENTS_PALANTIR_NEEDLE = 'Palantir / AIP';

/** Tip /lab/palantir.html must keep the #183 Palantir FAQ. */
export function hasPalantirFaq(html, needle = PALANTIR_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route Palantir / AIP Trends to Palantir lab (FINDABILITY #183).
 * Wipe gap is `agents-palantir-missing`.
 */
export function hasAgentsPalantir(body, needle = AGENTS_PALANTIR_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/lab/palantir.html');
}

/** FINDABILITY #406 — Ondas–Palantir AI FAQ + agent maps. */
export const ONDAS_PALANTIR_FAQ_NEEDLE = 'Why does SIREN watch Ondas-Palantir AI?';
export const AGENTS_ONDAS_PALANTIR_NEEDLE = 'Ondas';

/** Tip /lab/palantir.html must keep the #406 Ondas-Palantir FAQ. */
export function hasOndasPalantirFaq(html, needle = ONDAS_PALANTIR_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route Ondas tape to Palantir lab (FINDABILITY #406).
 * Wipe gap is `agents-ondas-palantir-missing`.
 */
export function hasAgentsOndasPalantir(body, needle = AGENTS_ONDAS_PALANTIR_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/lab/palantir.html');
}

/** FINDABILITY #184 — AMD / MI300 / Instinct FAQ + agent maps. */
export const AMD_FAQ_NEEDLE = 'Why does SIREN watch AMD and AI GPUs?';
export const AGENTS_AMD_NEEDLE = 'AMD / MI300';

/** Tip /lab/amd.html must keep the #184 AMD FAQ. */
export function hasAmdFaq(html, needle = AMD_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route AMD / MI300 Trends to AMD lab (FINDABILITY #184).
 * Wipe gap is `agents-amd-missing`.
 */
export function hasAgentsAmd(body, needle = AGENTS_AMD_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/lab/amd.html');
}

/** FINDABILITY #185 — Tesla / FSD / Autopilot FAQ + agent maps. */
export const TESLA_FAQ_NEEDLE = 'Why does SIREN watch Tesla Autopilot and FSD?';
export const AGENTS_TESLA_NEEDLE = 'Tesla / FSD';

/** Tip /lab/tesla.html must keep the #185 Tesla FAQ. */
export function hasTeslaFaq(html, needle = TESLA_FAQ_NEEDLE) {
  return String(html || '').includes(needle);
}

/**
 * Agent maps must route Tesla / FSD Trends to Tesla lab (FINDABILITY #185).
 * Wipe gap is `agents-tesla-missing`.
 */
export function hasAgentsTesla(body, needle = AGENTS_TESLA_NEEDLE) {
  const text = String(body || '');
  return text.includes(needle) && text.includes('/lab/tesla.html');
}




/**
 * Probe rows whose live HTML is missing the expected conquest FAQ needle.
 * Wipe gap is `conquest-faq-missing` (FINDABILITY #128).
 */
export function conquestFaqLags(byUrl, origin = 'https://siren.watch', probes = CONQUEST_FAQ_PROBES) {
  const base = String(origin || '').replace(/\/$/, '');
  const out = [];
  for (const { path: rel, needle } of probes) {
    const row = byUrl.get(`${base}${rel}`);
    const body = row?.ok ? String(row.value || '') : '';
    if (!body.includes(needle)) {
      out.push({ path: rel, needle });
    }
  }
  return out;
}

/**
 * Lab pages whose `<title>` must include a product head-term alias
 * (FINDABILITY #121/#122/#123). Keep in sync with LAB_HEAD_ALIASES in
 * site/templates/facetPages.mjs.
 */
export const LAB_HEAD_TITLE_PROBES = Object.freeze([
  // FINDABILITY #187 — Argon beside Gemini in DeepMind lab title.
  { path: '/lab/google-deepmind.html', needle: 'Argon' },
  { path: '/lab/openai.html', needle: 'ChatGPT' },
  { path: '/lab/anthropic.html', needle: 'Claude' },
  // FINDABILITY #137 — Micron / MU ticker alias in lab title.
  { path: '/lab/micron.html', needle: 'MU' },
  // FINDABILITY #161 — NVIDIA / NVDA ticker alias in lab title.
  { path: '/lab/nvidia.html', needle: 'NVDA' },
  // FINDABILITY #288 — CoreWeave / CRWV ticker alias in lab title.
  { path: '/lab/coreweave.html', needle: 'CRWV' },
  // FINDABILITY #169 — Muse product alias on Meta AI lab title/H1.
  { path: '/lab/meta.html', needle: 'Muse' },
  // FINDABILITY #170 — Apple Intelligence product alias on Apple lab title/H1.
  { path: '/lab/apple.html', needle: 'Apple Intelligence' },
  // FINDABILITY #171 — Copilot product alias on Microsoft lab title/H1.
  { path: '/lab/microsoft.html', needle: 'Copilot' },
  // FINDABILITY #173 — Grok product alias on xAI lab title/H1.
  { path: '/lab/xai.html', needle: 'Grok' },
  // FINDABILITY #175 — HBM product alias on Samsung lab title/H1.
  { path: '/lab/samsung.html', needle: 'HBM' },
  // FINDABILITY #177 — Qwen product alias on Alibaba Qwen lab title/H1.
  { path: '/lab/qwen.html', needle: 'Qwen' },
  // FINDABILITY #180 — Timestral product alias on Mistral lab title/H1.
  { path: '/lab/mistral.html', needle: 'Timestral' },
  // FINDABILITY #183 — AIP product alias on Palantir lab title/H1.
  { path: '/lab/palantir.html', needle: 'AIP' },
  // FINDABILITY #184 — MI300 product alias on AMD lab title/H1.
  { path: '/lab/amd.html', needle: 'MI300' },
  // FINDABILITY #185 — FSD product alias on Tesla lab title/H1.
  { path: '/lab/tesla.html', needle: 'FSD' },
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

  // FINDABILITY #186 — live Search Trends JSON older than threshold (news-fast dark).
  if (ours.trends_generated_at) {
    const gen = Date.parse(ours.trends_generated_at);
    const nowMs = report.measured_at ? Date.parse(report.measured_at) : Date.now();
    if (Number.isFinite(gen) && Number.isFinite(nowMs)) {
      const ageH = (nowMs - gen) / 3_600_000;
      if (ageH >= TRENDS_STALE_HOURS) {
        gaps.push({
          id: 'trends-stale',
          severity: 'high',
          text: `Live api/search-trends.json generated_at is ${ageH.toFixed(1)}h old (threshold ${TRENDS_STALE_HOURS}h) — re-overlay search-trends.html (+ trends aliases + api/search-trends.json) or unstick news-fast Trends poll so head-term spikes stay fresh`,
        });
      }
    }
  } else if (ours.ok && ours.trends_generated_at === null) {
    gaps.push({
      id: 'trends-json-missing',
      severity: 'high',
      text: 'Live api/search-trends.json missing or unparseable generated_at — restore Search Trends tip so Google/Bing have a fresh head-term firehose',
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
      text: `${which} missing free-tools/verify/classic tip comments (FINDABILITY #84/#334) — re-overlay or wait for collect Publish on tip ≥ #334`,
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
      text: `${which} missing free-tools/verify/classic tip comments (FINDABILITY #87/#334) — re-overlay or wait for collect Publish on tip ≥ #334`,
    });
  }

  // FINDABILITY #79/#89 — robots tip comments wiped the same way as sitemap/feed tips.
  if (ours.robots_tips === false) {
    gaps.push({
      id: 'robots-tips-missing',
      severity: 'medium',
      text: 'robots.txt missing free-tools/verify/classic tip comments (FINDABILITY #79/#334) — re-overlay or wait for collect Publish on tip ≥ #334',
    });
  }

  // FINDABILITY #489 — homepage head + robots.txt must point at how to use the index.
  if (ours.agent_use_links === false) {
    gaps.push({
      id: 'agent-use-links-missing',
      severity: 'medium',
      text: 'home <head> or robots.txt missing skill.md / api/now.txt / AGENTS.md use links (FINDABILITY #489) — re-overlay or wait for collect Publish on tip ≥ #489',
    });
  }

  // FINDABILITY #90/#91 — live reading tip lines missing until tip ≥ #334 deploys or overlay.
  if (ours.now_md_tips === false || ours.now_txt_tips === false) {
    const which = [
      ours.now_md_tips === false ? 'now.md' : null,
      ours.now_txt_tips === false ? 'api/now.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'now-tips-missing',
      severity: 'medium',
      text: `${which} missing free-tools/verify/Search Trends/classic tip lines (FINDABILITY #90/#334) — re-overlay or wait for collect Publish on tip ≥ #334`,
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

  // FINDABILITY #146/#147/#148 — title names parent lab but keywords omit
  // labAboutLabel alias (ChatGPT / Claude / Gemini / MU).
  if (Array.isArray(ours.news_lab_alias_lags) && ours.news_lab_alias_lags.length > 0) {
    const sample = ours.news_lab_alias_lags
      .slice(0, 3)
      .map((row) => `${row.lab}→${row.alias}`)
      .join(', ');
    gaps.push({
      id: 'news-lab-alias-keywords-missing',
      severity: 'medium',
      text: `news-sitemap missing labAboutLabel aliases on ${ours.news_lab_alias_lags.length} row(s) (e.g. ${sample}) — re-overlay or wait for news-fast Publish on tip ≥ #172 (FINDABILITY #148/#159/#172)`,
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

  // FINDABILITY #124/#125 — agents.md / llms.txt dropped /trends.html short alias.
  if (ours.agents_trends_alias === false || ours.llms_trends_alias === false) {
    const which = [
      ours.agents_trends_alias === false ? 'agents.md' : null,
      ours.llms_trends_alias === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-trends-alias-missing',
      severity: 'medium',
      text: `${which} missing /trends.html short-alias lines (FINDABILITY #124/#125) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #124`,
    });
  }

  // FINDABILITY #129/#130 — agents.md / llms.txt dropped /pdoom.html short alias.
  if (ours.agents_pdoom_alias === false || ours.llms_pdoom_alias === false) {
    const which = [
      ours.agents_pdoom_alias === false ? 'agents.md' : null,
      ours.llms_pdoom_alias === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-pdoom-alias-missing',
      severity: 'medium',
      text: `${which} missing /pdoom.html short-alias lines (FINDABILITY #129/#130) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #130`,
    });
  }

  // FINDABILITY #252 — agents.md / llms.txt dropped /ai-activity-index.html short alias.
  if (ours.agents_activity_index_alias === false || ours.llms_activity_index_alias === false) {
    const which = [
      ours.agents_activity_index_alias === false ? 'agents.md' : null,
      ours.llms_activity_index_alias === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-activity-index-alias-missing',
      severity: 'medium',
      text: `${which} missing /ai-activity-index.html short-alias lines (FINDABILITY #252) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #252`,
    });
  }

  // FINDABILITY #262 — agents.md / llms.txt dropped /ai-activity-level.html short alias.
  if (ours.agents_activity_level_alias === false || ours.llms_activity_level_alias === false) {
    const which = [
      ours.agents_activity_level_alias === false ? 'agents.md' : null,
      ours.llms_activity_level_alias === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-activity-level-alias-missing',
      severity: 'medium',
      text: `${which} missing /ai-activity-level.html short-alias lines (FINDABILITY #262) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #262`,
    });
  }

  // FINDABILITY #433 — agents.md / llms.txt dropped contiguous “AI activity level today”.
  if (ours.agents_activity_level_head_term === false || ours.llms_activity_level_head_term === false) {
    const which = [
      ours.agents_activity_level_head_term === false ? 'agents.md' : null,
      ours.llms_activity_level_head_term === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-activity-level-head-term-missing',
      severity: 'medium',
      text: `${which} missing contiguous “AI activity level today” head-term phrase (FINDABILITY #433) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #433`,
    });
  }

  // FINDABILITY #324 — agents.md / llms.txt dropped /classic.html instrument panel.
  if (ours.agents_classic_panel === false || ours.llms_classic_panel === false) {
    const which = [
      ours.agents_classic_panel === false ? 'agents.md' : null,
      ours.llms_classic_panel === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-classic-panel-missing',
      severity: 'medium',
      text: `${which} missing /classic.html instrument-panel lines (FINDABILITY #324) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #324`,
    });
  }

  // FINDABILITY #326 — skill.md dropped /classic.html instrument panel.
  if (ours.skill_classic_panel === false) {
    gaps.push({
      id: 'skill-classic-panel-missing',
      severity: 'medium',
      text: 'skill.md missing /classic.html instrument-panel lines (FINDABILITY #326) — re-overlay skill.md or wait for collect/news-fast Publish on tip ≥ #326',
    });
  }

  // FINDABILITY #435 — skill.md dropped contiguous “AI activity level today”.
  if (ours.skill_activity_level_head_term === false) {
    gaps.push({
      id: 'skill-activity-level-head-term-missing',
      severity: 'medium',
      text: 'skill.md missing contiguous “AI activity level today” head-term phrase (FINDABILITY #435) — re-overlay skill.md or wait for collect/news-fast Publish on tip ≥ #435',
    });
  }

  // FINDABILITY #437 — agents.html dropped dual middot head terms.
  if (ours.agents_html_dual_head_term === false) {
    gaps.push({
      id: 'agents-html-dual-head-term-missing',
      severity: 'medium',
      text: 'agents.html missing dual “AI activity index today · AI activity level today” head-term phrase (FINDABILITY #437) — re-overlay agents.html or wait for collect/news-fast Publish on tip ≥ #437',
    });
  }

  // FINDABILITY #439 — agents.txt / ai.txt dropped dual middot head terms.
  if (ours.agents_txt_dual_head_term === false || ours.ai_txt_dual_head_term === false) {
    const which = [
      ours.agents_txt_dual_head_term === false ? 'agents.txt' : null,
      ours.ai_txt_dual_head_term === false ? 'ai.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'discovery-dual-head-term-missing',
      severity: 'medium',
      text: `${which} missing dual “AI activity index today · AI activity level today” head-term phrase (FINDABILITY #439) — re-overlay discovery surfaces or wait for collect/news-fast Publish on tip ≥ #439`,
    });
  }

  // FINDABILITY #441 — agents.json dropped dual middot home_title.
  if (ours.agents_json_dual_head_term === false) {
    gaps.push({
      id: 'agents-json-dual-head-term-missing',
      severity: 'medium',
      text: 'agents.json missing dual “AI activity index today · AI activity level today” related.home_title (FINDABILITY #441) — re-overlay agents.json or wait for collect/news-fast Publish on tip ≥ #441',
    });
  }

  // FINDABILITY #446 — openapi / api/index dropped dual middot after #441 tip wipe.
  if (ours.openapi_dual_head_term === false || ours.api_index_dual_head_term === false) {
    const which = [
      ours.openapi_dual_head_term === false ? 'openapi.json' : null,
      ours.api_index_dual_head_term === false ? 'api/index.json' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'openapi-dual-head-term-missing',
      severity: 'medium',
      text: `${which} missing dual “AI activity index today · AI activity level today” home head-term (FINDABILITY #446) — re-overlay openapi/api-index or wait for collect/news-fast Publish on tip ≥ #441/#446`,
    });
  }

  // FINDABILITY #328 — agents.txt / ai.txt / api-catalog dropped classic panel.
  if (
    ours.agents_txt_classic_panel === false
    || ours.ai_txt_classic_panel === false
    || ours.catalog_classic_panel === false
  ) {
    const which = [
      ours.agents_txt_classic_panel === false ? 'agents.txt' : null,
      ours.ai_txt_classic_panel === false ? 'ai.txt' : null,
      ours.catalog_classic_panel === false ? 'api-catalog' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'discovery-classic-panel-missing',
      severity: 'medium',
      text: `${which} missing /classic.html instrument-panel lines (FINDABILITY #328) — re-overlay discovery surfaces or wait for collect/news-fast Publish on tip ≥ #328`,
    });
  }

  // FINDABILITY #330 — agents.json / openapi / api/index dropped classic panel.
  if (
    ours.agents_json_classic_panel === false
    || ours.openapi_classic_panel === false
    || ours.api_index_classic_panel === false
  ) {
    const which = [
      ours.agents_json_classic_panel === false ? 'agents.json' : null,
      ours.openapi_classic_panel === false ? 'openapi.json' : null,
      ours.api_index_classic_panel === false ? 'api/index.json' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-json-classic-panel-missing',
      severity: 'medium',
      text: `${which} missing /classic.html instrument-panel lines (FINDABILITY #330) — re-overlay discovery JSON or wait for collect/news-fast Publish on tip ≥ #330`,
    });
  }

  // FINDABILITY #332 — free-tools.html dropped classic panel listicle row.
  if (ours.freetools_classic_panel === false) {
    gaps.push({
      id: 'freetools-classic-panel-missing',
      severity: 'medium',
      text: 'free-tools.html missing /classic.html instrument-panel listicle row (FINDABILITY #332) — re-overlay free-tools or wait for collect/news-fast Publish on tip ≥ #332',
    });
  }

  // FINDABILITY #443 — free-tools.html dropped dual middot head terms.
  if (ours.freetools_dual_head_term === false) {
    gaps.push({
      id: 'freetools-dual-head-term-missing',
      severity: 'medium',
      text: 'free-tools.html missing dual “AI activity index today · AI activity level today” head-term phrase (FINDABILITY #443) — re-overlay free-tools or wait for collect/news-fast Publish on tip ≥ #443',
    });
  }

  // FINDABILITY #451 — verify.html dropped dual middot head terms.
  if (ours.verify_dual_head_term === false) {
    gaps.push({
      id: 'verify-dual-head-term-missing',
      severity: 'medium',
      text: 'verify.html missing dual “AI activity index today · AI activity level today” head-term phrase (FINDABILITY #451) — re-overlay verify or wait for collect/news-fast Publish on tip ≥ #451',
    });
  }

  // FINDABILITY #453 — compare.html / alternatives.html dropped dual middot head terms.
  if (ours.compare_dual_head_term === false || ours.alternatives_dual_head_term === false) {
    const which = [
      ours.compare_dual_head_term === false ? 'compare.html' : null,
      ours.alternatives_dual_head_term === false ? 'alternatives.html' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'compare-dual-head-term-missing',
      severity: 'medium',
      text: `${which} missing dual “AI activity index today · AI activity level today” head-term phrase (FINDABILITY #453) — re-overlay compare hubs or wait for collect/news-fast Publish on tip ≥ #453`,
    });
  }

  // FINDABILITY #455 — pdoom / ai-doomsday-clock dropped dual middot head terms.
  if (ours.pdoom_dual_head_term === false || ours.ai_doomsday_clock_dual_head_term === false) {
    const which = [
      ours.pdoom_dual_head_term === false ? 'pdoom.html' : null,
      ours.ai_doomsday_clock_dual_head_term === false ? 'ai-doomsday-clock.html' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'pdoom-dual-head-term-missing',
      severity: 'medium',
      text: `${which} missing dual “AI activity index today · AI activity level today” head-term phrase (FINDABILITY #455) — re-overlay p(doom) glossaries or wait for collect/news-fast Publish on tip ≥ #455`,
    });
  }

  // FINDABILITY #457 — guide.html / guides.html dropped dual middot head terms.
  if (ours.guide_dual_head_term === false || ours.guides_dual_head_term === false) {
    const which = [
      ours.guide_dual_head_term === false ? 'guide.html' : null,
      ours.guides_dual_head_term === false ? 'guides.html' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'guide-dual-head-term-missing',
      severity: 'medium',
      text: `${which} missing dual “AI activity index today · AI activity level today” head-term phrase (FINDABILITY #457) — re-overlay guide hubs or wait for collect/news-fast Publish on tip ≥ #457`,
    });
  }

  // FINDABILITY #459 — bets / balance / self-aware dropped dual middot head terms.
  if (
    ours.bets_dual_head_term === false
    || ours.balance_dual_head_term === false
    || ours.self_aware_dual_head_term === false
  ) {
    const which = [
      ours.bets_dual_head_term === false ? 'bets.html' : null,
      ours.balance_dual_head_term === false ? 'balance.html' : null,
      ours.self_aware_dual_head_term === false ? 'self-aware.html' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'desk-dual-head-term-missing',
      severity: 'medium',
      text: `${which} missing dual “AI activity index today · AI activity level today” head-term phrase (FINDABILITY #459) — re-overlay desk pages or wait for collect/news-fast Publish on tip ≥ #459`,
    });
  }

  // FINDABILITY #461 — videos.html dropped dual middot head terms.
  if (ours.videos_dual_head_term === false) {
    gaps.push({
      id: 'videos-dual-head-term-missing',
      severity: 'medium',
      text: 'videos.html missing dual “AI activity index today · AI activity level today” head-term phrase (FINDABILITY #461) — re-overlay videos page or wait for collect/news-fast Publish on tip ≥ #461',
    });
  }

  // FINDABILITY #467 — bliss.html dropped dual middot head terms.
  if (ours.bliss_dual_head_term === false) {
    gaps.push({
      id: 'bliss-dual-head-term-missing',
      severity: 'medium',
      text: 'bliss.html missing dual “AI activity index today · AI activity level today” head-term phrase (FINDABILITY #467) — re-overlay bliss page or wait for collect/news-fast Publish on tip ≥ #467',
    });
  }

  // FINDABILITY #469 — press.html dropped dual middot head terms.
  if (ours.press_dual_head_term === false) {
    gaps.push({
      id: 'press-dual-head-term-missing',
      severity: 'medium',
      text: 'press.html missing dual “AI activity index today · AI activity level today” head-term phrase (FINDABILITY #469) — re-overlay press page or wait for collect/news-fast Publish on tip ≥ #469',
    });
  }

  // FINDABILITY #471 — superseded move bstamp dropped dual middot head terms.
  if (ours.moves_dual_head_term === false) {
    gaps.push({
      id: 'moves-dual-head-term-missing',
      severity: 'medium',
      text: 'moves/*.html bstamp missing dual “AI activity index today · AI activity level today” head-term phrase (FINDABILITY #471) — re-overlay move pages or wait for collect/news-fast Publish on tip ≥ #471',
    });
  }

  // FINDABILITY #473 — error pages dropped dual middot head terms.
  if (
    ours.not_found_dual_head_term === false
    || ours.server_error_dual_head_term === false
  ) {
    const which = [
      ours.not_found_dual_head_term === false ? '404.html' : null,
      ours.server_error_dual_head_term === false ? '500.html' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'error-dual-head-term-missing',
      severity: 'medium',
      text: `${which} missing dual “AI activity index today · AI activity level today” head-term phrase (FINDABILITY #473) — re-overlay error pages or wait for collect/news-fast Publish on tip ≥ #473`,
    });
  }

  // FINDABILITY #475 — home crumb / BreadcrumbList dropped dual middot head terms.
  if (ours.kind_press_crumb_dual_head_term === false) {
    gaps.push({
      id: 'crumb-dual-head-term-missing',
      severity: 'medium',
      text: 'kind/press.html missing dual “AI activity index today · AI activity level today” home-crumb head-term phrase (FINDABILITY #475) — re-overlay kind hubs or wait for collect/news-fast Publish on tip ≥ #475',
    });
  }

  // FINDABILITY #483/#485 — footer SECTIONS home label dropped dual middot head terms.
  if (ours.footer_sections_dual_head_term === false) {
    const which = [
      ours.footer_sections_press_dual === false ? 'press.html' : null,
      ours.footer_sections_jobs_dual === false ? 'jobs.html' : null,
    ].filter(Boolean).join(' + ') || 'footer Pages';
    gaps.push({
      id: 'sections-dual-head-term-missing',
      severity: 'medium',
      text: `${which} footer Pages home link missing dual “AI activity index today · AI activity level today” head-term phrase (FINDABILITY #483/#485) — re-overlay HTML footers or wait for collect/news-fast Publish on tip ≥ #485`,
    });
  }

  // FINDABILITY #463 — model hub pages dropped dual middot head terms.
  if (
    ours.muse_spark_dual_head_term === false
    || ours.fable_dual_head_term === false
  ) {
    const which = [
      ours.muse_spark_dual_head_term === false ? 'model/muse-spark.html' : null,
      ours.fable_dual_head_term === false ? 'model/fable.html' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'model-dual-head-term-missing',
      severity: 'medium',
      text: `${which} missing dual “AI activity index today · AI activity level today” head-term phrase (FINDABILITY #463) — re-overlay model hubs or wait for collect/news-fast Publish on tip ≥ #463`,
    });
  }

  // FINDABILITY #465 — pillar pages dropped dual middot head terms.
  if (
    ours.pillar_compute_dual_head_term === false
    || ours.pillar_attention_dual_head_term === false
  ) {
    const which = [
      ours.pillar_compute_dual_head_term === false ? 'pillar/compute.html' : null,
      ours.pillar_attention_dual_head_term === false ? 'pillar/attention.html' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'pillar-dual-head-term-missing',
      severity: 'medium',
      text: `${which} missing dual “AI activity index today · AI activity level today” head-term phrase (FINDABILITY #465) — re-overlay pillar pages or wait for collect/news-fast Publish on tip ≥ #465`,
    });
  }

  // FINDABILITY #131/#132 — agents.md / llms.txt dropped root rival brand aliases.
  if (ours.agents_root_rivals === false || ours.llms_root_rivals === false) {
    const which = [
      ours.agents_root_rivals === false ? 'agents.md' : null,
      ours.llms_root_rivals === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-root-rivals-missing',
      severity: 'medium',
      text: `${which} missing root rival aliases (/doombench.html /skynet-countdown.html /pizzint.html /takeofftracker.html) (FINDABILITY #131/#132) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #132`,
    });
  }

  // FINDABILITY #133/#134 — agents.md / llms.txt dropped head-term short aliases.
  if (ours.agents_head_aliases === false || ours.llms_head_aliases === false) {
    const which = [
      ours.agents_head_aliases === false ? 'agents.md' : null,
      ours.llms_head_aliases === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-head-aliases-missing',
      severity: 'medium',
      text: `${which} missing head-term short aliases (/doomsday-clock.html /ai-doom.html /doom-index.html) (FINDABILITY #133/#134) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #134`,
    });
  }

  // FINDABILITY #138/#139 — llms.txt lab lines dropped labAboutLabel (ChatGPT etc.).
  if (ours.llms_lab_about_labels === false) {
    gaps.push({
      id: 'agents-lab-labels-missing',
      severity: 'medium',
      text: `llms.txt missing labAboutLabel on /lab/* lines (e.g. OpenAI / ChatGPT) (FINDABILITY #138/#139) — re-overlay llms.txt or wait for collect/news-fast Publish on tip ≥ #138`,
    });
  }

  // FINDABILITY #140/#141 — /lab/ or /companies.html hub rows dropped labAboutLabel.
  if (Array.isArray(ours.lab_hub_label_lags) && ours.lab_hub_label_lags.length > 0) {
    const sample = ours.lab_hub_label_lags
      .slice(0, 3)
      .map((row) => `${row.path} (−${row.needle})`)
      .join(', ');
    gaps.push({
      id: 'lab-hub-labels-missing',
      severity: 'medium',
      text: `lab/companies hub labAboutLabel lag on ${ours.lab_hub_label_lags.length} page(s) (e.g. ${sample}) — re-overlay or wait for collect Publish on tip ≥ #140 (FINDABILITY #141)`,
    });
  }

  // FINDABILITY #142/#143 — home Organization knowsAbout dropped labAboutLabel.
  if (ours.home_lab_about_labels === false) {
    gaps.push({
      id: 'home-knowsabout-labels-missing',
      severity: 'medium',
      text: `home missing Organization knowsAbout labAboutLabel (e.g. OpenAI / ChatGPT) (FINDABILITY #142/#143) — re-overlay index.html or wait for collect/news-fast Publish on tip ≥ #142`,
    });
  }

  // FINDABILITY #423 — home DoomBench conquest every-room + FAQ path wiped.
  if (ours.home_doombench_conquest === false) {
    gaps.push({
      id: 'home-doombench-conquest-missing',
      severity: 'medium',
      text: `home missing DoomBench conquest link “SIREN vs DoomBench: which should you use?” (FINDABILITY #423) — re-overlay index.html / aliases or wait for collect/news-fast Publish on tip ≥ #423`,
    });
  }

  // FINDABILITY #425/#427 — home Skynet Countdown conquest every-room + FAQ path wiped.
  if (ours.home_skynet_conquest === false) {
    gaps.push({
      id: 'home-skynet-conquest-missing',
      severity: 'medium',
      text: `home missing Skynet Countdown conquest link “SIREN vs Skynet Countdown: which should you use?” (FINDABILITY #425/#427) — re-overlay index.html / aliases or wait for collect/news-fast Publish on tip ≥ #425`,
    });
  }

  // FINDABILITY #429 — home PizzINT conquest every-room + FAQ path wiped.
  if (ours.home_pizzint_conquest === false) {
    gaps.push({
      id: 'home-pizzint-conquest-missing',
      severity: 'medium',
      text: `home missing PizzINT conquest link “SIREN vs PizzINT: which should you use?” (FINDABILITY #429) — re-overlay index.html / aliases or wait for collect/news-fast Publish on tip with PizzINT every-room`,
    });
  }

  // FINDABILITY #429 — home Takeoff Tracker conquest every-room wiped.
  if (ours.home_takeoff_conquest === false) {
    gaps.push({
      id: 'home-takeoff-conquest-missing',
      severity: 'medium',
      text: `home missing Takeoff Tracker conquest link “SIREN vs Takeoff Tracker: which should you use?” (FINDABILITY #429) — re-overlay index.html / aliases or wait for collect/news-fast Publish on tip with Takeoff every-room`,
    });
  }

  // FINDABILITY #254 — home exact head-term FAQ wiped or never landed.
  if (ours.home_activity_index_faq === false) {
    gaps.push({
      id: 'home-activity-index-faq-missing',
      severity: 'medium',
      text: `home missing exact FAQ “What is an AI activity index?” (FINDABILITY #254) — re-overlay index.html / ai-activity-index.html or wait for collect/news-fast Publish on tip ≥ #254`,
    });
  }

  // FINDABILITY #284 — home title-match “AI activity index today” FAQ wiped.
  if (ours.home_activity_index_today_faq === false) {
    gaps.push({
      id: 'home-activity-index-today-faq-missing',
      severity: 'medium',
      text: `home missing exact FAQ “What is the AI activity index today?” (FINDABILITY #284) — re-overlay index.html / ai-activity-index.html or wait for collect/news-fast Publish on tip ≥ #284`,
    });
  }

  // FINDABILITY #264 — home #262 level-alias FAQ prose wiped after tip overlay.
  if (ours.home_activity_level_faq_alias === false) {
    gaps.push({
      id: 'home-activity-level-faq-alias-missing',
      severity: 'medium',
      text: `home missing “/ai-activity-level.html is a short alias” FAQ prose (FINDABILITY #262/#264) — re-overlay index.html / ai-activity-level.html or wait for collect/news-fast Publish on tip ≥ #264`,
    });
  }

  // FINDABILITY #296 — dual head-term <title> lost contiguous level phrase.
  if (ours.home_activity_level_title === false) {
    gaps.push({
      id: 'home-activity-level-title-missing',
      severity: 'medium',
      text: `home <title> missing contiguous “AI activity level today ·” (FINDABILITY #296) — re-overlay index.html / ai-activity-level.html or wait for collect/news-fast Publish on tip ≥ #296`,
    });
  }

  // FINDABILITY #308 — home H1 .v2-sr lost dual head terms (pixel brand alone).
  if (ours.home_activity_h1_head_terms === false) {
    gaps.push({
      id: 'home-activity-h1-head-terms-missing',
      severity: 'medium',
      text: `home H1 missing dual head-term .v2-sr (“AI activity index today · AI activity level today · AI SIREN INDEX”) (FINDABILITY #308) — re-overlay index.html / ai-activity-index.html or wait for collect/news-fast Publish on tip ≥ #308`,
    });
  }

  // FINDABILITY #312/#314/#316 — home <title> still carries level_name or score.
  if (ours.home_activity_title_trim === false) {
    gaps.push({
      id: 'home-activity-title-trim-missing',
      severity: 'medium',
      text: `home <title> still carries level_name (e.g. ROUTINE) or a decimal score after #312/#316 trim — re-overlay index.html / aliases or wait for collect/news-fast Publish on tip ≥ #316`,
    });
  }

  // FINDABILITY #318 — /classic.html collapsed onto home title/canonical.
  if (ours.classic_panel === false) {
    gaps.push({
      id: 'classic-panel-missing',
      severity: 'medium',
      text: `/classic.html missing instrument-panel title or own canonical (FINDABILITY #318) — wait for collect Publish on tip ≥ #318 or restore tip classic.html`,
    });
  }

  // FINDABILITY #322 — sitemap.xml dropped /classic.html after newsroom orphan.
  if (ours.classic_sitemap === false) {
    gaps.push({
      id: 'classic-sitemap-missing',
      severity: 'medium',
      text: `sitemap.xml missing /classic.html loc (FINDABILITY #322) — wait for collect/news-fast Publish on tip ≥ #322 or reinject via ensure-classic-sitemap.mjs`,
    });
  }

  // FINDABILITY #144 — /race.html leaderboard lab links dropped labAboutLabel.
  if (ours.race_lab_about_labels === false) {
    gaps.push({
      id: 'race-lab-labels-missing',
      severity: 'medium',
      text: `/race.html missing labAboutLabel on lab links (e.g. OpenAI / ChatGPT) (FINDABILITY #144) — wait for collect Publish on tip ≥ #144 or re-overlay race.html`,
    });
  }

  // FINDABILITY #152/#153 — Watts FAQ for IREN Trends wiped or never landed.
  if (ours.watts_iren_faq === false) {
    gaps.push({
      id: 'watts-iren-faq-missing',
      severity: 'medium',
      text: `/watts.html missing IREN / AI cloud power Trends FAQ (FINDABILITY #152/#153) — re-overlay watts.html or wait for full collect Publish on tip ≥ #152`,
    });
  }
  // FINDABILITY #153 — agent maps must route IREN Trends to Watts.
  if (ours.agents_iren_watts === false || ours.llms_iren_watts === false) {
    const which = [
      ours.agents_iren_watts === false ? 'agents.md' : null,
      ours.llms_iren_watts === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-iren-watts-missing',
      severity: 'medium',
      text: `${which} missing IREN → /watts.html Trends tip (FINDABILITY #153) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #153`,
    });
  }

  // FINDABILITY #151/#154 — Micron lab FAQ for dram Trends wiped or never landed.
  if (ours.micron_dram_faq === false) {
    gaps.push({
      id: 'micron-dram-faq-missing',
      severity: 'medium',
      text: `/lab/micron.html missing Micron / DRAM stock Trends FAQ (FINDABILITY #151/#154) — re-overlay lab/micron.html or wait for full collect Publish on tip ≥ #151`,
    });
  }
  // FINDABILITY #154 — agent maps must route dram / Micron stock Trends to Micron lab.
  if (ours.agents_micron_dram === false || ours.llms_micron_dram === false) {
    const which = [
      ours.agents_micron_dram === false ? 'agents.md' : null,
      ours.llms_micron_dram === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-micron-dram-missing',
      severity: 'medium',
      text: `${which} missing dram stock → /lab/micron.html Trends tip (FINDABILITY #154) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #154`,
    });
  }

  // FINDABILITY #155 — CoreWeave lab FAQ for CoreWeave stock Trends wiped or never landed.
  if (ours.coreweave_stock_faq === false) {
    gaps.push({
      id: 'coreweave-stock-faq-missing',
      severity: 'medium',
      text: `/lab/coreweave.html missing CoreWeave stock Trends FAQ (FINDABILITY #155) — re-overlay lab/coreweave.html or wait for full collect Publish on tip ≥ #155`,
    });
  }
  // FINDABILITY #160 — CoreWeave debt / bond FAQ wiped or never landed.
  if (ours.coreweave_debt_faq === false) {
    gaps.push({
      id: 'coreweave-debt-faq-missing',
      severity: 'medium',
      text: `/lab/coreweave.html missing CoreWeave debt / bond Trends FAQ (FINDABILITY #160) — re-overlay lab/coreweave.html or wait for full collect Publish on tip ≥ #160`,
    });
  }
  // FINDABILITY #155 — agent maps must route CoreWeave stock Trends to CoreWeave lab.
  if (ours.agents_coreweave === false || ours.llms_coreweave === false) {
    const which = [
      ours.agents_coreweave === false ? 'agents.md' : null,
      ours.llms_coreweave === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-coreweave-missing',
      severity: 'medium',
      text: `${which} missing CoreWeave stock → /lab/coreweave.html Trends tip (FINDABILITY #155) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #155`,
    });
  }

  // FINDABILITY #157 — Neoclouds tag FAQ for neocloud Trends wiped or never landed.
  if (ours.neocloud_faq === false) {
    gaps.push({
      id: 'neocloud-faq-missing',
      severity: 'medium',
      text: `/tags/neoclouds.html missing neocloud Trends FAQ (FINDABILITY #157) — re-overlay tags/neoclouds.html or wait for full collect Publish on tip ≥ #157`,
    });
  }
  // FINDABILITY #157 — agent maps must route neocloud Trends to Neoclouds tag.
  if (ours.agents_neocloud === false || ours.llms_neocloud === false) {
    const which = [
      ours.agents_neocloud === false ? 'agents.md' : null,
      ours.llms_neocloud === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-neocloud-missing',
      severity: 'medium',
      text: `${which} missing neocloud → /tags/neoclouds.html Trends tip (FINDABILITY #157) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #157`,
    });
  }

  // FINDABILITY #158 — Search Trends watchlist FAQ routing wiped or never landed.
  if (ours.trends_routes_faq === false) {
    gaps.push({
      id: 'trends-routes-faq-missing',
      severity: 'medium',
      text: `/search-trends.html missing IREN/dram/CoreWeave/neocloud routing FAQ or ASML/TSMC/Amazon Bee/Meta Muse/Apple Intelligence/Microsoft Copilot/MAI-Base/Surface Laptop Ultra/Grok/Gemini/Samsung/Samsung-glasses/Character.ai/CERT-In/Hugging Face/Qwen/Oracle/DeepSeek/DeepSeek-V4.1-Flash/Mistral/OpenAI-outage/ChatGPT-Chrome/Meta-Apple-Mac destinations or Anthropic ECDSA/METR/CERT-In/Surface Laptop Ultra/DeepSeek V4.1 Flash/Claude Mythos 5 watchlist table rows (FINDABILITY #158/#166/#167/#169/#170/#171/#173/#174/#175/#176/#177/#178/#179/#180/#181/#182/#191/#193/#195/#220/#400/#410/#414/#418/#420) — re-overlay search-trends.html (+ trends.html alias) or wait for full collect Publish on tip ≥ #420`,
    });
  }

  // FINDABILITY #161 — NVIDIA lab FAQ for Nvidia / NVDA Trends wiped or never landed.
  if (ours.nvidia_nvda_faq === false) {
    gaps.push({
      id: 'nvidia-nvda-faq-missing',
      severity: 'medium',
      text: `/lab/nvidia.html missing Nvidia / NVDA Trends FAQ (FINDABILITY #161) — re-overlay lab/nvidia.html or wait for full collect Publish on tip ≥ #161`,
    });
  }
  // FINDABILITY #161 — agent maps must route Nvidia / NVDA Trends to Nvidia lab.
  if (ours.agents_nvidia === false || ours.llms_nvidia === false) {
    const which = [
      ours.agents_nvidia === false ? 'agents.md' : null,
      ours.llms_nvidia === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-nvidia-missing',
      severity: 'medium',
      text: `${which} missing NVDA → /lab/nvidia.html Trends tip (FINDABILITY #161) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #161`,
    });
  }

  // FINDABILITY #162 — OpenAI lab FAQ for lawsuit / FTC tape wiped or never landed.
  if (ours.openai_lawsuit_faq === false) {
    gaps.push({
      id: 'openai-lawsuit-faq-missing',
      severity: 'medium',
      text: `/lab/openai.html missing OpenAI lawsuit / FTC FAQ (FINDABILITY #162) — re-overlay lab/openai.html or wait for full collect Publish on tip ≥ #162`,
    });
  }
  // FINDABILITY #162 — agent maps must route OpenAI lawsuit / FTC tape to OpenAI lab.
  if (ours.agents_openai_lawsuit === false || ours.llms_openai_lawsuit === false) {
    const which = [
      ours.agents_openai_lawsuit === false ? 'agents.md' : null,
      ours.llms_openai_lawsuit === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-openai-lawsuit-missing',
      severity: 'medium',
      text: `${which} missing OpenAI lawsuit → /lab/openai.html tip (FINDABILITY #162) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #162`,
    });
  }

  // FINDABILITY #163 — Anthropic lab FAQ for IPO / FTC tape wiped or never landed.
  if (ours.anthropic_ipo_faq === false) {
    gaps.push({
      id: 'anthropic-ipo-faq-missing',
      severity: 'medium',
      text: `/lab/anthropic.html missing Anthropic IPO / FTC FAQ (FINDABILITY #163) — re-overlay lab/anthropic.html or wait for full collect Publish on tip ≥ #163`,
    });
  }
  // FINDABILITY #163 — agent maps must route Anthropic IPO / FTC tape to Anthropic lab.
  if (ours.agents_anthropic_ipo === false || ours.llms_anthropic_ipo === false) {
    const which = [
      ours.agents_anthropic_ipo === false ? 'agents.md' : null,
      ours.llms_anthropic_ipo === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-anthropic-ipo-missing',
      severity: 'medium',
      text: `${which} missing Anthropic IPO → /lab/anthropic.html tip (FINDABILITY #163) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #163`,
    });
  }
  // FINDABILITY #362 — Anthropic AI safety bill FAQ wiped or never landed.
  if (ours.anthropic_ai_safety_bill_faq === false) {
    gaps.push({
      id: 'anthropic-ai-safety-bill-faq-missing',
      severity: 'medium',
      text: `/lab/anthropic.html missing Anthropic AI safety bill FAQ (FINDABILITY #362) — re-overlay lab/anthropic.html or wait for full collect Publish on tip ≥ #362`,
    });
  }
  // FINDABILITY #362 — agent maps must route AI safety bill tape to Anthropic lab.
  if (ours.agents_anthropic_ai_safety_bill === false || ours.llms_anthropic_ai_safety_bill === false) {
    const which = [
      ours.agents_anthropic_ai_safety_bill === false ? 'agents.md' : null,
      ours.llms_anthropic_ai_safety_bill === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-anthropic-ai-safety-bill-missing',
      severity: 'medium',
      text: `${which} missing AI safety bill → /lab/anthropic.html tip (FINDABILITY #362) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #362`,
    });
  }
  // FINDABILITY #368 — Anthropic Canadian data-centre FAQ wiped or never landed.
  if (ours.anthropic_canada_dc_faq === false) {
    gaps.push({
      id: 'anthropic-canada-dc-faq-missing',
      severity: 'medium',
      text: `/lab/anthropic.html missing Anthropic Canadian data centres FAQ (FINDABILITY #368) — re-overlay lab/anthropic.html or wait for full collect Publish on tip ≥ #368`,
    });
  }
  // FINDABILITY #368 — agent maps must route Canadian data-centre tape to Anthropic lab.
  if (ours.agents_anthropic_canada_dc === false || ours.llms_anthropic_canada_dc === false) {
    const which = [
      ours.agents_anthropic_canada_dc === false ? 'agents.md' : null,
      ours.llms_anthropic_canada_dc === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-anthropic-canada-dc-missing',
      severity: 'medium',
      text: `${which} missing Canadian data → /lab/anthropic.html tip (FINDABILITY #368) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #368`,
    });
  }
  // FINDABILITY #392 — Anthropic METR evaluator FAQ wiped or never landed.
  if (ours.anthropic_metr_faq === false) {
    gaps.push({
      id: 'anthropic-metr-faq-missing',
      severity: 'medium',
      text: `/lab/anthropic.html missing Anthropic METR evaluator FAQ (FINDABILITY #392) — re-overlay lab/anthropic.html or wait for full collect Publish on tip ≥ #392`,
    });
  }
  // FINDABILITY #392 — agent maps must route Anthropic / METR tape to Anthropic lab.
  if (ours.agents_anthropic_metr === false || ours.llms_anthropic_metr === false) {
    const which = [
      ours.agents_anthropic_metr === false ? 'agents.md' : null,
      ours.llms_anthropic_metr === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-anthropic-metr-missing',
      severity: 'medium',
      text: `${which} missing METR → /lab/anthropic.html tip (FINDABILITY #392) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #392`,
    });
  }
  // FINDABILITY #397 — Anthropic ECDSA curve-seed FAQ wiped or never landed.
  if (ours.anthropic_ecdsa_faq === false) {
    gaps.push({
      id: 'anthropic-ecdsa-faq-missing',
      severity: 'medium',
      text: `/lab/anthropic.html missing Anthropic ECDSA curve-seed FAQ (FINDABILITY #397) — re-overlay lab/anthropic.html or wait for full collect Publish on tip ≥ #397`,
    });
  }
  // FINDABILITY #397 — agent maps must route Anthropic / ECDSA tape to Anthropic lab.
  if (ours.agents_anthropic_ecdsa === false || ours.llms_anthropic_ecdsa === false) {
    const which = [
      ours.agents_anthropic_ecdsa === false ? 'agents.md' : null,
      ours.llms_anthropic_ecdsa === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-anthropic-ecdsa-missing',
      severity: 'medium',
      text: `${which} missing ECDSA → /lab/anthropic.html tip (FINDABILITY #397) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #397`,
    });
  }
  // FINDABILITY #402 — Claude Opus 5.5 FAQ wiped or never landed.
  if (ours.claude_opus_55_faq === false) {
    gaps.push({
      id: 'claude-opus-55-faq-missing',
      severity: 'medium',
      text: `/lab/anthropic.html missing Claude Opus 5.5 FAQ (FINDABILITY #402) — re-overlay lab/anthropic.html or wait for full collect Publish on tip ≥ #402`,
    });
  }
  // FINDABILITY #402 — agent maps must route Claude Opus 5.5 tape to Anthropic lab.
  if (ours.agents_claude_opus_55 === false || ours.llms_claude_opus_55 === false) {
    const which = [
      ours.agents_claude_opus_55 === false ? 'agents.md' : null,
      ours.llms_claude_opus_55 === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-claude-opus-55-missing',
      severity: 'medium',
      text: `${which} missing Claude Opus 5.5 → /lab/anthropic.html tip (FINDABILITY #402) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #402`,
    });
  }
  // FINDABILITY #408 — Blackstone Anthropic financing FAQ wiped or never landed.
  if (ours.blackstone_anthropic_faq === false) {
    gaps.push({
      id: 'blackstone-anthropic-faq-missing',
      severity: 'medium',
      text: `/lab/anthropic.html missing Blackstone Anthropic financing FAQ (FINDABILITY #408) — re-overlay lab/anthropic.html or wait for full collect Publish on tip ≥ #408`,
    });
  }
  // FINDABILITY #408 — agent maps must route Blackstone tape to Anthropic lab.
  if (ours.agents_blackstone_anthropic === false || ours.llms_blackstone_anthropic === false) {
    const which = [
      ours.agents_blackstone_anthropic === false ? 'agents.md' : null,
      ours.llms_blackstone_anthropic === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-blackstone-anthropic-missing',
      severity: 'medium',
      text: `${which} missing Blackstone → /lab/anthropic.html tip (FINDABILITY #408) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #408`,
    });
  }
  // FINDABILITY #412 — Replit Anthropic model-switch FAQ wiped or never landed.
  if (ours.replit_anthropic_faq === false) {
    gaps.push({
      id: 'replit-anthropic-faq-missing',
      severity: 'medium',
      text: `/lab/anthropic.html missing Replit Anthropic model-switch FAQ (FINDABILITY #412) — re-overlay lab/anthropic.html or wait for full collect Publish on tip ≥ #412`,
    });
  }
  // FINDABILITY #412 — agent maps must route Replit tape to Anthropic lab.
  if (ours.agents_replit_anthropic === false || ours.llms_replit_anthropic === false) {
    const which = [
      ours.agents_replit_anthropic === false ? 'agents.md' : null,
      ours.llms_replit_anthropic === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-replit-anthropic-missing',
      severity: 'medium',
      text: `${which} missing Replit → /lab/anthropic.html tip (FINDABILITY #412) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #412`,
    });
  }
  // FINDABILITY #420 — Claude Mythos 5 FAQ wiped or never landed.
  if (ours.claude_mythos_5_faq === false) {
    gaps.push({
      id: 'claude-mythos-5-faq-missing',
      severity: 'medium',
      text: `/lab/anthropic.html missing Claude Mythos 5 FAQ (FINDABILITY #420) — re-overlay lab/anthropic.html or wait for full collect Publish on tip ≥ #420`,
    });
  }
  // FINDABILITY #420 — agent maps must route Mythos tape to Anthropic lab.
  if (ours.agents_claude_mythos_5 === false || ours.llms_claude_mythos_5 === false) {
    const which = [
      ours.agents_claude_mythos_5 === false ? 'agents.md' : null,
      ours.llms_claude_mythos_5 === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-claude-mythos-5-missing',
      severity: 'medium',
      text: `${which} missing Claude Mythos 5 → /lab/anthropic.html tip (FINDABILITY #420) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #420`,
    });
  }

  // FINDABILITY #164 — ASML lab FAQ for EUV / AI chip-tool Trends wiped or never landed.
  if (ours.asml_trends_faq === false) {
    gaps.push({
      id: 'asml-trends-faq-missing',
      severity: 'medium',
      text: `/lab/asml.html missing ASML Trends FAQ (FINDABILITY #164) — re-overlay lab/asml.html or wait for full collect Publish on tip ≥ #164`,
    });
  }
  // FINDABILITY #164 — agent maps must route ASML / EUV Trends to ASML lab.
  if (ours.agents_asml === false || ours.llms_asml === false) {
    const which = [
      ours.agents_asml === false ? 'agents.md' : null,
      ours.llms_asml === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-asml-missing',
      severity: 'medium',
      text: `${which} missing ASML stock → /lab/asml.html Trends tip (FINDABILITY #164) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #164`,
    });
  }

  // FINDABILITY #165 — TSMC lab FAQ for AI foundry Trends wiped or never landed.
  if (ours.tsmc_trends_faq === false) {
    gaps.push({
      id: 'tsmc-trends-faq-missing',
      severity: 'medium',
      text: `/lab/tsmc.html missing TSMC Trends FAQ (FINDABILITY #165) — re-overlay lab/tsmc.html or wait for full collect Publish on tip ≥ #165`,
    });
  }
  // FINDABILITY #165 — agent maps must route TSMC / AI foundry Trends to TSMC lab.
  if (ours.agents_tsmc === false || ours.llms_tsmc === false) {
    const which = [
      ours.agents_tsmc === false ? 'agents.md' : null,
      ours.llms_tsmc === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-tsmc-missing',
      severity: 'medium',
      text: `${which} missing TSMC stock → /lab/tsmc.html Trends tip (FINDABILITY #165) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #165`,
    });
  }

  // FINDABILITY #167 — Amazon lab FAQ for Bee / wearable AI wiped or never landed.
  if (ours.amazon_bee_faq === false) {
    gaps.push({
      id: 'amazon-bee-faq-missing',
      severity: 'medium',
      text: `/lab/amazon.html missing Amazon Bee / AI wearables FAQ (FINDABILITY #167) — re-overlay lab/amazon.html or wait for full collect Publish on tip ≥ #167`,
    });
  }
  // FINDABILITY #167 — agent maps must route Amazon Bee Trends to Amazon lab.
  if (ours.agents_amazon_bee === false || ours.llms_amazon_bee === false) {
    const which = [
      ours.agents_amazon_bee === false ? 'agents.md' : null,
      ours.llms_amazon_bee === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-amazon-bee-missing',
      severity: 'medium',
      text: `${which} missing Amazon Bee → /lab/amazon.html Trends tip (FINDABILITY #167) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #167`,
    });
  }

  // FINDABILITY #169 — Meta lab FAQ for Muse / open-weight AI wiped or never landed.
  if (ours.meta_muse_faq === false) {
    gaps.push({
      id: 'meta-muse-faq-missing',
      severity: 'medium',
      text: `/lab/meta.html missing Meta Muse / open-weight AI FAQ (FINDABILITY #169) — re-overlay lab/meta.html or wait for full collect Publish on tip ≥ #169`,
    });
  }
  // FINDABILITY #169 — agent maps must route Meta Muse Trends to Meta lab.
  if (ours.agents_meta_muse === false || ours.llms_meta_muse === false) {
    const which = [
      ours.agents_meta_muse === false ? 'agents.md' : null,
      ours.llms_meta_muse === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-meta-muse-missing',
      severity: 'medium',
      text: `${which} missing Meta Muse → /lab/meta.html Trends tip (FINDABILITY #169) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #169`,
    });
  }

  // FINDABILITY #170 — Apple lab FAQ for Apple Intelligence wiped or never landed.
  if (ours.apple_intelligence_faq === false) {
    gaps.push({
      id: 'apple-intelligence-faq-missing',
      severity: 'medium',
      text: `/lab/apple.html missing Apple Intelligence FAQ (FINDABILITY #170) — re-overlay lab/apple.html or wait for full collect Publish on tip ≥ #170`,
    });
  }
  // FINDABILITY #170 — agent maps must route Apple Intelligence Trends to Apple lab.
  if (ours.agents_apple_intelligence === false || ours.llms_apple_intelligence === false) {
    const which = [
      ours.agents_apple_intelligence === false ? 'agents.md' : null,
      ours.llms_apple_intelligence === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-apple-intelligence-missing',
      severity: 'medium',
      text: `${which} missing Apple Intelligence → /lab/apple.html Trends tip (FINDABILITY #170) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #170`,
    });
  }

  // FINDABILITY #171 — Microsoft lab FAQ for Copilot wiped or never landed.
  if (ours.microsoft_copilot_faq === false) {
    gaps.push({
      id: 'microsoft-copilot-faq-missing',
      severity: 'medium',
      text: `/lab/microsoft.html missing Microsoft Copilot FAQ (FINDABILITY #171) — re-overlay lab/microsoft.html or wait for full collect Publish on tip ≥ #171`,
    });
  }
  // FINDABILITY #171 — agent maps must route Microsoft Copilot Trends to Microsoft lab.
  if (ours.agents_microsoft_copilot === false || ours.llms_microsoft_copilot === false) {
    const which = [
      ours.agents_microsoft_copilot === false ? 'agents.md' : null,
      ours.llms_microsoft_copilot === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-microsoft-copilot-missing',
      severity: 'medium',
      text: `${which} missing Microsoft Copilot → /lab/microsoft.html Trends tip (FINDABILITY #171) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #171`,
    });
  }

  // FINDABILITY #220 — Microsoft lab FAQ for MAI-Base wiped or never landed.
  if (ours.microsoft_mai_faq === false) {
    gaps.push({
      id: 'microsoft-mai-faq-missing',
      severity: 'medium',
      text: `/lab/microsoft.html missing Microsoft MAI-Base FAQ (FINDABILITY #220) — re-overlay lab/microsoft.html or wait for full collect Publish on tip ≥ #220`,
    });
  }
  // FINDABILITY #220 — agent maps must route MAI-Base / MAI-Base-2 to Microsoft lab.
  if (ours.agents_microsoft_mai === false || ours.llms_microsoft_mai === false) {
    const which = [
      ours.agents_microsoft_mai === false ? 'agents.md' : null,
      ours.llms_microsoft_mai === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-microsoft-mai-missing',
      severity: 'medium',
      text: `${which} missing Microsoft MAI-Base → /lab/microsoft.html tip (FINDABILITY #220) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #220`,
    });
  }

  // FINDABILITY #414 — Microsoft lab FAQ for Surface Laptop Ultra wiped or never landed.
  if (ours.surface_ultra_faq === false) {
    gaps.push({
      id: 'surface-ultra-faq-missing',
      severity: 'medium',
      text: `/lab/microsoft.html missing Surface Laptop Ultra FAQ (FINDABILITY #414) — re-overlay lab/microsoft.html or wait for full collect Publish on tip ≥ #414`,
    });
  }
  // FINDABILITY #414 — agent maps must route Surface Laptop Ultra to Microsoft lab.
  if (ours.agents_surface_ultra === false || ours.llms_surface_ultra === false) {
    const which = [
      ours.agents_surface_ultra === false ? 'agents.md' : null,
      ours.llms_surface_ultra === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-surface-ultra-missing',
      severity: 'medium',
      text: `${which} missing Surface Laptop Ultra → /lab/microsoft.html tip (FINDABILITY #414) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #414`,
    });
  }

  // FINDABILITY #418 — DeepSeek lab FAQ for V4.1 Flash wiped or never landed.
  if (ours.deepseek_flash_faq === false) {
    gaps.push({
      id: 'deepseek-flash-faq-missing',
      severity: 'medium',
      text: `/lab/deepseek.html missing DeepSeek V4.1 Flash FAQ (FINDABILITY #418) — re-overlay lab/deepseek.html or wait for full collect Publish on tip ≥ #418`,
    });
  }
  // FINDABILITY #418 — agent maps must route DeepSeek V4.1 Flash to DeepSeek lab.
  if (ours.agents_deepseek_flash === false || ours.llms_deepseek_flash === false) {
    const which = [
      ours.agents_deepseek_flash === false ? 'agents.md' : null,
      ours.llms_deepseek_flash === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-deepseek-flash-missing',
      severity: 'medium',
      text: `${which} missing DeepSeek V4.1 Flash → /lab/deepseek.html tip (FINDABILITY #418) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #418`,
    });
  }

  // FINDABILITY #173 — xAI lab FAQ for Grok wiped or never landed.
  if (ours.xai_grok_faq === false) {
    gaps.push({
      id: 'xai-grok-faq-missing',
      severity: 'medium',
      text: `/lab/xai.html missing Grok / xAI FAQ (FINDABILITY #173) — re-overlay lab/xai.html or wait for full collect Publish on tip ≥ #173`,
    });
  }
  // FINDABILITY #173 — agent maps must route Grok / xAI Trends to xAI lab.
  if (ours.agents_xai_grok === false || ours.llms_xai_grok === false) {
    const which = [
      ours.agents_xai_grok === false ? 'agents.md' : null,
      ours.llms_xai_grok === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-xai-grok-missing',
      severity: 'medium',
      text: `${which} missing Grok / xAI → /lab/xai.html Trends tip (FINDABILITY #173) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #173`,
    });
  }

  // FINDABILITY #174 — DeepMind lab FAQ for Gemini / Gemma wiped or never landed.
  if (ours.gemini_gemma_faq === false) {
    gaps.push({
      id: 'gemini-gemma-faq-missing',
      severity: 'medium',
      text: `/lab/google-deepmind.html missing Gemini / Gemma / Argon FAQ (FINDABILITY #174/#187) — re-overlay lab/google-deepmind.html or wait for full collect Publish on tip ≥ #187`,
    });
  }
  // FINDABILITY #174 — agent maps must route Gemini / Gemma Trends to DeepMind lab.
  if (ours.agents_gemini_gemma === false || ours.llms_gemini_gemma === false) {
    const which = [
      ours.agents_gemini_gemma === false ? 'agents.md' : null,
      ours.llms_gemini_gemma === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-gemini-gemma-missing',
      severity: 'medium',
      text: `${which} missing Gemini / Gemma / Argon → /lab/google-deepmind.html Trends tip (FINDABILITY #174/#187) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #187`,
    });
  }

  // FINDABILITY #175 — Samsung lab FAQ for HBM / AI memory wiped or never landed.
  if (ours.samsung_hbm_faq === false) {
    gaps.push({
      id: 'samsung-hbm-faq-missing',
      severity: 'medium',
      text: `/lab/samsung.html missing Samsung / AI memory FAQ (FINDABILITY #175) — re-overlay lab/samsung.html or wait for full collect Publish on tip ≥ #175`,
    });
  }
  // FINDABILITY #175 — agent maps must route Samsung / AI memory Trends to Samsung lab.
  if (ours.agents_samsung_hbm === false || ours.llms_samsung_hbm === false) {
    const which = [
      ours.agents_samsung_hbm === false ? 'agents.md' : null,
      ours.llms_samsung_hbm === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-samsung-hbm-missing',
      severity: 'medium',
      text: `${which} missing Samsung / AI memory → /lab/samsung.html Trends tip (FINDABILITY #175) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #175`,
    });
  }

  // FINDABILITY #195 — Samsung lab FAQ for AI glasses wiped or never landed.
  if (ours.samsung_glasses_faq === false) {
    gaps.push({
      id: 'samsung-glasses-faq-missing',
      severity: 'medium',
      text: `/lab/samsung.html missing Samsung AI glasses FAQ (FINDABILITY #195) — re-overlay lab/samsung.html or wait for full collect Publish on tip ≥ #195`,
    });
  }
  // FINDABILITY #195 — agent maps must route Samsung AI glasses Trends to Samsung lab.
  if (ours.agents_samsung_glasses === false || ours.llms_samsung_glasses === false) {
    const which = [
      ours.agents_samsung_glasses === false ? 'agents.md' : null,
      ours.llms_samsung_glasses === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-samsung-glasses-missing',
      severity: 'medium',
      text: `${which} missing Samsung AI glasses → /lab/samsung.html Trends tip (FINDABILITY #195) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #195`,
    });
  }

  // FINDABILITY #176 — Chatbots tag FAQ for Character.ai bankruptcy wiped or never landed.
  if (ours.character_ai_faq === false) {
    gaps.push({
      id: 'character-ai-faq-missing',
      severity: 'medium',
      text: `/tags/chatbots.html missing Character.ai bankruptcy FAQ (FINDABILITY #176) — re-overlay tags/chatbots.html or wait for full collect Publish on tip ≥ #176`,
    });
  }
  // FINDABILITY #176 — agent maps must route Character.ai bankruptcy Trends to Chatbots tag.
  if (ours.agents_character_ai === false || ours.llms_character_ai === false) {
    const which = [
      ours.agents_character_ai === false ? 'agents.md' : null,
      ours.llms_character_ai === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-character-ai-missing',
      severity: 'medium',
      text: `${which} missing Character.ai bankruptcy → /tags/chatbots.html Trends tip (FINDABILITY #176) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #176`,
    });
  }

  // FINDABILITY #410 — Agents tag FAQ for CERT-In wiped or never landed.
  if (ours.cert_in_faq === false) {
    gaps.push({
      id: 'cert-in-faq-missing',
      severity: 'medium',
      text: `/tags/agents.html missing CERT-In FAQ (FINDABILITY #410) — re-overlay tags/agents.html or wait for full collect Publish on tip ≥ #410`,
    });
  }
  // FINDABILITY #410 — agent maps must route CERT-In Trends to Agents tag.
  if (ours.agents_cert_in === false || ours.llms_cert_in === false) {
    const which = [
      ours.agents_cert_in === false ? 'agents.md' : null,
      ours.llms_cert_in === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-cert-in-missing',
      severity: 'medium',
      text: `${which} missing CERT-In → /tags/agents.html Trends tip (FINDABILITY #410) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #410`,
    });
  }

  // FINDABILITY #177 — Qwen lab FAQ wiped or never landed.
  if (ours.qwen_faq === false) {
    gaps.push({
      id: 'qwen-faq-missing',
      severity: 'medium',
      text: `/lab/qwen.html missing Qwen / Alibaba open-weight FAQ (FINDABILITY #177) — re-overlay lab/qwen.html or wait for full collect Publish on tip ≥ #177`,
    });
  }
  // FINDABILITY #177 — agent maps must route Qwen Trends to Qwen lab.
  if (ours.agents_qwen === false || ours.llms_qwen === false) {
    const which = [
      ours.agents_qwen === false ? 'agents.md' : null,
      ours.llms_qwen === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-qwen-missing',
      severity: 'medium',
      text: `${which} missing Qwen / Alibaba open-weight → /lab/qwen.html Trends tip (FINDABILITY #177) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #177`,
    });
  }

  // FINDABILITY #178 — Datacenters tag FAQ for Oracle wiped or never landed.
  if (ours.oracle_datacenters_faq === false) {
    gaps.push({
      id: 'oracle-datacenters-faq-missing',
      severity: 'medium',
      text: `/tags/datacenters.html missing Oracle / AI datacenter FAQ (FINDABILITY #178) — re-overlay tags/datacenters.html or wait for full collect Publish on tip ≥ #178`,
    });
  }
  // FINDABILITY #178 — agent maps must route Oracle / AI datacenter Trends to Datacenters tag.
  if (ours.agents_oracle_datacenters === false || ours.llms_oracle_datacenters === false) {
    const which = [
      ours.agents_oracle_datacenters === false ? 'agents.md' : null,
      ours.llms_oracle_datacenters === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-oracle-datacenters-missing',
      severity: 'medium',
      text: `${which} missing Oracle datacenter → /tags/datacenters.html Trends tip (FINDABILITY #178) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #178`,
    });
  }

  // FINDABILITY #179 — DeepSeek lab FAQ wiped or never landed.
  if (ours.deepseek_faq === false) {
    gaps.push({
      id: 'deepseek-faq-missing',
      severity: 'medium',
      text: `/lab/deepseek.html missing DeepSeek outage FAQ (FINDABILITY #179) — re-overlay lab/deepseek.html or wait for full collect Publish on tip ≥ #179`,
    });
  }
  // FINDABILITY #179 — agent maps must route DeepSeek outage Trends to DeepSeek lab.
  if (ours.agents_deepseek === false || ours.llms_deepseek === false) {
    const which = [
      ours.agents_deepseek === false ? 'agents.md' : null,
      ours.llms_deepseek === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-deepseek-missing',
      severity: 'medium',
      text: `${which} missing DeepSeek outage → /lab/deepseek.html Trends tip (FINDABILITY #179) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #179`,
    });
  }

  // FINDABILITY #180 — Mistral lab FAQ wiped or never landed.
  if (ours.mistral_faq === false) {
    gaps.push({
      id: 'mistral-faq-missing',
      severity: 'medium',
      text: `/lab/mistral.html missing Mistral / Timestral FAQ (FINDABILITY #180) — re-overlay lab/mistral.html or wait for full collect Publish on tip ≥ #180`,
    });
  }
  // FINDABILITY #180 — agent maps must route Mistral / Timestral Trends to Mistral lab.
  if (ours.agents_mistral === false || ours.llms_mistral === false) {
    const which = [
      ours.agents_mistral === false ? 'agents.md' : null,
      ours.llms_mistral === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-mistral-missing',
      severity: 'medium',
      text: `${which} missing Timestral → /lab/mistral.html Trends tip (FINDABILITY #180) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #180`,
    });
  }

  // FINDABILITY #181 — OpenAI outage FAQ wiped or never landed.
  if (ours.openai_outage_faq === false) {
    gaps.push({
      id: 'openai-outage-faq-missing',
      severity: 'medium',
      text: `/lab/openai.html missing OpenAI outage FAQ (FINDABILITY #181) — re-overlay lab/openai.html or wait for full collect Publish on tip ≥ #181`,
    });
  }
  // FINDABILITY #181 — agent maps must route OpenAI outage Trends to OpenAI lab.
  if (ours.agents_openai_outage === false || ours.llms_openai_outage === false) {
    const which = [
      ours.agents_openai_outage === false ? 'agents.md' : null,
      ours.llms_openai_outage === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-openai-outage-missing',
      severity: 'medium',
      text: `${which} missing OpenAI outage → /lab/openai.html Trends tip (FINDABILITY #181) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #181`,
    });
  }

  // FINDABILITY #191 — ChatGPT Chrome / computer use FAQ wiped or never landed.
  if (ours.openai_chrome_faq === false) {
    gaps.push({
      id: 'openai-chrome-faq-missing',
      severity: 'medium',
      text: `/lab/openai.html missing ChatGPT Chrome / computer use FAQ (FINDABILITY #191) — re-overlay lab/openai.html or wait for full collect Publish on tip ≥ #191`,
    });
  }
  // FINDABILITY #191 — agent maps must route ChatGPT Chrome Trends to OpenAI lab.
  if (ours.agents_openai_chrome === false || ours.llms_openai_chrome === false) {
    const which = [
      ours.agents_openai_chrome === false ? 'agents.md' : null,
      ours.llms_openai_chrome === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-openai-chrome-missing',
      severity: 'medium',
      text: `${which} missing ChatGPT Chrome → /lab/openai.html Trends tip (FINDABILITY #191) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #191`,
    });
  }

  // FINDABILITY #193 — Meta–Apple Mac AI FAQ wiped or never landed.
  if (ours.meta_apple_mac_faq === false) {
    gaps.push({
      id: 'meta-apple-mac-faq-missing',
      severity: 'medium',
      text: `/lab/meta.html missing Meta–Apple Mac AI FAQ (FINDABILITY #193) — re-overlay lab/meta.html or wait for full collect Publish on tip ≥ #193`,
    });
  }
  // FINDABILITY #193 — agent maps must route Meta–Apple Mac AI Trends to Meta lab.
  if (ours.agents_meta_apple_mac === false || ours.llms_meta_apple_mac === false) {
    const which = [
      ours.agents_meta_apple_mac === false ? 'agents.md' : null,
      ours.llms_meta_apple_mac === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-meta-apple-mac-missing',
      severity: 'medium',
      text: `${which} missing Meta–Apple Mac AI → /lab/meta.html Trends tip (FINDABILITY #193) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #193`,
    });
  }

  // FINDABILITY #182 — Hugging Face tag FAQ wiped or never landed.
  if (ours.huggingface_faq === false) {
    gaps.push({
      id: 'huggingface-faq-missing',
      severity: 'medium',
      text: `/tags/huggingface.html missing Hugging Face hack FAQ (FINDABILITY #182) — re-overlay tags/huggingface.html or wait for full collect Publish on tip ≥ #182`,
    });
  }
  // FINDABILITY #182 — agent maps must route Hugging Face hack Trends to Hugging Face tag.
  if (ours.agents_huggingface === false || ours.llms_huggingface === false) {
    const which = [
      ours.agents_huggingface === false ? 'agents.md' : null,
      ours.llms_huggingface === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-huggingface-missing',
      severity: 'medium',
      text: `${which} missing Hugging Face hack → /tags/huggingface.html Trends tip (FINDABILITY #182) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #182`,
    });
  }

  // FINDABILITY #183 — Palantir lab FAQ wiped or never landed.
  if (ours.palantir_faq === false) {
    gaps.push({
      id: 'palantir-faq-missing',
      severity: 'medium',
      text: `/lab/palantir.html missing Palantir / AIP FAQ (FINDABILITY #183) — re-overlay lab/palantir.html or wait for full collect Publish on tip ≥ #183`,
    });
  }
  // FINDABILITY #183 — agent maps must route Palantir / AIP Trends to Palantir lab.
  if (ours.agents_palantir === false || ours.llms_palantir === false) {
    const which = [
      ours.agents_palantir === false ? 'agents.md' : null,
      ours.llms_palantir === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-palantir-missing',
      severity: 'medium',
      text: `${which} missing Palantir / AIP → /lab/palantir.html Trends tip (FINDABILITY #183) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #183`,
    });
  }
  // FINDABILITY #406 — Ondas-Palantir FAQ wiped or never landed.
  if (ours.ondas_palantir_faq === false) {
    gaps.push({
      id: 'ondas-palantir-faq-missing',
      severity: 'medium',
      text: `/lab/palantir.html missing Ondas-Palantir FAQ (FINDABILITY #406) — re-overlay lab/palantir.html or wait for full collect Publish on tip ≥ #406`,
    });
  }
  // FINDABILITY #406 — agent maps must route Ondas tape to Palantir lab.
  if (ours.agents_ondas_palantir === false || ours.llms_ondas_palantir === false) {
    const which = [
      ours.agents_ondas_palantir === false ? 'agents.md' : null,
      ours.llms_ondas_palantir === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-ondas-palantir-missing',
      severity: 'medium',
      text: `${which} missing Ondas → /lab/palantir.html tip (FINDABILITY #406) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #406`,
    });
  }

  // FINDABILITY #184 — AMD lab FAQ wiped or never landed.
  if (ours.amd_faq === false) {
    gaps.push({
      id: 'amd-faq-missing',
      severity: 'medium',
      text: `/lab/amd.html missing AMD / MI300 FAQ (FINDABILITY #184) — re-overlay lab/amd.html or wait for full collect Publish on tip ≥ #184`,
    });
  }
  // FINDABILITY #184 — agent maps must route AMD / MI300 Trends to AMD lab.
  if (ours.agents_amd === false || ours.llms_amd === false) {
    const which = [
      ours.agents_amd === false ? 'agents.md' : null,
      ours.llms_amd === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-amd-missing',
      severity: 'medium',
      text: `${which} missing AMD / MI300 → /lab/amd.html Trends tip (FINDABILITY #184) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #184`,
    });
  }

  // FINDABILITY #185 — Tesla lab FAQ wiped or never landed.
  if (ours.tesla_faq === false) {
    gaps.push({
      id: 'tesla-faq-missing',
      severity: 'medium',
      text: `/lab/tesla.html missing Tesla / FSD FAQ (FINDABILITY #185) — re-overlay lab/tesla.html or wait for full collect Publish on tip ≥ #185`,
    });
  }
  // FINDABILITY #185 — agent maps must route Tesla / FSD Trends to Tesla lab.
  if (ours.agents_tesla === false || ours.llms_tesla === false) {
    const which = [
      ours.agents_tesla === false ? 'agents.md' : null,
      ours.llms_tesla === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-tesla-missing',
      severity: 'medium',
      text: `${which} missing Tesla / FSD → /lab/tesla.html Trends tip (FINDABILITY #185) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #185`,
    });
  }

  // FINDABILITY #372 — Waymo Canada FAQ wiped or never landed.
  if (ours.waymo_canada_faq === false) {
    gaps.push({
      id: 'waymo-canada-faq-missing',
      severity: 'medium',
      text: `/lab/waymo.html missing Waymo Canada / Toronto FAQ (FINDABILITY #372) — re-overlay lab/waymo.html or wait for full collect Publish on tip ≥ #372`,
    });
  }
  // FINDABILITY #372 — agent maps must route Waymo Canada tape to Waymo lab.
  if (ours.agents_waymo_canada === false || ours.llms_waymo_canada === false) {
    const which = [
      ours.agents_waymo_canada === false ? 'agents.md' : null,
      ours.llms_waymo_canada === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-waymo-canada-missing',
      severity: 'medium',
      text: `${which} missing Waymo Canada → /lab/waymo.html tip (FINDABILITY #372) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #372`,
    });
  }

  // FINDABILITY #374 — SoftBank Allied FAQ wiped or never landed.
  if (ours.softbank_allied_faq === false) {
    gaps.push({
      id: 'softbank-allied-faq-missing',
      severity: 'medium',
      text: `/lab/softbank.html missing SoftBank Allied Universal FAQ (FINDABILITY #374) — re-overlay lab/softbank.html or wait for full collect Publish on tip ≥ #374`,
    });
  }
  // FINDABILITY #374 — agent maps must route SoftBank / Allied tape to SoftBank lab.
  if (ours.agents_softbank_allied === false || ours.llms_softbank_allied === false) {
    const which = [
      ours.agents_softbank_allied === false ? 'agents.md' : null,
      ours.llms_softbank_allied === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-softbank-allied-missing',
      severity: 'medium',
      text: `${which} missing Allied Universal → /lab/softbank.html tip (FINDABILITY #374) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #374`,
    });
  }

  // FINDABILITY #376 — SpaceX Starshield FAQ wiped or never landed.
  if (ours.spacex_starshield_faq === false) {
    gaps.push({
      id: 'spacex-starshield-faq-missing',
      severity: 'medium',
      text: `/lab/spacex.html missing SpaceX Starshield FAQ (FINDABILITY #376) — re-overlay lab/spacex.html or wait for full collect Publish on tip ≥ #376`,
    });
  }
  // FINDABILITY #376 — agent maps must route SpaceX / Starshield tape to SpaceX lab.
  if (ours.agents_spacex_starshield === false || ours.llms_spacex_starshield === false) {
    const which = [
      ours.agents_spacex_starshield === false ? 'agents.md' : null,
      ours.llms_spacex_starshield === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-spacex-starshield-missing',
      severity: 'medium',
      text: `${which} missing Starshield → /lab/spacex.html tip (FINDABILITY #376) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #376`,
    });
  }

  // FINDABILITY #378 — Tesla Flying Roadster FAQ wiped or never landed.
  if (ours.tesla_flying_roadster_faq === false) {
    gaps.push({
      id: 'tesla-flying-roadster-faq-missing',
      severity: 'medium',
      text: `/lab/tesla.html missing Tesla Flying Roadster FAQ (FINDABILITY #378) — re-overlay lab/tesla.html or wait for full collect Publish on tip ≥ #378`,
    });
  }
  // FINDABILITY #378 — agent maps must route Tesla Flying Roadster tape to Tesla lab.
  if (ours.agents_tesla_flying_roadster === false || ours.llms_tesla_flying_roadster === false) {
    const which = [
      ours.agents_tesla_flying_roadster === false ? 'agents.md' : null,
      ours.llms_tesla_flying_roadster === false ? 'llms.txt' : null,
    ].filter(Boolean).join(' + ');
    gaps.push({
      id: 'agents-tesla-flying-roadster-missing',
      severity: 'medium',
      text: `${which} missing Flying Roadster → /lab/tesla.html tip (FINDABILITY #378) — re-overlay agent maps or wait for collect/news-fast Publish on tip ≥ #378`,
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

  // FINDABILITY #126/#127/#128 — conquest FAQ hubs wiped by orphan tip lag.
  if (Array.isArray(ours.conquest_faq_lags) && ours.conquest_faq_lags.length > 0) {
    const sample = ours.conquest_faq_lags
      .slice(0, 3)
      .map((row) => `${row.path} (−${row.needle})`)
      .join(', ');
    gaps.push({
      id: 'conquest-faq-missing',
      severity: 'medium',
      text: `conquest FAQ hub lag on ${ours.conquest_faq_lags.length} page(s) (e.g. ${sample}) — re-overlay compare/alternatives or wait for news-fast/collect Publish on tip ≥ #128 (FINDABILITY #128)`,
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
    // FINDABILITY #143 — home knowsAbout must keep #142 labAboutLabel (ours only).
    home_lab_about_labels: site.ours && home?.ok ? hasHomeLabAboutLabels(home.value) : null,
    // FINDABILITY #423 — home DoomBench conquest every-room + FAQ path (ours only).
    home_doombench_conquest: site.ours && home?.ok ? hasHomeDoombenchConquest(home.value) : null,
    // FINDABILITY #425/#427 — home Skynet Countdown conquest every-room + FAQ path (ours only).
    home_skynet_conquest: site.ours && home?.ok ? hasHomeSkynetConquest(home.value) : null,
    // FINDABILITY #429 — home PizzINT + Takeoff Tracker conquest every-room (ours only).
    home_pizzint_conquest: site.ours && home?.ok ? hasHomePizzintConquest(home.value) : null,
    home_takeoff_conquest: site.ours && home?.ok ? hasHomeTakeoffConquest(home.value) : null,
    // FINDABILITY #254 — home exact unbranded head-term FAQ (ours only).
    home_activity_index_faq: site.ours && home?.ok ? hasHomeActivityIndexFaq(home.value) : null,
    // FINDABILITY #284 — home title-match “AI activity index today” FAQ (ours only).
    home_activity_index_today_faq: site.ours && home?.ok ? hasHomeActivityIndexTodayFaq(home.value) : null,
    // FINDABILITY #264 — home #262 level-alias FAQ prose (ours only).
    home_activity_level_faq_alias: site.ours && home?.ok ? hasHomeActivityLevelFaqAlias(home.value) : null,
    // FINDABILITY #296 — dual head-term <title> keeps “AI activity level today ·”.
    home_activity_level_title: site.ours && home?.ok ? hasHomeActivityLevelTitle(home.value) : null,
    // FINDABILITY #308 — H1 .v2-sr keeps dual head terms beside brand pixel.
    home_activity_h1_head_terms: site.ours && home?.ok ? hasHomeActivityH1HeadTerms(home.value) : null,
    // FINDABILITY #312/#314 — <title> drops level_name so SERP keeps both head terms.
    home_activity_title_trim: site.ours && home?.ok ? hasHomeTitleTrimmed(home.value) : null,
    sitemap_urls: null,
    sitemap_is_index: null,
    news_sitemap_urls: null,
    robots_ok: Boolean(robots?.ok),
    llms_ok: Boolean(llms?.ok),
    error: home?.ok ? undefined : (home?.error?.message || home?.error || 'home fetch failed'),
  };

  if (site.ours) {
    row.robots_tips = robots?.ok ? hasRobotsTips(robots.value) : false;
    // FINDABILITY #489 — head + robots must name skill.md, now.txt, and /AGENTS.md.
    row.agent_use_links = (home?.ok && robots?.ok)
      ? hasAgentUseLinks(home.value, robots.value)
      : false;
  }

  if (sm?.ok) {
    row.sitemap_urls = countLocs(sm.value);
    row.sitemap_is_index = isSitemapIndex(sm.value);
    if (site.ours) {
      row.sitemap_tips = hasSitemapTips(sm.value);
      // FINDABILITY #322 — classic panel must stay listed in the URL sitemap.
      row.classic_sitemap = hasClassicSitemapLoc(sm.value);
    }
  } else if (sm) {
    row.sitemap_error = sm.error?.message || `HTTP ${sm.status}`;
    if (site.ours) {
      row.sitemap_tips = false;
      row.classic_sitemap = false;
    }
  }

  if (news?.ok) {
    row.news_sitemap_urls = countLocs(news.value);
    if (site.ours) {
      row.news_sitemap_tips = hasSitemapTips(news.value);
      const newest = newestNewsPublicationMs(news.value);
      row.news_newest_publication_at = newest != null ? new Date(newest).toISOString() : null;
      row.news_keyword_lags = newsKeywordLags(news.value);
      // FINDABILITY #148 — parent lab titles must keep #146/#147 aliases.
      row.news_lab_alias_lags = newsLabAliasKeywordLags(news.value);
    }
  } else if (news) {
    // Missing news sitemap is normal for most rivals; record null, not error noise.
    row.news_sitemap_urls = news.status === 404 ? 0 : null;
    if (site.ours) {
      row.news_sitemap_tips = false;
      row.news_newest_publication_at = null;
      row.news_keyword_lags = [];
      row.news_lab_alias_lags = [];
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
    // FINDABILITY #186 — Search Trends tip freshness from live JSON.
    const trendsJson = byUrl.get(`${base}/api/search-trends.json`);
    if (trendsJson?.ok) {
      const ms = trendsGeneratedAtMs(trendsJson.value);
      row.trends_generated_at = ms != null ? new Date(ms).toISOString() : null;
    } else {
      row.trends_generated_at = null;
    }
    // FINDABILITY #119 — agent maps must list short aliases after #116 overlay.
    // Prefer the surface fetch (OUR_SURFACES); fall back to measure llms row.
    const agentsMd = byUrl.get(`${base}/agents.md`);
    const llmsBody = llms?.ok ? llms.value : '';
    row.agents_vs_aliases = agentsMd?.ok ? hasVsShortAliases(agentsMd.value) : false;
    row.llms_vs_aliases = llms?.ok ? hasVsShortAliases(llmsBody) : false;
    // FINDABILITY #125 — agent maps must list /trends.html after #124 overlay.
    row.agents_trends_alias = agentsMd?.ok ? hasTrendsShortAlias(agentsMd.value) : false;
    row.llms_trends_alias = llms?.ok ? hasTrendsShortAlias(llmsBody) : false;
    // FINDABILITY #130 — agent maps must list /pdoom.html after #129 overlay.
    row.agents_pdoom_alias = agentsMd?.ok ? hasPdoomShortAlias(agentsMd.value) : false;
    row.llms_pdoom_alias = llms?.ok ? hasPdoomShortAlias(llmsBody) : false;
    // FINDABILITY #252 — agent maps must list /ai-activity-index.html after overlay.
    row.agents_activity_index_alias = agentsMd?.ok ? hasActivityIndexAlias(agentsMd.value) : false;
    row.llms_activity_index_alias = llms?.ok ? hasActivityIndexAlias(llmsBody) : false;
    // FINDABILITY #262 — agent maps must list /ai-activity-level.html after overlay.
    row.agents_activity_level_alias = agentsMd?.ok ? hasActivityLevelAlias(agentsMd.value) : false;
    row.llms_activity_level_alias = llms?.ok ? hasActivityLevelAlias(llmsBody) : false;
    // FINDABILITY #433 — agent maps must name contiguous “AI activity level today”.
    row.agents_activity_level_head_term = agentsMd?.ok
      ? hasActivityLevelHeadTerm(agentsMd.value) : false;
    row.llms_activity_level_head_term = llms?.ok
      ? hasActivityLevelHeadTerm(llmsBody) : false;
    // FINDABILITY #324 — agent maps must list /classic.html after overlay.
    row.agents_classic_panel = agentsMd?.ok ? hasClassicPanelAgentMap(agentsMd.value) : false;
    row.llms_classic_panel = llms?.ok ? hasClassicPanelAgentMap(llmsBody) : false;
    // FINDABILITY #326 — skill.md must list /classic.html after overlay.
    const skillMd = byUrl.get(`${base}/skill.md`);
    row.skill_classic_panel = skillMd?.ok ? hasSkillClassicPanel(skillMd.value) : false;
    // FINDABILITY #435 — skill.md must name contiguous “AI activity level today”.
    row.skill_activity_level_head_term = skillMd?.ok
      ? hasActivityLevelHeadTerm(skillMd.value) : false;
    // FINDABILITY #437 — agents.html must name dual middot head terms.
    const agentsHtml = byUrl.get(`${base}/agents.html`);
    row.agents_html_dual_head_term = agentsHtml?.ok
      ? hasAgentsHtmlDualHeadTerm(agentsHtml.value) : false;
    // FINDABILITY #328 — agents.txt / ai.txt / api-catalog must list classic.
    const agentsTxt = byUrl.get(`${base}/agents.txt`);
    const aiTxt = byUrl.get(`${base}/ai.txt`);
    const catalog = byUrl.get(`${base}/.well-known/api-catalog`);
    row.agents_txt_classic_panel = agentsTxt?.ok ? hasDiscoveryClassicPanel(agentsTxt.value) : false;
    row.ai_txt_classic_panel = aiTxt?.ok ? hasDiscoveryClassicPanel(aiTxt.value) : false;
    row.catalog_classic_panel = catalog?.ok ? hasCatalogClassicPanel(catalog.value) : false;
    // FINDABILITY #439 — agents.txt / ai.txt must name dual middot head terms.
    row.agents_txt_dual_head_term = agentsTxt?.ok
      ? hasDiscoveryDualHeadTerm(agentsTxt.value) : false;
    row.ai_txt_dual_head_term = aiTxt?.ok
      ? hasDiscoveryDualHeadTerm(aiTxt.value) : false;
    // FINDABILITY #330 — agents.json / openapi / api/index must list classic.
    const agentsJson = byUrl.get(`${base}/agents.json`);
    const openapiJson = byUrl.get(`${base}/openapi.json`);
    const apiIndexJson = byUrl.get(`${base}/api/index.json`);
    row.agents_json_classic_panel = agentsJson?.ok ? hasAgentsJsonClassicPanel(agentsJson.value) : false;
    row.openapi_classic_panel = openapiJson?.ok ? hasOpenapiClassicPanel(openapiJson.value) : false;
    row.api_index_classic_panel = apiIndexJson?.ok ? hasApiIndexClassicPanel(apiIndexJson.value) : false;
    // FINDABILITY #441 — agents.json must name dual middot home_title.
    row.agents_json_dual_head_term = agentsJson?.ok
      ? hasAgentsJsonDualHeadTerm(agentsJson.value) : false;
    // FINDABILITY #446 — openapi `/` + api/index home_title dual (silent after #441 tip wipe).
    row.openapi_dual_head_term = openapiJson?.ok
      ? hasOpenapiDualHeadTerm(openapiJson.value) : false;
    row.api_index_dual_head_term = apiIndexJson?.ok
      ? hasApiIndexDualHeadTerm(apiIndexJson.value) : false;
    // FINDABILITY #332 — free-tools.html must list classic panel after overlay.
    const freeToolsHtml = byUrl.get(`${base}/free-tools.html`);
    row.freetools_classic_panel = freeToolsHtml?.ok
      ? hasFreeToolsClassicPanel(freeToolsHtml.value)
      : false;
    // FINDABILITY #443 — free-tools.html must name dual middot head terms.
    row.freetools_dual_head_term = freeToolsHtml?.ok
      ? hasFreeToolsDualHeadTerm(freeToolsHtml.value)
      : false;
    // FINDABILITY #451 — verify.html must name dual middot head terms.
    const verifyHtml = byUrl.get(`${base}/verify.html`);
    row.verify_dual_head_term = verifyHtml?.ok
      ? hasVerifyDualHeadTerm(verifyHtml.value)
      : false;
    // FINDABILITY #453 — compare / alternatives hubs must name dual middot head terms.
    const compareHtml = byUrl.get(`${base}/compare.html`);
    const alternativesHtml = byUrl.get(`${base}/alternatives.html`);
    row.compare_dual_head_term = compareHtml?.ok
      ? hasCompareDualHeadTerm(compareHtml.value)
      : false;
    row.alternatives_dual_head_term = alternativesHtml?.ok
      ? hasAlternativesDualHeadTerm(alternativesHtml.value)
      : false;
    // FINDABILITY #455 — pdoom / ai-doomsday-clock must name dual middot head terms.
    const pdoomHtml = byUrl.get(`${base}/pdoom.html`);
    const aiClockHtml = byUrl.get(`${base}/ai-doomsday-clock.html`);
    row.pdoom_dual_head_term = pdoomHtml?.ok
      ? hasPdoomDualHeadTerm(pdoomHtml.value)
      : false;
    row.ai_doomsday_clock_dual_head_term = aiClockHtml?.ok
      ? hasAiDoomsdayClockDualHeadTerm(aiClockHtml.value)
      : false;
    // FINDABILITY #457 — guide / guides hubs must name dual middot head terms.
    const guideHtml = byUrl.get(`${base}/guide.html`);
    const guidesHtml = byUrl.get(`${base}/guides.html`);
    row.guide_dual_head_term = guideHtml?.ok
      ? hasGuideDualHeadTerm(guideHtml.value)
      : false;
    row.guides_dual_head_term = guidesHtml?.ok
      ? hasGuidesDualHeadTerm(guidesHtml.value)
      : false;
    // FINDABILITY #459 — desk/joke pages must name dual middot head terms.
    const betsHtml = byUrl.get(`${base}/bets.html`);
    const balanceHtml = byUrl.get(`${base}/balance.html`);
    const selfAwareHtml = byUrl.get(`${base}/self-aware.html`);
    row.bets_dual_head_term = betsHtml?.ok
      ? hasBetsDualHeadTerm(betsHtml.value)
      : false;
    row.balance_dual_head_term = balanceHtml?.ok
      ? hasBalanceDualHeadTerm(balanceHtml.value)
      : false;
    row.self_aware_dual_head_term = selfAwareHtml?.ok
      ? hasSelfAwareDualHeadTerm(selfAwareHtml.value)
      : false;
    // FINDABILITY #461 — videos explainer CTA must keep dual middot head terms.
    const videosHtml = byUrl.get(`${base}/videos.html`);
    row.videos_dual_head_term = videosHtml?.ok
      ? hasVideosDualHeadTerm(videosHtml.value)
      : false;
    // FINDABILITY #467 — bliss methodology home CTA must keep dual middot.
    const blissHtml = byUrl.get(`${base}/bliss.html`);
    row.bliss_dual_head_term = blissHtml?.ok
      ? hasBlissDualHeadTerm(blissHtml.value)
      : false;
    // FINDABILITY #469 — press Current reading CTA must keep dual middot.
    const pressHtml = byUrl.get(`${base}/press.html`);
    row.press_dual_head_term = pressHtml?.ok
      ? hasPressDualHeadTerm(pressHtml.value)
      : false;
    // FINDABILITY #471 — superseded-move bstamp CTA must keep dual middot.
    const movesProbeHtml = byUrl.get(`${base}/moves/2026-10-17T15-35-33Z.html`);
    row.moves_dual_head_term = movesProbeHtml?.ok
      ? hasMovesDualHeadTerm(movesProbeHtml.value)
      : false;
    // FINDABILITY #473 — error-page home CTAs must keep dual middot.
    const notFoundHtml = byUrl.get(`${base}/404.html`);
    const serverErrorHtml = byUrl.get(`${base}/500.html`);
    row.not_found_dual_head_term = notFoundHtml?.ok
      ? hasNotFoundDualHeadTerm(notFoundHtml.value)
      : false;
    row.server_error_dual_head_term = serverErrorHtml?.ok
      ? hasServerErrorDualHeadTerm(serverErrorHtml.value)
      : false;
    // FINDABILITY #475 — homeCrumbName / BreadcrumbList must keep dual middot
    // (kind hubs have no body CTA — crumb is the probe).
    const kindPressHtml = byUrl.get(`${base}/kind/press.html`);
    row.kind_press_crumb_dual_head_term = kindPressHtml?.ok
      ? hasKindPressCrumbDualHeadTerm(kindPressHtml.value)
      : false;
    // FINDABILITY #483/#485 — footer SECTIONS home label must keep dual middot
    // on press (often tip-preserved) AND jobs (wipe-sensitive room probe).
    const pressFootHtml = byUrl.get(`${base}/press.html`);
    const jobsFootHtml = byUrl.get(`${base}/jobs.html`);
    row.footer_sections_press_dual = pressFootHtml?.ok
      ? hasFooterSectionsDualHeadTerm(pressFootHtml.value)
      : false;
    row.footer_sections_jobs_dual = jobsFootHtml?.ok
      ? hasFooterSectionsDualHeadTerm(jobsFootHtml.value)
      : false;
    row.footer_sections_dual_head_term =
      row.footer_sections_press_dual && row.footer_sections_jobs_dual;
    // FINDABILITY #463 — model hub composite-reading CTAs must keep dual middot.
    const museSparkHtml = byUrl.get(`${base}/model/muse-spark.html`);
    const fableHtml = byUrl.get(`${base}/model/fable.html`);
    row.muse_spark_dual_head_term = museSparkHtml?.ok
      ? hasMuseSparkDualHeadTerm(museSparkHtml.value)
      : false;
    row.fable_dual_head_term = fableHtml?.ok
      ? hasFableDualHeadTerm(fableHtml.value)
      : false;
    // FINDABILITY #465 — pillar composite-reading CTAs must keep dual middot.
    const pillarComputeHtml = byUrl.get(`${base}/pillar/compute.html`);
    const pillarAttentionHtml = byUrl.get(`${base}/pillar/attention.html`);
    row.pillar_compute_dual_head_term = pillarComputeHtml?.ok
      ? hasPillarComputeDualHeadTerm(pillarComputeHtml.value)
      : false;
    row.pillar_attention_dual_head_term = pillarAttentionHtml?.ok
      ? hasPillarAttentionDualHeadTerm(pillarAttentionHtml.value)
      : false;
    // FINDABILITY #132 — agent maps must list root rival aliases after #131.
    row.agents_root_rivals = agentsMd?.ok ? hasRootRivalAliases(agentsMd.value) : false;
    row.llms_root_rivals = llms?.ok ? hasRootRivalAliases(llmsBody) : false;
    // FINDABILITY #134 — agent maps must list #133 head-term short aliases.
    row.agents_head_aliases = agentsMd?.ok ? hasHeadTermAliases(agentsMd.value) : false;
    row.llms_head_aliases = llms?.ok ? hasHeadTermAliases(llmsBody) : false;
    // FINDABILITY #139 — llms.txt lab lines must keep #138 labAboutLabel.
    row.llms_lab_about_labels = llms?.ok ? hasLabAboutLabels(llmsBody) : false;
    // FINDABILITY #141 — /lab/ + companies hubs must keep #140 labAboutLabel.
    row.lab_hub_label_lags = labHubLabelLags(byUrl, site.origin);
    // FINDABILITY #318 — /classic.html must keep panel title + own canonical.
    const classicHtml = byUrl.get(`${base}/classic.html`);
    row.classic_panel = classicHtml?.ok ? hasClassicPanel(classicHtml.value) : false;
    // FINDABILITY #144 — /race.html leaderboard lab links must keep labAboutLabel.
    const raceHtml = byUrl.get(`${base}/race.html`);
    row.race_lab_about_labels = raceHtml?.ok ? hasRaceLabAboutLabels(raceHtml.value) : false;
    // FINDABILITY #153 — Watts FAQ + agent maps for IREN / AI-cloud Trends (#152).
    const wattsHtml = byUrl.get(`${base}/watts.html`);
    row.watts_iren_faq = wattsHtml?.ok ? hasWattsIrenFaq(wattsHtml.value) : false;
    row.agents_iren_watts = agentsMd?.ok ? hasAgentsIrenWatts(agentsMd.value) : false;
    row.llms_iren_watts = llms?.ok ? hasAgentsIrenWatts(llmsBody) : false;
    // FINDABILITY #154 — Micron FAQ + agent maps for dram / memory Trends (#151).
    const micronHtml = byUrl.get(`${base}/lab/micron.html`);
    row.micron_dram_faq = micronHtml?.ok ? hasMicronDramFaq(micronHtml.value) : false;
    row.agents_micron_dram = agentsMd?.ok ? hasAgentsMicronDram(agentsMd.value) : false;
    row.llms_micron_dram = llms?.ok ? hasAgentsMicronDram(llmsBody) : false;
    // FINDABILITY #155/#160 — CoreWeave stock + debt FAQs + agent maps.
    const cwHtml = byUrl.get(`${base}/lab/coreweave.html`);
    row.coreweave_stock_faq = cwHtml?.ok ? hasCoreweaveStockFaq(cwHtml.value) : false;
    row.coreweave_debt_faq = cwHtml?.ok ? hasCoreweaveDebtFaq(cwHtml.value) : false;
    // FINDABILITY #161 — NVIDIA / NVDA FAQ + agent maps.
    const nvHtml = byUrl.get(`${base}/lab/nvidia.html`);
    row.nvidia_nvda_faq = nvHtml?.ok ? hasNvidiaNvdaFaq(nvHtml.value) : false;
    row.agents_nvidia = agentsMd?.ok ? hasAgentsNvidia(agentsMd.value) : false;
    row.llms_nvidia = llms?.ok ? hasAgentsNvidia(llmsBody) : false;
    // FINDABILITY #162 — OpenAI lawsuit / FTC FAQ + agent maps.
    const oaiHtml = byUrl.get(`${base}/lab/openai.html`);
    row.openai_lawsuit_faq = oaiHtml?.ok ? hasOpenaiLawsuitFaq(oaiHtml.value) : false;
    row.agents_openai_lawsuit = agentsMd?.ok ? hasAgentsOpenaiLawsuit(agentsMd.value) : false;
    row.llms_openai_lawsuit = llms?.ok ? hasAgentsOpenaiLawsuit(llmsBody) : false;
    // FINDABILITY #163 — Anthropic IPO / FTC FAQ + agent maps.
    const antHtml = byUrl.get(`${base}/lab/anthropic.html`);
    row.anthropic_ipo_faq = antHtml?.ok ? hasAnthropicIpoFaq(antHtml.value) : false;
    row.agents_anthropic_ipo = agentsMd?.ok ? hasAgentsAnthropicIpo(agentsMd.value) : false;
    row.llms_anthropic_ipo = llms?.ok ? hasAgentsAnthropicIpo(llmsBody) : false;
    // FINDABILITY #362 — Anthropic AI safety bill FAQ + agent maps (same lab).
    row.anthropic_ai_safety_bill_faq = antHtml?.ok ? hasAnthropicAiSafetyBillFaq(antHtml.value) : false;
    row.agents_anthropic_ai_safety_bill = agentsMd?.ok ? hasAgentsAnthropicAiSafetyBill(agentsMd.value) : false;
    row.llms_anthropic_ai_safety_bill = llms?.ok ? hasAgentsAnthropicAiSafetyBill(llmsBody) : false;
    // FINDABILITY #368 — Anthropic Canadian data-centre FAQ + agent maps (same lab).
    row.anthropic_canada_dc_faq = antHtml?.ok ? hasAnthropicCanadaDcFaq(antHtml.value) : false;
    row.agents_anthropic_canada_dc = agentsMd?.ok ? hasAgentsAnthropicCanadaDc(agentsMd.value) : false;
    row.llms_anthropic_canada_dc = llms?.ok ? hasAgentsAnthropicCanadaDc(llmsBody) : false;
    // FINDABILITY #392 — Anthropic METR evaluator FAQ + agent maps (same lab).
    row.anthropic_metr_faq = antHtml?.ok ? hasAnthropicMetrFaq(antHtml.value) : false;
    row.agents_anthropic_metr = agentsMd?.ok ? hasAgentsAnthropicMetr(agentsMd.value) : false;
    row.llms_anthropic_metr = llms?.ok ? hasAgentsAnthropicMetr(llmsBody) : false;
    // FINDABILITY #397 — Anthropic ECDSA curve-seed FAQ + agent maps (same lab).
    row.anthropic_ecdsa_faq = antHtml?.ok ? hasAnthropicEcdsaFaq(antHtml.value) : false;
    row.agents_anthropic_ecdsa = agentsMd?.ok ? hasAgentsAnthropicEcdsa(agentsMd.value) : false;
    row.llms_anthropic_ecdsa = llms?.ok ? hasAgentsAnthropicEcdsa(llmsBody) : false;
    // FINDABILITY #402 — Claude Opus 5.5 FAQ + agent maps (same lab).
    row.claude_opus_55_faq = antHtml?.ok ? hasClaudeOpus55Faq(antHtml.value) : false;
    row.agents_claude_opus_55 = agentsMd?.ok ? hasAgentsClaudeOpus55(agentsMd.value) : false;
    row.llms_claude_opus_55 = llms?.ok ? hasAgentsClaudeOpus55(llmsBody) : false;
    // FINDABILITY #408 — Blackstone Anthropic financing FAQ + agent maps (same lab).
    row.blackstone_anthropic_faq = antHtml?.ok ? hasBlackstoneAnthropicFaq(antHtml.value) : false;
    row.agents_blackstone_anthropic = agentsMd?.ok ? hasAgentsBlackstoneAnthropic(agentsMd.value) : false;
    row.llms_blackstone_anthropic = llms?.ok ? hasAgentsBlackstoneAnthropic(llmsBody) : false;
    // FINDABILITY #412 — Replit Anthropic model-switch FAQ + agent maps (same lab).
    row.replit_anthropic_faq = antHtml?.ok ? hasReplitAnthropicFaq(antHtml.value) : false;
    row.agents_replit_anthropic = agentsMd?.ok ? hasAgentsReplitAnthropic(agentsMd.value) : false;
    row.llms_replit_anthropic = llms?.ok ? hasAgentsReplitAnthropic(llmsBody) : false;
    // FINDABILITY #420 — Claude Mythos 5 FAQ + agent maps (same lab).
    row.claude_mythos_5_faq = antHtml?.ok ? hasClaudeMythos5Faq(antHtml.value) : false;
    row.agents_claude_mythos_5 = agentsMd?.ok ? hasAgentsClaudeMythos5(agentsMd.value) : false;
    row.llms_claude_mythos_5 = llms?.ok ? hasAgentsClaudeMythos5(llmsBody) : false;
    // FINDABILITY #164 — ASML Trends FAQ + agent maps.
    const asmlHtml = byUrl.get(`${base}/lab/asml.html`);
    row.asml_trends_faq = asmlHtml?.ok ? hasAsmlTrendsFaq(asmlHtml.value) : false;
    row.agents_asml = agentsMd?.ok ? hasAgentsAsml(agentsMd.value) : false;
    row.llms_asml = llms?.ok ? hasAgentsAsml(llmsBody) : false;
    // FINDABILITY #165 — TSMC Trends FAQ + agent maps.
    const tsmcHtml = byUrl.get(`${base}/lab/tsmc.html`);
    row.tsmc_trends_faq = tsmcHtml?.ok ? hasTsmcTrendsFaq(tsmcHtml.value) : false;
    row.agents_tsmc = agentsMd?.ok ? hasAgentsTsmc(agentsMd.value) : false;
    row.llms_tsmc = llms?.ok ? hasAgentsTsmc(llmsBody) : false;
    // FINDABILITY #167 — Amazon Bee FAQ + agent maps.
    const amazonHtml = byUrl.get(`${base}/lab/amazon.html`);
    row.amazon_bee_faq = amazonHtml?.ok ? hasAmazonBeeFaq(amazonHtml.value) : false;
    row.agents_amazon_bee = agentsMd?.ok ? hasAgentsAmazonBee(agentsMd.value) : false;
    row.llms_amazon_bee = llms?.ok ? hasAgentsAmazonBee(llmsBody) : false;
    // FINDABILITY #169 — Meta Muse FAQ + agent maps.
    const metaHtml = byUrl.get(`${base}/lab/meta.html`);
    row.meta_muse_faq = metaHtml?.ok ? hasMetaMuseFaq(metaHtml.value) : false;
    row.agents_meta_muse = agentsMd?.ok ? hasAgentsMetaMuse(agentsMd.value) : false;
    row.llms_meta_muse = llms?.ok ? hasAgentsMetaMuse(llmsBody) : false;
    // FINDABILITY #193 — Meta–Apple Mac AI FAQ + agent maps (same lab as Muse #169).
    row.meta_apple_mac_faq = metaHtml?.ok ? hasMetaAppleMacFaq(metaHtml.value) : false;
    row.agents_meta_apple_mac = agentsMd?.ok ? hasAgentsMetaAppleMac(agentsMd.value) : false;
    row.llms_meta_apple_mac = llms?.ok ? hasAgentsMetaAppleMac(llmsBody) : false;
    // FINDABILITY #170 — Apple Intelligence FAQ + agent maps.
    const appleHtml = byUrl.get(`${base}/lab/apple.html`);
    row.apple_intelligence_faq = appleHtml?.ok ? hasAppleIntelligenceFaq(appleHtml.value) : false;
    row.agents_apple_intelligence = agentsMd?.ok ? hasAgentsAppleIntelligence(agentsMd.value) : false;
    row.llms_apple_intelligence = llms?.ok ? hasAgentsAppleIntelligence(llmsBody) : false;
    // FINDABILITY #171 — Microsoft Copilot FAQ + agent maps.
    const msHtml = byUrl.get(`${base}/lab/microsoft.html`);
    row.microsoft_copilot_faq = msHtml?.ok ? hasMicrosoftCopilotFaq(msHtml.value) : false;
    row.agents_microsoft_copilot = agentsMd?.ok ? hasAgentsMicrosoftCopilot(agentsMd.value) : false;
    row.llms_microsoft_copilot = llms?.ok ? hasAgentsMicrosoftCopilot(llmsBody) : false;
    // FINDABILITY #220 — Microsoft MAI-Base FAQ + agent maps (same lab as #171).
    row.microsoft_mai_faq = msHtml?.ok ? hasMicrosoftMaiFaq(msHtml.value) : false;
    row.agents_microsoft_mai = agentsMd?.ok ? hasAgentsMicrosoftMai(agentsMd.value) : false;
    row.llms_microsoft_mai = llms?.ok ? hasAgentsMicrosoftMai(llmsBody) : false;
    // FINDABILITY #414 — Surface Laptop Ultra FAQ + agent maps (same lab as #171/#220).
    row.surface_ultra_faq = msHtml?.ok ? hasSurfaceUltraFaq(msHtml.value) : false;
    row.agents_surface_ultra = agentsMd?.ok ? hasAgentsSurfaceUltra(agentsMd.value) : false;
    row.llms_surface_ultra = llms?.ok ? hasAgentsSurfaceUltra(llmsBody) : false;
    // FINDABILITY #173 — xAI / Grok FAQ + agent maps.
    const xaiHtml = byUrl.get(`${base}/lab/xai.html`);
    row.xai_grok_faq = xaiHtml?.ok ? hasXaiGrokFaq(xaiHtml.value) : false;
    row.agents_xai_grok = agentsMd?.ok ? hasAgentsXaiGrok(agentsMd.value) : false;
    row.llms_xai_grok = llms?.ok ? hasAgentsXaiGrok(llmsBody) : false;
    // FINDABILITY #174/#187 — Gemini / Gemma / Argon FAQ + agent maps.
    const gdmHtml = byUrl.get(`${base}/lab/google-deepmind.html`);
    row.gemini_gemma_faq = gdmHtml?.ok ? hasGeminiGemmaFaq(gdmHtml.value) : false;
    row.agents_gemini_gemma = agentsMd?.ok ? hasAgentsGeminiGemma(agentsMd.value) : false;
    row.llms_gemini_gemma = llms?.ok ? hasAgentsGeminiGemma(llmsBody) : false;
    // FINDABILITY #175 — Samsung / HBM FAQ + agent maps.
    const samsungHtml = byUrl.get(`${base}/lab/samsung.html`);
    row.samsung_hbm_faq = samsungHtml?.ok ? hasSamsungHbmFaq(samsungHtml.value) : false;
    row.agents_samsung_hbm = agentsMd?.ok ? hasAgentsSamsungHbm(agentsMd.value) : false;
    row.llms_samsung_hbm = llms?.ok ? hasAgentsSamsungHbm(llmsBody) : false;
    // FINDABILITY #195 — Samsung AI glasses FAQ + agent maps (same lab as HBM #175).
    row.samsung_glasses_faq = samsungHtml?.ok ? hasSamsungGlassesFaq(samsungHtml.value) : false;
    row.agents_samsung_glasses = agentsMd?.ok ? hasAgentsSamsungGlasses(agentsMd.value) : false;
    row.llms_samsung_glasses = llms?.ok ? hasAgentsSamsungGlasses(llmsBody) : false;
    row.agents_coreweave = agentsMd?.ok ? hasAgentsCoreweave(agentsMd.value) : false;
    row.llms_coreweave = llms?.ok ? hasAgentsCoreweave(llmsBody) : false;
    // FINDABILITY #157 — Neoclouds FAQ + agent maps for neocloud Trends.
    const neoHtml = byUrl.get(`${base}/tags/neoclouds.html`);
    row.neocloud_faq = neoHtml?.ok ? hasNeocloudFaq(neoHtml.value) : false;
    row.agents_neocloud = agentsMd?.ok ? hasAgentsNeocloud(agentsMd.value) : false;
    row.llms_neocloud = llms?.ok ? hasAgentsNeocloud(llmsBody) : false;
    // FINDABILITY #176 — Chatbots FAQ + agent maps for Character.ai bankruptcy.
    const chatbotsHtml = byUrl.get(`${base}/tags/chatbots.html`);
    row.character_ai_faq = chatbotsHtml?.ok ? hasCharacterAiFaq(chatbotsHtml.value) : false;
    row.agents_character_ai = agentsMd?.ok ? hasAgentsCharacterAi(agentsMd.value) : false;
    row.llms_character_ai = llms?.ok ? hasAgentsCharacterAi(llmsBody) : false;
    // FINDABILITY #410 — Agents FAQ + agent maps for CERT-In.
    const agentsTagHtml = byUrl.get(`${base}/tags/agents.html`);
    row.cert_in_faq = agentsTagHtml?.ok ? hasCertInFaq(agentsTagHtml.value) : false;
    row.agents_cert_in = agentsMd?.ok ? hasAgentsCertIn(agentsMd.value) : false;
    row.llms_cert_in = llms?.ok ? hasAgentsCertIn(llmsBody) : false;
    // FINDABILITY #177 — Qwen FAQ + agent maps.
    const qwenHtml = byUrl.get(`${base}/lab/qwen.html`);
    row.qwen_faq = qwenHtml?.ok ? hasQwenFaq(qwenHtml.value) : false;
    row.agents_qwen = agentsMd?.ok ? hasAgentsQwen(agentsMd.value) : false;
    row.llms_qwen = llms?.ok ? hasAgentsQwen(llmsBody) : false;
    // FINDABILITY #178 — Datacenters FAQ + agent maps for Oracle Trends.
    const dcHtml = byUrl.get(`${base}/tags/datacenters.html`);
    row.oracle_datacenters_faq = dcHtml?.ok ? hasOracleDatacentersFaq(dcHtml.value) : false;
    row.agents_oracle_datacenters = agentsMd?.ok ? hasAgentsOracleDatacenters(agentsMd.value) : false;
    row.llms_oracle_datacenters = llms?.ok ? hasAgentsOracleDatacenters(llmsBody) : false;
    // FINDABILITY #179 — DeepSeek FAQ + agent maps.
    const deepseekHtml = byUrl.get(`${base}/lab/deepseek.html`);
    row.deepseek_faq = deepseekHtml?.ok ? hasDeepseekFaq(deepseekHtml.value) : false;
    row.agents_deepseek = agentsMd?.ok ? hasAgentsDeepseek(agentsMd.value) : false;
    row.llms_deepseek = llms?.ok ? hasAgentsDeepseek(llmsBody) : false;
    // FINDABILITY #418 — DeepSeek V4.1 Flash FAQ + agent maps (same lab as #179).
    row.deepseek_flash_faq = deepseekHtml?.ok ? hasDeepseekFlashFaq(deepseekHtml.value) : false;
    row.agents_deepseek_flash = agentsMd?.ok ? hasAgentsDeepseekFlash(agentsMd.value) : false;
    row.llms_deepseek_flash = llms?.ok ? hasAgentsDeepseekFlash(llmsBody) : false;
    // FINDABILITY #180 — Mistral FAQ + agent maps.
    const mistralHtml = byUrl.get(`${base}/lab/mistral.html`);
    row.mistral_faq = mistralHtml?.ok ? hasMistralFaq(mistralHtml.value) : false;
    row.agents_mistral = agentsMd?.ok ? hasAgentsMistral(agentsMd.value) : false;
    row.llms_mistral = llms?.ok ? hasAgentsMistral(llmsBody) : false;
    // FINDABILITY #181 — OpenAI outage FAQ + agent maps (same lab as lawsuit #162).
    row.openai_outage_faq = oaiHtml?.ok ? hasOpenaiOutageFaq(oaiHtml.value) : false;
    row.agents_openai_outage = agentsMd?.ok ? hasAgentsOpenaiOutage(agentsMd.value) : false;
    row.llms_openai_outage = llms?.ok ? hasAgentsOpenaiOutage(llmsBody) : false;
    // FINDABILITY #191 — ChatGPT Chrome / computer use FAQ + agent maps (same lab).
    row.openai_chrome_faq = oaiHtml?.ok ? hasOpenaiChromeFaq(oaiHtml.value) : false;
    row.agents_openai_chrome = agentsMd?.ok ? hasAgentsOpenaiChrome(agentsMd.value) : false;
    row.llms_openai_chrome = llms?.ok ? hasAgentsOpenaiChrome(llmsBody) : false;
    // FINDABILITY #182 — Hugging Face hack FAQ + agent maps.
    const hfHtml = byUrl.get(`${base}/tags/huggingface.html`);
    row.huggingface_faq = hfHtml?.ok ? hasHuggingfaceFaq(hfHtml.value) : false;
    row.agents_huggingface = agentsMd?.ok ? hasAgentsHuggingface(agentsMd.value) : false;
    row.llms_huggingface = llms?.ok ? hasAgentsHuggingface(llmsBody) : false;
    // FINDABILITY #183 — Palantir FAQ + agent maps.
    const palantirHtml = byUrl.get(`${base}/lab/palantir.html`);
    row.palantir_faq = palantirHtml?.ok ? hasPalantirFaq(palantirHtml.value) : false;
    row.agents_palantir = agentsMd?.ok ? hasAgentsPalantir(agentsMd.value) : false;
    row.llms_palantir = llms?.ok ? hasAgentsPalantir(llmsBody) : false;
    // FINDABILITY #406 — Ondas-Palantir FAQ + agent maps (same Palantir lab HTML).
    row.ondas_palantir_faq = palantirHtml?.ok ? hasOndasPalantirFaq(palantirHtml.value) : false;
    row.agents_ondas_palantir = agentsMd?.ok ? hasAgentsOndasPalantir(agentsMd.value) : false;
    row.llms_ondas_palantir = llms?.ok ? hasAgentsOndasPalantir(llmsBody) : false;
    // FINDABILITY #184 — AMD FAQ + agent maps.
    const amdHtml = byUrl.get(`${base}/lab/amd.html`);
    row.amd_faq = amdHtml?.ok ? hasAmdFaq(amdHtml.value) : false;
    row.agents_amd = agentsMd?.ok ? hasAgentsAmd(agentsMd.value) : false;
    row.llms_amd = llms?.ok ? hasAgentsAmd(llmsBody) : false;
    // FINDABILITY #185 — Tesla FAQ + agent maps.
    const teslaHtml = byUrl.get(`${base}/lab/tesla.html`);
    row.tesla_faq = teslaHtml?.ok ? hasTeslaFaq(teslaHtml.value) : false;
    row.agents_tesla = agentsMd?.ok ? hasAgentsTesla(agentsMd.value) : false;
    row.llms_tesla = llms?.ok ? hasAgentsTesla(llmsBody) : false;
    // FINDABILITY #372 — Waymo Canada / Toronto FAQ + agent maps.
    const waymoHtml = byUrl.get(`${base}/lab/waymo.html`);
    row.waymo_canada_faq = waymoHtml?.ok ? hasWaymoCanadaFaq(waymoHtml.value) : false;
    row.agents_waymo_canada = agentsMd?.ok ? hasAgentsWaymoCanada(agentsMd.value) : false;
    row.llms_waymo_canada = llms?.ok ? hasAgentsWaymoCanada(llmsBody) : false;
    // FINDABILITY #374 — SoftBank / Allied Universal FAQ + agent maps.
    const softbankHtml = byUrl.get(`${base}/lab/softbank.html`);
    row.softbank_allied_faq = softbankHtml?.ok ? hasSoftbankAlliedFaq(softbankHtml.value) : false;
    row.agents_softbank_allied = agentsMd?.ok ? hasAgentsSoftbankAllied(agentsMd.value) : false;
    row.llms_softbank_allied = llms?.ok ? hasAgentsSoftbankAllied(llmsBody) : false;
    // FINDABILITY #376 — SpaceX / Starshield FAQ + agent maps.
    const spacexHtml = byUrl.get(`${base}/lab/spacex.html`);
    row.spacex_starshield_faq = spacexHtml?.ok ? hasSpacexStarshieldFaq(spacexHtml.value) : false;
    row.agents_spacex_starshield = agentsMd?.ok ? hasAgentsSpacexStarshield(agentsMd.value) : false;
    row.llms_spacex_starshield = llms?.ok ? hasAgentsSpacexStarshield(llmsBody) : false;
    // FINDABILITY #378 — Tesla Flying Roadster FAQ + agent maps (same Tesla lab HTML).
    row.tesla_flying_roadster_faq = teslaHtml?.ok ? hasTeslaFlyingRoadsterFaq(teslaHtml.value) : false;
    row.agents_tesla_flying_roadster = agentsMd?.ok ? hasAgentsTeslaFlyingRoadster(agentsMd.value) : false;
    row.llms_tesla_flying_roadster = llms?.ok ? hasAgentsTeslaFlyingRoadster(llmsBody) : false;
    // FINDABILITY #158 — Search Trends watchlist routing FAQ.
    const trendsHtml = byUrl.get(`${base}/search-trends.html`);
    row.trends_routes_faq = trendsHtml?.ok ? hasTrendsRoutesFaq(trendsHtml.value) : false;
    // FINDABILITY #123 — lab title must keep product head-term aliases.
    row.lab_head_alias_lags = labHeadAliasLags(byUrl, site.origin);
    // FINDABILITY #128 — compare/alternatives must keep #126/#127 FAQ needles.
    row.conquest_faq_lags = conquestFaqLags(byUrl, site.origin);
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
    if (ours && ours.agent_use_links != null) {
      lines.push(`- Agent use links (#489): home head + robots **${ours.agent_use_links ? 'ok' : 'NO'}**`);
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
    if (ours && ours.trends_generated_at !== undefined) {
      if (ours.trends_generated_at) {
        const gen = Date.parse(ours.trends_generated_at);
        const nowMs = report.measured_at ? Date.parse(report.measured_at) : Date.now();
        const ageH = Number.isFinite(gen) && Number.isFinite(nowMs)
          ? ((nowMs - gen) / 3_600_000).toFixed(1)
          : '?';
        const stale = Number.isFinite(Number(ageH)) && Number(ageH) >= TRENDS_STALE_HOURS;
        lines.push(
          `- Search Trends tip (#186): generated_at **${ours.trends_generated_at}** (${ageH}h old${stale ? '; STALE' : ''})`,
        );
      } else {
        lines.push('- Search Trends tip (#186): api/search-trends.json **missing/unparseable**');
      }
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
    if (ours && Array.isArray(ours.news_lab_alias_lags)) {
      if (ours.news_lab_alias_lags.length === 0) {
        lines.push('- News labAboutLabel aliases (#146–#148/#159/#161/#172/#173/#176/#288): **ok** (ChatGPT / Claude / Gemini / MU / neocloud / CRWV / Iris Energy / NVDA / Muse / Apple Intelligence / Copilot / Grok / HBM / Chatbots / Qwen)');
      } else {
        const sample = ours.news_lab_alias_lags
          .slice(0, 3)
          .map((r) => `${r.lab}→${r.alias}`)
          .join(', ');
        lines.push(
          `- News labAboutLabel aliases (#146–#148/#159/#161/#172/#173): **LAG** on ${ours.news_lab_alias_lags.length} (e.g. ${sample})`,
        );
      }
    }
    if (ours && (ours.agents_vs_aliases != null || ours.llms_vs_aliases != null)) {
      const ag = ours.agents_vs_aliases == null ? '—' : (ours.agents_vs_aliases ? 'yes' : 'NO');
      const lm = ours.llms_vs_aliases == null ? '—' : (ours.llms_vs_aliases ? 'yes' : 'NO');
      lines.push(`- Agent-map vs short aliases (#116/#119): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && (ours.agents_trends_alias != null || ours.llms_trends_alias != null)) {
      const ag = ours.agents_trends_alias == null ? '—' : (ours.agents_trends_alias ? 'yes' : 'NO');
      const lm = ours.llms_trends_alias == null ? '—' : (ours.llms_trends_alias ? 'yes' : 'NO');
      lines.push(`- Agent-map /trends short alias (#124/#125): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && (ours.agents_pdoom_alias != null || ours.llms_pdoom_alias != null)) {
      const ag = ours.agents_pdoom_alias == null ? '—' : (ours.agents_pdoom_alias ? 'yes' : 'NO');
      const lm = ours.llms_pdoom_alias == null ? '—' : (ours.llms_pdoom_alias ? 'yes' : 'NO');
      lines.push(`- Agent-map /pdoom short alias (#129/#130): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && (ours.agents_activity_index_alias != null || ours.llms_activity_index_alias != null)) {
      const ag = ours.agents_activity_index_alias == null ? '—' : (ours.agents_activity_index_alias ? 'yes' : 'NO');
      const lm = ours.llms_activity_index_alias == null ? '—' : (ours.llms_activity_index_alias ? 'yes' : 'NO');
      lines.push(`- Agent-map /ai-activity-index short alias (#252): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && (ours.agents_activity_level_alias != null || ours.llms_activity_level_alias != null)) {
      const ag = ours.agents_activity_level_alias == null ? '—' : (ours.agents_activity_level_alias ? 'yes' : 'NO');
      const lm = ours.llms_activity_level_alias == null ? '—' : (ours.llms_activity_level_alias ? 'yes' : 'NO');
      lines.push(`- Agent-map /ai-activity-level short alias (#262): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && (ours.agents_activity_level_head_term != null || ours.llms_activity_level_head_term != null)) {
      const ag = ours.agents_activity_level_head_term == null
        ? '—' : (ours.agents_activity_level_head_term ? 'yes' : 'NO');
      const lm = ours.llms_activity_level_head_term == null
        ? '—' : (ours.llms_activity_level_head_term ? 'yes' : 'NO');
      lines.push(`- Agent-map “AI activity level today” head term (#433): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && (ours.agents_classic_panel != null || ours.llms_classic_panel != null)) {
      const ag = ours.agents_classic_panel == null ? '—' : (ours.agents_classic_panel ? 'yes' : 'NO');
      const lm = ours.llms_classic_panel == null ? '—' : (ours.llms_classic_panel ? 'yes' : 'NO');
      lines.push(`- Agent-map /classic.html instrument panel (#324): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.skill_classic_panel != null) {
      lines.push(`- skill.md /classic.html instrument panel (#326): **${ours.skill_classic_panel ? 'ok' : 'NO'}**`);
    }
    if (ours && ours.skill_activity_level_head_term != null) {
      lines.push(
        `- skill.md “AI activity level today” head term (#435): **${ours.skill_activity_level_head_term ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && ours.agents_html_dual_head_term != null) {
      lines.push(
        `- agents.html dual index/level head term (#437): **${ours.agents_html_dual_head_term ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (
      ours.agents_txt_dual_head_term != null
      || ours.ai_txt_dual_head_term != null
    )) {
      const at = ours.agents_txt_dual_head_term == null ? '—' : (ours.agents_txt_dual_head_term ? 'yes' : 'NO');
      const ai = ours.ai_txt_dual_head_term == null ? '—' : (ours.ai_txt_dual_head_term ? 'yes' : 'NO');
      lines.push(`- Discovery dual index/level head term (#439): agents.txt **${at}** · ai.txt **${ai}**`);
    }
    if (ours && ours.agents_json_dual_head_term != null) {
      lines.push(
        `- Discovery JSON dual index/level head term (#441): agents.json **${ours.agents_json_dual_head_term ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.openapi_dual_head_term != null || ours.api_index_dual_head_term != null)) {
      const oa = ours.openapi_dual_head_term == null ? '—' : (ours.openapi_dual_head_term ? 'ok' : 'NO');
      const ai = ours.api_index_dual_head_term == null ? '—' : (ours.api_index_dual_head_term ? 'ok' : 'NO');
      lines.push(
        `- OpenAPI / api/index dual index/level head term (#446): openapi **${oa}** · api/index **${ai}**`,
      );
    }
    if (ours && (
      ours.agents_txt_classic_panel != null
      || ours.ai_txt_classic_panel != null
      || ours.catalog_classic_panel != null
    )) {
      const at = ours.agents_txt_classic_panel == null ? '—' : (ours.agents_txt_classic_panel ? 'yes' : 'NO');
      const ai = ours.ai_txt_classic_panel == null ? '—' : (ours.ai_txt_classic_panel ? 'yes' : 'NO');
      const cat = ours.catalog_classic_panel == null ? '—' : (ours.catalog_classic_panel ? 'yes' : 'NO');
      lines.push(`- Discovery /classic.html instrument panel (#328): agents.txt **${at}** · ai.txt **${ai}** · api-catalog **${cat}**`);
    }
    if (
      ours
      && (
        ours.agents_json_classic_panel != null
        || ours.openapi_classic_panel != null
        || ours.api_index_classic_panel != null
      )
    ) {
      const aj = ours.agents_json_classic_panel == null ? '—' : (ours.agents_json_classic_panel ? 'yes' : 'NO');
      const oa = ours.openapi_classic_panel == null ? '—' : (ours.openapi_classic_panel ? 'yes' : 'NO');
      const ix = ours.api_index_classic_panel == null ? '—' : (ours.api_index_classic_panel ? 'yes' : 'NO');
      lines.push(`- Discovery JSON /classic.html instrument panel (#330): agents.json **${aj}** · openapi **${oa}** · api/index **${ix}**`);
    }
    if (ours && ours.freetools_classic_panel != null) {
      lines.push(`- free-tools /classic.html instrument panel (#332): **${ours.freetools_classic_panel ? 'ok' : 'NO'}**`);
    }
    if (ours && ours.freetools_dual_head_term != null) {
      lines.push(
        `- free-tools dual index/level head term (#443): **${ours.freetools_dual_head_term ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && ours.verify_dual_head_term != null) {
      lines.push(
        `- verify dual index/level head term (#451): **${ours.verify_dual_head_term ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (
      ours.compare_dual_head_term != null
      || ours.alternatives_dual_head_term != null
    )) {
      const cmp = ours.compare_dual_head_term == null ? '—' : (ours.compare_dual_head_term ? 'yes' : 'NO');
      const alt = ours.alternatives_dual_head_term == null ? '—' : (ours.alternatives_dual_head_term ? 'yes' : 'NO');
      lines.push(
        `- compare / alternatives dual index/level head term (#453): compare **${cmp}** · alternatives **${alt}**`,
      );
    }
    if (ours && (
      ours.pdoom_dual_head_term != null
      || ours.ai_doomsday_clock_dual_head_term != null
    )) {
      const pd = ours.pdoom_dual_head_term == null ? '—' : (ours.pdoom_dual_head_term ? 'yes' : 'NO');
      const clk = ours.ai_doomsday_clock_dual_head_term == null ? '—' : (ours.ai_doomsday_clock_dual_head_term ? 'yes' : 'NO');
      lines.push(
        `- pdoom / ai-doomsday-clock dual index/level head term (#455): pdoom **${pd}** · ai-doomsday-clock **${clk}**`,
      );
    }
    if (ours && (
      ours.guide_dual_head_term != null
      || ours.guides_dual_head_term != null
    )) {
      const gd = ours.guide_dual_head_term == null ? '—' : (ours.guide_dual_head_term ? 'yes' : 'NO');
      const gds = ours.guides_dual_head_term == null ? '—' : (ours.guides_dual_head_term ? 'yes' : 'NO');
      lines.push(
        `- guide / guides dual index/level head term (#457): guide **${gd}** · guides **${gds}**`,
      );
    }
    if (ours && (
      ours.bets_dual_head_term != null
      || ours.balance_dual_head_term != null
      || ours.self_aware_dual_head_term != null
    )) {
      const bt = ours.bets_dual_head_term == null ? '—' : (ours.bets_dual_head_term ? 'yes' : 'NO');
      const bal = ours.balance_dual_head_term == null ? '—' : (ours.balance_dual_head_term ? 'yes' : 'NO');
      const sa = ours.self_aware_dual_head_term == null ? '—' : (ours.self_aware_dual_head_term ? 'yes' : 'NO');
      lines.push(
        `- desk dual index/level head term (#459): bets **${bt}** · balance **${bal}** · self-aware **${sa}**`,
      );
    }
    if (ours && ours.videos_dual_head_term != null) {
      const vd = ours.videos_dual_head_term ? 'ok' : 'NO';
      lines.push(`- videos dual index/level head term (#461): **${vd}**`);
    }
    if (ours && ours.bliss_dual_head_term != null) {
      const bd = ours.bliss_dual_head_term ? 'ok' : 'NO';
      lines.push(`- bliss dual index/level head term (#467): **${bd}**`);
    }
    if (ours && ours.press_dual_head_term != null) {
      const pd = ours.press_dual_head_term ? 'ok' : 'NO';
      lines.push(`- press dual index/level head term (#469): **${pd}**`);
    }
    if (ours && ours.moves_dual_head_term != null) {
      const md = ours.moves_dual_head_term ? 'ok' : 'NO';
      lines.push(`- moves dual index/level head term (#471): **${md}**`);
    }
    if (ours && (
      ours.not_found_dual_head_term != null
      || ours.server_error_dual_head_term != null
    )) {
      const nf = ours.not_found_dual_head_term == null ? '—' : (ours.not_found_dual_head_term ? 'yes' : 'NO');
      const se = ours.server_error_dual_head_term == null ? '—' : (ours.server_error_dual_head_term ? 'yes' : 'NO');
      lines.push(`- error dual index/level head term (#473): 404 **${nf}** · 500 **${se}**`);
    }
    if (ours && ours.kind_press_crumb_dual_head_term != null) {
      const kd = ours.kind_press_crumb_dual_head_term ? 'ok' : 'NO';
      lines.push(`- crumb dual index/level head term (#475): **${kd}**`);
    }
    if (ours && ours.footer_sections_dual_head_term != null) {
      const sd = ours.footer_sections_dual_head_term ? 'ok' : 'NO';
      const sp = ours.footer_sections_press_dual == null ? '—' : (ours.footer_sections_press_dual ? 'yes' : 'NO');
      const sj = ours.footer_sections_jobs_dual == null ? '—' : (ours.footer_sections_jobs_dual ? 'yes' : 'NO');
      lines.push(
        `- sections dual index/level head term (#483/#485): **${sd}** (press **${sp}** · jobs **${sj}**)`,
      );
    }
    if (ours && (
      ours.muse_spark_dual_head_term != null
      || ours.fable_dual_head_term != null
    )) {
      const ms = ours.muse_spark_dual_head_term == null ? '—' : (ours.muse_spark_dual_head_term ? 'yes' : 'NO');
      const fb = ours.fable_dual_head_term == null ? '—' : (ours.fable_dual_head_term ? 'yes' : 'NO');
      lines.push(
        `- model dual index/level head term (#463): muse-spark **${ms}** · fable **${fb}**`,
      );
    }
    if (ours && (
      ours.pillar_compute_dual_head_term != null
      || ours.pillar_attention_dual_head_term != null
    )) {
      const pc = ours.pillar_compute_dual_head_term == null ? '—' : (ours.pillar_compute_dual_head_term ? 'yes' : 'NO');
      const pa = ours.pillar_attention_dual_head_term == null ? '—' : (ours.pillar_attention_dual_head_term ? 'yes' : 'NO');
      lines.push(
        `- pillar dual index/level head term (#465): compute **${pc}** · attention **${pa}**`,
      );
    }
    if (ours && (ours.agents_root_rivals != null || ours.llms_root_rivals != null)) {
      const ag = ours.agents_root_rivals == null ? '—' : (ours.agents_root_rivals ? 'yes' : 'NO');
      const lm = ours.llms_root_rivals == null ? '—' : (ours.llms_root_rivals ? 'yes' : 'NO');
      lines.push(`- Agent-map root rival aliases (#131/#132): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && (ours.agents_head_aliases != null || ours.llms_head_aliases != null)) {
      const ag = ours.agents_head_aliases == null ? '—' : (ours.agents_head_aliases ? 'yes' : 'NO');
      const lm = ours.llms_head_aliases == null ? '—' : (ours.llms_head_aliases ? 'yes' : 'NO');
      lines.push(`- Agent-map head-term short aliases (#133/#134): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.llms_lab_about_labels != null) {
      const lm = ours.llms_lab_about_labels ? 'yes' : 'NO';
      lines.push(`- Agent-map labAboutLabel (#138/#139): llms.txt **${lm}**`);
    }
    if (ours && Array.isArray(ours.lab_hub_label_lags)) {
      if (ours.lab_hub_label_lags.length === 0) {
        lines.push('- Lab/companies hub labAboutLabel (#140/#141): **ok**');
      } else {
        const sample = ours.lab_hub_label_lags.slice(0, 3).map((r) => r.path).join(', ');
        lines.push(
          `- Lab/companies hub labAboutLabel (#140/#141): **LAG** on ${ours.lab_hub_label_lags.length} (e.g. ${sample})`,
        );
      }
    }
    if (ours && ours.home_lab_about_labels != null) {
      lines.push(
        `- Home knowsAbout labAboutLabel (#142/#143): **${ours.home_lab_about_labels ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && ours.home_doombench_conquest != null) {
      lines.push(
        `- Home DoomBench conquest link (#423): **${ours.home_doombench_conquest ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && ours.home_skynet_conquest != null) {
      lines.push(
        `- Home Skynet Countdown conquest link (#425): **${ours.home_skynet_conquest ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && ours.home_pizzint_conquest != null) {
      lines.push(
        `- Home PizzINT conquest link (#429): **${ours.home_pizzint_conquest ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && ours.home_takeoff_conquest != null) {
      lines.push(
        `- Home Takeoff Tracker conquest link (#429): **${ours.home_takeoff_conquest ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && ours.home_activity_index_faq != null) {
      lines.push(
        `- Home AI activity index FAQ (#254): **${ours.home_activity_index_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && ours.home_activity_index_today_faq != null) {
      lines.push(
        `- Home AI activity index today FAQ (#284): **${ours.home_activity_index_today_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && ours.home_activity_level_title != null) {
      lines.push(
        `- Home AI activity level today title (#296): **${ours.home_activity_level_title ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && ours.home_activity_h1_head_terms != null) {
      lines.push(
        `- Home AI activity H1 head terms (#308): **${ours.home_activity_h1_head_terms ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && ours.home_activity_title_trim != null) {
      lines.push(
        `- Home AI activity title trim (#312/#314/#316): **${ours.home_activity_title_trim ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && ours.classic_panel != null) {
      lines.push(
        `- Classic instrument panel (#318): **${ours.classic_panel ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && ours.classic_sitemap != null) {
      lines.push(
        `- Classic sitemap loc (#322): **${ours.classic_sitemap ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && ours.home_activity_level_faq_alias != null) {
      lines.push(
        `- Home AI activity level FAQ alias (#262/#264): **${ours.home_activity_level_faq_alias ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && ours.race_lab_about_labels != null) {
      lines.push(
        `- Race board labAboutLabel (#144): **${ours.race_lab_about_labels ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && ours.watts_iren_faq != null) {
      lines.push(
        `- Watts IREN Trends FAQ (#152/#153): **${ours.watts_iren_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_iren_watts != null || ours.llms_iren_watts != null)) {
      const ag = ours.agents_iren_watts == null ? '—' : (ours.agents_iren_watts ? 'yes' : 'NO');
      const lm = ours.llms_iren_watts == null ? '—' : (ours.llms_iren_watts ? 'yes' : 'NO');
      lines.push(`- Agent-map IREN → Watts (#153): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.micron_dram_faq != null) {
      lines.push(
        `- Micron DRAM Trends FAQ (#151/#154): **${ours.micron_dram_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_micron_dram != null || ours.llms_micron_dram != null)) {
      const ag = ours.agents_micron_dram == null ? '—' : (ours.agents_micron_dram ? 'yes' : 'NO');
      const lm = ours.llms_micron_dram == null ? '—' : (ours.llms_micron_dram ? 'yes' : 'NO');
      lines.push(`- Agent-map dram → Micron (#154): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.coreweave_stock_faq != null) {
      lines.push(
        `- CoreWeave stock Trends FAQ (#155): **${ours.coreweave_stock_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && ours.coreweave_debt_faq != null) {
      lines.push(
        `- CoreWeave debt / bond Trends FAQ (#160): **${ours.coreweave_debt_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && ours.nvidia_nvda_faq != null) {
      lines.push(
        `- Nvidia / NVDA Trends FAQ (#161): **${ours.nvidia_nvda_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_nvidia != null || ours.llms_nvidia != null)) {
      const ag = ours.agents_nvidia == null ? '—' : (ours.agents_nvidia ? 'yes' : 'NO');
      const lm = ours.llms_nvidia == null ? '—' : (ours.llms_nvidia ? 'yes' : 'NO');
      lines.push(`- Agent-map NVDA → lab (#161): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.openai_lawsuit_faq != null) {
      lines.push(
        `- OpenAI lawsuit / FTC FAQ (#162): **${ours.openai_lawsuit_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_openai_lawsuit != null || ours.llms_openai_lawsuit != null)) {
      const ag = ours.agents_openai_lawsuit == null ? '—' : (ours.agents_openai_lawsuit ? 'yes' : 'NO');
      const lm = ours.llms_openai_lawsuit == null ? '—' : (ours.llms_openai_lawsuit ? 'yes' : 'NO');
      lines.push(`- Agent-map OpenAI lawsuit → lab (#162): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.anthropic_ipo_faq != null) {
      lines.push(
        `- Anthropic IPO / FTC FAQ (#163): **${ours.anthropic_ipo_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_anthropic_ipo != null || ours.llms_anthropic_ipo != null)) {
      const ag = ours.agents_anthropic_ipo == null ? '—' : (ours.agents_anthropic_ipo ? 'yes' : 'NO');
      const lm = ours.llms_anthropic_ipo == null ? '—' : (ours.llms_anthropic_ipo ? 'yes' : 'NO');
      lines.push(`- Agent-map Anthropic IPO → lab (#163): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.anthropic_ai_safety_bill_faq != null) {
      lines.push(
        `- Anthropic AI safety bill FAQ (#362): **${ours.anthropic_ai_safety_bill_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_anthropic_ai_safety_bill != null || ours.llms_anthropic_ai_safety_bill != null)) {
      const ag = ours.agents_anthropic_ai_safety_bill == null ? '—' : (ours.agents_anthropic_ai_safety_bill ? 'yes' : 'NO');
      const lm = ours.llms_anthropic_ai_safety_bill == null ? '—' : (ours.llms_anthropic_ai_safety_bill ? 'yes' : 'NO');
      lines.push(`- Agent-map AI safety bill → lab (#362): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.anthropic_canada_dc_faq != null) {
      lines.push(
        `- Anthropic Canadian data centres FAQ (#368): **${ours.anthropic_canada_dc_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_anthropic_canada_dc != null || ours.llms_anthropic_canada_dc != null)) {
      const ag = ours.agents_anthropic_canada_dc == null ? '—' : (ours.agents_anthropic_canada_dc ? 'yes' : 'NO');
      const lm = ours.llms_anthropic_canada_dc == null ? '—' : (ours.llms_anthropic_canada_dc ? 'yes' : 'NO');
      lines.push(`- Agent-map Canadian data → lab (#368): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.anthropic_metr_faq != null) {
      lines.push(
        `- Anthropic METR evaluator FAQ (#392): **${ours.anthropic_metr_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_anthropic_metr != null || ours.llms_anthropic_metr != null)) {
      const ag = ours.agents_anthropic_metr == null ? '—' : (ours.agents_anthropic_metr ? 'yes' : 'NO');
      const lm = ours.llms_anthropic_metr == null ? '—' : (ours.llms_anthropic_metr ? 'yes' : 'NO');
      lines.push(`- Agent-map METR → lab (#392): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.anthropic_ecdsa_faq != null) {
      lines.push(
        `- Anthropic ECDSA curve-seed FAQ (#397): **${ours.anthropic_ecdsa_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_anthropic_ecdsa != null || ours.llms_anthropic_ecdsa != null)) {
      const ag = ours.agents_anthropic_ecdsa == null ? '—' : (ours.agents_anthropic_ecdsa ? 'yes' : 'NO');
      const lm = ours.llms_anthropic_ecdsa == null ? '—' : (ours.llms_anthropic_ecdsa ? 'yes' : 'NO');
      lines.push(`- Agent-map ECDSA → lab (#397): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.claude_opus_55_faq != null) {
      lines.push(
        `- Claude Opus 5.5 FAQ (#402): **${ours.claude_opus_55_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_claude_opus_55 != null || ours.llms_claude_opus_55 != null)) {
      const ag = ours.agents_claude_opus_55 == null ? '—' : (ours.agents_claude_opus_55 ? 'yes' : 'NO');
      const lm = ours.llms_claude_opus_55 == null ? '—' : (ours.llms_claude_opus_55 ? 'yes' : 'NO');
      lines.push(`- Agent-map Claude Opus 5.5 → lab (#402): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.blackstone_anthropic_faq != null) {
      lines.push(
        `- Blackstone Anthropic financing FAQ (#408): **${ours.blackstone_anthropic_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_blackstone_anthropic != null || ours.llms_blackstone_anthropic != null)) {
      const ag = ours.agents_blackstone_anthropic == null ? '—' : (ours.agents_blackstone_anthropic ? 'yes' : 'NO');
      const lm = ours.llms_blackstone_anthropic == null ? '—' : (ours.llms_blackstone_anthropic ? 'yes' : 'NO');
      lines.push(`- Agent-map Blackstone → Anthropic lab (#408): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.replit_anthropic_faq != null) {
      lines.push(
        `- Replit Anthropic model-switch FAQ (#412): **${ours.replit_anthropic_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_replit_anthropic != null || ours.llms_replit_anthropic != null)) {
      const ag = ours.agents_replit_anthropic == null ? '—' : (ours.agents_replit_anthropic ? 'yes' : 'NO');
      const lm = ours.llms_replit_anthropic == null ? '—' : (ours.llms_replit_anthropic ? 'yes' : 'NO');
      lines.push(`- Agent-map Replit → Anthropic lab (#412): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.claude_mythos_5_faq != null) {
      lines.push(
        `- Claude Mythos 5 FAQ (#420): **${ours.claude_mythos_5_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_claude_mythos_5 != null || ours.llms_claude_mythos_5 != null)) {
      const ag = ours.agents_claude_mythos_5 == null ? '—' : (ours.agents_claude_mythos_5 ? 'yes' : 'NO');
      const lm = ours.llms_claude_mythos_5 == null ? '—' : (ours.llms_claude_mythos_5 ? 'yes' : 'NO');
      lines.push(`- Agent-map Claude Mythos 5 → Anthropic lab (#420): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.asml_trends_faq != null) {
      lines.push(
        `- ASML Trends FAQ (#164): **${ours.asml_trends_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_asml != null || ours.llms_asml != null)) {
      const ag = ours.agents_asml == null ? '—' : (ours.agents_asml ? 'yes' : 'NO');
      const lm = ours.llms_asml == null ? '—' : (ours.llms_asml ? 'yes' : 'NO');
      lines.push(`- Agent-map ASML stock → lab (#164): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.tsmc_trends_faq != null) {
      lines.push(
        `- TSMC Trends FAQ (#165): **${ours.tsmc_trends_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_tsmc != null || ours.llms_tsmc != null)) {
      const ag = ours.agents_tsmc == null ? '—' : (ours.agents_tsmc ? 'yes' : 'NO');
      const lm = ours.llms_tsmc == null ? '—' : (ours.llms_tsmc ? 'yes' : 'NO');
      lines.push(`- Agent-map TSMC stock → lab (#165): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.amazon_bee_faq != null) {
      lines.push(
        `- Amazon Bee FAQ (#167): **${ours.amazon_bee_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_amazon_bee != null || ours.llms_amazon_bee != null)) {
      const ag = ours.agents_amazon_bee == null ? '—' : (ours.agents_amazon_bee ? 'yes' : 'NO');
      const lm = ours.llms_amazon_bee == null ? '—' : (ours.llms_amazon_bee ? 'yes' : 'NO');
      lines.push(`- Agent-map Amazon Bee → lab (#167): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.meta_muse_faq != null) {
      lines.push(
        `- Meta Muse FAQ (#169): **${ours.meta_muse_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_meta_muse != null || ours.llms_meta_muse != null)) {
      const ag = ours.agents_meta_muse == null ? '—' : (ours.agents_meta_muse ? 'yes' : 'NO');
      const lm = ours.llms_meta_muse == null ? '—' : (ours.llms_meta_muse ? 'yes' : 'NO');
      lines.push(`- Agent-map Meta Muse → lab (#169): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.meta_apple_mac_faq != null) {
      lines.push(
        `- Meta–Apple Mac AI FAQ (#193): **${ours.meta_apple_mac_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_meta_apple_mac != null || ours.llms_meta_apple_mac != null)) {
      const ag = ours.agents_meta_apple_mac == null ? '—' : (ours.agents_meta_apple_mac ? 'yes' : 'NO');
      const lm = ours.llms_meta_apple_mac == null ? '—' : (ours.llms_meta_apple_mac ? 'yes' : 'NO');
      lines.push(`- Agent-map Meta–Apple Mac AI → lab (#193): agents.md **${ag}** · llms.txt **${lm}**`);
    }

    if (ours && ours.apple_intelligence_faq != null) {
      lines.push(
        `- Apple Intelligence FAQ (#170): **${ours.apple_intelligence_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_apple_intelligence != null || ours.llms_apple_intelligence != null)) {
      const ag = ours.agents_apple_intelligence == null ? '—' : (ours.agents_apple_intelligence ? 'yes' : 'NO');
      const lm = ours.llms_apple_intelligence == null ? '—' : (ours.llms_apple_intelligence ? 'yes' : 'NO');
      lines.push(`- Agent-map Apple Intelligence → lab (#170): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.microsoft_copilot_faq != null) {
      lines.push(
        `- Microsoft Copilot FAQ (#171): **${ours.microsoft_copilot_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_microsoft_copilot != null || ours.llms_microsoft_copilot != null)) {
      const ag = ours.agents_microsoft_copilot == null ? '—' : (ours.agents_microsoft_copilot ? 'yes' : 'NO');
      const lm = ours.llms_microsoft_copilot == null ? '—' : (ours.llms_microsoft_copilot ? 'yes' : 'NO');
      lines.push(`- Agent-map Microsoft Copilot → lab (#171): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.microsoft_mai_faq != null) {
      lines.push(
        `- Microsoft MAI-Base FAQ (#220): **${ours.microsoft_mai_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_microsoft_mai != null || ours.llms_microsoft_mai != null)) {
      const ag = ours.agents_microsoft_mai == null ? '—' : (ours.agents_microsoft_mai ? 'yes' : 'NO');
      const lm = ours.llms_microsoft_mai == null ? '—' : (ours.llms_microsoft_mai ? 'yes' : 'NO');
      lines.push(`- Agent-map Microsoft MAI-Base → lab (#220): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.surface_ultra_faq != null) {
      lines.push(
        `- Surface Laptop Ultra FAQ (#414): **${ours.surface_ultra_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_surface_ultra != null || ours.llms_surface_ultra != null)) {
      const ag = ours.agents_surface_ultra == null ? '—' : (ours.agents_surface_ultra ? 'yes' : 'NO');
      const lm = ours.llms_surface_ultra == null ? '—' : (ours.llms_surface_ultra ? 'yes' : 'NO');
      lines.push(`- Agent-map Surface Laptop Ultra → lab (#414): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.xai_grok_faq != null) {
      lines.push(
        `- Grok / xAI FAQ (#173): **${ours.xai_grok_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_xai_grok != null || ours.llms_xai_grok != null)) {
      const ag = ours.agents_xai_grok == null ? '—' : (ours.agents_xai_grok ? 'yes' : 'NO');
      const lm = ours.llms_xai_grok == null ? '—' : (ours.llms_xai_grok ? 'yes' : 'NO');
      lines.push(`- Agent-map Grok / xAI → lab (#173): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.gemini_gemma_faq != null) {
      lines.push(
        `- Gemini / Gemma / Argon FAQ (#174/#187): **${ours.gemini_gemma_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_gemini_gemma != null || ours.llms_gemini_gemma != null)) {
      const ag = ours.agents_gemini_gemma == null ? '—' : (ours.agents_gemini_gemma ? 'yes' : 'NO');
      const lm = ours.llms_gemini_gemma == null ? '—' : (ours.llms_gemini_gemma ? 'yes' : 'NO');
      lines.push(`- Agent-map Gemini / Gemma / Argon → lab (#174/#187): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.samsung_hbm_faq != null) {
      lines.push(
        `- Samsung / HBM FAQ (#175): **${ours.samsung_hbm_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_samsung_hbm != null || ours.llms_samsung_hbm != null)) {
      const ag = ours.agents_samsung_hbm == null ? '—' : (ours.agents_samsung_hbm ? 'yes' : 'NO');
      const lm = ours.llms_samsung_hbm == null ? '—' : (ours.llms_samsung_hbm ? 'yes' : 'NO');
      lines.push(`- Agent-map Samsung / AI memory → lab (#175): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.samsung_glasses_faq != null) {
      lines.push(
        `- Samsung AI glasses FAQ (#195): **${ours.samsung_glasses_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_samsung_glasses != null || ours.llms_samsung_glasses != null)) {
      const ag = ours.agents_samsung_glasses == null ? '—' : (ours.agents_samsung_glasses ? 'yes' : 'NO');
      const lm = ours.llms_samsung_glasses == null ? '—' : (ours.llms_samsung_glasses ? 'yes' : 'NO');
      lines.push(`- Agent-map Samsung AI glasses → lab (#195): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && (ours.agents_coreweave != null || ours.llms_coreweave != null)) {
      const ag = ours.agents_coreweave == null ? '—' : (ours.agents_coreweave ? 'yes' : 'NO');
      const lm = ours.llms_coreweave == null ? '—' : (ours.llms_coreweave ? 'yes' : 'NO');
      lines.push(`- Agent-map CoreWeave stock → lab (#155): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.neocloud_faq != null) {
      lines.push(
        `- Neocloud Trends FAQ (#157): **${ours.neocloud_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_neocloud != null || ours.llms_neocloud != null)) {
      const ag = ours.agents_neocloud == null ? '—' : (ours.agents_neocloud ? 'yes' : 'NO');
      const lm = ours.llms_neocloud == null ? '—' : (ours.llms_neocloud ? 'yes' : 'NO');
      lines.push(`- Agent-map neocloud → tag (#157): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.character_ai_faq != null) {
      lines.push(
        `- Character.ai bankruptcy FAQ (#176): **${ours.character_ai_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_character_ai != null || ours.llms_character_ai != null)) {
      const ag = ours.agents_character_ai == null ? '—' : (ours.agents_character_ai ? 'yes' : 'NO');
      const lm = ours.llms_character_ai == null ? '—' : (ours.llms_character_ai ? 'yes' : 'NO');
      lines.push(`- Agent-map Character.ai bankruptcy → tag (#176): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.cert_in_faq != null) {
      lines.push(
        `- CERT-In FAQ (#410): **${ours.cert_in_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_cert_in != null || ours.llms_cert_in != null)) {
      const ag = ours.agents_cert_in == null ? '—' : (ours.agents_cert_in ? 'yes' : 'NO');
      const lm = ours.llms_cert_in == null ? '—' : (ours.llms_cert_in ? 'yes' : 'NO');
      lines.push(`- Agent-map CERT-In → tag (#410): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.qwen_faq != null) {
      lines.push(
        `- Qwen FAQ (#177): **${ours.qwen_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_qwen != null || ours.llms_qwen != null)) {
      const ag = ours.agents_qwen == null ? '—' : (ours.agents_qwen ? 'yes' : 'NO');
      const lm = ours.llms_qwen == null ? '—' : (ours.llms_qwen ? 'yes' : 'NO');
      lines.push(`- Agent-map Qwen / Alibaba open-weight → lab (#177): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.oracle_datacenters_faq != null) {
      lines.push(
        `- Oracle / AI datacenter FAQ (#178): **${ours.oracle_datacenters_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_oracle_datacenters != null || ours.llms_oracle_datacenters != null)) {
      const ag = ours.agents_oracle_datacenters == null ? '—' : (ours.agents_oracle_datacenters ? 'yes' : 'NO');
      const lm = ours.llms_oracle_datacenters == null ? '—' : (ours.llms_oracle_datacenters ? 'yes' : 'NO');
      lines.push(`- Agent-map Oracle datacenter → tag (#178): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.deepseek_faq != null) {
      lines.push(
        `- DeepSeek outage FAQ (#179): **${ours.deepseek_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_deepseek != null || ours.llms_deepseek != null)) {
      const ag = ours.agents_deepseek == null ? '—' : (ours.agents_deepseek ? 'yes' : 'NO');
      const lm = ours.llms_deepseek == null ? '—' : (ours.llms_deepseek ? 'yes' : 'NO');
      lines.push(`- Agent-map DeepSeek outage → lab (#179): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.deepseek_flash_faq != null) {
      lines.push(
        `- DeepSeek V4.1 Flash FAQ (#418): **${ours.deepseek_flash_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_deepseek_flash != null || ours.llms_deepseek_flash != null)) {
      const ag = ours.agents_deepseek_flash == null ? '—' : (ours.agents_deepseek_flash ? 'yes' : 'NO');
      const lm = ours.llms_deepseek_flash == null ? '—' : (ours.llms_deepseek_flash ? 'yes' : 'NO');
      lines.push(`- Agent-map DeepSeek V4.1 Flash → lab (#418): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.mistral_faq != null) {
      lines.push(
        `- Mistral / Timestral FAQ (#180): **${ours.mistral_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_mistral != null || ours.llms_mistral != null)) {
      const ag = ours.agents_mistral == null ? '—' : (ours.agents_mistral ? 'yes' : 'NO');
      const lm = ours.llms_mistral == null ? '—' : (ours.llms_mistral ? 'yes' : 'NO');
      lines.push(`- Agent-map Timestral → lab (#180): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.openai_outage_faq != null) {
      lines.push(
        `- OpenAI outage FAQ (#181): **${ours.openai_outage_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_openai_outage != null || ours.llms_openai_outage != null)) {
      const ag = ours.agents_openai_outage == null ? '—' : (ours.agents_openai_outage ? 'yes' : 'NO');
      const lm = ours.llms_openai_outage == null ? '—' : (ours.llms_openai_outage ? 'yes' : 'NO');
      lines.push(`- Agent-map OpenAI outage → lab (#181): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.openai_chrome_faq != null) {
      lines.push(
        `- ChatGPT Chrome FAQ (#191): **${ours.openai_chrome_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_openai_chrome != null || ours.llms_openai_chrome != null)) {
      const ag = ours.agents_openai_chrome == null ? '—' : (ours.agents_openai_chrome ? 'yes' : 'NO');
      const lm = ours.llms_openai_chrome == null ? '—' : (ours.llms_openai_chrome ? 'yes' : 'NO');
      lines.push(`- Agent-map ChatGPT Chrome → lab (#191): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.huggingface_faq != null) {
      lines.push(
        `- Hugging Face hack FAQ (#182): **${ours.huggingface_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_huggingface != null || ours.llms_huggingface != null)) {
      const ag = ours.agents_huggingface == null ? '—' : (ours.agents_huggingface ? 'yes' : 'NO');
      const lm = ours.llms_huggingface == null ? '—' : (ours.llms_huggingface ? 'yes' : 'NO');
      lines.push(`- Agent-map Hugging Face hack → tag (#182): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.palantir_faq != null) {
      lines.push(
        `- Palantir / AIP FAQ (#183): **${ours.palantir_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_palantir != null || ours.llms_palantir != null)) {
      const ag = ours.agents_palantir == null ? '—' : (ours.agents_palantir ? 'yes' : 'NO');
      const lm = ours.llms_palantir == null ? '—' : (ours.llms_palantir ? 'yes' : 'NO');
      lines.push(`- Agent-map Palantir / AIP → lab (#183): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.ondas_palantir_faq != null) {
      lines.push(
        `- Ondas-Palantir FAQ (#406): **${ours.ondas_palantir_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_ondas_palantir != null || ours.llms_ondas_palantir != null)) {
      const ag = ours.agents_ondas_palantir == null ? '—' : (ours.agents_ondas_palantir ? 'yes' : 'NO');
      const lm = ours.llms_ondas_palantir == null ? '—' : (ours.llms_ondas_palantir ? 'yes' : 'NO');
      lines.push(`- Agent-map Ondas → Palantir lab (#406): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.amd_faq != null) {
      lines.push(
        `- AMD / MI300 FAQ (#184): **${ours.amd_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_amd != null || ours.llms_amd != null)) {
      const ag = ours.agents_amd == null ? '—' : (ours.agents_amd ? 'yes' : 'NO');
      const lm = ours.llms_amd == null ? '—' : (ours.llms_amd ? 'yes' : 'NO');
      lines.push(`- Agent-map AMD / MI300 → lab (#184): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.tesla_faq != null) {
      lines.push(
        `- Tesla / FSD FAQ (#185): **${ours.tesla_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_tesla != null || ours.llms_tesla != null)) {
      const ag = ours.agents_tesla == null ? '—' : (ours.agents_tesla ? 'yes' : 'NO');
      const lm = ours.llms_tesla == null ? '—' : (ours.llms_tesla ? 'yes' : 'NO');
      lines.push(`- Agent-map Tesla / FSD → lab (#185): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.waymo_canada_faq != null) {
      lines.push(
        `- Waymo Canada / Toronto FAQ (#372): **${ours.waymo_canada_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_waymo_canada != null || ours.llms_waymo_canada != null)) {
      const ag = ours.agents_waymo_canada == null ? '—' : (ours.agents_waymo_canada ? 'yes' : 'NO');
      const lm = ours.llms_waymo_canada == null ? '—' : (ours.llms_waymo_canada ? 'yes' : 'NO');
      lines.push(`- Agent-map Waymo Canada → lab (#372): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.softbank_allied_faq != null) {
      lines.push(
        `- SoftBank Allied Universal FAQ (#374): **${ours.softbank_allied_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_softbank_allied != null || ours.llms_softbank_allied != null)) {
      const ag = ours.agents_softbank_allied == null ? '—' : (ours.agents_softbank_allied ? 'yes' : 'NO');
      const lm = ours.llms_softbank_allied == null ? '—' : (ours.llms_softbank_allied ? 'yes' : 'NO');
      lines.push(`- Agent-map Allied Universal → SoftBank lab (#374): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.spacex_starshield_faq != null) {
      lines.push(
        `- SpaceX Starshield FAQ (#376): **${ours.spacex_starshield_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_spacex_starshield != null || ours.llms_spacex_starshield != null)) {
      const ag = ours.agents_spacex_starshield == null ? '—' : (ours.agents_spacex_starshield ? 'yes' : 'NO');
      const lm = ours.llms_spacex_starshield == null ? '—' : (ours.llms_spacex_starshield ? 'yes' : 'NO');
      lines.push(`- Agent-map Starshield → SpaceX lab (#376): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.tesla_flying_roadster_faq != null) {
      lines.push(
        `- Tesla Flying Roadster FAQ (#378): **${ours.tesla_flying_roadster_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && (ours.agents_tesla_flying_roadster != null || ours.llms_tesla_flying_roadster != null)) {
      const ag = ours.agents_tesla_flying_roadster == null ? '—' : (ours.agents_tesla_flying_roadster ? 'yes' : 'NO');
      const lm = ours.llms_tesla_flying_roadster == null ? '—' : (ours.llms_tesla_flying_roadster ? 'yes' : 'NO');
      lines.push(`- Agent-map Flying Roadster → Tesla lab (#378): agents.md **${ag}** · llms.txt **${lm}**`);
    }
    if (ours && ours.trends_routes_faq != null) {
      lines.push(
        `- Search Trends routing FAQ (#158/#166): **${ours.trends_routes_faq ? 'ok' : 'NO'}**`,
      );
    }
    if (ours && Array.isArray(ours.lab_head_alias_lags)) {
      if (ours.lab_head_alias_lags.length === 0) {
        lines.push('- Lab head-term titles (#121/#123/#137): **ok** (Gemini / ChatGPT / Claude / MU in lab `<title>`)');
      } else {
        const sample = ours.lab_head_alias_lags.slice(0, 3).map((r) => r.needle).join(', ');
        lines.push(
          `- Lab head-term titles (#121/#123): **LAG** on ${ours.lab_head_alias_lags.length} (e.g. ${sample})`,
        );
      }
    }
    if (ours && Array.isArray(ours.conquest_faq_lags)) {
      if (ours.conquest_faq_lags.length === 0) {
        lines.push('- Conquest FAQ hubs (#126/#128): **ok** (compare + alternatives exact-match needles)');
      } else {
        const sample = ours.conquest_faq_lags.slice(0, 3).map((r) => r.path).join(', ');
        lines.push(
          `- Conquest FAQ hubs (#126/#128): **LAG** on ${ours.conquest_faq_lags.length} (e.g. ${sample})`,
        );
      }
    }
    if (ours && (ours.gsc_meta != null || ours.bing_meta != null || ours.robots_tips != null
      || ours.sitemap_tips != null || ours.news_sitemap_tips != null
      || ours.feed_tips != null || ours.feed_level_tips != null
      || ours.now_md_tips != null || ours.now_txt_tips != null
      || ours.trends_generated_at !== undefined
      || ours.news_keyword_lags != null
      || ours.news_lab_alias_lags != null
      || ours.agents_vs_aliases != null || ours.llms_vs_aliases != null
      || ours.agents_trends_alias != null || ours.llms_trends_alias != null
      || ours.agents_pdoom_alias != null || ours.llms_pdoom_alias != null
      || ours.agents_activity_index_alias != null || ours.llms_activity_index_alias != null
      || ours.agents_activity_level_alias != null || ours.llms_activity_level_alias != null
      || ours.agents_activity_level_head_term != null || ours.llms_activity_level_head_term != null
      || ours.agents_classic_panel != null || ours.llms_classic_panel != null
      || ours.skill_classic_panel != null
      || ours.skill_activity_level_head_term != null
      || ours.agents_html_dual_head_term != null
      || ours.agents_txt_dual_head_term != null
      || ours.ai_txt_dual_head_term != null
      || ours.agents_json_dual_head_term != null
      || ours.openapi_dual_head_term != null
      || ours.api_index_dual_head_term != null
      || ours.freetools_dual_head_term != null
      || ours.verify_dual_head_term != null
      || ours.compare_dual_head_term != null
      || ours.alternatives_dual_head_term != null
      || ours.pdoom_dual_head_term != null
      || ours.ai_doomsday_clock_dual_head_term != null
      || ours.agents_txt_classic_panel != null
      || ours.ai_txt_classic_panel != null
      || ours.catalog_classic_panel != null
      || ours.agents_root_rivals != null || ours.llms_root_rivals != null
      || ours.agents_head_aliases != null || ours.llms_head_aliases != null
      || ours.llms_lab_about_labels != null
      || ours.lab_hub_label_lags != null
      || ours.home_lab_about_labels != null
      || ours.home_activity_index_faq != null
      || ours.home_activity_index_today_faq != null
      || ours.home_activity_level_faq_alias != null
      || ours.home_activity_level_title != null
      || ours.home_activity_h1_head_terms != null
      || ours.home_activity_title_trim != null
      || ours.classic_panel != null || ours.classic_sitemap != null
      || ours.race_lab_about_labels != null
      || ours.lab_head_alias_lags != null
      || ours.conquest_faq_lags != null)) {
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
  const tipped = `<?xml version="1.0"?>\n<!-- Free tools: https://siren.watch/free-tools.html · Verify a reading: https://siren.watch/verify.html -->\n<!-- Search Trends: https://siren.watch/search-trends.html -->\n<!-- Classic instrument panel: https://siren.watch/classic.html -->\n<urlset></urlset>`;
  if (hasSitemapTips(tipped) !== true) throw new Error('hasSitemapTips true');
  if (hasSitemapTips('<?xml version="1.0"?><urlset></urlset>') !== false) throw new Error('hasSitemapTips false');
  if (hasSitemapTips('<!-- Free tools: https://siren.watch/free-tools.html · Verify a reading: https://siren.watch/verify.html -->\n<!-- Search Trends: https://siren.watch/search-trends.html -->') !== false) {
    throw new Error('hasSitemapTips requires /classic.html');
  }
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
  const robotsTipped = `# Free tools: https://siren.watch/free-tools.html · Verify a reading: https://siren.watch/verify.html\n# Search Trends: https://siren.watch/search-trends.html\n# Classic instrument panel: https://siren.watch/classic.html\nUser-agent: *\nAllow: /\n`;
  if (hasRobotsTips(robotsTipped) !== true) throw new Error('hasRobotsTips true');
  if (hasRobotsTips('User-agent: *\nAllow: /\n') !== false) throw new Error('hasRobotsTips false');
  if (hasRobotsTips('# Free tools: https://siren.watch/free-tools.html · Verify a reading: https://siren.watch/verify.html\n# Search Trends: https://siren.watch/search-trends.html\n') !== false) {
    throw new Error('hasRobotsTips requires /classic.html');
  }
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
  const useHead = '<head><link rel="alternate" type="text/markdown" href="/skill.md" title="How to use and cite SIREN"><link rel="alternate" type="text/plain" href="/api/now.txt" title="Current reading (plain text)"></head>';
  const useRobots = '# How to use (no key): GET https://siren.watch/api/now.txt · how to cite https://siren.watch/skill.md\n# AGENTS.md convention: https://siren.watch/AGENTS.md\n';
  if (hasAgentUseLinks(useHead, useRobots) !== true) throw new Error('hasAgentUseLinks true');
  if (hasAgentUseLinks(useHead, 'User-agent: *\nAllow: /\n') !== false) throw new Error('hasAgentUseLinks false without robots');
  if (hasAgentUseLinks('<head></head><a href="/skill.md">skill</a><a href="/api/now.txt">now</a>', useRobots) !== false) {
    throw new Error('hasAgentUseLinks false outside head');
  }
  const useGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      agent_use_links: false,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!useGaps.some((g) => g.id === 'agent-use-links-missing')) throw new Error('agent-use-links-missing gap');
  const nowTipped = 'Also: [free tools](https://siren.watch/free-tools.html) · [verify a reading](https://siren.watch/verify.html) · [Search Trends](https://siren.watch/search-trends.html) (short alias https://siren.watch/trends.html) · [classic instrument panel](https://siren.watch/classic.html).\n';
  if (hasNowTips(nowTipped) !== true) throw new Error('hasNowTips true');
  if (hasNowTips('# SIREN: current reading\n') !== false) throw new Error('hasNowTips false');
  if (hasNowTips('Search Trends /free-tools.html /verify.html') !== false) {
    throw new Error('hasNowTips requires /trends.html');
  }
  if (hasNowTips('/free-tools.html /verify.html Search Trends short /trends.html') !== false) {
    throw new Error('hasNowTips requires /classic.html');
  }
  if (hasTrendsShortAlias('short alias https://siren.watch/trends.html') !== true) {
    throw new Error('hasTrendsShortAlias true');
  }
  if (hasTrendsShortAlias('/search-trends.html only') !== false) {
    throw new Error('hasTrendsShortAlias false');
  }
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
  for (const p of ['/verify/', '/free-tools/', '/search-trends/', '/trends.html', '/trends/']) {
    if (!CORE_LIVE_SURFACES.includes(p)) throw new Error(`CORE_LIVE_SURFACES missing #124 ${p}`);
  }
  for (const p of ['/pdoom.html', '/pdoom/']) {
    if (!CORE_LIVE_SURFACES.includes(p)) throw new Error(`CORE_LIVE_SURFACES missing #129 ${p}`);
  }
  for (const p of [
    '/doombench.html', '/doom.html',
    '/skynet-countdown.html', '/skynet.html',
    '/pizzint.html',
    '/takeofftracker.html', '/takeoff.html',
  ]) {
    if (!CORE_LIVE_SURFACES.includes(p)) throw new Error(`CORE_LIVE_SURFACES missing #131 ${p}`);
  }
  for (const p of [
    '/doomsday-clock.html', '/ai-doom.html',
    '/doom-index.html', '/ai-doom-index.html',
  ]) {
    if (!CORE_LIVE_SURFACES.includes(p)) throw new Error(`CORE_LIVE_SURFACES missing #133 ${p}`);
  }
  for (const p of ['/ai-activity-index.html', '/ai-activity-index/']) {
    if (!CORE_LIVE_SURFACES.includes(p)) throw new Error(`CORE_LIVE_SURFACES missing #252 ${p}`);
  }
  for (const p of ['/ai-activity-level.html', '/ai-activity-level/']) {
    if (!CORE_LIVE_SURFACES.includes(p)) throw new Error(`CORE_LIVE_SURFACES missing #262 ${p}`);
  }
  if (!CORE_LIVE_SURFACES.includes('/classic.html')) {
    throw new Error('CORE_LIVE_SURFACES missing #318 /classic.html');
  }
  if (hasActivityIndexAlias('short /ai-activity-index.html') !== true) {
    throw new Error('hasActivityIndexAlias true');
  }
  if (hasActivityIndexAlias('/ only') !== false) {
    throw new Error('hasActivityIndexAlias false');
  }
  if (hasActivityLevelAlias('short /ai-activity-level.html') !== true) {
    throw new Error('hasActivityLevelAlias true');
  }
  if (hasActivityLevelAlias('/ai-activity-index.html only') !== false) {
    throw new Error('hasActivityLevelAlias false');
  }
  if (hasActivityLevelHeadTerm('live AI activity level today (dual)') !== true) {
    throw new Error('hasActivityLevelHeadTerm true');
  }
  if (hasActivityLevelHeadTerm('short aliases /ai-activity-level.html only') !== false) {
    throw new Error('hasActivityLevelHeadTerm false');
  }
  const activityLevelHeadGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      agents_activity_level_head_term: false, llms_activity_level_head_term: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!activityLevelHeadGaps.some((g) => g.id === 'agents-activity-level-head-term-missing')) {
    throw new Error('agents-activity-level-head-term-missing gap');
  }
  const activityGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      agents_activity_index_alias: false, llms_activity_index_alias: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!activityGaps.some((g) => g.id === 'agents-activity-index-alias-missing')) {
    throw new Error('agents-activity-index-alias-missing gap');
  }
  const activityLevelGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      agents_activity_level_alias: false, llms_activity_level_alias: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!activityLevelGaps.some((g) => g.id === 'agents-activity-level-alias-missing')) {
    throw new Error('agents-activity-level-alias-missing gap');
  }
  if (hasClassicPanelAgentMap('see /classic.html panel') !== true) {
    throw new Error('hasClassicPanelAgentMap true');
  }
  if (hasClassicPanelAgentMap('/instruments.html only') !== false) {
    throw new Error('hasClassicPanelAgentMap false');
  }
  const classicAgentGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      agents_classic_panel: false, llms_classic_panel: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!classicAgentGaps.some((g) => g.id === 'agents-classic-panel-missing')) {
    throw new Error('agents-classic-panel-missing gap');
  }
  if (!CORE_LIVE_SURFACES.includes('/skill.md')) {
    throw new Error('CORE_LIVE_SURFACES missing #326 /skill.md');
  }
  if (hasSkillClassicPanel('## Full instrument panel\nhttps://siren.watch/classic.html — Where is the full SIREN instrument panel?') !== true) {
    throw new Error('hasSkillClassicPanel true');
  }
  if (hasSkillClassicPanel('/classic.html alone') !== false) {
    throw new Error('hasSkillClassicPanel false without question');
  }
  const skillGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      skill_classic_panel: false,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!skillGaps.some((g) => g.id === 'skill-classic-panel-missing')) {
    throw new Error('skill-classic-panel-missing gap');
  }
  const skillLevelHeadGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      skill_activity_level_head_term: false,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!skillLevelHeadGaps.some((g) => g.id === 'skill-activity-level-head-term-missing')) {
    throw new Error('skill-activity-level-head-term-missing gap');
  }
  if (!CORE_LIVE_SURFACES.includes('/agents.html')) {
    throw new Error('CORE_LIVE_SURFACES missing #437 /agents.html');
  }
  if (!CORE_LIVE_SURFACES.includes('/AGENTS.md')) {
    throw new Error('CORE_LIVE_SURFACES missing #489 /AGENTS.md');
  }
  if (hasAgentsHtmlDualHeadTerm('live AI activity index today · AI activity level today (dual)') !== true) {
    throw new Error('hasAgentsHtmlDualHeadTerm true');
  }
  if (hasAgentsHtmlDualHeadTerm('What is the AI activity level today on siren.watch?') !== false) {
    throw new Error('hasAgentsHtmlDualHeadTerm false for level-only pre');
  }
  const agentsHtmlDualGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      agents_html_dual_head_term: false,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!agentsHtmlDualGaps.some((g) => g.id === 'agents-html-dual-head-term-missing')) {
    throw new Error('agents-html-dual-head-term-missing gap');
  }
  if (hasDiscoveryDualHeadTerm('Live reading: / — AI activity index today · AI activity level today') !== true) {
    throw new Error('hasDiscoveryDualHeadTerm true');
  }
  if (hasDiscoveryDualHeadTerm('Where is the full SIREN instrument panel?') !== false) {
    throw new Error('hasDiscoveryDualHeadTerm false without dual');
  }
  const discoveryDualGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      agents_txt_dual_head_term: false,
      ai_txt_dual_head_term: false,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!discoveryDualGaps.some((g) => g.id === 'discovery-dual-head-term-missing')) {
    throw new Error('discovery-dual-head-term-missing gap');
  }
  if (hasAgentsJsonDualHeadTerm(JSON.stringify({
    related: { home_title: 'AI activity index today · AI activity level today', home: 'https://siren.watch/' },
  })) !== true) {
    throw new Error('hasAgentsJsonDualHeadTerm true');
  }
  if (hasAgentsJsonDualHeadTerm(JSON.stringify({
    related: { classic_title: 'Where is the full SIREN instrument panel?' },
  })) !== false) {
    throw new Error('hasAgentsJsonDualHeadTerm false without dual');
  }
  const agentsJsonDualGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      agents_json_dual_head_term: false,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!agentsJsonDualGaps.some((g) => g.id === 'agents-json-dual-head-term-missing')) {
    throw new Error('agents-json-dual-head-term-missing gap');
  }
  if (hasOpenapiDualHeadTerm(JSON.stringify({
    paths: { '/': { get: { summary: 'AI activity index today · AI activity level today (live hourly reading)' } } },
  })) !== true) {
    throw new Error('hasOpenapiDualHeadTerm true');
  }
  if (hasOpenapiDualHeadTerm(JSON.stringify({
    paths: { '/classic.html': { get: { summary: 'Where is the full SIREN instrument panel?' } } },
  })) !== false) {
    throw new Error('hasOpenapiDualHeadTerm false without / dual');
  }
  if (hasApiIndexDualHeadTerm(JSON.stringify({
    agents: { home_title: 'AI activity index today · AI activity level today', home: 'https://siren.watch/' },
  })) !== true) {
    throw new Error('hasApiIndexDualHeadTerm true');
  }
  if (hasApiIndexDualHeadTerm(JSON.stringify({
    agents: { classic: 'https://siren.watch/classic.html' },
  })) !== false) {
    throw new Error('hasApiIndexDualHeadTerm false without home_title');
  }
  const openapiDualGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      openapi_dual_head_term: false,
      api_index_dual_head_term: false,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!openapiDualGaps.some((g) => g.id === 'openapi-dual-head-term-missing')) {
    throw new Error('openapi-dual-head-term-missing gap');
  }
  if (!CORE_LIVE_SURFACES.includes('/ai.txt')) {
    throw new Error('CORE_LIVE_SURFACES missing #328 /ai.txt');
  }
  if (hasDiscoveryClassicPanel('Classic instrument panel: https://siren.watch/classic.html — Where is the full SIREN instrument panel?') !== true) {
    throw new Error('hasDiscoveryClassicPanel true');
  }
  if (hasDiscoveryClassicPanel('/classic.html alone') !== false) {
    throw new Error('hasDiscoveryClassicPanel false without question');
  }
  if (hasCatalogClassicPanel(JSON.stringify({
    linkset: [{ item: [{ href: 'https://siren.watch/classic.html', title: 'Where is the full SIREN instrument panel?' }] }],
  })) !== true) {
    throw new Error('hasCatalogClassicPanel true');
  }
  if (hasCatalogClassicPanel(JSON.stringify({
    linkset: [{ item: [{ href: 'https://siren.watch/agents.md' }] }],
  })) !== false) {
    throw new Error('hasCatalogClassicPanel false');
  }
  const discoveryGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      agents_txt_classic_panel: false,
      ai_txt_classic_panel: true,
      catalog_classic_panel: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!discoveryGaps.some((g) => g.id === 'discovery-classic-panel-missing')) {
    throw new Error('discovery-classic-panel-missing gap');
  }
  if (!CORE_LIVE_SURFACES.includes('/agents.json') || !CORE_LIVE_SURFACES.includes('/api/index.json')) {
    throw new Error('CORE_LIVE_SURFACES missing #330 /agents.json or /api/index.json');
  }
  if (hasAgentsJsonClassicPanel(JSON.stringify({
    related: {
      classic: 'https://siren.watch/classic.html',
      classic_title: 'Where is the full SIREN instrument panel?',
    },
  })) !== true) {
    throw new Error('hasAgentsJsonClassicPanel true');
  }
  if (hasAgentsJsonClassicPanel(JSON.stringify({
    related: { classic: 'https://siren.watch/classic.html' },
  })) !== false) {
    throw new Error('hasAgentsJsonClassicPanel false without question');
  }
  if (hasOpenapiClassicPanel(JSON.stringify({
    paths: {
      '/classic.html': {
        get: { summary: 'Where is the full SIREN instrument panel? (war room)' },
      },
    },
  })) !== true) {
    throw new Error('hasOpenapiClassicPanel true');
  }
  if (hasOpenapiClassicPanel(JSON.stringify({
    paths: { '/verify.html': { get: { summary: 'verify' } } },
  })) !== false) {
    throw new Error('hasOpenapiClassicPanel false');
  }
  if (hasApiIndexClassicPanel(JSON.stringify({
    agents: { classic: 'https://siren.watch/classic.html' },
    endpoints: { classic: 'https://siren.watch/classic.html' },
  })) !== true) {
    throw new Error('hasApiIndexClassicPanel true');
  }
  if (hasApiIndexClassicPanel(JSON.stringify({
    agents: { entry: 'https://siren.watch/agents.md' },
  })) !== false) {
    throw new Error('hasApiIndexClassicPanel false');
  }
  const agentsJsonGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      agents_json_classic_panel: false,
      openapi_classic_panel: true,
      api_index_classic_panel: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!agentsJsonGaps.some((g) => g.id === 'agents-json-classic-panel-missing')) {
    throw new Error('agents-json-classic-panel-missing gap');
  }
  if (hasFreeToolsClassicPanel('<a href="/classic.html">Where is the full SIREN instrument panel?</a>') !== true) {
    throw new Error('hasFreeToolsClassicPanel true');
  }
  if (hasFreeToolsClassicPanel('/classic.html alone') !== false) {
    throw new Error('hasFreeToolsClassicPanel false without question');
  }
  const freeToolsGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      freetools_classic_panel: false,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!freeToolsGaps.some((g) => g.id === 'freetools-classic-panel-missing')) {
    throw new Error('freetools-classic-panel-missing gap');
  }
  if (hasFreeToolsDualHeadTerm('AI activity index today · AI activity level today · SIREN') !== true) {
    throw new Error('hasFreeToolsDualHeadTerm true');
  }
  if (hasFreeToolsDualHeadTerm('AI activity index today · SIREN') !== false) {
    throw new Error('hasFreeToolsDualHeadTerm false for index-only');
  }
  const freeToolsDualGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      freetools_dual_head_term: false,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!freeToolsDualGaps.some((g) => g.id === 'freetools-dual-head-term-missing')) {
    throw new Error('freetools-dual-head-term-missing gap');
  }
  if (hasVerifyDualHeadTerm('AI activity index today · AI activity level today · SIREN') !== true) {
    throw new Error('hasVerifyDualHeadTerm true');
  }
  if (hasVerifyDualHeadTerm('AI activity index today · SIREN') !== false) {
    throw new Error('hasVerifyDualHeadTerm false for index-only');
  }
  const verifyDualGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      verify_dual_head_term: false,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!verifyDualGaps.some((g) => g.id === 'verify-dual-head-term-missing')) {
    throw new Error('verify-dual-head-term-missing gap');
  }
  if (hasCompareDualHeadTerm('AI activity index today · AI activity level today · SIREN') !== true) {
    throw new Error('hasCompareDualHeadTerm true');
  }
  if (hasCompareDualHeadTerm('AI activity index today · SIREN') !== false) {
    throw new Error('hasCompareDualHeadTerm false for index-only');
  }
  if (hasAlternativesDualHeadTerm('AI activity index today · AI activity level today · SIREN') !== true) {
    throw new Error('hasAlternativesDualHeadTerm true');
  }
  if (hasAlternativesDualHeadTerm('AI activity index today · SIREN') !== false) {
    throw new Error('hasAlternativesDualHeadTerm false for index-only');
  }
  const compareDualGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      compare_dual_head_term: false,
      alternatives_dual_head_term: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!compareDualGaps.some((g) => g.id === 'compare-dual-head-term-missing')) {
    throw new Error('compare-dual-head-term-missing gap');
  }
  if (hasPdoomDualHeadTerm('AI activity index today · AI activity level today · SIREN') !== true) {
    throw new Error('hasPdoomDualHeadTerm true');
  }
  if (hasPdoomDualHeadTerm('AI activity index today · SIREN') !== false) {
    throw new Error('hasPdoomDualHeadTerm false for index-only');
  }
  if (hasAiDoomsdayClockDualHeadTerm('AI activity index today · AI activity level today · SIREN') !== true) {
    throw new Error('hasAiDoomsdayClockDualHeadTerm true');
  }
  if (hasAiDoomsdayClockDualHeadTerm('AI activity index today · SIREN') !== false) {
    throw new Error('hasAiDoomsdayClockDualHeadTerm false for index-only');
  }
  const pdoomDualGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      pdoom_dual_head_term: false,
      ai_doomsday_clock_dual_head_term: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!pdoomDualGaps.some((g) => g.id === 'pdoom-dual-head-term-missing')) {
    throw new Error('pdoom-dual-head-term-missing gap');
  }
  if (hasGuideDualHeadTerm('AI activity index today · AI activity level today · SIREN') !== true) {
    throw new Error('hasGuideDualHeadTerm true');
  }
  if (hasGuideDualHeadTerm('AI activity index today · SIREN') !== false) {
    throw new Error('hasGuideDualHeadTerm false for index-only');
  }
  if (hasGuidesDualHeadTerm('AI activity index today · AI activity level today · SIREN') !== true) {
    throw new Error('hasGuidesDualHeadTerm true');
  }
  if (hasGuidesDualHeadTerm('AI activity index today · SIREN') !== false) {
    throw new Error('hasGuidesDualHeadTerm false for index-only');
  }
  const guideDualGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      guide_dual_head_term: false,
      guides_dual_head_term: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!guideDualGaps.some((g) => g.id === 'guide-dual-head-term-missing')) {
    throw new Error('guide-dual-head-term-missing gap');
  }
  if (hasBetsDualHeadTerm('AI activity index today · AI activity level today · SIREN') !== true) {
    throw new Error('hasBetsDualHeadTerm true');
  }
  if (hasBetsDualHeadTerm('AI activity index today · SIREN') !== false) {
    throw new Error('hasBetsDualHeadTerm false for index-only');
  }
  if (hasBalanceDualHeadTerm('AI activity index today · AI activity level today · SIREN') !== true) {
    throw new Error('hasBalanceDualHeadTerm true');
  }
  if (hasBalanceDualHeadTerm('AI activity index today · SIREN') !== false) {
    throw new Error('hasBalanceDualHeadTerm false for index-only');
  }
  if (hasSelfAwareDualHeadTerm('AI activity index today · AI activity level today · SIREN') !== true) {
    throw new Error('hasSelfAwareDualHeadTerm true');
  }
  if (hasSelfAwareDualHeadTerm('AI activity index today · SIREN') !== false) {
    throw new Error('hasSelfAwareDualHeadTerm false for index-only');
  }
  const deskDualGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      bets_dual_head_term: false,
      balance_dual_head_term: true,
      self_aware_dual_head_term: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!deskDualGaps.some((g) => g.id === 'desk-dual-head-term-missing')) {
    throw new Error('desk-dual-head-term-missing gap');
  }
  if (hasVideosDualHeadTerm('AI activity index today · AI activity level today · SIREN') !== true) {
    throw new Error('hasVideosDualHeadTerm true');
  }
  if (hasVideosDualHeadTerm('AI activity index today · SIREN') !== false) {
    throw new Error('hasVideosDualHeadTerm false for index-only');
  }
  const videosDualGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      videos_dual_head_term: false,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!videosDualGaps.some((g) => g.id === 'videos-dual-head-term-missing')) {
    throw new Error('videos-dual-head-term-missing gap');
  }
  if (hasMuseSparkDualHeadTerm('AI activity index today · AI activity level today · SIREN') !== true) {
    throw new Error('hasMuseSparkDualHeadTerm true');
  }
  if (hasMuseSparkDualHeadTerm('AI activity index today · SIREN') !== false) {
    throw new Error('hasMuseSparkDualHeadTerm false for index-only');
  }
  if (hasFableDualHeadTerm('AI activity index today · AI activity level today · SIREN') !== true) {
    throw new Error('hasFableDualHeadTerm true');
  }
  if (hasFableDualHeadTerm('AI activity index today · SIREN') !== false) {
    throw new Error('hasFableDualHeadTerm false for index-only');
  }
  const modelDualGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      muse_spark_dual_head_term: false,
      fable_dual_head_term: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!modelDualGaps.some((g) => g.id === 'model-dual-head-term-missing')) {
    throw new Error('model-dual-head-term-missing gap');
  }
  if (hasPillarComputeDualHeadTerm('AI activity index today · AI activity level today · SIREN') !== true) {
    throw new Error('hasPillarComputeDualHeadTerm true');
  }
  if (hasPillarComputeDualHeadTerm('AI activity index today · SIREN') !== false) {
    throw new Error('hasPillarComputeDualHeadTerm false for index-only');
  }
  if (hasPillarAttentionDualHeadTerm('AI activity index today · AI activity level today · SIREN') !== true) {
    throw new Error('hasPillarAttentionDualHeadTerm true');
  }
  if (hasPillarAttentionDualHeadTerm('AI activity index today · SIREN') !== false) {
    throw new Error('hasPillarAttentionDualHeadTerm false for index-only');
  }
  const pillarDualGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      pillar_compute_dual_head_term: false,
      pillar_attention_dual_head_term: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!pillarDualGaps.some((g) => g.id === 'pillar-dual-head-term-missing')) {
    throw new Error('pillar-dual-head-term-missing gap');
  }
  if (hasBlissDualHeadTerm('AI activity index today · AI activity level today · SIREN') !== true) {
    throw new Error('hasBlissDualHeadTerm true');
  }
  if (hasBlissDualHeadTerm('AI activity index today · SIREN') !== false) {
    throw new Error('hasBlissDualHeadTerm false for index-only');
  }
  const blissDualGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      bliss_dual_head_term: false,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!blissDualGaps.some((g) => g.id === 'bliss-dual-head-term-missing')) {
    throw new Error('bliss-dual-head-term-missing gap');
  }
  if (hasPressDualHeadTerm('AI activity index today · AI activity level today · SIREN') !== true) {
    throw new Error('hasPressDualHeadTerm true');
  }
  if (hasPressDualHeadTerm('AI activity index today · SIREN') !== false) {
    throw new Error('hasPressDualHeadTerm false for index-only');
  }
  const pressDualGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      press_dual_head_term: false,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!pressDualGaps.some((g) => g.id === 'press-dual-head-term-missing')) {
    throw new Error('press-dual-head-term-missing gap');
  }
  if (hasMovesDualHeadTerm('AI activity index today · AI activity level today · SIREN') !== true) {
    throw new Error('hasMovesDualHeadTerm true');
  }
  if (hasMovesDualHeadTerm('AI activity index today · SIREN') !== false) {
    throw new Error('hasMovesDualHeadTerm false for index-only');
  }
  const movesDualGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      moves_dual_head_term: false,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!movesDualGaps.some((g) => g.id === 'moves-dual-head-term-missing')) {
    throw new Error('moves-dual-head-term-missing gap');
  }
  if (hasNotFoundDualHeadTerm('AI activity index today · AI activity level today · SIREN') !== true) {
    throw new Error('hasNotFoundDualHeadTerm true');
  }
  if (hasNotFoundDualHeadTerm('AI activity index today · SIREN') !== false) {
    throw new Error('hasNotFoundDualHeadTerm false for index-only');
  }
  if (hasServerErrorDualHeadTerm('AI activity index today · AI activity level today · SIREN') !== true) {
    throw new Error('hasServerErrorDualHeadTerm true');
  }
  if (hasServerErrorDualHeadTerm('AI activity index today · SIREN') !== false) {
    throw new Error('hasServerErrorDualHeadTerm false for index-only');
  }
  const errorDualGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      not_found_dual_head_term: false,
      server_error_dual_head_term: false,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!errorDualGaps.some((g) => g.id === 'error-dual-head-term-missing')) {
    throw new Error('error-dual-head-term-missing gap');
  }
  if (hasKindPressCrumbDualHeadTerm('AI activity index today · AI activity level today · SIREN') !== true) {
    throw new Error('hasKindPressCrumbDualHeadTerm true');
  }
  if (hasKindPressCrumbDualHeadTerm('AI activity index today · SIREN') !== false) {
    throw new Error('hasKindPressCrumbDualHeadTerm false for index-only');
  }
  const crumbDualGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      kind_press_crumb_dual_head_term: false,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!crumbDualGaps.some((g) => g.id === 'crumb-dual-head-term-missing')) {
    throw new Error('crumb-dual-head-term-missing gap');
  }
  const footDualOk = '<ul id="foot-pages"><li><a href="/">AI activity index today · AI activity level today · SIREN</a></li></ul>';
  const footDualIndexOnly = '<ul id="foot-pages"><li><a href="/">AI activity index today · SIREN</a></li></ul>';
  const footDualCrumbOnly = 'AI activity index today · AI activity level today · SIREN'
    + '<ul id="foot-pages"><li><a href="/">AI activity index today · SIREN</a></li></ul>';
  if (hasFooterSectionsDualHeadTerm(footDualOk) !== true) {
    throw new Error('hasFooterSectionsDualHeadTerm true');
  }
  if (hasFooterSectionsDualHeadTerm(footDualIndexOnly) !== false) {
    throw new Error('hasFooterSectionsDualHeadTerm false for index-only');
  }
  if (hasFooterSectionsDualHeadTerm(footDualCrumbOnly) !== false) {
    throw new Error('hasFooterSectionsDualHeadTerm false when only crumb is dual');
  }
  const sectionsDualGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      footer_sections_dual_head_term: false,
      footer_sections_press_dual: true,
      footer_sections_jobs_dual: false,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!sectionsDualGaps.some((g) => g.id === 'sections-dual-head-term-missing')) {
    throw new Error('sections-dual-head-term-missing gap');
  }
  if (!String(sectionsDualGaps.find((g) => g.id === 'sections-dual-head-term-missing').text)
    .includes('jobs.html')) {
    throw new Error('sections-dual-head-term-missing should name jobs.html');
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
  const trendsGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      sitemap_tips: true, news_sitemap_tips: true,
      feed_tips: true, feed_level_tips: true,
      robots_tips: true,
      now_md_tips: true, now_txt_tips: true,
      agents_vs_aliases: true, llms_vs_aliases: true,
      agents_trends_alias: false, llms_trends_alias: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!trendsGaps.some((g) => g.id === 'agents-trends-alias-missing')) {
    throw new Error('agents-trends-alias-missing gap');
  }
  if (hasPdoomShortAlias('short /pdoom.html') !== true) throw new Error('hasPdoomShortAlias true');
  if (hasPdoomShortAlias('/p-doom.html only') !== false) throw new Error('hasPdoomShortAlias false');
  // FINDABILITY #135 — /vs/pdoom.html must not satisfy the short-alias probe.
  if (hasPdoomShortAlias('/vs/pdoom.html only') !== false) {
    throw new Error('hasPdoomShortAlias vs-false-positive');
  }
  if (hasPdoomShortAlias('/vs/pdoom.html\nshort /pdoom.html') !== true) {
    throw new Error('hasPdoomShortAlias with both');
  }
  const pdoomGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      agents_pdoom_alias: false, llms_pdoom_alias: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!pdoomGaps.some((g) => g.id === 'agents-pdoom-alias-missing')) {
    throw new Error('agents-pdoom-alias-missing gap');
  }
  if (hasRootRivalAliases(ROOT_RIVAL_AGENT_ALIASES.join('\n')) !== true) {
    throw new Error('hasRootRivalAliases true');
  }
  if (hasRootRivalAliases('/doombench.html\n/pizzint.html') !== false) {
    throw new Error('hasRootRivalAliases false');
  }
  // FINDABILITY #135 — /vs/<brand>.html must not satisfy root rival probes.
  if (hasRootRivalAliases([
    '/vs/doombench.html', '/vs/skynet-countdown.html',
    '/vs/pizzint.html', '/vs/takeofftracker.html',
  ].join('\n')) !== false) {
    throw new Error('hasRootRivalAliases vs-false-positive');
  }
  const rootGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      agents_root_rivals: false, llms_root_rivals: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!rootGaps.some((g) => g.id === 'agents-root-rivals-missing')) {
    throw new Error('agents-root-rivals-missing gap');
  }
  if (hasHeadTermAliases(HEAD_TERM_AGENT_ALIASES.join('\n')) !== true) {
    throw new Error('hasHeadTermAliases true');
  }
  if (hasHeadTermAliases('/doomsday-clock.html\n/ai-doom.html') !== false) {
    throw new Error('hasHeadTermAliases false');
  }
  const headGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      agents_head_aliases: false, llms_head_aliases: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!headGaps.some((g) => g.id === 'agents-head-aliases-missing')) {
    throw new Error('agents-head-aliases-missing gap');
  }
  if (hasLabAboutLabels('OpenAI / ChatGPT\n/lab/openai.html') !== true) {
    throw new Error('hasLabAboutLabels true');
  }
  if (hasLabAboutLabels('What has SIREN scored about OpenAI?\n/lab/openai.html') !== false) {
    throw new Error('hasLabAboutLabels false');
  }
  if (hasLabAboutLabels('agents.md has no lab URLs') !== true) {
    throw new Error('hasLabAboutLabels skip when no lab URL');
  }
  const labLabelGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      llms_lab_about_labels: false,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!labLabelGaps.some((g) => g.id === 'agents-lab-labels-missing')) {
    throw new Error('agents-lab-labels-missing gap');
  }
  const hubByUrl = new Map([
    ['https://siren.watch/lab/', {
      ok: true,
      value: '<a href="/lab/openai.html">What has SIREN scored about OpenAI?</a>',
    }],
    ['https://siren.watch/companies.html', {
      ok: true,
      value: '<a href="/lab/openai.html">What has SIREN scored about OpenAI / ChatGPT?</a>',
    }],
  ]);
  const hubLags = labHubLabelLags(hubByUrl);
  if (!hubLags.some((r) => r.path === '/lab/' && r.needle === 'OpenAI / ChatGPT')) {
    throw new Error('labHubLabelLags /lab/');
  }
  if (hubLags.some((r) => r.path === '/companies.html')) {
    throw new Error('labHubLabelLags companies false positive');
  }
  const hubGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      lab_hub_label_lags: hubLags,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!hubGaps.some((g) => g.id === 'lab-hub-labels-missing')) {
    throw new Error('lab-hub-labels-missing gap');
  }
  if (hasHomeLabAboutLabels('OpenAI / ChatGPT in knowsAbout') !== true) {
    throw new Error('hasHomeLabAboutLabels true');
  }
  if (hasHomeLabAboutLabels('What has SIREN scored about OpenAI') !== false) {
    throw new Error('hasHomeLabAboutLabels false');
  }
  const homeKaGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      home_lab_about_labels: false,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!homeKaGaps.some((g) => g.id === 'home-knowsabout-labels-missing')) {
    throw new Error('home-knowsabout-labels-missing gap');
  }
  if (hasHomeDoombenchConquest('SIREN vs DoomBench: which should you use?') !== true) {
    throw new Error('hasHomeDoombenchConquest true');
  }
  if (hasHomeDoombenchConquest('SIREN vs PizzINT: which should you use?') !== false) {
    throw new Error('hasHomeDoombenchConquest false');
  }
  const homeDoomGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      home_doombench_conquest: false,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!homeDoomGaps.some((g) => g.id === 'home-doombench-conquest-missing')) {
    throw new Error('home-doombench-conquest-missing gap');
  }
  if (hasHomeSkynetConquest('SIREN vs Skynet Countdown: which should you use?') !== true) {
    throw new Error('hasHomeSkynetConquest true');
  }
  if (hasHomeSkynetConquest('SIREN vs DoomBench: which should you use?') !== false) {
    throw new Error('hasHomeSkynetConquest false');
  }
  const homeSkynetGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      home_skynet_conquest: false,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!homeSkynetGaps.some((g) => g.id === 'home-skynet-conquest-missing')) {
    throw new Error('home-skynet-conquest-missing gap');
  }
  if (hasHomePizzintConquest('SIREN vs PizzINT: which should you use?') !== true) {
    throw new Error('hasHomePizzintConquest true');
  }
  if (hasHomePizzintConquest('SIREN vs DoomBench: which should you use?') !== false) {
    throw new Error('hasHomePizzintConquest false');
  }
  const homePizzGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      home_pizzint_conquest: false,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!homePizzGaps.some((g) => g.id === 'home-pizzint-conquest-missing')) {
    throw new Error('home-pizzint-conquest-missing gap');
  }
  if (hasHomeTakeoffConquest('SIREN vs Takeoff Tracker: which should you use?') !== true) {
    throw new Error('hasHomeTakeoffConquest true');
  }
  if (hasHomeTakeoffConquest('SIREN vs PizzINT: which should you use?') !== false) {
    throw new Error('hasHomeTakeoffConquest false');
  }
  const homeTakeoffGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      home_takeoff_conquest: false,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!homeTakeoffGaps.some((g) => g.id === 'home-takeoff-conquest-missing')) {
    throw new Error('home-takeoff-conquest-missing gap');
  }
  if (hasHomeActivityIndexFaq('What is an AI activity index?') !== true) {
    throw new Error('hasHomeActivityIndexFaq true');
  }
  if (hasHomeActivityIndexFaq('What is the AI activity level today?') !== false) {
    throw new Error('hasHomeActivityIndexFaq false');
  }
  const homeFaqGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      home_activity_index_faq: false,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!homeFaqGaps.some((g) => g.id === 'home-activity-index-faq-missing')) {
    throw new Error('home-activity-index-faq-missing gap');
  }
  if (hasHomeActivityIndexTodayFaq('What is the AI activity index today?') !== true) {
    throw new Error('hasHomeActivityIndexTodayFaq true');
  }
  if (hasHomeActivityIndexTodayFaq('What is an AI activity index?') !== false) {
    throw new Error('hasHomeActivityIndexTodayFaq false');
  }
  const homeIndexTodayFaqGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      home_activity_index_today_faq: false,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!homeIndexTodayFaqGaps.some((g) => g.id === 'home-activity-index-today-faq-missing')) {
    throw new Error('home-activity-index-today-faq-missing gap');
  }
  if (hasHomeActivityLevelFaqAlias('/ai-activity-level.html is a short alias') !== true) {
    throw new Error('hasHomeActivityLevelFaqAlias true');
  }
  if (hasHomeActivityLevelFaqAlias('What is the AI activity level today?') !== false) {
    throw new Error('hasHomeActivityLevelFaqAlias false');
  }
  const homeLevelFaqGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      home_activity_level_faq_alias: false,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!homeLevelFaqGaps.some((g) => g.id === 'home-activity-level-faq-alias-missing')) {
    throw new Error('home-activity-level-faq-alias-missing gap');
  }
  // FINDABILITY #296 — dual head-term <title> middot form.
  if (hasHomeActivityLevelTitle('<title>AI activity index today · AI activity level today · SIREN 4</title>') !== true) {
    throw new Error('hasHomeActivityLevelTitle true');
  }
  if (hasHomeActivityLevelTitle('<title>AI activity index today · SIREN 4</title>') !== false) {
    throw new Error('hasHomeActivityLevelTitle false on index-only title');
  }
  if (hasHomeActivityLevelTitle('<meta name="description" content="AI activity level today: SIREN 4">') !== false) {
    throw new Error('hasHomeActivityLevelTitle must ignore description colon form');
  }
  const homeLevelTitleGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      home_activity_level_title: false,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!homeLevelTitleGaps.some((g) => g.id === 'home-activity-level-title-missing')) {
    throw new Error('home-activity-level-title-missing gap');
  }
  // FINDABILITY #308 — H1 .v2-sr dual head terms.
  if (hasHomeActivityH1HeadTerms(
    '<h1><span class="v2-sr">AI activity index today · AI activity level today · AI SIREN INDEX</span></h1>',
  ) !== true) {
    throw new Error('hasHomeActivityH1HeadTerms true');
  }
  if (hasHomeActivityH1HeadTerms('<h1><span class="v2-sr">AI SIREN INDEX</span></h1>') !== false) {
    throw new Error('hasHomeActivityH1HeadTerms false on brand-only H1');
  }
  const homeH1Gaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · AI activity level today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      home_activity_h1_head_terms: false,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!homeH1Gaps.some((g) => g.id === 'home-activity-h1-head-terms-missing')) {
    throw new Error('home-activity-h1-head-terms-missing gap');
  }
  // FINDABILITY #312/#314/#316 — <title> drops level_name + decimal score.
  if (hasHomeTitleTrimmed(
    '<title>AI activity index today · AI activity level today · SIREN 4</title>',
  ) !== true) {
    throw new Error('hasHomeTitleTrimmed true');
  }
  if (hasHomeTitleTrimmed(
    '<title>AI activity index today · AI activity level today · SIREN 4 ROUTINE · 48.3</title>',
  ) !== false) {
    throw new Error('hasHomeTitleTrimmed false when ROUTINE in title');
  }
  if (hasHomeTitleTrimmed(
    '<title>AI activity index today · AI activity level today · SIREN 4 · 48.3</title>',
  ) !== false) {
    throw new Error('hasHomeTitleTrimmed false when score remains in title');
  }
  if (hasHomeTitleTrimmed('<title>AI activity index today · SIREN 4</title>') !== false) {
    throw new Error('hasHomeTitleTrimmed false when level-today middot missing');
  }
  const homeTitleTrimGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · AI activity level today · SIREN 4 ROUTINE · 48.3',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      home_activity_title_trim: false,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!homeTitleTrimGaps.some((g) => g.id === 'home-activity-title-trim-missing')) {
    throw new Error('home-activity-title-trim-missing gap');
  }
  // FINDABILITY #318 — classic panel title + own canonical.
  if (hasClassicPanel(
    `<title>${CLASSIC_PANEL_TITLE_NEEDLE} · SIREN</title><link ${CLASSIC_PANEL_CANONICAL_NEEDLE} />`,
  ) !== true) {
    throw new Error('hasClassicPanel true');
  }
  if (hasClassicPanel(
    '<title>AI activity index today · AI activity level today · SIREN 4</title>'
    + '<link rel="canonical" href="https://siren.watch/">',
  ) !== false) {
    throw new Error('hasClassicPanel false when home title/canonical');
  }
  const classicPanelGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · AI activity level today · SIREN 4',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      classic_panel: false,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!classicPanelGaps.some((g) => g.id === 'classic-panel-missing')) {
    throw new Error('classic-panel-missing gap');
  }
  // FINDABILITY #322 — sitemap must list /classic.html.
  if (hasClassicSitemapLoc('<url><loc>https://siren.watch/classic.html</loc></url>') !== true) {
    throw new Error('hasClassicSitemapLoc true');
  }
  if (hasClassicSitemapLoc('<url><loc>https://siren.watch/</loc></url>') !== false) {
    throw new Error('hasClassicSitemapLoc false');
  }
  const classicSitemapGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · AI activity level today · SIREN 4',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      classic_sitemap: false,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!classicSitemapGaps.some((g) => g.id === 'classic-sitemap-missing')) {
    throw new Error('classic-sitemap-missing gap');
  }
  if (hasRaceLabAboutLabels('<a href="/lab/openai.html">What has SIREN scored about OpenAI / ChatGPT?</a>') !== true) {
    throw new Error('hasRaceLabAboutLabels true');
  }
  if (hasRaceLabAboutLabels('<a href="/lab/openai.html">What has SIREN scored about OpenAI?</a>') !== false) {
    throw new Error('hasRaceLabAboutLabels false');
  }
  if (hasRaceLabAboutLabels('race page without lab urls') !== true) {
    throw new Error('hasRaceLabAboutLabels skip when no lab URL');
  }
  const raceLabelGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      race_lab_about_labels: false,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!raceLabelGaps.some((g) => g.id === 'race-lab-labels-missing')) {
    throw new Error('race-lab-labels-missing gap');
  }
  if (hasWattsIrenFaq(WATTS_IREN_FAQ_NEEDLE) !== true) {
    throw new Error('hasWattsIrenFaq true');
  }
  if (hasWattsIrenFaq('What does the SIREN infrastructure index read?') !== false) {
    throw new Error('hasWattsIrenFaq false');
  }
  if (hasAgentsIrenWatts('IREN stock → https://siren.watch/watts.html') !== true) {
    throw new Error('hasAgentsIrenWatts true');
  }
  if (hasAgentsIrenWatts('https://siren.watch/watts.html only') !== false) {
    throw new Error('hasAgentsIrenWatts needs IREN needle');
  }
  const irenGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      watts_iren_faq: false,
      agents_iren_watts: false,
      llms_iren_watts: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!irenGaps.some((g) => g.id === 'watts-iren-faq-missing')) {
    throw new Error('watts-iren-faq-missing gap');
  }
  if (!irenGaps.some((g) => g.id === 'agents-iren-watts-missing')) {
    throw new Error('agents-iren-watts-missing gap');
  }
  if (hasMicronDramFaq(MICRON_DRAM_FAQ_NEEDLE) !== true) {
    throw new Error('hasMicronDramFaq true');
  }
  if (hasMicronDramFaq('What has SIREN scored about Micron / MU?') !== false) {
    throw new Error('hasMicronDramFaq false');
  }
  if (hasAgentsMicronDram('dram stock → https://siren.watch/lab/micron.html') !== true) {
    throw new Error('hasAgentsMicronDram true');
  }
  if (hasAgentsMicronDram('https://siren.watch/lab/micron.html only') !== false) {
    throw new Error('hasAgentsMicronDram needs dram needle');
  }
  const micronGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      micron_dram_faq: false,
      agents_micron_dram: false,
      llms_micron_dram: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!micronGaps.some((g) => g.id === 'micron-dram-faq-missing')) {
    throw new Error('micron-dram-faq-missing gap');
  }
  if (!micronGaps.some((g) => g.id === 'agents-micron-dram-missing')) {
    throw new Error('agents-micron-dram-missing gap');
  }
  if (hasCoreweaveStockFaq(COREWEAVE_STOCK_FAQ_NEEDLE) !== true) {
    throw new Error('hasCoreweaveStockFaq true');
  }
  if (hasCoreweaveStockFaq('What has SIREN scored about CoreWeave?') !== false) {
    throw new Error('hasCoreweaveStockFaq false');
  }
  if (hasCoreweaveDebtFaq(COREWEAVE_DEBT_FAQ_NEEDLE) !== true) {
    throw new Error('hasCoreweaveDebtFaq true');
  }
  if (hasCoreweaveDebtFaq(COREWEAVE_STOCK_FAQ_NEEDLE) !== false) {
    throw new Error('hasCoreweaveDebtFaq false');
  }
  if (hasAgentsCoreweave('CRWV Trends → https://siren.watch/lab/coreweave.html') !== true) {
    throw new Error('hasAgentsCoreweave true');
  }
  if (hasAgentsCoreweave('https://siren.watch/lab/coreweave.html only') !== false) {
    throw new Error('hasAgentsCoreweave needs CRWV needle');
  }
  const cwGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      coreweave_stock_faq: false,
      coreweave_debt_faq: false,
      agents_coreweave: false,
      llms_coreweave: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!cwGaps.some((g) => g.id === 'coreweave-stock-faq-missing')) {
    throw new Error('coreweave-stock-faq-missing gap');
  }
  if (!cwGaps.some((g) => g.id === 'coreweave-debt-faq-missing')) {
    throw new Error('coreweave-debt-faq-missing gap');
  }
  if (!cwGaps.some((g) => g.id === 'agents-coreweave-missing')) {
    throw new Error('agents-coreweave-missing gap');
  }
  if (!OUR_SURFACES.includes('/lab/coreweave.html')) {
    throw new Error('OUR_SURFACES missing /lab/coreweave.html');
  }
  if (hasNeocloudFaq(NEOCLOUD_FAQ_NEEDLE) !== true) {
    throw new Error('hasNeocloudFaq true');
  }
  if (hasNeocloudFaq('What has SIREN scored about Neoclouds?') !== false) {
    throw new Error('hasNeocloudFaq false');
  }
  if (hasAgentsNeocloud('neoclouds Trends → https://siren.watch/tags/neoclouds.html') !== true) {
    throw new Error('hasAgentsNeocloud true');
  }
  if (hasAgentsNeocloud('https://siren.watch/tags/neoclouds.html only') !== false) {
    throw new Error('hasAgentsNeocloud needs neoclouds needle');
  }
  const neoGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      neocloud_faq: false,
      agents_neocloud: false,
      llms_neocloud: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!neoGaps.some((g) => g.id === 'neocloud-faq-missing')) {
    throw new Error('neocloud-faq-missing gap');
  }
  if (!neoGaps.some((g) => g.id === 'agents-neocloud-missing')) {
    throw new Error('agents-neocloud-missing gap');
  }
  if (!OUR_SURFACES.includes('/tags/neoclouds.html')) {
    throw new Error('OUR_SURFACES missing /tags/neoclouds.html');
  }
  if (hasNvidiaNvdaFaq(NVIDIA_NVDA_FAQ_NEEDLE) !== true) {
    throw new Error('hasNvidiaNvdaFaq true');
  }
  if (hasNvidiaNvdaFaq('What has SIREN scored about NVIDIA?') !== false) {
    throw new Error('hasNvidiaNvdaFaq false');
  }
  if (hasAgentsNvidia('NVDA Trends → https://siren.watch/lab/nvidia.html') !== true) {
    throw new Error('hasAgentsNvidia true');
  }
  if (hasAgentsNvidia('https://siren.watch/lab/nvidia.html only') !== false) {
    throw new Error('hasAgentsNvidia needs NVDA needle');
  }
  const nvGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      nvidia_nvda_faq: false,
      agents_nvidia: false,
      llms_nvidia: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!nvGaps.some((g) => g.id === 'nvidia-nvda-faq-missing')) {
    throw new Error('nvidia-nvda-faq-missing gap');
  }
  if (!nvGaps.some((g) => g.id === 'agents-nvidia-missing')) {
    throw new Error('agents-nvidia-missing gap');
  }
  if (!OUR_SURFACES.includes('/lab/nvidia.html')) {
    throw new Error('OUR_SURFACES missing /lab/nvidia.html');
  }
  if (!NEWS_LAB_ALIAS_PROBES.some((p) => p.alias === 'NVDA')) {
    throw new Error('NEWS_LAB_ALIAS_PROBES missing NVDA');
  }
  if (hasOpenaiLawsuitFaq(OPENAI_LAWSUIT_FAQ_NEEDLE) !== true) {
    throw new Error('hasOpenaiLawsuitFaq true');
  }
  if (hasOpenaiLawsuitFaq('What has SIREN scored about OpenAI / ChatGPT?') !== false) {
    throw new Error('hasOpenaiLawsuitFaq false');
  }
  if (hasAgentsOpenaiLawsuit('OpenAI lawsuit → https://siren.watch/lab/openai.html') !== true) {
    throw new Error('hasAgentsOpenaiLawsuit true');
  }
  if (hasAgentsOpenaiLawsuit('https://siren.watch/lab/openai.html only') !== false) {
    throw new Error('hasAgentsOpenaiLawsuit needs lawsuit needle');
  }
  const oaiGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      openai_lawsuit_faq: false,
      agents_openai_lawsuit: false,
      llms_openai_lawsuit: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!oaiGaps.some((g) => g.id === 'openai-lawsuit-faq-missing')) {
    throw new Error('openai-lawsuit-faq-missing gap');
  }
  if (!oaiGaps.some((g) => g.id === 'agents-openai-lawsuit-missing')) {
    throw new Error('agents-openai-lawsuit-missing gap');
  }
  if (!OUR_SURFACES.includes('/lab/openai.html')) {
    throw new Error('OUR_SURFACES missing /lab/openai.html');
  }
  if (hasAnthropicIpoFaq(ANTHROPIC_IPO_FAQ_NEEDLE) !== true) {
    throw new Error('hasAnthropicIpoFaq true');
  }
  if (hasAnthropicIpoFaq('What has SIREN scored about Anthropic / Claude?') !== false) {
    throw new Error('hasAnthropicIpoFaq false');
  }
  if (hasAgentsAnthropicIpo('Anthropic IPO → https://siren.watch/lab/anthropic.html') !== true) {
    throw new Error('hasAgentsAnthropicIpo true');
  }
  if (hasAgentsAnthropicIpo('https://siren.watch/lab/anthropic.html only') !== false) {
    throw new Error('hasAgentsAnthropicIpo needs IPO needle');
  }
  const antGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      anthropic_ipo_faq: false,
      agents_anthropic_ipo: false,
      llms_anthropic_ipo: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!antGaps.some((g) => g.id === 'anthropic-ipo-faq-missing')) {
    throw new Error('anthropic-ipo-faq-missing gap');
  }
  if (!antGaps.some((g) => g.id === 'agents-anthropic-ipo-missing')) {
    throw new Error('agents-anthropic-ipo-missing gap');
  }
  if (!OUR_SURFACES.includes('/lab/anthropic.html')) {
    throw new Error('OUR_SURFACES missing /lab/anthropic.html');
  }
  // FINDABILITY #362 — Anthropic AI safety bill FAQ + agent maps.
  if (hasAnthropicAiSafetyBillFaq(ANTHROPIC_AI_SAFETY_BILL_FAQ_NEEDLE) !== true) {
    throw new Error('hasAnthropicAiSafetyBillFaq true');
  }
  if (hasAnthropicAiSafetyBillFaq('Why does SIREN watch Anthropic IPO and FTC probes?') !== false) {
    throw new Error('hasAnthropicAiSafetyBillFaq false');
  }
  if (hasAgentsAnthropicAiSafetyBill('AI safety bill → https://siren.watch/lab/anthropic.html') !== true) {
    throw new Error('hasAgentsAnthropicAiSafetyBill true');
  }
  if (hasAgentsAnthropicAiSafetyBill('https://siren.watch/lab/anthropic.html only') !== false) {
    throw new Error('hasAgentsAnthropicAiSafetyBill needs AI safety bill needle');
  }
  const billGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      anthropic_ai_safety_bill_faq: false,
      agents_anthropic_ai_safety_bill: false,
      llms_anthropic_ai_safety_bill: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!billGaps.some((g) => g.id === 'anthropic-ai-safety-bill-faq-missing')) {
    throw new Error('anthropic-ai-safety-bill-faq-missing gap');
  }
  if (!billGaps.some((g) => g.id === 'agents-anthropic-ai-safety-bill-missing')) {
    throw new Error('agents-anthropic-ai-safety-bill-missing gap');
  }
  // FINDABILITY #368 — Anthropic Canadian data-centre FAQ + agent maps.
  if (hasAnthropicCanadaDcFaq(ANTHROPIC_CANADA_DC_FAQ_NEEDLE) !== true) {
    throw new Error('hasAnthropicCanadaDcFaq true');
  }
  if (hasAnthropicCanadaDcFaq('Why does SIREN watch Anthropic AI safety bill pitches?') !== false) {
    throw new Error('hasAnthropicCanadaDcFaq false');
  }
  if (hasAgentsAnthropicCanadaDc('Canadian data → https://siren.watch/lab/anthropic.html') !== true) {
    throw new Error('hasAgentsAnthropicCanadaDc true');
  }
  if (hasAgentsAnthropicCanadaDc('https://siren.watch/lab/anthropic.html only') !== false) {
    throw new Error('hasAgentsAnthropicCanadaDc needs Canadian data needle');
  }
  const canadaDcGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      anthropic_canada_dc_faq: false,
      agents_anthropic_canada_dc: false,
      llms_anthropic_canada_dc: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!canadaDcGaps.some((g) => g.id === 'anthropic-canada-dc-faq-missing')) {
    throw new Error('anthropic-canada-dc-faq-missing gap');
  }
  if (!canadaDcGaps.some((g) => g.id === 'agents-anthropic-canada-dc-missing')) {
    throw new Error('agents-anthropic-canada-dc-missing gap');
  }
  // FINDABILITY #392 — Anthropic METR evaluator FAQ + agent maps.
  if (hasAnthropicMetrFaq(ANTHROPIC_METR_FAQ_NEEDLE) !== true) {
    throw new Error('hasAnthropicMetrFaq true');
  }
  if (hasAnthropicMetrFaq('Why does SIREN watch Anthropic Canadian data centres?') !== false) {
    throw new Error('hasAnthropicMetrFaq false');
  }
  if (hasAgentsAnthropicMetr('METR → https://siren.watch/lab/anthropic.html') !== true) {
    throw new Error('hasAgentsAnthropicMetr true');
  }
  if (hasAgentsAnthropicMetr('https://siren.watch/lab/anthropic.html only') !== false) {
    throw new Error('hasAgentsAnthropicMetr needs METR needle');
  }
  const metrGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      anthropic_metr_faq: false,
      agents_anthropic_metr: false,
      llms_anthropic_metr: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!metrGaps.some((g) => g.id === 'anthropic-metr-faq-missing')) {
    throw new Error('anthropic-metr-faq-missing gap');
  }
  if (!metrGaps.some((g) => g.id === 'agents-anthropic-metr-missing')) {
    throw new Error('agents-anthropic-metr-missing gap');
  }
  // FINDABILITY #397 — Anthropic ECDSA curve-seed FAQ + agent maps.
  if (hasAnthropicEcdsaFaq(ANTHROPIC_ECDSA_FAQ_NEEDLE) !== true) {
    throw new Error('hasAnthropicEcdsaFaq true');
  }
  if (hasAnthropicEcdsaFaq('Why does SIREN watch Anthropic METR evaluator access?') !== false) {
    throw new Error('hasAnthropicEcdsaFaq false');
  }
  if (hasAgentsAnthropicEcdsa('ECDSA → https://siren.watch/lab/anthropic.html') !== true) {
    throw new Error('hasAgentsAnthropicEcdsa true');
  }
  if (hasAgentsAnthropicEcdsa('https://siren.watch/lab/anthropic.html only') !== false) {
    throw new Error('hasAgentsAnthropicEcdsa needs ECDSA needle');
  }
  const ecdsaGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      anthropic_ecdsa_faq: false,
      agents_anthropic_ecdsa: false,
      llms_anthropic_ecdsa: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!ecdsaGaps.some((g) => g.id === 'anthropic-ecdsa-faq-missing')) {
    throw new Error('anthropic-ecdsa-faq-missing gap');
  }
  if (!ecdsaGaps.some((g) => g.id === 'agents-anthropic-ecdsa-missing')) {
    throw new Error('agents-anthropic-ecdsa-missing gap');
  }
  // FINDABILITY #402 — Claude Opus 5.5 FAQ + agent maps.
  if (hasClaudeOpus55Faq(CLAUDE_OPUS_55_FAQ_NEEDLE) !== true) {
    throw new Error('hasClaudeOpus55Faq true');
  }
  if (hasClaudeOpus55Faq('Why does SIREN watch Anthropic ECDSA curve seeds?') !== false) {
    throw new Error('hasClaudeOpus55Faq false');
  }
  if (hasAgentsClaudeOpus55('Claude Opus 5.5 → https://siren.watch/lab/anthropic.html') !== true) {
    throw new Error('hasAgentsClaudeOpus55 true');
  }
  if (hasAgentsClaudeOpus55('https://siren.watch/lab/anthropic.html only') !== false) {
    throw new Error('hasAgentsClaudeOpus55 needs Claude Opus 5.5 needle');
  }
  const opusGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      claude_opus_55_faq: false,
      agents_claude_opus_55: false,
      llms_claude_opus_55: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!opusGaps.some((g) => g.id === 'claude-opus-55-faq-missing')) {
    throw new Error('claude-opus-55-faq-missing gap');
  }
  if (!opusGaps.some((g) => g.id === 'agents-claude-opus-55-missing')) {
    throw new Error('agents-claude-opus-55-missing gap');
  }
  // FINDABILITY #408 — Blackstone Anthropic financing FAQ + agent maps.
  if (hasBlackstoneAnthropicFaq(BLACKSTONE_ANTHROPIC_FAQ_NEEDLE) !== true) {
    throw new Error('hasBlackstoneAnthropicFaq true');
  }
  if (hasBlackstoneAnthropicFaq('Why does SIREN watch Claude Opus 5.5?') !== false) {
    throw new Error('hasBlackstoneAnthropicFaq false');
  }
  if (hasAgentsBlackstoneAnthropic('Blackstone → https://siren.watch/lab/anthropic.html') !== true) {
    throw new Error('hasAgentsBlackstoneAnthropic true');
  }
  if (hasAgentsBlackstoneAnthropic('https://siren.watch/lab/anthropic.html only') !== false) {
    throw new Error('hasAgentsBlackstoneAnthropic needs Blackstone needle');
  }
  const blackstoneGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      blackstone_anthropic_faq: false,
      agents_blackstone_anthropic: false,
      llms_blackstone_anthropic: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!blackstoneGaps.some((g) => g.id === 'blackstone-anthropic-faq-missing')) {
    throw new Error('blackstone-anthropic-faq-missing gap');
  }
  if (!blackstoneGaps.some((g) => g.id === 'agents-blackstone-anthropic-missing')) {
    throw new Error('agents-blackstone-anthropic-missing gap');
  }
  // FINDABILITY #412 — Replit Anthropic model-switch FAQ + agent maps.
  if (hasReplitAnthropicFaq(REPLIT_ANTHROPIC_FAQ_NEEDLE) !== true) {
    throw new Error('hasReplitAnthropicFaq true');
  }
  if (hasReplitAnthropicFaq('Why does SIREN watch Blackstone Anthropic financing?') !== false) {
    throw new Error('hasReplitAnthropicFaq false');
  }
  if (hasAgentsReplitAnthropic('Replit → https://siren.watch/lab/anthropic.html') !== true) {
    throw new Error('hasAgentsReplitAnthropic true');
  }
  if (hasAgentsReplitAnthropic('https://siren.watch/lab/anthropic.html only') !== false) {
    throw new Error('hasAgentsReplitAnthropic needs Replit needle');
  }
  const replitGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      replit_anthropic_faq: false,
      agents_replit_anthropic: false,
      llms_replit_anthropic: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!replitGaps.some((g) => g.id === 'replit-anthropic-faq-missing')) {
    throw new Error('replit-anthropic-faq-missing gap');
  }
  if (!replitGaps.some((g) => g.id === 'agents-replit-anthropic-missing')) {
    throw new Error('agents-replit-anthropic-missing gap');
  }
  // FINDABILITY #420 — Claude Mythos 5 FAQ + agent maps.
  if (hasClaudeMythos5Faq(CLAUDE_MYTHOS_5_FAQ_NEEDLE) !== true) {
    throw new Error('hasClaudeMythos5Faq true');
  }
  if (hasClaudeMythos5Faq('Why does SIREN watch Claude Opus 5.5?') !== false) {
    throw new Error('hasClaudeMythos5Faq false');
  }
  if (hasAgentsClaudeMythos5('Claude Mythos 5 → https://siren.watch/lab/anthropic.html') !== true) {
    throw new Error('hasAgentsClaudeMythos5 true');
  }
  if (hasAgentsClaudeMythos5('https://siren.watch/lab/anthropic.html only') !== false) {
    throw new Error('hasAgentsClaudeMythos5 needs Claude Mythos 5 needle');
  }
  const mythosGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      claude_mythos_5_faq: false,
      agents_claude_mythos_5: false,
      llms_claude_mythos_5: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!mythosGaps.some((g) => g.id === 'claude-mythos-5-faq-missing')) {
    throw new Error('claude-mythos-5-faq-missing gap');
  }
  if (!mythosGaps.some((g) => g.id === 'agents-claude-mythos-5-missing')) {
    throw new Error('agents-claude-mythos-5-missing gap');
  }
  if (hasAsmlTrendsFaq(ASML_TRENDS_FAQ_NEEDLE) !== true) {
    throw new Error('hasAsmlTrendsFaq true');
  }
  if (hasAsmlTrendsFaq('What has SIREN scored about ASML?') !== false) {
    throw new Error('hasAsmlTrendsFaq false');
  }
  if (hasAgentsAsml('ASML stock → https://siren.watch/lab/asml.html') !== true) {
    throw new Error('hasAgentsAsml true');
  }
  if (hasAgentsAsml('https://siren.watch/lab/asml.html only') !== false) {
    throw new Error('hasAgentsAsml needs ASML stock needle');
  }
  const asmlGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      asml_trends_faq: false,
      agents_asml: false,
      llms_asml: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!asmlGaps.some((g) => g.id === 'asml-trends-faq-missing')) {
    throw new Error('asml-trends-faq-missing gap');
  }
  if (!asmlGaps.some((g) => g.id === 'agents-asml-missing')) {
    throw new Error('agents-asml-missing gap');
  }
  if (!OUR_SURFACES.includes('/lab/asml.html')) {
    throw new Error('OUR_SURFACES missing /lab/asml.html');
  }
  if (hasTsmcTrendsFaq(TSMC_TRENDS_FAQ_NEEDLE) !== true) {
    throw new Error('hasTsmcTrendsFaq true');
  }
  if (hasTsmcTrendsFaq('What has SIREN scored about TSMC?') !== false) {
    throw new Error('hasTsmcTrendsFaq false');
  }
  if (hasAgentsTsmc('TSMC stock → https://siren.watch/lab/tsmc.html') !== true) {
    throw new Error('hasAgentsTsmc true');
  }
  if (hasAgentsTsmc('https://siren.watch/lab/tsmc.html only') !== false) {
    throw new Error('hasAgentsTsmc needs TSMC stock needle');
  }
  const tsmcGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      tsmc_trends_faq: false,
      agents_tsmc: false,
      llms_tsmc: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!tsmcGaps.some((g) => g.id === 'tsmc-trends-faq-missing')) {
    throw new Error('tsmc-trends-faq-missing gap');
  }
  if (!tsmcGaps.some((g) => g.id === 'agents-tsmc-missing')) {
    throw new Error('agents-tsmc-missing gap');
  }
  if (!OUR_SURFACES.includes('/lab/tsmc.html')) {
    throw new Error('OUR_SURFACES missing /lab/tsmc.html');
  }
  if (hasAmazonBeeFaq(AMAZON_BEE_FAQ_NEEDLE) !== true) {
    throw new Error('hasAmazonBeeFaq true');
  }
  if (hasAmazonBeeFaq('What has SIREN scored about Amazon?') !== false) {
    throw new Error('hasAmazonBeeFaq false');
  }
  if (hasAgentsAmazonBee('Amazon Bee → https://siren.watch/lab/amazon.html') !== true) {
    throw new Error('hasAgentsAmazonBee true');
  }
  if (hasAgentsAmazonBee('https://siren.watch/lab/amazon.html only') !== false) {
    throw new Error('hasAgentsAmazonBee needs Amazon Bee needle');
  }
  const amazonGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      amazon_bee_faq: false,
      agents_amazon_bee: false,
      llms_amazon_bee: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!amazonGaps.some((g) => g.id === 'amazon-bee-faq-missing')) {
    throw new Error('amazon-bee-faq-missing gap');
  }
  if (!amazonGaps.some((g) => g.id === 'agents-amazon-bee-missing')) {
    throw new Error('agents-amazon-bee-missing gap');
  }
  if (!OUR_SURFACES.includes('/lab/amazon.html')) {
    throw new Error('OUR_SURFACES missing /lab/amazon.html');
  }
  if (hasMetaMuseFaq(META_MUSE_FAQ_NEEDLE) !== true) {
    throw new Error('hasMetaMuseFaq true');
  }
  if (hasMetaMuseFaq('What has SIREN scored about Meta AI?') !== false) {
    throw new Error('hasMetaMuseFaq false');
  }
  if (hasAgentsMetaMuse('Meta Muse → https://siren.watch/lab/meta.html') !== true) {
    throw new Error('hasAgentsMetaMuse true');
  }
  if (hasAgentsMetaMuse('https://siren.watch/lab/meta.html only') !== false) {
    throw new Error('hasAgentsMetaMuse needs Meta Muse needle');
  }
  const metaGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      meta_muse_faq: false,
      agents_meta_muse: false,
      llms_meta_muse: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!metaGaps.some((g) => g.id === 'meta-muse-faq-missing')) {
    throw new Error('meta-muse-faq-missing gap');
  }
  if (!metaGaps.some((g) => g.id === 'agents-meta-muse-missing')) {
    throw new Error('agents-meta-muse-missing gap');
  }
  if (!OUR_SURFACES.includes('/lab/meta.html')) {
    throw new Error('OUR_SURFACES missing /lab/meta.html');
  }
  if (hasAppleIntelligenceFaq(APPLE_INTELLIGENCE_FAQ_NEEDLE) !== true) {
    throw new Error('hasAppleIntelligenceFaq true');
  }
  if (hasAppleIntelligenceFaq('What has SIREN scored about Apple?') !== false) {
    throw new Error('hasAppleIntelligenceFaq false');
  }
  if (hasAgentsAppleIntelligence('Apple Intelligence → https://siren.watch/lab/apple.html') !== true) {
    throw new Error('hasAgentsAppleIntelligence true');
  }
  if (hasAgentsAppleIntelligence('https://siren.watch/lab/apple.html only') !== false) {
    throw new Error('hasAgentsAppleIntelligence needs Apple Intelligence needle');
  }
  const appleGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      apple_intelligence_faq: false,
      agents_apple_intelligence: false,
      llms_apple_intelligence: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!appleGaps.some((g) => g.id === 'apple-intelligence-faq-missing')) {
    throw new Error('apple-intelligence-faq-missing gap');
  }
  if (!appleGaps.some((g) => g.id === 'agents-apple-intelligence-missing')) {
    throw new Error('agents-apple-intelligence-missing gap');
  }
  if (!OUR_SURFACES.includes('/lab/apple.html')) {
    throw new Error('OUR_SURFACES missing /lab/apple.html');
  }
  if (hasMicrosoftCopilotFaq(MICROSOFT_COPILOT_FAQ_NEEDLE) !== true) {
    throw new Error('hasMicrosoftCopilotFaq true');
  }
  if (hasMicrosoftCopilotFaq('What has SIREN scored about Microsoft?') !== false) {
    throw new Error('hasMicrosoftCopilotFaq false');
  }
  if (hasAgentsMicrosoftCopilot('Microsoft Copilot → https://siren.watch/lab/microsoft.html') !== true) {
    throw new Error('hasAgentsMicrosoftCopilot true');
  }
  if (hasAgentsMicrosoftCopilot('https://siren.watch/lab/microsoft.html only') !== false) {
    throw new Error('hasAgentsMicrosoftCopilot needs Microsoft Copilot needle');
  }
  const msGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      microsoft_copilot_faq: false,
      agents_microsoft_copilot: false,
      llms_microsoft_copilot: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!msGaps.some((g) => g.id === 'microsoft-copilot-faq-missing')) {
    throw new Error('microsoft-copilot-faq-missing gap');
  }
  if (!msGaps.some((g) => g.id === 'agents-microsoft-copilot-missing')) {
    throw new Error('agents-microsoft-copilot-missing gap');
  }
  if (!OUR_SURFACES.includes('/lab/microsoft.html')) {
    throw new Error('OUR_SURFACES missing /lab/microsoft.html');
  }
  if (hasMicrosoftMaiFaq(MICROSOFT_MAI_FAQ_NEEDLE) !== true) {
    throw new Error('hasMicrosoftMaiFaq true');
  }
  if (hasMicrosoftMaiFaq('Why does SIREN watch Microsoft Copilot?') !== false) {
    throw new Error('hasMicrosoftMaiFaq false');
  }
  if (hasAgentsMicrosoftMai('Microsoft MAI-Base → https://siren.watch/lab/microsoft.html') !== true) {
    throw new Error('hasAgentsMicrosoftMai true');
  }
  if (hasAgentsMicrosoftMai('https://siren.watch/lab/microsoft.html only') !== false) {
    throw new Error('hasAgentsMicrosoftMai needs Microsoft MAI-Base needle');
  }
  const maiGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      microsoft_mai_faq: false,
      agents_microsoft_mai: false,
      llms_microsoft_mai: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!maiGaps.some((g) => g.id === 'microsoft-mai-faq-missing')) {
    throw new Error('microsoft-mai-faq-missing gap');
  }
  if (!maiGaps.some((g) => g.id === 'agents-microsoft-mai-missing')) {
    throw new Error('agents-microsoft-mai-missing gap');
  }
  // FINDABILITY #414 — Surface Laptop Ultra FAQ + agent maps.
  if (hasSurfaceUltraFaq(SURFACE_ULTRA_FAQ_NEEDLE) !== true) {
    throw new Error('hasSurfaceUltraFaq true');
  }
  if (hasSurfaceUltraFaq('Why does SIREN watch Microsoft MAI-Base?') !== false) {
    throw new Error('hasSurfaceUltraFaq false');
  }
  if (hasAgentsSurfaceUltra('Surface Laptop Ultra → https://siren.watch/lab/microsoft.html') !== true) {
    throw new Error('hasAgentsSurfaceUltra true');
  }
  if (hasAgentsSurfaceUltra('https://siren.watch/lab/microsoft.html only') !== false) {
    throw new Error('hasAgentsSurfaceUltra needs Surface Laptop Ultra needle');
  }
  const surfaceUltraGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      surface_ultra_faq: false,
      agents_surface_ultra: false,
      llms_surface_ultra: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!surfaceUltraGaps.some((g) => g.id === 'surface-ultra-faq-missing')) {
    throw new Error('surface-ultra-faq-missing gap');
  }
  if (!surfaceUltraGaps.some((g) => g.id === 'agents-surface-ultra-missing')) {
    throw new Error('agents-surface-ultra-missing gap');
  }
  // FINDABILITY #418 — DeepSeek V4.1 Flash FAQ + agent maps.
  if (hasDeepseekFlashFaq(DEEPSEEK_FLASH_FAQ_NEEDLE) !== true) {
    throw new Error('hasDeepseekFlashFaq true');
  }
  if (hasDeepseekFlashFaq('Why does SIREN watch DeepSeek and AI outages?') !== false) {
    throw new Error('hasDeepseekFlashFaq false');
  }
  if (hasAgentsDeepseekFlash('DeepSeek V4.1 Flash → https://siren.watch/lab/deepseek.html') !== true) {
    throw new Error('hasAgentsDeepseekFlash true');
  }
  if (hasAgentsDeepseekFlash('https://siren.watch/lab/deepseek.html only') !== false) {
    throw new Error('hasAgentsDeepseekFlash needs DeepSeek V4.1 Flash needle');
  }
  const deepseekFlashGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      deepseek_flash_faq: false,
      agents_deepseek_flash: false,
      llms_deepseek_flash: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!deepseekFlashGaps.some((g) => g.id === 'deepseek-flash-faq-missing')) {
    throw new Error('deepseek-flash-faq-missing gap');
  }
  if (!deepseekFlashGaps.some((g) => g.id === 'agents-deepseek-flash-missing')) {
    throw new Error('agents-deepseek-flash-missing gap');
  }
  if (hasXaiGrokFaq(XAI_GROK_FAQ_NEEDLE) !== true) {
    throw new Error('hasXaiGrokFaq true');
  }
  if (hasXaiGrokFaq('What has SIREN scored about xAI?') !== false) {
    throw new Error('hasXaiGrokFaq false');
  }
  if (hasAgentsXaiGrok('Grok / xAI → https://siren.watch/lab/xai.html') !== true) {
    throw new Error('hasAgentsXaiGrok true');
  }
  if (hasAgentsXaiGrok('https://siren.watch/lab/xai.html only') !== false) {
    throw new Error('hasAgentsXaiGrok needs Grok / xAI needle');
  }
  const xaiGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      xai_grok_faq: false,
      agents_xai_grok: false,
      llms_xai_grok: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!xaiGaps.some((g) => g.id === 'xai-grok-faq-missing')) {
    throw new Error('xai-grok-faq-missing gap');
  }
  if (!xaiGaps.some((g) => g.id === 'agents-xai-grok-missing')) {
    throw new Error('agents-xai-grok-missing gap');
  }
  if (!OUR_SURFACES.includes('/lab/xai.html')) {
    throw new Error('OUR_SURFACES missing /lab/xai.html');
  }
  if (hasGeminiGemmaFaq(GEMINI_GEMMA_FAQ_NEEDLE) !== true) {
    throw new Error('hasGeminiGemmaFaq true');
  }
  if (hasGeminiGemmaFaq('What has SIREN scored about Google DeepMind?') !== false) {
    throw new Error('hasGeminiGemmaFaq false');
  }
  if (hasAgentsGeminiGemma('Gemini / Gemma / Argon → https://siren.watch/lab/google-deepmind.html') !== true) {
    throw new Error('hasAgentsGeminiGemma true');
  }
  if (hasAgentsGeminiGemma('https://siren.watch/lab/google-deepmind.html only') !== false) {
    throw new Error('hasAgentsGeminiGemma needs Gemini / Gemma / Argon needle');
  }
  if (hasAgentsGeminiGemma('Gemini / Gemma → https://siren.watch/lab/google-deepmind.html') !== false) {
    throw new Error('hasAgentsGeminiGemma requires Argon in needle (#187)');
  }
  const gdmGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      gemini_gemma_faq: false,
      agents_gemini_gemma: false,
      llms_gemini_gemma: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!gdmGaps.some((g) => g.id === 'gemini-gemma-faq-missing')) {
    throw new Error('gemini-gemma-faq-missing gap');
  }
  if (!gdmGaps.some((g) => g.id === 'agents-gemini-gemma-missing')) {
    throw new Error('agents-gemini-gemma-missing gap');
  }
  if (!OUR_SURFACES.includes('/lab/google-deepmind.html')) {
    throw new Error('OUR_SURFACES missing /lab/google-deepmind.html');
  }
  if (hasSamsungHbmFaq(SAMSUNG_HBM_FAQ_NEEDLE) !== true) {
    throw new Error('hasSamsungHbmFaq true');
  }
  if (hasSamsungHbmFaq('What has SIREN scored about Samsung?') !== false) {
    throw new Error('hasSamsungHbmFaq false');
  }
  if (hasAgentsSamsungHbm('Samsung / AI memory → https://siren.watch/lab/samsung.html') !== true) {
    throw new Error('hasAgentsSamsungHbm true');
  }
  if (hasAgentsSamsungHbm('https://siren.watch/lab/samsung.html only') !== false) {
    throw new Error('hasAgentsSamsungHbm needs Samsung / AI memory needle');
  }
  const samGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      samsung_hbm_faq: false,
      agents_samsung_hbm: false,
      llms_samsung_hbm: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!samGaps.some((g) => g.id === 'samsung-hbm-faq-missing')) {
    throw new Error('samsung-hbm-faq-missing gap');
  }
  if (!samGaps.some((g) => g.id === 'agents-samsung-hbm-missing')) {
    throw new Error('agents-samsung-hbm-missing gap');
  }
  if (hasSamsungGlassesFaq(SAMSUNG_GLASSES_FAQ_NEEDLE) !== true) {
    throw new Error('hasSamsungGlassesFaq true');
  }
  if (hasSamsungGlassesFaq('Why does SIREN watch Samsung and AI memory chips?') !== false) {
    throw new Error('hasSamsungGlassesFaq false');
  }
  if (hasAgentsSamsungGlasses('Samsung AI glasses → https://siren.watch/lab/samsung.html') !== true) {
    throw new Error('hasAgentsSamsungGlasses true');
  }
  if (hasAgentsSamsungGlasses('https://siren.watch/lab/samsung.html only') !== false) {
    throw new Error('hasAgentsSamsungGlasses needs Samsung AI glasses needle');
  }
  const samGlassesGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      samsung_glasses_faq: false,
      agents_samsung_glasses: false,
      llms_samsung_glasses: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!samGlassesGaps.some((g) => g.id === 'samsung-glasses-faq-missing')) {
    throw new Error('samsung-glasses-faq-missing gap');
  }
  if (!samGlassesGaps.some((g) => g.id === 'agents-samsung-glasses-missing')) {
    throw new Error('agents-samsung-glasses-missing gap');
  }
  if (!OUR_SURFACES.includes('/lab/samsung.html')) {
    throw new Error('OUR_SURFACES missing /lab/samsung.html');
  }
  if (hasCharacterAiFaq(CHARACTER_AI_FAQ_NEEDLE) !== true) {
    throw new Error('hasCharacterAiFaq true');
  }
  if (hasCharacterAiFaq('What has SIREN scored about Chatbots?') !== false) {
    throw new Error('hasCharacterAiFaq false');
  }
  if (hasAgentsCharacterAi('Character.ai bankruptcy → https://siren.watch/tags/chatbots.html') !== true) {
    throw new Error('hasAgentsCharacterAi true');
  }
  if (hasAgentsCharacterAi('https://siren.watch/tags/chatbots.html only') !== false) {
    throw new Error('hasAgentsCharacterAi needs Character.ai bankruptcy needle');
  }
  const charGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      character_ai_faq: false,
      agents_character_ai: false,
      llms_character_ai: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!charGaps.some((g) => g.id === 'character-ai-faq-missing')) {
    throw new Error('character-ai-faq-missing gap');
  }
  if (!charGaps.some((g) => g.id === 'agents-character-ai-missing')) {
    throw new Error('agents-character-ai-missing gap');
  }
  if (!OUR_SURFACES.includes('/tags/chatbots.html')) {
    throw new Error('OUR_SURFACES missing /tags/chatbots.html');
  }
  if (hasCertInFaq(CERT_IN_FAQ_NEEDLE) !== true) {
    throw new Error('hasCertInFaq true');
  }
  if (hasCertInFaq('What has SIREN scored about AI agents?') !== false) {
    throw new Error('hasCertInFaq false');
  }
  if (hasAgentsCertIn('CERT-In → https://siren.watch/tags/agents.html') !== true) {
    throw new Error('hasAgentsCertIn true');
  }
  if (hasAgentsCertIn('https://siren.watch/tags/agents.html only') !== false) {
    throw new Error('hasAgentsCertIn needs CERT-In needle');
  }
  const certInGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      cert_in_faq: false,
      agents_cert_in: false,
      llms_cert_in: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!certInGaps.some((g) => g.id === 'cert-in-faq-missing')) {
    throw new Error('cert-in-faq-missing gap');
  }
  if (!certInGaps.some((g) => g.id === 'agents-cert-in-missing')) {
    throw new Error('agents-cert-in-missing gap');
  }
  if (!OUR_SURFACES.includes('/tags/agents.html')) {
    throw new Error('OUR_SURFACES missing /tags/agents.html');
  }
  if (hasQwenFaq(QWEN_FAQ_NEEDLE) !== true) {
    throw new Error('hasQwenFaq true');
  }
  if (hasQwenFaq('What has SIREN scored about Alibaba Qwen?') !== false) {
    throw new Error('hasQwenFaq false');
  }
  if (hasAgentsQwen('Alibaba open-weight → https://siren.watch/lab/qwen.html') !== true) {
    throw new Error('hasAgentsQwen true');
  }
  if (hasAgentsQwen('https://siren.watch/lab/qwen.html only') !== false) {
    throw new Error('hasAgentsQwen needs Alibaba open-weight needle');
  }
  const qwenGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      qwen_faq: false,
      agents_qwen: false,
      llms_qwen: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!qwenGaps.some((g) => g.id === 'qwen-faq-missing')) {
    throw new Error('qwen-faq-missing gap');
  }
  if (!qwenGaps.some((g) => g.id === 'agents-qwen-missing')) {
    throw new Error('agents-qwen-missing gap');
  }
  if (!OUR_SURFACES.includes('/lab/qwen.html')) {
    throw new Error('OUR_SURFACES missing /lab/qwen.html');
  }
  if (hasOracleDatacentersFaq(ORACLE_DATACENTERS_FAQ_NEEDLE) !== true) {
    throw new Error('hasOracleDatacentersFaq true');
  }
  if (hasOracleDatacentersFaq('What has SIREN scored about Datacenters & power?') !== false) {
    throw new Error('hasOracleDatacentersFaq false');
  }
  if (hasAgentsOracleDatacenters('Oracle datacenter → https://siren.watch/tags/datacenters.html') !== true) {
    throw new Error('hasAgentsOracleDatacenters true');
  }
  if (hasAgentsOracleDatacenters('https://siren.watch/tags/datacenters.html only') !== false) {
    throw new Error('hasAgentsOracleDatacenters needs Oracle datacenter needle');
  }
  const oracleGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      oracle_datacenters_faq: false,
      agents_oracle_datacenters: false,
      llms_oracle_datacenters: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!oracleGaps.some((g) => g.id === 'oracle-datacenters-faq-missing')) {
    throw new Error('oracle-datacenters-faq-missing gap');
  }
  if (!oracleGaps.some((g) => g.id === 'agents-oracle-datacenters-missing')) {
    throw new Error('agents-oracle-datacenters-missing gap');
  }
  if (!OUR_SURFACES.includes('/tags/datacenters.html')) {
    throw new Error('OUR_SURFACES missing /tags/datacenters.html');
  }
  if (hasDeepseekFaq(DEEPSEEK_FAQ_NEEDLE) !== true) {
    throw new Error('hasDeepseekFaq true');
  }
  if (hasDeepseekFaq('What has SIREN scored about DeepSeek?') !== false) {
    throw new Error('hasDeepseekFaq false');
  }
  if (hasAgentsDeepseek('DeepSeek outage → https://siren.watch/lab/deepseek.html') !== true) {
    throw new Error('hasAgentsDeepseek true');
  }
  if (hasAgentsDeepseek('https://siren.watch/lab/deepseek.html only') !== false) {
    throw new Error('hasAgentsDeepseek needs DeepSeek outage needle');
  }
  const deepseekGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      deepseek_faq: false,
      agents_deepseek: false,
      llms_deepseek: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!deepseekGaps.some((g) => g.id === 'deepseek-faq-missing')) {
    throw new Error('deepseek-faq-missing gap');
  }
  if (!deepseekGaps.some((g) => g.id === 'agents-deepseek-missing')) {
    throw new Error('agents-deepseek-missing gap');
  }
  if (!OUR_SURFACES.includes('/lab/deepseek.html')) {
    throw new Error('OUR_SURFACES missing /lab/deepseek.html');
  }
  if (hasMistralFaq(MISTRAL_FAQ_NEEDLE) !== true) {
    throw new Error('hasMistralFaq true');
  }
  if (hasMistralFaq('What has SIREN scored about Mistral?') !== false) {
    throw new Error('hasMistralFaq false');
  }
  if (hasAgentsMistral('Timestral → https://siren.watch/lab/mistral.html') !== true) {
    throw new Error('hasAgentsMistral true');
  }
  if (hasAgentsMistral('https://siren.watch/lab/mistral.html only') !== false) {
    throw new Error('hasAgentsMistral needs Timestral needle');
  }
  const mistralGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      mistral_faq: false,
      agents_mistral: false,
      llms_mistral: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!mistralGaps.some((g) => g.id === 'mistral-faq-missing')) {
    throw new Error('mistral-faq-missing gap');
  }
  if (!mistralGaps.some((g) => g.id === 'agents-mistral-missing')) {
    throw new Error('agents-mistral-missing gap');
  }
  if (!OUR_SURFACES.includes('/lab/mistral.html')) {
    throw new Error('OUR_SURFACES missing /lab/mistral.html');
  }
  if (hasOpenaiOutageFaq(OPENAI_OUTAGE_FAQ_NEEDLE) !== true) {
    throw new Error('hasOpenaiOutageFaq true');
  }
  if (hasOpenaiOutageFaq('Why does SIREN watch OpenAI lawsuits and FTC probes?') !== false) {
    throw new Error('hasOpenaiOutageFaq false');
  }
  if (hasAgentsOpenaiOutage('OpenAI outage → https://siren.watch/lab/openai.html') !== true) {
    throw new Error('hasAgentsOpenaiOutage true');
  }
  if (hasAgentsOpenaiOutage('https://siren.watch/lab/openai.html only') !== false) {
    throw new Error('hasAgentsOpenaiOutage needs OpenAI outage needle');
  }
  const openaiOutageGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      openai_outage_faq: false,
      agents_openai_outage: false,
      llms_openai_outage: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!openaiOutageGaps.some((g) => g.id === 'openai-outage-faq-missing')) {
    throw new Error('openai-outage-faq-missing gap');
  }
  if (!openaiOutageGaps.some((g) => g.id === 'agents-openai-outage-missing')) {
    throw new Error('agents-openai-outage-missing gap');
  }
  if (hasOpenaiChromeFaq(OPENAI_CHROME_FAQ_NEEDLE) !== true) {
    throw new Error('hasOpenaiChromeFaq true');
  }
  if (hasOpenaiChromeFaq('Why does SIREN watch OpenAI and ChatGPT outages?') !== false) {
    throw new Error('hasOpenaiChromeFaq false');
  }
  if (hasAgentsOpenaiChrome('ChatGPT Chrome → https://siren.watch/lab/openai.html') !== true) {
    throw new Error('hasAgentsOpenaiChrome true');
  }
  if (hasAgentsOpenaiChrome('https://siren.watch/lab/openai.html only') !== false) {
    throw new Error('hasAgentsOpenaiChrome needs ChatGPT Chrome needle');
  }
  const openaiChromeGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      openai_chrome_faq: false,
      agents_openai_chrome: false,
      llms_openai_chrome: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!openaiChromeGaps.some((g) => g.id === 'openai-chrome-faq-missing')) {
    throw new Error('openai-chrome-faq-missing gap');
  }
  if (!openaiChromeGaps.some((g) => g.id === 'agents-openai-chrome-missing')) {
    throw new Error('agents-openai-chrome-missing gap');
  }
  if (hasMetaAppleMacFaq(META_APPLE_MAC_FAQ_NEEDLE) !== true) {
    throw new Error('hasMetaAppleMacFaq true');
  }
  if (hasMetaAppleMacFaq('Why does SIREN watch Meta Muse and open-weight AI?') !== false) {
    throw new Error('hasMetaAppleMacFaq false');
  }
  if (hasAgentsMetaAppleMac('Meta and Apple Mac AI → https://siren.watch/lab/meta.html') !== true) {
    throw new Error('hasAgentsMetaAppleMac true');
  }
  if (hasAgentsMetaAppleMac('https://siren.watch/lab/meta.html only') !== false) {
    throw new Error('hasAgentsMetaAppleMac needs Meta and Apple Mac AI needle');
  }
  const metaAppleMacGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      meta_apple_mac_faq: false,
      agents_meta_apple_mac: false,
      llms_meta_apple_mac: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!metaAppleMacGaps.some((g) => g.id === 'meta-apple-mac-faq-missing')) {
    throw new Error('meta-apple-mac-faq-missing gap');
  }
  if (!metaAppleMacGaps.some((g) => g.id === 'agents-meta-apple-mac-missing')) {
    throw new Error('agents-meta-apple-mac-missing gap');
  }
  if (hasHuggingfaceFaq(HUGGINGFACE_FAQ_NEEDLE) !== true) {
    throw new Error('hasHuggingfaceFaq true');
  }
  if (hasHuggingfaceFaq('What has SIREN scored about Hugging Face?') !== false) {
    throw new Error('hasHuggingfaceFaq false');
  }
  if (hasAgentsHuggingface('Hugging Face hack → https://siren.watch/tags/huggingface.html') !== true) {
    throw new Error('hasAgentsHuggingface true');
  }
  if (hasAgentsHuggingface('https://siren.watch/tags/huggingface.html only') !== false) {
    throw new Error('hasAgentsHuggingface needs Hugging Face hack needle');
  }
  const hfGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      huggingface_faq: false,
      agents_huggingface: false,
      llms_huggingface: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!hfGaps.some((g) => g.id === 'huggingface-faq-missing')) {
    throw new Error('huggingface-faq-missing gap');
  }
  if (!hfGaps.some((g) => g.id === 'agents-huggingface-missing')) {
    throw new Error('agents-huggingface-missing gap');
  }
  if (!OUR_SURFACES.includes('/tags/huggingface.html')) {
    throw new Error('OUR_SURFACES missing /tags/huggingface.html');
  }
  if (hasPalantirFaq(PALANTIR_FAQ_NEEDLE) !== true) {
    throw new Error('hasPalantirFaq true');
  }
  if (hasPalantirFaq('What has SIREN scored about Palantir?') !== false) {
    throw new Error('hasPalantirFaq false');
  }
  if (hasAgentsPalantir('Palantir / AIP → https://siren.watch/lab/palantir.html') !== true) {
    throw new Error('hasAgentsPalantir true');
  }
  if (hasAgentsPalantir('https://siren.watch/lab/palantir.html only') !== false) {
    throw new Error('hasAgentsPalantir needs Palantir / AIP needle');
  }
  const palantirGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      palantir_faq: false,
      agents_palantir: false,
      llms_palantir: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!palantirGaps.some((g) => g.id === 'palantir-faq-missing')) {
    throw new Error('palantir-faq-missing gap');
  }
  if (!palantirGaps.some((g) => g.id === 'agents-palantir-missing')) {
    throw new Error('agents-palantir-missing gap');
  }
  if (!OUR_SURFACES.includes('/lab/palantir.html')) {
    throw new Error('OUR_SURFACES missing /lab/palantir.html');
  }
  // FINDABILITY #406 — Ondas-Palantir FAQ + agent maps.
  if (hasOndasPalantirFaq(ONDAS_PALANTIR_FAQ_NEEDLE) !== true) {
    throw new Error('hasOndasPalantirFaq true');
  }
  if (hasOndasPalantirFaq('Why does SIREN watch Palantir and government AI?') !== false) {
    throw new Error('hasOndasPalantirFaq false');
  }
  if (hasAgentsOndasPalantir('Ondas → https://siren.watch/lab/palantir.html') !== true) {
    throw new Error('hasAgentsOndasPalantir true');
  }
  if (hasAgentsOndasPalantir('https://siren.watch/lab/palantir.html only') !== false) {
    throw new Error('hasAgentsOndasPalantir needs Ondas needle');
  }
  const ondasPalantirGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      ondas_palantir_faq: false,
      agents_ondas_palantir: false,
      llms_ondas_palantir: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!ondasPalantirGaps.some((g) => g.id === 'ondas-palantir-faq-missing')) {
    throw new Error('ondas-palantir-faq-missing gap');
  }
  if (!ondasPalantirGaps.some((g) => g.id === 'agents-ondas-palantir-missing')) {
    throw new Error('agents-ondas-palantir-missing gap');
  }
  if (hasAmdFaq(AMD_FAQ_NEEDLE) !== true) {
    throw new Error('hasAmdFaq true');
  }
  if (hasAmdFaq('What has SIREN scored about AMD?') !== false) {
    throw new Error('hasAmdFaq false');
  }
  if (hasAgentsAmd('AMD / MI300 → https://siren.watch/lab/amd.html') !== true) {
    throw new Error('hasAgentsAmd true');
  }
  if (hasAgentsAmd('https://siren.watch/lab/amd.html only') !== false) {
    throw new Error('hasAgentsAmd needs AMD / MI300 needle');
  }
  const amdGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      amd_faq: false,
      agents_amd: false,
      llms_amd: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!amdGaps.some((g) => g.id === 'amd-faq-missing')) {
    throw new Error('amd-faq-missing gap');
  }
  if (!amdGaps.some((g) => g.id === 'agents-amd-missing')) {
    throw new Error('agents-amd-missing gap');
  }
  if (!OUR_SURFACES.includes('/lab/amd.html')) {
    throw new Error('OUR_SURFACES missing /lab/amd.html');
  }
  if (hasTeslaFaq(TESLA_FAQ_NEEDLE) !== true) {
    throw new Error('hasTeslaFaq true');
  }
  if (hasTeslaFaq('What has SIREN scored about Tesla?') !== false) {
    throw new Error('hasTeslaFaq false');
  }
  if (hasAgentsTesla('Tesla / FSD → https://siren.watch/lab/tesla.html') !== true) {
    throw new Error('hasAgentsTesla true');
  }
  if (hasAgentsTesla('https://siren.watch/lab/tesla.html only') !== false) {
    throw new Error('hasAgentsTesla needs Tesla / FSD needle');
  }
  const teslaGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      tesla_faq: false,
      agents_tesla: false,
      llms_tesla: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!teslaGaps.some((g) => g.id === 'tesla-faq-missing')) {
    throw new Error('tesla-faq-missing gap');
  }
  if (!teslaGaps.some((g) => g.id === 'agents-tesla-missing')) {
    throw new Error('agents-tesla-missing gap');
  }
  if (!OUR_SURFACES.includes('/lab/tesla.html')) {
    throw new Error('OUR_SURFACES missing /lab/tesla.html');
  }
  // FINDABILITY #372 — Waymo Canada / Toronto FAQ + agent maps.
  if (hasWaymoCanadaFaq(WAYMO_CANADA_FAQ_NEEDLE) !== true) {
    throw new Error('hasWaymoCanadaFaq true');
  }
  if (hasWaymoCanadaFaq('Why does SIREN watch Tesla Autopilot and FSD?') !== false) {
    throw new Error('hasWaymoCanadaFaq false');
  }
  if (hasAgentsWaymoCanada('Waymo Canada → https://siren.watch/lab/waymo.html') !== true) {
    throw new Error('hasAgentsWaymoCanada true');
  }
  if (hasAgentsWaymoCanada('https://siren.watch/lab/waymo.html only') !== false) {
    throw new Error('hasAgentsWaymoCanada needs Waymo Canada needle');
  }
  const waymoCanadaGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      waymo_canada_faq: false,
      agents_waymo_canada: false,
      llms_waymo_canada: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!waymoCanadaGaps.some((g) => g.id === 'waymo-canada-faq-missing')) {
    throw new Error('waymo-canada-faq-missing gap');
  }
  if (!waymoCanadaGaps.some((g) => g.id === 'agents-waymo-canada-missing')) {
    throw new Error('agents-waymo-canada-missing gap');
  }
  if (!OUR_SURFACES.includes('/lab/waymo.html')) {
    throw new Error('OUR_SURFACES missing /lab/waymo.html');
  }
  // FINDABILITY #374 — SoftBank / Allied Universal FAQ + agent maps.
  if (hasSoftbankAlliedFaq(SOFTBANK_ALLIED_FAQ_NEEDLE) !== true) {
    throw new Error('hasSoftbankAlliedFaq true');
  }
  if (hasSoftbankAlliedFaq('Why does SIREN watch Waymo Canada and Toronto robotaxis?') !== false) {
    throw new Error('hasSoftbankAlliedFaq false');
  }
  if (hasAgentsSoftbankAllied('Allied Universal → https://siren.watch/lab/softbank.html') !== true) {
    throw new Error('hasAgentsSoftbankAllied true');
  }
  if (hasAgentsSoftbankAllied('https://siren.watch/lab/softbank.html only') !== false) {
    throw new Error('hasAgentsSoftbankAllied needs Allied Universal needle');
  }
  const softbankAlliedGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      softbank_allied_faq: false,
      agents_softbank_allied: false,
      llms_softbank_allied: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!softbankAlliedGaps.some((g) => g.id === 'softbank-allied-faq-missing')) {
    throw new Error('softbank-allied-faq-missing gap');
  }
  if (!softbankAlliedGaps.some((g) => g.id === 'agents-softbank-allied-missing')) {
    throw new Error('agents-softbank-allied-missing gap');
  }
  if (!OUR_SURFACES.includes('/lab/softbank.html')) {
    throw new Error('OUR_SURFACES missing /lab/softbank.html');
  }
  // FINDABILITY #376 — SpaceX / Starshield FAQ + agent maps.
  if (hasSpacexStarshieldFaq(SPACEX_STARSHIELD_FAQ_NEEDLE) !== true) {
    throw new Error('hasSpacexStarshieldFaq true');
  }
  if (hasSpacexStarshieldFaq('Why does SIREN watch SoftBank Allied Universal talks?') !== false) {
    throw new Error('hasSpacexStarshieldFaq false');
  }
  if (hasAgentsSpacexStarshield('Starshield → https://siren.watch/lab/spacex.html') !== true) {
    throw new Error('hasAgentsSpacexStarshield true');
  }
  if (hasAgentsSpacexStarshield('https://siren.watch/lab/spacex.html only') !== false) {
    throw new Error('hasAgentsSpacexStarshield needs Starshield needle');
  }
  const spacexStarshieldGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      spacex_starshield_faq: false,
      agents_spacex_starshield: false,
      llms_spacex_starshield: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!spacexStarshieldGaps.some((g) => g.id === 'spacex-starshield-faq-missing')) {
    throw new Error('spacex-starshield-faq-missing gap');
  }
  if (!spacexStarshieldGaps.some((g) => g.id === 'agents-spacex-starshield-missing')) {
    throw new Error('agents-spacex-starshield-missing gap');
  }
  if (!OUR_SURFACES.includes('/lab/spacex.html')) {
    throw new Error('OUR_SURFACES missing /lab/spacex.html');
  }
  // FINDABILITY #378 — Tesla Flying Roadster FAQ + agent maps.
  if (hasTeslaFlyingRoadsterFaq(TESLA_FLYING_ROADSTER_FAQ_NEEDLE) !== true) {
    throw new Error('hasTeslaFlyingRoadsterFaq true');
  }
  if (hasTeslaFlyingRoadsterFaq('Why does SIREN watch Tesla Autopilot and FSD?') !== false) {
    throw new Error('hasTeslaFlyingRoadsterFaq false');
  }
  if (hasAgentsTeslaFlyingRoadster('Flying Roadster → https://siren.watch/lab/tesla.html') !== true) {
    throw new Error('hasAgentsTeslaFlyingRoadster true');
  }
  if (hasAgentsTeslaFlyingRoadster('https://siren.watch/lab/tesla.html only') !== false) {
    throw new Error('hasAgentsTeslaFlyingRoadster needs Flying Roadster needle');
  }
  const teslaFlyingRoadsterGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      tesla_flying_roadster_faq: false,
      agents_tesla_flying_roadster: false,
      llms_tesla_flying_roadster: true,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!teslaFlyingRoadsterGaps.some((g) => g.id === 'tesla-flying-roadster-faq-missing')) {
    throw new Error('tesla-flying-roadster-faq-missing gap');
  }
  if (!teslaFlyingRoadsterGaps.some((g) => g.id === 'agents-tesla-flying-roadster-missing')) {
    throw new Error('agents-tesla-flying-roadster-missing gap');
  }
  const routesBody = [
    TRENDS_ROUTES_FAQ_NEEDLE,
    TRENDS_ROUTES_ASML_NEEDLE,
    TRENDS_ROUTES_TSMC_NEEDLE,
    TRENDS_ROUTES_AMAZON_BEE_NEEDLE,
    TRENDS_ROUTES_META_MUSE_NEEDLE,
    TRENDS_ROUTES_META_APPLE_MAC_NEEDLE,
    TRENDS_ROUTES_APPLE_INTELLIGENCE_NEEDLE,
    TRENDS_ROUTES_MICROSOFT_COPILOT_NEEDLE,
    TRENDS_ROUTES_MICROSOFT_MAI_NEEDLE,
    TRENDS_ROUTES_SURFACE_ULTRA_NEEDLE,
    TRENDS_WATCHLIST_SURFACE_ULTRA_NEEDLE,
    TRENDS_ROUTES_XAI_GROK_NEEDLE,
    TRENDS_ROUTES_GEMINI_GEMMA_NEEDLE,
    TRENDS_ROUTES_SAMSUNG_HBM_NEEDLE,
    TRENDS_ROUTES_SAMSUNG_GLASSES_NEEDLE,
    TRENDS_ROUTES_CHARACTER_AI_NEEDLE,
    TRENDS_ROUTES_CERT_IN_NEEDLE,
    TRENDS_WATCHLIST_CERT_IN_NEEDLE,
    TRENDS_ROUTES_QWEN_NEEDLE,
    TRENDS_ROUTES_ORACLE_DATACENTERS_NEEDLE,
    TRENDS_ROUTES_DEEPSEEK_NEEDLE,
    TRENDS_ROUTES_DEEPSEEK_FLASH_NEEDLE,
    TRENDS_WATCHLIST_DEEPSEEK_FLASH_NEEDLE,
    TRENDS_ROUTES_MISTRAL_NEEDLE,
    TRENDS_ROUTES_OPENAI_OUTAGE_NEEDLE,
    TRENDS_ROUTES_OPENAI_CHROME_NEEDLE,
    TRENDS_ROUTES_ANTHROPIC_AI_SAFETY_BILL_NEEDLE,
    TRENDS_ROUTES_ANTHROPIC_CANADA_DC_NEEDLE,
    TRENDS_ROUTES_ANTHROPIC_METR_NEEDLE,
    TRENDS_ROUTES_ANTHROPIC_ECDSA_NEEDLE,
    TRENDS_ROUTES_CLAUDE_OPUS_55_NEEDLE,
    TRENDS_ROUTES_BLACKSTONE_ANTHROPIC_NEEDLE,
    TRENDS_ROUTES_REPLIT_ANTHROPIC_NEEDLE,
    TRENDS_ROUTES_CLAUDE_MYTHOS_5_NEEDLE,
    TRENDS_WATCHLIST_ANTHROPIC_ECDSA_NEEDLE,
    TRENDS_WATCHLIST_ANTHROPIC_METR_NEEDLE,
    TRENDS_WATCHLIST_CLAUDE_OPUS_55_NEEDLE,
    TRENDS_WATCHLIST_BLACKSTONE_ANTHROPIC_NEEDLE,
    TRENDS_WATCHLIST_REPLIT_ANTHROPIC_NEEDLE,
    TRENDS_WATCHLIST_CLAUDE_MYTHOS_5_NEEDLE,
    TRENDS_ROUTES_HUGGINGFACE_NEEDLE,
    TRENDS_ROUTES_PALANTIR_NEEDLE,
    TRENDS_ROUTES_ONDAS_PALANTIR_NEEDLE,
    TRENDS_WATCHLIST_ONDAS_PALANTIR_NEEDLE,
    TRENDS_ROUTES_AMD_NEEDLE,
    TRENDS_ROUTES_TESLA_NEEDLE,
    TRENDS_ROUTES_WAYMO_CANADA_NEEDLE,
    TRENDS_ROUTES_SOFTBANK_ALLIED_NEEDLE,
    TRENDS_ROUTES_SPACEX_STARSHIELD_NEEDLE,
    TRENDS_ROUTES_TESLA_FLYING_ROADSTER_NEEDLE,
  ].join('\n');
  if (hasTrendsRoutesFaq(routesBody) !== true) {
    throw new Error('hasTrendsRoutesFaq true');
  }
  if (hasTrendsRoutesFaq(TRENDS_ROUTES_FAQ_NEEDLE) !== false) {
    throw new Error('hasTrendsRoutesFaq needs ASML/TSMC/Amazon Bee/Meta Muse/Apple Intelligence/Microsoft Copilot/MAI-Base/Surface-Ultra/Grok/Gemini/Samsung/Samsung-glasses/Character.ai/CERT-In/Hugging Face/Qwen/Oracle/DeepSeek/DeepSeek-Flash/Mistral/OpenAI-outage/ChatGPT-Chrome/Anthropic-AI-safety-bill/Anthropic-Canadian-DC/Anthropic-METR/Anthropic-ECDSA/Claude-Opus-5.5/Claude-Mythos-5/Blackstone-Anthropic/Replit-Anthropic/watchlist-td/Meta-Apple-Mac/Palantir/Ondas-Palantir/AMD/Waymo-Canada/SoftBank-Allied/SpaceX-Starshield/Tesla-Flying-Roadster destinations (#166/#167/#169/#170/#171/#173/#174/#175/#176/#177/#178/#179/#180/#181/#182/#183/#184/#191/#193/#195/#220/#362/#368/#372/#374/#376/#378/#392/#397/#400/#402/#406/#408/#410/#412/#414/#418/#420)');
  }
  // FINDABILITY #400 — FAQ arrow alone must not pass (tip #399 left arrows, dropped table rows).
  if (hasTrendsRoutesFaq([
    TRENDS_ROUTES_FAQ_NEEDLE,
    TRENDS_ROUTES_ASML_NEEDLE,
    TRENDS_ROUTES_TSMC_NEEDLE,
    TRENDS_ROUTES_AMAZON_BEE_NEEDLE,
    TRENDS_ROUTES_META_MUSE_NEEDLE,
    TRENDS_ROUTES_META_APPLE_MAC_NEEDLE,
    TRENDS_ROUTES_APPLE_INTELLIGENCE_NEEDLE,
    TRENDS_ROUTES_MICROSOFT_COPILOT_NEEDLE,
    TRENDS_ROUTES_MICROSOFT_MAI_NEEDLE,
    TRENDS_ROUTES_SURFACE_ULTRA_NEEDLE,
    TRENDS_ROUTES_XAI_GROK_NEEDLE,
    TRENDS_ROUTES_GEMINI_GEMMA_NEEDLE,
    TRENDS_ROUTES_SAMSUNG_HBM_NEEDLE,
    TRENDS_ROUTES_SAMSUNG_GLASSES_NEEDLE,
    TRENDS_ROUTES_CHARACTER_AI_NEEDLE,
    TRENDS_ROUTES_CERT_IN_NEEDLE,
    TRENDS_ROUTES_QWEN_NEEDLE,
    TRENDS_ROUTES_ORACLE_DATACENTERS_NEEDLE,
    TRENDS_ROUTES_DEEPSEEK_NEEDLE,
    TRENDS_ROUTES_DEEPSEEK_FLASH_NEEDLE,
    TRENDS_ROUTES_MISTRAL_NEEDLE,
    TRENDS_ROUTES_OPENAI_OUTAGE_NEEDLE,
    TRENDS_ROUTES_OPENAI_CHROME_NEEDLE,
    TRENDS_ROUTES_ANTHROPIC_AI_SAFETY_BILL_NEEDLE,
    TRENDS_ROUTES_ANTHROPIC_CANADA_DC_NEEDLE,
    TRENDS_ROUTES_ANTHROPIC_METR_NEEDLE,
    TRENDS_ROUTES_ANTHROPIC_ECDSA_NEEDLE,
    TRENDS_ROUTES_CLAUDE_OPUS_55_NEEDLE,
    TRENDS_ROUTES_BLACKSTONE_ANTHROPIC_NEEDLE,
    TRENDS_ROUTES_REPLIT_ANTHROPIC_NEEDLE,
    TRENDS_ROUTES_CLAUDE_MYTHOS_5_NEEDLE,
    TRENDS_ROUTES_HUGGINGFACE_NEEDLE,
    TRENDS_ROUTES_PALANTIR_NEEDLE,
    TRENDS_ROUTES_ONDAS_PALANTIR_NEEDLE,
    TRENDS_ROUTES_AMD_NEEDLE,
    TRENDS_ROUTES_TESLA_NEEDLE,
    TRENDS_ROUTES_WAYMO_CANADA_NEEDLE,
    TRENDS_ROUTES_SOFTBANK_ALLIED_NEEDLE,
    TRENDS_ROUTES_SPACEX_STARSHIELD_NEEDLE,
    TRENDS_ROUTES_TESLA_FLYING_ROADSTER_NEEDLE,
  ].join('\n')) !== false) {
    throw new Error('hasTrendsRoutesFaq needs watchlist <td> Anthropic ECDSA/METR/Claude Opus 5.5/Claude Mythos 5/Blackstone/Replit/Ondas/CERT-In/Surface Ultra/DeepSeek V4.1 Flash (#400/#402/#406/#408/#410/#412/#414/#418/#420)');
  }
  if (hasTrendsRoutesFaq('Where do live AI prediction-market odds live') !== false) {
    throw new Error('hasTrendsRoutesFaq false');
  }
  const routesGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      trends_routes_faq: false,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!routesGaps.some((g) => g.id === 'trends-routes-faq-missing')) {
    throw new Error('trends-routes-faq-missing gap');
  }
  const labByUrl = new Map([
    ['https://siren.watch/lab/google-deepmind.html', {
      ok: true,
      // Missing Argon (#187) while Gemini alone remains — lag probe expects Argon.
      value: '<title>What has SIREN scored about Google DeepMind / Gemini? AI stories</title>',
    }],
    ['https://siren.watch/lab/openai.html', {
      ok: true,
      value: '<title>What has SIREN scored about OpenAI / ChatGPT?</title>',
    }],
    ['https://siren.watch/lab/anthropic.html', {
      ok: true,
      value: '<title>What has SIREN scored about Anthropic / Claude?</title>',
    }],
    ['https://siren.watch/lab/micron.html', {
      ok: true,
      value: '<title>What has SIREN scored about Micron / MU?</title>',
    }],
  ]);
  const labLags = labHeadAliasLags(labByUrl);
  if (!labLags.some((r) => r.path === '/lab/google-deepmind.html' && r.needle === 'Argon')) {
    throw new Error('labHeadAliasLags Argon');
  }
  if (labLags.some((r) => r.path === '/lab/openai.html')) throw new Error('labHeadAliasLags ChatGPT false positive');
  if (labLags.some((r) => r.path === '/lab/micron.html')) throw new Error('labHeadAliasLags MU false positive');
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
  const faqByUrl = new Map([
    ['https://siren.watch/compare.html', {
      ok: true,
      value: '<h2>Which AI doom indexes can you compare?</h2>',
    }],
    ['https://siren.watch/alternatives.html', {
      ok: true,
      value: '<h2>What is an AI doom index alternative?</h2><p>SIREN</p>',
    }],
  ]);
  const faqLags = conquestFaqLags(faqByUrl);
  if (!faqLags.some((r) => r.path === '/compare.html')) {
    throw new Error('conquestFaqLags compare');
  }
  if (faqLags.some((r) => r.path === '/alternatives.html')) {
    throw new Error('conquestFaqLags alternatives false positive');
  }
  const faqGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      conquest_faq_lags: faqLags,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!faqGaps.some((g) => g.id === 'conquest-faq-missing')) {
    throw new Error('conquest-faq-missing gap');
  }
  for (const p of CONQUEST_FAQ_PROBES) {
    if (!OUR_SURFACES.includes(p.path) && !CORE_LIVE_SURFACES.includes(p.path)) {
      throw new Error(`surfaces missing conquest FAQ ${p.path}`);
    }
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

  // FINDABILITY #186 — trends-stale from api/search-trends.json generated_at.
  if (TRENDS_STALE_HOURS < 6) throw new Error('TRENDS_STALE_HOURS floor');
  if (trendsGeneratedAtMs('{"generated_at":"2026-10-15T19:11:36.752Z"}')
    !== Date.parse('2026-10-15T19:11:36.752Z')) {
    throw new Error('trendsGeneratedAtMs');
  }
  if (trendsGeneratedAtMs('{') !== null) throw new Error('trendsGeneratedAtMs bad json');
  if (!CORE_LIVE_SURFACES.includes('/api/search-trends.json')
    && !OUR_SURFACES.includes('/api/search-trends.json')) {
    throw new Error('surfaces missing /api/search-trends.json');
  }
  const trendsStaleGaps = deriveGaps({
    measured_at: '2026-10-15T22:00:00.000Z',
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      trends_generated_at: '2026-10-15T12:00:00.000Z',
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!trendsStaleGaps.some((g) => g.id === 'trends-stale')) throw new Error('trends-stale gap');
  const trendsFreshGaps = deriveGaps({
    measured_at: '2026-10-15T22:00:00.000Z',
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      trends_generated_at: '2026-10-15T21:00:00.000Z',
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (trendsFreshGaps.some((g) => g.id === 'trends-stale')) throw new Error('trends-stale false positive');
  const trendsMissingGaps = deriveGaps({
    measured_at: '2026-10-15T22:00:00.000Z',
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      trends_generated_at: null,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!trendsMissingGaps.some((g) => g.id === 'trends-json-missing')) {
    throw new Error('trends-json-missing gap');
  }

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
  // FINDABILITY #201 — catch tip wipe of #199/#200 Google News needles.
  for (const lab of ['METR', 'Bee', 'Apertus', 'Apertus 1.5']) {
    if (!NEWS_KEYWORD_PROBE_LABS.includes(lab)) throw new Error(`probe labs missing ${lab}`);
  }
  // FINDABILITY #204 — catch tip wipe of Bluesky/Attie/Nscale needles.
  for (const lab of ['Bluesky', 'Attie', 'Nscale']) {
    if (!NEWS_KEYWORD_PROBE_LABS.includes(lab)) throw new Error(`probe labs missing ${lab}`);
  }
  // FINDABILITY #206 — catch tip wipe of Starshield needle.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Starshield')) {
    throw new Error('probe labs missing Starshield');
  }
  // FINDABILITY #208 — catch tip wipe of Roadster needle.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Roadster')) {
    throw new Error('probe labs missing Roadster');
  }
  // FINDABILITY #212 — catch tip wipe of Fable model-class needles.
  for (const lab of ['Fable', 'Fable 5', 'Fable 5.1', 'Fable 5.5']) {
    if (!NEWS_KEYWORD_PROBE_LABS.includes(lab)) throw new Error(`probe labs missing ${lab}`);
  }
  const metrLagXml = '<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
    + '<url><news:title>Anthropic grants outside evaluator METR employee-level access</news:title>'
    + '<news:keywords>Anthropic, Google, Claude, AI, SIREN</news:keywords></url>'
    + '<url><news:title>Apertus 1.5: Swiss AI Model Hits 262K Context</news:title>'
    + '<news:keywords>Google, Apertus, Apertus 1.5, AI, SIREN</news:keywords></url>'
    + '<url><news:title>Bluesky Expands Attie Into AI-Built Social Experiences</news:title>'
    + '<news:keywords>Google, AI, artificial intelligence, SIREN</news:keywords></url>'
    + '<url><news:title>Nscale’s AI Buildout Hit by Fire, Delays and Angry Workers Ahead of IPO</news:title>'
    + '<news:keywords>Google, Nscale, AI, SIREN</news:keywords></url>'
    + '<url><news:title>Musk Comments Sow Confusion Over Ukraine Starshield Disruption</news:title>'
    + '<news:keywords>SpaceX, Elon Musk, AI, SIREN</news:keywords></url>'
    + '<url><news:title>The Tesla Roadster 2 Is Here—and It Flies</news:title>'
    + '<news:keywords>Tesla, FSD, AI, SIREN</news:keywords></url>'
    + '<url><news:title>Breaking News: Fable 5.5 Spotted on Azure – Directly Competing Against Google’s New AI Model</news:title>'
    + '<news:keywords>Google, AI, artificial intelligence, SIREN, Cloud AI</news:keywords></url>'
    + '</urlset>';
  const metrLags = newsKeywordLags(metrLagXml);
  if (!metrLags.some((r) => r.lab === 'METR')) {
    throw new Error(`newsKeywordLags expected METR lag: ${JSON.stringify(metrLags)}`);
  }
  if (metrLags.some((r) => r.lab === 'Apertus' || r.lab === 'Apertus 1.5')) {
    throw new Error('newsKeywordLags should not flag Apertus when keywords include it');
  }
  if (!metrLags.some((r) => r.lab === 'Bluesky') || !metrLags.some((r) => r.lab === 'Attie')) {
    throw new Error(`newsKeywordLags expected Bluesky/Attie lag: ${JSON.stringify(metrLags)}`);
  }
  if (metrLags.some((r) => r.lab === 'Nscale')) {
    throw new Error('newsKeywordLags should not flag Nscale when keywords include it');
  }
  if (!metrLags.some((r) => r.lab === 'Starshield')) {
    throw new Error(`newsKeywordLags expected Starshield lag: ${JSON.stringify(metrLags)}`);
  }
  if (!metrLags.some((r) => r.lab === 'Roadster')) {
    throw new Error(`newsKeywordLags expected Roadster lag: ${JSON.stringify(metrLags)}`);
  }
  if (!metrLags.some((r) => r.lab === 'Fable') || !metrLags.some((r) => r.lab === 'Fable 5.5')) {
    throw new Error(`newsKeywordLags expected Fable / Fable 5.5 lag: ${JSON.stringify(metrLags)}`);
  }
  // FINDABILITY #214 — catch tip wipe of ChatGPT Voice / GPT-Live needles.
  for (const lab of ['ChatGPT Voice', 'GPT-Live', 'GPT-Live-1.1']) {
    if (!NEWS_KEYWORD_PROBE_LABS.includes(lab)) throw new Error(`probe labs missing ${lab}`);
  }
  const voiceLagXml = '<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
    + '<url><news:title>OpenAI has updated ChatGPT Voice (voice function). GPT-Live-1.1, which supports this update</news:title>'
    + '<news:keywords>GPT, OpenAI, Google, ChatGPT, AI, SIREN</news:keywords></url>'
    + '<url><news:title>OpenAI adds Korean voices and boosts natural chat in ChatGPT Voice</news:title>'
    + '<news:keywords>OpenAI, ChatGPT, ChatGPT Voice, AI, SIREN</news:keywords></url>'
    + '</urlset>';
  const voiceLags = newsKeywordLags(voiceLagXml);
  if (!voiceLags.some((r) => r.lab === 'ChatGPT Voice')
    || !voiceLags.some((r) => r.lab === 'GPT-Live')
    || !voiceLags.some((r) => r.lab === 'GPT-Live-1.1')) {
    throw new Error(`newsKeywordLags expected ChatGPT Voice / GPT-Live lag: ${JSON.stringify(voiceLags)}`);
  }
  if (voiceLags.filter((r) => /Korean voices/i.test(r.title)).some((r) => r.lab === 'ChatGPT Voice')) {
    throw new Error('newsKeywordLags should not flag ChatGPT Voice when keywords include it');
  }
  // FINDABILITY #216 — catch tip wipe of MAI-Base / MAI-Base-2 needles.
  for (const lab of ['MAI-Base', 'MAI-Base-2']) {
    if (!NEWS_KEYWORD_PROBE_LABS.includes(lab)) throw new Error(`probe labs missing ${lab}`);
  }
  const maiLagXml = '<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
    + '<url><news:title>Microsoft unveils MAI-Base-2, a MoE model with 2.8T total parameters</news:title>'
    + '<news:keywords>Microsoft, Base, Copilot, AI, SIREN</news:keywords></url>'
    + '<url><news:title>Microsoft ships MAI-Base update for enterprise agents</news:title>'
    + '<news:keywords>Microsoft, MAI-Base, Copilot, AI, SIREN</news:keywords></url>'
    + '</urlset>';
  const maiLags = newsKeywordLags(maiLagXml);
  if (!maiLags.some((r) => r.lab === 'MAI-Base') || !maiLags.some((r) => r.lab === 'MAI-Base-2')) {
    throw new Error(`newsKeywordLags expected MAI-Base / MAI-Base-2 lag: ${JSON.stringify(maiLags)}`);
  }
  if (maiLags.filter((r) => /enterprise agents/i.test(r.title)).some((r) => r.lab === 'MAI-Base')) {
    throw new Error('newsKeywordLags should not flag MAI-Base when keywords include it');
  }
  // FINDABILITY #222 — catch tip wipe of Muse Spark / Muse Spark Open needles.
  for (const lab of ['Muse Spark', 'Muse Spark Open']) {
    if (!NEWS_KEYWORD_PROBE_LABS.includes(lab)) throw new Error(`probe labs missing ${lab}`);
  }
  const museSparkLagXml = '<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
    + '<url><news:title>Muse Spark Open vs DeepSeek V4.1 Flash: Same Score, Triple the Cost</news:title>'
    + '<news:keywords>DeepSeek, Muse, Google, AI, SIREN</news:keywords></url>'
    + '<url><news:title>Meta ships Muse Spark update for coding agents</news:title>'
    + '<news:keywords>Meta, Muse, Muse Spark, AI, SIREN</news:keywords></url>'
    + '</urlset>';
  const museSparkLags = newsKeywordLags(museSparkLagXml);
  if (!museSparkLags.some((r) => r.lab === 'Muse Spark')
    || !museSparkLags.some((r) => r.lab === 'Muse Spark Open')) {
    throw new Error(`newsKeywordLags expected Muse Spark / Muse Spark Open lag: ${JSON.stringify(museSparkLags)}`);
  }
  if (museSparkLags.filter((r) => /coding agents/i.test(r.title)).some((r) => r.lab === 'Muse Spark')) {
    throw new Error('newsKeywordLags should not flag Muse Spark when keywords include it');
  }
  // FINDABILITY #224 — catch tip wipe of Tencent Cloud needles.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Tencent Cloud')) {
    throw new Error('probe labs missing Tencent Cloud');
  }
  const tencentCloudLagXml = '<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
    + '<url><news:title>Researchers Trace Rogue AI Agent Fleet on Tencent Cloud to Alibaba Probe</news:title>'
    + '<news:keywords>Tencent, Alibaba, Qwen, AI, SIREN</news:keywords></url>'
    + '<url><news:title>AI agents on Tencent Cloud try to break into Alibaba’s Amap: researchers</news:title>'
    + '<news:keywords>Tencent, Tencent Cloud, Alibaba, AI, SIREN</news:keywords></url>'
    + '</urlset>';
  const tencentCloudLags = newsKeywordLags(tencentCloudLagXml);
  if (!tencentCloudLags.some((r) => r.lab === 'Tencent Cloud')) {
    throw new Error(`newsKeywordLags expected Tencent Cloud lag: ${JSON.stringify(tencentCloudLags)}`);
  }
  if (tencentCloudLags.filter((r) => /Amap/i.test(r.title)).some((r) => r.lab === 'Tencent Cloud')) {
    throw new Error('newsKeywordLags should not flag Tencent Cloud when keywords include it');
  }
  // FINDABILITY #226 — catch tip wipe of CERT-In needles.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('CERT-In')) {
    throw new Error('probe labs missing CERT-In');
  }
  const certInLagXml = '<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
    + '<url><news:title>AI-Powered Cyberattacks Hit Indian Firms in Hours, CERT-In Flags Growing Threat</news:title>'
    + '<news:keywords>Google, AI, SIREN, attention</news:keywords></url>'
    + '<url><news:title>CERT-In warns AI agents accessed Indian firms’ live systems, sensitive data</news:title>'
    + '<news:keywords>CERT-In, AI agents, India AI, AI, SIREN</news:keywords></url>'
    + '</urlset>';
  const certInLags = newsKeywordLags(certInLagXml);
  if (!certInLags.some((r) => r.lab === 'CERT-In')) {
    throw new Error(`newsKeywordLags expected CERT-In lag: ${JSON.stringify(certInLags)}`);
  }
  if (certInLags.filter((r) => /live systems/i.test(r.title)).some((r) => r.lab === 'CERT-In')) {
    throw new Error('newsKeywordLags should not flag CERT-In when keywords include it');
  }
  // FINDABILITY #228 — catch tip wipe of DeepSeek V4.1 Flash needles.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('DeepSeek V4.1 Flash')) {
    throw new Error('probe labs missing DeepSeek V4.1 Flash');
  }
  const dsFlashLagXml = '<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
    + '<url><news:title>OpenCode Makes DeepSeek V4.1 Flash Free to Use, With a 200K Context Window</news:title>'
    + '<news:keywords>DeepSeek, DeepSeek V4.1, AI, SIREN</news:keywords></url>'
    + '<url><news:title>Muse Spark Open vs DeepSeek V4.1 Flash: Same Score, Triple the Cost</news:title>'
    + '<news:keywords>DeepSeek, DeepSeek V4.1, DeepSeek V4.1 Flash, Muse Spark, AI, SIREN</news:keywords></url>'
    + '</urlset>';
  const dsFlashLags = newsKeywordLags(dsFlashLagXml);
  if (!dsFlashLags.some((r) => r.lab === 'DeepSeek V4.1 Flash')) {
    throw new Error(`newsKeywordLags expected DeepSeek V4.1 Flash lag: ${JSON.stringify(dsFlashLags)}`);
  }
  if (dsFlashLags.filter((r) => /Same Score/i.test(r.title)).some((r) => r.lab === 'DeepSeek V4.1 Flash')) {
    throw new Error('newsKeywordLags should not flag DeepSeek V4.1 Flash when keywords include it');
  }
  // FINDABILITY #431 — non-contiguous DeepSeek … V4.1 Flash title forms lag
  // when keywords omit the product needle (mirror Trends #418 flex).
  const dsFlashGapLagXml = '<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
    + '<url><news:title>DeepSeek Launches V4.1-Flash-1017, Beats Claude Opus 5 On Some Benchmarks</news:title>'
    + '<news:keywords>DeepSeek, DeepSeek-R, Google, AI, SIREN</news:keywords></url>'
    + '<url><news:title>DeepSeek API Key Setup: V4.1 Flash in 13 Steps [2026]</news:title>'
    + '<news:keywords>DeepSeek, DeepSeek V4.1 Flash, AI, SIREN</news:keywords></url>'
    + '<url><news:title>DeepSeek V4.1 ships for enterprise agents</news:title>'
    + '<news:keywords>DeepSeek, DeepSeek V4.1, AI, SIREN</news:keywords></url>'
    + '</urlset>';
  const dsFlashGapLags = newsKeywordLags(dsFlashGapLagXml);
  if (!dsFlashGapLags.some((r) => r.lab === 'DeepSeek V4.1 Flash' && /Launches/i.test(r.title))) {
    throw new Error(`newsKeywordLags expected non-contig DeepSeek V4.1 Flash lag: ${JSON.stringify(dsFlashGapLags)}`);
  }
  if (dsFlashGapLags.filter((r) => /API Key Setup/i.test(r.title)).some((r) => r.lab === 'DeepSeek V4.1 Flash')) {
    throw new Error('newsKeywordLags should not flag non-contig Flash when keywords include it');
  }
  if (dsFlashGapLags.filter((r) => /ships for enterprise/i.test(r.title)).some((r) => r.lab === 'DeepSeek V4.1 Flash')) {
    throw new Error('newsKeywordLags must not treat bare DeepSeek V4.1 (no Flash) as Flash');
  }
  // FINDABILITY #231 — catch tip wipe of Nemotron 3.5 Super VL needles.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Nemotron 3.5 Super VL')) {
    throw new Error('probe labs missing Nemotron 3.5 Super VL');
  }
  const nemotronVlLagXml = '<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
    + '<url><news:title>Nemotron 3.5 Super VL vs Microsoft Mage-VL: two video paths</news:title>'
    + '<news:keywords>Nemotron, Microsoft, AI, SIREN</news:keywords></url>'
    + '<url><news:title>Nemotron 3.5 Super VL vs Qwen3.8 Omni Flash: You Cannot Have the Ears and the Weights</news:title>'
    + '<news:keywords>Nemotron, Nemotron 3.5 Super VL, Qwen, AI, SIREN</news:keywords></url>'
    + '</urlset>';
  const nemotronVlLags = newsKeywordLags(nemotronVlLagXml);
  if (!nemotronVlLags.some((r) => r.lab === 'Nemotron 3.5 Super VL')) {
    throw new Error(`newsKeywordLags expected Nemotron 3.5 Super VL lag: ${JSON.stringify(nemotronVlLags)}`);
  }
  if (nemotronVlLags.filter((r) => /Ears and the Weights/i.test(r.title)).some((r) => r.lab === 'Nemotron 3.5 Super VL')) {
    throw new Error('newsKeywordLags should not flag Nemotron 3.5 Super VL when keywords include it');
  }
  // FINDABILITY #234 — catch tip wipe of Nemotron 3.5 Bolt (bare Bolt) needles.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Bolt')) {
    throw new Error('probe labs missing Bolt');
  }
  const boltLagXml = '<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
    + '<url><news:title>Nvidia/Nvidia-Nemotron-3.5-Bolt-74B-A9B-24GB</news:title>'
    + '<news:keywords>NVIDIA, Nemotron, NVDA, AI, SIREN</news:keywords></url>'
    + '<url><news:title>NVIDIA Expands Nemotron Family With Highest Efficiency Super VL and Bolt Models</news:title>'
    + '<news:keywords>NVIDIA, Nemotron, Nemotron 3.5 Super VL, Bolt, AI, SIREN</news:keywords></url>'
    + '</urlset>';
  const boltLags = newsKeywordLags(boltLagXml);
  if (!boltLags.some((r) => r.lab === 'Bolt')) {
    throw new Error(`newsKeywordLags expected Bolt lag: ${JSON.stringify(boltLags)}`);
  }
  if (boltLags.filter((r) => /Bolt Models/i.test(r.title)).some((r) => r.lab === 'Bolt')) {
    throw new Error('newsKeywordLags should not flag Bolt when keywords include it');
  }
  // FINDABILITY #236 — catch tip wipe of DeepSeek V4 Pro needles.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('DeepSeek V4 Pro')) {
    throw new Error('probe labs missing DeepSeek V4 Pro');
  }
  const dsV4ProLagXml = '<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
    + '<url><news:title>Nemotron 3.5 Bolt 74B vs DeepSeek V4 Pro: 24GB vs 1.6T</news:title>'
    + '<news:keywords>DeepSeek, Nemotron, Bolt, AI, SIREN</news:keywords></url>'
    + '<url><news:title>Nemotron 3.5 Super VL vs DeepSeek V4 Pro: pixel economics</news:title>'
    + '<news:keywords>DeepSeek, Nemotron, Nemotron 3.5 Super VL, DeepSeek V4 Pro, AI, SIREN</news:keywords></url>'
    + '</urlset>';
  const dsV4ProLags = newsKeywordLags(dsV4ProLagXml);
  if (!dsV4ProLags.some((r) => r.lab === 'DeepSeek V4 Pro')) {
    throw new Error(`newsKeywordLags expected DeepSeek V4 Pro lag: ${JSON.stringify(dsV4ProLags)}`);
  }
  if (dsV4ProLags.filter((r) => /pixel economics/i.test(r.title)).some((r) => r.lab === 'DeepSeek V4 Pro')) {
    throw new Error('newsKeywordLags should not flag DeepSeek V4 Pro when keywords include it');
  }
  // FINDABILITY #238 — catch tip wipe of Qwen3.8 needles.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Qwen3.8')) {
    throw new Error('probe labs missing Qwen3.8');
  }
  const qwen38LagXml = '<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
    + '<url><news:title>Nemotron 3.5 Super VL vs Qwen3.8 Max: Open vs Hosted</news:title>'
    + '<news:keywords>Nemotron, Qwen, Nemotron 3.5 Super VL, AI, SIREN</news:keywords></url>'
    + '<url><news:title>Nemotron 3.5 Super VL vs Qwen3.8 Omni Flash: You Cannot Have the Ears and the Weights</news:title>'
    + '<news:keywords>Nemotron, Qwen, Nemotron 3.5 Super VL, Qwen3.8, AI, SIREN</news:keywords></url>'
    + '</urlset>';
  const qwen38Lags = newsKeywordLags(qwen38LagXml);
  if (!qwen38Lags.some((r) => r.lab === 'Qwen3.8')) {
    throw new Error(`newsKeywordLags expected Qwen3.8 lag: ${JSON.stringify(qwen38Lags)}`);
  }
  if (qwen38Lags.filter((r) => /Ears and the Weights/i.test(r.title)).some((r) => r.lab === 'Qwen3.8')) {
    throw new Error('newsKeywordLags should not flag Qwen3.8 when keywords include it');
  }
  // FINDABILITY #241 — catch tip wipe of Airship needles.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Airship')) {
    throw new Error('probe labs missing Airship');
  }
  const airshipLagXml = '<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
    + '<url><news:title>Airship Achieves ISO 42001 Certification, Clearing the Path for Responsible Enterprise AI</news:title>'
    + '<news:keywords>Google, AI, artificial intelligence, SIREN, attention, press, gnews-ai</news:keywords></url>'
    + '<url><news:title>Airship AI Holdings Inc. Cl A (AISP) Stock Price Today - The Wall Street Journal</news:title>'
    + '<news:keywords>Airship, Google, AI, artificial intelligence, SIREN, AI in finance, attention, press</news:keywords></url>'
    + '</urlset>';
  const airshipLags = newsKeywordLags(airshipLagXml);
  if (!airshipLags.some((r) => r.lab === 'Airship')) {
    throw new Error(`newsKeywordLags expected Airship lag: ${JSON.stringify(airshipLags)}`);
  }
  if (airshipLags.filter((r) => /AISP/i.test(r.title)).some((r) => r.lab === 'Airship')) {
    throw new Error('newsKeywordLags should not flag Airship when keywords include it');
  }
  // FINDABILITY #250 — catch tip wipe of ModelSphere needles.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('ModelSphere')) {
    throw new Error('probe labs missing ModelSphere');
  }
  const modelSphereLagXml = '<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
    + '<url><news:title>4Paradigm and RiseUnion Open-Source ModelSphere for Heterogeneous LLM Serving</news:title>'
    + '<news:keywords>Google, AI, artificial intelligence, SIREN, attention, press, gnews-ai</news:keywords></url>'
    + '<url><news:title>Phancy and RiseUnion Launch ModelSphere, an Open-Source, One-Stop Production-Grade AI Deployment Platform</news:title>'
    + '<news:keywords>ModelSphere, Google, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
    + '</urlset>';
  const modelSphereLags = newsKeywordLags(modelSphereLagXml);
  if (!modelSphereLags.some((r) => r.lab === 'ModelSphere')) {
    throw new Error(`newsKeywordLags expected ModelSphere lag: ${JSON.stringify(modelSphereLags)}`);
  }
  if (modelSphereLags.filter((r) => /Phancy/i.test(r.title)).some((r) => r.lab === 'ModelSphere')) {
    throw new Error('newsKeywordLags should not flag ModelSphere when keywords include it');
  }
  // FINDABILITY #256 — catch tip wipe of Krea / Krea 3 needles.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Krea') || !NEWS_KEYWORD_PROBE_LABS.includes('Krea 3')) {
    throw new Error('probe labs missing Krea / Krea 3');
  }
  const kreaLagXml = '<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
    + '<url><news:title>Krea 3 vs Qwen Image 3.0: The Open Line Stopped Here</news:title>'
    + '<news:keywords>Alibaba Qwen, Qwen, Google, AI, artificial intelligence, SIREN, attention, press, gnews-ai</news:keywords></url>'
    + '<url><news:title>Krea 3 – Frontier Image Model 4× faster than Nano Banana Pro</news:title>'
    + '<news:keywords>Krea, Krea 3, Nano Banana, Google, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
    + '</urlset>';
  const kreaLags = newsKeywordLags(kreaLagXml);
  if (!kreaLags.some((r) => r.lab === 'Krea' || r.lab === 'Krea 3')) {
    throw new Error(`newsKeywordLags expected Krea lag: ${JSON.stringify(kreaLags)}`);
  }
  if (kreaLags.filter((r) => /Frontier Image Model/i.test(r.title)).some((r) => r.lab === 'Krea' || r.lab === 'Krea 3')) {
    throw new Error('newsKeywordLags should not flag Krea when keywords include it');
  }
  // FINDABILITY #258 — catch tip wipe of Flux 3 needles.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Flux 3')) {
    throw new Error('probe labs missing Flux 3');
  }
  const flux3LagXml = '<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
    + '<url><news:title>Black Forest Labs\' open-weights image model FLUX 3 Image Klein runs on consumer GPUs</news:title>'
    + '<news:keywords>Black Forest Labs, Google, AI, artificial intelligence, SIREN, attention, press, gnews-ai</news:keywords></url>'
    + '<url><news:title>Flux 3 Image Klein</news:title>'
    + '<news:keywords>Flux 3, Black Forest Labs, Google, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
    + '</urlset>';
  const flux3Lags = newsKeywordLags(flux3LagXml);
  if (!flux3Lags.some((r) => r.lab === 'Flux 3')) {
    throw new Error(`newsKeywordLags expected Flux 3 lag: ${JSON.stringify(flux3Lags)}`);
  }
  if (flux3Lags.filter((r) => /^Flux 3 Image Klein$/i.test(r.title)).some((r) => r.lab === 'Flux 3')) {
    throw new Error('newsKeywordLags should not flag Flux 3 when keywords include it');
  }
  // FINDABILITY #260 — catch tip wipe of Together AI needles.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Together AI')) {
    throw new Error('probe labs missing Together AI');
  }
  const togetherAiLagXml = '<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
    + '<url><news:title>New paper from Stanford, Together AI, UIUC, and Meta introduces Hybrid Reasoning Agents</news:title>'
    + '<news:keywords>Stanford, Meta, Google, AI, artificial intelligence, SIREN, attention, press, gnews-ai</news:keywords></url>'
    + '<url><news:title>Meta Muse Spark Open is live on Together AI</news:title>'
    + '<news:keywords>Together AI, Muse Spark Open, Meta, Google, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
    + '</urlset>';
  const togetherAiLags = newsKeywordLags(togetherAiLagXml);
  if (!togetherAiLags.some((r) => r.lab === 'Together AI')) {
    throw new Error(`newsKeywordLags expected Together AI lag: ${JSON.stringify(togetherAiLags)}`);
  }
  if (togetherAiLags.filter((r) => /Muse Spark Open is live/i.test(r.title)).some((r) => r.lab === 'Together AI')) {
    throw new Error('newsKeywordLags should not flag Together AI when keywords include it');
  }
  // FINDABILITY #267 — catch tip wipe of Terafab needles.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Terafab')) {
    throw new Error('probe labs missing Terafab');
  }
  const terafabLagXml = '<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
    + '<url><news:title>TSMC Weighs Texas Expansion, Holds Talks on Musk’s Terafab</news:title>'
    + '<news:keywords>TSMC, Google, AI, artificial intelligence, SIREN, AI chips, compute, press, wires-ai</news:keywords></url>'
    + '<url><news:title>TSMC Open to Working With Terafab But Must Control Plants</news:title>'
    + '<news:keywords>Terafab, TSMC, Google, AI, artificial intelligence, SIREN, AI chips, compute, press</news:keywords></url>'
    + '</urlset>';
  const terafabLags = newsKeywordLags(terafabLagXml);
  if (!terafabLags.some((r) => r.lab === 'Terafab')) {
    throw new Error(`newsKeywordLags expected Terafab lag: ${JSON.stringify(terafabLags)}`);
  }
  if (terafabLags.filter((r) => /Must Control Plants/i.test(r.title)).some((r) => r.lab === 'Terafab')) {
    throw new Error('newsKeywordLags should not flag Terafab when keywords include it');
  }
  // FINDABILITY #269 — catch tip wipe of Cohere needles.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Cohere')) {
    throw new Error('probe labs missing Cohere');
  }
  const cohereLagXml = '<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
    + '<url><news:title>Cohere is Buying Its Customers Better Cybersecurity</news:title>'
    + '<news:keywords>Google, AI, artificial intelligence, SIREN, Cybersecurity, attention, press, gnews-ai</news:keywords></url>'
    + '<url><news:title>Cohere to acquire AISLE to advance cyber-resilient sovereign AI</news:title>'
    + '<news:keywords>Cohere, Google, AI, artificial intelligence, SIREN, AI security, attention, press</news:keywords></url>'
    + '</urlset>';
  const cohereLags = newsKeywordLags(cohereLagXml);
  if (!cohereLags.some((r) => r.lab === 'Cohere')) {
    throw new Error(`newsKeywordLags expected Cohere lag: ${JSON.stringify(cohereLags)}`);
  }
  if (cohereLags.filter((r) => /acquire AISLE/i.test(r.title)).some((r) => r.lab === 'Cohere')) {
    throw new Error('newsKeywordLags should not flag Cohere when keywords include it');
  }
  // FINDABILITY #271 — catch tip wipe of Accenture needles.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Accenture')) {
    throw new Error('probe labs missing Accenture');
  }
  const accentureLagXml = '<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
    + '<url><news:title>Some Accenture employees spent $1,000 a month on Anthropic’s Claude AI, the company will now pay only $29</news:title>'
    + '<news:keywords>Anthropic, Claude, Google, AI, artificial intelligence, SIREN, attention, press, gnews-ai</news:keywords></url>'
    + '<url><news:title>Accenture Tells Employees They Can Now Spend Only $29 on Claude Per Month</news:title>'
    + '<news:keywords>Accenture, Claude, Anthropic, Google, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
    + '</urlset>';
  const accentureLags = newsKeywordLags(accentureLagXml);
  if (!accentureLags.some((r) => r.lab === 'Accenture')) {
    throw new Error(`newsKeywordLags expected Accenture lag: ${JSON.stringify(accentureLags)}`);
  }
  if (accentureLags.filter((r) => /Spend Only \$29/i.test(r.title)).some((r) => r.lab === 'Accenture')) {
    throw new Error('newsKeywordLags should not flag Accenture when keywords include it');
  }
  // FINDABILITY #273 — catch tip wipe of G7 needles.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('G7')) {
    throw new Error('probe labs missing G7');
  }
  const g7LagXml = '<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
    + '<url><news:title>G7 Finance Leaders Approve AI Cyberattack Drills</news:title>'
    + '<news:keywords>Google, AI, artificial intelligence, SIREN, attention, press, wires-ai</news:keywords></url>'
    + '<url><news:title>G7 Will Stage Fake AI Cyberattacks on Banks to Find the Cracks First</news:title>'
    + '<news:keywords>G7, Google, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
    + '</urlset>';
  const g7Lags = newsKeywordLags(g7LagXml);
  if (!g7Lags.some((r) => r.lab === 'G7')) {
    throw new Error(`newsKeywordLags expected G7 lag: ${JSON.stringify(g7Lags)}`);
  }
  if (g7Lags.filter((r) => /Stage Fake AI/i.test(r.title)).some((r) => r.lab === 'G7')) {
    throw new Error('newsKeywordLags should not flag G7 when keywords include it');
  }
  // FINDABILITY #275 — catch tip wipe of Bee Frontier / Bee Eclipse needles.
  for (const lab of ['Bee Frontier', 'Bee Eclipse']) {
    if (!NEWS_KEYWORD_PROBE_LABS.includes(lab)) {
      throw new Error(`probe labs missing ${lab}`);
    }
  }
  const beeLagXml = '<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
    + '<url><news:title>Amazon Unveils Bee Frontier and Bee Eclipse AI Listening Devices</news:title>'
    + '<news:keywords>Amazon, Google, Bee, AI, artificial intelligence, SIREN, attention, press, gnews-ai</news:keywords></url>'
    + '<url><news:title>Amazon launches two AI wearables, the $75 Bee Frontier wristband and $100 Bee Eclipse magnetic phone-attachment recorder</news:title>'
    + '<news:keywords>Amazon, Bee Frontier, Bee Eclipse, Bee, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
    + '</urlset>';
  const beeLags = newsKeywordLags(beeLagXml);
  if (!beeLags.some((r) => r.lab === 'Bee Frontier') || !beeLags.some((r) => r.lab === 'Bee Eclipse')) {
    throw new Error(`newsKeywordLags expected Bee Frontier/Eclipse lag: ${JSON.stringify(beeLags)}`);
  }
  if (beeLags.filter((r) => /wristband/i.test(r.title)).some((r) => r.lab === 'Bee Frontier' || r.lab === 'Bee Eclipse')) {
    throw new Error('newsKeywordLags should not flag Bee Frontier/Eclipse when keywords include them');
  }
  // FINDABILITY #277 — catch tip wipe of Surface Laptop Ultra needle.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Surface Laptop Ultra')) {
    throw new Error('probe labs missing Surface Laptop Ultra');
  }
  const surfaceLagXml = '<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
    + '<url><news:title>Surface Laptop Ultra review: a different kind of MacBook Pro</news:title>'
    + '<news:keywords>Microsoft, Google, Copilot, AI, artificial intelligence, SIREN, attention, press, gnews-ai</news:keywords></url>'
    + '<url><news:title>Running local AI models on Microsoft’s Surface Laptop Ultra: What we found</news:title>'
    + '<news:keywords>Microsoft, Surface Laptop Ultra, Copilot, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
    + '</urlset>';
  const surfaceLags = newsKeywordLags(surfaceLagXml);
  if (!surfaceLags.some((r) => r.lab === 'Surface Laptop Ultra')) {
    throw new Error(`newsKeywordLags expected Surface Laptop Ultra lag: ${JSON.stringify(surfaceLags)}`);
  }
  if (surfaceLags.filter((r) => /local AI models/i.test(r.title)).some((r) => r.lab === 'Surface Laptop Ultra')) {
    throw new Error('newsKeywordLags should not flag Surface Laptop Ultra when keywords include it');
  }
  // FINDABILITY #279 — catch tip wipe of RTX Spark needle.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('RTX Spark')) {
    throw new Error('probe labs missing RTX Spark');
  }
  const rtxLagXml = '<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
    + '<url><news:title>NVIDIA RTX Spark Laptops Launch Worldwide With Local AI Agent Support</news:title>'
    + '<news:keywords>NVIDIA, Google, NVDA, AI, artificial intelligence, SIREN, attention, press, gnews-ai</news:keywords></url>'
    + '<url><news:title>NVIDIA RTX Spark PCs Available Today — A New Beginning for Windows PCs</news:title>'
    + '<news:keywords>NVIDIA, RTX Spark, NVDA, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
    + '</urlset>';
  const rtxLags = newsKeywordLags(rtxLagXml);
  if (!rtxLags.some((r) => r.lab === 'RTX Spark')) {
    throw new Error(`newsKeywordLags expected RTX Spark lag: ${JSON.stringify(rtxLags)}`);
  }
  if (rtxLags.filter((r) => /Available Today/i.test(r.title)).some((r) => r.lab === 'RTX Spark')) {
    throw new Error('newsKeywordLags should not flag RTX Spark when keywords include it');
  }
  // FINDABILITY #282 — catch tip wipe of Qwen 4 Max needle.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Qwen 4 Max')) {
    throw new Error('probe labs missing Qwen 4 Max');
  }
  const qwen4MaxLagXml = '<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
    + '<url><news:title>Claude Opus 5.5 vs Qwen 4 Max: who publishes speed?</news:title>'
    + '<news:keywords>Alibaba Qwen, Claude, Qwen, Google, Claude Opus 5.5, Opus 5.5, AI, artificial intelligence, SIREN, Claude Opus, attention, press</news:keywords></url>'
    + '<url><news:title>Muse Spark vs Qwen 4 Max: one side has no endpoint</news:title>'
    + '<news:keywords>Alibaba Qwen, Muse Spark, Qwen, Qwen 4 Max, Google, Muse, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
    + '</urlset>';
  const qwen4MaxLags = newsKeywordLags(qwen4MaxLagXml);
  if (!qwen4MaxLags.some((r) => r.lab === 'Qwen 4 Max')) {
    throw new Error(`newsKeywordLags expected Qwen 4 Max lag: ${JSON.stringify(qwen4MaxLags)}`);
  }
  if (qwen4MaxLags.filter((r) => /no endpoint/i.test(r.title)).some((r) => r.lab === 'Qwen 4 Max')) {
    throw new Error('newsKeywordLags should not flag Qwen 4 Max when keywords include it');
  }
  // FINDABILITY #286 — catch tip wipe of Beam needle.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Beam')) {
    throw new Error('probe labs missing Beam');
  }
  const beamLagXml = '<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
    + '<url><news:title>Reflection\'s Beam aims to undercut Chinese open models with fewer tokens, not cheaper tokens</news:title>'
    + '<news:keywords>Google, AI, artificial intelligence, SIREN, China AI, Open models, attention, press, gnews-ai</news:keywords></url>'
    + '<url><news:title>Welcome Beam: a 501B open model you can own, customize, and scale</news:title>'
    + '<news:keywords>Beam, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
    + '</urlset>';
  const beamLags = newsKeywordLags(beamLagXml);
  if (!beamLags.some((r) => r.lab === 'Beam')) {
    throw new Error(`newsKeywordLags expected Beam lag: ${JSON.stringify(beamLags)}`);
  }
  if (beamLags.filter((r) => /Welcome Beam/i.test(r.title)).some((r) => r.lab === 'Beam')) {
    throw new Error('newsKeywordLags should not flag Beam when keywords include it');
  }
  // FINDABILITY #290 — catch tip wipe of Qwen3.8-27B needle.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Qwen3.8-27B')) {
    throw new Error('probe labs missing Qwen3.8-27B');
  }
  const qwen3827bLagXml = '<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
    + '<url><news:title>Hy-Memory-30B-A3B vs Qwen3.8-27B : usage vs capital</news:title>'
    + '<news:keywords>Qwen, Google, Qwen3.8, AI, artificial intelligence, SIREN, attention, press, gnews-ai</news:keywords></url>'
    + '<url><news:title>ZwZ2-9B vs. Qwen3.8-27B: the 9B slot Qwen left open</news:title>'
    + '<news:keywords>Qwen3.8-27B, Qwen, Qwen3.8, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
    + '</urlset>';
  const qwen3827bLags = newsKeywordLags(qwen3827bLagXml);
  if (!qwen3827bLags.some((r) => r.lab === 'Qwen3.8-27B')) {
    throw new Error(`newsKeywordLags expected Qwen3.8-27B lag: ${JSON.stringify(qwen3827bLags)}`);
  }
  if (qwen3827bLags.filter((r) => /9B slot/i.test(r.title)).some((r) => r.lab === 'Qwen3.8-27B')) {
    throw new Error('newsKeywordLags should not flag Qwen3.8-27B when keywords include it');
  }
  // FINDABILITY #292 — catch tip wipe of Mac Studios needle.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Mac Studios')) {
    throw new Error('probe labs missing Mac Studios');
  }
  const macStudiosLagXml = '<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
    + '<url><news:title>Meta Muse Spark Open brings 816B-parameter AI to Mac Studios</news:title>'
    + '<news:keywords>Muse Spark, Google, Meta, Muse, Muse Spark Open, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
    + '<url><news:title>Meta releases Muse Spark Open: it runs on two Mac Studios</news:title>'
    + '<news:keywords>Mac Studios, Muse Spark, Meta, Muse, Muse Spark Open, AI, artificial intelligence, SIREN</news:keywords></url>'
    + '</urlset>';
  const macStudiosLags = newsKeywordLags(macStudiosLagXml);
  if (!macStudiosLags.some((r) => r.lab === 'Mac Studios')) {
    throw new Error(`newsKeywordLags expected Mac Studios lag: ${JSON.stringify(macStudiosLags)}`);
  }
  if (macStudiosLags.filter((r) => /two Mac Studios/i.test(r.title)).some((r) => r.lab === 'Mac Studios')) {
    throw new Error('newsKeywordLags should not flag Mac Studios when keywords include it');
  }
  // FINDABILITY #294 — catch tip wipe of singular Mac Studio needle.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Mac Studio')) {
    throw new Error('probe labs missing Mac Studio');
  }
  const macStudioLagXml = '<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
    + '<url><news:title>Apple and Meta Team Up to Run Muse Local AI Model on Mac Studio</news:title>'
    + '<news:keywords>Google, Meta, Apple, Muse, Apple Intelligence, AI, artificial intelligence, SIREN, Local AI, attention, press</news:keywords></url>'
    + '<url><news:title>Meta Muse Spark Open brings 816B-parameter AI to Mac Studios</news:title>'
    + '<news:keywords>Mac Studios, Muse Spark, Meta, Muse, AI, artificial intelligence, SIREN</news:keywords></url>'
    + '</urlset>';
  const macStudioLags = newsKeywordLags(macStudioLagXml);
  if (!macStudioLags.some((r) => r.lab === 'Mac Studio')) {
    throw new Error(`newsKeywordLags expected Mac Studio lag: ${JSON.stringify(macStudioLags)}`);
  }
  // Plural Mac Studios titles must not false-flag the singular needle.
  if (macStudioLags.filter((r) => /Mac Studios/i.test(r.title)).some((r) => r.lab === 'Mac Studio')) {
    throw new Error('newsKeywordLags should not flag Mac Studio on plural Mac Studios titles');
  }
  // FINDABILITY #298 — catch tip wipe of Vercel needle.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Vercel')) {
    throw new Error('probe labs missing Vercel');
  }
  const vercelLagXml = '<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
    + '<url><news:title>Vercel data shows Jev posts fastest early AI model adoption</news:title>'
    + '<news:keywords>Jev, Google, AI, artificial intelligence, SIREN, attention, press, gnews-ai</news:keywords></url>'
    + '<url><news:title>Jev is Vercel\u2019s fastest-adopted AI model ever</news:title>'
    + '<news:keywords>Vercel, Jev, OpenRouter, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
    + '</urlset>';
  const vercelLags = newsKeywordLags(vercelLagXml);
  if (!vercelLags.some((r) => r.lab === 'Vercel')) {
    throw new Error(`newsKeywordLags expected Vercel lag: ${JSON.stringify(vercelLags)}`);
  }
  if (vercelLags.filter((r) => /fastest-adopted/i.test(r.title)).some((r) => r.lab === 'Vercel')) {
    throw new Error('newsKeywordLags should not flag Vercel when keywords include it');
  }
  // FINDABILITY #302 — catch tip wipe of Elorian needle.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Elorian')) {
    throw new Error('probe labs missing Elorian');
  }
  const elorianLagXml = '<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
    + '<url><news:title>Elorian launches Glimpse, an AI model built to reason in pictures</news:title>'
    + '<news:keywords>Google, AI, artificial intelligence, SIREN, attention, press, gnews-ai</news:keywords></url>'
    + '<url><news:title>Elorian\u2019s first AI model wants to reason with images, not just about them</news:title>'
    + '<news:keywords>Elorian, GPT, GPT-6 Astra, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
    + '</urlset>';
  const elorianLags = newsKeywordLags(elorianLagXml);
  if (!elorianLags.some((r) => r.lab === 'Elorian')) {
    throw new Error(`newsKeywordLags expected Elorian lag: ${JSON.stringify(elorianLags)}`);
  }
  if (elorianLags.filter((r) => /reason with images/i.test(r.title)).some((r) => r.lab === 'Elorian')) {
    throw new Error('newsKeywordLags should not flag Elorian when keywords include it');
  }
  // FINDABILITY #304 — catch tip wipe of Dell needle.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Dell')) {
    throw new Error('probe labs missing Dell');
  }
  const dellLagXml = '<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
    + '<url><news:title>How Dell Transformed From PC King to AI Infrastructure Giant</news:title>'
    + '<news:keywords>Google, AI, artificial intelligence, SIREN, AI infrastructure, attention, press, wires-ai</news:keywords></url>'
    + '<url><news:title>Hewlett Packard Enterprise Falls 5% as AI Financing Worries Extend Hardware Selloff; Super Micro Sinks 7%, Dell Drops 3%</news:title>'
    + '<news:keywords>Dell, Supermicro, Google, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
    + '</urlset>';
  const dellLags = newsKeywordLags(dellLagXml);
  if (!dellLags.some((r) => r.lab === 'Dell')) {
    throw new Error(`newsKeywordLags expected Dell lag: ${JSON.stringify(dellLags)}`);
  }
  if (dellLags.filter((r) => /Dell Drops/i.test(r.title)).some((r) => r.lab === 'Dell')) {
    throw new Error('newsKeywordLags should not flag Dell when keywords include it');
  }
  // FINDABILITY #306 — catch tip wipe of NYC Council needle.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('NYC Council')) {
    throw new Error('probe labs missing NYC Council');
  }
  // FINDABILITY #310 — GPT-6 Astra space-form titles need flex match + probe.
  for (const lab of ['GPT-6 Astra', 'GPT-6.1 Astra']) {
    if (!NEWS_KEYWORD_PROBE_LABS.includes(lab)) throw new Error(`probe labs missing ${lab}`);
  }
  const astraSpaceLagXml = '<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
    + '<url><news:title>It took an octillion calculations to train GPT 6 Astra</news:title>'
    + '<news:keywords>GPT, AI, artificial intelligence, SIREN, attention, forum</news:keywords></url>'
    + '<url><news:title>GPT-6 Astra solves physics research problems</news:title>'
    + '<news:keywords>GPT-6 Astra, GPT, AI, artificial intelligence, SIREN</news:keywords></url>'
    + '</urlset>';
  const astraSpaceLags = newsKeywordLags(astraSpaceLagXml);
  if (!astraSpaceLags.some((r) => r.lab === 'GPT-6 Astra' && /GPT 6 Astra/i.test(r.title))) {
    throw new Error(`newsKeywordLags expected GPT-6 Astra space-form lag: ${JSON.stringify(astraSpaceLags)}`);
  }
  if (astraSpaceLags.some((r) => /solves physics/i.test(r.title) && r.lab === 'GPT-6 Astra')) {
    throw new Error('newsKeywordLags should not flag GPT-6 Astra when keywords include it');
  }
  // FINDABILITY #388 — Qwen 3.8 spaced titles need letter↔digit flex on Qwen3.8.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Qwen3.8')) {
    throw new Error('probe labs missing Qwen3.8');
  }
  const qwen38SpaceLagXml = '<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
    + '<url><news:title>Dory 1.0 4B vs Qwen 3.8: a 4B against a three-tier line</news:title>'
    + '<news:keywords>Dory 1.0, Nemotron, Qwen, NVIDIA, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
    + '<url><news:title>Nemotron 3.5 Super VL vs Qwen3.8 Omni Flash: You Cannot Have the Ears and the Weights</news:title>'
    + '<news:keywords>Nemotron, Qwen, Nemotron 3.5 Super VL, Qwen3.8, AI, SIREN</news:keywords></url>'
    + '</urlset>';
  const qwen38SpaceLags = newsKeywordLags(qwen38SpaceLagXml);
  if (!qwen38SpaceLags.some((r) => r.lab === 'Qwen3.8' && /Qwen 3\.8/i.test(r.title))) {
    throw new Error(`newsKeywordLags expected Qwen3.8 spaced-form lag: ${JSON.stringify(qwen38SpaceLags)}`);
  }
  if (qwen38SpaceLags.filter((r) => /Ears and the Weights/i.test(r.title)).some((r) => r.lab === 'Qwen3.8')) {
    throw new Error('newsKeywordLags should not flag Qwen3.8 when keywords include it');
  }
  const nycCouncilLagXml = '<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
    + '<url><news:title>Elon Musk\'s SpaceX to testify at NYC Council meeting on AI safety</news:title>'
    + '<news:keywords>SpaceX, Google, Elon Musk, Starshield, AI, artificial intelligence, SIREN, AI safety, attention, press</news:keywords></url>'
    + '<url><news:title>NYC Council hearing testimony from SpaceX about AI safety</news:title>'
    + '<news:keywords>NYC Council, SpaceX, Google, Starshield, AI, artificial intelligence, SIREN, AI safety, attention, press</news:keywords></url>'
    + '</urlset>';
  const nycCouncilLags = newsKeywordLags(nycCouncilLagXml);
  if (!nycCouncilLags.some((r) => r.lab === 'NYC Council')) {
    throw new Error(`newsKeywordLags expected NYC Council lag: ${JSON.stringify(nycCouncilLags)}`);
  }
  if (nycCouncilLags.filter((r) => /hearing testimony/i.test(r.title)).some((r) => r.lab === 'NYC Council')) {
    throw new Error('newsKeywordLags should not flag NYC Council when keywords include it');
  }
  // FINDABILITY #320 — catch tip wipe of PS5 needle.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('PS5')) {
    throw new Error('probe labs missing PS5');
  }
  const ps5LagXml = '<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
    + '<url><news:title>Llama.cpp on a jailbroken PS5: run any GGUF model natively on the console</news:title>'
    + '<news:keywords>Llama, AI, artificial intelligence, SIREN, Quantization, llama.cpp, GGUF, attention, forum, hn-fresh-ai</news:keywords></url>'
    + '<url><news:title>Jailbroken PS5 Turns into a Local AI Machine with Speeds Above 100 Tokens Per Second</news:title>'
    + '<news:keywords>PS5, Google, AI, artificial intelligence, SIREN, Inference &amp; serving, Local AI, attention, press</news:keywords></url>'
    + '</urlset>';
  const ps5Lags = newsKeywordLags(ps5LagXml);
  if (!ps5Lags.some((r) => r.lab === 'PS5')) {
    throw new Error(`newsKeywordLags expected PS5 lag: ${JSON.stringify(ps5Lags)}`);
  }
  if (ps5Lags.filter((r) => /Local AI Machine/i.test(r.title)).some((r) => r.lab === 'PS5')) {
    throw new Error('newsKeywordLags should not flag PS5 when keywords include it');
  }
  // FINDABILITY #350 — catch tip wipe of PS5s plural companion needle.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('PS5s')) {
    throw new Error('probe labs missing PS5s');
  }
  {
    const ps5sLagXml = '<?xml version="1.0"?><urlset>'
      + '<url><news:title>Jailbroken PS5s can now run local AI models at over 100+ tokens per second</news:title>'
      + '<news:keywords>AI, artificial intelligence, SIREN, GPUs &amp; chips, Inference &amp; serving, Local AI, compute, forum, reddit-artificial</news:keywords></url>'
      + '<url><news:title>Jailbroken PS5s can now run local AI models at over 100+ tokens per second — fork of PS5LM</news:title>'
      + '<news:keywords>PS5s, AI, artificial intelligence, SIREN, GPUs &amp; chips, Inference &amp; serving, Local AI, compute, forum</news:keywords></url>'
      + '</urlset>';
    const ps5sLags = newsKeywordLags(ps5sLagXml);
    if (!ps5sLags.some((r) => r.lab === 'PS5s')) {
      throw new Error(`newsKeywordLags expected PS5s lag: ${JSON.stringify(ps5sLags)}`);
    }
    if (ps5sLags.filter((r) => /PS5LM/i.test(r.title)).some((r) => r.lab === 'PS5s')) {
      throw new Error('newsKeywordLags should not flag PS5s when keywords include it');
    }
    // Singular PS5 title must not lag as PS5s.
    const singularOnly = newsKeywordLags(
      '<?xml version="1.0"?><urlset>'
      + '<url><news:title>Llama.cpp on a jailbroken PS5: run any GGUF model natively on the console</news:title>'
      + '<news:keywords>Llama, PS5, AI, artificial intelligence, SIREN, Quantization, llama.cpp, GGUF, attention, forum</news:keywords></url>'
      + '</urlset>',
    );
    if (singularOnly.some((r) => r.lab === 'PS5s')) {
      throw new Error('newsKeywordLags must not flag PS5s on singular PS5 titles');
    }
  }
  // FINDABILITY #352 — catch tip wipe of Anthropic IPO event needle.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Anthropic IPO')) {
    throw new Error('probe labs missing Anthropic IPO');
  }
  {
    const ipoLagXml = '<?xml version="1.0"?><urlset>'
      + '<url><news:title>Could an Anthropic IPO put your 401(k) at risk? The AI safety debate hits a new dimension.</news:title>'
      + '<news:keywords>Anthropic, Google, Claude, AI, artificial intelligence, SIREN, AI safety, AI fundraising, AI IPOs, compute, press, gnews-ai</news:keywords></url>'
      + '<url><news:title>Anthropic IPO timing, price is major factor for stocks now, says CIO</news:title>'
      + '<news:keywords>Anthropic, Google, Claude, Anthropic IPO, AI, artificial intelligence, SIREN, AI fundraising, AI IPOs, compute, press</news:keywords></url>'
      + '</urlset>';
    const ipoLags = newsKeywordLags(ipoLagXml);
    if (!ipoLags.some((r) => r.lab === 'Anthropic IPO')) {
      throw new Error(`newsKeywordLags expected Anthropic IPO lag: ${JSON.stringify(ipoLags)}`);
    }
    if (ipoLags.filter((r) => /timing, price/i.test(r.title)).some((r) => r.lab === 'Anthropic IPO')) {
      throw new Error('newsKeywordLags should not flag Anthropic IPO when keywords include it');
    }
  }
  // FINDABILITY #354 — catch tip wipe of Flying Roadster product-class needle.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Flying Roadster')) {
    throw new Error('probe labs missing Flying Roadster');
  }
  {
    const flyLagXml = '<?xml version="1.0"?><urlset>'
      + '<url><news:title>Trump, Pichai and Even Altman Praise Tesla’s Flying Roadster EV</news:title>'
      + '<news:keywords>Tesla, Google, Roadster, FSD, AI, artificial intelligence, SIREN, attention, press, wires-ai</news:keywords></url>'
      + '<url><news:title>Five Big Questions About Tesla’s New Flying Roadster</news:title>'
      + '<news:keywords>Tesla, Google, Roadster, Flying Roadster, FSD, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '</urlset>';
    const flyLags = newsKeywordLags(flyLagXml);
    if (!flyLags.some((r) => r.lab === 'Flying Roadster')) {
      throw new Error(`newsKeywordLags expected Flying Roadster lag: ${JSON.stringify(flyLags)}`);
    }
    if (flyLags.filter((r) => /Five Big Questions/i.test(r.title)).some((r) => r.lab === 'Flying Roadster')) {
      throw new Error('newsKeywordLags should not flag Flying Roadster when keywords include it');
    }
    // Bare Roadster title must not lag as Flying Roadster.
    const roadsterOnly = newsKeywordLags(
      '<?xml version="1.0"?><urlset>'
      + '<url><news:title>Tesla unveils its new Roadster sports car, which can thrust itself into the air</news:title>'
      + '<news:keywords>Tesla, Google, Roadster, FSD, AI, artificial intelligence, SIREN, attention, press, wires-ai</news:keywords></url>'
      + '</urlset>',
    );
    if (roadsterOnly.some((r) => r.lab === 'Flying Roadster')) {
      throw new Error('newsKeywordLags must not flag Flying Roadster on bare Roadster titles');
    }
  }
  // FINDABILITY #356 — catch tip wipe of Bee AI product-class needle.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Bee AI')) {
    throw new Error('probe labs missing Bee AI');
  }
  {
    const beeAiLagXml = '<?xml version="1.0"?><urlset>'
      + '<url><news:title>Amazon\'s new Bee AI devices have a bystander problem, says former AWS security engineer</news:title>'
      + '<news:keywords>Amazon, Google, AWS, Bee, AI, artificial intelligence, SIREN, Cloud AI, attention, press, gnews-ai</news:keywords></url>'
      + '<url><news:title>Amazon launches Bee AI devices that can listen throughout your day</news:title>'
      + '<news:keywords>Amazon, Google, Bee, Bee AI, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '</urlset>';
    const beeAiLags = newsKeywordLags(beeAiLagXml);
    if (!beeAiLags.some((r) => r.lab === 'Bee AI')) {
      throw new Error(`newsKeywordLags expected Bee AI lag: ${JSON.stringify(beeAiLags)}`);
    }
    if (beeAiLags.filter((r) => /listen throughout/i.test(r.title)).some((r) => r.lab === 'Bee AI')) {
      throw new Error('newsKeywordLags should not flag Bee AI when keywords include it');
    }
    // Bare Bee / Bee Frontier title must not lag as Bee AI.
    const beeOnly = newsKeywordLags(
      '<?xml version="1.0"?><urlset>'
      + '<url><news:title>Amazon’s all-new Bee Frontier is available now: Shop this always-listening AI wearable</news:title>'
      + '<news:keywords>Amazon, Google, Bee, Bee Frontier, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '</urlset>',
    );
    if (beeOnly.some((r) => r.lab === 'Bee AI')) {
      throw new Error('newsKeywordLags must not flag Bee AI on bare Bee Frontier titles');
    }
  }
  // FINDABILITY #358 — catch tip wipe of AI safety bill event needle.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('AI safety bill')) {
    throw new Error('probe labs missing AI safety bill');
  }
  {
    const billLagXml = '<?xml version="1.0"?><urlset>'
      + '<url><news:title>Anthropic proposes AI safety bill with strict intervention thresholds - Politico By Investing.com</news:title>'
      + '<news:keywords>Anthropic, Google, Claude, AI, artificial intelligence, SIREN, AI safety, India AI, attention, press, gnews-ai</news:keywords></url>'
      + '<url><news:title>Anthropic said to pitch AI safety bill to US Congress</news:title>'
      + '<news:keywords>Anthropic, Google, Claude, AI safety bill, AI, artificial intelligence, SIREN, AI safety, AI regulation, press</news:keywords></url>'
      + '</urlset>';
    const billLags = newsKeywordLags(billLagXml);
    if (!billLags.some((r) => r.lab === 'AI safety bill')) {
      throw new Error(`newsKeywordLags expected AI safety bill lag: ${JSON.stringify(billLags)}`);
    }
    if (billLags.filter((r) => /pitch AI safety bill to US Congress/i.test(r.title)).some((r) => r.lab === 'AI safety bill')) {
      throw new Error('newsKeywordLags should not flag AI safety bill when keywords include it');
    }
    // Bare "AI safety" / NYC Council hearing must not lag as AI safety bill.
    const safetyOnly = newsKeywordLags(
      '<?xml version="1.0"?><urlset>'
      + '<url><news:title>Elon Musk\'s SpaceX to testify at NYC Council meeting on AI safety</news:title>'
      + '<news:keywords>SpaceX, Google, NYC Council, AI, artificial intelligence, SIREN, AI safety, attention, press</news:keywords></url>'
      + '</urlset>',
    );
    if (safetyOnly.some((r) => r.lab === 'AI safety bill')) {
      throw new Error('newsKeywordLags must not flag AI safety bill on bare AI safety titles');
    }
  }
  // FINDABILITY #360 — catch tip wipe of Amazon Web Services full-name needle.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Amazon Web Services')) {
    throw new Error('probe labs missing Amazon Web Services');
  }
  {
    const awsLagXml = '<?xml version="1.0"?><urlset>'
      + '<url><news:title>Amazon Web Services CFO: AI spending paying off</news:title>'
      + '<news:keywords>Amazon, Google, AI, artificial intelligence, SIREN, AI spending, attention, press, gnews-ai</news:keywords></url>'
      + '<url><news:title>Exclusive: Amazon Web Services CFO says AI spending is sustainable</news:title>'
      + '<news:keywords>Amazon, Google, Amazon Web Services, AI, artificial intelligence, SIREN, AI spending, press</news:keywords></url>'
      + '</urlset>';
    const awsLags = newsKeywordLags(awsLagXml);
    if (!awsLags.some((r) => r.lab === 'Amazon Web Services')) {
      throw new Error(`newsKeywordLags expected Amazon Web Services lag: ${JSON.stringify(awsLags)}`);
    }
    if (awsLags.filter((r) => /spending is sustainable/i.test(r.title)).some((r) => r.lab === 'Amazon Web Services')) {
      throw new Error('newsKeywordLags should not flag Amazon Web Services when keywords include it');
    }
    // Short AWS / bare Amazon titles must not lag as Amazon Web Services.
    const awsOnly = newsKeywordLags(
      '<?xml version="1.0"?><urlset>'
      + '<url><news:title>AWS expands Bedrock regions for enterprise AI</news:title>'
      + '<news:keywords>Amazon, Google, AWS, AI, artificial intelligence, SIREN, Cloud AI, attention, press</news:keywords></url>'
      + '</urlset>',
    );
    if (awsOnly.some((r) => r.lab === 'Amazon Web Services')) {
      throw new Error('newsKeywordLags must not flag Amazon Web Services on short AWS titles');
    }
  }
  // FINDABILITY #364 — catch tip wipe of M5 Max Apple Silicon SKU needle.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('M5 Max')) {
    throw new Error('probe labs missing M5 Max');
  }
  {
    const m5LagXml = '<?xml version="1.0"?><urlset>'
      + '<url><news:title>Nvidia RTX Spark First Tests: Can These Ambitious AI Laptops Beat Apple\'s M5 Max?</news:title>'
      + '<news:keywords>NVIDIA, Google, Apple, RTX Spark, NVDA, Apple Intelligence, AI, artificial intelligence, SIREN, GPUs &amp; chips, attention, press</news:keywords></url>'
      + '<url><news:title>Nvidia\'s RTX Spark Superchip in the Surface Laptop Ultra outperforms Apple\'s M5 Max MacBook Pro</news:title>'
      + '<news:keywords>NVIDIA, Apple, Surface Laptop Ultra, RTX Spark, M5 Max, NVDA, Apple Intelligence, AI, artificial intelligence, SIREN</news:keywords></url>'
      + '</urlset>';
    const m5Lags = newsKeywordLags(m5LagXml);
    if (!m5Lags.some((r) => r.lab === 'M5 Max')) {
      throw new Error(`newsKeywordLags expected M5 Max lag: ${JSON.stringify(m5Lags)}`);
    }
    if (m5Lags.filter((r) => /outperforms Apple/i.test(r.title)).some((r) => r.lab === 'M5 Max')) {
      throw new Error('newsKeywordLags should not flag M5 Max when keywords include it');
    }
    // Bare M5 / MacBook Pro titles must not lag as M5 Max.
    const m5Only = newsKeywordLags(
      '<?xml version="1.0"?><urlset>'
      + '<url><news:title>Apple M5 chip launch brings on-device AI to MacBook Pro</news:title>'
      + '<news:keywords>Apple, Google, Apple Intelligence, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '</urlset>',
    );
    if (m5Only.some((r) => r.lab === 'M5 Max')) {
      throw new Error('newsKeywordLags must not flag M5 Max on bare M5 / MacBook Pro titles');
    }
  }
  // FINDABILITY #370 — catch tip wipe of NIST standards-body needle.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('NIST')) {
    throw new Error('probe labs missing NIST');
  }
  {
    const nistLagXml = '<?xml version="1.0"?><urlset>'
      + '<url><news:title>Anthropic Traces NIST P-256 Seed to a 1997 Random Generator</news:title>'
      + '<news:keywords>Anthropic, Google, Claude, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '<url><news:title>Anthropic Says Claude Traced NIST ECDSA Curve Seeds to a 1990S RNG</news:title>'
      + '<news:keywords>Anthropic, Claude, Google, NIST, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '</urlset>';
    const nistLags = newsKeywordLags(nistLagXml);
    if (!nistLags.some((r) => r.lab === 'NIST')) {
      throw new Error(`newsKeywordLags expected NIST lag: ${JSON.stringify(nistLags)}`);
    }
    if (nistLags.filter((r) => /ECDSA Curve Seeds/i.test(r.title)).some((r) => r.lab === 'NIST')) {
      throw new Error('newsKeywordLags should not flag NIST when keywords include it');
    }
    // administration / ECDSA-only titles must not lag as NIST.
    const nistOnly = newsKeywordLags(
      '<?xml version="1.0"?><urlset>'
      + '<url><news:title>Intel CEO Lip-Bu Tan says the Trump administration does not have any policy</news:title>'
      + '<news:keywords>Intel, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '<url><news:title>Claude reveals ECDSA curve origins</news:title>'
      + '<news:keywords>Claude, AI, artificial intelligence, SIREN, attention, forum</news:keywords></url>'
      + '</urlset>',
    );
    if (nistOnly.some((r) => r.lab === 'NIST')) {
      throw new Error('newsKeywordLags must not flag NIST on administration / ECDSA-only titles');
    }
  }
  // FINDABILITY #380 — catch tip wipe of Allied Universal companion needle.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Allied Universal')) {
    throw new Error('probe labs missing Allied Universal');
  }
  {
    const alliedLagXml = '<?xml version="1.0"?><urlset>'
      + '<url><news:title>SoftBank weighs $18 billion acquisition of Allied Universal, source says</news:title>'
      + '<news:keywords>SoftBank, Google, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '<url><news:title>SoftBank weighs $18 billion acquisition of Allied Universal, Bloomberg News reports</news:title>'
      + '<news:keywords>SoftBank, Allied Universal, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '</urlset>';
    const alliedLags = newsKeywordLags(alliedLagXml);
    if (!alliedLags.some((r) => r.lab === 'Allied Universal')) {
      throw new Error(`newsKeywordLags expected Allied Universal lag: ${JSON.stringify(alliedLags)}`);
    }
    if (alliedLags.filter((r) => /Bloomberg News reports/i.test(r.title)).some((r) => r.lab === 'Allied Universal')) {
      throw new Error('newsKeywordLags should not flag Allied Universal when keywords include it');
    }
    // bare "Allied" shorthand / SoftBank-only titles must not lag as Allied Universal.
    const alliedOnly = newsKeywordLags(
      '<?xml version="1.0"?><urlset>'
      + '<url><news:title>SoftBank Is Said to Weigh Buying Top US Security Firm Allied</news:title>'
      + '<news:keywords>SoftBank, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '<url><news:title>Key facts: SoftBank (9984) $18B Allied talks; robotics; Nokia AI RAN</news:title>'
      + '<news:keywords>SoftBank, Nokia, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '</urlset>',
    );
    if (alliedOnly.some((r) => r.lab === 'Allied Universal')) {
      throw new Error('newsKeywordLags must not flag Allied Universal on bare Allied shorthand titles');
    }
  }
  // FINDABILITY #382 — catch tip wipe of Blackstone financing companion needle.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Blackstone')) {
    throw new Error('probe labs missing Blackstone');
  }
  {
    const bxLagXml = '<?xml version="1.0"?><urlset>'
      + '<url><news:title>Anthropic offers Blackstone double-digit yield in latest chip financing</news:title>'
      + '<news:keywords>Anthropic, Google, Claude, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '<url><news:title>FT: Anthropic offers Blackstone yields above 10% — Channel NewsAsia</news:title>'
      + '<news:keywords>Anthropic, Claude, Blackstone, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '</urlset>';
    const bxLags = newsKeywordLags(bxLagXml);
    if (!bxLags.some((r) => r.lab === 'Blackstone')) {
      throw new Error(`newsKeywordLags expected Blackstone lag: ${JSON.stringify(bxLags)}`);
    }
    if (bxLags.filter((r) => /Channel NewsAsia/i.test(r.title)).some((r) => r.lab === 'Blackstone')) {
      throw new Error('newsKeywordLags should not flag Blackstone when keywords include it');
    }
    // Anthropic / AI Jitters tape without Blackstone must not invent the needle.
    const bxOnly = newsKeywordLags(
      '<?xml version="1.0"?><urlset>'
      + '<url><news:title>Anthropic raises debt package to buy Google TPUs</news:title>'
      + '<news:keywords>Anthropic, Google, Claude, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '<url><news:title>Bloomberg Businessweek Daily: AI Jitters Persist</news:title>'
      + '<news:keywords>Google, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '</urlset>',
    );
    if (bxOnly.some((r) => r.lab === 'Blackstone')) {
      throw new Error('newsKeywordLags must not flag Blackstone on Anthropic / AI Jitters titles without it');
    }
  }
  // FINDABILITY #384 — catch tip wipe of Dory 1.0 SKU companion needle.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Dory 1.0')) {
    throw new Error('probe labs missing Dory 1.0');
  }
  {
    const doryLagXml = '<?xml version="1.0"?><urlset>'
      + '<url><news:title>NVIDIA Nemotron Labs Dory 1.0 4B: a quiet HF release</news:title>'
      + '<news:keywords>NVIDIA, Nemotron, Google, NVDA, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '<url><news:title>Dory 1.0 4B vs Qwen 3.8: a 4B against a three-tier line</news:title>'
      + '<news:keywords>Alibaba Qwen, Qwen, Dory 1.0, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '</urlset>';
    const doryLags = newsKeywordLags(doryLagXml);
    if (!doryLags.some((r) => r.lab === 'Dory 1.0')) {
      throw new Error(`newsKeywordLags expected Dory 1.0 lag: ${JSON.stringify(doryLags)}`);
    }
    if (doryLags.filter((r) => /vs Qwen 3\.8/i.test(r.title)).some((r) => r.lab === 'Dory 1.0')) {
      throw new Error('newsKeywordLags should not flag Dory 1.0 when keywords include it');
    }
    // bare Nemotron / Qwen titles must not invent Dory 1.0.
    const doryOnly = newsKeywordLags(
      '<?xml version="1.0"?><urlset>'
      + '<url><news:title>Nvidia unveils Nemotron 3.5 open models for AI agents</news:title>'
      + '<news:keywords>NVIDIA, Nemotron, NVDA, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '<url><news:title>Qwen 3.8 Max lands on Alibaba Cloud</news:title>'
      + '<news:keywords>Alibaba Qwen, Qwen, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '</urlset>',
    );
    if (doryOnly.some((r) => r.lab === 'Dory 1.0')) {
      throw new Error('newsKeywordLags must not flag Dory 1.0 on bare Nemotron / Qwen titles');
    }
  }
  // FINDABILITY #386 — catch tip wipe of Nemotron 3.5 version companion needle.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Nemotron 3.5')) {
    throw new Error('probe labs missing Nemotron 3.5');
  }
  {
    const n35LagXml = '<?xml version="1.0"?><urlset>'
      + '<url><news:title>Nvidia unveils Nemotron 3.5 open models for AI agents, targeting server to edge</news:title>'
      + '<news:keywords>NVIDIA, Nemotron, Google, NVDA, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '<url><news:title>Nvidia\'s Nemotron 3.5 Super VL is an open model built to run enterprise AI agents nonstop</news:title>'
      + '<news:keywords>NVIDIA, Nemotron, Nemotron 3.5, NVDA, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '</urlset>';
    const n35Lags = newsKeywordLags(n35LagXml);
    if (!n35Lags.some((r) => r.lab === 'Nemotron 3.5')) {
      throw new Error(`newsKeywordLags expected Nemotron 3.5 lag: ${JSON.stringify(n35Lags)}`);
    }
    if (n35Lags.filter((r) => /Super VL/i.test(r.title)).some((r) => r.lab === 'Nemotron 3.5')) {
      throw new Error('newsKeywordLags should not flag Nemotron 3.5 when keywords include it');
    }
    // bare Nemotron / Dory titles without 3.5 must not invent the version.
    const n35Only = newsKeywordLags(
      '<?xml version="1.0"?><urlset>'
      + '<url><news:title>NVIDIA Nemotron Labs Dory 1.0 4B: a quiet HF release</news:title>'
      + '<news:keywords>NVIDIA, Nemotron, Dory 1.0, NVDA, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '<url><news:title>Nemotron open models expand agent runtime support</news:title>'
      + '<news:keywords>Nemotron, NVIDIA, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '</urlset>',
    );
    if (n35Only.some((r) => r.lab === 'Nemotron 3.5')) {
      throw new Error('newsKeywordLags must not flag Nemotron 3.5 on bare Nemotron / Dory titles');
    }
  }
  // FINDABILITY #390 — catch tip wipe of Chrome browser-assistant companion needle.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Chrome')) {
    throw new Error('probe labs missing Chrome');
  }
  {
    const chromeLagXml = '<?xml version="1.0"?><urlset>'
      + '<url><news:title>ChatGPT for Chrome can now read tabs, compare prices, and send messages.</news:title>'
      + '<news:keywords>GPT, Google, ChatGPT, AI, artificial intelligence, SIREN, attention, press, gnews-ai</news:keywords></url>'
      + '<url><news:title>ChatGPT becomes a full Chrome browser assistant that reads and acts on your open tabs</news:title>'
      + '<news:keywords>GPT, OpenAI, ChatGPT, Chrome, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '</urlset>';
    const chromeLags = newsKeywordLags(chromeLagXml);
    if (!chromeLags.some((r) => r.lab === 'Chrome')) {
      throw new Error(`newsKeywordLags expected Chrome lag: ${JSON.stringify(chromeLags)}`);
    }
    if (chromeLags.filter((r) => /browser assistant/i.test(r.title)).some((r) => r.lab === 'Chrome')) {
      throw new Error('newsKeywordLags should not flag Chrome when keywords include it');
    }
    // OpenAI / ChatGPT titles without Chrome must not invent the browser surface.
    const chromeOnly = newsKeywordLags(
      '<?xml version="1.0"?><urlset>'
      + '<url><news:title>OpenAI ships ChatGPT voice upgrades for desktop</news:title>'
      + '<news:keywords>OpenAI, ChatGPT, GPT, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '</urlset>',
    );
    if (chromeOnly.some((r) => r.lab === 'Chrome')) {
      throw new Error('newsKeywordLags must not flag Chrome on bare ChatGPT / OpenAI titles');
    }
  }
  // FINDABILITY #394 — catch tip wipe of MOSS-Image companion needle.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('MOSS-Image')) {
    throw new Error('probe labs missing MOSS-Image');
  }
  {
    const mossLagXml = '<?xml version="1.0"?><urlset>'
      + '<url><news:title>MOSS-Image vs GPT Image 2.5: Weights or an Endpoint</news:title>'
      + '<news:keywords>GPT, Google, AI, artificial intelligence, SIREN, attention, press, gnews-ai</news:keywords></url>'
      + '<url><news:title>MOSS-Image vs FLUX 3: Two Ways to Put a Bounding Box in a Prompt</news:title>'
      + '<news:keywords>MOSS-Image, FLUX, Flux 3, Google, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '</urlset>';
    const mossLags = newsKeywordLags(mossLagXml);
    if (!mossLags.some((r) => r.lab === 'MOSS-Image')) {
      throw new Error(`newsKeywordLags expected MOSS-Image lag: ${JSON.stringify(mossLags)}`);
    }
    if (mossLags.filter((r) => /FLUX 3/i.test(r.title)).some((r) => r.lab === 'MOSS-Image')) {
      throw new Error('newsKeywordLags should not flag MOSS-Image when keywords include it');
    }
    // bare FLUX / Qwen / Nano Banana titles without MOSS-Image must not invent it.
    const mossOnly = newsKeywordLags(
      '<?xml version="1.0"?><urlset>'
      + '<url><news:title>FLUX 3 lands a tighter bounding-box prompt path</news:title>'
      + '<news:keywords>FLUX, Flux 3, Google, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '</urlset>',
    );
    if (mossOnly.some((r) => r.lab === 'MOSS-Image')) {
      throw new Error('newsKeywordLags must not flag MOSS-Image on bare FLUX titles');
    }
  }
  // FINDABILITY #397 — catch tip wipe of ECDSA companion needle.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('ECDSA')) {
    throw new Error('probe labs missing ECDSA');
  }
  {
    const ecdsaLags = newsKeywordLags(
      '<?xml version="1.0"?><urlset>'
      + '<url><news:title>Anthropic Says Claude Traced NIST ECDSA Curve Seeds to a 1990S RNG</news:title>'
      + '<news:keywords>Anthropic, Claude, Google, NIST, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '<url><news:title>Claude reveals ECDSA curve origins</news:title>'
      + '<news:keywords>ECDSA, Claude, AI, artificial intelligence, SIREN, attention, forum</news:keywords></url>'
      + '</urlset>',
    );
    if (!ecdsaLags.some((r) => r.lab === 'ECDSA')) {
      throw new Error(`newsKeywordLags expected ECDSA lag: ${JSON.stringify(ecdsaLags)}`);
    }
    if (ecdsaLags.filter((r) => /curve origins/i.test(r.title)).some((r) => r.lab === 'ECDSA')) {
      throw new Error('newsKeywordLags should not flag ECDSA when keywords include it');
    }
    const ecdsaOnly = newsKeywordLags(
      '<?xml version="1.0"?><urlset>'
      + '<url><news:title>Anthropic ships a quieter Claude coding update</news:title>'
      + '<news:keywords>Anthropic, Claude, Google, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '</urlset>',
    );
    if (ecdsaOnly.some((r) => r.lab === 'ECDSA')) {
      throw new Error('newsKeywordLags must not flag ECDSA on bare Claude titles');
    }
  }
  // FINDABILITY #402 — catch tip wipe of Claude Opus 5.5 companion needle.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Claude Opus 5.5') || !NEWS_KEYWORD_PROBE_LABS.includes('Opus 5.5')) {
    throw new Error('probe labs missing Claude Opus 5.5 / Opus 5.5');
  }
  {
    const opusLags = newsKeywordLags(
      '<?xml version="1.0"?><urlset>'
      + '<url><news:title>Claude Opus 5.5 beats a human baseline and AI researchers move up their self improvement clock</news:title>'
      + '<news:keywords>Claude, Google, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '<url><news:title>Tips for Multiagent Work with Claude Opus 5.5</news:title>'
      + '<news:keywords>Claude Opus 5.5, Opus 5.5, Claude, AI, artificial intelligence, SIREN, attention, forum</news:keywords></url>'
      + '</urlset>',
    );
    if (!opusLags.some((r) => r.lab === 'Claude Opus 5.5' || r.lab === 'Opus 5.5')) {
      throw new Error(`newsKeywordLags expected Claude Opus 5.5 lag: ${JSON.stringify(opusLags)}`);
    }
    if (opusLags.filter((r) => /Multiagent/i.test(r.title)).some((r) => r.lab === 'Claude Opus 5.5' || r.lab === 'Opus 5.5')) {
      throw new Error('newsKeywordLags should not flag Opus when keywords include it');
    }
  }
  // FINDABILITY #404 — catch tip wipe of Ondas companion needle.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Ondas')) {
    throw new Error('probe labs missing Ondas');
  }
  {
    const ondasLags = newsKeywordLags(
      '<?xml version="1.0"?><urlset>'
      + '<url><news:title>RTX, AeroVironment And Ondas-Palantir Push Deeper Into Drone Defense And AI This Week</news:title>'
      + '<news:keywords>Palantir, Google, AIP, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '<url><news:title>Stocktwits Defense Watch: RTX Continues Deal Momentum, Ondas-Palantir Launch AI Firm As AeroVironment Strike Four International Deals</news:title>'
      + '<news:keywords>Palantir, Ondas, AIP, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '</urlset>',
    );
    if (!ondasLags.some((r) => r.lab === 'Ondas')) {
      throw new Error(`newsKeywordLags expected Ondas lag: ${JSON.stringify(ondasLags)}`);
    }
    if (ondasLags.filter((r) => /Stocktwits/i.test(r.title)).some((r) => r.lab === 'Ondas')) {
      throw new Error('newsKeywordLags should not flag Ondas when keywords include it');
    }
    const ondasOnly = newsKeywordLags(
      '<?xml version="1.0"?><urlset>'
      + '<url><news:title>Palantir AIP wins another government AI contract</news:title>'
      + '<news:keywords>Palantir, Google, AIP, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '<url><news:title>AeroVironment Strike Four International Deals This Week</news:title>'
      + '<news:keywords>Google, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '</urlset>',
    );
    if (ondasOnly.some((r) => r.lab === 'Ondas')) {
      throw new Error('newsKeywordLags must not flag Ondas on bare Palantir / AeroVironment titles');
    }
  }
  // FINDABILITY #477 — catch tip wipe of Navier-Stokes companion needle.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Navier-Stokes')) {
    throw new Error('probe labs missing Navier-Stokes');
  }
  {
    const navierLags = newsKeywordLags(
      '<?xml version="1.0"?><urlset>'
      + '<url><news:title>OpenAI releases 722 AI written math papers, Navier-Stokes claim</news:title>'
      + '<news:keywords>OpenAI, Google, ChatGPT, AI, artificial intelligence, SIREN, attention, press, gnews-ai</news:keywords></url>'
      + '<url><news:title>Mathematicians say OpenAI doesn\'t understand its own Navier-Stokes proof</news:title>'
      + '<news:keywords>OpenAI, ChatGPT, Navier-Stokes, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '</urlset>',
    );
    if (!navierLags.some((r) => r.lab === 'Navier-Stokes')) {
      throw new Error(`newsKeywordLags expected Navier-Stokes lag: ${JSON.stringify(navierLags)}`);
    }
    if (navierLags.filter((r) => /Mathematicians/i.test(r.title)).some((r) => r.lab === 'Navier-Stokes')) {
      throw new Error('newsKeywordLags should not flag Navier-Stokes when keywords include it');
    }
    const navierSpace = newsKeywordLags(
      '<?xml version="1.0"?><urlset>'
      + '<url><news:title>OpenAI Navier Stokes claim draws scrutiny from mathematicians</news:title>'
      + '<news:keywords>OpenAI, ChatGPT, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '</urlset>',
    );
    if (!navierSpace.some((r) => r.lab === 'Navier-Stokes')) {
      throw new Error(`newsKeywordLags expected Navier-Stokes lag on spaced title: ${JSON.stringify(navierSpace)}`);
    }
    const navierOnly = newsKeywordLags(
      '<?xml version="1.0"?><urlset>'
      + '<url><news:title>OpenAI releases AI written math papers without the equation name</news:title>'
      + '<news:keywords>OpenAI, ChatGPT, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '<url><news:title>Stokes flow alone is not a Navier match</news:title>'
      + '<news:keywords>Google, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '</urlset>',
    );
    if (navierOnly.some((r) => r.lab === 'Navier-Stokes')) {
      throw new Error('newsKeywordLags must not flag Navier-Stokes on bare OpenAI / Stokes titles');
    }
  }
  // FINDABILITY #487 — ECDSA cryptography-seed / NSA crypto-mystery title flex.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('ECDSA')) {
    throw new Error('probe labs missing ECDSA');
  }
  {
    const ecdsaLags = newsKeywordLags(
      '<?xml version="1.0"?><urlset>'
      + '<url><news:title>Anthropic Says Claude Cracked a 25-Year NSA Cryptography Seed Mystery in 30 Minutes</news:title>'
      + '<news:keywords>Anthropic, Claude, Google, AI, artificial intelligence, SIREN, attention, press, gnews-ai</news:keywords></url>'
      + '<url><news:title>Anthropic Says Claude Traced NIST ECDSA Curve Seeds to a 1990S RNG</news:title>'
      + '<news:keywords>Anthropic, Claude, ECDSA, NIST, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '</urlset>',
    );
    if (!ecdsaLags.some((r) => r.lab === 'ECDSA')) {
      throw new Error(`newsKeywordLags expected ECDSA seed-mystery lag: ${JSON.stringify(ecdsaLags)}`);
    }
    if (ecdsaLags.filter((r) => /Curve Seeds/i.test(r.title)).some((r) => r.lab === 'ECDSA')) {
      throw new Error('newsKeywordLags should not flag ECDSA when keywords include it');
    }
    const ecdsaOnly = newsKeywordLags(
      '<?xml version="1.0"?><urlset>'
      + '<url><news:title>NSA opens a new office in Maryland</news:title>'
      + '<news:keywords>Google, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '<url><news:title>Cryptography mystery novels for summer reading</news:title>'
      + '<news:keywords>Google, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '</urlset>',
    );
    if (ecdsaOnly.some((r) => r.lab === 'ECDSA')) {
      throw new Error('newsKeywordLags must not flag ECDSA on bare NSA / cryptography titles');
    }
  }
  // FINDABILITY #479 — catch tip wipe of Flash-1017 companion needle.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Flash-1017')) {
    throw new Error('probe labs missing Flash-1017');
  }
  {
    const flashLags = newsKeywordLags(
      '<?xml version="1.0"?><urlset>'
      + '<url><news:title>DeepSeek releases V4.1-Flash-1017, an update it says offers stronger benchmark performance</news:title>'
      + '<news:keywords>DeepSeek, DeepSeek-R, DeepSeek V4.1 Flash, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '<url><news:title>The fastest DeepSeek v4.1 flash 1017 – Day 0</news:title>'
      + '<news:keywords>DeepSeek, DeepSeek V4.1 Flash, Flash-1017, AI, artificial intelligence, SIREN, attention, forum</news:keywords></url>'
      + '</urlset>',
    );
    if (!flashLags.some((r) => r.lab === 'Flash-1017')) {
      throw new Error(`newsKeywordLags expected Flash-1017 lag: ${JSON.stringify(flashLags)}`);
    }
    if (flashLags.filter((r) => /Day 0/i.test(r.title)).some((r) => r.lab === 'Flash-1017')) {
      throw new Error('newsKeywordLags should not flag Flash-1017 when keywords include it');
    }
    const flashOnly = newsKeywordLags(
      '<?xml version="1.0"?><urlset>'
      + '<url><news:title>DeepSeek V4.1 Flash without the build SKU</news:title>'
      + '<news:keywords>DeepSeek, DeepSeek V4.1 Flash, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '<url><news:title>Flash photography tips for 1017 cameras</news:title>'
      + '<news:keywords>Google, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '</urlset>',
    );
    if (flashOnly.some((r) => r.lab === 'Flash-1017')) {
      throw new Error('newsKeywordLags must not flag Flash-1017 on bare V4.1 Flash / photography titles');
    }
  }
  // FINDABILITY #481 — catch tip wipe of Stripe companion needle.
  if (!NEWS_KEYWORD_PROBE_LABS.includes('Stripe')) {
    throw new Error('probe labs missing Stripe');
  }
  {
    const stripeLags = newsKeywordLags(
      '<?xml version="1.0"?><urlset>'
      + '<url><news:title>Stripe\'s $7.5 Billion OpenRouter Deal Puts a Payments Company in Charge of AI Model Choice</news:title>'
      + '<news:keywords>OpenRouter, Google, AI, artificial intelligence, SIREN, AI startups, compute, press, gnews-ai</news:keywords></url>'
      + '<url><news:title>Stripe will pay more than $7 billion to buy AI router OpenRouter</news:title>'
      + '<news:keywords>Stripe, OpenRouter, Google, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '</urlset>',
    );
    if (!stripeLags.some((r) => r.lab === 'Stripe')) {
      throw new Error(`newsKeywordLags expected Stripe lag: ${JSON.stringify(stripeLags)}`);
    }
    if (stripeLags.filter((r) => /will pay more/i.test(r.title)).some((r) => r.lab === 'Stripe')) {
      throw new Error('newsKeywordLags should not flag Stripe when keywords include it');
    }
  }
  // FINDABILITY #336 — catch tip wipe of GPT-Live-1 / Kling / Kling 4.0 needles.
  for (const lab of ['GPT-Live-1', 'Kling', 'Kling 4.0']) {
    if (!NEWS_KEYWORD_PROBE_LABS.includes(lab)) throw new Error(`probe labs missing ${lab}`);
  }
  const gptLive1LagXml = '<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
    + '<url><news:title>GPT-Live-1 vs Qwen-Audio-3.1: The Full-Duplex Fight Is the One Worth Having</news:title>'
    + '<news:keywords>Alibaba Qwen, GPT, Qwen, Google, GPT-Live, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
    + '<url><news:title>GPT-Live-1 Prompt-to-Voice: Nine New International Voices</news:title>'
    + '<news:keywords>GPT, Google, GPT-Live, GPT-Live-1, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
    + '</urlset>';
  const gptLive1Lags = newsKeywordLags(gptLive1LagXml);
  if (!gptLive1Lags.some((r) => r.lab === 'GPT-Live-1')) {
    throw new Error(`newsKeywordLags expected GPT-Live-1 lag: ${JSON.stringify(gptLive1Lags)}`);
  }
  if (gptLive1Lags.filter((r) => /Prompt-to-Voice/i.test(r.title)).some((r) => r.lab === 'GPT-Live-1')) {
    throw new Error('newsKeywordLags should not flag GPT-Live-1 when keywords include it');
  }
  const klingLagXml = '<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
    + '<url><news:title>Kuaishou launches Kling 4.0, a next-gen AI video model</news:title>'
    + '<news:keywords>Google, AI, artificial intelligence, SIREN, attention, press, gnews-ai</news:keywords></url>'
    + '<url><news:title>Kling AI Officially Launches Next-Generation Kling 4.0</news:title>'
    + '<news:keywords>Google, Kling, Kling 4.0, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
    + '</urlset>';
  const klingLags = newsKeywordLags(klingLagXml);
  if (!klingLags.some((r) => r.lab === 'Kling') || !klingLags.some((r) => r.lab === 'Kling 4.0')) {
    throw new Error(`newsKeywordLags expected Kling / Kling 4.0 lag: ${JSON.stringify(klingLags)}`);
  }
  if (klingLags.filter((r) => /Officially Launches/i.test(r.title)).some((r) => r.lab === 'Kling')) {
    throw new Error('newsKeywordLags should not flag Kling when keywords include it');
  }
  // FINDABILITY #338 — catch tip wipe of Xing / Xing 4.0 needles.
  for (const lab of ['Xing', 'Xing 4.0']) {
    if (!NEWS_KEYWORD_PROBE_LABS.includes(lab)) throw new Error(`probe labs missing ${lab}`);
  }
  const xingLagXml = '<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
    + '<url><news:title>Xing 4.0 29B-A4B vs Nemotron 3.5 Lightning 30B-A3B: Same Shape, Different Licence</news:title>'
    + '<news:keywords>Nemotron, Google, AI, artificial intelligence, SIREN, attention, press, gnews-ai</news:keywords></url>'
    + '<url><news:title>Xing 4.0 29B-A4B vs Qwen 3.8 27B: Vision or Tool Calling</news:title>'
    + '<news:keywords>Alibaba Qwen, Qwen, Google, Xing, Xing 4.0, AI, artificial intelligence, SIREN, Tool calling, attention, press</news:keywords></url>'
    + '</urlset>';
  const xingLags = newsKeywordLags(xingLagXml);
  if (!xingLags.some((r) => r.lab === 'Xing') || !xingLags.some((r) => r.lab === 'Xing 4.0')) {
    throw new Error(`newsKeywordLags expected Xing / Xing 4.0 lag: ${JSON.stringify(xingLags)}`);
  }
  if (xingLags.filter((r) => /Vision or Tool Calling/i.test(r.title)).some((r) => r.lab === 'Xing')) {
    throw new Error('newsKeywordLags should not flag Xing when keywords include it');
  }
  // FINDABILITY #348 — catch tip wipe of Xing 4.0 29B-A4B size-SKU needle.
  {
    const xing29bLagXml = '<?xml version="1.0"?><urlset>'
      + '<url><news:title>Xing 4.0 29B-A4B vs Nemotron 3.5 Lightning 30B-A3B: Same Shape, Different Licence</news:title>'
      + '<news:keywords>Nemotron, Google, Xing, Xing 4.0, AI, artificial intelligence, SIREN, attention, press, gnews-ai</news:keywords></url>'
      + '<url><news:title>Xing 4.0 29B-A4B vs Qwen 3.8 27B: Vision or Tool Calling</news:title>'
      + '<news:keywords>Alibaba Qwen, Qwen, Google, Xing, Xing 4.0, Xing 4.0 29B-A4B, AI, SIREN, Tool calling, attention, press</news:keywords></url>'
      + '</urlset>';
    const xing29bLags = newsKeywordLags(xing29bLagXml);
    if (!xing29bLags.some((r) => r.lab === 'Xing 4.0 29B-A4B')) {
      throw new Error(`newsKeywordLags expected Xing 4.0 29B-A4B lag: ${JSON.stringify(xing29bLags)}`);
    }
    if (xing29bLags.filter((r) => /Vision or Tool Calling/i.test(r.title)).some((r) => r.lab === 'Xing 4.0 29B-A4B')) {
      throw new Error('newsKeywordLags should not flag Xing 4.0 29B-A4B when keywords include it');
    }
  }
  // FINDABILITY #340 — catch tip wipe of Replit company needle.
  {
    const replitLagXml = '<?xml version="1.0"?><urlset>'
      + '<url><news:title>Replit ends partnership with Anthropic, citing cost and performance; shifts focus to OpenAI.</news:title>'
      + '<news:keywords>Anthropic, OpenAI, Google, ChatGPT, Claude, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '<url><news:title>Replit is no longer working with Anthropic, CEO says</news:title>'
      + '<news:keywords>Anthropic, Claude, Replit, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '</urlset>';
    const replitLags = newsKeywordLags(replitLagXml);
    if (!replitLags.some((r) => r.lab === 'Replit')) {
      throw new Error(`newsKeywordLags expected Replit lag: ${JSON.stringify(replitLags)}`);
    }
    if (replitLags.filter((r) => /no longer working/i.test(r.title)).some((r) => r.lab === 'Replit')) {
      throw new Error('newsKeywordLags should not flag Replit when keywords include it');
    }
  }
  // FINDABILITY #342 — catch tip wipe of Siri product needle.
  {
    const siriLagXml = '<?xml version="1.0"?><urlset>'
      + '<url><news:title>I Tested Siri and Gemini\'s Inbox-Digging Feature for a Week. The Winner Surprised Me.</news:title>'
      + '<news:keywords>Gemini, Google, Argon, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '<url><news:title>How Does Apple\'s Siri Compete in an Agentic World?</news:title>'
      + '<news:keywords>Google, Apple, Apple Intelligence, Siri, AI, artificial intelligence, SIREN, AI agents, attention, press</news:keywords></url>'
      + '</urlset>';
    const siriLags = newsKeywordLags(siriLagXml);
    if (!siriLags.some((r) => r.lab === 'Siri')) {
      throw new Error(`newsKeywordLags expected Siri lag: ${JSON.stringify(siriLags)}`);
    }
    if (siriLags.filter((r) => /Agentic World/i.test(r.title)).some((r) => r.lab === 'Siri')) {
      throw new Error('newsKeywordLags should not flag Siri when keywords include it');
    }
  }
  // FINDABILITY #344 — catch tip wipe of Claude Mythos 5 / Mythos 5 needles.
  {
    const mythosLagXml = '<?xml version="1.0"?><urlset>'
      + '<url><news:title>Claude Mythos 5 vs Qwen3.8-Max: Three Changes in Seven Weeks</news:title>'
      + '<news:keywords>Claude, Qwen, Google, Mythos, Qwen3.8, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '<url><news:title>Claude Mythos 5 vs DeepSeek V4 Pro: price gap</news:title>'
      + '<news:keywords>Claude, DeepSeek, Google, Mythos, Claude Mythos 5, Mythos 5, DeepSeek V4 Pro, AI, SIREN, attention, press</news:keywords></url>'
      + '</urlset>';
    const mythosLags = newsKeywordLags(mythosLagXml);
    if (!mythosLags.some((r) => r.lab === 'Claude Mythos 5')
      || !mythosLags.some((r) => r.lab === 'Mythos 5')) {
      throw new Error(`newsKeywordLags expected Claude Mythos 5 / Mythos 5 lag: ${JSON.stringify(mythosLags)}`);
    }
    if (mythosLags.filter((r) => /DeepSeek V4 Pro/i.test(r.title)).some((r) => r.lab === 'Claude Mythos 5')) {
      throw new Error('newsKeywordLags should not flag Claude Mythos 5 when keywords include it');
    }
  }
  // FINDABILITY #346 — catch tip wipe of Qwen3.8-Max SKU needle.
  {
    const qwen38MaxLagXml = '<?xml version="1.0"?><urlset>'
      + '<url><news:title>Claude Mythos 5 vs Qwen3.8-Max: Three Changes in Seven Weeks</news:title>'
      + '<news:keywords>Claude Mythos 5, Mythos 5, Claude, Qwen, Google, Mythos, Qwen3.8, AI, artificial intelligence, SIREN, attention, press</news:keywords></url>'
      + '<url><news:title>Claude Mythos 5 vs Qwen3.8-Max: Tre cambiamenti in sette settimane</news:title>'
      + '<news:keywords>Claude Mythos 5, Mythos 5, Claude, Qwen, Google, Mythos, Qwen3.8, Qwen3.8-Max, AI, SIREN, attention, press</news:keywords></url>'
      + '</urlset>';
    const qwen38MaxLags = newsKeywordLags(qwen38MaxLagXml);
    if (!qwen38MaxLags.some((r) => r.lab === 'Qwen3.8-Max')) {
      throw new Error(`newsKeywordLags expected Qwen3.8-Max lag: ${JSON.stringify(qwen38MaxLags)}`);
    }
    if (qwen38MaxLags.filter((r) => /sette settimane/i.test(r.title)).some((r) => r.lab === 'Qwen3.8-Max')) {
      throw new Error('newsKeywordLags should not flag Qwen3.8-Max when keywords include it');
    }
  }
  const labAliasLagXml = '<?xml version="1.0"?><urlset>'
    + '<url><news:title>OpenAI raises new round</news:title>'
    + '<news:keywords>OpenAI, Google, AI, SIREN</news:keywords></url>'
    + '<url><news:title>Anthropic expands compute</news:title>'
    + '<news:keywords>Anthropic, Claude, AI, SIREN</news:keywords></url>'
    + '<url><news:title>Micron shares slide</news:title>'
    + '<news:keywords>Micron, Google, AI, SIREN</news:keywords></url>'
    + '<url><news:title>CoreWeave debt woes deepen</news:title>'
    + '<news:keywords>CoreWeave, Google, AI, SIREN</news:keywords></url>'
    + '<url><news:title>IREN stock climbs on power deals</news:title>'
    + '<news:keywords>IREN, Google, AI, SIREN</news:keywords></url>'
    + '<url><news:title>Meta expands open-weight releases</news:title>'
    + '<news:keywords>Meta, Google, AI, SIREN</news:keywords></url>'
    + '<url><news:title>Apple ships on-device AI update</news:title>'
    + '<news:keywords>Apple, Google, AI, SIREN</news:keywords></url>'
    + '<url><news:title>Microsoft expands Azure AI deals</news:title>'
    + '<news:keywords>Microsoft, Google, AI, SIREN</news:keywords></url>'
    + '<url><news:title>Character.ai Maker Files for Chapter 11 Bankruptcy</news:title>'
    + '<news:keywords>Character.AI, Google, AI, SIREN</news:keywords></url>'
    + '<url><news:title>Alibaba expands cloud AI for enterprises</news:title>'
    + '<news:keywords>Alibaba, Google, AI, SIREN</news:keywords></url>'
    + '<url><news:title>Gemini expands enterprise API access</news:title>'
    + '<news:keywords>Gemini, Google, AI, SIREN</news:keywords></url>'
    + '<url><news:title>SpaceX expands Starlink capacity</news:title>'
    + '<news:keywords>SpaceX, Google, AI, SIREN</news:keywords></url>'
    + '</urlset>';
  const labAliasLags = newsLabAliasKeywordLags(labAliasLagXml);
  if (!labAliasLags.some((r) => r.lab === 'OpenAI' && r.alias === 'ChatGPT')) {
    throw new Error(`newsLabAliasKeywordLags OpenAI: ${JSON.stringify(labAliasLags)}`);
  }
  if (!labAliasLags.some((r) => r.lab === 'Micron' && r.alias === 'MU')) {
    throw new Error(`newsLabAliasKeywordLags Micron: ${JSON.stringify(labAliasLags)}`);
  }
  if (!labAliasLags.some((r) => r.lab === 'CoreWeave' && r.alias === 'neocloud')) {
    throw new Error(`newsLabAliasKeywordLags CoreWeave: ${JSON.stringify(labAliasLags)}`);
  }
  if (!labAliasLags.some((r) => r.lab === 'IREN' && r.alias === 'Iris Energy')) {
    throw new Error(`newsLabAliasKeywordLags IREN: ${JSON.stringify(labAliasLags)}`);
  }
  if (!labAliasLags.some((r) => r.lab === 'Meta' && r.alias === 'Muse')) {
    throw new Error(`newsLabAliasKeywordLags Meta: ${JSON.stringify(labAliasLags)}`);
  }
  if (!labAliasLags.some((r) => r.lab === 'Apple' && r.alias === 'Apple Intelligence')) {
    throw new Error(`newsLabAliasKeywordLags Apple: ${JSON.stringify(labAliasLags)}`);
  }
  if (!labAliasLags.some((r) => r.lab === 'Microsoft' && r.alias === 'Copilot')) {
    throw new Error(`newsLabAliasKeywordLags Microsoft: ${JSON.stringify(labAliasLags)}`);
  }
  if (!labAliasLags.some((r) => r.lab === 'Character.ai' && r.alias === 'Chatbots')) {
    throw new Error(`newsLabAliasKeywordLags Character.ai: ${JSON.stringify(labAliasLags)}`);
  }
  if (!labAliasLags.some((r) => r.lab === 'Alibaba' && r.alias === 'Qwen')) {
    throw new Error(`newsLabAliasKeywordLags Alibaba: ${JSON.stringify(labAliasLags)}`);
  }
  if (!labAliasLags.some((r) => r.lab === 'Gemini' && r.alias === 'Argon')) {
    throw new Error(`newsLabAliasKeywordLags Gemini→Argon: ${JSON.stringify(labAliasLags)}`);
  }
  if (labAliasLags.some((r) => r.lab === 'Anthropic')) {
    throw new Error('newsLabAliasKeywordLags should not flag Anthropic when Claude present');
  }
  if (!NEWS_LAB_ALIAS_PROBES.some((p) => p.lab === 'Gemini' && p.alias === 'Argon')) {
    throw new Error('NEWS_LAB_ALIAS_PROBES missing Gemini→Argon');
  }
  if (!NEWS_LAB_ALIAS_PROBES.some((p) => p.alias === 'neocloud')) {
    throw new Error('NEWS_LAB_ALIAS_PROBES missing neocloud');
  }
  if (!NEWS_LAB_ALIAS_PROBES.some((p) => p.alias === 'Iris Energy')) {
    throw new Error('NEWS_LAB_ALIAS_PROBES missing Iris Energy');
  }
  if (!NEWS_LAB_ALIAS_PROBES.some((p) => p.alias === 'Muse')) {
    throw new Error('NEWS_LAB_ALIAS_PROBES missing Muse');
  }
  if (!NEWS_LAB_ALIAS_PROBES.some((p) => p.alias === 'Apple Intelligence')) {
    throw new Error('NEWS_LAB_ALIAS_PROBES missing Apple Intelligence');
  }
  if (!NEWS_LAB_ALIAS_PROBES.some((p) => p.alias === 'Chatbots')) {
    throw new Error('NEWS_LAB_ALIAS_PROBES missing Chatbots');
  }
  if (!NEWS_LAB_ALIAS_PROBES.some((p) => p.alias === 'Qwen')) {
    throw new Error('NEWS_LAB_ALIAS_PROBES missing Qwen');
  }
  if (!NEWS_LAB_ALIAS_PROBES.some((p) => p.alias === 'Datacenters')) {
    throw new Error('NEWS_LAB_ALIAS_PROBES missing Datacenters');
  }
  if (!NEWS_LAB_ALIAS_PROBES.some((p) => p.alias === 'Timestral')) {
    throw new Error('NEWS_LAB_ALIAS_PROBES missing Timestral');
  }
  if (!NEWS_LAB_ALIAS_PROBES.some((p) => p.alias === 'Copilot')) {
    throw new Error('NEWS_LAB_ALIAS_PROBES missing Copilot');
  }
  // FINDABILITY #206 — SpaceX → Starshield probe + lag selftest.
  if (!NEWS_LAB_ALIAS_PROBES.some((p) => p.lab === 'SpaceX' && p.alias === 'Starshield')) {
    throw new Error('NEWS_LAB_ALIAS_PROBES missing SpaceX→Starshield');
  }
  if (!labAliasLags.some((r) => r.lab === 'SpaceX' && r.alias === 'Starshield')) {
    throw new Error(`newsLabAliasKeywordLags SpaceX→Starshield: ${JSON.stringify(labAliasLags)}`);
  }
  const labAliasGaps = deriveGaps({
    sites: [{
      id: 'siren', name: 'siren.watch', ours: true, ok: true,
      title: 'AI activity index today · SIREN',
      sitemap_urls: 6000, news_sitemap_urls: 200, schema_types: ['WebSite'],
      news_lab_alias_lags: labAliasLags,
    }],
    surfaces: [],
    open_engineering: [],
  });
  if (!labAliasGaps.some((g) => g.id === 'news-lab-alias-keywords-missing')) {
    throw new Error('news-lab-alias-keywords-missing gap');
  }
  if (!NEWS_LAB_ALIAS_PROBES.some((p) => p.alias === 'ChatGPT')) {
    throw new Error('NEWS_LAB_ALIAS_PROBES missing ChatGPT');
  }

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
