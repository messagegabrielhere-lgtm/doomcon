# data/

**What this is:** the **saved memory** of the index and related collectors.
JSON and ndjson files committed on `main` so the site and verifiers have
something to read without re-fetching the world.

**Novice map**

| Path | Job |
|---|---|
| `state.json` | Latest SIREN score, level, pillars |
| `history.ndjson` | One line per scored observation over time |
| `receipts/` | One receipt file per reading (hash-chained) |
| `raw/` | Raw collector snapshots before scoring |
| `reference.json` | Frozen historical distribution (do not regenerate casually) |
| Other `*.json` | News, race, world, bets, … for side pages |

Side projects often keep **bulk** JSON on separate branches (`arena-data`,
`scanner-data`, …) so `main` stays clone-friendly.

Treat this folder as evidence, not as a place to hand-edit production numbers.
