# The datacentre dataset

`collector/datacenters.mjs` → `data/datacenters.json` → a map page, to be built.

The sibling of `/watts`. `docs/INFRA.md` asks how the power and the water are
doing. This asks **where the things drawing on them are**, and joins the two, so
a pin can say:

> **Aligned DFW-01** — Collin County, TX · ERCOT · 4.4% of the county in D4 ·
> nearest gauge Trinity Rv at Dallas, 29.4 km — ERCOT headroom used 71.56% of
> committed capacity *(awaiting baseline)*

That sentence is the feature. Nobody else joins those four things up.

**It does not feed the main index and never will** unless its sources enter the
frozen reference distribution. `collector/engine.mjs` does not read this file.

---

## 0. The claim, and the exact size of it

Printed third on the page, above every pin, before a reader has had a chance to
form the wrong idea — the same position and the same job as the equivalent
paragraph on `/watts`:

> Nothing here measures a datacentre's power or water draw. No public feed
> publishes either, for any site, at any cadence. What is measured is **where
> the buildings are** and **what the substrate around them is doing**.

And the second half, which matters just as much:

> A state with no pins is a state **nobody has mapped**. It is not a state with
> no datacentres.

---

## 1. Running it

Node is not installed on the operator's machine. Everything runs in Docker.

```sh
cd /path/to/doomcon
docker run --rm --network host -v "$PWD":/app -w /app node:20-alpine \
  node collector/datacenters.mjs
```

It requires `data/infra.json` (run `collector/infra.mjs` first) and
`data/news.json` (run `collector/news.mjs` first). Both are read, neither is
written.

**Cadence: daily at most, and it must not run inside the per-minute site
build.** See §8.

---

## 2. Every source

Six, all keyless, plus two cached reference datasets.

| id | what it gives | pins | refresh |
|---|---|---|---|
| `osm-overpass` | operating, under-construction and proposed sites, with surveyed coordinates | **1,877** | 7 days, cached |
| `news-announcements` | announcements extracted from `data/news.json` | 0 today, ledger | every run |
| `fedreg-projects` | Federal Register documents naming a project | **0 by design** — §3 | every run |
| `sec-operators` | operator-level corroboration from EDGAR | none, by design | every run |
| `tiger-counties` | county and state for every point | — | 90 days, cached |
| `usgs-gauge-sites` | coordinates for the nine `/watts` gauges | — | 90 days, cached |
| `usdm-county` | drought, per county, for every county with a site in it | — | every run |

### `osm-overpass` — the existing half

**Endpoint** `https://overpass-api.de/api/interpreter`, with
`overpass.kumi.systems` and `overpass.private.coffee` as fallbacks, tried in
order, first answer wins.

**The unlock, verified 2026-09-24.** OpenStreetMap tags datacentres and Overpass
serves them free and keyless. Measured over the United States:

| tag | elements |
|---|---|
| `telecom=data_center` | 1,864 |
| `construction:telecom=data_center` | 50 |
| `building=data_center` | 21 |
| `construction=data_center` | 16 |
| `proposed:telecom=data_center` | 7 |
| `landuse=data_center` | 1 |
| `telecom=data_centre` (British spelling) | **0** |

**Being a good citizen, which is not optional.** Overpass runs on donated
hardware for everybody. Eleven small counting probes inside four minutes earned
a 429 and two 504s from the main instance during this build — and at one point
even `node(1); out;`, the cheapest query expressible, came back

> `Dispatcher_Client::request_read_and_idx::timeout. The server is probably too
> busy to handle your request.`

minutes after the same instance had served the whole United States in 19
seconds. Nothing was wrong with the query. Retrying harder is the wrong answer.

So: **one query per refresh**, every tag variant unioned into it, a 540-second
server-side timeout, the project's own User-Agent so an operator we annoy can
find us and mail us, the raw answer written to `data/dc-cache/`, and a **refresh
interval of seven days**. Datacentres do not move.

**Three bounding boxes, not one.** The contiguous states
`(24.0,-125.0,49.6,-66.5)`, Alaska `(51.0,-170.0,72.0,-129.0)`, Hawaii
`(18.5,-160.6,22.6,-154.5)`. A single box spanning all three covers a quarter of
the planet, mostly ocean, and asks Overpass to scan it seven times over. The
boxes still include Canada, Mexico and the Caribbean; §4 explains what happens
to those.

