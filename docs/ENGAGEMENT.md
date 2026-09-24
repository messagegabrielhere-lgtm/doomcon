# Engagement — the second pizzint teardown

`docs/TEARDOWN.md` answered *how is pizzint.watch built*. It did not answer the
operator's actual question, which is **why is their page more engaging than
ours**. This file answers that, with numbers.

Everything below was measured on 2026-09-23/24 against the live
`https://www.pizzint.watch/` and the live
`https://messagegabrielhere-lgtm.github.io/doomcon/`, in a real browser, at
1440x900 and at 375x812, by walking the rendered DOM, the CSS and the shipped
JavaScript bundles. Where a number is an estimate rather than a measurement it
says **(est.)**. Nothing here is inferred from memory of the site.

**The finding in one line:** their advantage is not motion, and it is not
polish. We measured their page churn on a quiet night and **two** above-the-fold
strings changed in seventy seconds. Their advantage is that the same screen
carries **about twelve independent datasets**, each with its own named scalar
and its own vocabulary, most of them swappable in place without a navigation —
against our **four**, one of which we render eight different ways and call a
dashboard.

---

## 0. The measured comparison, up front

| | pizzint.watch | DOOMCON | source of the number |
|---|---|---|---|
| Visible text atoms above the fold, 1440x900 | **86–126** | **57** | hit-tested `TreeWalker` count; 86 is a conservative sample taken while the OSINT panel was still filling, 126 is the same count fully hydrated |
| Visible text atoms above the fold, 375x812 | **37** | **35** | same method |
| Above-fold atoms that changed in 70s, quiet night, 375px | **2** (wall clock, market countdown) | **1** (the score, and only because a build landed mid-sample) | two DOM snapshots 70s apart, diffed |
| CSS animations running at rest | **11** | **2** (`dcmxRun` 50s ticker, `doomconPip` 2.6s) | `document.getAnimations()` |
| Homepage scroll height, 1440px | **12,058px** | **6,181px** | `scrollHeight` |
| Homepage scroll height, 375px | **20,066px** | **8,742px** | `scrollHeight` |
| Share of homepage height selling another page | **26.5%** | **3.6%** | per-section `getBoundingClientRect().height` |
| Share of homepage height that is lore | **50.4%** (inlined, not a separate page) | **0%** (it is `/history.html`) | same |
| Independent datasets on the homepage | **~12** | **4** | enumerated in §1 |
| Named scalars on the homepage | **3** (DOUGHCON, NEH Index, OPTEMPO) | **1** | rendered DOM |
| In-place dataset switchers | **7** | **0** | the icon row under the index |
| Internal links on the homepage | **39** | **26** | `querySelectorAll('a')` |
| URLs in `sitemap.xml` | **1,018** (997 of them `/intel/<slug>`) | **7** | fetched both sitemaps |
| `localStorage` keys carrying return state | **0** of 3 | **0** of 0 | grepped all 26 JS chunks |
| Prerendered visible text in the HTML | **18,423 chars** | **22,536 chars** | tags stripped from the served HTML |
| Live poll cadence: hot / cold / hidden | **15s / 30s / 120s**, jittered ±2s | **60s / 60s / paused** | their `osint-feed/head` loop; our `POLL_MS` in `_motion.mjs` |
| Data actually republished every | continuously (their feed is a live firehose) | **15 minutes** (`cron: '*/15 * * * *'`) | their `/api/osint-feed/head`; our `.github/workflows` |

Two rows in that table are the whole argument.

**We are not less dense on a phone.** 35 atoms against 37. Anyone who says our
problem is "not enough on the screen" at 375px is wrong, and building to that
brief would make the page worse.

**We are less dense in *kinds*.** Of our 57 desktop atoms, roughly 20 are the
same composite score expressed as a numeral, a level name, a codename, five
pips, a gauge, a band label, a distribution marker and a caption. Of their 86,
almost none repeat: a clock, a market countdown, a readiness codeword, three
feed counters, a venue name, a distance, a bar chart, a market question, a
price and a 24-hour move are ten different facts about ten different things.

---

## 1. Session mechanics — why minutes instead of seconds

### 1.1 The top-to-bottom inventory

Walking their homepage at 1440x900, the distinct things that reward continued
attention, in document order. Thirty of them.

| # | Element | What rewards attention |
|---|---|---|
| 1 | Locale switcher (`EN`) | implies 40+ other versions exist |
| 2 | Wall clock `2026-09-23 22:31:30` | **ticks every 1s** (`setInterval(…, 1e3)`) |
| 3 | `STOCK MARKET: CLOSED \| OPENS IN 10h 58m` | **counts down every 60s** (`6e4`) |
| 4 | `8 LOCATIONS MONITORED` | a denominator |
| 5 | `HISTORY` / `MARKETS` nav chips | two doors |
| 6 | `STATUS: OPERATIONAL` | a health claim (a false one — see §6.4) |
| 7 | Wordmark | `WordmarkDecrypt`: 1.1s character-scramble from `ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*` |
| 8 | `Intel by the Slice` | the tagline |
| 9 | `Powered by Polymarket` badge | borrowed authority |
| 10 | The DOUGHCON badge | level + codeword + readiness phrase, three facts in one glance |
| 11 | An `(i)` popover on that badge | a plain-English methodology at the point of use, not on `/about` |
| 12 | `Support the Site` | the ask |
| 13 | OSINT feed header | `02:31Z` · `AUTO` · `MONITORING 5 ACCOUNTS` · `40 REPORTS` · `20 ALERTS` — five counters in one strip |
| 14 | Three newest OSINT cards | handle, relative age, full text, and three buttons each (`LIVE`, `MARKETS`, `VIEW`) |
| 15 | `BREAKING` marquee | Polymarket questions with price and 24h move, crawling, pausable, dismissible |
| 16 | **The 7-item view switcher** | see §1.2 — the single most important element on the page |
| 17 | Day tabs `SUN`–`SAT` + `LIVE` | time travel over the same panel |
| 18 | `PETE-ZA: SLICE CONTROL — Leaderboard now available!` | a game, with a score to beat |
| 19 | Six venue cards | name, state, distance, a 24h popular-times bar chart, a per-card `LIVE` pip |
| 20 | ElectionHub block | three chambers with live seat splits (`17D / 18R`, `224D / 202R / 7 toss-up`) and three CTAs |
| 21 | NEH Index block | a **second named scalar**, a 4-stop labelled scale, and a `HIGHEST RISK` market at 17% |
| 22 | Polyglobe block | a spinning globe (ships `PREPARING POLYGLOBE`) |
| 23 | GDELT signals block | ships `PREPARING GDELT SIGNALS` |
| 24 | MentionHub block | a fourth product |
| 25 | Intel Briefs | one lead brief plus two, each tagged `HIGH · DIPLOMATIC`, `NUCLEAR`, `CYBER`, each with `7 signals · 4 sources` |
| 26 | A matched Polymarket card | `14% CHANCE`, `24h · 95% match`, `no change since tweet` |
| 27 | MARKET INTELLIGENCE panel | `OSINT FEED` / `POLYMARKETS` tabs, `Live` / `Top` toggle, a 37-item timestamped column |
| 28 | Lore timeline | seven era tabs: `1970s`, `1983`, `AUG '90`, `2023`, `JUN '25`, `2025`, `2026` |
| 29 | FAQ accordion | five questions |
| 30 | Footer link grid | `WATCH` (4) / `LEARN` (5) / `CONNECT` (4) |

