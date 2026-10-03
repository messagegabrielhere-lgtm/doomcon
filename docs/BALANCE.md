# Both at once — harm and benefit, counted side by side

*Two lists, one rule, no net score.*

**Collector:** `collector/balance.mjs` · **Counters:** `collector/balance-sources/` ·
**Registers:** `data/ledger.json` (hand-curated) · **Output:** `data/balance.json`

The data layer under the page that puts what AI has measurably done for people
beside what it has measurably done to them. It publishes three things and one
refusal. The three things: a count of newsroom stories matching a harm word list
and a benefit word list, made by one rule; six live counters read from other
people's registries; and two hand-verified registers of dated, sourced entries.
The refusal: none of these is ever summed, netted, subtracted or divided into a
verdict.

---

## 1. Why this exists

The operator asked for the other viewpoint beside the doom case: AI solving
problems, the utopia case, and "the balance of evil and good" shown on the site.
`docs/BLISS.md` §1 already made the argument for pairing the two directions. An
index that can only ever say "more doom" is a hype account with a chart, and a
calm day on one instrument is only a story next to a second instrument that
moved.

This page takes the request seriously by refusing the two words that make it
dishonest.

- **Utopia** is Thomas More's 1516 coinage, from the Greek for "no place". The
  page does not measure one. It counts two lists of words in the same headlines,
  reads six registries, and prints two registers of documented results. A reader
  can see how much of the utopia case has a receipt, which is the useful version
  of the question.
- **A balance of evil and good** is the standard image of a final judgement: the
  heart weighed against a feather, souls weighed by an archangel. `site/brand.mjs`
  `NOT_CLAIMS[2]` is "Not a judgement." So the page is allowed to draw two pans,
  but it never prints the verdict a pair of pans implies. §3 is the rule and §4 is the
  one exception, fenced.

Max Roser's "The world is awful. The world is much better. The world can be much
better." (Our World in Data, first published 4 Oct 2018, CC BY) is the model. All
three of its statements are readings of one metric in one unit, child mortality,
and nothing is summed. Its point is that "all three statements are true at the
same time" — which is also this page's argument, and why the recommended house
name is **BOTH AT ONCE** rather than anything that names an outcome (`docs/WORDING.md`
rule 3, `docs/FEAR.md` §11).

---

## 2. What is on the page, and where each part comes from

| layer | source | what it is | how it updates |
|---|---|---|---|
| **Newsroom counts** | `data/news.json`, read by `balance.mjs` | distinct stories in the newsroom's current window matching the harm list, the benefit list, both, or neither | every run |
| **Live counters** | `collector/balance-sources/*.mjs` via `collector/fetch.mjs` | six counts from registries: three on each side | every run |
| **Registers** | `data/ledger.json` | 18 benefit rows and 18 harm rows, each checked against its sources | by hand, dated |
| **Context** | `data/state.json`, `data/bliss.json` | DOOMCON and BLISS as they stand | read, never combined |

The three layers never feed each other. The beam in §4 reads only the first.

---

## 3. The rule: the two sides are never summed

Nothing in `balance.json` adds a harm to a benefit, subtracts one from the other,
or divides one by the other. There is no net score, no ratio, no "on balance",
and the selftest checks the assembled output for any field called `net`,
`ratio`, `difference`, `balance_score` or `verdict`.

**Why.**

1. **The units do not meet.** The registers hold a fraud loss in dollars
   (`ic3-ai-fraud-2025`), a lung-function change in millilitres
   (`drug-rentosertib`), a count of mapped cameras (`flock-alpr-mapped`) and a
   price per question (`cost-of-intelligence`). Any exchange rate between them is
   a value judgement presented as arithmetic. `docs/BLISS.md` §7.4 makes the same
   point about benefit alone — benefit has no natural unit — and it gets worse,
   not better, when harm is added to the other side.
