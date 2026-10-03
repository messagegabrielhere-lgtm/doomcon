// /world.html — THE PLANET. Every datacentre OpenStreetMap has, on one map,
// attributed to a country and counted; and, under it, the register of what is
// claimed to be computing in orbit.
//
// Reads data/world.json (collector/world.mjs), data/world-outline.json (the
// Natural Earth outlines the map is drawn with) and data/orbital.json (the
// orbital register). Server-rendered, deterministic: identical inputs produce
// byte-identical HTML. Nothing in this file reads a clock.
//
// ---------------------------------------------------------------------------
// WHY THIS PAGE IS ORDERED THE WAY IT IS
// ---------------------------------------------------------------------------
// Same argument as /map and /flock, at planetary scale. A dot map of the world
// with 5,274 pins on it looks like a census of the industry, and it is a
// count of what volunteers have typed into OpenStreetMap. Every blank country
// on it is an assertion the data cannot make. So the order is: what was
// counted, then WHAT THE BLANK MEANS, then the map — the caveat sits above
// the picture, in the same slot the limitation paragraph occupies on /map,
// before a reader has had a chance to form the wrong idea.
//
// ---------------------------------------------------------------------------
// WHAT THIS PAGE JOINS: NOTHING
// ---------------------------------------------------------------------------
// /map joins every US pin to a county, a drought category, a grid and a river
// gauge. No such join exists for the rest of the planet, and this page does
// not pretend one does: every pin is one size and one colour, the popup says
// the status and nothing else, and the United States figure here is not the
// figure on /map — that page keeps only what it can place in a county. The
// page says so rather than reconciling the two, because reconciling them
// would mean inventing a number.
//
// ---------------------------------------------------------------------------
// OFF THE PLANET
// ---------------------------------------------------------------------------
// The orbital register is on this page because it is the same question asked
// one layer up — where is the compute physically — with a much worse ratio
// of press release to hardware. data/orbital.json separates what is in space
// from what has been filed for, per programme, with the sources for both, and
// this page prints the two numbers TOGETHER in every place either appears.
// A page that printed the filed number alone would be repeating a filing.

import { esc, utc } from './_html.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';
import { worldModel, worldFigure, worldLegend, worldTable, worldMapCss } from './_worldmap.mjs';
import { STATUS_ORDER, STATUS_MARKS } from './_usmap.mjs';
import { iconSprite, icon as sheetIcon, dcIcon } from './_icons.mjs';

const PATH = '/world.html';

/** The figure id MAP_JS publishes the controller under: window.usMap.get(MAP_ID). */
const MAP_ID = 'wm';
/** The attribute the country links carry and the enhancement listens on. */
const GO_ATTR = 'data-wm-go';

const SPRITE = ['sec-map', 'sec-method', 'sec-signal', 'sec-api', 'sec-substrate',
  'dc-operating', 'dc-building', 'dc-announced'];

/**
 * THE ROUTE GATE. build.mjs decides whether public/world.html exists with this
 * predicate, and layout.mjs restates the data half of it for the nav. Every
 * clause is load-bearing: `copy.attribution_required` is the ODbL line, and a
 * page without it would be publishing OpenStreetMap data in breach of the
 * licence; `worldOutline.countries` is the land, and pins over nothing are a
 * scatter plot, not a map.
 */
export function hasWorldData(ctx) {
  return Boolean(
    ctx && ctx.world
    && Array.isArray(ctx.world.sites) && ctx.world.sites.length
    && ctx.world.totals
    && ctx.world.copy && ctx.world.copy.attribution_required
    && ctx.worldOutline
    && Array.isArray(ctx.worldOutline.countries) && ctx.worldOutline.countries.length,
  );
}

/** The orbital section renders only when there is a register to render. */
function hasOrbital(ctx) {
  return Boolean(ctx && ctx.orbital && Array.isArray(ctx.orbital.programmes) && ctx.orbital.programmes.length);
}

// ---------------------------------------------------------------------------
// Formatting. Longhand rather than toLocaleString so the build cannot depend
// on which ICU the container was compiled with.
// ---------------------------------------------------------------------------

function N(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  const neg = n < 0;
  const body = String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return neg ? `−${body}` : body;
}

/** A share already expressed 0..1, as a percentage. Never rounded up to 100. */
function pct(share, dp = 1) {
  const n = Number(share);
  if (!Number.isFinite(n)) return '—';
  const v = n * 100;
  if (v > 99.95 && v < 100) return '99.9%';
  return `${v.toFixed(dp)}%`;
}

/** A count that may be absent from the payload: the number, or the words. */
function count(v, missing) {
  return Number.isFinite(Number(v)) && v !== null ? N(v) : missing;
}

function icon(name) {
  if (name === 'operating' || name === 'under_construction' || name === 'announced') return dcIcon(name);
  return sheetIcon(name);
}

// ---------------------------------------------------------------------------
// The hero counters. Seven facts about seven DIFFERENT things; no cell is
// derivable from the cell beside it.
// ---------------------------------------------------------------------------

