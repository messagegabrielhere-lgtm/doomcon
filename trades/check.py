#!/usr/bin/env python3
"""Trade watcher: free price checks against trades/watch.json, writes trades/status.txt.
No broker access, no secrets. Stdlib only."""
import json, urllib.request, datetime, pathlib

ROOT = pathlib.Path(__file__).resolve().parent
WATCH = ROOT / "watch.json"
STATUS = ROOT / "status.txt"
UA = {"User-Agent": "Mozilla/5.0 (trade-watch)"}

def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode())

def cboe(sym):
    return get(f"https://cdn.cboe.com/api/global/delayed_quotes/options/{sym.upper()}.json")["data"]

def price(p):
    t = p["type"]
    if t == "crypto":
        return float(get(f"https://api.coinbase.com/v2/prices/{p['symbol'].upper()}-USD/spot")["data"]["amount"])
    if t == "stock":
        try:
            return float(cboe(p["symbol"])["current_price"])
        except Exception:
            m = get(f"https://query1.finance.yahoo.com/v8/finance/chart/{p['symbol']}?range=1d&interval=1m")
            return float(m["chart"]["result"][0]["meta"]["regularMarketPrice"])
    if t == "option":
        opts = cboe(p["symbol"]).get("options") or []
        for o in opts:
            if o.get("option") == p["occ"]:
                bid, ask = float(o.get("bid") or 0), float(o.get("ask") or 0)
                return round((bid + ask) / 2, 2) if bid and ask else float(o.get("last_trade_price") or 0)
        sample = [o.get("option") for o in opts[:2]]
        raise RuntimeError(f"occ {p['occ']} not in {len(opts)} opts, e.g. {sample}")
    raise RuntimeError("bad type")

def verdict(p, px):
    high = max(float(p.get("high") or 0), px)
    p["high"] = high
    if p.get("stop") and px <= float(p["stop"]):
        return "STOP"
    if p.get("target") and px >= float(p["target"]):
        return "TARGET"
    tp = p.get("trail_pct")
    if tp and p.get("trail_from") and high >= float(p["trail_from"]) and px <= high * (1 - float(tp) / 100):
        return "TRAIL"
    return "HOLD"

def main():
    w = json.loads(WATCH.read_text()) if WATCH.exists() else {"positions": []}
    now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%MZ")
    lines, breach = [], False
    for p in w.get("positions", []):
        try:
            px = price(p)
            v = verdict(p, px)
        except Exception as e:
            px, v = None, f"ERR {type(e).__name__}: {str(e)[:120]}"
        if v in ("STOP", "TARGET", "TRAIL"):
            breach = True
        lines.append(f"{p['id']} px={px} stop={p.get('stop')} target={p.get('target')} high={p.get('high')} -> {v} | {p.get('action','')}")
    head = ("BREACH" if breach else "OK") + f" {now} n={len(lines)}"
    old = STATUS.read_text().splitlines() if STATUS.exists() else []
    old_body = old[1:] if old else None
    stale = True
    if old:
        try:
            ts = datetime.datetime.strptime(old[0].split()[1], "%Y-%m-%dT%H:%MZ").replace(tzinfo=datetime.timezone.utc)
            stale = (datetime.datetime.now(datetime.timezone.utc) - ts).total_seconds() > 20 * 60
        except Exception:
            pass
    changed = (old_body != lines) or stale or breach
    if changed:
        STATUS.write_text("\n".join([head] + lines) + "\n")
        WATCH.write_text(json.dumps(w, indent=1) + "\n")
    print(head); print("\n".join(lines)); print("changed" if changed else "unchanged")

if __name__ == "__main__":
    main()
