# The SIREN email

Two emails, one list, picked by the reader with two checkboxes on the homepage:

| Tag | What | When | Code |
|---|---|---|---|
| `daily` | The daily brief: the reading, its 24 h move, the loudest pillar, the top of the daily brief, the day's biggest breaking stories | 12:37 UTC every day (08:37 New York) | `collector/newsletter.mjs --daily` |
| `alerts` | A level change, always; a breaking story only when 4+ independent outlets carry it, at most one every 4 h and three a day | checked at :13 and :43 every hour | `collector/newsletter.mjs --alert` |

Every line is a field of a file the site already publishes, and the copy around
the headlines passes the same future-tense check as the X posts (docs/VOICE.md §3).

## Before setup: it already works

With no provider set, the homepage box offers both emails through Blogtrottr,
which mails SIREN's public feeds: `/feed-daily.xml` (one entry per completed UTC
day) and `/feed-level.xml` (level changes only). The reader's address goes to
Blogtrottr, never to SIREN.

## Turning on Buttondown (about 10 minutes)

1. Sign up at buttondown.com (free to 100 subscribers). Use a pseudonymous
   newsletter name such as "SIREN"; nothing needs your real name.
2. Settings → Basics: set the sender name to SIREN.
3. Settings → Emails → Footer/address: add a **PO box** or virtual mailbox
   address. CAN-SPAM requires a postal address in every marketing email; never
   use a home address. Buttondown adds it and the unsubscribe link to every send.
4. Subscribers → Tags: create `daily` and `alerts`.
5. In `site/monetize.mjs` set `newsletter.provider: 'buttondown'` and
   `newsletter.username` to your Buttondown username. The homepage box becomes
   a real form; the two checkboxes set the tags.
6. Settings → API: copy the key into GitHub → Settings → Secrets and variables
   → Actions as `BUTTONDOWN_API_KEY`.
7. Actions → newsletter → Run workflow with `dry_run` on, to see the exact
   email. Then run it once with `dry_run` off.

The sender sends `X-Buttondown-Live-Dangerously: true` and `X-API-Version:
2026-04-01`, which Buttondown requires before an API-created email goes out.
The ledger `data/emailed.ndjson` (one line per email) stops repeats.
