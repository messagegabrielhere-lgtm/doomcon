"""Offline test for trades/fastwake.py: a local fake endpoint stands in for the scheduled-task API trigger.
Run: python3 trades/tests/test_fastwake.py"""
import datetime, http.server, importlib.util, json, os, shutil, sys, tempfile, threading, pathlib

got = []
class H(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        body = self.rfile.read(int(self.headers["Content-Length"]))
        got.append((self.headers.get("Authorization"), self.headers.get("anthropic-version"), json.loads(body)["text"]))
        self.send_response(200); self.end_headers(); self.wfile.write(b'{"type":"routine_fire"}')
    def log_message(self, *a): pass
srv = http.server.HTTPServer(("127.0.0.1", 0), H)
threading.Thread(target=srv.serve_forever, daemon=True).start()

tmp = pathlib.Path(tempfile.mkdtemp()); (tmp / "trades" / "out").mkdir(parents=True)
shutil.copy(pathlib.Path(__file__).resolve().parents[1] / "fastwake.py", tmp / "trades" / "fastwake.py")
shutil.copy(pathlib.Path(__file__).resolve().parents[1] / "session.py", tmp / "trades" / "session.py")
os.environ.update(ATLAS_FIRE_URL=f"http://127.0.0.1:{srv.server_port}/fire", ATLAS_FIRE_TOKEN="sk-test",
                  FASTWAKE_STATE=str(tmp / "state.json"))
spec = importlib.util.spec_from_file_location("fw", tmp / "trades" / "fastwake.py"); fw = importlib.util.module_from_spec(spec); spec.loader.exec_module(fw)

def status(head, rows): (tmp / "trades" / "status.txt").write_text("\n".join([head] + rows) + "\n")
def scanmd(gate, stock="none", crypto="none", opt="none", put="none"):
    (tmp / "trades" / "out" / "scan.md").write_text("\n".join([
        "SCAN x", f"GATE: {gate}", "REGIME x",
        f"CRYPTO 82 ok/7 miss. LONG 5-20% (PASS=1h<=8% rising): {crypto}",
        f"STOCK universe 7298 (109 repriced, 55 moved >1pt vs screener). LONG (1-8%, >SMA20, RSI55-75, vol>=avg): {stock}",
        f"PUT LIST (<SMA20, RSI25-45, vol>1M): {put}",
        f"OPTIONS AGGR-FIT (0/40 chains; 1-7DTE, IDX=index-beta driver (one slot) else OWN; ~15m delayed, re-quote live): {opt}"]) + "\n")
def n(): return len(got)
s = {}
T = 1_000_000
mkt = datetime.datetime(2026, 11, 20, 15, 0, tzinfo=datetime.timezone.utc)   # 10:00 ET Friday
off = datetime.datetime(2026, 11, 21, 8, 0, tzinfo=datetime.timezone.utc)    # 03:00 ET Saturday
ok = []
def check(name, cond): ok.append((name, cond)); print(("PASS " if cond else "FAIL ") + name)

# ---- watch
status("OK 2026-11-20T07:01Z n=1", ["ON_SQQQ px=49.42 -> HOLD | sell"]); fw.watch(s, T); check("OK sends nothing", n() == 0)
status("BREACH 2026-11-20T07:02Z n=1", ["ON_SQQQ px=47.90 stop=48.04 -> STOP | SELL 2 SQQQ"]); fw.watch(s, T + 60); check("BREACH sends at once", n() == 1)
check("auth + version headers", got[-1][0] == "Bearer sk-test" and got[-1][1] == "2023-06-01")
check("text names the row", "ON_SQQQ" in got[-1][2] and got[-1][2].startswith("FAST WAKE"))
fw.watch(s, T + 120); check("same BREACH inside 15 min: no resend", n() == 1)
fw.watch(s, T + 60 + 900); check("still BREACH after 15 min: resend", n() == 2)
fw.watch(s, T + 60 + 1800); check("third send", n() == 3)
fw.watch(s, T + 60 + 2700); check("capped at 3 per episode", n() == 3)
status("OK 2026-11-20T08:00Z n=0", []); fw.watch(s, T + 4000); check("OK resets", s["watch"]["n"] == 0)
status("ALERT 2026-11-20T08:01Z n=1", ["W:TQQQ px=101 above 100 score=3 -> ALERT | breakout"]); fw.watch(s, T + 4060); check("ALERT sends", n() == 4 and "W:TQQQ" in got[-1][2])

# ---- scan, market hours
base = n()
scanmd("CHECK market", stock="MDLN 39.16 +3.9%; VIK 100.36 +6.5%"); fw.scan(s, T, mkt); check("first scan = baseline only", n() == base)
fw.scan(s, T + 600, mkt); check("same candidates: nothing", n() == base)
scanmd("CHECK market", stock="MDLN 39.16 +3.9%; VIK 100.36 +6.5%; TGT 165.90 +4.0%"); fw.scan(s, T + 1200, mkt)
check("new stock candidate in market hours wakes", n() == base + 1 and "STOCK:TGT" in got[-1][2])
scanmd("CHECK market", stock="MDLN 39.16; VIK 100.36; TGT 165.90", opt="SPY 11/21 600P 0.31 d-.30"); fw.scan(s, T + 1800, mkt)
check("new option inside 30 min cooldown waits", n() == base + 1 and "OPTION:SPY" in s["scan"]["pending"])
fw.scan(s, T + 1200 + 1800, mkt); check("pending option sent after cooldown", n() == base + 2 and "OPTION:SPY" in got[-1][2])

# ---- scan, off hours (new run = fresh state)
s2 = {}; base = n()
scanmd("QUIET", stock="MDLN 39.16"); fw.scan(s2, T, off); check("off-hours baseline", n() == base)
scanmd("QUIET", stock="MDLN 39.16; NEWCO 5.00", put="IREN 15.24"); fw.scan(s2, T + 600, off); check("off-hours stock/put candidates ignored", n() == base)
scanmd("CHECK BTC +3%", stock="MDLN 39.16"); fw.scan(s2, T + 1200, off); check("gate QUIET->CHECK wakes off-hours", n() == base + 1 and "gate QUIET -> CHECK" in got[-1][2])
scanmd("CHECK BTC +3%", crypto="SOL 7.1% 1h 2.0%"); fw.scan(s2, T + 1500, off); check("crypto candidate inside cooldown waits", n() == base + 1 and s2["scan"]["pending"] == ["CRYPTO:SOL"])
scanmd("CHECK BTC +3%", crypto="none"); fw.scan(s2, T + 3100, off); check("candidate that left the scan is dropped", n() == base + 1 and s2["scan"]["pending"] == [])

# ---- no secrets: prints, never sends, never raises
os.environ.pop("ATLAS_FIRE_URL"); s3 = {}; base = n()
status("BREACH x n=1", ["A -> STOP | x"]); fw.watch(s3, T); check("no secrets: no send", n() == base)
os.environ["ATLAS_FIRE_URL"] = "http://127.0.0.1:9/fire"; s4 = {}
fw.watch(s4, T); check("unreachable endpoint: no crash, will retry", s4["watch"]["n"] == 0)

srv.shutdown()
print("ALL PASS" if all(c for _, c in ok) else "SOME FAILED")
sys.exit(0 if all(c for _, c in ok) else 1)