2. **A net hides what it nets.** GDELT's tone is positive minus negative, and its
   own codebook (v2.1, 19 Feb 2015) cautions that a near-zero tone can mean either
   little emotion or two strong sides cancelling. One number loses the thing a
   reader needed.
3. **Two pans invite false parity.** Boykoff and Boykoff ("Balance as bias",
   *Global Environmental Change* 14, 2004) found 52.65% of sampled articles gave
   balanced coverage to a question where the scientific consensus was not
   balanced. A split bar is honest only when the two sides are complements by
   construction, as matched YES and NO shares on Polymarket are. These two lists
   are not: a story can match both or neither.
4. **The picture is read as the claim.** Ziemkiewicz and Kosara (IEEE TVCG
   14(6), 2008) showed that the visual metaphor shapes what readers take from a
   chart. A scale is read as a weighing whatever the caption says, so what the
   scale is allowed to weigh is fixed in code, not in a caption.

**What is never printed or used as a label:** net, outweighs, tips the balance,
on balance, winning, verdict; evil, good, utopia, dystopia, doom or hope as the
name of a side. "Evil" appears only inside a quoted, attributed line.

**What never drives anything on this page:** the DOOMCON composite against the
BLISS composite. Those are percentile positions in two separate frozen reference
distributions. `/bliss` prints their difference as a labelled comparison, and
that is where it stays.

---

## 4. The beam — what it tilts on, exactly

The only thing allowed to tilt a drawn beam is a pair of like-for-like counts:

- **H** — distinct stories in the newsroom's current window that matched the
  harm list and not the benefit list.
- **B** — distinct stories that matched the benefit list and not the harm list.
- **Both lists** — sits at the fulcrum and moves neither pan.
- **Neither list** — printed under the stand, every time, so two pans never pose
  as the whole newsroom.

Like for like means: one window (`data/news.json`), one set (the scanned kinds,
§5), one rule for both sides, one field set (headline, and summary under the
two-hit rule), one unit (**distinct stories**: a `news.json` story cluster counts
once, so syndicated coverage cannot fill a pan three times) and a flat count
(one per story, whatever the number of hits).

**The rule**, published in `balance.json` as `beam_rule` and implemented in
`beamFor()`:

```
angle = 8° × |H − B| / (H + B), clamped to 8°, heavier pan down
level when |H − B| ≤ 2  (BEAM.DEADBAND)
        or  H + B  < 5  (BEAM.MIN_TAGGED)
```

- The page prints H and B large. It never prints the difference or the ratio as
  a number; the angle is a drawing instruction, not a figure.
- Both pans in the same ink. No red and green, no colour change for the heavier
  side.
- The tilt is baked into the static SVG and never animated (`docs/MOTION.md`
  Rule 0).
- A dark newsroom draws the beam level and labelled dark. Its counts are `null`,
  never zero.
- Any series built from these counts uses shares of the scanned stories, not raw
  counts. The window is capped at 200 items, not at its nominal 7 days, so its
  real span moves with how busy the news is: 62.3 hours on 2026-09-28.

**What it never tilts on:** the counters, the registers, DOOMCON against BLISS,
severity tiers (their A/B/C weights have no benefit counterpart), item scores,
recency, corroboration, engagement, source weights, counts from different windows
or source sets, and any language-model or sentiment judgement.

**The reading on 2026-09-28** (newsroom stamped 02:46 UTC): 82 headlines scanned
in 76 stories. 11 matched the harm list only, 0 the benefit list only, 0 both,
65 neither. H + B = 11, |H − B| = 11, so the harm pan is down at the full 8°.

That is a measured zero on the benefit side — the list exists and was applied —
and it is a fact about how Techmeme, Hacker News, The Verge and Ars Technica
framed AI news in a week dominated by reports of misbehaving agents. It is not a
fact about the world. See §9.

---

## 5. The two word lists (lexicon v5)

