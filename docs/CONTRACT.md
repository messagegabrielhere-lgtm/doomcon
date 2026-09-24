# Build contract

Every module in this repo is written against this file. Do not change a shape
here without changing it everywhere. Agents building in parallel rely on it.

## Hard constraints

1. **Zero npm dependencies.** Node 20 built-ins only (`fetch`, `node:fs`,
   `node:crypto`, …). No `package.json` dependencies, no `node_modules`.
   Reason: the operator has no Node installed locally — everything runs as
   `docker run --rm -v "$PWD":/app -w /app node:20-alpine node <script>` —
   and GitHub Actions stays dependency-free and fast.
2. **ES modules, `.mjs` extension** throughout.
3. **No secrets anywhere.** There is no X API in v1. Posting is manual.
4. **Never `Math.random()` or unseeded time in output** beyond the explicit
   `generated_at` field. Output must be reproducible from inputs.
5. **Every network call** goes through `collector/fetch.mjs` (timeout, retry,
   User-Agent, per-source error capture). Never call `fetch()` directly.

## Directory ownership

```
collector/fetch.mjs          shared HTTP helper
collector/sources/*.mjs      one file per source adapter
collector/collect.mjs        runs all adapters -> data/raw/<ts>.json
collector/engine.mjs         raw -> score, level, anti-flap state machine
collector/receipts.mjs       hash-chained receipt writer
collector/posts.mjs          index state -> post text variants
collector/card.mjs           index state -> share-card SVG
site/build.mjs               data/ -> public/  (static site generator)
site/templates/*.mjs         page templates, each exporting render(ctx)
public/                      BUILD OUTPUT. Never hand-edit. Gitignored? NO -
                             committed, because GitHub Pages serves it.
data/raw/<iso>.json          one snapshot per collector run
data/state.json              current index state (single source of truth)
data/receipts/<id>.json      hash-chained receipts, append-only
data/history.ndjson          one line per scored observation, append-only
```

## The five pillars

Fixed ids, fixed order. Never renamed, never reordered.

| id | name | what it measures |
|---|---|---|
| `capability` | Capability | model releases, research output |
| `compute` | Compute & Capital | hardware, spend, market signal |
| `attention` | Attention | how loudly the world is talking |
| `governance` | Governance | regulatory activity |
| `markets` | Markets | prediction-market odds on AI outcomes |

## Shapes

### Source adapter

Each `collector/sources/<id>.mjs` default-exports:

```js
export default {
  id: 'arxiv',              // unique, stable, kebab-case
  pillar: 'capability',     // one of the five ids above
  label: 'arXiv submissions',
  // Returns { value, unit, observed_at, meta } or throws.
  // value MUST be a finite Number. Higher = more activity, always.
  async collect(fetchJson) { … }
}
```

If a source is inverted (higher = calmer), negate it inside `collect` so the
contract "higher always means more activity" holds everywhere else.

### `data/raw/<iso>.json`

```json
{
  "schema": 1,
  "generated_at": "2026-09-23T02:00:00.000Z",
  "readings": [
    { "source": "arxiv", "pillar": "capability", "ok": true,
      "value": 6016, "unit": "papers/period",
      "observed_at": "2026-09-23T02:00:00.000Z", "meta": {} },
    { "source": "kalshi", "pillar": "markets", "ok": false,
      "error": "HTTP 429", "value": null }
  ]
}
```

### `data/state.json`

```json
{
  "schema": 1,
  "generated_at": "2026-09-23T02:00:00.000Z",
  "score": 61.4,
  "level": 3,
  "level_name": "ELEVATED",
  "previous_level": 4,
  "level_since": "2026-09-21T14:00:00.000Z",
  "degraded": false,
  "dark_pillars": [],
  "pillars": [
    { "id": "capability", "score": 71.2, "percentile": 0.93,
      "sources_ok": 4, "sources_total": 4, "dark": false }
  ],
  "sources": [
    { "id": "arxiv", "ok": true, "age_seconds": 412,
      "last_ok": "2026-09-23T02:00:00.000Z" }
  ],
  "receipt_id": "2026-09-23T02-00-00Z",
  "prev_receipt_hash": "sha256:…"
}
```

