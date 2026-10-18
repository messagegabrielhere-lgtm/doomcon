#!/usr/bin/env python3
"""Free market scan for the Robinhood Agentic routine. Stdlib only, no secrets.
Writes out/scan.md (short, for the LLM) and out/scan.json.
Sources: Coinbase Exchange (all Robinhood coins), Nasdaq screener (all US stocks),
stooq/Yahoo daily history, CBOE delayed quotes, Kalshi public markets."""
import json, time, csv, io, datetime, pathlib, urllib.request, urllib.parse, sys

ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT / "out"; OUT.mkdir(exist_ok=True)
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
      "Accept": "application/json, text/plain, */*", "Accept-Language": "en-US,en;q=0.9"}
NOW = datetime.datetime.now(datetime.timezone.utc)
ERRS = []

T0 = time.time()
def log(msg):
    print(f"[{time.time()-T0:6.1f}s] {msg}", flush=True)

class Budget:
    def __init__(self, secs): self.end = time.time() + secs
    def ok(self): return time.time() < self.end

def get(url, raw=False, tries=1, headers=None, timeout=12):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=headers or UA)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                b = r.read()
            return b.decode("utf-8", "replace") if raw else json.loads(b.decode())
        except Exception as e:
            last = e; time.sleep(0.6)
    raise last

def pct(a, b):
    return (a / b - 1) * 100 if a and b else None

def sma(xs, n):
    xs = [x for x in xs if x is not None]
    return sum(xs[-n:]) / n if len(xs) >= n else None

def rsi(closes, n=14):
    c = [x for x in closes if x is not None]
    if len(c) < n + 1: return None
    g = l = 0.0
    for i in range(1, n + 1):
        d = c[i] - c[i - 1]; g += max(d, 0); l += max(-d, 0)
    ag, al = g / n, l / n
    for i in range(n + 1, len(c)):
        d = c[i] - c[i - 1]
        ag = (ag * (n - 1) + max(d, 0)) / n; al = (al * (n - 1) + max(-d, 0)) / n
    return 100.0 if al == 0 else 100 - 100 / (1 + ag / al)

# ---------- CRYPTO (Coinbase Exchange public) ----------
CB = "https://api.exchange.coinbase.com"
def crypto():
    syms = [s.strip() for s in (ROOT / "crypto_syms.txt").read_text().replace("\n", ",").split(",") if s.strip()]
    rows = []
    bud = Budget(170)
    for s in syms:
        if not bud.ok(): rows.append({"sym": s.split("-")[0], "err": "budget"}); continue
        try:
            st = get(f"{CB}/products/{s}/stats"); tk = get(f"{CB}/products/{s}/ticker")
            last, op = float(st["last"]), float(st["open"])
            bid, ask = float(tk.get("bid") or 0), float(tk.get("ask") or 0)
            spread = pct(ask, bid) if bid and ask else None
            rows.append({"sym": s.split("-")[0], "px": last, "d": pct(last, op), "spr": spread,
                         "vol_usd": float(st.get("volume") or 0) * last})
        except Exception as e:
            rows.append({"sym": s.split("-")[0], "err": type(e).__name__})
        time.sleep(0.12)
    ok = [r for r in rows if "err" not in r]
    log(f"crypto quotes done: {len(ok)} ok, {len(rows)-len(ok)} missing")
    # BTC context: 1h candles -> 20-SMA, midnight-ET mark, last-hour move
    btc = {}
    try:
        c = get(f"{CB}/products/BTC-USD/candles?granularity=3600")  # [time, low, high, open, close, vol], newest first
        c = sorted(c)[-30:]
        closes = [x[4] for x in c]
        btc["px"] = closes[-1]; btc["sma20_1h"] = sma(closes, 20)
        et_off = -4 if 3 <= NOW.month <= 10 else -5  # EDT/EST approximation
        midnight_et_utc = (NOW + datetime.timedelta(hours=et_off)).replace(hour=0, minute=0, second=0, microsecond=0) - datetime.timedelta(hours=et_off)
        mark = [x for x in c if x[0] == int(midnight_et_utc.timestamp())]
        btc["mark_midnight_et"] = mark[0][3] if mark else None
        btc["vs_mark"] = pct(btc["px"], btc["mark_midnight_et"]) if btc.get("mark_midnight_et") else None
        btc["h1"] = pct(closes[-1], closes[-2])
        btc["above_sma20_1h"] = bool(btc["sma20_1h"] and btc["px"] > btc["sma20_1h"])
    except Exception as e:
        ERRS.append(f"btc candles {type(e).__name__}")
    longs = [r for r in ok if r["d"] is not None and 5 <= r["d"] <= 20 and (r["spr"] or 99) <= 3]
    longs.sort(key=lambda r: -r["vol_usd"])
    for r in longs[:8]:
        try:
            c = sorted(get(f"{CB}/products/{r['sym']}-USD/candles?granularity=3600"))[-4:]
            cl = [x[4] for x in c]
            r["h1"] = pct(cl[-1], cl[-2]); r["rising"] = len(cl) >= 3 and cl[-1] > cl[-2] > cl[-3]
            r["pass"] = (r["h1"] or 0) <= 8 and r["rising"]
        except Exception as e:
            r["h1"] = None; r["pass"] = None
        time.sleep(0.12)
    downs = sorted([r for r in ok if r["d"] is not None and r["d"] <= -5], key=lambda r: r["d"])
    return {"btc": btc, "n": len(ok), "n_err": len(rows) - len(ok), "longs": longs[:8], "downs": downs[:8],
            "leaders": sorted(ok, key=lambda r: -(r["d"] or -99))[:5]}

