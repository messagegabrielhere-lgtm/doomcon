# Competitive SEO reverse-engineer

**Measured:** 2026-10-10 (live HTTP fetches); **re-measured 2026-10-12** via
`node collector/tools/seo-daily.mjs`. Companion to `docs/COMPETITIVE.md`
(Sept inventory) and `docs/FINDABILITY.md` (our playbook).

**Daily re-measure:** `node collector/tools/seo-daily.mjs` (see
`docs/FINDABILITY.md` §4). Refresh the scoreboard table below when the tool
shows a material move; do not invent counts by hand.

Goal: copy *mechanics that move organic search*, not their claims. Head-term
hijacks we cannot honestly answer stay refused (`CONTRACT.md`, `VOICE.md`).

---

## 0. Scoreboard (live)

| Site | Sitemap URLs | News sitemap | Home `<title>` tactic | Schema on home | Faceted entity URLs | `llms.txt` / OpenAPI |
|---|---:|---|---|---|---|---|
| **DoomBench** | **2,088** (2026-10-12) | none | “Live AI Doom Index” | FAQPage only | `/models` `/companies` `/countries` `/people` `/jobs` `/news` | no |
| **Skynet Countdown** | **1,238** | none | “AGI Timeline Tracker” | Organization + WebSite | `/tags/*` (717) + `/news/YYYY-MM-DD` (507) | no |
| **pizzint.watch** | **1,018** | **14** (flipping empty↔14 on 2026-10-12 — contested) | DEFCON + Doomsday Clock hijack + keywords meta | FAQPage + WebApplication + Organization | `/intel/*` briefs only; chips are `<button>`s | no (404 → SPA shell) |
| **siren.watch** | **~682** live → **~6,220+** local (800 live + **5000** archive + facets incl. `/tags.html` `/kinds.html` `/outlets.html` `/sources.html` `/pillars.html` `/countries.html`) — ahead of DoomBench/Skynet/pizzint pending deploy | **100** live / **150** cap in-repo with `news:keywords` | Head-term live title (“AI activity index today · SIREN …”) | Rich: Dataset, FAQ, Organization, VideoObject… | `/pillar/*` + `/pillars.html` `/lab/*` + `/companies.html` `/models.html` `/people.html` `/tags.html` `/kinds.html` `/outlets.html` `/sources.html` `/countries.html` `/country/*` `/model/*` `/people/*` `/tags/*` `/kind/*` `/outlet/*` `/source/*` + archived `/item/*`; facets link older archive matches | **yes** |
| pdoom.ai | 0 (SPA shell) | 0 | Sci-fi countdown + keyword stuffing | none | none | yes (thin) |
| takeofftracker.com | none | none | “AGI Metrics Dashboard” | none | none | none |

### Resolved from COMPETITIVE.md §0.1

pizzint’s `/news-sitemap.xml` was empty (0 `<loc>`) on 2026-10-10 and showed
**14 URLs** again on 2026-10-12 — treat Google News as contested. Their ordinary
sitemap still rolls. URL count + title hijack + brief schema remain their main
organic levers; keep our rolling news-sitemap full and keyword-rich.

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

- `/country/<iso>.html` when OpenStreetMap has at least three datacentre sites mapped in that country. The page prints the status split and a capped site list, plus scored stories (live + archive) whose title or summary names the country. Countries under the gate stay on `/world.html` only. Copy stays a count of map objects (`docs/WORLD.md`) — story counts are not a national AI ranking.
- `/model/<slug>.html` when at least three scored stories name that model family in the published entity list. The page lists those stories. It does not assign the model a score.

Story pages link the model when the gate clears. The world table keeps its zoom control and adds a country-page link beside it. Homepage "Where the machines live" links the country index.

### 4.1 People, day hubs, entity-only labs (2026-10-10)

