# Backlink queue

Updated 2026-10-31. Companion to `OUTREACH.md` (same rules: no bought links,
no link swaps, one honest pitch per target, refresh every number from the
live site before sending). Everything here is drafted and **unsent**: each
item is one tap or one PR from the operator's own accounts.

Always say "siren.watch" or "SIREN AI activity index", never bare "SIREN"
(brand collision with a crypto token; see OUTREACH §0a).

Numbers below are from `/reports/2026-10.html` as of 2026-10-31 (month to
date). After 1 Nov the October report is final; re-copy the figures.

Status key: `[ ]` not sent · `[s]` sent · `[L]` link live · `[x]` declined

---

## A. Shipped on the site (done, nothing to send)

- `[L]` **Monthly reports** — `/reports/` and `/reports/YYYY-MM.html`. Stable
  URL, quotable one-sentence findings, cite line, CC BY 4.0, Dataset JSON-LD,
  in sitemap, linked from the press kit. This is the asset every pitch below
  points at.
- `[L]` **Embed snippet now carries a real backlink.** Links inside an iframe
  do not count for the host page; the copy-paste snippet now adds a plain
  "AI activity index by SIREN" link under the iframe.
- `[L]` **Old github.io URLs.** The build publishes a CNAME, so GitHub Pages
  301s `messagegabrielhere-lgtm.github.io/doomcon/*` to `siren.watch/*`.
  Spot-check one old URL in a browser once.
- `[L]` Thin pages (receipts, embed, rows) already ship `noindex,follow`.

## B. Directories and lists (highest yield, lowest effort)

Each is one GitHub PR from the Siren Labs account. Read the list's
CONTRIBUTING first; one entry per PR; title format `Add SIREN API`.

1. `[ ]` **public-apis (marcelscruz/public-apis)** — accepts custom-domain
   APIs (rejects github.io, so this only works now that we are on siren.watch).
   Category: *Open Data* (or *Science & Math* if Open Data is absent).
   ```
   | [SIREN](https://siren.watch/agents.html) | Hourly AI activity index (0–100) from arXiv, GitHub, Hugging Face, SEC, Federal Register and prediction markets, with verifiable receipts | No | Yes | Yes |
   ```
2. `[ ]` **public-apis/public-apis** (the big one) — same row, same category.
   Slow to merge; submit anyway.
3. `[ ]` **APIs.guru** — submit `https://siren.watch/openapi.json` through
   their "Add API" form. Gets the spec into every client generator that reads
   their directory.
4. `[ ]` **punkpeye/awesome-mcp-servers** — the agent kit is a zero-dependency
   MCP server. Pick the closest data/news/research category. Entry:
   ```
   - [messagegabrielhere-lgtm/doomcon (agent-kit)](https://github.com/messagegabrielhere-lgtm/doomcon/tree/main/agent-kit) 📇 ☁️ - Read and cite the SIREN AI activity index: current level, history, news, receipt verification. No key.
   ```
   Also list it on Glama / mcp.so / Smithery (each has a submit form; same text).
5. `[ ]` **jivoi/awesome-osint** (29k stars) — section closest to
   *Threat Intelligence* / *Data and Statistics*. Angle: the AI-world
   counterpart to the Pentagon Pizza Index, built only from public data.
   ```
   * [SIREN](https://siren.watch) - Hourly open-source index of AI activity (papers, releases, filings, regulation, prediction markets) with hash-chained, browser-verifiable readings.
   ```
6. `[ ]` **ARPSyndicate/awesome-intelligence** — same text; it is a JSON file
   (`intel.json`), tag `geopolitics` / `ai`.
7. `[ ]` **AlternativeTo** — list siren.watch as an alternative to PizzINT and
   to the IMD AI Safety Clock. Free account, ~5 min.
8. `[ ]` **pm.wiki** — prediction-market ecosystem directory; it already lists
   Pizzint Watch as an analytics tool. Submit siren.watch (the race page shows
   Polymarket / Kalshi / Manifold prices).

## C. Roundups and resource pages that already cover our category

Pitch the author one specific, checkable addition. Template at the bottom.

