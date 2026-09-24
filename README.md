# DOOMCON

**A real-time index of AI activity tempo, computed from public data by open code.**

Five pillars, one 0–100 score, one level from DOOMCON 5 (DORMANT) to DOOMCON 1
(UNPRECEDENTED). Every number is recomputable by a stranger.

> We don't know anything. We just count.

---

## What this is

Every other live AI-risk index — DoomBench, IMD's AI Safety Clock,
skynetcountdown, takeofftracker, pdoom.ai — scores by human or model judgement.
None of them can be independently recomputed.

This one can. Clone the repo, run two commands, compare your number to the
published one. If they disagree, that's a bug.

It measures **observable activity tempo relative to the field's own history** —
not probability of harm, not a forecast. The full formula, every constant, and an
honest "how this index could mislead you" section are in
[docs/METHODOLOGY.md](docs/METHODOLOGY.md).

## Run it

**No Node installation required** — everything runs in Docker:

```bash
docker run --rm --network host -v "$PWD":/app -w /app node:20-alpine node collector/collect.mjs
```

| Step | Command | Writes |
|---|---|---|
| Build the frozen reference | `node collector/backfill.mjs` | `data/reference.json` |
| Collect live readings | `node collector/collect.mjs` | `data/raw/<iso>.json` |
| Score it | `node collector/engine.mjs` | `data/state.json`, `data/receipts/`, `data/history.ndjson` |
| Render share cards | `node collector/card.mjs` | `public/cards/` |
| Generate post text | `node collector/posts.mjs` | `data/posts.json` |
| Build the site | `node site/build.mjs` | `public/` |
| Build the posting console | `node site/post-sheet.mjs` | `public/post-sheet.html` |

Prefix each with the Docker wrapper above. Backfill runs **once** — the reference
distribution is frozen on purpose and must not be regenerated casually.

## Architecture

```
collector/fetch.mjs        shared HTTP: timeout, retry, User-Agent, structured errors
collector/sources/*.mjs    one adapter per source — drop a file in, it is discovered
collector/collect.mjs      runs every adapter concurrently -> data/raw/
collector/engine.mjs       normalise -> smooth -> compose -> level, with anti-flap
collector/receipts.mjs     hash-chained, append-only audit trail
collector/card.mjs         share cards as dependency-free SVG
collector/posts.mjs        post text, with URL and future-tense guards
site/build.mjs             static site generator -> public/
```

**Zero npm dependencies.** Node 20 built-ins only. There is no `node_modules`,
no lockfile, and no supply chain.

## Adding a source

Drop a file in `collector/sources/`. It is discovered automatically.

```js
export default {
  id: 'my-source',
  pillar: 'capability',          // capability | compute | attention | governance | markets
  label: 'Human-readable name',
  async collect(fetchJson) {
    const data = await fetchJson('https://…')
    return { value: 42, unit: 'things/day', meta: { … } }
  },
}
```

Three rules: `value` is a finite number, **higher always means more activity**
(negate inside the adapter if your source points the other way), and **throw on
failure** — never return a fallback. A dark source is a first-class state.

A new source does not enter the index until it is added to the frozen reference
distribution, so adding one cannot retroactively move history.

## Data and API

| Path | What |
|---|---|
| `/api/state.json` | Current score, level, pillars, per-source freshness |
| `/api/history.json` | Scored observations over time |
| `/api/receipts/<id>.json` | One hash-chained receipt |
| `/embed.html` | Embeddable widget |
| `/feed.xml` | RSS of index moves |

All CC-BY 4.0. Attribution appreciated, not enforced.

## Verifying a receipt

Every scored observation carries every input exactly as fetched, plus the hash of
the previous receipt. `verifyChain()` in `collector/receipts.mjs` walks the chain
and re-derives every hash.

Note that arXiv counts are **not** immutable — papers get cross-listed after
publication — so we snapshot the value and the query string at fetch time and
never recompute history. A receipt records what we saw, not what the source says
today.

## Credits

Historical training-compute and notable-model data from
[Epoch AI](https://epoch.ai/), CC-BY 4.0.

Concept debt to [pizzint.watch](https://www.pizzint.watch/), whose Pentagon Pizza
Index proved that a single named scalar plus a distribution channel beats a
better dashboard with neither. The full teardown is in
[docs/TEARDOWN.md](docs/TEARDOWN.md).

## Licence

Code MIT. Data and index values CC-BY 4.0.
