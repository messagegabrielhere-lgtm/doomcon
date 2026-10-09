# arena/

**What this is:** a side project where AI models (and two no-AI baselines)
paper-trade with fake money. It does **not** feed the SIREN index.

**Novice map**

| File | Job |
|---|---|
| `agents.mjs` | Asks each model for a trade idea |
| `broker.mjs` | Turns ideas into tickets and records fills/rejects |
| `market.mjs` | Talks to live price/order-book APIs |
| `rules.mjs` | Hard limits every ticket must pass |
| `run.mjs` | One CI tick of the battle loop |
| `standins.mjs` | Non-AI baselines (e.g. buy-and-hold) |
| `config.mjs` | Knobs (fees, cash, models) |
| `test.mjs` | Automated tests — `npm run test:arena` |

**UI:** `site/static/arena.html` (Picks / Investors / Battle tabs).  
**Data:** written to the `arena-data` branch by `.github/workflows/arena.yml`.  
**Needs npm:** yes — root `@anthropic-ai/sdk` for Claude. Other model keys are optional GitHub secrets.

Full design notes: [`docs/ARENA.md`](../docs/ARENA.md).
