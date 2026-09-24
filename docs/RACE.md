# THE RACE — the key-players leaderboard

`/race.html` · `collector/race.mjs` → `data/race.json` · `site/templates/racePage.mjs`

The operator's brief: *"follow key players like Musk etc in the AI race and rank
their likelihoods."* `docs/SUB-INDICES.md` §1 specifies the page. This file is
the formula, the market list, the selection rules and the traps.

Every number quoted below was **measured on 2026-09-23/24 against the live
APIs**, not assumed. Where a claim is a judgement it says so.

---

## 0. The one-sentence claim

> Eight frontier labs, ranked by a live, money-backed probability that they hold
> the best AI model at year end, annotated with what each one actually shipped.
> **The ranking is the market's, not ours, and nothing on this page feeds the
> DOOMCON index.**

This page is the most shareable surface on the site and it is built on the
assumption that somebody who disagrees with the ordering will click through to
check it. That assumption is the reason every column links to its source, every
absence has a named state, and the ranking is one auditable number rather than a
blend.

---

## 1. The data unlock, and why it does not contradict the index

Polymarket runs **negRisk** markets: *"Which company has best AI model end of
2026?"* is a single event sliced into mutually-exclusive legs whose YES prices
sum to roughly 1 by construction.

`collector/sources/polymarket.mjs` **excludes negRisk legs from the index
scalar**, and that exclusion is correct. Averaging a *level* across N buckets
measures how many buckets exist: add a thirty-third contender and the mean drops
with no news in the world. A statistic over a partition is a statistic about the
partition.

As a **leaderboard** the identical structure is ideal. Each leg is a live,
money-backed probability attached to a named lab. *The thing that is useless for
scoring is exactly the right thing for display.*

`docs/SUB-INDICES.md`, "Shared rules": a page can be interesting without being
load-bearing, and conflating the two is how an index quietly becomes a vibe. So:

- `data/race.json` is read by `/race.html` and by nothing else.
- No value here enters `data/state.json`, the composite, or any pillar.
- The page says this in the first paragraph, above the fold.

---

## 2. The roster

Fixed and frozen in `PLAYERS` in `collector/race.mjs`. A leaderboard whose
membership changes run to run is not a leaderboard, it is a rolling screenshot
of somebody's search results.

| id | player | principal | Polymarket leg | Kalshi leg |
|---|---|---|---|---|
| `openai` | OpenAI | Sam Altman | `OpenAI` | `OpenAI` |
| `anthropic` | Anthropic | Dario Amodei | `Anthropic` | — none listed |
| `google-deepmind` | Google DeepMind | Demis Hassabis | `Google` | — none listed |
| `xai` | xAI | Elon Musk | `xAI`, `SpaceXAI` | `xAI` |
| `meta` | Meta AI | Mark Zuckerberg | `Meta` | `Meta` |
| `deepseek` | DeepSeek | Liang Wenfeng | `DeepSeek` | `Deepseek` |
| `mistral` | Mistral | Arthur Mensch | `Mistral` | `Mistral` |
| `qwen` | Alibaba Qwen | **null** | `Alibaba` | `Alibaba` |

**Qwen has no principal and the cell stays empty.** Alibaba's Qwen team has no
single public figurehead of the Altman/Musk kind. Filling the column with a
plausible executive name to keep it tidy would be a fabrication, which is the
one thing this project is built to refuse. The page prints "no single
principal".

**Leg titles are aliases, not guesses.** Two of them are load-bearing:

- **xAI trades as `xAI` on the year-end event and as `SpaceXAI` on the monthly
  ones.** Mapping only one spelling drops the player from one of the two markets
  and prints a null that means "we did not look properly" rather than "no market
  exists".
- **Kalshi spells it `Deepseek`**, lowercase *s*. Matching is
  case-insensitive-exact against the alias list for exactly this reason.

Every live leg that matches no alias is emitted in
`markets.unmapped_legs`, so a renamed leg surfaces as visible drift instead of
as a silent null on a row. On the run of 2026-09-24 that list was
`Amazon, Baidu, ByteDance, Meituan, Microsoft, Moonshot, Z.ai` — seven real
contenders outside our roster, whose combined 2.0% is shown on the page as the
"7 others" segment rather than dropped.

