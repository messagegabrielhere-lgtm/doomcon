# World Monitor (/monitor.html)

A live map of world news, hazards and movement, with a country stress index,
its 7-day history and a markets panel. No libraries and no keys.

## How the pieces fit

| File | Job |
|---|---|
| `monitor/core.mjs` | Categories, country matching, story grouping, the stress formula. No imports. |
| `monitor/collect.mjs` | Server side: GDELT, 27 RSS feeds, hazards, KEV → snapshot + hourly history |
| `.github/workflows/monitor-data.yml` | Runs the collector every 15 minutes, force-pushes to the `monitor-data` branch |
| `site/static/monitor.html` | The page. `site/build.mjs` pastes `core.mjs` into it as `Core` |

There is one copy of the scoring rules. The history the server writes and the
number the page shows come from the same functions.

The page loads the snapshot from `raw.githubusercontent.com/…/monitor-data/`
first. It then calls the fast sources itself (quakes, military aircraft, NASA,
GDACS, KEV, crypto). When a live call fails, that source falls back to the
snapshot's copy, and its chip turns amber instead of red. GDELT is called from
the browser when the snapshot is missing, stale, or has no GDELT (GitHub's
runners are refused with HTTP 429). It is one request, cached 15 minutes,
because GDELT asks for one request every five seconds.

## Sources

| Layer | Source | Where it is read |
|---|---|---|
| News | GDELT DOC 2.0, English, 24 h, one combined query sorted by `categorize()`. GitHub's runners get HTTP 429 from GDELT, so when the snapshot has no GDELT the page makes the call from the visitor's browser, cached 15 minutes | server, else browser |
| World news | 27 RSS feeds: BBC, Al Jazeera, Guardian, NPR, DW, France 24, NYT, Washington Post, Euronews, RFI, ABC, Sky, UN, CNBC, Middle East Eye, Japan Times, SCMP, Africanews, Defense News, The War Zone, BleepingComputer, The Record, Krebs, gCaptain, Splash247, OilPrice, WHO | server only (no CORS) |
| AI news | SIREN's newsroom, `/api/news.json` | browser |
| Earthquakes | USGS M4.5+, 7 days | both |
| Fires, storms, volcanoes, floods… | NASA EONET v3, open events | both |
| Disaster alerts | GDACS | both |
| Military aircraft | adsb.lol `/v2/mil`, airplanes.live fallback | both |
| All flights (off by default) | OpenSky, anonymous, sampled to ~4,000 | browser |
| Shipping lanes, chokepoints | static, in the page | — |
| AI datacentres (off by default) | `/api/world.json` (OSM) | browser |
| Exploited vulnerabilities | CISA KEV via `cisagov/kev-data` | both |
| Stocks, country ETFs, commodities | scanner snapshot (Yahoo, delayed) | browser |
| Crypto | OKX spot, alternative.me Fear & Greed | browser |

A source that fails is shown as failed. Nothing falls back to made-up data.

## Stories

Headlines about the same event from different outlets are grouped into one
story. Two headlines join when they share at least 45% of their significant
words, or four words and 35%, within 36 hours of each other. The countries a
headline names count as words, so "Russia" and "Russian" agree. A story's
category is the most specific one among its headlines.

RSS headlines arrive without a category. `categorize()` assigns the first
category whose pattern matches. If nothing matches, it uses the feed's own
default (cyber for BleepingComputer, shipping for gCaptain), else "World".

## Stress index

Each country gets three parts, each scored 0 to 100:

- **News:** stories in the last 24 hours that name the country. Each story counts once, plus a quarter for each extra outlet, up to double. Category weights: military and security 3, nuclear 2.5, unrest and disasters 2, health and humanitarian 1.5, economy, energy, cyber and shipping 1, diplomacy and climate 0.5, other world news 0.4. An outlet writing about its own country (the BBC on Britain, France 24 on France) counts 30%. The part is `min(100, 16·log₂(1+w))`.
- **Hazard:** M4.5+ quakes (energy-weighted), GDACS orange and red alerts, and open EONET events. The part is `min(100, 22·log₁₀(1+h))`.
- **Market:** only for countries with a country ETF. It combines the 5-day drawdown with 20-day volatility measured against the fund's own year.

The composite is `0.55·N + 0.30·H + 0.15·M`, re-weighted when Market is
missing. It counts English-language coverage and hazards. It is not a forecast.

**History.** Every run stores each country's News and Hazard parts in
`monitor-history.json`, one point per hour, for 7 days. The page replays the
history with today's Market part held fixed. That gives the 24-hour arrow and
the trend line in each country's panel. A country missing from an hour scored
zero that hour.

## Page features

- Globe or flat map (M), country search (/), and layer presets (Conflict, Disasters, Movement, Markets).
- A 6, 24 or 72-hour window for stories, hotspots and the brief.
- Share: the URL hash carries the view, the selected country, the tab and the window.
- Alerts (opt-in): M6+ quakes in the last 6 hours, GDACS red alerts, and countries up 15 or more in 24 hours to a score of at least 40. These show as in-page toasts, plus browser notifications when the tab is in the background. Whatever is already on the map when the page opens is the baseline, not news.
- Brief: a local count of each category with no model needed, optional Ollama summaries, and Open in Claude.

## Not built

The World Monitor in the tweet also ships native desktop apps, 25 languages
and live AIS ship positions. AIS needs a key, so lanes here are static.
