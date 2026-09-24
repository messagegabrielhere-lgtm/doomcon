# The markets pillar

Three venues, three populations of trader, three adapters:

| source | venue | collateral | scalar | unit |
|---|---|---|---|---|
| `polymarket` | Polymarket (Gamma API) | crypto, offshore | volume-weighted mean \|1-day YES move\| | `prob_points/day` |
| `kalshi` | Kalshi (trade-api v2) | USD, CFTC-regulated | volume-weighted mean \|24h YES move\| | `prob_points/day` |
| `manifold` | Manifold (v0 API) | MANA, play money | total 24h turnover | `mana/24h` |

All three obey the repo-wide convention that **higher always means more
activity**. None of them publishes a probability of anything.

> **Status: the markets pillar has no frozen baseline.** `data/reference.json`
> carries reference distributions for `arxiv`, `hn`, `wikipedia`,
> `federal-register` and `sec-fts` only. Until a markets baseline is frozen the
> dashboard reports this pillar as *awaiting baseline*, which is a different
> state from *dark* and must stay different — dark means the pipe is dead,
> awaiting baseline means the pipe works and we have not yet earned the right
> to say whether today's number is high. Everything in this document is
> written on the assumption that the baseline has not been frozen yet, which is
> precisely why the selection rules were revised now rather than later.

---

## 1. Why repricing, never price

The obvious market scalar is "mean probability of AGI". It is wrong twice.

**It is forbidden.** CONTRACT's level-naming rule says the index measures
observable activity tempo and never a probability of harm. A mean YES price
across AGI markets *is* a probability of harm — it is the exact number every
judgement-scored competitor publishes and then spends a FAQ explaining away.

**It does not survive contact with the data.** Prediction venues partition one
question into many markets, and the number of partitions is a product decision,
not a fact about the world:

- **Polymarket `negRisk`** — "Which company has the best AI model" is 32 legs
  whose YES prices sum to 1 by construction. Add a 33rd contender and the mean
  falls, with no news.
- **Polymarket non-negRisk ladders** — `anthropic-ipo-by` is seven markets
  ("by Sep 30", "by Oct 15", "by Oct 31" …) and
  `will-anthropics-valuation-hit-by-december-31` is a stack of price
  thresholds. These are *not* flagged `negRisk`, they were the highest-volume
  AI markets on the venue on 2026-09-23, and before this revision they let one
  storyline occupy most of the basket.
- **Kalshi `mutually_exclusive` events and `greater` strike ladders** — "Best
  AI this week" is 9 mutually-exclusive legs; "NVIDIA H200 average hourly price
  in September" is 132 threshold markets over a single number. On the freeze
  scan, 2,008 of 2,320 candidate Kalshi markets — 86% — were strike ladders.
- **Manifold date ladders** — "Will we get AGI before 2027 / 2028 / 2030", all
  three live, all three by the same creator.

So every adapter measures **how hard the basket is being revised**, which is
additive-safe, direction-safe and bucket-safe, and which is what the word
*activity* denotes.

### Why absolute moves

YES means "AGI arrived" in one market and "the DOJ fined Nvidia" in the next.
Direction is not comparable across a heterogeneous basket. Magnitude is.

### Why volume-weighted

A market with $1M behind it moving 3 cents is news. A $200 market moving 30
cents is one bored trader. Weighting is checked every run: each adapter
publishes `max_single_market_weight`, so you can see whether one question is
driving the reading.

---

## 2. `polymarket` — Polymarket AI repricing

```
value = Σ(volume · |oneDayPriceChange|) / Σ(volume)
        over live, binary, independent AI questions — one member per event
unit  = prob_points/day
```

### Selection

Twelve fixed search terms against `gamma-api.polymarket.com/public-search`,
then a local screen. The terms are hard-coded because a basket whose selection
rule changes is not a time series.

```
AGI · artificial general intelligence · superintelligence · AI model
AI safety · AI regulation · OpenAI · Anthropic · Google DeepMind
xAI · DeepSeek · ChatGPT
```

Expanded from six terms to twelve on 2026-09-23. Measured contribution of each
addition, counting only markets that survived the full screen and were not
already in the basket: `ChatGPT` +19, `xAI` +15, `Google DeepMind` +13,
`DeepSeek` +9, `AI regulation` +7, `AI safety` +3. Terms that were tested and
**rejected for contributing zero new markets**: `Nvidia AI`, `Llama`,
`Mistral`, `AI company`. They are not in the list, so the cost of that
experiment is paid once rather than on every run.

