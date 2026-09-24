# X strategy

What DOOMCON can legally and freely do with X, what it costs when we stop doing
it for free, and what we have decided to refuse.

Everything below was measured against live endpoints and live documentation on
**2026-09-23**. Where the answer is "this cannot be done for free", it says so
in those words rather than hiding behind a fragile implementation. Prices and
policy change; every claim here carries the URL it came from so the next person
can re-check it in ten minutes instead of re-deriving it in a day.

---

## 0. The short version

| Question | Answer |
|---|---|
| Can we read X for free? | **No.** There is no free tier and no free search. |
| Can we show real X posts for free? | **Yes** — oEmbed, keyless, for posts we discover elsewhere. Shipped. |
| Can we follow labs off X instead? | **No.** Every frontier-lab Bluesky handle is parked at 0 posts. |
| What would paid reading cost? | **$9–$91/month** depending on ambition. Numbers in §4. |
| What does posting cost? | **$1.37/month** link-free. **$18.26/month** with a link. |
| Can we scrape X? | **Never.** X's own policy: permanent suspension. Not built, not proposed. |

---

## 1. What changed, and what it broke

X retired its free tier on **2026-02-06**. There are no tiers any more — no
Free, no Basic, no Pro. `docs.x.com/x-api/getting-started/pricing` now reads:

> The X API uses **pay-per-usage** pricing. No subscriptions—pay only for what
> you use.

You buy credits and they are deducted per request. Every read of a post costs
money. So the free-tier architecture every "AI news tracker" was built on in
2023 does not exist, and any competitor still showing a live X feed is either
paying for it, grandfathered, or scraping.

The relevant consequence for us: **there is no free firehose, and no amount of
cleverness produces one.** The rest of this document is what remains.

---

## 2. The free surface we actually shipped: oEmbed

### 2.1 It is keyless, and X says so in writing

`https://publish.x.com/oembed` resolves a known post URL into that post's real
author, real text and real permalink. X's own documentation
(`docs.x.com/x-for-websites/oembed-api`) states, verbatim:

```
Requires authentication?   No
Rate limited               No
```

and, on caching:

> "The Tweet fallback markup is meant to be cached on your servers for up to the
> suggested cache lifetime specified by the `cache_age` property."

So: no key, no documented limit, and server-side caching explicitly sanctioned.

### 2.2 Proof — a real, unedited response

```
$ curl -s 'https://publish.x.com/oembed?url=https%3A%2F%2Fx.com%2Fopenai%2Fstatus%2F2102808325742322002&omit_script=1&dnt=true'
```

```json
{"url":"https://x.com/OpenAI/status/2102808325742322002",
 "author_name":"OpenAI","author_url":"https://x.com/OpenAI",
 "html":"<blockquote class=\"twitter-tweet\" data-width=\"550\" data-dnt=\"true\"><p lang=\"en\" dir=\"ltr\">We heard you loud and clear. ChatGPT Voice can now:<br><br>- Use plugins like your email, calendar, and Slack.<br><br>- Be powered by GPT-6 Astra, Sol, and Luna.<br><br>- Be used in ChatGPT Work on web and mobile, so you can create docs, decks, sites, and spreadsheets or tackle complex tasks in… <a href=\"https://t.co/zRjjCMxpuW\">pic.twitter.com/zRjjCMxpuW</a></p>&mdash; OpenAI (@OpenAI) <a href=\"https://x.com/OpenAI/status/2102808325742322002?ref_src=twsrc%5Etfw\">September 23, 2026</a></blockquote>\n\n",
 "width":550,"height":null,"type":"rich","cache_age":"3153600000",
 "provider_name":"X","provider_url":"https://x.com","version":"1.0"}
```

Headers on that response: `HTTP/2 200`, `content-type: application/json`,
`cache-control: must-revalidate, max-age=3153600000`. No auth header was sent.

