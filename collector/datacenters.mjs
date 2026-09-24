#!/usr/bin/env node
// THE DATACENTRE DATASET.  data/datacenters.json
//
//   docker run --rm --network host -v "$PWD":/app -w /app node:20-alpine \
//     node collector/datacenters.mjs
//
// A map of current and pending datacentres in the United States, with the
// condition of the power and water around each one attached. It is the sibling
// of /watts: same grids, same gauges, same Drought Monitor, same three states
// kept apart. /watts asks how the substrate is doing. This asks where the
// things drawing on it are.
//
// IT DOES NOT FEED THE MAIN INDEX, and never will unless its sources enter the
// frozen reference distribution. collector/engine.mjs does not read this file.
//
// THE SHAPE OF THE HONESTY, up front, because everything below depends on it:
//
//   · OpenStreetMap coverage is uneven and volunteer-maintained. A datacentre
//     missing from this map means nobody mapped it. It does not mean the
//     datacentre is not there.
//   · Capacity tags are rare — 39 of 1,921 US elements carry it_power.
//   · NOTHING HERE MEASURES A DATACENTRE'S POWER OR WATER DRAW. That is not
//     public for any site at any cadence. What is measured is the condition of
//     the substrate around it.
//   · Announced sites are announcements. Their location is the state, and they
//     say so.
//
// CONTRACT.md §1.4: deterministic. The only clock-dependent field is
// generated_at and the first_seen_at of a pin the first time it is seen.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fetchJson, fetchText } from './fetch.mjs';
import { parseRdb } from './infra-sources/_util.mjs';
import { cached } from './dc-sources/_cache.mjs';
import { countyIndex } from './dc-sources/_geo.mjs';
import { gridFor, GRIDS, GRID_TABLE_NOTE } from './dc-sources/_grid.mjs';
import { bySiteOrder, canonical, round, STATE_NAMES } from './dc-sources/_util.mjs';
import osmOverpass from './dc-sources/osm-overpass.mjs';
import newsAnnouncements from './dc-sources/news-announcements.mjs';
import fedregProjects from './dc-sources/fedreg-projects.mjs';
import secOperators from './dc-sources/sec-operators.mjs';
import {
  readInfra, droughtByCounty, gaugeCoords, joinSite, buildIndex, sentenceFor,
} from './dc-sources/resources.mjs';

const OUT = 'data/datacenters.json';
const SCHEMA = 1;

// CONTRACT.md §1.5: every network call goes through collector/fetch.mjs. Same
// two-method shape collector/infra.mjs hands its adapters.
const net = {
  json: (url, opts) => fetchJson(url, opts),
  text: (url, opts) => fetchText(url, opts),
};

const STATUSES = Object.freeze(['operating', 'under_construction', 'announced']);

function previousSites() {
  if (!existsSync(OUT)) return [];
  try {
    const prev = JSON.parse(readFileSync(OUT, 'utf8'));
    return Array.isArray(prev?.sites) ? prev.sites : [];
  } catch {
    return [];
  }
}

/**
 * Pretty JSON everywhere except the sites array, where each site is one line.
 *
 * This file is committed and it holds nearly two thousand records. Fully
 * indented it is three megabytes of mostly whitespace, and a single retagged
 * building produces a diff spread over forty lines. One line per site keeps the
 * metadata readable by a human, keeps the file about a third of the size, and
 * makes `git diff` say exactly which buildings changed.
 */
function serialise(value) {
  const parts = [];
  for (const key of Object.keys(value)) {
    if (key === 'sites') {
      const rows = value.sites.map((s) => `    ${JSON.stringify(s)}`).join(',\n');
      parts.push(`  ${JSON.stringify(key)}: [\n${rows}\n  ]`);
    } else {
      parts.push(`  ${JSON.stringify(key)}: ${JSON.stringify(value[key], null, 2).split('\n').join('\n  ')}`);
    }
  }
  return `{\n${parts.join(',\n')}\n}\n`;
}

