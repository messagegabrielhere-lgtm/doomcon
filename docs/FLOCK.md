# FLOCK — automated licence-plate readers, as mapped in OpenStreetMap

`data/flock.json` · `data/flock-points.json`
Built by `collector/flock.mjs` from `collector/dc-sources/osm-flock.mjs`.

```
docker run --rm --network host -v "$PWD":/app -w /app node:20-alpine \
  node collector/flock.mjs
```

---

## 1. What this is

Flock Safety builds fixed automated licence-plate readers — ALPR cameras —
that police departments, sheriffs' offices, homeowners' associations and, it
turns out, retail chains deploy on and beside public roads. A camera reads the
plate of every vehicle that passes and writes it to a searchable database.

OpenStreetMap contributors tag them. This dataset reads those tags.

**It belongs on this site because ALPR is applied computer vision.** It is a
trained model, deployed at street level, at national scale, on hardware you can
stand next to. The site already maps datacentres — the buildings where models
are trained. This is the other end of the same wire: where they are pointed.

The register is factual. It records what is mapped and, where OSM says so, who
operates it. It does not editorialise about the cameras and it says nothing
about the equipment itself.

---

## 2. The honesty bar

This is the part that matters more here than anywhere else on the site, because
this dataset invites exactly one misreading and the misreading is severe.

### Every number is a count of what has been MAPPED

`data/flock.json` does not count Flock cameras. It counts Flock cameras
**somebody has entered into OpenStreetMap**. Those are different quantities.

Every headline figure must therefore carry the qualifier
**"as mapped in OpenStreetMap on `<date>`"**. The string is precomputed at
`copy.headline_qualifier` so no renderer has to remember it, and
`copy.never_say` lists the four phrasings that are forbidden:

- "all Flock cameras"
- "every Flock camera"
- "the number of Flock cameras in the United States"
- "a national total"

### Zero mapped is not zero cameras

A county with no cameras in this file is a county **nobody has mapped**. This
dataset cannot distinguish that from a county with no cameras, and neither can
anyone reading it.

That is not a caveat, it is the single most important fact about the data, and
it has to be visible **in the map itself** — not in a footnote below it. Every
county in the TIGER roster is present in `counties`, including the empty ones,
precisely so that "zero mapped" is renderable as its own state rather than
being an absence.

`copy.legend_requirement` states the rendering condition: the distinction
between "zero mapped" and everything else must be carried by something that is
not colour alone — a hatch, a texture, a label — both because colour is never
the sole carrier of meaning anywhere on this site, and because here the
distinction *is* the finding.

### Coverage follows volunteers, not deployments

OSM coverage is wildly uneven. A city where a DeFlock contributor has been
active looks saturated. An identical city with no contributor looks empty. The
difference between the two pictures is the contributor.

So the map is, in part, a map of where mappers have been. Any regional
comparison drawn from it is a comparison of mapping effort at least as much as
a comparison of deployment.

### Vendor figures are not reconciled

Flock Safety publishes its own deployment figures and they differ from this
count. This site does not reconcile them, because reconciling them would mean
imputing cameras nobody has mapped — and the site never imputes. Both numbers
can be stated; neither is adjusted toward the other.

### Missing-ness is published, not smoothed

`field_coverage` gives present / missing / share for every optional field. A
camera with no `direction` tag is reported as having no direction. It is never
binned as north. A camera with no `operator` is reported as having no recorded
operator, not as unoperated.

---

## 3. Licence — this one is a condition, not a courtesy

OpenStreetMap data is published under the **Open Database License (ODbL) v1.0**.
Attribution is a term of that licence.

Any page, image or export built on this data must carry:

> © OpenStreetMap contributors

linked to <https://www.openstreetmap.org/copyright>.

It is carried in the payload at `source.licence` and repeated at
`copy.attribution_required` / `copy.attribution_url` so a renderer cannot lose
it by accident.

---

## 4. The source, and how to recompute it

**Endpoint.** `https://overpass-api.de/api/interpreter`, keyless, with the
project User-Agent from `collector/fetch.mjs`.

**The tags.** An element is in scope when it carries both of

```
man_made           = surveillance
surveillance:type  = ALPR
```

and **any one** of

```
manufacturer = Flock Safety
brand        = Flock Safety
operator     = Flock Safety
```

The three Flock tags must be **unioned**. Overpass has no disjunction across
different keys, so the query is three statements in a union block. This is not
belt-and-braces: measured inside a Georgia box on 2026-09-26 the three split
**11,045 / 187 / 296**. `manufacturer` dominates and does not cover the set.

A representative element:

