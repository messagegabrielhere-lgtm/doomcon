// Every datacentre-tagged object in OpenStreetMap, worldwide, in one request.
//
// osm-overpass.mjs asks Overpass for the United States in three bounding
// boxes because that is what /map needs. The world does NOT need tiling: a
// tag-value lookup with no bbox hits Overpass's index and touches almost
// nothing, and the Overpass commons document names "stitching bounding boxes
// to scrape the full world" as the anti-pattern. Measured 2026-09-25 against
// overpass-api.de: the query below, unioning sixteen tag variants, answered
// HTTP 200 in 66 s with 1.86 MB and 5,270 elements over 103 countries, every
// one carrying a usable coordinate from `out center`.
//
// WHY SIXTEEN VARIANTS. The seven the US adapter asks for miss 270 real sites
// (5.1%), 244 of them `industrial=data_centre` - the Commonwealth spelling
// lives there - while `landuse=data_center` has zero objects on the planet.
// Read from taginfo, not guessed. Order is fixed so the query string, which
// is published in the output, is byte-identical every run.
//
// ONE REQUEST A WEEK. collector/world.mjs caches this for REFRESH_DAYS. The
// request goes through osm-flock.mjs's slot-aware, mirror-walking `ask`, so a
// busy instance is waited for rather than hammered. A 504 - the main instance
// was returning them for planet queries on 2026-09-27 - falls through to the
// mirrors and then to the stale cache, and the output says which.

import { overpassAsk } from './osm-flock.mjs';
import { round } from './_util.mjs';

export const CACHE_KEY = 'osm-datacenters-world';
export const REFRESH_DAYS = 7;

export const TAG_VARIANTS = Object.freeze([
  ['telecom', 'data_center'],
  ['telecom', 'data_centre'],
  ['building', 'data_center'],
  ['building:use', 'data_center'],
  ['industrial', 'data_centre'],
  ['industrial', 'data_center'],
  ['industrial', 'datacenter'],
  ['man_made', 'data_center'],
  ['construction:telecom', 'data_center'],
  ['construction', 'data_center'],
  ['construction', 'datacenter'],
  ['construction', 'data_centre'],
  ['proposed:telecom', 'data_center'],
  ['proposed:building', 'data_center'],
  ['planned:telecom', 'data_center'],
  ['planned:industrial', 'datacenter'],
]);

export function buildQuery() {
  const body = TAG_VARIANTS.map(([k, v]) => `  nwr["${k}"="${v}"];`).join('\n');
  return `[out:json][timeout:600];\n(\n${body}\n);\nout tags center qt;`;
}

/**
 * Status from the tags, the same three words /map uses and the same reading:
 * a construction tag is a hole in the ground, a proposed or planned tag is an
 * announcement, anything else carrying a datacentre tag is a building that
 * exists. The tag that decided it is kept beside the verdict.
 */
export function statusOf(tags) {
  const uc = ['construction:telecom', 'construction'];
  for (const k of uc) {
    const v = tags[k];
    if (v === 'data_center' || v === 'datacenter' || v === 'data_centre') return { status: 'under_construction', because: `${k}=${v}` };
  }
  if (tags.building === 'construction' && tags['construction:telecom']) {
    return { status: 'under_construction', because: `building=construction + construction:telecom=${tags['construction:telecom']}` };
  }
  const ann = ['proposed:telecom', 'proposed:building', 'planned:telecom', 'planned:industrial'];
  for (const k of ann) if (tags[k]) return { status: 'announced', because: `${k}=${tags[k]}` };
  return { status: 'operating', because: 'a datacentre tag with no construction, proposed or planned qualifier' };
}

/** One Overpass element -> one reduced record, or null when it has no usable
 *  position (ways and relations get one from `out center`). */
export function reduceElement(el) {
  const p = el.type === 'node' ? el : el.center;
  if (!p || !Number.isFinite(p.lat) || !Number.isFinite(p.lon)) return null;
  const tags = el.tags ?? {};
  const matched = TAG_VARIANTS.filter(([k, v]) => tags[k] === v).map(([k, v]) => `${k}=${v}`);
  if (!matched.length) return null;
  const { status, because } = statusOf(tags);
  const country = typeof tags['addr:country'] === 'string' && /^[A-Za-z]{2}$/.test(tags['addr:country'])
    ? tags['addr:country'].toUpperCase() : null;
  return {
    ref: `${el.type}/${el.id}`,
    lat: round(p.lat, 5),
    lon: round(p.lon, 5),
    status,
    because,
    matched,
    name: tags.name ?? tags['name:en'] ?? null,
    operator: tags.operator ?? tags.brand ?? null,
    addr_country: country,
    addr_city: tags['addr:city'] ?? null,
    url: `https://www.openstreetmap.org/${el.type}/${el.id}`,
  };
}

/** Everything the run needs to know about what came back, for the output. */
export function reduceResponse(json, extra = {}) {
  const sites = new Map();
  let noPosition = 0;
  let untagged = 0;
  for (const el of json.elements ?? []) {
    const rec = reduceElement(el);
    if (!rec) { if (!(el.tags && Object.keys(el.tags).length)) untagged += 1; else noPosition += 1; continue; }
    if (!sites.has(rec.ref)) sites.set(rec.ref, rec);
  }
  return {
    sites: [...sites.values()].sort((a, b) => a.ref.localeCompare(b.ref)),
    elements: (json.elements ?? []).length,
    dropped_without_position: noPosition,
    dropped_untagged: untagged,
    osm_timestamp: json.osm3s?.timestamp_osm_base ?? null,
    query_template: buildQuery(),
    ...extra,
  };
}

export async function harvest(net, { log = () => {} } = {}) {
  const r = await overpassAsk(net, buildQuery(), { label: 'world datacentres', log });
  return reduceResponse(r.json, {
    endpoint: r.endpoint ?? null,
    bytes: r.bytes ?? null,
    slot_wait_ms: r.slotWaitMs ?? 0,
  });
}

export default { id: 'osm-world', label: 'OpenStreetMap via Overpass, worldwide', harvest, buildQuery, TAG_VARIANTS };
