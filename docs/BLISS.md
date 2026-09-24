# BLISS — the upside index

*"The other ending."*

**Route:** `/bliss.html` · **Collector:** `collector/bliss.mjs` · **Output:** `data/bliss.json`

BLISS counts 5 → 1, on the same 0–100 scale as DOOMCON, computed by the same code
over different inputs. DOOMCON measures takeover-adjacent tempo: capability,
compute, attention, governance, markets. BLISS measures upside tempo: science,
medicine, access, adoption, openness.

---

## 1. Why this exists

Every competitor in this category measures one direction. DoomBench, the IMD AI
Safety Clock, skynetcountdown, takeofftracker, pdoom.ai — all of them answer *how
bad*, none of them answers anything else.

"AI is scary" is a crowded take. **"Here are both numbers, computed identically,
and today they disagree" is not a take at all — it is an instrument.**

There is also a second, less obvious reason, and it is the one that matters over a
year rather than a week: an index that can only ever say "more doom" is a hype
account with a chart. `docs/TEARDOWN.md` §2.4 is explicit that pizzint's
credibility comes from posting the calm days. A calm day on DOOMCON is
uninteresting on its own. A calm day on DOOMCON *next to a moving BLISS* is a
story. The pairing is what makes the boring days publishable, and publishing the
boring days is what makes the loud days believed.

---

## 2. The formula

**Identical to DOOMCON's, because it is literally the same functions.**

`collector/bliss.mjs` imports `normalise`, `nowcast`, `composite`, `levelFor`,
`decideLevel` and `round` from `collector/engine.mjs`, along with every constant —
`BOUNDARY`, `DEADBAND`, `DWELL_UP_SECONDS`, `DWELL_DOWN_SECONDS`,
`MIN_INTERVAL_MS`, `LOCK_MS`, `QUORUM`, `NOWCAST_WINDOW`, `NOWCAST_MIN_WEIGHT`,
`SCORE_CENTRE`, `SCORE_Z_SCALE`. Nothing is reimplemented.

That is a deliberate constraint, not a convenience. **Two implementations that can
disagree would be worse than having no second index at all.** The entire value of
publishing both numbers is that they are commensurable; the moment they diverge
for an arithmetic reason rather than a world reason, the claim dies and takes the
main index's credibility with it.

The steps, in order:

1. **Normalise.** Each source value → empirical percentile against a **frozen**
   reference distribution (`data/bliss-reference.json`) → pseudo-z via the inverse
   normal CDF → `S = 50 + 12.5·z`, clamped to `[0, 100]`.
2. **Smooth.** EPA NowCast over the trailing 12 observations, weight floor 0.5.
3. **Pillar score** = mean of that pillar's live sources' smoothed scores.
4. **Composite** = `0.7 · mean(live pillars) + 0.3 · max(live pillars)`.
5. **Level** from the composite, through all six anti-flap layers: Schmitt
   deadband of ±3, dual-window dwell, 6-hour minimum interval, 4-hour post-change
   lock, one step per change, 2-of-5 pillar quorum. A level change is frozen while
   any pillar is dark.

### What `bliss.mjs` contributes that the engine cannot

Exactly three things: a different pillar list, a different level vocabulary, and a
different set of adapters. `runEngine()` itself is not reusable here because it
closes over `engine.PILLARS`, which `CONTRACT.md` forbids renaming or reordering —
so `bliss.mjs` re-walks the same steps in the same order, calling the same exported
functions at each one. The arithmetic is shared; only the bookkeeping is restated.

### The levels

Same bands, read from the same `BOUNDARY` constant, different words.

| level | name | band | reads |
|---|---|---|---|
| 5 | BECALMED | 0–34 | upside activity below this index's own norm |
| 4 | STEADY | 35–54 | within the normal range of the record |
| 3 | LIFTING | 55–69 | above the normal range of the record |
| 2 | SURGING | 70–84 | top decile of the record |
| 1 | UNMATCHED | 85–100 | beyond anything in the record |

Every one of those names describes **the needle**, never the world. `UNMATCHED` is
a statement about this index's reference distribution running out. It is not a
claim that anybody has been cured. See §7.

---

## 3. The sources

Ten adapters, two per pillar, every one verified against the live endpoint on
2026-09-24. Values below are the real readings from that run.

