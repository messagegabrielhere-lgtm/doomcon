# Competitive SEO reverse-engineer

**Measured:** 2026-10-16T07:16Z (live HTTP fetches via `seo-daily` / `fetch.mjs`);
live lead **6,690** sitemap URLs / news **200** (pizzint news-sitemap **0** —
`google-news-open`; keep keyword-rich lane); Trends tip (`ai_related_total` **0**;
hold doorway); News keywords **#199** METR + Bee + **#200** Apertus / Apertus 1.5 +
**#204** Bluesky / Attie / Nscale + **#206** Starshield + **#208** Roadster +
**#212** Fable / Fable 5 / 5.1 / 5.5 + **#214** ChatGPT Voice / GPT-Live /
GPT-Live-1.1 + **#216** MAI-Base / MAI-Base-2 + **#220** MAI-Base FAQ +
**#222** Muse Spark / Muse Spark Open + **#224** Tencent Cloud + **#226** CERT-In +
**#228** DeepSeek V4.1 Flash + **#231** Nemotron 3.5 Super VL + **#234** Bolt +
**#236** DeepSeek V4 Pro + **#238** Qwen3.8 + **#241** Airship live on tip
(`d91c7bc`; CDN lag **0**; Qwen3.8 / V4 Pro / Bolt / Super VL intact); tip merge
**#210** + **#218** Base-beside-MAI hygiene; `seo-daily` probes
**#201**/**#204**/**#206**/**#208**/**#212**/**#214**/**#216**/**#220**/**#222**/**#224**/**#226**/**#228**/**#231**/**#234**/**#236**/**#238**/**#241**
catch tip wipe / CDN lag;

