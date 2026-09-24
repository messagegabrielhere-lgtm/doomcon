# The news layer

DOOMCON's index answers *how fast is the field moving*. This layer answers
*what moved*. It is the data behind the news reel, and it is written against
one competitive claim, stated up front so the rest of this page can be read as
an argument for it:

> pizzint.watch's live column relays X posts. That makes it structurally
> **downstream** of the accounts it mirrors — it cannot print anything until
> somebody else has already posted it. This layer reads the **primary sources
> those accounts are themselves relaying**: arXiv, Hugging Face, lab
> newsrooms, GitHub release feeds. An item can appear here *before* it appears
> on X.

Two things follow from being upstream, and both are measured rather than
asserted:

1. **Lead time.** Every item records the earliest independent sighting across
   all sources that carried it, and how long that was before the last one
   printed it (`meta.corroboration.lead_minutes`). On the run of 2026-09-23 the
   Ars Technica / Hacker News pair on the Microsoft account-compromise story
   showed a **676-minute** spread; the arXiv → Hugging Face papers showed
   360–534 minutes.
2. **Corroboration.** With one source, "two independent outlets reported this"
   is not a computable quantity. skynetcountdown.com reads one TechCrunch RSS
   feed and says so (`docs/TEARDOWN.md` §4). Here, corroboration is the single
   heaviest term in the score.

**No LLM is used anywhere in this layer** — not to score, not to classify, not
to summarise. Every number below is a published formula over a published input.
That is the same claim `docs/METHODOLOGY.md` makes for the index, and it is the
reason DoomBench's 67.8 and IMD's clock cannot be recomputed by a stranger and
these scores can.

---

## Files

```
collector/news.mjs                orchestrator: discover, run, dedupe, score, write
collector/news-sources/*.mjs      one adapter per feed
collector/news-sources/_*.mjs     helpers, skipped by discovery
data/news.json                    output
```

Run it:

```bash
docker run --rm --network host -v "$PWD":/app -w /app node:20-alpine node collector/news.mjs
```

It writes `data/news.json` **only**. It never touches `public/`, so it is
order-independent with respect to `site/build.mjs` — which clears `public/`
before regenerating and would delete anything written there first.

---

## Shapes

### `NewsItem`

```json
{
  "id": "4a1f9c0e2b7d5813",
  "source": "hf-daily-papers",
  "kind": "paper",
  "title": "JEV-as-a-Judge: Accept When Confident, Escalate When Unsure",
  "summary": "…",
  "url": "https://huggingface.co/papers/2609.21188",
  "published_at": "2026-09-22T18:00:00.000Z",
  "pillar": "capability",
  "score": 54.0,
  "entities": ["Claude", "OpenAI"],
  "meta": { … }
}
```

| field | meaning |
|---|---|
| `id` | `sha256(canonical_url)` truncated to 16 hex chars. **Stable**, so reruns never duplicate an item. |
| `source` | adapter id of the item's *primary* source after de-duplication |
| `kind` | `lab` · `paper` · `model` · `release` · `forum` · `press` · `status` |
| `title` | plain text, entity-decoded, whitespace-collapsed |
| `summary` | plain text, HTML stripped, truncated to 320 chars on a word boundary |
| `url` | **canonical** URL (see below), not the URL as published |
| `published_at` | the **earliest independent sighting** across the duplicate group |
| `pillar` | one of the five `CONTRACT.md` pillars, or `null` |
| `score` | 0–100, see *Scoring* |
| `entities` | sorted canonical names from the published vocabulary in `_entities.mjs` |
| `meta` | everything needed to audit the above |

`meta` always carries `source_weight`, `pillar_reason`, `entity_kinds`,
`score_components`, `age_hours_at_score`, `engagement`, `first_seen_at` and
`corroboration` `{ count, sources, first_source, first_seen_published_at,
last_published_at, lead_minutes, also[] }`, plus whatever the adapter attached.

