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
// mapTable is deliberately NOT imported. _usmap.mjs still exports it and it is
// still correct; this page now renders its own jurisdiction table instead,
// because the table has to carry a per-row focus control, per-row sort keys and
// a filter-aware column, and those are page furniture rather than map internals.
// Every honest string mapTable printed — the caption, the zero rows carrying
// copy.empty_state, the off-frame paragraph — is carried through verbatim.
import {
  mapModel, mapFigure, mapLegend, usMapCss,
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
  { href: '#what-moves', label: 'What moves', icon: 'sec-substrate' },
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
// THE CONSOLE — the filter rail, the readout, the jurisdiction focus.
//
// docs/ENGAGEMENT.md §1.2 measured the one mechanic that separates pizzint's
// page from ours, and it is not animation: it is SEVERAL DATASETS SWAPPED INTO
// ONE SLOT, so there is always a next thing to look at without a page load.
// §8.5 says to build it the way site/templates/_switcher.mjs already does —
// off-screen radios, CSS `:checked`, no script — so that every state of the
// control is in the served HTML and a screenshot taken before hydration shows
// a complete page. site/templates/_xwire.mjs states the reason in one line:
// a widget that "renders nothing until it executes" is "the exact failure we
// beat pizzint on".
//
// So this control is three native radio groups and roughly two hundred
// generated CSS rules. No script switches anything. The script that ships at
// the bottom of this file adds three things that CSS cannot do — a ticking
// age, a sortable table and scroll-into-view — and removes nothing.
//
// ---------------------------------------------------------------------------
// THE ONE DESIGN DECISION WORTH ARGUING WITH: THIS FILTER DIMS, IT NEVER HIDES
// ---------------------------------------------------------------------------
// A filter that removes rows is a filter that can hide a dark source. Set it
// once, forget it is set, and the page quietly tells you a thing that is not
// true — which is the failure this whole repository is built against. So every
// control here is a HIGHLIGHTER: 1,877 pins and 49 rows stay in the DOM at
// every setting, the map fades the non-matching pins rather than dropping
// them, and the table dims a column rather than deleting it. Nothing you can
// press on this page can reduce what a crawler, a screen reader, a reader with
// CSS off, or Ctrl-F can find.
//
// The fourth water filter exists for the same reason. "No drought reading" is
// its own selectable state, never folded into "none", so the pins whose county
// did not resolve can be isolated and counted rather than silently scored as
// dry-enough. On this build that bucket is zero because the Drought Monitor
// answered for every county; if it is ever non-zero the control is already
// there to show you which pins it is.
// ---------------------------------------------------------------------------

const UID = 'dcf';

/** Shape filter. Keys are the STATUS_ORDER values, plus 'all'. */
const SHAPE_FILTERS = [
  { k: 'all', tab: 'every shape', gloss: 'all three statuses drawn at full strength' },
  { k: 'operating', tab: 'operating', gloss: 'the building exists — not a claim that anything is running in it' },
  { k: 'under_construction', tab: 'building', gloss: 'a hole in the ground and a crane, in OpenStreetMap' },
  { k: 'announced', tab: 'announced', gloss: 'located to the evidence, never more precisely' },
];

/** Water filter. 'unread' is the honesty control; see the header note. */
const WATER_FILTERS = [
  { k: 'all', tab: 'every county', gloss: 'no colour filter' },
  { k: 'any', tab: 'in a category', gloss: 'the county carries D0 or worse this week' },
  { k: 'severe', tab: 'D2 or worse', gloss: 'severe, extreme or exceptional drought' },
  { k: 'unread', tab: 'no reading', gloss: 'the Drought Monitor row for this county did not resolve — unknown, not none' },
];

function shapeHit(status, k) {
  return k === 'all' || status === k;
}

function waterHit(cat, k) {
  if (k === 'all') return true;
  if (k === 'any') return cat !== 'none' && cat !== 'nodata';
  if (k === 'severe') return cat === 'D2' || cat === 'D3' || cat === 'D4';
  return cat === 'nodata';
}

/**
 * The joint distribution the model does not carry. mapModel gives per-state
 * status counts and per-state drought counts separately; a cross-filtered
 * figure needs the pair, so it is counted here in one pass. Pure, ordered by
 * the source array, no clock.
 */
function jointCounts(dc, model) {
  const cat = catResolver(dc);
  const nat = {};
  const byState = {};
  for (const st of model.states) byState[st.ab] = {};
  for (const site of dc.sites) {
    const s = STATUS_ORDER.includes(site.status) ? site.status : 'operating';
    const c = cat(site);
    const key = `${s}|${c}`;
    nat[key] = (nat[key] || 0) + 1;
    const ab = site.state;
    if (ab && byState[ab]) byState[ab][key] = (byState[ab][key] || 0) + 1;
  }
  return { nat, byState };
}

/** The same category rule mapModel uses, re-derived rather than re-guessed. */
function catResolver(dc) {
  const ri = dc.resources_index || {};
  const byCounty = ri.drought_by_county || {};
  return (site) => {
    const fips = site.county_fips
      || (site.resources && site.resources.drought && site.resources.drought.county_fips);
    const row = fips ? byCounty[fips] : null;
    if (!row || !row.headline || !row.headline.category) return 'nodata';
    const c = String(row.headline.category);
    return DROUGHT_ORDER.includes(c) ? c : 'nodata';
  };
}

function crossCount(bucket, s, w) {
  let n = 0;
  for (const status of STATUS_ORDER) {
    if (!shapeHit(status, s)) continue;
    for (const c of DROUGHT_ORDER) {
      if (!waterHit(c, w)) continue;
      n += bucket[`${status}|${c}`] || 0;
    }
  }
  return n;
}

/**
 * Sixteen spans, one per filter pair, of which CSS shows exactly one. This is
 * the whole mechanism behind "counts that update with the active filter", and
 * it is why there is no script in the path: the figure for every setting is
 * already in the HTML, so the count cannot lag the control and cannot be wrong
 * in a screenshot.
 */
function crossSpans(bucket, cls = 'dcnum') {
  return SHAPE_FILTERS.map((s) => WATER_FILTERS.map((w) => (
    `<b class="${cls} num" data-sd="${esc(s.k)}|${esc(w.k)}" title="${esc(s.tab)} · ${esc(w.tab)}">${
      esc(N(crossCount(bucket, s.k, w.k)))}</b>`
  )).join('')).join('');
}

/**
 * A drought-derived figure is only a figure while the Drought Monitor is live.
 * docs/VOICE.md §4 and the brief for this page are the same rule: an unknown
 * count prints as unknown. If USDM went dark every county would resolve to
 * 'nodata' and "0 in a category" would be a lie in the shape of a measurement.
 */
function droughtFigure(model, value) {
  if (model.usdm_state === 'live') return esc(N(value));
  return '<span class="dcunk" title="the US Drought Monitor did not answer on this run">unknown</span>';
}

// ---------------------------------------------------------------------------
// The readout. Five cells, four of which move when the control moves, and one
// of which is the same denominator in every state of the control so there is
// always something to divide by.
// ---------------------------------------------------------------------------

function readout(dc, model, joint) {
  const t = model.totals;
  const nodata = model.droughtCounts.nodata;
  const cells = [
    {
      k: 'PINS IN VIEW',
      v: crossSpans(joint.nat, 'dcro__n'),
      s: `of ${N(t.pinned)} drawn · dimmed, never removed`,
      wide: true,
    },
    {
      k: 'JURISDICTION',
      v: `<b class="dcro__n num" data-j0>NATIONAL</b>${model.states.map((st) => (
        `<b class="dcro__n dcro__n--ab" data-jv="${esc(st.ab)}">${esc(st.ab)}</b>`
      )).join('')}`,
      s: `${N(model.states.filter((s) => s.total > 0).length)} of ${N(model.states.length)} states carry a pin`,
    },
    {
      k: 'IN A CATEGORY',
      v: `<b class="dcro__n num">${droughtFigure(model, t.inDrought)}</b>`,
      s: `${N(t.severe)} of those at D2 or worse · week of ${model.usdm_map_date || 'unknown'}`,
    },
    {
      k: 'NO DROUGHT READING',
      v: `<b class="dcro__n num">${model.usdm_state === 'live' ? esc(N(nodata)) : '<span class="dcunk">unknown</span>'}</b>`,
      s: model.usdm_state === 'live'
        ? (nodata === 0
          ? 'every county resolved on this run — a measured zero, not a blank'
          : 'unknown, and never counted as none')
        : 'the Drought Monitor did not answer on this run',
    },
    {
      k: 'LIVE GRID NUMBER',
      v: `<b class="dcro__n num">${esc(N(t.withGridReading))}</b>`,
      s: `${N(t.sites - t.withGridReading)} sit on a grid with no keyless feed`,
    },
  ];
  return `<ul class="dcro" aria-label="Live counts for the current filter">${cells.map((c) => (
    `<li class="dcro__i${c.wide ? ' dcro__i--wide' : ''}">
      <span class="dcro__k">${esc(c.k)}</span>
      <span class="dcro__v">${c.v}</span>
      <span class="dcro__s">${esc(c.s)}</span>
    </li>`
  )).join('')}</ul>`;
}

// ---------------------------------------------------------------------------
// The control rail itself.
// ---------------------------------------------------------------------------

function chip(group, f, count) {
  const id = `${UID}-${group}-${f.k}`;
  return `<label class="dcch" for="${esc(id)}" title="${esc(f.gloss)}">
    <span class="dcch__l">${esc(f.tab)}</span>
    <b class="dcch__n num"${count === '0' ? ' data-zero="1"' : ''}>${count}</b>
  </label>`;
}

function shapeRail(model, joint) {
  const n = (k) => esc(N(crossCount(joint.nat, k, 'all')));
  return `<div class="dcgrp">
    <p class="dcgrp__h"><span class="dcgrp__t">Shape</span> <span class="dcgrp__g">status, from the OpenStreetMap tag that set it</span></p>
    <div class="dcgrp__r">${SHAPE_FILTERS.map((f) => chip('s', f, n(f.k))).join('')}</div>
  </div>`;
}

function waterRail(model, joint) {
  const live = model.usdm_state === 'live';
  const n = (k) => (live ? esc(N(crossCount(joint.nat, 'all', k))) : '<span class="dcunk">?</span>');
  return `<div class="dcgrp">
    <p class="dcgrp__h"><span class="dcgrp__t">Colour</span> <span class="dcgrp__g">the US Drought Monitor category of the county the pin stands in</span></p>
    <div class="dcgrp__r">${WATER_FILTERS.map((f) => chip('w', f, n(f.k))).join('')}</div>
  </div>`;
}

function jurisdictionRail(model) {
  const all = `<label class="dcch dcch--j" for="${UID}-j-ALL" title="Every state in the drawn frame">
    <span class="dcch__l">National</span>
    <b class="dcch__n num">${esc(N(model.states.length))}</b>
  </label>`;
  const chips = model.states.map((s) => (
    `<label class="dcch dcch--j" for="${UID}-j-${esc(s.ab)}" title="${esc(s.name)}">
      <span class="dcch__l">${esc(s.ab)}</span>
      <b class="dcch__n num"${s.total === 0 ? ' data-zero="1"' : ''}>${esc(N(s.total))}</b>
    </label>`
  )).join('');
  return `<div class="dcgrp dcgrp--j">
    <p class="dcgrp__h"><span class="dcgrp__t">Jurisdiction</span> <span class="dcgrp__g">focus one state — its dossier opens below the map and its row lights in the table</span></p>
    <div class="dcgrp__r dcgrp__r--scroll">${all}${chips}</div>
  </div>`;
}

/**
 * Every radio, in the sibling order the generated CSS depends on: shape, then
 * colour, then jurisdiction, then `.dcx`. That order IS the state machine — a
 * `#a:checked ~ #b:checked ~ .dcx` chain only resolves left to right — so
 * these three lists are emitted from one function for the same reason
 * _switcher.mjs emits its three from one array.
 *
 * Each input carries its own aria-label naming the group it belongs to. The
 * visible chip is a <label for>, and a state row in the table is a SECOND
 * <label for> on the same input; with two labels pointing at one control the
 * accessible name would otherwise be the two of them concatenated. The
 * aria-label settles it, and it still contains the visible chip text, so
 * "label in name" holds.
 */
function radios(model) {
  const s = SHAPE_FILTERS.map((f, i) => (
    `<input class="dcin" type="radio" name="${UID}-s" id="${UID}-s-${esc(f.k)}"` +
    ` aria-label="Shape filter: ${esc(f.tab)}"${i === 0 ? ' checked' : ''}>`
  )).join('');
  const w = WATER_FILTERS.map((f, i) => (
    `<input class="dcin" type="radio" name="${UID}-w" id="${UID}-w-${esc(f.k)}"` +
    ` aria-label="Colour filter: ${esc(f.tab)}"${i === 0 ? ' checked' : ''}>`
  )).join('');
  const j = `<input class="dcin" type="radio" name="${UID}-j" id="${UID}-j-ALL" data-ab="ALL"` +
    ` aria-label="Jurisdiction: national, every state in the frame" checked>`
    + model.states.map((st) => (
      `<input class="dcin" type="radio" name="${UID}-j" id="${UID}-j-${esc(st.ab)}"` +
      ` data-ab="${esc(st.ab)}" aria-label="Jurisdiction: ${esc(st.ab)} ${esc(st.name)}">`
    )).join('');
  return `${s}${w}${j}`;
}

// ---------------------------------------------------------------------------
// The state dossier. Forty-nine of them, all in the HTML, one visible.
// ---------------------------------------------------------------------------

function dossier(st, dc, model, joint) {
  const bucket = joint.byState[st.ab] || {};
  const cats = DROUGHT_ORDER.filter((k) => st.drought[k] > 0);
  const gridList = [...st.grids.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([key, count]) => {
      const row = model.gridRows.find((g) => g.key === key);
      const label = row ? row.label : key;
      const r = row && row.reading;
      return `<li class="dcd__g">
        <b>${esc(label)}</b> <span class="dcd__gn num">${esc(N(count))} pins</span>
        ${r
    ? `<span class="dcd__gv num">${esc(fmt(r.value, 2))}${r.unit ? (r.unit.startsWith('%') ? esc(r.unit) : ` ${esc(r.unit)}`) : ''}</span>${stateTag(r.state)}`
    : `<span class="dcd__gw">${esc((row && row.why) || 'no keyless feed')}</span>${stateTag('dark', 'no number to print')}`}
      </li>`;
    }).join('');

  const capacity = st.withCapacity > 0
    ? `${N(st.withCapacity)} of ${N(st.total)} sites carry an IT-power tag, totalling ${fmt(st.capacityMw, 1)} MW. That is a sum over ${((st.withCapacity / st.total) * 100).toFixed(1)}% of this state and is not the state's datacentre load.`
    : `No site in ${st.name} carries an IT-power tag, so no megawatt figure is printed for it. That is a statement about OpenStreetMap's tagging, not about the buildings.`;

  const empty = (dc.copy && dc.copy.empty_state) || '';

  return `<article class="dcd" data-j="${esc(st.ab)}" aria-label="${esc(st.name)} dossier">
    <header class="dcd__h">
      <b class="dcd__ab">${esc(st.ab)}</b>
      <span class="dcd__nm">${esc(st.name)}</span>
      <span class="dcd__t num">${esc(N(st.total))} <small>mapped</small></span>
    </header>
    <p class="dcd__m"><span class="dcd__mk">matching the filter</span>
      ${crossSpans(bucket, 'dcd__mn')}
      <span class="dcd__ms">of ${esc(N(st.total))} in this state</span></p>
    ${st.total === 0
    ? `<p class="dcd__z">${esc(empty)}</p>`
    : `<ul class="dcd__s">${STATUS_ORDER.map((k) => (
      `<li data-k="${esc(k)}"><span class="dcd__sg">${dcIcon(k)}</span><b>${esc(STATUS_MARKS[k].word)}</b>
         <span class="dcd__sn num">${esc(N(st[k]))}</span></li>`
    )).join('')}</ul>
    <ul class="dcd__w">${cats.map((k) => (
      `<li class="usm__k-${esc(k.toLowerCase())}" data-w="${esc(k)}"><span class="usm__sw" aria-hidden="true"></span>
        <b>${esc(DROUGHT_WORDS[k].label)}</b> <span class="dcd__sn num">${esc(N(st.drought[k]))}</span></li>`
    )).join('')}${st.drought.nodata === 0 && model.usdm_state === 'live'
      ? '<li class="dcd__ok">every county under a pin here resolved on this run</li>' : ''}</ul>
    <ul class="dcd__gs">${gridList}</ul>
    <p class="dcd__c">${esc(capacity)}</p>`}
  </article>`;
}

function dossiers(dc, model, joint) {
  const t = model.totals;
  const national = `<article class="dcd dcd--nat" data-j="ALL" aria-label="National dossier">
    <header class="dcd__h">
      <b class="dcd__ab">US</b>
      <span class="dcd__nm">the contiguous frame</span>
      <span class="dcd__t num">${esc(N(t.pinned))} <small>pinned</small></span>
    </header>
    <p class="dcd__m"><span class="dcd__mk">matching the filter</span>
      ${crossSpans(joint.nat, 'dcd__mn')}
      <span class="dcd__ms">of ${esc(N(t.sites))} mapped</span></p>
    <p class="dcd__p">Pick a state above, or press a row in the table, to open its dossier here: the status
      split, the drought under its pins, every balancing authority its pins sit on with that authority's live
      number or the named reason there is not one, and whether anybody tagged a megawatt figure.
      ${model.offFrame.length === 0
    ? 'Every mapped site in this build fell inside the drawn frame, so nothing is listed away from the map.'
    : `${esc(N(model.offFrame.length))} sites fell outside the drawn frame and are listed in words below rather than dragged to the edge.`}</p>
  </article>`;
  return `<div class="dcds">${national}${model.states.map((s) => dossier(s, dc, model, joint)).join('')}</div>`;
}

// ---------------------------------------------------------------------------
// The jurisdiction table. Server-rendered whole, ranked by total, every state
// including the zeroes. Sorting is added by script; the buttons do not exist
// until the script creates them, so nothing on this page is a control that
// looks pressable and is not.
// ---------------------------------------------------------------------------

function jurisdictionTable(dc, model, joint) {
  const empty = (dc.copy && dc.copy.empty_state) || '';
  const max = model.states.reduce((m, s) => Math.max(m, s.total), 1);
  const w = (n) => `${((n / max) * 100).toFixed(2)}%`;

  const rows = model.states.map((s) => {
    const bucket = joint.byState[s.ab] || {};
    const topGrid = s.total > 0
      ? [...s.grids.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
      : null;
    const gridRow = topGrid ? model.gridRows.find((g) => g.key === topGrid[0]) : null;
    const gridLabel = gridRow ? gridRow.label : (topGrid ? topGrid[0] : '—');
    const hasReading = Boolean(gridRow && gridRow.reading);
    const worst = s.total > 0 ? s.worst : 'nodata';
    return `<tr data-jrow="${esc(s.ab)}"${s.total === 0 ? ' class="usm__zero"' : ''}
      data-v-ab="${esc(s.ab)}" data-v-total="${s.total}" data-v-op="${s.operating}"
      data-v-bld="${s.under_construction}" data-v-ann="${s.announced}"
      data-v-dro="${DROUGHT_ORDER.indexOf(worst)}" data-v-mw="${Math.round(s.capacityMw)}">
      <th scope="row" class="dcjt__st">
        <label class="dcjt__lb" for="${UID}-j-${esc(s.ab)}">
          <b>${esc(s.ab)}</b> <span>${esc(s.name)}</span>
        </label>
      </th>
      <td class="usm__barcell">
        <span class="usm__bar" aria-hidden="true">${s.total === 0 ? '' : (
    `<i class="usm__seg usm__seg--op" style="width:${w(s.operating)}"></i><i class="usm__seg usm__seg--uc" style="width:${w(s.under_construction)}"></i><i class="usm__seg usm__seg--an" style="width:${w(s.announced)}"></i>`
  )}</span>
        <b class="usm__tot num">${esc(N(s.total))}</b>
      </td>
      <td class="dcjt__f">${crossSpans(bucket, 'dcjt__fn')}</td>
      ${s.total === 0
    ? `<td class="usm__none" colspan="2">${esc(empty)}</td>`
    : `<td>${droughtChipLocal(worst)}<span class="usm__sub">${esc(N(s.inDrought))} of ${esc(N(s.total))} in a county with a category</span></td>
       <td>${esc(gridLabel)}<span class="usm__sub">${hasReading ? 'live demand feed' : 'no keyless demand feed'}${s.grids.size > 1 ? ` · ${s.grids.size} grids in state` : ''}</span></td>`}
      <td class="usm__num num" data-c="operating">${esc(N(s.operating))}</td>
      <td class="usm__num num" data-c="under_construction">${s.under_construction}</td>
      <td class="usm__num num" data-c="announced">${s.announced}</td>
    </tr>`;
  }).join('');

  const off = model.offFrame.length
    ? `<p class="usm__off"><b>${model.offFrame.length}</b> ${model.offFrame.length === 1 ? 'site is' : 'sites are'}
       outside the drawn frame and ${model.offFrame.length === 1 ? 'is' : 'are'} therefore not on the map —
       ${esc(model.offFrame.map((s) => `${s.name || 'unnamed site'} (${s.state || 'no state'})`).slice(0, 8).join('; '))}.
       The frame is the contiguous states. A pin outside it is listed rather than dragged to the edge.</p>`
    : `<p class="usm__off">Every mapped site in this build fell inside the drawn frame. A site outside it would
       be listed here in words rather than dragged to the edge of the picture.</p>`;

  return `<div class="usm__tw dcjt__w">
  <table class="usm__t dcjt" id="${UID}-jt">
    <caption class="usm__tcap">Every state in the frame, ranked by mapped sites, <b>including the ones with a
      zero</b> — those rows are the point of this table. This is also the map at phone width and the map with
      images off: it carries every channel the picture encodes except position. Press a state to focus it; the
      <b>filter</b> column is the count for the shape and colour you have selected above.
      <b>Op</b> operating, <b>Bld</b> under construction, <b>Ann</b> announced.</caption>
    <thead><tr>
      <th scope="col" data-sk="ab">State</th>
      <th scope="col" data-sk="total">Sites</th>
      <th scope="col">Filter</th>
      <th scope="col" data-sk="dro">Worst drought under a pin</th>
      <th scope="col">Grid most pins sit on</th>
      <th scope="col" class="usm__num" data-sk="op" title="operating">Op</th>
      <th scope="col" class="usm__num" data-sk="bld" title="under construction">Bld</th>
      <th scope="col" class="usm__num" data-sk="ann" title="announced">Ann</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
</div>${off}`;
}

/** Local copy of the drought chip so this table does not depend on a private
 *  helper in _usmap.mjs. Same classes, same words, same source of truth. */
function droughtChipLocal(cat) {
  return `<span class="usm__chip usm__k-${esc(cat.toLowerCase())}"><i aria-hidden="true"></i>${esc(DROUGHT_WORDS[cat].label)}</span>`;
}

// ---------------------------------------------------------------------------
// WHAT MOVES BETWEEN COLLECTS.
//
// docs/ENGAGEMENT.md §8.3 wants a "since you looked" element and §6 ranks it
// second on the steal list. The honest version of it for THIS page is smaller
// than that, and the reason is worth printing rather than hiding:
//
//   data/datacenters.json carries first_seen_at on every site, and on this
//   build all 1,877 of them hold the SAME value, equal to generated_at. The
//   field is stamped at collect time, not carried forward, so it cannot tell a
//   new site from an old one. A "23 new sites" line built on it would read as
//   1,877 new sites on every single run. That is a fabricated event, and
//   docs/MOTION.md §2.5 calls a page that reports change when none occurred
//   the pizzint failure mode in a different costume.
//
// So no site-level diff is printed. What IS printed is the set of things that
// genuinely move from collect to collect — three live grid readings with their
// own observation stamps, the Drought Monitor's weekly map date, the USGS
// reading day, and the age of the run — each with its source state attached.
// Those are real, they change, and the ticking age makes the panel the one
// always-moving, always-true atom on the page that §8.2 asks for.
// ---------------------------------------------------------------------------

function firstSeenSpread(dc) {
  let min = null; let max = null;
  for (const s of dc.sites) {
    const v = s.first_seen_at;
    if (!v) continue;
    if (min === null || v < min) min = v;
    if (max === null || v > max) max = v;
  }
  return { min, max, flat: min !== null && min === max };
}

function movesPanel(dc, model) {
  const spread = firstSeenSpread(dc);
  const live = model.gridRows.filter((g) => g.reading);
  const stamp = (iso, label, extra) => `<li class="dcmv__i">
    <span class="dcmv__k">${esc(label)}</span>
    <span class="dcmv__v"><time class="num" datetime="${esc(iso)}">${esc(utc(iso))}</time><span
      class="dcmv__a num" data-dcm-age datetime="${esc(iso)}" hidden></span></span>
    <span class="dcmv__s">${extra}</span>
  </li>`;

  const gridItems = live.map((g) => {
    const r = g.reading;
    const obs = r.observed_at || dc.infra_generated_at;
    return `<li class="dcmv__i">
      <span class="dcmv__k">${esc(g.label)}</span>
      <span class="dcmv__v"><b class="num">${esc(fmt(r.value, 2))}</b><span class="dcmv__u">${esc(r.unit || '')}</span>${
  obs ? `<span class="dcmv__a num" data-dcm-age datetime="${esc(obs)}" hidden></span>` : ''}</span>
      <span class="dcmv__s">${esc(r.label || 'reading')}${obs ? ` · observed ${esc(utc(obs))}` : ''} ${stateTag(r.state)}</span>
    </li>`;
  }).join('');

  return `<section class="dcmv" aria-labelledby="bld-moves">
  <div class="dcmv__hd">
    <h3 class="dcmv__h" id="bld-moves">${icon('sec-substrate')} What moves between collects</h3>
    <p class="dcmv__sub">${esc(N(live.length))} of ${esc(N(model.gridRows.length))} balancing authorities
      publish a number without an account. These are the only figures on this page that can differ from the
      ones you saw last time.</p>
  </div>
  <ul class="dcmv__l">
    ${stamp(dc.generated_at, 'this collect', 'the run that wrote every pin above')}
    ${gridItems}
    <li class="dcmv__i">
      <span class="dcmv__k">drought map</span>
      <span class="dcmv__v"><b class="num">${esc(model.usdm_map_date || 'unknown')}</b></span>
      <span class="dcmv__s">weekly, published Thursdays ${stateTag(model.usdm_state)}</span>
    </li>
    <li class="dcmv__i">
      <span class="dcmv__k">streamflow day</span>
      <span class="dcmv__v"><b class="num">${esc(model.usgs_reading_day || 'unknown')}</b></span>
      <span class="dcmv__s">day of year, against each gauge's own long-run median ${stateTag(model.usgs_state)}</span>
    </li>
  </ul>
  <p class="dcmv__n"><b>There is no new-sites line here, and that is deliberate.</b>
    ${spread.flat
    ? `Every one of the ${esc(N(dc.sites.length))} sites in this file carries the same <code>first_seen_at</code>
       — ${esc(utc(spread.min))} — which is this run's own timestamp. The field is stamped at collect time
       rather than carried forward, so it cannot separate a site found today from one found last week. A
       diff built on it would announce ${esc(N(dc.sites.length))} new sites on every single run, which is a
       fabricated event dressed as a measurement.`
    : `<code>first_seen_at</code> spans ${esc(utc(spread.min))} to ${esc(utc(spread.max))} in this file.`}
    The pins move when OpenStreetMap moves, which is on volunteer time, not on a cron.</p>
</section>`;
}

// ---------------------------------------------------------------------------
// The generated CSS. Two hundred-odd rules, all of them mechanical, all of them
// keyed on a radio id rather than on a position — the same rule _switcher.mjs
// follows, and for the same reason: adding or dropping a state can never leave
// a chip pointing at its neighbour's panel.
//
// ---------------------------------------------------------------------------
// THE CONTRACT WITH site/templates/_usmap.mjs, WHICH THIS FILE DOES NOT OWN
// ---------------------------------------------------------------------------
// The figure is rendered by _usmap.mjs. That file publishes a FILTER CONTRACT
// in its own header — "other templates code against this" — and everything
// below codes against exactly that and nothing else. Three hooks, all three of
// them in the served HTML before any script runs:
//
//   1. g.usm__pins--operating | --under-construction | --announced
//   2. g.usm__k-nodata | -none | -d0 | -d1 | -d2 | -d3 | -d4
//        The two group class families on every pin group. These are also the
//        selectors _usmap.mjs FILLS the pins with, so they cannot be removed
//        without rewriting its colour system.
//   3. .usm__p[data-st="VA"]
//        Per-marker, the two-letter state. Its contract says data-st is
//        OMITTED when the record has no state rather than given a filler
//        value — so `:not([data-st="VA"])` dims a stateless marker along with
//        the out-of-state ones, which is correct (unknown is not Virginia)
//        and is said out loud in the rail copy rather than left to be
//        discovered. In this build every one of the 1,877 sites carries a
//        state, so that set is empty today.
//
// What this file deliberately does NOT touch: `is-out`, `window.usMap`'s
// setFilter, and the `.usm__hud` readout. Those are that file's own JS filter
// path. Running two filter systems over one map is how a count and a picture
// end up disagreeing, so the CSS layer here only ever changes OPACITY, which
// composes with anything and removes nothing. The one place the two do meet is
// deliberate and additive: when script is available, focusing a jurisdiction
// also calls the published `focusState(ab)` so the map pans to it.
//
// The failure mode is chosen deliberately. Dimming is applied to the
// NON-MATCHING set, so a selector that stops matching leaves every pin at full
// strength — a filter that quietly stops working shows MORE of the map, never
// less. It can never blank the picture, and it can never hide a source.
// ---------------------------------------------------------------------------

const DIM = '.14';

function consoleCss(model) {
  const out = [];
  // Hook 1. Shape. Dim every GROUP that is not the chosen status.
  for (const f of SHAPE_FILTERS) {
    if (f.k === 'all') continue;
    const dash = f.k.replace(/_/g, '-');
    out.push(`#${UID}-s-${f.k}:checked~.dcx .usm__pins:not(.usm__pins--${dash}){opacity:${DIM}}`);
  }
  // Hook 2. Colour. The same rule over the drought ramp.
  out.push(`#${UID}-w-any:checked~.dcx .usm__pins.usm__k-none,`
    + `#${UID}-w-any:checked~.dcx .usm__pins.usm__k-nodata{opacity:${DIM}}`);
  out.push(`#${UID}-w-severe:checked~.dcx .usm__pins`
    + `:not(.usm__k-d2):not(.usm__k-d3):not(.usm__k-d4){opacity:${DIM}}`);
  out.push(`#${UID}-w-unread:checked~.dcx .usm__pins:not(.usm__k-nodata){opacity:${DIM}}`);

  // The active chip. Never colour alone: fill, weight and a 2px cap, exactly
  // the grammar _switcher.mjs uses for its open tab.
  const groups = [['s', SHAPE_FILTERS.map((f) => f.k)], ['w', WATER_FILTERS.map((f) => f.k)],
    ['j', ['ALL', ...model.states.map((s) => s.ab)]]];
  for (const [g, keys] of groups) {
    for (const k of keys) {
      const id = `${UID}-${g}-${k}`;
      out.push(`#${id}:checked~.dcx [for="${id}"],#${id}:checked~.dcbar [for="${id}"]`
        + `{color:var(--ink);background:var(--bg-sunken);border-color:var(--accent);font-weight:700}`);
      out.push(`#${id}:checked~.dcx [for="${id}"] .dcch__n,#${id}:checked~.dcbar [for="${id}"] .dcch__n`
        + `{color:var(--accent);border-color:var(--accent)}`);
      out.push(`#${id}:focus-visible~.dcx [for="${id}"],#${id}:focus-visible~.dcbar [for="${id}"]`
        + `{outline:2px solid var(--accent-2);outline-offset:2px}`);
    }
  }

  // The sixteen cross-filter figures. One pair is showing at any moment.
  for (const s of SHAPE_FILTERS) {
    for (const w of WATER_FILTERS) {
      out.push(`#${UID}-s-${s.k}:checked~#${UID}-w-${w.k}:checked~.dcx [data-sd="${s.k}|${w.k}"]{display:inline}`);
    }
  }
  // Emphasis inside the dossier and the table, keyed on the group alone.
  for (const f of SHAPE_FILTERS) {
    if (f.k === 'all') continue;
    out.push(`#${UID}-s-${f.k}:checked~.dcx .dcd__s li:not([data-k="${f.k}"]),`
      + `#${UID}-s-${f.k}:checked~.dcx .dcjt td[data-c]:not([data-c="${f.k}"]){opacity:.45}`);
    out.push(`#${UID}-s-${f.k}:checked~.dcx .dcd__s li[data-k="${f.k}"],`
      + `#${UID}-s-${f.k}:checked~.dcx .dcjt td[data-c="${f.k}"]{color:var(--accent);font-weight:700}`);
  }
  out.push(`#${UID}-w-severe:checked~.dcx .dcd__w li:not([data-w="D2"]):not([data-w="D3"]):not([data-w="D4"]){opacity:.45}`);
  out.push(`#${UID}-w-any:checked~.dcx .dcd__w li[data-w="none"],`
    + `#${UID}-w-any:checked~.dcx .dcd__w li[data-w="nodata"]{opacity:.45}`);
  out.push(`#${UID}-w-unread:checked~.dcx .dcd__w li:not([data-w="nodata"]){opacity:.45}`);

  // Jurisdiction: the dossier, the table row, the readout abbreviation, and
  // the forward declaration for the state outline.
  out.push(`#${UID}-j-ALL:checked~.dcx .dcd[data-j="ALL"]{display:block}`);
  out.push(`#${UID}-j-ALL:checked~.dcx [data-j0]{display:inline}`);
  for (const st of model.states) {
    const id = `${UID}-j-${st.ab}`;
    out.push(`#${id}:checked~.dcx .dcd[data-j="${st.ab}"]{display:block}`);
    out.push(`#${id}:checked~.dcx [data-jv="${st.ab}"]{display:inline}`);
    out.push(`#${id}:checked~.dcx tr[data-jrow="${st.ab}"]{background:var(--wash-alt);`
      + `box-shadow:inset 3px 0 0 var(--accent);opacity:1}`);
    // Hook 3, and the reason "press a state and the map answers" needs no
    // script: a marker whose data-st is not this one — INCLUDING a marker
    // with no data-st at all — drops to the dim level.
    out.push(`#${id}:checked~.dcx .usm__p:not([data-st="${st.ab}"]){opacity:${DIM}}`);
  }
  return out.join('\n');
}

/**
 * The whole control, assembled. The radios come first because the generated
 * CSS above is a chain of general-sibling combinators and that chain is the
 * state machine; `.dcx` is last because everything it styles lives inside it.
 */
function consoleBlock(dc, model, joint) {
  return `<div class="dccon" id="${UID}-console">
  ${radios(model)}
  <div class="dcbar">
    <div class="dcbar__hd">
      <p class="dcbar__k">3 controls · ${esc(N(SHAPE_FILTERS.length * WATER_FILTERS.length * (model.states.length + 1)))} states of this page · every one already in this HTML</p>
      <p class="dcbar__w">These controls <b>dim</b>. They never remove. ${esc(N(model.totals.pinned))} pins and
        ${esc(N(model.states.length))} table rows stay in the page at every setting, because a filter that
        deletes rows is a filter that can hide a source that went dark. Focusing a jurisdiction dims every
        pin that is not recorded in it, <b>including any pin with no state recorded at all</b> — unknown is
        not the same as elsewhere. ${esc(N(model.totals.sites - model.states.reduce((a, s) => a + s.total, 0)))}
        of ${esc(N(model.totals.sites))} sites are in that position in this build.</p>
    </div>
    ${shapeRail(model, joint)}
    ${waterRail(model, joint)}
    ${jurisdictionRail(model)}
  </div>
  <div class="dcx">
    ${readout(dc, model, joint)}
    <div class="bldmapwrap">
      ${mapFigure(model, { caption: mapCaption(model) })}
      ${mapLegend(model)}
      ${dossiers(dc, model, joint)}
      <div class="bldstate" id="by-state">
        <p class="bldsmall">This screen is narrower than 760 pixels, so the map is not drawn.
           ${esc(N(model.totals.pinned))} pins on a 343-pixel map is a smudge, and a smudge that cannot be
           read still looks authoritative. The controls above and the table below carry every channel the
           map encodes except position.</p>
        <h3 class="bldsec__h3 bldstate__h">${icon('rows')} Every jurisdiction, ranked
          <span class="bldcount num">${esc(N(model.states.length))}</span></h3>
        <p class="bldsec__l">Every state in the contiguous frame, ranked by mapped sites. The states at the
           bottom with a zero are the point of this table.</p>
        ${jurisdictionTable(dc, model, joint)}
      </div>
    </div>
  </div>
</div>`;
}

function mapCaption(model) {
  const t = model.totals;
  return `<b>${esc(N(t.pinned))}</b> pins, equal-area Albers projection so the northern states are not
    inflated and Texas is not shrunk. Shape is status, size is capacity where it is published, colour is the
    drought category of the county the pin is standing in.
    ${t.gaugesPlotted === t.gaugesTotal
    ? `All ${t.gaugesTotal} river gauges are marked.`
    : `${t.gaugesPlotted} of ${t.gaugesTotal} river gauges are marked; the rest carry no coordinates in this file and are listed in words below.`}
    Below 760 pixels the map is replaced by the ranked table, because ${esc(N(t.pinned))} pins on a 343-pixel
    map is a smudge, and a smudge that cannot be read still looks authoritative.`;
}

// ---------------------------------------------------------------------------
// The enhancement. Three things CSS cannot do, and not one thing more.
//
//   1. An elapsed age beside each UTC stamp. The stamp itself is in the HTML.
//   2. Sorting the jurisdiction table. The buttons are CREATED here, so with no
//      script there is no control that looks pressable and is not.
//   3. Scrolling a focused state's row into view.
//
// Nothing here renders content, nothing here fetches, nothing here writes to
// storage. Turn it off and the page loses an age, a sort and a scroll.
// ---------------------------------------------------------------------------

function enhanceJs() {
  return `<script>(function(){
var d=document,root=d.getElementById('${UID}-console');
if(!root||window.__dcMapUi)return;window.__dcMapUi=1;
var red=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches);
function pad(n){return n<10?'0'+n:''+n}
function fine(ms){var s=Math.max(0,Math.round(ms/1000));
 if(s<3600)return pad(Math.floor(s/60))+':'+pad(s%60);
 var h=Math.floor(s/3600);if(h<48)return h+':'+pad(Math.floor((s%3600)/60))+':'+pad(s%60);
 return Math.round(h/24)+'d'}
function coarse(ms){var s=Math.max(0,Math.round(ms/1000));if(s<90)return s+'s';
 var m=Math.round(s/60);if(m<90)return m+'m';var h=Math.floor(s/3600);
 if(h<48)return h+'h';return Math.round(h/24)+'d'}
var fmt=red?coarse:fine,every=red?3e4:1000;
var ages=[].slice.call(d.querySelectorAll('[data-dcm-age]'));
function tick(){var now=Date.now(),i,t;for(i=0;i<ages.length;i++){
 t=Date.parse(ages[i].getAttribute('datetime'));
 if(t===t){ages[i].textContent='+'+fmt(now-t);ages[i].hidden=false}}}
if(ages.length){tick();setInterval(tick,every)}
var tb=d.getElementById('${UID}-jt');
if(tb&&tb.tBodies[0]){
 var body=tb.tBodies[0],heads=[].slice.call(tb.querySelectorAll('th[data-sk]')),cur='total',dir=-1;
 var mark=function(){for(var i=0;i<heads.length;i++){var k=heads[i].getAttribute('data-sk');
  heads[i].setAttribute('aria-sort',k===cur?(dir<0?'descending':'ascending'):'none')}};
 heads.forEach(function(th){
  var k=th.getAttribute('data-sk'),txt=th.textContent.trim();
  var b=d.createElement('button');b.type='button';b.className='dcjt__sb';
  b.appendChild(d.createTextNode(txt));
  var ar=d.createElement('span');ar.className='dcjt__ar';ar.setAttribute('aria-hidden','true');
  b.appendChild(ar);
  while(th.firstChild)th.removeChild(th.firstChild);
  th.appendChild(b);
  b.addEventListener('click',function(){
   if(cur===k){dir=-dir}else{cur=k;dir=(k==='ab')?1:-1}
   var rows=[].slice.call(body.rows);
   rows.sort(function(x,y){
    var a=x.getAttribute('data-v-'+k),c=y.getAttribute('data-v-'+k),r;
    var na=parseFloat(a),nc=parseFloat(c);
    r=(na===na&&nc===nc)?(na-nc):String(a).localeCompare(String(c));
    if(r===0)return String(x.getAttribute('data-jrow')).localeCompare(String(y.getAttribute('data-jrow')));
    return r*dir});
   for(var i=0;i<rows.length;i++)body.appendChild(rows[i]);
   mark()})});
 mark();tb.setAttribute('data-sortable','1')}
var js=[].slice.call(root.querySelectorAll('input[name="${UID}-j"]'));
js.forEach(function(r){r.addEventListener('change',function(){
 var ab=r.getAttribute('data-ab');if(!ab)return;
 /* _usmap.mjs publishes focusState(ab)/reset() on window.usMap. Calling it is
    PURELY ADDITIVE: the CSS above has already dimmed the out-of-state pins
    with no script at all, and this pans the picture on top of that. Guarded
    on every step, because that API belongs to another file and this page must
    not break if it is absent, renamed or mid-deploy. */
 try{var m=window.usMap&&window.usMap.get&&window.usMap.get('usm');
  if(m){if(ab==='ALL'){if(m.reset)m.reset();}else if(m.focusState)m.focusState(ab);}}catch(e){}
 if(ab==='ALL')return;
 var row=d.querySelector('tr[data-jrow="'+ab+'"]');
 if(row&&row.scrollIntoView)row.scrollIntoView({block:'nearest',behavior:red?'auto':'smooth'})})});
})();</script>`;
}

// ---------------------------------------------------------------------------
// render
// ---------------------------------------------------------------------------

export function render(ctx) {
  if (!hasDatacenters(ctx)) return emptyPage(ctx);
  const dc = ctx.datacenters;
  const model = mapModel(dc);
  const joint = jointCounts(dc, model);
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

  const main = `<style>${usMapCss()}${mapCss()}${consoleCss(model)}</style>
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

<section class="bldsec" id="what-moves" aria-labelledby="bld-moves">
  ${movesPanel(dc, model)}
</section>

<section class="bldsec" id="the-map" aria-labelledby="bld-map">
  <h2 class="bldsec__h" id="bld-map">${icon('sec-map')} The map
    <span class="bldcount num">${esc(N(t.pinned))}</span></h2>
  <p class="bldsec__l">Three controls sit on top of this picture and none of them needs JavaScript: shape,
     colour, and one of ${esc(N(model.states.length))} jurisdictions. They dim the map rather than cutting
     it, the count beside every chip is the count you get if you press it, and the figure in the readout is
     already in this HTML for all
     ${esc(N(SHAPE_FILTERS.length * WATER_FILTERS.length))} combinations — so it cannot lag the control and
     cannot be wrong in a screenshot.</p>
  ${consoleBlock(dc, model, joint)}
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
    bodyEnd: enhanceJs(),
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
.bldmapwrap>.usm__legend{order:3;margin-top:0}
.dcds{order:2}
.bldstate{order:4;scroll-margin-top:calc(var(--rail-h) + 12px)}
.bldstate__h{margin-top:0}
.bldsmall{display:none}
@media (max-width: 759px){
  .bldstate{order:0}
  .dcds{order:-1}
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

/* -------------------------------------------------------------------------
   THE CONSOLE
   Mobile first. Every interactive thing is at least 32px tall and 32px wide,
   above the 24px floor, because a chip you cannot hit with a thumb is a chip
   that does not exist. Colour comes only from the shared tokens, so both
   themes are painted from one place and neither has a private hex.
   ------------------------------------------------------------------------- */

/* The radios ARE the state machine. Off-screen rather than display:none, which
   would take them out of the tab order and leave the labels unreachable from a
   keyboard. Each group is one tab stop and the arrow keys move inside it —
   native radio behaviour, nothing re-implemented. */
.dcin{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;
  clip:rect(0 0 0 0);white-space:nowrap;border:0}

.dccon{position:relative}
.dcbar{display:grid;gap:var(--s-3);padding:var(--s-3);margin:0 0 var(--s-4);
  background:var(--bg-raised);border:1px solid var(--rule);border-radius:var(--radius)}
.dcbar__hd{display:grid;gap:4px}
.dcbar__k{margin:0;font:500 var(--t-2xs)/1.3 var(--mono);letter-spacing:.09em;text-transform:uppercase;
  color:var(--ink-faint)}
.dcbar__w{margin:0;font:400 var(--t-xs)/1.55 var(--sans);color:var(--ink-faint);max-width:70ch}
.dcbar__w b{color:var(--ink-dim)}

.dcgrp{display:grid;gap:5px;min-width:0}
.dcgrp__h{margin:0;display:flex;flex-wrap:wrap;align-items:baseline;gap:0 7px}
.dcgrp__t{font:600 var(--t-2xs)/1.3 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--ink)}
.dcgrp__g{font:400 var(--t-2xs)/1.4 var(--sans);color:var(--ink-faint)}
.dcgrp__r{display:flex;flex-wrap:wrap;gap:5px;min-width:0}
/* Forty-nine jurisdictions do not wrap on to a phone in any useful way, so that
   one group scrolls sideways with momentum and keeps its own row. The radios
   behind it still arrow-key in document order, so the keyboard never has to
   scroll anything. */
.dcgrp__r--scroll{flex-wrap:nowrap;overflow-x:auto;overscroll-behavior-x:contain;
  -webkit-overflow-scrolling:touch;scrollbar-width:thin;padding-bottom:3px}

.dcch{display:inline-flex;align-items:center;gap:6px;flex:0 0 auto;min-height:32px;padding:5px 10px;
  cursor:pointer;-webkit-user-select:none;user-select:none;white-space:nowrap;
  border:1px solid var(--rule);border-radius:7px;background:var(--bg);color:var(--ink-dim);
  font:500 var(--t-2xs)/1 var(--mono);letter-spacing:.08em;text-transform:uppercase}
.dcch:hover{color:var(--ink);border-color:var(--ink-faint);background:var(--bg-sunken)}
.dcch--j{padding:5px 8px;min-width:32px;justify-content:center}
.dcch__l{white-space:nowrap}
.dcch__n{font-weight:700;letter-spacing:.01em;font-variant-numeric:tabular-nums;color:var(--accent-2);
  border:1px solid var(--rule);border-radius:2px;padding:0 4px;min-width:3ch;text-align:center;
  font-size:var(--t-2xs);line-height:1.5}
/* Zero is not an event. Same rule the switcher's tab figures follow. */
.dcch__n[data-zero="1"]{color:var(--ink-faint);font-weight:500;border-style:dashed}
.dcunk{color:var(--stale);font-style:normal;letter-spacing:.04em}

/* THE READOUT. Five cells, four of which move with the control. The first is
   wide because it is the one people read, and it is the only one that is a
   count OF the current filter rather than a fact beside it. */
.dcro{list-style:none;margin:0 0 var(--s-4);padding:0;display:grid;grid-template-columns:1fr 1fr;gap:1px;
  background:var(--rule-soft);border:1px solid var(--rule-soft);border-radius:var(--radius);overflow:hidden}
.dcro__i{background:var(--bg);padding:var(--s-3);display:flex;flex-direction:column;gap:2px;min-width:0}
.dcro__i--wide{grid-column:1 / -1;background:var(--bg-raised)}
.dcro__k{font:500 var(--t-2xs)/1.3 var(--mono);letter-spacing:.09em;text-transform:uppercase;color:var(--ink-faint)}
.dcro__v{display:block;min-height:1.2em}
.dcro__n{font:600 var(--t-xl)/1.05 var(--mono);font-variant-numeric:tabular-nums;color:var(--ink)}
.dcro__i--wide .dcro__n{color:var(--accent)}
.dcro__n--ab{letter-spacing:.04em}
.dcro__s{font:400 var(--t-2xs)/1.45 var(--sans);color:var(--ink-faint)}

/* Only one member of a switched set is displayed; the rest are display:none
   until their pair of radios is checked. With no stylesheet at all every
   member prints, each carrying a title that names its combination, which is a
   list rather than a contradiction. */
.dcx [data-sd],.dcx [data-jv],.dcx [data-j0]{display:none}
.dcx .dcd{display:none}

/* THE DOSSIER. One per jurisdiction, all in the HTML, one on screen.
   Its column order lives with the other .bldmapwrap order rules above, not
   here — a second .dcds order rule at this point in the sheet would win on
   source order and quietly undo the phone-width reordering. */
.dcd{border:1px solid var(--rule);border-left:3px solid var(--accent);border-radius:var(--radius);
  padding:var(--s-3) var(--s-4);background:var(--bg-raised)}
.dcd__h{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin:0 0 var(--s-2);
  padding-bottom:var(--s-2);border-bottom:1px solid var(--rule-soft)}
.dcd__ab{font:700 var(--t-lg)/1 var(--mono);letter-spacing:.06em;color:var(--accent)}
.dcd__nm{font:400 var(--t-sm)/1.2 var(--sans);color:var(--ink-dim)}
.dcd__t{margin-left:auto;font:600 var(--t-md)/1 var(--mono);font-variant-numeric:tabular-nums;color:var(--ink)}
.dcd__t small{font-weight:400;font-size:var(--t-2xs);color:var(--ink-faint);letter-spacing:.08em;text-transform:uppercase}
.dcd__m{margin:0 0 var(--s-3);display:flex;align-items:baseline;gap:7px;flex-wrap:wrap;
  font:400 var(--t-2xs)/1.4 var(--mono)}
.dcd__mk{letter-spacing:.09em;text-transform:uppercase;color:var(--ink-faint)}
.dcd__mn{font:700 var(--t-lg)/1 var(--mono);font-variant-numeric:tabular-nums;color:var(--accent-2)}
.dcd__ms{color:var(--ink-faint)}
.dcd__z{margin:0;font:400 var(--t-xs)/1.6 var(--sans);color:var(--ink-faint);max-width:60ch}
.dcd__s,.dcd__w,.dcd__gs{list-style:none;margin:0 0 var(--s-3);padding:0;display:grid;gap:4px}
.dcd__s li,.dcd__w li{display:flex;align-items:center;gap:7px;font:400 var(--t-xs)/1.4 var(--mono);
  color:var(--ink-dim)}
.dcd__s b,.dcd__w b{font-weight:500;color:var(--ink-dim)}
.dcd__sg{color:var(--ink-faint);display:inline-flex}
.dcd__sn{margin-left:auto;font-variant-numeric:tabular-nums;color:var(--ink);font-weight:600}
.dcd__ok{font:400 var(--t-2xs)/1.4 var(--sans);color:var(--ink-faint)}
.dcd__g{display:flex;align-items:center;gap:7px;flex-wrap:wrap;font:400 var(--t-2xs)/1.5 var(--mono);
  padding:5px 0;border-top:1px dotted var(--rule-soft)}
.dcd__g b{color:var(--ink);letter-spacing:.05em}
.dcd__gn{color:var(--ink-faint);font-variant-numeric:tabular-nums}
.dcd__gv{margin-left:auto;font-weight:600;color:var(--ok);font-variant-numeric:tabular-nums}
.dcd__gw{color:var(--ink-faint);font-family:var(--sans);flex:1 1 14rem;min-width:0}
.dcd__c{margin:0;font:400 var(--t-2xs)/1.6 var(--sans);color:var(--ink-faint);max-width:64ch}
.dcd__p{margin:0;font:400 var(--t-xs)/1.6 var(--sans);color:var(--ink-dim);max-width:68ch}

/* WHAT MOVES BETWEEN COLLECTS. */
.dcmv{border:1px solid var(--rule);border-radius:var(--radius);padding:var(--s-3) var(--s-4);
  margin:0 0 var(--sec);background:var(--bg-raised)}
.dcmv__hd{margin:0 0 var(--s-3)}
.dcmv__h{font:600 var(--t-md)/1.3 var(--sans);margin:0 0 4px;display:flex;align-items:center;gap:8px}
.dcmv__sub{margin:0;font:400 var(--t-xs)/1.6 var(--sans);color:var(--ink-faint);max-width:68ch}
.dcmv__l{list-style:none;margin:0;padding:0;display:grid;gap:1px;background:var(--rule-soft);
  border:1px solid var(--rule-soft);border-radius:var(--radius);overflow:hidden}
.dcmv__i{background:var(--bg);padding:var(--s-2) var(--s-3);display:grid;gap:1px;min-width:0}
.dcmv__k{font:500 var(--t-2xs)/1.3 var(--mono);letter-spacing:.09em;text-transform:uppercase;color:var(--ink-faint)}
.dcmv__v{display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;
  font:600 var(--t-sm)/1.3 var(--mono);font-variant-numeric:tabular-nums;color:var(--ink)}
.dcmv__u{font-weight:400;font-size:var(--t-2xs);color:var(--ink-faint)}
/* The one always-moving atom on this page, and it is a fact about our own rig
   rather than about the world. It is hidden until the script fills it, so a
   pre-script screenshot shows the exact UTC stamp and no empty bracket. */
.dcmv__a{font-weight:400;font-size:var(--t-2xs);color:var(--accent-2);letter-spacing:.04em}
.dcmv__s{display:flex;align-items:center;gap:6px;flex-wrap:wrap;
  font:400 var(--t-2xs)/1.5 var(--sans);color:var(--ink-faint)}
.dcmv__n{margin:var(--s-3) 0 0;font:400 var(--t-xs)/1.65 var(--sans);color:var(--ink-faint);max-width:70ch}
.dcmv__n b{color:var(--ink-dim)}
.dcmv__n code{font-family:var(--mono);font-size:.94em;color:var(--ink-dim)}

/* THE JURISDICTION TABLE. */
.dcjt__st{min-width:11rem}
.dcjt__lb{display:flex;align-items:baseline;gap:6px;min-height:24px;cursor:pointer;
  -webkit-user-select:none;user-select:none}
.dcjt__lb b{font-weight:600;color:var(--ink)}
.dcjt__lb span{font-size:var(--t-2xs);color:var(--ink-faint);white-space:normal}
.dcjt__lb:hover b{color:var(--accent)}
.dcjt__f{text-align:right}
.dcjt__fn{font-weight:700;color:var(--accent-2);font-variant-numeric:tabular-nums}
.dcjt tbody tr{transition:background-color 120ms ease}
/* The sort button does not exist in the served HTML; the script builds it. A
   control that looks pressable and is not is worse than no control. */
.dcjt__sb{font:inherit;color:inherit;letter-spacing:inherit;text-transform:inherit;background:none;
  border:0;padding:0;margin:0;cursor:pointer;display:inline-flex;align-items:center;gap:4px;min-height:24px}
.dcjt__sb:hover{color:var(--ink)}
.dcjt__ar{width:7px;height:7px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;
  transform:rotate(45deg) translate(-1px,-1px);opacity:0}
.dcjt th[aria-sort="descending"] .dcjt__ar{opacity:1}
.dcjt th[aria-sort="ascending"] .dcjt__ar{opacity:1;transform:rotate(225deg) translate(-1px,-1px)}
.dcjt th[aria-sort="descending"] .dcjt__sb,.dcjt th[aria-sort="ascending"] .dcjt__sb{color:var(--accent)}

/* -------------------------------------------------------------------------
   ONE DEFENSIVE LINE FOR A DEFECT THIS FILE MAY NOT FIX AT SOURCE.

   _usmap.mjs renders its zoom controls and its zoom readout with the hidden
   attribute and says why in its own comment: "with no script they would be
   three lies; the script unhides exactly the ones it has wired up". But the
   rules that position them, .usm__ctl{display:flex} and
   .usm__hud{display:flex}, out-specify the UA's [hidden]{display:none} —
   so with JavaScript off a reader gets three dead buttons (+ / − / Reset) and
   a readout asserting "1.0x" on a picture that cannot zoom. Measured on the
   served HTML with every script element stripped: 56x110 and 198x28 of
   painted lies.

   The real fix is one [hidden] guard in _usmap.mjs, which another task owns.
   Until it lands, this page refuses to serve the dead controls. The selector
   goes away by itself the moment the script runs, because that script toggles
   the IDL property and the attribute goes with it.
   ------------------------------------------------------------------------- */
.usm [hidden]{display:none}

/* A counter on a heading. docs/ENGAGEMENT.md ranks this as free density and
   docs/VOICE.md §4 already demands the denominator, so every section heading
   that counts something says how many. */
.bldcount{font:600 var(--t-xs)/1 var(--mono);font-variant-numeric:tabular-nums;color:var(--accent-2);
  border:1px solid var(--rule);border-radius:3px;padding:2px 6px;margin-left:2px;letter-spacing:.02em}

/* Motion. Everything above is a state change on content that is already
   painted, so reduce turns the easing off and the state change still happens,
   instantly. docs/MOTION.md §3. */
/* Fifteen pin GROUPS ease; the 1,877 individual markers do not. A transition
   on every marker turns a jurisdiction press into 1,877 animating nodes, and
   the state change it decorates is already instant. */
@media (prefers-reduced-motion: no-preference){
  .dcx .usm__pins,.dcd__s li,.dcjt td[data-c],.dcd__w li{transition:opacity 160ms ease}
  .dcch{transition:color 120ms ease,background-color 120ms ease,border-color 120ms ease}
}
@media (prefers-reduced-motion: reduce){
  .dcx .usm__pins,.dcd__s li,.dcjt td[data-c],.dcd__w li,.dcch,.dcjt tbody tr{transition:none}
}

@media (min-width: 620px){
  .dcro{grid-template-columns:repeat(4,1fr)}
  .dcro__i--wide{grid-column:span 4}
}
@media (min-width: 900px){
  .dcro{grid-template-columns:repeat(5,1fr)}
  .dcro__i--wide{grid-column:span 5}
  .dcbar{grid-template-columns:auto auto 1fr;align-items:start;gap:var(--s-3) var(--s-4)}
  .dcbar__hd{grid-column:1 / -1}
  .dcgrp--j{min-width:0}
}
`;
}