# ---------- STOCKS ----------
def hist(sym, days=80):
    """Daily closes/volumes, oldest first. stooq first, Yahoo fallback."""
    try:
        t = get(f"https://stooq.com/q/d/l/?s={sym.lower()}.us&i=d", raw=True)
        rd = list(csv.DictReader(io.StringIO(t)))
        if len(rd) > 30:
            return [float(r["Close"]) for r in rd[-days:]], [float(r["Volume"] or 0) for r in rd[-days:]]
    except Exception:
        pass
    m = get(f"https://query1.finance.yahoo.com/v8/finance/chart/{sym}?range=4mo&interval=1d")["chart"]["result"][0]
    q = m["indicators"]["quote"][0]
    return [c for c in q["close"] if c is not None][-days:], [v or 0 for v in q["volume"]][-days:]

def tech(sym, px=None, vol=None):
    cl, vo = hist(sym)
    if px: cl = cl + [px]
    if vol: vo = vo + [vol]
    s20, s50 = sma(cl[:-1], 20), sma(cl[:-1], 50)
    avgv = sma(vo[:-1], 20) or 0
    return {"sma20": s20, "sma50": s50, "rsi": rsi(cl), "volx": (vo[-1] / avgv) if avgv else None,
            "above20": bool(s20 and cl[-1] > s20), "above50": bool(s50 and cl[-1] > s50), "px": cl[-1]}

def cboe_px(sym):
    return float(get(f"https://cdn.cboe.com/api/global/delayed_quotes/options/{sym}.json")["data"]["current_price"])

