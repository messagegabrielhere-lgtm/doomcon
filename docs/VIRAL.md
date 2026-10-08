# Viral — getting the number seen, and passed on

**Status:** plan, not yet actioned. Nothing in this file has been posted, and no
credential was created, requested or handled while writing it. Written
**2026-09-28 (UTC)** against the live repo and the live site. The research sweeps
behind it were read on 2026-09-26/27; the X ranker source was re-read in this
session at commit `4c5cfe8f`.

Companion to `docs/X-STRATEGY.md` (what X costs and permits), `docs/POSTING.md`
(what `collector/posts.mjs` emits), `docs/GROWTH.md` (the site),
`docs/ENGAGEMENT.md` (the page), `docs/VOICE.md` (the words) and
`docs/CONTRACT.md` (the rules). Where this file disagrees with one of them it
names the line and leaves the edit to that file's owner.

**Every number carries a source tag in square brackets, resolved in §9.** A
number tagged `[REPO]` was read from a file in this repo at the stated time, or
by a command anyone can rerun. View counts for other accounts' posts are
search-engine snapshots of x.com pages (x.com returns 403 to direct fetches);
they drift daily and are not independently reproducible. They are here as
ordinal evidence — which formats spread — never as a promise of reach.

---

## 0. The diagnosis in five lines

1. **The daily post has been generated every run and never sent.** Every CI run executes `collector/posts.mjs` then `site/post-sheet.mjs` (`collect.yml` lines 166–167 and 444–445, `news-fast.yml` 93–94) and publishes a guarded, carded slate at `/post-sheet.html` (HTTP 200 at 03:05 UTC on 28 Sep; six posts in the 02:22 UTC slate `[REPO]`) — and the pipeline ended there, at a console for a human who never pasted from it.
2. **The cause is an account gap, not a code gap:** `X_HANDLE = null` (`site/brand.mjs:102`), no DOOMCON account exists on any network, no posting secret exists, and CONTRACT.md hard constraint 3 still reads "No secrets anywhere… Posting is manual".
3. **Only the operator can close it:** create the DOOMCON X account (Automated label, bio disclosure, managing human account) and a Bluesky account; create the X developer app and buy credits (≈$0.030 per card post `[PRICE][STAFF]`); add the posting values as GitHub repository secrets; and register `doomcon.watch`, which still does not resolve (03:05 UTC, 28 Sep `[REPO]`).
4. **Now automated, pending commit:** a parallel workflow wrote `collector/post-daily.mjs`, `post-x.mjs`, `post-bluesky.mjs` and `.github/workflows/post-daily.yml` on 28 Sep — one card post a day per channel at 14:41 UTC, the link-free `api` text on X and the linked `manual` text on Bluesky, the three news kinds left to a human, a ledger at `data/posted.ndjson`, and a green no-op while the secrets are absent. Offline, with networking disabled and the repo read-only, its dry run at 03:20 UTC built both signed requests end to end and its selftest passed 18 of 18 at 03:22 UTC `[REPO]`; POSTING.md §6 documents it. Nothing has been sent, because no account or secret exists.
**Update, 28 Sep 03:04 UTC.** The first post went out: the daily reading, by hand, from the operator's existing account, which they had already renamed DoomCon (@GT1771868173636, 399 followers). They chose that account over a fresh one when asked. [x.com/GT1771868173636/status/2104406756935844123](https://x.com/GT1771868173636/status/2104406756935844123) carries the state card as an image with alt text; X's cached link card for the site was a 25 Sep reading and was removed. The post is the first line of `data/posted.ndjson`, so the automated poster will not repeat it. Items 2 and 3 above stand for automation. The X account now exists; the developer app, the credits and the secrets do not.

5. **Running cost once the secrets exist:** 30.44 × $0.030 ≈ **$0.91 a month** on X `[PRICE][STAFF]`, $0 on Bluesky — and the rest of this file is what to post, when, where else, and what never to do.

---

## 1. The mechanics that matter

Unless tagged otherwise, everything in §1.1–1.2 is from `xai-org/x-algorithm` at
commit `4c5cfe8f` (committed 2026-09-26 03:39 UTC), re-read in this session
`[ALG]`. The defaults move: the research sweep counted eight commits to
`param.rs` between 17 and 26 Sep `[ALG-LOG]`. Re-read before quoting.

### 1.1 The weights — `home-mixer/params/param.rs`

| Signal | Weight | | Signal | Weight |
|---|---:|---|---|---:|
| **Share via copy link** | **20.0** | | Click | 0.4 |
| Share via DM | 5.0 | | **Open link** | **0.2** |
| Reply | 5.0 | | Video open | 0.07 |
| Quote | 5.0 | | Photo expand | 0.05 |
| Follow author | 4.0 | | Dwell | 0.05 |
| Share | 2.0 | | Profile click | 0.0 |
| Repost | 1.0 | | Report | −234.0 |
| Like | 0.5 | | Mute / Not interested / Block | −58.8 / −43.2 / −31.2 |

Four readings. The first two are stated in the source's own comment:

- **Weights multiply predicted probabilities, not counts.** The comment block
  above them says so and calls "one report cancels 468 likes" a misreading.
  X-STRATEGY §5.3's "a copy-link share is worth 40 likes" is the same misreading
  in the other direction. The *ordering* is the design signal; the ratio is not
  an exchange rate.
- **Only actions on a post served in Home Timeline count.** The same comment:
  "Directly navigating to a post (i.e., coordinating via groupchat) has no
  ranking impact." A screenshot or a link passed round a group chat does not
  feed the ranker. It feeds follows and the site. What the ranker rewards is the
  copy-link tap itself, made from the feed.
- **The image is not rewarded; its share is.** Photo expand is 0.05.
- **Mutual follows lift the reply term fourfold.** For an original post whose
  author the viewer mutually follows, the reply weight is 5.0 + 15.0 = **20.0**
  (`BidirectionalFollowReplyWeightBoost` 15.0 in `param.rs`, added in
  `xai-value-model/weights.rs:78–84`). Following back the accounts that reply
  with substance raises the weight of the reply term on DOOMCON's next post in
  their feeds. (The research brief described this as "15x"; the code adds 15.0 to
  5.0.)

### 1.2 Time, repetition, distance

| Mechanic | Value | Where | What it means here |
|---|---|---|---|
| **Age filter** | 48 h — `MAX_POST_AGE = 48*60*60` | `home-mixer/params/config.rs:36`, wired as `AgeFilter::new` in `phoenix_candidate_pipeline.rs` | A post has two days. One post a day keeps two live at any time. |
| **Author diversity** | multiplier `(1 − 0.25)·0.5^k + 0.25` → **1.0, 0.625, 0.4375, … floor 0.25** | `xai-value-model/scoring.rs:143–144`; defaults `vm-ranker/params.rs` (enabled, decay 0.5, floor 0.25) | A second post in one feed is worth **0.625** of the first, not half. X-STRATEGY §5.3 and the `reach_note` in `posts.mjs` say "half"; both want correcting. The rule survives: one good post beats two. |
| **Out-of-network factor** | ×0.75 | `vm-ranker/params.rs` `OonWeightFactor` | A new account's reach is almost all out-of-network until people follow. |
| **Replies and reposts reach strangers** | never — dropped | `home-mixer/filters/oon_retweet_reply_filter.rs` | Thread tails are replies, so strangers never see them in For You. Plain reposts of DOOMCON by others do not reach *their* non-followers either; quote posts do. **Only the head post travels.** |
| **Cold-start slot** | original post (not reply, not repost), author ≤ 1,000 followers, post < 1,000 impressions, ≤ 172,800 s old → feed positions 15–16; on by default | `param.rs` `ColdStart*`, `EnableViewerColdStart = true`; eligibility at `home-mixer/scorers/author_cold_start.rs:176–180` | Every original post from a fresh account under 1,000 followers is eligible for an exploration slot. One original post a day; never reply-first. |

