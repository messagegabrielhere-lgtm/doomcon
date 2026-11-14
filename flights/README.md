# flights/

**What this is:** backend for the **Flight Report Card** (`/flights.html`). It
grades each US domestic flight number on its own 12-month on-time record.
Separate from the SIREN AI tempo index; it does not feed the main number.

**Novice map**

| File | Job |
|---|---|
| `core.mjs` | CSV parsing, counting, the grade (no network, no imports) |
| `read.mjs` | Opens a BTS zip and walks its CSV (Node built-ins only) |
| `collect.mjs` | Downloads the newest 12 monthly BTS files → `index.json` + `origin/<IATA>.json` |
| `test.mjs` | `node --test flights/test.mjs` |
| `.github/workflows/flights-data.yml` | Mondays → `flights-data` branch |
| `site/static/flights.html` | The page; embeds a copy of `core.mjs` at build time |

No API keys. Source: BTS "Reporting Carrier On-Time Performance" monthly
archives under `https://transtats.bts.gov/PREZIP/`.

**The grade.** On-time arrivals (under 15 minutes late, as BTS marks them)
divided by every flight scheduled. Cancelled and diverted flights count as
scheduled and not on time. A ≥ 90%, B ≥ 80%, C ≥ 70%, D ≥ 60%, F below. Under
20 scheduled flights: no letter. Under 5: not published.

**Data shape.** A flight row in `origin/<IATA>.json` is
`[carrier, number, dep, n, ontime, cancelled, diverted, late, lateMin]`.

**Not yet proven against the live server.** The archive URL pattern and the
404-for-unpublished-month behaviour were written from BTS documentation, not
from a run. Trigger the workflow once by hand (`workflow_dispatch`) and read
its log before trusting the schedule.