### Receipt — `data/receipts/<id>.json`

Append-only, hash-chained. Each carries the full inputs so a stranger can
recompute the score and get the same number.

```json
{
  "schema": 1,
  "id": "2026-09-23T02-00-00Z",
  "generated_at": "2026-09-23T02:00:00.000Z",
  "score": 61.4,
  "level": 3,
  "delta_from_previous": 2.1,
  "level_changed": false,
  "rule_fired": "none",
  "pillars": [ … ],
  "inputs": [ … full readings array as fetched … ],
  "engine_version": "1.0.0",
  "prev_hash": "sha256:…",
  "hash": "sha256:…"
}
```

`hash` = sha256 of the canonical JSON of this object **with `hash` removed**,
keys sorted. `prev_hash` is the previous receipt's `hash`, or
`"sha256:0000…"` for the genesis receipt.

## Index maths — implement exactly

1. **Normalise.** Each source value -> empirical percentile against a **frozen**
   reference distribution (`data/reference.json`, built once from backfill and
   never updated live). Then pseudo-z via inverse normal CDF, then
   `S = 50 + 12.5 * z`, clamped to `[0, 100]`.
2. **Smooth.** EPA NowCast over the trailing 12 observations:
   `w = max(0.5, min/max)` of that window; weight observation `i` periods ago by
   `w^i`; divide by the sum of weights.
3. **Pillar score** = mean of its live sources' smoothed scores. A pillar with
   zero live sources is `dark`.
4. **Composite** = `0.7 * mean(pillars) + 0.3 * max(pillars)`, live pillars only.
5. **Level** from composite, 5 (calmest) down to 1 (loudest):

   | level | name | score band |
   |---|---|---|
   | 5 | DORMANT | 0–34 |
   | 4 | ROUTINE | 35–54 |
   | 3 | ELEVATED | 55–69 |
   | 2 | ACCELERATED | 70–84 |
   | 1 | UNPRECEDENTED | 85–100 |

## Anti-flap — all six layers, v1, not later

1. **Schmitt deadband**: ±3 points around every boundary.
2. **Dual-window dwell**: escalate only if the 3h *and* 30min means are both
   past `T_up`. De-escalate only if the 12h *and* 3h means are both below
   `T_down`. Standing down is deliberately 4x slower than raising.
3. **Minimum 6 hours** between level changes.
4. **4-hour lock** after any change.
5. **One step per change.** Never jump 5 -> 3; produce a staircase.
6. **2-of-5 pillar quorum** must agree with the direction before any change.

Plus the honesty rule: **a level change is frozen while any pillar is dark**,
and post generation is suppressed entirely when two or more pillars are dark.
Never impute. Never treat a dead source as zero.

## Level naming rule

Levels describe **observable activity tempo relative to this index's own
history**. They are never a probability of harm. No future tense anywhere in
generated copy. Banned words, enforced by a unit test in `posts.mjs`:

`will, expect, predict, imminent, soon, coming, warns, forecast, likely`

## Post rules

- **No URL in any post text, ever.** Enforced by regex pre-flight that throws.
  Write the domain as `doomcon dot watch`, and burn it into the card image.
- Every post carries an exact UTC timestamp.
- Post the calm days: a daily state post fires regardless of level.
- Self-contained — readable with no click. Optimised for copy-link sharing.

## Brand

- Name: **DOOMCON**, levels `DOOMCON 5` … `DOOMCON 1`.
- Line: *"We don't know anything. We just count."*
- Domain (not yet registered): `doomcon.watch`. Until then the canonical URL is
  the GitHub Pages URL. Everything reads the constant from `site/brand.mjs` —
  swapping the domain later must be a one-line change.