---

## 3. The rank

```
rank = descending order of  market.probability
     = the live YES price on the player's leg of the HORIZON event
tie-breaks: mindshare share, then player id   (a total order, so two runs over
                                               identical inputs rank identically)
```

**One number. Not a blend.** A weighted composite of probability, releases and
mindshare would need weights nobody can check against an outcome, and the
resulting scalar would be *ours* rather than the market's — at which point the
page stops being "here is what the money says" and becomes "here is our opinion,
dressed in arithmetic". Every other column is context and none of them move the
order.

### Selecting the market

Candidates are found by frozen search terms `['best AI model', 'AI model']`
against `gamma-api.polymarket.com/public-search` with `events_status=active`,
then filtered to events that are `negRisk` **and** whose title matches

```
/^which company has (?:the )?best ai model end of [^?]+\?$/i
```

anchored at both ends. Polymarket also runs `…on LiveBench (Coding)…`,
`…(Style Control On)`, `…Text Arena Math…` and `Best Chinese AI Company…`
variants of the same sentence. Those are **different questions with different
resolution sources**, and mixing them would produce a leaderboard nobody could
reproduce. Anchoring is what keeps them out.

Surviving candidates need at least 8 priced live legs and a resolution date.
Then:

| slot | rule | on 2026-09-24 |
|---|---|---|
| **HORIZON** — the rank basis | latest future resolution date | *end of 2026*, resolves 2026-12-31, 15 live legs, $1.40M |
| **SPOT** — the "today" column | earliest future resolution date | *end of September*, resolves 2026-09-30, $3.91M |

**Horizon carries the rank, and that is a measured choice rather than a taste.**
On 2026-09-24 the spot event had Anthropic at **98.75%** and every other lab at
or below 0.85% — true, and a degenerate leaderboard. The horizon event read
73.5 / 12.5 / 10.0 / 2.55 / 1.95 / 0.95 / 0.55 / 0.15, which is a distribution
you can argue with. It is also the question the brief actually asks: rank their
*likelihoods*. Spot is published beside it as the "today" column, so the
disagreement between the two horizons is visible rather than resolved in
silence.

### Unranked players

A player with **no leg** on the horizon event gets `rank: null` and sits in a
separate group below the ranking, ordered by mindshare. They are **not** placed
last at 0%. "Nobody is offering this bet" is not a low probability. (No player
was unranked on the 2026-09-24 run; all eight have legs.)

---

## 4. The markets

### 4.1 Polymarket — the rank basis

`GET https://gamma-api.polymarket.com/public-search?q=<term>&limit_per_type=40&events_status=active`

**TRAP — `outcomes` and `outcomePrices` are JSON-ENCODED STRINGS**, not arrays.
`outcomePrices` arrives as the literal characters `["0.735","0.265"]` and must be
parsed a second time; the prices inside are strings too. This is documented at
length in `collector/sources/polymarket.mjs`; `race.mjs` carries its own decoder
because that module's parser is private and this agent does not own that file.
The duplication is declared in a comment at both ends rather than hidden.

**TRAP — every negRisk event is padded with placeholder legs.** `Company A` …
`Company K` and `Other` exist so the operator can add a contender later without
redeploying. They carry `active: false` and either volume 0 at a 0.5 price or no
`outcomePrices` field at all. Counting them puts **eleven fictional labs on the
leaderboard at 50%**. The filter is `active === true` plus a priced Yes outcome;
the count of each rejection is published in `placeholder_legs` and
`unpriced_legs`.

**TRAP — `oneWeekPriceChange` is `undefined` on some legs.** It means Polymarket
has no week-old reference for that leg, usually because it barely traded. It is
kept as `null` and rendered as **"no ref"**, never coerced to 0. "The price did
not move" and "we have no price from a week ago" are different sentences, and on
2026-09-24 Mistral was in the second state.

**The legs sum to 1.0415, not to 1.0000.** That spread is the bid/ask across
$1.40M of lifetime volume. The page prints the observed sum, normalises only the
*segment widths* of the hero bar by it, and prints raw prices everywhere else.
Dividing the spread away without saying so would be a small, quiet lie about how
much the market agrees with itself.

