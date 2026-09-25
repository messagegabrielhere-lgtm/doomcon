# Card designs — the five images

Every card DOOMCON has ever made has been invisible.

`collector/card.mjs` emits SVG. X does not render SVG in a post. So every post
this project has sent has gone out as text, and an image post occupies several
times the vertical space of a text post in a feed — which makes "is there a
picture" the single largest lever on whether anybody stops scrolling.

This file is the five designs that fix it, the data each one reads, the rule for
when it is posted, and the argument for the order they are ranked in.

```
collector/cards/_kit.mjs        the grid, the draw-op seam, the render, the audit
collector/cards/_chassis.mjs    the frame all five share
collector/cards/_tilemap.mjs    the United States as 51 squares
collector/cards/drought.mjs     1. the drought card
collector/cards/race.mjs        2. the race card
collector/cards/map.mjs         3. the map card
collector/cards/developing.mjs  4. the developing card
collector/cards/level.mjs       5. the index card
collector/cards/index.mjs       the barrel; DESIGNS is in ranked order
collector/cards/render.mjs      render everything from data/
collector/cards/selftest.mjs    determinism, the voice bans, the charset
```

Everything below was rendered and looked at under
`docker run --rm -v "$PWD":/app -w /app node:20-alpine node …`, because Node is
not installed on the operator's machine (`CONTRACT.md` §1).

---

## 1. The ranking, and the argument for it

The brief asks which of these would actually stop a thumb. This is not the order
the brief listed them in, and it is not the order they were built in.

| # | card | the thumb-stopper | the risk |
|---|---|---|---|
| 1 | **drought** | a map nobody else publishes, of a join nobody else makes | its source is dark; see §3 |
| 2 | **race** | eight famous names and a scoreboard, priced in real money | the one most likely to be screenshotted out of context |
| 3 | **map** | the shape of American compute; one state holds 22% of it | none; it is the safest card here |
| 4 | **developing** | a named incident with a corroboration count on it | it must never read as a risk score |
| 5 | **index** | the instrument itself, on a calm day | it is the least surprising, by design |

**1. Drought.** A map is the most shareable object on the internet, and this is
the only one of the five whose central fact exists nowhere else. OpenStreetMap
publishes the buildings. The US Drought Monitor publishes the counties. Nobody
puts them in the same table. It is ranked first on the strength of the fact and
in spite of the fact that it cannot be drawn today.

**2. Race.** A league table with Amodei, Altman, Hassabis and Musk on it is an
argument, and on X's open ranker a reply and a quote are weighted far above a
like. A card that somebody wants to be wrong outperforms a card that is merely
interesting — and here that costs no honesty at all, because every figure on it
is somebody else's money at risk rather than our opinion.

**3. Map.** Ranked above the two live-news cards for four reasons, argued in the
module's own header: it is the only card that is a *picture* rather than a
figure with furniture round it; it is the renderable proof of card 1, in the
same 51 squares and the same chassis, so the audience is trained on the picture
before the drought join returns; it carries the project's best sentence
(*a datacentre missing from this map means nobody mapped it, not that it does not
exist*) in the only place that sentence counts; and it is the one design with
no marginal cost per post — the total moves every run and the top of the table
almost never does, so it can be a monthly habit without ever being stale.

**4. Developing.** Real news, and the only card with a named company and a named
incident on it. It is fourth rather than second because it is the card whose
failure mode is worst: a severity term firing is a fact about the words in a
headline, and a reader who takes it for a risk score has been misled by us.

**5. Index.** Last on thumb-stopping power and first on why the account is worth
following. It fires every day at any level, and a boring day is most days. An
index that only speaks when it is alarmed reads as a hype account.

---

## 2. What every card carries, and where it is enforced

The brief's rules are checked rather than asserted. `auditCard()` in
`_kit.mjs` throws; it does not warn. Seven checks:

| # | rule | how it is enforced |
|---|---|---|
| 1 | nothing outside the 72px gutter | every text op measured against the column; a round cap may overhang by at most half the gutter, and no ink may leave the card |
| 2 | the number is the hero, enormous | exactly one op carries `role:'hero'`, at 150px or more |
| 3 | the domain is burned in | one op carries `role:'domain'` |
| 4 | an exact UTC clock | one op carries `role:'stamp'` and must match `\d\d:\d\d UTC` |
| 5 | the limitation is on the face | one op carries `role:'limit'` |
| 6 | readable at a 200px thumbnail | every `role:'hero'` and `role:'thumb'` op must stay above 9px cap height at 200/1080 |
| 7 | **no two lines of type may touch** | pairwise box test over every text op |

Check 7 is the one that earned the audit its keep. Every collision found while
building these — a hero's cap clipping the eyebrow above it, a limitation box
landing on the source ledger, an eight-row scoreboard growing under the
limitation — was invisible in the source and obvious the moment it was
rendered. That is the same argument `docs/BRAND.md` §2.3 makes for its own
harness, and it held again here.

`selftest.mjs` adds four more that are not about how a card looks:

- **Determinism.** Two builds of one design from the same bytes must produce
  byte-identical PNGs. `CONTRACT.md` §4.
- **No `Math.random()` and no unseeded clock call** in any card source, checked
  by reading the files rather than by hoping the test hit the branch.
- **The voice bans.** Every string a card sets goes through the same
  `findFutureViolation()` and `findUrlViolation()` that gate post copy. *A card
  is post copy that happens to be a picture*, and the bans do not stop applying
  because the letters are drawn rather than typed.
- **The charset.** Every string must be settable by `site/cardpng.mjs`, and a
  line carrying somebody else's words must not be losing characters to it.

### 2.1 Type

Capitals, tracked, for labels — an instrument's silkscreen. Sentence case for
anything that is a sentence, because `site/cardpng.mjs` carries a real
mixed-case face and setting a headline in capitals throws away the word shapes
a reader uses to skim. A name is set the way its owner sets it: *Anthropic*, not
*ANTHROPIC*. A headline is set verbatim.

The audit's type-collision check needs to know how far below the baseline a
line actually reaches, and charging every line the font's full descender makes
a row of digits claim 28% more height than it occupies. `descentOf()` is three
cases: full descender for `gjpqy$Q()[]{}@_`, a tenth of cap for `,;`, and a bare
overshoot for everything else. The hero is why: `73.5%` reaches nothing below
the baseline and `1,877` reaches only a comma's tail.

### 2.2 Colour is never the reading

`docs/BRAND.md` §5's rule, applied card by card. Desaturate any of these five
and no fact is lost:

- the **level rail** lights from the calm end up to the live stop, so it is a
  **count** (two lit of five) and a **weight** (lit at full, unlit at 30% alpha)
  before it is ever a hue, and the live stop also carries a bar under it.
- every **tile** on the map carries its postal code, its figure, and a **notch
  count** down its left edge — one notch per bucket step, so the ramp reads as
  1..5 marks in greyscale. The legend prints the notches beside every swatch.
- every **severity chip** prints its tier as the letter A, B or C.
- every **scoreboard row** carries a rank numeral and a printed percentage; the
  lab's hue is a 6px bar and nothing depends on it.
- the **awaiting-baseline** pillar is dotted and says
  *Awaiting a frozen baseline* in words. **Dotted** means *this is there and we
  cannot score it yet*. **Dashed** — which only the limitation box uses — means
  *this is not there*. `docs/VOICE.md` §4 forbids merging them and this set does
  not.

### 2.3 The two sizes, and the one that matters

Cards render at **1080 × 1350** — `site/cardpng.mjs`'s own `FORMATS.portrait`,
which is 4:5, the tallest aspect X shows in-feed without cropping a single
image. Taking cardpng's format rather than a private one means a card and a
cardpng card are the same object.

Every design is also rasterised at **200px wide** from the same op list, and
that render is the legibility audit. What is inspected is what a phone shows,
not a downsampled guess. It is also what decides which lines may carry
`role:'thumb'`: on the drought card, for instance, only the share and the
D2-or-worse count survive at 200px, so only those two are tagged, and the
supporting prose is not pretending to.

### 2.4 The domain that gets burned in

