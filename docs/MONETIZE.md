# Making money without losing search ranking

Everything is wired and **off**. Each item switches on when its ID goes into
`site/monetize.mjs` (or send the ID to Claude). Nothing loads, shows or
changes until then.

| Revenue | Sign up at | Paste into `site/monetize.mjs` | What appears |
|---|---|---|---|
| Newsletter | buttondown.com (free to 100 subscribers) or beehiiv.com | `newsletter.provider` + `username` (Buttondown) or `url` (beehiiv); GitHub secret `BUTTONDOWN_API_KEY` for sending | Signup box near the top and bottom of the homepage with Daily brief / Alerts ticks; daily brief and alert emails sent by `.github/workflows/newsletter.yml`. Until set, the box offers the same two emails through Blogtrottr. See docs/NEWSLETTER.md |
| Tip jar | buymeacoffee.com or ko-fi.com | `tips.url` | Link in the homepage footer |
| Ads | ethicalads.io (publishers) or carbonads.net | `ads.provider` + `publisher` (EthicalAds) or `serve` + `placement` (Carbon) | One ad on long reading pages (never the homepage), privacy page line |
| Sponsor | sold directly (see /sponsor.html) | `sponsor.name`, `url`, `line`, `until` (ISO date, it switches off itself) | Line on every page + homepage strip; "spot is open" house line until then |
| Affiliates | each program's partner page (Incogni, DeleteMe, Proton, NordVPN, 1Password, ElevenLabs, Descript; usually via Impact or PartnerStack) | the `aff` link on that entry | Bunker Kit "Paid upgrades" crate switches to the tracked link, marked Paid link |
| Analytics | analytics.google.com (GA4) and/or goatcounter.com | `analytics.gtag` (`G-…`) and/or `analytics.goatcounter` | gtag in every page `<head>`; GoatCounter before `</body>`; privacy page disclosure |
| Readers map | GoatCounter Settings → API (token needs **Stats** permission) | GitHub Actions secret `GOATCOUNTER_API_KEY` (optional `GOATCOUNTER_CODE`) | Daily country choropleth on the homepage (`/#readers`) + `/api/visitors.json`. Soft no-op until the key is set; the collect step prints a `::warning::` and the homepage keeps an honest empty section rather than inventing counts. `secrets-check` probes the key; the hourly full collect also prints `collector/visitor-report.mjs` (24h / 7d totals + top paths) into the Actions log. |
| Outrank publisher (sell placements) | [outrank.so/sell](https://www.outrank.so/sell) — see `OUTRANK-PUBLISHER.md` | Nothing in `monetize.mjs` until a separate blog exists | Paid articles on an isolated blog only; never on the newsroom or instrument pages |

## SEO rules the code keeps
- `rel="sponsored noopener"` on every paid link.
- No ads above the fold, on the homepage, or in pop-ups; at most one per page.
- Ad scripts load `async` into a box with reserved height (no layout shift).
- No AdSense: it needs a consent banner for EU visitors and slows pages.
- Disclosures sit next to the links (the compliance gate checks this).

## Still to do by hand
- Amazon Associates: list the site URL in your Associates account.
- Newsletter: CAN-SPAM needs a postal address in the email footer; use a PO box, never a home address.
- Outrank publisher: finish GSC (`FINDABILITY.md` #11), earn organic history, then follow `OUTRANK-PUBLISHER.md`. Do not buy their backlinks product.