```json
{"type":"node","lat":33.8791909,"lon":-84.4712918,"tags":{
   "man_made":"surveillance","manufacturer":"Flock Safety",
   "manufacturer:wikidata":"Q108485435","surveillance":"public",
   "surveillance:type":"ALPR","surveillance:zone":"traffic",
   "camera:mount":"pole","camera:type":"fixed","direction":"3"}}
```

**To recompute any figure**, substitute a bounding box into
`source.query_template` and send it to the endpoint. With `curl`, the query
must be form-encoded — a raw POST body answers HTTP 406:

```
curl -s -A "DOOMCON/1.0 (github.com/messagegabrielhere-lgtm/doomcon)" \
     --data-urlencode "data=<QL>" https://overpass-api.de/api/interpreter
```

The collector itself uses `GET …?data=<QL>`, which Overpass accepts
identically. That is not a preference: `collector/fetch.mjs` does not forward a
request body and CONTRACT.md §1.5 forbids calling global `fetch()` around it.
The queries are ~600 characters, far inside every limit in the chain.

Every published figure is the arithmetic in `collector/flock.mjs` over that
response, and nothing else.

---

## 5. The size problem, and how it was solved

A single US-wide fetch is roughly **42 MB** (measured density: 367 bytes per
element). That cannot go into git and it cannot go into one request.

### Tiling

Three ideas, in order of how much they save.

**1. Seed, don't recurse from the top.** A quadtree rooted on a box big enough
to hold North America spends its first four levels discovering the Pacific is
empty. `SEED_BOXES` starts at roughly the size that already fits in one
request: the contiguous states pre-cut into a 4 × 8 grid, plus four boxes that
are the exact complement of CONUS over the sphere. Together they cover the
whole planet once, with no gap and no overlap.

**2. Do not limit the output, so there is nothing to truncate.** `out … N`
can silently return a partial tile, and detecting that costs either a separate
count query per tile or a wasted download. With no limit, Overpass either
returns the whole bounding box or **fails loudly** — so a successful fetch is
always complete and is always kept, and the per-tile count query disappears.
That halves the request count, which is the resource this harvest is actually
rate-limited on.

**3. Split adaptively, on failure.** Density spans four orders of magnitude
between Fulton County and rural Nevada, so no fixed cell is right. A tile that
errors — timeout, gateway error, out of memory — is quartered and each quarter
fetched in turn, because the overwhelmingly likely reason a tile fails is that
it was too big. Recursion is capped at `MAX_DEPTH` (10 quarterings, ~600 m);
below that a failure is a real failure and the run refuses.

`LARGE_TILE_ELEMENTS` (25,000) is **not** a limit. It is a reporting threshold:
a tile above it is fine — 34,656 elements in one request is measured and worked
— but it says the seed grid is coarse in that spot, which belongs in the run
report rather than being discovered later. Such tiles are listed at
`collection.large_tiles`.

### The integrity cross-check

Because there is no truncation to detect per tile, completeness is verified a
level up. **One `out count` is issued per seed box**, before any of its tiles
are fetched, and compared against the number of distinct cameras those tiles
actually yielded.

```
collection.seed_cross_checks:
  [{ "seed": "conus", "counted": …, "collected": …, "shortfall": false }, …]
```

OSM is edited continuously, so counted and collected drift by a handful over
the minutes a seed takes. A shortfall over **2%** is not drift: it aborts the
run. A partial harvest published as a complete one is the exact lie this
dataset exists to avoid.

### Politeness

`collector/fetch.mjs` holds `overpass-api.de` to one request per 5,000 ms,
process-wide. The adapter does not route around it. Mirrors
(`overpass.kumi.systems`, `overpass.private.coffee`) are a last resort per
tile, with an explicit 8-second pause before each, never a way to go faster.

**Slots are the real limit.** The 5-second gate is necessary and not
sufficient. Overpass allocates each IP a small number of execution slots and
holds one for a cooldown after a query finishes; a serial client issuing fast
queries five seconds apart still runs out, and the first real run of this
collector earned an HTTP 429 on its fifth tile. Guessing at a backoff is the
wrong answer twice over — it invents a number the server is willing to state,
and retrying a rate limit is how a client turns a throttle into a ban. So the
adapter reads `/api/status` before every query:

```
Rate limit: 2
1 slots available now.
Slot available after: 2026-09-26T03:21:19Z, in 1 seconds.
```

and waits exactly as long as it is told to. `collection.slot_waiting_note`
records the policy; the run report prints the total time spent waiting.
`collection.endpoints_used` records whether more than one instance served a run
— if it did, the payload is stitched from more than one OSM snapshot, and a
reader is entitled to know.