### `data/news.json`

```json
{
  "schema": 1,
  "generated_at": "2026-09-23T21:40:11.402Z",
  "scoring_version": "1.0.0",
  "window_days": 7,
  "max_items": 200,
  "scoring": { "WEIGHT_MAX": 25, "RECENCY_MAX": 20, … },
  "items": [ … ],
  "sources": [
    { "id": "openai", "kind": "lab", "label": "OpenAI newsroom", "weight": 1,
      "ok": true, "state": "live", "count": 21, "raw_items": 25,
      "newest_item_at": "2026-09-23T16:00:00.000Z", "error": null, "ms": 757 }
  ]
}
```

The `scoring` block is emitted into the file on purpose: the constants that
produced these numbers travel with the numbers, so a reader does not have to
match a file against a commit to recompute it.

### Adapter

Each `collector/news-sources/<id>.mjs` default-exports:

```js
export default {
  id: 'openai',            // unique, stable, kebab-case
  kind: 'lab',
  label: 'OpenAI newsroom',
  weight: 1.0,             // (0, 1]
  async collect(fetchText, fetchJson) { /* -> NewsItem draft[] */ },
}
```

A draft carries `{ source, kind, title, summary, url, published_at,
default_pillar, dedup_key, engagement, weight_override, meta }`. The
orchestrator computes `id`, `pillar` and `score` centrally, so the formula
lives in exactly one auditable place rather than in sixteen.

Every network call goes through `collector/fetch.mjs` (`CONTRACT.md` §1.5).
Adapters receive `fetchText` and `fetchJson` as arguments and never import a
global `fetch`.

---

## Sources

| id | kind | weight | why that weight |
|---|---|---|---|
| `openai` | lab | 1.00 | the field's highest-signal primary feed |
| `deepmind` | lab | 0.95 | primary, but mixes programme posts with launches |
| `mistral` | lab | 0.85 | primary, frontier lab, publishes infrequently |
| `qwen` | lab | 0.85 | primary, non-Western — **currently dormant**, see below |
| `google-ai-blog` | lab | 0.80 | primary but product-marketing; overlaps DeepMind |
| `hf-daily-papers` | paper | 0.80 | human-curated shortlist with a community upvote |
| `github-releases` | release | 0.75 | a cut tag is the least ambiguous "shipped" event |
| `techmeme` | press | 0.70 | fastest aggregator in tech; locally AI-filtered |
| `huggingface-blog` | lab | 0.70 | the open-weight ecosystem's own newsroom |
| `arxiv-newest` | paper | 0.65 | the most upstream source here; high volume, low per-item signal |
| `hn-ai` | forum | 0.60 | the only hard engagement numbers in the layer |
| `arstechnica-ai` | press | 0.60 | section feed, already AI-scoped |
| `hf-trending-models` | model | 0.60 | weights actually landing, not talk about them |
| `verge-ai` | press | 0.55 | shortest items; mostly contributes a corroboration vote |
| `anthropic-status` | status | 0.55 | operational load on a frontier lab's fleet |
| `mit-news-ai` | press | 0.45 | independent, but rarely first |

Weights are an **editorial judgement**, disclosed here rather than buried —
the same treatment `docs/METHODOLOGY.md` gives the index's 70/30 AQI split.
There is no ground-truth outcome to fit them against, so any "learned" weighting
would be unfalsifiable decoration.

### Anthropic has no blog RSS at any path

This is a measured negative, not an omission. Every neighbouring path returns
HTML or 404. Anthropic therefore enters the feed through two real doors:
`status.anthropic.com/history.atom` (which 302s to `status.claude.com`) and the
`anthropics/*` repositories in `github-releases`.

### A 200 does not mean a feed exists

Several sites answer a guessed feed path with HTTP 200 and their SPA shell.
Measured 2026-09-23: `qwen.ai/rss.xml`, `qwen.ai/blog/rss.xml` and
`qwen.ai/feed.xml` each return **200 with 94KB of HTML**. Mistral is worse in
the other direction: four guessable paths return 404 HTML, and the feed that
exists — `mistral.ai/rss.xml` — serves valid RSS as `text/plain`.

