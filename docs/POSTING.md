# Posting

What `collector/posts.mjs` emits, which words to use, when to post them, and the
things that would end this account's credibility in a single post.

Companion to `docs/VOICE.md` (how DOOMCON sounds) and `docs/CONTRACT.md` (what
it may never say). This file is about distribution.

---

## 1. Two variants, and which one ships

Every post is emitted twice. The body is byte-identical; only the last sentence
differs.

| variant | last sentence | when |
|---|---|---|
| `api` | `Arithmetic at messagegabrielhere dash lgtm dot github dot io slash doomcon.` | the paid API path, later |
| `manual` | `Arithmetic at https://messagegabrielhere-lgtm.github.io/doomcon` | **now** — hand-posted |

**Post the `manual` variant.** X charges roughly `$0.200` for an API post
carrying a link against `$0.015` for one without — a 13.3x surcharge, and the
whole reason the spelled-domain habit exists. That surcharge applies to the API.
It does not apply to pasting a post into the composer from your own account,
which is how v1 ships. A hand-posted link is free reach; a spelled domain there
is friction for nothing.

`post.text` is still the **api** variant, so every existing consumer keeps its
link-free guarantee. The clickable one is `post.text_manual`, and both live
under `post.variants`. `site/post-sheet.mjs` renders `p.text` today and so shows
the api variant in the console — swapping that one reference to `p.text_manual`
is a one-line change in a file this module does not own.

```
node collector/posts.mjs                    # both variants, side by side
node collector/posts.mjs --variant=manual    # just the one you are pasting
```

### The defect this replaced

Until this round every post ended `Arithmetic at doomcon dot watch`. **We do not
own doomcon.watch.** Anyone who typed it landed nowhere, on every post the
account has ever sent. The address now derives from `brand.canonicalUrl` — where
the site is actually served — so the spelled form and the clickable form come
from the same constant and cannot drift apart.

`site/brand.mjs` still carries `DOMAIN = 'doomcon.watch'` as the domain we
intend to own, and the cards still burn it into the image. **That is now the
only surviving instance of the same defect, and it is on the most shared surface
we have.** Either register the domain or stop printing it.

### Registering doomcon.watch is a copy change, not just a domain purchase

The spelled Pages address costs **74 characters of every post**. `doomcon dot
watch` would cost 32. That is 42 characters — a seventh of the post — currently
spent on an address nobody will type anyway. It is why the drought and race
templates run at 277 and 280 of 280 with no room for the colour lines already
written for them.

Change `CANONICAL_URL` in `site/brand.mjs` and both variants follow the same
minute. Nothing else moves. The bodies are budgeted against whichever tail is
longer, so the day the link becomes the longer of the two, that reverses on its
own with no template touched.

---

## 2. The templates

Fourteen templates. Six of them fire often enough to sound like a bot, so those
six carry **three phrasings each**. The choice is a pure function of the UTC day
in `state.generated_at` plus a per-template offset — deterministic, no
`Math.random`, re-running a snapshot reproduces the same post — and it cycles
`[0, 1, 0, 2]`, so the preferred phrasing runs half the days and the whole slate
never rotates in lockstep.

### 2.1 The index card — `daily`, priority 60

Fires every day, at every level, degraded or not. The calm days are the entire
credibility engine: an index that only speaks when alarmed reads as a hype
account, and @PenPizzaReport's most valuable posts are the ones saying nothing
is happening.

**0 — preferred.** Instrument first.
> DOOMCON 4, ROUTINE. Composite 42.6 of 100, down 0.2 from the previous reading, as of 12:26 UTC on Fri 25 Sep 2026. Governance is the loudest of the five pillars at 53.6. Arithmetic at …

Preferred because it reads *identically* on the loudest day and the dullest one.
That sameness is the claim. An index whose format changes with its mood is a
mood, and the first thing a sceptic checks is whether the quiet days were posted
in the same words as the loud ones.

