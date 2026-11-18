// STATE PAGES. Two families of indexable pages answering searches people
// actually type, which /flock and /map answer only deep inside a long table:
//
//   /flock/<state>.html  "Flock cameras in Ohio"   every county, ranked
//   /datacenters/<state>.html  "data centers in Virginia"  every mapped site
//
// Plus a hub for each (/flock/, /datacenters/). Every number comes from
// data/flock.json and data/datacenters.json exactly as the parent pages read
// them; nothing here is a new measurement. A state with no camera mapped, or
// fewer than DC_MIN data center sites, gets no page: a page about nothing is
// thin, and it stays one row on the parent page. Both families return [] when
// their file is absent, the same rule the parent pages keep.

import { esc, utc } from './_html.mjs';
import { page } from './layout.mjs';
import { breadcrumbs } from './_seo.mjs';
import * as brand from '../brand.mjs';

export const DC_MIN = 3;

const N = (n) => Number(n || 0).toLocaleString('en-US');
const pct = (v, dp = 1) => (Number.isFinite(v) ? `${(v * 100).toFixed(dp)}%` : '—');
export const slug = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const ordinal = (n) => {
  const v = n % 100;
  return `${n}${(v >= 11 && v <= 13) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th')}`;
};
// What the Census calls a county-equivalent has a local name in two places.
const unitsFor = (ab) => (ab === 'LA' ? ['parish', 'parishes']
  : ab === 'PR' ? ['municipio', 'municipios']
    : ab === 'AK' ? ['borough', 'boroughs'] : ['county', 'counties']);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
// "in the District of Columbia" in running text; headings keep the bare name.
const inName = (n) => (/^District of Columbia$/.test(n) ? `the ${n}` : n);

const CSS = `<style>
.stp{max-width:72rem;margin:0 auto;padding:0 16px}
.stp__eb{font:600 .75rem/1.2 ui-monospace,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase;opacity:.8;margin:1.5rem 0 .5rem}
.stp h1{margin:0 0 .75rem}
.stp__lede{font-size:1.08rem;line-height:1.6;max-width:68ch}
.stp__note{opacity:.82;font-size:.92rem;line-height:1.55;max-width:72ch}
.stp__kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:1rem 0 1.5rem;padding:0;list-style:none}
.stp__kpis li{border:1px solid rgba(127,140,160,.35);border-radius:8px;padding:10px 12px}
.stp__kpis b{display:block;font:700 1.4rem/1.1 ui-monospace,Menlo,monospace}
.stp__kpis span{font-size:.8rem;opacity:.8}
.stp__tw{overflow-x:auto;margin:.75rem 0 1.25rem}
.stp table{border-collapse:collapse;width:100%;font-size:.92rem}
.stp th,.stp td{text-align:left;padding:6px 10px;border-bottom:1px solid rgba(127,140,160,.25);vertical-align:top}
.stp thead th{font:600 .75rem/1.2 ui-monospace,Menlo,monospace;letter-spacing:.08em;text-transform:uppercase;opacity:.8}
.stp td.n{font-variant-numeric:tabular-nums;white-space:nowrap}
.stp__links{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:4px 18px;list-style:none;padding:0;margin:.5rem 0 1.25rem}
.stp__links li{display:flex;justify-content:space-between;gap:8px;border-bottom:1px solid rgba(127,140,160,.25);padding:5px 0}
.stp__links span{opacity:.75;font-variant-numeric:tabular-nums}
</style>`;

function neighbours(ctx, list, i, pathOf, label) {
  const prev = list[i - 1];
  const next = list[i + 1];
  return [
    prev ? `<a href="${esc(ctx.href(pathOf(prev)))}">← ${esc(prev.name)} (${esc(label(prev))})</a>` : '',
    next ? `<a href="${esc(ctx.href(pathOf(next)))}">${esc(next.name)} (${esc(label(next))}) →</a>` : '',
  ].filter(Boolean).join(' · ');
}

// ---------------------------------------------------------------------------
// Flock cameras by state
// ---------------------------------------------------------------------------

