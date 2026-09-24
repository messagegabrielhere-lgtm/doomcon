// The existing half of the map: datacentres that are already on the ground.
//
// THE UNLOCK, VERIFIED 2026-09-24. OpenStreetMap tags datacentres and the
// Overpass API serves them free and keyless. Measured over a bounding box
// covering the United States:
//
//   telecom=data_center              1,921 elements  (160 nodes, 1,749 ways, 12 relations)
//   construction:telecom=data_center    50 elements
//   telecom=data_centre                  0 elements  (the British spelling is not used)
//   man_made=data_center                 1 element   (a tagging mistake, included anyway)
//
// building=data_center and landuse=data_center were rate-limited before they
// could be counted separately; they are in the union below and their yield is
// reported in the output.
//
// BEING A GOOD CITIZEN, WHICH IS NOT OPTIONAL. Overpass is run on donated
// hardware for everybody. Eleven small counting probes inside four minutes was
// enough to earn a 429 and two 504s from overpass-api.de during development.
// So: ONE query per refresh, all tag variants unioned into it, a generous
// server-side timeout, the project's own User-Agent so an operator we annoy can
// find us, the result written to disk, and a refresh interval of SEVEN DAYS.
// Datacentres do not move. Nothing is lost by asking weekly and a shared public
// resource is not burned.
//
// WHAT COMES BACK AND WHAT DOES NOT. `out tags center` gives tags plus one
// representative coordinate per element. Full geometry — which would let us
// compute a footprint area, the most useful missing field here — costs roughly
// an order of magnitude more payload and materially raises the chance the query
// times out on a busy server. The trade was made in favour of the query
// completing. Area is therefore absent, and docs/DATACENTERS.md says so.

import { cached } from './_cache.mjs';
import { parseMegawatts, stableId } from './_util.mjs';

export const ENDPOINT = 'https://overpass-api.de/api/interpreter';
export const CACHE_KEY = 'osm-datacenters';
export const REFRESH_DAYS = 7;

// Latitude 15 to 72, longitude -180 to -64: the whole United States including
// Alaska and Hawaii, and unavoidably a lot of Canada, Mexico and the Caribbean.
// _geo.mjs drops everything that is not inside a US county, so the box only has
// to be big enough, not tight.
const BBOX = '15.0,-180.0,72.0,-64.0';

// Every key/value pair worth asking for, in one union. The order is the order
// the query is written in, so the query string is stable across runs.
const TAG_VARIANTS = Object.freeze([
  ['telecom', 'data_center'],
  ['building', 'data_center'],
  ['landuse', 'data_center'],
  ['man_made', 'data_center'],
  ['construction:telecom', 'data_center'],
  ['proposed:telecom', 'data_center'],
  ['construction', 'data_center'],
  ['proposed:building', 'data_center'],
]);

export function buildQuery() {
  const body = TAG_VARIANTS.map(([k, v]) => `  nwr["${k}"="${v}"](${BBOX});`).join('\n');
  return `[out:json][timeout:540];\n(\n${body}\n);\nout tags center qt;`;
}

async function loadOverpass(net) {
  const data = buildQuery();
  // GET, not POST. collector/fetch.mjs does not forward a request body — every
  // other source in this repo is a GET — and CONTRACT.md §1.5 forbids calling
  // global fetch() around it. Overpass accepts the same query as ?data=, and a
  // 700-character URL is well inside every limit in the chain.
  const url = `${ENDPOINT}?${new URLSearchParams({ data })}`;
  const body = await net.text(url, {
    // Overpass queues behind other people's queries; the server-side timeout is
    // 540s and the client has to outlast it or every busy minute looks like a
    // network fault.
    timeoutMs: 600_000,
    retries: 0, // a retry against a queue is how a slow query becomes a ban
  });

  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    // Overpass answers its own errors as XHTML with a 200 or a 504. Quote it.
    throw new Error(`overpass: non-JSON answer — ${body.replace(/\s+/g, ' ').slice(0, 300)}`);
  }
  if (!Array.isArray(parsed?.elements)) {
    throw new Error(`overpass: no elements array (keys: ${Object.keys(parsed ?? {}).join(',') || 'none'})`);
  }
  // A query that succeeds and returns nothing is not a country with no
  // datacentres, it is a broken query. Refuse it rather than publish an empty map.
  if (parsed.elements.length < 100) {
    throw new Error(
      `overpass: only ${parsed.elements.length} elements for the whole United States; ` +
        'the last measured count was 1,921 and a collapse like that is a query fault, not a finding',
    );
  }
  return {
    fetched_at: new Date().toISOString(),
    query: data,
    elements: parsed.elements,
  };
}