**1 — number first.**
> The AI tempo index reads 42.6 of 100 as of 12:26 UTC on Fri 25 Sep 2026. DOOMCON 4, ROUTINE, down 0.2 from the previous reading. …

Lands harder as a standalone first line on a day the composite actually moved,
because the figure arrives before the jargon.

**2 — log entry.**
> Fri 25 Sep 2026, 12:26 UTC. Composite 42.6 of 100, down 0.2 from the previous reading. DOOMCON 4, ROUTINE. Governance is the loudest of the five pillars at 53.6. …

The driest of the three, and the one that most looks like something copied off
an instrument rather than written for an audience. Use it when the number is
boring; dryness is the joke.

### 2.2 The drought card — `drought`, priority 35

The most pasteable number this project owns, and the one most likely to be
quote-tweeted by someone who thinks they have caught us. Three things keep it
survivable and **all three are in the copy, not in a footnote**:

1. The denominator is *"datacentres OpenStreetMap has mapped"*, never *"US
   datacentres"*. A site missing from OSM means nobody mapped it.
2. The Drought Monitor figure is the share of a **county's area** in a category.
   A county 20% in D3 does not say which 20%, and a pin in that county is not
   necessarily in that 20%.
3. Nothing measures a datacentre's water draw. No public feed publishes it, for
   any site, at any cadence. This is a statement about **where the buildings
   are** — a smaller claim, and a true one.

`That is county area, not site draw.` is a **required** line. It costs 34
characters and it closes the only reply that lands.

**0 — preferred.** Share first, denominator inside the same sentence.
> 82 percent of mapped US datacentres — 1,544 of 1,877 — are in a county at D1 drought or worse. That is county area, not site draw. US Drought Monitor, 22 Sep 2026 map, joined at 12:27 UTC, 25 Sep 2026. …

Preferred because the denominator is the thing every reply attacks, so it goes
where it cannot be cropped out of a screenshot.

**1 — tally, no percentage.**
> 1,544 of the 1,877 mapped US datacentres sit in a county at D1 drought or worse. …

Reads as a count rather than a statistic, and a count is harder to accuse of
having been massaged.

**2 — severity first.**
> 454 of 1,877 mapped US datacentres are in a county at D2 drought or worse, 1,544 at D1 or worse. …

The sharpest of the three and the easiest to over-read, which is why it is not
the default. Use it in a week when D2 is the number in the news.

**The threshold, so the card and the post agree.** `DROUGHT_ANY_KEYS` starts at
**D1**, not D0. D0 is "abnormally dry", which is not drought. If the design
agent's card says 72% and this post says 82%, that is the difference, and it is
one constant in `collector/posts.mjs`. The test is `any of d1..d4 > 0`, which is
true whether the upstream API returns those shares cumulatively or
categorically — the shares are never summed, because summing is wrong under one
of the two encodings.

**As of 2026-09-25 this post does not fire.** `usdm-county` is returning a
network error, `resources_index.drought_by_county` is `{}` and
`counts.with_county_drought` is `0`. There is no share to state, so the template
returns nothing and records why. The figure is not remembered from a previous
run, and it is never typed in by hand. *Fix the endpoint and the post appears on
its own.*

### 2.3 The race card — `race`, priority 38

People, not pillars. The one template a reader can disagree with by placing a
trade, which is the most argued-with kind of number there is.

Two rigour rules, both easy to break by accident:

- **A price belongs to the lab, never to the person.** "Dario Amodei 73.5
  percent" attributes a company's market odds to a human being and is false. It
  is always `<person>'s <lab>`. There is a test for this.
- **The venue's question is quoted verbatim.** A leaderboard whose question has
  been reworded is a leaderboard of nothing.

**0 — preferred.** Question, clock, then the people and their prices.
> Polymarket, "Which company has best AI model end of 2026", 12:26 UTC, 25 Sep 2026: Dario Amodei's Anthropic 73.5 percent, Sam Altman's OpenAI 9.5, Demis Hassabis' Google DeepMind 9.5, Elon Musk's xAI 2.8. …

