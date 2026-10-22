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
import { slugFor, storyItemListEntity } from './itemPage.mjs';
import { avatarPortrait, avatarSprite, personIdFor, faceHref } from './_avatars.mjs';
import * as brand from '../brand.mjs';
import { allLabs } from './facetPages.mjs';

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

/** Wire-only substance: press headlines, on-record lines, or a 7-day floor. */
export function personSubstance(leader) {
  if (!leader || !leader.id || !leader.name) return 0;
  const headlines = (leader.coverage && Array.isArray(leader.coverage.headlines))
    ? leader.coverage.headlines.length
    : 0;
  const lines = Array.isArray(leader.lines) ? leader.lines.length : 0;
  const week = Number(leader.coverage && leader.coverage.count_7d) || 0;
  return Math.max(headlines, lines, week >= PEOPLE_INDEX_MIN ? PEOPLE_INDEX_MIN : 0);
}

/**
 * Wire substance plus archive story count — archive can keep a person hub
 * alive after the live coverage window rolls (same idea as model/tag hubs).
 */
export function personStoryCount(ctx, leader) {
  return personSubstance(leader) + archiveItemsForPerson(ctx, leader).length;
}

export function personIndexable(leader, ctx) {
  if (ctx) return personStoryCount(ctx, leader) >= PEOPLE_INDEX_MIN;
  return personSubstance(leader) >= PEOPLE_INDEX_MIN;
}

export function indexablePeople(ctx) {
  return leadersList(ctx)
    .filter((p) => personIndexable(p, ctx))
    .slice()
    .sort((a, b) => {
      const ca = personStoryCount(ctx, a);
      const cb = personStoryCount(ctx, b);
      const wa = Number(a.coverage && a.coverage.count_7d) || 0;
      const wb = Number(b.coverage && b.coverage.count_7d) || 0;
      return (cb - ca) || (wb - wa) || String(a.name).localeCompare(String(b.name));
    });
}

export function personById(ctx, id) {
  const key = String(id || '').toLowerCase();
  return leadersList(ctx).find((l) => l && String(l.id).toLowerCase() === key) || null;
}