/**
 * OSM's status vocabulary, collapsed into the three this dataset publishes.
 *
 * `building=construction` with `construction:telecom=data_center`, or a bare
 * `construction=data_center`, is a site with a hole in the ground and a crane —
 * under_construction. `proposed:*` is announced. Everything else that carries a
 * datacentre tag is a building that exists, which is operating.
 *
 * WHAT THIS CANNOT SEE. OSM records what a mapper saw, and "operating" here
 * means "the building is there", not "there are servers in it and they are on".
 * A decommissioned datacentre keeps its tag until somebody visits.
 */
function statusOf(tags) {
  if (Object.keys(tags).some((k) => k.startsWith('proposed:'))) return 'announced';
  if (tags.construction === 'data_center') return 'under_construction';
  if (tags['construction:telecom'] === 'data_center') return 'under_construction';
  if (tags.building === 'construction') return 'under_construction';
  if (tags.landuse === 'construction') return 'under_construction';
  return 'operating';
}

/** The tag that matched, for the evidence trail. First match in TAG_VARIANTS order. */
function matchedTag(tags) {
  for (const [k, v] of TAG_VARIANTS) if (tags[k] === v) return `${k}=${v}`;
  return null;
}

export default {
  id: 'osm-overpass',
  label: 'OpenStreetMap datacentre tags, via Overpass',
  endpoint: ENDPOINT,
  keyless: true,
  refresh_days: REFRESH_DAYS,
  gives: 'operating and under-construction sites, with surveyed coordinates',

  async collect(net, { nowMs }) {
    const r = await cached(CACHE_KEY, { maxAgeDays: REFRESH_DAYS, nowMs, load: () => loadOverpass(net) });

    const byVariant = {};
    const sites = [];

    for (const el of r.value.elements) {
      const tags = el?.tags ?? {};
      const lat = el.type === 'node' ? el.lat : el.center?.lat;
      const lon = el.type === 'node' ? el.lon : el.center?.lon;
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

      const tag = matchedTag(tags);
      if (!tag) continue; // a member dragged in by nothing we asked for
      byVariant[tag] = (byVariant[tag] ?? 0) + 1;

      const osmRef = `${el.type}/${el.id}`;
      const status = statusOf(tags);
      const itMw = parseMegawatts(tags.it_power);
      const inMw = parseMegawatts(tags['input:electricity']);

      sites.push({
        // Keyed on the OSM object, so the same building keeps the same id for
        // as long as it keeps the same OSM id — which is how a pin can be
        // linked to and how a diff between two runs means something.
        id: stableId('dc', 'osm', osmRef),
        name: tags.name ?? tags['addr:housename'] ?? null,
        operator: tags.operator ?? tags.owner ?? tags.brand ?? null,
        operator_wikidata: tags['operator:wikidata'] ?? null,
        status,
        lat,
        lon,
        location_precision: el.type === 'node' ? 'point' : 'building_centroid',
        ref: tags.ref ?? null,
        website: tags.website ?? null,
        start_date: tags.start_date ?? null,
        osm: osmRef,
        capacity: {
          it_power_mw: itMw,
          input_electricity_mw: inMw,
          it_power_raw: tags.it_power ?? null,
          input_electricity_raw: tags['input:electricity'] ?? null,
        },
        addr: {
          city: tags['addr:city'] ?? null,
          state: tags['addr:state'] ?? null,
          postcode: tags['addr:postcode'] ?? null,
        },
        evidence: [
          {
            kind: 'osm',
            tag,
            ref: osmRef,
            url: `https://www.openstreetmap.org/${el.type}/${el.id}`,
            // OSM has no per-object "last surveyed" in a tags-only response.
            // check_date is the closest thing and most objects do not carry it.
            checked: tags.check_date ?? null,
          },
        ],
        // Named + operator + a capacity tag is as good as volunteer mapping
        // gets. A bare unnamed polygon somebody drew from an aerial photograph
        // is real but is not the same claim.
        confidence:
          tags.name && tags.operator && (itMw || inMw) ? 'high'
          : tags.name && tags.operator ? 'medium'
          : 'low',
      });
    }

    return {
      sites,
      meta: {
        origin: r.origin,
        age_days: r.age_days,
        error: r.error,
        fetched_at: r.value.fetched_at,
        elements: r.value.elements.length,
        sites: sites.length,
        by_tag: byVariant,
        bbox: BBOX,
        refresh_days: REFRESH_DAYS,
        note:
          'OpenStreetMap coverage is uneven and volunteer-maintained. A datacentre missing ' +
          'from this layer means nobody mapped it, not that it does not exist.',
      },
    };
  },
};
