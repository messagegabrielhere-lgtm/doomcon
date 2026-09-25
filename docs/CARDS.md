# CARDS — the PNG card pipeline

`site/cardpng.mjs`. A dependency-free renderer that produces PNG files X will
actually display, a font it draws them with, and three card designs built on
both. 1,545 lines, `node:zlib` and nothing else.

Every figure in this file was measured on 2026-09-25 against the live data
files, under
`docker run --rm -v "$PWD":/app -w /app node:20-alpine node …`, because Node is
not installed on the operator's machine (`CONTRACT.md` §1).

---

## 1. Why this exists

`collector/card.mjs` emits SVG. **X does not render SVG in a post.**

That is not a new discovery in this repo — `site/build.mjs:314` already warns,
in its own words, that *"X and most crawlers will not render an SVG og:image"*,
and `docs/COMPETITIVE.md` §1.4 records the resulting blank share card as our
largest single acquisition hole. `docs/BRAND.md` §1.5 took the first bite out of
it by growing a rasteriser for the favicon and one default OG image.

The consequence, until now: **every post has gone out as text only.** The cards
exist and have never been seen. An image post on X occupies several times the
vertical space of a text post, and vertical space in a feed is the whole
argument.

So this module generalises `brandmarks.mjs`'s ~180-line rasteriser into a
drawing API good enough for a card that is mostly words — which meant, first
and mostly, a font.

**Scope.** This file renders. It does not choose. Which card to make, which item
to put on it and what the post beside it says are `collector/posts.mjs`'s
business; the seam is `renderCard(name, data, opts) → Buffer`.

---

## 2. The drawing API

```js
import { surface, FORMATS, GROUND, HEAT } from './site/cardpng.mjs';

const S = surface(1200, 675, { background: GROUND });
S.rect({ x: 0, y: 0, w: 1200, h: 10, color: HEAT[4] });
S.text('DOOMCON 4', { x: 64, y: 200, size: 72, color: HEAT[4], weight: 0.105 });
const png = S.png();                       // Buffer
```

`surface(w, h, { background })` returns a chainable object. Y is down, the
origin is the top-left, **every coordinate is a device pixel**, and every method
takes one options object.

| method | draws | notes |
|---|---|---|
| `rect({x,y,w,h,r,color,alpha,clip})` | filled rectangle | `r` = corner radius |
| `strokeRect({…, width})` | stroked rectangle | stroke straddles the edge, as SVG's does |
| `gradient({x,y,w,h,r,from,to,stops,alpha})` | axial gradient, clipped to a (rounded) rect | `stops` = `[{at, color}]`, sRGB, any number |
| `line({from,to,color,width})` | round-capped line | |
| `polyline({points,color,width})` | round-capped, round-joined polyline | |
| `polygon({points,color})` | **filled** polygon | concave is fine; the SDF handles it |
| `disc({cx,cy,r,color})` | filled circle | |
| `circle({cx,cy,r,color,width})` | stroked circle | `r` is the centreline radius |
| `arc({cx,cy,r,from,to,color,width})` | stroked arc | degrees, y down, 0 = east, clockwise |
| `text(str, {x,y,size,color,weight,track,align,alpha,clip})` | one line; returns its width | `y` is the **baseline**, `size` is the **cap height** |
| `textBlock(lines, {…,leading})` | several lines, top-down | |
| `mark(level, {x,y,size,ground})` | the DOOMCON detector logo | the real geometry, imported from `brandmarks.mjs` |
| `png()` | → `Buffer` | RGB8, no alpha |

Every method takes an optional `clip: {x,y,w,h,r}`, a rounded rect the primitive
is multiplied against — so a bar can sit inside a panel without running past its
corner.

### 2.1 How it draws

Unchanged in principle from `brandmarks.mjs` §4, and `docs/BRAND.md` §1.5 is the
argument: **analytic coverage, not supersampling.** Every primitive has a cheap
exact signed distance, so a pixel's coverage is `clamp(0.5 − d, 0, 1)` with `d`
in device pixels. That is the antialiasing a real rasteriser produces, with no
sample budget at all, and it is the reason a 19px pillar label comes out clean
rather than chewed.

Three things are new over `brandmarks`:

- **a filled-polygon SDF**, so the module can draw solid shapes and not only
  strokes. The distance and the inside/outside test share one pass over the
  edges, so a fill costs what a stroke costs.