| pillar | id | measures | reading | unit |
|---|---|---|---|---|
| science | `arxiv-science-ai` | AI-method papers in eight non-`cs` arXiv categories | 76 | papers/7d |
| science | `openalex-ai-science` | published AI-in-science articles | 93 | works/30d |
| medicine | `clinicaltrials-ai` | AI trials with a start date in the window | 690 | trials/180d |
| medicine | `pubmed-ai-clinical` | AI + clinical records entering PubMed | 1,990 | records/30d |
| access | `hf-permissive-models` | new open weights under Apache-2.0 or MIT | 1,328 | models/24h |
| access | `openrouter-cost-floor` | tokens per dollar at the cheap frontier | 8.16 | Mtok/usd |
| adoption | `hf-model-downloads` | downloads of a fixed basket of 8 deployed models | 278,916,768 | downloads/30d |
| adoption | `npm-ai-installs` | installs of a fixed basket of 8 AI packages | 80,188,957 | installs/7d |
| openness | `epoch-open-weights` | open-weight share of notable model releases | 0.3929 | share/365d |
| openness | `github-permissive-ai` | new Apache-2.0 `machine-learning` repositories | 227 | repos/30d |

Details worth knowing:

- **`arxiv-science-ai`** covers `q-bio.BM`, `q-bio.QM`, `q-bio.GN`,
  `cond-mat.mtrl-sci`, `physics.chem-ph`, `physics.med-ph`, `math.NA` and
  `astro-ph.IM`, filtered on five AI phrases in the abstract. Deliberately **no
  `cs.*`** — that is DOOMCON's capability pillar, and counting it here would make
  BLISS a second copy of it wearing a nicer name. On the measured run, 76 of 399
  submissions in those categories cited an AI method: roughly one in five.
- **`openalex-ai-science`** is capped at **three boolean operators** by design.
  OpenAlex answers a 6-operator anonymous search with HTTP 429 and the message
  that queries past five operators are limited to one request per second. At three
  operators the same query answers in ~390 ms. *Count the operators before editing
  the term lists.*
- **`clinicaltrials-ai`** uses a **closed** `AREA[StartDate]RANGE[from,today]`.
  An open `RANGE[from,MAX]` returns 942 rather than 690 because it includes trials
  whose start date is in the future — registered plans, not starts. The pillar is
  about what has begun.
- **`pubmed-ai-clinical`** filters on **EDAT** (when PubMed indexed the record),
  not publication date. PubMed publication dates are frequently the journal issue
  date and can predate indexing by months, which would make "trailing 30 days"
  quietly mean "a window that already closed".
- **`openrouter-cost-floor`** reports the **reciprocal** of price — millions of
  tokens per dollar — rather than a negated price, so the contract rule "higher
  always means more" holds without putting a negative dollar figure on a chart.
  It is the **10th percentile** blended price (3:1 prompt:completion) among the
  360 listed models at ≥128k context, not the minimum: the minimum is one listing
  and moves by a factor of two on one promotional price. Measured p10 was
  $0.1225 per million tokens; the floor was $0.0217 and the median $0.90.
- **`epoch-open-weights`** is the only **ratio** in the index, and the only source
  that can fall while every count rises. 44 open-weight releases out of 112
  classified releases in the trailing year. Models Epoch have not classified, and
  models marked `Unreleased`, are excluded from the denominator — counting an
  unclassified model as closed would manufacture a downward bias out of somebody's
  backlog.
- **The two basket sources are all-or-nothing.** `hf-model-downloads` and
  `npm-ai-installs` sum over fixed sets, so a member that fails is not a smaller
  number — it is a *different* number, silently. Dropping `openai` alone would
  take ~28M off the npm weekly total and look exactly like the world losing
  interest. Any failure takes the whole source dark, which is the same call
  `collector/sources/github-releases.mjs` makes for the same reason.

---

## 4. Selection rules

A source enters BLISS only if all six hold:

1. **Free and keyless.** `CONTRACT.md` §1.3 — there are no secrets in this repo.
2. **An exact count, not a relevance score.** The API must answer "how many match
   this filter", not "here are some things that scored above zero".
3. **Higher must mean more upside.** Inverted sources are converted inside
   `collect()` (see `openrouter-cost-floor`), never downstream.
4. **A zero must be implausible.** Every adapter throws rather than report a zero
   it does not believe, because a silently broken filter returning 0 is a dead
   source wearing a plausible number — the exact failure this project exists to
   avoid. A thrown adapter goes dark, loudly, with the URL in the error.
5. **The failure domain must be distinct from its pillar partner.** Each pillar has
   two sources at two different operators, so one throttled API does not take a
   pillar dark and freeze the whole index.
6. **Fixed baskets are frozen.** Adding a package or a model to a basket makes the
   number jump for a reason unrelated to adoption, and every percentile computed
   against the frozen reference afterwards measures the edit. **Changing a basket
   creates a new source; it does not update an existing one**, and it requires
   rebuilding that source's reference entry.

### Sources tested and rejected

Recorded because a rejected source is a finding, and because the next person to
have these ideas should not have to re-measure them.