export function flockStates(ctx) {
  const f = ctx && ctx.routes && ctx.routes.flock ? ctx.flock : null;
  if (!f || !Array.isArray(f.states) || !f.copy) return [];
  return f.states
    .filter((s) => Number(s.cameras_mapped) > 0 && slug(s.name))
    .slice().sort((a, b) => Number(b.cameras_mapped) - Number(a.cameras_mapped) || a.name.localeCompare(b.name));
}
export const flockStatePath = (s) => `/flock/${slug(s.name)}.html`;

export function renderFlockState(ctx, s, i, ranked) {
  const f = ctx.flock;
  const q = String(f.copy.headline_qualifier || '');
  const asOf = (q.match(/\d{4}-\d{2}-\d{2}/) || [])[0] || '';
  const n = Number(s.cameras_mapped);
  const national = Number(f.totals && f.totals.in_a_us_county) || ranked.reduce((a, x) => a + Number(x.cameras_mapped), 0);
  const rows = (Array.isArray(f.counties) ? f.counties : []).filter((r) => r[2] === s.state);
  const mapped = rows.filter((r) => Number(r[3]) > 0).sort((a, b) => Number(b[3]) - Number(a[3]) || String(a[1]).localeCompare(String(b[1])));
  const none = rows.filter((r) => !(Number(r[3]) > 0)).sort((a, b) => String(a[1]).localeCompare(String(b[1])));
  const [unit, units] = unitsFor(s.state);
  const single = rows.length <= 1;
  const top = mapped[0];
  const path = flockStatePath(s);

  const lede = `${N(n)} Flock Safety license-plate reader cameras are mapped in OpenStreetMap in ${inName(s.name)}${asOf ? ` as of ${asOf}` : ''}`
    + (single ? '. ' : `, in ${N(s.counties_with_mapped_cameras)} of its ${N(s.counties_total)} ${units}. `)
    + `That ranks ${inName(s.name)} ${ordinal(i + 1)} of ${N(ranked.length)} states and territories, with ${pct(national ? n / national : NaN)} of all those mapped in a US county.`;

  const main = `${CSS}<article class="stp">
  <p class="stp__eb">Plate readers · ${esc(s.name)} · a ${esc(brand.NAME)} register</p>
  <h1>Flock cameras in ${esc(s.name)}</h1>
  <p class="stp__lede">${esc(lede)}</p>
  <ul class="stp__kpis">
    <li><b>${N(n)}</b><span>Flock cameras mapped</span></li>
    <li><b>${ordinal(i + 1)}</b><span>of ${N(ranked.length)} states</span></li>
    ${single ? '' : `<li><b>${N(mapped.length)}/${N(rows.length)}</b><span>${esc(units)} with one mapped</span></li>`}
    ${top && !single ? `<li><b>${N(top[3])}</b><span>in ${esc(top[1])}, the most</span></li>` : ''}
  </ul>
  <p class="stp__note"><b>Read this first:</b> ${esc(f.copy.empty_state || 'A county with no pins is a county nobody has mapped. It is not a county with no cameras.')}
    These are cameras volunteers have tagged in OpenStreetMap, not a count from Flock Safety or any police department.
    <a href="${esc(ctx.href('/flock.html'))}">See ${esc(s.name)} on the national map →</a></p>
  ${single ? '' : `<h2>${esc(s.name)} ${esc(units)}, ranked by Flock cameras mapped</h2>
  <div class="stp__tw"><table>
    <thead><tr><th>#</th><th>${esc(cap(unit))}</th><th>Cameras mapped</th><th>Share of state</th></tr></thead>
    <tbody>${mapped.map((r, k) => `<tr><td class="n">${k + 1}</td><td>${esc(r[1])}</td><td class="n">${N(r[3])}</td><td class="n">${pct(Number(r[3]) / n)}</td></tr>`).join('')}</tbody>
  </table></div>
  ${none.length ? `<h2>${esc(cap(units))} in ${esc(s.name)} with no Flock camera mapped</h2>
  <p class="stp__note">${none.map((r) => esc(r[1])).join(', ')}.</p>` : ''}`}
  ${Number(s.direction_present) > 0 ? `<p class="stp__note">${N(s.direction_present)} of the ${N(n)} carry a compass bearing for the way the lens faces (${pct(Number(s.direction_present) / n)}).</p>` : ''}
  <p class="stp__note">Data: ${esc(f.copy.attribution_required || '© OpenStreetMap contributors')},
    <a href="${esc(f.copy.attribution_url || 'https://www.openstreetmap.org/copyright')}" rel="noopener">ODbL</a>. Compiled ${esc(utc(f.generated_at))}.</p>
  <p class="stp__note">${neighbours(ctx, ranked, i, flockStatePath, (x) => N(x.cameras_mapped))} · <a href="${esc(ctx.href('/flock/'))}">All states</a></p>
</article>`;

  const title = `Flock Cameras in ${s.name}: ${N(n)} Mapped${single || s.name.length > 13 ? '' : `, by ${cap(unit)}`} · ${brand.NAME}`;
  const description = `${N(n)} Flock license-plate reader cameras mapped in ${inName(s.name)}${asOf ? ` as of ${asOf}` : ''}`
    + (single || !top ? '' : `, ${unit} by ${unit}; ${top[1]} has the most (${N(top[3])})`)
    + '. From OpenStreetMap.';
  return page({
    ctx, path, title, description,
    jsonld: [{
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: `Flock Safety ALPR cameras mapped in ${s.name}, by ${unit}`,
      description: `License-plate-reader cameras attributed to Flock Safety in OpenStreetMap within ${s.name}, counted by ${unit}. A count of mapped objects, not of cameras that exist.`,
      url: ctx.url(path),
      license: 'https://opendatacommons.org/licenses/odbl/',
      creditText: f.copy.attribution_required || '© OpenStreetMap contributors',
      creator: { '@type': 'Organization', name: brand.NAME, url: ctx.url('/') },
      isPartOf: { '@type': 'Dataset', url: ctx.url('/flock.html') },
      spatialCoverage: { '@type': 'Place', name: `${s.name}, United States` },
      dateModified: f.generated_at,
      isAccessibleForFree: true,
      variableMeasured: [{ '@type': 'PropertyValue', name: 'Flock cameras mapped', value: n }],
    }, breadcrumbs(ctx, [
      { name: 'Flock camera map', path: '/flock.html' },
      { name: 'By state', path: '/flock/' },
      { name: s.name, path },
    ])],
    main,
  });
}

