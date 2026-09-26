// Flock Safety automated licence-plate readers, as mapped in OpenStreetMap.
//
// WHAT THIS IS. Flock Safety builds fixed automated licence-plate-reader (ALPR)
// cameras that police departments, sheriffs' offices and homeowners'
// associations deploy on public roads. OpenStreetMap contributors — largely the
// crowdsourced DeFlock effort — tag them. This adapter reads those tags off the
// Overpass API and hands collector/flock.mjs a reduced record per camera.
//
// It is on-theme for this site because ALPR is applied computer vision: a
// camera, a model, and a plate string. It is AI pointed at the street.
//
// WHAT IT IS NOT, and this governs every number downstream: it is not a census
// of Flock cameras. It is a census of Flock cameras SOMEBODY HAS MAPPED. Those
// are different quantities and the page must never print the second as the
// first. See docs/FLOCK.md.
//
// ---------------------------------------------------------------------------
// MEASURED AGAINST THE LIVE API, 2026-09-26. These are why the code is shaped
// the way it is; do not re-derive them casually, each probe costs a stranger's
// CPU.
//
//   man_made=surveillance + surveillance:type=ALPR, worldwide .... 153,603
//   + manufacturer="Flock Safety" ................................ 113,193
//   + brand="Flock Safety" .......................................   6,425
//   + operator="Flock Safety" ....................................   2,273
//   UNION of the three, worldwide ................................ 115,607
//   UNION inside a North America box (5,-172,72,-50) ............. 115,570
//   Measured payload density .....................................     367 B/element
//   Implied full-US payload ......................................     ~42 MB
//
// Inside a Georgia box (30.3,-85.7,35.1,-80.8) the three tags split
// 11,045 / 187 / 296. So `manufacturer` dominates but does not cover the set,
// and the union is not optional.
//
// HOW BIG A TILE ACTUALLY WORKS, measured rather than guessed. A 10° x 15° box
// over the south-east (30,-90,40,-75) returned 34,656 elements and 12.9 MB in
// 50 seconds, in one request. That is the real ceiling, and it is far higher
// than the first estimate, and it is why the seed grid below is as coarse as
// it is. LARGE_TILE_ELEMENTS is only a reporting threshold, not a limit.
//
// An unbounded (no-bbox) count took 110 s; the same count inside a North
// America box took 9.5 s; a data fetch over the 230°-wide box covering Europe,
// Asia, Africa and Oceania took 4.4 s because almost nothing is in it.
// Bounding is not only about payload, it is about the index the server can
// use — so everything here is bounded, including the four boxes that cover the
// rest of the planet.
//
// ---------------------------------------------------------------------------
// THE TILING, AND WHY IT IS SHAPED LIKE THIS
//
// Three ideas, in order of how much they save:
//
//  1. SEED, don't recurse from the top. A quadtree rooted on a box big enough
//     to hold North America spends its first four levels discovering that the
//     Pacific is empty. The seeds below start at roughly the size that already
//     fits in one request, so the common case is one request per tile and no
//     recursion at all.
//
//  2. DON'T LIMIT THE OUTPUT, SO THERE IS NOTHING TO TRUNCATE. `out … N` can
//     silently return a partial tile, and detecting that needs either a
//     separate count query per tile or a wasted download. Without a limit
//     Overpass either returns the whole bbox or fails loudly — so a successful
//     fetch is always complete and is always kept, and the count query per
//     tile disappears. That halves the request count, which is the thing this
//     harvest is actually rate-limited on.
//
//     One count IS issued per seed box, as a cross-check: the seed's own total
//     against the number of distinct cameras collected from its tiles. A
//     shortfall means the harvest is incomplete and it refuses to publish.
//
//  3. SPLIT ADAPTIVELY. Density here spans four orders of magnitude between
//     Fulton County and rural Nevada, so no fixed cell size is right. A tile
//     over the limit is quartered and each quarter counted; a tile that ERRORS
//     is also quartered, because the most likely reason a tile errors is that
//     it was too big. An empty tile costs one count and then nothing, which is
//     what prunes the oceans.
//
// POLITENESS. collector/fetch.mjs holds overpass-api.de to one request every
// 5,000 ms, process-wide. That gate is not negotiable and this adapter does not
// route around it: mirrors are a last resort per tile, not a way to go faster.
// The refresh interval is SEVEN DAYS, because these cameras are bolted to poles.
//
// LICENCE. OpenStreetMap data is ODbL. Attribution is a condition of use, not a
// courtesy: any page built on this must carry "© OpenStreetMap contributors"
// and link https://www.openstreetmap.org/copyright.

