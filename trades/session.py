#!/usr/bin/env python3
"""NYSE regular-session calendar: full-day holidays and 13:00 ET early closes. Stdlib only.
The tables are hand-kept from the NYSE holiday schedule; extend them each year (a missing year reads as normal weekdays)."""
import datetime
try:
    from zoneinfo import ZoneInfo
    NY = ZoneInfo("America/New_York")
except Exception:
    NY = datetime.timezone(datetime.timedelta(hours=-5))

D = datetime.date
HOLIDAYS = {D(2026, 1, 1), D(2026, 1, 19), D(2026, 2, 16), D(2026, 4, 3), D(2026, 5, 25), D(2026, 6, 19), D(2026, 7, 3),
            D(2026, 9, 7), D(2026, 11, 26), D(2026, 12, 25),
            D(2027, 1, 1), D(2027, 1, 18), D(2027, 2, 15), D(2027, 3, 26), D(2027, 5, 31), D(2027, 6, 18), D(2027, 7, 5),
            D(2027, 9, 6), D(2027, 11, 25), D(2027, 12, 24)}
EARLY = {D(2026, 11, 27), D(2026, 12, 24), D(2027, 11, 26)}        # close 13:00 ET
OPEN_MIN = 9 * 60 + 30

def session(d):
    """('full'|'half'|'closed', regular close in minutes after midnight ET or None)."""
    if d.weekday() >= 5 or d in HOLIDAYS: return "closed", None
    return ("half", 13 * 60) if d in EARLY else ("full", 16 * 60)

def is_open(now):
    """True while the regular session is trading at this aware datetime."""
    et = now.astimezone(NY)
    kind, close = session(et.date())
    return kind != "closed" and OPEN_MIN <= et.hour * 60 + et.minute < close

def _day(d): return f"{d:%a} {d.month}/{d.day}"

def note(d):
    """One scan.md line when today or the next session is not an ordinary full day, else None."""
    kind, close = session(d)
    if kind == "half": return f"HALF DAY: closes {close // 60}:{close % 60:02d} ET"
    nxt, shut = d + datetime.timedelta(days=1), []
    while session(nxt)[0] == "closed":
        if nxt.weekday() < 5: shut.append(nxt)
        nxt += datetime.timedelta(days=1)
    half = session(nxt)[0] == "half"
    if kind == "closed" and d.weekday() < 5:
        return f"CLOSED today; next session {_day(nxt)} ({'half day, closes 13:00 ET' if half else 'full day'})"
    if not half and not shut: return None
    t = ("full day" if kind == "full" else "weekend") + f"; next session {_day(nxt)}" + (" is a half day (closes 13:00 ET)" if half else "")
    return t + (", market closed " + ", ".join(_day(x) for x in shut) if shut else "")
