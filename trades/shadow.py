#!/usr/bin/env python3
"""SHADOW LEDGER: real-time forward test of every scan row. Stdlib only, never places orders.

Each scan run: open a paper "shadow" entry for every candidate row (stock longs, PUT LIST,
coin longs, coin downs) with its features at that moment, mark every open entry with the
prices scan.py just downloaded (out/prices.json), record its return at +4h and +24h, then
close it. shadow.md groups closed entries by setup and feature so the scoring can be judged
on hundreds of outcomes instead of waiting for 20 real trades. It changes no rule: a bucket
flagged EDGE+/EDGE- is evidence for the owner, not an instruction.

Usage: python3 trades/shadow.py   (after scan.py; reads out/scan.json + out/prices.json)
"""
import datetime, json, pathlib, time, urllib.error, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT / "out"
PRIOR_URL = "https://raw.githubusercontent.com/messagegabrielhere-lgtm/doomcon/trade-data/shadow.json"
PER_SETUP = 6            # newest rows taken per setup per scan
KEEP_CLOSED = 4000
MIN_N = 30               # no EDGE flag below this many closed entries
H4, H24, STALE = 4, 24, 72
COST = {"stock": 0.1, "crypto": 2.0}   # est. round-trip cost in %, taken off every result (Robinhood crypto
                                       # bid/ask runs ~1-2% wide: BTC was 1.9% on 11/19), so EDGE flags are net

def ts(s): return datetime.datetime.strptime(s, "%Y-%m-%dT%H:%MZ").replace(tzinfo=datetime.timezone.utc)

def band(x, cuts, names):
    if x is None: return "?"
    for c, n in zip(cuts, names):
        if x < c: return n
    return names[-1]

def candidates(scan):
    """(kind, sym, side, setup, px, feat) for every scan row worth testing."""
    st, cr = scan.get("stocks") or {}, scan.get("crypto") or {}
    reg = (st.get("regime") or {}).get("label", "?")
    btc = cr.get("btc") or {}
    ctx = {"regime": reg, "btc_up": btc.get("above_sma20_1h"),
           "btc_vs_mark": band(btc.get("vs_mark"), (-1, 1), ("<-1%", "flat", ">+1%"))}
    out = []
    for setup, rows, side in (("stock_long", st.get("longs"), 1), ("stock_put", st.get("puts"), -1)):
        for r in (rows or [])[:PER_SETUP]:
            out.append(("stock", r["sym"], side, setup, r.get("px"), dict(ctx,
                rsi=band(r.get("rsi"), (30, 50, 70), ("<30", "30-50", "50-70", "70+")),
                volx=band(r.get("volx"), (1.5,), ("<1.5x", "1.5x+")),
                trend="above50" if r.get("above50") else "above20" if r.get("above20") else "below20",
                day=band(abs(r.get("d") or 0), (5, 10), ("<5%", "5-10%", "10%+")))))
    for r in (cr.get("longs") or [])[:PER_SETUP]:
        out.append(("crypto", r["sym"], 1, "coin_long_pass" if r.get("pass") else "coin_long", r.get("px"),
                    dict(ctx, day=band(r.get("d"), (10,), ("5-10%", "10%+")))))
    for r in (cr.get("downs") or [])[:PER_SETUP]:
        out.append(("crypto", r["sym"], -1, "coin_down", r.get("px"),
                    dict(ctx, day=band(r.get("d"), (-15, -10), ("<-15%", "-15..-10%", "-10..-5%")))))
    return [c for c in out if c[4]]

def step(led, scan, prices, now):
    """Mark open entries, close the matured ones, open new ones. Pure: returns the new ledger."""
    led = {"open": list(led.get("open", [])), "closed": list(led.get("closed", []))}
    still = []
    for e in led["open"]:
        px = (prices.get(e["kind"]) or {}).get(e["sym"])
        age = (now - ts(e["t"])).total_seconds() / 3600
        if px:
            r = round(e["side"] * (px / e["px0"] - 1) * 100, 2)
            e["hi"], e["lo"], e["last"] = max(e["hi"], r), min(e["lo"], r), r
            if age >= H4 and e.get("r4") is None: e["r4"] = r
            if age >= H24:
                e["r24"] = r; e["closed"] = now.strftime("%Y-%m-%dT%H:%MZ"); led["closed"].append(e); continue
        if age < STALE: still.append(e)          # no price for 72h (delisted/renamed): drop silently
    have = {(e["sym"], e["setup"]) for e in still}
    for kind, sym, side, setup, px, feat in candidates(scan):
        if (sym, setup) in have: continue
        have.add((sym, setup))
        still.append({"t": now.strftime("%Y-%m-%dT%H:%MZ"), "kind": kind, "sym": sym, "side": side, "setup": setup,
                      "px0": px, "cost": COST[kind], "feat": feat, "hi": 0.0, "lo": 0.0, "last": 0.0, "r4": None, "r24": None})
    led["open"], led["closed"] = still, led["closed"][-KEEP_CLOSED:]
    led["updated"] = now.strftime("%Y-%m-%dT%H:%MZ")
    return led

