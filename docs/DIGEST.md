# The digest layer

The index answers *how fast is the field moving*. The news layer answers *what
moved*. This layer answers the only question a returning reader actually has:

> **What is different since I last looked, and which of it matters?**

It is the difference between a dashboard people glance at and one they rely on,
and it is written against one hard constraint, stated up front so the rest of
this page can be read as an argument for it:

> **Nothing in this layer is written by a model.** Every "why this matters" line
> is a template with measured numbers substituted into it. Every item in the
> brief was selected by a rule published below and carries the list of rules it
> fired. Our entire claim is that a stranger can recompute our numbers
> (`docs/TEARDOWN.md` §4); an opaque generated summary would torch that in one
> paragraph, and no amount of polish would buy it back.

Two consequences follow, and both are visible on the page.

1. **The brief can be short.** When three items clear a rule, three items are
   shown. It is never padded to a round number, because filling the rest with
   the next-highest-scoring items would turn "selected by rule" into "ranked by
   score", which is a weaker claim wearing the same name.
2. **Half of this layer can say it does not know yet.** A diff needs a baseline.
   On a fresh clone there is no previous digest, no entity ledger and a one-row
   history, and every block that depends on one reports `awaiting-baseline`
   with the exact reason. It never prints a zero over a missing comparison.

---

## Files

```
collector/digest.mjs              reads data/, writes data/digest.json
site/templates/digestPage.mjs     /digest.html
site/templates/_whatchanged.mjs   the homepage strip
data/digest.json                  output
```

Run it:

```bash
docker run --rm -v "$PWD":/app -w /app node:20-alpine node collector/digest.mjs
```

**No network.** `CONTRACT.md` §1.5 routes every network call through
`collector/fetch.mjs`; this module makes none at all, which is why it does not
import it. It is a pure function of the files in `data/` plus one wall-clock
read for `generated_at`.

**Pipeline position.** After `collector/engine.mjs` (it reads `state.json` and
`history.ndjson`) and before `site/build.mjs`. It writes `data/digest.json`
only — never `public/` — so it cannot be deleted by the build's `rm -rf public`.

```
collect -> news -> race -> engine -> DIGEST -> site/build.mjs -> card/posts/post-sheet
```

### Inputs and what each one is for

| file | required | what the digest takes from it |
|---|---|---|
| `data/news.json` | **yes** | the corpus, the brief candidates, corroboration, engagement, entities, `first_seen_at` |
| `data/state.json` | **yes** | pillar scores, the three source states, source percentiles, `level_since` |
| `data/history.ndjson` | no | the index diff, streaks and records. Absent -> those blocks are `awaiting-baseline` |
| `data/race.json` | no | leaderboard positions, per-lab shipping and mindshare, the entity->lab join. Absent -> the leaderboard diff is `absent` and rollups fall back to `LAB_ROSTER` |
| `data/digest.json` | no | the **previous** run: the entity ledger and the snapshot every diff is taken against |

---

## Determinism

`CONTRACT.md` §1.4 bans unseeded time in output beyond `generated_at`. This
module holds the line harder than that:

- Every age, every window and every threshold is measured against **`as_of`**,
  which is read from `data/news.json`, not from the clock.
- `generated_at` is the single wall-clock read in the module and the **only**
  field that differs between two runs over identical inputs. Verified: two
  builds over one fixture produced byte-identical JSON once `generated_at` was
  removed.
- Keys are sorted on write; every list has a total ordering with an immutable
  final tiebreaker (usually the item id).

Two stamps are published rather than one, because `news.json` and `state.json`
are written by different collectors on different clocks:

| field | meaning |
|---|---|
| `as_of` | `news.generated_at` — every news figure is measured against this |
| `index_as_of` | `state.generated_at` — every index figure is measured against this |
| `clock_skew_seconds` | the gap. Over `SKEW_NOTE_HOURS` (6) a note is emitted and the page prints it |

---

## 1. The daily brief

### Candidate pool

