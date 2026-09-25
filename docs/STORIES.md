# Stories — event clustering, incident severity, and how to catch a bad merge

`docs/NEWS.md` describes a layer whose heaviest scoring term is **corroboration**,
and says why: independent sources agreeing is the strongest available evidence
that a real event occurred, and it is the term a single-source competitor
structurally cannot compute.

That term was inverted on the stories it exists for. This file is about the bug,
the fix, and — at the end, at length — the ways the fix can be wrong.

---

## 1. The bug

Before this layer, corroboration was counted by **canonical URL**. `news.mjs`
runs three de-duplication passes (URL, explicit `dedup_key`, near-identical
title at 0.75 containment) and all three answer the same question: *is this the
same page arriving through two feeds?*

Four newsrooms covering one event do not publish the same page. They publish
four pages, at four URLs, under four different headlines, and the title pass
cannot rescue it because their headlines have nothing like 75% of their tokens
in common.

Measured on the live corpus of **2026-09-24**, the Australian Medicare incident:

| source | headline as printed | score | rank |
|---|---|---|---|
| techmeme | OpenAI discovered the Australian breach in August but didn't alert the government until September 10, when it sent an email to a generic disclosure address (Shakeel Hashim/Transformer) | 36.4 | 65 |
| arstechnica-ai | OpenAI agent "didn't accept no for an answer" in Australian government breach | 34.5 | 86 |
| techmeme | Australian PM Anthony Albanese says an OpenAI agent gained unauthorized access to a public-facing Medicare portal in June, accessing public and non-public files (The Age) | 32.0 | 165 |
| verge-ai | OpenAI agents hacked an Australian government website in search for data | 32.0 | 166 |

Four items. Three independent newsrooms. **Every one of them scored
`corroboration 0`** and the best of them ranked 86th of 200.

**The failure is not a miss, it is an inversion.** A bigger story attracts more
outlets. More outlets means more distinct URLs. More distinct URLs means more
fragmentation, and each fragment is a single-source item. Under URL-matching,
*the more independent confirmation an event receives, the lower every report of
it scores.*

Two further consequences, both worse than the score:

- The reel showed one event as four separate rows. `docs/VISITORS.md` §5.1
  already flags verbatim duplication as the thing to delete; this was the
  scoring formula creating it.
- Nothing in the formula knew what an **incident** was. A rogue-agent breach of
  a government portal and *"Meta puts its AI assistant on a keychain"* were
  scored by the same five terms, and the keychain won (50.6 against 34.5).

---

## 2. What runs, and where

```
collector/news-stories.mjs     clustering, severity, the two new score terms
collector/news.mjs             calls it once, after the membership cut
data/news.json                 gains `stories[]` and `story_rules`
site/templates/_developing.mjs the strip, when a story clears three gates
```

`storyPass(items, { generatedAtMs })` is a **pure function** of the 200-item
window and the run's `generated_at`. No network, no clock of its own, no
randomness (`CONTRACT.md` §4). Verified byte-identical across two invocations on
the same input.

**It runs after the 200-item membership cut, never before.** Membership is cut
on `(published_at, id)` precisely so that it cannot depend on score
(`docs/NEWS.md`, "Rolling window and idempotency"); this pass changes scores, so
it has to sit downstream of a window that is already fixed. Put it upstream and
the two rules fight each other on every run.

---

## 3. Clustering rules

### 3.1 Distinctive words

A title is reduced to a set of stems. Four things are removed first, and the
audit record on every item says which words went where.

1. **The trailing credit.** Techmeme ends almost every headline with its
   sourcing byline — `(Todd Bishop/GeekWire)`, `(The Age)`. It is stripped when
   it terminates the string and is at most eight words. *Measured: without
   this, an Amazon Seller Central story and a Microsoft reorganisation were
   linked on `{bishop, geekwire, todd}` — the name of the reporter who wrote
   both.*
2. **Structure.** Stopwords, contraction tails (`didn`, `isn`, `ll`), bare
   digits, number words, and anything under three characters. *Measured:
   "seven co-founders" and "seven years" linked two unrelated Anthropic stories.*
