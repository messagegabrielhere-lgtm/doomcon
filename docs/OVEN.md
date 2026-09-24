# The oven

The five-stage rail on the dashboard, in the Domino's pizza-tracker grammar.
Implemented in `site/templates/_oven.mjs`. This file is the stage definitions,
the thresholds, and the reasoning that keeps the graphic honest.

---

## 0. The statement this document exists to make

> **The stages describe activity that has already been observed. They are not a
> forecast, a countdown, or a claim about what happens next.**
>
> The lit stage says where the composite is sitting right now, measured against
> this index's own frozen reference record. The two gate cards beside it print
> the published thresholds for moving one stage in either direction, as numbers,
> next to the current readings. Printing a rule is not predicting that the rule
> fires. Nothing on this component, in any state, says that anything is about to
> move, and the copy is written against the same banned-word list that
> `collector/posts.mjs` enforces on post text.

The index measures how much is happening, not how bad it is. Hotter is a fact
about tempo against a frozen distribution. It is not a fact about anyone's odds.

---

## 1. Why the Domino's grammar, and where it had to be broken

The Domino's tracker is one of the most legible progress visuals ever shipped:
four named stages, yours lit, no legend, understood in under a second by people
who have never thought about it. Nobody has pointed it at an index.

`docs/VISITORS.md` measured the gap it fills. Every persona cluster DOOMCON
currently serves has a time budget over 45 seconds; every cluster pizzint serves
has one under 20. The level was already stated seven separate ways above 6,000px
of mobile scroll, and none of them was a single glanceable object. The rail is
that object, and it absorbs three of those seven restatements.

**But a Domino's tracker is a ratchet.** Your pizza never goes back to PREP. Ship
that grammar unchanged and you have shipped a doom countdown with better
typography, and the first hostile quote-tweet is right. Three properties are
therefore non-negotiable and are enforced in the markup:

1. **The stages are the DOOMCON levels.** Not a second scale. `brand.LEVELS` is
   the only stage table on the page, and `_oven.mjs` asserts at module load that
   the band edges it draws tile exactly onto the boundaries
   `collector/engine.mjs` scores against. If a hand-edit to a band ever breaks
   that, the import throws rather than drawing the caret on one scale and the
   thresholds on another.
2. **It is a thermostat, not a progress bar.** The previous position is drawn —
   the previous *stage* as a dashed cell marked `WAS`, and the previous
   *observation* as a dashed mark on the pin track, typically a tenth of a point
   from the live pin and often ahead of it. Both gate cards are rendered with
   equal weight. A reader who only ever sees the hotter card has been shown a
   countdown.
3. **Every boundary is a published number with a published gate**, and both are
   on the page as figures. "What would move it" stated in arithmetic is the
   difference between an instrument and a mood ring.

### On the name

The task brief called this THE TAKEOFF TRACKER. It ships as **The oven**, which
is the operator's own word ("dominos pizza tracker oven") and is the safer of the
two by the rule `docs/FEAR.md` §11 arrives at: *a name may describe the
instrument, the observer, or the argument — never the outcome.* "Takeoff" is a
term of art for a future transition. On a heading above a live number it reads as
the index asserting that the transition is under way, which breaks
CONTRACT.md's level-naming rule before it breaks anything else. "Oven" names a
thing with a temperature that goes up and down, which is exactly what the
component is. The heading string lives in `render()` and is a one-line change if
that call is ever revisited.

---

## 2. The stages

Fixed, in render order, coolest on the left. Band edges are `brand.LEVELS`;
the heat ramp and the burner length are derived from the level number, so a
stage cannot be drawn hotter than its position.

| stage | name | band | burner | what a reading in this band means |
|---|---|---|---|---|
| DOOMCON 5 | DORMANT | 0–34 | 20% | Activity below this index's own historical norm. |
| DOOMCON 4 | ROUTINE | 35–54 | 40% | Activity within the normal range of the record. 50 is the centre of the frozen reference by construction. |
| DOOMCON 3 | ELEVATED | 55–69 | 60% | Activity above the normal range of the record. |
| DOOMCON 2 | ACCELERATED | 70–84 | 80% | Activity in the top decile of the record. |
| DOOMCON 1 | UNPRECEDENTED | 85–100 | 100% | Past the top of the reference distribution. A statement about our record running out, not about the world. |

The entry criterion for a stage is the composite score landing in that band —
**and then clearing all six anti-flap gates below.** The band alone never moves
the level; that is the whole point of the gates, and it is why the score can sit
outside its stage's nominal band by up to the deadband while the stage is held.

---

## 3. The thresholds, as printed

`BOUNDARY[L]` is the cut between level L and level L−1, and the Schmitt deadband
is ±3 points around it. Both come off the receipt's `constants` block at render
time — the values below are the current ones, and the component prints whatever
the engine actually used, naming the receipt it read them from.

| from | one stage hotter requires | one stage cooler requires |
|---|---|---|
| DOOMCON 5 · DORMANT | composite **above 38.0** | — floor of the scale |
| DOOMCON 4 · ROUTINE | composite **above 58.0** | composite **below 32.0** |
| DOOMCON 3 · ELEVATED | composite **above 73.0** | composite **below 52.0** |
| DOOMCON 2 · ACCELERATED | composite **above 88.0** | composite **below 67.0** |
| DOOMCON 1 · UNPRECEDENTED | — top of the scale | composite **below 82.0** |

Each gate card prints five rows, every one a requirement beside the current
reading:

| row | requirement | reading |
|---|---|---|
| Composite | past the threshold above | the live score and the signed gap to that mark |
| dwell window 1 | window mean past the threshold | the mean and how many observations it is over |
| dwell window 2 | window mean past the threshold | the mean and how many observations it is over |
| Pillars agreeing | quorum, of the pillars actually scored | how many are on the correct side right now |
| Since last change | the minimum interval | how long the stage has been held, and the shortfall |
| Dark pillars | none | how many are dark |

**The dwell windows are asymmetric and the card says so.** Escalation is measured
over 3h and 30m; standing down over 12h and 3h. Standing down is deliberately
the slower move, which is the one property that stops a tempo index from
flickering — and the one property that, stated out loud, makes it clear the rail
is not built to travel in a single direction.

**The quorum denominator is the pillars actually scored, not five.** A pillar
awaiting a frozen baseline answered fine and is published but not scored; it is
not in the engine's vote and it is not in ours. The row says so
(`2 of 4 scored · 1 of 5 not scored`) rather than quietly printing 5.

**The dwell means.** When a receipt recorded the engine's own window means, those
are what render. When it did not — the receipt only carries a `decision` block
when a change was actually proposed — the means are computed here from
`data/history.ndjson` using the engine's definition verbatim: backfilled rows
excluded, window inclusive at both ends, live scores only, plain mean. The
observation count is always printed with the mean, so a one-observation window
reads as one observation rather than as a trend. A window with nothing in it
prints "no observation inside this window" and takes the `◇` mark, never a zero.

---

## 4. The honesty rule outranks all of it

A level change is frozen while any pillar is dark. The component renders a
`STAGE FROZEN` banner naming the dark pillars and the reason — the composite is
then taken over a different set of inputs than the previous run, so an apparent
move may be an artifact of what died rather than of what happened — and sets
`data-frozen="1"` on the section, which stops the only animation in the
component. **That stillness is information.** It is the deliberate opposite of
pizzint pulsing a confident DOUGHCON 5 over a scraper managing two successful
runs a day.

`rule_fired` is printed verbatim under the cards with a one-sentence gloss. It is
the engine naming the gate that actually held the level this run, and it answers
the question every reader asks — *why is it still ROUTINE when the score says
ELEVATED* — in the engine's own words rather than ours.

---

## 5. Degenerate states, all rendered

| state | what renders |
|---|---|
| no history at all | rail and gates render; no ghost mark; "no earlier observation in the record, so nothing is drawn behind it"; dwell rows show `◇` and "no observation inside this window" |
| one observation | ghost mark omitted; dwell means print "over 1 observation" |
| no prior level change | no `WAS` cell; "No stage change in the record. DOOMCON *n* has been the reading for *d*, since *t*, across *n* scored observations." |
| level 1 | the hotter card is replaced by "none — end of scale" and a sentence about the reference record, not about the world |
| level 5 | the cooler card is replaced likewise, and says explicitly that a quiet hour on the instruments is not the same thing as safety |
| any pillar dark | `STAGE FROZEN` banner, animation off, dark-pillar gate row unmet |
| no readable receipt | the published constants render and the footer says so: "(unreadable — the published defaults are shown)" |
| score at 0.0 or 100.0 | pin clamps to the track ends; the caret sits on the edge |
| `level_since` absent | the time gate takes the `◇` mark and the held line says the page cannot state it |

No state imputes a number, and no state merges **live**, **dark** and **awaiting
baseline**.

---

## 6. Accessibility, motion, and the no-JavaScript guarantee

- **No JavaScript.** The entire component is server-rendered HTML and one scoped
  `<style>`. A crawler and a pre-hydration screenshot both get the full graphic.
- **Never colour alone.** The lit stage is carried by seven independent signals:
  a 2px inset ring, a filled burner, a caret, the word `NOW`, the score printed
  on the cell, `aria-current="true"`, and a visually-hidden sentence. The heat
  ramp is a *length* — the burner grows 20% per stage — so the staircase reads in
  greyscale and to a reader who separates no hues at all. Gate rows carry `●`,
  `○` and `◇` plus a hidden "met" / "not met" / "not evaluated this run".
- **Every colour is a token** from `site/styles.mjs`. There is not one literal
  hex value in the component, so both themes follow from the palette with no
  second set of values to keep in sync.
- **375px first.** The rail is a five-column grid. Stage labels are sized by a
  container query against their own cell (`--len` is the character count), with
  viewport-relative buckets as the fallback for browsers without `cqw`, so
  `UNPRECEDENTED` fits at phone width and in any narrower container it is
  dropped into.
- **Motion.** One animation: the lit burner breathes on a 3.2s opacity cycle.
  It passes MOTION.md's test — the real event it represents is "this index is
  live and unfrozen" — and it is disabled under `prefers-reduced-motion: reduce`
  and whenever a pillar is dark. `opacity` only; nothing reflows.

---

## 7. Determinism

`render(ctx)` is a pure function of `ctx`. No clock reads, no `Math.random()`,
no network. Two builds from identical `data/` produce byte-identical markup,
which the harness asserted across all thirteen cases.

---

## 8. Integration

```js
import * as oven from './templates/_oven.mjs';
// in site/templates/index.mjs, immediately after the hero <section>:
${oven.render(ctx)}
```

`render(ctx, opts)` returns a complete `<section class="sec oven" id="oven">`
including its own `<style>`, the way `_labs.mjs` and `_xwire.mjs` do. Options:
`{ style: false }` to suppress the style block when the component appears twice
on one page, `{ heading: false }` to drop the `<h2>` for an embed.

`ctx` needs `state` (required), and uses `history`, `receipts` and `href` when
they are present. It degrades to the states in §5 when they are not.

Also exported: `model(ctx)` — the stage table, thresholds and gate readings as
data, for a harness or a future methodology mirror — and `windowMean()`.
