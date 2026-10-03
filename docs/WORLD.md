# WORLD — every mapped datacentre on Earth, and what is in orbit

**Route:** `/world.html` · **Collector:** `collector/world.mjs` · **Output:** `data/world.json`

Built from `collector/dc-sources/osm-world.mjs` (the harvest) and
`collector/dc-sources/_country.mjs` (the country attribution). The land it is
drawn on is `data/world-outline.json`, made once by
`collector/tools/world-outline.mjs`. The register under the map is
`data/orbital.json`, compiled by hand, one sourced row at a time.

```
docker run --rm --network host -v "$PWD":/app -w /app node:20-alpine \
  node collector/world.mjs              # --refresh ignores the cache age
```

---

## 1. What this is

`/map` with the border taken away. `/map` is the United States, and every pin
on it is joined to a county, a drought category, a grid and a river gauge. None
of those joins exist for the rest of the planet, so this page does the smaller,
simpler thing for all of it: where has anybody written a datacentre into
OpenStreetMap, what state does the tag say it is in, and which country is it in.
It draws, it attributes, and it counts.

Under the map sits the same question asked one layer up — where is the compute
physically — for hardware in orbit, where the ratio of press release to
hardware is far worse. That is the orbital register, §6.

It is a sibling of `collector/datacenters.mjs`, not a replacement, and it never
touches the US pipeline. **It does not feed the DOOMCON index**, has no route
into it, and `collector/engine.mjs` does not read any of its files.

The page is ordered the way `/map` and `/flock` are, for the same reason. What
was counted, then **what the blank means**, then the map — the caveat sits above
the picture, before a reader has had the chance to form the wrong idea — then
the ranked country table, the orbital register, the limits, the method and the
data.

---

## 2. The honesty bar

### Every number is a count of what has been MAPPED

`data/world.json` does not count datacentres. It counts map objects carrying a
datacentre tag in OpenStreetMap on the day OSM was read: **5,280, as mapped in
OpenStreetMap on 2026-10-03**. Those are different quantities.

Every headline figure carries that qualifier. It is precomputed at
`copy.headline_qualifier` so no renderer has to remember it — the nav tile's
screen-reader label carries it too — and `copy.never_say` names the phrase that
is forbidden: *"the number of datacentres in the world"*.

### A country with none mapped is a country nobody has mapped

Printed verbatim from `copy.what_zero_means`, above the map and again in the
site footer on `/world.html`:

> A country with no mapped datacentre is a country nobody has mapped. It is not
> a country with no datacentres, and this data cannot tell those two apart.

On the 2026-10-03 harvest, 113 country codes have a mapped site and 124 have
none, and `totals.countries_in_roster` is 237 — the distinct codes, not the 239
Natural Earth features that carry one, so the two halves add up to the whole.
The page names every outline it draws blank, because the blank is the finding,
and says the 124 are *outside* the ranking rather than at the bottom of it.

### Coverage follows volunteers, not deployments

A dense country is a country somebody mapped. The United States carries 2,041
of the 5,280; France 381, Germany 324, the United Kingdom 311. Some of that is
the build-out and some of it is who maps, and nothing in this data separates
the two. The ranking says so in its own lede.

### Unresolved is published, never guessed

Each site gets its country by point-in-polygon (§5). On the 2026-10-03 run:

| attributed by | sites |
|---|---|
| polygon | 5,196 |
| its own `addr:country` tag, having fallen in no polygon | 5 |
| **unresolved** — neither | **79** |

The 79 are real map objects at real coordinates. They are drawn where they are,
with no country in the popup, counted in their own table row, and never
assigned to the nearest country. A site whose `addr:country` tag disagrees with
the polygon it fell in keeps the polygon's answer and carries
`tag_disagrees: true` (1 site).

### Missing fields print as missing

A site with no `name` is *unnamed in OpenStreetMap*; no `operator` is *operator
not recorded*. A total absent from the payload prints as a dash or as *not
published* — never as zero, never as the length of some other array standing
in for it. The nav tile follows the same rule: no `totals.sites`, no figure.

---

## 3. Licence