Exported from `balance.mjs` as `HARM_TERMS`, `BENEFIT_TERMS`, `HEDGE_TERMS`,
`NEGATORS` and `NOT_SCANNED_KINDS`, and printed in full in every `balance.json`
under `lexicon`. **Any edit to either list is a new instrument**: the precision
figures below were measured on these exact lists.

### The rule

Matching uses `wordSequence()` from `collector/news-stories.mjs`: lower-cased,
accent-folded, split on anything that is not a letter or a digit. Exact word
forms, no stemming — the reason is the "Hacker News" trap `news-stories.mjs`
documents at `SEVERITY_TERMS`. Terms are one to four consecutive words.

1. Items of kind `paper`, `lab`, `release` or `model` are not scanned. Vendor
   blogs never report their own harms and always report their own benefits; arXiv
   abstracts discuss attacks as subject matter.
2. A headline ending in `?` (a trailing credit in parentheses allowed after it),
   or carrying a hedge term, counts on **neither** side.
3. A hit is ignored when `no`, `not` or `never` stands one or two words before it.
4. A side counts if the headline has at least 1 hit, or the summary has at least
   2 **distinct** hits.

The same rule runs on both sides in the same pass. That symmetry is the claim.
The brief this replaced counted warnings and commentary as harm while excluding
hype on the benefit side, and that asymmetry tilts every comparison before a
headline is read.

### The lists

**Harm, 78 terms:** harm, harms, harmed, harmful, rogue, incident, incidents,
breach, breached, breaches, hacked, hacking, tried to hack, attempted to hack,
attempts to hack, attempting to hack, attack, attacks, attacked, attacking,
exploit, exploits, exploited, compromised, unauthorized, unauthorised, leak,
leaks, leaked, leaking, lawsuit, lawsuits, sued, sues, suing, scam, scams,
scammer, scammers, fraud, fraudulent, deceptive, deepfake, deepfakes, abuse,
abused, abusive, misinformation, disinformation, lethal, weaponise, weaponises,
weaponised, weaponize, weaponizes, weaponized, catastrophic, killed, deaths,
layoffs, laid off, job cuts, infringes, infringement, infringing, malware,
ransomware, phishing, jailbreak, jailbreaks, jailbroken, stolen, misuse, misused,
without consent, without permission, fined, fines.

**Benefit, 47 terms:** cure, cures, cured, diagnose, diagnosed, diagnosis,
diagnoses, cancer, tumor, tumour, tumors, tumours, disease, diseases, lifesaving,
life saving, save lives, saved lives, saves lives, antibiotic, antibiotics,
vaccine, vaccines, antibody, antibodies, enzyme, enzymes, protein, proteins,
accessibility, visually impaired, deaf, hearing loss, hard of hearing, fda
cleared, fda clearance, fda approved, fda approval, early detection, wildfire
detection, flood forecasting, early warning, civilian defense, civilian defence,
sign language, drug candidate, drug candidates.

**Hedge terms:** risk, risks, warns, warned, warning, warnings, could, might,
would, q a (how `wordSequence()` spells "Q&A"), interview, podcast, opinion.
"may" is left out because it is also the month.

**Dropped from v4:** harm lost harassed, harassment, addiction, theft, endanger,
endangers, endangering, spying, surveillance, ai weapons, autonomous weapons;
benefit lost heal, heals, healed. Each produced false positives on the labelled
sample: the AI weapons pact twice, TikTok addiction, "theft of labor", Snowden on
surveillance, Geely's batteries that "heal".

### Measured precision (in-sample, v5)

Sample: `data/news.json` generated 2026-09-28T02:46:46.998Z (200 items, 85
non-paper) plus every distinct item in its 483 git revisions (757 items, 324
non-paper). One labeller. An item is **Y** only if it reports something that
happened.

| side | sample | matched | precision (strict) | Wilson 95% | known Y found |
|---|---|---|---|---|---|
| harm | current file | 11 | 100% (11 Y) | lower bound 74.1% | 11 of 16 |
| harm | all history | 26 | 88.5% (23 Y, 2 borderline, 1 N) | 71.0 to 96.0% | 23 of 34 |
| harm | all history, borderline counted as harm | 26 | 96.2% | — | — |
| benefit | all history | 2 | 100% (2 Y) | lower bound 34.2% | 2 of 4 |
| benefit | current file | 0 | — | — | — |

