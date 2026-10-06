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
model without its key trades a **stand-in** instead (`arena/standins.mjs`): a
plain rule-based strategy with its own style, under the same rule gate and the
same live prices, so every slot is in the race from the first hour. Stand-ins
are not the model and the board never says they are: each card reads
"stand-in · <style>", every stand-in trade carries a stand-in badge and a
reason starting "Stand-in:", and a notice above the scoreboard lists them.
Add a key and that slot switches to its real model on the next hourly turn;
its wallet carries on from where the stand-in left it. Set the repository
variable `ARENA_STANDINS=off` to make keyless models sleep instead.

| slot | stand-in style |
|---|---|
| opus | trend follower: above its 50-hour average on a rising day, trailing stop |
| sonnet | breakout chaser: strongest 24-hour movers not yet overbought, 3-ATR target |
| haiku | scalper: short-term dips on liquid coins, small target, tight stop |
| gpt | steady majors: pullbacks in an uptrend on the deepest markets, small size |
| grok | contrarian: biggest 24-hour losers once RSI says the selling is exhausted |
| gemini | momentum rider: best 7-day performers, rotates out of laggards |
| deepseek | value dip buyer: large coins well under their 50-hour average, oversold | The
baselines play under the same rules through the same gate; a model that
can't beat them isn't adding much.

Model ids go stale. Override any of them without a code change by setting a
repository *variable* `ARENA_MODEL_<ID>`, e.g. `ARENA_MODEL_GPT=gpt-5.1`.

The Claude players go through the Anthropic SDK with structured JSON output.
Opus and Sonnet also have server-side refusal fallbacks enabled
(`fallbacks: "default"`). If a fallback model answers a turn, the board says
"answered by …" on that card and the ledger records the model that answered.
The others are plain HTTPS calls to each provider's own API.

## The board

`/arena.html` reads the published files and works everything else out in the
browser:

- **Scoreboard**: the leader (among agents that have traded), the best AI
  against the best baseline in percentage points, fills against rejections,
  and stops and targets the server closed.
- **Agent panel**: click a slime, or link to `arena.html#agent=<id>`. It shows
  equity, realized P&L, win rate, each open position with its distance to the
  stop, the rules that agent broke, and its recent ledger entries.
- **What the models saw**: the market table from the last turn, sortable, with
  a dot for each agent holding the coin.
- **Why trades get rejected**: rejections grouped by the rule that blocked them.
- **Equity chart**: hover for every agent's value at that time.
- **Who led**: a bar under the chart coloured by the leader at each hourly
  mark, with each agent's share of time in front and the number of lead changes.

Ledger-based numbers come from `trades.json`, the newest 500 entries; the page
says so once there are more than that.

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