**The post text is in the markup.** That is the whole reason this works for us:
with `omit_script=1` the blockquote is static HTML, so the reel is present in a
screenshot taken before any JavaScript runs. That is precisely the failure
TEARDOWN.md §3.3 records on pizzint.watch — their prerendered HTML contains only
`LOADING TACTICAL DATA...`, so a screenshot of their dashboard is blank. Ours
is not, and the growth loop is screenshots.

### 2.3 Measured behaviour, not assumed

| Test | Result |
|---|---|
| 60 sequential calls, one post | 60 × HTTP 200. No 429. No rate headers exposed. |
| 18 distinct posts back to back | 18 × HTTP 200. |
| Deleted / nonexistent post | **HTTP 404 with `content-type: text/html`** |
| `url=` pointing off-domain | HTTP 404, HTML body |
| `url=` omitted entirely | HTTP 400, `{"errors":[{"code":357,"message":"url: queryParam is required"}]}` |
| `twitter.com` host in `url=` | Accepted, normalised to `x.com` in the response |
| `publish.twitter.com/oembed` | 301 → `publish.x.com/oembed` |

The 404-with-HTML case is the trap worth writing down. It is the
"a 200 does not mean a feed exists" failure inverted: the status code is
correct, but the *body* is a full X error page. `fetch.mjs`'s `fetchJson`
rejects on the status before it ever attempts a parse, so the failure arrives as
`FetchError{kind:'http', status:404}` and is recorded by name:

```
dead : FAIL kind=http status=404  -> unavailable reason "HTTP 404"
alive: OK   author=OpenAI  html=578 bytes
```

### 2.4 The actual problem: discovery

oEmbed **resolves**. It does not **search**. Handed a URL it returns a post;
it will not tell you which posts exist. So the real question was never "can we
read X for free" — it was **"where do x.com post URLs surface publicly, for
free, somewhere we are already allowed to read?"**

Two answers, both measured, both now implemented in `collector/x-surface.mjs`:

**Hacker News (Algolia).** 84 distinct stories in the trailing 30 days whose
*submitted URL is itself* an x.com status permalink — including `@claudeai`,
`@ArtificialAnlys`, `@alexandr_wang`, `@rasbt`, `@StepFun_ai`, `@natfriedman`.
HN hands us points and a comment count for free, which is a real, auditable
popularity signal, plus a permalink to the discussion.

**Techmeme's front page.** 256 distinct x.com status permalinks in a single
fetch. Techmeme runs an explicit `X:` block under each story cluster listing the
posts its editors considered worth reading — on 2026-09-23 that included
`@openai`, `@anthropicai`, `@googleai`, `@darioamodei` and `@artificialanlys`.
`techmeme.com/robots.txt` allows `/` for `User-agent: *` (it disallows only
`/r/`, `/goto/`, `/search/`, `/timeline/`, `/track/` and `*.jpg`).

We parse Techmeme **per story cluster**, not with a flat regex over the page,
and that turned out to matter more than expected. A flat regex finds the same
URLs but can only claim "Techmeme linked this". The cluster tells us *which
story it was cited under*, which is the sentence a reader wants — and it tightens
the topic filter enormously, because we test the headline instead of 600
characters of neighbouring markup. Measured: **149 loose candidates became 150
headline-anchored ones, and the top of the reel went from five random
commentators to `@AnthropicAI`, `@OpenAI`, `@GoogleDeepMind`, `@GoogleAI`,
`@ArtificialAnlys`.**

### 2.5 What this is, stated honestly

It is **not** a timeline, and it must never be described as one. It is: *the X
posts that Hacker News submitters and Techmeme editors chose to cite, in the
last 72 hours, resolved through X's public embed endpoint, shown with the
citation attached.*

That framing is a feature, not an apology. Every post on the page carries
`Cited by Techmeme` or `Cited by Hacker News (412 points)` and links back to the
citing discussion. pizzint's OSINT rail is an undifferentiated wall of posts.
Ours says who thought each one mattered, and you can click through and check.