| source | why not |
|---|---|
| **openFDA 510(k)** | The API has no field for *whether a device is AI/ML-enabled*, and the text fields produce false positives that swamp the signal: `openfda.device_name:artificial` returns 157 hits led by **ORAMOIST**, an artificial-saliva product. `device_name:(artificial AND intelligence)` returns **zero**. `device_name:learning` returns 7 ever. The FDA publish an AI-enabled device list, but not through this API. |
| **Crossref** | `total-results` reflects a fuzzy relevance match rather than a boolean filter — a 30-day "AI materials" query returned **31,460**, which is not a count of anything specific. Also returned HTTP 429 on the second consecutive anonymous request. |
| **pypistats.org** | Needs one request per package, so an 8-package basket is ~192 requests/day at hourly cadence against a volunteer-run service. It answers a burst with a bare `429 RATE LIMIT EXCEEDED` carrying **no `Retry-After` and no rate-limit headers**, and `fetch.mjs` deliberately never retries a 429. Replaced by npm, whose registry API answers an entire unscoped basket in **one** request. *Honesty note: the block encountered during development was triggered by this project's own probing. The design objection stands on its own — fewer requests against an API built to serve them — but the 429 was self-inflicted, not evidence that pypistats is unreliable for a gentler client.* |

---

## 5. The three states

The same discipline the rest of the site holds, and the reason this page can ship
before a single score exists:

| state | meaning | on the page |
|---|---|---|
| **live** | answered, and has a frozen reference entry | scored, folded into its pillar |
| **dark** | the fetch failed | excluded, never imputed, never zeroed, error printed |
| **awaiting baseline** | answered fine; no frozen history to score against yet | value published in full, **not** scored |

`scoreBliss()` computes a single `posture` field so no template can merge them.

**The ordering trap, found by running this on the real cold start:** the naive rule
*"any dark source means the posture is dark"* reported BLISS as DARK on a run where
8 of 10 sources answered perfectly and the only reason there was no score was that
no reference existed yet. That is precisely the lie this index must not tell — an
absent baseline presented as an outage. The reason there is no score is now
diagnosed from *why*, not from whether anything else failed:

- no score **+ nothing is calibratable** → `awaiting-baseline`
- no score **+ something is calibrated** → `dark`

Dark sources are still reported loudly in `failed_sources` either way.

---

## 6. Cold start

**BLISS has no frozen reference on day one, and it says so.**

`data/bliss-reference.json` does not exist yet, so every source is *awaiting
baseline*, every pillar is *awaiting baseline*, the composite is `null` and the
level is `null`. This is the designed state, identical to DOOMCON's markets pillar,
and it is **not** dark.

The page is still worth publishing in that state, because the source table carries
ten real measured values with their units and their windows — which is more than
any competitor in the category publishes at all.

Nothing is imputed, back-filled or estimated in the meantime. The alternative —
printing a plausible number over an empty reference — is the failure this project
was built in reaction to.

**To leave cold start**, build `data/bliss-reference.json` in the shape of
`data/reference.json`: a `sources` map keyed by adapter id, each entry carrying
`{label, pillar, aliases, unit, accepted_units, method, params, n, coverage, min,
max, median, quantiles}` with a 101-knot quantile grid and an integer `n ≥ 2`.
`bliss.mjs` reads it through the same `buildReferenceIndex` logic the engine uses,
including alias resolution. Sources appear as scored the moment their entry exists;
there is no flag to flip and no code change.

Note that most BLISS sources **cannot be backfilled from the API** — ClinicalTrials
and PubMed can be queried for historical windows, but OpenRouter prices, HuggingFace
daily counts and npm weekly downloads have no public history at the granularity we
read them. For those the reference has to be **accumulated forward** from
`data/bliss-history.ndjson` rather than reconstructed. That is a real constraint on
how quickly BLISS can start scoring, and it is why the cold-start state is designed
to be publishable rather than treated as a brief inconvenience.

---

## 7. Why an upside index is harder than a tempo index

This is the honest section. Every point below is a reason to trust BLISS *less*
than DOOMCON, and they are on the page rather than in a footnote because an
instrument that hides its error bars is a pitch.

**1. Tempo needs no counterfactual. Upside does.**
"How many papers were submitted" is a complete question. "How much good landed"
is not — it requires knowing what would have happened anyway. A count of
AI-assisted papers is a count of *claims of assistance*, not of value created.
DOOMCON's pillars have this problem barely; BLISS's have it constitutively.

**2. The lag is longer and far more variable.**
A model release is observable the day it ships. A drug that began as an
AI-designed molecule is observable eight to twelve years later, if ever. BLISS
therefore measures *leading indicators of outcomes it cannot wait for*, which
means it is substantially measuring inputs and calling them upside. `clinicaltrials-ai`
is the clearest case: a trial starting is a commitment, not a result.

**3. Attribution is contested in a way volume is not.**
Nobody disputes that arXiv published N papers. Plenty of people dispute whether
"machine learning" in an abstract means the model did the work or autocompleted
the methods section. Phrase matching cannot tell the difference — and **no LLM is
used anywhere in this layer** to adjudicate, because a judgement call a stranger
cannot reproduce would destroy the one property that distinguishes this index from
DoomBench's 67.8.

