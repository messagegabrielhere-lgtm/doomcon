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

def test_option_debounce(tmp=None):
    import json, tempfile, pathlib as pl
    d = pl.Path(tempfile.mkdtemp())
    check.WATCH, check.STATUS = d / "watch.json", d / "status.txt"
    row = {"id": "X", "type": "option", "symbol": "MARA", "occ": "O", "cost": 0.16, "stop": 0.06, "target": 0.32}
    check.WATCH.write_text(json.dumps({"positions": [row], "watches": []}))
    check.price = lambda p: 0.05                      # below stop
    check.main(); assert check.STATUS.read_text().startswith("OK"), "first reading must not BREACH"
    check.main(); assert check.STATUS.read_text().startswith("BREACH"), "second reading must BREACH"
    check.price = lambda p: 0.15
    check.main(); assert "breach_n" not in json.loads(check.WATCH.read_text())["positions"][0]

if __name__ == "__main__":
    test_option_debounce(); print("ok test_option_debounce")