---

## 3. Is there an official non-X mirror we could follow instead?

The honest hope was that the labs had quietly mirrored themselves onto Bluesky
or Mastodon and we could follow that for free with a proper public API.

**They have not.** Measured via the keyless Bluesky AppView
(`public.api.bsky.app`, no auth) on 2026-09-23:

| Handle | Posts | Followers | Verdict |
|---|---|---|---|
| `anthropic.com` | **0** | 16,392 | Verified domain handle, registered 2024-11-19, **never posted** |
| `hf.co` | 3 | 16,850 | Effectively dormant |
| `googledeepmind.bsky.social` | 0 | 10 | Parked, no display name |
| `mistralai.bsky.social` | 0 | 1,398 | Parked, no display name |
| `anthropicai.bsky.social` | 0 | 1,452 | Parked, no display name |
| `openai.bsky.social` | — | — | `AccountTakedown` (squatter, removed by Bluesky) |

Anthropic is the clearest case: a verified `anthropic.com` handle with a real
bio, 16,392 followers, and **zero posts in twenty-two months.** They claimed the
name and walked away.

There are third-party mirror bots — `openai.xmirror.bot` (2,402 posts) and
`anthropicai.xmirror.bot` — but their own bios say **"Unofficial mirror account
of https://x.com/openai from Twitter"**. Depending on an unofficial bot that
re-publishes X content without permission would be building on someone else's
policy violation. Rejected.

**Conclusion: there is no official non-X social mirror for any frontier lab.
X remains the only place these organisations speak in short form.**

### 3.1 What does exist, and is better than a mirror anyway

Official **newsroom feeds** are real, first-party, keyless, and were all fresh
the day they were checked:

| Feed | Status | Newest item |
|---|---|---|
| `https://openai.com/news/rss.xml` | 200 `text/xml` | Wed, 23 Sep 2026 16:00 GMT |
| `https://deepmind.google/blog/rss.xml` | 200 `text/xml` | Wed, 23 Sep 2026 16:00 GMT |
| `https://blog.google/technology/ai/rss/` | 200 `application/xml` | Wed, 23 Sep 2026 18:00 GMT |
| `https://huggingface.co/blog/feed.xml` | 200 `application/rss+xml` | Wed, 23 Sep 2026 18:41 GMT |
| `https://research.google/blog/rss/` | 200 | Fri, 18 Sep 2026 17:46 GMT |
| `https://www.anthropic.com/news/rss.xml` | **404** | Anthropic still publishes no feed at any path |

These are not an X substitute — a blog post is not a post — but for a *news
reel* they are strictly better source material than a social mirror would be:
first-party, dated, stable, and citable. They belong to whoever owns the news
module, not to `x-surface.mjs`, and are listed here so that work is not
re-researched.

---

## 4. What paid reading would actually cost

The operator asked for a real number to decide against, not a vague "it costs
money". Here it is, from `docs.x.com/x-api/getting-started/pricing`, read
2026-09-23.

### 4.1 The rate card

**Reads — charged per resource *returned*, not per request:**

| Resource | Unit cost |
|---|---|
| Posts: Read | **$0.005** per post |
| User: Read | $0.010 per user |
| List: Read | $0.005 per resource |
| Counts: Recent | $0.005 per request |
| Trends | $0.010 per request |

Pay-per-usage is capped at **3 million post reads per monthly billing cycle**;
past that you are on Enterprise.

**Writes — charged per request:**

| Action | Unit cost |
|---|---|
| Post: Create | **$0.015** |
| **Post: Create (with URL)** | **$0.200** |
| Post: Create (summoned) | $0.010 |
| Interaction: Delete | $0.010 |

**"Owned Reads" — $0.001 per resource** for your *own* data
(`GET /2/users/{id}/tweets`, `/mentions`, `/followers`, `/following`, …) when
`{id}` is the authenticated user who owns the app. Ten times cheaper, and worth
knowing: **reading our own mentions and our own post performance is nearly
free.** There is no home-timeline endpoint in that list, so it does not help us
read *other people*.