Plus a fixed right-rail `MOST TRADED RIGHT NOW` card on desktop, which on mobile
is a **full-screen blurred-backdrop interstitial** that covers the entire fold.
That one is in §6 under "do not copy".

### 1.2 The 7-item switcher is the mechanism

Directly under the index sits a row of seven 48px icon buttons. Their accessible
names, read from the DOM:

```
Pizza Cards
HormuzHub
Gay Bar Report
Strip Club Index
Map View
Commute Index — Live Pentagon commute corridor traffic
Play PETE-ZA: SLICE CONTROL - New Leaderboard!
```

Each swaps a **different dataset** into the same slot with no navigation and no
page load. I clicked through them. They are not skins.

- **HormuzHub** renders an interactive vector map plus `ARRIVALS OF SHIPS
  (PORTWATCH) + WINDWARD CROSS-CHECK`, with `LATEST TOTAL 1`, `7-DAY AVERAGE 3`,
  `WINDWARD TOTAL 0`, `DARK EVENTS n/a`, `SANCTIONED VESSELS 49 (OFAC / AIS)`,
  and a three-month stacked area chart broken out by Container / Dry Bulk /
  General Cargo / Ro-Ro / Tanker with a 7-day moving average and a prior-year
  comparison line.
- **Gay Bar Report** renders `FREDDIE'S BEACH BAR` and `THE LITTLE GAY PUB`,
  each `Much quieter than usual` — the inverse signal, and on the night I looked
  it was the only panel with a reading while four of six pizzerias said
  `NO DATA`.
- **Commute Index** is a whole second product: a named scalar `OPTEMPO 5 ·
  Business As Usual · SCORE: 5`, then `TIME WINDOW: EVENING RUSH`,
  `CORRIDORS: 7/7`, `CORRELATION: 14%`, `DIRECTION: OUTBOUND`,
  `SENSITIVITY: 2x`, `BASELINES: PER-CORRIDOR`, `BASELINE SLOT: Wed 18:30`, a
  clickable route map, a six-row corridor table
  (Springfield / Fairfax / Tysons / Bethesda / Capitol Hill / Alexandria with
  `RATIO`, `DEV`, `SIGNAL` columns), a Pentagon Metro transit card reading
  `LIVE 100 / BASE 61 · POP RATIO 164% · EFF RATIO 36% · DEV -64%`, and then one
  plain sentence: *"Traffic patterns are normal for evening rush. No anomalous
  activity detected around the Pentagon."*

That is roughly thirty discrete facts, a second named scalar, a table, a map and
a one-sentence verdict, **reachable in one tap from the fold**. It is the single
biggest difference between their page and ours, and it has nothing to do with
animation.

### 1.3 Their motion, measured honestly

I hooked their timers and diffed their DOM. The real inventory:

- `setInterval(…, 1e3)` — the wall clock. One second.
- `setInterval(…, 6e4)` — the market countdown and an ET clock. Sixty seconds.
- `setInterval(…, 18e4)` — the breaking-markets ticker refresh. Three minutes.
- `setInterval(…, 12e4)` — a secondary panel, with a `visibilitychange` listener
  that refetches the moment the tab is fronted.
- `setInterval(…, 4600)` — a 4.6s opacity cross-fade on one panel.
- Eleven running CSS animations, all infinite: 7 × `pulse`, 1 × `ping`,
  `pulse-glow`, `eh-widget-clash` (6s), `home-hormuz-tab-radar-sweep` (2.6s).

And the live feed loop, which is genuinely well built and which we should study
line by line:

```
base    = max(15_000, configured)          // 15s when news is flowing
hidden  = max(120_000, 4 * base)           // 2 min when the tab is hidden
jitter  = ±2000ms on every schedule, floor 2000ms
poll    -> GET /api/osint-feed/head        // returns ONLY timestamps
         if latestTweetTimestamp advanced -> full fetch with ?since=<iso>
idle    -> multiplier 1.0, then 1.5 after 4 empty polls, then 2.0 after 10,
           capped at 60s
error   -> base * min(8, 2^min(3, n))
visible -> poll immediately on visibilitychange
```

A cheap head endpoint, an incremental `since=` fetch, jitter so a thundering
herd never forms, and **an adaptive slow-down when nothing is happening**. Their
dashboard poll is separately cache-friendly: the buster is quantised to 30s
buckets (`3e4 * Math.floor(Date.now()/3e4)`) so the CDN can still serve it.

Ours is `POLL_MS = 60000`, flat, with a 60 → 120 → 300 error backoff and a
`visibilitychange` resume. It is correct and it is four times slower when it
matters and twice as chatty when it does not.

But here is the honest part, and it changes the recommendation: **on a quiet
night their page barely moves either.** Two DOM snapshots seventy seconds apart
differed by exactly two strings — `22:32:13 → 22:33:24` and
`10h 58m → 10h 57m`. The clock and the countdown. Nothing else.

So the perceived liveness is carried by:

1. **Two always-moving atoms** that cost nothing and are never wrong — a clock
   and a countdown.
2. **A crawling marquee**, which moves continuously regardless of whether
   anything happened.
3. **The credible threat of a payoff.** When a new item does land, the card gets
   a full-panel black overlay with the word `NEW` at `clamp(56px, 7vw, 94px)` in
   red VT323, for 2.2 seconds — and a sticky button appears reading
   `N NEW REPORTS — JUMP TO LATEST`. They care about that flash enough to ship a
   demo harness for it (`setDemoNewTweetIds` / `setDemoHiddenTweetIds` are in
   the production bundle).

That third one is the slot machine. The reward is intermittent, it is loud when
it arrives, and the pending count persists while you are scrolled away. Ours is
a 220ms fade and a 6px rise, capped at 8 items, with no counter and no way back
to the top.

### 1.4 Our dashboard, exhausted in fifteen seconds

Our homepage section budget, measured at 1440x900 against a 6,181px total:

| section | height | share |
|---|---|---|
| hero (level, score, gauge) | 738px | 11.9% |
| The record (history chart) | 479px | 7.8% |
| Source freshness | 220px | 3.6% |
| Today's signal (the reel) | 310px | **5.0%** |
| Signal feed | 1,915px | 31.0% |
| The five pillars | 752px | 12.2% |
| Recent moves | 241px | 3.9% |
| **Elsewhere on the desk** | 224px | **3.6%** |
| Put the index on your site | 187px | 3.0% |
| Public JSON API | 172px | 2.8% |
| footer | 226px | 3.7% |

Nineteen elements, but only **four independent datasets**: the index, the news
corpus, a two-line race preview, and the receipt chain. The hero, the gauge, the
distribution curve, the level pips, the band label, the history chart, the
pillar table and the moves list are eight renderings of one number. A reader who
understands the number after four seconds has nothing left; the remaining
fifteen seconds is the feed, and the feed is the only part of our page that
would survive their switcher.

And on the fold specifically, at 375x812, our thirty-five atoms include:

- **A four-line `DEGRADED` paragraph that eats about 170px of 812 — 21% of the
  fold** — to say something that Downdetector says in one sentence.
- **`— no prior observation to compare`**, sitting directly under the composite
  score. During the seventy-second sample the score visibly moved from 40.7 to
  40.5 while that line was on screen saying there was nothing to compare it to.
  The single most interesting fact on the page — *is the needle moving, and
  which way* — is currently rendering as an apology.

---

## 2. The return loop — why anyone comes back tomorrow

### 2.1 What they have: nothing on the page

I grepped all twenty-six shipped JavaScript chunks for storage. The complete
set of keys:

