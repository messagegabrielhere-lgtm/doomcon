# Methodology

Every other live AI-risk index scores by human or model judgement. DoomBench's
own FAQ has to explain that its 67.8 "does not mean a 60 percent probability."
IMD's AI Safety Clock "blends quantitative metrics with qualitative insights and
expert opinion." None of them can be independently recomputed by a stranger.

**This one can.** Same code, same public data, same number. That is the only
claim DOOMCON makes, and this page exists so you can falsify it.

## What the index measures — and what it does not

DOOMCON measures the **observable activity tempo of the AI field relative to its
own history**: how fast models are shipping, how much compute and capital is
moving, how loudly the world is talking, how much governments are writing, and
how actively prediction markets are repricing AI questions.

**It is not a probability of harm.** It is not a forecast. A high level does not
mean something bad is happening, and a low level does not mean you are safe.

This distinction is load-bearing, and the cautionary tale is the WHO's pandemic
phase scale. Phase 6 measured *geographic spread*. The public read it as
*severity*. H1N1 turned out mild, the scale was blamed for the mismatch, and the
whole framework was scrapped in the 2013 revision. A scale that is read as
something other than what it measures does not survive being wrong.

So the levels are named after tempo, and the copy generated from them is
mechanically prevented from using future tense — `will`, `expect`, `predict`,
`imminent`, `soon`, `coming`, `warns`, `forecast`, `likely` are a hard-banned
word list enforced by a unit test, not by editorial discipline.

## The five pillars

| id | measures | current sources |
|---|---|---|
| `capability` | model releases, research output | arXiv, Hugging Face, OpenRouter, GitHub releases |
| `compute` | hardware, spend, market signal | SEC full-text filings, Vast.ai GPU spot, AI equity basket |
| `attention` | how loudly the world is talking | Hacker News, Wikipedia pageviews |
| `governance` | regulatory activity | US Federal Register, GOV.UK |
| `markets` | prediction-market repricing on AI | Polymarket, Manifold |

Every source returns a number where **higher always means more activity**. A
source that naturally points the other way is negated inside its own adapter, so
the convention holds everywhere downstream.

### Why the market pillar is not "average odds of AGI"

Because averaging odds measures the wrong thing, and it breaks.

Polymarket partitions single questions into mutually exclusive markets flagged
`negRisk` — "Which company has the best AI model" is 32 legs whose YES prices sum
to 1. Averaging a *level* across those legs measures **how many buckets exist**:
add a 33rd contender and the index falls with no news whatsoever. Manifold has
the same pathology with date ladders (AGI before 2030 / 2031 / 2032 / 2033).

So the market pillar measures **repricing**, not price:

- **Polymarket** — volume-weighted mean absolute 1-day change in YES price,
  across live, binary, *independent* (`negRisk` excluded) AI markets.
- **Manifold** — total 24-hour trading volume across live binary AI markets.

Both are direction-safe and bucket-safe, and both are what the word "activity"
actually denotes.

One more trap worth publishing: Polymarket's search is fuzzy over descriptions
and is genuinely bad — a search for "artificial general intelligence" returned 19
live markets about how many times a politician would say a particular word in a
speech. Both adapters therefore re-filter locally against a word-boundary AI
token regex, and report how many markets they rejected as `rejected_off_topic` so
you can audit the basket rather than trust it.

## The arithmetic

### 1. Normalise

Each raw source value becomes an empirical percentile against a **frozen
reference distribution** (`data/reference.json`), built once from historical
backfill and never updated live.

Frozen, not trailing. A trailing window silently redefines "normal" as it moves,
so a field that gets permanently busier eventually reads as calm again — the
index would quietly adapt away the very trend it exists to show.

The percentile then goes through an inverse normal CDF to a pseudo-z, and:

```
S = 50 + 12.5 · z        clamped to [0, 100]
```

The inverse normal CDF is Acklam's algorithm, implemented in
`collector/engine.mjs` with no dependencies. Relative error is below 1.15e-9 over
the open interval, which is far beyond what this application needs.

Min-max scaling was rejected: one ChatGPT-launch-sized outlier compresses
everything after it into the bottom of the range forever. Raw z-scores were
rejected for the headline number: heavy tails produce unbounded values and let a
single pillar swamp the composite.

### 2. Smooth

EPA **NowCast**, not a fixed-α EWMA. Over the trailing 12 observations, let
`w = max(0.5, min/max)` of that window; weight the observation from `i` periods
ago by `w^i`; divide by the sum of weights.

NowCast self-adjusts — it behaves like a 12-period average when things are calm
and collapses toward a 3-period average when they are volatile. That is exactly
the responsive-during-events, stable-when-quiet property this needs, and it comes
with a federal agency's citation rather than a constant picked by feel.

### 3. Compose

```
pillar    = mean of that pillar's live sources
composite = 0.7 · mean(live pillars) + 0.3 · max(live pillars)
```

Pillars are weighted **equally**. There is no ground-truth outcome to fit weights
against, so any ML-estimated weighting would be unfalsifiable decoration.

The `0.3 · max` term is borrowed from the AQI: one screaming component should
move the headline even when everything else is quiet. The 70/30 split is an
**explicit editorial judgement**, disclosed here rather than buried, because
disclosure is what makes a judgement defensible.

