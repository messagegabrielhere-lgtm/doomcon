// Faceted landing pages: /pillar/<id>.html and /lab/<id>.html.
//
// COMPETITIVE-SEO.md (2026-10-10): DoomBench ships ~2,081 sitemap URLs via
// /models /companies /countries /people /jobs; Skynet ~1,237 via /tags + /news.
// pizzint still has ~1,018 via /intel but its news-sitemap is empty. Our long
// tail was /item/ only. These facet pages turn filters that already exist as
// CSS chips into crawlable URLs with unique titles (FINDABILITY.md §1.2 #3).

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { publishedEntities, entitySlug } from '../../collector/news-sources/_entities.mjs';
import { esc, num, utc } from './_html.mjs';
import { page } from './layout.mjs';
import { breadcrumbs, speakable } from './_seo.mjs';
import { slugFor, storyItemListEntity } from './itemPage.mjs';
import * as brand from '../brand.mjs';

/** Minimum scored stories before a pillar page is indexable (soft-404 gate). */
export const PILLAR_INDEX_MIN = 3;

/** Minimum title/source hits before a lab page leans on news for substance. */
export const LAB_NEWS_MIN = 1;

/**
 * Minimum scored stories before an entity-only lab (not on the race board)
 * gets its own /lab/<id>.html page. Race labs can clear the gate via odds;
 * these cannot invent a market row.
 */
export const ENTITY_LAB_MIN = 3;

/** Entity lab names that already have a race-board id — do not double-page. */
const ENTITY_LAB_RACE_ID = {
  OpenAI: 'openai',
  Anthropic: 'anthropic',
  'Google DeepMind': 'google-deepmind',
  'Meta AI': 'meta',
  xAI: 'xai',
  DeepSeek: 'deepseek',
  Mistral: 'mistral',
  'Alibaba Qwen': 'qwen',
};

function clip(text, max) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const at = cut.lastIndexOf(' ');
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,.;:–—-]+$/, '')}…`;
}

export function pillarPath(id) {
  return `/pillar/${id}.html`;
}

export function labPath(id) {
  return `/lab/${id}.html`;
}

/**
 * Product / head-term aliases for lab about-lines (FINDABILITY #121).
 * Only when the alias is the name people type and we already score those
 * stories (e.g. Gemini under Google DeepMind). Not a synonym doorway farm.
 */
export const LAB_HEAD_ALIASES = Object.freeze({
  // FINDABILITY #187 — Argon product code beside Gemini (11+ live Argon headlines).
  'google-deepmind': 'Gemini / Argon',
  'openai': 'ChatGPT',
  'anthropic': 'Claude',
  // FINDABILITY #137 — ticker people type when Google Trends shows "mu"
  // with AI memory-chip headlines; stories already score under Micron.
  'micron': 'MU',
  // FINDABILITY #161 — ticker people type when Trends shows "nvda" with AI
  // funding / debt / CoreWeave co-move headlines; stories already score under NVIDIA.
  'nvidia': 'NVDA',
  // FINDABILITY #288 — ticker people type when Trends shows "crwv" with AI
  // neocloud / GPU-cloud debt headlines; stories already score under CoreWeave.
  'coreweave': 'CRWV',
  // FINDABILITY #169 — product people type when Trends / tape shows Muse Spark /
  // Muse Wonder with Meta open-weight AI headlines; stories already score under Meta AI.
  'meta': 'Muse',
  // FINDABILITY #170 — product people type for Apple on-device AI / China launch tape.
  'apple': 'Apple Intelligence',
  // FINDABILITY #171 — product people type when Trends / tape shows Copilot with
  // Microsoft AI headlines; stories already score under Microsoft.
  'microsoft': 'Copilot',
  // FINDABILITY #173 — product people type when Trends / tape shows Grok with
  // xAI headlines; stories already score under xAI.
  'xai': 'Grok',
  // FINDABILITY #175 — HBM / AI-memory product people type when Trends / tape
  // shows Samsung memory-chip headlines; stories already score under Samsung.
  'samsung': 'HBM',
  // FINDABILITY #177 — short product people type when Trends / tape shows Qwen
  // with Alibaba open-weight headlines; stories already score under Alibaba Qwen.
  'qwen': 'Qwen',
  // FINDABILITY #180 — Timestral / forecasting product people type when Trends /
  // tape shows Mistral Timestral or CERN Flare headlines; stories already score under Mistral.
  'mistral': 'Timestral',
  // FINDABILITY #183 — AIP product people type when Trends / tape shows Palantir
  // government / defense AI headlines; stories already score under Palantir.
  'palantir': 'AIP',
  // FINDABILITY #184 — MI300 / Instinct product people type when Trends / tape
  // shows AMD AI-GPU headlines; stories already score under AMD.
  'amd': 'MI300',
  // FINDABILITY #185 — FSD / Autopilot product people type when Trends / tape
  // shows Tesla AI / Autopilot / FSD headlines; stories already score under Tesla.
  'tesla': 'FSD',
});

/** Display name for lab titles/H1/FAQ — race name, plus alias when mapped. */
export function labAboutLabel(player) {
  const name = player && player.name ? String(player.name) : '';
  const alias = player && player.id ? LAB_HEAD_ALIASES[player.id] : null;
  if (alias && name && !name.toLowerCase().includes(alias.toLowerCase())) {
    return `${name} / ${alias}`;
  }
  return name || alias || '';
}

export function itemsForPillar(ctx, pillarId) {
  const items = (ctx.news && Array.isArray(ctx.news.items)) ? ctx.news.items : [];
  return items
    .filter((it) => it && it.pillar === pillarId)
    .slice()
    .sort((a, b) => String(b.published_at || '').localeCompare(String(a.published_at || '')));
}

/** Older scored stories under this pillar, kept in the durable item archive. */
export function archiveItemsForPillar(ctx, pillarId) {
  const archived = Array.isArray(ctx.itemArchive) ? ctx.itemArchive : [];
  return archived
    .filter((it) => it && it.pillar === pillarId)
    .slice()
    .sort((a, b) => String(b.published_at || '').localeCompare(String(a.published_at || '')));
}

function pillarState(ctx, pillarId) {
  const list = (ctx.state && Array.isArray(ctx.state.pillars)) ? ctx.state.pillars : [];
  return list.find((p) => p && p.id === pillarId) || null;
}

export function pillarIndexable(ctx, pillarId) {
  // Live-window gate only while deploy-pending (FINDABILITY §4) — archive
  // stories enrich the page body but do not widen sitemap indexability yet.
  return itemsForPillar(ctx, pillarId).length >= PILLAR_INDEX_MIN;
}

/** Pillars that clear the substance gate, busiest first (directory hubs). */
export function indexablePillars(ctx) {
  return brand.PILLARS
    .map((p) => {
      const live = itemsForPillar(ctx, p.id).length;
      const st = pillarState(ctx, p.id);
      return {
        id: p.id,
        name: p.name,
        live,
        archived: 0,
        count: live,
        score: st && Number.isFinite(st.score) ? st.score : null,
        dark: !!(st && st.dark),
      };
    })
    .filter((p) => p.count >= PILLAR_INDEX_MIN)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function scoreCell(it) {
  if (!(Number.isFinite(it.score))) return '<span class="fc__sc mute">—</span>';
  return `<span class="fc__sc num">${esc(num(it.score, 1))}</span>`;
}

function itemRows(ctx, items, limit = 40) {
  return items.slice(0, limit).map((it) => `<li>
  <a href="${esc(ctx.href(`/item/${slugFor(it)}.html`))}">${esc(it.title)}</a>
  <span class="fc__meta">${esc(String(it.source || '').toUpperCase())}
    · <time datetime="${esc(it.published_at || '')}">${esc(utc(it.published_at))}</time></span>
  ${scoreCell(it)}
</li>`).join('');
}

const STYLE = `<style>
.fc{max-width:78ch}
.fc__k{font:600 var(--t-xs)/1.3 var(--mono);color:var(--ink-faint);letter-spacing:.04em;text-transform:uppercase}
.fc__lede{font:400 var(--t-base)/1.55 var(--sans);color:var(--ink-dim);max-width:62ch}
.fc__stat{display:flex;flex-wrap:wrap;gap:14px 22px;margin:18px 0;padding:14px 0;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)}
.fc__stat b{font:700 var(--t-xl)/1 var(--mono);color:var(--ink)}
.fc__stat span{display:block;font:500 var(--t-xs)/1.3 var(--mono);color:var(--ink-faint);margin-top:4px}
.fc__list{list-style:none;padding:0;margin:16px 0 0;display:grid;gap:10px}
.fc__list li{display:grid;grid-template-columns:1fr auto;gap:4px 12px;padding:10px 0;border-bottom:1px solid var(--rule)}
.fc__list a{grid-column:1;color:var(--ink);font:600 var(--t-base)/1.35 var(--sans);text-decoration:none}
.fc__list a:hover{text-decoration:underline}
.fc__meta{grid-column:1;font:400 var(--t-xs)/1.3 var(--mono);color:var(--ink-faint)}
.fc__sc{grid-column:2;grid-row:1/span 2;align-self:center;font:700 var(--t-lg)/1 var(--mono)}
.fc__sc.mute{color:var(--ink-faint);font-weight:500}
.fc__labs,.fc__pillars{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 0}
.fc__labs a,.fc__pillars a{font:600 var(--t-sm)/1.3 var(--sans);padding:6px 10px;border:1px solid var(--rule);border-radius:6px;color:var(--ink);text-decoration:none}
.fc__labs a:hover,.fc__pillars a:hover{background:var(--bg-sunken)}
</style>`;

export function renderPillar(ctx, pillarId) {
  const meta = brand.pillarMeta(pillarId);
  const items = itemsForPillar(ctx, pillarId);
  const archivedAll = archiveItemsForPillar(ctx, pillarId);
  const older = archivedAll.slice(0, 12);
  const st = pillarState(ctx, pillarId);
  // Live-window gate only while deploy-pending (FINDABILITY §4) — do not
  // widen indexability via archive counts until the live sitemap leads.
  const indexable = items.length >= PILLAR_INDEX_MIN;
  const path = pillarPath(pillarId);
  const scoreTxt = st && Number.isFinite(st.score) ? num(st.score, 1) : null;
  const status = st && st.dark ? 'dark this hour'
    : (scoreTxt != null ? `${scoreTxt} of 100 this hour` : 'awaiting a baseline');
  // Head-term title: people search “{pillar} AI activity” / pillar doom score.
  const title = `What has ${brand.NAME} scored under ${meta.name}? AI activity, not a pillar score`;
  const description = clip(
    `${brand.NAME} ${meta.name} pillar: ${status}. ${meta.description} ${items.length} scored stories in the current newsroom window.`,
    160,
  );
  // Tip #287: section H2s are question-shaped and mirrored in FAQ (§3.3).
  const windowQ = `Which scored stories are under ${meta.name} in this window?`;
  const olderQ = `Which older scored stories are under ${meta.name}?`;
  const othersQ = 'Which other pillars have scored stories?';
  const peerPillars = brand.PILLARS.filter((p) => p.id !== pillarId);
  const otherPillars = peerPillars
    .map((p) => `<a href="${esc(ctx.href(pillarPath(p.id)))}">What has ${esc(brand.NAME)} scored under ${esc(p.name)}?</a>`)
    .join('');
  const faq = [
    [`What has ${brand.NAME} scored under ${meta.name}?`,
      `${items.length} scored stories under the ${meta.name} pillar in the live window${archivedAll.length ? ` (${archivedAll.length} older in the archive)` : ''}. ${meta.description} Current reading: ${status}.`],
    [windowQ,
      items.length
        ? `${items.length} scored ${items.length === 1 ? 'story' : 'stories'} under ${meta.name} in the current window. A pillar filter on the newsroom — not a pillar doom score.`
        : 'No scored stories in the current window for this pillar. The page stays up so the pillar reading remains addressable; it is not submitted to the sitemap while empty.'],
    ...(older.length
      ? [[olderQ,
        'Kept in the permanent archive after they left the live window. Still scored stories — not a forecast.']]
      : []),
    ...(peerPillars.length
      ? [[othersQ,
        `The other ${brand.NAME} pillars, each linking What has ${brand.NAME} scored under that pillar?`]]
      : []),
    [`Does ${brand.NAME} publish a ${meta.name} doom score?`,
      `No. ${brand.DISCLAIMER_SHORT} A pillar page lists scored stories and the live tempo reading against this index’s frozen reference.`],
  ];
  const faqHtml = faq.map(([q, a]) => `
  <h3>${esc(q)}</h3>
  <p>${esc(a)}</p>`).join('');
  const olderBlock = older.length
    ? `<h2 id="older">${esc(olderQ)}</h2>
  <p class="fc__lede">Kept in the permanent archive after they left the live window. Still scored stories — not a forecast.</p>
  <ol class="fc__list">${itemRows(ctx, older, 12)}</ol>
  <p class="fresh__key"><a href="${esc(ctx.href('/item/archive.html'))}">Which older AI stories has ${esc(brand.NAME)} kept in the archive?</a></p>`
    : '';

  const main = `${STYLE}
