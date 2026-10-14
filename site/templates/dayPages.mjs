// /day/YYYY-MM-DD.html — one page per UTC day with a reading on file.
//
// COMPETITIVE-SEO.md §1.3: Skynet ships dated news hubs. Ours pair the closing
// SIREN reading for that UTC day with the scored stories published that day.
// Gate: at least one history row (or the live state for "today"). Thin empty
// calendar days stay off the sitemap.

import { esc, num, utc } from './_html.mjs';
import { page } from './layout.mjs';
import { breadcrumbs, speakable } from './_seo.mjs';
import { slugFor } from './itemPage.mjs';
import * as brand from '../brand.mjs';

/** How many recent UTC days to emit, newest first. */
export const DAY_WINDOW = 30;

/** Minimum scored stories before a news-only day (no reading) is indexable. */
export const DAY_NEWS_MIN = 3;

function dayKey(iso) {
  const s = String(iso || '');
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
}

function historyRows(ctx) {
  return Array.isArray(ctx.history) ? ctx.history : [];
}

function newsItems(ctx) {
  return (ctx.news && Array.isArray(ctx.news.items)) ? ctx.news.items : [];
}

function clip(text, max) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const at = cut.lastIndexOf(' ');
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,.;:–—-]+$/, '')}…`;
}

/** Closing reading for a UTC day: last history row that day, else live state when day is today. */
export function closingReading(ctx, day) {
  const rows = historyRows(ctx).filter((r) => dayKey(r.t) === day);
  if (rows.length) {
    const last = rows[rows.length - 1];
    return {
      t: last.t,
      score: last.score,
      level: last.level,
      level_name: last.level_name || (brand.LEVELS.find((l) => l.level === last.level) || {}).name || '',
      degraded: !!last.degraded,
      count: rows.length,
    };
  }
  const st = ctx.state;
  if (st && dayKey(st.generated_at) === day && Number.isFinite(st.score)) {
    return {
      t: st.generated_at,
      score: st.score,
      level: st.level,
      level_name: st.level_name || '',
      degraded: !!st.degraded,
      count: 1,
    };
  }
  return null;
}

export function storiesForDay(ctx, day) {
  return newsItems(ctx)
    .filter((it) => dayKey(it.published_at || (it.meta && it.meta.first_seen_at)) === day)
    .slice()
    .sort((a, b) => String(b.published_at || '').localeCompare(String(a.published_at || '')));
}

export function dayPath(day) {
  return `/day/${day}.html`;
}

export function dayIndexable(ctx, day) {
  const reading = closingReading(ctx, day);
  if (reading && Number.isFinite(reading.score) && Number.isFinite(reading.level)) return true;
  return storiesForDay(ctx, day).length >= DAY_NEWS_MIN;
}

/** Newest-first list of UTC day keys inside the window that clear the gate. */
export function indexableDays(ctx, { now = Date.now(), window = DAY_WINDOW } = {}) {
  const keys = new Set();
  for (const r of historyRows(ctx)) {
    const d = dayKey(r.t);
    if (d) keys.add(d);
  }
  const stDay = dayKey(ctx.state && ctx.state.generated_at);
  if (stDay) keys.add(stDay);
  for (const it of newsItems(ctx)) {
    const d = dayKey(it.published_at || (it.meta && it.meta.first_seen_at));
    if (d) keys.add(d);
  }
  const cutoff = new Date(now);
  cutoff.setUTCHours(0, 0, 0, 0);
  cutoff.setUTCDate(cutoff.getUTCDate() - (window - 1));
  const cut = cutoff.toISOString().slice(0, 10);
  return [...keys]
    .filter((d) => d >= cut && dayIndexable(ctx, d))
    .sort((a, b) => b.localeCompare(a));
}

function levelName(reading) {
  if (reading.level_name) return reading.level_name;
  const hit = brand.LEVELS.find((l) => l.level === reading.level);
  return hit ? hit.name : '';
}

export function renderDay(ctx, day) {
  const reading = closingReading(ctx, day);
  const stories = storiesForDay(ctx, day);
  const path = dayPath(day);
  const name = reading ? levelName(reading) : '';
  const scoreTxt = reading && Number.isFinite(reading.score) ? num(reading.score, 1) : null;
  const title = reading
    ? `AI activity on ${day} · ${brand.NAME} ${reading.level} ${name} · ${scoreTxt}`
    : `AI headlines on ${day} · ${brand.NAME}`;
  const description = reading
    ? `On ${day} UTC, ${brand.NAME} closed at level ${reading.level} (${name}), ${scoreTxt} of 100, across ${reading.count} hourly reading${reading.count === 1 ? '' : 's'}. ${stories.length} scored ${stories.length === 1 ? 'story' : 'stories'} that day. Tempo, not a probability.`
    : `Scored AI headlines ${brand.NAME} recorded on ${day} UTC. ${stories.length} stories. Tempo, not a probability.`;

  const readingBlock = reading
    ? `<section class="day__read" aria-labelledby="day-read-h">
  <h2 id="day-read-h">Closing reading</h2>
  <p class="day__lede" id="day-lede">${esc(brand.NAME)} <b>${esc(reading.level)}</b> · ${esc(name)}, composite <b>${esc(scoreTxt)}</b> of 100 at ${esc(utc(reading.t))}${reading.degraded ? ' · degraded' : ''}. ${esc(reading.count)} hourly reading${reading.count === 1 ? '' : 's'} that UTC day.</p>
  <p class="day__note">${esc(brand.DISCLAIMER_SHORT || brand.DISCLAIMER)} <a href="${esc(ctx.href('/'))}">Live dial</a> · <a href="${esc(ctx.href('/alerts.html'))}">Get alerts when the level moves</a> · <a href="${esc(ctx.href('/changelog.html'))}">Hour-by-hour changelog</a>.</p>