def stocks():
    out = {}
    # regime
    try:
        spy = tech("SPY", px=cboe_px("SPY"))
        try: vix = cboe_px("_VIX")
        except Exception: vix = get("https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?range=1d&interval=1m")["chart"]["result"][0]["meta"]["regularMarketPrice"]
        reg = "RISK-OFF" if (not spy["above50"] or vix > 25) else ("MIXED" if not spy["above20"] else "RISK-ON")
        out["regime"] = {"spy": spy, "vix": vix, "label": reg}
    except Exception as e:
        ERRS.append(f"regime {type(e).__name__}"); out["regime"] = {"label": "UNKNOWN"}
    # all-stock table
    rows = []
    try:
        h = dict(UA); h["Origin"] = "https://www.nasdaq.com"; h["Referer"] = "https://www.nasdaq.com/"
        j = get("https://api.nasdaq.com/api/screener/stocks?tableonly=true&limit=10000&download=true", headers=h)
        for r in j["data"]["rows"]:
            try:
                p = float(str(r["lastsale"]).replace("$", "").replace(",", ""))
                d = float(str(r["pctchange"]).replace("%", "").replace(",", "") or 0)
                v = float(str(r["volume"]).replace(",", "") or 0)
                mc = float(str(r.get("marketCap") or 0).replace(",", "") or 0)
                rows.append({"sym": r["symbol"].strip(), "px": p, "d": d, "vol": v, "mc": mc, "name": r.get("name", "")[:28]})
            except Exception:
                pass
        out["universe"] = len(rows)
    except Exception as e:
        ERRS.append(f"nasdaq screener {type(e).__name__}")
        try:
            for scr in ("day_gainers", "day_losers", "most_actives"):
                j = get(f"https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds={scr}&count=100")
                for q in j["finance"]["result"][0]["quotes"]:
                    rows.append({"sym": q["symbol"], "px": q.get("regularMarketPrice"), "d": q.get("regularMarketChangePercent"),
                                 "vol": q.get("regularMarketVolume", 0), "mc": q.get("marketCap", 0), "name": q.get("shortName", "")[:28]})
            out["universe"] = f"yahoo screeners {len(rows)}"
        except Exception as e2:
            ERRS.append(f"yahoo screener {type(e2).__name__}")
    liquid = [r for r in rows if r["px"] and r["px"] >= 5 and r["vol"] >= 1_000_000 and r["mc"] >= 300e6 and "/" not in r["sym"] and "^" not in r["sym"]]
    longc = sorted([r for r in liquid if 1 <= r["d"] <= 8], key=lambda r: -r["vol"] * r["d"])[:30]
    putc = sorted([r for r in liquid if r["d"] <= -2], key=lambda r: r["d"] * r["vol"])[:25]
    longs, puts = [], []
    log(f"stock universe {out.get('universe')}, liquid {len(liquid)}, longc {len(longc)}, putc {len(putc)}")
    bud = Budget(240)
    for r in longc:
        if not bud.ok(): break
        try:
            t = tech(r["sym"], px=r["px"], vol=r["vol"]); r.update(t)
            if t["above20"] and t["rsi"] and 55 <= t["rsi"] <= 75 and (t["volx"] or 0) >= 1.0: longs.append(r)
        except Exception: pass
        time.sleep(0.15)
    for r in putc:
        if not bud.ok(): break
        try:
            t = tech(r["sym"], px=r["px"], vol=r["vol"]); r.update(t)
            if not t["above20"] and t["rsi"] and 25 <= t["rsi"] <= 45: puts.append(r)
        except Exception: pass
        time.sleep(0.15)
    watch = {}
    for s in ("MARA", "RIOT", "COIN", "MSTR", "IBIT", "SQQQ", "TZA", "SPXU", "SOXS", "QQQ", "RGTI"):
        try:
            px = cboe_px(s); t = tech(s, px=px); watch[s] = {"px": px, "rsi": t["rsi"], "above20": t["above20"], "above50": t["above50"]}
        except Exception as e: watch[s] = {"err": type(e).__name__}
        time.sleep(0.1)
    out.update({"longs": longs[:10], "puts": puts[:10], "watch": watch})
    return out

# ---------- KALSHI (public market data) ----------
def kalshi():
    base = "https://api.elections.kalshi.com/trade-api/v2/markets"
    easy, btcr, cursor, pages = [], [], None, 0
    horizon = NOW + datetime.timedelta(hours=48)
    bud = Budget(120)
    while pages < 12 and bud.ok():
        q = {"limit": 1000, "status": "open"}
        if cursor: q["cursor"] = cursor
        j = get(base + "?" + urllib.parse.urlencode(q))
        for m in j.get("markets", []):
            try:
                ct = datetime.datetime.fromisoformat(m["close_time"].replace("Z", "+00:00"))
            except Exception:
                continue
            ya, na = m.get("yes_ask") or 0, m.get("no_ask") or 0
            vol = m.get("volume_24h") or m.get("volume") or 0
            t = m.get("ticker", "")
            if t.startswith("KXBTC") and ct <= NOW + datetime.timedelta(hours=30) and 35 <= ya <= 65:
                btcr.append({"t": t, "title": m.get("title", "")[:70], "yes": ya, "close": ct.strftime("%m/%d %H:%MZ"), "vol": vol})
            if ct <= horizon and vol >= 300:
                side, price = ("YES", ya) if ya >= 93 else (("NO", na) if na >= 93 else (None, None))
                if side and price < 100:
                    hrs = max((ct - NOW).total_seconds() / 3600, 0.5)
                    easy.append({"t": t, "title": m.get("title", "")[:70], "side": side, "c": price, "close": ct.strftime("%m/%d %H:%MZ"),
                                 "vol": vol, "ret_pct": round((100 - price) / price * 100, 1), "per_day": round((100 - price) / price * 100 * 24 / hrs, 1)})
        cursor = j.get("cursor"); pages += 1
        if not cursor: break
        time.sleep(0.2)
    easy.sort(key=lambda r: (-r["per_day"], -r["vol"]))
    return {"easy": easy[:15], "btc_range": sorted(btcr, key=lambda r: r["close"])[:8], "pages": pages}

