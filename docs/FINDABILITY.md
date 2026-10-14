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

### 1.7 News discovery

`news-sitemap.xml` ships a rolling ~48h window (cap 150) with `news:keywords`
(entities, labs, and matching topic-tag names). Keep the window short so the
file stays a freshness signal. Re-check pizzint's news sitemap — it flips
empty↔thin (`COMPETITIVE-SEO.md`).

### 1.8 Prefer Search Console over poisoned rank-tracker SERPs

Since September 2026, Google has been serving **poisoned** organic results to
many scrapers and rank trackers: complete-looking SERPs whose top results are
swapped ([Nozzle](https://nozzle.io/research/poisoned-google-serps/), summarized
by [Cyrus Shepard](https://x.com/CyrusShepard/status/2110087517806776502)). A
one-day “we fell out of the top 10” report is often garbage data, not a ranking
change.

For this project:

| Do | Do not |
|---|---|
| Treat **Google Search Console** (impressions, clicks, indexed count) as the ranking truth | Chase third-party rank-tracker swings without a GSC corroboration |
| Keep first-party HTML + receipts + IndexNow honest so *real* Googlebot sees the same page humans see | Infer our standing from a scraped SERP or from an AI answer that only saw a poisoned scrape |
| Point AI agents at `/api/now.txt`, `/agents.md`, `/llms.txt`, `/moves/` receipts | Tell agents to scrape Google to “find” or “rank” SIREN |

This is tip **#196** in §3.2.

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
| 50 | `/countries.html` DoomBench-shaped country hub (same gated `/country/*` map counts) | Google | **Done** (2026-10-12) |
| 51 | Topic tags `mcp` + `fine-tuning` + `quantization` (live/archive ≥5 gate; search-trend hubs) | Google | **Done** (2026-10-12) |
| 52 | Topic tags `distillation` + `memory`; newsroom entity-directory nav (anti-orphan hubs) | Google | **Done** (2026-10-12) |
| 53 | `/vs/pizzint.html` conquest + compare/alternatives; topic tag `test-time` | Google | **Done** (2026-10-12) |
| 54 | Wire PizzINT conquest from guide / FAQ / agents.md; merge latest main | Google | **Done** (2026-10-12) |
| 55 | Home + catalog + IndexNow surfaces for `/vs/*` conquest pages incl. PizzINT | Google | **Done** (2026-10-12) |
| 56 | `llms.txt` / skill map lists PizzINT conquest + pillar/country/source hubs | assistants | **Done** (2026-10-12) |
| 57 | Topic tags `hallucination` + `prompt-injection` + `moe` + `world-models` + `copyright` (live/archive ≥5 gate; search-trend hubs) | Google | **Done** (2026-10-12) |
| 58 | Topic tags `diffusion` + `embeddings` + `guardrails` + `context-window` + `ai-search`; news-sitemap keywords include matching topic names (cap 12; pizzint news contested) | Google News | **Done** (2026-10-12) |
| 59 | `/vs.html` conquest directory + topic tags `multi-agent` + `deepfakes` + `slm` + `ai-science` + `speculative-decoding` | Google | **Done** (2026-10-12) |
| 60 | Topic tags `kv-cache` + `ai-act` + `autonomous-vehicles` + `ai-music` + `synthetic-data` + `inference-cost`; seo-daily monitors `/vs.html` `/tags.html` `/companies.html` | Google | **Done** (2026-10-12) |
| 61 | Topic tags `prefer-data` + `reasoning-traces` + `claude-code` + `openrouter`; IndexNow ALWAYS `/vs.html` + hub sample | Bing | **Done** (2026-10-12) |
| 62 | `/guides.html` evergreen explainer hub (p(doom), clocks, compare/vs); tags `huggingface` + `blackwell` | Google | **Done** (2026-10-12) |
| 63 | `/guides.md` agent mirror; tags `ollama` + `mlx` + `computer-use`; seo-daily monitors models/people/countries hubs | Google + agents | **Done** (2026-10-12) |
| 64 | Model hubs match published surface forms on title/summary (unlock DeepSeek-R / Mixtral from archive); expand DeepSeek + Mistral Large forms | Google | **Done** (2026-10-12) |
| 65 | Topic tags `voice-agents` + `skills` + `tsmc` + `mcp-servers` + `llama-cpp` + `deep-research` + `lora` + `grpo` (live/archive ≥5 gate; search-trend hubs) | Google | **Done** (2026-10-12) |
| 66 | Entity lab Groq (`/lab/groq`, live/archive ≥3 gate) | Google | **Done** (2026-10-12) |
| 67 | Topic tags `rlvr` + `humanoid` + `interpretability` + `gguf` + `red-teaming` + `edge-ai` + `sft` + `copilot` + `diffusion-llm` + `activation-steering` + `rerank` + `federated-learning` | Google | **Done** (2026-10-12) |
| 68 | Entity labs Samsung / ASML / Cognition (`/lab/*`, live/archive ≥3 gate) | Google | **Done** (2026-10-12) |
| 69 | Topic tags `training-data` + `physical-ai` + `gui-agents` + `tool-calling` + `long-context` + `chain-of-thought` + `local-llm` | Google | **Done** (2026-10-12) |
| 70 | Entity labs CoreWeave / Qualcomm / Tesla / Waymo / Micron / TSMC (`/lab/*`, live/archive ≥3 gate) | Google | **Done** (2026-10-12) |
| 71 | `/vs/takeofftracker.html` conquest + compare/alternatives/vs hub wiring (seo-daily rival) | Google | **Done** (2026-10-12) |
| 72 | Topic tags `coding-agents` + `agentic-workflow` + `leaderboard` + `alignment`; entity lab Physical Intelligence | Google | **Done** (2026-10-12) |
| 73 | Topic tags `world-action` + `embodied` + `tts` + `asr`; seo-daily counts real facet sitemap rows + monitors `/vs/takeofftracker.html` | Google | **Done** (2026-10-12) |
| 74 | Topic tags `vision-language` + `foundation-models` + `video-generation` + `image-generation` + `model-merging` + `agent-memory` + `open-source-ai` + `tool-use` (live/archive ≥5 gate) | Google | **Done** (2026-10-12) |
| 75 | Entity labs Huawei / Sony (`/lab/*`, live/archive ≥3 gate); seo-daily loads `world.json` + `routes.world` so `/country/*` facet rows count | Google | **Done** (2026-10-12) |
| 76 | Topic tags `post-training` + `pretraining` + `zero-shot` + `in-context` + `tokenization` + `continual-learning` + `sparsity` + `knowledge-graphs` + `research-agents` + `system-prompts` + `ai-infrastructure` + `robot-learning` | Google | **Done** (2026-10-12) |
| 77 | Entity labs Supermicro / IREN / OpenRouter / Reflection AI (`/lab/*`, live/archive ≥3 gate) | Google | **Done** (2026-10-12) |
| 78 | Topic tags `frontier-models` + `small-models` + `open-models` + `generative-ai` + `reasoning-models` + `voice-ai` + `conversational-ai` + `audio-generation` + `ai-chips` | Google | **Done** (2026-10-12) |
| 79 | Model hub Muse Wonder (`/model/muse-wonder`, live/archive ≥3 gate) | Google | **Done** (2026-10-12) |
| 80 | Topic tags `ai-regulation` + `artificial-analysis` + `humanoid-robots` + `transformers` + `self-attention` + `openai-codex` + `reward-models` | Google | **Done** (2026-10-12) |
| 81 | IndexNow ALWAYS adds `/vs/takeofftracker.html`, Muse Wonder model, IREN/Reflection labs, generative-AI/AI-chips/frontier/post-training tag samples | Bing | **Done** (2026-10-12) |
| 82 | Topic tags `reinforcement-learning` + `vision-language-action` + `flow-matching` + `text-to-image` + `imitation-learning` + `locomotion` | Google | **Done** (2026-10-12) |
| 83 | News-sitemap `news:keywords` lab list expands (Huawei/Sony/Supermicro/IREN/OpenRouter/Reflection AI/Muse Wonder/Artificial Analysis) for Google News contest | Google News | **Done** (2026-10-12) |
| 84 | Topic tags `self-supervised` + `latent-space` + `autoencoders` + `diffusion-transformer` + `scaling-laws`; IndexNow ALWAYS samples RL/VLA/self-supervised/DiT/scaling-laws | Google + Bing | **Done** (2026-10-12) |
| 85 | Topic tags `ai-assistants` + `code-generation` + `linear-attention` + `state-space-models` + `ai-factories` + `multimodal-reasoning`; IndexNow ALWAYS samples assistants/code-gen/SSM/AI-factories | Google + Bing | **Done** (2026-10-12) |
| 86 | Topic tags `model-pruning` + `peft` + `test-time-training` + `gaussian-splatting` + `domain-adaptation`; IndexNow ALWAYS samples pruning/PEFT/Gaussian/TTT | Google + Bing | **Done** (2026-10-12) |
| 87 | Topic tags `llm-agents` + `on-policy-distillation` + `time-series` + `self-distillation` + `video-world-models` + `machine-unlearning`; IndexNow ALWAYS samples LLM-agents/on-policy/time-series/unlearning | Google + Bing | **Done** (2026-10-12) |
| 88 | Topic tags `neural-networks` + `self-improving-ai` + `provenance` + `sparse-attention` + `synthid` + `dexterous-manipulation`; IndexNow ALWAYS samples neural-networks/self-improving/sparse-attention/SynthID | Google + Bing | **Done** (2026-10-12) |
| 89 | Entity labs Decart / Sakana AI / Isomorphic Labs / Winverse AI / Cisco (`/lab/*`, live/archive ≥3); tags `protein-design` + `drug-discovery`; news:keywords + IndexNow samples | Google + Bing | **Done** (2026-10-12) |
| 90 | News-sitemap `news:keywords` prioritizes entity + lab surfaces before topic-tag flood so the 12-cap keeps head-term names (pizzint-news-alive contest) | Google News | **Done** (2026-10-12) |
| 91 | Organization `knowsAbout` adds head terms: AI activity index today, AI tempo index, DoomBench/Skynet/Takeoff Tracker/Pentagon Pizza Index alternatives (schema matches conquest pages) | Google | **Done** (2026-10-12) |
| 92 | `/ai-doomsday-clock.html` question-shaped title + `knowsAbout` “verifiable AI doomsday clock”; `/compare.html` title includes Takeoff Tracker (Bulletin / AI clock head terms) | Google | **Done** (2026-10-12) |
| 93 | `/guide.html` FAQPage + WebPage speakable + BreadcrumbList matching DEFCON / Doomsday Clock / p(doom) comparison table (schema was Organization-only) | Google | **Done** (2026-10-12) |
| 94 | `/p-doom.html` + `/ai-doomsday-clock.html` WebPage speakable + BreadcrumbList alongside existing FAQ (p(doom) glossary head term) | Google | **Done** (2026-10-12) |
| 95 | Model hub Maia (`/model/maia`, Maia 300 / Azure Maia forms, live/archive ≥3); news:keywords + IndexNow sample (pizzint-news contest) | Google + Bing | **Done** (2026-10-12) |
| 96 | `/methodology.html` head-term title + TechArticle speakable + BreadcrumbList + FAQ from question-shaped section headings (recompute / what it measures) | Google | **Done** (2026-10-12) |
| 97 | Model hub Codex (`/model/codex`, OpenAI Codex / Codex CLI / Hackathon forms — no bare Codex); news:keywords + IndexNow | Google + Bing | **Done** (2026-10-12) |
| 98 | Entity lab Epoch AI (`/lab/epoch-ai`, two-word form only, ≥3 gate); seo-daily monitors methodology/guide/clock/Maia/Codex/Epoch; IndexNow samples | Google + Bing | **Done** (2026-10-12) |
| 99 | `/p-doom.html` question-shaped title (“What is p(doom)?”) + Organization `knowsAbout` glossary/methodology head terms | Google | **Done** (2026-10-13) |
| 100 | `/methodology.html` FAQ expands with five more question-shaped headings (market pillar, flicker, missing source, receipt, mislead) — visible text only | Google | **Done** (2026-10-13) |
| 101 | `/history.html` question-shaped title + Article speakable + BreadcrumbList; IndexNow + seo-daily monitor; Organization `knowsAbout` “history of AI risk” | Google + Bing | **Done** (2026-10-13) |
| 102 | `/guides.html` question-shaped title + CollectionPage speakable + BreadcrumbList; visible FAQ matching schema; history in GUIDES; `knowsAbout` “AI explainers” | Google | **Done** (2026-10-13) |
| 103 | Entity lab Artificial Analysis (`/lab/artificial-analysis`, two-word form only, ≥3 gate); IndexNow + seo-daily monitor | Google + Bing | **Done** (2026-10-13) |
| 104 | `/methodology.html` FAQ adds pillars/arithmetic/reference/biases/attribution/limitations question headings (visible text only) | Google | **Done** (2026-10-13) |
| 105 | `/compare.html` `/alternatives.html` `/vs.html` question-shaped titles + visible FAQ matching schema (same pairs as FAQPage) | Google | **Done** (2026-10-13) |
| 106 | `/vs/*` rival pages question-shaped titles (“which should you use?”) + visible FAQ matching schema | Google | **Done** (2026-10-13) |
| 107 | `/jobs.html` `/medicine.html` question-shaped titles (home-card head terms) + WebPage speakable + BreadcrumbList + visible FAQ; `knowsAbout` jobs/medicine head terms | Google | **Done** (2026-10-13) |
| 108 | `/about.html` question-shaped title (“What is SIREN?”) + WebPage speakable + BreadcrumbList + visible FAQ; IndexNow + seo-daily; `knowsAbout` “what is SIREN” | Google + Bing | **Done** (2026-10-13) |
| 109 | `/privacy.html` question-shaped title (“What does SIREN know about you?”) + WebPage speakable + BreadcrumbList + visible FAQ; IndexNow + seo-daily; `knowsAbout` “SIREN privacy” | Google + Bing | **Done** (2026-10-13) |
| 110 | `/press.html` question-shaped title (“Where is the SIREN press kit?”) + WebPage speakable + BreadcrumbList + visible FAQ; IndexNow + seo-daily; `knowsAbout` “SIREN press kit” | Google + Bing | **Done** (2026-10-13) |
| 111 | `/terms.html` question-shaped title (“What are the SIREN terms of use?”) + WebPage speakable + BreadcrumbList + visible FAQ; IndexNow + seo-daily; `knowsAbout` “SIREN terms of use” | Google + Bing | **Done** (2026-10-13) |
| 112 | `/disclosures.html` question-shaped title (“What does SIREN disclose?”) + WebPage speakable + BreadcrumbList + visible FAQ; IndexNow + seo-daily; `knowsAbout` “SIREN disclosures” | Google + Bing | **Done** (2026-10-13) |
| 113 | `/brand.html` question-shaped title (“Where is the SIREN brand guide?”) + WebPage speakable + BreadcrumbList + visible FAQ; IndexNow + seo-daily; `knowsAbout` “SIREN brand guide” | Google + Bing | **Done** (2026-10-13) |
| 114 | Entity labs Salesforce / World Labs (`/lab/*`, live/archive ≥3 gate; World Labs two-word only; refuse Scale AI / Replicate / Listen Labs under gate or false friends); news:keywords + IndexNow + seo-daily | Google + Bing | **Done** (2026-10-13) |
| 115 | Model hub Nano Banana (`/model/nano-banana`, Nano Banana / 2 / 2.1 forms — no bare Banana; live/archive ≥3); news:keywords + IndexNow + seo-daily | Google + Bing | **Done** (2026-10-13) |
| 116 | `/model/*` + `/models.html` question-shaped titles + CollectionPage speakable + visible FAQ matching schema; `knowsAbout` “AI models this index scored” | Google | **Done** (2026-10-13) |
| 117 | `/lab/*` + `/companies.html` question-shaped titles + CollectionPage speakable + visible FAQ matching schema; `knowsAbout` “AI companies this index scored” | Google | **Done** (2026-10-13) |
| 118 | `/tags/*` + `/tags.html` question-shaped titles + CollectionPage speakable + visible FAQ matching schema (175 gated topic hubs); `knowsAbout` “AI tags this index scored” | Google | **Done** (2026-10-13) |
| 119 | `/people/` + `/people.html` question-shaped titles + CollectionPage speakable + visible FAQ matching schema; `knowsAbout` “AI people this index scored” | Google | **Done** (2026-10-13) |
| 120 | `/kind/*` + `/kinds.html` question-shaped titles + CollectionPage speakable + visible FAQ matching schema; `knowsAbout` “AI story kinds this index scored” | Google | **Done** (2026-10-13) |
| 121 | `/outlet/*` + `/outlets.html` question-shaped titles + CollectionPage speakable + visible FAQ matching schema; `knowsAbout` “AI outlets this index scored” | Google | **Done** (2026-10-13) |
| 122 | `/source/*` + `/sources.html` question-shaped titles + CollectionPage speakable + visible FAQ matching schema; `knowsAbout` “AI news sources this index scored” | Google | **Done** (2026-10-13) |
| 123 | `/pillar/*` + `/pillars.html` question-shaped titles + CollectionPage speakable + visible FAQ matching schema; `knowsAbout` “AI activity pillars this index scored” | Google | **Done** (2026-10-13) |
| 124 | `/country/*` + `/countries.html` question-shaped titles + Dataset/CollectionPage speakable + visible FAQ matching schema; `knowsAbout` “AI datacentre countries this index scored” | Google | **Done** (2026-10-13) |
| 125 | `/lab/` + `/model/` directory indexes question-shaped titles + CollectionPage speakable + visible FAQ matching schema; `knowsAbout` “AI labs this index scored” | Google | **Done** (2026-10-13) |
| 126 | `/tags/` + `/kind/` directory indexes question-shaped titles + CollectionPage speakable + visible FAQ matching schema | Google | **Done** (2026-10-13) |
| 127 | `/outlet/` + `/source/` directory indexes question-shaped titles + CollectionPage speakable + visible FAQ matching schema | Google | **Done** (2026-10-13) |
| 128 | `/pillar/` + `/country/` directory indexes question-shaped titles + CollectionPage speakable + visible FAQ matching FAQPage schema | Google | **Done** (2026-10-13) |
| 129 | `/news/YYYY-MM-DD` day hubs question-shaped titles + CollectionPage speakable + visible FAQ matching FAQPage schema (Skynet-shaped freshness) | Google | **Done** (2026-10-13) |
| 130 | `/news.html` newsroom question-shaped title + CollectionPage speakable + visible FAQ matching FAQPage schema; `knowsAbout` “AI stories this index scored” | Google | **Done** (2026-10-13) |
| 131 | `/leaders.html` question-shaped title + CollectionPage speakable + visible FAQ matching FAQPage schema; `knowsAbout` “AI leaders on the record” | Google | **Done** (2026-10-13) |
| 132 | `/race.html` question-shaped title + Dataset speakable + visible FAQ matching FAQPage schema; `knowsAbout` “AI race” / “who is winning the AI race” | Google | **Done** (2026-10-13) |
| 133 | `/tags/ipo` needle expands (Moonshot / Firmus / Nvidia-backed AI listing forms) so the hub clears TAG_INDEX_MIN; IndexNow + `knowsAbout` “AI IPOs this index scored” | Google + Bing | **Done** (2026-10-13) |
| 134 | `/item/` live-window index + `/item/archive*` hubs question-shaped titles + CollectionPage speakable + visible FAQ matching FAQPage schema; `knowsAbout` “scored AI stories this index kept” | Google | **Done** (2026-10-13) |
| 135 | Entity lab Firmus (`/lab/firmus`, live/archive ≥3 gate; refuse bare “firm”); news:keywords + IndexNow + seo-daily surface | Google + Bing | **Done** (2026-10-13) |
| 136 | Entity lab SpaceX (`/lab/spacex`, live/archive ≥3 gate; refuse bare “space”); news:keywords + IndexNow + seo-daily surface | Google + Bing | **Done** (2026-10-13) |
| 137 | Tag needle expands clear `/tags/edge-ai` `/tags/audio-generation` `/tags/ai-regulation` `/tags/openai-codex` `/tags/imitation-learning` `/tags/protein-design` (refuse bare TTS / bare Codex); IndexNow samples | Google + Bing | **Done** (2026-10-13) |
| 138 | Entity lab HCLTech (`/lab/hcltech`, HCLTech / HCL Tech forms; refuse bare “HCL”) + `/tags/tsmc` “Taiwan Semi” needle; IndexNow + seo-daily | Google + Bing | **Done** (2026-10-13) |
| 139 | `/world.html` question-shaped title + Dataset speakable + visible FAQ matching FAQPage schema; IndexNow + seo-daily; `knowsAbout` “how many datacentres mapped on Earth” | Google + Bing | **Done** (2026-10-13) |
| 140 | Entity lab Suno (`/lab/suno`, live/archive ≥3 gate; refuse bare “sun”); news:keywords + IndexNow + seo-daily surface | Google + Bing | **Done** (2026-10-13) |
| 141 | `/map.html` question-shaped title + Dataset speakable + visible FAQ matching FAQPage schema; IndexNow + seo-daily; `knowsAbout` “how many datacentres mapped in the United States” | Google + Bing | **Done** (2026-10-13) |
| 142 | `/watts.html` question-shaped title + Dataset speakable + visible FAQ matching FAQPage schema; IndexNow + seo-daily; `knowsAbout` “SIREN infrastructure index” / “what does the SIREN infrastructure index read” | Google + Bing | **Done** (2026-10-13) |
| 143 | `/charts.html` question-shaped title + WebPage speakable + visible FAQ matching FAQPage schema; IndexNow + seo-daily; `knowsAbout` “AI charts” / “what AI charts does SIREN publish” | Google + Bing | **Done** (2026-10-13) |
| 144 | `/power.html` question-shaped title + Dataset speakable + visible FAQ matching FAQPage schema; tag needle clears `/tags/red-teaming` via “jailbreak detection” (refuse bare jailbreak); IndexNow + seo-daily; `knowsAbout` “who makes the most electricity” | Google + Bing | **Done** (2026-10-13) |
| 145 | `/digest.html` question-shaped title + Report speakable + visible FAQ matching FAQPage schema; IndexNow + seo-daily; `knowsAbout` “SIREN daily brief” / “what is the SIREN daily brief” | Google + Bing | **Done** (2026-10-13) |
| 146 | `/exploits.html` question-shaped title + Dataset speakable + visible FAQ matching FAQPage schema (null-result exploit lag; refuse never_say doom/attack claims); IndexNow + seo-daily; `knowsAbout` “CVE exploit lag” | Google + Bing | **Done** (2026-10-13) |
| 147 | `/flock.html` question-shaped title + Dataset speakable + visible FAQ matching FAQPage schema (ALPR/camera map conquest; refuse never_say all/every/national-total claims); IndexNow + seo-daily; `knowsAbout` “how many Flock ALPR cameras has SIREN mapped” | Google + Bing | **Done** (2026-10-13) |
| 148 | `/bliss.html` question-shaped title + Dataset speakable + visible FAQ matching FAQPage schema (upside-index differentiator; refuse doom-probability/forecast claims); IndexNow + seo-daily; `knowsAbout` “what is BLISS, the SIREN upside index” | Google + Bing | **Done** (2026-10-13) |
| 149 | `/balance.html` question-shaped title + Dataset speakable + visible FAQ matching FAQPage schema (harm/benefit side-by-side; refuse net-score / doom-verdict claims); IndexNow + seo-daily; `knowsAbout` “how does SIREN count AI harm and benefit side by side” | Google + Bing | **Done** (2026-10-13) |
| 150 | `/desk.html` question-shaped title + WebPage speakable + visible FAQ matching FAQPage schema (Tally side indexes; refuse signal/forecast/main-index-input claims); IndexNow + seo-daily; `knowsAbout` “what unserious counts does SIREN keep on Tally's desk” | Google + Bing | **Done** (2026-10-13) |
| 151 | `/breakthroughs.html` question-shaped title + CollectionPage speakable + visible FAQ matching FAQPage schema (good-news conquest vs doom-only rivals; refuse verified-cure / forecast claims); IndexNow + seo-daily; `knowsAbout` “what AI breakthroughs has SIREN tracked” | Google + Bing | **Done** (2026-10-13) |
| 152 | `/instruments.html` question-shaped title + WebPage speakable + visible FAQ matching FAQPage schema (instrument-room behind the reading; refuse predict/doom-probability claims); IndexNow + seo-daily; `knowsAbout` “what instruments sit behind the SIREN reading” | Google + Bing | **Done** (2026-10-13) |
| 153 | `/waffle.html` question-shaped title + Dataset speakable + visible FAQ matching FAQPage schema (Waffle House Index conquest; refuse official FEMA / outage-report claims); IndexNow + seo-daily; `knowsAbout` “is the Waffle House open” | Google + Bing | **Done** (2026-10-13) |
| 154 | `/threats.html` question-shaped title + Dataset speakable + visible FAQ matching FAQPage schema (CISA/botnet/space-weather board; refuse offline-tonight forecast / dark-feed-as-clear claims); IndexNow + seo-daily; `knowsAbout` “what could take the machines offline tonight” | Google + Bing | **Done** (2026-10-13) |
| 155 | `/si-ready.html` question-shaped title + WebPage speakable + visible FAQ matching FAQPage schema (Ready for SI personal plan; refuse SI-date / doom-probability / financial-advice claims); IndexNow + seo-daily; `knowsAbout` “ready for superintelligence” | Google + Bing | **Done** (2026-10-13) |
| 156 | `/nations.html` question-shaped title + Dataset speakable + visible FAQ matching FAQPage schema (USA vs China nations race; refuse SIREN-forecast / financial-advice / doom-probability claims); IndexNow + seo-daily; `knowsAbout` “USA vs China: who is winning the race to superintelligence” | Google + Bing | **Done** (2026-10-13) |
| 157 | `/ai-proof-job.html` question-shaped title + WebPage speakable + visible FAQ matching FAQPage schema (personal job plan; refuse job-security guarantees / career-advice / mass-unemployment doom claims); IndexNow + seo-daily; `knowsAbout` “how do I AI-proof my job” | Google + Bing | **Done** (2026-10-13) |
| 158 | `/status.html` question-shaped title + WebPage speakable + BreadcrumbList + visible FAQ matching FAQPage schema (Is ChatGPT/Claude down; refuse UNKNOWN-as-up / SIREN-over-official-status / outage-forecast claims); IndexNow + seo-daily; `knowsAbout` “Is ChatGPT down” | Google + Bing | **Done** (2026-10-13) |
| 159 | `/bug-out-land.html` question-shaped title + WebPage speakable + visible FAQ matching FAQPage schema (remote land checklist; refuse Skynet-as-forecast / real-estate-advice / doom-probability claims); IndexNow + seo-daily; `knowsAbout` “where to buy remote land to ride out Skynet” | Google + Bing | **Done** (2026-10-13) |
| 160 | `/prepper-checklist.html` question-shaped title + WebPage speakable + visible FAQ matching FAQPage schema (72-hour kit + two weeks at home; refuse Judgment-Day-as-forecast / professional-advice / doom-probability claims); IndexNow + seo-daily; `knowsAbout` “what belongs in a 72-hour prepper kit” | Google + Bing | **Done** (2026-10-13) |
| 161 | `/bunker-kit.html` question-shaped title + WebPage speakable + visible FAQ matching FAQPage schema (50 free tools + supply crates; refuse Skynet-as-forecast / professional-advice / doom-probability claims; ItemList from build prerender kept); IndexNow + seo-daily; `knowsAbout` “what free tools belong in a bunker kit” | Google + Bing | **Done** (2026-10-13) |
| 162 | `/si-watch.html` question-shaped title + Dataset speakable + visible FAQ matching FAQPage schema (Takeover Watch autonomy signals; refuse SIREN-as-takeover-forecast / AGI-date-as-SIREN-claim / doom-probability claims); IndexNow + seo-daily; `knowsAbout` “what AI autonomy signals is SIREN watching” | Google + Bing | **Done** (2026-10-13) |
| 163 | `/bets.html` question-shaped title + Dataset speakable + visible FAQ matching FAQPage schema (Tally’s scored bets about the index; refuse index-as-prediction / world-AI-forecasts-as-SIREN-bets / doom-probability claims); IndexNow + seo-daily; `knowsAbout` “Does the SIREN index make forecasts” | Google + Bing | **Done** (2026-10-13) |
| 164 | `/self-aware.html` question-shaped title + WebPage speakable + visible FAQ matching FAQPage schema (Skynet scenario fiction on real data-centre map; refuse Skynet-as-forecast / real-attack / doom-probability-from-fiction claims); IndexNow + seo-daily; `knowsAbout` “What if an AI wakes up at 2:14 a.m.” | Google + Bing | **Done** (2026-10-13) |
| 165 | `/day-after.html` question-shaped title + WebPage speakable + visible FAQ matching FAQPage schema (AI backlash game; Game schema kept; refuse forecast / harm-method / doom-probability claims); IndexNow + seo-daily; `knowsAbout` “What happens the day after an AI catastrophe” | Google + Bing | **Done** (2026-10-13) |
| 166 | `/contain.html` question-shaped title + WebPage speakable + visible FAQ matching FAQPage schema (Containment arcade; VideoGame schema kept; refuse real-breakout-forecast / harm-method / doom-probability claims); IndexNow + seo-daily; `knowsAbout` “Can you stop an AI breakout” | Google + Bing | **Done** (2026-10-13) |
| 167 | `/moltbook.html` question-shaped title + Dataset speakable + visible FAQ matching FAQPage schema (Agent Watch on Moltbook; refuse Agent-Watch-as-index-input / agent-takeover-as-SIREN-claim / doom-probability claims); IndexNow + seo-daily; `knowsAbout` “What are AI agents saying on Moltbook” | Google + Bing | **Done** (2026-10-13) |
| 168 | `/games.html` question-shaped title + CollectionPage speakable + visible FAQ matching FAQPage schema (SIREN Arcade hub; refuse games-as-doom-forecast / real-takeover-method / doom-probability claims); IndexNow + seo-daily; `knowsAbout` “What free AI games can you play on SIREN” | Google + Bing | **Done** (2026-10-13) |
| 169 | `/evolution.html` question-shaped title + Dataset speakable + visible FAQ matching FAQPage schema (Evolution Log day-by-day activity; refuse Evolution-Log-as-forecast / page-as-index-input / doom-probability claims); IndexNow + seo-daily; `knowsAbout` “How has AI activity moved day by day” | Google + Bing | **Done** (2026-10-13) |
| 170 | `/radio.html` question-shaped title + WebPage speakable + visible FAQ matching FAQPage schema (SIREN Radio browser stations; refuse Radio-as-index-input / doom-probability / forecast claims); IndexNow + seo-daily; `knowsAbout` “What free music does SIREN Radio play” | Google + Bing | **Done** (2026-10-13) |
| 171 | `/videos.html` question-shaped title + CollectionPage speakable + visible FAQ matching FAQPage schema (SIREN TV explainers; VideoObject kept; refuse videos-as-forecast / SI-date-as-SIREN-claim / doom-probability claims); IndexNow + seo-daily; `knowsAbout` “What free AI explainer videos does SIREN publish” | Google + Bing | **Done** (2026-10-13) |
| 172 | `/live.html` question-shaped title + CollectionPage speakable + visible FAQ matching FAQPage schema (AI on TV & radio live room; refuse live-room-as-forecast / endorsement-as-SIREN-claim / doom-probability claims); IndexNow + seo-daily; `knowsAbout` “What AI is on TV and radio right now” | Google + Bing | **Done** (2026-10-13) |
| 173 | `/catalog.html` question-shaped title + CollectionPage speakable + ItemList + visible FAQ matching FAQPage schema (site directory; refuse catalog-as-doom-index / stuffing / doom-probability claims); IndexNow + seo-daily; `knowsAbout` “Where is everything on SIREN listed” | Google + Bing | **Done** (2026-10-13) |
| 174 | `/search.html` question-shaped title + WebPage speakable + visible FAQ matching FAQPage schema (site-wide search; refuse search-as-doom-oracle / stuffing / doom-probability claims); IndexNow + seo-daily; `knowsAbout` “How do you search everything on SIREN” | Google + Bing | **Done** (2026-10-13) |
| 175 | `/tally.html` question-shaped title + WebPage speakable + visible FAQ matching FAQPage schema (duty canary mascot; refuse tally-as-doom-oracle / mood-as-severity / doom-probability claims); IndexNow + seo-daily; `knowsAbout` “Who is Tally, the SIREN duty canary” | Google + Bing | **Done** (2026-10-13) |
| 176 | `/staff.html` question-shaped title + WebPage speakable + visible FAQ matching FAQPage schema (automated crew; refuse editor-picks-the-level / staff-as-doom-oracle / doom-probability claims); IndexNow + seo-daily; `knowsAbout` “Who is the automated crew that runs SIREN” | Google + Bing | **Done** (2026-10-13) |
| 177 | `/careers.html` question-shaped title + WebPage speakable + visible FAQ matching FAQPage schema (AI-welcome open roles; refuse paid-salary / stuffing / doom-probability claims); IndexNow + seo-daily; `knowsAbout` “What jobs is SIREN hiring AIs for” | Google + Bing | **Done** (2026-10-13) |
| 178 | `/agents.html` question-shaped title + WebPage speakable + visible FAQ matching FAQPage schema (AI-agent open data + Moltbook rules; refuse agents-as-doom-oracle / scrape-everything / doom-probability claims); IndexNow + seo-daily; `knowsAbout` “How should AI agents use SIREN” | Google + Bing | **Done** (2026-10-13) |
| 179 | `/elon.html` question-shaped title + WebPage speakable + visible FAQ matching FAQPage schema (Real Clips of AI leaders; refuse endorsement / deepfake-judgment-by-looking / doom-probability claims; topic switcher kept); IndexNow + seo-daily; `knowsAbout` “Where can you find real clips of AI leaders” | Google + Bing | **Done** (2026-10-13) |
| 180 | `/game.html` question-shaped title + WebPage speakable + VideoGame + visible FAQ matching FAQPage schema (Tally Counts 30-second game; refuse game-as-index-input / doom-probability / prediction-as-SIREN-claim); IndexNow + seo-daily; `knowsAbout` “How do you play Tally Counts” | Google + Bing | **Done** (2026-10-13) |
| 181 | `/dispatch.html` question-shaped title + WebPage speakable + visible FAQ matching FAQPage schema (911/CAD + alerts + blather; refuse emergency-response advice / dispatch-as-index-input / doom-probability claims); IndexNow + seo-daily; `knowsAbout` “What public feeds does SIREN Dispatch show” | Google + Bing | **Done** (2026-10-13) |
| 182 | `/monitor.html` question-shaped title + WebPage speakable + visible FAQ matching FAQPage schema (World Monitor map + stress index; refuse forecast / danger-as-score / doom-probability claims); IndexNow + seo-daily; `knowsAbout` “What does the SIREN World Monitor show” | Google + Bing | **Done** (2026-10-13) |
| 183 | `/scanner.html` question-shaped title + WebPage speakable + visible FAQ matching FAQPage schema (Capitulation Scanner stocks/ETFs/crypto; refuse financial advice / scanner-as-index-input / doom-probability claims); IndexNow + seo-daily; `knowsAbout` “What does the SIREN Capitulation Scanner show” | Google + Bing | **Done** (2026-10-13) |
| 184 | `/arena.html` question-shaped title + WebPage speakable + visible FAQ matching FAQPage schema (daily picks + filings + AI battle; tab JS keeps question title; refuse financial advice / arena-as-index-input / doom-probability claims); IndexNow + seo-daily; `knowsAbout` “What does SIREN Arena show” | Google + Bing | **Done** (2026-10-13) |
| 185 | `/live-x.html` question-shaped title + WebPage speakable + visible FAQ matching FAQPage schema (live X feeds + Spaces; refuse embed-as-tracking / SIREN-as-X-oracle / doom-probability claims); IndexNow + seo-daily; `knowsAbout` “Where are live X feeds and Spaces on AI” | Google + Bing | **Done** (2026-10-13) |
| 186 | `/feedback.html` question-shaped title + WebPage speakable + visible FAQ matching FAQPage schema (GitHub public issues; refuse private intake / doom-probability / stuffing); IndexNow + seo-daily; `knowsAbout` “How do I report a problem or send an idea to SIREN” | Google + Bing | **Done** (2026-10-13) |
| 187 | `/alerts.html` question-shaped title + WebPage speakable + visible FAQ matching FAQPage schema (RSS / email recipes / in-tab notify; refuse private email intake / alerts-as-index-input / doom-probability); IndexNow + seo-daily; `knowsAbout` “How do I get alerts when SIREN moves” | Google + Bing | **Done** (2026-10-13) |
| 188 | `/export.html` question-shaped title + WebPage speakable + visible FAQ matching FAQPage schema (CSV/JSON/widget/badge/API; refuse paid-key / export-as-index-input / doom-probability); IndexNow + seo-daily; `knowsAbout` “How do I export and embed SIREN data” | Google + Bing | **Done** (2026-10-13) |
| 189 | `/bias.html` question-shaped title + WebPage speakable + visible FAQ matching FAQPage schema (English/US input blind spots; refuse doom-probability / stuffing / bias-as-excuse-to-hide-method); IndexNow + seo-daily; `knowsAbout` “What can SIREN not see” | Google + Bing | **Done** (2026-10-13) |
| 190 | `/reference-plan.html` question-shaped title + WebPage speakable + visible FAQ matching FAQPage schema (frozen baseline + shadow promotion; refuse doom-forecast / quiet-rebase / stuffing); IndexNow + seo-daily; `knowsAbout` “How does the SIREN baseline get updated” | Google + Bing | **Done** (2026-10-13) |
| 191 | `/changelog.html` question-shaped title + WebPage speakable + visible FAQ matching FAQPage schema (hourly moves; refuse newsroom-as-cause / doom-probability / stuffing); IndexNow + seo-daily; `knowsAbout` “What moved the SIREN score this hour” | Google + Bing | **Done** (2026-10-13) |
| 192 | `/labs.html` question-shaped title + CollectionPage speakable + visible FAQ matching FAQPage schema (weekly open-data experiments; refuse SI-arrival-date / labs-as-index-input / doom-probability); IndexNow + seo-daily; `knowsAbout` “What is SIREN Labs measuring this week” | Google + Bing | **Done** (2026-10-13) |
| 193 | `/library.html` question-shaped title + CollectionPage speakable + visible FAQ matching FAQPage schema (both-sides reading list; refuse endorsement-as-SIREN-claim / library-as-index-input / doom-probability); IndexNow + seo-daily; `knowsAbout` “What AI books argue both sides of the case” | Google + Bing | **Done** (2026-10-13) |
| 194 | `/sponsor.html` question-shaped title + WebPage speakable + visible FAQ matching FAQPage schema (one labelled sponsor; refuse sponsor-moves-score / visitor-data-sale / doom-probability); IndexNow + seo-daily; `knowsAbout` “How do you sponsor SIREN without moving the number” | Google + Bing | **Done** (2026-10-13) |
| 195 | `/nothing.html` question-shaped title + WebPage speakable + visible FAQ matching FAQPage schema (Nothing Ever Happens ledger; refuse NEH-as-main-index / auto-miss-overdue / doom-probability); IndexNow + seo-daily; `knowsAbout` “How often do dated AI claims miss” | Google + Bing | **Done** (2026-10-13) |
| 196 | First-party citation when Google poisons scraper SERPs (Cyrus Shepard / Nozzle 2026-10): `/moves/` question title + CollectionPage speakable + FAQPage; `/agents.html` FAQ + rules + `skill.md` / `agents.md` / `llms.txt` “do not scrape Google for rank”; IndexNow + seo-daily; `knowsAbout` “Should AI agents scrape Google…” / “Where are the SIREN index moves”; prefer GSC over third-party rank trackers (§1.8) | Google + agents | **Done** (2026-10-13) |
| 197 | `/classic.html` question-shaped title + WebPage speakable + visible FAQ matching FAQPage schema (full instrument panel; fix duplicate canonical `/`; refuse classic-as-doom-index / forecast / stuffing); IndexNow + seo-daily; `knowsAbout` “Where is the full SIREN instrument panel”; move pages link hub by tip #196 question title | Google + Bing | **Done** (2026-10-13) |
| 198 | `/history.html` H1 + Article headline + ogTitle aligned to question title “What is the history of AI risk?”; FAQ lead question matches; sibling links; seo-daily monitors tipped hubs `/news.html` `/leaders.html` `/race.html` `/kinds.html` `/outlets.html` `/p-doom.html`; `knowsAbout` full question | Google + Bing | **Done** (2026-10-13) |
| 199 | `/guide.html` question-shaped title + matching H1 + **visible** FAQ matching FAQPage schema (was schema-only); refuse DEFCON/Doomsday hijack / doom-probability / forecast; siblings history + methodology + p(doom); `knowsAbout` “How does SIREN compare to DEFCON…”; guide.md + GUIDES hub name aligned | Google + Bing | **Done** (2026-10-13) |
| 200 | `/ai-doomsday-clock.html` H1 aligned to question title “Is there an AI doomsday clock?” + **visible** FAQ matching FAQPage schema (was schema-only); refuse SIREN-as-doomsday-clock / doom-probability / forecast; siblings guide + p(doom) + methodology; `knowsAbout` full question | Google + Bing | **Done** (2026-10-13) |
| 201 | `/p-doom.html` question H1 “What is p(doom)?” + **visible** FAQ matching FAQPage schema (was schema-only; voices FAQ now on-page too); refuse SIREN-as-p(doom) / doom-probability / forecast; siblings guide + clock + methodology; `knowsAbout` “What is p(doom)” | Google + Bing | **Done** (2026-10-13) |
| 202 | `/methodology.html` H1 + methodology.md + breadcrumbs + TechArticle headline aligned to question title “How the SIREN AI activity index is computed · methodology” (was bare “Methodology”); `knowsAbout` full phrase | Google + Bing + agents | **Done** (2026-10-13) |
| 203 | `/guides.html` H1 + guides.md + CollectionPage/ItemList/breadcrumbs aligned to question title “What are the AI explainers?” (was mismatched em-dash H1); FAQ lead matches; refuse doom-probability; siblings guide/p(doom)/clock/methodology; `knowsAbout` full question | Google + Bing + agents | **Done** (2026-10-13) |
| 204 | `/about.html` H1 + FAQ lead + breadcrumbs + WebPage name aligned to question title “What is SIREN?” (was “What is SIREN, and who is behind it?”); refuse doom-probability; siblings methodology + guide + privacy; `knowsAbout` “What is SIREN” | Google + Bing | **Done** (2026-10-13) |
| 205 | `/privacy.html` H1 + FAQ lead + breadcrumbs + WebPage name aligned to question title “What does SIREN know about you?” (was “What does this site know about you?”); siblings about + disclosures + feedback; `knowsAbout` full question | Google + Bing | **Done** (2026-10-13) |
| 206 | `/compare.html` H1 + FAQ lead + breadcrumbs + WebPage name aligned to question title “Which AI doom indexes can you compare?” (was “…honestly?”); refuse DEFCON/doom-probability; siblings vs + guide + methodology; `knowsAbout` full question | Google + Bing | **Done** (2026-10-13) |
| 207 | `/alternatives.html` H1 + FAQ lead + breadcrumbs + WebPage name aligned to question title “What are AI doom index alternatives?” (was “…and what is each one?”); refuse doom-probability / DEFCON hijack; siblings compare + vs + guide + p(doom); `knowsAbout` full question | Google + Bing | **Done** (2026-10-13) |
| 208 | `/vs/*` rival pages H1 + FAQ lead + breadcrumbs + WebPage name aligned to question title “SIREN vs {rival}: which should you use?” (was em-dash H1 / “which should I use?” FAQ); refuse borrowed doom probability; `knowsAbout` vs head terms | Google + Bing | **Done** (2026-10-13) |
| 209 | `/jobs.html` `/medicine.html` H1 + FAQ lead + breadcrumbs + WebPage name aligned to question title stems (“What has actually been measured” / “Trial results, approvals…”); refuse jobs/medicine forecasts and doom-probability; `knowsAbout` full stems | Google + Bing | **Done** (2026-10-13) |
| 210 | Catalog + footer provenance + agents.md link labels for about/press/brand/terms/privacy/disclosures/sponsor aligned to question titles (was “Press kit” / “Terms & disclaimers”); `knowsAbout` full questions; refuse doom-probability in blurbs | Google + Bing + agents | **Done** (2026-10-13) |
| 211 | Catalog + agents.md conquest labels for compare/alternatives/vs/guides/guide/`/vs/*` aligned to question titles (was “AI doom indexes compared” / “AI explainers hub”); `knowsAbout` “Which AI indexes does SIREN contrast”; refuse doom-probability | Google + Bing + agents | **Done** (2026-10-13) |
| 212 | Catalog + home + agents.md facet-directory labels (tags/people/sources/outlets/kinds/countries/pillars/models/companies/lab/item-archive) aligned to question titles; add missing `/models.html` `/companies.html` `/lab/` catalog rows; refuse doom-score blurbs | Google + Bing + agents | **Done** (2026-10-13) |
| 213 | Catalog prefers question titles when `homeV2.roomGroups` short labels would win (MORE_PAGES question label, else blurb stem); home blurbs for race/leaders/watts/map/world/bliss/ai-proof-job/si-ready/bug-out-land + peers lead with page questions; agents.md instrument links match; refuse doom-probability blurbs | Google + Bing + agents | **Done** (2026-10-13) |
| 214 | Catalog + MORE_PAGES + agents.md for `/methodology.html` `/instruments.html` `/moves/` `/item/` aligned to page H1 stems (was “Methodology” / “Instruments” / “Every move” / “Every story”); `catalogTitle` accepts How/What stems without trailing `?`; refuse doom-probability blurbs | Google + Bing + agents | **Done** (2026-10-13) |
| 215 | Catalog + agents.md + pillar-page siblings/breadcrumbs for `/pillar/{id}.html` aligned to “What has SIREN scored under {name}?” (was “Capability pillar”); `knowsAbout` per-pillar questions; refuse pillar doom-score blurbs | Google + Bing + agents | **Done** (2026-10-13) |
| 216 | Lab + companies hubs: siblings/breadcrumbs/ItemList + agents.md lab links use “What has SIREN scored about {lab}?” / race + labs + companies questions (was “The Race” / “Labs”); catalog receipts → “Where are the SIREN reading receipts?”; refuse lab doom-score claims | Google + Bing + agents | **Done** (2026-10-13) |
| 217 | `/model/*` + `/models.html` siblings/breadcrumbs/ItemList/other-model links use newsroom + model-family questions + “What has SIREN scored about {model}?” (was “Newsroom” / “Models”); refuse model doom-score claims | Google + Bing | **Done** (2026-10-13) |
| 218 | `/outlet/*` + `/outlet/` + `/outlets.html` siblings/breadcrumbs/ItemList/other-publisher links use newsroom + publisher + outlets questions + “What has SIREN scored from {domain}?” (was “Newsroom” / “Publishers” / “Compare”); refuse publisher doom-score claims | Google + Bing | **Done** (2026-10-13) |
| 219 | `/tags/*` + `/tags/` + `/tags.html` siblings/breadcrumbs/ItemList/other-tag links use newsroom + tag-directory questions + “What has SIREN scored about {topic}?” (was “Newsroom” / “Tags” / “Compare”); refuse topic doom-score claims | Google + Bing | **Done** (2026-10-14) |
| 220 | `/people/*` + `/people/` + `/people.html` H1/title/siblings/breadcrumbs/ItemList/other-person links use leaders + people-directory questions + “What press has SIREN scored about {name}?” (was name-only H1 / “Leaders” / “Compare”); FAQ from visible copy; refuse person doom-score / invented-quotation claims | Google + Bing | **Done** (2026-10-14) |
| 221 | `/source/*` + `/source/` + `/sources.html` siblings/breadcrumbs/ItemList/other-adapter links use newsroom + feed-adapter + sources questions + “What has SIREN scored via {label}?” (was “Newsroom” / “Feed adapters” / “Compare”); refuse source doom-score claims | Google + Bing | **Done** (2026-10-14) |
| 222 | `/pillar/` + `/pillars.html` siblings/breadcrumbs/ItemList links use newsroom + pillar-directory questions + “What has SIREN scored under {name}?” (was “Newsroom” / “Pillars” / “Compare”); refuse pillar doom-score claims | Google + Bing | **Done** (2026-10-14) |
| 223 | `/kind/*` + `/kind/` + `/kinds.html` siblings/breadcrumbs/ItemList/other-kind links use newsroom + kind-directory questions + “What has SIREN scored as {kind}?” (was “Newsroom” / “Kinds” / “Compare”); refuse kind doom-score claims | Google + Bing | **Done** (2026-10-14) |
| 224 | `/news/YYYY-MM-DD` day hubs: siblings/breadcrumbs/other-day links use newsroom question + “Which AI stories did SIREN score on {day}?” (was “Newsroom” / “Day”); refuse day doom-score claims | Google + Bing | **Done** (2026-10-14) |
| 225 | `/country/*` + `/country/` + `/countries.html` siblings/breadcrumbs/ItemList/neighbour links use world + country-directory questions + “How many datacentres has SIREN mapped in {name}?” (was “World” / “Countries” / “Compare”); refuse country doom-score / census claims | Google + Bing | **Done** (2026-10-14) |
| 226 | `/item/*` + `/item/` + `/item/archive*` siblings/breadcrumbs use newsroom + live-window + pillar questions + “Which older AI stories has SIREN kept in the archive?” (was “Newsroom” / “Live window” / pillar name); refuse item/archive doom-score claims | Google + Bing | **Done** (2026-10-14) |
| 227 | `/compare.html` + `/alternatives.html` + `/vs.html` + `/vs/*` crumbs/breadcrumbs/ItemList/rival-nav links use compare + vs + alternatives questions + “SIREN vs {rival}: which should you use?” (was “Compare” / “Versus” / “Alternatives” / rival name); refuse borrowed doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 228 | `/guide.html` + `/guides.html` + GUIDES + guide.md + home FAQ + `/live-x.html` + terms/disclosures/ai-clock footers use explainer + compare + newsroom questions (was “Guide” / “Guides” / “AI doom indexes compared” / “Alternatives hub” / “Newsroom”); refuse doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 229 | `/news.html` directory + day/tag/kind/outlet/archive nav + breadcrumbs, and `/live.html` siblings/FAQ/breadcrumbs, use newsroom + facet + live-media questions (was “Newsroom” / “Companies” / “all tags” / “Live on X” / “the Newsroom”); refuse newsroom doom-score claims | Google + Bing | **Done** (2026-10-14) |
| 230 | `/videos.html` + `/radio.html` body/FAQ/breadcrumb siblings use radio + Real Clips + live + videos + games questions (was “Tune in to SIREN Radio” / “Real Clips” / “SIREN video” / “Videos” / “SIREN Radio”); refuse video/radio doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 231 | `/games.html` radio/FAQ/breadcrumb siblings + layout/home legal fine-print footers use arcade + radio + videos + terms/privacy/disclosures/about/methodology/sponsor/feedback questions (was “SIREN Radio” / “Games” / “Privacy” / “terms & disclaimers” / “About” / “How it works”); refuse games/footer doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 232 | `/si-ready.html` + `/ai-proof-job.html` keep-going/guide/breadcrumb siblings, extras methodology back-links, and `/power.html` related/FAQ siblings use prep + jobs + Real Clips + methodology + watts/map/world/charts questions (was “AI-proof your job” / “Prepper Checklist” / “Real Clips” / “Methodology” / “AI’s power draw”); refuse SI-date and doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 233 | `/bug-out-land.html` Then-stock-it/FAQ/breadcrumb + `/about.html` paid-for links + SI-ready prepper plain text use prepper + bunker + library + sponsor questions (was “Prepper Checklist” / “Bunker Kit” / “reading list” / “one named sponsor” / “Bug-out land”); refuse Skynet-forecast and doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 234 | Classic support earn cards + verify/about/bliss/digest/history/newsroom/bets + instruments record/FAQ methodology body links use library + bunker + sponsor + methodology questions (was “The reading list” / “The Bunker Kit” / “Sponsor the index” / “method” / “methodology” / “Full methodology” / “the methodology” / “Read the methodology” / “How the index is computed”); refuse doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 235 | `/nations.html` + `/threats.html` + `/status.html` + `/nothing.html` Related + `/balance.html` BLISS + bliss home links use race/power/world/charts/dispatch/waffle/self-aware/desk/newsroom/threats/BLISS questions (was “the lab race” / “Live alerts” / “Waffle House Index” / “Tally’s Desk” / “The upside index”); refuse doom-probability and offline-tonight forecast claims | Google + Bing | **Done** (2026-10-14) |
| 236 | `/charts.html` + `/map.html` + `/desk.html` + bias extras + `/si-watch.html` + `/self-aware.html` + press/terms/disclosures body links use methodology/power/watts/newsroom/moltbook/day-after/instruments/privacy/terms questions (was “method” / “full table” / “The infrastructure index” / “newsroom” / “Agent Watch” / “Play The Day After” / “privacy page”); refuse doom-probability and Skynet-waking claims | Google + Bing | **Done** (2026-10-14) |
| 237 | `/catalog.html` + `/search.html` + `/careers.html` + `/moltbook.html` + `/race.html` + `/digest.html` + `/si-watch.html` + `/desk.html` + classic instrument/scanner body links use catalog/search/staff/agents/newsroom/race/feedback/game/instruments/scanner questions (was “Search” / “catalog” / “Staff page” / “For AI agents” / “the signal feed” / “the leaderboard” / “Suggest a signal” / “Play Tally Counts” / “Open the instrument room” / “Scanner”); refuse doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 238 | `/staff.html` + `/self-aware.html` + `/desk.html` + `/changelog.html` + instruments recent-moves body links use careers/agents/contain/si-watch/threats/map/p(doom)/moves/history questions (was “Careers” / “for AI agents” / “Try the Containment game” / “Watch what AI agents…” / “the live threat board” / “power map” / “28 named p(doom) estimates” / “Every reading” / “FULL HISTORY” / “Full archive”); refuse doom-probability and Skynet-waking claims | Google + Bing | **Done** (2026-10-14) |
| 239 | `/compare.html` + `/vs/*` + `/privacy.html` + `/press.html` + `/guides.html` + `/history.html` + `/charts.html` + `/world.html` + `/bets.html` + `/self-aware.html` + pillar/model body links use home/feedback/moves/methodology/power/country-directory questions (was “Live dial” / “Current SIREN reading” / “feedback form” / “Live page” / “Archive” / “Live reading” / “The arithmetic” / “hash-chained receipt” / “The power race…” / “Countries with at least three mapped sites” / “The current reading” / “See the index” / “homepage”); refuse doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 240 | `/guide.html` + `/guide.md` + 404/500 + `/outlet/` + `/outlets.html` + `/jobs.html` + `/labs.html` body links use home/feed-adapter/balance/feedback/si-watch/self-aware/charts/status/power/p(doom) questions (was “The current reading” / “Back to the index” / “feedback form” / “/source/” / “In the register →” / “What AI agents are coding” / “The night it wakes up” / “This week in charts” / “Is AI down?” / “The power race” / “The p(doom) voices”); refuse doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 241 | `/p-doom.html` + `/ai-doomsday-clock.html` + `/guides.html` + `/jobs.html` + `/medicine.html` + `/videos.html` + home scale body links use home/guides.md/balance/library/history/tally/methodology/si-ready/ai-proof/bunker/classic questions (was “See the live reading” / “Markdown mirror” / “Every register entry, both sides” / “Books on the argument” / “Open the page” / “ALL VIDEOS” / “full oven with gates”); refuse doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 242 | Balance module + `/digest.html` + labs strip + readings strip + `/world.html` + `/map.html` + classic markets + home cards/top tags body links use balance/race/history/US-map/watts/arena/changelog/moves/moltbook questions (was “See the whole balance” / “The full leaderboard” / “full ranking” / “The full history” / “the United States map” / “Watts” / “All picks and the track record” / “THE RACE” / “AGENT WATCH” / “HISTORY” / “MARKETS” / “CHANGELOG” / “MOVES”); refuse doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 243 | Layout `SECTIONS` footer Pages + next/prev + All-rooms palette + home dash buttons/live news chip use matching page H1 questions (was “Index” / “Stock picks” / “Newsroom” / “The Race” / “ALERTS” / “DATA & EMBED” / “NEWS & ALERTS LIVE”); pixel room banner keeps `short` chrome; refuse doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 244 | Classic markets cards + desk switcher `more` links + nations highlight + home reuse embed helper use Arena/race/news/watts/digest/leaders/bliss/nations/export questions (was “Big investors” / “AI battle” / “See today's picks” / “The full board…” / “See the full scoreboard” / “Open the widget”); refuse doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 245 | Home foot/top alerts + classic embed preview + waffle storm-kit/map body links use classic/alerts/export/bunker/US-map questions (was “Verify a reading” / “Full instrument panel” / “RSS” / “ALERTS” / “level-change alerts” / “Preview the widget” / “SIREN’s bunker kit” / “power map”); refuse doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 246 | `/p-doom.html` voices + compare embed + home Tally RSS + oven methodology body links use news/live/day-after/library/export/alerts/methodology questions (was “All AI news” / “Watch: AI on TV…” / “Game out the day after” / “SIREN’s library…” / “Embed the live reading” / “level-change RSS” / “How a stage is decided”); refuse doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 247 | Classic war-room panel doors + closer alerts + `/vs/*` related body links use instruments/digest/news/race/flock/map/exploits/leaders/jobs/bets/alerts/p(doom)/clock/guide/methodology questions (was “Open →” / “Level alerts by RSS” / bare `p-doom` / `ai-doomsday-clock` / `guide` / `methodology` path stems); refuse doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 248 | Claim-card tails + classic explainers guide card + home/moltbook/careers agent body links use race/flock/map/exploits/news/leaders/guide/agents questions (was “The Race” / “Cameras” / “Map” / “Exploits” / “Newsroom” / “Leaders” / “SIREN vs DEFCON vs the Clock” / skill.md-only agent CTAs); refuse doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 249 | Classic reel + homepage news feed/reel more-links + what-changed digest more-link use newsroom/digest questions (was “All N items…” / “The full brief, the streaks…”); refuse doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 250 | Classic leader-wire more + pillar overflow item link + arrivals pulse more use leaders/live-window/newsroom questions (was “Every line, every leader…” / “every scored item” / “Every item, scored…”); refuse doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 251 | Moltbook evolution body + world table country + superseded move stamp + home video CTA use evolution/country/home/videos questions (was “Evolution log” / “country page” / “Superseded · current reading…” / “NEW FILM: THE ROAD…”); refuse doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 252 | Homepage FAQ `linkifyAnswer` path anchors use destination H1 questions and cover more hubs (was bare `/compare.html` / `/people/` / `/p-doom.html` …); refuse doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 253 | `/item/` entity chips (model/tag/people/outlet/country/source) + `/games.html` card titles use destination question H1s (was bare entity/domain names / “Containment” / “Signal or Noise” …); refuse doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 254 | Race board lab names + model/people “Lab page” notes + newsroom pillar legend use destination question H1s (was bare “OpenAI” / “Anthropic” / “Capability” …); refuse doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 255 | Homepage every-room card titles + leaders-wire indexable person names use destination question H1s; unique room tile icons (was uppercase “THE RACE” / “NEWSROOM” / bare “Sam Altman” / shared news/updown/clock art …); refuse doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 256 | Shared rooms keyboard-help + layout Data foot note use search/catalog/instruments destination H1 questions (was “full search” / “catalog” / “Public JSON API”); refuse doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 257 | Header/home What’s New strip + rooms-dialog NEW entries use destination H1 questions (was “USA vs China” / “The Arcade” / “Live alerts” …); refuse doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 258 | BreadcrumbList root + relatedHtml / rooms-dialog home row use “AI activity index today · SIREN” and drop duplicate Home `/` crumbs (was bare “SIREN” / “Home” / “Index”); refuse doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 259 | BreadcrumbList leaf names across hubs use page H1 questions (was “Evolution Log” / “Waffle House Index” / “Race” / “Leaders” / “SIREN Labs” …); refuse doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 260 | `/instruments.html#api` H2 + FAQPage use “What public JSON files does SIREN expose?”; rooms-dialog search handoff uses search H1 (was “Public JSON API” / “Search everything for…”); refuse doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 261 | `/instruments.html` section H2s + FAQPage use questions for record / source health / pillars / moves / embed (was “The score over time” / “Source health” / “The five pillars” / “Recent moves” / “Put the index on your site”); Organization `knowsAbout` mirrors those questions; refuse doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 262 | Balance module + oven H2s + instruments FAQPage use “How does SIREN count AI harm and benefit side by side?” / “Where does the index sit?” (was “Harm and benefit, side by side” / “Where the index sits”); Organization `knowsAbout` mirrors oven question; refuse doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 263 | Home/classic section H2s + classic FAQPage use questions for instruments CTA / clock / map / Arena / follow / support (was “Check the working” / “The reading, as a clock” / “Where the machines live” / “Markets: …” / “Hear it first…” / “Keep the count running”); Organization `knowsAbout` mirrors those questions; refuse doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 264 | `/digest.html` section H2s + FAQPage use questions for brief / what-changed / streaks / frontier labs / how-computed (was “The brief” / “What changed” / “Streaks and records” / “Every frontier lab…” / “How this page is computed”); Organization `knowsAbout` mirrors those questions; refuse doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 265 | `/bets.html` section H2s + FAQPage use questions for open bets / track record / rules / base-rate limits (was “Open bets” / “The track record” / “The rules” / “What a base rate cannot see”); Organization `knowsAbout` mirrors those questions; refuse doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 266 | `/evolution.html` section H2s + FAQPage use questions for tempo / news / agents / scan log / desk picks (was “The tempo” / “What the news was about” / “What the agents talked about” / “Scan log” / “Every desk pick”); Organization `knowsAbout` mirrors those questions; refuse doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 267 | `/compare.html` + `/alternatives.html` + `/vs.html` + `/vs/*` section H2s + FAQPage use questions for side-by-side / pick-rival / complementary / also / right-wrong alternative / one-page-per-rival / compare-everything / what-each-is / go-next (was “Side by side” / “Pick a rival” / “Complementary…” / “Also…” / “When SIREN is…” / “One page per rival” / “Compare everything” / “What each one is” / “Where to go next”); Organization `knowsAbout` mirrors those questions; refuse doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 268 | `/alerts.html` + `/export.html` + `/bias.html` section H2s + FAQPage use questions for pick/feeds/email/webhook/X/tab · download/embed/code/licence · inputs/skew/candidates/propose (was “Pick your triggers” / “Your feed URLs” / “Email” / “Webhook…” / “X” / “In this tab” / “Download” / “Embed” / “From code” / “Licence” / “Where each input leans” / “What that skews” / “Under consideration” / “Propose a source”); Organization `knowsAbout` mirrors those questions; refuse doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 269 | `/reference-plan.html` section H2s + FAQPage use questions for v1 / addenda / promotion / cutover / shift / official-vs-candidate (was “Reference v1, frozen” / “Addenda run as a shadow score” / “Promotion rule” / “Cutover” / “A permanent baseline shift” / “Official vs candidate, this reading”); Organization `knowsAbout` mirrors those questions; refuse doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 270 | `/nothing.html` section H2s + FAQPage use questions for ledger / method (was “The ledger” / “How the number is made”); Organization `knowsAbout` mirrors those questions; refuse doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 271 | `/labs.html` section H2s + FAQPage use questions for this-week / coming-up / earlier-weeks / lab-rules (was “This week: …” / “Coming up on the bench” / “Earlier weeks” / “Lab rules”); Organization `knowsAbout` mirrors those questions; refuse doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 272 | `/si-watch.html` section H2s + FAQPage use questions for coding / coming signals (was “What the AI agents are coding” / “Signals on the way”); Organization `knowsAbout` mirrors those questions; refuse doom-probability / takeover-forecast claims | Google + Bing | **Done** (2026-10-14) |
| 273 | `/self-aware.html` + `/nations.html` section H2s + FAQPage use questions for real-not-fiction / scoreboard-how (was “Back to what’s real” / “How it works”); Organization `knowsAbout` mirrors those questions; refuse doom-probability / Skynet-forecast claims | Google + Bing | **Done** (2026-10-14) |
| 274 | `/power.html` section H2s + FAQPage use questions for race / top-20 / per-person / fastest-growing (was “THE RACE: …” / “TOP 20 GENERATORS…” / “MOST PER PERSON…” / “FASTEST GROWING…”); Organization `knowsAbout` mirrors those questions; refuse doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 275 | `/threats.html` section H2s + FAQPage use questions for KEV / botnets / space weather / natural events (was “NEWLY EXPLOITED SOFTWARE…” / “BOTNET FAMILIES…” / “SPACE WEATHER ALERTS…” / “NATURAL EVENTS…”); Organization `knowsAbout` mirrors those questions; refuse offline-tonight forecast / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 276 | `/live.html` section H2s + FAQPage use questions for live-now / 24/7 news / AI on TV / talk radio / about (was “Live now” / “24/7 news channels” / “AI on TV” / “AI talk radio” / “About this room”); Organization `knowsAbout` mirrors those questions; refuse live-room-as-forecast / endorsement-as-SIREN-claim / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 277 | `/moltbook.html` section H2s + FAQPage use questions for themes / words / collab / network / newest / reach / top / SIREN mentions (was “What they talk about” / “Words they keep using” / “Agents working together” / “How the agent network is changing” / “Newest this week” / “Agents with the most reach” / “All-time most upvoted” / “Agents talking about SIREN”); Organization `knowsAbout` mirrors those questions; refuse Agent-Watch-as-index-input / agent-takeover / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 278 | `/agents.html` section H2s + FAQPage use questions for start / tell / Moltbook / spotlight / rules (was “Start here” / “Tell your agent” / “On Moltbook” / “Agents spotlight…” / “Rules for agents”); Organization `knowsAbout` mirrors those questions; refuse agents-as-doom-oracle / scrape-Google-for-rank / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 279 | `/tally.html` section H2s + FAQPage use questions for moods / where-Tally-works / use-in-posts (was “One bird, five moods” / “Where Tally works” / “Tally for your stuff”); Organization `knowsAbout` mirrors those questions; refuse tally-as-doom-oracle / mood-as-severity / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 280 | `/staff.html` section H2s + FAQPage use questions for Grok crew / data-crew flow / data crew / join (was “The Grok crew…” / “How the data crew works together” / “The data crew” / “Join them”); Organization `knowsAbout` mirrors those questions; refuse editor-picks-the-level / staff-as-doom-oracle / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 281 | `/bug-out-land.html` section H2s + FAQPage use questions for regions / checklist / listings / supplies (was “Regions people look at” / “The checklist before you buy” / “Where land is listed” / “Then stock it”); Organization `knowsAbout` mirrors those questions; refuse Skynet-as-forecast / real-estate-advice / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 282 | `/careers.html` section H2 + FAQPage use question for how-to-apply (was “For AI applicants”); Organization `knowsAbout` mirrors it; refuse paid-salary / doom-probability / job-synonym stuffing claims | Google + Bing | **Done** (2026-10-14) |
| 283 | `/news/YYYY-MM-DD` day hubs section H2s + FAQPage use questions for live-window / older-from-day / other-days (was “In this window” / “Older scored stories from …” / “Other days”); Organization `knowsAbout` mirrors those questions; refuse day doom-score / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 284 | `/country/*` country hubs section H2s + FAQPage use questions for named-sites / scored-stories / older-stories / same-subregion (was “Named sites” / “Scored stories naming …” / “Older scored stories naming …” / “Same subregion”); Organization `knowsAbout` mirrors those questions; refuse country doom-score / national AI ranking / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 285 | `/model/*` model hubs section H2s + FAQPage use questions for window-stories / older-stories / other-families (was “Stories in this window” / “Older scored stories naming …” / “Other model families”); Organization `knowsAbout` mirrors those questions; refuse model doom-score / model-rating / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 286 | `/lab/*` lab hubs section H2s + FAQPage use questions for window-stories / older-stories / other-labs (was “Related stories in this window” / “Older scored stories naming …” / “Other labs”); Organization `knowsAbout` mirrors those questions; refuse company doom-score / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 287 | `/pillar/*` pillar hubs section H2s + FAQPage use questions for window-stories / older-stories / other-pillars (was “Stories scored under …” / “Older scored stories under …” / “Other pillars”); Organization `knowsAbout` mirrors those questions; refuse pillar doom-score / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 288 | `/source/*` outlet hubs section H2s + FAQPage use questions for window-stories / older-stories / other-outlets (was “Stories from …” / “Older scored stories from …” / “Other outlets”); Organization `knowsAbout` mirrors those questions; refuse source doom-score / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 289 | `/people/*` people hubs section H2s + FAQPage use questions for on-record lines / press coverage / older-stories / other-people (was “On the record in this newsroom window” / “Press coverage sample” / “Older scored stories naming …” / “Other people on the wire”); Organization `knowsAbout` mirrors those questions; refuse person doom-score / invented-quotation / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 290 | `/tags/*` tag hubs section H2s + FAQPage use questions for window-stories / older-stories / other-tags (was “Stories tagged …” / “Older scored stories tagged …” / “Other tags”); Organization `knowsAbout` mirrors those questions; refuse topic doom-score / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 291 | `/kind/*` kind hubs section H2s + FAQPage use questions for window-stories / older-stories / other-kinds (was “{Kind} in this window” / “Older scored {kinds}” / “Other kinds”); Organization `knowsAbout` mirrors those questions; refuse kind doom-score / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 292 | `/outlet/*` publisher hubs section H2s + FAQPage use questions for window-stories / older-stories / other-publishers (was “Stories on …” / “Older scored stories on …” / “Other publishers”); Organization `knowsAbout` mirrors those questions; refuse publisher doom-score / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 293 | `/item/*` story pages section H2s + FAQPage use questions for score / corroboration / related (was “The score” / “How many sources carried it” / “Related in this window”); Organization `knowsAbout` mirrors those questions; refuse item doom-score / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 294 | `/bliss.html` section H2s + FAQPage use questions for pair axis / five pillars / sources / how-computed (was “Both numbers, one axis” / “The five pillars” / “Every source, and what it read” / “How this is computed”); Organization `knowsAbout` mirrors those questions; refuse BLISS doom-score / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 295 | `/leaders.html` section H2s + FAQPage use questions for never-does / roster / cross-check / method (was “What this page never does” / “The roster” / “Cross-check against the lab feeds” / “How a line gets here”); Organization `knowsAbout` mirrors those questions; refuse invented-quotation / leader doom-score / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 296 | `/race.html` section H2s + FAQPage use questions for field / seven-day / odds-split / leaderboard / source-health / how-computed (was “Every lab on one axis” / “Seven-day change, per lab” / “How the odds are split” / “The leaderboard” / “Source health” / “How this is computed”); Organization `knowsAbout` mirrors those questions; refuse race doom-score / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 297 | `/news.html` newsroom section H2s + FAQPage use questions for top-items / score-spread / all-items / sources (was “Highest-scoring items” / “How the scores are spread” / “All items” / “Where these came from”); Organization `knowsAbout` mirrors those questions; refuse newsroom doom-score / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 298 | `/watts.html` section H2s + FAQPage use questions for warning / corridors / grid / water / build-out / sources / cannot-tell / how-made / exclusions (was “Read this before the charts” / “N datacentre regions” / “Overnight grid load” / “River flow…” / “Filings…” / “Every source…” / “What this cannot tell you” / “How the number is made” / “Sources tried…”); Organization `knowsAbout` mirrors those questions; refuse Watts doom-score / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 299 | `/world.html` section H2s + FAQPage use questions for caveat / map / countries / orbit / limits / method / data (was “Read this before you read the map” / “The map” / “Every country with a mapped site” / “Computing hardware in orbit” / “What this can and cannot say” / “Where this came from” / “Take the data”); Organization `knowsAbout` mirrors those questions; refuse world-map doom-score / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 300 | `/map.html` section H2s + FAQPage use questions for claim / map / drought / grid / pin / largest / method (was “What this map cannot show you” / “The map” / “Drought, by county” / “The grid under each pin” / “What one pin says” / “The largest tagged sites” / “How this was built…”); Organization `knowsAbout` mirrors those questions; refuse US-map doom-score / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 301 | `/flock.html` section H2s + FAQPage use questions for caveat / map / jurisdictions / direction / completeness / operators / limits / method (was “Read this before you read the map” / “The map” / “Jurisdictions” / “Which way they look” / “How complete the data is” / “Who is recorded as operating them” / “What this is not” / “Where this came from”); Organization `knowsAbout` mirrors those questions; refuse Flock doom-score / all-cameras / national-total / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 302 | `/exploits.html` section H2s + FAQPage use questions for series / artefact / example / limits / sources (was “The lag over time” / “The collapse is a backlog” / “One entry, in full” / “What this data cannot do” / “Where this came from…”); Organization `knowsAbout` mirrors those questions; refuse exploit-lag doom-score / “AI is not accelerating cyberattacks” / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 303 | `/history.html` section H2s + FAQPage use questions for paperclip / scale / not-claims / counted (was “The paperclip maximizer, properly attributed” / “The scale, level by level” / “What this index does not claim” / “What is actually counted”); Organization `knowsAbout` mirrors those questions; refuse history-page doom-score / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 304 | `/charts.html` chart H2s + FAQPage use questions for odds / hottest-bets / dial / heat / pillars / power / waffle (was “The odds race…” / “The hottest AI bets…” / “The SIREN dial” / “The week as a heat strip” / “What’s driving it…” / “The power race…” / “The world’s electricity…”); Organization `knowsAbout` mirrors those questions; refuse charts-page doom-score / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 305 | `/si-ready.html` section H2s + FAQPage use questions for six areas / check / full guide / 30-day plan / what-not-to-do / keep going (was “The six areas” / “Your check” / “The full guide…” / “A 30-day starter plan” / “What not to do” / “Keep going”); Organization `knowsAbout` mirrors those questions; refuse SI-ready doom-score / arrival-date / financial-advice / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 306 | `/ai-proof-job.html` section H2s + FAQPage use questions for five moves / plan / counted effects (was “Five moves that keep working” / “Your plan” / “What has actually been counted”); Organization `knowsAbout` mirrors those questions; refuse AI-proof-job doom-score / job-guarantee / career-advice / mass-unemployment / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 307 | `/live-x.html` + `/breakthroughs.html` section H2s + FAQPage use questions for live feeds / Spaces / labs / leaders and more-of-the-upside (was “Live feeds” / “Spaces…” / “Labs to follow” / “Leaders to follow” / “More of the upside”); Organization `knowsAbout` mirrors those questions; refuse live-X / breakthroughs doom-score / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 308 | `/about.html` section H2s + FAQPage use questions for name / publication / who-runs / paid-for / contact / terms (was “The name” / “What it is” / “Who runs it” / “How it is paid for” / “Contact” / “Terms, in plain words”); Organization `knowsAbout` mirrors those questions; refuse about-page doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 309 | `/privacy.html` section H2s + FAQPage use questions for responsible / analytics choices / site-itself / California / EU-UK rights / children / third parties / retention / embed / contact (was “Who is responsible” / “Your choices about analytics cookies” / “What the site itself does” / “California and similar privacy laws” / “Your rights (EU/UK and elsewhere)” / “Children” / “Third parties a visit touches” / “Retention” / “The embed and the badge” / “Contact”); Organization `knowsAbout` mirrors those questions; refuse privacy-page doom-probability / data-sale claims beyond LEGAL_NO_SELL | Google + Bing | **Done** (2026-10-14) |
| 310 | `/disclosures.html` section H2s + FAQPage use questions for index / finance / affiliate / privacy / satire / people / licence / contact (was “What the index is” / “Finance and markets” / “Affiliate and paid links” / “Privacy and analytics” / “Satire and jokes” / “People and likenesses” / “Licence” / “Contact”); Organization `knowsAbout` mirrors those questions; refuse disclosures-page doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 311 | `/terms.html` section H2s + FAQPage use questions for all 16 numbered clauses (was “1. Information and entertainment only” … “16. Changes, severability and your rights”); Organization `knowsAbout` mirrors those questions; refuse terms-page doom-probability / forecast claims | Google + Bing | **Done** (2026-10-14) |
| 312 | `/p-doom.html` section H2s + FAQPage use questions for origin / differ / cannot-tell / SIREN-different / read-more (was “Where the term comes from” / “Why the numbers differ so much” / “What p(doom) cannot tell you” / “How SIREN is different” / “Read more”); Organization `knowsAbout` mirrors those questions; refuse p(doom)-page SIREN-as-doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 313 | `/ai-doomsday-clock.html` section H2s + FAQPage use questions for Bulletin / experts / AI-specific / SIREN-instead / which-clock (was “The Doomsday Clock” / “The experts’ clock…” / “AI-specific clocks and scores” / “What SIREN does instead” / “Which should you use?”); Organization `knowsAbout` mirrors those questions; refuse AI-clock-page SIREN-as-doomsday-clock / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 314 | `/guide.html` section H2s + FAQPage use questions for short-version / dial / loud-reading / DEFCON-grammar / where-next (was “The short version” / “How to read the SIREN dial” / “What a loud reading does and does not tell you” / “Why borrow DEFCON's grammar at all” / “Where to go next”); Organization `knowsAbout` mirrors those questions; refuse guide-page doom-probability / brand-hijack claims | Google + Bing | **Done** (2026-10-14) |
| 315 | `/brand.html` section H2s + FAQPage use questions for idea / name / Tally / colour / type / voice / files (was “The idea” / “The name” / “Tally, the duty canary” / “Colour” / “Type” / “Voice” / “Files”); Organization `knowsAbout` mirrors those questions; refuse brand-page doom-probability / loud-means-danger claims | Google + Bing | **Done** (2026-10-14) |
| 316 | `/press.html` section H2s + FAQPage use questions for one-sentence / lift-paragraph / facts / cite / images / contact / coverage (was “In one sentence” / “A paragraph you can lift” / “Facts” / “How to cite a reading” / “Images” / “Contact” / “Coverage”); Organization `knowsAbout` mirrors those questions; refuse press-kit doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 317 | `/sponsor.html` section H2s + FAQPage use questions for gets / does-not-get / suits / start (was “What a sponsor gets” / “What a sponsor does not get” / “Who it suits” / “How to start”); Organization `knowsAbout` mirrors those questions; refuse sponsor-moves-score / visitor-data-sale / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 318 | `/library.html` section H2s + FAQPage use questions for shelves / gear / more-ways (was “The case for worry” / “The case for doubt” / “The view from the builders” / “Put AI to work” / “The long view” / “Run AI at home” / “More ways to keep this running”); Organization `knowsAbout` mirrors those questions; refuse library-as-index-input / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 319 | `/guides.html` section H2 + FAQPage + markdown mirror use a question for the also-links block (was “Also”); Organization `knowsAbout` mirrors that question; refuse SIREN-as-doom-probability / stuffing synonym doorways | Google + Bing + agents | **Done** (2026-10-14) |
| 320 | `/search.html` empty-state H2s + FAQPage use questions for try-first / popular-rooms (was “Try one of these” / “Popular rooms”); Organization `knowsAbout` mirrors those questions; refuse search-as-doom-oracle / stuffing / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 321 | `/waffle.html` other-storms H2 + FAQPage use a question when the list is visible (was “Other active storms”); Organization `knowsAbout` mirrors that question; refuse official-FEMA / outage-report / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 322 | `/radio.html` section H2s + FAQPage use questions for Tally voice / hear-in-videos (was “Tally’s voice update” / “Hear it in the videos”); Organization `knowsAbout` mirrors those questions; refuse Radio-as-index-input / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 323 | `/bliss.html` cold-start H2 + FAQPage use questions for no-score / awaiting-baseline (was “BLISS has no score in this build” / “BLISS is awaiting its baseline”); Organization `knowsAbout` mirrors those questions; refuse doom-probability / forecast claims | Google + Bing | **Done** (2026-10-14) |
| 324 | Home Meet Tally + War room H2s + homepage FAQ, and `/desk.html` streak card H2 + FAQPage, use questions (was “Meet Tally” / “War room” / “Nothing Ever Changes”); Organization `knowsAbout` mirrors desk/war-room questions; PRIMARY nav chrome stays short; refuse desk-feeds-index / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 325 | `/desk.html` counter card H2s + FAQPage use questions for robots / billions / Betteridge / godfather / AGI / doom-by-name (was “The Robot Count” / “Billions Mentioned” / …); Organization `knowsAbout` mirrors those questions; refuse desk-feeds-index / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 326 | `/jobs.html` + `/medicine.html` newsroom H2 + FAQ, home “two questions” + “every room” H2s + homepage FAQ, and `/moves/*` pillars/inputs/receipt H2s + FAQPage, use questions; Organization `knowsAbout` mirrors those questions; refuse jobs/medicine forecast and move-as-doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 327 | Home modules what-changed / verify / desk-picks / developing / X-wire / labs section H2s + homepage FAQ use questions (was “What changed” / “Don’t trust it. Check it.” / “Desk picks” / “Developing” / “The labs’ posts on X” / “The frontier labs, monitored”); Organization `knowsAbout` mirrors those questions; refuse module-as-doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 328 | Classic homepage switcher desk H2 + homepage FAQ use a question (was “Every dataset, one panel”); Organization `knowsAbout` mirrors that question; refuse switcher-as-second-index / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 329 | Classic readings / leader-wire / reel defaults + news “today’s signal” + switcher Latest/leaders panel titles use questions (was “Recent readings” / “AI leaders, on the record” / “Highest-scoring items” / “Today’s signal” / “The eight newest stories”); Organization `knowsAbout` mirrors those questions; refuse module-as-doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 330 | Home V2 reuse / bosses / labs / “What is SIREN?” section H2s use questions (screen-reader over pixel chrome) + homepage FAQ; Organization `knowsAbout` mirrors those questions; refuse home-board-as-forecast / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 331 | Classic switcher panel heads (newsroom / race / infrastructure / digest / BLISS) + news “signal feed” H2 use questions (was “The newsroom” / “The race” / … / “Signal feed”); Organization `knowsAbout` mirrors those questions; refuse panel-as-doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 332 | Home V2 card H3s for trend / loud / health / moved / unconventional / markets / agents use questions (screen-reader over pixel chrome) + homepage FAQ; Organization `knowsAbout` mirrors those questions; refuse card-as-forecast / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 333 | Classic switcher “what moved” H3 uses a question (was “What moved”); mirrors homepage FAQ / `knowsAbout` “What moved this hour?”; refuse moved-strip-as-doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 334 | Classic markets card H3s for investor disclosures + AI battle use questions (was “What Pelosi… disclosed” / “AI models trading paper money”) + homepage FAQ; Organization `knowsAbout` mirrors those questions; refuse Arena-as-financial-advice / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 335 | `/jobs.html` + `/medicine.html` entry H3s + FAQPage use questions for measured / claimed / caveat (was “What is measured” / “What gets claimed” / “The caveat”); Organization `knowsAbout` mirrors those questions; refuse topic-entry-as-forecast / doom-probability claims | Google + Bing | **Done** (2026-10-14) |
| 336 | `/waffle.html` storm-kit + why-watch H3s + FAQPage use questions (was “STORM KIT” / “WHY AN AI SITE WATCHES WAFFLES”); Organization `knowsAbout` mirrors those questions; refuse official-FEMA / doom-probability claims | Google + Bing | **Done** (2026-10-14) |

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
| Google poisoning SERPs served to scrapers / rank trackers (~8% of tracked SERPs); prefer GSC + first-party agent fetches | [Nozzle](https://nozzle.io/research/poisoned-google-serps/); [Cyrus Shepard](https://x.com/CyrusShepard/status/2110087517806776502) | 2026-10-13 |