Every item in `data/news.json` published within `BRIEF_WINDOW_HOURS` (**24**) of
`as_of`. Ages floor at zero: several feeds publish minutes into the future
through clock skew (`docs/NEWS.md`, *Scoring*).

### The five rules

An item enters the brief on **any one** of these. Five independent qualifying
rules rather than one blended score, because a blend hides which fact did the
work — here every selected item names the comparison that put it there, and you
can redo that comparison against `data/news.json` with a calculator.

| id | weight | fires when |
|---|---|---|
| `corroborated` | **3** | `meta.corroboration.count >= CORROBORATION_MIN_SOURCES` (**2**) |
| `engagement_outlier` | **2** | `meta.engagement.value >= p90` of that source's engagement values in this window |
| `source_surge` | **2** | that source is surging (below), and this is its single highest-scoring in-window item |
| `primary_announcement` | **1** | `kind` in `PRIMARY_KINDS` (`lab`, `release`) **and** `meta.source_weight >= the feed's declared weight` |
| `frontier_salience` | **1** | `entities.length >= SALIENCE_MIN_ENTITIES` (**2**) and at least one of them is a frontier lab on the roster |

**Why corroboration is heaviest.** Same reason it is the heaviest term in
`docs/NEWS.md`: independent sources agreeing is the strongest evidence
available that a real event occurred, and it is precisely the term a
single-source competitor structurally cannot compute. skynetcountdown.com reads
one TechCrunch RSS feed and says so.

**Why `primary_announcement` reads `meta.source_weight`.** `kind` alone is not
enough. `docs/NEWS.md` (*Per-item weight*) records that OpenAI's newsroom
`<category>` cleanly separates launches from customer case studies, and that at
full weight the case studies filled the reel. The adapter already grades them —
measured on 2026-09-24, every customer story in the window carried
`meta.source_weight` **0.45** against the feed's declared **1.00**, while
*"Introducing GPT-6 Sol and Luna"* carried the full **1.00**. So the rule reads
the grade the adapter already published rather than inventing a second one. A
down-weighted item is **not excluded** from the brief; it can still qualify on
corroboration, engagement or salience. It just cannot claim to be an
announcement.

**Why the engagement threshold is computed, not fixed.** An absolute cut-off is
wrong twice. It does not transfer between metrics — `docs/NEWS.md` tabulates
Hacker News points at a 500-point full scale, Hugging Face upvotes at 150 and
Hugging Face likes at 1500 — and it does not survive a quiet week. The p90 of
what that source actually carried *in this window* is self-calibrating and
recomputable from the published file. It is emitted per source in
`engagement_thresholds` with its sample size, and a source with fewer than
`ENGAGEMENT_MIN_SAMPLES` (**10**) scored items has **no threshold** and the rule
cannot fire for it. Quantiles are type 7 — linear interpolation between order
statistics — the same definition `data/reference.json` states for the index's
own quantile grids, so "the 90th percentile" means one thing in this repo.

### Velocity, and the three states again

A source is **surging** when all three hold:

```
prior_hours          = observed_span_hours - BRIEF_WINDOW_HOURS
baseline_per_24h     = items_in_prior * 24 / prior_hours
ratio                = items_24h / baseline_per_24h

prior_hours >= SURGE_MIN_PRIOR_HOURS   (24)
items_24h   >= SURGE_MIN_ITEMS_24H     (4)
ratio       >= SURGE_MIN_RATIO         (1.75)
```

The baseline is the source's own recent normal, not a cross-source average: a
feed publishing sixty papers a day and a feed publishing one blog post a week
are not comparable on any absolute scale.

**When `prior_hours` is short, velocity is `awaiting-baseline` and the rule
fires for nobody.** This is not a corner case. `data/news.json` is nominally a
seven-day window but is also capped at 200 items, and on a busy run the cap
bites first: measured 2026-09-24, the observed span was **33.3 hours**, leaving
**9.3 hours** of prior against the 24 a baseline needs. A ratio computed against
nine hours is a number, not a measurement, so the digest says so in words and
the page repeats it. Three states, never collapsed — the same rule
`docs/NEWS.md` applies to a feed.