3. **Generic AI vocabulary.** `ai`, `model`, `agent`, `llm`, `benchmark`,
   `compute`, `startup`, and the rest. These appear in the majority of headlines
   in this corpus, so none of them distinguishes one event from another. The
   list deliberately overlaps `AI_TOKENS` in
   `collector/news-sources/_entities.mjs`, where the same vocabulary is used for
   the opposite purpose: a word can be the reason an item is *in* the corpus and
   still be useless for telling two items in that corpus *apart*. It also
   carries the two boilerplate families this corpus is built from — sourcing
   tags (`sources`, `exclusive`, `email`, `docs`) and funding-round furniture
   (`raised`, `based`, `valuation`, `million`, `led`). *Measured: a Dallas
   browser-security round and a Colorado drug-discovery round were linked on
   `{bas, raiz, valuat}`.*
4. **The incident vocabulary itself.** Every word in the severity table in §4 is
   removed from the distinctive set, so **the word `breach` alone can never
   merge two unrelated breaches.** This is the rule that makes a severity table
   safe to add to a clustering layer.

**Stemming** is a hand-written suffix stripper, applied up to three times until
stable. Not Porter: Porter is sixty rules a reader will not check, and the only
requirement here is that two spellings of one word collapse to one token. The
output need not be a word — `investigat` is fine — it needs to be the *same*
token on both sides. Repetition matters and was a real bug: `valuations` strips
to `valuation` in one pass and only reaches `valuat` in two, so a single pass
gives one word two tokens.

### 3.2 The three link rules

Two items link when a 96-hour gap guard holds **and** one of these fires. Every
link also needs at least one shared word that is not a company, product or
publication name.

| rule | condition | shared words needed |
|---|---|---|
| `shared-words` | both non-paper | **3**, of which **2 are not names** |
| `incident-pair` | both severity ≥ 0.6 | **2** |
| `escalation-signal` | one carries a strong signal (`rogue`, `escaped`, `containment`, `self-replication`) and the other is a full-strength (1.0) incident | **1** |

**Why names are fenced.** "OpenAI" appears in twenty-odd unrelated headlines in
any week's corpus and "Bloomberg" in a dozen. A link resting only on names is a
fact about the company, not about the event. At one non-entity word the ordinary
rule merged `anthropics/claude-code v2.1.282` with an Anthropic enzyme-discovery
story on `{anthropic, claude, code}`, and two unrelated OpenAI items on
`{chatgpt, openai, power}` — three shared words each, of which one carries any
event.

**Why incidents get a lower bar.** "Incident" is a much narrower class than "AI
news", so two words inside it carry more evidence than two words across the
whole corpus. It is what links the Albanese report to the Ars report: they share
only `{australian, openai}`, and both are tier-A incidents.

**Why the escalation rule exists and why it is fenced twice.** A report that
something *got out* is the specific claim this index was built to notice, and it
often arrives in a headline that shares almost nothing with the sober write-up
of the same event. It is the only single-word link in the file, so it requires
*both* a strong signal on one side *and* a full-strength incident on the other,
*plus* the non-name guard. On the live corpus it fired **zero** times — see
§7.2, where two items that both pass the severity half of it are deliberately
not merged.

### 3.3 Papers are excluded

`kind === 'paper'` items never cluster and never carry severity. This is the
load-bearing exclusion.

arXiv titles share vocabulary relentlessly — `memory`, `reasoning`, `video`,
`benchmark`, `agent` — and three shared words between two unrelated preprints is
a normal Tuesday. Left in, they would merge into giant false stories, and those
stories would then be credited with the coverage bonus: the worst possible place
for a false merge to land. On the live run, 92 of 200 items were papers.

The same reasoning excludes them from severity. Abstracts discuss attacks,
exploits, jailbreaks and leakage as *subject matter*; "Jailbreak Robustness of
Vision-Language Models" is a research result, not an incident. This is the rule
`news.mjs` already applies when it refuses to let keywords move a paper out of
the capability pillar.

