// ENTITY PAGES. Two families of indexable pages built from data this site
// already collects, each answering a question people type that the parent
// page answers only somewhere down a long table:
//
//   /map/<state>.html  "data centers in Virginia" — every mapped site in the
//                      state, by county, with its status and the county's
//                      drought category. States with fewer than MIN_SITES
//                      mapped get no page: a page about two buildings is thin,
//                      and they stay one row on /map.
//   /race/<lab>.html   "Anthropic odds", "OpenAI news" — one lab's market
//                      price, shipping, share of the newsroom, and the latest
//                      scored stories that name it, each linked to its item
//                      page.
//
// Every figure is read from data/datacenters.json, data/race.json and
// data/news.json exactly as the parent pages read them; nothing here is a new
// measurement. Each family returns [] when its data is absent, so a build
// without a file simply writes no pages — the same rule the parent pages keep.

import { esc, utc } from './_html.mjs';
import { page } from './layout.mjs';
import { slugFor, serpHeadline } from './itemPage.mjs';
import * as brand from '../brand.mjs';

const MIN_SITES = 3;
const N = (n) => Number(n || 0).toLocaleString('en-US');
const pct = (v, dp = 1) => (Number.isFinite(Number(v)) ? `${(Number(v) * 100).toFixed(dp)}%` : '—');
const signedPts = (v) => {
  const p = Number(v) * 100;
  if (!Number.isFinite(p)) return '—';
  return `${p > 0 ? '+' : p < 0 ? '−' : '±'}${Math.abs(p).toFixed(1)} pts`;
};
const slug = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const CSS = `<style>
.ent{max-width:72rem}
.ent__eb{font:600 .75rem/1.2 var(--mono,ui-monospace,monospace);letter-spacing:.14em;text-transform:uppercase;color:var(--accent,#4ADE80);margin:0 0 .5rem}
.ent h1{margin:0 0 .75rem}
.ent__lede{font-size:1.05rem;line-height:1.6;max-width:66ch}
.ent__note{color:var(--ink-dim,#AEB7C3);font-size:.9rem;line-height:1.55;max-width:70ch}
.ent__kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:1rem 0 1.5rem;padding:0;list-style:none}
.ent__kpis li{border:1px solid var(--rule,#232C3B);background:var(--bg-sunken,#0A0E16);border-radius:8px;padding:10px 12px}
.ent__kpis b{display:block;font:700 1.4rem/1.1 var(--mono,ui-monospace,monospace)}
.ent__kpis span{font-size:.8rem;color:var(--ink-dim,#AEB7C3)}
.ent__tw{overflow-x:auto;margin:.75rem 0 1.25rem}
.ent table{border-collapse:collapse;width:100%;font-size:.9rem}
.ent th,.ent td{text-align:left;padding:6px 10px;border-bottom:1px solid var(--rule,#232C3B);vertical-align:top}
.ent thead th{font:600 .75rem/1.2 var(--mono,ui-monospace,monospace);letter-spacing:.08em;text-transform:uppercase;color:var(--ink-dim,#AEB7C3)}
.ent td.n{font-variant-numeric:tabular-nums;white-space:nowrap}
.ent__links{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:4px 18px;list-style:none;padding:0;margin:.5rem 0 1rem}
.ent__links li{display:flex;justify-content:space-between;gap:8px;border-bottom:1px solid var(--rule,#232C3B);padding:4px 0}
.ent__links span{opacity:.75;font-variant-numeric:tabular-nums}
.ent__news{padding-left:1.2rem}
.ent__news li{margin:.4rem 0;line-height:1.45}
.ent__news small{color:var(--ink-dim,#AEB7C3)}
</style>`;

// ---------------------------------------------------------------------------
// Data centers by state
// ---------------------------------------------------------------------------

const STATUS_WORD = { operating: 'Operating', under_construction: 'Under construction', announced: 'Proposed' };