Refresh is **7 days**. These cameras are bolted to poles.

### Reduction on ingest

Raw elements are reduced the moment a tile arrives and the raw JSON is
discarded. The ~42 MB corpus is never held whole and never written to disk.
What survives per camera is: OSM ref, lat, lon, direction (degrees + arc +
form), `camera:mount`, `camera:type`, `surveillance:zone`, `surveillance`, the
operating agency, and which Flock tags matched.

---

## 6. Direction — the field nobody renders

`direction` is a compass bearing in degrees clockwise from true north, and it
is present on the large majority of elements. It says which way each camera
looks, which is the single most informative thing in the dataset: an ALPR aimed
along a carriageway reads the traffic on it.

It is written by hand, and a survey of 34,656 real elements found **four**
distinct forms:

| form | example | meaning | share in sample |
|---|---|---|---|
| `bearing` | `"142"` | degrees clockwise from north | ~91% |
| `sector` | `"338-23"` | field of view, clockwise 338° → 23°: 45° wide, centred on 0° | ~7.6% |
| `compass` | `"NNE"` | 16-point compass letter | rare |
| `multi` | `"0;0"` | OSM multi-value | rare |

Treating the sector form as unparseable would have silently discarded **2,616
of 34,193** tagged cameras in that sample. So sectors are parsed: `deg` is the
centre of the arc, `arc` is its width. That is strictly more information than a
bare bearing carries, and `direction.tag_forms` reports how many cameras came
from each form so a derived centre is never mistaken for a tagged one.

Multi-values take the first element. Two bearings a camera might point along
are not averaged — averaging them would invent a direction it never points.

Cameras with no usable direction are **absent from the histogram entirely**.
They are not binned as north.

### The north bin is inflated and nobody can say by how much

In every sample taken, the N bin is visibly fatter than its neighbours — in one
34,656-camera sample, 3,621 against a ~2,100 average. Cameras do not prefer
north. `direction=0` is simultaneously a real bearing and the value a mapper
leaves behind when the bearing was never established, and **the tag cannot
tell the two apart**.

`direction.exactly_zero` publishes the count of bare `direction=0` bearings and
says exactly this. The histogram is **not** reweighted to smooth the spike,
because reweighting would mean inventing a distribution — and a visible,
explained artefact is worth more than a tidy chart built on a guess.

---

## 7. Geography

County and state attribution reuses `collector/dc-sources/_geo.mjs` — the same
Census TIGERweb polygons the datacentre map uses, with the same ~550 m
simplification and the same `boundary_risk` flag. A second resolver was not
written, because two mechanisms eventually disagree.

Consequences, stated rather than hidden:

- A camera within a few hundred metres of a county line can be assigned to the
  neighbouring county. `totals.near_a_county_boundary` counts how many sit
  close enough for that to be possible.
- Cameras outside every US county are **counted and kept**, in
  `totals.outside_any_us_county`, and carry `st = -1` in the points file. The
  datacentre collector drops non-US points; that behaviour was deliberately not
  copied here.
- The county roster includes territories (PR, GU, VI, MP, AS). Their postal
  codes are supplied by a small label table in `collector/flock.mjs`, because
  `_util.mjs`'s `FIPS_TO_STATE` covers only the 50 states and DC. That table is
  labels only — no geometry, no second resolver.

  This matters more than it sounds. `_geo.mjs` resolves a state through
  `FIPS_TO_STATE`, so a camera in Puerto Rico comes back with a real county
  and a **null state**. Attributed naively, 117 Puerto Rico and 79 US Virgin
  Islands cameras appear in the county table and as *zero* in the state table
  — 196 mapped cameras belonging to nowhere, on a page whose whole subject is
  the difference between "zero" and "unknown". The state is therefore
  back-filled from the county FIPS prefix using the same label table the
  roster uses, so the two cannot drift apart. The invariant is checked: the
  per-state totals, the per-county totals and `totals.in_a_us_county` all sum
  to the same number.
- Fifteen mapped objects are **ways**, not nodes. `out tags center` gives them
  a representative coordinate; `totals.located_by_way_centroid` counts them.

---

## 8. Output shapes

### `data/flock.json`

Aggregates only. Keys, all sorted canonically:

| key | what it holds |
|---|---|
| `schema`, `generated_at` | the only clock-derived field is `generated_at` |
| `source` | endpoint, tags, `query_template`, ODbL licence block, `osm_timestamp`, `as_of_date` |
| `collection` | tiling method, query counts, splits, depth, endpoints used, recovered errors |
| `totals` | worldwide, in-US, outside-US, per-Flock-tag, way centroids |
| `field_coverage` | present / missing / share for every optional field |
| `field_values` | value histograms for mount, type, zone, visibility, operating agency |
| `direction` | 16-point histogram, tag-form breakdown, field-of-view widths |
| `coverage` | counties with zero mapped, and what zero means |
| `copy` | the exact strings a renderer must use |
| `honesty` | the paragraph list the page prints |
| `geography` | the `_geo.mjs` source block |
| `grid` / `grid_rows` | 0.25° density bins, `[lat_index, lon_index, count]` |
| `states` | per state: cameras, counties total / with / without, direction histogram |
| `counties` | **every** county: `[fips, name, state, cameras_mapped]` |

The 0.25° grid is deliberately coarse: about 28 km of latitude, which at the
width CONUS renders on a 375 px phone is roughly one bin per two pixels. That
is as fine as a national view can honestly resolve. Anything closer uses the
point file.

### `data/flock-points.json`

Flat parallel integer arrays, not an array of objects. 115k records shaped
`{"lat":…,"lon":…,"dir":…}` would be about 4.5 MB of repeated key names.

```
lat_q[i] / quantisation  ->  latitude  (WGS84 decimal degrees)
lon_q[i] / quantisation  ->  longitude
dir[i]                   ->  0-359, or -1 for "no usable direction tag"
st[i]                    ->  index into states[], or -1 for "not in a US county"
```

`quantisation` is 100000, i.e. 1e-5°, about 1.1 m of latitude. Rows are sorted
by `lat_q`, then `lon_q`, then OSM id, so the order is stable across runs.

`dir = -1` means **no usable tag**. It does not mean north. Field-of-view arc
widths are aggregate-only and are not carried per point.

---

## 9. Determinism and refusal

**Determinism (CONTRACT.md §1.4).** Given the same OSM snapshot the payload is
byte-identical. Every array is sorted on a stable key, ties included; floats
are fixed precision; bbox literals are printed at 5 dp so the query strings
themselves are stable. Wall-clock duration is deliberately **not** in the
payload — it is printed in the run report, where a non-reproducible number
belongs. `source.osm_timestamp` is Overpass's own snapshot clock and is a
property of the data, not of the run.

**Refusal.** The collector writes nothing and exits non-zero when:

- the county polygons are unavailable — without them every camera would be
  reported as "outside the United States", which is a false statement, not a gap;
- the county roster comes back with fewer than 3,000 rows — without every
  county, "zero mapped" cannot be distinguished from "not in the list";
- any tile ultimately fails after retries and splitting — a partial harvest
  published as a complete one is the exact lie this dataset exists to avoid;
- a seed box's tiles yield more than 2% fewer cameras than the seed box's own
  count — the harvest is incomplete;
- the total falls below **50,000** — the union measured 115,607 worldwide on
  2026-09-26, and a collapse like that is a query fault, not a finding.

In every case the previously committed `data/flock.json` stands.

**Development aid.** `--harvest-cache <path>` writes the harvested camera set
before aggregation, so the aggregation can be re-run without asking Overpass
again; `--refresh` ignores it. The path must be outside the tracked tree.
`--no-points` skips the point file.

---

## 10. The first complete run — 2026-09-26

Measured, not projected. `docker run … node collector/flock.mjs`, OSM snapshot
`2026-09-26T03:52:04Z`.

```
cameras mapped worldwide               115,608
  in a US county                       115,350
  outside any US county                    258
  located by way centroid                   15
  tagged manufacturer="Flock Safety"   110,462
  tagged brand="Flock Safety"            4,693
  tagged operator="Flock Safety"         2,142
  carrying more than one                 1,652

counties in the roster                   3,235
  with mapped cameras                    2,287
  with NONE mapped                         948   (29.3%)
states and territories with cameras   52 of 56

direction tagged                       113,241  (98.0%)
  parsed                               113,214
  unparseable                               27
  stating a field-of-view arc            4,053   (45° is 3,650 of them)
  a bare direction=0                     5,741   (5.1% of parsed)
camera:mount tagged                     32,759  (28.3%)
camera:type tagged                     113,199  (97.9%)
surveillance:zone tagged               101,680  (88.0%)
operating agency recorded               14,953  (12.9%)

count queries                                5
data queries                                36
tiles fetched / empty / split          36 / 4 / 0
splits after an error                        0
duplicates across tile edges                 0
raw bytes received                      43.7 MB
time spent waiting for a slot              737 s
WALL CLOCK                              27m 01s
```

**The cross-check passed on every seed**, which is what makes the total
trustworthy:

| seed | counted | collected |
|---|---|---|
| conus | 115,303 | 115,305 |
| west-of-conus | 67 | 67 |
| east-of-conus | 198 | 198 |
| south-of-conus | 37 | 37 |
| north-of-conus | 1 | 1 |

CONUS collected two more than it counted — OSM gained two cameras during the
27 minutes between the count and the last tile. That is exactly the drift the
2% tolerance exists for, and it is in the payload rather than rounded away.

Not one tile needed splitting and not one request failed, so the 4 × 8 seed
grid was the right size: the densest tile was under the reporting threshold.
The whole planet came back in **41 requests**.

### Two findings worth stating plainly

**Retail is the largest named operator.** Where OSM records an operating
agency at all — only 12.9% of cameras — the two most common are not police
departments:

| operator | cameras |
|---|---|
| Lowe's | 1,647 |
| The Home Depot | 1,089 |
| California Highway Patrol (CHP) | 392 |
| San Francisco Police Department | 326 |
| Detroit Police Department | 229 |

This says something about who is mapped, not necessarily about who deploys
most: a chain store's cameras are easy for a volunteer to attribute, a
municipality's often are not. Read it as a fact about the register.

**Coverage is not the same as deployment.** Florida has 67 of 67 counties
mapped; Ohio has 80 of 88 but only a third of California's cameras. Alaska has
**zero** mapped cameras — which says nothing whatever about Alaska, and
everything about who has been mapping. Some of
that is deployment and some of it is who showed up to map. The data cannot
separate the two and the page must not pretend otherwise.

### What the files actually cost

| file | raw | gzip |
|---|---|---|
| `data/flock.json` | 305,538 B (298 KiB) | 62,161 B |
| `data/flock-points.json` | 2,735,943 B (2.6 MiB) | 875,845 B |

**Both are committed.** The reasoning, so it can be revisited:

- The point file is 2.6 MiB raw but **855 KiB compressed**, which is what git
  stores and what a CDN serves. At a 7-day refresh that is roughly 46 MB of
  history a year — real, and affordable.
- The refresh cadence is what makes this defensible. A 2.6 MiB file rewritten
  every fifteen minutes would not be, and could not be: the harvest itself
  takes 27 minutes. **If the cadence ever drops below weekly, this file must
  leave git** — published as a release asset or regenerated at deploy time,
  with `data/flock.json` remaining the committed artefact.
- Without it there is no point-level view at all, only 0.25° bins. The
  aggregate map plus a published methodology would be a legitimate answer, but
  it is a strictly worse one while the cost is under a megabyte compressed.

---

## 11. Notes for whoever renders this

The page is not this file's job, but three things about the data decide how it
can honestly be drawn.

**Do not re-serialise the point file.** `site/build.mjs` pipes data through
`stableJson`, which is `JSON.stringify(v, null, 2)`. Indent-2 puts every one of
the ~462,000 integers in the packed arrays on its own line and inflates the
file from 2.6 MiB to about 5 MiB for no gain. The collector already emits
canonical, key-sorted, deterministic JSON — copy it verbatim.

**Reuse the projection that is already here.** `site/templates/_usmap.mjs`
draws a server-side inline-SVG United States in Albers Equal Area Conic
(standard parallels 29.5°N / 45.5°N, origin 23°N / 96°W) with no map library
and no client JavaScript. Its `project()` takes lat/lon, which is exactly what
`grid_rows` and `flock-points.json` provide. Equal-area matters more here than
on the datacentre map: this dataset's whole subject is *how much* is in a
place, and Mercator would inflate the empty northern tier by ~1.5x.

**Draw the grid, not the points, for the national view.** `grid_rows` is 5,029
occupied 0.25° bins, densest cell 1,399 cameras. The point file is ~115k records; that many SVG
elements is a DOM the page should not build. Bins at national zoom, points only
if and where something zooms.

**The empty counties are the finding, so they must be drawn.** `counties`
carries every county in the TIGER roster with its mapped count, including the
zeros, joined by 5-digit FIPS. `states` carries `counties_with_none_mapped`
per state, joinable to `_usmap.mjs`'s `STATE_OUTLINES` by postal code. A map
that only draws where cameras are is a map that quietly asserts the rest is
clear, which is the one claim this data cannot support.

Three obligations, none of them optional:

1. Every headline figure carries `copy.headline_qualifier`.
2. `copy.attribution_required` and `copy.attribution_url` appear on the page.
   ODbL is a licence, not a suggestion.
3. "Zero mapped" is distinguishable from everything else by something that is
   not colour alone — see `copy.legend_requirement`.
