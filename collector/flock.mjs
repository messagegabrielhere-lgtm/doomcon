#!/usr/bin/env node
// THE FLOCK ALPR DATASET.  data/flock.json  +  data/flock-points.json
//
//   docker run --rm --network host -v "$PWD":/app -w /app node:20-alpine \
//     node collector/flock.mjs
//
// Flags:
//   --harvest-cache <path>   write/read the harvested camera set at <path>, so
//                            the aggregation can be re-run without asking
//                            Overpass again. A DEVELOPMENT AID. Off by default,
//                            and the path must be outside the repo.
//   --refresh                ignore an existing --harvest-cache and refetch.
//   --no-points              skip data/flock-points.json.
//
// WHAT THIS IS. A register of Flock Safety automated licence-plate readers as
// they are mapped in OpenStreetMap, attributed to US state and county, with
// the fields OSM carries about each one — mount, camera type, surveillance
// zone, and the compass bearing the camera looks along.
//
// WHY IT IS HERE. ALPR is applied computer vision. It is the largest
// street-level deployment of a trained model in the United States and it is
// physical infrastructure you can stand next to. This site already maps
// datacentres; this is the other end of the same wire.
//
// ---------------------------------------------------------------------------
// THE HONESTY BAR, WHICH IS THE WHOLE POINT OF THIS FILE
//
// This dataset is CROWDSOURCED. Every number it publishes is a count of
// cameras MAPPED IN OPENSTREETMAP on a given date. It is not a count of
// cameras that exist, it is not a national total, and it must never be printed
// as either.
//
//   · A county with zero mapped cameras is a county NOBODY HAS MAPPED. It is
//     not a county with no cameras. Those two are indistinguishable in this
//     data and the page must say so where a reader can see it, not in a
//     footnote.
//   · Coverage is wildly uneven. A city where a DeFlock volunteer has been
//     active looks saturated; the identical city next door with no volunteer
//     looks empty. The difference is the volunteer, not the cameras.
//   · Flock's own published deployment figures differ from this number, and
//     the site does not reconcile them, because reconciling them would mean
//     imputing — and this site never imputes.
//
// Every headline figure therefore carries `as mapped in OpenStreetMap on
// <date>`. The string is precomputed in `copy.headline_qualifier` so no
// renderer has to remember.
//
// LICENCE. ODbL. `© OpenStreetMap contributors` with a link to
// https://www.openstreetmap.org/copyright is a CONDITION of using this data,
// not a nicety. It is carried in the payload at `source.licence` and repeated
// in `copy.attribution_required`.
//
// TONE. A factual register of publicly-deployed infrastructure: what is
// mapped, and who operates it. Nothing here editorialises about the cameras
// and nothing here concerns the equipment itself.
//
// DETERMINISM (CONTRACT.md §1.4). Given the same OSM snapshot the payload is
// byte-identical: every array is sorted on a stable key, every float is fixed
// precision, and the only clock-derived field is `generated_at`. Wall-clock
// duration is deliberately NOT in the payload — it is printed in the run
// report, where a non-reproducible number belongs.

import { mkdirSync, writeFileSync, readFileSync, existsSync, statSync } from 'node:fs';
import { fetchJson, fetchText } from './fetch.mjs';
import { countyIndex, COUNTY_CACHE_KEY } from './dc-sources/_geo.mjs';
import { readCache } from './dc-sources/_cache.mjs';
import { canonical, round, STATE_NAMES, FIPS_TO_STATE } from './dc-sources/_util.mjs';
import osmFlock, { harvest, LARGE_TILE_ELEMENTS, SEED_BOXES, FLOCK_TAGS, FLOCK_VALUE, BASE_FILTER } from './dc-sources/osm-flock.mjs';

const OUT = 'data/flock.json';
const OUT_POINTS = 'data/flock-points.json';
const SCHEMA = 1;

// CONTRACT.md §1.5: every network call goes through collector/fetch.mjs.
const net = {
  json: (url, opts) => fetchJson(url, opts),
  text: (url, opts) => fetchText(url, opts),
};

// Refuse to publish a collapse as a finding. The union measured 115,607
// worldwide on 2026-09-26; if a run comes back with a third of that, the query
// broke, OSM did not empty out, and the previous file is the honest thing to
// keep. Same reflex as dc-sources/osm-overpass.mjs.
const SANITY_FLOOR = 50_000;

