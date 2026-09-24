// Kalshi (trade-api v2): how hard CFTC-regulated real money is revising its
// view of AI.
//
// Kalshi is the third leg of the markets pillar and the only one of the three
// that is a regulated US exchange. Polymarket is offshore crypto collateral,
// Manifold is play money. Same pillar, three different populations of trader,
// deliberately.
//
// Verified 2026-09-23 against the live API: 30 probed series -> 109 live,
// independent, non-ladder AI markets carrying 3,684,319 contracts of lifetime
// volume; volume-weighted mean |24h move| = 0.017993 probability points.
//
// ───────────────────────────────────────────────────────────────────────────
// THE FIELD-NAME TRAP. READ THIS BEFORE TOUCHING ANY PRICE FIELD.
//
// Kalshi migrated every price and size field on trade-api/v2 to `*_dollars`
// (decimal STRINGS) and `*_fp` (fixed-point decimal STRINGS). The integer
// fields every older doc, blog post and StackOverflow answer refers to —
// `yes_bid`, `yes_ask`, `last_price`, `previous_price`, `volume`,
// `volume_24h`, `open_interest` — are **not present at all** on this endpoint.
//
// Confirmed by listing the keys of a live market object on 2026-09-23:
//   present: last_price_dollars "0.9800", previous_price_dollars "0.9600",
//            yes_bid_dollars, yes_ask_dollars, volume_fp "56529.24",
//            volume_24h_fp, open_interest_fp, liquidity_dollars
//   absent : last_price, previous_price, volume, volume_24h, yes_bid, …
//
// In JavaScript `m.last_price` on that object is `undefined`, and
// `Number(undefined)` is `NaN` while `Number(m.last_price ?? 0)` is a silent
// **0**. An adapter written from memory therefore produces a basket of markets
// all priced at zero that never move, i.e. a confident, stable, entirely
// fictional reading. That is the exact failure mode this project exists to
// refuse, so every field read below goes through dollars()/fixedPoint(), which
// throw with the real field name rather than defaulting.
//
// One further trap: the **v1 search** endpoint (api.elections.kalshi.com/v1/
// search/series) DOES still return the integer fields alongside the dollars
// ones. So "I checked and yes_bid is an integer" can be true and irrelevant at
// the same time. This adapter uses only trade-api/v2.
// ───────────────────────────────────────────────────────────────────────────

import { setTimeout as sleep } from 'node:timers/promises';

// The AI question matcher is defined once, in polymarket.mjs, and imported by
// the other two markets adapters. Three copies of one regex is three chances
// to fix a false positive in two places. See the note above its definition
// there for why this adapter uses it as an AUDIT rather than as a gate.
import { AI_QUESTION } from './polymarket.mjs';

const API = 'https://api.elections.kalshi.com/trade-api/v2';

