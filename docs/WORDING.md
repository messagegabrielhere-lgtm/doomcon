# Wording — every heading, and the plain-English version of each

One table, one row per `<h1>` and `<h2>` on every built page, read out of
`public/*.html` on 2026-09-27 (build: `DOOMCON 4 (ROUTINE), score 39.8`,
350 files). The integrator applies the proposals in `site/templates/*`; this
file only decides the words.

## The one pattern

**Plain heading, brand-voice eyebrow.** The heading says what the section *is*
in words a first-time visitor understands, in about five words or fewer. The
insider name — the oven, the desk, the watch floor — is not deleted; it moves
to the small uppercase eyebrow above the heading, the slot the site already
uses (`<p class="eyebrow">Observed …</p>` above the homepage `<h1>`,
`<p class="eyebrow">Composite score</p>` above the number,
`<p class="eyebrow">Index moves · 2026-09-26</p>` above every move page's
`<h1>`). Reading order becomes: eyebrow, heading, kicker, lede — exactly the
order the sections already have minus the eyebrow, so nothing below a heading
moves.

Three rules kept throughout:

1. **No new metaphors.** Every proposed eyebrow is the current heading,
   uppercased. Nothing is coined.
2. **A heading that is already plain is left alone**, and no eyebrow is added
   to it — an eyebrow with nothing to translate is noise.