This expansion is safe *for this adapter* because its scalar is a weighted
mean, which is robust to basket size. See §4 for why the same expansion was
deliberately withheld from Manifold.

### Screen, in order

1. `closed === false && active === true && acceptingOrders === true`
2. `negRisk !== true` — exclude mutually-exclusive legs
3. binary Yes/No only (exactly two outcomes, named Yes and No)
4. **word-boundary AI regex over the question text** (see §5)
5. `oneDayPriceChange` present — `null` is skipped, never coerced to 0
6. `volumeNum > 0`
7. **one member per event**: keep the deepest-traded leg, tie-broken on slug

Step 7 is the substantive change in this revision. Excluding `negRisk` was not
enough, because Polymarket's biggest AI markets are non-negRisk ladders. One
vote per event makes the basket bucket-safe in exactly the way the negRisk
exclusion already was: adding a rung to a ladder now changes nothing.

### Live reading, 2026-09-23

```
value                      0.02983006387962128 prob_points/day
markets_screened           3977
markets_passing_screen     249
events_in_basket           68
total_volume_usd           6,175,099.15
max_single_market_weight   0.1706
rejected {
  neg_risk               1784
  not_tradeable          1510
  off_topic               261     <- Polymarket's own search handed us these
  ladder_leg_collapsed     181
  no_1d_reference          138
  not_binary                25
  never_traded              10
}
```

---

## 3. `kalshi` — Kalshi AI repricing

```
value = Σ(volume_fp · |last_price_dollars − previous_price_dollars|) / Σ(volume_fp)
        over live, binary, independent, non-ladder AI markets
unit  = prob_points/day
```

Identical in construction *and in unit* to Polymarket, on purpose: the two
real-money venues are then directly comparable, and a divergence between them
is a fact about the venues rather than an artefact of two definitions.

Kalshi documents `previous_price` as the price 24 hours ago, so the difference
is a one-day move. A `previous_price_dollars` of `"0.0000"` means there is no
24-hour reference, **not** that the contract was worthless; those markets are
skipped, exactly as a `null` `oneDayPriceChange` is skipped on Polymarket. On
the live run that was 21 markets.

### ⚠ The field-name trap

**Kalshi moved every price and size field on `trade-api/v2` to `*_dollars`
(decimal strings) and `*_fp` (fixed-point decimal strings). The integer fields
are not present at all.**

Verified 2026-09-23 by listing the keys of a live market object:

```
present : last_price_dollars "0.1560"   previous_price_dollars "0.1530"
          yes_bid_dollars "0.1550"      yes_ask_dollars "0.1600"
          volume_fp "341105.06"         volume_24h_fp "906.93"
          open_interest_fp "164980.86"  liquidity_dollars
absent  : last_price  previous_price  yes_bid  yes_ask
          volume  volume_24h  open_interest
```

In JavaScript, `m.last_price` on that object is `undefined`. `Number(undefined)`
is `NaN`, which is at least loud — but the idiom everybody actually writes,
`Number(m.last_price ?? 0)`, is a silent **0**. An adapter written from an
older doc or from memory therefore produces a basket of markets all priced at
zero that never move: a confident, stable, entirely fictional reading. That is
the precise failure this project exists to refuse.

So `kalshi.mjs` reads every numeric field through `dollars()` or
`fixedPoint()`, which throw with the real field name rather than defaulting.
Exercised against stubs:

| stub | result |
|---|---|
| healthy control | `value=0.05 basket=40` |
| `last_price_dollars` renamed away | throws: *"last_price_dollars is undefined on market … the integer fields do not exist on this endpoint. Do not substitute them and do not default to 0."* |
| price returned as a number, not a string | throws: *"was number (0.47), expected a decimal string such as \"0.4700\""* |
| price is a non-numeric string | throws: *"is \"n/a\", which is not a number"* |
| `volume_fp` renamed away | throws: *"Volumes on trade-api/v2 are decimal STRINGS in \*\_fp fields"* |
| every price parses to `0.0000` | throws: basket empties, source goes dark, no number published |
| legacy integer fields **restored** | does *not* throw; `legacy_integer_fields_seen` rises to 40 |

That last row is a reverse tripwire. If Kalshi ever puts the integer fields
back, both shapes will be present at once, which is exactly when a future edit
picks the wrong one. `legacy_integer_fields_seen` should read `0`; if it does
not, re-check every field read in the file.

