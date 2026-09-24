# How DOOMCON updates itself

The operator's brief was one sentence: *"it should be built so the news
automatically updates."*

There are three layers between that sentence and a reader's screen, and they
fail independently, so this file names all three, says what each one costs, and
says what a reader sees when any of them stops.

| layer | file | beat | what it moves |
|---|---|---|---|
| **1. schedule** | `.github/workflows/collect.yml` | 15 min / 1 h | fetches, rebuilds, deploys |
| **2. collector** | `collector/news.mjs` | per source, 5 min – 1 h | which feeds get asked at all |
| **3. page** | `site/templates/_motion.mjs` | 60 s in the browser | an already-open tab |

Layer 3 is the one people actually experience. A build every fifteen minutes
means nothing to someone who opened the page fourteen minutes ago; the poller is
what makes their tab true. Layer 1 is what makes the poller have something to
find.

---

## 1. The schedule

```yaml
on:
  schedule:
    - cron: '*/15 * * * *'   # news, the fast lane
    - cron: '7 * * * *'      # the full index pass
```

Both lanes live in one workflow file and select themselves on
`github.event.schedule`. They share one concurrency group, `doomcon-data`, with
`cancel-in-progress: false`, so no two data-writing runs are ever in flight at
once.

### The fast lane — every 15 minutes, ~1–2 minutes

`news.mjs` → gate → `build.mjs` + cards → commit `data/news.json` → publish
`public/` to `gh-pages`.

It does **not** run the index engine. That is a correctness rule, not a saving.
Receipts are append-only and the anti-flap machinery measures dwell in hours; an
engine run every fifteen minutes would write ~96 receipts a day, silently
re-weight the NowCast and change what the number means.

**Why 15 and not 5.** GitHub's documented cron floor is five minutes, but the
floor is not the problem — the variance is. Scheduled runs are routinely late by
5–20 minutes under platform load. At `*/5`, a run that is twelve minutes late
collides with two successors, all three queue on the same concurrency group, and
GitHub keeps only one pending run per group, so the extra ones are cancelled
anyway. Fifteen minutes gives a late run room to land before the next one is
due, and it keeps the publish rate inside what GitHub Pages is comfortable
serving. The marginal freshness 5 would buy is in any case already covered by
layer 3, which is polling every sixty seconds from the reader's own browser.

**Why it commits `data/news.json` on every pass, even a pass that changed
nothing.** That file carries the per-source cadence ledger
(`sources[].fetched_at`) and the `first_seen_at` stamps behind the "we had this
first" claim. A scheduled run is a fresh container with no memory of its own —
the committed file *is* the process state. Leave it uncommitted and the ledger
resets every pass, all sixteen sources get re-fetched every fifteen minutes, and
every item the fast lane discovered between hours is re-dated at the next full
pass.

**Why it does not commit `public/`.** `gh-pages` is what Pages actually serves,
and it is force-pushed as a single orphan commit, so publishing costs no history
at all. Committing the built HTML to `main` 96 times a day would. The full lane
commits `public/` hourly, so `main` still carries a build-output archive — up to
an hour behind the live site, by design.

### The full lane — hourly at :07, ~3 minutes

`collect` → `news --force` → `race` → `engine` → `build` → cards → commit
`data/` and `public/` → publish.

**Why hourly.** That is how fast the inputs move. arXiv publishes in daily
batches, the SEC in business hours, and the prediction markets in a way a
15-minute sample cannot distinguish from noise at this index's smoothing. It is
also the cadence arXiv tolerates: asking it more often than roughly once an hour
returns `HTTP 429 … Rate exceeded` (measured 2026-09-24, while testing this very
cadence — the collector reported the source dark, the run continued, and the
page said `arxiv` was dark, which is the system working).

**Why `--force`.** The hourly pass ignores the cadence ledger and asks every
feed, however recently the fast lane did. That is the whole point of having it:
no feed can hide behind its own interval for longer than an hour.

**Why minute 7.** The `*/15` grid fires at :00, :15, :30 and :45. Seven is the
furthest point from all four — seven minutes after one tick, eight before the
next — so a ~3-minute full pass and a ~2-minute fast pass have to slip by more
than five minutes before they can collide at all.

---

## 2. The collector's own cadence

A fast run is cheap because most sources are not asked. Every adapter declares
how often it is worth asking; one that is not due is **skipped**, and its items
are carried forward from the previous run unchanged. Skipping costs nothing in
coverage — only latency on that one feed.

| kind | interval | why |
|---|---|---|
| `forum`, `press`, `status` | 5 min | HN, Techmeme, Verge, Ars and incident feeds genuinely turn over inside a quarter hour |
| `release`, `lab` | 15 min | GitHub tags and lab blogs land in bursts, a few times a week |
| `model` | 30 min | HF trending is a rolling average; it cannot move in fifteen minutes |
| `paper` | 60 min | arXiv and HF Daily Papers publish in daily batches, and arXiv throttles |