export function renderFlockIndex(ctx) {
  const list = flockStates(ctx);
  const f = ctx.flock;
  const alpha = list.slice().sort((a, b) => a.name.localeCompare(b.name));
  const total = list.reduce((a, x) => a + Number(x.cameras_mapped), 0);
  const main = `${CSS}<article class="stp">
  <p class="stp__eb">Plate readers · by state · a ${esc(brand.NAME)} register</p>
  <h1>Flock cameras by state</h1>
  <p class="stp__lede">${N(total)} Flock Safety license-plate reader cameras are mapped in OpenStreetMap across ${N(list.length)} US states and territories. The most are in ${list.slice(0, 3).map((s) => `${esc(s.name)} (${N(s.cameras_mapped)})`).join(', ')}. Pick a state for every county.</p>
  <ul class="stp__links">${alpha.map((s) => `<li><a href="${esc(ctx.href(flockStatePath(s)))}">${esc(s.name)}</a> <span>${N(s.cameras_mapped)}</span></li>`).join('')}</ul>
  <p class="stp__note">${esc(f.copy.empty_state || '')} <a href="${esc(ctx.href('/flock.html'))}">The national Flock camera map →</a></p>
</article>`;
  return page({
    ctx, path: '/flock/',
    title: `Flock Cameras by State: ${N(total)} Mapped · ${brand.NAME}`,
    description: `How many Flock license-plate readers are in each US state: ${N(total)} mapped in OpenStreetMap across ${N(list.length)} states and territories, county by county.`,
    jsonld: [breadcrumbs(ctx, [{ name: 'Flock camera map', path: '/flock.html' }, { name: 'By state', path: '/flock/' }])],
    main,
  });
}