No item in the sample matched both lists.

**Known misses, left missed on purpose.** Harm: the Pentagon on overreliance on
AI in the Iran school strike; the Muse agent reading private messages; the
Trump administration using AI to deny medical care; OpenAI pausing training after a
model bypassed restrictions; dark-web marketplaces selling AI access; the
Stanford race-swap ad; the AI-generated art therapist; the WSJ story on the UN
data hub; OpenAI's 53 images; an AI ad of a person made without consent.
Benefit: Anthropic's biolab CRISPR-like discovery; the XPRIZE wildfire detection
inside 10 minutes. No terms were added to catch them, because additions tuned on
this sample inflate the in-sample precision.

### Known defects in v5, recorded rather than patched

- **"early warning" can never count from a headline.** `warning` is a hedge
  term, so a headline carrying the benefit phrase "early warning" is set aside by
  rule 2. The phrase can only count from a summary with a second distinct benefit
  hit. Fixing it changes the instrument, so it waits for v6 and a fresh labelled
  sample.
- **Negation is positional, not grammatical.** "Not just a scam" is read as a
  denial and dropped; "No one disputes the breach" is three words away and
  counted.
- **Everything is in-sample.** The drops and rules were chosen after reading the
  same matches they were scored on, the repo holds no untouched non-paper items,
  and misses were found by reading titles only, so a miss visible only in a
  summary is not in the recall figures.
  The first honest out-of-sample test is next week's `news.json`. The benefit
  side rests on n = 2.

---

## 6. The live counters

Six adapters, three a side, each verified against its live endpoint on
2026-09-28. Values below are the real readings from the run anchored at
2026-09-28T02:46:46.998Z; every one matched the verification run.

| id | side | value | window | counts | does not count |
|---|---|---|---|---|---|
| `aiid-incidents-entered-30d` | harm | 54 incidents entered | 2026-08-29 to 2026-09-28 | AI Incident Database incidents whose earliest linked report was submitted in the window | harms that happened in the window; verified harm (many entries are allegations) |
| `oecd-aim-incidents-30d` | harm | 602 incidents and hazards | same | news-detected events dated in the window, as the OECD monitor classifies them | verified harm; incidents apart from hazards; the last three or so days |
| `cisa-kev-added-30d` | harm, **context only, not AI** | 43 vulnerabilities catalogued | same | entries CISA added to the Known Exploited Vulnerabilities catalogue, any vendor | anything AI-specific; when exploitation happened |
| `clinicaltrials-ai-starts-30d` | benefit | 20 trials started | same | studies with an AI phrase whose start date is in the window **and marked ACTUAL** | results or benefit; starts not yet updated to ACTUAL |
| `fda-ai-enabled-devices` | benefit | 1,614 devices, cumulative | none | every device on the FDA AI-Enabled Medical Device List, 1995 to date | use or patient benefit; devices the FDA has not yet added |
| `alphafold-db-entries` | benefit, **context only** | 261,328,474 structure predictions | none | structure predictions the AlphaFold DB search returns, single chains and complexes | experimental or validated structures; anything a prediction was used for |

**Notes that change how each number reads.**

- **ClinicalTrials.gov.** Without `AREA[StartDateType]ACTUAL` the same window
  reads 145, of which 125 are estimated and 118 are not yet recruiting — plans,
  not starts. ACTUAL counts lag, because a sponsor marks the start only when it
  next updates the record, so the newest days read low. The same trap is open in
  `collector/bliss-sources/clinicaltrials-ai.mjs`, which is not this layer's file.