Anything at or under 15 minutes is effectively "every fast run". The two `paper`
sources and the one `model` source are the ones that actually get held back —
which is deliberate, because they are the expensive, rate-limited, slowest-moving
feeds in the set.

**The 20% slack matters more than the intervals do.** Cron does not keep time,
and it runs a little *early* relative to the previous run's own clock as often as
it runs late: two runs nominally fifteen minutes apart can land 14m40s apart.
Against a bare `elapsed >= interval` test that near-miss skips the source, and it
is then not asked again until the run after — so a 15-minute cadence silently
degrades to 30. `isDue()` therefore fires once the source is within 20% of its
interval. It can never make a source more than 20% early, and it removes the
doubling entirely.

Three more things the collector does so that an incremental run is not a
*degraded* run:

- **Corroborating members are rehydrated.** A run that does not re-fetch a source
  would otherwise see a corroborated story as a group of one and recompute it as
  single-sourced — the ×2 badge vanishes and the score drops by the whole
  12.5-point corroboration term. Measured on two consecutive passes before the
  fix: both corroborated stories lost their second source and 12.5 points each.
  Each member now stores enough of itself in `meta.corroboration.also[]` to be
  rebuilt as a record, and the same grouping code recomputes the same answer.
- **A failed fetch still stamps `fetched_at`.** The ledger records when we last
  *asked*, not when we last succeeded. Left unstamped, a permanently dead feed is
  "never fetched", therefore always due, and every fast run pays its full timeout
  — the one source giving us nothing would become the most expensive in the file.
- **The adapter watchdog is 25s on a fast run, 60s on `--force`.** A hung adapter
  must not be the reason a 15-minute lane overruns its own beat; it is dark for
  this pass and asked again on the next one. The hourly pass keeps the generous
  timeout, because there the point is completeness.

Measured, two consecutive passes, 2026-09-24:

```
run 1  news: 16 adapters, 13 due, 3 skipped by cadence, window 7d, 200 items carried forward
       run: incremental, 13/16 sources fetched, 1 item arrived, 1 left the window,
            items_changed=true, 1816ms
run 2  news: 16 adapters, 0 due, 16 skipped by cadence
       run: incremental, 0/16 sources fetched, 0 items arrived, 0 left the window,
            items_changed=false, 109ms
```

200 ids identical across both, in the same order; zero `first_seen_at` drift;
zero duplicate ids; zero duplicate source rows.

---

## 3. The page, between builds

`_motion.mjs` polls `api/state.json` and `api/news.json` every 60 s. Its whole
discipline is one rule: **if nothing changed, do nothing visible.** A page that
churns while saying nothing is lying about activity, which is the failure mode
this project exists not to commit.

- **New items are offered, never inserted.** Arrivals are buffered and counted —
  *"3 new stories since you arrived · newest 4m ago"* — and the reader presses a
  button to merge them. Content never moves under someone mid-sentence. On merge
  they land in a labelled strip above the feed, the strip takes focus, and the
  ranked feed below is untouched.
- **The ticker is refed** from each poll, but rebuilt only when the newest-14 id
  list actually changes, so an unchanged newsroom never interrupts the crawl.
- **Ages are recomputed** against the live compile stamp whenever a refresh moves
  it, so `27h` becomes `29h` and the "compiled …" line moves with it, together.
  They are measured from the compile stamp and **not** from the reader's clock,
  because the page prints a legend saying exactly that; re-basing them here would
  make every row disagree with the sentence above it. The pill's *"newest 4m
  ago"* is the one figure measured against the reader's own clock, and it is the
  one figure on a 30-second repaint timer.
- **Failure is visible.** 60 s → 120 s → 300 s, then it stops after three
  consecutive failures — and says so, in the note: `REFRESH STOPPED · refresh
  gave up; reload the page`. A page that has silently stopped updating while
  still looking live is worse than one that admits it.
- **A hidden tab costs nothing.** No timer and no request while
  `document.hidden`; the pending poll fires on the way back.
- `cache: 'no-cache'`, not `'no-store'`. `no-store` forbids caching, so every
  poll would drag all ~350 KB of `api/news.json` down a phone connection.
  `no-cache` still revalidates on every poll but lets an unchanged file answer
  `304` with no body at all — which, between builds, is what almost every poll
  gets.

Budget: MOTION.md allows 8192 bytes uncompressed for the inline script. It is
**8147**. Check it after any edit:

```bash
docker run --rm -v "$PWD":/app -w /app node:20-alpine node -e \
  "import('./site/templates/_motion.mjs').then(m=>console.log(Buffer.byteLength(m.MOTION_JS)))"
```

