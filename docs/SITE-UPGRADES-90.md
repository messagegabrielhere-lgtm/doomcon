# Site upgrades — next 90 days

**Status:** living plan · written **2026-10-08** · window **Oct → Dec 2026**  
**Audience:** ops + whoever merges site PRs  
**Supersedes the calendar in** `docs/GROWTH.md` §90-day and `docs/COMPETITIVE.md` §7 for anything past 2026-10-08. Those files stay as research; this file is the queue.

Live: https://messagegabrielhere-lgtm.github.io/doomcon/  
Brand: **SIREN** (repo + Pages path still `doomcon`).

---

## 0. Baseline (measured 2026-10-08)

| Signal | Live state | Why it matters |
|---|---|---|
| Index | Level 4 · score ~48 · receipt chain present | Product works |
| Sitemap | ~480 URLs | Up from 11 in the Sept competitive audit — URL count is no longer the emergency |
| Badge / embed | `/badge.svg`, `/embed.html` HTTP 200 | Share loop exists; placement is the gap |
| News sitemap | `news-sitemap.xml` **200** (remeasure 2026-10-09) | Keep the rolling ~48h window fed; pizzint's is near-empty |
| OpenAPI | `openapi.json` **200** (remeasure 2026-10-09) | Documented; keep in sync with `api/index.json` |
| Newsletter / tips / ads | all `null` in `site/monetize.mjs` | Retention email and revenue switches are code-ready, operator-off |
| Custom domain | still `github.io/doomcon` | Caps sayability and press |
| X | handle set (`@SIRENutf6`); daily post pipeline exists | Automation secrets still the bottleneck |
| Data issue | [#34](https://github.com/messagegabrielhere-lgtm/doomcon/issues/34) “Missing new data” | Trust surface — freshness beats new rooms |
| Open site PRs | ~15 drafts (SEO, homepage, compliance, news refresh, Slack alerts, SEC source) | Month 1 is mostly **merge + verify**, not invent |

### Already shipped (do not rebuild)

Number-first home (v2), badge + embed, move pages + NewsArticle schema, level-change feed (`feed-level.xml`), pretty URL aliases (in flight / merged variously), compliance gates, health API, 14 source adapters, arena / watts / race / newsroom side rooms, news sitemap + OpenAPI + receipt index, `/nothing` skeptic counter (pizzint NEH riff), Plausible (or equivalent) path in brand/layout history.

### Jobs this plan serves (unchanged from GROWTH)

1. **First five seconds land** — one number, one claim, honest status.
2. **The page reproduces itself** — embeds, cards, citations, API.
3. **A reason to come back** — level-change alerts, digest, “since you looked”.

Anything that does not serve one of those three is a side room, not a site upgrade.

---

## Month 1 — Oct · Merge, honesty, discoverability

**Theme:** stop leaking trust, land the open SEO/homepage work, make freshness and search surfaces real.

### 1A. Drain the open PR queue (highest leverage)

Merge in this order when green; rebase rather than reinvent:

| Priority | PR | Site effect |
|---|---|---|
| P0 | [#31](https://github.com/messagegabrielhere-lgtm/doomcon/pull/31) SEC User-Agent / Compute pillar | Dark pillar → live reading |
| P0 | [#33](https://github.com/messagegabrielhere-lgtm/doomcon/pull/33) faster site updates | News freshness; addresses [#34](https://github.com/messagegabrielhere-lgtm/doomcon/issues/34) |
| P0 | [#29](https://github.com/messagegabrielhere-lgtm/doomcon/pull/29) homepage retention UX | Plain read, scale rail, reuse/cite/embed block |
| P1 | [#25](https://github.com/messagegabrielhere-lgtm/doomcon/pull/25) / [#28](https://github.com/messagegabrielhere-lgtm/doomcon/pull/28) / [#26](https://github.com/messagegabrielhere-lgtm/doomcon/pull/26) SEO + competitor gaps | Titles, structured data, news sitemap, facets, OpenAPI |
| P1 | [#37](https://github.com/messagegabrielhere-lgtm/doomcon/pull/37) newsroom refresh | Aggregation quality |
| P1 | [#27](https://github.com/messagegabrielhere-lgtm/doomcon/pull/27) / [#23](https://github.com/messagegabrielhere-lgtm/doomcon/pull/23) / [#32](https://github.com/messagegabrielhere-lgtm/doomcon/pull/32) compliance | Satire disclaimers, legal posture, audit cadence |
| P2 | [#22](https://github.com/messagegabrielhere-lgtm/doomcon/pull/22) page polish · [#21](https://github.com/messagegabrielhere-lgtm/doomcon/pull/21) markets · [#30](https://github.com/messagegabrielhere-lgtm/doomcon/pull/30) Slack alerts | Chrome, Markets, ops telemetry |
| P2 | docs PRs (#24, #35, #36) | Operator docs; merge when they do not fight brand wording |

*Done when:* Compute is not dark; homepage fold matches the retention PR; `news-sitemap.xml` and `openapi.json` return 200; compliance selftest green on `main`.

### 1B. Instrument so the rest of the quarter is not faith

Define Plausible (or current analytics) **goals** before shipping more UX:

| Goal | Proxy |
|---|---|
| Five-second land | scroll past hero **or** click one evidence link |
| Embed loop | distinct referers hitting `badge.svg` |
| Alert interest | clicks on level-change / subscribe affordances |
| Cite reuse | copy events on cite block (if trackable) or outbound API hits |

Without these, Month 2/3 priorities stay opinion.

### 1C. Operator handoffs (not code, but block site upgrades)

| Action | Owner | Unblocks |
|---|---|---|
| Register short domain + set `DOMAIN` / `CANONICAL_URL` in `site/brand.mjs` | Bob | Press, cards, sayability |
| Buttondown or beehiiv → fill `site/monetize.mjs` newsletter | Bob | Email retention |
| X developer app + credits + repo secrets for `post-daily` | Bob | Automated calm-day posts |
| Confirm Search Console property for the live host | Bob | Indexed-page truth vs sitemap vanity |

### 1D. Explicit Month-1 code if PRs stall

If SEO PRs stay draft, ship the minimum yourselves:

1. Emit `public/news-sitemap.xml` from existing item/move pages (rolling ~48h window).
2. Emit `public/openapi.json` describing `/api/state.json`, `/api/history.json`, receipts.
3. Receipt index at `/api/receipts/` (directory listing or static index) — today individual receipts work, the index 404s.
4. Collapse nav mental model on home: Index · Evidence · Method (labels can stay room names underneath).

**Month-1 success criteria**

- Honest source string on home + embed matches `api/health.json`.
- Sitemap still climbing; news sitemap live.
- [#34](https://github.com/messagegabrielhere-lgtm/doomcon/issues/34) closable or explained by known Actions cron drift.
- At least one referring domain from a badge/embed placement (even self-placed in a README elsewhere counts as a dry run).

---

## Month 2 — Nov · Retention and distribution

**Theme:** strangers become returners; the number leaves the site without you.

### 2A. Retention stack

| Upgrade | Mechanism | Acceptance |
|---|---|---|
| Email capture live | One field, level-change promise (“maybe six emails a year”) | `newsletterBox` renders; first subscriber > 0 |
| Level-change email trigger | Same gate as `feed-level.xml` / anti-flap | Email within a short window of a real level move |
| Weekly digest mail | Reuse `/digest.html` corroboration rules | One send/week; unsubscribe works |
| Promote “Since you last looked” | Move above the fold / former false status rail | Visible without scroll on desktop |
| Browser watchlist | localStorage labs / pillars / gates, no login | Survives reload; no server PII |
| Visible RSS | `<link rel="alternate">` everywhere + on-page subscribe | Feed discovery without reading source |

### 2B. Acquisition that compounds

| Upgrade | Mechanism | Acceptance |
|---|---|---|
| Widget placement campaign | 10 asks: AI newsletters, dashboards, awesome-lists | ≥5 live embeds or documented refusals |
| Faceted entity URLs | `/pillar/…`, `/lab/…` if not merged in Month 1 | Internal links from item pages |
| Move-page rate | Fix observation cadence / substantive gate input, not templates | Steady indexable `/moves/` growth |
| Mobile fold | Numeral, claim, sparkline, 3 movers, defer rest | Lighthouse mobile; no clipped score behind tab bar |
| Copy-link on hero + cards | Ranker-weighted share path | One-tap copy of canonical URL |

### 2C. Soft monetize (optional, SEO-safe)

Flip only after retention email works:

1. Tip jar URL in `monetize.mjs`.
2. One EthicalAds/Carbon slot on long reading pages (**never** homepage).
3. Leave sponsor null until a real buyer; house line already sells the slot.

**Month-2 success criteria**

- Returning-visitor share measurable and non-zero.
- Subscriber count > 0; at least one level-change mail sent on a real event (or dry-run logged).
- ≥5 external embed/badge placements **or** ≥10 referring domains.
- Mobile completion of the fold without horizontal nav chaos.

---

## Month 3 — Dec · Depth, press, and compounding surfaces

**Theme:** the instrument is quotable; lore and API earn links; no new gimmicks.

### 3A. Quotability

| Upgrade | Why |
|---|---|
| Stable “cite this” block on every move + home | Date, score, level, receipt hash — thirty-second reuse |
| Versioned API docs page (human) next to OpenAPI | Journalists and tools |
| Show HN / method-first launch once history is thick enough | Reproducibility claim, not doom |
| Condensed lore band on home (sourced AI history) | Tradition, not joke — competitive §4.4 |
| Head-term titles that stay honest | e.g. activity-tempo / “AI risk level today” only where content answers |

### 3B. Instrument integrity (site-visible)

| Upgrade | Why |
|---|---|
| Dark sources: fix or remove from “reporting” counts | Honesty is the brand |
| BLISS: print a real number or demote from chrome | Two blank scalars kill the headline |
| Prediction / “call next month’s level” (optional) | Strongest retention loop left; public resolution = content event |
| No new main-index sources until dark pipes are live or deleted | COMPETITIVE non-goal still holds |

### 3C. Infra only if distribution demands it

Stay on GitHub Actions + Pages until one of these is true:

- Cron drift regularly breaks “fresh” for readers (not just [#34] complaints).
- Need sub-minute news for a named partner embed.
- Custom domain + email + API traffic needs headers Pages cannot give.

Then: paid scheduler for collect, or a tiny edge poll — not a rewrite.

**Month-3 success criteria**

- Outside citation of a move permalink or `state.json` (manual tally).
- Indexed pages in Search Console trending with sitemap (not sitemap-only vanity).
- Level-change open-rate usable (≥~20% or document why the promise is wrong).
- Domain either live with HTTPS enforced, or a dated decision to stay on `github.io` for Q1.

---

## Sequence at a glance

| Window | Ship | Should move |
|---|---|---|
| **Oct** | Merge P0/P1 site PRs · analytics goals · news sitemap + OpenAPI · domain/newsletter/X secrets handoff · fix Compute + freshness | Trust, search surface, PR debt |
| **Nov** | Email + level alerts · digest · watchlist · mobile fold · widget placement · copy-link · optional tip/ad | Return visits, embeds, subscribers |
| **Dec** | Cite/API docs · lore band · source honesty pass · optional monthly prediction · press/Show HN when ready | Citations, index quality, quotability |

---

## Deliberately not in these 90 days

Carried forward from COMPETITIVE §7 and still right:

- No second headline scalar until SIREN is the number people quote.
- No token, no AdSense, no runtime translation layer.
- No short-form video factory before the text/card loop works.
- No game/arena feature work as “site upgrades” — arena stays a side project (`docs/ARENA.md`).
- No wholesale framework migration (keep zero-dep static generator).
- No prediction markets as the homepage hero.

---

## How to use this file

1. **Weekly:** pick the top unfinished row in the current month; open or merge one PR.
2. **When a GROWTH/COMPETITIVE item ships:** tick it here, leave research docs alone.
3. **When data disagrees with priority:** analytics goals win over this file — edit the sequence, do not ignore the numbers.
4. **Operator blockers** (domain, newsletter IDs, X secrets) sit in Month 1C until done; code cannot substitute.

### Related docs

| Doc | Role |
|---|---|
| `docs/GROWTH.md` | UX hypotheses and nine moves |
| `docs/COMPETITIVE.md` | Scoreboard vs pizzint; Phase 0–4 research |
| `docs/VIRAL.md` / `docs/X-STRATEGY.md` | Distribution, not site HTML |
| `docs/MONETIZE.md` | Switch-on instructions |
| `docs/AUTOUPDATE.md` | Collect / news / poller layers |
| `GO-LIVE.md` | Domain DNS, X posting rules |

---

## Falsifiers (stop or reorder if true)

1. **Traffic is already not the bottleneck** — if absolute visits are tiny and embeds do not move them, cut Month-2 placement theater and pour into X + one press piece.
2. **Google News is dead for this category** — if competitor news sitemaps stay frozen and our news sitemap gains zero impressions after a full crawl cycle, pivot facets to evergreen entity pages only.
3. **Level-change email does not reopen tabs** — if open-with-visit < useful threshold after several real alerts, change the promise (digest-first) rather than adding push.
4. **Sources stay dark** — if Compute/SEC and peers cannot stay green, shrink the advertised source count and pause new rooms until the instrument is honest.
