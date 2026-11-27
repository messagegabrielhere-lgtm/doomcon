#!/usr/bin/env python3
"""Offline test: NYSE session calendar (holidays, 13:00 ET early closes) and what depends on it."""
import datetime, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
import fastwake, scan, session

D = datetime.date
def utc(y, mo, d, h, mi=0): return datetime.datetime(y, mo, d, h, mi, tzinfo=datetime.timezone.utc)

def test_session_kinds():
    assert session.session(D(2026, 11, 25)) == ("full", 16 * 60)
    assert session.session(D(2026, 11, 26)) == ("closed", None)          # Thanksgiving
    assert session.session(D(2026, 11, 27)) == ("half", 13 * 60)         # day after: 13:00 ET close
    assert session.session(D(2026, 11, 28)) == ("closed", None)          # Saturday
    assert session.session(D(2026, 7, 3)) == ("closed", None)            # July 4 observed
    assert session.session(D(2026, 12, 24)) == ("half", 13 * 60)

def test_is_open():
    assert session.is_open(utc(2026, 11, 27, 15, 0))                     # 10:00 ET half day
    assert not session.is_open(utc(2026, 11, 27, 18, 30))                # 13:30 ET: already closed
    assert not session.is_open(utc(2026, 11, 26, 16, 0))                 # holiday at 11:00 ET
    assert not session.is_open(utc(2026, 11, 25, 14, 0))                 # 09:00 ET pre-open
    assert session.is_open(utc(2026, 11, 25, 20, 59))                    # 15:59 ET
    assert fastwake.market_open(utc(2026, 11, 27, 15, 0)) and not fastwake.market_open(utc(2026, 11, 27, 18, 30))

def test_note():
    assert session.note(D(2026, 11, 27)) == "HALF DAY: closes 13:00 ET"
    assert session.note(D(2026, 11, 26)).startswith("CLOSED today; next session Fri 11/27 (half day")
    assert session.note(D(2026, 11, 25)) == "full day; next session Fri 11/27 is a half day (closes 13:00 ET), market closed Thu 11/26"
    assert session.note(D(2026, 11, 23)) is None                         # ordinary Monday: no line

def test_gate_respects_calendar():
    scan.NOW = utc(2026, 11, 26, 16, 0)                                  # Thanksgiving 11:00 ET
    assert scan.gate({}, {}, live=False) == "QUIET"
    scan.NOW = utc(2026, 11, 27, 18, 30)                                 # half day, after the close
    assert "market-hours" not in scan.gate({}, {}, live=False)
    scan.NOW = utc(2026, 11, 27, 15, 0)
    assert scan.gate({}, {}, live=False) == "CHECK market-hours"

def test_gate_weekend_mode_ignores_futures():
    m = {"q": {"ES": {"chg": 1.6}, "NQ": {"chg": 2.5}}}
    scan.NOW = utc(2026, 11, 27, 21, 14)                                 # Fri 16:14 ET: WEEKEND MODE, crypto only
    assert scan.gate({}, m, live=False) == "QUIET"
    scan.NOW = utc(2026, 11, 27, 20, 30)                                 # Fri 15:30 ET, after the early close: still a share fire
    assert "NQ +2.5%" in scan.gate({}, m, live=False)

def test_gap_line():
    w = {"QQQ": {"px": 649.58, "prev": 633.93}, "SQQQ": {"px": 46.03, "prev": 49.60}}
    spy = {"px": 729.84, "prev": 716.70}
    assert scan.gap_line(spy, w) == "GAP vs last regular close: SPY +1.8%; QQQ +2.5%; SQQQ -7.2% | sec 7 bear trigger (SPY or QQQ <= -1.0%): no"
    assert scan.gap_line({"px": 708.0, "prev": 716.70}, w).endswith("YES (SPY -1.2%), confirm still extending on live quotes")
    assert scan.gap_line({}, {}) is None

if __name__ == "__main__":
    for n, f in list(globals().items()):
        if n.startswith("test_"): f(); print("ok", n)
