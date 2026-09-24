# Sub-indices — the franchise

Pizzint is not one index. It is `/hormuz`, `/nothingeverhappens`, `/electionhub`,
`/polyglobe`, plus the gay-bar and gentlemen's-dispatch theories. Each is a
separate page, a separate head term, a separate reason to link, and a separate
thing to screenshot. That is the model.

This file specifies ours. The rule every one of them obeys:

> **An absurd-sounding proxy measured rigorously.** The joke is the framing.
> The number underneath has to be real, or we are just another doom blog.

---

## Why a second axis exists

Every competitor — DoomBench, the AI Safety Clock, skynetcountdown, pdoom.ai —
measures one direction: how bad. Nobody measures the other side.

So DOOMCON runs **two** headline scalars:

| | measures | reads |
|---|---|---|
| **DOOMCON 5→1** | takeover-adjacent tempo: capability, compute, concentration, opacity | how fast the machines are moving |
| **BLISS 1→5** | upside tempo: science, medicine, access, abundance, openness | how much good is landing |

The pairing is the product. "AI is scary" is a crowded take; "here are both
numbers, computed the same way, and today they disagree" is not a take at all —
it is an instrument. It also makes the calm days interesting, which is the
single thing that keeps an index account credible over time.

---

## 1. THE RACE — the key-players leaderboard

*"Who is winning, and how sure is the money?"*

**Route:** `/race`

The most-requested and most-shareable sub-page. A ranked table of the frontier
labs and the people running them: OpenAI/Altman, xAI/Musk, Anthropic/Amodei,
Google DeepMind/Hassabis, Meta/Zuckerberg/LeCun, DeepSeek/Liang, Mistral,
Alibaba Qwen.

**The data unlock:** Polymarket runs `negRisk` markets — *"Which company has the
best AI model"* is 32 mutually-exclusive legs whose probabilities sum to 1. We
deliberately **exclude** those from the index scalar, because averaging a level
across N buckets measures how many buckets exist, not what happened. But as a
**leaderboard they are perfect**: they are literally a live, money-backed
probability per lab. The thing that is useless for scoring is ideal for display.

Per player, all computed not asserted:
- Live market probability of holding the best model, with 7-day change
- Shipping velocity — releases from their GitHub orgs and model listings
- Mindshare — share of our news corpus mentioning them, 7-day trend
- Compute proxy — announced capex and datacenter news hits
- **Loudness** — public posting and appearance cadence of the principal

Ranked, with an explicit "how this is computed" line under the table. Never a
vibes ranking; every column traces to a fetchable number.

---

## 2. THE QUIET LAB INDEX — the inverse signal

*"They stopped talking. That is when it happens."*

**Route:** `/quiet`

This is our structural analogue to pizzint's gay-bar theory, and the closest
thing we have to their actual genius. Their claim is an **inverse correlation**:
when venues near the Pentagon go unusually *quiet*, personnel are working late.

The AI version is more defensible than the original: frontier labs go quiet
before a launch. Blog cadence drops, researchers stop posting, public commits
to a repo thin out — then a model lands. A drop in ordinary output is a real,
free, measurable signal, and unlike pizza it does not depend on scraping a
third party's UI that changes without notice.

Measured per lab: blog/changelog cadence versus that lab's own 90-day baseline,
public repo commit and release rhythm, researcher posting volume where a
legitimate feed exists. Inverted, so **quiet scores high**.

Honesty requirement, stated on the page: this will produce false positives.
Labs are quiet in August. Publishing the false-positive rate openly is what
separates this from a horoscope — and it is exactly what pizzint never does.

---

## 3. WATTS — the compute and power tracker

*"Intelligence is electricity with extra steps."*

**Route:** `/watts`

The least funny and most fundamental. You cannot train a frontier model without
power and silicon, and unlike model weights, power leaves a paper trail.

- GPU spot pricing and rentable supply (Vast.ai, live in the index today)
- Cloud accelerator spot prices (AWS public pricing JSON)
- Datacenter capex from SEC filings — full-text search hit velocity on the
  hyperscalers, which is already a verified working source
- Grid interconnect and utility announcements near known datacenter corridors

This is the page a journalist cites, which makes it the page that earns links.

---

## 4. NOTHING EVER HAPPENS — the skeptic's counter

*"The index for people who think this is all nonsense."*

**Route:** `/nothing`

A direct, acknowledged riff on pizzint's own NEH index, pointed at AI. Tracks
how often confident AI predictions did **not** come true: AGI dates that slipped,
benchmark claims that failed replication, product launches that missed announced
windows, regulation that was announced and never shipped.

Strategically this is the most important page on the site. An AI-doom tracker
that can *only* say "more doom" is a hype account with a chart. One that keeps
public score of its own side's overconfidence is one people trust. It is also
the page most likely to be shared by skeptics, which is a whole audience the
competitors cannot reach.

---

## 5. BLISS — the upside index

*"The other ending."*

**Route:** `/bliss`

BLISS 5→1, same machinery, opposite direction:
- Science: AI-assisted results in structural biology, materials, mathematics
- Medicine: trial starts and approvals involving AI-derived candidates
  (ClinicalTrials.gov is free and queryable)
- Access: open-weight releases, price-per-token decline (OpenRouter gives us a
  dated roster with pricing — the cost curve is directly computable)
- Abundance: measurable productivity and cost-collapse signals

Same five-pillar architecture, same frozen-reference normalisation, same
anti-flap rules. Nobody else in the category is building this, and it is what
makes the site something other than a doom shrine.

---

## 6. THE TELL — anomaly watch

*"Things that should not be moving."*

**Route:** `/tell`

A thin page listing statistical oddities the collector noticed this week: a
source at an all-time percentile, several pillars moving together, an unusual
overnight burst. Auto-generated, each with a permalink and a receipt.

This is the page that generates X posts on quiet days, which matters: cadence
is what keeps an account alive, and nothing older than 48 hours reaches new
people on that platform.

---

## Shared rules

- **Every sub-index is a real page**, server-rendered, indexable, with its own
  OG card. This is pizzint's 997-brief long tail, which is where their traffic
  actually comes from.
- **Every sub-index publishes its formula.** Same standard as the main index.
- **Every sub-index can go dark**, and says so plainly rather than printing a
  confident number over a dead pipe.
- **Sub-indices do not feed the main index** unless their sources are in the
  frozen reference. A page can be interesting without being load-bearing, and
  conflating the two is how an index quietly becomes a vibe.
- **Ship order:** `/race` first (most shareable, data already in hand), then
  `/bliss` (the differentiator), then `/quiet` (the best story), then the rest.
