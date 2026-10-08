# Dispatch (/dispatch.html)

A US room for **911 CAD calls**, **NWS emergency alerts**, and **police-call
blather** (the nature-of-call chatter from open CAD feeds). It never moves the
SIREN score.

| File | Job |
|---|---|
| `dispatch/collect.mjs` | NWS CAP + city CAD → `dispatch.json` |
| `.github/workflows/dispatch-data.yml` | Every ~15 minutes, force-pushes `dispatch-data` |
| `site/static/dispatch.html` | Map, layers, blather ticker and lists |

## Sources

| Layer | Source | Notes |
|---|---|---|
| Emergency alerts | [api.weather.gov](https://www.weather.gov/documentation/services-web-api) active CAP | Extreme/Severe, plus selected named warnings. Zone-only alerts appear in the list; map pins need geometry. |
| Seattle 911 | [Seattle Open Data](https://data.seattle.gov/resource/kzjm-xkqj.json) | Fire / EMS CAD with coordinates |
| San Francisco CAD | [DataSF](https://data.sf.gov/resource/gnap-fj3t.json) | Police calls; `sensitive_call` rows dropped |
| Montgomery County MD | [Montgomery Open Data](https://data.montgomerycountymd.gov/resource/98cc-bc7d.json) | Police CAD with coordinates |
| Dallas Police | [Dallas Open Data](https://www.dallasopendata.com/resource/9fxf-t2tr.json) | Active calls; pins on division centroids (`approx: true`) |

Street addresses are stripped before publish. Coordinates are rounded to three
decimal degrees (~100 m). A source that fails is shown dark; nothing is invented.

## Not for emergencies

This is delayed public open data for ambient awareness. It is not a warning
system, not national coverage, and not for emergency response. Call the local
emergency number and follow official alerts when it matters.