`docs/BRAND.md` §1.6 flags this as an open item and it is the same one here.
`brand.DOMAIN` is `doomcon.watch`, which `docs/COMPETITIVE.md` §1.4 measured as
**not resolving**. An image is the surface most likely to be looked at long
after it was made, by somebody with no other route back to us, so the default is
the address that actually serves the site today, **derived from
`brand.CANONICAL_URL` rather than typed**:

```
messagegabrielhere-lgtm.github.io/doomcon
```

It is a parameter. The day `doomcon.watch` resolves, `cardDomain()`'s default
changes and all five cards follow — one line, exactly as `CONTRACT.md` §Brand
asks.

---

## 3. Card 1 — THE DROUGHT CARD

`collector/cards/drought.mjs` · kind label **THE GROUND THEY SIT ON**

### Reads

```
data/datacenters.json
  .sites[].resources.drought.{granularity, county_fips}
  .resources_index.drought_by_county[fips].headline.{category, area_pct}
  .resources_index.usdm_map_date
  .counts.{sites, with_county_drought}
  .sources[] where id === 'usdm-county'
data/state.json  .level                    (the masthead lamp only)
```

### The picture

The hero is the **share**, at 160px. Beside it, `N OF M` mapped sites carrying a
county reading, and under that the D2-or-worse count in the extreme hue. Under
both, the coverage line and the Drought Monitor's own map date — a different
clock from the observation stamp, and printed as such. Then the 51-square grid,
shaded by the **worst category present in that state's datacentre counties**,
with the count of that state's sites in drought printed in each tile.

### It declines today, and there is no fallback

As of the run that produced `data/datacenters.json` at **2026-09-25T12:27:14Z**:

```
sources[usdm-county].state   = "degraded"
sources[usdm-county].error   = "network error: fetch failed: https://usdmdataservices.unl.edu/api/CountyStatistics/…"
resources_index.drought_by_county = {}
counts.with_county_drought   = 0
infra.json sources[usdm-drought].state = "dark"
```

`shouldPost()` returns:

```
usdm-county is degraded, so the county join is not there
(network error: fetch failed: https://usdmdataservices.unl.edu/api/CountyStatisti…)
— with_county_drought=0
```

**The brief's figures — 1,350 of 1,877, 72%, 534 in D2+ — are not computable
from the live file.** Every site in it carries
`resources.drought = { granularity: "state" }` and no category. Those numbers are
not hardcoded anywhere in this module and there is no code path that produces a
plausible substitute, because a drought card with imputed drought on it is the
one failure that would cost more than the card is worth.

### The denominator is the joined sites, not all of them

The county join covers the counties the collector asked about, which is not every
county in the country. Printing *"72% of US datacentres"* when the reading covers
a subset is the exact move this site exists to be better than. So the card prints
both: `N of M` with a county reading, and separately `county reading on M of
ALL mapped sites`. `MIN_COVERAGE` is 0.60 — below that, a share is a fact about
the collector's county list and the card declines rather than printing it.

### The lie this card is one edit away from

*"Datacentres are draining drought counties."* That is what a reader wants the
picture to say, it is what a hostile quote-tweet will accuse us of saying, and
it is not in the data. Nothing this project reads measures a site's water draw —
no public feed publishes it, for any site, at any cadence. So the limitation is
a dashed box on the face of the image:

> Nothing here measures a datacentre's water draw; no feed publishes it.
> Drought is the share of a county's area, judged weekly.

### When it posts

Weekly, on the morning after the Drought Monitor's Thursday release, **and only
when `usdm-county` is live and coverage clears 60%.**

### Verified

Geometry and audit verified against a **synthetic fixture** (categories hashed
from county FIPS) written to the scratchpad, never to `data/`, and not shipped.
It clears all seven audit checks at 1080×1350 and at 200px. **Every drought
figure in that render is fake and none of it may ever be posted.** The moment
the endpoint answers, the card renders from real numbers with no code change.

---

## 4. Card 2 — THE RACE CARD

`collector/cards/race.mjs` · kind label **THE MARKET, NOT US**

### Reads

```
data/race.json
  .rank_basis.{ok, event.{title, volume_usd}}
  .markets.polymarket.horizon.legs[]
  .players[].{id, name, principal, principal_role, market.{state, probability, change_7d}}
data/state.json  .level
```

