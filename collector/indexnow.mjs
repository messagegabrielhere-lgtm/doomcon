#!/usr/bin/env node
// Ping IndexNow after a publish so Bing/Yandex/Seznam learn about fresh URLs
// without waiting on their crawl schedule. Google does not use IndexNow; the
// ordinary sitemap + news-sitemap remain the Google path (FINDABILITY.md).
//
//   node collector/indexnow.mjs                  # key pages + news sitemap
//   node collector/indexnow.mjs --url https://…  # one or more URLs
//
// Key file is published at /{KEY}.txt by site/build.mjs. Failures are
// non-fatal: a search-engine outage must not red the collect job.

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const INDEXNOW_KEY = 'd00mc0n7a11yc0un75a1d0e5n07pr3d1c7';
export const INDEXNOW_HOST = 'siren.watch';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENDPOINTS = Object.freeze([
  'https://api.indexnow.org/indexnow',
  'https://www.bing.com/indexnow',
]);

const ALWAYS = Object.freeze([
  '/',
  '/ai-activity-index.html', // short alias; canonical stays on / (FINDABILITY #252)
  '/ai-activity-level.html', // short alias; canonical stays on / (FINDABILITY #262)
  '/news.html',
  '/methodology.html',
  '/methodology.md',
  '/guide.html',
  '/guide.md',
  '/guides.html',
  '/guides.md',
  '/compare.html',
  '/alternatives.html',
  '/vs.html',
  '/vs/doombench.html',
  '/vs/doom.html', // short alias; canonical stays on doombench
  '/vs/skynet-countdown.html',
  '/vs/skynet.html', // short alias; canonical stays on skynet-countdown
  '/vs/pdoom.html',
  '/vs/pizzint.html',
  '/vs/takeofftracker.html',
  '/vs/takeoff.html', // short alias; canonical stays on takeofftracker
  // FINDABILITY #131 — root typed guesses; canonical stays on /vs/* primaries.
  '/doombench.html',
  '/doom.html',
  '/skynet-countdown.html',
  '/skynet.html',
  '/pizzint.html',
  '/takeofftracker.html',
  '/takeoff.html',
  // AI-clock rivals named in AI Overviews (aidoomsday.live, IMD, AI Fear & Trust).
  '/vs/aidoomsday.html',
  '/vs/imd-ai-safety-clock.html',
  '/vs/aifeartrustindex.html',
  '/aidoomsday.html',
  '/ai-safety-clock.html',
  '/aifeartrustindex.html',
  '/companies.html',
  '/models.html',
  '/countries.html',
  '/pillars.html',
  '/sources.html',
  '/pillar/',
  '/p-doom.html',
  '/pdoom.html', // short alias; canonical stays on p-doom (FINDABILITY #129)
  '/ai-doomsday-clock.html',
  '/doomsday-clock.html', // short alias; canonical on ai-doomsday-clock (#133)
  '/ai-doom.html', // short alias; canonical on guide (#133)
  '/doom-index.html', // short alias; canonical on compare (#133)
  '/ai-doom-index.html',
  '/jobs.html',
  '/race.html',
  '/search-trends.html',
  '/trends.html', // short alias; canonical stays on search-trends (FINDABILITY #124)
  // FINDABILITY #186 — tipped Trends JSON so Bing learns fresh generated_at.
  '/api/search-trends.json',
  '/ai-prediction-markets.html',
  '/sitemap.xml',
  '/news-sitemap.xml',
  '/llms.txt',
  '/agents.md',
  '/AGENTS.md', // uppercase convention; same body as agents.md (FINDABILITY #489)
  '/agents.txt',
  '/agents.json',
  '/ai.txt',
  '/skill.md',
  '/skills/siren-ai-index/SKILL.md',
  '/api/news.json',
  '/.well-known/api-catalog',
  '/now.md',
  // FINDABILITY #92 — tipped live reading (plain) after #90; pair with /now.md.
  '/api/now.txt',
  '/tags.html',
  '/tags/',
  '/kinds.html',
  '/kind/',
  '/outlets.html',
  '/outlet/',
  '/people.html',
  '/people/',
  '/lab/',
  '/model/',
  '/country/',
  '/source/',
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
  '/history.html',
  '/about.html',
  '/privacy.html',
  '/press.html',
  '/terms.html',
  '/disclosures.html',
  '/brand.html',
  '/instruments.html',
  '/world.html',
  '/map.html',
  '/watts.html',
  '/charts.html',
  '/power.html',
  '/digest.html',
  '/exploits.html',
  '/flock.html',
  '/bliss.html',
  '/balance.html',
  '/desk.html',
  '/breakthroughs.html',
  '/si-watch.html',
  '/si-ready.html',
  '/ai-proof-job.html',
  '/bunker-kit.html',
  '/bug-out-land.html',
  '/prepper-checklist.html',
  '/supply-depot.html',
  '/prep-downloads.html',
  '/survival-llm.html',
  '/bets.html',
  '/medicine.html',
  '/library.html',
  '/openapi.json',
  '/moves/',
  '/item/',
  '/item/archive.html',
  // Question-titled rooms + directories — Bing path after deploy (FINDABILITY #45).
  // Keep ALWAYS under 400; gated facet volume still comes from sitemap sampling.
  '/agents.html',
  '/alerts.html',
  '/arena.html',
  '/bias.html',
  '/careers.html',
  '/catalog.html',
  '/changelog.html',
  '/classic.html',
  '/contain.html',
  '/day-after.html',
  '/dispatch.html',
  '/elon.html',
  '/evolution.html',
  '/export.html',
  '/feedback.html',
  '/free-tools.html',
  '/verify.html',
  '/game.html',
  '/games.html',
  '/kind/status.html',
  '/labs.html',
  '/leaders.html',
  '/live.html',
  '/live-x.html',
  '/moltbook.html',
  '/monitor.html',
  '/nations.html',
  '/nothing.html',
  '/radio.html',
  '/reference-plan.html',
  '/scanner.html',
  '/search.html',
  '/self-aware.html',
  '/sponsor.html',
  '/staff.html',
  '/status.html',
  '/tally.html',
  '/threats.html',
  '/videos.html',
  '/waffle.html',
  '/lab/amazon.html',
  '/lab/anthropic.html',
  '/lab/apple.html',
  '/lab/asml.html',
  '/lab/cisco.html',
  '/lab/coreweave.html', // FINDABILITY #168 — CoreWeave stock/debt Trends lab
  '/lab/google-deepmind.html',
  '/lab/intel.html',
  '/lab/meta.html',
  '/lab/microsoft.html',
  '/lab/micron.html', // FINDABILITY #137 — MU / memory-chip Trends route
  '/lab/samsung.html', // FINDABILITY #175 — Samsung / HBM AI memory Trends route
  '/lab/nvidia.html',
  '/lab/openai.html',
  '/lab/qwen.html',
  '/lab/deepseek.html', // FINDABILITY #179 — DeepSeek outage Trends lab
  '/lab/mistral.html', // FINDABILITY #180 — Mistral / Timestral Trends lab
  '/lab/palantir.html', // FINDABILITY #183 — Palantir / AIP / government AI Trends lab
  '/lab/amd.html', // FINDABILITY #184 — AMD / MI300 / Instinct AI GPU Trends lab
  '/lab/tesla.html', // FINDABILITY #185 — Tesla / FSD / Autopilot Trends lab
  '/lab/tsmc.html', // FINDABILITY #168 — TSMC / AI foundry Trends lab
  '/model/claude.html',
  '/model/gemini.html',
  '/model/gemma.html',
  '/model/gpt.html',
  '/model/qwen.html',
  '/model/muse-spark.html', // FINDABILITY #245 — Muse Spark / Muse Spark Open model hub
  '/model/muse-wonder.html',
  '/model/fable.html', // FINDABILITY #246 — Fable / Claude Fable model hub
  '/pillar/capability.html',
  '/source/aws-ml.html',
  '/source/bloomberg-tech.html',
  '/source/bluesky-ai.html',
  '/source/github-releases.html',
  '/source/gnews-ai.html',
  '/source/guardian-ai.html',
  '/source/hf-daily-papers.html',
  '/source/hn-ai.html',
  '/source/hn-fresh-ai.html',
  '/source/lesswrong.html',
  '/source/nyt-tech.html',
  '/source/reddit-artificial.html',
  '/source/reddit-chatgpt.html',
  '/source/reddit-controlproblem.html',
  '/source/reddit-localllama.html',
  '/source/reddit-machinelearning.html',
  '/source/reddit-singularity.html',
  '/source/techcrunch-ai.html',
  '/source/techmeme.html',
  '/source/wires-ai.html',
  // FINDABILITY #48/#49: archive-widened feed adapters — Bing path after deploy.
  '/source/arxiv-newest.html',
  '/source/verge-ai.html',
  '/source/reddit-openai.html',
  '/source/arstechnica-ai.html',
  '/source/openai.html',
  '/source/mit-news-ai.html',
  '/source/huggingface-blog.html',
  '/source/wired-ai.html',
  '/source/bbc-tech.html',
  '/source/hf-trending-models.html',
  '/source/latent-space.html',
  '/source/reddit-technology.html',
  '/source/nvidia-blog.html',
  '/source/deepmind.html',
  '/source/anthropic-status.html',
  '/source/simon-willison.html',
  '/tags/chatbots.html',
  '/tags/huggingface.html', // FINDABILITY #182 — Hugging Face hack / incident Trends tag

  '/tags/cybersecurity.html',
  '/tags/frontier-models.html',
  '/tags/gemini-4.html',
  '/tags/labor.html',
  '/tags/military.html',
  '/tags/pretraining.html',
  '/tags/show-hn.html',
  '/tags/uk.html',
]);