```
localStorage: "breaking-ticker-collapsed", "locale", "osintFeedExpanded"
sessionStorage: (none)
```

There is **no "since your last visit" state, no change marker, no streak, no
seen-set, no visit timestamp, no unread count that survives a reload.** A
returning visitor gets the same page a first-time visitor gets. The three keys
they do store are two UI preferences and a language.

So the honest answer to "why would someone come back tomorrow" is:

1. **The world is different tomorrow, and the page is a window onto the world.**
   The feed is a live firehose; the markets reprice; the venues open and close.
   Return is driven by the *subject*, not by the *page*.
2. **`@PenPizzaReport` and `@pizzintwatch` push them back.** The return loop
   lives on X, not on the site. `docs/TEARDOWN.md` §2.4 already established this
   and it is still true.
3. **The lore is a one-time read that makes the site feel permanent.** Half the
   homepage. You do not come back for it; you come back because a site with a
   1970s KGB doctrine section feels like an institution rather than a weekend
   project.

### 2.2 The consequence

**This is an open goal.** The strongest retention mechanic in the category is
unbuilt, by them and by every competitor in `docs/TEARDOWN.md` §4, and we are
structurally better placed to build it than anyone: we already publish
`generated_at`, a stable `receipt_id`, a hash chain, a signed delta, and 200
items with stable `sha256`-derived ids that never change between runs
(`docs/NEWS.md`, *Rolling window and idempotency*).

A returning visitor should land on:

> **SINCE YOU LOOKED** — 18h 41m ago, at 2026-09-23 03:44 UTC.
> Score 40.7 → 43.1, up 2.4. Level held at DOOMCON 4.
> 31 new items. Governance overtook capability as the loudest pillar.
> 2 receipts added. [show what changed]

Every clause there is a fact we already compute. None of it requires a backend.
It is `localStorage` plus a diff against `api/state.json` and the newest item id
in `api/news.json`. It is the one thing on this list that their architecture
cannot easily match, because their feed has no stable per-item identity the way
ours does.

### 2.3 The second half of the return loop

Their `*/continuous*` feed against our `*/15` cron is the structural asymmetry
we cannot close and should stop pretending to. Our page polls every 60 seconds
against a pipeline that republishes every 15 minutes: **fourteen out of fifteen
polls are guaranteed to find nothing.** Polling faster is the wrong answer.

The right answer is to make the page have something true to say between builds.
The cron is `*/15`, it is published in `.github/workflows`, and `generated_at`
is in `state.json` — so a countdown to the next observation is a fact about our
own system, not theatre:

> `NEXT OBSERVATION IN 07:24`

It moves every second, it is honest, it converts dead time into an appointment,
and when a run is late (GitHub's scheduler routinely is — our own workflow
comments say so) it must degrade to `OBSERVATION OVERDUE — last at 02:24:41Z`,
which is *more* honest than anything on their page.

---

## 3. Information density — measured

### 3.1 The method

A `TreeWalker` over all text nodes, keeping each node whose own range rect
intersects the viewport, whose computed style is visible, and whose centre point
hit-tests back to itself — so clipped marquee tracks, off-screen carousel items
and content behind an overlay are all excluded. Same script, both sites, both
viewports, fully hydrated.

### 3.2 The results

**1440x900**

| | pizzint | DOOMCON |
|---|---|---|
| visible text atoms | **86** (conservative) / **126** (fully hydrated) | **57** |
| of which are *distinct facts about distinct things* | ~78 | ~30 |
| of which are renderings of one number | ~4 | **~20** |
| of which change without a page load | ~8 | ~3 |

**375x812**

| | pizzint | DOOMCON |
|---|---|---|
| visible text atoms | **37** | **35** |
| fold height spent on a status disclaimer | 0px | **~170px (21%)** |
| always-moving atoms | **2** | **0** |
| feed items legible | 1 (one venue card begins) | 1 (one ticker headline, mid-crawl) |

### 3.3 What the numbers actually say

The naive reading — "they are twice as dense, add more stuff" — is wrong at
375px, where we are level with them, and misleading at 1440px.

The real gap is in three places:

1. **Repetition.** Roughly 20 of our 57 desktop atoms are the composite score
   wearing different hats. Five of those renderings could go and nobody would
   lose a fact. Density is facts per pixel, not ink per pixel.
2. **Motion floor.** They have two atoms that are *always* changing. We have
   zero. This is why their page reads as an instrument even on a dead night, and
   it costs one `setInterval`.
3. **Fold economics.** Their fold carries a clock, a countdown, five feed
   counters, a level with two descriptors, a market question with a price, a
   day-switcher and a venue reading. Ours carries a wordmark, a tagline, five
   nav links, five counters, a four-line disclaimer, a truncated headline, a
   level, a score and a gauge. Theirs is nine subjects. Ours is three.

Density is a large part of why a terminal-style page reads as authoritative, and
the operator is right that we are too sparse — but the sparseness is in *subject
count*, not in glyph count, and fixing it by shrinking type would be a mistake.

---

## 4. The sub-pages as retention

### 4.1 They sell the next page relentlessly

Measured section heights on the homepage, out of 11,846px:

| block | height | share | sells |
|---|---|---|---|
| Header + index + feed strip + ticker | 302px | **2.5%** | — |
| Pizza cards + timeline + switcher | 971px | 8.2% | seven in-place views |
| **ElectionHub teaser** | 640px | 5.4% | `/electionhub` (+3 chamber maps) |
| **NEH Index teaser** | 408px | 3.4% | `/nothingeverhappens` |
| **Polyglobe teaser** | 320px | 2.7% | `/polyglobe` |
| **GDELT signals teaser** | 560px | 4.7% | `/gdelt` |
| **MentionHub teaser** | 480px | 4.1% | `/mentions` |
| **Intel Briefs teaser** | 734px | 6.2% | `/intel` + 3 named briefs |
| Market intelligence + full feed | 1,351px | 11.4% | — |
| **Lore timeline (inlined)** | 5,975px | **50.4%** | the brand |

**26.5% of their homepage is devoted to selling another page.** The index the
site is named after gets 2.5%.

Ours: the `Elsewhere on the desk` section is **224px, 3.6%, at 84% scroll
depth**, and `/race.html` — our best page, a live leaderboard cross-checked
across two prediction markets — is linked **exactly once on the entire
homepage**, as a text card, below the fold, below the API block's neighbours.

### 4.2 The mechanism, not the ratio

The ratio matters less than the form. Every one of their teasers is a **live
data preview**, not a link:

- ElectionHub shows `17D / 18R`, `35 live races`; `224D / 202R / 7 toss-up`,
  `433 rated seats`; `19D / 15R`, `34 live races` — then three separate
  `Open Senate Map →` / `Open House Map →` / `Open Governor Map →` CTAs, then a
  fourth `Open ElectionHub →`. Four doors into one page.
- NEH shows the current reading `17`, the four-stop scale, the thresholds
  `0 / 30 / 65 / 99 / 100`, and the single `HIGHEST RISK` market by name.
- Intel Briefs shows one full lead brief with its summary paragraph and
  `7 signals · 4 sources`, then two more with severity and category chips.

You cannot exhaust the teaser. Reading it is what makes you want the page.

### 4.3 The long tail, again, and this time it is worse

| | pizzint | DOOMCON |
|---|---|---|
| `sitemap.xml` URLs | **1,018** | **7** |
| auto-generated item pages | **997** (`/intel/<slug>`) | **0** |
| hand-built head-term pages | 21 | 5 |
| sitemap currently accurate | yes | **no** — 3 move pages exist on disk, 1 is listed |

