# monitor/

**What this is:** backend for **World Monitor** (`/monitor.html`) — a live map
of news, hazards, flights, and a country stress score. Separate from the SIREN
AI tempo index.

**Novice map**

| File | Job |
|---|---|
| `core.mjs` | Categories, country matching, stress formula (no network) |
| `collect.mjs` | Server fetch of GDELT, RSS, hazards → snapshot JSON |
| `.github/workflows/monitor-data.yml` | Every ~15 min → `monitor-data` branch |
| `site/static/monitor.html` | The page; embeds a copy of `core.mjs` at build time |

No API keys. Some sources are refreshed in the visitor’s browser when GitHub’s
runners are blocked.

Deep dive: [`docs/MONITOR.md`](../docs/MONITOR.md).
