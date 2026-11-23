#!/usr/bin/env python3
"""Offline test: while the RULES sec 14 crypto pause holds and no coin is held, crypto alone never wakes a full pass."""
import datetime, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
import scan

C = {"btc": {"vs_mark": 3.2, "above_sma20_1h": True}, "longs": [{"pass": True}]}
ROW = {"setup": "coin_long_pass", "r24": 2.0, "cost": 0.5, "hi": 1, "lo": -1, "feat": {}}
SAT = datetime.datetime(2026, 11, 21, 17, 0, tzinfo=datetime.timezone.utc)   # Saturday noon ET: no overnight market

def test_crypto_live():
    assert not scan.crypto_live({"closed": [ROW] * 29}, {})                       # too few
    assert scan.crypto_live({"closed": [ROW] * 30}, {})                           # n >= 30, avg > 0
    assert not scan.crypto_live({"closed": [dict(ROW, r24=-1.0)] * 30}, {})       # negative average
    assert scan.crypto_live({}, {"positions": [{"type": "crypto", "symbol": "JTO"}]})   # a held coin always counts
    assert scan.crypto_live(None, {})                                             # ledger unreadable: fail open

def test_gate_quiet_while_paused():
    scan.NOW = SAT
    assert scan.gate(C, {}, live=False) == "QUIET"
    assert "crypto PASS row" in scan.gate(C, {}, live=True)
    assert "event risk" in scan.gate(C, {"event_risk": True}, live=False)

if __name__ == "__main__":
    test_crypto_live(); test_gate_quiet_while_paused(); print("ok")
