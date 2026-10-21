// /news/YYYY-MM-DD.html — one hub per UTC day with enough scored stories.
//
// COMPETITIVE-SEO.md §1.3: Skynet Countdown ships ~507 `/news/YYYY-MM-DD`
// day hubs as a freshness signal. Our `/item/` pages and news-sitemap already
// carry dates; these hubs add an indexable day landing with ItemList schema
// and internal links into the long tail. A day under DAY_INDEX_MIN stays on
// /news.html only (soft-404 gate).

import { esc, utc, utcDay } from './_html.mjs';
import { page } from './layout.mjs';
import { breadcrumbs, speakable } from './_seo.mjs';
import { slugFor, storyItemListEntity } from './itemPage.mjs';
import * as brand from '../brand.mjs';

/** Minimum scored stories before a day hub is written and sitemapped. */
export const DAY_INDEX_MIN = 5;

/** Stories printed on the day page. The rest stay reachable via /news.html. */
export const DAY_LIST_CAP = 60;

const STYLE = `<style>
.nd{max-width:78ch}
.nd__k{font:600 var(--t-xs)/1.3 var(--mono);color:var(--ink-faint);letter-spacing:.04em;text-transform:uppercase}
.nd__lede{font:400 var(--t-base)/1.55 var(--sans);color:var(--ink-dim);max-width:68ch}
.nd__stat{display:flex;flex-wrap:wrap;gap:14px 22px;margin:18px 0;padding:14px 0;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)}
.nd__stat b{font:700 var(--t-xl)/1 var(--mono);color:var(--ink)}
.nd__stat span{display:block;font:500 var(--t-xs)/1.3 var(--mono);color:var(--ink-faint);margin-top:4px}
.nd__list{list-style:none;padding:0;margin:16px 0 0;display:grid;gap:10px}
.nd__list li{display:grid;grid-template-columns:1fr auto;gap:4px 12px;padding:10px 0;border-bottom:1px solid var(--rule)}
.nd__list a{grid-column:1;color:var(--ink);font:600 var(--t-base)/1.35 var(--sans);text-decoration:none}
.nd__list a:hover{text-decoration:underline}
.nd__meta{grid-column:1;font:400 var(--t-xs)/1.3 var(--mono);color:var(--ink-faint)}
.nd__sc{grid-column:2;grid-row:1/span 2;align-self:center;font:700 var(--t-lg)/1 var(--mono)}
.nd__nav{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 0}
.nd__nav a{font:600 var(--t-sm)/1.3 var(--sans);padding:6px 10px;border:1px solid var(--rule);border-radius:6px;color:var(--ink);text-decoration:none}
.nd__nav a:hover{background:var(--bg-sunken)}
</style>`;

function clip(text, max) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const at = cut.lastIndexOf(' ');
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,.;:–—-]+$/, '')}…`;
}

function newsItems(ctx) {
  return (ctx.news && Array.isArray(ctx.news.items)) ? ctx.news.items : [];
}

export function dayPath(day) {
  return `/news/${day}.html`;
}

export function isDayKey(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function itemsForDay(ctx, day) {
  if (!isDayKey(day)) return [];
  return newsItems(ctx)
    .filter((it) => it && it.published_at && utcDay(it.published_at) === day)
    .slice()
    .sort((a, b) => String(b.published_at || '').localeCompare(String(a.published_at || '')));
}

/**
 * Closing SIREN reading for a UTC day: the last scored history row stamped to
 * that day, else the live state when it was generated that day. Null when no
 * reading is on file — the hub then prints stories only, never an imputed level.
 */
export function closingReading(ctx, day) {
  if (!isDayKey(day)) return null;
  const rows = (Array.isArray(ctx.history) ? ctx.history : [])
    .filter((r) => r && r.backfilled !== true && typeof r.t === 'string' && r.t.slice(0, 10) === day
      && Number.isFinite(r.score) && Number.isFinite(r.level));
  let r = null;
  if (rows.length) {
    const last = rows[rows.length - 1];
    r = { t: last.t, score: last.score, level: last.level, degraded: !!last.degraded, count: rows.length };
  } else {
    const st = ctx.state;
    if (st && typeof st.generated_at === 'string' && st.generated_at.slice(0, 10) === day
      && Number.isFinite(st.score) && Number.isFinite(st.level)) {
      r = { t: st.generated_at, score: st.score, level: st.level, degraded: !!st.degraded, count: 1 };
    }
  }
  if (!r) return null;
  const hit = brand.LEVELS.find((l) => l.level === r.level);
  return { ...r, level_name: (hit && hit.name) || '' };
}

/** Older scored stories published on this UTC day, kept in the durable item archive. */
export function archiveItemsForDay(ctx, day) {
  if (!isDayKey(day)) return [];
  const archived = Array.isArray(ctx.itemArchive) ? ctx.itemArchive : [];
  return archived
    .filter((it) => it && it.published_at && utcDay(it.published_at) === day)
    .slice()
    .sort((a, b) => String(b.published_at || '').localeCompare(String(a.published_at || '')));
}

export function indexableDays(ctx) {
  const counts = new Map();
  const bump = (it) => {
    if (!it || !it.published_at) return;
    let day;
    try { day = utcDay(it.published_at); } catch { return; }
    counts.set(day, (counts.get(day) || 0) + 1);
  };
  for (const it of newsItems(ctx)) bump(it);
  // Archive rows can keep a day hub alive after the live window rolls.
  for (const it of (Array.isArray(ctx.itemArchive) ? ctx.itemArchive : [])) bump(it);
  return [...counts.entries()]
    .filter(([, n]) => n >= DAY_INDEX_MIN)
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => b.day.localeCompare(a.day));
}

function storyRows(ctx, items) {
  return items.slice(0, DAY_LIST_CAP).map((it) => `<li>
  <a href="${esc(ctx.href(`/item/${slugFor(it)}.html`))}">${esc(it.title)}</a>
  <span class="nd__meta">${esc(String(it.source || '').toUpperCase())}
    · <time datetime="${esc(it.published_at || '')}">${esc(utc(it.published_at))}</time>
    ${it.pillar ? ` · ${esc(it.pillar)}` : ''}</span>
  ${Number.isFinite(it.score) ? `<span class="nd__sc num">${esc(it.score.toFixed(1))}</span>` : '<span class="nd__sc">—</span>'}