| URL | Gate | Honesty |
|---|---|---|
| `/people/<id>.html` + `/people.html` | ≥3 press headlines, on-record lines, 7-day coverage floor, or scored archive stories naming them | Headlines only — never invents a quotation; hub is not a person doom score |
| `/news/YYYY-MM-DD.html` | ≥5 scored stories that UTC day | List of scored items; not a forecast |
| `/lab/<id>.html` for entity labs off the race board (Microsoft, NVIDIA, Oracle, Palantir, Adobe, Broadcom, Cloudflare, …) | ≥3 scored stories naming the lab | Story counts only — no invented market odds |

Linked from `/leaders.html`, `/news.html`, `llms.txt`, catalog, and sitemap.

### 4.2 Topic tags (2026-10-12)

Skynet’s `/tags/*` shape with a short published vocabulary (agents, GPUs,
safety, datacenters, fundraising, benchmarks, regulation, inference, robotics,
China AI, plus later chips/energy/labor/healthcare/**coding**/**acquisitions**/
**browser**/**watermarking**/**evals**/**video**/**voice**/**reasoning**/**ipo**/**rag**).
Gate: ≥5 scored stories whose title or summary matches the needle.
Story pages link indexable tags and indexable people (full-name match only).
Synonym doorway farms stay refused.

### 4.3 Story kinds (2026-10-12)

`/kind/<id>.html` for collector kinds (`press`, `forum`, `paper`, …) that clear
≥5 scored stories. Kind is already on every NewsItem — these pages make the
filter crawlable with ItemList schema and newsroom/item links.

### 4.4 Item archive + wider live window (2026-10-12)

DoomBench/Skynet/pizzint win on **retained** URL count. Our newsroom used to
delete `/item/` pages when the live cap bound. Now:

- Live `data/news.json` cap is **800** (was 400).
- Cap overflow and aged-off scored rows merge into `data/item-archive.json`
  (max 1,600). `site/build.mjs` writes those pages and `sitemap.xml` lists them.
- Topic tags add **security**, **military**, and **education** when ≥5 stories match.
- One-shot backfill from prior committed `data/news.json` snapshots:
  `npm run seo:archive-backfill` (only rows we already scored and published).

This is the honest volume lever: more scored stories kept, not synonym doorways.

### 4.5 Publisher-domain hubs (2026-10-12)

`/outlet/<slug>.html` for original-URL hosts with ≥5 scored stories in the
live window **or** durable archive (`arxiv.org`, `techcrunch.com`, …). Distinct
from `/source/<adapter-id>` (feed adapters). Story pages link the publisher when
the gate clears. Extra topic tags: open-weights, cloud, startups, finance,
multimodal.

### 4.6 Archive hubs (anti-orphan) (2026-10-12)

Paginated `/item/archive.html` (+ `/item/archive-N.html`) list the durable
archive in 100-story pages so the 1,600 retained `/item/` URLs are reachable
from the newsroom, not only the sitemap. Related links on story pages may
point into the archive. Live `/item/` lists the current window only (lighter
HTML).

---

## 5. Competitor conquest pages, 2026-10-10

Brand-query interception without doorway spam. Evergreen HTML with FAQPage +
Speakable + BreadcrumbList; titles name the rival only where we honestly
contrast measurement methods (`VOICE.md`, `CONTRACT.md`).

| URL | Head-term job |
|---|---|
| `/compare.html` | “AI doom indexes compared” — side-by-side table |
| `/alternatives.html` | “DoomBench / Skynet / p(doom) alternative” hub |
| `/vs/doombench.html` | Activity count vs qualitative doom index |
| `/vs/skynet-countdown.html` | Activity count vs AGI timeline / control-loss % |
| `/vs/pdoom.html` | Activity count vs opinion-as-percentage clocks |

Linked from homepage FAQ, `/guide.html`, catalog, `llms.txt`, and sitemap.
Do **not** claim SIREN publishes takeover risk, AGI dates, or anyone’s p(doom).