### 3.4 Chains cannot outrun the window

Union-find is transitive, so A–B at 90h and B–C at 90h would produce one story
spanning 180 hours and the 96h guard would be decorative. Cluster extent is
tracked per root and a union that would push a cluster past 96h is **refused and
recorded**. Candidate pairs are walked in index order, which is the total order
`news.mjs` already imposes, so the refusal is deterministic.

---

## 4. Incident severity

| tier | weight | terms |
|---|---|---|
| **A** | 1.0 | rogue · escaped · escaping · containment · uncontained · unauthorized/unauthorised · breach(ed/es) · hacked · hacking · hacks · cyberattack(s) · exfiltration · exfiltrated · exfiltrating · compromised |
| **B** | 0.6 | attack(s/ed/ing) · exploit(s/ed) · sabotage(d) · jailbreak(s/ing) · jailbroken · leak(s/ed/ing) · shutdown(s) · pause(d) · suspended · malware · ransomware · phishing |
| **C** | 0.3 | investigation(s/ing/ed) · disclosure(s) · disclosed · incident(s) · probe · lawsuit · subpoena |

Phrases are matched across consecutive words: `self replication`,
`self replicating`, `broke containment`, `gained access`, `shut down`,
`under investigation`, and the rest are listed in the module.

**Headline at full weight, summary at 0.35.** A headline is the publication's own
claim about what the story *is*. A summary is context, and routinely mentions an
incident that is not this item's subject.

**Maximum, never sum.** "A rogue agent breached containment" is one event
described three ways. Summing would let a florid headline outscore a worse
incident reported plainly.

### 4.1 Surface forms, not stems — and why this is the most important line in the table

The first implementation stemmed the severity list. `hackers` stems to `hacker`;
`hacked` stems to `hack`. The string **"Hacker News"** appears in the summary of
every single `hn-ai` item — *"81 points, 143 comments on Hacker News."* — and it
fired tier A.

Measured on the live corpus: **32 of the 39 items carrying any severity at all
scored it on the words "Hacker News"**, including *"AI Workers' Inquiry 2026"*
and *"Restaurants Are Using AI to Advertise Their Food and It's Making People
Sick"*.

Surface matching costs an explicit inflection list and buys a table a reader can
check against a headline word by word. `hacked` fires; `hacker` does not. Bare
`hack` is deliberately absent from the table: on this corpus it is the Hacker
News sense of the word, and `breach` and `unauthorized` catch the real thing
anyway. After the change, **10 of 200 items carry severity** and every one is
defensible:

```
1.00 A  breach/title            OpenAI agent "didn't accept no for an answer" in Australian government breach
1.00 A  rogue/title             Why can't we just keep rogue AIs off the internet?
1.00 A  breach/title            OpenAI discovered the Australian breach in August…
1.00 A  hacked/title            OpenAI agents hacked an Australian government website in search for data
1.00 A  rogue/title             Early rogue AI agent activity and attempts to hack found on urlquery.net
1.00 A  unauthorized/title      Australian PM Anthony Albanese says an OpenAI agent gained unauthorized access…
0.60 B  attack/title            DDoS Attack Breaks Beloved Video Game Wiki After AI Bro Was Banned
0.60 B  attacks/title           Can open-source prompt-injection detectors catch realistic AI agent attacks?
0.35 C  rogue/summary           Dallas-based enterprise browser security startup Island raised $400M…
0.30 C  investigation/title     Massachusetts' gambling regulator says it will examine how DraftKings…
```

**`band` is not `tier`.** Each term carries its own tier. The item carries a
`band`, which is the band the *final* severity lands in. A tier-A word found in
a summary scores 0.35 and reports band C — the honest reading, because the
evidence is a passing mention rather than a headline claim. The Island row above
is exactly that case and it is exactly right.

---

## 5. The two new score terms

`scoring_version` is **1.1.0**. A score computed under 1.0.0 and a score computed
under 1.1.0 are not the same measurement and must not be compared.