// ── Basket definition ──────────────────────────────────────────────────────
//
// Kalshi has no tag filter on its market endpoints and no full-text search on
// trade-api/v2, so a basket cannot be expressed as a query the way Polymarket's
// and Manifold's can. It has to be a list of series tickers.
//
// SELECTION RULE, applied once on 2026-09-23 and frozen here:
//
//   1. GET /series?category=C for C in {Science and Technology, Financials,
//      Politics, Companies, Economics, Sports} — the six categories that
//      carried at least one AI-tagged series. 190 unique series are tagged
//      `AI` by Kalshi's own editorial taxonomy.
//   2. GET /events?series_ticker=…&status=open&with_nested_markets=true for
//      each of the 190. Exactly 83 had any open event.
//   3. Apply the screening rules in screenMarket() below.
//   4. Keep every series that yielded at least one surviving market: 30.
//
// The other 160 are dead series (GPT4P5, SORA, ALTMAN — resolved long ago),
// mutually-exclusive sets, or pure numeric ladders. They are excluded by rule,
// not by taste, and docs/MARKETS.md carries the reproduction command.
//
// Frozen rather than rediscovered every run for two reasons. The honest one:
// a basket whose membership rule re-runs on every collection is not a time
// series, it is a moving average of Kalshi's product roadmap — the same
// argument that fixes TERMS in polymarket.mjs. The practical one: rediscovery
// costs 190 requests per run and Kalshi 429s hard above roughly 7 req/s
// (measured: 190 requests at concurrency 6 -> 164 of them rate-limited).
//
// Drift in both directions is reported in meta every run — see DISCOVERY_
// CATEGORY below — so the freeze is auditable and you can see when it is stale
// rather than having to trust it.
const SERIES = Object.freeze([
  'KXAGICO',                   // When will any company achieve AGI?
  'KXAIBIOSECURITY',           // When will AI biosecurity safeguards become U.S. law?
  'KXAIDUTYOFCARE',            // When will a catastrophic AI duty of care become U.S. law?
  'KXAIINCIDENTREPORT',        // When will serious AI-incident reporting become U.S. law?
  'KXAILEGISLATION',           // Will LLM restrictions become law in 2026?
  'KXAINEURALESE',             // Neuralese-recurrence model released before 2027?
  'KXAISAFETYAUDIT',           // When will independent AI safety audits become U.S. law?
  'KXANTHROPICMILLENNIUM',     // Will Anthropic announce a Millennium Prize solution?
  'KXAPPLEOPENAICASE',         // Will Apple win its case against OpenAI?
  'KXBESTLLMCHINA',            // Will a Chinese AI model be #1 this year?
  'KXBUBECKLEAVE',             // Will Sébastien Bubeck leave OpenAI?
  'KXBUCKMASTERSUE',           // Will Tristan Buckmaster sue OpenAI or Bubeck?
  'KXCLAUDE',                  // Anthropic model release timing
  'KXCOMPANYACTIONANTH',       // Anthropic open-weights letter
  'KXDATACENTER',              // Nuclear-powered data centre on a military base
  'KXFTCAIBOOKS',              // FTC investigation into AI book destruction
  'KXGEMINI',                  // Google Gemini release timing
  'KXGPT',                     // Next OpenAI model release timing
  'KXGPTCOST',                 // Will OpenAI increase the cost of ChatGPT?
  'KXGROK',                    // xAI Grok release timing
  'KXLLAMA5',                  // Will Meta release Llama 5 this year?
  'KXNVIDIAGROQFINE',          // DOJ fine over the Nvidia/Groq deal
  'KXOAIAGI',                  // When will OpenAI achieve AGI?
  'KXOPENAIANOTHERMILLENNIUM', // Will OpenAI announce another Millennium Prize solution?
  'KXROBOTAXIAREA',            // Which states will robotaxi be offered to in 2026?
  'KXRSIANNOUNCE',             // Recursive self-improvement announcement
  'KXSPACEDATACENTER',         // 1MW data centre in orbit
  'KXTESLAOPTIMUS',            // Tesla Optimus released this year?
  'KXTOPAI',                   // Which companies will have a top-ranked AI model this year?
  'KXWAYMOCITY',               // Where will Waymo operate in 2026?
]);

// One extra request per run, purely to audit the freeze above. Science and
// Technology is where Kalshi's AI taxonomy actually lives (129 of the 190
// AI-tagged series) and its payload is 382 KB. The other five categories are
// deliberately NOT scanned on the cron: Sports alone is 6.0 MB and Politics
// 2.9 MB, which is an absurd amount of bandwidth every fifteen minutes to
// audit a handful of miscategorised series. The full six-category scan is the
// manual re-freeze procedure in docs/MARKETS.md.
const DISCOVERY_CATEGORY = 'Science and Technology';
const AI_TAG = 'AI';

// The date SERIES above was frozen. Used to separate the two very different
// populations inside "AI-tagged but not in our basket": the large, boring one
// (long-resolved series such as GPT4P5, SORA and ALTMAN, which Kalshi still
// tags and still lists but which have had no open event in months) and the
// small, interesting one (series Kalshi has touched since the freeze, which is
// where a genuinely new AI market would appear). Only the second is a reason
// to re-freeze, so only the second is worth watching.
const FREEZE_DATE = '2026-09-23';