### Ranking, caps and ordering

```
rule_weight = sum of the weights of the rules an item fired
order       = rule_weight DESC, news score DESC, published_at DESC, id ASC
```

Every key is immutable for a given `(item, as_of)` pair, so two runs over one
file give one answer.

| cap | value | why |
|---|---|---|
| `BRIEF_MAX_ITEMS` | 6 | a brief somebody reads on a phone before coffee |
| `BRIEF_MAX_PER_SOURCE` | 2 | `arxiv-newest` and `hf-daily-papers` contribute half the corpus (`docs/NEWS.md`, *Known limitations* 4). Without this, a brief of six is six preprints on a day a lab shipped something |

Items dropped by a cap are counted in `brief.held_back` rather than deleted
silently.

### The "why this matters" line

`why_components` is an array of sentences; `why` is them joined. Each one is a
fixed template and appears **only** when the number behind it exists — an item
with no corroboration simply has no corroboration sentence, rather than one
saying "only one source". In order:

1. `"{N} independent sources carried it — {labels}, first at {HH:MM} UTC, {M} minutes before the last of them."`
2. `"Published directly by {source} at its full declared feed weight of {w}, not relayed from another outlet."` — or, for a release, `"A cut release tag in {source} — the least ambiguous \"shipped\" event this layer can read."`
3. `"{value} {metric} against a window 90th percentile of {p90} across {n} scored {source} items."`
4. `"{source} published {n} items in 24h against its own baseline of {b} — {r}x."`
5. `"Names {entities}. {Lab} sits at rank {r} on the leaderboard at {p}%."` — one sentence **per lab**, not per entity: "OpenAI" and "GPT" are two names for one player, and printing its rank twice reads as a bug.
6. `"Feeds the {pillar} pillar, which moved {±d} in the {h}h since the previous observation."` — or `"which held at {v} of 100"` when the delta is exactly zero.
7. `"Published {stamp}, {age} before the compile stamp."`

Signed values inside these sentences use U+2212, because they are prose headed
for a page and `site/templates/_html.mjs` is explicit about why display gets the
real minus sign. Every `*_label` and every numeric field keeps an ASCII
hyphen-minus, because those are data.

---

## 2. What changed

### The index — two references, both labelled

| block | reference | available |
|---|---|---|
| `since_previous` | the previous row in `history.ndjson`, whatever its age | as soon as two observations exist |
| `since_24h` | the row closest to 24h old within `[DAY_MIN_AGE_HOURS, DAY_MAX_AGE_HOURS]` = **[20h, 40h]** | once the log is a day old |

Both publish the exact `reference_at` they used. A delta whose baseline is
unstated is not a measurement. The 20/40 tolerance is the same one
`site/build.mjs` uses for its "vs yesterday" comparison, deliberately.

A pillar with no score on either side is `state: "not-scored"`, never `0.0`.
Printing a zero delta over an uncalibrated pillar is the exact imputation
`CONTRACT.md` forbids.

### Sources — three states, two families

| state | index source | news feed |
|---|---|---|
| `live` | `ok === true` | the feed answered and published inside the window |
| `awaiting-baseline` | `uncalibrated === true` | *(n/a — the news layer calls the analogous state `dormant`)* |
| `dormant` | *(n/a)* | answered and parsed, newest item predates the window |
| `dark` | neither of the above | the fetch or the parse failed |

Transitions are classified as `went_dark`, `came_back`, `newly_calibrated`,
`went_quiet`, `resumed`, `joined_the_roster`, `left_the_roster`, `changed`.

Measured on 2026-09-24: **9 of 14** index sources were `awaiting-baseline` and
**5** were live. `docs/VOICE.md` §4 is explicit that calling the nine "dark"
claims an outage that is not happening, and this module never merges them, on
any surface, in any count.