function dcStates(ctx) {
  const dc = ctx && ctx.datacenters;
  if (!dc || !Array.isArray(dc.sites) || !dc.counts || !dc.counts.by_state) return [];
  const names = {};
  for (const s of dc.sites) if (s.state && s.state_name) names[s.state] = s.state_name;
  return Object.entries(dc.counts.by_state)
    .map(([ab, c]) => ({ ab, name: names[ab], total: Number(c.total) || 0, c }))
    .filter((s) => s.name && s.total >= MIN_SITES && slug(s.name))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

export function dcStatePath(s) { return `/map/${slug(s.name)}.html`; }

/** The /map page's link block. Empty when no state qualifies. */
export function dcStateIndex(ctx) {
  const list = dcStates(ctx).slice().sort((a, b) => a.name.localeCompare(b.name));
  if (!list.length) return '';
  return `${CSS}<section class="ent" aria-labelledby="dc-by-state">
  <h2 id="dc-by-state">Data centers by state</h2>
  <p class="ent__note">A page for each state with at least ${MIN_SITES} sites mapped: every site, county by county.</p>
  <ul class="ent__links">${list.map((s) => `<li><a href="${esc(ctx.href(dcStatePath(s)))}">${esc(s.name)}</a> <span>${N(s.total)}</span></li>`).join('')}</ul>
</section>`;
}

export function dcStatePages(ctx) {
  const states = dcStates(ctx);
  return states.map((s, i) => ({ rel: dcStatePath(s).slice(1), html: renderDcState(ctx, s, i, states) }));
}

function renderDcState(ctx, s, rankIdx, ranked) {
  const dc = ctx.datacenters;
  const ri = dc.resources_index || {};
  const sites = dc.sites.filter((x) => x.state === s.ab)
    .sort((a, b) => String(a.county || '').localeCompare(String(b.county || ''))
      || String(a.name || '~').localeCompare(String(b.name || '~')));
  const byCounty = new Map();
  for (const x of sites) {
    const k = x.county || 'County not resolved';
    byCounty.set(k, (byCounty.get(k) || 0) + 1);
  }
  const counties = [...byCounty.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const topCounty = counties[0];
  const oper = Number(s.c.operating) || 0;
  const uc = Number(s.c.under_construction) || 0;
  const ann = Number(s.c.announced) || 0;
  const national = Number(dc.counts.sites) || ranked.reduce((a, x) => a + x.total, 0);
  const sd = (ri.drought_by_state || {})[s.ab];
  const sdHead = sd && sd.headline && sd.headline.category && sd.headline.category !== 'none'
    ? `${sd.headline.category} drought covers ${Number(sd.headline.area_pct).toFixed(1)}% of ${s.name} on the US Drought Monitor map of ${sd.map_date}.`
    : '';
  const dCounty = (fips) => {
    const r = fips && (ri.drought_by_county || {})[fips];
    return r && r.headline && r.headline.category ? r.headline.category : '';
  };
  const named = sites.filter((x) => x.name).length;

  const lede = `${N(s.total)} data centers are mapped in ${s.name} in OpenStreetMap: ${N(oper)} operating`
    + `${uc ? `, ${N(uc)} under construction` : ''}${ann ? `, ${N(ann)} proposed` : ''}. `
    + `That ranks ${s.name} ${ordinal(rankIdx + 1)} of the ${N(ranked.length)} states with a page here, `
    + `with ${pct(national ? s.total / national : null)} of every US site mapped.`;

  const rows = sites.map((x) => `<tr>
      <td>${x.name ? esc(x.name) : '<i>Unnamed</i>'}${x.operator && x.operator !== x.name ? `<br><small>${esc(x.operator)}</small>` : ''}</td>
      <td>${esc([x.addr && x.addr.city, x.county].filter(Boolean).join(', ') || '—')}</td>
      <td>${esc(STATUS_WORD[x.status] || x.status || '—')}</td>
      <td class="n">${esc(dCounty(x.county_fips) || '—')}</td>
      <td>${x.osm ? `<a href="https://www.openstreetmap.org/${esc(x.osm)}" rel="noopener nofollow">map</a>` : ''}</td>
    </tr>`).join('');

  const main = `${CSS}<article class="ent">
  <p class="ent__eb">Data centers · ${esc(s.name)} · a ${esc(brand.NAME)} register</p>
  <h1>Data centers in ${esc(s.name)}</h1>
  <p class="ent__lede">${esc(lede)}</p>
  <ul class="ent__kpis">
    <li><b>${N(s.total)}</b><span>sites mapped</span></li>
    <li><b>${N(uc)}</b><span>under construction</span></li>
    <li><b>${N(counties.length)}</b><span>counties with a site</span></li>
    ${topCounty ? `<li><b>${N(topCounty[1])}</b><span>in ${esc(topCounty[0])}, the most</span></li>` : ''}
  </ul>
  ${sdHead ? `<p class="ent__note">${esc(sdHead)} Each site below carries its own county's category.</p>` : ''}
  <p class="ent__note">${esc((dc.honesty || [])[0] || '')} <a href="${esc(ctx.href('/map.html'))}">See every US site on the map →</a></p>

  <h2>${esc(s.name)} counties, ranked</h2>
  <div class="ent__tw"><table>
    <thead><tr><th>County</th><th>Sites mapped</th><th>Share of state</th></tr></thead>
    <tbody>${counties.map(([k, v]) => `<tr><td>${esc(k)}</td><td class="n">${N(v)}</td><td class="n">${pct(v / s.total)}</td></tr>`).join('')}</tbody>
  </table></div>

  <h2>Every mapped site in ${esc(s.name)}</h2>
  <p class="ent__note">${N(named)} of ${N(s.total)} carry a name in OpenStreetMap. Drought is the county's
    US Drought Monitor category (D0 abnormally dry to D4 exceptional); it is not a measure of the site's own water use.</p>
  <div class="ent__tw"><table>
    <thead><tr><th>Site and operator</th><th>Place</th><th>Status</th><th>Drought</th><th></th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>

  <p class="ent__note">Data: © OpenStreetMap contributors (ODbL); US Drought Monitor. Compiled ${esc(utc(dc.generated_at))}.</p>
  <p class="ent__note">${neighbours(ctx, ranked, rankIdx, dcStatePath, (x) => N(x.total))} · <a href="${esc(ctx.href('/map.html'))}#dc-by-state">All states</a></p>
</article>`;

  return page({
    ctx,
    path: dcStatePath(s),
    title: `Data Centers in ${s.name}: ${N(s.total)} Mapped${s.name.length <= 12 ? ', by County' : ''} · ${brand.NAME}`,
    ogTitle: `${brand.NAME}: ${N(s.total)} data centers mapped in ${s.name}`,
    description: `${N(s.total)} data centers mapped in ${s.name}${uc ? `, ${N(uc)} under construction` : ''}`
      + `${topCounty ? `; ${topCounty[0]} has the most (${N(topCounty[1])})` : ''}. Every site by county, with local drought.`,
    breadcrumb: `Data centers in ${s.name}`,
    crumbParent: { name: 'US Data Center Map', path: '/map.html' },
    ogImage: ctx.cardFor ? ctx.cardFor('map') : null,
    jsonld: [{
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: `Data centers mapped in ${s.name}, by county`,
      description: `Data center sites tagged in OpenStreetMap within ${s.name}, with status, county and the county's US Drought Monitor category. A count of mapped sites, not a census.`,
      url: ctx.url(dcStatePath(s)),
      license: 'https://www.openstreetmap.org/copyright',
      creditText: '© OpenStreetMap contributors',
      creator: { '@type': 'Organization', name: brand.NAME, url: ctx.url('/') },
      isPartOf: { '@type': 'Dataset', url: ctx.url('/map.html') },
      spatialCoverage: { '@type': 'Place', name: `${s.name}, United States` },
      dateModified: dc.generated_at,
      isAccessibleForFree: true,
      variableMeasured: [
        { '@type': 'PropertyValue', name: 'sites mapped', value: s.total },
        { '@type': 'PropertyValue', name: 'sites under construction', value: uc },
      ],
    }],
    main,
  });
}