import { setTimeout as sleep } from 'node:timers/promises';

export const ENDPOINTS = Object.freeze([
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]);
export const ENDPOINT = ENDPOINTS[0];
export const REFRESH_DAYS = 7;

/** The two tags that say "this is an ALPR camera". Both required, always. */
export const BASE_FILTER = Object.freeze([
  ['man_made', 'surveillance'],
  ['surveillance:type', 'ALPR'],
]);

/**
 * The three tags that say "…and it is a Flock". Unioned, never OR-ed inside one
 * filter — Overpass has no disjunction across different keys, so this is three
 * statements in a union block. Order is fixed so the query string is stable.
 */
export const FLOCK_TAGS = Object.freeze(['manufacturer', 'brand', 'operator']);
export const FLOCK_VALUE = 'Flock Safety';

// Purely informational. A tile above this is fine — 34,656 elements in one
// request is measured and worked — but it says the seed grid is coarse there,
// which is worth seeing in the run report rather than discovering later.
export const LARGE_TILE_ELEMENTS = 25_000;

// A guard, not a plan. 10 quarterings of the smallest seed is ~0.006°, about
// 600 m. If a box that small still overflows, the world is wrong, not the code:
// the tile is fetched anyway and flagged in the output rather than recursed on.
const MAX_DEPTH = 10;

// Overpass's own server-side budget, and a client timeout that outlasts it. A
// busy Overpass queues; a client that gives up first turns every busy minute
// into a network fault and throws away work it could have waited for.
const SERVER_TIMEOUT_S = 600;
const CLIENT_TIMEOUT_MS = 660_000;

// Attempts per endpoint before the tile moves to the next one.
const TILE_ATTEMPTS = 4;
const MIRROR_BACKOFF_MS = 8_000;

// ---------------------------------------------------------------------------
// SLOTS, which are the thing that actually rate-limits this harvest.
//
// The 5,000 ms gate in collector/fetch.mjs is necessary and is not sufficient.
// Overpass allocates each IP a small number of execution SLOTS — two, on the
// main instance — and holds a slot for a cooldown after a query finishes. A
// serial client issuing fast queries five seconds apart still runs out, and
// the first real run of this collector earned an HTTP 429 on its fifth tile.
//
// Backing off blindly after a 429 is the wrong answer twice over: it guesses
// at a number the server is willing to state, and retrying a rate limit is how
// a client turns a throttle into a ban. Overpass publishes /api/status:
//
//   Rate limit: 2
//   1 slots available now.
//   Slot available after: 2026-09-26T03:21:19Z, in 1 seconds.
//
// So we ask, and we wait exactly as long as we are told to. This costs one
// cheap request per tile and buys a run that finishes.
// ---------------------------------------------------------------------------
const SLOT_POLL_MAX = 12;         // give up waiting after this many checks
const SLOT_BUFFER_MS = 2_000;     // clear the stated time, never race it
const SLOT_FALLBACK_MS = 20_000;  // status unreadable: wait a sane fixed while
const SLOT_MAX_WAIT_MS = 180_000; // one stated wait longer than this is a stall

const statusUrlFor = (endpoint) => endpoint.replace(/\/api\/interpreter\/?$/, '/api/status');