**Status is read from the tags**, and the tag that decided it is recorded in the
evidence as `status_tag`, because a proposed campus still carries
`telecom=data_center` and a reader must be able to check the claim:

| OSM | status |
|---|---|
| any `proposed:*` key | `announced` |
| `construction=data_center`, `construction:telecom=data_center`, `building=construction`, `landuse=construction` | `under_construction` |
| otherwise | `operating` |

**`out tags center`, not `out geom`.** Full geometry would let us compute a
footprint area — the most useful missing field in this dataset — at roughly an
order of magnitude more payload and a materially higher chance of the query
timing out on a busy server. The trade was made in favour of the query
completing. **There is no area field.**

**If Overpass is unreachable**, `_cache.mjs` returns the last good copy, marks
the source `stale-cache`, and puts the reason in `sources[].error`. Only when
there is no copy at all does the source go dark — and even then the run
completes and the other sources publish. An empty map is never shipped as
though it were a finding.

### `news-announcements` — the durable ledger

`data/news.json` is a 200-item scored newsroom over a rolling window of a day or
two. Announcements arrive in it and fall out of it. So this adapter applies a
conservative published rule to the current window and **merges** what it finds
into a ledger carried forward in `data/datacenters.json`, because otherwise
every announcement this project ever saw would be forgotten inside 48 hours.

**The rule.** All four must hold:

1. Title or summary matches `/data ?cent(er|re)s?/i`.
2. It contains a construction or commitment verb — announced, unveiled, broke
   ground, building, constructing, investing, plans to build, proposed,
   expanding, opening. A story about datacentre **policy, finance or
   litigation** is not a site.
3. It names **exactly one** US state, by full name or as `", XX"` after a comma.
   Two states named is an ambiguous pin and is dropped. The bare-abbreviation
   form is only accepted after a comma because `IN`, `OR`, `OK`, `ME`, `HI` and
   `DE` are all ordinary English words.
4. It is not orbital, legal, financial or regulatory.

**Measured yield, 2026-09-24: of 200 scored items, five mention datacentres at
all and zero survive the rule.** That is the honest number, and it is published
in `sources[].meta` every run. The five, and why each was dropped:

| item | verdict |
|---|---|
| Google's Suncatcher **orbital** data center | in orbit; no US state |
| Google is sending an AI satellite into space | orbital |
| Oracle force majeure on the 2.45 GW Project Jupiter, New Mexico | names a state, but the story is a **financing dispute**, not an announcement — no build verb |
| A CoreWeave-tied data center raised $1.1B in junk bonds | financial; no state |
| Data centers are black boxes, but California wants to change that | **policy**; no build verb |

Every one of those is correctly excluded. A rule that produced a pin from any of
them would be producing fiction.

A news pin, when one does appear, carries `location_precision: "state"` and the
scored news item's `id`. It is one or more published stories saying a company
said it is building something. It is not a permit, not a survey, not an address.

### `fedreg-projects` — measured, gated, currently zero

**Endpoint** `https://www.federalregister.gov/api/v1/documents.json`.

`collector/infra-sources/fedreg-datacenter.mjs` counts documents containing
"data center" and feeds a percentile. That count is a real signal about federal
attention and a **terrible source of pins**, and the titles say why. Of the 437
full-text matches over eighteen months, **four** have the phrase in the title:

| published | agency | title |
|---|---|---|
| 2026-08-21 | Transportation | Information Collection: National Flight **Data Center** Web Portal |
| 2026-04-13 | Health and Human Services | Emergency Medical Services for Children **Data Center** (EDC) |
| 2025-07-28 | Executive Office of the President | Accelerating Federal Permitting of **Data Center** Infrastructure |
| 2025-06-17 | Commerce | NTIA Listening Session on Bolstering **Data Center** Growth |

Two are records systems that happen to be called data centers. Two are policy.
**Not one is a project.**

A first version of this adapter pinned the HHS paediatric emergency data
repository in **Utah** as an announced datacentre. That is a fabrication with a
citation attached — the worst failure available in this dataset — and it is
written down here rather than quietly deleted.

So the source is gated hard: the agency must be one that permits physical
infrastructure (FERC, DOE, EPA, the Corps of Engineers, Interior, BLM,
Reclamation, Agriculture, RUS, BPA, WAPA, NRC), the title must not be an
information-collection notice or a listening session, presidential policy
documents are excluded, and exactly one state must be named. **It yields
nothing today, by design.** It stays wired up because a FERC interconnection
notice naming a datacentre campus is exactly the thing worth catching, and the
day one is published this will catch it. `sources[].meta.title_matches` carries
all four documents every run, so the negative result is visible rather than
merely asserted.

