// ---------------------------------------------------------------------------
// UNOFFICIAL ENDPOINT. READ THIS BEFORE RELYING ON THIS FILE.
//
// stockanalysis.com publishes no public API and no API terms. This path is the
// site's own internal XHR, discovered by inspection, and it sits behind
// Cloudflare: during verification on 2026-09-22 the identical request returned
// a "Just a moment..." interstitial once and clean JSON minutes later. It can
// be withdrawn, rate-limited or challenged without notice, and using it is a
// ToS risk we are taking knowingly.
//
// THEREFORE: this source is OPTIONAL BY DESIGN. It is one of several inputs to
// the compute pillar and the pillar must stand without it. Nothing downstream
// may treat a dark stockanalysis as an outage. It fails to dark — loudly and
// with a specific reason — and the index carries on with the sources that are
// still alive. Never impute it, never substitute a cached price.
// ---------------------------------------------------------------------------

const ENDPOINT = 'https://stockanalysis.com/api/quotes/s';

// The AI-equity complex, picked for supply-chain position rather than market
// cap: NVDA (accelerators), AMD (the credible second source), TSM (the foundry
// every one of them depends on), AVGO (custom silicon + the networking that
// turns chips into clusters). Four names, hard-coded, never reweighted — a
// basket whose membership drifts is not a time series.
const BASKET = ['NVDA', 'AMD', 'TSM', 'AVGO'];

// SCALAR: mean ABSOLUTE daily percent move across the basket.
//
// Absolute, not signed, and the reason is the whole thesis of this index. We
// measure activity tempo, never a direction of harm. A basket ripping +6% on a
// capex announcement and the same basket dropping 6% on an export-control
// headline are both days when the market is violently repricing AI. A signed
// mean would cancel those to zero and call it calm. The signed mean is still
// reported in meta for anyone who wants it, but it is not the scalar.
//
// Direction: bigger moves -> more repricing -> higher value. Contract-correct.

// A quote whose trade date is older than this is a stale cache, not a
// measurement. Generous enough to survive a long weekend plus a holiday.
const MAX_STALE_DAYS = 7;

// ---------------------------------------------------------------------------
// REDUNDANT PROVIDER (2026-10-08).
//
// stockanalysis.com sits behind Cloudflare and goes dark intermittently, which
// takes one of the compute pillar's three inputs with it. The fallback below
// computes THE SAME SCALAR from a second public source: Yahoo Finance's chart
// endpoint, daily bars, percent change between the last two regular-session
// closes. `cp` on stockanalysis is exactly that quantity (session change vs the
// previous close), so the unit string does not change and the two providers
// are interchangeable readings of one definition. Which one answered is
// recorded in meta.provider on every reading, and when the fallback was used
// the primary's error is kept in meta.primary_error, so a receipt never hides
// a provider switch.
//
// Same rules as the primary: all four names or nothing, no stale cache (the
// same MAX_STALE_DAYS), never impute. The fallback is also unofficial; it is
// redundancy, not a promotion of either source to load-bearing.
// ---------------------------------------------------------------------------
export const YAHOO_HOSTS = ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com'];

export function yahooChartUrl(host, ticker, range = '10d') {
  return `${host}/v8/finance/chart/${encodeURIComponent(ticker)}?range=${range}&interval=1d`;
}

/**
 * Daily bars from a Yahoo chart payload: [{ date: 'YYYY-MM-DD' (exchange-local), close }],
 * ascending, null closes dropped. Throws on a payload that is not a chart.
 */
export function yahooBars(body, ticker) {
  const chart = body?.chart;
  if (chart?.error) {
    throw new Error(`yahoo: ${ticker} chart error ${chart.error.code ?? '?'}: ${chart.error.description ?? ''}`.trim());
  }
  const res = chart?.result?.[0];
  const ts = res?.timestamp;
  const closes = res?.indicators?.quote?.[0]?.close;
  if (!Array.isArray(ts) || !Array.isArray(closes) || ts.length !== closes.length) {
    throw new Error(`yahoo: ${ticker} payload has no aligned timestamp/close arrays`);
  }
  const offset = Number.isFinite(res?.meta?.gmtoffset) ? res.meta.gmtoffset : 0;
  const bars = [];
  for (let i = 0; i < ts.length; i++) {
    const c = closes[i];
    if (typeof c !== 'number' || !Number.isFinite(c) || c <= 0) continue;
    if (typeof ts[i] !== 'number') continue;
    const date = new Date((ts[i] + offset) * 1000).toISOString().slice(0, 10);
    // Yahoo occasionally emits two bars for one session (a provisional live
    // bar beside the settled one). Last write wins for the date.
    if (bars.length && bars[bars.length - 1].date === date) bars[bars.length - 1] = { date, close: c };
    else bars.push({ date, close: c });
  }
  return bars;
}

function checkFresh(ticker, td, provider, nowMs) {
  const ageDays = (nowMs - Date.parse(`${td}T00:00:00Z`)) / 86400_000;
  if (!Number.isFinite(ageDays) || ageDays > MAX_STALE_DAYS) {
    throw new Error(
      `${provider}: ${ticker} quote is ${Number.isFinite(ageDays) ? ageDays.toFixed(1) : '?'} days old (trade date ${td}); ` +
      `refusing to read a stale cache as a live move`
    );
  }
}

