// /people/<id>.html — one page per AI leader on the wire.
//
// COMPETITIVE-SEO.md: DoomBench's URL count is mostly entity hubs including
// /people. We already publish data/leaders.json with coverage headlines,
// on-record lines, and Wikipedia profiles. These pages turn the roster into
// crawlable URLs with unique titles. They never invent a quotation: every
// attributed string is a headline printed whole (same rule as leadersPage.mjs).

import { esc, utc } from './_html.mjs';
import { page } from './layout.mjs';
import { breadcrumbs, speakable } from './_seo.mjs';
import { slugFor } from './itemPage.mjs';
import { avatarPortrait, avatarSprite, personIdFor, faceHref } from './_avatars.mjs';
import * as brand from '../brand.mjs';

/** Minimum press headlines (or on-record lines) before a person page is written. */
export const PEOPLE_INDEX_MIN = 3;

const HEADLINE_CAP = 12;
const LINE_CAP = 12;

const STYLE = `<style>
.pp{max-width:78ch}
.pp__k{font:600 var(--t-xs)/1.3 var(--mono);color:var(--ink-faint);letter-spacing:.04em;text-transform:uppercase}
.pp__lede{font:400 var(--t-base)/1.55 var(--sans);color:var(--ink-dim);max-width:68ch}
.pp__head{display:flex;gap:16px;align-items:flex-start;margin:8px 0 0}
.pp__face{flex:0 0 auto;width:72px;height:72px;border-radius:50%;overflow:hidden;background:var(--bg-sunken);border:1px solid var(--rule)}
.pp__face img,.pp__face svg{width:100%;height:100%;display:block}
.pp__stat{display:flex;flex-wrap:wrap;gap:14px 22px;margin:18px 0;padding:14px 0;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)}
.pp__stat b{font:700 var(--t-xl)/1 var(--mono);color:var(--ink)}
.pp__stat span{display:block;font:500 var(--t-xs)/1.3 var(--mono);color:var(--ink-faint);margin-top:4px}
.pp__list{list-style:none;padding:0;margin:16px 0 0;display:grid;gap:10px}
.pp__list li{padding:10px 0;border-bottom:1px solid var(--rule)}
.pp__list a{color:var(--ink);font:600 var(--t-base)/1.35 var(--sans);text-decoration:none}
.pp__list a:hover{text-decoration:underline}
.pp__meta{display:block;font:400 var(--t-xs)/1.3 var(--mono);color:var(--ink-faint);margin-top:4px}
.pp__nav{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 0}
.pp__nav a{font:600 var(--t-sm)/1.3 var(--sans);padding:6px 10px;border:1px solid var(--rule);border-radius:6px;color:var(--ink);text-decoration:none}
.pp__nav a:hover{background:var(--bg-sunken)}
.pp__rule{font:400 var(--t-sm)/1.55 var(--sans);color:var(--ink-dim);margin:14px 0}
.pp__wiki{font:400 var(--t-sm)/1.5 var(--sans);color:var(--ink-dim);margin:10px 0 0}
</style>`;

