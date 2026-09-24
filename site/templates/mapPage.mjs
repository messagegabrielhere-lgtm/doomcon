// /map.html — THE BUILD. Where the datacentres are, and what the power and the
// water around them are doing.
//
// The sibling of /watts. docs/INFRA.md asks how the substrate is holding up.
// This asks where the things drawing on it have been put, and joins the two, so
// a pin can say: Collin County, TX · ERCOT · 4.4% of the county in D4 · nearest
// gauge Trinity Rv at Dallas, 29.4 km — ERCOT headroom used 71.56% of committed
// capacity (awaiting baseline). Nobody else joins those four things up.
//
// Reads data/datacenters.json, written by collector/datacenters.mjs, and
// renders it whole. Server-rendered, deterministic, no client JavaScript:
// identical inputs produce byte-identical HTML.
//
// ---------------------------------------------------------------------------
// THE ARGUMENT, AND WHY THE PAGE IS ORDERED THE WAY IT IS
// ---------------------------------------------------------------------------
// A map is the most persuasive object in this repository and the one carrying
// the least measurement. It looks like a census. It is a volunteer survey
// joined to a weekly expert judgement about rainfall and to three real-time
// grid feeds out of eleven balancing authorities. Every one of those gaps is
// invisible in the picture and every one of them changes what the picture
// means.
//
// So the order is: what was counted, then WHAT IT IS NOT, then the map. The
// limitation paragraph is printed THIRD, above every pin, in the same position
// and doing the same job as the correlation warning on /watts — before a reader
// has had a chance to form the wrong idea, rather than in a footnote under a
// map they have already screenshotted.
//
// Under the map the argument is split in two, because the brief for this page
// is the resource story and not the real-estate story:
//
//   THE WATER — where the drought is, under the pins, this week.
//   THE POWER — which grid each cluster sits on, and which of those grids
//               publishes a number at all.
//
// The single strongest fact on this page is in the second of those, and it is
// an absence: the largest datacentre cluster on earth is in Northern Virginia,
// it is on PJM, and PJM's real-time demand is behind a registration key. The
// map cannot show you the load. It can show you exactly where the load is and
// name the wall in front of the number.

import { esc, utc, num } from './_html.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';
import {
  mapModel, mapFigure, mapLegend, mapTable, usMapCss,
  DROUGHT_ORDER, DROUGHT_WORDS, STATUS_ORDER, STATUS_MARKS,
} from './_usmap.mjs';
import {
  iconSprite, icon as sheetIcon, dcIcon, stateIcon, sectionIcon, ICON_GRID,
} from './_icons.mjs';

const PATH = '/map.html';

/** build.mjs gate: no data/datacenters.json, no route, no nav entry, no 404. */
export function hasDatacenters(ctx) {
  const d = ctx && ctx.datacenters;
  return Boolean(d && Array.isArray(d.sites) && d.sites.length && d.resources_index);
}

// ---------------------------------------------------------------------------
// The three source states, kept apart everywhere. Same glyph, same word and the
// same border treatment as /watts, because a reader who learned them there has
// learned them here. docs/INFRA.md §4; docs/DATACENTERS.md §5.
// ---------------------------------------------------------------------------

const STATES = Object.freeze({
  live: { ico: 'live', word: 'LIVE', cls: 'is-live' },
  'awaiting-baseline': { ico: 'awaiting', word: 'AWAITING BASELINE', cls: 'is-wait' },
  // collector/datacenters.mjs publishes two more origins than /watts has
  // states for. Both mean the same thing to a reader — the source answered,
  // but not from the network on this run — so both take the STALE mark rather
  // than a fourth silhouette nobody has been taught.
  'stale-cache': { ico: 'stale', word: 'STALE CACHE', cls: 'is-wait' },
  degraded: { ico: 'stale', word: 'DEGRADED', cls: 'is-wait' },
  dark: { ico: 'dark', word: 'DARK', cls: 'is-dark' },
});

function stateOf(key) {
  return STATES[key] || STATES.dark;
}

function stateTag(key, extra = '') {
  const s = stateOf(key);
  return `<span class="bldst ${s.cls}">${stateIcon(s.ico)}${esc(s.word)}${
    extra ? `<span class="bldst__x">${esc(extra)}</span>` : ''
  }</span>`;
}