### `sec-operators` — corroboration, never a pin

**Endpoint** `https://efts.sec.gov/LATEST/search-index`, phrase `"data centers"`,
30-day window. Both traps from `collector/infra-sources/_sec.mjs` apply — the
User-Agent must not contain a URL, and the override key must be **lowercase**
`'user-agent'` or undici joins it to the default instead of replacing it — and
the 10,000-hit saturation guard is reused unchanged.

**What does not work, and why it is written down rather than omitted.** EDGAR
returns the filer's name, CIK, form type, filing date, and `biz_locations` —
which is the filer's **registered head office**. Measured 2026-09-24, the top
hits for "data centers" were **Stark Focus Group (Calgary)** and **PRF
Technologies (Tel Aviv)**. Head office is not site. Pinning a datacentre at a
filer's HQ would be fabrication with a citation attached.

**What it does support** is corroboration at the operator level: when a company
that operates sites on this map filed documents mentioning "data centers" in the
last thirty days, that is a real, dated, citable fact about that operator, and
it is attached to their sites as an extra `evidence` entry marked
`kind: "sec_operator"` with the note *"this is about the company, not this
site"*. It adds no pins and moves no pin. Measured 2026-09-24: 2,100-odd filings,
67 distinct filers, **1** matched an operator on the map.

### `tiger-counties` — where every point is

**Endpoint** `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer/13/query`,
the Census Bureau's own public ArcGIS service. No key, no registration.

Every join downstream needs a county. The Drought Monitor is queried by county
FIPS; the grid is a statement about a state; "Abilene, TX" is the sentence the
feature exists to print. OSM only carries `addr:state` on about half of sites.

**Why not a per-point geocoder.** The FCC Area API and the Census coordinate
geocoder both answer this keylessly, and both would need one request per site —
about two thousand on a cold run, every run, forever. Fetching the polygons once
and doing the arithmetic locally is **nine requests every ninety days**.

**Why the geometry is simplified, and what it costs.** Full-resolution county
polygons are 18 MB per 400 counties — about 150 MB for the country, for a
question whose answer changes at the scale of a city block.
`maxAllowableOffset=0.005` degrees (roughly 550 m) brings that to about 2.6 MB
for all 3,235 counties. **The cost is real: a site within a few hundred metres of
a county line can be assigned to the neighbouring county.** A site near a
simplified boundary is flagged `county_boundary_risk: true`.

If the download returns fewer than 3,000 counties the adapter throws rather than
accept a truncated country, because a truncated country silently reports every
site in a missing state as "not in the United States".

### `usgs-gauge-sites`

**Endpoint** `https://waterservices.usgs.gov/nwis/site/`, RDB format, parsed with
`collector/infra-sources/_util.mjs`'s `parseRdb`. Coordinates for the nine gauges
`/watts` already reads, so the nearest one can be computed. Cached 90 days: a
stream gauge is a concrete post in a river.

### `usdm-county`

**Endpoint**
`https://usdmdataservices.unl.edu/api/CountyStatistics/GetDroughtSeverityStatisticsByAreaPercent`

**The trap, inherited verbatim from `collector/infra-sources/usdm-drought.mjs`:**
without an explicit `Accept: application/json` header the service answers **XML
with a 200**, which surfaces as a parse error naming the URL rather than the
cause. `fetchJson` sets it. Do not "simplify" this call into `fetchText`.

Verified 2026-09-24: the service accepts a **comma-separated list** of county
FIPS in one request, so the 286 counties that actually contain a site are
fetched in three batches of 120, not 286 requests. `aoi=48441` (Taylor County,
Texas — Abilene) returned 17.9% D2; `aoi=48113` (Dallas County) returned 88.31%
D3 and 43.28% D4.

A fourteen-day window is requested and the newest map wins, so the answer does
not depend on which day of the week the collector fires. One failed batch does
not take the other batches — or the map — with it.

---

## 3. Sources tested and DROPPED

Published, the way `docs/INFRA.md` §3 publishes its exclusions, because a list
of what was tried is the only evidence that the included list was chosen rather
than assembled.

