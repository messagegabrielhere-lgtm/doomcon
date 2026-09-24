# COMPETITIVE — DOOMCON vs pizzint.watch

Measured 2026-09-24. Three independent inventories were run the same day: a full
walk of pizzint.watch (robots.txt, both sitemaps, all 21 hand-built pages, a
sample `/intel` brief, 48 JS chunks, live DOM and network on three pages), a
full walk of our own site under the identical rubric, and a separate pass on the
traffic and retention mechanics of both. This file is the synthesis. Where the
three disagreed, the disagreement is printed rather than smoothed — §0 lists
every one of them, because two of them change what the plan should be.

The operator's goal is the only rubric used here: **more traffic and more repeat
users than them.** Craft that does not serve that goal is called out as craft.

Prior repo work corrected in this file: `docs/TEARDOWN.md` §2.3, §2.4, §3.1 and
the "no public API" row in §5; `docs/ENGAGEMENT.md` §0 (two rows);
`docs/VISITORS.md` §3 (cluster K). Each correction is marked **CORRECTION**
inline.

---

## 0. Where the three inventories disagree, and what could not be measured

These are printed first because a plan built on the wrong side of #1 is the
wrong plan.

**1. Is their Google News channel alive or dead? UNRESOLVED, AND IT IS THE MOST
IMPORTANT OPEN QUESTION IN THIS FILE.**

- The site inventory fetched `/news-sitemap.xml` and found **14 entries, newest
  `news:publication_date` 2026-06-25T14:50:27Z, oldest 2026-06-23** — frozen for
  91 days.
- The traffic inventory fetched the same file and found **19 URLs spanning
  2026-09-22T21:31 to 2026-09-24T19:11** — a healthy rolling ~48h window with
  `news:keywords` per entry.

Both cite a direct fetch. They cannot both be true of the same minute. Either
the file was regenerated between the two fetches, or one agent read a cached or
stale copy. If it is frozen, their brief engine has been shouting into a dead
channel for three months and their traffic is already collapsing. If it is
rolling, Google News is their largest channel and the correct counter-play is a
news sitemap of our own, urgently. **Re-fetch this file before acting on §7.**

**2. Does our "since you last looked" panel actually work? DISPUTED.**

- Our inventory ran the experiment: planted `{score:38.2, level:5, obs:2, t:-6h}`
  into `doomcon.visit.v1`, reloaded, and got the rendered string
  `Since you looked | 6h 00m ago | ▲ 38.2 → 41.5 | level 5 → 4 · ROUTINE ·
  2 new observations | Dismiss`. That is a per-visitor read.
- The traffic inventory concluded it is "server-rendered from the last build,
  identical for every visitor… cosmetic."

The planted-record experiment is the stronger evidence — a server-rendered
string cannot produce a delta against a value invented at test time. Treat the
feature as working, but note that the traffic agent looked at the same page and
came away believing it was fake. That is itself a finding: **at 34px, below a
status rail that is lying, the feature reads as decoration even to someone
auditing for it.**

**3. Smaller conflicts, all recorded, none plan-changing.**

| Claim | Inventory A | Inventory B | Take |
|---|---|---|---|
| `/intel/` URL count | 996 | 997 | ~996; the ±1 is a sitemap race |
| Their localStorage keys | 3 (`locale`, `osintFeedExpanded`, `breaking-ticker-collapsed`) | 5 (those + `peteza_device_id` + one more UI pref) | Either way: zero return-state |
| `/whitepaper` | 307 redirect to `/` | HTTP 200 serving homepage meta | Changed during the day, or CDN variance |
| Their headline right now | Page says DOUGHCON **4** with four "% SPIKE" figures | API says `defcon_level` **5**, `max_pct: 0` | Both true. That *is* the contradiction |
| Their internally-linked briefs | 32 on `/intel` + "Load more (81 remaining)" = 113 reachable | 32 linked, no pagination found | 113 is the generous read; either way ~89% orphaned |

**4. What nobody could measure, and nobody should guess at.**

