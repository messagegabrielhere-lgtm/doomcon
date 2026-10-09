# scanner/

**What this is:** collectors for stock candles, sentiment, and daily **picks**
used by the Capitulation Scanner UI and Arena. Read-only. Not financial advice.

**Novice map**

| File | Job |
|---|---|
| `collect-stocks.mjs` | Pull delayed Yahoo Finance bars |
| `collect-sentiment.mjs` | Market sentiment inputs |
| `picks.mjs` | Rule-based daily screen / track-record helpers |
| `.github/workflows/scanner-stocks.yml` | Scheduled collect → `scanner-data` branch |
| `site/static/scanner.html` | Browser UI |

Nothing here places real orders. Backtests and track records are **hypothetical**.