And their `/intel/` briefs are **server-rendered** — 2,687 characters of visible
prerendered text, with `NewsArticle`, `BreadcrumbList`, `SpeakableSpecification`
and `ImageObject` JSON-LD. One I read carried: a severity chip (`HIGH`), a
category chip (`CYBER`), an `Intelligence Summary` paragraph,
`3 sources · 3 signals · updated 9:06 PM`, the three constituent source posts
with timestamps, `5 signal locations`, and a `Geo Context` entity row
(`China`, `Hong Kong`, `Australia`, `United States`).

We have 200 items in `data/news.json` right now, every one of which already
carries a stable id, a canonical URL, a corroboration count, the list of sources
that carried it, `first_seen_published_at`, `last_published_at`,
`lead_minutes`, a five-term score decomposition, a `pillar_reason` and an
entity list (`docs/NEWS.md`). We publish **zero pages** for them.

Their brief says "3 sources". Ours can say *"3 independent sources, first seen
at 16:34 UTC on Ars Technica, last at 03:50 UTC on The Verge — a 676-minute
spread"* (the spread `docs/NEWS.md` records for the Microsoft
account-compromise pair), and show the arithmetic. That is a better page than theirs, on data we
already have, and it is 200 URLs instead of 7.

---

## 5. The emotional register

### 5.1 The catalogue — thirty real strings from the live page

Verbatim, read from the rendered DOM and the shipped bundles.

**The scale and its codewords** — these are the actual DEFCON exercise terms,
which is the whole joke:

1. `DOUGHCON 5 - FADE OUT`
2. `DOUGHCON 4 - DOUBLE TAKE`
3. `DOUGHCON 3 - ROUND HOUSE`
4. `DOUGHCON 2 - FAST PACE`
5. `DOUGHCON 1 - EXERCISE TERM`
6. `LOWEST STATE OF READINESS`
7. `INCREASE IN FORCE READINESS`
8. `MAXIMUM READINESS`
9. `INCREASED INTELLIGENCE WATCH`

**The operator's voice**:

10. `Intel by the Slice`
11. `MONITORING 5 ACCOUNTS`
12. `40 REPORTS • 20 ALERTS`
13. `8 LOCATIONS MONITORED`
14. `STATUS: OPERATIONAL`
15. `TIMELINE VIEW:`
16. `POPULAR TIMES ANALYSIS`
17. `Not reporting`
18. `Much quieter than usual`
19. `OPTEMPO 5` / `Business As Usual`
20. `Traffic patterns are normal for evening rush. No anomalous activity detected around the Pentagon.`
21. `↑ RETURN TO LIVE DATA` / `↑ RETURN TO LIVE INTELLIGENCE`
22. `N NEW REPORTS — JUMP TO LATEST`
23. `OPERATIONAL DISCLAIMER`

**The lore and the sign-off**:

24. `"Always monitor the pizzas."` — attributed on the page to Wolf Blitzer
25. `Always monitor the pizzas responsibly. 🍕` — the last line of the disclaimer
26. `Inverse Activity Correlation`
27. `2026: GENTLEMEN'S DISPATCH THEORY`
28. `Status: Nothing Ever Happens`
29. `built for people who refresh when the world gets weird`
30. `Send tips, partnership ideas, ad inquiries, or data sources for the watch desk.`

And the placeholders, which are their worst strings and which
`docs/VOICE.md` §4 already bans for us:
`LOADING TACTICAL DATA...` (×6 in the served HTML), `PREPARING POLYGLOBE`,
`PREPARING GDELT SIGNALS`, `PREPARING NEH INDEX`, `ESTABLISHING CONNECTION...`,
`INITIALIZING OPTEMPO...`.

### 5.2 What the voice is doing

Four moves, and only one of them is "being funny".

**1. It borrows a grammar instead of inventing one.** `DOUGHCON 5 · FADE OUT ·
LOWEST STATE OF READINESS` needs no legend. Three registers stack in one badge:
a number everyone can rank, a codeword that sounds classified, and a phrase that
translates it. We do this and we do it well — `DOOMCON 4 · ROUTINE · NEEDLE
BREATHING` is the same three-layer move, and `NEEDLE BREATHING` is a better
string than `FADE OUT`.

**2. It narrates the apparatus, not the subject.** `MONITORING 5 ACCOUNTS`,
`8 LOCATIONS MONITORED`, `40 REPORTS • 20 ALERTS`, `BASELINE SLOT: Wed 18:30`,
`SENSITIVITY: 2x`, `CORRIDORS: 7/7`. The drama is in the instrument's own
self-description. Nobody is told how to feel; they are told what the rig is
doing. This is exactly `docs/VOICE.md` §2 — "an instrument room, not an oracle"
— and it is the reason their page is funny without a single joke in the body
copy.

**3. It is deadpan about something absurd and never winks.** `POPULAR TIMES
ANALYSIS` over a bar chart of pizza traffic. `Inverse Activity Correlation`ated
at a gay bar. `Gentlemen's Dispatch` as a theory with a date. The comedy is
entirely structural: military register applied to pizza. The instant a line
acknowledged the joke it would die — and the one place they do acknowledge it,
`Always monitor the pizzas responsibly. 🍕`, is the weakest string on the page.

**4. It is generous with counters.** Nearly every heading carries a number and
a denominator. `3 sources`, `7 signals`, `35 live races`, `433 rated seats`,
`SANCTIONED VESSELS 49`. Counters are the cheapest possible density, they read
as rigour, and they are free if you already have the data.

### 5.3 Why theirs is more magnetic than a correct, measured one

It is not that ours is too careful. It is that **ours is careful in the wrong
places and uncareful in the interesting ones.**

Compare the two folds.

> Theirs: `DOUGHCON 5 · FADE OUT · LOWEST STATE OF READINESS` /
> `MONITORING 5 ACCOUNTS · 40 REPORTS · 20 ALERTS` / `22:31:55` /
> `MKT: CLOSED | 10h 58m`

> Ours: `DEGRADED — One or more inputs are not reporting. The score below is
> computed from live pillars only. Dark pillars are excluded, never imputed and
> never counted as zero, and the level is frozen until they report.` /
> `40.5 / 100` / `— no prior observation to compare`

Both are honest. Theirs is honest in seven words per fact; ours spends
forty-two words on a caveat and then declines to state the one number the reader
came for. The caveat is correct and it is the right *policy* — it is just the
wrong *length* for the top of a phone screen. Downdetector's equivalent is one
sentence, and Downdetector is a nine-figure business built on exactly this
problem.

`docs/VOICE.md` already has the answer in §5.4: *"Say the limitation out loud,
in the same breath as the number."* **In the same breath.** Not in the four
lines before it.

The house voice is not the problem. The house voice is better than theirs.
`Nobody knows the odds. We keep count.` beats `Intel by the Slice`, and
`Needle breathing` beats `Fade out`. We are just not putting it where anyone can
see it, and we are burying it under a paragraph of disclaimer.

---

## 6. What we should steal, ranked — and what it costs us

Ranked by estimated impact. Each row says whether it is safe to copy outright or
must be adapted because a straight copy would damage the accuracy claim that is
the entire product.

