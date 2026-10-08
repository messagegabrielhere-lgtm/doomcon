# Reference versioning

Every SIREN score is a percentile against a **frozen** reference distribution.
That freeze is the product's integrity guarantee: a receipt from September and a
receipt from next March were computed against the same yardstick, and anyone can
check that from the hash in the receipt. This document is the procedure for the
one thing the freeze makes hard — adding or replacing a yardstick — without ever
quietly re-basing the index.

Short version: **v1 never changes. New calibrations run in public, in shadow,
beside the official number. Promotion is a dated, hashed cutover to a new file,
and v1 stays in the repo so every old receipt still verifies.**

## 1. Where we are: v1 is frozen

`data/reference.json` (v1) was built once by `collector/backfill.mjs` on
2026-09-23 and calibrates five sources: `wikipedia`, `federal-register`, `hn`,
`sec-fts`, `arxiv`. Every receipt carries `reference.hash` — the sha256 of v1's
canonical JSON. Nothing in this repo edits v1, and `.github/workflows/calibrate.yml`
fails if it ever sees v1 change.

The cost of that discipline is visible on the dashboard. The Compute & Capital
pillar has one calibrated source (`sec-fts`), and when SEC's WAF refuses the
runner the pillar goes **dark**, the level freezes (`rule_fired:
frozen_dark_pillar`) and the page says DEGRADED — even while `stockanalysis` and
`vastai` are reporting perfectly well, because v1 has no distribution to judge
them against. The Markets pillar has no calibrated source at all.

## 2. Addenda: new calibrations, in shadow

`data/reference-addenda.json` holds distributions for sources v1 does not
calibrate. It is built by `node collector/calibrate.mjs`, run only on manual
dispatch of `.github/workflows/calibrate.yml`.

**Admission bar** (stricter than v1's):

1. The backfill must reconstruct the *exact* statistic the live adapter emits,
   evaluated at the end of each UTC day — same basket, same window, same
   aggregation, same staleness rule.
2. At least **300** usable days in the 365-day window (v1 required 200).
3. The history available today must be the history the adapter would have seen
   then. Survivor-biased or re-dated sources are refused and listed under
   `unavailable` with the reason.

**Admitted today:** `stockanalysis` (mean |daily % move| of NVDA, AMD, TSM, AVGO),
from Yahoo Finance daily closes. On a weekend the live adapter reads Friday's
session, so the reconstruction does too; an incomplete session (any of the four
missing) is a gap, never a three-name basket.

**Considered and refused:** `govuk` — the live count is "documents whose
`public_timestamp` is in the last 30 days, as indexed now"; re-running that for
past windows counts documents as indexed *today*, after re-stamping and
withdrawals, so past windows are depleted. Same survivor bias that kept
`openrouter` out of v1. `vastai`, `polymarket`, `kalshi`, `manifold` have no
honest history; their route in is a **forward-built** reference (365 days of our
own published readings — every one is already in `data/raw/` with a receipt).

**Shape.** Each addenda entry has exactly v1's source-entry shape (`unit`,
`accepted_units`, `method`, `params`, `n`, `coverage`, `min`, `max`, `median`,
101-knot type-7 `quantiles`) plus `addendum_version` and `built_at`. The file
carries `base_reference.hash` (the v1 it extends), `supersedes` (the previous
addenda hash, if any) and `hash` — sha256 over the canonical JSON of the file
without the `hash` field. An addendum can only *add* a source; it can never
override a v1 key or alias.

**The shadow.** When the addenda file exists, `collector/engine.mjs` scores the
same raw snapshot twice:

- **official** — against v1 alone. Score, level, anti-flap state machine,
  receipt, history line: byte-for-byte what they would be without the addenda
  (`collector/test/engine-shadow.test.mjs` proves this against a frozen copy of
  engine v1.0.0).
- **shadow** — against v1 + addenda, published as `state.shadow`:
  `{ reference: 'v1+addenda', addenda_hash, addenda_sources, score,
  level_estimate, pillars:[{id, score, dark}], dark_pillars, delta_vs_official,
  note, series }`. No receipt, no level change; `level_estimate` is just the
  band the shadow score falls in. `series` carries the addenda sources' raw
  scores for the last 12 runs so the shadow NowCast smooths like the official
  one. If the addenda file's hash does not verify, the shadow reports
  `error: addenda_hash_mismatch` and the official index carries on.

The UI may show the shadow, but only labelled as such ("with proposed
calibrations: …"), never in place of the official number.

## 3. Promotion rule

An addenda source is promoted into a new reference version only when **all** of
these hold, and the evidence is published in the promotion commit:

| criterion | threshold |
|---|---|
| shadow running | ≥ **14 days** with the same `addenda_hash` (a rebuild restarts the clock) |
| source uptime | the source reported (`ok` or `uncalibrated` with a value) in ≥ **95%** of full-pass runs in that period |
| published diff | a table, per run, of official vs shadow score and level, with the count of runs where the level band differs, committed as `docs/reference-diffs/v2.md` |
| no unit drift | every live reading in the period carries the addendum's `unit` |
| review window | the diff is public for ≥ 72 hours before cutover |

Promotion is a judgement made against that evidence, and the judgement is
signed in the commit message. Meeting the thresholds does not oblige promotion;
failing any one of them forbids it.

## 4. Cutover

1. Create `data/reference-v2.json` = v1's sources + the promoted addenda
   entries, with `version: 2`, `supersedes: <v1 hash>`, `effective_from:
   <ISO timestamp of the first run scored against it>`, and its own hash. v1's
   entries are copied verbatim — same quantiles, same n.
2. **`data/reference.json` (v1) stays in the repo, unmodified, forever.** Every
   receipt issued before cutover names v1's hash and still verifies against it.
3. The engine gains a `reference.version` field in the receipt body from the
   cutover run onward (`1` is implied for every earlier receipt, which carry
   only `reference.hash`). The receipt chain is unbroken: the first v2 receipt's
   `prev_hash` is the last v1 receipt's hash.
4. The anti-flap state machine treats the cutover run like a dark-pillar change:
   the level is frozen at the cutover run, so a level can never change *because*
   the yardstick changed.
5. The addenda file is cleared of promoted entries; anything left keeps running
   in shadow against v2.

## 5. A permanent baseline shift

The other reason to version is the failure mode named in the methodology: a
field that becomes structurally busier than its reference year will sit near the
top of the scale forever. If that happens to a v1 source:

- A new **365-day window** ending at the decision date is built for that source
  with the same backfill code (or forward-built from our own readings where
  backfill is not honest), and enters the addenda as a *replacement candidate*
  under a distinct key (`<id>@<window-end>`), not as an override.
- Old and new are published **side by side for 30 days** in the shadow, with the
  daily diff, before the promotion rule above is applied.
- On cutover, the history page draws a vertical rule at `effective_from` and
  labels both sides with their reference version. History before the line is
  never re-scored.

## 6. What this never permits

- Editing `data/reference.json`, or rebuilding it with `backfill.mjs --force`.
- An addendum overriding a v1 entry.
- Re-scoring past receipts against a newer reference.
- Promoting a source whose history is not the same definition as its live reading.