### 4.2 The thing that actually determines the bill

> **Deduplication.** All resources are deduplicated within a 24-hour UTC day
> window. If you request and are charged for a resource, requesting the same
> resource again within that window will not incur an additional charge. …
> Deduplication is a **soft guarantee**.

This is the single most important line on the page and it is easy to miss.
**Cost is driven by unique posts per UTC day, not by polling frequency.**
Polling a curated list every 15 minutes costs the same as polling it once a day,
because every re-read of the same post inside that day is free. Our 15-minute
cron is therefore *not* the expensive part — the size of the basket is.

(It is a soft guarantee, so budget with headroom, not to the cent.)

### 4.3 Four real scenarios

Assuming 30.44 days per month:

| # | Shape | Unique posts/day | Daily | **Monthly** |
|---|---|---|---|---|
| A | The ten frontier-lab accounts, nothing else | ~40 posts + 10 users | $0.30 | **$9.13** |
| B | Curated X List of 25 AI accounts (labs + evaluators + researchers) | ~150 posts + 25 users | $1.00 | **$30.44** |
| C | `search/recent` on a narrow AI query | ~600 posts | $3.00 | **$91.32** |
| D | Broad AI keyword firehose — what "better news tracking" naively implies | ~3,000 posts | $15.00 | **$456.60** |

Worked example for B: 150 × $0.005 = $0.75/day for posts, plus 25 author objects
via expansions at $0.010 each = $0.25/day (deduped, so one charge per author per
day), totalling $1.00/day.

### 4.4 The recommendation

**Do not buy read access, and specifically do not buy it yet.**

Scenario B at $30/month is not an unreasonable price. It is an unreasonable
price *for what it adds over what we now have for free*. We already surface
`@AnthropicAI`, `@OpenAI`, `@GoogleDeepMind`, `@GoogleAI` and `@ArtificialAnlys`
at the top of the reel via oEmbed, at $0/month, with a citation attached that a
raw timeline could not provide. Paying $30/month buys us **latency and
completeness** — the same posts sooner, plus the ones nobody cited.

Neither is our bottleneck. Nobody is leaving DOOMCON because a lab post arrived
forty minutes late.

Revisit if and only if one of these becomes true:

1. The reel demonstrably drives retention and the citation lag is the complaint.
2. We want *engagement counts* on posts (likes/reposts) as an index input —
   which would be a genuine capability the free path cannot reach at all.
3. Techmeme or HN Algolia dies, taking discovery with it. Then $30/month is
   cheap insurance, and §4.3 scenario B is the shape to buy.

**Budget to authorise now: $1.37/month, for posting.** See §5.

---

## 5. Outbound — where X actually pays off

Reading X is a cost centre. **Posting to X is the distribution channel**, and
TEARDOWN.md §4 records the opening: not one of the six AI-risk index
competitors — doombench, IMD, skynetcountdown, takeofftracker, pdoom.ai,
theagiclock — has an X account at all. pizzint proved distribution is the whole
game; five AI competitors built dashboards and waited.

### 5.1 The link rule, and why it is enforced in code

| | Cost per post | 3 posts/day | Per month |
|---|---|---|---|
| Link-free post | $0.015 | $0.045 | **$1.37** |
| Post containing a URL | $0.200 | $0.600 | **$18.26** |

**A URL costs 13.3× more.** ($0.200 ÷ $0.015 = 13.33.) And it costs *twice*,
because it is also penalised in ranking — see §5.3, where opening a link is
weighted 0.2 against sharing by copy-link at 20.0.

So: **no URL in any post, ever.** Write the domain as `doomcon dot watch` and
burn it into the card image. Techmeme does exactly this, writing "Techmeme dot
com" in its own posts, and Techmeme has been optimising X distribution for
longer than almost anyone.