### 1.3 Links, formats, screenshots — measured elsewhere

| Finding | Number | Source |
|---|---|---|
| Link posts, non-Premium accounts, after Mar 2025 | ~0% engagement; Premium link posts 0.28% vs text 0.90%; Premium ≈ 10× the reach of regular accounts | `[BUF-LINK]` |
| Median engagement rate by format on X | text 3.56%, image 3.40%, video 2.96%, link 2.25% | `[BUF-FMT]` |
| API price of a URL in the text | $0.200 against $0.015 — 13.3× | `[PRICE]` |
| API price of attaching the card | each uploaded media object is metered as a PostCreate event → ≈ $0.030 per card post | `[STAFF]` |
| Screenshots travel without attribution | a fabricated Polymarket odds screenshot spread on 9 Jan 2026; METR's chart was called "the most misunderstood graph in AI" (MIT Technology Review, 5 Feb 2026) because it spread without its caveats | `[VIEWS]` |

Three consequences:

1. **On X, the head post carries no link — even when pasted by hand.**
   POSTING.md §1 recommends the `manual` (linked) variant on the reasoning that
   the API surcharge does not apply to a hand-pasted post. True, but the
   surcharge was never the only cost: non-Premium link posts earn ~0%
   `[BUF-LINK]`. Paste the link-free `api` text as the head, and the page link by
   hand as reply 1. Epoch AI does exactly this `[VIEWS]`. The automated path
   already sends X the `api` text (POSTING.md §6.1); *§1 wants aligning with it,
   by its owner.* On Bluesky, Threads and Mastodon the `manual` variant is right
   (§5).
2. **The card is the shareable unit.** The number, the UTC time, the domain and
   the receipt id are burned into it by `collector/card.mjs`, so a screenshot
   carries its own provenance. Keep it that way.
3. **One post, not a thread.** The tail is invisible to strangers (§1.2).

### 1.4 Timing

Three studies, in local time, across all industries `[TIMING]`: Buffer (8.7M
posts) — Tue 9am, Wed 9–10am best, 6–11pm worst; Sprout Social (~2B engagements,
Nov 2025–Feb 2026) — Tue–Thu 12–6pm; OpenTweet (50K tweets, Jan–Apr 2026) — Wed
9–11am +17%, Sun −23%. For a US-Eastern-weighted AI audience that converts to
**13:00–16:00 UTC, Tue–Thu**, avoiding 22:00–03:00 UTC. That is a derivation, not
a measurement of this audience; two weeks of our own numbers (§7) override it.

The pending publisher runs at **14:41 UTC** (`post-daily.yml`), inside that
window. For anything posted by hand, the same clock applies.

`schedule()` in `posts.mjs` anchors `suggested_at` to `state.generated_at` —
whichever reading the build ran on — so the top post's suggested time is simply
the moment of the build, at any hour of the day or night. It carries no opinion
about when people read. **Post by the clock above, not by `suggested_at`.** The
index re-reads roughly hourly (`data/history.ndjson`: hourly from 14:03 to 23:19
UTC on 27 Sep, then a gap to 02:22 on 28 Sep `[REPO]`), so the slate on
`/post-sheet.html` at 14:00 UTC is usually about an hour old, and every post
prints its own reading time.

---

## 2. Post formats, ranked for this account

"This account" means: new, zero followers, no Premium, one post a day, link-free
head, card attached. The ranking is ordinal, argued from the analogue beside each
format. No view count is promised for any of them.

**The anatomy every spreading example in the research shares** — Epoch, Kalshi,
Artificial Analysis, METR, @PenPizzaReport `[VIEWS]`:

- one number, with its denominator;
- one comparison or threshold sentence, against a stated baseline;
- one exact clock time;
- the card;
- no link in the head post;
- nothing else.

DOOMCON's templates already have every part except the second in most cases.
`milestone`, `market-move`, `escalation` and `pillar-spike` are the ones that
carry a threshold, which is why they rank high here.

| Rank | Format (template, priority) | Analogue from the research | The constraint it must respect |
|---:|---|---|---|
| 1 | Level change — `escalation` 10 / `deescalation` 30 | Artificial Analysis, leaderboard change on a release day | what moved, never why the world moved |
| 2 | Record or threshold — `milestone` 20, `market-move` 48 | Kalshi, "a recent high" / "all-time low" | record only from ≥ 30 readings; price belongs to the venue |
| 3 | Named people on a board — `race` 38 | Polymarket midterms hub | price belongs to the lab, question verbatim |
| 4 | One number and its denominator — `drought` 35 | Epoch AI; METR | the caveat inside the sentence that travels |
| 5 | A count with its qualifier — Flock, /world (**no template yet**) | alpranalysis and DeFlock on HN | "as mapped in OpenStreetMap on <date>" verbatim |
| 6 | Someone else's headline, counted — `corroboration` 45, `developing` 28, `top-news` 25 | Downdetector on the largest outage day | verbatim; skipped, never rewritten |
| 7 | The calm day — `daily` 60, `weekly` 55 | @PenPizzaReport's quiet posts | identical format loud or calm |
| 8 | The honesty post — `degraded` 5 | none; it is the differentiator, not a reach play | dark and awaiting baseline never merged |
| — | Parked: DOOMCON against BLISS | none in the category | two readings side by side, never netted |

### 2.1 Level change on a news day — rank 1

**Analogue.** Artificial Analysis, 22 Sep 2026: a model "takes the top spot on
the Artificial Analysis Intelligence Index", with a price cut, plus an image —
~407K views from an account of ~77K followers; its Aug 18 index launch drew 170K
`[VIEWS]`. @PenPizzaReport, 12 Jun 2025: a surge card at 6:59pm
ET, about an hour before Israel struck Iran; the account went from ~50K
followers (Jun 2025) to >374K (Feb 2026) to ~399.7K (Sep 2026) `[VIEWS]`
(COMPETITIVE.md).

**Why first.** A level change is rare by construction — ±3-point deadband,
dual-window dwell, 6-hour minimum between changes, 4-hour lock, one step per
change, a 2-of-5 pillar quorum `[CONTRACT]` — so it is the one DOOMCON post that
is news by definition.

**Constraint.** The post says which pillars moved and by how much. It never ties
the level to an event, never reads as a probability (the WHO Phase 6 precedent,
VOICE.md §1), and goes out inside the 90-minute `CHANGE_WINDOW_MS` or not at all.
The de-escalation gets the same billing, or the index is a ratchet.

**Gap.** Nothing alerts the operator when a level changes, so the 90-minute
window currently passes unseen (§8.3).

### 2.2 Record or threshold — rank 2

**Analogue.** Kalshi: "Odds Tesla and SpaceX merge… skyrocket to 60% — a recent
high" (14 Aug 2026, ~1.2M); "50% chance Fed hikes next month" (21 Sep, ~1M);
"Odds of a recession next year reach an all-time low of 20%" (26 Sep, ~786K).
The same account's Jan 2025 posts ending "View live odds (and bet)" plus a link:
~3.9K and ~4.3K `[VIEWS]`. Card and one sentence against link: two orders of
magnitude. The register ("skyrocket") is banned here; the structure is not.