| candidate | result | verdict |
|---|---|---|
| **Overpass `area["ISO3166-1"="US"]`** | dispatcher timeout | An area lookup for the whole country is far more expensive than three bounding boxes. Boxes plus a county filter give the same answer for less of somebody else's CPU. |
| **Overpass `out geom`** | works, ~10× the payload | Dropped for now. It is the only way to get footprint area and it materially raises the chance of a timeout on a busy server. Revisit when there is a dedicated instance. |
| **Federal Register, as a pin source** | 4 title matches in 18 months, 0 projects | Gated to zero. §2. |
| **SEC EDGAR, as a pin source** | returns the filer's head office | Never a pin. §2. |
| **FCC Area API** / **Census coordinate geocoder** | both work, both keyless | Dropped: one request per site per run. TIGERweb polygons answer the same question in nine requests every ninety days. |
| **ArcGIS Hub search for county permit layers** | HTTP 200, results are user-made StoryMaps | Not an authoritative permit feed. `"Data Center Alley, USA"` and `"Data Center Growth & Effects"` are student projects, not records. |
| **Loudoun County GIS REST root** (`logis.loudoun.gov/loudoungis/rest/services`) | HTTP 404 | No open service at the obvious path. Loudoun is the single highest-value county on earth for this dataset and it is **not covered by a permit feed here**. Worth another attempt with a correct service URL. |
| **ERCOT large-load interconnection queue** | published as a spreadsheet | Not adopted: a binary office format is not parseable under the zero-dependency rule without writing a spreadsheet reader. |

---

## 4. The shape

```jsonc
{
  "schema": 1,
  "generated_at": "2026-09-24T19:22:35.930Z",
  "feeds_main_index": false,
  "sibling": "/watts — collector/infra.mjs; the grids, gauges and drought here are the same readings",
  "infra_generated_at": "2026-09-24T17:19:45.879Z",

  "counts": {
    "sites": 1877,
    "by_status": { "operating": 1769, "under_construction": 95, "announced": 13 },
    "by_state": { "VA": { "total": 407, "operating": 367, "under_construction": 35, "announced": 5 }, … },
    "pinned": 1877,          // have coordinates
    "state_only": 0,         // located to a state, no coordinates
    "with_capacity_tag": 43,
    "tagged_it_power_mw": 2374.6,
    "with_county_drought": 1877,
    "with_grid_reading": 371,
    "with_local_gauge": 625, // nearest gauge within 50 km
    "operator_sec_matches": 1,
    "dropped_outside_us": 81
  },

  "sources": [ … one per adapter, each with state, ms, error and meta … ],
  "grid_table": { … what the state→grid mapping claims … },
  "resources_index": { … see §5 … },
  "copy": { … the words the page says … },
  "honesty": [ … eight sentences, §7 … ],
  "sites": [ … one JSON object per line … ]
}
```

### A site

```jsonc
{
  "id": "dc_7a98d58a6207",          // stable: sha256 of the OSM object ref
  "name": "CloudHQ LC11",
  "operator": "CloudHQ",
  "operator_wikidata": "Q136332516",
  "status": "under_construction",   // operating | under_construction | announced
  "lat": 39.0066448,
  "lon": -77.4776407,
  "location_precision": "building_centroid",  // point | building_centroid | state
  "state": "VA",
  "state_name": "Virginia",
  "county": "Loudoun County",
  "county_fips": "51107",
  "county_boundary_risk": true,     // present only when true
  "grid": "PJM",                    // the grid's public name, or null
  "ref": "LC11",
  "osm": "way/1560822517",
  "capacity": { "it_power_mw": 108, "it_power_raw": "108 MW" },
  "addr": { "city": "Ashburn", "state": "VA", "postcode": "20147" },
  "evidence": [
    { "kind": "osm", "tag": "telecom=data_center",
      "status_tag": "building=construction",
      "ref": "way/1560822517",
      "url": "https://www.openstreetmap.org/way/1560822517" }
  ],
  "confidence": "high",             // high | medium | low
  "sources": ["osm-overpass"],
  "first_seen_at": "2026-09-24T19:22:35.930Z",
  "resources": {
    "drought":    { "granularity": "county", "county_fips": "51107" },
    "streamflow": { "site": "01644000", "distance_km": 8.7, "relevance": "local" },
    "grid":       { "key": "PJM", "id": "PJM" }
  },
  "sentence": "Loudoun County, VA · PJM · 88.2% of the county in D1 · nearest gauge Goose Creek near Leesburg, 8.7 km"
}
```