So `_feed.mjs` validates **the body**, not the status and not the content-type:
the body must begin `<?xml`, `<rss` or `<feed`. Content-type is used only to
rule out the obvious `text/html` case, because a strict
`application/rss+xml` check would have rejected Mistral's live feed.

### Three source states, not two

| state | meaning |
|---|---|
| `live` | the feed answered and published inside the window |
| `dormant` | the feed answered and parsed correctly, but its newest item predates the window |
| `dark` | the fetch or the parse failed |

`dormant` exists because collapsing it into `live` prints a permanent,
unexplained `0` next to a healthy-looking source on every run — which is how
pizzint's endpoint reports `"status":"healthy"` at a 12% scrape success rate
(`docs/TEARDOWN.md` §3.1), a number nobody reads any more because it never
changes. Collapsing it into `dark` would be worse: it would claim a working
feed is broken.

On 2026-09-23 two sources were dormant and the table said so, with the date:
`mistral` (newest 2026-09-16, six days outside the window) and `qwen` (newest
**2025-09-22** — the blog has not been updated in a year).

### Local AI re-filtering

`techmeme` is a general tech feed and `hn-ai` relies on a vendor's search, so
both re-test every item against the published AI token list in `_entities.mjs`
and report `meta.rejected_off_topic`. This is the same discipline
`docs/METHODOLOGY.md` records for the Polymarket basket, and for the same
reason: a search for "artificial general intelligence" there returned 19 live
markets about how many times a politician would say a particular word.

---

## De-duplication

Three passes, cheapest and most certain first.

**1. Canonical URL.** Lowercased scheme and host, `www.` dropped, `http`
folded into `https`, fragment dropped, tracking parameters stripped
(`utm_*`, `ref`, `fbclid`, `gclid`, `mc_cid`, `igshid`, …), remaining
parameters **sorted**, trailing slash trimmed. Sorting matters: `?a=1&b=2` and
`?b=2&a=1` are one page and must hash alike.

**2. Explicit key.** An adapter may emit `dedup_key`. arXiv and Hugging Face
Daily Papers both emit `arxiv:<id>`, so one paper surfaced by both collapses to
a single item with two votes — under two completely different URLs.

**3. Near-identical title.** Titles are lowercased, NFKD-normalised, stripped
of punctuation and stopwords, and reduced to a token set. Two items match when

```
|A ∩ B| / min(|A|, |B|)  ≥  0.75
```

with both sets ≥ 4 tokens and the intersection ≥ 4 tokens absolute.

Containment against the *smaller* set, not Jaccard: Jaccard punishes a
newspaper headline for being longer than a wire headline about the same event.
Two guards prevent over-merging — items carrying **different** explicit keys
never merge (two distinct papers can share a generic title), and items more
than **96 hours** apart never merge (an identical headline four days later is a
recurring headline, not one story).

The pass is `O(n²)` over a few hundred items, which is milliseconds. MinHash
would be faster and unauditable by a reader who wants to know why two items
merged; auditability wins.

**Merging.** The primary is chosen deterministically, preferring — in order —
an id we have already published, then the highest source weight, then the
earliest timestamp, then the lexicographically smallest id. The
already-published rule is what makes the layer idempotent: without it, a story
picked up by a heavier source on run two would change its canonical URL, change
its id, and reappear as a brand-new item.

`published_at` on the merged item is the **earliest** sighting in the group,
not the primary's own — that is the timestamp the "we had this first" claim
rests on, so it has to be the one we can defend.

---

## Scoring

Five terms summing to exactly 100. Each is a published number over a published
input, and each item ships its own `meta.score_components` so any score can be
checked without rerunning anything.