Preferred because it is the only one of the three a stranger can forward with no
context, and the names are what make it forwardable. Four people, four prices,
one question, one clock.

**1 — the gap.**
> 64.0 points separate first and second on Polymarket's "Which company has best AI model end of 2026", 12:26 UTC, 25 Sep 2026: Anthropic 73.5 percent, OpenAI 9.5, Google DeepMind 9.5, xAI 2.8. …

Sharpest when first and second are far apart. It is an arithmetic fact about two
prices and it claims nothing beyond that.

**2 — the money.**
> $856k is posted on Polymarket's "Which company has best AI model end of 2026", 12:26 UTC, 25 Sep 2026: Dario Amodei's Anthropic 73.5 percent, Sam Altman's OpenAI 9.5, Demis Hassabis' Google DeepMind 9.5. …

Answers "who cares what a betting site thinks" before the reader has finished
typing it. Costs a seat on the board, which is why it is third.

The board **shrinks** rather than overflows: four names, then three, then two.
A longer lab name next week costs a seat, not a build. If not even two names and
the question fit, no post ships and the reason is recorded.

### 2.4 The developing card — `developing`, priority 28

A story cluster that carries **incident language**. `data/news.json` groups items
into stories and scores each on severity terms: literal words found in the title
and summary, each with its tier and weight.

The entire template is one distinction. *"Three outlets used the word breach"* is
a measurement of published language. *"A serious breach"* is a judgement this
index does not make. The first is checkable in one click, which is why it
travels.

**0 — preferred.** Cluster first, quote second.
> 3 outlets over 4.1 hours, one event, first at 11:52 UTC, 24 Sep 2026: OpenAI discovered the Australian breach in August but didn't alert the government… Their words, not ours: breach, hacked and rogue. …

Preferred because the first line is a measurement — a count and a span — so it
survives alone, and the quote then arrives as evidence rather than as the
headline. It is also the phrasing least likely to be read as us asserting the
event.

**1 — words first.**
> Their words, not ours: breach, hacked and rogue. 3 outlets on one event, first at 11:52 UTC, 24 Sep 2026: …

The most arresting of the three, and the one that most invites *"those are just
words"* — which is exactly the argument we want, because the answer is yes, that
is precisely what is being counted.

**2 — quote first.**
> OpenAI discovered the Australian breach in August… 3 outlets over 4.1 hours, first at 11:52 UTC, 24 Sep 2026. …

Reads least like an index and most like a wire. Use when the headline carries
itself.

A severity term that trips the future-tense ban — `warning` is on both lists —
is **dropped, and the story is kept**. Dropping the whole story for one word
would silently bias this template toward quieter language.

### 2.5 The corroboration card — `corroboration`, priority 45

Not "a thing happened" but "N independent sources carried the same thing inside
M minutes" — a claim about the *world's* tempo rather than about any one outlet,
and the closest thing this index has to a falsifiable news measurement. It is
the one number nobody else in this category can compute at all.

**0 — preferred.**
> 2 independent sources carried the same item 3.2 hours apart: Sources: Oracle sent a force majeure notice to Blue Owl… First at 12:45 UTC, 24 Sep 2026. …

The count comes first because the count is the measurement.

**1 — the item as subject.**
> The same item reached 2 independent sources 3.2 hours apart: … First at 12:45 UTC, 24 Sep 2026. …

Reads better when the window is a *lead time* rather than a simultaneity. Under
90 minutes the story is "within eleven minutes"; above it the story is that this
layer reads the primary sources an X feed is downstream of, and a 676-minute
spread is the point rather than an embarrassment.

**2 — compressed.**
> 2 outlets, 3.2 hours apart, one item: … First at 12:45 UTC, 24 Sep 2026. …