- **FDA.** The list lags about two months: the file was last modified 4 Sep 2026
  and its newest decision is 29 Jun 2026, so a 30-day window reads 0 for a reason
  that is the FDA's publishing cadence. The value is the cumulative count; the
  in-window count (0), the newest decision and the file's `Last-Modified` ride in
  `meta` so the lag is visible. This is the list itself, not the openFDA API that
  `docs/BLISS.md` §4 rejected for having no AI field.
- **AlphaFold DB.** `/api/search` is not in the published OpenAPI spec. Only the
  `q=* type=main` form was verified, and `numFoundExact` must be true or the
  source goes dark. The total moves only when a batch lands and has no date
  filter, so it is context, not a daily counter.
- **AI Incident Database.** The file is a Gatsby build artefact, not an API, and
  its shape can change on any deploy; every path into it is checked. "Entered"
  is proxied by the earliest `date_submitted` among an incident's reports.
  Editors enter incidents in batches of up to 9 a day, so moving the window edge
  by one day can move the count by up to 9. Incidents 88 and 141 have no reports
  in the file and so no entry date; they are listed, not guessed.
- **OECD AIM.** The classification is made by language models in the OECD's
  pipeline (GPT-4o mini filters, GPT-4o decides incident or hazard, o3-mini
  writes metadata and clusters). `docs/BLISS.md` §7.3 keeps models out of this
  site's own measuring layer; nothing here asks a model anything, but this
  number is a model's output and the page has to say so beside it. The pipeline
  processes events one to four days old, so the newest days of the window are
  thin, and merged events can shrink a past window.
- **CISA KEV.** Not an AI measure. It is here as the one keyless government
  register of observed exploitation, a baseline for what a month of catalogued
  exploitation looks like. `dateAdded` is when CISA wrote the entry down
  (`docs/EXPLOITS.md`). The calendar-month count (41 for 2026-09) rides in `meta`;
  the trailing window is the value because a calendar month resets to near zero
  on the 1st. The fetch and row validation are `kev-sources/cisa-kev.mjs`'s,
  reused. An AI-stack basket read 1 in 30 days: too sparse for a counter, and a
  basket needs freezing (`docs/BLISS.md` §4 rule 6). This counter replaces the verified
  `cisa-kev-this-month` form on the verification's own advice.

**Rules every counter follows.**

- **Two states, live and dark.** A counter that throws, times out (150 s
  watchdog), or returns anything but a finite number is **dark**, with its error
  in the file and `value: null`. Never a zero, never the last good value. The
  third site state, awaiting baseline, does not arise: counters are published
  raw, not scored against a reference.
- **A zero is implausible, so a zero is dark.** Each windowed adapter throws on
  zero, as `docs/BLISS.md` §4 rule 4 requires: a silently broken filter
  returning 0 is a dead source wearing a plausible number. Cumulative sources
  carry a sanity floor instead (FDA 1,300 rows, AlphaFold 200 million, AIID
  1,400 incidents, KEV 1,400 entries).
- **One window.** From the 30 whole UTC days before the anchor day through the
  anchor day so far, both ends inclusive: 2026-08-29 to 2026-09-28 on this run,
  identical to the verification runs so each value can be checked against them.
  The anchor is `generated_at`.
- **Counters are never summed, and never paired.** The harm counters and the
  benefit counters measure different things in different units. The page does
  not set AIID's 54 against ClinicalTrials' 20; each is printed with its own
  unit, window and does-not-count line.

---

## 7. The registers — `data/ledger.json`

Two hand-verified registers in one canonical, key-sorted file, in the style of
`data/orbital.json`. As of 2026-09-28: **18 benefit rows** and **18 harm rows**.
Equal lengths are a choice made by the compilers, not a finding that the sides
are equal; the file says so in `honesty`.

Every row carries `what_is_measured` and `what_is_claimed` side by side, so a
reader can see the gap between the result and the headline written about it;
`numbers[]`, each with its own `source_url` and date; `sources[]`; a
`confidence` of `verified` or `probable`; and a `caveat`.

### Status vocabulary