Trends FAQs + agent tips intact (IREN→Watts, dram→Micron, CoreWeave→lab,
Nvidia/NVDA→lab, neocloud→tag); OpenAI lawsuit / FTC FAQ **#162** + Anthropic
IPO / FTC FAQ **#163** + ASML Trends FAQ **#164** + TSMC foundry FAQ **#165** + Amazon Bee FAQ **#167**
cover state-suit / IPO / EUV / AI-foundry tape on gated labs. IndexNow ALWAYS
**#168** adds `/lab/tsmc.html` + `/lab/coreweave.html` beside amazon/asml so Bing
learns those Trends labs on every Publish. Meta Muse / open-weight FAQ **#169**
covers Muse Spark / Muse Wonder tape on `/lab/meta.html`. Apple Intelligence FAQ
**#170** covers on-device / China-launch tape on `/lab/apple.html`. Microsoft Copilot FAQ
**#171** covers Copilot / Azure AI tape on `/lab/microsoft.html`. Microsoft MAI-Base FAQ
**#220** covers MAI-Base / MAI-Base-2 MoE tape on the same gated Microsoft lab. News keyword aliases
**#172** emit Muse / Apple Intelligence / Copilot beside Meta / Apple / Microsoft parents
so Google News stays aligned with those Trends labs. Grok / xAI FAQ **#173** covers Grok Voice tape on `/lab/xai.html`. Gemini / Gemma FAQ **#174** covers Gemini 4 Argon / Gemma open-model tape on `/lab/google-deepmind.html`. Samsung / HBM FAQ **#175** covers AI memory-chip selloff tape on `/lab/samsung.html`. Character.ai bankruptcy FAQ **#176** covers companion-chatbot Chapter 11 tape on `/tags/chatbots.html`. Qwen FAQ **#177** covers Alibaba open-weight / Tongyi tape on `/lab/qwen.html`. Oracle / AI datacenter FAQ **#178** covers Oracle pipeline / AI-cloud capacity tape on `/tags/datacenters.html`. DeepSeek outage FAQ **#179** covers Chinese open-model downtime / refund tape on `/lab/deepseek.html`. Mistral / Timestral FAQ **#180** covers Timestral / CERN Flare tape on `/lab/mistral.html`. OpenAI outage FAQ **#181** covers ChatGPT status / feature-degradation tape on `/lab/openai.html` (alongside lawsuit FAQ **#162**). Hugging Face hack / incident FAQ **#182** covers model-hub intrusion tape on `/tags/huggingface.html`. Palantir / AIP FAQ **#183** covers government / defense AI contract tape on `/lab/palantir.html`. AMD / MI300 FAQ **#184** covers AI GPU / Instinct accelerator tape on `/lab/amd.html`. Tesla / FSD FAQ **#185** covers Autopilot / FSD / robotaxi tape on `/lab/tesla.html`. ChatGPT Chrome / computer use FAQ **#191** covers Chrome tab-controls / browser-agent tape on `/lab/openai.html` (alongside lawsuit **#162** + outage **#181**). Meta–Apple Mac AI FAQ **#193** covers Muse-on-Mac / Meta–Apple partnership tape on `/lab/meta.html` (alongside Muse **#169**). Agents.md #193 needle + Publish preserve **#194** keeps `Meta and Apple Mac AI` / `ChatGPT Chrome` tips across orphan wipes. Samsung AI glasses FAQ **#195** covers Galaxy glasses / XR wearable tape on `/lab/samsung.html` (alongside HBM **#175**). Collect Publish extract **#192** keeps schedule Publish under GitHub’s expression cap; **#196** fixed glued-`fi` syntax; **#197** `bash -n` + `collectPublishSrc()` keep restores green in CI. Watchlist routing
**#158** + news keywords **#159**/**#161**/**#172**/**#176**/**#177**/**#178**/**#180**/**#183**/**#184**/**#185** keep Google News aligned. Publish
restore **#156**/**#158**/**#162**–**#167**/**#169**–**#171**/**#173**–**#185**/**#191**/**#193**–**#195** keeps agent tips + Trends/lab HTML
across collect wipes (#166/#167/#169–#171/#173–#184/#191/#193/#195/#220 also guard ASML/TSMC/Amazon Bee/Meta Muse/Apple Intelligence/Microsoft Copilot/MAI-Base/Grok/Gemini/Samsung/Samsung-glasses/Character.ai/Hugging Face/Qwen/Oracle/DeepSeek/Mistral/OpenAI-outage/OpenAI-Chrome/Meta-Apple-Mac/Palantir/AMD/Tesla destinations on the routing FAQ). Branded “SIREN AI activity index” still #1; head-term
SERPs still need GSC crawl (issue #202). Companion to `docs/COMPETITIVE.md` and
`docs/FINDABILITY.md`.

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
| **Skynet Countdown** | **1,249** | none | “AGI Timeline Tracker” | Organization + WebSite | `/tags/*` + `/news/YYYY-MM-DD` | no |
| **pizzint.watch** | **1,018** | **0** (flaps empty↔14; open now) | DEFCON + Doomsday Clock hijack + keywords meta | FAQPage + WebApplication | `/intel/*` briefs only; chips are `<button>`s | no (404 → SPA shell) |
| **siren.watch** | **6,690** live (clears DoomBench 2090 / Skynet 1249 / pizzint 1018); GSC HTML-tag **absent** until operator sets secret (#11) | **200** news-sitemap (hold open Google News lane; keyword-rich; #199/#200/#204/#206/#208/#212/#214/#216/#222/#224/#226/#228/#231/#234/#236/#238/#241 needles; #210/#218 tip keyword merge; pizzint flaps 0↔14) | Head-term live title (“AI activity index today · SIREN …”) | Rich: Dataset, FAQ, Organization, VideoObject… | `/item/*` archive + entity hubs + `/verify/` + `/free-tools/` + `/vs/{doom,skynet,takeoff}.html` + `/trends.html` + `/pdoom.html` (#129) + race labAboutLabel (#144) + Watts/Micron/CoreWeave/Neocloud/Nvidia Trends FAQs (#152–#161) + OpenAI lawsuit/FTC FAQ (#162) + Anthropic IPO/FTC FAQ (#163) + ASML Trends FAQ (#164) + TSMC foundry FAQ (#165) + Amazon Bee FAQ (#167) + Meta Muse FAQ (#169) + Apple Intelligence FAQ (#170) + Microsoft Copilot FAQ (#171) + Microsoft MAI-Base FAQ (#220) + Grok / xAI FAQ (#173) + Gemini / Gemma FAQ (#174) + Samsung / HBM FAQ (#175) + Samsung AI glasses FAQ (#195) + Character.ai bankruptcy FAQ (#176) + Qwen FAQ (#177) + Oracle / AI datacenter FAQ (#178) + DeepSeek outage FAQ (#179) + Mistral / Timestral FAQ (#180) + OpenAI outage FAQ (#181) + Hugging Face hack FAQ (#182) + Palantir / AIP FAQ (#183) + AMD / MI300 FAQ (#184) + Tesla / FSD FAQ (#185) + Roadster keywords (#208) + Fable keywords (#212) + ChatGPT Voice / GPT-Live keywords (#214) + MAI-Base keywords (#216) + tip news:keywords merge (#210) + ChatGPT Chrome FAQ (#191) + Meta–Apple Mac FAQ (#193) + agents needle preserve (#194) + watchlist routing FAQ (#158/#166/#167/#169–#171/#173–#185/#191/#193/#195/#220) + news-fast guard re-arm (#189) + collect Publish extract (#192) + Publish syntax (#196) + bash-n (#197) + Bluesky/Attie/Nscale keywords (#204) + Starshield keywords (#206) | **yes** (Trends tips IREN→Watts / dram→Micron / CoreWeave→lab / NVDA→lab / OpenAI lawsuit→lab / OpenAI outage→lab / ChatGPT Chrome→lab / Anthropic IPO→lab / ASML→lab / TSMC→lab / Amazon Bee→lab / Meta Muse→lab / Meta–Apple Mac→lab / Apple Intelligence→lab / Microsoft Copilot→lab / MAI-Base→lab / Grok→xAI / Gemini/Gemma→DeepMind / Samsung/HBM→lab / Samsung AI glasses→lab / neocloud→tag / Character.ai→chatbots / Hugging Face hack→tag / Qwen→lab / Oracle→datacenters / DeepSeek→lab / Mistral/Timestral→lab / Palantir/AIP→lab / AMD/MI300→lab / Tesla/FSD→lab; Publish restore #156/#158/#162–#167/#169–#171/#173–#185/#191/#193–#195/#210/#220) |
| pdoom.ai | SPA shell | SPA shell | Sci-fi countdown + keyword stuffing | none | none | SPA shell |
| takeofftracker.com | none | none | “AGI Metrics Dashboard” | none | none | none |

### Resolved from COMPETITIVE.md §0.1

pizzint’s `/news-sitemap.xml` is **empty again** (**0** at 2026-10-16T07:16Z;
flaps empty↔14). Google News lane is **open**; keep our rolling news-sitemap
full and keyword-rich (local cap **200**; head terms before topic/pillar slugs;
#210/#218 tip keyword merge; #212 Fable + #214 ChatGPT Voice + #216 MAI-Base +
#222 Muse Spark + #224 Tencent Cloud + #226 CERT-In + #228 Flash + #231 Super VL +
#234 Bolt + #236 DeepSeek V4 Pro + #238 Qwen3.8 + #241 Airship needles). Outrank
free-tool URLs (`/verify.html`, `/free-tools.html`) plus `robots.txt` / `feed.xml` /
`now.md` / `api/now.txt` discovery tips are the citation/LLM-mention lever beyond
URL count. Blocker for organic proof remains FINDABILITY **#11** (GSC).

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
