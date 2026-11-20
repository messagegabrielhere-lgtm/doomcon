#!/usr/bin/env python3
"""Offline test: VIX fallback from the macro section when CBOE's VIX feed fails (no network)."""
import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
import scan

UP = {"above20": True, "above50": True}

def test_fallback_flips_label():
    res = {"stocks": {"regime": {"spy": UP, "vix": 0, "label": "RISK-ON"}}, "macro": {"q": {"VIX": {"px": 28.44}}}}
    scan.vix_fallback(res)
    rg = res["stocks"]["regime"]
    assert rg["vix"] == 28.44 and rg["vix_src"] == "macro" and rg["label"] == "RISK-OFF"

def test_no_change_when_cboe_ok_or_no_macro():
    res = {"stocks": {"regime": {"spy": UP, "vix": 19, "label": "RISK-ON"}}, "macro": {"q": {"VIX": {"px": 30}}}}
    scan.vix_fallback(res); assert res["stocks"]["regime"] == {"spy": UP, "vix": 19, "label": "RISK-ON"}
    res = {"stocks": {"regime": {"spy": UP, "vix": 0, "label": "RISK-ON"}}, "macro": {}}
    scan.vix_fallback(res); assert res["stocks"]["regime"]["label"] == "RISK-ON"
    scan.vix_fallback({"stocks": {"regime": {"label": "UNKNOWN"}}, "macro": {"q": {"VIX": {"px": 30}}}})  # no spy: no crash

def test_labels():
    assert scan.regime_label(UP, 20) == "RISK-ON"
    assert scan.regime_label({"above20": False, "above50": True}, 20) == "MIXED"
    assert scan.regime_label({"above20": True, "above50": False}, 15) == "RISK-OFF"

if __name__ == "__main__":
    for n, f in list(globals().items()):
        if n.startswith("test_"): f(); print("ok", n)
