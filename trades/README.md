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