<article class="fc prose">
  <p class="fc__k"><a href="${esc(ctx.href('/news.html'))}">Which AI stories has ${esc(brand.NAME)} scored in this window?</a> · <a href="${esc(ctx.href('/pillar/'))}">Which AI activity pillars have ${esc(brand.NAME)} pages?</a> · <a href="${esc(ctx.href('/pillars.html'))}">Which AI activity pillars has ${esc(brand.NAME)} scored?</a></p>
  <h1>What has ${esc(brand.NAME)} scored under ${esc(meta.name)}?</h1>
  <p class="fc__lede">${esc(meta.description)}</p>
  <div class="fc__stat" role="group" aria-label="Current pillar reading">
    <div><b class="num">${esc(scoreTxt != null ? scoreTxt : '—')}</b><span>Pillar score / 100</span></div>
    <div><b class="num">${esc(String(items.length))}</b><span>Scored stories in window</span></div>
    ${archivedAll.length ? `<div><b class="num">${esc(String(archivedAll.length))}</b><span>Older in archive</span></div>` : ''}
    <div><b>${esc(st && st.dark ? 'DARK' : (st && st.uncalibrated ? 'CALIBRATING' : 'LIVE'))}</b><span>Source posture</span></div>
  </div>
  <p class="fresh__key">This page is the crawlable face of the ${esc(meta.name)} filter on the newsroom.
     The composite ${esc(brand.NAME)} reading still lives on <a href="${esc(ctx.href('/'))}">AI activity index today · ${esc(brand.NAME)}</a>;
     the method is on <a href="${esc(ctx.href('/methodology.html'))}">How the ${esc(brand.NAME)} AI activity index is computed · methodology</a>.</p>
  <h2 id="window">${esc(windowQ)}</h2>
  ${items.length
    ? `<ol class="fc__list">${itemRows(ctx, items)}</ol>
       ${items.length > 40 ? `<p class="fresh__key">${esc(String(items.length - 40))} more in the window — see <a href="${esc(ctx.href('/item/'))}">Which scored AI stories are in the ${esc(brand.NAME)} live window?</a>.</p>` : ''}`
    : `<p>No scored stories in the current window for this pillar. The page stays up so the pillar reading remains addressable; it is not submitted to the sitemap while empty.</p>`}
  ${olderBlock}
  <h2 id="faq">What questions do people actually ask?</h2>
  ${faqHtml}
  ${peerPillars.length ? `<h2 id="other-pillars">${esc(othersQ)}</h2>
  <nav class="fc__pillars" aria-label="SIREN pillars">${otherPillars}</nav>` : ''}
  <p class="fresh__key">Search-shaped directory: <a href="${esc(ctx.href('/pillars.html'))}">Which AI activity pillars has ${esc(brand.NAME)} scored?</a>.</p>