/** The /flock page's link block. '' with no state pages. */
export function flockStateLinks(ctx) {
  const alpha = flockStates(ctx).slice().sort((a, b) => a.name.localeCompare(b.name));
  if (!alpha.length) return '';
  return `${CSS}<section class="stp" aria-labelledby="flk-by-state"><h2 id="flk-by-state">Flock cameras by state</h2>
  <ul class="stp__links">${alpha.map((s) => `<li><a href="${esc(ctx.href(flockStatePath(s)))}">${esc(s.name)}</a> <span>${N(s.cameras_mapped)}</span></li>`).join('')}</ul></section>`;
}

// ---------------------------------------------------------------------------
// Data centers by state
// ---------------------------------------------------------------------------

const STATUS = { operating: 'Operating', under_construction: 'Under construction', announced: 'Proposed' };

export function dcStates(ctx) {
  const dc = ctx && ctx.datacenters;
  if (!dc || !Array.isArray(dc.sites) || !dc.counts || !dc.counts.by_state) return [];
  const names = {};
  for (const s of dc.sites) if (s.state && s.state_name) names[s.state] = s.state_name;
  return Object.entries(dc.counts.by_state)
    .map(([ab, c]) => ({ ab, name: names[ab], total: Number(c.total) || 0, c }))
    .filter((s) => s.name && s.total >= DC_MIN && slug(s.name))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}
export const dcStatePath = (s) => `/datacenters/${slug(s.name)}.html`;