| # | Steal | Verdict |
|---|---|---|
| 1 | **The in-place dataset switcher** | **Copy.** Pure structure, no honesty cost. Each view must carry its own source states. |
| 2 | **"N new since you looked"** | **Improve on it.** They do not have it. We have stable item ids; they do not. |
| 3 | **One indexable page per item** | **Copy and beat.** Theirs says "3 sources". Ours can publish corroboration, lead time and the score decomposition. |
| 4 | **Live data previews instead of link cards** | **Copy.** With one addition they cannot make: a preview of a dark sub-index must say it is dark. |
| 5 | **An always-moving honest atom** (clock + next-observation countdown) | **Adapt.** Their countdown is to a market open. Ours is to our own cron, which means it must handle *overdue*. |
| 6 | **The pending-arrivals counter** (`N NEW REPORTS — JUMP TO LATEST`) | **Copy.** It counts real items. Honest by construction. |
| 7 | **Counters on every heading** | **Copy.** Free density, and `docs/VOICE.md` §4 already demands the denominator. |
| 8 | **A second named scalar on the fold** | **Adapt.** `SUB-INDICES.md` already specifies BLISS. Two scalars that sometimes disagree is the product. |
| 9 | **Day/era tabs and time travel** | **Copy.** We have `history.ndjson` and a hash chain — better raw material. |
| 10 | **Methodology at the point of use** (their `(i)` popover) | **Copy.** Better than a link to `/methodology.html`. |
| 11 | **Lore inlined rather than linked** | **Adapt, cautiously.** 50.4% is too much for us; a 400px band with three dated anchors and a link is the right dose. |
| 12 | **The 2.2s full-panel `NEW` flash** | **Adapt hard.** See below. |
| 13 | **The wordmark decrypt animation** | **Adapt.** Wordmark only. Never a figure. See below. |
| — | **The mobile interstitial** (`MOST TRADED RIGHT NOW` over the whole fold) | **Do not copy.** |
| — | **`STATUS: OPERATIONAL`** | **Do not copy.** See §6.4. |
| — | **`LOADING TACTICAL DATA...`** | **Do not copy.** Already banned, `docs/VOICE.md` §4. |
| — | **A game with a leaderboard** (`PETE-ZA: SLICE CONTROL`) | **Do not copy.** Off-register for an instrument. |

### 6.1 The `NEW` flash — where it would cost us

`newTweetFlashOverlay` / `newTweetFlashText` put a 52%-black overlay and a
94px-max red glowing `NEW` over a card for 2.2 seconds. It works. It is also the
closest thing on their page to urgency theatre, and `docs/MOTION.md` §4 bans
exactly this: *"Urgency theatre — red flashes, sirens, 'BREAKING' on a routine
day."*

The adaptation that keeps the mechanic and drops the lie:

- Fire **only** on an item id that was not in the previous payload. Never on a
  poll that returned identical data. Never on a rebuild that merely re-scored
  existing items — `docs/NEWS.md` says recency re-decays every run, so scores
  drift without anything happening, and a flash on a drift would be a fabricated
  event.
- Keep it **monochrome and in the pillar colour**, with the pillar glyph, never
  red-on-black. Red is our level-1 colour and must not appear on a routine day.
- Cap the duration at ~900ms, not 2,200ms.
- The pending counter is the part that actually earns the session, and it is
  free of all of this: `4 new items since 02:24 UTC — jump to latest` is a
  count of real things.

### 6.2 The decrypt animation — where it would cost us

`WordmarkDecrypt` scrambles text from `A–Z0–9!@#$%&*` for 1,100ms. They apply it
to the wordmark **and** to the DOUGHCON level.

Applied to the wordmark it is chrome, it is obviously ambient, and it passes
`docs/MOTION.md` §4's test. Applied to a figure it is a lie: for 1.1 seconds the
page displays numbers that are not the reading, and a screenshot taken during
that window shows a false score. Our whole growth loop is people screenshotting
the number.

**Wordmark only. Never the numeral, never the level, never a percentage.**

### 6.3 The mobile interstitial — do not copy

At 375x812 their page covers the entire fold with a blurred-backdrop modal:
`MOST TRADED RIGHT NOW / Houthi military action against Saudi Arabia on
September 23? / 90% YES / ▲45.5pts · Surging / Trade on Polymarket / real money
· prediction markets`. It is dismissible. It is also the first thing a
first-time mobile visitor sees, and mobile is where X traffic arrives.

`docs/TEARDOWN.md` §2.5 already says display ads cheapen the credibility that is
the product. This is worse than an ad: it is an interstitial in front of the
number.

### 6.4 `STATUS: OPERATIONAL` — the thing we must never become

Re-sampled 2026-09-24T02:26Z, one day after the first teardown, unchanged:

```json
{"status":"healthy","stats":{"totalPlaces":16,"successfulScrapesLast24h":2,
 "lastSuccessfulScrape":"2026-09-24T02:13:28.346+00:00","recentScrapes":10}}
```

All five `recentData` entries: `puppeteer_success: false`,
`current_popularity: null`, `puppeteer_error: "No popularity elements found"`.
Still not pizzerias — `Club Visions`, `Casa Colorada`, `Cheetah Premier`,
`The Players Club`, `Pentagon Metro Station`. A 12% success rate reported as
`healthy`, rendered on the page as `STATUS: OPERATIONAL`, over a header that
reads `DOUGHCON 5`.

**And a new one.** They have since started server-rendering the level — the
served HTML now contains `DOUGHCON 4 / DOUBLE TAKE / INCREASED INTELLIGENCE
WATCH`, which fixes `docs/TEARDOWN.md` §3.3's biggest finding. But with
`x-nextjs-stale-time: 300` and a CDN `HIT`, **the prerendered level disagreed
with the live one**: the HTML said `DOUGHCON 4` while the hydrated page said
`DOUGHCON 5 / FADE OUT`. A crawler, a link preview and a pre-hydration
screenshot can each show a level the site is not currently at.

Our equivalent failure would be a cached `index.html` disagreeing with
`api/state.json`. Our 60s poll reconciles it, which is the right design;
whatever else changes, that reconciliation stays.

Their honesty failures are still the opening `docs/TEARDOWN.md` said they were.
The correction is not to be *less* honest to compete on engagement. It is to
make the honesty **short**.

---

## 7. Three live dashboards from outside the niche

Studied live, 2026-09-23/24.

### 7.1 Downdetector

The most relevant of the three, because its entire product is *"is this thing
broken right now"* and it has to be believed.

What it does:

- **The fold is a grid of ~48 named entities**, not a chart. Paramount+, Chase,
  Spectrum, YouTube, AT&T, Roblox, OpenAI, Steam, Reddit… The visitor scans for
  the one they personally care about. Self-selection replaces explanation.
- **A count-up on load**: `0 services` / `0 countries` animating to the real
  figures. One second of motion that states the scale of the instrument.
- **A three-state honesty ladder with published definitions**, in evidence
  language: `No problems` — *"There is no evidence that the company is
  experiencing an incident"*; `Possible problems` — *"There is some evidence
  that the company may be experiencing an incident"*; `Problems` — *"There is
  strong evidence…"*. Three states, one sentence each, on the homepage. Compare
  our four-line `DEGRADED` paragraph.
- **The headline on an entity page is a sentence, not a number**: *"User reports
  show no current problems with OpenAI."* The calm state gets a full sentence
  too, which is precisely `docs/TEARDOWN.md` §2.4's "post the calm days" applied
  to a page instead of a feed.
- **`Learn about our methodology` sits directly under the chart**, not in a nav.
- **Participation**: `Report a problem`, with nine component checkboxes
  (`API`, `App`, `ChatGPT`, `Codex`, `Dall-E`, `Login`, `Sora`, `Web Browser`,
  `Website`), a public comment wall with a posted comment policy, and a rating
  widget. Every visitor can become a data point.
