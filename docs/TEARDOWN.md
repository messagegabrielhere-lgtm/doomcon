# Reverse-engineering pizzint.watch

Everything below was measured on 2026-09-22/23, not assumed. Where a claim is
inferred rather than observed it says so. This file is the spec: every design
decision in this repo traces back to a line in here.

---

## 1. What pizzint actually is

A Next.js 15 / React 19 / Tailwind app on Vercel, Supabase for storage,
Cloudflare in front. Scraping is Puppeteer against Google Maps "Popular Times".

Headers confirm it: `x-powered-by: Next.js`, `x-nextjs-prerender: 1`,
`x-nextjs-stale-time: 300`, `x-vercel-cache: HIT`, `server: cloudflare`.

**This is the right stack and the right price point. We are not being clever by
picking something else.**

---

## 2. The five things that make it work

### 2.1 One scalar, named, counting down

`DOUGHCON 5 → 1`. Not a percentage, not a dashboard — a single word plus a
single digit. It borrows DEFCON's grammar, so nobody needs the legend
explained. It fits in a tweet, on a card, in a headline, and in a group chat.

**Copy this exactly.** The index is the brand. Everything else is supporting
material.

### 2.2 Lore that manufactures legitimacy

A long, well-designed history page: the KGB "PIZZINT" doctrine, the 1990 TIME
quote from a Domino's runner, Frank Meeks' 101 pizzas to the Pentagon on
1991-01-15, Wolf Blitzer's "Always monitor the pizzas."

The gimmick would read as a joke without it. The history makes it read as a
*tradition*. It is also pure SEO surface.

**Copy the pattern.** AI has its own real lore — Good's 1965 intelligence
explosion, the 1956 Dartmouth proposal, Hinton's 2023 resignation, the 2023
pause letter. Same job, better sourcing.

### 2.3 The long tail is the actual traffic engine

`sitemap.xml` holds **1,018 URLs. 997 of them are `/intel/<slug>` auto-generated
news briefs.** The dashboard everybody talks about is *one* URL.

The remaining 21 are hand-built head-term pages: `/hormuz`,
`/nothingeverhappens`, `/electionhub`, `/guides/how-polymarket-works`,
`/guides/polymarket-vs-kalshi`, `/guides/open-source-intelligence-tools`. Every
title is stuffed for a distinct head term. They run a Google News sitemap with
`news:keywords`, and ship `WebApplication` + `FAQPage` JSON-LD.

**This is the single most important finding in the teardown.** The viral index
gets you the spike; 997 indexable pages get you the durable traffic. A single
dashboard URL cannot rank for a category.

### 2.4 Distribution is an X account, and it posts calm days

`@PenPizzaReport` (~374K, Aug 2024) is the original; `@pizzintwatch` (~79K,
July 2025) is the site's own account riding its coattails.

The original's template is rigid and worth memorising:

> "HIGH activity is being reported at the closest Papa Johns to the Pentagon.
> Freddies Beach Bar is reporting abnormally low activity levels for a Saturday
> at 7:11pm ET. Classic indicator for potential overtime at the Pentagon."

Named place, qualitative level, **exact clock time with timezone**, day-of-week
baseline, attached image, **no outbound link**.

And critically:

> "All pizzerias nearby the Pentagon are currently reporting average or below
> average traffic as of about 5:20pm ET"

**It posts the boring days.** That is where the credibility comes from. An index
that only speaks when alarmed reads as a hype account.

Its defining moment: 2025-06-12, flagged a surge at District Pizza Palace
~7pm EDT; Israel struck Iran ~8pm. One screenshot did more than a year of SEO.

### 2.5 Monetisation is thin, and that is instructive

Fuse Platform mediating into Google Ad Manager, a Ko-fi, and Polymarket links
carrying **bare UTM parameters with no referral code** — so the Polymarket
links appear to earn nothing.

**Do not copy this.** Display ads slow the page and cheapen the credibility that
is the actual product.

---

## 3. Where it is broken — every one of these is our opening

### 3.1 The flagship pipeline is dead and it publishes the evidence

`GET https://www.pizzint.watch/api/scraper-status`, sampled twice four minutes
apart:

```json
{"status":"healthy","stats":{"totalPlaces":16,
 "successfulScrapesLast24h":2,
 "lastSuccessfulScrape":"2026-09-23T02:10:13.773+00:00","recentScrapes":10}}
```

Zero of the five `recentData` entries had `puppeteer_success:true`. Every one
carried `current_popularity:null` and `puppeteer_error:"No popularity elements
found"`. Google changed its Popular Times markup; the scraper was never fixed.

That is why the homepage renders **NO DATA for four of six pizzerias while
DOUGHCON confidently displays 5**. The headline number is a default, not a
measurement. And the endpoint says `"status":"healthy"` at a 12% success rate.

Also: the monitored list isn't pizzerias. `recentData` names Club Visions, Casa
Colorada, Cheetah Premier, The Players Club and Pentagon Metro Station.

> **Our rule: never print a confident number over a dead pipe.** Per-source
> freshness on the dashboard, a real `/api/health` reporting per-source success
> rates, and an explicit `DEGRADED` state the index enters when inputs go stale.
> Liveness is a feature, and it is the one they cannot match without a rewrite.

### 3.2 No methodology exists

`/about`'s entire "HOW IT WORKS" is four bullets of nouns — "spike detection
algorithms", "pattern correlation". No formula, no baseline, no thresholds
mapping traffic to DOUGHCON 5→1, no weights, no backtest.

Their `FAQPage` JSON-LD claims *"Data typically updates about every 10 minutes"*
— contradicted by their own status endpoint at 2 scrapes/24h.

