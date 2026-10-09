# Dispatch (/dispatch.html)

A US room for **911 CAD calls**, **multi-system emergency alerts**, and
**police-call blather** (the nature-of-call chatter from open CAD feeds). High-
severity triggers mark an emergency on the site and may post once to X. It never
moves the SIREN score.

| File | Job |
|---|---|
| `dispatch/collect.mjs` | Cities + alert systems → `dispatch.json` + `emergency.json` |
| `dispatch/cities.mjs` | CAD adapters (Seattle, SF, NYC, Austin, LA, Dallas, KC, MoCo) |
| `dispatch/alerts.mjs` | NWS, USGS, GDACS, NASA EONET, NHC |
| `dispatch/emergency.mjs` | Emergency level + per-system X post text (3 phrasings each) |
| `dispatch/card.mjs` | Custom PNG per alert (system art, severity, facts) |
| `dispatch/post-alerts.mjs` | Rate-limited X posts for fresh triggers |
| `.github/workflows/dispatch-data.yml` | Every ~15 minutes, force-pushes `dispatch-data` |
| `site/static/dispatch.html` | Map, layers, emergency banner, blather ticker |
| `site/sitebar.mjs` | Site-wide emergency strip (polls `emergency.json`) |

## Sources

| Layer | Source | Notes |
|---|---|---|
| NWS alerts | [api.weather.gov](https://www.weather.gov/documentation/services-web-api) | Extreme/Severe + selected named warnings. Zone-only → list yes, map no. |
| USGS quakes | earthquake.usgs.gov 4.5+ day feed | M6+ (6 h) / M7+ (24 h) can trigger emergency |
| GDACS | gdacs.org API | Orange/Red events (Green dropped) |
| NASA EONET | eonet.gsfc.nasa.gov | Open events, last 14 days |
| NHC storms | nhc.noaa.gov CurrentStorms | Active tropical cyclones |
| Seattle Fire/EMS | data.seattle.gov `kzjm-xkqj` | CAD with coordinates |
| Seattle Police | data.seattle.gov `33kz-ixgy` | CAD with coordinates |
| San Francisco CAD | data.sf.gov `gnap-fj3t` | `sensitive_call` rows dropped |
| NYC NYPD CAD | data.cityofnewyork.us `n2zq-pubd` | Calls with coordinates |
| Austin Police | data.austintexas.gov `22de-7rzg` | Pins on sector centroids (`approx`) |
| LAPD Calls | data.lacity.org `xjgu-z4ju` | Pins on area centroids (`approx`) |
| Dallas Police | dallasopendata.com `9fxf-t2tr` | Pins on division centroids (`approx`) |
| Kansas City 911 | data.kcmo.org `4cef-rqti` | Address never published; division pin |
| Montgomery County MD | montgomerycountymd.gov `98cc-bc7d` | Police CAD with coordinates |

Street addresses are stripped before publish. Coordinates are rounded to three
decimal degrees (~100 m). A source that fails is shown dark; nothing is invented.

## Emergency mark + X

`evaluateEmergency()` turns on when any of these are present:

- NWS **Extreme**, or Severe Tornado / Hurricane / Tsunami / Flash Flood / Blizzard
- GDACS **Red**
- NHC storm at Severe or Extreme
- USGS **M6+** in the last 6 hours (or **M7+** in 24 h)

When active:

1. `emergency.json` on `dispatch-data` carries `{ active, level, label, primary, … }`
2. `/dispatch.html` shows a top banner (EMERGENCY / ALERT / WATCH)
3. The sitebar on every stamped page polls that file and shows a strip
4. `post-alerts.mjs` may post **one** fresh trigger to X (same secrets as
   `post-daily`), with a 3-hour gap and a durable `posted-alerts.ndjson` ledger
   carried across force-pushes. No secrets → snapshot only, still green.

Each post is custom: text is per alert system (USGS / NWS / NHC / GDACS / EONET)
with three deterministic phrasings, and the image is a `dispatch/card.mjs` PNG
built from that same alert (system art, severity heat, headline, magnitude or
wind when present, coordinates). Link-free (address spelled), passes
`preflightX`, never carries `!`, `@mentions`, or `BREAKING`. NWS “Warning”
wording is rewritten so the future-tense guard does not reject the post.

## Not for emergencies

This is delayed public open data for ambient awareness. It is not a warning
system, not national coverage, and not for emergency response. Call the local
emergency number and follow official alerts when it matters.
