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
 *  100 while pizzint's news-sitemap is contested again (COMPETITIVE-SEO.md). */
export const NEWS_SITEMAP_CAP = 150;

function itemStamp(item) {
  return item.published_at || (item.meta && item.meta.first_seen_at) || null;
}

function keywordsFor(item) {
  const bits = [];
  if (item.pillar) bits.push(item.pillar);
  if (item.kind) bits.push(String(item.kind));
  if (item.source) bits.push(String(item.source).slice(0, 40));
  // Prefer the published entity list already on the NewsItem (falsifiable).
  for (const name of (Array.isArray(item.entities) ? item.entities : [])) {
    if (typeof name === 'string' && name.trim()) bits.push(name.trim());
  }
  // Topic needles from the published tag vocabulary (search-shaped; no new URLs).
  for (const topic of TOPIC_DEFS) {
    if (itemMatchesTag(item, topic)) bits.push(topic.name);
  }
  // Keep this list short and high-signal — keywords are capped at 12 and should
  // match names the newsroom actually prints (Google News contest vs pizzint).
  const labs = [
    'OpenAI', 'Anthropic', 'Google', 'DeepMind', 'Meta', 'xAI', 'Mistral', 'NVIDIA',
    'DeepSeek', 'Huawei', 'Sony', 'Supermicro', 'IREN', 'OpenRouter', 'Reflection AI',
    'Muse Wonder', 'Artificial Analysis', 'Decart', 'Sakana AI', 'Isomorphic Labs',
    'Winverse AI', 'Cisco',
  ];
  const hay = `${item.title || ''} ${item.summary || ''}`;
  for (const lab of labs) {
    const re = new RegExp(`(?:^|[^A-Za-z0-9])${lab.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[^A-Za-z0-9]|$)`, 'i');
    if (re.test(hay)) bits.push(lab);
  }
  bits.push('AI', 'artificial intelligence', brand.NAME);
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