- **A breakdown that explains the number**: `80% ChatGPT / 8% Website /
  7% Web Browser`.
- **A 47-locale cross-link grid** at the bottom of every entity page.
  One entity × 47 locales is their long tail, and it is the same trick as
  pizzint's 997 briefs.
- **Their own X posts embedded in the page**, each with an exact clock and a
  hashtag: *"User reports indicate problems with Chase since 10:32 PM EDT. How
  is it affecting you? #ChaseDown"*. The X flywheel is visible on the site, so
  the site teaches you that the account exists.

**Steal:** the three-state ladder with one-sentence definitions (directly
applicable to our live / dark / awaiting-baseline trichotomy, which is currently
explained in a paragraph); the sentence-not-a-number headline; methodology under
the chart; the breakdown that explains the composite; the embedded own-account
posts.

**Cannot steal:** the comment wall and the report button — static hosting, no
backend, and UGC on an index whose claim is "no human judgement anywhere in the
pipeline" would be a contradiction, not a feature.

### 7.2 Electricity Maps

- **A full-bleed map is the product.** No hero, no explanation above it. The
  legend carries the unit — `Carbon intensity gCO₂eq/kWh`, `0 … 1500`.
- **A time scrubber with a play button** across the bottom (`Sep 22 → Sep 24`),
  and a **granularity switcher**: `5 min · 15 min · hourly · daily · monthly ·
  yearly`. The same dataset, six resolutions, one control.
- The current instant is always stamped: `Sep 23, 2026 · 10:30 PM EDT`.
- A permanent sidebar: `Map / API / Forecast / Home Assistant`, then `API
  reference / Data coverage / Methodology`.

**The mechanic to steal is the scrubber.** One dataset becomes an hour of
exploration the moment you can drag it through time. We are better placed than
they are: `data/history.ndjson` is append-only, every observation has a
hash-chained receipt, and `public/moves/` already exists. A scrubbable
`THE RECORD` chart where dragging updates the gauge, the level badge and the
pillar table to that instant — with the receipt id for that instant shown and
linkable — is the most screenshot-able artefact we could build, and it is a
pure read over data we already publish.

`Data coverage` as a first-class nav item is also worth taking. Our source
freshness strip is a 220px afterthought at 3.6% of the page; for a project whose
differentiator is liveness, it deserves a page.

### 7.3 Flightradar24

- **Bottom toolbar**: `Settings · Weather · Filters · Widgets · Playback`.
  Playback again. Widgets again — the embeddable, which `docs/TEARDOWN.md` §4
  correctly identified as an unclaimed moat in our category and which we already
  ship at `/embed.html`.
- **`Most tracked flights`** — a live ranking of what other visitors are
  watching. It converts a solitary dashboard into a social object at the cost of
  one counter, and it is the strongest FOMO device of the three sites.
- **`Airport disruptions` / `Disruption map`** — the same data re-cut as
  "what is going wrong", which is always more interesting than "what is
  happening".
- **`Bookmarks`** — `Aircraft / Flights / Airports / Locations`, gated behind a
  free account, tiered at 1 / 10 / 25 / 60. This is their return loop, and it is
  explicit: you tell the site what you care about, so the site has something to
  be different about tomorrow.
- Click any object and you get a full drill-down: photo, route, altitude and
  speed history.

**Steal:** the disruption re-cut (ours: *"what is unusual this week"* —
`SUB-INDICES.md` §6 already specifies `/tell`), and the drill-down-on-any-object
discipline: every entity we name should be clickable to a page about that
entity.

**Adapt, because we cannot measure viewers on a static host:** `Most tracked`
becomes **`Most corroborated this week`** — the five items with the highest
`corroboration.count`, computed not observed, with the source names shown. Same
"this is what everyone is looking at" pull, no analytics, no invented number.

**Adapt, because we have no accounts:** bookmarks become a `localStorage`
**watchlist of pillars, sources or labs**, with the "since you looked" diff
scoped to the things the reader picked. No login, no backend, no data leaves the
browser. That is a better privacy story than theirs and the same retention
mechanic.

### 7.4 What all three do that a news site does not

1. **They open on the instrument, not on an explanation.** No hero paragraph.
   The reader's first job is to *look*, not to read.
2. **They let you move through time.** Playback, scrubber, 24-hour chart. A news
   site's past is an archive you navigate; a dashboard's past is a control you
   drag.
3. **They let you make it yours.** Bookmarks, filters, entity grid, locale. A
   dashboard that knows what you care about has a reason to be different
   tomorrow; a news site does not.
4. **They state the unit and the denominator on the instrument itself.**
   `gCO₂eq/kWh`, `0–1500`, `8 LOCATIONS MONITORED`, `433 rated seats`.
5. **They treat "nothing is wrong" as a finding with its own copy.**
   *"User reports show no current problems with OpenAI."* Our
   `Activity within the normal range of the record.` does this, and it is one of
   the best strings we have — it just never changes, so it stops being read.

---

## 8. The ranked change list

Ranked by estimated effect per unit of work. Every row names the file it lives
in. `site/build.mjs` is owned by a human integrator and is **not** edited by any
of these — where a change needs a new output file, the row says what
`build.mjs` would have to call.

Figures marked **(est.)** are engineering estimates, not measurements. We
have no analytics on either site; `docs/TEARDOWN.md` §7 already records that
limitation and it still holds.

---

### 1. Fix the delta line on the fold
**File:** `site/templates/index.mjs`, and the `applyState` path in
`site/templates/_motion.mjs`.

The hero currently renders `— no prior observation to compare` directly under
the composite score, while the score visibly moved 40.7 → 40.5 during a
seventy-second sample with that line on screen.

The delta is not missing. Verified against the committed snapshot
(`node -e` under `node:20-alpine`, per the build constraint):

```
delta_from_previous  -0.1284
previous_level       null
```

So the guard is keyed on `previous_level`, which is null until the first level
*change*, rather than on `delta_from_previous`, which has been real since the
second observation. A level that has never changed is not the same thing as a
score that has never moved, and the fold is currently conflating them — which is
the same category error `docs/VOICE.md` §4 rules out for **dark** versus
**awaiting baseline**. This is the single most valuable string on the page
rendering as an apology.

It should read `40.5 / 100 · ▼ 0.2 since 00:04 UTC`, with the arrow doubled by a
glyph and a word so it is never colour alone.

**Effect (est.):** the largest on this list per line of code. It restores the
only above-fold fact that answers *should I care today*. **(est.)**

---

### 2. Two always-moving, always-true atoms in the masthead
**File:** `site/templates/layout.mjs` (markup, server-rendered with the correct
initial values) + `MOTION_JS` in `site/templates/_motion.mjs`.

```
02:31:55Z            ← ticks every 1s
NEXT OBSERVATION IN 07:24   ← ticks every 1s, from generated_at + 15m
```

Both are facts about our own rig. The countdown derives from `generated_at` and
the published `*/15` cron. It **must** degrade, because GitHub's scheduler is
routinely late and our own workflow comments say so:

- `t > 0` → `NEXT OBSERVATION IN mm:ss`
- `t <= 0` and under ~10 minutes late → `OBSERVATION DUE`
- beyond that → `OBSERVATION OVERDUE — LAST 02:24:41Z`

That last state is a feature. pizzint prints `STATUS: OPERATIONAL` at a 12%
success rate; we would print our own lateness, to the second.

Server-render the initial strings so a pre-JS screenshot is correct
(`MOTION.md` Rule 0), and freeze the seconds under
`prefers-reduced-motion: reduce` to a minute-granularity value.