| term | max | formula |
|---|---|---|
| **Corroboration** | 25 | `min(25, 12.5 × (distinct_sources − 1))` |
| **Source weight** | 25 | `25 × weight` |
| **Recency** | 20 | `20 × 0.5 ^ (age_hours / 36)` |
| **Engagement** | 18 | `18 × min(1, ln(1+v) / ln(1+full_scale))` |
| **Entities** | 12 | `min(12, 3 × distinct_entities)` |

```
score = clamp(0, 100, round1(corroboration + weight + recency + engagement + entities))
```

`age_hours` is measured against the run's `generated_at`, which is published in
the file, so the score is a pure function of *(item, generated_at)* and is
reproducible from the output alone. Age floors at zero: several feeds publish a
few minutes into the future through clock skew, and a negative exponent would
let them outscore a brand-new item.

**Why this balance.** It is an editorial judgement, and it was also corrected
against a measurement. The first version gave source weight 35 points. Because
source weight is *constant per feed*, the entire top of the reel became whatever
OpenAI's newsroom happened to publish that day — "Two years of OpenAI Academy"
outranked an 880-point Hacker News story about a Pentagon incident. Source
identity is a **prior, not a verdict**, so it now ranks below the two terms that
measure what actually happened.

Corroboration is deliberately the heaviest. Independent sources agreeing is the
strongest evidence available that a real event occurred, and it is precisely
the term a single-source competitor structurally cannot compute.

**Engagement** is log-scaled because engagement is log-distributed: the gap
between 5 points and 50 is news, the gap between 500 and 545 is noise. Only
three sources expose a hard engagement number, with the full-scale value that
earns all 18 points stated per source:

| source | metric | full scale |
|---|---|---|
| `hn-ai` | HN points | 500 |
| `hf-daily-papers` | HF upvotes | 150 |
| `hf-trending-models` | HF likes | 1500 |

A source with no engagement signal scores **zero** on that term and forfeits it.
It is never faked and never defaulted to a middling value — the same rule the
index applies to a dark source. The practical consequence is that a lab blog
post's ceiling is 82, not 100, and that is the honest outcome.

When several sources in a group carry an engagement number, the **maximum** is
used, not the sum: two outlets reporting one HN thread's points are one
measurement seen twice.

**Per-item weight.** A feed may carry more than one grade of item. OpenAI's
newsroom is the case that forced this: its `<category>` element cleanly
separates launches from customer case studies, and across the 40 most recent
items on 2026-09-23 the split was `Product` 9, `Global Affairs` 8, `Company` 7,
`Startup` 6, uncategorised 5, and one each of `Publication`, `Safety`,
`Research`, `Engineering`, `Applied AI`. Every `Startup` and uncategorised item
in that sample was a customer story — *"How Cooley is accelerating IPO work with
ChatGPT"*. They publish several a week and at full weight they filled the reel.
The multipliers in `openai.mjs` scale the source weight only; they never exclude
an item, so a case study that gets corroborated or heavily upvoted can still
climb on its own merits.

---

## Pillar assignment

`paper`, `model` and `release` are assigned **`capability` unconditionally**.
They *are* that pillar's definition — `CONTRACT.md` words it as "model
releases, research output" — and no keyword may override it.

This is a rule, not tidiness. Measured on the first live run, keyword
classification over abstracts put 12 of 93 arXiv papers in `governance`
("Bellman Policy Optimization", "JEV-as-a-Judge"), one in `markets` (the word
*manifold*) and one in `compute`. ML jargon and legal/financial vocabulary
overlap badly.

Everything else — prose *about* the world — is classified by a published
keyword list in fixed precedence: **governance → markets → compute → the
adapter's default**. Specific-and-rare beats generic-and-common, so a story
about an EU fine on a chip deal lands in governance rather than compute. The
matching rule is recorded on every item as `meta.pillar_reason`.

