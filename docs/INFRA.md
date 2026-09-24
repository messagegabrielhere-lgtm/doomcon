# The infrastructure index

`collector/infra.mjs` → `data/infra.json` → `site/templates/infraPage.mjs` → `/infra.html`

A DOOMCON sub-index pointed at the physical substrate: power, water, and the
paper trail of the build-out. It is `docs/SUB-INDICES.md` §3 `/watts`, built.

**It does not feed the main index and never will unless its sources enter the
frozen reference distribution.** `collector/engine.mjs` does not read
`data/infra.json`. A page can be interesting without being load-bearing, and
conflating the two is how an index quietly becomes a vibe.

---

## 0. The claim, and the exact size of it

The pitch is good: you cannot train a frontier model without electricity, water
and concrete; weights can be kept secret and a gigawatt cannot. That is true and
it is why this page exists.

The honest version is much smaller, and it is printed third on the page, above
every chart, before a reader has had a chance to form the wrong idea:

> Nothing here measures datacentre power or datacentre water. No public feed
> separates datacentre load from any other industrial load, and no arithmetic
> downstream can recover a split the input never contained. What is measured is
> the **condition of the substrate** those datacentres are being built into.

A rising overnight floor in Texas is consistent with a new training cluster. It
is equally consistent with a new smelter, a cold snap, an electrified rail yard,
or a methodology change at the grid operator. **Correlation here is a hypothesis
this index states and has not proved.**

This is also why pizzint's gay-bar theory is the wrong model to copy and the
right model to learn from. Their claim — quiet venues mean people are working
late — is unfalsifiable in principle. Ours is a physical constraint, which is
better, and it is measured through a proxy so noisy that the constraint mostly
does not show. Publishing the size of that gap is the whole difference between
an instrument and a conspiracy chart.

---

## 1. The scale

**SUBSTRATE 5 → 1**, on `docs/CONTRACT.md`'s bands, with its own names so it is
never mistaken for a DOOMCON level.

| level | name | band | means |
|---|---|---|---|
| 5 | SLACK | 0–34 | the quiet end of this index's own record |
| 4 | STEADY | 35–54 | ordinary; where most observations sit |
| 3 | LOADED | 55–69 | above the middle on more than one pillar |
| 2 | STRAINED | 70–84 | near the top of what this index has observed |
| 1 | MAXIMAL | 85–100 | at the top of the record |

Every one of those glosses is a statement about **our own sample**, not about
the world. SUBSTRATE 2 does not mean the grid is in trouble. A young index has a
short record, and a short record makes every reading look more ordinary than it
may be. That is stated on the page, in the "what this cannot tell you" list.

### Three pillars

| id | name | measures |
|---|---|---|
| `grid` | The grid | how much load never switches off, and how little slack is left over it |
| `water` | The water | the state of the rivers and the ground the clusters were built beside |
| `buildout` | The build-out | what companies had to write down, and what the government had to publish |

---

## 2. Every source

Nine adapters, three pillars, **zero API keys**. Every endpoint was fetched and
parsed during development; the measured table in §7 is real output, not an
example.

### `grid`

#### `ercot-baseload` — ERCOT overnight floor, MW
- **Endpoint** `https://www.ercot.com/api/1/services/read/dashboards/fuel-mix.json`
- **Formula** For the most recent local day with a complete 00:00–06:00 CT
  window (≥ 70 of 72 five-minute intervals), sum generation across all eight
  fuel categories at each interval, and take the minimum.
- **Direction** higher = more load that never switches off.
- **Why the floor** Instantaneous demand is mostly a statement about the weather
  and the hour. The overnight trough is what remains once air conditioning,
  offices and traffic have gone home, and a datacentre is one of very few large
  loads that runs flat out at four in the morning. It is the cleanest public
  proxy for always-on industrial demand available without a utility contract.
- **Why `fuel-mix` and not `supply-demand`** `supply-demand.json` carries
  `demand` directly, which is the obvious read, but it publishes only the
  current local day. Before 06:00 Central there is no complete overnight window
  in it and the source would go dark six hours out of every twenty-four.
  `fuel-mix.json` carries yesterday too, so a complete window always exists.
- **Storage sign** `Power Storage` is negative while batteries charge, and that
  negative is kept. A charging battery is a load on the grid at that instant.
- **Baseline** none from the feed (two days only) → accumulated.

