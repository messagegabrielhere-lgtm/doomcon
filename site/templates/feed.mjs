// RSS 2.0 of index moves. Only substantive moves: a feed that fires every hour
// with "score moved 0.1" trains every subscriber to mute it.

import { esc, num, signed, utc, rfc822 } from './_html.mjs';
import * as brand from '../brand.mjs';

export function render(ctx, { levelOnly = false } = {}) {
  const self = levelOnly ? '/feed-level.xml' : '/feed.xml';
  const items = ctx.moves.filter((m) => (levelOnly ? m.level_changed : m.indexable)).slice(0, 50).map((m) => {
    const title = m.level_changed
      ? `${brand.NAME} ${m.previous_level} → ${brand.NAME} ${m.level}: ${m.level_name}`
      : `${brand.NAME} ${m.level} · ${num(m.score, 1)} (${signed(m.delta, 1)})`;
    const link = ctx.url(`/moves/${m.id}.html`);
    return `  <item>
    <title>${esc(title)}</title>
    <link>${esc(link)}</link>
    <guid isPermaLink="true">${esc(link)}</guid>
    <pubDate>${esc(rfc822(m.generated_at))}</pubDate>
    <description>${esc(`Score ${num(m.previous_score, 1)} to ${num(m.score, 1)} (${signed(m.delta, 1)}) at ${utc(m.generated_at)}. ${brand.DISCLAIMER}`)}</description>
  </item>`;
  }).join('\n');

  // Tip comments for feed readers / crawlers that open RSS before robots/llms
  // (FINDABILITY #87). Comments are ignored by RSS parsers.
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- ${brand.NAME}: AI activity index moves (not doom probability). Prefer ${ctx.url('/llms.txt')} for agents. -->
<!-- Free tools: ${ctx.url('/free-tools.html')} · Verify a reading: ${ctx.url('/verify.html')} -->
<!-- News sitemap: ${ctx.url('/news-sitemap.xml')} · Search Trends: ${ctx.url('/search-trends.html')} · Now: ${ctx.url('/api/now.txt')} -->
<!-- Classic instrument panel: ${ctx.url('/classic.html')} -->
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${esc(brand.NAME)} — ${levelOnly ? 'level changes only' : 'index moves'}</title>
  <link>${esc(ctx.url('/'))}</link>
  <atom:link href="${esc(ctx.url(self))}" rel="self" type="application/rss+xml"/>
  <description>${esc(brand.DESCRIPTION)}</description>
  <language>en</language>
  <lastBuildDate>${esc(rfc822(ctx.state.generated_at))}</lastBuildDate>
  <ttl>60</ttl>
${items}
</channel>
</rss>
`;
}

/**
 * The daily brief as RSS: one entry per COMPLETED UTC day (today is still
 * filling, so it is left out), linking that day's news page. It is what makes
 * a daily email possible with no account anywhere: paste it into Blogtrottr,
 * or into a newsletter tool's RSS-to-email mode. Each entry carries the
 * closing reading of that day and its five highest-scoring stories, all copied
 * from data the site already publishes.
 */
export function renderDaily(ctx, { days = [], itemsForDay = () => [], dayPath = (d) => `/news/${d}.html` } = {}) {
  const today = String(ctx.state && ctx.state.generated_at || '').slice(0, 10);
  const hist = Array.isArray(ctx.history) ? ctx.history : [];
  const closing = (day) => {
    let last = null;
    for (const h of hist) if (h && String(h.t).slice(0, 10) === day && Number.isFinite(h.score)) last = h;
    return last;
  };
  const items = days.filter((d) => d && d.day < today).slice(0, 30).map(({ day }) => {
    const link = ctx.url(dayPath(day));
    const top = itemsForDay(ctx, day).slice().sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 5);
    const c = closing(day);
    const reading = c ? `Closing reading: ${brand.NAME} ${c.level}, ${num(c.score, 1)} of 100 at ${utc(c.t)}.` : 'No closing reading on file for this day.';
    const list = top.map((it) => `<li>${esc(it.title)}${Number.isFinite(it.score) ? ` (${num(it.score, 1)})` : ''}</li>`).join('');
    const html = `<p>${esc(reading)}</p>${list ? `<p>Highest-scoring stories:</p><ol>${list}</ol>` : ''}<p>${esc(brand.DISCLAIMER)}</p>`;
    return `  <item>
    <title>${esc(`${brand.NAME} daily brief · ${day}`)}</title>
    <link>${esc(link)}</link>
    <guid isPermaLink="true">${esc(link)}</guid>
    <pubDate>${esc(rfc822(`${day}T23:59:59Z`))}</pubDate>
    <description>${esc(html)}</description>
  </item>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${esc(brand.NAME)} — daily brief</title>
  <link>${esc(ctx.url('/'))}</link>
  <atom:link href="${esc(ctx.url('/feed-daily.xml'))}" rel="self" type="application/rss+xml"/>
  <description>${esc(`One entry per UTC day: the closing ${brand.NAME} reading and the day's highest-scoring AI stories. ${brand.DISCLAIMER}`)}</description>
  <language>en</language>
  <lastBuildDate>${esc(rfc822(ctx.state.generated_at))}</lastBuildDate>
  <ttl>60</ttl>
${items}
</channel>
</rss>
`;
}