### 4.2 Kalshi — the regulated cross-check

`GET https://api.elections.kalshi.com/trade-api/v2/events?series_ticker=KXTOPAI&status=open&with_nested_markets=true`

`KXTOPAI` — *"Which companies will have a top-ranked AI model this year?"* — is a
**better-shaped instrument for a leaderboard and a worse one for a partition**:
`mutually_exclusive` is `false`, so each company is an *independent binary bet*
and the legs are **not constrained to sum to 1** — they happened to sum to
**0.99** across 12 live contracts on 2026-09-24, which is a coincidence of the
book rather than a property of the instrument, and is published for exactly that
reason.

That means the two venues answer subtly different questions — *"holds the single
best model at a fixed date"* versus *"is top-ranked at some point this year"* —
and the page labels them separately instead of presenting one number seen twice.

**TRAP — the field names.** Every price and size field on `trade-api/v2` is a
decimal **string** in a `*_dollars` or `*_fp` field. The integer fields every
older doc refers to (`last_price`, `previous_price`, `volume`, `yes_bid`) **are
not present on this endpoint at all**, and `Number(m.last_price ?? 0)` is a
silent `0`. An adapter written from memory produces a basket of markets priced
at zero that never move — a confident, stable, entirely fictional reading. Both
`race.mjs` and `collector/sources/kalshi.mjs` route every read through parsers
that throw with the real field name rather than defaulting.

**Kalshi's delta is 24 hours, not 7 days.** `trade-api/v2` exposes no weekly
reference. Labelling a 24-hour move as a 7-day move to make the columns line up
would be a lie for the sake of a tidy table, so the Kalshi column carries a
level only and the doc says why.

**Kalshi lists no contract for Anthropic or for Google.** Measured, not assumed:
the 13 legs are OpenAI 24%, Meta 14%, xAI 14%, Baidu 8%, Z.ai 8%, Deepseek 7%,
Moonshot AI 7%, ByteDance 6%, Alibaba 4%, Nvidia 4%, Mistral 2%, 01A1 1%, and
Zhipu AI (inactive). **The Polymarket leader has no Kalshi contract at all.**
Those two cells read **"no market"**. Rendering them as 0% would invent a
bearish opinion the exchange has never expressed.

A leg with `status !== 'active'` (Zhipu AI, volume 0) is a listed-but-never-opened
contract. Also **not** a 0% chance; it is excluded and counted in
`inactive_legs`.

Kalshi legs outside our roster are reported too — `01A1, Baidu, ByteDance,
Moonshot AI, Nvidia, Z.ai` on this run — so a renamed leg is visible drift.

### 4.3 Manifold — a measured exclusion, re-measured every run

`GET https://api.manifold.markets/v0/search-markets?term=best%20LLM%202026&sort=liquidity&filter=open`

Manifold is the third venue in the markets pillar and it is play money. Exactly
one comparable question exists: *"Which company has the best LLM at the end of
2026? (Artificial analysis leaderboard)"*, a `MULTIPLE_CHOICE` market carrying
**1,117 MANA** of lifetime volume against a floor of 20,000.

It is excluded, and the exclusion is **re-run live on every build** rather than
asserted once in a comment. A static claim about someone else's site is exactly
the kind of thing that silently goes stale; if Manifold ever gets a deep market,
the floor lets it in on its own. `markets.manifold` carries the candidate, its
volume and the reason.

---

## 5. Shipping velocity — three channels, never summed

**There is no honest single "shipping velocity" scalar, and building one would
have been the easiest mistake in this file.** The three channels measure
genuinely different things and are biased in opposite directions. A sum would
produce a tidy column that meant nothing, so all three are published side by
side with their units attached.

| channel | what it actually measures | bias |
|---|---|---|
| `gh` | releases across a fixed basket of the lab's own repositories, 30d | **release engineering**. OpenAI, Anthropic and Google auto-cut an SDK tag on nearly every API change; DeepSeek and Qwen ship weights and cut almost none. |
| `hf` | model repositories the lab created on the Hugging Face Hub, 30d | **open-weight publication**. Structurally zero for a lab that does not publish weights. |
| `or` | new OpenRouter catalogue entries, 30d | **a third party's listing date**, not the vendor's announcement. Most *comparable* of the three: all eight players are in the catalogue. |