/** Run one adapter, never letting it take the run down. A dark source is a state. */
async function run(adapter, ctx) {
  const t0 = Date.now();
  try {
    const r = await adapter.collect(net, ctx);
    return {
      id: adapter.id,
      label: adapter.label,
      endpoint: adapter.endpoint,
      keyless: adapter.keyless,
      gives: adapter.gives,
      state: r.meta?.origin === 'stale-cache' ? 'stale-cache' : 'live',
      // 'network' | 'cache' | 'stale-cache' | 'local'. A fresh cache read is a
      // live source — the refresh policy is measured in days on purpose — but a
      // reader of the run report is entitled to know which it was.
      origin: r.meta?.origin ?? 'network',
      ms: Date.now() - t0,
      error: r.meta?.error ?? null,
      meta: r.meta ?? {},
      sites: r.sites ?? [],
      filers: r.filers ?? null,
    };
  } catch (err) {
    return {
      id: adapter.id,
      label: adapter.label,
      endpoint: adapter.endpoint,
      keyless: adapter.keyless,
      gives: adapter.gives,
      state: 'dark',
      ms: Date.now() - t0,
      error: String(err?.message ?? err),
      meta: {},
      sites: [],
      filers: null,
    };
  }
}

async function main() {
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const previous = previousSites();
  const ctx = { nowMs, nowIso, previous };

  // ---- the substrate this map is joined against ---------------------------
  const infra = readInfra();

  // ---- geography ----------------------------------------------------------
  let counties = null;
  let countyMeta = { id: 'tiger-counties', state: 'dark', error: null };
  try {
    const ci = await countyIndex(net, nowMs);
    counties = ci.lookup;
    countyMeta = { ...ci.meta, state: ci.meta.origin === 'stale-cache' ? 'stale-cache' : 'live' };
  } catch (err) {
    countyMeta.error = String(err?.message ?? err);
  }

  // ---- adapters -----------------------------------------------------------
  const results = [];
  results.push(await run(osmOverpass, ctx));
  results.push(await run(newsAnnouncements, ctx));
  results.push(await run(fedregProjects, ctx));
  results.push(await run(secOperators, ctx));

  const byId = new Map(results.map((r) => [r.id, r]));

  // ---- locate, dedupe, join ----------------------------------------------
  const sites = [];
  const seen = new Set();
  let droppedOutsideUS = 0;

  for (const r of results) {
    for (const s of r.sites) {
      if (seen.has(s.id)) continue;

      let state = s.state ?? s.addr?.state ?? null;
      let county = null;
      let countyFips = null;
      let boundaryRisk = false;

      if (Number.isFinite(s.lat) && Number.isFinite(s.lon)) {
        const hit = counties ? counties(s.lat, s.lon) : null;
        if (!hit) {
          // The Overpass bounding box necessarily includes Canada, Mexico and
          // the Caribbean. A point in no US county is not in the United States.
          // When the county index itself is dark we keep the site and say the
          // state is unresolved, rather than delete the map.
          if (counties) { droppedOutsideUS++; continue; }
        } else {
          state = hit.state;
          county = hit.county;
          countyFips = hit.county_fips;
          boundaryRisk = hit.boundary_risk;
        }
      }

      if (state && !STATE_NAMES[state]) state = null;

      seen.add(s.id);
      sites.push({
        ...s,
        state,
        state_name: state ? STATE_NAMES[state] : null,
        county,
        county_fips: countyFips,
        county_boundary_risk: boundaryRisk,
        sources: [r.id],
        first_seen_at: s.first_seen_at ?? nowIso,
      });
    }
  }

  // ---- the resource join --------------------------------------------------
  const drought = await droughtByCounty(
    net,
    sites.map((s) => s.county_fips).filter(Boolean),
    nowMs,
  );

  const gaugeIds = (infra.sources?.find((s) => s.id === 'usgs-water-deficit')?.meta?.gauges ?? [])
    .map((g) => g.site)
    .filter(Boolean);

  let gauges = [];
  let gaugeMeta = { id: 'usgs-gauge-sites', state: 'dark', error: 'not attempted', sites: 0 };
  if (gaugeIds.length) {
    try {
      const gc = await gaugeCoords(net, gaugeIds, parseRdb, cached, nowMs);
      gauges = gc.value.sites;
      gaugeMeta = {
        id: 'usgs-gauge-sites',
        label: 'USGS site service — coordinates for the nine /watts gauges',
        endpoint: 'https://waterservices.usgs.gov/nwis/site/',
        keyless: true,
        state: gc.origin === 'stale-cache' ? 'stale-cache' : 'live',
        origin: gc.origin,
        age_days: gc.age_days,
        error: gc.error,
        sites: gauges.length,
        refresh_days: 90,
      };
    } catch (err) {
      gaugeMeta.error = String(err?.message ?? err);
    }
  }

  const index = buildIndex({ infra, droughtMap: drought.byFips, gauges, grids: GRIDS });

  for (const s of sites) {
    const grid = gridFor({ state: s.state, county_fips: s.county_fips });
    s.grid = grid.id;
    s.resources = joinSite(s, { droughtMap: drought.byFips, gauges, grid });
    s.sentence = sentenceFor(s, index);
  }

  // ---- operator corroboration from EDGAR ----------------------------------
  const filers = byId.get('sec-operators')?.filers ?? [];
  let operatorMatches = 0;
  if (filers.length) {
    const norm = (x) => String(x ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    for (const s of sites) {
      if (!s.operator) continue;
      const op = norm(s.operator);
      if (op.length < 4) continue;
      const hit = filers.find((f) => {
        const fn = norm(f.name);
        return fn.startsWith(op) || op.startsWith(fn);
      });
      if (!hit) continue;
      operatorMatches++;
      s.evidence = [
        ...s.evidence,
        {
          kind: 'sec_operator',
          filer: hit.name,
          cik: hit.cik,
          filings_30d: hit.filings,
          forms: hit.forms,
          latest_filing: hit.latest,
          note: 'the operator filed documents mentioning "data centers"; this is about the company, not this site',
        },
      ];
      s.sources = [...s.sources, 'sec-operators'];
    }
  }

  sites.sort(bySiteOrder);

  // COMPACTION. A site keeps every field that carries information and drops the
  // ones that only say "not tagged". OpenStreetMap leaves most optional tags
  // empty, so an uncompacted file is largely a list of nulls — and this file is
  // committed, so those nulls are committed too, forever, on every refresh.
  //
  // What never drops: id, name, operator, status, lat, lon, state, county,
  // grid, evidence, confidence, resources. Those are the documented shape and a
  // consumer may rely on their presence even when the value is null.
  for (const s of sites) {
    for (const k of ['ref', 'website', 'start_date', 'operator_wikidata', 'osm', 'location_precision', 'first_seen_at', 'carried_from_ledger']) {
      if (s[k] === null || s[k] === undefined) delete s[k];
    }
    if (s.county_boundary_risk === false) delete s.county_boundary_risk;
    if (s.capacity && !Number.isFinite(s.capacity.it_power_mw) && !Number.isFinite(s.capacity.input_electricity_mw)) {
      delete s.capacity;
    } else if (s.capacity) {
      for (const k of Object.keys(s.capacity)) if (s.capacity[k] === null) delete s.capacity[k];
    }
    if (s.addr) {
      for (const k of Object.keys(s.addr)) if (s.addr[k] === null) delete s.addr[k];
      if (Object.keys(s.addr).length === 0) delete s.addr;
    }
    for (const e of s.evidence ?? []) {
      for (const k of Object.keys(e)) if (e[k] === null) delete e[k];
    }
    if (s.resources?.drought === null) delete s.resources.drought;
    if (s.resources?.streamflow === null) delete s.resources.streamflow;
  }

  // ---- counts -------------------------------------------------------------
  const byState = {};
  for (const s of sites) {
    const k = s.state ?? 'unresolved';
    byState[k] ??= { operating: 0, under_construction: 0, announced: 0, total: 0 };
    byState[k][s.status] = (byState[k][s.status] ?? 0) + 1;
    byState[k].total++;
  }

  const byStatus = Object.fromEntries(STATUSES.map((st) => [st, sites.filter((s) => s.status === st).length]));
  const withCapacity = sites.filter((s) => Number.isFinite(s.capacity?.it_power_mw)).length;
  const capacitySumMw = sites.reduce((a, s) => a + (s.capacity?.it_power_mw ?? 0), 0);

  const out = {
    schema: SCHEMA,
    generated_at: nowIso,
    feeds_main_index: false,
    sibling: '/watts — collector/infra.mjs; the grids, gauges and drought here are the same readings',
    infra_generated_at: infra.generated_at ?? null,

    counts: {
      sites: sites.length,
      by_status: byStatus,
      by_state: Object.fromEntries(Object.entries(byState).sort(([a], [b]) => a.localeCompare(b))),
      pinned: sites.filter((s) => Number.isFinite(s.lat)).length,
      state_only: sites.filter((s) => !Number.isFinite(s.lat) && s.state).length,
      with_capacity_tag: withCapacity,
      tagged_it_power_mw: round(capacitySumMw, 1),
      with_county_drought: sites.filter((s) => s.resources?.drought?.granularity === 'county').length,
      with_grid_reading: sites.filter((s) => index.grids[s.resources?.grid?.key]?.reading).length,
      with_local_gauge: sites.filter((s) => s.resources?.streamflow?.relevance === 'local').length,
      operator_sec_matches: operatorMatches,
      dropped_outside_us: droppedOutsideUS,
    },

    sources: [
      ...results.map((r) => ({
        id: r.id, label: r.label, endpoint: r.endpoint, keyless: r.keyless,
        gives: r.gives, state: r.state, origin: r.origin, ms: r.ms,
        error: r.error, meta: r.meta, sites: r.sites.length,
      })),
      countyMeta,
      gaugeMeta,
      {
        id: 'usdm-county',
        label: 'US Drought Monitor, county statistics',
        endpoint: 'https://usdmdataservices.unl.edu/api/CountyStatistics/GetDroughtSeverityStatisticsByAreaPercent',
        keyless: true,
        // "no counties asked for" is not an outage. Three states stay apart.
        state: drought.meta.counties_requested === 0 ? 'not-needed'
          : drought.meta.error ? 'degraded'
          : drought.byFips.size ? 'live' : 'dark',
        error: drought.meta.error,
        meta: drought.meta,
      },
    ],

    grid_table: GRID_TABLE_NOTE,
    resources_index: index,

    // ---- copy -------------------------------------------------------------
    // The words the page says. They live here, not in the template, for the
    // same reason the grid table does: the claims and the numbers that support
    // them are built together and must not drift apart.
    copy: {
      name: 'THE BUILD',
      question: 'Where are the datacentres, and what is the power and water around them doing?',
      standfirst:
        'Every datacentre OpenStreetMap has mapped in the United States, plus the ones it has ' +
        'mapped as under construction or proposed, joined to the drought in their county, the ' +
        'nearest river gauge /watts reads, and the grid they sit on.',
      // Printed third, above every pin, before a reader can form the wrong idea.
      // Same position and same job as the equivalent paragraph on /watts.
      the_claim_and_its_size:
        'Nothing here measures a datacentre’s power or water draw. No public feed publishes ' +
        'either, for any site, at any cadence. What is measured is where the buildings are and ' +
        'what the substrate around them is doing — which is a smaller claim, and a true one.',
      status_legend: {
        operating: 'a building that exists. Not a claim that servers are in it and running.',
        under_construction: 'tagged in OpenStreetMap as under construction — a hole in the ground and a crane.',
        announced: 'somebody said it is being built. Location is as precise as the evidence, and never more.',
      },
      confidence_legend: {
        high: 'named, with an operator, and carrying a capacity tag.',
        medium: 'named, with an operator.',
        low: 'a mapped polygon with no name or no operator, or a single unconfirmed announcement.',
      },
      // How to build the headline sentence under a pin. The stable half is in
      // site.sentence; the live half is in resources_index and moves every five
      // minutes, so it is composed at render time and never frozen into the file.
      sentence_recipe:
        'site.sentence, then — where resources_index.grids[site.resources.grid.key].reading exists — ' +
        '“, ” plus that reading’s value and unit, carrying its state tag (live, awaiting-baseline, dark) ' +
        'so a number awaiting its baseline is never printed as a scored one.',
      empty_state:
        'A state with no pins is a state nobody has mapped. It is not a state with no datacentres.',
    },

    // Copy the page says out loud. The honesty section is not a footnote.
    honesty: [
      'OpenStreetMap coverage is uneven and volunteer-maintained. A datacentre missing from this map means nobody mapped it, not that it does not exist.',
      `Capacity tags are rare: ${withCapacity} of ${sites.length} sites carry one.`,
      'Nothing here measures a datacentre’s power or water draw. No feed publishes that for any site at any cadence. What is measured is the condition of the substrate around it.',
      'Announced sites are announcements. Their location is the state that was named, never a surveyed address, and every one carries the document or news item it came from.',
      'Drought figures are the share of a county’s AREA in a category. A county 20% in D3 does not say which 20%, and the Drought Monitor is a weekly expert judgement, not an instrument reading.',
      'The nearest river gauge is one of the nine /watts reads. Each pin carries the distance to it, because a gauge 300 km away describes a different watershed.',
      'A balancing authority is not a state. ERCOT, NYISO and CAISO are assigned by state with named county exceptions; everything else carries the reason there is no keyless feed.',
      'Three states stay apart everywhere: a live reading, a reading awaiting its baseline, and a dark source. None of them is imputed into another.',
    ],

    sites,
  };

  mkdirSync('data', { recursive: true });
  writeFileSync(OUT, serialise(canonical(out)));

  // ---- the run report -----------------------------------------------------
  const line = (k, v) => console.log(`${String(k).padEnd(34)} ${v}`);
  console.log('\nDATACENTRES\n' + '='.repeat(70));
  line('sites', sites.length);
  for (const st of STATUSES) line(`  ${st}`, byStatus[st]);
  line('pinned (have coordinates)', out.counts.pinned);
  line('state only', out.counts.state_only);
  line('with county drought', out.counts.with_county_drought);
  line('with a live grid reading', out.counts.with_grid_reading);
  line('dropped: outside the US', droppedOutsideUS);
  console.log('-'.repeat(70));
  for (const r of out.sources) {
    const n = Number.isFinite(r.sites) ? `${r.sites} sites` : (r.counties ? `${r.counties} counties` : `${r.meta?.counties_returned ?? r.sites ?? ''}`);
    const tag = r.origin && r.origin !== 'network' ? `${r.state}/${r.origin}` : r.state;
    line(`${r.id} [${tag}]`, r.error ? `ERROR ${String(r.error).slice(0, 120)}` : n);
  }
  console.log('-'.repeat(70));
  console.log('BY STATE');
  for (const [st, c] of Object.entries(out.counts.by_state)) {
    console.log(`  ${st.padEnd(12)} total ${String(c.total).padStart(4)}   operating ${String(c.operating).padStart(4)}   under_construction ${String(c.under_construction).padStart(3)}   announced ${String(c.announced).padStart(3)}`);
  }
  console.log('-'.repeat(70));
  console.log('THREE JOINED EXAMPLES');
  // Prefer the pins where the join actually did something: a live grid number,
  // a county with a drought category in it, and a gauge close enough to mean
  // anything. Sorted by tagged capacity so the biggest such site leads.
  const scoreExample = (s) => {
    const g = index.grids[s.resources?.grid?.key];
    const d = index.drought_by_county[s.resources?.drought?.county_fips];
    return (
      (g?.reading ? 4 : 0) +
      (d?.headline && d.headline.category !== 'none' ? 3 : 0) +
      (s.resources?.streamflow?.relevance === 'local' ? 3 : s.resources?.streamflow?.relevance === 'regional' ? 2 : 0) +
      (Number.isFinite(s.capacity?.it_power_mw) ? 2 : 0) +
      (s.name ? 1 : 0)
    );
  };
  // One per state, so three examples are three places rather than three
  // buildings on the same business park.
  const ranked = sites
    .filter((s) => s.name)
    .sort((a, b) => scoreExample(b) - scoreExample(a) || (b.capacity?.it_power_mw ?? 0) - (a.capacity?.it_power_mw ?? 0));
  const examples = [];
  const usedStates = new Set();
  for (const s of ranked) {
    if (usedStates.has(s.state)) continue;
    usedStates.add(s.state);
    examples.push(s);
    if (examples.length === 3) break;
  }
  for (const s of examples) {
    const g = index.grids[s.resources?.grid?.key];
    const live = g?.reading ? ` — ${g.reading.label} ${g.reading.value} ${g.reading.unit ?? ''} [${g.reading.state}]` : '';
    console.log(`  • ${s.name}${s.operator && s.operator !== s.name ? ` (${s.operator})` : ''}`);
    console.log(`      ${s.sentence}${live}`);
  }
  console.log(`\nwrote ${OUT}\n`);
}

await main();