### 4. Level

| level | name | score |
|---|---|---|
| **5** | DORMANT | 0 – 34 |
| **4** | ROUTINE | 35 – 54 |
| **3** | ELEVATED | 55 – 69 |
| **2** | ACCELERATED | 70 – 84 |
| **1** | UNPRECEDENTED | 85 – 100 |

Counting *down* to 1, following DEFCON, because that grammar needs no explaining.
The 0–100 score is published alongside the level — the AQI dual-output pattern,
where you get both "157" and "Unhealthy".

## Anti-flap

An index that oscillates across a boundary destroys its own credibility. Six
layers prevent it, all live in v1:

1. **Schmitt deadband** — ±3 points around every boundary.
2. **Dual-window dwell** — escalate only if the 3h *and* 30min means are both
   past the threshold. De-escalate only if the 12h *and* 3h means are both below
   it. Standing down is deliberately four times slower than raising.
3. **Minimum 6 hours** between level changes.
4. **4-hour lock** after any change.
5. **One step per change** — never 5 → 3. The level walks a staircase.
6. **2-of-5 pillar quorum** must agree with the direction before anything moves.

## Missing data is never imputed

A source that fails is **dark**. It is not zero, not last-known-good, not
interpolated.

- A pillar with no live sources is dark, and is excluded from the composite.
- **A level change is frozen while any pillar is dark.**
- Post generation is suppressed entirely when two or more pillars are dark.
- The dashboard shows per-source freshness and a `DEGRADED` banner.

This is a direct response to what the competition does. pizzint.watch's own
health endpoint reports `"status":"healthy"` while showing 2 successful scrapes
in 24 hours across 16 monitored locations, and its homepage prints a confident
DOUGHCON 5 over four pizzerias reading NO DATA. Never print a confident number
over a dead pipe.

## Receipts

Every scored observation writes a receipt to `data/receipts/`, hash-chained:

```
hash = sha256( canonical JSON of this receipt, keys sorted, "hash" removed )
```

Each receipt carries `prev_hash`, the full pillar breakdown, **and every input
exactly as fetched**. So you can take any receipt, rerun the published engine
against its inputs, and get the identical number — or prove that you cannot.

`verifyChain()` in `collector/receipts.mjs` walks the whole chain and re-derives
every hash. Run it yourself.

One subtlety that matters for receipts: **arXiv counts are not immutable.**
Papers get cross-listed into `cs.AI`/`cs.LG` after publication and versions get
revised, so re-querying a past window can return a slightly different number than
we recorded. We therefore snapshot the value *and the exact query string* at
fetch time and never recompute history. A receipt records what we saw, not what
the source says today.

## How this index could mislead you

Three concrete failure modes of our own method. Naming them is the price of
asking to be taken seriously.

**1. It measures the loudness of English-language, Western, open-web AI activity
— not AI.** Every source is US/UK government, US-listed equities, English
Wikipedia, or Anglophone social platforms. A major Chinese lab release moves
this index mainly through how much *the West talks about it*. Substantial AI
progress happening quietly, in a language we do not sample or behind closed
doors, is close to invisible here. The index would read DORMANT through it.

**2. Attention and capability are correlated, so the index can double-count a
story.** A single large launch raises `capability` (the model ships), `attention`
(everyone posts about it), `compute` (the equity basket moves) and `markets`
(traders reprice) at once. The `0.3 · max` term then amplifies the loudest of
those. One event can therefore look like four independent pillars agreeing. The
2-of-5 quorum limits how far this can push the *level*, but it does not fix the
*score*.

**3. A frozen reference distribution ages.** It is frozen deliberately — see
above — but that means a field which is permanently, structurally busier than its
reference period will drift toward the top of the scale and stay there, and the
index will lose resolution exactly when things are most interesting. If that
happens the honest fix is a versioned `v2` reference with both series published
side by side, not a quiet re-baseline. We commit to that in advance, here, where
it can be held against us.

## Reproduce it yourself

No Node installation required:

```bash
git clone https://github.com/messagegabrielhere-lgtm/doomcon
cd doomcon
docker run --rm --network host -v "$PWD":/app -w /app node:20-alpine node collector/collect.mjs
docker run --rm --network host -v "$PWD":/app -w /app node:20-alpine node collector/engine.mjs
```

Compare your `data/state.json` against the published one. If they disagree, that
is a bug and we want the issue.

## Attribution

Historical training-compute and notable-model data comes from **[Epoch
AI](https://epoch.ai/)**, used under CC-BY 4.0.

## Limitations, stated plainly

- Backfill coverage varies by source; sources admitted to the reference set had
  to be backfillable, but not all reach equally far.
- Sub-hourly movement is not meaningful. The collector runs on a 15-minute cron
  and GitHub Actions schedules drift under load.
- `stockanalysis.com` is an **unofficial** endpoint and goes dark intermittently
  behind bot protection. It is deliberately non-load-bearing.
- This index has no backtest against outcomes, because it deliberately does not
  predict outcomes. Anyone claiming it "called" an event is misusing it.

**We don't know anything. We just count.**