</li>`).join('');
}

export function renderDay(ctx, day) {
  const items = itemsForDay(ctx, day);
  const archivedAll = archiveItemsForDay(ctx, day);
  const older = archivedAll.slice(0, DAY_LIST_CAP);
  const total = items.length + archivedAll.length;
  const path = dayPath(day);
  // Head-term title: people search “AI news [date]” / what scored that day.
  const title = `Which AI stories did ${brand.NAME} score on ${day}?`;
  const description = clip(
    `${total} AI stories ${brand.NAME} scored on ${day} UTC (${items.length} in the live window). Each row links the permanent story page with the outlet and the score.`,
    160,
  );
  // Tip #283: section H2s are question-shaped and mirrored in FAQ (§3.3).
  const windowQ = 'Which scored stories are in the live window?';
  const olderQ = `Which older scored stories are from ${day}?`;
  const otherDaysQ = 'Which other days have scored stories?';
  const days = indexableDays(ctx);
  const others = days.filter((d) => d.day !== day);
  // Retention: pair the day's stories with the reading the index closed on.
  const reading = closingReading(ctx, day);
  const readingQ = `What was the ${brand.NAME} reading at the close of ${day}?`;
  const readingA = reading
    ? `${brand.NAME} ${reading.level} (${reading.level_name}), composite ${reading.score.toFixed(1)} of 100 at ${utc(reading.t)}${reading.degraded ? ', degraded' : ''}. Last of ${reading.count} hourly ${reading.count === 1 ? 'reading' : 'readings'} on file for that UTC day. ${brand.DISCLAIMER_SHORT}`
    : '';
  const faq = [
    [`Which AI stories did ${brand.NAME} score on ${day}?`,
      `${total} scored ${total === 1 ? 'story' : 'stories'} carry a published time on ${day} UTC (${items.length} in the live window${archivedAll.length ? `, ${archivedAll.length} in the archive` : ''}). Each row links the permanent story page — not a day doom score.`],
    ...(reading ? [[readingQ, readingA]] : []),
    [windowQ,
      items.length
        ? `${items.length} scored ${items.length === 1 ? 'story' : 'stories'} with a published time on this UTC day in the live window.`
        : 'No scored story falls on this UTC day in the current window.'],
    ...(older.length
      ? [[olderQ,
        'Kept in the permanent archive after they left the live window. Still scored stories — not a forecast.']]
      : []),
    ...(others.length
      ? [[otherDaysQ,
        `Other UTC days with enough scored stories to index, each linking Which AI stories did ${brand.NAME} score on that day?`]]
      : []),
    [`Does ${brand.NAME} publish a day doom score?`,
      `No. ${brand.DISCLAIMER_SHORT} A day hub lists scored stories with that UTC published date — activity tempo counts, not a probability of harm.`],
  ];
  const faqHtml = faq.map(([q, a]) => `
  <h3>${esc(q)}</h3>
  <p>${esc(a)}</p>`).join('');
  const olderBlock = older.length
    ? `<h2 id="older">${esc(olderQ)}</h2>
  <p class="nd__lede">Kept in the permanent archive after they left the live window. Still scored stories — not a forecast.</p>
  <ol class="nd__list">${storyRows(ctx, older)}</ol>
  <p class="fresh__key"><a href="${esc(ctx.href('/item/archive.html'))}">Which older AI stories has ${esc(brand.NAME)} kept in the archive?</a></p>`
    : '';

  const main = `${STYLE}