OpenStreetMap data is published under the **Open Database License (ODbL) v1.0**,
and attribution is a term of that licence, not a courtesy. The payload carries
it at `copy.attribution_required` (*© OpenStreetMap contributors*) and
`copy.attribution_url`. The page prints it in the map caption, the method
section and its closing line; the site footer carries its own copy on
`/world.html`, printed from the same payload, so the condition is met by the
chrome even if an edit to the page body drops it. `site/build.mjs` fails the
build if the attribution is not present as text in `world.html`.

Natural Earth is public domain and needs no credit. The page credits it anyway,
from `copy.outline_credit`.

---

## 4. The query

**One request, planet-wide, no bounding box.** A tag-value lookup with no bbox
hits Overpass's index and touches almost nothing; the Overpass commons names
"stitching bounding boxes to scrape the full world" as the anti-pattern. This
is the exact query, as published in `source.query_template`:

```
[out:json][timeout:600];
(
  nwr["telecom"="data_center"];
  nwr["telecom"="data_centre"];
  nwr["building"="data_center"];
  nwr["building:use"="data_center"];
  nwr["industrial"="data_centre"];
  nwr["industrial"="data_center"];
  nwr["industrial"="datacenter"];
  nwr["man_made"="data_center"];
  nwr["construction:telecom"="data_center"];
  nwr["construction"="data_center"];
  nwr["construction"="datacenter"];
  nwr["construction"="data_centre"];
  nwr["proposed:telecom"="data_center"];
  nwr["proposed:building"="data_center"];
  nwr["planned:telecom"="data_center"];
  nwr["planned:industrial"="datacenter"];
);
out tags center qt;
```

**Why sixteen variants.** Read from taginfo, not guessed. On the 2026-10-03
harvest the seven `/map` asks for miss 274 real sites worldwide (5.2%), 248 of
them `industrial=data_centre` — the Commonwealth spelling lives there.
`landuse=data_center`, which `/map` does ask for, has zero objects on the
planet. The order is fixed so the query string, which is published, is
byte-identical every run.

**Measured** 2026-09-25 against overpass-api.de: HTTP 200 in 66 s, 1.86 MB,
5,270 elements. The 2026-10-03 harvest returned 5,280 in 1,859,818 bytes, every
one with a usable coordinate from `out center`, and none without tags.

**Status is read from the tags**, the same three words and marks `/map` uses,
and the tag that decided it is kept beside the verdict in `because`:

| OSM | status | mark |
|---|---|---|
| `construction:telecom` or `construction` = a datacentre value | `under_construction` | ▲ |
| any `proposed:*` or `planned:*` variant above | `announced` | ◇ |
| any other variant above | `operating` | ● |

A tag nobody has updated since the building opened still reads
*under construction*. "Operating" means an object with the tag exists, not that
anything runs in it.

**Politeness.** The request goes through `overpassAsk` in
`collector/dc-sources/osm-flock.mjs`: it asks `/api/status` for a free slot
before knocking, waits rather than hammers, and walks three instances
(overpass-api.de, overpass.kumi.systems, overpass.private.coffee), four
attempts each. The main instance was answering 504 to planet queries on
2026-09-27; that is what the mirrors and the cache are for.

**Refusal.** Under 3,000 sites is a broken query or a struggling server, not a
planet that emptied out, and the collector writes nothing. No country index at
all — every site would be unresolved — also writes nothing.

---

## 5. Two outline datasets, two jobs

**Attribution: Natural Earth 1:50m admin-0.** `_country.mjs` fetches
`ne_50m_admin_0_countries.geojson` pinned to release v5.1.2, so the bytes cannot
move under us; 242 country features, cached 90 days in
`data/dc-cache/ne-countries-50m.json`. **Not 1:110m, because 1:110m has no
Singapore polygon.** Measured 2026-09-25: every Singapore-tagged datacentre —
47 then, 92 on the 2026-10-03 harvest — would have landed in Malaysia, and
nothing downstream would have noticed.

**Drawing: Natural Earth 1:110m admin-0.** `data/world-outline.json`, 96,497
bytes: 177 countries, 287 rings, 5,481 vertices after Visvalingam-Whyatt
simplification (minimum triangle 0.2 deg²), rings under 0.02 deg² dropped
unless they are all a country has, coordinates quantised to 0.01°. Projected
Equal Earth, so Greenland is not drawn the size of Africa; framed from 57°S to
84°N, which drops Antarctica by geometry and says so in words.