// ---------------------------------------------------------------------------
// One page per frontier lab
// ---------------------------------------------------------------------------

function labs(ctx) {
  const r = ctx && ctx.race;
  if (!r || !Array.isArray(r.players)) return [];
  return r.players.filter((p) => p && p.name && p.id && slug(p.id))
    .slice().sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
}

export function labPath(p) { return `/race/${slug(p.id)}.html`; }

/** The /race page's link block. */
export function labIndex(ctx) {
  const list = labs(ctx);
  if (!list.length) return '';
  return `${CSS}<section class="ent" aria-labelledby="race-labs">
  <h2 id="race-labs">Each lab, on its own page</h2>
  <ul class="ent__links">${list.map((p) => `<li><a href="${esc(ctx.href(labPath(p)))}">${esc(p.name)}</a> <span>${p.market && p.market.state === 'live' ? pct(p.market.probability) : '—'}</span></li>`).join('')}</ul>
</section>`;
}

export function labPages(ctx) {
  const list = labs(ctx);
  return list.map((p, i) => ({ rel: labPath(p).slice(1), html: renderLab(ctx, p, i, list) }));
}

function storiesFor(ctx, p) {
  const ents = new Set(((p.mindshare && p.mindshare.entities) || [p.name]).map((e) => String(e).toLowerCase()));
  const items = (ctx.news && Array.isArray(ctx.news.items)) ? ctx.news.items : [];
  return items
    .filter((it) => Array.isArray(it.entities) && it.entities.some((e) => ents.has(String(e).toLowerCase())))
    .sort((a, b) => String(b.published_at).localeCompare(String(a.published_at)))
    .slice(0, 12);
}