The page states the bias under the table. Compare a lab to its own channels, not
to another lab's.

### 5.1 GitHub

`GET https://github.com/<repo>/releases.atom`

**Basket rule, applied once and frozen:** a repository is admitted only if its
Atom feed carries **at least one release**. `xai-org/grok-1`,
`xai-org/grok-prompts`, `QwenLM/Qwen3`, `QwenLM/Qwen2.5-VL` and
`QwenLM/Qwen3-Coder` carry zero releases ever, so they are excluded by rule. The
consequence is real and is left visible: **xAI's basket is one repository**,
because xAI publishes almost nothing to GitHub; Qwen's is two, because Qwen
ships weights to Hugging Face instead.

| player | basket |
|---|---|
| OpenAI | `openai-python`, `openai-node`, `codex`, `openai-agents-python` |
| Anthropic | `anthropic-sdk-python`, `anthropic-sdk-typescript`, `claude-code`, `claude-agent-sdk-python` |
| Google DeepMind | `googleapis/python-genai`, `googleapis/js-genai`, `google-gemini/gemini-cli`, `google-deepmind/mujoco` |
| xAI | `xai-org/xai-sdk-python` |
| Meta AI | `meta-llama/llama-models`, `meta-llama/llama-cookbook`, `facebookresearch/faiss`, `facebookresearch/xformers` |
| DeepSeek | `DeepSeek-V3`, `DeepSeek-R1`, `DeepEP`, `DeepGEMM` |
| Mistral | `client-python`, `mistral-common`, `client-ts`, `mistral-inference` |
| Alibaba Qwen | `QwenLM/qwen-code`, `QwenLM/Qwen-Agent` |

**Baskets are of unequal size and the counts are therefore NOT comparable across
players.** This is stated rather than fixed: padding a basket with dead
repositories to reach a round number would measure nothing while looking
rigorous.

**TRAP — the ten-entry ceiling.** `releases.atom` returns the ten most recent
releases and nothing else; `?page=2` returns page 1 again. When all ten fall
inside the 30-day window the true count is `≥ 10` and the feed cannot say more.
`is_floor` is set, the JSON names the truncated repositories, and the page
renders a `≥`. On 2026-09-24: Anthropic `≥38`, OpenAI `≥33`, Google `≥24`,
Qwen `≥10`.

**TRAP — parse `<updated>` inside `<entry>` only.** The feed carries a
document-level `<updated>` before the first entry; a global match counts the feed
itself as a release. Entries are not ordered by `<updated>` (GitHub orders by
release creation), so every entry is read and there is no early break.

### 5.2 Hugging Face

`GET https://huggingface.co/api/models?author=<org>&sort=createdAt&direction=-1&limit=100`

`createdAt` is when the repository appeared on the Hub, which for an org account
is a **vendor-side publication event** — unlike OpenRouter's timestamp.

**Three states, and the middle one is the whole point.**

| state | meaning | rendered |
|---|---|---|
| `live` | the org publishes here; the count may legitimately be 0 | the number |
| `absent` | the org query returns **zero repositories at all** — the lab does not use this channel | **"not used"** |
| `dark` | the fetch failed | **"DARK"** |

`absent` is **derived, not hardcoded**: it fires when the author query returns an
empty list. On 2026-09-24 it fired for exactly one player — **Anthropic has no
Hugging Face presence**. Printing `0` against their name would read as "published
nothing this month", a claim about their month rather than about their
distribution strategy. That is the same category error as pizzint printing a
confident DOUGHCON 5 over a dead scraper, pointed the other way.

**Known distortion, stated rather than corrected:** one repo is one event, so a
family shipped in six sizes counts six times. Collapsing `Qwen3-4B` and
`Qwen3-32B` into one release would require inventing a suffix heuristic, and an
invented heuristic inside a published number is worse than a disclosed bias. In
practice the counts are small (0–4 per lab per 30 days on the live run), so the
distortion is currently minor.

If a full page of 100 rows is still inside the window, `is_floor` is set.

### 5.3 OpenRouter