**Effect (est.):** takes us from 0 always-moving above-fold atoms to 2, which
is exactly parity with the thing that makes their page read as live on a dead
night. Also converts dead time between builds into an appointment. **(est.)**

---

### 3. "Since you looked"
**File:** `site/templates/_motion.mjs` (storage + diff + render), markup slot in
`site/templates/layout.mjs`.

Persist on every visit, wrapped in `try/catch` because private-mode and blocked
storage both throw:

```
doomcon.lastSeen = { at, generated_at, score, level, newest_item_id, receipt_id }
```

On load, diff against `api/state.json` and `api/news.json` and render a single
dismissible line above the hero:

> **SINCE YOU LOOKED** · 18h 41m ago · score 40.7 → 43.1 (+2.4) · level held at
> DOOMCON 4 · 31 new items · 2 receipts · governance overtook capability

Rules: render nothing on a first visit; render nothing if storage is
unavailable; render nothing if nothing changed — **a page that reports change
when none occurred is the pizzint failure mode in a different costume**
(`MOTION.md` §2.5). Never write anything to storage that is not already public.

**Effect (est.):** the biggest single lever on return rate, and the one
mechanic neither pizzint nor any competitor in `docs/TEARDOWN.md` §4 has built.
**(est.)**

---

### 4. One indexable page per news item
**Files:** new `site/templates/itemPage.mjs`, new `site/templates/itemsIndex.mjs`,
plus `site/templates/sitemap.mjs`.

**Integration note for `site/build.mjs`:** after the existing news page is
written, and using the same `ctx` that already carries `data/news.json`, call
`renderItem(ctx, item)` once per item in `ctx.news.items` and write each to
`public/item/<id>.html`; call `renderItemsIndex(ctx)` to `public/item/index.html`;
and add every emitted path to the sitemap list that `sitemap.mjs` already
receives. Ids are `sha256(canonical_url)[0:16]` and are stable across runs by
contract (`docs/NEWS.md`), so URLs never churn. This runs **after**
`build.mjs` clears `public/`, like everything else that writes there.

Each page carries what theirs cannot: corroboration count and the named sources,
`first_seen_published_at` and `last_published_at` with the `lead_minutes`
spread, the five-term `score_components` breakdown that sums to the printed
score, `pillar_reason`, the entity list, and a link to the run's receipt.

**The flat case is not hypothetical.** On the committed run every one of the 200
items has `corroboration.count == 1` and `lead_minutes == 0`; the 676-minute
spread recorded in `docs/NEWS.md` is from an earlier run. So the template has to
read well when nothing is corroborated — *"1 source. No independent
corroboration yet."* is a true and useful sentence, and it is one their brief
format has no way to say.
`NewsArticle` + `BreadcrumbList` JSON-LD.

**Effect (est.):** 7 → ~207 indexable URLs. This is the mechanism behind 997
of their 1,018 sitemap entries, and `docs/TEARDOWN.md` §2.3 already called it
"the single most important finding in the teardown". **(est.)**

---

### 5. An in-place view switcher above the fold
**Files:** `site/templates/index.mjs`, `site/styles.mjs`.

Five tabs in the slot directly under the level badge, all five panels
server-rendered into the HTML, switched with a CSS `:checked` radio pattern so
the whole thing works with JavaScript off and a pre-hydration screenshot shows
the default panel fully:

```
PILLARS · SOURCES · SIGNAL · THE RACE · THE RECORD
```

`SOURCES` is the 14-source freshness grid promoted out of its 220px afterthought
slot. `THE RACE` is a five-row live leaderboard, not a link. Each panel keeps
its own source-state row, so a dark panel says so rather than borrowing the
index's health.

**Effect (est.):** turns one screen into five without a navigation. This is
the structural difference the measurements in §1.2 point at, and it is the
highest-impact change on the list that is not a one-liner. **(est.)**

---

### 6. Compress the `DEGRADED` banner to one line
**Files:** `site/templates/layout.mjs`, `site/styles.mjs`.

From four lines and ~170px of a 812px phone fold to:

```
DEGRADED · 13/14 reporting · 1 dark (govuk) · level frozen   [why]
```

with the current paragraph moved into a `<details>` behind `[why]`, and the same
one-line treatment for the `awaiting baseline` count. Downdetector proves a
three-state honesty ladder fits in one sentence per state (§7.1); the policy
does not change, only the length. The three states stay distinct and stay named
(`docs/VOICE.md` §4).

**Effect (est.):** recovers ~20% of the mobile fold for facts. **(est.)**

---

### 7. Live previews instead of link cards
**Files:** `site/templates/index.mjs` (the `xsell` section), plus a compact
`renderPreview(ctx)` export added to `site/templates/racePage.mjs` and
`site/templates/newsPage.mjs` so the preview and the page cannot disagree.

Today: 224px, 3.6% of the page, at 84% scroll depth, and `/race.html` linked
exactly once. Their equivalents are 640px, 408px and 734px of **live data** with
multiple CTAs each.

Ours should be a five-row race leaderboard with the actual probabilities and
7-day deltas, plus a `Most corroborated this week` block (§7.3) — each with its
own heading CTA, moved above `THE FIVE PILLARS`.

A preview of a dark or uncalibrated sub-index must say so on the preview. That
is the one line their format has no room for, and it costs us nothing.

**Effect (est.):** the largest lever on pages-per-session after the switcher,
because the second page is where a session stops being a glance. **(est.)**

---

### 8. The pending-arrivals counter
**File:** `site/templates/_motion.mjs`.

When the poll brings item ids that were not in the previous payload and the
reader has scrolled past the feed head, pin:

```
4 NEW ITEMS SINCE 02:24Z — JUMP TO LATEST
```

Count real ids only. Never fire on a re-score — `docs/NEWS.md` is explicit that
recency re-decays every run, so scores drift with no event behind them, and a
counter that moved on a drift would be inventing news. Clear on click. Suppress
entirely under `prefers-reduced-motion`? No — the counter is information, not
motion; keep it, and drop only the scroll animation.

**Effect (est.):** their strongest session-length device, and honest by
construction because it is a count of things that exist. **(est.)**

---

### 9. Counters on every heading
**Files:** `site/templates/index.mjs`, `site/templates/_parts.mjs`,
`site/brand.mjs`.

`THE FIVE PILLARS` → `THE FIVE PILLARS · 4 scored, 1 awaiting baseline`.
`SIGNAL FEED` → `SIGNAL FEED · 200 items from 16 feeds, 14 live, 2 dormant`.
`RECENT MOVES` → `RECENT MOVES · 4 receipts, chain verified`.
`THE RECORD` → `THE RECORD · 5 scored observations since 2026-09-23`.

This is free density, it is the cheapest item on the list, and `docs/VOICE.md`
§4 already requires the denominator — we simply are not doing it on headings.

**Effect (est.):** small per heading, meaningful in aggregate; it is the
texture that makes a terminal page read as authoritative. **(est.)**

---

### 10. A scrubbable record
**Files:** `site/templates/_charts.mjs`, `site/templates/history.mjs`,
`site/templates/index.mjs`.

Electricity Maps' scrubber and Flightradar24's Playback, over
`data/history.ndjson`. Dragging the handle repaints the gauge, the level badge
and the pillar table to that instant and shows the receipt id for it, linked.
Keyboard-operable, and with JavaScript off it is the static chart we ship today
with nothing lost.

**Effect (est.):** the biggest jump in time-on-page for a returning reader who
already knows today's number, and the most screenshot-able thing we could
build. **(est.)**