// Coarse bins for the national view. 0.25° is about 28 km of latitude — at the
// width CONUS renders on a phone that is roughly one bin per two pixels, which
// is as fine as a national choropleth can honestly resolve. The full point set
// lives in data/flock-points.json for anything closer.
const GRID_CELL_DEG = 0.25;

// Points are quantised to 1e-5° — about 1.1 m of latitude. Finer than the
// dataset's own accuracy (these are volunteer-placed pins) and far finer than
// any map this site draws, but it is lossless at the precision OSM publishes.
const POINT_SCALE = 100_000;
const DIR_MISSING = -1;

// The territories TIGER returns county-equivalents for and _util.mjs's
// FIPS_TO_STATE does not carry. Labels only — no geometry, no second resolver.
const TERRITORY_CODE = Object.freeze({ '60': 'AS', '66': 'GU', '69': 'MP', '72': 'PR', '78': 'VI' });
const TERRITORY_NAME = Object.freeze({
  AS: 'American Samoa', GU: 'Guam', MP: 'Northern Mariana Islands',
  PR: 'Puerto Rico', VI: 'US Virgin Islands',
});

const COMPASS_16 = Object.freeze([
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
]);

function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : (process.argv[i + 1] ?? '');
}
const hasFlag = (name) => process.argv.includes(name);

/** Count values into a plain object, then emit a sorted descending array. */
function tally(map, key) {
  if (key === null || key === undefined || key === '') return;
  map.set(key, (map.get(key) ?? 0) + 1);
}
function topValues(map, { limit = 0 } = {}) {
  const rows = [...map.entries()]
    .map(([value, n]) => ({ value, n }))
    // Descending by count, then by value, so ties never reorder between runs.
    .sort((a, b) => b.n - a.n || a.value.localeCompare(b.value));
  if (limit > 0 && rows.length > limit) {
    const kept = rows.slice(0, limit);
    const rest = rows.slice(limit);
    kept.push({
      value: '(all other values)',
      n: rest.reduce((s, r) => s + r.n, 0),
      distinct_values_folded: rest.length,
    });
    return kept;
  }
  return rows;
}

/** present / missing / share, at fixed precision. Missing-ness is data. */
function coverageOf(present, total) {
  return {
    present,
    missing: total - present,
    share_present: total > 0 ? round(present / total, 4) : null,
  };
}

/** Pretty JSON, except named arrays where each row is one line. */
function serialise(value, oneLineArrays) {
  const parts = [];
  for (const key of Object.keys(value)) {
    if (oneLineArrays.includes(key) && Array.isArray(value[key])) {
      const rows = value[key].map((r) => `    ${JSON.stringify(r)}`).join(',\n');
      parts.push(`  ${JSON.stringify(key)}: [\n${rows}\n  ]`);
    } else {
      parts.push(`  ${JSON.stringify(key)}: ${JSON.stringify(value[key], null, 2).split('\n').join('\n  ')}`);
    }
  }
  return `{\n${parts.join(',\n')}\n}\n`;
}

/** A long flat int array, wrapped so a text editor can open the file. */
function packedArray(nums, perLine = 120) {
  const lines = [];
  for (let i = 0; i < nums.length; i += perLine) {
    lines.push(`    ${nums.slice(i, i + perLine).join(',')}`);
  }
  return `[\n${lines.join(',\n')}\n  ]`;
}

function bytesOf(path) {
  try { return statSync(path).size; } catch { return null; }
}

