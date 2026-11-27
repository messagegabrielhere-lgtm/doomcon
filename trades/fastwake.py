#!/usr/bin/env python3
"""Fast wake: tells Atlas (the trading scheduled task) the moment something needs it,
instead of waiting for its next scheduled pass. Stdlib only, no broker access.

  python3 trades/fastwake.py watch   # after check.py: BREACH (stop/target/trail) or ALERT (hot-watch trigger)
  python3 trades/fastwake.py scan    # after scan.py: a new candidate, or the gate turning QUIET -> CHECK

It calls the scheduled task's API trigger, so it needs two repo secrets: ATLAS_FIRE_URL and
ATLAS_FIRE_TOKEN (claude.ai/code/routines -> the trader task -> Add trigger -> API). Without them
it only prints what it would have sent. It never fails its caller.

Limits, so a stuck signal can't spam Atlas (each wake costs a session):
- watch: first send at once, then at most every 15 min while the same BREACH/ALERT stays up, 3 sends max.
- scan: at most one wake per 30 min. Stocks and options only wake Atlas in regular market hours
  (9:30-16:00 ET weekdays); crypto candidates and a QUIET -> CHECK gate wake it around the clock.
The first scan of each keeper run only sets the baseline, so a restart never wakes anyone.
"""
import datetime, json, os, pathlib, sys, urllib.error, urllib.request
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import session

ROOT = pathlib.Path(__file__).resolve().parent
STATE = pathlib.Path(os.environ.get("FASTWAKE_STATE", "/tmp/fastwake_state.json"))
WATCH_REPEAT = int(os.environ.get("FASTWAKE_WATCH_REPEAT_S", "900"))
WATCH_MAX = int(os.environ.get("FASTWAKE_WATCH_MAX", "3"))
SCAN_COOLDOWN = int(os.environ.get("FASTWAKE_SCAN_COOLDOWN_S", "1800"))
LISTS = (("STOCK universe", "STOCK", False), ("CRYPTO ", "CRYPTO", True),
         ("OPTIONS AGGR-FIT", "OPTION", False), ("PUT LIST", "PUT", False))  # (line prefix, tag, 24/7?)


def load():
    try:
        return json.loads(STATE.read_text())
    except Exception:
        return {}


def save(s):
    try:
        STATE.write_text(json.dumps(s))
    except Exception as e:
        print("fastwake: could not save state:", e)


def fire(text):
    url, tok = os.environ.get("ATLAS_FIRE_URL", ""), os.environ.get("ATLAS_FIRE_TOKEN", "")
    if not url or not tok:
        print("fastwake: secrets not set, would send:", text)
        return False
    req = urllib.request.Request(url, data=json.dumps({"text": text}).encode(), method="POST", headers={
        "Authorization": f"Bearer {tok}", "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            print("fastwake: sent", r.status, "|", text)
            return True
    except urllib.error.HTTPError as e:
        print("fastwake: HTTP", e.code, e.read()[:200].decode("utf-8", "replace"))
    except Exception as e:
        print("fastwake: failed", type(e).__name__, str(e)[:200])
    return False


def market_open(now):
    return session.is_open(now)      # NYSE calendar: holidays and 13:00 ET early closes included


def watch(s, ts):
    p = ROOT / "status.txt"
    lines = p.read_text().splitlines() if p.exists() else []
    head = lines[0] if lines else ""
    st = head.split()[0] if head else ""
    w = s.setdefault("watch", {"state": "OK", "n": 0, "at": 0})
    if st not in ("BREACH", "ALERT"):
        w.update(state=st or "OK", n=0, at=0)
        return
    if st != w.get("state"):
        w.update(state=st, n=0, at=0)
    if w["n"] >= WATCH_MAX or (w["n"] and ts - w["at"] < WATCH_REPEAT):
        return
    rows = [l for l in lines[1:] if any(k in l for k in ("-> STOP", "-> TARGET", "-> TRAIL", "-> ALERT"))]
    text = (f"FAST WAKE (keeper watch): {head}. " + " | ".join(r[:200] for r in rows[:4]) +
            ". Real-time wake, not a quiet pass: skip STEP 2 and handle these rows now with live quotes.")
    if fire(text):
        w.update(n=w["n"] + 1, at=ts)


def scan(s, ts, now):
    p = ROOT / "out" / "scan.md"
    if not p.exists():
        return
    gate, syms = "", set()
    is_open = market_open(now)
    for l in p.read_text().splitlines():
        if l.startswith("GATE:"):
            gate = (l.split() + ["", ""])[1]
        for prefix, tag, always in LISTS:
            if l.startswith(prefix) and "):" in l and (always or is_open):
                tail = l.rsplit("):", 1)[1].strip()
                if tail and tail != "none":
                    for item in tail.split(";"):
                        w = item.strip().split()
                        if w:
                            syms.add(f"{tag}:{w[0]}")
    c = s.setdefault("scan", {"gate": "", "seen": [], "pending": [], "gate_open": False, "at": 0})
    first = not c["gate"]
    new = syms - set(c["seen"])
    pending = (set(c["pending"]) | new) & syms          # only candidates still in the latest scan
    gate_open = (c["gate_open"] or (gate == "CHECK" and c["gate"] == "QUIET")) and gate == "CHECK"
    c.update(gate=gate or "?", seen=sorted(syms))
    if first:
        c.update(pending=[], gate_open=False)
        print(f"fastwake: baseline gate={gate} candidates={len(syms)}")
        return
    if (pending or gate_open) and ts - c["at"] >= SCAN_COOLDOWN:
        why = []
        if gate_open:
            why.append("gate QUIET -> CHECK")
        if pending:
            why.append("new candidates " + ", ".join(sorted(pending)[:12]))
        text = (f"FAST WAKE (keeper scan): {'; '.join(why)}. Real-time wake, not a quiet pass: skip STEP 2 "
                "and run the full pass now on the fresh scan.md and live Robinhood quotes; the rules still decide.")
        if fire(text):
            c.update(at=ts, pending=[], gate_open=False)
            return
    c.update(pending=sorted(pending), gate_open=gate_open)


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else ""
    now = datetime.datetime.now(datetime.timezone.utc)
    ts = int(now.timestamp())
    s = load()
    try:
        if mode == "watch":
            watch(s, ts)
        elif mode == "scan":
            scan(s, ts, now)
        else:
            print("usage: fastwake.py watch|scan")
    except Exception as e:  # never break the keeper loop
        print("fastwake: error", type(e).__name__, str(e)[:200])
    save(s)


if __name__ == "__main__":
    main()