function clip(text, max) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const at = cut.lastIndexOf(' ');
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,.;:–—-]+$/, '')}…`;
}

function leadersList(ctx) {
  return (ctx.leaders && Array.isArray(ctx.leaders.leaders)) ? ctx.leaders.leaders : [];
}

export function peoplePath(id) {
  return `/people/${String(id || '').toLowerCase()}.html`;
}

export function personSubstance(leader) {
  if (!leader || !leader.id || !leader.name) return 0;
  const headlines = (leader.coverage && Array.isArray(leader.coverage.headlines))
    ? leader.coverage.headlines.length
    : 0;
  const lines = Array.isArray(leader.lines) ? leader.lines.length : 0;
  const week = Number(leader.coverage && leader.coverage.count_7d) || 0;
  return Math.max(headlines, lines, week >= PEOPLE_INDEX_MIN ? PEOPLE_INDEX_MIN : 0);
}

export function personIndexable(leader) {
  return personSubstance(leader) >= PEOPLE_INDEX_MIN;
}

export function indexablePeople(ctx) {
  return leadersList(ctx)
    .filter(personIndexable)
    .slice()
    .sort((a, b) => {
      const ca = Number(a.coverage && a.coverage.count_7d) || 0;
      const cb = Number(b.coverage && b.coverage.count_7d) || 0;
      return (cb - ca) || String(a.name).localeCompare(String(b.name));
    });
}

export function personById(ctx, id) {
  const key = String(id || '').toLowerCase();
  return leadersList(ctx).find((l) => l && String(l.id).toLowerCase() === key) || null;
}

function faceBlock(leader) {
  const pid = personIdFor(leader.id);
  if (!pid) return '';
  if (faceHref(pid)) {
    return `<div class="pp__face" aria-hidden="true"><img src="${esc(faceHref(pid))}" alt="" width="72" height="72"></div>`;
  }
  try {
    return `<div class="pp__face" aria-hidden="true">${avatarPortrait(pid)}</div>`;
  } catch {
    return '';
  }
}

function headlineRows(headlines) {
  return headlines.slice(0, HEADLINE_CAP).map((h) => {
    const title = h.title || h.headline || '';
    const href = h.url || '';
    const outlet = h.outlet || h.source || '';
    const when = h.published_at ? utc(h.published_at) : '';
    const link = href
      ? `<a href="${esc(href)}" rel="noopener noreferrer">${esc(title)}</a>`
      : `<span>${esc(title)}</span>`;
    return `<li>${link}<span class="pp__meta">${esc(outlet)}${when ? ` · <time datetime="${esc(h.published_at)}">${esc(when)}</time>` : ''}</span></li>`;
  }).join('');
}

function lineRows(ctx, lines) {
  return lines.slice(0, LINE_CAP).map((line) => {
    const title = line.headline || '';
    const itemHref = line.item_id ? ctx.href(`/item/${slugFor({ id: line.item_id, title })}.html`) : '';
    // Prefer the outlet URL; fall back to our item page when the line is from the newsroom.
    const href = line.url || itemHref || '';
    const link = href
      ? `<a href="${esc(href)}" rel="noopener noreferrer">${esc(title)}</a>`
      : `<span>${esc(title)}</span>`;
    const src = String(line.source || '').toUpperCase();
    const when = line.published_at ? utc(line.published_at) : '';
    return `<li>${link}<span class="pp__meta">${esc(src)}${when ? ` · <time datetime="${esc(line.published_at)}">${esc(when)}</time>` : ''} · headline only, not a quotation</span></li>`;
  }).join('');
}

export function renderPerson(ctx, id) {
  const leader = personById(ctx, id);
  if (!leader) {
    return page({
      ctx,
      path: peoplePath(id),
      title: `Person not in this build · ${brand.NAME}`,
      description: `No leader page for ${id} in this build.`,
      noindex: true,
      main: `${STYLE}<article class="pp prose"><h1>Not in this build</h1><p>This person is not on the current leader wire.</p></article>`,
    });
  }

  const path = peoplePath(leader.id);
  const headlines = (leader.coverage && Array.isArray(leader.coverage.headlines))
    ? leader.coverage.headlines
    : [];
  const lines = Array.isArray(leader.lines) ? leader.lines : [];
  const week = Number(leader.coverage && leader.coverage.count_7d);
  const day = Number(leader.coverage && leader.coverage.count_24h);
  const roleLine = [leader.role, leader.org].filter(Boolean).join(', ');
  const title = `${leader.name}: AI press coverage this week · ${brand.NAME}`;
  const description = clip(
    `${leader.name}${roleLine ? ` (${roleLine})` : ''}: ${Number.isFinite(week) ? week : headlines.length} press stories naming them in the last 7 days on ${brand.NAME}. Coverage counts, not quotations.`,
    160,
  );
  const wiki = leader.profile && (leader.profile.content_urls?.desktop?.page
    || leader.profile.url
    || null);
  const extract = leader.profile && leader.profile.extract
    ? clip(leader.profile.extract, 280)
    : '';
  const labLink = leader.org_id
    ? ` Lab page: <a href="${esc(ctx.href(`/lab/${leader.org_id}.html`))}">${esc(leader.org || leader.org_id)}</a>.`
    : '';
  const others = indexablePeople(ctx).filter((p) => p.id !== leader.id).slice(0, 12);

  const main = `${STYLE}${avatarSprite()}