**Fields that never drop**, even when null: `id`, `name`, `operator`, `status`,
`lat`, `lon`, `state`, `county`, `grid`, `evidence`, `confidence`, `resources`,
`sentence`. Everything else is omitted when it carries no information, because
this file is committed and a million committed nulls are a million committed
nulls.

**`confidence`** is a statement about the *record*, not about the building:

| | |
|---|---|
| `high` | named, with an operator, and carrying a capacity tag |
| `medium` | named, with an operator |
| `low` | a mapped polygon with no name or no operator, or a single unconfirmed announcement |

**`sites` is written one object per line.** Fully indented the file is 3.1 MB of
mostly whitespace and a single retagged building produces a diff spread over
forty lines. One line per site is 1.8 MB and makes `git diff` say exactly which
buildings changed.

---

## 5. `resources_index` — and why a pin does not carry its own numbers

A pin holds join **keys** and the one number that is genuinely its own: the
distance to the nearest gauge. Everything else lives once, at the top of the
file.

```jsonc
"resources_index": {
  "drought_by_county": {
    "51107": { "county": "Loudoun County", "state": "VA", "map_date": "2026-09-22",
               "headline": { "category": "D1", "area_pct": 88.2 },
               "area_pct": { "none": 0, "d0": 100, "d1": 88.2, "d2": 0, "d3": 0, "d4": 0 } }
  },
  "drought_by_state": { "TX": { … the ten states /watts reads … } },
  "gauges": {
    "01644000": { "site": "01644000", "name": "Goose Creek near Leesburg",
                  "cluster": "Loudoun County", "percent_of_normal": 1344.1,
                  "deficit_pct": -1244.1, "flow_cfs": 457, "normal_cfs": 34,
                  "reading_day": "2026-09-23", "reading_state": "live" }
  },
  "grids": {
    "ERCOT": { "id": "ERCOT", "label": "ERCOT", "watts_source": "ercot-tightness",
               "why_no_reading": null,
               "reading": { "source": "ercot-tightness", "label": "ERCOT headroom used",
                            "value": 71.56, "unit": "% of committed capacity",
                            "observed_at": "2026-09-24T17:15:00.000Z",
                            "state": "awaiting-baseline", "score": null } },
    "PJM":   { "id": "PJM", "label": "PJM", "watts_source": null, "reading": null,
               "why_no_reading": "PJM publishes real-time demand only through Data Miner 2, which requires a registered subscription key. Keys are free; secrets in this repo are not permitted." }
  },
  "usdm_map_date": "2026-09-22", "usdm_state": "live",
  "usgs_reading_day": "2026-09-23", "usgs_state": "live"
}
```

**This is not tidiness.** `data/datacenters.json` is committed. If every one of
1,877 pins carried a copy of its county's drought row, its gauge's flow and its
grid's current megawatts, then a grid reading that moves **every five minutes**
would rewrite the entire file every single run, forever. Normalised, the pins
change when OpenStreetMap changes — about once a week — and the volatile numbers
change in a block of about three hundred lines.

It is also why **`site.sentence` deliberately omits the live grid number.**
"ERCOT, 71.6% of committed capacity" is the sentence this feature exists to
print, and the 71.6 is five minutes old. The page composes it:

> `site.sentence`, then — where `resources_index.grids[site.resources.grid.key].reading`
> exists — `", "` plus that reading's value and unit, **carrying its state tag**
> (`live`, `awaiting-baseline`, `dark`) so a number awaiting its baseline is
> never printed as a scored one.

That recipe is also in `copy.sentence_recipe` in the JSON, so the page and this
document cannot drift.

### The grid mapping

`collector/dc-sources/_grid.mjs`. **It must agree with `CORRIDORS` in
`site/templates/wattsPage.mjs`** — same three grids with a live feed, same five
reasons the others have none, in the same words. If the two diverge, the map is
lying about the page next door.

**A balancing authority is not a state, and this table pretends it is.** The
errors that matter are named and excluded by county FIPS rather than answered
wrongly:

- **ERCOT** carries about nine tenths of Texas load and none of El Paso and
  Hudspeth (WECC — not even the same interconnection), none of the far north
  Panhandle (SPP), and none of the far east or Texarkana (MISO). Those counties
  get `grid: null` with the reason.
