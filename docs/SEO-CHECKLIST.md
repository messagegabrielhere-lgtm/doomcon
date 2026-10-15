# SEO checklist — SIREN map of Semrush’s 43 tips

**Source:** [Semrush Ultimate SEO checklist](https://www.semrush.com/blog/seo-checklist/)
(posted by [@semrush](https://x.com/semrush/status/2110316440527974857), 2026-10-14).
**Read:** 2026-10-15. This file is a **SIREN status map**, not a copy of their
article. Task titles are short paraphrases so operators can tick them against
this repo; explanations and tooling pitches stay on Semrush’s page.

Companion docs: `FINDABILITY.md` (playbook), `COMPETITIVE-SEO.md` (rival
scoreboard), `VIRAL.md` §7 (Search Console).

Semrush’s frame for 2026: classic Google SEO still matters, and visibility in
AI surfaces (AI Overviews, ChatGPT, and peers) rides the same crawlable HTML
plus a few agent-facing files. That matches `FINDABILITY.md` §0–§2.

---

## How to use this file

| Status | Meaning |
|---|---|
| **Done** | Shipped and kept live; spot-check after deploy |
| **Operator** | Needs a human (Search Console, Analytics, Bing Webmaster, citations) |
| **N/A** | WordPress / local-business / Semrush-product step that does not apply |
| **Open** | Real gap — see FINDABILITY ranked list or notes |

Re-run `node collector/tools/seo-daily.mjs` before rewriting Done/Open rows from
memory.

---

## 1. Basic SEO practices

| # | Task (paraphrase) | SIREN | Where |
|---:|---|---|---|
| 1 | Google Search Console | **Operator** | FINDABILITY #11 / §1.1 — set `GOOGLE_SITE_VERIFICATION` |
| 2 | Analytics | **Operator** | Optional; no product analytics in core collector/site |
| 3 | WordPress SEO plugin | **N/A** | Static site (`site/build.mjs`), not WordPress |
| 4 | `robots.txt` (keep AI crawlers allowed) | **Done** | Permissive `Allow: /` + named AI bots |
| 5 | XML sitemap submitted | **Done** / **Operator** | `sitemap.xml` + `news-sitemap.xml` ship; submit in GSC |
| 6 | Manual actions in GSC | **Operator** | After GSC is verified |
| 7 | Confirm Google can index | **Operator** | Index coverage after #1; JS-off HTML already ships |

---

## 2. Keyword research

| # | Task (paraphrase) | SIREN | Where |
|---:|---|---|---|
| 8 | Competitor keywords / titles | **Done** (ongoing) | `COMPETITIVE-SEO.md`, `seo-daily` |
| 9 | Core topics | **Done** (ongoing) | Head terms we can honestly answer: activity level, methodology, race, map, … |
| 10 | Prompts people use in AI tools | **Done** (ongoing) | `llms.txt` / `agents.md` query routing; FINDABILITY §2 |
| 11 | Keyword map | **Done** (ongoing) | Facet hubs + conquest `/vs/*` + evergreen explainers |
| 12 | Search intent of visible pages | **Done** (ongoing) | Question-shaped titles/H1/H2 + visible FAQ |
| 13 | Extra questions people ask | **Done** (ongoing) | FAQPage only from on-page Q&A (`CONTRACT` / voice) |

Refuse head terms that imply doom probability or forecasts (`VOICE.md`).

---

## 3. Technical SEO

| # | Task (paraphrase) | SIREN | Where |
|---:|---|---|---|
| 14 | HTTPS | **Done** | Live site / Pages |
| 15 | No duplicate host versions in the index | **Operator** | Preferred domain + 301 map when custom domain moves |
| 16 | Crawl errors | **Operator** + **Done** tooling | GSC; `seo-daily` surface checks |
| 17 | Site speed / CWV | **Done** (ongoing) | Phone-width deferral + `content-visibility` (FINDABILITY #10/#22) |
| 18 | Broken links | **Done** (ongoing) | Build/tests + daily surface monitor |
| 19 | Mixed content (HTTP on HTTPS) | **Done** | Static HTTPS assets |
| 20 | Mobile-friendly | **Done** | Mobile card / responsive templates |
| 21 | Search-friendly URLs | **Done** | Stable paths; no session IDs; facets gated for substance |
| 22 | Structured data | **Done** | Dataset, FAQ, NewsArticle, Speakable, Breadcrumb, Organization, … |
| 23 | Crawl depth / internal reach | **Done** (ongoing) | Hub links + homepage/room tiles; keep important rooms ≤ few clicks |
| 24 | Temporary 302s | **Operator** | Prefer 301 for permanent domain moves |
| 25 | Redirect chains / loops | **Operator** | Audit when domain or path map changes |

AI note from Semrush that already matches us: many AI crawlers skip heavy JS —
keep server-rendered HTML as the source of truth.

---

## 4. Content and on-page

| # | Task (paraphrase) | SIREN | Where |
|---:|---|---|---|
| 26 | Title tags unique / not truncated for intent | **Done** (ongoing) | Head-term titles on rooms + entity hubs |
| 27 | Meta descriptions | **Done** (ongoing) | Layout/meta helpers |
| 28 | Single H1 | **Done** (ongoing) | Question-shaped H1 per room |
| 29 | Align title / meta / body | **Done** (ongoing) | FAQ schema must match visible text |
| 30 | Content audit | **Done** (ongoing) | `noindex` empty states; substance gates on facets |
| 31 | Image alt text | **Done** (ongoing) | Cards / icons; keep meaningful alts on share art |
| 32 | Internal linking | **Done** (ongoing) | Related items, entity hubs, footer/nav, catalog |
| 33 | Keyword cannibalization | **Done** (ongoing) | One honest job per URL; conquest pages contrast methods only |
| 34 | Orphan pages | **Done** (ongoing) | Sitemap + nav + IndexNow; avoid sitemap-only doorways |
| 35 | Keep content current | **Done** | Hourly collect → build; dated item/day hubs |

---

## 5. Link building and off-page

| # | Task (paraphrase) | SIREN | Where |
|---:|---|---|---|
| 36 | Competitor backlink profiles | **Operator** | Press / citation work (`COMPETITIVE.md`, `OUTREACH.md`) |
| 37 | Backlink gap audit | **Operator** | Same |
| 38 | Turn unlinked mentions into links | **Operator** | Semrush notes unlinked mentions still help entities for AI |
| 39 | New link opportunities | **Operator** | Honest methodology + public API as the pitch |
| 40 | Google Business Profile | **N/A** | Not a local storefront |

---

## 6. AI Search (ASO)

Semrush’s three AI-search tips, mapped:

| # | Task (paraphrase) | SIREN | Where |
|---:|---|---|---|
| 41 | Audit AI visibility baseline | **Operator** | Weekly: ask ChatGPT / Perplexity / Claude / Gemini whether they cite us and which URL (FINDABILITY §3.1 / §5) |
| 42 | Structure content for AI extractability | **Done** (ongoing) | Question H1/H2, concise definitions, visible FAQ, paragraph-level answers, UTC + denominators above the fold |
| 43 | `llms.txt` (and kin) | **Done** | `/llms.txt`, `/agents.md`, `/agents.txt`, `/skill.md`, `/.well-known/api-catalog`, OpenAPI |

Extra Semrush AI points we already treat as house rules:

- Do not block AI crawlers that we want citing us.
- Google indexability still feeds many AI tools’ discovery path.
- Prefer clear HTML over JS-only shells.
- Fresh, dated pages help; our item + day hubs + news-sitemap carry that.

---

## 7. Open items (not “copy Semrush” — finish our own list)

1. **GSC verification + both sitemaps submitted** — FINDABILITY #11.
2. **Weekly AI citation spot-check** logged somewhere operators actually look
   (VIRAL Monday review or a short note in the SEO daily output).
3. **Bing Webmaster / AI Performance** — optional once GSC is green; IndexNow
   already pings Bing.
4. Keep refusing thin synonym farms, keyword-meta stuffing, and schema that does
   not match HTML.

---

## 8. Sources

| Claim | Source |
|---|---|
| 43-tip structure + AI Search (ASO) section | [semrush.com/blog/seo-checklist](https://www.semrush.com/blog/seo-checklist/) |
| X announcement | [x.com/semrush/status/2110316440527974857](https://x.com/semrush/status/2110316440527974857) |
| SIREN status | This repo’s FINDABILITY / COMPETITIVE-SEO / live `seo-daily` |