function counters(w, m) {
  const t = w.totals;
  const by = t.by_status || {};
  const q = String((w.copy && w.copy.headline_qualifier) || '');
  const cells = [
    { k: 'sec-map', n: N(t.sites), l: 'datacentres mapped', s: `${esc(q)}. Not a count of datacentres that exist.`, wide: true },
    {
      k: 'sec-substrate', n: count(t.countries_with_sites, '—'), l: 'countries with a site',
      s: `of ${count(t.countries_in_roster, 'an unpublished number')} in the roster. The other ${count(t.countries_with_none, '—')} have none mapped, which means nobody has mapped them.`,
    },
    { k: 'operating', n: count(by.operating, '—'), l: 'operating', s: 'a datacentre tag with no construction, proposed or planned qualifier' },
    { k: 'under_construction', n: count(by.under_construction, '—'), l: 'under construction', s: 'a construction tag, in OpenStreetMap' },
    { k: 'announced', n: count(by.announced, '—'), l: 'announced', s: 'a proposed or planned tag; located to the evidence, never more precisely' },
    {
      k: 'sec-map', n: t.sites ? pct(Number(t.in_united_states) / t.sites) : '—', l: 'in the United States',
      s: `${count(t.in_united_states, '—')} sites. Not the same count as <a href="__MAP_HREF__">/map</a>, which keeps only what it can place in a county.`,
    },
    {
      k: 'sec-signal', n: count(t.unresolved, '—'), l: 'in no country polygon',
      s: 'published as unresolved, never guessed. Drawn on the map where the coordinate is, with no country in the popup.',
    },
  ];
  return `<ul class="wld__c">${cells.map((x) => `<li class="wld__c__i${x.wide ? ' wld__c__i--wide' : ''}">
    <span class="wld__c__m">${icon(x.k)}</span>
    <b class="wld__c__n num">${esc(x.n)}</b>
    <span class="wld__c__l">${esc(x.l)}</span>
    <span class="wld__c__s">${x.s}</span>
  </li>`).join('')}</ul>`;
}

// A marker replaced once in render(), so four functions do not have to thread
// ctx for one href. Same device mapPage.mjs uses for its Watts link.
const MAP_HREF = '__MAP_HREF__';

// ---------------------------------------------------------------------------
// The caveat. Printed second, above the map.
// ---------------------------------------------------------------------------

function theCaveat(w) {
  const copy = w.copy || {};
  const asOf = w.as_of_date || 'the day it was read';
  return `<section class="wld__warn" aria-labelledby="wld-warn-h">
  <h2 class="wld__warn__h" id="wld-warn-h">${icon('sec-signal')} Read this before you read the map</h2>
  <p class="wld__warn__p wld__warn__p--lead">${esc(copy.what_zero_means || '')}</p>
  <p class="wld__warn__p">Every figure on this page counts map objects carrying a datacentre tag in
    OpenStreetMap on ${esc(asOf)}. Coverage follows volunteers, not deployments: a dense country is a
    country somebody mapped, and comparing two countries here is partly comparing how many people were
    looking.</p>
  <p class="wld__warn__p wld__warn__p--last">This page joins nothing; it counts. The United States figure
    here is not the figure on <a href="${MAP_HREF}">the United States map</a>, which keeps only the sites it
    can place in a county and joins them to drought, grid and river data. Both numbers are printed, and
    neither is adjusted toward the other.</p>
</section>`;
}

// ---------------------------------------------------------------------------
// The map, its caption, and the note that stands in for it at phone width.
// ---------------------------------------------------------------------------

function mapCaption(w, m) {
  const copy = w.copy || {};
  const t = m.totals;
  return `<b>${N(t.pinned)}</b> pins, Equal Earth projection, so Greenland is not drawn the size of Africa and
    Europe is not drawn the size of Asia. Shape is status; every pin is one size and one colour, because no
    other field is joined to a site outside the United States. Data
    <a href="${esc(copy.attribution_url || 'https://www.openstreetmap.org/copyright')}" rel="license noopener">${esc(copy.attribution_required || '© OpenStreetMap contributors')}</a>,
    ODbL v1.0. Outlines: ${esc(copy.outline_credit || 'Natural Earth')}`;
}

function mapSection(w, m) {
  const t = m.totals;
  return `<section class="wld__sec" id="the-map" aria-labelledby="wld-map-h">
  <h2 class="wld__sec__h" id="wld-map-h">${icon('sec-map')} The map
    <span class="wld__count num">${N(t.pinned)}</span></h2>
  <p class="wld__sec__l">One pin per mapped site, drawn exactly where OpenStreetMap places the object. The
    picture needs no JavaScript and every figure in it is a number in the table below. With it, the map pans
    and zooms, and hovering or tapping a pin names the site, its operator, its status and its place — or
    says which of those OpenStreetMap does not record.</p>
  <div class="wld__mapwrap">
    ${worldFigure(m, { id: MAP_ID, noun: 'datacentres', caption: mapCaption(w, m) })}
    <p class="wld__small">Below 760 pixels the map is drawn only once the script has wired up pinch and zoom:
      ${N(t.pinned)} pins on a 343-pixel picture is a smudge, and a smudge that cannot be read still looks
      authoritative. The table below carries every channel the map encodes except position.</p>
    ${worldLegend(m)}
  </div>
</section>`;
}

// ---------------------------------------------------------------------------
// By country. The continent split, the ranked table, and the countries drawn
// with nothing on them — named, because the blank is the finding.
// ---------------------------------------------------------------------------

