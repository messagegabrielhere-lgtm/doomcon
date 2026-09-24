# Visitors — 100 people, two sites, one ranked list

The brief: *"pretend you are 100 random people visiting this site and
pizzint.watch — what would you like more?"*

This file answers it by measurement rather than by imagination. Everything
below was taken from the two live sites on **2026-09-23/24**, at **375×812**
and at desktop width, with a real browser, plus the served HTML fetched
directly. Where a claim is inferred rather than observed it says so.

It is deliberately **not** a second copy of `docs/ENGAGEMENT.md`. That file
measured the two pages as artefacts — atom counts, scroll heights, animation
inventories — and produced a fifteen-item change list. This file measures the
same two pages against **people with errands**, and it disagrees with
`ENGAGEMENT.md` in two places, both flagged inline. Where the two agree, that
is corroboration and is marked `[E#n]` against the item it agrees with.

---

## 0. What was actually done

| Step | Method |
|---|---|
| Read the rendered pizzint DOM | browser at 375×812, five panels opened by hand, accessibility tree read |
| Read our rendered DOM | same viewport, same session, three scroll depths captured |
| Read both served HTMLs | `curl` + tag-strip, so "what a crawler and a pre-hydration screenshot see" is separable from "what a browser shows" |
| Our three pages | `/` (181,104 B), `race.html` (89,563 B), `news.html` (436,760 B) |
| Persona grounding | population-level polling, cited in §1, not invented |

**Two things broke during the visit and belong up front.**

1. `https://messagegabrielhere-lgtm.github.io/doomcon/race/` returns **HTTP
   404**. The page is at `race.html`. Internal links use the working form, so
   nothing on-site is broken — but the brief itself, every hand-typed guess and
   every verbal share ("it's slash race") lands on a 404.
2. The fold prints `— no prior observation to compare` while *Recent moves*,
   two screens down in the same build, prints `Score 40.8 → 40.7 · −0.1`.
   Cause, located: `direction()` in `site/templates/index.mjs:399` is driven by
   `ctx.vsYesterday`, which is null because the record is three observations
   old. `data/state.json` carries `delta_from_previous: -0.1284` the whole
   time. The delta is not missing. The *chosen comparison* is missing, and the
   fold reports that as an absence of information. Every persona below whose
   first question is about the current reading or its movement — clusters A,
   B, D and K, **45 of the 100** — hits that string first.

---

## 1. Who actually arrives, and why these 100

The persona mix is not a vibe. It is built from three grounded inputs.

**Population priors.** Pew's June 2025 survey has **50% of US adults more
concerned than excited** about AI in daily life, against 10% more excited and
38% equally both. YouGov's 2026 wave has **half** of 18,238 US adults "very"
(23%) or "somewhat" (27%) concerned that AI causes the end of the human race,
up from 43% in June 2025 and 37% in March 2025. So the modal arrival is not a
researcher and not a doomer — it is an ordinary anxious person, and the largest
single cluster below reflects that.

**Cultural prior.** The Terminator franchise is the default mental model the
audience brings; the academic framing literature is blunt that a technology
pre-loaded with cinematic apocalypse gets judged on precedent rather than on
measured behaviour. That is a *problem statement for our copy*, not a licence
to lean on it: our number is a tempo measurement, and the visitor arriving with
Skynet in their head is the single visitor most likely to misread it. See
`docs/VOICE.md` §1 and the WHO Phase-6 precedent.

**Structural prior.** `docs/TEARDOWN.md` §2.3 measured pizzint's traffic shape:
997 of 1,018 sitemap URLs are auto-generated briefs, the dashboard is one URL,
and the growth event of record was a single screenshot on X (2025-06-12). So
arrivals split into *one viral spike channel* and *a long search tail*. We have
**7 sitemap URLs**. We have the spike channel and essentially no tail, which
determines which clusters can even exist for us today.

---

## 2. The hundred, in twelve clusters

Each cluster carries: how many of the 100, where they came from, the first
question in their head, a time budget in seconds, the single thing that makes
them stay, the single thing that makes them leave, and named exemplars.

---

### A · The screenshot clicker — 16 of 100

**Provenance:** saw a cropped image of a number in a quote-tweet, tapped it on
a phone, on mobile data, one-handed.
**First question:** *"What is the number right now, and is that high?"*
**Budget:** 4–8 seconds. This is the shortest budget of any cluster and the
largest cluster.
**Stays if:** the number and its scale are legible without a scroll and without
a tap. **Leaves if:** anything above the number is chrome.