9. `[ ]` **Longterm Wiki** (longtermwiki.com) — catalogs AI-risk resources,
   including the AGI Timelines Dashboard and the IMD AI Safety Clock. Suggest
   siren.watch as a resource on its AI-timelines / AI-risk-trackers pages.
   Hook: the only tracker whose readings a reader can re-verify.
10. `[ ]` **GLOBAÏA AI observatory** (globaia.org/ai-risks) — compiles AI risk
    series and dashboards. Offer `/api/history.json` as a monthly-refreshable
    series of public AI activity.
11. `[ ]` **AISafety.com** — volunteer-run resource hub (field map, tools,
    newsletters) with a public Discord. Ask to add siren.watch under
    tools/dashboards.
12. `[ ]` **EA Forum "List of AI safety newsletters and other resources"** —
    comment with siren.watch under "ways to keep up with AI developments"
    (the post explicitly asks for missing resources).
13. `[ ]` **OSINT writers who covered the pizza index** — Fivecast blog
    ("modern OSINT signals"), Fullintel ("Pentagon Pizza Index: Is It Real?"),
    Modern Diplomacy (low-tech OSINT case study). Angle: same idea, pointed at
    AI, but every input is a public count and every reading has a receipt.
    Offer one sentence they can add, plus the `/vs/pizzint.html` page.

## D. Newsletters (tips forms, no cold email needed)

14. `[ ]` **AGI Safety Weekly** — has a public tips form (linked from
    substack.com/@agisafetyweekly). Send the October report.
15. `[ ]` **Transformer (Shakeel Hashim)**, **AI Safety Newsletter (CAIS)**,
    **Import AI** — reply to an issue with the October report's single most
    interesting finding. One line, one link.
16. `[ ]` **Doom Debates (Liron Shapira)** — episode on the Doomsday Clock
    with Daniel Holz. Pitch: "a clock with math behind it that measures tempo,
    not doom" — good guest/segment angle; link `/ai-doomsday-clock.html`.

## E. Journalist requests

17. `[ ]` **Qwoted**, **Source of Sources**, **Featured** — free source
    profiles. Profile name "SIREN AI activity index (siren.watch)". Filter for
    AI, tech policy, data requests. Lead every answer with one number from the
    latest monthly report and link it. Limitation: reporters usually want a
    named human; expect fewer placements under the pseudonym.
18. `[ ]` Log every request answered in the table below so nothing is pitched
    twice.

## F. Launch posts (from OUTREACH.md, still the biggest single spikes)

19. `[ ]` **Show HN** — draft in `OUTREACH.md` §1. Post Tue–Thu ~8–10am ET.
20. `[ ]` **Product Hunt** — free; schedule for a weekday 12:01am PT.
21. `[ ]` **Google Search Console + Bing Webmaster** — OUTREACH §0 steps 1 and 3.
    Not a backlink, but nothing above is measurable without them.

## G. Monthly loop (first week of every month)

1. Open `/reports/<last month>.html` — it is final now.
2. Post the top finding on X with the report link.
3. Send that one finding to every `[s]` newsletter/journalist who replied.
4. Search `"siren.watch"` and `"SIREN AI activity index"` for unlinked
   mentions; ask each author for the link.

---

## Pitch template (roundups, resource pages)

> **Subject:** A verifiable AI activity index for your [page/list name]
>
> Hi [name],
>
> Your [page title] lists [two tools they list]. One that may fit:
> siren.watch, an hourly index of public AI activity (papers, model
> releases, SEC filings, regulation, prediction markets) on a 0–100 scale.
> It measures tempo, not danger, and every reading carries a hash-chained
> receipt a reader can re-check in the browser.
>
> A citable figure: in October 2026 the index averaged 53.0 of 100 and spent
> 89% of readings at level 4 (Routine); Capability was the most active
> pillar. Full month: https://siren.watch/reports/2026-10.html
>
> Suggested line: "[siren.watch](https://siren.watch) – hourly AI activity
> index with verifiable readings and a free JSON API."
>
> Thanks either way,
> SIREN (siren.watch) · contactus@siren.watch

## Log

| Date | Target | What was sent | Reply | Link live? |
|---|---|---|---|---|
| | | | | |