<article class="nd prose">
  <p class="nd__k"><a href="${esc(ctx.href('/news.html'))}">Which AI stories has ${esc(brand.NAME)} scored in this window?</a> · Which AI stories did ${esc(brand.NAME)} score on ${esc(day)}?</p>
  <h1>Which AI stories did ${esc(brand.NAME)} score on ${esc(day)}?</h1>
  <p class="nd__lede">${esc(items.length)} scored ${items.length === 1 ? 'story' : 'stories'} with a published time on this UTC day in the live window${archivedAll.length ? `; ${esc(String(archivedAll.length))} more kept in the archive` : ''}.
     A day hub is a list of what the newsroom already scored — not a forecast and not a probability of harm.</p>
  <div class="nd__stat" role="group" aria-label="Day totals">
    <div><b class="num">${esc(String(items.length))}</b><span>In live window · ${esc(day)} UTC</span></div>
    ${archivedAll.length ? `<div><b class="num">${esc(String(archivedAll.length))}</b><span>Older in archive</span></div>` : ''}
    ${reading ? `<div><b class="num">${esc(reading.score.toFixed(1))}</b><span>${esc(brand.NAME)} ${esc(String(reading.level))} · close of ${esc(day)}</span></div>` : ''}
  </div>
  ${reading ? `<h2 id="reading">${esc(readingQ)}</h2>
  <p class="nd__lede" id="day-reading">${esc(readingA)}</p>
  <p class="fresh__key"><a href="${esc(ctx.href('/alerts.html'))}">How do I get alerts when ${esc(brand.NAME)} moves?</a>
     · <a href="${esc(ctx.href('/changelog.html'))}">What moved the ${esc(brand.NAME)} score this hour?</a></p>` : ''}
  <h2 id="window">${esc(windowQ)}</h2>
  ${items.length
    ? `<ol class="nd__list">${storyRows(ctx, items)}</ol>`
    : '<p>No scored story falls on this UTC day in the current window.</p>'}
  ${items.length > DAY_LIST_CAP
    ? `<p class="fresh__key">${esc(String(items.length - DAY_LIST_CAP))} more on <a href="${esc(ctx.href('/news.html'))}">Which AI stories has ${esc(brand.NAME)} scored in this window?</a>.</p>`
    : `<p class="fresh__key"><a href="${esc(ctx.href('/news.html'))}">Which AI stories has ${esc(brand.NAME)} scored in this window?</a></p>`}
  ${olderBlock}
  ${others.length ? `<h2 id="other-days">${esc(otherDaysQ)}</h2>
  <nav class="nd__nav" aria-label="Other days">${others.map((d) => `<a href="${esc(ctx.href(dayPath(d.day)))}">Which AI stories did ${esc(brand.NAME)} score on ${esc(d.day)}?</a>`).join('')}</nav>` : ''}
  <h2 id="faq">What questions do people actually ask?</h2>
  ${faqHtml}
</article>`;

  return page({
    ctx,
    path,
    title,
    description,
    noindex: total < DAY_INDEX_MIN,
    jsonld: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      url: ctx.url(path),
      description,
      datePublished: `${day}T00:00:00Z`,
      ...(reading ? { dateModified: reading.t } : {}),
      isPartOf: { '@type': 'WebSite', name: brand.PUBLICATION, url: ctx.url('/') },
      speakable: speakable(['h1', '.nd__lede']),
      // Live first, then archive — fill up to DAY_LIST_CAP visible rows (#51/#53).
      mainEntity: storyItemListEntity(ctx, items, archivedAll, {
        liveCap: DAY_LIST_CAP,
        archiveCap: DAY_LIST_CAP,
      }),
    }, breadcrumbs(ctx, [
      { name: `Which AI stories has ${brand.NAME} scored in this window?`, path: '/news.html' },
      { name: `Which AI stories did ${brand.NAME} score on ${day}?`, path },
    ]), {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map(([q, a]) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    }],
    main,
  });
}

/** Sitemap rows for each day that clears the gate. */
export function sitemapEntries(ctx) {
  const days = indexableDays(ctx);
  if (!days.length) return [];
  const last = (ctx.news && ctx.news.generated_at) || (ctx.state && ctx.state.generated_at);
  return days.map((d) => ({
    loc: dayPath(d.day),
    changefreq: 'hourly',
    priority: '0.7',
    lastmod: last,
  }));
}