Exemplars: *Dani, 26, saw @AISafetyMemes crop our gauge; Marcus, 41, got it
forwarded in a group chat with "lol what"; Priya, 33, tapped through from a
screenshot with the caption "this is real".*

**pizzint wins.** Their fold at 375px, measured: flag, clock `22:50:35`,
`8 LOC`, two nav chips, `MKT: CLOSED | 10h 39m`, wordmark, `Intel by the
Slice`, `Powered by [Polymarket]`, `Support the Site`, then the badge —
`DOUGHCON 5 / FADE OUT • LOWEST STATE OF READINESS` — inside a green outlined
box with an `(i)` affordance, at roughly 30% viewport height. Three facts in
one glance: a rank, a codeword, a translation.

**We lose on ordering, not on content.** Our 375px fold, in order: wordmark,
`Nobody knows the odds. We keep count.`, five nav links, `14/14 REPORTING 5
SCORED 16 FEEDS 200 ITEMS 3 RECEIPTS STATUS: OPERATIONAL`, a one-line ticker
clipped mid-word (`…opt out of having their "visual da`), `OBSERVED 2026-09-24
00:04:49 UTC`, then the numeral. The badge itself is *better* than theirs —
`DOOMCON 4 · ROUTINE` + `NEEDLE BREATHING` + five pips + `Activity within the
normal range of the record.` is a four-layer version of their three-layer move.
It just arrives after seven rows of apparatus.

**What this cluster would like more:** the number higher, and `40.7` carrying
its own direction. They do not read `/ 100`. They read big-number-colour-word.

---

### B · The frightened civilian — 13 of 100

**Provenance:** read a headline this morning; searched something like *"is AI
dangerous right now"*; or was sent the link by the person in cluster A.
**First question:** *"Should I be worried today?"*
**Budget:** 20–40 seconds, and emotionally loaded.
**Stays if:** something answers the worry question in plain words.
**Leaves if:** the page either performs alarm or refuses to engage at all.

Exemplars: *Susan, 58, whose son works in logistics; Tom, 34, who watched a
clip about drone autonomy at 1am; Amara, 45, a teacher who was asked by a
student and did not know what to say.*

**Nobody wins this cluster. It is the biggest hole on both sites.**

pizzint deflects with a joke — `Always monitor the pizzas responsibly. 🍕` —
and with `Data correlation does not imply causation`. We deflect with rigour:
`DOOMCON measures how much is happening, not how bad it is. Levels describe
observable activity tempo against this index's own record. They are not a
probability of harm.` That sentence is correct, it is the moat, and to this
reader it parses as *"we will not answer your question."*

The honest answer for this person exists in our data and is not on the page:
**today is ordinary.** `ROUTINE`, mid-band, `Activity within the normal range
of the record.` We have the calm answer and we bury it under a 0–100 gauge, a
frozen reference distribution curve and a three-point history chart.

**What this cluster would like more:** one plain sentence, at the top, in the
second person, that says what the reading is *not*. It costs nothing and it
does not cross the line in `VOICE.md` §1, because "the needle is in the normal
band of our own record" is a statement about the needle.

---

### C · The ML practitioner — 10 of 100

**Provenance:** works at a lab, a startup or a research group; someone posted
it in a work Slack.
**First question:** *"What are the inputs, and are they any good?"*
**Budget:** 60–120 seconds, then either a tab-close or a bookmark.
**Stays if:** the source list is real and the failure modes are visible.
**Leaves if:** the inputs turn out to be one RSS feed with a coat of paint.

Exemplars: *a Bay Area inference engineer; a PhD student who reads
hf-daily-papers every morning anyway; an MLOps lead who wants to know if the
GitHub-release counting is naïve.*

**We win outright, and it is not close.** `Score 53.5 = source weight 20.0 +
corroboration 12.5 + recency 10.6 + engagement 10.4` is a formula printed under
its own output. `×2 carried by 2 independent sources`. The per-source strip:
`● arxiv 0s live`, `◇ github-releases no baseline · no read`, `◐ wikipedia
stale · 24h`. On `/race`, the legend of six blank-cell meanings — `no market`,
`no ref`, `not used`, `DARK`, `too thin`, `0`, with *"This is the only one of
the six that is a measurement"* — is the single best-written thing on either
site.

pizzint's equivalent is `POPULAR TIMES ANALYSIS` over six venues of which four
read `NO DATA`, under a confident `DOUGHCON 5`.

**The one thing that loses them:** `3 scored observations so far.` and `3
RECEIPTS` in the masthead. A practitioner reads that as *the instrument was
switched on this afternoon*, which it was. Nothing dishonest about it; it is
just the least flattering true fact we own and we have put it in two places
above the fold.