async function main() {
  const t0 = Date.now();
  const nowMs = t0;
  const nowIso = new Date(nowMs).toISOString();
  const log = (s) => console.log(s);

  console.log('FLOCK ALPR — OpenStreetMap harvest');
  console.log('='.repeat(78));

  // ---- geography: reuse the datacentre map's county resolver ---------------
  // Same TIGERweb polygons, same 550 m simplification, same boundary_risk flag.
  // Writing a second one would be two mechanisms that eventually disagree.
  let counties = null;
  let countyMeta = { id: 'tiger-counties', state: 'dark', error: null };
  try {
    const ci = await countyIndex(net, nowMs);
    counties = ci.lookup;
    countyMeta = { ...ci.meta, state: ci.meta.origin === 'stale-cache' ? 'stale-cache' : 'live' };
    console.log(`counties: ${ci.meta.counties} polygons [${ci.meta.origin}]`);
  } catch (err) {
    countyMeta.error = String(err?.message ?? err);
    console.error(`counties: DARK — ${countyMeta.error}`);
  }
  if (!counties) {
    console.error('\nRefusing to build: without county polygons every camera would be reported');
    console.error('as "outside the United States", which is a false statement, not a gap.\n');
    process.exitCode = 1;
    return;
  }

  // The full county roster, including the ones with nothing in them. This is
  // the entire point of the coverage section: a county has to be able to
  // appear on the map as ZERO MAPPED, which it cannot do if it is absent.
  const countyRoster = (readCache(COUNTY_CACHE_KEY)?.features ?? []).map((f) => ({
    fips: f.geoid,
    name: f.name,
    state: FIPS_TO_STATE[f.state_fips] ?? TERRITORY_CODE[f.state_fips] ?? null,
    state_fips: f.state_fips,
  }));
  if (countyRoster.length < 3000) {
    console.error(`\nRefusing to build: the county roster came back with ${countyRoster.length} rows,`);
    console.error('and the coverage section is the point of this dataset. Without every county in it,');
    console.error('"zero mapped cameras" cannot be distinguished from "county not in the list".\n');
    process.exitCode = 1;
    return;
  }

  // ---- harvest -------------------------------------------------------------
  const cachePath = arg('--harvest-cache');
  let harvested = null;

  if (cachePath && existsSync(cachePath) && !hasFlag('--refresh')) {
    console.log(`harvest: reading ${cachePath} (development cache; pass --refresh to refetch)`);
    harvested = JSON.parse(readFileSync(cachePath, 'utf8'));
  } else {
    console.log(`harvest: ${SEED_BOXES.length} seed boxes covering the planet, ${SEED_BOXES.reduce((n, s) => n + s.split[0] * s.split[1], 0)} tiles before any split`);
    console.log('         one request per 5,000 ms to overpass-api.de — this takes tens of minutes');
    console.log('-'.repeat(78));
    try {
      harvested = await harvest(net, { log });
    } catch (err) {
      console.error(`\nharvest FAILED — ${String(err?.message ?? err)}`);
      console.error('Nothing written. The previously committed data/flock.json stands, because a');
      console.error('partial harvest published as a complete one is exactly the lie this site exists');
      console.error('to avoid.\n');
      process.exitCode = 1;
      return;
    }
    if (cachePath) {
      writeFileSync(cachePath, JSON.stringify(harvested));
      console.log(`harvest: cached to ${cachePath}`);
    }
  }

  const cameras = harvested.cameras;
  const hs = harvested.stats;
  console.log('-'.repeat(78));
  console.log(`harvest: ${cameras.length} distinct cameras from ${hs.data_queries} data + ${hs.count_queries} count queries`);

  if (cameras.length < SANITY_FLOOR) {
    console.error(`\nRefusing to publish: ${cameras.length} cameras is below the sanity floor of`);
    console.error(`${SANITY_FLOOR}. The union measured 115,607 worldwide on 2026-09-26. A collapse`);
    console.error('like that is a query fault, not a finding. Nothing written.\n');
    process.exitCode = 1;
    return;
  }

  // ---- attribute every camera ---------------------------------------------
  const byCounty = new Map();       // fips -> n
  const byState = new Map();        // postal -> { cameras, counties:Set, dir_present, boundary_risk }
  const dirBins = new Array(16).fill(0);
  const dirByState = new Map();     // postal -> 16 bins

  const mountVals = new Map();
  const typeVals = new Map();
  const zoneVals = new Map();
  const visVals = new Map();
  const operatorVals = new Map();

  let inUs = 0;
  let outsideUs = 0;
  let boundaryRisk = 0;
  let dirParsed = 0;
  let dirTagged = 0;
  const dirForms = new Map();
  const arcWidths = new Map();
  let arcPresent = 0;
  let dirExactZero = 0;
  let mountPresent = 0;
  let typePresent = 0;
  let zonePresent = 0;
  let visPresent = 0;
  let operatorPresent = 0;
  let centroids = 0;
  const byMatchedTag = Object.fromEntries(FLOCK_TAGS.map((k) => [k, 0]));
  let multiTag = 0;

  const grid = new Map();           // "latIdx,lonIdx" -> n
  const located = [];               // for the points file

  for (const c of cameras) {
    const loc = counties(c.lat, c.lon);
    // _geo.mjs resolves a state through _util.mjs's FIPS_TO_STATE, which covers
    // the fifty states and DC and stops there. A camera in Puerto Rico or the
    // US Virgin Islands therefore comes back with a real county and a null
    // state — and without this line it lands in the county table but shows as
    // zero in the state table. That is 196 mapped cameras reported as
    // belonging to nowhere, which is precisely the kind of silent gap this
    // dataset exists to not have. Same label table the county roster uses, so
    // the two can never drift apart.
    const st = loc ? (loc.state ?? TERRITORY_CODE[String(loc.county_fips).slice(0, 2)] ?? null) : null;

    if (loc) {
      inUs += 1;
      byCounty.set(loc.county_fips, (byCounty.get(loc.county_fips) ?? 0) + 1);
      if (loc.boundary_risk) boundaryRisk += 1;
    } else {
      outsideUs += 1;
    }

    if (st) {
      let s = byState.get(st);
      if (!s) {
        s = { cameras: 0, counties: new Set(), dir_present: 0, boundary_risk: 0 };
        byState.set(st, s);
      }
      s.cameras += 1;
      if (loc?.county_fips) s.counties.add(loc.county_fips);
      if (loc?.boundary_risk) s.boundary_risk += 1;
      if (c.dir !== null) s.dir_present += 1;
    }

    if (c.dir_tagged) dirTagged += 1;
    if (c.dir !== null) {
      dirParsed += 1;
      tally(dirForms, c.dir_form);
      if (c.dir_arc !== null) { arcPresent += 1; tally(arcWidths, String(c.dir_arc)); }
      if (c.dir === 0 && c.dir_form === 'bearing') dirExactZero += 1;
      const bin = Math.round(c.dir / 22.5) % 16;
      dirBins[bin] += 1;
      if (st) {
        let b = dirByState.get(st);
        if (!b) { b = new Array(16).fill(0); dirByState.set(st, b); }
        b[bin] += 1;
      }
    }

    if (c.mount) { mountPresent += 1; tally(mountVals, c.mount); }
    if (c.camera_type) { typePresent += 1; tally(typeVals, c.camera_type); }
    if (c.zone) { zonePresent += 1; tally(zoneVals, c.zone); }
    if (c.visibility) { visPresent += 1; tally(visVals, c.visibility); }
    if (c.operator) { operatorPresent += 1; tally(operatorVals, c.operator); }
    if (c.centroid) centroids += 1;

    for (const k of c.matched) byMatchedTag[k] += 1;
    if (c.matched.length > 1) multiTag += 1;

    const gLat = Math.floor(c.lat / GRID_CELL_DEG);
    const gLon = Math.floor(c.lon / GRID_CELL_DEG);
    const gKey = `${gLat},${gLon}`;
    grid.set(gKey, (grid.get(gKey) ?? 0) + 1);

    located.push({
      qlat: Math.round(c.lat * POINT_SCALE),
      qlon: Math.round(c.lon * POINT_SCALE),
      dir: c.dir === null ? DIR_MISSING : c.dir,
      state: st,
      ref: c.ref,
    });
  }

  const total = cameras.length;

  // ---- states --------------------------------------------------------------
  const stateCountyTotals = new Map();
  for (const c of countyRoster) {
    if (!c.state) continue;
    stateCountyTotals.set(c.state, (stateCountyTotals.get(c.state) ?? 0) + 1);
  }

  const n = (v) => Number(v).toLocaleString('en-US');

  const stateNameOf = (st) => STATE_NAMES[st] ?? TERRITORY_NAME[st] ?? st;

  const states = [...stateCountyTotals.keys()]
    .sort((a, b) => a.localeCompare(b))
    .map((st) => {
      const s = byState.get(st);
      const countiesTotal = stateCountyTotals.get(st) ?? 0;
      const withCameras = s ? s.counties.size : 0;
      return {
        state: st,
        name: stateNameOf(st),
        cameras_mapped: s ? s.cameras : 0,
        counties_total: countiesTotal,
        counties_with_mapped_cameras: withCameras,
        counties_with_none_mapped: countiesTotal - withCameras,
        direction_present: s ? s.dir_present : 0,
        near_county_boundary: s ? s.boundary_risk : 0,
        direction_histogram_16: dirByState.get(st) ?? new Array(16).fill(0),
      };
    });

  // ---- counties: EVERY county, including the empty ones --------------------
  const countyRows = countyRoster
    .map((c) => [c.fips, c.name, c.state, byCounty.get(c.fips) ?? 0])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])));

  const countiesWith = countyRows.filter((r) => r[3] > 0).length;
  const countiesZero = countyRows.length - countiesWith;
  const statesWith = states.filter((s) => s.cameras_mapped > 0).length;

  // ---- the render grid -----------------------------------------------------
  const gridRows = [...grid.entries()]
    .map(([k, n]) => {
      const [a, b] = k.split(',');
      return [Number(a), Number(b), n];
    })
    .sort((x, y) => x[0] - y[0] || x[1] - y[1]);

  const gridMax = gridRows.reduce((m, r) => Math.max(m, r[2]), 0);

  // ---- the payload ---------------------------------------------------------
  const asOfDate = (harvested.osm_timestamp ?? nowIso).slice(0, 10);
  const qualifier = `as mapped in OpenStreetMap on ${asOfDate}`;

  const out = {
    schema: SCHEMA,
    generated_at: nowIso,

    source: {
      id: osmFlock.id,
      label: osmFlock.label,
      endpoint: osmFlock.endpoint,
      keyless: true,
      refresh_days: osmFlock.refresh_days,
      state: 'live',
      // Overpass's own snapshot clock, not ours. This is a property of the
      // data, which is why it is allowed to live inside the payload.
      osm_timestamp: harvested.osm_timestamp ?? null,
      as_of_date: asOfDate,
      licence: osmFlock.licence,
      base_filter: BASE_FILTER.map(([k, v]) => `${k}=${v}`),
      flock_tags_unioned: FLOCK_TAGS.map((k) => `${k}=${FLOCK_VALUE}`),
      query_template: harvested.query_template,
      recompute:
        'Substitute a bounding box into query_template and POST it to the endpoint as a ' +
        'form-encoded `data=` field (a raw POST body answers HTTP 406). Every figure on this ' +
        'page is the arithmetic in collector/flock.mjs over that response and nothing else.',
    },

    collection: {
      method:
        'seeded adaptive tiling. Five seed boxes tile the whole planet exactly once; the '  +
        'contiguous states are pre-cut into a 4 x 8 grid. Every tile is COUNTED before it is '  +
        'fetched, and a tile over the element limit — or one that errors — is quartered and '  +
        'each quarter counted in turn.',
      large_tile_report_threshold: LARGE_TILE_ELEMENTS,
      seed_cross_checks: hs.seed_cross_checks,
      count_queries: hs.count_queries,
      data_queries: hs.data_queries,
      tiles_fetched: hs.tiles_fetched,
      tiles_empty: hs.tiles_empty,
      tiles_split: hs.tiles_split,
      splits_after_an_error: hs.splits_after_error,
      max_depth_used: hs.max_depth_used,
      duplicates_across_tile_edges: hs.duplicates_across_tiles,
      large_tiles: hs.large_tiles,
      endpoints_used: hs.endpoints_used,
      slot_waiting_note:
        'Overpass allocates each IP a small number of execution slots and publishes their ' +
        'availability at /api/status. This collector consults it before every query and waits ' +
        'exactly as long as the server states, rather than guessing at a backoff.',
      cameras_by_seed_box: hs.cameras_by_seed,
      seed_boxes: harvested.seeds,
      errors_recovered: hs.errors_recovered,
      note:
        'Overpass bounding boxes are inclusive on all four edges, so a camera sitting exactly ' +
        'on a tile line is returned twice. Records are keyed on the OSM object id and ' +
        'deduplicated; duplicates_across_tile_edges is how many were absorbed.',
      integrity:
        'Tiles are fetched with no `out` limit, so a tile either arrives whole or fails loudly — ' +
        'there is no silent truncation to detect. One count query per seed box cross-checks the ' +
        'result: seed_cross_checks compares the box total against the distinct cameras its tiles ' +
        'yielded, and a shortfall over 2% aborts the run rather than publishing a partial map.',
    },

    totals: {
      mapped_worldwide: total,
      in_a_us_county: inUs,
      outside_any_us_county: outsideUs,
      near_a_county_boundary: boundaryRisk,
      located_by_way_centroid: centroids,
      by_flock_tag: byMatchedTag,
      carrying_more_than_one_flock_tag: multiTag,
    },

    // Missing-ness is data. A field absent on 40% of elements is a fact about
    // how this corpus was mapped, and it is published rather than smoothed.
    field_coverage: {
      direction_tagged: coverageOf(dirTagged, total),
      direction_parsed: coverageOf(dirParsed, total),
      direction_unparseable: dirTagged - dirParsed,
      camera_mount: coverageOf(mountPresent, total),
      camera_type: coverageOf(typePresent, total),
      surveillance_zone: coverageOf(zonePresent, total),
      surveillance_visibility: coverageOf(visPresent, total),
      operating_agency: coverageOf(operatorPresent, total),
    },

    field_values: {
      camera_mount: topValues(mountVals),
      camera_type: topValues(typeVals),
      surveillance_zone: topValues(zoneVals),
      surveillance_visibility: topValues(visVals),
      // The deploying agency, where OSM records one. `operator=Flock Safety`
      // is the manufacturer's own name and is excluded here — it says who made
      // the camera, not who runs it.
      operating_agency: topValues(operatorVals, { limit: 60 }),
    },

    direction: {
      units: 'degrees clockwise from true north; 0 is due north',
      bins: 16,
      bin_width_deg: 22.5,
      labels: COMPASS_16,
      counts: dirBins,
      tag_forms: topValues(dirForms),
      tag_form_legend: {
        bearing: 'a plain bearing in degrees, e.g. "142".',
        sector: 'an OSM field-of-view arc, e.g. "338-23" — 45 degrees wide, centred on 0. The centre is DERIVED, not tagged.',
        compass: 'a 16-point compass letter, e.g. "NNE".',
        multi: 'an OSM multi-value, e.g. "0;0". The first value is used; the others are not averaged in.',
      },
      // The north bin is visibly fatter than its neighbours, and the reason is
      // not that cameras prefer north. `direction=0` is both a real bearing and
      // the value a mapper leaves in when the bearing is unknown, and the two
      // are indistinguishable in the tag. Published, not smoothed.
      exactly_zero: {
        cameras: dirExactZero,
        share_of_parsed: dirParsed > 0 ? round(dirExactZero / dirParsed, 4) : null,
        caution:
          'A bare direction=0 means due north AND is the value left behind when a bearing was ' +
          'never established. The two cannot be told apart, so the north bin is inflated by an ' +
          'unknown amount. Nothing is reweighted to hide it.',
      },
      field_of_view: {
        cameras_with_an_arc: arcPresent,
        note:
          'Only the sector form states a field of view. Where it does, the width is real; where ' +
          'it does not, no width is inferred. Widths are not carried per camera in ' +
          'flock-points.json — they are aggregate only.',
        widths_deg: topValues(arcWidths, { limit: 12 }),
      },
      note:
        'The bearing the camera looks along, as tagged. It is the field nobody renders and ' +
        'the one that says most about what a camera is for: an ALPR aimed along a carriageway ' +
        'reads the traffic on it. Cameras with no direction tag are absent from these bins ' +
        'entirely — they are not binned as north.',
    },

    coverage: {
      counties_in_roster: countyRows.length,
      counties_with_mapped_cameras: countiesWith,
      counties_with_none_mapped: countiesZero,
      share_of_counties_with_none_mapped: countyRows.length
        ? round(countiesZero / countyRows.length, 4) : null,
      states_and_territories_in_roster: states.length,
      states_with_mapped_cameras: statesWith,
      states_with_none_mapped: states.length - statesWith,
      what_zero_means:
        'A county with zero mapped cameras is a county nobody has mapped. It is NOT a county ' +
        'with no cameras. This dataset cannot tell those two apart, and neither can anyone ' +
        `reading it: ${n(countiesZero)} of ${n(countyRows.length)} counties are in that state.`,
      why_it_is_uneven:
        'Coverage follows volunteers, not deployments. A city where a DeFlock contributor has ' +
        'been active looks saturated; an identical city with no contributor looks empty. The ' +
        'difference between them is the contributor.',
      not_reconciled_with_vendor_figures:
        "Flock Safety publishes its own deployment figures and they differ from this count. " +
        'This site does not reconcile the two, because reconciling them would mean imputing ' +
        'cameras nobody has mapped, and this site never imputes.',
    },

    // Copy the page is expected to use verbatim, so the honesty cannot be lost
    // in a renderer. The qualifier is not optional on any headline figure.
    copy: {
      headline_qualifier: qualifier,
      headline_example: `${n(total)} Flock ALPR cameras ${qualifier}`,
      never_say: [
        'all Flock cameras',
        'every Flock camera',
        'the number of Flock cameras in the United States',
        'a national total',
      ],
      attribution_required: '© OpenStreetMap contributors',
      attribution_url: 'https://www.openstreetmap.org/copyright',
      attribution_note:
        'ODbL requires this attribution and the link wherever the data is shown. It is a ' +
        'licence condition, not a courtesy.',
      empty_state:
        'A county with no pins is a county nobody has mapped. It is not a county with no cameras.',
      legend_requirement:
        'The map must distinguish "zero mapped" from "not surveyed" by a means that is not ' +
        'colour alone — a hatch, a texture or a label — because colour is not the sole carrier ' +
        'of meaning anywhere on this site, and because the distinction is the finding.',
    },

    honesty: [
      `Every figure here counts cameras ${qualifier}. It is not a count of cameras that exist.`,
      `${n(countiesZero)} of ${n(countyRows.length)} counties have zero mapped cameras. That means nobody has mapped them, not that they have none.`,
      'OpenStreetMap coverage is volunteer-driven and uneven; the map is partly a map of where mappers have been.',
      `Direction is tagged on ${n(dirTagged)} of ${n(total)} cameras. The untagged ones are shown as untagged, never as facing north.`,
      `${n(dirExactZero)} cameras carry a bare direction=0. That is both "due north" and what a mapper leaves behind when the bearing is unknown, so the north bin is inflated by an amount nobody can measure. It is not reweighted.`,
      `An operating agency is recorded for ${n(operatorPresent)} of ${n(total)}. For the rest OSM does not say who runs the camera, and neither does this page.`,
      'County assignment uses TIGER polygons simplified to about 550 m, so a camera within a few hundred metres of a county line can land in the neighbouring county.',
      `${n(outsideUs)} mapped cameras fall outside any US county. They are counted and kept, not dropped.`,
      'Flock Safety publishes different deployment figures. The two are not reconciled here, because reconciling them would mean imputing.',
    ],

    geography: countyMeta,

    grid: {
      cell_deg: GRID_CELL_DEG,
      note:
        'Occupied cells only, for the national view. Row shape is [lat_index, lon_index, count]; ' +
        'the cell south-west corner is lat_index * cell_deg, lon_index * cell_deg (WGS84). ' +
        'A cell absent from this array has no MAPPED cameras, which is not the same as none.',
      cells: gridRows.length,
      max_cell_count: gridMax,
      rows_key: 'grid_rows',
    },

    grid_rows: gridRows,

    states,

    counties_note:
      'Every county in the TIGER roster, including the ones with nothing mapped in them — that ' +
      'is what makes zero renderable. Row shape is [fips, name, state, cameras_mapped].',
    counties: countyRows,

    points_file: hasFlag('--no-points') ? null : {
      path: OUT_POINTS,
      count: located.length,
      fields: ['lat_q', 'lon_q', 'dir', 'st'],
      quantisation: POINT_SCALE,
      direction_missing_sentinel: DIR_MISSING,
      note:
        'Flat parallel integer arrays. lat = lat_q / quantisation. dir of ' +
        `${DIR_MISSING} means no usable direction tag, NOT north. st indexes that file's own ` +
        'states array, and -1 means the camera is not inside any US county.',
    },
  };

  mkdirSync('data', { recursive: true });
  writeFileSync(OUT, serialise(canonical(out), ['counties', 'grid_rows']));

  // ---- the point set -------------------------------------------------------
  // Flat parallel arrays of integers, not an array of objects. 115k records as
  // {"lat":…,"lon":…,"dir":…} is ~40 bytes of repeated key names per record —
  // about 4.5 MB of the word "lat". The arrays carry the same information and
  // the shape is declared in `fields` so nothing has to be guessed.
  let pointsBytes = null;
  if (!hasFlag('--no-points')) {
    located.sort((a, b) => a.qlat - b.qlat || a.qlon - b.qlon || a.ref.localeCompare(b.ref));
    const stateList = [...new Set(located.map((p) => p.state).filter(Boolean))].sort();
    const stateIdx = new Map(stateList.map((s, i) => [s, i]));

    const head = {
      schema: SCHEMA,
      generated_at: nowIso,
      count: located.length,
      as_of_date: asOfDate,
      attribution: '© OpenStreetMap contributors',
      attribution_url: 'https://www.openstreetmap.org/copyright',
      licence: osmFlock.licence.data,
      what_this_is: `Flock Safety ALPR cameras ${qualifier}. Not a count of cameras that exist.`,
      quantisation: POINT_SCALE,
      quantisation_note:
        'lat = lat_q / quantisation, lon = lon_q / quantisation, WGS84 decimal degrees. ' +
        '1e-5 deg is about 1.1 m of latitude.',
      direction_note:
        'Degrees clockwise from true north, 0 = due north. ' +
        `${DIR_MISSING} means the camera carries no usable direction tag — it does NOT mean north.`,
      direction_missing_sentinel: DIR_MISSING,
      states: stateList,
      state_note: 'st[i] indexes states[]; -1 means the camera is not inside any US county.',
      fields: ['lat_q', 'lon_q', 'dir', 'st'],
      order: 'sorted by lat_q, then lon_q, then OSM id — stable across runs',
    };

    const body =
      `{\n` +
      Object.keys(head).map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(head[k])}`).join(',\n') +
      `,\n  "lat_q": ${packedArray(located.map((p) => p.qlat))}` +
      `,\n  "lon_q": ${packedArray(located.map((p) => p.qlon))}` +
      `,\n  "dir": ${packedArray(located.map((p) => p.dir))}` +
      `,\n  "st": ${packedArray(located.map((p) => (p.state ? stateIdx.get(p.state) : -1)))}` +
      `\n}\n`;

    writeFileSync(OUT_POINTS, body);
    pointsBytes = Buffer.byteLength(body);
  }

  // ---- the run report ------------------------------------------------------
  const wallS = Math.round((Date.now() - t0) / 1000);
  const line = (k, v) => console.log(`${String(k).padEnd(38)} ${v}`);
  console.log('\n' + '='.repeat(78));
  console.log('FLOCK ALPR');
  console.log('='.repeat(78));
  line('cameras mapped worldwide', total.toLocaleString('en-US'));
  line('  in a US county', inUs.toLocaleString('en-US'));
  line('  outside any US county', outsideUs.toLocaleString('en-US'));
  line('  located by way centroid', centroids);
  for (const k of FLOCK_TAGS) line(`  tagged ${k}="${FLOCK_VALUE}"`, byMatchedTag[k].toLocaleString('en-US'));
  line('  carrying more than one', multiTag.toLocaleString('en-US'));
  console.log('-'.repeat(78));
  line('direction tagged', `${dirTagged.toLocaleString('en-US')} (${(100 * dirTagged / total).toFixed(1)}%)`);
  line('  of those, parsed', `${dirParsed.toLocaleString('en-US')} (${(100 * dirParsed / total).toFixed(1)}% of all)`);
  line('  stating a field-of-view arc', arcPresent.toLocaleString('en-US'));
  line('  a bare direction=0', `${dirExactZero.toLocaleString('en-US')}  <- north, or an unset bearing; indistinguishable`);
  line('camera:mount tagged', `${mountPresent.toLocaleString('en-US')} (${(100 * mountPresent / total).toFixed(1)}%)`);
  line('camera:type tagged', `${typePresent.toLocaleString('en-US')} (${(100 * typePresent / total).toFixed(1)}%)`);
  line('surveillance:zone tagged', `${zonePresent.toLocaleString('en-US')} (${(100 * zonePresent / total).toFixed(1)}%)`);
  line('operating agency recorded', `${operatorPresent.toLocaleString('en-US')} (${(100 * operatorPresent / total).toFixed(1)}%)`);
  console.log('-'.repeat(78));
  line('counties in roster', countyRows.length);
  line('  with mapped cameras', countiesWith);
  line('  with NONE mapped', `${countiesZero}  <- nobody has mapped these, not "no cameras"`);
  line('states/territories with cameras', `${statesWith} of ${states.length}`);
  console.log('-'.repeat(78));
  line('count queries', hs.count_queries);
  line('data queries', hs.data_queries);
  line('tiles fetched / empty / split', `${hs.tiles_fetched} / ${hs.tiles_empty} / ${hs.tiles_split}`);
  line('  splits after an error', hs.splits_after_error);
  line('max quadtree depth', hs.max_depth_used);
  line('duplicates across tile edges', hs.duplicates_across_tiles);
  line('raw bytes received from Overpass', `${(hs.bytes_received / 1e6).toFixed(1)} MB`);
  line('endpoints used', hs.endpoints_used.join(', '));
  line('time spent waiting for a slot', `${Math.round(hs.slot_wait_ms / 1000)}s`);
  line('wall clock', `${Math.floor(wallS / 60)}m ${wallS % 60}s`);
  console.log('-'.repeat(78));
  console.log('TOP TEN STATES BY MAPPED CAMERAS');
  for (const s of [...states].sort((a, b) => b.cameras_mapped - a.cameras_mapped || a.state.localeCompare(b.state)).slice(0, 10)) {
    console.log(
      `  ${s.state}  ${String(s.cameras_mapped).padStart(6)}   ` +
      `${String(s.counties_with_mapped_cameras).padStart(3)}/${String(s.counties_total).padEnd(3)} counties mapped`,
    );
  }
  console.log('-'.repeat(78));
  line(`wrote ${OUT}`, `${(bytesOf(OUT) / 1024).toFixed(0)} KB`);
  if (pointsBytes !== null) line(`wrote ${OUT_POINTS}`, `${(pointsBytes / 1e6).toFixed(2)} MB`);
  console.log('');
}

await main();
