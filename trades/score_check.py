#!/usr/bin/env python3
"""SCORE CHECK (RULES sec 11b) + weekly stats from trades/sb/trades.json. Stdlib, no network.
Usage: python3 trades/score_check.py [--since YYYY-MM-DD]"""
import json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent
MIN_N = 20

def bucket(s):
    return "6+" if s >= 6 else str(int(s))

def stats(rows):
    n = len(rows)
    if not n: return {"n": 0}
    wins = sum(1 for r in rows if (r.get("realized") or 0) > 0)
    pp = [r["pnl_pct"] for r in rows if r.get("pnl_pct") is not None]
    return {"n": n, "win": wins / n, "avg_pct": (sum(pp) / len(pp)) if pp else None,
            "sum": sum(r.get("realized") or 0 for r in rows)}

def report(trades, since=None):
    t = [r for r in trades if not since or (r.get("closed") or "") >= since]
    lines = []
    allst = stats(t)
    if allst["n"]:
        lines.append(f"ALL {allst['n']} closed: win {allst['win']:.0%}, realized ${allst['sum']:+.2f}")
    by = {}
    for r in t:
        if r.get("score") is not None: by.setdefault(bucket(r["score"]), []).append(r)
    verdict = []
    for b in ("4", "5", "6+"):
        s = stats(by.get(b, []))
        if not s["n"]:
            lines.append(f"score {b}: no scored trades"); continue
        avg = f"{s['avg_pct']:+.0%}" if s["avg_pct"] is not None else "-"
        lines.append(f"score {b}: n={s['n']} win {s['win']:.0%} avg {avg} ${s['sum']:+.2f}" + ("" if s["n"] >= MIN_N else f" (n<{MIN_N}: no verdict)"))
        if s["n"] >= MIN_N and s["avg_pct"] is not None and s["avg_pct"] < 0:
            verdict.append(b)
    if "4" in verdict and "5" in verdict:
        lines.append("VERDICT: scores 4 and 5 both negative over >=20 trades -> tell owner the scoring has no proven edge")
    elif "4" in verdict:
        lines.append("VERDICT: score 4 negative over >=20 trades -> raise entry bar to 5")
    else:
        lines.append("VERDICT: no change (too few scored trades or averages not negative)")
    by_setup = {}
    for r in t: by_setup.setdefault(r.get("asset") or "?", []).append(r)
    lines.append("BY ASSET: " + "; ".join(f"{k} n={v['n']} win {v['win']:.0%} ${v['sum']:+.2f}" for k, v in ((k, stats(x)) for k, x in sorted(by_setup.items()))))
    return lines

if __name__ == "__main__":
    since = sys.argv[sys.argv.index("--since") + 1] if "--since" in sys.argv else None
    print("\n".join(report(json.loads((ROOT / "sb" / "trades.json").read_text()), since)))