---

### D · The trader and the analyst — 9 of 100

**Provenance:** Polymarket, Kalshi, an AI-exposure equity book, or a macro
newsletter.
**First question:** *"Is there a number here I can trade against, and how stale
is it?"*
**Budget:** 45–90 seconds, and they will check the timestamp before anything
else.
**Stays if:** freshness is explicit and the underlying market is named.
**Leaves if:** the number is a composite of things they cannot decompose.

Exemplars: *a crypto-native who trades the negRisk legs; a hedge-fund junior
building an AI-capex tracker; a retail options trader who follows CoreWeave.*

**We win, on `/race`, and most of them never see it.** `Ranking market: Which
company has best AI model end of 2026? · Resolves 2026-12-31 · Behind it $1.40M
across 15 legs · Cross-check Kalshi 12 contracts, 387k` is exactly the header a
trader wants, and *"Their prices sum to 1.0400 rather than to 1.0000 — that
spread is the bid/ask on $1.40M of lifetime volume"* is a sentence that buys
enormous credibility for one line of arithmetic. The refusal to blend
probability with shipping into a composite — *"A blend would need weights no
one can check against an outcome"* — is the correct call and they will notice.

**pizzint wins on placement.** Their Polymarket ticker is on the fold, crawling
(`Will the upper bound of the target federal funds rate be 4.25% at the end of
2026`), each item priced with a 24h move, and every venue card carries a
matched market. We put our market page behind a link card at the very bottom
labelled `The AI race / Anthropic leads at 73.5%`, below roughly 8,700px of
mobile scroll.

**What this cluster would like more:** `Anthropic 73.5%` on the homepage fold,
as a number, with the market named. We already compute it every build.

---

### E · The journalist on deadline — 6 of 100

**Provenance:** writing an AI piece, needs a citable, dated, non-embarrassing
figure in the next twenty minutes.
**First question:** *"Can I cite this without my editor asking who made it?"*
**Budget:** 90 seconds to decide, then 10 minutes if it passes.
**Stays if:** there is a method page, a stable URL and a dated number.
**Leaves if:** the method is four bullets of nouns.

Exemplars: *a Verge stringer; a trade-press reporter on the energy beat; a
local-TV producer who needs one graphic.*

**We win on substance.** `methodology.html`, hash-chained receipts, `Every
point on this line is written to a hash-chained receipt carrying its full
inputs.` pizzint's `/about` is, measured in `TEARDOWN.md` §3.2, four bullets —
"spike detection algorithms", "pattern correlation" — with no formula and a
`FAQPage` claim of ten-minute updates against a status endpoint reporting two
successful scrapes in 24 hours.

**We lose on citability.** A journalist needs *"X as of Y"* where Y is not
today's first day. `3 scored observations` is not citable. The `/watts` page in
`docs/SUB-INDICES.md` §3 — the one described there as *"the page a journalist
cites"* — does not exist yet. This cluster is the one the energy sub-index in
§4 below actually unlocks.

---

### F · The policy staffer — 5 of 100

**Provenance:** a committee office, a regulator, an AI-governance NGO; someone
forwarded it with "is this useful for the briefing".
**First question:** *"Is the governance pillar measuring real instruments?"*
**Budget:** 2–4 minutes. The longest budget of any cluster.
**Stays if:** the regulatory sources are named and jurisdictional.
**Leaves if:** governance turns out to mean "news about regulation".

Exemplars: *a Senate committee staffer; a DSIT analyst in London; a
Brussels-based policy fellow.*

**We win and we under-sell it.** `federal-register` and `govuk` as named
sources, `◆ Governance 53.2 · Paperwork with the force of law. · 1/2 SCORED · 1
AWAITING BASELINE · 60TH PCTL` is a better-built pillar than anything pizzint
has. But the pillar card is the *fourth* of five, roughly 6,000px down on
mobile, and the fact that governance is currently **the loudest pillar** is
printed once, in grey, in a caption: `Governance leads at 53.2. Markets is
awaiting a baseline.`

**What this cluster would like more:** "which pillar is loudest" promoted to a
fact rather than a caption, and a per-pillar permalink they can send.

---

### G · The doomer — 7 of 100

**Provenance:** LessWrong, EA Forum, an x-risk Discord; arrived because someone
said "a doom index that actually computes something".
**First question:** *"Does this take the risk seriously, or is it a joke
account?"*
**Budget:** 2–3 minutes, adversarial but hopeful.
**Stays if:** the epistemics are visible. **Leaves if:** the number is vibes.