// Kalshi's published rate limit for unauthenticated reads is ~10 requests/sec,
// but the burst bucket is far tighter than that in practice and it does not
// refill as fast as the headline number implies. Every line below was measured
// from a single host on 2026-09-23, not inferred:
//   190 requests at concurrency 6            -> 164 × HTTP 429
//   190 requests at concurrency 2            -> 128 × HTTP 429
//    30 requests at concurrency 2, 150ms gap ->   4 × HTTP 429  (~7 req/s)
//    30 requests sequential,       250ms gap ->   0 × HTTP 429  (~3 req/s)
// fetch.mjs deliberately does NOT retry 429 (retrying a throttle is how a
// client earns a ban), so a burst does not degrade gracefully — it deletes the
// basket and takes the source dark. One worker at roughly 3 req/s costs about
// ten seconds of the 50s adapter watchdog, which is the right trade: this
// source is collected every fifteen minutes and has nowhere to be.
const PROBE_CONCURRENCY = 1;
const PROBE_SPACING_MS = 250;

// Numeric strike ladders. `greater` / `greater_or_equal` mean the event is one
// underlying quantity sliced into thresholds — "NVIDIA H200 average hourly
// price in September" is 132 markets over one number. They are the same
// pathology as Polymarket's negRisk legs and Manifold's date ladders: the
// count of members is a product decision, not a fact about the world, so a
// statistic averaged over them measures how many strikes someone created.
// On the freeze scan they were 2,008 of the 2,320 candidate markets — 86% of
// the basket by count and essentially all of it hardware pricing, which is the
// compute pillar's job anyway.
const LADDER_STRIKES = new Set(['greater', 'greater_or_equal']);

// Floor on basket size. Below this the weighted mean is a handful of opinions.
const MIN_MARKETS = 20;

// A throttled or broken probe removes its series from the basket silently.
// A volume-weighted MEAN does not collapse toward zero when a member is
// missing the way a SUM does — the member leaves the numerator and the
// denominator together — but losing KXCLAUDE (23.8% of basket volume on the
// freeze scan) still moves the number. Tolerate a couple of flaky probes,
// refuse to publish when the basket is meaningfully incomplete.
const MAX_SERIES_FAILURES = 3;

// Display list size. Small on purpose: this is a sidebar, not a table.
const TOP_MARKETS = 8;

// ── Field parsing ──────────────────────────────────────────────────────────

/** Loud parser for a `*_dollars` decimal string. Never defaults. */
function dollars(raw, field, ticker) {
  if (raw === undefined || raw === null) {
    throw new Error(
      `kalshi: ${field} is ${raw} on market ${ticker}. Every price on trade-api/v2 ` +
      `is a decimal STRING in a *_dollars field; the integer fields (last_price, ` +
      `yes_bid, volume) do not exist on this endpoint. Do not substitute them and ` +
      `do not default to 0.`
    );
  }
  if (typeof raw !== 'string') {
    throw new Error(
      `kalshi: ${field} on market ${ticker} was ${typeof raw} (${String(raw)}), ` +
      `expected a decimal string such as "0.4700"`
    );
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    throw new Error(`kalshi: ${field} on market ${ticker} is "${raw}", which is not a number`);
  }
  return n;
}

/** Loud parser for a `*_fp` fixed-point decimal string (volumes, sizes). */
function fixedPoint(raw, field, ticker) {
  if (raw === undefined || raw === null) {
    throw new Error(
      `kalshi: ${field} is ${raw} on market ${ticker}. Volumes on trade-api/v2 are ` +
      `decimal STRINGS in *_fp fields; the integer \`volume\` field does not exist here.`
    );
  }
  if (typeof raw !== 'string') {
    throw new Error(
      `kalshi: ${field} on market ${ticker} was ${typeof raw} (${String(raw)}), ` +
      `expected a fixed-point decimal string such as "56529.24"`
    );
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    throw new Error(`kalshi: ${field} on market ${ticker} is "${raw}", which is not a number`);
  }
  return n;
}

// ── Screening ──────────────────────────────────────────────────────────────