</article>`;

  return page({
    ctx,
    path,
    title,
    description,
    noindex: !indexable,
    jsonld: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      url: ctx.url(path),
      description,
      isPartOf: { '@type': 'WebSite', name: brand.PUBLICATION, url: ctx.url('/') },
      about: {
        '@type': 'Dataset',
        name: `${brand.NAME} ${meta.name} pillar`,
        description: meta.description,
        creator: { '@type': 'Organization', name: brand.PUBLICATION, url: ctx.url('/') },
      },
      speakable: speakable(['h1', '.fc__lede']),
      mainEntity: storyItemListEntity(ctx, items, older),
    }, breadcrumbs(ctx, [
      { name: `Which AI stories has ${brand.NAME} scored in this window?`, path: '/news.html' },
      { name: `Which AI activity pillars have ${brand.NAME} pages?`, path: '/pillar/' },
      { name: `What has ${brand.NAME} scored under ${meta.name}?`, path },
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

/** Race players become /lab/<id>.html landings (DoomBench /companies analogue). */
export function labsFromRace(ctx) {
  const players = (ctx.race && Array.isArray(ctx.race.players)) ? ctx.race.players : [];
  return players.filter((p) => p && p.id && p.name);
}

/**
 * Labs from the published entity list that are not already on the race board.
 * Microsoft / NVIDIA / Amazon and peers often dominate the newsroom without a
 * Polymarket row — these pages close that DoomBench /companies gap.
 */
export function labsFromEntities(ctx) {
  const raceIds = new Set(labsFromRace(ctx).map((p) => p.id));
  const out = [];
  for (const ent of publishedEntities().filter((e) => e.kind === 'lab')) {
    const raceId = ENTITY_LAB_RACE_ID[ent.name];
    if (raceId && raceIds.has(raceId)) continue;
    const id = raceId || entitySlug(ent.name);
    if (raceIds.has(id)) continue;
    const player = { id, name: ent.name, entityName: ent.name, entityOnly: true };
    if (itemsForLab(ctx, player).length < ENTITY_LAB_MIN) continue;
    out.push(player);
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/** Race labs plus entity-only labs that clear the substance gate. */
export function allLabs(ctx) {
  const seen = new Set();
  const out = [];
  for (const player of [...labsFromRace(ctx), ...labsFromEntities(ctx)]) {
    if (!player || !player.id || seen.has(player.id)) continue;
    seen.add(player.id);
    out.push(player);
  }
  return out;
}

function labNeedles(player) {
  const names = [player.name, player.id, player.entityName, ...(player.aliases || [])]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());
  // Common short forms the newsroom titles use.
  const extras = {
    openai: ['openai', 'gpt', 'chatgpt', 'sam altman'],
    anthropic: ['anthropic', 'claude', 'amodei'],
    'google-deepmind': ['deepmind', 'gemini', 'google deepmind', 'demis'],
    meta: ['meta ai', 'llama', 'fair', 'zuckerberg'],
    xai: ['xai', 'grok', 'x.ai'],
    deepseek: ['deepseek'],
    mistral: ['mistral'],
    qwen: ['qwen', 'alibaba'],
    microsoft: ['microsoft', 'msft', 'azure openai'],
    nvidia: ['nvidia', 'nvda'],
    amazon: ['amazon', 'aws', 'bedrock'],
    'hugging-face': ['hugging face', 'huggingface'],
    bytedance: ['bytedance', 'seed-oss'],
  };
  return [...new Set([...(extras[player.id] || []), ...names])];
}

function escapeLabRe(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** True when a scored story names this lab (entity list or word-bound needles). */
export function itemMatchesLab(it, player) {
  if (!it || !player) return false;
  const entityName = player.entityName || player.name;
  if (Array.isArray(it.entities) && it.entities.includes(entityName)) return true;
  const needles = labNeedles(player);
  const hay = `${it.title || ''} ${it.source || ''} ${it.summary || ''}`;
  // Word-ish boundaries so short forms (AMD, Intel) do not match inside
  // "demand" / "intelligent".
  return needles.some((n) => {
    if (!n || n.length < 3) return false;
    const re = new RegExp(`(?:^|[^A-Za-z0-9])${escapeLabRe(n)}(?:[^A-Za-z0-9]|$)`, 'i');
    return re.test(hay);
  });
}

export function itemsForLab(ctx, player) {
  const items = (ctx.news && Array.isArray(ctx.news.items)) ? ctx.news.items : [];
  return items
    .filter((it) => itemMatchesLab(it, player))
    .slice()
    .sort((a, b) => String(b.published_at || '').localeCompare(String(a.published_at || '')));
}

/** Older scored stories naming this lab, kept in the durable item archive. */
export function archiveItemsForLab(ctx, player) {
  const archived = Array.isArray(ctx.itemArchive) ? ctx.itemArchive : [];
  return archived
    .filter((it) => itemMatchesLab(it, player))
    .slice()
    .sort((a, b) => String(b.published_at || '').localeCompare(String(a.published_at || '')));
}

export function labIndexable(ctx, player) {
  // A live race row is substance even with sparse news hits; require either
  // market odds or enough news so we never sitemap a name-only shell.
  // Entity-only labs have no odds — they need ENTITY_LAB_MIN live stories
  // (archive enriches the page; deploy-pending keeps the gate live-only).
  if (player && player.entityOnly) {
    return itemsForLab(ctx, player).length >= ENTITY_LAB_MIN;
  }
  const m = player.market || {};
  const hasOdds = Number.isFinite(m.probability);
  return hasOdds || itemsForLab(ctx, player).length >= LAB_NEWS_MIN;
}

/** Indexable labs with story counts for directory hubs (/lab/, /companies.html). */
export function indexableLabs(ctx) {
  return allLabs(ctx)
    .filter((p) => labIndexable(ctx, p))
    .map((p) => ({ ...p, count: itemsForLab(ctx, p).length }))
    .sort((a, b) => (b.count - a.count) || a.name.localeCompare(b.name));
}

function fmtPct(p) {
  return Number.isFinite(p) ? `${(p * 100).toFixed(1)}%` : '—';
}

export function renderLab(ctx, player) {
  const path = labPath(player.id);
  const items = itemsForLab(ctx, player);
  const archivedAll = archiveItemsForLab(ctx, player);
  const older = archivedAll.slice(0, 12);
  // Live-window / race-row gate only while deploy-pending — no archive widen.
  const indexable = labIndexable(ctx, player);
  const m = player.market || {};
  const entityOnly = Boolean(player.entityOnly);
  // FINDABILITY #121 — include product head-term aliases (Gemini) in the
  // about-line when people type the product name, not only the lab legal name.
  const about = labAboutLabel(player);
  // Head-term title: people search “{lab} AI stories” / company doom score.
  const title = entityOnly
    ? `What has ${brand.NAME} scored about ${about}? AI stories, not a company score`
    : `What has ${brand.NAME} scored about ${about}? AI stories & market odds`;
  const description = clip(
    entityOnly
      ? `${about} on ${brand.NAME}: ${items.length} related scored stories in the current window. No prediction-market row for this lab — story counts only.`
      : `${about} on ${brand.NAME}: live prediction-market odds ${fmtPct(m.probability)}, shipping and mindshare when reported, plus ${items.length} related scored stories.`,
    160,
  );
  // Tip #286: section H2s are question-shaped and mirrored in FAQ (§3.3).
  const windowQ = `Which related scored stories name ${about} in this window?`;
  const olderQ = `Which older scored stories name ${about}?`;
  const othersQ = 'Which other labs have scored stories?';
  const peerLabs = allLabs(ctx).filter((p) => p.id !== player.id);
  const labs = peerLabs
    .map((p) => `<a href="${esc(ctx.href(labPath(p.id)))}">What has ${esc(brand.NAME)} scored about ${esc(labAboutLabel(p))}?</a>`)
    .join('');
  const faq = [
    [`What has ${brand.NAME} scored about ${about}?`,
      entityOnly
        ? `${items.length} scored stories name ${about} on ${brand.NAME} in the live window${archivedAll.length ? ` (${archivedAll.length} older in the archive)` : ''}. Story counts only — this page does not invent market odds.`
        : `${about} on ${brand.NAME}: live prediction-market odds ${fmtPct(m.probability)} when published, plus ${items.length} related scored stories in the live window${archivedAll.length ? ` and ${archivedAll.length} older in the archive` : ''}.`],
    [windowQ,
      items.length
        ? `${items.length} scored ${items.length === 1 ? 'story names' : 'stories name'} ${about} in the current window. Story counts only — not a company doom score.`
        : `No scored story in the current window names ${about}.${entityOnly ? '' : ' The race row above is still the addressable unit.'}`],
    ...(older.length
      ? [[olderQ,
        'Kept in the permanent archive after they left the live window. Still scored stories — not a forecast.']]
      : []),
    ...(peerLabs.length
      ? [[othersQ,
        `Other labs that clear the substance gate, each linking What has ${brand.NAME} scored about that lab?`]]
      : []),
    [`Does ${brand.NAME} publish a ${about} doom score?`,
      `No. ${brand.DISCLAIMER_SHORT} Numbers here are story counts${entityOnly ? '' : ' and, where published, prediction-market prices'} — not a ranking of how dangerous a company is.`],
  ];
  // FINDABILITY #151 — residual “micron stock” / MU / DRAM Trends queries need
  // a crawlable FAQ on the gated lab (not a new doorway URL).
  if (player.id === 'micron') {
    faq.push([
      `Why does ${brand.NAME} watch Micron stock, MU, and DRAM stock in Google Search Trends?`,
      `${brand.NAME} watches Google’s daily trending RSS for findability. When Micron, MU stock, DRAM stock, or HBM stock spikes with AI memory-chip headlines, this lab page is the crawlable answer — story counts only, not investment advice or a doom score. The live watchlist is on ${ctx.url('/search-trends.html')}.`,
    ]);
  }
  // FINDABILITY #155/#288 — “coreweave stock” / CRWV / AI neocloud debt Trends → gated lab.
  if (player.id === 'coreweave') {
    faq.push([
      `Why does ${brand.NAME} watch CoreWeave stock and CRWV in Google Search Trends?`,
      `${brand.NAME} watches Google’s daily trending RSS for findability. When CoreWeave, CRWV stock, or AI neocloud / GPU-cloud debt headlines spike, this lab page is the crawlable answer — story counts only, not investment advice or a doom score. The live watchlist is on ${ctx.url('/search-trends.html')}.`,
    ]);
    // FINDABILITY #160 — selloff tape asks about debt / bond yields, not only “stock”.
    faq.push([
      `Why does ${brand.NAME} watch CoreWeave debt and bond yields in Google Search Trends?`,
      `${brand.NAME} watches Google’s daily trending RSS for findability. When CoreWeave debt, bond yields, or borrowing-cost headlines spike with AI infrastructure selloffs, this lab page is the crawlable answer — scored story counts only, not credit analysis, not investment advice, and not a doom score. Category neocloud Trends route to ${ctx.url('/tags/neoclouds.html')}. The live watchlist is on ${ctx.url('/search-trends.html')}.`,
    ]);
  }
  // FINDABILITY #161 — “nvidia stock” / NVDA / AI funding-cost Trends → gated lab.
  if (player.id === 'nvidia') {
    faq.push([
      `Why does ${brand.NAME} watch Nvidia stock and NVDA in Google Search Trends?`,
      `${brand.NAME} watches Google’s daily trending RSS for findability. When Nvidia, NVDA stock, or AI GPU funding-cost headlines spike (including CoreWeave / neocloud co-moves), this lab page is the crawlable answer — story counts only, not investment advice or a doom score. The live watchlist is on ${ctx.url('/search-trends.html')}.`,
    ]);
  }
  // FINDABILITY #162 — OpenAI lawsuit / FTC / state-suit tape → gated ChatGPT lab.
  if (player.id === 'openai') {
    faq.push([
      `Why does ${brand.NAME} watch OpenAI lawsuits and FTC probes?`,
      `${brand.NAME} scores press that names OpenAI / ChatGPT. When state lawsuits, FTC probes, or ChatGPT safety suits dominate the tape (or spike in Google Search Trends), this lab page is the crawlable answer — scored story counts and, when published, market odds only. Not legal advice, not a case forecast, and not a doom score. The live watchlist is on ${ctx.url('/search-trends.html')}.`,
    ]);
    // FINDABILITY #181 — OpenAI / ChatGPT outage / status / degradation tape → gated lab.
    faq.push([
      `Why does ${brand.NAME} watch OpenAI and ChatGPT outages?`,
      `${brand.NAME} scores press that names OpenAI / ChatGPT. When OpenAI status, ChatGPT outage, feature degradation, or limited-availability headlines dominate the tape — or spike in Google Search Trends — this lab page is the crawlable answer — scored story counts and, when published, market odds only. Not a model review, not an uptime SLA, and not a doom score. Live incident boards also sit on ${ctx.url('/status.html')}. The live watchlist is on ${ctx.url('/search-trends.html')}.`,
    ]);
    // FINDABILITY #191 — ChatGPT computer use / Chrome tab-controls tape → gated lab.
    faq.push([
      `Why does ${brand.NAME} watch ChatGPT computer use and Chrome tabs?`,
      `${brand.NAME} scores press that names OpenAI / ChatGPT. When ChatGPT computer use, Chrome tab controls, or browser-agent headlines dominate the tape — or spike in Google Search Trends — this lab page is the crawlable answer — scored story counts and, when published, market odds only. Not a product review, not a privacy verdict, and not a doom score. The live watchlist is on ${ctx.url('/search-trends.html')}.`,
    ]);
  }
  // FINDABILITY #163 — Anthropic IPO / FTC probe tape → gated Claude lab.
  if (player.id === 'anthropic') {
    faq.push([
      `Why does ${brand.NAME} watch Anthropic IPO and FTC probes?`,
      `${brand.NAME} scores press that names Anthropic / Claude. When IPO headlines, FTC probes, or safety subpoenas dominate the tape (or spike in Google Search Trends), this lab page is the crawlable answer — scored story counts and, when published, market odds only. Not IPO advice, not legal advice, and not a doom score. The live watchlist is on ${ctx.url('/search-trends.html')}.`,
    ]);
    // FINDABILITY #362 — AI safety bill legislative tape → same gated lab
    // (story counts only; not legal advice or a doom score). Parallel to #191
    // ChatGPT Chrome FAQ sharing /lab/openai.html with lawsuit / outage FAQs.
    faq.push([
      `Why does ${brand.NAME} watch Anthropic AI safety bill pitches?`,
      `${brand.NAME} scores press that names Anthropic / Claude. When AI safety bill drafts, Capitol Hill pitches, or frontier-model regulation headlines dominate the tape (or spike in Google Search Trends), this lab page is the crawlable answer — scored story counts and, when published, market odds only. Not legal advice, not lobbying analysis, and not a doom score. The live watchlist is on ${ctx.url('/search-trends.html')}.`,
    ]);
    // FINDABILITY #368 — Anthropic Canadian / Nova Scotia data-centre tape →
    // same gated lab (story counts only; not a site forecast). Parallel to
    // Oracle datacenters FAQ #178 on /tags/datacenters.html.
    faq.push([
      `Why does ${brand.NAME} watch Anthropic Canadian data centres?`,
      `${brand.NAME} scores press that names Anthropic / Claude. When Canadian data-centre leases, Nova Scotia / EverWind campus headlines, or Claude-power infrastructure stories dominate the tape (or spike in Google Search Trends), this lab page is the crawlable answer — scored story counts and, when published, market odds only. Not a construction forecast, not a power-deal tip, and not a doom score. The live watchlist is on ${ctx.url('/search-trends.html')}.`,
    ]);
    // FINDABILITY #392 — Anthropic / METR evaluator-access tape → same gated
    // lab (story counts only; not an audit verdict). Parallel to Canadian DC
    // FAQ #368 / AI safety bill FAQ #362 on this lab.
    faq.push([
      `Why does ${brand.NAME} watch Anthropic METR evaluator access?`,
      `${brand.NAME} scores press that names Anthropic / Claude. When METR employee-like access, outside-evaluator monitoring, or Claude safety-audit headlines dominate the tape (or spike in Google Search Trends), this lab page is the crawlable answer — scored story counts and, when published, market odds only. Not an audit verdict, not a model review, and not a doom score. The live watchlist is on ${ctx.url('/search-trends.html')}.`,
    ]);
    // FINDABILITY #397 — Anthropic / Claude ECDSA + NIST curve-seed tape → same
    // gated lab (story counts only; not a crypto audit). Parallel to METR FAQ
    // #392 on this lab; do not keyword NSA niche.
    faq.push([
      `Why does ${brand.NAME} watch Anthropic ECDSA curve seeds?`,
      `${brand.NAME} scores press that names Anthropic / Claude. When ECDSA curve-seed reconstructions, NIST elliptic-curve origin headlines, or Claude crypto-history stories dominate the tape (or spike in Google Search Trends), this lab page is the crawlable answer — scored story counts and, when published, market odds only. Not a cryptography audit, not a backdoor verdict, and not a doom score. The live watchlist is on ${ctx.url('/search-trends.html')}.`,
    ]);
    // FINDABILITY #402 — Claude Opus 5.5 / Opus 5.5 product tape → same gated
    // lab (story counts only; not a model review). Keywords already ship;
    // FAQ #163/#362/#368/#392/#397 left the Opus SKU without a crawlable Q&A.
    faq.push([
      `Why does ${brand.NAME} watch Claude Opus 5.5?`,
      `${brand.NAME} scores press that names Anthropic / Claude. When Claude Opus 5.5, Opus 5.5 release, or Claude Opus fast-mode headlines dominate the tape (or spike in Google Search Trends), this lab page is the crawlable answer — scored story counts and, when published, market odds only. Not a model review, not a leaderboard verdict, and not a doom score. The live watchlist is on ${ctx.url('/search-trends.html')}.`,
    ]);
    // FINDABILITY #408 — Blackstone / Anthropic chip-financing tape → same gated
    // lab (story counts only; not deal advice). Keywords already ship (#382);
    // FAQ #163/#362/#368/#392/#397/#402 left the PE surface without a crawlable
    // Q&A — parallel to SoftBank Allied #374 / Ondas-Palantir #406.
    faq.push([
      `Why does ${brand.NAME} watch Blackstone Anthropic financing?`,
      `${brand.NAME} scores press that names Anthropic / Claude. When Blackstone Anthropic chip financing, Blackstone debt / yield packages for Anthropic GPUs, or Blackstone PE AI-infrastructure headlines dominate the tape (or spike in Google Search Trends), this lab page is the crawlable answer — scored story counts and, when published, market odds only. Not deal advice, not a stock tip, not credit analysis, and not a doom score. The live watchlist is on ${ctx.url('/search-trends.html')}.`,
    ]);
    // FINDABILITY #412 — Replit / Anthropic / OpenAI model-hosting switch tape →
    // same gated lab (story counts only; not vendor advice). Keywords already
    // ship (#340); FAQ #163/#362/#368/#392/#397/#402/#408 left the Replit
    // surface without a crawlable Q&A — parallel to SoftBank Allied #374 /
    // Blackstone #408 (no /lab/replit.html doorway).
    faq.push([
      `Why does ${brand.NAME} watch Replit Anthropic model switches?`,
      `${brand.NAME} scores press that names Anthropic / Claude. When Replit drops Anthropic for OpenAI, Replit Anthropic partnership endings, or Replit Claude / ChatGPT model-hosting switches dominate the tape (or spike in Google Search Trends), this lab page is the crawlable answer — scored story counts and, when published, market odds only. Not vendor advice, not a product review, not a stock tip, and not a doom score. The live watchlist is on ${ctx.url('/search-trends.html')}.`,
    ]);
  }
  // FINDABILITY #164 — ASML / EUV AI-chip-tool Trends → gated lab.
  if (player.id === 'asml') {
    faq.push([
      `Why does ${brand.NAME} watch ASML in Google Search Trends?`,
      `${brand.NAME} watches Google’s daily trending RSS for findability. When ASML, ASML stock, or EUV / AI chipmaking-tool headlines spike with semiconductor demand for the AI build-out, this lab page is the crawlable answer — story counts only, not investment advice or a doom score. The live watchlist is on ${ctx.url('/search-trends.html')}.`,
    ]);
  }
  // FINDABILITY #165 — TSMC / AI foundry / advanced-node Trends → gated lab.
  if (player.id === 'tsmc') {
    faq.push([
      `Why does ${brand.NAME} watch TSMC in Google Search Trends?`,
      `${brand.NAME} watches Google’s daily trending RSS for findability. When TSMC, TSMC stock, or AI foundry / advanced-node chip headlines spike with semiconductor demand for the AI build-out, this lab page is the crawlable answer — story counts only, not investment advice or a doom score. The live watchlist is on ${ctx.url('/search-trends.html')}.`,
    ]);
  }
  // FINDABILITY #167 — Amazon Bee / wearable ambient-AI Trends → gated lab.
  if (player.id === 'amazon') {
    faq.push([
      `Why does ${brand.NAME} watch Amazon Bee and AI wearables?`,
      `${brand.NAME} scores press that names Amazon. When Bee Frontier / Bee Eclipse wearables, ambient listening devices, or personal-AI hardware headlines dominate the tape (or spike in Google Search Trends), this lab page is the crawlable answer — scored story counts only. Not a product review, not a stock tip, and not a doom score. The live watchlist is on ${ctx.url('/search-trends.html')}.`,
    ]);
  }
  // FINDABILITY #169 — Meta Muse / Muse Spark / Muse Wonder open-weight tape → gated lab.
  if (player.id === 'meta') {
    faq.push([
      `Why does ${brand.NAME} watch Meta Muse and open-weight AI?`,
      `${brand.NAME} scores press that names Meta AI. When Muse Spark, Muse Wonder, or Meta open-weight / Mac AI partnership headlines dominate the tape (or spike in Google Search Trends), this lab page is the crawlable answer — scored story counts and, when published, market odds only. Not a model review, not a stock tip, and not a doom score. The live watchlist is on ${ctx.url('/search-trends.html')}.`,
    ]);
    // FINDABILITY #193 — Meta + Apple Mac AI / Muse-on-Mac partnership tape → gated lab.
    faq.push([
      `Why does ${brand.NAME} watch Meta and Apple Mac AI partnerships?`,
      `${brand.NAME} scores press that names Meta AI. When Meta and Apple team up to run Muse / open-weight models on Mac Studio (or those headlines spike in Google Search Trends), this lab page is the crawlable answer — scored story counts and, when published, market odds only. Not a product review, not a stock tip, and not a doom score. Apple on-device AI without Meta still routes to ${ctx.url('/lab/apple.html')}. The live watchlist is on ${ctx.url('/search-trends.html')}.`,
    ]);
  }
  // FINDABILITY #170 — Apple Intelligence / on-device AI / China launch tape → gated lab.
  if (player.id === 'apple') {
    faq.push([
      `Why does ${brand.NAME} watch Apple Intelligence?`,
      `${brand.NAME} scores press that names Apple. When Apple Intelligence, on-device Apple AI, or China approval / Alibaba partnership headlines dominate the tape (or spike in Google Search Trends), this lab page is the crawlable answer — scored story counts only. Not a product review, not a stock tip, and not a doom score. The live watchlist is on ${ctx.url('/search-trends.html')}.`,
    ]);
  }
  // FINDABILITY #171 — Microsoft Copilot / Azure AI / M365 Copilot tape → gated lab.
  if (player.id === 'microsoft') {
    faq.push([
      `Why does ${brand.NAME} watch Microsoft Copilot?`,
      `${brand.NAME} scores press that names Microsoft. When Copilot, Microsoft 365 Copilot, GitHub Copilot, or Azure AI headlines dominate the tape (or spike in Google Search Trends), this lab page is the crawlable answer — scored story counts only. Not a product review, not a stock tip, and not a doom score. The live watchlist is on ${ctx.url('/search-trends.html')}.`,
    ]);
    // FINDABILITY #220 — Microsoft MAI-Base / MAI-Base-2 MoE tape → same gated lab.
    faq.push([
      `Why does ${brand.NAME} watch Microsoft MAI-Base?`,
      `${brand.NAME} scores press that names Microsoft. When MAI-Base, MAI-Base-2, or Microsoft in-house MoE model headlines dominate the tape — often beside Copilot / Azure AI coverage — this lab page is the crawlable answer — scored story counts only. Not a model review, not a stock tip, and not a doom score. The live watchlist is on ${ctx.url('/search-trends.html')}.`,
    ]);
  }
  // FINDABILITY #173 — xAI / Grok / Grok Voice tape → gated lab.
  if (player.id === 'xai') {
    faq.push([
      `Why does ${brand.NAME} watch Grok and xAI?`,
      `${brand.NAME} scores press that names xAI. When Grok, Grok Voice, or xAI model / API headlines dominate the tape (or spike in Google Search Trends), this lab page is the crawlable answer — scored story counts and, when published, market odds only. Not a model review, not a stock tip, and not a doom score. The live watchlist is on ${ctx.url('/search-trends.html')}.`,
    ]);
  }
  // FINDABILITY #174/#187 — Gemini / Gemma / Gemini 4 Argon tape → gated DeepMind lab.
  if (player.id === 'google-deepmind') {
    faq.push([
      `Why does ${brand.NAME} watch Gemini, Gemma, and Argon?`,
      `${brand.NAME} scores press that names Google DeepMind. When Gemini, Gemini 4 Argon, Gemma, or Gemma open-model headlines dominate the tape (or spike in Google Search Trends), this lab page is the crawlable answer — scored story counts and, when published, market odds only. Not a model review, not a stock tip, and not a doom score. The live watchlist is on ${ctx.url('/search-trends.html')}.`,
    ]);
  }
  // FINDABILITY #175 — Samsung / HBM / AI memory-chip tape → gated lab.
  if (player.id === 'samsung') {
    faq.push([
      `Why does ${brand.NAME} watch Samsung and AI memory chips?`,
      `${brand.NAME} scores press that names Samsung. When Samsung HBM, AI memory-chip, or Samsung stock headlines dominate the tape — often co-moving with SK Hynix selloff / foundry coverage — or spike in Google Search Trends, this lab page is the crawlable answer — scored story counts only. Not a stock tip, not a chip review, and not a doom score. The live watchlist is on ${ctx.url('/search-trends.html')}.`,
    ]);
    // FINDABILITY #195 — Samsung AI glasses / XR wearable tape → same gated lab.
    faq.push([
      `Why does ${brand.NAME} watch Samsung AI glasses?`,
      `${brand.NAME} scores press that names Samsung. When Samsung AI glasses, Galaxy glasses, or Samsung XR / smart-glasses headlines dominate the tape — often co-moving with Meta Ray-Ban / wearable AI coverage — or spike in Google Search Trends, this lab page is the crawlable answer — scored story counts only. Not a product review, not a stock tip, and not a doom score. The live watchlist is on ${ctx.url('/search-trends.html')}.`,
    ]);
  }
  // FINDABILITY #177 — Alibaba Qwen / Tongyi open-weight tape → gated lab.
  if (player.id === 'qwen') {
    faq.push([
      `Why does ${brand.NAME} watch Qwen and Alibaba open models?`,
      `${brand.NAME} scores press that names Alibaba Qwen. When Qwen, Tongyi, or Alibaba open-weight model headlines dominate the tape — including Muse Spark / open-weight race co-moves — or spike in Google Search Trends, this lab page is the crawlable answer — scored story counts and, when published, market odds only. Not a model review, not a stock tip, and not a doom score. The live watchlist is on ${ctx.url('/search-trends.html')}.`,
    ]);
  }
  // FINDABILITY #179 — DeepSeek outage / Chinese open-model tape → gated lab.
  if (player.id === 'deepseek') {
    faq.push([
      `Why does ${brand.NAME} watch DeepSeek and AI outages?`,
      `${brand.NAME} scores press that names DeepSeek. When DeepSeek outage, refund, or Chinese open-model headlines dominate the tape — or spike in Google Search Trends — this lab page is the crawlable answer — scored story counts and, when published, market odds only. Not a model review, not an uptime SLA, and not a doom score. The live watchlist is on ${ctx.url('/search-trends.html')}.`,
    ]);
  }
  // FINDABILITY #180 — Mistral Timestral / CERN Flare tape → gated lab.
  if (player.id === 'mistral') {
    faq.push([
      `Why does ${brand.NAME} watch Mistral and Timestral?`,
      `${brand.NAME} scores press that names Mistral. When Timestral, CERN Flare, or Mistral open-model headlines dominate the tape — or spike in Google Search Trends — this lab page is the crawlable answer — scored story counts and, when published, market odds only. Not a model review, not a stock tip, and not a doom score. The live watchlist is on ${ctx.url('/search-trends.html')}.`,
    ]);
  }
  // FINDABILITY #183 — Palantir / AIP / government AI tape → gated lab.
  if (player.id === 'palantir') {
    faq.push([
      `Why does ${brand.NAME} watch Palantir and government AI?`,
      `${brand.NAME} scores press that names Palantir. When Palantir AIP, Gotham, Foundry, defense / government AI contracts, or surveillance-software headlines dominate the tape — or spike in Google Search Trends — this lab page is the crawlable answer — scored story counts only. Not a stock tip, not a product review, not legal advice, and not a doom score. The live watchlist is on ${ctx.url('/search-trends.html')}.`,
    ]);
    // FINDABILITY #406 — Ondas–Palantir defense-AI JV tape → same gated lab
    // (story counts only; not deal advice). Keywords already ship (#404);
    // FAQ #183 left the Ondas partner surface without a crawlable Q&A —
    // parallel to SoftBank Allied #374 / Claude Opus 5.5 #402.
    faq.push([
      `Why does ${brand.NAME} watch Ondas-Palantir AI?`,
      `${brand.NAME} scores press that names Palantir. When Ondas-Palantir joint AI, Ondas defense-AI JV, or Ondas drone / autonomy headlines dominate the tape (or spike in Google Search Trends), this lab page is the crawlable answer — scored story counts only. Not deal advice, not a stock tip, not a product review, and not a doom score. The live watchlist is on ${ctx.url('/search-trends.html')}.`,
    ]);
  }
  // FINDABILITY #184 — AMD / MI300 / Instinct AI-GPU tape → gated lab.
  if (player.id === 'amd') {
    faq.push([
      `Why does ${brand.NAME} watch AMD and AI GPUs?`,
      `${brand.NAME} scores press that names AMD. When MI300, Instinct, AMD stock, or AI GPU / accelerator headlines dominate the tape — or spike in Google Search Trends — this lab page is the crawlable answer — scored story counts only. Not a stock tip, not a chip review, and not a doom score. The live watchlist is on ${ctx.url('/search-trends.html')}.`,
    ]);
  }
  // FINDABILITY #185 — Tesla / FSD / Autopilot AI tape → gated lab.
  if (player.id === 'tesla') {
    faq.push([
      `Why does ${brand.NAME} watch Tesla Autopilot and FSD?`,
      `${brand.NAME} scores press that names Tesla. When Autopilot, FSD, robotaxi, or Tesla AI / autonomy headlines dominate the tape — or spike in Google Search Trends — this lab page is the crawlable answer — scored story counts only. Not a stock tip, not a crash verdict, not safety advice, and not a doom score. The live watchlist is on ${ctx.url('/search-trends.html')}.`,
    ]);
    // FINDABILITY #378 — Tesla Flying Roadster / thruster EV tape → same gated
    // lab (story counts only; not a product review). Parallel to Samsung AI
    // glasses FAQ #195 sharing /lab/samsung.html with HBM FAQ #175.
    faq.push([
      `Why does ${brand.NAME} watch Tesla Flying Roadster?`,
      `${brand.NAME} scores press that names Tesla. When Flying Roadster, Roadster thruster / SpaceX-powered demo, or Tesla flying-car headlines dominate the tape (or spike in Google Search Trends), this lab page is the crawlable answer — scored story counts only. Not a product review, not a stock tip, not safety advice, and not a doom score. The live watchlist is on ${ctx.url('/search-trends.html')}.`,
    ]);
  }
  // FINDABILITY #372 — Waymo Canada / Toronto robotaxi expansion tape → gated
  // entity lab (story counts only; not a launch forecast). Parallel to Anthropic
  // Canadian data-centre FAQ #368 on /lab/anthropic.html.
  if (player.id === 'waymo') {
    faq.push([
      `Why does ${brand.NAME} watch Waymo Canada and Toronto robotaxis?`,
      `${brand.NAME} scores press that names Waymo. When Canada / Toronto robotaxi launches, Element Fleet partnerships, or cross-border Waymo expansion headlines dominate the tape (or spike in Google Search Trends), this lab page is the crawlable answer — scored story counts only. Not a launch forecast, not safety advice, and not a doom score. The live watchlist is on ${ctx.url('/search-trends.html')}.`,
    ]);
  }
  // FINDABILITY #374 — SoftBank / Allied Universal acquisition tape → gated
  // SoftBank entity lab (story counts only; not deal advice). Parallel to
  // Waymo Canada FAQ #372 — Allied had no standalone destination; SoftBank lab is the route.
  if (player.id === 'softbank') {
    faq.push([
      `Why does ${brand.NAME} watch SoftBank Allied Universal talks?`,
      `${brand.NAME} scores press that names SoftBank. When Allied Universal acquisition talks, SoftBank security-services deals, or SoftBank AI-robotics deployment headlines dominate the tape (or spike in Google Search Trends), this lab page is the crawlable answer — scored story counts only. Not deal advice, not a stock tip, and not a doom score. The live watchlist is on ${ctx.url('/search-trends.html')}.`,
    ]);
  }
  // FINDABILITY #376 — SpaceX / Starshield defense-satellite tape → gated
  // SpaceX entity lab (story counts only; not policy advice). Parallel to
  // SoftBank Allied FAQ #374 / Palantir government AI FAQ #183.
  if (player.id === 'spacex') {
    faq.push([
      `Why does ${brand.NAME} watch SpaceX Starshield?`,
      `${brand.NAME} scores press that names SpaceX. When Starshield, Ukraine access / DoD satellite headlines, or SpaceX defense AI coverage dominate the tape (or spike in Google Search Trends), this lab page is the crawlable answer — scored story counts only. Not policy advice, not a military forecast, and not a doom score. The live watchlist is on ${ctx.url('/search-trends.html')}.`,
    ]);
  }
  const faqHtml = faq.map(([q, a]) => `
  <h3>${esc(q)}</h3>
  <p>${esc(a)}</p>`).join('');
  const olderBlock = older.length
    ? `<h2 id="older">${esc(olderQ)}</h2>
  <p class="fc__lede">Kept in the permanent archive after they left the live window. Still scored stories — not a forecast.</p>
  <ol class="fc__list">${itemRows(ctx, older, 12)}</ol>
  <p class="fresh__key"><a href="${esc(ctx.href('/item/archive.html'))}">Which older AI stories has ${esc(brand.NAME)} kept in the archive?</a></p>`
    : '';

  const stats = entityOnly
    ? `<div class="fc__stat" role="group" aria-label="Lab signals">
    <div><b class="num">${esc(String(items.length))}</b><span>Related scored stories</span></div>
    ${archivedAll.length ? `<div><b class="num">${esc(String(archivedAll.length))}</b><span>Older in archive</span></div>` : ''}
  </div>
  <p class="fresh__key">Not on <a href="${esc(ctx.href('/race.html'))}">Who is winning the AI race?</a> this build — this page is a newsroom facet only.
     Stories match the published entity list or the lab's common name forms.</p>`
    : `<div class="fc__stat" role="group" aria-label="Lab signals">
    <div><b class="num">${esc(fmtPct(m.probability))}</b><span>Market odds (best model)</span></div>
    <div><b class="num">${esc(Number.isFinite(m.change_7d) ? `${m.change_7d >= 0 ? '+' : '−'}${Math.abs(m.change_7d * 100).toFixed(1)} pts` : '—')}</b><span>7-day change</span></div>
    <div><b class="num">${esc(String(items.length))}</b><span>Related scored stories</span></div>
    ${archivedAll.length ? `<div><b class="num">${esc(String(archivedAll.length))}</b><span>Older in archive</span></div>` : ''}
  </div>
  <p class="fresh__key"><a href="${esc(ctx.href('/race.html'))}">Who is winning the AI race?</a>
     · Odds are prediction-market prices, not ${esc(brand.NAME)} judgements.</p>`;

  const main = `${STYLE}
<article class="fc prose">
  <p class="fc__k"><a href="${esc(ctx.href('/race.html'))}">Who is winning the AI race?</a> · <a href="${esc(ctx.href('/lab/'))}">Which AI labs have ${esc(brand.NAME)} pages?</a> · <a href="${esc(ctx.href('/companies.html'))}">Which AI companies has ${esc(brand.NAME)} scored stories about?</a></p>
  <h1>What has ${esc(brand.NAME)} scored about ${esc(about)}?</h1>
  <p class="fc__lede">${esc(player.principal ? `${about}, principal ${player.principal}.` : about)}
     ${entityOnly
    ? 'Stories are scored newsroom items that name this lab. This page does not invent market odds.'
    : 'Odds and shipping signals come from the public race board; stories are scored newsroom items that name this lab.'}</p>
  ${stats}
  <h2 id="window">${esc(windowQ)}</h2>
  ${items.length
    ? `<ol class="fc__list">${itemRows(ctx, items)}</ol>`
    : `<p>No scored story in the current window names ${esc(about)}.${entityOnly ? '' : ' The race row above is still the addressable unit.'}</p>`}
  ${olderBlock}
  <h2 id="faq">What questions do people actually ask?</h2>
  ${faqHtml}
  ${peerLabs.length ? `<h2 id="other-labs">${esc(othersQ)}</h2>
  <nav class="fc__labs" aria-label="Labs">${labs}</nav>` : ''}
</article>`;

  return page({
    ctx,
    path,
    title,
    description,
    noindex: !indexable,
    jsonld: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      url: ctx.url(path),
      description,
      about: { '@type': 'Organization', name: player.name },
      isPartOf: { '@type': 'WebSite', name: brand.PUBLICATION, url: ctx.url('/') },
      speakable: speakable(['h1', '.fc__lede']),
      mainEntity: storyItemListEntity(ctx, items, older),
    }, breadcrumbs(ctx, [
      { name: 'Who is winning the AI race?', path: '/race.html' },
      { name: `Which AI labs have ${brand.NAME} pages?`, path: '/lab/' },
      { name: `What has ${brand.NAME} scored about ${about}?`, path },
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

/** Minimum scored stories before an outlet page is indexable. */
export const SOURCE_INDEX_MIN = 3;

export function sourcePath(id) {
  return `/source/${id}.html`;
}

let sourceLabelCache = null;

/** Adapter id -> label, read from collector/news-sources so the page name matches the feed. */
export function sourceLabels() {
  if (sourceLabelCache) return sourceLabelCache;
  const dir = fileURLToPath(new URL('../../collector/news-sources/', import.meta.url));
  const map = new Map();
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.mjs') || name.startsWith('_') || name.startsWith('.')) continue;
    const text = readFileSync(`${dir}/${name}`, 'utf8');
    const id = text.match(/\bid:\s*['"]([a-z0-9-]+)['"]/);
    const label = text.match(/\blabel:\s*['"]([^'"]+)['"]/);
    if (id && label) map.set(id[1], label[1]);
  }
  sourceLabelCache = map;
  return map;
}

export function sourceLabel(id) {
  return sourceLabels().get(id) || String(id || '');
}

export function itemsForSource(ctx, sourceId) {
  const items = (ctx.news && Array.isArray(ctx.news.items)) ? ctx.news.items : [];
  return items
    .filter((it) => it && it.source === sourceId)
    .slice()
    .sort((a, b) => String(b.published_at || '').localeCompare(String(a.published_at || '')));
}

/** Older scored stories from this adapter, kept in the durable item archive. */
export function archiveItemsForSource(ctx, sourceId) {
  const archived = Array.isArray(ctx.itemArchive) ? ctx.itemArchive : [];
  return archived
    .filter((it) => it && it.source === sourceId)
    .slice()
    .sort((a, b) => String(b.published_at || '').localeCompare(String(a.published_at || '')));
}

/** Live + archive scored stories from this feed adapter. */
export function sourceStoryCount(ctx, sourceId) {
  return itemsForSource(ctx, sourceId).length + archiveItemsForSource(ctx, sourceId).length;
}

export function sourceIndexable(ctx, sourceId) {
  // Same durable gate as tags/kinds/outlets/models — archive keeps hubs above
  // SOURCE_INDEX_MIN when the live window thins (FINDABILITY #48).
  return sourceStoryCount(ctx, sourceId) >= SOURCE_INDEX_MIN;
}

/** Feed adapters with enough scored stories to be a page, busiest first. */
export function indexableSources(ctx) {
  const liveCounts = new Map();
  const archCounts = new Map();
  const items = (ctx.news && Array.isArray(ctx.news.items)) ? ctx.news.items : [];
  for (const it of items) {
    if (!it || !it.source) continue;
    liveCounts.set(it.source, (liveCounts.get(it.source) || 0) + 1);
  }
  const archived = Array.isArray(ctx.itemArchive) ? ctx.itemArchive : [];
  for (const it of archived) {
    if (!it || !it.source) continue;
    archCounts.set(it.source, (archCounts.get(it.source) || 0) + 1);
  }
  const ids = new Set([...liveCounts.keys(), ...archCounts.keys()]);
  return [...ids]
    .map((id) => {
      const live = liveCounts.get(id) || 0;
      const archivedCount = archCounts.get(id) || 0;
      return {
        id,
        live,
        archived: archivedCount,
        count: live + archivedCount,
        label: sourceLabel(id),
      };
    })
    .filter((s) => s.count >= SOURCE_INDEX_MIN)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function renderSource(ctx, sourceId) {
  const items = itemsForSource(ctx, sourceId);
  const archivedAll = archiveItemsForSource(ctx, sourceId);
  const older = archivedAll.slice(0, 12);
  const total = items.length + archivedAll.length;
  const label = sourceLabel(sourceId);
  const indexable = total >= SOURCE_INDEX_MIN;
  const path = sourcePath(sourceId);
  // Head-term title: people search “{source} AI stories” / source doom score.
  const title = `What has ${brand.NAME} scored via ${label}? AI stories, not a source score`;
  const description = clip(
    `${total} scored stories from ${label} on ${brand.NAME} (live window plus archive). The outlet wrote them. The score is ours. Tempo, not a forecast.`,
    160,
  );
  // Tip #288: section H2s are question-shaped and mirrored in FAQ (§3.3).
  const windowQ = `Which scored stories are from ${label} in this window?`;
  const olderQ = `Which older scored stories are from ${label}?`;
  const othersQ = 'Which other outlets have scored stories?';
  const peerSources = indexableSources(ctx)
    .filter((s) => s.id !== sourceId)
    .slice(0, 12);
  const others = peerSources
    .map((s) => `<a href="${esc(ctx.href(sourcePath(s.id)))}">What has ${esc(brand.NAME)} scored via ${esc(s.label)}?</a>`)
    .join('');
  const faq = [
    [`What has ${brand.NAME} scored via ${label}?`,
      `${total} scored stories arrived through the ${label} feed adapter (${items.length} in the live window${archivedAll.length ? `, ${archivedAll.length} older in the archive` : ''}). The words belong to the outlet; the score measures activity tempo.`],
    [windowQ,
      items.length
        ? `${items.length} scored ${items.length === 1 ? 'story' : 'stories'} from ${label} in the current window. The words belong to the outlet; the score measures activity tempo — not a source doom score.`
        : 'No scored stories from this outlet in the current window.'],
    ...(older.length
      ? [[olderQ,
        'Kept in the permanent archive after they left the live window. Still scored stories — not a forecast.']]
      : []),
    ...(peerSources.length
      ? [[othersQ,
        `Other feed adapters that clear the substance gate, each linking What has ${brand.NAME} scored via that outlet?`]]
      : []),
    [`Does ${brand.NAME} publish a ${label} doom score?`,
      `No. ${brand.DISCLAIMER_SHORT} A source page lists scored stories from that feed adapter — not a ranking of how dangerous the outlet is.`],
  ];
  const faqHtml = faq.map(([q, a]) => `
  <h3>${esc(q)}</h3>
  <p>${esc(a)}</p>`).join('');
  const olderBlock = older.length
    ? `<h2 id="older">${esc(olderQ)}</h2>
  <p class="fc__lede">Kept in the permanent archive after they left the live window. Still scored stories — not a forecast.</p>
  <ol class="fc__list">${itemRows(ctx, older, 12)}</ol>
  <p class="fresh__key"><a href="${esc(ctx.href('/item/archive.html'))}">Which older AI stories has ${esc(brand.NAME)} kept in the archive?</a></p>`
    : '';

  const main = `${STYLE}
<article class="fc prose">
  <p class="fc__k"><a href="${esc(ctx.href('/news.html'))}">Which AI stories has ${esc(brand.NAME)} scored in this window?</a> · <a href="${esc(ctx.href('/source/'))}">Which AI feed adapters have ${esc(brand.NAME)} pages?</a> · <a href="${esc(ctx.href('/sources.html'))}">Which AI news sources has ${esc(brand.NAME)} scored via?</a></p>
  <h1>What has ${esc(brand.NAME)} scored via ${esc(label)}?</h1>
  <p class="fc__lede">Stories this index scored from ${esc(label)}. The words belong to the outlet. The score is computed here, and it measures how much the item moved inside the window, not whether the story is good or bad.</p>
  <div class="fc__stat" role="group" aria-label="Outlet counts">
    <div><b class="num">${esc(String(total))}</b><span>Scored stories (live + archive)</span></div>
    <div><b class="num">${esc(String(items.length))}</b><span>In live window</span></div>
    ${archivedAll.length ? `<div><b class="num">${esc(String(archivedAll.length))}</b><span>Older in archive</span></div>` : ''}
  </div>
  <h2 id="window">${esc(windowQ)}</h2>
  ${items.length
    ? `<ol class="fc__list">${itemRows(ctx, items)}</ol>`
    : '<p>No scored stories from this outlet in the current window.</p>'}
  ${olderBlock}
  <h2 id="faq">What questions do people actually ask?</h2>
  ${faqHtml}
  ${peerSources.length ? `<h2 id="other-outlets">${esc(othersQ)}</h2><nav class="fc__labs" aria-label="Other outlets">${others}</nav>` : ''}
</article>`;

  return page({
    ctx,
    path,
    title,
    description,
    noindex: !indexable,
    jsonld: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      url: ctx.url(path),
      description,
      isPartOf: { '@type': 'WebSite', name: brand.PUBLICATION, url: ctx.url('/') },
      about: { '@type': 'NewsMediaOrganization', name: label },
      speakable: speakable(['h1', '.fc__lede']),
      mainEntity: storyItemListEntity(ctx, items, older),
    }, breadcrumbs(ctx, [
      { name: `Which AI stories has ${brand.NAME} scored in this window?`, path: '/news.html' },
      { name: `Which AI feed adapters have ${brand.NAME} pages?`, path: '/source/' },
      { name: `What has ${brand.NAME} scored via ${label}?`, path },
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

export function renderSourceIndex(ctx) {
  const sources = indexableSources(ctx);
  const path = '/source/';
  // Head-term title: people search “AI news sources” / feed adapters directory.
  const title = `Which AI feed adapters have ${brand.NAME} pages?`;
  const description = clip(
    `${sources.length} outlets with at least ${SOURCE_INDEX_MIN} scored stories on ${brand.NAME} (live window plus archive). Each page lists those stories.`,
    160,
  );
  const faq = [
    [`Which AI feed adapters have ${brand.NAME} pages?`,
      `${sources.length} feed adapters clear the substance gate of at least ${SOURCE_INDEX_MIN} matching stories in the live window or archive. Each hub lists those stories — not a source doom score.`],
    [`Does ${brand.NAME} publish a source doom score?`,
      `No. ${brand.DISCLAIMER_SHORT} These pages count scored stories from a feed adapter. Publisher hosts stay under /outlets.html.`],
  ];
  const faqHtml = faq.map(([q, a]) => `
  <h3>${esc(q)}</h3>
  <p>${esc(a)}</p>`).join('');
  const rows = sources.map((s) => `<li>
  <a href="${esc(ctx.href(sourcePath(s.id)))}">What has ${esc(brand.NAME)} scored via ${esc(s.label)}?</a>
  <span class="fc__meta">${esc(s.label)} · ${esc(s.id)}${s.archived ? ` · ${esc(String(s.live))} live / ${esc(String(s.archived))} archive` : ''}</span>
  <span class="fc__sc num">${esc(String(s.count))}</span>
</li>`).join('');
  const main = `${STYLE}
<article class="fc prose">
  <p class="fc__k"><a href="${esc(ctx.href('/news.html'))}">Which AI stories has ${esc(brand.NAME)} scored in this window?</a> · Which AI feed adapters have ${esc(brand.NAME)} pages? · <a href="${esc(ctx.href('/sources.html'))}">Which AI news sources has ${esc(brand.NAME)} scored via?</a></p>
  <h1>Which AI feed adapters have ${esc(brand.NAME)} pages?</h1>
  <p class="fc__lede">An outlet earns a page when at least ${SOURCE_INDEX_MIN} scored stories from it appear in the live window or the durable archive. Fewer than that stays on the story page only, so a one-off item does not become its own URL.</p>
  <ol class="fc__list">${rows}</ol>
  <h2 id="faq">What questions do people actually ask?</h2>
  ${faqHtml}
  <p class="fresh__key">Search-shaped directory: <a href="${esc(ctx.href('/sources.html'))}">Which AI news sources has ${esc(brand.NAME)} scored via?</a>.</p>
</article>`;
  return page({
    ctx,
    path,
    title,
    description,
    noindex: sources.length === 0,
    jsonld: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      url: ctx.url('/source/'),
      description,
      speakable: speakable(['h1', '.fc__lede']),
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: sources.length,
        itemListElement: sources.map((s, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: ctx.url(sourcePath(s.id)),
          name: `What has ${brand.NAME} scored via ${s.label}?`,
        })),
      },
    }, breadcrumbs(ctx, [
      { name: `Which AI stories has ${brand.NAME} scored in this window?`, path: '/news.html' },
      { name: `Which AI feed adapters have ${brand.NAME} pages?`, path: '/source/' },
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


/** Directory of indexable /pillar pages. */
export function renderPillarIndex(ctx) {
  const pillars = indexablePillars(ctx);
  const path = '/pillar/';
  const title = `Which AI activity pillars have ${brand.NAME} pages?`;
  const description = clip(
    `${pillars.length} pillars with at least ${PILLAR_INDEX_MIN} scored stories on ${brand.NAME}. Each page lists those stories beside the live pillar reading.`,
    160,
  );
  const faq = [
    [`Which AI activity pillars have ${brand.NAME} pages?`,
      `${pillars.length} pillars clear the substance gate of at least ${PILLAR_INDEX_MIN} matching stories in the live window. Each hub lists those stories beside the live pillar reading — not a pillar doom score.`],
    [`Does ${brand.NAME} publish a pillar doom score?`,
      `No. ${brand.DISCLAIMER_SHORT} These pages count scored stories under a pillar and the live tempo reading against this index’s frozen reference.`],
  ];
  const faqHtml = faq.map(([q, a]) => `
  <h3>${esc(q)}</h3>
  <p>${esc(a)}</p>`).join('');
  const rows = pillars.map((p) => `<li>
  <a href="${esc(ctx.href(pillarPath(p.id)))}">What has ${esc(brand.NAME)} scored under ${esc(p.name)}?</a>
  <span class="fc__meta">${esc(p.name)} · ${esc(p.id)}${p.score != null ? ` · ${esc(num(p.score, 1))} / 100` : ''}</span>
  <span class="fc__sc num">${esc(String(p.count))}</span>
</li>`).join('');
  const main = `${STYLE}
<article class="fc prose">
  <p class="fc__k"><a href="${esc(ctx.href('/news.html'))}">Which AI stories has ${esc(brand.NAME)} scored in this window?</a> · Which AI activity pillars have ${esc(brand.NAME)} pages? · <a href="${esc(ctx.href('/pillars.html'))}">Which AI activity pillars has ${esc(brand.NAME)} scored?</a></p>
  <h1>Which AI activity pillars have ${esc(brand.NAME)} pages?</h1>
  <p class="fc__lede">A pillar earns a crawlable page when at least ${PILLAR_INDEX_MIN} scored stories under it appear in the live window. The live pillar score is activity tempo against this index’s frozen reference — not a probability of harm.</p>
  ${pillars.length ? `<ol class="fc__list">${rows}</ol>` : '<p>No pillar cleared the gate in this build.</p>'}
  <h2 id="faq">What questions do people actually ask?</h2>
  ${faqHtml}
  <p class="fresh__key">Search-shaped directory: <a href="${esc(ctx.href('/pillars.html'))}">Which AI activity pillars has ${esc(brand.NAME)} scored?</a>.</p>
</article>`;
  return page({
    ctx,
    path,
    title,
    description,
    noindex: pillars.length === 0,
    jsonld: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      url: ctx.url(path),
      description,
      speakable: speakable(['h1', '.fc__lede']),
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: pillars.length,
        itemListElement: pillars.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: ctx.url(pillarPath(p.id)),
          name: `What has ${brand.NAME} scored under ${p.name}?`,
        })),
      },
    }, breadcrumbs(ctx, [
      { name: `Which AI stories has ${brand.NAME} scored in this window?`, path: '/news.html' },
      { name: `Which AI activity pillars have ${brand.NAME} pages?`, path },
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
 * Head-term /pillars hub. Same gated pillar set as /pillar/, different title
 * and lede for “AI activity pillars” queries — not a pillar doom score.
 */
export function renderPillars(ctx) {
  const pillars = indexablePillars(ctx);
  const path = '/pillars.html';
  const title = `Which AI activity pillars has ${brand.NAME} scored?`;
  const description = clip(
    `${pillars.length} activity pillars with scored-story hubs on ${brand.NAME}. Each row links /pillar pages — tempo readings and story counts only, not a pillar doom score.`,
    160,
  );
  const faq = [
    [`Which AI activity pillars has ${brand.NAME} scored?`,
      `${pillars.length} pillars clear the substance gate of at least ${PILLAR_INDEX_MIN} matching stories in the live window. Each hub lists those stories beside the live pillar reading — not a pillar doom score.`],
    [`Does ${brand.NAME} publish a pillar doom score?`,
      `No. ${brand.DISCLAIMER_SHORT} Numbers are story counts and tempo readings against this index’s frozen reference.`],
  ];
  const faqHtml = faq.map(([q, a]) => `
  <h3>${esc(q)}</h3>
  <p>${esc(a)}</p>`).join('');
  const rows = pillars.map((p) => `<li>
  <a href="${esc(ctx.href(pillarPath(p.id)))}">What has ${esc(brand.NAME)} scored under ${esc(p.name)}?</a>
  <span class="fc__meta">${esc(p.name)} · Pillar hub · <span class="num">${esc(String(p.count))}</span> scored${p.score != null ? ` · ${esc(num(p.score, 1))} / 100` : ''}</span>
</li>`).join('');
  const main = `${STYLE}
<article class="fc prose">
  <p class="fc__k"><a href="${esc(ctx.href('/compare.html'))}">Which AI doom indexes can you compare?</a> · <a href="${esc(ctx.href('/pillar/'))}">Which AI activity pillars have ${esc(brand.NAME)} pages?</a> · Which AI activity pillars has ${esc(brand.NAME)} scored?</p>
  <h1>Which AI activity pillars has ${esc(brand.NAME)} scored?</h1>
  <p class="fc__lede">${esc(brand.NAME)} does not publish a pillar “doom score.” It publishes five activity pillars and scored stories under each. This page lists pillars that already clear the same substance gate as <a href="${esc(ctx.href('/pillar/'))}">Which AI activity pillars have ${esc(brand.NAME)} pages?</a> — at least ${PILLAR_INDEX_MIN} matching stories in the live window.</p>
  <div class="fc__stat" role="group" aria-label="Pillars hub totals">
    <div><b class="num">${esc(String(pillars.length))}</b><span>Pillar hubs</span></div>
  </div>
  ${pillars.length ? `<ol class="fc__list">${rows}</ol>` : '<p>No pillar hub cleared the gate in this build.</p>'}
  <h2 id="faq">What questions do people actually ask?</h2>
  ${faqHtml}
  <p class="fresh__key"><a href="${esc(ctx.href('/pillar/'))}">Which AI activity pillars have ${esc(brand.NAME)} pages?</a>
     · <a href="${esc(ctx.href('/methodology.html'))}">How the ${esc(brand.NAME)} AI activity index is computed · methodology</a>
     · <a href="${esc(ctx.href('/tags.html'))}">Which AI tags has ${esc(brand.NAME)} scored stories about?</a>
     · <a href="${esc(ctx.href('/news.html'))}">Which AI stories has ${esc(brand.NAME)} scored in this window?</a></p>
</article>`;
  return page({
    ctx,
    path,
    title,
    description,
    noindex: pillars.length === 0,
    jsonld: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      url: ctx.url(path),
      description,
      speakable: speakable(['h1', '.fc__lede']),
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: pillars.length,
        itemListElement: pillars.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: ctx.url(pillarPath(p.id)),
          name: `What has ${brand.NAME} scored under ${p.name}?`,
        })),
      },
    }, breadcrumbs(ctx, [
      { name: 'Which AI doom indexes can you compare?', path: '/compare.html' },
      { name: `Which AI activity pillars has ${brand.NAME} scored?`, path },
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

/** Head-term /sources hub for feed-adapter queries (publisher hosts stay under /outlets). */
export function renderSources(ctx) {
  const sources = indexableSources(ctx);
  const path = '/sources.html';
  const title = `Which AI news sources has ${brand.NAME} scored via?`;
  const description = clip(
    `${sources.length} feed adapters with scored-story hubs on ${brand.NAME}. Each row links /source pages — adapter story counts only, not a source doom score.`,
    160,
  );
  const faq = [
    [`Which AI news sources has ${brand.NAME} scored via?`,
      `${sources.length} feed adapters clear the substance gate of at least ${SOURCE_INDEX_MIN} matching stories in the live window or archive. Each hub lists those stories — not a source doom score.`],
    [`Does ${brand.NAME} publish a source doom score?`,
      `No. ${brand.DISCLAIMER_SHORT} These pages count scored stories from a feed adapter. Publisher hosts stay under /outlets.html.`],
  ];
  const faqHtml = faq.map(([q, a]) => `
  <h3>${esc(q)}</h3>
  <p>${esc(a)}</p>`).join('');
  const rows = sources.map((s) => `<li>
  <a href="${esc(ctx.href(sourcePath(s.id)))}">What has ${esc(brand.NAME)} scored via ${esc(s.label)}?</a>
  <span class="fc__meta">${esc(s.label)} · Feed adapter · <span class="num">${esc(String(s.count))}</span> scored${s.archived ? ` (${esc(String(s.live))} live)` : ''}</span>
</li>`).join('');
  const main = `${STYLE}
<article class="fc prose">
  <p class="fc__k"><a href="${esc(ctx.href('/compare.html'))}">Which AI doom indexes can you compare?</a> · <a href="${esc(ctx.href('/source/'))}">Which AI feed adapters have ${esc(brand.NAME)} pages?</a> · Which AI news sources has ${esc(brand.NAME)} scored via?</p>
  <h1>Which AI news sources has ${esc(brand.NAME)} scored via?</h1>
  <p class="fc__lede">${esc(brand.NAME)} does not publish a source “doom score.” It publishes an activity index and scored stories. This page lists feed adapters that already clear the same substance gate as <a href="${esc(ctx.href('/source/'))}">Which AI feed adapters have ${esc(brand.NAME)} pages?</a> — at least ${SOURCE_INDEX_MIN} matching stories in the live window or archive. Publisher hosts stay under <a href="${esc(ctx.href('/outlets.html'))}">Which AI outlets has ${esc(brand.NAME)} scored stories from?</a>.</p>
  <div class="fc__stat" role="group" aria-label="Sources hub totals">
    <div><b class="num">${esc(String(sources.length))}</b><span>Feed-adapter hubs</span></div>
  </div>
  ${sources.length ? `<ol class="fc__list">${rows}</ol>` : '<p>No feed-adapter hub cleared the gate in this build.</p>'}
  <h2 id="faq">What questions do people actually ask?</h2>
  ${faqHtml}
  <p class="fresh__key"><a href="${esc(ctx.href('/source/'))}">Which AI feed adapters have ${esc(brand.NAME)} pages?</a>
     · <a href="${esc(ctx.href('/outlets.html'))}">Which AI outlets has ${esc(brand.NAME)} scored stories from?</a>
     · <a href="${esc(ctx.href('/kinds.html'))}">Which AI story kinds has ${esc(brand.NAME)} scored?</a>
     · <a href="${esc(ctx.href('/news.html'))}">Which AI stories has ${esc(brand.NAME)} scored in this window?</a></p>
</article>`;
  return page({
    ctx,
    path,
    title,
    description,
    noindex: sources.length === 0,
    jsonld: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      url: ctx.url(path),
      description,
      speakable: speakable(['h1', '.fc__lede']),
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: sources.length,
        itemListElement: sources.map((s, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: ctx.url(sourcePath(s.id)),
          name: `What has ${brand.NAME} scored via ${s.label}?`,
        })),
      },
    }, breadcrumbs(ctx, [
      { name: 'Which AI doom indexes can you compare?', path: '/compare.html' },
      { name: `Which AI news sources has ${brand.NAME} scored via?`, path },
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

/** Directory of indexable /lab pages (structural twin to /model/ and /source/). */
export function renderLabIndex(ctx) {
  const labs = indexableLabs(ctx);
  const path = '/lab/';
  const title = `Which AI labs have ${brand.NAME} pages?`;
  const description = clip(
    `${labs.length} AI labs and companies with a ${brand.NAME} /lab page — race-board rows or ≥${ENTITY_LAB_MIN} scored stories. Story counts and market odds where published; not a doom ranking.`,
    160,
  );
  const faq = [
    [`Which AI labs have ${brand.NAME} pages?`,
      `${labs.length} labs clear the gate — race-board rows or at least ${ENTITY_LAB_MIN} matching headlines. Each hub lists those stories and, where published, prediction-market odds — not a lab doom score.`],
    [`Does ${brand.NAME} publish a lab doom score?`,
      `No. ${brand.DISCLAIMER_SHORT} Numbers are story counts and, where published, prediction-market prices.`],
  ];
  const faqHtml = faq.map(([q, a]) => `
  <h3>${esc(q)}</h3>
  <p>${esc(a)}</p>`).join('');
  // FINDABILITY #140 — directory rows use labAboutLabel (#121/#137 aliases).
  const rows = labs.map((p) => `<li>
  <a href="${esc(ctx.href(labPath(p.id)))}">What has ${esc(brand.NAME)} scored about ${esc(labAboutLabel(p))}?</a>
  <span class="fc__meta">${p.entityOnly ? 'Entity hub · story counts only' : 'Race board · odds when published'}</span>
  <span class="fc__sc num">${esc(String(p.count))}</span>
</li>`).join('');
  const main = `${STYLE}
<article class="fc prose">
  <p class="fc__k"><a href="${esc(ctx.href('/race.html'))}">Who is winning the AI race?</a> · Which AI labs have ${esc(brand.NAME)} pages? · <a href="${esc(ctx.href('/companies.html'))}">Which AI companies has ${esc(brand.NAME)} scored stories about?</a></p>
  <h1>Which AI labs have ${esc(brand.NAME)} pages?</h1>
  <p class="fc__lede">A lab earns a page when it sits on <a href="${esc(ctx.href('/race.html'))}">Who is winning the AI race?</a> or clears at least ${ENTITY_LAB_MIN} scored stories in the current window. Numbers are story counts and, where published, prediction-market odds — not a ranking of how dangerous a company is.</p>
  ${labs.length ? `<ol class="fc__list">${rows}</ol>` : '<p>No lab cleared the gate in this build.</p>'}
  <h2 id="faq">What questions do people actually ask?</h2>
  ${faqHtml}
  <p class="fresh__key">Search-shaped directory: <a href="${esc(ctx.href('/companies.html'))}">Which AI companies has ${esc(brand.NAME)} scored stories about?</a>.</p>
</article>`;
  return page({
    ctx,
    path,
    title,
    description,
    noindex: labs.length === 0,
    jsonld: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      url: ctx.url(path),
      description,
      speakable: speakable(['h1', '.fc__lede']),
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: labs.length,
        itemListElement: labs.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: ctx.url(labPath(p.id)),
          name: `What has ${brand.NAME} scored about ${labAboutLabel(p)}?`,
        })),
      },
    }, breadcrumbs(ctx, [
      { name: 'Who is winning the AI race?', path: '/race.html' },
      { name: `Which AI labs have ${brand.NAME} pages?`, path },
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
 * DoomBench-shaped /companies head-term hub. Same gated lab set as /lab/,
 * different title and lede for “AI companies” queries — not a synonym doorway
 * farm and not a doom scoreboard.
 */
export function renderCompanies(ctx) {
  const labs = indexableLabs(ctx);
  const path = '/companies.html';
  const title = `Which AI companies has ${brand.NAME} scored stories about?`;
  const description = clip(
    `${labs.length} AI companies and labs with scored-story hubs on ${brand.NAME}. Each row links /lab pages — tempo and story counts, not a company doom score.`,
    160,
  );
  const faq = [
    [`Which AI companies has ${brand.NAME} scored stories about?`,
      `${labs.length} companies and labs clear the substance gate — race-board rows or at least ${ENTITY_LAB_MIN} matching headlines. Each hub lists those stories — not a company doom score.`],
    [`Does ${brand.NAME} publish a company doom score?`,
      `No. ${brand.DISCLAIMER_SHORT} Numbers are story counts and, where published, prediction-market prices.`],
  ];
  const faqHtml = faq.map(([q, a]) => `
  <h3>${esc(q)}</h3>
  <p>${esc(a)}</p>`).join('');
  // FINDABILITY #140 — company hub rows use labAboutLabel (#121/#137 aliases).
  const rows = labs.map((p) => `<li>
  <a href="${esc(ctx.href(labPath(p.id)))}">What has ${esc(brand.NAME)} scored about ${esc(labAboutLabel(p))}?</a>
  <span class="fc__meta">${p.entityOnly ? 'Story hub' : 'Race board + stories'} · <span class="num">${esc(String(p.count))}</span> in window</span>
</li>`).join('');
  const main = `${STYLE}
<article class="fc prose">
  <p class="fc__k"><a href="${esc(ctx.href('/compare.html'))}">Which AI doom indexes can you compare?</a> · <a href="${esc(ctx.href('/lab/'))}">Which AI labs have ${esc(brand.NAME)} pages?</a> · Which AI companies has ${esc(brand.NAME)} scored stories about?</p>
  <h1>Which AI companies has ${esc(brand.NAME)} scored stories about?</h1>
  <p class="fc__lede">${esc(brand.NAME)} does not publish a company “doom score.” It publishes an activity index and scored stories. This page lists companies and labs that already clear the same substance gate as <a href="${esc(ctx.href('/lab/'))}">Which AI labs have ${esc(brand.NAME)} pages?</a> — race-board rows or at least ${ENTITY_LAB_MIN} matching headlines in the live window.</p>
  <div class="fc__stat" role="group" aria-label="Company hub totals">
    <div><b class="num">${esc(String(labs.length))}</b><span>Company / lab hubs</span></div>
  </div>
  ${labs.length ? `<ol class="fc__list">${rows}</ol>` : '<p>No company hub cleared the gate in this build.</p>'}
  <h2 id="faq">What questions do people actually ask?</h2>
  ${faqHtml}
  <p class="fresh__key"><a href="${esc(ctx.href('/lab/'))}">Which AI labs have ${esc(brand.NAME)} pages?</a>
     · <a href="${esc(ctx.href('/compare.html'))}">Which AI doom indexes can you compare?</a>
     · <a href="${esc(ctx.href('/race.html'))}">Who is winning the AI race?</a></p>
</article>`;
  return page({
    ctx,
    path,
    title,
    description,
    noindex: labs.length === 0,
    jsonld: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      url: ctx.url(path),
      description,
      speakable: speakable(['h1', '.fc__lede']),
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: labs.length,
        itemListElement: labs.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: ctx.url(labPath(p.id)),
          name: `What has ${brand.NAME} scored about ${labAboutLabel(p)}?`,
        })),
      },
    }, breadcrumbs(ctx, [
      { name: 'Which AI doom indexes can you compare?', path: '/compare.html' },
      { name: `Which AI companies has ${brand.NAME} scored stories about?`, path },
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

/** Sitemap rows: only indexable facets (mirrors noindex). */
export function sitemapEntries(ctx) {
  const out = [];
  const lastNews = (ctx.news && ctx.news.generated_at) || (ctx.state && ctx.state.generated_at);
  const pillars = indexablePillars(ctx);
  if (pillars.length) {
    out.push({
      loc: '/pillar/',
      changefreq: 'hourly',
      priority: '0.75',
      lastmod: lastNews,
    });
    out.push({
      loc: '/pillars.html',
      changefreq: 'hourly',
      priority: '0.8',
      lastmod: lastNews,
    });
  }
  for (const p of pillars) {
    out.push({
      loc: pillarPath(p.id),
      changefreq: 'hourly',
      priority: '0.8',
      lastmod: lastNews,
    });
  }
  const lastRace = (ctx.race && ctx.race.generated_at) || lastNews;
  const labs = indexableLabs(ctx);
  if (labs.length) {
    out.push({
      loc: '/lab/',
      changefreq: 'daily',
      priority: '0.75',
      lastmod: lastRace,
    });
    out.push({
      loc: '/companies.html',
      changefreq: 'daily',
      priority: '0.8',
      lastmod: lastRace,
    });
  }
  for (const player of labs) {
    out.push({
      loc: labPath(player.id),
      changefreq: 'daily',
      priority: '0.7',
      lastmod: lastRace,
    });
  }
  if (indexableSources(ctx).length) {
    out.push({
      loc: '/source/',
      changefreq: 'hourly',
      priority: '0.6',
      lastmod: lastNews,
    });
    out.push({
      loc: '/sources.html',
      changefreq: 'hourly',
      priority: '0.75',
      lastmod: lastNews,
    });
  }
  for (const s of indexableSources(ctx)) {
    out.push({
      loc: sourcePath(s.id),
      changefreq: 'hourly',
      priority: '0.6',
      lastmod: lastNews,
    });
  }
  return out;
}