Exemplars: *an alignment researcher who has a p(doom) and hates being asked
for it; a forum regular who screenshots methodology sections; an AI-safety
grantee.*

**We win on exactly one sentence,** and it is the best line on the site:
*"Everyone has a p(doom). Nobody has a receipt."* (`VOICE.md` §5). The
distinction between `dark`, `awaiting baseline` and `live` is the thing this
cluster has been waiting for someone to make.

**The risk with them is the opposite of the usual one.** They may read `tempo,
not probability` as a dodge. The answer is not to soften it — it is `/bliss`
and `/nothing` (`SUB-INDICES.md` §4, §5), because an index that keeps score
against its own side is the only kind this cluster fully trusts. Neither page
exists.

---

### H · The accelerationist — 6 of 100

**Provenance:** e/acc-adjacent X, a founder Slack; arrived to dunk.
**First question:** *"Is this doomer propaganda with a number stapled on?"*
**Budget:** 15–30 seconds, hostile.
**Stays if:** the page pre-empts the accusation.
**Leaves if:** the framing is one-directional.

Exemplars: *a seed-stage founder; a GPU-cloud sales engineer; an anon with a
lightning bolt in the handle.*

**Nobody serves them, and we are one page from owning them.** `DOOMCON` as a
name is a hostile signal to this cluster; `Activity within the normal range of
the record` is the disarming one, and `/bliss` — same machinery, opposite
direction — would flip the entire cluster in a single click. It does not exist.
pizzint's analogue, `Status: Nothing Ever Happens`, is precisely this move, and
it is why their skeptic audience is real.

---

### I · The Hacker News flaw-hunter — 8 of 100

**Provenance:** a Show HN or a comment thread; here to find the crack.
**First question:** *"Where does this fall over?"*
**Budget:** 3–5 minutes of genuine reading, then a comment either way.
**Stays if:** the page has already found its own flaw and printed it.
**Leaves if:** it has to be dug out.

Exemplars: *the person who checks `robots.txt` first; the one who will diff two
builds; the one who reads the JSON API before the HTML.*

**We win, decisively, and this is the cluster most likely to convert into
distribution.** *"Floor, not a count. The published vocabulary matches 'Meta
AI' but not the bare token 'Meta', because 'meta-learning' and 'meta-analysis'
would match it in a corpus that is mostly ML preprints."* — that paragraph is
worth more than any animation on either site. Likewise: *"The window is 200
items spanning 43.8 hours, not the nominal 7 days: the corpus is capped at 200
items and on a busy week the cap binds long before the window does."*

**The two things they will post about:**
- `STATUS: OPERATIONAL` in our masthead, next to `5 SCORED` of 14. It is the
  exact string `ENGAGEMENT.md` §6.4 identifies as the thing we must never
  become, and we ship it. It is defensible — every source *is* reporting — and
  it will still be the top comment. `[E#6]`
- The reel and the feed. `Today's signal` cards 01–08 are, item for item and in
  the same order, feed rows 01–08: *JEV-as-a-Judge, Flash-dLLM, Agensh, The
  Tasteful Agent, Microsoft disrupts…, RULER, Court docs: OpenAI…, Stripe's
  Knowledge AI Platform.* Two screens of a mobile page are a verbatim
  duplicate, dressed differently.

---

### J · The Terminator kid — 8 of 100

**Provenance:** a TikTok or YouTube Short about AI taking over; searched
something like "AI danger level right now"; aged 14–22.
**First question:** *"How close are we?"*
**Budget:** 10–20 seconds, then a share or a bounce.
**Stays if:** there is something to look at and something to send.
**Leaves if:** it reads like homework.

Exemplars: *a 16-year-old who watched the Skynet scene on a Short; a first-year
CS student; someone who follows three AI meme accounts.*

**pizzint wins this cluster completely, and it is the cluster the operator's
brief is about.** They win with faces and games: a `Pete Hegseth` portrait as
the seventh switcher button, `PETE-ZA: SLICE CONTROL — Leaderboard now
available!`, a `Trump speaking into microphone` image in the timeline, seven
48px icon tiles (pizza slice, radar, martini, dancer, map, car, face), day tabs
`S M T W T F S`, and `GAY BAR REPORT` set as its own wordmark with its own
venue cards.

We have exactly one visual toy on the homepage and it is a normal distribution
curve.

**The trap.** This cluster is the one that arrives with Skynet already in their
head. Everything built for them must carry the tempo framing in the same
breath, or we have built the Frankenstein-complex machine that the framing
literature (and `VOICE.md` §1) says is the failure mode.