#### `ercot-tightness` — % of committed capacity in use
- **Endpoint** `https://www.ercot.com/api/1/services/read/dashboards/supply-demand.json`
- **Formula** `100 × demand ÷ capacity` at the newest interval carrying both.
  Rejected if outside (0, 100].
- **Direction** higher = less slack.
- **Why it is the closest thing to "power outages"** A blackout is not a signal
  you can watch build; by the time an outage is reportable the interesting part
  is over. The margin disappearing beforehand is published every five minutes
  for free.
- **The caveat** `capacity` is **committed** capacity, not installed capacity.
  ERCOT commits units to follow expected load, so the denominator chases the
  numerator and the ratio is flatter than the underlying physical margin. It
  moves sharply when the fleet cannot follow, and barely at all otherwise.
- **Enrichment, never scored** `daily-prc.json` (Physical Responsive
  Capability — the megawatts that would arrest a frequency fall right now, and
  the quantity ERCOT's own emergency ladder is defined against) is read
  best-effort into `meta.prc`, along with ERCOT's own words for its own grid.
  If that second fetch fails the reading still publishes and `meta.prc.error`
  says why. A second endpoint is a second way to go dark and it must not be able
  to take the scalar with it.
- **Baseline** none from the feed → accumulated.

#### `nyiso-baseload` — NYISO overnight floor, MW
- **Endpoint** `https://mis.nyiso.com/public/csv/pal/<YYYYMMDD>pal.csv`
  (today; yesterday only if today's window is not yet whole — two requests worst
  case). The file is named for the **Eastern** day it covers, so the name is
  derived in Eastern time.
- **Formula** Sum all **eleven** load zones at each timestamp inside
  00:00–06:00 ET, discard any timestamp missing a zone, take the minimum of the
  rest. ≥ 66 of 72 intervals required.
- **Why every zone or none** A timestamp summed short is a silent 1,900 MW drop
  the night Long Island's row is late, published as a quiet night in New York.
  An empty `Load` cell is a blank, and `Number('') === 0` would put New York
  City's 4,800 MW at zero.
- **Role** This is a **reference region**, not a subject. It is a large, mature,
  well-instrumented grid with comparatively little of the 2020s build. If Texas
  climbs and New York does not, the divergence is informative. If both climb,
  the honest reading is that something national is happening. An index with no
  control region cannot tell those apart and should not pretend to.
- **Baseline** none from the feed → accumulated.

#### `caiso-baseload` — CAISO overnight floor, MW
- **Endpoint** `https://www.caiso.com/outlook/current/demand.csv`
- **Formula** Minimum of the `Current demand` column over 00:00–05:55 PT, ≥ 68
  of 72 intervals required.
- **Role** The second reference region. Old datacentre stock, and the most solar
  in North America, so its load shape is unlike anywhere else.
- **THE KNOWN SIX-HOUR HOLE** CAISO publishes the current Pacific day only and
  there is no dated archive path on that host (both `/outlook/<YYYYMMDD>/…`
  forms return 404, checked 2026-09-23). Between 00:00 and roughly 06:00 Pacific
  — 07:00 to 13:00 UTC — no complete overnight window exists anywhere in the
  feed and **this source reports DARK, by design**, with an error message that
  says which of the two causes it is. The alternative is publishing the minimum
  of a two-hour window as though it were a six-hour one, which prints a higher
  floor every morning and calls it a trend.
- **The other quirk** The CSV carries times but no date, so the Pacific calendar
  day is derived from the run clock and `observed_at` is the run instant. Both
  facts are recorded in `meta` rather than implied.
- **Baseline** none from the feed → accumulated.

### `water`

#### `usgs-water-deficit` — % below normal, median of nine gauges
- **Endpoints**
  - `https://waterservices.usgs.gov/nwis/dv/` — daily mean discharge
    (`parameterCd=00060`, `statCd=00003`), three-year window, nine sites.
  - `https://waterservices.usgs.gov/nwis/stat/` — `statReportType=daily`,
    `statTypeCd=p50`: the median flow for each gauge on each day of the year,
    over that gauge's **whole period of record**.
- **Formula** Per gauge per day, `100 × (1 − flow ÷ p50[month-day])`. Then the
  **median** across gauges reporting that day (≥ 7 of 9 required). The scalar is
  the most recent complete day; the baseline is the same statistic for every
  earlier day in the window.
- **Direction** higher = drier.
- **Why the denominator is not ours** Raw cubic feet per second is meaningless
  across gauges and dominated by season within one. USGS already publishes the
  long-run median per day of year — 127 years at Austin, 116 at Leesburg. Using
  it removes the season and the size of the river in one step, with a number we
  did not choose and cannot be accused of having tuned.
- **MEDIAN, NOT MEAN — this was a real bug, caught in the first live run.** The
  first build used the mean. On 2026-09-22 the Scioto at Columbus ran at
  **3,892%** of its September median after a storm and Goose Creek at
  **1,078%**. A mean of ratios is unbounded upward and bounded at +100 downward,
  so those two flooded creeks dragged the nine-gauge mean to **−528%** — a
  number that reads as wetter than any day on record — while **four of the nine
  gauges were actually below normal** and the median of the nine was −12.8%, an
  ordinary slightly-wet day. Two gauges were deciding the number for all nine.
  The median is the same statistic without that failure mode. The mean is still
  computed and reported in `meta.mean_deficit_pct` so the divergence stays
  visible.
- **Sentinels** USGS declares its own no-data value per series
  (`variable.noDataValue`, −999999). It is read from the payload rather than
  hard-coded and filtered, along with any negative. An Ice-affected December at
  Omaha is five days of −999999 that would otherwise read as a river running a
  million cubic feet per second backwards.
- **Lag** USGS daily values settle the following morning, so this reads one day
  behind. Stated in `meta.lag_note` and on the page.
- **Baseline** from the feed, ~1,100 daily points.

**The nine gauges, and why each one.** A gauge chosen for convenience would make
this a decorative map.

| site | gauge | cluster |
|---|---|---|
| 08158000 | Colorado Rv at Austin, TX | Austin–San Antonio |
| 08057000 | Trinity Rv at Dallas, TX | Dallas–Fort Worth |
| 01644000 | Goose Creek near Leesburg, VA | Loudoun County — Data Center Alley itself |
| 01646500 | Potomac Rv at Little Falls, MD | the regional supply gauge for the DC metro |
| 03227500 | Scioto Rv at Columbus, OH | New Albany / Columbus |
| 06610000 | Missouri Rv at Omaha, NE | Council Bluffs–Omaha |
| 02335000 | Chattahoochee Rv near Norcross, GA | metro Atlanta water supply |
| 09380000 | Colorado Rv at Lees Ferry, AZ | Phoenix, **at one remove** — see below |
| 14105700 | Columbia Rv at The Dalles, OR | the Oregon cluster sits on this river |

Lees Ferry is 300 miles from Phoenix. It is in the list because it is the
accounting point for Lower Basin deliveries, which is how Central Arizona
Project water reaches Phoenix — a **supply** gauge, not a local one. That is
printed in its own `meta.note` and on the corridor board rather than smoothed
over.

#### `usdm-drought` — % of area in D2+, mean of ten states
- **Endpoint** `https://usdmdataservices.unl.edu/api/StateStatistics/GetDroughtSeverityStatisticsByAreaPercent`
  with `aoi=<comma-separated FIPS>`, `statisticsType=1`, five-year range.
- **THE TRAP** Without an explicit `Accept: application/json` header the service
  answers **XML with a 200**, which arrives as a parse error naming the URL
  rather than the cause. One header, not optional.
- **Formula** Mean of the D2-or-worse area share across all ten states, for the
  most recent week where **all ten** reported. Baseline is the same mean for
  every earlier complete week.
- **Direction** higher = drier.
- **Why D2 and not D0** D0 ("abnormally dry") is on somewhere almost always —
  Texas sat at 96.45% D0 on 2026-09-15 while only 42.64% was D2. A series pinned
  near its ceiling carries no information. D2 is roughly where water utilities
  start issuing restrictions, which is where a river stops being scenery and
  starts being a permit condition for a cooling tower.
- **Why a drought index next to the stream gauges** The gauges measure what the
  river is doing now; the Drought Monitor is a weekly assessment folding in soil
  moisture, reservoir storage, groundwater and snowpack — the slow state of the
  system. Two instruments on the same question, one fast and mechanical, one
  slow and judged. **When they disagree, the disagreement is the reading.**
- **It is a judgement, not a measurement.** Produced weekly by human analysts at
  NDMC, USDA and NOAA. It is not the same kind of object as a stream gauge, it
  is averaged here without area or population weighting, and both facts are on
  the page.
- **States** TX 48, VA 51, GA 13, OH 39, IA 19, NE 31, AZ 04, OR 41, NY 36,
  CA 06. The last two are the grid reference regions.
- **Baseline** from the feed, ~260 weekly points.

### `buildout`

#### `sec-datacenter` — SEC filings saying "data centers", 30d
- **Endpoint** `https://efts.sec.gov/LATEST/search-index`, quoted phrase.
- **Two traps, both inherited verbatim from `collector/sources/sec-fts.mjs`,
  both silent, both cost an afternoon:**
  1. SEC's WAF returns **403** for any User-Agent containing a URL, and
     `fetch.mjs`'s default UA carries the repo link. Every SEC call overrides it
     with a contact-only string, which is what SEC's own policy asks for.
  2. The override key must be lowercase `'user-agent'`. `fetch.mjs` builds
     `{ 'user-agent': DEFAULT, ...opts.headers }` and JS keys are
     case-sensitive, so `'User-Agent'` does not replace the default — it sits
     beside it, undici joins the pair with a comma, the joined value still
     contains the URL, and it still 403s. The bug presents as "my header was
     ignored".
- **Saturation guard** EDGAR's counter saturates at 10,000 and flips
  `hits.total.relation` from `"eq"` to `"gte"`. A saturated count looks like a
  perfectly good number and would pin the series flat forever. The adapter
  throws and the source goes dark instead.
- **Why the plural** Measured 2026-09-23 over the same 30-day window:
  `"data center"` → 1,615 filings, `"data centers"` → 2,072. The plural is both
  larger and more specifically infrastructural — a company discussing its estate
  writes "our data centers", while the singular also catches ordinary corporate
  IT and every organisation with "Data Center" in its name.
- **Baseline** none available without many requests → accumulated.

#### `sec-power-contracts` — SEC filings saying "power purchase agreement", 90d
- Same endpoint, same traps, same guard.
- **Why it is the earliest signal here** A PPA is how a company that is not a
  utility buys electricity in bulk, for years, at a fixed price. It is the
  contract a hyperscaler signs before it pours a foundation.
- **Why 90 days and not 30** Measured 2026-09-23: 70 filings over 30 days.
  Poisson noise at n=70 is about ±8 (12%), larger than most movement worth
  reading. Ninety days puts roughly 200–300 in the window and cuts that to about
  6%, at the cost of a slower series. For a quantity whose real cadence is board
  meetings and quarterly disclosure, slow is the correct trade.
- **Baseline** → accumulated.

#### `fedreg-datacenter` — Federal Register documents saying "data center", 180d
- **Endpoint** `https://www.federalregister.gov/api/v1/documents.json`,
  `per_page=1000`, `order=oldest`, five-year window, capped at 5 pages.
- **Formula** Count of documents published in the trailing 180 days. Baseline is
  the same rolling count taken at weekly anchors across the fetched corpus.
- **Why it is here when the two SEC sources are sharper: redundancy of host.**
  Both SEC adapters read `efts.sec.gov`. One WAF change takes the whole buildout
  pillar dark at once, and a pillar with no live source has no score. This is a
  second agency on a second domain answering a related question.
- **It is the noisiest source in the index, by some distance.** "data center"
  also matches the National Climatic Data Center, the EPA's own data centres,
  federal facility consolidation notices, and every agency with the words in the
  name of a building. It is published with that caveat attached rather than
  quietly weighted down, because a reader who spots the problem before we admit
  it has learned something about the whole page.
- **Page cap** If the corpus grows past 5 pages the adapter **throws** rather
  than silently truncating at the oldest end, which would tilt every percentile.
- **Baseline** from the feed, ~234 rolling points — but see §5 on
  autocorrelation.

---

## 3. Sources tested and DROPPED

Verified against the live endpoint and excluded. Published, the way `/race`
publishes the Manifold exclusion, because a list of what was tried is the only
evidence that the included list was chosen rather than assembled.

| candidate | result | verdict |
|---|---|---|
| **EIA open data** (`api.eia.gov/v2`) | requires `api_key` on every request | Dropped. The key is free and instant, which `docs/CONTRACT.md` §1.3 ("no secrets anywhere") would tolerate if it were obtainable here — it is not obtainable in an unattended build, and a repo-committed key is a key on the public internet. **This is the single biggest gap:** EIA-930 hourly demand covers every balancing authority including PJM and MISO, and would close five of the nine corridors at once. |
| **PJM** Data Miner 2 / `api.pjm.com` | HTTP 401 on every path tried | Dropped. Requires a registered subscription key. **Northern Virginia is the largest datacentre cluster on earth and this is why it has no grid cell.** |
| **MISO** real-time data broker | HTTP 200 carrying `{"error": "no data"}` on `getfuelmix`, `gettotalload`, `getWindForecast`; empty body on three others | Dropped. A 200 with an error body is exactly the shape that becomes a silent zero, and there is nothing behind it to read. |
| **US water consumption** (USGS national water-use) | published **annually** | Dropped as a tempo series. An index of activity cannot be built on a number that changes once a year; it would be a step function with a five-year lag. Recorded here rather than quietly interpolated. |
| **poweroutage.us** API | HTTP 401 | Dropped. No free structured tier. The operator asked for power outages specifically; there is no free machine-readable live outage feed for the United States that this project found. `ercot-tightness` is the nearest honest substitute, and it measures the margin **before** an outage rather than the outage. |
| **ERCOT** `todays-outlook.json` | HTTP 403 | Dropped; `supply-demand.json` carries the same quantities. |
| **CAISO** dated archive `/outlook/<YYYYMMDD>/demand.csv` | HTTP 404 on two dates | No archive. This is the cause of the documented six-hour CAISO hole. |
| **Vast.ai GPU spot** | works | **Deliberately not duplicated.** It is already live in the main index as `collector/sources/vastai.mjs` in the `compute` pillar. Re-collecting it here would put one series in two indices and make them look like independent agreement. /infra links to it instead. |

---

## 4. The maths

1. **Each adapter returns one scalar** where higher always means more activity.
   A naturally inverted source is negated inside its own adapter, so nothing
   downstream has to remember which is which. (`CONTRACT.md` "Source adapter".)
2. **Normalise.** Empirical percentile against that source's baseline → inverse
   normal CDF → `S = 50 + 12.5z`, clamped to [0, 100].
   `collector/infra.mjs` **imports `normalise` and `invNormalCdf` from
   `collector/engine.mjs`** rather than reimplementing them. If those exports
   ever disappear this file fails at import, loudly. A second copy of the
   arithmetic that silently drifted from the first would be worse than no
   sub-index at all.
   The baseline array is turned into a 101-knot quantile grid by
   `quantileGrid()` in `infra-sources/_util.mjs`, using linear interpolation
   between order statistics (R type-7 / numpy default) so a 261-point baseline
   does not quantise into visible steps.
3. **Pillar score** = mean of its live sources' scores.
4. **Composite** = `0.7 × mean(live pillars) + 0.3 × max(live pillars)`, live
   pillars only. Identical to `CONTRACT.md` step 4. The max term is why one
   pillar at the top of its record moves the number when the others are ordinary.
5. **Level** from the composite on the bands in §1.

### The three states, kept apart

| state | means | in the averages? |
|---|---|---|
| `live` | the feed answered and there is a baseline of ≥ 30 points | yes |
| `awaiting-baseline` | the feed answered, the number is real and printed, and there is not yet enough history to say where it sits | **no** |
| `dark` | the fetch failed or returned a non-finite value; the reason is printed | **no**, and nothing is imputed |

**This distinction holds at the pillar level too**, and that was the second real
bug in this build. The first version marked any pillar with no *live* source as
`dark`, and printed `grid DARK` on a run where all four grid feeds returned
clean numbers and were simply short of baseline. A pillar is dark only when
something actually failed. Merging the two claims an outage that is not
happening — the most common quiet lie in this whole category.

### Where baselines come from

- **From the feed**, when the feed hands over its own history: five years of
  weekly Drought Monitor maps, three years of USGS daily values, five years of
  Federal Register publication dates. Used from the first run.
- **Accumulated**, otherwise: `data/infra.json` keeps one point per **UTC day**
  per source, capped at 400 days. Daily, not per-run — an overnight floor is the
  same number at 06:00 and at 23:00, so keeping every run would build a
  distribution of ninety-six identical copies of today and call it a sample of
  size ninety-six.
- `MIN_BASELINE_N = 30` for both paths. Thirty is where the continuity
  correction `1/(2n)` stops dominating: at n=30 the most extreme reachable score
  is about 73, at n=261 about 85. **Extremity has to be earned with evidence.**
- The current reading is always excluded from the distribution it is scored
  against. Scoring a value against a sample containing itself pulls its own
  percentile toward the middle.

**Consequence, stated plainly: the four grid sources and the two SEC sources
read `awaiting-baseline` for their first 30 days of running.** Their numbers are
real and are printed from run one; they are simply not yet scored, and the page
says so in three places. This is the correct behaviour and it is what
`docs/VOICE.md` §4 means by never merging the third state into the second.

### Anti-flap

Four of `CONTRACT.md`'s six layers. The two that are absent are named rather
than skipped.

**Implemented**
- Schmitt deadband, ±3 points around every boundary.
- Minimum 6 hours between level changes.
- One step per change — never 5 → 3.
- Frozen while any pillar is **genuinely dark** (not while one is awaiting
  baseline).
- Pillar quorum, 2-of-3 here where the main index is 2-of-5.

**Not implemented, with the reason**
- **Dual-window dwell** (3h/30min up, 12h/3h down). It needs a dense observation
  history this index does not have: half its sources move once a day and one
  moves once a week, so a thirty-minute mean is a thirty-minute mean of the same
  number.
- **Four-hour post-change lock.** Subsumed by the six-hour minimum interval,
  which is strictly longer.

### The all-dark run

A run where every source fails writes `score: null`, `level: null` — printing a
confident level over a dead pipe is the exact failure this project exists not to
repeat — **and** carries forward a `last_known` block `{ level, level_name,
level_since, score, generated_at }` so the state machine does not reset to
genesis. The page renders it under an explicit "that is the last reading, not
the current one" label. Verified by running the collector under
`docker run --network none`.

---

## 5. Limitations — blunt

1. **It cannot separate a datacentre from a smelter.** No public grid feed
   breaks demand out by customer class in real time. If the Texas floor climbs
   900 MW this index can tell you it climbed and cannot tell you what climbed.
2. **It cannot measure water consumption.** Datacentre water draw is not
   published by anyone, anywhere, at any cadence. Streamflow is rain, snowmelt,
   reservoir operations and irrigation, and a cooling tower is a rounding error
   against all four. This measures the constraint, never the consumption.
3. **Five of the nine corridors have no grid feed at all** — Northern Virginia,
   Central Ohio, Iowa/Nebraska, Georgia, Arizona, Oregon. Three are key-walled
   (PJM ×2), one returns no data (MISO), and three are not organised markets at
   all. The corridor board prints the reason in each empty cell rather than
   leaving a blank that reads as an oversight.
4. **The build-out counters count documents, not dollars.** A filing mentioning
   "data centers" once and a filing announcing forty billion dollars of capex
   are one hit each.
5. **Filing counts carry the filing calendar inside them.** Annual-report season
   lifts every full-text phrase count in February and March regardless of what
   anyone is building. That seasonality is real and only enters the baseline
   once the baseline is long enough to contain a February.
6. **The Federal Register baseline is autocorrelated.** Its points are 180-day
   rolling counts at weekly steps, so consecutive points share 173 of their 180
   days. The effective sample size is far below the 234-point count, and its
   percentile is correspondingly less informative than the same number from the
   Drought Monitor. `baseline.note` says so in the JSON.
7. **The Drought Monitor is a judgement, not a measurement**, and is averaged
   without area or population weighting.
8. **CAISO is dark six hours a day by design** (§2).
9. **The water pillar reads one day behind** — USGS daily values settle the
   following morning.
10. **Two sources share one host.** `sec-datacenter` and `sec-power-contracts`
    both read `efts.sec.gov`. `fedreg-datacenter` exists so the buildout pillar
    can lose that host and keep reporting; the grid pillar has no such
    redundancy for ERCOT, whose two adapters share `www.ercot.com`.
11. **The scale is a statement about its own record**, which is short. See §1.

---

## 6. Running it

```sh
cd /path/to/doomcon
docker run --rm --network host -v "$PWD":/app -w /app node:20-alpine \
  node collector/infra.mjs
```

Writes `data/infra.json` (write-then-rename, so a killed run cannot leave a
truncated file). Exits 1 only if **every** source failed; partial darkness is a
normal Tuesday.

**If `data/infra.json` is present but unparseable the run refuses to overwrite
it** and exits 1. That file carries the accumulated baselines, and falling back
to an empty object would silently throw away a month of record while the index
came back looking healthy. Fix or delete it deliberately.

### Cadence — read this before wiring the cron

A run moves roughly **2 MB**: ~750 KB of USGS daily values, ~170 KB of USGS
statistics, ~560 KB of Drought Monitor weeks, plus the grid and filing calls.
**Run it hourly, not every fifteen minutes.** At a 15-minute cadence that is
~190 MB/day aimed at three government servers to refresh numbers that change
once a day and, for drought, once a week. Hourly is 24 points a day against a
baseline that stores one, which is already ample headroom.

Nothing breaks at a faster cadence — the accumulated store is keyed by UTC day
and simply overwrites — it is just rude, and these are free feeds run by people
who did not sign up for this.

### Adding a source

Drop a `.mjs` into `collector/infra-sources/`. Discovery is a directory read;
files beginning with `_` are shared helpers and are skipped.

```js
export default {
  id: 'kebab-case',            // unique, stable
  pillar: 'grid',              // 'grid' | 'water' | 'buildout'
  label: 'Human label',
  region: 'ERCOT · Texas',     // optional, shown on the page
  unitLabel: 'MW',             // optional, shown in tables
  cadence: 'daily',            // optional, informational
  direction: 'higher = …',     // optional, shown on the page
  async collect(net) {         // net = { json, text }, both via collector/fetch.mjs
    return {
      value,                   // MUST be a finite Number; higher = more activity
      unit: 'MW',
      observed_at: '…ISO…',
      meta: { /* anything; rendered on the page */ },
      baseline: {              // OPTIONAL. Omit and the collector accumulates.
        values: [/* numbers, excluding `value` itself */],
        source: 'where these came from',
        span: 'first to last',
        note: 'anything a reader should know about them',
      },
    };
  },
};
```

Throw for any condition you would not want published. A thrown adapter is `dark`
with your message on the page; it is never a zero.

---

## 7. Measured output

Real run, `2026-09-24T03:25:49Z`, `docker run --network host node:20-alpine`.
Nothing here is illustrative.

```
source               pillar    state                value  unit                         score  pctile   base origin
-------------------------------------------------------------------------------------------------------------------
caiso-baseload       grid      AWAITING-BASELINE    22133  MW                               —       —      1 accumulated
ercot-baseload       grid      AWAITING-BASELINE    55707  MW                               —       —      1 accumulated
ercot-tightness      grid      AWAITING-BASELINE    74.81  % of committed capacity          —       —      1 accumulated
nyiso-baseload       grid      AWAITING-BASELINE    12440  MW                               —       —      1 accumulated
usdm-drought         water     LIVE                 18.90  % of area in D2+              49.2    47.3    260 feed
usgs-water-deficit   water     LIVE                -12.82  % below normal, median of 9   32.3     7.8   1094 feed
fedreg-datacenter    buildout  LIVE                168.00  documents / 180d              57.3    72.0    234 feed
sec-datacenter       buildout  AWAITING-BASELINE     1965  filings / 30d                    —       —      1 accumulated
sec-power-contracts  buildout  AWAITING-BASELINE   298.00  filings / 90d                    —       —      1 accumulated

grid      AWAITING-BASELINE  0 live / 4 awaiting / 0 dark
water                  40.8  2 live / 0 awaiting / 0 dark
buildout               57.3  1 live / 2 awaiting / 0 dark

SUBSTRATE 4 STEADY  composite 51.5 of 100  (rule: none)
3 live, 6 awaiting baseline, 0 dark, of 9
```

Reading it: the grid pillar is **awaiting baseline, not dark** — all four feeds
answered, and every one of those megawatt figures is real. The water pillar is
scored from the feeds' own history and reads 40.8: drought is dead centre of its
five-year distribution (47.3rd percentile) and the rivers read wetter than 92% of
the last three years, almost entirely because of a storm over Ohio that put the
Scioto at 3,892% of its September median. Buildout is scored
on one of three sources. The composite is computed over two live pillars, which
is stated in `counts` and on the page.

Nine of nine sources answered. On the same day, the main index reported five of
fourteen scored. That contrast is the point of the sub-index franchise: a page
can be fully alive while the index it sits beside is still growing a reference.

### Per-source spot checks, same run

| source | reading | cross-check |
|---|---|---|
| `ercot-baseload` | 55,707 MW floor, 00:00–06:00 CT, **71 of 72** intervals (ERCOT dropped one; the adapter's floor is 70), 8 fuel categories, local day 2026-09-23 | overnight high in the same window 63,568 MW, so the night's range was 7,861 MW |
| `ercot-tightness` | 74.81% — 65,889 MW of 88,076 MW committed, 22,187 MW spare | PRC 10,840 MW now, day low 6,092 MW over 8,033 samples; ERCOT's own words: *"There is enough power for current demand."*, EEA level 0 |
| `nyiso-baseload` | 12,440 MW, 72/72 intervals | all 11 zones present at every one: 0 intervals dropped for a missing zone, 0 blank `Load` cells |
| `caiso-baseload` | 22,133 MW, 72/72 intervals | Pacific day derived as 2026-09-23; the run was at 20:25 PT, well clear of the six-hour hole |
| `usgs-water-deficit` | median −12.8% (wetter than normal) for 2026-09-22; **mean −528%**, and this is the whole argument for the median | Scioto 3,892% of normal, Goose Creek 1,078%, Chattahoochee 127%, Trinity 127%, Potomac 113%, Missouri 83%, Austin 81%, The Dalles 77%, Lees Ferry 74% — four of nine below normal, two of nine in flood |
| `usdm-drought` | 18.90% mean D2+, map of 2026-09-15 | OR 60.1%, TX 42.6%, AZ 35.7%, NE 33.0%, VA 15.3%, GA 2.3%, CA 0.04%; OH, IA and NY clear of D2 |
| `fedreg-datacenter` | 168 documents / 180d, 72nd percentile | 1,495-document corpus since 2021-09-24, 2 pages |
| `sec-datacenter` | 1,965 filings / 30d, `relation: "eq"` | not saturated |
| `sec-power-contracts` | 298 filings / 90d, `relation: "eq"` | not saturated |

### Failure paths, also measured

- `--network none`: all nine `dark`, all three pillars `dark`, `score: null`,
  `level: null`, `last_known` carried forward intact, all baselines preserved,
  exit code **1**.
- Page render with `ctx.infra = null`: builds, says "this is the absence of a
  result, and the two are different states", carries `noindex`.
- Two renders of the same context: **byte-identical**.

---

## 8. Files

| file | owner | what |
|---|---|---|
| `collector/infra.mjs` | this index | discovery, scoring, anti-flap, `data/infra.json` |
| `collector/infra-sources/_util.mjs` | this index | CSV/RDB parsing, quantile grid, wall-clock helpers |
| `collector/infra-sources/_sec.mjs` | this index | the shared EDGAR reader and its two traps |
| `collector/infra-sources/*.mjs` | this index | nine adapters |
| `site/templates/infraPage.mjs` | this index | `/infra.html`, exports `render(ctx)` and `hasInfra(ctx)` |
| `docs/INFRA.md` | this index | this file |
| `site/build.mjs` | **the integrator** | must be taught to read `data/infra.json` and call the template — see below |

### What `site/build.mjs` has to do

Three changes, all mirroring what it already does for `/race`:

```js
import * as infraPage from './templates/infraPage.mjs';

// 1. Read the file. Optional, separate failure domain: a dark infra index must
//    not stop the main index building, exactly as with race.json.
let infra = null;
const infraFile = path.join(args.data, 'infra.json');
if (existsSync(infraFile)) {
  try { infra = JSON.parse(await readFile(infraFile, 'utf8')); }
  catch (err) { warn(`data/infra.json is present but unreadable (${err.message}); building without /infra.`); }
} else {
  warn('data/infra.json is absent; building without /infra. Run collector/infra.mjs first.');
}

// 2. Put it on ctx, next to `race` and `news`.
const ctx = { state, news, race, infra, /* … */ };

// 3. Write the page and the API surface, gated the same way /race is.
if (infraPage.hasInfra(ctx)) {
  written.push(await write(args.out, 'infra.html', infraPage.render(ctx)));
}
if (infra) written.push(await write(args.out, 'api/infra.json', stableJson(infra)));
```

And in `site/templates/layout.mjs`, one row in `SECTIONS` and one arm in
`hasSection()`:

```js
{ href: '/infra.html', label: 'Infrastructure', short: 'Infra', needs: 'infra',
  blurb: 'Power, water and the paper trail underneath the models.' },

if (key === 'infra') return Boolean(ctx.infra && Array.isArray(ctx.infra.sources) && ctx.infra.sources.length);
```

The page links `/api/infra.json`, so that write is not optional if the nav is
wired. `sitemap.mjs` should gain the route on the same `hasInfra` gate.

Neither `build.mjs` nor `layout.mjs` was touched by this work.
