# investors/

**What this is:** scrapes **public filings** about what large funds and US
House members disclosed they traded. Shown on Arena’s Investors tab.

**Novice map**

| Piece | Job |
|---|---|
| `collect.mjs` | Pull SEC 13F, ARK daily files, House PTR PDFs |
| `test.mjs` | `npm run test:investors` |
| `.github/workflows/investors.yml` | Weekday collector → `investors-data` branch |

**Dependencies:** CI installs `pdfjs-dist` only for that job (not a root
dependency). Filings are delayed by law — the UI says so.

This is disclosure data, not live brokerage activity.