---

### K · The returner — 7 of 100

**Provenance:** was here before. Bookmarked it, or has it in a tab group.
**First question:** *"What changed since I looked?"*
**Budget:** 5 seconds, repeated daily. The most valuable cluster in the file.
**Stays if:** the delta is the first thing on screen.
**Leaves permanently if:** two visits in a row look identical.

Exemplars: *someone who checks it with coffee; a person who added it to a
morning tab group; the operator's own friend who was told to keep an eye on
it.*

**Neither site serves them, and neither site even tries.** `ENGAGEMENT.md`
§2.1 measured it: **0 localStorage keys carrying return state**, on both sites.
Nothing on either page knows you have been here before.

And for us specifically the fold currently says `— no prior observation to
compare` — the exact opposite of what this cluster came for, while
`delta_from_previous: -0.1284` sits in `state.json` unrendered. `[E#1]`

---

### L · The builder — 5 of 100

**Provenance:** wants the JSON, or wants to put the badge in their own page.
**First question:** *"Is there an API, and may I embed this?"*
**Budget:** 30 seconds to find the link, then as long as it takes.
**Stays if:** `API` is in the nav. **Leaves if:** it is a contact form.

Exemplars: *a dashboard hobbyist; someone building an AI-news Discord bot; a
newsletter author who wants a live figure in their template.*

**We win by default and we should say so much louder.** `API` is in our nav;
`public/embed.html` exists; `api/race.json` is linked from the method section.
`TEARDOWN.md` §4 measured that **not one** competitor — pizzint included —
ships an embeddable widget or a public JSON API; `/embed` and `/widget` 404 on
all of them. We are the only site in the category with either, and the word
"embed" appears nowhere on our homepage.

---

## 3. The scoreboard

"Served well" means: the cluster's first question is answered inside its stated
time budget, without a scroll on mobile for budgets under 10s.

| Cluster | n | pizzint | DOOMCON | Who wins |
|---|---|---|---|---|
| A screenshot clicker | 16 | **served** | partly | pizzint |
| B frightened civilian | 13 | no | no | **nobody** |
| C ML practitioner | 10 | no | **served** | DOOMCON |
| D trader/analyst | 9 | partly | partly (`/race`, buried) | pizzint on placement |
| E journalist | 6 | no | partly | DOOMCON |
| F policy staffer | 5 | no | **served** | DOOMCON |
| G doomer | 7 | no | partly | DOOMCON |
| H accelerationist | 6 | partly (`Nothing Ever Happens`) | no | pizzint |
| I HN flaw-hunter | 8 | no | **served** | DOOMCON |
| J Terminator kid | 8 | **served** | no | pizzint |
| K returner | 7 | no | no | **nobody** |
| L builder | 5 | no | **served** | DOOMCON |

**Totals.** Served well today: **pizzint 24 of 100** (A 16, J 8), **DOOMCON 28
of 100** (C 10, F 5, I 8, L 5). Partly served: pizzint 15, us 35. Served by
neither: **20 of 100** — clusters B and K entire.

Three conclusions, in order of importance.

1. **The two largest unserved clusters are B (13) and K (7) — 20 people, and
   they are the two cheapest to serve.** B needs one sentence. K needs one
   `localStorage` key and one line of copy. Neither needs a new data source,
   a new page, or a single new fetch.
2. **We win the deep clusters and lose the fast ones.** Every cluster we serve
   (C, F, I, L — 28 people) has a budget over 45 seconds. Every cluster pizzint
   serves (A, J — 24 people) has a budget under 20. We have built an
   instrument for people who already decided to stay, and the decision to stay
   is made in the first four seconds by someone holding a phone.
3. **Our best material is our least visible.** The `/race` blank-cell legend,
   the `Meta AI` floor note, the 43.8-hour window admission, the `no public
   feed reads UNREAD, never QUIET` rule — the four strongest paragraphs on the
   site are on an inner page or below 6,000px of mobile scroll.

---

## 4. Ranked changes

Two groups, as the brief requires. Within each, ranked by *(people served) ÷
(cost)*. Every item names the file it lives in. `build.mjs` is the human
integrator's; new templates need registering there and that is stated, not
done.

### Group 1 — better for the people already here

**1. Put the delta on the fold. `site/templates/index.mjs:399`**
Serves K(7), A(16), D(9) — **32 of 100**. Cost: hours.
`direction()` returns "no prior observation to compare" whenever
`ctx.vsYesterday` is null, which is every build until the record is 24h old.
`state.delta_from_previous` is live right now. Print the last-move delta with
its interval — `−0.1 since 21:14Z, 2h 50m ago` — and add the vs-yesterday line
only once it exists. Effect: the most-asked question on the site stops being
answered with a dash. `[E#1]`