/**
 * Block until the endpoint says it has a slot for us.
 *
 * Never throws: an unreadable status page is a reason to pause, not a reason
 * to fail a tile. Returns the number of ms spent waiting, for the run report.
 */
async function awaitSlot(net, endpoint, log) {
  let waited = 0;
  for (let i = 0; i < SLOT_POLL_MAX; i++) {
    let text;
    try {
      text = await net.text(statusUrlFor(endpoint), { timeoutMs: 20_000, retries: 1 });
    } catch {
      await sleep(SLOT_FALLBACK_MS);
      waited += SLOT_FALLBACK_MS;
      continue;
    }

    const now = /(\d+)\s+slots?\s+available\s+now/i.exec(text);
    if (now && Number(now[1]) > 0) return waited;

    // No free slot. The server states when each one frees; take the soonest.
    const afters = [...text.matchAll(/in\s+(-?\d+)\s+seconds?/gi)].map((m) => Number(m[1]));
    const soonest = afters.length ? Math.min(...afters.filter(Number.isFinite)) : null;
    const ms = soonest === null
      ? SLOT_FALLBACK_MS
      : Math.min(SLOT_MAX_WAIT_MS, Math.max(1, soonest) * 1000 + SLOT_BUFFER_MS);

    log?.(`        waiting ${Math.round(ms / 1000)}s for an Overpass slot`);
    await sleep(ms);
    waited += ms;
  }
  return waited;
}

/**
 * SEED TILES. Together these cover the entire planet exactly once, with no
 * gap and no overlap, and they are the level the walk starts at.
 *
 * The contiguous states are cut into a 4 x 8 grid of about 6.5° x 7.3°. At the
 * density measured in the south-east that is roughly 11,000 elements a tile —
 * comfortably one request — so the common case never recurses. Everything else
 * is one box, because everything else is nearly empty and a nearly empty box
 * is the cheapest query Overpass can answer.
 *
 * The last four boxes are the exact complement of the CONUS box over the
 * sphere. They exist so that cameras outside the United States are COUNTED AND
 * KEPT rather than silently cropped out of the world by a US-shaped bounding
 * box — the datacentre collector drops non-US points, and that is a behaviour
 * worth not copying here.
 */
const CONUS = Object.freeze([24.0, -125.0, 50.0, -66.5]);

export const SEED_BOXES = Object.freeze([
  { id: 'conus', box: CONUS, split: [4, 8] },
  { id: 'west-of-conus', box: [-90.0, -180.0, 90.0, -125.0], split: [1, 1] },
  { id: 'east-of-conus', box: [-90.0, -66.5, 90.0, 180.0], split: [1, 1] },
  { id: 'south-of-conus', box: [-90.0, -125.0, 24.0, -66.5], split: [1, 1] },
  { id: 'north-of-conus', box: [50.0, -125.0, 90.0, -66.5], split: [1, 1] },
]);

/** Fixed 5 dp so the query string for a given box is byte-identical every run. */
function bboxLiteral([s, w, n, e]) {
  return [s, w, n, e].map((v) => v.toFixed(5)).join(',');
}

/** Cut a box into rows x cols, in a fixed order. */
function subdivide([s, w, n, e], rows, cols) {
  const out = [];
  const dLat = (n - s) / rows;
  const dLon = (e - w) / cols;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out.push([s + r * dLat, w + c * dLon, s + (r + 1) * dLat, w + (c + 1) * dLon]);
    }
  }
  return out;
}

const quarter = (box) => subdivide(box, 2, 2);

/**
 * Build the Overpass QL for one box.
 *
 * `out count` returns one element carrying nodes/ways/relations/total: a full
 * scan, but no serialisation. That is what makes counting before fetching
 * affordable, and it is the whole reason this harvest downloads ~42 MB rather
 * than ~120 MB.
 *
 * `out tags center qt` gives every tag plus one representative coordinate.
 * `center` is what makes the fifteen mapped WAYS usable — without it a way
 * comes back with no coordinate at all and would have to be dropped.
 */
