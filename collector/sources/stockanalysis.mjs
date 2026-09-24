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

export default {
  id: 'stockanalysis',
  pillar: 'compute',
  label: 'AI equity basket volatility',

  async collect(fetchJson) {
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
      const ageDays = (Date.now() - Date.parse(`${td}T00:00:00Z`)) / 86400_000;
      if (!Number.isFinite(ageDays) || ageDays > MAX_STALE_DAYS) {
        throw new Error(
          `stockanalysis: ${ticker} quote is ${ageDays.toFixed(1)} days old (trade date ${td}); ` +
          `refusing to read a stale cache as a live move`
        );
      }

      quotes.push({ ticker, cp, price: body.data.p, trade_date: td, market_state: body.data.ms });
    }

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

    return {
      value,
      unit: 'mean_abs_percent_change',
      observed_at: new Date().toISOString(),
      meta: {
        basket: BASKET,
        quotes,
        signed_mean_percent: signed,
        direction: 'higher = larger AI-equity repricing, in either direction',
        source_status: 'UNOFFICIAL, Cloudflare-fronted, optional — index must never depend on it',
      },
    };
  },
};