**Drawing is not attribution.** A pin's country came from the finer file; the
coarser one is only the picture under it. The two disagree at the edges, and
the page says where: on the 2026-10-03 harvest 7 countries with a mapped site
have no 1:110m outline, and
their pins are drawn at their coordinates over sea — Singapore (92), Hong Kong
(6), Bahrain (4), Isle of Man (2), Curaçao, the Faroe Islands and Mauritius
(1 each). Taiwan was an eighth until the outline file and the attribution agreed
on its code; it is drawn, and it is ranked with 11.

**The border flag.** 1:50m polygons are generalised to about a kilometre, so a
site near a land border can be assigned to the neighbour. `boundary_risk` marks
those: `_country.mjs` steps 0.02° out from the site on eight compass bearings and
asks the same polygons what is there, and the flag is set when any of the eight
lands in a different country. A step into the sea is not a border and is not
flagged, because the claim the flag makes is "could belong to the neighbour", and
the sea has no neighbour. 25 sites carry it on the 2026-10-03 harvest.

---

## 6. The orbital register

`data/orbital.json`: fifteen programmes that claim, file for, or have flown
computing hardware in orbit or on the Moon described as a data centre. **Each
row separates what is in space from what has been announced or filed**, with
the sources for both, and the page prints the two numbers together everywhere
either appears. The second number printed alone is a press release.

### Status vocabulary

Six words, defined in the payload at `status_words` and printed beside every
row:

| status | means |
|---|---|
| `operating` | hardware in orbit and reported working |
| `demonstrated` | hardware flew and did something, and is not operating now or is a hosted prototype |
| `awaiting-launch` | built, manifested, not yet flown |
| `announced` | a filing, a funding round or a plan; nothing flown under this programme |
| `study` | a paper study; no hardware built |
| `unclear` | a filing or a service whose relation to computing in space is not established |

A launch is not commissioning and commissioning is not first inference: a row
moves to `operating` only when a source reports the hardware working.
`confidence` is `verified`, `probable` or `unverified`, per row.

### No imputation

- `in_orbit_spacecraft` and `filed_or_planned_satellites` are separate fields
  and are never merged. A `null` filing prints as *no number filed*; it is not a
  zero and nothing is estimated for it.
- Totals are sums over the rows that published a number: 23 spacecraft in
  orbit carrying compute, against 1,142,481 satellites filed or planned for it
  — 49,673 on paper for every one flying.
- A hosted payload is not a second spacecraft. Axiom's two nodes ride on
  Kepler's ten and count once.
- Where the purpose of a filing is not established (`purpose_established:
  false` — CTC-1/2, Space Compass), its satellites go to
  `filed_purpose_unknown` (193,428), never to the compute total.
- Where sources disagree, the row says so rather than choosing.

**Nothing refreshes it automatically.** There is no collector: every figure is
from a linked source and changing one is an edit with its source attached. The
page prints the register's own `as_of_date` (2026-09-27), and that date is the
claim.

---

## 7. The endpoints

| endpoint | what | bytes |
|---|---|---|
| `/api/world.json` | `data/world.json`, byte for byte | 2,228,040 |
| `/api/orbital.json` | `data/orbital.json`, byte for byte | 22,812 |

**Verbatim, never re-serialised.** `collector/world.mjs` writes canonical,
key-sorted JSON with one site per line, 6,623 lines. Through `stableJson` every
site object would be re-indented onto its own lines — 2,888,040 bytes in 91,103
lines — without one value changing. `orbital.json` happens to be byte-identical
through `stableJson` today and is copied verbatim anyway, so "the checksum of
the file in the repository is the checksum of the file served here", which the
page's *Take the data* section says, is true by construction.

`world.json` carries the totals, the per-country rows, the copy block, the
honesty list, the query, the geography metadata, and every site with `id`,
`lat`, `lon`, `status`, `because`, `name`, `operator`, `city`, `country`,
`country_name`, `continent`, `attributed_by`, `boundary_risk`, `tag_disagrees`
and its OpenStreetMap `url`.

Both files are written **only when the route is**, and the footer's Data column
links them on the same flag, so a link cannot outlive its file.
`/api/orbital.json` also needs a register that parsed. Neither is listed in
`/api/index.json`, which does not list the `/flock` endpoints either.
`data/world-outline.json` is build input and is not published: it is a
simplification of a public-domain file anyone can fetch at full resolution.

---

## 8. What is deliberately not done