This is also the line pizzint's dashboard cannot print: their status endpoint
reports `"status":"healthy"` at a 12% scrape success rate
(`docs/TEARDOWN.md` §3.1), so a feed dying is invisible. Here it is a named row
with a from-state and a to-state.

### The leaderboard

A player is a **mover** when their rank changed, or their probability moved by
at least `RACE_PROB_MIN_MOVE` (**0.005**, half a percentage point). This needs a
previous digest, so it is `awaiting-baseline` on a first run.

Alongside it, the venue's **own** `change_7d` is published for every player with
`change_7d_state === "live"`. That column comes from the market, not from our
record, so it is a live number on a first run in a way our own diff cannot be.

### First sightings

A name that has never appeared in our corpus before is a fact about the record,
and the record is ours. Nobody else in this category computes it and it costs
one dictionary lookup per item.

The trap is the first run, where every name is "new" and the claim is
meaningless. So:

- the ledger seeds itself silently on run 1 from every entity already in the
  corpus, marking each entry `seeded: true`;
- `first_seen.state` is `awaiting-baseline` until the ledger has survived
  `MIN_LEDGER_RUNS` (**1**) prior run, with the seeded count in the reason;
- from then on, an entity with no ledger entry is reported as first-seen,
  carrying the item, the source and the timestamp that introduced it.

The ledger records `meta.first_seen_at` (when our collector first saw the item),
falling back to `published_at`. Items are walked oldest-first so an entity's
entry records the earliest item that carried it, not whichever the file listed
first. The vocabulary is bounded — `collector/news-sources/_entities.mjs` holds
about 45 names — so the ledger cannot grow without limit.

New **source** ids are tracked the same way.

---

## 3. Streaks and records

Everything here is scoped to the observed log and **nothing is called
all-time**. Every record carries `scope`, e.g. *"3 observations spanning 4h"*,
and the rendered sentence repeats it. There will be an all-time when the record
outlasts the claim.

- **Records** need `RECORD_MIN_OBSERVATIONS` (**2**) live readings; below that
  the block is `awaiting-baseline`, because a maximum over one value is a
  restatement, not a comparison.
- **Ties resolve to the earliest observation**: a record is set the first time
  it is reached, not the last time it is equalled.
- `at_log_high` / `at_log_low` compare **values**, not timestamps. A pillar that
  has not moved is at its own log high *and* its own log low, and saying
  otherwise because the record was first set three observations ago is a
  technicality nobody reading the page would accept. Such a series is flagged
  `flat: true` and the page reports it in words instead of printing a record.
- **Streaks are counted in consecutive moves, not in days.** This index observes
  roughly hourly; calling three consecutive rises "three days" would be false.
  `STREAK_MIN_MOVES` (**2**) is where a streak is labelled `notable`. A
  non-finite reading ends a streak and is named as the thing that ended it,
  because a gap is not a flat stretch.
- **Source extremes** flag any live index source at or beyond
  `EXTREME_PERCENTILE_LOW` (**0.05**) or `EXTREME_PERCENTILE_HIGH` (**0.95**) of
  its own frozen reference. Available on the first run, because the reference is
  frozen rather than accumulated. This is the seed of THE TELL
  (`docs/SUB-INDICES.md` §6).
- **Corpus facts** — busiest hour, highest-scoring item, corroboration count —
  are measured from `data/news.json` rather than the index log.

### The busiest-hour caveat, measured rather than remembered

"30 items in one hour" is a lie when one feed stamps every item at midnight.
Rather than trusting the note in `docs/NEWS.md` about Hugging Face's
date-granular timestamps, the module measures it: a source is date-granular in
this window when **every one** of its items lands at exactly `00:00:00Z`. The
caveat then becomes a fact about this file rather than a remembered fact about a
feed. Real output, 2026-09-24:

> Busiest hour in the corpus: 30 items stamped in the hour beginning 2026-09-23
> 00:00 UTC. 24 of them came from hf-daily-papers, every one of whose 32 items
> in this window is stamped 00:00:00 UTC — the hour is that feed's date
> granularity, not a burst.

---

## 4. Entity rollups

One block per frontier lab, and the beginning of the per-lab pages that are the
programmatic-SEO surface: `docs/TEARDOWN.md` §2.3 is the single most important
finding in the teardown — the viral index gets the spike, the long tail gets the
durable traffic.

**The entity join prefers `data/race.json`'s own `mindshare.entities`**, which
`docs/RACE.md` publishes, so this module and `/race` never disagree about which
names belong to which lab. `LAB_ROSTER` in `collector/digest.mjs` is the
fallback when `race.json` is absent, and every entry is printed here:

| id | name | fallback entities |
|---|---|---|
| `openai` | OpenAI | OpenAI, GPT, o-series, Sora |
| `anthropic` | Anthropic | Anthropic, Claude |
| `google-deepmind` | Google DeepMind | Google DeepMind, Gemini, Gemma, Veo |
| `meta` | Meta AI | Meta AI, Llama |
| `xai` | xAI | xAI, Grok |
| `deepseek` | DeepSeek | DeepSeek, DeepSeek-R |
| `qwen` | Alibaba Qwen | Alibaba Qwen, Qwen |
| `mistral` | Mistral | Mistral, Mixtral |

Each block carries, all computed:

- items in the corpus naming any of its entities, split by `kind`, and by UTC day
- share of corpus, first and most recent item, and the top
  `ROLLUP_TOP_ITEMS` (**3**) by news score
- market rank, probability and the venue's 7-day change, from `race.json`
- shipping — GitHub releases, OpenRouter listings, Hugging Face model repos over
  30 days, each with its own state
- mindshare, **taken from `race.json` rather than recomputed**. Two slightly
  different numbers for one quantity is worse than one number with a citation

A lab with no items reports *"No item in the 200-item corpus names X or Y. A
measured zero across 13 live feeds."* — a measured zero, not a gap.

### The window label is measured

`data/news.json` is nominally seven days and is also capped at 200 items. When
the cap bites first, the honest label is the span the corpus actually covers and
the fact that it was truncated:

> 33.3 hours (the 200-item cap, not the 7-day window)

---

## Every threshold, in one table

All of these are emitted into `data/digest.json` as `rules`, so the constants
that produced the numbers travel with the numbers — the same treatment
`docs/NEWS.md` gives the scoring block, and for the same reason: a reader
recomputing a selection should not have to match a file against a commit.

| constant | value |
|---|---|
| `BRIEF_WINDOW_HOURS` | 24 |
| `BRIEF_MAX_ITEMS` | 6 |
| `BRIEF_MAX_PER_SOURCE` | 2 |
| `RULE_WEIGHT.corroborated` | 3 |
| `RULE_WEIGHT.engagement_outlier` | 2 |
| `RULE_WEIGHT.source_surge` | 2 |
| `RULE_WEIGHT.primary_announcement` | 1 |
| `RULE_WEIGHT.frontier_salience` | 1 |
| `CORROBORATION_MIN_SOURCES` | 2 |
| `ENGAGEMENT_QUANTILE` | 0.9 |
| `ENGAGEMENT_MIN_SAMPLES` | 10 |
| `SURGE_MIN_RATIO` | 1.75 |
| `SURGE_MIN_ITEMS_24H` | 4 |
| `SURGE_MIN_PRIOR_HOURS` | 24 |
| `SALIENCE_MIN_ENTITIES` | 2 |
| `PRIMARY_KINDS` | `lab`, `release` |
| `DAY_MIN_AGE_HOURS` | 20 |
| `DAY_MAX_AGE_HOURS` | 40 |
| `RACE_PROB_MIN_MOVE` | 0.005 |
| `MIN_LEDGER_RUNS` | 1 |
| `RECORD_MIN_OBSERVATIONS` | 2 |
| `STREAK_MIN_MOVES` | 2 |
| `EXTREME_PERCENTILE_LOW` | 0.05 |
| `EXTREME_PERCENTILE_HIGH` | 0.95 |
| `ROLLUP_TOP_ITEMS` | 3 |
| `SKEW_NOTE_HOURS` | 6 |