- **CAISO** does not balance Los Angeles (LADWP), Sacramento (SMUD) or Imperial
  (IID). Those three counties get `grid: null` with the reason.
- **NYISO** is the whole state. This one is clean.

Everything else carries a named operator and an explicit reason there is no
reading. A blank cell reads as an oversight; a named wall reads as a boundary of
the instrument.

### The three states, kept apart

Exactly as `docs/INFRA.md` §4 requires, and at every level:

| state | means | printed as a number? |
|---|---|---|
| `live` | the feed answered and the reading is scored | yes, with its score |
| `awaiting-baseline` | the feed answered, the number is real, there is not yet enough history to say where it sits | **yes, and labelled** — never with a score |
| `dark` | the fetch failed; the reason is printed | **no**, and nothing is imputed |

Four of the nine `/watts` sources — the grid ones — read `awaiting-baseline` for
their first thirty days. `resources_index.grids.*.reading.state` carries that
straight through to the pin. A pin must never print an awaiting-baseline number
as though it were scored.

---

## 6. What happens to a point outside the United States

The three Overpass boxes necessarily include Canada, Mexico and the Caribbean.
A point that is inside no US county is not in the United States and is dropped;
**81 were dropped** on the 2026-09-24 run. One mechanism doing two jobs is
better than two mechanisms disagreeing.

When the county index itself is dark, sites are **kept** with an unresolved
state rather than deleted, because a geocoding outage must not empty the map.

---

## 7. Limitations — blunt

The eight sentences below are in `honesty[]` in the JSON and the page prints
them.

1. **OpenStreetMap coverage is uneven and volunteer-maintained.** A datacentre
   missing from this map means nobody mapped it. It does not mean the datacentre
   is not there. Virginia has 407 pins and Wyoming has 23; some of that is the
   build-out and some of it is who maps.
2. **Capacity tags are rare: 43 of 1,877 sites carry one**, totalling 2,374.6 MW
   of tagged IT power. Any sum over this dataset is a sum over 2% of it.
3. **Nothing here measures a datacentre's power or water draw.** Not published,
   anywhere, at any cadence, for any site.
4. **"Operating" means the building exists**, not that there are servers in it
   and they are on. A decommissioned datacentre keeps its tag until somebody
   visits.
5. **Drought figures are the share of a county's AREA in a category.** A county
   20% in D3 does not say which 20%. And the Drought Monitor is a weekly expert
   judgement by NDMC, USDA and NOAA — not an instrument reading.
6. **The nearest river gauge is one of only nine.** 625 of 1,877 sites have one
   within 50 km; the rest are `regional` or `distant`. Every pin carries the
   distance, because a gauge 800 km away describes a different watershed. Napa
   County's nearest is The Dalles, 822 km up the Columbia, and the pin says so.
7. **Counties are assigned from polygons simplified to about 550 m.** A site on
   a county line can land in the neighbouring county; those carry
   `county_boundary_risk: true`.
8. **The announced half is thin, and the reason is structural.** The newsroom is
   a rolling 200-item window and the Federal Register names no projects. Thirteen
   announced pins today, all of them from OSM `proposed:*` tags. The ledger grows
   one pin at a time and does not forget; it will take months to be interesting,
   and inventing pins to fill it faster is the one thing that is not available.

Plus, not in `honesty[]` because it is about the code rather than the data: **two
of the six sources share one host** (`efts.sec.gov`), and the whole existing half
of the map depends on Overpass. The mirror list is the only redundancy there is.

---

## 8. Scheduling — read this before wiring it in

The site rebuilds from `main` every minute. **`collector/datacenters.mjs` must
not run in that loop.** If it did, and `data/dc-cache/` were cold, it would hit
Overpass every sixty seconds, which would get this project's User-Agent banned
and would deserve it.

Two requirements:

1. **Run it on its own schedule, daily at most.** The internal cache already
   refuses to re-query Overpass more than weekly, but that only works if the
   cache survives.
2. **`data/dc-cache/` must be committed.** GitHub Actions runners are ephemeral.
   An uncommitted cache is a cold cache on every run, and a cold cache means a
   live Overpass query on every run. The directory is 3.1 MB
   (`tiger-counties.json` 2.6 MB, `osm-datacenters.json` 0.6 MB, gauge sites
   1 KB) and changes weekly at most. It is build input, it is the failure plan,
   and it must be in the repository.

`site/build.mjs` reads `data/datacenters.json` and nothing else from here.
