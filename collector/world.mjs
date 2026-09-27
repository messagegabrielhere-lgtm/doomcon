// Every datacentre on Earth, as OpenStreetMap has it, attributed to a country.
//
// A sibling of collector/datacenters.mjs, not a replacement. /map is the
// United States joined to the water and the grid under each site - county,
// drought, balancing authority, river gauge - and none of those joins exist
// outside the US. This file answers a different, simpler question for the
// whole planet: where has anybody mapped a datacentre, what state does the
// tag say it is in, and in which country. It never touches the US pipeline.
//
// THE HONESTY BAR, same as /flock. Every number here counts map OBJECTS carrying
// a datacentre tag on the day OSM was read. It is not a count of datacentres
// that exist. A country with none mapped is a country nobody has mapped. The
// United States figure here will not equal /map's, and the page says why: /map
// keeps only sites it can place in a county and joins them to more data.
//
// Usage:
//   node collector/world.mjs                       # cached harvest if fresh (7 days), else Overpass
//   node collector/world.mjs --refresh             # ignore the cache age
//   node collector/world.mjs --raw path.json       # develop against a saved Overpass response
//
// Pipeline: harvest (one query, cached) -> country attribution (Natural Earth
// 50m, cached 90 days) -> aggregates -> data/world.json. Fails closed: a
// harvest under the sanity floor, or no country index at all, writes nothing.

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fetchJson, fetchText } from './fetch.mjs';
import { cached } from './dc-sources/_cache.mjs';
import { countryIndex } from './dc-sources/_country.mjs';
import { harvest, reduceResponse, CACHE_KEY, REFRESH_DAYS, TAG_VARIANTS, buildQuery } from './dc-sources/osm-world.mjs';
import { canonical } from './dc-sources/_util.mjs';

const OUT = 'data/world.json';
const SCHEMA = 1;

// CONTRACT.md §1.5: every network call goes through collector/fetch.mjs.
const net = {
  json: (url, opts) => fetchJson(url, opts),
  text: (url, opts) => fetchText(url, opts),
};

// Measured 5,270 elements worldwide on 2026-09-25. A run that returns a third
// of that is a broken query or a struggling server, not a planet that emptied
// out, and the previous file is the honest thing to keep.
const SANITY_FLOOR = 3_000;

function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : (process.argv[i + 1] ?? '');
}
const hasFlag = (name) => process.argv.includes(name);
const log = (line) => console.log(line);

/** Pretty everything except `sites`, which is one object per line: a 5,000-row
 *  array pretty-printed is 60,000 lines and a diff nobody can read. */
function serialise(doc) {
  const { sites, ...rest } = doc;
  const head = JSON.stringify(canonical(rest), null, 2);
  const rows = sites.map((s) => `    ${JSON.stringify(canonical(s))}`).join(',\n');
  // Insert `sites` as the last key. `rest` was canonical (sorted), and "sites"
  // sorts after every other key used here, so appending keeps the order canonical.
  return `${head.slice(0, -2)},\n  "sites": [\n${rows}\n  ]\n}\n`;
}

