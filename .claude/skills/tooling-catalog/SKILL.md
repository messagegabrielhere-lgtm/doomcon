---
name: tooling-catalog
description: Choose external Claude Code / operator tools for diagrams, decks, voice, orchestration, and agent packs. Use when the user asks for a diagram, PowerPoint, voice/dub, multi-agent staff, or how to install ECC / skills / memory.
---

# Tooling catalog (SIREN operators)

These are **optional external tools**. They are not dependencies of the SIREN
index. Install and run them on the operator machine; do not pull them into
`collector/`, `site/`, or `agent-kit/` (Node built-ins rule).

Full install commands: [`docs/CLAUDE-CODE.md`](../../../docs/CLAUDE-CODE.md).

## Make Claude Code itself sharper (prefer these first)

| Tool | When | Install hint |
|---|---|---|
| [mattpocock/skills](https://github.com/mattpocock/skills) | Daily engineering skills (TDD, review, triage, specs) | `claude plugin install mattpocock-skills@claude-plugins-official` then `/setup-matt-pocock-skills` |
| [affaan-m/ECC](https://github.com/affaan-m/ECC) | Skills + memory + security harness for Claude Code / Cursor | `npx ecc-universal@2.2.3 setup` — do not stack a second full manual Claude install |
| [andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) | Four behavioral rules (already inlined in root `CLAUDE.md`) | Already adapted here; optional upstream plugin |
| [claude-mem](https://github.com/thedotmack/claude-mem) | Auto session memory across chats | `npx claude-mem install` or `/plugin install claude-mem` |

Repo fallbacks without plugins: skills `karpathy-guidelines`, `siren-tdd`,
`siren-verify`, `session-handoff`.

## Creative / ops utilities

| Tool | When it helps SIREN work | Install / use |
|---|---|---|
| [diagram-design](https://github.com/cathrynlavery/diagram-design) | Architecture / pillar / pipeline diagrams in brand | `npx skills add cathrynlavery/diagram-design` — output one self-contained HTML+SVG; match `docs/BRAND.md` palette |
| [ppt-master](https://github.com/hugohe3/ppt-master) | Editable investor/outreach decks from PDF/DOCX/MD | Follow upstream README; keep claims inside `docs/VOICE.md` (no forecasts) |
| [VoiceStudio](https://github.com/debpalash/VoiceStudio) | Local voice clone / dub / transcript for clips | Local app only; do not commit audio models or API keys |
| [paperclip](https://github.com/paperclipai/paperclip) | Multi-agent "staff" orchestration outside this repo | Use for parallel research/ops; SIREN score still comes from this tree's collector |
| [gods-eye-view](https://github.com/bilawalsidhu/gods-eye-view) | 3D globe / traffic visualization experiments | Browser toy; unrelated to the index formula |
| [REA](https://github.com/morluto/rea) | Operator-only analysis of software you own or are licensed to inspect | Do **not** ask agents here to reverse-engineer third-party apps you do not have rights to analyze |

## How to advise the user

1. For coding quality → ECC + mattpocock skills + this repo's `CLAUDE.md`.
2. For continuity → claude-mem; else `session-handoff`.
3. For a diagram → diagram-design (+ brand docs).
4. For a deck → ppt-master, then voice-check numbers against `docs/VOICE.md`.
5. Never add these tools as runtime deps of the SIREN pipeline.