`GET https://openrouter.ai/api/v1/models`

**The label matters more than the number.** `created` is the unix **seconds**
timestamp at which *OpenRouter listed* the model. It is not the vendor's
announcement date, it is frequently days later, and **nothing in the collector
or on the page calls it a release date**. The field is named `listed_30d`, the
column header is `OR`, and the caveat string travels inside `race.json` so it
survives the file being read away from the code that wrote it.

**TRAP — `created` is SECONDS.** Comparing it against `Date.now()` milliseconds
yields zero every single run and looks exactly like a quiet month.

**Prefix attribution**, frozen: `openai`, `anthropic`, `google`,
`meta` + `meta-llama`, `x-ai`, `deepseek`, `mistralai`, `qwen`. Meta needs both:
Llama weights ship under `meta-llama/` and the newer hosted models under `meta/`,
and one prefix undercounts by half.

Entries whose prefix begins `~` (`~openai/gpt-astra-latest`) are **moving
pointers at another entry, not distinct models**. They are excluded and the
excluded count is published: 18 of 459 catalogue entries on 2026-09-24.

---

## 6. Mindshare

Share of DOOMCON's own news corpus naming the lab, computed from the `entities`
array `collector/news.mjs` already wrote.

**It reuses `collector/news-sources/_entities.mjs` and does not re-extract.**
Writing a second extractor would give the site two vocabularies that can
disagree about the same headline. The player→entity map points at canonical
names from the published vocabulary:

| player | entities |
|---|---|
| OpenAI | `OpenAI`, `GPT`, `o-series`, `Sora`, `Whisper` |
| Anthropic | `Anthropic`, `Claude` |
| Google DeepMind | `Google DeepMind`, `Gemini`, `Gemma`, `Veo` |
| xAI | `xAI`, `Grok` |
| Meta AI | `Meta AI`, `Llama` |
| DeepSeek | `DeepSeek`, `DeepSeek-R` |
| Mistral | `Mistral`, `Mixtral` |
| Alibaba Qwen | `Alibaba Qwen`, `Qwen` |

**The vocabulary tripwire.** Each mapping carries a `probe` — a surface form that
must resolve to that exact canonical name — and `assertEntityVocabulary()` runs
every probe before a single request is made. A rename in `_entities.mjs` would
otherwise silently drop a player to 0% mindshare, which is the most expensive
kind of quiet failure this page can have. The run **dies loudly** with the probe,
the name it expected and the names it got, and tells the next person to fix the
map rather than add a second extractor.

### 6.1 TRAP — `window_days` is a ceiling, not the span

`news.json` carries `window_days: 7` **and** `max_items: 200`. Both are true and
**the cap binds first**. Measured 2026-09-24: the 200 newest items spanned
**43.8 hours**, not seven days.

Splitting a nominal 7-day window at its midpoint put all 200 items in the recent
half and **zero** in the prior half, so every trend came back `null` — a total
failure of the column that looked like missing data rather than like a wrong
denominator. It was caught only because the first live run printed
`prior_corpus: 0`.

So the split is taken at the midpoint of the corpus's **observed span**, and the
span is published in hours next to the number:

```
span   = news.generated_at − oldest item's published_at
split  = oldest + span / 2
recent = items at or after split      prior = items before split
share  = matching items / items in that half        delta = recent − prior
```

On 2026-09-24: span 43.8h, split 2026-09-23T02:09Z, 64 recent / 136 prior.
Both halves must carry **at least 20 items** or the delta is reported
**"too thin"** rather than computed anyway.

### 6.2 What the number is and is not

- **Shares do not sum to 100%.** One item naming both OpenAI and Anthropic
  counts for both. It is "how often is this lab in the conversation", not a
  partition of it.
- **It is share of *our* corpus, not of the internet.** Only **43 of 200** items
  named any lab at all on the live run; the rest are arXiv and Hugging Face
  preprints. That is most of why every share is small. The full entity histogram
  ships in `news_window.entity_counts` so the denominator can be inspected
  rather than trusted.
