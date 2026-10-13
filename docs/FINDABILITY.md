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