<article class="pp prose">
  <p class="pp__k"><a href="${esc(ctx.href('/leaders.html'))}">Leaders</a> · <a href="${esc(ctx.href('/people/'))}">People</a></p>
  <div class="pp__head">
    ${faceBlock(leader)}
    <div>
      <h1 class="pp__name">${esc(leader.name)}</h1>
      <p class="pp__lede">${esc(roleLine || 'On the AI leader wire')}.
         Press coverage counts stories that name this person. On-record lines are outlet headlines that matched a speech cue — never a quotation invented here.</p>
    </div>
  </div>
  <div class="pp__stat" role="group" aria-label="Coverage counts">
    <div><b class="num">${esc(Number.isFinite(week) ? String(week) : '—')}</b><span>Press stories · 7 days</span></div>
    <div><b class="num">${esc(Number.isFinite(day) ? String(day) : '—')}</b><span>Press stories · 24 hours</span></div>
    <div><b class="num">${esc(String(lines.length))}</b><span>On-record lines this window</span></div>
  </div>
  <p class="pp__rule"><b>This page never writes a quotation.</b> Every string below is a headline, reproduced as the publication printed it${labLink}</p>
  ${extract ? `<p class="pp__wiki">${esc(extract)}${wiki ? ` <a href="${esc(wiki)}" rel="noopener noreferrer">Wikipedia</a> (CC BY-SA).` : ''}</p>` : ''}
  ${lines.length ? `<h2 id="pp-lines">On the record in this newsroom window</h2>
  <ol class="pp__list">${lineRows(ctx, lines)}</ol>` : ''}
  ${headlines.length ? `<h2 id="pp-press">Press coverage sample</h2>
  <ol class="pp__list">${headlineRows(headlines)}</ol>` : '<p>No press headlines in the current coverage pull.</p>'}
  <p class="fresh__key"><a href="${esc(ctx.href(`/leaders.html#lw-${leader.id}`))}">On the full leader wire →</a>
     · <a href="${esc(ctx.href('/api/leaders.json'))}">api/leaders.json</a></p>
  ${others.length ? `<h2>Other people on the wire</h2>
  <nav class="pp__nav" aria-label="Other people">${others.map((p) => `<a href="${esc(ctx.href(peoplePath(p.id)))}">${esc(p.name)}</a>`).join('')}</nav>` : ''}
</article>`;

  return page({
    ctx,
    path,
    title,
    description,
    noindex: !personIndexable(leader),
    jsonld: [{
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      name: title,
      url: ctx.url(path),
      description,
      speakable: speakable(['.pp__name', '.pp__lede']),
      mainEntity: {
        '@type': 'Person',
        name: leader.name,
        jobTitle: leader.role || undefined,
        worksFor: leader.org ? { '@type': 'Organization', name: leader.org } : undefined,
        sameAs: wiki ? [wiki] : undefined,
      },
      isPartOf: { '@type': 'WebSite', name: brand.PUBLICATION, url: ctx.url('/') },
    }, breadcrumbs(ctx, [
      { name: 'Leaders', path: '/leaders.html' },
      { name: 'People', path: '/people/' },
      { name: leader.name, path },
    ])],
    main,
  });
}

export function renderIndex(ctx) {
  const people = indexablePeople(ctx);
  const path = '/people/';
  const title = `AI leaders: press coverage pages · ${brand.NAME}`;
  const description = clip(
    `${people.length} people on the ${brand.NAME} leader wire with enough press coverage for their own page. Coverage counts stories naming them — not quotations.`,
    160,
  );
  const rows = people.map((p) => {
    const week = Number(p.coverage && p.coverage.count_7d);
    return `<li>
  <a href="${esc(ctx.href(peoplePath(p.id)))}">${esc(p.name)}</a>
  <span class="pp__meta">${esc([p.role, p.org].filter(Boolean).join(' · '))}${Number.isFinite(week) ? ` · ${esc(String(week))} stories / 7d` : ''}</span>
</li>`;
  }).join('');

  // Reuse list styles; keep the index light.
  const main = `${STYLE}
<article class="pp prose">
  <p class="pp__k"><a href="${esc(ctx.href('/leaders.html'))}">Leaders</a> · People</p>
  <h1>AI leaders with a coverage page</h1>
  <p class="pp__lede">A person earns a page when the wire holds at least ${PEOPLE_INDEX_MIN} press headlines, on-record lines, or a 7-day coverage count at that floor. Each page lists headlines as printed. It does not invent quotations.</p>
  ${rows ? `<ol class="pp__list">${rows}</ol>` : '<p>No person clears the gate in this build.</p>'}
  <p class="fresh__key"><a href="${esc(ctx.href('/leaders.html'))}">Full leader wire →</a></p>
</article>`;

  return page({
    ctx,
    path,
    title,
    description,
    noindex: people.length === 0,
    jsonld: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      url: ctx.url(path),
      description,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: people.length,
        itemListElement: people.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: ctx.url(peoplePath(p.id)),
          name: p.name,
        })),
      },
    }, breadcrumbs(ctx, [
      { name: 'Leaders', path: '/leaders.html' },
      { name: 'People', path },
    ])],
    main,
  });
}

/** Sitemap rows for the people index and each person that clears the gate. */
export function sitemapEntries(ctx) {
  const people = indexablePeople(ctx);
  if (!people.length) return [];
  const last = (ctx.leaders && ctx.leaders.generated_at)
    || (ctx.news && ctx.news.generated_at)
    || (ctx.state && ctx.state.generated_at);
  return [
    { loc: '/people/', changefreq: 'hourly', priority: '0.7', lastmod: last },
    ...people.map((p) => ({
      loc: peoplePath(p.id),
      changefreq: 'hourly',
      priority: '0.65',
      lastmod: last,
    })),
  ];
}