- **Meta's share is a FLOOR and is labelled one on the page.** `_entities.mjs`
  matches `Meta AI`, `FAIR` and `Meta Superintelligence` but deliberately **not**
  the bare token `Meta` — which is the right call for a corpus that is
  three-quarters ML preprints, where *meta-learning* and *meta-analysis* appear
  constantly and would match across the hyphen. The cost lands here: an item
  headlined *"Muse is coming to Meta smart glasses"* carries no entity. Declared
  in `MINDSHARE_CAVEATS`, rendered as a `FLOOR` tag beside the number, and
  explained in the row's expandable detail.

---

## 7. Loudness — and the honest empty column

The brief asks for the public posting cadence of each principal, **only from
feeds we can legitimately fetch**. Applied honestly that leaves almost nothing,
and *the empty column is the finding.*

| door | status, probed 2026-09-23 |
|---|---|
| X / Twitter | where six of these eight people actually post. Scraping it carries an **explicit permanent-suspension penalty** under the developer terms. Closed, not hard. |
| Facebook / Instagram | no free per-person feed at any documented path. `facebook.com/zuck/rss` → HTTP 404. |
| `darioamodei.com` | publishes essays, serves no feed. `/rss` → 404, `/feed.xml` → 404. |
| `hassabis.com` | 114 bytes of JavaScript redirect, not a document. |
| Liang Wenfeng, Arthur Mensch | no public feed in any language we can fetch. |
| **`blog.samaltman.com/posts.atom`** | **live Atom, 30 entries.** Published by the principal himself. |

Each empty cell carries its **specific reason string** on the row, not a shrug —
and never a zero.

### 7.1 TRAP — Posthaven rewrites `<updated>`

`blog.samaltman.com` is a Posthaven blog. **Every entry's `<updated>` is within
the last few days regardless of when it was written.** Measured 2026-09-23:

```
<published>2025-06-10  <updated>2026-09-23   "The Gentle Singularity"
<published>2025-10-04  <updated>2026-09-23   "Sora update #1"
<published>2023-12-21  <updated>2026-09-23   "What I Wish Someone Had Told Me"
```

Counting `<updated>` reports Altman as blogging **ten times this week**. The
truth, from `<published>`, is that the newest post on the blog is dated
**2026-04-10** and there has been nothing in the last thirty days. An
`<updated>` timestamp on this platform means "the CDN touched it", not "the
author wrote it".

`posthavenPublishedStamps()` reads `<published>` and **throws** if an entry lacks
one, rather than falling back to `<updated>`. The fallback *is* the bug.

The result on 2026-09-24: `posts_30d: 0`, `posts_7d: 0`, `newest_at:
2026-04-10`, across 30 entries in the feed — state **`dormant`**, because the
feed answered and parsed and the honest count is zero. Not `dark`, which would claim an
outage that is not happening (`docs/NEWS.md`, "Three source states, not two").

**Loudness does not enter the rank.** It is null for seven of eight players, and
ranking on a column that is null for seven of eight is imputation with extra
steps.

---

## 8. "Why this rank" — computed, never written

Two parts, both pure functions of the row's numbers.

**Part one** is always position and the gap to the leader, because that is
literally what the rank is.

**Part two** is chosen by a **fixed precedence** over whichever signals actually
have data, so identical inputs always produce an identical sentence and **no
clause can ever cite a null**:

1. a 7-day market move of at least **0.5** probability points
2. a mindshare swing of at least **2.0** points of corpus share
3. anything shipped to the three channels in 30 days
4. the explicit *"nothing we measure moved"* fallback

Every clause the selector *could* have used is also emitted as
`why_components` and rendered in the row's `<details>`, so a reader can see what
was passed over instead of having to trust the selection.

Real output, 2026-09-24:

```
Anthropic    Market leader at 73.5%, +61.0 points clear of OpenAI. +1.0 points over 7 days.
Meta AI      1.9%, −71.5 points against Anthropic. 1 GitHub release, 2 OpenRouter
             listings in 30 days.
Mistral      0.1%, −73.4 points against Anthropic. 4 GitHub releases in 30 days.
```

---

## 9. Five absences, five words, never a zero

The single most important table on this page, reproduced in the page's own
legend:

| rendered | meaning |
|---|---|
| **no market** | the venue lists no contract for this player. Not a low probability — nobody is offering the bet. |
| **no ref** | the venue has no price from a week ago to difference against. Not zero movement — no reference point. |
| **not used** | the player does not publish to this channel at all. Different from having published nothing this month. |
| **DARK** | the fetch or the parse failed on this run. Unknown, and never filled in. |
| **too thin** | one half of the news window carried too few items for a share comparison to mean anything. |
| `0` | we looked, the channel answered, and the answer is genuinely zero. **The only one of the six that is a measurement.** |

---

## 10. Failure behaviour

- The six network instruments run under `Promise.all` with a per-instrument
  try/catch. One dead venue never blocks the rest; it is reported **dark**, with
  its error text, on the same line as its id in `sources[]` and in the page's
  instrument-health strip.
- **The process exits non-zero only when the rank basis is dark.** A dead
  shipping channel is a normal Tuesday and the file is still useful. A dead
  Polymarket means there is no ranking, the page says so in the hero, every
  `rank` is `null`, and CI should notice.
- `assertEntityVocabulary()` runs **before any request**: a vocabulary drift is a
  code error, and spending forty HTTP requests before discovering it wastes
  someone else's rate limit.
- A malformed response shape is **fatal for that instrument** and never silently
  reinterpreted. Kalshi answers a throttle with a real HTTP 429 that `fetch.mjs`
  turns into a `FetchError`; a 200 whose shape changed is the *other* failure and
  is treated as one, because "no events" is a claim about the world.

---

## 11. Determinism

`CONTRACT.md` §1.4. `generated_at` is the only unseeded clock read; every window
is computed from it.

- All ordering is total: probability → mindshare → id; leg sorts break ties on
  title; repo and author maps are emitted sorted.
- No `Math.random()` anywhere, including no jitter in backoff (`fetch.mjs`
  already holds that line).
- `racePage.render(ctx)` is a pure function of `ctx`. Verified on the live data:
  two consecutive renders produced **byte-identical** 87,419-byte HTML.

---

## 12. Reproducing the numbers in this file

```bash
cd /path/to/doomcon

# the leaderboard, live
docker run --rm --network host -v "$PWD":/app -w /app node:20-alpine \
  node collector/race.mjs

# the market the rank is taken from
curl -s 'https://gamma-api.polymarket.com/public-search?q=best%20AI%20model&limit_per_type=40&events_status=active' \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); [print(e["slug"], e["endDate"], len(e["markets"])) for e in d["events"] if e.get("negRisk")]'

# the Kalshi cross-check, and the absence of an Anthropic leg
curl -s 'https://api.elections.kalshi.com/trade-api/v2/events?series_ticker=KXTOPAI&status=open&with_nested_markets=true' \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); [print(m["yes_sub_title"], m["last_price_dollars"], m["volume_fp"]) for m in d["events"][0]["markets"]]'

# the Posthaven trap, in one line
curl -s https://blog.samaltman.com/posts.atom | grep -oE '<(published|updated)>[^<]+' | head -8
```

---

## 13. Known limitations

1. **The rank is one venue's opinion.** Polymarket is offshore crypto
   collateral with a particular trader population. Kalshi disagrees sharply —
   it prices OpenAI at 24% to Polymarket's 12.5% — and that disagreement is
   shown rather than averaged away, but the *order* still comes from one book.
2. **The horizon market rolls.** *End of 2026* stops trading on 2026-12-31 and
   the selection rule will pick whatever the longest-dated instance is then. The
   slug and resolution date are published on every run so the change is visible,
   but a leaderboard whose question changed is not a continuous time series.
3. **Shipping is three proxies, none of them "shipping".** A lab that ships a
   frontier model with no SDK release, no Hub upload and no OpenRouter listing
   reads as zero across all three columns on the day it happens.
4. **Mindshare inherits the news layer's biases wholesale** — Anglophone,
   open-web, and ~78% research preprints on the live corpus. `docs/NEWS.md`
   §"Known limitations" applies here unchanged.
5. **Loudness is one blog.** The column exists to state honestly that the data
   does not, and it should not be read as a cross-player comparison.
6. **Principals are not tracked as entities.** `_entities.mjs` has no person
   vocabulary, and adding one here would be the second extractor this file
   spends a page arguing against.