**A second trap, for anyone verifying this claim.** The *v1 search* endpoint
(`api.elections.kalshi.com/v1/search/series`) still returns the integer fields
alongside the dollars ones. So "I checked, `yes_bid` is an integer" can be true
and irrelevant at the same time. This adapter uses `trade-api/v2` only.

### Selection: a frozen series basket

Kalshi has no tag filter on its market endpoints and no full-text search on
`trade-api/v2`, so the basket cannot be a query the way the other two are. It
has to be a list of series tickers, frozen on **2026-09-23** by this scan:

1. `GET /series?category=C` for `C` in *Science and Technology, Financials,
   Politics, Companies, Economics, Sports* — the six categories carrying any
   AI-tagged series. **190 unique series** carry Kalshi's curated `AI` tag.
2. `GET /events?series_ticker=…&status=open&with_nested_markets=true` for each.
   **83** had any open event; the rest are long-resolved (GPT4P5, SORA, ALTMAN).
3. Apply the screen below.
4. Keep every series that yielded at least one surviving market: **30**.

The 30, with why each is there:

| series | question |
|---|---|
| `KXOAIAGI` | When will OpenAI achieve AGI? |
| `KXAGICO` | When will any company achieve AGI? |
| `KXCLAUDE` | Anthropic model release timing |
| `KXGEMINI` | Google Gemini release timing |
| `KXGPT` | Next OpenAI model release timing |
| `KXGROK` | xAI Grok release timing |
| `KXLLAMA5` | Will Meta release Llama 5 this year? |
| `KXTOPAI` | Which companies will have a top-ranked AI model this year? |
| `KXBESTLLMCHINA` | Will a Chinese AI model be #1 this year? |
| `KXAINEURALESE` | Neuralese-recurrence model released before 2027? |
| `KXRSIANNOUNCE` | Recursive self-improvement announcement |
| `KXGPTCOST` | Will OpenAI increase the cost of ChatGPT? |
| `KXAILEGISLATION` | Will LLM restrictions become law in 2026? |
| `KXAIBIOSECURITY` | AI biosecurity safeguards into US law |
| `KXAISAFETYAUDIT` | Independent AI safety audits into US law |
| `KXAIDUTYOFCARE` | Catastrophic AI duty of care into US law |
| `KXAIINCIDENTREPORT` | Serious AI-incident reporting into US law |
| `KXFTCAIBOOKS` | FTC investigation into AI book destruction |
| `KXNVIDIAGROQFINE` | DOJ fine over the Nvidia/Groq deal |
| `KXAPPLEOPENAICASE` | Will Apple win its case against OpenAI? |
| `KXBUCKMASTERSUE` | Will Tristan Buckmaster sue OpenAI or Bubeck? |
| `KXBUBECKLEAVE` | Will Sébastien Bubeck leave OpenAI? |
| `KXCOMPANYACTIONANTH` | Anthropic open-weights letter |
| `KXANTHROPICMILLENNIUM` | Anthropic Millennium Prize solution |
| `KXOPENAIANOTHERMILLENNIUM` | OpenAI Millennium Prize solution |
| `KXTESLAOPTIMUS` | Tesla Optimus released this year? |
| `KXWAYMOCITY` | Where will Waymo operate in 2026? |
| `KXROBOTAXIAREA` | Which states will robotaxi be offered to in 2026? |
| `KXDATACENTER` | Nuclear-powered data centre on a military base |
| `KXSPACEDATACENTER` | 1 MW data centre in orbit |

Frozen rather than rediscovered every run for two reasons. The honest one: a
membership rule that re-runs on every collection is not a time series, it is a
moving average of Kalshi's product roadmap. The practical one: rediscovery
costs 190 requests per run, and Kalshi throttles hard.

#### Rate limits, measured

Kalshi publishes ~10 reads/sec for unauthenticated clients. The burst bucket is
far tighter and refills slowly. From a single host on 2026-09-23:

| pattern | result |
|---|---|
| 190 requests, concurrency 6 | **164 × HTTP 429** |
| 190 requests, concurrency 2 | **128 × HTTP 429** |
| 30 requests, concurrency 2, 150 ms spacing (~7/s) | **4 × HTTP 429** |
| 30 requests, sequential, 250 ms spacing (~3/s) | **0 × HTTP 429** |