- **the axial gradient** — see §2.3.
- **a PNG row-filter heuristic** — see §2.2.

### 2.2 The PNG encoder, and why it grew a filter heuristic

`brandmarks.mjs` writes RGBA with filter 0 on every row. That is right for a
64px icon, which is mostly flat ground. A 1200×675 card is mostly smooth panel
fills and a gradient, where the standard minimum-sum-of-absolute-differences
heuristic picks filter 2 (Up) and collapses a row to near-zero.

Two changes, both worth their twenty lines:

- **colour type 2 (RGB), not 6 (RGBA).** A card is opaque by definition. Dropping
  the alpha channel takes a quarter off the raw stream before deflate sees it.
- **per-row filter selection.**

Result: **107–203 KB** per card, against X's 5 MB limit. Deterministic, because
zlib's deflate is a pure function of its input and its level.

### 2.3 The gradient earned its keep; a radial one did not

A gradient is one dot product per pixel and reuses the rounded-rect coverage
test the module already has, so it is about fifteen lines. It is used once, for
the wash of the level's hue under the stripe on every card — so even the one
decorative element is downstream of the reading.

**A radial gradient is refused, deliberately.** It needs its own coverage story
(a radial fill inside a rounded rect is two SDFs, not one), it wants dithering
to avoid banding on a near-black ground, and there is no card design that wants
one. The cost is not worth it. If a design ever needs one, it is about twenty
more lines in `paint()` and this paragraph is where to delete the refusal.

### 2.4 What it cannot do