A status describes the evidence, not the importance. No status on one side ranks
a row against any row on the other.

| side | status | means | rows |
|---|---|---|---|
| benefit | `delivered` | the output exists at scale and a stranger can check it: a database, a dataset, an authorisation list, a price | 4 |
| benefit | `in-use` | deployed and working for people outside the organisation that built it, by the operator's own report | 4 |
| benefit | `in-trial` | in human clinical trials; no approval, and no outcome beyond what the trials have reported | 2 |
| benefit | `demonstrated` | shown to work in a study, a trial or a test, and not documented as in routine use | 8 |
| benefit | `claimed` | asserted with no measurement a stranger can check; listed so the claim is visible, never counted as a benefit | 0 |
| harm | `documented` | a specific event recorded in an official finding, a court record or a named organisation's own report | 6 |
| harm | `measured` | a count or a rate from a published dataset or study, with its denominator and its method | 10 |
| harm | `alleged` | charged in a complaint or a lawsuit and not adjudicated; the allegation is the record, not a finding | 2 |

Confidence: benefit 12 verified, 6 probable; harm 16 verified, 2 probable. The
rows carry 56 and 51 sourced numbers.

### Curation policy

- **Dated, not live.** Each row was checked against its sources on its `as_of`
  date. `as_of_date` moves only after a full re-verification by hand.
- **Re-dated, never silently edited.** A figure that changes gets its new source
  and date; the old one is not quietly replaced.
- **Retired, not deleted.** A row that no longer holds moves to `retired[]` with
  `retired_on` and the reason, and its id is never reused, so old links never
  re-point to a different fact.
- **Dropped items are listed.** The 2026-09-28 pass dropped no row outright.
  `dropped[]` lists what individual rows left out and why: the IDF's statements
  on the Gospel and Lavender systems (unreadable on 2026-09-28), and the IEA's
  projections for future years (a projection is neither measured nor
  documented).
- **Curation is a human judgement**, which is why the registers feed no number,
  no beam and no index. `NOT_CLAIMS[2]` ("no human votes on it") is about the
  index; a register is a different kind of object and says so.

### Checked on every run

`checkLedger()` in `balance.mjs` refuses the file when a row lacks a field, a
status is outside the side's vocabulary, a confidence is unknown, a number lacks
an https source, an id repeats (across rows, `dropped[]` and `retired[]`), a
`dropped[]` entry points at no row, the `totals` disagree with a recount of the
rows, or the file is not in canonical form (keys sorted at every level,
two-space indent, one trailing newline — byte-identical through
`stableJson()`, so the checksum in the repo is the checksum served). A refused
ledger is recorded as `invalid` with every problem listed, and the run exits 1.

To edit: change the rows, recount `totals` per side (rows, by status with zeros
kept, by confidence, count of numbers — `sideTotals()` computes it), and write
the file with `serialise()` from `balance.mjs`. Hand-formatting fails the check.

---

## 8. DOOMCON and BLISS on this page

Both are read from disk and published under `indices`, as context, in the site's
three states. DOOMCON on this run: 4 ROUTINE at 39.6, live. BLISS: **awaiting
baseline** — `data/bliss-reference.json` does not exist, so it has no score, and
`balance.json` carries `score: null` with `printed_as: "awaiting baseline"`.
Never a number it does not have, and never "dark" for a source that is working
(`docs/BLISS.md` §5). Neither index feeds the beam, and the two are not
subtracted or compared anywhere in this layer.

---

## 9. What this cannot tell you

1. **Coverage is not the world.** The newsroom reads Techmeme, Hacker News, The
   Verge, Ars Technica and a handful of other feeds. Failure is louder than
   success (`docs/BLISS.md` §7 point 5): a model that invents a citation makes
   the news, and a model that correctly read ten thousand mammograms does not.
   Gapminder's test applies: ask whether equally positive news reaches you at
   all. More bad news can also mean better surveillance of harm, not more harm.
