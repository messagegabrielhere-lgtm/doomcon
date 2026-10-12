# Competitive — SIREN vs Ainnect

Measured **2026-10-12** against [ainnect.com](https://ainnect.com/) (ZeroGantry's
daily AI dashboard: news, market mood, model boards, coding-agents hub, MCP hub,
archive, RSS, `llms.txt`).

Goal: close the surfaces where Ainnect won on *product shape* without borrowing
claims SIREN cannot support (VOICE.md / CONTRACT.md). Every new figure stays
recomputable, lexicon- or source-linked, and dark when the upstream fails.

---

## Scoreboard

| Surface | Ainnect | SIREN before | SIREN after this pass |
|---|---|---|---|
| Daily dashboard (mood + boards + agents) | Homepage swipe deck | Digest / news only | **`/today.html`** |
| Headline tone by company (−100…100) | Market mood | Harm/benefit lexicon on `/balance` only | **`/mood.html`** + `/api/mood.json` |
| Model boards (Elo / usage / video) | `/leaderboards/` | Lab race odds only (`/race`) | **`/boards.html`** (OpenRouter, LMArena order, HF video) |
| Coding agents hub | `/agents/` + entity pages | Takeover Watch PR counts; welcome `/agents.html` | **`/coding-agents.html`** + per-agent pages |
| MCP hub | `/mcp/` + entity pages | Our own MCP server card only | **`/mcp-hub.html`** + per-server pages |
| Daily archive | `/archive/YYYY-MM-DD` | Newsroom + moves archive | Already covered (news / moves); not duplicated |
| RSS / `llms.txt` | Yes | Yes | Extended with the new JSON endpoints |

What we still refuse: inventing Elo when LMArena HTML omits it, imputing stars
for a dark GitHub row, or treating mood as company performance.

---

## What shipped

| Path | Collector | Notes |
|---|---|---|
| `data/mood.json` | `collector/mood.mjs` | Offline from `news.json`. Published positive/negative/clickbait lists. |
| `data/boards.json` | `collector/boards.mjs` | OpenRouter rankings table, LMArena ItemList (+ Elo when present), HF video downloads. |
| `data/coding-agents.json` | `collector/coding-agents.mjs` | Fixed agent + MCP rosters via GitHub API. Health = release/push recency. |
| `/today.html` | `site/templates/todayPage.mjs` | One-page glance. |
| `/mood.html` | `site/templates/moodPage.mjs` | Full company board + lexicons. |
| `/boards.html` | `site/templates/boardsPage.mjs` | Three boards with source links. |
| `/coding-agents.html`, `/mcp-hub.html`, entity pages | `site/templates/codingAgentsPage.mjs` | Hubs + deep links. |

Workflow: `collect.yml` runs mood → boards → coding-agents before digest/build.
`GITHUB_TOKEN` (Actions default) raises the GitHub budget for the roster fetch.

---

## Honesty rules carried into the new rooms

1. **Mood matches words, not meaning** — same posture as `/balance`.
2. **Boards republish; they do not invent** — a parse failure is `ok: false`.
3. **Agent/MCP health is cadence, not a review** — printed on every hub and entity page.
4. **Missing ≠ zero** — companies with no headlines stay off the mood board; dark GitHub rows keep `stars: null`.
