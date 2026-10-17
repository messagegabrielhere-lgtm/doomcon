# Competitive SEO reverse-engineer

**Measured:** 2026-10-17T02:32Z after **#380** tip `1f0c694` (+ heal after newsroom wipe) + IndexNow **200**: Allied Universal news:keywords **3/3** CDN clear; Tesla Flying Roadster FAQ tip still **ok**; SpaceX Starshield FAQ tip still **ok**; SoftBank Allied FAQ tip still **ok**; Waymo Canada FAQ tip still **ok**; NIST tip still **ok**; Canadian data centres FAQ tip still **ok**; AI safety bill FAQ tip still **ok**; Publish preserve **#368**/**#372**/**#374**/**#376**/**#378**; M5 Max tip **#364** still **ok**; pizzint news **14** contested (`pizzint-news-alive`); lead **6,700** / news **200**; GSC/Bing meta **absent**; News keywords through **#380**; FAQ routes through **#378**; Publish preserve through **#378**; tip merge **#210** + **#300** title-heal; `seo-daily` probes through **#381** catch tip wipe / CDN lag.

Trends FAQs + agent tips intact (IREN→Watts, dram→Micron, CoreWeave/CRWV→lab **#288**,
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
**#158** + news keywords **#159**/**#161**/**#172**/**#176**/**#177**/**#178**/**#180**/**#183**/**#184**/**#185**/**#288** keep Google News aligned. Publish
restore **#156**/**#158**/**#162**–**#167**/**#169**–**#171**/**#173**–**#185**/**#191**/**#193**–**#195** keeps agent tips + Trends/lab HTML
across collect wipes (#166/#167/#169–#171/#173–#184/#191/#193/#195/#220 also guard ASML/TSMC/Amazon Bee/Meta Muse/Apple Intelligence/Microsoft Copilot/MAI-Base/Grok/Gemini/Samsung/Samsung-glasses/Character.ai/Hugging Face/Qwen/Oracle/DeepSeek/Mistral/OpenAI-outage/OpenAI-Chrome/Meta-Apple-Mac/Palantir/AMD/Tesla destinations on the routing FAQ). Branded “SIREN AI activity index” still #1; bare “AI activity index today” /
“AI activity level today” still weak — **#252**/**#262** typed-guess aliases +
**#254**/**#284** home exact-match FAQs (definitional + title-today) +
**#296**/**#312** dual head-term `<title>` (trimmed so SERP keeps level today) + **#308** H1 `.v2-sr` head terms; head-term SERPs still need GSC crawl (issue #202).
Companion to `docs/COMPETITIVE.md` and `docs/FINDABILITY.md`.

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
| **pizzint.watch** | **1,018** | **0↔14** (flaps; keep our lane keyword-rich) | DEFCON + Doomsday Clock hijack + keywords meta | FAQPage + WebApplication | `/intel/*` briefs only; chips are `<button>`s | no (404 → SPA shell) |
| **siren.watch** | **6,700** live (clears DoomBench 2090 / Skynet 1250 / pizzint 1018; +#245/#246 model hubs + **#318** classic panel + **#322** classic sitemap restore + **#324** agent maps + **#326** skill.md + **#328** discovery + **#330** discovery JSON + **#332** free-tools + **#334** tip classic); GSC HTML-tag **absent** until operator sets secret (#11) | **200** news-sitemap (hold keyword-rich Google News lane; #199/#200/#204/#206/#208/#212/#214/#216/#222/#224/#226/#228/#231/#234/#236/#238/#241/#250/#256/#258/#260/#267/#269/#271/#273/#275/#277/#279/#282/#286/#288/#290/#292/#294/#298/#302/#304/#306/#320/#336/#338/#340/#342/#344/#346/#348/#350/#352/#354/#356/#358/#360/#364/#370 needles; #210/#218 tip keyword merge + **#300** title-heal + **#310** hyphen↔space flex; GPT-6 Astra space-form lag **0** + PS5 **#320** lag **0** + NYC Council **#306** lag **0** + Dell **#304** lag **0** + Elorian **#302** lag **0** + Vercel **#298** lag **0** + GPT-Live-1 / Kling **#336** tip **ok** + Xing / Xing 4.0 **#338** tip **ok** + Replit **#340** tip **ok** (3/3) + Siri **#342** tip **ok** + Claude Mythos 5 **#344** tip **ok** (3/3) + Qwen3.8-Max **#346** tip **ok** (2/2) + Xing 4.0 29B-A4B **#348** tip **ok** (2/2) + PS5s **#350** tip **ok** (1/1) + Anthropic IPO **#352** tip **ok** (3/3) + Flying Roadster **#354** tip **ok** (3/3) + Bee AI **#356** tip **ok** + M5 Max **#364** tip **ok** (**1/1**) + NIST **#370** tip **ok** (**2/2**) + CoreWeave→CRWV **#288** + Mac Studio(s) / Beam / RTX Spark lag **0**; `google-news-open` (pizzint news **0**)) | Head-term live title trimmed (**#316** tip `fd9219b`: dual head terms + `SIREN {n}` only; **#314** restore) + H1 `.v2-sr` dual head terms (**#308**) | Rich: Dataset, FAQ, Organization, VideoObject… | `/item/*` archive + entity hubs + `/classic.html` panel (**#318**) + sitemap loc restore (**#322**) + agent-map classic (**#324**) + skill.md classic (**#326**) + discovery classic (**#328**) + discovery JSON classic (**#330**) + free-tools classic (**#332**) + tip classic (**#334**) + `/model/muse-spark.html` (#245) + `/model/fable.html` (#246) + `/ai-activity-index.html` (#252) + `/ai-activity-level.html` (#262) + `/verify/` + `/free-tools/` + `/vs/{doom,skynet,takeoff}.html` + `/trends.html` + `/pdoom.html` (#129) + race labAboutLabel (#144) + Watts/Micron/CoreWeave/CRWV/Neocloud/Nvidia Trends FAQs (#152–#161/#288) + OpenAI lawsuit/FTC FAQ (#162) + Anthropic IPO/FTC FAQ (#163) + ASML Trends FAQ (#164) + TSMC foundry FAQ (#165) + Amazon Bee FAQ (#167) + Meta Muse FAQ (#169) + Apple Intelligence FAQ (#170) + Microsoft Copilot FAQ (#171) + Microsoft MAI-Base FAQ (#220) + Grok / xAI FAQ (#173) + Gemini / Gemma FAQ (#174) + Samsung / HBM FAQ (#175) + Samsung AI glasses FAQ (#195) + Character.ai bankruptcy FAQ (#176) + Qwen FAQ (#177) + Oracle / AI datacenter FAQ (#178) + DeepSeek outage FAQ (#179) + Mistral / Timestral FAQ (#180) + OpenAI outage FAQ (#181) + Hugging Face hack FAQ (#182) + Palantir / AIP FAQ (#183) + AMD / MI300 FAQ (#184) + Tesla / FSD FAQ (#185) + Roadster keywords (#208) + Fable keywords (#212) + ChatGPT Voice / GPT-Live keywords (#214) + MAI-Base keywords (#216) + tip news:keywords merge (#210) + ChatGPT Chrome FAQ (#191) + Meta–Apple Mac FAQ (#193) + agents needle preserve (#194) + watchlist routing FAQ (#158/#166/#167/#169–#171/#173–#185/#191/#193/#195/#220) + news-fast guard re-arm (#189) + collect Publish extract (#192) + Publish syntax (#196) + bash-n (#197) + Bluesky/Attie/Nscale keywords (#204) + Starshield keywords (#206) + model-hub preserve (#248) + ModelSphere keywords (#250) + Krea / Krea 3 keywords (#256) + Flux 3 keywords (#258) + Together AI keywords (#260) + Terafab keywords (#267) + Cohere keywords (#269) + Accenture keywords (#271) + G7 keywords (#273) + Bee Frontier / Bee Eclipse keywords (#275) + Surface Laptop Ultra keywords (#277) + RTX Spark keywords (#279) + Qwen 4 Max keywords (#282) + Beam keywords (#286) + NYC Council keywords (#306) + PS5 keywords (#320) + home H1 head terms (#308) + home title trim (#312/#314) + classic panel (#318) + classic sitemap restore (#322) + classic agent maps (#324) + skill.md classic (#326) + discovery classic (#328) + discovery JSON classic (#330) + free-tools classic (#332) + tip classic (#334) | **yes** (Trends tips IREN→Watts / dram→Micron / CoreWeave/CRWV→lab / NVDA→lab / OpenAI lawsuit→lab / OpenAI outage→lab / ChatGPT Chrome→lab / Anthropic IPO→lab / ASML→lab / TSMC→lab / Amazon Bee→lab / Meta Muse→lab / Meta–Apple Mac→lab / Apple Intelligence→lab / Microsoft Copilot→lab / MAI-Base→lab / Grok→xAI / Gemini/Gemma/Argon→DeepMind / Samsung/HBM→lab / Samsung AI glasses→lab / neocloud→tag / Character.ai→chatbots / Hugging Face hack→tag / Qwen→lab / Oracle→datacenters / DeepSeek→lab / Mistral/Timestral→lab / Palantir/AIP→lab / AMD/MI300→lab / Tesla/FSD→lab; Publish restore #156/#158/#162–#167/#169–#171/#173–#185/#191/#193–#195/#210/#220/#248/#288/#308/#314/#318/#322/#324/#326/#328/#330/#332; #252/#262 activity-index/level aliases; tip classic #334) |
| pdoom.ai | SPA shell | SPA shell | Sci-fi countdown + keyword stuffing | none | none | SPA shell |
| takeofftracker.com | none | none | “AGI Metrics Dashboard” | none | none | none |

### Resolved from COMPETITIVE.md §0.1

pizzint’s `/news-sitemap.xml` flaps **0↔14** (2026-10-16T13:25Z). Keep our
rolling news-sitemap full and keyword-rich (local cap **200**; head terms
before topic/pillar slugs; #210/#218 tip keyword merge; #212 Fable + #214
ChatGPT Voice + #216 MAI-Base + #222 Muse Spark + #224 Tencent Cloud + #226
CERT-In + #228 Flash + #231 Super VL + #234 Bolt + #236 DeepSeek V4 Pro +
#238 Qwen3.8 + #241 Airship + #250 ModelSphere + #256 Krea / Krea 3 + #258
Flux 3 + #260 Together AI + #267 Terafab + #269 Cohere + #271 Accenture +
#273 G7 + #275 Bee Frontier / Bee Eclipse + #277 Surface Laptop Ultra + #279
RTX Spark + #282 Qwen 4 Max + #290 Qwen3.8-27B needles). Entity model hubs **#245**/**#246** add
`/model/muse-spark.html` + `/model/fable.html` (lead **6,684**; Publish
preserve **#248**). Typed-guess **#262** tip prose still intact after
**#264**/`c1f9a74` beside **#252**. Dual head-term home title **#296** tip
**ok** after `a00cfbc` (index + level today middot). Multi-title **#298** Vercel tip
**ok** (2/2 after `2d76065`); **#294** Mac Studio singular tip
**ok**; **#292** Mac Studios **ok**; Qwen3.8-27B **ok**; Beam **ok**; RTX Spark **ok**; CRWV **#288** **ok**.
Hold doorway on product keywords beyond **#380** Allied Universal. SoftBank lab
FAQ #374 gates Allied; SoftBank already keywords M&A — companion fills the
company surface under the 12-cap.
Warsh person / Glimpse (1 title) / Nova Scotia geography / ChatGPT Chrome (0 contiguous / 1 proximity) /
ECDSA niche / Beijing AI-exports topic / CoreWeave stock (already gated) /
Nvidia RTX Spark long-form (RTX Spark already keyed) / Tesla Roadster (Roadster + Flying Roadster keyed) /
NovaCore · AIBotics thin wires / bare Wall Street · AI Jitters noise / bare Allied shorthand refused.
Trends quiet (`ai_related_total` **0**). Unbranded head-term SERP still misses siren (GSC #11).
**#381** after **#380** tip `1f0c694` (+ heal after newsroom wipe) + IndexNow **200**: Allied Universal **3/3** CDN clear; Flying Roadster + Starshield + SoftBank + Waymo FAQs still **ok**; lead **6,700**; pizzint news **14** contested.
**#380** Allied Universal tip `1f0c694` CDN clear (news:keywords probes **ok**; 3 titles; FAQ #374 gates SoftBank lab; hold bare Allied / ECDSA / EverWind / Warsh / Nudify / VCI).
**#379** after **#378** tip `ae370bf` (+ heal after newsroom wipe) + IndexNow **200**: Tesla Flying Roadster FAQ CDN clear; Starshield + SoftBank + Waymo FAQs still **ok**; lead **6,700**; pizzint news **14**.
**#378** Tesla Flying Roadster companion FAQ tip `ae370bf` (lab + agents + Trends; keywords #354 already keyed; FSD FAQ #185 only — parallel Samsung glasses #195; hold ECDSA / EverWind / Warsh / Nudify / VCI / Replit no-lab).
**#377** after **#376** tip `f88b5bf` + IndexNow **200**: SpaceX Starshield FAQ CDN clear; SoftBank + Waymo FAQs still **ok**; lead **6,698**.
**#376** SpaceX / Starshield FAQ tip `f88b5bf` (lab + agents + Trends; 4 titles; hold ECDSA / EverWind / Warsh / Nudify / VCI / Replit no-lab).
**#375** after **#374** tip `73c0d8d` + IndexNow **200**: SoftBank Allied FAQ CDN clear (heal after newsroom wipe); Waymo FAQ still **ok**; lead **6,698**; pizzint news **14** contested.
**#374** SoftBank / Allied Universal FAQ tip `73c0d8d` (lab + agents + Trends; SoftBank lab unlocks Allied; hold ECDSA / EverWind / Warsh / Nudify / VCI).
**#373** after **#372** tip `aebde7c` + IndexNow **200**: Waymo Canada / Toronto FAQ CDN clear; NIST **2/2**; Canadian FAQ still **ok**; lead **6,701**.
**#372** Waymo Canada / Toronto robotaxi FAQ tip `aebde7c` (lab + agents + Trends; 3 titles; hold Allied / EverWind / Warsh / Nudify).
**#371** after **#370** tip `c185d41` + IndexNow **200**: NIST **2/2** CDN clear; Canadian FAQ still **ok**; lead **6,700**.
**#370** NIST tip `c185d41` CDN clear (news:keywords probes **ok**; 2 titles; FAQ #368/#362 gate Anthropic lab; hold ECDSA niche).
**#369** after **#368** tip `79436a7` + IndexNow **200**: Canadian data centres FAQ CDN clear; lead **6,701**.
**#368** Anthropic Canadian data-centre FAQ tip `79436a7` (lab + agents + Trends; hold Nova Scotia geography keywords).
**#367** after **#366** merge + IndexNow **200**: AI safety bill FAQ tip still **ok**; M5 Max **1/1**; pizzint news **14** contested; lead **6,701**.
**#366** Publish preserve Anthropic AI safety bill FAQ + agent/Trends needles (newsroom wipe fix for #362).
**#365** after **#364** tip `1e5e083` + FAQ restore `a226548` + IndexNow **200**: M5 Max **1/1** + AI safety bill FAQ **ok**; lead **6,701**.
**#364** M5 Max tip `1e5e083` CDN clear (news:keywords probes **ok**; 1 title in newest-200).
**#363** after **#362** tip + IndexNow **200**: AI safety bill FAQ CDN clear; lead **6,701**.
**#362** Anthropic AI safety bill FAQ restored tip `a226548` after newsroom wipe (lab + agents + Trends).
**#361** after **#360** tip `a551451` + IndexNow **200**: Amazon Web Services **2/2** CDN clear; lead **6,701**.
**#360** Amazon Web Services tip `a551451` CDN clear (news:keywords probes **ok**).
**#359** after **#358** tip `3ee462b` + IndexNow **200**: AI safety bill **3/3** CDN clear; lead **6,701**.
**#358** AI safety bill tip `3ee462b` CDN clear (news:keywords probes **ok**).
**#356** Bee AI news:keywords shipping (2 titles; Amazon Bee FAQ #167 gates lab).
**#355** after **#354** tip `147818e` + IndexNow **200**: Flying Roadster **3/3** CDN clear; lead **6,700**.
**#354** Flying Roadster tip `147818e` CDN clear (news:keywords probes **ok**).
**#353** after **#352** tip `038df3f` + IndexNow **200**: Anthropic IPO **3/3** CDN clear; lead **6,698**.
**#352** Anthropic IPO tip `038df3f` CDN clear (news:keywords probes **ok**).
**#351** after **#350** tip `c3e7e10` + IndexNow **200**: PS5s **1/1** CDN clear; lead **6,698**.
**#350** PS5s tip `c3e7e10` CDN clear (news:keywords probes **ok**).
**#349** after **#348** tip `f06d9d9` + IndexNow **200**: Xing 4.0 29B-A4B **2/2** CDN clear; lead **6,700**.
**#348** Xing 4.0 29B-A4B tip `f06d9d9` CDN clear (news:keywords probes **ok**).
**#347** after **#346** tip `df3ea52` + IndexNow **200**: Qwen3.8-Max **2/2** CDN clear; lead **6,700**.
**#346** Qwen3.8-Max tip `df3ea52` CDN clear (news:keywords probes **ok**).
**#345** after **#344** tip `5b917ab` + IndexNow **200**: Claude Mythos 5 / Mythos 5 **3/3** CDN clear; lead **6,700**.
**#344** Claude Mythos 5 tip `5b917ab` CDN clear (re-heal after newsroom wipe; probes **ok**).
**#343** after **#342** tip `c89502b` + IndexNow **200**: Siri **3/3** CDN clear; lead **6,700**.
**#342** Siri tip `c89502b` CDN clear (news:keywords probes **ok**).
**#341** after **#340** tip `64ade11` + IndexNow **200**: Replit **2/2** CDN clear; lead **6,700**.
**#340** Replit tip `64ade11` CDN clear (news:keywords probes **ok**).
**#338** Xing / Xing 4.0 tip `cd2fa2a` CDN clear (news:keywords probes **ok**).
**#336** GPT-Live-1 / Kling tip `1f4421b` CDN clear (news:keywords probes **ok**).
**#334** classic tip `23e984e` CDN clear (robots/feeds/sitemaps/now **yes**).
**#332** free-tools classic tip
`f966fbd` CDN clear (**ok**). **#330** discovery JSON classic tip `9698a13` CDN
clear (agents.json / openapi / api/index **yes**). **#328** discovery classic tip
`2ce33d1` CDN clear (agents.txt / ai.txt / api-catalog **yes**). **#326** skill.md
classic tip `882440a` CDN clear (**ok**); **#324** classic agent-map tip
`7289f37` CDN clear (agents.md / llms.txt **yes**); **#322** classic sitemap tip
`376fa9f` CDN clear (loc **ok**); **#320** PS5 tip
`7988c6e` CDN clear (lag **0**); **#316** tip `fd9219b` CDN clear;
**#314** restore on main; **#310** Astra tip still **ok**; **#308** H1 tip still **ok**;
**#300** title-heal on main keeps probe keywords across newsroom Publish
tip races. Outrank free-tool URLs (`/verify.html`, `/free-tools.html` + classic
row) plus `robots.txt` / `feed.xml` / `now.md` / `api/now.txt` discovery tips
(with classic **#334**) are the citation/LLM-mention lever beyond URL count. Blocker for organic proof
remains FINDABILITY **#11** (GSC).

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
