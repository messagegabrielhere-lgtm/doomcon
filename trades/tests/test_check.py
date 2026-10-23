"""Offline tests for check.py verdict logic. Run: python3 trades/tests/test_check.py"""
import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
import check

def test_verdict():
    p = {"stop": 35.84, "target": 42.71, "trail_pct": 0, "trail_from": 0, "high": 39.0}
    assert check.verdict(dict(p), 39.6) == "HOLD"
    assert check.verdict(dict(p), 35.80) == "STOP"
    assert check.verdict(dict(p), 42.80) == "TARGET"
    t = {"stop": 0.06, "target": 9, "trail_pct": 50, "trail_from": 0.32, "high": 0.40}
    assert check.verdict(dict(t), 0.19) == "TRAIL" and check.verdict(dict(t), 0.25) == "HOLD"

def test_watch():
    now = "2026-10-23T15:00Z"
    c = {"trigger": 41.0, "side": "above", "expires": "2026-10-23"}
    assert check.watch_verdict(c, 40.9, now) == "WAIT"
    assert check.watch_verdict(c, 41.1, now) == "ALERT" and c["fired"] == now
    assert check.watch_verdict(c, 40.0, now) == "ALERT"          # latched until ack
    c["ack"] = True; assert check.watch_verdict(c, 42, now) == "ACK"
    assert check.watch_verdict({"trigger": 1, "expires": "2026-10-22"}, 2, now) == "EXPIRED"
    assert check.watch_verdict({"trigger": 725.2, "side": "below"}, 700, now) == "ALERT"

if __name__ == "__main__":
    for n, f in list(globals().items()):
        if n.startswith("test_"): f(); print("ok", n)