**2. One plain sentence for the frightened. `site/brand.mjs` + `index.mjs`**
Serves B(13), J(8) — **21 of 100**. Cost: hours, and it is pure copy.
Directly under the badge, before the gauge:
> *Today reads ordinary. 40.7 of 100 sits inside the middle band of our own
> record. This is a count of how much is happening, not a claim about how it
> ends.*
Every clause is a measurement or a negation. Nothing here crosses `VOICE.md`
§1. It is the one thing 13 people came for and neither site says.

**3. "Since you looked." `site/templates/_motion.mjs`**
Serves K(7), A(16) — **23 of 100**. Cost: one `localStorage` key, ~15 lines.
Store `generated_at` and the score on each visit. On return, above the badge:
`3 new observations since your last visit · −0.4 · 11 new items`. If nothing
changed, print `Unchanged since your last visit, 4h ago` — which is *also*
information, and is the honest version of the churn `MOTION.md` §2.5 bans.
Both sites currently ship 0 return-state keys. This is the single largest
retention lever in the file. `[E#3]` `[E#8]`

**4. The new-post counters the brief asked for. `site/templates/_parts.mjs`**
Serves K(7), A(16), C(10) — **33 of 100**. Cost: hours.
Our masthead already counts (`16 FEEDS 200 ITEMS`) but nothing counts *new*.
Per section: `Signal feed · 11 new since 21:14Z`, `The X wire · 3 new`, `The
watch floor · 2 labs moved`. pizzint has both halves of this —
`N NEW REPORTS — JUMP TO LATEST` and `40 REPORTS • 20 ALERTS` — and counters on
headings are the cheapest density that exists once you already hold the data.
`[E#9]`

**5. The oven rail: the Domino's-tracker move. `_parts.mjs` + `site/styles.mjs`**
Serves A(16), B(13), J(8) — **37 of 100**. Cost: days.
The Domino's tracker is five named stages with the current one lit and the rest
dimmed. Our five levels **already are** that object; we render them as five
anonymous pips. Replace with a labelled rail:
`DORMANT · ROUTINE · ELEVATED · ACCELERATED · UNPRECEDENTED`, the live stop lit
and carrying the score, the band edges printed (`35–54`), and the previous
position marked so the direction of the last move is visible on the rail
itself. Warm amber for the lit stop — the "oven" the brief asks for — cool grey
for the rest, plus a glyph per stop so it is never colour alone.

> **The honesty constraint, and it is not optional.** A delivery tracker
> implies forward motion toward a single destination. Ours must read as a
> needle that moves *both ways*: the previous-position marker is what makes it
> a scale rather than a countdown, and the rail must animate down as readily as
> up. Build it one-directional and we have shipped a doom countdown with better
> typography, which is the category we exist to leave. `VOICE.md` §1.

This replaces the gauge. It does not sit beside it.

**6. Slow and widen the ticker. `site/templates/_motion.mjs`, `site/styles.mjs`**
Serves A(16), J(8), K(7) — **31 of 100**. Cost: hours.
Measured: `dcmxRun`, 50s per cycle, one line, and at 375px it clips mid-word —
`…opt out of having their "visual da`. The operator is right twice over. Take
the cycle to **90–110s**, give the track two lines at ≤480px with a larger
type size, and keep the existing `:hover` / `:focus-within` pause. A headline
that cannot be finished is worse than no headline. `MOTION.md` §2.1 sets 40–60s
and should be amended to 90–110s with the reason recorded.

**7. Promote `/race`'s leader to the fold. `site/templates/index.mjs`**
Serves D(9), A(16) — **25 of 100**. Cost: hours; the number is already computed.
One line under the delta: `Market leader · Anthropic 73.5% · +1.0 pts / 7d ·
Which company has best AI model end of 2026?` linking to `race.html`. Also fix
the `/race/` 404 by emitting `race/index.html` as well — the integrator's call
in `build.mjs`.

**8. Faces on the watch floor. `site/templates/_labs.mjs`**
Serves J(8), A(16) — **24 of 100**. Cost: days.
The brief liked the emoticons. The watch floor already names all eight
principals and currently prints `Principal — no public feed` eight times in a
row, which is eight rows of nothing. Give each row a deterministic generated
avatar — monogram or identicon, built from the name, no network call, no
`Math.random()` per `CONTRACT.md` §4.

