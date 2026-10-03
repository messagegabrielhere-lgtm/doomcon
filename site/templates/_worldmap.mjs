// A dependency-free inline-SVG map of the whole planet, drawn server-side.
//
// The leading underscore marks it as a helper rather than a page: it exports no
// render(ctx). site/templates/worldPage.mjs is its only caller.
//
// ---------------------------------------------------------------------------
// WHAT THIS IS, AND WHAT IT BORROWS
// ---------------------------------------------------------------------------
// The sibling of _usmap.mjs. That file draws the contiguous United States and
// joins every pin to a county, a drought category, a grid and a river gauge.
// None of those joins exist outside the US, so this file draws less: an
// outline per country, one fixed-size marker per mapped site, and nothing
// else. What it does NOT do is write a second interaction layer. _usmap.mjs
// exports MAP_JS — zoom, pan, pinch, the nearest-marker hit test, the roving
// tab stop, the detail panel, the filter API — and MAP_JS boots any <figure
// data-usm> whose markup follows its contract. So this file emits that
// contract where it matters (see worldFigure) and gets the whole layer,
// already exercised on 1,877 pins, unchanged on 5,274. The one flag it adds
// is data-usm-lite, which MAP_JS reads to keep the popup to the status alone:
// a panel that said "drought no reading · grid not identified · capacity
// unpublished" under every pin on Earth would be three true sentences that
// read as three failures.
//
// ---------------------------------------------------------------------------
// WHY EQUAL EARTH, AND WHY THE PROJECTION IS WRITTEN OUT LONGHAND
// ---------------------------------------------------------------------------
// _usmap.mjs argues for an equal-area projection at national scale: Mercator
// inflates area by 1/cos(lat), and a reader comparing two clusters by eye has
// to be comparing two true areas. At planetary scale the argument is the same
// and the stakes are larger. On Mercator, Greenland draws the size of Africa,
// and Europe's pins spread over a continent drawn at about twice its true
// share of the frame next to Africa's on a continent drawn at about half.
// That is exactly the misreading this page exists to prevent, delivered by
// the projection before a single pin is placed.
//
// Equal Earth (Šavrič, Patterson and Jenny, 2018) is equal-area, uninterrupted,
// keeps the continents at a shape a reader recognises, and — unlike Mollweide,
// which needs a Newton iteration per point — has a closed-form forward
// formula: a ninth-degree polynomial in one parametric latitude. Five lines,
// no iteration, no library, deterministic to the bit. It is written out here
// rather than reached for so that the arithmetic is on the page beside the
// numbers it positions.
//
//   k   = √3 / 2
//   θ   = asin(k · sin φ)
//   x   = 2√3 · λ · cos θ  /  ( 3 · (A1 + 3·A2·θ² + θ⁶·(7·A3 + 9·A4·θ²)) )
//   y   = θ · (A1 + A2·θ² + θ⁶·(A3 + A4·θ²))
//
//   A1 = 1.340264   A2 = −0.081106   A3 = 0.000893   A4 = 0.003796
//
// The denominator of x is 3 · dy/dθ, which is what makes the projection
// equal-area: the width of a strip of latitude shrinks in exact inverse
// proportion to how fast y grows. y increases NORTHWARD in the projection and
// DOWNWARD in SVG, so the fitted transform flips it, as _usmap.mjs does.
//
// ---------------------------------------------------------------------------
// WHY THE FRAME STOPS AT 57°S AND 84°N
// ---------------------------------------------------------------------------
// The frame is fitted to longitude −180..180 and latitude −57..84, not to the
// whole sphere. Antarctica carries no mapped datacentre and would take the
// bottom fifth of the picture; the sea north of Greenland's tip (83.65°N)
// would take a strip off the top. 57°S clears Cape Horn (55.98°S) and the
// Falklands; 84°N clears every vertex Natural Earth draws. Antarctica is not
// clipped — it is DROPPED by geometry, as the one outline every vertex of
// which lies south of the frame — and the page names it in words rather than
// leaving a reader to wonder why the map has no bottom. A pin outside the
// frame is listed rather than dragged to the edge, the same rule _usmap.mjs
// applies to Alaska and Hawaii.