This is enforced by a pre-flight regex in `posts.mjs` that throws, per
CONTRACT.md — not by remembering. Discipline fails at 2am; a thrown exception
does not.

### 5.2 Mandatory compliance for an automated account

From `docs.x.com/developer-guidelines`, read 2026-09-23. All six are required:

1. **Enable the "Automated" profile label.** It appears under the account name.
   Set it in app settings. This is not optional and not a nicety.
2. **Disclose in the bio** that it is automated and who runs it — e.g.
   *"Automated account managed by …"*.
3. **Link to a human-managed account** for accountability.
4. **Honour opt-out requests immediately.** If someone says stop, stop.
5. **Official API only.** No scraping, no browser automation.
6. **Stay within rate limits.** No circumvention.

Also binding, and relevant to how we post:

- **No unsolicited @mentions.** Our posts mention nobody. Keep it that way.
- **Replies only if the user engaged first**, max one reply per interaction.
  (A reply to someone who @-mentioned us is a "summoned" post at $0.010.)
- **No identical content across accounts.** One account. One voice.
- **Likes must be user-initiated.** Never automate a like. It is explicitly
  prohibited and it is exactly the kind of thing a growth script does by default.
- X's scheduled-informational-content case — *"Automated account posts scheduled
  content (news, weather, quotes)"* — is listed as **allowed**. A daily state
  post is squarely inside it, including on the calm days.

### 5.3 The ranking weights, from xAI's own source

X open-sourced the For You ranker. These are the real defaults, read from
`xai-org/x-algorithm/home-mixer/params/param.rs` on 2026-09-23 (Apache-2.0,
33,382 stars, pushed the same day):

| Signal | Weight |
|---|---|
| **Share via copy link** | **20.0** |
| Share via DM | 5.0 |
| Reply | 5.0 |
| Quote | 5.0 |
| Follow author | 4.0 |
| Share | 2.0 |
| Repost | 1.0 |
| Like | 0.5 |
| Click | 0.4 |
| **Open link** | **0.2** |
| Dwell | 0.05 |
| Report | −234.0 |
| Mute author | −58.8 |
| Not interested | −43.2 |
| Block author | −31.2 |

One caveat the repo states twice and which we should not misread: these weights
scale the model's *predicted probability* of each action, not raw engagement
counts. "One report cancels 468 likes" is wrong. The ordering is still the
design signal, and the ordering is unambiguous.

**A copy-link share is worth 40 likes. A link-open is worth 0.025 of one.**

That single ratio determines the whole content format:

- **Self-contained.** Readable and argue-with-able without a click. A number, a
  level, a timestamp, a card.
- **Screenshot-able**, because a screenshot pasted into a group chat is what a
  copy-link share looks like upstream.
- **Never** a "read more at…" post. It optimises for the 0.2 signal while
  paying 13.3× for the privilege.

Two further mechanics, both verified in the same file:

- **`AgeFilter` drops posts older than 48 hours** from the For You feed. A post
  has two days to work and then it is gone. This is why the index posts daily
  rather than waiting for something dramatic.
- **`AuthorDiversityDecay = 0.5`, `AuthorDiversityFloor = 0.25`.** The second
  post by one author in a slate is worth half the first, the third a quarter,
  floored at a quarter. **Posting more does not linearly buy more reach.** One
  good post beats three mediocre ones, and the third is worth at most a quarter
  of the first.

We borrowed that last rule for ourselves: `x-surface.mjs` applies the same 0.5
decay with the same 0.25 floor when ranking the reel, so no single account can
dominate the panel. If it is good enough for X's own feed it is good enough for
a sidebar.

---

## 6. What we refuse, and why

### 6.1 Scraping — not at any price

`docs.x.com/developer-guidelines` lists it twice, unambiguously:

> "App scrapes X via browser automation (not API) — **Permanent suspension**
> — API only"
>
> "Non-API automation (scraping, browser automation) results in permanent
> suspension."