---

## Output shape

```json
{
  "schema": 1,
  "generated_at": "2026-09-24T03:07:00.622Z",
  "digest_version": "1.0.0",
  "as_of": "2026-09-24T02:57:20.848Z",
  "index_as_of": "2026-09-24T00:04:49.239Z",
  "clock_skew_seconds": 10352,
  "clock_skew_note": null,
  "inputs":   { "news_generated_at": "…", "race_present": true, "history_observations": 3, … },
  "rules":    { … every constant in the table above … },
  "corpus":   { "items": 200, "observed_span_hours": 33.3, "capped": true,
                "feeds_live": 13, "feeds_dormant": 2, "feeds_dark": 1, … },
  "velocity": { "state": "awaiting-baseline", "prior_hours": 9.3, "by_source": [ … ] },
  "engagement_thresholds": [ { "source": "hn-ai", "metric": "hn_points", "samples": 34,
                               "threshold": 50.4, "max": 896, "state": "live" }, … ],
  "brief":    { "state": "live", "candidates": 141, "qualified": 19, "shown": 6,
                "held_back": 13, "rule_counts": { … }, "items": [ … ] },
  "what_changed": { "index": { "since_previous": { … }, "since_24h": { … } },
                    "sources": { … }, "race": { … }, "first_seen": { … } },
  "streaks":  { "state": "live", "scope": "3 observations spanning 4h",
                "records": [ … ], "streaks": [ … ], "busiest_hour": { … }, "facts": [ … ] },
  "entities": { "window_label": "33.3 hours (the 200-item cap, not the 7-day window)",
                "labs": [ … 8 … ] },
  "ledger":   { "established_at": "…", "runs": 2, "entities": { … }, "sources": { … } },
  "snapshot": { … what the next run diffs against … }
}
```

`facts` entries are `{ id, text }`, so a page can key on `busiest_hour` or
`level_held` rather than matching a string.

---

## Rendering

`site/templates/digestPage.mjs` exports `hasDigest(ctx)` and `render(ctx)` and
builds `/digest.html`. `site/templates/_whatchanged.mjs` exports `render(ctx)`
and returns `''` when `ctx.digest` is absent — the exact contract
`site/templates/news.mjs` uses, so the integrator wires it identically. Both
carry their own `<style>` and neither adds a line of JavaScript: everything on
both surfaces is in the static HTML before any script runs
(`docs/MOTION.md`, Rule 0).

---

## Known limitations

1. **Corroboration is rare in a 200-item window.** Measured across two
   consecutive live runs on 2026-09-24: 0 and then 2 items out of 200 carried by
   more than one independent source. The rule is correct and the count is
   honest; it simply means that on most days the brief is carried by the other
   four rules, and the page prints `corroborated: 0` rather than hiding it.
2. **Velocity is usually awaiting a baseline at 200 items.** Until the cap is
   raised or the window is split, `source_surge` will fire rarely. It is kept
   because it costs nothing when it cannot fire and it is correct when it can.
3. **The rollup window is the corpus window.** "Last 7 days" is a claim the
   corpus often cannot support, so the label is measured instead. A genuine
   7-day per-lab history needs a store this layer does not yet have; the ledger
   is the beginning of one.
4. **`frontier_salience` inherits the entity vocabulary's blind spots.**
   `docs/NEWS.md` limitation 1 applies here unchanged: the corpus is anglophone
   and open-web, so a major Chinese lab release reaches this layer mainly
   through how much the West writes about it.
5. **First-seen is a claim about our record, not about the world.** An entity's
   first sighting here means the first time it entered *this corpus*. The page
   says so in those words.
