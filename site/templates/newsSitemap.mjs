// Google News sitemap. pizzint ships /news-sitemap.xml with a rolling ~48h
// window and news:keywords per entry. COMPETITIVE.md §0.1 / SITE-UPGRADES-90
// Month 1D: this channel was a 404. Only items whose published_at falls inside
// the window are listed; older item pages stay in sitemap.xml as ordinary URLs.

import { esc } from './_html.mjs';
import { slugFor } from './itemPage.mjs';
import { TOPIC_DEFS, itemMatchesTag } from './tagPages.mjs';
import * as brand from '../brand.mjs';

/** Hours a URL stays eligible for the news sitemap. Google's documented
 *  window is roughly two days; keep ours tight so the file stays a freshness
 *  signal rather than a second full archive. */
export const NEWS_WINDOW_HOURS = 48;

/** Cap so a burst of 300+ items in a day cannot ship a multi-megabyte news
 *  sitemap. Newest first; the rest remain in the ordinary sitemap. Raised from
 *  150 while pizzint's news-sitemap flaps thin↔alive again (COMPETITIVE-SEO.md,
 *  FINDABILITY #50) — 48h window often holds 300–400 scored items. */
export const NEWS_SITEMAP_CAP = 200;

function itemStamp(item) {
  return item.published_at || (item.meta && item.meta.first_seen_at) || null;
}

