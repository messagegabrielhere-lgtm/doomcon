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
NQH = dict(UA); NQH["Origin"] = "https://www.nasdaq.com"; NQH["Referer"] = "https://www.nasdaq.com/"
ETFS = {"SPY", "QQQ", "IBIT", "SQQQ", "TZA", "SPXU", "SOXS", "TQQQ", "SOXL", "UVXY", "IWM", "DIA", "GLD", "SLV", "TLT", "XLF", "XLE", "ARKK", "BITO", "ETHA"}
def num(x):
    return float(str(x).replace("$", "").replace(",", "").replace("%", "").strip() or 0)

def nq(path, sym):
    """Nasdaq API with stocks/etf asset class fallback."""
    classes = ("etf", "stocks") if sym.upper() in ETFS else ("stocks", "etf")
    last = None
    for ac in classes:
        try:
            j = get(f"https://api.nasdaq.com/api/quote/{sym.upper()}/{path}&assetclass={ac}", headers=NQH, timeout=10)
            if j.get("data"): return j["data"]
        except Exception as e:
            last = e
    raise last or RuntimeError("no data")

def nq_px(sym):
    return num(nq("info?x=1", sym)["primaryData"]["lastSalePrice"])

def hist(sym, days=80):
    """Daily closes/volumes, oldest first, from the Nasdaq historical API."""
    frm = (NOW - datetime.timedelta(days=150)).strftime("%Y-%m-%d"); to = NOW.strftime("%Y-%m-%d")
    rows = nq(f"historical?fromdate={frm}&todate={to}&limit=120", sym)["tradesTable"]["rows"]
    rows = list(reversed(rows))  # API is newest first
    return [num(r["close"]) for r in rows][-days:], [num(r["volume"]) for r in rows][-days:]

def tech(sym, px=None, vol=None):
    cl, vo = hist(sym)
    if px: cl = cl + [px]
    if vol: vo = vo + [vol]
    s20, s50 = sma(cl[:-1], 20), sma(cl[:-1], 50)
    avgv = sma(vo[:-1], 20) or 0
    return {"sma20": s20, "sma50": s50, "rsi": rsi(cl), "volx": (vo[-1] / avgv) if avgv else None,
            "above20": bool(s20 and cl[-1] > s20), "above50": bool(s50 and cl[-1] > s50), "px": cl[-1]}

CBOE_UA = {"User-Agent": "Mozilla/5.0 (trade-watch)"}
def cboe_px(sym):
    try:
        return float(get(f"https://cdn.cboe.com/api/global/delayed_quotes/options/{sym}.json", headers=CBOE_UA)["data"]["current_price"])
    except Exception:
        return nq_px(sym.lstrip("_"))