**4. Benefit has no natural unit, so the weighting is a value judgement.**
Activity has an obvious scalar: count per window. Benefit does not. Is a billion
cheap tokens worth one clinical trial? The five pillars are weighted **equally**,
and that is not neutrality — it is a choice, and any other choice would also be
one. The mean is the least indefensible option available, not a correct answer.

**5. Selection bias runs the wrong way.**
Failure is loud and success is quiet. A model that invents a citation makes the
news; a model that correctly flagged ten thousand mammograms does not. BLISS reads
registries, indexes and package managers precisely because they are indifferent to
newsworthiness — but that same indifference means it misses every benefit that is
never registered anywhere.

**6. The measurable proxy is quantity, and the claim is about quality.**
HuggingFace's daily model count is dominated by quantisations and fine-tunes. A
permissive-licence count rises when one person scripts five hundred uploads.
Tempo indices share this weakness, but for an upside index it bites harder,
because the whole point is the quality of an outcome and the only free proxy is
the quantity of an artefact.

**7. Nine of ten sources are counts; only one is a ratio.**
Counts conflate "more open" with "more". `epoch-open-weights` is the only source
that can fall while everything else rises, and it is the only one that answers
"what *share* of this is good" rather than "how much happened". A future version
should convert more pillars to ratios — that is the single largest improvement
available to this index, and it is not done yet.

**8. The naming trap is worse here, not better.**
`docs/VOICE.md` §1 tells the WHO Phase 6 story: the scale measured geographic
spread, the public read it as severity, and the numbered phases were gone by 2013.
BLISS inherits that trap with the sign flipped. A reader seeing **BLISS 1
UNMATCHED** will want to read it as "things are great". It does not mean that. It
means measured upside-tagged activity is running past anything in this index's own
frozen record — which is a fact about a reference distribution and nothing else.

> **A high BLISS is not good news and a low BLISS is not a verdict.** Both are
> readings of activity tempo against a frozen record. Neither is a probability,
> neither is a valuation, and neither is a prediction.

---

## 8. Limitations and operational notes

- **arXiv contention.** `collect.mjs` queries arXiv for DOOMCON's capability
  pillar, and `bliss.mjs` queries it again minutes later. arXiv throttles hard and
  keeps throttling; during development the BLISS query timed out at 40 s on a run
  that followed probing, then answered in ~1.2 s once the throttle cleared. This is
  survivable by design — `openalex-ai-science` carries the science pillar when
  arXiv is dark — but **leaving a gap between `collect.mjs` and `bliss.mjs` is
  worth doing**, and a run where both arXiv sources report is a run where neither
  was throttled, not a coincidence.
- **Epoch bandwidth.** `epoch-open-weights` downloads a ~2.2 MB CSV every run
  because `collector/fetch.mjs` has no conditional-request path. Epoch update the
  file roughly weekly, so hourly fetching re-downloads an unchanged file ~54 MB/day.
  The honest mitigation is cadence, not a cleverer fetch: **BLISS does not need to
  run hourly.** Most of its windows are 7 to 365 days wide and nothing in it moves
  meaningfully inside an hour.
- **Window widths are inconsistent by necessity**, from 24 hours
  (`hf-permissive-models`) to 365 days (`epoch-open-weights`). Each is chosen so
  the underlying rate puts the reading in a range where one event does not move it,
  but it means the pillars respond at very different speeds and the composite is a
  mixture of cadences. A sudden move in BLISS is almost always the 24-hour source.
- **`github-permissive-ai` is a floor, not a total.** GitHub's search API ANDs
  repeated `license:` qualifiers rather than ORing them, so broadening beyond
  Apache-2.0 means more requests against an endpoint that allows ten a minute
  unauthenticated. One topic, one licence, stated openly.
- **The index has no receipts yet.** DOOMCON writes hash-chained receipts through
  `collector/receipts.mjs`; BLISS writes `data/bliss.json` and appends
  `data/bliss-history.ndjson`, but does not yet write a receipt chain. It should,
  and the `constants` and `reference.hash` blocks already in `bliss.json` are the
  inputs a receipt would carry.

---

## 9. Running it

```bash
docker run --rm --network host -v "$PWD":/app -w /app node:20-alpine \
  node collector/bliss.mjs
```

Flags: `--data DIR` (default `data`), `--quiet`, `--dry-run` (compute and print,
write nothing).

It writes `data/bliss.json` and appends `data/bliss-history.ndjson`, and **never
touches `public/`** — `site/build.mjs` clears that directory before regenerating,
so anything written there first is deleted. Run it before `site/build.mjs`.

Some sources dark is a normal Tuesday and exits 0. Every source dark exits 1.