---

## When Actions is late, or does not run at all

Everything above is written so a **skipped** run and a **doubled** run are both
harmless. Nothing here is a one-shot.

| what happens | why it is survivable |
|---|---|
| a fast run is 10 minutes late | the cadence ledger is wall-clock, so sources come due on their own terms; the next run picks up everything |
| a fast run is skipped entirely | items carried forward keep their ids and `first_seen_at`; open tabs are still polling and still current |
| a full run is skipped | the engine reads the newest snapshot whenever it next runs, and the NowCast is defined over the trailing 12 observations rather than wall clock, so a gap shifts the window instead of corrupting it |
| two runs overlap | the concurrency group queues them; the "did collect write a new snapshot" gate stops the receipt chain advancing twice on one observation |
| a queued run is cancelled | GitHub keeps only one pending run per concurrency group, so under heavy delay a queued lane can be dropped. It simply runs at its next tick, over the same idempotent steps. Worst case: the index is two hours old instead of one |
| some sources are dark | normal operating state. Neither lane fails. The source strip names them and the pillar goes dark rather than being imputed |
| **every** index source is dark | the full lane commits the all-dark snapshot as evidence, publishes, and *then* fails — the one condition worth an email |
| `data/news.json` is unreadable | the gate reports `usable=false`; nothing is committed and nothing is published, so one bad pass cannot be made permanent |
| the newsroom parses but has zero items | refused as a collapse rather than a change; an empty newsroom is investigated, not deployed |

One thing that is **not** self-healing: GitHub disables scheduled workflows in a
repository with 60 days of no activity. This one commits several times an hour,
so it cannot go quiet on its own — but if the schedule is ever paused by hand,
it has to be re-enabled by hand.

---

## Verifying freshness from the outside

Nothing below needs repository access. All of it reads the live site.

**1. Ask the API when it was built.**

```bash
curl -s https://messagegabrielhere-lgtm.github.io/doomcon/api/news.json |
  node --input-type=module -e '
    let b=""; for await (const c of process.stdin) b+=c;
    const n = JSON.parse(b);
    const age = (Date.now() - Date.parse(n.generated_at)) / 60000;
    console.log(`compiled ${n.generated_at} — ${age.toFixed(1)} minutes ago`);
    console.log(`${n.items.length} items · run:`, n.run);
    const held = n.sources.filter(s => s.skipped_this_run).map(s => s.id);
    const dark = n.sources.filter(s => s.state === "dark").map(s => s.id);
    console.log(`held by cadence: ${held.join(", ") || "none"}`);
    console.log(`dark: ${dark.join(", ") || "none"}`);
  '
```

`generated_at` should be under ~20 minutes old. The `run` block reports the
mode, how many sources were asked, and how many items arrived and departed.
`sources[].fetched_at` gives the per-source truth — a source held by cadence is
**not** an outage, and the file distinguishes the two.

**2. Ask the CDN, without downloading anything.**

```bash
curl -sI https://messagegabrielhere-lgtm.github.io/doomcon/api/news.json |
  grep -i '^last-modified\|^etag'
```

This is the same signal the page's own poller uses to get a free `304`.

**3. Read it off the page.** The newsroom header prints
`● LIVE · compiled <stamp> UTC`, and the pip is three real states — `LIVE` under
2 h, `STALE` under 12 h, `COLD` beyond — with the word always printed beside it,
so it survives greyscale and a screen reader.

**4. Read the deploy log.** Every publish is one commit on `gh-pages`:

```bash
git ls-remote https://github.com/messagegabrielhere-lgtm/doomcon gh-pages
```

The subject line carries the level and score, and says which lane produced it
(`collect/news` or `collect/full`).

**5. Watch the runs.** The Actions tab lists both lanes by name — *newsroom* and
*full index pass*. A lane that has not run in over an hour is the first thing to
check, and a run that is green but did nothing usually means a cron string in
`collect.yml` no longer matches the string the job's `if` compares against.

---

## What still needs a human

Two things in this repo's history mean the schedule above cannot be assumed to
be running just because this file exists.

1. **The workflow has to reach GitHub.** `deploy.sh` records that the OAuth token
   this repo was set up with lacks the `workflow` scope, which is why deploying
   from a branch was chosen in the first place. A token without that scope
   **cannot push `.github/workflows/`** — the push is rejected outright. Confirm
   the file on GitHub matches the file here before believing any of this runs.
2. **Pages has to be serving the branch.** This workflow publishes to
   `gh-pages`. If the repository's Pages source is set to "GitHub Actions"
   instead, these pushes deploy nothing and `pages.yml` is the live path.
   Settings → Pages → Build and deployment → Source should read
   *Deploy from a branch · gh-pages · /*.