---

### 11. Methodology at the point of use
**Files:** `site/templates/_parts.mjs`, `site/styles.mjs`.

A `<details>` disclosure on the level badge and on each pillar heading, carrying
three sentences of plain English and a deep link into `/methodology.html`.
pizzint's `(i)` popover explains DOUGHCON in two sentences — *"One place spiking
doesn't raise DOUGHCON—it needs several places busy together, and that pattern
needs to last a few hours"* — which is a better explanation of hysteresis than
most methodology pages manage, and it is right where the number is. We have six
anti-flap layers and a dual-window dwell that nobody reads about on a separate
page.

**Effect (est.):** conversion from "saw a number" to "understood the
instrument", which is the precondition for a return visit. **(est.)**

---

### 12. A lore band on the homepage
**File:** `site/templates/index.mjs`, sourced from the existing
`site/templates/history.mjs` content.

They spend 50.4% of the homepage on lore. That is too much for us and copying
the ratio would be silly. But 0% is also wrong: the lore is what makes a
weekend-looking project read as an institution, and we already have the better
material — Good 1965, Dartmouth 1956, Hinton 2023, the 2023 pause letter.

A ~400px band with three dated anchors and a link to `/history.html`. Quoted
titles of cited works are reproduced verbatim even when they trip the
future-tense list, per `docs/VOICE.md` §3.3 — Vinge's paper is called *"The
Coming Technological Singularity"* and that is its name.

**Effect (est.):** small on session length, real on perceived permanence, and
it is indexable surface. **(est.)**

---

### 13. Source states get their own page
**Files:** new `site/templates/sourcesPage.mjs`; add the route to
`site/templates/sitemap.mjs` and the nav in `site/templates/layout.mjs`.

**Integration note for `site/build.mjs`:** call `renderSources(ctx)` and write
to `public/sources.html`, then include the path in the sitemap list.

Electricity Maps gives `Data coverage` a first-class nav slot. Liveness is our
differentiator and it currently occupies 3.6% of one page. A page that names all
fourteen index sources and all sixteen feeds, with per-source state, last-OK
time, error text where dark, and the date the baseline freezes — with the three
states defined in one sentence each, Downdetector-style — is both a retention
page and the single most direct attack on `"status":"healthy"` at two scrapes a
day.

**Effect (est.):** modest traffic, high credibility, and it is the page a
journalist links. **(est.)**

---

### 14. A watchlist, held in the browser
**File:** `site/templates/_motion.mjs`.

Flightradar24's bookmarks without the account. A star on any pillar, source or
lab writes an id into `localStorage`; the "since you looked" line (change 3) is
then scoped to the starred set first. No login, no backend, nothing leaves the
browser, and it is a better privacy story than theirs.

Ship this **after** 3, not with it — it is worthless until there is a diff to
scope.

**Effect (est.):** compounding on return rate for the readers who already come
back. **(est.)**

---

### 15. Fix the sitemap
**File:** `site/templates/sitemap.mjs`.

Three move pages exist in `public/moves/`; `public/sitemap.xml` lists one. The
likely cause is ordering rather than enumeration — the sitemap is rendered
before the later pipeline stages that emit the newer move pages, so it can only
ever describe the state of `public/` at the moment it ran.

**Integration note for `site/build.mjs`:** `sitemap.mjs` needs the full list of
emitted paths, which means either rendering the sitemap last, or passing it the
move ids from `ctx` rather than from the filesystem. The template can accept a
`paths[]` argument; it cannot fix an ordering problem from inside itself.

This is currently discarding the only long-tail surface we have, and it is a
precondition for change 4 being worth anything.

**Effect (est.):** small on its own; it is the gate on change 4. **(est.)**

---

## 9. Where we are boring, stated plainly

1. **We render one number eight ways and call it a dashboard.** Roughly 20 of
   57 above-fold atoms are the composite score in different costumes. Nobody
   needs a gauge *and* a distribution marker *and* a band label *and* five pips
   *and* a caption to learn that 40.5 is normal.
2. **Nothing on our page moves unless a build lands, and a build lands every
   fifteen minutes.** Zero always-moving atoms. They have two, they cost one
   `setInterval` each, and they are why their dead night reads as live.
3. **We spend a fifth of a phone fold apologising.** The policy behind the
   `DEGRADED` banner is right and it is the best thing about this project. Forty
   two words at the top of a phone screen is not.
4. **Our best page is linked once, below the fold, as text.** `/race.html` is a
   live leaderboard cross-checked across two prediction markets and it gets
   3.6% of the homepage at 84% scroll depth. Theirs would give it 640px and four
   CTAs.
5. **We have 200 scored, corroborated, lead-timed news items and zero pages for
   them.** They have 997 pages for weaker versions of the same thing, and those
   997 pages are where their traffic actually comes from.
6. **A returning visitor gets no acknowledgement that they have been here
   before.** So does theirs — but they have a 374K-follower X account doing that
   job and we do not, which makes the gap ours to close, not theirs.
7. **The one number a returning reader wants — has it moved — currently renders
   as `— no prior observation to compare` while the score changes on screen.**

None of this is a voice problem. `Nobody knows the odds. We keep count.` and
`Needle breathing` are better strings than `Intel by the Slice` and `Fade out`.
The foundation is good, exactly as the operator says. It is arranged as a
report, and it needs to be arranged as an instrument.


---

## Appendix — reproducing the measurements

**Browser measurements.** Load the page, wait for hydration, then run the
hit-tested text-atom count in the console. A node is kept only if its own range
rect intersects the viewport, its computed style is visible, and
`document.elementFromPoint` at its centre resolves back to it — which is what
excludes clipped marquee tracks and content behind the mobile interstitial.

```js
[...(function*(){const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
let n;while(n=w.nextNode())yield n;})()].filter(n=>{
  const t=n.textContent.trim(); if(!t) return false;
  const p=n.parentElement, cs=getComputedStyle(p);
  if(cs.visibility==='hidden'||cs.display==='none'||parseFloat(cs.opacity)===0) return false;
  const r=document.createRange(); r.selectNodeContents(n);
  const b=r.getBoundingClientRect(); if(!b.width||!b.height) return false;
  if(b.bottom<0||b.top>innerHeight||b.right<0||b.left>innerWidth) return false;
  const h=document.elementFromPoint(
    Math.min(Math.max(b.left+b.width/2,1),innerWidth-1),
    Math.min(Math.max(b.top+b.height/2,1),innerHeight-1));
  return !!h && (h===p||p.contains(h)||h.contains(p));
}).length
```

Snapshot that array, wait 70s, snapshot again, and diff for the churn figure.

**Data claims.** Everything quoted from `data/` was verified under the build
constraint (`docker run --rm -v "$PWD":/app -w /app node:20-alpine node …`):
200 items, 16 feeds (14 `live`, 2 `dormant`), 14 index sources, 5 pillars,
`delta_from_previous -0.1284`, `previous_level null`, `dark_pillars []`,
9 uncalibrated sources, every `id` 16 hex characters,
`max(corroboration.count) == 1` on this run.

**Voice hygiene.** This file was run through the repo's own
`findFutureViolation()` from `collector/posts.mjs` via a throwaway root harness,
as `docs/VOICE.md` §3.3 recommends. `docs/` is style-only and not gated by that
test, and the remaining hits are the documented carve-outs: the quoted title
*"The Coming Technological Singularity"*, and `Forecast` as a verbatim nav label
on Electricity Maps. Everything else was rewritten rather than excused.