### The picture

Hero: the leader's probability at 180px, in that lab's own hue
(`docs/BRAND.md` §4.3). Under it the lab, the principal by name and role, and
the 7-day move. Then all eight legs as a scoreboard — rank numeral, lab bar,
lab, principal, a bar scaled to the leader, and the price. Under that, the money.

### The line it does not cross

`docs/BRAND.md` §3.1 draws it. These are market prices on one Polymarket
question. They are not DOOMCON's ranking, they are not a DOOMCON forecast, and
none of it feeds the index. That is said **three times on the face of the
card** — in the kind label, in the standfirst, and in the limitation box —
because this is the card most likely to be screenshotted out of context and
attributed to us.

Alibaba Qwen publishes `"principal": null`, and the row prints
`NO PRINCIPAL PUBLISHED` in the faint ink rather than reinstating a name from a
lab-id table. *We have not published a name* is a different statement from
*there is nobody*, and `docs/BRAND.md` §3.3 holds that line on the site.

Prices below one point print two decimals. Rendering Mistral's 0.0015 as
`0.2%` is a rounding that reads as a measurement; `0.15%` is the figure.

### When it posts

When the top leg moves `MOVE_POINTS` (4) or more in 7 days, and on a fixed
weekly slot otherwise, so the table is a habit rather than an alarm.

### Rendered, from data/race.json generated at 2026-09-25T12:26:57.886Z

```
question   Which company has best AI model end of 2026?
hero       73.5%   Anthropic   Dario Amodei, CEO   Up 1.0 points in 7 days
 1 Anthropic        Dario Amodei              73.5%
 2 OpenAI           Sam Altman                 9.5%
 3 Google DeepMind  Demis Hassabis             9.5%
 4 xAI              Elon Musk                  2.8%
 5 Meta AI          Mark Zuckerberg            1.8%
 6 Alibaba Qwen     No principal published     0.80%
 7 DeepSeek         Liang Wenfeng              0.55%
 8 Mistral          Arthur Mensch              0.15%
money      $1,403,490 traded on this question · 8 of 15 legs priced live
```

> **The brief's figures have drifted.** It gives OpenAI 12.5%, DeepMind 10.0%
> and xAI 2.4%. The live file gives 9.5%, 9.5% and 2.75%. The card reads the
> file. Nothing is typed.

---

## 5. Card 3 — THE MAP CARD

`collector/cards/map.mjs` · kind label **WHERE THE COMPUTE IS**

### Reads

```
data/datacenters.json  .counts.{sites, by_state, by_status}, .sources[] where id === 'osm-overpass'
data/state.json        .level
```

### Why a tile grid and not a map

Three reasons, in order of how much they mattered.

1. `CONTRACT.md` §1 forbids npm dependencies, and an outline map means shipping
   a TIGER or Natural Earth geometry and a projection. The tile grid is a
   51-row table of `[column, row]` integers — about 400 bytes — and it is the
   whole map.
2. It survives the 200px thumbnail. An outline map loses Rhode Island, Delaware
   and DC at any size a phone shows in a feed, and those are three of the cells
   with the most datacentres per square mile in the country.
3. It is nobody's decoration. The same 51 squares serve this card and the
   drought card, so the two are visibly the same instrument pointed at two
   joins.

**The cost, stated.** A square is not a state. Texas and Rhode Island are the
same size here. That distortion is what makes it readable and it is the first
thing a critic will say, so it is printed on the face:
*One square is one state, not one area.*

A state with no pins gets the **dotted empty frame** — `docs/BRAND.md` §3.3's
device — and the card says what it means: *a state nobody mapped*. Today that is
AK, DE, HI and RI.

The ramp is a neutral grey-to-white. On this site amber, green, blue and red all
already mean something and "how many buildings" is not one of those things.

### When it posts

Monthly, and whenever a state's count crosses a bucket boundary.

### Rendered, from data/datacenters.json generated at 2026-09-25T12:27:14.983Z