**Constraint.** `milestone` fires only with ≥ 30 prior readings
(`MIN_HISTORY_FOR_RECORD`); "highest since <date>" is read from
`data/history.ndjson`, never typed. `market-move` needs ≥ 4 points in 24 h
(`MARKET_MOVE_MIN_POINTS`), names the venue, and quotes the question verbatim.

**Live defect.** At 02:22 UTC on 28 Sep the generator produced a market-move on
Kalshi (34 percent, moved 22.0 points in 24 hours) with the question printed as
`"OpenAI increase the cost of ChatGPT? —..."` `[REPO]`. A clipped question is
neither verbatim nor forwardable. Skip it rather than clip it (§8.3).

### 2.3 Named people on a leaderboard — rank 3

**Analogue.** Polymarket's "2026 Midterms Hub" card, 18 Sep 2026: ~2.8M views
`[VIEWS]`. Names are what get forwarded (POSTING.md §2.3).

**Live example**, generated at 02:22 UTC on 28 Sep `[REPO]`:

> $874k is posted on Polymarket's "Which company has best AI model end of
> 2026", 02:22 UTC, 28 Sep 2026: Dario Amodei's Anthropic 75.0 percent, Demis
> Hassabis' Google DeepMind 9.5, Sam Altman's OpenAI 8.5.

**Constraint.** A price belongs to the lab, never the person — there is a test
for it. The venue's question is quoted verbatim. This is also the only honest
way to speak about an unreleased model: its price on a verbatim question.

### 2.4 One number and its denominator — rank 4

**Analogue.** Epoch AI, 22 Sep 2026: AI cost "has fallen ~47%/quarter since
2023", set against DNA sequencing and compute in one comparative sentence, plus a
chart, with the link in the reply — ~460K views in a search snapshot, ">1M" in
secondary write-ups; the same account's Nov 2025 explainer chart drew 2,894
`[VIEWS]`.
METR, 19 Mar 2025: "doubling about every 7 months", one line on one chart —
~2.8M `[VIEWS]`, and the cautionary tale of §1.3.

**Live example**, 02:22 UTC on 28 Sep `[REPO]`:

> 1,171 of the 1,877 mapped US datacentres sit in a county at D1 drought or
> worse. That is county area, not site draw. US Drought Monitor, 22 Sep 2026 map,
> joined at 02:22 UTC, 28 Sep 2026.

**Constraint.** The denominator is datacentres OpenStreetMap has mapped; "That is
county area, not site draw" is a required line; the threshold is D1, because D0
is "abnormally dry", which is not drought (POSTING.md §2.2). METR's lesson is
that the caveat has to be inside the sentence that travels.

**Blocking defect.** `/map.html` is titled "1,877 datacentres mapped, 1,350 of
them in a county in drought". Recounted in this session from
`data/datacenters.json` (02:22 UTC, 28 Sep): **D0 or worse 1,350; D1 or worse
1,171** `[REPO]`. The page counts D0 as drought; the post does not. A reply that
screenshots both numbers side by side is the one reply this card cannot survive.
The drought card image has the same fault: `collector/cards/drought.png` counts D0
and printed 71.9% on 28 Sep (1,350 of 1,877), which is why the pending publisher
attaches the index card to drought posts instead (`CARD_FOR_KIND` in
`collector/post-daily.mjs`). Reconcile the page and the card to D1 before the
drought number is pushed anywhere (§8.3).

### 2.5 A count with its qualifier — rank 5

**Analogue.** Hacker News rather than X: Show HN for alpranalysis.com
(county-level ALPR coverage from OSM), 239 points and 146 comments, 10 Dec 2025;
the DeFlock map, 621 points and 234 comments, 4 Mar 2026 `[HN]`.

**Data** `[REPO]`:

- `data/flock.json` (03:58 UTC, 26 Sep): **115,608 Flock ALPR cameras as mapped in
  OpenStreetMap on 2026-09-26**, 115,350 of them inside a US county; **948 of
  3,235 US counties have none mapped** (29.3%).
- `data/world.json` (21:02 UTC, 27 Sep): 5,274 datacentre sites as mapped in
  OpenStreetMap on 2026-09-27, in 113 countries; 124 countries have none mapped.
  The `/world` page is not live yet (`world.html` 404 at 03:05 UTC, 28 Sep).

