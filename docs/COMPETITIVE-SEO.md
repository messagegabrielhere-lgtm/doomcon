# Competitive SEO reverse-engineer

**Measured:** 2026-10-15T10:13Z (live HTTP fetches via `seo-daily` / `fetch.mjs`);
live lead **6,686** sitemap URLs / news **200** (pizzint news empty again);
tips + vs short aliases + lab head-term titles + `/trends` dir aliases (#124)
intact. Daily ship: `seo-daily` detects agent-map `/trends.html` lag (#125).
Web search ranks siren.watch #1 for “SIREN AI activity index”. Operator
console verify still open: issue #202. Companion to `docs/COMPETITIVE.md`
(Sept inventory) and `docs/FINDABILITY.md`.

**Daily re-measure:** `node collector/tools/seo-daily.mjs` (see
`docs/FINDABILITY.md` §4). Refresh the scoreboard table below when the tool
shows a material move; do not invent counts by hand.

Goal: copy *mechanics that move organic search*, not their claims. Head-term
hijacks we cannot honestly answer stay refused (`CONTRACT.md`, `VOICE.md`).

---

## 0. Scoreboard (live)

| Site | Sitemap URLs | News sitemap | Home `<title>` tactic | Schema on home | Faceted entity URLs | `llms.txt` / OpenAPI |
|---|---:|---|---|---|---|---|
| **DoomBench** | **2,090** | none | “Live AI Doom Index” | FAQPage only | `/models` `/companies` `/countries` `/people` `/jobs` `/news` | no |
| **Skynet Countdown** | **1,247** | none | “AGI Timeline Tracker” | Organization + WebSite | `/tags/*` + `/news/YYYY-MM-DD` | no |
| **pizzint.watch** | **1,018** | flaps **0↔14** (`google-news-open` / `pizzint-news-alive`) | DEFCON + Doomsday Clock hijack + keywords meta | FAQPage + WebApplication | `/intel/*` briefs only; chips are `<button>`s | no (404 → SPA shell) |
| **siren.watch** | **6,686** live (clears DoomBench 2090 / Skynet 1247 / pizzint 1018); GSC HTML-tag **absent** until operator sets secret (#11) | **200** news-sitemap (hold Google News lane; keyword-rich) | Head-term live title (“AI activity index today · SIREN …”) | Rich: Dataset, FAQ, Organization, VideoObject… | `/item/*` archive + entity hubs + `/verify/` + `/free-tools/` + `/vs/{doom,skynet,takeoff}.html` + `/trends.html` (#124/#125) | **yes** (lists short aliases incl. `/trends`) |
| pdoom.ai | SPA shell | SPA shell | Sci-fi countdown + keyword stuffing | none | none | SPA shell |
| takeofftracker.com | none | none | “AGI Metrics Dashboard” | none | none | none |

### Resolved from COMPETITIVE.md §0.1

pizzint’s `/news-sitemap.xml` **flaps** empty↔thin (0 at 2026-10-15T01:59Z after 14 earlier). Google News is **contested**; keep our rolling news-sitemap
full and keyword-rich (local cap **200**; head terms before topic/pillar slugs).
Outrank free-tool URLs (`/verify.html`, `/free-tools.html`) plus `robots.txt` /
`feed.xml` / `now.md` / `api/now.txt` discovery tips are the citation/LLM-mention
lever beyond URL count. Blocker for organic proof remains FINDABILITY **#11** (GSC).

---

## 1. What each competitor actually does

### 1.1 pizzint — brand hijack + brief factory

- **Title:** `Pentagon Pizza Index — Live DEFCON Level & Doomsday Clock | PizzINT`
- **Keywords meta:** literally `defcon level today, current defcon level, doomsday clock, …` (Google ignores keywords; the *title* is the real lever).
- **Long tail:** ~997 `/intel/<slug>` pages with **NewsArticle + Speakable + BreadcrumbList + Thing entities + Offer**.
- **Guides:** four evergreen `/guides/*` with FAQPage + breadcrumbs — thin vs 997 briefs.
- **Leak:** `robots.txt` still Disallows ~19 unshipped paths (free roadmap).
- **Miss:** no `llms.txt`, API Disallow’d, news sitemap empty, homepage still ships loading placeholders in HTML.

**Steal:** Speakable + breadcrumbs on every item (done). Evergreen explainers we already have (`/guide`, `/p-doom`, `/ai-doomsday-clock`) — keep question-shaped titles. Do **not** steal DEFCON/doomsday claims we cannot support; steal the *shape* (“AI activity level today”).

### 1.2 DoomBench — entity graph wins URL count

- **2,081** URLs dominated by faceted entities, not only news.
- Model page title pattern: `GPT-6 Astra Doom Score: 97.6 - DoomBench` (entity + number + brand).
- Country/people/company hubs with HTML breadcrumbs; **almost no JSON-LD** on entity pages (we can beat them on schema while copying URL shape).
- Home H1 is a question (“Is AI taking the wheel?”) — search-shaped.

**Steal:** `/pillar/<id>` and `/lab/<id>` landings with unique titles, internal links from items, sitemap only when substance clears the gate. Optional later: `/source/<id>` if we want another axis.

### 1.3 Skynet Countdown — tags + dated news hubs

- `/tags/deepseek` etc. with ItemList + BreadcrumbList.
- `/news/2026-10-10` day hubs — easy freshness signal.
- `/agi-timeline` evergreen with FAQPage and dated “not yet” claim in the description.
- Clean OG image; thin home schema.

**Steal:** day hubs are optional (our `/item` + news sitemap already carry dates). Tag/lab pages are the high-ROI copy. Timeline-style evergreen = our `/guide` + `/ai-doomsday-clock`.

### 1.4 pdoom.ai / takeofftracker — negative examples

Client-rendered shells: no real robots, no sitemap, no canonical, no JSON-LD.
They win social memes, not Google. Do not imitate.

---

## 2. Gaps this pass closes vs leaves open

| Competitor move | Our gap before | Action |
|---|---|---|
| Faceted entity URLs (DoomBench / Skynet) | CSS filters only | **Ship** `/pillar/*` + `/lab/*` |
| Speakable + Breadcrumb on every story (pizzint) | Missing on live | **Ship** in organic SEO PR |
| Head-term homepage title (all of them) | Brand-first live title | **Ship** “AI activity index today …” |
| Rolling news sitemap (pizzint’s is dead; ours live) | Already shipping | Keep 48h window + keywords |
| `llms.txt` / OpenAPI | We lead the category | Expand instruments + facets |
| Keywords meta stuffing (pizzint / pdoom) | None | **Refuse** — ignored by Google, banned by voice |
| 2k+ URL count | ~530 | Grow via facets + item window; do not invent doorway synonyms |
| Search Console verification | Operator | Secret hook shipped; Bob verifies |

---

## 3. Operator checklist after merge

1. Search Console → submit `sitemap.xml` (should climb by ~5–15 facet URLs immediately).
2. Spot-check `/pillar/capability.html` and `/lab/openai.html` in Rich Results test.
3. Re-fetch pizzint `news-sitemap.xml` monthly; if it starts rolling again, treat Google News as contested again.
4. Weekly: indexed count vs sitemap count (vanity = sitemap-only growth).

---

## 4. Next entity axes, 2026-10-10

DoomBench's lead is still entity URLs (`/countries`, `/models`), not keywords.
Two axes we can answer from data we already publish:

- `/country/<iso>.html` when OpenStreetMap has at least three datacentre sites mapped in that country. The page prints the status split and a capped site list. Countries under the gate stay on `/world.html` only. Copy stays a count of map objects (`docs/WORLD.md`).
- `/model/<slug>.html` when at least three scored stories name that model family in the published entity list. The page lists those stories. It does not assign the model a score.

Story pages link the model when the gate clears. The world table keeps its zoom control and adds a country-page link beside it. Homepage "Where the machines live" links the country index.

### 4.1 People, day hubs, entity-only labs (2026-10-10)

| URL | Gate | Honesty |
|---|---|---|
| `/people/<id>.html` | ≥3 press headlines, on-record lines, or 7-day coverage count | Headlines only — never invents a quotation |
| `/news/YYYY-MM-DD.html` | ≥5 scored stories that UTC day | List of scored items; not a forecast |
| `/lab/<id>.html` for entity labs off the race board (Microsoft, NVIDIA, …) | ≥3 scored stories naming the lab | Story counts only — no invented market odds |

Linked from `/leaders.html`, `/news.html`, `llms.txt`, catalog, and sitemap.

### 4.2 Topic tags (2026-10-12)

Skynet’s `/tags/*` shape with a short published vocabulary (agents, GPUs,
safety, datacenters, fundraising, benchmarks, regulation). Gate: ≥5 scored
stories whose title or summary matches the needle. Story pages link indexable
tags. Synonym doorway farms stay refused.

---

## 5. Competitor conquest pages, 2026-10-10

Brand-query interception without doorway spam. Evergreen HTML with FAQPage +
Speakable + BreadcrumbList; titles name the rival only where we honestly
contrast measurement methods (`VOICE.md`, `CONTRACT.md`).

| URL | Head-term job |
|---|---|
| `/compare.html` | “AI doom indexes compared” — side-by-side table |
| `/alternatives.html` | “DoomBench / Skynet / p(doom) alternative” hub |
| `/vs/doombench.html` | Activity count vs qualitative doom index (`/vs/doom.html` short alias, canonical on primary) |
| `/vs/skynet-countdown.html` | Activity count vs AGI timeline / control-loss % (`/vs/skynet.html` short alias, canonical on primary) |
| `/vs/pdoom.html` | Activity count vs opinion-as-percentage clocks |
| `/vs/pizzint.html` | Activity count vs DEFCON / Pentagon Pizza Index brand hijack |
| `/vs/takeofftracker.html` | Activity count vs AGI takeoff dashboard (`/vs/takeoff.html` short alias, canonical on primary) |

Linked from homepage FAQ, `/guide.html`, catalog, `llms.txt`, and sitemap.
Do **not** claim SIREN publishes takeover risk, AGI dates, DEFCON levels, or anyone’s p(doom).