### 3.3 Client-rendered, so the number is invisible

The prerendered HTML contains only `LOADING TACTICAL DATA...`, `Preparing
ElectionHub`, `Preparing NEH Index`. 1.36 MB, ~25 JS chunks, 300s stale window.

Two consequences: crawlers never see the number, and **a screenshot taken before
hydration shows an empty dashboard.** That is fatal when the growth loop is
people screenshotting your number.

> **Our rule: server-render the scalar and the last N moves into the HTML.**

### 3.4 robots.txt publishes their roadmap

`/robots.txt` disallows — and therefore discloses — `/auto-reply-admin`,
`/social-admin`, `/marquee-lab`, `/screenshot-export`, `/video-export/`,
`/neh-grid`, `/pizzint-vertical`, `/usni-debug`, `/internal/`, `/test-*`,
`/debug-*`, `/dev/`.

Two lessons. **Copy the architecture** — `/screenshot-export` is how every post
gets a card, and `/video-export` + `/pizzint-vertical` is how the format
extends to TikTok/Reels. **Do not copy the mistake** — use `noindex` headers or
auth, not a public list of your unshipped features.

### 3.5 Their own X card is misattributed

`twitter:site` points at `@pizzint` while the real account is `@pizzintwatch`.

---

## 4. The competitive reality in AI (this is not pizza)

The AI vertical is **already crowded**, which the pizza framing obscures:

| Site | What it does | Weakness |
|---|---|---|
| doombench.com | 0–100 Doom Index, real methodology page, 18-month half-life decay, tanh aggregator, 1,075-item evidence ledger | Scored by LLM/human judgment |
| IMD AI Safety Clock | 15 minutes to midnight | "Blends quantitative with qualitative insights and expert opinion" |
| skynetcountdown.com | Published methodology + permanent receipts | **Single source — TechCrunch AI RSS, and says so** |
| takeofftracker.com | Takeoff tracking | Ships a page of "Loading…" |
| pdoom.ai / pdoom100.com / theagiclock.com / doomclockai.com / aidoomsdaycountdown.com | Countdown clocks | Judgment-scored |

`takeoff.watch` and `agi.watch` are already registered.

### The two gaps nobody has filled

> **Not one of them has an X account.**
>
> **Not one of them — nor pizzint — ships an embeddable widget or a public JSON
> API.** `/embed` and `/widget` 404 on all of them.

The entire distribution channel in this category is unclaimed. Pizzint proved
distribution is the whole game, and five AI competitors built dashboards and
waited for traffic.

### The differentiator that follows

Every competitor scores by human or LLM judgment. DoomBench's FAQ has to
explain that 67.8 "does not mean a 60 percent probability". **None of them can
be independently recomputed by a stranger.**

> **Ours can. Same code, same public data, same number.**
>
> "They read one tech blog. We read the field — and you can check our arithmetic."

---

## 5. What we copy, what we fix, what we add

| | pizzint | doomcon |
|---|---|---|
| Named scalar | DOUGHCON 5→1 | **Copy** — 5→1 plus a 0–100 score (AQI dual-output) |
| Lore page | KGB pizza doctrine | **Copy** — real AI history, properly sourced |
| Long-tail SEO | 997 auto-generated briefs | **Copy** — one indexable page per index move |
| X account | Image-only, no link, posts calm days | **Copy exactly** |
| Card render route | `/screenshot-export` | **Copy** |
| Methodology | None | **Fix** — versioned formula + recompute script |
| Liveness | "healthy" at 2 scrapes/24h | **Fix** — per-source health, `DEGRADED` state |
| Rendering | Client-side, empty screenshot | **Fix** — server-rendered scalar |
| Internal routes | Listed in robots.txt | **Fix** — noindex/auth |
| Monetisation | Display ads + Ko-fi | **Change** — widget + API, no ads at launch |
| Embeddable widget | None | **Add** — nobody in the category has one |
| Public JSON API | None | **Add** |
| Hash-chained receipts | None | **Add** |

---

## 6. Non-negotiables carried into the build

1. **Measure tempo, never probability of harm.** The WHO Phase-6 collapse is the
   cautionary tale: Phase 6 measured geographic spread, the public read it as
   severity, H1N1 was mild, the framework was scrapped in 2013. Name the levels
   after what they measure — observable activity tempo relative to history.
2. **Post the calm days.** Fixed daily state post plus event-driven threshold
   crossings.
3. **No URL in any X post.** $0.200 with a link vs $0.015 without — a 13.3x
   surcharge. Domain burned into the card, spelled out in text. Enforced by a
   pre-flight regex, not by discipline.
4. **Never impute a dark source.** A level change is frozen while any pillar is
   dark; auto-posting is suppressed when two or more are dark.
5. **Optimise for copy-link sharing, not likes.** xAI's open-source ranker
   weights share-via-copy-link at 20.0 against a like at 0.5. Self-contained,
   screenshot-able, argue-with-able cards.
6. **Ship the widget in v1.** It is the moat and the hedge against X platform
   risk.

---

## 7. Open risks carried forward

- Follower counts are from secondary sources; x.com 403s all fetches. ~374K and
  ~79K are approximate.
- **GDELT conflict:** one agent verified the DOC 2.0 API as hourly, backfillable
  to ~2017; another got HTTP 429 on six attempts over four minutes. Treat as
  rate-limited-but-alive; build with aggressive caching and a fallback.
- No traffic data for any site here. Claims about which pages "drive traffic"
  are inferred from structure and SEO intent, not measured.
- "None of the five has an X account" comes from scanning rendered homepage
  HTML. An account linked only from an inner page or injected by JS would have
  been missed.
- Polymarket may have a private partnership invisible in the markup.