def stocks():
    out = {}
    # regime
    try:
        spy = tech("SPY", px=cboe_px("SPY"))
        try: vix = float(get("https://cdn.cboe.com/api/global/delayed_quotes/options/_VIX.json", headers=CBOE_UA)["data"]["current_price"])
        except Exception as e: ERRS.append(f"vix {type(e).__name__}"); vix = 0
        reg = "RISK-OFF" if (not spy["above50"] or vix > 25) else ("MIXED" if not spy["above20"] else "RISK-ON")
        out["regime"] = {"spy": spy, "vix": vix, "label": reg}
    except Exception as e:
        ERRS.append(f"regime {type(e).__name__}: {str(e)[:60]}"); out["regime"] = {"label": "UNKNOWN"}
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
        except Exception as e:
            if len(ERRS) < 6: ERRS.append(f"hist {r['sym']} {type(e).__name__}")
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
    def cents(m, k):
        v = m.get(k)
        if v is None:
            d = m.get(k + "_dollars")
            if d is None: return 0
            try: return float(d) * 100
            except Exception: return 0
        try: v = float(v)
        except Exception: return 0
        return v * 100 if v <= 1.0 else v
    def fetch(params, max_pages=8):
        out, cursor, pages = [], None, 0
        bud = Budget(100)
        while pages < max_pages and bud.ok():
            q = dict(params); q["limit"] = 1000
            if cursor: q["cursor"] = cursor
            j = get(base + "?" + urllib.parse.urlencode(q))
            ms = j.get("markets", []); out += ms
            if pages == 0 and ms:
                m0 = ms[0]; log(f"kalshi {params} page0 n={len(ms)} sample={m0.get('ticker')} yes_ask={m0.get('yes_ask')} yes_ask_dollars={m0.get('yes_ask_dollars')} close={m0.get('close_time')} vol24={m0.get('volume_24h')} vol={m0.get('volume')}")
            cursor = j.get("cursor"); pages += 1
            if not cursor or not ms: break
            time.sleep(0.2)
        return out
    now_ts = int(NOW.timestamp())
    soon = fetch({"status": "open", "min_close_ts": now_ts, "max_close_ts": now_ts + 48 * 3600})
    easy = []; n93 = 0; n93v = 0; dbg = []
    for m in soon:
        try: ct = datetime.datetime.fromisoformat(m["close_time"].replace("Z", "+00:00"))
        except Exception: continue
        ya, na = cents(m, "yes_ask"), cents(m, "no_ask")
        v24 = float(m.get("volume_24h") or m.get("volume_24h_fp") or 0); vtot = float(m.get("volume") or m.get("volume_fp") or 0); vol = v24 or vtot
        t = m.get("ticker", "")
        if t.startswith("KXMVE") or "CROSSCATEGORY" in t: continue  # multi-leg parlays, not simple contracts
        side, price = ("YES", ya) if 93 <= ya <= 98 else (("NO", na) if 93 <= na <= 98 else (None, None))
        if not side: continue
        n93 += 1
        oi = float(m.get("open_interest") or m.get("open_interest_fp") or 0)
        liq = float(m.get("liquidity") or m.get("liquidity_dollars") or 0)
        if len(dbg) < 3: dbg.append({k: m.get(k) for k in ("ticker", "title", "yes_ask", "no_ask", "yes_ask_dollars", "volume", "volume_24h", "volume_fp", "open_interest", "open_interest_fp", "liquidity", "liquidity_dollars", "close_time", "status")})
        if vtot < 100 and oi < 100 and liq < 500: continue
        n93v += 1
        hrs = max((ct - NOW).total_seconds() / 3600, 0.5)
        easy.append({"t": m.get("ticker", ""), "title": (m.get("title") or m.get("subtitle") or "")[:70], "side": side, "c": round(price), "close": ct.strftime("%m/%d %H:%MZ"),
                     "vol": int(vol), "oi": int(oi), "ret_pct": round((100 - price) / price * 100, 1), "per_day": round((100 - price) / price * 100 * 24 / hrs, 1)})
    easy.sort(key=lambda r: (-r["per_day"], -r["vol"]))
    btcr = []
    for series in ("KXBTCD", "KXBTC"):
        try:
            for m in fetch({"status": "open", "series_ticker": series, "max_close_ts": now_ts + 30 * 3600}, max_pages=2):
                ya = cents(m, "yes_ask")
                try: ct = datetime.datetime.fromisoformat(m["close_time"].replace("Z", "+00:00"))
                except Exception: continue
                if 35 <= ya <= 65:
                    btcr.append({"t": m.get("ticker", ""), "title": (m.get("title") or m.get("subtitle") or "")[:70], "yes": round(ya), "close": ct.strftime("%m/%d %H:%MZ"), "vol": m.get("volume_fp") or m.get("volume")})
        except Exception as e:
            ERRS.append(f"kalshi {series} {type(e).__name__}")
    log(f"kalshi soon={len(soon)} ge93={n93} ge93_with_vol={n93v} easy={len(easy)} btc={len(btcr)}")
    return {"easy": easy[:15], "btc_range": sorted(btcr, key=lambda r: r["close"])[:8], "seen": len(soon), "ge93": n93, "ge93_vol": n93v, "debug": dbg}

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
    L.append("KALSHI EASY (93-98c, closes<48h, vol or OI>=100, no parlays; advisory, owner places): " + ("; ".join(f"{r['t']} '{r['title']}' {r['side']} {r['c']}c -> +{r['ret_pct']}% ({r['per_day']}%/day) closes {r['close']} vol {r['vol']} oi {r.get('oi')}" for r in k.get("easy", [])[:10]) or "none"))
    L.append("KALSHI BTC RANGE near 50c (<30h): " + ("; ".join(f"{r['t']} '{r['title']}' yes {r['yes']}c closes {r['close']}" for r in k.get("btc_range", [])) or "none"))
    if ERRS: L.append("ERRORS: " + "; ".join(ERRS))
    (OUT / "scan.md").write_text("\n".join(L) + "\n")
    print("\n".join(L))

if __name__ == "__main__":
    main()