`collector/fetch.mjs` deliberately does not retry 429 — retrying a throttle is
how a client earns a ban — so a burst does not degrade gracefully, it deletes
the basket. The adapter therefore runs one worker at ~3 req/s and takes about
**11 seconds** of the 50 s adapter watchdog. This source is collected every
fifteen minutes and has nowhere to be.

If more than 3 of the 30 probes fail, the adapter **throws** rather than
publishing a mean over an arbitrary subset. That is deliberate: a volume-
weighted mean does not collapse toward zero when a member is missing the way a
sum does, but losing `KXCLAUDE` (23.8% of basket volume) still moves the
number, and a number that silently depends on which requests got through is not
reproducible.

#### Drift audit

One extra request per run (`/series?category=Science and Technology`, 382 KB)
checks the freeze and publishes the result in `meta.discovery`:

- `ai_tagged_now` — AI-tagged series in that category right now (129)
- `basket_members_ai_tagged_here` — basket members this one category still
  tags AI (14; most of the basket lives in Financials, Politics and Companies)
- `ai_tagged_not_in_basket` — **the haystack** (115). Mostly long-resolved
  series with no open events. A big number here is normal.
- `ai_tagged_not_in_basket_updated_since_freeze` — **the needle** (4 on
  2026-09-23: `KXGOOGVREQ`, `KXLABSPEND`, `KXLLM1`, `KXMODELSPEND`). AI-tagged,
  not probed, and touched by Kalshi since the freeze date. This is the only
  number that should trigger a re-freeze.

The other five categories are not scanned on the cron: Sports alone is 6.0 MB
and Politics 2.9 MB, which is an absurd amount of bandwidth every fifteen
minutes to audit a handful of miscategorised series.

#### Re-freezing the basket

```bash
docker run --rm --network host -v "$PWD":/app -w /app node:20-alpine \
  node -e '
    const cats=["Science and Technology","Financials","Politics","Companies","Economics","Sports"];
    const out=new Set();
    for (const c of cats) {
      const r = await fetch("https://api.elections.kalshi.com/trade-api/v2/series?category="+encodeURIComponent(c));
      for (const s of (await r.json()).series||[]) if ((s.tags||[]).includes("AI")) out.add(s.ticker);
      await new Promise(r=>setTimeout(r,400));
    }
    console.log([...out].sort().join("\n"));
  '
```

Then probe each ticker **sequentially, 250 ms apart** for open events, apply
the screen, and keep the series that yield survivors. Update `SERIES` and
`FREEZE_DATE` in `collector/sources/kalshi.mjs` together, and say so here. A
re-freeze is a versioned change to the series definition, not a tidy-up.

*(The one-liner above calls `fetch` directly and is exempt from the
"everything through `collector/fetch.mjs`" rule precisely because it is not in
the repo — it is an operator command that runs once, by hand, outside the
pipeline. Nothing under `collector/` may do this.)*

### Screen, in order

1. event `mutually_exclusive !== true`
2. `market_type === 'binary'`
3. `status === 'active'`
4. `strike_type` not in `{greater, greater_or_equal}` — exclude numeric ladders
5. `last_price_dollars > 0 && previous_price_dollars > 0` — a 24h reference exists
6. `volume_fp > 0`

Steps 1 and 4 currently reject **zero** markets on the live run, because the
frozen 30-series basket excludes the mutually-exclusive and ladder series at
the series level. They stay in the code as guards: a series can change shape,
and a re-freeze runs the same screen over the full 190.

### Live reading, 2026-09-23

```
value                        0.018084838390050272 prob_points/day
series_probed / ok / failed  30 / 30 / 0
events_open                  34
markets_screened             140
markets_in_basket            109
total_volume_contracts       3,684,393.82
max_single_market_weight     0.1031
legacy_integer_fields_seen   0        <- must stay 0
text_gate_misses             35       <- advisory, see §5
unweighted_mean_yes_price    0.3185   <- context only; NOT scored on
rejected { no_24h_reference: 21, not_active: 10 }
```

Top contributors to that number:

| contribution | move | volume | market |
|---|---|---|---|
| 11,398 | 0.0300 | 379,941 | Tesla Optimus released this year? — Before 2027 |
| 11,309 | 0.0390 | 289,972 | When will OpenAI achieve AGI? — Before 2028 |
| 10,034 | 0.0700 | 143,342 | Which companies will have a top-ranked AI model this year? — OpenAI |
| 5,309 | 0.0200 | 265,471 | When will Anthropic release Mythos? — Before Jan 1, 2027 |
| 4,044 | 0.0300 | 134,810 | Will a Chinese AI model be #1 this year? — Before 2027 |
| 3,341 | 0.0200 | 167,070 | Will OpenAI increase the cost of ChatGPT? — Before 2027 |
| 2,651 | 0.3800 | 6,976 | Next Gemini Pro model release — Before Oct 1, 2026 |
| 2,542 | 0.1700 | 14,956 | When will xAI release Grok 5? — Before 2027 |

---

## 4. `manifold` — Manifold AI market turnover

```
value = Σ volume24Hours  over live binary MANA AI markets
unit  = mana/24h
```

Play money, and that is a feature. Manifold has no CFTC perimeter, so it lists
hundreds of capability questions no real-money venue will touch — the long tail
of AI belief. It is the breadth signal; Polymarket and Kalshi are the depth
signals.

**24-hour flow, not lifetime volume**, because lifetime volume only ever goes
up: it is a cumulative total, not a tempo.

### Why its terms were NOT expanded

This is the one asymmetry in the pillar and it is deliberate.

Manifold's scalar is a **sum**. A sum moves with basket size, so adding a search
term raises the reading with no change in the world. Measured, not assumed:
adding the eight terms Polymarket gained takes this basket from **234 markets
to 496** — more than double — while the 24-hour volume those terms bring is a
rounding error, because the markets they reach are the dormant tail. The index
would have stepped up for a configuration change.

Polymarket can expand because its scalar is a weighted **mean**, which is
basket-size robust. Manifold cannot. This is why the two term lists must never
be "tidied up" into one shared constant, even though they overlap.

The six terms stay: `AGI`, `artificial general intelligence`,
`superintelligence`, `AI capabilities`, `OpenAI`, `Anthropic`.

The basket-size confound is published, not hidden: `markets_in_basket` is on
every reading, and any future markets baseline must be frozen against the same
term list.

### Screen, in order

1. `isResolved === false`
2. `outcomeType === 'BINARY'`
3. `token === 'MANA'` — MANA and CASH are two currencies; summing them would be
   adding two units and calling the result a number
4. `probability` is a number, `id` is a string
5. `closeTime` is not in the past — `filter=open` is about resolution state,
   not the clock. This found **0** markets on 2026-09-23 across all 251 rows,
   and the count is published anyway: a guard whose output nobody can see is
   indistinguishable from a guard that does not work.
6. **word-boundary AI regex over the question text**
7. `volume24Hours` present — absent means Manifold reported nothing, which is
   not the same as "nothing traded". Skipped, not zeroed.

### Live reading, 2026-09-23

```
value                        16093.032056419124 mana/24h
markets_screened             300
markets_in_basket            234
total_volume_lifetime_mana   3,788,676.80
mean_probability             0.4320   <- context only; NOT scored on
rejected { off_topic: 19 }
```

---

## 5. The shared AI matcher, and why it is applied differently

```js
/\b(a\.?i\.?|agi|llm|gpt|openai|anthropic|deepmind|deepseek|mistral|chatgpt|
   claude|gemini|grok|superintelligence|artificial\s+(general\s+)?intelligence)\b/i
```

Defined **once**, in `collector/sources/polymarket.mjs`, and imported by
`manifold.mjs` and `kalshi.mjs`. It used to be a byte-identical copy in two
files, justified on the grounds that each adapter should own its screening
rule. That reasoning does not survive scrutiny: three copies of one regex is
three places to fix a false positive and two of them will be missed. What
genuinely has to be per-adapter is *how* the matcher is applied, and each
adapter documents its choice at the call site.

It lives in `polymarket.mjs` rather than a shared helper because `collect.mjs`
discovers adapters by directory listing, and a helper would have to be a new
`_`-prefixed file in `collector/sources/` — a path this change does not own.

**Word boundaries are mandatory.** A bare `ai` substring matches *said*,
*chair*, *Dubai*, *Taiwan*, *campaign*. `\b` on both ends makes all of those
misses while still matching `AI`, `A.I.` and `AI-safety`.

### Hard gate on Polymarket and Manifold

Their retrieval mechanism is a fuzzy full-text search that reaches into
descriptions, and Polymarket's is genuinely bad: on 2026-09-22 a search for
*"artificial general intelligence"* returned nineteen live markets about how
many times Netanyahu would say "Israel" in a speech. The regex corrects a
retrieval error, so it filters. Both adapters publish `rejected_off_topic` —
261 and 19 on the live runs — so you can audit the basket instead of trusting
it.