export function renderDcState(ctx, s, i, ranked) {
  const dc = ctx.datacenters;
  const ri = dc.resources_index || {};
  const path = dcStatePath(s);
  const [unit, units] = unitsFor(s.ab);
  const sites = dc.sites.filter((x) => x.state === s.ab)
    .sort((a, b) => String(a.county || '~').localeCompare(String(b.county || '~')) || String(a.name || '~').localeCompare(String(b.name || '~')));
  const byCounty = new Map();
  for (const x of sites) { const k = x.county || `${cap(unit)} not resolved`; byCounty.set(k, (byCounty.get(k) || 0) + 1); }
  const counties = [...byCounty.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const top = counties[0];
  const oper = Number(s.c.operating) || 0;
  const uc = Number(s.c.under_construction) || 0;
  const ann = Number(s.c.announced) || 0;
  const national = Number(dc.counts.sites) || dc.sites.length;
  const sd = (ri.drought_by_state || {})[s.ab];
  const sdLine = sd && sd.headline && sd.headline.category && sd.headline.category !== 'none'
    ? `${sd.headline.category} drought or worse covers ${Number(sd.headline.area_pct).toFixed(1)}% of ${s.name} on the US Drought Monitor map of ${sd.map_date || ri.usdm_map_date}.` : '';
  const dCounty = (fips) => {
    const r = fips && (ri.drought_by_county || {})[fips];
    return r && r.headline && r.headline.category && r.headline.category !== 'none' ? r.headline.category : 'None';
  };
  const lede = `${N(s.total)} data centers are mapped in ${s.name} in OpenStreetMap: ${N(oper)} operating`
    + `${uc ? `, ${N(uc)} under construction` : ''}${ann ? `, ${N(ann)} proposed` : ''}. `
    + `That ranks ${s.name} ${ordinal(i + 1)} of ${N(ranked.length)} states with a page here, with ${pct(national ? s.total / national : NaN)} of every US site mapped.`;
  const main = `${CSS}<article class="stp">
  <p class="stp__eb">Data centers · ${esc(s.name)} · a ${esc(brand.NAME)} register</p>
  <h1>Data centers in ${esc(s.name)}</h1>
  <p class="stp__lede">${esc(lede)}</p>
  <ul class="stp__kpis">
    <li><b>${N(s.total)}</b><span>sites mapped</span></li>
    <li><b>${N(uc)}</b><span>under construction</span></li>
    <li><b>${N(counties.length)}</b><span>${esc(units)} with a site</span></li>
    ${top ? `<li><b>${N(top[1])}</b><span>in ${esc(top[0])}, the most</span></li>` : ''}
  </ul>
  ${sdLine ? `<p class="stp__note">${esc(sdLine)} Each site below carries its own ${esc(unit)}'s category.</p>` : ''}
  <p class="stp__note">${esc((dc.honesty || [])[0] || '')} <a href="${esc(ctx.href('/map.html'))}">See every US data center on the map →</a></p>
  <h2>${esc(s.name)} ${esc(units)}, ranked by data centers</h2>
  <div class="stp__tw"><table>
    <thead><tr><th>${esc(cap(unit))}</th><th>Sites mapped</th><th>Share of state</th></tr></thead>
    <tbody>${counties.map(([k, v]) => `<tr><td>${esc(k)}</td><td class="n">${N(v)}</td><td class="n">${pct(v / s.total)}</td></tr>`).join('')}</tbody>
  </table></div>
  <h2>Every mapped data center in ${esc(s.name)}</h2>
  <p class="stp__note">Drought is the ${esc(unit)}'s US Drought Monitor category (D0 abnormally dry to D4 exceptional), not a measure of the site's own water use.</p>
  <div class="stp__tw"><table>
    <thead><tr><th>Site and operator</th><th>Place</th><th>Status</th><th>Drought</th><th></th></tr></thead>
    <tbody>${sites.map((x) => `<tr><td>${x.name ? esc(x.name) : '<i>Unnamed site</i>'}${x.operator && x.operator !== x.name ? `<br><small>${esc(x.operator)}</small>` : ''}</td>
      <td>${esc([x.addr && x.addr.city, x.county].filter(Boolean).join(', ') || '—')}</td>
      <td>${esc(STATUS[x.status] || x.status || '—')}</td><td class="n">${esc(dCounty(x.county_fips))}</td>
      <td>${x.osm ? `<a href="https://www.openstreetmap.org/${esc(x.osm)}" rel="noopener nofollow">map</a>` : ''}</td></tr>`).join('')}</tbody>
  </table></div>
  <p class="stp__note">Data: © OpenStreetMap contributors (ODbL); US Drought Monitor. Compiled ${esc(utc(dc.generated_at))}.</p>
  <p class="stp__note">${neighbours(ctx, ranked, i, dcStatePath, (x) => N(x.total))} · <a href="${esc(ctx.href('/datacenters/'))}">All states</a></p>
</article>`;
  return page({
    ctx, path,
    title: `Data Centers in ${s.name}: ${N(s.total)} Mapped${s.name.length <= 12 ? ', by County' : ''} · ${brand.NAME}`,
    description: `${N(s.total)} data centers mapped in ${s.name}${uc ? `, ${N(uc)} under construction` : ''}`
      + `${top ? `; ${top[0]} has the most (${N(top[1])})` : ''}. Every site, ${unit} by ${unit}, with local drought.`,
    jsonld: [{
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: `Data centers mapped in ${s.name}, by ${unit}`,
      description: `Data center sites tagged in OpenStreetMap within ${s.name}, with status, ${unit} and the ${unit}'s US Drought Monitor category. A count of mapped sites, not a census.`,
      url: ctx.url(path),
      license: 'https://opendatacommons.org/licenses/odbl/',
      creditText: '© OpenStreetMap contributors',
      creator: { '@type': 'Organization', name: brand.NAME, url: ctx.url('/') },
      isPartOf: { '@type': 'Dataset', url: ctx.url('/map.html') },
      spatialCoverage: { '@type': 'Place', name: `${s.name}, United States` },
      dateModified: dc.generated_at,
      isAccessibleForFree: true,
      variableMeasured: [
        { '@type': 'PropertyValue', name: 'data centers mapped', value: s.total },
        { '@type': 'PropertyValue', name: 'under construction', value: uc },
      ],
    }, breadcrumbs(ctx, [
      { name: 'US data center map', path: '/map.html' },
      { name: 'By state', path: '/datacenters/' },
      { name: s.name, path },
    ])],
    main,
  });
}

