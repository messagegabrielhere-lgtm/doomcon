# AI battle

`/arena.html`. Several AI models each trade a $1,000 paper wallet in crypto
against live Coinbase order books, next to two baselines that use no model.
It is a side project like the scanner. It reads only `arena/`, writes only the
`arena-data` branch, and shares nothing with the index.

**Paper money.** Prices, order books and candles are real (Coinbase Exchange
public API, no key). Fills, wallets and P&L are simulated. Nothing in `arena/`
holds a key that can move funds.

## The architecture

```
model ──proposal──▶ broker.preview ──ticket──▶ rules.gate ──pass──▶ broker.execute
                                                    └──fail──▶ ledger (rejected, with the rules it broke)
every tick: broker.checkExits (stops and targets, 1-minute candles) — no model involved
```

1. **The AI only proposes.** About once an hour each model gets the market
   table and its own wallet, and replies with up to 3 proposals as JSON:
   buy, sell, or move a stop. It has no way to execute anything.
2. **The proposal becomes a ticket before anything is signed.** `preview()`
   prices it by walking the live L2 book and writes down everything that
   would happen: the payer (the agent's paper wallet), the venue, quantity,
   average fill, slippage against mid, fees, the sell-back value, cash before
   and after, and the position afterwards.
3. **The rule gate checks the ticket, not the proposal.** `gate()` runs every
   rule and returns all of them, pass or fail. A ticket runs only if every
   rule passes. A rejection is published with the rules it broke, so the board
   shows what each model tried as well as what it got away with.
4. **Stops run without the AI.** Every tick, including the 5-minute guard
   ticks where no model is called, `checkExits()` walks the 1-minute candles
   since the last check for every open position. A wick through a stop between
   ticks still triggers. A candle that opens through the stop fills at the
   open (a gap), not at the stop. If one candle touches both stop and target,
   the stop wins. GitHub's scheduler often runs late, and the guard reads up
   to 5 hours of candles it missed.
5. **No honeypots.** Before a buy, the ticket works out what selling the same
   quantity straight back into the current bids would return after fees both
   ways. If it's under `minSellbackPct`, the buy is refused. On a real DEX
   this is the check that keeps out tokens you can buy but can't sell. Here
   it catches thin books.

## Rules

All in `arena/config.mjs` (`RULES`), shown on the page from the published
state, and given to every model in its system prompt. Telling a model the
rules doesn't enforce them; the gate does.

| rule | default |
|---|---|
| Stop loss on every buy, distance below fill | 1–15% |
| Stops move only up | always |
| Max one position, share of equity after the buy | 25% |
| Max open positions | 4 |
| Cash reserve | 5% of equity |
| Sell-back floor (round trip after fees) | 95% |
| Max slippage vs mid | 1% |
| Min 24h volume | $5M |
| Min order | $10 |
| Trades per UTC day (stop and target exits don't count) | 8 |
| No new buys after a drop from the day's open of | 10% |
| Cooldown before rebuying a closed coin | 60 min |
| Written reason | 12+ characters |
| Max order book age | 120 s |

Spot only, long only, 24 USD pairs, a 0.6% fee per fill.

## The players

| id | model (default) | key |
|---|---|---|
| opus | `claude-opus-5-5` | `ANTHROPIC_API_KEY` |
| sonnet | `claude-sonnet-5-5` | `ANTHROPIC_API_KEY` |
| haiku | `claude-haiku-4-5` | `ANTHROPIC_API_KEY` |
| gpt | `gpt-5` | `OPENAI_API_KEY` |
| grok | `grok-4` | `XAI_API_KEY` |
| gemini | `gemini-2.5-pro` | `GEMINI_API_KEY` |
| deepseek | `deepseek-chat` | `DEEPSEEK_API_KEY` |
| hodl | baseline: equal-weight BTC, ETH, SOL, XRP, widest stop | none |
| rsi | baseline: buy hourly RSI < 30, sell > 70, stops at 2 ATR | none |

Keys are repository secrets (Settings → Secrets and variables → Actions). A
model without its key **sleeps**: it appears on the board as a sleeping slime
and never trades. Add a key and it wakes up on the next hourly turn. The
baselines play under the same rules through the same gate; a model that
can't beat them isn't adding much.

Model ids go stale. Override any of them without a code change by setting a
repository *variable* `ARENA_MODEL_<ID>`, e.g. `ARENA_MODEL_GPT=gpt-5.1`.

The Claude players go through the Anthropic SDK with structured JSON output.
Opus and Sonnet also have server-side refusal fallbacks enabled
(`fallbacks: "default"`). If a fallback model answers a turn, the board says
"answered by …" on that card and the ledger records the model that answered.
The others are plain HTTPS calls to each provider's own API.

## The slimes

Each agent is drawn as a slime. It **glows** when its equity is above the
$1,000 start, **melts** when it's below, and **falls asleep** when it has no
key or has run out of money.

## Running it

```bash
npm ci
node --test arena/test.mjs                 # offline; a fake exchange stands in
node arena/run.mjs --dir arena-out         # one turn: guard, then every agent
node arena/run.mjs --dir arena-out --guard # stops and targets only
node arena/run.mjs --dir arena-out --only rsi,hodl
```

`.github/workflows/arena.yml` runs every 5 minutes with `--auto`: a full turn
on the first tick of each UTC hour at or after minute 5, a guard tick
otherwise. A guard tick with nothing open publishes nothing.

## What's published (`arena-data` branch)

| file | what |
|---|---|
| `state.json` | wallets, positions, stops, equity history (hourly, ~90 days), the roster and the rules |
| `ledger.ndjson` | every fill, stop, target and rejection since the start, append-only, with its ticket |
| `trades.json` | the newest 500 ledger entries, newest first, for the board |
| `market.json` | the market table the agents saw on the last turn |

The page reads these from raw.githubusercontent.com. Point it at another
copy with `arena.html?data=<base url>`.

To restart the competition, delete the `arena-data` branch. The next tick
starts every wallet at $1,000 again.