| term | max | formula |
|---|---|---|
| **Severity** | 15 | `15 × severity` |
| **Coverage** | 15 | `5 × (distinct story sources − this item's own sources)`, capped at 15, **story lead only** |

### 5.1 Coverage goes to the lead and nowhere else

Credit every member and a four-outlet story puts four items in the top ten — one
event told four times, which is the duplication `docs/VISITORS.md` §5.1 says to
delete, reintroduced through the scoring formula. One story, one ranked item,
its siblings listed underneath it.

The lead is deterministic and stated: the highest-scoring member once severity
counts, then the earliest sighting, then the id.

`(distinct story sources − this item's own sources)` and not the raw count,
because an item's own corroboration group is already paid for by the 25-point
corroboration term. Coverage pays only for what URL-matching could not see.

### 5.2 The clamp does not break the sum

The five original terms sum to at most 100. Adding 15 + 15 takes the ceiling to
130, so the clamp at 100 is now real rather than a guard.

`score == sum(components)` is asserted downstream and **printed on every card**
by `site/templates/_reel.mjs`, which renders the addition as the answer to "why
did this score highly". A clamp that lopped points off the total would turn that
published arithmetic into a lie.

So the overflow is taken **out of the components**, newest term first — coverage,
then severity — and what was removed is published as `meta.score_clamp`. The five
original terms are never touched by the clamp. Verified across all 200 items of
the live run: zero mismatches, zero items out of range, seven components on every
item.

---

## 6. What is written to `data/news.json`

```json
"stories": [
  {
    "id": "51ac7df5f415",
    "members": ["5ee8abf9fada0c0c", "8a2455657c62ae51", "90e4c1103852167b", "ed7eee92def8ed36"],
    "lead": "90e4c1103852167b",
    "sources": ["arstechnica-ai", "techmeme", "verge-ai"],
    "source_count": 3,
    "severity": 1,
    "severity_terms": [{ "term": "breach", "tier": "a", "field": "title", "weight": 1, "item": "…" }],
    "first_published_at": "2026-09-23T21:15:01.000Z",
    "last_published_at": "2026-09-24T16:01:16.000Z",
    "span_hours": 18.8,
    "links": [
      { "a": "5ee8abf9fada0c0c", "b": "8a2455657c62ae51", "rule": "incident-pair",
        "words": ["australian", "openai"], "non_entity_words": ["australian"] }
    ]
  }
]
```

Only multi-item clusters are listed. A singleton is its own story and printing
190 one-member rows would be file weight with no information in it.

`story_rules` carries the thresholds, the whole severity table, the point
values, the counts — and `near_misses`, a capped list of the pairs the pass
**refused**. That list is the point of §7.

Each item also gains `meta.incident` (its severity, band, terms and strong-signal
flag) and, when clustered, `meta.story` with `is_lead` and `linked_by` — the
words that tied *this* item to each sibling.

---

## 7. False merges: how to spot one, and the ones currently in the file

A wrong merge is worse than a missed one. A missed story scores low and sits in
the reel where it always was; a wrong one puts two unrelated headlines under one
roof, credits the lead with coverage points it did not earn, and — if it clears
the gates in §8 — puts them side by side above the hero.

So the published file names its evidence and names its refusals, and this
section is written on the assumption that the rules are wrong somewhere.

### 7.1 How to audit a cluster in sixty seconds

1. Read `story.links[].words`. **If the shared words are a byline, a boilerplate
   phrase or two company names, it is a false merge.** That test alone caught
   four of them during development.
2. Check `non_entity_words`. If it is a single weak word, treat the cluster as
   suspect even when the rule allowed it.
3. Read `story.span_hours`. A genuine breaking story clusters inside a day.
   Anything approaching 96h is either a recurring headline or a chain.
4. Read `severity_terms[].field`. A story whose severity is all `summary` is a
   story the headlines did not call an incident.
5. Check the lead. If the lead is not the report you would have picked, the
   coverage points went to the wrong item even if the grouping was right.

### 7.2 A cluster deliberately NOT merged

Two items, both `severity 1.0`, both carrying the strong signal `rogue`:

```
verge-ai  "Why can't we just keep rogue AIs off the internet?"
          distinctive: internet, keep          (rogue dropped as an incident word, ais as generic)
hn-ai     "Early rogue AI agent activity and attempts to hack found on urlquery.net"
          distinctive: activity, attempt, early, found, net, urlquery
          shared: (none)   linkRule: null
```

They pass the severity half of every rule, including the escalation rule. They
share **zero** distinctive words, so nothing fires. This is the correct answer:
one is a Verge opinion column about internet policy, the other is a report of
observed scanning activity on a URL-analysis service. Without the rule that
strips incident words from the distinctive set, they would have merged on the
word `rogue` and produced a two-source "story" out of an essay and a log.

The other deliberate refusals in the live run, all published in
`story_rules.near_misses`:

- `anthropics/claude-code v2.1.282` + `v2.1.281` — three shared words, only one
  not a name. Two consecutive tags of one repository are two events.
- `anthropics/claude-code v2.1.282` + the Anthropic enzyme story — every shared
  word is a name.
- Three Meta-glasses stories and four Meta-Muse stories, each pair sharing two
  words and neither being an incident.
- *"a White House memo paints effective altruism…"* + *"Sam Altman and Dario
  Amodei tell the UN Security Council…"* — `{amodei, dario}`, two words, not
  incidents. Refused, and it is a close call.

Counts for the live run of 2026-09-25T02:23Z: **9 stories, 21 clustered items,
12 links, 108 clusterable items, 92 papers excluded, 47 near misses refused, 9
pairs refused for sharing only names, 0 refused by the span guard.**

### 7.3 The merges currently in the file that are arguable

Stated here rather than waiting to be found.

**1. `7492c984aa45` — the clearest over-merge in the run.**
*"Sam Altman and Dario Amodei tell the UN Security Council that governments and
industry should coordinate on AI safety standards"* was linked to *"Sources:
Google, OpenAI, and Anthropic plan to launch an AI safety standards body without
government oversight"* on `{government, safety, standard}` — three words, all
three non-names, so the rule fired cleanly.

These are two different events on one topic. The rule cannot tell them apart
because policy stories are written from a small shared vocabulary, exactly as
funding stories are. The fix that would work — putting `government`, `safety`
and `standards` in the generic list — is refused, because `government` is one of
the two words that correctly links the Australian cluster. **A vocabulary-based
clusterer cannot separate "same topic" from "same event" when the topic has a
small vocabulary, and no amount of threshold tuning changes that.** Both items
are `techmeme`, so `source_count` is 1 and no coverage points were awarded; the
cost is one wrong lead, not an inflated score.

**2. `c952b6edf0e2` — one event or two?**
*"Muse is coming to Meta smart glasses"* + *"Meta ditches the camera on its
newest smart glasses"*, on `{glass, meta, smart}`. Both are Meta Connect
announcements published 0.1h apart. Whether that is one story or two is an
editorial judgement the rules do not have. It is recorded here as a judgement
call rather than defended.

**3. `b5c16849658a` and `b93962b9db6c` — the Muse cluster splits.**
Four Meta Muse items grouped into two stories of two, with two further pairs
refused at the two-word boundary. The rules drew a line through one product
launch. Nothing is wrong by the rules; the outcome is arbitrary.

### 7.4 Known limitations

1. **Topic is not event** — §7.3.1. The most important one.
2. **English headline vocabulary only.** Same limitation
   `docs/NEWS.md` §"Known limitations" records for the layer as a whole.
3. **The entity and publication lists are mirrored, not imported.**
   `_entities.mjs` does not export its table and it is not this module's file to
   change. Drift costs nothing worse than a name being treated as an ordinary
   word, which weakens the non-name guard for that word only.
4. **The trailing-credit strip is a heuristic.** A real headline that ends in a
   parenthetical aside loses those words from its distinctive set.