This is not a build option to be weighed. **It is not built, it will not be
built, and it should not be proposed again.** The downside is losing the
distribution channel permanently, which is the one asset TEARDOWN.md identifies
as unclaimed in this entire category.

### 6.2 The undocumented syndication endpoints

The embed widget talks to internal endpoints that are technically keyless, and
someone will eventually suggest them. Two reasons not to, the second of which
does not require a policy argument:

1. They are undocumented internal endpoints. Using them is the same class of
   act as scraping, with the same penalty attached.
2. **They do not work.** Measured 2026-09-23:
   - `syndication.twitter.com/srv/timeline-profile/screen-name/OpenAI`
     → `HTTP 429 Rate limit exceeded` (20 bytes)
   - `cdn.syndication.twimg.com/tweet-result?id=…&lang=en`
     → `HTTP 200` with body `{}`

So the choice is between a documented endpoint that returns real data and an
undocumented one that returns nothing and risks the account.

### 6.3 Things X's policy forbids that touch our design

- **"Display X Content in iframes"** is on the prohibited list. We render the
  static blockquote inline. **The site must not iframe the reel.**
- **"Store X data to train AI/ML models"** — prohibited (Grok excepted). We do
  not.
- **Content deletion within 24 hours** when a post is removed on X. This is a
  deadline, and a naive cache violates it, so `x-surface.mjs` re-checks every
  cached post against oEmbed every 6 hours and drops anything that 404s. An
  entry that cannot be re-checked for 20 hours stops being published rather than
  ride past the deadline unverified. Tested: backdating the cache to 21 hours
  drops all 20 entries from publication until they are revalidated.
- **Attribution when displaying X Content** — every item carries author name,
  `@handle`, timestamp and a link to the permalink, plus who cited it.

---

## 7. What shipped

`collector/x-surface.mjs` → `data/x-surface.json`. No key, no credentials, no
`package.json` entry, no network call outside `fetch.mjs`.

```
x-surface: LIVE  2026-09-23T21:35:25.500Z
  ok   hn         20 candidate(s)
  ok   techmeme   162 candidate(s)
  candidates=173 pool=20 (outranked 153) resolved_now=0 (revalidate 0)
  reused=20 deferred=0 dropped=0 unavailable=0 published=14
  #1 @AnthropicAI      7.86  Claude has discovered a previously unknown enzyme system…
  #2 @OpenAI           7.82  We heard you loud and clear. ChatGPT Voice can now…
  #3 @ArtificialAnlys  7.75  Google has released Gemini 3.8 Flash TTS and Gemini 3.8 Flash-Lite…
  #4 @GoogleDeepMind   7.74  Create and deploy custom audio with our new text-to-speech model…
  #5 @GoogleAI         7.74  We're launching Gemini 3.8 Flash TTS and Gemini 3.8 Flash-Lite TTS…
```

**Cost per run: $0.00. Steady-state oEmbed calls per run: 0.**

That last number is the design working. A run resolves only posts that have
newly entered the top-20 candidate pool; everything else is served from the
previous file exactly as X's documentation instructs. Measured over consecutive
runs: 16 → 4 → 0.

### 7.1 Three states, kept distinct

Copied straight off pizzint's failure. TEARDOWN.md §3.1: their status endpoint
reports `"healthy"` at a 12% scrape success rate while the homepage prints a
confident DOUGHCON 5.

| `status` | Meaning | What the page must show |
|---|---|---|
| `live` | Every discovery source answered. | The reel. An empty reel here genuinely means no cited AI post fell inside 72h — say that. |
| `degraded` | We have posts, but a source is dark. | The reel **and** which source is missing, by name. |
| `dark` | Nothing answered. | **Not** an empty panel. Say the surface is unavailable. |

`dark_sources` names them. Every failure is carried with its error string.
A dark run exits non-zero, and — deliberately — still preserves the fetch cache,
because the cache is a receipt for work already done, not a claim about now.