function countrySection(w, m) {
  const t = m.totals;
  const withSite = new Set(m.countries.map((c) => c.iso2));
  // Drawn outlines carrying an ISO code that no site resolved to: the land a
  // reader sees blank. Listed from the outline file, in its order, so the list
  // is the map's own blank and not a paraphrase of it.
  const blank = m.lands.filter((l) => l.iso2 && !withSite.has(l.iso2));
  const conts = m.byContinent.map((c) => `<li><b>${esc(c.name)}</b>
      <span class="num">${N(c.count)}</span><span class="wld__cont__p num">${t.sites ? pct(c.count / t.sites) : '—'}</span></li>`).join('');
  const top = m.countries[0] || null;

  return `<section class="wld__sec" id="by-country" aria-labelledby="wld-country-h">
  <h2 class="wld__sec__h" id="wld-country-h">${icon('sec-substrate')} Every country with a mapped site
    <span class="wld__count num">${count(t.countriesWithSites, '—')}/${count(t.countriesInRoster, '—')}</span></h2>
  <p class="wld__sec__l">Ranked by sites mapped. ${top ? `${esc(top.name)} tops the ranking with ${N(top.total)} —
    ${t.sites ? pct(top.total / t.sites) : '—'} of every mapped site on Earth — and that is a fact about where
    OpenStreetMap's datacentre mappers are as much as about where datacentres are.` : ''} The
    ${count(t.countriesWithNone, '—')} countries in the roster with none mapped are not a tail of this ranking;
    they are outside it, because nobody has looked.</p>
  <ul class="wld__cont" aria-label="Mapped sites by continent">${conts}</ul>
  ${worldTable(m, { mapId: MAP_ID, goAttr: GO_ATTR })}
  ${blank.length ? `<p class="wld__sec__n"><b>Drawn, with no mapped site: ${N(blank.length)} outlines.</b>
    ${esc(blank.map((l) => l.name).join(', '))}. Each is land a reader sees blank on the map above, and each
    is a place nobody has mapped, not a place with nothing in it. The roster the collector counts against
    is larger (${count(t.countriesInRoster, '—')} entries) because it includes territories too small to
    draw at this scale.</p>` : ''}
</section>`;
}

// ---------------------------------------------------------------------------
// OFF THE PLANET. The orbital register, flown and filed printed together.
// ---------------------------------------------------------------------------

function orbitCounters(o) {
  const t = o.totals || {};
  const cells = [
    { n: count(t.in_orbit_spacecraft, 'not published'), l: 'spacecraft in orbit', s: 'carrying compute hardware, counted once — a hosted payload is not a second spacecraft' },
    { n: count(t.filed_or_planned_for_compute, 'not published'), l: 'filed or planned for compute', s: 'the sum of the programmes’ own filings and stated targets. Numbers on paper.' },
    { n: count(t.filed_to_flown_ratio, 'not published'), l: 'filed for every one flying', s: 'the second counter divided by the first' },
    { n: count(t.filed_purpose_unknown, 'not published'), l: 'filed, purpose unstated', s: 'listed with the purpose left blank rather than assigned to orbital compute' },
  ];
  return `<ul class="wld__c wld__c--orbit">${cells.map((x) => `<li class="wld__c__i">
    <b class="wld__c__n num">${esc(x.n)}</b>
    <span class="wld__c__l">${esc(x.l)}</span>
    <span class="wld__c__s">${esc(x.s)}</span>
  </li>`).join('')}</ul>`;
}

function orbitStatusChips(o) {
  const by = (o.totals && o.totals.by_status) || {};
  const words = o.status_words || {};
  const keys = Object.keys(by).sort();
  if (!keys.length) return '';
  return `<ul class="wld__chips" aria-label="Programmes by status">${keys.map((k) => `
    <li title="${esc(words[k] || 'no definition published')}"><b>${esc(k)}</b> <span class="num">${N(by[k])}</span></li>`).join('')}</ul>`;
}

function orbitTable(o) {
  const words = o.status_words || {};
  const byId = new Map(o.programmes.map((p) => [p.id, p]));
  const rows = o.programmes.map((p) => {
    const host = p.hosted_on && byId.get(p.hosted_on) ? byId.get(p.hosted_on).name : (p.hosted_on || null);
    const srcs = (Array.isArray(p.sources) ? p.sources : []).map((u, i) => (
      `<a href="${esc(u)}" rel="noopener" title="${esc(u)}">${i + 1}</a>`
    )).join(' ');
    const flown = Number.isFinite(Number(p.in_orbit_spacecraft)) && p.in_orbit_spacecraft !== null
      ? `<b class="num">${N(p.in_orbit_spacecraft)}</b> ${Number(p.in_orbit_spacecraft) === 1 ? 'spacecraft' : 'spacecraft'}`
      : '<b>count not published</b>';
    const filed = Number.isFinite(Number(p.filed_or_planned_satellites)) && p.filed_or_planned_satellites !== null
      ? `<b class="num">${N(p.filed_or_planned_satellites)}</b> satellites filed or planned`
      : '<b>no number filed</b>';
    return `<tr>
      <th scope="row"><b>${esc(p.name || 'unnamed programme')}</b>
        <span>${esc(p.operator || 'operator not recorded')}${p.country ? ` · ${esc(p.country)}` : ''}</span>
        ${host ? `<span>hosted on ${esc(host)}</span>` : ''}
        ${p.purpose_established === false ? '<span class="wld__flag">purpose not established</span>' : ''}</th>
      <td><b>${esc(p.status || 'no status')}</b><span class="wld__sub">${esc(words[p.status] || 'no definition published')}</span></td>
      <td class="wld__prose">${flown}<span class="wld__sub">${esc(p.in_orbit_now || 'nothing recorded')}</span></td>
      <td class="wld__prose">${filed}<span class="wld__sub">${esc(p.claimed || 'nothing recorded')}</span></td>
      <td class="num">${esc(p.first_launch || 'no launch')}</td>
      <td class="wld__wrap">${esc(p.next_milestone || 'none stated')}</td>
      <td>${esc(p.confidence || 'not stated')}</td>
      <td class="wld__srcs">${srcs || 'none'}</td>
    </tr>`;
  }).join('');
  return `<p class="wld__tcap" id="wld-cap-orbit">Every programme in the register, in the register's own order.
    <b>In orbit now</b> is hardware in space on the as-of date; <b>claimed or filed</b> is the programme's own
    number, on paper. They sit in adjacent columns so neither is read without the other. Sources are numbered
    links; the row says where its sources disagree.</p>
  <div class="wld__tw">
    <table class="wld__t wld__t--orbit" aria-describedby="wld-cap-orbit">
      <thead><tr>
        <th scope="col">Programme</th>
        <th scope="col">Status</th>
        <th scope="col">In orbit now</th>
        <th scope="col">Claimed or filed</th>
        <th scope="col">First launch</th>
        <th scope="col">Next milestone</th>
        <th scope="col">Confidence</th>
        <th scope="col">Sources</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function orbitSection(o) {
  const t = o.totals || {};
  const honesty = (Array.isArray(o.honesty) ? o.honesty : []).map((s) => `<li>${esc(s)}</li>`).join('');
  return `<section class="wld__sec" id="orbit" aria-labelledby="wld-orbit-h">
  <h2 class="wld__sec__h" id="wld-orbit-h">${icon('sec-substrate')} Computing hardware in orbit<span class="sec__eb">Off the planet</span>
    <span class="wld__count num">${N(o.totals && Number.isFinite(o.totals.in_orbit_spacecraft)
      ? o.totals.in_orbit_spacecraft : o.programmes.length)}</span></h2>
  <p class="wld__sec__l wld__sec__l--lead">${esc(o.verdict || '')}</p>
  <p class="wld__sec__l"><b>${count(t.in_orbit_spacecraft, 'an unpublished number of')} spacecraft in orbit</b>
    carrying compute hardware on ${esc(o.as_of_date || 'the as-of date')}, against
    <b>${count(t.filed_or_planned_for_compute, 'an unpublished number of')} satellites filed or planned</b> for
    it — ${count(t.filed_to_flown_ratio, 'an unpublished number')} on paper for every one flying — and a further
    ${count(t.filed_purpose_unknown, 'an unpublished number')} filed with the purpose unstated. The two numbers are
    printed together everywhere on this page, because the second one printed alone is a press release.</p>
  ${orbitCounters(o)}
  ${orbitStatusChips(o)}
  ${orbitTable(o)}
  <p class="wld__sec__l">${esc(o.what_this_is || '')}</p>
  ${honesty ? `<h3 class="wld__sec__h3">What the register can and cannot say</h3>
  <ul class="wld__lim">${honesty}</ul>` : ''}
</section>`;
}

// ---------------------------------------------------------------------------
// Limits, method, data.
// ---------------------------------------------------------------------------

function limitsSection(w, m) {
  const copy = w.copy || {};
  const t = w.totals || {};
  const honesty = (Array.isArray(w.honesty) ? w.honesty : []).map((s) => `<li>${esc(s)}</li>`).join('');
  const disagree = (Array.isArray(w.sites) ? w.sites : []).filter((s) => s.tag_disagrees).length;
  return `<section class="wld__sec" id="limits" aria-labelledby="wld-lim-h">
  <h2 class="wld__sec__h" id="wld-lim-h">${icon('sec-signal')} What this can and cannot say</h2>
  <p class="wld__sec__l wld__sec__l--lead">${esc(copy.what_zero_means || '')}</p>
  <p class="wld__sec__l">Published by the collector, printed here unedited.</p>
  <ul class="wld__lim">${honesty}</ul>
  <p class="wld__sec__n"><b>How each site got its country.</b> ${count(t.attributed_by_polygon, '—')} sites
    were placed by point-in-polygon; ${count(t.attributed_by_tag, '—')} fell in no polygon and were placed by
    their own <code class="wld__tag">addr:country</code> tag; ${count(t.unresolved, '—')} had neither and are
    published as unresolved. ${N(disagree)} ${disagree === 1 ? 'site carries' : 'sites carry'} an
    <code class="wld__tag">addr:country</code> tag that disagrees with the polygon ${disagree === 1 ? 'it' : 'they'}
    fell in; the polygon wins and the disagreement is flagged in the JSON.
    ${m.unoutlined.length ? `${N(m.unoutlined.length)} ${m.unoutlined.length === 1 ? 'country' : 'countries'} with a
    mapped site ${m.unoutlined.length === 1 ? 'has' : 'have'} no outline at the 1:110m scale this map is drawn at
    — the attribution used the 1:50m file, which has them — so their pins are drawn over sea.` : ''}
    This is a snapshot and not a time series: nothing here says when a datacentre opened or whether anything
    runs in it, only that an OpenStreetMap object with the tag exists.</p>
</section>`;
}

function methodSection(ctx, w, outline) {
  const s = w.source || {};
  const g = w.geography || {};
  const copy = w.copy || {};
  const os = outline.source || {};
  const simp = outline.simplify || {};
  const oc = outline.counts || {};
  const variants = Array.isArray(s.tag_variants) ? s.tag_variants : [];
  return `<section class="wld__sec" id="method" aria-labelledby="wld-method-h">
  <h2 class="wld__sec__h" id="wld-method-h">${icon('sec-method')} Where this came from</h2>

  <p class="wld__sec__l"><b>${esc(s.label || 'OpenStreetMap via Overpass')}.</b> One planet-wide query against
    <code class="wld__tag">${esc(s.endpoint || 'the Overpass endpoint')}</code>, keyless, for
    ${N(variants.length)} tag variants; ${count(s.elements_received, 'an unpublished number of')} elements came
    back${Number.isFinite(Number(s.bytes)) && s.bytes !== null ? ` in ${N(Math.round(Number(s.bytes) / 1024))}&nbsp;KiB` : ''},
    ${count(s.dropped_without_position, '—')} without a usable coordinate and ${count(s.dropped_untagged, '—')}
    without tags. OpenStreetMap's own snapshot clock for this extract reads
    <b>${esc(s.osm_timestamp || 'unpublished')}</b>; this file was generated
    <b>${w.generated_at ? esc(utc(w.generated_at)) : 'at an unpublished time'}</b>
    (${esc(s.harvest_origin || 'origin not recorded')}, refreshed every ${count(s.refresh_days, '—')} days).</p>

  <h3 class="wld__sec__h3">The query</h3>
  <p class="wld__sec__l">Sent as the <code class="wld__tag">data=</code> field of a GET, which Overpass accepts
    identically to a form-encoded POST. Every figure on this page is arithmetic over the response.</p>
  <pre class="wld__pre"><code>${esc(s.query_template || '')}</code></pre>
  ${variants.length ? `<p class="wld__sec__n">The ${N(variants.length)} tag variants, unioned:
    ${variants.map((v) => `<code class="wld__tag">${esc(v)}</code>`).join(' ')}</p>` : ''}

  <h3 class="wld__sec__h3">Geography</h3>
  <p class="wld__sec__l">Countries were assigned against <b>${esc(g.label || 'Natural Earth admin-0 countries')}</b>
    ${g.version ? `(${esc(g.version)})` : ''}, ${count(g.countries, 'an unpublished number of')} polygons,
    ${esc(g.licence || 'licence not recorded')}, read from
    ${esc(g.origin || 'an unrecorded origin')}${Number.isFinite(Number(g.age_days)) && g.age_days !== null ? ` ${N(g.age_days)} days old` : ''}
    and refreshed every ${count(g.refresh_days, '—')} days. ${esc(g.note || '')}</p>
  <p class="wld__sec__l">The outlines drawn above are a different, coarser file:
    <b>${esc(os.label || 'Natural Earth')}</b>${os.file ? ` (<code class="wld__tag">${esc(os.file)}</code>)` : ''},
    ${esc(os.licence || 'licence not recorded')}, retrieved ${esc(os.retrieved || 'on an unrecorded date')}
    — ${count(oc.countries, '—')} countries, ${count(oc.rings, '—')} rings, ${count(oc.vertices, '—')} vertices
    after simplification${simp.method ? ` by ${esc(simp.method)}` : ''}${Number.isFinite(Number(simp.min_triangle_deg2)) ? `, minimum triangle ${esc(String(simp.min_triangle_deg2))}&nbsp;deg²` : ''}${Number.isFinite(Number(simp.quantise_deg)) ? `, coordinates quantised to ${esc(String(simp.quantise_deg))}°` : ''}.
    Drawing is not attribution: a pin's country came from the finer file, and the coarser one is only the
    picture under it. ${esc(copy.outline_credit || '')}</p>

  <h3 class="wld__sec__h3">Licence</h3>
  <p class="wld__sec__l"><b>${esc(copy.attribution_required || '© OpenStreetMap contributors')}</b> —
    <a href="${esc(copy.attribution_url || 'https://www.openstreetmap.org/copyright')}" rel="license noopener">${esc(copy.attribution_url || 'https://www.openstreetmap.org/copyright')}</a>.
    ${esc((s.licence && s.licence.data) || 'Open Database License (ODbL) v1.0')}. Attribution is a term of that
    licence, not a courtesy, and it is carried in the payload so no renderer can lose it.</p>

  <p class="wld__sec__stamp">Source <b>${esc(s.id || 'osm-world')}</b> · no API key ·
    ${w.generated_at ? `generated ${esc(utc(w.generated_at))} · ` : ''}built by
    <a href="${esc(brand.REPO_URL)}" rel="noopener">collector/world.mjs</a>.
    This does not feed the ${esc(brand.NAME)} index and has no route into it.</p>
</section>`;
}

function dataSection(ctx, w, m, orbital) {
  const t = m.totals;
  return `<section class="wld__sec" id="data" aria-labelledby="wld-data-h">
  <h2 class="wld__sec__h" id="wld-data-h">${icon('sec-api')} Take the data</h2>
  <p class="wld__sec__l">Published beside this page byte-identical to the committed files — the build copies
    them verbatim rather than re-serialising, so the checksum of the file in the repository is the checksum of
    the file served here.</p>
  <ul class="wld__dl">
    <li><a href="${esc(ctx.href('/api/world.json'))}"><code class="wld__tag">/api/world.json</code></a>
      <span>Every number on this page: the totals, all ${N(t.sites)} sites with coordinate, status, name,
        operator, city and country, the ${N(m.countries.length)} country rows, the copy block and the
        honesty list. OpenStreetMap data, ODbL.</span></li>
    ${orbital ? `<li><a href="${esc(ctx.href('/api/orbital.json'))}"><code class="wld__tag">/api/orbital.json</code></a>
      <span>The orbital register: ${N(orbital.programmes.length)} programmes, each with what is in space, what
        is filed, and the sources for both.</span></li>` : ''}
  </ul>
</section>`;
}

// ---------------------------------------------------------------------------
// The enhancement. One thing CSS cannot do, and not one thing more: a country
// name in the table zooms the map to that country's pins, through the
// controller _usmap.mjs's MAP_JS publishes on window.usMap. Guarded on every
// step, because that API belongs to another file and this page must not
// break if it is absent, renamed or mid-deploy. Without it the href still
// jumps to the figure, which is what the link promised.
// ---------------------------------------------------------------------------

function enhanceJs() {
  return `<script>(function(){
var d=document;if(window.__dcWorldUi)return;window.__dcWorldUi=1;
var red=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches);
d.addEventListener('click',function(e){
 var a=e.target&&e.target.closest?e.target.closest('[${GO_ATTR}]'):null;
 if(!a)return;
 var iso=a.getAttribute('${GO_ATTR}'),m=null,ok=false;
 try{m=window.usMap&&window.usMap.get&&window.usMap.get('${MAP_ID}');}catch(err){m=null;}
 if(!m||!m.focusState)return;
 try{ok=m.focusState(iso);}catch(err){ok=false;}
 if(!ok)return;
 e.preventDefault();
 try{m.el.scrollIntoView({block:'start',behavior:red?'auto':'smooth'});}catch(err){}
});
})();</script>`;
}

// ---------------------------------------------------------------------------
// render
// ---------------------------------------------------------------------------

export function render(ctx) {
  if (!hasWorldData(ctx)) return emptyPage(ctx);
  const w = ctx.world;
  const outline = ctx.worldOutline;
  const orbital = hasOrbital(ctx) ? ctx.orbital : null;
  const m = worldModel(w, outline);
  const t = w.totals;
  const copy = w.copy || {};
  const q = String(copy.headline_qualifier || '');

  const headline = `${N(t.sites)} datacentres ${q}`;
  const description =
    `Every datacentre OpenStreetMap has mapped anywhere on Earth — ${N(t.sites)} objects in `
    + `${count(t.countries_with_sites, 'an unpublished number of')} countries, ${q}, on an equal-area map `
    + `with a ranked country table. ${count(t.countries_with_none, '—')} countries in the roster have none `
    + `mapped, which means nobody has mapped them rather than that there are none. `
    + (orbital && orbital.totals
      ? `Beneath it, the orbital register: ${count(orbital.totals.in_orbit_spacecraft, '—')} spacecraft in orbit `
        + `carrying compute against ${count(orbital.totals.filed_or_planned_for_compute, '—')} filed. `
      : '')
    + `Open Database Licence data, © OpenStreetMap contributors. `
    + (w.generated_at ? `Compiled ${utc(w.generated_at)}.` : '');

  const main = `<style>${worldMapCss()}${worldCss()}</style>
${iconSprite({ only: SPRITE })}
<div class="usm-scope wld">

<section class="wld__hero">
  <p class="wld__eyebrow">The world · a ${esc(brand.NAME)} sub-index · does not feed the main number</p>
  <h1 class="wld__h1">Every mapped datacentre on Earth</h1>
  <p class="wld__sub">${N(t.sites)} map objects carrying a datacentre tag, ${esc(q)}</p>
  <p class="wld__lede">Where anybody has written a datacentre into OpenStreetMap — a public, openly-licensed
    map that anyone can read and anyone can edit — attributed to a country and counted. The United States
    map on this site joins each of its pins to the water and the grid around it; no such join exists for the
    rest of the planet, so this page joins nothing. It draws, it attributes, and it counts.</p>
  <p class="wld__plain">${N(t.sites)} datacentres, ${esc(q)}. That is the number of map objects, and it is not
    ${esc(copy.never_say || 'the number of datacentres in the world')}. ${esc(copy.what_zero_means || '')}</p>
  ${counters(w, m)}
</section>

${theCaveat(w)}

${mapSection(w, m)}

${countrySection(w, m)}

${orbital ? orbitSection(orbital) : ''}

${limitsSection(w, m)}

${methodSection(ctx, w, outline)}

${dataSection(ctx, w, m, orbital)}

<p class="wld__odbl">Datacentre locations on this page are
  <a href="${esc(copy.attribution_url || 'https://www.openstreetmap.org/copyright')}" rel="license noopener">${esc(copy.attribution_required || '© OpenStreetMap contributors')}</a>,
  licensed under the Open Database License. ${esc(copy.outline_credit || '')}</p>
</div>`;

  return page({
    ctx,
    path: PATH,
    title: `Every mapped datacentre on Earth — ${headline} · ${brand.NAME}`,
    ogTitle: `${brand.NAME}: ${headline}`,
    description,
    ogImage: ctx.cardFor ? ctx.cardFor('world') : null,
    ogImageAlt: `${brand.NAME} equal-area map of every datacentre mapped in OpenStreetMap, ${q}`,
    jsonld: [dataset(ctx, w, m)],
    main: main.split(MAP_HREF).join(ctx.href('/map.html')),
    bodyEnd: enhanceJs(),
  });
}

/** ctx.world or the outline absent. Builds, says so plainly, and carries noindex. */
function emptyPage(ctx) {
  return page({
    ctx,
    path: PATH,
    noindex: true,
    title: `Every mapped datacentre on Earth · ${brand.NAME}`,
    description: 'The world datacentre map is not in this build.',
    main: `<div class="wld"><section class="wld__hero">
  <p class="wld__eyebrow">The world · a ${esc(brand.NAME)} sub-index</p>
  <h1 class="wld__h1">Every mapped datacentre on Earth</h1>
  <p class="wld__lede">This build carries no <code>data/world.json</code> or no
    <code>data/world-outline.json</code>, so there is nothing to draw. The page exists and says so rather
    than inventing a map. Run <code>collector/world.mjs</code> and rebuild.</p>
</section></div>`,
  });
}

function dataset(ctx, w, m) {
  const s = w.source || {};
  const t = w.totals || {};
  const vars = [
    { name: 'datacentres mapped worldwide', value: t.sites },
    { name: 'countries with at least one mapped datacentre', value: t.countries_with_sites },
    { name: 'countries in the roster with none mapped', value: t.countries_with_none },
    { name: 'mapped datacentres in the United States', value: t.in_united_states },
    { name: 'sites in no country polygon', value: t.unresolved },
    { name: 'pins drawn', value: m.totals.pinned },
  ].filter((v) => Number.isFinite(Number(v.value)) && v.value !== null)
    .map((v) => ({ '@type': 'PropertyValue', name: v.name, value: Number(v.value) }));
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: `${brand.NAME} — every datacentre mapped in OpenStreetMap, worldwide, by country`,
    description:
      'Every map object carrying a datacentre tag in OpenStreetMap, anywhere on Earth, attributed to a '
      + 'country by point-in-polygon against Natural Earth outlines and counted by status. A count of map '
      + 'objects, not of datacentres that exist: coverage is volunteer-driven and uneven, and a country '
      + 'with none mapped is a country nobody has mapped.',
    url: ctx.url(PATH),
    license: (s.licence && s.licence.url) || 'https://www.openstreetmap.org/copyright',
    creditText: (w.copy && w.copy.attribution_required) || '© OpenStreetMap contributors',
    creator: { '@type': 'Organization', name: brand.NAME, url: ctx.url('/') },
    ...(w.generated_at ? { dateModified: w.generated_at } : {}),
    ...(s.osm_timestamp ? { temporalCoverage: s.osm_timestamp } : {}),
    isAccessibleForFree: true,
    spatialCoverage: { '@type': 'Place', name: 'World' },
    keywords: ['datacentres', 'artificial intelligence', 'OpenStreetMap', 'Natural Earth', 'orbital data centres'],
    distribution: [{
      '@type': 'DataDownload',
      encodingFormat: 'application/json',
      contentUrl: ctx.url('/api/world.json'),
    }],
    variableMeasured: vars,
  };
}