function keyLocation() {
  return `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`;
}

function abs(pathOrUrl) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const p = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `https://${INDEXNOW_HOST}${p}`;
}

/** Pull <loc> values out of a news-sitemap (or ordinary sitemap) file. */
export function locsFromSitemap(xml, cap = 80) {
  const out = [];
  for (const m of String(xml).matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
    out.push(m[1].trim());
    if (out.length >= cap) break;
  }
  return out;
}

/** Newest UTC day hubs built under public/news/ (Skynet freshness signal). */
export function dayHubPathsFromOutDir(outDir, cap = 30) {
  const newsDir = join(outDir, 'news');
  if (!existsSync(newsDir)) return [];
  try {
    return readdirSync(newsDir)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.html$/.test(f))
      .sort()
      .reverse()
      .slice(0, cap)
      .map((f) => `/news/${f}`);
  } catch {
    return [];
  }
}

export function defaultUrlList({ outDir = join(ROOT, 'public') } = {}) {
  const urls = ALWAYS.map(abs);
  const newsPath = join(outDir, 'news-sitemap.xml');
  if (existsSync(newsPath)) {
    try {
      // Match raised NEWS_SITEMAP_CAP (FINDABILITY #50) while Google News contested.
      urls.push(...locsFromSitemap(readFileSync(newsPath, 'utf8'), 200));
    } catch { /* publish without a news sitemap is fine */ }
  }
  // Preferential: UTC day hubs on disk (FINDABILITY #49) — Bing learns Skynet-shaped
  // freshness landings even when sitemap.xml is not yet rebuilt in this tree.
  urls.push(...dayHubPathsFromOutDir(outDir, 30).map(abs));
  // Sample the ordinary sitemap so archived /item/* and new facets get
  // notified without submitting every Ready URL every hour (tip #45).
  const smPath = join(outDir, 'sitemap.xml');
  if (existsSync(smPath)) {
    try {
      const locs = locsFromSitemap(readFileSync(smPath, 'utf8'), 5000);
      const archiveItems = locs.filter((u) => /\/item\/(?!archive)/i.test(u));
      const facets = locs.filter((u) => /\/(tags|kind|outlet|model|people|source|pillar|lab|vs|companies|models|countries|outlets|sources|kinds|pillars|news\/\d{4})/i.test(u));
      // Newest-looking paths tend to sort later in our sitemap build; take tails.
      urls.push(...archiveItems.slice(-120));
      urls.push(...facets.slice(-80));
    } catch { /* optional */ }
  }
  return [...new Set(urls)];
}