Their actual sessions, users, pageviews, bounce rate or return rate. Their
revenue, ad fill or RPM — the 125-SSP stack is fully provisioned in `ads.txt`
and fired **zero** ad requests on every pageview recorded, so we cannot tell if
it is consent-gated, misconfigured or switched off. Their X impressions. Whether
their Polymarket relationship pays. Our own traffic, because **we ship no
analytics at all.** Third-party rank estimates (ipaddress.com: best #51,512,
worst #294,189, currently #242,532) are low-confidence and are *not* traffic;
the only thing that shape suggests is a meme past its spike, and it is quoted
here with that caveat and no weight.

---

## 1. THE SCOREBOARD

Verdicts are judged on traffic and repeat visits, not on quality. A feature we
built better than them but which nobody can see is not a win.

### 1.1 Brand and the headline scalar

| Feature | pizzint.watch | DOOMCON | Verdict |
|---|---|---|---|
| One named scalar, DEFCON grammar, 5→1 | DOUGHCON, five named levels (FADE OUT → EXERCISE TERM) | DOOMCON 4 ROUTINE + 0–100 score | **PARITY** on form, **THEY WIN** on compressibility — "pizza index" needs no explanation, "AI activity tempo" does |
| Scalar present in the served HTML | No — prerender ships `LOADING TACTICAL DATA...` | Yes — `<title>DOOMCON 4 — ROUTINE · AI activity tempo index</title>`, score in H1, hero and meta description | **WE WIN** — the single largest structural advantage we hold |
| Scalar agrees with the site's own API | No. Page: DOUGHCON 4, "455 % SPIKE". API: `defcon_level 5, overall_index 0, max_pct 0, active_spikes 0, reason "compute_doughcon_v9: quiet", data_freshness "stale"` | Yes, except in a hidden tab (see below) | **WE WIN** |
| Scalar correct on first paint | Yes (fossil numbers, but stable) | **No.** `pt(C.prevScore)` synchronously overwrites the server-rendered 41.5 with 40.7, then animates back via rAF. In a hidden or throttled tab rAF never fires and there is no `visibilitychange` repaint. Observed live: `document.hidden===true`, DOM `40.7`, `state.json` `41.5` | **THEY WIN** — and this one is ours to lose. A link opened in a background tab is the normal way a social link is consumed |
| Second named scalar on the same screen | OPTEMPO (commute index), NEH 95, GDELT — four named indices total | BLISS (currently prints no number), SUBSTRATE 4 on `/watts` | **PARITY**, and it is a shared mistake. Two named numbers on one screen means neither is the one people quote |
| Lore / legitimacy band | 5 era tabs, ~50% of homepage height: KGB "PIZZINT" codename, TIME 1990-08-13 Domino's runner, Frank Meeks' 101 pizzas 1991-01-15, Wolf Blitzer "Always monitor the pizzas", DoD's "nothing to offer" to FOX Business | `/history.html`, off the homepage | **THEY WIN** — theirs is inline, indexable, and is what makes the gimmick read as a tradition rather than a joke |

### 1.2 The instrument — data honesty

| Feature | pizzint.watch | DOOMCON | Verdict |
|---|---|---|---|
| Flagship pipeline working | **No.** `/api/scraper-status`: `successfulScrapesLast24h: 0`, all 16 places `puppeteer_success: false`, `puppeteer_error: "No popularity elements found"`, `current_popularity: null` — under `"status": "healthy"`. Degraded from 2/24h at last teardown | 5 of 14 sources `ok`; 9 carry `last_ok: null` — never once fetched | **PARITY, and it is embarrassing.** Theirs is dead and claims health. Ours has nine pipes that have never read |
| Honest per-source health surface | None | 14 rows, live/stale/no-baseline, "4 live, 1 stale, 9 awaiting a baseline, of 14 sources" | **WE WIN** — but it sits at 64% scroll depth in 137px |
| Top-of-page status claim | `STATUS: OPERATIONAL` | `Sources 14/14 reporting · Status OPERATIONAL` (`layout.mjs:182` counts `ok\|\|uncalibrated` as reporting) | **NEITHER HAS IT.** We copied their worst sin verbatim. This is the exact thing TEARDOWN §3.1 was written to prevent |
| Internal contradiction inside the honesty layer | 4 location counts on one page: header "8 LOCATIONS MONITORED", 6 cards, FAQ "Currently tracking 6 locations", API `totalPlaces 16` | `_parts.mjs:111` renders "no read" when `age===null`; `_parts.mjs:140` prints "Sources awaiting a baseline answered fine" — on the same nine sources | **PARITY** |
| Published cadence claim vs reality | FAQPage: "Data typically updates about every 10 minutes" at 0 scrapes/24h | "recomputed hourly" in `feed.xml`, WebApplication JSON-LD, `/api/index.json`, `/api/state.json._about`, `package.json` — against `/api/history.json` holding **4** observations (20:04, 21:14, 00:04, then a 19-hour gap to 19:08) | **PARITY.** We wrote the rule and then broke it in five places |
| Freshness computed and shown | Computed (`data_freshness: "stale"`), **hidden** from the page | Computed and shown, plus a live "overdue" state that refuses to count down into fiction | **WE WIN** |
| Published methodology + constants | None. `/about` is 78 text lines of nouns | `/methodology`, published gates, frozen reference, `rule_fired` | **WE WIN** |
| Hash-chained receipts, independently recomputable | None | `/api/receipts/{id}.json`, 10,101 bytes, `prev_receipt_hash` chaining to `sha256:1aec140a…` | **WE WIN** — uncontested in the category. It earns links, not clicks |
| Receipt index | n/a | `/api/receipts/` **404s**; receipts reachable only by guessing an id from `state.json` | **NEITHER HAS IT** |
| Headline sub-page stat correct | `/hormuz` prints "ESTIMATED TRADE DISRUPTION … **$0**" beside "4.10B total bbl disrupted / Brent $106.54" (~$437B) | `/watts` prints 54.2 with 9 sources declared and an explicit coverage limit | **WE WIN** |

### 1.3 Content surface and SEO

| Feature | pizzint.watch | DOOMCON | Verdict |
|---|---|---|---|
| Indexable URLs in sitemap | **1,018** (≈996 `/intel/` briefs + 22 hand-built) | **11** | **THEY WIN** — 1.1%. This is the decisive row in the whole file |
| Auto-generated per-item pages | ~996 briefs, ~13.25/day in September (110 May / 219 Jun / 171 Jul / 200 Aug / 318 Sep by lastmod), published ~49 min after the source post | `/moves/` — 4 pages in 23 hours, of which **2** cleared the `SUBSTANTIVE_DELTA=0.5` gate and are indexable. 200 scored news items live on **one** URL | **THEY WIN, decisively.** At our observed rate we reach 1,018 URLs in roughly four years |
| Google News sitemap | See §0.1 — 14 frozen entries or 19 rolling, unresolved | **None** | **THEY WIN** (conditional on §0.1) |
| NewsArticle + Speakable schema | Per brief: NewsArticle, SpeakableSpecification, BreadcrumbList, 3 ListItem, 5 Thing entities, 2 ImageObject, WebPage, 3 Organization, Offer | Dataset, FAQPage, NewsArticle, Event, TechArticle, Report, ItemList across 9 pages | **PARITY in richness, THEY WIN in placement** — Speakable + entity Things on 996 news pages beats richer schema on 9 pages |
| Faceted category/entity pages | **Zero.** `/intel` chips (All/Hot/Ground/Diplomatic/Aerial/Political/Economic/Naval/Nuclear/Cyber, plus Iran, Russia, Strait of Hormuz, Houthis…) are `<button>` with no URL state. `/mentions?q=greenland` returns byte-identical HTML to `/mentions` | **Zero.** Our news pillar filters are CSS `:checked` radios — 5 facets, no URLs | **NEITHER HAS IT** — ~10 categories × 13 entities of ready-made landing pages on their side, 5 pillar facets on ours, all thrown away |
| Evergreen head-term explainers | 4 `/guides/*` (how-polymarket-works, polymarket-vs-kalshi, open-source-intelligence-tools, what-are-midterm-elections), each with FAQPage + BreadcrumbList | `/methodology`, `/history`, `/about` | **PARITY** — and both sides under-invested. Four evergreen pages against 996 news briefs is the wrong ratio on their side too |
| Head-term hijack in the title | `<title>Pentagon Pizza Index — Live DEFCON Level & Doomsday Clock \| PizzINT</title>`; keywords meta: "defcon level today, current defcon level, doomsday clock" | `DOOMCON 4 — ROUTINE · AI activity tempo index` | **THEY WIN** — "what is the current defcon level" is a standing query with no authoritative live answer and they inserted themselves into it. Our title names a term nobody searches |
| Internal linking to own archive | Homepage links 3 briefs; `/intel` renders 32 + "Load more (81 remaining)" = 113 reachable of ~996. ~883 (≈89%) are crawl-orphans reachable only via sitemap | 98 links to 18 unique destinations; every page reachable | **WE WIN on structure, THEY WIN on outcome** — 113 reachable briefs still beats 11 total URLs |
| Related-item graph | 3 "Related Intelligence" links per brief at ~50% similarity, two of them four months stale | None between moves | **THEY WIN**, weakly |
| Soft-404 / duplicate shells | `/whitepaper`, `/verify`, `/event` return 200 with byte-identical homepage meta | Every page also served at a duplicate directory path (`/race/` and `/race.html`); canonicals correct, so harmless | **WE WIN** |
| `changefreq` hygiene | `hourly` declared on 1,003 static briefs, some frozen since May | Correct | **WE WIN** — cosmetic; Google ignores changefreq |

### 1.4 The share loop

| Feature | pizzint.watch | DOOMCON | Verdict |
|---|---|---|---|
| `og:image` on pages | Yes | **Zero on all 10 pages**, while all 10 declare `twitter:card=summary_large_image` | **THEY WIN** — our largest single acquisition hole |
| Card render pipeline | `/screenshot-export` server route, referenced twice in client JS, `Disallow`d in robots.txt | `collector/card.mjs` → `/cards/current.svg` (200, 11,280 bytes), live, in no sitemap, linked from no page, referenced by no meta tag | **THEY WIN** — ours is a finished asset doing zero work |
| Card pipeline wiring | Works | **Broken by build order.** `.github/workflows/collect.yml:376` runs `site/build.mjs`, then `:382` runs `collector/card.mjs`; `build.mjs` clears `public/` first, so `cardResolver` (`build.mjs:303`) probes `cards/{id}.png` → `cards/current.png` → SVGs and finds nothing, so the tag is never emitted. Same order in `news-fast.yml:92` | **THEY WIN** — one-line reorder plus a PNG rasteriser closes it |
| Card format | PNG | SVG only. `build.mjs:312` itself warns "X and most crawlers will not render an SVG og:image" | **THEY WIN** |
| Domain burned into the card | `pizzint.watch`, resolves | `doomcon.watch` — `curl` returns exit 000, **does not resolve**. Printed twice in the live card and in the widget footer (`site/brand.mjs:64`, `collector/card.mjs:34`) | **THEY WIN.** Our X-strategy rule is "no URL in the post, domain burned into the card". The card points at nothing |
| Short-form video pipeline | `/video-export/`, `/pizzint-vertical`, `pizzint-video-proxy.pizzint.workers.dev` | None | **THEY WIN** |
| Share button / copy-link affordance | One `twitter.com/intent` link; zero `navigator.share`, zero `navigator.clipboard` | Zero of both | **NEITHER HAS IT** — and xAI's open-source ranker weights share-via-copy-link at 20.0 against a like at 0.5 |
| `twitter:site` correctness | **Wrong** — points at `@pizzint`; the real account is `@pizzintwatch`. Unfixed since the last teardown | n/a — we have no account | **NEITHER HAS IT** |

### 1.5 Social and off-site distribution

| Feature | pizzint.watch | DOOMCON | Verdict |
|---|---|---|---|
| Own X account | `@pizzintwatch`, **~118K** (was ~79K at last teardown). Posts named venues, exact percentages, DOUGHCON level, and does include outbound links | **None** | **THEY WIN** — the biggest circumstantial gap |
| Link to own X account from the site | **None.** Not in the header, footer or FAQ — while shipping 75 outbound links to the six accounts they scrape. Neither share template @-mentions them | n/a | **NEITHER HAS IT** — they are leaking their own audience to their sources |
| The 399.7K account | `@PenPizzaReport` (Aug 2024, was ~374K) is a **third party they do not control**, posts image cards with no outbound link, amplified by Mario Nawfal | n/a | **NEITHER HAS IT.** **CORRECTION to TEARDOWN §2.4:** this was recorded as pizzint's asset. It is not. It grows the category, not the site |
| Wikipedia presence | "Pentagon pizza theory", 21 refs, 18 language versions, last edited 2026-09-21 — credits `@PenPizzaReport` and **links no tracker site**. Also carries the DoD denial and Zenobia Homan (KCL) on confirmation bias | None | **NEITHER HAS IT.** They are a parasite on a meme they do not own |
| Directory / ecosystem listings | Polymarket Builders badge; listed on polymart.app, polymark.et, pm.wiki | None | **THEY WIN** — cheap, durable, high-intent referral links. **CORRECTION to TEARDOWN §2.5:** the Polymarket relationship is not worthless; the badge and listings are real links |
| Press pickup of record | FlowingData 2026-01-23, fullintel.com, The Business Standard, KuCoin, Queerty (for the Gay Bar Report), New York Post (for the Strip Club Index) | None | **THEY WIN** |

### 1.6 Retention — reaching someone who closed the tab

| Feature | pizzint.watch | DOOMCON | Verdict |
|---|---|---|---|
| RSS / Atom feed | `/rss.xml`, `/feed.xml`, `/feed`, `/api/rss` — **all 404** | `/feed.xml` — 200, RSS 2.0 | **WE WIN** |
| Email capture | **Zero.** No `<form>` elements anywhere; zero mailchimp/substack/beehiiv/convertkit/buttondown strings across 48 chunks | **Zero** | **NEITHER HAS IT** — and this is the single cheapest uncontested retention channel in the category |
| Web push | Zero `Notification.requestPermission`, `pushManager`, `serviceWorker.register`, `EventSource` across all chunks | None | **NEITHER HAS IT** |
| PWA / installability | `/manifest.json` 404, `/sw.js` 404 | None | **NEITHER HAS IT** |
| Accounts / watchlists / alerts | None. The only persistent identity is `peteza_device_id`, written by their canvas game | None | **NEITHER HAS IT** |
| Per-visitor return state | 3–5 localStorage keys, all UI preferences | `doomcon.visit.v1` — "Since you looked · 6h 00m ago · ▲ 38.2 → 41.5 · level 5 → 4 · ROUTINE · 2 new observations" (verified by planted record; see §0.2) | **WE WIN** — the best repeat-visit mechanic in the category, at 34px, under a status rail that is lying. **CORRECTION to VISITORS §3:** cluster K (the returner, 7 of 100) is no longer served by neither |
| A reason to return that changes | Polymarket odds move continuously; the Hormuz closure countdown ticks (208 days 19 hrs…) | "What would move it" — 12 published gates with current readings ("Composite above 58.0 — now 41.5 · 16.5 below that mark — not met") | **WE WIN on quality, THEY WIN on volume.** Ours changes ~4×/day because the collector ran 4 times in 23 hours |
| Live refresh loop | 15s hot / 30s cold / 120s hidden, jittered | 60s, defers while hidden, backs off [0, 120s, 300s], prints "REFRESH STOPPED" after 3 failures | **THEY WIN on cadence, WE WIN on honesty** — and ours is capped by data that changes 4×/day, not 1,440× |
| Daily artifact | None | `/digest.html` — corroboration rule, 6 items from 108 candidates, names the 17 held back | **WE WIN** — with no delivery mechanism, so a visitor must remember to come back |

### 1.7 Depth and session mechanics

| Feature | pizzint.watch | DOOMCON | Verdict |
|---|---|---|---|
| In-place dataset switcher | **6** tabs (Pizza Cards, HormuzHub, Gay Bar Report, Strip Club Index, Map View, Commute Index). **CORRECTION to ENGAGEMENT §0: six, not seven** | **7** panels (Signal 200, The race 8, Watch floor 8, X wire 14, Substrate 9, Digest 6, Bliss 0), pure CSS `:checked`, works with JS off | **WE WIN on execution** — and both sides collapse indexable pages into one URL |
| Share of homepage height selling another page | **26.5%** | **43.5%** — `nav.fb` 58px + `#sw` 1,927px + `footer.foot` 657px of 6,071px at 1024×768. **CORRECTION to ENGAGEMENT §0: the 3.6% figure is obsolete**; the "Elsewhere on the desk" section it measured no longer exists | **THEY WIN.** We now sell harder than the site we criticised for selling hard |
| Independent datasets on the homepage | ~12, four named indices | ~7 panels over 5 pillars | **THEY WIN** |
| Novel angle modules | Gay Bar Report (earned a Queerty writeup), Gentlemen's Dispatch / Strip Club Index (New York Post), Commute Index / OPTEMPO, `/intelcams` live cameras, Polyglobe, a canvas game with a leaderboard | `/race`, `/watts`, `/bliss`, `/digest` | **THEY WIN on number and press yield** — the Gay Bar Report is a genuinely press-quotable inversion and it won them a link the pizza index alone would not have |
| Best sub-page | `/hormuz` — PortWatch arrivals, Windward cross-check, 49 OFAC sanctioned vessels, UKMTO alerts, 127 ships, closure-risk markets, a running "208 DAYS 19 HRS" counter. Holds "Strait of Hormuz map" | `/race.html` — 8 labs with live Polymarket probability, shipping velocity, mindshare, compute proxy, principal loudness; ItemList + Person + Dataset; linked 14× from the homepage | **PARITY** — both are the strongest non-flagship page each side owns. Theirs prints `$0` for its headline stat; ours has no `og:image` |
| Accessibility of the switcher | All six tabs `aria-label: null`. The HormuzHub button's `innerText` is `@keyframes home-hormuz-tab-radar-sweep { from { transform: t…` — an inline `<style>` inside the `<button>` leaking into its accessible name | Full aria labels per oven stage | **WE WIN** |

### 1.8 Performance and technical

| Feature | pizzint.watch | DOOMCON | Verdict |
|---|---|---|---|
| Page weight / speed | 89 resources, 108 images, 1,335KB, 1,334ms. HTML 1,365,925 B + 26 chunks at 911,858 B = 2.28 MB first load | **1** external request, 249KB decoded, 248ms `loadEventEnd`, 0 images, 53 inline SVGs | **WE WIN, decisively** |
| Public JSON API, documented | Endpoints reachable (`/api/dashboard-data` returns 42,392 B to anonymous curl) but `Disallow: /api/` in robots.txt, **no CORS header**, and the only documented endpoint — `/.well-known/api-catalog` + an OpenAPI 3.1 doc at `/.well-known/service-desc` — is `/api/scraper-status`, the health check that publishes evidence of their own failure. **CORRECTION to TEARDOWN §5: "they ship no public API" is too strong** | 10 documented endpoints, `access-control-allow-origin: *`, `cache-control: max-age=600`, a real discovery doc at `/api/index.json` with an endpoints map and a receipt URL template | **WE WIN** — theirs is an accident nobody can build on |
| OpenAPI spec | One endpoint, robots-disallowed | `/openapi.json` **404s** | **NEITHER HAS IT** properly |
| Embeddable widget | `/embed` and `/widget` both **404** — as they do on all five AI competitors | `/embed.html`, 12,801 B, server-rendered, no script dependency, no tracking, `?theme=` and `?compact=`, `noindex,follow`, links back `target=_blank rel=noopener` | **WE WIN** — uncontested in the entire category |
| Widget truthfulness | n/a | **Prints "41.5 / 100 · all sources live".** `embed.mjs:46` is `state.degraded ? 'degraded' : 'all sources live'`, and `degraded` is false because Markets is `uncalibrated` not `dark` | **THEY WIN by omission.** This is the artifact we put on *other people's* sites; it is our most-distributed false claim |
| Analytics | GA4 `G-C0KL6MXD1W`, Microsoft Clarity `wcsi8nmx15` (session replay + heatmaps), Cloudflare RUM | **None** | **THEY WIN.** Three measurement stacks against zero. They can see what works; we cannot |
| Internationalisation | 11 locales (en, ru, cn, es, de, ar, fr, uk, ja, ko, he) via `/api/translate/batch`, persisted in localStorage — with **zero** hreflang, `html lang="en"` on every page, `/ru` 404, `?lang=ru` returns English, no localised URLs in the sitemap | English only | **NEITHER HAS IT.** They paid the entire translation cost and captured none of the search value. Wikipedia's article exists in 18 languages; that demand is unclaimed by anyone |
| robots.txt hygiene | Discloses 21 unshipped internal paths: `/auto-reply-admin`, `/social-admin`, `/marquee-lab`, `/screenshot-export`, `/video-export/`, `/neh-grid`, `/pizzint-vertical`, `/usni-debug`, `/_polyglobe`, `/electionhub/midterms-debug`, `/verify`, `/event`, `/maintenance` | Clean | **WE WIN** — and their leak is free competitive intelligence for us |
| Dead code in the tree | n/a | `site/templates/_whatchanged.mjs`, 15,750 bytes, one reference in the whole repo — a comment inside itself. Unwired for the fifth consecutive audit | **THEY WIN by omission** |

### 1.9 Monetisation

| Feature | pizzint.watch | DOOMCON | Verdict |
|---|---|---|---|
| Display ads | Fuse Platform → Google Ad Manager, 125 SSPs provisioned in `ads.txt`. Fired zero requests on every recorded pageview — cannot tell if gated or off | None | **WE WIN on page integrity**, irrelevant to traffic |
| Tips | Ko-fi, 8 references on the homepage | None | **PARITY** — neither is a traffic mechanism |
| Affiliate conversion | Polymarket "Trade on Polymarket →" CTAs on every brief with a match %; bare UTMs, no referral code visible | None | **THEY WIN** on product/monetisation fit — tweet → market match is the only genuinely original interaction on their site |
| Token | **$PPW** on Solana, BagsApp launch, ~$318/24h volume on Meteora, a `/whitepaper` route that is not actually built | None | **NEITHER HAS IT, and we should keep it that way.** A tracker that issues a token reprices its own credibility. This is the flank to contrast against, never to mirror |

### 1.10 Open ground — neither has it

Collected from the rows above for §5.

| Feature | Status |
|---|---|
| Email / newsletter capture | Neither |
| Web push or any alert a user can subscribe to | Neither |
| PWA / installable / offline | Neither |
| Accounts, watchlists, saved views | Neither |
| Faceted URL-bearing category and entity pages | Neither (both have the chips, neither has the URLs) |
| hreflang and localised URLs | Neither (they have 11 translations and no URLs; we have neither) |
| A share/copy-link button | Neither |
| Wikipedia citation | Neither |
| A correct `twitter:site` | Neither |
| A receipt/archive index page | Neither |
| An honest top-of-page status line | Neither |
| Embeddable widget with a true status string | We have the widget; nobody has the true string |

---

## 2. THE HONEST STANDING

We are losing on traffic by roughly two orders of magnitude and we cannot prove
it, because we ship no analytics. They have 1,018 sitemap URLs to our 11 — we
are at 1.1% of their indexable surface, and our long-tail engine has produced
four pages in twenty-three hours of which two are indexable, which puts 1,018
URLs about four years away at the observed rate. They have an X account with
~118K followers, a third-party account with 399.7K growing the category for
free, a Wikipedia article in 18 languages, three prediction-market directory
listings, a Polymarket Builders badge, and press pickup from FlowingData,
Queerty and the New York Post. We have two git commits and no account anywhere.
On repeat visits both sites are close to zero, which is the only encouraging
sentence in this paragraph: their entire return apparatus is three to five
localStorage keys holding UI preferences, no feed, no push, no email, no PWA and
no accounts, so nothing on that site can reach a person who has closed the tab
except an X post — and we already ship an RSS feed and a working per-visitor
"since you looked" diff that they do not have. But we have built a far better
instrument and a far worse growth machine: of the ~56 features inventoried on
our side, 13 do acquisition work, 9 do retention work, **0 do conversion work**,
and 26 do nothing measurable for traffic at all. Worse, the three defects that
most damage us are ours alone and were avoidable — every share renders a blank
card because we have no `og:image`, our hero prints the *previous* score in any
backgrounded tab, and our status rail and our embeddable widget both print a
confident health claim over nine sources that have never once read. We wrote
`TEARDOWN.md` §3.1 specifically to avoid becoming that, and we became it. The
honest summary: **they are beating us on distribution while their product is
visibly broken; we are beating them on product while our distribution does not
exist.** Distribution compounds and product does not, so today we are losing.

---

## 3. WHAT THEY HAVE THAT WE DO NOT — ranked by traffic impact

### Worth building

**1. ~996 indexable per-item pages. (Highest impact by a wide margin.)**
Their 200-item-per-day equivalent is 996 URLs; ours is one page, `/news.html`.
Every one of our 200 daily scored news items is a page we are choosing not to
publish. TEARDOWN §2.3 called this "the single most important finding" and we
then did not build it.
*Cost:* the hard part is already done — items are scored, pillared, dated and
carry a decomposition. One template plus a slug scheme plus sitemap emission.
Two to three days.
*Caveat that changes the shape:* if §0.1 resolves to "news sitemap is rolling",
the value of these pages is perishable Google News traffic with a ~48h half-life
per unit, not a durable library — which means the win comes from *cadence*, not
from the archive, and the archive is a byproduct. If it resolves to "frozen",
build them as evergreen entity pages instead. **Resolve §0.1 first.**
*Worth it:* yes, unconditionally. Only the framing changes.

**2. An X account.** They have ~118K and a template worth copying verbatim
(named place, qualitative level, exact clock time with timezone, day-of-week
baseline, attached image, no outbound link) — and they post the calm days, which
is where the credibility comes from. We have nothing.
*Cost:* an afternoon to open, then a permanent posting obligation. The card
pipeline (§4 item 1 of the plan) is a hard prerequisite: an image-only account
with no image is nothing.
*Worth it:* yes. It is the only channel in this category that produces a spike.

**3. `og:image` on every page + a PNG card pipeline.** They have it; we have a
finished SVG card, live at `/cards/current.svg`, linked from nowhere and
referenced by no meta tag, burning a domain that does not resolve.
*Cost:* reorder two CI steps, add a rasteriser, point `brand.DOMAIN` at a domain
that exists. Half a day.
*Worth it:* yes. Cheapest high-impact item on the list.

**4. Faceted, URL-bearing category and entity pages.** Neither side ships them,
but they have the raw material for ~10 categories × 13 entities and we have five
pillars plus every lab on `/race`. Listed here rather than in §5 because they
are closer to shipping it than we are.
*Cost:* one day once per-item pages exist; the facets are the same query.
*Worth it:* yes, immediately after item 1.

**5. Analytics.** GA4 + Clarity + Cloudflare RUM against our nothing. We cannot
run a traffic plan blind, and every item in §7 has a success criterion that is
currently unmeasurable.
*Cost:* one hour for a privacy-respecting counter. We should not ship session
replay; it contradicts the product.
*Worth it:* yes, and it should be the first thing, not the fifth.

**6. Head-term hijack in the title.** `Pentagon Pizza Index — Live DEFCON Level
& Doomsday Clock` targets queries with standing volume. `DOOMCON 4 — ROUTINE ·
AI activity tempo index` targets a term nobody types.
*Cost:* one line in `layout.mjs`, plus honesty discipline so we do not claim to
be something we are not.
*Worth it:* yes — but only with a term we can actually answer. "AI risk level
today" and "is AI getting more dangerous" are ours to take; "doomsday clock" is
theirs and is already crowded.

**7. Ecosystem and directory listings.** Their Polymarket Builders badge plus
three directory listings are durable, high-intent referral links for near-zero
effort. Our equivalent surface is different and better: **we are the only site
in the category with a documented, CORS-enabled JSON API and an embeddable
widget**, which is exactly what gets a project listed in developer directories,
dataset indexes and "awesome-" lists.
*Cost:* a day of submissions.
*Worth it:* yes.

**8. A lore band inlined on the homepage.** Theirs is ~50% of homepage height,
indexable, and does the work of making a gimmick read as a tradition. Ours is on
`/history.html` where it earns nothing for the page people actually land on.
*Cost:* a move and a condense. One day.
*Worth it:* yes, but after the structural items.

### Not worth building

**9. A second, third and fourth named index on the same screen.** They run
DOUGHCON, OPTEMPO, NEH and a GDELT bilateral monitor simultaneously. Three of
the four are stale, broken or invisible to crawlers, and the net effect is that
no single number is the one people quote. We already have this problem in
miniature with BLISS printing no number. **Not worth copying — worth actively
resisting.**

**10. An 11-language client-side translation layer.** The largest single piece
of wasted work on their site: eleven locales, zero hreflang, `html lang="en"`
everywhere, `/ru` 404s, no localised URLs in the sitemap. They paid the whole
cost and captured none of the value. *If* we ever internationalise, we do it as
statically-generated locale URLs with hreflang, which is the cheap half. The
runtime translation layer is the expensive, worthless half.

**11. Display advertising and a 125-SSP stack.** It taxes a 2.28 MB page that is
already too slow, and it cheapens the credibility that is our actual product.
TEARDOWN §5 already ruled on this and the ruling stands.

**12. A token.** `$PPW`, ~$318/24h volume, with a whitepaper page that is not
built. A measurement instrument that issues a token is read as a pump, and it
converts every future accuracy dispute into a motive dispute. This is a flank to
contrast against publicly, never to mirror.

**13. A canvas game.** Their PETE-ZA game is the only thing on their site that
writes a persistent device id, which is a tell about how little else does — but
a game is a large build whose retention accrues to the game, not to the index.

**14. `/intelcams` live camera feeds.** Genuinely sticky, and completely
unavailable to us: there is no camera pointed at AI capability. Structural, not
circumstantial. Skip.

**15. Their related-item graph.** Three links at ~50% similarity, two of them
four months stale, is a thin graph doing thin work. When we build per-item
pages we should link by entity and pillar, not by a similarity score.

---

## 4. WHAT WE HAVE THAT THEY DO NOT — ranked, with the zero-traffic count up front

**Of the eleven differentiators below, seven currently generate no traffic at
all, and two of them are actively costing us traffic.** A differentiator nobody
sees is not one.

**1. The scalar is in the served HTML. (Real advantage, currently sabotaged.)**
Their prerender ships `LOADING TACTICAL DATA...`; ours ships
`<title>DOOMCON 4 — ROUTINE · AI activity tempo index</title>` and the digits in
the H1, hero and meta description. Crawlers see our number and not theirs. A
screenshot taken before hydration shows our number and not theirs.
*Traffic today:* would be large — except the hero count-up calls
`pt(C.prevScore)` synchronously, so a link opened in a background tab shows the
**previous** score with no `visibilitychange` repaint to correct it. We mocked
them for an empty screenshot and shipped a confidently wrong one. **Net: costing
us traffic until fixed.**

**2. The embeddable widget. (Uncontested in the category, currently lying.)**
`/embed` and `/widget` 404 on pizzint and on all five AI competitors. Ours is
12,801 bytes, server-rendered, script-free, tracking-free, themeable, and links
back. Every placement is a backlink and a permanent impression surface.
*Traffic today:* zero placements, because nobody has been asked. And it prints
"all sources live" over nine sources that have never read — so the first thing
a placement distributes is a false claim. **Net: zero, trending negative.**

**3. The documented, CORS-enabled public JSON API.** Ten endpoints,
`access-control-allow-origin: *`, a real discovery document with an endpoints
map and a receipt URL template. Theirs is robots-disallowed with no CORS header,
and the one endpoint they document is the health check that publishes their own
failure.
*Traffic today:* zero. No endpoint is in the sitemap, `/openapi.json` 404s, and
no directory knows it exists. **This is the highest-leverage unused asset we
own** — every third-party integration is a backlink.

**4. Hash-chained receipts and a published methodology.** `prev_receipt_hash`
chaining, full inputs, constants, reference, decision and `rule_fired` per
observation. No competitor in the category — not pizzint, not DoomBench, not the
IMD clock, not skynetcountdown — can be independently recomputed by a stranger.
*Traffic today:* zero clicks, and that is the right expectation. It earns links
and citations, not sessions. But `/api/receipts/` 404s, so even the links have
nowhere to point.

**5. "What would move it" — the published gates as live numbers.** Twelve rows:
`Composite above 58.0 — now 41.5 · 16.5 below that mark — not met`,
`Since last change 6h minimum — held 23h — met`. Nothing in the category has
an equivalent, and it is the best answer to "why should I come back tomorrow"
either site has produced.
*Traffic today:* retention only, unmeasured, and capped by the fact that the
underlying number moves ~4 times a day.

**6. "Since you last looked." (Verified working; see §0.2.)** Per-visitor
localStorage diff: elapsed time, score delta, level change, new observation
count. pizzint's entire localStorage surface is UI preferences.
*Traffic today:* repeat-visit value only, at 34px, beneath a status rail that
is printing a false claim. It deserves the prominence that rail currently has.

**7. `/feed.xml`.** They 404 on `/rss.xml`, `/feed.xml`, `/feed` and `/api/rss`.
An RSS feed is the only mechanism either site has for reaching a departed
visitor without a platform in between.
*Traffic today:* near zero — two items, no `<link rel="alternate">` promotion
that anyone has been told about, and no subscriber acquisition path.

**8. Page weight and speed.** One external request, 249KB, 248ms, zero images,
53 inline SVGs, against 89 resources / 1,335KB / 1,334ms. Everything is in the
static HTML.
*Traffic today:* a ranking input and a bounce-rate input. Real but diffuse, and
unmeasurable without analytics.

**9. Richer structured data.** Dataset, FAQPage, NewsArticle, Event,
TechArticle, Report, ItemList across 9 pages against their WebApplication +
FAQPage on the homepage.
*Traffic today:* small. Dataset schema wins Dataset Search, which is a thin
channel. Their NewsArticle + Speakable on 996 pages beats our richer schema on 9
— placement beats richness.

**10. Honest degradation.** Per-source health rows, an explicit `uncalibrated`
vs `dark` distinction, "no baseline · no read", an "overdue" state that refuses
to count down into fiction, `/watts`'s printed coverage limits, `/digest`'s
named held-back items.
*Traffic today:* zero, and it is the credibility substrate that everything else
rests on — which is exactly why the 14/14 status rail and the widget's "all
sources live" are not cosmetic bugs. They are the product contradicting itself
in its two most-distributed surfaces.

**11. Accessibility and JS-off operation.** Seven-panel switcher and five news
facets are pure CSS `:checked`; full aria labels per oven stage. Their six tabs
have `aria-label: null` and one announces a CSS keyframe block as its name.
*Traffic today:* zero. Correct, and not a growth mechanism.

**Scorecard:** items 1, 2, 4, 6, 7, 10 and 11 generate essentially no traffic
today. Items 1 and 2 are net negative until their defects are fixed. The three
things standing between us and their traffic are not more features — they are a
working `og:image`, a URL count above 11, and any analytics at all.

---

## 5. WHAT NEITHER HAS — the open ground, ranked

This is where a challenger normally wins, because it needs no head start.

**1. Email. Nobody in this category has a newsletter.** Zero `<form>` elements
and zero ESP strings across all 48 of their chunks; zero on our side. A daily or
threshold-triggered email is the only retention channel that survives a platform
change, an algorithm change and a tab close, and we already produce the artifact
that fills it — `/digest.html`, with a corroboration rule and named held-back
items. *Cost: a day plus a provider. Highest-value open ground on the board.*

**2. A subscribable alert on a threshold crossing.** They render an `isAlert`
boolean in their feed payload and give a user no way to subscribe to it. We
publish twelve explicit gates and no way to be told when one fires. Web push or
email-on-crossing turns a one-time visitor into a recurring one without needing
them to remember us. *Cost: two days on top of item 1.*

**3. Faceted URL-bearing pages.** Both sides built the filter chips and neither
emitted a URL. Theirs: ~10 categories × 13 entities. Ours: 5 pillars × 8 labs.
These are landing pages that already exist as queries and need only routing.
*Cost: one day once per-item pages exist.*

**4. The category's Wikipedia citation.** The "Pentagon pizza theory" article —
21 refs, 18 languages, edited three days ago — credits a third-party X account
and links no tracker site at all. For AI there is no equivalent article yet and
no incumbent citation. The site that becomes the standard reference for
"measured AI activity tempo" owns a permanent, compounding, un-buyable link.
Our receipts and published methodology are precisely what makes a source
citable; theirs is precisely what does not. *Cost: months, indirect, and it is
earned rather than built.*

**5. Localised URLs with hreflang.** They built eleven translations and zero
indexable locale pages. Wikipedia proves the international demand exists in 18
languages. Static locale URLs with hreflang capture the half of the work that
has the value. *Cost: moderate. Do not do the runtime-translation half.*

**6. An honest top-of-page status line.** Both sites print a confident
`OPERATIONAL` over pipes that are not reporting. The first one to print
`4 of 14 sources live` at the top of the page, in the same type size as the
number, wins an argument the other cannot answer — and it is the argument this
whole project exists to have. *Cost: one line. It is a lever, not a chore.*

**7. A share / copy-link affordance.** Neither has `navigator.share` or
`navigator.clipboard`; theirs has one `twitter.com/intent` link. Copy-link
sharing is weighted 20.0 against a like at 0.5 in xAI's open ranker, and neither
site makes it a single tap. *Cost: an hour.*

**8. Accounts, watchlists, saved views.** Nobody has them. The lightest viable
version — a watchlist held in the browser, no login — serves the returner
cluster and costs one localStorage key. *Cost: a day.*

**9. A machine-readable, listed, versioned API.** We have the endpoints;
nobody has the OpenAPI spec, the sitemap entries, the changelog or the directory
listings that turn endpoints into integrations. *Cost: a day.*

**10. Short-form video.** They have the routes (`/video-export/`,
`/pizzint-vertical`, a Cloudflare video proxy) and have shipped nothing visible
through them; no AI competitor has touched it. An unclaimed channel, but an
expensive one. *Ranked last deliberately — it is open ground we should note and
not walk onto yet.*

---

## 6. STRUCTURAL VERSUS CIRCUMSTANTIAL

The distinction matters because circumstantial advantages can be attacked with
work and structural ones can only be routed around.

### Structural — theirs, permanently

**S1. They were early to a meme with a three-year head start and a
pre-existing cultural anchor.** "Pentagon pizza" has documented lore going back
to the 1980s, a TIME citation from 1990, a Wolf Blitzer line, and a Wikipedia
article in 18 languages that predates and outranks their site. We cannot be
early to that, and AI has no equivalent single-image premise. This is the one
that cannot be bought back.

**S2. The premise compresses into four words and needs no legend.** "Pentagon
pizza index" explains itself in a headline, a group chat and a tweet. "AI
activity tempo index" does not. We can improve our phrasing; we cannot make our
subject as immediately funny as pizza, because the joke is doing the
explanatory work.

**S3. Their subject generates discrete, dateable, geolocatable events.** A
strike, a transit, a vessel seizure. Google News and Discover are built for
exactly that shape. AI capability moves in diffuse announcements without a
timestamp anyone agrees on. Our content engine will always run at a lower event
rate — which is the real reason our collector produced four observations in
twenty-three hours while they published thirteen briefs.

**S4. A live camera pointed at the thing.** `/intelcams` works because ports and
streets are filmable. There is no camera pointed at a training run.

### Circumstantial — theirs, attackable

**C1. ~118K followers on `@pizzintwatch`.** Built in fourteen months from zero.
Circumstantial by definition, and note they do not link it from anywhere on
their own site while shipping 75 outbound links to the accounts they scrape.

**C2. 399.7K on `@PenPizzaReport`.** Not theirs, links nothing, and amplifies a
category rather than a site. Attackable in the sense that it was never their
advantage to begin with. **CORRECTION to TEARDOWN §2.4.**

**C3. 1,018 sitemap URLs.** Produced by a template running on a cron since May.
Pure accumulated cadence. We can match the machinery in three days; we cannot
match the accumulated months, which is why starting today rather than next month
is the whole argument.

**C4. Google News standing** (conditional on §0.1). Earned by publishing
consistently into a news sitemap. A channel we can enter with two files.

**C5. Press pickup and three directory listings.** Outreach and a badge
application. Replicable.

**C6. GA4 + Clarity.** Two script tags.

**C7. Four evergreen `/guides/*` pages.** Four pages of writing.

**C8. Their lore band being inline and indexable while ours sits on a separate
page.** A file move.

### Structural — ours, permanently

**S5. Our number can be independently recomputed by a stranger.** Same code,
same public data, same number, with a hash-chained receipt per observation.
Theirs cannot, DoomBench's cannot, the IMD clock's cannot, skynetcountdown's
cannot. Every competitor in this category scores by human or LLM judgment. This
is not a feature anyone can copy in a sprint — it constrains the entire
architecture from the collector outward, and their architecture forecloses it.

**S6. Our subject is the one growing.** Pizzint's rank trajectory (best
#51,512, now #242,532 — low-confidence, not traffic) is consistent with a meme
past its spike. Half of US adults report concern about AI and the trend is
upward across three waves. Attention is moving toward our subject and away from
theirs.

**S7. Static generation makes the scalar unconditionally visible.** Their
flagship page is client-rendered and their growth loop is screenshots. Fixing it
means rewriting the page everyone knows. Ours is right by construction — once we
stop overwriting it in JS.

### Circumstantial — ours, and it is all of the bad news

Eleven sitemap URLs. No `og:image`. No X account. No analytics. No email. A card
pipeline that runs after the build that needs it. A domain that does not
resolve. A status rail that lies. A widget that lies. Four observations in
twenty-three hours against a published claim of hourly. **Every single one of
these is fixable in under a week of work, which is the genuinely encouraging
finding in this document: we are not losing on anything structural.**

---

## 7. THE PLAN

Two tracks, kept separate on purpose. Acquisition brings strangers; retention
brings the same people back. Conflating them is the usual mistake and it is why
a site ends up with seven switcher panels and no newsletter.

Every step names its mechanism and its falsifiable success criterion. Nothing
after Day 1 is measurable until analytics ships, which is why analytics is
Day 1.

### Phase 0 — Stop lying and stop leaking. 2026-09-25 to 2026-09-26.

Nothing below this line works while the two most-distributed artifacts we own
print false claims.

| # | Date | Action | Track | Mechanism |
|---|---|---|---|---|
| 0.1 | 09-25 | Ship a privacy-respecting analytics counter. No session replay — it contradicts the product | both | Every subsequent step becomes measurable. Without it this plan is faith |
| 0.2 | 09-25 | Fix the hero count-up: repaint the true score on `visibilitychange`, or render the final value and animate only when visible | acquisition | A backgrounded tab is how social links are consumed. Restores the server-render advantage we claim as our headline |
| 0.3 | 09-25 | Fix the status rail. Print `4 of 14 sources live` in the same type size as the number. `layout.mjs:182`, and the `_parts.mjs:140` "answered fine" string | both | Removes the contradiction at 0% scroll depth, and converts our biggest liability into the argument the project exists to make |
| 0.4 | 09-25 | Fix `embed.mjs:46`. The widget states the true source count | acquisition | It is the artifact on other people's sites |
| 0.5 | 09-25 | Re-fetch `/news-sitemap.xml` and resolve §0.1 before Phase 1 is scoped | — | Decides whether Phase 1 is a freshness play or an evergreen play |
| 0.6 | 09-26 | Register a domain that resolves, or point `brand.DOMAIN` at the live GitHub Pages URL. Every card currently burns `doomcon.watch`, which returns exit 000 | acquisition | A card that points nowhere converts nothing |
| 0.7 | 09-26 | Delete or wire `_whatchanged.mjs`. Fifth audit | — | Tree hygiene |
| 0.8 | 09-26 | Replace the five "recomputed hourly" strings with what the record supports, or make the cron actually hold | both | We catalogued this exact sin in their FAQPage. It is the one claim a hostile reader will check first |

*Success criterion:* `/api/health.json` source counts and the rendered rail
agree; the widget string matches `health.json`; a cache-busted fetch in a hidden
tab shows the current score.

### Phase 1 — The share loop. 2026-09-26 to 2026-09-28. ACQUISITION.

| # | Date | Action | Mechanism |
|---|---|---|---|
| 1.1 | 09-26 | Reorder CI: `collector/card.mjs` **before** `site/build.mjs` in `collect.yml` and `news-fast.yml`. Add a PNG rasteriser so `cardResolver` finds `cards/current.png` | `build.mjs:312` already warns that an SVG og:image will not render. One line of order, one rasteriser |
| 1.2 | 09-27 | Emit `og:image` and `twitter:image` on all 10 pages | Every link on X, Slack, Discord, iMessage and LinkedIn currently renders a bare text card. This is the largest single acquisition hole on the site |
| 1.3 | 09-27 | A copy-link button on the hero and on every card | Copy-link is weighted 20.0 vs 0.5 for a like in xAI's open ranker. Neither site has one |
| 1.4 | 09-28 | Open the X account. Post the calm days. Copy their template exactly: named subject, level, exact clock time with timezone, baseline, attached card, **no outbound link**. Set `twitter:site` correctly — theirs is still wrong | The only channel in this category that produces a spike. The $0.200-with-link vs $0.015-without surcharge is why the domain goes in the card, enforced by a pre-flight regex |

*Success criterion:* a link pasted into X renders a card carrying the number and
a domain that resolves. Ten posts in the first week, at least six of them on
days when nothing moved.

### Phase 2 — The URL count. 2026-09-29 to 2026-10-03. ACQUISITION.

This is the decisive phase. Eleven URLs is the number that loses.

| # | Date | Action | Mechanism |
|---|---|---|---|
| 2.1 | 09-29 → 10-01 | One indexable page per scored news item. The scoring, pillaring, dating and decomposition already exist; this is a template, a slug scheme and sitemap emission. Keep a substantive-content gate so thin pages are `noindex` — the gate is right, the input rate is the problem | Their 996 briefs against our one `/news.html`. 200 items/day is 200 pages/day we are choosing not to publish |
| 2.2 | 10-01 | Ship `news-sitemap.xml` with `news:keywords`, plus `NewsArticle` + `SpeakableSpecification` on every item page | Conditional on §0.1. If their channel is live, this is the largest single channel in the category. Speakable also targets voice and AI-summary surfaces |
| 2.3 | 10-02 | Faceted URL pages: `/pillar/capability`, `/lab/anthropic`, and the same for every entity that appears more than N times | ~5 pillars × 8 labs × entities. Both sides built the chips and neither emitted a URL |
| 2.4 | 10-02 | Entity-and-pillar internal linking between item pages, replacing nothing (we have no related graph). Three to five links per page, recency-weighted | Their related graph is three links at ~50% similarity, two of them four months stale. Ours should be better by construction |
| 2.5 | 10-03 | Fix the `/moves/` input rate. Four observations in twenty-three hours is the upstream cause of two indexable move pages | Cadence, not template, is the bottleneck |

*Success criterion:* sitemap above 300 URLs by 10-03 and above 1,018 by
2026-10-20. Indexed-page count in Search Console trending, not sitemap count.

### Phase 3 — Retention. 2026-10-03 to 2026-10-08. RETENTION.

The whole of §5's top two items. Neither competitor has any of this, and it is
the half of the goal — repeat users — that Phases 1 and 2 do not touch.

| # | Date | Action | Mechanism |
|---|---|---|---|
| 3.1 | 10-03 | Email capture on the homepage and on `/digest.html`. One field, one sentence | The only retention channel that survives a platform change. Zero `<form>` elements exist on their entire site |
| 3.2 | 10-05 | Daily digest email, built from `/digest.html`, which already applies a corroboration rule and names its held-back items | We already produce the artifact. It currently requires the reader to remember us |
| 3.3 | 10-06 | Alert-on-gate-crossing, email first, push second. We publish twelve explicit thresholds and no way to subscribe to any of them | They render an `isAlert` flag and give a user no way to act on it. This is the clearest open ground on the board |
| 3.4 | 10-07 | Promote "Since you last looked" to the position the false status rail occupied. It is 34px today | Verified working (§0.2). The best repeat-visit mechanic in the category, invisible |
| 3.5 | 10-07 | Promote `/feed.xml`: `<link rel="alternate">` on every page, a visible subscribe affordance, more than two items | They 404 on all four feed paths. We ship a feed nobody has been told about |
| 3.6 | 10-08 | A browser-held watchlist — labs, pillars, gates — with no login | Serves the returner cluster (`VISITORS.md` cluster K) for one localStorage key |

*Success criterion:* measurable returning-visitor share by 10-15, and a
subscriber count above zero, which is where it is today.

### Phase 4 — Off-site surface. 2026-10-08 to 2026-10-15. ACQUISITION.

| # | Date | Action | Mechanism |
|---|---|---|---|
| 4.1 | 10-08 | Ship `/openapi.json`, put the API endpoints in the sitemap, add an index at `/api/receipts/` (currently 404) | We own the only documented CORS-enabled API in the category and nothing points at it |
| 4.2 | 10-09 | Submit to developer directories, dataset indexes, public-API lists and "awesome-" repos | Their equivalent — the Polymarket Builders badge and three PM directories — is durable high-intent referral. Ours is the API and the widget, which is a better fit for that kind of list |
| 4.3 | 10-10 | Actively place the widget. Ten targeted asks to AI newsletters, dashboards and aggregators | `/embed` and `/widget` 404 on pizzint and on all five AI competitors. Every placement is a backlink and a permanent impression |
| 4.4 | 10-13 | Move the lore band onto the homepage, condensed and indexable. Real AI history, properly sourced — Good 1965, Dartmouth 1956, the 2023 pause letter | Theirs is ~50% of homepage height and is what makes a gimmick read as a tradition |
| 4.5 | 10-14 | Re-title for a head term we can honestly answer — "AI risk level today", not "doomsday clock" | Their `<title>` hijack is likely their largest evergreen channel. Ours names a term nobody searches |
| 4.6 | 10-15 | Cut the homepage cross-sell from 43.5% back under their 26.5% | We now sell another page harder than the site we criticised for it. `#sw` alone is 1,927px of 6,071px |

*Success criterion:* five external widget placements and ten referring domains
by 2026-11-01.

### What is deliberately not in this plan

No second named index until DOOMCON is the number people quote — BLISS ships a
number or comes off the feature bar, because two of eight cells printing `·`
reads as broken. No token, ever. No display ads. No runtime translation layer.
No game. No short-form video before 2026-11. No new data sources at all until
the nine sources with `last_ok: null` either read or are removed — adding a
tenth dark pipe makes the honesty problem worse, not the instrument better.

---

## 8. WHAT WOULD MAKE THIS PLAN WRONG

Six load-bearing assumptions, each with the evidence that would falsify it.

**A1. Their traffic is real and worth taking.**
The whole plan assumes there is traffic at pizzint.watch to compete for. We have
no analytics access, no SimilarWeb, and the only third-party signal is an
ipaddress.com rank series (best #51,512, worst #294,189, now #242,532) that is
low-confidence and is not traffic. *Falsified by:* any credible traffic estimate
showing the site is small in absolute terms. *If false:* the ranked order still
holds, because the plan is mostly "build the distribution a site of any size
needs", but the urgency drops and we should target the category's search demand
directly rather than their specific pages.

**A2. The `/intel` corpus earns meaningful traffic.**
Depends entirely on §0.1. If the news sitemap is frozen at 2026-06-25, their
briefs earn little and they ramped output from 5.5/day to 13.25/day into a dead
channel — which would mean Phase 2 should be built as evergreen entity pages,
not as a freshness engine. *Falsified by:* the re-fetch in step 0.5. **Resolve
this before scoping Phase 2.** This is the single largest risk in the file.

**A3. Google still rewards a high-volume auto-generated corpus.**
The "helpful content" direction of travel is against scaled content production,
and ~883 of their ~996 briefs are crawl-orphans earning no internal PageRank —
which is exactly the shape a spam classifier is built to catch. *Falsified by:*
our own indexed-page count stalling well below submitted count after Phase 2, or
a visible decline in their indexed pages. *If false:* the correct play is fewer,
deeper, entity-anchored pages, and our receipts and methodology become the
differentiator rather than the volume.

**A4. Our data rate can support a content engine at all.**
`/api/history.json` holds four observations across twenty-three hours against a
published claim of hourly, and `/moves/` produced two indexable pages in a day.
If the collector cannot be made to run reliably, per-move pages are a template
with no input and Phase 2 rests entirely on the 200 daily news items. *Falsified
by:* the cron still missing its schedule after step 2.5. *If false:* the news
corpus is the only engine we have, and it must carry the whole phase.

**A5. Credibility converts to traffic.**
The plan spends Phase 0 on honesty fixes on the theory that a competitor whose
API says "quiet, stale, zero spikes" while the page says "DOUGHCON 4, 455%
SPIKE" is one screenshot away from losing the credibility that is its entire
product. But credibility is a slow, indirect channel — it earns citations and
links, not sessions — and we have no evidence that any visitor has ever checked
a receipt. *Falsified by:* honesty fixes landing with no movement in referring
domains or returning visitors after six weeks. *If false:* Phase 0 was still
correct — shipping a widget that prints a false claim is not defensible on
traffic grounds either — but it should be timeboxed harder and the effort moved
to Phase 2.

**A6. Email and push are actually open ground rather than a proven dead end.**
Nobody in the category has a newsletter. The optimistic reading is that nobody
has tried. The pessimistic one is that a single number that moves four times a
day does not sustain a daily email, and the open ground is empty for a reason.
*Falsified by:* a Phase 3 open rate below ~20% after four weeks, or subscriber
churn above acquisition. *If false:* fall back to threshold-triggered alerts
only — mail only when a published gate fires — which matches the product and
costs the reader nothing on quiet days.

**A7. The premise can be made to compress.**
S2 says "Pentagon pizza" explains itself and "AI activity tempo index" does not.
The plan assumes better phrasing closes most of that gap. It may not — the joke
may be doing work no phrasing can replace. *Falsified by:* Phase 1 posts earning
engagement well below a comparable pizzint post at the same follower count,
sustained over a month. *If false:* lean the brand on the one thing nobody else
in the category has — "you can recompute our number yourself" — and accept a
smaller, denser, more durable audience of practitioners, journalists and policy
staff over a viral one. `VISITORS.md` already measured that we win every cluster
with a budget over 45 seconds and lose every cluster under 20.
