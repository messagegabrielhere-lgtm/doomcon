# collector/

**What this is:** the heart of SIREN. It fetches public data, scores a 0–100
composite, writes receipts, and prepares share cards / post text.

**Novice map (start here)**

| File / folder | Job |
|---|---|
| `fetch.mjs` | Shared HTTP (timeout, retry, User-Agent). Almost all network calls go through here. |
| `sources/` | One small adapter per data source for the five pillars |
| `collect.mjs` | Runs every source → `data/raw/<timestamp>.json` |
| `engine.mjs` | Turns raw readings into score + level (with anti-flap logic) |
| `receipts.mjs` | Hash-chained audit trail so strangers can verify a reading |
| `backfill.mjs` | Builds the frozen historical reference (**run rarely**) |
| `card.mjs` / `cards/` | Share-card images |
| `posts.mjs` | Draft post text (bans future tense and bare URLs for X) |
| `post-daily.mjs` / `post-x.mjs` / `post-bluesky.mjs` | Optional auto-poster (needs secrets) |

**Other collectors in this folder** (news, race, world, balance, …) feed
extra site sections. They still write under `data/` and are wired by
`collect.yml` / `news-fast.yml`.

**Rules**

- No npm dependencies in this tree.
- Higher source values always mean “more activity”.
- Throw on failure — never invent a fallback number.

See [`docs/METHODOLOGY.md`](../docs/METHODOLOGY.md) and
[`docs/CONTRACT.md`](../docs/CONTRACT.md).
