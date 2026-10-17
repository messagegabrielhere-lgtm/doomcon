// Google News sitemap. pizzint ships /news-sitemap.xml with a rolling ~48h
// window and news:keywords per entry. COMPETITIVE.md §0.1 / SITE-UPGRADES-90
// Month 1D: this channel was a 404. Only items whose published_at falls inside
// the window are listed; older item pages stay in sitemap.xml as ordinary URLs.

import { esc } from './_html.mjs';
import { slugFor } from './itemPage.mjs';
import { TOPIC_DEFS, itemMatchesTag } from './tagPages.mjs';
import * as brand from '../brand.mjs';
import { labNeedleRe } from '../../collector/tools/lab-needle.mjs';

export { labNeedleRe };

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
  // FINDABILITY #288 — CRWV ticker needle when titles use the ticker alone.
  'CRWV',
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
  // FINDABILITY #356 — multi-title Bee AI product-class companion while
  // google-news-open (2 titles: Amazon's new Bee AI devices… + Amazon
  // launches Bee AI devices…); bare Bee (+ Amazon / AWS) fill 12-cap slots
  // and drop the contiguous Bee AI surface (#199 Bee / #275 Frontier alone
  // leave "Bee AI" missing — parallel to Flying Roadster #354 / Muse Spark
  // Open #222). Amazon Bee FAQ #167 already gates the lab.
  'Bee AI',
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
  // FINDABILITY #354 — multi-title Flying Roadster product-class companion
  // while google-news-open (3 titles: Praise Tesla's Flying Roadster… + Five
  // Big Questions… Flying Roadster + Showcases Flying Roadster); Roadster /
  // FSD / Tesla fill 12-cap slots and drop the contiguous Flying Roadster
  // surface (#208 Roadster alone leaves the aerial/thruster nickname missing
  // — parallel to Muse Spark Open #222 / Bee Frontier #275). Tesla FAQ #185
  // already gates the lab.
  'Flying Roadster',
  // FINDABILITY #212 — pizzint-news-alive / contested; live 48h eval tape
  // names Fable 5 / 5.1 / 5.5 beside Gemini Argon / Opus — keep the 12-cap
  // from burying the model-class needle under topic tags (Azure Fable 5.5
  // title currently ships only Google + Cloud AI keywords).
  'Fable', 'Fable 5', 'Fable 5.1', 'Fable 5.5',
  // FINDABILITY #214 — contested Google News; live 48h ChatGPT Voice /
  // GPT-Live-1.1 tape names the product while OpenAI + ChatGPT already fill
  // 12-cap slots (titles ship without Voice / GPT-Live needles).
  'ChatGPT Voice', 'GPT-Live', 'GPT-Live-1.1',
  // FINDABILITY #336 — multi-title GPT-Live-1 tape while google-news-open
  // (3 titles: vs Qwen-Audio / vs HeyGen / Prompt-to-Voice); GPT / Google /
  // GPT-Live fill 12-cap slots and drop the SKU-class GPT-Live-1 surface
  // (#214 GPT-Live-1.1 needle does not match bare GPT-Live-1).
  'GPT-Live-1',
  // FINDABILITY #336 — multi-title Kling 4.0 / Kling AI video tape while
  // google-news-open (2 titles: Kuaishou launches Kling 4.0… + Kling AI
  // Officially Launches…); Google / topic meta fill the 12-cap and drop the
  // product-class Kling surface (parallel to Flux 3 #258 / Krea 3 #256).
  'Kling', 'Kling 4.0',
  // FINDABILITY #216 — contested Google News; Microsoft MAI-Base-2 MoE tape
  // names the model while Coinbase "Base" + topic tags fill the 12-cap and
  // drop MAI-Base (bare Base also false-matched inside MAI-Base-* — fixed below).
  'MAI-Base', 'MAI-Base-2',
  // FINDABILITY #222 — multi-title Muse Spark / Muse Spark Open tape;
  // #172 Muse alias already fires beside Meta, but 12-cap leaves product-class
  // titles (Muse Spark Open vs DeepSeek…) without Muse Spark in keywords.
  'Muse Spark', 'Muse Spark Open',
  // FINDABILITY #292 — multi-title Mac Studios hardware tape while
  // google-news-open (2 titles); Muse Spark / Muse Spark Open fill 12-cap
  // slots and drop the Mac Studios run-host surface (parallel to Qwen3.8-27B #290).
  'Mac Studios',
  // FINDABILITY #294 — singular Mac Studio companion (Apple–Meta Muse local
  // tape); #292 plural needle does not match "Mac Studio" and Apple / Meta /
  // Muse / Apple Intelligence fill the 12-cap (parallel to Muse Spark Open #222).
  'Mac Studio',
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
  // version surface (Omni Flash bilingual still held; Max SKU is #346).
  // FINDABILITY #388 — letter↔digit flex also matches live "Qwen 3.8" spaced titles.
  'Qwen3.8',
  // FINDABILITY #346 — multi-title Qwen3.8-Max SKU tape while google-news-open
  // (2 titles: vs Claude Mythos 5 EN/IT); Qwen / Qwen3.8 fill 12-cap slots and
  // drop the Max SKU surface (parallel to Mythos 5 #344 / Qwen3.8-27B #290 /
  // Qwen 4 Max #282). Hyphen↔space flex (#310) covers "Qwen3.8 Max".
  'Qwen3.8-Max',
  // FINDABILITY #290 — multi-title Qwen3.8-27B SKU tape while google-news-open
  // (2 titles); Qwen / Qwen3.8 fill 12-cap slots and drop the size-class
  // surface (parallel to Qwen3.8 #238 / Qwen 4 Max #282).
  'Qwen3.8-27B',
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
  // FINDABILITY #279 — multi-title RTX Spark on-device AI PC tape while
  // pizzint-news-alive (3 titles); NVIDIA / NVDA / topic meta fill 12-cap
  // slots and drop the product-class RTX Spark surface (parallel to Surface
  // Laptop Ultra #277).
  'RTX Spark',
  // FINDABILITY #282 — multi-title Qwen 4 Max model tape while
  // google-news-open (2 titles vs Muse Spark / Claude Opus 5.5); bare Qwen /
  // Alibaba Qwen fill 12-cap slots and drop the product-class Qwen 4 Max
  // surface (parallel to Qwen3.8 #238 / Krea 3 #256).
  'Qwen 4 Max',
  // FINDABILITY #286 — multi-title Beam open-model tape while
  // google-news-open (2 titles: Reflection's Beam + Welcome Beam); topic /
  // China AI / source meta fill the 12-cap and drop the product-class Beam
  // surface (parallel to Bolt #234 / Qwen 4 Max #282).
  'Beam',
  // FINDABILITY #298 — multi-title Vercel hosting tape while google-news-open
  // (2 titles: Vercel data shows Jev… + Jev is Vercel's…); Jev / Google /
  // OpenRouter fill the 12-cap and drop the company-class Vercel surface
  // (parallel to Accenture #271 / Airship #241).
  'Vercel',
  // FINDABILITY #302 — multi-title Elorian vision-model tape while
  // google-news-open (2 titles: Elorian launches Glimpse… + Elorian's first…);
  // Google / GPT / topic meta fill the 12-cap and drop the company-class
  // Elorian surface (parallel to Vercel #298 / Airship #241).
  'Elorian',
  // FINDABILITY #304 — multi-title Dell AI-infra tape while google-news-open
  // (2 titles: How Dell Transformed… + …Dell Drops 3%); Google / Supermicro /
  // topic meta fill the 12-cap and drop the company-class Dell surface
  // (parallel to Vercel #298 / Accenture #271).
  'Dell',
  // FINDABILITY #306 — multi-title NYC Council AI-safety hearing tape while
  // pizzint-news-alive (2 titles: SpaceX to testify at NYC Council… + NYC
  // Council hearing…); SpaceX / Starshield / Google fill the 12-cap and drop
  // the agency-class NYC Council surface (parallel to G7 #273 / CERT-In #226).
  'NYC Council',
  // FINDABILITY #320 — multi-title PS5 local-AI / llama.cpp tape while
  // google-news-open (3 titles: Llama.cpp on a jailbroken PS5… + Jailbroken
  // PS5 Turns into a Local AI Machine… + PS5 hack…); Llama / Sony / GGUF /
  // topic meta fill the 12-cap and drop the product-class PS5 surface
  // (parallel to RTX Spark #279 / Mac Studio #294).
  'PS5',
  // FINDABILITY #350 — plural PS5s companion to #320 (Jailbroken PS5s can
  // now run local AI…); labNeedleRe word boundary does not match PS5s, so
  // the singular needle misses the plural surface under the 12-cap —
  // parallel to Mac Studios #292 / Mac Studio #294.
  'PS5s',
  // FINDABILITY #338 — multi-title Xing 4.0 / XingChen-AGI MoE tape while
  // google-news-open (2 titles: Xing 4.0 vs Nemotron 3.5 Lightning… + Xing 4.0
  // vs Qwen 3.8…); Nemotron / Qwen / Google fill the 12-cap and drop the
  // product-class Xing surface (parallel to Kling 4.0 #336 / Qwen 4 Max #282).
  'Xing', 'Xing 4.0',
  // FINDABILITY #348 — multi-title Xing 4.0 29B-A4B size-SKU tape while
  // google-news-open (2 titles: vs Nemotron 3.5 Lightning + vs Qwen 3.8 27B);
  // Xing / Xing 4.0 fill 12-cap slots and drop the size-class 29B-A4B surface
  // (parallel to Qwen3.8-27B #290 / Qwen3.8-Max #346). Hold Nemotron 3.5
  // Lightning until multi-title (1 title only).
  'Xing 4.0 29B-A4B',
  // FINDABILITY #340 — multi-title Replit Anthropic/OpenAI partnership tape
  // while google-news-open (2+ titles: Replit ends partnership with Anthropic…
  // + Replit is no longer working with Anthropic…); Anthropic / OpenAI /
  // ChatGPT / Claude fill the 12-cap and drop the company-class Replit surface
  // (parallel to Accenture #271 / Vercel #298 / Airship #241).
  'Replit',
  // FINDABILITY #342 — multi-title Siri vs Gemini / Apple Intelligence tape
  // while pizzint-news-alive (3 titles: I Tested Siri and Gemini… + Siri vs.
  // Gemini… + How Does Apple’s Siri Compete…); Gemini / Google / Argon /
  // Apple Intelligence fill the 12-cap and drop the product-class Siri surface
  // (#172 Apple→Apple Intelligence alias alone leaves bare Siri missing —
  // parallel to Muse Spark #222 / Copilot product needles).
  'Siri',
  // FINDABILITY #344 — multi-title Claude Mythos 5 tape while google-news-open
  // (3 titles: vs Qwen3.8-Max EN/IT + vs DeepSeek V4 Pro); bare Mythos (#72)
  // fills a 12-cap slot but drops the version-class Claude Mythos 5 / Mythos 5
  // surface (parallel to Kling 4.0 #336 / Xing 4.0 #338 / Bee Frontier #275).
  'Claude Mythos 5', 'Mythos 5',
  // FINDABILITY #352 — multi-title Anthropic IPO tape while google-news-open
  // (3+ titles: Could an Anthropic IPO… + Anthropic IPO timing… + Anthropic IPO
  // raises 401(k)…); Anthropic / Claude / AI IPOs topic fill the 12-cap and drop
  // the contiguous event surface — FAQ #163 already gates the lab (parallel to
  // OpenAI lawsuit FAQ #162 / CERT-In #226). Hold bare Wall Street IPO noise.
  'Anthropic IPO',
  // FINDABILITY #358 — multi-title AI safety bill event needle while
  // google-news-open (3 titles: Anthropic proposes AI safety bill… + Anthropic
  // said to pitch AI safety bill… + Anthropic quietly pitches its own AI safety
  // bill…); Anthropic / Claude / AI safety topic fill the 12-cap and drop the
  // contiguous legislative surface — FAQ #163 already gates the lab (parallel to
  // Anthropic IPO #352 / CERT-In #226). Hold bare "AI safety" / NYC Council
  // hearing noise without the bill phrase.
  'AI safety bill',
  // FINDABILITY #360 — multi-title Amazon Web Services full-name companion while
  // google-news-open (2 titles: Amazon Web Services CFO… + Exclusive: Amazon Web
  // Services CFO…); Amazon / Google fill the 12-cap and the AWS acronym needle
  // does not match the long form — drop the contiguous AWS surface (parallel to
  // Bee AI #356 / Flying Roadster #354). Amazon Bee FAQ #167 already gates the
  // lab; bare "Amazon" / short "AWS" titles must not invent the long form.
  'Amazon Web Services',
  // FINDABILITY #364 — multi-title M5 Max Apple Silicon SKU tape while
  // google-news-open (2 titles: Beat Apple's M5 Max? + outperforms Apple's M5 Max
  // MacBook Pro…); Apple / Apple Intelligence / RTX Spark / Surface Laptop Ultra
  // fill the 12-cap and drop the contiguous M5 Max surface (parallel to Mac Studio
  // #294 / RTX Spark #279). Apple Intelligence FAQ #170 already gates the lab;
  // bare "M5" / MacBook Pro titles must not invent the Max SKU.
  'M5 Max',
  // FINDABILITY #370 — multi-title NIST standards-body needle while
  // google-news-open (2 titles: Anthropic Traces NIST P-256… + Anthropic Says
  // Claude Traced NIST ECDSA…); Anthropic / Claude fill the 12-cap and drop the
  // contiguous NIST surface — Canadian DC FAQ #368 / AI safety bill FAQ #362
  // already gate the lab (parallel to CERT-In #226). Hold bare ECDSA niche /
  // administration substring noise without the NIST acronym.
  'NIST',
  // FINDABILITY #380 — multi-title Allied Universal acquisition companion while
  // google-news-open (3 titles: SoftBank weighs… Allied Universal… + Bloomberg
  // reports + Sources: … Allied Universal at ~$18B); SoftBank / robotics /
  // topic meta fill the 12-cap and drop the contiguous company surface —
  // SoftBank Allied FAQ #374 already gates `/lab/softbank.html` (parallel to
  // NIST #370 / Starshield #206). Hold bare "Allied" shorthand / Warsh /
  // ECDSA / EverWind / Nudify / VCI without the full company name.
  'Allied Universal',
  // FINDABILITY #382 — multi-title Blackstone financing companion while
  // google-news-open (3 titles: Anthropic offering Blackstone 10%+ yield…
  // + FT: Anthropic offers Blackstone… + Anthropic offers Blackstone
  // double-digit yield…); Anthropic / Claude / Financial AI / compute fill
  // the 12-cap and drop the contiguous PE surface — IPO / AI safety bill /
  // Canadian DC FAQs #163/#362/#368 already gate `/lab/anthropic.html`
  // (parallel to Allied #380 / NIST #370). Hold Warsh person / ECDSA niche /
  // EverWind / Nudify / AI Jitters noise without naming Blackstone.
  'Blackstone',
  // FINDABILITY #384 — multi-title Dory 1.0 Nemotron Labs SKU companion while
  // google-news-open (2 titles: NVIDIA Nemotron Labs Dory 1.0 4B… + Dory 1.0
  // 4B vs Qwen 3.8…); NVIDIA / Nemotron / Qwen / NVDA fill the 12-cap and drop
  // the contiguous model surface — `/lab/nvidia.html` already gates the lab
  // (parallel to Bolt #234 / Muse Spark #222). Hold bare Dory name noise /
  // Qwen 3.8 spaced single / Warsh / ECDSA / Nudify / AI Jitters.
  'Dory 1.0',
  // FINDABILITY #386 — multi-title Nemotron 3.5 version companion while
  // pizzint-news-alive (2 titles in 48h: Nvidia unveils Nemotron 3.5 open
  // models… + Nvidia's Nemotron 3.5 Super VL…; 1 in newest-200, 1 armed for
  // rotate-in); bare Nemotron / Super VL fill the 12-cap and drop the contiguous
  // version surface — `/lab/nvidia.html` already gates (parallel to Qwen3.8
  // #238 / Mythos 5 #344 / Flux 3 #258 rotate-in). Hold Warsh / ECDSA /
  // Nudify / AI Jitters (#388 covers Qwen 3.8 spaced via digit flex).
  'Nemotron 3.5',
  // FINDABILITY #390 — multi-title ChatGPT Chrome / browser-assistant tape while
  // google-news-open (3 titles: ChatGPT for Chrome… + full Chrome browser
  // assistant… + peek at your Chrome tabs…); ChatGPT / OpenAI / GPT fill the
  // 12-cap and drop the contiguous browser surface — FAQ #191 already gates
  // `/lab/openai.html` (parallel to Allied #380 / Blackstone #382 / Flying
  // Roadster #354). Hold bare browser noise without ChatGPT proximity /
  // Warsh / ECDSA / Nudify / AI Jitters / METR (FAQ #392) / Replit (FAQ #412 on Anthropic lab).
  'Chrome',
  // FINDABILITY #394 — multi-title MOSS-Image open-weight image-model tape while
  // pizzint-news-alive (4 titles: vs GPT Image 2.5 + vs FLUX 3 + vs Qwen Image
  // 3.0 + vs Nano Banana 2); GPT / FLUX / Flux 3 / Qwen / Nano Banana fill the
  // 12-cap and drop the contiguous product surface (parallel to Flux 3 #258 /
  // Beam #286 / ModelSphere #250). No new doorway lab — hold Warsh / ECDSA /
  // Nudify / AI Jitters / NSA niche / CSAM adult / Replit (FAQ #412; no /lab/replit.html).
  'MOSS-Image',
  // FINDABILITY #397 — multi-title Anthropic / Claude ECDSA + NIST curve-seed
  // tape while pizzint-news-alive (4 titles); Claude / Anthropic / NIST fill
  // the 12-cap and drop the contiguous ECDSA surface — FAQ #397 gates
  // `/lab/anthropic.html` (parallel to METR FAQ #392 / Chrome #390). Hold NSA
  // niche keyword / Warsh / Nudify / AI Jitters / Replit (FAQ #412).
  // FINDABILITY #487 — labNeedleRe flex covers NSA cryptography seed/mystery
  // title forms when live tape drops contiguous ECDSA (3 titles / 0 kw).
  'ECDSA',
  // FINDABILITY #404 — multi-title Ondas–Palantir defense-AI JV tape while
  // pizzint-news-alive (2 titles: RTX, AeroVironment And Ondas-Palantir… +
  // Stocktwits… Ondas-Palantir Launch AI Firm…); Palantir / AIP fill the
  // 12-cap and drop the contiguous Ondas partner surface — Palantir gov FAQ
  // already gates `/lab/palantir.html` (parallel to CERT-In #226 / Allied
  // #380). Hold bare AeroVironment third-party / Warsh / Nudify / AI Jitters /
  // NSA niche / ollama release noise (Replit FAQ #412 on Anthropic lab).
  'Ondas',
  // FINDABILITY #448 — multi-title Anthropic GDP / $44T forecast tape while
  // pizzint-news-alive (5+ titles: Anthropic Says AI Could Push US GDP to
  // $44.4 Trillion… + Clark projects … $44T… + Anthropic forecasts U.S. GDP
  // at $44T… + AI could boost US GDP to $44 trillion… + Jack Clark Predicts
  // $44 Trillion…); Anthropic / Claude / compute fill the 12-cap and drop the
  // contiguous $44T SKU — IPO / AI safety bill / ECDSA / Blackstone /
  // Replit / Mythos FAQs already gate `/lab/anthropic.html` (parallel to
  // Anthropic IPO #352 / NIST #370 / Blackstone #382). Hold bare GDP /
  // Jack Clark person Trends / non-$44 forecasts / Warsh / Nudify / dress
  // rehearsal / ollama (labNeedleRe flex covers trillion / .4 forms).
  '$44T',
  // FINDABILITY #477 — multi-title OpenAI Navier-Stokes / AI-proof tape while
  // pizzint-news-alive (2+ titles: OpenAI releases 722 AI written math
  // papers, Navier-Stokes claim + Mathematicians say OpenAI doesn't
  // understand its own Navier-Stokes proof); OpenAI / ChatGPT / Google fill
  // the 12-cap and drop the contiguous Navier-Stokes surface — ChatGPT Chrome /
  // outage / lawsuit FAQs already gate `/lab/openai.html` (parallel to
  // CERT-In #226 / Starshield #206 / $44T #448). Hold bare Stokes / Navier
  // alone / NSA niche / Warsh / Nudify / dress-rehearsal essay / ollama
  // (labNeedleRe hyphen↔space covers "Navier Stokes").
  'Navier-Stokes',
  // FINDABILITY #479 — multi-title DeepSeek V4.1 Flash-1017 build SKU tape
  // while pizzint-news-alive (7 titles: V4.1-Flash-1017 / v4.1 flash 1017 /
  // DeepSeek-V4.1-Flash-1017 HF slug); DeepSeek / DeepSeek V4.1 Flash fill
  // the 12-cap and drop the contiguous Flash-1017 build surface — outage /
  // V4.1 Flash FAQs already gate `/lab/deepseek.html` (parallel to
  // DeepSeek V4.1 Flash #228 / Bolt #234 / $44T #448). Hold bare Flash /
  // V4.1 Flash without 1017 / Warsh / Nudify / NSA / ollama (labNeedleRe
  // hyphen↔space covers "Flash 1017").
  'Flash-1017',
  // FINDABILITY #481 — multi-title Stripe OpenRouter acquisition tape while
  // pizzint-news-alive (2 titles); OpenRouter / Google fill 12-cap slots and
  // drop the payments-buyer company surface (parallel to Accenture #271 /
  // Vercel #298 / SoftBank Allied #374). Hold Warsh / Nudify / NSA / ollama /
  // Workday thin / Series B thin / dress-rehearsal essay.
  'Stripe',
  // FINDABILITY #489 — multi-title Intel Razor Lake-AX AI-PC / TOPS SKU tape
  // while pizzint-news-alive (2 titles: confirms Razor Lake-AX… + "Razor
  // Lake-AX" 700 TOPS…); Intel / Google fill 12-cap slots and drop the
  // contiguous product surface — `/lab/intel.html` already gates the lab
  // (parallel to RTX Spark #279 / M5 Max #364). Hold bare Panther Lake
  // baseline / Battlemage single / Warsh / Nudify / ollama / Series B thin /
  // Starlink geopolitics (labNeedleRe hyphen↔space covers "Razor Lake AX").
  'Razor Lake-AX',
]);

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
  // FINDABILITY #288 — CoreWeave ticker alias (labAboutLabel CRWV).
  { re: /\bCoreWeave\b/i, name: /^CoreWeave$/i, alias: 'CRWV' },
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
<!-- Classic instrument panel: ${ctx.url('/classic.html')} -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${body}
</urlset>
`;
}
