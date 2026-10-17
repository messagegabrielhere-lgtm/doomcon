// Google Search Trends watch — daily trending searches, filtered for AI.
//
// Watched, not scored. Google Trends has no official keyless interest-over-time
// API that stays stable; the public Trending Now RSS does answer without a
// key. Wikipedia pageviews (attention pillar) remain the longer-horizon proxy
// for search curiosity. This collector exists so SIREN can see when AI head
// terms spike in Google's daily firehose and act on findability before the
// spike cools — without inventing a Trends score that would rebase the index.
//
// Writes data/search-trends.json and appends one line a day to
// data/search-trends-history.ndjson.

import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { fetchText } from './fetch.mjs';

const OUT = 'data/search-trends.json';
const HIST = 'data/search-trends-history.ndjson';

/** Geos to poll. US is the densest English firehose; GB catches UK wording. */
export const GEOS = Object.freeze([
  { id: 'US', label: 'United States', url: 'https://trends.google.com/trending/rss?geo=US' },
  { id: 'GB', label: 'United Kingdom', url: 'https://trends.google.com/trending/rss?geo=GB' },
]);

/**
 * Frozen head terms we watch for findability. Adding or removing a term does
 * not rebase the SIREN index (this file is unscored), but it does change which
 * spikes the page highlights — keep the list short and honest.
 */