/**
 * Decide whether one market belongs in the basket. Returns null to admit it,
 * or a short reason string, which is counted in meta so the rejects are
 * auditable rather than invisible.
 *
 * NOTE on price fields: the *_dollars parsers above throw. That is deliberate
 * and it is why the price reads happen last, after the cheap structural
 * rejections — a market we are going to drop anyway should not be able to take
 * the whole source dark over a field it does not need.
 */
function screenMarket(event, m) {
  if (event.mutually_exclusive === true) return 'mutually_exclusive';
  if (m.market_type !== 'binary') return 'not_binary';
  if (m.status !== 'active') return 'not_active';
  if (LADDER_STRIKES.has(m.strike_type)) return 'strike_ladder';
  return null;
}

// ── Concurrency ────────────────────────────────────────────────────────────

/**
 * Bounded-concurrency map with a fixed inter-request pause per worker.
 * collect.mjs hands adapters `fetchJson` only (CONTRACT: `collect(fetchJson)`),
 * so fetch.mjs's own fetchAll is not reachable from here; and fetchAll has no
 * spacing control, which Kalshi needs. The pause is a constant, not jitter —
 * CONTRACT §1.4 bans Math.random() anywhere in this pipeline.
 */
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      // Before every request, including the first: the discovery call above
      // has already spent part of the burst bucket.
      await sleep(PROBE_SPACING_MS);
      out[i] = await fn(items[i], i);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

// ── Display helpers ────────────────────────────────────────────────────────

/**
 * Kalshi's API exposes no canonical web URL for a series, so this is
 * constructed. The series page is the stable landing point — event tickers are
 * dated (KXCLAUDE-MYTH, KXLLM1-26SEP28) and churn weekly, series tickers do
 * not. NOT http-verified from the build host: kalshi.com's edge returned 429
 * to every request from this IP during development. Stated rather than
 * quietly asserted; see docs/MARKETS.md.
 */
function seriesUrl(seriesTicker) {
  return `https://kalshi.com/markets/${String(seriesTicker).toLowerCase()}`;
}

/** "When will OpenAI achieve AGI?" + "Before 2028" -> one readable question. */
function displayQuestion(eventTitle, subTitle) {
  const title = String(eventTitle ?? '').trim();
  const sub = String(subTitle ?? '').trim();
  if (!sub) return title;
  if (!title) return sub;
  if (title.toLowerCase().includes(sub.toLowerCase())) return title;
  return `${title} — ${sub}`;
}