```
hero    1,877  Datacentres OpenStreetMap has mapped in the United States
        407 in VA alone · 22% of all
top     VA 407 · TX 235 · OR 135 · CA 117 · OH 93
status  1,769 operating · 95 under construction · 13 announced
tiles   47 states plus DC carry a figure; AK, DE, HI, RI are dotted
bands   1-9 · 10-29 · 30-74 · 75-149 · 150+
```

---

## 6. Card 4 — THE DEVELOPING CARD

`collector/cards/developing.mjs` · kind label **DEVELOPING**

### Reads

```
data/news.json  .stories[].{id, source_count, severity, severity_terms[], span_hours, members[], lead}
                .items[] joined by id: {source, title, published_at}
data/state.json .level, .level_name
```

### The hero is the corroboration count, not the headline

That is the whole design. Every account in this category posts a headline. The
number that makes a headline worth more than a screenshot is **how many separate
newsrooms arrived at it independently, and how fast** — and that is the one thing
this project computes about a story. So `3` is 190px tall and the headline is set
underneath it at reading size. `docs/VOICE.md` §2 habit 4 says name the source in
the sentence; this card makes it the picture.

### The sentence it exists to not say

A severity term firing is a fact about the words in a headline. It is not a fact
about the world, it is not a risk score, and it does not move the DOOMCON level —
the newsroom is not one of the fourteen sources the index reads. The card says so
in a band of its own, above the limitation box, in the largest type it can spare.

Term chips print the tier as a **letter** before they print it as a hue.

The headline is somebody else's words. `fold()` reports every character the
stencil could not set, and a headline losing more than two is **refused** rather
than quietly altered.

### When it posts

When a cluster first reaches `MIN_SOURCES` (3) independent feeds inside
`MAX_AGE_HOURS` (36), at most once per cluster id. Two is the floor
`posts.mjs` already uses for corroboration; three is asked for here because a
card is louder than a post and should cost more. Candidates are ranked by
severity, then corroboration, then tightness, with ties broken by cluster id so
two runs over one file choose the same story.

### Rendered, from data/news.json generated at 2026-09-25T13:00:33.966Z

```
story   687b170d1a58      severity 1.00      3 independent feeds      span 4.1h
hero    3  Independent sources  ·  All within 4.1 hours
lead    OpenAI discovered the Australian breach in August but didn't alert the
        government until September 10, when it sent an email to a generic
        disclosure address (Shakeel Hashim/Transformer)        [set verbatim]
terms   A breach · A rogue · C disclosure · C incidents · A hacked · B attack
who     arstechnica-ai  16:01 UTC 24 SEP 2026
        techmeme        14:15 UTC 24 SEP 2026
        verge-ai        11:52 UTC 24 SEP 2026
band    The newsroom does not move the level. DOOMCON holds at 4, ROUTINE.
```

---

## 7. Card 5 — THE INDEX CARD

`collector/cards/level.mjs` · kind label **DAILY STATE**

### Reads

```
data/state.json  .level, .level_name, .score, .delta_from_previous, .previous_level,
                 .pillars[], .sources[], .post_suppressed, .generated_at
```

### It has to be good on a boring day

A boring day is most days. Three moves make a calm reading look like an
instrument working rather than like nothing happening:

1. **The numeral is the hero at 300px whatever it says.** A 4 is as large as a 1.
2. **The rail shows all five stops**, lit from the calm end up to the live one,
   so the eye gets *two of five lit, at the calm end* before it gets a hue.
3. **The source ledger is printed on the face.** `5 OF 14 SOURCES SCORED · 9
   AWAITING A FROZEN BASELINE · 0 DARK` is the most persuasive line on the card,
   because nobody volunteers that number unless the other five are real.
   `docs/VOICE.md` §6 example 3.

### When it posts

Daily, at the fixed slate time, at any level. It declines only when
`post_suppressed` is set (two or more pillars dark) or the composite is null.

### Rendered, from data/state.json generated at 2026-09-25T12:26:43.125Z