export const HEAD_TERMS = Object.freeze([
  { id: 'ai-prediction-markets', label: 'AI prediction markets', re: /\bai\s+prediction\s+markets?\b/i, path: '/ai-prediction-markets.html' },
  { id: 'ai-doom', label: 'AI doom', re: /\bai\s+doom\b|\bdoom\s*(?:bench|index|score)\b/i, path: '/guide.html' },
  { id: 'ai-doomsday-clock', label: 'AI doomsday clock', re: /\bai\s+doomsday\s+clock\b|\bdoomsday\s+clock\b.*\bai\b|\bai\b.*\bdoomsday\s+clock\b/i, path: '/ai-doomsday-clock.html' },
  { id: 'p-doom', label: 'p(doom)', re: /\bp\(?doom\)?\b|\bprobability of doom\b/i, path: '/p-doom.html' },
  { id: 'best-ai-model', label: 'best AI model', re: /\bbest\s+ai\s+model\b|\bwhich\s+(?:company|lab).{0,20}best\s+ai\b/i, path: '/race.html' },
  { id: 'agi', label: 'AGI', re: /\bagi\b|\bartificial\s+general\s+intelligence\b/i, path: '/si-watch.html' },
  { id: 'polymarket-ai', label: 'Polymarket AI', re: /\bpolymarket\b.*\bai\b|\bai\b.*\bpolymarket\b/i, path: '/race.html' },
  { id: 'chatgpt', label: 'ChatGPT', re: /\bchatgpt\b|\bgpt[\s-]?\d/i, path: '/lab/openai.html' },
  // FINDABILITY #162 — “openai lawsuit” / FTC / state-suit Trends → gated lab
  // (story counts of scored coverage only; not legal advice).
  { id: 'openai-lawsuit', label: 'OpenAI lawsuit / FTC', re: /\bopenai\b.{0,40}\b(?:lawsuit|lawsuits|sued|sues|suing|ftc|probe|probes)\b|\b(?:lawsuit|lawsuits|ftc|probe|probes)\b.{0,40}\bopenai\b|\bstates?\s+sue(?:s|d)?\s+openai\b|\bchatgpt\b.{0,40}\b(?:lawsuit|lawsuits|sued|sues)\b/i, path: '/lab/openai.html' },
  // FINDABILITY #181 — OpenAI / ChatGPT outage / status / degradation Trends → gated lab
  // (story counts only; not a model review or uptime SLA).
  { id: 'openai-outage', label: 'OpenAI outage', re: /\bopenai\b.{0,40}\b(?:outage|status|degradation|downtime|unavailable|limited\s+availability)\b|\b(?:outage|status|degradation|downtime)\b.{0,40}\bopenai\b|\bchatgpt\b.{0,40}\b(?:outage|down|status|degradation|unavailable)\b/i, path: '/lab/openai.html' },
  // FINDABILITY #191 — ChatGPT computer use / Chrome tab-controls Trends → gated lab
  // (story counts only; not a product review or privacy verdict).
  { id: 'openai-chrome', label: 'ChatGPT Chrome / computer use', re: /\bchatgpt\b.{0,48}\b(?:chrome|computer\s+use|tab\s+controls?|browser)\b|\bopenai\b.{0,48}\b(?:chrome|computer\s+use|tab\s+controls?)\b|\b(?:chrome\s+tabs?|computer\s+use|tab\s+controls?)\b.{0,48}\b(?:chatgpt|openai)\b/i, path: '/lab/openai.html' },
  { id: 'claude', label: 'Claude', re: /\bclaude\b|\banthropic\b/i, path: '/lab/anthropic.html' },
  // FINDABILITY #163 — “anthropic ipo” / FTC probe Trends → gated Claude lab
  // (story counts only; not IPO advice or legal advice).
  { id: 'anthropic-ipo', label: 'Anthropic IPO / FTC', re: /\banthropic\b.{0,40}\b(?:ipo|ftc|lawsuit|lawsuits|probe|probes|subpoena)\b|\b(?:ipo|ftc|lawsuit|lawsuits|probe|probes|subpoena)\b.{0,40}\banthropic\b|\bclaude\b.{0,40}\b(?:ipo|ftc|lawsuit|lawsuits)\b/i, path: '/lab/anthropic.html' },
  // FINDABILITY #362 — Anthropic AI safety bill / Capitol Hill pitch Trends →
  // same gated Claude lab (story counts only; not legal advice). Contiguous
  // “AI safety bill” beside Anthropic / Claude; bare “AI safety” alone stays unmatched.
  { id: 'anthropic-ai-safety-bill', label: 'Anthropic AI safety bill', re: /\b(?:anthropic|claude)\b.{0,48}\bai\s+safety\s+bill\b|\bai\s+safety\s+bill\b.{0,48}\b(?:anthropic|claude)\b/i, path: '/lab/anthropic.html' },
  // FINDABILITY #368 — Anthropic Canadian / Nova Scotia data-centre Trends →
  // same gated Claude lab (story counts only; not a construction forecast).
  // EverWind / Point Tupper / Nova Scotia beside Anthropic / Claude; bare
  // “Nova Scotia” geography without the lab stays unmatched.
  { id: 'anthropic-canada-datacenter', label: 'Anthropic Canadian data centres', re: /\b(?:anthropic|claude)\b.{0,64}\b(?:nova\s+scotia|canadian|canada|everwind|point\s+tupper)\b.{0,40}\b(?:data\s*cent(?:er|re)|campus|lease)\b|\b(?:nova\s+scotia|canadian|canada|everwind)\b.{0,64}\b(?:anthropic|claude)\b|\b(?:anthropic|claude)\b.{0,48}\b(?:nova\s+scotia|everwind)\b|\b(?:nova\s+scotia|everwind)\b.{0,48}\b(?:anthropic|claude)\b/i, path: '/lab/anthropic.html' },
  // FINDABILITY #392 — Anthropic / METR evaluator-access Trends → same gated
  // Claude lab (story counts only; not an audit verdict). METR beside
  // Anthropic / Claude / employee-like access / outside-evaluator tape; bare
  // METR without that context stays unmatched.
  { id: 'anthropic-metr', label: 'Anthropic METR', re: /\b(?:anthropic|claude)\b.{0,64}\bmetr\b|\bmetr\b.{0,64}\b(?:anthropic|claude|employee[- ]like|evaluator|outside[- ]evaluator)\b/i, path: '/lab/anthropic.html' },
  // FINDABILITY #397 — Anthropic / Claude ECDSA + NIST curve-seed Trends → same
  // gated Claude lab (story counts only; not a crypto audit). ECDSA / curve
  // seeds / NIST elliptic-curve origins beside Anthropic / Claude; bare ECDSA
  // without that context stays unmatched. Do not match bare NSA geography.
  { id: 'anthropic-ecdsa', label: 'Anthropic ECDSA', re: /\b(?:anthropic|claude)\b.{0,80}\b(?:ecdsa|elliptic[- ]curve|curve[- ]seeds?|nist)\b|\b(?:ecdsa|elliptic[- ]curve|curve[- ]seeds?)\b.{0,80}\b(?:anthropic|claude|nist)\b/i, path: '/lab/anthropic.html' },
  // FINDABILITY #402 — Claude Opus 5.5 / Opus 5.5 product Trends → same gated
  // Claude lab (story counts only; not a model review). Contiguous Opus 5.5
  // beside Claude / Anthropic; bare “opus” without the 5.5 SKU stays unmatched.
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5', re: /\b(?:claude\s+)?opus\s*5\.5\b|\bopus\s*5\.5\b.{0,48}\b(?:claude|anthropic)\b|\b(?:claude|anthropic)\b.{0,48}\bopus\s*5\.5\b/i, path: '/lab/anthropic.html' },
  // FINDABILITY #408 — Blackstone / Anthropic chip-financing Trends → same gated
  // Anthropic lab (story counts only; not deal advice). Blackstone beside
  // Anthropic / Claude / chip / debt / yield / GPU; bare Blackstone real-estate
  // tape without that context stays unmatched.
  { id: 'anthropic-blackstone', label: 'Blackstone / Anthropic', re: /\bblackstone\b.{0,80}\b(?:anthropic|claude|chip|debt|financ|yield|gpu)\b|\b(?:anthropic|claude)\b.{0,80}\bblackstone\b/i, path: '/lab/anthropic.html' },
  // FINDABILITY #412 — Replit / Anthropic / OpenAI model-hosting switch Trends →
  // same gated Anthropic lab (story counts only; not vendor advice). Replit
  // beside Anthropic / Claude / OpenAI / ChatGPT; bare Replit IDE noise without
  // that context stays unmatched. No /lab/replit.html doorway.
  { id: 'anthropic-replit', label: 'Replit / Anthropic', re: /\breplit\b.{0,80}\b(?:anthropic|claude|openai|chatgpt)\b|\b(?:anthropic|claude|openai|chatgpt)\b.{0,80}\breplit\b/i, path: '/lab/anthropic.html' },
  // FINDABILITY #174/#187 — Gemini / Gemma / Argon Trends → gated DeepMind lab
  // (story counts only; not a model review or stock tip). Gemma open-weight and
  // Gemini 4 Argon product tape share the same lab as Gemini headlines.
  { id: 'gemini', label: 'Gemini / Gemma / Argon', re: /\bgemini(?:\s+\d|\s+4)?\b|\bgemma(?:\s+\d)?\b|\bargon\b|\bgoogle\s+deepmind\b/i, path: '/lab/google-deepmind.html' },
  // FINDABILITY #175 — Samsung / HBM / AI memory-chip Trends → gated Samsung lab
  // (story counts only; not a stock tip). Bare “SK Hynix” stays unmatched so we
  // do not route a rival ticker to the Samsung hub.
  { id: 'samsung', label: 'Samsung / AI memory', re: /\bsamsung(?:\s+stock)?\b|\bsamsung\b.{0,40}\b(?:hbm|memory|dram)\b|\b(?:hbm|memory[\s-]?chip)\b.{0,40}\bsamsung\b/i, path: '/lab/samsung.html' },
  // FINDABILITY #195 — Samsung AI glasses / XR wearable Trends → same gated lab
  // (story counts only; not a product review). Titles often omit HBM.
  { id: 'samsung-glasses', label: 'Samsung AI glasses', re: /\bsamsung\b.{0,48}\b(?:ai\s+)?glasses\b|\b(?:ai\s+)?glasses\b.{0,48}\bsamsung\b|\bsamsung\b.{0,40}\b(?:xr|smart[\s-]?glasses|galaxy\s+glasses)\b/i, path: '/lab/samsung.html' },
  // FINDABILITY #137 — "mu" Trends spikes arrive with Micron / AI memory-chip
  // headlines; route to the existing gated /lab/micron.html (not a doorway).
  // FINDABILITY #151 — "dram stock" / "hbm stock" / "memory stock" / "micron
  // stock" co-move on the same AI memory-chip tape; still one gated lab URL.
  { id: 'micron', label: 'Micron / MU', re: /\bmicron(?:\s+stock)?\b|\bmu\s+stock\b|\b(?:dram|hbm|memory)\s+stock\b|\bmemory[\s-]?chip\b.*\b(?:micron|mu)\b/i, path: '/lab/micron.html' },
  // FINDABILITY #152 — "iren stock" Trends spikes arrive with neocloud /
  // CoreWeave / AI-cloud power headlines; route to gated /watts.html (substrate
  // instrument), not a company doorway or stock tip.
  { id: 'iren', label: 'IREN / AI cloud power', re: /\biren(?:\s+stock)?\b|\biris\s+energy\b/i, path: '/watts.html' },
  // FINDABILITY #155/#160/#288 — "coreweave stock" / CRWV / debt / bond Trends →
  // gated lab (story counts only; co-moves with neocloud / AI-cloud debt tape).
  // #288 — bare "crwv" ticker spikes (parallel to NVDA #161) when tape names the
  // ticker without "CoreWeave".
  { id: 'coreweave', label: 'CoreWeave / CRWV', re: /\bcoreweave(?:\s+(?:stock|debt|bond|bonds|borrowing))?\b|\bcrwv(?:\s+stock)?\b/i, path: '/lab/coreweave.html' },
  // FINDABILITY #161 — "nvidia stock" / NVDA / AI funding-cost Trends → gated lab
  // (story counts only; co-moves with CoreWeave / neocloud debt tape).
  { id: 'nvidia', label: 'Nvidia / NVDA', re: /\bnvidia(?:\s+stock)?\b|\bnvda(?:\s+stock)?\b/i, path: '/lab/nvidia.html' },
  // FINDABILITY #164 — “asml” / ASML stock / EUV AI-chip-tool Trends → gated lab
  // (story counts only; not a stock tip).
  { id: 'asml', label: 'ASML', re: /\basml(?:\s+stock)?\b|\beuv\b.{0,40}\basml\b|\basml\b.{0,40}\b(?:euv|chipmaking|chip-making)\b/i, path: '/lab/asml.html' },
  // FINDABILITY #165 — “tsmc” / TSMC stock / AI foundry Trends → gated lab
  // (story counts only; not a stock tip).
  { id: 'tsmc', label: 'TSMC', re: /\btsmc(?:\s+stock)?\b|\btaiwan\s+semiconductor\b/i, path: '/lab/tsmc.html' },
  // FINDABILITY #167 — Amazon Bee / wearable ambient-AI Trends → gated lab
  // (story counts only; not a product review or stock tip).
  { id: 'amazon-bee', label: 'Amazon Bee', re: /\bamazon\b.{0,40}\bbee\b|\bbee\b.{0,40}\b(?:amazon|wearable|frontier|eclipse)\b|\bbee\s+(?:frontier|eclipse|pro)\b/i, path: '/lab/amazon.html' },
  // FINDABILITY #169 — Meta Muse / Muse Spark / Muse Wonder → gated Meta lab
  // (story counts only; not a model review or stock tip).
  { id: 'meta-muse', label: 'Meta Muse', re: /\bmeta\b.{0,40}\bmuse\b|\bmuse\s+(?:spark|wonder)(?:\s+open)?\b/i, path: '/lab/meta.html' },
  // FINDABILITY #193 — Meta + Apple Mac AI / Muse-on-Mac partnership → gated Meta lab
  // (story counts only; not a product review or stock tip). Titles often omit Muse.
  { id: 'meta-apple-mac', label: 'Meta Apple Mac AI', re: /\bmeta\b.{0,64}\bapple\b.{0,64}\b(?:mac|muse|ai|model|open[\s-]?weight)|\bapple\b.{0,64}\bmeta\b.{0,64}\b(?:mac|muse|ai|model|open[\s-]?weight)|\bmuse\b.{0,48}\b(?:mac\s+studio|macs?|apple)\b|\b(?:mac\s+studio|macs?)\b.{0,48}\bmuse\b/i, path: '/lab/meta.html' },
  // FINDABILITY #170 — Apple Intelligence / on-device Apple AI → gated Apple lab
  // (story counts only; not a product review or stock tip).
  { id: 'apple-intelligence', label: 'Apple Intelligence', re: /\bapple\s+intelligence\b|\bapple\b.{0,40}\b(?:on[\s-]?device\s+ai|ai\s+features?)\b/i, path: '/lab/apple.html' },
  // FINDABILITY #171 — Microsoft Copilot / Azure AI → gated Microsoft lab
  // (story counts only; not a product review or stock tip).
  { id: 'microsoft-copilot', label: 'Microsoft Copilot', re: /\b(?:microsoft\s+)?copilot\b|\bmicrosoft\b.{0,40}\b(?:azure\s+ai|365\s+copilot|github\s+copilot)\b|\bgithub\s+copilot\b/i, path: '/lab/microsoft.html' },
  // FINDABILITY #414 — Surface Laptop Ultra / on-device AI laptop Trends → same
  // gated Microsoft lab (story counts only; not a product review). Contiguous
  // Surface Laptop Ultra product tape; bare “Surface” / non-Ultra devices stay
  // unmatched. Keywords already ship (#277); no /lab/surface.html doorway.
  { id: 'microsoft-surface-ultra', label: 'Surface Laptop Ultra', re: /\bsurface\s+laptop\s+ultra\b/i, path: '/lab/microsoft.html' },
  // FINDABILITY #173 — xAI / Grok → gated xAI lab
  // (story counts only; not a model review or stock tip).
  { id: 'xai-grok', label: 'Grok / xAI', re: /\bgrok(?:\s+(?:voice|3|4|4\.7))?\b|\bxai\b|\bx\.ai\b/i, path: '/lab/xai.html' },
  // FINDABILITY #157 — "neocloud" / neoclouds Trends (Gartner survival tape)
  // → gated /tags/neoclouds.html (story counts only, not a vendor ranking).
  { id: 'neocloud', label: 'Neoclouds', re: /\bneoclouds?\b/i, path: '/tags/neoclouds.html' },
  // FINDABILITY #176 — Character.ai / Character AI bankruptcy → gated chatbots tag
  // (story counts only; not a product score or bankruptcy forecast).
  { id: 'character-ai', label: 'Character.ai', re: /\bcharacter\.ai\b|\bcharacter\s+ai\b/i, path: '/tags/chatbots.html' },
  // FINDABILITY #410 — CERT-In / India AI-agent cyber Trends → gated agents tag
  // (story counts only; not a security advisory or incident forecast).
  { id: 'cert-in', label: 'CERT-In', re: /\bcert[- ]?in\b/i, path: '/tags/agents.html' },
  // FINDABILITY #182 — Hugging Face hack / incident / hub Trends → gated tag
  // (story counts only; not a security advisory or incident forecast).
  { id: 'huggingface', label: 'Hugging Face', re: /\bhugging\s*face\b|\bhuggingface\b/i, path: '/tags/huggingface.html' },
  // FINDABILITY #183 — Palantir / AIP / government AI Trends → gated lab
  // (story counts only; not a stock tip, product review, or legal advice).
  { id: 'palantir', label: 'Palantir / AIP', re: /\bpalantir\b/i, path: '/lab/palantir.html' },
  // FINDABILITY #406 — Ondas / Ondas-Palantir defense-AI JV Trends → same gated
  // Palantir lab (story counts only; not deal advice). Contiguous Ondas or
  // Ondas beside Palantir / defense / drone / autonomy; bare AeroVironment
  // without Ondas stays unmatched.
  { id: 'ondas-palantir', label: 'Ondas / Palantir', re: /\bondas(?:[- ]palantir)?\b|\bondas\b.{0,64}\b(?:palantir|defense|drone|autonomy|jv)\b|\bpalantir\b.{0,64}\bondas\b/i, path: '/lab/palantir.html' },
  // FINDABILITY #184 — AMD / MI300 / Instinct / AI GPU Trends → gated lab
  // (story counts only; not a stock tip or chip review).
  { id: 'amd', label: 'AMD / MI300', re: /\bamd(?:\s+stock)?\b|\bmi300(?:x)?\b|\binstinct\b.{0,40}\bamd\b|\bamd\b.{0,40}\b(?:instinct|mi300|gpu)\b/i, path: '/lab/amd.html' },
  // FINDABILITY #185 — Tesla / FSD / Autopilot AI Trends → gated lab
  // (story counts only; not a stock tip, crash verdict, or safety advice).
  // FINDABILITY #208 — also match Roadster / flying-car tape when Tesla Trends
  // spikes on those related queries (still routes to gated Tesla lab).
  { id: 'tesla', label: 'Tesla / FSD', re: /\btesla(?:\s+stock)?\b|\bfsd\b|\bautopilot\b.{0,40}\btesla\b|\btesla\b.{0,40}\b(?:autopilot|fsd|robotaxi|autonomy|roadster)\b|\broadster\b.{0,40}\btesla\b|\btesla\s+roadster\b/i, path: '/lab/tesla.html' },
  // FINDABILITY #378 — Tesla Flying Roadster product tape → same gated Tesla lab
  // (story counts only; not a product review). Contiguous Flying Roadster /
  // flying Roadster; bare Roadster without Tesla stays on #185/#208 matcher.
  { id: 'tesla-flying-roadster', label: 'Tesla Flying Roadster', re: /\bflying\s+roadster\b|\broadster\b.{0,40}\b(?:flies|flying|thruster|spacex)\b|\b(?:flies|flying|thruster)\b.{0,40}\broadster\b/i, path: '/lab/tesla.html' },
  // FINDABILITY #372 — Waymo Canada / Toronto robotaxi Trends → gated Waymo lab
  // (story counts only; not a launch forecast). Canada / Toronto beside Waymo;
  // bare “Waymo” politics tape without the geography stays unmatched.
  { id: 'waymo-canada', label: 'Waymo Canada / Toronto', re: /\bwaymo\b.{0,64}\b(?:canada|canadian|toronto)\b|\b(?:canada|canadian|toronto)\b.{0,64}\bwaymo\b/i, path: '/lab/waymo.html' },
  // FINDABILITY #374 — SoftBank / Allied Universal Trends → gated SoftBank lab
  // (story counts only; not deal advice). Allied alone or SoftBank+Allied /
  // SoftBank+security-services acquisition tape; bare SoftBank Gulf funds stay unmatched.
  { id: 'softbank-allied', label: 'SoftBank / Allied Universal', re: /\ballied\s+universal\b|\bsoftbank\b.{0,64}\b(?:allied|security\s+(?:services|firm)|acquisition)\b|\b(?:allied|security\s+(?:services|firm))\b.{0,64}\bsoftbank\b/i, path: '/lab/softbank.html' },
  // FINDABILITY #376 — SpaceX / Starshield Trends → gated SpaceX lab
  // (story counts only; not policy advice). Starshield or SpaceX+Starshield /
  // SpaceX+Ukraine satellite tape; bare Roadster / spectrum SpaceX stays unmatched.
  { id: 'spacex-starshield', label: 'SpaceX / Starshield', re: /\bstarshield\b|\bspacex\b.{0,64}\b(?:starshield|ukraine).{0,40}\b(?:satellite|access|dod|defense)\b|\b(?:ukraine|dod)\b.{0,48}\bstarshield\b/i, path: '/lab/spacex.html' },
  // FINDABILITY #177 — Qwen / Tongyi / Alibaba open-weight Trends → gated Qwen lab
  // (story counts only; not a model review or stock tip).
  { id: 'qwen', label: 'Qwen', re: /\bqwen(?:\s+\d|\s+n\d)?\b|\btongyi\b|\balibaba\b.{0,40}\b(?:qwen|open[\s-]?weight)\b/i, path: '/lab/qwen.html' },
  // FINDABILITY #178 — Oracle / AI datacenter Trends → gated datacenters tag
  // (story counts only; not a stock tip or credit forecast).
  { id: 'oracle-datacenters', label: 'Oracle', re: /\boracle\b/i, path: '/tags/datacenters.html' },
  // FINDABILITY #179 — DeepSeek outage / Chinese open-model Trends → gated lab
  // (story counts only; not a model review or uptime SLA).
  { id: 'deepseek', label: 'DeepSeek', re: /\bdeepseek(?:[- ]?r)?\b/i, path: '/lab/deepseek.html' },
  // FINDABILITY #418 — DeepSeek V4.1 Flash product-class Trends → same gated lab
  // (story counts only; not a model review). Contiguous Flash / v4.1-Flash tape;
  // bare DeepSeek without Flash stays on the parent #179 term. Keywords already
  // ship (#228); no /lab/deepseek-flash.html doorway.
  { id: 'deepseek-v41-flash', label: 'DeepSeek V4.1 Flash', re: /\bdeepseek[- ]?v?4\.1[- ]?flash\b|\bdeepseek\b.{0,80}\bv4\.1[- ]?flash\b|\bv4\.1[- ]?flash\b.{0,80}\bdeepseek\b/i, path: '/lab/deepseek.html' },
  // FINDABILITY #180 — Mistral / Timestral / CERN Flare Trends → gated lab
  // (story counts only; not a model review or stock tip).
  { id: 'mistral', label: 'Mistral', re: /\bmistral\b|\btimestral\b|\bflare\b.{0,40}\b(?:cern|mistral|physics)\b|\bcern\b.{0,40}\b(?:flare|mistral)\b/i, path: '/lab/mistral.html' },
  { id: 'siren', label: 'SIREN / siren.watch', re: /\bsiren\.watch\b|\bsiren\s+(?:index|watch|ai)\b|\bdoomcon\b/i, path: '/' },
]);