> **Not photographs.** Scraped portraits of real people carry licensing and
> misattribution risk, and a real face next to a computed "posture" label reads
> as a claim about the person. A monogram does not. This is where we take the
> brief's spirit and decline its letter.

---

### Group 2 — brings new people

**9. WATTS: the second scalar and the sub-visual switcher.**
`site/templates/wattsPage.mjs` (new), `_switcher.mjs` (new),
`collector/sources/*.mjs`
Serves E(6), C(10), F(5), D(9), J(8) — **38 of 100**. Cost: weeks. **This is
the biggest item in the file and it is what the brief's "power outages, water
usage, dried up energy" is actually asking for.**

The thing to copy is not pizzint's gay bars — it is their **Commute Index**,
which is the same idea done rigorously. Read from the live panel:
`OPTEMPO 5 / Business As Usual · SCORE: 5`, `TIME WINDOW: EVENING RUSH`,
`CORRIDORS: 7/7 · CORRELATION: 14%`, `DIRECTION: OUTBOUND · SENSITIVITY: 2x ·
BASELINES: PER-CORRIDOR`, `UPDATED: 6:30:50 PM ET · BASELINE SLOT: Wed 18:30`,
a six-row corridor table with `RATIO / DEV / SIGNAL` columns
(`Alexandria 91% +16% 11`), and a plain-language verdict:
*"Traffic patterns are normal for evening rush. No anomalous activity detected
around the Pentagon."*

That is: **a second named scalar, on its own 5→1 scale, over an infrastructure
proxy, with a published baseline, a sensitivity constant, a per-unit table and
a one-sentence verdict.** It is the best-engineered thing on their site and it
is almost exactly `SUB-INDICES.md` §3.

The AI version is *more* defensible than theirs, for the reason `SUB-INDICES.md`
already gives: weights can be kept secret, the power bill cannot. Datacentre
load is the one frontier-AI input that shows up in a public, timestamped,
free feed.