### 7.2 Integration notes

- **Pipeline order:** run `node collector/x-surface.mjs` **before**
  `site/build.mjs`. It writes `data/`, and `build.mjs` clears `public/`.
  It is independent of `collect` / `engine` and may run in parallel with them.
- **`affects_index` is `false`** and is in the file so it is checkable rather
  than promised. Nothing here is scored, and nothing here can move the number.
  An X reel that could move the headline would be exactly the unfalsifiable
  input METHODOLOGY.md exists to refuse.
- **Render `items[].html_safe`**, not `html`. `html_safe` is rebuilt from a
  tag/attribute whitelist (`blockquote`, `p`, `a`, `br`, `span`, `em`, `strong`;
  https-only hrefs restricted to x.com/twitter.com/t.co; `rel="nofollow noopener
  noreferrer"` forced). `html` is the verbatim original, kept as the audit trail
  for the claim that we did not alter X's markup. Post text is never modified.
- **Do not iframe it** (§6.3) and **do not load `platform.x.com/widgets.js`**.
  The markup is already static; the whole point is that the reel survives a
  screenshot taken before hydration.
- **`items[].text`** is the plain-text post if you want your own card layout,
  and **`attribution_line`** is a prerendered string
  (*"Cited by Techmeme"*, *"Cited by Hacker News (412 points)"*) so provenance
  can be printed without reimplementing the logic.
- **Never rely on colour alone.** `official: true` and `status` must be rendered
  as *text*, not as a green dot — accessibility, and it is the difference
  between a screenshot that carries the state and one that does not.
- `cache`, `counts` and `unavailable` are collector bookkeeping. Render `items`.
- The module is **safe to `import`**. It guards on being the entry point, so
  pulling in `sanitizeEmbedHtml`, `postedAtFromId`, `parseTechmeme`, `rankItems`
  or `deriveStatus` from the site build or a test does not fire a discovery run.
  Eleven helpers are exported.

### 7.3 Tests

`node collector/x-surface.mjs --selftest` — **49 checks, no network.** Covers
snowflake timestamp decoding (including the refusal to decode pre-snowflake ids
like `jack/status/20`), URL extraction, the topic filter (*"Thailand said
Dubai"* must not match `\bAI\b`), the Techmeme cluster parser against a fixture,
the HTML sanitiser (script/`onerror`/`javascript:`/off-domain-href rejection,
no double-escaping of `&mdash;`), status derivation, and the ranking including
the author-diversity decay.

Run it:

```bash
docker run --rm --network host -v "$PWD":/app -w /app node:20-alpine \
  node collector/x-surface.mjs --selftest
```

---

## 8. Open risks

- **oEmbed is undocumented-as-to-limits, not unlimited.** "Rate limited: No" is
  today's policy, not a contract. The budget, the candidate pool and the cache
  exist so that a future limit degrades us rather than breaks us.
- **Discovery is two sources, and one is a scraped HTML page.** Techmeme's
  front-page markup has been stable for years, but if it changes the adapter
  throws deliberately (it requires ≥5 story clusters) rather than report a quiet
  day. HN Algolia is a proper API and the likelier survivor.
- **We see what HN and Techmeme see.** That is an Anglophone, Western, tech-press
  lens — the same limitation METHODOLOGY.md already discloses about the index
  itself. A major Chinese lab post reaches this reel only once the Western press
  cites it. It is a reel, not a census, and should never be described as one.
- **oEmbed truncates long posts** with `…` and a `t.co` link, which is X's own
  behaviour. `text_truncated_by_x` flags it so the page can say so rather than
  appear to have cut someone off.
- **Prices in §4 change.** They are dated. Re-check
  `docs.x.com/x-api/getting-started/pricing` before authorising spend.
- **The ~374K/~79K follower figures** in TEARDOWN.md come from secondary
  sources; x.com 403s all fetches, and without read access we cannot verify
  them. They remain approximate.
