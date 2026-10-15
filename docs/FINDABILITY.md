# Findability — Google Search and AI answer engines

**Status:** playbook, measured against the live site on **2026-10-08**, with
engineering checklist updates through **2026-10-11** (ChatGPT / Grok agent
surfaces). Companion to `docs/GROWTH.md` (UX moves), `docs/COMPETITIVE.md`
(URL-count war), `docs/COMPETITIVE-SEO.md` (live reverse-engineer of rival
titles/sitemaps/schema), `docs/VIRAL.md` (distribution on X), and
`docs/MONETIZE.md` (earning without losing rank).

Two different surfaces, one shared substrate:

| Surface | What selects us | What does *not* |
|---|---|---|
| **Google Search** (organic + AI Overviews / AI Mode) | Crawlable HTML, helpful people-first pages, clear titles, canonical URLs, E-E-A-T signals, internal links, a sitemap Google has fetched | `llms.txt`, special AI markup, keyword stuffing, bought mentions |
| **AI answer engines** (ChatGPT, Perplexity, Claude, Gemini chat with browse) | The same crawlable pages, plus machine-readable entry points (`llms.txt`, public JSON, methodology, stable permalinks with dates) | Pretending Google uses `llms.txt` — [Google says it does not](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) |

Google's own line, read 2026-10-08: *apply foundational SEO; do not invent
special AI files for Google; structured data helps rich results, not generative
features specifically.* Everything below respects that, then adds what *other*
agents actually read.

---

## 0. What already ships (checked live, 2026-10-08)

| Asset | State | Notes |
|---|---|---|
| `robots.txt` | `User-agent: *` / `Allow: /` + named AI bots + both Sitemap lines | Names GPT/OAI-SearchBot, GrokBot/xAI-SearchBot, Claude, Perplexity, … No Disallow |
| `sitemap.xml` | **~665 URLs** live (2026-10-11) | Head pages + `/item/` long tail + agent surfaces + facets |
| `news-sitemap.xml` | Live, rolling 48h window | Google News format; capped at 100 newest items |
| `llms.txt` / `agents.md` | Live | Query routing for ChatGPT/Grok + fetch-first agent entry |
| `agents.txt` / `agents.json` | Shipping | agents-txt.com Skills announcement (no fake HTTP MCP) |
| `/.well-known/api-catalog` | Shipping | RFC 9727 linkset + `.json` twin for Content-Type |
| Skills index / MCP card | Shipping | `/.well-known/agent-skills/index.json`, `/.well-known/mcp/server-card.json` (stdio) |
| `/api/index.json` | Live | CORS `*`. Linked from `llms.txt`. `/openapi.json` ships |
| `/api/state.json`, `history.json`, `health.json`, receipts | Live | The citation unit for both journalists and agents |
| `/feed.xml` + `/feed-level.xml` | Live | Both linked as `rel=alternate` in `<head>` on every templated page |
| JSON-LD | Home (`WebApplication`, `Dataset`, `FAQPage`, `WebSite`, `VideoObject`, `Organization`), methodology/history (`FAQPage`), race/exploits/bliss (`Dataset`), item/move pages (`WebPage`/`NewsArticle` + `SpeakableSpecification` + `BreadcrumbList`) | Richer types than pizzint |
| IndexNow | Key file + post-publish ping | Bing/Yandex/Seznam; Google still uses sitemaps only |
| `noindex` on thin / empty states | Wired | Empty race, bliss, digest, watts, non-substantive moves — do not submit these to the sitemap |
| Canonical + `og:*` + `twitter:card` | Wired in `site/build.mjs` / `layout.mjs` | Share cards are PNG |
| Search Console | **Operator:** set secret `GOOGLE_SITE_VERIFICATION` | Build emits the HTML meta tag when the secret is present (`VIRAL.md` §7.1) |
| Own domain | `siren.watch` | Apex live; keep 301 map from any legacy `github.io` URLs |

The product already has the hard parts of findability: server-rendered HTML, a
growing URL count, receipts, a public API, and an honest methodology. The gap is
**instrumentation, head-term titles, news discovery, and telling agents where
the good files are.**

---

## 1. How to maximize Google Search (including AI Overviews)

Google's generative features use the same crawlable corpus as classic Search.
There is no separate "AI SEO" track. Ranked for this site:

### 1.1 Verify Search Console — day zero

Without it, every other move is unverifiable. Operator-only (also
`docs/OUTREACH.md` §0):

1. Search Console → Add property → URL-prefix → `https://siren.watch`.
2. Choose **HTML tag** verification. Copy only the `content` token into the
   GitHub Actions secret `GOOGLE_SITE_VERIFICATION` (collect.yml already
   passes it into `site/build.mjs` / `layout.mjs`).
3. After the next full collect Publish, confirm
   `<meta name="google-site-verification" …>` on the live home, then click
   Verify in Search Console.
4. Submit `https://siren.watch/sitemap.xml` and
   `https://siren.watch/news-sitemap.xml`.
5. Weekly: Coverage (indexed vs excluded), Queries (branded + head terms),
   Experience (CWV if any).

