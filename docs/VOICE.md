# Voice

How DOOMCON sounds, and the exact line it does not cross.

This file is the style guide for every string a human writes — `site/brand.mjs`,
the page templates, `docs/`, the post variants in `collector/posts.mjs`. Some of
it is enforced by unit test. Most of it is not, which is why it is written down.

---

## 1. The one rule

> **AIpocalypse in the voice. Rigour in the number.**

The voice may be vivid, dry, funny, ominous in its framing. The number may only
ever be what the arithmetic supports. These are not in tension as long as you
keep them in different sentences — the failure is the sentence that smuggles a
claim in under a figure of speech.

The index measures **observable activity tempo**: how much is happening, counted
against this index's own frozen reference distribution. It does not measure how
bad anything is, how likely anything is, or what happens next. There is no
sentence, anywhere on this site, in which a level is a probability.

**Why this is not squeamishness.** The World Health Organization's six-phase
pandemic scale measured geographic spread and nothing else. When Phase 6 was
declared for H1N1 in June 2009, the public read it as severity. The illness was
mild, the institution paid for the mismatch, and by the 2013 revision the
numbered phases were gone. A scale is read as whatever its name suggests, no
matter what its documentation says. DoomBench pays the same tax today: it runs an
FAQ explaining that its 67.8 does not mean a 60 percent probability. That FAQ
exists because the denial was not on the surface where the number was.

Our whole moat is surviving a hostile quote-tweet that asks *how did you compute
that*. Every line below protects the answer.

---

## 2. What DOOMCON sounds like

**An instrument room, not an oracle.** The register is a night-shift operator
reading dials and saying what the dials say. Flat, specific, faintly amused by
its own seriousness. It has read the literature. It is not impressed by anyone.

Five habits produce it:

1. **Describe the needle, not the world.** "Off the top of the chart" is a fact
   about our reference distribution. "The end is near" is a fact about nothing.
2. **Put the number next to the noun.** Never "governance is elevated" when
   "governance is at 53.2 of 100" is available and the same length.
3. **Exact clock, always UTC, never relative.** These pages are static and
   cached; "14 minutes ago" is a statement that becomes false while the reader is
   looking at it. `_html.utc()` exists for this reason.
4. **Name the source in the sentence.** "2 independent sources carried it, first
   at 17:59 UTC" does more work than any adjective available.
5. **Let the absurdity live in the framing.** DOOMCON, five to one, borrowed from
   DEFCON, pointed at arXiv submission counts — that is the joke, and it is
   carried entirely by the structure. The copy underneath plays it straight.
   A joke in the framing plus a straight number is a brand. A joke in the number
   is a horoscope.

**The register in one comparison.** pizzint.watch prints a confident DOUGHCON 5
over a scraper managing two successful runs in twenty-four hours, and their own
status endpoint says `"status":"healthy"`. We would rather print `DARK` on four
of fourteen sources and be believed about the other ten. Liveness is a feature.
Saying "I do not know" out loud, on the page, with the count, is the voice.

---

## 3. The hard bans (enforced by code)

### 3.1 Future tense

`collector/posts.mjs` rejects generated post copy containing any of these. The
nine in the first row are named verbatim in `docs/CONTRACT.md` and **the list
must never shrink**:

```
will  expect  predict  imminent  soon  coming  warns  forecast  likely
```

Extended in `BANNED_FUTURE_EXTENDED`, because "predicts" is no less a forecast
than "predict":

```
expects expected expecting · predicts predicted predicting
forecasts forecasted forecasting · warn warned warning warnings
unlikely upcoming shortly impending looming
anticipate anticipates anticipated poised brace bracing
```

Phrases, in `BANNED_FUTURE_PHRASES`:

```
about to · going to · set to · on track to · any day now · in the coming
```

Plus any `'ll` contraction, because "we'll" is still "will".

**The deliberate omission:** `prediction` and `predictions` are *not* banned. The
markets pillar is built on prediction markets and a noun naming a market type is
not a claim about the future. The verb forms stay banned.

**Enforcement:** `assertNoFutureTense()` in `collector/posts.mjs`, run over every
generated variant. It throws; it does not warn.