**No basemap.** No tiles, no tile server, no third-party request from the
page. The outlines are the only land, every pin is one size and one colour, and
a blank country is visibly blank rather than covered in somebody else's
labels. The map and every figure are in the HTML before any script runs; at
phone width the map waits for the script that makes it pinch-zoomable, and the
country table stands in for it.

**No resource joins.** No drought, no grid, no river gauge, no capacity — none
of those joins exist outside the United States. A pin's popup names the site,
its operator, its status and its place, and says nothing about water, power or
capacity, rather than print three true sentences that read as three failures
under every pin.

**The United States figure is not `/map`'s, and neither is adjusted toward the
other.** 2,041 here against 1,877 on `/map`. Three reasons, measured:

1. **The tag set.** 166 of the 2,041 match only variants `/map` does not ask
   for — 154 of them `industrial=data_centre`. The other 1,875 match a variant
   both queries share.
2. **The filter.** `/map` keeps only what it can place in a US county from
   TIGER and joins it to more data; 81 points fell in no county on its
   2026-09-24 run and were dropped. This page attributes by Natural Earth
   polygon and keeps the unresolved.
3. **The date.** `/map`'s harvest was fetched 2026-09-24; this one on
   2026-10-03.

Reconciling the two would mean inventing a number. Both pages print theirs and
say why they differ.

**No time series.** A snapshot. Nothing here says when a datacentre opened or
whether anything runs in it, only that an object with the tag exists.

**No capacity, power or area.** OpenStreetMap rarely carries the first and never
the other two for a site.

**No density ranking.** Sites per capita or per square kilometre would be a
ratio of mapping effort dressed as a finding. The table ranks raw counts.

---

## 9. Cadence, caches and the build

**In CI.** `.github/workflows/collect.yml` runs `collector/world.mjs` in the
hourly full lane, after the US map and before the build, with the same failure
posture — `continue-on-error: true` — and one addition: `timeout 480`. The
mirror walk in §4 can take hours on a bad Overpass day, the job's budget is
25 minutes, and a cold cache must cost `/world` one refresh rather than cancel
the build and publish that follow. The collector writes `data/world.json` last
and only on success, so a killed run leaves the previous file standing.

**The caches must be committed.** `data/dc-cache/osm-datacenters-world.json`
(the reduced harvest, 7 days) and `data/dc-cache/ne-countries-50m.json` (the
polygons, 90 days), about 3.7 MB together. The commit step's `git add data`
picks them up with `data/world.json`, exactly as it picks up the US map's
cache, so the first CI run persists whatever it had to fetch. An uncommitted
cache is a cold cache on every runner.

**What "7 days" really means on a runner.** It now means seven days. Until
2026-10-03 `_cache.mjs` measured a cache's age from the file's mtime, and
`actions/checkout` writes every tracked file at checkout time — so a committed
cache always read as fresh in CI and no window ever elapsed there. The evidence
was in the output: `data/datacenters.json` built by CI at 2026-09-28T02:22Z
reported its Overpass cache as `origin: cache, age_days: 0` while that harvest's
own `fetched_at` said 2026-09-24T19:18:48Z. The 7-day harvest window and the
90-day outline window were both dead letters on a runner; only a missing file
ever caused a refresh.

The fix is that the fetch time travels **inside** the cached value.
`writeCache()` stamps every cache document with `fetched_at` — keeping a
loader's own stamp when it sets one, which `osm-overpass`, `tiger-counties` and
`usgs-gauge-sites` always did — and `cacheAgeDays()` reads that stamp, falling
back to mtime only for a legacy file written before this change. Checkout can
rewrite every mtime in the tree and the age does not move.

So **CI re-harvests on its own**, about once a week for the planet query and
once a quarter for the outlines, in whichever hourly full-lane run first crosses
the window; the commit step's `git add data` persists the newly stamped file, so
the following runs are cache hits again. `--refresh` is still there for a local
forced harvest, and is no longer the only thing that can cause one. A warm run
still costs about a second with no network at all (verified with the network
switched off), and a cold one is bounded by the step's `timeout 480`.

**`data/world.json` still changes every run**, because `generated_at` does, and
`harvest_origin` and the geography's `origin` flip between `network` and
`cache`. The sites and counts do not move until the harvest does.