export async function submitIndexNow(urlList, {
  fetchImpl = fetch,
  endpoints = ENDPOINTS,
  key = INDEXNOW_KEY,
  host = INDEXNOW_HOST,
} = {}) {
  const list = [...new Set(urlList.map(abs))].slice(0, 10_000);
  if (!list.length) return { ok: true, submitted: 0, results: [] };

  const body = JSON.stringify({
    host,
    key,
    keyLocation: `https://${host}/${key}.txt`,
    urlList: list,
  });

  const results = [];
  for (const endpoint of endpoints) {
    try {
      const res = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body,
        signal: AbortSignal.timeout(20_000),
      });
      results.push({ endpoint, status: res.status, ok: res.status >= 200 && res.status < 300 || res.status === 202 });
    } catch (err) {
      results.push({ endpoint, status: 0, ok: false, error: err.message });
    }
  }
  return { ok: results.some((r) => r.ok), submitted: list.length, results, keyLocation: keyLocation() };
}

async function main(argv) {
  const urls = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--url' && argv[i + 1]) { urls.push(argv[++i]); continue; }
  }
  const list = urls.length ? urls : defaultUrlList();
  console.log(`indexnow: submitting ${list.length} URLs (key ${keyLocation()})`);
  const out = await submitIndexNow(list);
  for (const r of out.results) {
    console.log(`  ${r.endpoint} → ${r.status}${r.error ? ` (${r.error})` : ''}`);
  }
  if (!out.ok) {
    console.warn('indexnow: no endpoint accepted the payload; search engines will catch up via sitemap');
    process.exitCode = 0; // never fail the publish lane
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main(process.argv.slice(2)).catch((err) => {
    console.warn(`indexnow: ${err.message}`);
    process.exitCode = 0;
  });
}