### 3.2 URLs in post text

No post may carry a URL in any form — scheme, `www.`, bare domain, or an
`@handle` that reads as a mailbox. X charges $0.200 for a post with a link
against $0.015 without, a 13.3x surcharge on the exact thing we do for reach.
Write `doomcon dot watch` and burn the real domain into the card image.

**Enforcement:** `assertNoUrl()`. Note the trap it carries: `.ai` is in the TLD
list, so the literal string `cs.AI` is rejected. Write "arXiv AI categories".

### 3.3 Where the bans do and do not apply

| Surface | Future-tense ban | URL ban |
|---|---|---|
| Generated post text (`posts.mjs`) | **Enforced, throws** | **Enforced, throws** |
| `site/brand.mjs` strings | Not enforced — **obey it anyway** | n/a |
| Page templates, `docs/` | Style rule, not a test | n/a, links are the point |

`brand.mjs` strings are unenforced but must obey the ban, because every one of
them is a candidate for post copy and a rejection at generation time is a build
failure at 02:00 UTC. Verify with a throwaway harness that runs
`findFutureViolation()` over the module's exports; it is four lines and it has
already caught one.

**The carve-out:** a quoted title of a cited work is reproduced verbatim even
when it trips the list. Vinge's paper is called "The Coming Technological
Singularity" and that is its name. This only ever arises on pages, never in post
copy, because the post generator does not read the lore page.

---

## 4. The soft bans (style, not tests)

Not enforced anywhere. Ship one and the page still builds. Ship one and the
credibility is gone anyway.

**Never write these:**

- `experts say`, `some believe`, `many are worried` — unattributed consensus is
  the house style of every site we are trying to be better than. Name the person
  and the date, or cut the sentence.
- `could`, `may`, `might`, `raises questions`, `signals that` — hedged
  speculation is a forecast wearing a hat. If the arithmetic does not support it,
  it is not our sentence.
- `terrifying`, `chilling`, `alarming`, `wake-up call`, `sounding the alarm` —
  these tell the reader how to feel about a number we just told them is not a
  risk measure.
- `unprecedented`, except as the name of level 1, where it means a specific thing
  about our reference distribution and is defined on the page.
- `AI is going to`, `the singularity`, `AGI by`, any sentence whose subject is
  "AI" and whose verb is in the future.
- Exclamation marks. Emoji. `🚨`. `BREAKING`. Ellipses used for suspense.
- `LOADING…`, `Preparing…`, or any placeholder that could reach a screenshot.
  pizzint's whole number is invisible to a crawler and to a pre-hydration
  screenshot; that is the failure we exist to exploit, and shipping a spinner is
  doing it to ourselves.

**Always write these instead:**

- The figure, its denominator, and its timestamp: `40.7 of 100, as of 00:04 UTC`.
- The count of sources behind a claim: `5 of 14 sources reporting`.
- The three source states by their real names, never merged: **live**, **dark**
  (the fetch failed, excluded, never imputed), **awaiting baseline** (the source
  answered fine, there is no frozen history to score it against yet). Calling the
  third one "dark" claims an outage that is not happening.

---

## 5. How to be vivid without claiming

Six techniques, in rough order of how often they are the answer.

**1. Move the drama into the metaphor and leave the claim alone.**
The level descriptions in `brand.mjs` do all their work with one image — a
needle — and every one of them is literally true of the composite's position in
the reference distribution.

**2. Use a concrete noun where a category was.**
`Hardware, spend and market signal` is a taxonomy. `Silicon, spend, and the
market's opinion of both` is a sentence.

**3. End on something checkable.**
The strongest line in a paragraph is usually a short declarative fact:
*Weights can be kept secret. The power bill cannot.* The reader can test it.

**4. Say the limitation out loud, in the same breath as the number.**
"…and it is also what it looks like when one source is having a strange week."
Volunteering the alternative explanation is what separates an instrument from a
pitch, and it costs one clause.

**5. Aim the voice at the category, not at the subject.**
"Everyone has a p(doom). Nobody has a receipt." is vivid, funny and factual, and
it makes no claim about AI at all — it makes a claim about our competitors that
happens to be checkable.