// ---------------------------------------------------------------------------
// CSS. Scoped to this page, shared tokens only, mobile first. The map, its
// chrome, its legend and the country table are _usmap.mjs's classes and take
// their styles from worldMapCss(); everything below is page furniture.
// ---------------------------------------------------------------------------

function worldCss() {
  return `
.wld .dcico{flex:none}
.wld__sec__h .dcico,.wld__warn__h .dcico{--ico:1.05em;color:var(--accent)}

/* ---- hero ---------------------------------------------------------------- */
.wld__hero{margin:0 0 var(--sec)}
.wld__eyebrow{font:500 var(--t-2xs)/1.3 var(--mono);letter-spacing:.09em;text-transform:uppercase;
  color:var(--ink-faint);margin:0 0 var(--s-2)}
.wld__h1{font:600 clamp(1.6rem,7vw,2.4rem)/1.08 var(--sans);letter-spacing:-.02em;margin:0 0 var(--s-3)}
.wld__sub{font:500 var(--t-sm)/1.5 var(--mono);color:var(--ink-dim);margin:0 0 var(--s-3);letter-spacing:.01em}
.wld__lede{font:400 var(--t-base)/1.55 var(--sans);color:var(--ink-dim);margin:0 0 var(--s-4);max-width:62ch}
.wld__plain{font:400 var(--t-base)/1.55 var(--sans);margin:0 0 var(--s-5);max-width:60ch;
  padding:var(--s-3) var(--s-4);background:var(--wash-alt);border-left:3px solid var(--accent);
  border-radius:var(--radius)}

.wld__c{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:1px;
  background:var(--rule-soft);border:1px solid var(--rule-soft);border-radius:var(--radius);overflow:hidden}
.wld__c__i{background:var(--bg);padding:var(--s-3);display:flex;flex-direction:column;gap:2px;min-width:0}
.wld__c__i--wide{grid-column:1 / -1}
.wld__c__m{color:var(--accent);line-height:1}
.wld__c__m .dcico{--ico:1.05rem}
.wld__c__n{font:600 var(--t-xl)/1.05 var(--mono);font-variant-numeric:tabular-nums;color:var(--ink);
  overflow-wrap:anywhere}
.wld__c__l{font:500 var(--t-2xs)/1.3 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--ink-dim)}
.wld__c__s{font:400 var(--t-2xs)/1.45 var(--sans);color:var(--ink-faint)}
.wld__c__s a{color:var(--ink-dim)}
.wld__c--orbit{margin:var(--s-3) 0 var(--s-4)}

/* ---- the caveat, above the map ------------------------------------------- */
.wld__warn{border:1px solid var(--rule);border-radius:var(--radius);padding:var(--s-4);
  margin:0 0 var(--sec);background:var(--bg-raised)}
.wld__warn__h{font:600 var(--t-base)/1.3 var(--sans);margin:0 0 var(--s-3);
  display:flex;align-items:center;gap:8px}
.wld__warn__p{font:400 var(--t-sm)/1.6 var(--sans);color:var(--ink-dim);margin:0 0 var(--s-3);max-width:66ch}
.wld__warn__p--lead{font-size:var(--t-base);color:var(--ink)}
.wld__warn__p--last{margin-bottom:0}
.wld__warn__p a{color:var(--ink)}

/* ---- sections ------------------------------------------------------------ */
.wld__sec{margin:0 0 var(--sec-lg);scroll-margin-top:calc(var(--rail-h) + 12px)}
.wld__sec__h{font:600 var(--t-xl)/1.15 var(--sans);letter-spacing:-.01em;margin:0 0 var(--s-3);
  display:flex;align-items:center;gap:9px;flex-wrap:wrap}
.wld__sec__h3{font:600 var(--t-base)/1.3 var(--sans);margin:var(--s-6) 0 var(--s-2)}
.wld__sec__l{font:400 var(--t-sm)/1.65 var(--sans);color:var(--ink-dim);margin:0 0 var(--s-4);max-width:68ch}
.wld__sec__l b{color:var(--ink)}
.wld__sec__l--lead{font-size:var(--t-base);color:var(--ink)}
.wld__sec__n{font:400 var(--t-xs)/1.7 var(--sans);color:var(--ink-faint);margin:var(--s-4) 0 0;max-width:68ch}
.wld__sec__n b{color:var(--ink-dim)}
.wld__sec__stamp{font:400 var(--t-xs)/1.8 var(--mono);color:var(--ink-faint);margin:var(--s-5) 0 0;
  padding-top:var(--s-3);border-top:1px solid var(--rule-soft);overflow-wrap:anywhere}
.wld__count{font:600 var(--t-xs)/1 var(--mono);font-variant-numeric:tabular-nums;color:var(--accent-2);
  border:1px solid var(--rule);border-radius:3px;padding:3px 7px;letter-spacing:.02em}

/* ---- the map ------------------------------------------------------------- */
.wld__mapwrap{display:flex;flex-direction:column;gap:var(--s-4)}
.wld__mapwrap>.usm__legend{margin-top:0}
/* The phone note. Shown only where the static map is not (usMapCss hides the
   figure below 760px until MAP_JS adds usm--live), and hidden again the moment
   the figure goes live, so it never describes a picture that is on screen. */
.wld__small{display:none}
@media (max-width: 759px){
  .wld__small{display:block;font:400 var(--t-xs)/1.6 var(--sans);color:var(--ink-faint);
    margin:0;padding:var(--s-3);border:1px dashed var(--rule);border-radius:var(--radius)}
  .wld__mapwrap:has(.usm--live) .wld__small{display:none}
}

/* ---- by country ---------------------------------------------------------- */
.wld__cont{list-style:none;margin:0 0 var(--s-3);padding:0;display:flex;flex-wrap:wrap;gap:6px}
.wld__cont li{display:inline-flex;align-items:baseline;gap:7px;padding:5px 10px;
  border:1px solid var(--rule);border-radius:7px;font:400 var(--t-2xs)/1.3 var(--mono);
  color:var(--ink-dim);white-space:nowrap}
.wld__cont b{color:var(--ink);font-weight:600}
.wld__cont .num{font-variant-numeric:tabular-nums;color:var(--ink)}
.wld__cont__p{color:var(--ink-faint)}
.wld .usm__t th span{white-space:normal}
.wld .usm__t tbody th{min-width:14rem;max-width:22rem}

/* ---- orbit --------------------------------------------------------------- */
.wld__chips{list-style:none;margin:0 0 var(--s-3);padding:0;display:flex;flex-wrap:wrap;gap:6px}
.wld__chips li{display:inline-flex;align-items:baseline;gap:7px;padding:5px 10px;
  border:1px solid var(--rule);border-radius:7px;font:400 var(--t-2xs)/1.3 var(--mono);
  color:var(--ink-dim);white-space:nowrap;letter-spacing:.04em;text-transform:uppercase}
.wld__chips b{color:var(--ink);font-weight:600}
.wld__chips .num{font-variant-numeric:tabular-nums;color:var(--accent-2);text-transform:none}

/* ---- tables (the register; the country table is _usmap.mjs's) ----------- */
.wld__tw{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:var(--s-3) 0 0;
  border:1px solid var(--rule-soft);border-radius:var(--radius)}
.wld__t{border-collapse:collapse;width:100%;min-width:30rem;
  font:400 var(--t-xs)/1.45 var(--mono);font-variant-numeric:tabular-nums}
/* A paragraph above the table rather than a caption element inside it, for
   the reason flockPage.mjs measured: a caption widens the table box to its
   own measure, and inside an overflow wrapper that puts the explanation off
   the right edge of a phone. aria-describedby keeps the association. */
.wld__tcap{margin:var(--s-3) 0 var(--s-2);
  font:400 var(--t-xs)/1.6 var(--sans);color:var(--ink-faint);max-width:74ch}
.wld__tcap b{color:var(--ink-dim)}
.wld__t th,.wld__t td{padding:var(--s-2) var(--s-3);text-align:left;vertical-align:top;
  border-bottom:1px solid var(--rule-soft);white-space:nowrap}
.wld__t thead th{font:600 var(--t-2xs)/1.3 var(--mono);letter-spacing:.08em;text-transform:uppercase;
  color:var(--ink-faint);background:var(--bg-sunken)}
.wld__t tbody tr:last-child td{border-bottom:0}
.wld__t tbody th{font-weight:600;color:var(--ink);white-space:normal;min-width:15rem;max-width:20rem}
.wld__t tbody th span{display:block;font-weight:400;font-size:var(--t-2xs);color:var(--ink-faint)}
.wld__sub{display:block;font-size:var(--t-2xs);color:var(--ink-faint);white-space:normal;
  font-family:var(--sans);line-height:1.5;margin-top:3px}
.wld__prose{white-space:normal;min-width:22rem;max-width:30rem}
.wld__prose b{color:var(--ink)}
.wld__wrap{white-space:normal;min-width:11rem;max-width:16rem}
.wld__srcs a{display:inline-block;min-width:1.6em;text-align:center;margin-right:3px;
  border:1px solid var(--rule);border-radius:3px;padding:1px 4px;text-decoration:none;color:var(--ink-dim)}
.wld__srcs a:hover{color:var(--accent);border-color:var(--accent)}
.wld__flag{color:var(--accent);font-weight:600}

/* ---- limits, data, method ------------------------------------------------ */
.wld__lim{list-style:none;margin:0;padding:0;display:grid;gap:9px;counter-reset:lim}
.wld__lim li{font:400 var(--t-sm)/1.6 var(--sans);color:var(--ink-dim);max-width:70ch;
  padding-left:var(--s-5);position:relative;counter-increment:lim}
.wld__lim li::before{content:counter(lim);position:absolute;left:0;top:1px;
  font:600 var(--t-2xs)/1.6 var(--mono);color:var(--accent)}
.wld__tag{font:400 .95em/1.4 var(--mono);background:var(--wash);border:1px solid var(--rule-soft);
  border-radius:3px;padding:1px 5px;color:var(--ink-dim);overflow-wrap:anywhere}
.wld__dl{list-style:none;margin:var(--s-3) 0 0;padding:0;display:grid;gap:10px}
.wld__dl li{font:400 var(--t-xs)/1.65 var(--sans);color:var(--ink-faint);max-width:68ch}
.wld__dl a{display:inline-block;margin-right:6px;text-decoration:none}
.wld__dl a:hover .wld__tag{border-color:var(--accent);color:var(--ink)}
.wld__pre{margin:var(--s-3) 0 0;padding:var(--s-3);background:var(--bg-sunken);
  border:1px solid var(--rule-soft);border-radius:var(--radius-lg);overflow-x:auto}
.wld__pre code{font:400 var(--t-xs)/1.6 var(--mono);color:var(--ink-dim);white-space:pre}
.wld__odbl{font:400 var(--t-xs)/1.6 var(--sans);color:var(--ink-faint);margin:0 0 var(--sec);
  padding-top:var(--s-3);border-top:1px solid var(--rule-soft);max-width:80ch}
.wld__odbl a{color:var(--ink-dim)}

/* The orbit counters get their own column count at BOTH breakpoints. With
   only the 620px rule, the 900px .wld__c rule below wins by source order and
   puts four cells in a six-column grid: a blank cell and a nine-glyph
   numeral, 1,142,481, wrapped in the middle. Two columns, then four, keeps
   the widest number this block ever prints on one line. */
@media (min-width: 620px){
  .wld__c{grid-template-columns:repeat(3,1fr)}
  .wld__c--orbit{grid-template-columns:repeat(2,1fr)}
}
@media (min-width: 900px){
  .wld__c{grid-template-columns:repeat(6,1fr)}
  .wld__c__i--wide{grid-column:span 6}
  .wld__c--orbit{grid-template-columns:repeat(4,1fr)}
}

/* Motion. Every transition below decorates a state change that has already
   happened; reduce turns the easing off and the change still happens,
   instantly. docs/MOTION.md §3. */
@media (prefers-reduced-motion: no-preference){
  .usm__go,.wld__srcs a{transition:color 120ms ease,border-color 120ms ease}
}
@media (prefers-reduced-motion: reduce){
  .usm__go,.wld__srcs a{transition:none}
}
`;
}