Stated here rather than discovered later. There is **no** blur, shadow, blend
mode, image compositing (it cannot place a photo or another PNG), clipping to
anything but a rounded rect, dash pattern (dashes are drawn as separate
primitives — see `pillarRow`'s dark state), or bitmap scaling.

---

## 3. THE FONT — "DOOMCON Signal"

**The decision: a monoline centreline font, drawn from scratch in this file.**

A card is mostly words, and there is no font library here. Every glyph is a set
of **centrelines**, stroked at a single weight, the way a technical lettering
set, a Hershey font, or the engraved panel of any instrument ever built is
drawn.

### 3.1 Why centrelines and not filled outlines

An outline font is roughly twice the geometry to draw by hand per glyph, and it
needs a fill rule with counters. A centreline font needs neither, and it renders
through the capsule SDF the rasteriser already had. Curves cost nothing extra —
a flattened curve is a polyline, and a polyline is already the cheapest thing
this rasteriser draws — which is the single fact that let this module have real
letterforms instead of the chamfered stencil in `brandmarks.mjs` §5.

The two fonts are **not** merged. `brandmarks.mjs`'s 40-glyph stencil sets six
short lines on one OG image and is the register of a stencilled equipment case;
this one is a working face with lowercase, a real 's', accents and a slashed
zero. Body copy on the site is still Inter Tight and JetBrains Mono, set by the
browser. Nothing here touches either.

### 3.2 Metrics

In glyph units. Everything scales from cap height, and **`size` in every API
call is the cap height in device pixels, never an em** — an em is a container,
cap height is what a reader sees.

```
y = −4.4   uppercase accents
y =  0     CAP LINE        uppercase, digits, and the b d f h k l ascenders
y =  4     X-HEIGHT LINE   x-height is 10/14 = 0.714 of cap
y = 14     BASELINE
y = 18     DESCENDER
```

A 0.714 x-height ratio is high — Helvetica is about 0.72, Futura about 0.62 —
and it is the single metric that carries the small sizes. It is the reason a
19px pillar label still reads.

Advances are proportional, **except the ten digits, which are tabular at 13
units each**. A score that ticks from 42.6 to 42.7 must not reflow the line
under it, and `docs/VOICE.md` §2 habit 2 puts a number next to a noun on nearly
every surface this module draws — so the typographic answer and the honesty
answer are the same answer.

Recommended leading is `LEADING = 1.42` of cap height, which is about 1.0 em in
a normal font: tight-but-normal for a display line.

### 3.3 The limits, stated plainly

**WEIGHT IS A SETTING, NOT A DESIGN.** There is no true bold, no italic and no
stem modulation. A centreline font has exactly one axis and this is the price
of §3.1.

- `weight` is stroke width as a fraction of cap height. **0.085** is the text
  weight, **0.105** a medium, **0.12** as heavy as the counters of `e a s 6 8`
  tolerate.
- Above **0.135** those counters close and the word turns into a blob, so
  `surface.text` **throws** rather than drawing it.
- Emphasis therefore comes from **size and hue**, not from weight. That is why
  every card design below is built on a size hierarchy.

**It is a display and instrument face, not a text face.** It is designed at a
22px cap height and up. The three designs put nothing below 22px that carries a
fact — a layout rule, not a rendering one.

There is **no kerning**: no pair table, no shaping, no ligatures, no bidi, no
hyphenation dictionary. `Av` and `To` sit a touch loose. At card sizes on a dark
ground this is invisible; at 12px it would not be, which is another reason for
the 22px floor.

**The zero is slashed.** Deliberate, and consistent with `brandmarks.mjs`, which
slashes its zero for the same reason: this is an instrument face and `0` must
never be `O`. It shows up in `$100M` and in `of 100`. If that ever reads as too
much, the glyph is one line in the table.

### 3.4 Character coverage

**109 glyphs in the table, plus NFD composition.**

```
A–Z  a–z  0–9
space . , : ; ! ? ' " ( ) [ ] { } - / \ | _ + = < > * # @ $ % &  ^ ~
’ ‘ ” “  – — −  · • …  ° × → ↑ ↓
```

Accented Latin is **not** stored precomposed. A character the table does not
hold is decomposed with `String.normalize('NFD')`, and if the base glyph is
present and the combining mark is one of

```
U+0300 grave   U+0301 acute   U+0302 circumflex   U+0303 tilde   U+0304 macron
U+0306 breve   U+0307 dot     U+0308 diaeresis    U+030A ring    U+030B double acute
U+030C caron   U+0327 cedilla
```

it is composed on the fly — the mark centred on the base's inked width, raised
for an uppercase base. Eleven short paths therefore cover most of Latin-1 and
Latin Extended-A, which is the difference between `Björn Ommer` setting and this
module throwing on a real byline.

**Measured against the live corpus:** every character of all 200 headlines in
`data/news.json`, their summaries, and every lab and principal name in
`data/race.json` — **69,847 characters — sets completely.** That run is what
added `~ ^ { }`, which are the four it was missing.

What it does **not** cover: CJK, Cyrillic, Greek, Arabic, Hebrew, emoji, and the
non-decomposing Latin letters `ß æ œ ø đ ł þ`. Every one of them **throws**.

### 3.5 Rule 1: a missing glyph throws

```
cardpng: the font has no glyph for "世" (U+4E16), "界" (U+754C)
  — needed by surface.text: "hello 世界"
```

It never drops a character and ships a headline with a hole in it. The throw
names the character, its code point, and the call site, at the moment the card
is **built** — not at the moment somebody looks at it on a timeline.

`canSet(text)`, `missingGlyphs(text)` and `assertCanSet(text, where)` are
exported so a caller can check before it commits to a design. `charset()`
returns the table's keys.

---

## 4. Setting text

```js
measureText(text, { size, track })                 → px width
wrapText(text,   { size, track, maxWidth })        → string[]
fitText(text,    { from, to, maxWidth, maxLines }) → { size, lines }
fitBlock(text,   { from, to, maxWidth, maxHeight, leading })
                                                   → { size, lines, height }
```

`track` is extra letter-spacing as a fraction of cap height; the font's own fit
is `0.02`, and the all-caps labels on the cards run at `0.10–0.24`.

### 4.1 Rule 2: a line that does not fit throws

`fitText` steps the cap height down **a whole pixel at a time** until the text
wraps into `maxLines`, and throws when it runs out of ladder. `fitBlock` does
the same against a **box height** instead of a line count — a card's text box
has a bottom edge, which is the thing under it, so the honest constraint is a
height, and trading a point of size for a fourth line is exactly the decision a
person makes by hand.

Whole pixels rather than a continuous scale, so two builds of the same string
land on the same size and the bytes match (`CONTRACT.md` §4). Same discipline as
`collector/card.mjs`'s `fitSize()`/`auditCard()` pair and
`brandmarks.ogImagePng()`, for the same reason: a line running off the edge of a
share card is a defect nobody sees until it is on somebody else's timeline.

A single word wider than the column is **hard-broken** rather than allowed to
overhang. There is no hyphenation dictionary here and inventing break points in
a real headline would be worse than a hard break. The designs size down long
before this fires.

---

## 5. The three cards, and what survives a thumbnail

Two shapes: **1200×675** (X's preferred landscape) and **1080×1350** (portrait,
which occupies more vertical space on a phone).

**The layout rule every design obeys.** A card is first seen as a thumbnail
about 200px wide — a sixth of the landscape card. At that scale three things
survive: the heat stripe, the level numeral, and the lockup. So every design
puts the reading in an element at least 200px tall and lets the prose be prose.

### 5.1 What was actually looked at

Every card below was rendered from the live data files, opened at full size,
then resampled to 200px wide and opened again.

| card | 1200×675 | 1080×1350 |
|---|---|---|
| `state` | 116 KB | 132 KB |
| `headline` (199-char title) | 146 KB | 203 KB |
| `race` | 107 KB | 148 KB |

**`state`, landscape, at 200px.** The `4` and `42.6` read cleanly. `ROUTINE` and
`ROUTINE BAND 35–54` read. The five pillar bars read as five coloured bars with
five different fill lengths — a figure, not a texture — but the pillar **names**
are mud at that size, so at thumbnail scale you get *DOOMCON 4, ROUTINE, 42.6,
five things at various levels*. The reading survives; the breakdown does not.

**`state`, portrait, at 200px. This is the one to post.** The `4`, `ROUTINE`,
`Needle breathing`, `42.6 of 100`, `ROUTINE BAND 35–54` **and all five pillar
names with their figures** are legible in a 200×250 thumbnail. Portrait wins
decisively, and the reason is arithmetic rather than taste: the same content in
1350px of height instead of 675 means every element is roughly twice the size
at the same thumbnail width.

**`headline`, landscape, at 200px.** Honestly: **the headline is mud.** A 199
character title sets at a 29px cap, which is 4.8px in the thumbnail. What reads
is the green stripe, the `PRESS` and `ATTENTION` chips as coloured shapes, and
the `4 / DOOMCON / ROUTINE` badge — the badge is 140px tall, so its numeral is
still 13px in the thumbnail, about the size of a text post's whole first line.
That is the design working as intended: the badge is the hook, the headline is
the payoff at full size. At X's actual in-feed width (roughly 500px on desktop)
the headline is entirely readable.

**`headline`, portrait, at 200px.** The first two or three words are readable
and the rest is texture. Better than landscape, still not a reading.

**`race`, landscape, at 200px.** The best of the three at thumbnail scale, by
accident of content: `POLYMARKET, LIVE`, the question in two lines, `Anthropic`,
the long green bar and `73.5%` are all legible. Six rows of lab names and
percentages resolve. Nothing here needed to be small.

**`race`, portrait, at 200px.** All eight rows legible.

**The finding, stated once:** *post the portrait card.* It is better at
thumbnail size in all three designs, and it is the shape that takes more
vertical space in the feed, which is the reason this module exists.

### 5.2 The three designs

**`state`** — the daily post's image. Level numeral, level name, epithet,
composite with its denominator and band, the move since the previous
observation, five pillar rows, the source tally, the disclaimer, the clock.

**`headline`** — one scored item from `data/news.json`. Kind and pillar chips,
the headline fitted to a box, the corroboration line (`docs/VOICE.md` §2 habit 4
— name the source in the sentence), and the level badge.

**`race`** — the live Polymarket book from `data/race.json`. The venue, the
question, one row per lab, the total volume. A market probability is somebody
else's number and the card says so: *odds are Polymarket's, not ours*. A bare
percentage beside a lab's name would read as ours.

### 5.3 Rule 3: no card invents a number

Every figure is passed in from `data/*.json`. There is **no default figure
anywhere in this file**, and a missing measurement is an **omitted line**, never
a plausible one.

```
cardpng: state.score is required and was null
  — a card never prints a figure it was not given
```

The three source states are never merged, on the card as on the page
(`docs/VOICE.md` §4):

- **live** — a bar, filled to the score.
- **dark** — **no bar at all**, the word `DARK`, and a row of dashes. A bar at
  zero for a source we could not read is imputation drawn as a picture, which is
  the one edit `VOICE.md` §4 forbids outright.
- **awaiting baseline** — the words `AWAITING BASELINE` and no bar. The source
  answered; there is simply no frozen history to score it against. Calling that
  "dark" would claim an outage that is not happening.

Direction is a **shape** before it is a hue — up, down and unchanged are three
silhouettes (`docs/BRAND.md` §2.2) — and the delta sentence is in the **past**,
because that is the only tense this index has (`VOICE.md` §3.1).

The footer row is measured too: `chrome()` throws if the stamp will not fit
beside the domain.

---

## 6. Adding a card design

1. **Write the function.** `myCard(data, { format, level, generatedAt })`,
   returning a `Buffer`. Take `FORMATS[format]`, branch on
   `fmt.id === 'portrait'`, and put every baseline in one `L` object at the top
   of the function so the vertical rhythm can be read in one place.
2. **Call `chrome()`** for the stripe, the wash, the masthead and the footer.
   Three designs sharing one piece of furniture is why they read as one set.
3. **Wrap every incoming figure in `req()`.** If it can be absent, omit the
   whole line rather than printing a fallback.
4. **Fit every string that comes from outside this repo** with `fitText` or
   `fitBlock`. Headlines, lab names, market questions, source lists. Never set
   external text at a fixed size.
5. **Register it** in `CARDS`, and add it to `cardAssets()` if it belongs in the
   build's output.
6. **Render it and look at it** — at full size *and* at 200px wide. §5.1 is the
   record of what that caught; every layout defect in this file was invisible in
   the source and obvious in the render.

```bash
docker run --rm -v "$PWD":/app -w /app node:20-alpine node site/cardpng.mjs public
```

writes the live set to `public/cards/` and prints what it wrote. That command
exists because the only way to know whether a card works is to open it.

### 6.1 The integration seam

`cardAssets({ state, item, race }, { formats })` returns
`[{ path, body, type }]` — the same shape `brandmarks.brandmarkAssets()`
returns, so the integrator's write loop needs no second branch. A card whose
data has not been collected is **omitted** from the list, never emitted with a
placeholder in it.

`site/build.mjs` and `collector/posts.mjs` are not this pass's to edit. What
lands in them — writing `public/cards/*.png`, pointing the per-page `og:image`
at the state card instead of `og-default.png`, and attaching the portrait card
to the post the operator copies — is stated here rather than done.

---

## 7. How this was tested

All under `node:20-alpine` in Docker.

**The font, as a specimen sheet.** All four alphabets, the digits, the whole
punctuation range and four accented words, at a 44px cap, plus `42.6` at 120px.
Rendered with the module's own rasteriser, so what was looked at is what ships.
That sheet caught nine glyphs — `a b d p q 8 % @ •` — whose bowls were joined to
their stems by a stray line, because an arc that opens a subpath had been
allowed to continue from the pen.

**The same glyphs at a 150px cap**, to check `a e s g 8 @ ? & % 3 2 9` as
letterforms and `Ill1`, `O0` and `rn/m` as confusion pairs. All distinct.

**Every character of the live corpus.** 69,847 characters of headlines,
summaries and names from `data/news.json` and `data/race.json`. Complete
coverage, after the four characters that first run found were added.

**The longest real headline in the live file** — 199 characters, a Techmeme item
about a $100M Amazon robotics facility — on both shapes. It lands at a 29px cap
over four lines on the landscape card and a 50px cap over nine lines on the
portrait one.

**The full punctuation range our copy uses**, at 47px, 26px and 20px caps, and
two figures at a 120px cap:
`Anthropic’s "super app" (2026) — $11.6B, 73.5%; 5-of-14 [live] · 42.6/100 … café?`

**All five levels**, and a fabricated DOOMCON 1 state with one dark pillar and
one awaiting baseline, to exercise the heat ramp and both non-live source
states. That render caught the one layout bug in the set: `UNPRECEDENTED` is
thirteen characters and `ROUTINE` is seven, and at a fixed size the longest
level name ran 80px into the composite column — a defect that would first have
appeared on the loudest day of the year. The level name is now fitted.

**The three rules, each asserted to throw:** a missing glyph, a line that cannot
fit, and a missing figure.

**Determinism.** Every card rendered twice in two separate Node processes;
SHA-256 identical for all four. `CONTRACT.md` §4 requires it, and a card that
changed on every build would also defeat every cache between us and the reader.

**Cost.** 274–339 ms per card, 107–203 KB out — against X's 5 MB limit.

**What was not tested.** Nothing was posted to X, so "X renders it" is inference
from the format (PNG, RGB8, 1200×675 and 1080×1350, under 5 MB) rather than an
observation. The first real post is the test that matters.