export function buildQuery(box, { mode = 'data' } = {}) {
  const bb = bboxLiteral(box);
  const base = BASE_FILTER.map(([k, v]) => `["${k}"="${v}"]`).join('');
  const body = FLOCK_TAGS.map((k) => `  nwr${base}["${k}"="${FLOCK_VALUE}"](${bb});`).join('\n');
  return `[out:json][timeout:${SERVER_TIMEOUT_S}];\n(\n${body}\n);\n${mode === 'count' ? 'out count;' : 'out tags center qt;'}`;
}

function isBusy(message) {
  return /Dispatcher_Client|too busy|rate_limited|429|504/i.test(String(message));
}

/**
 * One Overpass request, tried on the primary and then on the mirrors.
 *
 * GET, not POST. collector/fetch.mjs does not forward a request body and
 * CONTRACT.md §1.5 forbids calling global fetch() around it. Overpass accepts
 * the identical query as `?data=`; these are ~600-character URLs, far inside
 * every limit in the chain. (A POST carrying the query as a raw, un-form-encoded
 * body is what answers HTTP 406 — that is a content-type problem, not a method
 * problem, and it does not arise on this path.)
 */
async function ask(net, query, { label, log }) {
  const failures = [];
  let slotWaitMs = 0;

  for (let e = 0; e < ENDPOINTS.length; e++) {
    const endpoint = ENDPOINTS[e];
    // The 5 s gate in fetch.mjs only covers overpass-api.de. A mirror gets an
    // explicit pause instead, so falling back is never a way to go faster.
    if (e > 0) await sleep(MIRROR_BACKOFF_MS);

    for (let attempt = 1; attempt <= TILE_ATTEMPTS; attempt++) {
      // Ask before knocking. This is the whole rate-limit strategy.
      slotWaitMs += await awaitSlot(net, endpoint, log);

      const url = `${endpoint}?${new URLSearchParams({ data: query })}`;
      let body;
      try {
        body = await net.text(url, { timeoutMs: CLIENT_TIMEOUT_MS, retries: 0 });
      } catch (err) {
        const why = String(err?.message ?? err).slice(0, 200);
        failures.push(`${label} @${endpoint} #${attempt}: ${why}`);
        log?.(`        retry ${attempt}/${TILE_ATTEMPTS}: ${why.slice(0, 100)}`);
        // A 429 is the server telling us to consult /api/status, which the top
        // of the next iteration does. Anything else gets a flat pause.
        if (!isBusy(why)) await sleep(MIRROR_BACKOFF_MS);
        continue;
      }

      let json;
      try {
        json = JSON.parse(body);
      } catch {
        // Overpass reports its own errors as XHTML, sometimes under a 200.
        const why = (/<strong[^>]*>Error<\/strong>:([^<]*)/.exec(body)?.[1] ?? body)
          .replace(/\s+/g, ' ').trim().slice(0, 200);
        failures.push(`${label} @${endpoint} #${attempt}: ${isBusy(why) ? 'busy' : 'non-JSON'} — ${why}`);
        log?.(`        retry: ${isBusy(why) ? 'server busy' : 'non-JSON answer'} — ${why.slice(0, 90)}`);
        await sleep(MIRROR_BACKOFF_MS);
        continue;
      }

      if (!Array.isArray(json?.elements)) {
        failures.push(`${label} @${endpoint} #${attempt}: no elements array`);
        continue;
      }

      return {
        json,
        endpoint,
        bytes: Buffer.byteLength(body),
        slotWaitMs,
        osmTimestamp: json?.osm3s?.timestamp_osm_base ?? null,
      };
    }
  }

  const err = new Error(`overpass refused ${label} on all ${ENDPOINTS.length} instances — ${failures.join(' | ')}`);
  err.failures = failures;
  throw err;
}