/** Broad AI filter for the daily firehose (title + news headlines). */
export const AI_QUERY_RE = /\b(?:ai|a\.i\.|artificial\s+intelligence|chatgpt|gpt[\s-]?\d|openai|anthropic|claude|gemini|deepmind|deepseek|llm|large\s+language\s+model|machine\s+learning|generative\s+ai|agi|superintelligence|neural\s+net|midjourney|stable\s+diffusion|copilot|cursor\s+ai|xai|grok)\b/i;

const ENTITIES = Object.freeze({
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
});

export function decodeXml(s) {
  return String(s || '').replace(/&(#\d+|#x[\da-f]+|\w+);/gi, (m, name) => {
    if (Object.hasOwn(ENTITIES, name.toLowerCase())) return ENTITIES[name.toLowerCase()];
    if (name.startsWith('#x') || name.startsWith('#X')) {
      const n = parseInt(name.slice(2), 16);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    if (name.startsWith('#')) {
      const n = parseInt(name.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return m;
  });
}

/** Parse `20000+` / `500+` into a sortable number; null when absent. */
export function parseTraffic(raw) {
  const m = /^([\d,]+)\+?$/.exec(String(raw || '').trim());
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

/**
 * Minimal RSS item parser for Google's trending feed. Avoids pulling an XML
 * library (Node built-ins only). Returns [] on empty / unparseable input.
 */
export function parseTrendsRss(xml) {
  const body = String(xml || '');
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(body))) {
    const block = m[1];
    const title = decodeXml((/<title>([^<]*)<\/title>/i.exec(block) || [])[1] || '').trim();
    if (!title || title === 'Daily Search Trends') continue;
    const trafficRaw = ((/<ht:approx_traffic>([^<]*)<\/ht:approx_traffic>/i.exec(block) || [])[1] || '').trim();
    const pub = ((/<pubDate>([^<]*)<\/pubDate>/i.exec(block) || [])[1] || '').trim();
    const news = [];
    const newsRe = /<ht:news_item>([\s\S]*?)<\/ht:news_item>/gi;
    let nm;
    while ((nm = newsRe.exec(block))) {
      const nb = nm[1];
      const nt = decodeXml((/<ht:news_item_title>([^<]*)<\/ht:news_item_title>/i.exec(nb) || [])[1] || '').trim();
      const nu = decodeXml((/<ht:news_item_url>([^<]*)<\/ht:news_item_url>/i.exec(nb) || [])[1] || '').trim();
      const ns = decodeXml((/<ht:news_item_source>([^<]*)<\/ht:news_item_source>/i.exec(nb) || [])[1] || '').trim();
      if (nt || nu) news.push({ title: nt || null, url: nu || null, source: ns || null });
    }
    const hay = [title, ...news.map((n) => n.title)].filter(Boolean).join(' · ');
    items.push({
      title,
      traffic_raw: trafficRaw || null,
      traffic: parseTraffic(trafficRaw),
      published_at: pub ? new Date(pub).toISOString() : null,
      ai_related: AI_QUERY_RE.test(hay),
      news: news.slice(0, 3),
    });
  }
  return items;
}

/** Which HEAD_TERMS match this trend title (and its news headlines). */
export function matchHeadTerms(item) {
  const hay = [item.title, ...(item.news || []).map((n) => n.title)].filter(Boolean).join(' · ');
  return HEAD_TERMS.filter((t) => t.re.test(hay)).map((t) => t.id);
}

export function summariseGeo(geoId, items) {
  const ai = items.filter((it) => it.ai_related);
  const hits = {};
  for (const it of items) {
    for (const id of matchHeadTerms(it)) {
      hits[id] = hits[id] || [];
      hits[id].push(it.title);
    }
  }
  return {
    geo: geoId,
    total: items.length,
    ai_related: ai.length,
    items: items.map((it) => ({
      ...it,
      head_terms: matchHeadTerms(it),
    })),
    head_term_hits: Object.fromEntries(
      HEAD_TERMS.map((t) => [t.id, hits[t.id] ? { hit: true, titles: hits[t.id] } : { hit: false, titles: [] }]),
    ),
  };
}

async function fetchGeo(geo, fetchTextFn) {
  try {
    const xml = await fetchTextFn(geo.url);
    const items = parseTrendsRss(xml);
    if (items.length === 0) {
      return { ok: false, geo: geo.id, label: geo.label, error: 'empty or unparseable RSS', ...summariseGeo(geo.id, []) };
    }
    return { ok: true, geo: geo.id, label: geo.label, error: null, ...summariseGeo(geo.id, items) };
  } catch (e) {
    return {
      ok: false,
      geo: geo.id,
      label: geo.label,
      error: e && e.message ? e.message : String(e),
      ...summariseGeo(geo.id, []),
    };
  }
}

function dayKey(iso) {
  return String(iso || '').slice(0, 10);
}

function appendHistory(snapshot) {
  const day = dayKey(snapshot.generated_at);
  const line = JSON.stringify({
    generated_at: snapshot.generated_at,
    ai_related: snapshot.ai_related_total,
    head_hits: snapshot.head_terms.filter((t) => t.trending).map((t) => t.id),
    geos_ok: snapshot.geos.filter((g) => g.ok).map((g) => g.geo),
  });
  if (existsSync(HIST)) {
    const lines = readFileSync(HIST, 'utf8').trim().split('\n').filter(Boolean);
    if (lines.length) {
      try {
        const last = JSON.parse(lines[lines.length - 1]);
        if (dayKey(last.generated_at) === day) {
          // Replace today's line so hourly runs do not balloon the file.
          lines[lines.length - 1] = line;
          writeFileSync(HIST, `${lines.join('\n')}\n`);
          return;
        }
      } catch { /* fall through and append */ }
    }
  }
  appendFileSync(HIST, `${line}\n`);
}

export async function collect({ fetchTextFn = fetchText } = {}) {
  const geos = [];
  for (const g of GEOS) {
    geos.push(await fetchGeo(g, fetchTextFn));
  }

  const mergedAi = [];
  const seen = new Set();
  for (const g of geos) {
    for (const it of g.items || []) {
      if (!it.ai_related) continue;
      const key = it.title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      mergedAi.push({ ...it, geo: g.geo });
    }
  }
  mergedAi.sort((a, b) => (b.traffic || 0) - (a.traffic || 0));

  const head_terms = HEAD_TERMS.map((t) => {
    const titles = [];
    for (const g of geos) {
      const hit = g.head_term_hits && g.head_term_hits[t.id];
      if (hit && hit.hit) titles.push(...hit.titles.map((title) => ({ geo: g.geo, title })));
    }
    return {
      id: t.id,
      label: t.label,
      path: t.path,
      trending: titles.length > 0,
      titles,
    };
  });

  const anyOk = geos.some((g) => g.ok);
  return {
    schema: 1,
    generated_at: new Date().toISOString(),
    ok: anyOk,
    source: 'Google Trends Trending Now RSS',
    source_url: 'https://trends.google.com/trending/rss',
    note: 'Watched, not scored. Daily trending searches only — not interest-over-time. Wikipedia pageviews remain the attention-pillar proxy for longer search curiosity.',
    geos,
    ai_related_total: mergedAi.length,
    ai_trends: mergedAi.slice(0, 40),
    head_terms,
  };
}

async function main() {
  const snap = await collect();
  writeFileSync(OUT, `${JSON.stringify(snap, null, 2)}\n`);
  try { appendHistory(snap); } catch (e) { console.log(`search-trends history append failed: ${e.message}`); }
  const aiN = snap.ai_related_total;
  const hits = snap.head_terms.filter((t) => t.trending).map((t) => t.id);
  console.log(`search-trends: ${snap.geos.filter((g) => g.ok).length}/${snap.geos.length} geos ok · ${aiN} AI-related · head hits [${hits.join(', ') || 'none'}]`);
}

if (process.argv[1] && process.argv[1].endsWith('search-trends.mjs')) {
  main().catch((e) => { console.log(`search-trends failed: ${e.message}`); process.exitCode = 1; });
}
