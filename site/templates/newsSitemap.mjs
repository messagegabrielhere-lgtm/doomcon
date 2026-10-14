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
    const re = new RegExp(`(?:^|[^A-Za-z0-9])${lab.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[^A-Za-z0-9]|$)`, 'i');
    if (re.test(hay)) named.push(lab);
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

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${body}
</urlset>
`;
}
