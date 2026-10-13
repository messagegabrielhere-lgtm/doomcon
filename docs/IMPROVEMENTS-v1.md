# SIREN improvements — plan v1

**Status:** living plan · written **2026-10-13** · version **1.0.0**  
**Audience:** ops + whoever merges collector / site PRs  
**Companion docs:** [`REFERENCE-VERSIONING.md`](REFERENCE-VERSIONING.md) (yardstick cutover), [`SITE-UPGRADES-90.md`](SITE-UPGRADES-90.md) (distribution queue), [`AUTOUPDATE.md`](AUTOUPDATE.md) (cadence), [`METHODOLOGY.md`](METHODOLOGY.md) (biases)

This file turns the 2026-10-13 improvement backlog into a **versioned** queue. Items
preserve SIREN’s core: open method, hash-chained receipts, no-judgment counting,
Node built-ins only in collector / engine / site.

---

## How to read status

| Status | Meaning |
|---|---|
| **shipped** | Live on `main` and documented |
| **partial** | Exists; named gap remains |
| **this PR** | Landed with plan v1.0.0 |
| **next** | Designed; not yet coded |
| **ops** | Needs operator secrets / domain / newsletter, not code |

Promotion of uncalibrated sources into the official score still follows
`REFERENCE-VERSIONING.md` — shadow first, never quiet rebase of v1.

---

## Backlog map (19 asks)

| # | Ask | Status | Where it lives / next action |
|---|---|---|---|
| 1 | Complete Compute & Capital; stop routine DARK | **partial → this PR** | Only `sec-fts` is v1-calibrated. Shadow already scores `stockanalysis` (`data/reference-addenda.json`). **This PR:** add `datacrunch` (GPU cloud spot floor) + surface shadow when official compute is dark. **Next:** 14-day shadow clock on stockanalysis → promote per REFERENCE-VERSIONING; forward-build vastai/datacrunch after 300 days of own readings. |
| 2 | Reduce DEGRADED frequency + graceful missing-source UX | **partial → this PR** | SEC polite retry already shipped. **This PR:** fold impact banner (which pillars dropped, score still from N pillars), health strip above fold, clearer ETA / overdue copy. **Next:** second calibrated compute leg removes most freeze events. |
| 3 | More consistently reporting sources (4–13 of 14) | **this PR** | Add `datacrunch`, `wikipedia-zh` (uncalibrated until addenda). Expand markets allow-list so fewer thin baskets. Reporting count rises; scored count still gated by reference. |
| 4 | Historical charts / sparklines (days–months) | **shipped / partial** | `/charts.html`, home trend 24H·7D·30D·ALL, classic `_charts.mjs`. **Next:** unify live dial with `_gauge.mjs`; deep-link pillar sparks. |
| 5 | Stronger main reading (clock / progress / delta) | **partial → this PR** | Live dial + delta chips exist. **This PR:** larger dial, progress ring by level band, live delta animation, degraded hollow state. Classic already has full `_gauge`. |
| 6 | Expand leader tracking; informative silence | **partial → this PR** | Roster of 20; many `no_line`. **This PR:** add Fei-Fei Li, Aidan Gomez, Clem Delangue; more org feeds; leaders UI explains `no_line` / `no_sources` / `sources_unreachable`. |
| 7 | Optional unconventional signals (toggle, not in score) | **shipped** | Home `#alt` panel + `alternativeSignals()`. **This PR:** include new uncalibrated sources in descriptions. |
| 8 | Strengthen Markets filtering + sources | **partial → this PR** | Shared `matchAiQuestion` (2026-10-08). **This PR:** widen slug allow-list + strong terms (Meta Llama, SSI, Thinking Machines, etc.). Markets remain uncalibrated until forward baseline ≥300 days. |
| 9 | Mobile responsiveness / touch nav | **partial → this PR** | Breakpoints exist; mobile hid reporting chips. **This PR:** keep reporting + status on phone; 44px touch targets on dash buttons; defer below-fold rooms. |
| 10 | One-click verify / receipt flow | **shipped** | `#vfy` + `data-verify-now` already runs in-browser hash check. **This PR:** promote button into hero dash; open details on click. |
| 11 | User-configurable alerts | **shipped / ops** | `/alerts.html`, RSS level/delta/pillar, Blogtrottr recipes, Notification API, X follow. **Ops:** newsletter ID in `monetize.mjs`; X secrets for `post-daily`. |
| 12 | Geographic / linguistic bias | **partial → this PR** | `/bias.html` + METHODOLOGY. **This PR:** `wikipedia-zh` source; home link to bias; document zh series as addendum candidate. |
| 13 | Versioned plan for reference updates + side-by-side | **shipped / this PR** | `REFERENCE-VERSIONING.md` + `/reference-plan.html` already describe shadow side-by-side. **This PR:** this file + home pointer when `state.shadow` is live. |
| 14 | Source health / last-successful-fetch on dashboard | **partial → this PR** | Health card + table. **This PR:** compact strip under hero; last-good UTC always visible when degraded. |
| 15 | What’s Loud: short explanations + top contributors | **partial → this PR** | Pillar blurbs + sources. **This PR:** top live source value + percentile per pillar; optional news movers from `whatMoved`. |
| 16 | Export / embed beyond API | **shipped** | `/export.html`, `/embed.html`, `/badge.svg`, CSV/JSON/TXT. **Next:** placement campaign (ops). |
| 17 | Information hierarchy (score / level / delta first) | **partial → this PR** | Reorder: hero → dash → health strip → moved → trend → loud; defer bosses/labs/video. |
| 18 | Collector schedule frequency / latency clarity | **shipped / this PR** | Hourly full + 15m news (`AUTOUPDATE.md`). Cron lag is platform fact. **This PR:** copy that overdue means scheduler drift, not a broken index; show typical lag + next expected. |
| 19 | Lightweight changelog / “what moved this hour” | **shipped** | `movedPanel` + `/changelog.html`. Keep; do not dual-wire `_whatchanged.mjs` without merging. |