def agg(rows):
    n = len(rows)
    if not n: return None
    net = lambda e, k: e[k] - e.get("cost", 0)
    r24 = [net(e, "r24") for e in rows]
    r4 = [net(e, "r4") for e in rows if e.get("r4") is not None]
    return {"n": n, "win": sum(1 for x in r24 if x > 0) / n, "avg": sum(r24) / n,
            "r4": sum(r4) / len(r4) if r4 else None, "hi": sum(e["hi"] for e in rows) / n, "lo": sum(e["lo"] for e in rows) / n}

def flag(a):
    if a["n"] < MIN_N: return f" (n<{MIN_N})"
    if a["avg"] > 0.5 and a["win"] >= 0.55: return " EDGE+"
    if a["avg"] < -0.5 and a["win"] <= 0.45: return " EDGE-"
    return ""

def fmt(name, a):
    r4 = f"{a['r4']:+.1f}%" if a["r4"] is not None else "-"
    return f"{name}: n={a['n']} win24h {a['win']:.0%} avg24h {a['avg']:+.1f}% avg4h {r4} best {a['hi']:+.1f}% worst {a['lo']:+.1f}%{flag(a)}"

def short(name, a):
    return f"{name} n={a['n']} win {a['win']:.0%} avg {a['avg']:+.1f}%{flag(a)}"

def report(led):
    cl = led.get("closed", [])
    L = [f"SHADOW {led.get('updated', '?')} open={len(led.get('open', []))} closed={len(cl)} "
         "(paper forward test of every scan row; 24h hold, delayed prices, win/avg net of est. cost; evidence only, changes no rule)"]
    by = {}
    for e in cl: by.setdefault(e["setup"], []).append(e)
    for setup in sorted(by):
        rows = by[setup]
        L.append(fmt(setup.upper(), agg(rows)))
        keys = sorted({k for e in rows for k in e["feat"]})
        for k in keys:
            grp = {}
            for e in rows: grp.setdefault(str(e["feat"].get(k)), []).append(e)
            if len(grp) > 1:
                L.append(f"  {k}: " + "; ".join(short(v, agg(g)) for v, g in sorted(grp.items())))
    if not cl: L.append("no closed entries yet (first results 24h after the first scan)")
    return L

def digest(led):
    """Short block appended to scan.md so every pass sees the forward-test result: one line per setup,
    plus feature buckets that earned an EDGE flag (n >= MIN_N)."""
    by = {}
    for e in led.get("closed", []): by.setdefault(e["setup"], []).append(e)
    if not by: return [f"SHADOW: no closed entries yet (open={len(led.get('open', []))}; first 24h results pending)"]
    L = ["SHADOW (paper 24h, net of est. cost; evidence only): " + "; ".join(short(s, agg(by[s])) for s in sorted(by))]
    for s in sorted(by):
        for k in sorted({k for e in by[s] for k in e["feat"]}):
            grp = {}
            for e in by[s]: grp.setdefault(str(e["feat"].get(k)), []).append(e)
            for v, g in sorted(grp.items()):
                a = agg(g)
                if flag(a).strip().startswith("EDGE"): L.append(f"  {s} {k}={v}: " + short("", a).strip())
    return L

def load_prior():
    """out/shadow.json (the workflows fetch it from trade-data first), else the published copy.
    A missing ledger (404) starts fresh; any other failure stops without writing, so the
    publish step re-sends the old ledger instead of wiping it."""
    p = OUT / "shadow.json"
    if p.exists(): return json.loads(p.read_text())
    try:
        with urllib.request.urlopen(f"{PRIOR_URL}?t={int(time.time())}", timeout=15) as r: return json.loads(r.read())
    except urllib.error.HTTPError as e:
        if e.code == 404: print("shadow: no published ledger yet; starting fresh"); return {}
        raise SystemExit(f"shadow: prior ledger HTTP {e.code}; not writing")

def main():
    scan = json.loads((OUT / "scan.json").read_text())
    prices = json.loads((OUT / "prices.json").read_text())
    led = step(load_prior(), scan, prices, ts(scan["utc"]))
    (OUT / "shadow.json").write_text(json.dumps(led, separators=(",", ":")))
    L = report(led)
    (OUT / "shadow.md").write_text("\n".join(L) + "\n")
    md = OUT / "scan.md"
    if md.exists(): md.write_text(md.read_text().rstrip("\n") + "\n\n" + "\n".join(digest(led)) + "\n")
    print("\n".join(L[:12]))

if __name__ == "__main__":
    main()