// Grouped and fixed-precision. Grouping is not decoration: 2374.6 and 23155 in
// the same column with no separators read as the same order of magnitude.
function fmt(v, dp = 1) {
  if (!Number.isFinite(v)) return '—';
  if (Math.abs(v) >= 10000) {
    return Math.round(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
  return Number(num(v, dp)).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

const N = (v) => (Number.isFinite(v) ? v.toLocaleString('en-US') : '—');

// ---------------------------------------------------------------------------
// Icons. Inline SVG, currentColor, aria-hidden. They are labels for the four
// things this page counts, not decoration: every one sits beside the word it
// illustrates, so nothing is carried by the picture alone.
// ---------------------------------------------------------------------------

// TWO page-local marks, and only two.
//
// site/templates/_icons.mjs is the site's icon system and this page uses it for
// everything it carries: the three datacentre statuses, the source states, and
// the section marks for the map, the substrate and the methodology. It has no
// mark for WATER and none for a RANKED LIST, which are two of this page's six
// headings, so those two are drawn here — on _icons.mjs's own grid, read from
// ICON_GRID rather than retyped, so they sit on the same optical baseline as
// the sheet at every type size. If a later pass moves them into the sheet,
// nothing here has to change but the call.
const LOCAL = {
  drop: 'M10 3.2c3.1 3.8 4.8 6.2 4.8 8.2a4.8 4.8 0 0 1-9.6 0c0-2 1.7-4.4 4.8-8.2z',
  rows: 'M3 5.2h14M3 10h14M3 14.8h9',
};

function localIcon(name) {
  return `<svg class="dcico" viewBox="0 0 ${ICON_GRID.size} ${ICON_GRID.size}" aria-hidden="true"
    focusable="false"><path d="${LOCAL[name]}" fill="none" stroke="currentColor"
    stroke-width="${ICON_GRID.stroke}" stroke-linecap="${ICON_GRID.linecap}"
    stroke-linejoin="${ICON_GRID.linejoin}"/></svg>`;
}

/** The sprite this page needs, and nothing else. Emitted once, in main. */
const SPRITE = [
  'state-live', 'state-stale', 'state-dark', 'state-awaiting',
  'dc-operating', 'dc-building', 'dc-announced',
  'sec-map', 'sec-substrate', 'sec-method',
];

/** One name space over both sources, so a call site never has to know which. */
function icon(name) {
  if (Object.prototype.hasOwnProperty.call(LOCAL, name)) return localIcon(name);
  if (name === 'operating' || name === 'under_construction' || name === 'announced') return dcIcon(name);
  return sheetIcon(name);
}

// ---------------------------------------------------------------------------
// The hero counters. Five facts about five DIFFERENT things — docs/VISITORS.md
// §5.6 is blunt that restating one number in five hats is the failure mode
// here, so no cell below is derivable from the cell beside it.
// ---------------------------------------------------------------------------

function counters(dc, model) {
  const c = dc.counts || {};
  const by = c.by_status || {};
  const t = model.totals;
  const cells = [
    { k: 'sec-map', n: N(c.sites), l: 'mapped sites', s: `${N(c.pinned)} carry surveyed coordinates` },
    { k: 'under_construction', n: N(by.under_construction), l: 'under construction', s: 'a hole in the ground and a crane, in OpenStreetMap' },
    { k: 'announced', n: N(by.announced), l: 'announced', s: 'located to the evidence, never more precisely' },
    { k: 'drop', n: N(t.inDrought), l: 'in a county in drought', s: `${N(t.severe)} of them in D2 or worse` },
    { k: 'sec-substrate', n: N(t.withGridReading), l: 'with a live grid number', s: `${N(c.sites - t.withGridReading)} sit on a grid with no keyless feed` },
  ];
  return `<ul class="bldc">${cells.map((x) => `<li class="bldc__i">
    <span class="bldc__m">${icon(x.k)}</span>
    <b class="bldc__n num">${esc(x.n)}</b>
    <span class="bldc__l">${esc(x.l)}</span>
    <span class="bldc__s">${esc(x.s)}</span>
  </li>`).join('')}</ul>`;
}

// ---------------------------------------------------------------------------
// The plain sentence. docs/VISITORS.md §4.2: thirteen of a hundred arrivals
// want one sentence in plain words, and neither site in that study gives them
// one. Every clause below is a count or a negation.
// ---------------------------------------------------------------------------

function plainSentence(dc, model) {
  const c = dc.counts || {};
  const t = model.totals;
  const pct = c.sites ? Math.round((t.inDrought / c.sites) * 100) : 0;
  return `This is a map of buildings, not of electricity. ${esc(N(c.sites))} datacentres have been ` +
    `mapped in the United States by volunteers; ${esc(N(t.inDrought))} of them — ${pct}% — stand in a county ` +
    `the US Drought Monitor placed in a drought category this week, and ${esc(N(t.withGridReading))} sit on ` +
    `one of the three grids that publish a demand number without an account. What any of these buildings ` +
    `actually draws is not published by anyone.`;
}

// ---------------------------------------------------------------------------
// The claim and its exact size. Printed third, above every pin.
// ---------------------------------------------------------------------------

function theClaim(dc) {
  const copy = dc.copy || {};
  return `<section class="bldwarn" aria-labelledby="bld-claim">
  <h2 class="bldwarn__h" id="bld-claim">${icon('sec-method')} What this map cannot show you</h2>
  <p class="bldwarn__p bldwarn__p--lead">${esc(copy.the_claim_and_its_size || '')}</p>
  <p class="bldwarn__p"><b>${esc(copy.empty_state || '')}</b> OpenStreetMap coverage is volunteer-maintained
     and uneven. Virginia has ${esc(N((dc.counts && dc.counts.by_state && dc.counts.by_state.VA && dc.counts.by_state.VA.total) || 0))}
     pins and Wyoming has ${esc(N((dc.counts && dc.counts.by_state && dc.counts.by_state.WY && dc.counts.by_state.WY.total) || 0))};
     some of that is the build-out and some of it is who maps.</p>
  <p class="bldwarn__p">Capacity is tagged on
     <b>${esc(N((dc.counts && dc.counts.with_capacity_tag) || 0))} of ${esc(N((dc.counts && dc.counts.sites) || 0))}</b>
     sites, totalling ${esc(fmt((dc.counts && dc.counts.tagged_it_power_mw) || 0, 1))} MW of tagged IT power. Any
     sum over this dataset is a sum over two per cent of it, which is why no total megawatt figure is printed
     anywhere on this page.</p>
  <p class="bldwarn__p bldwarn__p--last"><b>&ldquo;Operating&rdquo; means the building exists.</b> It is not a
     claim that there are servers in it, that they are switched on, or that they are training anything. A
     decommissioned datacentre keeps its tag until somebody visits. A map is extremely persuasive, and that is
     exactly why it has to say all of this before it draws anything.</p>
</section>`;
}

// ---------------------------------------------------------------------------
// Jump nav. Six anchors, real links, in the reading order of the page. It is
// the whole of this page's navigation: no tabs, no script, nothing that can
// hide content from a crawler or from a reader who arrives at an anchor.
// ---------------------------------------------------------------------------

const JUMPS = [
  { href: '#the-map', label: 'The map', icon: 'sec-map' },
  { href: '#one-pin', label: 'One pin', icon: 'operating' },
  { href: '#the-water', label: 'The water', icon: 'drop' },
  { href: '#the-power', label: 'The power', icon: 'sec-substrate' },
  { href: '#by-state', label: 'By state', icon: 'rows' },
  { href: '#largest', label: 'Largest tagged', icon: 'under_construction' },
  { href: '#method', label: 'Method &amp; limits', icon: 'sec-method' },
];

function jumpNav() {
  return `<nav class="bldj" aria-label="On this page"><ul>${JUMPS.map((j) => (
    `<li><a href="${j.href}">${icon(j.icon)}<span>${j.label}</span></a></li>`
  )).join('')}</ul></nav>`;
}

// ---------------------------------------------------------------------------
// THE WATER.
// ---------------------------------------------------------------------------

function droughtBar(model) {
  const total = model.totals.sites || 1;
  const segs = DROUGHT_ORDER.filter((k) => model.droughtCounts[k] > 0);
  const bar = segs.map((k) => (
    `<i class="bldd__s usm__k-${esc(k.toLowerCase())}" style="width:${((model.droughtCounts[k] / total) * 100).toFixed(3)}%"><span class="usm__sw" aria-hidden="true"></span></i>`
  )).join('');
  const rows = segs.map((k) => {
    const n = model.droughtCounts[k];
    return `<li><span class="usm__chip usm__k-${esc(k.toLowerCase())}"><i aria-hidden="true"></i>${esc(DROUGHT_WORDS[k].label)}</span>
      <span class="bldd__n num">${esc(N(n))}</span>
      <span class="bldd__p num">${((n / total) * 100).toFixed(1)}%</span></li>`;
  }).join('');
  return `<div class="bldd">
    <div class="bldd__bar" role="img" aria-label="${esc(segs.map((k) => `${DROUGHT_WORDS[k].label}: ${N(model.droughtCounts[k])} pins`).join('; '))}">${bar}</div>
    <ul class="bldd__key">${rows}</ul>
  </div>`;
}

function waterSection(dc, model) {
  const t = model.totals;
  const gauges = model.gaugeRows.map((g) => {
    const pct = Number.isFinite(g.percent_of_normal) ? `${fmt(g.percent_of_normal, 1)}%` : '—';
    const dev = Number.isFinite(g.percent_of_normal)
      ? (g.percent_of_normal >= 100 ? `${fmt(g.percent_of_normal - 100, 1)}% above the median` : `${fmt(100 - g.percent_of_normal, 1)}% below the median`)
      : 'no reading on this build';
    return `<tr>
      <th scope="row">${esc(g.name)}<span class="usm__sub">${esc(g.cluster || 'no cluster named')}${g.note ? ` · ${esc(g.note)}` : ''}</span></th>
      <td class="usm__num num">${esc(pct)}</td>
      <td>${esc(dev)}</td>
      <td>${stateTag(g.reading_state, g.reading_day ? `day ${g.reading_day}` : '')}</td>
    </tr>`;
  }).join('');

  const rel = { local: 0, regional: 0, distant: 0 };
  for (const s of dc.sites) {
    const r = s.resources && s.resources.streamflow && s.resources.streamflow.relevance;
    if (r && Object.prototype.hasOwnProperty.call(rel, r)) rel[r] += 1;
  }

  return `<section class="bldsec" id="the-water" aria-labelledby="bld-water">
  <h2 class="bldsec__h" id="bld-water">${icon('drop')} The water</h2>
  <p class="bldsec__l">Drought is the resource this map can actually carry, because the US Drought Monitor
     publishes it by county and every pin has a county. It is the colour of every dot above.
     <b>${esc(N(t.inDrought))} of ${esc(N(t.sites))}</b> pins stand in a county carrying a category on the
     map dated ${esc(model.usdm_map_date || 'unknown')}, and ${esc(N(t.severe))} of those are in D2 or worse.</p>

  ${droughtBar(model)}

  <p class="bldsec__n">${esc((dc.honesty && dc.honesty[4]) || '')}</p>

  <h3 class="bldsec__h3">The nine river gauges</h3>
  <p class="bldsec__l">The same nine USGS gauges <a href="${esc(ctxHrefPlaceholder)}">Watts</a> reads, each one beside a named
     datacentre cluster, measured against that gauge's own long-run median for this day of the year.
     ${esc(N(rel.local))} of ${esc(N(t.sites))} pins have one within 50 km; ${esc(N(rel.regional))} are regional and
     ${esc(N(rel.distant))} are distant. A gauge 800 km away describes a different watershed, and every pin
     carries its distance for that reason.</p>
  <div class="bldtw"><table class="bldt">
    <thead><tr>
      <th scope="col">Gauge</th><th scope="col" class="usm__num">% of median</th>
      <th scope="col">Reading</th><th scope="col">State</th>
    </tr></thead>
    <tbody>${gauges}</tbody>
  </table></div>
  <p class="bldsec__n">Flow is a statement about rainfall and reservoir operation, not about consumption.
     Nothing in this table is a datacentre's water draw, and no public feed publishes one.</p>
</section>`;
}

// A marker replaced in render() once ctx is in hand. Keeping the href out of
// the template body would mean threading ctx through four functions for one
// link; this is replaced once, on a string we generated ourselves.
const ctxHrefPlaceholder = '__WATTS_HREF__';

// ---------------------------------------------------------------------------
// THE POWER.
// ---------------------------------------------------------------------------

function powerSection(dc, model) {
  const t = model.totals;
  const withFeed = model.gridRows.filter((g) => g.reading);
  const without = model.gridRows.filter((g) => !g.reading);
  const biggestDark = without.slice().sort((a, b) => b.count - a.count)[0];

  const card = (g) => {
    const r = g.reading;
    return `<li class="bldg ${r ? `bldg--${esc(stateOf(r.state).cls)}` : 'bldg--none'}">
      <div class="bldg__top">
        <b class="bldg__k">${esc(g.label)}</b>
        <span class="bldg__c num">${esc(N(g.count))} <small>pins</small></span>
      </div>
      ${r ? `<p class="bldg__v"><b class="num">${esc(fmt(r.value, 2))}</b> <span>${esc(r.unit || '')}</span></p>
        <p class="bldg__lab">${esc(r.label || '')}${r.observed_at ? ` · observed ${esc(utc(r.observed_at))}` : ''}</p>
        ${stateTag(r.state, r.state === 'awaiting-baseline' ? 'real number, not yet scored' : '')}`
      : `<p class="bldg__why">${esc(g.why || 'no reason recorded')}</p>${stateTag('dark', 'no keyless feed')}`}
    </li>`;
  };

  return `<section class="bldsec" id="the-power" aria-labelledby="bld-power">
  <h2 class="bldsec__h" id="bld-power">${icon('sec-substrate')} The power</h2>
  <p class="bldsec__l">Every pin is assigned to the balancing authority that runs its state's grid, with named
     county exceptions where that is wrong. Three of those authorities publish a real-time number without an
     account, and they cover <b>${esc(N(t.withGridReading))} of ${esc(N(t.sites))}</b> pins.
     ${biggestDark ? `The single largest block on this map — <b>${esc(N(biggestDark.count))} pins on ${esc(biggestDark.label)}</b> —
     is not one of them.` : ''}</p>
  <p class="bldsec__l">A blank cell reads as an oversight. A named wall reads as a boundary of the instrument,
     which is what it is. Every grid below with no number says why in its own words, and those words are the
     same ones <a href="${esc(ctxHrefPlaceholder)}">Watts</a> prints for the same grid.</p>
  <ul class="bldgs">${withFeed.map(card).join('')}${without.map(card).join('')}</ul>
  <p class="bldsec__n"><b>A balancing authority is not a state, and this table treats it as one.</b>
     ${esc((dc.grid_table && dc.grid_table.caveat) || '')}. El Paso and Hudspeth, the far Panhandle, east Texas,
     and the Los Angeles, Sacramento and Imperial load pockets are excluded by county FIPS and carry the reason
     instead of a wrong answer.</p>
</section>`;
}

// ---------------------------------------------------------------------------
// WHAT ONE PIN SAYS — four worked examples.
//
// This is the feature docs/DATACENTERS.md §0 exists for, and it is invisible in
// a field of dots, so it is printed in words directly under the map. The
// selection rule is published rather than curated:
//
//   one site for each of the three grids that publish a real-time reading
//   without an account, plus one for the grid carrying the most pins —
//   which is the grid with no reading at all, and is the point.
//
//   Within a grid: the named site with a named operator whose county carries
//   the worst drought category, ties broken by the stable site id.
//
// The result is one example of each of the three source states — a reading
// awaiting its baseline, printed and labelled, and a grid with no feed, printed
// as the reason rather than as a blank.
// ---------------------------------------------------------------------------

function pickExample(dc, gridKey) {
  const rank = (s) => {
    const fips = s.county_fips;
    const row = fips && dc.resources_index.drought_by_county
      ? dc.resources_index.drought_by_county[fips] : null;
    const cat = row && row.headline ? row.headline.category : 'nodata';
    return DROUGHT_ORDER.indexOf(DROUGHT_ORDER.includes(cat) ? cat : 'nodata');
  };
  let best = null;
  for (const s of dc.sites) {
    if (!s.name || !s.operator) continue;
    if (!s.resources || !s.resources.grid || s.resources.grid.key !== gridKey) continue;
    if (!best) { best = s; continue; }
    const d = rank(s) - rank(best);
    if (d > 0 || (d === 0 && String(s.id) < String(best.id))) best = s;
  }
  return best;
}

function joinedExamples(dc, model) {
  const withReading = model.gridRows.filter((g) => g.reading).map((g) => g.key);
  const biggest = model.gridRows[0] ? model.gridRows[0].key : null;
  const keys = [...withReading];
  if (biggest && !keys.includes(biggest)) keys.push(biggest);
  const picks = keys.map((k) => ({ key: k, site: pickExample(dc, k) })).filter((x) => x.site);
  if (!picks.length) return '';

  const items = picks.map(({ key, site }) => {
    const c = composedSentence(site, dc);
    const grid = model.gridRows.find((g) => g.key === key);
    return `<li class="bldex">
      <p class="bldex__k">${esc(grid ? grid.label : key)} · ${esc(N(grid ? grid.count : 0))} pins</p>
      <p class="bldex__h"><span class="bldex__g" data-dc="${esc(site.status)}">${dcIcon(site.status)}</span>
        <b>${esc(site.name)}</b> <span class="bldsent__op">${esc(site.operator)}</span></p>
      <p class="bldex__s">${esc(c.text)} ${c.tag || (grid && grid.why ? `<span class="bldsent__st is-dark">${stateIcon('dark')}NO READING</span>` : '')}</p>
      ${!c.tag && grid && grid.why ? `<p class="bldex__w">${esc(grid.why)}</p>` : ''}
    </li>`;
  }).join('');

  return `<section class="bldsec" id="one-pin" aria-labelledby="bld-onepin">
  <h2 class="bldsec__h" id="bld-onepin">${icon('operating')} What one pin says</h2>
  <p class="bldsec__l">A dot is not an argument. This is what is behind one, for each of the three grids
     that publish a number without an account, plus the grid carrying the most pins on this map — which
     publishes nothing. Each line is the site's own stable sentence, then the live grid reading for the grid
     it sits on, carrying that reading's state. A number awaiting its baseline is printed and labelled as one;
     it is never printed as a scored number.</p>
  <ol class="bldexs">${items}</ol>
  <p class="bldsec__n">Selection rule, so this is a sample and not a curation: one site per grid, the named
     site with a named operator whose county carries the worst drought category, ties broken by the stable
     site id. Nothing here is chosen for effect.</p>
</section>`;
}

// ---------------------------------------------------------------------------
// The largest tagged sites. Capacity exists for 43 of 1,877, so this is a
// sample of a sample and the heading says so. Each row composes the headline
// sentence exactly the way copy.sentence_recipe specifies.
// ---------------------------------------------------------------------------

function composedSentence(site, dc) {
  const base = site.sentence ? String(site.sentence) : '';
  const key = site.resources && site.resources.grid && site.resources.grid.key;
  const grid = key && dc.resources_index && dc.resources_index.grids ? dc.resources_index.grids[key] : null;
  const r = grid && grid.reading;
  if (!r || !Number.isFinite(r.value)) return { text: base, tag: '' };
  const s = stateOf(r.state);
  return {
    // '%' binds to the number; every other unit takes a space. "71.56 % of
    // committed capacity" is a typo the reader notices before the number.
    text: `${base}, ${r.label ? `${r.label} ` : ''}${fmt(r.value, 2)}${
      r.unit ? (r.unit.startsWith('%') ? r.unit : ` ${r.unit}`) : ''}`.trim(),
    tag: `<span class="bldsent__st ${s.cls}">${stateIcon(s.ico)}${esc(s.word)}</span>`,
  };
}

function largestSection(dc, model) {
  const tagged = dc.sites
    .filter((s) => s.capacity && Number.isFinite(Number(s.capacity.it_power_mw)))
    .sort((a, b) => Number(b.capacity.it_power_mw) - Number(a.capacity.it_power_mw) || String(a.id).localeCompare(String(b.id)))
    .slice(0, 12);

  if (!tagged.length) {
    return `<section class="bldsec" id="largest" aria-labelledby="bld-largest">
  <h2 class="bldsec__h" id="bld-largest">${icon('under_construction')} The largest tagged sites</h2>
  <p class="bldsec__l">No site in this build carries an IT-power tag. That is a statement about
     OpenStreetMap's tagging, not about the buildings.</p>
</section>`;
  }

  const rows = tagged.map((s) => {
    const c = composedSentence(s, dc);
    const mark = STATUS_MARKS[s.status] || STATUS_MARKS.operating;
    return `<li class="bldsent">
      <p class="bldsent__h"><span class="bldsent__g" data-dc="${esc(s.status)}">${dcIcon(s.status)}</span>
        <b>${esc(s.name || 'unnamed site')}</b>${s.operator ? ` <span class="bldsent__op">${esc(s.operator)}</span>` : ''}
        <span class="bldsent__mw num">${esc(fmt(Number(s.capacity.it_power_mw), 0))} MW</span></p>
      <p class="bldsent__s">${esc(c.text)} ${c.tag}</p>
      <p class="bldsent__m">${esc(mark.word)} · confidence ${esc(s.confidence || 'unknown')}${
        s.county_boundary_risk ? ' · sits within one simplified boundary width of a county line, so the neighbouring county is not ruled out' : ''
      }${s.osm ? ` · <span class="bldsent__ref">${esc(s.osm)}</span>` : ''}</p>
    </li>`;
  }).join('');

  const total = (dc.counts && dc.counts.with_capacity_tag) || tagged.length;
  return `<section class="bldsec" id="largest" aria-labelledby="bld-largest">
  <h2 class="bldsec__h" id="bld-largest">${icon('under_construction')} The largest tagged sites</h2>
  <p class="bldsec__l">The ${tagged.length} biggest of the <b>${esc(N(total))}</b> sites carrying an IT-power
     tag — two per cent of the map. This is not a ranking of the largest datacentres in the United States.
     It is a ranking of the ones a volunteer typed a megawatt figure into. Each line is the site's own stable
     sentence, then the live grid reading for the grid it sits on, carrying that reading's state.</p>
  <ol class="bldsents">${rows}</ol>
</section>`;
}

// ---------------------------------------------------------------------------
// Method, sources, limits.
// ---------------------------------------------------------------------------

function sourceTable(dc) {
  const rows = (dc.sources || []).map((s) => `<tr>
    <th scope="row">${esc(s.label || s.id)}<span class="usm__sub">${esc(s.gives || '')}</span></th>
    <td class="usm__num num">${esc(Number.isFinite(s.sites) ? N(s.sites) : '—')}</td>
    <td>${stateTag(s.state, s.origin ? `via ${s.origin}` : '')}</td>
    <td class="bldsrc__e">${s.error ? esc(String(s.error).slice(0, 160)) : '<span class="usm__sub">no error</span>'}</td>
  </tr>`).join('');
  return `<div class="bldtw"><table class="bldt">
    <caption class="usm__tcap">Every source, its state on this build, and where its bytes came from —
      network, cache, stale cache or local file. A stale cache is not a live read and is never printed as one.
      The count is what the source returned, before the county filter: OpenStreetMap answered with 1,958
      elements over three bounding boxes that necessarily include Canada, Mexico and the Caribbean, and
      ${esc(N((dc.counts && dc.counts.dropped_outside_us) || 0))} of them were in no US county and were
      dropped rather than placed.</caption>
    <thead><tr>
      <th scope="col">Source</th><th scope="col" class="usm__num">Sites</th>
      <th scope="col">State</th><th scope="col">Error</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

function methodSection(ctx, dc, model) {
  const copy = dc.copy || {};
  const statusLegend = STATUS_ORDER.map((k) => (
    `<li><span class="bldleg__g" data-dc="${esc(k)}">${dcIcon(k)}</span>
     <b>${esc(STATUS_MARKS[k].word)}</b> — ${esc((copy.status_legend && copy.status_legend[k]) || '')}</li>`
  )).join('');
  const confLegend = ['high', 'medium', 'low'].map((k) => (
    `<li><b>${esc(k)}</b> — ${esc((copy.confidence_legend && copy.confidence_legend[k]) || '')}</li>`
  )).join('');
  const honesty = (dc.honesty || []).map((h) => `<li>${esc(h)}</li>`).join('');

  return `<section class="bldsec" id="method" aria-labelledby="bld-method">
  <h2 class="bldsec__h" id="bld-method">${icon('sec-method')} How this was built, and what is wrong with it</h2>

  <h3 class="bldsec__h3">Status, in words</h3>
  <ul class="bldleg">${statusLegend}</ul>
  <h3 class="bldsec__h3">Confidence, in words</h3>
  <p class="bldsec__l">Confidence is a statement about the <b>record</b>, not about the building.</p>
  <ul class="bldleg bldleg--plain">${confLegend}</ul>

  <h3 class="bldsec__h3">The sources</h3>
  ${sourceTable(dc)}

  <h3 class="bldsec__h3">Every limitation, in full</h3>
  <ol class="bldlim">${honesty}</ol>
  <p class="bldsec__n">Two of the sources share one host, and the whole existing half of this map depends on a
     single volunteer-run Overpass instance. Three mirrors and a seven-day disk cache are the only redundancy
     there is. Sites geocode against Census county polygons simplified to about 550 metres, so a site on a
     county line can land in the neighbouring county; ${esc(N(dc.sites.filter((s) => s.county_boundary_risk).length))}
     pins carry that flag.</p>

  <h3 class="bldsec__h3">What was tried and dropped</h3>
  <p class="bldsec__l">The Federal Register names no datacentre projects: of 437 documents whose full text
     carries the phrase over eighteen months, four have it in the title and not one of them is a project — a
     flight-data web portal, a paediatric emergency data repository, a permitting executive order and a
     listening session. SEC full-text search returns the filer's registered head office rather than the site,
     so it adds no pins and is used only to corroborate an operator. Full OpenStreetMap geometry would give a
     footprint area at roughly ten times the payload and a materially higher chance of the query timing out on
     a server that was already refusing requests; that trade was made in favour of the query completing, which
     is why there is no area field anywhere on this page.</p>

  <p class="bldsec__stamp">Compiled ${esc(utc(dc.generated_at))} from
     <a href="${esc(ctx.href('/api/datacenters.json'))}">the same JSON this page reads</a>.
     Infrastructure readings from the ${esc(utc(dc.infra_generated_at))} Watts run.
     Drought map dated ${esc(model.usdm_map_date || 'unknown')}, ${stateTag(model.usdm_state)}.
     Streamflow day ${esc(model.usgs_reading_day || 'unknown')}, ${stateTag(model.usgs_state)}.
     This does not feed the ${esc(brand.NAME)} index and has no route into it:
     <code>collector/engine.mjs</code> does not read this file, and none of these sources sits in the frozen
     reference distribution the composite is scored against.</p>
</section>`;
}

// ---------------------------------------------------------------------------
// The sibling card. /watts and /map are the same subject through two
// instruments, and each is the obvious next click from the other.
// ---------------------------------------------------------------------------

function siblingCard(ctx) {
  return `<aside class="bldsib">
  <p class="bldsib__k">Same subject, different instrument</p>
  <h2 class="bldsib__h"><a href="${esc(ctx.href('/watts.html'))}">Watts — the infrastructure index</a></h2>
  <p class="bldsib__p">This page asks <b>where the buildings are</b>. Watts asks <b>how the substrate is
     holding up</b>: grid overnight floors in three control regions, streamflow at the nine gauges above,
     drought across ten states, and the SEC and Federal Register paper trail, scored on to a five-stop scale.
     Every grid number and every gauge reading on this page is the same reading Watts prints, read from the
     same run.</p>
</aside>`;
}

// ---------------------------------------------------------------------------
// render
// ---------------------------------------------------------------------------

export function render(ctx) {
  if (!hasDatacenters(ctx)) return emptyPage(ctx);
  const dc = ctx.datacenters;
  const model = mapModel(dc);
  const copy = dc.copy || {};
  const c = dc.counts || {};
  const t = model.totals;

  const headline = `${N(c.sites)} datacentres mapped, ${N(t.inDrought)} of them in a county in drought`;

  const description =
    `Every datacentre OpenStreetMap has mapped in the United States — ${N(c.sites)} sites, ` +
    `${N((c.by_status || {}).under_construction)} under construction, ${N((c.by_status || {}).announced)} proposed — ` +
    `joined to the US Drought Monitor category of the county each one sits in, the nearest of nine USGS river ` +
    `gauges, and the grid it draws from. ${N(t.inDrought)} pins stand in a county in drought; ` +
    `${N(t.withGridReading)} sit on a grid that publishes a real-time demand number without an account. ` +
    `Nothing here measures a datacentre's power or water draw, and the page says so above the map. ` +
    `Compiled ${utc(dc.generated_at)}.`;

  const caption = `<b>${esc(N(t.pinned))}</b> pins, equal-area Albers projection so the northern states are not
    inflated and Texas is not shrunk. Shape is status, size is capacity where it is published, colour is the
    drought category of the county the pin is standing in.
    ${t.gaugesPlotted === t.gaugesTotal
      ? `All ${t.gaugesTotal} river gauges are marked.`
      : `${t.gaugesPlotted} of ${t.gaugesTotal} river gauges are marked; the rest carry no coordinates in this file and are listed in words below.`}
    Below 760 pixels the map is replaced by the ranked table, because ${esc(N(t.pinned))} pins on a 343-pixel
    map is a smudge, and a smudge that cannot be read still looks authoritative.`;

  const main = `<style>${usMapCss()}${mapCss()}</style>
${iconSprite({ only: SPRITE })}
<div class="usm-scope bld">
<section class="bldhero">
  <p class="bldhero__eyebrow">A ${esc(brand.NAME)} sub-index · does not feed the main number</p>
  <h1 class="bldhero__h1">${esc(copy.name || 'The Build')}</h1>
  <p class="bldhero__sub">${esc(copy.question || '')}</p>
  <p class="bldhero__lede">${esc(copy.standfirst || '')}</p>
  <p class="bldhero__plain">${plainSentence(dc, model)}</p>
  ${counters(dc, model)}
</section>

${theClaim(dc)}

${jumpNav()}

<section class="bldsec" id="the-map" aria-labelledby="bld-map">
  <h2 class="bldsec__h" id="bld-map">${icon('sec-map')} The map</h2>
  <div class="bldmapwrap">
    ${mapFigure(model, { caption })}
    ${mapLegend(model)}
    <div class="bldstate" id="by-state">
      <p class="bldsmall">This screen is narrower than 760 pixels, so the map is not drawn.
         ${esc(N(t.pinned))} pins on a 343-pixel map is a smudge, and a smudge that cannot be read still looks
         authoritative. The ranked table below carries every channel the map encodes except position.</p>
      <h3 class="bldsec__h3 bldstate__h">${icon('rows')} By state, ranked</h3>
      <p class="bldsec__l">Every state in the contiguous frame, ranked by mapped sites. The states at the
         bottom with a zero are the point of this table.</p>
      ${mapTable(model, { emptyState: copy.empty_state || '' })}
    </div>
  </div>
</section>

${joinedExamples(dc, model)}

${waterSection(dc, model)}

${powerSection(dc, model)}

${largestSection(dc, model)}

${methodSection(ctx, dc, model)}

${siblingCard(ctx)}
</div>`;

  return page({
    ctx,
    path: PATH,
    title: `The Build — ${headline} · ${brand.NAME}`,
    ogTitle: `${brand.NAME}: ${headline}`,
    description,
    ogImage: ctx.cardFor ? ctx.cardFor('map') : null,
    ogImageAlt: `${brand.NAME} map of mapped United States datacentres: ${headline}`,
    jsonld: [dataset(ctx, dc, model)],
    main: main.split(ctxHrefPlaceholder).join(ctx.href('/watts.html')),
  });
}

/** ctx.datacenters absent. Builds, says so plainly, and carries noindex. */
function emptyPage(ctx) {
  return page({
    ctx,
    path: PATH,
    noindex: true,
    title: `The Build — the datacentre map · ${brand.NAME}`,
    description: `${brand.NAME}'s datacentre map has not published a run yet.`,
    main: `<style>${mapCss()}</style>
<section class="bldhero">
  <h1 class="bldhero__h1">The Build</h1>
  <p class="bldhero__sub">Where the datacentres are, and what the power and the water around them are doing.</p>
  <p class="bldhero__lede">No run has been published in this build. This is not an empty map — it is the
     absence of a map, and the two are different states. An empty map would be a finding, and it is not one
     we have.</p>
  <p class="bldsec__l">Run <code>collector/datacenters.mjs</code> and rebuild.</p>
</section>`,
  });
}

function dataset(ctx, dc, model) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: `${brand.NAME} — mapped United States datacentres and the resources around them`,
    description:
      'Every datacentre mapped in the United States by OpenStreetMap volunteers, with status read from the ' +
      'tag that set it, joined to the US Drought Monitor category of its county, the nearest of nine USGS ' +
      'streamflow gauges, and the balancing authority whose grid it sits on. Keyless public sources only. ' +
      'It does not measure any site\'s power or water draw; no public feed publishes that.',
    url: ctx.url(PATH),
    license: 'https://creativecommons.org/licenses/by/4.0/',
    creator: { '@type': 'Organization', name: brand.NAME, url: ctx.url('/') },
    dateModified: dc.generated_at,
    isAccessibleForFree: true,
    spatialCoverage: { '@type': 'Place', name: 'United States' },
    keywords: ['datacentres', 'artificial intelligence', 'electricity grid', 'drought', 'streamflow', 'OpenStreetMap'],
    distribution: [{
      '@type': 'DataDownload',
      encodingFormat: 'application/json',
      contentUrl: ctx.url('/api/datacenters.json'),
    }],
    variableMeasured: [
      { '@type': 'PropertyValue', name: 'mapped sites', value: model.totals.sites },
      { '@type': 'PropertyValue', name: 'sites under construction', value: (dc.counts && dc.counts.by_status && dc.counts.by_status.under_construction) ?? null },
      { '@type': 'PropertyValue', name: 'sites announced', value: (dc.counts && dc.counts.by_status && dc.counts.by_status.announced) ?? null },
      { '@type': 'PropertyValue', name: 'sites in a county carrying a drought category', value: model.totals.inDrought },
      { '@type': 'PropertyValue', name: 'sites in a county at D2 or worse', value: model.totals.severe },
      { '@type': 'PropertyValue', name: 'sites on a grid with a keyless real-time demand feed', value: model.totals.withGridReading },
      { '@type': 'PropertyValue', name: 'sites carrying an IT-power tag', value: (dc.counts && dc.counts.with_capacity_tag) ?? null },
    ],
  };
}

// ---------------------------------------------------------------------------
// CSS. Scoped to this page, shared tokens only, mobile first: every rule below
// starts at one column and widens.
// ---------------------------------------------------------------------------

function mapCss() {
  return `
.bld .dcico{flex:none}
.bldsec__h .dcico,.bldwarn__h .dcico{--ico:1.05em;color:var(--accent)}
.bldj a .dcico{--ico:1.15em;color:var(--accent)}

.bldhero{margin:0 0 var(--sec)}
.bldhero__eyebrow{font:500 var(--t-2xs)/1.3 var(--mono);letter-spacing:.09em;text-transform:uppercase;
  color:var(--ink-faint);margin:0 0 var(--s-2)}
.bldhero__h1{font:600 clamp(1.6rem,7vw,2.4rem)/1.08 var(--sans);letter-spacing:-.02em;margin:0 0 var(--s-3)}
.bldhero__sub{font:500 var(--t-sm)/1.5 var(--mono);color:var(--ink-dim);margin:0 0 var(--s-3);letter-spacing:.01em}
.bldhero__lede{font:400 var(--t-md)/1.5 var(--sans);color:var(--ink-dim);margin:0 0 var(--s-4);max-width:62ch}
.bldhero__plain{font:400 var(--t-base)/1.55 var(--sans);margin:0 0 var(--s-5);max-width:60ch;
  padding:var(--s-3) var(--s-4);background:var(--wash-alt);border-left:3px solid var(--accent);
  border-radius:var(--radius)}

.bldc{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:1px;
  background:var(--rule-soft);border:1px solid var(--rule-soft);border-radius:var(--radius);overflow:hidden}
.bldc__i{background:var(--bg);padding:var(--s-3);display:flex;flex-direction:column;gap:2px;min-width:0}
.bldc__i:first-child{grid-column:1 / -1}
.bldc__m{color:var(--accent);line-height:1}
.bldc__m .dcico{--ico:1.05rem}
.bldc__n{font:600 var(--t-xl)/1.05 var(--mono);font-variant-numeric:tabular-nums;color:var(--ink);margin-top:2px}
.bldc__l{font:500 var(--t-2xs)/1.3 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--ink-dim)}
.bldc__s{font:400 var(--t-2xs)/1.45 var(--sans);color:var(--ink-faint)}

.bldwarn{border:1px solid var(--rule);border-radius:var(--radius);padding:var(--s-4);
  margin:0 0 var(--sec);background:var(--bg-raised)}
.bldwarn__h{font:600 var(--t-md)/1.3 var(--sans);margin:0 0 var(--s-3);display:flex;align-items:center;gap:8px}
.bldwarn__p{font:400 var(--t-sm)/1.6 var(--sans);color:var(--ink-dim);margin:0 0 var(--s-3);max-width:66ch}
.bldwarn__p--lead{font-size:var(--t-base);color:var(--ink)}
.bldwarn__p--last{margin-bottom:0}
.bldwarn__p b{color:var(--ink)}

.bldj{margin:0 0 var(--sec);border-top:1px solid var(--rule-soft);border-bottom:1px solid var(--rule-soft);
  padding:var(--s-2) 0}
.bldj ul{list-style:none;margin:0;padding:0;display:flex;gap:6px;overflow-x:auto;scrollbar-width:thin}
.bldj a{display:inline-flex;align-items:center;gap:6px;flex:0 0 auto;padding:6px 10px;
  border:1px solid var(--rule);border-radius:7px;text-decoration:none;color:var(--ink-dim);
  font:500 var(--t-2xs)/1 var(--mono);letter-spacing:.07em;text-transform:uppercase;white-space:nowrap}
.bldj a:hover{color:var(--ink);border-color:var(--accent)}

.bldsec{margin:0 0 var(--sec-lg);scroll-margin-top:calc(var(--rail-h) + 12px)}

/* The map, its legend and the ranked table are ONE section in the DOM and the
   order between them flips at the width where the map stops being readable.
   Below 760px the table comes first and the map is not drawn at all; the note
   above it says why, because a section headed "The map" with no map in it is
   a bug until it explains itself. */
.bldmapwrap{display:flex;flex-direction:column;gap:var(--s-4)}
.bldmapwrap>.usm{order:1}
.bldmapwrap>.usm__legend{order:2;margin-top:0}
.bldstate{order:3;scroll-margin-top:calc(var(--rail-h) + 12px)}
.bldstate__h{margin-top:0}
.bldsmall{display:none}
@media (max-width: 759px){
  .bldstate{order:0}
  .bldsmall{display:block;font:400 var(--t-xs)/1.6 var(--sans);color:var(--ink-faint);
    margin:0 0 var(--s-3);padding:var(--s-3);border:1px dashed var(--rule);border-radius:var(--radius)}
}
.bldsec__h{font:600 var(--t-xl)/1.15 var(--sans);letter-spacing:-.01em;margin:0 0 var(--s-3);
  display:flex;align-items:center;gap:9px}
.bldsec__h3{font:600 var(--t-md)/1.3 var(--sans);margin:var(--s-5) 0 var(--s-2)}
.bldsec__l{font:400 var(--t-sm)/1.65 var(--sans);color:var(--ink-dim);margin:0 0 var(--s-3);max-width:68ch}
.bldsec__l b{color:var(--ink)}
.bldsec__n{font:400 var(--t-xs)/1.6 var(--sans);color:var(--ink-faint);margin:var(--s-3) 0 0;max-width:68ch}
.bldsec__n b{color:var(--ink-dim)}
.bldsec__stamp{font:400 var(--t-xs)/1.7 var(--mono);color:var(--ink-faint);margin:var(--s-4) 0 0;
  padding-top:var(--s-3);border-top:1px solid var(--rule-soft)}

.bldst{display:inline-flex;align-items:center;gap:5px;font:500 var(--t-2xs)/1 var(--mono);
  letter-spacing:.08em;padding:3px 7px;border:1px solid var(--rule);border-radius:3px;
  color:var(--ink-dim);white-space:nowrap}
.bldst__g{font-size:1.05em;line-height:1}
.bldst__x{color:var(--ink-faint);letter-spacing:.02em;text-transform:none}
.bldst.is-live{color:var(--ok);border-color:currentColor}
.bldst.is-wait{color:var(--stale);border-style:dashed;border-color:currentColor}
.bldst.is-dark{color:var(--dark-src);border-style:dotted;border-color:currentColor}

.bldd{margin:var(--s-3) 0 0}
.bldd__bar{display:flex;height:16px;border-radius:3px;overflow:hidden;border:1px solid var(--rule-soft)}
.bldd__s{display:block;min-width:2px}
.bldd__s .usm__sw{display:block;width:100%;height:100%;border-radius:0;outline:0}
.bldd__key{list-style:none;margin:var(--s-3) 0 0;padding:0;display:grid;gap:4px}
.bldd__key li{display:flex;align-items:center;gap:8px;font:400 var(--t-xs)/1.4 var(--mono)}
.bldd__n{margin-left:auto;font-variant-numeric:tabular-nums;color:var(--ink);font-weight:600}
.bldd__p{width:4.2em;text-align:right;font-variant-numeric:tabular-nums;color:var(--ink-faint)}

.bldgs{list-style:none;margin:var(--s-4) 0 0;padding:0;display:grid;grid-template-columns:1fr;gap:var(--s-3)}
.bldg{border:1px solid var(--rule);border-radius:var(--radius);padding:var(--s-3) var(--s-4)}
.bldg--is-wait{border-style:dashed}
.bldg--none{border-style:dotted;opacity:.9}
.bldg__top{display:flex;align-items:baseline;gap:var(--s-3);justify-content:space-between}
.bldg__k{font:600 var(--t-sm)/1.2 var(--mono);letter-spacing:.05em}
.bldg__c{font:400 var(--t-xs) var(--mono);font-variant-numeric:tabular-nums;color:var(--ink);white-space:nowrap}
.bldg__c small{color:var(--ink-faint)}
.bldg__v{margin:var(--s-2) 0 0;font:400 var(--t-xs) var(--mono);color:var(--ink-faint)}
.bldg__v b{font:600 var(--t-lg)/1 var(--mono);font-variant-numeric:tabular-nums;color:var(--ink);margin-right:5px}
.bldg__lab{font:400 var(--t-2xs)/1.45 var(--mono);color:var(--ink-faint);margin:3px 0 var(--s-2)}
.bldg__why{font:400 var(--t-xs)/1.6 var(--sans);color:var(--ink-dim);margin:var(--s-2) 0;max-width:56ch}

.bldtw{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:var(--s-3) 0 0;
  border:1px solid var(--rule-soft);border-radius:var(--radius)}
.bldt{border-collapse:collapse;width:100%;min-width:30rem;
  font:400 var(--t-xs)/1.4 var(--mono);font-variant-numeric:tabular-nums}
.bldt th,.bldt td{padding:var(--s-2) var(--s-3);text-align:left;vertical-align:top;
  border-bottom:1px solid var(--rule-soft)}
.bldt thead th{font:600 var(--t-2xs)/1.3 var(--mono);letter-spacing:.08em;text-transform:uppercase;
  color:var(--ink-faint);background:var(--bg-sunken);white-space:nowrap}
.bldt tbody tr:last-child td{border-bottom:0}
.bldt tbody th{font-weight:600;color:var(--ink);min-width:12rem}
.bldsrc__e{white-space:normal;max-width:24rem;color:var(--ink-faint)}

.bldleg{list-style:none;margin:0;padding:0;display:grid;gap:7px}
.bldleg li{font:400 var(--t-sm)/1.55 var(--sans);color:var(--ink-dim);max-width:68ch;
  display:flex;gap:8px;align-items:baseline}
.bldleg b{color:var(--ink)}
.bldleg--plain li{display:block}
.bldleg__g{color:var(--ink);width:1.1em;flex:none;font-family:var(--mono)}

.bldlim{margin:0;padding-left:1.35em;display:grid;gap:8px}
.bldlim li{font:400 var(--t-sm)/1.6 var(--sans);color:var(--ink-dim);max-width:68ch}

.bldsents{list-style:none;margin:var(--s-4) 0 0;padding:0;display:grid;gap:1px;
  background:var(--rule-soft);border:1px solid var(--rule-soft);border-radius:var(--radius);overflow:hidden}
.bldsent{background:var(--bg);padding:var(--s-3) var(--s-4)}
.bldsent__h{margin:0;font:400 var(--t-sm)/1.4 var(--mono);display:flex;gap:7px;align-items:baseline;flex-wrap:wrap}
.bldsent__h b{font-weight:600;color:var(--ink)}
.bldsent__g{color:var(--ink-faint)}
.bldsent__op{color:var(--ink-faint);font-size:var(--t-xs)}
.bldsent__mw{margin-left:auto;font-weight:600;color:var(--accent);font-variant-numeric:tabular-nums;white-space:nowrap}
.bldsent__s{margin:var(--s-2) 0 0;font:400 var(--t-xs)/1.6 var(--sans);color:var(--ink-dim);max-width:72ch}
.bldsent__st{display:inline-flex;align-items:center;gap:4px;margin-left:5px;font:500 var(--t-2xs)/1 var(--mono);
  letter-spacing:.06em;padding:2px 5px;border:1px solid currentColor;border-radius:3px}
.bldsent__st.is-live{color:var(--ok)}
.bldsent__st.is-wait{color:var(--stale);border-style:dashed}
.bldsent__st.is-dark{color:var(--dark-src);border-style:dotted}
.bldsent__m{margin:5px 0 0;font:400 var(--t-2xs)/1.5 var(--mono);color:var(--ink-faint)}
.bldsent__ref{color:var(--ink-faint)}

.bldexs{list-style:none;margin:var(--s-4) 0 0;padding:0;display:grid;grid-template-columns:1fr;gap:var(--s-3)}
.bldex{border:1px solid var(--rule);border-left:3px solid var(--accent-2);border-radius:var(--radius);
  padding:var(--s-3) var(--s-4)}
.bldex__k{margin:0;font:500 var(--t-2xs)/1.3 var(--mono);letter-spacing:.09em;text-transform:uppercase;
  color:var(--ink-faint)}
.bldex__h{margin:var(--s-1) 0 0;font:400 var(--t-sm)/1.4 var(--mono);display:flex;gap:7px;
  align-items:baseline;flex-wrap:wrap}
.bldex__h b{font-weight:600;color:var(--ink)}
.bldex__g{color:var(--ink-faint)}
.bldex__s{margin:var(--s-2) 0 0;font:400 var(--t-xs)/1.65 var(--sans);color:var(--ink-dim)}
.bldex__w{margin:var(--s-2) 0 0;font:400 var(--t-2xs)/1.6 var(--sans);color:var(--ink-faint);max-width:60ch}

.bldsib{border:1px solid var(--rule);border-left:3px solid var(--accent-2);border-radius:var(--radius);
  padding:var(--s-4);margin:0 0 var(--sec);background:var(--bg-raised)}
.bldsib__k{font:500 var(--t-2xs)/1.3 var(--mono);letter-spacing:.09em;text-transform:uppercase;
  color:var(--ink-faint);margin:0 0 var(--s-2)}
.bldsib__h{font:600 var(--t-md)/1.3 var(--sans);margin:0 0 var(--s-2)}
.bldsib__h a{color:var(--ink)}
.bldsib__p{font:400 var(--t-sm)/1.6 var(--sans);color:var(--ink-dim);margin:0;max-width:68ch}

@media (min-width: 620px) {
  .bldc{grid-template-columns:repeat(3,1fr)}
  .bldc__i:first-child{grid-column:auto}
}
@media (min-width: 900px) {
  .bldc{grid-template-columns:repeat(5,1fr)}
  .bldgs{grid-template-columns:1fr 1fr}
  .bldexs{grid-template-columns:1fr 1fr}
}
`;
}