Buys the quoted headline about twenty characters. Use when the headline is long
and good.

The composite line on this template is **optional** and sits outside the
headline's character budget: the quote gets the characters first. A
clamped-to-nothing headline is worth less than an index number the tail already
points at.

### 2.6 The top-news card — `top-news`, priority 25

The day's most corroborated item, quoted verbatim. A post carrying a fact
outruns a post carrying a gauge.

**0 — preferred.** `2 independent sources carried it, first at 14:03 UTC on Thu 24 Sep 2026.`
The count is the claim and the timestamp is the receipt; together, a reply
cannot separate them.

**1.** `Carried by 2 independent sources. First at 14:03 UTC on Thu 24 Sep 2026.`
Leads with the verb. Less like a database row on a day when the headline itself
is the story.

**2.** `2 sources, one item, first at 14:03 UTC on Thu 24 Sep 2026.`
The terse one, for when the clamped headline needs the characters.

Single-sourced items get their own three: `One source carried it` / `One source
so far` / `Single-sourced as of`. Never round one source up to a plural.

### 2.7 The rest

| kind | priority | fires when |
|---|---|---|
| `degraded` | 5 | any pillar dark or uncalibrated. The differentiator: pizzint prints a confident DOUGHCON 5 over four of six null inputs while its own status endpoint says `healthy`. |
| `escalation` | 10 | a level change less than 90 minutes old |
| `milestone` | 20 | a record high or low, with ≥30 prior readings |
| `deescalation` | 30 | same billing as an escalation, or the index is a ratchet |
| `pillar-spike` | 40 | one pillar ≥70 and ≥90th percentile while the composite holds |
| `market-move` | 48 | a prediction market moved ≥4 points in 24h |
| `notable-input` | 50 | one named input with its number |
| `weekly` | 55 | Sundays, with ≥2 readings in the week |

One phrasing each. They fire rarely enough that repetition is not the risk.

---

## 3. Cadence

### The two numbers that set everything else

**A post hard-expires from For You at 48 hours.** Nothing you posted on Monday
is working for you on Thursday. There is no back catalogue and no compounding —
reach is whatever the last 48 hours produced.

**A second post from one author in the same slate is worth about half.** The
ranker de-duplicates by author. Two posts in one window do not double reach;
they split it, and the second one usually gets the worse half.

`schedule()` already encodes this: the slate is sorted best-first, spaced three
hours apart, and each post carries its own `reach_note` and `expires_at`.

### The rules

1. **One post a day is the floor, and the floor is compulsory.** The daily post
   fires at every level. Post it on the days nothing is happening — those are
   the days that make the loud ones believable.
2. **Two is the normal ceiling.** Three only when a level actually changed, and
   then the change post goes first and everything else waits.
3. **Three hours minimum between posts.** `SLATE_SPACING_MS`. Closer than that
   and you are competing with yourself inside one ranking window.
4. **The slate is a menu, not a queue.** `buildPosts()` may emit seven. Post the
   top one or two. Tick them off in the console; the rest expire unposted and
   that is the intended outcome.
5. **Never post the same item twice in one slate.** The generator already
   enforces this between `top-news` and `corroboration`; hold to it by hand
   across days too. The same headline three hours apart is the behaviour of a
   bot, not of an index.
6. **Reply to the replies.** In xAI's open-source ranker, share-via-copy-link
   weighs 20.0 against 0.5 for a like; reply and quote weigh 5.0 each. The goal
   is not approval. It is being pasted into a group chat and being worth arguing
   with. A post that earns thirty replies and four likes beat a post that earned
   four hundred likes.

### The quiet day

There is no such thing as nothing to post. In descending order of what to reach
for when the composite has not moved:

1. **`drought`.** Evergreen, enormous, and true on any day of the week. It is
   the single best cold-open this account has for a reader who has never heard
   of the index. *(Blocked today — see 2.2.)*
