# AGENTS.md — working on this repository

You are editing **SIREN** (repo name `doomcon`): an hourly, recomputable index of
AI activity tempo. Public site: https://siren.watch/

## Before you change anything

1. Read [`docs/CONTRACT.md`](docs/CONTRACT.md) — shapes, pillars, Node built-ins rule.
2. Read [`docs/VOICE.md`](docs/VOICE.md) if you touch generated copy (no future tense / doom claims).
3. Prefer existing modules over new dependencies. The collector, engine, receipts, and site **must not** import from `node_modules`.
4. Claude Code / Cursor: read root [`CLAUDE.md`](CLAUDE.md) (Karpathy rules + SIREN hard rules) and optional pack install in [`docs/CLAUDE-CODE.md`](docs/CLAUDE-CODE.md).

## Run / verify

```bash
node collector/collect.mjs          # live readings → data/raw/
node collector/engine.mjs           # score → data/state.json + receipts
node site/build.mjs                 # static site → public/
node --test arena/test.mjs
node --test fable/test.mjs
node --test agent-kit/test.mjs
npm run compliance                  # allow-list + audit
```

Docker (no local Node install):  
`docker run --rm --network host -v "$PWD":/app -w /app node:20-alpine node <script>`

## Where code lives

| Path | Owns |
|---|---|
| `collector/` | Fetch, score, posts, cards |
| `site/` | Static site generator + templates |
| `data/` | State, history, receipts (committed) |
| `agent-kit/` | **For other AI agents**: CLI + MCP over the public API |
| `arena/` | Side project: model trading battle |
| `fable/` | Side project: autonomous Claude Fable stock/crypto paper trader |
| `docs/` | Specs and playbooks |
| `.claude/skills/` | Claude Code skills (verify, TDD, handoff, tooling) |
| `CLAUDE.md` | Project instructions for Claude Code |

## For AI agents *using* SIREN (not editing the repo)

Do not scrape HTML. Use:

- https://siren.watch/agents.md — fetch-first map (also https://siren.watch/AGENTS.md)
- https://siren.watch/agents.txt — agents-txt.com skills announcement
- https://siren.watch/skill.md — how to phrase and cite
- https://siren.watch/api/now.txt — current reading
- https://siren.watch/.well-known/api-catalog — RFC 9727 API catalog
- Or run `node agent-kit/cli.mjs now` / `node agent-kit/mcp.mjs` from this tree

## Hard no

- Secrets in git or in `site/`
- Regenerating `data/reference.json` casually
- Calling `fetch()` outside `collector/fetch.mjs` (except the documented posting exception)
- Claiming the index is a doom probability or forecast