/** High-signal lab / model surfaces for Google News contest (vs pizzint). */
const NEWS_KEYWORD_LABS = Object.freeze([
  'OpenAI', 'Anthropic', 'Google', 'DeepMind', 'Meta', 'xAI', 'Mistral', 'NVIDIA',
  'Microsoft', 'Amazon', 'AWS', 'Hugging Face', 'HuggingFace',
  'Apple', 'Apple Intelligence', 'Palantir', 'ByteDance', 'Seed-OSS',
  'SoftBank', 'Adobe', 'Intel', 'Samsung', 'TSMC', 'Taiwan Semiconductor',
  'Tesla', 'Waymo', 'ASML', 'Micron',
  'Claude', 'GPT', 'Gemini', 'Qwen', 'DeepSeek-R', 'Llama', 'Gemma',
  'Satya Nadella', 'Sam Altman', 'Elon Musk', 'Dario Amodei', 'Jensen Huang',
  'Mark Zuckerberg', 'Greg Brockman', 'Yann LeCun', 'Andrej Karpathy', 'Yoshua Bengio',
  'Sundar Pichai', 'Demis Hassabis', 'Ilya Sutskever', 'Mustafa Suleyman', 'Liang Wenfeng',
  'Geoffrey Hinton', 'Alex Karp', 'Mira Murati', 'Arthur Mensch', 'Koray Kavukcuoglu',
  'DeepSeek', 'AMD', 'Broadcom', 'Oracle', 'Tencent', 'Qualcomm', 'Qwen', 'Alibaba', 'Alibaba Cloud',
  'Huawei', 'Sony', 'Supermicro', 'IREN', 'OpenRouter', 'Reflection AI',
  'Muse Wonder', 'Artificial Analysis', 'Decart', 'Sakana AI', 'Isomorphic Labs',
  'Physical Intelligence', 'Zhipu', 'Z.ai', 'Cloudflare',
  'Winverse AI', 'Cisco', 'Epoch AI', 'Maia', 'Maia 300', 'OpenAI Codex', 'Codex',
  'Salesforce', 'World Labs', 'Firmus', 'SpaceX', 'HCLTech', 'Suno', 'Manus', 'Nano Banana',
  'Jev', 'TypeSafe', 'a16z', 'Instinct', 'OpenAI Dots', "McDonald's", 'Walmart', 'Netflix',
  'Moonshot AI', 'Moonshot', 'CoreWeave', 'Kimi', 'Kimi K2',
  'Cognition', 'Devin', 'Groq', 'Grok', 'Grok 4.7',
  'EmbeddingGemma', 'SynthID', 'Clef', 'Clef-omni', 'Clef-flash',
  'Mistral Large 4', 'Le Chonk', 'Mixtral',
  'GPT-6 Astra', 'GPT-6.1 Astra', 'GPT-6 Luna', 'GPT-6 Sol',
  'Gemini 4 Argon', 'Gemini 4 Carbon', 'Gemini 4',
  // FINDABILITY #187 — bare Argon beside Gemini 4 Argon (labAboutLabel Gemini / Argon).
  'Argon',
  'GLM-5.3', 'GLM5.3', 'GLM-5', 'GLM',
  'Claude Opus 5.5', 'Opus 5.5',
  // FINDABILITY #50 — surfaces scoring in the live 48h window this pass.
  'Google DeepMind', 'Nemotron', 'o-series', 'Alibaba Qwen',
  // FINDABILITY #59 — surfaces in the live 48h window this pass (google-news-open).
  'Trail of Bits', 'DualEntry', 'Qwen N1', 'Grok Voice', 'HomeView',
  'AA-AgentPerf', 'Thomson Reuters', 'DeepSeek V4.1', 'MI355X',
  // FINDABILITY #70 — pizzint-news-alive (14 URLs); live 48h surfaces this pass.
  'Character.AI', 'Character AI', 'Mythos', 'Sarah Friar', 'Sachin Katti',
  'Prime Intellect', 'Moondream', 'ollama', 'Bank of America', 'Chainalysis',
  'x402', 'Coinbase', 'Base', 'YouTube Music', 'Caterpillar',
  // FINDABILITY #78 — google-news-open; live 48h surfaces after stale gh-pages news-sitemap.
  'Claude Code', 'claude-code', 'YouTube',
  // FINDABILITY #82 — pizzint-news-alive: promote ChatGPT into named labs so the
  // 12-cap does not bury it under topic tags; Pentagon + EDPB from live 48h titles.
  'ChatGPT', 'Pentagon', 'EDPB',
  // FINDABILITY #108 — google-news-open; live 48h surfaces (MediaTek deal titles,
  // Cathie Wood / CoreWeave tape, Salesforce vs ServiceNow AI revenue).
  'MediaTek', 'Cathie Wood', 'ServiceNow',
  // FINDABILITY #109 — pizzint-news-alive / google-news-open: Cathie Wood tape
  // names Kodiak AI beside CoreWeave; without a lab needle the 12-cap kept only
  // CoreWeave + Cathie Wood and dropped the company surface.
  'Kodiak AI', 'Kodiak',
  // FINDABILITY #159 — Trends stock / neocloud tape: Iris Energy + Neoclouds
  // as named needles so titles that use the long form survive the 12-cap.
  'Iris Energy', 'Neoclouds', 'neocloud',
  // FINDABILITY #161 — NVDA ticker needle when titles use the ticker alone.
  'NVDA',
  // FINDABILITY #172 — Trends product aliases as named needles when titles use
  // the short form alone (labAboutLabel Muse / Apple Intelligence / Copilot).
  'Muse', 'Copilot',
  // FINDABILITY #173 — Grok needle when titles use the product alone.
  'Grok',
  // FINDABILITY #174 — Gemma needle when titles use the open-model name alone.
  'Gemma', 'Gemma 4',
  // FINDABILITY #175 — HBM / SK Hynix needles when titles use memory-chip forms
  // beside Samsung (labAboutLabel HBM).
  'HBM', 'SK Hynix',
  // FINDABILITY #178 — Datacenters tag needle when titles use the topic alone
  // beside Oracle (Trends tag hub).
  'Datacenters',
  // FINDABILITY #180 — Timestral / CERN Flare needles when titles use product
  // forms beside Mistral (labAboutLabel Timestral).
  'Timestral', 'CERN', 'Flare',
  // FINDABILITY #183 — AIP / Gotham needles when titles use product forms
  // beside Palantir (labAboutLabel AIP).
  'AIP', 'Gotham',
  // FINDABILITY #184 — MI300 / Instinct needles beside AMD (labAboutLabel MI300).
  'MI300', 'Instinct',
  // FINDABILITY #185 — FSD / Autopilot needles beside Tesla (labAboutLabel FSD).
  'FSD', 'Autopilot',
  // FINDABILITY #199 — google-news-open; live 48h surfaces this pass:
  // Anthropic grants METR employee-level access (safety eval tape); Amazon Bee
  // wearable titles often lead with bare "Bee" after the possessive.
  'METR', 'Bee',
  // FINDABILITY #275 — multi-title Bee Frontier / Bee Eclipse wearable tape;
  // bare Bee (+ Amazon) fill 12-cap slots while product-class Frontier /
  // Eclipse titles drop the device surfaces (parallel to Krea 3 #256 /
  // Flux 3 #258).
  'Bee Frontier', 'Bee Eclipse',
  // FINDABILITY #200 — pizzint-news-alive (14 URLs); Swiss open multimodal
  // Apertus 1.5 release tape in the live 48h window.
  'Apertus', 'Apertus 1.5',
  // FINDABILITY #204 — google-news-open; live 48h surfaces this pass:
  // Bluesky Attie AI builder tape (titles name Bluesky / Attie without lab
  // needles surviving the 12-cap); Nscale neocloud IPO / datacenter tape.
  'Bluesky', 'Attie', 'Nscale',
  // FINDABILITY #206 — pizzint-news-alive / contested; Ukraine Starshield
  // access tape names the product beside SpaceX — keep the 12-cap from
  // burying Starshield under topic tags.
  'Starshield',
  // FINDABILITY #208 — Tesla Trends trending (flying cars / Roadster tape);
  // live 48h titles name Roadster while FSD already fills a 12-cap slot.
  'Roadster',
  // FINDABILITY #212 — pizzint-news-alive / contested; live 48h eval tape
  // names Fable 5 / 5.1 / 5.5 beside Gemini Argon / Opus — keep the 12-cap
  // from burying the model-class needle under topic tags (Azure Fable 5.5
  // title currently ships only Google + Cloud AI keywords).
  'Fable', 'Fable 5', 'Fable 5.1', 'Fable 5.5',
  // FINDABILITY #214 — contested Google News; live 48h ChatGPT Voice /
  // GPT-Live-1.1 tape names the product while OpenAI + ChatGPT already fill
  // 12-cap slots (titles ship without Voice / GPT-Live needles).
  'ChatGPT Voice', 'GPT-Live', 'GPT-Live-1.1',
  // FINDABILITY #216 — contested Google News; Microsoft MAI-Base-2 MoE tape
  // names the model while Coinbase "Base" + topic tags fill the 12-cap and
  // drop MAI-Base (bare Base also false-matched inside MAI-Base-* — fixed below).
  'MAI-Base', 'MAI-Base-2',
  // FINDABILITY #222 — multi-title Muse Spark / Muse Spark Open tape;
  // #172 Muse alias already fires beside Meta, but 12-cap leaves product-class
  // titles (Muse Spark Open vs DeepSeek…) without Muse Spark in keywords.
  'Muse Spark', 'Muse Spark Open',
  // FINDABILITY #224 — multi-title Tencent Cloud rogue-agent tape; bare
  // Tencent already fills a 12-cap slot (parallel to Alibaba Cloud) while
  // product-class "Tencent Cloud" titles drop the cloud surface.
  'Tencent Cloud',
  // FINDABILITY #226 — multi-title CERT-In AI-agent cyber tape (India CERT);
  // titles name CERT-In while topic/source meta fill the 12-cap and drop the
  // agency surface.
  'CERT-In',
  // FINDABILITY #228 — multi-title DeepSeek V4.1 Flash tape; DeepSeek V4.1
  // already fills a 12-cap slot while product-class "Flash" titles drop the
  // variant surface (OpenCode free-tier + Muse Spark Open vs Flash).
  'DeepSeek V4.1 Flash',
  // FINDABILITY #231 — multi-title Nemotron 3.5 Super VL tape; bare Nemotron
  // already fills a 12-cap slot while product-class Super VL titles (vs Qwen
  // Omni Flash + vs Mage-VL) drop the variant surface.
  'Nemotron 3.5 Super VL',
  // FINDABILITY #234 — multi-title Nemotron 3.5 Bolt companion tape; bare
  // Nemotron (+ Super VL) fill 12-cap slots while HF slug + "Bolt Models"
  // titles drop the Bolt product surface (parallel to Bee #199 bare needle).
  'Bolt',
  // FINDABILITY #236 — multi-title DeepSeek V4 Pro tape; bare DeepSeek /
  // DeepSeek-R fill 12-cap slots while vs-Nemotron titles drop the V4 Pro
  // product surface (does not match DeepSeek V4.1 Pro).
  'DeepSeek V4 Pro',
  // FINDABILITY #238 — multi-title Qwen3.8 tape (Max + Omni Flash vs Nemotron);
  // bare Qwen fills a 12-cap slot while product-class Qwen3.8 titles drop the
  // version surface (hold standalone Omni Flash bilingual / Max-only needles).
  'Qwen3.8',
  // FINDABILITY #241 — multi-title Airship AI tape while google-news-open
  // (ISO 42001 enterprise AI + AISP holdings); topic/source meta fill the
  // 12-cap and drop the company surface (parallel to Nscale #204).
  'Airship',
  // FINDABILITY #250 — multi-title ModelSphere open-source LLM serving tape
  // while google-news-open (RiseUnion / 4Paradigm / Phancy); topic/source
  // meta fill the 12-cap and drop the product surface.
  'ModelSphere',
  // FINDABILITY #256 — multi-title Krea 3 image-model tape while
  // google-news-open (vs Qwen Image 3.0 + Frontier Image Model); Qwen /
  // topic meta fill the 12-cap and drop the Krea product surface.
  'Krea', 'Krea 3',
  // FINDABILITY #258 — multi-title Flux 3 / FLUX 3 Image Klein open-weights
  // image tape while google-news-open (Black Forest Labs); topic/source meta
  // fill the 12-cap when titles rotate into the newest-200 window.
  'Flux 3',
  // FINDABILITY #260 — multi-title Together AI inference/hosting tape
  // (Stanford Hybrid Reasoning Agents + Muse Spark Open on Together); topic
  // meta fill the 12-cap when titles rotate into the newest-200 window.
  'Together AI',
  // FINDABILITY #267 — multi-title Terafab Texas fab tape while
  // pizzint-news-alive (TSMC / Musk talks); bare TSMC fills a 12-cap slot
  // while product-class Terafab titles drop the fab surface.
  'Terafab',
  // FINDABILITY #269 — multi-title Cohere acquisition / cyber tape while
  // pizzint-news-alive; lab is entity-tagged today but missing from
  // NEWS_KEYWORD_LABS so headline-only / tip-merge paths drop Cohere under
  // the 12-cap (parallel to Airship #241).
  'Cohere',
  // FINDABILITY #271 — multi-title Accenture Claude-spend tape while
  // pizzint-news-alive; Anthropic / Claude fill 12-cap slots and drop the
  // consulting-buyer company surface (parallel to CERT-In #226 / Airship #241).
  'Accenture',
  // FINDABILITY #273 — multi-title G7 AI cyberattack-drill tape while
  // pizzint-news-alive (4 titles); Google / topic / source meta fill the
  // 12-cap and drop the G7 forum surface (parallel to CERT-In #226).
  'G7',
  // FINDABILITY #277 — multi-title Surface Laptop Ultra AI-laptop tape while
  // pizzint-news-alive (4 titles); Microsoft / Copilot fill 12-cap slots and
  // drop the product-class Surface Laptop Ultra surface (parallel to Bee
  // Frontier #275 / Krea 3 #256).
  'Surface Laptop Ultra',
]);