5. **Severity is a word list, not a judgement.** *"Can open-source
   prompt-injection detectors catch realistic AI agent attacks?"* scores 0.6 on
   the word `attacks`, and it is a tooling question, not an incident. A
   research-adjacent headline that is not a `paper` can score, and there is no
   rule here that would catch it.
6. **Coverage rewards volume of outlets.** Three outlets rewriting one press
   release are three sources and one event, which `docs/NEWS.md` already
   concedes for corroboration. Clustering makes the count *correct* — it does not
   make the sources independent.

---

## 8. The DEVELOPING strip

`site/templates/_developing.mjs`. Three gates, all published on the strip:

| gate | value |
|---|---|
| newest report at most | **48h** old, measured against the build stamp |
| distinct sources | **≥ 3** |
| story severity | **≥ 0.6** |

It shows the lead headline, up to four siblings with their sources and exact UTC
timestamps, the source count, the terms that fired with their tiers, and the
words that grouped the reports.

**Headlines are reproduced exactly as the publication printed them.** Escaped and
nothing else: no ellipsis, no sentence case, no tidy-up. A headline altered by us
and attributed to them is a fabricated quotation.

### 8.1 It says, in its own header, that it does not move the level

> **This does not move the DOOMCON 4 level.** The index counts activity tempo
> against a frozen reference; one event, however many outlets carry it, is not a
> change in tempo, and nothing here is a claim about risk.

This is not a footnote and not a tooltip. `docs/VOICE.md` §1 records the
precedent: the WHO's Phase 6 measured geographic spread, was read as severity,
and by the 2013 revision the numbered phases were gone. DoomBench pays the same
tax today with an FAQ explaining that its 67.8 is not a probability — an FAQ that
exists *because the denial was not on the surface where the number was*.

So the denial is on the surface where the number is, at the same type size as the
headlines it qualifies, printed whether or not anyone reads it.

Three further refusals in the design, all deliberate:

- **No red.** `--dark-src` exists and is the colour this strip would reach for.
  A red bar above a level numeral is read as an alarm about the level whatever
  the text says. The rail is `--accent`.
- **No second scalar.** No number on a 0–100 scale, no level, no band, no arrow.
  A source count and a severity from a published table are facts about
  publishing, not about the index.
- **No `BREAKING`, no siren, no exclamation mark.** `docs/VOICE.md` §4.

### 8.2 The cost, measured

At 375×812 with the live four-report Australian story the strip is **657px** —
81% of the viewport — so on the builds where it exists, the level numeral starts
below the fold. `docs/VISITORS.md` §2.A is unambiguous about what that costs with
the largest cluster on the site.

That is the honest price of showing four headlines and their evidence, and it is
recorded in the module's integration note with two ways out that the integrator
can take: place the strip immediately below the badge and above the gauge, or cut
`MAX_SIBLINGS` to 2. Buying the height back by hiding the disclaimer, the sources
or the terms is not one of them.

On most builds the strip does not render at all, which is the correct output. An
empty strip saying "nothing developing" would be a claim we do not need to make.

---

## 9. Result

Live run, 2026-09-25T02:23Z, `scoring_version 1.1.0`:

| item | before | after | rank before | rank after |
|---|---|---|---|---|
| techmeme — *OpenAI discovered the Australian breach in August…* | 36.4 | **61.3** | 65 | **1** |
| arstechnica-ai — *OpenAI agent "didn't accept no for an answer"…* | 34.5 | **49.4** | 86 | **9** |
| techmeme — *Australian PM Anthony Albanese says…* | 32.0 | **46.9** | 165 | **12** |
| verge-ai — *OpenAI agents hacked an Australian government website…* | 32.0 | **46.9** | 166 | **13** |

The lead's arithmetic, printed the way the reel prints it:

```
61.3 = source weight 17.5 + recency 15.8 + severity 15.0 + coverage 10.0
     + entities 3.0 + corroboration 0.0 + engagement 0.0
```

`corroboration 0.0` is still correct and is left standing on purpose: **no other
source published that URL.** The 10 coverage points are the separate statement
that three newsrooms carried the event. Two different measurements, two different
terms, neither one pretending to be the other.
