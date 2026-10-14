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

import { readFileSync, existsSync } from 'node:fs';
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
  '/news.html',
  '/methodology.html',
  '/methodology.md',
  '/history.html',
  '/about.html',
  '/privacy.html',
  '/press.html',
  '/terms.html',
  '/disclosures.html',
  '/brand.html',
  '/guide.html',
  '/guide.md',
  '/compare.html',
  '/alternatives.html',
  '/guides.html',
  '/guides.md',
  '/vs.html',
  '/vs/doombench.html',
  '/vs/skynet-countdown.html',
  '/vs/pdoom.html',
  '/vs/pizzint.html',
  '/vs/takeofftracker.html',
  '/companies.html',
  '/models.html',
  '/people.html',
  '/tags.html',
  '/kinds.html',
  '/outlets.html',
  '/sources.html',
  '/pillars.html',
  '/pillar/',
  '/countries.html',
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
  '/instruments.html',
  '/waffle.html',
  '/threats.html',
  '/si-ready.html',
  '/nations.html',
  '/ai-proof-job.html',
  '/status.html',
  '/bug-out-land.html',
  '/prepper-checklist.html',
  '/bunker-kit.html',
  '/si-watch.html',
  '/bets.html',
  '/self-aware.html',
  '/day-after.html',
  '/contain.html',
  '/moltbook.html',
  '/games.html',
  '/evolution.html',
  '/radio.html',
  '/videos.html',
  '/live.html',
  '/catalog.html',
  '/search.html',
  '/tally.html',
  '/staff.html',
  '/careers.html',
  '/agents.html',
  '/elon.html',
  '/game.html',
  '/dispatch.html',
  '/monitor.html',
  '/scanner.html',
  '/arena.html',
  '/live-x.html',
  '/feedback.html',
  '/alerts.html',
  '/export.html',
  '/bias.html',
  '/reference-plan.html',
  '/changelog.html',
  '/labs.html',
  '/library.html',
  '/sponsor.html',
  '/nothing.html',
  '/moves/',
  '/classic.html',
  '/tags/red-teaming.html',
  '/country/',
  '/lab/',
  '/p-doom.html',
  '/ai-doomsday-clock.html',
  '/jobs.html',
  '/medicine.html',
  '/race.html',
  // Facet indexes + archive hub — Bing path for the long-tail after deploy
  // (Google still uses sitemaps; FINDABILITY.md).
  '/item/archive.html',
  '/item/',
  '/tags/',
  '/kind/',
  '/outlet/',
  '/model/',
  '/model/muse-wonder.html',
  '/model/maia.html',
  '/model/codex.html',
  '/model/nano-banana.html',
  '/lab/epoch-ai.html',
  '/lab/artificial-analysis.html',
  '/lab/salesforce.html',
  '/lab/world-labs.html',
  '/lab/firmus.html',
  '/lab/spacex.html',
  '/lab/hcltech.html',
  '/lab/suno.html',
  '/lab/manus.html',
  '/lab/yandex.html',
  '/lab/tiktok.html',
  '/tags/agent-skills.html',
  '/tags/neoclouds.html',
  '/tags/ai-slop.html',
  '/tags/gulf-ai.html',
  '/tags/agentic-ai.html',
  '/tags/ai-security.html',
  '/tags/ai-factories.html',
  '/tags/amazon-bedrock.html',
  '/tags/claude-opus.html',
  '/tags/claude-haiku.html',
  '/tags/intelligent-ui.html',
  '/tags/gpt-6.html',
  '/tags/emergency-brake.html',
  '/tags/big-tech.html',
  '/tags/gpt-6-astra.html',
  '/tags/gemini-4.html',
  '/tags/ai-waiver.html',
  '/tags/openai-agents.html',
  '/tags/ai-bubble.html',
  '/tags/openai-revenue.html',
  '/tags/recursive-self-improvement.html',
  '/tags/ai-boom.html',
  '/tags/deep-learning.html',
  '/tags/ai-spending.html',
  '/tags/ai-training.html',
  '/tags/rogue-ai.html',
  '/tags/ai-incidents.html',
  '/tags/ai-computing.html',
  '/tags/ai-demand.html',
  '/tags/decision-models.html',
  '/tags/representation-learning.html',
  '/tags/opus-5-5.html',
  '/tags/off-policy.html',
  '/tags/internet-access.html',
  '/tags/manipulation-tasks.html',
  '/tags/safety-concerns.html',
  '/tags/chatgpt-teens.html',
  '/tags/large-language-models.html',
  '/tags/frontier-ai.html',
  '/tags/local-ai.html',
  '/tags/ai-generated.html',
  '/tags/policy-optimization.html',
  '/tags/white-house.html',
  '/tags/ai-tools.html',
  '/tags/ai-risks.html',
  '/tags/ai-systems.html',
  '/tags/machine-learning.html',
  '/tags/ai-industry.html',
  '/tags/ai-use.html',
  '/tags/ai-cloud.html',
  '/tags/ai-era.html',
  '/tags/south-korea.html',
  '/tags/singapore.html',
  '/tags/uk.html',
  '/tags/india.html',
  '/tags/eu.html',
  '/tags/australia.html',
  '/tags/show-hn.html',
  '/tags/silicon-valley.html',
  '/tags/government-websites.html',
  '/tags/security-incidents.html',
  '/tags/artificial-intelligence.html',
  '/tags/chatbots.html',
  '/tags/liability.html',
  '/tags/cybersecurity.html',
  '/tags/privacy.html',
  '/tags/ai-math.html',
  '/tags/proofs.html',
  '/tags/math-problems.html',
  '/tags/consciousness.html',
  '/tags/ads.html',
  '/tags/russia.html',
  '/tags/iran.html',
  '/tags/email.html',
  '/tags/cruelty.html',
  '/model/mixtral.html',
  '/tags/tsmc.html',
  '/people/',
  '/source/',
  '/pillar/capability.html',
  '/lab/openai.html',
  '/lab/iren.html',
  '/lab/reflection-ai.html',
  '/tags/generative-ai.html',
  '/tags/ipo.html',
  '/tags/ai-chips.html',
  '/leaders.html',
  '/tags/frontier-models.html',
  '/tags/post-training.html',
  '/tags/reinforcement-learning.html',
  '/tags/vision-language-action.html',
  '/tags/self-supervised.html',
  '/tags/diffusion-transformer.html',
  '/tags/scaling-laws.html',
  '/tags/ai-assistants.html',
  '/tags/code-generation.html',
  '/tags/state-space-models.html',
  '/tags/model-pruning.html',
  '/tags/peft.html',
  '/tags/gaussian-splatting.html',
  '/tags/test-time-training.html',
  '/tags/llm-agents.html',
  '/tags/on-policy-distillation.html',
  '/tags/time-series.html',
  '/tags/machine-unlearning.html',
  '/tags/neural-networks.html',
  '/tags/self-improving-ai.html',
  '/tags/sparse-attention.html',
  '/tags/synthid.html',
  '/lab/decart.html',
  '/lab/sakana-ai.html',
  '/lab/isomorphic-labs.html',
  '/lab/winverse-ai.html',
  '/lab/cisco.html',
  '/tags/protein-design.html',
  '/tags/drug-discovery.html',
  '/tags/edge-ai.html',
  '/tags/audio-generation.html',
  '/tags/ai-regulation.html',
  '/tags/openai-codex.html',
  '/tags/imitation-learning.html',
  '/sitemap.xml',
  '/news-sitemap.xml',
  '/llms.txt',
  '/agents.md',
  '/agents.txt',
  '/agents.json',
  '/ai.txt',
  '/skill.md',
  '/.well-known/api-catalog',
  '/now.md',
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

export function defaultUrlList({ outDir = join(ROOT, 'public') } = {}) {
  const urls = ALWAYS.map(abs);
  const newsPath = join(outDir, 'news-sitemap.xml');
  if (existsSync(newsPath)) {
    try {
      urls.push(...locsFromSitemap(readFileSync(newsPath, 'utf8'), 100));
    } catch { /* publish without a news sitemap is fine */ }
  }
  // Sample the ordinary sitemap so archived /item/* and new facets get
  // notified without submitting all ~2,750 URLs every hour.
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
