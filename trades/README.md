# trades/ — free position watcher

`check.py` runs every 5 minutes in GitHub Actions (`trade-watch.yml`). It reads
`watch.json`, pulls public delayed quotes (CBOE for stocks and options, Coinbase
for crypto), and writes `status.txt`. First line is `OK <utc> n=<rows>` or
`BREACH <utc> n=<rows>`; one row per position with its verdict
(HOLD / STOP / TARGET / TRAIL / ERR). It never places orders and holds no secrets.

A position row:

```json
{"id": "SQQQ_1023_39C", "type": "option", "symbol": "SQQQ", "occ": "SQQQ251023C00039000",
 "stop": 0.20, "target": 1.00, "trail_pct": 50, "trail_from": 1.00,
 "action": "TARGET: sell half; TRAIL: sell rest; STOP: sell all"}
```

`type` is `stock`, `option` (needs the OCC symbol) or `crypto` (Coinbase spot,
symbol like `BTC`). `trail_pct` arms only once price has reached `trail_from`;
`high` is maintained by the script. Timestamps are UTC. A quote older than
15 minutes is normal (delayed feeds).

## scan.py — free market scan (every 30 min)

`trade-scan.yml` runs `scan.py` and publishes `scan.md` + `scan.json` to the
orphan branch `trade-data` (force-pushed, one commit, so `main` stays clean):
`https://raw.githubusercontent.com/messagegabrielhere-lgtm/doomcon/trade-data/scan.md`.
It covers every Robinhood-listed coin (`crypto_syms.txt`, via Coinbase Exchange),
the whole US stock table (Nasdaq screener, with 20/50-day SMA, RSI14 and volume
ratio from stooq/Yahoo for the candidates), SPY/VIX regime, a BTC-linked and
inverse-ETF watch row, and Kalshi public markets: near-certain contracts
(>=93c, closing within 48h) plus BTC daily range markets near 50c. Advisory
only; nothing here places orders.

## shadow.py — real-time forward test (every scan)

Runs right after `scan.py` in `trade-scan.yml` and `market-keeper.yml`. Every
candidate row (stock longs, PUT LIST, coin longs, coin downs) opens a paper
"shadow" entry with its features (regime, RSI band, volume ratio, trend, BTC
state). Each later scan marks it with the price tables `scan.py` already
downloaded (`out/prices.json`), records the return at +4h and +24h, then closes it.
`shadow.json` (ledger) and `shadow.md` (results by setup and feature, `EDGE+` /
`EDGE-` once a bucket has >= 30 closed entries) are published on `trade-data`:
`https://raw.githubusercontent.com/messagegabrielhere-lgtm/doomcon/trade-data/shadow.md`.
Win rate and averages are net of an estimated round-trip cost (`COST`: stocks
0.1%, crypto 2.0%, since Robinhood crypto quotes run 1-2% wide), so a flag means
the edge survives costs. A short `SHADOW` block (one line per setup, plus any
flagged bucket) is appended to `scan.md`, so every trading pass sees it.
Paper only: delayed prices, no orders. It changes no rule; a flagged
bucket is evidence for the owner. Tests: `python3 trades/tests/test_shadow.py`.
