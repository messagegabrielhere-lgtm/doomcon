# Motion spec — making the page feel alive

The brief: *"the screen should move like a carousel, it should be addictive to
watch and see the live news and insights floating through."*

This file is the spec for that. It exists because "add animation" produces a
toy, and the difference between a newsroom wall and a toy is entirely in the
rules below.

---

## 1. What actually makes pizzint feel alive

From `TEARDOWN.md`, the honest inventory. Their page feels live because of five
cheap things, only one of which is real:

| Device | Real? |
|---|---|
| A ticking UTC clock in the header | Yes — `setInterval`, costs nothing |
| A long scrolling column of timestamped OSINT items | Yes — but it is mirrored X content |
| "LIVE" pips and AUTO badges | Cosmetic |
| `LOADING TACTICAL DATA...` placeholders | **Actively harmful** — see below |
| DOUGHCON level with a pulsing dot | Cosmetic, over a scraper managing 2 runs/24h |

**The one to steal is the timestamped scrolling column.** Density plus
timestamps is what reads as intelligence. The rest is decoration, and their
decoration sits on top of dead data.

**The one to never copy:** their content is client-rendered, so the first paint
is empty. A screenshot taken before hydration shows nothing, and crawlers see
nothing. When the growth loop is people screenshotting your number, animating
your way into a blank first paint is self-harm.

> **Rule 0: every animated element must already be in the static HTML, fully
> readable, before a single line of JavaScript runs.** Motion is decoration on
> content that is already there. Not a loading strategy. Ever.

---

## 2. The five motion systems

### 2.1 The ticker — continuous horizontal crawl

A single-line marquee of the newest headlines across the top of the feed, like
a wire service.

- Pure CSS `@keyframes` translating a duplicated track; no JS, no jank.
- Duplicate the item list twice in the DOM so the loop is seamless.
- `animation-play-state: paused` on `:hover` and on `:focus-within` — a headline
  you cannot stop to read is an anti-feature.
- Each item: `HH:MMZ · SOURCE · headline`. The timestamp is what makes it read
  as intelligence rather than as marketing.
- Speed ~40-60s per full cycle. Fast enough to feel alive, slow enough to read.

### 2.2 The reel — auto-advancing carousel

The headline feature. Cards of the day's highest-scoring items.

- CSS scroll-snap (`scroll-snap-type: x mandatory`) so touch, trackpad and
  keyboard all work natively.
- **Auto-advance every 7 seconds**, and it must **stop permanently on first
  human interaction** — touch, click, arrow key, or focus. An auto-advancing
  carousel that fights the reader is the single most hated pattern on the web.
  Advancing again after someone has taken control is the mistake; do not make it.
- Progress dots that are real buttons, not decoration.
- Without JS: a plain horizontally scrollable row. Fully usable.

### 2.3 The feed — arrival animation

The dense vertical list below the reel.

- Items newer than the previous build get a one-shot entry: 220ms fade plus a
  6px rise, staggered 40ms apart, capped at 8 items so a big batch does not
  cascade for ten seconds.
- A left border accent in the pillar colour, plus a pillar glyph — never colour
  alone.
- Ages ("14m ago") are computed **server-side at build time** and then ticked
  client-side. The number is in the HTML; JS only keeps it honest.

### 2.4 The numerals — count-up and pulse

- On load, the composite score counts up from the previous observation's value
  to the current one over ~600ms, easing out. It animates from the *real* prior
  value, so the motion carries information: you see the delta happen.
- A single pulse ring on the level badge when the level changed this build.
- `font-variant-numeric: tabular-nums` everywhere, or digits jitter during the
  count and it looks broken.

### 2.5 Live refresh — the page updates itself

This is the genuinely addictive part, and pizzint does not do it.

- Every 60s, fetch `api/state.json` and `api/news.json`.
- If `generated_at` changed: fade the changed values, animate the score to its
  new number, prepend new feed items with the arrival animation, and flash the
  "LAST UPDATE" stamp.
- If nothing changed, do nothing at all. No spinner, no flicker. **A page that
  visibly churns while saying nothing is a page that is lying about activity** —
  which is precisely the pizzint failure mode in a different costume.
- Back off on failure (60s → 120s → 300s) and stop after 3 consecutive errors.
- Pause polling entirely when the tab is hidden (`visibilitychange`). Nobody
  needs a background tab burning a request a minute.

---

## 3. Non-negotiable constraints

**`prefers-reduced-motion: reduce` disables all of it.** The ticker stops, the
carousel does not auto-advance, entries appear without transition, the score
renders at its final value. This is not a degraded experience — it is the same
information, still.

**Everything works with JavaScript disabled.** Ticker becomes a static list.
Carousel becomes a scrollable row. Ages are the build-time values. Score is the
final number. Nothing is lost but the motion.

**No layout thrash.** Animate `transform` and `opacity` only. Never `top`,
`left`, `width`, or `height`. Anything animating continuously gets
`will-change: transform` and nothing else.

**No framework, no dependencies.** One small inline `<script>`. The whole
page must stay comfortably fast on a phone over mobile data, because that is
where X traffic arrives.

**Total motion JS budget: 8KB uncompressed.** If it does not fit, cut a feature
rather than reaching for a library.

---

## 4. The line between alive and dishonest

This project's entire claim is that its numbers are real and recomputable. That
makes gratuitous motion more dangerous for us than for a normal site: every
animation implies something happened.

Permitted, because each one reflects a real event:

- Motion that reflects **real new data** (a new observation, a new item).
- Motion that is **obviously ambient** and reads as chrome (the ticker crawl,
  the clock).
- Motion that **aids comprehension** (count-up showing a delta, arrival showing
  recency).

Forbidden:

- Fake activity — simulated tickers, random flickers, invented "signals".
- Any animation that makes a **stale** value look fresh.
- Motion on a **dark or uncalibrated** source. Those states are pointedly
  static; that visual stillness is information, and it is the honest opposite of
  pizzint printing a confident DOUGHCON 5 over a scraper managing two runs a day.
- Urgency theatre — red flashes, sirens, "BREAKING" on a routine day. The index
  is a tempo measurement, not an alarm, and the daily post fires on calm days
  precisely so the alarmed days are believed.

The test for any proposed animation: **can I name the real event this motion
represents?** If not, cut it.
