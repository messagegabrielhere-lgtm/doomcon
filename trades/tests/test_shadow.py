#!/usr/bin/env python3
"""Offline tests for shadow.py (no network)."""
import datetime, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
import shadow

UTC = datetime.timezone.utc
T0 = datetime.datetime(2026, 11, 20, 14, 0, tzinfo=UTC)
SCAN = {"stocks": {"regime": {"label": "RISK-OFF"},
                   "longs": [{"sym": "DIS", "px": 100.0, "d": 4.6, "rsi": 69, "volx": 1.9, "above20": True, "above50": True}],
                   "puts": [{"sym": "SOXL", "px": 40.0, "d": -4.1, "rsi": 32, "volx": 1.0}]},
        "crypto": {"btc": {"above_sma20_1h": False, "vs_mark": -2.0},
                   "longs": [{"sym": "SNX", "px": 2.0, "d": 6.0, "pass": True}], "downs": [{"sym": "SKY", "px": 1.0, "d": -9.0}]}}

def at(h): return T0 + datetime.timedelta(hours=h)

def test_open_dedupe_mark_close():
    led = shadow.step({}, SCAN, {}, T0)
    assert {e["setup"] for e in led["open"]} == {"stock_long", "stock_put", "coin_long_pass", "coin_down"}
    assert len(shadow.step(led, SCAN, {}, at(0.5))["open"]) == 4           # same rows are not re-opened
    px = {"stock": {"DIS": 110.0, "SOXL": 36.0}, "crypto": {"SNX": 1.8, "SKY": 1.0}}
    led = shadow.step(led, {}, px, at(4))
    r = {e["sym"]: e for e in led["open"]}
    assert r["DIS"]["r4"] == 10.0 and r["SOXL"]["r4"] == 10.0 and r["SNX"]["r4"] == -10.0   # put side profits on a drop
    led = shadow.step(led, {}, px, at(24))
    assert not led["open"] and len(led["closed"]) == 4 and all(e["r24"] is not None for e in led["closed"])
    assert r["DIS"]["hi"] == 10.0 and r["SNX"]["lo"] == -10.0

def test_stale_dropped_and_report():
    led = shadow.step({}, SCAN, {}, T0)
    assert not shadow.step(led, {}, {}, at(73))["open"]                  # never priced for 72h
    led = shadow.step(shadow.step(led, {}, {"stock": {"DIS": 101.0}}, at(4)), {}, {"stock": {"DIS": 102.0}}, at(25))
    out = "\n".join(shadow.report(led))
    assert "STOCK_LONG: n=1 win24h 100% avg24h +1.9%" in out and "(n<30)" in out and "regime:" not in out

def test_edge_flags():
    mk = lambda r: {"r24": r, "r4": r, "hi": r, "lo": r}
    assert shadow.flag(shadow.agg([mk(1.0)] * 30)) == " EDGE+"
    assert shadow.flag(shadow.agg([mk(-1.0)] * 30)) == " EDGE-"
    assert shadow.flag(shadow.agg([mk(1.0)] * 29)) == " (n<30)"

def test_cost_and_digest():
    led = shadow.step({}, SCAN, {}, T0)
    assert {e["kind"]: e["cost"] for e in led["open"]} == {"stock": 0.1, "crypto": 2.0}
    assert shadow.digest(led)[0].startswith("SHADOW: no closed entries yet (open=4")
    px = {"stock": {"DIS": 101.0, "SOXL": 40.0}, "crypto": {"SNX": 2.02, "SKY": 1.0}}
    led = shadow.step(led, {}, px, at(24))
    a = shadow.agg([e for e in led["closed"] if e["setup"] == "coin_long_pass"])
    assert round(a["avg"], 2) == -1.0 and a["win"] == 0                  # +1% gross is a loss after 2% crypto cost
    mk = lambda r: {"setup": "stock_long", "r24": r, "r4": r, "hi": r, "lo": r, "cost": 0.1, "feat": {"rsi": "70+"}}
    d = shadow.digest({"closed": [mk(2.0)] * 30})
    assert d[0].startswith("SHADOW (paper 24h") and "stock_long n=30 win 100% avg +1.9% EDGE+" in d[0]
    assert d[1] == "  stock_long rsi=70+: n=30 win 100% avg +1.9% EDGE+"

if __name__ == "__main__":
    for n, f in list(globals().items()):
        if n.startswith("test_"): f(); print("ok", n)