**The build.** `site/build.mjs` imports `worldPage.mjs` dynamically, as it does
`/flock`'s and `/exploits`' templates: absent is silent, broken is logged loudly,
and every other page still builds. `ctx.routes.world` is set once, from the
template having loaded and from `hasWorldData(ctx)` — the sites, the totals, the
ODbL attribution and the outline; not the register, which is one section of the
page. That predicate exists three times, in `build.mjs`, in `worldPage.mjs` and
in `layout.mjs`'s `hasSection('world')`, and they must move together; the build
logs a line when its copy and the template's disagree. The same flag writes
`world.html`, its `/world/` alias, both endpoints, the sitemap entry (weekly,
because the harvest refreshes weekly at most) and the nav tile.

---

## 10. Defects found, and what fixed them

Three, found while wiring the page on 2026-09-28 and fixed on 2026-10-03. None
was in the wiring. Each is kept here because the figures on the page moved when
it was fixed, and a reader comparing an older build needs to know why.

**None open.**

1. **Australia was named "Ashmore and Cartier Islands".** Natural Earth 1:50m
   has three features whose ISO-2 is `AU` — Ashmore and Cartier Islands,
   Australia, and the Indian Ocean Territories. `_country.mjs` sorts features by
   ISO-3, `ATC` before `AUS`, and `collector/world.mjs` named each code from the
   first feature it met with that code, so the row and every Australian pin's
   popup carried the name of an uninhabited reef. The attribution was never
   wrong; only the name was.

   `_country.mjs` now publishes two fields per feature: `primary`, true when the
   feature's own plain `ISO_A2` equals the code it resolved to — a dependency
   carries `-99` there and borrows the code through `ISO_A2_EH`, so only the
   sovereign feature is primary — and `extent`, its bounding box in square
   degrees, which breaks a tie when neither feature is primary. `world.mjs` names
   each code from that feature. The polygons are untouched: all three features
   still resolve points, so a site on Ashmore is still found.

   The same triple made `countries_in_roster` count features rather than codes.
   239 of Natural Earth's 242 features carry a valid ISO-2 and 237 codes are
   distinct, so the roster said 239 while 113 with a site and 124 without came
   to 237 — and the page prints both halves of that sum. It is now
   `byIso.size`: 237.

2. **Taiwan was listed both as ranked and as blank.**
   `collector/tools/world-outline.mjs` took `ISO_A2` before `ISO_A2_EH`, and
   Natural Earth v5 sets Taiwan's `ISO_A2` to `CN-TW`, so the outline file
   carried `CN-TW` while the attribution carried `TW`. The page said Taiwan had
   no 1:110m outline, which it has and which its 11 pins sit on, and named it
   among the outlines "drawn, with no mapped site" while the table ranked it.

   The tool now picks the code the way `_country.mjs` does: `ISO_A2_EH`, then
   `ISO_A2`, then `WB_A2`, each only if it matches `/^[A-Z]{2}$/`. The
   regenerated `data/world-outline.json` differs from its predecessor in exactly
   one value — `countries[153].iso2`, `CN-TW` to `TW` — which is the test that
   the rule changed the code and nothing else: no vertex, no ring, no count.
   `/world` now lists 7 countries with a mapped site and no outline, not 8.

3. **`boundary_risk` counted bounding boxes, not borders.** It tested whether a
   site was within 0.02° of the edge of its country's bounding box. For any
   country with overseas territory that box is a rectangle out at sea with no
   border on it — France's reaches past Kourou, the United States' past Guam —
   so 5,196 polygon-attributed sites produced 3 flags, and the honesty line in
   `data/world.json` said 3 sites sit within about 2 km of a border.

   `countryIndex()` now steps 0.02° out from the site on eight compass bearings,
   the diagonals at 0.02/√2 per axis so all eight sit the same distance out, and
   asks the same 1:50m polygons what is there. A probe that lands in a different
   country sets the flag; one that lands in the sea does not, because the sea is
   not a neighbour. Country identity is the ISO-2 code, falling back to the
   ISO-3 for the handful of features that carry `-99` in all three code fields,
   so a step from the Australian mainland onto Ashmore is not a border crossing.
   25 sites carry the flag, which is what the eight-point probe measured before
   the fix; 28 changed state, the 25 plus the 3 bounding-box artefacts that fell
   away. The honesty line and the table's per-country column read from the same
   count.
