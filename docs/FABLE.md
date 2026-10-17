# Claude Fable autonomous paper trader

`fable/` is a solo autonomous agent for US stocks/ETFs and crypto, driven by
Claude Fable. It is a side project: it does **not** feed the SIREN index.

**Not investment advice.** Fills are simulated. This package never places real
brokerage orders.

## Why it exists

The public [AI battle](ARENA.md) already seats several models on shared paper
wallets. Operators also want a **full autonomous loop** they can run locally
(or in CI) for one model — Claude Fable — with its own starting cash, journal,
and CLI. That loop lives in `fable/`.

Claude Fable also joins the arena roster as agent id `fable` so the board can
compare it with Opus, Sonnet, and the baselines under the same gate.

## Architecture

```
cli.mjs  →  agent.mjs tick
              ├─ arena/market.mjs   live books & hourly indicators
              ├─ brain.mjs          Claude Fable JSON proposals
              │    or fallback.mjs  rules when no API key
              ├─ arena/broker.mjs   price proposals into tickets
              ├─ arena/rules.mjs    hard gate (fable RULES overlay)
              └─ journal.mjs        state.json + ledger.ndjson
```

One tick:

1. **Guard** — walk 1-minute candles; stop/target exits fire even if the model sleeps.
2. **Snapshot** — Coinbase (crypto) + Yahoo (stocks) into the shared market table.
3. **Think** — Claude Fable returns `{ thoughts, bias, actions[], new_lessons[] }` (or the fallback), with the current memory block in the prompt.
4. **Price + gate** — each action becomes a ticket; only tickets that pass every rule fill.
5. **Improve** — ingest outcomes → rule lessons + bounded adapt knobs; optional model reflect on new exits.
6. **Journal** — wallet, `memory.json`, equity history, ledger, last market snapshot.

Self-improvement never bypasses the gate. `sizeScale` / `stopBiasPct` / stance only shape proposals (and the solo `maxPositionPct` overlay).

## Defaults

| Knob | Value |
|---|---|
| Start cash | $10,000 paper |
| Model | `claude-fable-5-1` (`FABLE_MODEL` override) |
| Max position | 20% of equity |
| Open positions | 5 |
| Cash floor | 10% of equity |
| Daily loss halt | 8% |

## Running

See [`fable/README.md`](../fable/README.md). Short form:

```bash
node fable/cli.mjs once --dir fable-out
node --test fable/test.mjs
```

## Safety

- No brokerage API keys are read.
- `FABLE_LIVE=I_ACCEPT_RISK` is **rejected** with an error — live wiring is not shipped.
- Secrets stay in env / GitHub Actions; never in `site/` or committed `.env`.
