# World Monitor (/monitor.html)

A live globe of world news, hazards and movement, with a country stress index
and a markets panel. One hand-written page, `site/static/monitor.html`, with no
libraries and no keys. Everything is fetched by the visitor's browser.

## Sources

| Layer | Source | Refresh |
|---|---|---|
| News, 14 categories | GDELT DOC 2.0 API, English, last 24 h. One request every 6 s (GDELT asks for at most one per 5 s), cached 15 min in the browser | 15 min |
| AI news | SIREN's own newsroom, `/api/news.json` | 30 min |
| Earthquakes | USGS M4.5+ past 7 days | 5 min |
| Fires, storms, volcanoes, floods… | NASA EONET v3, open events | 15 min |
| Disaster alerts | GDACS | 15 min |
| Military aircraft | adsb.lol `/v2/mil` (falls back to airplanes.live) | 2 min |
| All flights (off by default) | OpenSky `states/all`, anonymous, sampled to ~4,000 | 10 min |
| Shipping lanes, chokepoints | Static reference in the page | — |
| AI datacentres (off by default) | `/api/world.json` (OSM) | on demand |
| Exploited vulnerabilities | CISA KEV via `cisagov/kev-data` | 30 min |
| Stocks, country ETFs, commodities | Scanner snapshot, `scanner-data/stocks-1d.json` (Yahoo, delayed) | 30 min |
| Crypto | OKX spot tickers, alternative.me Fear & Greed | 1 min |
| Country outlines | `data/world-outline.json` from main | once |

A source that fails turns its chip red. Nothing falls back to made-up data.

## Stress index

0–100 per country: `0.55·News + 0.30·Hazard + 0.15·Market`, re-weighted when
Market is missing. The page's "How" note gives the exact weights. It counts
English-language coverage and hazards. It is not a forecast, and a country
nobody writes about scores low.

## Local AI

The Brief tab works without a model: it counts what the headlines say. With
Ollama running locally (`OLLAMA_ORIGINS="<site origin>" ollama serve`) it
summarises each category, and optionally does so automatically as each one
lands, with a one-click world brief. "Open in Claude" hands the same prompt to
claude.ai.

## Not built

The tweet's World Monitor also ships native desktop apps, 25 languages and
live AIS ship positions. AIS needs a key, so lanes here are static.
