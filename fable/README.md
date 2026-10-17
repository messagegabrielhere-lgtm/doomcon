# fable/ — Claude Fable stock & crypto paper trader

Autonomous agent that paper-trades US stocks/ETFs and crypto, driven by
**Claude Fable** (Anthropic). It reuses the arena paper broker, order books,
and rule gate. **Not investment advice.**

This package does **not** feed the SIREN index. It does **not** place real
brokerage orders — even if `FABLE_LIVE` is set (that flag is refused).

## Quick start

```bash
# Rule-based fallback (no API key)
node fable/cli.mjs once --dir fable-out

# Claude Fable model turn
export ANTHROPIC_API_KEY=…
# optional: export FABLE_MODEL=claude-fable-5-1
node fable/cli.mjs once --dir fable-out

node fable/cli.mjs status --dir fable-out
node fable/cli.mjs guard --dir fable-out          # stops/targets only
node fable/cli.mjs loop --dir fable-out --every 3600
```

Docker (no local Node):

```bash
docker run --rm --network host -v "$PWD":/app -w /app \
  -e ANTHROPIC_API_KEY -e FABLE_MODEL \
  node:20-alpine node fable/cli.mjs once --dir fable-out
```

## Layout

| File | Job |
|---|---|
| `cli.mjs` | `once` / `guard` / `loop` / `status` |
| `agent.mjs` | One tick: guard → think → price → gate → fill |
| `brain.mjs` | Claude Fable system prompt + JSON schema + API call |
| `fallback.mjs` | Rule stand-in when the key is missing |
| `journal.mjs` | `state.json`, `ledger.ndjson`, `trades.json` |
| `config.mjs` | Cash, risk overlay, model id, universe |
| `test.mjs` | Offline tests — `npm run test:fable` |

Market data and fills come from `arena/market.mjs` and `arena/broker.mjs`
(Coinbase books for crypto, Yahoo last±spread for stocks).

## Risk controls

Shared arena gate plus a solo overlay in `config.mjs`:

- Long-only spot; stocks only in the US regular session
- Stop required on every buy (1–15% below fill)
- Max ~20% of equity per name, 5 open positions, 10% cash floor
- Daily loss halt, trade count cap, rebuy cooldown
- Server-side stop/target guard on 1-minute candles every tick

## Env

| Variable | Meaning |
|---|---|
| `ANTHROPIC_API_KEY` | Model access; without it the rule fallback runs |
| `FABLE_MODEL` | Default `claude-fable-5-1` |
| `FABLE_FALLBACK=1` | Force the rule stand-in |
| `FABLE_LIVE` | Must stay unset — live orders are not implemented |

## Arena battle

Claude Fable also appears on the public AI battle roster as agent id `fable`
(`arena/config.mjs`). The solo package here is the full autonomous loop with
its own wallet and CLI.

## Verify

```bash
node --test fable/test.mjs
# or
npm run test:fable
```