Success metric is **indexed pages trending**, not sitemap count
(`COMPETITIVE.md` Phase 2). Hook shipped (FINDABILITY #8/#80); property still
**Open** until the secret is set (#11).

### 1.2 Grow indexable URL count with substance gates

pizzint's decisive advantage was ~1,018 sitemap URLs against our early teens.
We now ship ~480, mostly `/item/` pages. Keep going:

| Do | Do not |
|---|---|
| One indexable page per scored news item (already the template) | Index empty states — keep `noindex` |
| Faceted URLs that already exist as filters: `/pillar/…`, `/lab/…` | Emit thin near-duplicates for every 0.1 score drift |
| Level-change move permalinks with `NewsArticle` | Put non-substantive moves in the sitemap |
| Internal links between related items (3–5, recency-weighted) | Orphan long-tail pages that only the sitemap knows about |

### 1.3 Titles and descriptions that match what people type

`COMPETITIVE.md` §4.5: retitle for a head term we can honestly answer —
*"AI activity level today"*, not only insider names. Live homepage title on
2026-10-08 already carries the level and score (`SIREN 4: … · 48.1`), which is
right for branded and "is it loud today" queries. Extend that discipline:

- Every head page: primary claim in `<title>`, denominator or clock in the
  meta description, no future tense.
- Evergreen explainers already aimed at search (`/p-doom.html`,
  `/ai-doomsday-clock.html`, `/guide.html`, `/jobs.html`, `/medicine.html`)
  keep question-shaped titles that match the query.
- Never invent a "doomsday probability" title the index does not compute
  (`CONTRACT.md`, `VOICE.md`).

### 1.4 Structured data where it earns a rich result

Google: structured data is **not required** for AI Overviews; it *is* useful
for classic rich results. Keep using what we already emit, honestly:

| Type | Where | Why |
|---|---|---|
| `Dataset` | race, exploits, bliss, watts-class pages | Dataset Search + clear "this is a measured series" |
| `FAQPage` | methodology, history, home FAQ — built from visible Q&A only | Rich results; must match on-page text |
| `NewsArticle` / dated `WebPage` | moves, item pages | Freshness and citation |
| `SpeakableSpecification` | still missing on item/move pages | Voice and summary surfaces (`COMPETITIVE.md` 2.2) |
| `BreadcrumbList` | item pages | Hierarchy in SERP |

Do not invent schema for claims we do not make. A `FAQPage` whose answers are
not visible HTML is a policy violation, not an optimisation.

### 1.5 Technical crawl hygiene (already mostly done)

- Server-rendered HTML that survives with JS off — keep it.
- One canonical per URL; no soft-404 empty pages in the index.
- `robots.txt` stays permissive and silent about unshipped paths.
- Core Web Vitals: mobile card view (`GROWTH.md` move 08) is the ranking-relevant
  performance move; a 200-item inline homepage is the current cost.
- When the domain moves, 301 everything; never orphan the Pages URLs.

### 1.6 E-E-A-T that this product can actually show

Google weights experience, expertise, authoritativeness, trust — especially on
YMYL-adjacent AI-risk topics. Our honest version:

- **Experience:** live readings with UTC stamps and receipts.
- **Expertise:** `/methodology.html` with the formula, constants, and failure
  modes in the open.
- **Authoritativeness:** citations from press, Wikipedia, and other indices —
  earned, not bought (`COMPETITIVE.md` §5.4).
- **Trust:** dark vs awaiting-baseline never collapsed; corrections with the
  same prominence as the error (`POSTING.md` §4.10).

An index that refuses to be a probability is more citable than one that
performs certainty. That is the ranking advantage; do not sand it off for
clickbait titles.

### 1.7 News discovery

`news-sitemap.xml` is **live** (rolling 48h window, cap **200**, AI-first
`news:keywords`). Hold the Google News lane while pizzint’s news sitemap
flaps empty↔thin (`google-news-open` in `seo-daily`). Re-check their feed
before changing the bet (`COMPETITIVE.md` §0.1 / `COMPETITIVE-SEO.md`).

---

## 2. How to maximize findability in AI answer engines

ChatGPT, Perplexity, Claude, Gemini-with-browse, and similar tools do not share
one ranker. They share a need for **clean, dated, quotable sources**. Treat them
as aggressive librarians, not as Google-with-extra-steps.

### 2.1 Make the site agent-legible

| Move | Why |
|---|---|
| Keep `/llms.txt` accurate and complete | De-facto map for agents; Lighthouse audits it; OpenAI/Anthropic/Google ship their own |
| Link the **canonical facts** first: `api/state.json`, `api/history.json`, methodology, guide, about | Agents prefer a short path to the number and the method |
| Add secondary H2 sections for instruments (race, map, flock, exploits, watts, digest) and for the API index | Matches [llms.txt v2](https://llmstxt.org/) "file list" sections; Optional section for secondary pages |
| Prefer stable permalinks with an exact UTC stamp on the page | Citations need a date they can quote |
| Ship markdown mirrors later (`page.md` / `rel=alternate type=text/markdown`) only if maintainable from the same template | Spec recommendation; not required for Google |

**Expand `llmsTxt()` in `site/build.mjs`** so the live file stops omitting the
pages that answer the questions agents get asked ("who is winning the model
race?", "where are the datacentres?", "is exploit lag accelerating?").

### 2.2 Do not block the major AI crawlers

Current `robots.txt` allows everyone. Keep it that way unless legal or cost
forces otherwise. Named bots agents and SEO tools care about include
`GPTBot`, `OAI-SearchBot`, `ClaudeBot`, `Google-Extended`, `PerplexityBot`,
`Applebot-Extended`. Explicit `Allow` lines are optional documentation, not a
ranking lever — `User-agent: * / Allow: /` already admits them.

If a bot is ever Disallowed, say so in this file and in `/about` the same day.
Silent blocks produce "I couldn't access that site" answers that look like we
do not exist.

### 2.3 Be the source that survives a quote-check

AI answers prefer sources that:

1. State a number with a denominator and a clock.
2. Separate measurement from judgement ("their words, not ours").
3. Link primary data (our JSON, government feeds, venue questions verbatim).
4. Still resolve months later at the same URL.

That is already the house voice. The findability move is to put those four
properties **above the fold** on every indexable page, in plain HTML, so a
fetch-and-summarise pass does not have to run our JavaScript or guess.

### 2.4 Citation surfaces worth offering agents

| Surface | Agency use |
|---|---|
| `/api/state.json` | Current level, score, pillars, `generated_at`, receipt id |
| `/api/history.json` / receipts | Time series and audit |
| `/methodology.html` | What the number is and is not |
| `/guide.html`, `/p-doom.html`, `/ai-doomsday-clock.html` | Disambiguation queries ("is there an AI doomsday clock?") |
| `/race.html`, `/exploits/`, `/flock/`, `/map.html` | Narrow factual questions with denominators |
| `/item/<slug>.html` | "What sources said X, when" |

A "Cite this reading" block on the homepage (`GROWTH.md` move 09) that copies
score + UTC + receipt + URL is useful to humans and to agents that paste
context.

### 2.5 What does not help AI findability

- Rewriting copy into "AI-friendly" bullet spam — Google explicitly says not to;
  other engines are not better for it.
- Buying forum mentions or fake citations.
- Gating the JSON behind keys or blocking CORS on public reads.
- Changing URLs when the score updates (the receipt is the version; the path
  stays stable).

---

## 3. Ranked checklist

### 3.1 Operator only

- [ ] Verify Google Search Console on the live URL; submit `sitemap.xml`.
- [ ] Weekly: indexed count, top queries, pages excluded as soft-404 / crawled-not-indexed.
- [ ] When the custom domain is live: re-verify, set preferred domain, 301 map.
- [ ] Spot-check: ask ChatGPT / Perplexity / Claude "What is SIREN / DOOMCON AI index right now?" and "Is there an AI doomsday clock?" — record whether they cite us, and which URL.
- [ ] Register the site in Google Merchant / News only if we ship a real news sitemap with dated `NewsArticle` pages — not before.

### 3.2 Engineering, ranked by expected findability per unit of work

| # | Change | Channel | Status |
|---:|---|---|---|
| 1 | Expand `llms.txt` to cover API index, race, map, flock, exploits, watts, digest, press/about | AI agents | **Done** (2026-10-10) |
| 2 | Keep `/item/` and substantive `/moves/` growing; never sitemap `noindex` pages | Google | Ongoing |
| 3 | Faceted pillar/lab URLs with unique titles and internal links | Google + agents | **Done** (2026-10-10) — see `docs/COMPETITIVE-SEO.md` |
| 4 | `SpeakableSpecification` + breadcrumb on item/move pages | Google / voice | **Done** (2026-10-10) |
| 5 | `news-sitemap.xml` once item pages qualify | Google News | **Done** |
| 6 | `/openapi.json` + sitemap entries for API docs | Agents + developers | **Done** |
| 7 | Head-term homepage title + FAQ ("AI activity level today", verifiable doomsday clock) | Google | **Done** (2026-10-10) |
| 8 | Organization JSON-LD + IndexNow ping after publish + GSC meta hook | Google + Bing | **Done** (2026-10-10) |
| 9 | Optional markdown mirrors for methodology and guide | Agents | **Done** (live `/methodology.md`, `/guide.md`) |
| 10 | Mobile card view / less above-fold weight | Google CWV | **Done** (2026-10-14) — phone-width `<details>` deferral + below-fold `content-visibility:auto` |
| 11 | Verify Search Console; submit both sitemaps | Operator | Open |
| 12 | `/country/<iso>` for countries with ≥3 mapped datacentre sites, and `/model/<slug>` for model families named in ≥3 scored stories | Google | **Done** (2026-10-10) |
| 13 | `/compare`, `/alternatives`, `/vs/*` conquest landings | Google | **Done** (2026-10-10) |
| 14 | `/agents.md` + Grok/xAI named Allow + ChatGPT query routing in `llms.txt` | ChatGPT + Grok | **Done** (2026-10-11) |
| 15 | `/people/*` leader coverage pages + `/news/YYYY-MM-DD` day hubs + entity-only `/lab/*` | Google | **Done** (2026-10-14) |
| 16 | `/agents.txt` + `/agents.json` + `/.well-known/api-catalog` + skills index + MCP server card | Agent discovery | **Done** (this pass) |
| 17 | News-sitemap cap **200** + AI-first keywords (slim live hotfix) | Google News | **Done** (2026-10-14) |
| 18 | `/news.html` question-shaped title/H1/H2s + FAQPage + Speakable + BreadcrumbList | Google | **Done** (2026-10-14) |
| 19 | `/digest.html` question-shaped title/H1 + FAQPage | Google | **Done** (2026-10-14) |
| 20 | `/race.html` question-shaped title/H1 + FAQPage | Google | **Done** (2026-10-14) |
| 21 | `/methodology.html` head-term title + question H2s feeding FAQPage | Google | **Done** (2026-10-14) |
| 22 | Homepage below-fold `content-visibility:auto` (CWV; crawlers still see full HTML) | Google CWV | **Done** (2026-10-14) |
| 23 | `/source/*` adapter hubs link older archive stories; phone-width home board deferral | Google CWV | **Done** (2026-10-14) |
| 24 | `/tags/*` topic hubs (Skynet URL shape; curated needles, ≥5 stories) | Google | **Done** (2026-10-14) |
| 25 | `/kind/*` story-kind hubs (press/forum/paper; ≥5 stories) | Google | **Done** (2026-10-14) |
| 26 | Durable `data/item-archive.json` (ARCHIVE_MAX 5000) for `/item/` long-tail + newsroom cap 800 | Google | **Done** (2026-10-14) |
| 27 | News-sitemap cap 150 with richer keywords | Google News | **Done** (2026-10-14) |
| 28 | `/outlet/*` publisher hubs (≥5 scored stories) | Google | **Done** (2026-10-14) |
| 29 | IndexNow ALWAYS + seo-daily OUR_SURFACES cover top gated `/tags/*` `/kind/*` `/outlet/*` `/people/*` hubs | Bing + daily scoreboard | **Done** (2026-10-14) |
| 30 | `seo-daily` `deploy-pending-url-lead` when local Ready ≥2k and live sitemap &lt; 50% of Ready — trail gaps yield to merge/deploy | Daily agent | **Done** (2026-10-14) |
| 31 | DoomBench-shaped `/companies.html` + `/lab/` index + wire `/models.html` `/tags.html` `/people.html` `/countries.html` (already linked; were unwritten) | Google | **Done** (2026-10-14) |
| 32 | `/pillars.html` + `/pillar/` index + `/sources.html` (linked from country/outlet pages; were unwritten) | Google | **Done** (2026-10-14) |
| 33 | Conquest `/vs/pizzint.html` + `/vs/takeofftracker.html` (DEFCON/takeoff head terms without borrowing claims) | Google | **Done** (2026-10-14) |
| 34 | `/guides.html` + `/guides.md` evergreen explainer hub + `/vs.html` conquest directory (linked; were unwritten) | Google + agents | **Done** (2026-10-14) |
| 35 | Question-shaped titles/H2s + WebPage/Speakable/Breadcrumb/FAQ on `/p-doom.html` + `/ai-doomsday-clock.html` (visible FAQ matches schema) | Google | **Done** (2026-10-14) |
| 36 | Question-shaped `/guide.html` + `/guide.md` + IndexNow ALWAYS evergreen rooms (history/instruments/map/…) for post-deploy crawl | Google + Bing | **Done** (2026-10-14) |
| 37 | Question-shaped `/compare.html` `/alternatives.html` `/vs/*` hubs + methodology title/H2s (METHODOLOGY.md FAQ from visible questions) | Google | **Done** (2026-10-14) |
| 38 | IndexNow ALWAYS covers gated hubs this build already emits (labs/models/tags/sources missing from ping set) | Bing | **Done** (2026-10-14) |
| 39 | Newsroom question H1 + FAQ + entity-directory nav (companies/models/tags/guides/vs…) so post-deploy hubs are not orphans | Google | **Done** (2026-10-14) |
| 40 | Homepage `roomGroups` question labels + entity/conquest hub tiles (companies/models/tags/guides/compare/vs/…) with unique px icons | Google | **Done** (2026-10-14) |
| 41 | Catalog/search + agents.md + siteheader list entity/conquest hubs under question titles; IndexNow ALWAYS covers `/moves/` | Google + agents + Bing | **Done** (2026-10-14) |
| 42 | Homepage FAQ + question-shaped home H2s link entity/conquest hubs (schema matches visible FAQ); readers map H2 question-shaped | Google | **Done** (2026-10-14) |
| 43 | Sitewide footer/nav labels + agent pages + home modules use question H1/H2s mirrored in FAQ (keep #123 off-brand unlinks) | Google | **Done** (2026-10-14) |
| 44 | Provenance + explainer infoPages and extras (alerts/export/bias/changelog/reference-plan) ship question H1/H2 + FAQ schema | Google | **Done** (2026-10-14) |
| 45 | Instrument pages (balance/digest/evolution/desk/charts/exploits/flock/waffle/feature/moves/day) question H1/H2 + FAQ; facet breadcrumbs match H1s | Google | **Done** (2026-10-14) |
| 46 | History/labs/leaders/map/live/moltbook/games/bets/classic/instruments question H1/H2 + FAQ; extras blurbs match page questions | Google | **Done** (2026-10-14) |
| 47 | Static rooms + nations/nothing/power/moves/news-sitemap question H1/H2 + FAQ (arena/bunker/contain/dispatch/…) | Google | **Done** (2026-10-14) |
| 48 | Race/watts/world/threats/status/si-watch/self-aware/shop/topic/radio/videos/tally/staff/press/privacy/terms question H1/H2 + FAQ | Google | **Done** (2026-10-14) |
| 49 | Pillar/lab/source detail + `/source/` directory: question H1/title/FAQ/speakable (live-window gates only — no archive-widen while `deploy-pending-url-lead`) | Google | **Done** (2026-10-14) |
| 50 | IndexNow ALWAYS covers question-titled rooms (`/status` `/catalog` `/nations` …) + `defaultUrlList` samples sitemap archive/facet tails (news cap 100) — Bing path after merge | Bing | **Done** (2026-10-14) |
| 51 | `seo-daily`: monitor live rooms; collapse undeployed surface-404 flood into `surfaces-awaiting-deploy` while `deploy-pending-url-lead`; decode rival title entities | Daily agent | **Done** (2026-10-14) |
| 52 | Pillar/lab pages list older archive stories + word-bound lab matching (FAQ/H2 mirrored); **live-window index gates unchanged** while deploy-pending | Google | **Done** (2026-10-14) |
| 53 | `/source/*` durable gate: live + archive story count (same as tags/kinds/outlets/models) — ~+16 feed-adapter hubs when archive fills thin adapters | Google | **Done** (2026-10-14) |
| 54 | IndexNow ALWAYS covers #48 archive-widened `/source/*` hubs + `defaultUrlList` pings UTC `/news/YYYY-MM-DD` day hubs from disk; `seo-daily` `google-news-open` while pizzint news-sitemap is empty | Bing + Google News | **Done** (2026-10-14) |
| 55 | News-sitemap cap **200** (48h often 300–400 items) + head-term keywords before pillar/source meta; IndexNow samples 200 news locs; Nemotron / Google DeepMind / o-series surfaces — Google News contest while pizzint flaps | Google News | **Done** (2026-10-14) |
| 56 | `/news/YYYY-MM-DD` ItemList schema includes archive stories that appear on the page (19/20 hubs were archive-only with empty live ItemList — schema≠HTML) | Google | **Done** (2026-10-14) |
| 57 | Pillar/lab/source CollectionPage ItemList includes visible archive rows (≤12) after live rows (≤40) — same schema=HTML rule as #51 | Google | **Done** (2026-10-14) |
| 58 | Shared `storyItemListEntity` on tag/outlet/model/country (+ day/facet reuse) so every entity hub ItemList includes visible archive rows | Google | **Done** (2026-10-14) |
| 59 | Kind hubs use `storyItemListEntity`; people ProfilePages emit archive-story ItemList beside Person mainEntity when older rows are shown | Google | **Done** (2026-10-14) |
| 60 | `llms.txt` / `agents.md`: question-shaped day hubs (newest 5), news-sitemap discovery, “today’s headlines” tip — AI-search path while `google-news-open` | Agents + Google News | **Done** (2026-10-14) |
| 61 | `skill.md`: “Today’s scored stories” cite path (now.md, newsroom, UTC day hubs, news-sitemap) + More links — same AI-search lane as #55 for skill consumers | Agents + Google News | **Done** (2026-10-14) |
| 62 | News-sitemap `news:keywords`: `AI` / `artificial intelligence` / SIREN before topic-tag names (not only before pillar/source meta) — thin rows stop leading with pillar slugs while `google-news-open` | Google News | **Done** (2026-10-14) |
| 63 | `api-catalog` + `ai.txt` + `agents.txt` comments + MCP `related` advertise `/news-sitemap.xml`, `/api/news.json`, `/news.html` — AI-search path while `google-news-open` (no new facet URLs) | Agents + Google News | **Done** (2026-10-14) |
| 64 | IndexNow ALWAYS covers skill package + `/api/news.json`; news-sitemap keyword surfaces for Trail of Bits / DualEntry / Qwen N1 / Grok Voice / HomeView / AA-AgentPerf / DeepSeek V4.1 / MI355X (live 48h window) | Bing + Google News | **Done** (2026-10-14) |
| 65 | Clear CodeQL “replace substring with itself” on desk share lines (`what.replace(/^headlines/, 'headlines')` → `what`) so PR #125 stays mergeable under `deploy-pending-url-lead` | Merge / deploy | **Done** (2026-10-14) |
| 66 | Question-shaped `/search-trends.html` + `/ai-prediction-markets.html` titles/H1/H2/FAQ; IndexNow ALWAYS + `seo-daily` CORE_LIVE_SURFACES monitor both | Google + Bing | **Done** (2026-10-14) |
| 67 | `llms.txt` / `agents.md` / home tiles advertise question-shaped Search Trends + AI prediction-markets URLs (live agent maps had omitted them after HTML-only overlay) | Agents + Google | **Done** (2026-10-14) |
| 68 | Fix `catalogPages.mjs` DATA syntax clobber from #137 restore (`api/si-signals.json` + `api/search-trends.json`) so `collect`/`news-fast` site builds can finish again | Deploy / Google | **Done** (2026-10-14) |
| 69 | `openapi.json` + `skill.md` + `api-catalog` / `ai.txt` / MCP `related` advertise Search Trends + AI prediction-markets (JSON + question HTML) | Agents + Google | **Done** (2026-10-14) |
| 70 | `api/index.json` endpoints map lists `search_trends` + HTML landings so agents discovering via index.json reach the head-term pages | Agents | **Done** (2026-10-14) |
| 71 | Live `/` + `/catalog.html` list question-shaped Search Trends + AI prediction-markets (LIVE INTEL tiles + catalog DATA) — durable on `main`; gh-pages overlay until a full collect Publish sticks | Agents + Google | **Done** (2026-10-14) |
| 72 | News-sitemap `NEWS_KEYWORD_LABS` refresh for live 48h surfaces (Character.AI, Mythos, Sarah Friar, Sachin Katti, Prime Intellect, Moondream, ollama, …) while `pizzint-news-alive` | Google News | **Done** (2026-10-14) |
| 73 | Outrank-style free-tool landings: `/verify.html` (receipt checker + WebApplication) + `/free-tools.html` listicle; IndexNow / sitemap / `llms.txt` / agents / catalog / home tiles | Google + AI mentions | **Done** (2026-10-14) |
| 74 | Live `llms.txt` / `agents.md` / `skill.md` + sitemap locs advertise `/verify.html` + `/free-tools.html` (main had #73; gh-pages agent maps lagged until overlay — lab/day-hub lines preserved) | Agents + Bing | **Done** (2026-10-14) |
| 75 | `ai.txt` + RFC 9727 `api-catalog` + MCP `related` advertise `/verify.html` + `/free-tools.html` (Outrank free-tool discovery beyond llms/agents) | Agents | **Done** (2026-10-14) |
| 76 | `agents.txt` comment lines advertise free-tools + verify + Search Trends (agents-txt.com probes that never open `llms.txt`) | Agents | **Done** (2026-10-14) |
| 77 | `openapi.json` + `api/index.json` list `/verify.html`, `/free-tools.html`, Search Trends HTML, and AI prediction-markets HTML so OpenAPI scrapers reach Outrank landings | Agents + developers | **Done** (2026-10-14) |
| 78 | Rebuild live `news-sitemap.xml` with `NEWS_KEYWORD_LABS` (Character.AI / Mythos / x402 / YouTube Music / Claude Code) — gh-pages news-sitemap was stale vs #72 while `google-news-open` | Google News | **Done** (2026-10-14) |
| 79 | `robots.txt` tip comments advertise free-tools + verify + Search Trends (crawlers that read robots before llms/agents) | Agents + Google | **Done** (2026-10-14) |
| 80 | Layout unit test for `GOOGLE_SITE_VERIFICATION` meta + `seo-daily` detects live GSC HTML-tag (clears false “verified” guesses until operator sets secret / submits sitemaps — #11) | Google / daily agent | **Done** (2026-10-14) |
| 81 | Harden layout `og:image` to always use a rooted `/cards/…` path (naive `url()` overlays emitted `siren.watchcards` on `/verify.html` + `/free-tools.html`); unit test + live overlay fix + IndexNow | Google / social | **Done** (2026-10-15) |
| 82 | News-sitemap `NEWS_KEYWORD_LABS`: promote `ChatGPT` / `Pentagon` / `EDPB` (live 48h titles) so the 12-cap does not bury ChatGPT under topic tags while `pizzint-news-alive` | Google News | **Done** (2026-10-15) |
| 83 | Raise `collect.yml` job timeouts (newsroom 10→45m, full 40→90m) so Build/Publish finish — findability tree was cancelling mid-build and forcing SEO overlays | Deploy / Google | **Done** (2026-10-15) |
| 84 | `sitemap.xml` + `news-sitemap.xml` tip comments advertise free-tools, verify, Search Trends, and cross-link each other (crawlers that open sitemaps before robots/llms) | Agents + Google | **Done** (2026-10-15) |
| 85 | `seo-daily` detects missing sitemap tip comments (`sitemap-tips-missing`) so collect Publish wipes of #84 are caught before the next daily pass | Daily agent | **Done** (2026-10-15) |
| 86 | Unit test locks `collect.yml` job budgets (newsroom ≥45m, full ≥90m) so #83 cannot regress and re-break durable gh-pages Publish | Deploy / daily agent | **Done** (2026-10-15) |
| 87 | `feed.xml` / `feed-level.xml` tip comments advertise free-tools, verify, news-sitemap, Search Trends (RSS readers that never open robots/llms) | Agents + Google | **Done** (2026-10-15) |
| 88 | `seo-daily` detects missing RSS tip comments (`feed-tips-missing`) so collect Publish wipes of #87 are caught before the next daily pass | Daily agent | **Done** (2026-10-15) |
| 89 | `seo-daily` detects missing `robots.txt` tip comments (`robots-tips-missing`) so collect Publish wipes of #79 are caught before the next daily pass | Daily agent | **Done** (2026-10-15) |
| 90 | `/api/now.txt` + `/now.md` tip lines advertise free-tools, verify, Search Trends (and news-sitemap on now.md) for agents that never open robots/llms | Agents + Google | **Done** (2026-10-15) |
| 91 | `seo-daily` detects missing now tip lines (`now-tips-missing`) + monitors `/now.md` / `/api/now.txt` in CORE_LIVE_SURFACES so collect Publish wipes of #90 are caught | Daily agent | **Done** (2026-10-15) |
| 92 | IndexNow ALWAYS includes `/api/now.txt` beside `/now.md` so tipped live readings get Bing notify after every Publish | Bing | **Done** (2026-10-15) |
| 93 | Raise `collect.yml` job timeouts again (newsroom 45→75m, full 90→120m) after rebuild alone hit ~44m and cancelled at the 45m ceiling before Publish; lock floors in unit test | Deploy / Google | **Done** (2026-10-15) |
| 94 | Newsroom `Rebuild the site` seeds `public/` from gh-pages and runs `build.mjs --only news` (news-fast pattern) instead of a full wipe — root cause of the 44m cancel before Publish | Deploy / Google | **Done** (2026-10-15) |
| 95 | News-only build rewrites `robots.txt` (with #79 tip comments) so newsroom Publish does not leave robots tips dependent on SEO overlays | Agents + Google | **Done** (2026-10-15) |
| 96 | `news-fast.yml` overlay copies `news-sitemap.xml` + `sitemap.xml` + `robots.txt` (with tip comments) so Google News + robots tips refresh on the fast path, not only on orphan Publish | Google News + Agents | **Done** (2026-10-15) |
| 97 | `seo-daily` flags stale live news-sitemap (`news-stale`) when newest `news:publication_date` is older than 6h while `<loc>` count stays positive — catches hung news-fast / cancelled collect before Google News decays | Daily agent + Google News | **Done** (2026-10-15) |
| 98 | `news-fast.yml` seeds `public/` from gh-pages before the minute loop so `--only news` does not fall through to a ~44m full wipe on tick 1 (root cause of multi-hour `news-stale` / zero publishes — run 38666831944) | Google News + Deploy | **Done** (2026-10-15) |
| 99 | `news-fast.yml` never falls back to a full wipe on `--only news` failure: mid-loop re-seed + `timeout 480` news-only, else skip the tick (defense in depth after #98) | Google News + Deploy | **Done** (2026-10-15) |
| 100 | Collect newsroom: on successful `--only news`, skip `card.mjs` / `posts.mjs` / sheets (hourly full pass owns them); `timeout 480` news-only and refuse unbounded full wipe fallback so Rebuild cannot re-block Google News Publish | Google News + Deploy | **Done** (2026-10-15) |
| 101 | Collect compliance gates set `NODE_OPTIONS=--max-old-space-size=8192` so audit of seeded/full `public/` does not OOM (~4GB default) and skip Publish (run 38672483978 exit 134 left fresh news on main only) | Deploy + Google News | **Done** (2026-10-15) |
| 102 | News-only build: stop rewriting every `/item/*` page when only `state.generated_at` moves (`asOfChanged`) — that blanket rewrite of ~800 items blocked Publish behind minutes of HTML I/O while news-sitemap was already fresh | Google News + Deploy | **Done** (2026-10-15) |
| 103 | News-only slim lane: rewrite item briefs only on `itemChanged` (no pillar/entity cohort cascade) and skip facet/entity hub HTML (pillar/lab/source/model/tag/kind/outlet/people); keep day hubs + news-sitemap/robots/feed/api so news-fast finishes inside `timeout 480` (tip b9b1fcc1: 6/6 ticks timed out, PUBLISHED=0) | Google News + Deploy | **Done** (2026-10-15) |
| 104 | Full-pass `Build site` (+ newsroom/news-fast timed builds) set `NODE_OPTIONS=--max-old-space-size=8192` so the item-archive tree does not thrash under the default ~4GB heap and block hourly Publish (run 38676940859 still Building at ~75m) | Deploy + Google News | **Done** (2026-10-15) |
| 105 | Incremental full build: seed `public/` from gh-pages and keep durable `/item/*` archive pages on disk (skip rewrite when present) so hourly Build finishes inside the job budget instead of wipe+rewrite of ~5000 briefs (run 38676940859 still Building at ~85m) | Deploy + Google News | **Done** (2026-10-15) |
| 106 | News-only: refresh at most 5 live-window day hubs (not archive-backed `indexableDays`) and skip full `sitemap.xml`; raise news-fast/newsroom `--only news` timeout 480→900 so ticks can Publish (tip c4993bcf still PUBLISHED=0 after #103) | Google News + Deploy | **Done** (2026-10-15) |
| 107 | News-only item skip uses content fingerprint (title/summary/url/corroboration — not `age_hours_at_score` / recency / score churn) + rewrite cap 120; full `stableJson(it)` still rewrote ~800 briefs (~468s) and left news-fast at PUBLISHED=0 on tip c4993bcf | Google News + Deploy | **Done** (2026-10-15) |
| 108 | News-sitemap `NEWS_KEYWORD_LABS`: add MediaTek / Cathie Wood / ServiceNow from live 48h titles while `google-news-open` so the 12-cap does not bury chip/deal surfaces under topic tags | Google News | **Done** (2026-10-15) |
| 109 | News-sitemap `NEWS_KEYWORD_LABS`: add `Kodiak AI` / `Kodiak` so the Cathie Wood / CoreWeave tape keeps the company surface under the 12-cap while Google News is contested | Google News | **Done** (2026-10-15) |
| 110 | `seo-daily` detects live news-sitemap title↔keywords lag (`news-keywords-lag`) when probe labs (Kodiak AI / MediaTek / Cathie Wood / …) appear in `news:title` but not `news:keywords` — catches CDN/old-tip publishes after #108/#109 | Daily agent + Google News | **Done** (this pass) |
| 111 | Conquest short alias `/vs/skynet.html` → same body as `/vs/skynet-countdown.html` with canonical on the primary (typed “skynet” guess was 404 while rival head term is live) | Google | **Done** (this pass) |
| 112 | `news-fast.yml` throttle Pages publishes to ≥5 minutes (`PUBLISH_MIN_GAP`) when newsroom churn is every tick — minute pushes caused duration:0 “Page build failed” streaks so live CDN froze (incl. #111 overlay) | Deploy + Google News | **Done** (this pass) |
| 113 | Conquest short aliases `/vs/doom.html` → doombench and `/vs/takeoff.html` → takeofftracker (same body + canonical on primary; out of sitemap) — typed guesses were 404 after #111 proved the pattern | Google | **Done** (this pass) |
| 114 | `news-fast` re-copies vs short aliases from primary rival HTML before every overlay/orphan commit — orphan publish was wiping `/vs/skynet.html` (and #113) from tip within minutes of overlay | Deploy + Google | **Done** (this pass) |
| 115 | `collect.yml` orphan Publish (newsroom + full) restores the same vs short aliases before commit — news-only rebuilds omit them and would wipe tip the same way as pre-#114 news-fast | Deploy + Google | **Done** (this pass) |
| 116 | `agents.md` + llms tip list all conquest `/vs/*` pages and short aliases (#111/#113); `news-fast` overlays `llms.txt` / `agents.md` / `agents.txt` so agent discovery does not lag HTML-only overlays | Agents + Google | **Done** (this pass) |
| 117 | `vs-alias-guard.yml` every ~10m restores missing `/vs/{doom,skynet,takeoff}.html` from primaries on gh-pages; raise news-fast `PUBLISH_MIN_GAP` 300→600 so Pages can finish builds after the minute-push storm | Deploy + Google | **Done** (this pass) |
| 118 | Seed news-fast `LAST_PAGES_PUB` from gh-pages tip (clone `%ct` + API refresh each tick) so a newly armed job does not ignore the 600s gap and race collect / prior tip | Deploy + Google News | **Done** (this pass) |
| 119 | `seo-daily` detects missing `/vs/{doom,skynet,takeoff}.html` lines in `agents.md` / `llms.txt` (`agents-vs-aliases-missing`) and monitors those short aliases in `CORE_LIVE_SURFACES` so orphan/CDN lag after #116 is caught | Daily agent + Google | **Done** (this pass) |
| 120 | Bing Webmaster HTML-tag hook (`BING_SITE_VERIFICATION` → `msvalidate.01` in layout; collect + news-fast env) + `seo-daily` `open-bing-verify` — IndexNow already pings Bing; verification unlocks indexed-page truth (OUTREACH §0) | Bing | **Done** (this pass) |
| 121 | `/lab/google-deepmind.html` title/H1/FAQ about-line includes **Gemini** (`LAB_HEAD_ALIASES`) so the live head-term / trending “antigravity” route matches what people type; not a synonym doorway | Google | **Done** (this pass) |
| 122 | Same `LAB_HEAD_ALIASES` for **OpenAI / ChatGPT** and **Anthropic / Claude** (watchlist head terms already route there) — one about-line per race lab, still no doorway URLs | Google | **Done** (this pass) |
| 123 | `seo-daily` probes lab `<title>` for Gemini / ChatGPT / Claude needles (`lab-head-aliases-missing`) so CDN/orphan lag after #121/#122 is caught daily | Daily agent + Google | **Done** (this pass) |

### 3.3 Refusals (search edition)

| Refuse | Why |
|---|---|
| Thin doorway pages for every synonym of "AI doom" | Helpful-content systems demote them; our contract forbids the claim |
| Indexing empty or awaiting-baseline shells | Soft-404s teach Google to distrust the host |
| `Disallow` lines for unshipped experiments | Publishes the roadmap (`TEARDOWN` / pizzint lesson) |
| Schema that does not match visible text | Rich-result spam policy |
| Treating `llms.txt` as a Google ranking factor | [Google: not used](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) |
| Monetization that breaks the SEO rules in `MONETIZE.md` | Ads above the fold / layout shift / AdSense consent walls |

---

## 4. Daily SEO agent loop

A recurring Cursor Cloud Agent timer runs this playbook every day (15:00 UTC,
after `post-daily`). The durable command it starts from:

```bash
node collector/tools/seo-daily.mjs           # human scoreboard
node collector/tools/seo-daily.mjs --json    # machine report + gaps[]
node collector/tools/seo-daily.mjs --selftest
```

Each daily pass:

1. Run `seo-daily.mjs` — re-measure siren.watch vs pizzint / DoomBench / Skynet /
   pdoom / takeofftracker (sitemap counts, news sitemap, home title, schema,
   `llms.txt`, our findability surfaces, plus local Ready from news +
   item-archive + gated facets).
2. If gaps include `deploy-pending-url-lead`, **merge/deploy first** so
   `collect.yml` rebuilds gh-pages — do not keep shipping facet volume while
   live still trails the local tree.
3. Scan for **new search trends** we can honestly answer (activity tempo, not
   doom probability). Prefer head terms already in `COMPETITIVE-SEO.md` /
   conquest pages over synonym doorway farms.
4. Ship **one** concrete improvement: gated URL facet, title/description fix,
   schema that matches visible HTML, internal links, or conquest/evergreen copy.
   Open a PR. Update the live scoreboard paragraph in `COMPETITIVE-SEO.md` when
   rival numbers move.
5. Refuse: keyword stuffing, thin synonym doorways, future-tense doom claims,
   schema that does not match on-page text (`VOICE.md`, `CONTRACT.md`, §3.3).

Success metric stays **indexed pages + honest head-term clicks**, not raw
sitemap vanity (`COMPETITIVE.md` Phase 2).

## 5. Weekly loop (add to the VIRAL.md Monday review)

1. Search Console: indexed pages, impressions, clicks; note branded vs head-term.
2. Crawl a sample of new `/item/` URLs — title, description, canonical, JSON-LD valid.
3. Fetch `/llms.txt` and `/api/index.json` — do the links 200?
4. One AI-engine spot-check (rotate products) — cited or not, which URL.
5. If a page was corrected, confirm the live HTML and the receipt agree.

---

## 6. Sources

| Claim | Source | Read |
|---|---|---|
| Generative AI features use foundational SEO; no special AI files for Google; structured data optional for AI Overviews | [Google AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) | 2026-10-08 |
| E-E-A-T / people-first content | [Creating helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) | 2026-10-08 |
| `llms.txt` format (H1, blockquote, H2 file lists, optional markdown mirrors) | [llmstxt.org](https://llmstxt.org/) v2 | 2026-10-08 |
| Live robots, sitemap (~480 URLs), `llms.txt`, API index, homepage title/description, news-sitemap 404 | HTTP checks against the Pages site | 2026-10-08 |
| Rival SEO re-measure: pizzint news-sitemap empty; DoomBench 2,081 URLs; Skynet 1,237; SIREN ~530 + news-sitemap 100 | `docs/COMPETITIVE-SEO.md` | 2026-10-10 |
| URL-count strategy, news sitemap, Speakable, Search Console success metric | `docs/COMPETITIVE.md`, `docs/VIRAL.md` §7 | this repo |