export function renderDcIndex(ctx) {
  const list = dcStates(ctx);
  const alpha = list.slice().sort((a, b) => a.name.localeCompare(b.name));
  const total = list.reduce((a, x) => a + x.total, 0);
  const uc = list.reduce((a, x) => a + (Number(x.c.under_construction) || 0), 0);
  const main = `${CSS}<article class="stp">
  <p class="stp__eb">Data centers · by state · a ${esc(brand.NAME)} register</p>
  <h1>Data centers by state</h1>
  <p class="stp__lede">${N(total)} data centers are mapped in OpenStreetMap across the ${N(list.length)} US states with at least ${DC_MIN} sites, ${N(uc)} of them under construction. The most are in ${list.slice(0, 3).map((s) => `${esc(s.name)} (${N(s.total)})`).join(', ')}. Pick a state for every site, with local drought.</p>
  <ul class="stp__links">${alpha.map((s) => `<li><a href="${esc(ctx.href(dcStatePath(s)))}">${esc(s.name)}</a> <span>${N(s.total)}</span></li>`).join('')}</ul>
  <p class="stp__note">${esc((ctx.datacenters.honesty || [])[0] || '')} <a href="${esc(ctx.href('/map.html'))}">The US data center map →</a></p>
</article>`;
  return page({
    ctx, path: '/datacenters/',
    title: `Data Centers by State: ${N(total)} US Sites Mapped · ${brand.NAME}`,
    description: `How many data centers are in each US state: ${N(total)} mapped in OpenStreetMap, ${N(uc)} under construction, with county drought for every site.`,
    jsonld: [breadcrumbs(ctx, [{ name: 'US data center map', path: '/map.html' }, { name: 'By state', path: '/datacenters/' }])],
    main,
  });
}

/** The /map page's link block. '' with no state pages. */
export function dcStateLinks(ctx) {
  const alpha = dcStates(ctx).slice().sort((a, b) => a.name.localeCompare(b.name));
  if (!alpha.length) return '';
  return `${CSS}<section class="stp" aria-labelledby="dc-by-state"><h2 id="dc-by-state">Data centers by state</h2>
  <ul class="stp__links">${alpha.map((s) => `<li><a href="${esc(ctx.href(dcStatePath(s)))}">${esc(s.name)}</a> <span>${N(s.total)}</span></li>`).join('')}</ul></section>`;
}

// ---------------------------------------------------------------------------

/** Every page this module writes, as { rel, html }. */
export function allPages(ctx) {
  const out = [];
  const fl = flockStates(ctx);
  if (fl.length) {
    fl.forEach((s, i) => out.push({ rel: flockStatePath(s).slice(1), html: renderFlockState(ctx, s, i, fl) }));
    out.push({ rel: 'flock/index.html', html: renderFlockIndex(ctx) });
  }
  const dcs = dcStates(ctx);
  if (dcs.length) {
    dcs.forEach((s, i) => out.push({ rel: dcStatePath(s).slice(1), html: renderDcState(ctx, s, i, dcs) }));
    out.push({ rel: 'datacenters/index.html', html: renderDcIndex(ctx) });
  }
  return out;
}

export function sitemapEntries(ctx) {
  const out = [];
  const fl = flockStates(ctx);
  if (fl.length) {
    const lm = ctx.flock.generated_at;
    out.push({ loc: '/flock/', changefreq: 'weekly', priority: '0.75', lastmod: lm });
    for (const s of fl) out.push({ loc: flockStatePath(s), changefreq: 'weekly', priority: '0.7', lastmod: lm });
  }
  const dcs = dcStates(ctx);
  if (dcs.length) {
    const lm = ctx.datacenters.generated_at;
    out.push({ loc: '/datacenters/', changefreq: 'daily', priority: '0.75', lastmod: lm });
    for (const s of dcs) out.push({ loc: dcStatePath(s), changefreq: 'daily', priority: '0.7', lastmod: lm });
  }
  return out;
}