async function main() {
  const nowMs = Date.now();
  const generatedAt = new Date(nowMs).toISOString();

  // ---- harvest -------------------------------------------------------------
  let h;
  let harvestOrigin;
  const raw = arg('--raw');
  if (raw) {
    log(`harvest: reducing saved Overpass response ${raw} (development path; nothing is fetched)`);
    h = reduceResponse(JSON.parse(readFileSync(raw, 'utf8')), { endpoint: `file:${raw}`, bytes: null, slot_wait_ms: 0 });
    harvestOrigin = 'file';
  } else {
    log(`harvest: one planet-wide Overpass query, ${TAG_VARIANTS.length} tag variants, cached ${REFRESH_DAYS} days`);
    const r = await cached(CACHE_KEY, {
      maxAgeDays: hasFlag('--refresh') ? 0 : REFRESH_DAYS,
      nowMs,
      load: () => harvest(net, { log }),
    });
    h = r.value;
    harvestOrigin = r.origin;
    log(`harvest: ${r.origin}${r.age_days ? ` (${r.age_days} days old)` : ''}${r.error ? ` - ${r.error}` : ''}`);
  }
  log(`harvest: ${h.sites.length} sites from ${h.elements} elements; OSM base ${h.osm_timestamp ?? 'unknown'}`);

  if (h.sites.length < SANITY_FLOOR) {
    console.error(`\nRefusing to publish: ${h.sites.length} sites is below the sanity floor of ${SANITY_FLOOR}.`);
    console.error('The query measured 5,270 elements worldwide on 2026-09-25. A collapse like that is a');
    console.error('query fault, not a finding. Nothing written.\n');
    process.exitCode = 1;
    return;
  }

  // ---- countries -----------------------------------------------------------
  let ci;
  try {
    ci = await countryIndex(net, nowMs);
  } catch (err) {
    console.error(`\nRefusing to build: no country outline (${String(err?.message ?? err)}). Every site`);
    console.error('would be "unresolved", which is a map with no legend. Nothing written.\n');
    process.exitCode = 1;
    return;
  }
  log(`countries: ${ci.meta.countries} polygons, ${ci.meta.origin}${ci.meta.error ? ` - ${ci.meta.error}` : ''}`);

  const byIso = new Map();
  for (const c of ci.countries) if (c.iso2 && !byIso.has(c.iso2)) byIso.set(c.iso2, c);

  let resolvedByPolygon = 0;
  let resolvedByTag = 0;
  let unresolved = 0;
  let boundaryRisk = 0;
  const sites = h.sites.map((s) => {
    const hit = ci.lookup(s.lat, s.lon);
    let country = null;
    let via = null;
    if (hit && hit.iso2) {
      country = hit.iso2; via = 'polygon'; resolvedByPolygon += 1;
      if (hit.boundary_risk) boundaryRisk += 1;
    } else if (s.addr_country && byIso.has(s.addr_country)) {
      country = s.addr_country; via = 'addr:country'; resolvedByTag += 1;
    } else {
      unresolved += 1;
    }
    const c = country ? byIso.get(country) : null;
    return {
      id: s.ref,
      lat: s.lat,
      lon: s.lon,
      status: s.status,
      because: s.because,
      name: s.name,
      operator: s.operator,
      city: s.addr_city,
      country,
      country_name: c ? c.name : null,
      continent: c ? c.continent : null,
      attributed_by: via,
      boundary_risk: Boolean(hit && hit.boundary_risk),
      tag_disagrees: Boolean(via === 'polygon' && s.addr_country && s.addr_country !== country),
      url: s.url,
    };
  });

  // ---- aggregates ----------------------------------------------------------
  const STATUSES = ['operating', 'under_construction', 'announced'];
  const byStatus = Object.fromEntries(STATUSES.map((k) => [k, 0]));
  const rows = new Map();
  for (const s of sites) {
    byStatus[s.status] += 1;
    const key = s.country ?? 'unresolved';
    if (!rows.has(key)) {
      const c = s.country ? byIso.get(s.country) : null;
      rows.set(key, {
        iso2: s.country, name: c ? c.name : 'Not inside any country polygon', continent: c ? c.continent : null,
        subregion: c ? c.subregion : null, total: 0, operating: 0, under_construction: 0, announced: 0, boundary_risk: 0,
      });
    }
    const r = rows.get(key);
    r.total += 1; r[s.status] += 1; if (s.boundary_risk) r.boundary_risk += 1;
  }
  const countries = [...rows.values()]
    .filter((r) => r.iso2)
    .sort((a, b) => b.total - a.total || String(a.name).localeCompare(String(b.name)));
  const countriesWithNone = ci.countries.filter((c) => c.iso2 && !rows.has(c.iso2)).length;
  const byContinent = {};
  for (const r of countries) byContinent[r.continent ?? 'unknown'] = (byContinent[r.continent ?? 'unknown'] ?? 0) + r.total;
  const us = rows.get('US');
  const asOf = h.osm_timestamp ? String(h.osm_timestamp).slice(0, 10) : generatedAt.slice(0, 10);

  const doc = {
    schema: SCHEMA,
    generated_at: generatedAt,
    as_of_date: asOf,
    source: {
      id: 'osm-world',
      label: 'OpenStreetMap via Overpass, worldwide',
      endpoint: h.endpoint ?? null,
      osm_timestamp: h.osm_timestamp ?? null,
      harvest_origin: harvestOrigin,
      refresh_days: REFRESH_DAYS,
      keyless: true,
      licence: { data: 'Open Database License (ODbL) v1.0', url: 'https://www.openstreetmap.org/copyright' },
      tag_variants: TAG_VARIANTS.map(([k, v]) => `${k}=${v}`),
      query_template: buildQuery(),
      elements_received: h.elements,
      dropped_without_position: h.dropped_without_position,
      dropped_untagged: h.dropped_untagged,
      bytes: h.bytes ?? null,
    },
    geography: ci.meta,
    totals: {
      sites: sites.length,
      by_status: byStatus,
      countries_with_sites: countries.length,
      countries_with_none: countriesWithNone,
      countries_in_roster: ci.countries.filter((c) => c.iso2).length,
      by_continent: byContinent,
      attributed_by_polygon: resolvedByPolygon,
      attributed_by_tag: resolvedByTag,
      unresolved,
      near_a_border: boundaryRisk,
      in_united_states: us ? us.total : 0,
    },
    countries,
    copy: {
      headline_qualifier: `as mapped in OpenStreetMap on ${asOf}`,
      attribution_required: '© OpenStreetMap contributors',
      attribution_url: 'https://www.openstreetmap.org/copyright',
      outline_credit: 'Made with Natural Earth. Free vector and raster map data @ naturalearthdata.com.',
      what_zero_means:
        'A country with no mapped datacentre is a country nobody has mapped. It is not a country with no datacentres, and this data cannot tell those two apart.',
      never_say: 'the number of datacentres in the world',
    },
    honesty: [
      `Every figure counts map objects carrying a datacentre tag in OpenStreetMap on ${asOf}. It is not a count of datacentres that exist.`,
      'Status is read from the tags: a construction tag is under construction, a proposed or planned tag is announced, anything else with a datacentre tag is operating. A tag that has not been updated since a building opened is still "under construction" here.',
      `Countries are assigned by point-in-polygon against Natural Earth 1:50m outlines, generalised to about 1 km. ${boundaryRisk} sites sit within about 2 km of a border and could belong to the neighbour. ${unresolved} sites fall in no polygon and are published as unresolved rather than guessed.`,
      'Coverage follows volunteers, not deployments. A dense country is a country somebody mapped; a blank one may simply not have been mapped.',
      'The United States figure here differs from /map, which keeps only the sites it can place in a county and joins them to drought, grid and river data. This page joins nothing; it counts.',
      `${h.dropped_without_position} elements arrived without a usable coordinate and were dropped; ${h.dropped_untagged} carried no tags.`,
    ],
    sites,
  };

  mkdirSync('data', { recursive: true });
  writeFileSync(OUT, serialise(doc));
  log('-'.repeat(78));
  log(`wrote ${OUT}: ${sites.length} sites in ${countries.length} countries (${countriesWithNone} with none mapped); ` +
    `${byStatus.operating} operating, ${byStatus.under_construction} under construction, ${byStatus.announced} announced; ` +
    `${unresolved} unresolved`);
}

main().catch((err) => {
  console.error(`world: ${err?.stack ?? err}`);
  process.exitCode = 1;
});