2. **Headlines are written to be clicked.** Robertson et al. (*Nature Human
   Behaviour*, 2023) measured a 2.3% rise in click-through per extra negative
   word in an Upworthy headline. A count of harm words partly measures how
   headlines are written.
3. **A lexicon counts words.** It cannot tell a harm from a denial beyond the
   two-word negation rule, or a report from sarcasm.
4. **Vendor blogs are excluded on purpose**, which removes self-reported benefit
   from the newsroom count. The registers carry the benefits that have a
   checkable result instead.
5. **The two lists differ in size and reach** — 78 harm terms, 47 benefit
   terms. Both are published in full so the difference is visible; it is not
   corrected by a weighting factor.
6. **Most counters measure intake, not events.** AIID counts editorial
   throughput, OECD counts media coverage classified by a model,
   ClinicalTrials counts registrations updated by sponsors, FDA counts
   authorisations two months late, KEV counts cataloguing, AlphaFold counts
   predictions.
7. **The registers are a selection.** Thirty-six rows chosen by people. They
   show what a documented result looks like on each side; they are not a sample
   of all results.
8. **The newsroom window has no fixed length.** 200 items span 62.3 hours today
   and a different span next week, which is why any series has to use shares.
9. **The file records no clock.** `generated_at` is the newest input timestamp,
   and the counters' window is anchored on its day. The counters themselves are
   fetched when the collector runs, which can be later than `generated_at`; the
   values carry their own publishers' dates where the publisher provides one
   (FDA `file_last_modified`, KEV `date_released` and `catalog_version`).

---

## 10. Running it

```bash
docker run --rm --network host -v "$PWD":/app -w /app node:20-alpine \
  node collector/balance.mjs

docker run --rm -v "$PWD":/app -w /app node:20-alpine \
  node collector/balance.mjs --selftest      # no network
```

Flags: `--data DIR` (default `data`), `--out FILE` (default `DATA/balance.json`),
`--dry-run` (fetch and print, write nothing), `--quiet`, `--selftest`.

Run it after `collector/news.mjs`, `collector/collect.mjs` and
`collector/bliss.mjs`, and before `site/build.mjs`. It writes only
`data/balance.json` and never touches `public/`. It fetches about 9 MB per run
(AIID 5.7 MB, KEV 1.75 MB, the OECD page 1 MB, the FDA CSV 141 KB); nothing in it
moves meaningfully inside an hour, so **daily is enough**. Not yet wired into
`.github/workflows/`.

Some counters dark exits 0. Every counter dark, or an invalid ledger, exits 1.

**Determinism.** Two runs over the same `data/` files and the same counter
answers write byte-identical files. The selftest proves the pure half by
building twice with `Date`, `Date.now()` and `Math.random()` rigged to throw; the
real-run check is `sha256sum data/balance.json` before and after a second run.

---

## 11. Where the framing came from

- Max Roser, "The world is awful. The world is much better. The world can be
  much better." Our World in Data, 2018, revised 2022 and 2024, CC BY.
  ourworldindata.org/much-better-awful-can-be-better
- Gapminder, *Factfulness*, the negativity instinct.
  gapminder.org/factfulness/negativity
- Bulletin of the Atomic Scientists, Doomsday Clock FAQ ("not a forecasting
  tool"). thebulletin.org/doomsday-clock/faq
- GDELT Global Knowledge Graph Codebook v2.1, 19 Feb 2015, on Tone.
- Polymarket help, "How are prices calculated".
- L. C. Muth, Datawrapper, on dual axes. datawrapper.de/blog/dualaxis
- M. T. Boykoff and J. M. Boykoff, "Balance as bias: global warming and the US
  prestige press", *Global Environmental Change* 14 (2004).
- C. Ziemkiewicz and R. Kosara, "The shaping of information by visual
  metaphors", *IEEE TVCG* 14(6), 2008.
- C. E. Robertson et al., "Negativity drives online news consumption",
  *Nature Human Behaviour*, 2023.