import { esc } from './_html.mjs';
import { MAP_JS, STATUS_ORDER, STATUS_MARKS, pinSwatch, usMapCss } from './_usmap.mjs';

// ---------------------------------------------------------------------------
// Equal Earth, longhand. See the header for the formula and its provenance.
// ---------------------------------------------------------------------------

const RAD = Math.PI / 180;
const A1 = 1.340264;
const A2 = -0.081106;
const A3 = 0.000893;
const A4 = 0.003796;
const K = Math.sqrt(3) / 2;

/** lon/lat in WGS84 degrees -> Equal Earth on the unit sphere. Pure arithmetic. */
function equalEarth(lon, lat) {
  const lam = lon * RAD;
  const theta = Math.asin(K * Math.sin(lat * RAD));
  const t2 = theta * theta;
  const t6 = t2 * t2 * t2;
  const x = (2 * Math.sqrt(3) * lam * Math.cos(theta))
    / (3 * (A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2)));
  const y = theta * (A1 + A2 * t2 + t6 * (A3 + A4 * t2));
  return [x, y];
}

const WIDTH = 1000;   // viewBox units; the SVG itself is width:100%
const PAD = 14;
const FRAME_LON = Object.freeze([-180, 180]);
const FRAME_LAT = Object.freeze([-57, 84]);

/**
 * Fit the frame to the viewBox once. Deterministic: the extent is measured by
 * walking the four edges of the lon/lat frame at one-degree steps, which is
 * exact for y (monotonic in latitude) and catches the widest parallel — the
 * equator — for x.
 */
function frame() {
  let minX = Infinity; let maxX = -Infinity; let minY = Infinity; let maxY = -Infinity;
  const take = (lon, lat) => {
    const p = equalEarth(lon, lat);
    if (p[0] < minX) minX = p[0];
    if (p[0] > maxX) maxX = p[0];
    if (p[1] < minY) minY = p[1];
    if (p[1] > maxY) maxY = p[1];
  };
  for (let lat = FRAME_LAT[0]; lat <= FRAME_LAT[1]; lat += 1) { take(FRAME_LON[0], lat); take(FRAME_LON[1], lat); }
  for (let lon = FRAME_LON[0]; lon <= FRAME_LON[1]; lon += 1) { take(lon, FRAME_LAT[0]); take(lon, FRAME_LAT[1]); }
  const scale = (WIDTH - PAD * 2) / (maxX - minX);
  const height = Math.round(((maxY - minY) * scale + PAD * 2) * 10) / 10;
  // y grows NORTHWARD in Equal Earth and DOWNWARD in SVG, so this flips it.
  const place = (p) => [PAD + (p[0] - minX) * scale, height - PAD - (p[1] - minY) * scale];
  const project = (lon, lat) => place(equalEarth(lon, lat));
  const fit = { scale, minX, minY, pad: PAD, height };
  return { project, width: WIDTH, height, fit, lon: FRAME_LON, lat: FRAME_LAT };
}

const FRAME = frame();

const n1 = (v) => (Math.round(v * 10) / 10).toString();

/** Thousands separators by hand: toLocaleString() depends on the host's ICU
 *  build, and this page has to be byte-identical from any machine. */
