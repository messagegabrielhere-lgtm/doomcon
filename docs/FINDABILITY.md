# Findability — Google Search and AI answer engines

**Status:** playbook, last engineering pass **2026-10-10** (AI agent surfaces).
Companion to `docs/GROWTH.md` (UX moves), `docs/COMPETITIVE.md` (URL-count war),
`docs/VIRAL.md` (distribution on X), and `docs/MONETIZE.md` (earning without
losing rank).

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
| `robots.txt` | `User-agent: *` / `Allow: /` + named AI bots + both Sitemap lines | Names GPT/Claude/Perplexity/Google-Extended/AI2Bot/YouBot/etc. No Disallow — correct |
| `sitemap.xml` | Head pages + `/item/` long tail + agent surfaces | Includes `/llms.txt`, `/llms-full.txt`, `/agents.md`, `/skill.md`, `/methodology.md`, `/guide.md` |
| `news-sitemap.xml` | Live when items qualify | Rolling window; see `newsSitemap.mjs` |
| `llms.txt` / `llms-full.txt` | Live + `/.well-known/llms.txt` | Instruments (race/map/flock/exploits/watts/digest), API map, markdown mirrors, agent entry |
| `/agents.md`, `/skill.md` | Live | Short agent entry + skill instructions |
| `/methodology.md`, `/guide.md` | Live | Plain-markdown mirrors for assistants that prefer text over HTML |
| `/api/index.json` | Live | Endpoint map + `agents` block; OpenAPI at `/openapi.json` |
| `/api/state.json`, `history.json`, `health.json`, receipts, `now.txt` | Live | The citation unit for both journalists and agents |
| `/feed.xml` | Live | Linked from `<head>` on every page |
| JSON-LD | Home, methodology/history FAQ, datasets, item `WebPage` + `SpeakableSpecification` + breadcrumbs | Speakable only on authored score/corroboration blocks |
| `noindex` on thin / empty states | Wired | Empty race, bliss, digest, watts, non-substantive moves — do not submit these to the sitemap |
| Canonical + `og:*` + `twitter:card` | Wired in layout | Share cards are PNG |
| Search Console | **Operator** | Verify + submit sitemap (`VIRAL.md` §7.1) |
| Own domain | `siren.watch` | Canonical in `brand.mjs` |

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

`news-sitemap.xml` ships from `newsSitemap.mjs` with a short rolling window.
Keep item pages honest (`WebPage` about someone else's story, not a
`NewsArticle` we did not write). Re-check pizzint's channel if competing there
(`COMPETITIVE.md` §0.1).

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

`llmsTxt()` in `site/templates/agentText.mjs` now lists instruments, markdown
mirrors, and query-routing for the questions agents get asked ("who is winning
the model race?", "where are the datacentres?", "is exploit lag accelerating?").
Keep that file honest when new rooms ship.

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
| 3 | Faceted pillar/lab URLs with unique titles and internal links | Google + agents | Open |
| 4 | `SpeakableSpecification` + breadcrumb on item pages | Google / voice | **Done** on `/item/` |
| 5 | `news-sitemap.xml` once item pages qualify | Google News | **Done** (rolling) |
| 6 | `/openapi.json` + sitemap entries for API docs | Agents + developers | **Done** |
| 7 | Markdown mirrors for methodology and guide; `/agents.md` | Agents | **Done** |
| 8 | Mobile card view / less above-fold weight | Google CWV | Open |
| 9 | Domain move with permanent redirects | Both | Canonical is `siren.watch` |

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

## 4. Weekly loop (add to the VIRAL.md Monday review)

1. Search Console: indexed pages, impressions, clicks; note branded vs head-term.
2. Crawl a sample of new `/item/` URLs — title, description, canonical, JSON-LD valid.
3. Fetch `/llms.txt` and `/api/index.json` — do the links 200?
4. One AI-engine spot-check (rotate products) — cited or not, which URL.
5. If a page was corrected, confirm the live HTML and the receipt agree.

---

## 5. Sources

| Claim | Source | Read |
|---|---|---|
| Generative AI features use foundational SEO; no special AI files for Google; structured data optional for AI Overviews | [Google AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) | 2026-10-08 |
| E-E-A-T / people-first content | [Creating helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) | 2026-10-08 |
| `llms.txt` format (H1, blockquote, H2 file lists, optional markdown mirrors) | [llmstxt.org](https://llmstxt.org/) v2 | 2026-10-08 |
| Live robots, sitemap (~480 URLs), `llms.txt`, API index, homepage title/description, news-sitemap 404 | HTTP checks against the Pages site | 2026-10-08 |
| URL-count strategy, news sitemap, Speakable, Search Console success metric | `docs/COMPETITIVE.md`, `docs/VIRAL.md` §7 | this repo |