/**
 * Boundary regex for a NEWS_KEYWORD_LABS needle.
 * FINDABILITY #216 — Coinbase "Base" must not match the Base token inside
 * MAI-Base / MAI-Base-2 (hyphen is otherwise a valid non-alnum boundary).
 */
export function labNeedleRe(lab) {
  const esc = String(lab).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (lab === 'Base') {
    return new RegExp(`(?:^|[^A-Za-z0-9-])${esc}(?:[^A-Za-z0-9]|$)`, 'i');
  }
  return new RegExp(`(?:^|[^A-Za-z0-9])${esc}(?:[^A-Za-z0-9]|$)`, 'i');
}

/**
 * labAboutLabel product/ticker aliases for news:keywords (FINDABILITY #146/#147).
 * Applied only when the parent lab is already named — never as bare needles.
 * FINDABILITY #159 — CoreWeave→neocloud and IREN→Iris Energy match Trends
 * HEAD_TERMS / gated pages (#155/#152/#157) so Google News keywords align
 * with the watchlist routing FAQ (#158) when those names dominate the tape.
 * FINDABILITY #172 — Meta→Muse, Apple→Apple Intelligence, Microsoft→Copilot
 * align news:keywords with Trends FAQs #169/#170/#171.
 */
const LAB_KEYWORD_ALIASES = Object.freeze([
  { re: /\bMicron\b/i, name: /^Micron$/i, alias: 'MU' },
  { re: /\bOpenAI\b/i, name: /^OpenAI$/i, alias: 'ChatGPT' },
  { re: /\bAnthropic\b/i, name: /^Anthropic$/i, alias: 'Claude' },
  { re: /\b(?:Google\s+)?DeepMind\b/i, name: /^(?:Google\s+)?DeepMind$/i, alias: 'Gemini' },
  // FINDABILITY #187 — Gemini → Argon (labAboutLabel) when parent named.
  { re: /\bGemini\b/i, name: /^Gemini$/i, alias: 'Argon' },
  { re: /\bCoreWeave\b/i, name: /^CoreWeave$/i, alias: 'neocloud' },
  { re: /\bIREN\b/i, name: /^IREN$/i, alias: 'Iris Energy' },
  // FINDABILITY #161 — NVIDIA ticker alias (labAboutLabel NVDA).
  { re: /\bNVIDIA\b/i, name: /^NVIDIA$/i, alias: 'NVDA' },
  // FINDABILITY #172 — Trends product aliases (labAboutLabel Muse / Apple Intelligence / Copilot).
  { re: /\bMeta(?:\s+AI)?\b/i, name: /^Meta(?:\s+AI)?$/i, alias: 'Muse' },
  { re: /\bApple\b/i, name: /^Apple$/i, alias: 'Apple Intelligence' },
  { re: /\bMicrosoft\b/i, name: /^Microsoft$/i, alias: 'Copilot' },
  // FINDABILITY #173 — xAI → Grok (labAboutLabel).
  { re: /\bxAI\b/i, name: /^xAI$/i, alias: 'Grok' },
  // FINDABILITY #175 — Samsung → HBM (labAboutLabel).
  { re: /\bSamsung\b/i, name: /^Samsung$/i, alias: 'HBM' },
  // FINDABILITY #176 — Character.ai / Character AI → Chatbots (Trends tag hub).
  { re: /\bCharacter\.AI\b|\bCharacter\s+AI\b/i, name: /^(?:Character\.AI|Character\s+AI)$/i, alias: 'Chatbots' },
  // FINDABILITY #177 — Alibaba → Qwen (labAboutLabel) when parent named.
  { re: /\bAlibaba(?:\s+Cloud)?\b/i, name: /^(?:Alibaba(?:\s+Cloud)?)$/i, alias: 'Qwen' },
  // FINDABILITY #178 — Oracle → Datacenters (Trends tag hub) when parent named.
  { re: /\bOracle\b/i, name: /^Oracle$/i, alias: 'Datacenters' },
  // FINDABILITY #180 — Mistral → Timestral (labAboutLabel) when parent named.
  { re: /\bMistral\b/i, name: /^Mistral$/i, alias: 'Timestral' },
  // FINDABILITY #183 — Palantir → AIP (labAboutLabel) when parent named.
  { re: /\bPalantir\b/i, name: /^Palantir$/i, alias: 'AIP' },
  // FINDABILITY #184 — AMD → MI300 (labAboutLabel) when parent named.
  { re: /\bAMD\b/i, name: /^AMD$/i, alias: 'MI300' },
  // FINDABILITY #185 — Tesla → FSD (labAboutLabel) when parent named.
  { re: /\bTesla\b/i, name: /^Tesla$/i, alias: 'FSD' },
  // FINDABILITY #206 — SpaceX → Starshield when parent named.
  { re: /\bSpaceX\b/i, name: /^SpaceX$/i, alias: 'Starshield' },
]);