---

## Reference cutover (item 13) — freeze rules restated

1. **`data/reference.json` (v1) never edits.** Receipts name its hash forever.
2. New legs enter **`data/reference-addenda.json`**, scored only as `state.shadow`.
3. Promotion needs: ≥14 days same addenda hash, ≥95% uptime, published
   `docs/reference-diffs/v2.md`, 72h public review, cutover freezes level that hour.
4. Permanent baseline shift: replacement candidate under `<id>@<window-end>`,
   **30 days** official-vs-shadow side-by-side, then same promotion rule.
5. UI may show shadow only labelled (“with proposed calibrations”), never as the
   official number.

Current shadow admission: **stockanalysis**. Forward-build path (own
`data/raw/`): vastai, datacrunch, polymarket, kalshi, manifold, wikipedia-zh.

---

## This PR checklist (v1.0.0 code)

- [x] `docs/IMPROVEMENTS-v1.md` (this file)
- [x] `collector/sources/datacrunch.mjs` — compute redundancy
- [x] `collector/sources/wikipedia-zh.mjs` — non-English attention signal
- [x] Markets matcher allow-list / terms expansion + tests
- [x] Leaders roster + sources + silence copy
- [x] Home: hierarchy, dial polish, health strip, degraded impact, shadow note, mobile
- [x] SIGNAL_DESCRIPTIONS / bias page / METHODOLOGY pointers for new sources

## Explicitly deferred (do not invent here)

- Editing or regenerating `data/reference.json`
- First-party email without newsletter provider ID
- Scraping X for leader statements
- Sub-hourly engine runs (would rewrite receipt / NowCast meaning)
- Promoting markets into the composite before 300 forward days

---

## Version history

| Ver | Date | Note |
|---|---|---|
| 1.0.0 | 2026-10-13 | Initial map of the 19-item backlog; first code tranche |