3. **A name may describe the instrument, the observer or the argument, never
   the outcome** (`docs/FEAR.md` §11, `CONTRACT.md`'s level-naming rule). Every
   proposed heading below was checked against that and against
   `findFutureViolation()` in `collector/posts.mjs`.

Where a page's `<h1>` changes, it changes to agree with the nav tile the reader
clicked to get there (`Power`, `Map`, `Cameras`, `Upside`, `Newsroom` …): the
tile labels were already renamed for strangers, and a reader who presses
`Upside` and lands on `BLISS` has been handed a second name to decode.

The template file that owns each heading is given in the page column so the
integrator can find it; the words for `/methodology` live in
`docs/METHODOLOGY.md`, which `methodology.mjs` renders.

**What the eyebrow slot already holds.** A few sections already carry a line in
the eyebrow position — `/watts` and `/map` open with
`A DOOMCON sub-index · does not feed the main number`, `/map`'s cross-link
opens with `Same subject, different instrument`. Those stay; the insider name
joins them (`WATTS · A DOOMCON SUB-INDEX · DOES NOT FEED THE MAIN NUMBER`), it
does not replace them. The kickers *below* headings (`8 labs monitored · read
02:21Z`, `Observed position · the mark moves both ways · not a prediction`) are
untouched everywhere.

## The table

`keep` in the proposed-heading column means: leave the heading as it is and add
nothing above it.

### Homepage `/`

| page | current | proposed heading | proposed eyebrow | why |
|---|---|---|---|---|
| `/` — `index.mjs` `headline()` | `<h1>` AI activity is at DOOMCON 4 — ROUTINE, on a scale where 1 is loudest. | keep | — (already `OBSERVED <stamp>`) | Plain, generated, carries the level and the scale's direction. Shipped in the previous pass. |
| `/` — `_readings.mjs` | Recent readings | keep | — | Plain. The kicker `Last 8 of 45 observations` says the rest. |
| `/` — `_oven.mjs` | The oven | Where the index sits | THE OVEN | The Domino's-tracker nod is the operator's own word (`docs/OVEN.md` §1) and decodes to nothing for a stranger. The section shows the lit stage on a five-stage rail and the threshold either side; "where the index sits" is what it is. The kicker `Observed position · the mark moves both ways · not a prediction` stays beneath. |
| `/` — `_switcher.mjs` | The desk | Every dataset, one panel | THE DESK | A newsroom desk is a metaphor for the people who work at one. The kicker already says the plain thing (`8 datasets · one slot · no page load`); the heading should too. "Every" rather than "eight" because the count is `list.length` in the template. |
| `/` — `_switcher.mjs` (`reel(…, { heading: 'Latest eight' })`) | Latest eight | The eight newest stories | LATEST EIGHT | Eight *what*. `RAIL_CARDS` fixes the count at 8, so the number is safe in the heading. "Stories" is the word the Newsroom tile already uses with strangers. The `nkey` line beneath (`Ordered by publication time, newest first — not by score`) stays. |
| `/` — `_switcher.mjs` (`liveHead(news, 'Ranked feed')`) | Ranked feed | Every story, ranked by score | RANKED FEED | A feed of what, ranked by what. The tile blurb ("Every story, scored on how many independent sources carried it") already has the words; they were in the wrong slot. |
| `/` — `_labs.mjs` | The watch floor | The frontier labs, monitored | THE WATCH FLOOR | Instrument-room register (`docs/FEAR.md` §11 lists it as a good name) that a stranger cannot place. The kicker's own word is "monitored" (`8 labs monitored · read 02:21Z`); the heading borrows it. |
| `/` — `_xwire.mjs` | The X wire | The labs’ posts on X | THE X WIRE | "Wire" is newswire jargon. The lede's first clause ("Posts from frontier labs and AI accounts") is the plain heading; "labs" is the shorter form of the same subject. |
| `/` — `index.mjs` | The record | The score over time | THE RECORD | "The record" is this site's word for its own history ("on record", "the frozen record") and reads as a noun with no referent to a first-time visitor. The section is the 45-observation composite line, fixed 0–100 axis. |
| `/` — `index.mjs` | Source health | keep | — | Plain: 14 sources, live / stale / awaiting a baseline, one row each. |
| `/` — `index.mjs` / `_parts.mjs` | The five pillars | keep | — | Plain, and the site's fixed vocabulary (`CONTRACT.md`). |
| `/` — `index.mjs` | Recent moves | keep | — | Plain, and each row is stamped and signed. |
| `/` — `index.mjs` | Put the index on your site | keep | — | Plain. |
| `/` — `index.mjs` | Public JSON API | keep | — | Plain. |
| every page — `layout.mjs` footer | Pages / Data / Provenance | keep | — | Footer navigation; plain. |

### `/race` — `racePage.mjs`

| page | current | proposed heading | proposed eyebrow | why |
|---|---|---|---|---|
| `/race` | `<h1>` The AI race | keep | — (already `Compiled <stamp>` and the market name) | Agrees with the nav tile `The Race`. Plain. |
| `/race` | The whole board | How the odds are split | THE WHOLE BOARD | "Board" is a bookmaker's word. The section is the stacked bar of every leg of the one year-end market — every lab's share of the odds, summing to 1.0115. The `rnote` beneath already explains the sum. |
| `/race` | The field | Every lab on one axis | THE FIELD | Racing jargon for the runners. The lede's own first clause ("Every lab on the board, on one absolute 0–100% axis") is the plain heading. |
| `/race` | Seven days | Seven-day change, per lab | SEVEN DAYS | Seven days of what. The section is two observations per lab — now and a week ago — joined by a line, and the lede says there is no curve because `race.json` holds no series. |
| `/race` | The leaderboard | keep | — | Plain. |
| `/race` | How this is computed | keep | — | Plain. |
| `/race` | Instrument health | Source health | — (none: this is a synonym, not a name) | It is the same section as the homepage's `Source health` — eight sources, each live or dark — under a different word. One name for one thing; "instrument" reads as hardware to a stranger. |

### `/news` — `newsPage.mjs`

| page | current | proposed heading | proposed eyebrow | why |
|---|---|---|---|---|
| `/news` | `<h1>` AI signal feed | The newsroom | AI SIGNAL FEED | The reader pressed a tile labelled `Newsroom`. "Signal feed" is the engine's term for the corpus; it survives as the eyebrow because the Index tile blurb still says "the live signal feed". The lede's first sentence ("Every item DOOMCON scored in the current collection window") stays and says what is on the page. |
| `/news` | Collection window | keep | — | Plain: the window the items were collected in, with its stamp. |
| `/news` | Highest-scoring items | keep | — | Plain. |
| `/news` | The shape of this window | How the scores are spread | THE SHAPE OF THIS WINDOW | "Shape" is statistics for a distribution. The section is a histogram of item scores, stacked by pillar; the lede beneath defines bar height and position. |
| `/news` | All items | keep | — | Plain; the kicker carries the counts. |
| `/news` | Where these came from | keep | — | Plain. |

### `/digest` — `digestPage.mjs`

| page | current | proposed heading | proposed eyebrow | why |
|---|---|---|---|---|
| `/digest` | `<h1>` The daily brief | keep | — | Agrees with the nav tile `Digest`; plain. |
| `/digest` | The brief | keep | — | Under the `<h1>` it is clear, and the stat chips beside it carry the counts. |
| `/digest` | What changed | keep | — | Plain. |
| `/digest` | Streaks and records | keep | — | Plain. |
| `/digest` | Every frontier lab, last 3 days (the 200-item cap, not the 7-day window) | Every frontier lab, last 3 days | — | Not opaque, but thirteen words: the only heading on the site over eight. The parenthetical is a caveat about the window and belongs in the lede beneath, which already begins "45 of 200 items in the corpus…". |
| `/digest` | How this page is computed | keep | — | Plain. |

### `/history` — `history.mjs`

| page | current | proposed heading | proposed eyebrow | why |
|---|---|---|---|---|
| `/history` | `<h1>` A sourced history of the AIpocalypse — and of the people who tried to measure it | keep | — (already `Field notes · 26 dated entries · 6 threads`) | An essay title. "AIpocalypse" is the coinage `VOICE.md` §1 sanctions *in the voice*, and here the strapline and the lede frame it in the next two lines. (It is removed from the meta description, where nothing frames it — see `site/brand.mjs` `DESCRIPTION`.) |
| `/history` | I · The idea arrives before the machines do | keep | — (already the numeral) | Numbered chapter with a deck sentence beneath; describes the argument, not an outcome. |
| `/history` | II · The precedent nobody in AI can stop citing | keep | — | As above. The deck names Asilomar in its first line. |
| `/history` | III · The argument acquires a shape | keep | — | As above. |
| `/history` | IV · The capability jumps | keep | — | As above. |
| `/history` | V · The field signs its name | keep | — | As above. |
| `/history` | VI · Governance acquires dates | keep | — | As above. |
| `/history` | The paperclip, properly attributed | The paperclip maximizer, properly attributed | — | "The paperclip" alone assumes the reader already knows the thought experiment; naming it costs one word. Five words. |
| `/history` | The scale, level by level | keep | — | Plain. |
| `/history` | What this index does not claim | keep | — | Plain. |
| `/history` | What is actually counted | keep | — | Plain. |
| `/history` | Questions people actually ask | keep | — | Plain. |

### `/methodology` — words in `docs/METHODOLOGY.md`, rendered by `methodology.mjs`

| page | current | proposed heading | proposed eyebrow | why |
|---|---|---|---|---|
| `/methodology` | `<h1>` Methodology | keep | — | Plain. |
| `/methodology` | What the index measures — and what it does not | keep | — | Plain. |
| `/methodology` | The five pillars | keep | — | Plain. |
| `/methodology` | The arithmetic | keep | — | Plain. |
| `/methodology` | Anti-flap | Why the level does not flicker | ANTI-FLAP | Engineering jargon (hysteresis). The section is the six rules that stop the level oscillating across a boundary; the heading should say so in words. Six words, the one heading here allowed past five because every shorter form either claimed something ("holds steady") or lost the meaning. |
| `/methodology` | Missing data is never imputed | Missing data stays missing | NEVER IMPUTED | "Imputed" is statistics vocabulary. The section's own first line is the plain version ("not zero, not last-known-good, not interpolated"). "Never imputes" is the posture the site repeats everywhere, so it keeps the eyebrow. |
| `/methodology` | Receipts | The receipt behind every number | RECEIPTS | The brand's signature noun ("Nobody has a receipt") — but a stranger arriving at this section by anchor needs one clause of context, and the heading can carry it. |
| `/methodology` | How this index could mislead you | keep | — | Plain. |
| `/methodology` | Reproduce it yourself | keep | — | Plain. |
| `/methodology` | Attribution | keep | — | Plain. |
| `/methodology` | Limitations, stated plainly | keep | — | Plain. |

### `/map` — `mapPage.mjs`

| page | current | proposed heading | proposed eyebrow | why |
|---|---|---|---|---|
| `/map` | `<h1>` THE BUILD | Every mapped US datacentre | THE BUILD · A DOOMCON SUB-INDEX · DOES NOT FEED THE MAIN NUMBER | "The build" is industry shorthand for the datacentre build-out. The nav tile says `Map`. The question beneath ("Where are the datacentres, and what is the power and water around them doing?") stays. "Mapped" matters: the page counts OpenStreetMap objects, not buildings, and says so in its second sentence. |
| `/map` | What this map cannot show you | keep | — | Plain. |
| `/map` | The map | keep | — | Plain; the count sits beside it. |
| `/map` | What one pin says | keep | — | Plain. |
| `/map` | The water | Drought, by county | THE WATER | On this page "the water" is the US Drought Monitor category of each pin's county — the colour of every dot. On `/watts` the same heading means river flow. Two sections, one name, two measurements. |
| `/map` | The power | The grid under each pin | THE POWER | The section assigns every pin to a balancing authority and says whether that grid publishes a live number. "Power" names the subject, not what is measured. |
| `/map` | The largest tagged sites | keep | — | Plain, and the lede says exactly what "tagged" excludes. |
| `/map` | How this was built, and what is wrong with it | keep | — | Plain. |
| `/map` | Watts — the infrastructure index | The infrastructure index | SAME SUBJECT, DIFFERENT INSTRUMENT (already there) | The nav calls that page `Power`; "Watts" is its internal name and the lede already uses it in a sentence ("Watts asks how the substrate is holding up"). The eyebrow slot is occupied and stays. |

### `/flock` — `flockPage.mjs`

| page | current | proposed heading | proposed eyebrow | why |
|---|---|---|---|---|
| `/flock` | `<h1>` Plate readers | Number-plate cameras, mapped | PLATE READERS · A DOOMCON REGISTER · DOES NOT FEED THE MAIN NUMBER | The nav tile says `Cameras`. "Plate reader" is the industry's term (ALPR); the lede defines it in its first sentence ("a camera pointed at a road that reads every number plate"). "Mapped" for the same reason as `/map`: these are OpenStreetMap objects, and the page's whole argument is that a county with none mapped is not a county with none. |
| `/flock` | Read this before you read the map | keep | — | Plain. |
| `/flock` | The map | keep | — | Plain; the count sits beside it. |
| `/flock` | Jurisdictions | keep | — | Plain; `52/56` beside it. |
| `/flock` | Which way they look | keep | — | Plain. |
| `/flock` | What the tags actually carry | How complete the data is | WHAT THE TAGS CARRY | "Tag" is OpenStreetMap vocabulary. The section is field completeness across the 115,608 objects, and its lede says so ("the honest denominator for every figure on this page"). |
| `/flock` | Who is recorded as operating them | keep | — | Plain. |
| `/flock` | What this is not | keep | — | Plain. |
| `/flock` | Where this came from | keep | — | Plain. |

### `/watts` — `wattsPage.mjs`

| page | current | proposed heading | proposed eyebrow | why |
|---|---|---|---|---|
| `/watts` | `<h1>` Watts | The infrastructure index | WATTS · A DOOMCON SUB-INDEX · DOES NOT FEED THE MAIN NUMBER | The nav tile says `Power`. The lede's own first words are "The infrastructure index", and its second sentence ("The page is WATTS; the number on it is SUBSTRATE, five to one") exists to explain the two names — it now sits under a heading it agrees with. |
| `/watts` | Read this before the charts | keep | — | Plain. |
| `/watts` | The corridors | Nine datacentre regions | THE CORRIDORS | "Corridor" is the industry's word for a cluster (Data Center Alley). The lede says "Nine places where the American build-out actually is". Count is `CORRIDORS.length`; interpolate it if that table ever grows. |
| `/watts` | The grid | Overnight grid load | THE GRID | The section measures each grid's overnight floor. "The grid" names the subject, not the measurement. |
| `/watts` | The water | River flow at the gauges | THE WATER | Streamflow against the median for the date, at nine gauges. Distinguishes it from `/map`'s drought section of the same name. |
| `/watts` | The build-out | Filings that mention datacentres | THE BUILD-OUT | The section counts SEC and Federal Register documents — the page's own caveat is "counters count documents, not dollars". "Build-out" is industry shorthand; the heading should say what is counted. |
| `/watts` | Every source, every state | keep | — | Plain. |
| `/watts` | What this cannot tell you | keep | — | Plain. |
| `/watts` | Measured exclusions | Sources tried and left out | MEASURED EXCLUSIONS | The lede says exactly this: eight candidate sources requested against their live endpoints and left out, published rather than dropped. |
| `/watts` | How the number is made | keep | — | Plain. |

### `/bliss` — `blissPage.mjs`

| page | current | proposed heading | proposed eyebrow | why |
|---|---|---|---|---|
| `/bliss` | `<h1>` BLISS | The upside index | BLISS | The nav tile says `Upside`. BLISS is the scalar's name, as DOOMCON is, and stays as the eyebrow and everywhere the number is printed. The deck "The other ending." stays beneath. |
| `/bliss` | Both numbers, one axis | keep | — | Plain once the two numbers are named in the figure beside it. |
| `/bliss` | BLISS is awaiting its baseline | keep | — | Generated status line; the name is the number's own. |
| `/bliss` | The five pillars | keep | — | Plain. |
| `/bliss` | Every source, and what it read | keep | — | Plain. |
| `/bliss` | How this is computed | keep | — | Plain. |

### `/exploits` — `exploitsPage.mjs`

| page | current | proposed heading | proposed eyebrow | why |
|---|---|---|---|---|
| `/exploits` | `<h1>` Disclosure to catalogue | Exploit lag, in days | DISCLOSURE TO CATALOGUE · A DOOMCON MEASUREMENT · NULL RESULT | "Disclosure" and "catalogue" are the two feeds' terms of art (NVD publication, CISA KEV). The sub-line ("Days from a CVE record going public to the US government listing it as exploited") stays and defines the lag. |
| `/exploits` | The series | The lag over time | THE SERIES | Statistics word for the chart's data. It is the lag per cohort since 2022-07-01, n = 719. |
| `/exploits` | The artefact, and why it is one | The collapse is a backlog | THE ARTEFACT | "Artefact" is statistics for a feature of the data that is not a feature of the world. The section's own claim, in its first lines, is that the apparent collapse from 1,616 days to 8 is a new catalogue clearing a backlog. |
| `/exploits` | One entry, in full | keep | — | Plain. |
| `/exploits` | What this data cannot do | keep | — | Plain. |
| `/exploits` | Where this came from, and how to recompute it | keep | — | Plain. |

### `/leaders` — `leadersPage.mjs`

| page | current | proposed heading | proposed eyebrow | why |
|---|---|---|---|---|
| `/leaders` | `<h1>` The leader wire | AI leaders, on the record | THE LEADER WIRE | "Wire" is newsroom jargon. The lede says it plainly: "What the people running AI said on the record in the last 7 days, in the words their publications printed." |
| `/leaders` | What this page never does | keep | — | Plain, and the most important section on the page. |
| `/leaders` | The roster | keep | — | Plain. |
| `/leaders` | Cross-check against the watch floor | Cross-check against the lab feeds | THE WATCH FLOOR | Refers to the homepage section by its insider name. Once that heading is plain this one should use the plain referent; the floor measures "feeds we may lawfully fetch", as the lede says. |
| `/leaders` | How a line gets here | keep | — | Plain. |

### `/moves/<id>` — `move.mjs` (46 pages)

| page | current | proposed heading | proposed eyebrow | why |
|---|---|---|---|---|
| `/moves/<id>` | `<h1>` DOOMCON 4 holds at 41.1 | keep | — (already `Index moves · <day>`) | Generated, plain, and already a working example of the pattern. |
| `/moves/<id>` | Pillars at this observation | keep | — | Plain. |
| `/moves/<id>` | Inputs | keep | — | Plain; the lede says dark sources are listed and excluded. |
| `/moves/<id>` | Receipt | keep | — | The brand noun, and the first sentence beneath defines it (hash-chained, SHA-256, `prev_hash`). |

### `/item/<slug>` — `itemPage.mjs` (201 pages)

| page | current | proposed heading | proposed eyebrow | why |
|---|---|---|---|---|
| `/item/<slug>` | `<h1>` the story's headline, verbatim | keep | — (already the stamp and source) | Reproduced exactly as the publication printed it; never edited. |
| `/item/<slug>` | The score | keep | — | Plain; the table beneath is the arithmetic. |
| `/item/<slug>` | Corroboration | How many sources carried it | CORROBORATION | The Newsroom tile already sells the page in these words ("scored on how many independent sources carried it"); "corroboration" is the engine's field name. |
| `/item/<slug>` | Related in this window | keep | — | Plain. |

### `/embed.html` — `embed.mjs`

No `<h1>` or `<h2>`. The widget's `title` attribute carries `brand.DISCLAIMER`.

## What this does not change

- The level names DORMANT / ROUTINE / ELEVATED / ACCELERATED / UNPRECEDENTED and
  their epithets. They are the instrument's vocabulary, `CONTRACT.md` fixes
  them, and the build refuses to ship if they disagree with `state.json`. The
  plain-words layer for those lives in `brand.LEVELS[].gloss`, which now says
  which end of the scale each level is.
- The pillar names. Same reason.
- Any kicker, lede, `nkey` or `rnote` beneath a heading. The words a reader
  needs were already there; this file moves the heading to meet them.
- `docs/OVEN.md` §1 "On the name" stays true: the component still ships as the
  oven — in the eyebrow.
