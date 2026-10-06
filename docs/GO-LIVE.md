# Go live

The site builds and deploys itself. What is left needs your identity, your
judgement and your hands on the keyboard. Budget **20 minutes**, most of it on
the X account rather than the site.

---

## First, the honest version of "go viral"

A new dashboard with no audience gets approximately zero traffic. That is not
pessimism about the index, it is how dashboards work — and the five AI-doom
trackers that already exist are the proof. skynetcountdown, takeofftracker,
doombench, pdoom.ai and theagiclock are all live, all reasonable, and **not one
of them has an X account.** They built the thing and waited.

pizzint.watch is the counterexample, and it is instructive in two ways.

**One:** its actual traffic engine is not the pizza gimmick. Its sitemap holds
1,018 URLs and **997 of them are auto-generated news briefs**. The dashboard
everyone talks about is a single URL. The viral scalar is the brand; the long
tail is the traffic. That is why this repo generates a permanent page per index
move — those pages are the equivalent, and they accumulate whether or not
anything goes viral.

**Two:** its gimmick is broken and nobody has noticed. Its own status endpoint
reports 2 successful scrapes in 24 hours across 16 locations while the homepage
prints a confident DOUGHCON 5 over four pizzerias showing NO DATA. It still has
a 374K-follower audience, because the audience is downstream of the X account,
not the data quality.

So: the index is the product, but **the X account is the distribution**, and
that part is manual and yours.

---

## Step 1 — Check it is live *(2 minutes)*

GitHub Pages is already configured to deploy from Actions. After the first push,
the site appears at:

**https://messagegabrielhere-lgtm.github.io/doomcon/**

If it 404s, check **Actions** in the repo — the `pages.yml` run needs to finish
green once. Deploys take a couple of minutes.

The collector runs every 15 minutes via `collect.yml` and commits fresh data back
to `main`, which triggers a redeploy. Nothing needs to stay running on your Mac.

> GitHub Actions cron is a **best-effort** schedule and runs are frequently
> delayed under platform load — sometimes by 10+ minutes. The pipeline is
> idempotent, so a skipped or doubled run is harmless, but do not expect
> clockwork. If you ever need it now, use **Actions → collect → Run workflow**.

## Step 2 — The X account *(15 minutes, and this is the part that matters)*

**There is no API integration, by design.** X killed its free tier on 2026-02-06
and moved to pay-per-use credits, and a post containing a URL costs **$0.200
versus $0.015 without one** — a 13.3x surcharge introduced specifically to price
out automated link posting. You said start free, so v1 posts by hand.

That constraint is less painful than it sounds: **@PenPizzaReport, the 374K
original, posts image-only with no link anyway**, and Techmeme removed links from
its automated posts entirely and now writes "Techmeme dot com". Link-free is what
already works on that platform.

### Setting the account up

1. **Create the account** (or use an existing one). Handle should match the
   brand — `@doomconwatch` or similar.
2. **Put the URL in the bio and in a pinned post.** This is the only place a
   clickable link can live, so it has to carry the whole job.
3. **Turn on the "Automated" profile label** if you ever wire up the API later —
   X requires it for bot accounts and ties them to a named human. Not needed
   while you are posting by hand.

### Posting

Open **`public/post-sheet.html`** in a browser — locally, or at
`/post-sheet.html` on the live site. It is `noindex` and not in the sitemap, so
it will not be crawled.

Each queued post gives you the card preview, the exact text, a **Copy** button
and a **Download PNG** button. Copy, download, paste both into X. About fifteen
seconds each. Checkboxes persist across reloads so you can stop and resume.

### The four rules that decide whether this works

1. **Post the calm days.** @PenPizzaReport's credibility comes from routinely
   posting "all pizzerias reporting average or below average traffic." An index
   that only speaks when it is alarmed reads as a hype account. The daily state
   post fires regardless of level — post it anyway.
2. **Never add a link to the post text.** The generator physically cannot emit
   one; do not add it by hand. The domain is burned into the card image.
3. **Spread posts out.** X hard-filters posts older than 48 hours out of the For
   You feed, and a second post from the same author in one feed slate is worth
   half. A steady drumbeat beats a burst.
4. **Do not claim you predicted anything.** The generator bans future tense for
   a reason. The moment this account says "warns" or "imminent", it becomes one
   of a thousand doom accounts instead of the one with receipts.

### What actually gets shared

From xAI's open-source For You ranker: **share-via-copy-link is weighted 20.0 —
forty times a like (0.5).** Replies and quotes are 5.0 each. Link clicks are 0.2.

So the goal is not likes. It is being pasted into a group chat, and being worth
arguing with. Self-contained cards with a falsifiable number do that; "AI is
scary" does not.

## Step 3 — The domain, when you want it

`doomcon.watch` was available as of 2026-09-22 and is roughly $30/year.
`doomcon.com` is **not** available — it is held along with `.org` and `.net` on
Dotster nameservers, so it would be a negotiation, not a purchase.

Nothing breaks if you never buy one. When you do:

1. Register it anywhere reputable (Cloudflare Registrar sells at cost).
2. DNS: four `A` records for the apex —
   `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`.
   Plus a `CNAME` for `www` → `messagegabrielhere-lgtm.github.io`.
3. Repo **Settings → Pages → Custom domain**, enter it, tick **Enforce HTTPS**.
4. Change `DOMAIN` and `CANONICAL_URL` in `site/brand.mjs` — one line each — and
   push. Cards and posts pick up the new domain automatically.

## Step 4 — The growth loops that compound

In rough order of return on your time:

1. **The embeddable widget.** `/embed.html` — nobody in this category has one.
   `/embed` and `/widget` 404 on pizzint, skynetcountdown and takeofftracker
   alike. Every blog or newsletter that pastes it is a backlink and a
   distribution node you control, and it is the only real hedge against X.
2. **The move pages.** Every index change writes a permanent, indexable page.
   This is pizzint's 997-brief long tail. It compounds silently.
3. **Show HN**, once the index has a few weeks of history to show. Lead with the
   reproducibility claim — "an AI index you can recompute yourself" — not with
   doom. HN punishes doom and rewards method.
4. **Reddit**: r/LocalLLaMA and r/artificial tolerate this if you participate
   first. r/singularity will take it happily. Read each sub's self-promotion
   rules — they differ and they are enforced.
5. **The public JSON API.** Also unclaimed in this category. Journalists cite
   things they can query.

---

## What I could not do, and why

- **Buy the domain.** Entering payment details is off-limits to me regardless of
  authorisation. Everything either side of the checkout I can do.
- **Create or run the X account.** Account creation is off-limits, and the first
  post should be your hand on the button anyway.
- **Guarantee the schedule.** GitHub Actions cron drifts under load. If you need
  minute-accurate collection later, that is the point at which you move the
  collector to a paid scheduler — not before.
- **Backtest the index against outcomes.** Deliberately. It does not predict
  outcomes, so there is nothing to backtest against. Anyone who says it "called"
  an event is misusing it, and you should say so.

One piece of housekeeping: `stockanalysis.com` is an unofficial endpoint and will
go dark intermittently behind bot protection. That is expected and handled — it
is deliberately not load-bearing. If you see it dark on the dashboard, nothing is
wrong.
