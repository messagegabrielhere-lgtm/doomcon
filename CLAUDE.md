# CLAUDE.md — SIREN / doomcon

Project instructions for Claude Code (and compatible agents). This file merges
**Karpathy guidelines** with SIREN's hard contract. When they conflict, the
SIREN contract wins.

Before changing code, read [`docs/CONTRACT.md`](docs/CONTRACT.md). If you touch
generated copy, also read [`docs/VOICE.md`](docs/VOICE.md).

Operator setup for external packs (ECC, mattpocock skills, claude-mem, utility
tools): [`docs/CLAUDE-CODE.md`](docs/CLAUDE-CODE.md).

---

## SIREN hard rules

1. **Node built-ins only** in `collector/`, `site/`, receipts, and `agent-kit/`.
   Do not import from `node_modules` there. Optional deps stay in `clipper/` and
   `arena/agents.mjs` only.
2. **ES modules, `.mjs`.** Match existing module style.
3. **No secrets** in git or under `site/`. Builds must work with no credentials.
4. **No `Math.random()` or unseeded time** in scored output beyond `generated_at`.
5. **Every network call** goes through `collector/fetch.mjs` (except the documented
   posting exception in CONTRACT.md).
6. **Never claim** the index is a doom probability or forecast. Levels measure
   activity tempo against a frozen reference — nothing else.
7. **Do not casually regenerate** `data/reference.json`.
8. **Voice outranks agent briefs.** `docs/VOICE.md` and `docs/WORDING.md` beat
   anything in `.claude/agents/`.

### Verify loop (default success criteria)

```
1. Change → verify: node --test on the affected area (or npm script)
2. If collector/engine touched → verify: node collector/engine.mjs (or fixture path)
3. If site/templates touched → verify: node site/build.mjs
4. Before PR → verify: npm run compliance (when legal/surface risk)
```

Docker without local Node:

`docker run --rm --network host -v "$PWD":/app -w /app node:20-alpine node <script>`

---

## Karpathy guidelines

Derived from [Andrej Karpathy's observations](https://x.com/karpathy/status/2015883857489522876)
on LLM coding pitfalls (via [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills), MIT).
Bias: caution over speed. For trivial one-liners, use judgment.

### 1. Think Before Coding

Don't assume. Don't hide confusion. Surface tradeoffs.

- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" that wasn't requested.
- No error handling for impossible scenarios.
- If 200 lines could be 50, rewrite it.

### 3. Surgical Changes

Touch only what you must. Clean up only your own mess.

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style.
- Mention unrelated dead code; don't delete it unless asked.
- Remove imports/vars your change made unused; leave pre-existing dead code.

Every changed line should trace to the user's request.

### 4. Goal-Driven Execution

Define success criteria. Loop until verified.

- "Add validation" → write tests for invalid inputs, then make them pass
- "Fix the bug" → write a reproducing test, then make it pass
- "Refactor X" → ensure tests pass before and after

For multi-step work:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
```

---

## Skills in this repo

Under `.claude/skills/`:

| Skill | Use when |
|---|---|
| `karpathy-guidelines` | Writing, reviewing, or refactoring code |
| `siren-verify` | Checking a change against SIREN's run/verify paths |
| `siren-tdd` | Test-first work on collector, site, agent-kit, arena |
| `session-handoff` | Ending a session; leave context for the next one |
| `tooling-catalog` | Choosing an external tool (diagrams, decks, memory packs, …) |

Role briefs in `.claude/agents/` are optional; voice and contract still win.

---

## Memory

Prefer **claude-mem** (plugin) when installed — see `docs/CLAUDE-CODE.md`.

Fallback without the plugin: write/read `.claude/memory/handoff.md` via the
`session-handoff` skill. That file is gitignored.