**Source note for whoever builds the collector, because it decides the shape.**
The obvious source, EIA-930 hourly demand by balancing authority, **requires an
API key**, which collides with `CONTRACT.md` §3 ("no secrets anywhere"). Two
US ISOs publish keyless public feeds — NYISO and ERCOT — and ERCOT covers the
Texas datacentre corridor that the AI-capex story actually lives in. Recommend
starting keyless, printing the coverage limit on the page (*"two grids, not the
country"*), and treating the key-bearing national feeds as a later decision the
operator makes on the record. Do not silently introduce a secret to get better
coverage.

Water is a trap and should be said out loud on the page: US water-use data is
annual, not hourly, and a sub-index whose input updates once a year cannot have
a tempo. Publish that as a measured exclusion, the way `/race` publishes the
Manifold exclusion — it is a better paragraph than a fake number.

The switcher is the delivery mechanism: one row of tiles under the index,
swapping the panel **in place**, never navigating away — `PIZZA CARDS`,
`HORMUZHUB`, `GAY BAR REPORT`, `STRIP CLUB INDEX`, `MAP VIEW`, `COMMUTE INDEX`,
`PETE-ZA` is their row; ours is `INDEX`, `WATTS`, `THE RACE`, `THE WIRE`,
`QUIET`, `BLISS`. `ENGAGEMENT.md` §1.2 already identified this control as the
mechanism. Every tile must also be a real URL for the crawler. `[E#5]`

**10. `/bliss`. `site/templates/blissPage.mjs` (new)**
Serves H(6), G(7), B(13) — **26 of 100**. Cost: weeks.
The only thing that converts cluster H, and the thing that lets cluster B leave
with something other than dread. `SUB-INDICES.md` §5 has the spec. It is also
the answer to the question every hostile quote-tweet will ask: *does your index
have a direction it can move that you would be happy about?*

**11. The lore band and `/lore`. `site/templates/lorePage.mjs` (new)**
Serves J(8), B(13), E(6) — **27 of 100**. Cost: weeks.
`ENGAGEMENT.md` measured lore at **50.4% of pizzint's homepage height** against
**0%** of ours (`/history.html` is our *observation* record, not our story).
The brief asks for the research on humans and the fear of AI takeover, and that
research has a job on this page: the timeline that runs Turing 1950 → Good's
1965 intelligence explosion → Dartmouth → Terminator 1984 → Hinton 2023 →
the 2023 pause letter is what converts "someone's dashboard" into "a tradition
with an instrument attached". It is also the largest indexable-surface
opportunity we have: **7 sitemap URLs against their 1,018.**

Carry the Terminator entry carefully. The framing literature's finding — a
technology pre-loaded with cinematic apocalypse gets judged on precedent
instead of on measured behaviour — is *our thesis*, not a decoration. The entry
should say that, which turns the most clickable item on the timeline into the
clearest statement of why the index counts rather than predicts. `[E#12]`

**12. One indexable page per news item. `site/templates/` + `build.mjs` (theirs)**
Serves E(6), plus the search tail that produces future clusters. Cost: weeks.
997 of their 1,018 URLs are `/intel/<slug>`. We hold 200 scored items with
corroboration counts and per-item score decompositions and we publish **zero**
item pages. `[E#4]`

---

## 5. What to cut

The brief is right that we have added for several releases and removed nothing.
Measured: **8,742px of scroll at 375px**. Here is the deletion list, in order
of how little will be missed.

**1. The reel, or the feed's top eight. Pick one. `_reel.mjs`**
They are the same eight items, in the same order, with the same scores. Roughly
two mobile screens of verbatim duplication. Keep the reel (it is the better
object for cluster A) and start the feed at rank 9, or drop the reel and let
the feed carry a rank-1 hero row. There is no argument for both.

**2. The distribution curve. `_charts.mjs`**
Three charts of one scalar above 6,000px: a gauge, a frozen-reference normal
curve, and a three-point history line. The curve explains the *normalisation*,
which is a methodology concept, and it is the one an arriving visitor is least
equipped to read. Move it to `methodology.html`, where the readers who want it
already are.

**3. The 14-row source freshness table on the homepage. `_parts.mjs`**
Fourteen rows, of which nine currently read `no baseline · no read`. Collapse to
the sentence we already write — `1 stale, 9 awaiting baseline, of 14 sources` —
plus a link to a real source-states page. The honesty is in the sentence; the
table is a database dump. `[E#13]`

**4. The X wire, at minimum demoted. `_xwire.mjs`**
Eight posts of other people's content, resolved `via Techmeme` and `via Hacker
News` — which means it is structurally **downstream**, the exact property
`NEWS.md` opens by claiming as pizzint's weakness and our advantage. One of the
eight is Taylor Lorenz on YouTube enshittification, which is not frontier-AI
tempo by any reading. Keep it as a `/wire` page or a four-item strip. It should
not outrank our own scored corpus on the homepage.

**5. "Elsewhere on the desk." `index.mjs`**
Three link cards at the very bottom of an 8,742px page. If the switcher in
item 9 ships, these are the same three destinations in the place nobody
reaches. Delete them when the switcher lands.

**6. One of the five ways we print the same level.**
Badge numeral `4`, `DOOMCON 4 · ROUTINE`, codename `NEEDLE BREATHING`, five
pips, band caption `ROUTINE · 35–54`, gauge arc label, and `40.7 of 100 —
DOOMCON 4, ROUTINE (35–54)` — the level is stated **seven times** above
6,000px. The oven rail in item 5 absorbs the pips, the gauge and the band
caption into one object. That is the cut that makes room for everything in
Group 1.

**Disagreement with `ENGAGEMENT.md`, stated plainly.** That file's §0 concludes
we are *"not less dense on a phone — 35 atoms against 37"* and warns against
briefs to add density. The count is right and the conclusion is half right.
Adding atoms is wrong; **replacing repeated atoms with distinct ones is the
whole job.** Of our 35 mobile atoms, seven are the same level restated. Of
their 37, almost none repeat. Density of *kinds* is the metric, and the way to
raise it is to delete, not to add — which is what this section is for.

---

## 6. What was not measured, and what could be wrong

- **No traffic data.** Cluster sizes are grounded in population polling and in
  the structural analysis in `TEARDOWN.md` §2.3, not in analytics from either
  site. The *ordering* of the clusters is the robust claim; the exact counts
  are a model.
- **One session, one network, one build.** Our site rebuilds every minute; the
  numbers quoted here (`40.7`/`40.8`, `3 receipts`, `73.5%`) move. The
  structural findings do not.
- **pizzint was read while hydrated.** A visitor on a slow connection sees
  `LOADING TACTICAL DATA...` where this file records a venue card. That makes
  their cluster-A win *weaker* than described here, not stronger.
- **Persona judgements are judgements.** The time budgets are estimates. What
  is measured is which strings exist on which page at which scroll depth; the
  inference that a given person leaves at seven seconds is not.
- **Cluster B is the one to test first, and it is testable.** Show five people
  who are not in tech the fold and ask them what it says. If they cannot answer
  "should I be worried today", item 2 is correct and everything else in Group 1
  can wait behind it.
