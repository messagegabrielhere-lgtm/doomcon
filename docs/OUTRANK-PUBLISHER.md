# Outrank publisher marketplace — SIREN map

**Source:** [@tibo_maker](https://x.com/tibo_maker/status/2110343675691548745)
(2026-10-14) → [outrank.so/sell](https://www.outrank.so/sell) →
[marketplace/publishers](https://www.outrank.so/marketplace/publishers).
**Read:** 2026-10-15.

This file is a **SIREN status map** of Outrank’s *publisher* product (they
write an article on your blog with one advertiser link; you get paid). It is
not a pitch to buy their backlinks-only subscriptions. Buying links stays
refused in `OUTREACH.md`.

Companion docs: `MONETIZE.md` (earning rules), `FINDABILITY.md` (search),
`VOICE.md` / `CONTRACT.md` (what must never look like the index).

---

## What the product is

| Piece | Their claim (paraphrase) |
|---|---|
| Match | Advertiser whose niche fits the site |
| Write | Full article in the site’s saved tone; one section carries the advertiser’s single link |
| Publish | Onto a connected blog (WordPress, webhook, Outrank-hosted, …) |
| Pay | About **$1 per Domain Rating point** per published article, Stripe, after a 14-day live-link hold |
| Controls | Review mode, pause, daily cap (1–3), weekday picker |

They state openly that selling link placements is never zero-risk for rankings.

---

## Qualification vs SIREN today

| Requirement | SIREN | Status |
|---|---|---|
| Domain Rating 30+ | Unknown / early | **Blocked** until measured |
| 100+ monthly organic clicks (50+ if Outrank hosts the blog) | Domain registered 2026-10-08 | **Blocked** — traffic is young |
| Google Search Console, 3+ months history | FINDABILITY #11 still Operator | **Blocked** — finish GSC first, then wait for history |
| Blog on own domain (not free subdomain) | Static instrument site; no blog CMS | **Missing** — needs a separate blog surface |
| Blog integration (CMS / webhook / Outrank host) | GitHub Pages static tree | **Missing** — webhook or Outrank-hosted `/blog` only |
| Stripe in a supported country | Operator account | **Operator** |

Joining the seller waitlist before GSC history exists does not unlock payouts;
their dashboard opens when the site qualifies on a re-check.

---

## Hard refusals (ship these as policy, not preference)

1. **Never into the scored newsroom.** Outrank articles must not enter
   `data/news.json`, the news reel, news-sitemap keywords, or any path that
   feeds the SIREN index. The news layer’s claim is “no LLM summarises or
   scores here” (`NEWS.md`).
2. **Never on instrument pages.** Methodology, receipts, race, map, balance,
   and other arithmetic rooms stay free of paid placements.
3. **Never buy Outrank backlinks** for `siren.watch`. `OUTREACH.md`: do not
   buy links. This playbook is sell-side only, and only after qualification.
4. **Review mode on.** No auto-publish of advertiser copy next to an activity
   index without an operator yes. Decline costs nothing per their docs.
5. **Disclosure.** Paid links stay `rel="sponsored noopener"` in any surface
   we control (`MONETIZE.md` SEO rules). Do not dress a placement as a SIREN
   desk pick or a scored story.
6. **Voice fence.** Placement copy is theirs. It must not claim SIREN levels
   are doom probabilities or forecasts (`VOICE.md`).

---

## When (if) to turn it on

Do these in order; stop when a row is still blocked.

1. Finish FINDABILITY #11 (GSC verify + both sitemaps submitted).
2. Re-measure organic clicks and Domain Rating after the site has real history
   (months, not days).
3. Stand up a **separate blog** on the apex domain (`siren.watch/blog` or
   `blog.siren.watch`) — Outrank-hosted or webhook into a CMS — **not** by
   writing sponsored HTML into `site/templates/`.
4. Connect GSC + blog integration at
   [outrank.so/marketplace/publishers](https://www.outrank.so/marketplace/publishers).
5. Settings: accept placements, **auto-publishing off**, daily cap **1**,
   weekdays only.
6. Record the publisher account as Operator-only (Stripe, Outrank login). No
   secrets in git; no new collector dependency (`CONTRACT.md`).
7. Add a one-line privacy / disclosures note that some blog posts may include
   paid links, matching the EthicalAds pattern in `MONETIZE.md`.

Until steps 1–3 clear, treat this row as **Operator / later** — useful to know,
not to ship.

---

## Status summary

| Decision | Status |
|---|---|
| Document the play (this file) | **Done** (2026-10-15) |
| Buy Outrank backlinks | **Refused** |
| Sell placements on the instrument site | **Refused** |
| Sell placements on a future isolated blog after GSC + traffic qualify | **Open / Operator** |
| Wire into `site/monetize.mjs` | **N/A** until a blog exists — no ID to paste yet |
