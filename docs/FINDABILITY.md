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

Without it, every other move is unverifiable. Operator-only:

1. Search Console → Add property → URL-prefix → the Pages URL.
2. Verify (HTML file upload into `public/` via the build, or DNS if/when the
   domain moves).
3. Submit `sitemap.xml`.
4. Weekly: Coverage (indexed vs excluded), Queries (branded + head terms),
   Experience (CWV if any).

Success metric is **indexed pages trending**, not sitemap count
(`COMPETITIVE.md` Phase 2).

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

### 1.7 News discovery (still open)

`news-sitemap.xml` is **404**. If/when item pages carry real `NewsArticle`
payloads with recent dates, ship a Google News sitemap with `news:keywords`
and keep the rolling window short. Re-check pizzint's news sitemap before
scoping (`COMPETITIVE.md` §0.1) — frozen vs rolling changes the bet.

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
| 10 | Mobile card view / less above-fold weight | Google CWV | **Done** (2026-10-12) — phone-width `<details>` deferral + below-fold `content-visibility:auto` |
| 11 | Verify Search Console; submit both sitemaps | Operator | Open |
| 12 | `/country/<iso>` for countries with ≥3 mapped datacentre sites, and `/model/<slug>` for model families named in ≥3 scored stories | Google | **Done** (2026-10-10) |
| 13 | `/compare`, `/alternatives`, `/vs/*` conquest landings | Google | **Done** (2026-10-10) |
| 14 | `/agents.md` + Grok/xAI named Allow + ChatGPT query routing in `llms.txt` | ChatGPT + Grok | **Done** (2026-10-11) |
| 15 | `/people/*` leader coverage pages + `/news/YYYY-MM-DD` day hubs + entity-only `/lab/*` | Google | **Done** (2026-10-12) |
| 16 | `/agents.txt` + `/agents.json` + `/.well-known/api-catalog` + skills index + MCP server card | Agent discovery | **Done** |
| 17 | `/tags/*` topic hubs (Skynet URL shape; curated needles, ≥5 stories) | Google | **Done** (2026-10-12) |
| 18 | `/kind/*` story-kind hubs (press/forum/paper; collector labels, ≥5 stories) | Google | **Done** (2026-10-12) |
| 19 | Live newsroom cap → 800 + durable `data/item-archive.json` for `/item/` long-tail (overflow + aged-off); more `/tags/*` (security, military, education) | Google | **Done** (2026-10-12) |
| 20 | `/outlet/<host>` publisher-domain hubs (≥5 scored stories) + tags open-weights/cloud/startups/finance/multimodal | Google | **Done** (2026-10-12) |
| 21 | Backfill `item-archive` from prior committed `news.json` snapshots (scored stories only; cap 1,600) | Google | **Done** (2026-10-12) |
| 22 | Paginated `/item/archive*.html` hubs + newsroom/publisher nav + related links into archive (anti-orphan) | Google | **Done** (2026-10-12) |
| 23 | `seo-daily` deploy-pending gap when local archive leads; richer news-sitemap keywords (cap 150); outlet→archive links | Google | **Done** (2026-10-12) |
| 24 | Tag / kind / pillar / lab hubs link matching older archive stories (anti-orphan internal links) | Google | **Done** (2026-10-12) |
| 25 | Homepage below-fold `content-visibility:auto` (CWV; crawlers still see full HTML) | Google CWV | **Done** (2026-10-12) |
| 26 | Model + people hubs link matching older archive stories (anti-orphan) | Google | **Done** (2026-10-12) |
| 27 | `/source/*` adapter hubs link older archive stories; phone-width home board deferral | Google CWV | **Done** (2026-10-12) |
| 28 | Day hubs link same-UTC-day archive stories; chips + energy topic tags (≥5 gate) | Google | **Done** (2026-10-12) |
| 29 | IndexNow pings archive hub + facet indexes + sitemap sample; labor + healthcare tags | Bing + Google | **Done** (2026-10-12) |
| 30 | Raise `item-archive` cap 1600→2400 and backfill (~2215 retained scored stories) | Google | **Done** (2026-10-12) |
| 31 | Topic tags `coding` + `acquisitions` (live ≥5 gate; Skynet-shaped search trends) | Google | **Done** (2026-10-12) |
| 32 | `/country/*` hubs list matching live + archive stories; story pages link indexable countries | Google | **Done** (2026-10-12) |
| 33 | Entity labs Oracle / Palantir / Adobe / Broadcom / Cloudflare (`/lab/*`, live ≥3 gate) | Google | **Done** (2026-10-12) |
| 34 | `/lab/` directory + `/companies.html` DoomBench-shaped company hub (same gated labs) | Google | **Done** (2026-10-12) |
| 35 | `/models.html` DoomBench-shaped models hub (same gated `/model/*` families; no model doom score) | Google | **Done** (2026-10-12) |
| 36 | Model hub gate counts live + archive stories (Gemini/Grok-class families stay indexable) | Google | **Done** (2026-10-12) |
| 37 | Entity-lab gate counts live + archive; SoftBank/Intel/AMD labs; word-boundary lab needles | Google | **Done** (2026-10-12) |
| 38 | Tag gate counts live + archive; `browser` + `watermarking` topic hubs | Google | **Done** (2026-10-12) |
| 39 | `/people.html` DoomBench-shaped people hub; people gate counts wire + archive | Google | **Done** (2026-10-12) |
| 40 | Outlet (`/outlet/*`) gate counts live + archive (AP/Axios/WaPo-class hosts stay indexable) | Google | **Done** (2026-10-12) |
| 41 | Source (`/source/*`) gate counts live + archive; topic tags `evals` + `video` + `voice` | Google | **Done** (2026-10-12) |
| 42 | Fill `item-archive` to cap 2400 via git backfill; kind gate counts live + archive | Google | **Done** (2026-10-12) |
| 43 | Raise `item-archive` cap 2400→3200 + backfill (~2831); pillar gate counts live + archive | Google | **Done** (2026-10-12) |
| 44 | Fill archive to 3200; topic tags `reasoning` + `ipo` + `rag` (search-trend hubs) | Google | **Done** (2026-10-12) |
| 45 | `/tags.html` Skynet-shaped tags hub; raise `item-archive` cap 3200→4000 | Google | **Done** (2026-10-12) |
| 46 | Home + newsroom link entity hubs; `/kinds.html`; raise archive cap 4000→5000 | Google | **Done** (2026-10-12) |
| 47 | `/outlets.html` publisher head-term hub (same gated `/outlet/*` set) | Google | **Done** (2026-10-12) |
| 48 | `/sources.html` feed-adapter head-term hub (same gated `/source/*` set) | Google | **Done** (2026-10-12) |
| 49 | `/pillars.html` + `/pillar/` directory over gated activity pillars | Google | **Done** (2026-10-12) |

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
   `llms.txt`, our findability surfaces).
2. Scan for **new search trends** we can honestly answer (activity tempo, not
   doom probability). Prefer head terms already in `COMPETITIVE-SEO.md` /
   conquest pages over synonym doorway farms.
3. Ship **one** concrete improvement: gated URL facet, title/description fix,
   schema that matches visible HTML, internal links, or conquest/evergreen copy.
   Open a PR. Update the live scoreboard paragraph in `COMPETITIVE-SEO.md` when
   rival numbers move.
4. Refuse: keyword stuffing, thin synonym doorways, future-tense doom claims,
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