def f(x, n=2):
    return "-" if x is None else (f"{x:.{n}f}" if isinstance(x, float) else str(x))

def main():
    res = {"utc": NOW.strftime("%Y-%m-%dT%H:%MZ")}
    for name, fn in (("crypto", crypto), ("stocks", stocks), ("kalshi", kalshi)):
        log(f"start {name}")
        try: res[name] = fn()
        except Exception as e: ERRS.append(f"{name} {type(e).__name__}: {str(e)[:80]}"); res[name] = {}
        log(f"end {name}")
    res["errors"] = ERRS
    (OUT / "scan.json").write_text(json.dumps(res, indent=1, default=str))
    c, s, k = res.get("crypto", {}), res.get("stocks", {}), res.get("kalshi", {})
    L = [f"SCAN {res['utc']} (prices delayed up to 15m; Coinbase day% = 24h)"]
    rg = s.get("regime", {}); spy = rg.get("spy", {})
    L.append(f"REGIME {rg.get('label')}: SPY {f(spy.get('px'))} sma20 {f(spy.get('sma20'))} sma50 {f(spy.get('sma50'))} VIX {f(rg.get('vix'),1)}")
    b = c.get("btc", {})
    L.append(f"BTC {f(b.get('px'),0)} vs midnight-ET mark {f(b.get('mark_midnight_et'),0)} ({f(b.get('vs_mark'))}%) 1h {f(b.get('h1'))}% {'ABOVE' if b.get('above_sma20_1h') else 'BELOW'} 1h-SMA20 {f(b.get('sma20_1h'),0)}")
    L.append(f"CRYPTO scanned {c.get('n')} ok / {c.get('n_err')} missing. LONG 5-20% spr<=3% (pass = 1h<=8% and rising): " + ("; ".join(f"{r['sym']} +{f(r['d'],1)}% spr {f(r['spr'],1)} 1h {f(r.get('h1'),1)} {'PASS' if r.get('pass') else 'no'}" for r in c.get("longs", [])) or "none"))
    L.append("CRYPTO DOWN >5%: " + ("; ".join(f"{r['sym']} {f(r['d'],1)}%" for r in c.get("downs", [])) or "none") + " | leaders: " + ", ".join(f"{r['sym']} {f(r['d'],1)}%" for r in c.get("leaders", [])))
    L.append(f"STOCK universe {s.get('universe')}. LONG (1-8%, >SMA20, RSI55-75, vol>=avg): " + ("; ".join(f"{r['sym']} {f(r['px'])} +{f(r['d'],1)}% rsi {f(r['rsi'],0)} volx {f(r['volx'],1)}" for r in s.get("longs", [])) or "none"))
    L.append("PUT LIST (<SMA20, RSI25-45, vol>1M): " + ("; ".join(f"{r['sym']} {f(r['px'])} {f(r['d'],1)}% rsi {f(r['rsi'],0)}" for r in s.get("puts", [])) or "none"))
    L.append("WATCH: " + "; ".join(f"{k2} {f(v.get('px'))} rsi {f(v.get('rsi'),0)} {'>' if v.get('above20') else '<'}20d {'>' if v.get('above50') else '<'}50d" if 'px' in v else f"{k2} err" for k2, v in s.get("watch", {}).items()))
    L.append("KALSHI EASY (>=93c, closes<48h, vol>=300; advisory, owner places): " + ("; ".join(f"{r['t']} '{r['title']}' {r['side']} {r['c']}c -> +{r['ret_pct']}% ({r['per_day']}%/day) closes {r['close']} vol {r['vol']}" for r in k.get("easy", [])[:10]) or "none"))
    L.append("KALSHI BTC RANGE near 50c (<30h): " + ("; ".join(f"{r['t']} '{r['title']}' yes {r['yes']}c closes {r['close']}" for r in k.get("btc_range", [])) or "none"))
    if ERRS: L.append("ERRORS: " + "; ".join(ERRS))
    (OUT / "scan.md").write_text("\n".join(L) + "\n")
    print("\n".join(L))

if __name__ == "__main__":
    main()