/**
 * Build news:keywords with named entities and lab surfaces first so the 12-cap
 * does not drop them when many topic tags also match (pizzint-news-alive).
 */
export function keywordsFor(item) {
  const named = [];
  // Prefer the published entity list already on the NewsItem (falsifiable).
  for (const name of (Array.isArray(item.entities) ? item.entities : [])) {
    if (typeof name === 'string' && name.trim()) named.push(name.trim());
  }
  // Lab / model surfaces printed in the headline — before topic tags so they
  // survive the keyword cap when a story matches a dozen topic needles.
  const hay = `${item.title || ''} ${item.summary || ''}`;
  for (const lab of NEWS_KEYWORD_LABS) {
    if (labNeedleRe(lab).test(hay)) named.push(lab);
  }
  // FINDABILITY #146/#147 — emit labAboutLabel aliases when parent lab named.
  for (const { re, name, alias } of LAB_KEYWORD_ALIASES) {
    if (named.some((n) => name.test(n)) || re.test(hay)) named.push(alias);
  }
  const topics = [];
  for (const topic of TOPIC_DEFS) {
    if (itemMatchesTag(item, topic)) topics.push(topic.name);
  }
  const meta = [];
  if (item.pillar) meta.push(item.pillar);
  if (item.kind) meta.push(String(item.kind));
  // Source slug is low-signal for Google News; keep it after head terms.
  if (item.source) meta.push(String(item.source).slice(0, 40));
  // Head terms before topic tags and pillar/source meta so thin rows still read
  // as AI news (live still ships "attention, <source>, AI, SIREN"; topic-first
  // order also buried "AI" under pillar-shaped tags — FINDABILITY #50/#57).
  const bits = [
    ...named,
    'AI',
    'artificial intelligence',
    brand.NAME,
    ...topics,
    ...meta,
  ];
  // Cap 12 so entity + topic + lab keywords stay under Google News practical limits
  // while pizzint's thin news-sitemap is contested again (COMPETITIVE-SEO.md).
  return [...new Set(bits)].slice(0, 12).join(', ');
}

