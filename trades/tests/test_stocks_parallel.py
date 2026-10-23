"""Offline test: stocks() with all network calls mocked; checks the parallel path keeps results and order."""
import pathlib, sys, time
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
import scan

def fake_get(url, **k):
    if "screener/stocks" in url:
        rows = [{"symbol": f"U{i}", "lastsale": "$20", "pctchange": "3%", "volume": "5,000,000", "marketCap": "1e9", "name": "u"} for i in range(30)]
        rows += [{"symbol": f"D{i}", "lastsale": "$20", "pctchange": "-4%", "volume": "5,000,000", "marketCap": "1e9", "name": "d"} for i in range(30)]
        return {"data": {"rows": rows}}
    if "marketmovers" in url: return {"data": {"STOCKS": {}}}
    if "_VIX" in url: return {"data": {"current_price": 19}}
    raise RuntimeError(url)

def test_parallel_stocks():
    scan.get = fake_get
    scan.cboe_px = lambda s: 10.0
    scan.nq_live = lambda s: (20.0, 3.0 if s.startswith("U") else -4.0)
    def tech(s, px=None, vol=None):
        time.sleep(0.05)
        up = s.startswith("U") or s == "SPY"
        return {"sma20": 1, "sma50": 1, "rsi": 60 if up else 35, "volx": 1.5, "above20": up, "above50": up, "px": px or 10}
    scan.tech = tech
    t0 = time.time(); out = scan.stocks(); dt = time.time() - t0
    assert [r["sym"] for r in out["longs"]][:3] == ["U0", "U1", "U2"], out["longs"][:3]
    assert len(out["puts"]) == 10 and out["puts"][0]["sym"].startswith("D")
    assert set(out["watch"]) >= {"MARA", "SQQQ", "QQQ"} and "px" in out["watch"]["MARA"]
    assert dt < 2.5, dt     # 70 checks x 0.05 s sequential would be ~3.5 s

if __name__ == "__main__":
    test_parallel_stocks(); print("ok test_parallel_stocks")