</section>`
    : `<section class="day__read" aria-labelledby="day-read-h">
  <h2 id="day-read-h">No closing reading on file</h2>
  <p class="day__lede" id="day-lede">This day is in the archive for its scored headlines. The live dial is on the <a href="${esc(ctx.href('/'))}">homepage</a>.</p>
</section>`;

  const list = stories.length
    ? `<ul class="day__list">${stories.slice(0, 40).map((it) => {
      const href = ctx.href(`/item/${slugFor(it)}.html`);
      const when = String(it.published_at || '').slice(11, 16);
      const sc = Number.isFinite(it.score) ? num(it.score, 1) : '—';
      return `<li><a href="${esc(href)}"><b>${esc(clip(it.title, 140))}</b></a>
        <span class="day__meta">${esc(when)}Z · ${esc(String(it.source || '').toUpperCase())} · score ${esc(sc)}${it.pillar ? ` · ${esc(it.pillar)}` : ''}</span>
        ${it.summary ? `<p>${esc(clip(it.summary, 220))}</p>` : ''}</li>`;
    }).join('')}</ul>`
    : '<p class="day__empty">No scored stories stamped to this UTC day in the current newsroom window.</p>';

  const days = indexableDays(ctx);
  const i = days.indexOf(day);
  const prev = i >= 0 && i < days.length - 1 ? days[i + 1] : null;
  const next = i > 0 ? days[i - 1] : null;
  const nav = `<nav class="day__nav" aria-label="Adjacent days">
  ${prev ? `<a href="${esc(ctx.href(dayPath(prev)))}">← ${esc(prev)}</a>` : '<span></span>'}
  <a href="${esc(ctx.href('/day/'))}">All days</a>
  ${next ? `<a href="${esc(ctx.href(dayPath(next)))}">${esc(next)} →</a>` : '<span></span>'}
</nav>`;

  const main = `<article class="day">
<p class="eyebrow">Day archive · UTC</p>
<h1>AI activity on ${esc(day)}</h1>
${readingBlock}
<section class="day__news" aria-labelledby="day-news-h">
  <h2 id="day-news-h">Scored stories that day${stories.length ? ` · ${stories.length}` : ''}</h2>
  ${list}