/** Items young enough for the news sitemap, newest first. */
export function newsEligible(ctx, nowMs = Date.now()) {
  const items = ctx.news && Array.isArray(ctx.news.items) ? ctx.news.items : [];
  const cutoff = nowMs - NEWS_WINDOW_HOURS * 3600 * 1000;
  return items
    .map((it) => ({ it, stamp: itemStamp(it), ms: Date.parse(itemStamp(it) || '') }))
    .filter((row) => Number.isFinite(row.ms) && row.ms >= cutoff)
    .sort((a, b) => b.ms - a.ms)
    .slice(0, NEWS_SITEMAP_CAP);
}

export function render(ctx) {
  const rows = newsEligible(ctx);
  const body = rows.map(({ it, stamp }) => {
    const loc = ctx.url(`/item/${slugFor(it)}.html`);
    const title = String(it.title || 'Untitled').slice(0, 200);
    return `  <url>
    <loc>${esc(loc)}</loc>
    <news:news>
      <news:publication>
        <news:name>${esc(brand.PUBLICATION)}</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${esc(stamp)}</news:publication_date>
      <news:title>${esc(title)}</news:title>
      <news:keywords>${esc(keywordsFor(it))}</news:keywords>
    </news:news>
  </url>`;
  }).join('\n');

  // Tip comments for crawlers that open the news sitemap first (FINDABILITY #84).
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- ${brand.NAME} Google News window (48h, cap ${NEWS_SITEMAP_CAP}). Not a doom forecast. -->
<!-- Full sitemap: ${ctx.url('/sitemap.xml')} · Free tools: ${ctx.url('/free-tools.html')} · Verify: ${ctx.url('/verify.html')} -->
<!-- Search Trends (watched, not scored): ${ctx.url('/search-trends.html')} · Agents: ${ctx.url('/llms.txt')} -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${body}
</urlset>
`;
}