/**
 * OSM `direction` on a surveillance node is which way the camera looks. It is
 * the most interesting field in this dataset and nobody renders it.
 *
 * It is also written by hand, and a survey of 34,656 real elements found four
 * distinct forms in use:
 *
 *   "142"      a bearing in degrees clockwise from true north     ~91%
 *   "338-23"   a SECTOR: the field of view runs clockwise from     ~7.6%
 *              338° to 23°, so it is 45° wide and centred on 0°
 *   "NNE"      a 16-point compass letter                            rare
 *   "0;0"      an OSM multi-value                                   rare
 *
 * Treating the sector form as unparseable would have thrown away 2,616 of
 * 34,193 tagged cameras in that sample — 7.6% of the most interesting field in
 * the set — and would have done it silently. So sectors are parsed: `deg` is
 * the centre of the arc and `arc` is its width, which is strictly more
 * information than a bare bearing carries.
 *
 * Returns { deg, arc, form } or null. `deg` is an integer 0-359 and is never a
 * zero standing in for "unknown" — 0 is due north, and it is a real and common
 * value here. `arc` is null unless the tag actually described a sector; a
 * derived centre is flagged by `form` so the page can say that it was derived.
 */
const COMPASS = Object.freeze({
  N: 0, NNE: 22.5, NE: 45, ENE: 67.5, E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
  S: 180, SSW: 202.5, SW: 225, WSW: 247.5, W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
});

export const DIRECTION_FORMS = Object.freeze(['bearing', 'sector', 'compass', 'multi']);

const norm = (n) => ((Math.round(n) % 360) + 360) % 360;

export function parseDirection(raw) {
  if (typeof raw !== 'string') return null;
  let s = raw.trim();
  if (!s) return null;

  // Multi-value. Take the first and say so — averaging two bearings a camera
  // might point along would invent a direction it never points.
  let form = 'bearing';
  if (s.includes(';')) {
    form = 'multi';
    s = s.split(';')[0].trim();
    if (!s) return null;
  }

  const letters = COMPASS[s.toUpperCase()];
  if (letters !== undefined) return { deg: norm(letters), arc: null, form: form === 'multi' ? 'multi' : 'compass' };

  // Sector: "from-to", clockwise. The leading value may be negative, so the
  // separator is only a range when it sits between two digits.
  const sector = /^(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)$/.exec(s);
  if (sector) {
    const from = norm(Number(sector[1]));
    const to = norm(Number(sector[2]));
    if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
    // Clockwise sweep, so "338-23" is 45° wide and not 315°.
    const arc = (to - from + 360) % 360;
    return { deg: norm(from + arc / 2), arc: Math.round(arc), form: form === 'multi' ? 'multi' : 'sector' };
  }

  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return { deg: norm(n), arc: null, form };
}

/** Which of the three Flock tags matched, in FLOCK_TAGS order. */
function matchedTags(tags) {
  return FLOCK_TAGS.filter((k) => tags[k] === FLOCK_VALUE);
}

/**
 * Reduce one Overpass element to the fields the dataset publishes.
 *
 * Everything else is dropped HERE, on ingest, before it can accumulate. At
 * ~367 bytes per raw element and 115k elements the raw corpus is ~42 MB; it is
 * never held whole and never written to disk.
 */