### Advisory only on Kalshi

Kalshi's retrieval mechanism is its own curated editorial `AI` tag, not a fuzzy
search. Running a regex over the title there would not correct an error, it
would overrule a human taxonomy — and it would drop *"Tesla Optimus released
this year?"*, *"Where will Waymo operate in 2026?"* and *"Will a 1-megawatt
data center go live in orbit?"*, all of which Kalshi tags AI and all of which
plainly belong.

So Kalshi publishes `text_gate_misses` (35 of 109) instead of dropping them,
and `rejected_off_topic` is `0` by construction. You can decide whether you
believe the tag. The count is there so that decision is informed.

---

## 6. `meta.top_markets` — the display contract

Each adapter now publishes a ranked display list alongside the audit list. Two
lists, two jobs, and conflating them is how a sidebar becomes noise:

- **`top_contributors`** (8) explains the *scalar*. Ranked by contribution to
  the weighted numerator — the only ranking that explains the number. It churns
  by design, because what moved today is what moved today.
- **`top_markets`** (8) is for *display*. Ranked by **volume**, tie-broken on a
  stable id, so the same eight questions persist run after run while their odds
  update underneath.

Ranking the display list by today's move would reshuffle the panel every
fifteen minutes. Verified: two consecutive live runs of each adapter produced
identical `top_markets` ordering and identical scalars.

### Row shape

```json
{
  "question":    "When will OpenAI achieve AGI? — Before 2027",
  "url":         "https://kalshi.com/markets/kxoaiagi",
  "probability": 0.16,
  "volume":      341105.06,
  "volume_unit": "contracts",
  "close_time":  "2027-01-01T04:59:00Z",
  "source":      "kalshi"
}
```

`volume_unit` is **not** decoration. Three venues means three currencies —
`usd`, `contracts`, `mana` — and a consumer merging the three lists into one
sidebar must not add them together or sort across them. Manifold rows are play
money and whatever renders them has to say so.

`probability` is the YES price, already on 0–1. Kalshi is rounded to whole
cents (its own tick); the other two to three decimals. `probability` may be
`null` on Polymarket if the encoded price array failed to yield a YES side;
`url` may be `null` on Manifold if the API omitted it. Render defensively.

### Per-venue ranking and URL notes

| | ranked by | dedupe key | url |
|---|---|---|---|
| polymarket | `volumeNum` desc, slug asc | event slug | `https://polymarket.com/event/<event slug>` |
| kalshi | `volume_fp` desc, ticker asc | `event_ticker` | `https://kalshi.com/markets/<series lowercase>` |
| manifold | lifetime `volume` desc, id asc | market id | the API's own `url` field |

- **Polymarket** — `/event/<slug>` returns HTTP 200; `/market/<slug>` 307-
  redirects, so the event form is the one emitted. Verified 2026-09-23.
- **Kalshi** — the API exposes no canonical web URL, so this one is
  constructed. The *series* page is the stable landing point: event tickers are
  dated (`KXCLAUDE-MYTH`, `KXLLM1-26SEP28`) and churn weekly, series tickers do
  not. **Not HTTP-verified from the build host** — kalshi.com's edge returned
  429 to every request from this IP during development. Stated rather than
  quietly asserted.
- **Kalshi** dedupes per event so *"Where will Waymo operate in 2026?"* cannot
  fill all eight slots with cities.
- **Manifold** returns a canonical `url`, so it is used rather than
  reconstructed.
- **Manifold** rows show *lifetime* volume, matching the ranking. A row
  displaying a different volume from the one it was sorted by is a bug report
  waiting to be filed.

---

## 7. Reproduce any of this

```bash
cd /path/to/doomcon
docker run --rm --network host -v "$PWD":/app -w /app node:20-alpine \
  node -e 'const a=(await import("./collector/sources/kalshi.mjs")).default;
           const {fetchJson}=await import("./collector/fetch.mjs");
           console.log(JSON.stringify(await a.collect(fetchJson),null,1));'
```

Swap `kalshi` for `polymarket` or `manifold`. Node is not installed on the
build host and is not required; everything runs in the container.

The numbers will not match the ones in this document, because markets move.
The *shapes*, the basket sizes and the rejection counts should be recognisably
close, and `legacy_integer_fields_seen` must read `0`.
