---
name: siren-verify
description: Run the SIREN verify loop for collector, engine, site, agent-kit, arena, and compliance. Use after code changes, before claiming done, or when the user asks to test/check/build.
---

# SIREN verify

Pick the smallest check that covers what you changed. Do not run the live
collector against the network unless the user asked for a live reading.

## Map change → command

| Touched path | Verify |
|---|---|
| `collector/**` (logic, not live fetch) | Relevant `node --test …` under `collector/test/` if present; else `node collector/posts.mjs --test` / area script |
| `collector/engine.mjs` or scoring | `node collector/engine.mjs` only when raw inputs exist; prefer unit/selftests if available |
| `site/**` | `node site/build.mjs` |
| `agent-kit/**` | `node --test agent-kit/test.mjs` |
| `arena/**` | `node --test arena/test.mjs` |
| `investors/**` | `node --test investors/test.mjs` |
| Copy / voice / legal surface | `npm run compliance` |
| Package scripts | See root `package.json` |

## Docker (no local Node)

```bash
docker run --rm --network host -v "$PWD":/app -w /app node:20-alpine node <script>
```

## Hard stops (fail the task)

- New `node_modules` import inside `collector/`, `site/`, or `agent-kit/`
- Secrets or `.env` contents committed
- Copy that treats the index as a probability or forecast
- Casual rewrite of `data/reference.json`

## Done criteria

Report which commands you ran and their exit status. If a check was skipped,
say why (missing data, user asked not to, out of scope).