export function reduceElement(el) {
  const tags = el?.tags ?? {};
  const lat = el.type === 'node' ? el.lat : el.center?.lat;
  const lon = el.type === 'node' ? el.lon : el.center?.lon;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const matched = matchedTags(tags);
  if (matched.length === 0) return null; // dragged in by nothing we asked for

  // `operator` does double duty in this corpus: usually absent, sometimes the
  // deploying agency (a police department), and on ~2,273 elements it is the
  // string "Flock Safety" itself. Keep the agency; never let the manufacturer's
  // own name be reported as the operating agency.
  const operatorRaw = typeof tags.operator === 'string' ? tags.operator.trim() : null;
  const agency = operatorRaw && operatorRaw !== FLOCK_VALUE ? operatorRaw : null;

  const d = parseDirection(tags.direction);

  return {
    ref: `${el.type}/${el.id}`,
    lat,
    lon,
    dir: d ? d.deg : null,
    dir_arc: d ? d.arc : null,
    dir_form: d ? d.form : null,
    dir_tagged: typeof tags.direction === 'string' && tags.direction.trim() !== '',
    mount: tags['camera:mount'] ?? null,
    camera_type: tags['camera:type'] ?? null,
    zone: tags['surveillance:zone'] ?? null,
    visibility: tags.surveillance ?? null,
    operator: agency,
    matched,
    centroid: el.type !== 'node',
  };
}

/**
 * Walk every seed tile and return the deduplicated camera set.
 *
 * `log` is called with a plain string per completed request, because a
 * twenty-minute run should be legible while it happens and not only afterwards.
 */
