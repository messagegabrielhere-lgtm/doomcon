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
import { gridFor, GRID_TABLE_NOTE } from './dc-sources/_grid.mjs';
import { bySiteOrder, canonical, round, STATE_NAMES } from './dc-sources/_util.mjs';
import osmOverpass from './dc-sources/osm-overpass.mjs';
import newsAnnouncements from './dc-sources/news-announcements.mjs';
import fedregProjects from './dc-sources/fedreg-projects.mjs';
import secOperators from './dc-sources/sec-operators.mjs';
import {
  readInfra, droughtByCounty, gaugeCoords, joinSite, sentenceFor,
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

  for (const s of sites) {
    const grid = gridFor({ state: s.state, county_fips: s.county_fips });
    s.grid = grid.id;
    s.resources = joinSite(s, { infra, droughtMap: drought.byFips, gauges, grid });
    s.sentence = sentenceFor(s);
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
      with_grid_reading: sites.filter((s) => s.resources?.grid?.reading).length,
      operator_sec_matches: operatorMatches,
      dropped_outside_us: droppedOutsideUS,
    },

    sources: [
      ...results.map((r) => ({
        id: r.id, label: r.label, endpoint: r.endpoint, keyless: r.keyless,
        gives: r.gives, state: r.state, ms: r.ms, error: r.error, meta: r.meta,
        sites: r.sites.length,
      })),
      countyMeta,
      gaugeMeta,
      {
        id: 'usdm-county',
        label: 'US Drought Monitor, county statistics',
        endpoint: 'https://usdmdataservices.unl.edu/api/CountyStatistics/GetDroughtSeverityStatisticsByAreaPercent',
        keyless: true,
        state: drought.meta.error ? 'degraded' : drought.byFips.size ? 'live' : 'dark',
        error: drought.meta.error,
        meta: drought.meta,
      },
    ],

    grid_table: GRID_TABLE_NOTE,

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
  writeFileSync(OUT, `${JSON.stringify(canonical(out), null, 2)}\n`);

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
    line(`${r.id} [${r.state}]`, r.error ? `ERROR ${String(r.error).slice(0, 90)}` : (r.meta?.note ? '' : ''));
  }
  console.log('-'.repeat(70));
  console.log('BY STATE');
  for (const [st, c] of Object.entries(out.counts.by_state)) {
    console.log(`  ${st.padEnd(12)} total ${String(c.total).padStart(4)}   operating ${String(c.operating).padStart(4)}   under_construction ${String(c.under_construction).padStart(3)}   announced ${String(c.announced).padStart(3)}`);
  }
  console.log('-'.repeat(70));
  console.log('THREE JOINED EXAMPLES');
  const examples = sites
    .filter((s) => s.resources?.grid?.reading && s.resources?.drought && s.name)
    .sort((a, b) => (b.capacity?.it_power_mw ?? 0) - (a.capacity?.it_power_mw ?? 0))
    .slice(0, 3);
  for (const s of examples) console.log(`  • ${s.name} — ${s.sentence}`);
  console.log(`\nwrote ${OUT}\n`);
}

await main();