```
hero    4  ROUTINE     42.6 of 100  COMPOSITE
        Down 0.2 from the previous reading · band 35-54
rail    5 lit · 4 lit (live, barred) · 3, 2, 1 unlit at 30%
pillars Capability         43.7
        Compute & Capital  49.5
        Attention          42.8
        Governance         53.6
        Markets            Awaiting a frozen baseline   (dotted, never "dark")
ledger  5 of 14 sources scored · 9 awaiting a frozen baseline · 0 dark
limit   Observed activity tempo against this index's own frozen reference
        distribution. Not a probability of harm. Not a prediction.
```

---

## 8. The seam, and what was assumed about `site/cardpng.mjs`

A card never draws. A card fills a `Surface` with abstract ops, and `render()`
replays that op list onto a `site/cardpng.mjs` surface. **cardpng owns pixels,
glyphs and the PNG container. This directory owns layout.**

### Why the seam exists at all, rather than calling cardpng directly

Because every op is recorded before anything is drawn, `auditCard()` can test
the finished layout — every line against the gutter, the hero against its
floor, every pair of lines against each other — and the same op list can be
replayed at 200px to check what a phone actually shows. A drawing call that
went straight to a canvas could not be asked any of those questions, and the
seven checks in §2 are the difference between a card that looks right in the
one case it was built against and a card that is still right on the day the
lead's name is *Google DeepMind* instead of *xAI*.

It is also what makes the ownership boundary real: `collector/cards/*` is
the only thing this pass may write, and nothing in it knows what a pixel is.

### What was assumed, and what it cost when the file landed

`site/cardpng.mjs` did not exist when this pass started
(`ls: site/cardpng.mjs: No such file or directory`), so the first version of
this kit carried its own rasteriser and its own 40-glyph stroke stencil — the
method `site/brandmarks.mjs` §1.5 had already proved, so the geometry could be
rendered and looked at rather than described. It landed mid-pass, and the kit
was ported onto it. What that cost, recorded because it is the honest measure
of how good the guess was:

| assumed | what cardpng actually declares | cost |
|---|---|---|
| a `{poly, disc, ring, rrect}` primitive set | `polyline / disc / circle / rect / strokeRect / polygon / gradient / arc / text / mark` | none — ours is a subset; `render()` is a 30-line switch |
| round caps and joins on every polyline | same | none |
| alpha over an opaque ground | same, and the PNG has no alpha channel | none |
| `size` is a cap height | same, stated in its §4 | none |
| a stroke stencil, capitals only | **a real mixed-case face**, with curly quotes, both dashes and the ellipsis | every layout re-tuned, and every design improved: headlines are now set verbatim rather than folded |
| a private 1200×1500 canvas | `FORMATS.portrait` is 1080×1350 | every coordinate re-tuned |
| a `scale` factor on the renderer | not offered | ours scales the op list instead, which is better: `render(s, { scale })` |
| no stroke-weight ceiling | `MAX_WEIGHT` 0.135, and it throws | one tile label was at 0.14 and is now 0.12 |

Two things it does that the guess did not reach for, and both are now used:
`surface.mark()` draws the detector from `site/brandmarks.mjs`, so a card
cannot show a different instrument from the tab it was opened in; and
`missingGlyphs()` names exactly which characters it cannot set, which is what
lets the developing card **refuse** a headline rather than quietly altering it.

### What this kit still owns, and why it should keep owning it

- **`Surface` and the op list.** Alignment is resolved at record time, not at
  draw time, so `auditCard()` can measure a finished box.
- **`auditCard()`.** Seven checks, listed in §2. It throws.
- **The grid**: `MARGIN`, `COL`, `BODY_TOP`, `FOOT_RULE`, `LIMIT_BOTTOM`.
- **`descentOf()`**, because the collision check is only as good as it is.
- **The three ramps** cardpng has no opinion about: `LAB`, `STATE_HUE`,
  `DRY_RAMP`. The ground, the inks and the heat ramp are re-exported from
  cardpng so a card cannot invent its own green.

### If cardpng changes

`render()` and `Surface.text`'s call to `measureText()` are the only two places
in this directory that touch it. A new primitive is a new case in `render()`.
**A change to the font's metrics is not cheap:** glyph widths decide every
`fit()` result and therefore every y-coordinate in the five designs. `auditCard()`
will catch the breakage rather than let it ship — that is what it is for — but
expect to re-tune, as this pass did when the stencil was replaced.