function N(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Every pin is the same size. There is no capacity join outside the United
 *  States, so there is nothing honest to scale by. */
const FIXED_R = 2.4;

// ---------------------------------------------------------------------------
// The model. One pass over data/world.json and data/world-outline.json, shared
// by the SVG, the legend, the table and the page, so the picture and the
// prose cannot disagree. Pure; no clock, no randomness.
// ---------------------------------------------------------------------------

/**
 * @param {object} world    parsed data/world.json
 * @param {object} outline  parsed data/world-outline.json
 * @returns a render model.
 */
export function worldModel(world, outline) {
  const sites = Array.isArray(world.sites) ? world.sites : [];
  const totals = world.totals || {};
  const southEdge = FRAME.lat[0];

  // THE LAND. One entry per outline polygon set. An outline every vertex of
  // which lies south of the frame is not drawn and is named instead; on the
  // Natural Earth 1:110m file that is Antarctica and nothing else, but the
  // rule is geometric rather than a hard-coded 'AQ' so it stays true if the
  // file changes. Northern Cyprus and Somaliland carry no ISO code in Natural
  // Earth; they are drawn, with their name in the <title>, and no data-st can
  // ever point at them, which is the honest state of a territory the ISO list
  // does not recognise.
  const lands = [];
  const notDrawn = [];
  for (const c of (Array.isArray(outline.countries) ? outline.countries : [])) {
    const rings = (Array.isArray(c.rings) ? c.rings : []).filter((r) => Array.isArray(r) && r.length >= 3);
    if (!rings.length) continue;
    if (rings.every((r) => r.every((p) => p[1] < southEdge))) {
      notDrawn.push({ iso2: c.iso2 || null, name: c.name });
      continue;
    }
    lands.push({
      iso2: c.iso2 || null,
      name: c.name,
      polys: rings.map((r) => r.map((p) => FRAME.project(p[0], p[1]))),
    });
  }
  const outlined = new Set(lands.map((l) => l.iso2).filter(Boolean));

  // THE PINS. A site with a coordinate is drawn where the coordinate is,
  // whether or not a country polygon claimed it: the unresolved 77 are real
  // map objects at real places and hiding them would be the imputation in
  // reverse. They are drawn with no data-st, counted, and named in the legend.
  const pins = [];
  const offFrame = [];
  const noCoord = [];
  let unresolvedDrawn = 0;
  for (const s of sites) {
    if (!Number.isFinite(s.lat) || !Number.isFinite(s.lon)) { noCoord.push(s); continue; }
    const [x, y] = FRAME.project(s.lon, s.lat);
    if (x < 0 || x > FRAME.width || y < 0 || y > FRAME.height) { offFrame.push(s); continue; }
    if (!s.country) unresolvedDrawn += 1;
    pins.push({
      x, y,
      status: STATUS_ORDER.includes(s.status) ? s.status : 'operating',
      // Identity, carried onto the marker so a reader can ask what a dot IS.
      // A missing field stays missing all the way to the markup: it renders
      // as the words for its absence, never as a blank and never as a zero.
      name: s.name || null,
      operator: s.operator || null,
      city: s.city || null,
      country: s.country || null,
      countryName: s.country_name || null,
    });
  }
  const drawnByStatus = {};
  for (const k of STATUS_ORDER) drawnByStatus[k] = pins.filter((p) => p.status === k).length;

  // THE COUNTRIES. The collector's own ranked rows — total descending, name
  // ascending — kept in the collector's order rather than re-sorted here, so
  // the page and the JSON agree on rank and no locale-dependent comparison
  // runs at build time. Each row learns whether its outline is drawn, so the
  // table can say "pins drawn, no land under them" for Singapore rather than
  // let a reader conclude the pins are at sea.
  const countries = (Array.isArray(world.countries) ? world.countries : []).map((c) => ({
    iso2: c.iso2,
    name: c.name,
    continent: c.continent || null,
    subregion: c.subregion || null,
    total: Number(c.total) || 0,
    operating: Number(c.operating) || 0,
    under_construction: Number(c.under_construction) || 0,
    announced: Number(c.announced) || 0,
    boundary_risk: Number(c.boundary_risk) || 0,
    outlined: outlined.has(c.iso2),
  }));
  const unoutlined = countries.filter((c) => !c.outlined);

  // The row the collector's `countries` array leaves out: sites that fell in
  // no polygon and carried no usable addr:country tag. Counted off the sites
  // so the table's columns sum to totals.sites.
  const unresolved = { name: 'Not inside any country polygon', total: 0 };
  for (const k of STATUS_ORDER) unresolved[k] = 0;
  for (const s of sites) {
    if (s.country) continue;
    unresolved.total += 1;
    unresolved[STATUS_ORDER.includes(s.status) ? s.status : 'operating'] += 1;
  }

  const byContinent = Object.entries(totals.by_continent || {})
    .map(([name, count]) => ({ name, count: Number(count) || 0 }))
    .sort((a, b) => b.count - a.count || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  return {
    frame: FRAME,
    lands,
    notDrawn,
    pins,
    offFrame,
    noCoord,
    countries,
    unoutlined,
    unresolved,
    byContinent,
    totals: {
      sites: sites.length,
      pinned: pins.length,
      unresolvedDrawn,
      byStatus: drawnByStatus,
      countriesWithSites: Number(totals.countries_with_sites) || countries.length,
      countriesWithNone: Number.isFinite(Number(totals.countries_with_none)) ? Number(totals.countries_with_none) : null,
      countriesInRoster: Number.isFinite(Number(totals.countries_in_roster)) ? Number(totals.countries_in_roster) : null,
      unoutlinedSites: unoutlined.reduce((a, c) => a + c.total, 0),
    },
    as_of_date: world.as_of_date || null,
    qualifier: (world.copy && world.copy.headline_qualifier) || 'as mapped in OpenStreetMap',
  };
}

// ---------------------------------------------------------------------------
// The SVG.
// ---------------------------------------------------------------------------

function landLayer(model) {
  return model.lands.map(({ name, polys }) => {
    const d = polys.map((poly) => poly.map((p, i) => (
      `${i === 0 ? 'M' : 'L'}${n1(p[0])} ${n1(p[1])}`
    )).join('') + 'Z').join('');
    return `<path class="usm__land" d="${d}"><title>${esc(name)}</title></path>`;
  }).join('');
}

/** MARKER CONTRACT, restated from _usmap.mjs: a circle publishes its centre
 *  as cx/cy and MAP_JS reads it from there; a triangle or diamond buries its
 *  centre in a path and needs data-p. data-st is the ISO 3166-1 alpha-2 code
 *  and is OMITTED when no polygon claimed the site, never given a filler. */
function pinAttrs(p, needsPoint) {
  let a = needsPoint ? ` data-p="${Math.round(p.x)} ${Math.round(p.y)}"` : '';
  if (p.country) a += ` data-st="${esc(p.country)}"`;
  return a;
}

/** The tooltip, and the only prose the detail panel has. Unknowns are words. */
function pinTitle(p) {
  const place = p.city
    ? `${p.city}, ${p.countryName || 'no country resolved'}`
    : (p.countryName || 'no country resolved');
  const bits = [
    p.name || 'unnamed in OpenStreetMap',
    p.operator || 'operator not recorded',
    STATUS_MARKS[p.status].word,
    place,
  ];
  return `<title>${esc(bits.join(' · '))}</title>`;
}

function pinLayer(model) {
  const out = [];
  for (const status of STATUS_ORDER) {
    const group = model.pins.filter((p) => p.status === status);
    if (!group.length) continue;
    const body = group.map((p) => {
      if (status === 'operating') {
        return `<circle class="usm__p" cx="${n1(p.x)}" cy="${n1(p.y)}" r="${n1(FIXED_R)}"${pinAttrs(p, false)}>${pinTitle(p)}</circle>`;
      }
      const tail = `${pinAttrs(p, true)}>${pinTitle(p)}`;
      if (status === 'under_construction') {
        const a = FIXED_R * 1.35; const b = FIXED_R * 1.2; const c = FIXED_R * 0.82;
        return `<path class="usm__p" d="M${n1(p.x)} ${n1(p.y - a)}L${n1(p.x + b)} ${n1(p.y + c)}L${n1(p.x - b)} ${n1(p.y + c)}Z"${tail}</path>`;
      }
      const r = FIXED_R * 1.45;
      return `<path class="usm__p" d="M${n1(p.x)} ${n1(p.y - r)}L${n1(p.x + r)} ${n1(p.y)}L${n1(p.x)} ${n1(p.y + r)}L${n1(p.x - r)} ${n1(p.y)}Z"${tail}</path>`;
    }).join('');
    // One colour class for every group. MAP_JS reads it as the "k" field the
    // way it reads a drought class on /map; here it only ever says "world".
    out.push(`<g class="usm__pins usm__pins--${esc(status.replace(/_/g, '-'))} usm__k-world">${body}</g>`);
  }
  return out.join('');
}

/**
 * The map itself. Same figure contract as _usmap.mjs's mapFigure — the same
 * classes, the same hooks, the same hidden chrome — so MAP_JS boots it with
 * no changes. `desc` is counted off the pins actually drawn, so it can only
 * ever describe the picture beside it.
 *
 * @param {object} model  from worldModel()
 * @param {object} opts
 * @param {string} [opts.caption]  figcaption HTML
 * @param {string} [opts.id]       figure id, default 'wm'
 * @param {string} [opts.noun]     plural noun for the markers, default 'datacentres'
 */
export function worldFigure(model, opts = {}) {
  const uid = opts.id || 'wm';
  const noun = opts.noun || 'datacentres';
  const t = model.totals;
  const by = t.byStatus;
  const title = `Datacentres mapped worldwide, ${N(t.pinned)} pins`;
  const notDrawn = model.notDrawn.map((c) => c.name);
  const desc =
    `An equal-area map of the world carrying ${N(t.pinned)} datacentre pins. ` +
    `Shape carries status: ${N(by.operating)} operating circles, ` +
    `${N(by.under_construction)} under-construction triangles and ` +
    `${N(by.announced)} announced open diamonds. Every pin is the same size and the same colour, ` +
    `because no other field is joined to a site outside the United States. ` +
    `${N(t.unresolvedDrawn)} of the pins fell inside no country outline and are drawn without a country. ` +
    (notDrawn.length ? `${notDrawn.join(', ')} ${notDrawn.length === 1 ? 'is' : 'are'} not drawn: no mapped site, and the frame stops at ${Math.abs(model.frame.lat[0])} degrees south. ` : '') +
    `The same figures are in the table below this map.`;
  // Everything below the <desc> that moves lives inside ONE group, usm__vp.
  // With the transform absent — which is how it ships — the picture is the
  // server-rendered picture. The controls, the readout and the detail panel
  // ship `hidden`; MAP_JS unhides exactly the ones it has wired up.
  return `<figure class="usm" id="${esc(uid)}" data-usm data-usm-lite data-usm-total="${t.pinned}" data-usm-noun="${esc(noun)}">
  <div class="usm__stage">
  <svg class="usm__svg" viewBox="0 0 ${model.frame.width} ${model.frame.height}" role="img"
       aria-labelledby="${esc(uid)}-t ${esc(uid)}-d" preserveAspectRatio="xMidYMid meet">
    <title id="${esc(uid)}-t">${esc(title)}</title>
    <desc id="${esc(uid)}-d">${esc(desc)}</desc>
    <g class="usm__vp">
    <g class="usm__lands">${landLayer(model)}</g>
    ${pinLayer(model)}
    <g class="usm__hl" aria-hidden="true"><circle class="usm__sel" cx="0" cy="0" r="0"/></g>
    </g>
  </svg>
  <div class="usm__ctl" role="group" aria-label="Map zoom" hidden>
    <button class="usm__cb" type="button" data-usm-zin aria-label="Zoom in">+</button>
    <button class="usm__cb" type="button" data-usm-zout aria-label="Zoom out">−</button>
    <button class="usm__cb usm__cb--r" type="button" data-usm-reset aria-label="Reset the map to the whole world">Reset</button>
  </div>
  <p class="usm__hud" hidden><b class="num" data-usm-shown>${N(t.pinned)}</b>
    <span data-usm-shownlab>of ${N(t.pinned)} ${esc(noun)}</span>
    <span class="usm__hud__z num" data-usm-zoom>1.0×</span></p>
  <div class="usm__pop" data-usm-pop hidden aria-hidden="true">
    <button class="usm__popx" type="button" data-usm-close tabindex="-1" aria-hidden="true">Close</button>
    <p class="usm__poph" data-usm-poph></p>
    <p class="usm__popb" data-usm-popb></p>
    <p class="usm__popm" data-usm-popm></p>
    <p class="usm__pops" data-usm-pops hidden>
      <button class="usm__popn" type="button" data-usm-prev tabindex="-1" aria-hidden="true">‹</button>
      <span data-usm-stack></span>
      <button class="usm__popn" type="button" data-usm-next tabindex="-1" aria-hidden="true">›</button>
    </p>
  </div>
  </div>
  <p class="usm__keys" hidden>Drag or swipe to pan, wheel or pinch to zoom, hover or tap a marker for
    its record. <b>Keyboard:</b> tab to the map, then arrows pan, <kbd>+</kbd> and <kbd>−</kbd> zoom,
    <kbd>0</kbd> resets; tab once more to step marker to marker with the arrows,
    <kbd>Enter</kbd> for the record and <kbd>Esc</kbd> to leave. The table below carries every
    row whether or not any of this works.</p>
  ${opts.caption ? `<figcaption class="usm__cap">${opts.caption}</figcaption>` : ''}
</figure>
<script>${MAP_JS}</script>`;
}

// ---------------------------------------------------------------------------
// The legend. HTML rather than SVG text, for the same three reasons as
// _usmap.mjs: it reflows at 375px, it is selectable, and a screen reader meets
// it as a list. Three groups: what shape means, what colour does not mean,
// and what is not in the picture at all.
// ---------------------------------------------------------------------------

export function worldLegend(model) {
  const t = model.totals;
  const shapes = STATUS_ORDER.map((k) => {
    const m = STATUS_MARKS[k];
    return `<li data-dc="${esc(k)}">${pinSwatch(k)}
      <b>${esc(m.word)}</b> <span class="usm__n num">${N(t.byStatus[k])}</span></li>`;
  }).join('');

  const notDrawn = model.notDrawn.map((c) => esc(c.name)).join(', ');
  const unoutlined = model.unoutlined.map((c) => `${esc(c.name)} (${N(c.total)})`).join(', ');
  const off = model.offFrame.length + model.noCoord.length;

  return `<div class="usm__legend">
  <div class="usm__lg">
    <h3 class="usm__lh">Shape is status</h3>
    <ul class="usm__ll">${shapes}</ul>
    <p class="usm__lp">Distinguishable in greyscale and in a screenshot. Status is read from the
      OpenStreetMap tag that set it: a construction tag is under construction, a proposed or planned
      tag is announced, anything else with a datacentre tag is operating. Every pin carries its
      status in the JSON.</p>
  </div>
  <div class="usm__lg">
    <h3 class="usm__lh">Colour is one colour</h3>
    <ul class="usm__ll">
      <li><span class="usm__sw usm__sw--world" aria-hidden="true"></span>
        <b>every pin</b> <span class="usm__n num">${N(t.pinned)}</span></li>
    </ul>
    <p class="usm__lp">On the United States map colour is the drought in the pin's county and size is
      its tagged capacity. Neither join exists outside the United States, so here every pin is the
      same size and the same colour, and nothing is being said by either. A pin is 2.4 units across
      and is drawn exactly where OpenStreetMap places the object.</p>
  </div>
  <div class="usm__lg">
    <h3 class="usm__lh">What is not drawn</h3>
    <ul class="usm__ll">
      <li><b>${notDrawn || 'nothing'}</b> <span class="usm__n num">0</span></li>
      <li><b>no outline, pins drawn</b> <span class="usm__n num">${N(t.unoutlinedSites)}</span></li>
      <li><b>no country resolved</b> <span class="usm__n num">${N(t.unresolvedDrawn)}</span></li>
      <li><b>outside the frame</b> <span class="usm__n num">${N(off)}</span></li>
    </ul>
    <p class="usm__lp">${notDrawn ? `${notDrawn} carries no mapped datacentre and the frame stops at
      ${Math.abs(model.frame.lat[0])}° south, so it is left off rather than drawn empty. ` : ''}${model.unoutlined.length
    ? `${N(model.unoutlined.length)} ${model.unoutlined.length === 1 ? 'country' : 'countries'} with a mapped site
      ${model.unoutlined.length === 1 ? 'has' : 'have'} no outline at the 1:110m scale drawn here — ${unoutlined} —
      so their ${N(t.unoutlinedSites)} pins sit on what looks like sea. They are in the table with a note. `
    : ''}${N(t.unresolvedDrawn)} pins fell inside no country polygon and are drawn without a country: the
      popup says so, and they have no row in the country table but one row of their own at its foot.
      ${off === 0
    ? 'Every site with a coordinate fell inside the drawn frame; a site outside it would be listed here in words rather than dragged to the edge.'
    : `${N(off)} ${off === 1 ? 'site is' : 'sites are'} outside the drawn frame or carry no usable coordinate and ${off === 1 ? 'is' : 'are'} not on the map.`}</p>
  </div>
</div>`;
}

// ---------------------------------------------------------------------------
// The ranked table. This is the small-screen view AND the images-off view AND
// the screen-reader view, one object rather than three. Every country with a
// mapped site, in the collector's rank order, then the unresolved row, so the
// column sums equal the site total.
//
// The country name is a link. With script, worldPage.mjs's enhancement reads
// data-wm-go and calls the map's published focusState(); without, the href
// jumps to the figure and the row still carries its numbers.
// ---------------------------------------------------------------------------

/**
 * @param {object} model  from worldModel()
 * @param {object} opts
 * @param {string} [opts.mapId]   the figure id the link jumps to, default 'wm'
 * @param {string} [opts.goAttr]  the attribute the enhancement listens on, default 'data-wm-go'
 */
export function worldTable(model, opts = {}) {
  const mapId = opts.mapId || 'wm';
  const goAttr = opts.goAttr || 'data-wm-go';
  const sites = model.totals.sites || 1;
  const max = model.countries.reduce((m, c) => Math.max(m, c.total), 1);
  const w = (n) => `${((n / max) * 100).toFixed(2)}%`;
  const share = (n) => `${((n / sites) * 100).toFixed(1)}%`;
  const bar = (r) => `<span class="usm__bar" aria-hidden="true">
        <i class="usm__seg usm__seg--op" style="width:${w(r.operating)}"></i><i class="usm__seg usm__seg--uc" style="width:${w(r.under_construction)}"></i><i class="usm__seg usm__seg--an" style="width:${w(r.announced)}"></i>
      </span>`;

  const rows = model.countries.map((c) => {
    const notes = [];
    if (c.subregion) notes.push(c.subregion);
    if (!c.outlined) notes.push('no outline at 1:110m — pins drawn, no land under them');
    if (c.boundary_risk > 0) notes.push(`${N(c.boundary_risk)} within about 2 km of a border`);
    return `<tr>
      <th scope="row"><b><a class="usm__go" href="#${esc(mapId)}" ${goAttr}="${esc(c.iso2)}" title="Zoom the map to ${esc(c.name)}">${esc(c.name)}</a></b>
        <span>${esc(c.iso2)}${notes.length ? ` · ${esc(notes.join(' · '))}` : ''}</span></th>
      <td>${esc(c.continent || 'no continent recorded')}</td>
      <td class="usm__barcell">${bar(c)}<b class="usm__tot num">${N(c.total)}</b></td>
      <td class="usm__num num">${share(c.total)}</td>
      <td class="usm__num num">${N(c.operating)}</td>
      <td class="usm__num num">${N(c.under_construction)}</td>
      <td class="usm__num num">${N(c.announced)}</td>
    </tr>`;
  }).join('');

  const u = model.unresolved;
  const tail = u.total > 0
    ? `<tr class="usm__zero">
      <th scope="row"><b>${esc(u.name)}</b>
        <span>no ISO code · drawn on the map where the coordinate is, with no country in the popup</span></th>
      <td>none</td>
      <td class="usm__barcell">${bar(u)}<b class="usm__tot num">${N(u.total)}</b></td>
      <td class="usm__num num">${share(u.total)}</td>
      <td class="usm__num num">${N(u.operating)}</td>
      <td class="usm__num num">${N(u.under_construction)}</td>
      <td class="usm__num num">${N(u.announced)}</td>
    </tr>`
    : '';

  return `<div class="usm__tw">
  <table class="usm__t">
    <caption class="usm__tcap">Every country with a mapped site, ranked by total, ${esc(model.qualifier)}.
      This table is the map at phone width and the map with images off. Press a name to zoom the map to
      that country's pins. The last row is the sites no country outline claimed, so the columns add up to
      the whole file. <b>Share</b> is of every mapped site on Earth.
      <b>Op</b> operating, <b>Bld</b> under construction, <b>Ann</b> announced.</caption>
    <thead><tr>
      <th scope="col">Country</th>
      <th scope="col">Continent</th>
      <th scope="col">Sites</th>
      <th scope="col" class="usm__num">Share</th>
      <th scope="col" class="usm__num" title="operating">Op</th>
      <th scope="col" class="usm__num" title="under construction">Bld</th>
      <th scope="col" class="usm__num" title="announced">Ann</th>
    </tr></thead>
    <tbody>${rows}${tail}</tbody>
  </table>
</div>`;
}

// ---------------------------------------------------------------------------
// CSS. The base sheet is _usmap.mjs's own — the figure, the chrome, the
// legend and the table are its classes — plus the one thing this map adds: a
// single pin colour, in place of the drought ramp.
//
// THE PIN COLOUR, MEASURED. --usm-world is #12807a, a deep teal, and it is one
// value for both schemes on purpose. Relative luminance 0.1697. Against
// --bg-sunken it measures 4.17:1 on the dark ground (#08090a) and 4.16:1 on
// the light one (#f1efe9); against the land fill it measures 3.73:1 dark
// (#131519, --bg-raised) and 4.03:1 light (#ecece6). All four clear the 3:1
// floor WCAG 1.4.11 sets for graphical objects, in both themes, from one
// token. It is not --accent, which is the selection ring and must stay
// distinguishable from what it rings, and not --accent-2, which the site
// reserves for a real scalar that belongs somewhere else. Colour is never the
// only carrier here in any case: every pin also has a shape, a title and a
// row in the table.
// ---------------------------------------------------------------------------

export function worldMapCss() {
  return `${usMapCss()}
.usm-scope{--usm-world:#12807a}
.usm__k-world .usm__p{fill:var(--usm-world)}
.usm__pins--announced.usm__k-world .usm__p{fill:none;stroke:var(--usm-world)}
.usm__sw--world{background:var(--usm-world)}
.wld .usm__ll li[data-dc] .usm__pinsw{color:var(--usm-world)}
.usm__go{color:inherit;text-decoration:none;border-bottom:1px dotted var(--ink-faint)}
.usm__go:hover{color:var(--accent);border-bottom-color:var(--accent)}
`;
}

export { FRAME as WORLD_FRAME };