**Constraint.** `copy.headline_qualifier` verbatim; `copy.never_say` honoured
("all Flock cameras", "every Flock camera", "the number of Flock cameras in the
United States", "a national total"; for the world file, "the number of
datacentres in the world"); "a county with no pins is a county nobody has mapped"
in the post, not a footnote; `© OpenStreetMap contributors` on any image, which
is a licence condition under ODbL (FLOCK.md §3).

**Gap.** `posts.mjs` has no `flock` template. A hand-written post leaves every
guard behind (POSTING.md §4.3). Build the template before leaning on this format
(§8.3).

### 2.6 Somebody else's headline, counted — rank 6

**Analogue.** Downdetector on 12 Jun 2025, the largest outage day of the year:
"over 100K reports" plus a chart — ~21.6K views `[VIEWS]`. A number with no
argument attached travels modestly even on its best day; the reach belongs to
the story.

**Constraint.** Headlines verbatim, skipped rather than rewritten when they trip
a guard; "their words, not ours"; one source is never rounded up to a plural.
For a new account's first week, skip single-sourced `top-news` items — the one at
02:22 UTC on 28 Sep was single-sourced and clamped mid-sentence `[REPO]`, a weak
first impression.

### 2.7 The calm day — rank 7

Lowest reach per post, and compulsory. @PenPizzaReport's quiet posts are what
make its loud ones believable (POSTING.md §2.1). Same words on a loud day and a
dull one; phrasing 2, the log entry, on the dullest.

### 2.8 The honesty post — rank 8

`degraded` tops the slate by priority and sits last here by reach. Post it when a
source goes dark — that is news about the instrument. Do not open a new account's
first week with the standing "markets has no frozen baseline yet" line: it is a
state, not an event, and it was the top of this morning's slate `[REPO]`.

**This is live in the pending publisher.** Its offline dry run at 03:20 UTC on
28 Sep picked `degraded` for both X and Bluesky, because it takes the
highest-ranked cleared kind and `degraded` has priority 5 `[REPO]`. Were the
secrets present, the first post the account ever made would be "DOOMCON is
degraded". Its same-kind rule (strictly under 48 hours, `post-daily.mjs:231`) then
rotates it with `drought` and `race`, so the standing state recurs every second
or third day, depending on how late the cron fires. For unattended posting, rank
`degraded` first only when a pillar is actually **dark**, not when it is merely
awaiting a baseline (§8.3).

### 2.9 Parked: the balance card — DOOMCON against BLISS

BLISS is the upside index: the same engine over science, medicine, access,
adoption and openness (BLISS.md). At 02:22 UTC on 28 Sep its composite was
**null** — awaiting a frozen baseline, the science pillar dark
(`openalex-ai-science` failed), 9 of 10 sources reporting `[REPO]`. When it
scores, "both numbers, computed identically, and today they disagree" (BLISS.md
§1) is a post nobody else in the category can make.

**Constraint.** Two tempo readings side by side. Never subtracted, summed or
netted into "good minus bad"; never "AI is N percent good". Until BLISS scores
there is no balance post and no remembered number.

---

## 3. The 30-day calendar — Mon 28 Sep to Tue 27 Oct 2026

### 3.1 The standing daily post

- **Every day, including Saturdays and calm days** (POSTING.md §3 rule 1).
- **13:00–16:00 UTC, the same hour each day** (§1.4). Once the publisher has its
  secrets, the head post goes out at 14:41 UTC on its own; until then, paste it
  from the newest slate on `/post-sheet.html`. The post prints its own reading
  time.
- **Head:** the default below, unless something of higher priority fired
  (level change, milestone, pillar spike). The publisher picks by slate rank and
  never repeats a kind inside 48 hours; the rotation below is the order to argue
  for when its selection rule is next revised.
- **What stays by hand even after automation:** reply 1, the three news kinds
  (`top-news`, `corroboration`, `developing` — `HAND_ONLY_KINDS` in
  `post-daily.mjs`), every hook in §3.2, and every reply.
- **Reply 1, by hand, within minutes:** the link to the page that holds the
  number — `/map.html` for drought, `/race.html` for race, `/flock/` for Flock.
- **A second post** only if something else fired, at least 3 hours later
  (`SLATE_SPACING_MS`); it is worth 0.625 of the first (§1.2).
- **Replies:** answer every substantive reply inside its 48 hours, with a receipt
  link. Follow back accounts that reply with data (§1.1).

| Day | Default head post | Reason |
|---|---|---|
| Mon | `race` | named people; forwardable with no context |
| Tue | `corroboration` → `developing` → `top-news`, else `daily` | best window of the week `[TIMING]` |
| Wed | `flock` once it exists, else `daily` | a second evergreen count |
| Thu | `drought`, after the Drought Monitor's 12:30 UTC release has been joined by a collect pass — check the map date in the post | a fresh number every week |
| Fri | `market-move` if ≥ 4 points, else `daily` | |
| Sat | `daily`, phrasing 2 | weakest day `[TIMING]`; spend nothing strong |
| Sun | `weekly` (fires Sundays with ≥ 2 readings in the week) | |

`drought` and `race` never run two days in a row (POSTING.md §3).

### 3.2 The hooks

Rules first. **Post after the event, with a UTC stamp, never before.** Hooks are
**posted by hand**; the publisher posts only the scheduled slate computed from
our own data — the news kinds are already excluded from it — because X's automation rules forbid automated
trend posting `[RULES]`. Anything hand-edited is re-run through
`findFutureViolation()` and `findUrlViolation()` before it is pasted.

| Date (UTC) | Event, and how sure the date is `[HOOKS]` | DOOMCON angle | Constraint and risk |
|---|---|---|---|
| **Mon 28 Sep**, 12:15 NET, backups to 4 Oct | Starship Flight 14, first operational Starlink V3 (verified) | none — daily only | Starlink V3 is not a compute satellite; the SpaceX/Nvidia compute prototypes are "early 2027". Conflating them is the hype error this index exists to refuse |
| **Tue 29 Sep**, 17:00 | OpenAI DevDay keynote, San Francisco (verified) | morning: whatever `corroboration` or `top-news` card the slate carries; afternoon slot: `daily` with the capability pillar number | NowCast smoothing runs over 12 observations, so one event rarely moves the composite within hours. Never imply the keynote moved it |
| **Wed 30 Sep** | Washington SB 6002: every ALPR-using agency registers with the Attorney General by 30 Sep (verified). Florida FDOT revoked ALPR permits on state right-of-way on 31 Aug, removal "within 30 days" (verified; the 30 Sep deadline is derived, probable) | state counts from `data/flock.json` `[REPO]`: Washington **2,006** Flock ALPR cameras as mapped in OpenStreetMap on 2026-09-26, in 31 of 39 counties; Florida **7,435**, in all 67 | needs the `flock` template or a guarded hand-post; qualifier verbatim; a county count is a count of mapping effort as much as of deployment (FLOCK.md §2) |
| **Wed 30 Sep – Wed 21 Oct** | PJM Reliability Backstop bidding window: 6,831 MW shortfall for 2028/29, cap $555/MW-day, results 2 Dec, docket ER26-3380 (Utility Dive, 3 Aug, verified; FERC approval not found — probable) | the compute pillar reading next to PJM's figure, PJM named | not a DOOMCON input: quote, never score |
| **Thu 1 Oct**, 12:30 | US Drought Monitor weekly map (verified) | `drought` refreshes once a collect pass joins the new map | the denominator line is never cropped |
| **Thu 1 Oct**, 18:18, 58-minute window, backup Fri 2 Oct | SpaceX Transporter-18 from Vandenberg, carrying Google Project Suncatcher's Planet-built prototype (SpaceX manifest; Google's 24 Sep post names Transporter-18 but gives no date and no TPU count) | the drought card, plus one sentence quoting Google's "up to eight times the solar power" claim as Google's — after deployment is confirmed on the webcast, with its UTC time | rideshares slip; never "launches today"; the four-TPU figure belongs to the press report, not to Google |
| **Sun 4 Oct** | — | `weekly`; Hacker News submission 1 (§4) | |
| **Tue 6 Oct**, 09:45 · **Wed 7 Oct** | Nobel Prize in Physics · Chemistry (Nobel Foundation dates via APA, 10 Sep, verified) | `race` on the day **only if** a laureate's work ties to a named lab on the board | no such laureate, no hook; nothing is pre-written |
| **Thu 8 Oct**, 12:30 | Drought Monitor | `drought` | |
| **Sun 11 Oct** | — | `weekly`; Hacker News submission 2 (§4) | |
| **Mon 12 Oct** | PJM "bring your own new capacity" large-load framework, requested effective date (Data Center Knowledge, verified; FERC action pending) | quote PJM or FERC; compute pillar reading | quote only |
| **Thu 15 Oct**, 12:30 | Drought Monitor | `drought` | |
| **Sun 18 Oct** | — | `weekly`; no launch — review week (§7) | |
| **Wed 21 Oct** | PJM backstop window closes | as 30 Sep | |
| **Thu 22 Oct**, 12:30 | Drought Monitor | `drought` | |
| **Sun 25 Oct** | — | `weekly`; Hacker News submission 3, if gated (§4) | |
| **Tue 27 Oct** onward | Hyperscaler Q3 earnings: Microsoft 27 Oct (one source; another says 28), Alphabet and Meta 28 Oct, Amazon 29 Oct — all probable until each investor-relations page confirms. GitHub Universe 28–29 Oct (verified) | `daily` with the compute pillar reading; quote any capex line with the company named | the index does not read balance sheets; schedule nothing against an unconfirmed date |
| **Undated** | Gemini 4 ("post-training"; "as soon as possible", Koray Kavukcuoglu, The Information's summit, 24 Sep); Grok 5 ("within 2026") | `race` and `market-move` fire on their own | `expected`, `coming`, `soon` are rejected by the guard; the market price is the only honest sentence |
| **Undated** | Senate Judiciary Crime and Counterterrorism subcommittee on Flock: the 23 Sep hearing "Always Watching"; an investigation opened in August; a subpoena hearing is possible, undated | see the sketch below | name the outlet before posting; if none can be named, drop the comparison. DeFlock owns this topic on HN |

Two sketches. Both pass `findFutureViolation()` and `findUrlViolation()` as
written here (checked 28 Sep), and **neither fits under 280 characters with the
75-character spelled Pages tail** — they fit only with `Arithmetic at doomcon dot
watch.` (32). That is the domain decision again, in miniature.

> The 23 Sep Senate hearing, per <outlet>, cited 120,000 cameras in Flock's
> network. OpenStreetMap contributors had mapped 115,608 as of 03:58 UTC, 26 Sep
> 2026. 948 of 3,235 US counties have none mapped, which is not the same as none.

232 characters before the tail. The outlet must be named before posting; if
none can be, drop the comparison. 115,608 is the worldwide mapped count; 258 of
them lie outside any US county (`data/flock.json` `totals`).

> Washington: 2,006 Flock ALPR cameras as mapped in OpenStreetMap on 2026-09-26,
> in 31 of 39 counties. Florida: 7,435, in all 67. A county with no pins is a
> county nobody has mapped. Counted at 03:58 UTC, 26 Sep 2026.

215 characters before the tail.

Out of the window: Data Center Watch's Q3 report, the EU AI Act omnibus's next
milestone (2 Dec), Microsoft Ignite (17–20 Nov), PJM backstop results (2 Dec).

---

## 4. The launch sequence

### 4.1 Gates — all true before the first submission

1. The X account exists and has posted the daily on at least five consecutive
   days, so a visitor arriving from a launch finds a live account to follow.
2. The `/map.html` drought figure agrees with the post (§2.4).
3. The lead page's `<title>` reads on its own, because HN wants the original
   title `[HN]`.
4. The operator is free for **six hours** after each submission to answer every
   comment. The pizzint.watch thread (101 points, 48 comments, 30 Jul 2025) was
   attacked on methodology — the Pentagon is not the whole apparatus, selection
   bias, AI-generated images with typos — and its creator never replied. The
   alpranalysis author answered each attack, conceded the OSM limits, and the
   thread held at 239 `[HN]`.
5. The first comment is written in advance (drafts below).

If gate 1 slips, move every date in §4.6 by a week. HN does not depend on X; the
follow does.

### 4.2 Hacker News — the one platform worth a deliberate attempt

**Rules** `[HN]`: Show HN is for something people can play with; blog posts,
sign-up pages, newsletters, lists and landing pages are excluded; the title
begins "Show HN"; use the original title and do not editorialise; never ask
anyone to vote or comment; do not use HN primarily for promotion. Moderators
downweight engagement gimmicks and flag topics that have "already had a lot of
discussion".

**Timing** `[HN]`: across 157K Show HN posts, 12:00 UTC is the best hour (12.2%
reach 30 points), 11:00–16:00 UTC stays above 10.5%, and weekends run 20–30%
better (Sunday 11.75%). A separate 23K-post analysis (Jun 2025) found Sunday
07:00–08:00 UTC best, 25.7 average votes against 18. **Submit Sundays at 12:00
UTC.**

| # | When | Type | Lead page | Exact title | Why here |
|---:|---|---|---|---|---|
| 1 | **Sun 4 Oct, 12:00 UTC** | ordinary submission — a measurement write-up is not a Show HN | `/exploits/` | `Exploit lag, in days: no AI-era acceleration is visible in this measurement` (75 characters: the page's own title without the site name). If the page title is first rewritten to stand alone: `Days from NVD publication to CISA KEV listing: no AI-era acceleration visible` (77) | a null result on a crowded topic, method on the page, built from two public-domain US government feeds; no overlap with DeFlock |
| 2 | **Sun 11 Oct, 12:00 UTC** | Show HN | `/flock/` | `Show HN: Flock ALPR cameras by US county, as mapped in OpenStreetMap` (68) | an interactive map plus a public JSON file qualifies as something to play with; a week after #1 so the site does not read as promotion |
| 3 | **Sun 25 Oct, 12:00 UTC** | Show HN | `/world`, only if it has shipped with the zero-mapped state visible in the map itself; otherwise the index | `Show HN: Datacentres by country, as mapped in OpenStreetMap` (59), or `Show HN: An AI activity index you can recompute from its published receipts` (75) | the second only once one command recomputes a receipt's score from its inputs — today `node collector/receipts.mjs` verifies the hash chain, which is not the same claim |

**Not submitted:** the homepage on its own — a landing page under the Show HN
rules.

**First comment for #1 (draft; the operator edits).** What `lag_days` is: whole
UTC days from a CVE record's NVD publication to its CISA KEV `dateAdded`. The
honest series keeps 719 of 1,726 entries; the medians are 6, 7, 10 and 8 days for
2023–2026, flat for four years; the compression happened between 2022 and 2023
(EXPLOITS.md §4, KEV catalogue 2026.09.25). What it is not: it does not show that
AI is not accelerating attacks — only that no acceleration is visible in this
measurement — and it measures time to *cataloguing*, not to exploitation. Both
feeds are linked; the page carries the method.

**First comment for #2 (draft).** Every figure counts what somebody has entered
into OpenStreetMap, not what exists. 948 of 3,235 counties have none mapped, and
the map shows that as its own state rather than as an empty county. Coverage
follows volunteers: credit DeFlock's contributors by name, since much of the
mapping is theirs. Vendor figures are stated, not reconciled. The attribution is
an ODbL condition. Then pre-answer the four attacks the alpranalysis thread drew
`[HN]`: OSM boundary quirks, staleness (the file is dated and rebuilt), "where is
the map" (it is the page), and "who does this empower" (it is a count of public
tags anyone can already query).

### 4.3 Reddit — read the rules first

No subreddit rule page could be read from this session: `www.reddit.com`,
`old.reddit.com`, `api.reddit.com`, a proxy and `web.archive.org` were all
blocked `[REDDIT]`. Everything below is secondary and must be re-read from each
sidebar by a human before anything is posted.

- **r/dataisbeautiful** is the only candidate: ~22M members; original content
  carries `[OC]` in the title and names the data source and the tool in a comment
  (probable). Title: `[OC] Days from a CVE record's publication to CISA listing it
  as exploited, 2022–2026`. It needs a static chart image exported from the
  exploits page. Post on **Tue 6 Oct**, and only if the methodological objections
  raised in HN thread #1 have been answered on the page itself.
- **r/privacy, r/singularity, r/artificial, r/datacenter, r/MachineLearning:**
  treat as hostile to self-promotion and gated by moderators until read.
  r/singularity's rule, from a search snippet: "Self-promotion/Advertisement
  posts will not be tolerated". Skip.
- Post from the operator's own aged account, never a fresh one, and never the
  same link to several subreddits on one day.

### 4.4 Product Hunt — skip

Verified rules `[PH]`: personal accounts only, company accounts prohibited; no
direct upvote requests; the day turns at 12:01 am PT; a relaunch only for a
significant iteration. From 2026 guides (probable): Featured placement is chosen
by editors, the first two to four hours of comments decide the day, and a real
launch is "a 6-week project". The audience is buyers of software, not the people
who screenshot an index. If it is ever attempted: name `DOOMCON`, tagline
`An AI activity index with a receipt for every reading`.

### 4.5 Lobsters — only with an invite

Invite-only; self-promotion under a quarter of one's stories and comments; the
on-topic test is computing `[LOB]`. The one fitting story is the engineering, not
the dashboard: `Publishing a public index as a hash chain of receipts`, tag
`show`. Not scheduled.

### 4.6 Day by day

| Date | Action |
|---|---|
| Mon 28 Sep – Sat 3 Oct | Operator: X account, Bluesky account. Daily posts begin (§3.1). Engineering: reconcile `/map.html`; optionally retitle `/exploits/`. First comments drafted |
| Thu 1 Oct | first fresh-map `drought` post; Transporter-18 sentence if deployment is confirmed |
| **Sun 4 Oct** | **HN #1** at 12:00 UTC; six hours of replies. Nothing on X points at the thread — that would be vote-seeking by another name |
| Tue 6 Oct | r/dataisbeautiful, if its gate holds |
| **Sun 11 Oct** | **HN #2** at 12:00 UTC; six hours of replies |
| Sun 18 Oct | no launch; the two-week review (§7.3) reorders the daily rotation |
| **Sun 25 Oct** | **HN #3**, if gated |

---

## 5. Free channels, ranked

Ranked by expected reach per hour of operator effort, for this account. Same text
across networks is fine; on X, **one account only** — X's rules forbid identical
content across accounts `[RULES]`. Every publisher must be a no-op when its secret
is absent, and must dedupe so a doubled CI run (GitHub's cron drift is
documented in `collect.yml`) cannot post twice — the pending X and Bluesky
publisher does both, through `data/posted.ndjson` and one post per channel per
UTC day. Threads and Mastodon would each be a third file in the same shape.

| Rank | Channel | One-line reason | Facts that set the build `[source]` |
|---:|---|---|---|
| 1 | **Bluesky** | free, no approval, the researchers and tech press are there, links are not penalised — a mirror with a clickable link, and already automated in the pending publisher | 10.4M mobile MAU in Jun 2026, −27.2% year on year (Similarweb via TechCrunch); app password auth; `bot` self-label; 300 graphemes; one embed type per post; external-card thumb ≤ 1,000,000 bytes; `createSession` 30 per 5 min and 300 a day, so persist the session. Post the `manual` variant `[BSKY]` |
| 2 | **Threads** | the only free channel with For-You-style algorithmic reach | 500M MAU (Meta, 16 Jun 2026); no pricing page (free, probable); no App Review for accounts holding a role on the app; 500 characters; image fetched from a public URL, which `public/cards/*.png` already is; 250 API posts per 24 h; long-lived token 60 days, refreshable after 24 h. No bot label exists — disclose in the bio `[THREADS]` |
| 3 | **Embeds** | no account, no platform risk, and each placement is a permanent impression | `/embed.html` is built and live (no script, no tracking, no cookies). `/badge.svg` from GROWTH.md move 02 is still a 404 `[REPO]` |
| 4 | **RSS and email** | the only channel that survives a platform change | `/feed.xml` is live `[REPO]`. Buttondown is free to 100 subscribers with its API on every plan; its RSS-to-email is +$9/month, so send from CI through the API instead — best paired with GROWTH.md move 03, "email when the level changes" `[MAIL]` |
| 5 | **Mastodon** | free and small, dense in infosec and academia | ~785K MAU (Mastodon, Feb 2026); mastodon.social: 500 characters, 4 media, 16,777,216-byte image cap; `bot` flag is "a visual indication only"; `Idempotency-Key` header on status posts `[MASTO]` |
| 6 | **Telegram channel** | owned broadcast, zero discovery | free Bot API; 4,096-character messages, photos ≤ 10 MB `[TG]` |
| 7 | **Discord webhook** | reaches only the servers that let it in | free; 2,000 characters; files by multipart `[DC]` |
| — | **LinkedIn** — skip | company-page posting is a vetted product with a screencast per use case; personal posting re-authorises by hand every 60 days and speaks as the operator, not as DOOMCON | `[LI]` |
| — | **Substack** — skip | no write API (the 2026 developer API is read-only); the RSS importer is a one-time migration | `[MAIL]` |

---

## 6. What we refuse

Each of these would lose the account, the audience's trust, or both. The first
five are the ones a growth script reaches for by default.

| Refused | Why it tempts | What it costs |
|---|---|---|
| **Engagement bait** — "reply with your p(doom)", "repost if…" | replies weigh 5.0 (§1.1) | since 16 Jul 2026, soliciting engagement three or more times removes an account from X's creator programme and refers it for suspension `[X-POLICY]`; and it is the register VOICE.md §4 bans |
| **Fake urgency** — `BREAKING`, the siren emoji, "watch this space", countdowns to nothing | the largest number in the research — 43M+ views for @PolymarketSport's "BREAKING" on 6 Aug 2025 — was earned by a false claim `[VIEWS]` | virality and accuracy are uncorrelated, and our moat is surviving the quote-post that asks "how did you compute that" (VOICE.md §1). The guard throws on the vocabulary; the register is on us |
| **Predictions** — any future tense, any level read as a probability | a forecast is the most shareable sentence there is | CONTRACT.md's level-naming rule; `assertNoFutureTense()` throws; WHO Phase 6 is the precedent (VOICE.md §1). One such sentence and DOOMCON is DoomBench with a better chart |
| **Buying followers or engagement** | a zero-follower account looks dead | platform manipulation, and self-defeating in the ranker's own terms: the cold-start slot applies only to authors with ≤ 1,000 followers (`ColdStartFollowerCap` `[ALG]`). A thousand bought followers spend the one boost a new account gets, on accounts that never copy a link |
| **Automated likes, replies, follows, quotes or mentions** | the default behaviour of every growth script | automated likes are prohibited; since 23 Feb 2026 self-serve apps reply only when summoned and cannot @mention non-participants; since 20 Apr 2026 quote posts, likes and follows are gone from self-serve `[RULES]`. Non-API automation is permanent suspension (X-STRATEGY.md §6.1) |
| Scraping or browsing X by automation | free data | permanent suspension (X-STRATEGY.md §6.1) |
| Paid amplification — affiliates, "paid partnership" quote-posts | Polymarket's affiliate @NewsWire_US was reported at 200M+ impressions a month (CJR, Mar 2026) `[VIEWS]` | buys the exact register we exist to be more credible than, with a disclosure label on every quote |
| Reply-guying large accounts with our number | Polymarket's odds replies under large accounts, a senator's among them, drew 17–21K each `[VIEWS]` | needs unsolicited @mentions — outside X-STRATEGY.md §5.2 and blocked on the API since 23 Feb 2026 |
| Automated trend posting, duplicate posts | rides whatever is trending | both forbidden by X's automation rules `[RULES]`; hooks are posted by hand (§3.2) |
| Editing a post past the guard | the console text is one word from better | the console text is guarded; the edit is not (POSTING.md §4.3). Re-run the two find functions |
| A quiet correction | embarrassment | POSTING.md §4.10: same prominence as the original, top of the next slate, with the receipt id |

---

## 7. Instrumentation and the weekly loop

### 7.1 What exists today

- **No analytics on the site.** The built `public/index.html` loads zero external
  scripts and no beacon (checked 28 Sep) `[REPO]`. GROWTH.md's baseline row,
  "Plausible installed", does not match the build.
- **GitHub Pages gives the site owner no access logs**, so referrers are
  unrecoverable after the fact.
- **Search Console is not verified**: no verification file or meta tag is in
  `public/` `[REPO]`.

### 7.2 Attribution without UTM tags

| Signal | What it answers | How | Cost |
|---|---|---|---|
| X post metrics at 48 h | which template and hour worked | views are public on every post; engagements and follows in the post's own analytics view; via the API, own posts are Owned Reads at $0.001 per resource (X-STRATEGY.md §4.1) | $0 by hand |
| Follower count, daily | whether any of it compounds | the X profile; Bluesky `app.bsky.actor.getProfile`, keyless | $0 |
| Bluesky per-post counts | same, second network | `public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed` returns `likeCount`, `repostCount`, `replyCount`, `quoteCount`, `bookmarkCount`, no key (checked 28 Sep against a public account) `[BSKY]` | $0, automatable through `fetch.mjs` |
| HN points and comments | launch outcome | the Algolia API, keyless — `x-surface.mjs` already calls it | $0 |
| Search Console | Google Search queries, impressions and clicks per page | operator verifies a URL-prefix property on the Pages URL. **It does not report referrers.** Use branded queries ("doomcon") week over week as the word-of-mouth proxy, and per-page clicks on `/exploits/` and `/flock/` after each launch. Full Google + AI-engine playbook: `docs/FINDABILITY.md` | $0 |
| One page per post | which post sent a visit | reply 1 always links the page that holds the number, a different page per template; a click through X's link shim arrives as referrer `t.co`, a typed spelled domain arrives with none | needs a counter |
| Referrers | who sent a visit | only a first-party counter on the site can see them. The operator's decision: a cookieless counter with no personal data on the site's pages, **never** on `/embed.html`, whose promise is no tracking and no cookies (`site/templates/embed.mjs`) | operator's choice |

### 7.3 The weekly review — Mondays, 30 minutes, by hand until a collector exists

1. For every post of the past seven days, log: the `id` from `posts.mjs`, the
   template kind, the phrasing index, the posted-at UTC time, and at 48 hours the
   views, replies, reposts, quotes, bookmarks and follows gained that day. The
   pending publisher already appends channel, remote post id, text, its sha256,
   UTC time and receipt id to `data/posted.ndjson`; key the review's numbers to
   that remote id (a sibling file such as `data/post-metrics.ndjson`), and log
   hand-posted items there by the same shape so both kinds are compared.
2. Compare templates by **median** views at 48 hours, never by the best post.
3. Change nothing on fewer than ten posts. After two weeks, reorder the §3.1
   rotation by the medians. After four, move the posting hour by two hours for a
   week and compare.
4. Audit the refusals: was any post edited in the console, and was it re-run
   through the guards? Is a correction owed?
5. Search Console: branded queries and per-page clicks, week over week.
6. Re-read `param.rs` (its git log) and the X pricing page. If either moved,
   update §0 and §1 of this file.

---

## 8. The checklist

### 8.1 Operator only — no agent does these

- [ ] **Create the DOOMCON X account** on a fresh handle. Bio: the X line of
      `BIO_GUIDANCE` in `collector/post-daily.mjs` ("Automated account managed by
      @HUMAN_HANDLE…"). Link the managing account under Settings › Your account ›
      Account information › Automation. The Automated label is still marked "in
      testing" and does not always render; the bio disclosure and the
      managing-account link are the parts that can be guaranteed `[RULES]`.
- [ ] **Create the X developer app**, signed in *as DOOMCON*, at console.x.com.
      Paste `X_USE_CASE` from `collector/post-daily.mjs` as the use case — the
      description is binding, and that text matches what the code does. Set OAuth
      1.0a permissions to Read and write and the type to Automated App / Bot, then
      **regenerate the Access Token** — tokens made before the change stay
      read-only. Buy credits and set a spending limit, for example $5 per billing
      cycle `[STAFF]`.
- [ ] **Add the X values as GitHub repository secrets, under the names the code
      reads** (`X_ENV` in `collector/post-x.mjs`): `X_API_KEY`, `X_API_SECRET`,
      `X_ACCESS_TOKEN`, `X_ACCESS_SECRET`. Never in the repo, never in a chat,
      never to an agent.
- [ ] **Bluesky:** create the account, set the `bot` self-label, use the Bluesky
      line of `BIO_GUIDANCE`, create an app password, and add `BSKY_HANDLE` and
      `BSKY_APP_PASSWORD` as secrets (`BSKY_ENV` in `collector/post-bluesky.mjs`).
- [ ] **Before the first live run:** trigger `post-daily` by hand with
      `dry_run: true` and read the pick (§2.8).
- [ ] **Register `doomcon.watch`**, or decide not to. The day it resolves,
      `DOMAIN` and `CANONICAL_URL` in `site/brand.mjs` change — two lines — and
      every post gets back 42 characters (POSTING.md §1).
- [ ] Tell an agent the handle, so `X_HANDLE` in `site/brand.mjs` stops being
      `null`.
- [ ] Decide on X Premium. Buffer measured ≈ 10× the reach of regular accounts
      `[BUF-LINK]`; Original Content Rewards requires Premium, 500 verified
      followers and 500K verified impressions in 90 days `[X-POLICY]`. Its price
      was not researched here.
- [ ] Threads (optional): a Meta app with the Threads use case, own account as a
      tester, a long-lived token as a secret.
- [ ] Mastodon (optional): account, `bot` flag, a token from Settings ›
      Development as a secret.
- [ ] Verify the Pages URL in Google Search Console.
- [ ] Decide on a cookieless counter for the site's pages (not the embed).
- [ ] Hacker News: an account in good standing; six clear hours after each
      submission.
- [ ] Reddit: read each sidebar before any post.
- [ ] **Every day, by hand:** reply 1 under the head post, the news-kind posts
      worth sending, and the replies. Until the secrets exist, the head post too,
      at 13:00–16:00 UTC.

### 8.2 Already built — verified 28 Sep 2026

- [x] `collector/posts.mjs`: fourteen templates; guards that throw on a URL, on
      future tense, on a missing UTC stamp and past 280 characters; two variants;
      deterministic phrasing; `--test` self-test.
- [x] Cards: `collector/card.mjs` and `collector/cards/` (level, race, drought,
      developing, map) → `public/cards/*.png`, domain and receipt id burned in;
      `site/cardpng.mjs` renders them in-process for the publisher.
- [x] `/post-sheet.html`, rebuilt on every CI run (HTTP 200).
- [x] **The publisher, uncommitted, from a parallel workflow:**
      `collector/post-daily.mjs` (selection, one post per channel per UTC day,
      20-hour minimum gap, 6-hour staleness refusal, ledger), `post-x.mjs`
      (OAuth 1.0a HMAC-SHA1, media upload, create post), `post-bluesky.mjs`
      (session, blob, link card), `.github/workflows/post-daily.yml` (14:41 UTC,
      manual dry-run dispatch, exits green without secrets), documented in
      POSTING.md §6. Dry run and 18/18 selftest verified offline at 03:20–03:22
      UTC with the network disabled and the repo read-only.
- [x] The drought join is live again: 1,171 of 1,877 at D1 or worse, USDM map of
      22 Sep, 286 counties joined `[REPO]`. POSTING.md §2.2's "does not fire" is
      stale.
- [x] Pages worth launching, all HTTP 200 at 03:05 UTC: `/exploits/`, `/flock/`,
      `/race.html`, `/map.html`, `/embed.html`, `/feed.xml`, `/api/state.json`.
- [x] Receipt chain verification: `node collector/receipts.mjs` (75 receipts in
      `data/receipts/`).
- [x] `collector/x-surface.mjs`: reads X for free through oEmbed; posts nothing.

### 8.3 Engineering, not yet done — none of it started in this session

- [ ] **Land the publisher:** review and commit it with POSTING.md §6, which its
      selftest checks (18 of 18 at 03:22 UTC); the workflow will not post past a
      failing selftest.
- [ ] **Amend CONTRACT.md hard constraint 3** to "secrets exist only as GitHub
      Actions secrets; every publisher is a no-op without its secret". Until it
      is amended, the publisher contradicts the contract it was built against.
- [ ] **CONTRACT.md rule 5:** `post-x.mjs` makes one direct `fetch()` per request
      because `collector/fetch.mjs` has no request-body option and retries in a
      way that could double-charge a paid write (`post-x.mjs:35–42`). Either the
      contract grants that exception in writing, or `fetch.mjs` grows a `body`
      and a no-retry mode.
- [ ] **Publisher selection:** rank `degraded` first for unattended posting only
      when a pillar is dark, not while one is merely awaiting a baseline (§2.8);
      argue for the §3.1 rotation.
- [ ] `posts.mjs`: `--variant=manual` is read as the state path (`argv[0]`) and
      throws `ENOENT`, so the command POSTING.md §1 and §5 document fails.
- [ ] `posts.mjs`: anchor `schedule()`'s `suggested_at` to the next 13:00–16:00
      UTC window instead of the build time, and change `reach_note` from "about
      half" to 0.625.
- [ ] `posts.mjs`: a `flock` template — state and county counts,
      `headline_qualifier` verbatim, `never_say` enforced.
- [ ] `posts.mjs`: skip a market whose question does not fit, rather than clip it.
- [ ] `/map.html` and `collector/cards/drought.png`: count D1 or worse, as the
      post does (1,171 and 62.4%, not 1,350 and 71.9%).
- [ ] `/exploits/`: a `<title>` that reads on its own, for HN.
- [ ] A phone alert when the level changes, or the 90-minute window passes
      unseen.
- [ ] `/badge.svg` (GROWTH.md move 02).
- [ ] A keyless Bluesky and HN metrics collector that fills the weekly review.
- [ ] Corrections for other files' owners: X-STRATEGY §5.3 ("half, then a
      quarter" → 0.625 and 0.4375; "worth 40 likes" → a weight ratio, not an
      exchange rate); X-STRATEGY §0 (a card post costs ≈ $0.030, not $0.015);
      POSTING §1 (it still tells a hand-poster to use the linked variant, while
      §6 now sends X the link-free one — align §1 to §6 for anything pasted on
      X); POSTING §2.2 (drought fires again); POSTING §6.1 ("the 02:00 UTC
      build" — the index now re-reads hourly); GROWTH's baseline table (no
      analytics in the build).

---

## 9. Sources

| Tag | What | Read |
|---|---|---|
| `[REPO]` | this repo's `data/*.json`, `public/`, `.github/workflows/`, `collector/`, and live HTTP checks against the Pages site; every figure is stamped with its file's `generated_at` or the check time | 2026-09-28, 02:22–03:05 UTC |
| `[ALG]` | `github.com/xai-org/x-algorithm` at `4c5cfe8f`: `home-mixer/params/param.rs`, `home-mixer/params/config.rs`, `home-mixer/candidate_pipeline/phoenix_candidate_pipeline.rs`, `home-mixer/filters/oon_retweet_reply_filter.rs`, `home-mixer/scorers/author_cold_start.rs`, `vm-ranker/params.rs`, `xai-value-model/scoring.rs`, `xai-value-model/weights.rs` (Apache-2.0) | re-read 2026-09-28 |
| `[ALG-LOG]` | commit history of `param.rs`, and the hjosugi/xalgo change log (dwell 0 → 0.05, video open 0.05 → 0.07 on 2026-09-03) | research sweep, 2026-09-27 |
| `[PRICE]` | `docs.x.com/x-api/getting-started/pricing`: Post: Create $0.015; with URL $0.200; summoned $0.010; Owned Reads $0.001 | 2026-09-23 (X-STRATEGY §4.1), re-read 2026-09-27 |
| `[STAFF]` | X developer-forum staff statements: the URL surcharge fires only on a URL in the text; each uploaded media object records a PostCreate event; legacy Free/Basic/Pro deprecated. Plus `docs.x.com` media-upload and OAuth pages | research sweep, 2026-09-27 |
| `[RULES]` | X automation rules and developer policy (April 2026 update; the 23 Feb and 20 Apr 2026 self-serve changes), `help.x.com` automated-account label | research sweep via a browser, 2026-09-27; X-STRATEGY §5.2 |
| `[X-POLICY]` | X creator-programme changes announced by Nikita Bier (16 Jul 2026); Original Content Rewards criteria (from 8 Sep 2026) | research sweep, 2026-09-27 |
| `[BUF-LINK]` | Buffer link study, 18.8M posts from 71K accounts, Oct 2025 | research sweep, 2026-09-27 |
| `[BUF-FMT]` | Buffer 2026 social report, Mar 2026 | research sweep, 2026-09-27 |
| `[TIMING]` | Buffer (8.7M posts); Sprout Social (~2B engagements, Nov 2025–Feb 2026); OpenTweet (50K tweets, Jan–Apr 2026, vendor) | research sweep, 2026-09-27 |
| `[VIEWS]` | per-post view counts for Epoch AI, Kalshi, Artificial Analysis, METR, @PenPizzaReport, Polymarket, Downdetector — search-engine snapshots of x.com, post text confirmed through X's keyless oEmbed; CJR (Mar 2026); MIT Technology Review (5 Feb 2026); follower history from COMPETITIVE.md | research sweep, 2026-09-27 — **not independently reproducible** |
| `[HN]` | `news.ycombinator.com/showhn.html`, `newsguidelines.html`, moderator comments, `hn.algolia.com` thread scores; the 157K Show HN study and the 23K-post timing analysis | research sweep, 2026-09-27 |
| `[REDDIT]` | secondary only; every primary route blocked | research sweep, 2026-09-27 — **unverified** |
| `[PH]` | `producthunt.com/launch` (verified); 2026 launch guides (probable) | research sweep, 2026-09-27 |
| `[LOB]` | `lobste.rs/about`, `lobste.rs/t/show` | research sweep, 2026-09-27 |
| `[BSKY]` | `docs.bsky.app` and the lexicon; Similarweb via TechCrunch (11 Aug 2026); Jay Graber on links (19 Nov 2024); a keyless `getAuthorFeed` call | research sweep 2026-09-27; field names re-checked 2026-09-28 |
| `[THREADS]` | Meta's Threads API documentation; Meta newsroom, 16 Jun 2026 | research sweep, 2026-09-27 |
| `[MASTO]` | `docs.joinmastodon.org`; mastodon.social's live instance configuration; Mastodon's own user count, Feb 2026 | research sweep, 2026-09-27 |
| `[TG]` `[DC]` `[LI]` `[MAIL]` | Telegram Bot API; Discord webhook documentation; LinkedIn Community Management and Share on LinkedIn documentation; Buttondown pricing and API pages; Substack developer API | research sweep, 2026-09-27 |
| `[HOOKS]` | Wikipedia "Starship flight 14"; `devday.openai.com`; MRSC (WA SB 6002); WUSF/WLRN (FDOT memo); Utility Dive, 3 Aug 2026 (PJM backstop); Data Center Knowledge (PJM framework); SpaceX launch page and Google's 24 Sep post (Transporter-18); `droughtmonitor.unl.edu`; Nobel dates via APA, 10 Sep; The Information summit coverage, 24 Sep; hyperscaler earnings trackers | research sweep, 2026-09-27; each row states verified or probable |
| `[CONTRACT]` | `docs/CONTRACT.md` anti-flap layers and post rules | this repo |