export async function harvest(net, { log = () => {} } = {}) {
  /** ref -> reduced record. Overpass bboxes are inclusive on all four edges, so
   *  a node sitting exactly on a tile line comes back in two tiles. */
  const cameras = new Map();

  const stats = {
    count_queries: 0,
    data_queries: 0,
    bytes_received: 0,
    tiles_fetched: 0,
    tiles_empty: 0,
    tiles_split: 0,
    splits_after_error: 0,
    duplicates_across_tiles: 0,
    slot_wait_ms: 0,
    max_depth_used: 0,
    large_tiles: [],
    endpoints_used: new Set(),
    errors_recovered: [],
  };
  let osmTimestamp = null;
  const seedCounts = {};

  function record(r) {
    stats.bytes_received += r.bytes;
    stats.slot_wait_ms += r.slotWaitMs ?? 0;
    stats.endpoints_used.add(r.endpoint);
    if (r.osmTimestamp) osmTimestamp = r.osmTimestamp;
  }

  async function count(box, label) {
    const r = await ask(net, buildQuery(box, { mode: 'count' }), { label: `count ${label}`, log });
    stats.count_queries += 1;
    record(r);
    const t = r.json.elements?.[0]?.tags ?? {};
    return Number(t.total ?? 0);
  }

  async function fetchBox(box, label, seen) {
    const r = await ask(net, buildQuery(box, { mode: 'data' }), { label: `data ${label}`, log });
    stats.data_queries += 1;
    record(r);

    let added = 0;
    for (const el of r.json.elements) {
      const rec = reduceElement(el);
      if (!rec) continue;
      // Counted for THIS seed's cross-check whether or not it is new globally.
      // Seed boxes share edges and Overpass bboxes are inclusive on all four,
      // so a camera on a shared edge belongs to both boxes' totals. Measuring
      // the cross-check on globally-new cameras would blame the second box for
      // the first box having already seen it.
      seen?.add(rec.ref);
      if (cameras.has(rec.ref)) { stats.duplicates_across_tiles += 1; continue; }
      cameras.set(rec.ref, rec);
      added += 1;
    }
    stats.tiles_fetched += 1;
    const received = r.json.elements.length;
    if (received > LARGE_TILE_ELEMENTS) {
      stats.large_tiles.push({ label, bbox: bboxLiteral(box), elements: received, mb: Math.round(r.bytes / 1e5) / 10 });
    }
    return { received, added, mb: r.bytes / 1e6 };
  }

  async function walk(box, depth, label, seen) {
    stats.max_depth_used = Math.max(stats.max_depth_used, depth);
    const pad = '  '.repeat(Math.min(depth, 6));

    try {
      const { received, added, mb } = await fetchBox(box, label, seen);
      if (received === 0) {
        stats.tiles_empty += 1;
        log(`${pad}. ${label} empty`);
      } else {
        log(`${pad}+ ${label} ${received} elements, ${added} new, ${mb.toFixed(1)} MB`);
      }
    } catch (err) {
      // With no `out` limit a tile either arrives whole or fails, and the
      // overwhelmingly likely reason it fails is that it was too big for a
      // busy server. Quartering is the fix; retrying a struggling public
      // instance harder is how a client earns a ban.
      if (depth >= MAX_DEPTH) throw err;
      const why = String(err?.message ?? err).slice(0, 300);
      log(`${pad}! ${label} failed, splitting — ${why.slice(0, 90)}`);
      stats.errors_recovered.push({ label, depth, why });
      stats.splits_after_error += 1;
      stats.tiles_split += 1;
      const kids = quarter(box);
      for (let i = 0; i < kids.length; i++) await walk(kids[i], depth + 1, `${label}.${i}`, seen);
    }
  }

  const seedChecks = [];

  for (const seed of SEED_BOXES) {
    const [rows, cols] = seed.split;
    const tiles = subdivide(seed.box, rows, cols);

    // The cross-check. One cheap count for the whole seed box, before any of
    // its tiles are fetched. If the tiles do not add up to it, the harvest is
    // incomplete and must not be published as though it were complete.
    let expected = null;
    try {
      expected = await count(seed.box, `${seed.id}/all`);
    } catch (err) {
      log(`seed ${seed.id}: cross-check count unavailable — ${String(err?.message ?? err).slice(0, 90)}`);
    }

    log(`seed ${seed.id} [${bboxLiteral(seed.box)}] counted ${expected ?? 'unknown'} -> ${tiles.length} tile${tiles.length === 1 ? '' : 's'}`);
    const seen = new Set();
    const before = cameras.size;
    for (let i = 0; i < tiles.length; i++) await walk(tiles[i], 0, `${seed.id}/${i}`, seen);
    const collected = seen.size;
    seedCounts[seed.id] = { distinct_in_box: collected, new_to_this_run: cameras.size - before };

    // OSM is edited continuously, so counted and collected drift by a handful
    // over the minutes a seed takes. A 2% shortfall is not drift — but on a box
    // holding thirty cameras, 2% is less than one camera, so the tolerance has
    // an absolute floor too.
    const slack = Math.max(3, expected * 0.02);
    const short = expected !== null && collected < expected - slack;
    seedChecks.push({ seed: seed.id, counted: expected, collected, shortfall: short });
    log(`seed ${seed.id} done: ${collected} distinct in box${expected === null ? '' : ` against a count of ${expected}`}; ${cameras.size} cameras so far`);
    if (short) {
      throw new Error(
        `${seed.id}: counted ${expected} cameras in the seed box but its tiles yielded only ` +
        `${collected}. The harvest is incomplete and will not be published as complete.`,
      );
    }
  }

  return {
    cameras: [...cameras.values()],
    stats: {
      ...stats,
      endpoints_used: [...stats.endpoints_used].sort(),
      cameras_by_seed: seedCounts,
      seed_cross_checks: seedChecks,
    },
    osm_timestamp: osmTimestamp,
    query_template: buildQuery([0, 0, 0, 0], { mode: 'data' }),
    seeds: SEED_BOXES.map((s) => ({ id: s.id, bbox: bboxLiteral(s.box), seed_split: s.split })),
  };
}

export default {
  id: 'osm-flock',
  label: 'OpenStreetMap ALPR nodes tagged Flock Safety, via Overpass',
  endpoint: ENDPOINT,
  keyless: true,
  refresh_days: REFRESH_DAYS,
  gives: 'surveyed coordinates and camera tags for every Flock ALPR mapped in OpenStreetMap',
  licence: Object.freeze({
    data: 'Open Database License (ODbL) v1.0',
    attribution: '© OpenStreetMap contributors',
    url: 'https://www.openstreetmap.org/copyright',
  }),
  harvest,
};
