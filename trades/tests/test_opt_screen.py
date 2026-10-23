"""Offline tests for the scan.py option screen (no network). Run: python3 trades/tests/test_opt_screen.py"""
import datetime, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
import scan

TODAY = datetime.date(2026, 10, 23)
def o(occ, bid, ask, delta, oi=1000, vol=50):
    return {"option": occ, "bid": bid, "ask": ask, "delta": delta, "open_interest": oi, "volume": vol}

CHAIN = {"current_price": 7.25, "options": [
    o("MARA261030P00006500", 0.15, 0.16, -0.30),          # pass
    o("MARA261030P00007000", 0.30, 0.33, -0.44),          # pass (spr 9.5%)
    o("MARA261030P00005000", 0.01, 0.02, -0.05),          # delta too low
    o("MARA261030P00007500", 0.50, 0.52, -0.60),          # ask over cap
    o("MARA261023P00006500", 0.05, 0.06, -0.30),          # 0 DTE excluded
    o("MARA261030C00008000", 0.10, 0.11, 0.28, oi=100),   # OI too low
    o("MARA261030C00007500", 0.20, 0.30, 0.40),           # spread 40% too wide
    o("MARA261106C00008000", 0.24, 0.26, 0.33),           # pass (call, 14 DTE? no: 11/06 = 14 DTE -> excluded)
    o("BADSYMBOL", 0.1, 0.2, 0.3),
]}

def test_filters():
    rows = scan.opt_pick("MARA", CHAIN, TODAY, trend=False)
    occs = [r["occ"] for r in rows]
    assert occs == ["MARA261030P00006500", "MARA261030P00007000"], occs
    r = rows[0]
    assert r["dte"] == 7 and r["side"] == "P" and r["trend_ok"] is True
    assert r["be"] == round(((6.5 - 0.16) / 7.25 - 1) * 100, 1)

def test_trend_alignment():
    rows = scan.opt_pick("MARA", CHAIN, TODAY, trend=True)   # uptrend: puts are counter-trend
    assert all(r["trend_ok"] is False for r in rows)
    assert scan.opt_pick("MARA", CHAIN, TODAY, trend=None)[0]["trend_ok"] is None

def test_occ_parse():
    k = scan.occ_parse("SQQQ261030C00042000")
    assert k["root"] == "SQQQ" and k["strike"] == 42.0 and k["side"] == "C"
    assert scan.occ_parse("junk") is None

def test_empty_and_missing():
    assert scan.opt_pick("X", {"current_price": 0, "options": CHAIN["options"]}, TODAY) == []
    assert scan.opt_pick("X", {"current_price": 5}, TODAY) == []
    no_delta = {"current_price": 7.25, "options": [{"option": "MARA261030P00006500", "bid": .15, "ask": .16, "open_interest": 900}]}
    assert scan.opt_pick("MARA", no_delta, TODAY) == []

if __name__ == "__main__":
    for n, f in list(globals().items()):
        if n.startswith("test_"): f(); print("ok", n)