</section>
${nav}
</article>
<style>
.day{max-width:78ch}
.day__lede{font:400 var(--t-base)/1.55 var(--sans);color:var(--ink-dim);max-width:68ch}
.day__lede b{color:var(--ink);font-variant-numeric:tabular-nums}
.day__note{font:400 var(--t-sm)/1.5 var(--sans);color:var(--ink-faint)}
.day__list{list-style:none;padding:0;margin:16px 0 0;display:grid;gap:14px}
.day__list li{padding:0 0 12px;border-bottom:1px solid var(--rule)}
.day__list a{color:var(--ink);text-decoration:none;font:600 var(--t-base)/1.35 var(--sans)}
.day__list a:hover{text-decoration:underline}
.day__meta{display:block;margin-top:4px;font:500 var(--t-xs)/1.3 var(--mono);color:var(--ink-faint);letter-spacing:.02em}
.day__list p{margin:6px 0 0;font:400 var(--t-sm)/1.5 var(--sans);color:var(--ink-dim)}
.day__empty{color:var(--ink-faint)}
.day__nav{display:flex;justify-content:space-between;gap:12px;margin:28px 0 8px;font:600 var(--t-sm)/1.3 var(--sans)}
.day__nav a{color:var(--ink)}
</style>`;

  const jsonld = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      url: ctx.url(path),
      description,
      datePublished: `${day}T00:00:00Z`,
      dateModified: (reading && reading.t) || (ctx.state && ctx.state.generated_at) || `${day}T00:00:00Z`,
      isPartOf: { '@type': 'WebSite', name: brand.PUBLICATION, url: ctx.url('/') },
      speakable: speakable(['#day-lede', 'h1']),
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: stories.length,
        itemListElement: stories.slice(0, 20).map((it, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          url: ctx.url(`/item/${slugFor(it)}.html`),
          name: clip(it.title, 120),
        })),
      },
    },
    breadcrumbs(ctx, [
      { name: 'Day archive', path: '/day/' },
      { name: day, path },
    ]),
  ];

  return page({
    ctx,
    path,
    title,
    description,
    jsonld,
    main,
  });
}

export function renderIndex(ctx) {
  const days = indexableDays(ctx);
  const path = '/day/';
  const title = `Day archive · AI activity by date · ${brand.NAME}`;
  const description = `UTC day pages for ${brand.NAME}: closing level and score, plus the scored stories published that day. A dated archive you can bookmark.`;
  const rows = days.map((d) => {
    const r = closingReading(ctx, d);
    const nStories = storiesForDay(ctx, d).length;
    const score = r && Number.isFinite(r.score) ? num(r.score, 1) : '—';
    const lv = r ? `${brand.NAME} ${r.level} ${levelName(r)}` : 'no reading';
    return `<li><a href="${esc(ctx.href(dayPath(d)))}"><b>${esc(d)}</b></a>
      <span>${esc(lv)} · ${esc(score)} of 100 · ${nStories} stor${nStories === 1 ? 'y' : 'ies'}</span></li>`;
  }).join('\n');

  const main = `<article class="day">
<p class="eyebrow">Day archive · UTC</p>
<h1>AI activity by day</h1>
<p class="day__lede">Each page is one UTC day: the closing ${esc(brand.NAME)} reading and the scored headlines stamped to that day. Use it as a bookmarkable archive, or pipe <a href="${esc(ctx.href('/feed-level.xml'))}">level-change RSS</a> when you only want the rare moves.</p>
<ul class="day__list">${rows || '<li>No days clear the archive gate yet.</li>'}</ul>
<p class="day__note"><a href="${esc(ctx.href('/alerts.html'))}">Get alerts</a> · <a href="${esc(ctx.href('/changelog.html'))}">Changelog</a> · <a href="${esc(ctx.href('/history.html'))}">Full history</a></p>
</article>
<style>
.day{max-width:78ch}
.day__lede{font:400 var(--t-base)/1.55 var(--sans);color:var(--ink-dim);max-width:68ch}
.day__list{list-style:none;padding:0;margin:18px 0;display:grid;gap:10px}
.day__list li{display:flex;flex-wrap:wrap;gap:8px 16px;padding:8px 0;border-bottom:1px solid var(--rule);align-items:baseline}
.day__list a{color:var(--ink);text-decoration:none;font:700 var(--t-base)/1.3 var(--mono)}
.day__list a:hover{text-decoration:underline}
.day__list span{font:400 var(--t-sm)/1.4 var(--sans);color:var(--ink-dim)}
.day__note{font:400 var(--t-sm)/1.5 var(--sans);color:var(--ink-faint)}
</style>`;

  return page({
    ctx,
    path,
    title,
    description,
    noindex: days.length === 0,
    jsonld: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      url: ctx.url(path),
      description,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: days.length,
        itemListElement: days.map((d, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: ctx.url(dayPath(d)),
          name: d,
        })),
      },
    }, breadcrumbs(ctx, [{ name: 'Day archive', path }])],
    main,
  });
}

export function sitemapEntries(ctx) {
  const days = indexableDays(ctx);
  if (!days.length) return [];
  const last = (ctx.state && ctx.state.generated_at) || (ctx.news && ctx.news.generated_at);
  return [
    { loc: '/day/', changefreq: 'daily', priority: '0.6', lastmod: last },
    ...days.map((d) => {
      const reading = closingReading(ctx, d);
      return {
        loc: dayPath(d),
        changefreq: 'daily',
        priority: '0.55',
        lastmod: (reading && reading.t) || last,
      };
    }),
  ];
}
