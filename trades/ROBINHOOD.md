# Robinhood Agentic MCP: what Atlas can do (researched 2026-10-23)

Source: the connector's own tool definitions (91 tools) plus live reads of the account. Trading stays limited to
the one agentic account (••8237) and to the owner's rules in RULES.md; this file lists capability, not permission.

## The account (live, 10/23 01:00 ET)
- ••8237 "MCP": **cash** account, individual, **options level 2**, the ONLY account this agent can trade (all other accounts read as not accessible).
- Trade approvals: **off** (orders execute without a tap in the app). Only the owner can change that, in the app.
- Unsettled funds: **$40.95** (Thursday's NOK sale). Cash accounts can't reuse unsettled proceeds; buying power ($164.95) excludes it until settlement (next business day).
- Level 2 = long calls/puts, covered calls, cash-secured puts. **No spreads** (needs level 3 + margin), **no margin, no shorting** (also forbidden by our rules).

## Trading (real money; always review_* first, fresh UUID ref_id)
| Tool | What it does | Limits that matter |
|---|---|---|
| review_equity_order / place_equity_order | Stocks/ETFs: market, limit, stop_market, stop_limit; GFD/GTC | Outside 9:30-16:00 only **limit** orders; `all_day_hours` = 24 Hour Market; fractional/dollar orders regular hours + market only |
| review_advanced_order / place_advanced_order | **OCO** (take-profit limit + stop-loss stop-market) | Regular hours only; each leg >= 0.25% from price, legs >= $0.10 apart; whole shares |
| review_option_order / place_option_order | Single-leg options; limit, market, stop_limit, **stop_market** | Multi-leg not on cash accounts. Option **stop_market = sell-to-close only, GFD, regular hours** (a broker-side stop we are not using yet) |
| preview_crypto_order / place_crypto_order | Crypto market/limit/stop/stop-limit, by quantity or dollars | Quantity must match the pair's increment; market buys have a ~1% collar |
| cancel_equity_order / cancel_option_order / cancel_advanced_order / cancel_crypto_order | Cancel open orders | Needed before replacing an OCO (no "modify") |
| exercise_option / cancel_option_exercise | Exercise long options | Irrevocable once processing; we never plan to exercise |
| get_trade_approvals / decline_trade_approval / get_trade_approval_setting | Approval queue | Approvals are off on ••8237 |

## Account and order data
get_accounts, get_portfolio (value, cash, buying power), get_equity_positions, get_option_positions, get_crypto_positions,
get_equity_orders / get_option_orders / get_crypto_orders / get_advanced_orders (filters: state, symbol, agent_initiated),
get_equity_tax_lots, **get_realized_pnl** (bucketed totals by asset class) and **get_pnl_trade_history** (per-trade realized P&L,
week/month/3month/ytd/all), get_limited_margin_upgrade_info, get_option_level_upgrade_info.

## Market data (real time, unlike our ~15-min-delayed free sources)
- Quotes: get_equity_quotes (incl. overnight), get_option_quotes (by instrument id), get_crypto_quotes, get_index_quotes (SPX, NDX...).
- **get_equity_price_book**: Level 2 order book (bid/ask ladder) for up to 4 symbols.
- History: get_equity_historicals (15-second to 50-year bars, extended/24h sessions), get_option_historicals, get_index_historicals.
- **get_equity_technical_indicators**: RSI, SMA/EMA, MACD, Bollinger, ATR, VWAP, ADX, Supertrend, pivots... up to 10 symbols per call, server-side.
- Option chains: get_option_chains -> get_option_instruments (expiry/strike/type) -> get_option_quotes.
- Fundamentals and research: get_equity_fundamentals, get_financials, get_equity_analyst_ratings, get_earnings_results (one symbol),
  **get_earnings_calendar** (market-wide, 31-day window), get_politician_trades, SEC filings (get_sec_filing_index / get_sec_filing / facts).
- get_equity_tradability (per-session eligibility), search (name -> symbol), get_currency_pairs, get_indexes.

## Screeners, alerts, watchlists, charts
- **Scanner** (Robinhood Legend): preview_scan / create_scan / run_scan / update_scan_*; enum filters (RSI, volume, % change...) or
  raw expressions over technical, price/volume, fundamental, **options volume/OI, implied volatility / IV rank**, quote spread. Presets incl.
  HIGH_OPTIONS_VOLUME_IV and UPCOMING_EARNINGS. Live data.
- **Alerts**: create_alert / update_alert / delete_alert / get_alerts on price or indicator conditions (price vs SMA/EMA/VWAP/Bollinger,
  RSI, MACD). The owner gets a normal Robinhood push when one fires; the agent only learns by polling get_alert_log.
- Watchlists (stocks, crypto, indexes, options), followable curated lists.
- Legend charts: list layouts/charts, add/update/remove indicators, change interval/timeframe.

## What we use today vs. untapped
Used: quotes, positions, portfolio, orders, review/place equity + option + OCO, cancel, option chains/instruments/quotes, P&L history.

Untapped, ranked by value for this account (suggestions only; nothing below is switched on):
1. **Broker-side option stops** (stop_market sell-to-close, GFD): a real stop on each option, placed each morning, instead of relying only on
   our 1-minute GitHub watcher with 15-min-delayed CBOE data (cause of the false MARA alarm). Catch: stop-market can fill badly on a wide spread.
2. **Live scanner for option candidates**: a saved scan on options volume/IV + % change would give real-time candidates; our scan.py screen
   is ~15-20 min old by the time a pass reads it.
3. **Server-side indicators** (get_equity_technical_indicators): RSI/SMA for 10 names per call, real time, instead of Nasdaq history.
4. **get_earnings_calendar**: one call to enforce "no earnings inside the hold" for every candidate.
5. **Level 2 book** before entries/exits in thin names (NOK, MARA puts' underlyings).
6. **Robinhood price alerts** mirroring our management levels (SQQQ $41, QQQ $725.20) so the owner's phone buzzes too. Owner-facing, so
   only with the owner's OK (our rule: push notifications only for orders, fills and pauses).
7. **get_pnl_trade_history** as the source of truth for score_check.py (instead of our hand-kept trades.json).

## Hard limits (tool-enforced)
- Only ••8237 is tradable; every other account rejects writes.
- OCO: regular hours only, so overnight protection is our watcher + manual action.
- Options: no multi-leg on a cash account; option stop orders are GFD only (re-place daily).
- Cash account: unsettled proceeds can't be reused until they settle (limited margin would allow it; not requested).