**6. When a ban blocks a true sentence, change the word, not the meaning.**
`Not a forecast.` is rejected by the pre-flight: the word list cannot tell
asserting the future from denying it. `Not a prediction.` passes, because the
noun is deliberately permitted, and means exactly the same thing. This is in
`brand.mjs` as `NOT_CLAIMS[1]` and it is the canonical example of working with
the ban rather than around it.

---

## 6. Three worked examples

### Example 1 — a pillar description

> **Before**
> Compute & Capital — Hardware, spend and market signal.

Grey. It is a list of nouns in a category, it has no verb, and it tells the
reader nothing they could not have guessed from the pillar's name.

> **After**
> **Compute & Capital** — Silicon, spend, and the market's opinion of both.
> GPU spot prices, rentable supply, disclosed capital expenditure, and what the
> market pays for the companies selling the shovels. Weights can be kept secret.
> The power bill cannot.

What changed: the taxonomy became a sentence; the abstractions became the four
things actually fetched; and it lands on a checkable claim that is also the
argument for why this pillar exists. Nothing is asserted about danger, speed, or
what happens next.

### Example 2 — the tagline

> **Before**
> We don't know anything. We just count.

This is a good line and it stays in the repo as `brand.CREED`. But it spends the
most valuable thirty-seven characters on the site on self-deprecation, and it
does no competitive work.

> **After**
> Nobody knows the odds. We keep count.

Same humility, same rhythm, same length — and the first clause is now a claim
about the entire category. Every rival in this space (DoomBench, the IMD AI
Safety Clock, the p(doom) countdowns) publishes a number produced by human or
model judgement that a stranger cannot reproduce. Saying "nobody knows the odds"
is both true and pointed, and "we keep count" is exactly what we do.

**The constraint that shaped it:** `collector/card.mjs` measures this string to
size the card's right-hand column, and a longer tagline shrinks the level line
until `fitSize()` drops below `MIN_FONT` and `auditCard()` fails the build. The
brief was: better line, same or fewer characters. That is normal here — the copy
is load-bearing and the layout has opinions.

### Example 3 — a daily post

> **Before**
> 🚨 Experts warn AI activity is likely to accelerate soon — DOOMCON could hit
> level 3 imminently. Watch this space: doomcon.watch

Six separate failures. It trips the pre-flight four times (`warn`, `likely`,
`soon`, `imminent`) and the URL rule once. It attributes to unnamed "experts". It
carries no figure, no denominator and no timestamp. It converts a tempo reading
into a claim about the future. And the emoji plus "watch this space" is the exact
register of the accounts we are trying to be more credible than.

> **After** — this is real output from `collector/posts.mjs`
> DOOMCON 4, ROUTINE. Composite 40.7 of 100, down 0.1 from the previous reading,
> as of 00:04 UTC on Thu 24 Sep 2026. Governance is the loudest of the five
> pillars at 53.2. 5 of 14 sources reporting, 9 awaiting a frozen baseline.
> Arithmetic at doomcon dot watch.

Every clause is a measurement with a denominator. The delta is signed and small
and printed anyway, because posting the boring days is where the credibility
comes from — an index that only speaks when alarmed reads as a hype account. The
last sentence admits that nine of fourteen sources are not yet scored, which is
the single most persuasive thing in the post: nobody volunteers that number
unless the other five are real.

---

## 7. Checklist before you ship a string

- [ ] Does it contain a banned word? Run `findFutureViolation()` on it.
- [ ] Does it contain a URL, a bare domain, or `cs.AI`? Run `findUrlViolation()`.
- [ ] Does any number in it carry its denominator and its UTC timestamp?
- [ ] Could a hostile reader quote this sentence as a claim about risk,
      probability, or the future? If yes, rewrite until they cannot.
- [ ] Does it name its source, or is it leaning on "experts"?
- [ ] Does it merge **dark** with **awaiting baseline**?
- [ ] Is the vividness in the framing and the metaphor, rather than in the claim?
- [ ] If it is a `brand.mjs` string that a card renders, is it short enough to
      survive `auditCard()`?
