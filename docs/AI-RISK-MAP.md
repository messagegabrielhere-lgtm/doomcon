# AI Risk Map ↔ SIREN

Crosswalk between Evan Wheeler’s **[AI Risk Map](https://www.riskframework.org/ai-risk-map/)**
(v1.3) and SIREN’s five pillars. The map is a neighbour, not a rival: it names
enterprise risk factors for *your own* build / buy / deploy of AI. SIREN counts
*field-wide activity tempo* from public feeds. Neither instrument scores the
other.

Canonical artefacts (CC BY-SA 4.0):

| Artefact | URL |
|---|---|
| Landing page | https://www.riskframework.org/ai-risk-map/ |
| Repo + releases | https://github.com/wheels344i-gte/ai-risk-map |
| Flat table (stable IDs `AIRM-001`…`AIRM-197`) | https://github.com/wheels344i-gte/ai-risk-map/blob/main/AI-Risk-Map.csv |
| Assistant corpus | https://github.com/wheels344i-gte/ai-risk-map/blob/main/AI-Risk-Map.md |
| Poster PDF | https://github.com/wheels344i-gte/ai-risk-map/blob/main/AI-Risk-Map.pdf |

Cite the map as Wheeler (2026), AI Risk Map v1.3, CC BY-SA 4.0. Cite factors by
ID, not by poster wording. This file is a SIREN orientation note; it does not
reproduce the map’s factor text.

---

## What each one is for

| | SIREN | AI Risk Map |
|---|---|---|
| Unit | Activity tempo vs a frozen reference | Named risk *factors* (conditions / failure modes) |
| Scope | Public, field-level signals | Your organisation’s use of AI |
| Output | 0–100 score + DOOMCON level | Unranked inventory (196 active factors, 55 categories, 12 domains) |
| Scoring | Arithmetic anyone can recompute | Explicitly none — ID and position carry no severity |
| Out of scope | Probability of harm, forecasts | Controls catalogue; others’ malicious use of AI against you |

A high SIREN level is not a signal that any AIRM factor is present. An AIRM
workshop finding is not an input to the index. Keep them in different sentences.

---

## Domain → pillar adjacency

The map’s twelve domains are ordered by **who owns the risk inside an
enterprise**. SIREN’s pillars are ordered by **what kind of public activity is
counted**. The table below is thematic adjacency only — useful when an operator
asks “which dial sits near this risk conversation?”, useless as a formula.

| AIRM domain (owner column) | Active factors (v1.3) | Closest SIREN pillar(s) | Why the link is thin or thick |
|---|---:|---|---|
| 1. AI Governance & Accountability | 19 | `governance` | Same word, different object: board/RACI for *your* AI vs how much governments publish. |
| 2. Strategy & Value Realization | 12 | `markets`, `compute` | Competitive-position and ROI factors sit near capital and repricing talk; SIREN never scores strategy quality. |
| 3. Data & Privacy | 19 | — | Almost entirely outside the index. No public tempo feed stands in for consent, provenance, or training-data rights. |
| 4. Model Development & Performance | 16 | `capability` | Validation / drift / explainability are product risks; the pillar only counts releases and research output. |
| 5. Security & Adversarial Threats | 23 | — | Largest domain on the map. SIREN has no security pillar. The map’s own threat-register carve-out (others attacking you with AI) is also off both instruments’ main job. |
| 6. Safety, Ethics & Responsible AI | 18 | `governance` (weak) | Bias, disclosure, dual-use are judgment and policy work. The pillar only counts regulatory *activity volume*. |
| 7. Operations & Resilience | 22 | `compute` (weak) | MLOps / incident / availability risk ≠ GPU spot or SEC spend signal. |
| 8. Legal, Regulatory & Compliance | 14 | `governance` | Thickest thematic overlap: compliance load vs Federal Register / GOV.UK tempo. Still not the same measurement. |
| 9. Third-Party & Model Supply Chain | 15 | `capability`, `compute` | Foundation-model dependence and vendor lock-in rhyme with release and capital concentration; neither pillar inventories vendors. |
| 10. Workforce, Human & Societal | 14 | `attention` (weak) | Societal / deskilling factors are not “how loudly HN and Wikipedia talk.” |
| 11. Financial & Resource | 8 | `compute`, `markets` | Cost and procurement economics sit next to hardware spend and market repricing. |
| 12. Autonomy & Delegated Action (Agentic AI) | 16 | `capability` | Agentic tool-use and oversight are capability-shaped product risks; the pillar still only counts public shipping tempo. |

**Coverage hole on purpose:** domains 3 and 5 (data/privacy and security) have no
honest SIREN neighbour. That is a feature of the index’s design — tempo, not
enterprise loss events — not a missing source ticket.

---

## How to use them together

1. **Read the dial first.** `/api/now.txt` or `node agent-kit/cli.mjs now` for
   the current tempo reading and receipt.
2. **Widen the room.** Put the AI Risk Map poster (or load `AI-Risk-Map.md`) and
   ask which factors the team has never named.
3. **Do not fuse the numbers.** Map AIRM IDs to *your* controls or scenarios in
   the CSV; leave SIREN’s score alone.
4. **When someone conflates them,** point at
   [`METHODOLOGY.md`](METHODOLOGY.md) (“not a probability of harm”) and at the
   map’s own “What it is not” (not a scoring tool, not a control framework).

---

## What we deliberately do not do

- Vendoring the CSV, workbook, or corpus into this repo (authoritative copies
  stay upstream; CC BY-SA share-alike applies to adaptations of the map itself).
- Feeding AIRM factors into `collector/` or the composite.
- Claiming SIREN “covers” or “monitors” any AIRM domain.
- Treating AIRM as a competitor in [`TEARDOWN.md`](TEARDOWN.md) /
  [`COMPETITIVE.md`](COMPETITIVE.md) — those files are about other *indexes*.

---

## Version pin

Crosswalk written against **AI Risk Map v1.3** (196 active factors, one retired
row `AIRM-171` → `AIRM-165`) and SIREN’s five fixed pillar ids in
[`CONTRACT.md`](CONTRACT.md). When the map ships a new major column layout or
SIREN adds a pillar, update this file in the same change.