async function quotesFromStockanalysis(fetchJson, nowMs) {
  const quotes = [];
  // Sequential, not Promise.all: this is somebody's website, not an API we
  // pay for. Four polite serial requests cost a second and draw no attention.
  for (const ticker of BASKET) {
    let body;
    try {
      body = await fetchJson(`${ENDPOINT}/${encodeURIComponent(ticker)}`, {
        // Cloudflare served the challenge page when Accept was absent and
        // clean JSON when it was present — the one header that changed the
        // outcome in testing. fetchJson already sets it, so this is only
        // belt-and-braces; the lowercase key matters all the same, because
        // fetch.mjs spreads opts.headers over its own lowercase defaults and
        // a capitalised 'Accept' would survive as a SECOND header rather than
        // replacing the first. (The same slip 403s the SEC source — see the
        // long note in sec-fts.mjs.)
        headers: { accept: 'application/json' },
      });
    } catch (err) {
      // Re-thrown with context, not swallowed. A JSON parse failure here
      // almost always means we were handed the Cloudflare interstitial, and
      // saying so saves the next person twenty minutes.
      throw new Error(
        `stockanalysis: request for ${ticker} failed (${err?.message ?? err}); ` +
        `an HTML/parse error here usually means a Cloudflare challenge — expected, source goes dark`
      );
    }

    if (body?.status !== 200 || !body?.data) {
      throw new Error(
        `stockanalysis: ${ticker} returned status ${body?.status ?? '?'} with no data payload`
      );
    }

    // `cp` is the percent change for the session, `p` the last price, `td`
    // the trade date the quote belongs to.
    const cp = body.data.cp;
    if (typeof cp !== 'number' || !Number.isFinite(cp)) {
      throw new Error(`stockanalysis: ${ticker} has no finite percent change (cp=${cp})`);
    }
    const td = body.data.td;
    if (typeof td !== 'string') {
      throw new Error(`stockanalysis: ${ticker} has no trade date (td=${td})`);
    }
    checkFresh(ticker, td, 'stockanalysis', nowMs);
    quotes.push({ ticker, cp, price: body.data.p, trade_date: td, market_state: body.data.ms });
  }
  return quotes;
}

async function quotesFromYahoo(fetchJson, nowMs) {
  const quotes = [];
  for (const ticker of BASKET) {
    let body; let lastErr;
    for (const host of YAHOO_HOSTS) {
      try { body = await fetchJson(yahooChartUrl(host, ticker), { headers: { accept: 'application/json' } }); break; }
      catch (err) { lastErr = err; }
    }
    if (!body) throw new Error(`yahoo: request for ${ticker} failed on every host (${lastErr?.message ?? lastErr})`);
    const bars = yahooBars(body, ticker);
    if (bars.length < 2) throw new Error(`yahoo: ${ticker} has ${bars.length} usable daily closes (need 2)`);
    const prev = bars[bars.length - 2];
    const last = bars[bars.length - 1];
    const cp = (last.close / prev.close - 1) * 100;
    if (!Number.isFinite(cp)) throw new Error(`yahoo: ${ticker} percent change is non-finite`);
    checkFresh(ticker, last.date, 'yahoo', nowMs);
    quotes.push({ ticker, cp, price: last.close, prev_close: prev.close, trade_date: last.date, market_state: null });
  }
  return quotes;
}

export const PROVIDERS = Object.freeze([
  { id: 'stockanalysis', run: quotesFromStockanalysis,
    note: 'UNOFFICIAL, Cloudflare-fronted, optional — index must never depend on it' },
  { id: 'yahoo-chart', run: quotesFromYahoo,
    note: 'fallback: Yahoo Finance v8 chart, daily bars, % change between the last two closes — same definition as cp' },
]);

/** The scalar from a complete basket of quotes. Pure; shared with calibrate.mjs. */
export function basketScalar(quotes) {
  // All four or nothing. A basket that quietly shrinks to three names is a
  // different basket, and comparing it to yesterday's four would be a lie
  // dressed up as a data point.
  if (quotes.length !== BASKET.length) {
    throw new Error(
      `stockanalysis: got ${quotes.length}/${BASKET.length} basket members; composition must be complete`
    );
  }
  const value = quotes.reduce((s, q) => s + Math.abs(q.cp), 0) / quotes.length;
  const signed = quotes.reduce((s, q) => s + q.cp, 0) / quotes.length;
  if (!Number.isFinite(value)) {
    throw new Error(`stockanalysis: basket mean resolved to non-finite ${value}`);
  }
  return { value, signed };
}

export { BASKET, MAX_STALE_DAYS };

export default {
  id: 'stockanalysis',
  pillar: 'compute',
  label: 'AI equity basket volatility',

  // `opts.now` / `opts.providers` are test seams; collect.mjs passes only fetchJson.
  async collect(fetchJson, opts = {}) {
    const nowMs = opts.now ?? Date.now();
    const providers = opts.providers ?? PROVIDERS;
    const errors = [];
    for (const provider of providers) {
      let quotes;
      try {
        quotes = await provider.run(fetchJson, nowMs);
        const { value, signed } = basketScalar(quotes);
        return {
          value,
          unit: 'mean_abs_percent_change',
          observed_at: new Date(nowMs).toISOString(),
          meta: {
            provider: provider.id,
            ...(errors.length ? { primary_error: errors.join(' | ') } : {}),
            basket: BASKET,
            quotes,
            signed_mean_percent: signed,
            direction: 'higher = larger AI-equity repricing, in either direction',
            source_status: provider.note,
          },
        };
      } catch (err) {
        errors.push(`${provider.id}: ${err?.message ?? err}`);
      }
    }
    throw new Error(`stockanalysis: every provider failed — ${errors.join(' | ')}`);
  },
};
