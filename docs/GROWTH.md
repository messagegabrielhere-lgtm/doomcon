# Growth and UX plan

**Status:** proposal, not yet actioned. Written 2026-09-25 against the live site at
DOOMCON 4 (ROUTINE), score 41.4.

This is a heuristic review of the live pages and this repo — no session data, no
search-console numbers, no user tests. Read the priorities as hypotheses to test,
not as findings. Ship moves 01 and 02, then let two weeks of real numbers reorder
the rest.

---

## The core finding

PizzINT wins on one mechanic: you land, you see one status, you get it, you
screenshot it.

DOOMCON has the better number and a methodological claim nobody else in the
category can make — *recomputable by a stranger*. But the first viewport is a
dense newsroom rail plus a status bar of eleven equal-weight sections, each with
its own live number. A first-time visitor cannot answer "what is this?" without
scrolling and reading.

Every item below serves one of three jobs:

1. **Make the first five seconds land.**
2. **Make the page reproduce itself** — embeds, cards, citations.
3. **Give people a reason to come back** — level-change alerts, predictions.

---

## Baseline: what is already right

| Area | State | Note |
|---|---|---|
| Analytics | Plausible installed | No goals or funnel defined — that is the gap |
| Syndication | `feed.xml` live | Discoverable from `<head>` |
| Social preview | OG + `summary_large_image` | Generated `cards/state.png` |
| Structured data | 2 JSON-LD blocks, canonical set | Better than most independent indices |
| Page weight | ~294 KB, zero images, 5 scripts | 200 items render inline — mobile cost |
| Domain | `github.io` subpath | Caps brand recall, sharing and search trust |

---

## The nine moves

Ranked by expected traffic and retention impact per unit of build effort.

### 01 — Put the number in the first viewport, alone
**Impact: high · Effort: low**

Level, score, direction of travel, one-line claim. Nothing else. The newsroom rail
starts below the fold.

Lift the README line — *"We don't know anything. We just count."* — onto the page
as the positioning statement under the numeral. It is the sharpest sentence in the
project and it currently lives only in the repo.

*Acceptance:* a stranger can state what the site measures within five seconds,
without scrolling.

### 02 — Ship an embeddable badge
**Impact: high · Effort: low**

Highest leverage item on this list, and nearly free: `collector/card.mjs` already
renders dependency-free SVG.

Publish `/badge.svg` plus a three-line embed snippet that anyone can drop into a
README, a blog sidebar or a newsletter footer. Every placement is a self-updating
live backlink and a permanent impression. Add a one-click "Embed this" block on
the homepage with the snippet pre-selected.

*Acceptance:* `badge.svg` served with correct cache headers; referer-distinct hits
tracked.

### 03 — Alert on level change, not on updates
**Impact: high · Effort: medium**

The anti-flap logic in `collector/engine.mjs` is a marketing asset disguised as an
engineering decision. Because levels are hysteresis-damped, a level change is rare
and therefore newsworthy.

Make that the entire subscribe promise: **"We'll email you when the level changes.
That's maybe six emails a year."** A promise that specific converts far better than
"subscribe to updates". The same trigger fires a social post and an RSS item
flagged `level-change`.

### 04 — Give every level change its own permalink page
**Impact: high · Effort: medium**

`/moves/` exists with 11 entries, but reads as an archive rather than as pages.

Each move page wants a dated headline ("DOOMCON went to 3 on 2026-08-14 — here is
what moved it"), the five pillar contributions, the receipt hash, and the items
that drove it, with `NewsArticle` schema. These are the long-tail search and
citation asset — what a journalist links to, and what surfaces months later.

### 05 — Collapse eleven nav items into three
**Impact: medium · Effort: low**

Index · The Race · Newsroom · Watts · Map · Leaders · Digest · Bliss · Methodology
· History · Archive — all peers, all carrying a live number. Eleven live numbers
means no number is the headline.

Proposed hierarchy:

- **The Index** — home
- **The Evidence** — newsroom, map, watts, leaders, race as tabs under one roof
- **How it works** — methodology, history, archive

"Watts" and "Bliss" are insider names with no search volume and no
self-explanation. Rename to what someone would actually type, or subtitle them.

### 06 — Let people call the next level
**Impact: high · Effort: high**

Prediction is the strongest retention loop in this category: it converts a passive
reading into a personal stake with a scheduled payoff.

One control: "Where will DOOMCON be on the first of next month?" Store the call,
show the crowd distribution, resolve publicly when the month turns. The resolution
is itself a content event and an email trigger. Pairs naturally with the receipts —
this is already the only index in the category that can prove its own scoring after
the fact.

### 07 — Buy the domain and move
**Impact: medium · Effort: low**

A `github.io` subpath is unsayable out loud and inherits none of its own domain
authority. Move to something short and pronounceable with permanent redirects, so
existing links and the RSS subscriber base survive. Do this before any push for
press — a journalist will not print the current URL.

### 08 — Build the mobile card view
**Impact: medium · Effort: medium**

Traffic from X, Reddit and Hacker News runs heavily mobile, which is exactly where
a 200-item inline render and 10px uppercase mono type fail.

At phone width: numeral, claim, sparkline, three pillar movers, one "see the
evidence" link. Defer the rest of the DOM until tapped. Also fixes the Core Web
Vitals cost of ~294 KB of inline markup, which feeds back into ranking.

### 09 — Publish a stable JSON endpoint and a "cite this" block
**Impact: medium · Effort: low**

The people who make an index famous are the ones who reuse it. A versioned
`/api/state.json` with a documented schema, plus a copyable citation carrying date,
score and receipt hash, turns casual readers into distributors. The recomputability
claim is wasted if reusing the number takes more than thirty seconds.

---

## 90-day sequence

| Window | Ship | Should move |
|---|---|---|
| Days 1–14 | Number-first hero · nav collapsed to three · domain moved with redirects | Five-second comprehension; first-session bounce |
| Days 15–30 | `badge.svg` + embed snippet · `api/state.json` · cite-this block | Referring domains; embeds placed |
| Days 31–60 | Level-change email + social trigger · move permalinks with schema | Returning visitors; indexed pages; first press citation |
| Days 61–90 | Mobile card view · monthly prediction with public resolution | Mobile completion rate; 30-day return rate |

---

## Instrumentation

Plausible is installed but no goals are defined, which means none of the above can
currently be judged. Define these first, so week one has a baseline.

1. **Five-second rate** — share of sessions that scroll past the hero or click one
   evidence link. Proxy for "did they understand it".
2. **Embeds placed** — referer-distinct hits on `badge.svg`. Earliest signal that
   the loop works.
3. **Alert conversion** — subscribes per 100 sessions, tracked separately on
   level-change days versus quiet days.
4. **Return on event** — share of subscribers who open the site within 48h of a
   level change. If this is low, the promise is wrong.
5. **Citation count** — manual monthly tally of outside pages linking a move
   permalink. Slow, and the one that compounds.