Every ambiguous single word was purged from those lists after the run above:
`policy`, `judge`, `bill`, `privacy`, `SEC`, `EU`, `stake`, `cluster` and bare
`manifold` are gone, replaced by unambiguous phrases (`AI policy`, `federal
judge`, `Manifold Markets`, `raises $`). **If a term is common in an ML
abstract, it does not belong in a governance keyword list.**

---

## Rolling window and idempotency

- 7 days, newest first, capped at **200 items** — `MAX_ITEMS` is a mobile-first
  budget, because most traffic arrives from a phone via X.
- Items that have aged off their source feed but are still inside the window are
  carried forward and **re-scored against the new clock**. Only recency moves;
  every other component is reused verbatim, because only recency depends on time.
- Carried-forward items rejoin the *same* grouping pass as fresh ones, so an
  item first seen yesterday still collects today's corroboration instead of
  sitting at a stale score beside a duplicate of itself.
- `meta.first_seen_at` is preserved across runs.
- Ordering is total — published date, then score, then id — so two runs over
  identical inputs produce byte-identical output.
- **The 200-item cut is taken on `(published_at, id)`, never on score.** The
  recency term re-decays every run by design, so scores drift; Hugging Face's
  daily-papers timestamps are date-granular, which puts ~40 items on one instant
  and straddles the cap with that tie block. With score in the truncation key a
  0.1-point drift reshuffled the block and three items fell out of the file that
  had been in it an hour earlier (measured 2026-09-23). Both parts of the cut
  key are immutable for a given item, so an item now leaves the tail for exactly
  one reason: genuinely newer items arrived.

Verified on 2026-09-23 across two consecutive live runs: 200 items, zero
duplicate ids, zero duplicate canonical URLs, `id == sha256(url)[0:16]` for
every item, `score == sum(components)` for all 200, every run-1 item above the
cap boundary kept its id, and of the 13 items sitting exactly on the cap
boundary, zero dropped.

---

## Failure behaviour

- Adapters run concurrently under `Promise.allSettled`; one dead feed never
  blocks the rest.
- A 60s watchdog per adapter sits on top of `fetch.mjs`'s per-request timeout,
  because an adapter may make several requests (`github-releases` fans out
  across a seven-repo basket).
- A failed source is reported **dark**, with its error text, on the same line as
  its id. It is never omitted and never zeroed.
- A basket member that fails inside `github-releases` is **named** in
  `meta.basket_failed` rather than silently dropped — a missing member of a
  basket is otherwise indistinguishable from a quiet week.
- A malformed *adapter* is fatal for the whole run, exactly as in
  `collect.mjs`: that is a code error CI should catch, and reporting it as a
  dead source would teach the operator to ignore dead sources.
- The process exits non-zero only when **no** source produced an in-window item.

---

## Known limitations

1. **Anglophone and open-web, like the index.** `docs/METHODOLOGY.md` already
   concedes this for DOOMCON's sources and it is true here too. `qwen` was
   added as the cheapest available correction and is dormant, so in practice
   this layer currently reads almost entirely Western, English-language
   publishing. A major Chinese lab release reaches this feed mainly through how
   much the West writes about it.
2. **Corroboration is not independence.** Ars Technica and The Verge covering
   one press release are two sources, but one *event* and arguably one
   upstream. The 96-hour gap guard and the 25-point cap limit the damage; they
   do not eliminate it.
3. **Title-overlap de-duplication can over-merge.** "OpenAI releases GPT-6" and
   "OpenAI releases GPT-6 mini" share enough tokens to collapse. The explicit
   `dedup_key` guard covers papers, where the risk is highest; headlines have no
   equivalent identifier.
4. **Volume is not importance.** `arxiv-newest` and `hf-daily-papers` together
   contribute ~100 of 200 items, so the reel skews toward research. The scoring
   terms rank within that pool; they do not rebalance it.
5. **Engagement is measurable for three sources only.** Lab blogs and press
   have no public engagement number we can read without a key, so they compete
   for at most 82 of 100 points.