/** Full-name match (word boundaries) so "Karpathy" does not light up "Karp". */
function nameInText(name, hay) {
  const n = String(name || '').trim();
  if (n.length < 4 || !hay) return false;
  const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`, 'i').test(hay);
}

/**
 * Indexable people whose full name appears in a story title/summary.
 * Full-name match only (word boundaries) so "Karpathy" does not light up "Karp".
 */
export function peopleForItem(ctx, item) {
  const hay = `${item?.title || ''} ${item?.summary || ''}`;
  if (!hay.trim()) return [];
  return indexablePeople(ctx).filter((person) => nameInText(person.name, hay));
}

/** Older scored stories naming this person, kept in the durable item archive. */
export function archiveItemsForPerson(ctx, person) {
  const name = person && person.name;
  if (!name) return [];
  const archived = Array.isArray(ctx.itemArchive) ? ctx.itemArchive : [];
  return archived
    .filter((it) => nameInText(name, `${it?.title || ''} ${it?.summary || ''}`))
    .slice()
    .sort((a, b) => String(b.published_at || '').localeCompare(String(a.published_at || '')));
}

function archiveStoryRows(ctx, items) {
  return items.slice(0, 12).map((it) => {
    const when = it.published_at ? utc(it.published_at) : '';
    return `<li>
  <a href="${esc(ctx.href(`/item/${slugFor(it)}.html`))}">${esc(it.title)}</a>
  <span class="pp__meta">${esc(String(it.source || '').toUpperCase())}${when ? ` · <time datetime="${esc(it.published_at)}">${esc(when)}</time>` : ''}</span>
</li>`;
  }).join('');
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
  // Head-term title: people search “{name} AI press” / person doom score.
  const title = `What press has ${brand.NAME} scored about ${leader.name}?`;
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
  const labName = (() => {
    if (!leader.org_id) return '';
    const players = (ctx.race && Array.isArray(ctx.race.players)) ? ctx.race.players : [];
    const player = players.find((p) => p && p.id === leader.org_id);
    return (player && player.name) || leader.org || leader.org_id;
  })();
  // Only link a lab page the build writes (allLabs); academia, SSI, Thinking
  // Machines and others had links to /lab/<id>.html pages that never existed.
  const labLink = leader.org_id && allLabs(ctx).some((p) => p.id === leader.org_id)
    ? ` Lab page: <a href="${esc(ctx.href(`/lab/${leader.org_id}.html`))}">What has ${esc(brand.NAME)} scored about ${esc(labName)}?</a>.`
    : '';
  const others = indexablePeople(ctx).filter((p) => p.id !== leader.id).slice(0, 12);
  const archivedAll = archiveItemsForPerson(ctx, leader);
  const older = archivedAll.slice(0, 12);
  // Tip #289: section H2s are question-shaped and mirrored in FAQ (§3.3).
  const linesQ = `Which on-record lines name ${leader.name} in this newsroom window?`;
  const pressQ = `Which press coverage names ${leader.name}?`;
  const olderQ = `Which older scored stories name ${leader.name}?`;
  const othersQ = 'Which other people are on the wire?';
  const faq = [
    [`What press has ${brand.NAME} scored about ${leader.name}?`,
      `${Number.isFinite(week) ? week : headlines.length} press stories naming ${leader.name} in the last 7 days on ${brand.NAME}${archivedAll.length ? `, plus ${archivedAll.length} older in the archive` : ''}. Coverage counts only — not a person doom score.`],
    ...(lines.length
      ? [[linesQ,
        'Outlet headlines that matched a speech cue in the current newsroom window — never a quotation invented here.']]
      : []),
    ...(headlines.length
      ? [[pressQ,
        `${headlines.length} headline${headlines.length === 1 ? '' : 's'} from the current coverage pull, reproduced as the publication printed them.`]]
      : []),
    ...(older.length
      ? [[olderQ,
        'Kept in the permanent archive after they left the live window. Still scored stories — not a forecast. Titles only; not quotations.']]
      : []),
    ...(others.length
      ? [[othersQ,
        `Other people on the AI leader wire that clear the substance gate, each linking What press has ${brand.NAME} scored about that person?`]]
      : []),
    [`Does ${brand.NAME} invent quotations for ${leader.name}?`,
      `No. Every attributed string on this page is a headline reproduced as the publication printed it. ${brand.DISCLAIMER_SHORT}`],
  ];
  const faqHtml = faq.map(([q, a]) => `
  <h3>${esc(q)}</h3>
  <p>${esc(a)}</p>`).join('');
  const olderBlock = older.length
    ? `<h2 id="pp-archive">${esc(olderQ)}</h2>
  <p class="pp__lede">Kept in the permanent archive after they left the live window. Still scored stories — not a forecast. Titles only; not quotations.</p>
  <ol class="pp__list">${archiveStoryRows(ctx, older)}</ol>
  <p class="fresh__key"><a href="${esc(ctx.href('/item/archive.html'))}">Which older AI stories has ${esc(brand.NAME)} kept in the archive?</a></p>`
    : '';

  const main = `${STYLE}${avatarSprite()}
<article class="pp prose">
  <p class="pp__k"><a href="${esc(ctx.href('/leaders.html'))}">Which AI leaders are on the record this week?</a> · <a href="${esc(ctx.href('/people/'))}">Which AI leaders have press coverage pages on ${esc(brand.NAME)}?</a> · <a href="${esc(ctx.href('/people.html'))}">Which AI people has ${esc(brand.NAME)} scored press about?</a></p>
  <div class="pp__head">
    ${faceBlock(leader)}
    <div>
      <h1 class="pp__name">What press has ${esc(brand.NAME)} scored about ${esc(leader.name)}?</h1>
      <p class="pp__lede">${esc(leader.name)}${roleLine ? ` · ${esc(roleLine)}` : ' · On the AI leader wire'}.
         Press coverage counts stories that name this person. On-record lines are outlet headlines that matched a speech cue — never a quotation invented here.</p>
    </div>
  </div>
  <div class="pp__stat" role="group" aria-label="Coverage counts">
    <div><b class="num">${esc(Number.isFinite(week) ? String(week) : '—')}</b><span>Press stories · 7 days</span></div>
    <div><b class="num">${esc(Number.isFinite(day) ? String(day) : '—')}</b><span>Press stories · 24 hours</span></div>
    <div><b class="num">${esc(String(lines.length))}</b><span>On-record lines this window</span></div>
    ${archivedAll.length ? `<div><b class="num">${esc(String(archivedAll.length))}</b><span>Older in archive</span></div>` : ''}
  </div>
  <p class="pp__rule"><b>This page never writes a quotation.</b> Every string below is a headline, reproduced as the publication printed it${labLink}</p>
  ${extract ? `<p class="pp__wiki">${esc(extract)}${wiki ? ` <a href="${esc(wiki)}" rel="noopener noreferrer">Wikipedia</a> (CC BY-SA).` : ''}</p>` : ''}
  ${lines.length ? `<h2 id="pp-lines">${esc(linesQ)}</h2>
  <ol class="pp__list">${lineRows(ctx, lines)}</ol>` : ''}
  ${headlines.length ? `<h2 id="pp-press">${esc(pressQ)}</h2>
  <ol class="pp__list">${headlineRows(headlines)}</ol>` : '<p>No press headlines in the current coverage pull.</p>'}
  ${olderBlock}
  <h2 id="faq">What questions do people actually ask?</h2>
  ${faqHtml}
  <p class="fresh__key"><a href="${esc(ctx.href(`/leaders.html#lw-${leader.id}`))}">Which AI leaders are on the record this week?</a>
     · <a href="${esc(ctx.href('/api/leaders.json'))}">api/leaders.json</a></p>
  ${others.length ? `<h2 id="other-people">${esc(othersQ)}</h2>
  <nav class="pp__nav" aria-label="Other people">${others.map((p) => `<a href="${esc(ctx.href(peoplePath(p.id)))}">What press has ${esc(brand.NAME)} scored about ${esc(p.name)}?</a>`).join('')}</nav>` : ''}
</article>`;
  const jsonld = [{
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
    { name: 'Which AI leaders are on the record this week?', path: '/leaders.html' },
    { name: `Which AI leaders have press coverage pages on ${brand.NAME}?`, path: '/people/' },
    { name: `What press has ${brand.NAME} scored about ${leader.name}?`, path },
  ]), {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(([q, a]) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }];
  // Archive story list is visible on the page — emit ItemList so schema matches
  // HTML (FINDABILITY #54). Keep Person as ProfilePage mainEntity.
  if (older.length) {
    jsonld.push({
      '@context': 'https://schema.org',
      name: olderQ,
      ...storyItemListEntity(ctx, [], older, { liveCap: 12, archiveCap: 12 }),
    });
  }

  return page({
    ctx,
    path,
    title,
    description,
    noindex: !personIndexable(leader, ctx),
    jsonld,
    main,
  });
}

export function renderIndex(ctx) {
  const people = indexablePeople(ctx);
  const path = '/people/';
  // Head-term title: people search “AI leaders” / coverage pages.
  const title = `Which AI leaders have press coverage pages on ${brand.NAME}?`;
  const description = clip(
    `${people.length} people on the ${brand.NAME} leader wire with enough press coverage for their own page (live wire plus archive). Coverage counts stories naming them — not quotations.`,
    160,
  );
  const faq = [
    [`Which AI leaders have press coverage pages on ${brand.NAME}?`,
      `${people.length} people clear the substance gate of at least ${PEOPLE_INDEX_MIN} press headlines, on-record lines, a 7-day coverage floor, or scored archive stories naming them. Each page lists headlines as printed — not invented quotations.`],
    [`Does ${brand.NAME} invent quotations for AI leaders?`,
      `No. Every attributed string on a person page is a headline reproduced as the publication printed it. ${brand.DISCLAIMER_SHORT}`],
  ];
  const faqHtml = faq.map(([q, a]) => `
  <h3>${esc(q)}</h3>
  <p>${esc(a)}</p>`).join('');
  const rows = people.map((p) => {
    const week = Number(p.coverage && p.coverage.count_7d);
    const archived = archiveItemsForPerson(ctx, p).length;
    return `<li>
  <a href="${esc(ctx.href(peoplePath(p.id)))}">What press has ${esc(brand.NAME)} scored about ${esc(p.name)}?</a>
  <span class="pp__meta">${esc(p.name)} · ${esc([p.role, p.org].filter(Boolean).join(' · '))}${Number.isFinite(week) ? ` · ${esc(String(week))} stories / 7d` : ''}${archived ? ` · ${esc(String(archived))} archive` : ''}</span>
</li>`;
  }).join('');

  // Reuse list styles; keep the index light.
  const main = `${STYLE}
<article class="pp prose">
  <p class="pp__k"><a href="${esc(ctx.href('/leaders.html'))}">Which AI leaders are on the record this week?</a> · Which AI leaders have press coverage pages on ${esc(brand.NAME)}? · <a href="${esc(ctx.href('/people.html'))}">Which AI people has ${esc(brand.NAME)} scored press about?</a></p>
  <h1>Which AI leaders have press coverage pages on ${esc(brand.NAME)}?</h1>
  <p class="pp__lede">A person earns a page when the wire or the durable archive holds at least ${PEOPLE_INDEX_MIN} press headlines, on-record lines, a 7-day coverage count at that floor, or scored stories naming them. Each page lists headlines as printed. It does not invent quotations.</p>
  ${rows ? `<ol class="pp__list">${rows}</ol>` : '<p>No person clears the gate in this build.</p>'}
  <h2 id="faq">What questions do people actually ask?</h2>
  ${faqHtml}
  <p class="fresh__key">Search-shaped directory: <a href="${esc(ctx.href('/people.html'))}">Which AI people has ${esc(brand.NAME)} scored press about?</a>
     · <a href="${esc(ctx.href('/leaders.html'))}">Which AI leaders are on the record this week?</a></p>
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
      speakable: speakable(['h1', '.pp__lede']),
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: people.length,
        itemListElement: people.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: ctx.url(peoplePath(p.id)),
          name: `What press has ${brand.NAME} scored about ${p.name}?`,
        })),
      },
    }, breadcrumbs(ctx, [
      { name: 'Which AI leaders are on the record this week?', path: '/leaders.html' },
      { name: `Which AI leaders have press coverage pages on ${brand.NAME}?`, path },
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

/**
 * DoomBench-shaped /people head-term hub. Same gated roster as /people/,
 * different title and lede for “AI people” / “AI leaders” queries — coverage
 * counts only, never invented quotations or a person doom score.
 */
export function renderPeople(ctx) {
  const people = indexablePeople(ctx);
  const path = '/people.html';
  // Head-term title: people search “AI people” / which leaders SIREN covers.
  const title = `Which AI people has ${brand.NAME} scored press about?`;
  const description = clip(
    `${people.length} AI leaders with press-coverage hubs on ${brand.NAME}. Each row links /people pages — headlines and story counts only, not quotations or a person doom score.`,
    160,
  );
  const faq = [
    [`Which AI people has ${brand.NAME} scored press about?`,
      `${people.length} leaders clear the substance gate of at least ${PEOPLE_INDEX_MIN} headlines, on-record lines, a 7-day coverage floor, or scored archive stories naming them. Each hub lists those headlines — not a person doom score.`],
    [`Does ${brand.NAME} publish a person doom score?`,
      `No. ${brand.DISCLAIMER_SHORT} These pages count press coverage that names a leader on the wire.`],
  ];
  const faqHtml = faq.map(([q, a]) => `
  <h3>${esc(q)}</h3>
  <p>${esc(a)}</p>`).join('');
  const rows = people.map((p) => {
    const week = Number(p.coverage && p.coverage.count_7d);
    const archived = archiveItemsForPerson(ctx, p).length;
    const total = personStoryCount(ctx, p);
    return `<li>
  <a href="${esc(ctx.href(peoplePath(p.id)))}">What press has ${esc(brand.NAME)} scored about ${esc(p.name)}?</a>
  <span class="pp__meta">${esc(p.name)} · ${esc([p.role, p.org].filter(Boolean).join(' · ') || 'Coverage hub')} · <span class="num">${esc(String(total))}</span> signal${archived ? ` (${esc(String(archived))} archive)` : ''}${Number.isFinite(week) ? ` · ${esc(String(week))} / 7d` : ''}</span>
</li>`;
  }).join('');
  const main = `${STYLE}
<article class="pp prose">
  <p class="pp__k"><a href="${esc(ctx.href('/compare.html'))}">Which AI doom indexes can you compare?</a> · <a href="${esc(ctx.href('/leaders.html'))}">Which AI leaders are on the record this week?</a> · <a href="${esc(ctx.href('/people/'))}">Which AI leaders have press coverage pages on ${esc(brand.NAME)}?</a> · Which AI people has ${esc(brand.NAME)} scored press about?</p>
  <h1>Which AI people has ${esc(brand.NAME)} scored press about?</h1>
  <p class="pp__lede">${esc(brand.NAME)} does not publish a person “doom score.” It publishes an activity index and press coverage counts. This page lists leaders who already clear the same substance gate as <a href="${esc(ctx.href('/people/'))}">Which AI leaders have press coverage pages on ${esc(brand.NAME)}?</a> — at least ${PEOPLE_INDEX_MIN} headlines, on-record lines, a 7-day coverage floor, or scored archive stories naming them. Headlines only; never invented quotations.</p>
  <div class="pp__stat" role="group" aria-label="People hub totals">
    <div><b class="num">${esc(String(people.length))}</b><span>People hubs</span></div>
  </div>
  ${people.length ? `<ol class="pp__list">${rows}</ol>` : '<p>No people hub cleared the gate in this build.</p>'}
  <h2 id="faq">What questions do people actually ask?</h2>
  ${faqHtml}
  <p class="fresh__key"><a href="${esc(ctx.href('/people/'))}">Which AI leaders have press coverage pages on ${esc(brand.NAME)}?</a>
     · <a href="${esc(ctx.href('/leaders.html'))}">Which AI leaders are on the record this week?</a>
     · <a href="${esc(ctx.href('/companies.html'))}">Which AI companies has ${esc(brand.NAME)} scored stories about?</a>
     · <a href="${esc(ctx.href('/models.html'))}">Which AI models has ${esc(brand.NAME)} scored stories about?</a>
     · <a href="${esc(ctx.href('/compare.html'))}">Which AI doom indexes can you compare?</a></p>
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
      speakable: speakable(['h1', '.pp__lede']),
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: people.length,
        itemListElement: people.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: ctx.url(peoplePath(p.id)),
          name: `What press has ${brand.NAME} scored about ${p.name}?`,
        })),
      },
    }, breadcrumbs(ctx, [
      { name: 'Which AI doom indexes can you compare?', path: '/compare.html' },
      { name: `Which AI people has ${brand.NAME} scored press about?`, path },
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

/** Sitemap rows for the people index and each person that clears the gate. */
export function sitemapEntries(ctx) {
  const people = indexablePeople(ctx);
  if (!people.length) return [];
  const last = (ctx.leaders && ctx.leaders.generated_at)
    || (ctx.news && ctx.news.generated_at)
    || (ctx.state && ctx.state.generated_at);
  return [
    { loc: '/people/', changefreq: 'hourly', priority: '0.7', lastmod: last },
    { loc: '/people.html', changefreq: 'hourly', priority: '0.75', lastmod: last },
    ...people.map((p) => ({
      loc: peoplePath(p.id),
      changefreq: 'hourly',
      priority: '0.65',
      lastmod: last,
    })),
  ];
}