function renderLab(ctx, p, idx, list) {
  const race = ctx.race;
  const m = p.market || {};
  const live = m.state === 'live' && Number.isFinite(Number(m.probability));
  const gh = (p.shipping && p.shipping.github) || {};
  const ms = p.mindshare || {};
  const stories = storiesFor(ctx, p);
  const ev = m.horizon_event || {};

  const lede = live
    ? `${p.name} is ranked ${ordinal(p.rank)} of ${N(list.length)} frontier labs on the prediction market for the best AI model at the end of 2026, at ${pct(m.probability)}`
      + `${m.change_7d_state === 'live' ? ` (${signedPts(m.change_7d)} over 7 days)` : ''}.`
    : `${p.name} has no live price on the ranking market in this build.`;

  const main = `${CSS}<article class="ent">
  <p class="ent__eb">The race · ${esc(p.name)} · a ${esc(brand.NAME)} watch</p>
  <h1>${esc(p.name)}: AI model odds and news</h1>
  <p class="ent__lede">${esc(lede)}</p>
  <ul class="ent__kpis">
    <li><b>${live ? pct(m.probability) : '—'}</b><span>best-model odds, end 2026</span></li>
    <li><b>${m.change_7d_state === 'live' ? signedPts(m.change_7d) : '—'}</b><span>7-day change</span></li>
    <li><b>${gh.state === 'live' ? `${gh.is_floor ? '≥' : ''}${N(gh.releases_30d)}` : '—'}</b><span>GitHub releases, 30 days</span></li>
    <li><b>${ms.state === 'live' ? pct(ms.share) : '—'}</b><span>share of the newsroom</span></li>
  </ul>
  <p class="ent__note">The odds are other people's money on a public market${ev.url ? ` (<a href="${esc(ev.url)}" rel="noopener nofollow">${esc(ev.title || 'Polymarket')}</a>)` : ''}, not ${esc(brand.NAME)}'s judgement.
    Releases count public GitHub releases across ${N(gh.repos_total)} of the lab's repositories; newsroom share is the fraction of scored stories that name ${esc(p.name)}.
    ${p.principal ? `${esc(p.principal)} (${esc(p.principal_role || 'principal')}) is the lab's public principal.` : ''}</p>

  <h2>Latest ${esc(p.name)} news</h2>
  ${stories.length ? `<ol class="ent__news">${stories.map((it) => `<li><a href="${esc(ctx.href(`/item/${slugFor(it)}.html`))}">${esc(serpHeadline(it.title, 140))}</a>
      <small>· ${esc(it.source)} · ${esc(utc(it.published_at))}${Number.isFinite(Number(it.score)) ? ` · scored ${Number(it.score).toFixed(1)}` : ''}</small></li>`).join('')}</ol>`
    : `<p class="ent__note">No story in the current window names ${esc(p.name)}.</p>`}

  <p class="ent__note">Compiled ${esc(utc(race.generated_at))}. <a href="${esc(ctx.href('/race.html'))}">The full race board →</a> · <a href="${esc(ctx.href('/news.html'))}">All AI news →</a></p>
  <p class="ent__note">${neighbours(ctx, list, idx, labPath, (x) => (x.market && x.market.state === 'live' ? pct(x.market.probability) : '—'))} · <a href="${esc(ctx.href('/race.html'))}#race-labs">All labs</a></p>
</article>`;

  return page({
    ctx,
    path: labPath(p),
    title: `${p.name} Odds and News: ${live ? `${pct(m.probability)} to Lead AI` : 'The AI Race'} · ${brand.NAME}`,
    ogTitle: `${brand.NAME}: ${p.name} in the AI race`,
    description: `${p.name}${live ? ` holds ${pct(m.probability)} odds of the best AI model at end of 2026` : ' in the AI race'}`
      + `${m.change_7d_state === 'live' ? ` (${signedPts(m.change_7d)} in 7 days)` : ''}. Latest ${p.name} news, releases and newsroom share, hourly.`,
    breadcrumb: p.name,
    crumbParent: { name: 'Best AI Model Odds', path: '/race.html' },
    ogImage: (ctx.cardFor && ctx.cardFor('race')) || null,
    jsonld: [{
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${p.name}: AI model odds and news`,
      url: ctx.url(labPath(p)),
      dateModified: race.generated_at,
      about: { '@type': 'Organization', name: p.name },
      ...(stories.length ? { hasPart: stories.slice(0, 10).map((it) => ({ '@type': 'WebPage', name: it.title, url: ctx.url(`/item/${slugFor(it)}.html`) })) } : {}),
    }],
    main,
  });
}

// ---------------------------------------------------------------------------

function neighbours(ctx, list, i, pathOf, label) {
  const prev = list[i - 1];
  const next = list[i + 1];
  return [
    prev ? `<a href="${esc(ctx.href(pathOf(prev)))}">← ${esc(prev.name)} (${esc(label(prev))})</a>` : '',
    next ? `<a href="${esc(ctx.href(pathOf(next)))}">${esc(next.name)} (${esc(label(next))}) →</a>` : '',
  ].filter(Boolean).join(' · ');
}

function ordinal(k) {
  const n = Number(k);
  if (!Number.isFinite(n)) return String(k);
  const v = n % 100;
  return `${n}${(v >= 11 && v <= 13) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th')}`;
}