export default {
  id: 'kalshi',
  pillar: 'markets',
  label: 'Kalshi AI repricing',

  // WHAT THE SCALAR MEANS — read this before changing it.
  //
  // value = volume-weighted mean of |24-hour YES price change| across live,
  //         binary, independent, non-ladder AI markets on Kalshi, in
  //         probability points (dollars per $1 contract).
  //
  // Plain English: "the average AI question on Kalshi repriced this far over
  // the last day, weighting questions by how much has ever traded on them."
  // 0.018 means the typical AI contract moved 1.8 cents on the dollar.
  //
  // Identical in construction and in UNIT to polymarket.mjs, on purpose: the
  // two real-money venues are directly comparable, so a divergence between
  // them is a fact about the venues rather than an artefact of two different
  // definitions. Manifold is the odd one out because play-money prices are not
  // comparable to real-money prices; it contributes turnover instead.
  //
  // Why a MOVE and not a LEVEL. Identical argument to Polymarket's, and it is
  // not optional here: CONTRACT's level-naming rule forbids this index from
  // measuring probability of harm, and a mean YES price across AGI markets IS
  // that probability. It also does not survive contact with Kalshi's data —
  // "Best AI this week" is 9 mutually-exclusive legs summing to 1, and the
  // GPU-price series are 100+ threshold strikes over a single number.
  //
  // Why ABSOLUTE. YES means "AGI arrived" in one market and "the DOJ fined
  // Nvidia" in the next. Direction is not comparable across the basket; the
  // magnitude of the revision is.
  //
  // Why VOLUME-WEIGHTED, and why LIFETIME volume rather than 24h. A market
  // with a million contracts behind it moving 3 cents is news; a 400-contract
  // market moving 30 cents is one trader. Lifetime volume is used as the
  // weight because Kalshi's 24h volume is zero for most of the basket outside
  // US trading hours (16 of 474 markets on the freeze scan had any), which
  // would hand the entire index to whichever two markets happened to trade
  // overnight. Measured on the freeze scan, the largest single market carries
  // 10.3% of the weight, so no one question can drive the reading alone.
  //
  // Direction: regulated real money revising its AI views harder -> higher.
  async collect(fetchJson) {
    // ── 1. Drift audit. Deliberately first, deliberately non-fatal. ────────
    // This does not feed the scalar. A collapsed audit must never take a live
    // source dark, so its failure is recorded as data, not thrown.
    let discovery = { ok: false, error: 'not attempted' };
    try {
      const qs = new URLSearchParams({ category: DISCOVERY_CATEGORY });
      const body = await fetchJson(`${API}/series?${qs}`);
      const series = body?.series;
      if (!Array.isArray(series)) {
        throw new Error(
          `series endpoint returned no series array (keys: ${Object.keys(body ?? {}).join(',') || 'none'})`
        );
      }
      const tagged = series
        .filter((s) => Array.isArray(s?.tags) && s.tags.includes(AI_TAG))
        .map((s) => ({ ticker: String(s.ticker), updated: String(s.last_updated_ts ?? '') }))
        .sort((a, b) => a.ticker.localeCompare(b.ticker));
      const taggedSet = new Set(tagged.map((s) => s.ticker));
      const inBasket = new Set(SERIES);
      const outside = tagged.filter((s) => !inBasket.has(s.ticker));
      // The re-freeze signal proper: AI-tagged, not probed, and touched by
      // Kalshi since the freeze. Compared as ISO-8601 strings, which sort
      // lexicographically in date order — no Date parsing, no timezone.
      const outsideFresh = outside.filter((s) => s.updated > FREEZE_DATE);
      discovery = {
        ok: true,
        category: DISCOVERY_CATEGORY,
        freeze_date: FREEZE_DATE,
        series_in_category: series.length,
        ai_tagged_now: tagged.length,
        // Basket members this ONE category tags AI. Expected to be well under
        // 30: most of the basket lives in Financials, Politics and Companies,
        // which are too large to scan on a fifteen-minute cron. A fall in this
        // number means Kalshi dropped the tag from a member we still probe.
        basket_members_ai_tagged_here: SERIES.filter((t) => taggedSet.has(t)).length,
        // The haystack. Mostly long-resolved series with no open events; a
        // large number here is normal and is NOT a reason to re-freeze.
        ai_tagged_not_in_basket: outside.length,
        // The needle. Sorted and sampled so it does not churn between runs.
        ai_tagged_not_in_basket_updated_since_freeze: outsideFresh.length,
        ai_tagged_refreeze_candidates: outsideFresh.slice(0, 12).map((s) => s.ticker),
      };
    } catch (err) {
      discovery = { ok: false, category: DISCOVERY_CATEGORY, error: err?.message ?? String(err) };
    }

    // ── 2. Probe the frozen basket. ────────────────────────────────────────
    const probes = await mapLimit(SERIES, PROBE_CONCURRENCY, async (ticker) => {
      const qs = new URLSearchParams({
        series_ticker: ticker,
        status: 'open',
        with_nested_markets: 'true',
        limit: '200',
      });
      try {
        const body = await fetchJson(`${API}/events?${qs}`);
        if (!Array.isArray(body?.events)) {
          // Kalshi answers a throttle with a real HTTP 429, which fetch.mjs
          // turns into a FetchError, so this branch is the *other* failure:
          // a 200 whose shape changed. Treated as a failure, never as "no
          // events", because "no events" is a claim about the world.
          throw new Error(
            `no events array (keys: ${Object.keys(body ?? {}).join(',') || 'none'})`
          );
        }
        return { ticker, ok: true, events: body.events };
      } catch (err) {
        return {
          ticker,
          ok: false,
          status: err?.status ?? null,
          error: err?.message ?? String(err),
        };
      }
    });

    const failures = probes.filter((p) => !p.ok);
    if (failures.length > MAX_SERIES_FAILURES) {
      const throttled = failures.filter((f) => f.status === 429).length;
      throw new Error(
        `kalshi: ${failures.length} of ${SERIES.length} series probes failed ` +
        `(${throttled} rate-limited); basket is incomplete and the weighted mean ` +
        `would not be comparable to previous runs. First failure: ${failures[0].ticker} — ` +
        `${failures[0].error}`
      );
    }

    // ── 3. Screen and parse. ───────────────────────────────────────────────
    const basket = new Map(); // market ticker -> member
    const rejected = Object.create(null);
    let screened = 0;
    let eventsSeen = 0;
    let legacyIntegerFieldsSeen = 0;
    let textGateMisses = 0;

    const reject = (reason) => {
      rejected[reason] = (rejected[reason] ?? 0) + 1;
    };

    for (const probe of probes) {
      if (!probe.ok) continue;

      for (const event of probe.events) {
        eventsSeen++;
        for (const m of event?.markets ?? []) {
          screened++;

          const reason = screenMarket(event, m);
          if (reason) {
            reject(reason);
            continue;
          }

          const ticker = m.ticker;
          if (typeof ticker !== 'string' || ticker.length === 0) {
            reject('no_ticker');
            continue;
          }

          // Reverse tripwire. If Kalshi ever restores the integer fields on
          // this endpoint we want that recorded, not silently absorbed — the
          // presence of both shapes is exactly when a future edit picks the
          // wrong one. Counted, not thrown: extra fields break nothing today.
          if ('last_price' in m || 'volume' in m || 'yes_bid' in m) legacyIntegerFieldsSeen++;

          const last = dollars(m.last_price_dollars, 'last_price_dollars', ticker);
          const prev = dollars(m.previous_price_dollars, 'previous_price_dollars', ticker);

          // "0.0000" on Kalshi means there is no trade to reference, not that
          // the contract is worth nothing. Reading it as a price would turn a
          // missing datum into a full-dollar move. Skipped, never coerced —
          // the same rule polymarket.mjs applies to a null oneDayPriceChange.
          if (last <= 0 || prev <= 0) {
            reject('no_24h_reference');
            continue;
          }

          const volume = fixedPoint(m.volume_fp, 'volume_fp', ticker);
          if (!(volume > 0)) {
            reject('never_traded');
            continue;
          }

          const question = displayQuestion(event.title, m.yes_sub_title);

          // AUDIT, NOT A GATE — and the difference is the point.
          //
          // polymarket.mjs and manifold.mjs run this regex as a hard filter
          // because their retrieval mechanism is a fuzzy full-text search that
          // returns genuine nonsense (19 markets about a politician's word
          // count for "artificial general intelligence"). The regex corrects a
          // retrieval error.
          //
          // Kalshi's retrieval mechanism is its own curated editorial `AI`
          // tag. Running a regex over the title here would not correct an
          // error, it would overrule a human taxonomy — and it would drop
          // "Tesla Optimus released this year?", "Where will Waymo operate in
          // 2026?" and "Will a 1-megawatt data center go live in orbit?",
          // which Kalshi tags AI and which plainly belong. So the count is
          // published instead, and you can decide whether you believe the tag.
          if (!AI_QUESTION.test(question)) textGateMisses++;

          basket.set(ticker, {
            ticker,
            series: probe.ticker,
            event_ticker: event.event_ticker,
            question,
            last,
            prev,
            move: Math.abs(last - prev),
            volume,
            close_time: typeof m.close_time === 'string' ? m.close_time : null,
          });
        }
      }
    }

    if (basket.size < MIN_MARKETS) {
      throw new Error(
        `kalshi: only ${basket.size} live AI markets passed screening of ${screened} ` +
        `across ${eventsSeen} open events (need ${MIN_MARKETS}); basket too thin to average`
      );
    }

    const members = [...basket.values()];
    const totalVolume = members.reduce((s, m) => s + m.volume, 0);
    if (!(totalVolume > 0)) {
      throw new Error('kalshi: basket has zero total volume; cannot volume-weight');
    }

    // If every price parsed to zero we are looking at renamed fields, not a
    // calm market. dollars() would not have caught it: "0.0000" is a perfectly
    // valid decimal string.
    const maxPrice = members.reduce((s, m) => Math.max(s, m.last), 0);
    if (!(maxPrice > 0)) {
      throw new Error(
        'kalshi: every last_price_dollars in the basket parsed to 0 — the *_dollars ' +
        'field names have almost certainly changed again; refusing to publish'
      );
    }

    const value = members.reduce((s, m) => s + m.move * m.volume, 0) / totalVolume;
    if (!Number.isFinite(value)) {
      throw new Error(`kalshi: weighted mean resolved to non-finite ${value}`);
    }

    // Audit list: which questions actually moved the scalar. Ranked by their
    // contribution to the numerator, which is the only ranking that explains
    // the number.
    const topContributors = members
      .slice()
      .sort((a, b) => b.volume * b.move - a.volume * a.move || a.ticker.localeCompare(b.ticker))
      .slice(0, 8)
      .map((m) => ({ question: m.question, ticker: m.ticker, move: m.move, volume: m.volume }));

    // Display list: what the site shows next to the news.
    //
    // Ranked by LIFETIME volume, one entry per event, tie-broken on ticker.
    // Every part of that is a stability decision. Lifetime volume is close to
    // monotonic, so the same eight questions appear run after run while their
    // odds update underneath — rank it by today's move instead and the sidebar
    // reshuffles every fifteen minutes and reads as noise. One entry per event
    // stops "Where will Waymo operate in 2026?" filling all eight slots with
    // cities. The ticker tie-break makes the order total, so two runs over
    // identical data produce identical output (CONTRACT §1.4).
    const bestPerEvent = new Map();
    for (const m of members) {
      const key = m.event_ticker ?? m.ticker;
      const cur = bestPerEvent.get(key);
      if (!cur || m.volume > cur.volume || (m.volume === cur.volume && m.ticker < cur.ticker)) {
        bestPerEvent.set(key, m);
      }
    }
    const topMarkets = [...bestPerEvent.values()]
      .sort((a, b) => b.volume - a.volume || a.ticker.localeCompare(b.ticker))
      .slice(0, TOP_MARKETS)
      .map((m) => ({
        question: m.question,
        url: seriesUrl(m.series),
        // YES price on a $1 contract, so already a probability. Rounded to
        // whole cents, which is Kalshi's own tick — publishing more digits
        // would imply precision the exchange does not have.
        probability: Math.round(m.last * 100) / 100,
        volume: m.volume,
        // Three venues, three currencies. Named per row so a consumer merging
        // the lists cannot add contracts to dollars to MANA.
        volume_unit: 'contracts',
        close_time: m.close_time,
        source: 'kalshi',
      }));

    return {
      value,
      unit: 'prob_points/day',
      observed_at: new Date().toISOString(),
      meta: {
        endpoint: 'trade-api/v2',
        series_probed: SERIES.length,
        series_ok: probes.length - failures.length,
        series_failed: failures.length,
        series_failures: failures.map((f) => ({ series: f.ticker, status: f.status, error: f.error })),
        events_open: eventsSeen,
        markets_screened: screened,
        markets_in_basket: basket.size,
        rejected: rejected,
        // Named to match the sibling adapters' auditability field even though
        // it is advisory here rather than a filter — see the long note above.
        rejected_off_topic: 0,
        text_gate_misses: textGateMisses,
        total_volume_contracts: totalVolume,
        max_single_market_weight: Math.max(...members.map((m) => m.volume)) / totalVolume,
        // Should be 0. Non-zero means Kalshi restored the integer price fields
        // and every field read in this file needs re-checking.
        legacy_integer_fields_seen: legacyIntegerFieldsSeen,
        // Context only. This is the number we deliberately do NOT score on.
        unweighted_mean_yes_price: members.reduce((s, m) => s + m.last, 0) / members.length,
        discovery,
        top_contributors: topContributors,
        top_markets: topMarkets,
        direction: 'higher = regulated real-money AI markets repricing harder',
        definition:
          'volume-weighted mean |24h YES price change| across live independent ' +
          'non-ladder binary AI markets on Kalshi, weights = lifetime contract volume',
      },
    };
  },
};