2. **`race`.** Also evergreen, also true every day, and it carries named people,
   which is what gets forwarded. Rotate it against `drought` rather than posting
   either two days running.
3. **`developing`,** if a cluster carries incident language.
4. **`daily`,** in phrasing 2, the log-entry form. Dry on purpose.
5. **`degraded`,** if anything is dark. *"Four of fourteen sources are not
   reporting and here is which"* is a better post than most things that are
   happening. It is the cheapest differentiator this project has.

On a genuinely dead day: post the daily and stop. A thin true feed beats a
padded one, and a padded one is what every competitor in this category already
looks like.

---

## 4. Things that lose the account in one post

Each of these is recoverable in principle and not in practice, because the
screenshot outlives the correction.

**1. A number no one can reproduce.** Every figure in a post comes out of a data
file. Not from this document, not from a brief, not from memory. The brief for
this round said 1,350 of 1,877 sites in a drought county; the live data said the
join was empty and the Drought Monitor was down. Posting 1,350 would have been a
fabrication, and a checkable one.

**2. A level read as a probability.** "DOOMCON 2" means the composite is in the
70–84 band of *this index's own frozen reference distribution*. It is not a 70%
chance of anything. The WHO's Phase 6 measured geographic spread, the public read
it as severity, H1N1 was mild, and the numbered phases were gone by 2013. One
sentence merging tempo with risk and we are DoomBench with a better chart.

**3. Any future tense.** `will`, `expect`, `predict`, `imminent`, `soon`,
`coming`, `warns`, `forecast`, `likely`, every inflection, and every `'ll`
contraction. The generator throws on all of them. If you edit a post in the
console, you have left the guard behind — re-read it before you paste.

**4. A dead link, or no link.** The defect this round fixed. Check that the
address in the post is the address the site is on, every time the domain moves.

**5. Collapsing "dark" into "awaiting baseline".** Dark means nothing is
arriving. Awaiting baseline means readings arrive fine and there is no frozen
history to score them against yet. Calling the second one dark overstates an
outage, which is the same class of error as hiding one — and overstating our own
outage is a strange way to lose an argument.

**6. Attributing a market price to a person.** "Dario Amodei 73.5 percent" is
false. The market prices the lab.

**7. Rewriting someone else's headline to get it past our own guard.** If a
headline says "will", it is a claim about the future, and this index does not
carry claims about the future. The item is **skipped**; the next candidate is
tried. Laundering a forecast through a scale that promises it makes none is the
worst of both worlds. `buildPosts()` returns every skip and its reason.

**8. Unattributed consensus.** `experts say`, `many are worried`, `raises
questions`. Name the source and the timestamp or cut the sentence.

**9. Emoji, 🚨, BREAKING, exclamation marks, "watch this space".** The register
of the accounts we exist to be more credible than.

**10. Posting a correction quietly.** If a number was wrong, post the correction
with the same prominence as the original, at the top of the next slate, with the
receipt id. This has not happened yet. The first time it does is worth more than
a month of being right.

---

## 5. Running it

```sh
# the whole slate, both variants, against live data
docker run --rm -v "$PWD":/app -w /app node:20-alpine node collector/posts.mjs

# just what you are pasting
docker run --rm -v "$PWD":/app -w /app node:20-alpine node collector/posts.mjs --variant=manual

# the guards
docker run --rm -v "$PWD":/app -w /app node:20-alpine node collector/posts.mjs --test
```

The CLI reads `data/state.json`, `data/history.ndjson`, `data/news.json`
(items *and* story clusters), `data/race.json`, `data/datacenters.json`, and the
newest `data/raw` snapshot for market rows. **Every one of them is optional.** A
missing file removes its template from the slate and says so on stderr:

```
[posts] skipped drought: no county-level drought join in data/datacenters.json —
        nothing to count, and the share is not remembered from a previous run
```

That line is the design. A dark source produces no post, never a remembered
number.
