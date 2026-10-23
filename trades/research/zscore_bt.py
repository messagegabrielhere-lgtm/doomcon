#!/usr/bin/env python3
"""Z-score mean-reversion backtest (from the gs-quant post): buy when the 20d z-score < -2,
sell when it is back >= 0 (or after MAX_HOLD days), fees+slippage each side. Compare with
buy-and-hold over the same window and with the time actually invested. Stdlib; runs in Actions.
Writes trades/research/zscore.md."""
import pathlib, sys, datetime
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
import scan  # reuses the Nasdaq history fetch

SYMS = ["SPY", "QQQ", "IWM", "SQQQ", "SOXS", "MARA", "RIOT", "COIN", "MSTR", "NVDA", "AMD", "TSLA", "AAPL",
        "SOFI", "NIO", "F", "RIVN", "PLUG", "NOK", "T", "INTC", "RGTI", "SNAP", "AAL"]
COST = 0.001      # 0.05% fee/spread + 0.05% slippage per side
MAX_HOLD = 20
N, ENTRY, EXIT = 20, -2.0, 0.0

def closes(sym):
    frm = (scan.NOW - datetime.timedelta(days=760)).strftime("%Y-%m-%d"); to = scan.NOW.strftime("%Y-%m-%d")
    rows = scan.nq(f"historical?fromdate={frm}&todate={to}&limit=600", sym)["tradesTable"]["rows"]
    return [scan.num(r["close"]) for r in reversed(rows)]

def backtest(cl):
    trades, i = [], N
    while i < len(cl) - 1:
        z = scan.zscore(cl[:i + 1], N)
        if z is not None and z < ENTRY:
            buy = cl[i] * (1 + COST); j = i + 1
            while j < len(cl) - 1 and j - i < MAX_HOLD:
                zj = scan.zscore(cl[:j + 1], N)
                if zj is not None and zj >= EXIT: break
                j += 1
            trades.append((cl[j] * (1 - COST)) / buy - 1)
            i = j + 1
        else:
            i += 1
    return trades

def main():
    L = [f"# Z-score backtest ({datetime.date.today()}): buy z20<{ENTRY}, sell z>={EXIT} or {MAX_HOLD}d, {COST*100:.2f}%/side",
         "", "| sym | trades | win | avg | total | days held | buy&hold |", "|---|---|---|---|---|---|---|"]
    agg = []
    for s in SYMS:
        try: cl = closes(s)
        except Exception as e: L.append(f"| {s} | err {type(e).__name__} | | | | | |"); continue
        if len(cl) < 120: L.append(f"| {s} | short history | | | | | |"); continue
        t = backtest(cl); agg += t
        tot = 1.0
        for r in t: tot *= 1 + r
        bh = cl[-1] / cl[N] - 1
        L.append(f"| {s} | {len(t)} | {sum(r > 0 for r in t) / len(t):.0%} | {sum(t) / len(t):+.1%} | {tot - 1:+.0%} | ~{len(t) * 6} | {bh:+.0%} |" if t
                 else f"| {s} | 0 | | | | | {bh:+.0%} |")
    if agg:
        L += ["", f"ALL: {len(agg)} trades, win {sum(r > 0 for r in agg) / len(agg):.0%}, avg {sum(agg) / len(agg):+.2%} per trade after costs"]
    L += ["", "Read: an edge needs a positive average after costs across many trades AND to beat buy-and-hold per day invested. 'days held' is a rough estimate."]
    out = pathlib.Path(__file__).with_name("zscore.md"); out.write_text("\n".join(L) + "\n"); print("\n".join(L))

if __name__ == "__main__":
    main()
